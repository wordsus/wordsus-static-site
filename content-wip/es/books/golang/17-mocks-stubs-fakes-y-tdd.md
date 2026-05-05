En el ecosistema de Go, la robustez del código no solo se mide por su rendimiento, sino por la facilidad con la que puede ser validado. Este capítulo profundiza en la transición del testing básico hacia estrategias avanzadas de desacoplamiento. Exploraremos cómo la **Inyección de Dependencias** transforma componentes rígidos en piezas testables mediante el uso de interfaces. Aprenderás a diferenciar y construir manualmente **Stubs** y **Mocks**, permitiéndote simular comportamientos externos con precisión. Finalmente, analizaremos herramientas clave como **Mockery** y el enfoque **BDD con Ginkgo**, integrando estas técnicas bajo la filosofía del Desarrollo Guiado por Pruebas (TDD).

## 17.1. Inyección de dependencias enfocada al Testing

En lenguajes dinámicos, es común recurrir al *monkey patching* o a librerías mágicas que interceptan llamadas en tiempo de ejecución para simular comportamientos durante las pruebas. El tipado estático y el diseño de Go no permiten (ni fomentan) estas prácticas. En su lugar, Go exige que la testabilidad sea una característica arquitectónica de tu código, y la herramienta principal para lograrlo es la **Inyección de Dependencias (DI)** combinada con las interfaces implícitas que vimos en el Capítulo 7.

La regla de oro para escribir código testeable en Go es simple: **acepta interfaces, retorna estructuras (structs)**. Si una función o método instancia sus propias dependencias internas (como un cliente HTTP, una conexión a base de datos o un servicio de terceros), se vuelve rígidamente acoplada a ellas, haciendo que las pruebas unitarias puras sean imposibles sin afectar sistemas externos.

### El problema del acoplamiento rígido

Imagina un servicio que procesa pagos. Si instanciamos el cliente directamente dentro del servicio, el código en producción funcionará, pero probarlo requerirá una conexión real a la pasarela de pagos.

```go
package payment

import (
	"fmt"
	"net/http"
)

type StripeGateway struct {
	Client *http.Client
}

func (s *StripeGateway) Charge(amount float64) error {
	// Lógica real de cobro contra la API de Stripe
	return nil
}

type OrderService struct {
	// Acoplamiento fuerte: el servicio depende de una implementación concreta
	gateway *StripeGateway 
}

func NewOrderService() *OrderService {
	return &OrderService{
		gateway: &StripeGateway{Client: http.DefaultClient},
	}
}

func (o *OrderService) Checkout(amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("cantidad inválida")
	}
	return o.gateway.Charge(amount)
}
```

Escribir un test unitario para `Checkout` en este escenario es problemático. Cada vez que ejecutemos `go test`, el código intentará conectarse a la API real, volviendo la prueba lenta, frágil e inestable (flaky).

### Resolviendo el problema mediante Inyección de Dependencias

Para solucionar esto, aplicamos Inyección de Dependencias. Extraemos el comportamiento requerido a una interfaz y modificamos el constructor de nuestro servicio para que reciba dicha dependencia desde el exterior. 

```go
package payment

import "fmt"

// 1. Definimos el contrato (Interfaz)
type Gateway interface {
	Charge(amount float64) error
}

type OrderService struct {
	// 2. Dependemos de la abstracción, no de la implementación
	gateway Gateway 
}

// 3. Inyectamos la dependencia a través del constructor
func NewOrderService(g Gateway) *OrderService {
	return &OrderService{
		gateway: g,
	}
}

func (o *OrderService) Checkout(amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("cantidad inválida")
	}
	return o.gateway.Charge(amount)
}
```

Al aplicar este patrón, `OrderService` ya no sabe ni le importa si el `Gateway` se comunica con Stripe, PayPal, o si es un simple *dummy* de prueba. Su única responsabilidad es orquestar la lógica de la orden y delegar el cobro.

### Explotando la DI en nuestros archivos `_test.go`

Gracias a la inyección de dependencias, podemos aislar completamente `OrderService` durante nuestros tests unitarios. Solo necesitamos crear un tipo anónimo o un struct específico para pruebas que satisfaga la interfaz `Gateway`.

