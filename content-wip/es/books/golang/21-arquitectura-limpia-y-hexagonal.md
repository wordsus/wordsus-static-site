En el desarrollo de software moderno, la capacidad de cambiar es tan vital como la de funcionar. Este capítulo explora cómo trascender el código puramente funcional para construir sistemas **resilientes y mantenibles**. En Go, la Arquitectura Hexagonal no es una capa de complejidad innecesaria, sino una aplicación natural de sus interfaces. Aprenderemos a trazar fronteras infranqueables entre las reglas de negocio y los detalles volátiles de infraestructura (bases de datos, APIs o frameworks). Al desacoplar el núcleo de la aplicación del mundo exterior, garantizamos que nuestro dominio sea testable, agnóstico a la tecnología y, sobre todo, fácil de evolucionar frente a la incertidumbre.

## 21.1. Principio de separación de responsabilidades

En el capítulo anterior (sección 20.1), exploramos el Principio de Responsabilidad Única (SRP) desde la perspectiva de los principios SOLID, aplicándolo al diseño de funciones, estructuras y paquetes a nivel microscópico. Al adentrarnos en la Arquitectura Limpia y Hexagonal, debemos elevar este concepto a un nivel macroscópico: **la separación arquitectónica de responsabilidades (Separation of Concerns - SoC)**.

En el contexto arquitectónico, este principio dicta que una aplicación debe dividirse en secciones distintas, donde cada sección aborda una preocupación (concern) separada y específica. En Go, debido a la simplicidad de su sintaxis y a la potencia de su Standard Library, es peligrosamente fácil caer en el antipatrón de mezclar lógica de infraestructura con reglas de negocio.

Para construir sistemas escalables y verdaderamente testables, debemos trazar límites estrictos entre tres áreas fundamentales:
1.  **Capa de Transporte / Entrega:** Cómo interactúa el mundo exterior con nuestra aplicación (HTTP, gRPC, CLI, colas de mensajes).
2.  **Lógica de Negocio / Dominio:** El núcleo de la aplicación; las reglas que definen qué hace el software, independientemente de cómo se expone o dónde se guardan los datos.
3.  **Capa de Persistencia / Infraestructura:** Cómo y dónde se almacenan los datos (Bases de datos relacionales, NoSQL, APIs de terceros, sistema de archivos).

### El antipatrón del "Handler Todoterreno"

Para ilustrar el problema, observemos un enfoque común pero deficiente donde la capa de transporte (`net/http`) asume responsabilidades de validación, lógica de negocio y persistencia (`database/sql`):

```go
package badarch

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

// CreateUserHandler viola la separación de responsabilidades.
// Es frágil, difícil de testear aisladamente y altamente acoplado.
func CreateUserHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Lógica de negocio intrincada con el handler
		if req.Email == "" {
			http.Error(w, "email is required", http.StatusBadRequest)
			return
		}

		// Capa de persistencia acoplada al handler HTTP
		_, err := db.ExecContext(r.Context(), "INSERT INTO users (email) VALUES ($1)", req.Email)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
	}
}
```

Este código es un monolito funcional. Si mañana decidimos exponer la creación de usuarios a través de gRPC (Capítulo 33) o procesando un evento de Apache Kafka (Capítulo 34), tendríamos que duplicar la validación y la inserción SQL. Además, testear este handler requiere levantar una base de datos real o utilizar complejas librerías de *mocking* sobre la conexión SQL.

### Aplicando la Separación Arquitectónica en Go

Para aplicar el principio correctamente, utilizamos las interfaces implícitas de Go (que vimos en el Capítulo 7) como fronteras arquitectónicas. Nuestro objetivo es que la lógica de negocio no sepa *nada* sobre HTTP ni sobre SQL.

Refactoricemos el ejemplo aislando las responsabilidades:

```go
package goodarch

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
)

// 1. DOMINIO / LÓGICA DE NEGOCIO
// No sabe de HTTP ni de SQL. Solo define las reglas.
type User struct {
	Email string
}

type UserRepository interface {
	Save(ctx context.Context, u User) error
}

type UserService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) RegisterUser(ctx context.Context, email string) error {
	if email == "" {
		return errors.New("email is required") // Regla de negocio
	}
	user := User{Email: email}
	return s.repo.Save(ctx, user)
}

// 2. CAPA DE TRANSPORTE (HTTP)
// Solo se encarga de serializar/deserializar e invocar al servicio.
type UserHandler struct {
	svc *UserService
}

func NewUserHandler(svc *UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := h.svc.RegisterUser(r.Context(), req.Email)
	if err != nil {
		// Aquí mapearíamos errores de negocio a códigos HTTP
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
```

### Beneficios de este diseño en Go

1.  **Testabilidad Ortogonal:** Ahora puedes probar `UserService` inyectando un *mock* de `UserRepository` (como cubrimos en la sección 17.2), verificando la lógica de negocio sin latencia ni dependencias externas. El handler HTTP se puede probar aislando la lógica mediante un *mock* del servicio.
2.  **Agnosticismo del framework:** Si decides migrar de `net/http` estándar a un router de alto rendimiento como Chi o Fiber (sección 25.2), el impacto es cero en la carpeta de tu dominio. El `UserService` permanece intacto.
3.  **Localización de dependencias:** La base de datos desaparece de la vista del controlador. Podrías cambiar tu implementación en SQL por una en MongoDB (Capítulo 31) simplemente inyectando una estructura diferente que satisfaga `UserRepository`.

Este aislamiento fundamental es el cimiento sobre el cual se construyen los Puertos y Adaptadores, patrón que formaliza estas fronteras y que analizaremos en la siguiente sección.

## 21.2. Puertos y Adaptadores (Ports and Adapters)

Habiendo establecido la necesidad de separar responsabilidades en la sección 21.1, es momento de formalizar cómo se comunican estas capas separadas. La Arquitectura Hexagonal, concebida por Alistair Cockburn e intrínsecamente ligada al patrón de **Puertos y Adaptadores**, nos proporciona un modelo mental y estructural para lograr un desacoplamiento absoluto entre nuestro núcleo de negocio y el mundo exterior.

El objetivo principal de este patrón es permitir que una aplicación sea impulsada indistintamente por usuarios, programas, pruebas automatizadas o scripts por lotes, y que pueda ser desarrollada y probada en completo aislamiento de sus bases de datos y servicios en tiempo de ejecución. 

En este modelo, el "mundo exterior" (bases de datos, frameworks web, colas de mensajes) interactúa con el núcleo de la aplicación exclusivamente a través de **Puertos** y **Adaptadores**. En Go, este patrón encaja de manera excepcionalmente natural gracias a su sistema de tipos y, en particular, a las interfaces implícitas (sección 7.2).

### Puertos: Los Contratos del Dominio

Un **Puerto** es el punto de entrada o salida del núcleo de la aplicación. Es una especificación geométrica abstracta; define *qué* se puede hacer o *qué* necesita la aplicación, sin importar *cómo* se implemente. En Go, **los puertos son siempre interfaces (`interface`)**.

Existen dos tipos de puertos:

1.  **Puertos Primarios (Driving Ports / Inbound):** Definen los casos de uso que el mundo exterior puede invocar sobre la aplicación. Suelen ser interfaces que nuestro núcleo implementa (los servicios de dominio).
2.  **Puertos Secundarios (Driven Ports / Outbound):** Definen los contratos que la aplicación necesita que el mundo exterior cumpla para poder funcionar (ej. almacenamiento de datos, envío de notificaciones). El núcleo *define* estas interfaces, pero no las implementa.

### Adaptadores: La Conexión con la Realidad

