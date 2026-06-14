En el ecosistema backend moderno, la comunicación síncrona es insuficiente para sistemas que requieren alta disponibilidad y escalabilidad. Este capítulo explora cómo Rust se integra con infraestructuras de mensajería para construir arquitecturas desacopladas y resilientes.

Aprenderás a dominar **Apache Kafka** mediante `rdkafka` para el procesamiento de flujos masivos y **RabbitMQ** con `lapin` para el enrutamiento complejo de tareas. No solo nos detendremos en la implementación técnica, sino también en patrones críticos de fiabilidad como las **Dead Letter Queues** y el **Circuit Breaker**, culminando en el modelado avanzado de dominio mediante **CQRS y Event Sourcing**.

## 35.1 Producción y consumo con Apache Kafka (`rdkafka`)

En arquitecturas de microservicios y sistemas orientados a eventos, Apache Kafka se ha consolidado como el estándar de la industria para el streaming de datos de alto rendimiento. En el ecosistema de Rust, aunque existen implementaciones puras como `kafka-rust`, la opción más robusta, madura y utilizada en producción es el crate **`rdkafka`**.

Este crate no es una implementación desde cero, sino un *wrapper* seguro (safe binding) sobre `librdkafka`, la librería oficial de C de Apache Kafka. Esto nos otorga el máximo rendimiento y compatibilidad total con el protocolo de Kafka, aprovechando al mismo tiempo la seguridad de memoria de Rust y la asincronía de Tokio, conceptos que ya dominas de capítulos anteriores.

---

### Configuración del Proyecto y Dependencias

Para comenzar, necesitamos añadir `rdkafka` a nuestro `Cargo.toml`. Al depender de una librería en C, la compilación puede requerir que `librdkafka` esté instalada en tu sistema, o puedes delegar la compilación estática a Cargo utilizando la feature `cmake-build`.

```toml
[dependencies]
tokio = { version = "1.0", features = ["full"] }
rdkafka = { version = "0.36", features = ["cmake-build"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
```

*Nota: En entornos de Integración Continua (CI) o contenedores Alpine, la compilación estática con `cmake-build` o `gssapi` suele ser la ruta menos problemática para evitar conflictos de librerías dinámicas.*

---

### Producción de Mensajes (El `FutureProducer`)

`rdkafka` ofrece varios tipos de productores, pero en un contexto de backend moderno con Tokio, el **`FutureProducer`** es la herramienta adecuada. Nos permite enviar mensajes sin bloquear el hilo, retornando un `Future` que se resuelve con el reporte de entrega (Delivery Report).

A continuación, crearemos un productor que serializa un struct a JSON (utilizando `serde`, como vimos en el Capítulo 15) y lo envía a un tópico de Kafka.

```rust
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use serde::Serialize;
use std::time::Duration;
use anyhow::{Context, Result};

#[derive(Serialize)]
struct UserCreatedEvent {
    user_id: String,
    email: String,
}

pub async fn produce_event(brokers: &str, topic: &str) -> Result<()> {
    // 1. Configuración del Productor
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("message.timeout.ms", "5000")
        .create()
        .context("Error al crear el FutureProducer de Kafka")?;

    let event = UserCreatedEvent {
        user_id: "usr_12345".to_string(),
        email: "rustacean@example.com".to_string(),
    };

    let payload = serde_json::to_string(&event)?;
    let key = &event.user_id;

    // 2. Construcción del registro
    let record = FutureRecord::to(topic)
        .payload(&payload)
        .key(key);

    // 3. Envío asíncrono
    // send() retorna un Future que espera el ACK del broker.
    // El primer Duration es el timeout de encolamiento interno.
    match producer.send(record, Duration::from_secs(0)).await {
        Ok((partition, offset)) => {
            println!("Evento enviado con éxito. Partición: {}, Offset: {}", partition, offset);
        }
        Err((error, _owned_message)) => {
            eprintln!("Error al enviar el mensaje a Kafka: {:?}", error);
            // Aquí podríamos implementar una lógica de reintento o enviar a una Dead Letter Queue (sección 35.3)
        }
    }

    Ok(())
}
```

**Puntos clave del productor:**