```go
package payment_test

import (
	"errors"
	"testing"
	"miproyecto/payment" // Asumiendo el módulo de tu proyecto
)

// mockGateway es nuestra implementación controlada para testing
type mockGateway struct {
	mockCharge func(amount float64) error
}

// Satisfacemos la interfaz payment.Gateway
func (m *mockGateway) Charge(amount float64) error {
	return m.mockCharge(amount)
}

func TestOrderService_Checkout(t *testing.T) {
	tests := []struct {
		name          string
		amount        float64
		mockBehavior  func(amount float64) error
		expectedError bool
	}{
		{
			name:   "Pago exitoso",
			amount: 100.50,
			mockBehavior: func(amount float64) error {
				return nil // Simulamos que la pasarela responde OK
			},
			expectedError: false,
		},
		{
			name:   "Fallo en la pasarela",
			amount: 50.00,
			mockBehavior: func(amount float64) error {
				return errors.New("timeout de red") // Simulamos un error externo
			},
			expectedError: true,
		},
		{
			name:   "Cantidad inválida rechazada antes del cobro",
			amount: -10.00,
			mockBehavior: func(amount float64) error {
				t.Fatal("El Gateway no debió ser invocado con una cantidad negativa")
				return nil
			},
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Preparamos nuestro mock con el comportamiento deseado para este caso
			mock := &mockGateway{
				mockCharge: tt.mockBehavior,
			}

			// Inyectamos el mock en el servicio
			svc := payment.NewOrderService(mock)

			// Ejecutamos la función a probar
			err := svc.Checkout(tt.amount)

			if (err != nil) != tt.expectedError {
				t.Fatalf("Error esperado: %v, se obtuvo: %v", tt.expectedError, err)
			}
		})
	}
}
```

En este ejemplo, la inyección de dependencias nos ha permitido:
1. **Controlar el entorno:** Forzamos errores de red simulados sin necesidad de configurar *timeouts* o desconectar la conexión a internet.
2. **Validar flujos internos:** Comprobamos que el servicio intercepta correctamente las cantidades negativas *antes* de intentar contactar a la pasarela externa.
3. **Mantener la velocidad:** Las pruebas se ejecutan en milisegundos utilizando exclusivamente la memoria local.

Este enfoque de inyección manual a través de constructores (`NewX`) es la forma más idiomática en Go y será la base anatómica sobre la cual construiremos o generaremos sistemáticamente Mocks, Stubs y Fakes en la siguiente sección.

## 17.2. Creación manual de Mocks y Stubs utilizando Interfaces

Una vez que hemos desacoplado nuestro código mediante la inyección de dependencias (como vimos en la sección anterior), el siguiente paso natural es construir los "dobles de prueba" (*Test Doubles*) que inyectaremos durante la ejecución de nuestros tests. 

En la comunidad de ingeniería de software, términos como *Mock*, *Stub* o *Fake* suelen usarse indistintamente, pero representan conceptos y estrategias de validación diferentes. En Go, gracias a la simplicidad de sus interfaces implícitas, crear estos dobles manualmente no solo es viable, sino que a menudo es la práctica recomendada antes de introducir herramientas externas.

### Diferencia fundamental: Stubs vs. Mocks

Para enfocar correctamente nuestras pruebas, debemos distinguir qué rol cumple nuestro doble:

* **Stub:** Proporciona respuestas predefinidas a las llamadas realizadas durante el test. Su objetivo no es verificar *cómo* se le llamó, sino proveer datos al sistema bajo prueba para que este pueda continuar su flujo. Se usan habitualmente para simular lecturas (ej. consultar una base de datos).
* **Mock:** Registra las interacciones que recibe. Su objetivo es permitirnos verificar *comportamientos*: cuántas veces fue llamado un método, con qué argumentos y en qué orden. Se usan habitualmente para simular escrituras o comandos (ej. enviar un correo electrónico).

### Implementando un Stub paso a paso

Imagina que estamos probando un servicio que calcula descuentos para usuarios premium. Este servicio necesita consultar un repositorio para obtener los datos del usuario.

