En el desarrollo de backend moderno, el modelo relacional no siempre es la solución óptima para cada caso de uso. Este capítulo explora el ecosistema NoSQL en Rust, centrándose en la alta disponibilidad, el rendimiento extremo y la escalabilidad.

Desde el almacenamiento de documentos con **MongoDB** y el manejo de flujos masivos de datos en **ScyllaDB**, hasta la aceleración de respuestas mediante **Redis** y la eficiencia de motores embebidos como **Sled** o **RocksDB**, aprenderás a elegir e integrar la herramienta adecuada. Descubrirás cómo el sistema de tipos de Rust y la asincronía de Tokio transforman la interacción con datos no estructurados en una experiencia segura y de baja latencia.

## 22.1 Integración con MongoDB (Driver asíncrono oficial)

A diferencia de las bases de datos relacionales que exploramos en capítulos anteriores (donde herramientas como SQLx o Diesel son los reyes), el ecosistema NoSQL en Rust tiene un líder indiscutible para bases de datos orientadas a documentos: el driver oficial `mongodb`.

Mantenido directamente por MongoDB Inc., este crate es asíncrono por defecto (construido sobre `tokio`), altamente optimizado y se integra de manera nativa con `serde` para evitar la manipulación manual de documentos BSON, permitiéndonos trabajar directamente con Structs fuertemente tipados.

### Dependencias necesarias

Para comenzar, necesitamos agregar el driver junto con `tokio`, `serde` y `futures` (este último es fundamental para iterar sobre los cursores que devuelve MongoDB). En tu `Cargo.toml`:

```toml
[dependencies]
mongodb = "2.8" # Verifica la última versión estable
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
futures = "0.3"
```

### El Cliente y el Pool de Conexiones

Una de las diferencias arquitectónicas más importantes al pasar de PostgreSQL a MongoDB en Rust es la gestión del pool de conexiones. Como vimos en el Capítulo 19, herramientas como Postgres requieren un pooler explícito (`deadpool` o `bb8`).

Con MongoDB, **el objeto `mongodb::Client` ya es un pool de conexiones gestionado internamente**. Utiliza `Arc` bajo el capó, por lo que clonar el cliente para pasarlo entre los distintos hilos de nuestro servidor web (como en Actix o Axum) es extremadamente barato y es el patrón de diseño recomendado.

```rust
use mongodb::{options::ClientOptions, Client};
use std::error::Error;

pub async fn conectar_db(uri: &str) -> Result<Client, Box<dyn Error>> {
    // Analiza la cadena de conexión
    let mut client_options = ClientOptions::parse(uri).await?;
    
    // Opcional: Configurar el nombre de la aplicación para telemetría
    client_options.app_name = Some("rust_backend_api".to_string());

    // Instancia el cliente (que inicializa el pool en segundo plano)
    let client = Client::with_options(client_options)?;

    // Realizamos un 'ping' rápido para confirmar la conectividad
    client
        .database("admin")
        .run_command(mongodb::bson::doc! {"ping": 1}, None)
        .await?;

    println!("Conectado exitosamente a MongoDB.");
    Ok(client)
}
```

### Modelado de Datos: BSON y Serde

MongoDB almacena los datos en formato BSON (Binary JSON). Aunque el crate nos permite trabajar con el tipo dinámico `mongodb::bson::Document`, en una arquitectura backend robusta (como vimos en los capítulos de Domain-Driven Design), lo ideal es mapear estas colecciones directamente a nuestras entidades de dominio de Rust.

El driver maneja esto a través de colecciones tipadas (`Collection<T>`).

```rust
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Usuario {
    // Usamos rename para mapear el "_id" de Mongo.
    // skip_serializing_if evita enviar un ID nulo al insertar un nuevo documento,
    // permitiendo que MongoDB genere el ObjectId automáticamente.
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub nombre: String,
    pub email: String,
    pub roles: Vec<String>,
}
```

### Operaciones CRUD Asíncronas

Una vez que tenemos nuestro modelo y cliente listos, podemos interactuar con la base de datos de manera fuertemente tipada. El uso de la macro `doc!` provista por el crate `bson` es la forma idiomática de construir consultas de manera segura.

