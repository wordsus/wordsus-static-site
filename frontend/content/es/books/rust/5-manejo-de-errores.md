En el desarrollo backend, la resiliencia es innegociable. Rust abandona el modelo tradicional de excepciones por uno más robusto: la distinción entre fallos irrecuperables y situaciones previstas. En este capítulo, exploraremos cómo la macro `panic!` protege la integridad de la memoria ante estados ilógicos y cómo el enum `Result<T, E>` convierte los errores en ciudadanos de primera clase. Aprenderás a usar el operador `?` para escribir código lineal y limpio, y a implementar estrategias profesionales con `thiserror` y `anyhow`. El objetivo es transformar los errores de eventos temidos a datos estructurados que guíen la lógica de tu API hacia la estabilidad total.</T,>

## 5.1 Errores irrecuperables: la macro `panic!`

En el desarrollo de software backend, nos enfrentamos constantemente a situaciones inesperadas: una base de datos rechaza una conexión, un usuario envía un JSON malformado o un archivo de configuración desaparece. La mayoría de estos problemas son predecibles y, lo más importante, *recuperables*. Sin embargo, existe una categoría de errores donde el programa entra en un estado corrupto o ilógico del cual no puede, ni debe, intentar recuperarse.

Para estos escenarios, Rust nos proporciona la macro `panic!`.

Un "panic" (pánico) en Rust es la forma que tiene el lenguaje de decir: *"Ha ocurrido algo que rompe las garantías fundamentales de este programa. Abortemos la misión de forma controlada antes de causar más daño"*.

### ¿Qué sucede bajo el capó cuando entramos en pánico?

Cuando se invoca un `panic!`, por defecto, Rust hace dos cosas importantes:

1. **Imprime un mensaje de error:** Muestra en la salida estándar (stderr) el mensaje proporcionado junto con la ubicación exacta (archivo, línea y columna) donde ocurrió el pánico.
2. **Unwinding (Desenrollado de la pila):** Rust retrocede por la pila de llamadas de funciones, limpiando y liberando la memoria de cada variable y recurso que encuentra a su paso. Esto garantiza que no haya fugas de memoria, aprovechando el sistema de *Ownership* que vimos en el Capítulo 4.

Veamos el uso más básico y directo de esta macro:

```rust
fn main() {
    println!("Iniciando el servidor de pagos...");
    
    // Simulamos una invariante de negocio rota
    let config_is_loaded = false;
    
    if !config_is_loaded {
        panic!("Error crítico: No se pudo cargar la configuración de facturación.");
    }

    println!("Este código nunca se ejecutará.");
}
```

Al ejecutar este código, obtendremos una salida similar a esta:

```text
thread 'main' panicked at 'Error crítico: No se pudo cargar la configuración de facturación.', src/main.rs:8:9
```

#### Alternativa al Unwinding: Abortar inmediatamente

El proceso de *unwinding* requiere trabajo por parte del sistema y aumenta ligeramente el tamaño del binario final. En ciertos entornos de backend altamente optimizados (o sistemas embebidos), podrías preferir que el programa simplemente se detenga de inmediato (abort) y deje que el sistema operativo limpie la memoria.

Puedes cambiar este comportamiento globalmente añadiendo lo siguiente a tu archivo `Cargo.toml`:

```toml
[profile.release]
panic = 'abort'
```

### Pánicos implícitos: Cuando Rust nos protege de nosotros mismos

No siempre serás tú quien escriba explícitamente `panic!`. Muchas veces, la Standard Library de Rust invocará un pánico en tu nombre para prevenir comportamientos indefinidos (Undefined Behavior) que en otros lenguajes como C o C++ resultarían en vulnerabilidades de seguridad graves.

El ejemplo más clásico es acceder a un índice fuera de los límites de un arreglo o vector:

```rust
fn main() {
    let active_connections = vec!["192.168.1.1", "10.0.0.5"];
    
    // Intentamos acceder al tercer elemento (índice 2)
    // Esto provocará un panic! automático en tiempo de ejecución.
    let target_ip = active_connections[2]; 
}
```

