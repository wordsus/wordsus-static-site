El testing de integración moderno exige fidelidad sin sacrificar la velocidad. En el desarrollo backend con Rust, depender de *mocks* para simular bases de datos suele ocultar errores de compatibilidad y lógica SQL. El crate `testcontainers-rs` revoluciona este proceso permitiendo que tus pruebas gestionen programáticamente contenedores Docker reales.

A lo largo de este capítulo, exploraremos cómo integrar infraestructuras como PostgreSQL y Redis directamente en el ciclo de vida de `cargo test`. Aprenderás a orquestar servicios dependientes con aislamiento total y a optimizar el rendimiento en entornos de CI/CD, garantizando que tu código sea robusto, escalable y digno de producción.

## 26.1 Fundamentos del crate `testcontainers-rs`

En los capítulos anteriores exploramos cómo asegurar la calidad de nuestro código mediante pruebas unitarias y el uso de *mocks* (Capítulo 24). Sin embargo, cuando construimos aplicaciones de backend a nivel senior, depender exclusivamente de *mocks* para la capa de persistencia o integraciones externas crea un falso sentido de seguridad. Los *mocks* verifican que nuestro código se comunique como esperamos, pero no pueden garantizar que la base de datos real entienda nuestras consultas o que los esquemas coincidan.

Aquí es donde entra el testing de integración con infraestructura real. Históricamente, esto implicaba complejos *scripts* de bash para levantar bases de datos antes de ejecutar `cargo test`. Hoy, el estándar de la industria es **Testcontainers**.

El crate `testcontainers` (conocido en el ecosistema como `testcontainers-rs`) es una librería que permite instanciar, gestionar y destruir contenedores de Docker de forma programática directamente desde el código de tus pruebas en Rust.

### La filosofía de Testcontainers en Rust

Testcontainers se apoya en una premisa fundamental: **el entorno de pruebas debe ser efímero, reproducible y aislado**.

En el contexto de Rust, esta librería brilla de manera excepcional gracias al modelo de *Ownership* y el trait `Drop`. Cuando instancias un contenedor dentro de una función de prueba `#[test]` (o `#[tokio::test]`), la librería se comunica con el demonio de Docker (vía el socket local) para descargar la imagen y levantar el contenedor.

Lo verdaderamente poderoso ocurre al final de la prueba: sin importar si el test pasa exitosamente o entra en pánico (`panic!`), la variable que representa al contenedor sale de su ámbito (scope). Rust invoca automáticamente su método `Drop`, el cual envía la orden a Docker para detener y eliminar el contenedor instantáneamente. No quedan contenedores "zombies" consumiendo recursos en tu máquina ni en tus pipelines de CI/CD.

### Conceptos Centrales de la API

Antes de escribir código, es crucial entender las abstracciones principales que expone el crate:

1. **`Image`**: Es la definición estática de lo que queremos ejecutar. Contiene el nombre de la imagen (ej. `postgres`), la etiqueta (`15-alpine`), las variables de entorno necesarias y los puertos que expone el contenedor internamente.
2. **`Container` / `ContainerAsync`**: Es la instancia en tiempo de ejecución. Proporciona métodos para interactuar con el contenedor vivo, siendo el más importante la capacidad de consultar qué puerto aleatorio del *host* se ha mapeado al puerto interno del contenedor.
3. **`Wait Strategies` (Estrategias de espera)**: Que el demonio de Docker reporte que un contenedor está "en ejecución" no significa que el servicio interno (como una base de datos) esté listo para recibir conexiones. Las estrategias de espera pausan la ejecución del test hasta que se cumpla una condición (ej. que aparezca un log específico en la salida estándar o que un puerto esté abierto).

### Instalación y Configuración Inicial

Para comenzar a utilizar Testcontainers, debes añadirlo a las dependencias de desarrollo (`[dev-dependencies]`) en tu `Cargo.toml`. Dado que la mayor parte del ecosistema web en Rust (Axum, Actix) utiliza Tokio, utilizaremos la API asíncrona que viene por defecto en las versiones modernas del crate.

```toml
[dev-dependencies]
testcontainers = "0.23" # Verifica la versión más reciente
tokio = { version = "1.0", features = ["macros", "rt-multi-thread"] }
```

### Tu primer contenedor efímero: `GenericImage`

