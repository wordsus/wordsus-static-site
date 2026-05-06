La transición de sistemas monolíticos a microservicios exige un cambio de paradigma: pasar de la comunicación síncrona y acoplada hacia modelos **orientados a eventos**. En este capítulo, exploraremos cómo Go se convierte en el lenguaje ideal para construir sistemas reactivos gracias a su eficiencia en la gestión de red y concurrencia. Analizaremos el uso de **Message Brokers** para desacoplar procesos, garantizando que nuestros servicios sean resilientes, escalables y capaces de procesar flujos masivos de datos sin bloquear la experiencia del usuario. De la flexibilidad de RabbitMQ a la potencia de Kafka y la ligereza de NATS, dominaremos el transporte asíncrono de la información.

## 34.1. Conceptos fundamentales de sistemas orientados a eventos

En los capítulos anteriores exploramos patrones de comunicación síncrona entre servicios, fundamentados en arquitecturas RESTful (Capítulo 24) y gRPC (Capítulo 33). Si bien estos enfoques son excelentes para consultas en tiempo real y flujos fuertemente acoplados, presentan desafíos de latencia y disponibilidad cuando los sistemas escalan y las cadenas de llamadas se vuelven profundas. Aquí es donde brilla la Arquitectura Orientada a Eventos (EDA, por sus siglas en inglés).

Un sistema orientado a eventos invierte el flujo de control tradicional. En lugar de que el Servicio A le diga al Servicio B qué hacer, el Servicio A simplemente anuncia que "algo ha sucedido". El Servicio B, si está interesado, reacciona en consecuencia.

---

### Eventos vs. Comandos

Para modelar correctamente en EDA, es crucial distinguir entre un comando y un evento, un concepto que roza lo visto en el modelado de Dominio (Capítulo 22) pero que aquí se aplica a la red:

* **Comando:** Representa una *intención* o una petición para que algo ocurra en el futuro. Puede fallar o ser rechazado. (Ejemplo: `CreateOrderCommand`).
* **Evento:** Representa un *hecho histórico* e inmutable; algo que ya ha sucedido. No puede ser rechazado porque ya es parte del pasado. (Ejemplo: `OrderCreatedEvent`).

En una arquitectura distribuida, los servicios publican eventos de dominio o de integración para que otros microservicios sincronicen su estado o disparen procesos paralelos de forma reactiva.

---

### Dimensiones del Desacoplamiento

La principal ventaja de adoptar eventos en microservicios es lograr un alto nivel de desacoplamiento, el cual se manifiesta en dos dimensiones principales:

1.  **Desacoplamiento Espacial:** El productor del evento no necesita conocer la dirección en la red (IP/Puerto) de los consumidores, ni siquiera cuántos existen. El enrutamiento se delega a la infraestructura subyacente.
2.  **Desacoplamiento Temporal:** El productor y el consumidor no necesitan estar operativos simultáneamente. Si el consumidor está inactivo (por mantenimiento o fallo), la infraestructura retiene el evento hasta que el consumidor se recupera.

---

### Garantías de Entrega (Delivery Semantics)

Cuando introducimos la red asíncrona, debemos lidiar con los teoremas de sistemas distribuidos. Un aspecto fundamental que guiará la elección de la tecnología en las próximas secciones (RabbitMQ, Kafka, NATS) es la semántica de entrega de mensajes. 

Ningún sistema distribuido es perfecto, por lo que las herramientas ofrecen diferentes niveles de garantía:

| Semántica | Descripción | Casos de uso típicos | Riesgo principal |
| :--- | :--- | :--- | :--- |
| **At-most-once** (Como máximo una vez) | El mensaje se envía una vez. Si se pierde en la red, no se reintenta. | Métricas, telemetría o logs donde perder un dato no es crítico. | Pérdida silenciosa de datos. |
| **At-least-once** (Al menos una vez) | Garantiza que el mensaje llegará, reintentando si es necesario. Puede llegar duplicado. | Transacciones financieras, correos electrónicos, actualizaciones de estado. | Requiere que el consumidor sea **idempotente** para manejar duplicados. |
| **Exactly-once** (Exactamente una vez) | El ideal teórico. El sistema garantiza la entrega única sin duplicados a nivel de aplicación. | Sistemas contables de alta precisión. | Altísima sobrecarga de rendimiento y complejidad arquitectónica. |