Otros ejemplos comunes de pánicos implícitos incluyen la división por cero o el uso incorrecto de métodos como `.unwrap()` o `.expect()` sobre valores nulos o erróneos (conceptos que exploraremos a fondo en la próxima sección).

### Macros hermanas: `todo!`, `unimplemented!` y `unreachable!`

En el día a día de un desarrollador backend, la macro `panic!` tiene un uso explícito limitado en código de producción. Sin embargo, Rust ofrece macros derivadas de `panic!` que son herramientas excepcionales para el modelado y prototipado rápido:

* **`todo!()`**: Indica que una pieza de lógica aún no está escrita. Pasa la comprobación de tipos del compilador, pero hace *panic* si se ejecuta. Excelente para el desarrollo guiado por pruebas (TDD).
* **`unimplemented!()`**: Similar a `todo!`, pero indica semánticamente que una función o método requerido por un Trait no va a ser implementado por diseño en esta estructura específica.
* **`unreachable!()`**: Se utiliza para indicarle al compilador (y a otros desarrolladores) que cierta rama de ejecución es lógicamente imposible de alcanzar. Si la ejecución llega allí, el programa entra en pánico.

```rust
fn process_payment(method: &str) {
    match method {
        "credit_card" => println!("Procesando tarjeta..."),
        "paypal" => todo!("Implementar la integración con la API de PayPal"),
        "crypto" => unimplemented!("No aceptaremos criptomonedas en esta versión"),
        _ => unreachable!("El validador previo asegura que solo lleguen métodos válidos"),
    }
}
```

### Depuración: El Backtrace al rescate

Cuando tu aplicación backend falla en un entorno de desarrollo o staging, saber en qué línea ocurrió el pánico a menudo no es suficiente; necesitas saber *cómo* llegó la ejecución hasta ahí.

Rust te permite generar un *backtrace* (traza de la pila) configurando la variable de entorno `RUST_BACKTRACE`.

Si ejecutas tu programa con `RUST_BACKTRACE=1 cargo run`, Rust imprimirá la lista completa de funciones llamadas que condujeron al pánico, facilitando enormemente la depuración. Es importante notar que para que el backtrace sea legible, el código debe ser compilado con símbolos de depuración (que es el comportamiento por defecto en perfiles de desarrollo, `cargo build`).

### ¿Cuándo es correcto entrar en pánico en un Backend?

Una regla de oro para desarrolladores senior en Rust es: **Un usuario enviando datos inválidos nunca debería causar un `panic!`**.

Si un endpoint REST recibe un email mal formado, el servidor debe devolver un *HTTP 400 Bad Request* mediante un error recuperable (como veremos con `Result`), no colapsar el hilo de ejecución.

Entonces, ¿cuándo *sí* debes usar (o permitir) un pánico en tu código?

1. **En la fase de inicialización (Startup):** Si tu servidor arranca y no puede conectarse a la base de datos principal, o le faltan variables de entorno críticas, hacer un *panic* temprano (Fail Fast) es la mejor opción. No tiene sentido levantar un servidor que no puede atender peticiones de manera funcional.
2. **En violaciones de invariantes internas:** Cuando detectas que el estado interno del programa está irremediablemente corrupto debido a un bug en tu propia lógica (ej. una máquina de estados que llega a una transición imposible).
3. **En las pruebas (Tests):** Como veremos en la Parte VI del libro, la macro `#[test]` considera que un test falla precisamente si ocurre un pánico durante su ejecución.

## 5.2 Errores recuperables: el enum `Result<T, E>`

En la sección anterior vimos cómo `panic!` destruye el proceso actual cuando nos encontramos ante un callejón sin salida lógico. Sin embargo, en el desarrollo backend del mundo real, el 99% de los errores no son críticos para el ciclo de vida de la aplicación, sino que son simplemente parte del flujo de negocio.

