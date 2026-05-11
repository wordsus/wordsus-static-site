En un entorno de producción, la invisibilidad es el mayor riesgo para la continuidad del negocio. Operar Docker a nivel Senior exige trascender la ejecución de contenedores para dominar su observabilidad. Este capítulo analiza la tríada crítica: **Logging**, para entender el pasado mediante eventos; **Métricas**, para evaluar el presente con datos numéricos; y **Visualización**, para anticipar fallos. Aprenderás a orquestar arquitecturas donde el demonio de Docker deja de ser una caja negra, integrando stacks como EFK y Prometheus. Aquí, el objetivo es claro: transformar el ruido de miles de líneas de texto en inteligencia operativa accionable y dashboards de alto impacto.

## 9.1. Arquitectura de logging en Docker

En el desarrollo de aplicaciones contenerizadas, y siguiendo los principios de las aplicaciones de 12 factores (12-Factor Apps, que profundizaremos en el Capítulo 12), los contenedores no deben preocuparse por la gestión de sus propios archivos de registro. La aplicación simplemente debe emitir sus eventos hacia la salida estándar.

Aquí es donde entra en juego la arquitectura de logging de Docker: un mecanismo de intercepción, enrutamiento y entrega que captura los flujos de datos del contenedor y los delega a un sistema de gestión subyacente.

Para dominar Docker a un nivel Senior, es fundamental comprender que **Docker no es un sistema de almacenamiento de logs**, sino un intermediario (router).

### El flujo de los flujos: Intercepción de `stdout` y `stderr`

Cuando ejecutas un proceso como PID 1 dentro de un contenedor, cualquier evento que este proceso o sus subprocesos envíen a los descriptores de archivo de salida estándar (`stdout`) y error estándar (`stderr`) es interceptado por el demonio de Docker (`dockerd`).

El demonio toma estos flujos crudos, les añade metadatos vitales (como el ID del contenedor, marcas de tiempo y etiquetas) y los envía a través de un canal interno hacia el **Logging Driver** (Controlador de Registro) que esté configurado.

A continuación, un diagrama en texto plano que ilustra esta arquitectura:

```text
+---------------------------------------------------+
|                   Nodo Docker                     |
|                                                   |
|  +---------------------------------------------+  |
|  |                 Contenedor                  |  |
|  |  +---------------------------------------+  |  |
|  |  |           Proceso (PID 1)             |  |  |
|  |  |    (Ej: Nginx, Node.js, Python)       |  |  |
|  |  +-------------------+-------------------+  |  |
|  |                      |                      |  |
|  |                stdout/stderr                |  |
|  +----------------------|----------------------+  |
|                         v                         |
|  +---------------------------------------------+  |
|  |              Docker Daemon                  |  |
|  |                                             |  |
|  |   1. Captura de descriptores de archivo     |  |
|  |   2. Inyección de metadatos (timestamps)    |  |
|  |   3. Enrutamiento del mensaje               |  |
|  +----------------------|----------------------+  |
|                         v                         |
|  +---------------------------------------------+  |
|  |   Capa de Abstracción: Logging Drivers      |  |
|  |                                             |  |
|  |  [ json-file ] [ syslog ] [ fluentd ] ...   |  |
|  +----------------------|----------------------+  |
+-------------------------|-------------------------+
                          v
        +-----------------------------------+
        |      Destino Final de los Logs    |
        | (Disco local, Red, Agregador ELK) |
        +-----------------------------------+

```

Esta arquitectura basada en plugins (Logging Drivers) permite una flexibilidad absoluta. El contenedor es agnóstico al destino de sus logs; puedes cambiar el driver de almacenamiento local (`json-file`) a un recolector centralizado (`fluentd`) sin modificar una sola línea del código de tu aplicación ni alterar la imagen.

### El detalle crítico: Modos de entrega (Delivery Modes)

Uno de los problemas más comunes y difíciles de diagnosticar en entornos de producción ocurre cuando la arquitectura de logging se convierte en un cuello de botella. Docker soporta dos modos de entrega de logs desde el contenedor hacia el driver: **Blocking** (Bloqueante) y **Non-blocking** (No bloqueante). Conocer la diferencia separa a un operador junior de un senior.

