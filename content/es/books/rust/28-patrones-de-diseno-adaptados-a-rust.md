Programar en Rust requiere un cambio de mentalidad: no se trata de forzar la herencia de la OOP tradicional, sino de potenciar la seguridad de memoria y el sistema de tipos. En este capítulo, exploramos cómo el patrón **Builder** evoluciona hacia el **Typestate** para eliminar errores de configuración en tiempo de compilación. Implementamos el **Newtype** para dotar de semántica y validación a los primitivos, y desacoplamos la lógica mediante **Command** y **Strategy** usando Traits. Finalmente, identificamos los anti-patrones comunes —como el abuso de `Rc<RefCell>`— para abrazar un diseño "Rustic" orientado a datos, eficiente y libre de pánicos en ejecución.</RefCell>

## 28.1 El patrón Builder y el patrón Typestate (Estados en compilación)

En el desarrollo Backend, a menudo nos enfrentamos a la creación de estructuras de datos complejas: configuraciones de servidores, constructores de peticiones HTTP, o clientes de bases de datos. En lenguajes orientados a objetos, resolveríamos la instanciación con sobrecarga de constructores o parámetros con nombre. Rust no soporta ninguna de estas dos características por diseño.

Para solucionar esto, utilizamos el **Patrón Builder**. Sin embargo, en Rust no nos conformamos con replicar el patrón clásico; lo llevamos un paso más allá utilizando el sistema de tipos para crear el **Patrón Typestate**, garantizando que los errores de inicialización se detecten en tiempo de compilación y no en ejecución.

---

### El Patrón Builder Clásico (Validación en Ejecución)

El patrón Builder clásico separa la construcción de un objeto complejo de su representación. En Rust, esto se logra creando un struct auxiliar (el "builder") donde los campos opcionales o pendientes de inicializar se envuelven en el enum `Option<T>`.

Imagina que estamos configurando un servidor web. Necesitamos un host, un puerto y un nivel de logging.

```rust
#[derive(Debug)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub log_level: String,
}

pub struct ServerConfigBuilder {
    host: Option<String>,
    port: Option<u16>,
    log_level: String, // Tiene un valor por defecto, no necesita Option
}

impl ServerConfigBuilder {
    pub fn new() -> Self {
        Self {
            host: None,
            port: None,
            log_level: "INFO".to_string(),
        }
    }

    // Tomamos `mut self` para encadenar métodos de forma fluida
    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }

    pub fn log_level(mut self, level: &str) -> Self {
        self.log_level = level.to_string();
        self
    }

    // El método build() valida el estado y devuelve un Result
    pub fn build(self) -> Result<ServerConfig, &'static str> {
        let host = self.host.ok_or("El host es obligatorio")?;
        let port = self.port.ok_or("El puerto es obligatorio")?;

        Ok(ServerConfig {
            host,
            port,
            log_level: self.log_level,
        })
    }
}
```

**El problema de este enfoque:** Si el desarrollador olvida configurar el `host` o el `port`, el código compilará sin problemas, pero fallará en tiempo de ejecución devolviendo un `Err`. En un entorno backend crítico, queremos evitar que configuraciones inválidas lleguen siquiera a ejecutarse.

---

### El Patrón Typestate: Estados en Compilación

Aquí es donde Rust brilla. El patrón **Typestate** (Estado tipado) codifica el estado de tu aplicación o de tu Builder directamente en el sistema de tipos utilizando **Genéricos** y **Zero-Sized Types (ZSTs)** (Tipos de tamaño cero). 

En lugar de validar en el método `.build()` y devolver un `Result`, hacemos que el método `.build()` *solo exista* si el builder se encuentra en un estado válido. Si intentas compilar un estado inválido, el compilador (el *Borrow Checker* y el sistema de tipos) te detendrá.

Veamos cómo reconstruir el ejemplo anterior garantizando que el `host` y el `port` sean obligatorios.

