La entrada y salida (I/O) de datos es la columna vertebral de cualquier sistema backend robusto. En Go, esta capa no se limita a leer archivos o escribir en consola, sino que se fundamenta en un diseño de interfaces elegantes y potentes que permiten la composición de flujos de datos complejos con un rendimiento excepcional. A lo largo de este capítulo, exploraremos cómo las interfaces maestras `io.Reader` e `io.Writer` establecen un contrato universal para el transporte de bytes, aprenderemos a interactuar con el sistema de archivos de forma segura y descubriremos cómo optimizar la latencia mediante el uso estratégico de buffers con el paquete `bufio`.

## 12.1. Interfaces maestras: `io.Reader` e `io.Writer`

Si en el mundo Unix existe la filosofía de que "todo es un archivo", en el ecosistema de Go la máxima equivalente es que **"todo es un flujo de bytes"**. Esta abstracción se materializa a través de las dos interfaces más ubicuas, influyentes y poderosas de la Standard Library: `io.Reader` e `io.Writer`.

A pesar de su extrema simplicidad conceptual (cada una define un único método), estas interfaces son el pegamento arquitectónico que permite que componentes completamente dispares —como conexiones de red, archivos en disco, buffers en memoria, compresores y cifradores criptográficos— interactúen entre sí sin conocer los detalles de implementación del otro.

### La interfaz `io.Reader`

La interfaz `Reader` representa una entidad desde la cual se puede leer un flujo (stream) de bytes. Su definición en el paquete `io` es la siguiente:

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
```

A primera vista, la firma del método puede parecer contraintuitiva para desarrolladores provenientes de otros lenguajes. En lugar de que la función devuelva un nuevo array de bytes (`func Read() ([]byte, error)`), **el llamador (caller) es responsable de instanciar y pasar un slice de bytes (`p`) como argumento**. 

Esta decisión de diseño es brillante y fundamental para el rendimiento en Go: permite la **reutilización de memoria (Zero-allocation)**. Al pasar el slice, el `Reader` simplemente copia los datos en la memoria ya asignada, evitando que el Garbage Collector (que estudiaremos en el Capítulo 43) tenga que limpiar miles de pequeños arrays temporales durante lecturas intensivas.

#### Semántica de lectura y el manejo de `io.EOF`

Al implementar o consumir un `io.Reader`, es vital respetar su contrato implícito:
1. **`n` (bytes leídos):** El método devuelve cuántos bytes se escribieron realmente en el slice `p` (`0 <= n <= len(p)`).
2. **`err` (error):** Si la lectura es exitosa pero se llega al final del flujo, el `Reader` devolverá un error especial: `io.EOF` (End Of File).

Un detalle crucial: un `Reader` puede devolver datos parciales `n > 0` junto con un error (ya sea un error real o `io.EOF`). El código idiomático en Go siempre procesa los `n` bytes leídos *antes* de evaluar el error.

**Ejemplo de implementación de un Reader personalizado:**

```go
package main

import (
	"fmt"
	"io"
)

// StringReader envuelve un string para convertirlo en un io.Reader
type StringReader struct {
	data []byte
	pos  int // Mantiene el estado de la lectura actual
}

func (s *StringReader) Read(p []byte) (int, error) {
	if s.pos >= len(s.data) {
		return 0, io.EOF // Señalamos el final del flujo
	}

	// Copiamos tantos bytes como quepan en 'p' o los que queden en 'data'
	n := copy(p, s.data[s.pos:])
	s.pos += n // Avanzamos el puntero de lectura

	return n, nil
}

