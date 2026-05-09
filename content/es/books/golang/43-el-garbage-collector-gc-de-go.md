La gestión automática de memoria es uno de los pilares que permite a Go equilibrar la productividad del desarrollador con el rendimiento de sistemas críticos. A diferencia de lenguajes con gestión manual, Go libera al programador de la carga de rastrear cada asignación, pero lo hace bajo una filosofía única: priorizar la **latencia mínima** sobre el *throughput* total. En este capítulo, desglosaremos la arquitectura **Concurrent Mark and Sweep**, el algoritmo de coloreado tricolor y los mecanismos de precisión como el *Pacing* y el *GOMEMLIMIT*. Comprender estos internos es vital para diagnosticar cuellos de botella y diseñar aplicaciones que escalen sin fricciones.

## 43.1. Arquitectura del recolector de basura: Concurrent Mark and Sweep

A diferencia de lenguajes como Java o C#, que tradicionalmente confían en recolectores de basura generacionales (dividiendo el *Heap* en generaciones jóvenes y viejas) y compactadores, Go ha optado por un enfoque distinto: un **Recolector de Basura (GC) concurrente, no generacional y no compactador, basado en el algoritmo de Marcado y Barrido (Mark and Sweep)**.

La decisión de no hacer un GC generacional se fundamenta en una característica intrínseca del compilador de Go que exploraremos en el Capítulo 44: el **Análisis de Escape**. Dado que el compilador de Go es excepcionalmente eficiente alojando objetos de vida corta en el *Stack* (los cuales se limpian automáticamente al retornar la función), el *Heap* de Go contiene principalmente objetos de vida larga. Esto anula gran parte de la ventaja de recolectar generaciones jóvenes.

La arquitectura del GC de Go prioriza un objetivo por encima de todo: **la latencia predecible**. Para lograrlo, el diseño minimiza los tiempos en los que la aplicación debe detenerse por completo para que el GC haga su trabajo.

### El Algoritmo Tricolor (Tri-color Mark and Sweep)

El núcleo del motor de marcado de Go es el algoritmo tricolor. Este modelo conceptual clasifica todos los objetos del *Heap* en tres conjuntos de colores durante el ciclo de recolección:

* **Blanco (White):** Objetos que son potencialmente basura. Al inicio del ciclo del GC, todos los objetos en el *Heap* son blancos. Si al final de la fase de marcado un objeto sigue siendo blanco, se considera inalcanzable y su memoria es liberada.
* **Gris (Gray):** Objetos que el GC ha identificado como alcanzables (están en uso), pero cuyos descendientes (los punteros que contienen hacia otros objetos) aún no han sido escaneados.
* **Negro (Black):** Objetos que el GC ha identificado como alcanzables y, además, todos los punteros que contienen ya han sido escaneados e insertados en la cola de objetos grises.

El proceso de marcado sigue un bucle continuo hasta vaciar la lista de objetos grises:

1. Se extrae un objeto de la lista de grises y se marca como negro.
2. Se inspeccionan todos los punteros dentro de ese objeto.
3. Cualquier objeto blanco referenciado por esos punteros se marca como gris y se añade a la cola de escaneo.
4. El proceso se repite hasta que no queden objetos grises.

Veamos un ejemplo de código simple para ilustrar cómo se formaría este grafo de referencias en memoria:

```go
package main

type Nodo struct {
    Valor    int
    Siguiente *Nodo
    Hermano   *Nodo
}

func main() {
    // Raíz (Root): Variable local en el Stack que apunta al Heap
    raiz := &Nodo{Valor: 1} // Pasa de Blanco a Gris al inicio del escaneo
    
    // Estos nodos nacen Blancos
    nodo2 := &Nodo{Valor: 2}
    nodo3 := &Nodo{Valor: 3}
    
    // Se establecen las relaciones (Grafo)
    raiz.Siguiente = nodo2
    raiz.Hermano = nodo3
    
    // Cuando el GC escanee 'raiz' (convirtiéndolo en Negro), 
    // descubrirá 'nodo2' y 'nodo3', marcándolos como Grises.
}
```

### Las fases del Garbage Collector en Go

El trabajo del GC no ocurre de forma instantánea. Se divide en fases precisas, algunas de las cuales corren concurrentemente con nuestro código (los *mutators*, en la jerga de diseño de compiladores), y otras que requieren pausar la ejecución.

