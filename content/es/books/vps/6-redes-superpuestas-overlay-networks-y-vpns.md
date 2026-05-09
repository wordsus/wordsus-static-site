En el diseño de infraestructuras resilientes, la conectividad entre servidores es el sistema nervioso que sostiene la disponibilidad de los datos. Pasar de instancias aisladas a un clúster robusto requiere abandonar la exposición directa a la internet pública, una red hostil e ineficiente para el tráfico inter-nodo. En este capítulo, analizamos las limitaciones del enrutamiento público y exploramos la implementación de redes superpuestas. Desde túneles punto a punto con la eficiencia de WireGuard hasta arquitecturas de malla (Mesh VPNs) y enrutamiento avanzado, aprenderás a construir un plano de red privado, cifrado y agnóstico al proveedor de nube.

## 6.1. Limitaciones de las redes públicas en arquitecturas multi-VPS

A medida que una infraestructura evoluciona de un único servidor monolítico a una arquitectura distribuida (por ejemplo, separando la capa de aplicación web de la base de datos y la caché en distintos VPS), surge un desafío fundamental: **cómo hacer que estos nodos se comuniquen entre sí de forma segura y eficiente.**

En las etapas iniciales, es una tentación común (y un grave error de diseño) configurar los servicios para que se comuniquen a través de las interfaces de red públicas. Aunque en el **Capítulo 3** exploramos cómo proteger estas interfaces mediante `nftables` y herramientas como CrowdSec, depender exclusivamente de la red pública para el tráfico inter-nodo o "este-oeste" presenta limitaciones arquitectónicas y de seguridad severas que justifican la implementación de redes superpuestas (Overlay Networks).

A continuación, analizamos los problemas críticos de depender del enrutamiento público para la comunicación interna de nuestra infraestructura.

### 1. Superficie de ataque y exposición de servicios internos

El diseño de muchos servicios de backend asume que operarán dentro de un entorno de red confiable (trusted network). Bases de datos como PostgreSQL o MySQL, sistemas de caché en memoria como Redis o Memcached, y motores de búsqueda como Elasticsearch, no están endurecidos por defecto para enfrentar el hostil entorno de la internet pública.

Si exponemos un puerto de Redis en una IP pública para que otro VPS pueda acceder a él, incluso si restringimos el acceso mediante listas blancas (IP whitelisting) en el firewall, estamos dejando un servicio crítico a un paquete malformado o un zero-day de distancia de ser comprometido. En arquitecturas modernas, los puertos de servicios internos **nunca** deben estar enlazados (bind) a interfaces públicas (`0.0.0.0`), sino exclusivamente a `localhost` o a interfaces de redes privadas.

### 2. Tráfico en texto plano y vulnerabilidad a la intercepción (Sniffing)

Muchos protocolos de comunicación interna no cifran su tráfico por defecto porque delegan la seguridad en la capa de red. Si un VPS web se comunica con una base de datos a través de IPs públicas sin haber configurado explícitamente TLS en la conexión (lo cual añade complejidad en la gestión de certificados internos), la data viaja en texto plano a través de routers y switches que están fuera de nuestro control.

Esto expone a la infraestructura a ataques de *Man-in-the-Middle* (MitM) o intercepción de paquetes por parte de actores maliciosos en la red del proveedor de tránsito, comprometiendo datos sensibles, credenciales o tokens de sesión.

### 3. Complejidad exponencial en la gestión del Firewall ("Spaghetti de Reglas")

Cuando los nodos se comunican por IPs públicas, el SysAdmin debe mantener un control estricto de quién habla con quién. Si tenemos 5 servidores web que necesitan hablar con un clúster de base de datos de 3 nodos, necesitamos gestionar y actualizar constantemente listas de control de acceso (ACLs).

Si a esto le sumamos el dinamismo de la nube —donde los VPS pueden destruirse y recrearse con IPs diferentes tras una falla—, mantener los firewalls actualizados basándose en IPs públicas se vuelve un proceso frágil, propenso a errores humanos y bloqueos accidentales (lockouts).

### 4. Costos de transferencia de datos (Egress Traffic)

