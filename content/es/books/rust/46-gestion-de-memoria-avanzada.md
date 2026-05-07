En el desarrollo backend de alto rendimiento, la eficiencia no es solo escribir algoritmos rápidos, sino entender cómo los datos habitan en el hardware. Rust nos otorga un control granular sobre la memoria, pero delegar el control total implica conocer las reglas del juego a bajo nivel. 

En este capítulo, desglosaremos la anatomía de los **structs** para dominar el *padding* y la alineación. Exploraremos cómo los **custom allocators** como `mimalloc` pueden reducir la latencia en APIs concurrentes y cómo los **smart pointers** avanzados facilitan patrones de diseño complejos. Finalmente, aprenderemos a gestionar el ciclo de vida de la memoria, desde fugas intencionales hasta la prevención de ciclos fatales.

## 46.1 Layout de structs en memoria y padding (`#[repr(C)]`, `#[repr(packed)]`)

Como desarrolladores backend, solemos pensar en nuestras estructuras de datos en términos de lógica de negocio. Sin embargo, cuando el rendimiento extremo, la localidad de caché o la interoperabilidad con otros lenguajes entran en juego, necesitamos entender exactamente cómo el compilador de Rust acomoda nuestros `structs` en la memoria física.

Para que la CPU lea y escriba memoria de manera eficiente, los datos deben estar **alineados**. Por ejemplo, una CPU moderna prefiere leer un entero de 32 bits (`u32`) desde una dirección de memoria que sea múltiplo de 4. Si intentamos leerlo desde una dirección no alineada, el hardware tendrá que realizar múltiples lecturas de memoria y combinar los resultados, penalizando drásticamente el rendimiento (y en algunas arquitecturas como ARM, provocando un *crash* o fallo de hardware).

Para garantizar esta alineación, los compiladores insertan bytes vacíos entre los campos de un struct. A esto se le conoce como **padding** (relleno).

### La representación por defecto: `#[repr(Rust)]`

Por defecto, Rust utiliza una representación interna (implícitamente `#[repr(Rust)]`) que no garantiza el orden en el que declaraste los campos. **El compilador de Rust es libre de reordenar los campos de tu struct para minimizar el padding y ahorrar memoria.**

Observa este ejemplo:

```rust
use std::mem;

struct UsuarioPredeterminado {
    activo: bool,  // 1 byte (alineación 1)
    id: u64,       // 8 bytes (alineación 8)
    rol_id: u16,   // 2 bytes (alineación 2)
}

fn main() {
    println!("Tamaño: {} bytes", mem::size_of::<UsuarioPredeterminado>());
    // Imprime: Tamaño: 16 bytes
}
```

Si Rust respetara el orden de declaración, el layout en memoria sería:
1. `activo` (1 byte)
2. *Padding* (7 bytes, para alinear el siguiente `u64`)
3. `id` (8 bytes)
4. `rol_id` (2 bytes)
5. *Padding* (6 bytes, para que el tamaño total del struct sea múltiplo de su alineación máxima, que es 8).
**Total teórico sin reordenamiento:** 24 bytes.

Pero Rust reordena los campos internamente (probablemente agrupando `id`, luego `rol_id`, luego `activo`, y un padding final de 5 bytes) para empaquetarlo todo en **16 bytes**. Esta optimización es transparente para nosotros y excelente para reducir la presión sobre la memoria RAM y la caché del procesador.

### Interoperabilidad y predictibilidad: `#[repr(C)]`

La optimización de Rust tiene un problema: si intentas enviar este struct directamente a través de un socket de red a un servicio escrito en C++, o si llamas a una librería de C mediante FFI (que veremos en el Capítulo 47), el otro lenguaje no sabrá cómo Rust reordenó los campos. Leerá basura o corromperá la memoria.

Para estos casos, forzamos el estándar de la industria usando `#[repr(C)]`:

```rust
use std::mem;

#[repr(C)]
struct UsuarioC {
    activo: bool,  
    id: u64,       
    rol_id: u16,   
}

fn main() {
    println!("Tamaño C: {} bytes", mem::size_of::<UsuarioC>());
    // Imprime: Tamaño C: 24 bytes
}
```

