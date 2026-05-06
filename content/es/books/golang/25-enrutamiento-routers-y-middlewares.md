Tras dominar las bases de `net/http`, es hora de elevar la construcción de servicios a un nivel profesional. En este capítulo, exploraremos la evolución del enrutamiento en Go, desde las potentes mejoras de **coincidencia de patrones** introducidas en la versión 1.22 hasta el uso estratégico de *frameworks* de alto rendimiento como **Gin, Chi y Echo**. Además, profundizaremos en la arquitectura de **middlewares**, el motor que permite inyectar lógica transversal —como seguridad, logging y recuperación de errores— sin contaminar el dominio. Aprenderás a diseñar cadenas de ejecución robustas y eficientes para transformar un simple servidor en una API RESTful de grado empresarial.

## 25.1. El enrutador avanzado de la standard library (Go 1.22+)

Como vimos en el capítulo anterior, el `http.ServeMux` clásico de Go fue durante años una herramienta robusta pero extremadamente espartana. Su incapacidad nativa para distinguir métodos HTTP (GET, POST, etc.) o para extraer variables directamente de las rutas obligaba a los desarrolladores a escribir código repetitivo (boilplate) o a delegar inmediatamente estas tareas a librerías de terceros. 

A partir de Go 1.22, la *standard library* introdujo una actualización masiva en su multiplexor, transformándolo en un enrutador moderno y semántico sin sacrificar la filosofía de simplicidad del lenguaje. Esta mejora drástica reduce significativamente la necesidad de dependencias externas para APIs RESTful estándar.

### Enrutamiento por Método HTTP

Antes de Go 1.22, diferenciar una petición de lectura de una de creación en la misma ruta requería inspeccionar el `r.Method` manualmente dentro del *handler*. Ahora, el `ServeMux` permite declarar el método directamente en el patrón de la ruta, separándolo por un espacio:

```go
mux := http.NewServeMux()

// El método se especifica como prefijo
mux.HandleFunc("GET /api/users", handleGetUsers)
mux.HandleFunc("POST /api/users", handleCreateUser)

// Si no se especifica método, actúa como un "catch-all" para cualquier método
mux.HandleFunc("/api/health", handleHealthCheck)
```

Si un cliente intenta acceder a `/api/users` con un método no soportado (por ejemplo, `PUT`), el nuevo `ServeMux` responderá automáticamente con un código de estado `405 Method Not Allowed` y la cabecera `Allow` correspondiente, cumpliendo estrictamente con el estándar HTTP sin esfuerzo adicional por tu parte.

### Variables de Ruta (Path Variables) y Comodines

La característica más esperada era la capacidad de capturar segmentos dinámicos de la URL. Go 1.22 introduce el uso de llaves `{}` para definir **comodines** (wildcards) dentro del patrón de la ruta.

Para recuperar el valor capturado durante la ejecución del *handler*, el paquete `net/http` expone el nuevo método `Request.PathValue(key string)`.

```go
mux.HandleFunc("GET /api/users/{id}", func(w http.ResponseWriter, r *http.Request) {
    // Extracción directa del valor de la ruta
    userID := r.PathValue("id")
    
    fmt.Fprintf(w, "Obteniendo detalles del usuario: %s", userID)
})
```

Además de los comodines de segmento único, puedes definir **comodines de ruta completa** agregando `...` al final del nombre de la variable. Esto es útil para capturar rutas jerárquicas o servir archivos estáticos:

```go
// Captura cualquier subruta después de /files/
mux.HandleFunc("GET /files/{filepath...}", func(w http.ResponseWriter, r *http.Request) {
    path := r.PathValue("filepath")
    fmt.Fprintf(w, "Ruta del archivo solicitado: %s", path)
})
```

### Coincidencias Exactas con `{$}`

Históricamente, registrar el patrón `/` en Go significaba capturar *absolutamente todo* lo que no coincidiera con otra ruta, actuando como un directorio raíz. Si querías coincidir *únicamente* con la ruta exacta `/` (y no con `/algo-mas`), debías verificar `r.URL.Path` manualmente.

