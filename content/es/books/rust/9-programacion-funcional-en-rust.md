Rust no es solo un lenguaje imperativo de alto rendimiento; su diseño bebe directamente de la programación funcional para garantizar seguridad y expresividad. En el desarrollo backend, donde procesar flujos de datos y transformar estructuras es el pan de cada día, adoptar este paradigma permite escribir código más robusto y menos propenso a errores de estado.

En este capítulo, exploraremos cómo los **closures** capturan el entorno de ejecución, la potencia de los **traits de funciones** para inyectar lógica y cómo los **iteradores** permiten procesar colecciones de forma perezosa y eficiente. Elevaremos nuestra abstracción sin sacrificar un solo ciclo de CPU.

## 9.1 Closures y captura de entorno

En Rust, la programación funcional no es un paradigma secundario, sino un ciudadano de primera clase que se integra de manera profunda con el sistema de tipos y el *Borrow Checker*. El primer pilar de esta integración son los **closures** (clausuras o funciones anónimas).

Hasta ahora, hemos utilizado funciones tradicionales definidas con la palabra clave `fn`. Estas funciones son "limpias" en cuanto a su alcance: no pueden acceder a variables que no se les hayan pasado explícitamente como argumentos. Los closures, por el contrario, tienen la capacidad de **capturar su entorno**, es decir, pueden acceder a las variables del ámbito (scope) en el que fueron definidos.

### Sintaxis e Inferencia de Tipos

La sintaxis de un closure prescinde de la palabra clave `fn` y de los paréntesis para los parámetros, utilizando en su lugar barras verticales (`| |`).

```rust
// Una función tradicional
fn sumar_uno_fn(x: i32) -> i32 {
    x + 1
}

// Un closure equivalente
let sumar_uno_closure = |x: i32| -> i32 { x + 1 };

// Un closure idiomático (inferencia de tipos y llaves omitidas si es una sola línea)
let sumar_uno_idiomatico = |x| x + 1;
```

A diferencia de las funciones tradicionales, donde el compilador exige firmas de tipos explícitas (como vimos en el Capítulo 2), los closures están diseñados para contextos cortos e in-line. Por ello, el compilador de Rust suele **inferir tanto los tipos de los parámetros como el tipo de retorno** basándose en cómo se usa el closure.

Sin embargo, hay una regla estricta: **la inferencia ocurre una sola vez**. El primer uso del closure "bloquea" los tipos de sus argumentos.

```rust
let imprimir_y_devolver = |x| {
    println!("Valor: {}", x);
    x
};

let a = imprimir_y_devolver(5); // El compilador infiere que 'x' es i32
// let b = imprimir_y_devolver(String::from("Hola")); // ERROR: Se esperaba i32, se encontró String
```

### Captura del entorno: ¿Qué ocurre bajo el capó?

La verdadera magia de los closures en Rust radica en cómo interactúan con las reglas de *Ownership* y *Borrowing* que dominamos en el Capítulo 4. Cuando un closure captura una variable de su entorno, no lo hace por arte de magia; el compilador crea una estructura oculta (un `struct` anónimo) para almacenar esas variables y aplica las reglas de préstamo de memoria de forma estricta.

Un closure puede capturar su entorno de tres maneras, dependiendo de qué haga con el valor capturado en su cuerpo:

**1. Captura por referencia inmutable (`&T`)**
Si el closure solo lee la variable, tomará prestada la variable de forma inmutable. Esto permite que la variable siga siendo leída en el resto del entorno original de manera concurrente.

```rust
let configuracion = String::from("modo_estricto");

// El closure toma prestada 'configuracion' de forma inmutable
let imprimir_config = || println!("La configuración actual es: {}", configuracion);

imprimir_config();
println!("Todavía puedo leer desde fuera: {}", configuracion); // Totalmente válido
```

**2. Captura por referencia mutable (`&mut T`)**
Si el closure modifica el valor capturado, Rust forzará un préstamo mutable. Como sabemos, esto significa que el closure tiene acceso exclusivo a esa variable mientras el préstamo esté activo.

