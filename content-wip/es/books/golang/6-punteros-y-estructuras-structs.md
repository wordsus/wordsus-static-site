Este capítulo aborda los pilares de la gestión de datos en Go. Comenzaremos desmitificando el paso de parámetros: en Go todo se pasa por valor, incluso los punteros. Entender esta mecánica es vital para controlar la mutabilidad y la eficiencia en el uso de la memoria. 

Posteriormente, exploraremos los `structs`, la herramienta definitiva de Go para modelar entidades. Veremos cómo la composición y el *embedding* ofrecen una alternativa robusta y flexible a la herencia tradicional, permitiendo la promoción de campos y métodos. Finalmente, analizaremos las etiquetas de estructura (*tags*), esenciales para la interoperabilidad con JSON y bases de datos en aplicaciones modernas.

## 6.1. Punteros en Go: paso por valor vs. paso por referencia

Para comprender verdaderamente cómo Go maneja la memoria y el estado a través de los límites de las funciones, debemos comenzar desmintiendo uno de los mitos más comunes entre los desarrolladores que llegan desde otros lenguajes: **en Go no existe el paso por referencia**. 

La regla de oro del lenguaje es estricta y sin excepciones: **todo en Go se pasa por valor**.

Cuando pasamos una variable a una función, Go siempre crea una copia de esa variable y la asigna al parámetro de la función receptora. La confusión sobre el "paso por referencia" surge del comportamiento de los punteros y de ciertas estructuras de datos integradas (como vimos con los *slices* y *maps* en el Capítulo 5), pero mecánicamente, el comportamiento subyacente es siempre una copia.

### La mecánica del paso por valor

Cuando pasamos un tipo de dato estándar o un `struct` a una función, Go copia bit a bit el contenido de esa variable en una nueva ubicación de memoria (generalmente en el *Stack* de la nueva función, concepto que profundizaremos en el Capítulo 44).

Observa el siguiente ejemplo con un `struct` simple:

```go
package main

import "fmt"

type Configuracion struct {
	Reintentos int
	Timeout    int
}

func modificarConfig(c Configuracion) {
	c.Reintentos = 5
	// Esta modificación solo afecta a la copia local 'c'
}

func main() {
	config := Configuracion{Reintentos: 3, Timeout: 30}
	modificarConfig(config)
	
	// La configuración original permanece inalterada
	fmt.Printf("Reintentos originales: %d\n", config.Reintentos) 
	// Salida: Reintentos originales: 3
}
```

Al invocar `modificarConfig(config)`, el *runtime* de Go realiza una copia profunda superficial (*shallow copy* de los campos de la estructura) del valor `config`. Cualquier mutación dentro de la función ocurre en esa dirección de memoria aislada.

### La ilusión del paso por referencia mediante punteros

Para lograr mutabilidad compartida (permitir que una función modifique el estado de una variable declarada en otro ámbito), Go utiliza punteros. Un puntero no es más que una variable cuyo valor es una **dirección de memoria**.

Cuando pasamos un puntero a una función, la regla de oro de Go ("todo se pasa por valor") sigue aplicando implacablemente: **estamos pasando la dirección de memoria por valor**. Es decir, la función recibe una *copia* de la dirección de memoria, no una referencia invisible a la variable original como ocurre en C++ o C#.

Veamos cómo cambia el comportamiento usando el operador de dirección `&` y el operador de indirección (desreferencia) `*`:

```go
package main

import "fmt"

type Configuracion struct {
	Reintentos int
	Timeout    int
}

// Recibimos un puntero a Configuracion (*Configuracion)
func modificarConfigConPuntero(c *Configuracion) {
	// Go desreferencia implícitamente c.Reintentos bajo el capó.
	// Es equivalente a (*c).Reintentos = 5
	c.Reintentos = 5
}

func main() {
	config := Configuracion{Reintentos: 3, Timeout: 30}
	
	// Pasamos la dirección de memoria de config
	modificarConfigConPuntero(&config)
	
	// La configuración original ha sido mutada
	fmt.Printf("Reintentos mutados: %d\n", config.Reintentos) 
	// Salida: Reintentos mutados: 5
}
```

En `modificarConfigConPuntero(&config)`, lo que se copia y se empuja a la pila de llamadas de la función es un valor hexadecimal (por ejemplo, `0xc000010030`) que representa dónde reside `config`. Como tanto la variable original en `main` como la copia de la dirección en la función apuntan al mismo espacio físico, modificar el valor desreferenciado muta el estado original.

