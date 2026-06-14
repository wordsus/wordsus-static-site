Un clúster de Kubernetes sin observabilidad es una caja negra donde el fallo es inevitable y el diagnóstico, imposible. En este capítulo, elevamos el estándar de nuestras cargas de trabajo desde el "funciona" hasta el "es confiable". Exploraremos cómo las **Probes de salud** permiten la auto-recuperación, y cómo el *Golden Stack* de **Prometheus, Grafana y Alertmanager** nos otorga ojos sobre el consumo de recursos. Analizaremos la diferencia crítica entre métricas de estado y de uso, la centralización de logs con arquitecturas modernas como **Loki**, y el rastreo de peticiones complejas mediante **OpenTelemetry**. Aquí, la infraestructura deja de ser invisible para volverse auditable.

## 9.1 Probes de Salud: Liveness, Readiness y Startup Probes

Como vimos en el Capítulo 2 al analizar el ciclo de vida de un Pod, que un contenedor alcance el estado `Running` simplemente indica que el *container runtime* (como containerd) logró iniciar el proceso principal (el PID 1). Sin embargo, esto **no garantiza** que la aplicación esté respondiendo correctamente, que no haya caído en un *deadlock* o que esté lista para recibir tráfico de red.

Para que Kubernetes pueda tomar decisiones inteligentes de auto-recuperación (*self-healing*) y enrutamiento, necesita entender el estado interno de nuestra aplicación. Aquí es donde el `kubelet` de cada nodo entra en acción utilizando los **Probes** (o sondas de salud).

Existen tres tipos fundamentales de probes, cada uno con un propósito y una acción correctiva distinta:

### 1. Liveness Probe (Sonda de Vitalidad)

**Pregunta que responde:** *¿La aplicación está colgada o muerta?*
**Acción si falla:** El `kubelet` finaliza el contenedor y lo reinicia basándose en la política de reinicio del Pod (`restartPolicy`).

Las Liveness Probes están diseñadas para atrapar bloqueos irrecuperables. Por ejemplo, si tu aplicación sufre una fuga de memoria o un *deadlock* en un hilo crítico, el proceso principal puede seguir ejecutándose (PID 1 activo), pero la aplicación es incapaz de procesar peticiones. La Liveness Probe detecta esto y reinicia el contenedor para devolverlo a un estado limpio.

### 2. Readiness Probe (Sonda de Disponibilidad)

**Pregunta que responde:** *¿La aplicación está lista para recibir tráfico de usuarios?*
**Acción si falla:** El controlador de *Endpoints* elimina la dirección IP del Pod de todos los *Services* (vistos en el Capítulo 4) que lo exponen. **No reinicia el contenedor.**

Un contenedor puede estar "vivo" pero no "listo". Quizás está cargando un gran volumen de datos en caché al iniciar, o su conexión a la base de datos se interrumpió temporalmente y está reintentando. Enviar tráfico a este Pod resultaría en errores 50x para el usuario. La Readiness Probe aísla al Pod del Service de red hasta que vuelva a estar saludable.

### 3. Startup Probe (Sonda de Arranque)

**Pregunta que responde:** *¿La aplicación ya terminó su pesada secuencia de inicio?*
**Acción si falla:** El contenedor se reinicia.
**Comportamiento especial:** Mientras la Startup Probe se está ejecutando, **deshabilita temporalmente** las Liveness y Readiness Probes.

Esta sonda es vital para aplicaciones *legacy* o pesadas (como ciertos monolitos en Java o .NET) que pueden tardar varios minutos en arrancar. Si usáramos una Liveness Probe en estas aplicaciones, podría fallar repetidamente durante el inicio, causando un bucle infinito de reinicios antes de que la aplicación tenga oportunidad de arrancar.

---

### Mecanismos de Comprobación (Handlers)

Para cualquiera de los tres probes, Kubernetes ofrece cuatro formas de realizar la verificación:

| Mecanismo | Descripción | Éxito |
| --- | --- | --- |
| **HTTP GET** | Realiza una petición HTTP a una ruta y puerto especificados del contenedor (ej. `/healthz`). | Código de respuesta entre `200` y `399`. |
| **TCP Socket** | Intenta abrir una conexión TCP en un puerto específico. | La conexión se establece correctamente. |
| **Exec** | Ejecuta un comando directamente dentro del sistema de archivos del contenedor. | El comando finaliza con código de salida `0`. |
| **gRPC** | Utiliza el protocolo estándar de salud de gRPC (soportado nativamente desde K8s 1.24+). | El servicio responde con el estado `SERVING`. |

---

### Parámetros de Configuración

El ajuste fino de los probes es esencial. Un probe mal configurado puede ser peor que no tener probes, causando caídas en cascada.

* **`initialDelaySeconds`**: Tiempo que el kubelet espera antes de ejecutar el probe por primera vez tras iniciar el contenedor. *(Nota: Si usas Startup Probe, este valor puede mantenerse bajo en Liveness/Readiness).*
* **`periodSeconds`**: Frecuencia con la que se ejecuta el probe (por defecto: 10s).
* **`timeoutSeconds`**: Tiempo máximo que se espera una respuesta antes de considerar el intento como fallido (por defecto: 1s).
* **`successThreshold`**: Número de aciertos consecutivos para considerar que el probe pasó de "fallido" a "exitoso" (por defecto: 1, y debe ser 1 para Liveness/Startup).
* **`failureThreshold`**: Número de fallos consecutivos antes de tomar acción (reiniciar o aislar). Por defecto es 3.

### Flujo de Decisión de los Probes

A continuación, un diagrama esquemático que ilustra cómo el `kubelet` interactúa con los probes durante el ciclo de vida del contenedor:

```text
[Inicio del Contenedor]
          |
          v
  ¿Tiene Startup Probe configurado?
     /                  \
   SÍ                   NO
   /                      \
[Ejecuta Startup]          |
¿Alcanza failureThreshold? |
  |                        |
  |-->(SÍ) REINICIA        |
  |                        |
  |-->(NO) ÉXITO ----------+
                           |
                           v
      +-------------------------------------------+
      |        Bucle Continuo del Kubelet         |
      |                                           |
      |  [Liveness Probe]     [Readiness Probe]   |
      |      ¿Falla?               ¿Falla?        |
      |         |                     |           |
      |   (SÍ) REINICIA        (SÍ) RETIRA IP     |
      |                        DEL SERVICE        |
      +-------------------------------------------+

```

---

### Implementación en Código (Ejemplo Completo)

Veamos cómo se integran estas tres sondas en la especificación de un Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: app-container
        image: mi-registro/api-backend:v1.2
        ports:
        - containerPort: 8080
        
        # 1. STARTUP PROBE: Da hasta 3 minutos (30 * 6s) para iniciar
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          failureThreshold: 30
          periodSeconds: 6

        # 2. LIVENESS PROBE: Verifica peso ligero cada 10s
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 8080
          failureThreshold: 3
          periodSeconds: 10
          timeoutSeconds: 2

        # 3. READINESS PROBE: Verifica conexiones a dependencias
        readinessProbe:
          exec:
            command: ["/bin/sh", "-c", "mysqladmin ping -h localhost"]
          failureThreshold: 2
          periodSeconds: 5
          successThreshold: 1

