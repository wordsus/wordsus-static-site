La persistencia es el pilar de cualquier aplicación de backend real. En Rust, la interacción con bases de datos ha evolucionado desde drivers síncronos heredados de C hasta ecosistemas asíncronos nativos de alto rendimiento. Este capítulo aborda la infraestructura crítica necesaria para hablar con PostgreSQL de forma eficiente. Exploraremos cómo gestionar **pools de conexiones** con `deadpool` y `bb8` para eliminar la latencia de apertura de sockets, el funcionamiento interno del driver **`tokio-postgres`**, la automatización de **migraciones** para versionar el esquema y, finalmente, el arte de ejecutar **SQL plano** para exprimir cada ciclo de CPU de nuestro servidor.

## 19.1 Pools de conexiones con `deadpool` o `bb8`

En el desarrollo de APIs de alto rendimiento (como las que construimos con Actix-Web o Axum en los capítulos anteriores), abrir una nueva conexión a la base de datos por cada petición HTTP es un antipatrón crítico. El proceso de establecer una conexión a una base de datos requiere resolver el DNS, realizar el *handshake* de TCP, negociar TLS y autenticar al usuario. Todo este *overhead* destruye la latencia de tu aplicación. 

La solución estándar es utilizar un **Connection Pool** (pool de conexiones). Un pool mantiene un conjunto de conexiones abiertas y listas para ser reutilizadas. Cuando una petición necesita hablar con la base de datos, "toma prestada" una conexión del pool y, al finalizar, la devuelve. 

En el ecosistema asíncrono de Rust, si estás trabajando directamente con drivers de bajo nivel como `tokio-postgres` (que veremos en la siguiente sección) en lugar de un ORM, tienes dos opciones principales y probadas en producción: **`deadpool`** y **`bb8`**.

### El enfoque de `deadpool`

`deadpool` es una biblioteca moderna de pooling diseñada desde cero para la asincronía. Utiliza el `Semaphore` nativo de `tokio` bajo el capó para gestionar la concurrencia, lo que la hace extremadamente rápida y ligera. No requiere hilos de fondo (*background threads*) para gestionar el ciclo de vida de las conexiones.

Para usar `deadpool` con PostgreSQL, necesitas añadir las siguientes dependencias a tu `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-postgres = "0.7"
deadpool-postgres = "0.12"
```

A continuación, un ejemplo de cómo configurar e instanciar un pool con `deadpool`:

```rust
use deadpool_postgres::{Config, ManagerConfig, RecyclingMethod, Runtime};
use tokio_postgres::NoTls;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Configuración del Pool
    let mut cfg = Config::new();
    cfg.host = Some("localhost".to_string());
    cfg.dbname = Some("mi_base_de_datos".to_string());
    cfg.user = Some("usuario".to_string());
    cfg.password = Some("contraseña_segura".to_string());
    
    // Configuración específica del manager
    cfg.manager = Some(ManagerConfig {
        // Fast determina que la conexión es válida haciendo un chequeo ligero
        recycling_method: RecyclingMethod::Fast,
    });

    // 2. Creación del Pool
    // Usamos NoTls para este ejemplo local, en producción usarías un conector TLS
    let pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)?;

    // 3. Tomar prestada una conexión (Client) del pool
    let client = pool.get().async_await?;

    // 4. Ejecutar una consulta simple
    let rows = client.query("SELECT 1 + 1 AS resultado", &[]).await?;
    let valor: i32 = rows[0].get("resultado");
    
    println!("El resultado es: {}", valor);

    // Al salir del scope, `client` se devuelve automáticamente al pool
    // gracias a la implementación del trait Drop.
    Ok(())
}
```

### El enfoque de `bb8`

