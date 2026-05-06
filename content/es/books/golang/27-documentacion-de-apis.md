Una API profesional no termina en el código; su éxito depende de la claridad con la que se comunica a otros desarrolladores. En esta sección exploramos cómo transformar nuestros servicios de Go en sistemas autodocumentados y evolutivos. Abordaremos el estándar **OpenAPI** como contrato universal, aprenderemos a automatizar la generación de esquemas con **Swaggo** para evitar el desfase entre código y documentación, y estableceremos estrategias de **versionado** para garantizar la retrocompatibilidad. El objetivo es convertir nuestras APIs en productos robustos, fáciles de integrar y preparados para el crecimiento a largo plazo sin romper el ecosistema de clientes.

## 27.1. Especificación OpenAPI / Swagger

En los capítulos anteriores, hemos construido APIs RESTful robustas, implementado middlewares avanzados (Capítulo 25) y estructurado la validación de nuestros *payloads* (Capítulo 26). Sin embargo, una API que no está documentada o cuya documentación está desactualizada es un sistema incompleto. Aquí es donde entra en juego la **Especificación OpenAPI (OAS)**.

En el desarrollo moderno de software, la documentación de la API no es simplemente un texto estático en una wiki; es un contrato vivo y legible por máquinas.

### Swagger vs. OpenAPI: Aclarando la Nomenclatura

Es común en la industria intercambiar los términos "Swagger" y "OpenAPI", pero en un entorno técnico avanzado es crucial distinguirlos:

* **OpenAPI Specification (OAS):** Es el estándar o formato (escrito en YAML o JSON) que describe las capacidades de tu API RESTful. Originalmente se conocía como la Especificación Swagger (versión 2.0), pero fue donada a la Linux Foundation en 2015 y rebautizada como OpenAPI (actualmente en la versión 3.x).
* **Swagger:** Es un conjunto de herramientas (desarrollado por SmartBear) que implementan y soportan la especificación OpenAPI. Esto incluye **Swagger UI** (la interfaz gráfica interactiva que renderiza el YAML/JSON) y **Swagger Editor**.

### Anatomía de un Contrato OpenAPI

Un documento OpenAPI define de manera agnóstica al lenguaje todos los aspectos de tu API: los *endpoints* (`paths`), las operaciones soportadas (GET, POST, etc.), los parámetros de entrada, los esquemas de autenticación y las respuestas (códigos de estado HTTP y la estructura de los datos).

Veamos un fragmento representativo en YAML para un endpoint de obtención de usuarios:

```yaml
openapi: 3.0.3
info:
  title: API de Gestión de Usuarios
  version: 1.0.0
paths:
  /users/{id}:
    get:
      summary: Obtiene un usuario por su ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Operación exitosa
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Usuario no encontrado
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        createdAt:
          type: string
          format: date-time
```

### El Mapeo Estructural en Go

El poder de OpenAPI radica en su correspondencia directa con las estructuras de datos fuertemente tipadas de Go. El componente `User` definido en el YAML anterior se traduce naturalmente a un `struct` en Go. 

Considerando lo que vimos en la sección 26.1 sobre la validación estructurada, el contrato OpenAPI y nuestras etiquetas (`tags`) de Go deben estar en perfecta sincronía:

```go
package domain

import (
	"time"
)

// User representa el esquema de usuario mapeado desde OpenAPI.
type User struct {
	// ID corresponde a type: string, format: uuid
	ID string `json:"id" validate:"required,uuid"`

	// Email corresponde a type: string, format: email
	Email string `json:"email" validate:"required,email"`

	// CreatedAt corresponde a type: string, format: date-time
	CreatedAt time.Time `json:"createdAt"`
}
```

### Paradigmas de Integración en Go: Contract-First vs Code-First

Al adoptar OpenAPI en ecosistemas Go, los equipos de arquitectura se enfrentan a una bifurcación fundamental sobre cómo mantener la única fuente de verdad (Single Source of Truth).

