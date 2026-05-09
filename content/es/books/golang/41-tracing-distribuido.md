En arquitecturas monolíticas, rastrear una petición es trivial: basta con leer los logs de un único proceso. Sin embargo, en un ecosistema de microservicios, una sola acción puede desencadenar llamadas a través de docenas de servicios, bases de datos y colas de mensajes. ¿Cómo descubrimos exactamente el cuello de botella cuando una transacción distribuida falla o se vuelve inaceptablemente lenta?

El Tracing Distribuido es la solución. En este capítulo exploraremos cómo Go utiliza su paquete `context` y el estándar OpenTelemetry para instrumentar código, propagar trazas a través de la red y visualizar el rendimiento real de nuestras aplicaciones en producción.

## 41.1. Anatomía de un Trace: Trazas y Spans

A medida que las aplicaciones evolucionan de arquitecturas monolíticas a ecosistemas de microservicios (como abordamos en la Parte 9), una única petición de un usuario puede atravesar docenas de servicios, colas de mensajes y bases de datos antes de devolver una respuesta. Cuando la latencia se dispara o se produce un error, las métricas (que nos dicen *qué* está fallando) y los logs (que nos dicen *por qué* falló un componente aislado) resultan insuficientes para entender el flujo completo.

El **Tracing Distribuido** (Rastreo Distribuido) resuelve este problema contándonos la historia completa de una petición a medida que cruza los límites de los procesos y la red. Para entender cómo funciona, debemos diseccionar sus dos unidades fundamentales: el **Trace** (Traza) y el **Span**.

### El Trace: La historia completa

Un **Trace** representa el viaje completo de una petición o transacción a través de un sistema distribuido. Desde la perspectiva de la estructura de datos, un Trace no es más que un Grafo Dirigido Acíclico (DAG) compuesto por nodos, donde cada nodo es un "Span".

Todo trace se identifica por un **Trace ID** único a nivel global (generalmente un array de 16 bytes). Este identificador es el pegamento que permite a los sistemas de observabilidad correlacionar operaciones que ocurrieron en diferentes servidores, escritos en diferentes lenguajes, unificándolos en una sola vista cronológica.

### El Span: La unidad de trabajo

Si el Trace es el árbol completo, el **Span** es cada una de sus ramas. Un Span representa una única unidad de trabajo lógica dentro del sistema, como una consulta a una base de datos, el procesamiento de un mensaje en Kafka o la ejecución de un middleware HTTP.

Para que un Span sea útil y pueda ensamblarse en un Trace, debe contener una anatomía interna muy específica:

* **Span ID:** Un identificador único de 8 bytes para esta operación específica.
* **Trace ID:** El identificador del Trace al que pertenece este Span.
* **Parent Span ID:** El identificador del Span que invocó a esta operación. Si un Span no tiene padre, se le denomina **Root Span** (Span Raíz) e indica el inicio del Trace. Esto es lo que permite construir la jerarquía y el DAG.
* **Name (Nombre):** Una cadena de texto que describe la operación (ej. `/api/v1/users`, `SELECT users`, `validate_payload`).
* **Timestamps:** Marcas de tiempo exactas de inicio y fin. La diferencia entre ambas nos da la **latencia** o duración de la operación.
* **Attributes (Atributos o Tags):** Pares clave-valor (`string` -> `any`) que proporcionan metadatos estructurados sobre la operación, como el `http.status_code`, el `db.system` o el `user.id`.
* **Events (Eventos):** Logs estructurados con una marca de tiempo que ocurren *dentro* del ciclo de vida del Span. Son útiles para registrar hitos específicos o excepciones sin crear un Span hijo.
* **Status (Estado):** Un indicador que señala si la operación se completó con éxito o si terminó en error (generalmente `Unset`, `Ok` o `Error`).

### La conexión idiomática en Go: El Contexto

Como vimos en el Capítulo 13, Go no posee el concepto de *Thread-Local Storage* (almacenamiento local por hilo) que lenguajes como Java o Python utilizan para propagar datos de rastreo mágicamente en segundo plano.

En Go, la anatomía de un Trace se propaga de forma explícita utilizando el paquete `context`. El `context.Context` actúa como el vehículo que transporta el **SpanContext** (que contiene el Trace ID y el Span ID actual) a través de las fronteras de las funciones y las Goroutines.