`bb8` es otro gestor de pools asíncrono muy popular. Su diseño está fuertemente inspirado en `r2d2` (el estándar de facto para pools síncronos en Rust), pero adaptado para funcionar sobre el runtime de `tokio`. A diferencia de `deadpool`, `bb8` utiliza un proceso de fondo (*spawned task*) para comprobar el estado de salud de las conexiones y mantener el pool estable.

Para usar `bb8`, las dependencias serían:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-postgres = "0.7"
bb8 = "0.8"
bb8-postgres = "0.8"
```

El código para inicializar un pool con `bb8` tiene una ergonomía ligeramente diferente, basada en el patrón Builder:

```rust
use bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Configuración del Manager
    let connection_string = "host=localhost user=usuario password=contraseña_segura dbname=mi_base_de_datos";
    let manager = PostgresConnectionManager::new_from_stringlike(connection_string, NoTls)?;

    // 2. Creación del Pool
    let pool = Pool::builder()
        .max_size(15) // Definimos un tamaño máximo explícito
        .build(manager)
        .await?;

    // 3. Obtener la conexión
    let client = pool.get().await?;

    // 4. Ejecutar consulta
    let row = client.query_one("SELECT version()", &[]).await?;
    let version: &str = row.get(0);

    println!("Versión de PostgreSQL: {}", version);

    Ok(())
}
```

### Consideraciones de Diseño Nivel Senior

A la hora de llevar estos pools a producción, no basta con instanciarlos y ya está. Debes considerar:

1. **Tamaño del Pool (`max_size`):** Un error común es pensar que "más es mejor". Un pool demasiado grande saturará la memoria y la CPU de tu base de datos debido al cambio de contexto (context switching). Una regla general clásica, popularizada por el equipo de PostgreSQL (y herramientas como PgBouncer), es `((core_count * 2) + effective_spindle_count)`. Para la mayoría de las APIs web, un `max_size` de entre 10 y 20 por instancia de servidor backend es un excelente punto de partida.
2. **Métodos de Reciclaje:** Cuando una conexión se devuelve al pool, el gestor necesita saber si la conexión sigue viva o si ha sido corrompida (por ejemplo, por una transacción fallida o un timeout de red). `deadpool` permite configurar esto (`RecyclingMethod::Fast` vs `RecyclingMethod::Verified`). Validar exhaustivamente cada conexión antes de devolverla añade seguridad, pero inyecta latencia adicional (suele hacer un `SELECT 1` interno).
3. **Manejo del Estado:** En frameworks como Axum o Actix-Web (Capítulos 16 y 17), el objeto `Pool` completo es lo que debes inyectar en el estado compartido de la aplicación (`app_data` o `State`), **no** las conexiones individuales. El pool internamente utiliza `Arc` para gestionar las referencias de forma segura entre hilos.

Ambas librerías son excepcionales. Si tu proyecto prioriza un rendimiento bruto y un stack puramente basado en mecánicas modernas de Tokio, `deadpool` suele ser la opción recomendada. Si valoras una heurística robusta de mantenimiento de conexiones en segundo plano, `bb8` no te fallará. 

*(Nota: En el Capítulo 20 veremos cómo SQLx trae su propio gestor de pools de conexiones integrado, haciendo innecesario el uso de `deadpool` o `bb8` si optas por esa herramienta).*

## 19.2 Drivers asíncronos para PostgreSQL (`tokio-postgres`)

Si bien en el ecosistema de Rust existen varios drivers para interactuar con bases de datos, **`tokio-postgres`** se ha consolidado como la piedra angular para las comunicaciones asíncronas con PostgreSQL. Es una implementación nativa escrita 100% en Rust (no es un wrapper sobre `libpq` de C), diseñada desde cero para aprovechar al máximo el runtime asíncrono de Tokio. 

Incluso si planeas usar herramientas de más alto nivel como SQLx o un ORM como SeaORM (que exploraremos en los próximos capítulos), comprender cómo funciona `tokio-postgres` te dará la base técnica necesaria para depurar cuellos de botella y entender la arquitectura de tu acceso a datos.

### La dicotomía entre `Client` y `Connection`

El diseño de `tokio-postgres` es particular y brillante. Al establecer una conexión, la librería no te devuelve un único objeto, sino una tupla con dos elementos distintos: un `Client` y un `Connection`. 

Esta separación es fundamental para entender su modelo de concurrencia:
* **`Connection`**: Es un `Future` que representa el bucle de red real (el *socket* TCP/TLS). Se encarga de leer y escribir bytes en la red de forma ininterrumpida. **Debe ser ejecutado en una tarea de fondo (spawn)** para que pueda procesar el tráfico independientemente de tu lógica de negocio.
* **`Client`**: Es la interfaz de usuario. Es lo que clonas y utilizas en tus *handlers* HTTP para enviar consultas. El `Client` se comunica internamente con la `Connection` a través de canales (channels) de un solo productor y un solo consumidor, de forma extremadamente rápida.

Veamos cómo se establece una conexión cruda sin un pool:

```rust
use tokio_postgres::{NoTls, Error};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let connection_string = "host=localhost user=usuario password=secreta dbname=mi_db";

    // 1. Conectamos a la base de datos
    let (client, connection) = tokio_postgres::connect(connection_string, NoTls).await?;

    // 2. Fundamental: Desplegamos la conexión en una tarea independiente de Tokio
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Error fatal en la conexión de base de datos: {}", e);
        }
    });

    // 3. Ya podemos usar el Client para ejecutar consultas
    let rows = client.query("SELECT $1::TEXT", &[&"Hola, Postgres!"]).await?;
    let valor: &str = rows[0].get(0);
    
    println!("Respuesta: {}", valor);

    Ok(())
}
```

*Nota: En producción, reemplazarás `NoTls` por un conector como `postgres-native-tls` o `postgres-rustls` para cifrar el tráfico en tránsito.*

### Consultas, Parámetros y Prevención de Inyecciones SQL

`tokio-postgres` te obliga (por diseño) a utilizar sentencias preparadas (*Prepared Statements*) para enviar parámetros. Esto mitiga por completo los ataques de Inyección SQL. Nunca debes concatenar strings para armar una query.

Utilizamos los marcadores `$1`, `$2`, etc., y pasamos un slice de referencias a los valores:

```rust
// Inserción segura de datos
let insert_query = "INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING id";
let email = "rustacean@ejemplo.com";
let nombre = "Ferris";