* **Gestión de claves (Keys):** Al asignar `event.user_id` como clave, Kafka garantiza que todos los eventos del mismo usuario irán a la misma partición, asegurando el orden de procesamiento.
* **Rendimiento:** `producer.send(...)` no espera inmediatamente a que el mensaje viaje por la red; lo encola internamente y lo agrupa por lotes (batching) en segundo plano, maximizando el throughput.

---

### Consumo de Mensajes (El `StreamConsumer`)

Para consumir eventos, utilizaremos el **`StreamConsumer`**. Este consumidor se integra de forma nativa con el runtime asíncrono y nos permite procesar mensajes utilizando un bucle `while let` sobre un stream continuo.

```rust
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::Message;
use anyhow::{Context, Result};

pub async fn consume_events(brokers: &str, group_id: &str, topic: &str) -> Result<()> {
    // 1. Configuración del Consumidor
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", group_id)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true") // Auto-commit activado por simplicidad
        .set("auto.offset.reset", "earliest") // Desde dónde leer si no hay offset previo
        .create()
        .context("Error al crear el StreamConsumer")?;

    // 2. Suscripción al tópico
    consumer.subscribe(&[topic])
        .context("No se pudo suscribir al tópico")?;

    println!("Escuchando eventos en el tópico: {}", topic);

    // 3. Loop de consumo asíncrono
    while let Ok(message) = consumer.recv().await {
        let payload = match message.payload_view::<str>() {
            None => "",
            Some(Ok(s)) => s,
            Some(Err(e)) => {
                eprintln!("Error al decodificar el payload: {:?}", e);
                continue;
            }
        };

        let key = match message.key_view::<str>() {
            None => "",
            Some(Ok(k)) => k,
            Some(Err(_)) => "[Error al decodificar clave]",
        };

        println!("Mensaje recibido - Clave: '{}', Payload: '{}', Partición: {}, Offset: {}", 
            key, payload, message.partition(), message.offset());

        // Aquí iría la lógica de negocio (ej. deserializar el JSON y actualizar la base de datos)
    }

    Ok(())
}
```

---

### Semánticas de Entrega y Manejo de Offsets

En el ejemplo anterior, establecimos `"enable.auto.commit"` en `"true"`. Aunque es conveniente para empezar, en aplicaciones backend de nivel Senior donde la resiliencia es crítica, esto puede llevar a la pérdida de mensajes si el proceso hace *panic* (Capítulo 5) justo después de leer el mensaje pero antes de procesarlo en la base de datos.

Para lograr una **semántica de "Al menos una vez" (At-least-once)**, debes:

1. Desactivar el auto-commit: `.set("enable.auto.commit", "false")`.
2. Procesar el mensaje de forma íntegra (ej. transacción en base de datos).
3. Hacer el commit manualmente utilizando `consumer.commit_message(&message, CommitMode::Async)`.

Esto garantiza que si tu worker de Tokio se reinicia inesperadamente, el último mensaje no procesado se volverá a entregar.

## 35.2 RabbitMQ / AMQP con `lapin`

Mientras que Apache Kafka (que vimos en la sección anterior) brilla como un registro distribuido (distributed log) optimizado para el *event streaming* masivo y la retención a largo plazo, RabbitMQ resuelve un problema distinto. Basado en el protocolo AMQP 0-9-1, RabbitMQ es un *message broker* tradicional que destaca en el enrutamiento complejo, las colas de tareas (task queues) y la comunicación punto a punto temporal.

Para interactuar con RabbitMQ en el ecosistema asíncrono de Rust, la herramienta estándar de facto es el crate **`lapin`**. A diferencia de `rdkafka`, `lapin` está escrito completamente en Rust (sin dependencias de C), se integra de forma nativa con Tokio y gestiona eficientemente la multiplexación del protocolo AMQP.

---

### Configuración y Conceptos Clave

Primero, añadimos `lapin` a nuestras dependencias:

```toml
[dependencies]
tokio = { version = "1.0", features = ["full"] }
lapin = "2.3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
```

A nivel arquitectónico, AMQP requiere entender tres componentes que configuraremos desde Rust:

1. **Exchanges:** Reciben los mensajes del productor y deciden a qué colas enviarlos según reglas de enrutamiento (*routing keys*).
2. **Queues:** Almacenan los mensajes hasta que un consumidor los procesa.
3. **Bindings:** Las reglas que unen un Exchange con una Queue.

