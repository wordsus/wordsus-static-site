GraphQL revoluciona la forma en que el backend expone datos, permitiendo que el cliente defina la estructura de la respuesta. En Rust, esto se traduce en una combinación potente de seguridad de tipos y rendimiento asíncrono. A través del crate `async-graphql`, implementaremos un enfoque *code-first* donde el compilador garantiza que nuestro esquema y modelos sean siempre coherentes. En este capítulo, exploraremos cómo construir esquemas robustos, optimizar el acceso a datos mediante *dataloaders* para eliminar el problema de N+1 consultas y habilitar comunicaciones en tiempo real con subscripciones sobre WebSockets, aprovechando todo el poder del runtime de Tokio.

## 36.1 Schemas, Queries y Mutaciones con `async-graphql`

A diferencia del enfoque tradicional de diseño de APIs RESTful que exploramos en la Parte IV, GraphQL propone un paradigma declarativo donde el cliente especifica exactamente qué datos necesita. En el ecosistema de Rust, **`async-graphql`** se ha consolidado como el estándar de facto por una razón principal: utiliza un enfoque **Code-First** (El código es la fuente de la verdad) fuertemente tipado.

Al aprovechar las macros procedurales que vimos en el Capítulo 10, `async-graphql` garantiza en tiempo de compilación que tu esquema GraphQL sea perfectamente congruente con tus estructuras de datos en Rust. Si compila, tu esquema es válido.

### 1. Code-First y Tipos Básicos (`SimpleObject`)

En un enfoque Schema-First (común en Node.js o Go), escribirías un archivo `.graphql` y luego intentarías atar ese esquema a tus funciones. En `async-graphql`, definimos los tipos directamente usando `structs` de Rust.

Para exponer una estructura de datos estática como un tipo de GraphQL, utilizamos la macro `#[derive(SimpleObject)]`. Esta macro inspecciona los campos del `struct` y genera automáticamente el esquema equivalente.

```rust
use async_graphql::{SimpleObject, ID};

/// Los comentarios de documentación en Rust se convierten automáticamente
/// en descripciones dentro del esquema GraphQL.
#[derive(SimpleObject)]
pub struct Task {
    pub id: ID,
    pub title: String,
    // Un bool en Rust se mapea a un Boolean (Non-Null) en GraphQL
    pub completed: bool, 
}
```

> **Nota sobre la nulabilidad:** `async-graphql` mapea maravillosamente el sistema de tipos de Rust. Un tipo `String` en Rust será un `String!` (no nulo) en GraphQL. Si deseas que un campo sea opcional, simplemente envuélvelo en el enum que exploramos en el Capítulo 6: `Option<String>`.

### 2. Queries: El punto de entrada de lectura (`Object`)

Las *Queries* son el equivalente a las peticiones `GET` en REST. Para definir cómo se resuelven los datos, creamos un `struct` (generalmente vacío) que actuará como raíz de nuestras consultas, y le aplicamos la macro de atributo `#[Object]` a su bloque `impl`.

Cada método asíncrono dentro de este bloque se convertirá en un campo consultable (Query) en nuestro esquema.

```rust
use async_graphql::Object;

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Obtiene una tarea por su identificador único.
    async fn task(&self, id: ID) -> Option<Task> {
        // Por ahora retornamos datos estáticos. En la siguiente sección
        // veremos cómo acceder a la base de datos real.
        if id.as_str() == "1" {
            Some(Task {
                id,
                title: "Migrar de REST a GraphQL".to_string(),
                completed: false,
            })
        } else {
            None
        }
    }

    /// Retorna una lista de todas las tareas.
    async fn all_tasks(&self) -> Vec<Task> {
        vec![
            Task {
                id: ID::from("1"),
                title: "Aprender async-graphql".to_string(),
                completed: true,
            }
        ]
    }
}
```

### 3. Mutaciones: Modificando el estado (`InputObject`)

Las *Mutations* son las operaciones de escritura (equivalentes a `POST`, `PUT`, `PATCH`, `DELETE`). En GraphQL, es una buena práctica (y un requisito técnico frecuente) separar los tipos que devolvemos (`Object`) de los tipos que recibimos como argumentos.

