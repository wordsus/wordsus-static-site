La robustez de Rust y su sistema de tipos ofrecen un terreno fértil para construir sistemas backend mantenibles, pero el lenguaje por sí solo no previene el caos arquitectónico. En este capítulo, aplicamos los principios **SOLID** para desacoplar las reglas de negocio de los detalles técnicos.

Exploraremos cómo modelar **Entidades** que protejan sus invariantes y **Casos de Uso** que orquesten la lógica sin conocer la base de datos o el framework web. Mediante la **Inversión de Dependencias** y el uso estratégico de **Traits**, aprenderás a construir aplicaciones "al estilo Rust" donde la infraestructura es intercambiable y el núcleo del dominio permanece inmutable ante cambios externos.

## 29.1 Principios SOLID aplicados a Rust

Los principios SOLID nacieron en el corazón de la Programación Orientada a Objetos (POO), acuñados por Robert C. Martin para resolver problemas de código espagueti, alta acoplación y fragilidad en sistemas empresariales.

Al llegar a Rust, un lenguaje que favorece la composición sobre la herencia y carece de "clases" en el sentido tradicional, es muy común que los desarrolladores se pregunten: *¿Siguen siendo válidos estos principios aquí?*

La respuesta es un rotundo **sí**. Aunque la mecánica de implementación cambia drásticamente, la filosofía subyacente —crear software mantenible, testable y flexible— es universal. En Rust, reemplazamos las jerarquías de herencia con **Traits** y **Tipos Genéricos**, lo que a menudo hace que aplicar SOLID sea más natural y seguro gracias al rigor del compilador.

A continuación, traduciremos la visión tradicional de SOLID al paradigma y las herramientas idiomáticas de Rust.

### S - Principio de Responsabilidad Única (Single Responsibility Principle)

> *Una estructura o módulo debe tener una, y solo una, razón para cambiar.*

En Rust, este principio se aplica a nivel de funciones, `structs` y módulos. Es una tentación común (especialmente al usar frameworks web) crear un `struct` masivo que gestione la validación de un request, la lógica de negocio y la persistencia en base de datos.

Para respetar el SRP, debemos dividir estas responsabilidades.

**Ejemplo de violación del SRP:**

```rust
struct OrderProcessor;

impl OrderProcessor {
    // Este método valida el pago, guarda en BD y envía un email.
    // Tiene TRES razones para cambiar.
    fn process_order(&self, order: Order) -> Result<(), String> {
        // 1. Lógica de pago
        println!("Cobrando a la tarjeta...");
        // 2. Lógica de persistencia
        println!("Guardando en base de datos...");
        // 3. Lógica de notificación
        println!("Enviando email al usuario...");
        Ok(())
    }
}
```

**Refactorización idiomática:**
En Rust, delegamos el comportamiento componiendo `structs` más pequeños.

```rust
struct PaymentGateway;
impl PaymentGateway {
    fn charge(&self, order: &Order) -> Result<(), String> { /* ... */ Ok(()) }
}

struct OrderRepository;
impl OrderRepository {
    fn save(&self, order: &Order) -> Result<(), String> { /* ... */ Ok(()) }
}

struct EmailSender;
impl EmailSender {
    fn send_confirmation(&self, order: &Order) -> Result<(), String> { /* ... */ Ok(()) }
}

// Ahora OrderProcessor coordina, pero no implementa los detalles.
struct OrderProcessor {
    payment: PaymentGateway,
    repo: OrderRepository,
    notifier: EmailSender,
}
```

*Nota: Este ejemplo usa dependencias concretas para ilustrar el SRP, pero pronto veremos cómo mejorarlo con el principio DIP.*

### O - Principio de Abierto/Cerrado (Open/Closed Principle)

> *Las entidades de software deben estar abiertas para su extensión, pero cerradas para su modificación.*

En lenguajes orientados a objetos, esto se logra mediante herencia o polimorfismo. En Rust, la herramienta principal para extender funcionalidad sin modificar el código original son los **Traits**.

Imagina que tienes una API que exporta reportes. Si usas un `enum` y un `match` masivo, cada vez que agregues un formato (por ejemplo, Excel), tendrás que modificar la función central.

