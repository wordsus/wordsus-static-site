El desarrollo de software complejo requiere un lenguaje común entre desarrolladores y expertos de negocio. Rust, con su sistema de tipos robusto y su enfoque en la seguridad de memoria, se alinea de forma excepcional con los principios de **Domain-Driven Design (DDD)**. En este capítulo, exploraremos cómo transformar modelos anémicos y frágiles en **modelos de dominio ricos**, donde la lógica de negocio está protegida por el compilador. Aprenderemos a modelar **Value Objects** inmutables, a estructurar la consistencia mediante **Agregados** y a comunicar cambios de estado a través de **Eventos de Dominio**, garantizando aplicaciones backend escalables, mantenibles y libres de efectos secundarios imprevistos.

## 31.1 Modelado del Dominio Rico vs Anémico

Cuando decidimos adoptar Domain-Driven Design (DDD) en nuestros proyectos, estamos tomando la decisión consciente de poner las reglas de negocio en el centro de nuestra arquitectura. En este contexto, la forma en que estructuramos nuestras entidades y agregados determina el éxito o fracaso de nuestro diseño.

En la industria del software, existen dos enfoques predominantes para modelar entidades: el **Modelo Anémico** (considerado un anti-patrón en DDD) y el **Modelo Rico**. Rust, gracias a su sistema de tipos, *ownership* y privacidad por defecto, es un lenguaje excepcionalmente preparado para implementar modelos ricos de forma nativa y segura.

### El Modelo Anémico (Anemic Domain Model)

Un modelo de dominio anémico es aquel en el que las entidades son simples "bolsas de datos" (estructuras de datos puras). No contienen lógica de negocio, comportamiento ni validaciones; simplemente exponen todos sus campos para ser leídos y modificados desde el exterior.

En este enfoque, el comportamiento se desplaza hacia capas superiores, habitualmente a funciones o clases llamadas "Servicios".

**Ejemplo de un Modelo Anémico en Rust:**

```rust
use uuid::Uuid;

// La entidad es solo una estructura de datos
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub is_active: bool,
    pub verification_token: Option<String>,
}

// La lógica de negocio vive en servicios externos a la entidad
pub struct UserService;

impl UserService {
    pub fn verify_user(user: &mut User, token: &str) -> Result<(), &'static str> {
        if user.is_active {
            return Err("El usuario ya está activo");
        }
        
        if Some(token.to_string()) == user.verification_token {
            user.is_active = true; // Modificación directa del estado
            user.verification_token = None;
            Ok(())
        } else {
            Err("Token inválido")
        }
    }
}
```

**¿Por qué es problemático en DDD?**

* **Pérdida de invariantes:** Al ser los campos `pub`, cualquier parte del código puede hacer `user.is_active = true` saltándose las reglas de negocio (por ejemplo, activarlo sin validar el token).
* **Lógica dispersa:** Las reglas sobre cómo cambia de estado un `User` terminan regadas por múltiples servicios o adaptadores.
* **Baja cohesión:** Los datos y las operaciones que actúan sobre ellos viven en lugares separados.

### El Modelo de Dominio Rico (Rich Domain Model)

Un modelo de dominio rico encapsula tanto los datos como el comportamiento. Las entidades son responsables de garantizar sus propios **invariantes** (las reglas que siempre deben cumplirse para que el estado de la entidad sea válido).

En Rust, esto se logra manteniendo los campos de los `structs` privados (o restringidos al módulo base) y exponiendo únicamente métodos públicos que representan acciones de negocio con significado, no simples *setters*.

**Ejemplo de un Modelo Rico en Rust:**

```rust
use uuid::Uuid;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum UserDomainError {
    #[error("El usuario ya está verificado")]
    AlreadyVerified,
    #[error("Token de verificación inválido")]
    InvalidToken,
    #[error("Email no válido")]
    InvalidEmail,
}

pub struct User {
    id: Uuid,
    email: String, // En la siguiente sección (31.2) lo transformaremos en un Value Object
    is_active: bool,
    verification_token: Option<String>,
}

impl User {
    // Constructor estricto (Smart Constructor)
    pub fn new(email: String) -> Result<Self, UserDomainError> {
        if !email.contains('@') { // Validación trivial para el ejemplo
            return Err(UserDomainError::InvalidEmail);
        }
        
        Ok(Self {
            id: Uuid::new_v4(),
            email,
            is_active: false,
            verification_token: Some(Uuid::new_v4().to_string()),
        })
    }

    // Comportamiento de negocio expresado como verbos del dominio
    pub fn verify(&mut self, token: &str) -> Result<(), UserDomainError> {
        if self.is_active {
            return Err(UserDomainError::AlreadyVerified);
        }

        if self.verification_token.as_deref() != Some(token) {
            return Err(UserDomainError::InvalidToken);
        }

        // Mutación controlada e interna
        self.is_active = true;
        self.verification_token = None;
        
        Ok(())
    }

    // Getters explícitos solo para lectura, cuando la capa externa lo requiere
    pub fn id(&self) -> Uuid {
        self.id
    }
    
    pub fn is_active(&self) -> bool {
        self.is_active
    }
}
```

