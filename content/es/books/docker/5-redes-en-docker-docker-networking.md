La conectividad es el sistema nervioso de la arquitectura de microservicios. En este capítulo, desmitificamos cómo los contenedores se comunican entre sí y con el mundo exterior. Partiendo del **Container Network Model (CNM)**, exploramos los drivers nativos que permiten desde el aislamiento total hasta la integración directa en redes físicas legacy mediante **Macvlan**.

Aprenderás a diseñar redes segmentadas con resolución DNS interna, evitando las trampas de seguridad en la exposición de puertos. Finalmente, dotamos a tu perfil de herramientas de depuración senior para diagnosticar fallos de red con precisión quirúrgica, asegurando que tus servicios operen siempre en armonía.

## 5.1. El modelo de red de contenedores (CNM)

Hasta este punto del libro, hemos tratado a los contenedores como entidades aisladas o, como mucho, compartiendo volúmenes de datos. Sin embargo, en el mundo real, un servicio rara vez opera en el vacío; necesita comunicarse con bases de datos, APIs de terceros o con otros microservicios.

Configurar redes a nivel del sistema operativo (manipulando interfaces, tablas de enrutamiento e iptables) es un proceso complejo y propenso a errores. Para resolver esto, Docker introdujo una abstracción arquitectónica fundamental: el **Container Network Model (CNM)**.

El CNM no es una pieza de software en sí, sino una **especificación de diseño** (un estándar) que define cómo deben proporcionar conectividad los contenedores, independientemente de la infraestructura subyacente. La implementación oficial de esta especificación en el motor de Docker es una biblioteca escrita en Go llamada `libnetwork`.

### Los Tres Pilares del CNM

El diseño del CNM es deliberadamente minimalista y se basa en separar la configuración de red en tres componentes altamente acoplables. Entender estos tres conceptos es vital para diagnosticar problemas de red complejos más adelante:

1. **Sandbox (La caja de arena)**

* **¿Qué es?** Representa el entorno aislado que contiene la configuración de red de un contenedor. Esto incluye sus interfaces físicas o virtuales, tablas de enrutamiento, configuración DNS y reglas de firewall.
* **Bajo el capó:** Como vimos en el Capítulo 1, Docker logra este aislamiento utilizando *Network Namespaces* del kernel de Linux.
* **Nota clave:** Un Sandbox puede contener múltiples Endpoints vinculados a diferentes redes, lo que permite que un contenedor pertenezca a varias redes simultáneamente sin romper su aislamiento general.

1. **Endpoint (El punto de conexión)**

* **¿Qué es?** Es la interfaz de red virtual que conecta un Sandbox con una Red (Network).
* **Bajo el capó:** En Linux, esto generalmente se implementa mediante un par de interfaces virtuales (conocidas como `veth pairs`). Un extremo vive dentro del Sandbox (el contenedor) y el otro extremo vive en la Red definida en el host.
* **Nota clave:** Un Endpoint solo puede pertenecer a una única Red y a un único Sandbox.

1. **Network (La red)**

* **¿Qué es?** Es un grupo de Endpoints que pueden comunicarse directamente entre sí. Es el equivalente por software a un switch de red (conmutador) o una VLAN. Si dos contenedores están en la misma Red, se ven; si no, están completamente aislados a nivel L2/L3.
* **Bajo el capó:** Se implementa utilizando puentes de software (Linux bridges), redes superpuestas (Overlays) u otras tecnologías que veremos a fondo en la sección 5.2.

### Diagrama Conceptual del CNM

Para visualizar cómo interactúan estos componentes, imagina dos contenedores que necesitan comunicarse a través de una red interna:

```text
                      +-----------------------------------------+
                      |               Network                   |
                      |    (Ej: MiRedInterna - Switch L2/L3)    |
                      +-------+-------------------------+-------+
                              |                         |
                              |                         |
                      +-------+-------+         +-------+-------+
                      |   Endpoint 1  |         |   Endpoint 2  |
                      |   (veth pair) |         |   (veth pair) |
                      +-------+-------+         +-------+-------+
                              |                         |
       +----------------------|------+   +--------------|----------------+
       | Sandbox A            |      |   | Sandbox B    |                |
       |                             |   |                               |
       |  +-----------------------+  |   |  +-----------------------+    |
       |  | Contenedor 1 (Web)    |  |   |  | Contenedor 2 (DB)     |    |
       |  +-----------------------+  |   |  +-----------------------+    |
       +-----------------------------+   +-------------------------------+

```

