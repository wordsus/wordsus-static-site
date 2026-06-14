Tras configurar el entorno, es hora de profundizar en los átomos de Rust. En el backend, la precisión es ley: un puerto es un entero, un estado es un booleano y un buffer es un arreglo. Este capítulo desglosa cómo Rust gestiona la memoria y el flujo de ejecución mediante un sistema de tipos estricto pero predecible. Aprenderás por qué la inmutabilidad es la configuración sensata para sistemas concurrentes, cómo el *shadowing* limpia tu lógica de transformación y de qué manera las expresiones —el motor real de Rust— reemplazan a las sentencias tradicionales para escribir código más expresivo, seguro y libre de efectos secundarios.

## 2.1 Variables, inmutabilidad por defecto y shadowing

Cuando llegas a Rust desde lenguajes como Python, JavaScript, Go o Java, una de las primeras fricciones conceptuales que encuentras es cómo se maneja el estado. En la mayoría de los lenguajes populares, cuando declaras una variable, asumes que puedes cambiar su valor más adelante. Rust invierte esta lógica: **por defecto, todas las variables son inmutables**.

Esta no es una decisión arbitraria o puramente académica. Para un desarrollador backend, la inmutabilidad por defecto elimina categorías enteras de bugs relacionados con la concurrencia y los efectos secundarios inesperados. Si una variable es inmutable, puedes pasarla entre diferentes hilos de ejecución con la certeza absoluta de que ninguno alterará su valor por debajo de la mesa.

### Declaración e Inmutabilidad

Para declarar una variable en Rust, utilizamos la palabra clave `let`. Gracias a la potente inferencia de tipos del compilador, a menudo no necesitas especificar el tipo de dato explícitamente (los tipos los profundizaremos en la siguiente sección).

Veamos qué sucede cuando intentamos reasignar una variable por defecto:

```rust
fn main() {
    let active_connections = 100;
    println!("Conexiones activas: {}", active_connections);
    
    // Si intentamos hacer esto, el código NO compilará.
    // active_connections = 150; 
}
```

Si descomentas la última línea, el compilador de Rust (tu nuevo mejor amigo, aunque al principio parezca un crítico estricto) arrojará un error claro: `cannot assign twice to immutable variable`.

Rust te obliga a ser explícito si deseas que el valor de una variable cambie a lo largo del tiempo. Para ello, debes añadir la palabra clave `mut` (de *mutable*) justo después de `let`:

```rust
fn main() {
    let mut active_connections = 100;
    println!("Conexiones activas iniciales: {}", active_connections);
    
    active_connections = 150;
    println!("Conexiones activas actualizadas: {}", active_connections);
}
```

Al obligarte a marcar explícitamente qué partes de tu estado van a cambiar, Rust hace que el código sea mucho más fácil de leer y auditar. Si ves un `let` sin `mut`, sabes inmediatamente que ese valor representa una constante en el flujo de esa función.

> **Nota sobre las constantes:** Aunque las variables inmutables no pueden cambiar, no son exactamente lo mismo que las constantes reales en Rust. Las constantes se declaran con `const` en lugar de `let`, *siempre* requieren que anotes su tipo, pueden declararse en el scope global y se evalúan en tiempo de compilación.

### Shadowing (Sombreado de variables)

Existe una técnica en Rust que a menudo sorprende a los recién llegados, pero que se convierte en una herramienta indispensable: el **Shadowing** o sombreado.

El shadowing consiste en volver a declarar una variable con el *mismo nombre* utilizando nuevamente la palabra clave `let`. Al hacer esto, la nueva variable "ensombrece" (oculta) a la anterior.

```rust
fn main() {
    let port = 8080;
    
    // Hacemos shadowing sumando 1 al valor anterior
    let port = port + 1;

    {
        // El shadowing también respeta los scopes (bloques de código)
        let port = port * 2;
        println!("El puerto en el scope interno es: {}", port); // Imprime 16162
    }

    println!("El puerto en el scope principal es: {}", port); // Imprime 8081
}
```

**¿Por qué usar Shadowing en lugar de `mut`?**

