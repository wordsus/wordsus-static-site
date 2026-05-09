La arquitectura de un sistema basado en HTTP no termina en el código de la aplicación; se define en la red. En este capítulo, exploramos los componentes que garantizan la disponibilidad, escalabilidad y seguridad del tráfico. Analizaremos la dualidad entre **proxies directos e inversos**, y profundizaremos en el **balanceo de carga**, diferenciando la eficiencia del nivel de transporte (**Capa 4**) frente a la inteligencia semántica de la **Capa 7**.

Abordaremos la transición hacia entornos **Cloud Native** mediante el uso de **Ingress Controllers** en Kubernetes y cerraremos con la optimización global que ofrecen las **CDNs**, el enrutamiento **Anycast** y el **Edge Computing**.

## 7.1. Proxies Inversos vs. Proxies Directos (Forward Proxies)
En el ecosistema HTTP, un *proxy* es fundamentalmente un intermediario que facilita, intercepta o modifica la comunicación entre un cliente y un servidor. Sin embargo, desde la perspectiva de la administración de sistemas y la arquitectura de red, la ubicación y el propósito de este intermediario cambian drásticamente su naturaleza. La diferencia principal radica en una sola pregunta: **¿A quién representa el proxy?**

Para dominar el enrutamiento HTTP, es imperativo distinguir claramente entre los dos modelos principales: el Proxy Directo (Forward Proxy) y el Proxy Inverso (Reverse Proxy).

---

### El Proxy Directo (Forward Proxy): El Escudo del Cliente
Un proxy directo representa a uno o más **clientes**. Se sitúa en el borde de la red interna de los clientes y actúa como su intermediario para acceder a recursos externos (generalmente, Internet). Cuando un cliente interno desea acceder a un sitio web, la solicitud no va directamente al destino, sino que se envía al proxy directo, el cual la evalúa, la reenvía al exterior, recibe la respuesta y la devuelve al cliente original.

#### Flujo de tráfico típico:
```text
[ Red Interna (LAN) ]                                  [ Red Externa (WAN) ]
                                                              
+-------------+                                              +-------------+
| Cliente (A) |-\                                            | Servidor X  |
+-------------+  \   +-------------------+                   +-------------+
                  -> |                   | --- (Internet) -> 
+-------------+  /   |   PROXY DIRECTO   |                   +-------------+
| Cliente (B) |-/    |                   | <- (Internet) --- | Servidor Y  |
+-------------+      +-------------------+                   +-------------+

```

#### Casos de uso operativos (Perspectiva Sysadmin):
* **Control de Egress (Salida) y Filtrado:** Es el uso corporativo por excelencia. Permite restringir a qué dominios o IPs externas pueden acceder los servidores o empleados de una red interna, bloqueando malware o sitios no autorizados.
* **Anonimato y Enmascaramiento de IP:** Para los servidores externos (X e Y en el diagrama), todas las peticiones parecen provenir de la dirección IP pública del Proxy Directo. El destino no tiene conocimiento de los clientes A o B (a menos que se filtren datos a nivel de aplicación).
* **Caché de reenvío (Forward Caching):** Como se vio en el Capítulo 3, un proxy directo puede almacenar en caché recursos estáticos solicitados frecuentemente por múltiples clientes internos, ahorrando ancho de banda de salida.
* **Intercepción Transparente vs. Explícita:** Los clientes pueden estar configurados explícitamente a nivel de sistema operativo/navegador para usar el proxy (ej. mediante un archivo PAC), o el proxy puede operar de forma transparente a nivel de red (usando reglas de `iptables` o PBR para forzar el tráfico HTTP/HTTPS a través del proxy sin que el cliente lo sepa).

---

### El Proxy Inverso (Reverse Proxy): El Escudo del Servidor
Un proxy inverso representa a uno o más **servidores**. Se sitúa frente a la infraestructura de backend y actúa como la única cara pública visible para el mundo exterior. Cuando un cliente en Internet solicita un recurso, la solicitud llega al proxy inverso. El cliente cree firmemente que se está comunicando con el servidor final. El proxy inverso decide a qué servidor interno enviarle la carga, recoge la respuesta y se la entrega al cliente.