Para estructuras complejas de entrada, `async-graphql` provee `#[derive(InputObject)]`.

```rust
use async_graphql::InputObject;

#[derive(InputObject)]
pub struct CreateTaskInput {
    pub title: String,
    // Proporcionar un valor por defecto si el cliente no envía este campo
    #[graphql(default = false)] 
    pub completed: bool,
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Crea una nueva tarea y retorna el objeto creado.
    async fn create_task(&self, input: CreateTaskInput) -> Task {
        // Aquí iría la lógica de persistencia (ej. SQLx o SeaORM)
        Task {
            id: ID::from("999"), // Generado por la DB idealmente
            title: input.title,
            completed: input.completed,
        }
    }
}
```

### 4. Ensamblando el Schema

Una vez que tenemos nuestras raíces de lectura (`QueryRoot`) y escritura (`MutationRoot`), debemos combinarlas en un único esquema ejecutable. Esto normalmente se realiza durante la inicialización de nuestra aplicación, antes de arrancar nuestro servidor web (sea Actix o Axum).

El tipo `Schema` requiere tres genéricos: la Query, la Mutation y la Subscription. Dado que abordaremos las subscripciones más adelante en el Capítulo 36, por ahora utilizaremos `EmptySubscription`.

```rust
use async_graphql::{Schema, EmptySubscription};

// Creamos un alias de tipo por conveniencia
pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

#[tokio::main]
async fn main() {
    // Construimos el esquema
    let schema = Schema::build(
        QueryRoot, 
        MutationRoot, 
        EmptySubscription
    )
    .finish();

    // Podemos imprimir el esquema generado en formato SDL (Schema Definition Language)
    // Esto es muy útil para compartir el contrato con el equipo de Frontend
    println!("{}", schema.sdl());
    
    // ... Código de inicialización del servidor (Axum/Actix) ...
}
```

Con este ensamblaje, el servidor ya es capaz de procesar una petición GraphQL entrante, parsear el AST de la consulta, validar los tipos contra nuestro código compilado en Rust, y ejecutar las funciones asíncronas correspondientes con el runtime de Tokio. 

Sin embargo, hasta este punto, nuestras respuestas están *mockeadas*. En aplicaciones del mundo real, los *resolvers* necesitan acceder a recursos externos compartidos, como pools de bases de datos o clientes HTTP.

## 36.2 Resolvers asíncronos y contexto

En la sección anterior construimos un esquema estático que devolvía datos *mockeados* directamente desde la memoria. Sin embargo, en un entorno de producción, las resoluciones de GraphQL (los *resolvers*) rara vez son síncronas. Necesitan acceder a bases de datos, consultar APIs externas o leer archivos, operaciones que requieren asincronía para no bloquear el hilo de ejecución del servidor.

Además, esos *resolvers* necesitan una forma de acceder a los recursos compartidos de la aplicación (como el pool de conexiones a la base de datos o la información del usuario autenticado). Aquí es donde entra en juego el objeto **`Context`** de `async-graphql`.

### 1. El Objeto `Context`: Inyectando Dependencias

El framework `async-graphql` utiliza un patrón de inyección de dependencias basado en tipos. Cuando construyes tu esquema, puedes adjuntarle cualquier dato estructurado. Durante la ejecución de una consulta, el motor de GraphQL pasa un objeto `Context` a cada *resolver*, permitiéndote extraer esos datos.

Para inyectar dependencias, utilizamos el método `.data()` durante la construcción del esquema (el patrón *Registry / AppState* que discutimos en el Capítulo 30).

```rust
use async_graphql::{Schema, EmptySubscription};
use sqlx::postgres::PgPool;

// Asumimos que tenemos las raíces del capítulo anterior
pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

#[tokio::main]
async fn main() {
    // 1. Inicializamos nuestro pool de base de datos (Ej. usando SQLx)
    let db_pool = PgPool::connect("postgres://user:pass@localhost/db").await.unwrap();

    // 2. Construimos el esquema e inyectamos el pool
    let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(db_pool) // Inyectamos el PgPool en el contexto global
        .finish();

    // ... Inicialización de Axum o Actix-Web ...
}
```

