La Arquitectura Hexagonal, popularizada por Alistair Cockburn, propone un diseño donde las reglas de negocio residen en un núcleo central, aislado de tecnologías externas. En Rust, este aislamiento no es solo una decisión estética, sino una ventaja técnica: al utilizar **Traits** como contratos (Puertos), garantizamos que nuestro dominio sea agnóstico de bases de datos o frameworks.

Este enfoque facilita el testing mediante mocks y permite que la aplicación evolucione sin fricciones. En este capítulo, aprenderemos a desacoplar la lógica de backend para que cambiar de SQLx a SeaORM, o de una API REST a una CLI, sea una tarea trivial que no comprometa la integridad del código.

## 30.1 Definición de Puertos de Entrada y Salida (Traits)

Como establecimos en el Capítulo 29 al hablar de Arquitectura Limpia y la inversión de dependencias, el núcleo de nuestra aplicación (el dominio y la lógica de negocio) debe estar completamente aislado de los detalles de infraestructura. La Arquitectura Hexagonal (o de Puertos y Adaptadores) formaliza esta separación mediante un concepto fundamental: **los Puertos**.

En la terminología de la Arquitectura Hexagonal, un "puerto" es simplemente un contrato o una interfaz. Define *qué* necesita hacer el sistema, pero ignora por completo el *cómo*. En Rust, la construcción idiomática, segura y de coste cero (o explícito) para modelar estos contratos son los **Traits**.

Podemos clasificar los puertos en dos grandes categorías según la dirección del flujo de control: **Puertos de Entrada** (Driving Ports) y **Puertos de Salida** (Driven Ports).

### Puertos de Salida (Driven / Secondary Ports)

Los Puertos de Salida son los contratos que el núcleo de la aplicación define para interactuar con el mundo exterior. Es aquí donde la inversión de dependencias brilla. El núcleo no depende de SQLx, de Redis o de un cliente HTTP; depende de un Trait. 

En un entorno backend moderno (como vimos en los capítulos de Axum y Actix), estos puertos suelen ser asíncronos y deben ser seguros para compartirse entre hilos.

Veamos cómo definir un puerto de salida para la persistencia de usuarios:

```rust
use uuid::Uuid;
// Asumimos que `User` y `DomainError` están definidos en nuestra capa de Dominio
use crate::domain::{user::User, error::DomainError};

/// Puerto de Salida: Define cómo el núcleo recupera y guarda usuarios.
/// Exigimos `Send + Sync` porque la implementación de este trait 
/// residirá en el estado compartido del servidor web (ej. `Arc<AppState>`),
/// cruzando los límites de los hilos del runtime de Tokio.
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DomainError>;
    async fn save(&self, user: &User) -> Result<(), DomainError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError>;
}
```

**Puntos clave para el desarrollador Senior:**
1. **Tipos de Dominio en las Firmas:** Observa que los parámetros y valores de retorno utilizan tipos estrictamente definidos en el dominio (`User`, `DomainError`, `Uuid`). Un puerto **nunca** debe devolver tipos de la base de datos (como un `UserRow` de SQLx). Si lo hace, la infraestructura estaría filtrándose hacia el dominio.
2. **`Send + Sync`:** Al definir puertos de salida en Rust que serán inyectados en frameworks web, estos *bounds* son innegociables. Nos garantizan en tiempo de compilación que cualquier adaptador que implemente este Trait podrá ser compartido de forma segura entre los workers del servidor.
3. **Async Traits nativos:** Gracias a la estabilización de `async fn` en traits en versiones recientes de Rust, ya no es estrictamente necesario depender de crates externos como `async_trait` (que internamente hace un Boxeo del Future), permitiendo contratos más limpios y con mejor rendimiento.

### Puertos de Entrada (Driving / Primary Ports)

Los Puertos de Entrada definen cómo el mundo exterior (un controlador REST, un handler de gRPC, o una CLI) interactúa con el núcleo de tu aplicación. 

Mientras que en otros lenguajes orientados a objetos siempre se crea una interfaz para los casos de uso, en Rust tienes dos caminos válidos para los puertos de entrada:

**Opción A: Structs directos (El enfoque pragmático)**
Si tu caso de uso no necesita polimorfismo (es decir, el controlador HTTP siempre llamará a la misma lógica de negocio), puedes simplemente definir el puerto de entrada como métodos públicos dentro de un `struct` que actúe como servicio.

**Opción B: Traits (El enfoque estricto)**
Si necesitas mockear el caso de uso desde la capa HTTP para hacer tests unitarios de los controladores sin levantar la lógica de negocio, o si tienes múltiples implementaciones de un mismo flujo, definirás el puerto de entrada como un Trait.