### Sinergia entre Rust y el Modelo Rico

Aplicar un modelo rico en Rust resulta excepcionalmente natural y seguro debido a características del lenguaje que ya hemos estudiado en capítulos anteriores:

1. **Privacidad por defecto:** A diferencia de otros lenguajes, en Rust los campos de un `struct` son privados a menos que se use `pub`. Esto te obliga a pensar en la encapsulación desde el minuto cero.
2. **Manejo de Errores con `Result`:** En lugar de lanzar excepciones impredecibles cuando se viola una regla de negocio, los métodos del modelo rico retornan un `Result<T, DomainError>`, haciendo explícito en la firma de la función qué operaciones pueden fallar según las reglas del dominio.
3. **Ownership y Tipos de Préstamo:** Las funciones del modelo indican claramente su impacto. Un método que toma `&self` es de solo lectura (no altera el estado), uno que toma `&mut self` es una mutación de estado válida, y uno que toma `self` por valor implica el consumo o transformación final de la entidad.
4. **Typestates (Repaso):** Como vimos en el Capítulo 28 sobre Patrones de Diseño, podemos ir un paso más allá del modelo rico tradicional y codificar el estado en el sistema de tipos. Podríamos tener un `UnverifiedUser` que, a través de su método `.verify()`, consuma su estado y retorne un `VerifiedUser`, haciendo imposible representar estados inválidos incluso en tiempo de compilación.

El objetivo del Modelo Rico no es crear abstracciones complejas porque sí, sino **confianza**. Cuando una capa superior (como un caso de uso o un controlador de Axum) interactúa con tu entidad `User`, el compilador y el diseño garantizan que es mecánicamente imposible dejar a ese usuario en un estado corrupto o ilegal para tu negocio.

## 31.2 Value Objects inmutables con semántica de Rust

En Domain-Driven Design (DDD), mientras que las **Entidades** (como el `User` que vimos en la sección anterior) se definen por su identidad única, los **Value Objects** (Objetos de Valor) se definen exclusivamente por los datos que contienen. No tienen un identificador (ID); si dos Value Objects tienen los mismos atributos, se consideran exactamente el mismo objeto.

Piensa en una coordenada geográfica: `(Latitud: 40.4168, Longitud: -3.7038)`. No nos importa "cuál" instancia de la coordenada es; nos importan sus valores. Si otra coordenada tiene exactamente esos mismos números, representan el mismo punto geográfico.

Para que un Value Object sea válido en DDD, debe cumplir tres reglas fundamentales, las cuales encajan a la perfección con la filosofía y el sistema de tipos de Rust:

1. **Carecen de identidad:** Se comparan por sus propiedades estructurales.
2. **Son inmutables:** Una vez creados, no pueden cambiar. Si necesitas un valor diferente, creas una nueva instancia.
3. **Son auto-validados:** Es imposible instanciar un Value Object en un estado inválido.

### Implementando Value Objects en Rust: El Patrón Newtype

La herramienta más poderosa que nos ofrece Rust para crear Value Objects es el **Patrón Newtype** (que mencionamos brevemente en el Capítulo 28). Consiste en envolver un tipo primitivo (como un `String` o un `i32`) dentro de un *Tuple Struct* de un solo elemento.

Vamos a refactorizar el campo `email: String` de nuestra entidad `User` para convertirlo en un verdadero Value Object. Un `String` crudo no es un buen modelo para un correo electrónico, ya que el compilador aceptaría `"hola mundo"` como un email válido en cualquier parte de tu código.

**Ejemplo de un Value Object `Email`:**

