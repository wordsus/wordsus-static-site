Escribir software de backend escalable requiere un equilibrio delicado entre la flexibilidad y la seguridad. En Rust, este equilibrio se alcanza mediante el polimorfismo, permitiendo que una misma lógica opere sobre diversos tipos de datos sin comprometer el rendimiento.

En este capítulo, exploraremos cómo los **genéricos** actúan como plantillas para estructuras y funciones, y cómo los **traits** definen contratos de comportamiento rigurosos. Aprenderás a dominar desde el despacho estático (monomorfización) hasta la flexibilidad dinámica de los *trait objects*, herramientas esenciales para diseñar arquitecturas limpias, desacopladas y de alto nivel.

## 7.1 Funciones y tipos genéricos

A medida que tu aplicación backend crece, te encontrarás escribiendo código repetitivo. Quizás tengas una función que formatea una respuesta HTTP para un usuario (`User`), y luego te des cuenta de que necesitas exactamente la misma lógica para formatear la respuesta de un producto (`Product`). Copiar y pegar código para cada tipo de dato viola el principio DRY (*Don't Repeat Yourself*) y hace que el mantenimiento sea una pesadilla.

Aquí es donde entran los **genéricos**.

En Rust, los genéricos nos permiten escribir código abstracto que puede operar sobre diferentes tipos de datos sin sacrificar la seguridad de tipos en tiempo de compilación. En lugar de especificar un tipo concreto como `i32` o `String`, usamos un **parámetro de tipo** (usualmente representado con letras mayúsculas como `T`, `U` o `E`).

### Funciones Genéricas

Para definir una función genérica, colocamos el parámetro de tipo entre corchetes angulares `<T>` justo después del nombre de la función. Esto le dice al compilador de Rust: *"Esta función usará un tipo `T`, y ese tipo será el mismo dondequiera que veas `T` en la firma de la función"*.

Imagina que quieres una función utilitaria que tome cualquier valor y lo envuelva en un vector de un solo elemento.

```rust
// El <T> declara el tipo genérico. Luego lo usamos en los parámetros y en el retorno.
fn wrap_in_vec<T>(item: T) -> Vec<T> {
    vec![item]
}

fn main() {
    // Rust infiere que T es i32
    let number_vec = wrap_in_vec(42); 
    
    // Rust infiere que T es String
    let string_vec = wrap_in_vec(String::from("Backend")); 
}
```

El compilador es lo suficientemente inteligente como para inferir el tipo de `T` basándose en el argumento que le pasas, por lo que rara vez necesitas especificar el tipo explícitamente al llamar a la función.

### Structs Genéricos (El pan de cada día en el Backend)

Los genéricos brillan con luz propia cuando definimos estructuras de datos. En el desarrollo de APIs, es muy común tener un formato de respuesta estándar (por ejemplo, para envolver datos paginados o metadatos). En lugar de crear un `UserResponse`, `ProductResponse` y `OrderResponse`, podemos crear un único `ApiResponse<T>`.

```rust
// Un struct que puede contener cualquier tipo de dato en su campo `payload`
pub struct ApiResponse<T> {
    pub status: u16,
    pub message: String,
    pub payload: T,
}

fn main() {
    let user_response = ApiResponse {
        status: 200,
        message: String::from("Usuario encontrado"),
        payload: "user_id_12345", // T es &str
    };

    let count_response = ApiResponse {
        status: 200,
        message: String::from("Conteo total"),
        payload: 150, // T es i32
    };
}
```

También puedes usar múltiples tipos genéricos si tu estructura lo requiere. Por ejemplo, un `CacheEntry<K, V>` para una base de datos clave-valor en memoria requeriría definir ambos parámetros: `<K, V>`.

### Enums Genéricos: Un repaso necesario

Ya has estado usando enums genéricos exhaustivamente en los capítulos anteriores, concretamente cuando manejamos errores y valores nulos (Capítulos 5 y 6). La Standard Library de Rust los define usando esta misma sintaxis:

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Esta es la razón por la cual un `Result` puede devolver un `String` en caso de éxito y un tipo de error personalizado `DbError` en caso de fallo: simplemente estamos pasando tipos concretos a los parámetros `<T, E>`.

### Implementación de Métodos Genéricos (`impl`)

Cuando implementamos métodos para un struct genérico, debemos declarar el parámetro de tipo justo después de la palabra clave `impl`, para que Rust sepa que estamos implementando métodos para la versión genérica del struct, y no para un tipo concreto.

```rust
pub struct PaginatedData<T> {
    pub items: Vec<T>,
    pub total_pages: u32,
}

// Declaramos <T> en el impl para usarlo en PaginatedData<T>
impl<T> PaginatedData<T> {
    pub fn new(items: Vec<T>, total_pages: u32) -> Self {
        Self { items, total_pages }
    }

    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }
}
```

**Especialización de métodos:**
Rust también te permite implementar métodos *solo* para un tipo concreto. Por ejemplo, podrías querer un método que solo exista cuando tu `ApiResponse` envuelva un tipo numérico `f32`:

```rust
impl ApiResponse<f32> {
    pub fn round_payload(&self) -> f32 {
        self.payload.round()
    }
}
```

En este caso, no ponemos `<T>` después de `impl` porque estamos apuntando a un tipo específico (`f32`). Las instancias de `ApiResponse<String>` no tendrán acceso al método `round_payload()`.

### El Costo de los Genéricos: Monomorfización

Una pregunta común al venir de lenguajes interpretados o con máquinas virtuales (como Java o C#) es: *"¿Afectan los genéricos al rendimiento de mi aplicación por tener que resolver los tipos en tiempo de ejecución?"*

En Rust, la respuesta es un rotundo **no**. Rust utiliza un proceso llamado **monomorfización** durante la compilación.

Cuando escribes una función genérica y la llamas con un `i32` y luego con un `String`, el compilador (bajo el capó) genera *dos copias distintas* de esa función, reemplazando el tipo genérico por los tipos concretos.

Esto significa que el uso de genéricos en Rust es una **abstracción de coste cero** (*zero-cost abstraction*). El código resultante que se ejecuta en tu servidor es exactamente el mismo, e igual de rápido, que si hubieras escrito funciones duplicadas manualmente para cada tipo. El único "costo" es que el tamaño del binario final puede ser ligeramente mayor y el tiempo de compilación puede extenderse (profundizaremos en cómo el compilador maneja esto a nivel de LLVM en el Capítulo 45).

## 7.2 Traits: Definiendo comportamiento compartido

En la sección anterior, vimos cómo los genéricos nos permiten escribir código que acepta cualquier tipo `T`. Sin embargo, en el mundo real del backend, rara vez queremos aceptar *literalmente cualquier cosa*.

Si estamos escribiendo una función genérica que guarda un registro en una base de datos o lo almacena en Redis, necesitamos que ese tipo `T` tenga ciertas capacidades: debe saber cómo convertirse en una cadena de texto, o cómo extraer un identificador único. Aquí es donde entran los **Traits**.

Un `trait` (rasgo) en Rust es una forma de definir un comportamiento compartido. Si vienes de lenguajes como Java, C# o TypeScript, puedes pensar en los *traits* como el equivalente a las **interfaces**, aunque en Rust tienen capacidades mucho más potentes.

### Definiendo un Trait

Supongamos que estamos construyendo un sistema de caché para nuestra API. Necesitamos que diferentes entidades (usuarios, productos, sesiones) puedan generar una clave única para ser almacenadas en Redis. Podemos definir un comportamiento compartido llamado `Cacheable`.

```rust
// Definimos el trait y las firmas de los métodos que lo componen
pub trait Cacheable {
    // Cualquier tipo que implemente este trait DEBE definir cómo generar su clave
    fn cache_key(&self) -> String;
    
    // También podemos proporcionar implementaciones por defecto
    fn ttl_seconds(&self) -> u32 {
        3600 // Por defecto, 1 hora de caché si el tipo no lo sobreescribe
    }
}
```

### Implementando un Trait para un Tipo Concreto

Una vez definido el comportamiento, podemos "enseñarle" a nuestros structs cómo cumplir con este contrato utilizando la sintaxis `impl Trait for Tipo`.

```rust
pub struct User {
    pub id: uuid::Uuid,
    pub username: String,
}

pub struct Session {
    pub token: String,
    pub is_active: bool,
}

// Implementamos el trait para User
impl Cacheable for User {
    fn cache_key(&self) -> String {
        format!("user:{}", self.id)
    }
    // No implementamos ttl_seconds, por lo que hereda el valor por defecto (3600)
}

// Implementamos el trait para Session
impl Cacheable for Session {
    fn cache_key(&self) -> String {
        format!("session:{}", self.token)
    }

    // Sobreescribimos el comportamiento por defecto
    fn ttl_seconds(&self) -> u32 {
        86400 // Las sesiones duran 24 horas en caché
    }
}
```

### Traits como Parámetros (La sintaxis `impl Trait`)

El verdadero poder de los traits se revela cuando los combinamos con funciones. Ahora podemos escribir una función en nuestro servicio de caché que no dependa de un tipo concreto, sino de **cualquier tipo que garantice tener el comportamiento** `Cacheable`.

```rust
// Esta función acepta CUALQUIER tipo que implemente Cacheable
pub fn save_to_redis(item: &impl Cacheable) {
    let key = item.cache_key();
    let ttl = item.ttl_seconds();
    
    // Lógica imaginaria de conexión a Redis...
    println!("Ejecutando: SETEX {} {} <data>", key, ttl);
}

fn main() {
    let current_user = User {
        id: uuid::Uuid::new_v4(),
        username: String::from("backend_ninja"),
    };

    // Funciona perfectamente
    save_to_redis(&current_user); 
}
```

La sintaxis `item: &impl Cacheable` es en realidad "azúcar sintáctico" para una característica más avanzada llamada *Trait Bounds*, que exploraremos a fondo en la siguiente sección.

### La Regla del Huérfano (Orphan Rule)

Como desarrollador backend en Rust, pronto te encontrarás queriendo implementar un trait de una librería externa en un struct de otra librería externa. Por ejemplo, podrías querer implementar el trait `Display` de la Standard Library para el tipo `DateTime` de la librería `chrono`.

El compilador de Rust te detendrá con un error. Esto se debe a la **Regla del Huérfano**, la cual dicta que solo puedes implementar un trait para un tipo si:

1. El **trait** fue definido en tu propio crate (tu proyecto).
2. El **tipo** fue definido en tu propio crate.

Esta regla existe para evitar el caos. Si dos librerías diferentes decidieran implementar `Display` para `DateTime`, el compilador no sabría cuál versión utilizar en tu aplicación. Para solucionar esto cuando ocurre, solemos recurrir al **Patrón Newtype** (que veremos en el Capítulo 28), envolviendo el tipo externo en un struct propio.

### Traits Derivados Automáticamente (`#[derive]`)

A lo largo del libro has visto anotaciones como `#[derive(Debug, Clone, Serialize)]` encima de tus structs. `Debug`, `Clone` y `Serialize` no son magia; son simplemente traits.

Rust proporciona una macro especial llamada `derive` que puede generar automáticamente la implementación de ciertos traits estándar si todos los campos internos de tu struct también los implementan. Es una herramienta indispensable para reducir el código repetitivo (*boilerplate*) en la capa de dominio de tu aplicación.

## 7.3 Trait Bounds y el uso de `where`

En la sección 7.1 exploramos cómo los genéricos (`<T>`) nos permiten escribir código flexible. En la 7.2, vimos cómo los Traits definen un comportamiento o "contrato" específico. Ahora, vamos a unir ambos conceptos.

En el desarrollo backend, rara vez nos sirve un genérico puro que acepte "cualquier cosa". Si queremos escribir una función que convierta un dato a JSON para una respuesta HTTP, ese tipo `T` debe saber cómo serializarse. Si queremos registrar un error en nuestros logs, el tipo `E` debe poder formatearse como texto.

Aquí es donde entran los **Trait Bounds** (Límites o Restricciones de Traits). Nos permiten decirle al compilador: *"Acepto cualquier tipo `T`, **siempre y cuando** implemente este Trait específico"*.

### Sintaxis básica de Trait Bounds

Recordemos la sintaxis de la sección anterior usando `impl Trait` como parámetro:

```rust
pub fn log_cache_event(item: &impl Cacheable) {
    println!("Cacheando: {}", item.cache_key());
}
```

Esta sintaxis es en realidad "azúcar sintáctico" (una forma abreviada) para la sintaxis real de los Trait Bounds. Bajo el capó, Rust lo traduce a esto:

```rust
pub fn log_cache_event<T: Cacheable>(item: &T) {
    println!("Cacheando: {}", item.cache_key());
}
```

Al declarar `<T: Cacheable>`, estamos estableciendo un límite. Si intentas pasar un tipo que no implementa `Cacheable` a esta función, el código simplemente no compilará. Esto es lo que hace a Rust tan seguro: los errores de contratos se detectan en tiempo de compilación, no cuando tu servidor en producción intenta ejecutar el código.

### Múltiples Trait Bounds con el operador `+`

A menudo, un solo comportamiento no es suficiente. Imagina que estás construyendo un *worker* en segundo plano (background job) que procesa tareas. Necesitas que el payload de la tarea pueda ser clonado (para reintentos en caso de fallo) y también que pueda ser depurado (para imprimirlo en los logs).

Puedes requerir múltiples Traits usando el operador `+`:

```rust
use std::fmt::Debug;

// T debe implementar TANTO Clone COMO Debug
pub fn process_background_job<T: Clone + Debug>(payload: T) {
    let retry_payload = payload.clone(); // Válido gracias a `Clone`
    
    println!("Procesando tarea: {:?}", payload); // Válido gracias a `Debug`
    
    // Lógica del worker...
}
```

### La cláusula `where`: Manteniendo la cordura en el código

A medida que tu arquitectura se vuelve más compleja, las firmas de tus funciones pueden convertirse en un caos ilegible si usas la sintaxis en línea.

Imagina un repositorio genérico para tu base de datos que acepta un tipo de entidad `T` y un tipo de identificador `ID`. `T` debe ser serializable e imprimible, y el `ID` debe ser clonable, comparable y poder convertirse a texto.

Usando la sintaxis en línea, se vería así de abrumador:

```rust
// ❌ Difícil de leer
pub fn fetch_and_serialize<T: Serialize + Debug, ID: Clone + PartialEq + ToString>(id: ID) -> Option<T> {
    // ...
}
```

Para resolver esto, Rust proporciona la cláusula **`where`**. Esta nos permite extraer los Trait Bounds fuera de los corchetes angulares y colocarlos justo antes del bloque de código, mejorando drásticamente la legibilidad:

```rust
// ✅ Mucho más limpio y mantenible
pub fn fetch_and_serialize<T, ID>(id: ID) -> Option<T>
where
    T: Serialize + Debug,
    ID: Clone + PartialEq + ToString,
{
    // Lógica para buscar en la DB por ID y devolver la entidad T
    // ...
    None
}
```

### `where` en implementaciones de Structs Genéricos

El uso de `where` brilla especialmente cuando implementamos métodos para *structs* genéricos complejos. Es un patrón estándar en Rust aislar las restricciones en el bloque `impl`.

Por ejemplo, al diseñar un manejador de eventos genérico en una arquitectura *Event-Driven*:

```rust
pub struct EventPublisher<E, C> {
    event: E,
    client: C,
}

// Aplicamos los límites usando `where` para definir qué capacidades
// necesitan E (Event) y C (Client) para que este bloque impl exista.
impl<E, C> EventPublisher<E, C>
where
    E: Serialize + Clone,
    C: HttpClient + Send + Sync, // Send y Sync son vitales en concurrencia (Capítulo 14)
{
    pub async fn publish(&self) -> Result<(), String> {
        let payload = serde_json::to_string(&self.event).unwrap();
        
        self.client.post("/events", payload).await
    }
}
```

En este ejemplo de nivel backend, le estamos diciendo a Rust: *"Este publicador de eventos solo puede usar el método `publish` si el evento puede serializarse, y si el cliente HTTP es seguro para ser compartido entre hilos (Send + Sync)"*.

### Condicionamiento de Métodos basado en Bounds

Una de las características más elegantes de Rust es que puedes tener un struct genérico, pero implementar ciertos métodos **solo** para los tipos internos que cumplan ciertas condiciones.

```rust
pub struct Wrapper<T> {
    value: T,
}

// Este método está disponible para CUALQUIER tipo T
impl<T> Wrapper<T> {
    pub fn new(value: T) -> Self {
        Self { value }
    }
}

// Este método SOLO existe si T implementa el trait numérico estándar
impl<T> Wrapper<T> 
where 
    T: std::ops::Add<Output = T> + Copy 
{
    pub fn double(&self) -> T {
        self.value + self.value
    }
}
```

Si creas un `Wrapper<String>`, tendrá el método `new`, pero si intentas llamar a `wrapper.double()`, el compilador emitirá un error indicando que el método no existe para ese tipo específico. Esto permite crear APIs extremadamente seguras y expresivas.

## 7.4 Trait Objects y Dynamic Dispatch (`dyn Trait`)

Hasta ahora, hemos visto cómo los genéricos y la cláusula `where` nos permiten escribir código flexible. Como aprendimos en la sección 7.1, Rust resuelve esto mediante la **monomorfización**: genera copias específicas de la función para cada tipo en tiempo de compilación. A esto se le conoce como **Despacho Estático** (*Static Dispatch*).

El despacho estático es increíblemente rápido, pero tiene una limitación estricta: requiere que el compilador conozca todos los tipos de antemano. ¿Qué sucede cuando necesitamos flexibilidad en **tiempo de ejecución**?

Imagina que estás construyendo un sistema de notificaciones para tu backend. Quieres iterar sobre una lista de diferentes proveedores (Email, SMS, Push) y enviar un mensaje usando cada uno.

Si intentas hacer esto con genéricos estáticos, te encontrarás con un muro:

```rust
// Supongamos que Email y Sms implementan el trait `Notifier`
let email_notifier = Email::new();
let sms_notifier = Sms::new();

// ❌ ESTO NO COMPILA
let notifiers: Vec<impl Notifier> = vec![email_notifier, sms_notifier];
```

El compilador de Rust entrará en pánico. Un `Vec<T>` requiere que todos sus elementos tengan **exactamente el mismo tamaño en memoria**. Un struct `Email` y un struct `Sms` probablemente tengan tamaños distintos. El compilador no puede asignar memoria para un arreglo si no sabe cuánto ocupa cada elemento.

La solución a este problema arquitectónico son los **Trait Objects** y la palabra clave `dyn` (*dynamic*).

### Entendiendo `dyn Trait` y el Despacho Dinámico

Para agrupar tipos diferentes bajo un mismo contrato (Trait), debemos ocultar sus tamaños reales y trabajar con ellos a través de un puntero. Un puntero siempre tiene un tamaño fijo (por ejemplo, 8 bytes en una arquitectura de 64 bits), independientemente de cuán grande sea la estructura a la que apunta.

En Rust, logramos esto utilizando referencias (`&dyn Trait`) o punteros inteligentes como `Box<dyn Trait>` o `Arc<dyn Trait>`.

Aquí está la solución al problema del sistema de notificaciones:

```rust
pub trait Notifier {
    fn send(&self, user_id: &str, message: &str);
}

pub struct EmailNotifier { pub smtp_server: String }
pub struct SmsNotifier { pub api_key: String }

impl Notifier for EmailNotifier {
    fn send(&self, user_id: &str, message: &str) {
        println!("Enviando Email a {}: {}", user_id, message);
    }
}

impl Notifier for SmsNotifier {
    fn send(&self, user_id: &str, message: &str) {
        println!("Enviando SMS a {}: {}", user_id, message);
    }
}

// Ahora usamos Box<dyn Notifier> para nuestro Trait Object
fn broadcast_message(notifiers: &Vec<Box<dyn Notifier>>, user_id: &str, message: &str) {
    for notifier in notifiers {
        // Rust averigua en tiempo de ejecución cuál método `send` llamar
        notifier.send(user_id, message);
    }
}

fn main() {
    // ✅ ESTO SÍ COMPILA
    let mut notifiers: Vec<Box<dyn Notifier>> = Vec::new();
    
    notifiers.push(Box::new(EmailNotifier { smtp_server: "smtp.mail.com".into() }));
    notifiers.push(Box::new(SmsNotifier { api_key: "secret_123".into() }));
    
    broadcast_message(&notifiers, "user_42", "¡Tu pedido ha sido enviado!");
}
```

### ¿Cómo funciona bajo el capó? (La `vtable`)

Como desarrollador senior, es crucial que entiendas el costo de tus abstracciones. Cuando usas `dyn Trait`, Rust implementa el **Despacho Dinámico** (*Dynamic Dispatch*).

En lugar de saber en tiempo de compilación qué función ejecutar, Rust crea una estructura oculta llamada **vtable** (Virtual Method Table) para cada Trait Object. Un Trait Object en Rust es en realidad un "puntero gordo" (*fat pointer*) que contiene dos cosas:

1. Un puntero a los datos reales de la instancia (ej. tu struct `EmailNotifier`).
2. Un puntero a la `vtable`, que contiene las direcciones de memoria de los métodos implementados por ese tipo.

Cuando llamas a `notifier.send(...)`, Rust primero tiene que seguir el puntero a la `vtable`, buscar dónde está el método `send` para ese tipo específico, y *luego* ejecutarlo.

**Trade-offs en el Backend:**

* **Contras:** Esta indirección añade un minúsculo costo de rendimiento (búsqueda en la vtable) y evita que el compilador realice ciertas optimizaciones en línea (*inlining*).
* **Pros:** Reduce drásticamente el tamaño del binario compilado (no hay monomorfización masiva) y te permite diseñar arquitecturas conectables (*pluggables*) y middlewares, esenciales en frameworks web como Actix o Axum. En el 99% del código backend, el costo de la vtable es imperceptible frente a la latencia de red o base de datos.

### La limitación fundamental: Object Safety

Hay una advertencia importante: **no todos los Traits pueden convertirse en Trait Objects**. Para poder usar `dyn MiTrait`, el trait debe ser **"Object Safe"** (Seguro para objetos).

Las dos reglas principales para que un trait sea *Object Safe* son:

1. **No puede devolver `Self`**. (Si el compilador no conoce el tipo subyacente, tampoco sabe qué tamaño de `Self` tiene que retornar).
2. **No puede tener métodos genéricos**.

Si intentas hacer `dyn` con un trait que rompe estas reglas (como `Clone`, que devuelve `Self`), el compilador te lo impedirá con un error de seguridad de objetos.
