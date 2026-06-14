La observabilidad es el pilar que transforma un sistema "caja negra" en una entidad transparente y predecible. Mientras que los logs narran eventos puntuales, las **métricas** ofrecen una visión panorámica y cuantitativa del estado de nuestra aplicación Go. En sistemas de alta concurrencia y arquitecturas de microservicios, entender el rendimiento a través de series temporales es vital para la toma de decisiones basada en datos. En este capítulo, exploraremos cómo instrumentar servicios de forma idiomática utilizando los estándares de la industria, permitiéndonos medir desde la latencia de nuestras APIs hasta el comportamiento interno del Garbage Collector en tiempo de ejecución.

## 40.1. Tipos de métricas: Counters, Gauges, Histograms, Summaries

Para que nuestro sistema sea verdaderamente observable, no basta con emitir logs o trazas distribuidas; necesitamos entender el comportamiento volumétrico y el estado del sistema a lo largo del tiempo. En el ecosistema moderno de Go y Cloud Native, el estándar de facto para la recolección de métricas es Prometheus.

El cliente oficial de Prometheus para Go (`github.com/prometheus/client_golang/prometheus`) implementa cuatro tipos fundamentales de métricas. Comprender la semántica exacta de cada una es crucial para evitar cuellos de botella en la instrumentación y para que las consultas (PromQL) en Grafana sean precisas.

### 1. Counter (Contadores)

Un **Counter** es una métrica acumulativa que representa un valor numérico monótonamente creciente. Su regla de oro es simple: **solo puede aumentar o reiniciarse a cero** (esto último ocurre típicamente cuando el servicio se reinicia).

**Casos de uso ideales:**

* Número total de peticiones HTTP procesadas.
* Cantidad total de errores producidos.
* Bytes enviados o recibidos.
* Tareas completadas en un *worker pool*.

**Ejemplo de implementación:**

```go
package metrics

import (
 "github.com/prometheus/client_golang/prometheus"
 "github.com/prometheus/client_golang/prometheus/promauto"
)

// Utilizamos promauto para instanciar y registrar la métrica simultáneamente
var (
 TotalRequests = promauto.NewCounter(prometheus.CounterOpts{
  Name: "http_requests_total",
  Help: "Número total de peticiones HTTP recibidas",
 })
)

func ProcessRequest() {
 // Incrementa el contador en 1
 TotalRequests.Inc()
 
 // También es posible sumar valores arbitrarios (siempre positivos)
 // TotalRequests.Add(5)
}
```

*Nota arquitectónica:* Nunca uses un Counter para algo que pueda disminuir (como el número de Goroutines activas). Para Prometheus, lo importante de un Counter no es su valor absoluto en un instante dado, sino la **tasa de incremento** (calculada con la función `rate()` en PromQL).

### 2. Gauge (Indicadores)

Un **Gauge** representa un valor numérico instantáneo que puede **subir y bajar arbitrariamente**. Es como el velocímetro o el indicador de combustible de un coche.

**Casos de uso ideales:**

* Uso actual de memoria o CPU.
* Número de Goroutines en ejecución (que exploramos en el Capítulo 8).
* Tamaño actual de una cola de mensajes (ej. en RabbitMQ o Kafka).
* Conexiones activas a la base de datos.

**Ejemplo de implementación:**

```go
package metrics

import (
 "github.com/prometheus/client_golang/prometheus"
 "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
 ActiveConnections = promauto.NewGauge(prometheus.GaugeOpts{
  Name: "db_active_connections",
  Help: "Número actual de conexiones activas a la base de datos",
 })
)

func ConnectToDB() {
 ActiveConnections.Inc() // Sube cuando se abre una conexión
 // ... lógica de conexión
}

func DisconnectFromDB() {
 ActiveConnections.Dec() // Baja cuando se cierra
}

func UpdateMemoryStats(bytes float64) {
 // También se puede establecer un valor absoluto directamente
 ActiveConnections.Set(bytes) 
}
```

### 3. Histogram (Histogramas)

El **Histogram** es una métrica compleja diseñada para observar múltiples eventos (como latencias o tamaños de respuesta) y contarlos dentro de rangos configurables conocidos como *buckets* (cubos).

Al usar un Histogram, el cliente de Go mantiene tres cosas en memoria de forma automática:

