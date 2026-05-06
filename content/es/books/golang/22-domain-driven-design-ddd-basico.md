El diseño guiado por el dominio (DDD) es la respuesta a la complejidad inherente de los sistemas empresariales modernos. En Go, aplicar DDD no implica forzar el lenguaje a paradigmas ajenos, sino aprovechar su sistema de tipos y su pragmatismo para blindar la lógica de negocio frente a detalles técnicos.

En este capítulo, aprenderemos a modelar el **corazón** de nuestra aplicación. Veremos cómo los `structs` se transforman en Entidades con identidad propia y Value Objects inmutables, y cómo los Agregados garantizan la consistencia transaccional. El objetivo es claro: escribir código que hable el lenguaje del experto de negocio, facilitando el mantenimiento y la evolución del software.

## 22.1. Modelado de Entidades, Value Objects y Agregados en Structs

En el corazón del diseño guiado por el dominio se encuentra la necesidad de traducir el **Lenguaje Ubicuo** (Ubiquitous Language) en código funcional y seguro. Go nos permite modelar la riqueza de nuestro dominio de negocio utilizando `structs` como base, apoyándonos fuertemente en su sistema de tipos estático y en la semántica de punteros frente a valores que repasamos en el Capítulo 6.

A continuación, exploraremos cómo implementar los tres pilares fundamentales del modelado táctico en DDD: Value Objects, Entidades y Agregados.

### 1. Value Objects (Objetos de Valor)

Un *Value Object* encapsula un conjunto de atributos que describen un concepto del dominio. Sus características principales son:
* **No tienen identidad:** Se definen únicamente por el valor de sus atributos.
* **Son inmutables:** Una vez creados, su estado no puede cambiar. Cualquier operación que altere su valor debe devolver una nueva instancia.
* **Equivalencia estructural:** Dos Value Objects son iguales si todos sus campos son iguales.

En Go, el modelado de Value Objects encaja a la perfección con la **semántica de paso por valor**. El operador de igualdad (`==`) nativo de Go compara `structs` campo por campo, lo cual nos regala el comportamiento de equivalencia estructural sin escribir código adicional.

```go
package domain

import "errors"

// Money es un Value Object. Sus campos no están exportados para evitar
// mutaciones directas desde fuera del paquete.
type Money struct {
	amount   int64  // Representado en centavos para evitar problemas de coma flotante
	currency string
}

// NewMoney actúa como un constructor que valida los invariantes al momento de la creación.
func NewMoney(amount int64, currency string) (Money, error) {
	if amount < 0 {
		return Money{}, errors.New("el monto no puede ser negativo")
	}
	if currency == "" {
		return Money{}, errors.New("la moneda es obligatoria")
	}
	return Money{amount: amount, currency: currency}, nil
}

// Add devuelve un *nuevo* Value Object, garantizando la inmutabilidad.
// Nota: El receptor es de tipo valor (m Money), no puntero (*Money).
func (m Money) Add(other Money) (Money, error) {
	if m.currency != other.currency {
		return Money{}, errors.New("no se pueden sumar monedas diferentes")
	}
	return Money{
		amount:   m.amount + other.amount,
		currency: m.currency,
	}, nil
}
```

**Clave en Go:** Al usar receptores de valor y devolver estructuras completas, el compilador de Go puede optimizar estas asignaciones colocándolas en el *Stack* (como veremos en el Capítulo 44), reduciendo la presión sobre el Garbage Collector.

### 2. Entidades (Entities)

A diferencia de los Value Objects, una *Entidad* tiene una **identidad única** que trasciende en el tiempo y a través de sus distintos estados. Una entidad puede mutar (cambiar su estado), pero sigue siendo "la misma" gracias a su identificador.

En Go, modelamos las Entidades utilizando **punteros a structs**. El paso por referencia nos permite modificar el estado de la entidad de forma centralizada.

