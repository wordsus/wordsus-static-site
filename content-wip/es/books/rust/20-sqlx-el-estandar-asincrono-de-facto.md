SQLx redefine la interacción con bases de datos en Rust al priorizar la seguridad y el rendimiento asíncrono sin el peso de un ORM tradicional. A diferencia de otros drivers, su característica distintiva es la verificación de consultas en tiempo de compilación: el compilador se comunica con tu base de datos para validar sintaxis y tipos antes de generar el binario. En este capítulo, exploraremos cómo utilizar sus macros para garantizar que un error tipográfico nunca llegue a producción, cómo mapear resultados a structs de forma eficiente y cómo gestionar transacciones y migraciones integradas para construir servicios backend robustos, escalables y tipados de extremo a extremo.

## 20.1 Consultas comprobadas en tiempo de compilación (`query!`)

Uno de los mayores dolores de cabeza en el desarrollo backend tradicional es descubrir que una consulta SQL tiene un error de sintaxis, o que el nombre de una columna ha cambiado, **en tiempo de ejecución**. Esto suele requerir escribir extensos tests de integración solo para validar que las consultas no provoquen un *panic* en producción. 

SQLx cambia este paradigma radicalmente introduciendo las **consultas comprobadas en tiempo de compilación** mediante sus macros, siendo `query!` la más fundamental. Esta característica es, sin duda, el "superpoder" principal que hace que SQLx sea el estándar de facto en el ecosistema asíncrono de Rust.

### ¿Cómo funciona la magia bajo el capó?

A diferencia de los clientes SQL tradicionales que envían un *string* de texto a la base de datos durante la ejecución, la macro `query!` es una **macro procedural** (como vimos en el Capítulo 10) que se ejecuta mientras ejecutas `cargo check` o `cargo build`. 

Su funcionamiento se divide en los siguientes pasos:

1. El compilador de Rust lee la cadena SQL dentro de la macro `query!`.
2. SQLx lee la variable de entorno `DATABASE_URL` (generalmente desde un archivo `.env`).
3. La macro abre una conexión real con la base de datos configurada.
4. Se utiliza la funcionalidad de *Prepared Statements* (sentencias preparadas) del motor de base de datos (por ejemplo, `PREPARE` en PostgreSQL) para validar la sintaxis.
5. SQLx interroga a la base de datos sobre los tipos de datos exactos que devolverá la consulta y los tipos que espera como parámetros.
6. Si la base de datos reporta un error (una tabla no existe, error tipográfico, tipo incorrecto), **la compilación falla**.

### Uso básico y seguridad de tipos

Veamos un ejemplo práctico. Supongamos que tenemos una tabla `users` con las columnas `id` (UUID), `email` (VARCHAR, no nulo) y `bio` (TEXT, nulable).

```rust
use sqlx::PgPool;

pub async fn find_user_email(pool: &PgPool, user_id: uuid::Uuid) -> Result<(), sqlx::Error> {
    // La macro query! valida la sintaxis y los tipos en tiempo de compilación
    let record = sqlx::query!(
        r#"
        SELECT email, bio 
        FROM users 
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(pool)
    .await?;

    // `record` es un struct anónimo generado por la macro
    println!("Email: {}", record.email); // Tipo: String
    
    // Como `bio` puede ser nulo en la BD, SQLx lo convierte automáticamente en Option<String>
    if let Some(bio) = record.bio {
        println!("Biografía: {}", bio);
    }

    Ok(())
}
```

**Lo que hace que esto sea brillante:**
* **Prevención de Inyección SQL:** Al usar `$1` (la sintaxis de bind parameters de Postgres), los parámetros se envían por separado de la consulta. Esto neutraliza las inyecciones SQL por diseño.
* **Mapeo de Nulos:** Dado que el compilador sabe que la columna `bio` admite valores nulos, te obliga a manejarlo como un `Option<String>`. No puedes acceder a `record.bio` como un simple `String` sin que el compilador te detenga (gracias a las reglas de tipos que vimos en el Capítulo 6).
* **Tipado estricto en parámetros:** Si intentas pasar un `String` en el parámetro `user_id` en lugar de un `Uuid`, el código simplemente no compilará.