**Aplicando OCP con Traits:**

```rust
trait ReportGenerator {
    fn generate(&self, data: &ReportData) -> String;
}

struct PdfReport;
impl ReportGenerator for PdfReport {
    fn generate(&self, data: &ReportData) -> String {
        "Generando binario PDF...".to_string()
    }
}

struct HtmlReport;
impl ReportGenerator for HtmlReport {
    fn generate(&self, data: &ReportData) -> String {
        "Generando etiquetas HTML...".to_string()
    }
}

// Esta función está CERRADA a modificación. Nunca tendrás que tocarla
// para añadir nuevos formatos, solo implementas el Trait en un nuevo struct.
fn export_report(generator: &impl ReportGenerator, data: &ReportData) {
    let result = generator.generate(data);
    println!("Reporte exportado: {}", result);
}
```

### L - Principio de Sustitución de Liskov (Liskov Substitution Principle)

> *Los objetos de un programa deberían ser reemplazables por instancias de sus subtipos sin alterar el correcto funcionamiento del programa.*

Como Rust no tiene herencia, no podemos "sobrescribir" métodos de una clase base. Aquí, LSP se traduce en **el cumplimiento estricto de los contratos definidos por los Traits**.

Si una función requiere un `T: DatabaseConnection`, espera que cualquier tipo que cumpla ese Trait se comporte lógicamente como una base de datos. El compilador de Rust garantiza la firma (tipos de entrada y salida), pero **tú eres responsable de la semántica**.

**Violación semántica de LSP:**
Si tienes un `trait Cache { fn get(&self, key: &str) -> Option<String>; }`, y creas una implementación `DummyCache` para un test que, en lugar de retornar `None` cuando algo no existe, hace un `panic!()`, estás violando LSP. Estás alterando la expectativa del consumidor, que esperaba un manejo seguro con `Option`.

En Rust, el sistema de tipos fuerte (`Result`, `Option`) ya nos empuja fuertemente hacia el cumplimiento de LSP al obligarnos a ser explícitos sobre los fallos.

### I - Principio de Segregación de Interfaces (Interface Segregation Principle)

> *Ningún cliente debería verse forzado a depender de métodos que no utiliza.*

En el contexto de Rust, esto significa: **Crea Traits pequeños y enfocados en lugar de "God Traits" (Traits monolíticos).** La *Standard Library* de Rust es un excelente ejemplo de este principio. No existe un trait `FileOperations` que agrupe lectura, escritura y búsqueda. En su lugar, tenemos `std::io::Read`, `std::io::Write` y `std::io::Seek`.

**Violación del ISP:**

```rust
trait Worker {
    fn work(&self);
    fn eat(&self);
}

struct Robot;
impl Worker for Robot {
    fn work(&self) { println!("Ensamblando piezas..."); }
    // Un robot se ve forzado a implementar un método que no necesita.
    fn eat(&self) { unreachable!("Los robots no comen"); } 
}
```

**Refactorización idiomática:**

```rust
trait Workable { fn work(&self); }
trait Feedable { fn eat(&self); }

struct Human;
impl Workable for Human { /* ... */ }
impl Feedable for Human { /* ... */ }

struct Robot;
impl Workable for Robot { /* ... */ }
// Robot ya no se ve contaminado por comportamientos irrelevantes.
```

### D - Principio de Inversión de Dependencias (Dependency Inversion Principle)

> *1. Los módulos de alto nivel no deberían depender de módulos de bajo nivel. Ambos deberían depender de abstracciones.* > *2. Las abstracciones no deberían depender de los detalles. Los detalles deberían depender de las abstracciones.*

Este es, con diferencia, **el principio más crítico para la Arquitectura Limpia** que desarrollaremos en este capítulo. Si el dominio de tu aplicación (alto nivel) depende directamente de `sqlx::PgPool` (bajo nivel), estás acoplado a PostgreSQL.

En Rust, invertimos las dependencias inyectando **Traits** en lugar de `structs` concretos.

