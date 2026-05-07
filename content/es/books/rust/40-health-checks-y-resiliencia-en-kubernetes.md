En la era de los sistemas distribuidos, un backend de alto rendimiento en Rust no es una isla; es una pieza dentro de un engranaje orquestado. Este capítulo aborda la **resiliencia operativa**, enseñándote a diseñar contratos de salud que permitan a Kubernetes gestionar tu aplicación de forma inteligente. Exploraremos la diferencia crítica entre estar "vivo" y estar "listo", y cómo implementar un **Graceful Shutdown** para que ninguna petición se pierda en el abismo de un reinicio. Al finalizar, habrás transformado un servidor reactivo en un sistema robusto capaz de dialogar con el sistema operativo y recuperarse de fallos críticos sin comprometer la disponibilidad del servicio.

## 40.1 Diseño de endpoints Liveness y Readiness

Cuando desplegamos aplicaciones Rust en entornos orquestados como Kubernetes, Docker Swarm o Amazon ECS, el orquestador necesita saber el estado interno de nuestra aplicación para tomar decisiones automáticas: ¿Debe enviar tráfico a este contenedor? ¿Debe destruirlo y reiniciarlo? 

Para responder a estas preguntas, el estándar de la industria es exponer endpoints HTTP (usualmente bajo un prefijo como `/health`). Sin embargo, un error clásico en el diseño de backends es implementar un único endpoint `/health` que verifica todo a la vez. Para construir sistemas verdaderamente resilientes, debemos separar esta responsabilidad en dos conceptos distintos: **Liveness** (Supervivencia) y **Readiness** (Disponibilidad).

### La Diferencia Fundamental

Entender la distinción entre estos dos estados es crucial para evitar reinicios en cascada y tiempos de inactividad innecesarios:

* **Liveness (¿Estoy vivo?):** Indica si el proceso de la aplicación está en ejecución y no ha entrado en un estado irrecuperable (como un *deadlock* en un `Mutex` o un bucle infinito que bloquea el executor de Tokio). Si este endpoint falla, **el orquestador matará el contenedor y lo reiniciará**.
* **Readiness (¿Estoy listo para recibir tráfico?):** Indica si la aplicación puede procesar peticiones HTTP correctamente en este momento. Esto implica que las dependencias críticas (como la base de datos PostgreSQL de la que hablamos en el Capítulo 20 o la caché en Redis) están accesibles. Si este endpoint falla, el orquestador **dejará de enviar tráfico al contenedor**, pero *no lo matará*, asumiendo que el servicio puede recuperarse una vez que la dependencia vuelva a estar online.

> **Advertencia Arquitectónica:** Nunca hagas que tu endpoint de Liveness dependa de servicios externos. Si la base de datos se cae, y tu Liveness probe falla por ello, Kubernetes reiniciará tu aplicación de Rust infinitamente. Reiniciar tu backend no solucionará la caída de la base de datos, solo añadirá carga adicional a tu clúster.

### Implementando Liveness (El latido del corazón)

El endpoint de Liveness debe ser lo más "tonto" y rápido posible. No debe realizar consultas a bases de datos, ni leer archivos del disco, ni verificar credenciales. Su única función es confirmar que el servidor HTTP (en nuestro caso, Axum) está aceptando conexiones y el event loop de Tokio sigue girando.

A continuación, vemos cómo implementarlo en Axum:

```rust
use axum::{http::StatusCode, response::IntoResponse, routing::get, Router};

/// Liveness probe: Simplemente devuelve 200 OK.
/// Si este endpoint no responde, significa que el thread principal de Axum
/// o el executor de Tokio están bloqueados o el proceso ha muerto.
async fn liveness_check() -> impl IntoResponse {
    (StatusCode::OK, "ALIVE")
}

pub fn health_routes() -> Router {
    Router::new().route("/health/liveness", get(liveness_check))
}
```

### Implementando Readiness (La prueba de fuego)

El endpoint de Readiness sí debe ser consciente del ecosistema que rodea a la aplicación. Aquí es donde utilizamos el estado compartido de Axum (visto en el Capítulo 17) para verificar el pool de conexiones de la base de datos (`sqlx::PgPool`).

La verificación debe ser ligera. En lugar de ejecutar una consulta compleja, utilizamos métodos integrados como `ping()` o ejecutamos un simple `SELECT 1`.

