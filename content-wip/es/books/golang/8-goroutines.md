La concurrencia es el corazón de Go y su mayor ventaja competitiva. A diferencia de otros lenguajes que dependen de hilos del sistema operativo (pesados y costosos), Go introduce las **Goroutines**: unidades de ejecución ultraligeras gestionadas por su propio *runtime*.

En este capítulo, desglosaremos la ingeniería detrás del modelo **M:N**, que permite ejecutar millones de tareas simultáneas con apenas unos kilobytes de memoria. Analizaremos cómo el **Go Scheduler** orquesta este caos mediante el *work-stealing* y, lo más importante, aprenderemos a gestionar el ciclo de vida de estas rutinas para evitar fugas de memoria, garantizando aplicaciones robustas y altamente escalables.

## 8.1. El modelo de concurrencia M:N de Go

Para comprender por qué la concurrencia en Go es tan excepcionalmente escalable, primero debemos analizar cómo los lenguajes de programación y los sistemas operativos han manejado tradicionalmente la ejecución paralela y concurrente. Existen históricamente dos enfoques predominantes: el modelo **1:1** y el modelo **N:1**. Go, sin embargo, implementa un sofisticado modelo **M:N** que extrae las ventajas de ambos mundos mitigando sus debilidades.

### El problema con los modelos tradicionales

1. **El modelo 1:1 (Hilos a nivel de Sistema Operativo):** En este modelo, utilizado tradicionalmente por lenguajes como C++ o Java (antes del Proyecto Loom), cada hilo de la aplicación se mapea directamente a un hilo del sistema operativo (OS thread). 
   * **Ventajas:** Es un modelo verdaderamente paralelo. Si un hilo se bloquea (por ejemplo, por una operación de red), el sistema operativo simplemente programa otro hilo en la CPU.
   * **Desventajas:** El costo computacional es altísimo. Un hilo de SO típicamente reserva un bloque de memoria contiguo para su pila (stack) de entre **1 MB y 8 MB**. Además, el cambio de contexto (context switch) entre hilos implica llamadas al kernel que pueden tomar entre **1 y 2 microsegundos**, lo que destruye el rendimiento si intentamos lanzar decenas de miles de hilos simultáneamente.

2. **El modelo N:1 (Hilos a nivel de usuario o "Green Threads"):**
   En este modelo, múltiples hilos de la aplicación se ejecutan sobre un único hilo del sistema operativo.
   * **Ventajas:** Los cambios de contexto son extremadamente rápidos (cuestión de nanosegundos) porque ocurren enteramente en el espacio de usuario, sin intervención del kernel.
   * **Desventajas:** No aprovechan los procesadores multinúcleo. Además, si un hilo a nivel de usuario realiza una llamada al sistema bloqueante (syscall), todo el hilo del SO subyacente se bloquea, deteniendo la ejecución de todos los demás hilos de la aplicación.

### La solución de Go: El modelo M:N

Go resuelve este dilema implementando el modelo **M:N**. En este paradigma, **M** rutinas de usuario (llamadas *Goroutines*) se multiplexan sobre **N** hilos del sistema operativo. 

El entorno de ejecución de Go (Go Runtime) asume la responsabilidad de gestionar esta orquestación. Cuando inicias un programa en Go, el runtime crea un número predeterminado de hilos del SO (generalmente igual al número de núcleos lógicos de tu CPU, definido por `GOMAXPROCS`). A partir de ahí, puedes lanzar millones de goroutines, y el runtime se encargará de distribuirlas y ejecutarlas sobre ese pequeño grupo de hilos del SO reales.

**Eficiencia en memoria y ejecución:**
A diferencia de los hilos del SO, una goroutine comienza con una pila dinámica muy pequeña, típicamente de **2 KB**. Esta pila puede crecer y encogerse según las necesidades de la función durante su ciclo de vida. Esta es la razón principal por la que puedes tener un millón de goroutines consumiendo apenas unos 2 GB de RAM, mientras que un millón de hilos de SO consumirían terabytes de memoria, colapsando el sistema.