1. Contadores individuales para cada *bucket*.
2. La suma total de todos los valores observados (`_sum`).
3. El conteo total de eventos observados (`_count`).

**Casos de uso ideales:**

* Medición de latencia de respuestas HTTP (Service Level Indicators - SLIs).
* Tamaños de *payloads* en bytes.
* Tiempo de ejecución de consultas SQL.

**Ejemplo de implementación:**

```go
package metrics

import (
 "time"
 "github.com/prometheus/client_golang/prometheus"
 "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
 RequestDuration = promauto.NewHistogram(prometheus.HistogramOpts{
  Name:    "http_request_duration_seconds",
  Help:    "Distribución de la latencia de las peticiones HTTP",
  // Definir buenos buckets es clave. Aquí definimos rangos desde 50ms hasta 10s.
  Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10}, 
 })
)

func HandleHTTPRequest() {
 start := time.Now()
 defer func() {
  // Observamos la duración en segundos al finalizar la función
  RequestDuration.Observe(time.Since(start).Seconds())
 }()
 
 // ... lógica del handler ...
}
```

### 4. Summary (Resúmenes)

Un **Summary**, al igual que un Histogram, rastrea el tamaño y la cantidad de eventos observados. Sin embargo, en lugar de agrupar los valores en *buckets* predefinidos, el Summary calcula **cuantiles** (como el percentil 95 o 99) directamente en el cliente (tu aplicación Go) usando algoritmos de ventana deslizante.

**Casos de uso ideales:**

* Mediciones de latencia donde necesitas percentiles exactos y precisos.
* Situaciones donde no conoces de antemano la distribución de los datos (lo cual dificulta definir los *buckets* de un Histogram).

**Ejemplo de implementación:**

```go
package metrics

import (
 "github.com/prometheus/client_golang/prometheus"
 "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
 ProcessingTime = promauto.NewSummary(prometheus.SummaryOpts{
  Name:       "task_processing_duration_seconds",
  Help:       "Duración del procesamiento de tareas en percentiles",
  // Definimos qué cuantiles queremos que el cliente Go calcule
  Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
 })
)

func ProcessTask(duration float64) {
 ProcessingTime.Observe(duration)
}
```

### Histograms vs. Summaries: El dilema arquitectónico

En el diseño de microservicios (Capítulo 32), la elección entre Histograms y Summaries es un punto de inflexión.

La principal desventaja del **Summary** es que **no se puede agregar computacionalmente**. Si tienes 5 réplicas de tu servicio Go corriendo en Kubernetes, no puedes promediar matemáticamente el percentil 99 de la réplica A con el de la réplica B para obtener el percentil 99 global del clúster; hacerlo es un error matemático grave.

Por el contrario, los **Histograms** delegan el cálculo del cuantil al servidor de Prometheus (usando la función `histogram_quantile`). Esto permite agregar métricas provenientes de decenas de instancias de Go de forma matemática y estadísticamente correcta, a costa de ser ligeramente menos precisos (ya que el valor calculado es una interpolación dentro del *bucket*). En la práctica moderna, **los Histograms son el estándar preferido** en aplicaciones distribuidas en Go.

## 40.2. Instrumentación de código Go para Prometheus

Ahora que dominamos la semántica de las métricas (Counters, Gauges, Histograms y Summaries), el siguiente paso lógico es integrarlas en nuestra aplicación Go. La instrumentación es el proceso de añadir el código necesario para medir el comportamiento del sistema en tiempo de ejecución.

En aplicaciones Go modernas (y especialmente bajo los principios de Arquitectura Limpia que vimos en el Capítulo 21), la instrumentación no debe acoplarse intrusivamente con la lógica de negocio. Lo ideal es manejarla a través de Middlewares, Decoradores o mediante Inyección de Dependencias.

### 1. Registros Locales vs. Estado Global

El paquete oficial `github.com/prometheus/client_golang/prometheus` ofrece un registro global por defecto. Usar funciones como `prometheus.MustRegister()` o el paquete `promauto` (que vimos en la sección anterior) inscribe las métricas en este registro global de manera automática.

