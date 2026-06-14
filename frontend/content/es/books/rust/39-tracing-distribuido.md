En el ecosistema backend moderno, entender qué ocurre entre los hilos de un servicio o en el salto de red entre microservicios es vital. Este capítulo explora la **observabilidad avanzada** mediante **OpenTelemetry**, el estándar de la industria para recolectar telemetría de forma agnóstica. Aprenderás a implementar la **propagación de contexto** para seguir el rastro de una petición desde su origen hasta la base de datos, configurando **pipelines de exportación** hacia herramientas como Jaeger o Datadog. Al finalizar, serás capaz de diagnosticar cuellos de botella complejos y errores silenciosos en sistemas distribuidos con la precisión que exige un entorno de producción Senior.

## 39.1 Introducción a OpenTelemetry en Rust

A medida que nuestras aplicaciones crecen y evolucionan de monolitos a arquitecturas distribuidas (como microservicios o sistemas orientados a eventos), la observabilidad tradicional basada únicamente en logs locales se vuelve insuficiente. Si una petición HTTP falla después de haber atravesado un API Gateway, un servicio de autenticación y dos servicios de dominio, rastrear el origen exacto del problema revisando logs aislados es como buscar una aguja en un pajar.

Aquí es donde entra **OpenTelemetry (OTel)**. OpenTelemetry es un marco de observabilidad de código abierto incubado por la CNCF (Cloud Native Computing Foundation). Su objetivo es estandarizar cómo se generan, recopilan y exportan los datos de telemetría: **trazas (traces), métricas (metrics) y logs**.

En lugar de instrumentar tu código con librerías propietarias atadas a un proveedor específico (como Datadog, New Relic o Dynatrace), OpenTelemetry te permite instrumentar tu aplicación una sola vez mediante un estándar agnóstico. Luego, puedes decidir a qué backend enviar esos datos simplemente cambiando la configuración del exportador.

### El Ecosistema de OpenTelemetry en Rust

En el ecosistema de Rust, la adopción de OpenTelemetry está altamente optimizada y se integra de manera casi transparente con las herramientas que ya dominas. Dado que en el **Capítulo 37** ya configuramos logging estructurado y aprendimos a usar `Spans` con el crate `tracing`, la buena noticia es que **no necesitas reescribir tu instrumentación**.

El ecosistema en Rust se divide principalmente en los siguientes crates:

1. **`opentelemetry`**: Contiene las definiciones de los Traits, las interfaces principales y la API pública. Es el estándar desnudo.
2. **`opentelemetry_sdk`**: Proporciona la implementación por defecto de la API de OpenTelemetry (gestión de muestreos, procesadores de trazas, etc.).
3. **`tracing-opentelemetry`**: Este es el crate "puente". Actúa como una capa (Layer) para `tracing-subscriber`, tomando los `Spans` y eventos que ya emites con macros como `#[instrument]` o `tracing::info!` y traduciéndolos al formato de OpenTelemetry en tiempo real.

### Anatomía de una Traza Distribuida

Antes de pasar al código, es vital alinear la terminología de OpenTelemetry con lo que ya conocemos:

* **Trace (Traza):** Representa el viaje completo de una petición a través de todo tu sistema distribuido. Técnicamente, es un árbol (o grafo dirigido) compuesto por múltiples Spans.
* **Span:** Representa una unidad de trabajo individual (una consulta a base de datos, el procesamiento de un endpoint, etc.). Como vimos en el capítulo de `tracing`, tienen un inicio, un fin, y metadatos (atributos).
* **Context (Contexto):** Es el mecanismo que permite que un Span sepa quién es su "padre", incluso si ese padre vive en otro microservicio. (Profundizaremos en la propagación de contexto en la siguiente sección).

### Configuración Inicial del Pipeline de OpenTelemetry

Para conectar nuestra aplicación Rust a OpenTelemetry, necesitamos construir un "Pipeline" de observabilidad. Este pipeline se encarga de recibir los eventos de `tracing`, convertirlos al estándar OTel, procesarlos (por ejemplo, agruparlos en lotes o aplicarles un muestreo para no saturar la red) y finalmente exportarlos.

