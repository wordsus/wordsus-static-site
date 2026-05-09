En el desarrollo de backend con Rust, la observabilidad es el pilar que separa un sistema "caja negra" de uno resiliente y mantenible. Mientras que el logging tradicional se limita a emitir líneas de texto inconexas, el **logging estructurado** permite transformar eventos de ejecución en datos con semántica y contexto. En este capítulo, exploraremos la transición desde el ecosistema clásico de `log` hacia la potencia de `tracing`, una herramienta diseñada específicamente para entornos asíncronos. Aprenderemos a capturar el ciclo de vida de las peticiones mediante Spans jerárquicos y a configurar salidas JSON de alto rendimiento, sentando las bases para una monitorización profesional.

## 37.1 El facade de `log` vs el ecosistema `tracing`

En las partes anteriores del libro, especialmente al construir APIs con Axum (Capítulo 17) y explorar las profundidades de Tokio (Capítulo 32), hemos visto cómo Rust maneja miles de conexiones de forma concurrente multiplexando tareas en unos pocos hilos del sistema operativo. Esta asincronía, aunque excelente para el rendimiento, introduce un problema crítico para la observabilidad: **perdemos el contexto de ejecución lineal.**

Históricamente, el ecosistema de Rust estandarizó la emisión de mensajes de diagnóstico a través del crate `log`. Sin embargo, las demandas de los backends modernos y asíncronos han impulsado la adopción de un estándar mucho más robusto: `tracing`. Para entender por qué este cambio es necesario, debemos analizar las limitaciones del enfoque clásico.

### El límite del crate `log`

El crate `log` es un *facade* (fachada). Proporciona un conjunto de macros estándar (`error!`, `warn!`, `info!`, `debug!`, `trace!`) que las librerías pueden usar para emitir mensajes, delegando en la aplicación final la elección de cómo y dónde guardar esos mensajes (usando implementaciones como `env_logger` o `fern`).

Un uso típico se ve así:

```rust
use log::{info, debug};

pub fn procesar_pago(usuario_id: u32, monto: f64) {
    info!("Iniciando procesamiento de pago para el usuario {}", usuario_id);
    // ... lógica de negocio ...
    debug!("Pago de {} procesado correctamente", monto);
}
```

Para aplicaciones de consola simples o backends síncronos, esto es suficiente. El problema surge en un entorno altamente concurrente. Si cien usuarios realizan pagos al mismo tiempo, los logs en tu salida estándar se entrelazarán. Verás un `info!` del usuario A, seguido de un `info!` del usuario B, y luego un `debug!` que no sabrás a ciencia cierta a quién pertenece sin un esfuerzo manual exhaustivo para concatenar IDs en cada línea de código.

Además, `log` está diseñado principalmente para **texto plano**. Aunque puedes formatear variables dentro de la cadena, extraer esa información en sistemas de análisis (como Elasticsearch o Datadog) requiere parseo mediante expresiones regulares frágiles.

### El cambio de paradigma: `tracing`

Desarrollado y mantenido por el equipo detrás de Tokio, el crate `tracing` no es solo una librería de logs; es un framework de instrumentación estructurada y basada en eventos, diseñado desde cero para programas asíncronos.

`tracing` introduce dos conceptos fundamentales que lo separan de `log`:

1. **Eventos (Events):** Representan algo que ocurrió en un momento específico en el tiempo. Son el equivalente directo a una línea de log (`info!`, `error!`), pero en lugar de ser solo texto, son pares de **clave-valor** (Logging estructurado).
2. **Spans (Lapsos/Contextos):** Representan un período de tiempo con un inicio y un fin. Los Spans pueden contener información estructurada (como un `request_id` o `usuario_id`) y **envuelven** a los eventos que ocurren dentro de ellos.

Veamos la diferencia conceptual aplicada al código:

```rust
use tracing::{info, info_span};

pub fn procesar_pago(usuario_id: u32, monto: f64) {
    // Creamos un Span con datos estructurados
    let span = info_span!("procesamiento_pago", usuario_id = %usuario_id);
    
    // Entramos al contexto del Span
    let _enter = span.enter();

    // Este evento hereda automáticamente el contexto del Span.
    // No necesitamos pasar el usuario_id en el mensaje de texto.
    info!(monto = %monto, "Iniciando validación de fondos");
    
    // ... lógica ...
    
    info!("Pago completado"); 
    // Al salir de la función, el `_enter` se destruye (Drop) y salimos del Span
}
```

En este caso, cualquier evento emitido dentro de la función `procesar_pago` (o en funciones anidadas llamadas desde ahí) estará automáticamente etiquetado con `usuario_id`. Los sistemas de observabilidad recibirán JSONs limpios en lugar de cadenas de texto, permitiéndote filtrar fácilmente "todos los logs donde `usuario_id == 42`".

### El problema asíncrono y la magia de `.instrument()`

El verdadero superpoder de `tracing` frente a `log` brilla en las funciones `async`.

En Tokio, una tarea asíncrona puede hacer un `.await` (por ejemplo, esperando a la base de datos). Mientras espera, el hilo de Tokio pausa esa tarea y comienza a ejecutar otra. Si usamos el `span.enter()` tradicional de manera síncrona a través de un punto `.await`, el hilo podría empezar a ejecutar código de *otra* petición web, pero los logs de esa nueva petición quedarían erróneamente registrados bajo el Span de la petición original.

`tracing` soluciona esto permitiendo adjuntar Spans directamente a los *Futures*. Así, el contexto se guarda y se restaura automáticamente cada vez que Tokio retoma la ejecución de la tarea:

```rust
use tracing::{info, info_span, Instrument};

async fn realizar_cargo_db(monto: f64) {
    // Simulamos una consulta a base de datos
    info!("Ejecutando INSERT en la base de datos...");
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
}

pub async fn procesar_pago_async(usuario_id: u32, monto: f64) {
    let span = info_span!("pago_async", usuario_id = usuario_id);
    
    // Adjuntamos el Span al Future. El contexto sobrevive de forma
    // segura a cualquier .await interno.
    async move {
        info!("Iniciando procesamiento");
        realizar_cargo_db(monto).await;
        info!("Procesamiento finalizado");
    }
    .instrument(span)
    .await;
}
```

*(Nota: En la práctica, como veremos en la siguiente sección, esto se simplifica enormemente usando la macro `#[tracing::instrument]` encima de la función).*

### Compatibilidad hacia atrás

Una preocupación común al migrar un backend maduro es qué ocurre con las cientos de dependencias (crates de terceros) que todavía usan las macros estándar de `log`.

Afortunadamente, el ecosistema de `tracing` incluye compatibilidad bidireccional. Mediante crates como `tracing-log`, puedes configurar tu aplicación para que intercepte todas las llamadas tradicionales de `log` (como un viejo `log::info!` de una librería de base de datos) y las convierta automáticamente en Eventos de `tracing` dentro del Span activo. Esto permite modernizar la observabilidad de tu aplicación sin necesidad de reescribir todo el ecosistema de crates que utilizas.

En resumen, mientras que `log` nos dice *qué* pasó en forma de texto plano, `tracing` nos dice *qué* pasó, *cuándo*, en *qué contexto*, y de una forma que las máquinas pueden indexar y consultar instantáneamente. Para un backend escrito en Rust a nivel Senior, `tracing` no es opcional; es la base fundacional de la fiabilidad.

## 37.2 Creación de Spans y eventos jerárquicos

En la sección anterior definimos que un **Span** representa un lapso de tiempo con un inicio y un fin, mientras que un **Evento** es un punto en el tiempo (un log tradicional). Sin embargo, el verdadero poder arquitectónico de `tracing` reside en su capacidad para componer estos Spans de forma **jerárquica**.

Cuando una petición HTTP llega a tu servidor Axum, rara vez ejecuta una sola función plana. Normalmente, el controlador web llama a un caso de uso (dominio), que a su vez llama a un repositorio (base de datos), el cual podría interactuar con un servicio de caché (Redis). Esta ejecución forma un "árbol" de llamadas. `tracing` nos permite modelar exactamente este árbol, de modo que cada evento de log sepa exactamente quién es su "padre" y su "abuelo".

