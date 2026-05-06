En la era de los sistemas distribuidos, un log ya no es una simple cadena de texto destinada a la terminal de un desarrollador; es un **evento de datos** que debe ser procesado, indexado y analizado a escala. Este capítulo analiza la transición crítica desde el uso del paquete `log` tradicional hacia un enfoque estructurado. Exploraremos cómo el nuevo estándar `log/slog` de Go permite emitir registros en formatos legibles por máquinas (como JSON) sin comprometer el rendimiento. Aprenderás a integrar metadatos, gestionar niveles de severidad y propagar IDs de correlación, transformando tus logs en una herramienta de diagnóstico infalible para entornos de producción modernos.

## 39.1. La evolución hacia el logging estructurado

En las etapas iniciales de cualquier aplicación, es habitual (y hasta comprensible) depender de la salida estándar para entender qué está ocurriendo. Históricamente, el paquete nativo `log` de Go ha sido la herramienta por defecto para esta tarea. Es simple, es concurrente y funciona perfectamente para scripts o aplicaciones monolíticas pequeñas.

Sin embargo, como exploramos en la Parte 9 al hablar de microservicios, la realidad de los sistemas distribuidos modernos es implacable. Cuando una petición de usuario atraviesa media docena de servicios, intentar rastrear un error leyendo líneas de texto plano diseminadas en múltiples contenedores se convierte en una tarea imposible.

### El problema del Logging no estructurado

El enfoque tradicional del logging está diseñado para ser consumido por humanos, no por máquinas. Observa este patrón clásico:

```go
package main

import (
	"errors"
	"log"
)

func main() {
	userID := 42
	err := errors.New("timeout connecting to database")
	
	// Logging tradicional basado en formato de cadenas
	log.Printf("Fallo al procesar el usuario %d: %v", userID, err)
}

// Salida esperada:
// 2026/03/16 22:02:44 Fallo al procesar el usuario 42: timeout connecting to database
```

Para un desarrollador leyendo la terminal, esta línea es clara. Pero en un entorno de producción, los logs no los leen los humanos directamente; los ingieren, indexan y analizan sistemas como Elasticsearch, Splunk o Datadog. 

Para que una máquina extraiga el `userID` de esa cadena, necesitas escribir expresiones regulares. Si mañana otro desarrollador cambia el mensaje a `"Error procesando al usuario con ID %d"`, la expresión regular fallará, el log dejará de indexarse correctamente y la observabilidad del sistema se degradará silenciosamente.

### El cambio de paradigma: Logs como Datos

El **logging estructurado** abandona la idea de emitir "oraciones" de texto y pasa a emitir **eventos de datos**. En lugar de interpolar variables dentro de una cadena, se registra un mensaje estático acompañado de un conjunto de pares clave-valor (contexto).

Conceptualizado en JSON, el log anterior pasaría a verse así:

```json
{
  "level": "error",
  "time": "2026-03-16T22:02:44Z",
  "message": "Fallo al procesar el usuario",
  "user_id": 42,
  "error": "timeout connecting to database"
}
```

Las ventajas son inmediatas:
1. **Indexación determinista:** El agregador de logs sabe exactamente qué es `user_id` y que es de tipo numérico. Puedes hacer consultas precisas como: `level:"error" AND user_id:42`.
2. **Resistencia a refactorizaciones:** Alterar el campo `message` no rompe las reglas de parseo ni las alertas automatizadas, ya que los metadatos viajan en campos separados.
3. **Riqueza de contexto:** Permite inyectar IDs de correlación (Trace IDs) fácilmente para seguir el flujo de la petición, un concepto que abordaremos a fondo en el Capítulo 41 sobre Tracing Distribuido.

### La historia del ecosistema Go: De Logrus a la Estandarización

La transición hacia este modelo no ocurrió de la noche a la mañana en la standard library. La comunidad de Go tuvo que suplir la carencia inicial, lo que generó tres fases evolutivas claras en el ecosistema:

**1. La era de la adopción (Logrus)**
Hace unos años, `github.com/sirupsen/logrus` se convirtió en el estándar de facto. Logrus introdujo a la comunidad de Go al concepto de campos (`WithFields`). Sin embargo, su diseño interno dependía fuertemente de reflexiones (`reflect`) y de múltiples asignaciones de memoria (allocations) en el *heap* por cada entrada de log, lo que generaba presión sobre el Garbage Collector (algo que penalizaba severamente el rendimiento en servicios de alta concurrencia, como vimos en el Capítulo 43).

**2. La guerra del rendimiento (Zap y Zerolog)**
Para resolver el problema de las asignaciones de memoria, nacieron librerías obsesionadas con el rendimiento. `go.uber.org/zap` y `rs/zerolog` demostraron que era posible tener un logging estructurado con *Zero Allocations* utilizando técnicas avanzadas y evitando la interfaz vacía (`any`) siempre que fuera posible. Hablaremos de su impacto a nivel de rendimiento en la sección 39.3.

**3. El problema de la fragmentación**
Aunque el rendimiento estaba resuelto, surgió un problema arquitectónico: **la falta de una interfaz común**. 
Si escribías una librería de uso público (por ejemplo, un cliente para una API) y querías emitir logs estructurados, ¿qué framework utilizabas? Si dependías de Zap, forzabas a los usuarios de tu librería a usar Zap. Muchos proyectos terminaron creando interfaces abstractas inyectables (adaptadores) solo para desacoplarse del logger, violando el principio de simplicidad de Go.

Este ecosistema fragmentado fue el detonante que llevó al equipo principal de Go a reconocer que el lenguaje necesitaba una solución de logging estructurado nativa, estándar y de alto rendimiento. Esta necesidad histórica es exactamente lo que culminó con la introducción del paquete `log/slog` en Go 1.21, marcando un antes y un después en la forma en que instrumentamos nuestras aplicaciones, como veremos a continuación.

## 39.2. Dominando el nuevo estándar de Go: el paquete `log/slog`

La llegada de Go 1.21 marcó un hito en la observabilidad del lenguaje con la introducción del paquete `log/slog`. Su objetivo no era simplemente añadir otra librería de logging al ecosistema, sino proporcionar una interfaz estándar y de alto rendimiento que unificara la forma en que las aplicaciones y librerías de terceros emiten logs estructurados.

Para lograr esto, el equipo de Go diseñó `slog` separando la emisión del log (el "qué") de su procesamiento y formato (el "cómo"). 

### Arquitectura en dos capas: Frontend y Backend

El diseño de `slog` se basa en un patrón de separación de responsabilidades muy elegante, dividido en dos componentes principales:

1.  **Frontend (`slog.Logger`):** Es la API con la que interactúa el desarrollador. Proporciona los métodos familiares como `Info()`, `Error()`, `Debug()`, etc. Su única responsabilidad es recolectar el mensaje, el nivel de severidad y los atributos (pares clave-valor), empaquetándolos en una estructura altamente optimizada llamada `slog.Record`.
2.  **Backend (`slog.Handler`):** Es una interfaz que recibe el `slog.Record` creado por el Logger y decide qué hacer con él. Un Handler formatea los datos y los escribe en un destino final (`io.Writer`), como la consola, un archivo, o un recolector de logs a través de la red.

Esta separación es la clave de su éxito: las librerías pueden aceptar un `slog.Logger` genérico sin importar si la aplicación principal formatea en JSON, texto plano, o envía los datos a Datadog.

### Handlers integrados: Texto y JSON

La biblioteca estándar provee dos implementaciones de la interfaz `Handler` listas para usar en producción: `TextHandler` y `JSONHandler`.