> **Nota arquitectónica:** En Go, y en sistemas distribuidos en general, la semántica *At-least-once* combinada con la implementación de **Idempotencia** en el consumidor (usando claves únicas o transacciones en la base de datos) es el estándar de la industria. Intentar forzar *Exactly-once* a través de la red suele ser un antipatrón debido a su penalización en el rendimiento.

---

### Modelando un Bus de Eventos Conceptual en Go

Aunque en producción delegaremos el ruteo a un Message Broker externo, comprender la mecánica interna es esencial. Gracias a las primitivas de concurrencia de Go (Goroutines y Canales, vistos en la Parte 3), podemos conceptualizar el patrón fundamental de Productor-Consumidor en unas pocas líneas de código.

El siguiente ejemplo ilustra un mediador (Event Bus) básico en memoria que despacha eventos a múltiples suscriptores de forma asíncrona:

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// Event encapsula el tipo de evento y su carga útil.
type Event struct {
	Type    string
	Payload any
}

// EventHandler define la firma para las funciones que consumirán eventos.
type EventHandler func(Event)

// EventBus maneja las suscripciones y el despacho de eventos.
type EventBus struct {
	mu          sync.RWMutex
	subscribers map[string][]EventHandler
}

func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[string][]EventHandler),
	}
}

// Subscribe registra un manejador para un tipo de evento específico.
func (eb *EventBus) Subscribe(eventType string, handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.subscribers[eventType] = append(eb.subscribers[eventType], handler)
}

// Publish emite un evento a todos sus suscriptores de forma asíncrona.
func (eb *EventBus) Publish(event Event) {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	if handlers, found := eb.subscribers[event.Type]; found {
		for _, handler := range handlers {
			// Fan-out: despachamos cada manejador en su propia goroutine
			go handler(event)
		}
	}
}

func main() {
	bus := NewEventBus()

	// Consumidor 1: Sistema de Notificaciones
	bus.Subscribe("UserCreated", func(e Event) {
		fmt.Printf("[Notificaciones] Enviando email de bienvenida al usuario: %v\n", e.Payload)
	})

	// Consumidor 2: Sistema de Analítica
	bus.Subscribe("UserCreated", func(e Event) {
		fmt.Printf("[Analítica] Registrando nuevo usuario en métricas: %v\n", e.Payload)
	})

	// Productor: Emite el evento sin acoplarse a los consumidores
	bus.Publish(Event{
		Type:    "UserCreated",
		Payload: "gopher@example.com",
	})

	// Pausa artificial para permitir que las goroutines finalicen antes de salir
	time.Sleep(100 * time.Millisecond)
}
```

Este código demuestra el Desacoplamiento Espacial: el `main` (actuando como productor al llamar a `Publish`) no tiene conocimiento de los sistemas de Notificaciones o Analítica. Solo le comunica al bus un hecho histórico (`UserCreated`).

En las siguientes secciones, extraeremos este "Bus en memoria" fuera de nuestra aplicación Go, utilizando componentes de infraestructura robustos que nos proveerán, además, de Desacoplamiento Temporal y persistencia ante caídas.

## 34.2. Producción y consumo asíncrono con RabbitMQ (AMQP)

Habiendo modelado conceptualmente el paso de mensajes en memoria, es momento de introducir un *Message Broker* real para lograr la resiliencia y el Desacoplamiento Temporal que las aplicaciones en red exigen. RabbitMQ es una de las soluciones más robustas y probadas en la industria, implementando el protocolo AMQP (Advanced Message Queuing Protocol) en su versión 0-9-1.

A diferencia del simple patrón de "publicar en una cola", AMQP introduce una capa de enrutamiento muy potente mediante tres componentes clave:

* **Exchange (Intercambiador):** El buzón de entrada. Los productores nunca envían mensajes directamente a una cola; los envían a un Exchange. Este se encarga de decidir a qué cola(s) enviar el mensaje basándose en reglas de enrutamiento (Bindings) y en el tipo de Exchange (Direct, Topic, Fanout, Headers).
* **Queue (Cola):** El buffer físico de almacenamiento donde los mensajes residen hasta que un consumidor los procesa.
* **Binding (Enlace):** La regla matemática o de ruteo que une un Exchange con una Queue.

---

### El cliente oficial en Go

El paquete estándar de facto para interactuar con RabbitMQ en Go es `github.com/rabbitmq/amqp091-go` (mantenido oficialmente tras la migración del clásico `streadway/amqp`). 

Una distinción arquitectónica fundamental que debes comprender al usar esta librería es la diferencia entre una **Conexión TCP** y un **Canal AMQP**:

1.  **Conexión (`amqp091.Connection`):** Es la conexión TCP pesada y persistente entre tu aplicación Go y el clúster de RabbitMQ. Debes mantenerla abierta durante el ciclo de vida de tu aplicación.
2.  **Canal (`amqp091.Channel`):** Es una conexión virtual (multiplexada) dentro de la conexión TCP. Las operaciones de publicación y consumo se realizan a través de canales. Crear un canal es barato; establecer una conexión TCP no lo es.

> **Nota de concurrencia:** Aunque puedes tener múltiples Goroutines publicando en el *mismo* Canal, es idiomático y más seguro en entornos de alta concurrencia abrir un Canal AMQP por cada Goroutine productora/consumidora, compartiendo la misma Conexión TCP subyacente.

---

### Implementación del Productor

Para construir un productor robusto, utilizaremos `PublishWithContext` (aprovechando el paquete `context` visto en el Capítulo 13) para evitar bloqueos indefinidos durante caídas de red.

```go
package main