Un **Adaptador** es un componente de software específico de una tecnología que convierte la comunicación entre el mundo exterior y un Puerto. Los adaptadores son intercambiables. En Go, **los adaptadores son estructuras (`struct`)** que implementan la interfaz de un puerto secundario, o que invocan los métodos de un puerto primario.

1.  **Adaptadores Primarios (Driving Adapters):** Invocan a los puertos primarios. Ejemplos: Un Handler HTTP (Capítulo 24), un servidor gRPC (Capítulo 33) o un comando CLI.
2.  **Adaptadores Secundarios (Driven Adapters):** Implementan los puertos secundarios. Ejemplos: Un repositorio SQL (Capítulo 28), un cliente de la API de Stripe o un publicador de RabbitMQ (Capítulo 34).

### Implementación idiomática en Go

Veamos cómo se traduce esto a código real, estructurando nuestro proyecto de manera que las reglas de dependencia siempre apunten hacia adentro (hacia el dominio).

**1. El Puerto Secundario (Definido por el Dominio):**
El núcleo define lo que necesita mediante una interfaz. No sabe de bases de datos.

```go
package domain

import "context"

// Entidad de negocio
type Order struct {
	ID     string
	Amount float64
	Status string
}

// OrderRepository es un PUERTO SECUNDARIO (Outbound Port).
// Define el contrato que la infraestructura debe cumplir.
type OrderRepository interface {
	Save(ctx context.Context, order Order) error
	FindByID(ctx context.Context, id string) (Order, error)
}
```

**2. El Adaptador Secundario (Implementado por la Infraestructura):**
Este código vive "fuera" del dominio. Conoce los detalles de SQL e implementa la interfaz del puerto.

```go
package postgres

import (
	"context"
	"database/sql"
	"myapp/domain" // Importa el dominio para conocer los tipos y el puerto
)

// PostgresOrderRepository es un ADAPTADOR SECUNDARIO.
type PostgresOrderRepository struct {
	db *sql.DB
}

func NewPostgresOrderRepository(db *sql.DB) *PostgresOrderRepository {
	return &PostgresOrderRepository{db: db}
}

// Save satisface implícitamente la interfaz domain.OrderRepository
func (r *PostgresOrderRepository) Save(ctx context.Context, order domain.Order) error {
	query := "INSERT INTO orders (id, amount, status) VALUES ($1, $2, $3)"
	_, err := r.db.ExecContext(ctx, query, order.ID, order.Amount, order.Status)
	return err
}

func (r *PostgresOrderRepository) FindByID(ctx context.Context, id string) (domain.Order, error) {
	// ... implementación de lectura SQL (sección 28.4) ...
	return domain.Order{}, nil
}
```

**3. El Puerto Primario y el Servicio de Aplicación:**
El caso de uso que orquesta el flujo, recibiendo el puerto secundario mediante Inyección de Dependencias.

```go
package application

import (
	"context"
	"myapp/domain"
)

// OrderService actúa como la implementación del PUERTO PRIMARIO.
type OrderService struct {
	repo domain.OrderRepository // Dependemos de la abstracción, no de la implementación
}

func NewOrderService(repo domain.OrderRepository) *OrderService {
	return &OrderService{repo: repo}
}

func (s *OrderService) CreateOrder(ctx context.Context, id string, amount float64) error {
	order := domain.Order{
		ID:     id,
		Amount: amount,
		Status: "PENDING",
	}
	// Usamos el puerto secundario sin saber si es Postgres, Mongo o un Mock
	return s.repo.Save(ctx, order) 
}
```

### Por qué este patrón brilla en Go

La característica del *Duck Typing* (tipado estructural) de Go hace que el patrón de Puertos y Adaptadores sea extremadamente limpio. A diferencia de lenguajes como Java o C#, en Go el adaptador (como `PostgresOrderRepository`) **no necesita declarar explícitamente** que implementa `domain.OrderRepository`. Simplemente debe tener los métodos correctos.

