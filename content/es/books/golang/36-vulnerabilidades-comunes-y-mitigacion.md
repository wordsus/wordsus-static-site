La seguridad en Go no es un añadido, sino una disciplina integrada en su diseño. Aunque el runtime ofrece protecciones nativas contra errores de memoria, la lógica de nuestras aplicaciones web sigue expuesta a riesgos críticos. Este capítulo traslada el estándar **OWASP Top 10** al ecosistema de Go, analizando cómo prevenir ataques desde la raíz. 

Aprenderás a neutralizar el **XSS** mediante el uso correcto de `html/template`, a blindar la persistencia contra **Inyección SQL** y a mitigar ataques **CSRF**. Finalmente, cerraremos el ciclo de vida de desarrollo seguro integrando **análisis estático automatizado** con `gosec` para detectar debilidades antes de que lleguen a producción.

## 36.1. OWASP Top 10 aplicado a aplicaciones Go

Go fue diseñado con la seguridad y la simplicidad en mente. Su tipado estático, la gestión automática de memoria (Garbage Collector) y la ausencia de aritmética de punteros insegura por defecto mitigan familias enteras de vulnerabilidades clásicas como los desbordamientos de búfer (buffer overflows). Sin embargo, cuando hablamos de seguridad en aplicaciones web y APIs, las vulnerabilidades rara vez residen en el lenguaje mismo; suelen estar en la lógica de negocio y en la interacción con sistemas externos.

El **OWASP Top 10** es el estándar de la industria para clasificar los riesgos de seguridad más críticos en aplicaciones web. Dado que abordaremos de forma profunda y exclusiva vulnerabilidades como XSS (36.2), Inyección SQL/CSRF (36.3), Criptografía (Capítulo 37) y Rate Limiting (Capítulo 38) en sus respectivas secciones, aquí nos enfocaremos en cómo el resto de los riesgos críticos del OWASP Top 10 se manifiestan específicamente en el ecosistema Go y cómo mitigarlos de manera idiomática.

---

### 1. Server-Side Request Forgery (SSRF) - [A10:2021]

Dado que Go es el rey indiscutible de los microservicios y proxies, es sumamente común que una aplicación Go reciba una URL del usuario y realice una petición HTTP hacia ella. Si no se valida esta URL, un atacante puede forzar a tu servidor Go a realizar peticiones a la red interna (ej. `http://localhost:8080/admin` o metadatos de AWS en `169.254.169.254`).

**El problema:** Usar directamente el cliente HTTP por defecto con entrada no confiable.

```go
// ANTIPATRÓN: Vulnerable a SSRF
func fetchResourceHandler(w http.ResponseWriter, r *http.Request) {
    targetURL := r.URL.Query().Get("url")
    // El servidor hace la petición a donde el atacante decida
    resp, err := http.Get(targetURL) 
    // ...
}
```

**La mitigación:** En Go, debes parsear la URL, validar el *Host* o esquema, y preferiblemente usar un `http.Client` con un `Transport` personalizado que bloquee resoluciones de DNS hacia rangos de IPs privadas.

```go
// PATRÓN SEGURO: Validación de esquema y host
func fetchResourceSafe(w http.ResponseWriter, r *http.Request) {
    targetURL := r.URL.Query().Get("url")
    
    parsedURL, err := url.Parse(targetURL)
    if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
        http.Error(w, "URL inválida", http.StatusBadRequest)
        return
    }

    // Lista blanca explícita de dominios permitidos
    allowedDomains := map[string]bool{"api.proveedor.com": true, "cdn.empresa.com": true}
    if !allowedDomains[parsedURL.Hostname()] {
         http.Error(w, "Dominio no permitido", http.StatusForbidden)
         return
    }

    // Usar un cliente con Timeout (ver Capítulo 24)
    client := &http.Client{Timeout: 5 * time.Second}
    resp, err := client.Get(parsedURL.String())
    // ...
}
```

### 2. Componentes Vulnerables y Desactualizados - [A06:2021]

Go facilita enormemente la adición de dependencias de terceros mediante Go Modules. Sin embargo, importar un paquete implica heredar sus vulnerabilidades. A diferencia de otros lenguajes que dependen de herramientas externas, Go ha integrado la seguridad en su propia cadena de herramientas (toolchain).