func main() {
	reader := &StringReader{data: []byte("Gophers")}
	buffer := make([]byte, 3) // Buffer pequeño de 3 bytes para forzar múltiples lecturas

	for {
		n, err := reader.Read(buffer)
		if n > 0 {
			fmt.Printf("Leídos %d bytes: %q\n", n, buffer[:n])
		}
		if err == io.EOF {
			fmt.Println("Fin del flujo alcanzado.")
			break
		}
		if err != nil {
			fmt.Printf("Error inesperado: %v\n", err)
			break
		}
	}
}
```

### La interfaz `io.Writer`

La interfaz `Writer` es la contraparte exacta. Representa una entidad hacia la cual se puede escribir un flujo de bytes:

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

El contrato de un `io.Writer` es estricto:
* Debe escribir los datos desde el slice `p` hacia el flujo subyacente.
* Debe devolver la cantidad de bytes escritos (`n`).
* **Regla de oro:** Si `n < len(p)`, el método *debe* devolver un error no nulo (típicamente `io.ErrShortWrite` o el error de red/disco que interrumpió la escritura). El método `Write` nunca modificará el contenido del slice `p`.

#### Composición de Writers (El patrón Decorator)

La verdadera magia de estas interfaces se revela a través de la composición. Podemos crear "filtros" o "middlewares" que envuelvan a otros `io.Writer` para transformar los datos al vuelo, aplicando el patrón estructural Decorator de forma idiomática.

**Ejemplo: Un Writer que convierte texto a mayúsculas al vuelo:**

```go
package main

import (
	"bytes"
	"fmt"
	"io"
)

// UpperWriter decora cualquier io.Writer existente
type UpperWriter struct {
	Target io.Writer
}

func (u *UpperWriter) Write(p []byte) (int, error) {
	// Clonamos 'p' para no mutar el slice original del llamador
	upperData := bytes.ToUpper(p)
	
	// Pasamos los datos transformados al Writer subyacente
	return u.Target.Write(upperData)
}

func main() {
	// bytes.Buffer implementa tanto io.Reader como io.Writer
	var buf bytes.Buffer 
	
	// Envolvemos el buffer en nuestro decorador
	writer := &UpperWriter{Target: &buf}

	// Escribimos en el UpperWriter
	io.WriteString(writer, "hola mundo desde go")

	// El buffer subyacente ha recibido los datos en mayúsculas
	fmt.Println(buf.String()) // Salida: HOLA MUNDO DESDE GO
}
```

### Sinergia perfecta: `io.Copy`

Cuando tenemos un `io.Reader` (una fuente) y un `io.Writer` (un destino), la Standard Library nos proporciona la función utilitaria `io.Copy(dst Writer, src Reader) (written int64, err error)`. 

`io.Copy` abstrae por completo el ciclo de `make([]byte)`, el bucle `for`, y la comprobación de `io.EOF`. Al invocar `io.Copy`, Go se encarga de transferir los bytes de origen a destino gestionando un buffer interno (de 32KB por defecto), lo que la convierte en la forma más eficiente y estandarizada de mover datos en cualquier aplicación Go, ya sea descargando un archivo HTTP al disco o enviando datos comprimidos a través de un socket.

## 12.2. Manejo y lectura de archivos con el paquete `os`

Si las interfaces `io.Reader` e `io.Writer` definen el comportamiento abstracto de la entrada y salida de datos en Go, el paquete `os` proporciona la implementación concreta para interactuar con el sistema operativo anfitrión. El núcleo de esta interacción es el tipo `os.File`, un puntero a una estructura (Struct) que representa un descriptor de archivo abierto y que, de forma natural, implementa tanto `io.Reader` como `io.Writer`.

El diseño del paquete `os` en Go es intencionadamente agnóstico a la plataforma. Proporciona una API unificada que funciona de manera consistente tanto en sistemas POSIX (Linux, macOS) como en Windows, ocultando la complejidad de las llamadas al sistema subyacentes (Syscalls) que exploraremos en el Capítulo 46.

### Apertura de archivos y la regla de oro de la liberación de recursos

La forma más común y segura de abrir un archivo para su lectura es utilizando la función `os.Open`. Esta función devuelve un `*os.File` y un `error`. El archivo se abre en modo de **solo lectura** (`os.O_RDONLY`).

Al trabajar con descriptores de archivos, el desarrollador asume la responsabilidad crítica de devolver ese recurso al sistema operativo una vez finalizadas las operaciones. En Go, el patrón idiomático e innegociable para garantizar esto es el uso de `defer` inmediatamente después de comprobar que el error de apertura es nulo.

```go
package main

import (
	"fmt"
	"log"
	"os"
)