Por defecto, si llamas a `slog.Info()`, Go utiliza un handler básico que emula el comportamiento del paquete `log` clásico. Para aprovechar el logging estructurado, debemos configurar explícitamente el Handler y reemplazar el logger global:

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	// Configuramos un Handler JSON que escribe en la salida estándar
	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug, // Habilitamos logs de nivel Debug
	}
	
	jsonHandler := slog.NewJSONHandler(os.Stdout, opts)
	
	// Creamos el Logger con nuestro Handler
	logger := slog.New(jsonHandler)
	
	// Sobrescribimos el logger global por defecto
	slog.SetDefault(logger)

	// A partir de aquí, las llamadas globales usan formato JSON
	slog.Info("Servicio inicializado", "puerto", 8080, "entorno", "producción")
}
```

La salida generada sería un objeto JSON estandarizado:
```json
{"time":"2026-03-16T22:04:15Z","level":"INFO","msg":"Servicio inicializado","puerto":8080,"entorno":"producción"}
```

### Atributos fuertemente tipados y rendimiento

En el ejemplo anterior utilizamos una sintaxis de argumentos variables (variádicos) intercalando claves (strings) y valores (tipos genéricos `any`). Aunque esta API es cómoda y ergonómica, tiene un coste: **asignaciones de memoria (allocations)**. 

Cada vez que pasas un tipo primitivo (como un `int` o un `bool`) a un argumento de tipo genérico `any` (interfaz vacía), el compilador de Go se ve obligado a realizar una asignación en el *heap* (Escape Analysis, abordado en el Capítulo 44). En aplicaciones con miles de peticiones por segundo, esto genera una presión excesiva sobre el Garbage Collector.

Para mitigar esto, `slog` introduce el concepto de **Atributos (`slog.Attr`)**. Son estructuras fuertemente tipadas que evitan el paso por la interfaz vacía, garantizando un rendimiento óptimo (*Zero Allocations* o asignaciones mínimas):

```go
// Enfoque ergonómico (incurre en allocations por el uso de any)
slog.Info("Procesando pago", "usuario", 42, "monto", 150.50)

// Enfoque de alto rendimiento usando Atributos fuertemente tipados
slog.Info("Procesando pago", 
	slog.Int("usuario", 42), 
	slog.Float64("monto", 150.50),
)
```

**Regla de oro:** Utiliza la sintaxis genérica para scripts o flujos lentos. Para el "hot path" de tu aplicación (como un middleware HTTP que se ejecuta en cada petición), utiliza siempre tipos explícitos como `slog.Int`, `slog.String`, `slog.Bool` o `slog.Time`.

### Enriquecimiento de contexto estático y agrupación

A menudo queremos que todos los logs emitidos dentro de un componente específico (como un controlador o un worker) compartan ciertos atributos. En lugar de inyectarlos manualmente en cada línea, podemos crear un logger derivado usando el método `With()`:

```go
// Creamos un sub-logger que siempre incluirá el module="auth" y worker_id=5
authLogger := logger.With(
	slog.String("module", "auth"),
	slog.Int("worker_id", 5),
)