Aunque es conveniente para scripts rápidos, en un entorno de producción avanzado (y especialmente para facilitar el Testing, como discutimos en el Capítulo 16), depender del estado global es un antipatrón. Es preferible instanciar un **Registro Personalizado** (`Custom Registry`):

```go
package metrics

import (
 "github.com/prometheus/client_golang/prometheus"
)

// AppMetrics encapsula todas las métricas de nuestra aplicación
type AppMetrics struct {
 Registry *prometheus.Registry
 Requests *prometheus.CounterVec
 Duration *prometheus.HistogramVec
}

// NewAppMetrics inicializa un registro aislado y sus métricas
func NewAppMetrics() *AppMetrics {
 reg := prometheus.NewRegistry()

 // Es buena práctica añadir los recolectores por defecto de Go (memoria, goroutines, GC)
 // aunque usemos un registro personalizado.
 reg.MustRegister(prometheus.NewGoCollector())
 reg.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))

 m := &AppMetrics{
  Registry: reg,
  Requests: prometheus.NewCounterVec(
   prometheus.CounterOpts{
    Name: "http_requests_total",
    Help: "Total de peticiones HTTP procesadas.",
   },
   []string{"method", "status"}, // Etiquetas (Labels)
  ),
  Duration: prometheus.NewHistogramVec(
   prometheus.HistogramOpts{
    Name:    "http_request_duration_seconds",
    Help:    "Latencia de las peticiones HTTP.",
    Buckets: prometheus.DefBuckets, // Buckets estándar por defecto
   },
   []string{"method", "route"},
  ),
 }

 // Registramos nuestras métricas específicas en el registro local
 reg.MustRegister(m.Requests)
 reg.MustRegister(m.Duration)

 return m
}
```

### 2. Vectores y Etiquetas (Labels)

En el ejemplo anterior introdujimos `CounterVec` e `HistogramVec`. En Prometheus, las métricas rara vez son unidimensionales. Queremos saber no solo cuántas peticiones hubo, sino cuántas fueron `GET`, cuántas fallaron con un `500` y qué ruta específica se consultó.

Los **Vectores** permiten añadir dimensiones (Etiquetas o *Labels*) a una métrica base.

> **⚠️ Advertencia Crítica: La explosión de cardinalidad**
>
> La cardinalidad es el número de combinaciones únicas de etiquetas que tiene una métrica. Cada combinación única genera una nueva serie temporal en la memoria del servidor de Prometheus. **Nunca** uses valores dinámicos o ilimitados como IDs de usuarios, UUIDs, tokens o IPs públicas como etiquetas. Si lo haces, agotarás la memoria (OOM) de tu servidor Prometheus en cuestión de minutos. Si necesitas rastrear un `user_id` específico, eso es trabajo del Tracing (Capítulo 41) o del Logging (Capítulo 39), no de las métricas.

### 3. Instrumentación mediante Middlewares (net/http)

Recordando el Capítulo 25 sobre Enrutamiento y Middlewares, la forma más limpia de instrumentar una API RESTful en Go es interceptando la petición HTTP genérica, sin tocar los *Handlers* individuales.

Para registrar el código de estado HTTP (`200`, `404`, `500`), necesitamos un pequeño truco, ya que el `http.ResponseWriter` estándar no nos permite leer el código de estado una vez escrito. Debemos envolverlo en un *Custom Writer*:

```go
package middleware

import (
 "net/http"
 "strconv"
 "time"

 "mi-proyecto/metrics" // Asumiendo el paquete creado en el paso anterior
)

// statusRecorder intercepta el código de estado HTTP para las métricas
type statusRecorder struct {
 http.ResponseWriter
 statusCode int
}

func (rec *statusRecorder) WriteHeader(code int) {
 rec.statusCode = code
 rec.ResponseWriter.WriteHeader(code)
}

// PrometheusMiddleware es un middleware que registra latencia y conteo de peticiones
func PrometheusMiddleware(m *metrics.AppMetrics) func(http.Handler) http.Handler {
 return func(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
   start := time.Now()

   // Por defecto asumimos 200 OK si el handler no llama a WriteHeader
   rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}

   // Pasamos el control al siguiente handler
   next.ServeHTTP(rec, r)

   duration := time.Since(start).Seconds()
   statusStr := strconv.Itoa(rec.statusCode)

   // ¡Cuidado con la ruta (r.URL.Path)!
   // En producción, usa el patrón de la ruta registrada (ej. "/users/{id}") 
   // en lugar de la URL real ("/users/123") para evitar alta cardinalidad.
   routePattern := r.Pattern // Disponible en Go 1.22+ si se usa el ServeMux nativo

   if routePattern == "" {
    routePattern = "unknown"
   }

   // Registramos las observaciones
   m.Requests.WithLabelValues(r.Method, statusStr).Inc()
   m.Duration.WithLabelValues(r.Method, routePattern).Observe(duration)
  })
 }
}
```