### La experiencia del desarrollador (DX) ante errores

Si cometemos un error, por ejemplo, escribir mal el nombre de la columna (`emial` en lugar de `email`), la salida de `cargo check` será similar a esta:

```text
error: error returned from database: column "emial" does not exist
  --> src/repository.rs:12:9
   |
12 |         SELECT emial, bio FROM users WHERE id = $1
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

El error de la base de datos se promueve directamente a un error del compilador de Rust, indicando la línea exacta.

### El Modo Offline (`sqlx prepare`): Salvando el CI/CD

Una pregunta que surge inmediatamente al adoptar este patrón es: *"Si necesito una base de datos para compilar, ¿cómo hago que mi pipeline de CI/CD funcione en GitHub Actions o GitLab CI sin levantar una base de datos completa?"*

SQLx resuelve este problema arquitectónico con su **Modo Offline**.

Mediante la CLI de SQLx (`cargo install sqlx-cli`), puedes ejecutar:

```bash
cargo sqlx prepare
```

Este comando se conecta a tu base de datos de desarrollo local, extrae toda la metadata de las consultas de tu proyecto y genera un archivo llamado `sqlx-data.json` en la raíz de tu proyecto. 

Debes hacer *commit* de este archivo a tu repositorio de control de versiones. Posteriormente, en tu entorno de CI o en un entorno de producción donde `DATABASE_URL` no esté disponible durante el *build*, puedes forzar a SQLx a leer este archivo activando la característica de compilación offline:

```bash
SQLX_OFFLINE=true cargo build --release
```

De este modo, obtienes lo mejor de ambos mundos: validación estricta contra una base de datos real durante el desarrollo local, y compilaciones deterministas y aisladas en tus pipelines de despliegue.

> **Nota arquitectónica:** La macro `query!` devuelve un registro (record) anónimo. Aunque esto es útil para scripts rápidos o consultas simples, en aplicaciones de nivel empresarial basadas en Arquitectura Limpia (que abordaremos en el Capítulo 29), normalmente queremos devolver Structs de dominio fuertemente tipados. Para solucionar esto, SQLx nos provee la familia de macros `query_as!`, que exploraremos en la siguiente sección.

## 20.2 Mapeo de resultados a Structs de Rust

En la sección anterior vimos cómo `query!` nos protege de errores en tiempo de ejecución validando la sintaxis y los tipos de nuestras consultas. Sin embargo, su comportamiento por defecto es devolver un registro anónimo (un *struct* generado al vuelo por la macro). 

Si bien esto es útil para prototipos rápidos, en aplicaciones robustas —especialmente aquellas que siguen principios de Arquitectura Limpia o Domain-Driven Design (que abordaremos en los Capítulos 29 y 31)— necesitamos que nuestra capa de persistencia devuelva **estructuras de dominio fuertemente tipadas**. 

Para resolver esta necesidad, SQLx nos ofrece la macro `query_as!` y el trait `FromRow`.

### El Trait `FromRow` y la macro `query_as!`

La forma idiomática de mapear resultados en SQLx es definir un `struct` en Rust que represente la fila que esperamos recibir y utilizar la macro `query_as!`. Esta macro toma como primer argumento el tipo de dato al que queremos mapear el resultado, seguido de la consulta SQL y los parámetros.

Veamos cómo transformar el ejemplo de la sección anterior para que devuelva un `struct` concreto:

```rust
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

// 1. Definimos nuestro modelo de datos.
// Opcionalmente derivamos FromRow si planeamos usar consultas dinámicas (sin la macro !).
#[derive(Debug, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub bio: Option<String>,
}