Con `#[repr(C)]`, le decimos a Rust: **"Desactiva tus optimizaciones. Respeta estrictamente el orden de declaración y usa las reglas de padding del lenguaje C"**. El tamaño salta a 24 bytes, pero a cambio ganamos un contrato de memoria predecible e interoperable.

### Empaquetado extremo: `#[repr(packed)]`

En ciertos dominios de backend, como el desarrollo de protocolos de red binarios a bajo nivel, la lectura de cabeceras de archivos específicos, o entornos con memoria extremadamente restringida, cada byte cuenta. Aquí es donde entra `#[repr(packed)]`.

Este atributo le indica al compilador que **elimine todo el padding**, forzando una alineación de 1 byte para todos los campos.

```rust
use std::mem;

#[repr(packed)]
struct UsuarioEmpaquetado {
    activo: bool,  // 1 byte
    id: u64,       // 8 bytes
    rol_id: u16,   // 2 bytes
} // Total exacto: 11 bytes

fn main() {
    println!("Tamaño empaquetado: {} bytes", mem::size_of::<UsuarioEmpaquetado>());
    // Imprime: Tamaño empaquetado: 11 bytes
}
```

Hemos reducido el struct a su tamaño absoluto teórico: **11 bytes**. 

**El gran peligro de `#[repr(packed)]`:**
Al eliminar el padding, campos como `id` (`u64`) ahora residen en direcciones de memoria no alineadas. Si intentas crear una referencia directa a ese campo (ej. `&usuario.id`), estarías creando un puntero desalineado, lo cual es **Comportamiento Indefinido (UB)** en Rust. El compilador, de hecho, te lanzará un error o advertencia severa si intentas hacerlo en versiones modernas.

Para leer o escribir de forma segura en campos de un struct empaquetado, debes copiar el valor en lugar de referenciarlo, o utilizar macros específicas de la standard library:

```rust
let usuario = UsuarioEmpaquetado { activo: true, id: 1024, rol_id: 5 };

// FORMA INCORRECTA (Puede causar un panic o UB):
// let id_ref = &usuario.id; 

// FORMA CORRECTA:
// Le decimos a Rust que haga una copia segura desde memoria no alineada
let id_seguro = std::ptr::addr_of!(usuario.id);
let id_valor = unsafe { id_seguro.read_unaligned() };
```

### Resumen de uso en Backend
* Usa el **predeterminado** (`#[repr(Rust)]`) para casi toda tu lógica de negocio. Es rápido y eficiente.
* Usa `#[repr(C)]` cuando interactúes con FFI, llamadas al sistema (syscalls) o leas/escribas estructuras binarias compartidas con otros sistemas compatibles con C.
* Usa `#[repr(packed)]` con extremo cuidado, únicamente cuando estés modelando protocolos de red binarios estrictos donde los bytes exactos importan más que la penalización de rendimiento por accesos desalineados.

## 46.2 Custom Allocators y uso de `jemalloc` / `mimalloc`

Cuando desarrollas servicios backend en Rust, especialmente aquellos que manejan alta concurrencia con frameworks como Tokio o Actix-Web, el manejo de la memoria en el heap (montículo) se vuelve un factor crítico de rendimiento. 

Por defecto, la Standard Library de Rust utiliza el asignador de memoria del sistema operativo subyacente (`std::alloc::System`). Aunque este asignador generalista es suficiente para la mayoría de las aplicaciones, puede convertirse en un cuello de botella en escenarios de estrés extremo. 

### El problema con el System Allocator

En aplicaciones altamente concurrentes, múltiples hilos intentan solicitar y liberar memoria simultáneamente. Esto genera dos problemas principales con los asignadores predeterminados (como `malloc` en glibc o el de Windows):

* **Contención de bloqueos (Lock Contention):** Si varios hilos intentan modificar la estructura global de la memoria al mismo tiempo, el asignador debe usar bloqueos (locks) para evitar la corrupción de datos. Esto obliga a los hilos a esperar su turno, destruyendo los beneficios del paralelismo.
* **Fragmentación de memoria:** Los servicios backend de larga duración que crean y destruyen millones de pequeños objetos (como strings de requests HTTP o nodos de JSON) pueden dejar "huecos" en la memoria. Con el tiempo, esto aumenta el consumo total de RAM del proceso sin justificación real, un fenómeno conocido como fragmentación.

