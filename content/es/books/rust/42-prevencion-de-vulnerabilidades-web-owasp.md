La robustez de Rust en la gestión de memoria no exime al desarrollador de riesgos lógicos y de protocolo. Un backend senior debe anticipar vectores de ataque que operan más allá del compilador. En este capítulo, abordamos la seguridad desde el estándar de **OWASP**, transformando conceptos teóricos en defensas técnicas. Exploraremos el uso de **binds** en SQLx y Diesel para anular la inyección SQL, la sanitización con **ammonia** contra XSS, la implementación de tokens **CSRF** y estrategias de **Rate Limiting** distribuido. El objetivo: construir APIs que no solo sean rápidas, sino resilientes ante adversarios que buscan explotar cada endpoint expuesto.

## 42.1 Mitigación de Inyección SQL (Uso estricto de binds en SQLx/Diesel)

Aunque el estricto sistema de tipos y el *Borrow Checker* de Rust nos protegen contra vulnerabilidades de memoria (como *buffer overflows* o *use-after-free*), **no pueden interpretar la semántica de los datos que enviamos a sistemas externos**. Si construimos una consulta SQL concatenando cadenas de texto, el compilador de Rust lo verá como una operación de `String` perfectamente válida, dejando nuestra aplicación completamente vulnerable a la Inyección SQL (SQLi).

Como desarrolladores backend a nivel senior, debemos entender que la mitigación de SQLi no se basa en "limpiar" o "sanitizar" inputs manualmente, sino en **separar estrictamente la estructura de la consulta de los datos proporcionados por el usuario**. Esto se logra a nivel del protocolo de la base de datos (por ejemplo, el *Extended Query Protocol* en PostgreSQL) mediante el uso de *Prepared Statements* (Sentencias Preparadas) y *Bind Variables* (Variables de Enlace).

A continuación, veremos cómo aplicar este principio de forma inquebrantable utilizando los dos gigantes del ecosistema de bases de datos en Rust, introducidos en los Capítulos 20 y 21: **SQLx** y **Diesel**.

---

### El Anti-patrón: Concatenación de Cadenas

Antes de ver la solución, identifiquemos al enemigo. El uso de `format!`, `concat!` o métodos de mutación de `String` para insertar variables en una consulta SQL es una bandera roja inmediata en cualquier auditoría de seguridad.

```rust
// ❌ ANTIPATRÓN: Código vulnerable a SQL Injection
let username_input = "admin'; DROP TABLE users; --"; 

// El compilador de Rust permite esto sin quejas:
let query = format!("SELECT id, email FROM users WHERE username = '{}'", username_input);

// Al ejecutarse, la base de datos interpretará el "DROP TABLE".
```

### Prevención en SQLx: Comprobación en Compilación y Binds

Como vimos en el Capítulo 20, SQLx es agnóstico pero fuertemente tipado. Su mayor virtud de seguridad es que fomenta por defecto el uso de *Prepared Statements*.

#### 1. Uso de la macro `query!` (La Vía Dorada)

La forma más segura y recomendada de ejecutar consultas estáticas en SQLx es utilizar las macros de la familia `query!` (`query!`, `query_as!`, etc.). Estas macros no solo verifican la sintaxis SQL y los tipos contra la base de datos en tiempo de compilación, sino que **transforman automáticamente las variables pasadas en parámetros bind**.

```rust
// ✅ SEGURO: La macro delega el binding al driver de la base de datos.
// El valor $1 se envía separadamente de la estructura de la consulta.
let user = sqlx::query!(
    "SELECT id, email FROM users WHERE username = $1",
    username_input
)
.fetch_one(&pool)
.await?;
```

#### 2. Consultas Dinámicas con `query()` y `.bind()`

Cuando la consulta no puede conocerse en tiempo de compilación (y por ende no puedes usar la macro), debes usar la función `sqlx::query()`. En este escenario, **jamás debes interpolar variables en la cadena de texto**. Debes colocar los marcadores correspondientes a tu motor (ej. `$1`, `$2` para Postgres, o `?` para MySQL/SQLite) y encadenar el método `.bind()`.

```rust
// ✅ SEGURO: Construcción en tiempo de ejecución utilizando binds explícitos.
let query_str = "SELECT id, email FROM users WHERE username = $1 AND status = $2";

let user = sqlx::query(query_str)
    .bind(username_input)
    .bind("active") // Los binds se asignan en el orden de los marcadores
    .fetch_optional(&pool)
    .await?;
```