func main() {
	// Abrimos el archivo en modo solo lectura
	file, err := os.Open("config.json")
	if err != nil {
		log.Fatalf("Error crítico al abrir el archivo: %v", err)
	}

	// defer garantiza que file.Close() se ejecute al salir de la función,
	// independientemente de si hay un return anticipado o un panic.
	defer file.Close()

	fmt.Println("Archivo abierto exitosamente. Descriptor de archivo:", file.Fd())
	// Lógica de lectura aquí...
}
```

### Estrategias de lectura: Memoria frente a Rendimiento

Una vez que tenemos nuestro `*os.File`, Go nos ofrece múltiples vías para extraer sus datos. La elección de la estrategia correcta depende directamente del tamaño del archivo y de los recursos de memoria disponibles:

1.  **Lectura total en memoria (`os.ReadFile`):** Para archivos de configuración pequeños o certificados, leer todo el contenido de golpe en un slice de bytes es aceptable. Desde Go 1.16, la antigua función `ioutil.ReadFile` fue deprecada en favor de `os.ReadFile`. Esta función encapsula la apertura, la lectura completa y el cierre del archivo en una sola llamada.

    ```go
    data, err := os.ReadFile("config.json") // Abre, lee todo y cierra
    ```

2.  **Lectura por bloques (Chunking):** Para archivos grandes (logs, bases de datos, volcado de memoria), cargar todo el contenido en la RAM (Heap) provocará un pico de uso de memoria y, eventualmente, un `OOM` (Out Of Memory). La solución profesional es utilizar la interfaz `io.Reader` que `os.File` implementa, leyendo el archivo en bloques manejables reutilizando un buffer, tal como vimos en la sección anterior.

### Control absoluto: `os.OpenFile` y Máscaras de Permisos

`os.Open` y `os.Create` son simplemente envoltorios de conveniencia (wrappers) de una función mucho más potente: `os.OpenFile`. Esta función es el estándar de la industria cuando necesitamos un control granular sobre **cómo** se abre el archivo y con qué **permisos** POSIX se crea en caso de no existir.

La firma de la función requiere tres argumentos:
* **`name`**: La ruta del archivo.
* **`flag`**: Máscaras de bits (bitmasks) del paquete `os` combinadas con el operador lógico OR (`|`) para definir el comportamiento.
* **`perm`**: Los permisos del archivo (`os.FileMode`), representados típicamente en notación octal (ej. `0644`).

**Ejemplo de uso avanzado: Apertura de un archivo de log para añadir contenido (Append)**

Si intentamos escribir logs usando `os.Create`, truncaremos (borraremos) el archivo existente cada vez que se reinicie la aplicación. Para evitarlo, debemos usar `os.OpenFile` combinando las flags adecuadas:

```go
package main

import (
	"log"
	"os"
)