```rust
use std::fmt;
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Email(String);

#[derive(Debug, Error)]
pub enum EmailError {
    #[error("El formato del email no es válido")]
    InvalidFormat,
    #[error("El email no puede estar vacío")]
    Empty,
}

impl Email {
    // Smart Constructor: La única forma de crear un Email es pasando por aquí
    pub fn new(raw_email: String) -> Result<Self, EmailError> {
        let trimmed = raw_email.trim();
        
        if trimmed.is_empty() {
            return Err(EmailError::Empty);
        }

        // Validación simple para el ejemplo (en producción usarías Regex o la crate `validator`)
        if !trimmed.contains('@') || !trimmed.contains('.') {
            return Err(EmailError::InvalidFormat);
        }

        // Almacenamos el email normalizado (en minúsculas)
        Ok(Self(trimmed.to_lowercase()))
    }

    // Método para acceder al valor interno como referencia inmutable
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

// Opcional pero recomendado: Implementar Display para que se comporte como un string al imprimir
impl fmt::Display for Email {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

### ¿Por qué este enfoque brilla en Rust?

1. **Igualdad Gratuita (`PartialEq`, `Eq`):** Al derivar estos *traits*, Rust compara automáticamente el contenido del struct. `Email::new("a@b.com").unwrap() == Email::new("a@b.com").unwrap()` devolverá `true` sin que tengas que escribir lógica de comparación manual.
2. **Inmutabilidad Garantizada:** En Rust, las variables son inmutables por defecto. Además, al no usar `pub` en el campo interno (`pub struct Email(pub String)` sería un error aquí), nadie puede mutar el contenido del `Email` una vez creado, forzando la inmutabilidad inherente a los Value Objects.
3. **Seguridad en el Sistema de Tipos:** Ahora, si una función requiere un `Email`, su firma será `fn enviar_notificacion(destino: Email)`. Es **imposible** pasar un `String` arbitrario por accidente. El compilador de Rust lo rechazará. Esta es la esencia del *Type Safety* aplicado al negocio.
4. **Clonación Controlada (`Clone`):** Los Value Objects suelen ser baratos de copiar o clonar. Al derivar `Clone`, permitimos que otras partes del sistema obtengan copias idénticas e independientes de este valor, respetando la regla de que si necesitamos cambiar algo, creamos una copia nueva.

### Integración con la Entidad

Si actualizamos nuestra entidad `User` de la sección anterior, el código se vuelve mucho más robusto:

```rust
// ... (imports omitidos)

pub struct User {
    id: Uuid,
    email: Email, // <- Usamos nuestro Value Object
    is_active: bool,
}

impl User {
    // El constructor de User ya no necesita validar el formato del email, 
    // esa responsabilidad ahora pertenece enteramente al Value Object `Email`.
    pub fn new(email: Email) -> Self {
        Self {
            id: Uuid::new_v4(),
            email,
            is_active: false,
        }
    }
}
```

Al mover la validación del correo al Value Object `Email`, hemos aligerado la entidad `User` y hemos creado un tipo reutilizable en cualquier otra parte del dominio (por ejemplo, si creamos una entidad `Company` que también tiene un `Email`).

## 31.3 Entidades, Agregados y Raíces de Agregación

A medida que nuestro modelo de dominio crece, las Entidades y los Value Objects rara vez existen de forma aislada. Un `User` puede tener múltiples `Address`es, y un `Order` (Pedido) inevitablemente contendrá múltiples `OrderItem`s (Líneas de pedido).

Si permitimos que cualquier parte de nuestro código modifique cualquier entidad individualmente, perderemos el control sobre las reglas de negocio. ¿Qué pasa si alguien elimina un `OrderItem` pero olvida actualizar el precio total del `Order`? Aquí es donde entran en juego los **Agregados** y las **Raíces de Agregación**.

### ¿Qué es un Agregado?

Un **Agregado (Aggregate)** es un clúster de Entidades y Value Objects asociados que tratamos como una única unidad para el propósito de los cambios de datos.

Su función principal es definir un **límite de consistencia transaccional**. Cualquier regla de negocio que involucre a múltiples elementos dentro del agregado debe cumplirse de manera atómica. Si la operación falla, ningún cambio debe persistir.

### La Raíz de Agregación (Aggregate Root)

Dentro de cada Agregado, hay una entidad principal que actúa como el jefe o "portero": la **Raíz de Agregación (Aggregate Root)**.

Reglas de oro de la Raíz de Agregación:

1. **Acceso exclusivo:** El código externo al agregado solo puede mantener referencias a la Raíz de Agregación. No está permitido tener referencias directas a las entidades internas del agregado.
2. **Modificación controlada:** Para cambiar cualquier cosa dentro del agregado, debes pedírselo a la Raíz. Ella se encargará de delegar la acción a las entidades internas y asegurar que todos los invariantes se mantengan.
3. **Persistencia unitaria:** La base de datos carga y guarda el Agregado completo a través de su Raíz. No se guarda un `OrderItem` por separado; se guarda el `Order` entero con todos sus ítems.

### Implementando un Agregado en Rust

El sistema de módulos y la privacidad de Rust hacen que modelar Agregados sea extremadamente natural e idiomático. Al agrupar el Agregado en su propio módulo, podemos usar el nivel de visibilidad `pub(crate)` o simplemente omitir el `pub` para mantener las entidades internas ocultas del exterior.

Veamos un ejemplo clásico: un Pedido (`Order`) que contiene Líneas de Pedido (`OrderItem`).

```rust
// Módulo que actúa como el límite del Agregado
pub mod order_aggregate {
    use uuid::Uuid;
    use thiserror::Error;