Si un usuario intenta autenticarse con una contraseña incorrecta, o si un microservicio externo tarda demasiado en responder, nuestro servidor no debe colapsar. En su lugar, debe capturar el error, registrarlo, y devolver una respuesta adecuada (como un *HTTP 401 Unauthorized* o *504 Gateway Timeout*).

Para manejar esta inmensa mayoría de errores "esperados" o recuperables, Rust no utiliza excepciones (`try/catch`) como Java, C# o Python. En su lugar, hace que los errores sean **valores explícitos** utilizando el poderoso enum `Result<T, E>`.

### La anatomía de `Result<T, E>`

La biblioteca estándar de Rust define el enum `Result` de la siguiente manera:

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Es un tipo algebraico (como vimos en el Capítulo 3) fuertemente tipado mediante dos parámetros genéricos:

* **`T` (Type):** El tipo del valor que se devolverá en caso de éxito, envuelto en la variante `Ok`.
* **`E` (Error):** El tipo del valor que se devolverá en caso de fallo, envuelto en la variante `Err`.

La ventaja arquitectónica de este diseño es masiva: **la firma de la función documenta explícitamente que puede fallar**. El compilador te obligará a lidiar con la posibilidad del error antes de permitirte acceder al valor exitoso. No hay excepciones invisibles volando por el *call stack*.

### Extrayendo valores con `match`

Imaginemos un escenario común en una API REST: recibimos el ID de un usuario como una cadena de texto (desde un *path parameter*) y necesitamos convertirlo a un entero de 32 bits antes de consultar la base de datos.

El método `parse()` de las cadenas en Rust devuelve un `Result`, ya que la conversión puede fallar (por ejemplo, si recibimos `"123a"`). La forma más exhaustiva de manejar esto es usando `match`:

```rust
fn handle_user_request(user_id_str: &str) {
    // parse() infiere que queremos un i32, pero puede fallar.
    // Devuelve Result<i32, ParseIntError>
    let parsed_id = user_id_str.parse::<i32>();

    match parsed_id {
        Ok(id) => {
            println!("Consultando en BD el usuario con ID: {}", id);
            // Lógica de éxito...
        }
        Err(e) => {
            // Aquí en un backend real retornaríamos un HTTP 400 Bad Request
            eprintln!("Error de validación: '{}' no es un ID numérico válido. Detalle: {}", user_id_str, e);
        }
    }
}
```

Al usar `match`, el compilador de Rust garantiza que no nos hemos "olvidado" de manejar el caso de error. Si solo escribimos la rama `Ok`, el código simplemente no compilará.

### Métodos utilitarios: Evitando la verbosidad de `match`

Usar `match` para cada operación que puede fallar se vuelve rápidamente tedioso. El enum `Result` expone una gran cantidad de métodos que nos permiten escribir un código más idiomático y funcional.

#### 1. `unwrap` y `expect` (Cuidado en Producción)

Si estás absolutamente seguro de que un `Result` será `Ok`, o si estás prototipando, puedes forzar la extracción del valor. Sin embargo, si el `Result` resulta ser un `Err`, estos métodos **causarán un `panic!`**.

```rust
// Si el entorno no tiene la variable, el servidor entrará en pánico y morirá.
let port_str = std::env::var("PORT").unwrap();

// expect() hace lo mismo, pero te permite proveer un mensaje de error personalizado
// para el backtrace. Esta es la opción preferida frente a unwrap().
let db_url = std::env::var("DATABASE_URL")
    .expect("FALTA CONFIGURACIÓN CRÍTICA: DATABASE_URL no está definida en el entorno");
```

> **Regla de oro para Backend:** En el código que maneja peticiones (requests), evita `unwrap()` y `expect()`. Su uso legítimo se limita a la inicialización del servidor (donde un fallo temprano es deseable) o en los tests.

#### 2. Alternativas seguras: `unwrap_or` y `unwrap_or_else`