```

> **Consejo de Arquitecto (Senior Tip):** > Un antipatrón muy común es hacer que el **Liveness Probe** verifique dependencias externas (como la disponibilidad de una base de datos). Si la base de datos sufre una micro-caída, los Liveness Probes de *todos* tus Pods fallarán, causando un reinicio masivo de tu flota entera de microservicios, lo que saturará aún más la base de datos cuando intente recuperarse.
> **Regla de oro:** El Liveness Probe debe verificar **estrictamente** el estado interno del microservicio (ej. ¿Puede mi servidor web devolver un simple HTTP 200 en `/ping`?). Las dependencias externas solo deben evaluarse en el **Readiness Probe** para aislar al Pod mientras el servicio de terceros se recupera.

## 9.2 Arquitectura de Monitoreo: Prometheus, Alertmanager y Grafana

En el ecosistema de Kubernetes, el monitoreo no es opcional; es la base de la confiabilidad. Mientras que los *Probes* (sección 9.1) actúan a nivel local en el nodo, necesitamos un sistema centralizado que recolecte datos históricos, identifique tendencias y nos avise antes de que un problema afecte al usuario final.

La tríada compuesta por **Prometheus**, **Alertmanager** y **Grafana** se ha convertido en el estándar *de facto* (el "Golden Stack") debido a su naturaleza nativa de nube y su capacidad para escalar junto con el clúster.

### 1. Prometheus: El Cerebro Métrico

Prometheus es un sistema de monitoreo y alertas de código abierto que almacena datos en una base de datos de series temporales (**TSDB**). Su arquitectura rompe con el modelo tradicional de "Push" (donde los agentes envían datos a un servidor) y utiliza un modelo de **Pull** (o raspado/scraping).

#### Componentes clave de Prometheus

* **Prometheus Server:** Se encarga de descubrir los objetivos (*Service Discovery*), realizar el raspado de métricas vía HTTP y almacenar los datos.
* **TSDB (Time Series Database):** Almacena las métricas eficientemente usando etiquetas (*labels*) para dar multidimensionalidad a los datos.
* **PromQL:** Un lenguaje de consulta potente que permite agregar y filtrar métricas en tiempo real.
* **Pushgateway:** Un componente auxiliar para cargas de trabajo efímeras (como Jobs o CronJobs) que no viven lo suficiente para ser "raspadas".

### 2. Alertmanager: El Gestor de Notificaciones

Prometheus detecta que algo anda mal mediante el procesamiento de **Alerting Rules**, pero no envía correos ni mensajes de Slack por sí solo. Esa responsabilidad recae en **Alertmanager**.

Alertmanager recibe las alertas de Prometheus y aplica una lógica de post-procesamiento esencial para evitar la "fatiga de alertas":

* **Agrupamiento (Grouping):** Si 50 pods de un microservicio fallan, no quieres 50 mensajes. Alertmanager los agrupa en una sola notificación.
* **Inhibición (Inhibition):** Si el clúster entero está caído, no necesitas alertas de que las aplicaciones individuales no responden. La alerta de "Clúster Caído" inhibe las demás.
* **Silenciamiento (Silences):** Permite mutear alertas durante ventanas de mantenimiento programadas.

### 3. Grafana: La Capa de Visualización

Si Prometheus es la base de datos, Grafana es la interfaz. Es una plataforma analítica que permite consultar, visualizar y explorar métricas independientemente de dónde estén almacenadas.

En el contexto de Kubernetes, Grafana brilla por su capacidad de importar *dashboards* de la comunidad (como el famoso "Kubernetes / Compute Resources / Cluster") que proporcionan visibilidad inmediata de CPU, memoria y red sin tener que escribir una sola línea de PromQL desde cero.

---

### Flujo de Datos y Arquitectura

El siguiente diagrama muestra cómo interactúan estos componentes dentro y fuera del clúster:

```text
       [ APP POD ] <--- (Scrape /metrics) --- [ PROMETHEUS SERVER ] <--- [ GRAFANA ]
       [ APP POD ]                               | (Alerts)           (Dashboards)
                                                 v
    [ EXPORTERS ] <--- (Scrape) -------- [ ALERTMANAGER ]
    (Node, MySQL)                                |
                                                 +---> [ SLACK / PAGERDUTY / EMAIL ]

```

### El Modelo de Descubrimiento (Service Discovery)

A diferencia de los sistemas estáticos, Prometheus en Kubernetes utiliza el **Service Discovery** nativo del API Server. No necesitas configurar manualmente cada IP de cada Pod. Prometheus consulta al API Server para encontrar Pods o Services que tengan anotaciones específicas, por ejemplo:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/metrics"

```

### Ejemplo de Configuración: Prometheus Rule

Para que una alerta llegue a Alertmanager, primero debemos definir una regla en Prometheus usando PromQL:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: high-cpu-usage
spec:
  groups:
  - name: example-alerts
    rules:
    - alert: PodHighCPU
      expr: sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate) by (pod) > 0.95
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Alto uso de CPU en el pod {{ $labels.pod }}"
        description: "El pod ha superado el 95% de uso de CPU durante más de 5 minutos."