```rust
use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::get, Router};
use sqlx::PgPool;
use std::time::Duration;
use tokio::time::timeout;

/// Readiness probe: Verifica dependencias críticas.
async fn readiness_check(State(pool): State<PgPool>) -> impl IntoResponse {
    // Es vital envolver la verificación en un timeout. 
    // Si la DB está saturada y la conexión se queda colgando,
    // no queremos bloquear esta request indefinidamente.
    let check = timeout(Duration::from_secs(2), pool.ping()).await;

    match check {
        Ok(Ok(_)) => {
            // Ping exitoso dentro del tiempo esperado
            (StatusCode::OK, "READY")
        }
        Ok(Err(e)) => {
            // La base de datos rechazó la conexión o hay un error de red
            tracing::error!("Readiness check falló (Error de BD): {:?}", e);
            (StatusCode::SERVICE_UNAVAILABLE, "UNAVAILABLE: DB ERROR")
        }
        Err(_) => {
            // El timeout expiró antes de obtener respuesta de la BD
            tracing::error!("Readiness check falló (Timeout)");
            (StatusCode::SERVICE_UNAVAILABLE, "UNAVAILABLE: TIMEOUT")
        }
    }
}

pub fn health_routes(pool: PgPool) -> Router {
    Router::new()
        // ... (resto de rutas, incluyendo liveness)
        .route("/health/readiness", get(readiness_check))
        .with_state(pool)
}
```

### Mejores Prácticas y Errores Comunes en Rust

Al diseñar estos endpoints en un entorno asíncrono como Tokio, ten en cuenta las siguientes directrices:

1.  **Timeouts estrictos:** Como se muestra en el ejemplo anterior, usa siempre `tokio::time::timeout` en tus comprobaciones de Readiness. Un orquestador como Kubernetes tiene sus propios timeouts (por defecto 1 segundo). Si tu aplicación tarda más en responder porque está esperando un lock de base de datos, Kubernetes considerará que ha fallado. Es mejor que tu aplicación controle explícitamente ese límite y falle elegantemente registrando el log exacto mediante `tracing`.
2.  **Aislamiento de tareas pesadas (Thread Pool starvation):** Si tu aplicación ejecuta cálculos pesados en CPU usando `tokio::task::spawn_blocking` e inunda el thread pool, los endpoints de salud podrían no ser procesados a tiempo por falta de *workers* libres, causando reinicios falsos. Asegúrate de mantener operaciones bloqueantes estrictamente delimitadas, como vimos en el Capítulo 32.
3.  **Caché de estados de Readiness (Sistemas de alta carga):** Si tu aplicación depende de múltiples microservicios (por ejemplo, vía gRPC) y Kubernetes realiza comprobaciones de Readiness cada 5 segundos, podrías estar generando cientos de peticiones de red inútiles por minuto solo para comprobar el estado. En arquitecturas a gran escala, es común tener una tarea de Tokio ejecutándose en *background* (`tokio::spawn`) que actualiza un `Arc<AtomicBool>` cada cierto tiempo con el estado de las dependencias. El endpoint de Readiness simplemente lee ese booleano de forma instantánea sin generar latencia de red en cada petición.

## 40.2 Graceful Shutdown (Apagado elegante) en Tokio

En el capítulo anterior, vimos cómo Kubernetes o un balanceador de carga verifican si nuestra aplicación está viva (Liveness) o lista para recibir tráfico (Readiness). Pero, ¿qué ocurre cuando el orquestador decide que es hora de apagar nuestro contenedor? Esto puede suceder por múltiples razones: un despliegue de una nueva versión, un escalado hacia abajo (scale-down) o la reubicación de un *Pod* a otro nodo.

Cuando esto ocurre, el sistema operativo envía una señal de terminación (generalmente `SIGTERM`). Si nuestro backend en Rust ignora esta señal o se apaga de golpe (Hard Shutdown), las consecuencias en producción son desastrosas:
* Las peticiones HTTP que estaban a la mitad de su procesamiento se cortan abruptamente, devolviendo errores 502/504 al cliente.
* Las transacciones de base de datos pueden quedar en estados inciertos.
* Los mensajes leídos de una cola (como Kafka o RabbitMQ) pueden perderse si no se confirmó su procesamiento (ACK).

