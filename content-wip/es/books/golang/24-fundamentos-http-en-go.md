Go ha transformado el desarrollo web moderno al integrar un servidor de grado industrial directamente en su librería estándar. En este capítulo, desmitificamos el paquete `net/http`, explorando cómo transitar de prototipos simples a sistemas **robustos y resilientes**. Aprenderás a configurar límites de seguridad (*timeouts*), gestionar el ciclo de vida de peticiones mediante `Handlers` y orquestar el flujo de datos con el `ServeMux`. Esta base técnica es el cimiento indispensable antes de adoptar frameworks externos, garantizando que comprendas qué ocurre realmente bajo el capó de cada conexión TCP que tu servidor gestiona.

## 24.1. El paquete `net/http`: Servidores y Clientes robustos

A diferencia de muchos lenguajes de programación que delegan la capa HTTP a servidores de aplicaciones externos (como Gunicorn en Python, Tomcat en Java o Nginx actuando como proxy inverso obligatorio), Go fue diseñado en la era de la nube. Su paquete estándar `net/http` no es un simple servidor de desarrollo; es un servidor HTTP concurrente, de alto rendimiento y listo para producción que ha sido forjado en las batallas de la infraestructura de Google.

Sin embargo, que sea "listo para producción" no significa que sus configuraciones por defecto sean seguras para exponerlas directamente a internet. La robustez en Go requiere abandonar las funciones de conveniencia y configurar explícitamente los límites de nuestros servidores y clientes.

### El peligro de las configuraciones por defecto

Al iniciar en Go, es muy común encontrarse con código como este:

```go
// Antipatrón para producción
http.ListenAndServe(":8080", nil)

// o del lado del cliente...
respuesta, err := http.Get("https://api.externa.com/datos")
```

Aunque estas líneas son excelentes para prototipado rápido, esconden un peligro arquitectónico crítico: **no tienen tiempos de espera (timeouts) configurados**. 

Un cliente sin *timeout* esperará indefinidamente si el servidor remoto deja de responder pero mantiene la conexión TCP abierta. Un servidor sin *timeouts* de lectura es vulnerable a ataques de tipo *Slowloris*, donde un cliente malicioso envía datos muy lentamente para agotar todas las Goroutines disponibles (recordemos del Capítulo 8 que cada conexión HTTP en Go lanza una nueva Goroutine).

### Construyendo un Servidor HTTP Robusto

Para construir un servidor resistente, debemos instanciar explícitamente la estructura `http.Server` y definir sus límites temporales.

```go
package main

import (
	"log"
	"net/http"
	"time"
)

func main() {
	// Definimos el servidor explícitamente
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      nil, // Usaremos el DefaultServeMux por ahora (ver 24.2)
		
		// Timeouts críticos para evitar fugas de recursos y ataques DDoS
		ReadTimeout:  5 * time.Second,  // Tiempo máximo para leer la petición (cabeceras + cuerpo)
		WriteTimeout: 10 * time.Second, // Tiempo máximo para escribir la respuesta
		IdleTimeout:  120 * time.Second,// Tiempo máximo que una conexión Keep-Alive puede estar inactiva
	}

	log.Println("Iniciando servidor robusto en el puerto 8080...")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Error crítico en el servidor: %v", err)
	}
}
```

> **Nota de Arquitectura:** El `WriteTimeout` comienza a contar desde el momento en que se terminan de leer las cabeceras de la petición hasta que se termina de escribir la respuesta. Si tu *handler* hace un procesamiento pesado (por ejemplo, llamadas a bases de datos tratadas en el Capítulo 28), este valor debe ser lo suficientemente holgado para permitir que el proceso termine, pero lo suficientemente estricto para abortar peticiones colgadas.

### Construyendo un Cliente HTTP Robusto

El mismo principio aplica al consumir APIs externas. Jamás debemos usar `http.Get`, `http.Post` o el cliente por defecto (`http.DefaultClient`) en un entorno de producción.