1. **Sweep Termination (Fin del barrido):** El GC asegura que cualquier fase de barrido (limpieza) del ciclo anterior haya terminado. Esta fase detiene el mundo brevemente.
2. **Mark Setup (Preparación del marcado):** Se habilitan las "Barreras de Escritura" (Write Barriers). Esto requiere detener todas las Goroutines simultáneamente (una pausa *Stop-The-World* que detallaremos en la sección 43.2).
3. **Concurrent Marking (Marcado concurrente):** Esta es la fase principal. El GC comienza a inspeccionar los "raíces" (Roots), que incluyen variables globales y los *Stacks* de todas las Goroutines activas, marcándolos como grises. A partir de ahí, el GC sigue el algoritmo tricolor. Lo crucial es que esto **ocurre concurrentemente**, utilizando un porcentaje de la CPU (típicamente el 25%) mientras tus Goroutines siguen ejecutándose.
4. **Mark Termination (Fin del marcado):** Detiene las Goroutines nuevamente para vaciar las últimas colas de trabajo, deshabilitar la barrera de escritura y calcular los metadatos para el próximo ciclo.
5. **Concurrent Sweep (Barrido concurrente):** Las Goroutines de la aplicación continúan su ejecución. En segundo plano, los hilos de barrido del GC recorren el *Heap* reclamando la memoria de los objetos que quedaron marcados como blancos.

### La Barrera de Escritura (Write Barrier)

Dado que la fase de *Concurrent Marking* ocurre al mismo tiempo que la ejecución de nuestro programa, surge un problema crítico: **¿Qué pasa si una Goroutine altera un puntero durante la fase de marcado?**

Imagina este escenario de colisión temporal:

1. El GC marca el Objeto A como Negro (ya fue escaneado).
2. El Objeto B es Gris y apunta al Objeto C (Blanco).
3. Una Goroutine en ejecución cambia las referencias: Hace que el Objeto A apunte al Objeto C, y elimina la referencia que el Objeto B tenía hacia C.
4. Cuando el GC inspecciona el Objeto B (pasándolo a Negro), no encuentra a C. Como el Objeto A ya es Negro, el GC no volverá a escanearlo.
5. Resultado fatal: El Objeto C se queda Blanco, pero está siendo utilizado por el Objeto A. En la fase de barrido, el GC eliminaría un objeto en uso, causando una corrupción de memoria o un *panic*.

Para evitar esto, durante la fase *Mark Setup*, Go activa la **Write Barrier** (Barrera de Escritura). Una barrera de escritura es un pequeño fragmento de código que el compilador inyecta automáticamente antes de cualquier operación de modificación de punteros en el *Heap*.

En Go 1.8 se introdujo la *Hybrid Write Barrier* (combinación de barrera de inserción de Dijkstra y barrera de borrado de Yuasa). Funciona bajo la siguiente regla simplificada: **Si durante la fase de marcado se sobreescribe un puntero en memoria, el objeto referenciado se marca automáticamente como gris**.

Esto garantiza que el GC no pierda rastro de ningún objeto que haya sido movido durante el escaneo concurrente, eliminando la necesidad de volver a escanear los *Stacks* de las Goroutines al final del ciclo y reduciendo drásticamente las latencias.

## 43.2. Entendiendo las pausas Stop-The-World (STW) y los Pacing algorithms

Aunque Go es célebre por su recolector de basura concurrente y de baja latencia, es un error común asumir que no existen interrupciones. El Garbage Collector de Go no está 100% libre de pausas; requiere detener la ejecución de la aplicación (los *mutators*) en momentos muy específicos para garantizar la integridad de la memoria. A este fenómeno se le conoce como **Stop-The-World (STW)**.

### Anatomía de una pausa Stop-The-World

En el ciclo de vida del GC de Go, descrito en la sección anterior, existen dos fases precisas que exigen un STW:

1. **Mark Setup (Preparación del marcado):** Antes de comenzar a buscar basura concurrentemente, el *runtime* debe detener todas las Goroutines para habilitar la *Write Barrier* (Barrera de Escritura). Esto asegura que ninguna Goroutine modifique punteros a espaldas del GC. Además, durante esta pausa se preparan las raíces (*Roots*) para el escaneo.
2. **Mark Termination (Fin del marcado):** Una vez que el marcado concurrente finaliza, el mundo se detiene de nuevo. Esta pausa sirve para vaciar las colas de trabajo restantes, deshabilitar la *Write Barrier* y calcular los metadatos necesarios para el próximo ciclo (labor del *Pacer*, que veremos a continuación).