### La macro `#[instrument]`: El estándar de la industria

Aunque puedes crear Spans manualmente usando macros como `info_span!()` y gestionando el guardia `span.enter()`, la forma idiomática y más limpia de trabajar en Rust moderno es mediante la macro procedimental `#[tracing::instrument]`.

Esta macro se coloca encima de cualquier función (síncrona o asíncrona) y hace el trabajo pesado por ti:

1. Crea un nuevo Span con el nombre de la función.
2. Adjunta automáticamente todos los argumentos de la función como campos estructurados (clave-valor) del Span.
3. Entra en el Span al iniciar la función y sale al terminar (o maneja correctamente el contexto a través de los `.await` si es asíncrona).

```rust
use tracing::{info, instrument};
use uuid::Uuid;

// Con solo esta línea, creamos un Span llamado "obtener_perfil_usuario"
// que incluirá el campo `usuario_id` automáticamente.
#[instrument]
pub async fn obtener_perfil_usuario(usuario_id: Uuid) -> Result<(), String> {
    info!("Iniciando la búsqueda del perfil"); // Este log hereda el Span
    
    consultar_base_de_datos(usuario_id).await?;
    
    info!("Perfil obtenido con éxito");
    Ok(())
}

#[instrument]
async fn consultar_base_de_datos(id: Uuid) -> Result<(), String> {
    // Simulamos latencia
    info!("Ejecutando SELECT en Postgres...");
    // ...
    Ok(())
}
```

En este ejemplo, cuando `obtener_perfil_usuario` llama a `consultar_base_de_datos`, el Span de la base de datos se convierte automáticamente en un **hijo** del Span del perfil. Si exportáramos esto a un sistema como Jaeger, veríamos una cascada visual perfecta.

### Personalización avanzada de `#[instrument]`

En el mundo real de un backend a nivel Senior, no querrás registrar *todos* los argumentos. Algunos pueden ser demasiado grandes (como un body JSON completo), irrelevantes (como el pool de conexiones a la base de datos) o, lo que es peor, **sensibles** (como contraseñas o tokens JWT).

La macro `#[instrument]` ofrece atributos para afinar este comportamiento:

* **`skip`**: Omite argumentos específicos para que no se registren en el Span.
* **`skip_all`**: Omite todos los argumentos (útil cuando la función recibe structs gigantes).
* **`fields`**: Añade campos personalizados al Span que no provienen directamente de los argumentos, o inyecta variables internas.
* **`err`**: Si la función devuelve un `Result`, registrará automáticamente un evento de nivel `ERROR` si el resultado es `Err`.
* **`ret`**: Registra automáticamente el valor de retorno (útil para debug).

Veamos un ejemplo de un servicio de autenticación blindado:

```rust
use tracing::instrument;

#[derive(Debug)]
pub struct Credenciales {
    pub email: String,
    pub password_plana: String,
}

#[instrument(
    name = "autenticar_usuario",      // Sobrescribe el nombre de la función
    skip(pool, creds),                // NUNCA loguear contraseñas ni el pool
    fields(
        usuario.email = %creds.email, // Extraemos solo el email
        db.tipo = "postgres"          // Campo estático
    ),
    err                               // Loguear errores automáticamente
)]
pub async fn autenticar(
    pool: &sqlx::PgPool,
    creds: Credenciales
) -> Result<String, sqlx::Error> {
    
    // Si esta query falla, `tracing` emitirá un ERROR de forma automática
    // detallando el fallo, adjuntando el `usuario.email`, y manteniendo
    // la contraseña a salvo.
    let token = realizar_query_segura(pool, &creds.email, &creds.password_plana).await?;
    
    Ok(token)
}
```

> **Nota sobre el formateo:** En el atributo `fields`, notarás el símbolo `%` (`%creds.email`). Esto le indica a `tracing` que debe usar el trait `Display` para formatear el valor. Si usáramos `?`, utilizaría el trait `Debug`. Si omites ambos, el tipo debe implementar el trait interno `Value` de `tracing`.