```go
package domain

import (
	"errors"
	"time"
	"github.com/google/uuid"
)

// User representa una Entidad. 
// Sus atributos mutables están encapsulados.
type User struct {
	id        uuid.UUID // Identidad inmutable
	email     string
	status    string
	updatedAt time.Time
}

// NewUser crea una nueva entidad con una identidad garantizada.
func NewUser(email string) (*User, error) {
	if email == "" {
		return nil, errors.New("el email es requerido")
	}
	
	return &User{
		id:        uuid.New(),
		email:     email,
		status:    "ACTIVE",
		updatedAt: time.Now(),
	}, nil
}

// ID expone la identidad de solo lectura.
func (u *User) ID() uuid.UUID {
	return u.id
}

// Suspend es un comportamiento del dominio que muta la entidad.
// Usamos un receptor de puntero (*User).
func (u *User) Suspend() error {
	if u.status == "SUSPENDED" {
		return errors.New("el usuario ya está suspendido")
	}
	u.status = "SUSPENDED"
	u.updatedAt = time.Now()
	return nil
}

// Equals compara Entidades basándose estrictamente en su ID, no en sus atributos.
func (u *User) Equals(other *User) bool {
	if other == nil {
		return false
	}
	return u.id == other.id
}
```

### 3. Agregados y Raíces de Agregado (Aggregates & Aggregate Roots)

Un *Agregado* es un clúster de Entidades y Value Objects que se tratan como una única unidad transaccional para garantizar la consistencia de los datos. Cada Agregado tiene una **Raíz de Agregado** (Aggregate Root), que es la única Entidad a través de la cual el mundo exterior puede interactuar con el Agregado.

En Go, implementamos esto mediante la composición de structs, donde el struct de la raíz encapsula férreamente a sus componentes internos para proteger los invariantes de negocio.

```go
package domain

import (
	"errors"
	"time"
	"github.com/google/uuid"
)

// OrderLine es una Entidad local dentro del Agregado Order.
// Al no estar exportada (empieza con minúscula), forzamos a que 
// solo el Agregado Order pueda manipularla directamente.
type orderLine struct {
	id        uuid.UUID
	productID uuid.UUID
	price     Money     // Value Object
	quantity  int
}

// Order es nuestra Raíz de Agregado (Aggregate Root).
type Order struct {
	id         uuid.UUID
	customerID uuid.UUID
	items      []orderLine // Composición de entidades locales
	total      Money       // Value Object
	status     string
	createdAt  time.Time
}

// NewOrder inicializa el Agregado en un estado válido.
func NewOrder(customerID uuid.UUID) (*Order, error) {
	zeroMoney, _ := NewMoney(0, "USD")
	return &Order{
		id:         uuid.New(),
		customerID: customerID,
		items:      make([]orderLine, 0),
		total:      zeroMoney,
		status:     "PENDING",
		createdAt:  time.Now(),
	}, nil
}

// AddProduct es la única puerta de entrada para añadir ítems.
// La Raíz de Agregado orquesta la creación de la entidad local y 
// actualiza el estado global del agregado (el total).
func (o *Order) AddProduct(productID uuid.UUID, price Money, quantity int) error {
	if o.status != "PENDING" {
		return errors.New("no se pueden añadir productos a una orden que no está pendiente")
	}
	if quantity <= 0 {
		return errors.New("la cantidad debe ser mayor a cero")
	}

	// Calculamos el subtotal (reglas de Value Objects)
	subtotalAmount := price.amount * int64(quantity)
	subtotal, err := NewMoney(subtotalAmount, price.currency)
	if err != nil {
		return err
	}

	// Añadimos la entidad local
	item := orderLine{
		id:        uuid.New(),
		productID: productID,
		price:     price,
		quantity:  quantity,
	}
	o.items = append(o.items, item)

	// Protegemos el invariante: el total siempre debe reflejar los items sumados
	o.total, _ = o.total.Add(subtotal)
	return nil
}
```

### Reglas de oro al modelar en Go:

1.  **Encapsulación estricta:** Utiliza campos no exportados (minúsculas) en tus structs de dominio para evitar que capas superiores (como los Handlers HTTP o la base de datos) muten el estado rompiendo los invariantes.
2.  **Validación en la creación:** Obliga a instanciar tus Entidades y Value Objects a través de funciones factoría (ej. `NewMoney`, `NewUser`) que devuelvan `(Tipo, error)`. Esto garantiza que un objeto en memoria siempre sea válido.
3.  **Comportamiento sobre datos:** Tus structs no deben ser simples *Data Transfer Objects (DTOs)* con getters y setters anémicos. Incorpora los verbos de negocio como métodos (ej. `Suspend()`, `AddProduct()`).