En versiones modernas de Go (1.14 en adelante), el *runtime* utiliza **preempción asíncrona basada en señales** (como `SIGURG` en sistemas Unix). Esto significa que el planificador no tiene que esperar a que una Goroutine haga una llamada a una función para detenerla; puede interrumpir bucles densos y detener todas las Goroutines casi instantáneamente. Gracias a esto, **las pausas STW en Go suelen durar menos de un milisegundo**, independientemente del tamaño del *Heap*.

Podemos inspeccionar estas pausas programáticamente utilizando el paquete `runtime`:

```go
package main

import (
 "fmt"
 "runtime"
 "time"
)

func main() {
 // Generamos algo de presión de memoria para forzar el GC
 go func() {
  for {
   _ = make([]byte, 10<<20) // 10 MB allocations
   time.Sleep(10 * time.Millisecond)
  }
 }()

 time.Sleep(2 * time.Second) // Dejamos que el GC actúe

 var m runtime.MemStats
 runtime.ReadMemStats(&m)

 fmt.Printf("Total de ciclos GC: %d\n", m.NumGC)
 fmt.Printf("Tiempo total en STW (Nanosegundos): %d\n", m.PauseTotalNs)
 
 // El arreglo circular PauseNs guarda las últimas 256 pausas STW
 ultimoSTW := m.PauseNs[(m.NumGC+255)%256] 
 fmt.Printf("Duración de la última pausa STW: %d ns (%.3f ms)\n", ultimoSTW, float64(ultimoSTW)/1e6)
}
```

### El Algoritmo Pacing (The GC Pacer)

Si el GC requiere pausas y consume hasta un 25% de la CPU durante su fase concurrente, la pregunta arquitectónica clave es: **¿Cuándo debe iniciar un ciclo el GC?**

Si comienza demasiado tarde, la aplicación se quedará sin memoria (Out Of Memory - OOM). Si comienza demasiado pronto, se desperdiciarán ciclos de CPU innecesariamente, degradando el rendimiento de la aplicación. Para resolver este problema, Go utiliza un bucle de retroalimentación de control (similar a un controlador PID) conocido como **The Pacer**.

El trabajo del Pacer es predecir el futuro. Observa la tasa de asignación de memoria actual de la aplicación y decide el momento exacto para lanzar la fase de marcado concurrente, con el objetivo de que el marcado termine *justo antes* de que el *Heap* alcance su tamaño objetivo.

El tamaño objetivo del *Heap* está determinado por la siguiente ecuación matemática evaluada por el *runtime*:

$$\text{Heap}_{target} = \text{Heap}_{live} \times \left(1 + \frac{\text{GOGC}}{100}\right)$$

Donde:

* $\text{Heap}_{target}$: Es el límite máximo de memoria que el *Heap* debería alcanzar antes de que finalice la recolección actual.
* $\text{Heap}_{live}$: Es la cantidad de memoria viva (sobreviviente) contabilizada al final del último ciclo del GC.
* $\text{GOGC}$: Es la variable de entorno de configuración (cuyo valor por defecto es 100).

Si $\text{GOGC} = 100$, el objetivo del *Heap* será el doble del tamaño de la memoria viva. El Pacer calcula un **Trigger Ratio** (radio de disparo). Por ejemplo, si estima que la aplicación está asignando memoria muy rápidamente, podría disparar el GC cuando el *Heap* haya crecido solo un 60% por encima del *Heap* vivo, dándole tiempo suficiente al escáner concurrente para terminar antes de llegar al 100% (el límite objetivo).

#### Mark Assists: Cuando las Goroutines tienen que ayudar

El Pacer tiene un mecanismo de defensa adicional. ¿Qué ocurre si la aplicación (los *mutators*) empieza a asignar memoria frenéticamente *durante* la fase de marcado, superando la velocidad a la que el GC escanea objetos?

El Pacer detectará que no va a llegar a la meta a tiempo. Para evitar sobrepasar el $\text{Heap}_{target}$ o consumir toda la RAM del sistema operativo, el *runtime* obligará a las Goroutines que están asignando memoria a detener su trabajo principal y ayudar temporalmente al Garbage Collector a marcar objetos. Esto se conoce como **Mark Assists** (Asistencia de Marcado).

Los Mark Assists funcionan como una penalización automática: cuanto más rápido intentas asignar memoria, más trabajo de recolección de basura el *runtime* te obliga a realizar, ralentizando la Goroutine y permitiendo que el GC recupere el control de la situación. Si observas picos inexplicables de latencia en tu aplicación que no corresponden a un STW, frecuentemente se deben a Goroutines atrapadas realizando Mark Assists.