```

> **Consejo de Arquitecto (Senior Tip):** > Aunque puedes instalar cada componente por separado, en entornos de producción la recomendación es utilizar el **kube-prometheus-stack** (vía Helm) o el **Prometheus Operator**. Estos gestionan la configuración compleja (como los certificados TLS para el scraping seguro y la persistencia de datos) mediante Custom Resource Definitions (CRDs) como `ServiceMonitor` y `PrometheusRule`, lo que permite un enfoque de "Monitoreo como Código" totalmente integrado en el ciclo de vida de tus aplicaciones.

## 9.3 Kube-state-metrics y Metrics Server

En la sección anterior establecimos a Prometheus como el "cerebro" de nuestra arquitectura de observabilidad. Sin embargo, Prometheus por sí solo no sabe nada sobre Kubernetes; necesita agentes u objetivos (*endpoints*) de los cuales extraer información.

Cuando hablamos de monitorear un clúster de Kubernetes, existen dos fuentes de datos fundamentales que a menudo se confunden, pero que tienen arquitecturas y propósitos completamente distintos: **Metrics Server** y **Kube-state-metrics (KSM)**.

Entender la diferencia entre ambos es una pregunta clásica en entrevistas para roles DevOps/SRE y un conocimiento obligatorio para operar clústeres en producción.

---

### 1. Metrics Server: El Pulso de los Recursos

El **Metrics Server** es el agregador central de datos de uso de recursos (*resource usage*) en el clúster. Es el sucesor del antiguo y obsoleto `Heapster`.

Su función principal es responder a una pregunta muy específica: **¿Cuánta CPU y Memoria están consumiendo mis Nodos y Pods en este momento exacto?**

#### Características Clave

* **Estructura en Memoria:** Metrics Server no es una base de datos. Solo mantiene en memoria la última ventana de tiempo de las métricas. No sirve para ver cuánto consumió un Pod ayer.
* **Integración Nativa (Aggregation Layer):** Se integra directamente en la API de Kubernetes extendiéndola (expone la API `metrics.k8s.io`).
* **Consumidores Principales:** 1. El usuario humano a través de los comandos `kubectl top nodes` y `kubectl top pods`.

1. Los controladores de autoescalado, específicamente el **Horizontal Pod Autoscaler (HPA)** y el **Vertical Pod Autoscaler (VPA)** (que veremos a fondo en el Capítulo 10).

#### ¿Cómo funciona?

Metrics Server no habla directamente con los contenedores. Se comunica con la API de cada `kubelet` en los nodos trabajadores. El `kubelet`, a su vez, utiliza un componente interno llamado **cAdvisor** (Container Advisor) que interactúa con el kernel de Linux (cgroups) para medir el uso real de CPU y memoria.

---

### 2. Kube-state-metrics (KSM): El Estado Declarativo

Mientras que Metrics Server mide el "esfuerzo físico" (CPU/RAM), **Kube-state-metrics** mide el "estado administrativo" de los objetos de Kubernetes.

KSM se dedica a escuchar a la API de Kubernetes y traduce el estado de tus manifiestos (el YAML/JSON que vimos en el Capítulo 2) a un formato de métricas tabulares que Prometheus puede entender y raspar (*scrape*).

#### ¿Qué preguntas responde KSM?

* ¿Cuántas réplicas de este Deployment están configuradas vs. cuántas están realmente disponibles?
* ¿Cuántos Pods están actualmente en estado `CrashLoopBackOff` o `Pending`?
* ¿Hay algún Nodo cuyo estado de condición `Ready` sea `False`?
* ¿Están mis Persistent Volume Claims (PVCs) atados (`Bound`) correctamente a sus volúmenes?

#### Ejemplo de Métrica (Formato Prometheus)

KSM genera métricas con el prefijo `kube_`. Por ejemplo, si tienes un Deployment configurado con 3 réplicas pero solo 2 están funcionando, KSM expondrá:

```text
kube_deployment_spec_replicas{deployment="api-backend", namespace="prod"} 3
kube_deployment_status_replicas_available{deployment="api-backend", namespace="prod"} 2