## 22.2. Implementación de Repositorios y Factorías

Una vez que hemos encapsulado las reglas de negocio en Entidades, Value Objects y Agregados, surgen dos problemas fundamentales: ¿cómo instanciamos estructuras complejas de forma consistente? y ¿cómo guardamos y recuperamos estos Agregados sin acoplar nuestro núcleo de negocio a una base de datos específica?

Aquí es donde entran en juego los patrones de **Factoría (Factory)** y **Repositorio (Repository)**. En Go, la implementación de estos patrones se beneficia enormemente del uso de funciones de primera clase, interfaces implícitas y el manejo explícito de errores.

---

### 1. Factorías: Creación vs. Reconstitución

Como vimos en la sección anterior, en Go no existen los constructores tradicionales. En su lugar, utilizamos funciones idiomáticas con el prefijo `New`. En el contexto de DDD, una Factoría tiene la responsabilidad de ensamblar un Agregado complejo, garantizando que este nazca en un estado válido.

Sin embargo, en aplicaciones reales debemos distinguir entre dos escenarios muy diferentes que a menudo se confunden:

1.  **Creación (Domain Factory):** Ocurre cuando un usuario o sistema solicita la creación de un *nuevo* recurso. La factoría debe generar una nueva identidad (ej. un UUID), establecer valores por defecto (ej. `status = "PENDING"`) y validar las reglas de negocio iniciales.
2.  **Reconstitución (Infrastructure Factory):** Ocurre cuando leemos un registro de la base de datos y necesitamos reconstruir el Agregado en memoria. En este caso, **no** generamos un nuevo ID ni validamos las reglas de creación (porque los datos ya existen y se asumen válidos o históricamente correctos).

Para manejar la **reconstitución** de Agregados con campos no exportados (privados), una técnica avanzada en Go es definir una función de ensamblaje dentro del mismo paquete `domain`, pero diseñada específicamente para ser usada por la capa de infraestructura.

```go
package domain

import (
	"errors"
	"time"
	"github.com/google/uuid"
)

// NewOrder es la Factoría de Creación (Reglas de negocio puras).
func NewOrder(customerID uuid.UUID) (*Order, error) {
    // ... (Implementación vista en la sección 22.1)
}

// UnmarshalOrderFromDB es la Factoría de Reconstitución.
// Permite a la capa de infraestructura (ej. un repositorio SQL) instanciar 
// el Agregado eludiendo las validaciones de creación, pero manteniendo
// la encapsulación de los campos.
func UnmarshalOrderFromDB(
	id uuid.UUID, 
	customerID uuid.UUID, 
	totalAmount int64, 
	currency string, 
	status string, 
	createdAt time.Time,
) (*Order, error) {
	money, err := NewMoney(totalAmount, currency)
	if err != nil {
		return nil, errors.Join(errors.New("datos de moneda corruptos en DB"), err)
	}

	return &Order{
		id:         id,
		customerID: customerID,
		items:      make([]orderLine, 0), // Los items se cargarían en otro método o en esta misma función
		total:      money,
		status:     status,
		createdAt:  createdAt,
	}, nil
}
```

### 2. Repositorios: El Contrato del Dominio

Un **Repositorio** actúa como una colección en memoria de todos los Agregados de un tipo específico. La regla de oro en DDD es: **Solo existe un Repositorio por cada Raíz de Agregado (Aggregate Root)**. No debe haber repositorios para Entidades locales o Value Objects de forma aislada.

Siguiendo los principios de la Arquitectura Hexagonal (Capítulo 21), el Repositorio se define como una `interface` dentro de la capa de Dominio, dictando el contrato que la Infraestructura deberá cumplir.

**Reglas para diseñar interfaces de Repositorios en Go:**
1.  **Siempre inyectar `context.Context`:** Es crucial para propagar cancelaciones, timeouts o trazabilidad desde la capa HTTP/gRPC hasta la base de datos (veremos esto a fondo en el Capítulo 13).
2.  **Devolver Punteros a Agregados:** Para permitir la mutación del estado en memoria tras la recuperación.
3.  **Devolver Errores de Dominio:** Evitar devolver errores específicos de SQL (como `sql.ErrNoRows`). El dominio debe definir sus propios errores semánticos.