Como desarrollador backend, te encontrarás constantemente procesando datos: leyendo un input, validándolo, transformándolo y guardándolo. El shadowing brilla en dos escenarios principales:

1. **Transformaciones inmutables:** Te permite realizar transformaciones sobre un valor sin tener que hacer la variable mutable. Una vez que la transformación (el shadowing) se ha completado, la variable resultante sigue siendo inmutable, protegiéndote de cambios accidentales posteriores.
2. **Cambio de tipo de dato:** A diferencia de `mut` (que te permite cambiar el *valor* pero no el *tipo* de la variable), el shadowing te permite reutilizar el mismo nombre conceptual aunque el tipo de dato subyacente cambie.

Imagina que recibes de una variable de entorno un límite de peticiones (rate limit) como una cadena de texto, pero necesitas operarlo como un número entero:

```rust
fn main() {
    // Inicialmente es un tipo texto (String/&str)
    let rate_limit = "1000"; 
    
    // Hacemos shadowing para convertirlo a un número (u32).
    // Reutilizamos el nombre 'rate_limit' para no tener que inventar
    // nombres redundantes como 'rate_limit_str' y 'rate_limit_num'.
    let rate_limit: u32 = rate_limit.parse().expect("No es un número válido");

    println!("Límite de peticiones: {}", rate_limit);
}
```

Si hubieras intentado hacer esto usando `mut`, el compilador te habría detenido, ya que no puedes cambiar el tipo de una variable mutable en tiempo de ejecución. El shadowing es la forma idiomática en Rust de decir: *"He terminado con esta versión de los datos, a partir de ahora, cuando hable de esta variable, me refiero a esta nueva forma"*.

## 2.2 Tipos escalares (enteros, flotantes, booleanos, caracteres)

Rust es un lenguaje estáticamente tipado, lo que significa que el compilador debe conocer los tipos de todas las variables en tiempo de compilación. Aunque su motor de inferencia es increíblemente astuto y suele deducir el tipo a partir del valor que asignamos, habrá momentos en los que deberemos ser explícitos.

Un **tipo escalar** representa un único valor. Rust tiene cuatro tipos escalares principales que son los bloques de construcción fundamentales de cualquier aplicación: enteros, números de punto flotante, booleanos y caracteres.

### 1. Enteros (Integers)

Un entero es un número sin componente fraccionario. Rust ofrece una amplia variedad de tamaños estandarizados para los enteros, divididos en dos categorías: con signo (`i`, de *integer*, pueden ser negativos) y sin signo (`u`, de *unsigned*, solo positivos).

| Tamaño | Con signo | Sin signo | Uso común en Backend |
| :--- | :--- | :--- | :--- |
| 8-bit | `i8` | `u8` | Manipulación de bytes, buffers, I/O de red, streams. |
| 16-bit | `i16` | `u16` | Puertos de red (TCP/UDP). |
| 32-bit | `i32` | `u32` | Tipo entero por defecto inferido por Rust. |
| 64-bit | `i64` | `u64` | IDs de bases de datos (BigInt), timestamps (Unix epoch). |
| 128-bit | `i128` | `u128` | Criptografía, identificadores UUID numéricos. |
| Arquitectura | `isize` | `usize` | Índices de colecciones, conteo de memoria. Depende del SO (32 o 64 bits). |

Como desarrollador backend, usar el tipo correcto es crucial para la eficiencia y la seguridad. Por ejemplo, si estás mapeando un ID autoincremental de PostgreSQL (`BIGSERIAL`), la opción correcta en Rust es un `i64`.

**El problema del desbordamiento (Integer Overflow):**
¿Qué pasa si tienes un `u8` (cuyo límite es 255) y le sumas 1? En lenguajes como C, esto causa un comportamiento indefinido o da la vuelta a 0 silenciosamente. En Rust, el comportamiento depende del perfil de compilación:

* En modo **Debug** (`cargo build`), Rust inserta comprobaciones y hará *panic* (detendrá el programa) si ocurre un overflow.
* En modo **Release** (`cargo build --release`), Rust realiza un "wrap around" (255 + 1 se convierte en 0) sin hacer *panic*. Si necesitas un comportamiento de envoltura explícito, Rust provee métodos como `wrapping_add`.