```

A partir de esto, puedes crear una alerta en Alertmanager si la métrica de disponibles es menor a la especificada.

---

### Resumen Arquitectónico: El Flujo de Datos

El siguiente diagrama en texto plano ilustra cómo se posicionan ambos componentes en el clúster y quién consume sus datos:

```text
                                +-----------------------+
                                |  KUBERNETES API SERVER|
                                +-----------------------+
                                  ^                   | (Watch de eventos/estado)
        (Consulta de métricas     |                   v
         vía Aggregation Layer)   |            +----------------------+
                                  |            | KUBE-STATE-METRICS   |
                                  |            | (Genera serie de     |
 +------------------+             |            |  tiempo estáticas)   |
 |  HPA / VPA       | ----> [ METRICS SERVER ] +----------------------+
 |  (Autoescalado)  |             ^                       ^
 +------------------+             |                       | (Scrape HTTP /metrics)
                                  |                       |
 +------------------+             |            +----------------------+
 |  Desarrollador   |             |            |      PROMETHEUS      |
 |  (kubectl top)   |             |            |  (Almacenamiento y   |
 +------------------+             |            |   Alertas)           |
                                  |            +----------------------+
                     (Recolecta uso de recursos)
                                  |
                   +--------------------------------+
                   | NODE (Kubelet -> cAdvisor)     |
                   |   [ Pod 1 ]   [ Pod 2 ]        |
                   +--------------------------------+

```

### Tabla Comparativa Rápida

| Característica | Metrics Server | Kube-state-metrics (KSM) |
| --- | --- | --- |
| **Tipo de Datos** | Uso de recursos (CPU, Memoria). | Estado de objetos (Pods, Deployments, Nodos). |
| **Origen de Datos** | `kubelet` / `cAdvisor` en los Nodos. | `API Server` (etcd). |
| **Persistencia** | Ninguna (Solo en memoria en tiempo real). | Ninguna directamente, depende de Prometheus para el historial. |
| **Consumidor Principal** | HPA, VPA, CLI (`kubectl top`). | Prometheus, Grafana, Alertmanager. |
| **Formato de Salida** | API de Kubernetes (`metrics.k8s.io`). | Texto plano (Formato Exposición Prometheus). |

> **Consejo de Arquitecto (Senior Tip):** > En clústeres muy grandes (miles de Pods y cientos de Nodos), Kube-state-metrics puede convertirse en un cuello de botella de memoria y CPU, ya que debe mantener el estado de todos los objetos del clúster simultáneamente. Para mitigar esto a nivel Senior, KSM soporta **Sharding** (Fragmentación). Puedes desplegar KSM en modo *sharded*, lo que permite dividir la carga de trabajo entre múltiples réplicas de KSM, cada una observando una porción del clúster (basado en el hash del nombre de los objetos), optimizando así el rendimiento del monitoreo masivo.

## 9.4 Centralización de Logs: Fluentd, Fluent Bit, Promtail y Loki

En un entorno tradicional de servidores virtuales, investigar un error solía implicar conectarse por SSH a la máquina y ejecutar `tail -f /var/log/nginx/error.log`. En Kubernetes, este enfoque es insostenible.

Como vimos en el Capítulo 2, los Pods son entidades **efímeras**. Si un Pod falla y el *kubelet* lo elimina o lo reinicia, los archivos de registro locales de ese contenedor desaparecen con él. Por lo tanto, extraer los logs del nodo donde se generan y enviarlos a un sistema de almacenamiento persistente no es una mejora, es una necesidad absoluta.

A este patrón arquitectónico se le conoce como **Centralización de Logs**, y generalmente se implementa desplegando un agente recolector en cada nodo del clúster utilizando un *DaemonSet* (visto en el Capítulo 3).

---

### La Arquitectura de Logging en Kubernetes

Kubernetes no proporciona una solución de almacenamiento de logs nativa. Su única responsabilidad es capturar lo que los contenedores envían a la salida estándar (`stdout`) y salida de error (`stderr`), y guardarlo en archivos de texto en el sistema de archivos del nodo (típicamente bajo `/var/log/containers/`).

El flujo estándar funciona de la siguiente manera:

```text
[ NODO TRABAJADOR ]
  |
  |-- Pod A (stdout/stderr) ---> /var/log/containers/podA...log
  |-- Pod B (stdout/stderr) ---> /var/log/containers/podB...log
  |
  +-- [ Agente Recolector (DaemonSet: Fluent Bit o Promtail) ]
            | (Lee archivos, parsea, enriquece con metadatos de K8s)
            v