### Construyendo el contexto desde Axum

Para que esta jerarquía tenga sentido, necesitamos un Span "raíz" en el límite de nuestra aplicación. En Axum, esto se logra típicamente mediante middlewares (como veremos al hablar de la integración con `tower-http`).

Un flujo ideal en tu backend funcionará así:

1. **Middleware de Axum:** Crea el Span raíz `request HTTP` (adjuntando `method=POST`, `uri=/login`, `request_id=1234`).
2. **Handler:** Hereda el Span raíz y llama al servicio.
3. **Servicio (`#[instrument]`):** Crea un Span hijo `autenticar_usuario`.
4. **Repositorio (`#[instrument]`):** Crea un Span nieto `db_query`.

Cualquier advertencia o error que ocurra en la capa de base de datos viajará hacia arriba, incluyendo el `request_id`, el `email` del intento de login, y el método HTTP, permitiendo una depuración clínica y sin ambigüedades en producción.

## 37.3 Filtrado dinámico de logs (EnvFilter)

A estas alturas, sabemos cómo generar eventos estructurados y organizarlos en jerarquías usando Spans. Sin embargo, en un entorno de producción con miles de peticiones por segundo, registrar cada evento de nivel `DEBUG` o `TRACE` generará gigabytes de texto en cuestión de minutos. Esto no solo satura los sistemas de almacenamiento (como Elasticsearch o Loki), sino que también degrada severamente el rendimiento del servidor por el costo de I/O.

El ecosistema `tracing` resuelve este problema separando la *emisión* de logs de su *consumo*. Mientras que el crate `tracing` (que usamos en el código de nuestra app) emite los eventos, el crate `tracing-subscriber` se encarga de recolectarlos, filtrarlos y darles formato.

Para controlar exactamente qué se registra y qué se descarta de forma extremadamente eficiente, utilizamos la capa **`EnvFilter`**.

### ¿Qué es `EnvFilter`?

`EnvFilter` es un componente de `tracing-subscriber` que evalúa cada Span y Evento en el momento en que se genera. Si el evento no cumple con las reglas de filtrado establecidas, se descarta inmediatamente, evitando el costo de formateo y escritura.

Por defecto, `EnvFilter` lee sus reglas de filtrado desde la variable de entorno `RUST_LOG`, lo que nos permite cambiar la verbosidad de nuestra aplicación al desplegarla sin necesidad de recompilar el código.

### Configuración base

Para inicializar el sistema de logs con un filtro dinámico, normalmente configuramos un *subscriber* global en el punto de entrada de nuestra aplicación (`main.rs`):

```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn inicializar_tracing() {
    // 1. Configuramos el filtro. 
    // Si RUST_LOG no está definido, usamos "info" por defecto.
    let filter_layer = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // 2. Configuramos el formato de salida (texto plano para consola en este caso)
    let fmt_layer = tracing_subscriber::fmt::layer()
        .compact(); // Formato conciso

    // 3. Ensamblamos el subscriber global con ambas capas
    tracing_subscriber::registry()
        .with(filter_layer)
        .with(fmt_layer)
        .init();
}
```

### Sintaxis de las Directivas de Filtrado

El verdadero poder de `EnvFilter` radica en su sintaxis de directivas, que nos permite aplicar niveles de log diferentes a distintos módulos o crates. La estructura general es `[target][span{field=value}]=level`.

Veamos ejemplos comunes de lo que podrías pasar en la variable `RUST_LOG`:

* **`info`**: Habilita el nivel INFO y superior (WARN, ERROR) para *toda* la aplicación y sus dependencias.
* **`mi_backend=debug,info`**: Habilita DEBUG solo para el código de tu crate (`mi_backend`), pero restringe todo lo demás (como las dependencias de Tokio o Axum) al nivel INFO. Esta es la configuración más recomendada para desarrollo.
* **`tower_http=trace,mi_backend=debug`**: Extremadamente útil al depurar APIs. Activa el nivel TRACE para el crate `tower_http` (lo que te mostrará cada request y response HTTP al mínimo detalle) y DEBUG para tu lógica de negocio.
* **`mi_backend::servicios::auth=trace,info`**: Filtrado granular a nivel de módulo. Solo el submódulo `auth` emitirá logs de nivel TRACE.
* **`[obtener_perfil_usuario]=debug`**: Filtra por nombre de Span. Solo registrará logs de nivel DEBUG si ocurren dentro de un Span llamado `obtener_perfil_usuario`.

Ejecutar tu aplicación con estas reglas es tan sencillo como:

```bash
RUST_LOG="mi_backend=debug,sqlx=warn" cargo run
```

### Llevándolo al nivel Senior: Filtrado Dinámico en Tiempo de Ejecución (Reloading)

Depender de variables de entorno requiere reiniciar el proceso si queremos investigar un incidente en producción. En sistemas de alta disponibilidad, reiniciar un nodo solo para activar el nivel `DEBUG` puede ocultar el error que estábamos intentando cazar (por ejemplo, si era un problema de estado en memoria).

Para resolver esto, `tracing-subscriber` ofrece la capa `Reload`. Podemos exponer un endpoint HTTP privado (solo accesible por administradores) que actualice las reglas de `EnvFilter` al vuelo:

```rust
use tracing_subscriber::{filter::EnvFilter, reload, Registry};
use tracing_subscriber::prelude::*;

// Esta configuración nos devuelve un "Handle" que podemos guardar en el 
// estado de Axum (AppState) para modificar el filtro más tarde.
pub fn setup_dynamic_tracing() -> reload::Handle<EnvFilter, Registry> {
    let filter = EnvFilter::new("info");
    let (filter_layer, reload_handle) = reload::Layer::new(filter);

    tracing_subscriber::registry()
        .with(filter_layer)
        .with(tracing_subscriber::fmt::layer())
        .init();

    reload_handle
}

// Ejemplo conceptual de un Handler de Axum para cambiar el log level
// POST /admin/log-level?directive=mi_backend=debug
/*
async fn cambiar_nivel_log(
    State(handle): State<ReloadHandle>, 
    Query(params): Query<LogParams>
) {
    let nuevo_filtro = EnvFilter::new(params.directive);
    let _ = handle.modify(|filter| *filter = nuevo_filtro);
}
*/
```

Con esta arquitectura, tu backend puede operar silenciosamente en nivel `ERROR` para conservar recursos, y ante una anomalía, un equipo de SRE puede inyectar dinámicamente una directiva `mi_backend::modulo_fallido=trace` durante 5 minutos para capturar el problema sin tirar ninguna conexión.

## 37.4 Salida JSON y exportación a ELK/Loki

Hasta ahora, hemos configurado `tracing` para emitir logs estructurados y filtrarlos dinámicamente, pero la salida por defecto de `tracing_subscriber::fmt` está pensada para el ojo humano (texto plano en la terminal).

En un entorno de producción moderno, los humanos rara vez leen los logs directamente desde la consola del servidor. En su lugar, utilizamos sistemas de agregación y búsqueda como **ELK** (Elasticsearch, Logstash, Kibana) o el ecosistema de Grafana con **Loki**. Para que estas herramientas puedan indexar, buscar y crear dashboards de manera eficiente, nuestros logs deben abandonar el formato de texto plano y adoptar el estándar universal de la web: **JSON**.

### Configuración de la capa JSON

Convertir nuestra salida jerárquica a JSON es trivial con `tracing-subscriber`. Solo necesitamos modificar la capa de formateo llamando al método `.json()`.

Sin embargo, a nivel de arquitectura, imprimir JSON directamente a la salida estándar (`stdout`) en un servidor asíncrono de alto rendimiento introduce un riesgo oculto: **el bloqueo por I/O**.

Si miles de tareas de Tokio intentan escribir en `stdout` simultáneamente, el hilo del sistema operativo puede bloquearse, degradando la latencia de tu API. Para mitigar esto, el equipo de Tokio proporciona el crate `tracing-appender`, que delega la escritura real de los logs a un hilo en segundo plano (Worker Thread), liberando inmediatamente al hilo principal.