```rust
let mut contador_conexiones = 0;

// El closure debe declararse como 'mut' porque su estado interno (el entorno capturado) va a cambiar.
let mut incrementar = || {
    contador_conexiones += 1;
    println!("Conexiones: {}", contador_conexiones);
};

incrementar();
incrementar();

// println!("Intentando leer: {}", contador_conexiones); // ERROR: No se puede leer mientras el closure retenga el &mut T

// El préstamo mutable del closure termina aquí (si no se vuelve a usar), por lo que ahora sí podemos leer.
println!("Total de conexiones al final: {}", contador_conexiones);
```

### El modificador `move`: Tomando el Ownership

En el desarrollo Backend, es sumamente común enviar trabajos a otros hilos (como veremos en el Capítulo 14) o crear tareas asíncronas (Capítulo 32 con Tokio). En estos casos, el closure sobrevive al ámbito en el que fue creado, lo que hace que los préstamos (`&` o `&mut`) sean inválidos por las reglas de *Lifetimes*.

Para solucionar esto, utilizamos la palabra clave `move` antes de los parámetros del closure. Esto fuerza al closure a **tomar posesión absoluta (Ownership)** de las variables que captura, moviéndolas hacia su estructura interna.

```rust
let puerto = vec![8080, 8081];

// Usamos 'move' para forzar que el Vector 'puerto' se mueva hacia adentro del closure
let iniciar_servidor = move || {
    println!("Iniciando servidor en los puertos: {:?}", puerto);
};

iniciar_servidor();

// println!("{:?}", puerto); // ERROR: 'puerto' fue movido (moved) dentro del closure, ya no existe en este scope.
```

Es importante entender que `move` no cambia *qué* captura el closure, sino *cómo* lo captura. Si capturas tipos primitivos que implementan el trait `Copy` (como un `i32`), el uso de `move` copiará el valor en lugar de moverlo, dejando la variable original intacta, pero garantizando que el closure tiene su propia instancia independiente de la memoria.

Entender la mecánica física de estas capturas es vital. En la siguiente sección, exploraremos cómo Rust formaliza este comportamiento a través del sistema de tipos mediante los Traits `Fn`, `FnMut` y `FnOnce`.

## 9.2 Traits de Closures (`Fn`, `FnMut`, `FnOnce`)

En la sección anterior vimos cómo los closures capturan su entorno físicamente en memoria mediante un `struct` anónimo generado por el compilador. Sin embargo, cuando necesitamos pasar un closure a una función —por ejemplo, como un middleware en Actix-Web o un iterador personalizado— no podemos usar el nombre de ese `struct` porque es anónimo e inaccesible directamente en nuestro código. 

Para resolver esto, Rust utiliza su sistema de tipos y polimorfismo (que vimos en el Capítulo 7). El compilador implementa automáticamente uno o varios de los **traits de closures** definidos en `std::ops`: `Fn`, `FnMut` y `FnOnce`. 

Comprender la diferencia entre estos tres traits es fundamental para el desarrollo Backend, ya que dictan cuántas veces se puede ejecutar un closure y cómo este afecta a la memoria a su alrededor.

### La jerarquía de los Traits

El compilador decide qué trait(s) implementar basándose exclusivamente en **lo que hace el closure con los valores capturados en su cuerpo**, no en cómo fueron capturados. La relación entre estos traits es jerárquica:

1. **`FnOnce`**: Toma el receptor por valor (`self`). Significa que el closure consume (toma el *Ownership*) de las variables capturadas.
2. **`FnMut`**: Toma el receptor por referencia mutable (`&mut self`). Puede cambiar el entorno capturado.
3. **`Fn`**: Toma el receptor por referencia inmutable (`&self`). Solo lee el entorno, permitiendo múltiples ejecuciones concurrentes.

Todo closure implementa al menos `FnOnce`. Si no mueve variables fuera de su entorno, también implementa `FnMut`. Si tampoco muta su entorno, implementa `Fn`.

### 1. `FnOnce`: Ejecución única