func main() {
	// Queremos:
	// 1. Abrir en modo solo escritura (os.O_WRONLY)
	// 2. Añadir al final del archivo sin sobreescribir (os.O_APPEND)
	// 3. Crear el archivo si no existe (os.O_CREATE)
	// 4. Con permisos de lectura/escritura para el dueño, lectura para el resto (0644)
	
	flags := os.O_WRONLY | os.O_APPEND | os.O_CREATE
	permisos := os.FileMode(0644)

	logFile, err := os.OpenFile("app_audit.log", flags, permisos)
	if err != nil {
		log.Fatalf("No se pudo inicializar el archivo de log: %v", err)
	}
	defer logFile.Close()

	// Escribimos directamente usando el método Write del os.File
	// (Recuerda que logFile es un io.Writer)
	bytesWritten, err := logFile.Write([]byte("[INFO] - El sistema ha arrancado correctamente\n"))
	if err != nil {
		log.Printf("Fallo al escribir en el log: %v", err)
	}
	
	log.Printf("Operación exitosa: %d bytes volcados a disco.", bytesWritten)
}
```

Es importante destacar que las operaciones de lectura y escritura directas sobre `*os.File` realizan una llamada al sistema operativo (Syscall) por cada invocación. Como veremos en la siguiente sección, esto puede ser un cuello de botella significativo si realizamos miles de pequeñas lecturas o escrituras por segundo.

## 12.3. Entrada y salida optimizada con búfer (`bufio`)

Como adelantamos al final de la sección anterior, interactuar directamente con un `os.File` mediante sus métodos nativos `Read` y `Write` tiene un coste oculto: cada invocación se traduce en una llamada al sistema operativo (Syscall). Si nuestra aplicación procesa un archivo byte a byte o en fragmentos muy pequeños, el cambio de contexto entre el espacio de usuario (User Space) y el espacio del núcleo (Kernel Space) paralizará drásticamente el rendimiento.

El paquete `bufio` (Buffered I/O) es la respuesta idiomática de Go a este problema. Implementa el patrón Decorator sobre las interfaces `io.Reader` e `io.Writer`, interponiendo un bloque de memoria (un slice de bytes) entre la aplicación y el flujo de datos subyacente. 

En lugar de hacer mil Syscalls para escribir mil bytes individuales, `bufio` agrupa esos bytes en la memoria RAM y realiza una única llamada al sistema cuando el búfer se llena.

### Lectura eficiente con `bufio.Reader` y `bufio.Scanner`

Para operaciones de lectura complejas o de tamaño impredecible, envolver nuestro `io.Reader` (como un archivo o una conexión de red) en un `bufio.Reader` es la norma. Go utiliza un tamaño de búfer predeterminado de 4 KB (4096 bytes), pero puede personalizarse mediante `bufio.NewReaderSize`.

#### El peligro silencioso de `ReadSlice`

El método `ReadSlice(delim byte)` es extremadamente rápido, pero viene con una advertencia crítica en su documentación: **devuelve un slice que apunta directamente al búfer interno del `Reader`**. 
Si modificas ese slice, corromperás los datos. Peor aún, en la siguiente operación de lectura, el búfer interno se sobrescribirá, invalidando tu slice anterior. Si necesitas que los datos sobrevivan a la siguiente lectura, debes usar `ReadBytes` o `ReadString`, los cuales asignan nueva memoria (incurriendo en un coste del Garbage Collector, pero garantizando seguridad).

#### `bufio.Scanner`: El estándar para leer línea a línea

Para la inmensa mayoría de casos de uso donde procesamos datos delimitados (como un archivo de texto con saltos de línea o un CSV), `bufio.Scanner` es la herramienta definitiva. Maneja internamente los búferes y los errores subyacentes, ofreciendo una API limpia basada en un bucle `for`.

**Ejemplo: Procesamiento seguro de un archivo gigante línea por línea**

```go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
)

func main() {
	file, err := os.Open("access.log")
	if err != nil {
		log.Fatalf("Error abriendo log: %v", err)
	}
	defer file.Close()

	// Envolvemos el descriptor de archivo en un Scanner
	scanner := bufio.NewScanner(file)

	// Por defecto, Scanner separa por saltos de línea (bufio.ScanLines)
	lineCount := 0
	for scanner.Scan() {
		// scanner.Text() asigna un nuevo string en cada iteración.
		// Para máximo rendimiento sin asignaciones, usa scanner.Bytes()
		_ = scanner.Text() 
		lineCount++
	}

	// El control de errores se realiza SIEMPRE después del bucle
	if err := scanner.Err(); err != nil {
		log.Fatalf("Error durante la lectura del escáner: %v", err)
	}

	fmt.Printf("Procesadas %d líneas exitosamente.\n", lineCount)
}
```

> **Nota de arquitectura:** El `bufio.Scanner` tiene un límite estricto de tamaño de token (por defecto, 64 KB). Si intentas leer una línea que supera este tamaño, fallará con el error `bufio.ErrTooLong`. Para procesar tokens masivos, debes usar el método `scanner.Buffer()` para inyectar un búfer pre-asignado de mayor capacidad antes de comenzar a escanear.

### Escritura optimizada con `bufio.Writer`

De manera homóloga, `bufio.Writer` almacena las operaciones de escritura en memoria. Esto es vital en el desarrollo de APIs RESTful o sistemas de logging donde ensamblamos respuestas complejas a partir de múltiples variables pequeñas.

El uso de `bufio.Writer` introduce un nuevo requisito indispensable: **el vaciado manual**.

#### La obligatoriedad del método `Flush()`

Dado que los datos se acumulan en la memoria de la aplicación, el `io.Writer` subyacente (el archivo o socket) no recibirá los últimos bytes escritos hasta que el búfer interno se llene y se vacíe automáticamente, o hasta que nosotros forcemos ese vaciado mediante el método `Flush()`. 

Olvidar llamar a `Flush()` es uno de los bugs más comunes y difíciles de rastrear en Go, resultando en archivos "truncados" o conexiones HTTP incompletas.

**Ejemplo: Escritura transaccional en búfer**

```go
package main

