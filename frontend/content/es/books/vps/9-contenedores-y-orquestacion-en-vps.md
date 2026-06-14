La contenedorización ha transformado al VPS de un servidor estático a un nodo dinámico y ágil. Este capítulo analiza la transición de gestionar procesos aislados a orquestar infraestructuras resilientes. Exploramos la arquitectura de **Docker** frente al enfoque *rootless* de **Podman**, y cómo **Docker Compose** simplifica despliegues multi-servicio. Además, profundizamos en los cimientos del kernel —**namespaces** y **cgroups**— que garantizan el aislamiento real de recursos. Finalmente, introducimos la orquestación ligera con **K3s**, permitiendo convertir un grupo de instancias en un cluster de alta disponibilidad eficiente y escalable.

## 9.1. Docker y Podman: Gestión de contenedores en hosts individuales

En el Capítulo 1, exploramos los contenedores de sistema (LXC/LXD) como una alternativa ligera a la virtualización completa para emular entornos operativos completos. Ahora, daremos el salto a los **contenedores de aplicación**, diseñados para empaquetar, distribuir y ejecutar un único proceso o servicio (y sus dependencias) de manera predecible y aislada.

Para la gestión de contenedores en un VPS individual, dos herramientas dominan el panorama: **Docker**, el pionero que estandarizó la industria, y **Podman**, la alternativa moderna enfocada en la seguridad y la integración nativa con sistemas Linux. Comprender las diferencias arquitectónicas entre ambos es vital para diseñar un entorno seguro y eficiente antes de escalar hacia la orquestación.

---

### Docker: La arquitectura Cliente-Servidor

Docker popularizó la adopción de contenedores gracias a su ergonomía y su ecosistema. Sin embargo, su diseño arquitectónico clásico presenta particularidades que todo SysAdmin debe auditar.

Docker utiliza un modelo cliente-servidor impulsado por un proceso residente en segundo plano: el **Docker Daemon (`dockerd`)**.

```text
+---------------------------------------------------------+
|                      Host VPS                           |
|                                                         |
|  +--------------+       REST API      +--------------+  |
|  | Docker CLI   | ------------------> |   dockerd    |  |
|  | (Cliente)    |  (Unix socket/TCP)  |   (Daemon)   |  |
|  +--------------+                     +-------+------+  |
|                                               |         |
|                                       +-------v------+  |
|                                       |  containerd  |  |
|                                       +-------+------+  |
|                                               |         |
|                                        +------v------+  |
|                                        | runc / crun |  |
|                                        +-------------+  |
+---------------------------------------------------------+

```

* **El Daemon:** Es el corazón de Docker. Gestiona el ciclo de vida de los contenedores, las imágenes, las redes y los volúmenes.
* **Implicaciones de seguridad:** Históricamente, `dockerd` requiere privilegios de `root` para operar. Si un atacante logra escapar de un contenedor gestionado por un daemon privilegiado, obtendrá acceso de superusuario al VPS. Aunque Docker soporta el modo *Rootless*, su configuración requiere pasos adicionales y la arquitectura subyacente sigue dependiendo de un demonio centralizado.

### Podman: El enfoque "Daemonless" y "Rootless"

Desarrollado principalmente por Red Hat, Podman (Pod Manager) nació con el objetivo de ser un reemplazo directo de Docker, pero solucionando sus deficiencias arquitectónicas desde el diseño base.

Podman elimina el intermediario. No existe un demonio centralizado; en su lugar, interactúa directamente con el registro de imágenes, el sistema de archivos y el *runtime* del contenedor (como `runc` o `crun`) utilizando el modelo estándar `fork/exec` de Linux.

```text
+---------------------------------------------------------+
|                      Host VPS                           |
|                                                         |
|  +--------------+                     +--------------+  |
|  |  Podman CLI  | --(fork/exec)-----> | runc / crun  |  |
|  | (Proceso OS) |                     |  (Runtime)   |  |
|  +--------------+                     +-------+------+  |
|                                               |         |
|                                       +-------v------+  |
|                                       |  Contenedor  |  |
|                                       +--------------+  |
+---------------------------------------------------------+

```