### 2. Extrayendo Datos en el Resolver

Una vez que los datos están inyectados en el esquema, podemos modificar nuestras funciones en el bloque `#[Object]` para recibirlos. Simplemente debemos añadir un argumento de tipo `&Context<'_>`. `async-graphql` es lo suficientemente inteligente como para reconocer este argumento especial y no exponerlo como un parámetro en el esquema GraphQL público.

Existen dos formas principales de extraer datos del contexto:
* `ctx.data::<T>()`: Devuelve un `Result`, útil si la dependencia podría faltar y quieres manejar el error gracefully.
* `ctx.data_unchecked::<T>()`: Asume que el dato existe e ignora la seguridad en tiempo de ejecución (hace un *panic* si el tipo `T` no fue inyectado). Es preferible usar la primera opción en entornos de producción.

```rust
use async_graphql::{Context, Object, Result, Error, ID};
use sqlx::PgPool;

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Obtiene una tarea desde la base de datos PostgreSQL
    async fn task(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Task>> {
        // Extraemos el pool de conexiones de manera segura
        let pool = ctx.data::<PgPool>()
            .map_err(|_| Error::new("Error interno de configuración del servidor"))?;

        // Convertimos el ID de GraphQL (String) al tipo esperado por la DB (i32)
        let parsed_id = id.parse::<i32>()?;

        // Ejecutamos la consulta asíncrona usando SQLx (Capítulo 20)
        let task = sqlx::query_as!(
            Task,
            "SELECT id::text, title, completed FROM tasks WHERE id = $1",
            parsed_id
        )
        .fetch_optional(pool)
        .await?; // El operador ? propaga los errores de SQLx automáticamente

        Ok(task)
    }
}
```

### 3. Manejo de Errores en Resolvers (`async_graphql::Result`)

Habrás notado en el código anterior que la firma de retorno de nuestro *resolver* cambió de `Option<Task>` a `Result<Option<Task>>`. 

En GraphQL, es perfectamente legal que una consulta devuelva datos parciales junto con un arreglo de errores. Si una consulta a la base de datos falla, no queremos que toda la petición GraphQL caiga en pánico; queremos devolver un error estructurado al cliente.

`async-graphql` provee su propio alias `Result<T>` que envuelve a `async_graphql::Error`. Gracias a la magia del ecosistema de Rust y los traits de conversión (`From`), los errores estándar (como los devueltos por `sqlx::Error` o `anyhow::Error` que vimos en el Capítulo 5) se pueden propagar directamente usando el operador `?`. El motor de GraphQL capturará este error de Rust y lo formateará en el JSON de respuesta bajo la clave `"errors"`.

### 4. Contextos a nivel de Request (Autenticación)

Mientras que un pool de base de datos se inyecta una sola vez al construir el esquema (Contexto Global), hay datos que cambian con cada petición HTTP, como el ID del usuario autenticado extraído de un token JWT (Capítulo 18).

Para inyectar contexto *por petición*, los frameworks de integración como `async_graphql_axum` o `async_graphql_actix_web` permiten enriquecer la petición entrante antes de que llegue a los *resolvers*.

Ejemplo conceptual de integración en un handler de Axum:

```rust
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::Extension;

// Un tipo fuerte para el usuario actual
pub struct CurrentUser {
    pub id: uuid::Uuid,
    pub role: String,
}

// Este handler de Axum recibe la petición GraphQL y el usuario autenticado
// (asumiendo que un middleware previo validó el JWT y lo puso en las extensiones)
async fn graphql_handler(
    schema: Extension<AppSchema>,
    user: Extension<CurrentUser>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = req.into_inner();
    
    // Inyectamos el usuario específico de esta petición
    request = request.data(user.0);

    schema.execute(request).await.into()
}
```