Para mitigar esto, Rust nos permite reemplazar el asignador global mediante el atributo `#[global_allocator]`. Las dos alternativas más populares y probadas en producción son `jemalloc` y `mimalloc`.

### `jemalloc`: El veterano de batalla

`jemalloc` fue desarrollado originalmente para FreeBSD y es famoso por ser el motor detrás del rendimiento de bases de datos como Redis y sistemas de Meta (Facebook). De hecho, fue el asignador por defecto de Rust en sus primeras versiones antes de cambiar al del sistema operativo para reducir el tamaño de los binarios.

Su principal ventaja es la **prevención extrema de la fragmentación**. Es la opción más conservadora y segura si tu aplicación maneja cargas de trabajo irregulares y necesitas garantizar que el uso de memoria no se dispare a lo largo de las semanas o meses de *uptime*.

### `mimalloc`: Rendimiento moderno y concurrencia

Desarrollado por Microsoft Research, `mimalloc` está diseñado desde cero con un enfoque implacable en el rendimiento de aplicaciones multihilo modernas. 

Su arquitectura utiliza cachés locales por hilo (thread-local caches) de manera muy agresiva. Cuando un hilo necesita memoria, `mimalloc` suele asignarla desde su propia caché sin necesidad de comunicarse con otros hilos, eliminando casi por completo la contención de bloqueos. En la mayoría de los benchmarks de aplicaciones asíncronas en Rust, `mimalloc` ofrece el mayor incremento de *throughput* (solicitudes por segundo).

### Implementación: Cambiando el Global Allocator

Sustituir el asignador es sorprendentemente sencillo en Rust. Solo necesitas añadir la dependencia en tu `Cargo.toml` y declarar el `#[global_allocator]` en la raíz de tu proyecto (usualmente `main.rs`).

**Para usar `mimalloc`:**

Primero, añade la dependencia:
```toml
[dependencies]
mimalloc = "0.1"
```

Luego, en tu `main.rs`:
```rust
use mimalloc::MiMalloc;

// Configura mimalloc como el asignador de memoria para todo el programa
#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

fn main() {
    // A partir de aquí, cada Box, Vec, o String usará mimalloc
    let datos = vec![1, 2, 3, 4, 5];
    println!("Asignación rápida y eficiente: {:?}", datos);
}
```

**Para usar `jemalloc`:**

La comunidad mantiene el crate `tikv-jemallocator` (mantenido por el equipo de la base de datos TiKV).

```toml
[dependencies]
tikv-jemallocator = "0.5"
```

En tu `main.rs`:
```rust
use tikv_jemallocator::Jemalloc;

#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;

fn main() {
    let servidor_iniciado = true;
    println!("Servidor backend corriendo con jemalloc: {}", servidor_iniciado);
}
```

### Comparativa rápida para Backend

| Característica | System Allocator | `jemalloc` | `mimalloc` |
| :--- | :--- | :--- | :--- |
| **Uso ideal** | Scripts, CLI, binarios pequeños | Backend general, prevención de fragmentación | Alto *throughput*, Tokio, microservicios |
| **Tamaño del binario** | Pequeño (nativo) | Añade ~300-500 KB | Añade ~100-200 KB |
| **Rendimiento Multihilo** | Medio / Bajo | Alto | Muy Alto |

> **Nota arquitectónica:** Cambiar el allocator no es magia. Solo notarás la diferencia si tu aplicación está fuertemente limitada por la CPU (CPU-bound) en la gestión de memoria o si sufres de latencias altas en colas asíncronas debido a la asignación de objetos.

## 46.3 Smart Pointers avanzados (`Rc`, `Arc`, `RefCell`, `Cell`)

El modelo de *ownership* y *borrowing* estricto de Rust es excelente para garantizar la seguridad de memoria en tiempo de compilación. Sin embargo, en el desarrollo backend, a menudo nos encontramos con arquitecturas donde los datos deben tener **múltiples dueños** (como una caché compartida entre varios *workers*) o donde necesitamos **mutar datos a través de referencias inmutables** (el patrón de *Interior Mutability*). 