Un closure que implementa únicamente `FnOnce` está diseñado para ser llamado **una sola vez**. Esto ocurre cuando el closure extrae un valor de su entorno capturado y lo consume (por ejemplo, retornándolo o pasándolo a otra función que toma posesión).

```rust
fn ejecutar_una_vez<F>(closure: F)
where
    F: FnOnce(),
{
    closure();
    // closure(); // ERROR: El closure ya fue consumido y no puede llamarse de nuevo
}

let api_key = String::from("mi_secreto_super_seguro");

// Este closure toma Ownership de `api_key` y lo consume al llamar a `drop` implícitamente
// al terminar su ejecución (o al retornarlo).
let consumir_key = || {
    let _key_movida = api_key;
    println!("Clave consumida para la petición.");
};

ejecutar_una_vez(consumir_key);
```

En el backend, verás requerimientos de `FnOnce` al crear hilos con `std::thread::spawn` (Capítulo 14), ya que la tarea enviada al hilo se ejecuta exactamente una vez y a menudo consume datos enviados a ella.

### 2. `FnMut`: Estado mutable retenido

Si necesitas que un closure mantenga un estado interno que se modifique en cada llamada, requerirá el trait `FnMut`. El compilador exigirá que tanto el closure como la variable que lo almacena sean declarados como mutables.

```rust
fn ejecutar_varias_veces<F>(mut closure: F)
where
    F: FnMut(),
{
    closure();
    closure();
}

let mut peticiones_procesadas = 0;

// El closure muta su entorno capturado
let mut registrar_peticion = || {
    peticiones_procesadas += 1;
    println!("Petición número: {}", peticiones_procesadas);
};

ejecutar_varias_veces(&mut registrar_peticion);
```

Los adaptadores de iteradores que modifican estados (como abstraer contadores o buffers) suelen requerir closures `FnMut`.

### 3. `Fn`: Concurrencia y estado puro

El trait `Fn` es el más restrictivo para el cuerpo del closure, pero el más versátil para quien lo llama. Indica que el closure solo lee su entorno o no captura nada en absoluto. Como solo utiliza referencias inmutables (`&self`), **puede ser llamado múltiples veces y de forma concurrente desde diferentes hilos**.

```rust
fn ejecutar_concurrentemente<F>(closure: F)
where
    F: Fn(i32) -> i32, // Toma un i32 y devuelve un i32
{
    let a = closure(10);
    let b = closure(20);
    println!("Resultados: {}, {}", a, b);
}

let factor_multiplicador = 5; // Estado inmutable

let multiplicar = |x| x * factor_multiplicador;

ejecutar_concurrentemente(multiplicar);
```

### Relevancia en Frameworks Web (Axum / Actix)

Cuando defines rutas y controladores (*handlers*) en frameworks como Axum o Actix-Web (Capítulos 16 y 17), el framework necesita invocar tu función por cada petición HTTP entrante. Si tu controlador fuera un closure `FnOnce`, el servidor solo podría responder a la primera petición y luego fallaría. 

Por esta razón, los frameworks asíncronos exigen que los handlers sean funciones o closures que implementen `Fn` (o que implementen `Clone` de forma económica) y sean `Send` + `Sync`, garantizando que el estado capturado pueda ser compartido de forma segura entre los *worker threads* del servidor sin mutaciones de estado no controladas.

## 9.3 Iteradores y sus métodos de consumo

Si los closures son el primer pilar de la programación funcional en Rust, los **Iteradores** son el segundo. En lenguajes de backend más tradicionales, solemos depender fuertemente de bucles `for` o `while` indexados para recorrer colecciones. Aunque Rust soporta el bucle `for` (como vimos en el Capítulo 2), la forma idiomática, segura y a menudo más rápida de procesar secuencias de datos es mediante el trait `Iterator`.

Los iteradores en Rust son **abstracciones de costo cero (zero-cost abstractions)**. Esto significa que el compilador optimiza el uso de iteradores de tal manera que el código máquina resultante es igual (o a veces más eficiente, al eliminar comprobaciones de límites en tiempo de ejecución) que si hubieras escrito un bucle manual meticulosamente optimizado.