Veamos un ejemplo de cómo configurar la base de este pipeline. Primero, añadimos las dependencias necesarias en nuestro `Cargo.toml`:

```toml
[dependencies]
opentelemetry = "0.21"
opentelemetry_sdk = "0.21"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["registry", "env-filter"] }
tracing-opentelemetry = "0.22"
```

A continuación, configuramos el proveedor global de trazas (Tracer Provider) y lo enlazamos con nuestro registro de `tracing`:

```rust
use opentelemetry::{global, KeyValue};
use opentelemetry_sdk::{trace as sdktrace, Resource};
use tracing_subscriber::{layer::SubscriberExt, Registry};
use tracing_subscriber::prelude::*;

/// Inicializa el pipeline de OpenTelemetry y lo enlaza con `tracing`
pub fn init_telemetry() {
    // 1. Definimos el "Recurso" (Resource). 
    // Esto añade metadatos globales a todas las trazas (ej. nombre del servicio, versión, entorno).
    let resource = Resource::new(vec![
        KeyValue::new("service.name", "my-rust-backend"),
        KeyValue::new("service.version", "1.0.0"),
        KeyValue::new("deployment.environment", "production"),
    ]);

    // 2. Configuramos el TracerProvider de OpenTelemetry.
    // Aquí es donde en el futuro (sección 39.3) añadiremos exportadores reales como Jaeger o OTLP.
    // Por ahora, configuramos un procesador básico en memoria.
    let tracer_provider = sdktrace::TracerProvider::builder()
        // SimpleSpanProcessor envía las trazas una por una. 
        // En producción usaremos BatchSpanProcessor.
        .with_simple_exporter(opentelemetry_stdout::SpanExporter::default()) 
        .with_resource(resource)
        .build();

    // 3. Registramos el proveedor globalmente
    global::set_tracer_provider(tracer_provider.clone());

    // 4. Creamos el Tracer específico para nuestra aplicación
    let tracer = global::tracer("my_app_tracer");

    // 5. Creamos la capa (Layer) de OpenTelemetry para `tracing`
    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    // 6. Construimos el Subscriber componiendo nuestras capas (Logs por consola + OpenTelemetry)
    let subscriber = Registry::default()
        .with(tracing_subscriber::fmt::layer()) // Mantenemos los logs estándar en consola
        .with(telemetry_layer);                 // Añadimos la exportación a OTel

    // 7. Establecemos el subscriber como el global por defecto
    tracing::subscriber::set_global_default(subscriber)
        .expect("Fallo al establecer el subscriber global de tracing");
}

fn main() {
    init_telemetry();

    // A partir de este momento, cualquier macro de `tracing` generará datos para OpenTelemetry
    do_work();

    // IMPORTANTE: Asegurarnos de que las trazas encoladas se envíen antes de cerrar el programa
    global::shutdown_tracer_provider();
}

#[tracing::instrument]
fn do_work() {
    tracing::info!("Realizando una operación crítica...");
    // Simulamos carga de trabajo
    std::thread::sleep(std::time::Duration::from_millis(50));
    tracing::info!("Operación finalizada con éxito.");
}
```

**Puntos clave del código:**

* **El `Resource`:** Es fundamental definir correctamente el recurso al inicializar el SDK. Sin la etiqueta `service.name`, tu backend de observabilidad (como Datadog o Grafana) agrupará las trazas como "unknown_service", dificultando la búsqueda.
* **El patrón de Composición:** Gracias a `Registry::default().with(...)`, no tenemos que elegir entre tener logs en la consola o enviar trazas por red. Ambas capas consumen los mismos eventos emitidos por `do_work()`.
* **El Apagado Elegante (Graceful Shutdown):** La llamada a `global::shutdown_tracer_provider()` es crucial en arquitecturas de backend. Los exportadores asíncronos agrupan las trazas en lotes (batches) para optimizar el uso de la red. Si el proceso termina repentinamente sin llamar a esta función, perderás las últimas trazas que aún residían en la memoria RAM.

Con esta infraestructura base establecida, nuestra aplicación Rust ya es capaz de emitir telemetría estándar. Sin embargo, el verdadero poder de OpenTelemetry no reside en un solo servicio, sino en conectar múltiples servicios. Para lograr eso, en la siguiente sección exploraremos cómo inyectar y extraer metadatos a través de las cabeceras HTTP y gRPC utilizando la **Propagación del Contexto**.