### La abstracción fundamental: G, M y P

Aunque profundizaremos en los algoritmos específicos de planificación en la sección *8.3 (Entendiendo el Planificador de Go)*, es indispensable introducir las tres entidades matemáticas que conforman el modelo M:N en Go:

* **G (Goroutine):** Representa la unidad de trabajo. Contiene su propia pila, su estado de ejecución y el puntero de instrucción.
* **M (Machine / OS Thread):** Representa un hilo real del sistema operativo gestionado por el kernel.
* **P (Processor):** Representa un procesador lógico o un contexto de ejecución. Un `M` debe adquirir un `P` para poder ejecutar código Go. Cada `P` mantiene una cola local de goroutines (`G`) listas para ejecutarse.

Si una goroutine hace una llamada al sistema bloqueante (por ejemplo, leer un archivo grande), el runtime de Go es lo suficientemente inteligente como para desvincular temporalmente el hilo del sistema operativo (`M`) del procesador lógico (`P`). El runtime entonces asigna un nuevo hilo del SO a ese `P` para que el resto de las goroutines en la cola no se queden atascadas, logrando concurrencia fluida sin el bloqueo masivo del modelo N:1.

### Demostración práctica del modelo M:N

El siguiente código ilustra cómo Go gestiona miles de unidades de concurrencia (M) utilizando apenas un puñado de hilos del sistema operativo (N):

```go
package main

import (
	"fmt"
	"runtime"
	"sync"
	"time"
)

func main() {
	// GOMAXPROCS define los "P" (procesadores lógicos), que generalmente
	// dictan el número de hilos del SO (M) ejecutando código Go activamente.
	fmt.Printf("CPUs lógicas disponibles: %d\n", runtime.NumCPU())
	fmt.Printf("Hilos de SO (GOMAXPROCS) iniciales: %d\n", runtime.GOMAXPROCS(0))

	var wg sync.WaitGroup
	numeroGoroutines := 50000 // Lanzaremos 50,000 Goroutines (M)

	wg.Add(numeroGoroutines)
	for i := 0; i < numeroGoroutines; i++ {
		go func() {
			defer wg.Done()
			// Simulamos una tarea breve
			time.Sleep(100 * time.Millisecond)
		}()
	}

	// Consultamos el runtime mientras las 50,000 goroutines están activas
	fmt.Printf("Goroutines (M) activas: %d\n", runtime.NumGoroutine())
	
	wg.Wait()
	fmt.Println("Ejecución finalizada con éxito.")
}
```

**Salida típica en una máquina de 8 núcleos:**
```text
CPUs lógicas disponibles: 8
Hilos de SO (GOMAXPROCS) iniciales: 8
Goroutines (M) activas: 50001
Ejecución finalizada con éxito.
```

*Nota: Aparece `50001` porque la función `main` misma se ejecuta dentro de su propia goroutine.*

En este ejemplo, vemos la magia del modelo M:N en acción. El runtime está gestionando de forma transparente **50,000** goroutines concurrentes (M), mapeándolas, pausándolas y reanudándolas sobre tan solo **8** hilos reales del sistema operativo (N). Esto elimina casi por completo la latencia extrema que sufriría el sistema si el kernel tuviera que realizar cambios de contexto entre 50,000 hilos de SO reales.

## 8.2. Creación, ejecución y ciclo de vida de una Goroutine

Una vez comprendido el modelo subyacente M:N que hace posible la concurrencia masiva en Go, es momento de analizar la unidad anatómica fundamental de este sistema: la **Goroutine**. A diferencia de los hilos de un sistema operativo, que requieren costosas llamadas al sistema para su creación y destrucción, las goroutines son gestionadas íntegramente por el *runtime* de Go, lo que las hace extremadamente ligeras y eficientes.

### La creación: La palabra clave `go`

