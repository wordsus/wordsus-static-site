Los patrones de diseño son soluciones probadas a problemas recurrentes en el desarrollo de software. En este capítulo, desmitificamos su implementación en Go, alejándonos de la rigidez de la herencia clásica para abrazar la **composición** y las **interfaces implícitas**. Exploraremos cómo patrones como **Builder** y **Functional Options** gestionan la complejidad creacional, cómo **Adapter** y **Decorator** estructuran sistemas desacoplados, y cómo **Strategy** u **Observer** dinamizan el comportamiento. El enfoque es pragmático: no se trata de forzar estructuras externas, sino de aplicar estos modelos de forma idiomática para construir sistemas backend robustos y mantenibles.

## 23.1. Patrones Creacionales (Builder, Singleton seguro en concurrencia)

En lenguajes orientados a objetos tradicionales, los patrones creacionales giran en torno a la instanciación de clases, ocultando la lógica de creación y limitando el uso directo de constructores (como `new`). Dado que Go no posee clases ni herencia clásica, la implementación de estos patrones se adapta a sus características nativas: funciones de paquete, *structs*, interfaces y punteros.

El objetivo central sigue siendo el mismo: desacoplar la creación de un objeto de su uso, promoviendo código más limpio, testeable y mantenible.

### El Patrón Builder (Constructor)

El patrón Builder brilla cuando necesitamos construir un objeto complejo que requiere múltiples pasos de inicialización o que posee una gran cantidad de parámetros opcionales. 

En Go, al no existir la sobrecarga de funciones ni los valores por defecto en los parámetros, inicializar un *struct* con docenas de campos puede llevar al antipatrón del "constructor telescópico" (funciones con interminables listas de argumentos ininteligibles).

Existen dos formas principales de implementar este patrón en Go: el Builder clásico por encadenamiento de métodos y su evolución idiomática, el patrón de Opciones Funcionales (*Functional Options Pattern*).

#### 1. Builder Clásico (Encadenamiento de métodos)

Este enfoque utiliza una estructura intermedia (el *Builder*) que almacena el estado temporal de la configuración y expone métodos que devuelven el propio Builder, permitiendo encadenar las llamadas.

```go
package builder

import (
	"errors"
	"time"
)

// Server representa el objeto complejo a construir.
type Server struct {
	Host    string
	Port    int
	Timeout time.Duration
	MaxConn int
}

// ServerBuilder es la estructura encargada de construir el Server.
type ServerBuilder struct {
	server *Server
}

// NewServerBuilder inicializa el builder con valores por defecto.
func NewServerBuilder() *ServerBuilder {
	return &ServerBuilder{
		server: &Server{
			Host:    "localhost",
			Port:    8080,
			Timeout: 30 * time.Second,
			MaxConn: 100,
		},
	}
}

func (b *ServerBuilder) SetHost(host string) *ServerBuilder {
	b.server.Host = host
	return b
}

func (b *ServerBuilder) SetPort(port int) *ServerBuilder {
	b.server.Port = port
	return b
}

func (b *ServerBuilder) SetTimeout(t time.Duration) *ServerBuilder {
	b.server.Timeout = t
	return b
}

// Build finaliza la construcción y puede incluir lógica de validación.
func (b *ServerBuilder) Build() (*Server, error) {
	if b.server.Port < 1 || b.server.Port > 65535 {
		return nil, errors.New("puerto inválido")
	}
	return b.server, nil
}
```

**Uso del Builder clásico:**
```go
srv, err := NewServerBuilder().
	SetHost("0.0.0.0").
	SetPort(9000).
	SetTimeout(60 * time.Second).
	Build()
```

#### 2. La alternativa idiomática: Functional Options

En el ecosistema avanzado de Go, el patrón Builder clásico suele ser sustituido por las *Functional Options* (popularizadas por Rob Pike). Este patrón logra el mismo objetivo pero con una sintaxis mucho más elegante y flexible, aprovechando que las funciones son ciudadanos de primera clase.

```go
package options

import "time"

type Server struct {
	Host    string
	Port    int
	Timeout time.Duration
}

// Option define el tipo de función que modificará la configuración del Server.
type Option func(*Server)

// ConHost es una opción que configura el host.
func ConHost(h string) Option {
	return func(s *Server) {
		s.Host = h
	}
}

// ConPort es una opción que configura el puerto.
func ConPort(p int) Option {
	return func(s *Server) {
		s.Port = p
	}
}

// NewServer utiliza argumentos variádicos para aplicar un número indeterminado de opciones.
func NewServer(opts ...Option) *Server {
	// Valores por defecto
	srv := &Server{
		Host:    "localhost",
		Port:    8080,
		Timeout: 30 * time.Second,
	}

	// Aplicamos las opciones funcionales proporcionadas
	for _, opt := range opts {
		opt(srv)
	}

	return srv
}
```