#### 3. El peligro del QueryBuilder

Si necesitas construir consultas altamente dinámicas (como un `WHERE ... IN (...)` o filtros opcionales múltiples), SQLx proporciona un `QueryBuilder`. Aquí el riesgo de inyección reaparece si concatenas strings en el builder. Debes usar **siempre** el método `push_bind()`.

```rust
use sqlx::QueryBuilder;

let mut builder = QueryBuilder::new("SELECT * FROM users WHERE 1=1 ");

if let Some(role) = filter_role {
    builder.push(" AND role = ");
    // ✅ SEGURO: Agrega el valor como un parámetro bind, no como texto plano.
    builder.push_bind(role); 
}
```

---

### Prevención en Diesel: Seguridad de Tipos (Type-Safety)

Diesel (visto en el Capítulo 21) aborda el problema desde otro ángulo: abstrae el SQL mediante un Lenguaje Específico de Dominio (DSL) fuertemente tipado.

#### 1. El DSL de Diesel (Seguro por Diseño)

Cuando utilizas el Query Builder de Diesel, estás protegido por defecto. Diesel compila tu código Rust en sentencias preparadas de manera subyacente. Es virtualmente imposible inyectar SQL si te mantienes dentro de los límites del DSL.

```rust
use crate::schema::users::dsl::*;
use diesel::prelude::*;

// ✅ SEGURO: Diesel transforma el `.eq()` en un prepared statement 
// del tipo "WHERE username = $1" y asocia el valor de forma segura.
let user = users
    .filter(username.eq(username_input))
    .first::<User>(&mut conn)?;
```

#### 2. La Zona de Peligro: `sql_query`

La vulnerabilidad en Diesel suele aparecer cuando los desarrolladores se encuentran con una consulta muy compleja que el DSL no soporta fácilmente y deciden usar la función de escape: `diesel::sql_query`.

Si vas a usar SQL crudo en Diesel, la regla de oro se mantiene: **nunca uses `format!`**. Debes utilizar marcadores de parámetros y la función `.bind::<TipoSQL, _>()`.

```rust
use diesel::sql_types::Text;
use diesel::RunQueryDsl;

// ❌ ANTIPATRÓN en Diesel
// diesel::sql_query(format!("SELECT * FROM users WHERE username = '{}'", username_input))

// ✅ SEGURO: Uso de binds explícitos en consultas crudas
let user = diesel::sql_query("SELECT * FROM users WHERE username = $1")
    .bind::<Text, _>(username_input)
    .get_result::<User>(&mut conn)?;
```

---

### Resumen de Reglas Arquitectónicas para el Equipo

Para asegurar que tu aplicación backend sea resistente a SQLi, implementa las siguientes reglas a nivel de *Code Review* y CI/CD:

1. **Tolerancia Cero a `format!` en SQL:** Prohíbe categóricamente el uso de `format!`, `concat!` o interpolación de strings directa al interactuar con la base de datos.
2. **Priorizar Macros / DSL:** Exige el uso de `sqlx::query!` o el DSL de Diesel. Si un desarrollador usa `sqlx::query` o `diesel::sql_query`, debe justificarlo en su Pull Request.
3. **Delegar a la Base de Datos:** Confía en los *Prepared Statements*. Evita intentar escribir funciones personalizadas de "limpieza de caracteres" (sanitización de comillas, etc.); el driver de la base de datos siempre hará el proceso de escape binario de forma más segura y eficiente que el código de aplicación.

## 42.2 Sanitización de inputs y prevención de XSS

Aunque el Cross-Site Scripting (XSS) es una vulnerabilidad que se ejecuta en el navegador del cliente, **el backend es el principal vector de propagación**. Si nuestro servidor en Rust acepta una carga útil maliciosa (un *payload* de JavaScript incrustado) y la distribuye pasivamente a otros usuarios a través de una API REST o páginas renderizadas (SSR), somos cómplices de la brecha de seguridad.

Como desarrolladores senior, debemos implementar una estrategia de "Defensa en Profundidad" (*Defense in Depth*). Esto implica tres capas: **Validación estricta de entrada, Sanitización/Escape de salida, y Políticas de Seguridad en la respuesta (CSP)**.