```rust
// 1. La abstracción (El Puerto / Interfaz)
// Pertenece a la capa de dominio/casos de uso.
trait UserRepository {
    fn get_user(&self, id: i32) -> Result<User, String>;
}

// 2. El módulo de alto nivel
// Depende de la abstracción, no de la base de datos real.
struct UserService<R: UserRepository> {
    repository: R,
}

impl<R: UserRepository> UserService<R> {
    fn new(repository: R) -> Self {
        Self { repository }
    }

    fn check_user_status(&self, id: i32) {
        if let Ok(user) = self.repository.get_user(id) {
            println!("Procesando usuario: {}", user.name);
        }
    }
}

// 3. El módulo de bajo nivel (El Adaptador)
// Implementa la abstracción de alto nivel.
struct PostgresUserRepository;
impl UserRepository for PostgresUserRepository {
    fn get_user(&self, id: i32) -> Result<User, String> {
        // Lógica real de SQLx aquí...
        Ok(User { name: "Alice".to_string() })
    }
}
```

Al aplicar DIP de esta manera, logramos dos cosas fundamentales para el testing y la escalabilidad:

1. `UserService` puede ser testeado pasando un `MockUserRepository` (algo que exploramos en el Capítulo 24).
2. Si el día de mañana migramos de PostgreSQL a MongoDB, `UserService` no cambia ni una sola línea de código.

Los principios SOLID en Rust no son reglas arbitrarias; son el lenguaje mediante el cual estructuramos componentes para que la Arquitectura Limpia fluya de manera natural. En las siguientes secciones, utilizaremos estos conceptos —especialmente ISP y DIP— para delimitar nuestras capas de Entidades, Casos de Uso y Adaptadores.

## 29.2 Capa de Entidades y Casos de Uso

En la Arquitectura Limpia (también conocida como arquitectura de cebolla o *Clean Architecture*), las capas internas representan el corazón de tu aplicación. Estas capas deben estar completamente aisladas del mundo exterior: no saben si están respondiendo a una petición HTTP, a un evento de Kafka o a un comando en la terminal. Tampoco saben si los datos se guardan en PostgreSQL, Redis o en memoria.

Las dos capas más profundas son las **Entidades** (Reglas de Negocio de la Empresa) y los **Casos de Uso** (Reglas de Negocio de la Aplicación). En Rust, la combinación del sistema de tipos estricto y el manejo de errores explícito hace que la implementación de estas capas sea increíblemente robusta.

### La Capa de Entidades: El Corazón del Dominio

Las Entidades son los objetos fundamentales de tu dominio. En Rust, se modelan utilizando `structs` y `enums` puros.

**Regla de oro de las Entidades:** No deben tener dependencias externas. No deben importar `sqlx`, `actix_web`, ni ningún otro framework. Idealmente, ni siquiera deberían depender de `serde` (aunque en la práctica muchos equipos hacen esta concesión por pragmatismo).

Además de contener datos, las Entidades en Rust deben encapsular sus propias reglas de negocio e invariantes. No deben ser simples "bolsas de datos" (anémicas) con getters y setters públicos, sino que deben proteger su estado interno.

**Ejemplo: Una Entidad `Wallet` (Billetera)**

```rust
// Capa de Entidades: core/src/domain/wallet.rs

#[derive(Debug, PartialEq)]
pub enum WalletError {
    InsufficientFunds,
    InvalidAmount,
}

pub struct Wallet {
    id: String,
    owner_id: String,
    balance: u64, // Representamos el dinero en centavos para evitar problemas de coma flotante
}

impl Wallet {
    // El constructor valida el estado inicial
    pub fn new(id: String, owner_id: String) -> Self {
        Self {
            id,
            owner_id,
            balance: 0,
        }
    }

    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn balance(&self) -> u64 {
        self.balance
    }

    // El comportamiento está encapsulado en la entidad
    pub fn deposit(&mut self, amount: u64) -> Result<(), WalletError> {
        if amount == 0 {
            return Err(WalletError::InvalidAmount);
        }
        self.balance += amount;
        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<(), WalletError> {
        if amount == 0 {
            return Err(WalletError::InvalidAmount);
        }
        if self.balance < amount {
            return Err(WalletError::InsufficientFunds);
        }
        self.balance -= amount;
        Ok(())
    }
}
```

