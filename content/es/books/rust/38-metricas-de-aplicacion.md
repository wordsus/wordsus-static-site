La observabilidad no es solo saber qué ocurrió (logs), sino entender la salud del sistema en tiempo real. Mientras los logs narran eventos discretos, las **métricas** ofrecen una visión agregada y estadística indispensable para el escalado y la resiliencia. En este capítulo, exploraremos cómo transformar el comportamiento de nuestro backend en datos cuantificables utilizando el ecosistema `metrics-rs`. Aprenderás a configurar exportadores compatibles con **Prometheus**, instrumentar el código con contadores e histogramas de latencia, y monitorizar recursos críticos como CPU y memoria. Es el paso final para convertir una aplicación funcional en un servicio de grado producción.

## 38.1 Exportación de métricas con formato Prometheus (`metrics-rs`)

En el capítulo anterior, exploramos cómo estructurar logs y trazas para entender *qué* está ocurriendo en una petición específica. Sin embargo, para entender la salud global de nuestro sistema, responder a alertas y analizar tendencias a lo largo del tiempo, los logs no son la herramienta más eficiente. Aquí es donde entran las métricas.

En el ecosistema backend moderno, Prometheus se ha establecido como el estándar de facto para la recolección de métricas. Funciona bajo un modelo *pull* (el servidor de Prometheus hace peticiones periódicas a nuestra aplicación para recolectar el estado actual) y utiliza un formato de texto plano altamente eficiente y legible.

Para implementar esto en Rust, utilizaremos el patrón *Facade*, un concepto con el que ya estás familiarizado tras haber usado `log` y `tracing`. 

### El ecosistema `metrics`: El patrón Facade

En Rust, la recolección de métricas se divide en dos responsabilidades claramente separadas:

1. **La API de instrumentación (`metrics`):** Es el crate que utilizas en la lógica de tu dominio. Proporciona macros (como `counter!`, `gauge!`, `histogram!`) para registrar datos. Es completamente agnóstico sobre qué se hace con esos datos. Si no hay un "recorder" configurado, las macros son operaciones *no-op* (cuestan prácticamente cero CPU).
2. **El Recorder o Exportador (`metrics-exporter-prometheus`):** Es el motor que recibe los datos registrados por la API de `metrics`, los almacena en memoria y los expone en un formato específico, en este caso, el formato de texto de Prometheus.

Esta separación te permite instrumentar librerías internas y capas de dominio sin acoplarlas a Prometheus. Si el día de mañana decides cambiar a un sistema *push* como StatsD, solo necesitas cambiar el recorder en la capa de inicio (el `main.rs`), sin tocar una sola línea de tu lógica de negocio.

### El formato de Prometheus

Antes de configurarlo, es útil entender qué estamos generando. Cuando Prometheus "raspa" (scrapes) nuestra aplicación, espera recibir una respuesta HTTP en texto plano con un formato similar a este:

```text
# HELP app_requests_total The total number of HTTP requests.
# TYPE app_requests_total counter
app_requests_total{endpoint="/api/v1/users",method="GET"} 1432.0
app_requests_total{endpoint="/api/v1/users",method="POST"} 56.0
```

Cada línea representa una serie temporal única, definida por el nombre de la métrica (`app_requests_total`) y un conjunto de etiquetas o *labels* (clave-valor).

### Implementación y Configuración Base

Para comenzar, necesitamos añadir las dependencias necesarias a nuestro `Cargo.toml`. Usaremos la versión más reciente compatible con nuestro stack asíncrono basado en Tokio.

```toml
[dependencies]
metrics = "0.21"
metrics-exporter-prometheus = "0.12"
tokio = { version = "1", features = ["full"] }
```

El crate `metrics-exporter-prometheus` nos ofrece un `PrometheusBuilder`. La forma más rápida y robusta de exponer métricas en un entorno de producción es permitir que el propio exportador levante un servidor HTTP ligero en un hilo en segundo plano. Esto tiene una ventaja arquitectónica fundamental: **el aislamiento**. Si tu hilo principal de Tokio o tu servidor Axum/Actix se bloquea o satura, el endpoint de métricas seguirá respondiendo, permitiendo que tu sistema de monitoreo detecte el problema.

A continuación, veamos cómo inicializar el exportador:

