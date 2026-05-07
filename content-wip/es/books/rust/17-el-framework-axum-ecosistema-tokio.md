Axum representa la evolución natural del desarrollo backend en Rust. A diferencia de otros frameworks, Axum nace directamente del equipo de **Tokio**, integrándose sin fricciones con el ecosistema de red estándar (`hyper`, `tower` y `tonic`). Su filosofía es "usar lo que ya existe", evitando reinventar la rueda y ofreciendo una API declarativa basada en el sistema de tipos. En este capítulo, exploraremos cómo construir APIs robustas aprovechando los **extractores**, una herramienta poderosa que garantiza la validez de los datos antes de que lleguen a la lógica de negocio. Axum no es solo un framework; es la pieza que unifica la seguridad de Rust con la agilidad de los microservicios modernos.

## 17.1 Enrutamiento y Handlers asíncronos

Si en el capítulo anterior exploramos Actix-Web y su robusto ecosistema propio, al adentrarnos en **Axum** entramos al terreno "oficial" del equipo de Tokio. Axum no intenta reinventar la rueda; su filosofía radica en apoyarse fuertemente en abstracciones que ya existen en el ecosistema, como `hyper` (para el servidor HTTP) y `tower` (para el middleware, que veremos a fondo en la sección 17.2).

Una de las diferencias arquitectónicas más notables que notarás de inmediato es la **ausencia de macros para el enrutamiento**. Mientras que otros frameworks utilizan macros como `#[get("/")]` encima de las funciones, Axum prefiere una API declarativa basada en el patrón Builder, aprovechando el potente sistema de tipos y traits de Rust para garantizar la seguridad en tiempo de compilación.

### La anatomía de un Handler Asíncrono

En Axum, un handler (manejador) es simplemente una función asíncrona (`async fn`). Para que el compilador acepte una función como handler válido, esta debe cumplir con dos reglas fundamentales:

1.  **Los argumentos:** Puede no recibir argumentos, o recibir una serie de argumentos que implementen el trait `FromRequest` o `FromRequestParts` (conocidos como Extractors, que abordaremos en la sección 17.3).
2.  **El retorno:** Debe devolver cualquier tipo que implemente el trait `IntoResponse`. 

Afortunadamente, Axum ya implementa `IntoResponse` para los tipos más comunes de la Standard Library (`&str`, `String`, tuplas con códigos de estado, etc.).

Veamos la forma más básica de un handler:

```rust
// Un handler asíncrono simple que devuelve texto plano con un status 200 OK implícito.
async fn health_check() -> &'static str {
    "El servicio está operativo"
}
```

Gracias a que Axum se ejecuta sobre el runtime de Tokio, estas funciones pueden realizar operaciones no bloqueantes (como llamadas a bases de datos o APIs externas) usando `.await` sin bloquear el hilo principal del servidor, logrando una concurrencia masiva.

### Construyendo el Árbol de Rutas (`Router`)

El núcleo de una aplicación Axum es el struct `Router`. Este actúa como un registro central donde mapeamos rutas HTTP (como `/usuarios`) a nuestros handlers utilizando los métodos HTTP correspondientes (`get`, `post`, `put`, `delete`, etc.).

A partir de la versión 0.7 de Axum, la inicialización del servidor se integró directamente con `tokio::net::TcpListener`, simplificando el código de arranque. Aquí tienes el esqueleto completo de una aplicación:

```rust
use axum::{
    routing::{get, post},
    Router,
};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    // 1. Construimos nuestro enrutador
    let app = Router::new()
        .route("/", get(raiz_handler))
        .route("/usuarios", post(crear_usuario_handler));

    // 2. Vinculamos un listener TCP de Tokio al puerto deseado
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Servidor escuchando en http://0.0.0.0:3000");

    // 3. Arrancamos el servidor usando axum::serve
    axum::serve(listener, app).await.unwrap();
}

async fn raiz_handler() -> &'static str {
    "¡Bienvenido a la API con Axum!"
}

async fn crear_usuario_handler() -> &'static str {
    "Lógica para crear usuario aquí (próximamente)"
}
```