import (
	"bufio"
	"log"
	"os"
)

func main() {
	file, err := os.Create("reporte.txt")
	if err != nil {
		log.Fatal(err)
	}
	// Siempre cerramos el archivo al final
	defer file.Close()

	// Creamos un escritor con el tamaño de búfer por defecto
	writer := bufio.NewWriter(file)

	// Garantizamos que los datos remanentes en RAM se vuelquen al disco antes de salir
	defer func() {
		if err := writer.Flush(); err != nil {
			log.Printf("Error crítico volcando el búfer: %v", err)
		}
	}()

	// Estas escrituras ocurren en memoria, rapidísimo y sin Syscalls
	writer.WriteString("Encabezado del reporte\n")
	writer.WriteString("----------------------\n")
	
	// Si aquí hubiera un panic, el defer intentaría hacer Flush de lo que hay
	// en memoria antes de que el programa colapse.
}
```

### Tabla Resumen: ¿Cuándo usar qué?

| Herramienta | Caso de uso principal | Precaución de diseño |
| :--- | :--- | :--- |
| **`os.ReadFile` / `os.WriteFile`** | Archivos pequeños (< unos pocos MBs). | Carga todo en el Heap. Riesgo de OOM. |
| **`bufio.Scanner`** | Lectura tokenizada (líneas, palabras). Logs, CSVs. | Límite máximo de 64 KB por token por defecto (`ErrTooLong`). |
| **`bufio.Reader`** | Lectura compleja estructurada o binaria. | Cuidado con la retención de memoria al usar `ReadSlice`. |
| **`bufio.Writer`** | Concatenación intensiva de datos hacia un destino. | **Obligatorio** llamar a `Flush()` al terminar. |

## 12.4. Manipulación segura de rutas de archivos (`path/filepath`)

Uno de los errores más comunes —y peligrosos— al desarrollar aplicaciones backend es la manipulación manual de rutas de archivos mediante la concatenación de cadenas (strings). Intercalar barras inclinadas (`/` o `\`) directamente en el código fuente destruye instantáneamente la portabilidad de la aplicación entre sistemas operativos (POSIX vs. Windows) y abre la puerta a vulnerabilidades críticas de seguridad.

Para resolver este problema, la Standard Library de Go divide la manipulación de rutas en dos paquetes distintos con propósitos estrictamente separados: `path` y `path/filepath`.

### El cisma arquitectónico: `path` frente a `path/filepath`

Es imperativo entender cuándo usar cada paquete para evitar comportamientos anómalos en producción:

* **El paquete `path`:** Debe utilizarse **exclusivamente** para rutas lógicas separadas por barras inclinadas (`/`). Su dominio de aplicación abarca rutas de URLs (HTTP), rutas dentro de archivos ZIP o al interactuar con sistemas virtuales de archivos estandarizados (como `io/fs`). Ignora por completo el sistema operativo subyacente.
* **El paquete `path/filepath`:** Es la herramienta que debes usar cuando interactúas con el sistema de archivos local del servidor (`os.File`). Este paquete es consciente de la plataforma y utiliza automáticamente el separador correcto (`os.PathSeparator`), que es `/` en Linux/macOS y `\` en Windows.

### Construcción y normalización idiomática

Para garantizar que nuestro código sea robusto y multiplataforma, nunca debemos usar la suma de strings (`dir + "/" + file`) para construir rutas.

La función `filepath.Join` acepta un número arbitrario de elementos y los une utilizando el separador del sistema operativo. Más importante aún, invoca implícitamente a `filepath.Clean` en el resultado, lo que normaliza la ruta resultante.

La normalización (`Clean`) aplica las siguientes reglas lexicológicas:
1. Reemplaza múltiples separadores consecutivos por un solo separador.
2. Elimina las referencias al directorio actual (`.`).
3. Resuelve las referencias al directorio padre (`..`) eliminando el elemento de la ruta anterior.

### Prevención de vulnerabilidades: Path Traversal

El ataque de "Path Traversal" (o Directory Traversal) ocurre cuando un usuario malintencionado proporciona una entrada de archivo manipulada (ej. `../../../../etc/passwd`) para escapar del directorio de trabajo previsto y acceder a archivos sensibles del sistema.

Validar rutas de forma segura requiere una combinación de normalización absoluta y comprobación de prefijos. No basta con hacer `Clean`; debemos asegurar que, una vez resuelta la ruta completa, esta siga contenida dentro de nuestro directorio base permitido.

**Ejemplo: Resolución de rutas segura para un servidor de archivos**

```go
package main