#### 1. Definir los Marcadores de Estado (ZSTs)
Estos structs no ocupan memoria en ejecución; solo existen para guiar al compilador.

```rust
// Estados para el Host
pub struct HostMissing;
pub struct HostSet(String);

// Estados para el Puerto
pub struct PortMissing;
pub struct PortSet(u16);
```

#### 2. Definir el Builder Genérico
El Builder ahora usa parámetros genéricos para rastrear el estado de cada campo crítico.

```rust
pub struct SafeServerBuilder<H, P> {
    host: H,
    port: P,
    log_level: String,
}
```

#### 3. Implementar las Transiciones de Estado
Usamos el bloque `impl` para definir qué métodos están disponibles en cada estado. Presta especial atención a cómo los métodos **consumen `self`** (tomando ownership) y devuelven un *nuevo* tipo, impidiendo que el estado anterior vuelva a ser utilizado.

```rust
// 1. Estado inicial: Falta Host y falta Puerto
impl SafeServerBuilder<HostMissing, PortMissing> {
    pub fn new() -> Self {
        Self {
            host: HostMissing,
            port: PortMissing,
            log_level: "INFO".to_string(),
        }
    }
}

// 2. Métodos disponibles sin importar el estado de los otros campos
impl<H, P> SafeServerBuilder<H, P> {
    pub fn log_level(mut self, level: &str) -> Self {
        self.log_level = level.to_string();
        self
    }
}

// 3. Transición: Configurar Host (De HostMissing a HostSet)
impl<P> SafeServerBuilder<HostMissing, P> {
    pub fn host(self, host: impl Into<String>) -> SafeServerBuilder<HostSet, P> {
        SafeServerBuilder {
            host: HostSet(host.into()),
            port: self.port,
            log_level: self.log_level,
        }
    }
}

// 4. Transición: Configurar Puerto (De PortMissing a PortSet)
impl<H> SafeServerBuilder<H, PortMissing> {
    pub fn port(self, port: u16) -> SafeServerBuilder<H, PortSet> {
        SafeServerBuilder {
            host: self.host,
            port: PortSet(port),
            log_level: self.log_level,
        }
    }
}

// 5. El método final: SOLO existe si ambos están configurados
impl SafeServerBuilder<HostSet, PortSet> {
    pub fn build(self) -> ServerConfig {
        ServerConfig {
            host: self.host.0,
            port: self.port.0,
            log_level: self.log_level,
        }
    }
}
```

#### El resultado en la práctica

Cuando utilices este código, la experiencia de desarrollo (gracias a herramientas como `rust-analyzer`) es inmejorable:

```rust
// Esto compila perfectamente. Observa que build() no devuelve un Result, 
// devuelve directamente el ServerConfig. ¡Es 100% seguro!
let config = SafeServerBuilder::new()
    .host("127.0.0.1")
    .port(8080)
    .log_level("DEBUG")
    .build(); 

// ❌ ERROR DE COMPILACIÓN:
// let bad_config = SafeServerBuilder::new()
//     .host("127.0.0.1")
//     .build(); 
//
// El compilador dirá: 
// no method named `build` found for struct `SafeServerBuilder<HostSet, PortMissing>`
```

### Cuándo usar cada enfoque

Aunque el patrón Typestate parece magia, añade una carga cognitiva y verbosidad (boilerplate) a tu código. 

* **Usa el Builder clásico (Validación en Runtime):** Cuando la configuración tiene decenas de campos opcionales, cuando los parámetros se construyen dinámicamente a partir de un archivo JSON o de variables de entorno, o cuando el struct no es un componente crítico del core de tu dominio.
* **Usa Typestate (Validación en Compilación):** En el diseño del *Core* de tu dominio (Domain-Driven Design), cuando construyes librerías públicas (crates) donde quieres guiar al usuario mediante el autocompletado del IDE, o para gestionar flujos finitos (ej: Un `Socket` que debe pasar de estado `Desconectado` a `Conectado` antes de poder llamar a `.send()`).

## 28.2 El patrón Newtype para seguridad de dominio