En muchas configuraciones de backend, si algo falla, simplemente queremos usar un valor por defecto en lugar de abortar.

```rust
// Si la variable de entorno no existe (Err), usamos "8080" por defecto.
let port = std::env::var("PORT").unwrap_or(String::from("8080"));

// Si el valor por defecto es costoso de calcular (ej. requiere una consulta o asignación de memoria),
// usamos unwrap_or_else, que evalúa el closure de forma perezosa (lazy).
let max_connections = std::env::var("MAX_CONN")
    .unwrap_or_else(|_| compute_optimal_connections());
```

### El puente hacia un código limpio

Aunque `unwrap_or` y el `match` son útiles, en una capa de controladores o servicios donde múltiples operaciones secuenciales pueden fallar (validar input -> conectar a BD -> insertar fila -> publicar evento), el manejo manual de cada `Result` generaría un código profundamente anidado (el temido "Arrow Anti-Pattern").

Rust soluciona esto de manera brillante permitiéndonos propagar los errores hacia arriba en la cadena de llamadas de forma casi invisible, delegando la responsabilidad de manejar el error a una capa superior.

## 5.3 Propagación de errores con el operador `?`

En la sección anterior observamos cómo `match` nos obliga a ser explícitos y seguros al manejar un `Result<T, E>`. Sin embargo, en la arquitectura de un backend, es muy común que una sola petición HTTP desencadene una serie de operaciones dependientes: validar un token, leer de la base de datos, serializar un JSON y enviarlo a una cola de mensajes.

Si usamos `match` para manejar el posible error de *cada una* de estas operaciones, terminaremos con un código profundamente anidado y difícil de leer, conocido en ingeniería de software como el "Arrow Anti-Pattern" (el código toma forma de flecha apuntando hacia la derecha).

Para resolver este problema de ergonomía sin sacrificar la seguridad de tipos, Rust introdujo el **operador de propagación de errores: `?`**.

### ¿Cómo funciona el operador `?` bajo el capó?

El operador `?` se coloca al final de una expresión que devuelve un `Result` (o un `Option`). Su comportamiento es simple pero increíblemente poderoso:

1. **Si el valor es `Ok(T)`:** El operador extrae internamente el valor `T` y la ejecución de la función continúa normalmente. Es como un `.unwrap()`, pero seguro.
2. **Si el valor es `Err(E)`:** El operador **retorna anticipadamente (early return)** de la función actual, propagando el error `Err(E)` hacia la función superior que la llamó.

### El "Antes y Después": Refactorizando la anidación

Veamos un ejemplo clásico de un servicio backend: leer el ID de un archivo de configuración, parsearlo a entero y simular la carga de un perfil de usuario.

**El enfoque manual (verboso):**

```rust
use std::fs;
use std::num::ParseIntError;

// Retornamos un String genérico como error para simplificar
fn load_admin_user() -> Result<String, String> {
    let file_result = fs::read_to_string("admin_id.txt");
    
    let id_str = match file_result {
        Ok(content) => content,
        Err(e) => return Err(format!("Error leyendo archivo: {}", e)),
    };

    let id_result = id_str.trim().parse::<i32>();
    
    let admin_id = match id_result {
        Ok(id) => id,
        Err(e) => return Err(format!("Error parseando ID: {}", e)),
    };

    Ok(format!("Perfil del administrador con ID: {}", admin_id))
}
```

**El enfoque idiomático con `?`:**

```rust
use std::fs;

// En un caso real, devolveríamos un tipo de Error personalizado, 
// aquí usamos Box<dyn std::error::Error> que acepta cualquier error estándar.
fn load_admin_user_idiomatic() -> Result<String, Box<dyn std::error::Error>> {
    // Si read_to_string falla, la función retorna inmediatamente el error de I/O.
    let id_str = fs::read_to_string("admin_id.txt")?;
    
    // Si parse falla, la función retorna inmediatamente el error de parseo.
    let admin_id = id_str.trim().parse::<i32>()?;

    // Si llegamos aquí, ambas operaciones fueron exitosas.
    Ok(format!("Perfil del administrador con ID: {}", admin_id))
}
```