```go
package domain

import (
	"context"
	"errors"
	"github.com/google/uuid"
)

// Errores semánticos del dominio
var (
	ErrOrderNotFound      = errors.New("la orden no existe")
	ErrRepositoryInternal = errors.New("error interno del repositorio")
)

// OrderRepository es el Puerto secundario (Outbound Port).
type OrderRepository interface {
	Save(ctx context.Context, order *Order) error
	FindByID(ctx context.Context, id uuid.UUID) (*Order, error)
}
```

### 3. Implementación del Repositorio en la Capa de Infraestructura

La implementación real del contrato vive fuera del dominio, en la capa de infraestructura (o adaptadores). Para ilustrar el concepto sin adelantarnos a las bases de datos SQL (que abordaremos en la Parte 8), implementaremos un Repositorio en memoria. 

Este enfoque es extremadamente útil para la fase de desarrollo y para escribir tests unitarios rápidos y deterministas sin necesidad de *mocks* complejos (Capítulo 17).

```go
package memory

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"tu_proyecto/domain" // Importamos el dominio
)

// orderRepositoryAdapter implementa domain.OrderRepository.
// No se exporta; forzamos el uso de la función constructora.
type orderRepositoryAdapter struct {
	mu    sync.RWMutex // Protege contra Data Races (Capítulo 10)
	store map[uuid.UUID]*domain.Order
}

// NewOrderRepository devuelve la interfaz del dominio, inyectando la implementación.
func NewOrderRepository() domain.OrderRepository {
	return &orderRepositoryAdapter{
		store: make(map[uuid.UUID]*domain.Order),
	}
}

func (r *orderRepositoryAdapter) Save(ctx context.Context, order *domain.Order) error {
	// Verificamos si el contexto ya fue cancelado antes de operar
	if err := ctx.Err(); err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// En un entorno real, aquí se mapearía el struct de Dominio a un DTO de Base de Datos.
	// Al ser en memoria, almacenamos la referencia directamente.
	r.store[order.ID()] = order

	return nil
}

func (r *orderRepositoryAdapter) FindByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	order, exists := r.store[id]
	if !exists {
		// Traducimos la ausencia de datos a un error semántico del dominio
		return nil, domain.ErrOrderNotFound
	}

	return order, nil
}
```

### El Desafío del Mapeo (Domain Models vs Data Models)

Un error común al implementar repositorios en Go es intentar utilizar los structs del Dominio directamente con el paquete `database/sql` o un ORM (como GORM). Dado que en DDD nuestros structs de dominio tienen sus campos **no exportados** (en minúscula) para proteger los invariantes, la mayoría de los drivers de bases de datos no podrán leerlos mediante reflexión (`reflect`).

**La solución idiomática:** El Repositorio debe actuar como un traductor. 
1. Al guardar (`Save`), extrae los datos del Agregado mediante métodos "getters" (o transformándolo internamente) y construye un DTO (*Data Transfer Object*) específico de la base de datos (con campos exportados y etiquetas como `db:"customer_id"`).
2. Al buscar (`FindByID`), recupera el DTO de la base de datos y utiliza la Factoría de Reconstitución (`UnmarshalOrderFromDB`) para devolver un Agregado puro a la capa de aplicación.

Este desacoplamiento intencional añade una pequeña sobrecarga inicial (el mapeo de estructuras), pero garantiza que un cambio en el esquema de la tabla SQL no afecte en absoluto a las reglas de negocio del Dominio.

## 22.3. Manejo de Eventos de Dominio en memoria

A medida que nuestra aplicación crece, la ejecución de un caso de uso suele desencadenar efectos secundarios en otras partes del sistema. Por ejemplo, cuando se crea una orden (`Order`), es posible que necesitemos enviar un correo de confirmación al cliente o actualizar el inventario.

Hacer estas llamadas de forma imperativa desde el Agregado o el servicio de aplicación acopla fuertemente los dominios y rompe el Principio de Responsabilidad Única. La solución táctica de DDD para este problema son los **Eventos de Dominio (Domain Events)**. 