Además, por razones de rendimiento, las conexiones TCP son costosas. `lapin` utiliza **Channels** (canales virtuales) multiplexados sobre una única conexión TCP subyacente. En una aplicación robusta, abrirás una conexión por proceso y un canal por hilo o tarea (worker).

---

### Producción de Mensajes (Publicación)

A continuación, crearemos una función que establece una conexión, abre un canal, declara las topologías (opcional pero recomendado para evitar errores si la infraestructura no está levantada) y publica un mensaje.

```rust
use lapin::{
    options::*, publisher_confirm::Confirmation, BasicProperties, Connection,
    ConnectionProperties, ExchangeKind,
};
use serde::Serialize;
use anyhow::{Context, Result};

#[derive(Serialize)]
struct SendEmailCommand {
    to: String,
    template_id: String,
}

pub async fn publish_task(amqp_uri: &str) -> Result<()> {
    // 1. Establecer la conexión TCP base
    let options = ConnectionProperties::default()
        // Asignar un nombre ayuda al debugeo en la consola de administración de RabbitMQ
        .with_connection_name("email_producer".into());
        
    let connection = Connection::connect(amqp_uri, options).await
        .context("Error al conectar con RabbitMQ")?;

    // 2. Abrir un canal multiplexado
    let channel = connection.create_channel().await?;

    let exchange_name = "emails_exchange";
    let routing_key = "emails.transactional";

    // 3. Declarar el Exchange (Idempotente)
    channel.exchange_declare(
        exchange_name,
        ExchangeKind::Direct,
        ExchangeDeclareOptions {
            durable: true, // Sobrevive a reinicios del broker
            ..Default::default()
        },
        Default::default(),
    ).await?;

    let command = SendEmailCommand {
        to: "usuario@ejemplo.com".to_string(),
        template_id: "welcome_v1".to_string(),
    };
    let payload = serde_json::to_vec(&command)?;

    // 4. Publicar el mensaje
    let confirm = channel.basic_publish(
        exchange_name,
        routing_key,
        BasicPublishOptions::default(),
        payload,
        BasicProperties::default()
            .with_delivery_mode(2), // 2 = Mensaje persistente en disco
    ).await?
    .await?; // El segundo await espera la confirmación (Publisher Confirms) del broker

    match confirm {
        Confirmation::NotRequested => println!("Mensaje enviado (sin confirmación solicitada)"),
        Confirmation::Ack(_) => println!("Mensaje confirmado por el broker"),
        Confirmation::Nack(_) => eprintln!("El broker rechazó el mensaje"),
    }

    Ok(())
}
```

*Nota Senior:* Fíjate en el doble `.await` al publicar. El primero envía el frame a través de la red de forma asíncrona; el segundo espera el `Publisher Confirm`, una característica vital para garantizar que RabbitMQ realmente ha guardado el mensaje y no lo ha perdido en tránsito.

---

### Consumo de Mensajes (Workers robustos)

Un consumidor de RabbitMQ no debe simplemente leer todo lo que pueda tan rápido como pueda. Si una cola tiene un millón de mensajes y tu worker de Rust intenta descargarlos todos a la vez, agotarás la memoria RAM. Aquí es donde entra en juego la **Calidad de Servicio (QoS) y el Prefetch**.