*Observa cómo la "Network" desacopla la topología subyacente de los contenedores. A los contenedores Web y DB no les importa si la "Network" es un puente local o una red distribuida en múltiples servidores; el Endpoint abstrae esa complejidad.*

### El Ciclo de Vida de la Red en Docker

Cuando ejecutas un comando como `docker run -d --network MiRedInterna nginx`, `libnetwork` (implementando el CNM) ejecuta una coreografía silenciosa:

1. El controlador de red crea o localiza la **Network** solicitada.
2. Docker crea el **Sandbox** para el nuevo contenedor (aislando su stack de red).
3. `libnetwork` instruye al driver de red para crear un **Endpoint**.
4. Se asigna una dirección IP al Endpoint y se conecta, por un lado, a la Network, y por el otro, al Sandbox del contenedor.

### La perspectiva Senior: CNM vs. CNI

Como profesional DevOps, es crucial que no confundas **CNM** con **CNI** (*Container Network Interface*).

* **CNM** es el modelo nativo impulsado por Docker.
* **CNI** es un estándar competidor impulsado por la Cloud Native Computing Foundation (CNCF) y es el modelo que utiliza **Kubernetes**.

Mientras que el CNM de Docker favorece una experiencia de usuario sencilla y "lista para usar" (con `libnetwork` gestionando todo), el CNI delega la complejidad en plugins de terceros (como Calico, Flannel o Cilium), priorizando la flexibilidad en entornos distribuidos masivos. Entender el modelo CNM aquí te dará una base sólida sobre cómo se conectan las piezas de red, un conocimiento que será invaluable cuando abordemos la transición a Kubernetes en el Capítulo 12 y tengas que adaptarte a la filosofía del CNI.

Con este modelo mental claro (Sandbox, Endpoint, Network), estamos listos para bajar al nivel de implementación y analizar los "Drivers" nativos que Docker nos ofrece para materializar estas redes, tema central de nuestra siguiente sección.

## 5.2. Drivers de red nativos: Bridge, Host, None y Overlay

En la sección anterior vimos cómo el **CNM** define la teoría: un *Sandbox*, conectado por un *Endpoint* a una *Network*. Ahora bajaremos al terreno práctico. Para que esta especificación teórica funcione en el sistema operativo anfitrión, Docker utiliza **drivers de red** (controladores).

Estos drivers son los responsables de ejecutar las reglas de iptables, crear las interfaces virtuales y gestionar el enrutamiento. Docker incluye por defecto cuatro drivers nativos principales, cada uno diseñado para resolver un problema de arquitectura distinto.

### 1. Driver `bridge` (El estándar por defecto)

Cuando ejecutas un contenedor sin especificar una red, Docker utiliza el driver `bridge`. En términos de Linux, un "bridge" es un conmutador por software (un switch virtual) que permite que los contenedores conectados a la misma red puente se comuniquen, mientras proporciona aislamiento frente a contenedores que no están en esa red.

* **Bajo el capó:** Al instalar Docker, se crea automáticamente una interfaz en el host llamada `docker0`. Cuando levantas un contenedor, el driver crea un par de interfaces virtuales (el `veth pair` que vimos en el CNM). Una se queda en el contenedor (como `eth0`) y la otra se conecta al puente `docker0`.
* **Tráfico externo:** Para que el contenedor salga a Internet, el driver configura reglas de **NAT (Network Address Translation)** (enmascaramiento IP) en el host.
* **Visión Senior:** El puente por defecto (`docker0`) tiene limitaciones históricas graves, como la falta de resolución DNS automática por nombre de contenedor (tendrías que usar las direcciones IP, lo cual es un antipatrón). En la próxima sección (5.3) veremos por qué en entornos productivos *siempre* debes crear tus propias redes bridge (User-defined bridges) en lugar de usar la que viene por defecto.

```text
[ Diagrama Lógico: Driver Bridge ]

+-------------------------------------------------------------+
| HOST (Anfitrión)                                            |
|                                                             |
|   +-----------------------------------------------------+   |
|   |          Bridge Virtual (ej. docker0)               |   |
|   +-------+-----------------------------+-------+-------+   |
|           |                             |                   |
|      (veth pair)                   (veth pair)              |
|           |                             |                   |
| +---------+---------+         +---------+---------+         |
| | eth0              |         | eth0              |         |
| |   Contenedor A    |         |   Contenedor B    |         |
| +-------------------+         +-------------------+         |
+-------------------------------------------------------------+

```

### 2. Driver `host` (Rendimiento puro, aislamiento nulo)

