En el desarrollo de backend con Rust, la fiabilidad no solo depende del sistema de tipos, sino de cómo aislamos la lógica de negocio de sus efectos secundarios. Este capítulo aborda el arte de simular dependencias para garantizar tests rápidos y deterministas. Exploraremos desde la creación de mocks manuales basados en **Traits** y mutabilidad interior con `RefCell`, hasta la automatización avanzada con el crate **`mockall`**. Aprenderás a diseñar fronteras arquitectónicas claras mediante la inyección de dependencias, permitiéndote sustituir infraestructuras complejas, como APIs externas o sistemas de archivos, por implementaciones de prueba controladas y robustas.

## 24.1 Cuándo usar Mocks en Rust

En lenguajes dinámicos como Python, Ruby o JavaScript, la práctica de crear "mocks" (objetos simulados) es omnipresente. La facilidad para sobrescribir métodos o interceptar llamadas en tiempo de ejecución hace que aislar componentes sea trivial. Sin embargo, en Rust, el tipado estático, las estrictas reglas de *ownership* y la ausencia de herencia tradicional cambian drásticamente las reglas del juego.

En el ecosistema de Rust, los mocks no se aplican por defecto a cada dependencia. En su lugar, se utilizan estratégicamente en las fronteras de nuestra aplicación. Entender **cuándo** introducirlos es fundamental para mantener una suite de pruebas que sea rápida, determinista y, sobre todo, resistente a refactorizaciones.

### El cambio de paradigma: Estado vs. Interacción

Antes de decidir si debes mockear una dependencia, es vital entender la diferencia entre dos estilos de testing:

* **Testing basado en estado (State-based):** Ejecutas una acción y verificas que el estado final del sistema (o el valor de retorno) es el correcto.
* **Testing basado en interacción (Interaction-based):** Verificas *cómo* interactúan los objetos entre sí (ej. "¿Se llamó al método `send_email` exactamente una vez con estos parámetros?").

Rust favorece fuertemente el **testing basado en estado**. Gracias a que el sistema de tipos garantiza gran parte de la corrección estructural, a menudo es más eficiente pasar estructuras de datos reales instanciadas en memoria que crear complejas simulaciones de comportamiento.

### Cuándo SÍ debes usar Mocks

Debes recurrir a los mocks cuando interactúas con componentes que están fuera del control determinista de tu test unitario. Los casos de uso ideales incluyen:

1. **APIs de Terceros (Sistemas Externos):**
    Si tu backend se comunica con pasarelas de pago (Stripe), proveedores de email (SendGrid) o servicios en la nube (AWS S3), **siempre** debes mockear estas interacciones en tus tests unitarios. No quieres que tu CI/CD falle porque la API de Stripe esté caída, ni quieres realizar cargos reales a tarjetas de crédito durante el desarrollo.

2. **Comportamiento No Determinista:**
    Cualquier código que dependa del tiempo real (`std::time::SystemTime`) o de la generación de números aleatorios puros. Si tu lógica de negocio dicta que un token expira en 15 minutos, mockear el reloj del sistema te permite "viajar en el tiempo" instantáneamente en tus tests sin tener que hacer un `sleep` de 15 minutos.

3. **Efectos Secundarios Destructivos o Irreversibles:**
    Acciones como enviar notificaciones push a usuarios, borrar archivos irrecuperables del disco o emitir eventos a un bus de mensajes (como Kafka o RabbitMQ) hacia otros microservicios.

4. **Sistemas Extremadamente Lentos:**
    Si la inicialización de una dependencia real toma varios segundos, destruirá el ciclo de feedback rápido que buscamos en los tests unitarios.

**Ejemplo de una frontera ideal para un Mock:**

Para preparar tu código para ser mockeado, debes depender de abstracciones (`Traits`) en lugar de implementaciones concretas. Este concepto será la base anatómica que exploraremos en detalle al aplicar Inyección de Dependencias (Sección 24.4).

```rust
use async_trait::async_trait;

#[derive(Debug, PartialEq)]
pub struct PaymentError(pub String);

// Esta es la frontera arquitectónica. 
// En producción usaremos una implementación real, en tests un Mock.
#[async_trait]
pub trait PaymentGateway {
    async fn charge(&self, amount: f64, user_id: &str) -> Result<String, PaymentError>;
}
```