## 39.2 Propagación del contexto en peticiones HTTP y gRPC

En la sección anterior logramos que un servicio individual emitiera métricas y trazas estructuradas. Sin embargo, en una arquitectura de microservicios, una sola transacción de usuario a menudo atraviesa múltiples fronteras de red. Si el "Servicio A" llama al "Servicio B", y ambos generan trazas de forma aislada, en nuestro backend de observabilidad veremos dos operaciones desconectadas.

Para unir estas operaciones en una única **Traza Distribuida**, necesitamos pasar el "testigo" de un servicio a otro. A este proceso se le conoce como **Propagación del Contexto** (Context Propagation).

### El Estándar W3C Trace Context

Históricamente, cada herramienta de monitoreo utilizaba sus propias cabeceras HTTP para propagar el contexto (por ejemplo, `X-B3-TraceId` en Zipkin). Hoy en día, OpenTelemetry promueve y utiliza por defecto el estándar **W3C Trace Context**, que define dos cabeceras HTTP principales:

1. **`traceparent`**: Contiene la información crítica para enlazar la traza. Su formato es `version-trace_id-parent_id-trace_flags`.
    * *Ejemplo:* `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
2. **`tracestate`**: Permite a los distintos proveedores (Datadog, New Relic) propagar metadatos específicos del vendedor sin romper el estándar.

El flujo es simple: el cliente inyecta (`Inject`) su contexto actual en las cabeceras de la petición saliente. El servidor extrae (`Extract`) esas cabeceras al recibir la petición y establece ese contexto como el "padre" de su propio Span.

### Inyección y Extracción en HTTP (Axum y Reqwest)

Para trabajar con HTTP en Rust, OpenTelemetry proporciona el crate `opentelemetry_http`, el cual implementa los Traits necesarios para leer y escribir en los `HeaderMap` del ecosistema `http`.

**1. El Cliente: Inyectando contexto con `reqwest`**

Cuando nuestro servicio hace una petición externa usando `reqwest`, debemos tomar el contexto del `Span` actual e inyectarlo en los headers de la petición antes de enviarla.

```rust
use opentelemetry::global;
use opentelemetry_http::HeaderInjector;
use reqwest::Client;
use tracing_opentelemetry::OpenTelemetrySpanExt;

#[tracing::instrument(name = "llamar_servicio_b")]
pub async fn fetch_user_data(client: &Client, user_id: &str) -> Result<String, reqwest::Error> {
    let url = format!("http://servicio-b/api/users/{}", user_id);
    let mut request = client.get(&url).build()?;

    // 1. Obtenemos el contexto de OpenTelemetry atado al Span de tracing actual
    let context = tracing::Span::current().context();

    // 2. Usamos el propagador global (que por defecto es W3C) para inyectar 
    // las cabeceras en nuestra petición HTTP mutando sus headers
    global::get_text_map_propagator(|propagator| {
        propagator.inject_context(&context, &mut HeaderInjector(request.headers_mut()));
    });

    // 3. Ejecutamos la petición. ¡Ahora lleva el 'traceparent'!
    let response = client.execute(request).await?;
    response.text().await
}
```

**2. El Servidor: Extrayendo contexto en `axum`**

En el lado del receptor (por ejemplo, una API construida con Axum), necesitamos leer las cabeceras HTTP antes de procesar la ruta y decirle a `tracing` que el Span actual es "hijo" del Span que viene en las cabeceras.

Aunque lo ideal es hacerlo mediante un Middleware (usando `tower::Service`), a nivel conceptual y visual es más fácil entenderlo extrayéndolo directamente desde un handler o un extractor de Axum:

```rust
use axum::{http::HeaderMap, response::IntoResponse, routing::get, Router};
use opentelemetry::global;
use opentelemetry_http::HeaderExtractor;
use tracing_opentelemetry::OpenTelemetrySpanExt;

