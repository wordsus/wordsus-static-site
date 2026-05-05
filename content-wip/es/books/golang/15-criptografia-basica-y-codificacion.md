En el desarrollo de servicios backend robustos, la comunicación no solo depende de la estructura, sino de la integridad y seguridad de los datos. Go destaca por ofrecer una biblioteca estándar que simplifica tareas complejas de transformación de información. En este capítulo, profundizaremos en la serialización nativa mediante **JSON** y **XML**, esenciales para el intercambio de datos en APIs modernas. Exploraremos cómo proteger la legibilidad de flujos binarios con **Base64** y **Hexadecimal**, y finalizaremos con la implementación de **hashes criptográficos** para garantizar que la información permanezca inalterada, sentando las bases para una arquitectura segura y eficiente.

## 15.1. Serialización y deserialización de JSON y XML nativa

La biblioteca estándar de Go proporciona un soporte robusto para el intercambio de datos a través de los paquetes `encoding/json` y `encoding/xml`. Dado que Go es un lenguaje fuertemente tipado, la traducción entre estos formatos de texto y las estructuras de datos nativas se realiza mapeando los campos mediante las etiquetas de estructura (*struct tags*), las cuales vimos en detalle en el Capítulo 6. En tiempo de ejecución, Go utiliza la reflexión (Capítulo 14) para leer estas etiquetas y realizar la conversión.

### Manipulación de JSON en Memoria: `Marshal` y `Unmarshal`

Para operaciones donde el documento JSON es relativamente pequeño y puede residir completamente en memoria, utilizamos las funciones `json.Marshal` (para serializar de Go a JSON) y `json.Unmarshal` (para deserializar de JSON a Go). Operan directamente sobre *slices* de bytes (`[]byte`).

Al definir las etiquetas `json`, contamos con directivas específicas muy útiles, como `omitempty` (omite el campo en el JSON resultante si su valor es el valor cero del tipo) y `-` (ignora el campo por completo).

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
)

type Usuario struct {
	ID       int      `json:"id"`
	Nombre   string   `json:"nombre"`
	Email    string   `json:"email,omitempty"` // Se omite si está vacío
	Password string   `json:"-"`               // Nunca se serializa
	Roles    []string `json:"roles"`
}

func main() {
	// Serialización (Estructura -> JSON)
	user := Usuario{
		ID:       1,
		Nombre:   "Ada Lovelace",
		Password: "supersecretpassword",
		Roles:    []string{"admin", "user"},
	}

	jsonData, err := json.Marshal(user)
	if err != nil {
		log.Fatalf("Error al serializar: %v", err)
	}
	fmt.Printf("JSON: %s\n", jsonData)

	// Deserialización (JSON -> Estructura)
	payload := []byte(`{"id":2,"nombre":"Grace Hopper","roles":["user"]}`)
	var newUser Usuario
	
	if err := json.Unmarshal(payload, &newUser); err != nil {
		log.Fatalf("Error al deserializar: %v", err)
	}
	fmt.Printf("Struct: %+v\n", newUser)
}
```

### Procesamiento en Flujo (Streaming): `Encoder` y `Decoder`

Cuando trabajamos con grandes volúmenes de datos, o cuando leemos y escribimos directamente desde conexiones de red o archivos (como veremos en el Capítulo 24 al trabajar con peticiones HTTP), cargar todo el JSON en memoria usando `Unmarshal` es ineficiente. 

Para estos casos, la biblioteca estándar ofrece `json.Encoder` y `json.Decoder`, los cuales operan directamente sobre las interfaces `io.Writer` e `io.Reader` (discutidas en el Capítulo 12). Esto permite procesar los datos de forma iterativa, reduciendo drásticamente la presión sobre el *Garbage Collector*.

```go
// Ejemplo conceptual de lectura desde un archivo HTTP Request Body
// var req *http.Request
// decoder := json.NewDecoder(req.Body)
// var payload MiPayload
// err := decoder.Decode(&payload)
```

### Casos Avanzados en JSON

1.  **Tipos dinámicos y `json.RawMessage`**: En ocasiones, una parte del JSON puede tener una estructura variable o su procesamiento debe delegarse a otra etapa. El tipo `json.RawMessage` (que es un alias de `[]byte`) permite retrasar la deserialización de un campo específico, manteniendo el JSON original intacto para procesarlo más tarde.
2.  **Serialización Personalizada**: Si necesitas un control absoluto sobre cómo un tipo se transforma en JSON (por ejemplo, para parsear fechas en formatos no estándar), puedes implementar las interfaces `json.Marshaler` (método `MarshalJSON() ([]byte, error)`) y `json.Unmarshaler` (método `UnmarshalJSON([]byte) error`). Al satisfacer este contrato, Go usará tu lógica en lugar de la reflexión por defecto.

### Trabajando con XML Nativo

El paquete `encoding/xml` sigue una filosofía casi idéntica a JSON, ofreciendo `xml.Marshal`, `Unmarshal`, `Encoder` y `Decoder`. Sin embargo, la naturaleza del XML introduce mayor complejidad debido a la existencia de atributos, espacios de nombres y datos de caracteres entre etiquetas.

Para manejar esta jerarquía, las etiquetas de estructura en XML tienen opciones más granulares:
* `xml:"NombreElemento"`: Define el nombre de la etiqueta XML.
* `xml:",attr"`: Indica que el campo debe tratarse como un atributo de la etiqueta padre, no como un elemento hijo.
* `xml:",chardata"`: Captura el texto puro dentro de una etiqueta, ignorando elementos hijos.
* `xml:"Nombre>Subnombre"`: Permite crear jerarquías sin necesidad de definir structs intermedias en Go.

A diferencia de JSON, a menudo es necesario definir un campo de tipo `xml.Name` en la estructura raíz para asegurar que el elemento delimitador superior tenga el nombre correcto al serializar.

```go
package main