En el método `.route()`, el primer parámetro es el path en formato de cadena, y el segundo es el método HTTP que envuelve al handler. Si una misma ruta debe responder a múltiples métodos, puedes encadenarlos fácilmente:

```rust
// Múltiples métodos HTTP en una misma ruta
let app = Router::new()
    .route(
        "/configuracion", 
        get(obtener_configuracion).put(actualizar_configuracion)
    );
```

### Modularidad con `.nest()`

En aplicaciones de nivel Senior, jamás definimos cientos de rutas en un solo bloque `main`. Axum proporciona el método `.nest()` para combinar múltiples instancias de `Router`. Esto nos permite construir sistemas modulares y prefijar rutas enteras.

Imagina que estás versionando tu API. Puedes agrupar las rutas de la versión 1 y "anidarlas" bajo el prefijo `/api/v1`:

```rust
fn user_routes() -> Router {
    Router::new()
        .route("/", get(listar_usuarios).post(crear_usuario))
        .route("/:id", get(obtener_usuario_por_id)) // :id es un parámetro de ruta
}

fn product_routes() -> Router {
    Router::new()
        .route("/", get(listar_productos))
}

#[tokio::main]
async fn main() {
    // Enrutador de la v1
    let api_v1 = Router::new()
        .nest("/usuarios", user_routes())
        .nest("/productos", product_routes());

    // Enrutador principal de la aplicación
    let app = Router::new()
        .nest("/api/v1", api_v1)
        // Ruta para health checks general fuera de la API versionada
        .route("/health", get(|| async { "OK" })); 

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

Con este diseño arquitectónico, el endpoint para listar usuarios automáticamente se resolverá en `GET /api/v1/usuarios`, manteniendo tu código altamente desacoplado, legible y fácil de mantener.

### Fallbacks: Manejando el clásico 404

Por defecto, si un cliente solicita una ruta que no existe, Axum devuelve una respuesta vacía con un código de estado `404 Not Found`. Sin embargo, en una API RESTful profesional, lo ideal es devolver un JSON estructurado informando del error. 

Podemos definir un comportamiento global para rutas no encontradas utilizando el método `.fallback()` en nuestro `Router`:

```rust
use axum::http::StatusCode;

async fn handler_404() -> (StatusCode, &'static str) {
    (StatusCode::NOT_FOUND, "La ruta solicitada no existe en este servidor.")
}

let app = Router::new()
    .route("/", get(raiz_handler))
    // Cualquier ruta no coincidente caerá aquí
    .fallback(handler_404);
