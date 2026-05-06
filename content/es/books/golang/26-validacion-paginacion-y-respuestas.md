Una API RESTful profesional no solo debe procesar datos, sino garantizar su integridad y accesibilidad. En este capítulo, elevamos la calidad de nuestros servicios backend mediante tres pilares fundamentales. Primero, implementamos la validación declarativa con `go-playground/validator` para blindar la entrada de datos sin ensuciar la lógica de negocio. Segundo, analizamos estrategias de paginación para manejar grandes volúmenes de información de forma eficiente y escalable. Finalmente, estandarizamos la comunicación de errores bajo el estándar RFC 7807, asegurando que nuestras respuestas sean predecibles, robustas y fáciles de consumir por cualquier cliente.

## 26.1. Validación estructurada de payloads (go-playground/validator)

En los capítulos anteriores abordamos cómo deserializar peticiones HTTP entrantes y asegurar que los tipos de datos primitivos coincidan (por ejemplo, que no se envíe un *string* donde se espera un *int*). Sin embargo, la seguridad de tipos no garantiza la validez de las reglas de negocio. Un entero puede deserializarse correctamente, pero representar una edad negativa; un *string* puede ser sintácticamente válido, pero no ser un correo electrónico legítimo.

Implementar estas comprobaciones mediante cadenas interminables de condicionales `if/else` ensucia los manejadores (Handlers) y viola el principio de responsabilidad única. La solución idiomática y estándar en el ecosistema Go —adoptada internamente por frameworks como Gin o Echo— es la validación declarativa mediante etiquetas de estructuras (Struct Tags), siendo el paquete `github.com/go-playground/validator/v10` la herramienta de facto.

### El patrón de instancia única (Singleton)

Como vimos en el Capítulo 14, el uso de la reflexión (`reflect`) tiene un costo de rendimiento. `go-playground/validator` utiliza reflexión para leer las etiquetas de los *structs*. Para mitigar esta penalización, la librería implementa una caché interna. 

Por lo tanto, **es una regla estricta instanciar el validador una única vez** a nivel de aplicación (típicamente al inicializar el servidor o inyectarlo como dependencia) y reutilizarlo en todas las peticiones concurrentes, ya que es seguro (Thread-Safe).

```go
package main

import (
	"fmt"
	"github.com/go-playground/validator/v10"
)

// validate es una instancia global o inyectada a nivel de aplicación
var validate *validator.Validate

func init() {
	validate = validator.New()
}
```

### Etiquetas de validación fundamentales

La validación se define añadiendo la etiqueta `validate` a los campos exportados del *struct*. El paquete soporta decenas de validaciones nativas, desde longitud y rangos, hasta formatos específicos (UUID, direcciones IP, URLs).

```go
type CreateUserPayload struct {
	// Requerido, debe ser un email válido y con una longitud máxima
	Email string `json:"email" validate:"required,email,max=100"`

	// Requerido, longitud mínima de 8 caracteres
	Password string `json:"password" validate:"required,min=8"`

	// Solo es requerido si se envía. Si se envía, debe ser mayor a 18
	Age int `json:"age" validate:"omitempty,gte=18"`
	
	// Validaciones de colecciones (Slices)
	Roles []string `json:"roles" validate:"required,min=1,dive,oneof=admin user guest"`
}
```

En el ejemplo anterior, la directiva `dive` es especialmente potente: le indica al validador que "descienda" dentro del *slice* (o mapa) y aplique la validación subsecuente (`oneof`) a cada uno de sus elementos individuales.

### Validaciones cruzadas entre campos (Cross-Field)

Una necesidad habitual en las APIs es validar un campo basándose en el valor de otro dentro del mismo *payload*, como comprobar que dos contraseñas coinciden o que una fecha de inicio es anterior a una fecha de fin. `go-playground` resuelve esto con etiquetas como `eqfield`, `nefield`, `gtfield`, entre otras.

```go
type BookingPayload struct {
	StartDate time.Time `json:"start_date" validate:"required"`
	// EndDate debe ser posterior (Greater Than Field) a StartDate
	EndDate   time.Time `json:"end_date" validate:"required,gtfield=StartDate"`
}
```
*Nota: Es crucial que el valor pasado a `gtfield` sea el nombre del campo en el struct en Go (con mayúscula), no el nombre de la etiqueta JSON.*