Para demostrar que el puntero en sí mismo es una copia, intenta reasignar el puntero dentro de la función:

```go
func reasignarPuntero(c *Configuracion) {
	// Creamos una nueva instancia
	nuevaConfig := Configuracion{Reintentos: 10, Timeout: 60}
	
	// ¡Esto solo cambia hacia dónde apunta la copia local del puntero 'c'!
	// No afectará al puntero o variable en la función main.
	c = &nuevaConfig 
}
```

### El mito de los "Reference Types" (Tipos de Referencia)

Un error semántico muy extendido es llamar a los *slices*, *maps* y *channels* "tipos de referencia". Como estudiamos en el capítulo anterior, un *slice* es internamente un `struct` que contiene un puntero a un array subyacente, un entero para la longitud y otro para la capacidad. 

Cuando pasas un *slice* a una función, se pasa por valor: se copia ese pequeño `struct` de 24 bytes (en arquitecturas de 64 bits). Dado que esa copia contiene la *copia de un puntero* que apunta al mismo array subyacente, las modificaciones a los elementos del *slice* son visibles fuera de la función, creando la ilusión de un "paso por referencia".

### Decisión de diseño: ¿Cuándo usar punteros?

Muchos desarrolladores asumen prematuramente que pasar punteros es siempre más rápido porque evita copiar estructuras de datos pesadas. En Go, esta es una micro-optimización peligrosa que a menudo resulta contraproducente.

Debemos decidir entre valores y punteros basándonos principalmente en la **semántica**, no en el rendimiento:

1.  **Usa punteros para mutar el estado:** Si el contrato de la función exige modificar la variable receptora o el argumento proporcionado, el uso de un puntero es obligatorio.
2.  **Usa punteros para consistencia:** Si un `struct` tiene métodos con receptores de puntero (algo que abordaremos detalladamente en el Capítulo 7), es idiomático y seguro mantener el uso de punteros para esa instancia en todo el ciclo de vida del objeto.
3.  **Usa punteros para semántica de ausencia (`nil`):** Los tipos por valor siempre tienen un *zero-value* (ej. `0` para `int`, `""` para `string`). Si necesitas distinguir entre "el valor es cero" y "el valor no ha sido proporcionado", un puntero (`*int`, `*string`) te permite usar `nil` para representar la ausencia.
4.  **Usa paso por valor por defecto:** Pasar por valor garantiza la inmutabilidad, reduce efectos secundarios inesperados (bugs de mutación accidental) y facilita la concurrencia segura. 

**Consideraciones de rendimiento y el Heap:**
Copiar un `struct` de tamaño razonable (unas cuantas docenas de bytes) suele ser mucho más rápido que usar un puntero. Pasar por valor mantiene los datos en el *Stack* (la pila), lo cual es extremadamente rápido y no requiere recolección de basura. 

Cuando pasas un puntero, el compilador de Go realiza un proceso llamado *Escape Analysis*. Si el compilador determina que el ciclo de vida de la variable a la que se apunta excede el de la función actual, forzará la asignación de esa memoria en el *Heap* (el montículo). Esto genera trabajo adicional para el *Garbage Collector* (GC), añadiendo latencia. Reservaremos el análisis profundo de cómo auditar y optimizar este comportamiento para el Capítulo 44 (Análisis de escape).

Por lo tanto, la regla idiomática es clara: **comparte memoria comunicando (pasando por valor) a menos que la semántica de tu diseño dicte estrictamente lo contrario.**

## 6.2. Definición, inicialización y campos anónimos en Structs

En Go, al carecer de clases y de los conceptos tradicionales de la programación orientada a objetos (POO), las estructuras o `structs` son la piedra angular para modelar datos complejos. Un `struct` es un tipo de dato definido por el usuario que agrupa una colección de campos, potencialmente de tipos diferentes, bajo un único identificador. 

Mientras que en el capítulo anterior analizamos cómo se pasan los datos en memoria, en esta sección nos centraremos en la sintaxis y las mecánicas para definir e instanciar estos contenedores de datos de manera idiomática.

### Definición de un Struct

La declaración de un `struct` se realiza combinando las palabras clave `type` (para definir un nuevo tipo) y `struct`. La convención en Go dicta que el nombre del `struct` y sus campos deben usar *PascalCase* si deseamos que sean exportados (públicos y accesibles desde otros paquetes) o *camelCase* si deben permanecer privados dentro del paquete actual.