* **Arquitectura Daemonless:** Al no haber un demonio, no hay un único punto de fallo (SPOF) a nivel de servicio de contenedores. Los contenedores son procesos hijos directos del usuario que ejecutó el comando.
* **Ejecución Rootless nativa:** Podman está diseñado para que los usuarios sin privilegios puedan crear y administrar contenedores sin requerir permisos de `root` en ningún momento. Esto reduce drásticamente la superficie de ataque del VPS.
* **Integración con Systemd:** Al no tener su propio gestor de ciclo de vida (demonio), Podman se apoya nativamente en `systemd`. A través de **Quadlet** (la herramienta moderna de Podman que reemplaza al antiguo comando `generate systemd`), puedes escribir archivos de unidad de `systemd` que declaran contenedores, permitiendo que el sistema operativo los inicie, reinicie y supervise como si fueran cualquier otro servicio nativo.

---

### Comparativa: ¿Docker o Podman para tu VPS?

| Característica | Docker | Podman |
| --- | --- | --- |
| **Arquitectura** | Cliente-Servidor (Daemon) | Tradicional (Daemonless) |
| **Privilegios por defecto** | Requiere `root` (soporta Rootless con config extra) | Rootless nativo (seguro por defecto) |
| **Gestión de ciclo de vida** | Demonio interno (`dockerd`) | Sistema de inicio del OS (`systemd`) |
| **Compatibilidad CLI** | Original | Compatible al 100% (`alias docker=podman`) |
| **Ecosistema de construcción** | Integrado (`docker build`) | Desacoplado (usa `Buildah` bajo el capó) |

**Recomendación:** Para hosts individuales modernos y orientados a la seguridad (especialmente si no vas a usar orquestadores que dependan del socket de Docker), **Podman** es la opción superior. Sin embargo, Docker sigue siendo ineludible en ciertos pipelines heredados o herramientas de terceros muy específicas.

---

### Gestión práctica del ciclo de vida

Independientemente de si eliges Docker o Podman, la sintaxis en la terminal es idéntica para las operaciones de un solo host. Muchos SysAdmins configuran un alias transparente para suavizar la transición:

```bash
# Configurar alias en .bashrc o .zshrc
alias docker=podman

```

El flujo de trabajo estándar en un host individual implica mapear recursos del VPS (redes y almacenamiento, que vimos en los Capítulos 4 y 6) hacia el entorno aislado del contenedor:

```bash
# Ejecutar un servicio Nginx (Capa 7), mapeando el puerto 80 del VPS al puerto 80 del contenedor,
# y persistiendo los datos en un volumen local (Block Storage o NFS).
docker run -d \
  --name web-server \
  -p 80:80 \
  -v /var/www/html:/usr/share/nginx/html:ro \
  --restart unless-stopped \
  nginx:alpine

# Inspeccionar el estado e IPs internas
docker inspect web-server | grep IPAddress

# Revisar los logs emitidos por el proceso interno
docker logs -f web-server

```

En este punto, somos capaces de levantar servicios empaquetados de forma aislada. Sin embargo, cuando la aplicación requiere múltiples contenedores colaborando entre sí (como una API conectada a una base de datos y un sistema de caché), gestionarlos individualmente mediante la CLI se vuelve propenso a errores. Para estructurar infraestructuras multi-servicio de forma declarativa en un mismo VPS, recurriremos a las herramientas que abordaremos en la próxima sección: **Docker Compose y los Pods**.

*Nota: La limitación estricta de CPU y RAM para evitar que un contenedor acapare los recursos del VPS será abordada en la sección 9.3 al profundizar en `cgroups` y namespaces.*

## 9.2. Docker Compose para despliegues multi-servicio