## 43.3. Ajuste fino del GC en producción (`GOGC`, `GOMEMLIMIT`)

Históricamente, uno de los grandes orgullos del equipo de Go ha sido ofrecer un Garbage Collector que prácticamente no requiere configuración. A diferencia de la Máquina Virtual de Java (JVM), que expone decenas de *flags* para afinar el recolector, Go expone una superficie de configuración deliberadamente minimalista.

Sin embargo, en arquitecturas de alto rendimiento o en entornos de contenedores con recursos estrictamente limitados (como Kubernetes), los valores por defecto pueden no ser los óptimos. Para estos casos, Go proporciona dos palancas fundamentales: `GOGC` y, a partir de Go 1.19, `GOMEMLIMIT`.

### GOGC: El equilibrio entre CPU y Memoria

Como vimos en la sección anterior, el *Pacer* del GC utiliza una fórmula para determinar el tamaño objetivo del *Heap*. La única variable de esa ecuación que podemos controlar directamente es `GOGC` (Go Garbage Collector target percentage).

$$Heap_{target} = Heap_{live} \times \left(1 + \frac{GOGC}{100}\right)$$

Por defecto, **`GOGC=100`**. Esto significa que el *runtime* permitirá que el *Heap* asigne un 100% más de memoria (el doble) respecto a los objetos vivos que sobrevivieron al último ciclo antes de forzar una nueva recolección.

Modificar este valor altera directamente el compromiso ( *trade-off* ) entre el uso de memoria y el consumo de CPU:

* **Reducir `GOGC` (ej. `GOGC=50`):** El GC se disparará con mayor frecuencia (cuando el *Heap* crezca un 50%).
  * *Ventaja:* Mantendrás una huella de memoria (RAM) mucho más baja y predecible.
  * *Desventaja:* El programa gastará más ciclos de CPU ejecutando las fases concurrentes del GC y pagará el costo de las pausas *Stop-The-World* más a menudo. El rendimiento general ( *throughput* ) de tu aplicación disminuirá.
* **Aumentar `GOGC` (ej. `GOGC=200` o `GOGC=1000`):** El GC se ejecutará con mucha menos frecuencia.
  * *Ventaja:* La aplicación gastará menos CPU en recolección de basura, mejorando significativamente el *throughput* y reduciendo la frecuencia de latencias inducidas por el GC o los *Mark Assists*.
  * *Desventaja:* El consumo de RAM crecerá de forma agresiva.
* **Desactivar el GC (`GOGC=off`):** Deshabilita el recolector por completo. Solo es viable para programas efímeros (scripts CLI de corta duración) o sistemas donde la memoria se gestiona manualmente de forma extrema.

### El problema de los Contenedores y la llegada de GOMEMLIMIT

Durante años, `GOGC` fue suficiente para aplicaciones que corrían en máquinas virtuales enteras o servidores dedicados ( *bare metal* ). Sin embargo, en la era Cloud Native, surgió un problema grave: **los OOMKills (Out Of Memory Kills) en Kubernetes**.

Imagina un contenedor de Go con un límite de RAM de **500 MB** y `GOGC=100`. Si la aplicación tiene **300 MB** de datos vivos tras un ciclo, el Pacer calculará el próximo límite del *Heap* en **600 MB**. Como el *runtime* de Go cree que tiene espacio para crecer hasta los 600 MB, no disparará el GC a tiempo. El núcleo de Linux, al ver que el contenedor supera los 500 MB, enviará una señal `SIGKILL` y destruirá el Pod instantáneamente (OOMKilled).

Para solucionar esto, Go 1.19 introdujo **`GOMEMLIMIT`**.

`GOMEMLIMIT` establece un **límite de memoria suave (soft memory limit)** para el *runtime* de Go. A diferencia de un límite del sistema operativo (que mata el proceso de forma abrupta), el límite suave le dice al *Pacer* del GC: *"No me importa qué valor tenga GOGC; si el total de memoria consumida por Go se acerca a este límite, ejecuta el GC inmediatamente y de la forma más agresiva posible para evitar que el Sistema Operativo nos mate"*.

### La estrategia de optimización: Alto GOGC + GOMEMLIMIT

La combinación de estas dos variables ha creado un nuevo estándar de oro para el despliegue de microservicios en Go. La técnica consiste en **desactivar o subir masivamente el `GOGC` y confiar en el `GOMEMLIMIT`**.

