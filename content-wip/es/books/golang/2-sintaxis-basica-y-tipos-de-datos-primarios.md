La potencia de Go no reside en una complejidad sintáctica abrumadora, sino en su capacidad para ser explícito, seguro y predecible. En este capítulo, desglosaremos los átomos del lenguaje: cómo reservar memoria mediante la declaración de variables y constantes, y cómo el sistema de tipos protege la integridad de nuestros datos. Analizaremos el operador de declaración corta `:=`, una herramienta de productividad clave, y el rigor de Go al prohibir conversiones implícitas de tipos. Finalmente, exploraremos la gestión del ámbito léxico y el uso del identificador en blanco, pilares fundamentales para mantener un código limpio, eficiente y libre de efectos secundarios indeseados.

## 2.1. Declaración de variables, constantes y el operador `:=`

Go es un lenguaje de tipado estático, lo que significa que el tipo de cada variable debe conocerse en tiempo de compilación. Sin embargo, su sintaxis está diseñada para ser concisa y pragmática, ofreciendo múltiples formas de declarar e inicializar el estado de una aplicación sin la verbosidad típica de otros lenguajes compilados.

A continuación, desglosaremos los mecanismos fundamentales para reservar memoria y asignar valores en Go.

### La palabra clave `var` y los "Zero Values"

La forma más explícita de declarar una variable en Go es utilizando la palabra clave `var`, seguida del nombre de la variable y su tipo. 

Una de las características más importantes de Go es que **no existen las variables sin inicializar**. Si declaras una variable pero no le asignas un valor explícito, el compilador le asignará automáticamente su *Zero Value* (valor cero) por defecto. Esto elimina una categoría entera de bugs relacionados con memoria no inicializada.

```go
package main

import "fmt"

func main() {
    // Declaración explícita sin inicialización (adquiere el Zero Value)
    var requestCount int 
    var isReady bool
    var serverName string

    fmt.Printf("Count: %d, Ready: %t, Name: %q\n", requestCount, isReady, serverName)
    // Salida: Count: 0, Ready: false, Name: ""
}
```

Go permite agrupar múltiples declaraciones en un solo bloque para mejorar la legibilidad, especialmente útil a nivel de paquete (fuera de las funciones). También permite inferir el tipo si se inicializa la variable en la misma línea:

```go
// Declaración agrupada a nivel de paquete
var (
    maxConnections = 100       // El compilador infiere que es int
    apiEndpoint    = "/api/v1" // El compilador infiere que es string
    debugMode      bool        // Zero value: false
)
```

### El operador de declaración corta `:=`

Para mitigar la redundancia visual de escribir `var` y el tipo de dato, Go introduce el operador de declaración corta `:=`. Este operador evalúa la expresión de la derecha, infiere el tipo de dato y declara la variable en un solo paso.

**Regla de oro:** El operador `:=` **solo puede utilizarse dentro del cuerpo de una función**. A nivel de paquete (global), es obligatorio usar `var`, `const` o `func`.

```go
func processData() {
    // Declaración e inicialización corta
    threshold := 10.5 
    status := "processing"

    // Múltiple declaración corta
    x, y := 50, 100
}
```

**La particularidad de la redeclaración:**
El operador `:=` tiene una flexibilidad diseñada específicamente para la ergonomía del manejo de errores en Go (que veremos a fondo en el Capítulo 4). Permite "redeclarar" una variable que ya existe en el mismo ámbito, **siempre y cuando haya al menos una variable nueva** en el lado izquierdo de la asignación.

```go
func loadConfig() {
    // Declaramos 'config' y 'err' por primera vez
    config, err := parseFile("config.json")
    
    // Aquí 'err' se REDECLARA (se le asigna un nuevo valor),
    // pero la operación es válida porque 'metrics' es una variable NUEVA.
    metrics, err := parseFile("metrics.json") 
}
```
*(Nota: El uso descuidado de `:=` en bloques anidados puede llevar a problemas de "Shadowing", un concepto que abordaremos en detalle en la sección 2.4).*