import (
	"fmt"
	"path/filepath"
	"strings"
)

// ResolveSecurePath garantiza que el archivo solicitado no escape del directorio base
func ResolveSecurePath(baseDir, userRequest string) (string, error) {
	// 1. Obtenemos la ruta absoluta del directorio base
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return "", fmt.Errorf("error al resolver el directorio base: %w", err)
	}

	// 2. Unimos el base con la petición del usuario. Join aplica Clean internamente.
	joinedPath := filepath.Join(absBase, userRequest)

	// 3. Comprobación de seguridad: Verificamos que la ruta resultante
	// siga teniendo como prefijo nuestro directorio base absoluto.
	if !strings.HasPrefix(joinedPath, absBase+string(filepath.Separator)) {
		// El usuario intentó usar ../ para escapar del baseDir
		return "", fmt.Errorf("violación de seguridad: intento de path traversal")
	}

	return joinedPath, nil
}

func main() {
	base := "/var/www/uploads"
	
	// Intento legítimo
	safe, err := ResolveSecurePath(base, "images/avatar.png")
	fmt.Printf("Petición legítima: %s (Error: %v)\n", safe, err)
	
	// Intento malicioso
	malicious, err := ResolveSecurePath(base, "../../../etc/shadow")
	fmt.Printf("Petición maliciosa: %s (Error: %v)\n", malicious, err)
}
```

### Recorriendo árboles de directorios: `WalkDir` vs `Walk`

Cuando necesitamos iterar sobre todos los archivos dentro de un directorio (y sus subdirectorios), históricamente se utilizaba `filepath.Walk`. Sin embargo, esta función adolecía de un grave problema de rendimiento: por cada archivo encontrado, ejecutaba una llamada a `os.Lstat` para leer sus metadatos, lo cual es extremadamente costoso en sistemas con alta latencia de disco.

Desde Go 1.16, la recomendación oficial es utilizar **`filepath.WalkDir`**. Esta función aprovecha la nueva interfaz `fs.DirEntry`, leyendo el tipo de archivo directamente del directorio subyacente sin necesidad de invocar a `stat` individualmente para cada entrada. Esto puede acelerar el recorrido de directorios en órdenes de magnitud.

### Tabla Resumen: Funciones esenciales de `path/filepath`

| Función | Propósito principal | Advertencia / Caso de uso |
| :--- | :--- | :--- |
| **`filepath.Join`** | Concatenar rutas usando el separador del OS nativo. | Aplica `Clean` automáticamente. Úsala siempre en lugar de `+`. |
| **`filepath.Clean`** | Normalizar una ruta eliminando dobles barras, `.` y `..` | Indispensable como primera línea de defensa de saneamiento. |
| **`filepath.Abs`** | Convertir una ruta relativa en absoluta. | Depende del directorio de trabajo actual (CWD) en tiempo de ejecución. |
| **`filepath.Ext`** | Extraer la extensión del archivo (ej. `.json`). | Incluye el punto en el string devuelto. |
| **`filepath.WalkDir`** | Recorrer recursivamente un árbol de directorios. | Reemplazo moderno y altamente optimizado de `filepath.Walk`. |