[ ALMACENAMIENTO CENTRALIZADO ]
(Loki, Elasticsearch, OpenSearch)
            |
            v
   [ VISUALIZACIÓN ]
   (Grafana, Kibana)

```

El "enriquecimiento" es una fase crucial. Un archivo de log crudo en el nodo solo contiene texto y un ID de contenedor. El agente recolector se comunica con la API de Kubernetes para inyectar contexto valioso a cada línea de log: ¿De qué Namespace viene? ¿Cuál es el nombre del Pod? ¿Qué *Labels* tiene asignados?

### Los Agentes Recolectores (Shippers)

El ecosistema nativo de nube ofrece múltiples herramientas para la recolección. Veamos las tres más utilizadas en entornos de producción:

#### 1. Fluentd: El Veterano

Desarrollado originalmente en Ruby (y C), Fluentd fue el primer gran estándar para la recolección de logs en Kubernetes. Su mayor ventaja es su masivo ecosistema de plugins; si necesitas enviar logs a un destino oscuro o propietario, casi seguro existe un plugin para Fluentd.
Sin embargo, su huella de memoria es relativamente alta, lo que llevó a la creación de su hermano menor.

#### 2. Fluent Bit: El Estándar Moderno

Escrito completamente en C, Fluent Bit fue diseñado desde cero para ser ultraligero y de alto rendimiento. Consume una fracción de la memoria y CPU que requiere Fluentd, lo que lo convierte en la opción ideal para ejecutarse como *DaemonSet* en cada nodo del clúster.
Hoy en día, la arquitectura recomendada (incluso por AWS y GCP) es usar Fluent Bit en los nodos para la recolección, y (si es necesario un enrutamiento muy complejo) enviarlos a un clúster central de Fluentd antes del almacenamiento final.

#### 3. Promtail: El Compañero de Loki

Promtail es el agente diseñado específicamente por Grafana Labs para alimentar a Loki. Su principal diferenciador es que descubre los Pods y extrae sus *Labels* utilizando exactamente los mismos mecanismos de *Service Discovery* que Prometheus. Esto garantiza que las etiquetas de tus métricas (Prometheus) y las etiquetas de tus logs (Loki) sean idénticas, facilitando la correlación de eventos.

---

### Loki: Almacenamiento Eficiente de Logs

Históricamente, el estándar de la industria para almacenar logs era el stack **ELK** (Elasticsearch, Logstash, Kibana). Elasticsearch es un motor de búsqueda de texto completo extremadamente potente, pero esa potencia tiene un costo: indexar cada palabra de cada línea de log requiere enormes cantidades de memoria, CPU y almacenamiento costoso.

**Loki** nació bajo una premisa diferente: *"Como Prometheus, pero para logs"*.

Loki **no indexa el texto completo** de los logs. En su lugar, solo indexa los metadatos (las etiquetas o *labels* extraídas por Promtail o Fluent Bit) y comprime el texto bruto en bloques eficientes que guarda en almacenamiento de objetos económico (como Amazon S3 o Google Cloud Storage).

#### Ventajas de la Arquitectura de Loki

* **Costo-eficiencia extrema:** Al no usar almacenamiento en bloque de alto rendimiento (EBS) ni crear índices masivos, operar Loki cuesta una fracción en comparación con un clúster de Elasticsearch.
* **Correlación nativa en Grafana:** Al usar las mismas etiquetas que Prometheus, puedes estar viendo un pico de CPU en un gráfico de Grafana y, con un solo clic, ver los logs exactos de los Pods que causaron ese pico en esa misma ventana de tiempo.
* **LogQL:** Utiliza un lenguaje de consulta (LogQL) inspirado en PromQL, lo que reduce la curva de aprendizaje para los equipos que ya dominan Prometheus.

### Comparativa de Recolectores

| Característica | Fluentd | Fluent Bit | Promtail |
| --- | --- | --- | --- |
| **Lenguaje base** | Ruby / C | C | Go |
| **Uso de Recursos** | Alto (~40-100MB+ RAM) | Muy Bajo (~1-5MB RAM) | Moderado (~20-40MB RAM) |
| **Ecosistema de Plugins** | Masivo (1000+) | Excelente (Nativo) | Limitado (Enfocado en Loki) |
| **Destino principal** | Elasticsearch, Splunk, S3 | Elasticsearch, Loki, Kafka | Grafana Loki |
| **Caso de Uso Ideal** | Agregador central (Heavy log routing). | Agente por nodo (DaemonSet ligero). | Clústeres que ya usan Prometheus/Loki. |

> **Consejo de Arquitecto (Senior Tip):** > El mayor dolor de cabeza en la centralización de logs son los **Stack Traces** (típicos en aplicaciones Java o Python), donde un solo error genera 50 líneas de log distintas. Por defecto, tu recolector tratará cada línea como un evento separado, arruinando la legibilidad en el sistema central.
> Es imperativo que configures **multiline parsers** en Fluent Bit o Promtail. Esto permite al agente identificar (generalmente mediante una expresión regular que busca marcas de tiempo al inicio de la línea) cuándo un bloque de líneas de texto pertenece a un único error consolidado antes de enviarlo a Loki o Elasticsearch. Aún mejor: configura tus aplicaciones para que emitan logs en formato JSON estructurado; esto elimina por completo la necesidad de *parsing* complejo a nivel de infraestructura.

## 9.5 Trazabilidad Distribuida (OpenTelemetry, Jaeger)

Hasta ahora hemos cubierto dos pilares fundamentales de la observabilidad: las **Métricas** (Prometheus), que nos avisan *cuándo* hay un problema en el clúster, y los **Logs** (Loki/Fluentd), que nos dan el *detalle* textual del error. Sin embargo, en arquitecturas nativas de nube basadas en Kubernetes, nos enfrentamos a un tercer desafío.

Imagina que un usuario hace clic en "Comprar" en tu frontend. Esa petición viaja al *Ingress*, de ahí a un microservicio de API Gateway, luego valida el token en un servicio de Autenticación, consulta el Inventario y finalmente escribe en la base de datos de Pedidos. Si esa operación tarda 5 segundos en completarse y el usuario se queja por lentitud, **¿cuál de esos 5 componentes es el culpable?**

Aquí es donde entra la **Trazabilidad Distribuida** (Distributed Tracing). Su objetivo es seguir el ciclo de vida de una petición HTTP o gRPC a través de múltiples Pods, Nodos y redes, unificando todo en una sola vista.

---

### Conceptos Fundamentales: Traces y Spans

Para entender las herramientas, primero debemos dominar el vocabulario estándar del trazado distribuido:

1. **Trace (Traza):** Representa el viaje completo de una petición a lo largo del sistema distribuido. Se identifica mediante un **TraceID** único global.
2. **Span (Tramo):** Es una unidad lógica de trabajo dentro de un Trace. Por ejemplo, una consulta a la base de datos es un Span; la llamada HTTP al servicio de autenticación es otro Span. Cada Span tiene un nombre, un tiempo de inicio, una duración y un **SpanID**.
3. **Context Propagation (Propagación de Contexto):** Es el mecanismo mágico que hace que esto funcione. Cuando el "Servicio A" llama al "Servicio B", debe inyectar el `TraceID` y el `SpanID` padre en las cabeceras HTTP (ej. usando el estándar `W3C Trace Context`). Así, el "Servicio B" sabe que es parte de una cadena mayor.

#### Diagrama de Cascada (Waterfall)

Visualmente, un Trace se representa como un diagrama de cascada temporal, similar a la pestaña "Network" de tu navegador web, pero a nivel de infraestructura:

```text
Tiempo (ms) ->  0    20    40    60    80   100   120
[TraceID: 8a3f...]
|
+-- [Frontend] /checkout (120ms) ------------------|
      |
      +-- [API Gateway] /api/v1/order (100ms) -----|
            |
            +-- [Auth Service] Valida Token (20ms)-|
            |
            +-- [Inventory API] /stock (75ms)      |----| *** ¡Cuello de botella!
                  |
                  +-- [MySQL] SELECT stock (70ms)       |-| 