### 4. Instrumentación de clientes salientes (Outbound)

La instrumentación no solo debe aplicarse a las peticiones entrantes (nuestro servidor), sino también a las llamadas salientes que hace nuestra aplicación hacia bases de datos, cachés (Redis) o APIs de terceros.

Para ello, aplicamos el mismo principio del Patrón Decorador (Capítulo 23) sobre la interfaz `http.RoundTripper` nativa de Go:

```go
// Envolviendo el transporte (RoundTripper) del cliente HTTP
client := &http.Client{
    Transport: &InstrumentedTransport{
        Base:    http.DefaultTransport,
        Metrics: myMetrics,
    },
    Timeout: 10 * time.Second,
}
```

*Nota: El paquete `promhttp` oficial (`github.com/prometheus/client_golang/prometheus/promhttp`) ya incluye utilidades listas para usar (`promhttp.InstrumentRoundTripperDuration`, etc.) que aplican este patrón internamente, ahorrándonos la necesidad de reinventar la rueda para el cliente HTTP nativo.*

## 40.3. Exposición y securización de endpoints `/metrics`

Una vez que hemos instrumentado nuestro código y recolectado las métricas en un registro (ya sea el global o uno personalizado), el siguiente paso es hacer que Prometheus pueda consumirlas.

A diferencia de otros sistemas de monitoreo basados en el modelo *Push* (donde la aplicación envía activamente los datos a un servidor central), Prometheus utiliza un modelo *Pull*. Esto significa que tu aplicación Go debe levantar un servidor HTTP y exponer un endpoint (por convención, `/metrics`) en texto plano para que los *scrapers* de Prometheus lo lean periódicamente.

### 1. Exposición básica con `promhttp`

El paquete oficial proporciona el submódulo `promhttp` (`github.com/prometheus/client_golang/prometheus/promhttp`), que nos da un `http.Handler` listo para usar.

Si en la sección anterior optamos por el registro global (el antipatrón rápido), exponerlo requiere una sola línea en tu enrutador:

```go
import (
 "net/http"
 "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
 // Exposición del registro global por defecto
 http.Handle("/metrics", promhttp.Handler())
 http.ListenAndServe(":8080", nil)
}
```

Sin embargo, siguiendo las buenas prácticas de la sección **40.2**, donde creamos un **Registro Personalizado** (nuestro `AppMetrics`), debemos usar `promhttp.HandlerFor` para aislar explícitamente qué métricas vamos a exponer:

```go
package main

import (
 "net/http"
 "github.com/prometheus/client_golang/prometheus/promhttp"
 "mi-proyecto/metrics" // Nuestro paquete de la sección anterior
)

func main() {
 appMetrics := metrics.NewAppMetrics()

 // Creamos un handler específico para nuestro registro aislado
 metricsHandler := promhttp.HandlerFor(
  appMetrics.Registry,
  promhttp.HandlerOpts{
   // Habilitar esta opción permite registrar errores internos del propio handler
   EnableOpenMetrics: true, 
  },
 )

 mux := http.NewServeMux()
 mux.Handle("/metrics", metricsHandler)

 // ... configurar el resto de rutas de la API ...

 http.ListenAndServe(":8080", mux)
}
```

### 2. El patrón del "Puerto de Administración" (Admin Port)

Exponer el endpoint `/metrics` en el mismo puerto por donde sirves tu API pública (ej. `8080`) es un riesgo arquitectónico grave. Si tu API está expuesta a Internet, cualquier atacante podría acceder a `tuservicio.com/metrics` y obtener inteligencia de negocio crítica: volumen de tráfico, tasas de error, endpoints más utilizados y detalles del runtime de Go.