La mayoría de los proveedores de nube pública (AWS, DigitalOcean, Hetzner, Linode) facturan el tráfico de salida (egress) que atraviesa la interfaz pública de red. Si tienes aplicaciones intensivas en datos (por ejemplo, sincronización continua de bases de datos o ingesta masiva de logs hacia tu servidor de monitoreo del Capítulo 8), transferir esos terabytes a través de IPs públicas consumirá rápidamente tu cuota de ancho de banda.

Por el contrario, el tráfico enrutado a través de las redes privadas internas del centro de datos del proveedor suele ser gratuito o tener un costo significativamente menor.

### 5. El problema de la fragmentación Multi-Cloud

Es cierto que los proveedores ofrecen VPCs (Virtual Private Clouds) nativas (tratadas en el Capítulo 3) para solucionar el problema del tráfico dentro de *su* propio ecosistema. Sin embargo, ¿qué ocurre cuando la arquitectura exige alta disponibilidad geográfica utilizando múltiples proveedores para evitar el *vendor lock-in*?

Las VPCs de AWS no pueden hablar nativamente de forma privada con las VPCs de Hetzner o de un servidor dedicado *bare-metal* en OVH. Si dependemos de soluciones propietarias, la red pública vuelve a ser el único puente de comunicación entre nuestros propios servidores.

---

### Representación del problema

Para ilustrar estas deficiencias, observemos el contraste entre un enfoque público y la preparación para una red privada superpuesta:

```text
[ ARQUITECTURA DEFICIENTE: Comunicación por IP Pública ]

    +---------------+                            +---------------+
    |   VPS - Web   |      INTERNET PÚBLICA      |   VPS - DB    |
    |  IP: 1.1.1.1  | <------------------------> |  IP: 2.2.2.2  |
    +---------------+   (Tráfico No Confiable)   +---------------+
                           - Costos de Egress      - Puerto 3306
                           - Riesgo de Sniffing      Expuesto a 
                           - Latencia variable       escaneos (Shodan)


[ ARQUITECTURA ROBUSTA: Preparación para Overlay Network ]

    +---------------+                            +---------------+
    |   VPS - Web   |                            |   VPS - DB    |
    |  IP: 1.1.1.1  |                            |  IP: 2.2.2.2  |
    +-------+-------+                            +-------+-------+
            |               TÚNEL CIFRADO                |
            +--------------------------------------------+
            |        (Red Superpuesta / Overlay)         |
      (IP Privada:                                 (IP Privada:
      10.0.0.10)                                   10.0.0.20)
                                                     - Puerto 3306 
                                                       enlazado SÓLO a
                                                       10.0.0.20

```

### Hacia la red superpuesta (Overlay Network)

Para superar estas cinco limitaciones, los SysAdmins modernos no dependen de las garantías de seguridad de la red subyacente (underlay), sino que construyen su propia red privada virtualizada por encima de ella. Esta red (la **Overlay Network**) cifra el tráfico en origen, estandariza el direccionamiento IP sin importar dónde se encuentre alojado el servidor físico, y aísla los servicios internos del ruido de internet.

En las siguientes secciones, exploraremos cómo implementar estas topologías seguras en la práctica, comenzando con enlaces cifrados ligeros usando **WireGuard** y evolucionando hacia redes de malla (Mesh VPNs) automatizadas que abstraen por completo la complejidad geográfica de nuestra infraestructura multi-VPS.

## 6.2. Creación de redes privadas virtuales punto a punto con WireGuard

Tras analizar las severas deficiencias de enrutar tráfico interno a través de interfaces públicas, necesitamos una herramienta para construir nuestra primera red superpuesta (Overlay Network). Históricamente, esto implicaba lidiar con la inmensa complejidad de IPsec o la pesada sobrecarga en el espacio de usuario de OpenVPN. Hoy en día, el estándar de facto para arquitecturas Linux modernas es **WireGuard**.

WireGuard destaca por su simplicidad extrema (menos de 4,000 líneas de código frente a las cientos de miles de sus predecesores), su altísimo rendimiento al estar integrado directamente en el kernel de Linux y su enfoque de seguridad "opinionado" que utiliza primitivas criptográficas modernas (Curve25519, ChaCha20, Poly1305) sin dejar margen a configuraciones inseguras.