Esto significa que nuestro paquete de infraestructura (`postgres`) no está rígidamente acoplado por el compilador mediante palabras clave como `implements`. 

A nivel de testing (Parte 5 del libro), este patrón es el habilitador principal de los Mocks y Fakes (Capítulo 17). Al depender exclusivamente de puertos, generar un `MockOrderRepository` para realizar pruebas unitarias sobre el `OrderService` se convierte en un proceso trivial y ultra-rápido, libre de I/O de red o disco.

## 21.3. Estructuración de capas: Dominio, Aplicación e Infraestructura

Comprender la teoría de los Puertos y Adaptadores (sección 21.2) es el primer paso; el desafío práctico radica en mapear esos conceptos abstractos a la organización física de paquetes en Go. A diferencia de frameworks dogmáticos en otros lenguajes (como Spring en Java o NestJS en TypeScript), Go no impone una estructura de directorios. Sin embargo, la comunidad ha convergido en patrones que combinan el *Standard Go Project Layout* (revisado en el Capítulo 1) con los principios de la Arquitectura Limpia.

El objetivo de esta estructuración es materializar la **Regla de Dependencia**: el código fuente de las capas internas no debe tener conocimiento del código fuente de las capas externas. Las dependencias siempre apuntan hacia adentro.

Para garantizar esta encapsulación en Go, utilizamos estratégicamente el directorio `internal/`, el cual impide que otros repositorios importen nuestra lógica central, protegiendo nuestro diseño arquitectónico.

### Anatomía de un proyecto estructurado por capas

A continuación, se presenta un árbol de directorios idiomático para un microservicio o aplicación robusta en Go, reflejando la separación estricta de las tres capas principales:

```text
my-go-service/
├── cmd/
│   └── api/
│       └── main.go                  # Punto de entrada. Ensambla y ejecuta (Inyección de dependencias)
├── internal/
│   ├── domain/                      # 1. CAPA DE DOMINIO (El Núcleo)
│   │   ├── user.go                  # Entidades y Value Objects
│   │   ├── repository.go            # Puertos Secundarios (Interfaces)
│   │   └── errors.go                # Errores de dominio tipados
│   │
│   ├── application/                 # 2. CAPA DE APLICACIÓN (Casos de Uso)
│   │   ├── user_service.go          # Lógica de orquestación (Puertos Primarios)
│   │   └── user_service_test.go     # Tests unitarios rápidos usando Mocks
│   │
│   └── infrastructure/              # 3. CAPA DE INFRAESTRUCTURA (Adaptadores)
│       ├── http/                    # Adaptadores Primarios (Driving)
│       │   ├── handler.go           # Controladores REST/JSON
│       │   └── router.go            # Configuración de rutas y Middlewares
│       │
│       ├── postgres/                # Adaptadores Secundarios (Driven)
│       │   ├── user_repository.go   # Implementación SQL de domain.UserRepository
│       │   └── user_repository_test.go # Tests de integración con Testcontainers
│       │
│       └── config/                  # Lectura de variables de entorno, Viper, etc.
├── pkg/                             # Código genérico exportable (opcional)
├── go.mod
└── go.sum
```

Analicemos las responsabilidades y restricciones de cada capa:

### 1. La Capa de Dominio (`internal/domain`)

Es el corazón de la aplicación y la capa más aislada. Contiene las reglas de negocio empresariales (Entidades) y las abstracciones fundamentales (Interfaces de repositorios o servicios externos).

* **Restricción absoluta:** No puede importar **ningún** paquete local fuera de sí misma (ni `application`, ni `infrastructure`). Solo depende de la Standard Library (como `context`, `errors`, `time`).
* **Contenido:** Tipos primitivos, *Structs* que representan conceptos de negocio puros, constructores de entidades y validaciones de estado invariantes.
* **En Go:** Aquí es donde defines tus `interface{}` para que las capas externas las implementen (los Puertos).

