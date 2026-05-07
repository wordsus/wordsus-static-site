Bienvenido al núcleo de la expresividad en Rust. Si los tipos primitivos son los ladrillos, este capítulo trata sobre la arquitectura que permite construir estructuras complejas y resistentes. Aquí exploraremos cómo los **Structs** permiten agrupar datos con nombre, mientras que los **Enums** y el patrón **ADT** nos otorgan la capacidad de modelar la incertidumbre y diversas variantes de forma segura. Aprenderás a dotar de vida a estos datos mediante bloques `impl` y a extraer información con la precisión quirúrgica del **Pattern Matching**. Dominar estas herramientas es el primer paso para escribir backend robusto donde "si compila, funciona".

## 3.1 Structs y sus variantes

En el desarrollo backend, la capacidad de modelar el dominio de tu aplicación de forma precisa es fundamental. Ya sea que estés representando un registro de una base de datos, el *payload* de una petición HTTP o la configuración interna de tu servidor, necesitas agrupar datos relacionados bajo un mismo paraguas semántico. Aquí es donde entran los **Structs** (estructuras).

A diferencia de las tuplas (que vimos en el Capítulo 2), los structs te permiten nombrar cada pieza de dato, lo que aporta claridad y seguridad de tipos. En Rust, existen tres variantes de structs, cada una diseñada para resolver un problema de modelado específico: los structs clásicos, los structs de tupla y los structs unitarios.

### 1. Structs Clásicos (con campos nombrados)

Esta es la forma más común y se asemeja a las clases de atributos de lenguajes orientados a objetos o a las estructuras de C. Se definen utilizando la palabra clave `struct` seguida de un nombre (en *PascalCase* por convención) y un bloque con llaves que contiene los campos y sus tipos.

```rust
// Definición de un struct clásico
pub struct User {
    pub id: u64,
    pub username: String,
    pub email: String,
    pub active: bool,
}
```

*Nota sobre la visibilidad:* En Rust, todo es privado por defecto. Si estás diseñando un módulo de dominio, deberás usar la palabra clave `pub` tanto en el struct como en los campos que desees exponer al exterior. 

**Instanciación y atajos**

Para crear una instancia de un struct, debes proveer valores concretos para *todos* sus campos. Rust no permite campos no inicializados ni valores nulos implícitos.

```rust
let mut admin = User {
    id: 1,
    username: String::from("admin_root"),
    email: String::from("admin@empresa.com"),
    active: true,
};

// Acceso y modificación mediante notación de punto
admin.active = false; 
```

Es crucial entender que **la mutabilidad en Rust es una propiedad de la variable (el *binding*), no del campo**. No puedes marcar un campo específico dentro del struct como `mut`; si la instancia `admin` es inmutable, todos sus campos lo serán.

Rust ofrece azúcar sintáctico para hacer la inicialización más ergonómica. Si tienes variables en tu *scope* local cuyos nombres coinciden con los campos del struct, puedes usar el **atajo de inicialización de campos** (*field init shorthand*):

```rust
fn create_user(id: u64, email: String) -> User {
    let username = String::from("usuario_nuevo");
    
    User {
        id,          // Equivalente a id: id
        username,    // Equivalente a username: username
        email,       // Equivalente a email: email
        active: true,
    }
}
```

Además, en arquitecturas backend es muy común crear una nueva instancia basándose en una existente, modificando solo un par de campos. Rust facilita esto con la **sintaxis de actualización de structs** (`..`):

```rust
let user1 = create_user(1, String::from("user1@test.com"));

// Creamos user2 copiando la mayoría de los datos de user1
let user2 = User {
    id: 2,
    email: String::from("user2@test.com"),
    ..user1 // Los campos restantes (username, active) se toman de user1
};
```
*(Atención: Ten en cuenta que si `user1` tuviera campos que no implementan el trait `Copy`, como el `String` de `username`, usar `..user1` movería esos datos, invalidando `user1` para usos posteriores. Profundizaremos en estas mecánicas de movimiento en el Capítulo 4).*

### 2. Structs de Tupla (Tuple Structs)

Los structs de tupla son un híbrido entre una tupla estándar y un struct clásico. Tienen un nombre que define un tipo único en el sistema, pero sus campos no tienen nombre, solo un tipo. Se acceden mediante índices (0, 1, 2...).

