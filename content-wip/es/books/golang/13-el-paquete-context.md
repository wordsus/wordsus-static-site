El paquete `context` es el eje sobre el que pivota la robustez y la eficiencia en Go. En sistemas distribuidos y aplicaciones de alta concurrencia, no basta con lanzar procesos; es imperativo gobernarlos. Este capítulo aborda cómo `context.Context` permite gestionar el ciclo de vida de cada petición, propagando señales de cancelación, plazos de ejecución (**deadlines**) y metadatos esenciales a través de capas y fronteras de red. Dominar el contexto es la diferencia entre una aplicación que se degrada con gracia y una que sucumbe ante fugas de memoria o esperas infinitas. Aquí aprenderás a orquestar el flujo de control concurrente de manera idiomática y segura.

## 13.1. Propósito y valores del Contexto en el ciclo de vida de una petición

En el ecosistema concurrente de Go, una única petición entrante —ya sea una solicitud HTTP, una llamada RPC o la recepción de un mensaje en una cola— rara vez es procesada de principio a fin por una sola Goroutine. Es habitual que el manejador principal delegue tareas: realice consultas a una base de datos, consuma APIs de terceros o ejecute cálculos pesados en Goroutines secundarias (conceptos que ya abordamos en la Parte 3). 

Esta ramificación crea un árbol de ejecución para una misma petición. El paquete `context`, introducido en la biblioteca estándar en Go 1.7, nace para resolver dos necesidades críticas en la gestión de este árbol: **la propagación de señales de cancelación** (y tiempos límite) y **la transmisión de datos de ámbito de petición** (request-scoped data) a través de las fronteras de las APIs y los procesos.

### La anatomía de `context.Context`

Para entender su propósito, es fundamental observar la interfaz subyacente que define el contrato del Contexto:

```go
type Context interface {
    Deadline() (deadline time.Time, ok bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

El diseño de esta interfaz revela que el Contexto no es un contenedor genérico mutante, sino un contrato de solo lectura. Los Contextos en Go son **inmutables** y seguros para el uso concurrente. Cuando necesitamos añadir información o un comportamiento (como una cancelación) a un Contexto existente, no lo modificamos; creamos un "hijo" que envuelve al Contexto "padre". 

Este capítulo se centrará en el uso del método `Value(key any) any` y cómo los valores fluyen en el ciclo de vida de la petición. Las mecánicas de `Done()`, `Err()` y `Deadline()` se explorarán a fondo en las secciones 13.2 y 13.3.

### Transmisión de valores: El árbol inmutable

El ciclo de vida de un Contexto comienza invariablemente con una raíz vacía, típicamente `context.Background()` (para el inicio de una petición o proceso principal) o `context.TODO()` (cuando aún no tenemos claro qué contexto usar).

A medida que la petición avanza por las distintas capas de nuestra arquitectura (Middlewares $\rightarrow$ Handlers $\rightarrow$ Casos de Uso $\rightarrow$ Repositorios), podemos inyectar metadatos utilizando `context.WithValue`.

```go
// Definición de WithValue en la standard library
func WithValue(parent Context, key, val any) Context
```

#### El mecanismo de búsqueda de valores

Cuando invocamos `ctx.Value(key)`, el Contexto actual verifica si posee ese valor. Si no lo tiene, delega la búsqueda a su padre, ascendiendo recursivamente por el árbol de Contextos hasta encontrar la clave o llegar a la raíz (donde retornará `nil`). 

Esta estructura de lista enlazada o árbol invertido implica que la complejidad temporal de buscar un valor en el contexto es $O(N)$, siendo $N$ la profundidad del árbol de contextos. Por esta razón, el Contexto no debe usarse como una caché rápida o un registro de dependencias global, sino estrictamente para datos que nacen y mueren con la petición.

### Idiomatismo en la definición de Claves (Keys)

Una de las reglas de oro al trabajar con `context.WithValue` es **nunca utilizar tipos integrados (built-in)** como `string` o `int` para las claves. Dado que múltiples paquetes de terceros pueden inyectar valores en el mismo Contexto, el uso de tipos básicos expone la aplicación a colisiones de claves silenciosas y difíciles de depurar.

La convención idiomática exige definir un tipo personalizado (habitualmente no exportado) para las claves:

```go
package middleware