```

Al igual que un handler estándar, el handler de fallback es simplemente una función asíncrona que implementa `IntoResponse`. Al aprovechar las tuplas, le indicamos explícitamente a Axum qué código de estado HTTP y qué cuerpo de respuesta queremos generar.

## 17.2 Integración profunda con `tower` y servicios HTTP

Para dominar Axum a nivel Senior, es fundamental entender que Axum es, en realidad, una fina capa de ergonomía (enrutamiento y extracción) construida sobre un gigante del ecosistema Rust: **Tower**.

Mientras que otros frameworks web de Rust construyen su propio sistema de middlewares y procesamiento de peticiones desde cero, Axum delega toda esta responsabilidad a Tower. Esto significa que cualquier middleware, cliente HTTP o servicio diseñado para Tower funciona de forma nativa e inmediata en Axum.

### El corazón de la arquitectura: El Trait `Service`

En Tower, todo se reduce a una abstracción fundamental: el trait `Service`. A nivel conceptual, un servicio es cualquier componente asíncrono que toma una petición (Request) y devuelve una respuesta (Response) en el futuro, pudiendo fallar con un error.

Aunque no necesitas implementar este trait a mano muy a menudo, su definición mental es vital:

```rust
// Representación conceptual del Trait Service en Tower
pub trait Service<Request> {
    type Response;
    type Error;
    type Future: Future<Output = Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>>;
    fn call(&mut self, req: Request) -> Self::Future;
}
```

En Axum, **absolutamente todo es un `Service`**. Un handler individual es un `Service`. Un enrutador (`Router`) completo es un `Service`. Esto permite una componibilidad extrema: puedes tomar un Router de Axum y pasarlo a cualquier servidor de Rust que hable el idioma de Tower.

### Middlewares a través de `tower::Layer`

En el mundo de Tower (y por extensión, en Axum), los middlewares se denominan **Layers** (Capas). Un `Layer` envuelve un `Service` existente y produce un *nuevo* `Service`, permitiéndote inyectar lógica antes o después de que la petición alcance tu handler.

Para tareas comunes de APIs RESTful, el ecosistema nos provee el crate `tower-http`, que contiene un arsenal de middlewares robustos y probados en producción.

Veamos cómo enriquecer un servidor Axum aplicando capas esenciales como Trazabilidad (Logging), Control de Acceso (CORS) y Timeouts:

```rust
use axum::{
    routing::get,
    Router,
};
use std::time::Duration;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    timeout::TimeoutLayer,
};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    // Inicializamos un subscriber básico para ver los logs en consola
    tracing_subscriber::fmt::init();

    // 1. Configuramos nuestras capas (Layers)
    // Permitimos peticiones desde cualquier origen (solo para desarrollo)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any);

    // 2. Construimos el Router y aplicamos las capas
    let app = Router::new()
        .route("/datos", get(datos_handler))
        // IMPORTANTE: El orden de las capas importa
        .layer(TimeoutLayer::new(Duration::from_secs(10)))
        .layer(cors)
        .layer(TraceLayer::new_for_http()); // Genera logs automáticos de cada request/response

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Servidor inicializado en el puerto 3000");
    axum::serve(listener, app).await.unwrap();
}