Con este flujo, dentro de cualquier *resolver*, puedes llamar a `ctx.data::<CurrentUser>()` para aplicar control de acceso (RBAC) o filtrar consultas de base de datos, asegurando que un usuario solo pueda acceder a sus propios recursos.

## 36.3 Problema de N+1 consultas (Dataloaders en Rust)

La flexibilidad de GraphQL tiene un costo oculto muy conocido: el infame **problema de las N+1 consultas**. Debido a que GraphQL resuelve los campos de forma jerárquica e independiente, una consulta aparentemente inofensiva puede destruir el rendimiento de tu base de datos si no tienes cuidado.

Imagina que un cliente solicita una lista de 100 tareas (`Tasks`) y, para cada tarea, pide los datos del usuario que la creó (`Author`).

```graphql
query {
  tasks {
    title
    author {
      name
    }
  }
}
```

Si implementamos esto de forma ingenua, nuestro *resolver* de `tasks` hará **1 consulta** a la base de datos para obtener las 100 tareas. Luego, el motor de GraphQL ejecutará el *resolver* del campo `author` **100 veces** de forma concurrente. El resultado: **101 consultas** a la base de datos (1 + N). Si nuestra aplicación escala, esto saturará rápidamente el pool de conexiones.

### 1. La solución: El patrón DataLoader

Introducido originalmente por Facebook, un `DataLoader` es una utilidad que agrupa (batching) y almacena en caché (caching) las peticiones de datos dentro del contexto de una única solicitud HTTP.

En lugar de que cada *resolver* consulte la base de datos inmediatamente, le pasa el ID que necesita al `DataLoader`. El DataLoader espera una fracción de segundo (acumulando todos los IDs solicitados por los diferentes *resolvers* en esa fase del ciclo de eventos asíncrono) y luego dispara **una sola consulta** a la base de datos buscando todos esos IDs a la vez (por ejemplo, usando `WHERE id IN (...)`).

### 2. Implementando un Loader con `async-graphql`

El crate `async-graphql` incluye soporte nativo para este patrón a través del módulo `async_graphql::dataloader`. Para crear un cargador de datos, debemos implementar el trait `Loader<K>`.

Vamos a crear un `UserLoader` que reciba un lote de IDs de usuario (`i32`) y devuelva un `HashMap` relacionando cada ID con su respectivo `User`.

```rust
use async_graphql::dataloader::Loader;
use async_graphql::Result;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;

// Nuestro tipo de datos
#[derive(Clone, async_graphql::SimpleObject)]
pub struct User {
    pub id: i32,
    pub name: String,
}

// El estado interno de nuestro Loader (necesita el pool de DB)
pub struct UserLoader {
    pub pool: PgPool,
}

#[async_trait::async_trait]
impl Loader<i32> for UserLoader {
    type Value = User;
    // El tipo de error debe implementar Clone, por lo que envolvemos 
    // el error de SQLx en un Arc (Atomic Reference Counted pointer)
    type Error = Arc<sqlx::Error>;

    async fn load(&self, keys: &[i32]) -> Result<HashMap<i32, Self::Value>, Self::Error> {
        // En PostgreSQL, el operador `= ANY($1)` es ideal para buscar arrays de IDs
        let users = sqlx::query_as!(
            User,
            "SELECT id, name FROM users WHERE id = ANY($1)",
            keys
        )
        .fetch_all(&self.pool)
        .await
        .map_err(Arc::new)?; // Convertimos el error al tipo esperado

        // Mapeamos los resultados a un HashMap usando el ID como clave
        let mut user_map = HashMap::new();
        for user in users {
            user_map.insert(user.id, user);
        }

        Ok(user_map)
    }
}
```

### 3. Inyección y uso del DataLoader en los Resolvers

Para utilizar nuestro `UserLoader`, debemos instanciarlo envolviéndolo en `DataLoader::new` y registrarlo en el contexto global de nuestro esquema, tal como hicimos con el pool de conexiones en la sección anterior. Al instanciarlo, también le pasamos el *runtime* asíncrono de Tokio para que pueda spawnear tareas en segundo plano.