En lugar de depender exclusivamente de escáneres genéricos, el equipo de Go introdujo **`govulncheck`**. Esta herramienta analiza no solo si tienes una dependencia vulnerable en tu `go.mod`, sino si tu código *realmente llama a la función vulnerable* dentro de ese paquete (gracias al análisis de código estático de Go).

**Cómo mitigarlo en tu flujo de trabajo:**
1. Instala la herramienta oficial: `go install golang.org/x/vuln/cmd/govulncheck@latest`
2. Ejecútala en la raíz de tu proyecto: `govulncheck ./...`
3. Mantén tus dependencias actualizadas de forma regular utilizando `go get -u` y `go mod tidy`.

### 3. Pérdida de Control de Acceso (Broken Access Control) - [A01:2021]

El control de acceso roto ocurre cuando un usuario puede acceder a recursos u operaciones que no le pertenecen. En Go, esto suele manifestarse como **Insecure Direct Object Reference (IDOR)** dentro de los Handlers HTTP.

Es común que los desarrolladores asuman que, si una petición pasó por el middleware de autenticación (que valida el JWT, por ejemplo), la petición es completamente segura.

```go
// ANTIPATRÓN: Vulnerable a IDOR
func GetInvoiceHandler(w http.ResponseWriter, r *http.Request) {
    // Obtenemos el ID de la factura de la URL (ej. /invoices/123)
    invoiceID := chi.URLParam(r, "id") 
    
    // Peligro: Consultamos la factura sin verificar a quién pertenece
    invoice, err := db.GetInvoiceByID(invoiceID) 
    // ...
}
```

**La mitigación:** Siempre debes cruzar el identificador del recurso solicitado con la identidad del usuario autenticado extraída del `Context` (que abordaste en el Capítulo 13).

```go
// PATRÓN SEGURO: Verificación de propiedad (Ownership)
func GetInvoiceSafeHandler(w http.ResponseWriter, r *http.Request) {
    invoiceID := chi.URLParam(r, "id")
    
    // Extraemos el ID del usuario del Context (inyectado por el middleware de Auth)
    userID := r.Context().Value(ContextKeyUserID).(string)

    // La consulta a la BD debe incluir AMBOS parámetros
    invoice, err := db.GetInvoiceByIDAndOwner(invoiceID, userID)
    if err != nil {
        // Devolver un error genérico para no filtrar la existencia del recurso
        http.Error(w, "Factura no encontrada", http.StatusNotFound)
        return
    }
    // ...
}
```

### 4. Fallos de Diseño Inseguro - [A04:2021]

Esta categoría subraya que no podemos parchear una aplicación que está mal diseñada desde el principio. En el contexto de Go, esto se relaciona fuertemente con la arquitectura y el modelado de datos que vimos en la sección de DDD (Capítulo 22). 

Una forma idiomática de evitar fallos de diseño lógico en Go es el uso estricto de **encapsulación y validación en constructores**. Si un `struct` de dominio no puede existir en un estado inválido, eliminas de raíz múltiples vectores de ataque lógico.

```go
// Diseño seguro: Forzamos la validación usando un constructor y manteniendo
// los campos sensibles sin exportar (minúsculas).
type Transferencia struct {
    monto    float64 // No exportado, no puede modificarse directamente
    cuentaID string
}

// NewTransferencia garantiza que jamás se creará una transferencia con saldo negativo
func NewTransferencia(monto float64, cuentaID string) (*Transferencia, error) {
    if monto <= 0 {
        return nil, errors.New("el monto debe ser positivo para evitar transacciones inversas")
    }
    return &Transferencia{monto: monto, cuentaID: cuentaID}, nil
}
```

## 36.2. Prevención de Cross-Site Scripting (XSS) mediante `html/template`

Aunque Go brilla en la creación de APIs RESTful y servicios gRPC (como vimos en las Partes 7 y 9), muchas aplicaciones aún requieren la generación de HTML en el servidor (Server-Side Rendering), ya sea para paneles de administración internos, sitios web orientados al SEO o la generación de correos electrónicos transaccionales. Es aquí donde el riesgo de **Cross-Site Scripting (XSS)** entra en juego.