async fn datos_handler() -> &'static str {
    "Información sensible enviada con éxito"
}
```

> **Aviso de Arquitectura (El orden de los Layers):**
> En Axum, cuando utilizas `.layer()`, las peticiones atraviesan las capas **de abajo hacia arriba**, mientras que las respuestas lo hacen de arriba hacia abajo. En el ejemplo anterior, la petición pasa primero por `TraceLayer` (registrando su llegada), luego por el control de `CorsLayer`, y finalmente por `TimeoutLayer` antes de llegar al enrutador. Entender esta pila (stack) de ejecución evitará dolores de cabeza al depurar middlewares de autenticación o compresión.

### Reutilización más allá de HTTP

La belleza de integrar `tower` tan profundamente es que sus utilidades no se limitan a peticiones HTTP. Si tu aplicación backend necesita comunicarse con bases de datos u otros microservicios mediante clientes genéricos, puedes aplicar las *mismas* herramientas de Tower. 

Por ejemplo, `tower::retry` (para reintentar peticiones fallidas) o `tower::limit` (para limitar la concurrencia máxima y proteger tus recursos) son agnósticos al protocolo. Aprender a manejar Tower significa dominar un paradigma de resiliencia de red que te servirá en todo el ecosistema asíncrono de Rust.

## 17.3 Extracción de datos y validación

En el Capítulo 16 exploramos cómo Actix-Web utiliza los *Extractors* para obtener datos de la petición HTTP. Axum abraza este mismo paradigma, pero lo lleva un paso más allá gracias a su profunda integración con el sistema de tipos de Rust y su estricta separación entre el cuerpo de la petición (Body) y sus metadatos (Parts).

En Axum, un extractor es cualquier tipo que implemente uno de estos dos traits:
1.  **`FromRequestParts`**: Para extraer datos de la URI, cabeceras (headers) o el estado compartido, sin consumir el cuerpo de la petición. Puedes tener múltiples extractores de este tipo en la firma de tu handler.
2.  **`FromRequest`**: Para extraer y consumir el cuerpo de la petición (como un JSON o un formulario). 

> **La regla de oro de Axum (El orden importa):**
> Dado que el cuerpo de una petición HTTP es un *stream* asíncrono que solo se puede consumir una vez, **solo puedes tener un extractor que implemente `FromRequest` por handler, y este DEBE ser el último argumento** en la firma de tu función. Si intentas poner el extractor del cuerpo antes que los de las cabeceras, el código simplemente no compilará.

### Extractores estándar en acción

Al igual que en otros frameworks, Axum nos provee extractores listos para usar como `Path` (variables en la URL), `Query` (parámetros de búsqueda) y `Json` (cuerpos de petición). Como ya dominas `serde` (Capítulo 15), el uso te resultará familiar:

```rust
use axum::{
    extract::{Path, Query, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct FiltroPaginacion {
    pagina: Option<u32>,
    limite: Option<u32>,
}

#[derive(Deserialize)]
struct CrearUsuarioPayload {
    email: String,
    nombre: String,
}

#[derive(Serialize)]
struct UsuarioRespuesta {
    id: u64,
    email: String,
}

// 1. Extrayendo Path y Query al mismo tiempo
// Nota: Ambos implementan FromRequestParts, por lo que el orden entre ellos no rompe la compilación,
// pero es buena práctica mantener un orden lógico.
async fn listar_usuarios(
    Path(departamento_id): Path<u32>,
    Query(filtro): Query<FiltroPaginacion>,
) -> String {
    let pag = filtro.pagina.unwrap_or(1);
    format!("Listando usuarios del depto {} (Página {})", departamento_id, pag)
}

// 2. Extrayendo el Body (Json)
// Json<T> implementa FromRequest, así que DEBE ir al final si hubiera más extractores.
async fn crear_usuario(
    Json(payload): Json<CrearUsuarioPayload>,
) -> Json<UsuarioRespuesta> {
    // Lógica de base de datos simulada
    let nuevo_usuario = UsuarioRespuesta {
        id: 101,
        email: payload.email,
    };
    
    // Devolvemos la respuesta serializada automáticamente a JSON
    Json(nuevo_usuario)
}
```

### El patrón Senior: Validación a nivel de Extractor

Deserializar un JSON a un Struct asegura que los tipos de datos son correctos (un número es un número y no un booleano), pero no valida la *lógica* de negocio (por ejemplo, que el email tenga un formato válido o que una contraseña tenga una longitud mínima).

En lugar de validar manualmente dentro de cada handler (lo cual viola el principio DRY), en Rust acostumbramos a crear un **Extractor Personalizado** que combine la deserialización de Axum con una librería de validación como `validator`.

Veamos cómo construir un extractor `ValidacionJson<T>` que rechace la petición automáticamente con un código 400 (Bad Request) si los datos no cumplen nuestras reglas:

```rust
use axum::{
    async_trait,
    extract::{FromRequest, Request, rejection::JsonRejection},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::de::DeserializeOwned;
use validator::Validate;

// 1. Definimos nuestro envoltorio
#[derive(Debug, Clone, Copy, Default)]
pub struct ValidacionJson<T>(pub T);

// 2. Implementamos el trait FromRequest para nuestro envoltorio
#[async_trait]
impl<T, S> FromRequest<S> for ValidacionJson<T>
where
    T: DeserializeOwned + Validate,
    S: Send + Sync,
    Json<T>: FromRequest<S, Rejection = JsonRejection>,
{
    type Rejection = RespuestaError; // Nuestro tipo de error personalizado

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        // Primero, delegamos en el extractor Json de Axum para parsear el cuerpo
        let Json(valor) = Json::<T>::from_request(req, state)
            .await
            .map_err(|_| RespuestaError::JsonInvalido)?;

        // Segundo, ejecutamos las reglas de validación del crate `validator`
        valor.validate().map_err(RespuestaError::ValidacionFallida)?;

        // Si todo es correcto, devolvemos el valor envuelto
        Ok(ValidacionJson(valor))
    }
}

// 3. Manejo del error para que Axum sepa cómo responder al cliente
pub enum RespuestaError {
    JsonInvalido,
    ValidacionFallida(validator::ValidationErrors),
}

impl IntoResponse for RespuestaError {
    fn into_response(self) -> Response {
        let (status, mensaje) = match self {
            RespuestaError::JsonInvalido => (StatusCode::BAD_REQUEST, "Formato JSON inválido".to_string()),
            RespuestaError::ValidacionFallida(errores) => {
                (StatusCode::UNPROCESSABLE_ENTITY, format!("Error de validación: {}", errores))
            }
        };
        (status, mensaje).into_response()
    }
}
```

Ahora, aplicar esta validación en tus handlers es tan elegante como cambiar el tipo del extractor. Si el payload falla la validación, la función `registro_handler` nunca llegará a ejecutarse, protegiendo tu lógica de negocio de datos corruptos:

```rust
#[derive(Deserialize, Validate)]
struct PeticionRegistro {
    #[validate(email)]
    correo: String,
    #[validate(length(min = 8))]
    password: String,
}

// El handler ahora usa ValidacionJson en lugar del Json estándar
async fn registro_handler(
    ValidacionJson(payload): ValidacionJson<PeticionRegistro>,
) -> &'static str {
    "El usuario es 100% válido y listo para ser guardado en la base de datos."
}
```

Este patrón de diseño, donde empujamos la validación a los bordes de la aplicación aprovechando el sistema de tipos y traits, es una de las razones por las que mantener grandes bases de código en Rust resulta tan seguro y predecible.

## 17.4 Websockets nativos en Axum

Históricamente, manejar WebSockets en Rust implicaba descender al nivel del protocolo HTTP, interceptar las cabeceras `Upgrade` y `Connection`, y realizar el "handshake" manualmente utilizando librerías como `tungstenite`. Axum oculta toda esta complejidad de infraestructura detrás de su brillante sistema de extractores, permitiéndote tratar las conexiones en tiempo real casi con la misma simplicidad que una petición REST tradicional.

Bajo el capó, Axum sigue utilizando `tokio-tungstenite`, pero expone una API declarativa a través del extractor `WebSocketUpgrade`.

### El Extractor `WebSocketUpgrade`

Para que un endpoint acepte una conexión WebSocket, tu handler simplemente debe solicitar el extractor `WebSocketUpgrade`. La responsabilidad de este extractor es validar las cabeceras HTTP entrantes y preparar la respuesta de aceptación (status 101 Switching Protocols).

Veamos la estructura fundamental de un servidor "Echo" (que devuelve el mismo mensaje que recibe):

```rust
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/ws", get(ws_handler));
    
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Servidor WebSocket escuchando en ws://0.0.0.0:3000/ws");
    axum::serve(listener, app).await.unwrap();
}