### Constantes y el sistema de tipos no tipados

Las constantes en Go se declaran con la palabra clave `const` y, a diferencia de las variables, su valor debe poder evaluarse íntegramente en tiempo de compilación. No puedes asignar el resultado de una función en tiempo de ejecución a una constante.

El sistema de constantes de Go es excepcionalmente potente porque introduce el concepto de **constantes no tipadas (untyped constants)**. Una constante numérica no tipada tiene una precisión matemática arbitraria (infinita) hasta el momento exacto en que se utiliza en un contexto que requiere un tipo estricto.

```go
const (
    // Constante tipada (estrictamente un float32)
    Pi float32 = 3.14159

    // Constante no tipada (precisión arbitraria)
    Avogadro = 6.02214076e23 
)
```

### Enumeraciones mágicas con `iota`

Go no tiene una palabra clave `enum` tradicional. En su lugar, utiliza el identificador predeterminado `iota` dentro de bloques `const` para generar secuencias de números incrementales automáticamente. `iota` comienza en `0` y se incrementa en `1` por cada línea en el bloque constante.

```go
type ApplicationState int

const (
    // iota empieza en 0
    StateStarting ApplicationState = iota 
    StateRunning                          // iota es 1
    StatePaused                           // iota es 2
    StateStopped                          // iota es 3
)

// iota se reinicia a 0 en cada nuevo bloque const
const (
    FlagNone = 1 << iota // 1 << 0 == 1
    FlagRead             // 1 << 1 == 2
    FlagWrite            // 1 << 2 == 4
    FlagExecute          // 1 << 3 == 8
)
```

El uso de `iota` combinado con operaciones a nivel de bits (como los desplazamientos `<<`) es el patrón idiomático en Go para crear máscaras de bits o estados mutuamente excluyentes, ofreciendo un control de bajo nivel muy elegante.

## 2.2. Tipos de datos numéricos, booleanos y cadenas de texto

A diferencia de lenguajes con tipado dinámico o jerarquías de objetos complejas para los tipos primitivos, Go ofrece un conjunto de tipos de datos integrados riguroso, diseñado para ser eficiente a nivel de máquina y explícito para el desarrollador. Comprender cómo Go representa la información básica en memoria es el primer paso para escribir código de alto rendimiento.

### El tipo Booleano (`bool`)

El tipo `bool` representa un valor de verdad que solo puede ser `true` o `false`. Su *Zero Value* es siempre `false`.

Un aspecto crucial en Go, a diferencia de lenguajes como C o Python, es que **no existe la conversión implícita entre enteros y booleanos**. Un `0` no es `false`, y un `1` no es `true`. Las condiciones en las sentencias de control de flujo requieren evaluaciones estrictamente booleanas.

```go
func evaluateStatus(isActive bool) {
    // Correcto:
    if isActive { /* ... */ }

    // Incorrecto (no compilará si flag es int):
    // var flag int = 1
    // if flag { /* ... */ } 
}
```

### Tipos Numéricos: Precisión y Arquitectura

Go ofrece una rica variedad de tipos numéricos, divididos principalmente en enteros, números de punto flotante y números complejos. La elección del tipo correcto impacta directamente en el consumo de memoria y en la prevención de desbordamientos (overflows).

**1. Enteros específicos por tamaño:**
Garantizan el tamaño en memoria independientemente de la arquitectura del sistema.
* **Con signo:** `int8`, `int16`, `int32`, `int64`
* **Sin signo:** `uint8`, `uint16`, `uint32`, `uint64`

**2. Alias integrados:**
Go proporciona dos alias fundamentales para mejorar la semántica del código:
* `byte`: Alias exacto de `uint8`. Se utiliza por convención para distinguir datos binarios en bruto de simples operaciones matemáticas.
* `rune`: Alias exacto de `int32`. Representa un *code point* de Unicode (trataremos esto con mayor profundidad junto con las cadenas en el Capítulo 14).