Un Evento de Dominio es un registro de algo que *ya ha ocurrido* en el negocio y que es relevante para los expertos del dominio. Al manejarlos en memoria, logramos desacoplar componentes dentro de un mismo binario (monolito modular) antes de dar el salto a arquitecturas orientadas a eventos distribuidas con Message Brokers (que abordaremos en el Capítulo 34).

---

### 1. Modelado de Eventos en Go

Los eventos se nombran siempre en **pasado** (ej. `OrderCreated`, `ProductAddedToOrder`). En Go, los definimos mediante una interfaz común y `structs` inmutables (Value Objects) que contienen la información relevante de lo sucedido.

```go
package domain

import (
	"time"
	"github.com/google/uuid"
)

// DomainEvent es el contrato base para cualquier evento.
type DomainEvent interface {
	EventName() string
	OccurredOn() time.Time
}

// OrderCreated es un evento concreto. 
// Sus campos se exportan para que los manejadores (handlers) puedan leerlos.
type OrderCreated struct {
	OrderID    uuid.UUID
	CustomerID uuid.UUID
	OccurredAt time.Time
}

func (e OrderCreated) EventName() string {
	return "order.created"
}

func (e OrderCreated) OccurredOn() time.Time {
	return e.OccurredAt
}
```

### 2. Registro de Eventos en la Raíz de Agregado

Los eventos de dominio no deben dispararse directamente desde el núcleo del Agregado hacia un bus externo. Hacerlo allí implicaría inyectar dependencias de infraestructura en el dominio, rompiendo la Arquitectura Limpia. 

En su lugar, el Agregado debe actuar como un **recolector de eventos**. Registra internamente lo que sucede y, posteriormente, la capa de aplicación o infraestructura se encarga de extraer esos eventos y publicarlos.

Ampliemos nuestro Agregado `Order` del apartado 22.1:

```go
package domain

import (
	"github.com/google/uuid"
	"time"
)

type Order struct {
	id         uuid.UUID
	customerID uuid.UUID
	status     string
	// ... otros campos
	
	// events almacena los eventos generados durante la mutación del agregado.
	// No se exporta ni se persiste en la base de datos principal.
	events []DomainEvent 
}

// record encapsula la lógica de añadir un evento a la lista interna.
func (o *Order) record(event DomainEvent) {
	o.events = append(o.events, event)
}

// PullEvents extrae y limpia los eventos del Agregado.
// Se llama *después* de que el repositorio ha guardado los cambios con éxito.
func (o *Order) PullEvents() []DomainEvent {
	events := o.events
	o.events = make([]DomainEvent, 0) // Vaciamos la lista para no emitir duplicados
	return events
}

// NewOrder ahora registra el evento de creación.
func NewOrder(customerID uuid.UUID) (*Order, error) {
	order := &Order{
		id:         uuid.New(),
		customerID: customerID,
		status:     "PENDING",
	}

	// Registramos que algo importante acaba de ocurrir
	order.record(OrderCreated{
		OrderID:    order.id,
		CustomerID: customerID,
		OccurredAt: time.Now(),
	})

	return order, nil
}
```

### 3. Implementación de un Bus de Eventos en Memoria (Event Bus)

Para distribuir estos eventos a otros módulos dentro de la misma aplicación, necesitamos un despachador. En Go, podemos implementar un bus sincrónico o asincrónico. 

Para mantener la consistencia en memoria sin introducir complejidades prematuras de Goroutines y canales (que veremos en la Parte 3), un **bus sincrónico** es un excelente punto de partida. Garantiza que si un *handler* falla, podemos registrar el error inmediatamente.

```go
package memorybus

import (
	"context"
	"fmt"
	"tu_proyecto/domain"
)

// EventHandler define la firma para funciones que reaccionan a eventos.
type EventHandler func(ctx context.Context, event domain.DomainEvent) error

// EventBus maneja el registro y despacho de eventos en memoria.
type EventBus struct {
	handlers map[string][]EventHandler
}

func NewEventBus() *EventBus {
	return &EventBus{
		handlers: make(map[string][]EventHandler),
	}
}

// Subscribe vincula un nombre de evento con una función manejadora.
func (b *EventBus) Subscribe(eventName string, handler EventHandler) {
	b.handlers[eventName] = append(b.handlers[eventName], handler)
}

// Publish despacha un evento a todos sus suscriptores registrados.
func (b *EventBus) Publish(ctx context.Context, event domain.DomainEvent) error {
	handlers, exists := b.handlers[event.EventName()]
	if !exists {
		return nil // Nadie está escuchando este evento, lo cual es válido.
	}

	for _, handler := range handlers {
		// En un enfoque sincrónico, si un handler falla, podemos detener la cadena
		// o registrar el error (logging) y continuar.
		if err := handler(ctx, event); err != nil {
			return fmt.Errorf("error manejando evento %s: %w", event.EventName(), err)
		}
	}
	return nil
}
```