El nuevo enrutador soluciona esto introduciendo el sufijo `{$}`, que fuerza una coincidencia exacta de la URL, impidiendo que actúe como un prefijo:

```go
// Solo coincidirá con la URL exacta "/", respondiendo 404 para "/favicon.ico" o "/home"
mux.HandleFunc("GET /{$}", handleHomePage)

// Coincidirá exactamente con "/config". 
// A diferencia de "GET /config/", no capturará subrutas como "/config/db"
mux.HandleFunc("GET /config{$}", handleConfigMap)
```

### Resolución de Conflictos (Precedencia)

Con la introducción de los comodines, surge la posibilidad de solapar rutas. Por ejemplo, ¿qué ocurre si registras tanto `GET /users/admin` como `GET /users/{id}`?

Go 1.22 abandona el antiguo sistema de precedencia basado en la longitud de la cadena e introduce un sistema de **especificidad**. La regla de oro es: *el patrón más específico gana*. 

En el caso anterior, `/users/admin` es un patrón estático y, por ende, más específico que `/users/{id}`. Si la petición es `/users/admin`, Go ejecutará el *handler* estático. Si la petición es `/users/123`, ejecutará el que contiene el comodín.

> **Nota arquitectónica:** El registro de rutas se valida en tiempo de inicio. Si registras dos patrones conflictivos que tienen exactamente el mismo nivel de especificidad y Go no puede determinar cuál es el prioritario de forma determinista, la aplicación entrará en estado de pánico (`panic`) inmediatamente al ejecutar `http.ListenAndServe`. Esto promueve un diseño de API limpio (fail-fast) y evita comportamientos impredecibles en producción.

Con estas actualizaciones, la *standard library* cubre el 90% de los casos de uso para microservicios y APIs RESTful modernas. Sin embargo, para ecosistemas que requieren agrupamiento complejo de rutas (Route Groups) o un ecosistema masivo de *middlewares* integrados, los enrutadores de terceros siguen teniendo su lugar, como veremos en la siguiente sección.

## 25.2. Routers de terceros de alto rendimiento (Chi, Gin, Echo)

A pesar de las sustanciales mejoras del `http.ServeMux` en Go 1.22, el ecosistema de enrutadores de terceros sigue siendo fundamental en arquitecturas complejas. Las limitaciones de la *standard library* se hacen evidentes cuando un proyecto requiere agrupar rutas de forma anidada, aplicar *middlewares* de manera selectiva por grupo, o cuando se busca un rendimiento extremo con cero asignaciones de memoria (zero-allocation).

A continuación, analizaremos los tres enrutadores más predominantes en la industria, sus filosofías de diseño y cuándo elegir cada uno.

### Chi: El purista idiomático

`go-chi/chi` es, sin lugar a dudas, el enrutador favorito de los desarrolladores que buscan mantenerse estrictamente adheridos a la *standard library*. Su mayor ventaja es que es **100% compatible con `net/http`**. No inventa sus propios tipos para manejar el contexto o las peticiones; en su lugar, extiende lo que Go ya ofrece.

La característica estrella de Chi es su capacidad para componer árboles de enrutamiento y agrupar *middlewares* de forma limpia y modular.

```go
r := chi.NewRouter()

// Middleware global
r.Use(middleware.Logger)
r.Use(middleware.Recoverer)

// Agrupamiento de rutas (Route Groups)
r.Route("/api/v1", func(r chi.Router) {
    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    // Subgrupo con middleware específico
    r.Group(func(r chi.Router) {
        r.Use(AuthMiddleware) // Solo afecta a las rutas de este bloque
        r.Post("/users", createUser)
        r.Get("/users/{id}", getUser)
    })
})

http.ListenAndServe(":8080", r)
```

**Cuándo usarlo:** Cuando deseas la flexibilidad de grupos y *middlewares* avanzados sin atarte a un *framework* que reemplace las interfaces estándar de Go.

### Gin: El coloso del rendimiento