```rust
use metrics::counter;
use metrics_exporter_prometheus::PrometheusBuilder;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Configurar e instalar el exportador global
    let builder = PrometheusBuilder::new();
    
    // Le indicamos que levante su propio listener en el puerto 9000
    builder
        .with_http_listener(([0, 0, 0, 0], 9000))
        .install()
        .expect("Fallo al instalar el Prometheus recorder");

    println!("Exportador de Prometheus escuchando en http://localhost:9000/metrics");

    // 2. Lógica simulada de nuestra aplicación
    loop {
        // Registramos una métrica. El uso detallado de estas macros
        // lo veremos en profundidad en la siguiente sección (38.2)
        counter!("backend_jobs_processed", "queue" => "emails").increment(1);
        counter!("backend_jobs_processed", "queue" => "images").increment(3);
        
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
}
```

Al ejecutar este código, el `PrometheusBuilder` hace dos cosas críticas bajo el capó mediante el método `install()`:
1. Registra su estructura interna como el global recorder estático del crate `metrics`.
2. Lanza un servidor HTTP hiper-ligero (normalmente basado en `hyper` o `quinn` dependiendo de los *features* habilitados) que escucha en la IP y puerto proporcionados.

Si realizas una petición `curl http://localhost:9000/metrics` mientras el programa está corriendo, verás la salida formateada lista para ser ingerida por tu clúster de Prometheus.

### Consideraciones sobre el endpoint

Aunque levantar un servidor HTTP independiente en el puerto 9000 (o 9090) es la práctica recomendada para microservicios internos, en algunas arquitecturas (como Serverless, o entornos con políticas de puertos muy restrictivas) puede que necesites exponer las métricas a través del mismo puerto de tu API principal (ej. el puerto 8080 en Axum). 

El `metrics-exporter-prometheus` también soporta este caso de uso devolviendo un `PrometheusHandle` en lugar de instalar su propio servidor HTTP, lo que te permite extraer el texto generado y servirlo tú mismo. Exploraremos la integración nativa como endpoint dentro del framework web en la sección 38.4.

Por ahora, ya tenemos la tubería principal configurada. En la siguiente sección (38.2), profundizaremos en la semántica de la API `metrics`, explorando cuándo y cómo usar Contadores, Gauges e Histogramas correctamente para modelar el comportamiento de tu sistema.

## 38.2 Contadores, Gauges e Histogramas

Ahora que tenemos nuestro pipeline de exportación configurado y escuchando peticiones de Prometheus, necesitamos alimentar el sistema con datos significativos. El crate `metrics` nos expone una serie de macros que se corresponden directamente con los tipos de datos fundamentales en el modelado de observabilidad.

Entender cuándo utilizar cada tipo de métrica es crucial; una elección incorrecta puede resultar en tableros de Grafana confusos, alertas que no saltan cuando deberían o, en el peor de los casos, la caída de tu servidor de Prometheus debido a una explosión de cardinalidad.

Existen tres tipos principales que utilizarás en el 99% de los casos: **Contadores**, **Gauges** e **Histogramas**.

### 1. Contadores (Counters)

Un contador es una métrica acumulativa que **solo puede aumentar** o reiniciarse a cero (cuando el proceso se reinicia). Es el tipo de métrica más simple y seguro de usar.

* **Casos de uso ideales:** Número total de peticiones HTTP, cantidad de errores registrados, tareas procesadas en una cola, o el total de bytes transferidos.
* **Por qué son útiles:** En Prometheus, los contadores rara vez se visualizan como un número absoluto estático. Su verdadero poder reside en la función `rate()`, que calcula la velocidad a la que aumenta el contador (por ejemplo, peticiones por segundo).

En Rust, utilizamos la macro `counter!`. Puedes incrementar el valor en 1 (lo más común) o por un valor arbitrario (`u64`):

```rust
use metrics::counter;

pub async fn process_payment() {
    // Incremento simple con etiquetas (labels)
    counter!(
        "payments_processed_total", 
        "provider" => "stripe", 
        "status" => "success"
    ).increment(1);
}

pub fn record_bytes_downloaded(bytes: u64) {
    // Incremento por un valor específico
    counter!("network_bytes_received_total").increment(bytes);
}
```

### 2. Gauges (Medidores o Indicadores)

A diferencia de un contador, un gauge representa una "captura" del estado actual. Su valor **puede subir y bajar** de forma arbitraria. 

* **Casos de uso ideales:** Conexiones concurrentes activas a la base de datos, uso de memoria RAM (en megabytes), temperatura de la CPU, o la cantidad de mensajes pendientes en una cola en un momento dado.
* **Precaución:** No utilices gauges para contar eventos (como "errores ocurridos"). Si hay un pico rápido de errores y tu gauge sube y baja entre los "scrapes" de Prometheus, perderás esa información.

En Rust, la macro `gauge!` permite establecer un valor absoluto (`f64`), o incrementarlo/decrementarlo de forma relativa:

```rust
use metrics::gauge;

pub struct ConnectionPool {
    active: usize,
}

impl ConnectionPool {
    pub fn acquire(&mut self) {
        self.active += 1;
        // Establecemos el valor actual
        gauge!("db_active_connections", "pool" => "read_replica").set(self.active as f64);
    }

    pub fn release(&mut self) {
        self.active -= 1;
        // O alternativamente, podemos usar decrement/increment
        gauge!("db_active_connections", "pool" => "read_replica").decrement(1.0);
    }
}
```

### 3. Histogramas (Histograms)

Los histogramas son fundamentales para medir distribuciones, especialmente **latencias**. En lugar de almacenar un solo número, un histograma toma muestras de observaciones individuales y las agrupa en "cubos" (buckets) configurables.

* **Casos de uso ideales:** Tiempo de respuesta de peticiones HTTP, duración de consultas SQL, tamaño del payload de las respuestas.
* **Por qué son útiles:** Promediar latencias es una mala práctica en sistemas distribuidos. Un promedio oculta el comportamiento de los casos atípicos (outliers). Los histogramas te permiten calcular **percentiles** (como el p95 o el p99). Un p99 de 200ms significa que el 99% de las peticiones se resuelven en 200ms o menos.

En el crate `metrics`, registramos un valor (`f64`) usando la macro `histogram!`. Por convención, las duraciones en el ecosistema Prometheus siempre se miden en segundos.

```rust
use metrics::histogram;
use std::time::Instant;

pub async fn handle_user_request() {
    let start = Instant::now();
    
    // ... ejecución de la lógica de negocio ...
    tokio::time::sleep(std::time::Duration::from_millis(45)).await;
    
    let duration = start.elapsed();
    
    // Registramos la duración en segundos usando as_secs_f64()
    histogram!(
        "http_request_duration_seconds",
        "method" => "GET",
        "route" => "/api/v1/users"
    ).record(duration.as_secs_f64());
}
```

> **Nota Arquitectónica sobre la Cardinalidad:** > A lo largo de estos ejemplos, hemos añadido etiquetas (`labels`) como `"method" => "GET"`. En Prometheus, cada combinación única de nombre de métrica y etiquetas crea una nueva serie temporal en memoria. 
> 
> **Regla de oro de nivel Senior:** Nunca incluyas datos sin límites (unbounded data) en las etiquetas. Por ejemplo, nunca pongas un `user_id` o una `ip_address` como valor de un label. Si tienes un millón de usuarios, generarás un millón de series temporales diferentes, colapsando la memoria de tu servidor Prometheus (lo que se conoce como *Cardinality Explosion*). Las etiquetas deben representar un conjunto finito y pequeño de categorías (estados HTTP, métodos, nombres de rutas limpias, tipos de errores).

## 38.3 Instrumentación del uso de memoria y CPU del proceso

Hasta ahora hemos instrumentado métricas orientadas al dominio y al comportamiento de la aplicación (peticiones, latencias, errores). Sin embargo, en un entorno de producción moderno (especialmente dentro de contenedores en Kubernetes o Docker), la principal causa de reinicios inesperados no son los *panics* en el código, sino las señales del sistema operativo como el temido `OOMKilled` (Out Of Memory) o el estrangulamiento de CPU (*CPU throttling*).

A diferencia de lenguajes con recolectores de basura (Garbage Collectors) como Java o Go, Rust no tiene un *runtime* pesado que exponga métricas de memoria de forma nativa. La gestión de memoria es manual y está delegada al sistema operativo y al asignador de memoria (*allocator*). Por lo tanto, para observar el consumo de recursos de nuestro proceso, debemos consultar activamente al sistema operativo.

### El enfoque estándar multiplataforma: `sysinfo`

La forma más directa y agnóstica de obtener métricas de hardware y del sistema operativo en Rust es a través del crate `sysinfo`. Este crate abstrae las llamadas al sistema (como leer `/proc/self/stat` en Linux o usar las APIs de Windows/macOS) y nos devuelve estructuras de datos limpias.

Para integrarlo sin penalizar el rendimiento de nuestra aplicación, el patrón recomendado es lanzar una tarea asíncrona en segundo plano (*background task*) dedicada exclusivamente a leer estos valores cada ciertos segundos y actualizar nuestros `Gauges`.

Primero, agregamos la dependencia:

```toml
[dependencies]
sysinfo = "0.30"
```

A continuación, creamos nuestro recolector en segundo plano:

```rust
use metrics::gauge;
use sysinfo::{Pid, System};
use std::time::Duration;

/// Lanza un hilo ligero de Tokio para monitorear el consumo del proceso.
/// Debe llamarse una sola vez durante el inicio de la aplicación (en el main).
pub fn spawn_process_metrics_collector() {
    tokio::spawn(async move {
        let mut sys = System::new();
        // Obtenemos el PID del proceso actual utilizando la librería estándar
        let pid = Pid::from_u32(std::process::id());
        
        loop {
            // Refrescamos SOLO la información de nuestro proceso para minimizar el overhead
            sys.refresh_process(pid);
            
            if let Some(process) = sys.process(pid) {
                // Memoria Residente (RSS): La memoria física real que el proceso está usando.
                // Esta es la métrica crítica para evitar el OOMKilled.
                gauge!("process_memory_resident_bytes").set(process.memory() as f64);
                
                // Memoria Virtual (VSZ): Incluye memoria swappeada, librerías compartidas, etc.
                gauge!("process_memory_virtual_bytes").set(process.virtual_memory() as f64);
                
                // Uso de CPU: Representado en porcentaje. 
                // Nota: En sistemas multicore, este valor puede superar el 100% 
                // (ej. 200% significa que está usando 2 núcleos enteros).
                gauge!("process_cpu_usage_percentage").set(process.cpu_usage() as f64);
            }
            
            // Pausamos la recolección. 5 a 15 segundos es un intervalo estándar para Prometheus.
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}
```

### El enfoque Nivel Senior: Instrumentando el Allocator (`jemalloc`)

El código anterior es perfectamente válido para la mayoría de los casos. Sin embargo, cuando construyes aplicaciones de ultra-alto rendimiento o sistemas de misión crítica, la métrica del sistema operativo (`process.memory()`) te dice **cuánta memoria ha pedido el proceso al OS**, pero no te dice **cómo la está utilizando internamente tu aplicación**.

Es común en Rust encontrarse con escenarios de **fragmentación de memoria**. El sistema operativo reporta que tu aplicación consume 2GB (RSS), pero tus estructuras de datos solo ocupan 800MB. El resto es memoria retenida por el *allocator* por defecto del sistema (glibc en Linux) que no ha sido devuelta al OS.

Por este motivo, muchas aplicaciones backend en Rust (como TiKV o bases de datos) sustituyen el *allocator* por defecto por `jemalloc` o `mimalloc` (conceptos que exploraremos a fondo en el **Capítulo 46**). Si utilizas `jemalloc` mediante el crate `tikv-jemallocator`, puedes usar su crate hermano `tikv-jemalloc-ctl` para extraer métricas microscópicas de la memoria.

Un ejemplo simplificado de cómo se ve esta telemetría avanzada:

```rust
// Nota: Esto requiere configurar jemallocator como el #[global_allocator]
use metrics::gauge;
use tikv_jemalloc_ctl::{epoch, stats};

pub fn record_jemalloc_metrics() {
    // Es necesario avanzar el epoch (el reloj interno de jemalloc) 
    // para que las estadísticas se actualicen.
    if epoch::advance().is_ok() {
        // 'allocated' es la memoria real solicitada por tu código Rust (estructuras, variables)
        if let Ok(allocated) = stats::allocated::read() {
            gauge!("jemalloc_allocated_bytes").set(allocated as f64);
        }
        
        // 'active' es la memoria total que jemalloc mantiene ocupada en páginas del OS
        if let Ok(active) = stats::active::read() {
            gauge!("jemalloc_active_bytes").set(active as f64);
        }
        
        // La diferencia (active - allocated) te permite graficar la fragmentación 
        // interna de tu backend en Grafana.
    }
}
```

### Integrando las métricas base del proceso

Si no necesitas el nivel de granularidad de `jemalloc`, la propia comunidad proporciona una solución intermedia muy cómoda. El crate `metrics-process` te permite recolectar de forma automática las estadísticas básicas de Linux (leyendo `/proc/self/stat`) y construir los *Gauges* correspondientes de forma casi mágica sin tener que escribir el bucle `tokio::spawn` tú mismo.

Independientemente del método que elijas, exponer el consumo de CPU y memoria residente (RSS) es un requisito no negociable para poder dimensionar correctamente los límites de tus pods en Kubernetes (`resources.limits` y `resources.requests`).

## 38.4 Integración de endpoints `/metrics`

En la sección 38.1, delegamos la responsabilidad de servir las métricas al propio crate `metrics-exporter-prometheus`, permitiendo que levantara un servidor HTTP independiente en segundo plano. Aunque esta es una excelente práctica para garantizar la resiliencia (el endpoint sigue vivo aunque tu framework web colapse), no siempre es viable. 