A nivel conceptual, WireGuard funciona basándose en el **Cryptokey Routing** (Enrutamiento por claves criptográficas). Esto significa que la asociación entre una clave pública y una dirección IP interna es estricta e inmutable: si un paquete proviene de una IP de la red virtual, WireGuard verifica matemáticamente que haya sido cifrado con la clave privada correspondiente a esa IP. Si no coincide, el paquete se descarta silenciosamente.

### Topología Punto a Punto (Node-to-Node)

Para ilustrar su implementación, conectaremos dos VPS (un servidor Web y una Base de Datos) creando un túnel cifrado. A nivel de sistema operativo, WireGuard crea una interfaz de red virtual (generalmente `wg0`) que se comporta como cualquier otra interfaz física (como `eth0`), permitiendo aplicar reglas de `nftables` (vistas en el Capítulo 3) o métricas de Prometheus (que veremos en el Capítulo 8) de forma transparente.

```text
[ Topología Punto a Punto con WireGuard ]

+-------------------------+                   +-------------------------+
|        VPS - Web        |                   |        VPS - DB         |
|   (Host A - Iniciador)  |                   |  (Host B - Receptor)    |
|                         |                   |                         |
|  IP Pública: 203.0.113.1|                   | IP Pública: 198.51.100.1|
|                         |                   |                         |
|  [Interfaz wg0]         |  <--- Túnel --->  |  [Interfaz wg0]         |
|  IP Privada: 10.0.0.1/32|     UDP: 51820    |  IP Privada: 10.0.0.2/32|
|  Clave Privada: PrivA   |                   |  Clave Privada: PrivB   |
|  Clave Pública: PubA    |                   |  Clave Pública: PubB    |
+-------------------------+                   +-------------------------+

```

### Paso 1: Instalación y Generación de Claves

En ambos servidores, el primer paso es instalar el paquete y generar el par de claves. WireGuard es *stateless* (sin estado) y no tiene un modelo estricto de cliente-servidor; todos son pares (peers).

```bash
# Instalación en Debian/Ubuntu
apt update && apt install wireguard

# Generación de claves (Ejecutar en AMBOS nodos, guardando el output de forma segura)
wg genkey | tee privatekey | wg pubkey > publickey

# Proteger las claves privadas generadas
chmod 600 privatekey

```

### Paso 2: Configuración del Host B (Base de Datos / Receptor)

Creamos el archivo de configuración en `/etc/wireguard/wg0.conf` en el servidor de la Base de Datos. Este nodo "escuchará" pasivamente las conexiones.

```ini
# /etc/wireguard/wg0.conf en Host B (DB)

[Interface]
# La dirección IP virtual de este nodo dentro del túnel
Address = 10.0.0.2/32
# La clave privada generada en el Host B
PrivateKey = <Contenido_de_PrivB>
# Puerto UDP en el que WireGuard escuchará a través de la interfaz pública
ListenPort = 51820

[Peer]
# Información del Host A (Web)
PublicKey = <Contenido_de_PubA>
# Qué IPs internas están permitidas para esta clave (Cryptokey Routing)
AllowedIPs = 10.0.0.1/32

```

### Paso 3: Configuración del Host A (Web / Iniciador)

Configuramos el VPS Web para que inicie la conexión hacia la Base de Datos.

```ini
# /etc/wireguard/wg0.conf en Host A (Web)

[Interface]
Address = 10.0.0.1/32
PrivateKey = <Contenido_de_PrivA>

[Peer]
PublicKey = <Contenido_de_PubB>
AllowedIPs = 10.0.0.2/32
# Endpoint: IP Pública y puerto del Host B para establecer el túnel subyacente
Endpoint = 198.51.100.1:51820
# Mantener viva la conexión a través de NATs o firewalls estatales
PersistentKeepalive = 25

```

*Nota para SysAdmins:* El parámetro `PersistentKeepalive` es crucial en entornos cloud. Envía un paquete vacío cada 25 segundos para asegurar que cualquier firewall intermedio (o las tablas de seguimiento de conexiones del proveedor) mantenga abierta la sesión UDP.