Veamos cómo se configura una salida JSON no bloqueante:

```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use tracing_appender::non_blocking::WorkerGuard;

pub fn inicializar_tracing_produccion() -> WorkerGuard {
    // 1. Configuramos el filtro (ej. leyendo de RUST_LOG)
    let filter_layer = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // 2. Configuramos la escritura no bloqueante a stdout
    // (También podríamos usar tracing_appender::rolling::daily para escribir en archivos)
    let (non_blocking_writer, guard) = tracing_appender::non_blocking(std::io::stdout());

    // 3. Configuramos la capa JSON usando el escritor no bloqueante
    let json_layer = tracing_subscriber::fmt::layer()
        .json()
        .flatten_event(true) // Aplana los campos anidados para mejor compatibilidad con ELK
        .with_current_span(true) // Incluye los datos del Span actual
        .with_writer(non_blocking_writer);

    // 4. Inicializamos el subscriber
    tracing_subscriber::registry()
        .with(filter_layer)
        .with(json_layer)
        .init();

    // IMPORTANTE: Debemos retornar el 'guard' y mantenerlo vivo en main().
    // Si el 'guard' hace drop, el hilo en segundo plano se destruye y los logs se pierden.
    guard
}
```

Al ejecutar una función instrumentada con esta configuración, la salida en consola dejará de ser texto y se verá similar a esto (formateado para legibilidad):

```json
{
  "timestamp": "2026-03-25T03:30:25.123Z",
  "level": "INFO",
  "fields": {
    "message": "Pago completado",
    "monto": 150.50
  },
  "target": "mi_backend::pagos",
  "span": {
    "name": "procesar_pago_async",
    "usuario_id": 42
  },
  "spans": [
    {"name": "request_http", "method": "POST", "uri": "/pagos"}
  ]
}
```

### Estrategias de Exportación (Shipping Logs)

Una vez que tu aplicación Rust está emitiendo JSON eficiente y estructurado, el siguiente paso es llevar esa información a ELK o Loki.

Existen crates de la comunidad como `tracing-loki` o `tracing-elastic` que envían los logs directamente desde tu código Rust hacia la base de datos a través de peticiones HTTP. **A nivel Senior, esta topología suele considerarse un antipatrón en sistemas de alta disponibilidad.** Si tu clúster de Elasticsearch sufre una caída temporal, tu aplicación Rust no debería gastar memoria RAM encolando logs ni desperdiciar ciclos de CPU reintentando conexiones de red ajenas a la lógica de negocio.

La arquitectura recomendada (basada en los principios de *12-Factor App*) consta de dos piezas:

1. **La Aplicación Rust:** Se limita exclusivamente a escupir logs en formato JSON estructurado hacia `stdout` (si corres en contenedores Docker/Kubernetes) o hacia un archivo rotativo en disco.
2. **El Agente Recolector (Log Shipper / Sidecar):** Un proceso independiente ejecutándose en la misma máquina o nodo. Herramientas líderes como **Vector** (escrito también en Rust), **Promtail** (nativo para Loki) o **Fluent Bit** se encargan de leer esa salida estándar o ese archivo.

**El flujo de trabajo profesional:**
Tu binario compila los eventos de `tracing` a JSON -> Lo escribe en `stdout` sin bloquearse -> Docker/Kubernetes captura el `stdout` -> El agente (ej. Vector) lee el stream, añade metadatos de infraestructura (como el ID del contenedor, zona de AWS o nodo de Kubernetes) -> El agente envía los logs por red (HTTP/gRPC) hacia Elasticsearch o Loki, manejando los reintentos, el buffering en disco y el backpressure sin afectar en lo más mínimo el rendimiento de tu API construida con Axum.

Con esta infraestructura, tu backend en Rust se vuelve extremadamente resiliente, confiando en `tracing` para modelar el dominio de los eventos internamente, y en la infraestructura externa para la recolección y persistencia.