La solución idiomática en microservicios Go es levantar un **segundo servidor HTTP en un puerto distinto** (por ejemplo, `9090`), dedicado exclusivamente a tareas operativas (Métricas, Health Checks y Profiling).

```go
func main() {
 appMetrics := metrics.NewAppMetrics()
 metricsHandler := promhttp.HandlerFor(appMetrics.Registry, promhttp.HandlerOpts{})

 // 1. Servidor Operativo (Métricas y Health Checks) en el puerto 9090
 go func() {
  adminMux := http.NewServeMux()
  adminMux.Handle("/metrics", metricsHandler)
  // adminMux.Handle("/health", healthCheckHandler)
  
  // Este puerto NO debe exponerse en el balanceador de carga público
  if err := http.ListenAndServe(":9090", adminMux); err != nil {
   panic("Fallo en el servidor de métricas: " + err.Error())
  }
 }()

 // 2. Servidor Principal (API de Negocio) en el puerto 8080
 apiMux := http.NewServeMux()
 // ... registrar rutas de negocio ...
 http.ListenAndServe(":8080", apiMux)
}
```

En un entorno Cloud Native (Capítulo 49), configurarás tu clúster de Kubernetes para que Prometheus haga *scrape* del puerto `9090` de tus Pods a través de la red privada (usando ServiceMonitors o anotaciones), mientras que el Ingress público solo enrutará el tráfico al puerto `8080`.

### 3. Securización mediante Autenticación Básica (Basic Auth)

Si por restricciones de infraestructura no puedes aislar las métricas en un puerto interno distinto y te ves obligado a exponer `/metrics` a través de redes no confiables, debes proteger el endpoint.

Prometheus soporta autenticación nativa (Basic Auth o Bearer Tokens) al configurar sus *scrape jobs*. En Go, podemos proteger nuestro endpoint envolviendo el `metricsHandler` en un Middleware de autenticación ligera:

```go
package middleware

import (
 "crypto/subtle"
 "net/http"
)

// BasicAuthMiddleware protege un handler con credenciales estáticas
func BasicAuthMiddleware(expectedUser, expectedPass string, next http.Handler) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  user, pass, ok := r.BasicAuth()

  // Utilizamos crypto/subtle para prevenir ataques de canal lateral (Timing Attacks)
  // al comparar las cadenas de texto, como vimos en el Capítulo 36.
  userMatch := subtle.ConstantTimeCompare([]byte(user), []byte(expectedUser)) == 1
  passMatch := subtle.ConstantTimeCompare([]byte(pass), []byte(expectedPass)) == 1

  if !ok || !userMatch || !passMatch {
   w.Header().Set("WWW-Authenticate", `Basic realm="Restricted Metrics"`)
   http.Error(w, "No autorizado", http.StatusUnauthorized)
   return
  }

  next.ServeHTTP(w, r)
 })
}
```

Para aplicarlo, simplemente decoramos nuestro handler de Prometheus:

```go
// En main.go
secureMetricsHandler := middleware.BasicAuthMiddleware(
 "prom_scraper", 
 "super_secret_password", // En producción, inyectar desde variables de entorno
 metricsHandler,
)

adminMux.Handle("/metrics", secureMetricsHandler)
```

## 40.4. Creación de dashboards efectivos en Grafana

Tener miles de series temporales almacenadas en Prometheus carece de valor si no podemos interpretarlas rápidamente durante un incidente. Grafana es la capa de visualización estándar en el ecosistema Cloud Native que nos permite transformar nuestras métricas de Go en paneles accionables.

Sin embargo, uno de los errores más comunes al adoptar observabilidad es el "Síndrome del Dashboard Saturado": crear paneles con decenas de gráficos innecesarios que generan fatiga visual y ocultan los verdaderos problemas. Para construir dashboards efectivos, debemos basarnos en metodologías estándar de la industria y aplicar consultas PromQL precisas sobre las métricas que instrumentamos en las secciones anteriores.

### 1. Metodologías de Monitoreo: RED y USE

Para aplicaciones backend escritas en Go, el diseño del dashboard debe dividirse conceptualmente utilizando dos metodologías complementarias:

* **El Método RED (Para servicios):** Se enfoca en la experiencia del usuario y las APIs HTTP/gRPC.
  * **R**ate (Tasa): Peticiones por segundo.
  * **E**rrors (Errores): Tasa de peticiones fallidas (códigos 5xx).
  * **D**uration (Duración): Latencia de las peticiones (percentiles).
* **El Método USE (Para infraestructura y runtime):** Se enfoca en los recursos subyacentes.
  * **U**tilization (Utilización): Tiempo medio que el recurso estuvo ocupado (CPU, memoria).
  * **S**aturation (Saturación): Trabajo encolado que no puede procesarse (Goroutines bloqueadas, conexiones en espera).
  * **E**rrors (Errores): Fallos internos del sistema.

### 2. Traduciendo las métricas de Go a PromQL

Veamos cómo aplicar las métricas de nuestro `AppMetrics` (de la sección 40.2) en consultas PromQL (Prometheus Query Language) para construir los paneles del método RED en Grafana:

**A. Rate (Tasa de peticiones)**
Nunca mostramos un `Counter` crudo en un gráfico, ya que solo veríamos una línea subiendo infinitamente. Utilizamos la función `rate()`, que calcula la tasa de incremento por segundo en una ventana de tiempo (ej. 5 minutos).

```promql
// Tasa de peticiones HTTP por segundo, agrupadas por código de estado
sum by (status) (rate(http_requests_total[5m]))
```

**B. Errors (Tasa de errores)**
Podemos calcular el porcentaje de errores dividiendo los errores 5xx entre el total de peticiones. Esto es fundamental para definir alertas de SLO (Service Level Objectives).

```promql
// Porcentaje de errores HTTP 5xx
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) * 100
```

**C. Duration (Percentiles de Latencia)**
Al utilizar `HistogramVec` en Go, Prometheus expone los *buckets*. Para Grafana, usamos `histogram_quantile()` para calcular el percentil 95 o 99. Esto nos dice que el 99% de las peticiones se sirvieron en *X* milisegundos o menos.

```promql
// Latencia del percentil 99 en milisegundos, agrupada por ruta
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))) * 1000
```

### 3. Monitoreo del Runtime de Go (El Método USE)

Recuerda que en la sección 40.2 registramos los recolectores por defecto de Go (`prometheus.NewGoCollector()`). Grafana nos permite visualizar el estado interno de la máquina virtual de Go sin haber escrito código adicional. Un buen dashboard de Go debe incluir una fila dedicada al Runtime:

* **Conteo de Goroutines:** Un crecimiento lineal sin caídas es el síntoma principal de un *Goroutine Leak* (Capítulo 8).

    ```promql
    go_goroutines
    ```

* **Presión sobre el Garbage Collector (GC):** Si el GC consume demasiada CPU, tu aplicación sufrirá latencia.

    ```promql
    // Porcentaje de CPU utilizado por el GC de Go
    rate(go_gc_duration_seconds_sum[5m]) / rate(go_gc_duration_seconds_count[5m])
    ```

* **Uso de Memoria (Heap):** Útil para identificar fugas de memoria (Memory Leaks).

    ```promql
    go_memstats_heap_alloc_bytes
    ```

### 4. Dashboards como Código (Provisioning)

En entornos profesionales, nunca se crean dashboards haciendo clics en la interfaz de Grafana en producción. Se sigue el principio de "Infraestructura como Código" (IaC).

Grafana permite exportar cualquier dashboard como un archivo JSON. En tu proyecto Go, es una excelente práctica incluir una carpeta `deployments/grafana/dashboards/` donde guardes la definición JSON de tu dashboard. Luego, al desplegar con Docker Compose o Kubernetes, configuras Grafana para que auto-descubra y aprovisione estos archivos en el arranque.

```yaml
# Ejemplo de estructura en el repositorio
mi-proyecto/
├── cmd/
├── internal/
├── metrics/
└── deployments/
    └── grafana/
        ├── provisioning/
        │   └── dashboards/
        │       ├── dashboard-provider.yaml
        │       └── go-service-dashboard.json # Tu dashboard exportado
```

Esto garantiza que el monitoreo evolucione de forma versionada junto con tu código fuente. Si añades un nuevo handler HTTP en Go, el desarrollador debe actualizar el archivo JSON del dashboard en el mismo Pull Request.