El operador `?` aplana el flujo de control, transformando el código asíncrono o propenso a errores en una secuencia lineal que se lee de arriba hacia abajo, casi como si estuviéramos escribiendo código que no puede fallar.

### El superpoder oculto de `?`: La conversión implícita (`From` trait)

Para que el operador `?` pueda retornar un error de la función actual, el tipo de error que produce la expresión debe ser *el mismo* que el tipo de error que retorna la función, **o bien, debe poder convertirse a él**.

Aquí es donde brilla el diseño del compilador de Rust. Cuando usas `?`, Rust no solo extrae el valor o hace un return temprano; en caso de error, internamente llama a la función `From::from()` sobre el error original.

Esto significa que si tu función declara que retorna un error de tipo `AppError` (tu error de dominio), y dentro de la función usas `?` en una operación de base de datos que devuelve un `sqlx::Error`, Rust automáticamente intentará convertir el `sqlx::Error` en tu `AppError` (siempre y cuando hayas implementado el trait `From` para esa conversión). Esta es la piedra angular para construir arquitecturas limpias y mantener el desacoplamiento en tu backend.

### La regla de oro del operador `?`

El operador `?` **solo puede usarse en funciones cuyo tipo de retorno sea compatible**. Principalmente, esto significa funciones que devuelven:

* `Result<T, E>`
* `Option<T>` (en cuyo caso, un `None` provocará un return temprano de `None`)
* Cualquier tipo que implemente el trait interno `FromResidual`.

**¿Qué pasa con la función `main`?**
Tradicionalmente, `main` no devuelve nada (`()`), por lo que intentar usar `?` allí dará un error de compilación. Afortunadamente, Rust moderno permite que `main` devuelva un `Result`:

```rust
use std::fs;

// Ahora podemos usar `?` directamente en el main
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = fs::read_to_string("config.toml")?;
    println!("Configuración cargada: {}", config);
    
    Ok(())
}
```

Para cerrar este capítulo de manejo de errores y preparar el terreno para aplicaciones backend de nivel senior, el siguiente paso lógico es aprender a centralizar y tipar nuestros propios errores de dominio (aprovechando esa conversión implícita del `?`).

## 5.4 Creación de tipos de error personalizados con `thiserror` y `anyhow`

Hasta ahora hemos visto cómo propagar errores con el operador `?` utilizando tipos genéricos como `String` o el "cajón de sastre" `Box<dyn std::error::Error>`. Si bien esto es suficiente para scripts rápidos, en un backend de nivel de producción es inaceptable.

Si tu capa de acceso a datos falla, tu controlador HTTP necesita saber *exactamente* por qué falló para responder correctamente:

* ¿No se encontró el registro? -> **HTTP 404 Not Found**
* ¿Violación de unicidad (email duplicado)? -> **HTTP 409 Conflict**
* ¿Se cayó la base de datos? -> **HTTP 500 Internal Server Error**

Si devuelves un `Box<dyn Error>`, pierdes la información del tipo original y te ves obligado a parsear strings para adivinar qué pasó, lo cual es frágil y propenso a errores. Para resolver esto estructuradamente, el ecosistema de Rust ha estandarizado dos crates fundamentales: `thiserror` y `anyhow`.

### El problema del boilerplate en la Standard Library

Para que un tipo personalizado sea considerado un "Error" en Rust, debe implementar los traits `std::fmt::Display`, `std::fmt::Debug` y `std::error::Error`. Hacer esto a mano para cada enum de error en tu aplicación requiere decenas de líneas de código repetitivo (boilerplate). Aquí es donde entra `thiserror`.

### 1. `thiserror`: Tipado fuerte para tu capa de Dominio