### La perezosa naturaleza de los Iteradores (Lazy Evaluation)

La característica más importante que debes interiorizar sobre los iteradores en Rust es que son **perezosos (lazy)**. Crear un iterador no ejecuta absolutamente nada. No procesa datos, no reserva memoria para los resultados y no avanza por la colección. Un iterador es simplemente una "receta" estructurada.

```rust
let peticiones = vec![200, 404, 500, 200];

// Esto NO hace nada. El compilador de hecho emitirá un warning
// indicando que el iterador no se está utilizando.
peticiones.iter(); 
```

Para que un iterador haga su trabajo, necesita un **método de consumo (consumer)**. Los consumidores son métodos que llaman internamente a la función `next()` del iterador, obligándolo a evaluar y entregar sus elementos uno por uno.

### El Trait `Iterator` bajo el capó

Para entender cómo se consumen los datos, es útil ver cómo define la Standard Library el trait `Iterator`:

```rust
pub trait Iterator {
    // Un "Associated Type" que define qué tipo de dato devolverá el iterador
    type Item;

    // El único método requerido. Devuelve Some(Item) si hay un valor, o None si terminó.
    fn next(&mut self) -> Option<Self::Item>;

    // ... decenas de métodos predeterminados (consumers y adapters)
}
```

El método `next()` muta el estado interno del iterador (por eso requiere `&mut self`), avanzando un puntero o un índice en la colección subyacente.

### Las tres formas de crear Iteradores

Al igual que los closures interactúan con el *Ownership* de tres formas (referencia inmutable, mutable o tomando valor), las colecciones en Rust pueden generar tres tipos de iteradores correspondientes:

1. **`iter()`**: Devuelve un iterador sobre referencias inmutables (`&T`). Es el más común cuando solo necesitas leer datos, como validar una lista de permisos.
2. **`iter_mut()`**: Devuelve un iterador sobre referencias mutables (`&mut T`). Te permite modificar los elementos in-place sin reasignar la colección.
3. **`into_iter()`**: Devuelve un iterador que **consume** la colección, tomando el *Ownership* de sus elementos (`T`). Útil cuando quieres transformar una colección en otra estructura de datos y ya no necesitas la original.

```rust
let mut puertos = vec![80, 443, 8080];

// 1. Lectura inmutable (&i32)
for p in puertos.iter() {
    println!("Escuchando en: {}", p);
}

// 2. Mutación in-place (&mut i32)
for p in puertos.iter_mut() {
    *p += 1000; // Movemos los puertos al rango 1000+
}

// 3. Consumo (i32). Después de esto, la variable `puertos` ya no es válida.
for p in puertos.into_iter() {
    iniciar_worker(p);
}
```

*Nota arquitectónica:* El bucle `for` clásico en Rust es en realidad azúcar sintáctico (syntax sugar) que llama a `into_iter()` implícitamente bajo el capó y consume el iterador resultante hasta que devuelve `None`.

### Métodos de Consumo (Triggers)

Como mencionamos, el iterador necesita ser consumido. La Standard Library proporciona decenas de métodos consumidores. Estos métodos toman el iterador, lo agotan (total o parcialmente) y devuelven un valor final concreto, no otro iterador.

Aquí tienes los consumidores más críticos en el desarrollo backend:

**1. `for_each`**
Toma un closure (específicamente uno que implemente `FnMut`) y lo aplica a cada elemento. Es el equivalente funcional directo de un bucle `for`, consumiendo el iterador por sus efectos secundarios.

```rust
let endpoints = vec!["/api/users", "/api/posts", "/api/health"];

// Consumo inmutable ejecutando una acción
endpoints.iter().for_each(|rut| println!("Registrando ruta: {}", rut));
```

**2. Búsquedas y validaciones: `any`, `all`, `find`**
Estos consumidores son **cortocircuitables (short-circuiting)**. No necesariamente procesan toda la colección; se detienen tan pronto como encuentran la respuesta. Son ideales para validaciones de autorización o búsqueda de registros en memoria.