La creación de una goroutine es deliberadamente sencilla por diseño. En Go, cualquier función o método puede ser invocado de manera concurrente simplemente anteponiendo la palabra clave reservada `go` a la llamada.

Cuando el compilador encuentra esta instrucción, no ejecuta la función inmediatamente de forma síncrona. En su lugar, empaqueta la función, sus argumentos y un pequeño bloque de memoria inicial para su pila (típicamente **2 KB**), y la entrega al planificador (Scheduler) para su futura ejecución.

**Evaluación inmediata de argumentos:**
Un aspecto crítico durante la creación de una goroutine es que **los argumentos de la función se evalúan en el momento de la invocación de `go`, no en el momento de la ejecución de la goroutine**.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func simularTarea(id int, mensaje string, wg *sync.WaitGroup) {
	defer wg.Done()
	fmt.Printf("[Goroutine %d] Iniciando tarea: %s\n", id, mensaje)
	time.Sleep(50 * time.Millisecond) // Simulamos trabajo
	fmt.Printf("[Goroutine %d] Tarea finalizada.\n", id)
}

func main() {
	var wg sync.WaitGroup

	mensaje := "Procesamiento inicial"
	
	wg.Add(1)
	// Los argumentos '1' y el valor actual de 'mensaje' se evalúan y copian AHORA.
	go simularTarea(1, mensaje, &wg) 

	// Mutamos la variable en la goroutine principal
	mensaje = "Procesamiento modificado"
	
	wg.Add(1)
	// Aquí se copia el nuevo valor de 'mensaje'.
	go simularTarea(2, mensaje, &wg)

	wg.Wait()
	fmt.Println("Ejecución principal terminada.")
}
```

En este ejemplo, aunque la ejecución de las goroutines ocurra en un futuro indeterminado, los valores que reciben son exactamente los que tenían las variables en el milisegundo en que se ejecutó la instrucción `go`.

### Ejecución y asincronía

Al lanzar una goroutine, el flujo de control de la función invocadora (como `main`) continúa inmediatamente hacia la siguiente línea de código sin esperar el resultado. Esta asincronía implica que no hay garantías sobre el orden de ejecución entre múltiples goroutines creadas simultáneamente.

Es fundamental recordar que la función `main` en sí misma se ejecuta dentro de una goroutine principal. Si la goroutine principal termina (alcanza el final de su bloque o ejecuta un `return`), el programa completo finaliza abruptamente, destruyendo y abortando cualquier otra goroutine secundaria que aún estuviera en ejecución o en espera. Por esta razón, utilizamos mecanismos de sincronización como `sync.WaitGroup` (que veremos en profundidad en el Capítulo 10) para orquestar los tiempos de espera.

### El ciclo de vida de una Goroutine

Desde el momento en que se usa la instrucción `go` hasta que la función retorna, una goroutine transita por varios estados internos gestionados por el runtime. Conceptualmente, podemos resumir este ciclo de vida en cuatro estados principales:

1. **Runnable (Lista para ejecutar):** En el instante en que invocas `go`, la goroutine se crea y se coloca en estado *Runnable*. Aún no está ejecutando código, sino que se encola en la cola de ejecución local de un procesador lógico (`P`) o en la cola global, esperando que un hilo del sistema operativo (`M`) esté libre para procesarla.

2. **Running (En ejecución):** Un hilo del sistema operativo (`M`) extrae la goroutine de la cola y comienza a ejecutar sus instrucciones de CPU de manera secuencial. La goroutine permanecerá en este estado hasta que termine su trabajo, agote su cuota de tiempo (time-slice) o necesite bloquearse.

3. **Waiting / Blocked (En espera o Bloqueada):** Si la goroutine en ejecución realiza una operación que no puede completarse inmediatamente (por ejemplo, esperar datos de un Canal de red, hacer una llamada I/O a un disco, intentar adquirir un Mutex bloqueado o ejecutar `time.Sleep`), el runtime la retira del hilo del sistema operativo y la pone en estado *Waiting*. Esto libera el hilo (`M`) para que pueda ejecutar otra goroutine *Runnable*, logrando la máxima eficiencia de la CPU. Una vez que la operación bloqueante se resuelve (llegan los datos o el Mutex se libera), la goroutine vuelve al estado *Runnable* para reanudar su ejecución.

4. **Dead (Terminada):** Cuando la función finaliza, ya sea porque llegó a su última línea, ejecutó un `return`, o sufrió un `panic` no recuperado, la goroutine entra en estado *Dead*. El runtime de Go se encarga entonces de limpiar sus recursos, reciclando su pila de memoria para que futuras goroutines puedan utilizarla y aliviando así la presión sobre el Garbage Collector.

## 8.3. Entendiendo el Planificador de Go (Go Scheduler)

Para que el modelo M:N descrito en las secciones anteriores funcione de manera eficiente, el *runtime* de Go incluye un planificador (scheduler) que opera en el espacio de usuario. A diferencia del planificador del sistema operativo, que distribuye hilos sobre los núcleos físicos de la CPU, el planificador de Go distribuye Goroutines (`G`) sobre los hilos del sistema operativo (`M`) utilizando los procesadores lógicos (`P`) como contexto de ejecución.

El objetivo principal de este planificador es maximizar el uso de la CPU, minimizar los cambios de contexto costosos y evitar que una Goroutine monopolice los recursos del sistema.

### Colas de ejecución: Local y Global

El planificador de Go organiza las Goroutines que están en estado *Runnable* (listas para ejecutarse) en dos tipos de colas:

* **Local Run Queue (LRQ):** Cada procesador lógico (`P`) tiene su propia cola local. Almacena un número limitado de Goroutines (típicamente hasta 256). Debido a que esta cola es local para un `P` específico, el hilo del SO (`M`) asociado puede extraer Goroutines de ella sin necesidad de utilizar bloqueos (locks) o Mutexes, lo que hace que la ejecución sea increíblemente rápida.
* **Global Run Queue (GRQ):** Es una cola única y centralizada. Si la LRQ de un procesador se llena, las Goroutines adicionales se envían a la GRQ. Además, las Goroutines recién creadas pueden terminar aquí bajo ciertas condiciones. Para evitar que las Goroutines en la GRQ sufran inanición (starvation), los procesadores lógicos revisan esta cola periódicamente (aproximadamente 1 de cada 61 ticks del planificador).

### El algoritmo de Robo de Trabajo (Work-Stealing)

¿Qué sucede cuando un procesador lógico (`P`) vacía completamente su cola local (LRQ) y no tiene más trabajo que hacer, mientras que otros procesadores están sobrecargados? Aquí es donde entra en juego el algoritmo de **Work-Stealing**.

Para mantener todos los hilos del sistema operativo (`M`) ocupados y aprovechar el hardware al máximo, un `P` inactivo buscará trabajo en el siguiente orden:

1.  Revisa su propia LRQ.
2.  Revisa la Global Run Queue (GRQ).
3.  Revisa el *Network Poller* (para ver si hay Goroutines listas tras una operación de red).
4.  **Work-Stealing:** Si todo lo anterior falla, el `P` selecciona aleatoriamente a otro `P` y "roba" la mitad de las Goroutines de la LRQ de su vecino.

Este balanceo de carga dinámico asegura que ningún núcleo de la CPU se quede inactivo si hay Goroutines esperando ser ejecutadas en alguna parte del programa.

### Expropiación Asíncrona (Asynchronous Preemption)

Un problema histórico en los lenguajes con hilos cooperativos es que un bucle infinito (o muy pesado) que no realiza llamadas a funciones ni operaciones bloqueantes puede secuestrar un hilo para siempre, impidiendo que otras tareas se ejecuten. 

A partir de Go 1.14, el planificador implementa **Expropiación Asíncrona basada en señales**. El runtime envía periódicamente señales del sistema operativo (como `SIGURG` en sistemas basados en Unix) a los hilos (`M`). Si una Goroutine lleva ejecutándose durante más de 10 milisegundos sin ceder el control voluntariamente, el runtime interrumpe su ejecución, guarda su estado, la devuelve a una cola de ejecución (LRQ o GRQ) y permite que otra Goroutine ocupe la CPU.

El siguiente código ilustra un escenario que, antes de Go 1.14, habría colapsado el programa, pero que hoy el planificador maneja sin problemas:

```go
package main

