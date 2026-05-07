A diferencia de las primitivas básicas, las colecciones de Rust son estructuras de datos dinámicas almacenadas en el **montículo (Heap)**, diseñadas para manejar volúmenes de información que varían en tiempo de ejecución. En el desarrollo backend, donde gestionamos flujos de datos externos, entender estas herramientas es crítico para el rendimiento. Exploraremos desde los **Vectores** para secuencias contiguas, hasta los **Mapas Hash** para búsquedas de alta velocidad. Además, cerraremos con el tipo **Option**, la solución de Rust para eliminar las excepciones por punteros nulos, garantizando servicios robustos y predecibles bajo cualquier carga de tráfico.

## 6.1 Vectores (`Vec<T>`)

En el desarrollo backend, rara vez trabajamos con colecciones de tamaño fijo. Ya sea que estemos procesando una lista de usuarios extraída de una base de datos, manejando un batch de eventos o procesando un payload JSON, necesitamos estructuras que puedan crecer y encogerse dinámicamente en tiempo de ejecución. Aquí es donde entra el **Vector**, representado en Rust como `Vec<T>`.

A diferencia de los arreglos (`[T; N]`, que vimos en el Capítulo 2), los cuales tienen un tamaño fijo y se almacenan en la pila (Stack), los vectores asignan su memoria en el montículo (Heap). Un `Vec<T>` garantiza que todos sus elementos sean del mismo tipo `T` y se almacenen de forma contigua en la memoria, lo que los hace extremadamente eficientes para iterar gracias a la localidad de caché del procesador.

### Creación de un Vector

Existen dos formas principales de inicializar un vector. La más explícita es instanciar uno vacío usando la función asociada `new`. Dado que Rust necesita conocer el tipo de los elementos para reservar la memoria adecuada, usaremos anotaciones de tipo o dejaremos que el compilador lo infiera si insertamos valores inmediatamente después:

```rust
// Explícito usando anotación de tipo
let mut usuarios_activos: Vec<String> = Vec::new();

// Inferido por el primer uso
let mut codigos_estado = Vec::new();
codigos_estado.push(200); // Rust infiere que es un Vec<i32>
```

Para inicializar vectores con valores predeterminados de forma más idiomática y limpia, Rust proporciona la macro `vec!`:

```rust
// Crea un vector con valores iniciales
let roles = vec!["admin", "editor", "viewer"];

// Crea un vector con el valor 0 repetido 1024 veces (útil para buffers)
let buffer = vec![0u8; 1024]; 
```

### Lectura y Acceso Seguro a Elementos

Para leer los elementos de un vector, puedes usar la sintaxis de indexación (como `roles[0]`) o el método `.get()`. En el contexto de un servidor backend, la diferencia entre ambos es vital.

Como vimos al hablar de errores irrecuperables en el Capítulo 5, acceder a un índice fuera de los límites con `[]` provocará un `panic!`. Si ese índice proviene del input de un usuario (por ejemplo, un parámetro en la URL), un usuario malintencionado podría tumbar el hilo de tu aplicación. 

La forma segura y recomendada es utilizar el método `.get()`, que devuelve un `Option<&T>` (profundizaremos en `Option` en la sección 6.4):

```rust
let puertos = vec![80, 443, 8080];

// Inseguro: Si el índice no existe, la aplicación entrará en panic.
let puerto_principal = puertos[0]; 

// Seguro: Devuelve Some(&8080) o None si el índice está fuera de los límites.
if let Some(puerto) = puertos.get(2) {
    println!("Escuchando en el puerto: {}", puerto);
} else {
    println!("Puerto no configurado.");
}
```

### Modificación e Iteración

Para añadir elementos al final de un vector, usamos `push`, y para extraer el último, `pop`. Ambos requieren que el vector sea mutable.

Dado que los elementos de un `Vec<T>` se almacenan de forma contigua, iterar sobre ellos es muy rápido. Sin embargo, debes tener muy presentes las reglas de Ownership y Borrowing (Capítulo 4) al iterar en un bucle `for`:

```rust
let mut latencias = vec![12, 15, 23];

// 1. Iterar tomando prestado inmutablemente (Borrowing inmutable)
for latencia in &latencias {
    println!("Latencia: {} ms", latencia);
}

// 2. Iterar tomando prestado mutablemente (Borrowing mutable)
for latencia in &mut latencias {
    *latencia += 5; // Desreferenciamos para modificar el valor
}

// 3. Iterar consumiendo el vector (Ownership movido)
for latencia in latencias {
    // Después de este bucle, la variable `latencias` ya no es válida
    // porque el bucle `for` ha tomado posesión de ella.
}
```