    #[derive(Debug, Error)]
    pub enum OrderError {
        #[error("El pedido ya está cerrado y no se puede modificar")]
        AlreadyClosed,
        #[error("La cantidad debe ser mayor a cero")]
        InvalidQuantity,
    }

    // Value Object (simplificado)
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub struct Money(pub u32); // Representa centavos para evitar problemas de coma flotante

    // Entidad Interna: NO ES PUB, el resto de la aplicación no puede crearla ni acceder a sus campos directamente.
    #[derive(Debug)]
    struct OrderItem {
        id: Uuid,
        product_id: Uuid,
        quantity: u32,
        price: Money,
    }

    impl OrderItem {
        fn subtotal(&self) -> Money {
            Money(self.price.0 * self.quantity)
        }
    }

    // Raíz de Agregación: Expuesta públicamente
    #[derive(Debug)]
    pub struct Order {
        id: Uuid,
        customer_id: Uuid,
        items: Vec<OrderItem>, // Colección de entidades internas
        is_closed: bool,
    }

    impl Order {
        // Inicializa un nuevo Agregado válido
        pub fn new(customer_id: Uuid) -> Self {
            Self {
                id: Uuid::new_v4(),
                customer_id,
                items: Vec::new(),
                is_closed: false,
            }
        }

        // ÚNICA forma de añadir un ítem. La Raíz controla el proceso.
        pub fn add_item(&mut self, product_id: Uuid, quantity: u32, price: Money) -> Result<(), OrderError> {
            if self.is_closed {
                return Err(OrderError::AlreadyClosed);
            }

            if quantity == 0 {
                return Err(OrderError::InvalidQuantity);
            }

            self.items.push(OrderItem {
                id: Uuid::new_v4(),
                product_id,
                quantity,
                price,
            });

            Ok(())
        }

        // Lógica de negocio derivada: El total se calcula dinámicamente o se mantiene sincronizado
        pub fn total(&self) -> Money {
            let total_cents = self.items.iter().map(|item| item.subtotal().0).sum();
            Money(total_cents)
        }

        pub fn close(&mut self) {
            self.is_closed = true;
        }
        