**3. Enteros dependientes de la arquitectura:**
Los tipos `int` y `uint` tienen el tamaño de la palabra nativa de la plataforma de compilación (32 bits en sistemas de 32 bits, y 64 bits en sistemas de 64 bits). 

> **Nota arquitectónica:** A menos que estés optimizando estructuras de datos muy grandes donde el ahorro de memoria sea crítico (usando `int8` o `int16`), la convención idiomática en Go es utilizar `int` para contadores, longitudes y aritmética general.

**4. Números de Punto Flotante y Complejos:**
Go implementa el estándar IEEE-754 para números fraccionarios:
* `float32` y `float64`
* `complex64` y `complex128` (con partes reales e imaginarias integradas a nivel sintáctico).

En la práctica profesional, casi siempre preferirás `float64`, ya que las matemáticas con `float32` acumulan errores de redondeo rápidamente. El compilador de Go, de hecho, infiere `float64` por defecto cuando usas el operador `:=` con un número decimal.

```go
func mathExamples() {
    // Inferencia a float64
    ratio := 3.1415 

    // Uso de números complejos nativos
    c := 3 + 4i 
    
    // Al mezclar tipos, Go requiere conversión explícita (lo veremos en 2.3)
    var a int32 = 10
    var b int64 = 20
    // sum := a + b // ERROR: invalid operation: mismatched types int32 and int64
}
```

### Cadenas de Texto (`string`)

En Go, un `string` es fundamentalmente una **secuencia inmutable de bytes**. Esto significa que una vez que se crea una cadena, no puedes alterar sus bytes individuales directamente en esa misma dirección de memoria.

Si intentas modificar un índice específico de un `string`, el compilador arrojará un error. Para modificar un texto, debes reasignar la variable completa (lo que genera un nuevo bloque de memoria bajo el capó) o convertirla a un slice de bytes/runas, manipularlo y volverlo a convertir.

```go
func stringManipulation() {
    greeting := "Hello"
    
    // ERROR: cannot assign to greeting[0]
    // greeting[0] = 'Y' 

    // Forma correcta (reasignación completa):
    greeting = "Yello"

    // La función nativa len() devuelve el número de BYTES, no de caracteres
    length := len(greeting) 
}
```

Por defecto, Go asume que el texto está codificado en UTF-8, lo cual es vital al recorrer cadenas con caracteres especiales o emojis, ya que un solo símbolo visual puede ocupar múltiples bytes. El análisis de esta característica y las herramientas del paquete `unicode` se abordarán exhaustivamente en la Parte 4 del libro.

## 2.3. Conversión de tipos explícita (Casting)

En el ecosistema de Go, la seguridad del sistema de tipos es una prioridad absoluta de diseño. A diferencia de lenguajes como C, C++ o JavaScript, donde el compilador o el intérprete realizan "coerciones" o conversiones implícitas en segundo plano (por ejemplo, sumar un entero a un número de punto flotante de forma transparente), Go adopta una postura estricta: **no existe la conversión de tipos implícita**. 

Si tienes una variable de tipo `int32` y otra de tipo `int64`, no puedes sumarlas directamente, ni siquiera asignarlas entre sí. El compilador exigirá que el desarrollador manifieste su intención de forma unívoca.

Aunque en la industria a menudo se utiliza el término "Casting" de forma intercambiable, en la especificación formal de Go se denomina **Type Conversion** (Conversión de tipos). Esta distinción semántica es importante: mientras que en C un "cast" a menudo instruye al compilador a reinterpretar un bloque de memoria subyacente de una manera diferente (sin alterar los bits), una conversión en Go puede requerir trabajo adicional en tiempo de ejecución, como asignación de memoria, copia de datos o truncamiento matemático.