### El enfoque Senior: Capacidad y Reasignaciones

Para un desarrollador backend de nivel senior, entender cómo `Vec<T>` gestiona la memoria bajo el capó es crucial para optimizar el rendimiento. Un vector consta de tres partes:
1. Un puntero a los datos en el Heap.
2. La longitud (`len`): cuántos elementos tiene actualmente.
3. La capacidad (`capacity`): cuánta memoria ha reservado en el Heap.

Cuando usas `push` y el vector alcanza su capacidad máxima, Rust debe buscar un nuevo bloque de memoria en el Heap (generalmente el doble de grande), copiar todos los elementos antiguos allí, liberar la memoria anterior e insertar el nuevo elemento. Esta operación de **reasignación (reallocation)** es costosa (O(n)).

Si estás obteniendo 1,000 registros de una base de datos y haciéndoles `push` a un vector vacío creado con `Vec::new()`, forzarás múltiples reasignaciones en el proceso. 

**La mejor práctica en estos casos es usar `Vec::with_capacity()`:**

```rust
// Si sabemos (o estimamos) que recibiremos unos 1000 registros de la BD:
let mut usuarios_procesados = Vec::with_capacity(1000);

println!("Longitud: {}", usuarios_procesados.len());         // Salida: 0
println!("Capacidad: {}", usuarios_procesados.capacity());   // Salida: 1000

// Las siguientes 1000 inserciones no causarán ninguna reasignación de memoria
for i in 0..1000 {
    usuarios_procesados.push(i);
}
```
Pre-asignar la capacidad de los vectores siempre que sea posible es uno de los "quick wins" más efectivos para reducir el trabajo del asignador de memoria en aplicaciones de alta concurrencia.

## 6.2 Representaciones de texto (`String` vs `&str`)

El manejo de cadenas de texto suele ser uno de los primeros grandes obstáculos para quienes llegan a Rust desde lenguajes con recolector de basura como Go, Java o Python. En esos lenguajes, un "string" es un tipo único que simplemente pasas de un lado a otro. En Rust, debido a las reglas de Ownership que vimos en el Capítulo 4, el texto tiene una dualidad fundamental: **`String`** y **`&str`** (string slice).

Comprender la diferencia exacta entre ambos, y saber cuándo usar cuál, es la diferencia entre un microservicio web que consume 20 MB de RAM y responde en microsegundos, y uno ahogado en recolecciones de memoria innecesarias.

Ambos tipos tienen una regla estricta en común: **siempre garantizan ser texto UTF-8 válido**. 

### `&str`: La Vista (String Slice)

El tipo `&str` es una "rebanada" (slice) de texto. Es una referencia inmutable a una secuencia de caracteres UTF-8 almacenada en algún lugar de la memoria. Bajo el capó, un `&str` se compone de dos cosas (conocido como un *fat pointer*):
1. Un puntero al inicio del texto.
2. La longitud del texto en bytes.

Debido a que es solo una referencia, **un `&str` no tiene Ownership (propiedad) sobre los datos a los que apunta**. Es extremadamente ligero y rápido de pasar, ya que no implica copias en el Heap.

```rust
// Esto es un literal de cadena. Su tipo es `&'static str`.
// Los literales se "hornean" directamente en el binario compilado de tu aplicación.
let entorno = "produccion"; 

// Podemos crear un slice a partir de otro texto
let ruta_completa = "/api/v1/usuarios";
let version_api = &ruta_completa[5..7]; // "v1" (Cero asignaciones de memoria)
```

### `String`: El Propietario (Heap-allocated)

Por otro lado, `String` es el propietario de sus datos. Estructuralmente, un `String` es un envoltorio (wrapper) alrededor de un `Vec<u8>` que asegura que los bytes siempre formen texto UTF-8 válido. Al igual que los vectores (sección 6.1), un `String` reside en el Heap, puede crecer, encogerse y ser modificado.

```rust
// Se reserva memoria en el Heap
let mut query = String::from("SELECT * FROM users");

// Al ser propietario, podemos modificarlo
query.push_str(" WHERE active = true");
```

### La Regla de Oro en las Firmas de Funciones

En el desarrollo de APIs, constantemente estamos escribiendo funciones que reciben texto: validadores, constructores de queries, procesadores de JSON. La regla de oro en Rust es:

> **Si una función solo necesita leer el texto, pide un `&str`. Nunca pidas un `String` a menos que necesites ser el propietario de los datos.**

¿Por qué? Porque gracias a una característica de Rust llamada *Deref Coercion*, un `&String` se convierte automáticamente en un `&str` cuando se pasa como argumento. Si tu función pide `&str`, podrá aceptar tanto literales como Strings dinámicos.

```rust
// ❌ Anti-patrón: Obliga al que llama a pasar un String (y posiblemente a clonar)
fn validar_email_malo(email: String) -> bool {
    email.contains('@')
}