Si el driver `bridge` prioriza el aislamiento, el driver `host` prioriza el rendimiento puro rompiendo la primera regla de los contenedores: el aislamiento de red.

* **¿Cómo funciona?** Si inicias un contenedor con `--network host`, ese contenedor no obtiene su propio *Network Namespace* (su propio *Sandbox* en términos del CNM). En su lugar, comparte exactamente el mismo espacio de red que el sistema operativo anfitrión.
* **El resultado:** Si tu contenedor ejecuta un servidor Nginx en el puerto 80, este estará disponible en la IP del host directamente en el puerto 80. No hay NAT, no hay port-mapping ni puentes virtuales de por medio.
* **Visión Senior / Casos de uso:** Este driver es útil en escenarios donde el rendimiento de red es extremadamente crítico y la latencia introducida por el NAT del `bridge` es inaceptable (por ejemplo, procesamiento de paquetes de alta frecuencia). **Sin embargo**, conlleva riesgos de seguridad y de colisión de puertos: no puedes ejecutar dos contenedores en la misma máquina intentando usar el puerto 80 con el driver `host`.

### 3. Driver `none` (Aislamiento absoluto)

A veces, la mejor red es ninguna red. El driver `none` desactiva completamente la pila de red externa para un contenedor.

* **¿Cómo funciona?** El contenedor obtiene su propio *Network Namespace* (aislamiento), pero Docker no configura ninguna interfaz de red dentro de él, salvo la de *loopback* (`lo` / 127.0.0.1).
* **Visión Senior / Casos de uso:** 1.  **Seguridad paranoica:** Para procesar un lote de datos altamente sensibles. Pasas los datos mediante un volumen, el contenedor hace el cómputo aislado (imposibilitando exfiltración de datos por red) y escribe el resultado en otro volumen.

1. **Configuración manual (Custom Networking):** A veces, ingenieros de red muy avanzados usan `none` para que Docker no interfiera y luego, mediante scripts externos, inyectan sus propias interfaces virtuales personalizadas (usando comandos de `iproute2` desde el host) directamente en el *namespace* del contenedor.

### 4. Driver `overlay` (Redes distribuidas)

Hasta ahora, todos los drivers asumen que los contenedores viven en el **mismo servidor físico o virtual**. Pero en arquitecturas modernas, tus servicios estarán distribuidos a través de un clúster de múltiples servidores. Aquí es donde brilla el driver `overlay`.

* **¿Cómo funciona?** Crea una red distribuida en múltiples hosts del demonio de Docker. El enrutamiento de Overlay utiliza una tecnología de encapsulación del kernel de Linux llamada **VXLAN** (Virtual Extensible LAN). Toma las tramas de capa 2 (las del contenedor) y las encapsula dentro de paquetes UDP de capa 4 (los del host) para viajar a través de la infraestructura física subyacente.
* **Visión Senior:** Para que el driver `overlay` funcione, los nodos de Docker deben estar unidos en un clúster (típicamente mediante **Docker Swarm**), lo que les permite compartir de forma segura la tabla de rutas y las claves criptográficas. Esto abstrae la complejidad a nivel de aplicación: un contenedor en el "Servidor A" puede comunicarse con un contenedor en el "Servidor B" usando la red `overlay` exactamente como si estuvieran en el mismo switch local.

---

### Resumen Estratégico de Drivers

| Driver | Aislamiento de Red | Rendimiento | Caso de Uso Principal (DevOps) |
| --- | --- | --- | --- |
| **`bridge`** | Alto (Red virtualizada) | Bueno (Penalización por NAT) | Desarrollo local, apps monolíticas o microservicios en un solo nodo. |
| **`host`** | Nulo (Usa la red del host) | Excelente (Nativo) | Optimizaciones extremas de red o apps que necesitan abrir un gran rango de puertos. |
| **`none`** | Absoluto (Caja negra) | N/A | Trabajos Batch, alta seguridad, procesamiento offline. |
| **`overlay`** | Alto (VXLAN en clúster) | Bueno (Penalización por encapsulación) | Despliegues distribuidos multi-host (Swarm). |

Entender las limitaciones matemáticas y de rendimiento de estos drivers es lo que separa a un desarrollador que solo sabe hacer un `docker run` de un DevOps Senior capaz de auditar la arquitectura.

## 5.3. Creación de redes personalizadas (User-defined bridges) y resolución DNS interna