Para sortear las limitaciones del comprobador de préstamos sin sacrificar la seguridad, Rust nos provee de *Smart Pointers* (punteros inteligentes) avanzados.

### Múltiples dueños: `Rc<T>` y `Arc<T>`

Normalmente, un valor en Rust tiene un único dueño. Si necesitamos que varios componentes posean el mismo dato y que este solo se destruya cuando el último componente deje de usarlo, recurrimos al conteo de referencias.

**1. `Rc<T>` (Reference Counted)**
`Rc` mantiene un contador interno. Cada vez que llamas a `Rc::clone()`, el contador aumenta. Cuando un clon sale del *scope*, el contador disminuye. Cuando llega a cero, la memoria se libera.

* **Uso en Backend:** Es útil para estructuras de datos complejas (como grafos o árboles de sintaxis al parsear ASTs) dentro de un **mismo hilo**.
* **Limitación:** El contador no es *thread-safe*. Si intentas enviar un `Rc` a otro hilo, el compilador te detendrá (no implementa el trait `Send`).

```rust
use std::rc::Rc;

struct ConfiguracionLocal {
    puerto: u16,
}

fn main() {
    let config = Rc::new(ConfiguracionLocal { puerto: 8080 });
    
    // Clonar un Rc es extremadamente barato; no copia los datos, solo suma 1 al contador
    let modulo_a = Rc::clone(&config);
    let modulo_b = Rc::clone(&config);
    
    println!("Referencias activas: {}", Rc::strong_count(&config)); // Imprime: 3
}
```

**2. `Arc<T>` (Atomic Reference Counted)**
Es el hermano mayor de `Rc`. Utiliza operaciones atómicas del procesador para actualizar el contador de referencias de forma segura entre múltiples hilos.

* **Uso en Backend:** Es el pilar fundamental de la concurrencia en Rust. Lo usarás constantemente para compartir *Pools* de conexiones a bases de datos, configuraciones globales o clientes HTTP a través de tareas asíncronas en frameworks como Tokio o Actix.
* **Costo:** Las operaciones atómicas tienen un ligero costo de rendimiento frente a `Rc`, por lo que solo debe usarse cuando la concurrencia es necesaria.

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let db_url = Arc::new(String::from("postgres://localhost/db"));
    let mut handles = vec![];

    for i in 0..3 {
        // Clonamos el Arc para moverlo al nuevo hilo
        let url_clonada = Arc::clone(&db_url);
        let handle = thread::spawn(move || {
            println!("Worker {} conectando a: {}", i, url_clonada);
        });
        handles.push(handle);
    }

    for h in handles {
        h.join().unwrap();
    }
}
```

### Interior Mutability: `Cell<T>` y `RefCell<T>`

Tanto `Rc` como `Arc` exponen sus datos de forma **inmutable**. Si quieres modificar el contenido compartido, el compilador no te dejará. Aquí entra el patrón de mutabilidad interior, que permite saltarse las reglas de mutabilidad en tiempo de compilación y trasladarlas al tiempo de ejecución.

**3. `Cell<T>`**
Permite mutar el valor que contiene incluso si el `Cell` en sí mismo es inmutable. Funciona copiando (o moviendo) los valores hacia adentro y hacia afuera de la celda. 

* **Uso en Backend:** Ideal para contadores simples, banderas booleanas o máquinas de estado pequeñas en un entorno de un solo hilo, donde el tipo `T` implementa `Copy`. No tiene penalización de rendimiento en tiempo de ejecución.

```rust
use std::cell::Cell;

struct Servidor {
    peticiones_atendidas: Cell<u32>, // Mutabilidad interior
}