// query_one es ideal cuando esperamos exactamente una fila de retorno
let row = client.query_one(insert_query, &[&nombre, &email]).await?;

let nuevo_id: i32 = row.get("id"); // Podemos extraer por nombre de columna
println!("Usuario creado con el ID: {}", nuevo_id);
```

### Transacciones y el trait `Drop`

El manejo de transacciones es robusto e idiomático. Al iniciar una transacción, obtienes un objeto `Transaction` que expone los mismos métodos que el `Client` (`query`, `execute`, etc.).

La característica de nivel Senior aquí es cómo interactúa con el sistema de *Ownership* de Rust: **Si el objeto `Transaction` sale de su ámbito (scope) y es destruido (dropped) sin que hayas llamado explícitamente a `.commit().await`, la transacción ejecutará automáticamente un `ROLLBACK`.**

Esto garantiza que nunca dejarás transacciones colgadas a la mitad si ocurre un error temprano (por ejemplo, si usas el operador `?` y la función retorna prematuramente).

```rust
// Iniciamos la transacción
let mut tx = client.transaction().await?;

// Ejecutamos operaciones DENTRO de la transacción
tx.execute(
    "UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2",
    &[&100.0f64, &1i32],
).await?;

tx.execute(
    "UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2",
    &[&100.0f64, &2i32],
).await?;