// ✅ Práctica Senior: Acepta cualquier forma de texto de manera eficiente
fn validar_email_bueno(email: &str) -> bool {
    email.contains('@')
}

fn main() {
    let email_dinamico = String::from("admin@backend.com");
    let email_estatico = "test@backend.com";

    // validar_email_bueno acepta ambos sin hacer copias en memoria
    validar_email_bueno(&email_dinamico); 
    validar_email_bueno(email_estatico);
}
```

### Structs: El dilema del Ownership

Cuando definimos `Structs` (por ejemplo, los modelos que mapean a nuestra base de datos o los DTOs para deserializar JSON con Serde), la historia cambia.

Si usas `&str` dentro de un Struct, estarás atando ese Struct a un tiempo de vida (*Lifetime*), lo que significa que el Struct no puede vivir más tiempo que la cadena original. Aunque veremos esto a fondo en el Capítulo 8, la regla pragmática para el desarrollo backend diario es: **Usa `String` en tus Structs de dominio o DTOs.**

```rust
// Preferido para modelos de datos (DTOs, Entidades de BD)
pub struct UsuarioRequest {
    pub username: String,
    pub email: String,
}
```
El pequeño costo de asignar estos `Strings` en memoria al recibir una petición HTTP (usando frameworks como Axum o Actix) vale la pena para mantener la ergonomía del código y evitar la "fatiga de Lifetimes" en toda la arquitectura.

### El enfoque Senior: `Cow<'a, str>` (Clone-On-Write)

Hay un escenario muy común en backend: tienes una función que recibe un texto (ej. limpiarlo de espacios extra o sanitizar HTML). El 90% de las veces el texto ya viene limpio, pero un 10% de las veces requiere modificaciones.

Si devuelves un `String` siempre, estás forzando una asignación en el Heap (allocation) incluso para el 90% de los casos que no la necesitaban. Para evitarlo, la Standard Library nos ofrece `Cow` (Clone-On-Write), un *smart pointer* que encapsula o bien una referencia (`&str`) o bien un valor propio (`String`).

```rust
use std::borrow::Cow;

// Retorna un Borrowed (&str) si no hay cambios, o un Owned (String) si se mutó.
fn sanitizar_input(input: &str) -> Cow<str> {
    if input.contains("<script>") {
        // Encontramos algo malo, creamos un String nuevo en el Heap (Owned)
        let limpio = input.replace("<script>", "");
        Cow::Owned(limpio)
    } else {
        // Todo está bien, devolvemos el mismo puntero sin coste (Borrowed)
        Cow::Borrowed(input)
    }
}

let seguro = sanitizar_input("Hola mundo"); // Es Cow::Borrowed, 0 allocations
let hack = sanitizar_input("Hola <script>mundo"); // Es Cow::Owned, 1 allocation
```

Dominar el uso de `&str` para lecturas, `String` para propiedad de datos y `Cow` para mutaciones condicionales, reducirá drásticamente la latencia y el consumo de memoria en tus servicios.

## 6.3 Mapas Hash y Conjuntos (`HashMap` y `HashSet`)

Mientras que los vectores son excelentes para procesar secuencias de datos, en el backend constantemente necesitamos realizar búsquedas rápidas, agrupar información por identificadores o mantener cachés en memoria. Para estas tareas de acceso O(1) (tiempo constante), la Standard Library de Rust nos proporciona el `HashMap<K, V>` y su variante para valores únicos, el `HashSet<T>`.

A diferencia de los vectores o los strings, estas colecciones no están incluidas en el "prelude" (el conjunto de herramientas que Rust importa automáticamente), por lo que siempre debemos traerlas al ámbito léxico explícitamente con `use std::collections::HashMap;`.

### Fundamentos de `HashMap` y Ownership

Un `HashMap` almacena pares de clave-valor. Como es de esperar en Rust, insertar datos en un mapa interactúa fuertemente con las reglas de Ownership. Si usas tipos que poseen sus datos (como `String`), el mapa tomará posesión de ellos tras la inserción.

```rust
use std::collections::HashMap;

let mut cabeceras = HashMap::new();

let clave = String::from("Authorization");
let valor = String::from("Bearer token123");

// El mapa toma posesión (ownership) de 'clave' y 'valor'
cabeceras.insert(clave, valor);

// ❌ println!("{}", clave); // Error de compilación: valor prestado tras ser movido
```