La sintaxis general para la conversión de tipos es directa y se asemeja a la llamada de una función: `T(v)`, donde `T` es el tipo destino y `v` es el valor a convertir.

### Conversiones Numéricas: Truncamiento y Desbordamiento

Las operaciones de conversión más comunes ocurren entre los diferentes tipos numéricos. Al convertir datos, debemos estar hipervigilantes ante dos fenómenos: la pérdida de precisión y el desbordamiento (overflow).

**1. Truncamiento de punto flotante a entero:**
Cuando conviertes un número de punto flotante (`float32` o `float64`) a cualquier tipo de entero (`int`, `uint`, etc.), Go no redondea al número más cercano; simplemente **trunca** (descarta) la parte fraccionaria.

```go
package main

import "fmt"

func mathConversions() {
    var pi float64 = 3.14159265
    
    // Conversión explícita requerida de float64 a int
    var truncatedPi int = int(pi) 
    
    fmt.Println(truncatedPi) // Salida: 3
}
```

**2. Conversiones estrechas (Narrowing) y Desbordamiento:**
El término *narrowing* se refiere a la conversión de un tipo de dato con mayor capacidad de almacenamiento a uno con menor capacidad (por ejemplo, de `int32` a `int8`). Si el valor original excede los límites matemáticos del tipo destino, Go no generará un pánico (panic) en tiempo de ejecución. En su lugar, los bits de mayor peso se truncan (se descartan), lo que resulta en un desbordamiento silencioso (wrap-around) que puede introducir bugs lógicos muy difíciles de rastrear.

```go
func overflowExample() {
    var largeNum int16 = 300
    
    // int8 solo puede almacenar valores de -128 a 127.
    // Al convertir 300 a int8, los bits excedentes se cortan.
    var smallNum int8 = int8(largeNum)
    
    fmt.Println(smallNum) // Salida: 44 (Comportamiento de wrap-around binario)
}
```
*Mejor práctica:* Como arquitectos de software en Go, debemos asegurarnos de que el valor original esté dentro del rango seguro del tipo destino antes de forzar una conversión estrecha, especialmente al lidiar con protocolos de red o I/O, donde los tamaños de los tipos están dictados por estándares externos.

### Conversiones entre Strings y Slices de Bytes o Runas

Como analizamos en la sección anterior, los `string` son secuencias inmutables de bytes. Sin embargo, la manipulación intensiva de texto a menudo requiere mutabilidad. Go permite la conversión directa entre `string` y `[]byte` (slices de bytes) o `[]rune` (slices de runas).

Bajo el capó, estas conversiones **implican la asignación de memoria (allocation) y la copia profunda (deep copy) de los datos subyacentes** para garantizar que se mantenga la inmutabilidad del `string` original.

```go
func stringSlices() {
    texto := "Go Rápido" // Incluye el carácter 'á' que ocupa más de 1 byte

    // 1. String a Slice de Bytes (Muestra la estructura en crudo)
    byteSlice := []byte(texto) 
    
    // 2. String a Slice de Runas (Descompone el texto por Code Points Unicode)
    runeSlice := []rune(texto) 
    
    // 3. Restaurar a String
    restoredString := string(byteSlice)
}
```
*(Nota de rendimiento: En rutas de código críticas de latencia (hot paths), las constantes asignaciones por conversiones `string <-> []byte` pueden presionar al Garbage Collector. En el Capítulo 44 exploraremos técnicas avanzadas con el paquete `unsafe` para evitar estas copias, asumiendo los riesgos correspondientes).*

### El peligro de convertir enteros a cadenas

Existe una "trampa" clásica en Go respecto a las conversiones. Dada la sintaxis `T(v)`, es intuitivo pensar que `string(65)` devolverá la cadena `"65"`. Sin embargo, esto no es así.