### 2. La Capa de Aplicación (`internal/application`)

Esta capa define los *Casos de Uso* del sistema. Orquesta el flujo de datos: recibe órdenes del exterior, utiliza las entidades del dominio para aplicar reglas de negocio, y ordena a la infraestructura que guarde o transmita los resultados.

* **Restricción de dependencias:** Solo puede importar la capa de `domain` y paquetes de la Standard Library. **Jamás** debe importar `infrastructure` (nada de `database/sql`, `net/http` o `github.com/gin-gonic/gin`).
* **Contenido:** Servicios (*Services*), Manejadores de Comandos/Consultas (CQRS) y lógica transaccional orquestada.
* **En Go:** Los servicios en esta capa se inyectan con las interfaces definidas en el `domain`. Esta capa actúa como el Puerto Primario (o lo implementa), exponiendo métodos que la infraestructura invocará.

### 3. La Capa de Infraestructura (`internal/infrastructure`)

Es el límite exterior del sistema. Aquí es donde el software interactúa con la "suciedad" del mundo real: la red, el disco duro, las bases de datos y las APIs de terceros. Es la capa más volátil y propensa a cambios tecnológicos.

* **Libertad de dependencias:** Puede importar tanto `application` como `domain`. También es el único lugar donde se permite importar librerías de terceros (drivers de DB, frameworks web, clientes de AWS).
* **Contenido:** Controladores HTTP, consumidores de RabbitMQ, implementaciones de repositorios SQL/NoSQL, clientes gRPC.
* **En Go:** Aquí residen los *Structs* que actúan como Adaptadores. Por ejemplo, un `UserHandler` que convierte un *Request* HTTP en una llamada al `UserService` de la capa de aplicación, o un `PostgresUserRepository` que convierte un *Struct* del dominio en una sentencia `INSERT`.

> **Nota arquitectónica sobre el paquete `cmd/`:**
> El archivo `main.go` dentro de `cmd/api/` no es formalmente una capa, sino el **Compositor (o Root Component)**. Su única responsabilidad es iniciar el programa, instanciar las dependencias de Infraestructura (ej. conectar a la base de datos), instanciar los repositorios, pasarlos a los servicios de Aplicación y, finalmente, arrancar los servidores (HTTP/gRPC). Este es el lugar exacto donde se cablean los Adaptadores con los Puertos.

Al mantener estas carpetas estrictamente separadas y vigilar los `import` en la cabecera de tus archivos Go, garantizas que un cambio en la estructura de tu tabla SQL nunca requerirá modificar la lógica de orquestación ni las reglas de tu negocio.

## 21.4. Inversión de dependencias en la práctica

A lo largo de este capítulo, hemos diseñado fronteras arquitectónicas (21.1), definido contratos mediante Puertos y Adaptadores (21.2) y organizado nuestro código en capas estrictas (21.3). Sin embargo, toda esta estructura teórica colapsa si no aplicamos correctamente el principio fundamental que la hace funcionar: **la Inversión de Dependencias (Dependency Inversion Principle - DIP)**.

Como recordatorio del Capítulo 20, el DIP establece que los módulos de alto nivel (nuestro Dominio y Aplicación) no deben depender de los módulos de bajo nivel (nuestra Infraestructura). Ambos deben depender de abstracciones (Interfaces). 

En la práctica, esto significa que nuestra lógica de negocio se compila sin tener la más mínima idea de qué base de datos se utilizará. Entonces, ¿dónde y cómo se conectan las piezas reales? La respuesta reside en el patrón **Composition Root** (Raíz de Composición).

### El Composition Root en Go (`main.go`)

En Go, el Composition Root es casi exclusivamente la función `main()` (ubicada típicamente en `cmd/api/main.go`). Es el único lugar de toda la aplicación al que se le permite ser "sucio"; es decir, es el único punto que tiene permiso explícito para importar e instanciar todas las capas simultáneamente.