#### Flujo de tráfico típico:
```text
[ Red Externa (WAN) ]                                  [ Red Interna (DMZ/LAN) ]

+-------------+                                              +---------------+
| Cliente (1) |-\                                            | Backend Web A |
+-------------+  \   +-------------------+                   +---------------+
                  -> |                   | --- (Enruta) ---> 
+-------------+  /   |   PROXY INVERSO   |                   +---------------+
| Cliente (2) |-/    |                   | <--- (Recibe) --- | Backend Web B |
+-------------+      +-------------------+                   +---------------+

```

#### Casos de uso operativos (Perspectiva Sysadmin):
* **Punto Único de Entrada (Single Point of Entry):** Oculta la topología interna de la red. Los clientes externos no necesitan (ni deben) conocer las IPs privadas ni los puertos de los servidores backend.
* **Descarga de trabajo (Offloading):** El proxy inverso asume tareas pesadas como la Terminación TLS (ver *Sección 5.2*) o la compresión de respuestas, liberando CPU en los servidores de aplicación.
* **Enrutamiento Avanzado (L7):** Permite dirigir tráfico basándose en el path (`/api` va al Backend A, `/blog` va al Backend B) o en los encabezados, sentando las bases para el balanceo de carga (que exploraremos a fondo en la *Sección 7.2*).
* **Conservación de la IP de origen:** Dado que el proxy inverso termina la conexión TCP del cliente y abre una nueva hacia el backend, el backend solo verá la IP del proxy. Es aquí donde la correcta configuración de cabeceras como `X-Forwarded-For` o `X-Real-IP` (discutidas en la *Sección 2.5*) se vuelve una tarea crítica de administración.

---

### Comparativa Arquitectónica
Para consolidar la diferencia, la siguiente tabla resume los atributos clave desde una óptica de infraestructura:

| Característica | Proxy Directo (Forward) | Proxy Inverso (Reverse) |
| --- | --- | --- |
| **A quién protege/oculta** | A los **clientes** de la red local. | A los **servidores** (aplicaciones backend). |
| **Ubicación en red** | Salida (Egress) de la red interna. | Entrada (Ingress) de la red interna. |
| **Conocimiento del cliente** | Usualmente sabe que está usando un proxy. | Completamente inconsciente; cree que el proxy es el servidor. |
| **Resolución DNS** | El proxy resuelve el DNS del destino en Internet. | El cliente resuelve el DNS público que apunta al proxy inverso. |
| **Software representativo** | Squid, Dante, HAProxy (modo forward), Envoy. | Nginx, HAProxy, Traefik, Apache HTTPD, Envoy. |

### Diferencias Prácticas en Configuración
Para un administrador, la diferencia conceptual se traduce directamente en cómo se configuran las herramientas.

Un **Proxy Directo** (ej. usando *Squid*) se enfoca en listas de control de acceso (ACLs) sobre quién puede salir y a dónde:

```squid
# Ejemplo conceptual Squid (Forward Proxy)
acl red_interna src 192.168.1.0/24
acl sitios_permitidos dstdomain .ubuntu.com .docker.com

# Solo permite a la red interna acceder a los sitios permitidos
http_access allow red_interna sitios_permitidos
http_access deny all

```

Un **Proxy Inverso** (ej. usando *Nginx*) se enfoca en escuchar en un puerto público y mapear las rutas entrantes hacia destinos internos conocidos (Upstreams):

```nginx
# Ejemplo conceptual Nginx (Reverse Proxy)
server {
    listen 80;
    server_name api.miempresa.com;

    location / {
        # El proxy delega la petición a un backend privado
        proxy_pass http://10.0.0.50:8080;
        
        # Mantenimiento de la transparencia de los metadatos (Sección 2.5)
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

```

Comprender esta dicotomía es el primer paso antes de abordar topologías más complejas, como el balanceo de carga o la gestión de tráfico nativa de la nube mediante Ingress Controllers.

## 7.2. Balanceo de Carga a nivel de Capa 7 (Application Layer) vs. Capa 4
Una vez establecido el proxy inverso como el punto único de entrada (como vimos en la *Sección 7.1*), el siguiente desafío operativo es distribuir el tráfico entrante de manera eficiente entre múltiples servidores backend. Aquí es donde entra en juego el balanceo de carga.

Para un administrador de sistemas, la decisión arquitectónica más crítica en este punto es determinar el nivel de profundidad con el que el balanceador inspeccionará el tráfico. Esta decisión se enmarca en el Modelo OSI, dividiendo las estrategias principalmente en dos niveles: **Capa 4 (Transporte)** y **Capa 7 (Aplicación)**.