**1. Modo Bloqueante (Blocking - El comportamiento por defecto)**
Por defecto, Docker envía los logs al driver de forma síncrona. Esto significa que si el driver no puede procesar el log inmediatamente (por ejemplo, si usas un driver `syslog` remoto y hay latencia en la red, o si el disco local tiene un alto I/O wait), **el proceso dentro del contenedor se bloquea**.

El proceso no podrá seguir escribiendo en `stdout/stderr` hasta que el daemon de Docker confirme que el log ha sido procesado. Esto puede causar que tu aplicación parezca estar "colgada" o que degrade severamente su rendimiento, todo por culpa del sistema de logs.

**2. Modo No Bloqueante (Non-blocking)**
Para entornos de alta disponibilidad, se recomienda encarecidamente cambiar a modo no bloqueante. En este modo, Docker escribe los logs en un búfer circular (Ring Buffer) en memoria. El driver lee de este búfer a su propio ritmo.

Si el driver es más lento que la velocidad a la que la aplicación genera logs y el búfer se llena, **Docker empezará a descartar los logs más antiguos** (drop) para permitir que la aplicación siga funcionando sin interrupciones. En un entorno de producción, es preferible perder algunas líneas de log antes que derribar la aplicación por completo.

A nivel de configuración global en el `daemon.json` (que vimos en el Capítulo 1), la implementación de esta arquitectura segura se vería así:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "mode": "non-blocking",
    "max-buffer-size": "4m"
  }
}

```

*Nota: El parámetro `max-buffer-size` define el tamaño de la memoria RAM dedicada al búfer circular por contenedor.*

### Resumen del ciclo de vida del log en memoria

En resumen, la arquitectura de logging de Docker prioriza el aislamiento. El contenedor expulsa la información, el demonio la intercepta, el búfer (si está configurado) la retiene temporalmente, y finalmente el driver se encarga de darle persistencia o transmitirla.

Entender este canal de comunicación es el primer paso. El siguiente es dominar las herramientas que procesan estos datos en el extremo final, lo cual nos lleva a explorar la configuración específica de los Logging Drivers.

## 9.2. Configuración de Logging Drivers (json-file, syslog, journald)

Comprendida la arquitectura de intercepción y el flujo de los datos, el siguiente paso crítico en la configuración de un nodo Docker es decidir qué hará el demonio con esos logs. Docker ofrece múltiples controladores de registro (*Logging Drivers*), pero en entornos de producción, tres opciones dominan el panorama: `json-file` (para retención local controlada), `journald` (para integración con el sistema operativo) y `syslog` (para cumplimiento y envíos remotos legacy).

A nivel Senior, la elección del driver no es solo una cuestión de preferencia, sino de impacto en el I/O del disco, retención legal y observabilidad del clúster.

### 1. `json-file`: El estándar (y su principal trampa)

`json-file` es el driver por defecto de Docker. Por cada línea que el contenedor emite a `stdout`/`stderr`, este driver crea un objeto JSON y lo escribe en un archivo físico dentro del host (típicamente en `/var/lib/docker/containers/<container-id>/`).

**La ventaja:** Es el único driver (junto con `journald` y `local`) que permite usar el comando `docker logs` de forma nativa sin configuraciones adicionales.
**El peligro (La trampa del Junior):** Por defecto, Docker **no rota** estos archivos. Un contenedor ruidoso crecerá su archivo JSON hasta consumir el 100% del espacio en disco del nodo, provocando una caída catastrófica del sistema.

Para un entorno DevOps maduro, si decides mantener `json-file`, la configuración de **rotación de logs es obligatoria**. Esto se define en el archivo `daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5",
    "compress": "true"
  }
}