### Paso 4: Ajustes de Firewall y Activación

Antes de levantar la interfaz, debemos asegurarnos de que nuestro firewall perimetral (configurado en el Capítulo 3) permita el tráfico UDP entrante en el puerto 51820, al menos desde la IP pública de nuestro nodo par.

Una vez ajustado el firewall, activamos la interfaz usando la herramienta `wg-quick`, que se encarga de leer la configuración, crear la interfaz de red, asignar las IPs y configurar las rutas correspondientes en la tabla del kernel.

```bash
# Levantar la interfaz manualmente
wg-quick up wg0

# Habilitar el servicio para que inicie en el arranque del sistema
systemctl enable wg-quick@wg0

```

Podemos verificar el estado del túnel ejecutando el comando `wg`. Si el túnel está establecido, veremos información sobre el último *handshake* y los datos transferidos.

### Consideraciones de Escalabilidad

Este enfoque punto a punto resuelve el problema de la comunicación segura, garantizando cifrado y ocultando nuestros servicios detrás de IPs privadas (ahora la base de datos solo necesita escuchar en `10.0.0.2:3306`).

Sin embargo, en arquitecturas que crecen a decenas de nodos, gestionar los archivos de configuración estáticos de WireGuard, distribuir manualmente las claves públicas y mantener actualizados los endpoints de IPs públicas de cada par (especialmente si los nodos se recrean con IPs dinámicas) se convierte rápidamente en una pesadilla de mantenimiento conocida como el "problema de intercambio de claves N al cuadrado". Para resolver esto sin perder el rendimiento de WireGuard, debemos evolucionar hacia las **Redes de Malla (Mesh VPNs)**, que abordaremos en la siguiente sección.

## 6.3. Redes de malla (Mesh VPNs) para infraestructuras multi-cloud

En la sección anterior configuramos un túnel WireGuard punto a punto de forma manual. Esto es perfectamente viable para interconectar un par de servidores, pero a medida que la infraestructura crece, nos encontramos de frente con el problema del enrutamiento $N^2$ (N al cuadrado).

Si tienes 10 servidores y necesitas que todos se comuniquen entre sí directamente (una topología de malla completa o *full-mesh*), tendrías que configurar 45 túneles individuales. Si añades un servidor número 11, debes actualizar la configuración y las claves de los 10 servidores existentes. En un entorno dinámico multi-cloud, donde las instancias nacen y mueren continuamente o cambian de IP pública, mantener esta red estática a mano es insostenible.

Para solucionar este desafío de escalabilidad, el ecosistema ha evolucionado hacia las **Redes de Malla (Mesh VPNs)**. Estas herramientas abstraen la complejidad criptográfica y de enrutamiento mediante la separación de dos conceptos fundamentales de red: el **Plano de Control** (Control Plane) y el **Plano de Datos** (Data Plane).

### El paradigma: Plano de Control vs. Plano de Datos

En una Mesh VPN, los nodos no necesitan conocer a priori las IPs públicas ni las claves de todos los demás. En su lugar, utilizan un servidor centralizado (o clúster de servidores) que actúa como "directorio" y coordinador.

1. **Plano de Control (Coordinación):** Cuando un VPS arranca, se autentica contra el Plano de Control. Le informa su clave pública, su IP pública actual y cómo llegar a él. El Plano de Control distribuye esta información dinámicamente al resto de los nodos autorizados.
2. **Plano de Datos (Tráfico Real):** Cuando el VPS "A" quiere hablar con el VPS "B", ya sabe cómo encontrarlo gracias al Plano de Control. A partir de ese momento, el tráfico cifrado fluye **directamente** entre A y B (Punto a Punto), sin pasar por el servidor central. Si las IPs públicas cambian, el tráfico hace *failover* o utiliza técnicas de *NAT Traversal* (Hole Punching) para mantener la conexión viva de forma transparente.