```go
package discount

// 1. La interfaz que nuestro servicio necesita
type UserRepository interface {
	GetByID(id string) (*User, error)
}

type User struct {
	ID      string
	IsPremium bool
}

type DiscountService struct {
	repo UserRepository
}

func (s *DiscountService) Calculate(userID string, amount float64) (float64, error) {
	user, err := s.repo.GetByID(userID)
	if err != nil {
		return 0, err
	}
	
	if user.IsPremium {
		return amount * 0.80, nil // 20% de descuento
	}
	return amount, nil
}
```

Para probar `DiscountService`, no necesitamos una base de datos real. Crearemos un **Stub** que devuelva exactamente lo que el test necesita en cada escenario.

```go
package discount_test

import (
	"errors"
	"testing"
	"miproyecto/discount"
)

// StubUserRepository es nuestro Stub manual
type StubUserRepository struct {
	// Campos para configurar la respuesta deseada
	UserToReturn *discount.User
	ErrToReturn  error
}

// Satisfacemos la interfaz
func (s *StubUserRepository) GetByID(id string) (*discount.User, error) {
	return s.UserToReturn, s.ErrToReturn
}

func TestDiscountService_Calculate(t *testing.T) {
	// Configuramos el Stub para simular un usuario premium
	stubRepo := &StubUserRepository{
		UserToReturn: &discount.User{ID: "123", IsPremium: true},
		ErrToReturn:  nil,
	}

	svc := discount.DiscountService{Repo: stubRepo} // Inyección
	
	finalAmount, err := svc.Calculate("123", 100.0)
	
	if err != nil {
		t.Fatalf("No se esperaba error, se obtuvo: %v", err)
	}
	if finalAmount != 80.0 {
		t.Errorf("Se esperaba 80.0, se obtuvo: %v", finalAmount)
	}
}
```

El Stub es pasivo: simplemente entrega los datos (`UserToReturn`) que le configuramos en la fase de preparación (*Arrange*) del test.

### Implementando un Mock paso a paso

Ahora supongamos que, tras aplicar el descuento, el sistema debe enviar una notificación al usuario. Aquí no nos interesa qué devuelve el servicio de notificaciones, sino asegurar que se le haya invocado correctamente con el mensaje adecuado. Necesitamos un **Mock**.

```go
package discount

type Notifier interface {
	Notify(userID string, message string) error
}
```

Nuestro Mock manual necesitará campos de estado internos para registrar la actividad.

```go
package discount_test

import "testing"

// MockNotifier es nuestro Mock manual
type MockNotifier struct {
	// Registros de interacción
	CallsCount   int
	LastUserID   string
	LastMessage  string
	
	// Respuesta predefinida (opcional, mezclando un poco de Stub)
	ErrToReturn  error
}

// Satisfacemos la interfaz y registramos la llamada
func (m *MockNotifier) Notify(userID string, message string) error {
	m.CallsCount++
	m.LastUserID = userID
	m.LastMessage = message
	return m.ErrToReturn
}

func TestDiscountService_WithNotification(t *testing.T) {
	mockNotifier := &MockNotifier{}
	
	// ... inyectamos el mock en el servicio y ejecutamos la acción ...
	
	// Fase de Verificación (Assert) del comportamiento
	if mockNotifier.CallsCount != 1 {
		t.Errorf("Se esperaba 1 llamada a Notify, se obtuvieron: %d", mockNotifier.CallsCount)
	}
	if mockNotifier.LastUserID != "123" {
		t.Errorf("Se esperaba notificar al usuario 123, se notificó a: %s", mockNotifier.LastUserID)
	}
}
```

### El patrón idiomático en Go: Structs con funciones

En la sección 17.1 vimos de refilón una técnica muy popular en Go que fusiona lo mejor de los Mocks y los Stubs sin necesidad de crear múltiples structs para diferentes escenarios: **usar campos de tipo función**.

En lugar de almacenar contadores o variables estáticas, el doble delega la ejecución del método a una función anónima definida directamente en el test.

```go
type FuncMockNotifier struct {
	NotifyFunc func(userID string, message string) error
}

func (f *FuncMockNotifier) Notify(userID string, message string) error {
	if f.NotifyFunc != nil {
		return f.NotifyFunc(userID, message)
	}
	return nil // Comportamiento por defecto seguro
}
```