import (
	"context"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func publishMessage(conn *amqp.Connection, exchange, routingKey, body string) error {
	// 1. Abrimos un canal efímero para la operación
	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	// 2. Usamos Context para definir un tiempo límite de red
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 3. Publicamos el mensaje
	err = ch.PublishWithContext(ctx,
		exchange,   // exchange
		routingKey, // routing key
		false,      // mandatory (si no encuentra cola, descarta)
		false,      // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent, // Asegura persistencia en disco si RabbitMQ reinicia
			Body:         []byte(body),
			Timestamp:    time.Now(),
		})

	if err != nil {
		return err
	}

	log.Printf("Mensaje enviado a %s: %s", exchange, body)
	return nil
}
```

---

### Implementación del Consumidor y Backpressure (QoS)

Al consumir mensajes, un error común en sistemas Go novatos es permitir que RabbitMQ inunde la aplicación con miles de mensajes a la vez, agotando la memoria o colapsando los recursos externos (como una base de datos de la Parte 8). 

Para evitar esto, configuramos la **Calidad de Servicio (QoS)** estableciendo el `PrefetchCount`. Esto le indica a RabbitMQ cuántos mensajes sin confirmar (unacknowledged) puede tener el consumidor simultáneamente en memoria.

El siguiente ejemplo demuestra un consumidor asíncrono avanzado con confirmación manual de mensajes:

```go
func startConsumer(conn *amqp.Connection, queueName string) error {
	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	// No hacemos defer ch.Close() aquí porque el consumo es continuo y asíncrono

	// 1. Configurar Backpressure (QoS): Procesar un máximo de 10 mensajes a la vez
	err = ch.Qos(
		10,    // prefetch count
		0,     // prefetch size
		false, // global
	)
	if err != nil {
		return err
	}

	// 2. Registrar el consumidor
	msgs, err := ch.Consume(
		queueName, // queue
		"",        // consumer tag
		false,     // auto-ack (PUESTO EN FALSE PARA CONFIRMACIÓN MANUAL)
		false,     // exclusive
		false,     // no-local
		false,     // no-wait
		nil,       // args
	)
	if err != nil {
		return err
	}

	// 3. Procesar el canal de entrega de mensajes en una goroutine
	go func() {
		for d := range msgs {
			log.Printf("Procesando evento: %s", d.Body)

			// Simulamos un procesamiento asíncrono o interacción con DB
			time.Sleep(500 * time.Millisecond)

			// 4. Confirmación manual (Acknowledge)
			// d.Ack(false) indica que solo confirmamos este mensaje específico.
			if err := d.Ack(false); err != nil {
				log.Printf("Error al confirmar el mensaje: %v", err)
				// En un escenario real, aquí se evaluaría un d.Nack() o requeue
			} else {
				log.Printf("Evento procesado y confirmado")
			}
		}
	}()

	log.Println("Consumidor iniciado. Esperando eventos...")
	return nil
}
```

La lectura del canal `msgs` (`<-chan amqp.Delivery`) devuelto por `ch.Consume` se realiza sin esfuerzo aprovechando la sintaxis `for range` vista en el Capítulo 9. Mientras la conexión y el canal AMQP se mantengan vivos, RabbitMQ seguirá inyectando mensajes en este canal de Go.

## 34.3. Procesamiento masivo de flujos de datos con Apache Kafka (sarama / confluent-kafka-go)

Mientras que RabbitMQ (visto en la sección anterior) destaca como un *Message Broker* tradicional centrado en el enrutamiento complejo y colas de las que los mensajes desaparecen una vez consumidos, Apache Kafka propone un paradigma radicalmente distinto. Kafka no es una cola de mensajes, sino un **registro de confirmación distribuido (Distributed Commit Log)**.

En Kafka, los eventos se añaden secuencialmente a un archivo en disco (Log) y permanecen allí hasta que expira su política de retención (días, meses o incluso de forma indefinida). Esto permite un rendimiento masivo (millones de mensajes por segundo) y la capacidad de que múltiples sistemas "reproduzcan" (replay) la historia de eventos de forma independiente, una característica vital en arquitecturas de *Event Sourcing*.

---

### El dilema del ecosistema Go: Sarama vs. Confluent-kafka-go

A la hora de integrar Kafka en Go, la comunidad se divide principalmente entre dos grandes librerías, cada una con compromisos arquitectónicos que debes evaluar:

1.  **`IBM/sarama` (anteriormente de Shopify):** Es una implementación nativa 100% en Go. Su gran ventaja es que compila estáticamente sin dependencias externas, lo que facilita enormemente la creación de imágenes Docker ligeras (como vimos en el Capítulo 47). Sin embargo, al tener que reimplementar el protocolo de Kafka, a veces se queda rezagada frente a las últimas funcionalidades del ecosistema.
2.  **`confluentinc/confluent-kafka-go`:** Es la librería oficial de Confluent. Es un *wrapper* (envoltorio) sobre la robusta librería C `librdkafka`. Ofrece el máximo rendimiento posible y paridad total con las características de Kafka. Su principal desventaja es que **requiere Cgo** (Capítulo 46), lo que introduce dependencias del compilador de C (`gcc`) en tu pipeline de CI/CD y un ligero impacto en el rendimiento al cruzar la frontera entre Go y C.

Dado que `confluent-kafka-go` es el estándar empresarial para cargas de trabajo críticas, basaremos nuestros ejemplos en esta implementación.

---

### Producción asíncrona y Reportes de Entrega

Un productor en Kafka es altamente concurrente por diseño. Cuando llamas al método de producción, el mensaje no viaja a la red inmediatamente; se encola en un búfer interno y se envía por lotes (batching) para optimizar el I/O.

Para saber si un mensaje llegó a Kafka con éxito, debemos escuchar de forma asíncrona el canal de eventos (Delivery Reports) del productor:

```go
package main