En la sección anterior, mencionamos que el driver `bridge` por defecto (asociado a la interfaz `docker0`) tiene limitaciones históricas severas. Es el lugar donde caen todos los contenedores si no especificas una red, pero usarlo en un entorno productivo, o incluso en un entorno de desarrollo moderadamente complejo, es considerado un antipatrón.

¿El motivo principal? **La falta de resolución DNS automática.**

### El problema del Bridge por Defecto

Imagina que tienes dos contenedores en la red por defecto: uno llamado `app_web` y otro `base_datos`. Si la aplicación web intenta conectarse a la base de datos usando el *hostname* `base_datos`, la conexión fallará.

En la red `docker0` predeterminada, los contenedores solo pueden comunicarse a través de sus direcciones IP explícitas. Dado que los contenedores son efímeros y sus IPs cambian cada vez que se reinician o recrean, codificar IPs (hardcoding) en tus configuraciones es una receta para el desastre. La solución "legacy" era usar el flag `--link`, pero esta característica está obsoleta (*deprecated*) y no debe usarse en proyectos modernos.

### La Solución: User-defined Bridges

Para resolver este problema, Docker introdujo las **redes personalizadas** (User-defined bridges). Al crear tu propia red bridge, Docker habilita automáticamente un servidor DNS interno para esa red.

Crear una red es tan simple como ejecutar:

```bash
# Crea una nueva red tipo bridge llamada 'mi_red_backend'
docker network create --driver bridge mi_red_backend

```

Una vez creada, puedes conectar contenedores a ella durante su lanzamiento:

```bash
# Lanzamos la base de datos en nuestra nueva red
docker run -d --name db_postgres --network mi_red_backend postgres:14

# Lanzamos la API en la misma red
docker run -d --name api_node --network mi_red_backend node:18-alpine

```

### La Magia del DNS Interno (127.0.0.11)

Cuando conectas contenedores a una red personalizada, Docker inyecta un servidor DNS local dentro del *Network Namespace* de cada contenedor, accesible siempre en la IP fija `127.0.0.11`.

Si entras al contenedor `api_node` y haces un ping a `db_postgres`, ocurre el siguiente flujo:

1. El contenedor `api_node` consulta su archivo `/etc/resolv.conf`, el cual apunta a `127.0.0.11`.
2. El DNS embebido de Docker intercepta la petición.
3. El DNS busca en su registro dinámico si existe un contenedor llamado `db_postgres` en esa red específica.
4. Devuelve la IP interna correspondiente (ej. `172.18.0.2`), y la conexión se establece.

Este mecanismo garantiza que tus microservicios siempre se encuentren entre sí por nombre, independientemente de la IP que Docker les haya asignado.

### Aislamiento y Segmentación (Visión Senior)

Un profesional DevOps no crea una única red gigante para todos los contenedores. Utiliza redes personalizadas para aplicar **segmentación y el principio de menor privilegio de red**.

Observa esta topología clásica de tres capas:

```text
[ Diagrama Lógico: Segmentación con User-Defined Bridges ]

                    INTERNET
                       |
                       v
+-----------------------------------------------------------+
| RED: 'frontend_network'                                   |
|   +-------------------+                                   |
|   | Reverse Proxy     | ---> (Expone puerto 80/443 al host)
|   | (Nginx/Traefik)   |                                   |
|   +---------+---------+                                   |
+-------------|---------------------------------------------+
              | (El Proxy pertenece a ambas redes)
+-------------|---------------------------------------------+
| RED: 'backend_network'                                    |
|   +---------+---------+       +-------------------+       |
|   |                   |       |                   |       |
|   | API Service A     |       | API Service B     |       |
|   |                   |       |                   |       |
|   +---------+---------+       +---------+---------+       |
+-------------|---------------------------|-----------------+
              |                           |
+-------------|---------------------------|-----------------+
| RED: 'database_network'                 |                 |
|   +---------+---------+       +---------+---------+       |
|   |                   |       |                   |       |
|   | Base de Datos     |       | Caché (Redis)     |       |
|   | (Totalmente oculta)       |                   |       |
|   +-------------------+       +-------------------+       |
+-----------------------------------------------------------+

```

**Beneficios de esta arquitectura:**

1. **Aislamiento:** La Base de Datos no tiene acceso a la red `frontend_network`. Si el Reverse Proxy es comprometido, el atacante no tiene una ruta de red directa hacia la base de datos (ya que el Proxy solo ve a las APIs en la red backend).
2. **Control granular:** Puedes conectar y desconectar contenedores de redes en caliente (en tiempo de ejecución) usando `docker network connect` y `docker network disconnect`, lo que facilita intervenciones de mantenimiento o depuración.
3. **Alias de red (Network Aliases):** Permite que un contenedor sea conocido por múltiples nombres dentro de una red. Por ejemplo, puedes tener dos contenedores de base de datos y darles a ambos el alias `db-master`. Docker hará un balanceo de carga (Round-Robin DNS) rudimentario entre ellos.