import (
	"fmt"
	"runtime"
	"sync"
	"time"
)

func main() {
	// Forzamos al runtime a usar un único hilo del SO (M) y un procesador (P)
	runtime.GOMAXPROCS(1)

	var wg sync.WaitGroup
	wg.Add(2)

	// Goroutine 1: Trabajo intensivo en CPU (bucle cerrado)
	go func() {
		defer wg.Done()
		fmt.Println("Goroutine 1: Iniciando bucle pesado...")
		// Sin expropiación asíncrona, este bucle monopolizaría el único hilo (M)
		for i := 0; i < 5000000000; i++ {
			// Simulación de cálculos sin llamadas a funciones o I/O
		}
		fmt.Println("Goroutine 1: Bucle finalizado.")
	}()

	// Goroutine 2: Tarea ligera
	go func() {
		defer wg.Done()
		// Esta Goroutine logrará ejecutarse a pesar de que la Goroutine 1 
		// está acaparando la CPU, gracias a la Expropiación del Planificador.
		time.Sleep(100 * time.Millisecond)
		fmt.Println("Goroutine 2: Ejecutada exitosamente durante la expropiación.")
	}()

	wg.Wait()
	fmt.Println("Programa finalizado.")
}
```

### Llamadas al Sistema (Syscalls) y el Network Poller

El planificador distingue entre diferentes tipos de operaciones bloqueantes para no asfixiar el modelo M:N:

* **Llamadas de Red (I/O asíncrono):** Cuando una Goroutine realiza una petición HTTP o lee de un socket, no bloquea el hilo del SO (`M`). El planificador mueve la Goroutine al *Network Poller* (basado en `epoll`, `kqueue` o `IOCP` según el SO) y el `M` queda libre para ejecutar la siguiente Goroutine de la LRQ.
* **Llamadas al Sistema Síncronas (File I/O):** Si una Goroutine hace una llamada al sistema que forzosamente bloqueará el hilo del SO (como leer un archivo local en ciertos sistemas), el planificador desacopla el procesador (`P`) de ese hilo bloqueado (`M1`) y le asigna un nuevo hilo del SO (`M2`). Esto se conoce como *Handoff*. Cuando la llamada al sistema termina, la Goroutine se vuelve a encolar y el hilo original (`M1`) se guarda en un pool para uso futuro (o se destruye).

## 8.4. Prevención de fugas de Goroutines (Goroutine Leaks)

El modelo de concurrencia de Go es tan ligero y accesible que resulta tentador lanzar miles de goroutines sin pensar demasiado en su ciclo de vida. Sin embargo, esta facilidad es un arma de doble filo. Uno de los problemas más insidiosos en aplicaciones de Go de larga duración es la **fuga de goroutines** (Goroutine Leak). 

A diferencia de las variables ordinarias, el Recolector de Basura (Garbage Collector o GC) de Go **no puede limpiar una goroutine que se encuentra en ejecución o bloqueada**. Si una goroutine queda suspendida indefinidamente, la memoria asignada a su pila (esos 2 KB iniciales, más cualquier memoria referenciada dentro de ella) nunca será liberada. Con el tiempo, esto consumirá toda la memoria disponible, provocando que la aplicación colapse por un error de *Out of Memory* (OOM).

### Causas comunes de las fugas

Las fugas de goroutines casi siempre ocurren porque una rutina entra en el estado *Waiting / Blocked* (como vimos en la sección 8.2) y la condición para despertarla jamás se cumple. Los escenarios más típicos incluyen:

1. **Esperar en un canal vacío:** Una goroutine intenta leer de un canal por el que nunca se enviarán más datos y que nunca se cierra.
2. **Enviar a un canal sin receptor:** Una goroutine intenta enviar un dato a un canal sin búfer (unbuffered), pero la goroutine receptora ya ha terminado su ejecución o ha dejado de escuchar.
3. **Bloqueos mutuos (Deadlocks) parciales:** Dos o más goroutines se esperan mutuamente para liberar un `Mutex` u otro recurso de sincronización.

### Anatomía de una fuga

Veamos un ejemplo clásico donde una goroutine se filtra silenciosamente:

```go
package main