```rust
let codigos_estado = vec![200, 201, 204, 401, 500];

// ¿Hay algún error del servidor? (Se detiene al encontrar el 500)
let hay_error_servidor = codigos_estado.iter().any(|&c| c >= 500);

// ¿Fueron todas exitosas? (Se detiene en el 401 y devuelve false)
let todo_ok = codigos_estado.iter().all(|&c| c < 400);

// Encuentra el primer código no autorizado
let no_autorizado = codigos_estado.iter().find(|&&c| c == 401); // Devuelve Option<&i32>
```
*(Nota sobre la doble referencia `&&c` en `find`: Como `iter()` devuelve referencias `&T`, y el closure de `find` toma una referencia al elemento por diseño de la API para no consumirlo, terminamos con una referencia a una referencia. Se desestructura usando `&&` o desreferenciando con `**`).*

**3. Consolidación: `count`, `sum`, `max`, `min`**
Reducen toda la colección a un único valor escalar.

```rust
let tiempos_respuesta_ms = vec![12, 45, 18, 9];

// Cuenta los elementos (útil si has filtrado previamente)
let total_peticiones = tiempos_respuesta_ms.iter().count();

// Suma total (requiere indicar el tipo o que el compilador lo infiera del uso)
let tiempo_total: i32 = tiempos_respuesta_ms.iter().sum();

// Obtiene el máximo (devuelve un Option porque la colección podría estar vacía)
let peticion_mas_lenta = tiempos_respuesta_ms.iter().max();
```

Los consumidores son el destino final de un pipeline de datos. Sin embargo, el verdadero poder expresivo de Rust aparece cuando combinamos estos consumidores con **adaptadores**, lo que nos permite construir cadenas de procesamiento de datos complejas, seguras y altamente optimizadas. Eso es exactamente lo que abordaremos en la siguiente sección.

## 9.4 Adaptadores de iteradores (map, filter, fold, collect)

En la sección anterior vimos cómo los **consumidores** extraen valores finales de un iterador. Sin embargo, antes de consumir los datos, rara vez los usamos tal y como vienen; necesitamos transformarlos, limpiarlos o agruparlos. Aquí es donde entran los **adaptadores de iteradores**.

Un adaptador es un método que toma un iterador y devuelve *otro iterador*. Fieles a la naturaleza perezosa (*lazy*) de Rust, los adaptadores no ejecutan ninguna lógica en el momento de ser llamados; simplemente construyen un "pipeline" (una tubería de procesamiento) que no hará absolutamente nada hasta que un consumidor final "tire" de los datos.

### 1. `map`: Transformación uno a uno

El adaptador `map` toma un closure que se aplicará a cada elemento del iterador, transformándolo en un nuevo valor (y potencialmente en un nuevo tipo). Es el caballo de batalla para mutar estructuras de datos o proyectar campos específicos, similar a un `SELECT` en SQL.

```rust
struct Usuario {
    id: u32,
    username: String,
}

let usuarios = vec![
    Usuario { id: 1, username: String::from("alice") },
    Usuario { id: 2, username: String::from("bob") },
];

// Queremos extraer solo los IDs para hacer una consulta a la base de datos.
// 'map' crea un nuevo iterador que cederá valores u32.
let iterador_ids = usuarios.iter().map(|user| user.id);

// Nota: iterador_ids no ha procesado nada aún.
```

### 2. `filter`: La criba de elementos

`filter` toma un closure que devuelve un booleano (`true` o `false`). Si el closure devuelve `true`, el elemento pasa al siguiente paso del pipeline; si es `false`, se descarta. 

**Un detalle crucial para el nivel Senior:** Por diseño, `filter` pasa una *referencia* al elemento para no consumirlo prematuramente durante la evaluación. Si estás iterando sobre una colección usando `iter()` (que ya devuelve referencias `&T`), el closure de `filter` recibirá una referencia a una referencia (`&&T`).

```rust
let peticiones = vec![200, 404, 500, 403, 200];

// Filtramos solo los errores del servidor (5xx).
// Usamos &&p para desestructurar la doble referencia generada por iter() + filter()
let errores_servidor = peticiones.iter().filter(|&&p| p >= 500);
```