```

En esta configuración, Docker creará archivos de hasta 100 MB. Cuando se alcance el límite, rotará el archivo y comprimirá los antiguos (ahorrando I/O y espacio), manteniendo un máximo de 5 archivos históricos. Si el contenedor genera más, los datos más antiguos se sobrescriben.

### 2. `journald`: Integración nativa con Systemd

En la mayoría de las distribuciones Linux modernas (Ubuntu, RHEL, Rocky Linux), `systemd` gestiona los servicios del sistema y utiliza `journald` para centralizar todos los logs del kernel y de las aplicaciones.

Al configurar Docker para usar el driver `journald`, el demonio deja de escribir archivos JSON propios y envía los flujos de los contenedores directamente al demonio de `journald` del host.

**¿Por qué usarlo?**

* **Gestión centralizada local:** Permite a los administradores de sistemas usar una única herramienta (`journalctl`) para ver tanto los logs del host como los de los contenedores.
* **Metadatos enriquecidos:** El driver inyecta automáticamente metadatos en el *journal*, como el ID del contenedor, el nombre, la imagen y variables de entorno específicas.
* **Rotación delegada:** Te olvidas de configurar la rotación en Docker; `journald` se encarga de purgar los datos antiguos según la configuración del sistema operativo (`/etc/systemd/journald.conf`).

Configuración en `daemon.json`:

```json
{
  "log-driver": "journald",
  "log-opts": {
    "labels": "env,version",
    "env": "os,customer"
  }
}

```

Una vez activo, puedes consultar los logs de un contenedor específico directamente desde el host usando filtros de *journalctl*:

```bash
# Ver logs de un contenedor por su nombre
journalctl CONTAINER_NAME=mi_app_backend -f

```

### 3. `syslog`: El estándar corporativo y de cumplimiento

Para infraestructuras empresariales con estrictos requisitos de auditoría y seguridad (Compliance), mantener los logs en el nodo físico es inaceptable. Si un atacante compromete el nodo, puede borrar los logs para cubrir sus rastros.

El driver `syslog` envía los logs desde el contenedor hacia un servidor Syslog local o, más comúnmente, a un servidor remoto (como un SIEM empresarial) utilizando UDP, TCP o TLS.

**El compromiso técnico (Trade-off):** Cuando configuras un contenedor para enviar logs a un destino remoto mediante `syslog` (u otros drivers como Fluentd o AWS CloudWatch), **el comando `docker logs <contenedor>` dejará de funcionar** y devolverá un error. Al no guardar los datos localmente, Docker no tiene de dónde leerlos. Acostumbrar al equipo de desarrollo a no depender de `docker logs` y buscar la información en el panel centralizado es un cambio cultural necesario en DevOps.

Configuración a nivel de contenedor (útil para pruebas o servicios específicos):

```bash
docker run -d \
  --log-driver syslog \
  --log-opt syslog-address=tcp://syslog-server.miempresa.internal:514 \
  --log-opt syslog-facility=daemon \
  --log-opt tag="{{.Name}}/{{.ID}}" \
  mi_imagen:latest

```

*Nota de seguridad:* Si los logs transitan por redes no confiables, es imperativo usar TCP con TLS (`syslog-address=tcp+tls://...`) para evitar ataques de *Man-in-the-Middle* o espionaje de información sensible (como variables de entorno o trazas de error que expongan lógica de negocio).

### Sobreescritura de Drivers (Global vs. Local)

Es vital recordar que el archivo `daemon.json` establece la política **global** para todos los contenedores nuevos. Sin embargo, Docker permite anular esta configuración a nivel de contenedor individual (mediante `--log-driver` en el CLI) o a nivel de servicio en Docker Compose.

Una práctica común de arquitectura híbrida es configurar `journald` a nivel global para todos los contenedores de infraestructura del nodo, pero inyectar configuraciones específicas de `syslog` o `fluentd` solo a los contenedores de aplicación críticos que requieren persistencia externa.

## 9.3. Centralización de logs: Integración con stack ELK/EFK o Fluentd

A medida que tu infraestructura crece de un único nodo a un clúster distribuido (ya sea con múltiples instancias autónomas, Docker Swarm o preparando el terreno para Kubernetes), depender de logs locales se convierte en un antipatrón. Si tienes 50 réplicas de un microservicio distribuidas en 10 servidores físicos, acceder por SSH a cada nodo para buscar un error usando `docker logs` o `journalctl` es inviable.

Aquí es donde la observabilidad a nivel Senior exige **centralización**. El objetivo es recolectar, transformar, indexar y visualizar todos los eventos en un único panel de control. Las dos arquitecturas rey en el ecosistema open-source son los stacks **ELK** y **EFK**.