Para crear un cliente robusto, no solo debemos configurar un `Timeout` global, sino que a menudo es necesario afinar el `http.Transport` subyacente. El `Transport` es el motor que maneja el *Connection Pooling* (reutilización de conexiones TCP), lo cual es vital para el rendimiento cuando hacemos múltiples peticiones al mismo host.

```go
package main

import (
	"log"
	"net/http"
	"time"
)

func main() {
	// 1. Configuramos el Transporte para optimizar la reutilización de conexiones
	t := &http.Transport{
		MaxIdleConns:          100,              // Máximo de conexiones inactivas en el pool global
		MaxIdleConnsPerHost:   10,               // Máximo de conexiones inactivas por dominio/host
		IdleConnTimeout:       90 * time.Second, // Tiempo tras el cual se cierra una conexión inactiva
		TLSHandshakeTimeout:   10 * time.Second, // Límite para la negociación TLS
		ExpectContinueTimeout: 1 * time.Second,
	}

	// 2. Inyectamos el Transporte en un Cliente con un Timeout global estricto
	client := &http.Client{
		Transport: t,
		Timeout:   15 * time.Second, // Límite absoluto para la petición completa (dial, envío, lectura)
	}

	// 3. Uso seguro del cliente
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/zen", nil)
	if err != nil {
		log.Fatalf("Error creando la petición: %v", err)
	}

	// (El manejo de Contextos en peticiones HTTP se profundizará, basándonos en el Cap 13)
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Error ejecutando la petición HTTP: %v", err)
	}
	defer resp.Body.Close() // Fundamental para devolver la conexión al pool

	log.Printf("Petición exitosa. Código de estado: %d", resp.StatusCode)
}
```

#### Reglas de oro para Clientes HTTP en Go:
* **Comparte el Cliente:** El `http.Client` es seguro para el uso concurrente (Thread-safe). Instáncialo una sola vez a nivel de aplicación (o por dominio) y compártelo entre tus Goroutines. Crear un cliente nuevo por cada petición destruye los beneficios del *Connection Pooling*.
* **Cierra siempre el Body:** Omitir `defer resp.Body.Close()` causa una fuga de recursos. Si el cuerpo no se cierra, la conexión TCP subyacente no puede ser devuelta al *pool* administrado por el `http.Transport`.
* **Drena el Body antes de cerrar (Opcional pero recomendado):** Si no necesitas leer la respuesta completa pero quieres reutilizar la conexión TCP, debes leer y descartar el cuerpo (`io.Copy(io.Discard, resp.Body)`) antes de cerrarlo.

Al dominar estas estructuras base, garantizamos que nuestra aplicación no colapsará ante latencias impredecibles de la red, sentando las bases para el enrutamiento y procesamiento que veremos a continuación.

## 24.2. Creación de Handlers y uso del `ServeMux` nativo

En la sección anterior construimos un servidor HTTP (`http.Server`) blindado contra problemas de red y concurrencia. Sin embargo, un servidor robusto carece de utilidad si no sabe cómo procesar las peticiones entrantes. En Go, la lógica que procesa una petición HTTP y genera una respuesta se encapsula en lo que denominamos un **Handler** (manejador).

El ecosistema HTTP de Go gira en torno a una única, elegante y minimalista interfaz definida en la *standard library*: `http.Handler`.

### La interfaz `http.Handler` y el adaptador `HandlerFunc`

Cualquier tipo en Go que implemente el método `ServeHTTP` satisface implícitamente la interfaz `http.Handler` (recordando el *Duck Typing* que vimos en el Capítulo 7). Su definición exacta es la siguiente:

```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```

* **`http.ResponseWriter`**: Es una interfaz que permite ensamblar la respuesta HTTP (escribir cabeceras, el código de estado y el cuerpo).
* **`*http.Request`**: Es un puntero a un struct que contiene toda la información de la petición entrante (URL, método, cuerpo, cabeceras). Profundizaremos en su manipulación en la sección 24.3.

Aunque podemos crear *structs* personalizados que implementen esta interfaz (muy útil cuando nuestro *handler* necesita dependencias como una conexión a la base de datos o un *logger*), la forma más idiomática y común de crear manejadores es a través de funciones estándar, utilizando el adaptador **`http.HandlerFunc`**.