```go
package main

// Usuario es un tipo exportado, accesible desde otros paquetes.
type Usuario struct {
	Nombre        string
	Email         string
	Edad          uint8
	estaActivo    bool   // Campo no exportado (privado al paquete)
}
```

Es posible agrupar campos del mismo tipo en una sola línea para mantener el código compacto, aunque la legibilidad siempre debe priorizarse:

```go
type Coordenada struct {
	Latitud, Longitud float64
	Altitud           int
}
```

### Estrategias de Inicialización

Go ofrece múltiples formas de instanciar un `struct`, cada una adecuada para diferentes escenarios. 

* **Inicialización por Valor Cero (Zero Value):** Cuando declaras una variable de un tipo `struct` sin asignarle valores, Go inicializa automáticamente cada uno de sus campos con su respectivo "valor cero" (`""` para strings, `0` para numéricos, `false` para booleanos, `nil` para punteros).

* **Literales de Estructura Nombrados:** Es la forma más idiomática, segura y recomendada de inicializar un `struct`. Especificas el nombre del campo seguido de su valor. El orden no importa y puedes omitir campos (los cuales tomarán su valor cero).

* **Literales de Estructura Posicionales:** Asignas los valores en el orden exacto en el que fueron definidos en el `struct`. Aunque es más corto de escribir, es una práctica fuertemente desaconsejada (excepto en structs muy pequeños y estables como unas coordenadas), ya que añadir o reordenar campos en el futuro romperá el código en tiempo de compilación.

* **Punteros a Structs:** Puedes obtener directamente un puntero a un `struct` instanciado usando el operador de dirección `&` o la función integrada `new()`.

El siguiente código ilustra estas estrategias:

```go
package main

import "fmt"

func main() {
	// 1. Valor cero
	var u1 Usuario
	fmt.Println(u1) // Salida: {  0 false}

	// 2. Literal nombrado (Recomendado)
	u2 := Usuario{
		Nombre: "Carlos",
		Edad:   28,
		// Email y estaActivo toman su valor cero
	}

	// 3. Literal posicional (Desaconsejado)
	u3 := Usuario{"Ana", "ana@email.com", 32, true}

	// 4. Puntero con operador &
	u4 := &Usuario{Nombre: "Elena"} 

	// 5. Puntero con new()
	// u5 es de tipo *Usuario, equivalente a &Usuario{}
	u5 := new(Usuario) 
	u5.Nombre = "David"
}
```

### Campos Anónimos

Una de las características más distintivas del sistema de tipos de Go es la capacidad de declarar "campos anónimos" dentro de un `struct`. Un campo anónimo se declara especificando únicamente su tipo, sin proporcionarle un nombre explícito.

Cuando haces esto, Go asigna implícitamente el nombre del tipo como el nombre del campo. Esta mecánica es el fundamento que permite a Go simular comportamientos similares a la herencia mediante la composición, un concepto que profundizaremos arquitectónicamente en la próxima sección.

```go
package main

import "fmt"

type Direccion struct {
	Ciudad string
	Pais   string
}

type Empleado struct {
	ID        int
	Nombre    string
	Direccion // Campo anónimo de tipo Direccion
}

func main() {
	emp := Empleado{
		ID:     101,
		Nombre: "Laura",
		Direccion: Direccion{
			Ciudad: "Madrid",
			Pais:   "España",
		},
	}

	// Acceso directo a los campos "promovidos"
	fmt.Println(emp.Ciudad) // Salida: Madrid
	
	// Acceso explícito a través del nombre del tipo
	fmt.Println(emp.Direccion.Pais) // Salida: España
}
```

En el ejemplo anterior, `Ciudad` y `Pais` son **campos promovidos**. Aunque pertenecen al `struct` `Direccion`, pueden ser accedidos directamente desde la instancia de `Empleado` (`emp.Ciudad`). Si el `struct` contenedor (`Empleado`) tuviera un campo con el mismo nombre que un campo promovido, el campo del contenedor "haría sombra" (shadowing) al campo del nivel inferior, requiriendo en ese caso el acceso explícito mediante `emp.Direccion.Ciudad`.

## 6.3. Composición de Structs (Embedding) en lugar de herencia

Uno de los choques paradigmáticos más fuertes para los desarrolladores que transicionan a Go desde lenguajes como Java, C++ o C# es la ausencia total de herencia clásica. En Go no existen las jerarquías de clases, ni la palabra clave `extends`, ni el concepto taxonómico donde un tipo "es un" (*is-a*) subtipo de otro. 