A continuación, un ejemplo práctico de un repositorio que implementa operaciones de inserción y lectura:

```rust
use mongodb::{Collection, bson::doc};
use futures::stream::TryStreamExt; // Requerido para invocar `.try_next()` en el Cursor

pub struct UsuarioRepository {
    coleccion: Collection<Usuario>,
}

impl UsuarioRepository {
    pub fn new(cliente: &Client, db_nombre: &str) -> Self {
        let db = cliente.database(db_nombre);
        // Tipamos la colección en el momento de obtenerla
        let coleccion = db.collection::<Usuario>("usuarios");
        Self { coleccion }
    }

    /// Inserta un nuevo usuario y devuelve el ObjectId generado
    pub async fn crear_usuario(&self, mut usuario: Usuario) -> mongodb::error::Result<ObjectId> {
        let resultado = self.coleccion.insert_one(&usuario, None).await?;
        
        // Extraemos el ID generado por MongoDB
        let id_generado = resultado.inserted_id.as_object_id().unwrap();
        usuario.id = Some(id_generado);
        
        Ok(id_generado)
    }

    /// Busca un usuario por su email
    pub async fn buscar_por_email(&self, email: &str) -> mongodb::error::Result<Option<Usuario>> {
        let filtro = doc! { "email": email };
        self.coleccion.find_one(filtro, None).await
    }

    /// Obtiene todos los usuarios que tengan un rol específico
    pub async fn listar_por_rol(&self, rol: &str) -> mongodb::error::Result<Vec<Usuario>> {
        let filtro = doc! { "roles": rol };
        
        // find() devuelve un Cursor asíncrono
        let mut cursor = self.coleccion.find(filtro, None).await?;
        let mut usuarios = Vec::new();

        // Iteramos sobre el stream del cursor usando TryStreamExt
        while let Some(usuario) = cursor.try_next().await? {
            usuarios.push(usuario);
        }

        Ok(usuarios)
    }
}
```

### Consideraciones de Rendimiento y Diseño

* **Elusión de `Option` en campos obligatorios:** A diferencia del ID (que puede no existir antes de la inserción), asegúrate de que los campos BSON obligatorios se correspondan con tipos concretos en Rust (`String`, `i32`). Si un documento en Mongo carece de ese campo, `serde` lanzará un error de deserialización, lo cual es preferible a tener un estado inconsistente silencioso.
* **Índices:** La gestión de índices (como hacer que el campo `email` sea único) puede hacerse mediante el método `create_index` de la colección, idealmente ejecutado durante la inicialización de la aplicación o en un script de migración, no en cada request HTTP.

## 22.2 Uso de Redis para caché y rate limiting (`redis-rs`)

Mientras que bases de datos como PostgreSQL o MongoDB son excelentes como fuentes de verdad persistentes, no siempre son la herramienta adecuada para datos efímeros, cálculos costosos que se repiten constantemente o contadores de alta concurrencia. Aquí es donde entra Redis, un almacén de estructura de datos en memoria ultrarrápido.

En el ecosistema de Rust, el crate estándar de facto para interactuar con esta tecnología es `redis` (comúnmente conocido por su repositorio, `redis-rs`).

### Dependencias y Configuración Asíncrona

Para utilizar Redis en nuestro backend asíncrono (sobre Tokio), necesitamos habilitar las características correspondientes en el crate. En tu archivo `Cargo.toml`:

```toml
[dependencies]
# Habilitamos la compatibilidad con Tokio para el uso asíncrono puro
redis = { version = "0.24", features = ["tokio-comp"] }
```

### Conexiones y Multiplexación

En lenguajes y frameworks síncronos, es común utilizar un pool de conexiones para Redis. Sin embargo, gracias a la naturaleza de Tokio y al diseño del protocolo de Redis, la forma idiomática de trabajar en Rust asíncrono es utilizar una **conexión multiplexada** (`MultiplexedConnection`).

Esta abstracción permite enviar múltiples comandos concurrentes a través de un único socket TCP subyacente de forma segura entre hilos, lo que significa que puedes clonar la conexión y compartirla fácilmente en el estado de tu framework web (como Axum o Actix) sin la sobrecarga de un pool tradicional.