```rust
fn main() {
    // Especificando el tipo explícitamente mediante sufijos
    let max_connections = 10_000u32; // El guion bajo mejora la legibilidad
    
    // Inferencia de tipo (el compilador asume i32 por defecto)
    let default_port = 8080; 

    // usize es obligatorio para indexar arreglos y vectores
    let active_workers: usize = 4;
    println!("Workers: {}, Puerto: {}", active_workers, default_port);
}
```

### 2. Números de punto flotante (Floats)

Para los números con decimales, Rust implementa el estándar IEEE-754 con dos tipos:

* `f32`: Precisión simple (32 bits).
* `f64`: Precisión doble (64 bits).

Por defecto, si escribes un número con decimales, Rust infiere `f64` porque en los procesadores modernos la penalización de rendimiento respecto a `f32` es casi nula, pero la ganancia en precisión matemática es significativa.

> **Advertencia de Arquitectura:** En el desarrollo backend, **nunca** uses `f32` o `f64` para representar dinero o divisas. Los flotantes sufren de problemas de precisión en base 2 (por ejemplo, `0.1 + 0.2` no es exactamente `0.3`). Para finanzas, utiliza crates especializados como `rust_decimal` que implementan precisión aritmética exacta.

```rust
fn main() {
    let latency_ms = 12.5; // f64 por defecto
    let cpu_temperature: f32 = 45.2; // f32 explícito
}
```

### 3. Booleanos

El tipo `bool` tiene dos valores posibles: `true` y `false`. Ocupan exactamente un byte de memoria. Son fundamentales para el control de flujo y la lógica de negocio.

```rust
fn main() {
    let is_authenticated = true;
    let has_admin_privileges: bool = false; // Anotación explícita
}
```

### 4. Caracteres (char)

Aquí es donde Rust se diferencia enormemente de lenguajes como C o C++. En Rust, el tipo `char` (que se especifica con comillas simples `''`) no ocupa 1 byte, sino **4 bytes**.

Esto se debe a que un `char` en Rust representa un **Valor Escalar Unicode**. Puede representar desde letras ASCII tradicionales, pasando por caracteres acentuados, cirílico, hasta emojis completos.

```rust
fn main() {
    let ascii_char = 'A';
    let emoji = '🚀'; // ¡Totalmente válido! Ocupa 4 bytes.
    
    println!("Lanzando servidor: {}", emoji);
}
```

*Nota para el backend:* Aunque `char` existe, en la práctica web y de APIs casi siempre trabajarás con cadenas de texto (`String` o `&str`), las cuales están codificadas en UTF-8 dinámico, no en arreglos de `char` de 4 bytes fijos. Exploraremos esto a fondo en el Capítulo 6.

## 2.3 Tipos compuestos (tuplas y arreglos)

A diferencia de los tipos escalares que representan un único valor, los **tipos compuestos** permiten agrupar múltiples valores bajo una sola variable. Rust proporciona dos tipos compuestos primitivos: las tuplas y los arreglos.

Es importante destacar que ambos tienen una característica en común que suele sorprender a quienes vienen de lenguajes interpretados: **su longitud es fija y debe conocerse en tiempo de compilación**.

### 1. Tuplas (Tuples)

Una tupla es una colección de tamaño fijo que puede contener datos de **diferentes tipos**. Se definen escribiendo una lista de valores separados por comas dentro de paréntesis.

En el desarrollo backend, las tuplas son extremadamente útiles para retornar múltiples valores desde una función sin la necesidad de crear un `struct` formal (los cuales veremos en el Capítulo 3). Por ejemplo, podrías usarlas para devolver un código de estado HTTP junto con su mensaje:

```rust
fn main() {
    // Declaración implícita
    let http_response = (200, "OK");
    
    // Declaración explícita de tipos
    let error_response: (u16, &str, bool) = (404, "Not Found", false);

    // Acceso mediante la notación de punto (índices basados en cero)
    let status_code = http_response.0;
    println!("El estado es: {}", status_code);
}
```