### 4. Orquestación en la Capa de Aplicación (Use Cases)

El verdadero valor de este patrón se materializa en la capa de aplicación (los Casos de Uso). El ciclo de vida estándar al procesar un comando (por ejemplo, mediante una petición HTTP) sigue este flujo:

1. Iniciar transacción (o recuperar de la DB).
2. Ejecutar la lógica de negocio en la Raíz de Agregado.
3. Guardar el Agregado en el Repositorio.
4. **Extraer (`PullEvents`) y publicar los Eventos de Dominio.**

```go
package application

import (
	"context"
	"tu_proyecto/domain"
)

type CreateOrderService struct {
	repo     domain.OrderRepository
	eventBus EventBus // Interfaz que nuestro memorybus.EventBus implementaría
}

func (s *CreateOrderService) Execute(ctx context.Context, customerID string) error {
	// 1. Lógica de negocio
	cid, _ := uuid.Parse(customerID)
	order, err := domain.NewOrder(cid)
	if err != nil {
		return err
	}

	// 2. Persistencia
	if err := s.repo.Save(ctx, order); err != nil {
		return err
	}

	// 3. Extracción y publicación de eventos
	for _, event := range order.PullEvents() {
		// Esto notificará a otros subdominios en memoria 
		// (ej. enviar email, actualizar stock)
		if err := s.eventBus.Publish(ctx, event); err != nil {
			// Nota técnica: Si la DB guardó los datos pero el evento falla, 
			// tenemos un problema de consistencia eventual. 
			// En sistemas críticos, esto se resuelve con el Patrón Outbox.
		}
	}

	return nil
}
```

**Consideración de diseño:** El manejo en memoria es rápido y fácil de implementar, pero tiene una limitación clave: si el servidor se apaga abruptamente justo después del `s.repo.Save` y antes del `s.eventBus.Publish`, los eventos se pierden. Más adelante en el libro exploraremos el **Patrón Outbox**, que guarda los eventos en la misma transacción de base de datos que el Agregado, garantizando una entrega "al menos una vez" (At-Least-Once Delivery).

## 22.4. Mapeo del Lenguaje Ubicuo al código fuente

De todos los conceptos de Domain-Driven Design, el **Lenguaje Ubicuo** (Ubiquitous Language) es el menos técnico y, paradójicamente, el que mayor impacto tiene en la mantenibilidad del software a largo plazo. Consiste en desarrollar un vocabulario estricto y compartido entre los expertos del dominio (negocio) y los desarrolladores, de modo que no exista ambigüedad al hablar sobre el sistema.

El verdadero reto radica en **escribir el código fuente utilizando exactamente ese mismo vocabulario**. Si el negocio dice: *"Cuando un cliente regular acumula mil puntos, asciende a la categoría VIP"*, nuestro código no debería lucir como `user.UpdateRoleID(2)` o `db.Exec("UPDATE users SET rank = 'VIP'...")`. Esa traducción cognitiva entre el lenguaje del negocio y el código anémico (CRUD) es la principal causa de deuda técnica.

Afortunadamente, la simplicidad y ortogonalidad del diseño de Go nos brindan herramientas excelentes para que el código "hable" el lenguaje del dominio.

---

### 1. Obsesión por los Tipos Primitivos (Primitive Obsession)

El primer paso para mapear el lenguaje ubicuo es dejar de usar tipos primitivos (`string`, `int`, `bool`) para representar conceptos ricos del dominio. En Go, la capacidad de definir tipos a partir de primitivas nos permite inyectar semántica directamente en las firmas de nuestras funciones.