```text
[ Topología de una Mesh VPN Multi-Cloud ]

                            +---------------------+
                            |  PLANO DE CONTROL   |
                            | (Distribuye Claves y|
                            |  Descubrimiento IP) |
                            +----------+----------+
                                       |
                   (Sincronización de metadatos, no de tráfico)
         /-----------------------------+-----------------------------\
         |                             |                             |
+--------+--------+           +--------+--------+           +--------+--------+
|  VPS - AWS EC2  |           | VPS - Hetzner   |           |  VPS - Linode   |
| (Frontend Web)  |           | (Base de Datos) |           | (Monitor/Logs)  |
| IP: 100.64.0.1  | <=======> | IP: 100.64.0.2  | <=======> | IP: 100.64.0.3  |
+-----------------+  Túnel P2P+-----------------+  Túnel P2P+-----------------+
         ^            Cifrado          ^             Cifrado         ^
         |                             |                             |
         \=============================+=============================/
                   (PLANO DE DATOS: Tráfico directo entre nodos)

```

### Análisis de las principales soluciones Mesh

Actualmente, existen tres grandes contendientes en el espacio de las redes superpuestas modernas, cada uno con una filosofía de diseño distinta:

#### 1. Tailscale (La opción "Zero-Config" basada en WireGuard)

Tailscale ha revolucionado el mercado por su extrema facilidad de uso. Utiliza el protocolo WireGuard en su capa inferior (Plano de Datos), pero resuelve el intercambio de claves conectándose a su propio Plano de Control SaaS, el cual se integra con proveedores de identidad (SSO) como Google, Microsoft o GitHub.

* **Ventajas:** El *NAT Traversal* (utilizando servidores STUN/TURN propios llamados DERP) es el mejor del mercado; puede atravesar casi cualquier firewall corporativo o CGNAT. Su configuración es literalmente ejecutar un comando (`tailscale up`).
* **Desventajas:** El Plano de Control es propietario y alojado por Tailscale. Si deseas total soberanía sobre tu infraestructura, debes utilizar **Headscale**, una implementación de código abierto del Plano de Control de Tailscale que puedes autoalojar.
* **Caso de uso ideal:** Equipos mixtos (desarrolladores remotos + servidores) y despliegues rápidos donde la usabilidad es prioritaria.

#### 2. Nebula (El estándar de alta escala por Slack)

Desarrollado internamente por Slack para conectar decenas de miles de servidores en múltiples regiones de AWS, Nebula es una herramienta puramente enfocada en infraestructura de servidores. A diferencia de Tailscale, Nebula no se basa en WireGuard, sino en su propio protocolo cifrado utilizando Noise Protocol Framework.

* **Ventajas:** Es completamente de código abierto y autoalojado. Funciona mediante un modelo de **Certificados**. Actúas como tu propia Autoridad Certificadora (CA); firmas certificados para cada servidor indicando su IP, nombre y grupos. Además, incluye un firewall interno basado en "grupos" (etiquetas) en lugar de IPs, permitiendo microsegmentación avanzada.
* **Desventajas:** La curva de aprendizaje es más pronunciada y el despliegue inicial requiere gestionar y distribuir certificados y claves a través de Ansible u otra herramienta de automatización (Capítulo 5).
* **Caso de uso ideal:** Interconexión masiva de servidores (Server-to-Server) en arquitecturas complejas donde se exige control total sobre el tráfico y la criptografía, sin depender de un SaaS externo.

#### 3. ZeroTier (El Switch Virtual de Capa 2)

Mientras WireGuard y Nebula operan en Capa 3 (enrutando paquetes IP), ZeroTier emula un conmutador (switch) Ethernet tradicional en Capa 2. Para el sistema operativo, estar conectado a ZeroTier es exactamente igual que tener un cable físico conectado al mismo switch que los demás nodos del mundo.

* **Ventajas:** Al soportar Capa 2, permite enviar tráfico de broadcast y multicast, lo cual es un requisito estricto para ciertos protocolos de clúster heredados o sistemas de alta disponibilidad (como algunas configuraciones de Corosync/Pacemaker que veremos en el Capítulo 7).
* **Desventajas:** El rendimiento puro de enrutamiento puede ser ligeramente inferior al de WireGuard debido a la sobrecarga de emular la Capa 2.
* **Caso de uso ideal:** Migración de infraestructuras *legacy*, protocolos que requieren multicast, o entornos donde se necesita enlazar redes locales completas (Bridging) de forma transparente.