```rust
use lapin::{
    message::DeliveryResult, options::*, types::FieldTable, Connection, ConnectionProperties,
};
use futures_lite::stream::StreamExt; // Para iterar sobre el stream de mensajes
use anyhow::{Context, Result};

pub async fn consume_tasks(amqp_uri: &str) -> Result<()> {
    let connection = Connection::connect(
        amqp_uri,
        ConnectionProperties::default().with_connection_name("email_worker".into()),
    ).await?;

    let channel = connection.create_channel().await?;
    let queue_name = "transactional_emails_queue";

    // 1. Declarar la cola
    channel.queue_declare(
        queue_name,
        QueueDeclareOptions {
            durable: true,
            ..Default::default()
        },
        FieldTable::default(),
    ).await?;

    // Binding implícito o explícito omitido por brevedad (se asume que existe)

    // 2. Configurar QoS (Prefetch Count) - CRÍTICO EN PRODUCCIÓN
    // Limita la cantidad de mensajes no confirmados (unacked) que el broker enviará a este worker.
    channel.basic_qos(10, BasicQosOptions::default()).await?;

    // 3. Iniciar el consumidor
    let mut consumer = channel.basic_consume(
        queue_name,
        "worker_node_1", // Consumer tag
        BasicConsumeOptions::default(),
        FieldTable::default(),
    ).await?;

    println!("Worker de emails iniciado. Esperando tareas...");

    // 4. Loop de procesamiento asíncrono
    while let Some(delivery) = consumer.next().await {
        if let Ok(delivery) = delivery {
            // Decodificamos el mensaje
            if let Ok(payload) = String::from_utf8(delivery.data.clone()) {
                println!("Procesando: {}", payload);
                
                // Simulación de una tarea asíncrona (ej. llamar a un API externo de emails)
                // tokio::time::sleep(std::time::Duration::from_millis(500)).await;

                // 5. Acuse de recibo explícito (ACK)
                // Esto informa a RabbitMQ que el mensaje se procesó con éxito y puede borrarse de la cola.
                delivery.ack(BasicAckOptions::default()).await
                    .context("Error al enviar el ACK")?;
            } else {
                eprintln!("Payload no válido, enviando NACK para descartar o encolar en DLQ.");
                // Si la lógica falla irreparablemente, rechazamos sin reencolar
                delivery.reject(BasicRejectOptions { requeue: false }).await?;
            }
        }
    }

    Ok(())
}
```

**Manejo de Fallos (Acks y Nacks):**
En Rust, el sistema de tipos nos obliga a pensar explícitamente en el flujo de control. Si una tarea (ej. enviar el email) retorna un `Err`, podemos utilizar `delivery.nack()` para devolver el mensaje a la cola (`requeue: true`) para que otro worker lo intente, o rechazarlo (`requeue: false`). Esto último es la puerta de entrada a las *Dead Letter Queues*, concepto que profundizaremos en la siguiente sección.

## 35.3 Patrones de resiliencia: Dead Letter Queues y Circuit Breakers

En el desarrollo de sistemas distribuidos y microservicios, asumir que la red es confiable o que los servicios dependientes siempre estarán disponibles es un error crítico. Las fallas no son una posibilidad; son una garantía. Como ingenieros backend senior, nuestro objetivo no es evitar las fallas por completo, sino diseñar sistemas que se degraden con elegancia y se recuperen de forma autónoma, evitando fallos en cascada.

En esta sección exploraremos dos de los patrones de resiliencia más importantes: las **Dead Letter Queues (DLQ)** para el manejo de mensajes envenenados, y los **Circuit Breakers** para proteger los recursos de la aplicación.

---

### 1. Dead Letter Queues (DLQs): Aislamiento de mensajes problemáticos

En las secciones 35.1 y 35.2 vimos cómo consumir eventos de Kafka y RabbitMQ. Sin embargo, ¿qué sucede si un mensaje tiene un formato JSON inválido o requiere un dato que ha sido eliminado de la base de datos?

Si el consumidor rechaza el mensaje y lo vuelve a encolar (requeue) infinitamente, se crea un *Poison Pill* (píldora envenenada). Este mensaje bloqueará el procesamiento de la partición o consumirá recursos de CPU en un ciclo inútil. Si simplemente descartamos el mensaje, perdemos datos críticos.

La solución es la **Dead Letter Queue (Cola de Mensajes Muertos)**: un destino seguro donde los mensajes que superan un límite de reintentos o causan errores irrecuperables se almacenan para su posterior análisis o reprocesamiento manual.

**Implementación de DLQ en RabbitMQ con `lapin`**

En RabbitMQ, las DLQs no son un tipo especial de cola, sino una configuración de enrutamiento. Configuramos la cola principal para que, cuando un mensaje sea rechazado (`basic.reject` o `basic.nack` con `requeue=false`) o expire (TTL), sea redirigido a un Exchange específico (el Dead Letter Exchange).

