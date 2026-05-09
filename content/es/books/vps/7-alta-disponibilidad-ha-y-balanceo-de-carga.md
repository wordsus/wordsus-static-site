En el mundo de la administración de sistemas, la estabilidad no es un lujo, sino un requisito. Este capítulo aborda la transición crítica de gestionar instancias aisladas a construir infraestructuras resilientes capaces de sobrevivir a fallos de hardware, red o software.

Exploraremos los fundamentos de la **Alta Disponibilidad (HA)**, analizando los modelos Activo-Activo y Activo-Pasivo. Aprenderás a implementar **IPs Virtuales** y mecanismos de **failover automático** con herramientas como Keepalived y Corosync para eliminar puntos únicos de fallo. Finalmente, dominaremos el **balanceo de carga** en las capas 4 y 7 con HAProxy, Nginx y Traefik, garantizando un tráfico fluido y escalable.

## 7.1. Modelos de arquitectura HA (Activo-Activo vs. Activo-Pasivo)

Hasta este punto en la evolución de nuestra infraestructura, hemos asegurado, automatizado y conectado nuestras instancias VPS mediante redes superpuestas. Sin embargo, un VPS individual, por muy optimizado que esté, representa un punto único de fallo (SPOF - *Single Point of Failure*). La Alta Disponibilidad (HA, por sus siglas en inglés) es el paradigma que nos permite diseñar sistemas que soporten la caída de uno o varios componentes sin interrumpir el servicio, acercándonos a los codiciados "nueve" de disponibilidad (ej. 99.99% de uptime).

Para lograr esto en un entorno de servidores virtuales, debemos abandonar la mentalidad de "servidor mascota" (donde cuidamos de una instancia única) y adoptar arquitecturas redundantes. Existen dos modelos fundamentales para estructurar esta redundancia: **Activo-Pasivo** y **Activo-Activo**.

---

### Modelo Activo-Pasivo (Active-Passive)

En una arquitectura Activo-Pasivo, al menos dos nodos (VPS) se despliegan para un mismo servicio, pero solo uno de ellos (el nodo Activo o *Primary*) recibe y procesa el tráfico de los clientes en un momento dado. El segundo nodo (el Pasivo, *Standby* o *Replica*) se mantiene en un estado de espera, monitoreando constantemente la salud del nodo activo.

Si el nodo activo falla debido a un kernel panic, un corte de red del proveedor o un fallo de hardware subyacente del hipervisor, el nodo pasivo detecta esta ausencia y asume el rol activo (proceso conocido como *Failover*).

**Arquitectura Conceptual:**

```text
      [ Tráfico del Cliente ]
                 |
                 v
          ( IP Virtual ) <--- [Gestionada en Capa 3/4]
                 |
      +----------+----------+
      |                     |
      v                     v
[ NODO ACTIVO ]       [ NODO PASIVO ]
(Procesa tráfico)     (Monitorea al Activo)
      |                     |
      +---(Replicación)-----+
          (ej. Streaming)

```

**Consideraciones clave para SysAdmins:**

* **Gestión del Estado:** Es el modelo por excelencia para servicios *Stateful* (que guardan estado), como bases de datos relacionales (PostgreSQL, MySQL). El nodo activo escribe en disco y replica los datos al pasivo de forma síncrona o asíncrona. Al haber solo un nodo escribiendo, se evitan colisiones de datos.
* **Eficiencia de Recursos:** Su principal desventaja es el desperdicio de recursos computacionales. En un clúster de dos nodos, el 50% de tu capacidad de cómputo está inactiva, esperando un desastre.
* **Tiempo de Inactividad (RTO):** El failover no es instantáneo. Dependiendo de los *timeouts* configurados en las herramientas de monitoreo del clúster, el servicio experimentará una breve interrupción (generalmente de unos pocos segundos) mientras el nodo pasivo asume la carga.
* **Riesgo de Split-Brain:** Si la conexión de red entre el nodo activo y pasivo se rompe (pero ambos siguen funcionando), el pasivo podría creer que el activo murió y promoverse a sí mismo. Esto resulta en dos nodos intentando escribir datos simultáneamente. Se requiere un mecanismo de "fencing" o un nodo árbitro (Quorum) para prevenir la corrupción de datos.