Un **Graceful Shutdown** (Apagado elegante) consiste en interceptar esa señal de terminación, dejar de aceptar *nuevas* peticiones, terminar de procesar las peticiones *en vuelo*, cerrar ordenadamente los pools de conexiones y, finalmente, salir del proceso.

### El mecanismo base: `with_graceful_shutdown`

En el ecosistema de Axum, el servidor HTTP expone el método `with_graceful_shutdown`, el cual recibe un `Future`. El servidor seguirá ejecutándose normalmente hasta que ese `Future` se resuelva.

La forma más común de implementar este `Future` es escuchando las señales del sistema operativo mediante `tokio::signal`. 

```rust
use axum::{routing::get, Router};
use tokio::net::TcpListener;

// 1. Definimos el Future que esperará la señal de apagado
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Fallo al instalar el handler de Ctrl+C");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Fallo al instalar el handler de señales UNIX")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    // Esperamos a que ocurra cualquiera de las dos señales (SIGINT o SIGTERM)
    tokio::select! {
        _ = ctrl_c => { tracing::info!("Se recibió Ctrl+C (SIGINT), iniciando apagado..."); },
        _ = terminate => { tracing::info!("Se recibió SIGTERM, iniciando apagado..."); },
    }
}

// 2. Acoplamos la señal al servidor
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new().route("/", get(|| async { "Hola Mundo" }));
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();

    tracing::info!("Servidor escuchando en el puerto 3000");

    // Axum 0.7+ usa axum::serve
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    // Cuando el código llega aquí, Axum ya dejó de aceptar nuevas conexiones
    // y terminó de procesar las que estaban en vuelo.
    tracing::info!("Servidor HTTP apagado correctamente. Cerrando dependencias...");
    
    // Aquí cerraríamos el PgPool, el cliente de Redis, etc.
}
```

### El Reto Senior: Sincronización de Tareas en Background

El código anterior es suficiente para un API REST simple. Sin embargo, en arquitecturas robustas, Axum no es lo único que corre en tu executor de Tokio. Es muy probable que tengas tareas en segundo plano (`tokio::spawn`) ejecutando *cron jobs*, procesando colas o enviando métricas.

Si el servidor HTTP se apaga y el `main` termina, Tokio destruirá el *runtime*, matando instantáneamente todas las tareas en background sin importar lo que estuvieran haciendo.

Para resolver esto, utilizamos **Cancellation Tokens** (del crate `tokio-util`) y un mecanismo de sincronización para esperar a que las tareas terminen (como un `mpsc::channel` o un `WaitGroup`).

#### Arquitectura de apagado coordinado:

1.  **CancellationToken:** Se clona y se pasa a cada tarea en background. Cuando se recibe la señal `SIGTERM`, disparamos el token (`token.cancel()`).
2.  **Select Loop:** Las tareas en background deben usar `tokio::select!` para escuchar simultáneamente su trabajo normal y la cancelación del token.
3.  **Timeout General:** Los orquestadores como Kubernetes tienen un `terminationGracePeriodSeconds` (por defecto 30 segundos). Si tu apagado elegante tarda más que eso, Kubernetes enviará un `SIGKILL` y matará el proceso sin piedad. **Siempre debes envolver la espera de tu apagado en un `tokio::time::timeout`.**

```rust
use std::time::Duration;
use tokio::time::timeout;
use tokio_util::sync::CancellationToken;

async fn background_worker(token: CancellationToken) {
    tracing::info!("Worker iniciado");
    loop {
        tokio::select! {
            _ = token.cancelled() => {
                tracing::info!("Worker recibió señal de cancelación. Limpiando y saliendo...");
                // Aquí cerramos transacciones pendientes o hacemos flush de logs
                break;
            }
            _ = tokio::time::sleep(Duration::from_secs(5)) => {
                tracing::debug!("Worker procesando lote de datos...");
            }
        }
    }
}

// Dentro de tu main():
// let token = CancellationToken::new();
// tokio::spawn(background_worker(token.clone()));
// 
// ... iniciar axum ...
// 
// // Tras recibir el shutdown_signal:
// token.cancel();
// 
// // Esperamos a que los workers terminen, pero NUNCA esperamos eternamente.
// // Le damos 10 segundos al proceso para apagarse limpiamente.
// match timeout(Duration::from_secs(10), shutdown_waiter).await {
//     Ok(_) => tracing::info!("Apagado elegante completado."),
//     Err(_) => tracing::error!("Timeout de apagado alcanzado. Forzando salida."),
// }
```