Como puedes ver, la entidad `Wallet` garantiza que nunca se pueda retirar más dinero del que hay, ni depositar cantidades en cero. Cualquier código que use un `Wallet` está obligado a lidiar con `WalletError`.

### La Capa de Casos de Uso: Orquestando la Aplicación

Los Casos de Uso (o Interactors) representan las acciones que un usuario o sistema puede realizar en la aplicación. Son los "verbos" de tu sistema (ej. `TransferFunds`, `RegisterUser`, `GenerateInvoice`).

El trabajo de un Caso de Uso es:

1. Recibir datos de entrada (generalmente un DTO o una simple estructura).
2. Orquestar la obtención de las **Entidades** necesarias desde el exterior (a través de puertos/interfaces).
3. Invocar la lógica de negocio en las Entidades.
4. Persistir los cambios (nuevamente, a través de puertos).
5. Retornar un resultado.

Para lograr esto sin acoplarse a la base de datos, los Casos de Uso en Rust utilizan **Traits** para definir lo que necesitan del mundo exterior (Principio de Inversión de Dependencias).

**Ejemplo: Caso de Uso para transferir fondos**

Primero, definimos el "Puerto" (la abstracción de lo que necesitamos para almacenar datos):

```rust
// Capa de Casos de Uso: core/src/ports/repositories.rs
use crate::domain::wallet::{Wallet, WalletError};

pub trait WalletRepository {
    fn find_by_id(&self, id: &str) -> Result<Option<Wallet>, String>;
    fn save(&self, wallet: &Wallet) -> Result<(), String>;
}
```

Ahora, implementamos el Caso de Uso. En Rust, lo ideal es inyectar esta dependencia a través de Genéricos (`impl Trait`) para aprovechar el *static dispatch*, o usar `Arc<dyn Trait>` si necesitas flexibilidad en tiempo de ejecución.

```rust
// Capa de Casos de Uso: core/src/use_cases/transfer_funds.rs
use crate::domain::wallet::WalletError;
use crate::ports::repositories::WalletRepository;

pub enum TransferError {
    WalletNotFound,
    BusinessRuleViolation(WalletError),
    RepositoryError(String),
}

// Estructura de entrada para el caso de uso
pub struct TransferCommand {
    pub from_wallet_id: String,
    pub to_wallet_id: String,
    pub amount: u64,
}

// El Caso de Uso inyecta el repositorio a través del Trait
pub struct TransferFundsUseCase<R: WalletRepository> {
    repository: R,
}

impl<R: WalletRepository> TransferFundsUseCase<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub fn execute(&self, command: TransferCommand) -> Result<(), TransferError> {
        // 1. Obtener Entidades
        let mut from_wallet = self.repository
            .find_by_id(&command.from_wallet_id)
            .map_err(TransferError::RepositoryError)?
            .ok_or(TransferError::WalletNotFound)?;

        let mut to_wallet = self.repository
            .find_by_id(&command.to_wallet_id)
            .map_err(TransferError::RepositoryError)?
            .ok_or(TransferError::WalletNotFound)?;

        // 2. Ejecutar lógica de negocio (Entidades)
        from_wallet.withdraw(command.amount)
            .map_err(TransferError::BusinessRuleViolation)?;
            
        to_wallet.deposit(command.amount)
            .map_err(TransferError::BusinessRuleViolation)?;

        // 3. Persistir cambios
        // (Nota: En un caso real, esto requeriría una transacción de base de datos.
        // Veremos cómo manejar transacciones en repositorios en el Capítulo 30).
        self.repository.save(&from_wallet).map_err(TransferError::RepositoryError)?;
        self.repository.save(&to_wallet).map_err(TransferError::RepositoryError)?;

        Ok(())
    }
}
```

### Ventajas de esta separación en Rust

1. **Testabilidad absoluta:** Puedes escribir pruebas unitarias para `Wallet` y `TransferFundsUseCase` en milisegundos, sin levantar contenedores de Docker ni configurar bases de datos, simplemente implementando un `MockWalletRepository` en memoria.
2. **Claridad del compilador:** El compilador de Rust asegura que si un desarrollador intenta usar `execute`, se vea obligado a manejar exhaustivamente el enum `TransferError` gracias al patrón *Pattern Matching*.
3. **Independencia del ecosistema asíncrono:** Notarás que este código es completamente síncrono. El núcleo de tu dominio no necesita saber sobre `async`/`await` o `tokio`. La asincronía es un detalle de infraestructura que se manejará en los adaptadores más externos, simplificando enormemente el razonamiento sobre las reglas de negocio.