**1. Enfoque Code-First (El código manda)**
En este modelo, los desarrolladores escriben primero el código Go (handlers, structs, routers) y utilizan anotaciones o comentarios especiales para que una herramienta genere el archivo `swagger.json` o `swagger.yaml` durante el proceso de compilación o CI/CD.
* *Ventaja:* Menor fricción inicial para el desarrollador backend. El código siempre refleja la realidad porque la documentación se deriva de él.
* *El contexto:* Este es el enfoque que exploraremos a fondo en la siguiente sección (27.2) utilizando herramientas como `swaggo`.

**2. Enfoque Contract-First / Design-First (El contrato manda)**
Bajo este paradigma, el equipo escribe y acuerda primero el archivo YAML de OpenAPI de forma colaborativa (backend, frontend, QA). Una vez cerrado el contrato, se utilizan herramientas generadoras de código para crear los esqueletos (*stubs*) de los handlers, las validaciones y los modelos en Go.
* *Ventaja:* Permite el desarrollo en paralelo. El equipo de frontend puede empezar a crear *mocks* basándose en el YAML sin esperar a que el backend de Go esté terminado.
* *Herramientas destacadas:* En Go, librerías como `oapi-codegen` son el estándar de facto para este enfoque. Esta herramienta lee el archivo OpenAPI y genera automáticamente el boilerplate del servidor (compatible con routers como Chi o Echo, que vimos en el Capítulo 25) y los tipos de datos estrictos.

Ambos enfoques son válidos y la elección dependerá de la topología de tu equipo y de si estás construyendo un microservicio interno o una API pública expuesta a terceros. 

## 27.2. Generación automática de documentación a partir del código (swaggo)

Como establecimos en la sección anterior, el enfoque *Code-First* minimiza la fricción cognitiva al mantener la documentación y la implementación física en el mismo lugar. En el ecosistema Go, la herramienta indiscutible para esta tarea es **Swaggo** (`github.com/swaggo/swag`).

Swaggo no es un simple analizador de texto; utiliza el paquete nativo `go/ast` para leer el Árbol de Sintaxis Abstracta (AST) de tu código. Extrae metadatos de comentarios declarativos fuertemente tipados y genera los artefactos compatibles con OpenAPI 2.0 (y soporte experimental para 3.0), listos para ser consumidos por Swagger UI.

### 1. Metadatos Globales de la API

El primer paso es definir el contrato general de la API. Esto se hace típicamente en el punto de entrada de la aplicación (`main.go`). Swaggo requiere comentarios de bloque o de línea consecutivos justo encima de la función `main`.

```go
package main

import (
	"log"
	"net/http"
	// Es crucial importar el paquete docs generado (lo crearemos en breve)
	_ "mi-proyecto/docs" 
)

// @title           API de Gestión de Usuarios
// @version         1.0.0
// @description     Servicio core para la administración de identidades.
// @termsOfService  http://swagger.io/terms/

// @contact.name   Equipo de Plataforma
// @contact.url    http://intranet.empresa.com
// @contact.email  platform@empresa.com

// @host      api.empresa.com:8080
// @BasePath  /v1

// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Ingresa el token en el formato: Bearer {token}
func main() {
    // Inicialización del servidor, inyección de dependencias, etc.
}
```

*Nota arquitectónica:* La definición `@securityDefinitions.apikey` es fundamental para probar la API desde la interfaz gráfica cuando implementes los esquemas de JWT que se abordan en el Capítulo 37.

### 2. Documentación de Handlers y Modelos

La verdadera potencia de Swaggo se despliega en los *handlers*. En lugar de mantener un YAML externo, describes el comportamiento esperado, los parámetros y los códigos de estado HTTP directamente donde reside la lógica.

Tomemos como ejemplo un endpoint de creación de usuario. Recuerda que en el Capítulo 26 (26.4) estandarizamos los errores usando *Problem Details* (RFC 7807). Swaggo nos permite mapear estas estructuras fácilmente.