**Destructuración (Destructuring)**
En lugar de acceder a los elementos por su índice numérico (`.0`, `.1`), lo cual es propenso a errores y poco legible, la forma idiomática en Rust es "destructurar" la tupla directamente en variables individuales:

```rust
fn main() {
    let database_config = ("localhost", 5432, "admin");

    // Destructuramos la tupla en variables descriptivas
    let (host, port, username) = database_config;

    println!("Conectando a {}:{} como {}", host, port, username);
}
```

> **El tipo Unidad (`()`):** Una tupla sin ningún valor se conoce como el tipo *Unit*. Representa un valor vacío y un tipo vacío. Si una función en Rust no retorna nada explícitamente, por debajo está retornando implícitamente `()`. Es el equivalente más cercano al `void` de C o Java.

### 2. Arreglos (Arrays)

A diferencia de las tuplas, los arreglos son colecciones de tamaño fijo donde **todos los elementos deben ser del mismo tipo**.

En Rust, los arreglos (`[T; N]`) se almacenan directamente en la pila (Stack), lo que los hace extremadamente rápidos de acceder. Se definen entre corchetes.

```rust
fn main() {
    // Arreglo inferido de 4 elementos i32
    let ports = [80, 443, 8080, 5432];

    // Declaración explícita: [tipo; número_de_elementos]
    let allowed_ips: [&str; 2] = ["192.168.1.1", "10.0.0.5"];

    // Inicialización rápida: un arreglo de 1024 ceros (tipo u8)
    let tcp_buffer = [0u8; 1024]; 
}
```

**Arreglos vs Vectores en el Backend**
Como desarrollador backend, la inicialización rápida de arreglos (`[0u8; 1024]`) será tu herramienta del día a día para crear buffers de lectura de archivos o sockets de red. Al conocer el tamaño exacto, Rust optimiza la asignación de memoria al máximo.

Sin embargo, si necesitas una lista que pueda crecer o encogerse dinámicamente (como una lista de usuarios consultada desde la base de datos), los arreglos no te servirán. Para eso utilizaremos los **Vectores (`Vec<T>`)**, que viven en el Heap y exploraremos a fondo en el Capítulo 6.

**Seguridad de memoria: Out of Bounds**
Uno de los vectores de ataque más comunes en C/C++ es el *Buffer Overflow* (desbordamiento de búfer), que ocurre cuando intentas leer o escribir más allá de la longitud real de un arreglo.

Rust previene esto categóricamente. Si intentas acceder a un índice que no existe, el programa hará *panic* y se detendrá inmediatamente en lugar de permitir el acceso a memoria inválida:

```rust
fn main() {
    let endpoints = ["/api/v1/users", "/api/v1/posts"];
    
    // Rust compilará esto, pero al ejecutarse hará "panic" y protegerá 
    // tu sistema de un acceso indebido a la memoria.
    // let admin_endpoint = endpoints[5]; 
}
```

## 2.4 Control de flujo (`if`, `else`, `loop`, `while`, `for`)

En cualquier lenguaje, el control de flujo es lo que le da vida a la lógica de negocio. Permite tomar decisiones, repetir tareas y manejar la concurrencia. Sin embargo, Rust introduce una diferencia arquitectónica fundamental respecto a lenguajes como C, Java o Go: en Rust, **casi todo es una expresión** (algo que evalúa y retorna un valor) en lugar de una simple sentencia (una instrucción que no retorna nada).

### 1. Ramificación condicional (`if` y `else`)

La sintaxis del `if` en Rust es limpia: no requiere paréntesis alrededor de la condición, pero sí exige llaves `{}` para el bloque de código.

Un detalle crucial para los desarrolladores que vienen de Python o JavaScript: **Rust no tiene el concepto de valores "truthy" o "falsy"**. La condición de un `if` debe evaluar estrictamente a un tipo `bool`. No puedes usar un entero `1` o una cadena vacía para evaluar si algo es verdadero o falso.

```rust
fn main() {
    let active_connections = 15;
    let max_connections = 100;

    // La condición debe ser estrictamente un booleano
    if active_connections >= max_connections {
        println!("Alerta: Límite de conexiones alcanzado.");
    } else if active_connections > 80 {
        println!("Advertencia: Tráfico elevado.");
    } else {
        println!("Estado del servidor: Normal.");
    }
}
```