`HandlerFunc` es un tipo de función que a su vez implementa el método `ServeHTTP`. Actúa como un puente que permite que funciones normales con la firma correcta sean tratadas como manejadores completos.

```go
package main

import (
	"fmt"
	"net/http"
)

// Un handler basado en una función regular
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	// Escribimos una respuesta simple
	fmt.Fprintln(w, "OK: El servicio está operativo")
}

// Un handler basado en un struct (útil para inyectar dependencias)
type DatabaseHandler struct {
	dbConnString string
}

func (h *DatabaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Conectado a la BD usando: %s\n", h.dbConnString)
}
```

### El enrutador nativo: `ServeMux`

Una vez que tenemos nuestros manejadores, necesitamos un mecanismo que dirija cada petición HTTP entrante al *handler* correspondiente según la ruta (URL) solicitada. Este componente se conoce como **Multiplexor** o *Router*, y Go proporciona una implementación nativa a través de la estructura `http.ServeMux`.

Curiosamente, un `ServeMux` es en sí mismo un `http.Handler`. Su implementación de `ServeHTTP` consiste en analizar la URL de la petición entrante, compararla con un registro interno de rutas configuradas, y delegar la ejecución al *handler* que mejor coincida.

#### El peligro del `DefaultServeMux`

Si has visto tutoriales básicos de Go, es probable que hayas encontrado funciones como `http.HandleFunc("/ruta", miHandler)`. Esta función de paquete registra la ruta en una instancia global compartida llamada `http.DefaultServeMux`. 

**Para aplicaciones a nivel de producción, el uso del `DefaultServeMux` es un antipatrón.** Al ser una variable global exportada, cualquier paquete de terceros que importes podría registrar rutas arbitrarias (como endpoints de *debug* o *profiling* expuestos accidentalmente) en tu servidor sin tu conocimiento, abriendo graves brechas de seguridad.

La práctica correcta es instanciar explícitamente tu propio `ServeMux`:

```go
package main

import (
	"log"
	"net/http"
	"time"
)

func main() {
	// 1. Instanciamos un multiplexor privado y aislado
	mux := http.NewServeMux()

	// 2. Registramos rutas usando el adaptador HandleFunc
	mux.HandleFunc("/api/health", healthCheckHandler)

	// 3. Registramos un struct que implementa Handler directamente
	dbHandler := &DatabaseHandler{dbConnString: "postgres://user:pass@localhost/db"}
	mux.Handle("/api/db-status", dbHandler)

	// 4. Inyectamos nuestro multiplexor en el servidor robusto
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux, // Aquí asignamos nuestro ServeMux personalizado
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Println("Servidor escuchando en http://localhost:8080")
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Error en el servidor: %v", err)
	}
}
```

#### Reglas de coincidencia (Matching) del ServeMux Clásico

Antes de la llegada de las mejoras de enrutamiento en Go 1.22 (que exploraremos a fondo en el Capítulo 25), el `ServeMux` clásico operaba bajo reglas muy precisas y limitadas:

1.  **Coincidencia exacta vs. Prefijos:** * Una ruta que *no* termina en barra (ej. `/api/health`) solo coincidirá con esa URL exacta. Si alguien pide `/api/health/`, recibirá un error 404 (Not Found).
    * Una ruta que *sí* termina en barra (ej. `/api/`) actúa como un prefijo o "capturador universal" (catch-all) para ese árbol de directorios. Coincidirá con `/api/`, `/api/usuarios`, `/api/archivos/foto.png`, etc., a menos que exista una ruta más específica registrada.
2.  **Ruta raíz (`/`):** Al terminar en barra, registrar el patrón `/` atrapará absolutamente todas las peticiones que no coincidan con ninguna otra ruta definida. Es el lugar ideal para implementar una respuesta 404 personalizada o servir una Single Page Application (SPA).
3.  **Redirecciones automáticas:** Si registras `/arbol/` y un cliente solicita `/arbol` (sin la barra final), el `ServeMux` automáticamente emitirá una redirección HTTP 301 (Moved Permanently) hacia `/arbol/`, a menos que `/arbol` haya sido explícitamente registrado.