A continuación, veamos un ejemplo conceptual de cómo se materializa la anatomía de un Trace y sus Spans en código Go, utilizando la API estándar de facto (que profundizaremos en la siguiente sección, OpenTelemetry):

```go
package tracing

import (
 "context"
 "fmt"
 "time"

 "go.opentelemetry.io/otel"
 "go.opentelemetry.io/otel/attribute"
 "go.opentelemetry.io/otel/trace"
)

// tracer es la instancia que nos permite crear nuevos Spans.
var tracer = otel.Tracer("mi-servicio-backend")

func ProcesarPedido(ctx context.Context, orderID string) error {
 // 1. Iniciamos el Span Raíz. 
 // Extrae el Parent Span ID del 'ctx' si existe, o crea un nuevo Trace ID.
 ctx, span := tracer.Start(ctx, "ProcesarPedido")
 
 // Aseguramos que el Span se cierre al terminar la función para calcular la duración.
 defer span.End() 

 // 2. Añadimos Atributos (metadata) al Span
 span.SetAttributes(
  attribute.String("order.id", orderID),
  attribute.String("business.flow", "checkout"),
 )

 // 3. Añadimos un Evento (un log anclado a este Span específico)
 span.AddEvent("Iniciando validación de inventario")

 // 4. Pasamos el CONTEXTO ACTUALIZADO a la siguiente función.
 // Esto es crucial: 'ctx' ahora contiene el Span ID de "ProcesarPedido" como padre.
 if err := descontarInventario(ctx, orderID); err != nil {
  span.RecordError(err)
  span.SetStatus(trace.Status{Code: trace.StatusCodeError, Description: err.Error()})
  return fmt.Errorf("fallo al procesar pedido: %w", err)
 }

 return nil
}

func descontarInventario(ctx context.Context, orderID string) error {
 // Este nuevo Span será "hijo" del Span "ProcesarPedido"
 _, span := tracer.Start(ctx, "descontarInventario")
 defer span.End()

 // Simulamos una llamada a la base de datos
 time.Sleep(50 * time.Millisecond)
 
 span.SetAttributes(attribute.String("db.system", "postgresql"))

 return nil
}
```

En este ejemplo, la llamada a `tracer.Start` es el momento en que se instancia la anatomía del Span. Observa cómo el uso riguroso del `context.Context` es innegociable; si pasáramos `context.Background()` a la función `descontarInventario`, se perdería el eslabón jerárquico (Parent Span ID), rompiendo el Trace en dos partes desconectadas y anulando por completo el propósito del tracing distribuido.

## 41.2. Instrumentación neutral de proveedores con OpenTelemetry (OTel)

Históricamente, la instrumentación de aplicaciones implicaba un alto acoplamiento. Si tu equipo decidía utilizar Datadog, New Relic o Zipkin, debías importar sus librerías propietarias y esparcir sus llamadas a través de toda tu lógica de negocio. Si años más tarde la empresa decidía migrar a otra plataforma por motivos de costes o características, el esfuerzo de refactorización era monumental. A este problema se le conoce como *vendor lock-in* (dependencia del proveedor).

**OpenTelemetry (OTel)**, un proyecto incubado por la Cloud Native Computing Foundation (CNCF) y nacido de la fusión de OpenTracing y OpenCensus, es la respuesta definitiva de la industria a este problema. OTel estandariza cómo se generan, recopilan y exportan los datos telemétricos (trazas, métricas y logs) sin atarte a ninguna herramienta de análisis específica.

### El diseño arquitectónico: API vs. SDK

Para lograr esta neutralidad, OpenTelemetry en Go divide estrictamente su arquitectura en dos componentes fundamentales. Entender esta separación es crucial para diseñar librerías y microservicios mantenibles:

1. **La API (`go.opentelemetry.io/otel/trace`):** Es un conjunto de interfaces vacías por defecto. Se utiliza exclusivamente para **instrumentar** el código (iniciar Spans, añadir eventos, definir atributos).
    * *Regla de oro:* El código de dominio y las librerías de terceros (como un driver de base de datos o un enrutador HTTP) **solo** deben depender de la API. Nunca deben saber cómo se procesan o a dónde van los datos.
