Dominar las goroutines y canales es solo el inicio; la verdadera maestría en Go radica en cómo orquestar estas piezas para construir sistemas resilientes y eficientes. En este capítulo, elevamos el nivel de abstracción para estudiar los **patrones de diseño concurrentes**, soluciones estandarizadas a problemas comunes de flujo de datos y control de recursos.

Aprenderemos a implementar el **Worker Pool** para gestionar cargas masivas sin agotar el sistema, utilizaremos **Fan-in y Fan-out** para paralelizar procesos dinámicamente y estructuraremos tuberías de datos mediante el patrón **Pipeline**. Finalmente, veremos cómo los **Semáforos** permiten un control granular sobre el acceso a recursos limitados.

## 11.1. Patrón Worker Pool

En aplicaciones sometidas a alta carga, la filosofía de Go invita a pensar: *"Si tienes una tarea independiente, lánzala en una goroutine"*. Sin embargo, como analizamos en el Capítulo 8, aunque el modelo M:N hace que las goroutines sean extremadamente ligeras, los recursos de hardware subyacentes (CPU, memoria, descriptores de archivos) son finitos. 

Si un servidor recibe un millón de peticiones repentinas y lanza un millón de goroutines concurrentes para consultar una base de datos, lo más probable es que se agoten las conexiones del pool o se provoque una caída por falta de memoria (OOM). Aquí es donde el patrón **Worker Pool** (Piscina de Trabajadores) se vuelve indispensable.

### Concepto y Arquitectura

El patrón Worker Pool controla y limita estrictamente el nivel de concurrencia en una aplicación. En lugar de crear una goroutine por cada tarea entrante, se pre-instancia un número fijo de goroutines de larga duración (los *workers*). Estos workers actúan como consumidores continuos que extraen trabajos de una cola compartida, los procesan y, opcionalmente, envían el resultado a otra cola.

La arquitectura se compone típicamente de tres elementos, integrando las primitivas que cubrimos en los Capítulos 9 y 10:
1.  **Canal de Trabajos (Jobs Channel):** Un canal (generalmente con búfer) donde el productor envía las tareas pendientes.
2.  **Los Workers:** Un grupo de goroutines iterando de forma segura (`for range`) sobre el canal de trabajos.
3.  **Canal de Resultados (Results Channel):** Un canal donde los workers depositan la salida de su procesamiento.

### Implementación Idiomática en Go

A continuación, implementaremos un Worker Pool robusto. Observa cómo combinamos el uso de canales direccionales, la iteración segura y la sincronización con `sync.WaitGroup` para garantizar que el sistema termine de forma limpia sin dejar *goroutine leaks*.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// Job representa la unidad de trabajo.
type Job struct {
	ID      int
	Payload string
}

// Result envuelve el resultado y los posibles errores del procesamiento.
type Result struct {
	JobID int
	Err   error
}

// worker es la función concurrente instanciada múltiples veces.
// Utilizamos canales direccionales (<-chan para recibir, chan<- para enviar).
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	// Garantizamos notificar al WaitGroup cuando el worker termine (Capítulo 10.2).
	defer wg.Done()

	// El ciclo range termina automáticamente cuando el canal 'jobs' se cierra.
	for j := range jobs {
		fmt.Printf("Worker [%d] procesando Job %d\n", id, j.ID)
		
		// Simulamos un trabajo pesado (ej. I/O, llamadas a red o cálculos)
		time.Sleep(time.Millisecond * 500) 
		
		// Enviamos el resultado al canal de salida
		results <- Result{JobID: j.ID, Err: nil}
	}
	fmt.Printf("Worker [%d] finalizado. \n", id)
}