impl Servidor {
    // Nota: self es inmutable (&self), pero podemos mutar el contador
    fn manejar_request(&self) {
        let actual = self.peticiones_atendidas.get();
        self.peticiones_atendidas.set(actual + 1);
    }
}
```

**4. `RefCell<T>`**
A diferencia de `Cell`, `RefCell` permite obtener referencias (`&` y `&mut`) a su contenido. Sin embargo, hace cumplir las reglas del *Borrow Checker* (solo una referencia mutable a la vez, o múltiples inmutables) **en tiempo de ejecución**.

* **Uso en Backend:** Muy común al crear Mocks para *Testing* (ver Parte VI del libro), donde necesitas mutar el estado interno de un mock desde un trait que solo permite referencias inmutables.
* **Riesgo:** Si violas las reglas (ej. intentas sacar dos referencias mutables al mismo tiempo mediante `.borrow_mut()`), el programa sufrirá un `panic!` y se detendrá.

### El combo definitivo para Backend

En sistemas concurrentes reales, `Cell` y `RefCell` no sirven porque no son *thread-safe*. La equivalencia multihilo de la mutabilidad interior la proveen los primitivos de sincronización (que vimos en el Capítulo 14).

La arquitectura estándar para compartir estado mutable en un backend Rust se ve así:

| Patrón | Single-Thread (Síncrono) | Multi-Thread / Asíncrono (Backend) |
| :--- | :--- | :--- |
| **Múltiples dueños (Inmutable)** | `Rc<T>` | `Arc<T>` |
| **Mutabilidad Interior (Un dueño)** | `RefCell<T>` | `Mutex<T>` o `RwLock<T>` |
| **El Santo Grial (Múltiples dueños, Mutable)** | `Rc<RefCell<T>>` | **`Arc<Mutex<T>>`** o **`Arc<RwLock<T>>`** |

Por lo tanto, cuando necesites compartir una caché en memoria entre miles de peticiones HTTP concurrentes, `Arc<RwLock<HashMap<K, V>>>` será tu estructura de datos de cabecera.

## 46.4 Fugas de memoria voluntarias (`Box::leak`) e involuntarias (Ciclos de referencias)

Existe un mito muy extendido sobre Rust: *"Como Rust no tiene Garbage Collector y tiene el Borrow Checker, es imposible tener fugas de memoria"*. **Esto es falso.** Rust garantiza la seguridad de la memoria (evitando punteros colgantes, lecturas fuera de límites o dobles liberaciones), pero **no garantiza la ausencia de fugas de memoria**. De hecho, filtrar memoria en Rust es completamente seguro desde el punto de vista del compilador (no produce *Undefined Behavior*). En el desarrollo backend, donde nuestros procesos (como servidores Actix o Axum) pueden correr ininterrumpidamente durante meses, comprender cómo y por qué se filtra la memoria es fundamental.

Podemos dividir las fugas de memoria en dos categorías: las que hacemos a propósito como una herramienta arquitectónica, y las que ocurren por errores de diseño.

### Fugas Voluntarias: El poder de `Box::leak`

En ocasiones, necesitamos inicializar una estructura de datos en tiempo de ejecución (leyendo variables de entorno, parseando un archivo YAML) y luego garantizar que esa memoria viva durante el resto de la ejecución del programa, adquiriendo el codiciado *lifetime* `'static`. 

Como los datos dinámicos se alojan en el *heap*, no nacen siendo `'static`. Aquí es donde entra `Box::leak`. Esta función toma un `Box<T>`, desactiva su mecanismo de limpieza automática (el trait `Drop`) y devuelve una referencia mutable `'static mut T` (o inmutable).

**Casos de uso en Backend:**
* Creación de configuraciones globales (*App State*) que se inicializan una vez y son leídas millones de veces sin el costo de un `Arc`.
* *String Interning* u optimización de diccionarios en memoria.
* Interoperabilidad con C (FFI), donde entregamos un puntero a C y le decimos a Rust que deje de rastrearlo.

```rust
#[derive(Debug)]
struct AppConfig {
    db_url: String,
    max_conexiones: u32,
}

impl AppConfig {
    // Retorna una referencia estática a la configuración
    fn cargar_desde_entorno() -> &'static AppConfig {
        // 1. Asignamos en el heap
        let config = Box::new(AppConfig {
            db_url: String::from("postgres://user:pass@localhost/db"),
            max_conexiones: 100,
        });

        // 2. Filtramos la memoria intencionalmente.
        // Rust jamás llamará a `drop` sobre este Box.
        Box::leak(config) 
    }
}

fn main() {
    let global_config = AppConfig::cargar_desde_entorno();
    println!("Iniciando con: {:?}", global_config);
    // El sistema operativo reclamará esta memoria cuando el proceso termine.
}
```