### Implementando el cambio de paradigma

Al adoptar cualquiera de estas tres tecnologías, la arquitectura de nuestros VPS cambia drásticamente. Las bases de datos, los sistemas de caché (Redis) y las APIs internas dejan de escuchar en `0.0.0.0` (interfaces públicas). Ahora, se configuran para "bindearse" (enlazar) exclusivamente a la interfaz de la Mesh VPN (ej. `tailscale0`, `nebula1` o `zt0`).

A nivel de cortafuegos (`nftables`), la política por defecto para las interfaces públicas será de denegación total (DROP), abriendo únicamente el puerto UDP necesario para el tráfico cifrado de la malla (o confiando en el *Hole Punching* para conexiones salientes). Esto reduce la superficie de ataque perimetral prácticamente a cero, permitiendo construir una infraestructura *Zero Trust* donde la seguridad no depende de dónde esté ubicado el servidor, sino de su identidad criptográfica verificada.

## 6.4. Enrutamiento avanzado entre VPCs y redes locales

Hasta ahora, hemos abordado la interconexión de servidores bajo el paradigma *Zero Trust*, asumiendo que podemos instalar un agente de red de malla (como Tailscale o Nebula) o configurar WireGuard en cada uno de los nodos. Sin embargo, en el mundo real de la administración de sistemas, esto no siempre es posible.

¿Qué ocurre cuando necesitamos acceder a una base de datos gestionada (PaaS) que solo tiene IP privada en la VPC del proveedor? ¿O cuando queremos conectar nuestra infraestructura en la nube con la red de la oficina local, donde residen impresoras corporativas, dispositivos IoT o servidores *legacy* en los que no podemos instalar software de VPN?

Para resolver estos escenarios, debemos abandonar el enfoque de "agente por nodo" y evolucionar hacia el enrutamiento a nivel de subred (Site-to-Site) y el uso de pasarelas de red (Gateways).

### 1. El Patrón "Subnet Router" (Enrutador de Subred)

El concepto de Subnet Router consiste en designar un VPS que sí pertenece a nuestra red superpuesta (Overlay) para que actúe como un puente o pasarela hacia una red física o virtual subyacente (Underlay) a la que está conectado de forma nativa.

Imagina que tienes una VPC en AWS con la subred `172.16.0.0/16`. Dentro de ella hay una base de datos RDS en la `172.16.0.5` que no soporta la instalación de agentes VPN.

```text
[ Enrutamiento hacia una Subred Interna sin Agentes ]

   Laptop SysAdmin                             VPS Pasarela (Subnet Router)
 (Overlay: 10.0.0.5)                              (Overlay: 10.0.0.10)
         |                                                 |
         +------------------- TÚNEL VPN -------------------+
                                                           |
                                                           | (VPC Nativa: 172.16.0.10)
                                                           v
                                              +-------------------------+
                                              | Red Privada AWS (VPC)   |
                                              | Subred: 172.16.0.0/16   |
                                              |                         |
                                              |  [ DB Gestionada ]      |
                                              |  (IP: 172.16.0.5)       |
                                              +-------------------------+

```

Para que la laptop del SysAdmin pueda hacer `psql -h 172.16.0.5`, el tráfico viaja cifrado por el túnel hasta el VPS Pasarela. Al llegar allí, el kernel de Linux del VPS debe tomar el paquete y reenviarlo hacia la red nativa de AWS.

**La fontanería del Kernel (SysAdmin Core):**
Para que este patrón funcione, herramientas como Tailscale automatizan el proceso, pero si lo construyes con WireGuard puro, debes habilitar explícitamente el reenvío de paquetes en el kernel de la pasarela:

```bash
# Habilitar IP Forwarding en el VPS Pasarela (temporal)
sysctl -w net.ipv4.ip_forward=1

# Hacerlo persistente tras reinicios
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-ipforward.conf
sysctl -p /etc/sysctl.d/99-ipforward.conf

```

Además, a menos que el router principal de la VPC de AWS sepa que el tráfico de retorno hacia la `10.0.0.0/24` (la VPN) debe ir hacia tu VPS, los paquetes se perderán. Para evitar tocar las tablas de enrutamiento del proveedor cloud, la técnica más común es aplicar **NAT (Masquerading)** en el VPS pasarela mediante `nftables`. De este modo, la base de datos creerá que quien le habla es el propio VPS, y no la laptop del SysAdmin.