        pub fn id(&self) -> Uuid {
            self.id
        }
    }
}
```

### Regla de Diseño Crítica en Rust: Referencias por ID, no por Puntero

En lenguajes con Garbage Collector (como Java o C#), es común que la entidad `Order` mantenga una referencia directa (un puntero en memoria) al objeto `Customer` al que pertenece.

En Rust, intentar modelar relaciones entre distintos Agregados usando referencias (`&Customer` o `Rc<Customer>`) se convertirá rápidamente en una pesadilla con el *Borrow Checker*, problemas de ciclos de vida (lifetimes) y dificultades para la concurrencia (problemas al cruzar hilos o en entornos asíncronos con Tokio).

**La regla de oro del DDD en Rust es:** *Un Agregado debe referenciar a otro Agregado únicamente mediante su Identificador (ID).* Como pudiste notar en el código anterior, `Order` tiene un `customer_id: Uuid`, pero no contiene la estructura `Customer`. Si la capa de aplicación (un Caso de Uso) necesita saber el nombre del cliente para un pedido, debe inyectar el Repositorio de `Customer` y buscar el cliente por ese ID. Esto no solo hace feliz al compilador de Rust, sino que desacopla el modelo de dominio, fomenta transacciones de base de datos más pequeñas y escala mucho mejor.

## 31.4 Eventos de Dominio y consistencia eventual

Hasta ahora, hemos visto cómo las Entidades, los Value Objects y los Agregados nos ayudan a mantener la consistencia interna y proteger las reglas de negocio. Pero, ¿qué ocurre cuando un cambio en un Agregado requiere que ocurra un efecto secundario en otra parte del sistema?

Por ejemplo, si un usuario finaliza una compra (el `Order` se cierra), es probable que necesitemos:

1. Vaciar su carrito de compras.
2. Descontar el stock en el inventario.
3. Enviar un correo electrónico de confirmación.

Si inyectamos los repositorios de Inventario o el servicio de Emails directamente dentro de la entidad `Order`, estaríamos acoplando dominios distintos y violando el principio de responsabilidad única. La solución que propone DDD es el uso de **Eventos de Dominio**.

### ¿Qué es un Evento de Dominio?

Un Evento de Dominio es un registro inmutable de algo que **ya ha ocurrido** en el negocio y que es relevante para otras partes del sistema. Se nombran en pasado (ej. `OrderClosed`, `UserVerified`, `ItemAdded`).

En Rust, los enums (Algebraic Data Types) son la estructura de datos perfecta para modelar estos eventos, ya que nos permiten agrupar distintos tipos de eventos bajo un mismo tipo base, garantizando la seguridad en tiempo de compilación.

**Implementación de Eventos en Rust:**

```rust
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Definimos los eventos de nuestro dominio usando un Enum poderoso
#[derive(Debug, Clone)]
pub enum OrderEvent {
    OrderCreated {
        event_id: Uuid,
        occurred_on: DateTime<Utc>,
        order_id: Uuid,
        customer_id: Uuid,
    },
    OrderClosed {
        event_id: Uuid,
        occurred_on: DateTime<Utc>,
        order_id: Uuid,
    },
}
```

### Capturando Eventos en el Agregado

Una práctica común y "pura" en Rust es que la Raíz de Agregación no dispare los eventos directamente a un bus de mensajes, ya que eso implicaría I/O e impureza en la lógica de dominio. En su lugar, el Agregado acumula los eventos en una colección interna o los devuelve como resultado de sus operaciones.

```rust
// ... (Código anterior del Agregado Order)

impl Order {
    // Ahora, al cerrar el pedido, generamos el evento correspondiente
    pub fn close(&mut self) -> Result<OrderEvent, OrderError> {
        if self.is_closed {
            return Err(OrderError::AlreadyClosed);
        }

        self.is_closed = true;

        // Retornamos el evento para que la capa de aplicación lo maneje
        Ok(OrderEvent::OrderClosed {
            event_id: Uuid::new_v4(),
            occurred_on: Utc::now(),
            order_id: self.id,
        })
    }
}
```

La capa de aplicación (tu Caso de Uso o Handler) es la responsable de invocar `order.close()`, guardar el estado del pedido en la base de datos y, si la transacción tiene éxito, **publicar el evento** en un bus (como un canal de `tokio` en memoria, Kafka o RabbitMQ).

### Consistencia Eventual vs Transacciones ACID

Cuando usamos Eventos de Dominio para comunicar distintos Agregados, cruzamos un límite de consistencia.

En un modelo tradicional de base de datos monolítica, actualizaríamos el Pedido y el Inventario en la misma transacción ACID de SQL (`BEGIN ... COMMIT`). Si algo falla, se hace *rollback* de todo.

En DDD y sistemas distribuidos, preferimos modificar **un solo Agregado por transacción**. El flujo sería:

1. Transacción 1: Marcar el `Order` como cerrado y guardar. (Consistencia inmediata).
2. Se publica el evento `OrderClosed`.
3. Un *listener* del módulo de Inventario recibe el evento.
4. Transacción 2: Se descuenta el stock del Inventario.

Esto introduce el concepto de **Consistencia Eventual**: el sistema no es 100% consistente en cada nanosegundo, pero *eventualmente* todos los componentes convergerán al estado correcto.

### El Patrón Outbox para garantizar la entrega

Uno de los mayores desafíos técnicos de los eventos de dominio es la garantía de entrega. Si tu base de datos guarda el pedido pero tu servidor crashea antes de emitir el evento a RabbitMQ o Kafka, el sistema quedará inconsistente (el stock nunca se descontará).

Para solucionar esto en arquitecturas Backend, se usa el **Outbox Pattern**. En Rust, herramientas como `sqlx` (que veremos en la Parte V) permiten insertar el estado del Agregado y el evento serializado (como JSON) en una tabla `outbox_events` *dentro de la misma transacción SQL*. Luego, un proceso en background (un *worker* de Tokio) lee esa tabla y publica los eventos de forma segura y asíncrona.

Con esto concluimos el Capítulo 31, consolidando cómo Rust nos ofrece un entorno inmejorable (inmutabilidad, sistema de tipos, *ownership* y enums) para aplicar Domain-Driven Design de manera segura y performante.