### Construyendo el Pipeline (Zero-Cost Abstractions)

La elegancia de Rust radica en encadenar estos adaptadores. El compilador, mediante LLVM, "aplana" estas cadenas en un único bucle altamente optimizado, eliminando la sobrecarga de crear colecciones intermedias en memoria.

```rust
let lineas_log = vec![
    "INFO: Servidor iniciado",
    "ERROR: Falla de conexión a DB",
    "WARN: Latencia alta",
    "ERROR: Timeout en caché",
];

// Pipeline perezoso: Filtramos, luego extraemos el mensaje.
let mensajes_error = lineas_log.iter()
    .filter(|linea| linea.starts_with("ERROR"))
    .map(|linea| linea.replace("ERROR: ", ""));
```

### 3. `fold`: Reducción con estado inicial

*Nota técnica:* Aunque comúnmente se enseña junto a los adaptadores, `fold` es en realidad un **consumidor**. Evalúa el iterador reduciéndolo a un único valor mediante un acumulador.

A diferencia del método `sum()` o `reduce()`, `fold` exige que proporciones un valor inicial explícito. Esto lo hace totalmente seguro ante iteradores vacíos. Toma dos argumentos: el estado inicial y un closure que recibe el estado actual y el siguiente elemento.

```rust
let cargas_cpu = vec![12.5, 45.0, 30.2];

// Calculamos la carga total partiendo de un valor base (ej. consumo del sistema = 5.0)
let carga_total = cargas_cpu.iter().fold(5.0, |acumulador, carga| {
    acumulador + carga
});

println!("Carga total: {}", carga_total); // 92.7
```

En el backend, `fold` es excepcionalmente útil para construir estructuras de datos complejas desde cero a partir de un flujo de eventos, como aplicar un *Event Sourcing* para reconstruir el estado de una entidad.

### 4. `collect`: El materializador universal

El pipeline perezoso necesita un destino final, y `collect` es el consumidor más utilizado para este propósito. Toma todos los elementos que han sobrevivido y sido transformados por el pipeline y los "recolecta" en una colección concreta.

Dado que `collect` es altamente polimórfico, a menudo necesitas indicarle al compilador qué tipo de colección deseas construir. Esto se hace mediante anotaciones de tipo o usando la sintaxis conocida como **Turbofish** (`::<>`).

```rust
let ids_crudos = vec!["12", "45", "99"];

// Opción 1: Anotación de tipo en la variable
let ids_parseados: Vec<i32> = ids_crudos.iter()
    .filter_map(|id| id.parse::<i32>().ok()) // filter_map filtra los None y extrae los Some
    .collect();

// Opción 2: Sintaxis Turbofish directamente en collect()
let set_ids = ids_crudos.iter()
    .filter_map(|id| id.parse::<i32>().ok())
    .collect::<std::collections::HashSet<i32>>();
```

**El superpoder de `collect` con `Result`**
Una de las técnicas más elegantes en el backend con Rust es usar `collect` para invertir una colección de `Result`s. Si tienes un iterador que produce `Result<T, E>`, puedes recolectarlo en un `Result<Vec<T>, E>`. 

Si todos los elementos son `Ok`, obtendrás un vector con los valores. **Si un solo elemento es `Err`, `collect` aborta la iteración (cortocircuito) y devuelve ese error inmediatamente.**

```rust
let payloads = vec!["100", "200", "invalido", "300"];

// Intentamos parsear todo. Si algo falla, queremos que falle toda la operación.
let parseo_estricto: Result<Vec<i32>, _> = payloads.iter()
    .map(|p| p.parse::<i32>())
    .collect();

match parseo_estricto {
    Ok(numeros) => println!("Todo correcto: {:?}", numeros),
    Err(e) => println!("Fallo en la validación del lote: {}", e), // Caerá aquí
}
```

Dominar la sinergia entre Closures, Traits e Iteradores marca el punto de inflexión en la carrera de un desarrollador Rust. Este estilo no solo reduce los errores de estado mutable, sino que expresa la intención de negocio de forma mucho más declarativa.