---

### 1. Validación Estricta de Entrada (El primer escudo)

La regla de oro es: **nunca confíes en los datos del cliente**. Antes siquiera de pensar en escapar caracteres, debemos rechazar cualquier dato que no cumpla con el formato esperado. En el ecosistema Rust, el crate `validator` es el estándar de facto para aplicar validaciones declarativas mediante macros en nuestros *Structs* de deserialización (como los extraídos por Axum o Actix-Web).

```rust
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateProfileRequest {
    // Validamos longitud y formato. Los caracteres '<' o '>' 
    // no deberían ser válidos en un nombre de usuario estándar.
    #[validate(length(min = 3, max = 30))]
    #[validate(custom(function = "validate_alphanumeric"))]
    pub username: String,

    // Una biografía podría aceptar más caracteres, pero limitamos el tamaño
    // para mitigar ataques de denegación de servicio o payloads masivos.
    #[validate(length(max = 500))]
    pub bio: String,
}

// Función de validación personalizada para evitar caracteres de inyección básicos
fn validate_alphanumeric(username: &str) -> Result<(), validator::ValidationError> {
    if username.chars().all(|c| c.is_alphanumeric() || c == '_') {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_characters"))
    }
}
```

### 2. Sanitización de Contenidos (Manejo de HTML Permitido)

Existen casos de uso legítimos donde un usuario *debe* poder enviar texto enriquecido (por ejemplo, comentarios de un blog o descripciones procesadas desde Markdown). Si vamos a almacenar y devolver HTML, debemos sanitizarlo para eliminar etiquetas `<script>`, manejadores de eventos (`onclick`, `onload`), y estilos maliciosos.

Para esta tarea en Rust, **el crate `ammonia` es la herramienta ideal**. Funciona limpiando agresivamente el HTML y dejando solo una lista blanca (*whitelist*) de etiquetas seguras.

```rust
use ammonia::clean;

fn save_user_comment(raw_html_input: &str) {
    // ❌ ANTIPATRÓN: Guardar directamente en la base de datos
    // let db_payload = raw_html_input;

    // ✅ SEGURO: `ammonia` elimina cualquier vector XSS conocido,
    // dejando etiquetas inocuas como <b>, <i>, <a>, etc.
    let safe_html = clean(raw_html_input);

    // safe_html ahora puede ser guardado en la base de datos de forma segura.
    println!("Comentario sanitizado: {}", safe_html);
}
```

Si por el contrario, tu API solo debe recibir y enviar texto plano, **no deberías permitir HTML en absoluto**. En ese caso, debes aplicar *HTML Escaping* (convertir `<` en `&lt;`) utilizando crates como `html-escape` justo antes de almacenar o devolver los datos, garantizando que el navegador lo interprete como texto y no como código ejecutable.

### 3. Escape Contextual en Plantillas (Server-Side Rendering)

Si tu aplicación Rust no es solo una API JSON, sino que renderiza HTML en el servidor (utilizando motores como **Askama** o **Tera**), debes asegurar que las variables inyectadas en las plantillas se escapen automáticamente.

Afortunadamente, motores modernos como Askama (que compila plantillas a código Rust seguro en tiempo de compilación) **aplican el escape de HTML por defecto**.

```html
<div class="profile-bio">
    {{ user.bio }}
</div>

<div class="profile-bio">
    {{ user.sanitized_bio|safe }}
</div>
```

### 4. Content Security Policy (CSP) en los Headers HTTP

Incluso si fallan nuestras validaciones y sanitizaciones, podemos instruir al navegador web del cliente para que no ejecute scripts no autorizados mediante las cabeceras HTTP. Como desarrolladores backend, configurar los *Security Headers* es nuestra responsabilidad.

Si usamos Axum, podemos integrarnos fácilmente con el ecosistema `tower-http` para inyectar estas cabeceras en cada respuesta de manera global.