El XSS ocurre cuando una aplicación incluye datos no confiables en una página web sin la validación o el escape adecuado, permitiendo a un atacante ejecutar scripts maliciosos en el navegador de la víctima. Go aborda este problema de una manera excepcionalmente elegante en su Standard Library a través del paquete `html/template`.

---

### 1. La Trampa Mortal: `text/template` vs `html/template`

La Standard Library de Go ofrece dos paquetes de plantillas casi idénticos en sintaxis: `text/template` y `html/template`. Un error crítico y común en desarrolladores novatos es usar `text/template` para generar HTML. 

El paquete `text/template` realiza una sustitución de texto literal. Si inyectas un script malicioso, se renderizará tal cual. Por el contrario, **`html/template` implementa un escape contextual automático (Context-Aware Auto-Escaping)**.

Esto significa que el motor analiza la estructura del documento HTML y altera la forma en que se escapan los datos dependiendo de *dónde* se inserte la variable.

```go
package main

import (
	"html/template"
	"os"
)

func main() {
	// Un payload clásico de XSS
	inputUsuario := `<script>alert("XSS")</script>`

	// Una plantilla que inyecta la misma variable en tres contextos diferentes
	tmpl := `
		1. Contexto HTML: <div>{{.}}</div>
		2. Contexto Atributo: <a href="/search?q={{.}}">Buscar</a>
		3. Contexto JavaScript: <script>var query = "{{.}}";</script>
	`

	t := template.Must(template.New("xss_demo").Parse(tmpl))
	t.Execute(os.Stdout, inputUsuario)
}
```

**Salida generada de forma segura:**
```html
		1. Contexto HTML: <div>&lt;script&gt;alert(&#34;XSS&#34;)&lt;/script&gt;</div>
		2. Contexto Atributo: <a href="/search?q=%3cscript%3ealert(%22XSS%22)%3c/script%3e">Buscar</a>
		3. Contexto JavaScript: <script>var query = "\u003cscript\u003ealert(\"XSS\")\u003c/script\u003e";</script>
```

Como puedes observar, Go es lo suficientemente inteligente como para usar entidades HTML estandar (`&lt;`), codificación URL (`%3c`) o escapes Unicode de JavaScript (`\u003c`) según corresponda, neutralizando completamente el ataque sin que el desarrollador tenga que llamar a funciones de escape manualmente.

### 2. Tipos Fuertemente Tipados y la Confianza Explícita

A veces, el escape estricto es un problema. Por ejemplo, si tu aplicación convierte contenido Markdown a HTML en el backend y deseas renderizarlo, `html/template` escapará las etiquetas `<p>` o `<strong>` resultantes, arruinando el formato.

Para decirle al motor de plantillas "confía en este contenido, ya es seguro", Go utiliza el sistema de tipos. Al convertir un `string` a `template.HTML`, el motor omitirá el escape.

**El Antipatrón (XSS Autoinfligido):**
El error arquitectónico más grave es castear directamente la entrada del usuario a tipos confiables.

```go
// ANTIPATRÓN CRÍTICO: Anulando la seguridad de Go
func renderProfileHandler(w http.ResponseWriter, r *http.Request) {
    comentarioUsuario := r.FormValue("comentario")
    
    // NUNCA hagas esto con datos que provienen de una petición HTTP
    htmlPeligroso := template.HTML(comentarioUsuario) 
    
    tmpl.Execute(w, htmlPeligroso) // ¡Vulnerabilidad XSS inyectada con éxito!
}
```

**El Patrón Seguro (Sanitización Activa):**
Si *realmente* necesitas aceptar y renderizar HTML del usuario (por ejemplo, desde un editor de texto enriquecido o WYSIWYG), no puedes confiar ciegamente. Debes usar una librería de sanitización estricta basada en listas blancas antes de castear a `template.HTML`. En el ecosistema Go, el estándar de facto para esto es `github.com/microcosm-cc/bluemonday`.