En la sección anterior vimos cómo el compilador de Rust puede ayudarnos a gestionar el estado de nuestras estructuras. Ahora aplicaremos esa misma filosofía para proteger la lógica de nuestro dominio empresarial. 

En el desarrollo backend, lidiamos constantemente con datos primitivos: IDs de base de datos (`String` o `i32`), identificadores de sesión, correos electrónicos o cantidades monetarias (`f64`). Confiar en tipos primitivos para representar conceptos de dominio complejos conduce a lo que se conoce como *Primitive Obsession* (Obsesión por los primitivos), un anti-patrón que facilita la introducción de bugs silenciosos.

Aquí es donde entra el **patrón Newtype**, una técnica idiomática en Rust que consiste en envolver un tipo existente en un *tuple struct* de un solo elemento para crear un tipo completamente nuevo.

---

### El Problema de los Primitivos

Imagina una función típica en la capa de servicios de una aplicación de e-commerce encargada de procesar un pago:

```rust
pub fn process_payment(user_id: String, account_id: String, amount: f64) -> Result<(), String> {
    // Lógica de pago...
    Ok(())
}
```

¿Qué ocurre si, al llamar a esta función, el desarrollador invierte accidentalmente los argumentos?

```rust
// El compilador lo acepta perfectamente, pero causará un desastre lógico.
process_payment(cuenta_bancaria_id, cliente_id, 100.50);
```

Ambos parámetros son de tipo `String`, por lo que el compilador no tiene forma de saber que representan entidades de dominio completamente distintas.

---

### La Solución: Tipos Fuertes con Newtype

Para resolver esto, creamos un *Newtype* para cada concepto de nuestro dominio. Al ser tipos diferentes, el compilador rechazará cualquier intento de mezclarlos.

```rust
// Definimos nuestros Newtypes
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UserId(pub String);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountId(pub String);

#[derive(Debug, Clone, PartialEq)]
pub struct Amount(pub f64);

// Refactorizamos la función
pub fn process_payment_safe(user: UserId, account: AccountId, amount: Amount) -> Result<(), String> {
    // Lógica de pago...
    Ok(())
}
```

Ahora, intentar pasar un `AccountId` donde se espera un `UserId` resultará en un error inmediato en tiempo de compilación.

**Dato clave sobre rendimiento:** En Rust, el patrón Newtype es una *Zero-cost abstraction* (abstracción de coste cero). Durante el proceso de compilación, Rust elimina las envolturas del struct. En tiempo de ejecución, un `UserId(String)` ocupa exactamente la misma memoria y se ejecuta con la misma rapidez que un `String` desnudo.

---

### Beneficios Avanzados del Patrón Newtype

Además de evitar la mezcla accidental de parámetros, el patrón Newtype nos ofrece dos superpoderes adicionales cruciales para el desarrollo backend.

#### 1. Validación en el Constructor (Smart Constructors)
Si mantenemos el campo interno privado (sin usar `pub`), podemos forzar a que la creación del tipo pase por una función validadora. De este modo, garantizamos que si posees una instancia del tipo, sus datos son semánticamente válidos.

```rust
#[derive(Debug, Clone)]
pub struct Email(String); // El campo interno es privado

impl Email {
    // Única forma de crear un Email
    pub fn new(address: String) -> Result<Self, &'static str> {
        if address.contains('@') && address.contains('.') {
            Ok(Self(address))
        } else {
            Err("Formato de email inválido")
        }
    }

    // Método getter para acceder al valor interno
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
```

Si una función de tu API recibe como parámetro un `Email` en lugar de un `String`, sabes con un 100% de certeza que el correo ya ha sido validado, eliminando la necesidad de repetir comprobaciones (reduciendo el código defensivo).

#### 2. Evasión de la Regla de los Huérfanos (Orphan Rule)
Rust tiene una regla estricta: solo puedes implementar un Trait en un tipo si el Trait o el tipo fueron definidos en tu *crate* (paquete). No puedes, por ejemplo, implementar el trait `Display` (de la Standard Library) directamente para un `Vec<T>` (también de la Standard Library).