func main() {
	const numWorkers = 3
	const numJobs = 10

	jobs := make(chan Job, numJobs)
	results := make(chan Result, numJobs)
	var wg sync.WaitGroup

	// 1. Inicializar el Pool de Workers
	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	// 2. Producción de trabajos (Encolado)
	for j := 1; j <= numJobs; j++ {
		jobs <- Job{ID: j, Payload: "Data"}
	}
	
	// Fundamental: Cerrar el canal de trabajos indica a los workers 
	// que no habrá más tareas, permitiendo que salgan de su bucle 'for range'.
	close(jobs)

	// 3. Goroutine orquestadora para el cierre seguro
	// Esperamos a que todos los workers terminen antes de cerrar el canal de resultados.
	// Esto se hace en una goroutine anónima para no bloquear el hilo principal.
	go func() {
		wg.Wait()
		close(results)
	}()

	// 4. Recolección de resultados
	// Iteramos hasta que el canal de resultados sea cerrado por la goroutine anterior.
	for res := range results {
		if res.Err != nil {
			fmt.Printf("Error en Job %d: %v\n", res.JobID, res.Err)
			continue
		}
		fmt.Printf("Resultado del Job %d procesado exitosamente.\n", res.JobID)
	}
	
	fmt.Println("Todo el trabajo ha concluido.")
}
```

**Puntos clave del código:**
* **Orquestación asíncrona:** La recolección de llamadas `wg.Wait()` dentro de una goroutine anónima (Paso 3) es un estándar de diseño. Si ejecutáramos `wg.Wait()` directamente en el hilo principal antes de consumir los resultados, provocaríamos un *deadlock*, ya que los workers se quedarían bloqueados intentando enviar a un canal `results` no consumido.
* **Cierre de canales propagado:** Al cerrar `jobs`, cada worker finaliza su iteración. Al finalizar todos los workers, el `WaitGroup` llega a cero, lo que desencadena el cierre de `results`, permitiendo a la función `main` terminar su ejecución.

### Análisis del Patrón

Implementar un Worker Pool introduce un nivel de complejidad arquitectónica que debe justificarse. Aquí tienes un desglose de sus implicaciones operativas:

| Ventajas | Consideraciones y Trade-offs |
| :--- | :--- |
| **Backpressure nativo:** Limita la presión sobre dependencias frágiles (ej. una API externa de terceros con rate limiting). | **Sobrecarga de orquestación:** Para tareas extremadamente rápidas (microsegundos), el costo de sincronización entre canales puede ser mayor que el de la tarea en sí. |
| **Estabilidad de memoria:** Previene el crecimiento descontrolado del *Heap* al establecer un techo máximo de goroutines vivas. | **Dimensionamiento complejo (Sizing):** Determinar el número ideal de workers (`numWorkers`) requiere análisis; muy pocos subutilizan el hardware, demasiados generan contención. |
| **Reutilización:** Evita el costo (aunque pequeño) de alojar y desalojar goroutines constantemente para tareas continuas. | **Manejo de pánico complejo:** Si un worker sufre un `panic` no recuperado, derribará toda la aplicación. Se requiere usar `defer recover()` (Capítulo 4.5) dentro del worker en entornos críticos. |

Dimensionar el Pool de forma óptima dependerá en gran medida de si el trabajo está limitado por la CPU (CPU-bound) o por operaciones de entrada/salida (I/O-bound). Para tareas CPU-bound, el número de workers ideal suele coincidir con el valor de `runtime.NumCPU()`. Para I/O-bound, el número suele ser significativamente mayor debido a los tiempos de espera involucrados.

## 11.2. Patrón Fan-in y Fan-out

Mientras que el Worker Pool (sección anterior) se centra en limitar y controlar el número máximo de goroutines vivas mediante colas estáticas, los patrones **Fan-out** y **Fan-in** abordan el problema desde la perspectiva del flujo de datos (data streaming). Son la base para construir *pipelines* de procesamiento concurrentes, permitiendo distribuir cargas de trabajo y consolidar resultados de forma dinámica.

### Fan-out (Dispersión)

El patrón **Fan-out** ocurre cuando múltiples goroutines leen simultáneamente del mismo canal de entrada hasta que este se cierra. Su objetivo es distribuir un cuello de botella computacional entre varios "trabajadores" para paralelizar el esfuerzo, maximizando el uso de la CPU en escenarios *CPU-bound*.

A nivel mecánico, el Fan-out es muy similar al Worker Pool, pero conceptualmente suele aplicarse en etapas intermedias de un pipeline donde el número de goroutines consumidoras puede escalarse dinámicamente en función del volumen del flujo de datos, en lugar de ser un pool de tamaño fijo y ciclo de vida global.

### Fan-in (Convergencia o Multiplexación)

El patrón **Fan-in** es el proceso inverso. Ocurre cuando una única función o goroutine lee de múltiples canales de entrada y consolida todos esos flujos en un único canal de salida. 

Si conocemos la cantidad exacta de canales de entrada en tiempo de compilación, podemos realizar un Fan-in utilizando la instrucción `select` (como vimos en el Capítulo 9.4). Sin embargo, cuando el número de canales es dinámico (por ejemplo, como resultado de un Fan-out previo de tamaño variable), la instrucción `select` se vuelve insuficiente. La solución idiomática en Go requiere el uso de `sync.WaitGroup` para orquestar la convergencia.

### Implementación del Patrón Combinado

El poder real de estos patrones se manifiesta cuando se combinan. A continuación, implementamos un flujo donde un generador emite datos, hacemos un **Fan-out** hacia múltiples procesadores pesados, y finalmente usamos **Fan-in** para unificar los resultados de todos los procesadores en un solo canal.

```go
package main

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// generador simula un flujo continuo de datos entrantes.
func generador(done <-chan struct{}, nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			select {
			case out <- n:
			case <-done: // Previene goroutine leaks (Capítulo 8.4)
				return
			}
		}
	}()
	return out
}