---

### Balanceo de Carga en Capa 4 (Transport Layer)
El balanceo en Capa 4 opera a nivel de red y transporte, trabajando exclusivamente con los protocolos TCP y UDP. Un balanceador L4 toma decisiones de enrutamiento basándose únicamente en la información superficial del paquete: **IP de origen, IP de destino, Puerto de origen y Puerto de destino**.

Al operar en esta capa, el balanceador es completamente "ciego" al contenido del tráfico. No sabe si está transportando HTTP, gRPC, SSH o consultas a una base de datos.

#### Características Operativas (Capa 4):
* **Velocidad y Baja Latencia:** Al no inspeccionar ni decodificar el payload, consume muy poca CPU y memoria. Las decisiones se toman a la velocidad de la red (frecuentemente a nivel de kernel, como hace IPVS o el enrutamiento DSR - Direct Server Return).
* **Transparencia TLS (Passthrough):** Como vimos en la *Sección 5.2*, un balanceador L4 puede enrutar tráfico HTTPS (`puerto 443`) sin necesidad de poseer los certificados. Simplemente reenvía los flujos de bytes encriptados, y es el backend quien realiza el *Handshake* TLS.
* **Limitaciones de Enrutamiento:** No puede tomar decisiones basadas en la URL solicitada, el idioma del navegador o las cookies. Todo el tráfico que llega a un puerto específico se distribuye según algoritmos matemáticos (Round Robin, Least Connections, Source IP Hash).

#### Diagrama de Flujo (L4):
```text
[Cliente: 198.51.100.10:45678] 
             |
      (TCP SYN) -> Destino: 203.0.113.5:80
             v
+-----------------------------+
|    BALANCEADOR CAPA 4       | -> ¿Qué puerto es? (80)
|  (Lee IP y Puerto, no lee   | -> ¿Qué backend toca? (Algoritmo: Round Robin)
|   el mensaje HTTP)          | -> Reenvía el paquete TCP íntegro.
+-----------------------------+
             |
    +--------+--------+
    v                 v
[Backend A]       [Backend B]
10.0.0.1:80       10.0.0.2:80

```

---

### Balanceo de Carga en Capa 7 (Application Layer)
El balanceo en Capa 7 (a menudo llamado *Application Load Balancing* o *HTTP Routing*) es el verdadero dominio de esta guía. Aquí, el balanceador no solo enruta paquetes de red, sino que **entiende el protocolo HTTP**.

Para que esto funcione, el balanceador debe terminar la conexión TCP del cliente, realizar el *Offloading* TLS (descifrar el tráfico), leer las cabeceras HTTP (ver *Capítulo 2*), tomar una decisión y luego abrir una nueva conexión TCP hacia el backend elegido.

#### Características Operativas (Capa 7):
* **Enrutamiento Inteligente (Content-Based Routing):** Permite dirigir peticiones a diferentes clústeres basándose en la URL (ej. `/api/*` va a servidores Node.js, `/images/*` va a servidores Nginx estáticos), cabeceras específicas (`Host`, `User-Agent`) o parámetros de query.
* **Persistencia de Sesión Avanzada (Sticky Sessions):** Mientras que en L4 la persistencia solo puede hacerse por IP (lo cual falla si los clientes están detrás de un NAT corporativo), en L7 se puede inyectar o leer una cookie de sesión (ver *Sección 2.4*) para garantizar que un cliente siempre vuelva al mismo backend.
* **Modificación al Vuelo:** El balanceador puede reescribir URLs, inyectar cabeceras (`X-Forwarded-For`), comprimir respuestas o bloquear peticiones maliciosas (WAF).
* **Sobrecarga (Overhead):** Requiere mayor capacidad de cómputo. El análisis sintáctico de HTTP, la gestión de certificados TLS y el mantenimiento de dos conexiones TCP independientes por cada request consumen más recursos que el paso transparente de L4.

#### Diagrama de Flujo (L7):
```text
[Cliente] -> GET /api/v1/users HTTP/1.1
             Host: app.empresa.com
             |
             v
+-----------------------------+
|    BALANCEADOR CAPA 7       | -> Decifra TLS.
|  (Lee el Path y Headers)    | -> Analiza el Request: Path es "/api/v1/users"
+-----------------------------+ -> Enruta al "Pool de APIs".
             |
    +--------+--------+ (Si el Path fuera "/", iría a otro pool)
    v                 v
[API Node 1]      [API Node 2]

```