import (
	"fmt"
	"runtime"
	"time"
)

// procesarDatos lanza una goroutine que espera datos de un canal.
func procesarDatos(ch <-chan string) {
	go func() {
		// Si la función principal deja de enviar datos y no cierra el canal,
		// esta goroutine se quedará bloqueada aquí para siempre.
		dato := <-ch
		fmt.Println("Procesando:", dato)
	}()
}

func main() {
	fmt.Printf("Goroutines iniciales: %d\n", runtime.NumGoroutine())

	ch := make(chan string)
	
	// Llamamos a la función, pero decidimos no enviar nada por el canal
	procesarDatos(ch)
	
	// Simulamos que el programa sigue haciendo otras cosas
	time.Sleep(100 * time.Millisecond)
	
	fmt.Printf("Goroutines finales: %d\n", runtime.NumGoroutine())
	// El canal 'ch' saldrá de ámbito (scope) y será recolectado por el GC,
	// ¡pero la goroutine anónima bloqueada dentro de procesarDatos NO!
}
```

**Salida del programa:**
```text
Goroutines iniciales: 1
Goroutines finales: 2
```
Como se observa, la aplicación termina con una goroutine "zombi" consumiendo recursos.

### Estrategias de prevención

La regla de oro de la concurrencia en Go es: **Nunca inicies una goroutine sin saber exactamente cómo y cuándo va a terminar**.

Para cumplir con esta regla, existen patrones idiomáticos que garantizan la terminación de las goroutines. Aunque profundizaremos en el paquete `context` en el Capítulo 13, el patrón más fundamental utiliza un canal de cancelación o la instrucción `select`:

```go
package main