// 1. El handler recibe el Upgrade. Retorna un `Response` para completar el handshake HTTP.
async fn ws_handler(ws: WebSocketUpgrade) -> Response {
    // 2. Definimos qué pasará UNA VEZ que la conexión se haya actualizado exitosamente.
    ws.on_upgrade(manejar_socket)
}

// 3. Esta función se ejecutará en su propia tarea asíncrona para cada cliente conectado.
async fn manejar_socket(mut socket: WebSocket) {
    // Un bucle infinito para escuchar mensajes mientras la conexión esté viva
    while let Some(Ok(mensaje)) = socket.recv().await {
        match mensaje {
            Message::Text(texto) => {
                println!("Cliente dice: {}", texto);
                // Hacemos eco del mensaje de vuelta al cliente
                if socket.send(Message::Text(format!("Eco: {}", texto))).await.is_err() {
                    println!("El cliente se desconectó abruptamente");
                    break;
                }
            }
            Message::Binary(_) => {
                println!("Mensaje binario recibido (ignorado en este ejemplo)");
            }
            Message::Close(_) => {
                println!("El cliente ha cerrado la conexión");
                break;
            }
            // Ping y Pong son manejados automáticamente por Axum en su mayoría,
            // pero puedes interceptarlos aquí si necesitas lógica personalizada.
            _ => {}
        }
    }
}
```

> **Nota de Arquitectura:**
> Observa el método `ws.on_upgrade()`. Lo que Axum hace aquí es delegar el futuro. El servidor responde inmediatamente a la petición HTTP, pero la función `manejar_socket` es enviada (spawned) al runtime de Tokio para que viva de forma independiente. Esto garantiza que miles de conexiones WebSocket abiertas no bloqueen la capacidad del servidor para seguir aceptando nuevas peticiones REST u otros WebSockets.

### Patrón Senior: Broadcast y Estado Compartido

Un servidor "Echo" es trivial. En aplicaciones del mundo real, los WebSockets se usan para transmitir eventos a múltiples clientes (por ejemplo, una sala de chat, o un ticker de precios financieros). Para esto, necesitamos combinar los WebSockets de Axum con canales asíncronos de Tokio (`tokio::sync::broadcast`) y el extractor de estado (`State`).

Aquí tienes el esqueleto de una arquitectura para emitir mensajes a múltiples clientes:

```rust
use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::Response,
    routing::get,
    Router,
};
use std::sync::Arc;
use tokio::sync::broadcast;