Son extremadamente útiles cuando quieres darle un significado semántico a una tupla, o cuando quieres crear tipos fuertemente tipados a partir de primitivas.

```rust
// Definición de structs de tupla
struct Ipv4Addr(u8, u8, u8, u8);
struct StatusCode(u16);

// Instanciación
let localhost = Ipv4Addr(127, 0, 0, 1);
let not_found = StatusCode(404);

// Acceso por índice
let port = not_found.0;
```

Aunque `StatusCode` solo contiene un `u16`, para el compilador de Rust `StatusCode` y `u16` son tipos completamente distintos. Esto es la base del **Patrón Newtype** (que abordaremos en el Capítulo 28), una técnica esencial en el backend para evitar, por ejemplo, pasar accidentalmente el ID de un usuario a una función que esperaba el ID de un producto, a pesar de que ambos sean un `u64` por debajo.

### 3. Structs Unitarios (Unit-like Structs)

La tercera variante son los structs que no tienen ningún campo. Se asemejan al tipo unitario `()` de Rust.

```rust
struct StatelessHandler;
```

A primera vista pueden parecer inútiles al no almacenar datos, pero son piezas clave en el diseño de software avanzado en Rust. Se utilizan principalmente en dos escenarios:
1.  **Marcadores de estado:** Útiles en el patrón *Typestate*, donde utilizas diferentes tipos en tiempo de compilación para representar los estados de una máquina de estados.
2.  **Implementación de Traits sin estado:** Cuando necesitas definir un comportamiento (métodos) sobre un tipo para cumplir con un contrato (un Trait), pero ese comportamiento no requiere almacenar ninguna variable interna.

En la siguiente sección, expandiremos nuestra capacidad de modelado introduciendo los Enums, los cuales, combinados con los Structs, forman la base de los Tipos de Datos Algebraicos (ADT) que hacen tan poderoso y seguro al modelado de dominio en Rust.

## 3.2 Enums y el patrón de diseño Algebraic Data Types (ADT)

Si en la sección anterior vimos que los *Structs* nos permiten agrupar datos simultáneos (un usuario tiene un ID **y** un nombre **y** un email), los **Enums** (enumeraciones) nos permiten modelar datos mutuamente excluyentes: un valor puede ser esto **o** aquello.

En muchos lenguajes tradicionales como C, Java o Go, un enum no es más que un conjunto de constantes enteras con nombres descriptivos. En Rust, los enums son infinitamente más potentes. Constituyen la mitad de un concepto proveniente de la programación funcional y la teoría de tipos conocido como **Algebraic Data Types (ADT)** o Tipos de Datos Algebraicos.

### El álgebra de los tipos: Sumas y Productos

Para entender por qué Rust es tan estricto y seguro modelando el dominio, ayuda entender la base matemática de los ADT:

* **Tipos Producto (Structs):** El número de estados posibles de un struct es el *producto* de los estados de sus campos. Si tienes un struct con dos booleanos (2 valores cada uno), el struct tiene $2 \times 2 = 4$ estados posibles. Juntan información (A **y** B).
* **Tipos Suma (Enums):** El número de estados posibles de un enum es la *suma* de los estados de sus variantes. Expresan alternativas (A **o** B).

Esta capacidad de expresar un "O" lógico a nivel de sistema de tipos es una de las herramientas más fuertes para un desarrollador backend, ya que permite **hacer que los estados inválidos sean imposibles de representar en tiempo de compilación**.

### Enums que transportan datos

La verdadera magia de los enums en Rust radica en que cada variante puede contener distintos tipos y cantidades de datos. Una variante puede ser unitaria (sin datos), una tupla o incluso un struct clásico.

Imagina que estás construyendo un sistema de procesamiento de pagos. Un pago puede estar pendiente, haber sido procesado con una cantidad específica, o haber fallado con un motivo.

```rust
// Definición de un Enum modelando un dominio complejo
pub enum PaymentState {
    // Variante unitaria (sin datos adicionales)
    Pending,
    
    // Variante de tupla (almacena un f64 y un String para la moneda)
    Processed(f64, String),
    
    // Variante de struct (campos nombrados para mayor claridad)
    Failed {
        error_code: u16,
        reason: String,
        retryable: bool,
    },
}
```