Esta técnica es extremadamente potente. Permite que cada sub-test (usando `t.Run`) defina aserciones complejas o devuelva errores específicos *en el momento* de la llamada, manteniendo el código de prueba altamente cohesionado y localizado.

Crear dobles de prueba manualmente es un ejercicio excelente que fomenta el diseño de interfaces pequeñas y precisas (siguiendo el Principio de Segregación de Interfaces de SOLID). Sin embargo, cuando las interfaces crecen o los proyectos escalan a decenas de dependencias, este proceso manual puede volverse repetitivo y propenso a errores (boilerplate).

## 17.3. Herramientas del ecosistema (Gomock, Mockery, Testify)

Escribir dobles de prueba manualmente, como vimos en la sección anterior, es una práctica excelente para interfaces pequeñas o proyectos en etapas tempranas. Sin embargo, a medida que la aplicación crece y las interfaces acumulan decenas de métodos, el mantenimiento de estos Mocks manuales se convierte en un cuello de botella (*boilerplate*). Es aquí donde las herramientas de generación de código y aserción del ecosistema de Go brillan con luz propia.

En Go, a diferencia de lenguajes dinámicos, los Mocks no se generan en tiempo de ejecución mediante reflexión pesada. La norma idiomática es **generar código fuente real** antes de compilar los tests. Analizaremos las tres herramientas más adoptadas por la comunidad para resolver este problema.

### 1. Gomock (uber-go/mock)

Originalmente mantenido por el equipo oficial de Go (`golang/mock`) y ahora adoptado y evolucionado por Uber (`uber-go/mock`), Gomock es un framework de *mocking* robusto y estricto. Se compone de dos partes: la herramienta de interfaz de línea de comandos (CLI) llamada `mockgen` y la librería para escribir los tests.

`mockgen` lee tus interfaces y genera un archivo `.go` con structs que implementan dichas interfaces, junto con métodos para registrar expectativas (*expectations*).

**Flujo de trabajo con Gomock:**

Primero, generamos el mock desde la terminal (o usando `go:generate`):
```bash
# Genera un mock para la interfaz PaymentGateway en el paquete payment
mockgen -source=payment.go -destination=mocks/mock_payment.go -package=mocks
```

Luego, lo utilizamos en nuestro test apoyándonos en un `Controller` que verifica que todas las llamadas esperadas se hayan realizado:

```go
package payment_test

import (
	"testing"
	"go.uber.org/mock/gomock"
	"miproyecto/payment"
	"miproyecto/mocks" // Paquete generado por mockgen
)

func TestPaymentWithGomock(t *testing.T) {
	// 1. Inicializamos el controlador
	ctrl := gomock.NewController(t)
	defer ctrl.Finish() // Verifica en Go < 1.14. En versiones modernas es automático si pasas 't'

	// 2. Instanciamos el mock generado
	mockGateway := mocks.NewMockGateway(ctrl)

	// 3. Definimos las expectativas (Comportamiento estricto)
	mockGateway.EXPECT().
		Charge(100.0).      // Esperamos que se llame con el argumento 100.0 exacto
		Return(nil).        // Devolvemos nil (sin error)
		Times(1)            // Esperamos que ocurra exactamente una vez

	// 4. Inyectamos y probamos
	service := payment.NewOrderService(mockGateway)
	err := service.Checkout(100.0)

	if err != nil {
		t.Errorf("No se esperaba error, se obtuvo: %v", err)
	}
}
```

Gomock es ideal para equipos que prefieren un control estricto, ya que los tests fallarán si el código llama al mock con argumentos inesperados o en un orden incorrecto.

### 2. Testify (stretchr/testify)

La librería estándar de Go (`testing`) provee funciones básicas de fallo (`t.Errorf`, `t.Fatal`), pero carece de aserciones ricas (como `assert.Equal` o `assert.NotNil`), lo que nos obliga a escribir muchos bloques `if`. Testify es, de facto, la librería estándar de la comunidad para suplir esta carencia.