pub async fn find_user_by_id(pool: &PgPool, user_id: Uuid) -> Result<User, sqlx::Error> {
    // 2. Usamos query_as! indicando el tipo 'User'
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT id, email, bio 
        FROM users 
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(pool)
    .await?;

    Ok(user)
}
```

### Validaciones estrictas del compilador

La verdadera magia de `query_as!` radica en su nivel de exigencia. Durante la compilación, SQLx verificará tres cosas fundamentales:

1. **La consulta SQL es válida** (igual que `query!`).
2. **Las columnas devueltas coinciden exactamente con los nombres de los campos del `struct`.** Si tu consulta devuelve `SELECT id, email FROM users`, pero tu `struct` `User` espera un campo `bio`, el código no compilará.
3. **Los tipos de datos de la base de datos son compatibles con los tipos de Rust.** Si `bio` es *nulable* en la base de datos, el campo en Rust **debe** ser un `Option`.

### Resolviendo discrepancias de nombres (Renaming y Aliasing)

En el mundo real, es común que los nombres de las columnas en la base de datos no coincidan perfectamente con los nombres de los campos en Rust, ya sea por convenciones de la empresa o por el uso de palabras reservadas (por ejemplo, una columna llamada `type`).

Tienes dos formas de manejar esto:

**1. Usando alias en SQL (La forma recomendada con `query_as!`):**
Dado que la macro analiza la consulta enviada, puedes simplemente usar la cláusula `AS` de SQL para que el nombre de la columna coincida con el del campo en Rust. Ojo, si el nombre en Rust usa una palabra reservada (como `type`), usarás la sintaxis de identificador crudo de Rust (`r#type`).

```rust
let query = sqlx::query_as!(
    Device,
    r#"
    SELECT id, device_type AS "r#type"
    FROM devices
    "#
);
```

**2. Usando atributos en el Struct (Para consultas dinámicas):**
Si decides no usar la comprobación en tiempo de compilación (usando la función `sqlx::query_as` en lugar de la macro `query_as!`), puedes indicarle a SQLx cómo mapear los campos a través de macros de atributo en el `struct`:

```rust
#[derive(FromRow)]
pub struct Account {
    pub id: i32,
    #[sqlx(rename = "account_status")]
    pub status: String,
    // Ignora este campo al mapear desde la BD
    #[sqlx(default)] 
    pub transient_data: bool, 
}
```

### Structs anidados y el atributo `flatten`

Cuando tienes tablas con muchas columnas o realizas uniones (`JOIN`), puede ser tedioso tener un `struct` gigante. SQLx permite anidar estructuras utilizando el atributo `#[sqlx(flatten)]` cuando usas el trait `FromRow`. Esto le dice a SQLx que extraiga las columnas del mismo nivel de la consulta y las asigne a los campos del `struct` interno, facilitando la composición de tus modelos.

## 20.3 Manejo de transacciones y deadlocks

En el desarrollo de sistemas backend empresariales, la consistencia de los datos no es negociable. Cuando una operación lógica requiere modificar múltiples tablas, necesitamos garantizar que todas las modificaciones se apliquen con éxito (Commit) o que ninguna lo haga (Rollback), cumpliendo con el principio de Atomicidad (la "A" de ACID).

SQLx aprovecha magistralmente el sistema de tipos y el ciclo de vida de Rust (Ownership y el trait `Drop`) para hacer que el manejo de transacciones sea seguro y ergonómico, minimizando el riesgo de dejar conexiones en estados inconsistentes.

### Iniciando y confirmando transacciones

Para iniciar una transacción en SQLx, llamamos al método `.begin()` sobre nuestro Pool de conexiones. Esto nos devuelve un objeto `Transaction`, el cual debe ser pasado como referencia mutable a nuestras consultas en lugar del Pool.

Veamos un ejemplo clásico: transferir fondos entre dos cuentas bancarias.

```rust
use sqlx::PgPool;

pub async fn transfer_funds(
    pool: &PgPool,
    from_account: i32,
    to_account: i32,
    amount: f64,
) -> Result<(), sqlx::Error> {
    // 1. Iniciamos la transacción
    let mut tx = pool.begin().await?;

    // 2. Restamos el saldo de la cuenta de origen
    // Nota el uso de `&mut *tx` para pasar la referencia mutable de la transacción
    sqlx::query!(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        amount,
        from_account
    )
    .execute(&mut *tx)
    .await?;

    // 3. Sumamos el saldo a la cuenta de destino
    sqlx::query!(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        amount,
        to_account
    )
    .execute(&mut *tx)
    .await?;

    // 4. Confirmamos la transacción
    tx.commit().await?;

    Ok(())
}
```