Los diseñadores de Go tomaron la decisión consciente de omitir la herencia para evitar problemas endémicos del desarrollo orientado a objetos tradicional, como el problema de la clase base frágil (Fragile Base Class Problem) y el alto acoplamiento. En su lugar, Go adopta rígidamente el principio de **preferir la composición sobre la herencia**, logrando la reutilización de código a través de una característica llamada *Embedding* (incrustación).

### El mecanismo de Embedding y la Promoción

Como introdujimos en la sección anterior (6.2), Go permite declarar campos anónimos dentro de un `struct`. Cuando incrustamos un tipo dentro de otro usando campos anónimos, el `struct` contenedor no solo adquiere los datos (campos) del tipo incrustado, sino que también **promueve sus comportamientos (métodos)**.

Veamos un ejemplo práctico donde reutilizamos lógica de registro (logging) sin recurrir a clases base:

```go
package main

import "fmt"

// Logger actúa como nuestro tipo base reutilizable
type Logger struct {
	Prefijo string
}

// Método asociado a Logger (profundizaremos en métodos en el Capítulo 7)
func (l Logger) ImprimirLog(mensaje string) {
	fmt.Printf("[%s] %s\n", l.Prefijo, mensaje)
}

// Servidor incrusta Logger
type Servidor struct {
	Logger // Campo anónimo (Embedding)
	Puerto int
}

func main() {
	srv := Servidor{
		Logger: Logger{Prefijo: "HTTP"},
		Puerto: 8080,
	}

	// El método ImprimirLog ha sido "promovido" al nivel de Servidor
	srv.ImprimirLog("Servidor iniciado correctamente") 
	// Salida: [HTTP] Servidor iniciado correctamente
	
	// También podemos acceder al método explícitamente si fuera necesario
	srv.Logger.ImprimirLog("Escuchando peticiones...")
}
```

En este escenario, `Servidor` tiene un (*has-a*) `Logger`. Gracias a la promoción, podemos llamar a `srv.ImprimirLog()` directamente, creando una ilusión de herencia. Sin embargo, mecánicamente, Go está haciendo un enrutamiento automático: traduce `srv.ImprimirLog()` a `srv.Logger.ImprimirLog()`.

### Sobrescritura vs. Ocultamiento (Shadowing)

En la herencia clásica, una clase hija puede sobrescribir (*override*) un método de la clase padre, y el polimorfismo dinámico garantiza que la clase padre llame a la implementación de la hija. **En Go, esto no ocurre**.

Si el `struct` contenedor define un método o campo con el mismo nombre que uno promovido desde el tipo incrustado, el contenedor simplemente **oculta** (*shadows*) al incrustado. 

```go
// Si añadimos este método a Servidor...
func (s Servidor) ImprimirLog(mensaje string) {
	fmt.Printf("LOG DEL SERVIDOR (Puerto %d): %s\n", s.Puerto, mensaje)
}
```

Ahora, al llamar a `srv.ImprimirLog()`, se ejecutará el método de `Servidor`. El método original sigue existiendo y es accesible mediante `srv.Logger.ImprimirLog()`. Es crucial entender que si un método interno de `Logger` llamara a `ImprimirLog()`, ejecutaría *su propio* método, no el de `Servidor`. El tipo incrustado no tiene conocimiento del tipo que lo contiene.

### La estricta separación de Polimorfismo y Reutilización de Código

El error arquitectónico más común al usar *embedding* es intentar usarlo para lograr polimorfismo. 

A pesar de que `Servidor` incrusta `Logger` y tiene todos sus métodos, **un `Servidor` no es un `Logger` a nivel de sistema de tipos**. Si tienes una función que acepta un parámetro de tipo `Logger`, no puedes pasarle una instancia de `Servidor`. El compilador de Go rechazará la operación por incompatibilidad de tipos.

```go
func ProcesarLog(l Logger) { /* ... */ }

// ProcesarLog(srv) // ERROR: cannot use srv (type Servidor) as type Logger
```

Go separa elegantemente estas dos responsabilidades:
1. **El *Embedding* (Composición)** se usa exclusivamente para la **reutilización de código** y estado.
2. **Las Interfaces** (que estudiaremos a fondo en el Capítulo 7) se usan exclusivamente para el **polimorfismo** y la definición de contratos de comportamiento.