Al dominar la creación de redes y la resolución DNS, dejas de pensar en IPs fijas y empiezas a pensar en topologías dinámicas orientadas a servicios.

## 5.4. Exposición y publicación de puertos avanzada

Hasta este punto del capítulo, hemos resuelto la comunicación *interna*: los contenedores pueden hablar entre sí de forma segura y descubrirse mediante DNS en redes personalizadas. Sin embargo, un clúster aislado no aporta valor al usuario final. Necesitamos que el tráfico del mundo exterior (Internet o la intranet corporativa) pueda acceder a nuestros servicios.

Aquí es donde entra en juego la publicación de puertos. Aunque parece un concepto trivial al principio, las configuraciones por defecto de Docker esconden trampas de seguridad y rendimiento que un perfil Senior debe conocer y evitar.

### La gran confusión: EXPOSE vs. Publish (`-p`)

El primer hito en el aprendizaje de un ingeniero DevOps es separar conceptualmente la instrucción del Dockerfile frente al argumento de la línea de comandos.

* **`EXPOSE <puerto>` (En el Dockerfile):** Es estrictamente **documentación**. No publica el puerto, no modifica el firewall ni hace que el servicio sea accesible desde el host. Solo sirve como metadato para que otros desarrolladores (y herramientas automatizadas) sepan en qué puerto está escuchando el proceso interno.
* **`-p` o `--publish` (En `docker run`):** Es la acción real. Le indica al demonio de Docker que configure el sistema operativo anfitrión para enrutar el tráfico externo hacia el contenedor.

### Sintaxis Avanzada y Control de Interfaces

La sintaxis básica que todo el mundo aprende es `-p 8080:80` (Mapear el puerto 8080 del host al 80 del contenedor). Sin embargo, esta forma oculta un comportamiento crítico: **Docker expone el puerto en todas las interfaces de red del host (`0.0.0.0`) por defecto**.

Si estás ejecutando una base de datos de desarrollo con `-p 5432:5432`, accidentalmente la estás haciendo accesible a toda tu red local (o a todo Internet si el servidor tiene una IP pública directamente asignada).

La sintaxis avanzada te permite restringir esto:

```bash
# 1. Inseguro (Por defecto): Expone en todas las interfaces (0.0.0.0)
docker run -p 8080:80 nginx

# 2. Seguro (Localhost): Solo accesible desde el propio servidor host
docker run -p 127.0.0.1:8080:80 nginx

# 3. Específico por IP: Útil si el host tiene múltiples tarjetas de red (ej. DMZ vs LAN)
docker run -p 192.168.1.50:8080:80 nginx

# 4. Protocolo específico (Docker asume TCP por defecto)
docker run -p 53:53/udp coredns/coredns

```

### Puertos Efímeros y Conflictos (El flag `-P`)

En arquitecturas donde se levantan decenas de réplicas del mismo servicio, codificar el puerto del host en el comando causará colisiones inmediatas (no puedes tener dos contenedores usando el `8080` del host).

Para evitar esto, puedes indicar a Docker que asigne dinámicamente un puerto "efímero" alto (normalmente en el rango 32768-60999):

```bash
# Dejando el puerto del host en blanco
docker run -d -p 80 nginx

# O usando -P (Publica TODOS los puertos definidos con EXPOSE en el Dockerfile)
docker run -d -P nginx

```

Para saber qué puerto asignó Docker automáticamente, debes consultar el contenedor:

```bash
docker port <id_o_nombre_contenedor>
# Salida esperada: 80/tcp -> 0.0.0.0:32768

```

### Bajo el capó: iptables y docker-proxy

¿Cómo logra Docker que el tráfico llegue del host al contenedor? Utiliza un enfoque de dos vías:

1. **Reglas DNAT (iptables):** Docker inyecta dinámicamente reglas en la cadena `PREROUTING` de `iptables` del kernel de Linux. Esto captura el tráfico entrante a nivel de red y traduce la IP/Puerto destino hacia la IP interna del contenedor. Es extremadamente rápido.
2. **El proceso `docker-proxy`:** Para ciertos casos límite (como el tráfico originado desde el propio `localhost` del host), `iptables` no siempre enruta correctamente los paquetes de vuelta. Docker levanta un pequeño proceso en espacio de usuario (`docker-proxy`) por cada puerto expuesto para reenviar este tráfico.