// procesador simula una tarea pesada sobre el dato (Ej. cifrado, compresión).
// Es la pieza que utilizaremos para hacer Fan-out.
func procesador(done <-chan struct{}, in <-chan int, id int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			// Simulamos carga de trabajo variable
			time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
			resultado := n * n
			
			select {
			case out <- resultado:
			case <-done:
				return
			}
		}
	}()
	return out
}

// merge implementa el patrón Fan-in dinámico.
// Toma 'n' canales de entrada y devuelve un único canal de salida.
func merge(done <-chan struct{}, cs ...<-chan int) <-chan int {
	var wg sync.WaitGroup
	out := make(chan int)

	// output es la función que extrae datos de un canal específico
	// y los envía al canal unificado.
	output := func(c <-chan int) {
		defer wg.Done()
		for n := range c {
			select {
			case out <- n:
			case <-done:
				return
			}
		}
	}

	wg.Add(len(cs))
	for _, c := range cs {
		go output(c)
	}

	// Goroutine orquestadora para cerrar el canal unificado
	// cuando todos los canales de entrada hayan sido procesados.
	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

func main() {
	// Canal de señalización para cancelación global
	done := make(chan struct{})
	defer close(done)

	// 1. Iniciamos el generador de datos
	datosEntrantes := generador(done, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

	// 2. FAN-OUT: Distribuimos la carga leyendo del mismo canal 'datosEntrantes'
	// Instanciamos tres procesadores independientes.
	p1 := procesador(done, datosEntrantes, 1)
	p2 := procesador(done, datosEntrantes, 2)
	p3 := procesador(done, datosEntrantes, 3)

	// 3. FAN-IN: Convergemos los tres canales resultantes en uno solo.
	resultados := merge(done, p1, p2, p3)

	// 4. Consumo final
	for r := range resultados {
		fmt.Printf("Resultado consolidado: %d\n", r)
	}
}
```

### Análisis del Diseño Idiomático

El código anterior introduce una práctica crítica que distingue el código Go aficionado del código de grado de producción: **la señalización de cancelación mediante el canal `done`**. 

Como detallamos en el Capítulo 8.4, si el consumidor final decide dejar de leer de `resultados` antes de que los procesadores hayan terminado, las goroutines de `procesador` y `merge` se bloquearían eternamente intentando enviar a un canal no consumido (Goroutine Leak). Pasar un canal `done` (o utilizar el paquete `context`, que abordaremos en el Capítulo 13) como primer argumento de las funciones concurrentes asegura que toda la ramificación del Fan-out/Fan-in pueda ser derribada de forma segura liberando recursos de memoria.

| Característica | Implicación en el Sistema |
| :--- | :--- |
| **Orden no garantizado** | El proceso de Fan-in mezcla los datos a medida que llegan. Si el orden de procesamiento es estricto (ej. transacciones financieras dependientes), este patrón requerirá un paso extra de reordenamiento posterior. |
| **Escalabilidad horizontal** | Es trivial aumentar la cantidad de goroutines en la etapa de Fan-out iterando la creación de los canales en un slice y usando el operador *spread* `...` al pasarlos a `merge`. |
| **Simplicidad de la interfaz** | Desde la perspectiva del `main`, toda la complejidad asíncrona queda encapsulada. El sistema devuelve un simple `<-chan int` que se puede iterar con un bucle for-range clásico. |

## 11.3. Patrón Pipeline

En el desarrollo de software tradicional, el procesamiento de datos a menudo se realiza por lotes (batch processing): se carga una colección completa en memoria, se itera sobre ella para aplicar una transformación, se guarda en una nueva colección y se pasa a la siguiente función. Este enfoque es ineficiente en términos de memoria y tiempo, especialmente con grandes volúmenes de datos.

En Go, el patrón **Pipeline** (Tubería) transforma este flujo secuencial en un modelo de procesamiento de flujo de datos (streaming). Un pipeline es una serie de etapas (stages) conectadas por canales. Cada etapa está formada por una o más goroutines que cumplen una regla estricta: reciben datos de un canal de entrada (*upstream*), aplican una operación computacional o transformación, y envían el resultado a un canal de salida (*downstream*).

Al encadenar estas etapas, el primer dato puede estar terminando su procesamiento en la última etapa mientras el generador apenas está emitiendo el enésimo dato, logrando una concurrencia verdaderamente fluida.

### Estructura de una Etapa (Stage)

Para que el patrón Pipeline sea componible e idiomático, cada etapa debe ser una función que cumpla con la siguiente firma conceptual:
1.  Acepta, al menos, un canal de lectura (`<-chan T`) y un canal de señalización para cancelación (`done`).
2.  Devuelve un canal de solo lectura (`<-chan U`, donde `T` y `U` pueden ser el mismo tipo).
3.  Lanza internamente una goroutine que lee de la entrada, procesa, envía a la salida y cierra el canal resultante antes de terminar.

### Implementación del Patrón

A continuación, construiremos un pipeline de tres etapas. Observa cómo la firma uniforme de las funciones nos permite encadenarlas de forma elegante, creando una composición funcional de canales.

```go
package main

import (
	"fmt"
)

// Etapa 1: Generador (Source)
// Convierte una lista de enteros en un flujo de datos a través de un canal.
func generar(done <-chan struct{}, nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out) // El productor siempre cierra el canal
		for _, n := range nums {
			select {
			case out <- n:
			case <-done:
				return // Salida temprana si el pipeline se cancela
			}
		}
	}()
	return out
}