El `ServeMux` clásico es extremadamente rápido y seguro debido a su simplicidad (utiliza árboles de búsqueda optimizados internamente). Sin embargo, carece de soporte nativo para extracción de variables de la URL (ej. `/usuarios/{id}`) o filtrado por método HTTP (GET, POST) en versiones anteriores a Go 1.22. Es por esto que los *handlers* a menudo debían comenzar con validaciones manuales del método HTTP, algo que abordaremos en las siguientes secciones al leer y validar la petición.

## 24.3. Lectura de Request Body, Query Params y escritura de Responses

Una vez que el `ServeMux` ha enrutado la petición HTTP a nuestro *handler*, el siguiente paso lógico es interactuar con los datos de entrada y formular una salida. En la interfaz `http.Handler`, esta dualidad está representada por los dos parámetros que recibe el método `ServeHTTP`: el puntero `*http.Request` (la entrada) y la interfaz `http.ResponseWriter` (la salida).

Comprender cómo manipular estos dos elementos de forma segura y eficiente es el núcleo del desarrollo de APIs en Go.

### Extracción de Query Parameters

Los parámetros de consulta (*Query Params*) son los pares clave-valor que se añaden al final de una URL tras el signo de interrogación (ej. `/api/usuarios?rol=admin&activo=true`). 

En Go, la estructura `*http.Request` contiene un campo `URL` de tipo `*url.URL`. Para acceder a los parámetros, utilizamos el método `Query()`, el cual analiza la cadena de consulta y devuelve un mapa subyacente de tipo `url.Values` (que internamente es un `map[string][]string`).

```go
func buscarUsuariosHandler(w http.ResponseWriter, r *http.Request) {
	// r.URL.Query() parsea la URL y devuelve url.Values
	queryParams := r.URL.Query()

	// Obtener un valor único (devuelve un string vacío si no existe)
	rol := queryParams.Get("rol")
	if rol == "" {
		rol = "usuario_base" // Valor por defecto
	}

	// Como es un map[string][]string, podemos iterar si hay múltiples valores
	// Ej: ?etiqueta=golang&etiqueta=backend
	etiquetas := queryParams["etiqueta"] // Devuelve un slice: []string{"golang", "backend"}

	// ... lógica de búsqueda ...
}
```

> **Nota de rendimiento:** El método `r.URL.Query()` analiza la cadena de consulta cada vez que se llama y asigna un nuevo mapa en memoria. Si necesitas acceder a los parámetros múltiples veces dentro de tu flujo, es imperativo almacenar el resultado en una variable local en lugar de llamar al método repetidamente.

### Lectura segura del Request Body

Cuando recibimos peticiones `POST`, `PUT` o `PATCH`, la carga útil (*payload*) viaja en el cuerpo de la petición (`r.Body`). Este campo es una interfaz `io.ReadCloser`.

Aquí es donde muchos desarrolladores cometen un error crítico de seguridad: leer el cuerpo directamente sin imponer límites. Si un cliente malicioso envía un cuerpo de 50 GB (un ataque de denegación de servicio o DoS), `io.ReadAll` intentará cargar todo en la memoria RAM, provocando un *Out of Memory (OOM)* y colapsando el servidor.

La práctica recomendada en el libro técnico avanzado de Go es envolver **siempre** el `r.Body` con `http.MaxBytesReader`.

```go
type UsuarioPayload struct {
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
}

func crearUsuarioHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Limitar el tamaño del cuerpo a 1 MB (1 << 20 bytes)
	// Si el cliente envía más de 1MB, r.Body devolverá un error y abortará la lectura.
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	// 2. Decodificar el JSON directamente desde el flujo (Stream)
	var payload UsuarioPayload
	decoder := json.NewDecoder(r.Body)
	
	// DisallowUnknownFields rechaza el JSON si contiene campos que no están en el Struct
	decoder.DisallowUnknownFields() 

	if err := decoder.Decode(&payload); err != nil {
		// Manejo de errores (se profundizará en la sección 26.4)
		http.Error(w, "Payload inválido o demasiado grande", http.StatusBadRequest)
		return
	}

	// ... lógica de creación ...
}
```
*A diferencia del cliente HTTP (sección 24.1), en el lado del servidor el `ServeMux` de Go se encarga automáticamente de cerrar el `r.Body` al finalizar el handler, por lo que no es estrictamente necesario (aunque no hace daño) usar `defer r.Body.Close()`.*