```nftables
# Fragmento de nftables en el Subnet Router
table ip nat {
    chain postrouting {
        type nat hook postrouting priority 100; policy accept;
        # Enmascarar tráfico que sale hacia la interfaz de la VPC (ej. eth1)
        # proveniente de la interfaz VPN (wg0)
        iifname "wg0" oifname "eth1" masquerade
    }
}

```

### 2. Site-to-Site VPN: Conectando la Nube con la Red Local (On-Premise)

Cuando el objetivo no es solo que un administrador acceda a la nube, sino que dos redes completas (por ejemplo, los servidores de la oficina en la subred `192.168.1.0/24` y los VPS en la VPC `10.10.0.0/16`) se vean mutuamente de forma transparente, hablamos de un enrutamiento *Site-to-Site*.

Históricamente, esto era dominio absoluto de IPsec (usando demonios como StrongSwan). Aunque IPsec sigue siendo el estándar en *appliances* empresariales (como firewalls Fortinet o Cisco), WireGuard ha irrumpido con fuerza por su menor latencia y configuración radicalmente más sencilla.

Para establecer un Site-to-Site con WireGuard:

1. Se despliega un VPS pasarela en la nube y un servidor/router pasarela en la oficina (por ejemplo, un pfSense, OPNsense o un simple Linux con WireGuard).
2. Se establece el túnel P2P entre ellos.
3. Se configuran las directivas `AllowedIPs` para incluir no solo la IP del par, sino toda la subred detrás de él.

```ini
# Configuración en el Router de la Oficina
[Peer]
PublicKey = <Clave_VPS_Nube>
# Se permite el tráfico destinado a la VPC remota
AllowedIPs = 10.10.0.0/16
Endpoint = ip_publica_nube:51820

```

El paso final, y el más crítico en un entorno Site-to-Site, es actualizar la **ruta estática** en el router principal de la oficina (el que da internet). Se debe agregar una regla que dicte: *"Todo tráfico destinado a 10.10.0.0/16 debe enviarse a la IP del nodo WireGuard local"*. Así, cualquier empleado de la oficina podrá acceder a la nube sin instalar nada en su ordenador.

### 3. Enrutamiento Dinámico (BGP) sobre Redes Cifradas

A medida que la empresa crece hacia estrategias Multi-Cloud (ej. AWS + Hetzner + Oficina Local), mantener tablas de enrutamiento estáticas y direcciones IP permitidas (`AllowedIPs`) se vuelve inmanejable y propenso a caídas en caso de que una pasarela falle.

Aquí es donde los SysAdmins avanzados combinan las redes superpuestas con protocolos de nivel empresarial como **BGP (Border Gateway Protocol)**.

Al instalar un demonio de enrutamiento como **FRRouting (FRR)** o **BIRD** sobre las interfaces virtuales de WireGuard/ZeroTier, los nodos pasarela de cada proveedor comienzan a "anunciar" dinámicamente qué subredes tienen detrás.

* **Si un enlace se cae:** BGP recalcula automáticamente la ruta y puede desviar el tráfico a través de una tercera nube como puente.
* **Si se añade una nueva subred:** BGP propaga la nueva tabla de enrutamiento a todos los nodos en segundos, sin necesidad de que el SysAdmin toque las configuraciones de WireGuard o el firewall de cada VPS.

### Conclusión del Capítulo

La transición desde instancias aisladas hablando a través de la hostil internet pública (6.1) hasta la implementación de una red de malla global e invisible (6.3) con capacidades de enrutamiento hacia redes heredadas (6.4), transforma por completo la postura de seguridad de la infraestructura.

Con los cimientos de la comunicación interna ya securizados, aislados y altamente escalables, estamos listos para abordar el siguiente gran reto arquitectónico: garantizar que los servicios que viajan por estas redes no se caigan jamás. Esto nos lleva directamente al **Capítulo 7: Alta Disponibilidad (HA) y Balanceo de Carga**.