**El `if` como expresión:**
Dado que el `if` es una expresión, podemos usarlo en el lado derecho de una declaración `let`. Esto reemplaza la necesidad de un operador ternario (`condicion ? a : b`) que existe en otros lenguajes, manteniendo el código más legible y seguro.

```rust
fn main() {
    let is_admin = true;
    
    // El tipo de 'role_id' se infiere del resultado de los bloques.
    // Ambos brazos del if/else deben retornar el MISMO tipo de dato.
    let role_id = if is_admin { 1 } else { 2 };

    println!("ID de rol asignado: {}", role_id);
}
```

### 2. Repetición infinita y reintentos (`loop`)

Rust tiene una palabra clave dedicada para bucles infinitos: `loop`. En el desarrollo backend, los bucles infinitos son increíblemente comunes para hilos (threads) que escuchan conexiones entrantes, procesan colas de mensajes (como RabbitMQ o Kafka) o implementan lógicas de reconexión.

```rust
fn main() {
    let mut retries = 0;

    // Bucle infinito
    loop {
        println!("Intentando conectar a la base de datos... (Intento {})", retries + 1);
        
        // Simulamos una conexión exitosa al tercer intento
        if retries == 2 {
            println!("¡Conexión establecida!");
            break; // Rompe el bucle
        }

        retries += 1;
    }
}
```

**Retornando valores desde un `loop`:**
Otra característica brillante de Rust es que puedes retornar un valor al romper un `loop`. Esto es ideal para operaciones que deben reintentarse hasta tener éxito, devolviendo finalmente el recurso obtenido:

```rust
fn main() {
    let mut counter = 0;

    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2; // Rompemos el bucle y retornamos 20
        }
    };

    println!("El resultado del bucle es: {}", result);
}
```

> **Etiquetas de bucle (Loop Labels):** Si tienes bucles anidados, puedes etiquetarlos usando una comilla simple (ej. `'reconnect: loop { ... }`) y usar `break 'reconnect;` para salir de un bucle externo desde uno interno.

### 3. Bucles condicionales (`while`)

El `while` funciona exactamente como esperarías: evalúa una condición booleana antes de cada iteración y se detiene cuando esta es `false`. Es útil para leer de un buffer o agotar un iterador condicional, aunque en la práctica idiomática de Rust suele usarse menos que `loop` o `for`.

```rust
fn main() {
    let mut queue_size = 5;

    while queue_size > 0 {
        println!("Procesando mensaje. Restantes: {}", queue_size);
        queue_size -= 1;
    }
    println!("La cola está vacía.");
}
```

### 4. Iteración sobre colecciones (`for`)

El bucle `for` en Rust es la herramienta por excelencia para iterar. En lugar del clásico `for (int i = 0; i < n; i++)` propenso a errores de límites (off-by-one errors), el `for` de Rust se basa fuertemente en **Iteradores**.

Es la forma más segura y rápida de recorrer arreglos o vectores, ya que el compilador de Rust elimina las comprobaciones de límites en tiempo de ejecución (bounds checking) cuando usas un iterador, haciendo que tu código sea tan rápido como si lo hubieras escrito en C, pero con 100% de seguridad de memoria.

```rust
fn main() {
    let allowed_methods = ["GET", "POST", "PUT", "DELETE"];

    // Iterando directamente sobre la colección
    for method in allowed_methods {
        println!("Método HTTP permitido: {}", method);
    }

    // Iterando sobre un rango numérico exclusivo (1 a 4)
    for i in 1..5 {
        println!("Worker {} inicializado.", i);
    }

    // Iterando sobre un rango inclusivo (1 a 3) usando rev() para invertirlo
    for countdown in (1..=3).rev() {
        println!("Apagando servidor en {}...", countdown);
    }
}
```

En capítulos posteriores, cuando hablemos de Ownership y Borrowing, veremos cómo el bucle `for` interactúa con la memoria (consumiendo los valores o simplemente tomándolos prestados). Por ahora, basta con saber que es la estructura de control de repetición más optimizada y segura del lenguaje.