#[tracing::instrument(name = "procesar_usuario", skip(headers))]
async fn get_user_handler(headers: HeaderMap) -> impl IntoResponse {
    // 1. Extraemos el contexto padre desde las cabeceras HTTP entrantes
    let parent_context = global::get_text_map_propagator(|propagator| {
        propagator.extract(&HeaderExtractor(&headers))
    });

    // 2. Asociamos el contexto extraído como padre del Span actual
    tracing::Span::current().set_parent(parent_context);

    tracing::info!("Procesando petición con contexto distribuido");
    
    "Datos del usuario"
}
```

*Nota para producción:* En el ecosistema Axum, el crate `tracing-axum` automatiza gran parte de este middleware, permitiéndote extraer e inyectar contextos de forma transparente sin contaminar la lógica de negocio de tus handlers.

### Propagación en gRPC (Tonic)

Si recuerdas el Capítulo 33, gRPC funciona sobre HTTP/2. Por lo tanto, el concepto de cabeceras HTTP se traduce a **Metadata** en gRPC. El principio de inyección y extracción es exactamente el mismo, pero interactuando con `tonic::metadata::MetadataMap` en lugar de `http::HeaderMap`.

Para interceptar todas las peticiones entrantes en un servidor Tonic de forma global, utilizamos **Interceptors**.

Dado que `MetadataMap` de Tonic no implementa de forma nativa el Trait `Extractor` de OpenTelemetry, necesitamos crear un pequeño wrapper adaptador:

```rust
use opentelemetry::propagation::Extractor;
use tonic::metadata::MetadataMap;

// Wrapper para adaptar MetadataMap a OpenTelemetry
struct MetadataExtractor<'a>(&'a MetadataMap);

impl<'a> Extractor for MetadataExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|value| value.to_str().ok())
    }

    fn keys(&self) -> Vec<&str> {
        self.0.keys().map(|key| key.as_str()).collect()
    }
}
```

Una vez que tenemos nuestro adaptador, podemos crear la función interceptora que Tonic ejecutará en cada llamada gRPC entrante:

```rust
use opentelemetry::global;
use tonic::{Request, Status};
use tracing_opentelemetry::OpenTelemetrySpanExt;