El crate `thiserror` proporciona macros que implementan automáticamente todos los traits necesarios para tus enums de error. Es la herramienta ideal cuando estás construyendo el núcleo de tu aplicación, tus repositorios o una librería que será consumida por otros.

Veamos cómo definir un error de dominio robusto para un servicio de usuarios:

```rust
use thiserror::Error;

// Definimos nuestro propio enum de errores
#[derive(Debug, Error)]
pub enum UserError {
    #[error("El usuario con ID {0} no fue encontrado en la base de datos")]
    NotFound(i32),

    #[error("El email '{0}' tiene un formato inválido")]
    InvalidEmail(String),

    // La macro #[from] genera automáticamente la conversión implícita (From trait).
    // Esto permite usar `?` cuando una función devuelva un sqlx::Error interno.
    #[error("Error interno de la base de datos")]
    Database(#[from] sqlx::Error),
}

fn fetch_user(id: i32) -> Result<String, UserError> {
    if id <= 0 {
        return Err(UserError::NotFound(id));
    }
    
    // Si esta operación imaginaria fallara con un sqlx::Error,
    // el operador `?` lo convertiría automáticamente a UserError::Database
    // let record = db.query("SELECT...")?; 
    
    Ok(format!("Usuario {}", id))
}
```

**Ventajas clave para el Backend:**

* **Manejo exhaustivo:** El controlador HTTP puede hacer un `match` sobre `UserError` y estar 100% seguro de que ha mapeado cada caso a un código de estado HTTP adecuado.
* **Cero sobrecarga en runtime:** `thiserror` solo genera código en tiempo de compilación.

### 2. `anyhow`: Contexto dinámico para tu capa de Aplicación

A veces, especialmente en la capa más externa de tu aplicación (como la inicialización del servidor o tareas cron), no te importa hacer un `match` sobre el tipo exacto de error. Solo quieres que, si algo falla, el error se propague con el mayor contexto humano posible para poder leerlo en los logs y depurar.

Para esto usamos `anyhow`. Este crate nos da un tipo `anyhow::Result<T>` y un método mágico llamado `.context()`.

```rust
use anyhow::{Context, Result};
use std::fs;

// Nota que no necesitamos especificar el tipo de error (E) en el Result.
// anyhow::Result maneja cualquier error subyacente de forma dinámica.
fn load_server_config(path: &str) -> Result<String> {
    // Si read_to_string falla, le añadimos contexto humano sin crear un enum nuevo
    let content = fs::read_to_string(path)
        .with_context(|| format!("Fallo crítico: No se pudo leer el archivo de configuración en la ruta '{}'", path))?;
        
    // Si el parseo JSON fallara, añadimos otro nivel de contexto
    let json: serde_json::Value = serde_json::from_str(&content)
        .context("El archivo de configuración no tiene un formato JSON válido")?;

    Ok(json.to_string())
}
```

Si el archivo no existe, el error impreso en los logs será una cadena de causalidad hermosa y fácil de seguir:

```text
Error: Fallo crítico: No se pudo leer el archivo de configuración en la ruta '/etc/config.json'

Caused by:
    No such file or directory (os error 2)
```

### La Regla de Oro en Arquitectura Backend

Saber cuándo usar cuál es una marca de un desarrollador Rust Senior:

* **Usa `thiserror` (Errores Estructurados):** En librerías, crates internos, capas de dominio y acceso a datos. Úsalo siempre que el código que llame a tu función necesite inspeccionar el error para tomar una decisión lógica (ej. reintentar la conexión, mapear a un código HTTP específico o ejecutar un fallback).
* **Usa `anyhow` (Errores de Contexto):** En binarios finales, scripts de CLI, inicialización del servidor (función `main`) o capas de la aplicación donde el único camino a seguir ante un error es abortar la operación actual, devolver un error 500 genérico y registrar el contexto en los logs.

Con esto concluimos el **Capítulo 5: Manejo de Errores**, estableciendo una base sólida y segura para evitar caídas inesperadas en producción.
