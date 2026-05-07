Actix-Web representa la culminación del alto rendimiento en el ecosistema Rust. Construido sobre el modelo de actores y un robusto sistema de workers asíncronos, este framework permite procesar decenas de miles de peticiones con una latencia mínima. En este capítulo, exploraremos cómo transformar el rigor del sistema de tipos de Rust en una ventaja competitiva para el desarrollo backend. Desde la configuración granular de sus hilos de ejecución hasta la implementación de middlewares que garantizan la seguridad y observabilidad de nuestras rutas, aprenderás a construir APIs que no solo son extremadamente rápidas, sino también resilientes y fáciles de mantener a escala industrial.

## 16.1 Configuración de servidores y workers

Actix-Web es mundialmente reconocido en el ecosistema Rust por su extraordinario rendimiento en benchmarks (como los de TechEmpower). Gran parte de este desempeño no es magia, sino el resultado de un modelo de concurrencia muy bien diseñado. Para dominar Actix-Web como desarrollador senior, es crucial entender cómo el framework gestiona el tráfico a nivel de sistema operativo antes de escribir una sola ruta.

En el corazón de cada aplicación Actix-Web se encuentran dos componentes fundamentales: el `HttpServer` (responsable de las conexiones de red) y el `App` (responsable del enrutamiento y la lógica de negocio).

### El patrón de "Fábrica de Aplicaciones" (App Factory)

A diferencia de otros frameworks en lenguajes interpretados donde defines una instancia global de tu aplicación, Actix-Web requiere que le pases un *closure* (una clausura o función anónima) al inicializar el servidor.

Veamos la configuración más básica posible:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};