`gin-gonic/gin` es probablemente el *framework* web más popular de Go. Su enfoque principal es el rendimiento absoluto y la productividad del desarrollador. Utiliza una versión personalizada de un árbol Radix (basado en `httprouter`) para garantizar tiempos de enrutamiento casi nulos y evitar la asignación de memoria dinámica durante las peticiones.

A diferencia de Chi, Gin introduce su propia firma para los *handlers* a través de `*gin.Context`. Este contexto engloba tanto el `http.Request` como el `http.ResponseWriter` y añade docenas de métodos utilitarios para validación, serialización y renderizado.

```go
r := gin.Default() // Incluye middlewares de Logger y Recovery por defecto

v1 := r.Group("/api/v1")
{
    v1.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        
        // Renderizado JSON nativo e integrado
        c.JSON(http.StatusOK, gin.H{
            "status": "success",
            "user_id": id,
        })
    })
}

r.Run(":8080")
```

**Cuándo usarlo:** Cuando construyes APIs RESTful con un alto volumen de tráfico y necesitas utilidades de "baterías incluidas" (validación de JSON, manejo rápido de errores, renderizado) priorizando la velocidad de desarrollo.

### Echo: El minimalista productivo

`labstack/echo` comparte gran parte de la filosofía de Gin: alto rendimiento a través de árboles Radix, un contexto personalizado (`echo.Context`) y una extensa colección de *middlewares* integrados. 

La diferencia principal radica en su API, que muchos desarrolladores consideran más limpia y expresiva que la de Gin, y su excelente sistema de *Data Binding* que permite extraer datos del *payload*, *query params* o variables de ruta directamente hacia un *struct* con una sola línea de código.

```go
e := echo.New()

e.GET("/users/:id", func(c echo.Context) error {
    id := c.Param("id")
    
    // Echo requiere retornar un error en sus handlers
    return c.JSON(http.StatusOK, map[string]string{
        "id": id,
        "message": "Usuario encontrado",
    })
})

e.Start(":8080")
```

**Cuándo usarlo:** Es la alternativa directa a Gin. Se prefiere cuando el equipo valora una documentación ligeramente más estructurada y un patrón de diseño donde los *handlers* retornan explícitamente valores `error`, lo cual se alinea muy bien con el control de errores idiomático de Go.

---

### Resumen de Selección

| Enrutador | Compatibilidad `net/http` | Rendimiento | Ecosistema / Filosofía |
| :--- | :--- | :--- | :--- |
| **Stdlib (1.22+)** | Nativa | Alto | Minimalista, sin dependencias. Ideal para servicios simples. |
| **Chi** | 100% | Alto | Idiomático, excelente composición de *middlewares*. |
| **Gin** | Requiere adaptadores | Extremo | *Framework* completo, utilidades integradas, altamente adoptado. |
| **Echo** | Requiere adaptadores | Extremo | API limpia, *data binding* superior, retorno explícito de errores. |

## 25.3. Diseño, implementación y encadenamiento de Middlewares

En el ecosistema de Go, un *middleware* no es una construcción mágica del lenguaje ni requiere de un framework complejo; es simplemente la aplicación práctica del **Patrón Decorador** (visto en el Capítulo 23) sobre los manejadores HTTP. 

Su propósito es interceptar una petición entrante, ejecutar lógica de validación, transformación o registro (logging), y luego decidir si pasa el control al siguiente manejador de la cadena o si aborta la petición tempranamente.

### La firma estándar e idiomática

Para mantener la compatibilidad universal con la *standard library* (`net/http`) y con enrutadores como Chi, un middleware en Go debe adherirse a una firma específica. Debe ser una función que recibe un `http.Handler` y retorna un `http.Handler`.

Internamente, se hace uso del adaptador `http.HandlerFunc` para transformar una función anónima en un tipo que satisfaga la interfaz `http.Handler`.

```go
func MiMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Lógica PREVIA (Inbound): Se ejecuta antes de llegar al handler final
        fmt.Println("Ejecutando antes del handler...")

        // 2. Paso de control: Llama al siguiente eslabón de la cadena
        next.ServeHTTP(w, r)

        // 3. Lógica POSTERIOR (Outbound): Se ejecuta cuando la respuesta ya se generó
        fmt.Println("Ejecutando después del handler...")
    })
}
```