Si tu contenedor de Kubernetes tiene un límite estricto de **1 GB** de RAM, la configuración ideal sería:

1. Establecer `GOMEMLIMIT` al 90% del límite del contenedor (ej. `900MiB`). Ese 10% de margen es para la memoria que no gestiona el GC (cachés del OS, memoria Cgo, etc.).
2. Desactivar `GOGC` (o establecerlo en un valor muy alto como `1000`).

Bajo esta configuración, tu aplicación aprovechará toda la RAM disponible en el contenedor casi sin interrupciones del GC (máximo rendimiento de CPU). El GC solo se despertará de forma reactiva cuando la memoria se acerque peligrosamente a los 900 MiB.

### Configuración programática

Aunque lo más común es pasar estos valores mediante variables de entorno en el `Dockerfile` o en el manifiesto de Kubernetes, Go permite modificar estos parámetros dinámicamente en tiempo de ejecución utilizando el paquete `runtime/debug`:

```go
package main

import (
 "fmt"
 "runtime/debug"
)

func main() {
 // 1. Configurar GOGC programáticamente
 // SetGCPercent devuelve el valor anterior. Un valor negativo desactiva el GC.
 oldGOGC := debug.SetGCPercent(200) 
 fmt.Printf("GOGC cambiado de %d a 200\n", oldGOGC)

 // 2. Configurar GOMEMLIMIT programáticamente
 // Establecemos un límite suave de 900 Megabytes (900 * 1024 * 1024 bytes)
 limiteBytes := int64(900 << 20)
 oldLimit := debug.SetMemoryLimit(limiteBytes)
 
 fmt.Printf("GOMEMLIMIT ajustado a 900 MiB. (Límite anterior: %d bytes)\n", oldLimit)
 
 // A partir de este punto, el Pacer usará las nuevas reglas para planificar el GC
}
```

Es crucial entender que `GOMEMLIMIT` no es una garantía absoluta. Si la memoria viva real (objetos que tu programa necesita sí o sí para funcionar) supera el límite, el GC se ejecutará en un bucle continuo (lo que se conoce como *Thrashing*), consumiendo el 100% de la CPU y eventualmente fallando. Ninguna configuración del *runtime* puede salvarte de un *memory leak* real.

## 43.4. Estrategias de minimización de presión sobre el GC

A lo largo de este capítulo hemos analizado la arquitectura y el ajuste del Garbage Collector. Sin embargo, en el desarrollo de software de alto rendimiento con Go existe una máxima ineludible: **el Garbage Collector más rápido es aquel que no necesita ejecutarse**.

La técnica de reducir las asignaciones de memoria en el *Heap* se conoce como *Allocation-less programming* (programación sin asignaciones) o *Zero-allocation*. Al generar menos basura, el *Pacer* tardará más en alcanzar el límite objetivo (`GOGC`), reduciendo la frecuencia de los ciclos de recolección y eliminando las pausas *Stop-The-World* y los *Mark Assists*.

A continuación, exploraremos las estrategias arquitectónicas y de código más efectivas para minimizar la presión sobre el GC.

### 1. Preasignación de Slices y Maps (Capacidad vs. Longitud)

El error más común que genera presión innecesaria sobre el GC es el crecimiento dinámico de Slices y Maps. Cuando un Slice supera su capacidad subyacente durante una operación `append`, el *runtime* de Go debe:

1. Asignar un nuevo bloque de memoria en el *Heap* (generalmente el doble del tamaño original).
2. Copiar los elementos del Slice antiguo al nuevo.
3. Abandonar el array original, convirtiéndolo instantáneamente en basura que el GC deberá recolectar.

Si conoces de antemano el tamaño (o una estimación cercana) de los datos, **siempre debes inicializar los Slices y Maps con su capacidad máxima**.

```go
package main

import "fmt"

func main() {
 datosOrigen := make([]int, 1000)

 // ANTI-PATRÓN: El slice crecerá dinámicamente, creando basura en cada reasignación.
 var resultadoMalo []int
 for _, v := range datosOrigen {
  resultadoMalo = append(resultadoMalo, v)
 }

 // PATRÓN CORRECTO: Se reserva la memoria de una sola vez. Cero basura generada.
 // Longitud 0, Capacidad 1000.
 resultadoBueno := make([]int, 0, len(datosOrigen))
 for _, v := range datosOrigen {
  resultadoBueno = append(resultadoBueno, v)
 }
 
 fmt.Printf("Capacidad Bueno: %d\n", cap(resultadoBueno))
}
```