### ELK vs. EFK: La evolución del recolector

Ambos stacks comparten el cerebro de almacenamiento y la interfaz visual, pero difieren en el componente de transporte (el "agregador"):

* **ELK (Elasticsearch, Logstash, Kibana):** El stack tradicional. **Logstash** es una herramienta extremadamente potente para la ingesta y mutación de datos, pero está construida sobre la JVM (Java Virtual Machine). Su consumo de memoria (overhead) es considerable, lo que lo hace poco ideal para ejecutarse como un agente ligero en cada nodo de Docker.
* **EFK (Elasticsearch, Fluentd / Fluent Bit, Kibana):** El estándar moderno (Cloud-Native). Logstash se reemplaza por **Fluentd** (escrito en Ruby y C) o **Fluent Bit** (escrito 100% en C). Son drásticamente más ligeros, consumen apenas unos pocos megabytes de RAM y están diseñados específicamente para infraestructuras contenerizadas.

Para entornos Docker, la integración mediante el driver nativo de **Fluentd** es la estrategia recomendada.

### Arquitectura de recolección con Fluentd

En un entorno Docker de producción, la arquitectura recomendada utiliza un modelo de reenvío en dos fases para asegurar la alta disponibilidad de los logs sin bloquear los contenedores:

```text
+-----------------------+        +-----------------------+
|      Nodo Docker 1    |        |      Nodo Docker 2    |
| [App A]       [App B] |        | [App C]       [App D] |
|   |             |     |        |   |             |     |
|   v             v     |        |   v             v     |
|  ( Docker Daemon )    |        |  ( Docker Daemon )    |
|          |            |        |          |            |
|          v            |        |          v            |
|  [ Agente Fluent Bit] |        |  [ Agente Fluent Bit] |
+----------|------------+        +----------|------------+
           |                                |
           +--------------+-----------------+
                          |  (Red: TCP/UDP)
                          v
            +---------------------------+
            |      Nodos Agregadores    |
            |     [ Cluster Fluentd ]   | <-- Filtrado, Enriquecimiento
            +-------------|-------------+
                          |
                          v
            +---------------------------+
            |   Almacenamiento e Índice |
            |    [ Elasticsearch ]      |
            +-------------|-------------+
                          |
                          v
            +---------------------------+
            |      Visualización        |
            |       [ Kibana ]          | <-- Búsquedas y Dashboards
            +---------------------------+

```

*Nota: En entornos más pequeños, los demonios de Docker pueden enviar directamente a un servidor Fluentd central, omitiendo el agente local Fluent Bit, aunque se sacrifica tolerancia a fallos de red.*

### Configuración del Driver Fluentd en Docker

Docker cuenta con un Logging Driver nativo para Fluentd. Cuando configuras un contenedor con este driver, el demonio empaqueta las líneas de `stdout`/`stderr` en eventos estructurados y los envía a un daemon de Fluentd (típicamente escuchando en el puerto `24224`).

Para configurar un servicio específico usando Docker Compose para que envíe sus logs a un servidor Fluentd:

```yaml
services:
  api_backend:
    image: mi_empresa/api-backend:v2.4
    ports:
      - "8080:8080"
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "tcp://fluentd.miempresa.internal:24224"
        tag: "api.backend.{{.ID}}"
        fluentd-async: "true"

```

**Parámetros clave explicados:**

* `fluentd-address`: La ubicación del recolector.
* `tag`: Fundamental para el enrutamiento. Fluentd usa etiquetas para decidir qué hacer con el log. Aquí usamos un template de Docker (`{{.ID}}`) para adjuntar el ID del contenedor dinámicamente.
* `fluentd-async: "true"`: Activa el modo no bloqueante específico del driver de Fluentd. Las llamadas se ejecutan en segundo plano, evitando que la aplicación se congele si Fluentd no responde.

### La regla de oro del Logging Senior: Logs Estructurados (JSON)

Mover los logs a Elasticsearch mediante Fluentd carece de valor real si los logs son simples cadenas de texto (Plain Text). Buscar la palabra `"Error"` en Kibana entre millones de líneas es ineficiente y propenso a falsos positivos.