import (
	"encoding/xml"
	"fmt"
	"log"
)

// Servidor representa la configuración en XML
type Servidor struct {
	XMLName xml.Name `xml:"servidor"`
	ID      string   `xml:"id,attr"` // Atributo de la etiqueta <servidor>
	Host    string   `xml:"red>host"` // Crea la jerarquía <red><host>...</host></red>
	Puerto  int      `xml:"red>puerto"`
	Activo  bool     `xml:"activo"`
}

func main() {
	xmlData := []byte(`
		<servidor id="srv-001">
			<red>
				<host>localhost</host>
				<puerto>8080</puerto>
			</red>
			<activo>true</activo>
		</servidor>
	`)

	var config Servidor
	if err := xml.Unmarshal(xmlData, &config); err != nil {
		log.Fatalf("Error XML: %v", err)
	}

	fmt.Printf("Configuración cargada: %+v\n", config)
}
```

La elección entre los métodos de memoria (`Marshal/Unmarshal`) o de flujo (`Encoder/Decoder`) en XML sigue las mismas reglas de eficiencia que en JSON, siendo el decodificador iterativo (`xml.Decoder.Token()`) vital para procesar archivos XML masivos (como dumps de bases de datos o feeds RSS gigantes) sin agotar la memoria del sistema.

## 15.2. Codificación Base64 y Hexadecimal

A menudo, al desarrollar sistemas backend, necesitamos transportar o almacenar datos binarios puros (como claves criptográficas, imágenes pequeñas o *tokens* de sesión) a través de protocolos o formatos de datos diseñados exclusivamente para texto, como JSON o URLs. Dado que incrustar bytes crudos en estos medios puede corromper el formato o causar errores de análisis, Go proporciona los paquetes `encoding/hex` y `encoding/base64` para traducir de forma segura entre secuencias binarias y cadenas de texto ASCII.

### Codificación Hexadecimal (`encoding/hex`)

La codificación hexadecimal (o Base16) representa cada *byte* (8 bits) utilizando dos caracteres alfanuméricos (0-9, a-f). Aunque es ineficiente en términos de espacio (duplica el tamaño de los datos originales), es el estándar *de facto* para la representación legible por humanos de hashes criptográficos (que abordaremos en la sección 15.3) y la depuración a bajo nivel.

El paquete `encoding/hex` proporciona métodos directos para operar sobre *slices* de bytes. Además de las operaciones de codificación y decodificación estándar, incluye la valiosa función `Dump()`, que genera una vista formateada (hexdump) de los datos binarios, idéntica a la salida de la utilidad de línea de comandos `hexdump` en sistemas tipo Unix.

```go
package main