### 2. Reutilización de objetos efímeros con `sync.Pool`

En servidores web o procesadores de flujos de datos, es común crear estructuras temporales para cada petición (como búferes de bytes para leer cuerpos de peticiones HTTP o estructuras para codificar/decodificar JSON). Si tienes 10,000 peticiones por segundo, estarás instanciando y destruyendo 10,000 objetos por segundo en el *Heap*.

Para evitar esto, la Standard Library ofrece `sync.Pool` (que vimos a nivel de concurrencia en el Capítulo 10). `sync.Pool` actúa como una caché segura para concurrencia que permite guardar objetos temporalmente inactivos y reutilizarlos en futuras operaciones, en lugar de pedirle nueva memoria al sistema.

Un detalle técnico crucial que vincula `sync.Pool` con el GC es que **el Garbage Collector vacía automáticamente todos los `sync.Pool` al inicio de cada ciclo de recolección (en la fase STW de *Mark Setup*)**. Esto asegura que los *pools* no causen fugas de memoria a largo plazo.

```go
package main

import (
 "bytes"
 "sync"
)

// Creamos un Pool global para buffers de bytes
var bufferPool = sync.Pool{
 New: func() interface{} {
  // Esta función solo se ejecuta si el Pool está vacío
  return new(bytes.Buffer)
 },
}

func procesarPeticion(datos []byte) string {
 // 1. Solicitamos un buffer al Pool (Reutilización)
 buf := bufferPool.Get().(*bytes.Buffer)
 
 // 2. Limpiamos el estado del buffer antes de usarlo
 buf.Reset()
 
 // 3. Deferimos su devolución al Pool para que otra Goroutine lo use
 defer bufferPool.Put(buf)
 
 // Usamos el buffer sin generar asignaciones en el Heap
 buf.Write(datos)
 buf.WriteString(" procesado")
 
 return buf.String()
}
```

### 3. Semántica de Valores vs. Semántica de Punteros

En lenguajes como Java o C#, los objetos siempre se asignan en el *Heap* y se pasan por referencia. En Go, tienes el control explícito: puedes pasar un *Struct* por valor (una copia) o por puntero.

Un mito común en Go es pensar que "pasar por puntero siempre es más rápido porque evita copiar datos". Aunque es cierto que un puntero (8 bytes en sistemas de 64 bits) es muy barato de copiar, **usar punteros frecuentemente provoca que el compilador asigne el objeto en el *Heap* en lugar de en el *Stack***.

Si pasas un objeto por valor (copia), el compilador de Go es extremadamente eficiente alojándolo en el *Stack* de la Goroutine. Cuando la función termina, el *Stack* se retrae y la memoria se libera instantáneamente en milisegundos, **sin intervención del Garbage Collector**.

Como regla general para minimizar la presión sobre el GC:

* Utiliza **semántica de valores** (copias en el *Stack*) para estructuras de datos pequeñas y de ciclo de vida corto.
* Utiliza **semántica de punteros** (asignaciones en el *Heap*) solo si necesitas compartir el estado de ese objeto y mutarlo, o si la estructura de datos es masiva (por ejemplo, megabytes de tamaño) y el costo de copia en CPU supera el costo del GC.

### 4. Construcción eficiente de Strings

Las cadenas de texto (`string`) en Go son inmutables. Cada vez que concatenas dos cadenas usando el operador `+`, el *runtime* tiene que asignar un nuevo bloque de memoria en el *Heap* con el tamaño combinado, copiar ambas cadenas y abandonar la anterior. Si haces esto en un bucle, destrozarás el rendimiento de tu aplicación por la enorme presión generada sobre el GC.

Para concatenaciones complejas o en bucles, utiliza siempre `strings.Builder`. Esta estructura utiliza un *Slice* de bytes subyacente que minimiza las reasignaciones y, mediante trucos con el paquete `unsafe` en su código fuente interno, convierte el resultado a `string` sin realizar una copia extra al final.

```go
package main

import (
 "fmt"
 "strings"
)

func generarInforme(lineas []string) string {
 var builder strings.Builder
 
 // Si sabemos aproximadamente el tamaño final, preasignamos la memoria del builder
 // para evitar que su buffer interno tenga que crecer.
 builder.Grow(len(lineas) * 50) 
 
 for _, linea := range lineas {
  builder.WriteString(linea)
  builder.WriteString("\n")
 }
 
 // La llamada a String() no copia el buffer interno, es una operación de O(1)
 return builder.String() 
}
```