Para aprovechar el stack EFK al máximo, la aplicación contenerizada **debe** emitir sus logs en formato JSON.

**Log tradicional (Pobre):**
`[2023-10-27 10:00:00] INFO Usuario 456 falló el login desde 192.168.1.50`

**Log estructurado (Senior):**
`{"timestamp": "2023-10-27T10:00:00Z", "level": "INFO", "event": "login_failed", "user_id": 456, "client_ip": "192.168.1.50"}`

Si tu contenedor escupe JSON, puedes configurar Fluentd para que analice (parse) la línea. Como resultado, Elasticsearch creará índices automáticos para `user_id` y `client_ip`. Esto te permite crear alertas instantáneas o dashboards en Kibana que respondan a preguntas complejas de negocio o seguridad, como: *"Muestra un gráfico circular de las IPs con más fallos de login en los últimos 10 minutos"*.

La centralización de logs es la base de la resolución reactiva de problemas (saber **por qué** algo falló). El siguiente pilar, que abordaremos a continuación, es la extracción de métricas, lo que nos permitirá una observabilidad proactiva (saber **cuándo** algo está a punto de fallar).

## 9.4. Extracción de métricas del demonio y de contenedores con Prometheus

Si la centralización de logs con EFK responde a la pregunta *"¿Por qué falló el sistema?"*, la extracción de métricas responde a *"¿Cuál es la salud actual del sistema y cuándo va a fallar?"*.

Para lograr esta visibilidad en arquitecturas modernas, el estándar de facto es **Prometheus**. A diferencia de los sistemas de logging donde el contenedor o el demonio *empujan* (push) los datos hacia un destino, Prometheus utiliza un modelo basado en **Pull** (extracción). Prometheus se conecta periódicamente a puntos de conexión HTTP específicos (endpoints, típicamente `/metrics`) expuestos por los servicios, descarga el estado actual de las métricas numéricas y las almacena en su base de datos de series temporales (TSDB).

Para monitorizar un nodo Docker a nivel Senior, debemos atacar el problema en dos frentes: el estado del motor (demonio) y el consumo de recursos de los contenedores.

### 1. Instrumentación del Demonio de Docker (Engine Metrics)

El propio motor de Docker es capaz de exponer métricas internas sobre su rendimiento y operaciones. Esto incluye la cantidad de contenedores en ejecución, pausados o detenidos, el rendimiento de las operaciones de lectura/escritura en disco, y estadísticas sobre la construcción de imágenes.

Por razones de seguridad, esta función está desactivada por defecto para no exponer información sensible del host. Para habilitarla, debemos modificar nuevamente el archivo de configuración del demonio (`/etc/docker/daemon.json`).

```json
{
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true
}

```

*Nota arquitectónica: Configurar `"0.0.0.0:9323"` expone las métricas en todas las interfaces de red del nodo. En un entorno de producción estricto, esto debe limitarse a la IP de la red interna de administración o protegerse mediante reglas de firewall, ya que el endpoint HTTP no cuenta con autenticación nativa.*

Una vez reiniciado el demonio (`systemctl restart docker`), el motor comenzará a servir métricas en formato compatible con Prometheus en `http://<IP_DEL_NODO>:9323/metrics`.

### 2. Extracción de métricas de los contenedores (El rol de cAdvisor)

El demonio de Docker nos dice cómo está el motor, pero es bastante escueto respecto al consumo granular de cada contenedor (CPU, memoria, I/O de red y disco por proceso). Aunque el comando `docker stats` nos da esta información en vivo, no guarda un histórico ni expone un endpoint de Prometheus nativo.

Para solucionar esto, el ecosistema utiliza **Exportadores** (Exporters). Un exportador es un agente ligero que traduce estadísticas de un sistema a formato Prometheus. Para los contenedores, la herramienta estándar de la industria es **cAdvisor** (Container Advisor), desarrollado por Google.

cAdvisor se despliega como un contenedor más en el host. Se le otorgan permisos de solo lectura (bind mounts) a los sockets y directorios del sistema de control de grupos (`cgroups`) del host Linux, lo que le permite inspeccionar el uso de recursos de todos los demás contenedores a nivel de kernel.

### 3. Configuración del "Scrape" en Prometheus