### Validaciones personalizadas (Custom Validations)

Cuando las reglas de negocio son muy específicas (por ejemplo, validar un formato de código de producto interno), podemos registrar nuestras propias funciones de validación. 

```go
import (
	"regexp"
	"github.com/go-playground/validator/v10"
)

// skuRegex define un formato de ejemplo: 3 letras, guion, 4 números (ej. ABC-1234)
var skuRegex = regexp.MustCompile(`^[A-Z]{3}-\d{4}$`)

// ValidateSKU es la función personalizada
func ValidateSKU(fl validator.FieldLevel) bool {
	// Obtenemos el valor del campo como string
	sku := fl.Field().String()
	return skuRegex.MatchString(sku)
}

func main() {
	validate := validator.New()
	
	// Registramos la etiqueta "is_sku"
	err := validate.RegisterValidation("is_sku", ValidateSKU)
	if err != nil {
		panic(err)
	}

	// Uso en un struct:
	// ProductID string `validate:"required,is_sku"`
}
```

### Extracción estructurada de errores

Cuando la función `validate.Struct()` devuelve un error, no debemos enviarlo en crudo al cliente HTTP. Debemos usar aserciones de tipo (Type Assertions, Capítulo 7) para convertir la interfaz `error` al tipo `validator.ValidationErrors`, el cual nos permite iterar sobre los fallos y construir una respuesta limpia.

```go
func processValidation(payload interface{}) map[string]string {
	err := validate.Struct(payload)
	if err == nil {
		return nil
	}

	errorsResponse := make(map[string]string)

	// Aserción de tipo para extraer los errores de validación específicos
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			// Construimos un mensaje basado en el tag que falló
			field := fieldError.Field()
			tag := fieldError.Tag()
			
			switch tag {
			case "required":
				errorsResponse[field] = "Este campo es obligatorio"
			case "email":
				errorsResponse[field] = "Debe ser un correo electrónico válido"
			case "gte":
				errorsResponse[field] = fmt.Sprintf("El valor debe ser mayor o igual a %s", fieldError.Param())
			default:
				errorsResponse[field] = fmt.Sprintf("Fallo en la validación de la regla: %s", tag)
			}
		}
	}

	return errorsResponse
}
```

Este procesamiento de errores es el paso previo ideal para construir respuestas estructuradas bajo el estándar *Problem Details* (RFC 7807), concepto que desarrollaremos a fondo en la sección 26.4.

## 26.2. Estrategias de paginación de datos (Offset/Limit vs Cursor-based)

Cuando desarrollamos APIs RESTful que interactúan con colecciones de datos (usuarios, transacciones, productos), devolver miles o millones de registros en una sola respuesta HTTP es inviable. Esto saturaría la memoria del servidor (como vimos en el Capítulo 44 sobre el *Heap*), agotaría el ancho de banda del cliente y provocaría tiempos de espera insostenibles en la base de datos. La paginación es la técnica obligatoria para mitigar este problema, dividiendo el conjunto de resultados en fragmentos o "páginas" manejables.

En el diseño de APIs modernas existen dos enfoques predominantes para resolver este problema: la paginación basada en desplazamiento (*Offset/Limit*) y la paginación basada en cursor (*Cursor-based* o *Keyset pagination*). Elegir entre ambas impacta directamente en el rendimiento de nuestra capa de persistencia (Capítulo 28) y en la experiencia del cliente de la API.

### Paginación basada en Offset y Limit

Es la estrategia más tradicional e intuitiva. El cliente solicita una cantidad específica de elementos (`limit`) y especifica cuántos elementos debe omitir la base de datos antes de empezar a devolver resultados (`offset`). Se mapea de forma directa con las cláusulas `LIMIT` y `OFFSET` de SQL.

#### Implementación en Go

Generalmente, el cliente envía estos valores a través de los *Query Params* de la URL (`GET /users?page=2&limit=20`). En nuestro *Handler*, los extraemos y calculamos el desplazamiento matemático.