Imaginemos un sistema de reservas de vuelos.

**El enfoque anémico (Malo):**
```go
// ¿Qué es string? ¿Un asiento? ¿Un código de vuelo? ¿Un ID de usuario?
func ReserveSeat(flight string, seat string, passenger string) error { ... }
```

**El enfoque del Lenguaje Ubicuo en Go (Bueno):**
```go
package booking

// Definimos conceptos del dominio basados en primitivas subyacentes
type FlightNumber string
type SeatAssignment string
type PassengerID string

// La firma ahora documenta exactamente qué espera el dominio
func ReserveSeat(flight FlightNumber, seat SeatAssignment, passenger PassengerID) error { ... }
```

Al hacer esto, el compilador de Go se convierte en un validador de nuestras reglas de negocio, impidiendo que pasemos accidentalmente un `PassengerID` donde se esperaba un `FlightNumber`, algo que un simple `string` permitiría sin rechistar.

### 2. Nomenclatura de Paquetes orientada a Contextos Delimitados

En Go, los nombres de los paquetes tienen un peso enorme. Un error común al adoptar DDD o Arquitectura Limpia es agrupar por conceptos técnicos. Nombres de paquetes como `models`, `utils`, `helpers`, `services` o `types` **no significan nada para el negocio** y deben evitarse a toda costa.

Los paquetes en la capa de dominio deben representar **Contextos Delimitados** (Bounded Contexts) o subdominios específicos.

* **Evitar:** `package models` -> `models.User`, `models.Invoice`
* **Preferir:** `package identity` -> `identity.User` y `package billing` -> `billing.Invoice`

Cuando importamos y usamos estos paquetes, el código se lee de forma natural de izquierda a derecha: `billing.IssueInvoice()`, lo cual tiene un sentido semántico completo.

### 3. Métodos que Revelan la Intención (Intention-Revealing Interfaces)

Los Agregados y las Entidades no deben ser simples estructuras de datos que exponen setters y getters genéricos. El Lenguaje Ubicuo dicta que debemos exponer los **comportamientos** del negocio. Cada método debe representar una acción clara y específica.

Veamos la evolución de un Agregado `Subscription`:

**Traducción CRUD (Pobre en dominio):**
```go
type Subscription struct {
	status string // "ACTIVE", "CANCELED", "PAUSED"
}

// SetStatus es genérico. No explica el "por qué" de la acción.
func (s *Subscription) SetStatus(newStatus string) {
	s.status = newStatus
}
```

**Mapeo del Lenguaje Ubicuo (Rico en dominio):**
```go
type Subscription struct {
	status string
}

// Los métodos ahora representan casos de uso reales descritos por el negocio.
func (s *Subscription) PauseForVacation() error {
	if s.status != "ACTIVE" {
		return errors.New("solo las suscripciones activas pueden pausarse")
	}
	s.status = "PAUSED"
	return nil
}

func (s *Subscription) CancelDueToNonPayment() {
	s.status = "CANCELED"
	// Aquí podríamos añadir lógica extra, como registrar un Domain Event
}
```

### 4. Errores como parte del Dominio

Finalmente, el robusto (y explícito) manejo de errores de Go, que a menudo es criticado por desarrolladores provenientes de lenguajes con excepciones, es en realidad un superpoder para DDD. 

Los errores no son simples fallos técnicos; son **resultados de negocio alternativos**. Por lo tanto, deben ser nombrados y definidos como parte del Lenguaje Ubicuo, normalmente utilizando `errors.New` o tipos de error personalizados, como vimos en capítulos anteriores.

```go
package billing

import "errors"

// El negocio entiende perfectamente estos conceptos. No son "NullPointer" o "500 Internal".
var (
	ErrCreditCardExpired = errors.New("la tarjeta de crédito ha expirado")
	ErrInsufficientFunds = errors.New("fondos insuficientes en la cuenta del cliente")
	ErrFraudDetected     = errors.New("transacción rechazada por el sistema antifraude")
)
```

Al exponer estos errores sentinela, la capa de aplicación puede tomar decisiones de flujo (usando `errors.Is` o `errors.As`) y reaccionar de manera inteligente, traduciendo finalmente esto a códigos de estado HTTP concretos en la capa de infraestructura.