### Escritura de Responses (El orden importa)

La interfaz `http.ResponseWriter` es la herramienta para enviar datos de vuelta al cliente. Para usarla correctamente, es vital entender que **el orden de las operaciones es estricto e inmutable**. Las respuestas HTTP se componen de tres partes, y el `ResponseWriter` exige que se escriban en este orden exacto:

1.  **Cabeceras (Headers):** Se manipulan a través del mapa devuelto por `w.Header()`.
2.  **Código de Estado (Status Code):** Se envía usando `w.WriteHeader(int)`.
3.  **Cuerpo (Body):** Se envía usando `w.Write([]byte)`.

**La regla de oro:** Una vez que llamas a `w.WriteHeader()` o a `w.Write()`, las cabeceras se "congelan" y se envían al cliente. Cualquier modificación posterior al mapa `w.Header()` será ignorada silenciosamente por Go. 

Además, si llamas a `w.Write()` sin haber llamado antes a `w.WriteHeader()`, Go asumirá automáticamente un código `200 OK` y determinará el `Content-Type` basándose en los primeros 512 bytes de los datos usando `http.DetectContentType`.

Veamos cómo estructurar una respuesta JSON idiomática:

```go
func obtenerPerfilHandler(w http.ResponseWriter, r *http.Request) {
	perfil := map[string]string{
		"nombre": "Ada Lovelace",
		"rol":    "admin",
	}

	// 1. Establecer las cabeceras (ANTES de escribir el estado o el cuerpo)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Powered-By", "Go")

	// 2. Establecer el código de estado HTTP
	w.WriteHeader(http.StatusOK) // 200

	// 3. Escribir el cuerpo
	// json.NewEncoder es más eficiente que json.Marshal para escribir directamente en la red
	if err := json.NewEncoder(w).Encode(perfil); err != nil {
		// Si ocurre un error aquí, ya no podemos cambiar el código a 500
		// porque WriteHeader(200) ya fue llamado. Por eso el logging es crucial.
		log.Printf("Error codificando respuesta: %v", err)
	}
}
```

Dominar la lectura controlada del `Request` y la escritura ordenada del `Response` previene la mayoría de los errores silenciosos (como cabeceras que nunca llegan al cliente o fugas de memoria) que plagan a los desarrolladores *backend* en sus primeros proyectos con Go.

## 24.4. Manejo correcto de cabeceras y códigos de estado HTTP

El protocolo HTTP es fundamentalmente semántico. Un cuerpo de respuesta bien estructurado pierde gran parte de su valor si no va acompañado del código de estado adecuado o de las cabeceras que dictan cómo debe ser interpretado por el cliente, los proxies o las cachés intermedias.

Go proporciona herramientas tipadas y constantes integradas para evitar el uso de "números mágicos" y cadenas de texto propensas a errores tipográficos.

### Códigos de Estado Semánticos

Uno de los antipatrones más comunes al escribir APIs es el uso de enteros literales para definir el resultado de una operación (por ejemplo, `w.WriteHeader(400)` o `w.WriteHeader(500)`). Aunque esto es sintácticamente válido, perjudica la legibilidad y el mantenimiento del código.

El paquete `net/http` define constantes explícitas para prácticamente todos los códigos de estado del RFC 7231. Su uso en aplicaciones profesionales es innegociable.

```go
// ❌ Antipatrón: Uso de números mágicos
w.WriteHeader(201)
w.WriteHeader(422)

// ✅ Práctica Idiomática: Uso de constantes de la standard library
w.WriteHeader(http.StatusCreated)             // 201
w.WriteHeader(http.StatusUnprocessableEntity) // 422
```