import (
	"context"
	"net/http"
)

// 1. Definimos un tipo no exportado para evitar colisiones.
type contextKey string

// 2. Instanciamos las claves específicas.
const (
	requestIDKey contextKey = "requestID"
	userIDKey    contextKey = "userID"
)

// WithRequestID inyecta un ID de petición en el contexto.
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// RequestIDFromContext extrae de forma segura el ID.
func RequestIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(requestIDKey).(string) // Type assertion segura
	return id, ok
}
```

### El ciclo de vida en la práctica

En una aplicación web real, el ciclo de vida de los valores del Contexto suele tener esta secuencia:

1. **Entrada (Frontera):** Un Middleware intercepta la petición HTTP, extrae metadatos (ej. el token JWT del header de autorización), decodifica el ID del usuario y lo inyecta en el Contexto de la petición.
2. **Propagación:** El enrutador pasa este nuevo Contexto "enriquecido" al Handler. El Handler, sin interactuar directamente con la petición HTTP, pasa este Contexto hacia la capa de Dominio o Servicio.
3. **Consumo (Profundidad):** En la capa de Infraestructura (por ejemplo, en un logger o en un repositorio de base de datos), se extrae el ID del usuario del Contexto para auditar quién está ejecutando la consulta SQL.

```go
func HandleResourceUpdate(w http.ResponseWriter, r *http.Request) {
    // r.Context() ya contiene los valores inyectados por el middleware previo
    ctx := r.Context()
    
    // Pasamos el contexto explícitamente como PRIMER argumento (convención de Go)
    err := resourceService.Update(ctx, r.Body)
    if err != nil {
        // ... manejo de error ...
    }
}
```

La regla inquebrantable en Go es que **el Contexto siempre debe propagarse de forma explícita** como el primer parámetro de una función, habitualmente nombrado `ctx`. Nunca debe almacenarse dentro de un `Struct` (excepto en casos muy específicos de sincronización interna que escapan al modelo de peticiones estándar).

## 13.2. Contextos con cancelación manual (`WithCancel`)

Mientras que la transmisión de valores es una herramienta organizativa, el verdadero superpoder del paquete `context` reside en la gestión del ciclo de vida de operaciones concurrentes. La función `context.WithCancel` es el mecanismo fundamental para abortar operaciones anticipadamente. Esto es vital para liberar recursos, cerrar conexiones de base de datos y evitar el desperdicio de ciclos de CPU cuando el resultado de una operación ya no es necesario (por ejemplo, si el cliente HTTP cerró la conexión abruptamente).

### El contrato de cancelación

Cuando necesitamos dotar a un flujo de ejecución de la capacidad de ser interrumpido, envolvemos un contexto existente utilizando `WithCancel`. La firma de esta función en la standard library es la siguiente:

```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc)
```

La función toma un contexto padre y retorna dos elementos:
1.  **`ctx`**: Un nuevo contexto derivado (el "hijo").
2.  **`cancel`**: Una función del tipo `context.CancelFunc`.

La premisa de diseño aquí es estricta respecto a los límites de responsabilidad: **el código que recibe el contexto derivado solo puede escuchar la señal de cancelación, nunca emitirla**. La función `cancel` se mantiene en el ámbito de quien originó la operación, garantizando que una Goroutine hija no pueda cancelar erróneamente el contexto de sus hermanas o de su padre.

### Escuchando la señal: El canal `Done()`

El contexto derivado implementa el método `Done()`, que devuelve un canal de solo lectura (`<-chan struct{}`). Es crucial entender que este canal no transmite datos; su único propósito es actuar como una señal de *broadcast* al ser cerrado. 

Como vimos en el Capítulo 9 al estudiar los canales, recibir de un canal cerrado no bloquea la ejecución y devuelve el "valor cero" inmediatamente. Por lo tanto, las Goroutines que realizan trabajo pesado o I/O bloqueante deben monitorear este canal continuamente usando una instrucción `select` para detectar cuándo han sido canceladas.

```go
func ProcesamientoIntensivo(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            // El canal Done() se cerró. Abortamos la operación.
            // ctx.Err() devolverá context.Canceled explicando el motivo.
            return ctx.Err()
            
        default:
            // Si el contexto sigue activo, procesamos un lote de datos.
            // Es vital que este trabajo no sea permanentemente bloqueante.
            ProcesarLote()
        }
    }
}
```

### Prevención de fugas: La regla de oro del `defer cancel()`

Quien invoca `WithCancel` asume la responsabilidad ineludible de llamar a la función `cancel()` en algún momento. Si la operación principal termina (ya sea con éxito o por un error) y la función `cancel` nunca se ejecuta, el contexto hijo y sus recursos internos (como la Goroutine que gestiona la propagación de la cancelación subyacente) permanecerán en memoria hasta que el contexto padre sea recolectado por el Garbage Collector. 

Este es un vector clásico para provocar los *Goroutine Leaks* que analizamos en el Capítulo 8. Para prevenirlo, el patrón idiomático exige usar `defer` inmediatamente después de crear el contexto:

```go
func OrquestadorDeServicios() error {
    // Derivamos un nuevo contexto a partir de la petición principal
    ctx, cancel := context.WithCancel(context.Background())
    
    // Garantizamos la limpieza de recursos sin importar cómo termine la función
    defer cancel() 

    // Lanzamos múltiples workers pasándoles el contexto cancelable
    go WorkerA(ctx)
    go WorkerB(ctx)

    // Simulamos un escenario donde detectamos un fallo temprano
    if err := ChequearEstadoSistema(); err != nil {
        // Al invocar cancel(), notificamos a WorkerA y WorkerB 
        // para que detengan su ejecución inmediatamente.
        cancel() 
        return err
    }

    // ... lógica adicional ...
    return nil
}
```

*Nota: Es completamente seguro llamar a `cancel()` múltiples veces; las llamadas posteriores a la primera son simplemente operaciones no-op (no hacen nada).*

### Cancelación en cascada

La brillantez de este diseño radica en la topología de árbol del Contexto. Al invocar la función `cancel()`, la señal no se limita a ese nodo específico. Internamente, Go propaga el cierre del canal `Done()` de forma recursiva y automática hacia abajo, cancelando a todos los hijos, nietos y descendientes directos de ese contexto. 

Esta "cancelación en cascada" permite derribar un árbol entero de operaciones distribuidas a través de múltiples paquetes y Goroutines con una sola instrucción, asegurando una degradación controlada y limpia del sistema.

## 13.3. Contextos con límites de tiempo (`WithTimeout`, `WithDeadline`)

Si la cancelación manual que vimos en la sección anterior nos permite reaccionar ante errores o abortos iniciados por el usuario, la cancelación basada en tiempo es nuestra principal línea de defensa contra sistemas degradados, latencias de red impredecibles y el agotamiento de recursos (resource starvation). 

En arquitecturas distribuidas y microservicios, ninguna llamada a través de la red (ya sea una consulta a la base de datos o una petición HTTP a una API de terceros) debería ejecutarse sin un límite de tiempo estricto. El paquete `context` nos proporciona dos herramientas para automatizar este proceso de cancelación: `WithDeadline` y `WithTimeout`.

### Límites Absolutos vs. Relativos

Ambas funciones derivan un nuevo contexto a partir de un padre y devuelven una función `CancelFunc`, pero difieren en cómo definen la frontera temporal:

* **`WithDeadline(parent Context, d time.Time)`**: Establece un límite de tiempo **absoluto**. El contexto se cancelará automáticamente cuando el reloj del sistema alcance la estampa de tiempo `d`. Es ideal cuando tenemos una ventana de tiempo estricta para completar una tarea global (por ejemplo, "esta tarea programada debe terminar antes de las 23:59:59").
* **`WithTimeout(parent Context, timeout time.Duration)`**: Establece un límite de tiempo **relativo** desde el momento de su creación. Internamente, la biblioteca estándar implementa `WithTimeout` simplemente llamando a `WithDeadline(parent, time.Now().Add(timeout))`. Es el enfoque más utilizado para gobernar el ciclo de vida de peticiones HTTP o consultas a bases de datos (por ejemplo, "esperar un máximo de 5 segundos").

### Identificando un Timeout: `context.DeadlineExceeded`

Cuando el tiempo límite expira, el canal devuelto por `Done()` se cierra automáticamente, del mismo modo que si hubiéramos llamado manualmente a la función `cancel`. La diferencia radica en el motivo del cierre, el cual podemos inspeccionar utilizando el método `Err()`.

Si el contexto fue cancelado por tiempo, `ctx.Err()` devolverá el error predefinido `context.DeadlineExceeded`. 

```go
func ConsultarServicioExterno(ctx context.Context) error {
    // Definimos un timeout estricto de 2 segundos para esta operación específica
    ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
    
    // Regla de oro: SIEMPRE diferir la cancelación, incluso con timeouts
    defer cancel() 

    // Simulamos un canal por donde recibiremos la respuesta del servicio
    respuestaCh := make(chan string, 1)
    
    go func() {
        // ... simulación de llamada a red ...
        time.Sleep(3 * time.Second) // Este servicio es lento
        respuestaCh <- "datos recibidos"
    }()

    select {
    case res := <-respuestaCh:
        fmt.Println("Éxito:", res)
        return nil
    case <-ctxTimeout.Done():
        // El timeout ha expirado. ctxTimeout.Err() == context.DeadlineExceeded
        return fmt.Errorf("la consulta falló: %w", ctxTimeout.Err())
    }
}
```

### El peligro del Temporizador Interno (Por qué usar `defer cancel()`)

Una idea equivocada muy común en Go es creer que, dado que el contexto se cancelará solo cuando el tiempo expire, invocar la función `cancel()` devuelta por `WithTimeout` es opcional. **Esto es un error grave que impacta el rendimiento.**

Bajo el capó, tanto `WithTimeout` como `WithDeadline` crean un temporizador (`time.Timer`) en el runtime de Go. Si la operación principal termina *antes* de que se cumpla el tiempo límite (lo cual es el escenario ideal), ese temporizador seguirá vivo en la memoria, contando tictacs en segundo plano hasta que finalmente expire. 

Al ejecutar `defer cancel()`, no solo permitimos la cancelación manual anticipada, sino que le indicamos al runtime de Go que destruya y recolecte el `time.Timer` inmediatamente, liberando recursos valiosos.

### La regla del "Plazo más corto gana" (Shortest Deadline Wins)

Debido a la naturaleza jerárquica del Contexto, las políticas de tiempo se heredan y se restringen, pero nunca se extienden. Si un contexto padre ya tiene una fecha límite, cualquier contexto hijo creado a partir de él estará sujeto a la fecha límite que ocurra primero.

Si un Middleware HTTP establece un timeout global de 3 segundos para toda la petición (Contexto Padre), y dentro del Handler creamos un sub-contexto con `WithTimeout` de 5 segundos para una consulta SQL, la consulta SQL **se cancelará a los 3 segundos**. Go garantiza que un hijo jamás pueda sobrevivir a la muerte de su padre.

## 13.4. Antipatrones: Cuándo y cómo pasar valores a través del Contexto

El método `context.Value` es, por diseño, una puerta trasera al riguroso sistema de tipos estáticos de Go. Al aceptar y retornar el tipo `any` (anteriormente `interface{}`), el compilador pierde la capacidad de verificar qué datos están viajando a través de la aplicación. Esta flexibilidad es un arma de doble filo que, si se utiliza incorrectamente, puede transformar un código base limpio en una maraña de dependencias ocultas y pánicos en tiempo de ejecución.

En esta sección, desglosaremos los antipatrones más comunes en el uso de `context.Value` y estableceremos las reglas fundamentales para su correcta aplicación.

### Antipatrón 1: El Contexto como contenedor de dependencias (Service Locator)

Uno de los errores más graves y frecuentes en arquitecturas Go es inyectar conexiones de bases de datos (`*sql.DB`), clientes HTTP, o instancias de *loggers* dentro del Contexto. 

```go
// ANTIPATRÓN: Ocultando dependencias en el contexto
func ObtenerUsuario(ctx context.Context, id int) (*Usuario, error) {
    // El compilador no sabe que esta función requiere una base de datos
    db, ok := ctx.Value("database").(*sql.DB)
    if !ok {
        return nil, errors.New("dependencia no encontrada")
    }
    // ... ejecución de la consulta ...
}
```

Este enfoque destruye la inyección de dependencias explícita. La firma de la función `ObtenerUsuario` miente: afirma que solo necesita un Contexto y un ID, pero en realidad fallará si mágicamente no encuentra un objeto de base de datos en el árbol del contexto. 

Las dependencias de infraestructura deben definirse explícitamente en las estructuras (Structs) y pasarse en el momento de la inicialización, aprovechando la seguridad en tiempo de compilación.

### Antipatrón 2: Parámetros opcionales y lógica de negocio

El Contexto no debe utilizarse para pasar parámetros que afectan directamente al comportamiento de la lógica de negocio. Si una función de paginación necesita un `limit` y un `offset`, estos deben ser argumentos explícitos de la función (o encapsulados en un struct de opciones), nunca valores extraídos del Contexto.

Pasar parámetros de negocio a través del Contexto hace que el código sea impredecible, difícil de testear (requiere armar Contextos falsos) y rompe la legibilidad. El Contexto no es un sustituto de los parámetros con nombre o del patrón *Functional Options*.

### La regla de oro: Datos de ámbito de petición (Request-Scoped Data)

Entonces, ¿qué debe almacenarse exactamente en un Contexto? La comunidad de Go ha consensuado una definición estricta: **solo datos de ámbito de petición (request-scoped data) que transitan a través de los límites de los procesos y las APIs.**

> "Si una función puede ejecutarse de manera lógicamente correcta y cumplir su propósito principal aunque el valor en el Contexto sea `nil` o no exista, entonces el uso de `context.Value` es arquitectónicamente adecuado."

Los casos de uso idiomáticos y legítimos incluyen:

* **IDs de Correlación y Trazabilidad:** Un `RequestID` o un identificador de OpenTelemetry (`TraceID`) generado por un Middleware HTTP. La base de datos puede guardar el registro sin este ID, pero su presencia enriquece los logs.
* **Identidad y Seguridad:** Información del usuario autenticado (extraída de un JWT). Un servicio de facturación puede usar el ID del usuario del Contexto para auditar quién canceló una factura, sin que la identidad del usuario sea el parámetro central de la función de cancelación en sí.
* **Metadatos de red:** La dirección IP del cliente original en una petición HTTP.

### Buenas prácticas para la extracción segura

Cuando trabajamos con datos válidos de ámbito de petición, debemos asumir que el valor podría no estar presente. Un Contexto mal formado o una prueba unitaria sin inicializar adecuadamente no deberían provocar un colapso de la aplicación (Panic).

Toda función que extraiga datos del Contexto debe utilizar la aserción de tipos segura (el patrón "comma ok") y proporcionar un valor por defecto o un comportamiento de degradación elegante:

```go
// Extracción segura del ID de Correlación
func RequestIDDesdeContexto(ctx context.Context) string {
    id, ok := ctx.Value(requestIDKey).(string)
    if !ok || id == "" {
        // Retornamos un valor por defecto o generamos uno nuevo
        // para asegurar que el sistema no se detenga.
        return "id-desconocido" 
    }
    return id
}
```

Al confinar `context.Value` a metadatos de peticiones, utilizar claves no exportadas (como vimos en la sección 13.1) y realizar aserciones de tipo seguras, mantenemos las ventajas de concurrencia y cancelación del Contexto sin sacrificar la robustez y transparencia de nuestro código Go.