Si en la sección anterior tratamos el contenedor como la unidad atómica de ejecución, en esta sección abordaremos la realidad de la mayoría de las aplicaciones modernas: **la multicontenerización**. Es inusual que un servicio productivo dependa de un único proceso; lo habitual es una arquitectura compuesta por un servidor web, una base de datos, un gestor de caché y, posiblemente, un sistema de colas.

Gestionar esto mediante comandos individuales de `docker run` es una receta para el desastre operativo: inconsistencia en las versiones, errores en el mapeo de puertos y una gestión de redes manual tediosa. Aquí es donde entra **Docker Compose** (y su contraparte, `podman-compose` o los **Pods** de Podman).

### El Manifiesto Declarativo: `compose.yaml`

Docker Compose permite definir toda la infraestructura necesaria para una aplicación en un único archivo YAML. Esto transforma la gestión de contenedores en un proceso de **Infraestructura como Código (IaC)** a nivel local.

A continuación, se presenta un ejemplo de un stack típico (Aplicación Python + PostgreSQL + Redis) que ilustra los conceptos clave:

```yaml
name: mi-proyecto-vps

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - backend
    secrets:
      - db_password

  cache:
    image: redis:7-alpine
    networks:
      - backend

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    environment:
      - DATABASE_URL=postgres://user@db:5432/dbname
    networks:
      - frontend
      - backend

networks:
  frontend:
  backend:
    internal: true  # Aísla la DB y el Cache del tráfico exterior

volumes:
  db_data:

secrets:
  db_password:
    file: ./secrets/db_pass.txt

```

### Conceptos críticos para el SysAdmin

1. **Aislamiento de Redes y Service Discovery:**
Docker Compose crea automáticamente una red para el stack. Dentro de esa red, los contenedores se comunican usando el **nombre del servicio** como hostname (ej. la API se conecta a `db:5432`).

* *Buenas prácticas:* Define redes separadas (`frontend` y `backend`). Solo el servicio que recibe tráfico (como un proxy inverso o la API) debe estar en la red `frontend`. La base de datos debe permanecer en la red `backend` marcada como `internal: true`, impidiendo cualquier salida o entrada accidental de tráfico fuera del stack.

1. **Gestión de Dependencias y Salud (`healthcheck`):**
El parámetro `depends_on` no garantiza que el servicio esté *listo*, solo que el contenedor ha arrancado. Para infraestructuras resilientes, es vital usar `condition: service_healthy`. Esto obliga a definir un `healthcheck` en el servicio de la base de datos para asegurar que la API no intente conectarse antes de que PostgreSQL acepte conexiones.
2. **Persistencia y Volúmenes Nombrados:**
Como vimos en el Capítulo 4, el almacenamiento es crítico. En Compose, los volúmenes nombrados (como `db_data`) son gestionados por el motor de contenedores. En un VPS, esto facilita la migración y los backups, ya que los datos no están dispersos en rutas arbitrarias del host.

---

### Orquestación en Podman: De Compose a Pods

Aunque existe `podman-compose`, Podman introduce un concepto superior heredado de Kubernetes: el **Pod**. Un Pod es un grupo de uno o más contenedores que comparten la misma red (localhost), el mismo espacio de nombres de red y el mismo almacenamiento.

Si prefieres la filosofía de Podman para tu VPS, la gestión multi-servicio cambia ligeramente:

1. **Agrupación:** Los contenedores en un Pod se ven entre sí a través de `localhost`.
2. **Despliegue:** Puedes usar un archivo YAML de Kubernetes directamente con `podman play kube app.yaml`, lo cual es un excelente paso intermedio si planeas migrar a K3s (Capítulo 9.4).

---

### Operaciones comunes en producción

Para el SysAdmin, el control del stack se resume en pocos comandos esenciales:

* `docker compose up -d`: Levanta todo el stack en segundo plano. Si el archivo YAML ha cambiado, solo recrea los servicios afectados.
* `docker compose ps`: Muestra el estado de salud de todos los componentes del stack.
* `docker compose logs -f --tail=100`: Agrega los logs de todos los servicios en un solo flujo (ideal para debugging rápido).
* `docker compose exec api sh`: Accede interactivamente a un contenedor específico sin necesidad de SSH.