El patrón Newtype es la solución legal a esta restricción:

```rust
use std::fmt;

// Creamos un Newtype local que envuelve al tipo externo
pub struct UserList(Vec<String>);

// Ahora SÍ podemos implementar Display, porque UserList es nuestro
impl fmt::Display for UserList {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[ {} ]", self.0.join(", "))
    }
}
```

---

### Ergonomía: Recuperando los métodos del tipo original

El mayor inconveniente del patrón Newtype es que pierdes acceso directo a los métodos del tipo encapsulado. Si envuelves un `String`, no puedes llamar directamente a `.len()` o `.to_uppercase()`.

Para mitigar esto sin exponer los datos, los desarrolladores en Rust suelen:

* Proporcionar métodos delegados explícitos (como el `as_str()` visto arriba).
* Implementar el trait `Deref` para que el Newtype se comporte como una referencia al tipo interno de forma automática.

```rust
use std::ops::Deref;

impl Deref for UserId {
    type Target = String;

    fn deref(&self) -> &Self::Target {
        &self.0 // Retorna una referencia al String interno
    }
}

// Ahora puedes hacer:
// let id = UserId("usr_123".to_string());
// println!("Longitud del ID: {}", id.len()); // Usa el .len() de String
```

**Nota de precaución:** Usa `Deref` solo cuando el Newtype sea estrictamente un "subtipo" o una extensión transparente del original. Si el Newtype restringe el dominio (como el caso de `Email`), es preferible usar métodos explícitos para mantener el control de los datos.

## 28.3 Command Pattern y Estrategias mediante Traits

En el desarrollo backend, los requisitos cambian constantemente. Hoy tu aplicación procesa pagos con Stripe, pero mañana la directiva podría exigir la integración con PayPal o MercadoPago. Del mismo modo, es posible que necesites encolar tareas para ejecutarlas en segundo plano (envío de correos, generación de reportes). 

En la programación orientada a objetos tradicional, resolveríamos esto mediante clases abstractas y herencia. En Rust, que favorece la composición sobre la herencia, resolvemos ambos escenarios —el cambio de algoritmos (Strategy) y la encapsulación de acciones (Command)— utilizando **Traits**.

Aunque estructuralmente se ven muy parecidos (ambos definen una interfaz común), su propósito semántico es distinto: **Strategy** define *cómo* hacer algo, mientras que **Command** define *qué* hacer.

---

### El Patrón Strategy: Intercambiando Algoritmos

El patrón Strategy nos permite definir una familia de algoritmos, encapsular cada uno de ellos y hacerlos intercambiables sin alterar el código del cliente que los utiliza.

En Rust, definimos la "estrategia" como un `Trait` y cada algoritmo específico como un `Struct` que implementa dicho Trait. 

Aquí debemos tomar una decisión arquitectónica crucial que vimos en el Capítulo 7: **¿Static Dispatch (Genéricos) o Dynamic Dispatch (`dyn Trait`)?**

#### Ejemplo con Static Dispatch (Monamorfización de Genéricos)
Usamos Genéricos cuando la estrategia se conoce en tiempo de compilación y no va a cambiar durante el tiempo de ejecución. Esto garantiza un rendimiento máximo (abstracción de coste cero).