2. **El SDK (`go.opentelemetry.io/otel/sdk`):** Es la implementación concreta de la API. Se encarga del muestreo (*sampling*), el procesamiento por lotes y la exportación de los datos.
    * *Regla de oro:* El SDK **solo** debe configurarse e instanciarse en el punto de entrada de la aplicación (el `main.go`).

### El protocolo OTLP y los Exporters

En lugar de que tu aplicación Go envíe datos directamente a una base de datos de observabilidad específica, OpenTelemetry fomenta el uso de **OTLP** (OpenTelemetry Protocol).

Un **Exporter** es el componente del SDK responsable de traducir los Spans en memoria al formato de destino. Al configurar un exportador OTLP (generalmente a través de gRPC o HTTP/Protobuf), tu aplicación de Go envía la telemetría a un componente externo llamado **OpenTelemetry Collector**. Este recolector actúa como un *router* agnóstico que recibe OTLP y lo distribuye a cualquier backend comercial o de código abierto (Jaeger, Prometheus, Datadog, AWS X-Ray, etc.), manteniendo tu código Go completamente inalterado ante cambios de infraestructura.

### Configuración del Provider en Go

Para que la instrumentación (vista en la sección 41.1) funcione y no sea descartada silenciosamente, debemos inicializar el SDK al arrancar nuestro servicio. Esto se conoce como la configuración del `TracerProvider`.

A continuación, se muestra el patrón estándar para inicializar OpenTelemetry en una aplicación Go lista para producción, enviando trazas mediante OTLP sobre gRPC:

```go
package telemetry

import (
 "context"
 "fmt"
 "time"

 "go.opentelemetry.io/otel"
 "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
 "go.opentelemetry.io/otel/sdk/resource"
 sdktrace "go.opentelemetry.io/otel/sdk/trace"
 semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// InitTracer configura y registra el TracerProvider global.
// Devuelve una función de limpieza (shutdown) que debe ser llamada con defer en main().
func InitTracer(ctx context.Context, serviceName, version string) (func(context.Context) error, error) {
 // 1. Definir el Recurso (Resource): Metadatos estáticos sobre la entidad que produce la telemetría.
 res, err := resource.Merge(
  resource.Default(),
  resource.NewWithAttributes(
   semconv.SchemaURL,
   semconv.ServiceName(serviceName),
   semconv.ServiceVersion(version),
  ),
 )
 if err != nil {
  return nil, fmt.Errorf("fallo al crear el recurso OTel: %w", err)
 }

 // 2. Configurar el Exporter: A dónde y cómo se envían los datos (OTLP/gRPC por defecto a localhost:4317).
 exporter, err := otlptracegrpc.New(ctx)
 if err != nil {
  return nil, fmt.Errorf("fallo al crear el exportador OTLP: %w", err)
 }

 // 3. Configurar el TracerProvider: Une el exportador, la estrategia de procesamiento y el recurso.
 tp := sdktrace.NewTracerProvider(
  // El Batcher agrupa los Spans en memoria antes de enviarlos por la red, optimizando el rendimiento.
  sdktrace.WithBatcher(exporter, sdktrace.WithMaxExportBatchSize(512)),
  // Muestreo: Siempre registrar trazas (útil en dev, en prod suele usarse muestreo probabilístico).
  sdktrace.WithSampler(sdktrace.AlwaysSample()),
  sdktrace.WithResource(res),
 )

 // 4. Registrar el provider como la instancia global.
 // A partir de este momento, cualquier llamada a otel.Tracer() utilizará este SDK.
 otel.SetTracerProvider(tp)

 // Devolvemos la función de apagado para asegurar un "graceful shutdown"
 return tp.Shutdown, nil
}
```

**Uso en la función `main`:**

Es fundamental gestionar correctamente el ciclo de vida del `TracerProvider`. Dado que el procesador por lotes (`WithBatcher`) almacena Spans en memoria asíncronamente para no bloquear la ejecución de las Goroutines principales, si la aplicación se cierra abruptamente, esos Spans se perderán.

```go
func main() {
 ctx := context.Background()
 
 shutdown, err := telemetry.InitTracer(ctx, "api-pagos", "v1.0.3")
 if err != nil {
  log.Fatalf("Error inicializando telemetría: %v", err)
 }
 
 // Asegura el vaciado de los buffers de Spans al salir de la aplicación
 defer func() {
  ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
  defer cancel()
  if err := shutdown(ctx); err != nil {
   log.Printf("Fallo al apagar el TracerProvider: %v", err)
  }
 }()

 // ... inicialización del servidor HTTP/gRPC ...
}
```