---

Para entender mejor cómo interactúan estas piezas, especialmente la resolución de nombres y el aislamiento de redes, la siguiente herramienta permite visualizar cómo se conectan los servicios según su configuración en el manifiesto.

Para comprender cómo Docker Compose gestiona la conectividad interna y el aislamiento de servicios, esta herramienta permite configurar un stack y visualizar la arquitectura resultante.

Docker Compose automatiza la creación de redes y la resolución de nombres entre contenedores. Al definir servicios en un mismo archivo, el sistema crea un DNS interno donde cada servicio es localizable por su nombre. Esto permite que, por ejemplo, una base de datos esté oculta del exterior pero accesible para la aplicación mediante un host persistente.

## 9.3. Limitación de recursos de contenedores mediante `cgroups` y namespaces en el host

En las secciones anteriores hemos abordado cómo empaquetar y orquestar servicios. Sin embargo, por defecto, un motor de contenedores no impone restricciones sobre la cantidad de CPU o memoria RAM que un contenedor puede consumir. Si un servicio sufre una fuga de memoria (memory leak) o un ataque de denegación de servicio, podría acaparar todos los recursos del VPS, provocando la caída de aplicaciones vecinas o incluso la inestabilidad del propio sistema operativo anfitrión.

Para transformar nuestro VPS en una infraestructura verdaderamente resiliente, debemos aislar los contenedores no solo a nivel de red, sino también a nivel de consumo. Este aislamiento se logra gracias a dos primitivas fundamentales del kernel de Linux: los **Namespaces** y los **Control Groups (`cgroups`)**.

En términos simples:

* **Namespaces:** Limitan lo que un contenedor puede **ver**.
* **cgroups:** Limitan lo que un contenedor puede **usar**.

---

### Namespaces: La ilusión del aislamiento (Lo que el contenedor ve)

Los namespaces son la tecnología que permite que un proceso (o grupo de procesos) tenga su propia visión aislada de los recursos globales del sistema. Cuando ejecutas un contenedor, el motor crea un conjunto de namespaces específicos para él.

Existen varios tipos de namespaces, pero los más críticos para la comprensión del SysAdmin son:

1. **PID (Process ID):** Aísla el árbol de procesos. Dentro del contenedor, la aplicación cree ser el `PID 1` (el proceso de inicialización). Sin embargo, desde la perspectiva del host VPS, ese mismo proceso es solo un hilo más con un PID completamente distinto (por ejemplo, `PID 24056`).
2. **MNT (Mount):** Proporciona un sistema de archivos raíz independiente. El contenedor no ve el sistema de archivos `/` del host a menos que montemos un volumen explícitamente (como vimos en 9.1).
3. **NET (Network):** Aísla las interfaces de red, tablas de enrutamiento y puertos.
4. **USER:** Permite mapear los identificadores de usuario (UID). Un proceso que es `root` (UID 0) dentro del contenedor puede estar mapeado a un usuario sin privilegios (UID 1000) en el host, mitigando el riesgo de escalada de privilegios (clave en la arquitectura de Podman).

```text
+---------------------------------------------------------+
|                     Host OS (VPS)                       |
|                                                         |
|  Tabla de Procesos Global:                              |
|  PID 1 (systemd)                                        |
|  PID 850 (sshd)                                         |
|                                                         |
|  +--- PID Namespace (Contenedor Web) ---------------+   |
|  | Host PID 10423 -----> Ve su PID como: 1 (nginx)  |   |
|  | Host PID 10425 -----> Ve su PID como: 5 (worker) |   |
|  +--------------------------------------------------+   |
+---------------------------------------------------------+

```

---

### Control Groups (cgroups): El gobernador de recursos (Lo que el contenedor usa)

Mientras que los namespaces construyen los muros de la habitación, los **cgroups** determinan cuánta electricidad y agua entran en ella. Desarrollados originalmente por Google y fusionados en el kernel de Linux, los cgroups permiten medir, limitar y priorizar el uso de recursos de un grupo de procesos.