> **Nota arquitectónica:** Usa `Box::leak` de forma esporádica y preferiblemente solo durante el inicio (fase de *bootstrap*) del servidor. Si lo usas dentro de un *handler* de peticiones HTTP, crearás una fuga de memoria catastrófica que tumbará tu servidor en cuestión de horas por falta de RAM (OOM - *Out Of Memory*).

---

### Fugas Involuntarias: Ciclos de referencias

En la sección anterior vimos cómo `Rc` y `Arc` usan conteo de referencias para permitir múltiples dueños. El problema surge cuando combinamos estos *Smart Pointers* con Mutabilidad Interior (`RefCell` o `Mutex`/`RwLock`). 

Si el objeto A tiene un `Arc` que apunta al objeto B, y el objeto B muta su estado para guardar un `Arc` que apunta de vuelta al objeto A, hemos creado un **ciclo de referencias**.

Cuando ambas variables salen de su ámbito (*scope*), Rust intenta disminuir sus contadores. Pero como A es sostenido por B, y B es sostenido por A, sus contadores nunca llegarán a cero. La memoria quedará atrapada en el limbo, inaccesible pero ocupando RAM.

Observa este ejemplo simplificado (usando `Rc` y `RefCell` por legibilidad, pero el mismo desastre ocurre con `Arc` y `Mutex` en un contexto asíncrono):

```rust
use std::rc::Rc;
use std::cell::RefCell;

#[derive(Debug)]
struct Nodo {
    id: i32,
    siguiente: RefCell<Option<Rc<Nodo>>>,
}

fn main() {
    let nodo_a = Rc::new(Nodo { id: 1, siguiente: RefCell::new(None) });
    let nodo_b = Rc::new(Nodo { id: 2, siguiente: RefCell::new(None) });

    // A apunta a B
    *nodo_a.siguiente.borrow_mut() = Some(Rc::clone(&nodo_b));
    // B apunta a A (¡CICLO CREADO!)
    *nodo_b.siguiente.borrow_mut() = Some(Rc::clone(&nodo_a));

    println!("Contador de A: {}", Rc::strong_count(&nodo_a)); // Imprime: 2
    println!("Contador de B: {}", Rc::strong_count(&nodo_b)); // Imprime: 2

    // Al terminar main(), nodo_a y nodo_b salen de scope. 
    // Sus contadores bajan a 1. Como no son 0, no se libera la memoria.
    // ¡Fuga de memoria silenciosa!
}
```

### Rompiendo ciclos con Punteros Débiles (`Weak`)

Para modelar grafos, árboles con referencias al padre, o cachés bidireccionales de forma segura, la Standard Library nos ofrece `std::rc::Weak` (y `std::sync::Weak` para concurrencia).

Un puntero débil (`Weak`) permite referenciar un dato gestionado por un `Rc`/`Arc`, pero **no incrementa el contador principal de referencias fuertes** (`strong_count`). Si el `strong_count` llega a cero, el dato se destruye, incluso si existen punteros débiles apuntando a él.

Para solucionar el ciclo anterior, rediseñamos la estructura:

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

struct NodoSeguro {
    id: i32,
    // El nodo hijo es "dueño" (Strong)
    hijo: RefCell<Option<Rc<NodoSeguro>>>,
    // El enlace de vuelta no otorga propiedad (Weak)
    padre: RefCell<Option<Weak<NodoSeguro>>>, 
}
```

Al intentar leer de un puntero `Weak`, debes llamar al método `.upgrade()`, el cual te devuelve un `Option<Rc<T>>`. Si el dato ya fue liberado, te devolverá `None`, protegiéndote de accesos inválidos.

**En resumen para tu backend:** Sé paranoico cuando uses `Arc<Mutex<T>>` dentro de estructuras de datos anidadas. Si notas que tu contenedor Docker de Rust aumenta su consumo de memoria lenta pero inexorablemente sin picos aparentes, es muy probable que hayas introducido un ciclo de referencias.