Aunque existen módulos preconfigurados para bases de datos populares (que veremos en la sección 26.2), la base de Testcontainers es `GenericImage`. Esta estructura te permite ejecutar literalmente cualquier imagen pública o privada de Docker.

A continuación, crearemos un test de integración que levanta un servidor Redis genérico para demostrar el ciclo de vida completo:

```rust
#[cfg(test)]
mod tests {
    use testcontainers::{core::WaitFor, runners::AsyncRunner, GenericImage};

    #[tokio::test]
    async fn test_ciclo_de_vida_contenedor_generico() {
        // 1. Definir la imagen y sus configuraciones
        let image = GenericImage::new("redis", "7.2.4-alpine")
            .with_exposed_port(6379)
            .with_wait_for(WaitFor::message_on_stdout("Ready to accept connections"));

        // 2. Iniciar el contenedor (se descarga la imagen si es necesario)
        let container = image.start().await.expect("Fallo al iniciar el contenedor Docker");

        // 3. Obtener el puerto dinámico asignado en el Host
        // Testcontainers mapea el puerto 6379 interno a un puerto aleatorio libre en tu máquina.
        // Esto evita colisiones cuando corres `cargo test` de forma paralela.
        let host_port = container.get_host_port_ipv4(6379).await.unwrap();
        
        println!("Redis está corriendo en localhost:{}", host_port);

        // 4. Aquí ejecutarías tu lógica de negocio real
        // let client = redis::Client::open(format!("redis://127.0.0.1:{}", host_port)).unwrap();
        // ... assertions ...

        // 5. El fin del bloque. `container` sale del ámbito (scope).
        // Rust llama al `Drop` del contenedor de forma automática, 
        // emitiendo un comando de limpieza al Docker daemon.
    }
}
```

### Análisis del patrón de puertos dinámicos

Si observas detenidamente el código anterior, notarás el uso de `get_host_port_ipv4`. Este es un concepto fundamental para escribir pruebas robustas a nivel senior.

Un error común en desarrolladores junior es forzar que el contenedor de pruebas se exponga en su puerto por defecto en el host (ej. `5432` para Postgres). El problema surge porque el comando `cargo test` en Rust ejecuta las pruebas en paralelo por defecto utilizando múltiples hilos. Si tienes cinco pruebas de integración intentando levantar Postgres simultáneamente en el puerto `5432`, cuatro de ellas fallarán por colisión de puertos.

`testcontainers-rs` resuelve esto dejando que Docker asigne puertos efímeros aleatorios del sistema operativo anfitrión. En nuestro código de prueba, simplemente le preguntamos a la instancia del contenedor qué puerto le tocó, y luego inyectamos esa URL dinámica en el cliente o *pool* de conexiones de nuestra aplicación. Esto garantiza una paralelización masiva y pruebas verdaderamente aisladas.

## 26.2 Configuración de bases de datos de prueba en Docker (Postgres, Redis)

En la sección anterior vimos cómo utilizar `GenericImage` para levantar cualquier contenedor. Aunque esta flexibilidad es excelente, definir manualmente los puertos, las credenciales por defecto y, sobre todo, las estrategias de espera (*wait strategies*) para cada servicio puede volverse repetitivo y propenso a errores.

Para resolver esto, el ecosistema nos ofrece el crate `testcontainers-modules`. Esta colección comunitaria provee imágenes preconfiguradas y fuertemente tipadas para los servicios más comunes del backend, garantizando que el contenedor solo se reporte como "listo" cuando la base de datos realmente puede aceptar conexiones.

Para utilizar estos módulos, debemos actualizar nuestras dependencias de desarrollo:

```toml
[dev-dependencies]
testcontainers = "0.23"
testcontainers-modules = { version = "0.3", features = ["postgres", "redis"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }
redis = { version = "0.24", features = ["tokio-comp"] }
tokio = { version = "1.0", features = ["macros", "rt-multi-thread"] }
```

### Integración con PostgreSQL

Cuando testeamos repositorios relacionales, necesitamos una base de datos real para verificar que nuestras sentencias SQL (especialmente las complejas con `JOIN`s o funciones específicas del motor) funcionen correctamente.

Veamos cómo levantar una instancia de PostgreSQL efímera, conectarla con `sqlx` (que estudiamos en el Capítulo 20) y ejecutar una migración antes de nuestra prueba:

```rust
#[cfg(test)]
mod tests {
    use testcontainers_modules::postgres::Postgres;
    use testcontainers::runners::AsyncRunner;
    use sqlx::PgPool;

    #[tokio::test]
    async fn test_repositorio_usuarios_postgres() {
        // 1. Iniciar el contenedor preconfigurado de Postgres.
        // Por defecto, crea el usuario "postgres", password "postgres" y db "postgres".
        let container = Postgres::default().start().await.expect("Fallo al iniciar Postgres");

        // 2. Obtener el puerto mapeado dinámicamente en el host
        let port = container.get_host_port_ipv4(5432).await.unwrap();
        
        // 3. Construir la cadena de conexión
        let db_url = format!("postgres://postgres:postgres@127.0.0.1:{}/postgres", port);

        // 4. Conectar nuestro pool de sqlx a la base de datos de prueba
        let pool = PgPool::connect(&db_url).await.expect("No se pudo conectar al pool");

        // 5. Ejecutar las migraciones (asumiendo que tienes una carpeta `migrations`)
        // sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // 6. Ejecutar la prueba real
        let row: (i64,) = sqlx::query_as("SELECT 1 + 1")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(row.0, 2);
        
        // Al finalizar, `container` sale de su ámbito y Docker lo destruye.
    }
}
```

**Nota para nivel Senior:** Nota que no tuvimos que definir un `WaitFor::message_on_stdout(...)`. El módulo `Postgres` encapsula la lógica exacta para saber cuándo el motor ha terminado su fase de inicialización (*initdb*) y está listo para recibir tráfico, eliminando problemas de *flakiness* (pruebas intermitentes) en tus pipelines de CI/CD.

### Integración con Redis

Para cachés temporales, *rate limiting* o gestión de sesiones (conceptos abordados en el Capítulo 22), Redis es el estándar de facto. El patrón de prueba es idéntico, demostrando la consistencia de la API de Testcontainers:

```rust
#[cfg(test)]
mod tests {
    use testcontainers_modules::redis::Redis;
    use testcontainers::runners::AsyncRunner;
    use redis::AsyncCommands;

    #[tokio::test]
    async fn test_cache_sesiones_redis() {
        // Iniciamos el módulo preconfigurado de Redis
        let container = Redis::default().start().await.expect("Fallo al iniciar Redis");
        let port = container.get_host_port_ipv4(6379).await.unwrap();
        
        let redis_url = format!("redis://127.0.0.1:{}", port);
        let client = redis::Client::open(redis_url).unwrap();
        let mut con = client.get_async_connection().await.unwrap();

        // Ejecutamos operaciones reales contra el contenedor efímero
        let _: () = con.set("usuario:100:sesion", "token_valido").await.unwrap();
        let token: String = con.get("usuario:100:sesion").await.unwrap();

        assert_eq!(token, "token_valido");
    }
}
```

### Abstracción de Entornos (Fixture Pattern)