Gracias a esta abstracción, el código de los controladores y repositorios de tu aplicación puede utilizar la API de `otel` libremente. Si mañana la empresa migra de un entorno on-premise a AWS o Google Cloud, el código de negocio se mantendrá estático; únicamente habrá que reconfigurar el destino en el OpenTelemetry Collector o, como máximo, cambiar un par de líneas en el `exporter` del archivo `main.go`.

## 41.3. Propagación de contexto W3C a través de HTTP y gRPC

En la sección 41.1 vimos cómo el paquete `context` de Go transporta el `SpanContext` (con su Trace ID y Span ID) de forma segura entre funciones y Goroutines dentro de un mismo proceso. Sin embargo, en una arquitectura de microservicios, el viaje de una petición rara vez termina en el servidor que la recibe por primera vez.

Cuando el "Servicio A" realiza una llamada de red al "Servicio B", el `context.Context` de Go no se transmite por arte de magia a través del cable. Si no hacemos nada, el "Servicio B" generará un nuevo Trace ID al recibir la petición, rompiendo el grafo de la transacción y creando dos trazas aisladas (y por tanto, inútiles para el diagnóstico distribuido). Aquí es donde entra en juego la **Propagación de Contexto**.

### El estándar W3C Trace Context

Históricamente, cada proveedor de observabilidad inyectaba cabeceras HTTP propietarias para propagar el contexto (por ejemplo, B3 para Zipkin o `X-Amzn-Trace-Id` para AWS). Esto generaba fricción al cruzar fronteras entre sistemas heterogéneos.

Para estandarizar esto, el W3C definió la especificación **Trace Context**, que OpenTelemetry adopta como estándar por defecto. Esta especificación define principalmente dos cabeceras HTTP:

1. `traceparent`: Es la cabecera crítica. Contiene la versión, el Trace ID, el Parent Span ID y banderas de muestreo (Trace Flags).
    * *Ejemplo:* `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
2. `tracestate`: Una cabecera opcional que transporta datos específicos del proveedor de observabilidad, permitiendo que múltiples sistemas coexistan en un mismo trace.

El proceso de mover el estado interno de Go (`SpanContext`) a estas cabeceras HTTP se denomina **Inyección (Injection)**, y el proceso inverso al recibir una petición se denomina **Extracción (Extraction)**. OpenTelemetry maneja esto a través de la interfaz genérica `TextMapPropagator`.

### Implementación manual sobre HTTP

Para comprender la mecánica subyacente, veamos cómo se inyecta y extrae manualmente el contexto utilizando la API de OpenTelemetry y la librería estándar `net/http`.

**1. Inyección en el Cliente HTTP (Servicio A):**

Antes de realizar la llamada HTTP, debemos inyectar el contexto actual en las cabeceras de la petición saliente.

```go
package client

import (
 "context"
 "net/http"

 "go.opentelemetry.io/otel"
 "go.opentelemetry.io/otel/propagation"
)

func LlamarServicioB(ctx context.Context) error {
 req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://servicio-b/api/data", nil)
 if err != nil {
  return err
 }

 // Obtenemos el propagador configurado globalmente (usualmente W3C Trace Context)
 propagator := otel.GetTextMapPropagator()
 
 // propagation.HeaderCarrier adapta http.Header a la interfaz TextMapCarrier.
 // Inject serializa el TraceID y SpanID del 'ctx' en la cabecera 'traceparent'.
 propagator.Inject(ctx, propagation.HeaderCarrier(req.Header))

 client := &http.Client{}
 resp, err := client.Do(req)
 // ... manejo de la respuesta ...
 
 return err
}
```

**2. Extracción en el Servidor HTTP (Servicio B):**

En el servidor receptor, implementamos un Middleware (patrón que vimos en el Capítulo 25) para interceptar la petición, extraer la cabecera y rehidratar un nuevo `context.Context` antes de pasarlo a los *handlers* de negocio.

```go
package server

import (
 "net/http"

 "go.opentelemetry.io/otel"
 "go.opentelemetry.io/otel/propagation"
 "go.opentelemetry.io/otel/trace"
)