// 1. Definimos el estado global de nuestra aplicación
struct AppState {
    // Un canal que clona y envía el mensaje a todos los suscriptores activos
    tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() {
    // Creamos un canal con capacidad para 100 mensajes en memoria
    let (tx, _rx) = broadcast::channel(100);
    
    let state = Arc::new(AppState { tx });

    let app = Router::new()
        .route("/chat", get(chat_handler))
        .with_state(state); // Inyectamos el estado al Router

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// 2. Extraemos tanto el Upgrade como nuestro Estado Compartido
async fn chat_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> Response {
    ws.on_upgrade(move |socket| manejar_chat(socket, state))
}

async fn manejar_chat(mut socket: WebSocket, state: Arc<AppState>) {
    // Nos suscribimos al canal de broadcast para recibir mensajes de otros
    let mut rx = state.tx.subscribe();

    // Dividimos el socket para poder enviar y recibir concurrentemente usando tokio::select!
    // (Aprenderemos más sobre select! en el Capítulo 32, pero este es su caso de uso principal)
    loop {
        tokio::select! {
            // Caso A: Recibimos un mensaje de este cliente específico
            Some(Ok(Message::Text(texto))) = socket.recv() => {
                // Lo enviamos al canal global (que lo retransmitirá a todos)
                let _ = state.tx.send(texto);
            }
            
            // Caso B: Recibimos un mensaje del canal global (de otro cliente)
            Ok(msg) = rx.recv() => {
                // Se lo enviamos a este cliente particular
                if socket.send(Message::Text(msg)).await.is_err() {
                    break; // Cliente desconectado
                }
            }
            
            // Caso C: El cliente cerró la conexión o hubo un error en la lectura
            else => break,
        }
    }
}
```

Esta arquitectura es la base de sistemas de tiempo real altamente escalables en Rust. Al combinar la seguridad de tipos de Axum, el modelo de memoria de Rust (`Arc`) y el motor asíncrono de Tokio (`select!`, canales de broadcast), obtienes un servidor capaz de manejar cientos de miles de conexiones concurrentes utilizando una fracción de los recursos de CPU y RAM que requerirían lenguajes interpretados o con recolección de basura (Garbage Collection).