// Emitirá: {"level":"INFO","msg":"Login exitoso","module":"auth","worker_id":5,"user":"admin"}
authLogger.Info("Login exitoso", slog.String("user", "admin"))
```

Además de `With()`, `slog` introduce `WithGroup()`, una herramienta fundamental para evitar colisiones de nombres en logs grandes. Si tu aplicación y una librería de terceros intentan loguear la clave `"id"`, el formato JSON resultante podría tener claves duplicadas o sobrescritas. Agrupar soluciona esto anidando los atributos dentro de un sub-objeto JSON:

```go
dbLogger := logger.WithGroup("database")
// Emitirá: {"level":"ERROR","msg":"Conexión perdida","database":{"id":"pg-cluster","retry":3}}
dbLogger.Error("Conexión perdida", slog.String("id", "pg-cluster"), slog.Int("retry", 3))
```

### Soporte nativo para context.Context

Finalmente, `slog` brilla por su integración con el paquete `context` (Capítulo 13). Todos los niveles de log tienen una variante que acepta el contexto como primer parámetro (`InfoContext`, `ErrorContext`, etc.).

```go
slog.InfoContext(ctx, "Ejecutando consulta SQL", slog.String("query", "SELECT * FROM users"))
```

Aunque por defecto los Handlers integrados no hacen nada especial con el contexto, esto prepara el terreno para escribir **Custom Handlers** que extraigan valores dinámicos del `context.Context`, como los Trace IDs de OpenTelemetry. Esta es la base que conecta el logging estructurado con el Tracing Distribuido que veremos a fondo en el Capítulo 41.

## 39.3. Librerías de terceros (Zap, Zerolog) y su impacto en rendimiento

Aunque `log/slog` es hoy el estándar indiscutible para nuevos proyectos, es imposible entender el estado actual del logging estructurado en Go sin estudiar a los gigantes que resolvieron el problema del rendimiento años antes de la llegada de Go 1.21. 

En aplicaciones de altísima concurrencia, emitir cientos de miles de logs por segundo puede convertirse rápidamente en el cuello de botella principal, no por el coste de I/O (escritura en disco o red), sino por la **presión sobre el recolector de basura (Garbage Collector)**. Como exploraremos a fondo en el Capítulo 43, cada vez que una función acepta un argumento de tipo genérico `any` (como hacían las versiones antiguas de `logrus`), el compilador suele verse forzado a alojar esa variable en el *Heap* (asignación de memoria), lo que obliga al GC a trabajar el doble.

Dos librerías revolucionaron el ecosistema al demostrar que el logging estructurado podía diseñarse con **Zero Allocations** (cero asignaciones en el Heap).

### Zap: La apuesta de Uber por el rendimiento extremo

Desarrollada por Uber, `go.uber.org/zap` fue diseñada bajo una premisa innegociable: el rendimiento puro mediante el tipado fuerte y la reutilización agresiva de memoria mediante `sync.Pool` (concepto que vimos en el Capítulo 10).

Para ofrecer versatilidad sin comprometer el diseño, Zap introdujo dos interfaces distintas dentro de la misma librería:

1.  **`SugaredLogger`:** Prioriza la ergonomía del desarrollador. Permite interpolación y uso de `any`, similar a `log/slog` en su forma básica. Incurre en algunas asignaciones de memoria, pero sigue siendo más rápido que alternativas antiguas.
2.  **`Logger`:** Prioriza el rendimiento absoluto. Exige el uso de campos fuertemente tipados (`zap.String`, `zap.Int`) y garantiza cero asignaciones en el "hot path".

```go
package main

import (
	"go.uber.org/zap"
	"time"
)

func main() {
	// Configuración optimizada para producción (JSON, alta velocidad)
	logger, _ := zap.NewProduction()
	defer logger.Sync() // Vacia el buffer antes de salir

	url := "http://ejemplo.com/api"
	
	// Uso del Logger estricto (Zero Allocations)
	logger.Info("Petición completada",
		zap.String("url", url),
		zap.Int("status", 200),
		zap.Duration("latencia", time.Millisecond*45),
	)
}
```

Internamente, cuando llamas a `zap.String()`, no estás pasando una interfaz genérica. Estás creando una estructura `zapcore.Field` que Zap procesa encolando directamente los bytes en un buffer pre-asignado, sin utilizar el paquete `reflect`.

### Zerolog: Simplicidad en cadena

Mientras Zap ofrecía una solución robusta y empresarial, `github.com/rs/zerolog` apostó por una API fluida (encadenamiento de métodos) enfocada exclusivamente en emitir JSON lo más rápido posible.

La brillantez de Zerolog radica en que no construye un mapa o una estructura intermedia en memoria para luego serializarla a JSON con `encoding/json`. En su lugar, a medida que encadenas los métodos, Zerolog concatena los bytes (`[]byte`) directamente para formar la cadena JSON final.

```go
package main