```go
package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
)

func GetUsersOffsetHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Valores por defecto
		page := 1
		limit := 10

		// Parseo de Query Params (Capítulo 24)
		if p := r.URL.Query().Get("page"); p != "" {
			if parsedPage, err := strconv.Atoi(p); err == nil && parsedPage > 0 {
				page = parsedPage
			}
		}
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsedLimit, err := strconv.Atoi(l); err == nil && parsedLimit > 0 {
				limit = parsedLimit
			}
		}

		// Cálculo matemático del offset
		offset := (page - 1) * limit

		// Ejecución de la consulta preparada (Capítulo 28)
		query := `SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`
		rows, err := db.QueryContext(r.Context(), query, limit, offset)
		if err != nil {
			http.Error(w, "Error en la base de datos", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		// Lógica de escaneo a structs omitida por brevedad...
	}
}
```

#### Limitaciones del Offset

A pesar de su simplicidad y de permitir "saltar" a una página específica (ej. página 50), este enfoque tiene dos grandes debilidades:
1.  **Rendimiento en consultas profundas:** Para resolver `OFFSET 1000000 LIMIT 10`, el motor SQL (PostgreSQL, MySQL) debe buscar en el disco, cargar y luego *descartar* un millón de filas antes de devolver las 10 solicitadas. Esto degrada el rendimiento de forma lineal (O(N)).
2.  **Inconsistencia de datos:** Si se inserta un nuevo registro en la base de datos mientras el cliente navega de la página 1 a la página 2, el desplazamiento se desincroniza. Esto provoca que el cliente vea elementos duplicados o se salte registros.

### Paginación basada en Cursor (Keyset Pagination)

Para APIs de alto tráfico, *feeds* en tiempo real o aplicaciones móviles, la paginación basada en cursor es el estándar de la industria. En lugar de usar matemáticas relativas (*salta X elementos*), utiliza un punto de referencia absoluto: el **cursor**.

Un cursor es un identificador único, secuencial e inmutable (como un ID autoincremental, un UUID secuencial o un *timestamp* de creación de alta precisión). El cliente pide registros que sean "mayores que" o "menores que" el cursor proporcionado.

#### Implementación en Go

El cliente realiza su primera petición (`GET /users?limit=10`). La API devuelve los 10 registros y proporciona un `next_cursor` en la respuesta. Para la siguiente página, el cliente hace la petición incluyendo ese cursor (`GET /users?limit=10&cursor=1582`).

```go
package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
)

// UserResponse define la estructura de salida paginada
type UserResponse struct {
	Data       []User `json:"data"`
	NextCursor string `json:"next_cursor,omitempty"`
}

func GetUsersCursorHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := 10
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsedLimit, err := strconv.Atoi(l); err == nil && parsedLimit > 0 {
				limit = parsedLimit
			}
		}

		cursor := r.URL.Query().Get("cursor")

		var rows *sql.Rows
		var err error

		// Si hay cursor, filtramos por él usando índices; si no, es la primera página.
		// Asumimos orden ascendente por ID.
		if cursor != "" {
			query := `SELECT id, name, email FROM users WHERE id > $1 ORDER BY id ASC LIMIT $2`
			rows, err = db.QueryContext(r.Context(), query, cursor, limit)
		} else {
			query := `SELECT id, name, email FROM users ORDER BY id ASC LIMIT $1`
			rows, err = db.QueryContext(r.Context(), query, limit)
		}

		if err != nil {
			http.Error(w, "Error consultando usuarios", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var users []User
		var lastID int
		for rows.Next() {
			var u User
			if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
				continue
			}
			users = append(users, u)
			lastID = u.ID // Actualizamos el último ID visto
		}

		// Construcción de la respuesta con el siguiente cursor
		response := UserResponse{
			Data: users,
		}
		
		// Si obtuvimos la cantidad máxima solicitada, es probable que haya más páginas
		if len(users) == limit {
			// Usamos el ID del último elemento como cursor para la siguiente petición
			response.NextCursor = strconv.Itoa(lastID)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
```

#### Ventajas del Cursor

Al utilizar la cláusula `WHERE id > $1`, la base de datos aprovecha directamente el índice B-Tree (o similar) de la columna subyacente. El tiempo de búsqueda es logarítmico o casi constante (O(1)), sin importar si solicitamos la primera página o el registro número dos millones. Además, es resiliente a inserciones o borrados concurrentes, garantizando un flujo de datos sin duplicados ni omisiones. 