Cuando aplicas la conversión de tipo `string()` directamente sobre un valor entero (cualquiera de la familia `int` o `uint`), Go interpreta ese entero como un punto de código Unicode (una runa) y genera una cadena que contiene la representación de ese único carácter.

```go
func intToStringTrap() {
    var numero int = 65
    
    // ¡Peligro! Esto no genera "65". 
    // 65 en ASCII/Unicode corresponde a la letra 'A'.
    strInesperado := string(numero) 
    fmt.Println(strInesperado) // Salida: "A"
}
```

Para convertir el valor numérico *semántico* a su representación textual equivalente (es decir, el número literal `"65"`), es absolutamente obligatorio prescindir del operador de conversión básico y recurrir al paquete de la Standard Library `strconv` (String Conversions), específicamente a funciones como `strconv.Itoa` (Integer to ASCII) o `strconv.FormatInt`. Abordaremos las capacidades completas de este y otros paquetes auxiliares en la Parte 4 del libro, pero es vital internalizar esta distinción desde los cimientos del lenguaje.

## 2.4. Conversión entre cadenas y numéricos (El paquete `strconv`)

Como adelantamos en la sección anterior, la conversión de tipos básica `T(v)` es insuficiente y peligrosa cuando intentamos transformar el valor semántico de un número en texto, o viceversa. Debido a que las cadenas en Go no son numéricas por naturaleza, el lenguaje requiere operaciones de *parsing* (análisis sintáctico) y *formatting* (formateo) explícitas.

Para estas tareas, la Standard Library de Go proporciona el paquete `strconv` (String Conversions). Este paquete es fundamental para cualquier aplicación que procese entradas de usuario, lea archivos de configuración o interactúe con APIs REST, donde los números a menudo viajan codificados como texto.

### De String a Numérico (Parsing)

Convertir texto en números implica el riesgo inherente de que la cadena no contenga un número válido. Por ello, las funciones de *parsing* en Go **siempre retornan dos valores**: el resultado numérico y un valor de tipo `error` (un concepto que exploraremos a fondo en el Capítulo 4).

**1. Parseo a Enteros (`Atoi` y `ParseInt`)**

Para conversiones rápidas de texto a `int` en base 10, la función más idiomática es `strconv.Atoi` (ASCII to Integer).

Si necesitas control granular sobre la base numérica (binario, hexadecimal) o el tamaño del entero (para evitar desbordamientos), debes usar `strconv.ParseInt` o `strconv.ParseUint`. 

> **Advertencia de tipado:** `strconv.ParseInt` siempre retorna un `int64` por diseño. Si tu variable destino es de tipo `int` o `int32`, deberás aplicar una conversión explícita `int()` al resultado, *después* de comprobar que no hubo errores.

```go
package main

import (
    "fmt"
    "strconv"
)

func parseExamples() {
    // 1. Atoi (String a int)
    portStr := "8080"
    port, err := strconv.Atoi(portStr)
    if err == nil {
        fmt.Printf("Puerto: %d (Tipo: %T)\n", port, port) 
        // Salida: Puerto: 8080 (Tipo: int)
    }

    // 2. ParseInt (String a int64, especificando base 10 y tamaño 32 bits)
    idStr := "40593"
    id64, err := strconv.ParseInt(idStr, 10, 32)
    if err == nil {
        // Conversión segura de int64 a int32 porque especificamos 32 en ParseInt
        var id int32 = int32(id64) 
        _ = id // Uso del Blank identifier para evitar errores de compilación
    }
}
```

**2. Parseo a Punto Flotante (`ParseFloat`)**

De manera similar, `strconv.ParseFloat` permite extraer números decimales, especificando si la precisión esperada es de 32 o 64 bits. Al igual que con los enteros, siempre retorna el tipo más grande (`float64`).

```go
    priceStr := "19.99"
    price, err := strconv.ParseFloat(priceStr, 64)
```

### De Numérico a String (Formatting)