### Visión Senior: El Patrón del Reverse Proxy

Un error clásico en infraestructuras Docker es intentar publicar los puertos de cada uno de los microservicios directamente en el host (`-p 3000:3000`, `-p 4000:4000`, etc.). Esto genera una superficie de ataque enorme y un infierno de gestión.

La arquitectura estándar en producción dicta que **solo un contenedor debe publicar puertos externos**.

```text
[ Arquitectura Segura de Exposición de Puertos ]

Petición Externa (Internet)
       |
       | (Solo puertos 80 y 443 expuestos en el Host)
       v
+------|--------------------------------------------------+
| HOST |   docker run -p 80:80 -p 443:443 traefik         |
|      |                                                  |
|  +---v------------------+                               |
|  | Reverse Proxy        | (Traefik / Nginx / HAProxy)   |
|  | (Punto de entrada)   |                               |
|  +---+---------+--------+                               |
|      |         |               Red Bridge Interna       |
|  +---v----+  +-v------+        (Sin publicación al host)|
|  | API A  |  | API B  |                                 |
|  | (8080) |  | (3000) |                                 |
|  +--------+  +--------+                                 |
+---------------------------------------------------------+

```

En este modelo, los contenedores de las aplicaciones internas (API A y API B) no utilizan el flag `-p` en absoluto. El Reverse Proxy recibe el tráfico externo en el puerto 443, inspecciona la cabecera HTTP (por ejemplo, `api.midominio.com`) y enruta la petición internamente utilizando la resolución DNS de Docker que vimos en la sección 5.3.

Esto no solo centraliza la seguridad y los certificados SSL, sino que mantiene tu servidor host limpio de reglas de red innecesarias.

## 5.5. Driver Macvlan para integración con redes físicas legacy

Hasta ahora, hemos construido redes virtuales donde Docker actúa como el enrutador central. Los drivers `bridge` y `overlay` son perfectos para aplicaciones *cloud-native* modernas que no se preocupan por la topología física subyacente. Sin embargo, en el mundo real, la migración a contenedores a menudo choca con la infraestructura tradicional.

¿Qué sucede si tienes una aplicación heredada (legacy) que requiere estar directamente conectada a la red corporativa? ¿Qué pasa si necesitas que un contenedor envíe tráfico de *broadcast* (difusión) para descubrir dispositivos de hardware en la LAN, o si requiere una IP pública directa sin pasar por el NAT del host?

Para estos escenarios de integración profunda en Capa 2 (Enlace de datos), Docker ofrece el driver **Macvlan**.

### ¿Qué es Macvlan?

Macvlan es un controlador de red del kernel de Linux, no un invento exclusivo de Docker. Su función es tomar una única interfaz de red física (por ejemplo, `eth0` en el servidor host) y crear múltiples sub-interfaces virtuales asociadas a ella.

La "magia" radica en que **cada sub-interfaz recibe su propia dirección MAC única**. Cuando conectas un contenedor a una red Macvlan, este obtiene una IP y una MAC que pertenecen a la red física real. Para el switch (conmutador) corporativo al que está conectado el servidor, el contenedor no parece una máquina virtual ni un proceso anidado; aparece exactamente igual que un servidor físico independiente conectado a un puerto.

* **Sin NAT:** El tráfico no sufre enmascaramiento ni traducción de puertos.
* **Sin Port-Mapping:** No necesitas (ni puedes) usar `-p 80:80`. El contenedor expone sus puertos directamente en su propia IP de la red física.

### Diagrama Lógico: El salto a la red física

```text
[ Diagrama Lógico: Driver Macvlan ]

                    +------------------------------------+
                    |  Switch Físico Corporativo (LAN)   |
                    |  Subred: 192.168.1.0/24            |
                    +------------------+-----------------+
                                       |
                                       | (Tráfico con múltiples MACs)
+--------------------------------------|------------------------------------+
| HOST DOCKER                          |                                    |
|                               +------v------+                             |
|                               |    eth0     | (Interfaz padre)            |
|                               | .10 (Host)  |                             |
|                               +--+-------+--+                             |
|                                  |       |                                |
|        +-------------------------+       +-----------------------+        |
|        | (Capa 2 directa)                                        |        |
|  +-----v--------------+                            +-------------v-----+  |
|  | Interfaz Macvlan A |                            | Interfaz Macvlan B|  |
|  | MAC: 02:42:c0:...  |                            | MAC: 02:42:c0:... |  |
|  +--------------------+                            +-------------------+  |
|  | Contenedor App 1   |                            | Contenedor App 2  |  |
|  | IP: 192.168.1.50   |                            | IP: 192.168.1.51  |  |
|  +--------------------+                            +-------------------+  |
+---------------------------------------------------------------------------+

```