---

### Comparativa Directa y Configuración en la Práctica
Para materializar esta diferencia, observemos cómo un estándar de la industria como **HAProxy** configura ambos escenarios. La directiva clave aquí es `mode`.

**Ejemplo 1: Configuración en Capa 4 (Rendimiento Bruto)**
Ideal para bases de datos (MySQL/PostgreSQL) o tráfico web donde el backend maneja el TLS y no necesitamos reglas HTTP.

```haproxy
frontend mi_frontend_l4
    bind *:443
    # MODO TCP: El balanceador no mira el contenido HTTPS
    mode tcp
    default_backend mis_servidores_tcp

backend mis_servidores_tcp
    mode tcp
    balance roundrobin
    server db1 10.0.0.10:443 check
    server db2 10.0.0.11:443 check

```

**Ejemplo 2: Configuración en Capa 7 (Microservicios / Flexibilidad)**
Ideal para despliegues modernos, APIs y entornos donde necesitamos que la infraestructura reaccione a la semántica de la petición.

```haproxy
frontend mi_frontend_l7
    bind *:80
    # MODO HTTP: El balanceador parsea el tráfico
    mode http
    
    # Reglas de enrutamiento basadas en L7 (Path)
    acl is_api path_beg /api
    use_backend mis_servidores_api if is_api
    
    default_backend mis_servidores_web

backend mis_servidores_api
    mode http
    balance leastconn
    server api1 10.0.0.20:8080 check
    server api2 10.0.0.21:8080 check

backend mis_servidores_web
    mode http
    # Persistencia inyectando una cookie (Imposible en L4)
    cookie SERVERID insert indirect nocache
    server web1 10.0.0.30:80 cookie s1 check
    server web2 10.0.0.31:80 cookie s2 check

```

### Resumen para el Administrador
| Criterio | Capa 4 (Transporte) | Capa 7 (Aplicación) |
| --- | --- | --- |
| **Punto de decisión** | IP y Puertos (TCP/UDP) | URL, Cabeceras HTTP, Cookies, Método |
| **Terminación TLS** | No obligatoria (Passthrough) | Obligatoria (para leer el tráfico HTTPS) |
| **Rendimiento / CPU** | Altísimo (casi a velocidad de red) | Alto (requiere parseo y buffering HTTP) |
| **Modificación de tráfico** | Imposible | Sí (reescritura de paths, inyección de headers) |
| **Casos de Uso Ideales** | Bases de datos, tráfico IoT masivo, ingesta de logs crudos. | Microservicios, APIs REST, Ingress de Kubernetes, Web tradicional. |

Entender la frontera exacta entre el tráfico de red puro y la semántica de HTTP es lo que permite a un administrador diseñar arquitecturas resilientes. En los despliegues *Cloud Native* actuales, es extremadamente común ver ambos trabajando en tándem: un balanceador L4 en el borde de la nube (como AWS Network Load Balancer) distribuyendo tráfico masivo hacia un clúster de balanceadores L7 (como Nginx o Traefik) que luego realizan el enrutamiento fino hacia los microservicios.

## 7.3. Configuración y tuning de servidores web líderes (Nginx, HAProxy, Apache, Traefik)
La elección de un servidor web o proxy no depende solo de la preferencia personal, sino de la arquitectura de la aplicación y el entorno de despliegue. Mientras que **Nginx** y **HAProxy** dominan en rendimiento puro y manejo de conexiones masivas, **Apache** sigue siendo el estándar para compatibilidad legacy y **Traefik** es el líder indiscutible en entornos de microservicios dinámicos (Kubernetes/Docker).

---

### 1. Nginx: El Maestro de los Eventos
Nginx utiliza una arquitectura asíncrona y orientada a eventos. A diferencia de los servidores tradicionales, no crea un nuevo proceso o hilo por cada conexión, lo que le permite manejar miles de conexiones simultáneas con un uso de memoria mínimo.