El proceso inverso, convertir un número puro en su representación de texto, no puede fallar y, por lo tanto, estas funciones solo retornan un único valor de tipo `string`.

**1. Formateo de Enteros (`Itoa` y `FormatInt`)**

La función complementaria a `Atoi` es `strconv.Itoa` (Integer to ASCII), ideal para concatenar contadores o IDs de tipo `int` en mensajes de texto. Para bases distintas a la 10 o tipos específicos como `int64`, se utiliza `strconv.FormatInt`.

```go
func formatExamples() {
    // 1. Itoa (int a String)
    var count int = 42
    countStr := strconv.Itoa(count)
    
    // 2. FormatInt (int64 a String en base 16 / Hexadecimal)
    var colorCode int64 = 255
    hexStr := strconv.FormatInt(colorCode, 16) 
    fmt.Println(hexStr) // Salida: "ff"
}
```

**2. Formateo de Punto Flotante (`FormatFloat`)**

`strconv.FormatFloat` es extremadamente potente, ya que permite definir el formato de notación (`'f'` para decimal normal, `'e'` para científica), la precisión (número de decimales) y el tamaño original (`32` o `64`).

```go
    var pi float64 = 3.14159265
    // Formato decimal ('f'), 2 decimales de precisión, origen float64
    piStr := strconv.FormatFloat(pi, 'f', 2, 64) 
    fmt.Println(piStr) // Salida: "3.14"
```

### Un apunte sobre rendimiento: `strconv` vs `fmt.Sprintf`

Es muy común ver a desarrolladores que provienen de otros lenguajes utilizar `fmt.Sprintf("%d", numero)` para convertir enteros a cadenas. Aunque es sintácticamente correcto y muy flexible, **`fmt.Sprintf` hace uso extensivo del paquete `reflect` (reflexión en tiempo de ejecución) para inferir los tipos**. 

Como regla general en arquitectura de alto rendimiento en Go: las funciones del paquete `strconv` son significativamente más rápidas y generan menos presión sobre el Garbage Collector, ya que están optimizadas a nivel de ensamblador para tipos de datos específicos. Usa `fmt.Sprintf` para construir mensajes complejos o logs, pero prefiere `strconv` para conversiones puras de tipos en rutas críticas de datos.

## 2.5. Ámbito de las variables (Scope) y variables no utilizadas (Blank identifier)

La gestión de la memoria y la limpieza del código en Go no dependen únicamente del recolector de basura o de convenciones de equipo; están fuertemente integradas en las reglas del compilador. Dos de los conceptos más estrictos y fundamentales que debes dominar para evitar errores sutiles son el ámbito léxico de las variables y la política de "cero tolerancia" a variables declaradas pero no utilizadas.

### Bloques y Jerarquía de Ámbitos (Scope)

Go utiliza un sistema de **ámbito léxico (lexical scoping)** estático. El alcance temporal y espacial de una variable se define estrictamente por el bloque de código (delimitado por llaves `{}`) donde es declarada. 

La jerarquía de resolución de nombres en Go fluye de adentro hacia afuera a través de cuatro niveles principales:

1.  **Bloque Universal:** Abarca todo el código fuente. Contiene los identificadores pre-declarados del lenguaje como `int`, `bool`, `true`, `false` y `nil`.
2.  **Bloque de Paquete (Package Block):** Las variables, constantes, tipos y funciones declaradas fuera de cualquier función pertenecen a este ámbito. Son visibles para todos los archivos `.go` que compartan la misma declaración `package`.
    * *Nota arquitectónica:* La visibilidad fuera del paquete se controla mediante la capitalización de la primera letra del identificador (mayúscula = Exportado/Público, minúscula = No exportado/Privado). Profundizaremos en esto en el Capítulo 20.