En lenguajes sin ADTs, normalmente modelarías esto con una clase gigante que contiene todos los campos (`amount`, `currency`, `error_code`, etc.) y dependerías de la lógica de negocio (y de la disciplina del programador) para no leer el `error_code` si el estado es `Processed`. 

En Rust, el compilador garantiza que si el estado es `PaymentState::Processed`, los campos `error_code` y `reason` literalmente no existen en ese contexto. No puedes acceder a ellos por error.

### Comportamiento en Memoria (Bajo el capó)

A nivel de arquitectura, es útil saber cómo maneja Rust esto en memoria. Un enum ocupa, por regla general, **el tamaño de su variante más grande, más un byte adicional** (llamado *discriminante* o *tag*) que le indica a Rust qué variante está activa en ese momento.

Si tienes una variante que ocupa 8 bytes y otra que ocupa 100 bytes, cualquier instancia de ese enum ocupará al menos 101 bytes en la pila (*stack*). Esto es algo a tener en cuenta en sistemas de alto rendimiento para evitar desperdiciar memoria caché del procesador, un tema que exploraremos a fondo en el Capítulo 46.

### Uso en el Backend (Casos comunes)

Verás este patrón constantemente a lo largo del libro. Algunos usos clásicos en el desarrollo de APIs y sistemas distribuidos incluyen:

1.  **Eventos de Dominio:** En arquitecturas orientadas a eventos (Event Sourcing), un enum puede representar de forma segura cualquier evento que haya ocurrido en el sistema (`UserCreated`, `EmailUpdated`, `AccountDeleted`).
2.  **Manejo de Errores:** Como veremos en el Capítulo 5, el manejo de errores en Rust se basa en el enum `Result<T, E>`, que modela el hecho de que una operación solo puede ser un éxito (`Ok(T)`) **o** un error (`Err(E)`).
3.  **Estados de Websockets o Conexiones:** Para definir si una conexión TCP está `Connecting`, `Established(Stream)` o `Disconnected(Reason)`.

Para interactuar con los datos que viven "dentro" de las variantes de un enum, Rust utiliza una técnica llamada **Pattern Matching** (que cubriremos en la sección 3.4). Pero antes de llegar a la extracción de datos, necesitamos saber cómo dotar de comportamiento a estos Structs y Enums que acabamos de crear.

## 3.3 Implementación de métodos con `impl`