> **Nota de Diseño:** Separar el cierre del servidor HTTP de la cancelación de las tareas de background te permite un nivel de control granular. Por ejemplo, podrías decidir dejar de aceptar peticiones web primero, dejar que la base de datos termine de guardar el estado durante 5 segundos más, y finalmente destruir el pool de conexiones.

## 40.3 Manejo de señales del sistema operativo (SIGTERM, SIGINT)

Para que un backend sea verdaderamente robusto en producción, no basta con saber reaccionar a peticiones HTTP; debe saber dialogar con el sistema operativo que lo aloja. En entornos tipo Unix (Linux, macOS) —donde correrá el 99% de tus despliegues en contenedores—, esta comunicación ocurre principalmente a través de **señales POSIX**.

Una señal es una interrupción asíncrona enviada a un proceso para notificarle que ha ocurrido un evento. En el contexto de un servidor web, nos interesan fundamentalmente dos:

* **`SIGINT` (Signal Interrupt):** Es la señal interactiva por excelencia. Se envía cuando un usuario presiona `Ctrl+C` en la terminal. En desarrollo local, esta es la señal que detiene tu servidor.
* **`SIGTERM` (Signal Terminate):** Es la señal estándar de finalización. Es la que envían herramientas como Kubernetes, Docker o `systemd` cuando solicitan que tu aplicación se apague. A diferencia de `SIGKILL` (que aniquila el proceso inmediatamente sin darle opción a reaccionar), `SIGTERM` es una petición educada: *"Por favor, termina lo que estás haciendo y apágate"*.

### La abstracción multiplataforma de Tokio

Capturar señales a bajo nivel en C o C++ es notoriamente complejo y propenso a errores de concurrencia (data races). Afortunadamente, Rust y Tokio abstraen esta complejidad proporcionando una API asíncrona y segura a través del módulo `tokio::signal`.

El reto principal al diseñar este manejo de señales es que Rust es un lenguaje compilado multiplataforma. Windows no entiende el concepto de `SIGTERM` de la misma manera que Unix. Por ello, debemos usar compilación condicional (`#[cfg(unix)]`) para asegurar que nuestro código compila en cualquier sistema.

### Implementación Avanzada: El patrón de "Doble Señal"

Un comportamiento muy apreciado en aplicaciones de terminal y servidores bien diseñados es el patrón de **doble interrupción**:
1.  La primera vez que se recibe la señal, se inicia el apagado elegante (Graceful Shutdown, visto en 40.2).
2.  Si el proceso de apagado se atasca y el usuario (o el sistema) envía una **segunda señal**, el servidor aborta el apagado elegante y se cierra forzosamente de inmediato.

Veamos cómo implementar un manejador de señales a nivel Senior que soporte ambos sistemas operativos y este patrón de doble interrupción:

```rust
use tokio::signal;

/// Se bloquea hasta que el sistema operativo envíe una señal de terminación.
/// Soporta SIGINT (Ctrl+C) y SIGTERM (Kubernetes/Systemd).
pub async fn wait_for_shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Fallo al inicializar el manejador de SIGINT (Ctrl+C)");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Fallo al inicializar el manejador de SIGTERM")
            .recv()
            .await;
    };

    // En Windows, simplemente esperamos eternamente ya que no hay SIGTERM nativo equivalente a Unix
    // (ctrl_c ya maneja las interrupciones estándar de consola en Windows).
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    // Esperamos a la PRIMERA señal
    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Se recibió SIGINT (Ctrl+C). Iniciando apagado elegante...");
        },
        _ = terminate => {
            tracing::info!("Se recibió SIGTERM. Iniciando apagado elegante...");
        },
    }
}

/// Permite forzar un cierre si el usuario presiona Ctrl+C por segunda vez
/// mientras el apagado elegante está en progreso.
pub async fn watch_for_force_shutdown() {
    signal::ctrl_c()
        .await
        .expect("Fallo al escuchar la segunda señal");
    
    tracing::error!("¡Segunda señal recibida! Forzando salida inmediata.");
    std::process::exit(1);
}
```

### Integrando las señales en la arquitectura del servidor

Para que esto funcione correctamente con el ecosistema de Tokio y el código que desarrollamos en la sección anterior, debemos ejecutar el vigilante de "cierre forzado" en una tarea separada que nunca sea bloqueada por la lógica de negocio.