### El "Superpoder" del Rollback Automático en Rust

¿Qué ocurre si la segunda consulta (`to_account`) falla debido a un error de red o porque la cuenta no existe? El operador `?` retornará el error inmediatamente, saliendo de la función. 

En muchos lenguajes, esto podría dejar una transacción "colgada" o requeriría un bloque `try/catch/finally` explícito para hacer el `rollback()`. En Rust, gracias al patrón RAII (*Resource Acquisition Is Initialization*) y al trait `Drop`, **si el objeto `tx` sale de su ámbito (scope) sin que se haya llamado a `.commit()`, SQLx ejecuta un `ROLLBACK` automáticamente de fondo.** Esto elimina por completo una categoría entera de bugs relacionados con fugas de conexiones y bloqueos fantasmas en la base de datos.

### Entendiendo y mitigando los Deadlocks

En un entorno altamente concurrente como el que provee el runtime asíncrono de Tokio, es probable que múltiples hilos intenten modificar los mismos registros simultáneamente. Un *deadlock* (abrazo mortal) ocurre cuando dos transacciones se bloquean mutuamente esperando que la otra libere un recurso.

Por ejemplo:
* La Transacción A bloquea la Fila 1 y necesita la Fila 2.
* La Transacción B bloquea la Fila 2 y necesita la Fila 1.
* Ambas esperan infinitamente. El motor de base de datos (como PostgreSQL) detectará esto y cancelará una de las transacciones, devolviendo un error de deadlock.

Para manejar esto a nivel Senior en Rust, debes aplicar las siguientes estrategias:

1. **Ordenamiento consistente:** Siempre accede y modifica las tablas y filas en el mismo orden estricto en toda tu aplicación. Si siempre bloqueas la Fila 1 antes que la Fila 2, el deadlock anterior es imposible por diseño.
2. **Mantén las transacciones ultracortas:** No realices llamadas I/O (como peticiones HTTP a otros microservicios o lecturas pesadas de disco) **dentro** de una transacción de base de datos abierta. Prepara todos los datos en memoria antes de hacer el `pool.begin()`.
3. **Implementa lógica de reintentos (Retries):** Dado que el motor cancelará una transacción en caso de deadlock, tu backend debe estar preparado para interceptar ese error específico y reintentar la operación.

```rust
use std::time::Duration;
use sqlx::postgres::PgDatabaseError;

// Ejemplo simplificado de lógica de reintento
pub async fn execute_with_retry() -> Result<(), sqlx::Error> {
    let max_retries = 3;
    
    for attempt in 1..=max_retries {
        match try_complex_transaction().await {
            Ok(_) => return Ok(()),
            Err(sqlx::Error::Database(err)) => {
                // Verificamos si es un error de PostgreSQL (Código 40P01 es Deadlock)
                if let Some(pg_err) = err.downcast_ref::<PgDatabaseError>() {
                    if pg_err.code() == "40P01" && attempt < max_retries {
                        // Esperamos un tiempo aleatorio/exponencial antes de reintentar
                        tokio::time::sleep(Duration::from_millis(100 * attempt)).await;
                        continue;
                    }
                }
                return Err(sqlx::Error::Database(err));
            }
            Err(e) => return Err(e),
        }
    }
    Ok(())
}
```

Implementar esta resiliencia distingue a una API frágil de una preparada para alta disponibilidad bajo estrés.

## 20.4 Integración nativa de migraciones en SQLx

El esquema de una base de datos nunca es estático; evoluciona a medida que crecen los requerimientos del negocio. Para gestionar estos cambios de forma predecible y reproducible, utilizamos **migraciones**. 