```rust
use async_graphql::dataloader::DataLoader;
use async_graphql::{Schema, EmptySubscription};

// ... dentro de la inicialización del servidor ...

let pool = PgPool::connect("...").await.unwrap();

// Instanciamos el DataLoader indicando que use tokio::spawn
let user_loader = DataLoader::new(
    UserLoader { pool: pool.clone() }, 
    tokio::spawn
);

let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
    .data(pool)
    .data(user_loader) // Inyectamos el DataLoader
    .finish();
```

Finalmente, en el *resolver* de nuestro tipo `Task`, en lugar de hacer una consulta directa a `sqlx`, extraemos el `DataLoader` del contexto e invocamos el método `.load_one()`.

```rust
use async_graphql::{ComplexObject, Context};

// Supongamos que Task tiene un author_id oculto a GraphQL
pub struct Task {
    pub id: i32,
    pub title: String,
    #[graphql(skip)] // No exponemos la clave foránea directamente
    pub author_id: i32,
}

// Usamos ComplexObject para añadir campos calculados a un tipo
#[ComplexObject]
impl Task {
    /// Resuelve el autor de la tarea usando el DataLoader
    async fn author(&self, ctx: &Context<'_>) -> async_graphql::Result<Option<User>> {
        // Extraemos el DataLoader fuertemente tipado
        let loader = ctx.data_unchecked::<DataLoader<UserLoader>>();
        
        // load_one encola el ID y suspende la ejecución de esta tarea de Tokio 
        // hasta que el lote completo sea resuelto por el `load` que definimos antes.
        let user = loader.load_one(self.author_id).await?;
        
        Ok(user)
    }
}
```

Al aplicar este patrón, si el cliente pide 100 tareas, la función `author` se llamará 100 veces concurrentemente. Cada llamada delegará el `author_id` al `DataLoader`. El motor asíncrono agrupará esos 100 IDs en un solo arreglo `keys` de Rust, y ejecutará exactamente **1 consulta SQL** a PostgreSQL. Hemos convertido 101 consultas en solo 2, logrando un rendimiento óptimo sin sacrificar la flexibilidad del cliente GraphQL.

## 36.4 Subscripciones vía WebSockets en GraphQL

Hasta ahora, hemos cubierto operaciones basadas en el clásico ciclo de petición-respuesta HTTP (Queries y Mutations). Sin embargo, las aplicaciones modernas a menudo requieren actualizaciones en tiempo real: notificaciones, chats, o dashboards dinámicos. En GraphQL, esto se resuelve mediante las **Subscriptions** (Subscripciones).

A nivel de red, las subscripciones en `async-graphql` se implementan típicamente sobre **WebSockets**, manteniendo una conexión persistente abierta entre el cliente y el servidor. En lugar de devolver un valor estático, un *resolver* de subscripción en Rust devuelve un **`Stream`** (flujo asíncrono) de eventos.

### 1. El mecanismo de Broadcasting (Pub/Sub)

Para que una subscripción funcione, necesitamos un mecanismo para que una parte de nuestra aplicación (por ejemplo, una Mutación que crea una tarea) avise a la otra parte (la Subscripción que está escuchando) de que algo nuevo ha ocurrido. 

Aprovechando el ecosistema de Tokio que exploramos en el Capítulo 32, la herramienta ideal para esto es un canal de difusión: `tokio::sync::broadcast`. Este tipo de canal permite tener múltiples productores y múltiples consumidores simultáneos.

Primero, inicializamos el canal y lo inyectamos en nuestro esquema global:

```rust
use async_graphql::{Schema, EmptySubscription};
use tokio::sync::broadcast;

// Asumimos el tipo Task definido en secciones anteriores
pub type AppSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

#[tokio::main]
async fn main() {
    // Creamos un canal de broadcast con capacidad para 100 mensajes en cola
    let (tx, _rx) = broadcast::channel::<Task>(100);

    // Inyectamos el Sender (tx) en el contexto global de GraphQL
    let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(tx) 
        // .data(pool) // ... inyectamos db_pool, dataloaders, etc.
        .finish();

    // ... Inicialización del servidor ...
}
```