```rust
#[tokio::main]
async fn main() {
    // 1. Inicializar dependencias (Logs, Base de datos, etc.)
    // ...

    // 2. Construir el Router de Axum
    // let app = Router::new()...

    // 3. Crear un futuro que se resuelva con la señal del SO
    let shutdown_signal_future = wait_for_shutdown_signal();

    // 4. Lanzar en background el vigilante de "doble Ctrl+C"
    tokio::spawn(async {
        // Primero esperamos a que empiece el apagado...
        wait_for_shutdown_signal().await;
        // ...luego nos quedamos escuchando si hay OTRA señal
        watch_for_force_shutdown().await;
    });

    // 5. Arrancar el servidor
    // axum::serve(listener, app)
    //    .with_graceful_shutdown(shutdown_signal_future)
    //    .await
    //    .unwrap();
    
    // 6. Limpiar recursos...
}
```

### Consideraciones sobre File Descriptors y Señales

Es importante entender que en Linux, las conexiones de red abiertas, las conexiones a base de datos e incluso los archivos abiertos son descriptores de archivos (*File Descriptors*). Cuando recibimos un `SIGTERM`, nuestro objetivo final es cerrar el proceso. 

Si cerramos el proceso repentinamente (`std::process::exit`) o mediante un `SIGKILL`, el Kernel de Linux eventualmente cerrará esos *File Descriptors* por nosotros y liberará la memoria. Sin embargo, **el servidor al otro lado de esa conexión (por ejemplo, Postgres o un cliente HTTP) se quedará esperando una confirmación de cierre TCP (paquetes `FIN` o `RST`)** que podría tardar en llegar debido a timeouts de red.

Interceptar el `SIGTERM` nos permite llamar explícitamente a los destructores (el trait `Drop`) de nuestras conexiones en Rust, enviando los paquetes de cierre correspondientes a las bases de datos y clientes, previniendo así conexiones huérfanas o *connection leaks* en la infraestructura circundante.

## 40.4 Recuperación ante pánicos sin tirar el servidor

En el Capítulo 5, establecimos una regla de oro en Rust: utilizamos `Result<T, E>` para errores recuperables y `panic!` para errores irrecuperables (bugs del programador, como acceder a un índice fuera de rango o hacer `.unwrap()` sobre un `None`). 

En una aplicación de consola, si ocurre un `panic!`, lo correcto es que el programa se cierre de inmediato. Sin embargo, en un servidor web de alta concurrencia, la filosofía cambia radicalmente. Si tienes 10,000 usuarios conectados y una petición maliciosa (o malformada) explota un `.unwrap()` en un *handler* específico, **no puedes permitir que el pánico de un hilo destruya el proceso completo y desconecte a los otros 9,999 usuarios.**

Un backend a nivel Senior debe ser capaz de aislar el pánico, registrar el *stack trace* (traza de la pila) para que los desarrolladores puedan arreglar el bug, devolver un error HTTP 500 (Internal Server Error) al cliente problemático y seguir operando normalmente.

### El comportamiento por defecto de Tokio

Es importante entender qué hace Tokio bajo el capó. Cuando usas `tokio::spawn` para lanzar una tarea asíncrona (como hace Axum por cada petición HTTP entrante), Tokio envuelve esa tarea. Si la tarea entra en pánico, el *worker thread* de Tokio **no muere**. Tokio captura el pánico (usando `std::panic::catch_unwind`) y el `JoinHandle` devuelto por `spawn` resolverá en un error de tipo `JoinError`, donde el método `is_panic()` devolverá `true`.

El problema con este comportamiento por defecto en Axum es que, aunque el servidor no se cae, la conexión TCP del cliente se cierra abruptamente sin una respuesta HTTP válida. Para el balanceador de carga o el cliente web, esto se ve como un fallo de red ("Connection reset by peer"), no como un error de aplicación.

### Implementando el Middleware CatchPanic

Para convertir un pánico en una respuesta HTTP 500 limpia, el ecosistema de `tower-http` proporciona un middleware específico: `CatchPanicLayer`.

Este middleware intercepta cualquier pánico que ocurra en los *handlers* que están por debajo de él en la cadena, captura el proceso de *unwinding* (desenrollado de la pila) y permite ejecutar un *callback* para formular una respuesta.

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use std::any::Any;
use tower_http::catch_panic::CatchPanicLayer;