```rust
use axum::{routing::get, Router};
use tower_http::set_header::SetResponseHeaderLayer;
use http::{header, HeaderValue};

pub fn build_secure_router() -> Router {
    // Definimos una política estricta: solo permite scripts del propio dominio,
    // prohíbe scripts inline y eval() de JavaScript.
    let csp_value = HeaderValue::from_static(
        "default-src 'self'; script-src 'self'; object-src 'none';"
    );

    Router::new()
        .route("/api/data", get(handler_data))
        // Aplicamos el header CSP mediante un middleware de Tower
        .layer(SetResponseHeaderLayer::overriding(
            header::CONTENT_SECURITY_POLICY,
            csp_value,
        ))
}

async fn handler_data() -> &'static str {
    "Datos de la API seguros"
}
```

### Resumen de mitigación XSS para el Backend

1. **Valida en la entrada:** Usa `validator` para asegurar que la estructura y el contenido de la petición (`Request`) son los esperados.
2. **Sanitiza para texto enriquecido:** Si el modelo de negocio requiere guardar HTML, pásalo siempre por `ammonia` antes de guardarlo en la base de datos.
3. **Aplica Headers de Seguridad:** Utiliza middlewares para añadir `Content-Security-Policy`, `X-Content-Type-Options: nosniff` y `X-Frame-Options` a tus respuestas HTTP.

## 42.3 Cross-Site Request Forgery (CSRF) tokens

Mientras que el XSS (visto en la sección anterior) busca inyectar código malicioso para robar datos o alterar la interfaz, el Cross-Site Request Forgery (CSRF) tiene un objetivo distinto: **aprovecharse de la confianza que el backend tiene en el navegador del usuario**.

El ataque ocurre cuando un sitio web malicioso engaña al navegador de la víctima para que envíe una petición HTTP (por ejemplo, un POST para cambiar su contraseña o transferir fondos) a nuestra aplicación Rust, donde el usuario ya tiene una sesión activa. Como los navegadores adjuntan automáticamente las cookies de sesión al dominio de destino, nuestro servidor podría procesar la petición creyendo que fue iniciada legítimamente por el usuario.

Como ingenieros backend, debemos implementar defensas para asegurar que la petición no solo provenga de un usuario autenticado, sino que haya sido iniciada intencionalmente desde nuestra propia interfaz.

---

### 1. La Primera Línea de Defensa: Atributo `SameSite`

Antes de hablar de tokens, es imperativo mencionar la mitigación más moderna y sencilla a nivel de protocolo HTTP: el atributo `SameSite` en las cookies. Este atributo le indica al navegador que no envíe la cookie en peticiones *cross-origin* (es decir, peticiones originadas desde un dominio distinto al nuestro).

En el ecosistema de Rust, ya sea que uses Axum, Actix-Web o el crate base `cookie`, configurar esto es fundamental al momento de emitir la sesión.

```rust
use cookie::{Cookie, SameSite};
use time::Duration;

pub fn build_session_cookie(session_id: &str) -> Cookie<'static> {
    Cookie::build(("session_id", session_id.to_owned()))
        .domain("api.midominio.com")
        .path("/")
        // Evita que JavaScript acceda a la cookie (Mitiga XSS)
        .http_only(true)
        // Solo viaja por HTTPS
        .secure(true)
        // MITIGACIÓN CSRF: La cookie no se enviará desde otros sitios web
        .same_site(SameSite::Strict) 
        .max_age(Duration::days(1))
        .build()
}
```

*Nota arquitectónica:* `SameSite::Strict` es ideal para APIs de uso exclusivo, pero puede romper flujos legítimos de navegación si tu aplicación depende de enlaces externos. En esos casos, `SameSite::Lax` ofrece un buen balance, previniendo ataques POST mientras permite la navegación GET estándar.

### 2. El Patrón Synchronizer Token (Tokens Anti-CSRF)

Depender exclusivamente de `SameSite` no es suficiente para aplicaciones de misión crítica, ya que navegadores antiguos podrían ignorar el atributo. La defensa histórica y más robusta es el uso de **Tokens CSRF**.

El flujo funciona así:

1. Cuando el cliente carga un formulario (o la SPA hace su primera carga), el servidor de Rust genera un token criptográficamente seguro, único para esa sesión, y se lo envía al cliente.
2. El cliente debe incluir este token en cualquier petición que mute el estado (POST, PUT, DELETE, PATCH), ya sea en un campo oculto del formulario HTML o en un *Header* HTTP (`X-CSRF-Token`).
3. El servidor compara el token recibido con el que tiene almacenado o encriptado para esa sesión. Si no coinciden o el token no existe, la petición es rechazada (`403 Forbidden`).