> **Nota de Diseño:** Si intentas enviar un código de estado inválido (como `w.WriteHeader(999)`), Go no entrará en pánico (*panic*), pero el comportamiento dependerá del servidor subyacente o del cliente que reciba la anomalía. Mantente siempre dentro de los estándares de la IANA definidos en las constantes del paquete.

### Anatomía y Manipulación de Cabeceras (`Set` vs. `Add`)

Como vimos en la sección anterior, las cabeceras se acceden a través del método `w.Header()` antes de escribir el estado o el cuerpo. Lo que este método devuelve es un tipo `http.Header`, que subyacentemente es un mapa de *slices* de strings: `map[string][]string`.

Esta estructura interna (un *slice* por cada clave) existe porque el protocolo HTTP permite que una misma cabecera se envíe múltiples veces. Aquí es donde radica la diferencia crucial entre los métodos `Set` y `Add`:

* **`Set(key, value)`**: Reemplaza cualquier valor existente para esa clave. Es el método más común para cabeceras únicas como `Content-Type` o `Authorization`.
* **`Add(key, value)`**: Añade un nuevo valor al *slice* existente sin borrar los anteriores. Es indispensable para cabeceras que se repiten, siendo `Set-Cookie` el ejemplo más clásico.

```go
func authHandler(w http.ResponseWriter, r *http.Request) {
	// Set: Garantiza que solo haya un Content-Type
	w.Header().Set("Content-Type", "application/json")

	// Add: Permite enviar múltiples cookies en la misma respuesta
	w.Header().Add("Set-Cookie", "session_id=abc1234; HttpOnly; Secure")
	w.Header().Add("Set-Cookie", "theme=dark; Path=/")

	// Del: Elimina una cabecera previamente establecida
	w.Header().Del("X-Powered-By") // Buena práctica de seguridad por ofuscación

	w.WriteHeader(http.StatusOK)
	// ... escritura del cuerpo ...
}
```

### La Canonización Automática de Go

Un detalle fascinante (y a veces frustrante para los principiantes) del paquete `net/http` es que **Go canoniza automáticamente las claves de las cabeceras**.

La canonización significa que la primera letra y cualquier letra que siga a un guion se convierten en mayúsculas, mientras que el resto pasa a minúsculas. Por ejemplo:
* `content-type` se convierte en `Content-Type`
* `x-api-key` se convierte en `X-Api-Key`

Esto ocurre internamente tanto al leer de `r.Header` como al escribir en `w.Header()`. Si necesitas enviar o leer una cabecera con un formato que rompa esta regla (lo cual viola las recomendaciones del protocolo HTTP/1.1, pero a veces es requerido por sistemas *legacy*), debes acceder al mapa subyacente directamente, saltándote los métodos `Set` o `Get`:

```go
// Acceso directo al mapa para evitar la canonización (Caso excepcional)
w.Header()["x-custom-UNFORMATTED-header"] = []string{"valor_especial"}
```

Para normalizar cualquier string tú mismo, puedes usar la función pública `http.CanonicalHeaderKey("tu-cabecera")`.

### Funciones de Conveniencia: `http.Error` y `http.Redirect`

Para respuestas de error simples en texto plano o para redirecciones, Go ofrece atajos que encapsulan la escritura de cabeceras, el código de estado y el cuerpo en una sola línea.

1.  **`http.Error`**: Envía un mensaje de texto puro, establece la cabecera `X-Content-Type-Options: nosniff` (para evitar vulnerabilidades de tipo MIME sniffing) y escribe el código de error.
2.  **`http.Redirect`**: Establece la cabecera `Location` y escribe un código de estado 3xx.

```go
func legacyEndpointHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		// Atajo seguro para errores rápidos (texto plano)
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	// Atajo para redirecciones seguras
	http.Redirect(w, r, "/api/v2/nuevo-endpoint", http.StatusMovedPermanently)
}
```

*Importante: `http.Error` está diseñado para respuestas de texto simple. Si tu API debe devolver errores estructurados en JSON (como veremos en el Capítulo 26 con el RFC 7807 Problem Details), deberás construir la respuesta manualmente usando `Set`, `WriteHeader` y `json.NewEncoder`.*