```rust
use lapin::{
    options::*, types::{FieldTable, AMQPValue}, Connection, ExchangeKind,
};
use anyhow::Result;

pub async fn setup_queue_with_dlq(channel: &lapin::Channel) -> Result<()> {
    let dlx_name = "dlx_exchange";
    let dlq_name = "dead_letter_queue";
    let main_queue = "main_task_queue";

    // 1. Declarar el Dead Letter Exchange y la DLQ
    channel.exchange_declare(
        dlx_name,
        ExchangeKind::Direct,
        ExchangeDeclareOptions { durable: true, ..Default::default() },
        FieldTable::default(),
    ).await?;

    channel.queue_declare(
        dlq_name,
        QueueDeclareOptions { durable: true, ..Default::default() },
        FieldTable::default(),
    ).await?;

    channel.queue_bind(
        dlq_name, dlx_name, "dead.routing.key",
        QueueBindOptions::default(), FieldTable::default()
    ).await?;

    // 2. Configurar la cola principal para usar el DLX
    let mut main_queue_args = FieldTable::default();
    main_queue_args.insert(
        "x-dead-letter-exchange".into(),
        AMQPValue::LongString(dlx_name.into()),
    );
    main_queue_args.insert(
        "x-dead-letter-routing-key".into(),
        AMQPValue::LongString("dead.routing.key".into()),
    );

    // Si la cola principal rechaza un mensaje sin reencolar, irá a la DLQ automáticamente.
    channel.queue_declare(
        main_queue,
        QueueDeclareOptions { durable: true, ..Default::default() },
        main_queue_args, // <- Inyectamos los argumentos de DLQ
    ).await?;

    Ok(())
}
```

*Nota para Kafka:* Kafka no tiene un concepto nativo de DLQ en el broker. El patrón se implementa en el cliente: si tu worker en Rust detecta un error irrecuperable al procesar un `StreamConsumer`, el propio código de Rust debe publicar ese registro en un tópico separado (ej. `eventos_fallidos_topic`) utilizando un `FutureProducer` y luego hacer *commit* del offset original para avanzar.

---

### 2. Circuit Breakers: Cortando fallos en cascada

Imagina que tu aplicación Rust procesa mensajes de una cola y, por cada mensaje, realiza una llamada HTTP a un servicio externo de facturación. Si ese servicio externo se cae y comienza a tardar 30 segundos en responder con un error `504 Gateway Timeout`, tus workers se quedarán bloqueados esperando, las conexiones a RabbitMQ/Kafka se acumularán, y tu propia aplicación se quedará sin memoria o sin hilos disponibles.

El patrón **Circuit Breaker** (Cortacircuitos) actúa como un interruptor eléctrico:

* **Cerrado (Closed):** El flujo es normal. Se permiten las llamadas al servicio externo.
* **Abierto (Open):** Si los fallos superan un umbral (ej. 5 fallos consecutivos), el circuito se abre. Las llamadas subsiguientes fallan inmediatamente en tu código Rust sin intentar siquiera hacer la petición por red (Fail Fast).
* **Semi-abierto (Half-Open):** Después de un tiempo de gracia, el circuito permite pasar una única petición de prueba. Si tiene éxito, se cierra de nuevo. Si falla, se vuelve a abrir.

En el ecosistema de Rust, crates como `failsafe` nos permiten implementar este comportamiento de forma elegante y concurrente.

**Implementación básica con el crate `failsafe`**

Primero, añade el crate a tu `Cargo.toml`: `failsafe = "1.1"`