```rust
use redis::{AsyncCommands, Client};
use std::error::Error;

pub async fn conectar_redis(uri: &str) -> Result<redis::aio::MultiplexedConnection, Box<dyn Error>> {
    // Inicializa el cliente
    let client = Client::open(uri)?;
    
    // Crea la conexión multiplexada asíncrona
    let mut conn = client.get_multiplexed_async_connection().await?;

    // Verificación simple
    let result: String = conn.set("ping", "pong").await?;
    println!("Conexión a Redis establecida. Test: {}", result);

    Ok(conn)
}
```

### Implementando un Sistema de Caché

El uso más común de Redis es aliviar la carga de la base de datos principal almacenando en caché respuestas costosas. El patrón habitual implica intentar leer de Redis primero; si no existe (un *cache miss*), calculamos o buscamos el dato, lo guardamos en Redis con un tiempo de expiración (TTL) y luego lo retornamos.

```rust
use redis::AsyncCommands;

/// Intenta obtener el perfil de usuario de la caché, o lo simula si no existe.
pub async fn obtener_perfil_usuario(
    conn: &mut redis::aio::MultiplexedConnection,
    usuario_id: u32,
) -> Result<String, redis::RedisError> {
    let cache_key = format!("user_profile:{}", usuario_id);

    // 1. Intentamos obtener el dato de la caché
    let cached_profile: Option<String> = conn.get(&cache_key).await?;

    if let Some(profile) = cached_profile {
        println!("Hit en caché para el usuario {}", usuario_id);
        return Ok(profile);
    }

    // 2. Simulamos una consulta lenta a PostgreSQL o MongoDB (Cache Miss)
    println!("Miss en caché. Consultando base de datos principal...");
    let db_profile = format!("{{ \"id\": {}, \"rol\": \"admin\" }}", usuario_id);

    // 3. Guardamos el resultado en Redis usando SETEX (Set with Expiration)
    // Almacenamos el perfil por 300 segundos (5 minutos)
    let _: () = conn.set_ex(&cache_key, &db_profile, 300).await?;

    Ok(db_profile)
}
```

### Rate Limiting (Limitación de Tasa)

Proteger nuestras APIs RESTful contra el abuso (como ataques de fuerza bruta o escrapeo excesivo) es vital. Redis es perfecto para implementar un patrón de **Fixed Window Rate Limiting** debido a su velocidad y a la atomicidad de sus operaciones.

El siguiente ejemplo demuestra cómo limitar a un usuario a un máximo de 5 peticiones por minuto de forma atómica:

```rust
use redis::AsyncCommands;

/// Verifica si una IP ha excedido el límite de peticiones.
/// Retorna `true` si la petición es permitida, `false` si debe ser bloqueada (429 Too Many Requests).
pub async fn verificar_rate_limit(
    conn: &mut redis::aio::MultiplexedConnection,
    ip_cliente: &str,
) -> Result<bool, redis::RedisError> {
    let limite_peticiones = 5;
    let ventana_tiempo_segundos = 60;
    
    let rate_limit_key = format!("rate_limit:{}", ip_cliente);

    // Incrementamos el contador atómicamente
    // Si la llave no existe, Redis la crea con valor 0 antes de incrementar a 1
    let peticiones_actuales: i32 = conn.incr(&rate_limit_key, 1).await?;

    // Si es la primera petición en esta ventana, establecemos la expiración de la llave
    if peticiones_actuales == 1 {
        let _: () = conn.expire(&rate_limit_key, ventana_tiempo_segundos as i64).await?;
    }

    // Evaluamos si superó el límite
    if peticiones_actuales > limite_peticiones {
        println!("Rate limit excedido para IP: {}", ip_cliente);
        return Ok(false);
    }

    Ok(true)
}
```

### Buenas prácticas a considerar

* **Uso de Pipelines:** Si necesitas ejecutar múltiples comandos en secuencia y no dependes del resultado del anterior para ejecutar el siguiente, utiliza `redis::pipe()`. Esto agrupa los comandos en una sola petición de red, reduciendo la latencia drásticamente.
* **Manejo de serialización:** Al igual que con MongoDB, te recomiendo serializar tus Structs de Rust a formato JSON (usando `serde_json`) antes de guardarlos en Redis como `String`. Esto mantiene la seguridad de tipos en tu aplicación.