---

### Modelo Activo-Activo (Active-Active)

En la arquitectura Activo-Activo, todos los nodos del clúster están en funcionamiento y procesando tráfico simultáneamente. Ningún VPS está ocioso. Las solicitudes de los clientes se distribuyen entre los nodos disponibles utilizando mecanismos de enrutamiento o balanceo de carga.

Si un nodo falla, el sistema simplemente deja de enviarle tráfico y redistribuye la carga entre los nodos supervivientes.

**Arquitectura Conceptual:**

```text
      [ Tráfico del Cliente ]
                 |
                 v
       [ Balanceador de Carga ] <--- [Capa 4 o Capa 7]
                 |
      +----------+----------+
      |                     |
      v                     v
[ NODO ACTIVO 1 ]     [ NODO ACTIVO 2 ]
(Procesa tráfico)     (Procesa tráfico)
      |                     |
      +--(Estado Externo)---+
         (ej. Redis, S3)

```

**Consideraciones clave para SysAdmins:**

* **Aprovechamiento de Recursos:** Es altamente eficiente. Si tienes dos VPS, ambos están trabajando, lo que significa que el 100% de tu inversión en infraestructura está generando valor.
* **Escalabilidad Horizontal:** Este modelo facilita enormemente escalar el sistema. Si la carga aumenta, simplemente despliegas un "Nodo Activo 3" y lo añades al balanceador.
* **El desafío del Estado (Stateless):** Para que este modelo funcione correctamente de forma nativa, las aplicaciones que corren en los VPS deben ser *Stateless* (sin estado). Por ejemplo, un servidor web (Nginx) sirviendo un frontend estático, o una API RESTful que no guarda sesiones en memoria local.
* **Manejo de Sesiones:** Si un usuario hace login en el Nodo 1, y su siguiente petición HTTP cae en el Nodo 2, este último no sabrá quién es. Para resolver esto en un modelo Activo-Activo, los administradores deben extraer el estado del VPS y llevarlo a un almacén centralizado de alta velocidad (como un clúster de Redis o Memcached) o forzar la "persistencia de sesión" (Sticky Sessions) en el balanceador de carga, aunque esto último resta flexibilidad.

---

### Resumen Comparativo de Arquitecturas

Para tomar decisiones arquitectónicas rápidas durante el diseño de la infraestructura, utiliza la siguiente referencia cruzada:

| Característica | Activo-Pasivo | Activo-Activo |
| --- | --- | --- |
| **Utilización de recursos** | Subóptima (nodos inactivos por diseño). | Óptima (todos los nodos procesan carga). |
| **Complejidad de despliegue** | Moderada (requiere gestión estricta del failover). | Alta (requiere externalizar el estado de la app). |
| **Impacto ante fallos** | Breve caída del servicio durante la transición. | Transparente para el usuario (Cero downtime real). |
| **Riesgo de colisión de datos** | Alto en escenarios de *Split-Brain*. | Bajo (asumiendo backend de datos centralizado). |
| **Casos de uso típicos** | Bases de datos relacionales, servidores de archivos, aplicaciones heredadas (Legacy). | Servidores web, microservicios, APIs, balanceadores de carga frontales. |

En la práctica de un entorno VPS moderno, rara vez usarás un solo modelo. Una infraestructura madura emplea una topología mixta: una capa frontal de servidores web en Activo-Activo (balanceada) que se comunica con un backend de base de datos configurado en Activo-Pasivo para garantizar la integridad transaccional. En las siguientes secciones exploraremos cómo enrutar el tráfico hacia estas arquitecturas, comenzando por la manipulación de IPs a nivel de red.

## 7.2. Implementación de Floating IPs / IPs Virtuales (VIP)

Una vez definidos los modelos Activo-Activo y Activo-Pasivo, surge una pregunta crítica: ¿Cómo sabe el cliente a qué dirección IP debe conectarse si los servidores pueden fallar? La respuesta es la **IP Virtual (VIP)**.

Una VIP es una dirección IP que no está ligada permanentemente a una interfaz de red física o a una instancia específica. En su lugar, "flota" entre los nodos del clúster. Para el mundo exterior, la infraestructura tiene una única cara; internamente, los nodos negocian quién es el dueño de esa cara en cada momento.