### Comparativa y Elección

Para facilitar la decisión arquitectónica durante el diseño de la API, considera la siguiente tabla:

| Característica | Offset/Limit | Cursor-based |
| :--- | :--- | :--- |
| **Complejidad de implementación** | Baja (matemática básica) | Media (requiere gestión del estado del cursor) |
| **Rendimiento en profundidad** | Muy pobre (O(N) por descarte) | Excelente (aprovechamiento de índices) |
| **Navegación** | Páginas específicas, Previo, Siguiente | Solo Siguiente (o Previo, si es bidireccional) |
| **Consistencia ante mutaciones** | Propensa a saltos y duplicados | Altamente consistente |
| **Casos de uso ideales** | Paneles de administración pequeños, listados estáticos | APIs públicas, Feeds, Infinite Scroll en móviles |

## 26.3. Filtros dinámicos y ordenamiento en peticiones GET

A medida que una API evoluciona, los clientes necesitan consultar subconjuntos de datos cada vez más específicos. Una petición para obtener usuarios (`GET /users`) pronto requerirá variaciones como "usuarios activos", "usuarios creados este mes" o "usuarios ordenados por fecha de registro de forma descendente". 

Codificar un *Handler* y una consulta SQL estática para cada combinación posible (ej. `GetActiveUsers`, `GetUsersByRole`, `GetActiveUsersByRole`) es insostenible y viola el principio DRY (*Don't Repeat Yourself*). La solución es implementar filtros dinámicos y ordenamiento manejados directamente a través de los parámetros de consulta de la URL (*Query Parameters*).

### Recepción y parseo de parámetros

El estándar de facto en REST es utilizar pares clave-valor en la *Query String*. Para el ordenamiento, una convención muy adoptada (popularizada por las directrices de JSON:API) es usar el parámetro `sort` y el prefijo `-` para indicar orden descendente.

Ejemplo de petición compleja:
`GET /users?status=active&role=admin&sort=-created_at`

En Go, extraemos estos valores utilizando el método `Query()` del objeto `*http.Request.URL`, que devuelve un `url.Values` (un alias para `map[string][]string`).

### El peligro de la Inyección SQL en el ordenamiento

Al construir consultas dinámicas con el paquete `database/sql` (que veremos a fondo en el Capítulo 28), utilizamos marcadores de posición (`$1`, `?`) para pasar valores a la cláusula `WHERE`. Esto previene la inyección SQL porque el controlador de la base de datos escapa los valores de forma segura.

**Sin embargo, los marcadores de posición no se pueden usar para nombres de columnas ni direcciones de ordenamiento en la cláusula `ORDER BY`.** El siguiente código es una **vulnerabilidad crítica de seguridad**:
```go
// ¡NUNCA HAGAS ESTO! Vulnerable a inyección SQL
sortBy := r.URL.Query().Get("sort")
query := fmt.Sprintf("SELECT id, name FROM users ORDER BY %s", sortBy)
```

### Estrategia de Lista Blanca (Allow-list)

Para implementar ordenamiento y filtrado dinámico de forma segura sin usar un ORM o un *Query Builder* (como Squirrel, que abordaremos en la sección 29.2), debemos validar estrictamente la entrada del usuario contra un mapa o *slice* de valores permitidos (Lista blanca).

#### Implementación de un filtro dinámico seguro

A continuación, implementamos un *Handler* que construye dinámicamente la cláusula `WHERE` y valida el `ORDER BY` utilizando listas blancas.

```go
package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
)

func GetUsersDynamicHandler(db *sql.DB) http.HandlerFunc {
	// Definimos las columnas permitidas para ordenar
	allowedSortColumns := map[string]bool{
		"created_at": true,
		"name":       true,
		"email":      true,
	}

	return func(w http.ResponseWriter, r *http.Request) {
		queryValues := r.URL.Query()

		// 1. Construcción dinámica del WHERE
		var conditions []string
		var args []any
		argId := 1

		// Filtro por estado
		if status := queryValues.Get("status"); status != "" {
			conditions = append(conditions, fmt.Sprintf("status = $%d", argId))
			args = append(args, status)
			argId++
		}

		// Filtro por rol
		if role := queryValues.Get("role"); role != "" {
			conditions = append(conditions, fmt.Sprintf("role = $%d", argId))
			args = append(args, role)
			argId++
		}

		whereClause := ""
		if len(conditions) > 0 {
			whereClause = " WHERE " + strings.Join(conditions, " AND ")
		}

		// 2. Validación y construcción del ORDER BY
		sortParam := queryValues.Get("sort")
		orderByClause := " ORDER BY id ASC" // Orden por defecto

		if sortParam != "" {
			direction := "ASC"
			column := sortParam

			// Verificamos si tiene el prefijo '-' para orden descendente
			if strings.HasPrefix(sortParam, "-") {
				direction = "DESC"
				column = sortParam[1:] // Removemos el '-'
			}

			// Validamos contra la lista blanca
			if allowedSortColumns[column] {
				// Es seguro concatenar porque ha pasado la lista blanca
				orderByClause = fmt.Sprintf(" ORDER BY %s %s", column, direction)
			}
		}

		// 3. Ensamblaje final de la consulta
		finalQuery := fmt.Sprintf("SELECT id, name, email, status, role FROM users%s%s", whereClause, orderByClause)

		// Ejecutamos la consulta preparada de forma segura
		rows, err := db.QueryContext(r.Context(), finalQuery, args...)
		if err != nil {
			http.Error(w, "Error ejecutando la consulta", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		// (Procesamiento de las filas a JSON omitido para mantener el foco)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Consulta ejecutada con éxito"}`))
	}
}
```

### Abstracción de Filtros Múltiples

Cuando un campo permite múltiples valores (por ejemplo, `?status=active,pending` o `?status=active&status=pending`), la construcción manual de la cláusula `IN (...)` se vuelve tediosa debido a que cada elemento requiere su propio marcador de posición (`$1, $2, $3`). 

En Go estándar, esto implica generar una cadena con la cantidad exacta de interrogaciones o símbolos de dólar basándonos en la longitud del *slice* de parámetros. En estos escenarios complejos, donde los filtros dinámicos crecen exponencialmente, es donde se justifica la transición desde código SQL manual (con `strings.Builder` o concatenación) hacia el uso de bibliotecas de construcción de consultas (Query Builders) o extensiones como `sqlx`, temas que dominaremos en el Capítulo 29.

## 26.4. Respuestas estandarizadas y manejo de errores (Problem Details RFC 7807)

A lo largo del desarrollo de una API RESTful, es inevitable que ocurran errores: peticiones mal formadas, credenciales inválidas, recursos no encontrados o fallos internos del servidor. El error más común en el diseño de APIs es devolver estructuras JSON inconsistentes para representar estos problemas. 

Si un *endpoint* devuelve `{"error": "usuario no encontrado"}` y otro devuelve `{"mensaje": "id inválido", "codigo": 400}`, los clientes de la API (aplicaciones móviles, *frontends* web u otros microservicios) se ven obligados a escribir código defensivo y frágil para adivinar cómo analizar la respuesta de error.

Para solucionar esta fragmentación, el IETF publicó el **RFC 7807: Problem Details for HTTP APIs**. Este estándar define una estructura JSON unificada y predecible para comunicar errores.

### Anatomía del estándar RFC 7807

El estándar establece el uso del tipo de contenido `application/problem+json` y define cinco campos estándar (todos opcionales, aunque se recomienda usar al menos `type` y `title`):

* **`type` (string):** Una URI que identifica el tipo de problema. Proporciona documentación legible por humanos cuando se abre en un navegador. Si no se especifica, se asume `about:blank`.
* **`title` (string):** Un resumen corto y legible del tipo de problema (por ejemplo, "Fallo de validación" o "Fondos insuficientes"). No debe cambiar de una ocurrencia a otra.
* **`status` (number):** El código de estado HTTP generado por el servidor original para esta ocurrencia. Resulta útil cuando la respuesta pasa por proxies que podrían alterar el código HTTP.
* **`detail` (string):** Una explicación legible y específica sobre esta ocurrencia exacta del problema (por ejemplo, "El saldo actual es de 50, pero se intentó transferir 100").
* **`instance` (string):** Una URI que identifica la ocurrencia específica del problema. Puede usarse para rastreo en logs (ej. `urn:uuid:123e4567-e89b-12d3-a456-426614174000`).

Además, el RFC permite **Miembros Extendidos** (Extension Members), lo cual nos permite añadir campos personalizados, como los detalles de validación que vimos en la sección 26.1.

### Implementación idiomática en Go

Para aplicar este estándar, comenzamos definiendo una estructura que mapee los campos del RFC y soporte extensiones dinámicas.

```go
package problem