Actualmente, las distribuciones Linux modernas utilizan **cgroups v2**, que ofrece una jerarquía unificada y una gestión de memoria mucho más predecible.

#### 1. Limitación de Memoria y el OOM Killer

Si un contenedor excede su límite de memoria asignado, el kernel de Linux invocará al **OOM (Out of Memory) Killer** y terminará el proceso del contenedor para proteger al VPS. Es vital configurar reinicios automáticos (`restart: always` o `unless-stopped`) para que el servicio se recupere tras un evento OOM.

#### 2. Limitación y Priorización de CPU

En lugar de matar procesos, la gestión de CPU funciona mediante aceleración (throttling) o cuotas. Si un contenedor tiene un límite de `0.5` CPUs, el kernel le permitirá usar como máximo el 50% del tiempo de un núcleo, pausando milisegundos de ejecución si intenta sobrepasarlo.

---

### Implementación Práctica en el VPS

La aplicación de estas políticas debe ser un estándar en tus despliegues. Nunca dejes contenedores sin límites (unbounded) en producción.

**Mediante CLI de un solo contenedor (Docker / Podman):**

```bash
docker run -d \
  --name api-backend \
  --memory="512m" \
  --cpus="1.5" \
  --pids-limit="100" \
  mi-api:latest

```

*Nota: `--pids-limit` es un salvavidas contra ataques tipo "fork bomb", donde un proceso malicioso crea procesos hijos infinitos para saturar el scheduler del VPS.*

**Mediante Infraestructura como Código (Docker Compose):**

Para mantener el control declarativo visto en la sección 9.2, los límites se definen dentro del bloque `deploy` del archivo `compose.yaml`:

```yaml
services:
  db:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '2.0'         # Límite máximo (Hard limit)
          memory: 1G          # Límite máximo de RAM
        reservations:
          cpus: '0.5'         # Garantía mínima (Soft limit)
          memory: 512M        # RAM garantizada para el arranque

```

---

### Auditoría a bajo nivel: Explorando `/sys/fs/cgroup`

Como SysAdmin, no debes depender únicamente de la CLI de Docker/Podman; debes saber cómo el kernel aplica estas reglas. Los cgroups se exponen como un sistema de archivos virtual en el VPS.

Puedes auditar los límites reales de un contenedor navegando por la jerarquía de cgroups:

1. Obtén el ID completo del contenedor:

```bash
docker inspect -f '{{.Id}}' api-backend

```

1. Inspecciona los archivos del kernel correspondientes a ese ID dentro del slice de systemd:

```bash
# Para sistemas con cgroups v2
cat /sys/fs/cgroup/system.slice/docker-<CONTAINER_ID>.scope/memory.max
cat /sys/fs/cgroup/system.slice/docker-<CONTAINER_ID>.scope/cpu.max

```

Este nivel de observabilidad directa en el kernel es exactamente el que aprovechan herramientas como Prometheus y Node Exporter (Capítulo 8) para extraer métricas precisas sin depender de la API del motor de contenedores. Con los recursos estrictamente acotados, nuestro VPS está ahora protegido contra comportamientos anómalos de las aplicaciones, preparándonos para gestionar flotas enteras mediante orquestadores ligeros.

## 9.4. Introducción a la orquestación ligera (K3s / MicroK8s) para clusters de VPS

A lo largo de este capítulo, hemos dominado la gestión de contenedores en un único VPS. Sin embargo, ¿qué ocurre cuando una sola máquina ya no es suficiente para soportar la carga de trabajo, o cuando necesitamos alta disponibilidad (HA) real frente a la caída de un host completo? Docker Compose es excelente para un solo nodo, pero carece de inteligencia para distribuir cargas en una flota de servidores.

Es aquí donde entra la **orquestación**. Kubernetes (K8s) es el estándar absoluto de la industria, pero su versión estándar (distribuida vía `kubeadm`) está diseñada para centros de datos masivos. Su plano de control (Control Plane) y su base de datos de estado (`etcd`) pueden consumir fácilmente entre 1.5 GB y 2 GB de RAM simplemente estando inactivos. En un ecosistema de VPS, donde optimizamos cada megabyte, este *overhead* es inaceptable.