import (
	"encoding/hex"
	"fmt"
	"log"
)

func main() {
	// Datos binarios arbitrarios
	datosBinarios := []byte{0x47, 0x6f, 0x20, 0x65, 0x73, 0x20, 0x67, 0x65, 0x6e, 0x69, 0x61, 0x6c, 0x21}

	// 1. Codificación a String Hexadecimal
	cadenaHex := hex.EncodeToString(datosBinarios)
	fmt.Printf("Hex: %s\n", cadenaHex)

	// 2. Decodificación de vuelta a binario
	decodificado, err := hex.DecodeString(cadenaHex)
	if err != nil {
		log.Fatalf("Error al decodificar hex: %v", err)
	}
	fmt.Printf("String decodificado: %s\n\n", string(decodificado))

	// 3. Hexdump para depuración de protocolos o archivos binarios
	dump := hex.Dump(datosBinarios)
	fmt.Println("Hexdump:")
	fmt.Print(dump)
}
```

### Codificación Base64 (`encoding/base64`)

Cuando la eficiencia de espacio es más importante que la legibilidad directa, Base64 es la herramienta adecuada. Representa 3 bytes de datos binarios usando 4 caracteres ASCII, lo que resulta en un aumento de tamaño de solo un 33% (en contraste con el 100% del hexadecimal).

El paquete `encoding/base64` en Go no expone funciones a nivel de paquete para codificar directamente; en su lugar, expone distintos **Encoding Objects** (objetos de codificación) preconfigurados para manejar las variaciones del estándar Base64:

* **`base64.StdEncoding`**: El alfabeto Base64 estándar (termina en caracteres de relleno `=` si es necesario). Útil para adjuntos de correo electrónico o incrustar datos en JSON.
* **`base64.URLEncoding`**: Una variante "URL-Safe". Sustituye los caracteres `+` y `/` del estándar por `-` y `_`, respectivamente, evitando colisiones con los separadores de rutas o parámetros en las URLs.
* **`base64.RawStdEncoding`** y **`base64.RawURLEncoding`**: Variantes "Raw" (crudas) que omiten los caracteres de relleno `=` al final de la cadena. Son fundamentales en especificaciones modernas como JSON Web Tokens (JWT), que estudiaremos a fondo en el Capítulo 37.

Al igual que vimos con JSON y XML, Base64 soporta tanto operaciones en memoria (`EncodeToString`, `DecodeString`) como procesamiento en flujo a través de interfaces (`NewEncoder`, `NewDecoder` envolviendo `io.Writer` e `io.Reader` de las que hablamos en el Capítulo 12).

```go
package main

import (
	"encoding/base64"
	"fmt"
	"log"
)