### Cuándo EVITAR los Mocks en Rust

Uno de los errores más comunes de los desarrolladores Senior que migran a Rust desde lenguajes como Java o C# es intentar mockear *absolutamente todo*, incluyendo la base de datos y la lógica interna de la aplicación. En Rust, esto resulta en código excesivamente complejo y lleno de `Box<dyn Trait>` innecesarios.

Evita usar mocks en los siguientes escenarios:

1. **Bases de Datos Relacionales (Postgres, MySQL):**
    Aunque podrías crear un `Trait` para tu repositorio y mockearlo, la experiencia demuestra que los tests de repositorios mockeados son frágiles y proporcionan falsa seguridad (no detectan errores de sintaxis SQL o violaciones de constraints). En Rust, es preferible levantar una base de datos efímera real utilizando **Testcontainers** (que abordaremos en profundidad en el Capítulo 26) o usar transacciones con rollback automático mediante SQLx (Capítulo 20).

2. **Lógica de Dominio Pura (Value Objects y Entidades):**
    Si estás aplicando Domain-Driven Design (Capítulo 31), el núcleo de tu dominio no debería tener dependencias externas. Una función que calcula impuestos basándose en un struct de entrada debería ser testeada pasando valores reales, no mockeando la función de cálculo.

3. **Operaciones de I/O Estándar (Archivos y Buffers):**
    No necesitas mockear el sistema de archivos si tu función simplemente necesita leer datos secuenciales. En lugar de recibir un `File`, haz que tu función acepte cualquier cosa que implemente el trait `std::io::Read` o `std::io::Write`. En tus tests, simplemente pásale un `std::io::Cursor<Vec<u8>>` que vive enteramente en la memoria RAM.

```rust
use std::io::{Read, Result};

// ❌ Malo: Acoplado al sistema de archivos (difícil de testear sin tocar el disco)
// fn process_file(path: &str) -> Result<String> { ... }

// ✅ Bueno: Acepta cualquier lector. No requiere Mocks externos, 
// basta con pasar un Cursor de un array de bytes en el test.
fn process_data<R: Read>(mut reader: R) -> Result<String> {
    let mut buffer = String::new();
    reader.read_to_string(&mut buffer)?;
    // ... lógica de procesamiento ...
    Ok(buffer)
}
```

### El Costo de los Mocks

En Rust, introducir un mock significa introducir una barrera de abstracción genérica o de *dynamic dispatch* (`dyn Trait`). Esto tiene implicaciones en el diseño de tu software. Un diseño fuertemente basado en interfaces mockeadas puede llevar a una arquitectura más compleja de mantener y entender.

La regla de oro para el Backend Developer en Rust es: **Usa objetos reales siempre que el costo de instanciarlos (en tiempo, determinismo o infraestructura) sea insignificante. Reserva los mocks como escudos protectores en las fronteras incontrolables de tu aplicación.**

Con esta premisa clara sobre *cuándo* necesitamos simular comportamientos, en la siguiente sección (24.2) construiremos nuestros propios mocks desde cero utilizando únicamente las herramientas nativas del lenguaje, antes de automatizar este proceso con librerías especializadas.

## 24.2 Creación de Mocks manuales mediante Traits

En lenguajes orientados a objetos tradicionales, las librerías de testing suelen utilizar técnicas de reflexión o herencia para interceptar llamadas a métodos y generar *mocks* al vuelo. En Rust, la ausencia de herencia tradicional y la estricta seguridad de memoria impiden este enfoque mágico.

Para crear un mock en Rust, la regla es simple: **si quieres simular un comportamiento, ese comportamiento debe estar definido por un `Trait`.** Un mock manual no es más que un `struct` de prueba que implementa dicho trait, almacenando el estado necesario para verificar que se llamó correctamente.

### El patrón de diseño para Mocks Manuales

Imagina que estamos construyendo un caso de uso para registrar usuarios en nuestra plataforma. Al finalizar, debemos enviarles un correo de bienvenida. Basándonos en lo aprendido en la sección anterior, sabemos que no queremos enviar correos reales durante los tests, por lo que aislamos esta dependencia con un Trait.