Para recuperar datos, el método `get()` toma una referencia a la clave (`&K`) y devuelve un `Option<&V>`, obligándonos a manejar el caso en el que la clave no exista (veremos `Option` a fondo en la siguiente sección):

```rust
if let Some(token) = cabeceras.get("Authorization") {
    println!("Token recibido: {}", token);
}
```
*Nota Senior:* Gracias a la magia del trait `Borrow` en Rust, aunque la clave del mapa sea un `String`, podemos usar un simple `&str` (como `"Authorization"`) para realizar las búsquedas. Esto evita que tengamos que alojar un nuevo `String` en el Heap solo para consultar el mapa.

### La Joya de la Corona: La API `Entry`

Uno de los patrones más comunes en el backend es: *"Buscar si una clave existe; si existe, actualizar su valor; si no existe, insertarla con un valor por defecto"*. 

En muchos lenguajes, esto requiere dos búsquedas (lookups) en el mapa: una para comprobar y otra para insertar. En Rust, la API `.entry()` nos permite hacerlo en una sola pasada de forma elegante y concurrente (algo vital cuando usemos `Mutex` más adelante).

```rust
use std::collections::HashMap;

let mut rate_limit: HashMap<String, u32> = HashMap::new();
let ip_cliente = String::from("192.168.1.5");

// Enfoque ineficiente (doble lookup):
// if rate_limit.contains_key(&ip_cliente) { ... } else { ... }

// Enfoque Senior (API Entry):
// Busca la IP. Si no existe, inserta un 0. Luego, devuelve una referencia 
// mutable al valor (sea el nuevo 0 o el existente) y le suma 1.
let peticiones = rate_limit.entry(ip_cliente).or_insert(0);
*peticiones += 1;
```

### `HashSet`: Garantizando la Unicidad

Un `HashSet<T>` es, bajo el capó, simplemente un `HashMap<T, ()>` (un mapa donde los valores son tuplas vacías). Se utiliza cuando solo nos importa comprobar si un elemento existe (membresía) o para eliminar duplicados de una colección de manera eficiente.

Es ideal para validar permisos, roles o tags únicos en una petición:

```rust
use std::collections::HashSet;

let mut permisos_usuario = HashSet::new();
permisos_usuario.insert("read:users");
permisos_usuario.insert("write:users");

// Intentar insertar un duplicado simplemente devuelve `false` y se ignora
let es_nuevo = permisos_usuario.insert("read:users"); // false

if permisos_usuario.contains("admin:all") {
    // Conceder acceso total
}
```

### El Enfoque Senior: Rendimiento y el Algoritmo de Hashing

Aquí es donde se separan los juniors de los seniors en Rust. Por defecto, el `HashMap` de la Standard Library utiliza un algoritmo de hashing llamado **SipHash 1-3**. 

SipHash está diseñado para ser criptográficamente resistente contra ataques de denegación de servicio (HashDoS), donde un atacante envía miles de claves maliciosamente crafteadas para que colisionen en el mismo "bucket" del mapa, degradando el rendimiento de O(1) a O(n) y bloqueando tu servidor.

Sin embargo, esta seguridad tiene un coste: **SipHash es relativamente lento**.

Como desarrollador backend, debes aplicar este criterio:
1. **Datos expuestos al exterior (Inputs de usuarios, JSONs de red):** Usa el `HashMap` estándar de `std::collections`. La protección contra DoS es innegociable.
2. **Datos internos de confianza (Cachés de base de datos, mapeo de IDs internos):** El SipHash es un cuello de botella innecesario. 

Para datos internos, el ecosistema de Rust prefiere algoritmos de hashing mucho más rápidos. Dos de los más populares son **AHash** (usado internamente por el compilador de Rust) o **FxHash** (usado por Firefox). Puedes usarlos integrando crates como `ahash` o `rustc-hash`.

```rust
// Ejemplo conceptual usando el crate `ahash` para máxima velocidad
// en un estado interno seguro.
use ahash::AHashMap;

// Este mapa será drásticamente más rápido para operaciones intensivas,
// pero no debe usarse para claves generadas por usuarios anónimos.
let mut cache_interna: AHashMap<u64, String> = AHashMap::new();
```

Por último, al igual que con los vectores, si conoces de antemano el tamaño de tu mapa, inicialízalo siempre con **`HashMap::with_capacity(n)`** para evitar reasignaciones de memoria (reallocations) costosas en el Heap mientras se va llenando.

## 6.4 El enum `Option<T>` para valores nulos