// Si no llamamos a esto, los cambios NUNCA se aplicarán
tx.commit().await?;
```

### Pipelining Automático (El superpoder oculto)

Una de las razones por las que `tokio-postgres` es tan rápido es su soporte nativo para **Pipelining**. 

En un driver tradicional, si envías tres consultas, el flujo es: `Enviar Q1 -> Esperar R1 -> Enviar Q2 -> Esperar R2 -> Enviar Q3 -> Esperar R3`. Esto es ineficiente debido a la latencia de la red.

En `tokio-postgres`, gracias a que el `Client` se comunica de forma asíncrona con el hilo de red (`Connection`), puedes enviar las tres consultas casi instantáneamente sin esperar. La `Connection` las empaquetará, las enviará en "tubo" (pipeline) al servidor PostgreSQL, y despachará las respuestas a medida que lleguen. Tú no tienes que configurar nada extra; ocurre automáticamente por debajo siempre que ejecutes múltiples *Futures* de consulta de forma concurrente (por ejemplo, usando `tokio::join!`).

## 19.3 Migraciones de esquemas (herramientas como `refinery` o `dbmate`)

El código de tu backend evoluciona, y tu base de datos debe evolucionar con él. Modificar la estructura de la base de datos manualmente ejecutando scripts SQL en producción es una receta para el desastre. Las **migraciones de esquema** resuelven este problema al tratar los cambios de la base de datos (creación de tablas, alteración de columnas, índices) como código versionado, secuencial e idéntico en todos los entornos.

Dado que en este capítulo estamos trabajando con drivers crudos como `tokio-postgres` (que no incluyen un sistema de migraciones por defecto, a diferencia de SQLx o Diesel), necesitamos delegar esta responsabilidad a herramientas especializadas. Tienes dos caminos principales arquitectónicamente hablando: usar una biblioteca nativa de Rust o apoyarte en una herramienta CLI agnóstica del lenguaje.

### El enfoque nativo: `refinery`

`refinery` es una de las librerías más populares en Rust para ejecutar migraciones. Su mayor ventaja es que permite **embeber los archivos SQL directamente en tu binario compilado** mediante macros. Esto significa que al desplegar tu aplicación, solo envías un único archivo ejecutable; no necesitas copiar carpetas con scripts SQL al servidor.

Para integrarlo con `tokio-postgres`, primero añadimos las dependencias en `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-postgres = "0.7"
refinery = { version = "0.8", features = ["tokio-postgres"] }
```

El flujo de trabajo consiste en crear una carpeta llamada `migrations` en la raíz de tu proyecto e incluir archivos versionados, por ejemplo: `V1__crear_tabla_usuarios.sql` y `V2__anadir_indice_email.sql`.

Así es como ejecutas estas migraciones automáticamente al iniciar tu servidor:

```rust
use tokio_postgres::NoTls;

// La macro busca la carpeta `migrations` en tiempo de compilación 
// y empaqueta los archivos SQL dentro del binario.
mod embedded {
    use refinery::embed_migrations;
    embed_migrations!("migrations");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let conn_str = "host=localhost user=usuario password=secreta dbname=mi_db";
    let (mut client, connection) = tokio_postgres::connect(conn_str, NoTls).await?;