import (
	"fmt"
	"log"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

func main() {
	// 1. Configuración del Productor
	p, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers": "localhost:9092",
		"acks":              "all", // Máxima garantía de durabilidad
	})
	if err != nil {
		log.Fatalf("Error creando productor: %v", err)
	}
	defer p.Close()

	// 2. Goroutine para procesar los Delivery Reports (Eventos de red)
	go func() {
		for e := range p.Events() {
			switch ev := e.(type) {
			case *kafka.Message:
				if ev.TopicPartition.Error != nil {
					log.Printf("Error de entrega: %v\n", ev.TopicPartition.Error)
				} else {
					log.Printf("Mensaje entregado al topic %s [Partición: %d] en el Offset %v\n",
						*ev.TopicPartition.Topic, ev.TopicPartition.Partition, ev.TopicPartition.Offset)
				}
			}
		}
	}()

	// 3. Producción asíncrona de mensajes
	topic := "transacciones_financieras"
	key := "usuario_123" // La clave garantiza el orden en la misma partición
	value := `{"monto": 1500.50, "moneda": "USD"}`

	err = p.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Key:            []byte(key),
		Value:          []byte(value),
	}, nil)

	if err != nil {
		log.Printf("Error encolando mensaje: %v", err)
	}

	// Esperamos a que se vacíen los búferes internos antes de salir (Graceful shutdown)
	p.Flush(15 * 1000) 
}
```

> **Importante:** Nota el uso de `Key`. En Kafka, el paralelismo se logra dividiendo un Topic en múltiples **Particiones**. Si envías mensajes con la misma clave (ej. el ID de un usuario), Kafka garantiza mediante un *hash* que todos esos mensajes irán a la misma partición, asegurando su orden secuencial estricto.

---

### Consumo y Grupos de Consumidores (Consumer Groups)

A diferencia de RabbitMQ, donde múltiples trabajadores compiten por vaciar una cola, Kafka utiliza el concepto de **Grupos de Consumidores**. 

Si lanzas tres réplicas de tu microservicio Go configuradas con el mismo `group.id`, Kafka asignará automáticamente diferentes particiones del Topic a cada instancia. Esto permite escalar el consumo horizontalmente sin esfuerzo. Kafka lleva el registro del último mensaje leído por cada grupo mediante un puntero llamado **Offset**.

El siguiente patrón ilustra un consumidor continuo (polling loop):

```go
package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