/// Interceptor gRPC para extraer el contexto de OpenTelemetry
pub fn telemetria_interceptor(mut req: Request<()>) -> Result<Request<()>, Status> {
    let metadata = req.metadata();
    
    // Extraemos el contexto usando nuestro wrapper
    let parent_context = global::get_text_map_propagator(|propagator| {
        propagator.extract(&MetadataExtractor(metadata))
    });

    // Si estuviéramos dentro de un Span, lo asociaríamos aquí.
    // En Tonic, los Spans suelen crearse mediante la capa de `tower` que envuelve al servidor.
    tracing::Span::current().set_parent(parent_context);

    Ok(req)
}
```

Para el cliente gRPC (`tonic::client`), el proceso es el inverso: crearíamos un `MetadataInjector` que implemente el trait `Injector` de OpenTelemetry, y mutaríamos el `MetadataMap` de la `tonic::Request` antes de enviarla.

### Consideraciones Críticas de Rendimiento y Seguridad

* **Límites de Confianza:** Nunca confíes ciegamente en un `traceparent` que provenga de internet público (el frontend del usuario). El contexto distribuido debe iniciarse en tu API Gateway o Edge Proxy (como Nginx o Envoy) e inyectarse hacia tus servicios internos. Aceptar trazas externas permite a un atacante inyectar `trace-ids` falsos, fragmentando tus datos de observabilidad.
* **Overhead de Serialización:** La inyección de texto en cabeceras tiene un costo de serialización y asignación de memoria (`String` allocation). Aunque en Rust este costo es mínimo, en sistemas de altísimo throughput (millones de RPS), asegúrate de hacer *sampling* (muestreo) de forma inteligente en la cabeza del pipeline para no inyectar/extraer el 100% de las trazas a menos que sea necesario.

## 39.3 Exportación de trazas a Jaeger, Zipkin o Datadog

Hasta este punto, nuestra aplicación genera trazas estructuradas y es capaz de propagar su contexto a través de la red. Sin embargo, en la sección 39.1 configuramos un `SimpleSpanProcessor` que simplemente enviaba los datos a la salida estándar (`stdout`). Aunque esto es útil para depurar localmente, en un entorno de producción necesitamos enviar estas trazas a un backend especializado que nos permita visualizarlas, buscar cuellos de botella y analizar la latencia de nuestras peticiones.

Aquí es donde entran en juego los **Exportadores (Exporters)**.

### El Cambio de Paradigma: OTLP vs. Exportadores Nativos

Históricamente, si querías enviar datos a Jaeger, usabas un exportador específico para Jaeger. Si cambiabas a Zipkin, debías reescribir tu código para usar el exportador de Zipkin. Si migrabas a Datadog, necesitabas otro más.

Hoy en día, la industria ha convergido en **OTLP (OpenTelemetry Protocol)**. OTLP es el protocolo estándar de OpenTelemetry para la transmisión de telemetría. La recomendación actual (y la mejor práctica para un desarrollador Senior) es que tu aplicación Rust exporte **siempre** en formato OTLP (generalmente sobre gRPC o HTTP).

> **Nota de Arquitectura:** En lugar de enviar los datos directamente desde Rust hasta la nube de Datadog o New Relic, la arquitectura moderna dicta enviar los datos OTLP a un componente intermedio llamado **OpenTelemetry Collector** (o al Datadog Agent) desplegado en tu misma infraestructura. Este agente se encarga de recibir, procesar, añadir claves de API y rutear la información al proveedor final.

### Implementando la Exportación con OTLP y Procesamiento por Lotes

Para enviar datos a un backend real sin penalizar el rendimiento de nuestra aplicación, debemos reemplazar el `SimpleSpanProcessor` por un **`BatchSpanProcessor`**. Este procesador acumula los `Spans` en memoria y los envía en lotes (batches) de forma asíncrona en un hilo separado, evitando bloquear el hilo principal que atiende peticiones HTTP o gRPC.

Primero, actualizamos nuestro `Cargo.toml` para incluir el exportador OTLP soportado por `tonic` (gRPC):

```toml
[dependencies]
# Añadimos opentelemetry-otlp con soporte para gRPC
opentelemetry-otlp = { version = "0.14", features = ["grpc-tonic"] }
```

Ahora, refactorizamos nuestra función de inicialización:

```rust
use opentelemetry::{global, KeyValue};
use opentelemetry_sdk::{trace as sdktrace, Resource};
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer::SubscriberExt, Registry};
use tracing_subscriber::prelude::*;