    // Desplegamos la conexión en segundo plano (como vimos en la sección 19.2)
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Error de conexión: {}", e);
        }
    });

    println!("Ejecutando migraciones pendientes...");
    
    // Ejecutamos las migraciones embebidas usando el cliente de base de datos
    embedded::migrations::runner()
        .run_async(&mut client)
        .await?;

    println!("Migraciones aplicadas con éxito. Iniciando servidor web...");

    Ok(())
}
```

Al ejecutarse, `refinery` creará automáticamente una tabla interna en PostgreSQL (usualmente llamada `refinery_schema_history`) para llevar el registro de qué versiones ya han sido aplicadas y evitar repeticiones.

### El enfoque agnóstico: `dbmate` o `golang-migrate`

A nivel Senior o en equipos donde el backend se divide entre varios lenguajes, acoplar las migraciones al código de Rust no siempre es la mejor decisión arquitectónica. En estos casos, se prefieren herramientas CLI externas.

**`dbmate`** (o alternativas como Flyway, Liquibase o golang-migrate) te permite desacoplar completamente la evolución del esquema del código de tu aplicación. 

Las ventajas de este enfoque son:
* **Separación de responsabilidades:** La base de datos se gestiona en su propio repositorio o en un paso completamente separado de tu canalización CI/CD.
* **Independencia del driver:** Si mañana cambias `tokio-postgres` por SQLx, tus migraciones no necesitan reescribirse ni reconfigurarse.
* **Rollbacks más sencillos:** La mayoría de estas herramientas CLI manejan el concepto de migraciones *Up* (aplicar) y *Down* (revertir) de forma muy madura.

Con `dbmate`, la ejecución deja de estar en el archivo `main.rs` y pasa a ser un comando que ejecutas en tu terminal o en tu pipeline de GitHub Actions/GitLab CI antes de desplegar el nuevo binario de Rust:

```bash
# Creación de una migración
dbmate new crear_tabla_usuarios

# Aplicación de migraciones pendientes a la base de datos
DATABASE_URL="postgres://usuario:secreta@localhost:5432/mi_db?sslmode=disable" dbmate up
```

### Consideraciones de Diseño Nivel Senior

Independientemente de la herramienta que elijas, debes adoptar las siguientes prácticas al diseñar APIs robustas:

* **Evita romper la retrocompatibilidad:** Una migración nunca debe romper el código que actualmente está en producción. Si necesitas renombrar una columna, el proceso requiere múltiples despliegues (añadir nueva columna -> escribir en ambas -> mover lectura a la nueva -> borrar la vieja), garantizando que no haya tiempo de inactividad (*Zero-Downtime Deployments*).
* **Migraciones en el arranque vs. Init Containers:** Ejecutar migraciones en el `main.rs` (como en el ejemplo de `refinery`) está bien para monolitos pequeños. En arquitecturas modernas desplegadas en Kubernetes, la mejor práctica es ejecutar las migraciones mediante un *Init Container* que corre y termina antes de que los *pods* de tu aplicación Rust arranquen.
* **Control de concurrencia:** Si escalas tu aplicación a 5 instancias y todas intentan ejecutar migraciones embebidas al arrancar simultáneamente, puedes causar bloqueos de tabla. Herramientas maduras utilizan bloqueos transaccionales (*advisory locks* en PostgreSQL) para garantizar que solo una instancia aplique el cambio.

## 19.4 Ejecución de sentencias SQL planas

A medida que tu aplicación crece, las abstracciones genéricas a menudo se quedan cortas. Operaciones como las *Common Table Expressions* (CTEs), *Window Functions*, inserciones masivas (*Bulk Inserts*) complejas o consultas analíticas con `GROUPING SETS` requieren el poder puro de SQL. 

Como desarrollador Senior, debes saber cuándo abandonar un ORM y escribir SQL plano (raw SQL) para aprovechar las características específicas del motor de tu base de datos (en este caso, PostgreSQL). Con `tokio-postgres`, la ejecución de SQL plano es rápida y explícita, pero requiere que manejes manualmente el mapeo de tipos y la memoria.

### Extracción de datos y manejo de valores `NULL`

Cuando ejecutas una consulta con `.query()`, `tokio-postgres` devuelve un `Vec<Row>`. El método `.get()` de la estructura `Row` entrará en pánico (panic) si el tipo de Rust no coincide exactamente con el tipo de PostgreSQL, o si intentas extraer un valor `NULL` en un tipo no opcional.

Para escribir código robusto, debes usar el método `.try_get()` para manejar errores de mapeo dinámicamente, y envolver las columnas que permiten nulos en un `Option<T>`.

```rust
// Supongamos una tabla donde 'bio' y 'fecha_nacimiento' pueden ser NULL
let query = "SELECT id, email, bio FROM usuarios WHERE activo = $1";
let rows = client.query(query, &[&true]).await?;