**Uso de Functional Options:**
```go
// Creación usando valores por defecto
defaultSrv := NewServer()

// Creación aplicando opciones específicas
customSrv := NewServer(
	ConHost("0.0.0.0"),
	ConPort(443),
)
```
Este enfoque reduce la necesidad de tipos intermedios y métodos de construcción (`Build()`), resultando en una API extremadamente limpia para las librerías exportadas.

---

### El Patrón Singleton (Seguro en Concurrencia)

El patrón Singleton garantiza que un *struct* tenga una única instancia en toda la aplicación y proporciona un punto de acceso global a ella. Aunque el estado global debe evitarse en la Arquitectura Limpia (como veremos en el Capítulo 21), hay recursos pesados que lógicamente deben ser únicos, como los *pools* de conexiones a bases de datos o los cargadores de configuración en memoria.

La implementación *naive* (comprobar si la instancia es `nil` y crearla) es un campo minado en Go debido a su naturaleza altamente concurrente. Múltiples Goroutines evaluando `if instance == nil` simultáneamente causarán un *Data Race* inevitable, instanciando el objeto múltiples veces.

Como se introdujo en el Capítulo 10 al hablar de optimizaciones, la forma idiomática, eficiente y a prueba de balas para implementar un Singleton en Go es utilizando `sync.Once`.

```go
package singleton

import (
	"fmt"
	"sync"
)

// Database representa la conexión a la base de datos (nuestro Singleton).
type Database struct {
	ConnectionURL string
}

var (
	// instance almacena la única instancia de la base de datos.
	instance *Database
	
	// once garantiza que la inicialización ocurra exactamente una vez.
	once sync.Once
)

// GetDatabaseInstance devuelve la única instancia de la estructura Database.
func GetDatabaseInstance() *Database {
	// once.Do ejecutará la función anónima proporcionada SOLO la primera
	// vez que sea invocada, bloqueando internamente a otras goroutines
	// que llamen a GetDatabaseInstance() hasta que termine la inicialización.
	once.Do(func() {
		fmt.Println("Inicializando la conexión a la base de datos...")
		// Aquí iría la lógica pesada o costosa de instanciación
		instance = &Database{
			ConnectionURL: "postgres://user:pass@localhost:5432/db",
		}
	})

	// Las llamadas subsecuentes ignorarán el bloque once.Do() y 
	// devolverán el puntero directamente, sin coste de bloqueos (locks).
	return instance
}
```

#### ¿Por qué no usar simplemente un `sync.Mutex`?

Podríamos utilizar un Mutex para bloquear la comprobación `if instance == nil`. Sin embargo, esto obligaría a que *cada* acceso al Singleton adquiriera un bloqueo (Lock), creando un cuello de botella grave en el rendimiento (*lock contention*). 

La genialidad de `sync.Once` radica en su implementación interna: utiliza operaciones atómicas (`sync/atomic`) implementando un patrón conocido como *Double-Checked Locking* altamente optimizado a nivel del compilador de Go. Esto asegura que el bloqueo solo ocurra durante la primera llamada; las lecturas posteriores son tan rápidas como leer una variable global ordinaria.

## 23.2. Patrones Estructurales (Adapter, Decorator, Facade)

Los patrones estructurales se centran en cómo se componen las clases y objetos para formar estructuras más grandes y complejas. En lenguajes tradicionales, esto suele implicar intrincadas jerarquías de herencia. En Go, gracias a la **composición de estructuras** y el **tipado estructural (interfaces implícitas)**, la implementación de estos patrones resulta ser mucho más natural, directa y con menos código repetitivo (*boilerplate*).

### El Patrón Adapter (Adaptador)

El patrón Adapter permite que componentes con interfaces incompatibles trabajen juntos. Actúa como un envoltorio (*wrapper*) que traduce las llamadas de una interfaz (la que espera el cliente) a otra (la del componente adaptado).