func main() {
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers": "localhost:9092",
		"group.id":          "microservicio_analitica",
		"auto.offset.reset": "earliest", // Si no hay offset previo, lee desde el principio
	})
	if err != nil {
		log.Fatalf("Error creando consumidor: %v", err)
	}
	defer c.Close()

	// Suscripción al topic
	err = c.SubscribeTopics([]string{"transacciones_financieras"}, nil)
	if err != nil {
		log.Fatalf("Error al suscribirse: %v", err)
	}

	// Canal para manejar el apagado elegante (Graceful Shutdown - Cap. 49)
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	run := true
	log.Println("Iniciando consumo de eventos...")

	for run {
		select {
		case sig := <-sigchan:
			log.Printf("Señal terminación recibida: %v\n", sig)
			run = false
		default:
			// Polling bloqueante con timeout
			ev := c.Poll(100) 
			if ev == nil {
				continue
			}

			switch e := ev.(type) {
			case *kafka.Message:
				fmt.Printf("Mensaje procesado de la partición %d: %s\n", 
                    e.TopicPartition.Partition, string(e.Value))
				// El commit de offsets es automático por defecto en esta librería,
				// pero en sistemas críticos se desactiva "enable.auto.commit" 
				// y se llama a c.Commit() manualmente tras procesar la base de datos.
			case kafka.Error:
				// Errores del cliente o del broker
				fmt.Fprintf(os.Stderr, "Error: %v\n", e)
				if e.Code() == kafka.ErrAllBrokersDown {
					run = false
				}
			}
		}
	}
}
```

El diseño de bucle cerrado con `Poll()` y el manejo de señales del sistema operativo garantizan que el consumidor se desvincule correctamente del clúster (provocando un rebalanceo hacia las instancias restantes) cuando el orquestador de contenedores decida detener el pod.

## 34.4. NATS y NATS JetStream para alta disponibilidad y baja latencia

Tras haber analizado el enrutamiento complejo de RabbitMQ y la retención masiva de registros de Kafka, cerramos este capítulo con una tecnología que tiene un lugar especial en el ecosistema: **NATS**. 

A diferencia de los anteriores, el servidor de NATS (`nats-server`) está escrito íntegramente en Go. Esto no es solo una curiosidad; significa que se despliega como un único binario estático ultraligero, sin dependencias de la Máquina Virtual de Java (JVM) ni de Erlang, y es capaz de procesar millones de mensajes por segundo con una latencia de microsegundos en hardware modesto.

NATS se divide arquitectónicamente en dos subsistemas que cubren diferentes necesidades: **Core NATS** y **NATS JetStream**.

---

### Core NATS: El "Tono de Marcación" de la Nube

Core NATS implementa un modelo de mensajería puramente en memoria con una semántica de entrega *At-most-once* (como máximo una vez). Su filosofía es actuar como una red neuronal o un "tono de marcación" (dial-tone) siempre disponible: si estás conectado, escuchas el mensaje; si no, te lo pierdes.

Además del clásico patrón Pub/Sub, Core NATS brilla en el patrón **Request-Reply**. En lugar de usar HTTP o gRPC para comunicación síncrona entre microservicios, puedes usar la red asíncrona de NATS para enviar una petición y esperar una respuesta con un *timeout* integrado, manejando el enrutamiento dinámico (Service Discovery) de forma transparente.

El cliente oficial en Go (`github.com/nats-io/nats.go`) hace que esta interacción sea extremadamente idiomática:

```go
package main

import (
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
)