A medida que tu suite de pruebas crezca, copiar y pegar la inicialización del contenedor y la creación del pool de conexiones en cada función `#[tokio::test]` violará el principio DRY (*Don't Repeat Yourself*).

En Rust, una práctica excelente a nivel de arquitectura de pruebas es crear una estructura auxiliar o *Fixture* que encapsule este estado:

```rust
pub struct TestApp {
    pub db_pool: PgPool,
    // Mantenemos la propiedad del contenedor para que no se elimine 
    // hasta que TestApp salga de ámbito.
    _db_container: testcontainers::ContainerAsync<Postgres>, 
}

impl TestApp {
    pub async fn new() -> Self {
        let container = Postgres::default().start().await.unwrap();
        let port = container.get_host_port_ipv4(5432).await.unwrap();
        let db_url = format!("postgres://postgres:postgres@127.0.0.1:{}/postgres", port);
        
        let db_pool = PgPool::connect(&db_url).await.unwrap();
        // sqlx::migrate!().run(&db_pool).await.unwrap();

        Self {
            db_pool,
            _db_container: container,
        }
    }
}
```

Con este patrón, tus pruebas de integración se vuelven extremadamente limpias y enfocadas únicamente en el comportamiento del dominio:

```rust
#[tokio::test]
async fn test_creacion_de_usuario() {
    let app = TestApp::new().await;
    
    // app.db_pool ya está conectado a una base de datos limpia, migrada y efímera.
    // ...
}
```

## 26.3 Aislamiento de tests en servicios dependientes

Las aplicaciones backend de nivel empresarial rara vez interactúan con una sola pieza de infraestructura. Un caso de uso típico, como el registro de un usuario, podría implicar insertar un registro en PostgreSQL, guardar un token de sesión temporal en Redis y emitir un evento a un broker como Apache Kafka.

Validar este flujo completo en una prueba de integración requiere que todos estos servicios estén disponibles simultáneamente. Sin embargo, el mayor reto no es instanciar los contenedores, sino **gestionar el estado y la concurrencia**.

Como mencionamos anteriormente, el comando `cargo test` ejecuta las pruebas en paralelo utilizando múltiples hilos. Si la "Prueba A" (que verifica la eliminación de un usuario) y la "Prueba B" (que verifica la actualización de ese mismo usuario) se ejecutan al mismo tiempo contra la *misma* base de datos, el resultado será intermitente y no determinista (*flaky tests*). Necesitamos aislamiento total.

Existen dos estrategias principales para lograr este aislamiento utilizando Testcontainers: el **Aislamiento Físico** (un contenedor por prueba) y el **Aislamiento Lógico** (esquemas dinámicos compartiendo un contenedor).

### Estrategia 1: Aislamiento Físico (Contenedores Múltiples por Prueba)

La forma más directa de garantizar que ninguna prueba interfiera con otra es instanciar un ecosistema completo y efímero para cada función `#[tokio::test]`.

Podemos evolucionar nuestra estructura `TestApp` (introducida en la sección 26.2) para que orqueste múltiples dependencias:

```rust
pub struct TestApp {
    pub db_pool: PgPool,
    pub redis_client: redis::Client,
    // Mantenemos el ownership para que el trait Drop limpie todo al final
    _pg_container: testcontainers::ContainerAsync<Postgres>,
    _redis_container: testcontainers::ContainerAsync<Redis>,
}

impl TestApp {
    pub async fn new() -> Self {
        // Lanzamos ambos contenedores de forma concurrente para ahorrar tiempo
        let (pg_node, redis_node) = tokio::join!(
            Postgres::default().start(),
            Redis::default().start()
        );

        let pg_container = pg_node.expect("Fallo en Postgres");
        let redis_container = redis_node.expect("Fallo en Redis");

        // Obtenemos los puertos efímeros
        let pg_port = pg_container.get_host_port_ipv4(5432).await.unwrap();
        let redis_port = redis_container.get_host_port_ipv4(6379).await.unwrap();

        let db_url = format!("postgres://postgres:postgres@127.0.0.1:{}/postgres", pg_port);
        let redis_url = format!("redis://127.0.0.1:{}", redis_port);

        let db_pool = PgPool::connect(&db_url).await.unwrap();
        let redis_client = redis::Client::open(redis_url).unwrap();

        Self {
            db_pool,
            redis_client,
            _pg_container: pg_container,
            _redis_container: redis_container,
        }
    }
}
```

**Ventajas:** Es a prueba de balas. El estado es 100% inmaculado en cada prueba.
**Desventajas:** Consumo masivo de recursos. Si tienes 100 pruebas de integración, `cargo test` intentará levantar 200 contenedores simultáneamente, lo que colapsará el demonio de Docker o agotará la memoria de tu entorno de Integración Continua (CI).

### Estrategia 2: Aislamiento Lógico (El enfoque Senior)

Para *codebases* grandes, instanciar contenedores físicos por cada prueba no es escalable. La solución de nivel senior consiste en levantar **un único contenedor de base de datos para toda la suite de pruebas**, pero crear un **aislamiento lógico** dentro de él.

En PostgreSQL, esto significa crear una base de datos única (generada con un UUID o un sufijo aleatorio) para cada prueba. En Redis, se puede lograr utilizando prefijos únicos en las claves o seleccionando diferentes índices de base de datos lógicos (`SELECT 1`, `SELECT 2`).

Para implementar este patrón en Rust, necesitamos compartir el contenedor maestro utilizando primitivas de sincronización asíncronas, como `tokio::sync::OnceCell` o crates de inicialización diferida (*lazy initialization*).

Veamos cómo se implementa este patrón avanzado para PostgreSQL:

```rust
use sqlx::{Connection, Executor, PgConnection, PgPool};
use testcontainers_modules::postgres::Postgres;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use tokio::sync::OnceCell;
use uuid::Uuid;

// Variable global estática para mantener el contenedor vivo durante toda la suite
static GLOBAL_DB_CONTAINER: OnceCell<ContainerAsync<Postgres>> = OnceCell::const_new();

async fn get_master_db_url() -> String {
    let container = GLOBAL_DB_CONTAINER.get_or_init(|| async {
        Postgres::default().start().await.expect("Fallo al iniciar el contenedor maestro")
    }).await;

    let port = container.get_host_port_ipv4(5432).await.unwrap();
    format!("postgres://postgres:postgres@127.0.0.1:{}", port)
}

pub struct IsolatedApp {
    pub db_pool: PgPool,
    db_name: String, // Guardamos el nombre para limpiar después (opcional)
}

impl IsolatedApp {
    pub async fn new() -> Self {
        let master_url = get_master_db_url().await;
        
        // 1. Generar un nombre de base de datos único para esta prueba
        let db_name = format!("test_db_{}", Uuid::new_v4().simple());
        
        // 2. Conectarse a la base de datos maestra por defecto ("postgres")
        let mut master_conn = PgConnection::connect(&format!("{}/postgres", master_url))
            .await
            .expect("No se pudo conectar a la base maestra");

        // 3. Crear la base de datos lógica aislada
        master_conn.execute(format!("CREATE DATABASE {}", db_name).as_str())
            .await
            .expect("Fallo al crear la DB aislada");

        // 4. Crear un Pool conectado específicamente a la nueva base de datos
        let isolated_url = format!("{}/{}", master_url, db_name);
        let db_pool = PgPool::connect(&isolated_url).await.unwrap();

        // 5. Correr migraciones en la base de datos aislada
        // sqlx::migrate!("./migrations").run(&db_pool).await.unwrap();

        Self { db_pool, db_name }
    }
}
```

En este escenario, cuando ejecutas `cargo test`:

1. La primera prueba que llame a `IsolatedApp::new()` iniciará el contenedor físico de Testcontainers.
2. Las pruebas subsiguientes reutilizarán el mismo contenedor que ya está en ejecución (gracias a `OnceCell`).
3. **Cada prueba crea su propia base de datos lógica en milisegundos**, ejecuta las migraciones y corre las aserciones sin pisarse con las demás.

Este enfoque reduce drásticamente los tiempos de ejecución y el consumo de CPU/Memoria, manteniendo un aislamiento perfecto. Es el estándar de oro para arquitecturas orientadas a microservicios que requieren testing riguroso de integración en Rust.

## 26.4 Optimización de tiempos de ejecución de Testcontainers en CI

Si has implementado el patrón de Aislamiento Lógico (descrito en la sección anterior), tu entorno local probablemente ejecute las pruebas a gran velocidad. Sin embargo, al hacer *push* de tu código y disparar tu pipeline de Integración Continua (CI) en plataformas como GitHub Actions o GitLab CI, es común enfrentarse a una dura realidad: las pruebas que tardaban segundos ahora tardan minutos.

Los *runners* de CI suelen tener recursos limitados (CPU y RAM restringidas) y, lo que es más crítico, discos con operaciones de entrada/salida (I/O) significativamente más lentas que el SSD NVMe de tu máquina local. Además, cada ejecución del pipeline parte de un entorno en blanco que debe descargar las imágenes de Docker desde cero.

Para mantener la agilidad en tu ciclo de desarrollo a nivel senior, debes aplicar optimizaciones específicas en la configuración de Testcontainers.

### 1. Deshabilitar la durabilidad del motor de base de datos

El mayor cuello de botella al levantar bases de datos relacionales en pruebas es la escritura en disco. Por defecto, motores como PostgreSQL priorizan la integridad de los datos, asegurándose de que cada transacción se escriba físicamente en el disco mediante llamadas al sistema como `fsync`.

En un entorno de pruebas efímero, **la integridad de los datos ante caídas eléctricas nos es completamente irrelevante**. Si el contenedor se apaga abruptamente, la prueba falla de todos modos. Podemos instruir a Postgres para que desactive estas garantías, lo que incrementa masivamente el rendimiento de las operaciones `INSERT` y `UPDATE` durante nuestros tests.

En `testcontainers-rs`, podemos inyectar comandos de configuración al inicializar la imagen:

```rust
use testcontainers::{runners::AsyncRunner, ImageExt};
use testcontainers_modules::postgres::Postgres;

pub async fn start_optimized_postgres() -> String {
    // Utilizamos ImageExt para sobreescribir el comando de inicio
    let optimized_image = Postgres::default()
        .with_cmd([
            "-c", "fsync=off", 
            "-c", "full_page_writes=off",
            "-c", "synchronous_commit=off"
        ]);

    let container = optimized_image.start().await.expect("Fallo al iniciar Postgres optimizado");
    let port = container.get_host_port_ipv4(5432).await.unwrap();
    
    format!("postgres://postgres:postgres@127.0.0.1:{}/postgres", port)
}
```

### 2. Ejecución en memoria mediante `tmpfs`

Además de apagar `fsync`, podemos evitar por completo que la base de datos toque el disco de la máquina host montando su directorio de datos directamente en la memoria RAM utilizando `tmpfs`.

Aunque en Rust requeriría configuraciones más avanzadas dependiendo de si usas `GenericImage` o módulos preconfigurados, el concepto consiste en mapear el volumen interno (por ejemplo, `/var/lib/postgresql/data`) a la RAM. Esto elimina la latencia de I/O del *runner* de CI, haciendo que las migraciones de `sqlx` o `diesel` se ejecuten casi instantáneamente.

### 3. Pre-descarga de imágenes en el Pipeline (Pre-pulling)

Por defecto, Testcontainers descarga la imagen de Docker en el momento en que se ejecuta `start()`. Si tienes tu suite de pruebas configurada para usar múltiples hilos (el comportamiento por defecto de `cargo test`), varios hilos podrían intentar invocar al demonio de Docker para descargar la imagen simultáneamente o quedarse bloqueados esperando.

Una técnica estándar en CI es descargar explícitamente las imágenes en un paso previo, aprovechando el ancho de banda del proveedor antes de compilar o correr Rust:

**Ejemplo en GitHub Actions (`.github/workflows/ci.yml`):**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # 1. Pre-descargar las imágenes exactas que usa Testcontainers en nuestro código
      - name: Pull Docker images
        run: |
          docker pull postgres:15-alpine
          docker pull redis:7.2.4-alpine
          
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        
      # 2. Ejecutar las pruebas. Testcontainers detectará que la imagen ya existe.
      - name: Run Integration Tests
        run: cargo test --test integration_tests
```

### 4. Ajuste de la concurrencia (`RUST_TEST_THREADS`)

Aunque la paralelización masiva es excelente en local, en un entorno de CI con 2 vCPUs, lanzar 20 pruebas de integración concurrentes que compiten por interactuar con el socket de Docker y los recursos del sistema puede causar "inanición" (*starvation*) y *timeouts* en las estrategias de espera de Testcontainers.

Si observas que tus pruebas fallan en CI con errores de conexión a la base de datos pero pasan en local, suele ser un problema de contención. Puedes limitar la cantidad de hilos que usa el *test runner* de Cargo mediante una variable de entorno en tu pipeline:

```bash
# Limita la concurrencia a un número sensato para tu runner de CI
RUST_TEST_THREADS=4 cargo test
```

### 5. Reutilización global en arquitecturas complejas

Si tu proyecto contiene múltiples *crates* en un espacio de trabajo (*Cargo Workspace*), ejecutar `cargo test` compilará y ejecutará las pruebas de cada crate de forma secuencial. Si tres crates diferentes dependen de Postgres, Testcontainers levantará y destruirá el contenedor tres veces.

Para optimizar esto a nivel arquitectónico, los equipos senior suelen consolidar todas las pruebas de integración que dependen de infraestructura en un único crate (por ejemplo, `tests/` o un crate dedicado `integration-tests`). De esta manera, el patrón de Aislamiento Lógico con un único contenedor global (que vimos en la sección 26.3) se inicializa estrictamente **una sola vez** para todo el proyecto, reduciendo los tiempos de CI en un 60-80%.