import (
	"github.com/rs/zerolog"
	"os"
)

func main() {
	// Configuración global del nivel mínimo
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	// API fluida (Chainable) y Zero Allocations
	logger.Info().
		Str("url", "http://ejemplo.com/api").
		Int("status", 200).
		Msg("Petición completada")
}
```

### Comparativa de rendimiento y el ecosistema actual

Para comprender el impacto de estas decisiones arquitectónicas, observemos una tabla comparativa aproximada de rendimiento (tiempo por operación y asignaciones de memoria) al emitir un log estructurado con 10 campos:

| Librería | Tiempo estimado (ns/op) | Asignaciones en el Heap (B/op) | Allocations (allocs/op) |
| :--- | :--- | :--- | :--- |
| `logrus` | ~11,000 ns | ~1,600 B | ~24 |
| `log/slog` (con `slog.Attr`) | ~1,200 ns | 0 B | 0 |
| `zap` (Logger estricto) | ~700 ns | 0 B | 0 |
| `zerolog` | ~600 ns | 0 B | 0 |

*Nota: Los números varían según la arquitectura y la versión exacta de Go, pero la proporción de magnitud se mantiene constante.*

### El veredicto: ¿Qué usar hoy?

La llegada de `log/slog` no hace que Zap o Zerolog sean obsoletos, pero cambia las reglas del juego arquitectónico:

* **Para el 95% de las aplicaciones:** Usa la biblioteca estándar `log/slog`. Su rendimiento con `slog.Attr` es de *Zero Allocations* y la velocidad (aunque microscópicamente menor a Zap) es más que suficiente para casi cualquier API comercial, con el beneficio de no depender de librerías externas.
* **Para el 5% restante (Sistemas Críticos):** Si estás escribiendo un balanceador de carga, un proxy inverso o un motor de base de datos donde cada nanosegundo cuenta, Zap y Zerolog siguen siendo los reyes del rendimiento absoluto.

**El patrón de convergencia:**
La mayor ventaja del diseño de `slog` (visto en la sección 39.2) es su interfaz de backend. Hoy en día, la práctica recomendada en proyectos legacy es mantener `slog` como la API visible (el *Frontend*) que los desarrolladores usan en su día a día, y conectar Zap o Zerolog como el *Handler* subyacente (`slogzap` o `slogzerolog`). De esta forma, obtienes la interfaz estándar de Go con el motor de altísimo rendimiento de las librerías de terceros.

## 39.4. Rastreo de peticiones con IDs de correlación a través de microservicios

Como vimos en el Capítulo 32 al hablar de la transición de monolitos a microservicios, la adopción de arquitecturas distribuidas destruye la linealidad del código. Una única acción de un usuario (por ejemplo, "finalizar compra") puede disparar llamadas a los servicios de inventario, pagos, envíos y notificaciones. 

Si el servicio de envíos falla, emitirá un log de error. Pero si tienes 500 compras por minuto, ¿cómo sabes exactamente qué petición inicial del API Gateway causó ese error específico en el servicio de envíos? Aquí es donde el logging estructurado por sí solo no basta; necesitamos **contexto distribuido**.

### El concepto de Correlation ID

Un ID de correlación (Correlation ID o Trace ID) es un identificador único (generalmente un UUID) que se genera en el punto de entrada de la infraestructura (como un API Gateway o el primer microservicio). Este identificador debe propagarse a través de cada llamada de red y adjuntarse a **cada línea de log** emitida por cualquier servicio que participe en la resolución de esa petición.

Al indexar los logs en un sistema centralizado, bastará con filtrar por ese ID para obtener una línea de tiempo perfectamente ordenada del viaje de la petición a través de todo tu clúster.

### El vehículo perfecto: `context.Context`

En Go, la propagación de datos atados al ciclo de vida de una petición se hace a través del paquete `context` (revisado en el Capítulo 13). 

El flujo de trabajo estándar consta de tres pasos:
1. Interceptar la petición HTTP entrante.
2. Extraer el ID de correlación de las cabeceras HTTP (o generar uno si no existe).
3. Inyectar ese ID en el `context.Context` de la petición.

Veamos cómo se implementa esto en un Middleware típico (Capítulo 25):

```go
package middleware

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
)