Con el demonio exponiendo sus métricas en el puerto 9323 y cAdvisor inspeccionando los contenedores y exponiendo sus datos (típicamente en el puerto 8080), el siguiente paso es configurar el servidor Prometheus para que extraiga ("scrape") esta información.

Esto se define en el archivo de configuración `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s # Frecuencia de extracción

scrape_configs:
  # Trabajo para extraer métricas del motor de Docker
  - job_name: 'docker-daemon'
    static_configs:
      - targets: ['10.0.0.50:9323'] # IP del nodo Docker

  # Trabajo para extraer métricas de recursos de los contenedores
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['10.0.0.50:8080']

  # (Opcional) Trabajo para métricas de la propia aplicación
  - job_name: 'app-backend'
    static_configs:
      - targets: ['10.0.0.50:3000']

```

### Arquitectura de Extracción (Pull Model)

Para visualizar cómo interactúan estos componentes sin afectar el rendimiento de los contenedores de aplicación, observa el siguiente diagrama del flujo de extracción:

```text
                               +---------------------------------------+
                               |              NODO DOCKER              |
+-------------------+          |                                       |
|                   |          |  +------------------+                 |
|                   |  Pull    |  |  Docker Daemon   |                 |
|                   | <-----------|  (Puerto 9323)   |                 |
|                   |  (15s)   |  +------------------+                 |
|   Servidor        |          |                                       |
|  Prometheus       |          |  +------------------+     Lectura     |
|  (TSDB)           |  Pull    |  | cAdvisor         | --- de cgroups -+
|                   | <-----------| (Puerto 8080)    |                 |
|                   |  (15s)   |  +------------------+                 |
|                   |          |                                       |
+-------------------+          |  +------------------+                 |
                               |  | Contenedor App 1 |                 |
                               |  +------------------+                 |
                               |  +------------------+                 |
                               |  | Contenedor App 2 |                 |
                               |  +------------------+                 |
                               +---------------------------------------+

```

Al utilizar este modelo, delegamos completamente la responsabilidad del monitoreo a una infraestructura externa. Si el servidor Prometheus cae o la red se satura, las aplicaciones y el demonio de Docker continúan operando con total normalidad, simplemente los datos de ese intervalo de 15 segundos no se recopilan.

Con millones de puntos de datos siendo recolectados e indexados constantemente por Prometheus, el desafío final de la observabilidad es hacer que estos números en bruto sean comprensibles y útiles para la toma de decisiones humanas. Esto nos prepara para integrar la capa de visualización.

## 9.5. Visualización del rendimiento de contenedores en Grafana (cAdvisor)

Tener millones de puntos de datos almacenados en Prometheus (como vimos en la sección 9.4) es inútil si no podemos interpretarlos rápidamente durante un incidente. **Grafana** es la pieza final del rompecabezas de la observabilidad métrica: una plataforma de visualización open-source que se conecta a Prometheus (y a otras fuentes de datos como Elasticsearch) para transformar series temporales complejas en paneles de control (Dashboards) interactivos.

A un nivel Senior, el objetivo no es crear gráficos bonitos, sino construir herramientas visuales que revelen el comportamiento del sistema a simple vista y reduzcan el Tiempo Medio de Recuperación (MTTR).

### La Arquitectura de Visualización

El flujo de información se completa de la siguiente manera:

```text
+-------------------+       +-------------------+       +-------------------+
|  Nodos Docker     |       | Base de Datos     |       | Capa Visual       |
|  (cAdvisor)       | ----> | (Prometheus)      | ----> | (Grafana)         |
|  Expone métricas  | Pull  | Almacena e indexa | Query | Evalúa PromQL     |
|  en puerto 8080   |       | en puerto 9090    |       | Renderiza paneles |
+-------------------+       +-------------------+       +-------------------+
                                                              |
                                                              v
                                                    +-------------------+
                                                    | Ingeniero DevOps  |
                                                    | (Navegador Web)   |
                                                    +-------------------+

```

### Aprovisionamiento como Código (Dashboard as Code)

Un error común en perfiles Junior es configurar Grafana haciendo clics en la interfaz de usuario (UI). Esto rompe el principio de Infraestructura Inmutable. Si el contenedor de Grafana se destruye, se pierden los Dashboards.