// Etapa 2: Multiplicador (Transformación)
// Recibe enteros, los eleva al cuadrado y los emite al siguiente canal.
func elevarCuadrado(done <-chan struct{}, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			select {
			case out <- (n * n):
			case <-done:
				return
			}
		}
	}()
	return out
}

// Etapa 3: Filtro (Condicional)
// Solo permite el paso de números pares.
func filtrarPares(done <-chan struct{}, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			if n%2 == 0 {
				select {
				case out <- n:
				case <-done:
					return
				}
			}
		}
	}()
	return out
}

func main() {
	// Canal global de cancelación para evitar fugas de goroutines
	done := make(chan struct{})
	defer close(done) // Se ejecutará al salir de main, cancelando etapas activas

	// Composición del Pipeline:
	// Generar -> Elevar al Cuadrado -> Filtrar Pares
	
	flujoInicial := generar(done, 1, 2, 3, 4, 5, 6, 7, 8)
	flujoCuadrados := elevarCuadrado(done, flujoInicial)
	flujoFinal := filtrarPares(done, flujoCuadrados)

	// Etapa Final: Consumidor (Sink)
	// Extrae los datos del final de la tubería.
	for resultado := range flujoFinal {
		fmt.Printf("Dato procesado: %d\n", resultado)
	}
	
	// Nota: Podríamos encadenarlo todo en una sola línea si no necesitamos 
	// referencias intermedias:
	// for res := range filtrarPares(done, elevarCuadrado(done, generar(done, 1...)))
}
```

### Lineamientos Avanzados para Pipelines en Producción

Diseñar un pipeline básico es sencillo, pero mantenerlo robusto frente a errores y cuellos de botella requiere atención a ciertos principios:

* **Propiedad de los Canales (Channel Ownership):** El principio idiomático en Go dicta que **la goroutine que crea el canal es la responsable de escribir en él y de cerrarlo**. Ninguna etapa intermedia debe cerrar su canal de entrada (el *upstream*), solo debe cerrar el canal de salida que ella misma instanció.
* **Gestión de Errores (Error Handling):** En el ejemplo usamos tipos primitivos (`int`). En un sistema real, si la Etapa 2 falla al procesar un dato, ¿cómo se entera la Etapa 3 o el consumidor final? La convención es crear un `struct` que encapsule el dato y el error (similar a lo que hicimos en el *Worker Pool* con `Result`), o mantener un canal de errores separado que todas las etapas compartan y envíen información allí.
* **Cuellos de Botella y Buffering:** Si la etapa `elevarCuadrado` toma 100ms y `filtrarPares` toma 1 segundo, el pipeline completo avanzará a la velocidad de la etapa más lenta, bloqueando hacia atrás (Backpressure natural). Para mitigar esto, podemos introducir **canales con búfer** en las etapas intermedias o aplicar un patrón **Fan-out** en la etapa lenta para paralelizarla.
* **Cancelación Explícita:** El uso del canal `done` es no negociable. Sin él, si el consumidor (el ciclo `for` en `main`) decide salir prematuramente (por ejemplo, con un `break` tras encontrar el primer error), las goroutines de las etapas superiores quedarán bloqueadas para siempre intentando escribir en sus canales de salida respectivos, provocando un severo *Goroutine Leak*.

## 11.4. Patrón Semaphore

En el Capítulo 10.1 exploramos cómo `sync.Mutex` garantiza exclusión mutua, permitiendo que solo *una* goroutine acceda a una sección crítica a la vez. Sin embargo, ¿qué sucede si nuestro recurso subyacente puede manejar concurrentemente hasta $N$ operaciones, pero no más? Por ejemplo, una base de datos que admite un máximo de 50 conexiones simultáneas, o una API de terceros que nos penaliza si excedemos las 10 peticiones por segundo.

Aquí es donde brilla el patrón **Semaphore** (Semáforo). A diferencia de un Mutex (que conceptualmente es un semáforo binario de capacidad 1), un semáforo contador permite que hasta $N$ goroutines adquieran el "permiso" de ejecución simultáneamente.

### Implementación Idiomática con Canales con Búfer

Aunque otros lenguajes proporcionan clases específicas en su biblioteca estándar para semáforos, en Go la forma más idiomática, elegante y eficiente de implementarlos es utilizando **canales con búfer** (discutidos en el Capítulo 9.1).

La mecánica es sorprendentemente simple:
1.  Creamos un canal con una capacidad igual al límite de concurrencia deseado.
2.  Para **adquirir** un permiso, enviamos un valor al canal. Si el búfer está lleno, la goroutine se bloquea hasta que haya espacio.
3.  Para **liberar** el permiso, leemos un valor del canal, liberando un espacio en el búfer para que otra goroutine en espera pueda avanzar.

Usamos el tipo `struct{}` (el *empty struct*) porque ocupa exactamente cero bytes de memoria, optimizando al máximo el patrón sin desperdiciar recursos en datos de señalización inútiles.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func main() {
	tareas := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	
	// Definimos el límite de concurrencia (Semáforo de capacidad 3)
	limiteConcurrencia := 3
	semaforo := make(chan struct{}, limiteConcurrencia)
	
	var wg sync.WaitGroup

	fmt.Printf("Iniciando procesamiento de %d tareas (Max %d concurrentes)\n", len(tareas), limiteConcurrencia)

	for _, tarea := range tareas {
		wg.Add(1)
		
		// A diferencia del Worker Pool, aquí lanzamos una goroutine por CADA tarea
		go func(id int) {
			defer wg.Done()

			// 1. Acquire (Adquirir permiso)
			// Bloquea la ejecución si el canal ya tiene 3 elementos
			semaforo <- struct{}{} 

			// 2. Sección Crítica Limitada
			fmt.Printf("-> Tarea %d en ejecución...\n", id)
			time.Sleep(1 * time.Second) // Simulamos trabajo I/O o de red
			fmt.Printf("<- Tarea %d completada\n", id)

			// 3. Release (Liberar permiso)
			// Extrae un elemento, permitiendo que otra goroutine avance
			<-semaforo 
		}(tarea)
	}

	// Esperamos a que todas las goroutines finalicen su ciclo de vida
	wg.Wait()
	fmt.Println("Todas las tareas han finalizado de forma controlada.")
}
```