Esta estructura de "cebolla" permite que el middleware envuelva completamente el ciclo de vida de la petición. Si en la fase previa detectas, por ejemplo, que un token de autorización es inválido, simplemente omites la llamada a `next.ServeHTTP(w, r)`, escribes el error en el `http.ResponseWriter` y retornas. La cadena se rompe y el *handler* final nunca llega a ejecutarse.

### Comunicación mediante el Contexto

Dado que los middlewares operan antes que los controladores finales, a menudo necesitan inyectar información procesada (como el ID del usuario autenticado o un ID de rastreo) para que el *handler* la consuma. 

Como vimos en el Capítulo 13, la forma idiomática de pasar variables de alcance de petición es a través del `context.Context` incrustado en el `*http.Request`.

```go
type contextKey string
const userContextKey = contextKey("userID")

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simulación de extracción y validación de token
        userID := "user_12345"

        // Crear un nuevo contexto con el valor inyectado
        ctx := context.WithValue(r.Context(), userContextKey, userID)

        // Crear un clon del request con el nuevo contexto
        reqWithCtx := r.WithContext(ctx)

        // Pasar el request modificado al siguiente handler
        next.ServeHTTP(w, reqWithCtx)
    })
}
```

### El problema del encadenamiento (Chaining)

Cuando tu aplicación crece, es común requerir múltiples middlewares por ruta (ej. *Logging*, *Recuperación de Pánicos*, *Autenticación*, *CORS*). Aplicar la firma estándar manualmente resulta en un código profundamente anidado y difícil de leer:

```go
// Antipatrón: Anidación profunda (Callback Hell estilo middleware)
handlerFinal := AuthMiddleware(LoggingMiddleware(RecoveryMiddleware(miHandler)))
```

Para solucionar esto de forma elegante sin recurrir a frameworks pesados, puedes implementar una función generadora de cadenas. La idea es iterar un *slice* de middlewares y aplicarlos secuencialmente.

```go
// Definimos el tipo para mayor legibilidad
type Middleware func(http.Handler) http.Handler

// Chain encadena múltiples middlewares en un solo http.Handler
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
    // Iteramos en orden inverso para que el primer middleware 
    // de la lista sea el recubrimiento más externo.
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}
```

Con esta pequeña utilidad constructora, la aplicación de políticas transversales a tus manejadores se vuelve lineal, declarativa y limpia:

```go
mux := http.NewServeMux()

misMiddlewares := []Middleware{
    RecoveryMiddleware,
    LoggingMiddleware,
    AuthMiddleware,
}

// Aplicación encadenada sobre el handler final
mux.Handle("GET /perfil", Chain(http.HandlerFunc(handlePerfil), misMiddlewares...))
```

Este enfoque minimalista es la base sobre la cual librerías populares como `justinas/alice` o el método `.Use()` de *Chi* y *Gin* construyen sus propios ecosistemas de encadenamiento.

## 25.4. Middlewares esenciales: Logging, Recovery y CORS

Al desplegar una API RESTful en un entorno de producción, la lógica de negocio pura no es suficiente. Existen políticas transversales que toda aplicación robusta debe implementar en la capa de transporte para garantizar observabilidad, resiliencia y compatibilidad con clientes web. A continuación, desarrollaremos los tres *middlewares* fundamentales utilizando puramente la *standard library* de Go.

### 1. Logging: Observabilidad y el patrón "Envoltorio de Respuesta"

Registrar cada petición HTTP entrante es el primer paso hacia una API observable. Un buen *middleware* de *logging* debe registrar el método, la ruta de acceso, el tiempo que tardó en procesarse la petición (latencia) y el código de estado HTTP resultante.

Sin embargo, aquí nos encontramos con una limitación de diseño de la interfaz `http.ResponseWriter` nativa de Go: **no expone un método para leer el código de estado una vez que ha sido escrito**. Para solucionar esto, empleamos un patrón avanzado creando un envoltorio (*wrapper*) personalizado.