## 22.3 Bases de datos columnares (Cassandra/ScyllaDB)

Cuando tu aplicación necesita manejar volúmenes masivos de datos con una altísima tasa de escritura, alta disponibilidad sin un único punto de fallo y escalabilidad horizontal transparente, las bases de datos relacionales convencionales y de documentos suelen quedarse cortas. Aquí es donde brillan las bases de datos de la familia *Wide-Column* (columnares amplias) como Apache Cassandra y su contraparte moderna ultrarrápida escrita en C++, ScyllaDB.

En el ecosistema de Rust, la forma moderna y estándar de interactuar con ambas tecnologías es a través del crate `scylla`, el driver oficial de ScyllaDB. Está escrito puramente en Rust, es asíncrono (basado en Tokio), y es totalmente compatible con clústeres de Cassandra, ofreciendo características avanzadas como enrutamiento consciente de la topología (Token-aware routing) de forma automática.

### Dependencias y Configuración

Para empezar, añadiremos el driver a nuestro `Cargo.toml`. También es muy común trabajar con UUIDs en este tipo de bases de datos, por lo que agregaremos el soporte correspondiente.

```toml
[dependencies]
scylla = "0.11" # Verifica la última versión en crates.io
tokio = { version = "1", features = ["full"] }
uuid = { version = "1.0", features = ["v4"] }
```

### Gestión de la Sesión (El Clúster)

A diferencia de PostgreSQL (donde gestionamos un pool de conexiones) o Redis (donde multiplexamos un socket), en Cassandra/ScyllaDB interactuamos con un clúster entero de nodos.

El objeto `scylla::Session` abstrae toda la complejidad de descubrir los nodos del clúster, mantener conexiones con cada uno de ellos y balancear la carga de nuestras consultas. Al igual que con el cliente de MongoDB, `Session` se puede clonar económicamente para compartirlo en el estado de nuestra aplicación web.

```rust
use scylla::{Session, SessionBuilder};
use std::error::Error;

pub async fn conectar_cluster(nodo_inicial: &str) -> Result<Session, Box<dyn Error>> {
    // SessionBuilder se encarga de contactar al nodo inicial y descubrir el resto del clúster
    let session: Session = SessionBuilder::new()
        .known_node(nodo_inicial)
        .build()
        .await?;

    println!("Conexión establecida con el clúster ScyllaDB/Cassandra.");
    Ok(session)
}
```

### Modelado de Datos: Macros y Tipado Estricto

Cassandra/ScyllaDB utilizan CQL (Cassandra Query Language), que es visualmente muy similar a SQL, pero con reglas de modelado radicalmente diferentes (el modelado está impulsado por las consultas, no por las relaciones).

El driver `scylla` nos provee la macro `FromRow` para mapear automáticamente las filas devueltas por CQL directamente a nuestras estructuras de Rust.

```rust
use scylla::macros::FromRow;
use uuid::Uuid;

// Representa una lectura de telemetría de un dispositivo IoT
#[derive(Debug, FromRow)]
pub struct LecturaIot {
    pub dispositivo_id: Uuid, // Partition Key
    pub timestamp: i64,       // Clustering Key
    pub temperatura: f32,
    pub humedad: f32,
}
```

### Prepared Statements: El Estándar de Rendimiento

Una de las reglas de oro al trabajar con ScyllaDB o Cassandra es utilizar **Prepared Statements** (Sentencias Preparadas) para cualquier consulta que se ejecute más de una vez. Al preparar una sentencia, el clúster la compila y la almacena en caché. El driver de Rust, además, optimiza el envío de datos calculando a qué nodo específico debe ir la petición basándose en la *Partition Key*.

Veamos cómo implementar un repositorio que prepara sus sentencias durante la inicialización para lograr el máximo rendimiento:

```rust
use scylla::{Session, prepared_statement::PreparedStatement};
use scylla::transport::errors::QueryError;
use uuid::Uuid;

pub struct IotRepository {
    session: Session,
    insert_stmt: PreparedStatement,
    select_stmt: PreparedStatement,
}

impl IotRepository {
    pub async fn new(session: Session) -> Result<Self, QueryError> {
        // Preparamos las sentencias una sola vez al arrancar la aplicación
        let insert_query = "INSERT INTO iot_keyspace.lecturas (dispositivo_id, timestamp, temperatura, humedad) VALUES (?, ?, ?, ?)";
        let insert_stmt = session.prepare(insert_query).await?;

        let select_query = "SELECT dispositivo_id, timestamp, temperatura, humedad FROM iot_keyspace.lecturas WHERE dispositivo_id = ?";
        let select_stmt = session.prepare(select_query).await?;

        Ok(Self {
            session,
            insert_stmt,
            select_stmt,
        })
    }

    /// Inserta una nueva lectura utilizando el statement preparado
    pub async fn registrar_lectura(&self, lectura: &LecturaIot) -> Result<(), QueryError> {
        // Pasamos los valores como una tupla. El driver los serializa eficientemente.
        self.session
            .execute(
                &self.insert_stmt,
                (lectura.dispositivo_id, lectura.timestamp, lectura.temperatura, lectura.humedad),
            )
            .await?;
            
        Ok(())
    }

    /// Consulta el historial de un dispositivo
    pub async fn obtener_historial(&self, dispositivo_id: Uuid) -> Result<Vec<LecturaIot>, QueryError> {
        let rows = self.session
            .execute(&self.select_stmt, (dispositivo_id,))
            .await?
            .rows_typed::<LecturaIot>()?; // Mapeo seguro en tiempo de ejecución
            
        // Extraemos los resultados tipados, ignorando los errores de mapeo individuales para este ejemplo
        let lecturas: Vec<LecturaIot> = rows.filter_map(Result::ok).collect();
        
        Ok(lecturas)
    }
}
```

### Puntos clave para Backend Developers

* **Iteradores Asíncronos para grandes volúmenes:** Si una consulta va a devolver millones de filas (aunque en CQL deberías evitar escaneos masivos), el método `.execute()` carga todo en memoria. Para datasets enormes, el driver provee `execute_iter()`, que pagina los resultados de forma transparente bajo el capó, permitiéndote procesar los datos como un `Stream` asíncrono.
* **Consistencia Sintonizable:** Cassandra y ScyllaDB te permiten elegir el nivel de consistencia (ej. `ONE`, `QUORUM`, `ALL`) por cada consulta. Puedes configurar esto en Rust modificando las opciones del `PreparedStatement` mediante `stmt.set_consistency(scylla::statement::Consistency::Quorum)`.

## 22.4 Almacenamiento Clave-Valor rápido (RocksDB, Sled)

Hasta ahora hemos explorado bases de datos que operan en un modelo cliente-servidor (PostgreSQL, MongoDB, Redis, ScyllaDB). Sin embargo, existen escenarios en el backend donde la latencia de red —incluso en *localhost*— es un cuello de botella inaceptable, o donde la arquitectura exige una base de datos **embebida** que viva dentro del mismo proceso que la aplicación.

Para casos como cachés locales ultrarrápidos, almacenamiento de estado en nodos distribuidos (muy común en blockchain) o motores de indexación personalizados, las bases de datos clave-valor embebidas son la solución ideal. En el ecosistema Rust, hay dos grandes protagonistas: **Sled** (puro Rust) y **RocksDB** (el estándar de la industria mediante FFI).

### Sled: El enfoque "Puro Rust"