Veamos la implementación estricta usando un Trait para el puerto de entrada:

```rust
// El comando es un DTO de entrada simple y validado.
pub struct RegisterUserCommand {
    pub email: String,
    pub raw_password: String,
}

/// Puerto de Entrada: Contrato para el caso de uso de registro.
pub trait UserRegistrationPort: Send + Sync {
    async fn register(&self, cmd: RegisterUserCommand) -> Result<User, DomainError>;
}
```

### Ensamblando el Núcleo: Interactor / Service

El "Interactor" o "Servicio de Dominio" es el struct que reside en el núcleo. Su trabajo es implementar el Puerto de Entrada orquestando la lógica de negocio, y para ello necesita consumir el Puerto de Salida.

Aquí es donde entra en juego la inyección de dependencias. Como se cubrió en la sección 29.4, podemos inyectar el puerto usando Genéricos (Static Dispatch) o `Box`/`Arc` (Dynamic Dispatch). En el contexto de un servicio de aplicación, el uso de genéricos suele ser la opción más idiomática para evitar el coste de indirección en tiempo de ejecución:

```rust
use crate::ports::{UserRepository, UserRegistrationPort};
use crate::domain::user::{User, Password};

/// El Interactor que contiene la lógica de negocio.
/// Depende de una abstracción `R`, no de una implementación concreta.
pub struct UserRegistrationService<R: UserRepository> {
    repository: R,
}

impl<R: UserRepository> UserRegistrationService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

// Implementamos el Puerto de Entrada usando el Puerto de Salida
impl<R: UserRepository> UserRegistrationPort for UserRegistrationService<R> {
    async fn register(&self, cmd: RegisterUserCommand) -> Result<User, DomainError> {
        // 1. Verificamos si el usuario ya existe (Regla de negocio)
        if self.repository.find_by_email(&cmd.email).await?.is_some() {
            return Err(DomainError::UserAlreadyExists);
        }

        // 2. Ejecutamos lógica de dominio pura (ej. hashing de contraseña)
        let password = Password::hash(&cmd.raw_password)?;
        let new_user = User::new(cmd.email, password);

        // 3. Persistimos a través del Puerto de Salida
        self.repository.save(&new_user).await?;

        Ok(new_user)
    }
}
```

En este diseño, `UserRegistrationService` es completamente agnóstico de la infraestructura. Hemos delimitado perfectamente las fronteras: 
* El adaptador REST llamará a `register()` (Puerto de Entrada).
* El servicio ejecutará su lógica y llamará a `save()` (Puerto de Salida).
* El adaptador de PostgreSQL ejecutará la query final.

Esta separación mediante Traits es la que nos permitirá en el próximo capítulo (30.2 y 30.3) conectar adaptadores primarios y secundarios, e incluso crear *Mocks* precisos para nuestras pruebas sin necesidad de una base de datos real, tema que profundizaremos en la Parte VI sobre Testing.

## 30.2 Adaptadores Primarios (Controladores API, CLI)

Con los Puertos definidos y nuestro núcleo de negocio completamente aislado, es momento de conectar nuestra aplicación con el mundo exterior. En la Arquitectura Hexagonal, los **Adaptadores Primarios** (también conocidos como *Driving Adapters*) son los componentes que inician la interacción con tu aplicación.

Su responsabilidad es simple pero estricta: **traducir las peticiones del mundo exterior (HTTP, gRPC, eventos de Kafka, comandos de terminal) al lenguaje de tu dominio, invocar el Puerto de Entrada, y traducir la respuesta del dominio de vuelta al formato externo.**

La regla de oro para cualquier desarrollador Senior al construir estos adaptadores es mantenerlos **delgados**. Un controlador no debe contener reglas de negocio, validaciones complejas de estado o decisiones de enrutamiento interno; simplemente delega.

### El Adaptador HTTP: Controladores con Axum

Dado que en el Capítulo 17 cubrimos Axum en profundidad, veamos cómo implementaríamos un handler HTTP que actúe como adaptador primario para el `UserRegistrationPort` que definimos en la sección 30.1.

Primero, definimos los Data Transfer Objects (DTOs) específicos de este adaptador. El adaptador web no debe exponer directamente las estructuras del dominio.