#### Parámetros de Tuning Críticos:
* **`worker_processes`**: Define cuántos procesos "worker" se lanzan. En la mayoría de los casos, se recomienda `auto` (uno por cada núcleo de CPU).
* **`worker_connections`**: El número máximo de conexiones que cada worker puede manejar simultáneamente. Un valor común para producción es `1024` o `2048`.
* **`sendfile on`**: Utiliza la llamada al sistema `sendfile()` para copiar datos de un descriptor de archivo a otro directamente en el kernel, evitando copias innecesarias a nivel de usuario.
* **`tcp_nopush` y `tcp_nodelay**`: Optimizan cómo se envían los paquetes TCP, ideal para enviar cabeceras y el inicio de los archivos en un solo paquete.

```nginx
# Ejemplo de tuning de alto rendimiento
worker_processes auto;
worker_rlimit_nofile 65535; # Incrementa el límite de descriptores de archivos

events {
    worker_connections 4096;
    use epoll; # Optimización para Linux
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
}

```

---

### 2. HAProxy: Rendimiento Crítico en Capa 4 y 7
HAProxy es conocido por su eficiencia casi imbatible. Es común encontrarlo delante de clústeres de Nginx para manejar el balanceo de carga masivo.

#### Parámetros de Tuning Críticos:
* **`maxconn`**: El límite global de conexiones. Debe ajustarse según la RAM disponible (aprox. 2-4KB por conexión).
* **`nbthread`**: En versiones modernas (1.8+), permite a HAProxy usar múltiples hilos en un solo proceso, mejorando el rendimiento en máquinas multinúcleo sin la complejidad de múltiples procesos.
* **`backlog`**: El tamaño de la cola de conexiones que esperan ser aceptadas por el sistema operativo.

---

### 3. Apache (HTTPD): Flexibilidad y MPMs
El rendimiento de Apache depende totalmente del **Multi-Processing Module (MPM)** seleccionado.

* **Prefork**: Un proceso por conexión (seguro para PHP-mod, pero consume mucha RAM).
* **Worker**: Multi-hilo, más eficiente que Prefork.
* **Event**: Similar a Nginx, separa los hilos de escucha de los hilos de trabajo, ideal para Keep-Alive.

#### Parámetros de Tuning (MPM Event):
* **`ServerLimit`** y **`MaxRequestWorkers`**: Determinan el techo máximo de peticiones simultáneas.
* **`ThreadsPerChild`**: Cuántos hilos lanza cada proceso hijo.

---

### 4. Traefik: El Proxy Cloud-Native
A diferencia de los anteriores, Traefik se configura dinámicamente. No sueles hacer tuning de "procesos", sino de **entrypoints** y **limitadores de recursos**. Su gran ventaja es el descubrimiento automático de servicios.

```yaml
# Configuración estática de Traefik (ejemplo)
entryPoints:
  web:
    address: ":80"
    transport:
      respondingTimeouts:
        readTimeout: 60s
        writeTimeout: 60s
        idleTimeout: 90s

```

---

### Resumen de Arquitecturas y Tuning
La siguiente tabla resume cómo abordar el tuning según la naturaleza del servidor:

| Servidor | Arquitectura Principal | Foco del Tuning | Limitante Principal |
| --- | --- | --- | --- |
| **Nginx** | Event-driven (Asíncrono) | Conexiones por worker y buffers. | CPU (para TLS) / RAM (buffers). |
| **HAProxy** | Single-process (Event-loop) | `maxconn` y límites del Kernel. | Descriptores de archivos (ulimit). |
| **Apache** | Process/Thread based | Gestión de Hilos y MPMs. | Memoria RAM (por proceso/hilo). |
| **Traefik** | Go-routines (Dinámico) | Timeouts de red y recursos de contenedor. | Latencia de configuración dinámica. |

Entender cómo interactúan estos parámetros con el hardware subyacente es la diferencia entre un sistema que colapsa con 1,000 usuarios y uno que escala sin problemas hasta los 100,000.

## 7.4. Ingress Controllers en Kubernetes y enrutamiento HTTP en arquitecturas Cloud Native
En las secciones anteriores (*7.1, 7.2 y 7.3*), operamos bajo una premisa fundamental: las direcciones IP de nuestros servidores backend (los *upstreams*) son relativamente estáticas. Si un servidor Nginx o Tomcat se reinicia, generalmente mantiene su IP o, en su defecto, actualizamos un registro DNS interno.