// Definimos un tipo no exportado para evitar colisiones en el Contexto
type contextKey string
const correlationIDKey contextKey = "correlation_id"

// CorrelationID intercepta la petición y maneja el ID
func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Extraer de la cabecera estándar (o la que use tu equipo)
		id := r.Header.Get("X-Correlation-ID")
		if id == "" {
			// 2. Generar uno si es el punto de entrada (simplificado para el ejemplo)
			id = generateSimpleID() 
		}

		// 3. Inyectar en el Contexto
		ctx := context.WithValue(r.Context(), correlationIDKey, id)

		// 4. Opcional: Devolverlo en la respuesta para el cliente
		w.Header().Set("X-Correlation-ID", id)

		// Pasar el nuevo contexto al siguiente handler
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func generateSimpleID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
```

### Integración con `log/slog`: Custom Handlers

Ahora que el ID de correlación viaja silenciosamente en el contexto de cada función de nuestra aplicación, necesitamos que nuestro logger lo extraiga e inyecte en el JSON final. 

En lugar de extraerlo manualmente en cada llamada a `slog.Info`, podemos aprovechar el diseño de `slog` creando un **Custom Handler** que intercepte el log justo antes de ser formateado, extraiga el ID del contexto y lo añada como un atributo.

```go
package logger

import (
	"context"
	"log/slog"
)

// ContextHandler envuelve a un Handler existente para inyectar datos del contexto
type ContextHandler struct {
	slog.Handler
}

// Handle sobrescribe el método principal del Handler
func (h ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	// Extraemos el Correlation ID del contexto
	if id, ok := ctx.Value(correlationIDKey).(string); ok {
		// Añadimos el atributo al registro del log
		r.AddAttrs(slog.String("correlation_id", id))
	}
	
	// Delegamos el formato final al Handler subyacente (ej. JSONHandler)
	return h.Handler.Handle(ctx, r)
}

// Setup inicializa el logger global
func Setup(baseHandler slog.Handler) {
	// Envolvemos el handler base (puede ser el JSONHandler estándar o Zap)
	h := ContextHandler{Handler: baseHandler}
	logger := slog.New(h)
	slog.SetDefault(logger)
}
```

### Uso en la capa de aplicación

Con esta infraestructura en su lugar, la experiencia del desarrollador en los controladores o casos de uso es totalmente transparente. Simplemente deben usar los métodos que aceptan un contexto (como `slog.InfoContext`):

```go
func procesarPago(ctx context.Context, userID int) {
	// El logger global extraerá el correlation_id mágicamente del ctx
	slog.InfoContext(ctx, "Iniciando procesamiento de pago", slog.Int("user_id", userID))
	
	// ... lógica de negocio ...
}
```

La salida JSON resultante contendrá automáticamente la clave:
```json
{"time":"2026-03-16T22:15:00Z","level":"INFO","msg":"Iniciando procesamiento de pago","user_id":42,"correlation_id":"a1b2c3d4e5f6"}
```

Este patrón de inyección de contexto es la piedra angular de la observabilidad moderna. Aunque aquí lo hemos implementado manualmente para entender los fundamentos, este mismo principio es el que utilizan internamente los estándares de la industria como OpenTelemetry, que exploraremos a fondo en el **Capítulo 41: Tracing Distribuido**, donde pasaremos de un simple ID a graficar Spans complejos.