```rust
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

// DTO de entrada (Específico del adaptador web)
#[derive(Deserialize)]
pub struct RegisterUserPayload {
    pub email: String,
    pub password: String,
}

// DTO de salida
#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
}

// Representamos el estado de la aplicación inyectando nuestro Puerto
// Usamos `Arc<dyn ...>` para Dynamic Dispatch, permitiendo inyectar 
// fácilmente un Mock en los tests de este controlador.
type AppState = Arc<dyn crate::ports::UserRegistrationPort>;
```

Ahora, implementamos el Handler (el adaptador primario en sí):

```rust
pub async fn register_user_handler(
    State(port): State<AppState>,
    Json(payload): Json<RegisterUserPayload>,
) -> Result<(StatusCode, Json<UserResponse>), AppError> { // AppError maneja la conversión a HTTP 500/400
    
    // 1. Traducir del mundo exterior (Web DTO) al mundo del Dominio (Command)
    let command = crate::ports::RegisterUserCommand {
        email: payload.email,
        raw_password: payload.password,
    };

    // 2. Invocar el Puerto de Entrada (El núcleo de la aplicación hace el trabajo real)
    let user = port.register(command).await?;

    // 3. Traducir del Dominio al mundo exterior (Web DTO)
    let response = UserResponse {
        id: user.id().to_string(),
        email: user.email().to_string(),
    };

    Ok((StatusCode::CREATED, Json(response)))
}
```

### El Adaptador CLI: Reutilización Extrema

La verdadera prueba de fuego de una Arquitectura Hexagonal bien implementada es la capacidad de añadir nuevas interfaces sin tocar el núcleo. ¿Qué pasaría si necesitamos un script de terminal para registrar usuarios administradores de forma manual?

Podemos crear un adaptador CLI usando el crate `clap` (o similar) que consuma **exactamente el mismo caso de uso**:

```rust
use clap::Parser;
use std::sync::Arc;

#[derive(Parser)]
pub struct CliArgs {
    #[arg(short, long)]
    pub email: String,
    #[arg(short, long)]
    pub password: String,
}

// El adaptador CLI
pub async fn run_cli_adapter(
    port: Arc<dyn crate::ports::UserRegistrationPort>,
    args: CliArgs,
) -> Result<(), Box<dyn std::error::Error>> {
    
    // 1. Traducir
    let command = crate::ports::RegisterUserCommand {
        email: args.email,
        raw_password: args.password,
    };

    // 2. Invocar
    match port.register(command).await {
        Ok(user) => {
            // 3. Traducir a salida de terminal
            println!("✅ Usuario registrado exitosamente con ID: {}", user.id());
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Error al registrar usuario: {:?}", e);
            std::process::exit(1);
        }
    }
}
```

### Manejo de Errores en la Frontera

Una de las responsabilidades más críticas de los adaptadores primarios es la traducción de errores. Tu dominio devolverá algo como `DomainError::UserAlreadyExists`. Es el trabajo del **Adaptador HTTP** decidir que esto se traduce en un código de estado `409 Conflict`, mientras que el **Adaptador CLI** decidirá imprimir un mensaje en `stderr` y salir con un código `1`. El dominio jamás debe saber qué es un código de estado HTTP.

En Rust, esto se logra típicamente implementando el trait `IntoResponse` (en el caso de Axum) o `ResponseError` (en Actix) para un tipo de error intermedio del adaptador web, mapeando exhaustivamente (`match`) los errores del dominio a respuestas de la API.

## 30.3 Adaptadores Secundarios (Repositorios, Clientes HTTP externos)

Mientras que los adaptadores primarios *conducen* (drive) nuestra aplicación enviando comandos al núcleo, el núcleo *conduce* a los **Adaptadores Secundarios** (Driven Adapters) para interactuar con la infraestructura subyacente. Estos adaptadores son las implementaciones concretas de los Puertos de Salida (Traits) que definimos en la sección 30.1.

Su propósito fundamental es encapsular la complejidad de la I/O (bases de datos, APIs de terceros, colas de mensajes, sistemas de archivos) y proteger al dominio de las fugas de infraestructura. El dominio no sabe qué es una consulta SQL, un status code HTTP o un tópico de Kafka; solo conoce sus propios Traits.

### El Repositorio: Implementando con SQLx

Tomemos el `UserRepository` que definimos anteriormente y construyamos un adaptador secundario real utilizando `sqlx` y PostgreSQL, herramientas que estudiamos a fondo en el Capítulo 20.