La solución para los SysAdmins que administran infraestructuras de tamaño pequeño a mediano es la **orquestación ligera**, liderada por **K3s** y **MicroK8s**.

---

### La filosofía de la Orquestación Ligera

Distribuciones como K3s (desarrollada originalmente por Rancher/SUSE) y MicroK8s (por Canonical) toman el código fuente original de Kubernetes y lo someten a una dieta estricta, optimizándolo para entornos con recursos limitados, IoT y clusters de VPS (Edge Computing).

**¿Cómo logran reducir el consumo de recursos?**

1. **Unificación de binarios:** K3s empaqueta todos los componentes del plano de control (API Server, Scheduler, Controller Manager) y los agentes (Kubelet, Containerd) en un único binario comprimido de menos de 100 MB.
2. **Reemplazo del Datastore:** En lugar de forzar el uso del pesado `etcd`, K3s utiliza SQLite por defecto para clusters de un solo plano de control, y soporta bases de datos relacionales tradicionales (MySQL, PostgreSQL) para arquitecturas de alta disponibilidad mediante una capa de traducción llamada Kine.
3. **Baterías incluidas:** Vienen con componentes preconfigurados (como Traefik como Ingress Controller, CoreDNS y redes Flannel/Calico) listos para funcionar "out of the box".

### Arquitectura de un Cluster en VPS

Imaginemos que hemos aprovisionado tres VPS (posiblemente en diferentes proveedores para evitar bloqueos regionales, unidos por una red Mesh de Tailscale o WireGuard, como vimos en el Capítulo 6).

La arquitectura de orquestación se dividiría así:

```text
                             +----------------------------------------+
                             |           INTERNET PUBLICO             |
                             +------------------+---------------------+
                                                |
                                    [ Tráfico HTTP/HTTPS ]
                                                |
+-----------------------------------------------+-----------------------------------------------+
|                      VPS 1 (Plano de Control / K3s Server)                                    |
|                                                                                               |
|  +-----------------------------------------------------------------------------------------+  |
|  | K3s Server Process (PID 1200)                                                           |  |
|  |  +-----------+  +-------------+  +------------+  +---------+                            |  |
|  |  | API Server|  | Controller  |  | Scheduler  |  | SQLite  |                            |  |
|  |  +-----------+  +-------------+  +------------+  +---------+                            |  |
|  +--------^--------------------------------------------------------------------------------+  |
|           |                                                                                   |
+-----------|-----------------------------------------------------------------------------------+
            |
      (API gRPC/TCP por red privada VPN - ej. 10.0.0.x)
            |
+-----------v--------------------+                   +----------------------------------+
|    VPS 2 (Nodo de Trabajo)     |                   |     VPS 3 (Nodo de Trabajo)      |
|                                |                   |                                  |
| +----------------------------+ |                   | +------------------------------+ |
| | K3s Agent Process          | |                   | | K3s Agent Process            | |
| | +---------+  +-----------+ | |                   | | +---------+  +-----------+   | |
| | | Kubelet |  | Kube-Proxy| | |                   | | | Kubelet |  | Kube-Proxy|   | |
| | +---------+  +-----------+ | |                   | | +---------+  +-----------+   | |
| +------|---------------------+ |                   | +------|-----------------------+ |
|        v                       |                   |        v                         |
| +----------------------------+ |                   | +------------------------------+ |
| | containerd (Runtime)       | |                   | | containerd (Runtime)         | |
| |  [ Pod A ]   [ Pod B ]     | |                   | |  [ Pod C ]   [ Pod D ]       | |
| +----------------------------+ |                   | +------------------------------+ |
+--------------------------------+                   +----------------------------------+

```