## 29.3 Aislamiento de frameworks y la base de datos

Hasta ahora, hemos construido un núcleo inmaculado. Nuestras Entidades dictan las reglas de negocio y nuestros Casos de Uso orquestan los flujos. Ninguno de los dos sabe si el sistema se ejecuta en un servidor HTTP, en una CLI, o qué motor de base de datos guarda la información.

En la Arquitectura Limpia, **los frameworks web y las bases de datos son detalles de implementación**. Pertenecen a la capa más externa: la de los **Adaptadores** (o *Infrastructure/Delivery*). El objetivo de esta sección es conectar ese núcleo puro con el mundo exterior (como Axum o SQLx) sin contaminarlo.

### El Adaptador Web: Frontera de Entrada

El trabajo de un framework web (Actix, Axum, Rocket) debe limitarse estrictamente a:

1. Recibir la petición HTTP.
2. Extraer y validar el *payload* (JSON, Path, Query).
3. Transformar ese *payload* en un Comando/DTO que el Caso de Uso entienda.
4. Invocar el Caso de Uso.
5. Traducir el `Result` del Caso de Uso en una respuesta HTTP (Status Code adecuado).

**Cero lógica de negocio debe existir en tus *handlers* (controladores).**

Veamos cómo se implementaría el *handler* para el caso de uso `TransferFunds` utilizando **Axum**.

```rust
// Capa de Adaptadores (Web): src/delivery/http/transfer_handler.rs

use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use std::sync::Arc;

use crate::use_cases::transfer_funds::{TransferCommand, TransferFundsUseCase, TransferError};
// Supongamos que AppState contiene nuestras dependencias inyectadas
use crate::AppState; 

// DTO específico para la capa HTTP
#[derive(Deserialize)]
pub struct TransferRequest {
    pub from_wallet: String,
    pub to_wallet: String,
    pub amount: u64,
}

pub async fn handle_transfer(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TransferRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    
    // 1. Mapear DTO HTTP al Comando del Caso de Uso
    let command = TransferCommand {
        from_wallet_id: payload.from_wallet,
        to_wallet_id: payload.to_wallet,
        amount: payload.amount,
    };

    // 2. Ejecutar el Caso de Uso
    // (Asumimos que instanciamos o recuperamos el caso de uso del estado)
    let use_case = TransferFundsUseCase::new(state.wallet_repository.clone());

    // 3. Traducir el error del dominio a un error HTTP
    match use_case.execute(command).await {
        Ok(_) => Ok(StatusCode::OK),
        Err(TransferError::WalletNotFound) => {
            Err((StatusCode::NOT_FOUND, "Billetera no encontrada".into()))
        }
        Err(TransferError::BusinessRuleViolation(err)) => {
            Err((StatusCode::BAD_REQUEST, format!("Regla de negocio violada: {:?}", err)))
        }
        Err(TransferError::RepositoryError(_)) => {
            // No exponemos detalles de la BD al cliente
            Err((StatusCode::INTERNAL_SERVER_ERROR, "Error interno del servidor".into()))
        }
    }
}
```

Al hacerlo de esta manera, si mañana decides cambiar Axum por Actix-Web, **solo reescribes este archivo**. Tu dominio permanece intacto.

### El Adaptador de Persistencia: Frontera de Salida

De manera análoga, necesitamos aislar la base de datos. En la sección anterior definimos el "Puerto" (el Trait `WalletRepository`). Ahora debemos crear el "Adaptador" que implementa ese Trait utilizando una tecnología concreta, por ejemplo, **SQLx con PostgreSQL**.

*Nota sobre asincronía:* En Rust moderno (desde la versión 1.75), podemos usar `async fn` en Traits de forma nativa. Como el I/O de bases de datos es asíncrono, nuestro Trait en la capa de Casos de Uso debe ser `async`, lo cual es perfectamente válido y no acopla el dominio a Tokio, sino a la abstracción de concurrencia de Rust.