Su responsabilidad es secuencial y vital:
1.  **Inicializar la infraestructura base:** Leer configuración, abrir conexiones a bases de datos, arrancar clientes de caché.
2.  **Instanciar los Adaptadores Secundarios:** Crear los repositorios concretos pasándoles la infraestructura base.
3.  **Instanciar los Casos de Uso (Aplicación):** Crear los servicios inyectándoles los repositorios (cumpliendo así los contratos del dominio).
4.  **Instanciar los Adaptadores Primarios:** Crear los controladores (handlers) HTTP o gRPC inyectándoles los servicios de aplicación.
5.  **Exponer la aplicación:** Configurar el enrutador y arrancar el servidor.

### Ensamblando el rompecabezas: Código de ejemplo

Veamos cómo se materializa esta inyección de dependencias manual (la cual compararemos con frameworks de DI en la sección 20.4, aunque en Go el enfoque manual es el más idiomático).

```go
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq" // Driver de Postgres (Infraestructura pura)

	"myapp/internal/application"
	"myapp/internal/infrastructure/postgres"
	transport "myapp/internal/infrastructure/http"
)

func main() {
	// 1. Inicializar infraestructura base
	dbDSN := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", dbDSN)
	if err != nil {
		log.Fatalf("Error conectando a la base de datos: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("La base de datos no responde: %v", err)
	}

	// 2. Instanciar Adaptadores Secundarios (Infraestructura -> Dominio)
	// userRepository implementa implícitamente domain.UserRepository
	userRepository := postgres.NewPostgresUserRepository(db)

	// 3. Instanciar Casos de Uso (Aplicación)
	// Inyectamos la dependencia. Aquí ocurre la INVERSIÓN: 
	// UserService espera una interfaz, nosotros le pasamos la implementación concreta.
	userService := application.NewUserService(userRepository)

	// 4. Instanciar Adaptadores Primarios (Transporte -> Aplicación)
	userHandler := transport.NewUserHandler(userService)

	// 5. Configurar Enrutador y Servidor
	mux := http.NewServeMux()
	
	// Mapeamos la ruta HTTP al método del Handler
	mux.HandleFunc("POST /users", userHandler.Create)

	log.Println("Servidor escuchando en :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("Error en el servidor: %v", err)
	}
}
```

### ¿Por qué Inyección Manual en lugar de Frameworks "Mágicos"?

Si vienes de ecosistemas como Java (Spring) o C# (.NET), es probable que extrañes los contenedores de Inyección de Dependencias (DI Containers) que resuelven este grafo automáticamente con decoradores o reflexión. 

En Go, aunque existen herramientas como `google/wire` (inyección en tiempo de compilación) o `uber-go/dig` (inyección basada en reflexión), **la inyección manual en el `main.go` es el estándar de la industria para el 90% de los proyectos**. Las razones son profundamente congruentes con la filosofía de Go:

* **Seguridad en tiempo de compilación:** Si olvidas inyectar una dependencia o el tipo no coincide, el compilador fallará inmediatamente. No hay sorpresas en tiempo de ejecución.
* **Trazabilidad cristalina:** Si necesitas saber qué implementación exacta de base de datos está usando un servicio, solo tienes que leer el `main.go` de arriba hacia abajo. No hay "magia" oculta en anotaciones o archivos XML.
* **Simplicidad extrema:** El código de ensamblaje es código Go regular y aburrido. No hay curva de aprendizaje de frameworks de terceros.

Al dominar la separación de responsabilidades, los Puertos y Adaptadores, la estructuración de capas y, finalmente, la inyección de dependencias en el Composition Root, habrás construido una base arquitectónica a prueba de balas. Tu código será altamente testable (Parte 5 del libro) y estará preparado para evolucionar sin que los cambios en la infraestructura paralicen el desarrollo de tus reglas de negocio.