[Sled](https://github.com/spacejam/sled) es un motor de base de datos embebido escrito 100% en Rust. Su principal ventaja es que compila sin dependencias externas ni cadenas de herramientas de C/C++, lo que simplifica enormemente el CI/CD y la compatibilidad multiplataforma. Utiliza una arquitectura *lock-free* y está diseñado de forma similar a un `BTreeMap` concurrente que persiste en disco.

**Dependencias:**

```toml
[dependencies]
sled = "0.34"
serde = { version = "1.0", features = ["derive"] }
bincode = "1.3" # Ideal para serialización binaria ultrarrápida
```

**Ejemplo práctico con Sled:**

Dado que los motores KV embebidos trabajan exclusivamente con arreglos de bytes (`&[u8]`), debemos serializar nuestras estructuras. Para esto, `bincode` es mucho más eficiente que JSON.

```rust
use serde::{Deserialize, Serialize};
use sled::Db;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct SesionUsuario {
    pub usuario_id: u32,
    pub token: String,
    pub expira_en: i64,
}

pub struct SesionStore {
    db: Db,
}

impl SesionStore {
    pub fn new(ruta_path: &str) -> Result<Self, sled::Error> {
        // Abre (o crea) la base de datos en el directorio especificado
        let db = sled::open(ruta_path)?;
        Ok(Self { db })
    }

    pub fn guardar_sesion(&self, sesion: &SesionUsuario) -> Result<(), Box<dyn Error>> {
        let clave = format!("sesion:{}", sesion.token);
        // Serializamos el struct a bytes con bincode
        let valor_bytes = bincode::serialize(sesion)?;
        
        // Insertamos en el árbol principal
        self.db.insert(clave.as_bytes(), valor_bytes)?;
        Ok(())
    }

    pub fn obtener_sesion(&self, token: &str) -> Result<Option<SesionUsuario>, Box<dyn Error>> {
        let clave = format!("sesion:{}", token);
        
        // sled retorna un Option<sled::IVec>
        if let Some(bytes) = self.db.get(clave.as_bytes())? {
            let sesion: SesionUsuario = bincode::deserialize(&bytes)?;
            Ok(Some(sesion))
        } else {
            Ok(None)
        }
    }
}
```

### RocksDB: El peso pesado de la industria

Creado originalmente por Facebook como un fork de LevelDB (Google), **RocksDB** es probablemente el motor de almacenamiento clave-valor más probado en producción del mundo. Está escrito en C++.

Para usarlo en Rust, empleamos el crate `rust-rocksdb`, que provee bindings seguros (FFI) sobre la librería en C++. La desventaja principal es que requiere `clang` y un compilador de C++ instalado en tu sistema y en tu pipeline de CI para poder compilar tu proyecto Rust.

**Dependencias:**

```toml
[dependencies]
rocksdb = "0.21"
```

**Ejemplo práctico con RocksDB:**

```rust
use rocksdb::{DB, Options};
use std::error::Error;

pub fn inicializar_rocksdb(ruta: &str) -> Result<DB, Box<dyn Error>> {
    let mut opts = Options::default();
    opts.create_if_missing(true);
    // RocksDB permite configuraciones de rendimiento muy granulares
    opts.set_max_open_files(1000);
    opts.increase_parallelism(4);

    let db = DB::open(&opts, ruta)?;
    Ok(db)
}

pub fn operar_rocksdb(db: &DB) -> Result<(), Box<dyn Error>> {
    // Inserción
    db.put(b"clave_config_1", b"valor_super_secreto")?;

    // Lectura
    match db.get(b"clave_config_1")? {
        Some(valor) => {
            let string_val = String::from_utf8(valor)?;
            println!("Valor recuperado: {}", string_val);
        }
        None => println!("Clave no encontrada"),
    }

    // Borrado
    db.delete(b"clave_config_1")?;

    Ok(())
}
```

### Integración con Tokio (Consideración de Arquitectura)

Es crucial entender que tanto Sled como RocksDB son **librerías síncronas**. Cuando llamas a `db.put()` o `db.get()`, estás realizando operaciones de I/O en disco (aunque ambas utilicen agresivamente la memoria RAM y el *Page Cache* del sistema operativo para minimizar el bloqueo).

Si estás construyendo una API altamente concurrente con Axum o Actix-Web (que corren sobre el reactor de Tokio), **operaciones síncronas pesadas pueden bloquear el hilo de ejecución (Thread Blocking)**.

**La Regla de Oro:**

* Para lecturas simples o escrituras pequeñas (que generalmente se resuelven en microsegundos desde la RAM), suele ser seguro llamarlas directamente en tu handler asíncrono.
* Si necesitas iterar sobre miles de claves (ej. `db.iter()`) o realizar escrituras masivas por lotes (*Batch writes*), debes encapsular esa llamada en `tokio::task::spawn_blocking` para no asfixiar el *runtime* asíncrono de Rust.

Con esto concluimos la "Parte V: Persistencia de Datos y Bases de Datos". Tienes un abanico completo desde SQL relacional, MongoDB, cachés en memoria con Redis, hasta soluciones embebidas de alta velocidad.