```rust
// 1. Definimos la frontera (El Trait)
pub trait EmailSender {
    fn send_email(&self, to: &str, subject: &str) -> Result<(), String>;
}

// 2. Nuestra lógica de dominio que consume el Trait
pub struct UserRegistration<E: EmailSender> {
    email_sender: E,
}

impl<E: EmailSender> UserRegistration<E> {
    pub fn new(email_sender: E) -> Self {
        Self { email_sender }
    }

    pub fn register_user(&self, email: &str) -> Result<(), String> {
        // Lógica de guardado en BD aquí...
        
        // Llamada a la dependencia externa
        self.email_sender.send_email(email, "¡Bienvenido a nuestro backend!")?;
        Ok(())
    }
}
```

### Implementando el Mock y el problema del Ownership

Para probar `UserRegistration`, necesitamos un `MockEmailSender`. Queremos que este mock registre cuántas veces se llamó a `send_email` y con qué argumentos, para luego hacer un `assert!` en nuestro test.

Aquí nos encontramos con un desafío clásico de Rust: el método `send_email` toma `&self` (una referencia inmutable), pero para registrar que el método fue llamado, ¡necesitamos mutar el estado interno del mock! Además, `UserRegistration` toma *ownership* (propiedad) del mock al instanciarse.

Para resolver esto, utilizamos el patrón de **Mutabilidad Interior (Interior Mutability)** con `Rc` y `RefCell`.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::rc::Rc;

    // 3. El struct de nuestro Mock Manual
    struct MockEmailSender {
        // Almacenamos un historial de los emails enviados.
        // Rc<RefCell<...>> nos permite compartir la referencia y mutarla internamente.
        sent_emails: Rc<RefCell<Vec<String>>>,
        // Podemos añadir configuraciones para forzar errores
        force_error: bool,
    }

    impl MockEmailSender {
        // Retornamos el Mock y una referencia al estado para poder inspeccionarlo después
        fn new(force_error: bool) -> (Self, Rc<RefCell<Vec<String>>>) {
            let state = Rc::new(RefCell::new(Vec::new()));
            (
                Self {
                    sent_emails: Rc::clone(&state),
                    force_error,
                },
                state,
            )
        }
    }

    // 4. Implementamos el Trait para el Mock
    impl EmailSender for MockEmailSender {
        fn send_email(&self, to: &str, subject: &str) -> Result<(), String> {
            if self.force_error {
                return Err("Error simulado de red (Timeout)".to_string());
            }
            
            // Mutamos el estado interno a pesar de tener &self
            self.sent_emails.borrow_mut().push(to.to_string());
            Ok(())
        }
    }

    #[test]
    fn test_register_user_sends_welcome_email() {
        // Arrange
        let (mock_sender, sent_emails_state) = MockEmailSender::new(false);
        let service = UserRegistration::new(mock_sender);

        // Act
        let result = service.register_user("test@example.com");

        // Assert
        assert!(result.is_ok());
        
        // Inspeccionamos el estado compartido
        let emails = sent_emails_state.borrow();
        assert_eq!(emails.len(), 1);
        assert_eq!(emails[0], "test@example.com");
    }

    #[test]
    fn test_register_user_handles_email_failure() {
        // Arrange: Configuramos el mock para que falle
        let (mock_sender, _) = MockEmailSender::new(true);
        let service = UserRegistration::new(mock_sender);

        // Act
        let result = service.register_user("test@example.com");

        // Assert
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Error simulado de red (Timeout)");
    }
}
```

### Ventajas y Desventajas de los Mocks Manuales

Hacer mocks manuales es una técnica excelente y, en muchos equipos, es la estrategia preferida por las siguientes razones:

**Ventajas:**

* **Transparencia absoluta:** No hay "magia" de macros. El código hace exactamente lo que lees.
* **Tiempos de compilación:** A diferencia de las macros procedurales complejas, compilar un struct normal es instantáneo.
* **Seguridad de tipos estricta:** El compilador de Rust te guiará y te avisará si la firma del Trait original cambia, obligándote a actualizar tu mock.

**Desventajas:**

* **Boilerplate (Código repetitivo):** Si tu `Trait` tiene 10 métodos, tendrás que implementar los 10 en tu mock manual, creando múltiples `Rc<RefCell<T>>` para rastrear los argumentos de cada uno.
* **Flexibilidad limitada:** Configurar el mock para que devuelva diferentes valores en llamadas secuenciales (ej. "falla la primera vez, acierta la segunda") requiere escribir lógica condicional compleja dentro del propio mock.

Crear mocks manuales es ideal para interfaces pequeñas (de 1 a 3 métodos) con comportamientos predecibles. Sin embargo, a medida que tu aplicación escale, este boilerplate se volverá insostenible.

## 24.3 Uso del crate `mockall`

Como vimos en la sección anterior, los mocks manuales son útiles pero introducen una cantidad abrumadora de código repetitivo (boilerplate) y nos obligan a lidiar manualmente con la mutabilidad interior (`Rc<RefCell<T>>`) para poder registrar el estado de las llamadas.

Para proyectos reales a nivel de producción, la comunidad de Rust ha estandarizado el uso de librerías basadas en macros para automatizar este proceso. El líder indiscutible en este espacio es el crate **`mockall`**.

`mockall` genera automáticamente implementaciones de prueba para nuestros `Traits` en tiempo de compilación, proporcionando una API rica y fluida para establecer expectativas, verificar argumentos y simular valores de retorno, todo sin escribir estructuras adicionales.

### Configuración inicial

Dado que solo necesitamos esta herramienta para nuestras pruebas, debemos agregarla a la sección de dependencias de desarrollo en nuestro `Cargo.toml`:

```toml
[dev-dependencies]
mockall = "0.12" # Asegúrate de usar la versión más reciente
```

### La macro `#[automock]`