Además de los paquetes `assert` y `require` (que detiene el test inmediatamente si falla), Testify incluye su propio paquete `mock`.

```go
package discount_test

import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Definimos el mock apoyándonos en testify/mock
type TestifyMockNotifier struct {
	mock.Mock
}

func (m *TestifyMockNotifier) Notify(userID string, message string) error {
	// Registramos la llamada a la función
	args := m.Called(userID, message)
	return args.Error(0) // Retornamos el primer argumento configurado como error
}

func TestWithTestify(t *testing.T) {
	notifier := new(TestifyMockNotifier)
	
	// Configuramos el comportamiento
	notifier.On("Notify", "123", "Descuento aplicado").Return(nil)

	// ... ejecución de la lógica ...
	err := notifier.Notify("123", "Descuento aplicado")

	// Aserciones de Testify: limpias y legibles
	assert.NoError(t, err)
	
	// Verificamos que las expectativas del mock se cumplieron
	notifier.AssertExpectations(t) 
}
```

### 3. Mockery

Escribir el cascarón de los mocks para Testify (el struct con `mock.Mock` y el método `m.Called`) sigue siendo trabajo manual. Aquí entra **Mockery**. 

Mockery es un generador de código que escanea tus interfaces y crea automáticamente los Mocks compatibles con `testify/mock`. Es la pareja de baile perfecta para Testify.

Su uso moderno se basa en un archivo de configuración `.mockery.yaml` en la raíz del proyecto, lo que permite generar todos los mocks de la aplicación con un solo comando:

```bash
mockery
```

**Gomock vs. Mockery/Testify: ¿Cuál elegir?**

* Elige **Mockery + Testify** si valoras la legibilidad en las aserciones, prefieres un enfoque un poco más permisivo en los tests, y quieres una sintaxis muy declarativa (`On("Metodo").Return(Valor)`). Es la opción más popular en el ecosistema general.
* Elige **Gomock** si estás en un proyecto donde el rigor absoluto en el orden y número de llamadas es crítico, o si sigues estrictamente las guías de estilo de Uber o Google.

Ambas opciones automatizan la creación de dobles y te permiten escalar tu cobertura de pruebas unitarias sin sacrificar tiempo en escribir *boilerplate*.

## 17.4. Behavior-Driven Development (BDD) en Go con Ginkgo

Hasta ahora, hemos explorado el testing en Go desde una perspectiva puramente técnica y centrada en el desarrollador, utilizando el paquete estándar `testing`, pruebas basadas en tablas (Table-Driven Tests) y la creación de dobles (Mocks/Stubs). Sin embargo, cuando el software crece, surge un desafío de comunicación: ¿cómo aseguramos que el código hace lo que el negocio realmente necesita? 

Aquí es donde entra el **Behavior-Driven Development (BDD)** o Desarrollo Guiado por Comportamiento. BDD es una evolución del TDD que pone el foco en definir el comportamiento esperado del sistema utilizando un lenguaje natural y ubicuo, comprensible tanto para desarrolladores como para perfiles de negocio (Product Owners, QA, etc.).

En Go, el estándar de facto para aplicar BDD es el framework **Ginkgo**, que casi siempre va de la mano con **Gomega**, su librería hermana dedicada a aserciones (*matchers*).

### El paradigma de Ginkgo: DSL basado en Closures

A diferencia del estilo plano y secuencial del paquete `testing`, Ginkgo introduce un Lenguaje Específico de Dominio (DSL) fuertemente anidado, inspirado en frameworks como RSpec (Ruby) o Jasmine/Jest (JavaScript). 

Los bloques fundamentales de Ginkgo son funciones que agrupan lógicamente el comportamiento:
* `Describe`: Define el componente o sujeto que estamos probando.
* `Context`: Describe el estado o escenario particular en el que se encuentra el sujeto.
* `It`: Expresa la expectativa o el comportamiento concreto que debe ocurrir.
* `BeforeEach` / `AfterEach`: Bloques de configuración (*setup*) y limpieza (*teardown*) que se ejecutan antes o después de cada bloque `It`.

### Escribiendo nuestro primer test con Ginkgo y Gomega

Imaginemos que tenemos un dominio de comercio electrónico con un carrito de compras. Queremos probar su comportamiento al añadir artículos. 