async fn health_check() -> impl Responder {
    HttpResponse::Ok().body("Servidor funcionando")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // HttpServer recibe un closure (la fábrica)
    HttpServer::new(|| {
        App::new()
            .route("/health", web::get().to(health_check))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

**¿Por qué un closure `|| { App::new() }` en lugar de simplemente pasarle la instancia?**

Esta es una pregunta clásica de entrevistas para desarrolladores Rust. Actix-Web no levanta un solo hilo para procesar peticiones. Por defecto, clona tu entorno y levanta un grupo de hilos de trabajo (**workers**). El closure actúa como una "fábrica": Actix-Web lo ejecutará una vez por cada worker que inicie. Esto garantiza que cada hilo del sistema operativo tenga su propia instancia aislada de la aplicación, evitando cuellos de botella por bloqueos de memoria (locks) en el enrutador. 

Veremos cómo compartir estado global entre estos workers de forma segura en la sección 16.3, pero por ahora, asume que cada worker es un universo independiente.

### Entendiendo y configurando los Workers

Por defecto, cuando llamas a `HttpServer::new()`, Actix-Web consulta al sistema operativo (utilizando internamente la lógica del crate `num_cpus`) cuántos núcleos lógicos de procesamiento están disponibles. Si tu servidor tiene 8 vCPUs, Actix-Web levantará 8 workers.

Bajo el capó, cada worker en Actix-Web ejecuta su propio *LocalSet* de Tokio (un bucle de eventos asíncrono que no requiere que las tareas sean `Send`). Esto significa que cada worker es extremadamente eficiente gestionando miles de conexiones simultáneas mediante I/O asíncrono.

Sin embargo, hay escenarios donde el comportamiento por defecto no es el ideal:

1. **Entornos limitados (Contenedores/Kubernetes):** A veces, las métricas de CPU dentro de un contenedor Docker pueden engañar al framework, haciéndole creer que tiene acceso a los 64 núcleos del nodo host cuando solo tiene asignado `0.5` vCPUs.
2. **Servidores multipropósito:** Si tu servidor de Actix-Web comparte la misma máquina con un worker pesado de procesamiento en segundo plano o una base de datos local, querrás limitar los recursos que consume el servidor HTTP.

Puedes controlar explícitamente el número de workers utilizando el método `.workers()`:

```rust
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().route("/", web::get().to(|| async { "Hola Mundo" }))
    })
    // Forzamos al servidor a usar exactamente 4 hilos del OS
    .workers(4)
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
```

> **Consejo Senior:** Aumentar el número de workers por encima de los núcleos lógicos disponibles rara vez mejora el rendimiento en aplicaciones puramente asíncronas. De hecho, el cambio de contexto (context switching) extra a nivel del sistema operativo degradará tu latencia. Solo considera subir este número si estás obligado a integrar una librería síncrona bloqueante que no puedes envolver en `tokio::task::spawn_blocking`.

### Configuración Avanzada del Servidor HTTP

Un backend de nivel producción requiere configuraciones de red más resilientes para prevenir agotamiento de recursos o ataques de denegación de servicio (Slowloris, por ejemplo). `HttpServer` expone una API fluida (Builder pattern) para afinar estos detalles:

```rust
use actix_web::http::KeepAlive;
use std::time::Duration;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
    })
    .workers(4)
    // Limita la cantidad máxima de conexiones simultáneas por worker (por defecto 25,000)
    .max_connections(10_000)
    // Cierra la conexión si el cliente tarda más de 5 segundos en enviar el request completo
    .client_request_timeout(Duration::from_secs(5))
    // Configura el comportamiento de Keep-Alive HTTP (Reutilización de conexiones TCP)
    .keep_alive(KeepAlive::Timeout(Duration::from_secs(75)))
    // Tiempo máximo de gracia para terminar peticiones en curso cuando se apaga el servidor
    .shutdown_timeout(30) 
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

### Terminación SSL/TLS directa (Opcional)

Aunque en arquitecturas modernas basadas en microservicios o Kubernetes (como veremos en el Capítulo 40) la terminación TLS suele delegarse a un Ingress Controller, Nginx o un balanceador de carga de AWS/GCP, a veces necesitas que Actix-Web sirva tráfico HTTPS directamente.

Para ello, puedes utilizar la integración nativa con `rustls` (el estándar moderno de criptografía segura en Rust, que evita las dependencias de OpenSSL del sistema). En lugar de `.bind()`, utilizarás `.bind_rustls_0_21()` (el sufijo cambia según la versión del crate):

```rust
// Nota: Requiere las dependencias `rustls` y `rustls-pemfile`
use std::fs::File;
use std::io::BufReader;

/* Ejemplo conceptual de carga de configuración TLS.
  En producción, estas rutas vendrían de variables de entorno.
*/
fn load_rustls_config() -> rustls::ServerConfig {
    // ... lógica para leer certificados .pem y claves privadas ...
    // (Omitido por brevedad, se tratará a fondo en el Cap. 41: Criptografía Práctica)
    unimplemented!() 
}

// ... dentro de main()
// let tls_config = load_rustls_config();
// HttpServer::new(|| App::new())
//     .bind_rustls_0_21("0.0.0.0:8443", tls_config)?
//     .run()
//     .await
```

Comprender la separación entre el servidor que gestiona la red (`HttpServer`) y la fábrica que construye la lógica de negocio (`App`) es el primer gran paso. Con nuestra red e hilos configurados, ahora necesitamos extraer de forma segura los datos que viajan a través de esos hilos hacia nuestros controladores.

## 16.2 Extractors (Path, Query, Json, Form)

En la sección anterior logramos que nuestros workers aceptaran conexiones HTTP. Ahora, el siguiente desafío es interpretar los datos que los clientes nos envían. En lenguajes dinámicos, normalmente inspeccionamos un objeto global `request` y verificamos manualmente si un campo existe. En Rust, esto sería inseguro y propenso a errores en tiempo de ejecución. 

Actix-Web resuelve esto mediante **Extractors** (Extractores). Un extractor es cualquier tipo de dato que implemente el trait `FromRequest`. La magia de Actix-Web radica en que el framework se encarga de inspeccionar la petición HTTP, validar los encabezados, leer el cuerpo (si lo hay) y deserializar los datos directamente en los parámetros de nuestra función controladora (Handler). Si la extracción falla, Actix-Web rechaza automáticamente la petición con una respuesta de error adecuada (usualmente un `400 Bad Request`), sin que nuestro código llegue a ejecutarse.

Como vimos en el Capítulo 15, todo este ecosistema se apoya fuertemente en el crate `serde` para la deserialización.

### 1. Extrayendo variables de la ruta (`web::Path`)

Las APIs RESTful utilizan frecuentemente segmentos dinámicos en la URL para identificar recursos (ej. `/usuarios/123`). Utilizamos `web::Path<T>` para extraer estos valores.

Podemos extraer un único valor o múltiples valores utilizando tuplas, pero la **práctica recomendada a nivel senior** es utilizar structs con nombres descriptivos. Esto evita errores catastróficos si en el futuro cambias el orden de los parámetros en la ruta.

```rust
use actix_web::{get, web, HttpResponse, Responder};
use serde::Deserialize;

#[derive(Deserialize)]
struct UserPathParams {
    user_id: uuid::Uuid,
    // Actix puede parsear cualquier tipo que implemente FromStr/Deserialize
}

// La ruta define el nombre de la variable entre llaves {user_id}
#[get("/users/{user_id}/profile")]
async fn get_user_profile(path: web::Path<UserPathParams>) -> impl Responder {
    let user_id = path.user_id;
    
    // Lógica para buscar al usuario en la base de datos...
    HttpResponse::Ok().body(format!("Perfil del usuario: {}", user_id))
}
```

### 2. Parámetros de consulta (`web::Query`)

Para filtros, paginación o búsquedas, los clientes envían datos en la Query String (`/api/users?limit=50&active=true`). El extractor `web::Query<T>` deserializa estos parámetros.

**Nota importante:** En el mundo real, los parámetros de consulta suelen ser opcionales. Es crucial envolver esos campos en `Option<T>` dentro de tu struct; de lo contrario, Actix-Web fallará con un error 400 si el cliente no envía la URL exacta con todos los campos.

```rust
#[derive(Deserialize)]
struct PaginationQuery {
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
}

#[get("/users")]
async fn list_users(query: web::Query<PaginationQuery>) -> impl Responder {
    // Asignamos valores por defecto si el cliente no los proporcionó
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    HttpResponse::Ok().body(format!("Página {} con límite {}", page, limit))
}
```

### 3. Cargas útiles JSON (`web::Json`)

El formato rey en las APIs modernas. `web::Json<T>` lee el cuerpo de la petición asíncronamente, verifica que el encabezado `Content-Type` sea `application/json` y lo deserializa.

Para evitar consumir memoria indiscriminadamente (un vector de ataque común), `web::Json` tiene un límite de tamaño por defecto (usualmente 2MB).

```rust
#[derive(Deserialize)]
struct CreateUserDto {
    username: String,
    email: String,
    age: u8,
}

#[actix_web::post("/users")]
async fn create_user(payload: web::Json<CreateUserDto>) -> impl Responder {
    // En este punto, estamos 100% seguros de que payload contiene un JSON válido
    // y que todos los campos requeridos (username, email, age) están presentes y son del tipo correcto.
    
    let new_user = payload.into_inner(); // Extrae el struct interno CreateUserDto
    
    HttpResponse::Created().body(format!("Usuario {} creado", new_user.username))
}
```

### 4. Formularios tradicionales (`web::Form`)

Aunque menos común en APIs puras, si tu backend interactúa con formularios HTML clásicos o webhooks antiguos, los datos llegarán codificados como `application/x-www-form-urlencoded`. Su uso es idéntico a `web::Json`, pero utilizando `web::Form<T>`.

```rust
#[derive(Deserialize)]
struct LoginForm {
    username: String,
    password: String, // En un entorno real, usaríamos tipos como Secret<String>
}

#[actix_web::post("/login")]
async fn login_process(form: web::Form<LoginForm>) -> impl Responder {
    if form.username == "admin" && form.password == "supersecreto" {
        HttpResponse::Ok().body("Login exitoso")
    } else {
        HttpResponse::Unauthorized().body("Credenciales inválidas")
    }
}
```

### Combinando Extractores (La regla de oro)

Una función controladora puede recibir múltiples extractores en sus argumentos. Actix-Web los procesará en el orden en que los definas.

```rust
#[actix_web::put("/users/{user_id}")]
async fn update_user(
    path: web::Path<uuid::Uuid>,
    query: web::Query<PaginationQuery>,
    payload: web::Json<CreateUserDto>,
) -> impl Responder {
    // Procesamos la ruta, la query y el cuerpo al mismo tiempo
    HttpResponse::Ok().finish()
}
```

> **Advertencia Senior (Gotcha):** Solo puedes tener **un** extractor que consuma el cuerpo (body) de la petición HTTP por cada handler. El cuerpo HTTP es un flujo de red (stream); una vez que se lee mediante `web::Json`, `web::Form` o `web::Bytes`, el stream se agota. Si intentas poner `web::Json` y luego un extractor de `String` plano como argumentos en la misma función, el compilador no se quejará, pero tu aplicación fallará en tiempo de ejecución porque el segundo extractor intentará leer un cuerpo que ya está vacío.

## 16.3 Gestión del estado compartido de la aplicación

En la sección 16.1 vimos que Actix-Web utiliza un patrón de "Fábrica de Aplicaciones" (`App Factory`). El framework invoca el closure `|| { App::new() }` una vez por cada hilo de trabajo (worker) que levanta el sistema operativo. Esto presenta un desafío arquitectónico evidente: si cada worker tiene su propia instancia de la aplicación, ¿cómo compartimos información global entre ellos?

En una API real, necesitarás compartir recursos costosos de inicializar, como un pool de conexiones a la base de datos, clientes HTTP preconfigurados, o cachés en memoria. Actix-Web resuelve esto mediante el concepto de **Application State** (Estado de la Aplicación) y el extractor `web::Data<T>`.

### El extractor `web::Data<T>`

Bajo el capó, `web::Data<T>` es esencialmente un envoltorio inteligente sobre un `std::sync::Arc<T>` (Atomic Reference Counted). Su propósito principal es permitir que múltiples workers compartan la propiedad de un mismo dato en memoria sin tener que clonar el dato en sí (solo se incrementa el contador de referencias).

Veamos cómo inyectar un estado global, como el nombre de nuestra aplicación o una configuración, y cómo extraerlo en un controlador:

```rust
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};

// 1. Definimos nuestro estado
struct AppState {
    app_name: String,
    version: String,
}

#[get("/info")]
// 2. Extraemos el estado usando web::Data
async fn get_app_info(data: web::Data<AppState>) -> impl Responder {
    let response = format!("Bienvenido a {} v{}", data.app_name, data.version);
    HttpResponse::Ok().body(response)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 3. Inicializamos el estado ANTES del HttpServer
    // Al usar web::Data::new(), creamos el Arc subyacente
    let state = web::Data::new(AppState {
        app_name: String::from("MiSuperAPI"),
        version: String::from("1.0.0"),
    });

    HttpServer::new(move || { // <-- Nota el 'move' para capturar 'state'
        App::new()
            // 4. Inyectamos el estado en la aplicación
            .app_data(state.clone()) 
            .service(get_app_info)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

> **Nota técnica:** Utilizamos `.app_data(state.clone())` dentro del closure. Debido a que `state` es un `web::Data` (y por ende, un `Arc`), el `.clone()` es extremadamente barato; no duplica el struct `AppState`, solo incrementa un contador atómico. Así, los 8 (o más) workers apuntan exactamente al mismo bloque de memoria.

### Mutabilidad del Estado Compartido

Como es estándar en Rust, el acceso a través de referencias compartidas (como `Arc`) es inmutable por defecto. Si intentas modificar `data.app_name` dentro de tu handler, el compilador te detendrá.

Para lograr un estado mutable compartido a través de múltiples peticiones y múltiples hilos (como un contador de visitas o una caché en memoria), debes aplicar el patrón de **Mutabilidad Interior** (Interior Mutability) usando primitivas de sincronización como `Mutex` o `RwLock` de la librería estándar, o tipos atómicos.

```rust
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use std::sync::Mutex;

struct MutableState {
    // Protegemos el contador con un Mutex para acceso concurrente seguro
    visitor_count: Mutex<u32>, 
}

#[get("/visit")]
async fn record_visit(data: web::Data<MutableState>) -> impl Responder {
    // Bloqueamos el Mutex para obtener acceso mutable
    let mut count = data.visitor_count.lock().unwrap();
    *count += 1;
    
    HttpResponse::Ok().body(format!("Eres el visitante número: {}", count))
}
```

### El Anti-Patrón del "Doble Arc" (Advertencia Nivel Senior)

Uno de los errores más comunes al dar el salto a nivel intermedio/avanzado en Rust backend es abusar de `Mutex` y `Arc` cuando se integran librerías externas, específicamente con los Pools de Bases de Datos (como `sqlx` o `deadpool`).

Un desarrollador podría verse tentado a escribir esto:
`web::Data::new(Mutex::new(PgPool::connect(...)))`

**Esto es un anti-patrón severo.** Crates modernos de bases de datos como `sqlx` ya manejan su propia concurrencia interna. Un `PgPool` ya es un `Arc` bajo el capó que gestiona múltiples conexiones asíncronas de manera eficiente. Si lo envuelves en un `Mutex`, forzarás a que todo tu servidor Actix-Web procese las consultas a la base de datos de manera secuencial (una por una), destruyendo por completo el rendimiento de tu aplicación asíncrona.

La forma correcta de inyectar un pool de base de datos es pasarlo directamente a `web::Data`:

```rust
// Ejemplo conceptual con SQLx (se profundizará en el Capítulo 20)
// let pool = PgPoolOptions::new().connect("postgres://...").await?;
// let db_state = web::Data::new(pool); // ¡Correcto! Sin Mutex.

// App::new().app_data(db_state.clone())
```

### Aislamiento de Estado por Scopes

Actix-Web permite limitar el alcance (scope) del estado. No todo el estado tiene que ser global para toda la API. Si tienes módulos distintos, puedes aislar el estado utilizando `web::scope()`:

```rust
App::new()
    .service(
        web::scope("/admin")
            // Este estado solo estará disponible para las rutas bajo /admin
            .app_data(web::Data::new(AdminConfig { ... }))
            .route("/dashboard", web::get().to(admin_dashboard))
    )
```

Dominar la inyección de dependencias a través del estado de la aplicación es lo que te permitirá construir arquitecturas limpias y testeables, ya que podrás inyectar implementaciones "Mock" de tus repositorios o servicios durante las pruebas, como veremos en la Parte VI del libro.

## 16.4 Creación y uso de Middlewares

En la arquitectura de cualquier API robusta, existen operaciones que deben ejecutarse transversalmente para muchas o todas las rutas: registrar logs, comprimir respuestas, verificar tokens de autenticación o inyectar identificadores de trazabilidad (Request IDs). En lugar de duplicar esta lógica en cada controlador (handler), utilizamos **Middlewares**.

Puedes imaginar el sistema de middlewares de Actix-Web como una cebolla. La petición HTTP entrante atraviesa las capas de la cebolla desde el exterior hacia el interior hasta llegar a tu controlador. Luego, la respuesta generada por tu controlador viaja desde el interior hacia el exterior, atravesando las mismas capas en sentido inverso.

### Middlewares integrados (Built-in)

Actix-Web incluye por defecto varios middlewares esenciales que puedes aplicar a toda tu aplicación (o a un *scope* específico) utilizando el método `.wrap()`. 

```rust
use actix_web::{middleware::{Compress, Logger, NormalizePath}, web, App, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Inicializamos el logger estándar de la aplicación
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    HttpServer::new(|| {
        App::new()
            // 1. Comprime las respuestas (Gzip, Brotli, etc.)
            .wrap(Compress::default())
            // 2. Registra la petición HTTP en la salida estándar
            .wrap(Logger::default())
            // 3. Normaliza rutas (ej. convierte "/api/users/" a "/api/users")
            .wrap(NormalizePath::trim())
            .route("/ping", web::get().to(|| async { "pong" }))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

> **La Trampa de Nivel Senior (Gotcha): El Orden de Ejecución.**
> En Actix-Web, los middlewares registrados con `.wrap()` se ejecutan en **orden inverso** a como los defines en el código para la petición entrante, y en orden directo para la respuesta saliente. 
> 
> En el código anterior, la petición entrante pasa primero por `NormalizePath`, luego por `Logger` y finalmente por `Compress`. Entender esto te ahorrará horas de depuración cuando un middleware dependa de modificaciones hechas por otro.

### Creación de Middlewares Personalizados: La forma moderna (`from_fn`)

Históricamente, escribir middlewares personalizados en Actix-Web era notoriamente difícil. Requería implementar manualmente los traits `Service` y `Transform`, lidiando con tiempos de vida (`lifetimes`), futuros anidados y punteros `Pin<Box<dyn Future>>`. Era un rito de iniciación complejo.

Afortunadamente, a partir de Actix-Web 4, el framework introdujo la función `actix_web::middleware::from_fn`, que te permite escribir middlewares utilizando simples funciones asíncronas.

Imaginemos que queremos crear un middleware para proteger ciertas rutas verificando la existencia de un encabezado `X-API-KEY`.

```rust
use actix_web::{
    dev::{ServiceRequest, ServiceResponse},
    error::ErrorUnauthorized,
    middleware::Next,
    Error,
};

// Nuestro middleware es una función asíncrona estándar
async fn api_key_middleware(
    req: ServiceRequest,
    next: Next<impl actix_web::body::MessageBody>,
) -> Result<ServiceResponse<impl actix_web::body::MessageBody>, Error> {
    
    // 1. Fase de Petición (Request): Interceptamos antes del handler
    let api_key = req.headers().get("X-API-KEY");

    if api_key.is_none() || api_key.unwrap().to_str().unwrap_or("") != "secreto123" {
        // Rechazamos la petición inmediatamente sin llamar al handler
        return Err(ErrorUnauthorized("API Key inválida o ausente"));
    }

    // 2. Pasamos el control al siguiente middleware o al handler final
    // Aquí es donde el futuro se suspende hasta que el handler termina
    let res = next.call(req).await?;

    // 3. Fase de Respuesta (Response): Interceptamos la respuesta ya generada
    // Podríamos modificar los headers de la respuesta aquí si quisiéramos
    // let mut res = res;
    // res.headers_mut().insert(...);

    Ok(res)
}
```

Para utilizar este middleware, simplemente lo envolvemos usando `.wrap(from_fn(...))` en un *scope* específico para no bloquear rutas públicas como el login o el health check:

```rust
use actix_web::{middleware::from_fn, web, App, HttpServer, HttpResponse};

// ... (código de api_key_middleware)

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            // Rutas públicas (sin middleware)
            .route("/public", web::get().to(|| async { HttpResponse::Ok().body("Público") }))
            
            // Rutas protegidas agrupadas en un scope
            .service(
                web::scope("/secure")
                    .wrap(from_fn(api_key_middleware))
                    .route("/data", web::get().to(|| async { HttpResponse::Ok().body("Datos secretos") }))
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

### ¿Cuándo usar Traits (`Service` y `Transform`) en lugar de `from_fn`?

Como desarrollador senior, debes saber que `from_fn` cubre el 95% de los casos de uso (autenticación, métricas simples, inyección de dependencias por request). Sin embargo, `from_fn` tiene un pequeño costo de rendimiento debido a la asignación de memoria dinámica (boxing) de los futuros subyacentes.

Debes recurrir a implementar `Service` y `Transform` manualmente **solo cuando**:
1. Estás construyendo una librería pública (un crate) para el ecosistema Actix, donde el rendimiento y la flexibilidad son críticos.
2. Tu middleware necesita mantener un estado interno complejo que debe inicializarse una sola vez al arrancar el servidor (en la fase `Transform`) antes de que comiencen a procesarse las peticiones.

Con la comprensión de los workers, los extractores, la inyección de estado y los middlewares, ahora posees el mapa completo de cómo fluye la información dentro de Actix-Web, desde que el socket TCP acepta la conexión hasta que tu lógica de dominio la procesa.

Con esto concluimos el **Capítulo 16**. El libro avanza hacia una alternativa moderna que ha ganado una tracción masiva en la comunidad debido a su integración nativa con Tokio. 