La forma más sencilla de utilizar `mockall` es aplicando el atributo `#[automock]` directamente sobre la definición de nuestro Trait.

Retomemos el ejemplo de nuestro `EmailSender` de la sección 24.2 y veamos cómo `mockall` reduce drásticamente el código necesario:

```rust
use mockall::{automock, predicate::*};

// Al añadir esta macro, mockall genera automáticamente un struct 
// llamado `MockEmailSender` detrás de escena.
#[automock]
pub trait EmailSender {
    fn send_email(&self, to: &str, subject: &str) -> Result<(), String>;
}

// Nuestro servicio de dominio sigue siendo exactamente el mismo
pub struct UserRegistration<E: EmailSender> {
    email_sender: E,
}

impl<E: EmailSender> UserRegistration<E> {
    pub fn new(email_sender: E) -> Self { Self { email_sender } }

    pub fn register_user(&self, email: &str) -> Result<(), String> {
        // Lógica de negocio...
        self.email_sender.send_email(email, "¡Bienvenido a nuestro backend!")?;
        Ok(())
    }
}
```

Al compilar este código (en modo test), la macro crea el struct `MockEmailSender`. Nota cómo añade el prefijo `Mock` al nombre original del Trait.

### Configurando Expectativas (Expectations)

El verdadero poder de `mockall` reside en cómo configuramos el comportamiento de este objeto generado. En lugar de mutar un estado manualmente, programamos el mock *antes* de inyectarlo en nuestro servicio.

Veamos cómo se traduce nuestro test anterior usando la API de `mockall`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    // Importamos los predicados para comparar argumentos
    use mockall::predicate::*;

    #[test]
    fn test_register_user_sends_welcome_email_with_mockall() {
        // 1. Instanciamos el mock generado
        let mut mock_sender = MockEmailSender::new();

        // 2. Programamos las expectativas
        mock_sender
            .expect_send_email() // Generado automáticamente por cada método del Trait
            .with(
                eq("test@example.com"), // Verificamos el argumento `to`
                eq("¡Bienvenido a nuestro backend!") // Verificamos el argumento `subject`
            )
            .times(1) // Afirmamos que se debe llamar EXACTAMENTE una vez
            .returning(|_, _| Ok(())); // Definimos qué devuelve cuando se le llama

        // 3. Inyectamos el mock en nuestro servicio
        let service = UserRegistration::new(mock_sender);

        // 4. Ejecutamos la acción
        let result = service.register_user("test@example.com");

        // 5. Verificamos el resultado del estado
        assert!(result.is_ok());
        
        // ¡No necesitamos asserts manuales para las llamadas! 
        // Si el método no fue llamado, o fue llamado con otros argumentos,
        // mockall hará que el test entre en pánico automáticamente al salir del scope.
    }
}
```

### Explorando la API de Expectativas

La fluidez de `mockall` te permite cubrir casos de uso muy específicos sin esfuerzo:

* **Verificación de argumentos (`.with()`):** Utiliza funciones del módulo `mockall::predicate::*` como `eq` (igual a), `ge` (mayor o igual), o `always()` si no te importa el valor de un parámetro específico.
* **Secuencias de retorno (`.returning()` vs `.return_const()`):**
  * Usa `.return_const(Ok(()))` si el valor de retorno siempre es el mismo y es estático/clonable.
  * Usa `.returning(|arg1, arg2| ...)` para calcular un valor de retorno de forma dinámica basándote en los parámetros de entrada.
* **Frecuencia (`.times()`, `.never()`, `.at_least()`):** Valida de forma estricta cuántas veces el código de producción invoca a la dependencia. Si configuras `.never()` y el método se ejecuta, el test fallará inmediatamente.

### Mockeando Traits Externos (`mock!`)

¿Qué ocurre si quieres mockear un Trait que no definiste tú, sino que proviene de la Standard Library o de otro crate externo (por ejemplo, `std::io::Write`)?

Dado que no puedes modificar el código fuente externo para añadirle `#[automock]`, `mockall` provee la macro `mock! { ... }` para generar mocks de Traits foráneos:

```rust
use mockall::mock;
use std::io::{Result, Write};

// Generamos un struct llamado MockWriter que implementa std::io::Write
mock! {
    pub Writer {} // Nombre del struct a generar

    impl Write for Writer {
        fn write(&mut self, buf: &[u8]) -> Result<usize>;
        fn flush(&mut self) -> Result<()>;
    }
}

// Ahora podemos usar MockWriter en nuestros tests
```

### Consideraciones al usar `mockall`

* **Tiempos de compilación:** Las macros procedurales como `#[automock]` tienen un impacto en el tiempo de compilación. Úsalas en los límites arquitectónicos reales, no en cada struct de tu aplicación.
* **Tipos de retorno no clonables:** Si tu método devuelve un tipo que no implementa `Clone` ni `Default`, configurar retornos consecutivos puede ser un poco más verboso que en lenguajes dinámicos.

Con `mockall` en tu caja de herramientas, ya tienes la capacidad técnica de aislar cualquier componente. Sin embargo, para que el código sea verdaderamente testeable, la arquitectura debe permitir que estas dependencias simuladas se introduzcan fácilmente.

## 24.4 Inyección de dependencias para facilitar el testing

La Inyección de Dependencias (DI, por sus siglas en inglés) suele evocar imágenes de frameworks pesados, contenedores mágicos y análisis de código en tiempo de ejecución, típicos de ecosistemas como Java (Spring) o Node.js (NestJS). En Rust, la historia es radicalmente diferente: **la DI no requiere un framework, es un patrón de diseño estructural puro.**

En su esencia más básica, la inyección de dependencias significa que un componente no debe instanciar sus propias dependencias internas, sino que debe recibirlas desde el exterior (generalmente a través de su función constructora).

Si no aplicamos este principio, todo lo que aprendimos en las secciones 24.1, 24.2 y 24.3 sobre la creación de mocks se vuelve completamente inútil, ya que no tendríamos por dónde introducir el objeto simulado en nuestra lógica de negocio.

### El Anti-patrón: Dependencias Hardcodeadas

Observa este ejemplo clásico de código acoplado que es imposible de testear unitariamente sin afectar el mundo real:

```rust
struct PaymentService;

impl PaymentService {
    pub fn new() -> Self {
        Self
    }

    pub async fn process_checkout(&self, amount: f64) -> Result<(), String> {
        // ❌ ANTI-PATRÓN: La dependencia se instancia dentro del método.
        // Es imposible sustituir StripeClient por un mock durante los tests.
        let stripe = StripeClient::connect("api_key_secreta"); 
        
        stripe.charge(amount).await
    }
}
```

### La Solución: Inversión de Control mediante Traits

Para aplicar la Inyección de Dependencias en Rust, debemos depender de abstracciones (Traits) y no de implementaciones concretas (Structs).

En este punto, como desarrollador Backend en Rust, te enfrentarás a una de las decisiones arquitectónicas más importantes: ¿utilizar **Despacho Estático (Genéricos)** o **Despacho Dinámico (`dyn Trait`)**?

#### Opción A: Despacho Estático (Generics y Trait Bounds)