```rust
// 1. Definimos el Trait (La Estrategia)
pub trait PaymentStrategy {
    fn pay(&self, amount: f64) -> Result<(), String>;
}

// 2. Implementaciones concretas
pub struct StripePayment;
impl PaymentStrategy for StripePayment {
    fn pay(&self, amount: f64) -> Result<(), String> {
        println!("Procesando pago de ${} mediante Stripe...", amount);
        Ok(())
    }
}

pub struct PayPalPayment;
impl PaymentStrategy for PayPalPayment {
    fn pay(&self, amount: f64) -> Result<(), String> {
        println!("Procesando pago de ${} mediante PayPal...", amount);
        Ok(())
    }
}

// 3. El Cliente (Usa un genérico <P> limitado por el Trait)
pub struct Checkout<P: PaymentStrategy> {
    payment_method: P,
}

impl<P: PaymentStrategy> Checkout<P> {
    pub fn new(payment_method: P) -> Self {
        Self { payment_method }
    }

    pub fn complete_order(&self, amount: f64) -> Result<(), String> {
        // Delegamos la acción a la estrategia
        self.payment_method.pay(amount)
    }
}

// Uso:
// let checkout = Checkout::new(StripePayment);
// checkout.complete_order(150.00).unwrap();
```

**Cuándo usar Dynamic Dispatch (`Box<dyn PaymentStrategy>`):** Si un usuario puede cambiar su método de pago predeterminado en la base de datos y tu servidor necesita decidir la estrategia *en caliente* (en tiempo de ejecución), no puedes usar Genéricos. Deberás envolver el Trait en un `Box` o un `Arc`.

---

### El Patrón Command: Encapsulando Peticiones

El patrón Command transforma una solicitud o acción en un objeto independiente que contiene toda la información necesaria para ejecutarla. En el backend, esto es la base de las colas de trabajos (Job Queues), sistemas de *retry* (reintentos), y arquitecturas CQRS (Command Query Responsibility Segregation).

A diferencia de Strategy, donde solemos inyectar una única dependencia, con Command solemos almacenar **múltiples comandos heterogéneos** en una colección. Por lo tanto, aquí **estamos obligados a usar Dynamic Dispatch** (`Box<dyn Trait>`).

```rust
// 1. El Trait Command
pub trait Command {
    fn execute(&self) -> Result<(), &'static str>;
    // Opcional en sistemas robustos:
    // fn undo(&self) -> Result<(), &'static str>;
}

// 2. Comandos concretos
pub struct SendEmailCommand {
    pub user_email: String,
    pub template_id: String,
}

impl Command for SendEmailCommand {
    fn execute(&self) -> Result<(), &'static str> {
        println!("Enviando email a {} con template {}", self.user_email, self.template_id);
        Ok(())
    }
}

pub struct UpdateCacheCommand {
    pub key: String,
}

impl Command for UpdateCacheCommand {
    fn execute(&self) -> Result<(), &'static str> {
        println!("Invalidando caché para la llave: {}", self.key);
        Ok(())
    }
}

// 3. El Invocador (Un Job Queue básico)
pub struct JobQueue {
    // Almacenamos Box<dyn Command> porque los comandos tienen distintos tamaños en memoria
    commands: Vec<Box<dyn Command>>,
}

impl JobQueue {
    pub fn new() -> Self {
        Self { commands: Vec::new() }
    }

    pub fn add_job(&mut self, cmd: Box<dyn Command>) {
        self.commands.push(cmd);
    }

    pub fn process_all(&mut self) {
        // En Rust moderno, podríamos usar `.drain(..)` para consumir y ejecutar
        for cmd in self.commands.drain(..) {
            if let Err(e) = cmd.execute() {
                eprintln!("Fallo al ejecutar el comando: {}", e);
            }
        }
    }
}
```

#### El poder de los Closures como Comandos Ligeros

En Rust, no siempre necesitas crear structs completos para implementar el patrón Command. Gracias a los traits `Fn`, `FnMut` y `FnOnce` (que cubrimos en el Capítulo 9), a menudo puedes usar simples *Closures* (funciones anónimas) para encolar comportamiento, lo cual reduce drásticamente el código repetitivo o *boilerplate*:

```rust
// Una cola que acepta cualquier closure que no reciba argumentos y retorne nada
type SimpleCommand = Box<dyn FnOnce()>;

let mut queue: Vec<SimpleCommand> = Vec::new();
queue.push(Box::new(|| println!("Tarea rápida ejecutada!")));
```

### Resumen de la estrategia en Rust