### Mecanismos de implementación: ARP vs. API Cloud

Dependiendo de dónde residan tus VPS, el mecanismo para mover la IP varía drásticamente:

1. **Entornos Tradicionales / Bare Metal (Gratuitous ARP):**
En una red local o VLAN privada, el nodo que asume el rol activo envía un paquete *Gratuitous ARP* (GARP) indicando al switch: "Yo soy el dueño de la VIP, actualiza tu tabla de direcciones MAC".
2. **Entornos Cloud (Reasignación vía API):**
En la mayoría de los proveedores cloud (AWS, DigitalOcean, Hetzner), la red está virtualizada y no permite ARP arbitrario por razones de seguridad. Aquí, el proceso de failover implica que el nodo pasivo detecte la caída y realice una llamada a la **API del proveedor** para "atraer" la Floating IP hacia su interfaz virtual.

### Protocolo VRRP (Virtual Router Redundancy Protocol)

El estándar *de facto* para gestionar VIPs es el protocolo **VRRP**. Funciona mediante el envío de paquetes de "latido" (heartbeats) por parte del nodo Maestro. Si el nodo Backup deja de recibir estos paquetes, asume que el Maestro ha caído y reclama la IP.

**Diagrama de Flujo de Failover:**

```text
ESTADO INICIAL:
[ Cliente ] ---> [ VIP: 1.2.3.4 ] ---> [ VPS-01 (Master) ]
                                       [ VPS-02 (Backup) - IDLE ]

EVENTO: VPS-01 pierde conectividad o falla el servicio.

ESTADO FINAL:
[ Cliente ] ---> [ VIP: 1.2.3.4 ] ---> [ VPS-01 (DOWN) ]
                       |
                       +------------> [ VPS-02 (Nuevo Master) ]

```

### Configuración con Keepalived

`Keepalived` es la herramienta de espacio de usuario más común para implementar VRRP en Linux. A continuación, se muestra una configuración básica para un escenario Activo-Pasivo.

**En el Nodo Maestro (VPS-01):**

```bash
# /etc/keepalived/keepalived.conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100        # Mayor prioridad gana el rol Master
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass secret_password
    }
    virtual_ipaddress {
        203.0.113.10/24  # Esta es nuestra VIP
    }
}

```

**En el Nodo de Respaldo (VPS-02):**

```bash
# /etc/keepalived/keepalived.conf
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 50         # Menor prioridad que el Maestro
    ...
}

```

### El "Health Check": Evitando el failover falso

No basta con que el servidor esté encendido; el servicio (ej. Nginx o PostgreSQL) debe estar respondiendo. `Keepalived` permite definir scripts de verificación:

```bash
vrrp_script check_nginx {
    script "pidof nginx"
    interval 2
    weight -20 # Si falla, resta 20 de prioridad
}

```

Si Nginx cae en el Maestro, su prioridad baja de 100 a 80. Si el Backup tiene prioridad 90, este último tomará el control inmediatamente, garantizando que la VIP siempre apunte a un servicio funcional.

## 7.3. Failover automático y gestión de estado con Keepalived / Corosync

El failover automático no es simplemente mover una IP; es asegurar que el estado del sistema sea consistente. El mayor peligro en un entorno distribuido es el **Split-Brain** (cerebro dividido), donde dos nodos creen ser los maestros y escriben datos simultáneamente, corrompiendo bases de datos o sistemas de archivos compartidos.

### 1. Keepalived: Failover ligero mediante VRRP

Como vimos, Keepalived utiliza el protocolo VRRP para gestionar la IP Virtual. Sin embargo, su verdadera potencia para el failover automático reside en su capacidad de ejecutar **scripts de seguimiento** (*track scripts*).

En un entorno VPS, no basta con saber si el servidor responde a un `ping`. Debemos monitorizar la salud de la aplicación. Si el servicio (ej. Nginx o HAProxy) falla, Keepalived debe reducir la prioridad del nodo para forzar el failover.