3.  **Bloque de Archivo (File Block):** Aplica a las importaciones de paquetes. Un `import "fmt"` en un archivo no hace que `fmt` esté disponible mágicamente en otro archivo del mismo paquete.
4.  **Bloques Locales y Anidados:** Cada par de llaves `{}` (como el cuerpo de una función, un `if`, un `for` o un `switch`) crea un nuevo ámbito local.

### La trampa del Sombreado de Variables (Shadowing)

Una variable declarada en un bloque interno "ensombrece" (shadows) a cualquier variable con el mismo nombre declarada en un bloque externo. Durante la ejecución dentro de ese bloque interno, el identificador apuntará exclusivamente a la nueva variable, dejando la original inaccesible.

El sombreado es una fuente clásica de bugs lógicos en Go, especialmente cuando se abusa del operador de declaración corta `:=` dentro de bloques condicionales o bucles.

```go
package main

import (
    "fmt"
    "os"
)

func shadowExample() {
    // Variable en el bloque de la función (externo)
    path := "/tmp/data.txt" 
    
    // Bloque anidado (creado por la sintaxis de inicialización del 'if')
    if file, err := os.Open(path); err != nil {
        // Peligro: Aquí estamos REDECLARANDO 'path' con :=,
        // no estamos reasignando la variable externa.
        path := "/fallback/data.txt" 
        fmt.Println("Fallback path:", path) 
        _ = file
    }

    // La variable 'path' externa nunca fue modificada
    fmt.Println("Original path:", path) 
    // Salida:
    // Fallback path: /fallback/data.txt
    // Original path: /tmp/data.txt
}
```

Para evitar el sombreado accidental, si necesitas actualizar una variable del bloque externo desde un bloque interno, debes declarar las nuevas variables previamente (usando `var`) y utilizar el operador de asignación simple `=` en lugar de `:=`.

### Variables no utilizadas y el Identificador en Blanco (Blank Identifier)

El compilador de Go es inflexible con la higiene del código: **es un error de compilación declarar una variable local y no utilizarla**. Esto garantiza que el código de producción no acumule "código muerto", reduciendo la carga cognitiva y mejorando la eficiencia de la compilación.

Sin embargo, dado que en Go es idiomático que las funciones devuelvan múltiples valores (generalmente un resultado y un error), con frecuencia te encontrarás en situaciones donde solo necesitas uno de esos valores de retorno. 

Para resolver esta fricción sin provocar errores de compilación, Go introduce el **Identificador en Blanco (Blank Identifier)**, representado por un guion bajo `_`.

El identificador en blanco actúa como un "agujero negro" o un sumidero de datos (data sink) de solo escritura. Puedes asignarle cualquier valor de cualquier tipo, y el compilador simplemente lo descartará sin asignar memoria para él.

**Casos de uso comunes:**

1.  **Ignorar valores de retorno múltiples:**
    ```go
    // os.MkdirAll retorna un error. Si por alguna razón (anti-patrón) 
    // queremos ignorar si falló, usamos el identificador en blanco.
    _ = os.MkdirAll("/tmp/cache", 0755)
    
    // Supongamos que parseamos un número pero no nos importa el error
    value, _ := strconv.Atoi("100") 
    ```

2.  **Ignorar el índice en bucles de iteración (`range`):**
    (Veremos el bucle `for range` a fondo en el próximo capítulo).
    ```go
    nombres := []string{"Ana", "Carlos", "Elena"}
    
    // range devuelve (índice, valor). Si solo queremos el valor:
    for _, nombre := range nombres {
        fmt.Println(nombre)
    }
    ```

3.  **Evitar errores de importación temporalmente:**
    Al igual que con las variables, importar un paquete y no usarlo detiene la compilación. Durante la fase de desarrollo, si estás depurando y comentas el código que usa el paquete, puedes silenciar el error usando el identificador en blanco a nivel global.
    ```go
    import (
        "fmt"
        _ "os" // Evita que el compilador se queje de que 'os' no se usa
    )
    ```