```go
import (
    "html/template"
    "net/http"
    "github.com/microcosm-cc/bluemonday"
)

func renderProfileSafeHandler(w http.ResponseWriter, r *http.Request) {
    comentarioUsuario := r.FormValue("comentario")
    
    // 1. Instanciamos una política estricta de Bluemonday
    // (Ej: Permite <b>, <i>, pero elimina <script>, onmouseover, etc.)
    p := bluemonday.UGCPolicy() 
    
    // 2. Sanitizamos el input del usuario
    htmlSanitizado := p.Sanitize(comentarioUsuario)
    
    // 3. AHORA es seguro decirle a Go que no escape este string
    contenidoSeguro := template.HTML(htmlSanitizado)
    
    tmpl.Execute(w, contenidoSeguro)
}
```

### 3. Cuidado con los Contextos No Confiables (Unsafe Contexts)

Aunque `html/template` es robusto, existen zonas ciegas estructurales donde no puede protegerte de forma automática, independientemente de la entrada de datos. El motor de plantillas de Go se negará a compilar o escapará de forma ineficaz si intentas inyectar variables en lugares donde no existe una semántica segura.

**Evita inyecciones en:**
* **Nombres de etiquetas dinámicas:** `<{{.TagName}}>Hola</{{.TagName}}>` (Permitiría a un atacante inyectar una etiqueta `<script>`).
* **Atributos de eventos sin comillas:** `<button onclick={{.Accion}}>` (Go intentará escaparlo, pero la falta de delimitadores hace que ciertos ataques de evasión sean posibles).

La regla de oro en el diseño arquitectónico de Go para el frontend es: **Pasa datos a tus plantillas, no código ni estructura.**

## 36.3. Protección contra Inyección SQL nativa y mitigación de CSRF

En esta sección abordaremos dos vulnerabilidades clásicas que operan en capas muy distintas: la Inyección SQL (SQLi), que ataca directamente el motor de base de datos a través de la capa de persistencia, y el Cross-Site Request Forgery (CSRF), que abusa de la confianza que el navegador deposita en una sesión de usuario autenticada. 

Afortunadamente, el ecosistema de Go proporciona herramientas nativas robustas para neutralizar ambas amenazas, siempre y cuando apliquemos los patrones arquitectónicos correctos.

---

### 1. Inyección SQL (SQLi): La Regla de Oro de `database/sql`

Como vimos en el Capítulo 28 al explorar el paquete `database/sql`, una base de datos relacional no distingue inherentemente entre la estructura de una consulta (el código SQL) y los datos que la acompañan. La vulnerabilidad de Inyección SQL ocurre cuando concatenamos cadenas de texto directamente para construir una consulta dinámicamente.

En Go, la regla fundamental de seguridad en bases de datos es simple e innegociable: **Jamás utilices el paquete `fmt` o el operador `+` para construir consultas SQL con datos provenientes del exterior.**

**El Antipatrón (Vulnerable a SQLi):**

```go
// ANTIPATRÓN CRÍTICO: Concatenación de strings
func getUserVulnerable(db *sql.DB, username string) (*User, error) {
    // Si 'username' es: "admin' OR '1'='1"
    // La consulta resultante será: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
    query := fmt.Sprintf("SELECT id, email FROM users WHERE username = '%s'", username)
    
    var u User
    err := db.QueryRow(query).Scan(&u.ID, &u.Email)
    return &u, err
}
```

**El Patrón Seguro (Prepared Statements Nativos):**

La forma idiomática de evitar SQLi en Go es delegar la separación entre el comando y los datos al *driver* de la base de datos subyacente mediante el uso de parámetros de sustitución (placeholders). 

Cuando usas los métodos `db.Query`, `db.QueryRow` o `db.Exec` pasando los valores como argumentos variádicos, Go utiliza automáticamente *Prepared Statements* en segundo plano. Los datos son enviados a la base de datos en un paquete separado al de la consulta SQL, haciendo imposible que el motor los interprete como comandos ejecutables.

```go
// PATRÓN SEGURO: Uso de Placeholders
func getUserSafe(db *sql.DB, username string) (*User, error) {
    // Nota: El placeholder varía según el driver: 
    // Postgres usa $1, $2... mientras que MySQL/SQLite usan ?
    query := "SELECT id, email FROM users WHERE username = $1"
    
    var u User
    // El driver se encarga de escapar y tipar el parámetro de forma segura
    err := db.QueryRow(query, username).Scan(&u.ID, &u.Email)
    return &u, err
}
```