// TracingMiddleware extrae el contexto W3C y crea el Span raíz del servidor
func TracingMiddleware(next http.Handler) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  propagator := otel.GetTextMapPropagator()
  
  // Extract lee la cabecera 'traceparent' y devuelve un nuevo contexto
  // que contiene el SpanContext del servicio remoto.
  ctx := propagator.Extract(r.Context(), propagation.HeaderCarrier(r.Header))

  // Iniciamos un nuevo Span. Si el contexto extraído era válido, 
  // este nuevo Span será "hijo" del Span del Cliente A automáticamente.
  tracer := otel.Tracer("servicio-b")
  ctx, span := tracer.Start(ctx, r.URL.Path, trace.WithSpanKind(trace.SpanKindServer))
  defer span.End()

  // Pasamos la petición con el contexto actualizado al siguiente handler
  next.ServeHTTP(w, r.WithContext(ctx))
 })
}
```

*Nota para producción:* Aunque entender este mecanismo es vital, en producción no es necesario escribir este middleware a mano. OpenTelemetry proporciona el paquete oficial `go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp` que implementa tanto el transporte de cliente como el middleware de servidor, encapsulando la inyección y extracción de forma idiomática.

### Propagación en gRPC a través de Metadatos

En el Capítulo 33 vimos que gRPC utiliza HTTP/2 subyacente, pero expone el concepto de **Metadatos** (`metadata.MD`) en lugar de trabajar directamente con cabeceras HTTP nativas.

Afortunadamente, el ecosistema de OpenTelemetry ofrece interceptores de gRPC listos para usar (`go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc`). Estos interceptores traducen automáticamente los portadores de propagación de W3C a metadatos de gRPC bidireccionalmente.

Su configuración es trivial y elimina por completo la necesidad de inyectar y extraer manualmente:

**Configuración del Cliente gRPC:**

```go
import (
 "google.golang.org/grpc"
 "google.golang.org/grpc/credentials/insecure"
 "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
)

func NewGRPCClient() (*grpc.ClientConn, error) {
 // Añadimos StatsHandler, que intercepta y propaga la telemetría OTel
 return grpc.Dial("localhost:50051",
  grpc.WithTransportCredentials(insecure.NewCredentials()),
  grpc.WithStatsHandler(otelgrpc.NewClientHandler()), 
 )
}
```

**Configuración del Servidor gRPC:**

```go
import (
 "google.golang.org/grpc"
 "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
)