### Creación de una red Macvlan y etiquetado VLAN (802.1Q)

Para crear una red Macvlan, necesitas conocer la topología de tu red física (la subred, el gateway y qué interfaz del host utilizarás como padre).

```bash
# Creación de una red Macvlan básica
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  red_fisica_lan

```

**La Visión Senior: Integración con VLANs (802.1Q)**
En entornos corporativos, rara vez conectarás contenedores a la red nativa (`eth0`). Lo normal es que el switch entregue tráfico etiquetado en diferentes VLANs a través de un puerto *trunk*. Macvlan soporta nativamente el estándar 802.1Q.

Si necesitas que tus contenedores vivan en la VLAN 50, simplemente añades la etiqueta al nombre de la interfaz padre (`eth0.50`). Docker se encargará de crear la sub-interfaz temporal de Linux y gestionar el etiquetado de los paquetes:

```bash
docker network create -d macvlan \
  --subnet=10.50.0.0/16 \
  --gateway=10.50.0.1 \
  -o parent=eth0.50 \
  red_vlan50_finanzas

```

### La "Trampa" de Macvlan (Troubleshooting Avanzado)

Si decides implementar Macvlan en producción, te enfrentarás inevitablemente al siguiente escenario de diagnóstico: **el contenedor puede hacer ping a cualquier equipo de la red corporativa, y cualquier equipo puede hacer ping al contenedor... pero el servidor Host y el contenedor NO pueden comunicarse entre sí.**

Esto no es un bug de Docker, es una restricción de seguridad intencionada del driver de Macvlan en el kernel de Linux. Evita el enrutamiento asimétrico y problemas de bucles impidiendo que el tráfico salga por una interfaz (eth0) y vuelva a entrar por una de sus sub-interfaces directas.

* **Solución rápida:** No hagas nada. Por diseño, es una buena práctica aislar el host de sus cargas de trabajo.
* **Solución técnica (si es estrictamente necesario):** Debes crear una interfaz virtual Macvlan adicional directamente en el sistema operativo del host (fuera de Docker), asignarle una IP de esa red y ajustar la tabla de enrutamiento local.

### La Alternativa: El driver `ipvlan`

Como nota final para un perfil Senior, debes saber que Macvlan tiene un requisito de hardware crítico: la tarjeta de red física del host y el puerto del switch deben aceptar tráfico de múltiples direcciones MAC (a menudo requiriendo poner la tarjeta en *modo promiscuo*).

En entornos de nube pública (AWS, Azure) o en switches empresariales con políticas estrictas de "Port Security", múltiples MACs en un solo puerto serán bloqueadas inmediatamente. Para estos casos, Docker introdujo en versiones recientes el driver **`ipvlan`**. Funciona de forma casi idéntica, conectando el contenedor a la red física, pero reutiliza la *misma* dirección MAC del host para todos los contenedores, engañando al switch y superando los bloqueos de seguridad de Capa 2.

## 5.6. Troubleshooting de conectividad entre contenedores y hacia el exterior

El verdadero examen de un ingeniero DevOps no ocurre cuando despliega una arquitectura limpia en un lienzo en blanco, sino a las 3:00 a.m. cuando el microservicio A de repente no puede comunicarse con la base de datos B. Las redes definidas por software añaden capas de abstracción que hacen que las herramientas tradicionales (como hacer un simple `ping` desde el servidor) sean insuficientes.

En esta sección abordaremos una metodología sistemática para diagnosticar y resolver problemas de red en Docker, abandonando las suposiciones y basándonos en la observabilidad de los paquetes.

### 1. El antipatrón de instalar herramientas en producción

El primer instinto de un desarrollador cuando falla la red es entrar al contenedor con `docker exec -it <app> sh` e intentar ejecutar `ping`, `curl` o `telnet`.

El problema es que las imágenes de contenedor modernas y seguras (como Alpine, Scratch o Distroless, que vimos en el Capítulo 3) están despojadas de estas utilidades para reducir la superficie de ataque. Instalar utilidades de red en caliente mediante `apt-get` o `apk` dentro de un contenedor en producción es un antipatrón grave que rompe el principio de inmutabilidad.