pub fn init_production_telemetry() {
    // 1. Definimos el recurso (igual que antes)
    let resource = Resource::new(vec![
        KeyValue::new("service.name", "orders-api"),
        KeyValue::new("deployment.environment", "production"),
    ]);

    // 2. Configuramos el exportador OTLP vía gRPC
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://localhost:4317"); // Endpoint por defecto del OTel Collector o Jaeger

    // 3. Construimos el TracerProvider usando un procesador por lotes (Batch)
    let tracer_provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_trace_config(
            sdktrace::config()
                .with_resource(resource)
                // Opcional: Configurar muestreo (ej. retener solo el 10% de las trazas)
                .with_sampler(sdktrace::Sampler::TraceIdRatioBased(0.1)),
        )
        // OTLP pipeline ya configura un BatchSpanProcessor internamente por defecto
        .install_batch(opentelemetry_sdk::runtime::Tokio)
        .expect("Error al instalar el pipeline de OTLP");

    global::set_tracer_provider(tracer_provider.clone());

    let tracer = global::tracer("orders_tracer");
    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    let subscriber = Registry::default()
        .with(tracing_subscriber::fmt::layer())
        .with(telemetry_layer);

    tracing::subscriber::set_global_default(subscriber)
        .expect("Fallo al configurar el subscriber global");
}
```

### Consideraciones por Backend (Jaeger, Zipkin, Datadog)

Si bien usamos OTLP en el código de Rust, la forma en que consumimos estos datos varía según el destino:

* **Jaeger:** Es la opción más popular para desarrollo local. Las versiones modernas de Jaeger aceptan OTLP nativamente. Puedes levantar un contenedor de Jaeger todo-en-uno que escuche en el puerto `4317` (gRPC), y tu código Rust funcionará sin modificaciones adicionales.
* **Zipkin:** Si tu infraestructura está atada a Zipkin de forma estricta y no puedes usar un OTel Collector intermedio, puedes prescindir del crate `opentelemetry-otlp` y usar `opentelemetry-zipkin`. Este exportador convierte los `Spans` de Rust al formato JSON de Zipkin y los envía mediante HTTP.
* **Datadog:** Para enviar a Datadog, la arquitectura recomendada es usar el pipeline OTLP de Rust (como en el código de arriba) apuntando al puerto `4318` (HTTP) o `4317` (gRPC) del **Datadog Agent** que corre como demonio en tu servidor o como DaemonSet en Kubernetes. El agente de Datadog está preconfigurado para traducir OTLP al formato propietario de Datadog e inyectar tus etiquetas de infraestructura. Existe un crate `opentelemetry-datadog`, pero la propia documentación oficial sugiere usar OTLP para asegurar la portabilidad del código.

## 39.4 Trazabilidad en operaciones de base de datos asíncronas

Hemos instrumentado nuestros endpoints y logrado propagar el contexto a través de la red hacia otros microservicios. Sin embargo, una traza distribuida está incompleta si termina abruptamente justo en la frontera de la base de datos. En el desarrollo backend del mundo real, la gran mayoría de los cuellos de botella y problemas de latencia no ocurren en el procesamiento de la CPU, sino en consultas SQL ineficientes, falta de índices o bloqueos (deadlocks) en la base de datos.

Instrumentar las operaciones asíncronas de base de datos nos permite responder a preguntas críticas directamente desde nuestro panel de Jaeger o Datadog: *¿Cuánto tiempo exacto tomó esta consulta? ¿Qué sentencia SQL se ejecutó realmente? ¿Cuántas filas devolvió?*

Dado que en el **Capítulo 20** establecimos a `sqlx` como nuestro estándar asíncrono para bases de datos relacionales, nos centraremos en cómo integrarlo de manera nativa con el ecosistema de `tracing` y OpenTelemetry.

### La Ventaja de `sqlx`: Instrumentación Nativa

La adopción masiva de `tracing` en el ecosistema Rust significa que muchas de las librerías fundamentales ya vienen pre-instrumentadas. En el caso de `sqlx`, la librería emite eventos y `Spans` de `tracing` por debajo del capó cada vez que ejecutas una consulta, preparas una sentencia o abres una transacción.

Para habilitar esto, simplemente debes asegurarte de que tu `Cargo.toml` no desactive las features por defecto, o explícitamente habilitar características relacionadas con logs si estás usando versiones específicas. En las versiones modernas de `sqlx`, el soporte de `tracing` está fuertemente integrado.

Cuando ejecutas una consulta como `sqlx::query!("SELECT * FROM users").fetch_all(&pool).await`, `sqlx` generará un evento que incluye:

* La sentencia SQL exacta.
* El tiempo de ejecución.
* Las filas afectadas.

Sin embargo, para que estos eventos de `sqlx` se aniden correctamente dentro de la traza de nuestra petición HTTP o gRPC, necesitamos envolver nuestras llamadas a repositorios utilizando la macro `#[instrument]`.

### Instrumentando el Patrón Repositorio

Imaginemos que tenemos una capa de acceso a datos (como vimos en el Capítulo 29 sobre Arquitectura Limpia). Queremos crear un `Span` que represente la operación semántica (ej. "obtener usuario por email") y que sirva como padre directo de las operaciones internas de `sqlx`.

Aquí es donde entra en juego el uso estratégico de la macro `#[instrument]` y las **Convenciones Semánticas de OpenTelemetry**.