En Axum, podemos implementar esto utilizando crates comunitarios como `axum-csrf`. A continuación un ejemplo de cómo se estructura este middleware:

```rust
use axum::{
    routing::{get, post},
    response::IntoResponse,
    Router, Form,
};
use axum_csrf::{CsrfConfig, CsrfLayer, CsrfToken};
use serde::Deserialize;

#[derive(Deserialize)]
struct TransferRequest {
    amount: u32,
    target_account: String,
    // El cliente envía el token en el payload del formulario
    csrf_token: String, 
}

// Handler que genera y envía el token inicial
async fn show_form(token: CsrfToken) -> impl IntoResponse {
    let raw_token = token.authenticity_token().unwrap();
    // Renderizaríamos un HTML inyectando `raw_token` en un <input type="hidden">
    format!("Formulario listo. Token generado: {}", raw_token)
}

// Handler que recibe la acción crítica
async fn process_transfer(
    token: CsrfToken,
    Form(payload): Form<TransferRequest>,
) -> impl IntoResponse {
    // Validamos que el token del payload coincide con el de la sesión
    if token.verify(&payload.csrf_token).is_err() {
        return "Error: Token CSRF inválido. Petición rechazada.";
    }

    "Transferencia realizada con éxito"
}

pub fn app_router() -> Router {
    // Configuramos la clave secreta y las propiedades de la cookie del token
    let config = CsrfConfig::default();

    Router::new()
        .route("/transfer", get(show_form).post(process_transfer))
        // Inyectamos el middleware de CSRF en nuestra aplicación
        .layer(CsrfLayer::new(config))
}
```

### 3. El Contexto Senior: Cuándo NO necesitas Tokens CSRF

Un error muy común en desarrolladores intermedios es intentar implementar middlewares CSRF en APIs que no los necesitan. Como regla general:

**Si tu API RESTful o GraphQL en Rust autentica las peticiones utilizando tokens en el Header `Authorization` (por ejemplo, JWT via `Bearer <token>`) y NO utiliza Cookies de sesión, tu API es intrínsecamente inmune al CSRF.**

¿Por qué? Porque la vulnerabilidad CSRF se basa en que el navegador *adjunta automáticamente* las cookies. Un navegador jamás leerá un JWT del *Local Storage* para inyectarlo mágicamente en un *Header* de una petición *cross-origin*. Eso requiere código JavaScript explícito, y si un atacante puede ejecutar JavaScript en tu dominio, ya tiene un problema mucho mayor (XSS), haciendo que el CSRF sea irrelevante.

Por lo tanto:

* **Aplicaciones tradicionales (Server-Side Rendering) con `Session Cookies`**: Necesitan `SameSite` + Tokens CSRF.
* **Single Page Applications (SPAs) que usan Cookies `HttpOnly` para la sesión**: Necesitan Tokens CSRF (usualmente mediante el patrón *Double Submit Cookie*).
* **APIs puras consumidas por SPAs/Móviles que usan `Authorization: Bearer`**: NO necesitan protección CSRF.

## 42.4 Rate Limiting para prevenir fuerza bruta y DDoS

Mientras que la infraestructura de red (como Cloudflare o AWS Shield) nos protege contra ataques DDoS volumétricos en las capas 3 y 4 (Red y Transporte), **el backend es responsable de defenderse contra los ataques de Capa 7 (Aplicación)**. Estos incluyen ataques de fuerza bruta contra endpoints de *login*, *credential stuffing* (reutilización masiva de contraseñas filtradas) y la saturación intencional de endpoints costosos computacionalmente (como la generación de reportes o búsquedas complejas).

Como ingenieros senior, sabemos que un atacante puede derribar nuestra base de datos con unas pocas peticiones por segundo si apunta a las rutas correctas. La mitigación principal para esto es el **Rate Limiting** (Limitación de Tasa).

---

### 1. Limitación en Memoria (Para despliegues de un solo nodo)

Si tu aplicación corre en una sola instancia, puedes mantener el estado de las peticiones en la memoria RAM. En el ecosistema asíncrono de Rust (particularmente con Axum y Tower), la biblioteca líder para esto es `tower-governor`, la cual implementa el eficiente algoritmo *GCRA (Generic Cell Rate Algorithm)*, una variante superior del clásico *Token Bucket*.