En Go, este patrón es fundamental y de uso diario. Dado que las interfaces se satisfacen de forma implícita (Capítulo 7), podemos crear un adaptador que satisfaga un contrato local simplemente implementando sus métodos, para luego delegar la lógica interna a una librería de terceros o un sistema *legacy*.

> **Nota de arquitectura:** Este patrón es la piedra angular del patrón de Puertos y Adaptadores (Arquitectura Hexagonal), que exploraremos a fondo en el Capítulo 21.

#### Ejemplo de Adapter en Go

Imaginemos que nuestro dominio define una interfaz estricta para procesar pagos, pero la librería externa (ej. Stripe o PayPal) tiene una firma de métodos completamente distinta.

```go
package adapter

import "fmt"

// 1. La interfaz objetivo (Puerto) que espera nuestro dominio.
type PaymentProcessor interface {
	Pay(amount float64) error
}

// 2. El servicio externo (Incompatible). No podemos modificar este código.
type StripeAPI struct{}

func (s *StripeAPI) Charge(usdCents int) string {
	return fmt.Sprintf("Cobrados %d centavos vía Stripe", usdCents)
}

// 3. El Adaptador. Envuelve el servicio externo.
type StripeAdapter struct {
	stripe *StripeAPI
}

// Satisfacemos la interfaz PaymentProcessor de forma implícita.
func (a *StripeAdapter) Pay(amount float64) error {
	// Traducimos el tipo de dato y la llamada al método
	cents := int(amount * 100)
	result := a.stripe.Charge(cents)
	fmt.Println(result)
	return nil
}

// Uso del adaptador
func ProcessOrder(p PaymentProcessor, amount float64) {
	_ = p.Pay(amount)
}

/*
En main.go:
stripe := &StripeAPI{}
adapter := &StripeAdapter{stripe: stripe}

// ProcessOrder no sabe que está usando Stripe, solo interactúa con PaymentProcessor
ProcessOrder(adapter, 25.50)
*/
```

---

### El Patrón Decorator (Decorador)

El patrón Decorator permite añadir responsabilidades o comportamientos adicionales a un objeto de forma dinámica, sin alterar su estructura subyacente. En lugar de utilizar herencia para extender la funcionalidad, envolvemos el objeto original con un decorador que implementa la misma interfaz.

En Go, este patrón brilla al usar la composición y las interfaces. El ejemplo más extendido en la Standard Library es el anidamiento de `io.Reader` (Capítulo 12), donde un `bufio.Reader` envuelve un archivo físico, añadiendo capacidad de búfer sin cambiar la firma original. Otro uso clásico son los **Middlewares** HTTP (Capítulo 25), que decoran un `http.Handler`.

#### Ejemplo de Decorator en Go

Supongamos que tenemos un servicio que ejecuta una tarea y queremos añadirle métricas de tiempo de ejecución (logging) sin modificar el código original del servicio.

```go
package decorator

import (
	"fmt"
	"time"
)

// Interfaz base
type Worker interface {
	DoWork()
}

// Implementación concreta
type SimpleWorker struct{}

func (s *SimpleWorker) DoWork() {
	fmt.Println("Realizando trabajo pesado...")
	time.Sleep(1 * time.Second) // Simulamos carga
}

// El Decorador que añade logging
type MetricsDecorator struct {
	// Composición: embebemos la interfaz para envolver el comportamiento
	worker Worker
}

func (m *MetricsDecorator) DoWork() {
	start := time.Now()
	
	// Delegamos la acción principal al objeto envuelto
	m.worker.DoWork()
	
	// Añadimos el nuevo comportamiento (decoración)
	duration := time.Since(start)
	fmt.Printf("Métrica: DoWork tardó %v\n", duration)
}

/*
En main.go:
baseWorker := &SimpleWorker{}

// Envolvemos el worker original con nuestro decorador
decoratedWorker := &MetricsDecorator{worker: baseWorker}

// El cliente utiliza la misma interfaz, pero ahora con logging integrado
decoratedWorker.DoWork()
*/
```

---

### El Patrón Facade (Fachada)

A medida que una aplicación crece, los subsistemas se vuelven complejos y granulares. El patrón Facade proporciona una interfaz unificada, simplificada y de alto nivel que enmascara la complejidad de un conjunto de subsistemas subyacentes.

A diferencia del *Adapter* (que hace que dos interfaces incompatibles funcionen juntas) o del *Decorator* (que añade comportamiento respetando la misma interfaz), el **Facade crea una interfaz completamente nueva y simplificada**.