### 2. Emitiendo eventos desde una Mutación

Modifiquemos nuestra `MutationRoot` para que, cada vez que se cree una tarea exitosamente, envíe una copia de esa tarea a través del canal de Tokio.

```rust
use async_graphql::{Context, Object, Result};
use tokio::sync::broadcast;

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_task(&self, ctx: &Context<'_>, input: CreateTaskInput) -> Result<Task> {
        // 1. Lógica de inserción en Base de Datos (SQLx)...
        let new_task = Task {
            id: 999.into(),
            title: input.title,
            completed: input.completed,
        };

        // 2. Extraemos el canal de broadcast del contexto
        if let Ok(sender) = ctx.data::<broadcast::Sender<Task>>() {
            // Ignoramos el error si no hay clientes suscritos escuchando actualmente
            let _ = sender.send(new_task.clone()); 
        }

        Ok(new_task)
    }
}
```

### 3. La raíz de Subscripción (`SubscriptionRoot`)

Ahora definiremos la raíz para nuestras operaciones en tiempo real. A diferencia de `#[Object]`, aquí utilizamos la macro `#[Subscription]`. 

El desafío principal en este punto es convertir el receptor de Tokio (`broadcast::Receiver`) en un `Stream` compatible con `async-graphql`. Para ello, nos apoyamos en los crates `tokio-stream` y `futures-util`.

```rust
use async_graphql::{Context, Subscription};
use futures_util::Stream;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;

pub struct SubscriptionRoot;

#[Subscription]
impl SubscriptionRoot {
    /// Se subscribe a la creación de nuevas tareas.
    /// Retorna un `impl Stream` que emite objetos `Task`.
    async fn tasks_added(&self, ctx: &Context<'_>) -> impl Stream<Item = Task> {
        // Extraemos el Sender y creamos un nuevo Receiver para esta conexión específica
        let sender = ctx.data_unchecked::<broadcast::Sender<Task>>();
        let receiver = sender.subscribe();

        // Convertimos el Receiver en un Stream asíncrono
        BroadcastStream::new(receiver)
            .filter_map(|message| {
                // message es de tipo Result<Task, BroadcastStreamRecvError>
                // Ignoramos los errores de lag (retraso del cliente) y pasamos solo los datos
                match message {
                    Ok(task) => Some(task),
                    Err(_) => None,
                }
            })
    }
}
```

### 4. Integración de WebSockets en Axum

El último paso es exponer este esquema a través de un endpoint HTTP real. Mientras que las Queries y Mutations se sirven normalmente en una ruta `POST /graphql`, las Subscripciones requieren el protocolo WebSocket (por ejemplo, `WS /graphql/ws`).

El crate `async-graphql-axum` nos proporciona un manejador listo para usar llamado `GraphQLSubscription`.

```rust
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::{
    extract::{Extension, WebSocketUpgrade},
    response::IntoResponse,
    routing::{get, post},
    Router,
};

// ... dentro de nuestra función main ...

// Construimos el enrutador de Axum
let app = Router::new()
    // Endpoint para Queries y Mutaciones (POST)
    .route("/graphql", post(graphql_handler))
    // Endpoint para Subscripciones vía WebSockets (GET Upgrade)
    .route(
        "/graphql/ws",
        get(|ws: WebSocketUpgrade, schema: Extension<AppSchema>| async move {
            // Delega la negociación del protocolo WebSocket a async-graphql
            GraphQLSubscription::new(schema.0).into_response(ws)
        }),
    )
    .layer(Extension(schema));

// ... tokio::net::TcpListener::bind(...) y axum::serve(...) ...
```

Con esto, los clientes de frontend (como Apollo Client o Relay) pueden conectarse a `ws://localhost:8000/graphql/ws`, enviar su *query* de subscripción y comenzar a recibir un flujo constante de JSONs en tiempo real, todo validado estáticamente y respaldado por la concurrencia ultrarrápida de Tokio.