En **Kubernetes (K8s)** y las arquitecturas *Cloud Native*, esa premisa se destruye. Los contenedores (Pods) nacen y mueren constantemente; sus direcciones IP son totalmente efímeras. Configurar un bloque `upstream` estático en un HAProxy clásico apuntando a la IP de un Pod es inútil, ya que esa IP podría dejar de existir en los próximos 5 minutos debido a un auto-escalado o a una reubicación de nodos.

Para resolver el enrutamiento L7 en este caos dinámico, Kubernetes introduce el concepto de **Ingress** y su motor de ejecución: el **Ingress Controller**.

---

### El Problema: ¿Por qué no usar solo Balanceadores L4?
Kubernetes ofrece un recurso llamado `Service` de tipo `LoadBalancer`, que aprovisiona un balanceador de carga en Capa 4 (ej. AWS NLB, Azure Kube-LB).
Si tienes 15 microservicios diferentes (API de pagos, API de usuarios, Frontend, Blog, etc.) y usas este método, la nube te aprovisionará 15 balanceadores físicos/virtuales distintos, cada uno con su propia IP pública. Operativamente, esto genera dos problemas críticos:

1. **Costo desorbitado:** Pagarás por 15 balanceadores L4.
2. **Falta de inteligencia HTTP:** No puedes hacer enrutamiento basado en la URL (Path) ni terminar sesiones TLS centralizadas.

### La Solución: El Ingress Controller
Un Ingress Controller es, en esencia, **un Proxy Inverso de Capa 7 (Nginx, Traefik, HAProxy, Envoy) que vive dentro del clúster de Kubernetes y está programado para hablar con la API de Kubernetes**.

Su trabajo es observar continuamente el clúster. Cuando detecta que un administrador ha creado una nueva "Regla de Enrutamiento" (un recurso tipo `Ingress`), el Ingress Controller reescribe automáticamente su propia configuración interna (ej. el `nginx.conf`) y recarga sus procesos en caliente (`reload`), sin perder tráfico.

#### Flujo de Tráfico Cloud Native:
```text
[ Cliente (Internet) ]
         |
         | (TCP/443 - Resolvión DNS a una única IP pública)
         v
+---------------------------------------------------+
| Balanceador de Carga Cloud (Capa 4 - Passthrough) | -> Punto único de entrada a la red.
+---------------------------------------------------+
         |
         | (Tráfico llega a los Nodos de K8s)
         v
+---------------------------------------------------+
| Ingress Controller (Capa 7 - Ej: ingress-nginx)   | -> Termina TLS, lee Cabeceras/Path HTTP.
+---------------------------------------------------+
         |------------------------|
 (Si Path: /api)          (Si Path: /app)
         v                        v
+-----------------+      +-----------------+
| Service K8s (A) |      | Service K8s (B) | -> Abstracción de IPs internas.
+-----------------+      +-----------------+
         |                        |
  +------+------+            +----+----+
  v             v            v         v
[Pod 1]      [Pod 2]      [Pod 3]   [Pod 4] -> Aplicaciones finales.

```

---

### Anatomía de las Reglas de Enrutamiento HTTP
Como administrador, no editas el archivo de configuración del proxy a mano. En su lugar, aplicas manifiestos YAML que el Ingress Controller traduce. Existen dos estrategias principales de enrutamiento:

#### 1. Enrutamiento basado en Nombres de Host (Virtual Hosting)
Permite alojar múltiples dominios en la misma IP pública del Ingress Controller. El controlador examina la cabecera HTTP `Host` (ver *Sección 2.5*) para decidir el destino.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: host-routing-example
spec:
  ingressClassName: nginx
  rules:
  - host: api.miempresa.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port: { number: 80 }
  - host: blog.miempresa.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: blog-service
            port: { number: 80 }

```

#### 2. Enrutamiento basado en Rutas (Path-Based Routing)
Ideal para dividir un dominio único en múltiples microservicios (el patrón *API Gateway*). El controlador examina el URI de la petición.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-routing-example
  annotations:
    # Instruye a Nginx para que quite "/api" antes de enviarlo al backend
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
  - host: miempresa.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: backend-microservicios
            port: { number: 8080 }
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-react
            port: { number: 80 }

```

---

### Operaciones Críticas del Ingress Controller
Un Ingress Controller no solo enruta, sino que absorbe gran parte de las responsabilidades que antes recaían en las aplicaciones individuales:

1. **Gestión de Certificados (Terminación TLS automatizada):** Integrado con herramientas como *cert-manager*, el Ingress Controller puede solicitar, renovar e instalar certificados de Let's Encrypt automáticamente utilizando desafíos HTTP-01 o DNS-01, adjuntándolos al bloque `tls:` del Ingress.
2. **Rate Limiting y WAF:** Mediante anotaciones (`annotations`), puedes instruir al Ingress Controller para que limite peticiones por IP o inyecte reglas ModSecurity (WAF) directamente en el proxy de borde.
3. **Despliegues Canary / Blue-Green:** Configurando pesos en las rutas, el Ingress Controller puede enviar el 90% del tráfico HTTP a la versión actual de tu app y el 10% a una nueva versión para probar su estabilidad sin impactar a toda la base de usuarios.

> **Nota sobre el futuro (Gateway API):** Aunque el recurso `Ingress` es el estándar actual, la comunidad de Kubernetes está haciendo la transición hacia la **Gateway API** (`gateway.networking.k8s.io`). Este nuevo estándar resuelve las limitaciones del Ingress tradicional (como la sobrecarga de anotaciones) proporcionando recursos nativos separados para administradores de infraestructura (`GatewayClass`, `Gateway`) y desarrolladores de aplicaciones (`HTTPRoute`), mejorando drásticamente el control de roles (RBAC) en la capa de red L7.

## 7.5. Content Delivery Networks (CDNs): Edge computing y optimización de enrutamiento (Anycast)
Hasta este punto del libro, hemos diseñado una infraestructura robusta y escalable dentro de un único centro de datos o región en la nube: interceptamos el tráfico con proxies inversos (*7.1*), lo distribuimos con balanceadores L4/L7 (*7.2*), optimizamos los servidores (*7.3*) y lo enrutamos dinámicamente en Kubernetes (*7.4*).

Sin embargo, las leyes de la física son implacables. Si tu infraestructura perfecta reside en Frankfurt, un usuario en Tokio siempre sufrirá aproximadamente 250 milisegundos de latencia por viaje redondo (RTT) debido a la velocidad de la luz en la fibra óptica. Para mitigar esto, necesitamos expandir nuestro perímetro de red. Aquí es donde entran las Redes de Entrega de Contenido (CDNs).

En la arquitectura moderna, una CDN ya no es un simple repositorio de imágenes y scripts estáticos. Se ha transformado en un **Proxy Inverso Global** distribuido masivamente, actuando como la primera línea de defensa y el principal motor de rendimiento.

---

### 1. La Magia del Enrutamiento: BGP Anycast
El principal problema de tener servidores distribuidos globalmente es cómo decirle al usuario a qué servidor conectarse sin añadir latencia adicional en resoluciones DNS geolocalizadas complejas. La respuesta estándar de la industria es el enrutamiento **Anycast**.

Para entender Anycast, debemos contrastarlo con el modelo tradicional:

* **Unicast:** Una dirección IP pública corresponde a **un único servidor** (o balanceador de carga) en una ubicación física específica. Todo el tráfico del mundo viaja hacia esa ubicación.
* **Anycast:** Una misma dirección IP pública es anunciada simultáneamente por **múltiples servidores** en diferentes ubicaciones del mundo a través del protocolo BGP (Border Gateway Protocol).

Cuando un usuario en Brasil teclea `miempresa.com` (asociado a una IP Anycast), su proveedor de Internet evalúa las rutas BGP disponibles y envía los paquetes de red al nodo (Punto de Presencia o PoP) de la CDN topológicamente más cercano (por ejemplo, un nodo en São Paulo), en lugar de cruzar el océano hasta el servidor de origen en Europa.

#### Diagrama de Flujo: Unicast vs. Anycast
```text
[ ENRUTAMIENTO UNICAST ] (IP: 203.0.113.1 -> Solo en Europa)

Usuario (Asia)    -----------------------------------------> [Origen Europa] (250ms)
Usuario (América) ------------------------> [Origen Europa] (150ms)
Usuario (Europa)  --> [Origen Europa] (20ms)

====================================================================================

[ ENRUTAMIENTO ANYCAST ] (IP: 198.51.100.5 -> Anunciada globalmente)

Usuario (Asia)    --> [PoP CDN Asia] (15ms)
                                \
Usuario (América) --> [PoP CDN América] (15ms)  ==== (Red Troncal Privada) ===> [Origen Europa]
                                /
Usuario (Europa)  --> [PoP CDN Europa] (10ms)

```