En Go, esto se suele implementar creando un *struct* principal que agrupa llamadas a múltiples paquetes de utilidades o clientes de bases de datos.

#### Ejemplo de Facade en Go

Imaginemos un proceso de compra que requiere interactuar con el inventario, el sistema de cobros y el notificador de emails. Obligar al cliente (por ejemplo, el *Handler* HTTP) a orquestar todo esto genera acoplamiento. La Fachada lo resuelve:

```go
package facade

import "fmt"

// --- Subsistemas Complejos ---

type Inventory struct{}
func (i *Inventory) Check(product string) bool { return true }
func (i *Inventory) Reserve(product string)    { fmt.Println("Inventario reservado") }

type Payment struct{}
func (p *Payment) Process(user, amount string) bool { return true }

type Notifier struct{}
func (n *Notifier) SendEmail(user, msg string) { fmt.Println("Email enviado a", user) }


// --- La Fachada ---

type OrderFacade struct {
	inventory *Inventory
	payment   *Payment
	notifier  *Notifier
}

// NewOrderFacade inicializa los subsistemas internos.
func NewOrderFacade() *OrderFacade {
	return &OrderFacade{
		inventory: &Inventory{},
		payment:   &Payment{},
		notifier:  &Notifier{},
	}
}

// PlaceOrder es el método simplificado que expone la Fachada.
// Oculta toda la coreografía entre los subsistemas.
func (o *OrderFacade) PlaceOrder(user, product, amount string) error {
	if !o.inventory.Check(product) {
		return fmt.Errorf("producto agotado")
	}

	if !o.payment.Process(user, amount) {
		return fmt.Errorf("fallo en el pago")
	}

	o.inventory.Reserve(product)
	o.notifier.SendEmail(user, "Su orden ha sido procesada")
	
	return nil
}
```
Con este enfoque, el punto de entrada de la aplicación simplemente invoca `facade.PlaceOrder("Alice", "Libro Go", "30.00")`, manteniéndose ciego ante la complejidad interna.

## 23.3. Patrones de Comportamiento (Strategy, Observer)

Los patrones de comportamiento se centran en la asignación de responsabilidades y en la comunicación fluida entre distintos objetos. A diferencia de los lenguajes clásicos donde estos patrones requieren complejas jerarquías de herencia y abstracción, Go los implementa de forma excepcionalmente limpia utilizando **interfaces implícitas** (Capítulo 7) y **funciones de primera clase**.

El objetivo es lograr un alto grado de desacoplamiento, permitiendo que el comportamiento de un programa cambie dinámicamente en tiempo de ejecución.

### El Patrón Strategy (Estrategia)

El patrón Strategy permite definir una familia de algoritmos, encapsular cada uno de ellos y hacerlos intercambiables. Esto permite que el algoritmo varíe independientemente de los clientes que lo utilizan, eliminando las largas sentencias `switch` o `if/else` anidadas.

En Go, la implementación más idiomática se basa en definir una interfaz pequeña que represente el comportamiento (la estrategia) e inyectarla en un *struct* de contexto. 

#### Ejemplo de Strategy en Go

Supongamos que estamos construyendo un sistema de caché y necesitamos soportar diferentes políticas de desalojo (*eviction policies*) como FIFO (First In, First Out) o LRU (Least Recently Used). 

```go
package strategy

import "fmt"

// 1. La interfaz que define la Estrategia.
type EvictionStrategy interface {
	Evict(capacity int)
}

// 2. Estrategias concretas (implementan la interfaz implícitamente).

type Fifo struct{}

func (f *Fifo) Evict(capacity int) {
	fmt.Printf("Liberando memoria usando la estrategia FIFO. Capacidad actual: %d\n", capacity)
}

type Lru struct{}

func (l *Lru) Evict(capacity int) {
	fmt.Printf("Liberando memoria usando la estrategia LRU. Capacidad actual: %d\n", capacity)
}

// 3. El Contexto que utiliza la estrategia.

type Cache struct {
	storage      map[string]string
	capacity     int
	maxCapacity  int
	evictionAlgo EvictionStrategy // Composición de la interfaz
}

func NewCache(e EvictionStrategy) *Cache {
	return &Cache{
		storage:      make(map[string]string),
		capacity:     0,
		maxCapacity:  100,
		evictionAlgo: e,
	}
}

// SetStrategy permite cambiar el comportamiento en tiempo de ejecución.
func (c *Cache) SetStrategy(e EvictionStrategy) {
	c.evictionAlgo = e
}

func (c *Cache) Add(key, value string) {
	if c.capacity >= c.maxCapacity {
		// El contexto delega la acción a la estrategia inyectada
		c.evictionAlgo.Evict(c.capacity)
		c.capacity-- // Simulamos la liberación
	}
	c.storage[key] = value
	c.capacity++
}
```