```rust
use sqlx::PgPool;
use uuid::Uuid;
// Importamos el Trait (Puerto) y los tipos de Dominio
use crate::ports::UserRepository;
use crate::domain::{user::{User, Password}, error::DomainError};

/// Adaptador Secundario para PostgreSQL
pub struct PostgresUserRepository {
    pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

// Implementación del Puerto de Salida
impl UserRepository for PostgresUserRepository {
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError> {
        // 1. Ejecutamos la consulta usando tipos primitivos de la base de datos
        let record = sqlx::query!(
            r#"SELECT id, email, password_hash FROM users WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            // 2. Mapeo de errores: Traducimos sqlx::Error a un DomainError
            tracing::error!("Error en la base de datos: {:?}", e);
            DomainError::InternalInfrastructureError
        })?;

        // 3. Mapeo de datos: Traducimos de la Infraestructura (Record) al Dominio (Entity)
        match record {
            Some(row) => {
                // Reconstruimos la entidad de dominio. 
                // Asumimos que `User::from_primitives` es un método interno (crate visibility)
                // que ignora las reglas de creación para hidratar desde la DB.
                let user = User::from_primitives(
                    row.id,
                    row.email,
                    Password::from_hash(row.password_hash)
                );
                Ok(Some(user))
            },
            None => Ok(None),
        }
    }

    async fn save(&self, user: &User) -> Result<(), DomainError> {
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash)
            VALUES ($1, $2, $3)
            "#,
            user.id(),
            user.email(),
            user.password().as_hash()
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Error guardando usuario: {:?}", e);
            DomainError::InternalInfrastructureError
        })?;

        Ok(())
    }
    
    // ... implementación de find_by_id omitida por brevedad
}
```

**La regla de oro del Mapeo:** Un adaptador secundario siempre debe hacer de traductor. Toma la entidad del dominio, extrae sus primitivas para construir la consulta (ej. `user.password().as_hash()`), y cuando lee de la base de datos, toma las filas planas y reconstruye una entidad de dominio rica y válida.

### Clientes HTTP Externos

El mismo principio aplica si nuestra lógica de negocio requiere comunicarse con una API externa, por ejemplo, para enviar un correo de bienvenida. 

Primero, existiría un puerto en el núcleo:

```rust
pub trait EmailSenderPort: Send + Sync {
    async fn send_welcome_email(&self, email: &str) -> Result<(), DomainError>;
}
```

Luego, construiríamos el adaptador secundario usando un cliente como `reqwest`:

```rust
use reqwest::Client;
use crate::ports::EmailSenderPort;
use crate::domain::error::DomainError;

pub struct SendgridEmailAdapter {
    client: Client,
    api_key: String,
}

impl SendgridEmailAdapter {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }
}

impl EmailSenderPort for SendgridEmailAdapter {
    async fn send_welcome_email(&self, email: &str) -> Result<(), DomainError> {
        let payload = serde_json::json!({
            "personalizations": [{"to": [{"email": email}]}],
            "subject": "Bienvenido a nuestra plataforma",
            "content": [{"type": "text/plain", "value": "¡Gracias por registrarte!"}]
        });

        let response = self.client
            .post("https://api.sendgrid.com/v3/mail/send")
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|_| DomainError::ExternalServiceError)?;

        if !response.status().is_success() {
            tracing::error!("Sendgrid falló con status: {}", response.status());
            return Err(DomainError::ExternalServiceError);
        }

        Ok(())
    }
}
```

### Consideraciones para Nivel Senior

1. **Aislamiento de Dependencias (`Cargo.toml`):** En un proyecto estructurado mediante *Workspaces* de Cargo, el crate de tu dominio no debería tener dependencias como `sqlx`, `reqwest` o `sendgrid`. Estas dependencias pertenecen exclusivamente a los crates de infraestructura donde residen tus adaptadores secundarios.
2. **Circuit Breakers y Retries:** Los adaptadores secundarios que hacen llamadas por red (como el cliente HTTP anterior) son el lugar ideal para implementar patrones de resiliencia (cubiertos en el Capítulo 35), protegiendo así al dominio de fallos transitorios en servicios externos.

## 30.4 Ensamblaje de la aplicación (El patrón Registry / AppState)

Hemos construido nuestro dominio protegido, hemos definido contratos mediante Puertos (Traits), y hemos implementado tanto Adaptadores Primarios (controladores HTTP/CLI) como Secundarios (PostgreSQL, APIs externas). Sin embargo, todos estos componentes están desconectados. Necesitamos un lugar central donde se instancien y se conecten entre sí. 

En el diseño de software, a este lugar se le conoce como el **Composition Root** (Raíz de Composición). En una aplicación Rust típica, este rol recae casi de forma exclusiva en la función `main()` (o en una función de inicialización llamada desde `main`).