*Nota arquitectónica:* Herramientas como ORMs (GORM) o generadores de código (sqlc), discutidos en el Capítulo 29, implementan esta parametrización por defecto, por lo que el riesgo de SQLi se reduce drásticamente al usarlos, a menos que utilices explícitamente sus métodos de "Raw SQL" de forma insegura.

---

### 2. Cross-Site Request Forgery (CSRF)

El CSRF es un ataque en el que un sitio web malicioso engaña al navegador web del usuario para que realice una acción no deseada en un sitio de confianza donde el usuario está actualmente autenticado. Dado que las cookies de sesión se envían automáticamente con cada petición al dominio origen, el servidor confía en la solicitud.

En Go, la mitigación del CSRF se aborda en dos frentes combinados en la capa HTTP.

#### Estrategia 1: El Atributo `SameSite` en Cookies

La primera línea de defensa, y la más moderna, es configurar correctamente las cookies de sesión desde tu servidor Go. El estándar `SameSite` instruye al navegador sobre si debe incluir la cookie en peticiones que se originan desde otros dominios (cross-site).

```go
// Configuración de una cookie de sesión resistente a CSRF
func setSessionCookie(w http.ResponseWriter, sessionToken string) {
    http.SetCookie(w, &http.Cookie{
        Name:     "session_id",
        Value:    sessionToken,
        Path:     "/",
        HttpOnly: true, // Protege contra XSS en el cliente
        Secure:   true, // Solo se envía por HTTPS
        // Strict: La cookie solo se envía si la petición viene del mismo sitio web
        // Lax: Permite navegación top-level (ej. un link desde otro sitio), ideal para uso general.
        SameSite: http.SameSiteStrictMode, 
    })
}
```

#### Estrategia 2: El Patrón de Token Sincronizado (Anti-CSRF Tokens)

Aunque `SameSite` es poderoso, los clientes antiguos pueden no soportarlo completamente, y las APIs que dependen de sesiones basadas en cookies (en lugar de JWT puro en cabeceras `Authorization`) necesitan una protección explícita para mutaciones de estado (POST, PUT, DELETE).

La implementación idiomática en Go consiste en generar un token criptográficamente seguro, asociarlo a la sesión del usuario e inyectarlo en cada formulario (o requerirlo en una cabecera HTTP específica como `X-CSRF-Token`). Luego, un Middleware (como los que estructuramos en el Capítulo 25) intercepta la petición entrante y valida el token.

En lugar de reinventar la rueda criptográfica, el estándar de la comunidad Go para esto es utilizar librerías especializadas y auditadas que se inyectan como middlewares.

```go
import (
    "net/http"
    "github.com/gorilla/csrf"
)

func main() {
    router := http.NewServeMux()
    router.HandleFunc("/transfer", transferHandler)

    // Clave simétrica de 32 bytes para firmar los tokens (DEBE ser secreta y venir del entorno)
    authKey := []byte("clave-secreta-de-32-bytes-aqui!!")

    // Instanciamos el middleware CSRF
    csrfMiddleware := csrf.Protect(
        authKey,
        csrf.Secure(true), // Exigir HTTPS
        csrf.SameSite(csrf.SameSiteStrictMode),
    )

    // Envolvemos nuestro router principal con el middleware de protección
    http.ListenAndServe(":8080", csrfMiddleware(router))
}
```

Al utilizar este enfoque, el middleware rechazará automáticamente cualquier petición `POST`, `PUT`, `PATCH` o `DELETE` que no incluya un token válido generado por el servidor, mitigando el ataque en la misma puerta de entrada de tu aplicación.

## 36.4. Análisis estático de seguridad en pipelines automatizados (gosec)

La seguridad no es un paso que se añade al final del desarrollo; es una propiedad emergente de un proceso riguroso. En la ingeniería de software moderna, la filosofía de *Shift-Left* promueve mover las pruebas de seguridad lo más cerca posible del momento en que se escribe el código. Para lograr esto en Go, el Análisis Estático de Seguridad de Aplicaciones (SAST) es nuestra primera línea de defensa automatizada.