func NewGRPCServer() *grpc.Server {
 // El servidor detectará automáticamente los metadatos 'traceparent'
 // entrantes y reanudará el Trace.
 return grpc.NewServer(
  grpc.StatsHandler(otelgrpc.NewServerHandler()),
 )
}
```

La belleza de este enfoque es que el desarrollador solo necesita asegurarse de pasar siempre el `context.Context` como primer argumento en los métodos del cliente gRPC. El interceptor se encarga del resto de la plomería de red, garantizando un rastreo continuo y sin fisuras.

---

Para que esta propagación surta efecto, debes configurar el propagador global en tu `main.go` justo después de inicializar el `TracerProvider` (como vimos en la sección anterior):

```go
otel.SetTextMapPropagator(propagation.TraceContext{})
```

## 41.4. Visualización de cuellos de botella con Jaeger o herramientas Cloud

Hasta este punto, hemos instrumentado meticulosamente nuestro código Go, configurado el SDK de OpenTelemetry y asegurado que el contexto W3C viaje sin interrupciones a través de la red en llamadas HTTP y gRPC. Toda esta infraestructura genera una enorme cantidad de datos telemétricos (Spans individuales) que fluyen hacia un *backend* de observabilidad. Sin embargo, generar datos es solo la mitad de la batalla; sin una herramienta capaz de ensamblarlos y visualizarlos, todo este esfuerzo carece de valor operativo.

Aquí es donde entran en juego plataformas de código abierto como **Jaeger** (incubada por la CNCF) o soluciones gestionadas en la nube como Datadog, AWS X-Ray, Google Cloud Trace o Grafana Tempo.

### Reconstrucción y la Vista de Cascada (Waterfall View)

El exportador de tu aplicación Go (o el OTel Collector intermedio) envía millones de Spans sueltos, desordenados y provenientes de docenas de microservicios diferentes. El backend de observabilidad actúa como el motor que reconstruye el rompecabezas:

1. Agrupa todos los Spans que comparten el mismo `Trace ID`.
2. Utiliza el `Parent Span ID` para ordenarlos en un árbol topológico (Grafo Dirigido Acíclico).
3. Calcula el tiempo absoluto alineando los *timestamps* de inicio y fin.

El resultado de este ensamblaje se presenta en la interfaz de usuario mediante una **Vista de Cascada** (similar a un diagrama de Gantt). En este gráfico, el eje X representa el tiempo total de la transacción, y el eje Y apila las diferentes operaciones (Spans). Cada servicio involucrado suele diferenciarse por un color distinto.

### Patrones visuales de cuellos de botella en Go

La verdadera potencia de herramientas como Jaeger reside en la capacidad del cerebro humano para detectar patrones anómalos visualmente. Al observar un Trace completo de una petición lenta, los desarrolladores de Go suelen encontrarse con uno de los siguientes diagnósticos:

* **El antipatrón N+1 en bases de datos:** Visualmente, esto se manifiesta como una larga "escalera" diagonal de cientos de Spans diminutos con el nombre `SELECT ...`, originados por un ORM mal configurado (tema discutido en el Capítulo 35) que consulta registros dependientes uno por uno dentro de un bucle `for`, en lugar de utilizar un `JOIN` o el patrón Dataloader.
* **Falta de concurrencia (Oportunidades perdidas):**
    Imagina un *handler* de Go que necesita validar un usuario, obtener su saldo y cargar sus preferencias desde tres APIs distintas. Si el gráfico muestra tres barras largas ejecutándose de forma estrictamente secuencial, estás ante un cuello de botella evitable. Es la señal inequívoca de que debes refactorizar esa función para utilizar **Goroutines y un `sync.WaitGroup`** (Capítulo 10), convirtiendo la latencia total de `A + B + C` a simplemente `max(A, B, C)`.
* **Latencia oculta en dependencias de red:**
    A menudo, tu código Go es increíblemente rápido, pero el Trace revela que el 95% del tiempo de la petición se consume esperando la respuesta de un servicio de terceros o un sistema *legacy*. La visualización aísla el problema, demostrando empíricamente que la culpa no es del runtime de Go, sino de la red o del proveedor externo.
* **Rastreo de errores en cascada:**
    Cuando una petición falla, la vista de cascada resaltará los Spans afectados (generalmente en color rojo). En una arquitectura profunda, un *timeout* en la base de datos de inventario provocará que el microservicio de inventario falle, lo que a su vez hará fallar al orquestador de pagos, devolviendo un HTTP 500 al cliente. Jaeger te permite hacer clic exactamente en el Span más profundo que falló originalmente, revelando el *stack trace* o el error de base de datos exacto capturado con `span.RecordError()`.

### Optimizando la búsqueda: Atributos de alto valor

Para que plataformas como Jaeger o Datadog sean realmente útiles durante un incidente de producción, debes poder encontrar los Traces correctos en un mar de millones de peticiones exitosas. Las herramientas Cloud te permiten filtrar Traces basándose en los **Atributos** que añadiste en tu código Go.

Es una excelente práctica de diseño inyectar metadatos de negocio de alta cardinalidad en los Spans raíz.

```go
package checkout

import (
 "context"
 "go.opentelemetry.io/otel"
 "go.opentelemetry.io/otel/attribute"
)

func ProcesarCarrito(ctx context.Context, userID string, isPremium bool, total float64) error {
 tracer := otel.Tracer("servicio-checkout")
 ctx, span := tracer.Start(ctx, "ProcesarCarrito")
 defer span.End()

 // Estos atributos son oro puro para el equipo de SRE y negocio.
 // En Jaeger o Datadog, ahora puedes ejecutar una consulta como:
 // "Muéstrame los traces donde user.is_premium = true AND latencia > 2s"
 span.SetAttributes(
  attribute.String("user.id", userID),
  attribute.Bool("user.is_premium", isPremium),
  attribute.Float64("cart.total_value", total),
  attribute.String("business.domain", "b2c_sales"),
 )

 // ... lógica concurrente de procesamiento ...
 return nil
}
```

Al combinar la instrumentación neutral de OpenTelemetry en Go con la potencia analítica de plataformas Cloud, transformas un sistema distribuido opaco en una caja de cristal, permitiendo a los equipos diagnosticar problemas de rendimiento inter-servicios en minutos en lugar de semanas.