```bash
# Ejemplo de configuración de chequeo en Keepalived
vrrp_script check_app_health {
    script "/usr/local/bin/check_service_status.sh"
    interval 2      # Chequeo cada 2 segundos
    weight -25      # Si el script falla (exit != 0), resta 25 de prioridad
    fall 3          # Requiere 3 fallos consecutivos para actuar
    rise 2          # Requiere 2 éxitos para recuperarse
}

vrrp_instance VI_1 {
    ...
    track_script {
        check_app_health
    }
}

```

### 2. Corosync y Pacemaker: El estándar para clústeres complejos

Cuando la infraestructura requiere gestionar múltiples recursos dependientes (ej. una IP, un volumen de bloques montado y un servicio de base de datos), Keepalived se queda corto. Aquí entra el *stack* de alta disponibilidad profesional:

* **Corosync:** Es la capa de mensajería y pertenencia. Su función es que todos los nodos del clúster estén de acuerdo en quién está vivo y quién ha muerto. Utiliza el protocolo Totem para mantener un anillo de comunicación constante.
* **Pacemaker:** Es el gestor de recursos. Decide en qué nodo debe correr cada servicio basándose en reglas de puntuación y restricciones (*constraints*).

### 3. El Principio de Quorum y la "Regla del 50% + 1"

Para evitar el Split-Brain, Corosync utiliza el concepto de **Quorum**. Un clúster tiene quorum cuando la mayoría de los nodos (más de la mitad) están comunicados entre sí.

* En un clúster de **2 nodos**, si se pierde la red entre ellos, ninguno tiene mayoría. Aquí es obligatorio usar un "dispositivo de quorum" externo o una configuración especial para evitar que ambos se apaguen.
* En un clúster de **3 nodos**, si uno cae, los otros dos mantienen el quorum (2/3 > 50%) y el servicio continúa.

### 4. Fencing (STONITH): La última línea de defensa

¿Qué sucede si un nodo deja de responder pero sigue escribiendo en el almacenamiento compartido? Esto es catastrófico. La solución es **STONITH** (*Shoot The Other Node In The Head*).

Cuando Pacemaker detecta que un nodo no responde, antes de iniciar sus servicios en otro servidor, utiliza un mecanismo de *fencing* para forzar el apagado del nodo sospechoso. En proveedores cloud, esto se hace llamando a la API del proveedor para apagar o reiniciar la instancia VPS de forma fulminante.

```text
JERARQUÍA DE UN CLÚSTER HA:
+------------------------------------------+
|       Recursos (IP, DB, Storage)         | <-- Gestionado por Pacemaker
+------------------------------------------+
|       Lógica de Decisión (CRM)           | <-- Pacemaker (Cerebro)
+------------------------------------------+
|    Comunicación y Quorum (Totem)         | <-- Corosync (Corazón)
+------------------------------------------+
|         Infraestructura (VPS)            |
+------------------------------------------+

```

Con la implementación de VIPs y el failover automatizado, hemos resuelto la tolerancia a fallos en la capa de red y recursos físicos. Sin embargo, para escalar horizontalmente y aprovechar el modelo **Activo-Activo**, necesitamos una pieza clave: el **Balanceador de Carga** (Load Balancer).

El balanceador se sitúa detrás de tu IP Virtual y actúa como el "director de orquesta" del tráfico, recibiendo las peticiones de los clientes y distribuyéndolas equitativamente entre los VPS disponibles. Para un SysAdmin, la decisión arquitectónica más importante aquí es en qué capa del modelo OSI operará este balanceador: **Capa 4 (Transporte)** o **Capa 7 (Aplicación)**.

## 7.4. Balanceo de carga en Capa 4 y Capa 7 (HAProxy, Nginx, Traefik)

La diferencia fundamental entre ambas capas radica en la "inteligencia" o profundidad con la que el balanceador inspecciona el tráfico antes de tomar una decisión de enrutamiento.

### Balanceo en Capa 4 (Capa de Transporte)

En la Capa 4, el balanceador toma decisiones basándose exclusivamente en información de red a nivel de transporte: **Dirección IP origen/destino y Puerto TCP/UDP**. No sabe absolutamente nada sobre el contenido del paquete.