import (
	"fmt"
	"runtime"
	"time"
)

// procesarDatosSeguro utiliza un canal 'done' para señalar la cancelación.
func procesarDatosSeguro(ch <-chan string, done <-chan struct{}) {
	go func() {
		for {
			select {
			case dato := <-ch:
				fmt.Println("Procesando:", dato)
			case <-done:
				// Cuando el canal 'done' se cierra, esta rama se ejecuta.
				fmt.Println("Señal de cancelación recibida. Terminando goroutine.")
				return // Previene la fuga liberando la goroutine.
			}
		}
	}()
}

func main() {
	ch := make(chan string)
	done := make(chan struct{}) // Canal dedicado para señales de cierre

	procesarDatosSeguro(ch, done)

	time.Sleep(50 * time.Millisecond)
	
	// Indicamos a la goroutine que debe terminar cerrando el canal 'done'
	close(done)
	
	time.Sleep(50 * time.Millisecond) // Damos tiempo para que la goroutine imprima su mensaje
	fmt.Printf("Goroutines finales activas: %d\n", runtime.NumGoroutine())
}
```

Al utilizar la instrucción `select` junto con un canal de cancelación explícito (`done`), proporcionamos una "escotilla de escape". Incluso si nunca enviamos datos por `ch`, podemos cerrar `done` para garantizar que la goroutine retorne y sus recursos sean liberados al sistema.

Otras estrategias clave incluyen:
* **Timeouts:** Usar `time.After` dentro de un `select` para abortar operaciones que tardan demasiado.
* **Cierre explícito de canales:** Acostumbrarse a que el *productor* de los datos sea siempre el responsable de cerrar el canal de comunicación.