### 2. La solución Senior: Contenedores efímeros de diagnóstico (Netshoot)

Para auditar la red de un contenedor sin modificar su sistema de archivos, los profesionales utilizan el patrón de **inyección de namespace de red**.

Consiste en levantar un contenedor nuevo, repleto de herramientas de red (como la popular imagen `nicolaka/netshoot`), pero en lugar de conectarlo a una red Docker estándar, lo acoplamos directamente al *Network Namespace* del contenedor que está fallando.

```bash
# Sintaxis para inyectar un contenedor de diagnóstico en la red de otro
docker run -it --rm --network container:<nombre_del_contenedor_fallido> nicolaka/netshoot

```

Al hacer esto, tu terminal entra en una navaja suiza de red (con `dig`, `tcpdump`, `curl`, `nmap`, `mtr`, etc.), pero que "ve" exactamente la misma red, las mismas interfaces virtuales, los mismos puertos de localhost y la misma resolución DNS que el contenedor problemático.

### 3. Diagnóstico de resolución DNS interna

El 80% de los problemas de "conectividad" en redes *User-defined bridge* no son fallos de enrutamiento, sino de resolución de nombres. Si la aplicación arroja un error `Unknown Host`, usa tu contenedor `netshoot` acoplado para interrogar directamente al servidor DNS interno de Docker (127.0.0.11):

```bash
# Consultar el registro DNS interno de Docker para un servicio
dig @127.0.0.11 db_postgres +short

```

Si este comando no devuelve una IP, el problema es claro: el contenedor destino no existe, está detenido, o pertenece a una red Docker diferente.

### 4. Auditoría de bloqueos en el Host (IP Forwarding e iptables)

A veces, la resolución DNS funciona y los contenedores están en la misma red, pero el tráfico hacia el exterior (Internet) falla. Docker depende críticamente de la capacidad del kernel de Linux para enrutar paquetes.

Dos comprobaciones obligatorias desde el servidor anfitrión (Host):

* **Verificar IP Forwarding:** Si esta capacidad del kernel está desactivada, Docker no podrá enrutar el tráfico del puente virtual hacia tu interfaz física. Debe devolver `1`.

```bash
sysctl net.ipv4.ip_forward

```

* **Revisar la cadena DOCKER en iptables:** Las reglas de exposición de puertos (`-p`) y enmascaramiento se escriben aquí. Una política de firewall demasiado estricta (como un `ufw` mal configurado) puede sobrescribir y romper las reglas inyectadas por Docker.

```bash
sudo iptables -t nat -L DOCKER -n

```

### 5. Captura de paquetes a bajo nivel (tcpdump)

Cuando los comandos de alto nivel no revelan el problema (por ejemplo, los paquetes se pierden silenciosamente o hay una latencia extrema), el último recurso es inspeccionar el tráfico en bruto.

Puedes ejecutar `tcpdump` desde el contenedor `netshoot` inyectado, o puedes hacerlo directamente desde el host si identificas la interfaz virtual puente (usualmente empieza por `br-` seguida del ID corto de la red de Docker).

```bash
# 1. Encuentra el ID de tu red personalizada
docker network ls

# 2. Escucha el tráfico ICMP (ping) en el puente virtual de esa red
sudo tcpdump -i br-<ID_DE_LA_RED> icmp -n

```

Ver los paquetes en tiempo real te permite confirmar si la petición (Request) está saliendo del contenedor A, si está llegando al puente virtual, y si el contenedor B está emitiendo una respuesta (Reply) que quizás se está perdiendo en el camino de vuelta.

### Matriz rápida de Troubleshooting

| Síntoma | Herramienta a utilizar | Causa más probable |
| --- | --- | --- |
| `Connection refused` | `nc -vz <host> <puerto>` | El servicio destino está caído o escuchando en `localhost` (127.0.0.1) en lugar de `0.0.0.0` dentro de su contenedor. |
| `Name or service not known` | `dig @127.0.0.11 <nombre>` | Contenedores en distintas redes o error tipográfico en el nombre del servicio. |
| `No route to host` | `ip route` (desde contenedor) | Conflicto de subredes. La red del host pisa el mismo rango IP que la red de Docker. |
| Falla al salir a Internet | `sysctl net.ipv4.ip_forward` | El enrutamiento IP del Host fue desactivado (frecuente tras reinicios si no se hizo persistente). |

Dominar el uso de espacios de red compartidos (`--network container:id`) y comprender la dependencia de Docker con las capas subyacentes del kernel te permitirá aislar cualquier anomalía de red en minutos, no en horas.