* **Cómo funciona:** Cuando llega una conexión TCP, el balanceador simplemente selecciona un servidor backend (usualmente mediante un algoritmo como *Round-Robin* o *Least-Connections*) y reenvía los paquetes mediante NAT (Network Address Translation).
* **Ventajas:** Es extremadamente rápido y consume muy pocos recursos de CPU y memoria. Además, es **agnóstico al protocolo**, lo que significa que puedes balancear tráfico de bases de datos (PostgreSQL, MySQL), servidores de correo (SMTP, IMAP) o cualquier protocolo custom sobre TCP/UDP.
* **Desventajas:** Es "ciego". No puede enrutar tráfico basándose en la URL que solicita el usuario, ni leer cookies para mantener sesiones.

**El estándar de la industria: HAProxy**
Aunque Nginx puede hacer balanceo L4, `HAProxy` es el rey indiscutible para este propósito. Es capaz de manejar millones de conexiones simultáneas con un footprint mínimo.

*Ejemplo de configuración de HAProxy (L4) para un clúster de base de datos:*

```haproxy
# /etc/haproxy/haproxy.cfg
listen clúster_postgres
    bind *:5432
    mode tcp               # <-- Clave: Operamos en Capa 4
    option tcplog
    balance leastconn      # Envía tráfico al nodo con menos conexiones activas
    server db-nodo-01 10.0.1.10:5432 check port 5432 inter 2000 fall 3 rise 2
    server db-nodo-02 10.0.1.11:5432 check port 5432 inter 2000 fall 3 rise 2

```

### Balanceo en Capa 7 (Capa de Aplicación)

En la Capa 7, el balanceador interactúa a nivel de protocolo de aplicación (generalmente HTTP/HTTPS). Aquí, el balanceador termina la conexión TCP del cliente, **desencripta el tráfico SSL/TLS**, lee las cabeceras HTTP (URLs, cookies, User-Agent), toma una decisión de enrutamiento inteligente, y luego abre una nueva conexión hacia el servidor backend elegido.

* **Cómo funciona:** Permite enrutamiento avanzado. Por ejemplo: si la petición es a `midominio.com/api/`, envíala a los VPS del backend; si es a `midominio.com/images/`, envíala a los VPS de almacenamiento estático.
* **Ventajas:** Permite "Sticky Sessions" (persistencia basada en cookies), terminación SSL centralizada (gestionas los certificados solo en el balanceador) y enrutamiento basado en contenido.
* **Desventajas:** Es más costoso a nivel computacional debido a la desencriptación TLS y al análisis de cadenas de texto (headers).

**Las herramientas: Nginx y Traefik**

* **Nginx:** Es el balanceador L7 tradicional más utilizado. Su configuración es estática y muy robusta.
* **Traefik:** Es un proxy inverso y balanceador de carga moderno, diseñado específicamente para la era de los contenedores y el cloud. Su gran ventaja es el **descubrimiento dinámico**: no necesitas recargar su configuración; si levantas un nuevo VPS o contenedor, Traefik lo detecta a través de la API (de Docker, Kubernetes, o Consul) y lo añade al balanceo instantáneamente.

*Ejemplo de configuración de Nginx (L7) enrutando por URL:*

```nginx
# /etc/nginx/nginx.conf
upstream servidores_api {
    server 10.0.2.10:8080;
    server 10.0.2.11:8080;
}

upstream servidores_frontend {
    server 10.0.3.10:80;
}

server {
    listen 443 ssl;
    server_name app.midominio.com;
    
    # Certificados gestionados aquí (Terminación SSL)
    ssl_certificate /etc/letsencrypt/live/midominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/midominio.com/privkey.pem;

    # Enrutamiento Capa 7: Por ruta (Path)
    location /api/ {
        proxy_pass http://servidores_api;
    }

    location / {
        proxy_pass http://servidores_frontend;
    }
}

```

### Resumen Estratégico para el SysAdmin

En una infraestructura madura de VPS, a menudo se utilizan **ambos modelos de forma escalonada**. Una arquitectura típica coloca un par de nodos HAProxy (con una VIP) en el borde perimetral operando en Capa 4 pura para absorber ataques DDoS y balancear a nivel TCP bruto hacia una capa interna de nodos Traefik/Nginx, los cuales operan en Capa 7 para hacer la terminación SSL y el enrutamiento inteligente de microservicios.