En lenguajes orientados a objetos tradicionales (como Java, C# o Python), los datos (atributos) y el comportamiento (métodos) conviven dentro de una misma `class`. Rust toma un camino diferente que favorece la separación de responsabilidades: **definimos la estructura de los datos por un lado (con `struct` o `enum`), y definimos su comportamiento en bloques separados utilizando la palabra clave `impl`** (implementación).

Esta separación no solo hace que el código sea más modular, sino que permite extender tipos con nuevos comportamientos en diferentes partes de tu aplicación mediante *Traits* (algo que veremos a fondo en el Capítulo 7).

Para dotar de comportamiento a nuestros tipos, abrimos un bloque `impl` seguido del nombre del `struct` o `enum`. Dentro de este bloque, podemos definir dos tipos de funciones: **Funciones Asociadas** y **Métodos**.

### 1. Funciones Asociadas (Constructores y utilidades)

Las funciones asociadas están ligadas al tipo en sí, no a una instancia específica del tipo. Se comportan de manera similar a los métodos estáticos (`static`) en otros lenguajes. 

El uso más común en el backend para una función asociada es actuar como un **constructor**. A diferencia de otros lenguajes, Rust no tiene la palabra clave `new`; por convención, los desarrolladores de Rust crean una función asociada llamada `new` que retorna una instancia del tipo.

```rust
pub struct UserSession {
    user_id: u64,
    token: String,
    is_active: bool,
}

impl UserSession {
    // Función asociada: No recibe 'self' como parámetro.
    // 'Self' (con mayúscula) es un alias al tipo actual (UserSession).
    pub fn new(user_id: u64, token: String) -> Self {
        Self {
            user_id,
            token,
            is_active: true, // Por defecto, una sesión nueva está activa
        }
    }
}
```

Para llamar a una función asociada, utilizamos el operador de resolución de ámbito `::` (doble dos puntos):

```rust
let session = UserSession::new(42, String::from("jwt_token_xyz"));
```

### 2. Métodos y el parámetro `self`

Los métodos son funciones que operan sobre una instancia específica del tipo. Para que una función dentro de un bloque `impl` se convierta en un método, **su primer parámetro debe ser siempre `self`**. 

Aquí es donde Rust te obliga a pensar explícitamente en cómo tu método interactúa con la memoria. Existen tres formas principales de pasar `self`, las cuales sirven de preámbulo perfecto para las reglas de *Ownership y Borrowing* que dominaremos en el Capítulo 4:

* **`&self` (Préstamo inmutable):** El método necesita leer los datos de la instancia, pero no los va a modificar. Es la opción por defecto y la más segura.
* **`&mut self` (Préstamo mutable):** El método necesita modificar los datos internos de la instancia. Requiere que la variable original haya sido declarada con `mut`.
* **`self` (Toma de propiedad / Consumo):** El método toma posesión total de la instancia. Al terminar de ejecutarse el método, la instancia original es destruida (liberada de la memoria) y ya no podrá usarse. Esto es muy útil para patrones de transformación de tipos (como convertir un `Builder` en el tipo final).

Veamos cómo se aplican en la práctica extendiendo nuestro `UserSession`:

```rust
impl UserSession {
    // ... (aquí estaría la función new() que definimos antes) ...

    // 1. Método con &self: Solo lectura
    pub fn is_valid(&self) -> bool {
        self.is_active && !self.token.is_empty()
    }

    // 2. Método con &mut self: Modificación del estado
    pub fn invalidate(&mut self) {
        self.is_active = false;
        // Podríamos limpiar el token por seguridad
        self.token.clear(); 
    }

    // 3. Método con self (consume la instancia)
    // Extrae el ID y destruye la sesión, evitando que se use después
    pub fn into_user_id(self) -> u64 {
        self.user_id
    }
}
```

Para invocar estos métodos, utilizamos la familiar notación de punto (`.`):

```rust
let mut my_session = UserSession::new(101, String::from("token_abc"));

// Llama al método &self
if my_session.is_valid() {
    println!("Sesión válida.");
}

// Llama al método &mut self (requiere que 'my_session' sea mut)
my_session.invalidate();

// Llama al método self (consume la variable)
let id = my_session.into_user_id();

// ¡ERROR DE COMPILACIÓN! my_session ya no existe aquí porque 'into_user_id' la consumió.
// println!("Estado: {}", my_session.is_valid()); 
```

### Múltiples bloques `impl`

Una característica organizativa interesante de Rust es que te permite abrir múltiples bloques `impl` para el mismo tipo. Aunque puedes poner todo en uno solo, separarlos puede ayudar a agrupar lógicas relacionadas de manera más limpia, especialmente en structs muy grandes que manejan diversas responsabilidades.

```rust
// Lógica de ciclo de vida
impl UserSession {
    pub fn new(...) -> Self { ... }
    pub fn invalidate(&mut self) { ... }
}

// Lógica de validación pura
impl UserSession {
    pub fn is_valid(&self) -> bool { ... }
    pub fn has_admin_privileges(&self) -> bool { ... }
}
```

A este punto, ya sabemos cómo estructurar datos (Structs/Enums) y cómo darles comportamiento (`impl`). Pero cuando tratamos con tipos algebraicos (como los Enums complejos de la sección anterior), necesitamos una forma ergonómica y exhaustiva de desempaquetar la información que contienen en tiempo de ejecución. 

## 3.4 Pattern Matching avanzado con `match` e `if let`

En las secciones anteriores construimos un modelo de dominio robusto utilizando Structs y Enums (ADTs). Sin embargo, encapsular datos en un enum de poco sirve si no podemos extraerlos y operar con ellos de forma segura en tiempo de ejecución. En lenguajes clásicos, esto se suele hacer mediante comprobaciones de tipo en tiempo de ejecución (como `instanceof` en Java) y conversiones (*casting*). Rust elimina por completo esa inseguridad mediante el **Pattern Matching** (coincidencia de patrones).

El pattern matching en Rust no es solo una estructura de control de flujo; es un mecanismo de **desestructuración**. Permite "abrir" los tipos de datos, comprobar su forma y extraer sus valores internos en una sola operación segura.

### 1. El poder y la exhaustividad de `match`

El operador `match` es similar a un `switch` tradicional, pero con esteroides. Compara un valor contra una serie de patrones y ejecuta el código asociado al primer patrón que coincida. 

La característica más importante de `match` para un desarrollador backend es su **exhaustividad**. El compilador de Rust te obligará a manejar *todos* los casos posibles. Si añades una nueva variante a tu enum en el futuro, el código no compilará hasta que actualices todos los bloques `match` del proyecto que lo utilicen, eliminando categorías enteras de bugs en refactorizaciones.

Retomemos nuestro enum `PaymentState` de la sección 3.2 para ver cómo se desestructura:

```rust
pub enum PaymentState {
    Pending,
    Processed(f64, String),
    Failed { error_code: u16, reason: String, retryable: bool },
}

fn handle_payment(state: PaymentState) {
    match state {
        // Coincidencia exacta sin extraer datos
        PaymentState::Pending => {
            println!("El pago está en la cola.");
        }
        
        // Desestructuración de una tupla. Asignamos variables locales.
        PaymentState::Processed(amount, currency) => {
            println!("Procesado exitosamente: {} {}", amount, currency);
            // Aquí 'amount' y 'currency' están disponibles en este scope
        }
        
        // Desestructuración de un struct.
        PaymentState::Failed { error_code, reason, retryable } => {
            println!("Error {}: {}", error_code, reason);
            if retryable {
                println!("Reencolando el pago...");
            }
        }
    }
}
```

### 2. Ignorando valores y el uso de Match Guards

En ocasiones, un enum o un struct contiene más información de la que necesitas en un contexto determinado. Rust proporciona comodines para ignorar partes del patrón:

* **`_` (Guión bajo):** Ignora un único valor o sirve como caso por defecto (*catch-all*).
* **`..` (Puntos suspensivos):** Ignora el resto de los campos de un struct o tupla.

Además, puedes refinar tus patrones utilizando **Match Guards** (guardas de coincidencia), que son condiciones `if` adicionales que deben cumplirse para que el patrón sea seleccionado. Esto es ideal para aplicar lógica de negocio directamente en el flujo de control:

```rust
fn evaluate_failure(state: PaymentState) {
    match state {
        // Usamos un Match Guard para capturar un código específico
        PaymentState::Failed { error_code: 500, .. } => {
            println!("Fallo interno del servidor de pagos. Alerta al equipo.");
        }
        
        // Ignoramos 'reason' con '_' pero usamos 'retryable' en el guard
        PaymentState::Failed { error_code, reason: _, retryable } if retryable == true => {
            println!("Fallo temporal (código {}). Reintentando...", error_code);
        }
        
        // Atrapa cualquier otro error
        PaymentState::Failed { error_code, .. } => {
            println!("Error fatal no reintentable: {}", error_code);
        }
        
        // El caso por defecto para todo lo que NO sea un error
        _ => {
            println!("El estado no es un fallo.");
        }
    }
}
```

### 3. Concisión y pragmatismo con `if let`

Aunque `match` es increíblemente seguro, a veces resulta demasiado verboso. Si tienes un enum con múltiples variantes pero *solo* te interesa una de ellas, escribir un `match` con un brazo `_ => ()` puede ensuciar el código.

Para estos casos de uso unidireccional, Rust ofrece la sintaxis **`if let`**. Combina la comprobación de la condición y la asignación de variables en una sola línea.

Imagina que estás validando cabeceras HTTP y tienes un enum `AuthHeader`:

```rust
enum AuthHeader {
    Bearer(String),
    Basic(String, String),
    None,
}

let header = AuthHeader::Bearer(String::from("jwt_token_123"));

// Usando 'match' (verboso):
match &header {
    AuthHeader::Bearer(token) => println!("Token recibido: {}", token),
    _ => (), // No hacemos nada en los demás casos
}

// Usando 'if let' (idiomático y conciso):
if let AuthHeader::Bearer(token) = &header {
    println!("Token recibido: {}", token);
} else {
    // También soporta 'else' de forma opcional
    println!("No se proporcionó un token Bearer.");
}
```

*Nota para desarrolladores backend:* Verás `if let` (y su hermano `while let` para bucles) constantemente al trabajar con bases de datos o al analizar respuestas JSON, especialmente para manejar valores opcionales, un concepto que cubriremos a fondo al estudiar el enum `Option<T>` en el Capítulo 6.