func main() {
	// 1. Conexión al servidor NATS
	nc, err := nats.Connect(nats.DefaultURL)
	if err != nil {
		log.Fatal(err)
	}
	defer nc.Close()

	// 2. Suscriptor (Actúa como un microservicio que responde peticiones)
	_, err = nc.Subscribe("servicios.facturacion", func(m *nats.Msg) {
		log.Printf("Petición recibida: %s", string(m.Data))
		
		// Responde al remitente usando la bandeja de entrada efímera del mensaje
		m.Respond([]byte("Factura generada con éxito"))
	})
	if err != nil {
		log.Fatal(err)
	}

	// 3. Productor (Hace una petición Request-Reply síncrona sobre la red asíncrona)
	log.Println("Solicitando generación de factura...")
	msg, err := nc.Request("servicios.facturacion", []byte("ID_ORDEN: 9982"), 2*time.Second)
	if err != nil {
		log.Fatalf("Error en la petición: %v", err)
	}

	fmt.Printf("Respuesta del servicio: %s\n", string(msg.Data))
}
```

> **Ventaja arquitectónica:** Al usar Request-Reply sobre NATS, el servicio solicitante no necesita saber la IP del servicio de facturación. Si levantas 10 instancias del servicio de facturación y usas un `QueueSubscribe` (Grupos de colas en NATS), NATS balanceará la carga automáticamente entre ellas.

---

### NATS JetStream: Persistencia y Replay

Dado que Core NATS es efímero, el ecosistema introdujo **JetStream** para competir directamente con las capacidades de retención de Kafka y el enrutamiento seguro de RabbitMQ. JetStream añade una capa de persistencia (en memoria o respaldada por disco) construida sobre Core NATS, ofreciendo semánticas *At-least-once* y retención a largo plazo.

En JetStream definimos **Streams** (que capturan y almacenan eventos basándose en comodines o *wildcards*) y **Consumers** (vistas sobre el Stream que rastrean qué mensajes han sido entregados y confirmados).

A continuación, un ejemplo de cómo interactuar con el motor JetStream desde Go para publicar y consumir con garantías de entrega:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func main() {
	nc, err := nats.Connect(nats.DefaultURL)
	if err != nil {
		log.Fatal(err)
	}
	defer nc.Close()

	// 1. Inicializar el cliente JetStream moderno (nats.go v1.30+)
	js, err := jetstream.New(nc)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 2. Declarar un Stream (Idempotente: si existe, lo actualiza o lo ignora)
	stream, err := js.CreateStream(ctx, jetstream.StreamConfig{
		Name:     "AUDITORIA",
		Subjects: []string{"auditoria.>"}, // Captura cualquier evento que empiece con "auditoria."
		Storage:  jetstream.FileStorage,   // Persistencia en disco
	})
	if err != nil {
		log.Fatal(err)
	}

	// 3. Publicar un mensaje persistente
	ack, err := js.Publish(ctx, "auditoria.login.exitoso", []byte("Usuario admin conectado"))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Mensaje persistido en el Stream %s, Secuencia: %d\n", stream.CachedInfo().Config.Name, ack.Sequence)

	// 4. Crear un Consumidor Duradero (recuerda su estado aunque la app se reinicie)
	cons, err := js.CreateOrUpdateConsumer(ctx, "AUDITORIA", jetstream.ConsumerConfig{
		Durable:       "monitor_seguridad",
		DeliverPolicy: jetstream.DeliverAllPolicy,
		AckPolicy:     jetstream.AckExplicitPolicy, // Requiere confirmación manual
	})
	if err != nil {
		log.Fatal(err)
	}

	// 5. Consumir mensajes
	msgCtx, err := cons.Consume(func(msg jetstream.Msg) {
		fmt.Printf("Evento de auditoría detectado: %s\n", string(msg.Data()))
		
		// Confirmación manual (esencial en semántica At-least-once)
		msg.Ack()
	})
	if err != nil {
		log.Fatal(err)
	}

	// Esperar un momento para recibir el mensaje antes de cerrar
	time.Sleep(1 * time.Second)
	msgCtx.Stop()
}
```

NATS JetStream ofrece una alternativa extremadamente atractiva para equipos de Go que desean las capacidades de Kafka (event sourcing, replay, durabilidad) sin la pesada carga operativa que supone administrar clústeres de JVM, Zookeeper o KRaft.