En arquitecturas *Serverless* (como AWS Lambda o Google Cloud Run), contenedores con restricciones estrictas de puertos, o por simple unificación tecnológica, a menudo necesitamos que nuestro framework web principal (Axum o Actix-Web) sea el encargado de servir la ruta `/metrics`.

Para lograr esto, cambiaremos nuestra estrategia de inicialización. En lugar de pedirle al `PrometheusBuilder` que escuche en un puerto, le pediremos que nos devuelva un "mango" o controlador (`PrometheusHandle`). Este controlador tiene un único propósito: generar el texto plano formateado bajo demanda.

### Extrayendo el `PrometheusHandle`

El primer paso es inicializar el exportador y guardar el handle. Este objeto está diseñado para ser clonado y compartido de forma segura entre múltiples hilos, por lo que encaja perfectamente en el estado compartido (`State`) de cualquier framework web en Rust.

```rust
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};

pub fn setup_metrics_recorder() -> PrometheusHandle {
    let builder = PrometheusBuilder::new();
    
    // En lugar de .with_http_listener(...).install()
    // usamos .install_recorder() que devuelve el handle
    builder
        .install_recorder()
        .expect("Fallo al inicializar el Prometheus recorder")
}
```

### Integración Nativa con Axum (Ecosistema Tokio)

Dado que Axum es el estándar de facto actual para el ecosistema asíncrono en Rust (como vimos en el Capítulo 17), veamos cómo inyectar este handle en nuestras rutas.

El proceso consiste en pasar el `PrometheusHandle` al estado de la aplicación (`AppState`) y crear un handler que simplemente llame al método `.render()`.

```rust
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use metrics::counter;
use metrics_exporter_prometheus::PrometheusHandle;

// 1. Definimos nuestro estado compartido
#[derive(Clone)]
struct AppState {
    metrics_handle: PrometheusHandle,
}

// 2. El handler asíncrono para la ruta /metrics
async fn metrics_handler(State(state): State<AppState>) -> impl IntoResponse {
    // .render() recolecta los datos en memoria y genera el String 
    // en formato Prometheus
    let metrics_text = state.metrics_handle.render();
    
    // Opcional pero recomendado: establecer el Content-Type correcto 
    // aunque texto plano suele funcionar.
    (StatusCode::OK, metrics_text)
}

// Handler de ejemplo para generar datos
async fn hello_handler() -> &'static str {
    counter!("http_requests_total", "route" => "/hello").increment(1);
    "¡Hola Mundo!"
}

#[tokio::main]
async fn main() {
    let recorder_handle = setup_metrics_recorder();
    let state = AppState { metrics_handle: recorder_handle };

    // 3. Ensamblamos el Router
    let app = Router::new()
        .route("/hello", get(hello_handler))
        // Exponemos el endpoint nativamente
        .route("/metrics", get(metrics_handler)) 
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("Servidor escuchando en puerto 8080");
    axum::serve(listener, app).await.unwrap();
}
```

El enfoque en Actix-Web es semánticamente idéntico: extraes el `PrometheusHandle` mediante `web::Data<PrometheusHandle>`, llamas a `.render()` dentro del handler y devuelves un `HttpResponse::Ok().body(text)`.

### El criterio Senior: Seguridad y Exposición

Exponer `/metrics` directamente en tu API pública (el puerto 80 o 443 expuesto a Internet) es un **riesgo de seguridad significativo**. Las métricas revelan detalles íntimos sobre tu infraestructura: tasas de error de la base de datos, memoria consumida, versiones de librerías y patrones de tráfico de tus usuarios. 

Si integras `/metrics` en tu Router principal, debes aplicar al menos una de estas estrategias de mitigación:

1.  **Protección en la capa del Proxy Inverso / Ingress:** Configura Nginx, Traefik o tu Ingress Controller en Kubernetes para bloquear cualquier petición a `/metrics` que provenga del exterior. Solo el *scraper* interno de Prometheus debería poder acceder a esa ruta.
2.  **Middlewares de Autorización (Basic Auth / Bearer Token):** Aplica un middleware específico a la ruta `/metrics` en Axum que valide un token secreto configurado en las variables de entorno compartidas con tu servidor de Prometheus.
3.  **Puertos Internos (Dual Bind):** Si tu orquestador lo permite, la solución más limpia es que tu aplicación instancie **dos** servidores HTTP en Axum: uno público en el puerto 8080 con tus rutas de negocio, y otro interno en el puerto 9090 que solo exponga `/metrics` y `/health` (liveness/readiness probes, que cubriremos en el Capítulo 40).