**Uso del patrón Strategy:**
```go
// Inicializamos el contexto con una estrategia concreta
cache := strategy.NewCache(&strategy.Fifo{})
// ... llenamos la caché ...
cache.Add("k1", "v1") // Si supera el límite, usará FIFO

// Cambiamos el comportamiento en tiempo de ejecución
cache.SetStrategy(&strategy.Lru{})
cache.Add("k2", "v2") // Ahora usará LRU al desalojar
```

> **Nota:** Alternativamente, si la estrategia consta de un único método, en Go es muy común inyectar simplemente una función (tipo `func(int)`) en lugar de definir una interfaz completa, simplificando aún más el diseño.

---

### El Patrón Observer (Observador)

El patrón Observer define una dependencia de uno-a-muchos entre objetos. Cuando el objeto principal (el *Subject* o Sujeto) cambia su estado, notifica automáticamente a todos sus dependientes (los *Observers* u Observadores) para que se actualicen. Es la base arquitectónica de los sistemas orientados a eventos.

En Go, existen dos formas principales de implementarlo:
1. **El enfoque clásico síncrono:** Usando *slices* de interfaces.
2. **El enfoque concurrente e idiomático:** Usando **Canales** (Channels, como vimos en el Capítulo 9).

A continuación, mostraremos el enfoque clásico basado en interfaces, ideal para dominios simples donde la notificación debe ser inmediata y síncrona.

#### Ejemplo de Observer en Go

Imaginemos un sistema de inventario donde los clientes desean ser notificados cuando un producto agotado vuelve a estar en *stock*.

```go
package observer

import "fmt"

// 1. La interfaz del Observador (quien recibe la notificación)
type Observer interface {
	Update(productName string)
}

// 2. La interfaz del Sujeto (quien emite la notificación)
type Subject interface {
	Register(observer Observer)
	Deregister(observer Observer)
	NotifyAll()
}

// --- Implementaciones Concretas ---

// Customer actúa como el Observador concreto
type Customer struct {
	ID string
}

func (c *Customer) Update(productName string) {
	fmt.Printf("Email a %s: ¡El producto %s vuelve a estar disponible!\n", c.ID, productName)
}

// Item actúa como el Sujeto concreto
type Item struct {
	observerList []Observer
	name         string
	inStock      bool
}

func NewItem(name string) *Item {
	return &Item{
		name: name,
	}
}

func (i *Item) UpdateAvailability() {
	fmt.Printf("Sistema: Actualizando disponibilidad del item %s\n", i.name)
	i.inStock = true
	i.NotifyAll()
}

func (i *Item) Register(o Observer) {
	i.observerList = append(i.observerList, o)
}

func (i *Item) Deregister(o Observer) {
	// Lógica genérica en Go para eliminar un elemento de un slice
	for index, observer := range i.observerList {
		if observer == o {
			i.observerList = append(i.observerList[:index], i.observerList[index+1:]...)
			break
		}
	}
}

func (i *Item) NotifyAll() {
	for _, observer := range i.observerList {
		observer.Update(i.name)
	}
}
```

**Uso del patrón Observer:**
```go
nintendoSwitch := observer.NewItem("Nintendo Switch")

cliente1 := &observer.Customer{ID: "alice@example.com"}
cliente2 := &observer.Customer{ID: "bob@example.com"}

// Los clientes se suscriben al producto
nintendoSwitch.Register(cliente1)
nintendoSwitch.Register(cliente2)

// Al actualizar la disponibilidad, ambos clientes son notificados automáticamente
nintendoSwitch.UpdateAvailability()
```

> **Evolución con Canales:** Si las notificaciones (el método `Update`) fuesen operaciones costosas (como llamadas HTTP o a bases de datos), el enfoque clásico bloquearía el hilo principal. En el ecosistema de Go, este patrón suele evolucionar hacia arquitecturas de colas internas donde el `Subject` envía mensajes a través de un `chan` y un *Worker Pool* (Capítulo 11) se encarga de procesarlos de forma asíncrona.