```rust
// Capa de Adaptadores (Infraestructura): src/infrastructure/db/postgres_wallet_repo.rs

use sqlx::PgPool;
use crate::domain::wallet::Wallet;
use crate::ports::repositories::WalletRepository;

// El adaptador concreto contiene el Pool de conexiones de SQLx
#[derive(Clone)]
pub struct PostgresWalletRepository {
    pool: PgPool,
}

impl PostgresWalletRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

// Implementamos el Puerto definido por los Casos de Uso
impl WalletRepository for PostgresWalletRepository {
    async fn find_by_id(&self, id: &str) -> Result<Option<Wallet>, String> {
        // Ejecutamos SQL puro asíncrono. Esta es la ÚNICA parte del código que sabe de SQL.
        let record = sqlx::query!(
            r#"SELECT id, owner_id, balance FROM wallets WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        match record {
            Some(row) => {
                // Mapeamos el modelo de base de datos a la Entidad de Dominio
                let mut wallet = Wallet::new(row.id, row.owner_id);
                // (Para evitar romper invariantes, a menudo se usa un método reconstructor 
                // interno de la entidad o se permite depositar el balance inicial)
                let _ = wallet.deposit(row.balance as u64); 
                Ok(Some(wallet))
            }
            None => Ok(None),
        }
    }

    async fn save(&self, wallet: &Wallet) -> Result<(), String> {
        sqlx::query!(
            r#"
            INSERT INTO wallets (id, owner_id, balance) 
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance
            "#,
            wallet.id(),
            "owner_placeholder", // Simplificado para el ejemplo
            wallet.balance() as i64
        )
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
```

### El ensamblaje final: La "Composition Root"

Con nuestras capas puras por un lado y nuestros adaptadores por el otro, ¿dónde se unen? Se unen en el punto de entrada de la aplicación, generalmente el archivo `main.rs`. Este patrón se conoce como **Composition Root**.

Es en el `main.rs` donde permitimos que el sistema "se contamine" con todas las dependencias, instanciamos la base de datos real, creamos el repositorio de PostgreSQL y se lo inyectamos al estado del framework web.

Al separar estas preocupaciones, logramos un sistema verdaderamente *plug-and-play*. Tus pruebas de integración pueden levantar el servidor web inyectando un repositorio en memoria, y tus pruebas de base de datos pueden probar `PostgresWalletRepository` sin necesidad de levantar Axum.

## 29.4 Inversión de dependencias utilizando `dyn Trait` y Genéricos

Hemos visto que el Principio de Inversión de Dependencias (DIP) es la piedra angular para lograr capas aisladas. En Rust, logramos esto abstrayendo nuestros repositorios y servicios detrás de **Traits**. Sin embargo, a la hora de inyectar estas dependencias en nuestros Casos de Uso o en el estado de nuestra aplicación (*App State*), nos enfrentamos a una de las decisiones arquitectónicas más importantes del lenguaje: **¿Despacho Estático (Genéricos) o Despacho Dinámico (`dyn Trait`)?**

Ambos enfoques tienen implicaciones profundas en el rendimiento, el tiempo de compilación y, sobre todo, en la ergonomía de tu código.

### 1. Despacho Estático (Static Dispatch) con Genéricos

El enfoque más "ideológico" en Rust es usar genéricos. Cuando usamos `<R: UserRepository>`, el compilador de Rust aplica un proceso llamado **monomorfización**. Genera una copia exacta de la función o `struct` para cada tipo concreto que utilicemos.

**Implementación con Genéricos:**

```rust
pub trait UserRepository {
    fn get_user(&self, id: i32) -> Result<String, ()>;
}

// El Caso de Uso requiere un parámetro genérico R
pub struct GetUserUseCase<R: UserRepository> {
    repository: R,
}

impl<R: UserRepository> GetUserUseCase<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}
```

* **Ventajas:** * **Zero-cost abstraction:** Es increíblemente rápido. Al conocer el tipo exacto en tiempo de compilación, el compilador puede realizar optimizaciones agresivas, como el *inlining* (reemplazar la llamada a la función por su cuerpo).
  * No requiere asignaciones en el montículo (*heap*), lo que lo hace ideal para sistemas embebidos o código crítico de alta frecuencia.