Históricamente, en arquitecturas backend, la ejecución de migraciones en producción requería dependencias externas (como Flyway, Liquibase) o contenedores de *init* en Kubernetes que ejecutaran un script antes de levantar la aplicación principal. SQLx elimina esta complejidad operativa mediante una característica brillante: **la incrustación de migraciones directamente en el binario compilado**.

### Creando migraciones con la CLI

A diferencia de los ORMs tradicionales que generan el código de migración a partir de tus modelos, SQLx confía en que, como desarrollador backend, sabes escribir SQL. Las migraciones en SQLx son simplemente archivos `.sql` puros.

Usando la CLI de SQLx (`cargo install sqlx-cli`), puedes generar una nueva migración fácilmente:

```bash
sqlx migrate add create_users_table
```

Esto generará un archivo con una marca de tiempo en la carpeta `migrations/` en la raíz de tu proyecto, por ejemplo: `20231024103000_create_users_table.sql`. Dentro de este archivo, escribirás tu DDL (Data Definition Language) nativo, aprovechando al máximo las características específicas de tu motor de base de datos (PostgreSQL, MySQL, SQLite).

### La macro `migrate!` y despliegues de un solo binario

Aquí es donde entra el "superpoder" de despliegue de SQLx. A través de la macro `sqlx::migrate!()`, el compilador de Rust lee el contenido de tu directorio `migrations/` **durante la compilación** y lo incrusta como cadenas de texto estáticas dentro de tu ejecutable final.

Esto significa que no necesitas copiar la carpeta `migrations/` a tu imagen de Docker de producción. Tu aplicación lleva consigo todo lo necesario para inicializar o actualizar la base de datos.

Veamos cómo se integra esto en el punto de entrada de tu aplicación (`main.rs`):

```rust
use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL debe estar configurada");

    // 1. Inicializamos el Pool de conexiones
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // 2. Ejecutamos las migraciones embebidas antes de aceptar tráfico
    println!("Verificando y aplicando migraciones...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;
    println!("Migraciones al día.");

    // 3. (Opcional) Aquí iniciarías tu servidor HTTP (Axum, Actix, etc.)
    // let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    // axum::serve(listener, app).await?;

    Ok(())
}
```

### Ventajas arquitectónicas de este enfoque

Adoptar la ejecución de migraciones en el arranque de la aplicación ofrece beneficios inmediatos para la fiabilidad de tu sistema:

1. **Sincronización Código-Base de Datos:** Garantiza matemáticamente que la versión del código que se está ejecutando concuerda con la versión del esquema de la base de datos. Si la migración falla, el servidor hace *panic* y no se levanta, evitando que la aplicación opere sobre un esquema incorrecto y corrompa datos.
2. **Despliegues "Zero-Dependency":** Reduces la superficie de ataque y el tamaño de tu contenedor Docker. Entregas un único binario compilado estáticamente (por ejemplo, usando *musl*) que hace todo el trabajo.
3. **Control de concurrencia nativo:** SQLx es lo suficientemente inteligente como para bloquear la tabla de migraciones. Si escalas tu aplicación y levantas 5 réplicas simultáneamente en Kubernetes, solo una ejecutará la migración; las otras 4 esperarán a que termine, evitando condiciones de carrera.

### Consideraciones para entornos Senior

Aunque ejecutar migraciones en el arranque es excelente, en sistemas de altísima disponibilidad (donde no puedes permitirte ni un segundo de *downtime* y usas despliegues *Blue/Green*), debes tener cuidado con **migraciones destructivas** (como borrar una columna o cambiar su tipo). 

En esos escenarios, la regla de oro, independientemente de la herramienta que uses, es realizar los cambios en fases compatibles hacia atrás:
1. Añadir la nueva columna.
2. Desplegar el código que escribe en ambas.
3. Desplegar el código que lee de la nueva.
4. Borrar la columna vieja en una migración futura.

Con esta sección, hemos completado el **Capítulo 20: SQLx (El Estándar Asíncrono de Facto)**. Hemos visto cómo compilar consultas de forma segura, mapear datos a nuestras estructuras de dominio, manejar transacciones robustas y gestionar el ciclo de vida de la base de datos con migraciones embebidas.