### Semáforos Ponderados (Weighted Semaphores)

La implementación basada en canales es perfecta para casos donde cada tarea "cuesta" lo mismo (1 permiso = 1 espacio en el búfer). Sin embargo, en sistemas avanzados, ciertas operaciones pueden consumir más recursos que otras. Por ejemplo, una consulta ligera a base de datos podría costar 1 permiso, pero la generación de un reporte masivo podría costar 5.

Para estos escenarios, el ecosistema extendido de Go proporciona el subpaquete oficial `golang.org/x/sync/semaphore`. Este paquete expone una estructura `Weighted` que permite adquirir múltiples permisos atómicamente (`Acquire(ctx, n)`), y se integra de forma nativa con el paquete `context` (que veremos en el Capítulo 13) para soportar cancelaciones y límites de tiempo de espera, evitando que una goroutine se quede esperando permisos indefinidamente.

### Semaphore vs. Worker Pool

Ambos patrones resuelven el problema de limitar la concurrencia, pero lo hacen con enfoques opuestos respecto a la gestión de memoria y el ciclo de vida. Entender cuándo aplicar cada uno es un indicador clave de madurez arquitectónica en Go:

| Característica | Patrón Semaphore (Canales con Búfer) | Patrón Worker Pool |
| :--- | :--- | :--- |
| **Creación de Goroutines** | Dinámica: Crea $M$ goroutines (una por cada tarea entrante). | Estática: Crea exactamente $N$ goroutines de larga duración. |
| **Gestión de Memoria** | Riesgosa ante picos masivos. Si entran 1 millón de peticiones, se crearán 1 millón de goroutines (bloqueadas, pero vivas), consumiendo RAM. | Segura y constante. No importa si hay 1 o 1 millón de tareas en cola, solo existen $N$ goroutines vivas. |
| **Complejidad del Código** | Muy baja. Se implementa encapsulando el inicio y fin de la goroutine con envío/recepción en el canal. | Alta. Requiere orquestación cuidadosa de canales de entrada/salida y manejo preciso de cierres. |
| **Caso de Uso Ideal** | Tareas finitas, procesos *batch* limitados o scripts locales donde la simplicidad prima sobre la presión de memoria extrema. | Servidores web de alta disponibilidad, demonios continuos y sistemas donde la resiliencia y el control de *Heap* son innegociables. |