* **Desventajas:**
  * **Genéricos virales:** Este es el mayor dolor de cabeza en el desarrollo backend. Si tu framework web necesita guardar `GetUserUseCase` en el estado global, el estado también debe volverse genérico. Rápidamente, tu `AppState` termina teniendo firmas ilegibles como `AppState<R1, R2, R3, S1, S2>`.
  * Tiempos de compilación más lentos y binarios más pesados debido a la duplicación de código.

### 2. Despacho Dinámico (Dynamic Dispatch) con `dyn Trait`

El despacho dinámico resuelve el problema de la "viralidad" ocultando el tipo concreto detrás de un puntero. En lugar de decirle al compilador exactamente qué tipo es en tiempo de compilación, le decimos: *"Aquí tienes un puntero a algún objeto en la memoria que implementa este Trait. Usa su tabla de métodos virtuales (vtable) para descubrir a qué función llamar en tiempo de ejecución"*.

Como en los frameworks web (como Axum o Actix) el estado se comparte entre múltiples hilos concurrentes, utilizamos `Arc<dyn Trait>` (Atomic Reference Counted) en lugar de un simple `Box<dyn Trait>`.

**Implementación con `dyn Trait`:**

```rust
use std::sync::Arc;

pub trait UserRepository: Send + Sync {
    fn get_user(&self, id: i32) -> Result<String, ()>;
}

// El Caso de Uso ya no es genérico. 
// Depende de una abstracción contenida en un Arc.
#[derive(Clone)]
pub struct GetUserUseCase {
    repository: Arc<dyn UserRepository>,
}

impl GetUserUseCase {
    pub fn new(repository: Arc<dyn UserRepository>) -> Self {
        Self { repository }
    }
}
```

* **Ventajas:**
  * **Ergonomía absoluta:** Tu `AppState` y tus structs se mantienen limpios, sin parámetros angulares `<T>` por todas partes.
  * Tiempos de compilación marginalmente más rápidos al evitar la monomorfización masiva.
  * Facilita enormemente la creación de colecciones heterogéneas (ej. un `Vec<Arc<dyn Notifier>>` que contenga notificadores por Email, SMS y Push).
* **Desventajas:**
  * **Costo de ejecución:** Hay una penalización de rendimiento microscópica por seguir el puntero y buscar en la *vtable*.
  * Requiere asignación en el *heap* (`Arc` o `Box`).
  * Inhabilita ciertas optimizaciones del compilador (como el *inlining* a través de ese límite).

### El veredicto pragmático para Backend

En la comunidad de Rust, a menudo hay una obsesión por el rendimiento puro que empuja a los desarrolladores a usar genéricos para todo. Sin embargo, en la Arquitectura Limpia aplicada a servicios web, **el consenso general (y la recomendación de este libro) es favorecer fuertemente `Arc<dyn Trait>` para los límites de los Casos de Uso y Adaptadores.**

¿Por qué?

1. **El cuello de botella no es la CPU:** El costo de un *vtable lookup* se mide en nanosegundos (billonésimas de segundo). El costo de la consulta a PostgreSQL o Redis a través de la red se mide en milisegundos (milésimas de segundo). Tratar de optimizar nanosegundos ensuciando toda tu arquitectura web con genéricos virales es una optimización prematura.
2. **Productividad:** `Arc<dyn Trait>` te permite maquetar, testear y refactorizar tu código mucho más rápido, manteniendo las firmas de tus funciones simples.

**Cuándo usar Genéricos entonces:**
Reserva el despacho estático para el núcleo algorítmico de tu dominio (las Entidades), para funciones de procesamiento matemático intensivo, parsers, o librerías utilitarias de muy bajo nivel. Para las costuras arquitectónicas (inyectar la base de datos, inyectar un cliente HTTP), la flexibilidad de `dyn Trait` es imbatible.

Con esto, hemos cerrado el Capítulo 29 y establecido las reglas de oro para mantener nuestro código de dominio puro, aislado e inyectado correctamente.