* **El Plano de Control (Server):** Expone la API de Kubernetes, decide en qué VPS se ejecutarán los contenedores (Scheduler) y mantiene el estado del cluster.
* **Los Nodos de Trabajo (Agents):** Reciben órdenes del Server, descargan las imágenes y ejecutan los contenedores dentro de Pods utilizando `containerd` y aplicando las reglas de `cgroups` (Capítulo 9.3).

---

### K3s vs. MicroK8s: ¿Cuál elegir?

* **K3s:** Es agnóstico al sistema operativo. Al ser un binario estático, funciona igual de bien en Debian, Alpine o Rocky Linux. Es extremadamente flexible y es el estándar *de facto* para orquestación ligera.
* **MicroK8s:** Creado por Canonical, está fuertemente acoplado al ecosistema de paquetes `snap`. Es excelente si toda tu flota de VPS corre exclusivamente sobre Ubuntu, ya que su instalación y gestión de "add-ons" (módulos habilitables como almacenamiento o métricas) es muy cómoda, pero puede ser problemático en distribuciones donde `snap` no es nativo.

### Aprovisionamiento (Bootstrapping) Práctico de K3s

Unir servidores mediante K3s es una tarea que puede automatizarse completamente con Ansible (Capítulo 5). A nivel de comandos interactivos, el proceso consta de dos pasos principales sobre la red privada de nuestros VPS.

**Paso 1: Instalar el Plano de Control (En VPS 1)**

Ejecutamos el script de instalación oficial, indicándole que escuche en la IP de nuestra red privada (ej. interfaz `wg0` de WireGuard) en lugar de la red pública, para asegurar el cluster.

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip 10.0.0.1 --flannel-iface wg0" sh -

```

Una vez iniciado, K3s generará un token de seguridad necesario para que los trabajadores puedan unirse de forma autenticada:

```bash
# Extraer el token del nodo servidor
cat /var/lib/rancher/k3s/server/node-token

```

**Paso 2: Unir Nodos de Trabajo (En VPS 2 y VPS 3)**

En los servidores de cálculo, instalamos solo el componente agente (`k3s-agent`), pasándole la URL del servidor y el token de seguridad.

```bash
curl -sfL https://get.k3s.io | K3S_URL=https://10.0.0.1:6443 K3S_TOKEN="<TOKEN_EXTRAIDO>" INSTALL_K3S_EXEC="--node-ip 10.0.0.2 --flannel-iface wg0" sh -

```

De regreso en el VPS 1, podemos verificar con la herramienta estándar de Kubernetes (`kubectl`, que K3s ya incluye) que nuestra flota de VPS ahora opera como una mente colmena:

```bash
kubectl get nodes

```

```text
NAME    STATUS   ROLES                  AGE   VERSION
vps-1   Ready    control-plane,master   10m   v1.28.4+k3s2
vps-2   Ready    <none>                 2m    v1.28.4+k3s2
vps-3   Ready    <none>                 1m    v1.28.4+k3s2

```

### Perspectiva del SysAdmin y Desafíos

Dar el salto a Kubernetes, incluso en su versión ligera, cambia el paradigma de administración:

1. **Infraestructura Inmutable Requerida:** Ya no te conectas por SSH a un contenedor para arreglar algo. Actualizas el manifiesto YAML y el orquestador reemplaza el Pod.
2. **Almacenamiento Distribuido:** Si un Pod de base de datos se mueve del VPS 2 al VPS 3 debido a un fallo, sus datos deben ir con él. Esto requiere la integración de almacenamiento de red como NFS o Longhorn (basado en Block Storage y conceptos vistos en el Capítulo 4).
3. **Observabilidad Compleja:** Los logs ya no están en un solo host. Necesitarás imperativamente soluciones de agregación de logs como Loki y métricas con Prometheus, cubiertas en el Capítulo 8, para tener visibilidad de lo que ocurre en el cluster.

Con K3s, hemos transformado un conjunto de instancias aisladas en una infraestructura resiliente, auto-reparable y elástica, cerrando el ciclo evolutivo de la contenerización en entornos de Servidores Privados Virtuales.