En una operación madura, Grafana se configura mediante **aprovisionamiento automático**. Inyectamos archivos YAML y JSON directamente al contenedor (mediante *Bind Mounts* o *ConfigMaps* en el futuro si migramos a Kubernetes) para definir tanto las fuentes de datos (Data Sources) como los paneles.

Ejemplo conceptual de la configuración de un Data Source aprovisionado (`datasource.yml`):

```yaml
apiVersion: 1
datasources:
  - name: Prometheus-Produccion
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false # Bloquea cambios manuales en la UI

```

### Métricas Críticas: De la recolección al PromQL

Para visualizar el rendimiento de los contenedores usando los datos de cAdvisor, utilizamos **PromQL** (Prometheus Query Language). A continuación, analizamos las tres visualizaciones fundamentales que todo panel de control Docker debe tener, y el razonamiento técnico detrás de ellas.

**1. Uso de CPU vs. CPU Throttling (Estrangulamiento)**
Monitorizar simplemente "cuánta CPU usa un contenedor" es insuficiente. Debido a cómo funcionan los *cgroups* de Docker, si un contenedor tiene un límite de CPU (`--cpus="1.5"`) y lo alcanza, el kernel de Linux no lo matará, sino que aplicará *throttling* (lo pausará por microsegundos). Esto causa latencias altísimas en la aplicación que son difíciles de diagnosticar.

* **Query para Uso de CPU (Núcleos):**

```promql
sum(rate(container_cpu_usage_seconds_total{container_name!="POD", image!=""}[5m])) by (name)

```

* **Query Senior para detectar Throttling (Porcentaje de tiempo estrangulado):**

```promql
sum(rate(container_cpu_cfs_throttled_periods_total[5m])) by (name) 
/ 
sum(rate(container_cpu_cfs_periods_total[5m])) by (name) * 100

```

*Visualización recomendada en Grafana: Gráfico de líneas (Line chart). Si esta métrica sube del 5%, tu aplicación está sufriendo micro-pausas y necesitas ajustar los límites.*

**2. Saturación de Memoria y Riesgo de OOM (Out Of Memory)**
A diferencia de la CPU, si un contenedor supera su límite de memoria, el kernel de Linux invoca al *OOM Killer* y destruye el proceso sin previo aviso (tema que profundizaremos en el Capítulo 10). No nos interesa tanto la memoria bruta consumida, sino **qué tan cerca está el contenedor de su límite**.

* **Query para Saturación de Memoria (%):**

```promql
(container_memory_working_set_bytes{image!=""} 
/ 
container_spec_memory_limit_bytes{image!=""}) * 100 != +inf

```

*Visualización recomendada: Medidor (Gauge) o Tabla con formato condicional (Rojo si > 85%, Naranja si > 70%). Excluimos valores de infinito (`!= +inf`) porque los contenedores sin límite definido en Docker reportan su límite como el máximo del sistema.*

**3. Tráfico de Red y Errores (Network I/O)**
Un pico repentino en la transferencia de red puede indicar un ataque DDoS, un bucle de reintentos infinito entre microservicios, o un problema de I/O bloqueante.

* **Query para Ancho de Banda Transmitido (Bytes/seg):**

```promql
sum(rate(container_network_transmit_bytes_total{image!=""}[5m])) by (name)

```

### De la Visualización a la Acción (Alerting)

Grafana no solo visualiza; también evalúa. La arquitectura final implica configurar reglas de alerta directamente sobre estos paneles. Por ejemplo, si el PromQL de *Saturación de Memoria* supera el 90% durante más de 5 minutos, Grafana enviará un *webhook* a Slack, Microsoft Teams o PagerDuty.

Con el stack de Logging (EFK) para el análisis post-mortem de errores, y el stack de Métricas (Prometheus + Grafana + cAdvisor) para el monitoreo proactivo del rendimiento de los contenedores, el ecosistema adquiere un nivel de observabilidad de grado empresarial.

Con esta visibilidad garantizada, estamos listos para adentrarnos en el Capítulo 10: tomar el control riguroso de estos recursos, optimizar el nodo a escala y establecer límites duros para proteger la infraestructura.