for row in rows {
    let id: i32 = row.get("id");
    let email: String = row.get("email");
    
    // Las columnas que pueden ser NULL DEBEN mapearse a un Option
    let bio: Option<String> = row.get("bio");

    match bio {
        Some(texto) => println!("Usuario {} ({}): {}", id, email, texto),
        None => println!("Usuario {} ({}): Sin biografía", id, email),
    }
}
```

### Integración con tipos complejos (JSONB, UUID y Fechas)

PostgreSQL es famoso por sus tipos de datos avanzados. `tokio-postgres` no reinventa la rueda; en su lugar, ofrece integraciones opcionales (mediante *feature flags* en `Cargo.toml`) con las librerías estándar del ecosistema de Rust.

Para mapear estos tipos, debes habilitarlos en tus dependencias:

```toml
[dependencies]
tokio-postgres = { version = "0.7", features = ["with-chrono-0_4", "with-serde_json-1", "with-uuid-1"] }
chrono = "0.4"
serde_json = "1.0"
uuid = { version = "1.0", features = ["v4"] }
```

Una vez habilitados, el mapeo es transparente. Puedes pasar estructuras de Rust directamente como parámetros o recibirlas en los resultados:

```rust
use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

// ... dentro de tu función asíncrona ...

let user_id = Uuid::new_v4();
let metadata = serde_json::json!({
    "tema": "oscuro",
    "notificaciones_activas": true
});
let ahora: DateTime<Utc> = Utc::now();

// Insertando UUID, JSONB y TIMESTAMP WITH TIME ZONE
client.execute(
    "INSERT INTO configuraciones (id, config, creado_en) VALUES ($1, $2, $3)",
    &[&user_id, &metadata, &ahora]
).await?;
```

### Streaming de grandes volúmenes de datos (Evitando OOM)

Este es un concepto crítico para sistemas de alto rendimiento. Si ejecutas un `SELECT` que devuelve 10 millones de filas usando `client.query()`, `tokio-postgres` intentará cargar todos esos registros en un `Vec<Row>` en la memoria RAM de tu servidor (Heap). Esto provocará un *Out Of Memory* (OOM) y tu aplicación colapsará.

Para procesos batch o exportaciones masivas, debes usar el método **`.query_raw()`**. Este método no devuelve un Vector, sino un **`Stream`** asíncrono. Te permite procesar las filas una por una a medida que llegan por el socket TCP desde la base de datos, manteniendo un consumo de memoria bajo y constante (O(1)).

```rust
use futures_util::pin_mut; // Necesario para anclar el stream en memoria
use futures_util::stream::StreamExt; // Para usar el método .next()

// query_raw requiere un iterador exacto para los parámetros
let query = "SELECT id, transaccion_data FROM historial_pagos";
let stream = client.query_raw(query, std::iter::empty::<&i32>()).await?;

// Anclamos el stream para poder iterarlo de forma segura
pin_mut!(stream);

// Consumimos el stream fila por fila
while let Some(row_result) = stream.next().await {
    let row = row_result?; // Manejamos el error de red o parseo
    
    let id: i32 = row.get(0);
    // Procesar la fila, enviarla a un archivo CSV, 
    // o mandarla por un canal de Tokio a otro worker...
    println!("Procesando transacción: {}", id);
}
```

> **Nota arquitectónica:** Escribir SQL plano como hemos visto te da control absoluto, pero el compilador de Rust no sabe si tu sintaxis SQL es correcta ni si los tipos coinciden hasta el tiempo de ejecución. Si cambias el esquema de la base de datos, tu código en Rust compilará sin problemas, pero fallará en producción. Este es exactamente el problema que resolveremos en el siguiente capítulo.