```go
package handlers

import (
	"net/http"
	"mi-proyecto/domain"
)

// CreateUser godoc
// @Summary      Crea un nuevo usuario
// @Description  Registra un usuario en el sistema y emite un evento de dominio.
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        payload  body      domain.CreateUserRequest  true  "Datos del usuario"
// @Success      201      {object}  domain.User               "Usuario creado exitosamente"
// @Failure      400      {object}  errors.ProblemDetails     "Error de validación en el payload"
// @Failure      409      {object}  errors.ProblemDetails     "El email ya está registrado"
// @Failure      500      {object}  errors.ProblemDetails     "Error interno del servidor"
// @Security     BearerAuth
// @Router       /users [post]
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	// Lógica de decodificación, validación (Capítulo 26) y delegación al servicio.
}
```

**Conexión con los Structs:**
Swaggo es lo suficientemente inteligente como para seguir las referencias a `domain.CreateUserRequest` y `domain.User`. Además, lee las etiquetas (`tags`) nativas de Go como `json`, `binding` o `validate` (go-playground/validator) para determinar si un campo es requerido o qué restricciones tiene, reflejándolo automáticamente en la documentación.

### 3. El Flujo de Trabajo: Generación y Exposición

Una vez que el código está instrumentado con los comentarios, debes compilar la documentación.

1. **Instalación de la CLI:**
   ```bash
   go install github.com/swaggo/swag/cmd/swag@latest
   ```

2. **Generación de artefactos:**
   Ejecuta el siguiente comando en la raíz de tu proyecto (donde reside `main.go`).
   ```bash
   swag init --parseDependency --parseInternal
   ```
   *Consejo avanzado:* Los flags `--parseDependency` y `--parseInternal` son esenciales si tus *structs* de respuesta o *payloads* (como `ProblemDetails`) viven en módulos externos o en paquetes internos separados del *handler*, algo estándar en la Arquitectura Limpia (Capítulo 21).

Este comando generará un directorio `docs/` que contiene `docs.go`, `swagger.json` y `swagger.yaml`. 

3. **Exposición mediante un Router:**
   Finalmente, necesitas servir la interfaz gráfica de Swagger. Swaggo proporciona *wrappers* para los enrutadores más populares que analizamos en el Capítulo 25 (Gin, Echo, Chi, o el ServeMux estándar).

   Ejemplo usando `go-chi/chi` y `swaggo/http-swagger`:

   ```go
   import (
       "github.com/go-chi/chi/v5"
       httpSwagger "github.com/swaggo/http-swagger"
       _ "mi-proyecto/docs" // Importación anónima obligatoria
   )

   func SetupRouter() *chi.Mux {
       r := chi.NewRouter()

       // ... tus otras rutas ...

       // Servir la interfaz de Swagger
       r.Get("/swagger/*", httpSwagger.Handler(
           httpSwagger.URL("/swagger/doc.json"), // Apunta al JSON generado
       ))

       return r
   }
   ```

Al ejecutar tu servidor y navegar a `http://localhost:8080/swagger/index.html`, tendrás una interfaz interactiva generada 100% a partir de tu código fuente, garantizando que tu contrato y tu implementación evolucionen en estricta sincronía.

## 27.3. Versionado de APIs RESTful en Go

Una vez que un contrato de API (como los definidos con OpenAPI en la sección 27.1) es consumido en producción por clientes de frontend, aplicaciones móviles u otros microservicios (Capítulo 32), dicho contrato se vuelve inmutable. Cualquier alteración destructiva —como renombrar un campo, cambiar un tipo de dato o eliminar un *endpoint*— romperá las integraciones existentes. 

El versionado es la estrategia arquitectónica que permite que una API evolucione, introduciendo cambios disruptivos (*breaking changes*) sin afectar a los consumidores heredados.

### Estrategias de Versionado

Existen múltiples enfoques para versionar una API, cada uno con compromisos técnicos que impactan el enrutamiento y el almacenamiento en caché:

1.  **Versionado por URI (El estándar de facto):**
    La versión se incluye explícitamente en la ruta: `https://api.empresa.com/v1/users`.
    * *Ventaja:* Es altamente visible, fácil de probar directamente en el navegador y trivial de enrutar a nivel de balanceador de carga o API Gateway.
    * *Desventaja:* Purísticamente, viola los principios REST, ya que un mismo recurso (el usuario) tiene múltiples identificadores (URIs) dependiendo de la versión.