Al mantener los datos (structs) desacoplados de las jerarquías de comportamiento (interfaces), Go fuerza a los arquitectos de software a diseñar estructuras más planas, modulares y fáciles de refactorizar con el tiempo.

## 6.4. Etiquetas de Structs (Struct Tags) para metadatos

Para cerrar nuestro estudio sobre las estructuras en Go, debemos abordar una característica fundamental que, si bien no afecta el comportamiento en tiempo de compilación ni la asignación de memoria, es el motor detrás de gran parte del ecosistema de librerías del lenguaje: las **etiquetas de structs** (*struct tags*).

En Go, una etiqueta de struct es una cadena de texto literal, generalmente escrita entre comillas invertidas (backticks ``` ` ```), que se coloca inmediatamente después de la declaración del tipo de un campo. Su propósito exclusivo es adjuntar **metadatos** a ese campo específico.

### Sintaxis y Convenciones

Por sí solas, las etiquetas no hacen absolutamente nada. El compilador de Go simplemente las ignora a nivel de ejecución de la lógica. Su valor radica en que pueden ser inspeccionadas y analizadas en tiempo de ejecución (*runtime*) utilizando el paquete `reflect` (el cual estudiaremos a fondo en el Capítulo 14).

La convención estándar en Go dictamina que las etiquetas deben seguir un formato de clave-valor estricto: `clave:"valor"`. 

* La **clave** suele identificar el paquete o la herramienta que leerá la etiqueta (ej. `json`, `xml`, `db`, `validate`).
* El **valor** se encierra entre comillas dobles y contiene las instrucciones específicas para esa herramienta.
* Si necesitas múltiples etiquetas para un mismo campo, se separan por un espacio.

Veamos un ejemplo que combina varias herramientas comunes:

```go
package main

type Usuario struct {
	// Mapeo múltiple: 'id' para JSON, 'user_id' para la base de datos
	ID int `json:"id" db:"user_id"`

	// Validación: requerido y con una longitud mínima de 3
	Nombre string `json:"nombre" validate:"required,min=3"`

	// El guion '-' indica que este campo debe ser ignorado por el paquete JSON
	// Sin embargo, sí será mapeado en la base de datos
	Password string `json:"-" db:"password_hash"`

	// omitempty: Si el valor es el "zero-value" (ej. ""), el campo no aparecerá en el JSON final
	Email string `json:"email,omitempty" validate:"omitempty,email"`
}
```

### Casos de Uso Comunes en el Ecosistema Go

Como vimos en el código anterior, las etiquetas son el pegamento que conecta tus estructuras de datos en memoria con el mundo exterior. Los escenarios más predominantes (que desarrollaremos en detalle en las Partes 4, 7 y 8 del libro) incluyen:

1.  **Serialización (Encoding/Decoding):** Los paquetes estándar `encoding/json` y `encoding/xml` dependen fuertemente de las etiquetas para saber cómo mapear un struct de Go a un documento de texto y viceversa. Te permiten renombrar campos (ya que en Go los campos exportados deben empezar con mayúscula, pero en JSON suelen ir en minúscula), omitir campos vacíos (`omitempty`) u ocultar datos sensibles (`-`).
2.  **Validación de Datos:** Librerías populares como `go-playground/validator` (que veremos en el Capítulo 26) leen etiquetas complejas (`validate:"required,gte=18"`) para aplicar reglas de negocio sobre los campos entrantes de una petición HTTP sin necesidad de escribir cientos de sentencias `if`.
3.  **Mapeo Objeto-Relacional (ORMs y Query Builders):** Herramientas como GORM, `sqlx` o Ent utilizan etiquetas como `db` o `gorm` para determinar a qué columna de una tabla SQL corresponde cada campo, si es una clave primaria, o qué tipo de relación define.

### El Coste de la Reflexión

Es crucial entender el compromiso arquitectónico de usar etiquetas extensamente. Dado que la lectura de estos metadatos requiere el uso de *reflection* en tiempo de ejecución, existe una penalización de rendimiento. 

Librerías bien diseñadas (como el serializador JSON estándar) mitigan esto leyendo las etiquetas y almacenando en caché la estructura de metadatos la primera vez que se evalúa el tipo, evitando así invocar a la API de reflexión en cada petición o serialización posterior. Sin embargo, como ingenieros avanzados, debemos ser conscientes de que depender mágicamente de etiquetas de terceros oculta la lógica de control, lo que a veces dificulta la depuración.