**Ventajas Operativas de Anycast:**

1. **Reducción drástica de latencia:** El Handshake TCP y TLS (ver *Sección 5.1*) se realiza contra el nodo local en milisegundos.
2. **Mitigación de DDoS:** Si un ataque masivo se origina en Rusia, el tráfico es absorbido exclusivamente por los nodos Anycast de esa región, protegiendo el resto de la red global y evitando que el servidor de origen colapse.
3. **Alta Disponibilidad natural:** Si un centro de datos de la CDN en Miami se apaga, BGP simplemente retira esa ruta y el tráfico fluye automáticamente al siguiente nodo más cercano (ej. Atlanta), sin intervención del administrador ni cambios en el DNS.

---

### 2. De la Caché Estática al Edge Computing
Históricamente, los administradores configuraban cabeceras como `Cache-Control` (ver *Capítulo 3*) para que la CDN almacenara copias de recursos pesados. Hoy, el paradigma ha evolucionado hacia el **Edge Computing** (Computación en el Borde).

En lugar de limitarnos a almacenar datos, ahora empujamos **lógica de negocio** al borde de la red, ejecutando código directamente en los PoPs de la CDN, a milisegundos del usuario. Esto se logra utilizando tecnologías de aislamiento ultraligero (como V8 Isolates o WebAssembly), en plataformas como Cloudflare Workers, Fastly Compute@Edge o AWS Lambda@Edge.

#### Casos de Uso Operativos en el Edge:
* **Manipulación de Cabeceras al Vuelo:** Añadir cabeceras de seguridad (HSTS, CSP) o reescribir respuestas antes de que lleguen al cliente, sin tocar el backend.
* **A/B Testing en Infraestructura:** El código en el Edge intercepta la petición, verifica una cookie, y decide de forma transparente si enruta la petición HTTP hacia el bucket de "Versión A" o "Versión B", sin penalización de latencia en el frontend.
* **Autenticación Distribuida:** Validar tokens JWT directamente en el nodo de la CDN. Si el token es inválido o ha expirado, el Edge devuelve un `401 Unauthorized` inmediatamente, evitando que la petición inútil despierte recursos computacionales costosos en el backend (Kubernetes).
* **Enrutamiento Inteligente L7 Global:** Inspeccionar el `Accept-Language` del usuario y redirigirlo a un clúster regional específico antes de tocar la red troncal.

---

### 3. Configuración Práctica: El Administrador ante el Edge
Como Sysadmin, el manejo de CDNs ha migrado de paneles web manuales a **Infraestructura como Código (IaC)**.

Por ejemplo, utilizando **VCL** (Varnish Configuration Language, muy usado en Fastly) o lenguajes modernos (JavaScript/Rust) en el Edge, podemos definir lógicas estrictas para decidir qué hacer con una petición en los primeros 10 milisegundos de su ciclo de vida.

**Ejemplo Conceptual (Cloudflare Worker / JS-like):**

```javascript
// Este código se ejecuta en más de 300 ciudades simultáneamente
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // 1. Edge Computing: Redirección inmediata por seguridad
  if (url.pathname === "/admin") {
    const ip = request.headers.get("CF-Connecting-IP")
    if (!ip.startsWith("192.168.10.")) { // Simulando validación IP corporativa
      return new Response("Access Denied", { status: 403 })
    }
  }

  // 2. Fetch al Origen: Si pasa los filtros, buscar en caché o ir al backend
  let response = await fetch(request)
  
  // 3. Modificación Post-Respuesta: Inyectar seguridad
  let newHeaders = new Headers(response.headers)
  newHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  })
}

```

### Resumen del Ecosistema HTTP Global
Al integrar Anycast y Edge Computing, tu infraestructura deja de ser un castillo protegido por un foso, para convertirse en una fuerza policial distribuida globalmente. El tráfico basura, los escaneos maliciosos y las peticiones no autenticadas mueren en la periferia de la red, mientras que los usuarios legítimos disfrutan de respuestas en caché o conexiones TLS aceleradas, garantizando que tus costosos recursos centrales (CPUs y Bases de Datos) solo se utilicen para transacciones que realmente importan.