* Usa **Traits genéricos (Static Dispatch)** para estrategias de alto rendimiento fijadas en compilación.
* Usa **`dyn Trait` (Dynamic Dispatch)** cuando necesites flexibilidad en tiempo de ejecución o colecciones de objetos de diferentes tipos (Comandos).
* Usa **Closures** si el comando es tan simple que no requiere estado complejo ni métodos adicionales como `undo()`.

## 28.4 Anti-patrones comunes en Rust orientado a objetos

La curva de aprendizaje más pronunciada en Rust no suele ser la sintaxis, sino el "desaprendizaje" de los hábitos adquiridos en lenguajes orientados a objetos tradicionales como Java, C# o Python. Cuando los desarrolladores intentan escribir código puramente orientado a objetos en Rust, terminan luchando constantemente contra el *Borrow Checker* (Comprobador de Préstamos).

A continuación, analizaremos los anti-patrones más comunes que surgen al intentar forzar el paradigma de OOP en Rust, y cómo resolverlos utilizando el enfoque idiomático del lenguaje (o *Rustic way*).

---

### 1. El "Mar de Referencias" (Abuso de `Rc<RefCell<T>>`)

En lenguajes con Recolector de Basura (Garbage Collector), es trivial crear objetos que se apuntan entre sí. Un ejemplo clásico es un árbol bidireccional o un grafo donde un "Hijo" conoce a su "Padre" y viceversa. 

Cuando intentas replicar esto en Rust, el compilador rechaza las referencias mutables múltiples. La "vía de escape" típica de un principiante es envolver todo en `Rc<RefCell<T>>` (o `Arc<Mutex<T>>` en concurrencia) para lograr **mutabilidad compartida**.

**El Anti-patrón (Malo):**
```rust
use std::cell::RefCell;
use std::rc::Rc;

// Intentando replicar una jerarquía bidireccional clásica
pub struct Node {
    pub value: i32,
    pub parent: Option<Rc<RefCell<Node>>>,
    pub children: Vec<Rc<RefCell<Node>>>,
}
```

**Por qué es peligroso:**
1. **Fugas de memoria:** Si un Padre apunta a un Hijo, y el Hijo apunta al Padre mediante `Rc` (Reference Counting), se crea un ciclo de referencias. El contador nunca llegará a cero y la memoria nunca se liberará (a menos que uses `Weak`, lo cual añade más complejidad).
2. **Pánicos en ejecución:** `RefCell` mueve las reglas del Borrow Checker al tiempo de ejecución. Si intentas pedir un préstamo mutable (`.borrow_mut()`) dos veces en el mismo ámbito de ejecución accidentalmente, tu servidor colapsará con un `panic!`.
3. **Verbosidad:** Leer y escribir código lleno de `.borrow().unwrap()` es agotador y propenso a errores.

**La Solución Idiomática: Arenas e Índices (Diseño Orientado a Datos)**
En lugar de que los objetos se posean entre sí, guarda todos los nodos en una colección central (una Arena) y usa IDs (índices `usize`) para relacionarlos. Esto es mucho más amigable con la caché de la CPU y elimina los problemas de Ownership.

```rust
// El enfoque "Rustic way"
pub struct Node {
    pub value: i32,
    pub parent_id: Option<usize>,
    pub children_ids: Vec<usize>,
}

pub struct Tree {
    pub arena: Vec<Node>, // Todos los nodos viven aquí
}

impl Tree {
    pub fn get_parent(&self, node_id: usize) -> Option<&Node> {
        let node = &self.arena[node_id];
        node.parent_id.map(|id| &self.arena[id])
    }
}
```

---

### 2. Getter y Setter Mania (Encapsulación ciega)

En Java, es una regla de oro hacer todos los atributos privados y exponer métodos `get_...()` y `set_...()`. Muchos desarrolladores trasladan esta práctica a Rust, creando código *boilerplate* innecesario.