/// Handler que simula un bug en producción
async fn handler_buggeado() -> &'static str {
    let un_vector = vec![1, 2, 3];
    // Esto causará un panic! porque el índice 99 no existe
    let _ = un_vector[99]; 
    "Nunca llegaré aquí"
}

/// Función que se ejecuta cuando se captura un pánico
fn handle_panic(err: Box<dyn Any + Send + 'static>) -> Response {
    // Intentamos extraer el mensaje de error del pánico
    let details = if let Some(s) = err.downcast_ref::<String>() {
        s.clone()
    } else if let Some(s) = err.downcast_ref::<&str>() {
        s.to_string()
    } else {
        "Pánico de tipo desconocido".to_string()
    };

    tracing::error!("¡Pánico capturado en el middleware de Axum!: {}", details);

    // Devolvemos un 500 limpio al cliente
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Ocurrió un error interno grave en el servidor.",
    )
        .into_response()
}

pub fn app_router() -> Router {
    Router::new()
        .route("/peligro", get(handler_buggeado))
        // Añadimos la capa de protección. 
        // Importante: Debe ir lo más "arriba" posible en tu Router.
        .layer(CatchPanicLayer::custom(handle_panic))
}
```

### El Panic Hook Global y la Observabilidad

El middleware anterior evita que el cliente reciba un error de red y mantiene el servidor a flote. Sin embargo, tiene una limitación: no siempre registra el *stack trace* completo con los números de línea exactos de donde ocurrió el error, lo cual es vital para el equipo de guardia (On-Call) que investiga el incidente en herramientas como Datadog o Kibana (como vimos en el Capítulo 37).

Para solucionar esto, debemos combinar el `CatchPanicLayer` con un **Panic Hook personalizado** de la *Standard Library*. El hook es una función global que se ejecuta en el instante exacto en que ocurre el pánico, antes de que comience el desenrollado de la pila.

Configuraremos este hook al inicio de nuestra función `main` para redirigir toda la información del pánico hacia el sistema de `tracing`:

```rust
use std::panic;

pub fn setup_global_panic_hook() {
    // Guardamos el hook original por si queremos invocarlo (opcional)
    let default_hook = panic::take_hook();

    panic::set_hook(Box::new(move |panic_info| {
        // Obtenemos la ubicación (archivo y línea)
        let location = panic_info.location().unwrap();
        
        // Extraemos el mensaje
        let msg = match panic_info.payload().downcast_ref::<&'static str>() {
            Some(s) => *s,
            None => match panic_info.payload().downcast_ref::<String>() {
                Some(s) => &s[..],
                None => "Box<dyn Any>",
            },
        };

        // Emitimos un evento de error CRÍTICO en nuestro sistema de tracing
        tracing::error!(
            target: "panic",
            "¡PANIC! Hilo '{}' entró en pánico en '{}': {}",
            std::thread::current().name().unwrap_or("<unnamed>"),
            location,
            msg
        );

        // Si quieres, puedes llamar al hook original para que también 
        // imprima el error estándar en stderr
        default_hook(panic_info);
    }));
}
```

Al llamar a `setup_global_panic_hook()` al inicio de tu `main()`, garantizas que cualquier pánico, ocurra dentro de un request HTTP o en una tarea de background (como un consumidor de Kafka), quede registrado perfectamente en tu infraestructura de observabilidad.

### Una advertencia arquitectónica: Cuándo dejar morir al servidor

Capturar pánicos es excelente para la resiliencia web, pero tiene un límite. Si compilas tu aplicación con `panic = "abort"` en tu `Cargo.toml` (una práctica común para reducir el tamaño del binario y mejorar marginalmente el rendimiento), el desenrollado de pila se desactiva. En este escenario, `CatchPanicLayer` **no funcionará** y el proceso terminará abruptamente.

Además, ten en cuenta la contaminación del estado. Si un pánico ocurre en medio de la modificación de un `Mutex` o una estructura de datos compartida global, podrías dejar esa estructura en un estado inconsistente (o "envenenado" si usas `std::sync::Mutex`). En sistemas críticos (como procesamiento financiero), a veces es más seguro permitir que el orquestador (Kubernetes) mate y reinicie el contenedor desde cero que seguir operando con un estado en memoria que ya no es confiable. Usa el `CatchPanicLayer` principalmente para aislar la lógica pura de los *handlers* de capa de red.