2.  **Versionado por Cabeceras Estándar (Content Negotiation):**
    Se utiliza la cabecera `Accept` del protocolo HTTP: `Accept: application/vnd.empresa.v2+json`.
    * *Ventaja:* Mantiene las URIs limpias y semánticamente correctas (`/users`).
    * *Desventaja:* Dificulta la exploración manual, incrementa la complejidad del cliente y puede generar problemas severos con sistemas de caché (CDNs) si no se configura correctamente la cabecera `Vary`.

3.  **Versionado por Cabecera Personalizada:**
    Uso de cabeceras propietarias como `X-API-Version: 2`. Ofrece un término medio, pero sufre de los mismos problemas de caché que la negociación de contenido.

Dada su simplicidad operativa y la facilidad para integrarlo con herramientas como Swaggo (27.2), **el versionado por URI es el patrón más idiomático y recomendado en la mayoría de los proyectos Go**.

### Estructuración de Paquetes en Go

El mayor desafío del versionado no es el enrutamiento, sino la organización del código para evitar la duplicación masiva. Si aplicamos los principios de Arquitectura Limpia vistos en el Capítulo 21, la lógica de negocio (Dominio y Casos de Uso) **no** debe estar versionada. Lo que se versiona es la capa de transporte (los *Handlers* y los DTOs o *Payloads*).

Una estructura de directorios recomendada se vería así:

```text
internal/
├── domain/            # Modelos centrales inmutables al transporte
│   └── user.go
├── application/       # Lógica de negocio
│   └── user_service.go
└── transport/
    └── http/
        ├── v1/
        │   ├── dto.go # Estructuras JSON específicas para v1
        │   └── handler.go
        └── v2/
            ├── dto.go # Nuevas estructuras JSON con breaking changes
            └── handler.go
```

### Implementación del Enrutamiento

Utilizando el enrutador avanzado de la standard library (disponible desde Go 1.22), mapear diferentes versiones a sus respectivos controladores es directo y declarativo:

```go
package main

import (
	"net/http"
	
	"mi-proyecto/internal/application"
	v1 "mi-proyecto/internal/transport/http/v1"
	v2 "mi-proyecto/internal/transport/http/v2"
)

func main() {
	mux := http.NewServeMux()
	
	// Instanciamos el servicio central (única versión de la lógica)
	userService := application.NewUserService()
	
	// Instanciamos los handlers inyectando el mismo servicio
	handlerV1 := v1.NewUserHandler(userService)
	handlerV2 := v2.NewUserHandler(userService)

	// Rutas v1
	mux.HandleFunc("GET /v1/users/{id}", handlerV1.GetUser)
	mux.HandleFunc("POST /v1/users", handlerV1.CreateUser)

	// Rutas v2 (ej: introduciendo un nuevo formato de ID o payload distinto)
	mux.HandleFunc("GET /v2/users/{id}", handlerV2.GetUser)
	mux.HandleFunc("POST /v2/users", handlerV2.CreateUser)

	http.ListenAndServe(":8080", mux)
}
```

En este patrón, el trabajo del `handlerV1` o `handlerV2` es simplemente traducir su respectivo DTO (Data Transfer Object) de entrada hacia el modelo unificado del paquete `domain`, delegar la ejecución al `userService`, y luego traducir la respuesta del dominio de vuelta al formato JSON esperado por esa versión en particular.

### El Ciclo de Vida: Deprecación Segura

Mantener múltiples versiones activas en producción tiene un alto coste de mantenimiento. Cuando lanzas la versión `v2`, debes establecer un plan para apagar la `v1`. 

Para hacerlo de forma profesional y comunicativa, debes aprovechar las cabeceras HTTP estándar (RFC 8594):

* **`Deprecation: true`**: Indica a los clientes (y a herramientas como OpenAPI/Swagger) que el endpoint sigue funcionando, pero no se recomienda su uso para nuevas integraciones.
* **`Sunset: <HTTP-date>`**: Especifica la fecha exacta y hora en la que el endpoint dejará de responder (típicamente devolviendo un `410 Gone` o `404 Not Found`).

Puedes implementar esto fácilmente usando un *middleware* específico para las rutas heredadas, como exploramos en el Capítulo 25.