Esta es la forma más "nativa" y de mayor rendimiento en Rust. Consiste en parametrizar nuestro struct con un tipo genérico que implemente nuestro Trait. El compilador generará una copia exacta del código para cada tipo utilizado (Monomorfización), garantizando cero coste en tiempo de ejecución.

```rust
use mockall::automock;

#[automock]
#[async_trait::async_trait]
pub trait PaymentGateway {
    async fn charge(&self, amount: f64) -> Result<(), String>;
}

// ✅ BIEN: El servicio recibe la dependencia genérica
pub struct PaymentService<G: PaymentGateway> {
    gateway: G,
}

impl<G: PaymentGateway> PaymentService<G> {
    // La dependencia se inyecta por el constructor
    pub fn new(gateway: G) -> Self {
        Self { gateway }
    }

    pub async fn process_checkout(&self, amount: f64) -> Result<(), String> {
        self.gateway.charge(amount).await
    }
}
```

**Ventajas:** Máximo rendimiento (el compilador puede hacer *inline* de las llamadas).
**Desventajas:** "Contaminación" de genéricos. Si este servicio es consumido por otro, ese otro servicio también debe ser genérico, propagándose por toda la aplicación hasta el `main`. Esto puede aumentar significativamente los tiempos de compilación.

#### Opción B: Despacho Dinámico (Trait Objects)

Para aplicaciones backend complejas (como las que construiremos con Actix o Axum en los próximos capítulos), la opción preferida suele ser el despacho dinámico usando `Box<dyn Trait>` o `Arc<dyn Trait>`.

Esto implica usar punteros inteligentes que resuelven qué método llamar en tiempo de ejecución (mediante una *vtable*).

```rust
use std::sync::Arc;

// ✅ EXCELENTE PARA BACKEND: Uso de Arc para compartir el estado entre hilos
pub struct PaymentService {
    // Inyectamos un Trait Object protegido por un contador de referencias atómico
    gateway: Arc<dyn PaymentGateway + Send + Sync>,
}

impl PaymentService {
    pub fn new(gateway: Arc<dyn PaymentGateway + Send + Sync>) -> Self {
        Self { gateway }
    }

    pub async fn process_checkout(&self, amount: f64) -> Result<(), String> {
        self.gateway.charge(amount).await
    }
}
```

**Ventajas:** Simplifica enormemente las firmas de los structs. Evita la propagación de genéricos y reduce los tiempos de compilación. Es la forma estándar de inyectar dependencias en el estado compartido de frameworks web asíncronos.
**Desventajas:** Un levísimo coste de rendimiento en tiempo de ejecución debido a la indirección del puntero (imperceptible en el 99% de las aplicaciones I/O bound).

### Ensamblando las piezas en el Test

Gracias a que hemos inyectado la dependencia, escribir nuestro test unitario con `mockall` ahora es trivial:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_checkout_uses_gateway() {
        // 1. Instanciamos el mock
        let mut mock_gateway = MockPaymentGateway::new();
        
        // 2. Configuramos las expectativas
        mock_gateway
            .expect_charge()
            .with(mockall::predicate::eq(100.0))
            .times(1)
            .returning(|_| Ok(()));

        // 3. INYECCIÓN DE DEPENDENCIA: Pasamos el mock envuelto en un Arc
        let service = PaymentService::new(Arc::new(mock_gateway));

        // 4. Ejecutamos y verificamos
        let result = service.process_checkout(100.0).await;
        assert!(result.is_ok());
    }
}
```

### ¿Necesitamos un contenedor de inyección (DI Container)?

En lenguajes como C#, registrarías tus servicios en un contenedor (`services.AddTransient<IPayment, StripePayment>()`). En Rust, lo más idiomático es hacer esta "composición" o "ensamblaje" manualmente en la raíz de tu aplicación (normalmente en `main.rs` o en una función de configuración).

A este patrón se le conoce como **Pure DI** o **Vanilla DI**. Profundizaremos en cómo estructurar este ensamblaje de forma limpia cuando abordemos la Arquitectura Hexagonal y el patrón *Registry* en el Capítulo 30.

Con esta base sobre Inyección de Dependencias, hemos completado las técnicas de simulación de estado. Estás listo para pasar de las pruebas unitarias aisladas a las pruebas sistémicas dinámicas