A diferencia de lenguajes como Java o C#, donde los frameworks de Inyección de Dependencias (DI) utilizan reflexión para resolver las dependencias en tiempo de ejecución de forma "mágica", en Rust preferimos la **Inyección de Dependencias Manual** o el uso del patrón **Registry / AppState**. Esto garantiza la seguridad de tipos, mejora el rendimiento y hace que el grafo de dependencias sea explícito.

### El Patrón AppState (Registry)

El patrón AppState consiste en crear una estructura central que actúe como un registro o contenedor de todos nuestros casos de uso (Puertos de Entrada). Los adaptadores primarios (como los handlers de Axum) extraerán sus dependencias de este estado compartido.

```rust
use std::sync::Arc;
use crate::ports::UserRegistrationPort;

/// El Registry de la aplicación.
/// Contiene referencias a las implementaciones de los Puertos de Entrada.
#[derive(Clone)]
pub struct AppState {
    // Exponemos el Trait (Puerto), no la implementación concreta (Servicio).
    // Usamos Arc<dyn ...> para Dynamic Dispatch. Esto simplifica enormemente
    // las firmas de tipos en los handlers HTTP y facilita el Mocking global.
    pub user_registration_port: Arc<dyn UserRegistrationPort>,
    
    // Aquí irían otros puertos...
    // pub email_port: Arc<dyn EmailSenderPort>,
}
```

### El Composition Root (`main.rs`)

Ahora, veamos cómo se orquesta la creación de la aplicación paso a paso. El orden es fundamental: construimos desde fuera hacia adentro, y luego inyectamos de adentro hacia afuera.

1. Inicializamos conexiones de infraestructura (Bases de datos).
2. Instanciamos los Adaptadores Secundarios.
3. Instanciamos los Interactors (Servicios de Dominio) inyectando los Adaptadores Secundarios.
4. Empaquetamos los Interactors en el `AppState`.
5. Levantamos el Adaptador Primario (Servidor HTTP) pasándole el `AppState`.

```rust
use axum::{routing::post, Router};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;

// Importamos los módulos construidos en las secciones anteriores
use crate::{
    adapters::{
        primary::web::register_user_handler,
        secondary::postgres::PostgresUserRepository,
    },
    core::services::UserRegistrationService,
    app_state::AppState,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Inicialización de la Infraestructura
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL debe estar configurada");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // 2. Instanciación de Adaptadores Secundarios (Driven)
    let user_repository = PostgresUserRepository::new(pool);

    // 3. Instanciación del Núcleo (Servicio/Interactor)
    // Inyectamos el adaptador secundario en el servicio mediante Genéricos (Static Dispatch)
    let user_registration_service = UserRegistrationService::new(user_repository);

    // 4. Construcción del AppState (Registry)
    let state = AppState {
        // Envolvemos el servicio en un Arc para compartirlo entre hilos.
        // Aquí ocurre la coerción implícita de `Arc<UserRegistrationService>` 
        // a `Arc<dyn UserRegistrationPort>` (Dynamic Dispatch para la web).
        user_registration_port: Arc::new(user_registration_service),
    };

    // 5. Configuración del Adaptador Primario (Framework Web)
    let app = Router::new()
        .route("/api/v1/users", post(register_user_handler))
        // Compartimos el estado con todos los handlers
        .with_state(state);

    // 6. Ejecución del Servidor
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("Servidor escuchando en {}", listener.local_addr()?);
    
    axum::serve(listener, app).await?;

    Ok(())
}
```

### Ventajas de este enfoque

Para un desarrollador Senior de Rust, este patrón de ensamblaje ofrece beneficios cruciales:

* **Tiempos de compilación controlados:** Al usar `dyn Trait` en el `AppState`, evitamos que el framework web (como Axum) tenga que monomorfizar tipos gigantescos cada vez que añadimos un nuevo servicio, reduciendo la carga del compilador.
* **Flexibilidad de despliegue:** Si quisiéramos arrancar la aplicación como un CLI en lugar de un servidor web, el código desde el paso 1 hasta el paso 3 se mantiene **exactamente igual**. Solo cambiaríamos los pasos 4 y 5 para inyectar el servicio en un adaptador de terminal.
* **Testabilidad absoluta:** Para hacer tests de integración del router HTTP (Paso 5), podemos construir un `AppState` con un `MockUserRepository` en milisegundos, sin levantar Docker ni PostgreSQL.

Con esto concluimos el Capítulo 30, estableciendo una arquitectura robusta, modular e inyectable, lista para escalar en entornos de producción complejos.