import (
	"encoding/json"
	"net/http"
)

// Details define la estructura estándar del RFC 7807
type Details struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`
	
	// Extensiones para añadir campos personalizados, como errores de validación
	Extensions map[string]interface{} `json:"-"` 
}

// MarshalJSON personaliza la serialización para aplanar las extensiones
// en el mismo nivel que los campos estándar.
func (d Details) MarshalJSON() ([]byte, error) {
	type Alias Details
	
	// Creamos un mapa para fusionar los campos base y las extensiones
	merged := make(map[string]interface{})
	
	// Convertimos la estructura base a JSON y luego a mapa
	baseBytes, _ := json.Marshal((Alias)(d))
	json.Unmarshal(baseBytes, &merged)
	
	// Añadimos las extensiones al nivel principal
	for k, v := range d.Extensions {
		merged[k] = v
	}
	
	return json.Marshal(merged)
}
```

### Integración con las validaciones de *Payloads* (Sección 26.1)

Ahora, vamos a conectar el procesamiento de errores del `go-playground/validator` (que desarrollamos en la sección 26.1) con nuestra nueva estructura estandarizada de errores.

Crearemos una función de ayuda (Helper) que facilite la escritura de estas respuestas en nuestros *Handlers*.

```go
package handlers

import (
	"encoding/json"
	"net/http"
	"tu_proyecto/problem" // Importamos nuestro paquete problem
)

// WriteProblem formatea y envía la respuesta según el RFC 7807
func WriteProblem(w http.ResponseWriter, p problem.Details) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(p.Status)
	json.NewEncoder(w).Encode(p)
}

// CreateUserHandler demuestra el uso de Problem Details ante un fallo
func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateUserPayload // Estructura definida en 26.1
	
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		WriteProblem(w, problem.Details{
			Type:   "https://api.tu-dominio.com/errors/bad-request",
			Title:  "Cuerpo de la petición mal formado",
			Status: http.StatusBadRequest,
			Detail: "El JSON enviado no tiene un formato válido.",
		})
		return
	}

	// Supongamos que `processValidation` (de 26.1) devuelve map[string]string con los fallos
	validationErrors := processValidation(payload)
	
	if len(validationErrors) > 0 {
		// Construimos el error estándar y añadimos los fallos de validación como extensión
		prob := problem.Details{
			Type:   "https://api.tu-dominio.com/errors/validation-failed",
			Title:  "Fallo de validación de datos",
			Status: http.StatusUnprocessableEntity, // 422 es ideal para errores de negocio
			Detail: "La petición contiene datos que no cumplen las reglas de negocio.",
			Extensions: map[string]interface{}{
				"invalid_params": validationErrors,
			},
		}
		
		WriteProblem(w, prob)
		return
	}

	// Lógica de éxito...
	w.WriteHeader(http.StatusCreated)
}
```

### El resultado final para el cliente HTTP

Si un cliente envía un JSON válido pero que rompe las reglas de negocio (por ejemplo, un correo electrónico mal formado), recibirá una respuesta HTTP 422 con la cabecera `Content-Type: application/problem+json` y el siguiente cuerpo:

```json
{
  "type": "https://api.tu-dominio.com/errors/validation-failed",
  "title": "Fallo de validación de datos",
  "status": 422,
  "detail": "La petición contiene datos que no cumplen las reglas de negocio.",
  "invalid_params": {
    "Email": "Debe ser un correo electrónico válido"
  }
}
```

Al adoptar este patrón en todos tus *Handlers* y Middlewares (como los que manejan pánicos en la sección 25.4), garantizas que los consumidores de tu API tengan una experiencia de integración predecible, robusta y alineada con los estándares de la industria.