```

---

### OpenTelemetry (OTel): El Estándar Absoluto

Históricamente, el mercado del trazado estaba fragmentado (OpenTracing, OpenCensus, agentes propietarios de New Relic o Datadog). Esto obligaba a los desarrolladores a atar el código fuente de sus aplicaciones a un proveedor específico.

**OpenTelemetry (OTel)**, un proyecto incubado por la CNCF, resolvió este problema unificando los estándares. OTel **no es un backend de almacenamiento**; es un conjunto de APIs, SDKs y herramientas para instrumentar, generar, recolectar y exportar telemetría (Traces, Métricas y Logs) de forma agnóstica.

#### El OpenTelemetry Collector en Kubernetes

En lugar de que cada Pod envíe sus traces directamente a Internet o a una base de datos de observabilidad, en Kubernetes se despliega el **OTel Collector**.

Este componente actúa como un *router* de telemetría:

1. **Recibe (Receivers):** Acepta datos en múltiples formatos (OTLP, Jaeger, Zipkin).
2. **Procesa (Processors):** Filtra datos sensibles, enmascara IPs, o agrupa traces.
3. **Exporta (Exporters):** Envía los datos unificados a uno o varios backends (Jaeger, Datadog, Grafana Tempo) sin tener que tocar el código de las aplicaciones.

---

### Jaeger: El Backend de Visualización

Si OpenTelemetry es el cartero, **Jaeger** (creado originalmente por Uber) es el archivo histórico y la interfaz de usuario. Jaeger recibe los traces generados por OTel, los indexa (típicamente usando Elasticsearch o Cassandra como base de datos subyacente) y proporciona la interfaz web donde los desarrolladores pueden buscar peticiones lentas o fallidas y visualizar el diagrama de cascada.

*(Nota: Alternativas nativas de nube modernas incluyen **Grafana Tempo**, que se integra directamente con Loki y Prometheus usando almacenamiento de objetos compatible con S3, reduciendo significativamente los costos operativos frente a Jaeger).*

---

### Implementación en K8s: Instrumentación Cero-Código

El mayor obstáculo de la trazabilidad siempre fue la necesidad de modificar el código de los microservicios. Hoy, Kubernetes y OpenTelemetry simplifican esto mediante el **OpenTelemetry Operator**.

El Operador permite la **Auto-instrumentación**. Simplemente añadiendo una anotación al manifiesto de tu Deployment, el Operador inyecta un *Init Container* que copia un agente de trazado (para Java, Python, Node.js o .NET) en el Pod. Al arrancar, este agente intercepta automáticamente las llamadas de red a bases de datos y frameworks web, generando traces sin que el desarrollador escriba una sola línea de código extra.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventario-api
spec:
  template:
    metadata:
      annotations:
        # ¡Esta sola línea activa la auto-instrumentación!
        instrumentation.opentelemetry.io/inject-java: "true"

```

> **Consejo de Arquitecto (Senior Tip):** > En producción, la generación de traces es extremadamente costosa a nivel de red y almacenamiento. Si tienes 10,000 peticiones por segundo, almacenar 10,000 traces por segundo destruirá tu clúster de Jaeger en minutos.
> La solución a nivel Senior es el **Sampling (Muestreo)**. Nunca guardes el 100% de los traces. Configura el OTel Collector para usar **Tail-based Sampling**. A diferencia del muestreo aleatorio (donde podrías perder los errores), el muestreo basado en la cola espera a que el *Trace* completo termine en memoria. Si la petición fue exitosa (HTTP 200) y rápida, se descarta (solo guardas un 1% para métricas). Pero si el Trace contiene un error (HTTP 500) o superó un umbral de latencia crítico (ej. > 2 segundos), el OTel Collector lo guarda al 100%. Así, optimizas costos garantizando que siempre tendrás visibilidad de los problemas reales.