Primero, la lógica de nuestro dominio:

```go
package cart

import "errors"

type Cart struct {
	Items []string
}

func (c *Cart) Add(item string) error {
	if item == "" {
		return errors.New("el artículo no puede estar vacío")
	}
	c.Items = append(c.Items, item)
	return nil
}

func (c *Cart) TotalItems() int {
	return len(c.Items)
}
```

Ahora, veamos cómo se expresan las pruebas de este carrito utilizando el DSL de Ginkgo:

```go
package cart_test

import (
	"testing"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"miproyecto/cart"
)

// Punto de entrada requerido para que 'go test' ejecute Ginkgo
func TestCart(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Cart Suite")
}

var _ = Describe("Shopping Cart", func() {
	var (
		shoppingCart *cart.Cart
		err          error
	)

	// Se ejecuta antes de cada 'It', garantizando un estado limpio
	BeforeEach(func() {
		shoppingCart = &cart.Cart{}
	})

	Context("cuando se añade un artículo válido", func() {
		BeforeEach(func() {
			err = shoppingCart.Add("Teclado Mecánico")
		})

		It("no debe retornar error", func() {
			Expect(err).NotTo(HaveOccurred()) // Aserción con Gomega
		})

		It("debe incrementar el número total de artículos", func() {
			Expect(shoppingCart.TotalItems()).To(Equal(1))
		})

		It("debe contener el artículo añadido", func() {
			Expect(shoppingCart.Items).To(ContainElement("Teclado Mecánico"))
		})
	})

	Context("cuando se intenta añadir un artículo vacío", func() {
		BeforeEach(func() {
			err = shoppingCart.Add("")
		})

		It("debe retornar un error de validación", func() {
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("el artículo no puede estar vacío"))
		})

		It("no debe alterar el número de artículos", func() {
			Expect(shoppingCart.TotalItems()).To(BeZero())
		})
	})
})
```

*Nota: La importación con punto (`. "github.com/onsi/ginkgo/v2"`) es una de las pocas excepciones donde la comunidad de Go acepta oscurecer el espacio de nombres, precisamente para que el DSL (Describe, It, Expect) se lea como lenguaje natural.*

### Pros y Contras: ¿Deberías usar Ginkgo en tu proyecto?

La adopción de BDD y Ginkgo en un proyecto Go es una decisión arquitectónica importante que genera debate en la comunidad:

**Ventajas:**
1.  **Legibilidad extrema:** Los tests se leen como una especificación funcional. Al ejecutar `ginkgo -v`, la salida en terminal imprime una frase completa y descriptiva (ej. *Shopping Cart cuando se añade un artículo válido debe incrementar el número total de artículos*).
2.  **Estructura forzada:** El anidamiento obliga a pensar exhaustivamente en los diferentes contextos (`Context`) y casos extremos antes de escribir el código.
3.  **Gomega:** La librería de *matchers* es increíblemente rica para aserciones complejas (especialmente útil para testear concurrencia con `Eventually` y `Consistently`).

**Desventajas (Antipatrones en Go):**
1.  **Fricción idiomática:** El ecosistema de Go valora la simplicidad y el código directo. Ginkgo introduce mucha "magia" y rompe con el estilo de las *Table-Driven Tests* que promueve el equipo creador del lenguaje.
2.  **Estado compartido:** El uso de variables declaradas en el `Describe` y mutadas en los `BeforeEach` puede llevar a tests frágiles si no se manejan con extremo cuidado, ya que el estado se comparte entre *closures*.
3.  **Curva de aprendizaje:** Añade una capa de complejidad y herramientas adicionales (`ginkgo cli`) sobre el comando estándar `go test`.

**Cuándo utilizarlo:**
Ginkgo brilla en **pruebas de aceptación**, **tests de integración pesados** (como los usados en el ecosistema Kubernetes, donde Ginkgo es estándar) o cuando el dominio de negocio es lo suficientemente complejo como para justificar una herramienta que documente el comportamiento exacto del sistema. Para pruebas unitarias rápidas y funciones de utilidad, el paquete `testing` clásico sigue siendo el rey.