```go
// responseRecorder envuelve un http.ResponseWriter para capturar el código de estado
type responseRecorder struct {
    http.ResponseWriter
    statusCode int
}

// Sobrescribimos el método WriteHeader para interceptar el código
func (rec *responseRecorder) WriteHeader(code int) {
    rec.statusCode = code
    rec.ResponseWriter.WriteHeader(code)
}

// LoggingMiddleware registra los detalles vitales de cada petición
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        inicio := time.Now()

        // Inicializamos nuestro envoltorio con un código 200 por defecto
        rec := &responseRecorder{
            ResponseWriter: w,
            statusCode:     http.StatusOK,
        }

        // Pasamos el envoltorio en lugar del ResponseWriter original
        next.ServeHTTP(rec, r)

        duracion := time.Since(inicio)

        // En un entorno real, usarías log/slog estructurado (ver Capítulo 39)
        log.Printf("[%s] %s | Estado: %d | Latencia: %v", 
            r.Method, r.URL.Path, rec.statusCode, duracion)
    })
}
```

### 2. Recovery: Prevención de caídas catastróficas

En el modelo de concurrencia de Go (como vimos en la Parte 3), cada petición HTTP es manejada por su propia *goroutine*. Si ocurre un `panic` no controlado dentro de esa *goroutine* (por ejemplo, una desreferencia de puntero nulo o un índice fuera de rango), **todo el servidor web colapsará**, finalizando abruptamente el proceso completo.

El *middleware* de *Recovery* es una barrera de seguridad crítica. Utiliza la combinación idiomática de `defer` y `recover()` para atrapar cualquier pánico, registrar la traza de la pila (*stack trace*) para depuración, y devolver gracefully un error HTTP 500 al cliente en lugar de tirar el servidor.

```go
import "runtime/debug"

// RecoveryMiddleware atrapa pánicos y evita que el servidor se detenga
func RecoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                // Registramos el error y la pila de llamadas exacta
                log.Printf("¡PÁNICO DETECTADO!: %v\n%s", err, debug.Stack())

                // Devolvemos un error genérico al cliente por seguridad
                http.Error(w, "Error Interno del Servidor", http.StatusInternalServerError)
            }
        }()

        next.ServeHTTP(w, r)
    })
}
```

### 3. CORS: Intercambio de Recursos de Origen Cruzado

Si tu API será consumida por una aplicación Frontend en el navegador (React, Vue, Angular) alojada en un dominio o puerto diferente, los navegadores bloquearán las peticiones por defecto debido a la política del Mismo Origen (*Same-Origin Policy*). 

El *middleware* CORS (*Cross-Origin Resource Sharing*) inyecta las cabeceras HTTP necesarias para autorizar estas peticiones y gestiona las solicitudes *Preflight* automáticas que los navegadores hacen usando el método `OPTIONS`.

```go
// CORSMiddleware habilita el acceso seguro desde dominios externos
func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Configurar orígenes permitidos (en producción, evita usar "*" si hay autenticación)
        w.Header().Set("Access-Control-Allow-Origin", "https://midominio.com")
        
        // Configurar métodos y cabeceras permitidas
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization")

        // Interceptar peticiones Preflight (OPTIONS) y responder inmediatamente con 204 No Content
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }

        // Continuar con la petición normal
        next.ServeHTTP(w, r)
    })
}
```

> **Nota arquitectónica:** Aunque implementar CORS manualmente es un excelente ejercicio de comprensión de HTTP, sus reglas de seguridad pueden volverse extremadamente complejas (gestión dinámica de orígenes, exposición de cabeceras personalizadas, credenciales). Para aplicaciones de nivel empresarial, se recomienda delegar esta tarea a librerías maduras, auditadas y focalizadas como `github.com/rs/cors`, y aplicar esa librería como un *middleware* en tu cadena principal.

Con estos tres componentes base integrados a nuestro `ServeMux`, contamos con un servidor altamente resiliente, listo para recibir tráfico externo de forma segura.