```rust
use axum::{routing::post, Router};
use std::time::Duration;
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};

pub fn build_rate_limited_router() -> Router {
    // Configuramos el límite: 5 peticiones cada 10 segundos por IP.
    let governor_conf = GovernorConfigBuilder::default()
        .per_second(10)
        .burst_size(5)
        .finish()
        .unwrap();

    Router::new()
        // Protegemos específicamente la ruta más vulnerable
        .route("/api/auth/login", post(login_handler))
        // Aplicamos el middleware
        .layer(GovernorLayer {
            config: Box::leak(governor_conf.into()),
        })
}

async fn login_handler() -> &'static str {
    "Procesando intento de login..."
}
```

Si un cliente supera la cuota configurada, `tower-governor` interceptará la petición antes de que llegue a nuestro *handler* y devolverá automáticamente una respuesta HTTP `429 Too Many Requests`, incluyendo las cabeceras estándar `x-ratelimit-limit` y `x-ratelimit-reset`.

### 2. El Problema del Reverse Proxy (La trampa del Load Balancer)

El código anterior tiene una vulnerabilidad arquitectónica crítica si la aplicación está desplegada detrás de un balanceador de carga (como Nginx, AWS ALB, o Kubernetes Ingress).

Por defecto, el *Rate Limiter* agrupa las peticiones basándose en la dirección IP de origen de la conexión TCP. Si estás detrás de un proxy, **todas las peticiones parecerán provenir de la IP del proxy**. Si un solo usuario malicioso hace saltar el límite, ¡bloquearás a todos los usuarios legítimos simultáneamente!

Para solucionar esto, debemos extraer la verdadera IP del cliente leyendo la cabecera `X-Forwarded-For` o implementando un extractor de claves personalizado (*Key Extractor*).

```rust
// Ejemplo conceptual de cómo decirle a governor que confíe en las cabeceras del proxy
use tower_governor::key_extractor::SmartIpKeyExtractor;

let governor_conf = GovernorConfigBuilder::default()
    .per_second(10)
    .burst_size(5)
    // Utilizamos un extractor que prioriza X-Forwarded-For
    .key_extractor(SmartIpKeyExtractor) 
    .finish()
    .unwrap();
```

*Advertencia de Seguridad:* Nunca confíes ciegamente en `X-Forwarded-For` a menos que estés absolutamente seguro de que tu *Load Balancer* de borde la está sobrescribiendo. Si el servidor está expuesto directamente a Internet, un atacante puede falsificar esta cabecera (*IP Spoofing*) para evadir el límite.

### 3. Rate Limiting Distribuido con Redis (Arquitectura Senior)

Cuando nuestra aplicación escala horizontalmente a múltiples réplicas (por ejemplo, en un clúster de Kubernetes), el *Rate Limiting* en memoria deja de ser efectivo. Si un usuario tiene un límite de 5 peticiones por minuto, pero tenemos 10 réplicas del servidor, un ataque *Round Robin* podría permitirle hacer hasta 50 peticiones reales.

En un entorno distribuido, el estado debe compartirse. Aquí es donde entra **Redis**.

Para implementar esto en Rust, utilizamos crates como `redis` o `fred`, a menudo ejecutando un script Lua de evaluación atómica en el servidor Redis para evitar condiciones de carrera (*race conditions*) durante la actualización de los contadores.

1. **El cliente hace una petición.**
2. El middleware de Axum intercepta la petición y extrae el identificador (IP del cliente o, preferiblemente, su `user_id` extraído del JWT si está autenticado).
3. **El backend consulta a Redis:** *"¿Cuántas peticiones ha hecho este identificador en la ventana de tiempo actual?"*
4. Si está por debajo del límite, Redis incrementa el contador y el backend procesa la solicitud.
5. Si lo supera, el backend devuelve el error `429` sin procesar la carga útil.

Limitar por `user_id` en endpoints autenticados es significativamente más robusto que limitar por IP, ya que previene que un atacante distribuya su ataque a través de una *botnet* de múltiples IPs utilizando la misma cuenta comprometida.

Con esta sección, hemos completado el **Capítulo 42: Prevención de Vulnerabilidades Web (OWASP)**, estableciendo un perímetro de defensa robusto en nuestra API mediante mitigación de SQLi, XSS, CSRF y protección volumétrica.