**El Anti-patrón:**
```rust
pub struct User {
    name: String,
    age: u8,
}

impl User {
    pub fn get_name(&self) -> &str { &self.name }
    pub fn set_name(&mut self, name: String) { self.name = name; }
    pub fn get_age(&self) -> u8 { self.age }
    pub fn set_age(&mut self, age: u8) { self.age = age; }
}
```

**La Solución Idiomática: Campos Públicos para Datos Puros**
En Rust, la privacidad a nivel de módulo es muy potente. Si un `Struct` es puramente un contenedor de datos (como un DTO o un modelo de base de datos) y **no tiene invariantes que proteger**, simplemente haz los campos públicos.

```rust
// Mucho más limpio y directo
pub struct User {
    pub name: String,
    pub age: u8,
}
```

**¿Cuándo usar Getters/Setters en Rust?** Solo cuando necesites mantener un **invariante de dominio** (como vimos con el patrón *Newtype*) o cuando cambiar un valor requiera un efecto secundario (por ejemplo, actualizar una fecha de modificación interna).

---

### 3. Simulando Jerarquías de Herencia (Jerarquías profundas)

Rust **no soporta la herencia de structs**. No existe `class Perro extends Animal`. Intentar emular esto incrustando structs dentro de structs o creando complejas redes de "Supertraits" (Traits que requieren otros Traits) suele resultar en una arquitectura rígida.

**El Anti-patrón (Herencia mediante composición forzada):**
```rust
struct BaseEntity { id: i32, created_at: String }
struct UserEntity { base: BaseEntity, username: String }
struct AdminEntity { user: UserEntity, super_powers: bool }
// Acceder al ID requiere: admin.user.base.id 
```

**La Solución Idiomática: Composición plana y Traits pequeños**
En lugar de pensar en "lo que *es*" un objeto (herencia), Rust te invita a pensar en "lo que *hace*" (comportamiento mediante Traits). Usa composición para los datos, pero mantén las estructuras planas. Si varias entidades comparten comportamiento, define un Trait.

```rust
pub trait Identifiable {
    fn id(&self) -> i32;
}

pub struct User { pub id: i32, pub username: String }
pub struct Admin { pub id: i32, pub super_powers: bool }

impl Identifiable for User { fn id(&self) -> i32 { self.id } }
impl Identifiable for Admin { fn id(&self) -> i32 { self.id } }
```

---

### 4. Polimorfismo por Defecto (Abuso de `dyn Trait`)

En lenguajes OOP, cualquier variable de tipo interfaz implica *Dynamic Dispatch* (búsqueda de métodos en tiempo de ejecución a través de una vtable). Cuando los programadores llegan a Rust, tienden a usar `Box<dyn Trait>` o `&dyn Trait` en todas las firmas de funciones para lograr polimorfismo, ignorando el impacto en el rendimiento.

**La Solución Idiomática: Genéricos por defecto**
A menos que necesites almacenar tipos diferentes en una misma colección (como vimos en el Patrón Command), prefiere siempre los genéricos y el *Static Dispatch*. El compilador generará una versión optimizada de tu función para cada tipo exacto, sin coste en tiempo de ejecución.

```rust
// MAL (A menos que sea estrictamente necesario):
fn process_payment(strategy: &dyn PaymentStrategy) { ... }

// BIEN (Static Dispatch / Monomorfización):
fn process_payment<P: PaymentStrategy>(strategy: &P) { ... }

// AÚN MEJOR (Sintaxis simplificada de impl Trait):
fn process_payment(strategy: &impl PaymentStrategy) { ... }
```

### Conclusión del Capítulo

Dominar los patrones de diseño en Rust no se trata de traducir los patrones del libro del *GoF (Gang of Four)* línea por línea, sino de entender cómo el Ownership, los Traits y el sistema de tipos de Rust nos ofrecen herramientas más seguras (como el Typestate) y más eficientes. Abandonar los hábitos de la OOP estricta y abrazar el diseño orientado a datos es la verdadera marca de transición hacia un nivel Senior en Rust.