El estándar de facto en el ecosistema Go para SAST es **`gosec`** (Golang Security Checker). A diferencia de los linters tradicionales que se enfocan en el estilo (como veremos en el Capítulo 48 con `golangci-lint`), `gosec` inspecciona el Árbol de Sintaxis Abstracta (AST) de tu código Go buscando patrones específicos asociados a vulnerabilidades conocidas.

---

### 1. ¿Qué detecta `gosec`?

La herramienta viene preconfigurada con un conjunto de reglas que mapean directamente contra problemas críticos de seguridad, muchos de ellos alineados con el OWASP Top 10. Algunos ejemplos de lo que `gosec` detectará automáticamente en tu código incluyen:

* **Criptografía débil:** Uso de algoritmos obsoletos como MD5 o DES (G401, G501).
* **Manejo inseguro de archivos:** Creación de archivos con permisos excesivamente permisivos o extracción insegura de archivos ZIP (G301, G305).
* **Vulnerabilidades de inyección:** Inyección SQL por concatenación (G201, G202) y ejecución de comandos del sistema sin sanitizar (G204).
* **Credenciales expuestas:** Tokens, contraseñas o claves privadas *hardcodeadas* directamente en el código fuente (G101).

### 2. Ejecución local e Inspección de Código

Instalar y ejecutar `gosec` en tu entorno de desarrollo local es trivial:

```bash
# Instalación
go install github.com/securego/gosec/v2/cmd/gosec@latest

# Ejecución recursiva en todo el proyecto
gosec ./...
```

Si introdujéramos el antipatrón de inyección SQL que vimos en la sección anterior (36.3), `gosec` fallaría la compilación con un mensaje claro, indicando la línea exacta, la regla infringida (G201) y la severidad del hallazgo.

### 3. Gestión de Falsos Positivos: La directiva `//#nosec`

En ocasiones, el análisis estático se equivoca. Puede que estés utilizando MD5 no para cifrar contraseñas (lo cual sería catastrófico), sino simplemente para generar un hash de control (checksum) de un archivo público donde la seguridad criptográfica no es un factor.

Para evitar que `gosec` bloquee tu construcción por un falso positivo, Go permite el uso de comentarios especiales para silenciar advertencias específicas a nivel de línea. Sin embargo, para mantener una arquitectura limpia, **siempre debes justificar explícitamente por qué estás silenciando una regla**.

```go
import (
    "crypto/md5"
    "fmt"
)

func generateETag(content []byte) string {
    // #nosec G401 -- El uso de MD5 aquí es para generación de ETags HTTP, no para seguridad.
    hash := md5.Sum(content)
    return fmt.Sprintf("%x", hash)
}
```
*Nota: Es crucial especificar el identificador de la regla (ej. G401). Si usas `// #nosec` sin identificador, silenciarás todas las advertencias de seguridad en esa línea, lo cual es una mala práctica.*

### 4. Integración en Pipelines CI/CD

El verdadero poder de `gosec` se desata cuando se integra en tus pipelines de Integración Continua (como abordaremos a fondo en el Capítulo 48). El objetivo es que cualquier *Pull Request* que introduzca código vulnerable sea rechazado automáticamente antes de llegar a la rama principal.

A continuación, se muestra un ejemplo idiomático de cómo integrar `gosec` en un flujo de trabajo de **GitHub Actions**. El truco aquí es exportar los resultados en un formato estructurado (como SARIF) para que la plataforma pueda anotar las vulnerabilidades directamente en la interfaz de revisión de código.

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  gosec:
    name: Run Gosec Scanner
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22' # Alineado con la versión de nuestro proyecto

      - name: Run Gosec
        uses: securego/gosec@master
        with:
          # Escanea todo el directorio y exporta en formato SARIF
          args: '-no-fail -fmt sarif -out results.sarif ./...'

      - name: Upload SARIF file
        uses: github/codeql-action/upload-sarif@v3
        with:
          # Sube los resultados a la pestaña "Security" del repositorio
          sarif_file: results.sarif
```

Al automatizar este proceso, garantizas que la base de código mantenga un estándar de seguridad basal, liberando a los revisores humanos para que se concentren en vulnerabilidades lógicas o de diseño arquitectónico que las herramientas estáticas no pueden detectar.