```rust
use failsafe::{Config, CircuitBreaker, Error as BreakerError, StateMachine};
use std::time::Duration;
use reqwest::Client;
use anyhow::{Result, anyhow};

// En una aplicación real, el Circuit Breaker debería compartirse (ej. Arc<...>)
// entre múltiples peticiones o workers.
type MyCircuitBreaker = StateMachine<failsafe::backoff::Exponential, failsafe::failure_policy::ConsecutiveFailures<failsafe::failure_policy::IgnoreAny>>;

pub struct BillingClient {
    http_client: Client,
    circuit_breaker: MyCircuitBreaker,
}

impl BillingClient {
    pub fn new() -> Self {
        // Configuramos: Abre tras 3 fallos consecutivos, espera exponencialmente para probar.
        let circuit_breaker = Config::new()
            .failure_policy(failsafe::Config::consecutive_failures(3))
            .build();

        Self {
            http_client: Client::new(),
            circuit_breaker,
        }
    }

    pub async fn charge_user(&self, user_id: &str) -> Result<()> {
        // Envolvemos la llamada crítica dentro del Circuit Breaker
        let result = self.circuit_breaker.call_async(|| async {
            let response = self.http_client
                .post(format!("https://api.facturacion.interna/charge/{}", user_id))
                .send()
                .await
                .map_err(|e| anyhow!("Fallo de red: {}", e))?;

            if response.status().is_success() {
                Ok(())
            } else {
                Err(anyhow!("El servicio respondió con status: {}", response.status()))
            }
        }).await;

        match result {
            Ok(_) => {
                println!("Cobro exitoso para {}", user_id);
                Ok(())
            }
            Err(BreakerError::Inner(e)) => {
                // Falló el servicio externo, pero el circuito sigue cerrado/contando
                eprintln!("Fallo el servicio de facturación: {}", e);
                Err(e)
            }
            Err(BreakerError::Rejected) => {
                // El circuito está ABIERTO. Fallo rápido sin hacer la petición.
                eprintln!("Circuito abierto. Petición rechazada inmediatamente para proteger el sistema.");
                Err(anyhow!("Servicio de facturación no disponible (Circuit Breaker activo)"))
            }
        }
    }
}
```

Al combinar DLQs con Circuit Breakers, logras una arquitectura donde los mensajes defectuosos no atascan tu sistema y los servicios externos degradados no provocan el colapso de tus workers asíncronos en Tokio.

## 35.4 CQRS y Event Sourcing en Rust

Para cerrar nuestra inmersión en la arquitectura orientada a eventos, abordaremos dos patrones avanzados que, aunque complejos de implementar en muchos lenguajes, encuentran en el sistema de tipos de Rust (específicamente en sus *Algebraic Data Types* o Enums) un terreno natural y seguro: **CQRS** (Command Query Responsibility Segregation) y **Event Sourcing**.

Mientras que las arquitecturas CRUD tradicionales almacenan únicamente el estado actual de una entidad (sobrescribiendo el pasado), Event Sourcing almacena el historial completo de cambios como una secuencia de eventos inmutables. CQRS complementa esto separando estrictamente las rutas de código que mutan el estado (Comandos) de las que lo leen (Consultas).

---

### 1. Modelando el Dominio con Enums (La ventaja de Rust)

En Rust, los eventos y comandos no necesitan ser jerarquías de clases complejas. Usamos Enums genéricos y expresivos. Esto nos garantiza en tiempo de compilación que el compilador nos avisará si olvidamos manejar un tipo de evento gracias a la exhaustividad del `match` (como vimos en el Capítulo 3).

```rust
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// 1. Los Comandos (Intenciones del usuario)
pub enum OrderCommand {
    CreateOrder { user_id: String, item_id: String, quantity: u32 },
    PayOrder { payment_reference: String },
    CancelOrder { reason: String },
}

// 2. Los Eventos (Hechos inmutables del pasado)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderEvent {
    OrderCreated { order_id: Uuid, user_id: String, item_id: String, quantity: u32, timestamp: DateTime<Utc> },
    OrderPaid { order_id: Uuid, payment_reference: String, timestamp: DateTime<Utc> },
    OrderCanceled { order_id: Uuid, reason: String, timestamp: DateTime<Utc> },
}
```

---

### 2. El Agregado y la Reconstrucción del Estado

En Event Sourcing, el estado actual en memoria (el Agregado) no se lee directamente de una tabla SQL. Se calcula haciendo un "reduce" (o `fold`) de todos los eventos históricos.

Veamos cómo implementar la lógica de mutación pura en Rust:

```rust
#[derive(Debug, PartialEq)]
pub enum OrderStatus {
    Pending,
    Paid,
    Canceled,
}

pub struct OrderAggregate {
    pub id: Uuid,
    pub status: OrderStatus,
    pub user_id: String,
    // ... otros campos
}

impl OrderAggregate {
    // Reconstruye el estado desde cero aplicando una lista de eventos
    pub fn load_from_history(events: &[OrderEvent]) -> Option<Self> {
        let mut aggregate: Option<Self> = None;
        for event in events {
            match aggregate.as_mut() {
                Some(agg) => agg.apply(event),
                None => {
                    // El primer evento debe ser la creación
                    if let OrderEvent::OrderCreated { order_id, user_id, .. } = event {
                        aggregate = Some(Self {
                            id: *order_id,
                            status: OrderStatus::Pending,
                            user_id: user_id.clone(),
                        });
                    }
                }
            }
        }
        aggregate
    }

    // Mutación pura de estado (No hay I/O, no hay DB, fácilmente testeable)
    pub fn apply(&mut self, event: &OrderEvent) {
        match event {
            OrderEvent::OrderPaid { .. } => self.status = OrderStatus::Paid,
            OrderEvent::OrderCanceled { .. } => self.status = OrderStatus::Canceled,
            OrderEvent::OrderCreated { .. } => {} // Ya manejado en la inicialización
        }
    }
}
```

---

### 3. El Modelo de Escritura (Command Handlers)

El lado de escritura en CQRS se encarga de recibir el comando, validar si la operación es posible basándose en el estado actual, generar el nuevo evento y persistirlo.

El "Event Store" suele ser una tabla optimizada de base de datos (ej. en PostgreSQL) o un log especializado (Kafka). La regla de oro es: **Primero se guarda el evento en la base de datos (Event Store), luego se publica en el Message Broker.**

```rust
use anyhow::{Result, bail};

pub struct OrderCommandHandler {
    // Aquí irían dependencias como el EventStore (ej. pool de SQLx) 
    // y el EventBus (ej. Productor de Kafka/RabbitMQ)
}

impl OrderCommandHandler {
    pub async fn handle(&self, command: OrderCommand) -> Result<Vec<OrderEvent>> {
        let mut generated_events = Vec::new();

        match command {
            OrderCommand::PayOrder { payment_reference } => {
                // 1. Cargar historia de la base de datos (Omitido por brevedad)
                let past_events = vec![/* eventos desde la DB */]; 
                let order = OrderAggregate::load_from_history(&past_events)
                    .ok_or_else(|| anyhow::anyhow!("Orden no encontrada"))?;

                // 2. Validación de reglas de negocio
                if order.status != OrderStatus::Pending {
                    bail!("La orden no está en estado pendiente y no puede ser pagada");
                }

                // 3. Generar el evento
                let new_event = OrderEvent::OrderPaid {
                    order_id: order.id,
                    payment_reference,
                    timestamp: Utc::now(),
                };
                generated_events.push(new_event);
            }
            // ... manejar otros comandos
            _ => {}
        }

        // 4. Persistir en Event Store (ej. SQLx INSERT en la tabla `events`)
        // self.event_store.save(&generated_events).await?;

        // 5. Publicar en Kafka/RabbitMQ para los Projectors
        // self.event_bus.publish(&generated_events).await?;

        Ok(generated_events)
    }
}
```

---

### 4. El Modelo de Lectura (Projectors y Vistas Materializadas)

Si el estado muta mediante eventos, ¿cómo hacemos una consulta del tipo `SELECT * FROM orders WHERE user_id = '123' AND status = 'Paid'`? Leer y reducir miles de eventos por cada request HTTP sería inviable.

Aquí entra el **Projector**. Utilizando los consumidores asíncronos de `rdkafka` o `lapin` que construimos en las secciones 35.1 y 35.2, un worker en segundo plano escucha el flujo de eventos y actualiza un modelo de lectura altamente optimizado (una vista materializada en PostgreSQL, un documento en MongoDB, o un caché en Redis).

1. El consumidor recibe `OrderEvent::OrderCreated`.
2. Hace un `INSERT` en una tabla relacional `read_orders`.
3. El consumidor recibe `OrderEvent::OrderPaid`.
4. Hace un `UPDATE read_orders SET status = 'Paid' WHERE id = ...`.

Esta separación permite escalar asimétricamente: tu API de lectura (usando Axum, por ejemplo) consulta directamente la tabla `read_orders` con tiempos de respuesta de sub-milisegundos, totalmente aislada de la carga transaccional y las reglas de negocio complejas del modelo de escritura.