func main() {
	payload := []byte("datos que podrían romper una URL: +/?&=")

	// Codificación Estándar
	stdEncoded := base64.StdEncoding.EncodeToString(payload)
	fmt.Printf("Estándar: %s\n", stdEncoded)

	// Codificación Segura para URLs (sin padding '=' para usar en JWTs o query params)
	urlEncoded := base64.RawURLEncoding.EncodeToString(payload)
	fmt.Printf("URL Safe (Raw): %s\n", urlEncoded)

	// Decodificación de la versión URL Safe
	decoded, err := base64.RawURLEncoding.DecodeString(urlEncoded)
	if err != nil {
		log.Fatalf("Error al decodificar base64: %v", err)
	}
	fmt.Printf("Decodificado: %s\n", string(decoded))
}
```

**Nota de rendimiento:** Si necesitas codificar o decodificar un *slice* de bytes sin incurrir en la asignación de memoria adicional que supone crear un nuevo `string`, ambos paquetes (`hex` y `base64`) ofrecen las funciones `Encode()` y `Decode()`. Estas operan directamente sobre un *slice* destino (`dst []byte`) pre-asignado, lo cual es vital en rutas de código calientes (hot paths) para no presionar al *Garbage Collector* (Capítulo 43).

## 15.3. Generación de Hashes criptográficos (SHA-256, MD5)

Un hash criptográfico es una función matemática unidireccional que toma un bloque de datos de tamaño variable y produce una salida de tamaño fijo, conocida como *digest* o resumen. A diferencia de la codificación (como vimos con Base64 o Hexadecimal) o el cifrado simétrico, el *hashing* es destructivo e irreversible: es computacionalmente inviable reconstruir el mensaje original a partir de su hash.

En Go, las implementaciones de estos algoritmos residen dentro del subárbol de paquetes `crypto/` (por ejemplo, `crypto/sha256`, `crypto/md5`, `crypto/sha512`).

### La Interfaz `hash.Hash`

El diseño de la biblioteca estándar de Go brilla especialmente en su manejo de funciones criptográficas. Todos los algoritmos de *hashing* devuelven un objeto que satisface la interfaz `hash.Hash`. Lo más destacable de esta interfaz es que **embebe internamente a `io.Writer`**. 

Esto significa que, para calcular el hash de cualquier cosa (un *string* en memoria, un archivo gigante en disco o un flujo de datos de red), simplemente instanciamos el hash y "escribimos" en él utilizando las técnicas que aprendimos en el Capítulo 12. Una vez volcados los datos, llamamos al método `Sum(nil)` para extraer el *slice* de bytes resultante.

### SHA-256: El estándar moderno

El algoritmo SHA-256 (Secure Hash Algorithm, produciendo un resumen de 256 bits) es el estándar actual de la industria para garantizar la integridad de los datos y generar identificadores únicos seguros. 

Para datos pequeños que ya residen en memoria, el paquete ofrece una función de conveniencia directa. Para flujos continuos, utilizamos el enfoque basado en `io.Writer`.

```go
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"strings"
)

func main() {
	mensaje := "este es un mensaje confidencial"

	// Enfoque 1: Función de conveniencia (Solo para datos en memoria)
	// Retorna un arreglo estático [32]byte, no un slice.
	hashEstatico := sha256.Sum256([]byte(mensaje))
	
	// Convertimos el arreglo a slice ([:]) y luego a Hexadecimal (Sección 15.2)
	fmt.Printf("SHA-256 (Memoria): %s\n", hex.EncodeToString(hashEstatico[:]))

	// Enfoque 2: Procesamiento en flujo usando hash.Hash (io.Writer)
	// Ideal para archivos grandes o respuestas HTTP
	hasher := sha256.New()
	lectorSimulado := strings.NewReader("este es un mensaje confidencial")

	// Copiamos el contenido del lector directamente al hasher
	if _, err := io.Copy(hasher, lectorSimulado); err != nil {
		log.Fatalf("Error al procesar el flujo: %v", err)
	}

	// Sum(nil) extrae el digest final calculando el estado interno
	digest := hasher.Sum(nil)
	fmt.Printf("SHA-256 (Flujo):   %s\n", hex.EncodeToString(digest))
}
```

### MD5: Uso histórico y advertencia de seguridad

El paquete `crypto/md5` implementa el algoritmo MD5, generando un resumen más corto de 128 bits. 

Es **crítico** entender que MD5 está criptográficamente roto. Es altamente vulnerable a ataques de colisión (donde dos entradas diferentes producen el mismo hash). Por lo tanto, **nunca debe utilizarse en contextos de seguridad**, como firmas digitales o certificados. 

Sin embargo, MD5 sigue siendo inmensamente rápido. En el desarrollo backend moderno con Go, se utiliza exclusivamente para verificaciones de integridad no maliciosas (checksums rápidos), como detectar si un archivo ha cambiado accidentalmente durante una transferencia o como clave de caché interna para fragmentos de datos donde el riesgo de colisión intencionada es cero.

**Nota sobre contraseñas:** Aunque SHA-256 es criptográficamente seguro para la integridad de datos, **no debe usarse directamente para almacenar contraseñas de usuarios**. Las funciones de hash estándar son demasiado rápidas, lo que las hace vulnerables a ataques de fuerza bruta y diccionarios con hardware especializado (GPUs). Para la persistencia de contraseñas, como abordaremos en el Capítulo 37, Go ofrece implementaciones de funciones de derivación de claves deliberadamente lentas, como Bcrypt (`golang.org/x/crypto/bcrypt`) o Argon2.