```rust
use sqlx::{PgPool, Error};
use tracing::instrument;

#[derive(Debug)]
pub struct User {
    pub id: uuid::Uuid,
    pub email: String,
}

/// Obtenemos un usuario desde PostgreSQL.
/// Usamos convenciones de OpenTelemetry para los nombres de los atributos.
#[instrument(
    name = "db.query.get_user_by_email", // Nombre claro para el Span
    skip(pool),                          // No queremos registrar el pool entero en la traza
    fields(
        db.system = "postgresql",
        db.operation = "SELECT",
        db.user = "app_user",
        // Podemos inyectar el email buscado para facilitar la depuración,
        // siempre y cuando las políticas de privacidad (PII) de tu empresa lo permitan.
        user.email = %email 
    ),
    err // Si la función devuelve un Err, el Span se marcará con estado de Error automáticamente
)]
pub async fn get_user_by_email(pool: &PgPool, email: &str) -> Result<User, Error> {
    
    // El Span de esta función ya está activo. 
    // Los eventos internos de sqlx se registrarán como "hijos" de `db.query.get_user_by_email`.
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT id, email 
        FROM users 
        WHERE email = $1
        "#,
        email
    )
    .fetch_one(pool)
    .await?;

    Ok(user)
}
```

**Análisis de la Instrumentación:**

1. **Convenciones Semánticas (Semantic Conventions):** Fíjate en el uso de atributos como `db.system` y `db.operation`. OpenTelemetry define un estándar estricto de nombres para las bases de datos. Si usas estas claves exactas, los backends modernos (como Datadog o New Relic) reconocerán automáticamente que este Span es una operación de base de datos y lo pintarán con un icono y color especial en el mapa de dependencias, además de extraer métricas automáticas de rendimiento de base de datos.
2. **`skip(pool)`:** Es crucial omitir argumentos complejos que no aportan valor a la traza y que podrían ser costosos de formatear (o que no implementan `Debug`).
3. **El atributo `err`:** Al añadir `err` a la macro, le decimos a `tracing` que si la función retorna `Result::Err`, debe registrar el error capturado y marcar el Span de OpenTelemetry con el flag de fallo (`StatusCode::Error`). Esto pintará la traza de color rojo en tu visualizador.

### Manejo de Consultas Concurrentes (Futures desordenados)

Uno de los mayores desafíos en Rust asíncrono es cuando ejecutamos múltiples consultas a la base de datos en paralelo utilizando `tokio::spawn` o `futures::future::join_all`.

Si lanzas una tarea en un nuevo hilo con `tokio::spawn`, **el contexto del Span actual se pierde**, porque el hilo de ejecución cambia. Para propagar el contexto a una tarea en segundo plano (background task) que ejecuta operaciones de base de datos, debes adjuntar el Span explícitamente usando el método `.instrument()` proporcionado por el trait `Instrument` de `tracing`.

```rust
use tracing::{info_span, Instrument};
use tokio::task;

pub async fn procesar_pedidos_en_paralelo(pool: PgPool, pedido_ids: Vec<i32>) {
    let mut handles = vec![];

    for id in pedido_ids {
        let pool_clon = pool.clone();
        
        // Creamos un Span específico para cada iteración/tarea
        let span = info_span!("procesar_pedido_db", pedido.id = id);

        // Lanzamos la tarea y le "enganchamos" el Span.
        // Toda la actividad de base de datos en esta tarea se asociará correctamente.
        let handle = task::spawn(async move {
            // Lógica de base de datos asíncrona usando sqlx...
            sqlx::query!("UPDATE pedidos SET estado = 'procesado' WHERE id = $1", id)
                .execute(&pool_clon)
                .await
                .unwrap();
        }.instrument(span)); // <-- Propagación explícita del contexto

        handles.push(handle);
    }

    futures::future::join_all(handles).await;
}
```

### Prevención de Fugas de Datos (Data Leaks)

Cuando instrumentes consultas a bases de datos, ten extremo cuidado con la información de identificación personal (PII) o datos sensibles como contraseñas, tokens JWT o números de tarjetas de crédito.

Aunque `sqlx` registra las sentencias SQL preparadas (con los placeholders `$1`, `$2`), si tú decides inyectar los valores de las variables en los campos del Span (usando `fields(...)` o `tracing::info!`), esos datos volarán a tu servidor de OpenTelemetry y quedarán almacenados en texto plano en tus sistemas de logs, lo cual viola normativas como GDPR o PCI-DSS. Usa siempre la directiva `skip(...)` en la macro `#[instrument]` para las variables sensibles.

Con esto, concluimos el **Capítulo 39**, logrando una visibilidad completa de nuestra aplicación, desde la entrada HTTP hasta la consulta SQL más profunda, propagando el contexto en sistemas distribuidos utilizando los estándares de la industria.