En 1965, Tony Hoare inventó la referencia nula (el clásico `null` o `nil`), algo que él mismo bautizó años después como su "error del billón de dólares". En la mayoría de lenguajes utilizados en el backend (Java, C#, Go, Node.js), cualquier objeto o puntero puede ser nulo de forma implícita. Si olvidas validarlo y accedes a él en producción, tu programa lanzará un `NullPointerException` (o un panic, o un segfault) y el hilo morirá.

**Rust simplemente no tiene el concepto de "nulo" a nivel de lenguaje.**

En su lugar, la ausencia de un valor se modela explícitamente a través del sistema de tipos utilizando el enum `Option<T>`. Esta es su definición exacta en la Standard Library:

```rust
pub enum Option<T> {
    None,
    Some(T),
}
```

Al envolver un valor opcional en un `Option`, el compilador de Rust te **obliga** a manejar el caso `None` antes de permitirte extraer el valor `T`. Es imposible que se te olvide validarlo.

### Extracción Segura: `match` e `if let`

Supongamos que estamos consultando el ID de un usuario en la base de datos. Si el usuario existe, devolvemos `Some(Usuario)`. Si no, devolvemos `None`.

Como vimos en el Capítulo 3, podemos usar `match` para manejar exhaustivamente todos los casos, o `if let` si solo nos interesa la ruta feliz:

```rust
let usuario_opt: Option<String> = buscar_usuario_bd(123);

// Opción 1: Control total con match (Ideal para lógica de negocio estricta)
match usuario_opt {
    Some(nombre) => println!("Usuario encontrado: {}", nombre),
    None => println!("Error 404: Usuario no existe"),
}

// Opción 2: if let (Más conciso si ignoramos el caso None)
if let Some(nombre) = buscar_usuario_bd(456) {
    println!("Procesando datos de: {}", nombre);
}
```

### El Anti-patrón: `unwrap()` en Producción

Cuando estás prototipando o escribiendo tests, es común usar el método `.unwrap()` para extraer el valor de un `Option` rápidamente. Sin embargo, en un entorno backend de producción, **`unwrap()` es un anti-patrón severo**. Si el valor resulta ser `None`, `unwrap()` provocará un `panic!` y tumbará el worker de tu servidor.

En lugar de extraer agresivamente, los desarrolladores senior procesan los `Option` como flujos de datos funcionales.

### El Enfoque Senior: Combinadores Funcionales

La Standard Library dota a `Option<T>` de una rica API de métodos (combinadores) que permiten encadenar operaciones sin extraer el valor manualmente. Esto hace que el código backend sea increíblemente declarativo y limpio.

1. **Transformación con `map`**: Aplica una función al valor interno si es `Some`, y propaga `None` en caso contrario.
2. **Encadenamiento con `and_then`**: Como `map`, pero para funciones que devuelven a su vez otro `Option`.
3. **Valores por defecto con `unwrap_or` y `unwrap_or_else`**: Provee un valor seguro de contingencia.

```rust
// Ejemplo backend: Obtener un header, limpiarlo y convertirlo a número
let header_opt: Option<&str> = Some("  1024  ");

// Uso de combinadores funcionales
let tamano_maximo: u32 = header_opt
    .map(|s| s.trim())               // Si hay Some("  1024  "), pasa a Some("1024")
    .and_then(|s| s.parse().ok())    // Intenta convertir a número, si falla es None
    .unwrap_or(512);                 // Si algo en la cadena falló, usamos 512 por defecto

println!("Límite establecido a: {} bytes", tamano_maximo);
```
Este enfoque evita variables mutables temporales, bucles complejos y sentencias `if` anidadas, logrando un código lineal y a prueba de fallos.

### Zero-Cost Abstraction: La Optimización del "Nicho" (Niche Optimization)

Podrías pensar que envolver datos en un enum añade sobrecarga (overhead) de memoria, ya que un enum normalmente necesita bits extra (el discriminante) para saber si es la variante `Some` o `None`. 

Aquí es donde brilla el diseño del compilador de Rust. Para ciertos tipos de datos que nunca pueden ser ceros en memoria —como las referencias (`&T`), o los *smart pointers* (`Box<T>`)— Rust aplica una técnica llamada **Niche Optimization**. 

Dado que el compilador sabe que un puntero válido jamás tendrá la dirección de memoria `0x0`, utiliza ese espacio "prohibido" (el nicho) para representar la variante `None`.

¿El resultado? **Un `Option<&T>` o un `Option<Box<T>>` ocupa exactamente la misma memoria que el puntero crudo (8 bytes en sistemas de 64 bits).** Tienes toda la seguridad a nivel de compilación para evitar `NullPointerExceptions`, sin sacrificar un solo byte ni un ciclo de CPU en tiempo de ejecución.
