Este capítulo aborda la piedra angular de la seguridad en el backend: garantizar la identidad de los usuarios y controlar sus acciones. En un ecosistema de alto rendimiento como Rust, la seguridad no es negociable. Exploraremos desde la implementación de **JWT** para arquitecturas *stateless* y el manejo de **sesiones persistentes** con cookies, hasta la integración de flujos modernos de **OAuth2 y OpenID Connect**. Finalmente, aprenderás a construir sistemas de **Control de Acceso Basado en Roles (RBAC)** utilizando la potencia del sistema de tipos de Rust y los *extractors* de frameworks como Axum, asegurando que cada endpoint esté protegido de forma eficiente y robusta.

## 18.1 Implementación de JSON Web Tokens (JWT) con `jsonwebtoken`

En arquitecturas RESTful y microservicios sin estado (stateless), JSON Web Tokens (JWT) se ha posicionado como el estándar de facto para la transmisión segura de información de identidad y autorización entre partes. Como vimos en el Capítulo 15, Rust brilla en la serialización de datos; esta capacidad es exactamente lo que hace que trabajar con JWTs en Rust sea robusto y seguro a nivel de tipos.

Para implementar JWTs, utilizaremos el crate `jsonwebtoken`. Esta librería no solo maneja la criptografía necesaria para firmar y verificar tokens, sino que se integra perfectamente con `serde` para garantizar que el *payload* (los datos que viajan dentro del token) cumpla estrictamente con la estructura que definamos en nuestro código.

### Dependencias necesarias

Para comenzar, debemos añadir la librería a nuestro `Cargo.toml`. Asegúrate de tener también `serde` configurado, ya que lo necesitaremos para definir nuestros *Claims*.

```toml
[dependencies]
jsonwebtoken = "9.2" # Verifica siempre la última versión estable
serde = { version = "1.0", features = ["derive"] }
```

### Modelando los Claims (El Payload)

En la terminología de JWT, los datos empaquetados dentro del token se denominan *claims* (declaraciones). Existen claims estándar (registrados en la RFC 7519) como `sub` (subject), `exp` (expiration time) e `iat` (issued at).

En Rust, modelamos estos claims utilizando un `struct` simple derivando los traits de `serde`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Sujeto del token (usualmente el ID del usuario)
    pub sub: String,
    /// Rol del usuario para control de acceso (RBAC)
    pub role: String,
    /// Fecha de expiración (Timestamp en segundos desde el UNIX Epoch)
    pub exp: usize, 
}
```

> **Nota importante:** El claim `exp` debe ser de tipo numérico (típicamente `usize` o `u64`) representando segundos desde el Epoch. El crate `jsonwebtoken` validará este campo automáticamente si está presente.

### Creación y Firma del Token (Encoding)

Para emitir un token tras un inicio de sesión exitoso, necesitamos tres elementos:

1. **Header:** Define el algoritmo de firma (por defecto HS256).
2. **Claims:** Nuestra estructura de datos instanciada.
3. **EncodingKey:** La clave criptográfica para firmar el token.

```rust
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn generar_token(user_id: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    // Calculamos la expiración: 24 horas a partir de ahora
    let expiracion = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("El tiempo del sistema es anterior al UNIX Epoch")
        .as_secs() + (24 * 3600);

    let claims = Claims {
        sub: user_id.to_owned(),
        role: "usuario_estandar".to_string(),
        exp: expiracion as usize,
    };

    // Generamos el token usando HMAC-SHA256 (HS256)
    let header = Header::new(Algorithm::HS256);
    let key = EncodingKey::from_secret(secret.as_bytes());

    encode(&header, &claims, &key)
}
```

### Validación y Deserialización (Decoding)

Cuando el cliente envía el token de vuelta (usualmente en la cabecera `Authorization: Bearer <token>`), debemos decodificarlo. Esta operación realiza dos tareas críticas simultáneamente:

1. **Verificación criptográfica:** Asegura que el token fue firmado con nuestro secreto y no ha sido alterado.
2. **Validación de Claims:** Comprueba la caducidad (`exp`) y deserializa el JSON en nuestra estructura `Claims`. Si falta un campo requerido o el token expiró, la función fallará.

```rust
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation, TokenData};

pub fn validar_token(token: &str, secret: &str) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    
    // Configuramos las reglas de validación. 
    // Por defecto, valida la expiración y la firma.
    let mut validation = Validation::new(Algorithm::HS256);
    
    // Opcional: Reducir el margen de tolerancia de tiempo (leeway) por defecto que es de 60 segundos
    validation.leeway = 0; 

    decode::<Claims>(token, &key, &validation)
}
```

Al llamar a `decode`, Rust utiliza turbofish `::<Claims>` (o inferencia de tipos) para saber exactamente qué estructura de datos intentar construir a partir del JSON del payload. El resultado es un `TokenData<Claims>`, el cual envuelve a nuestra estructura en la propiedad `.claims`.

### Consideraciones de Seguridad en Producción

Antes de integrar esto en los middlewares de Actix o Axum (como veremos más adelante), ten en cuenta estas reglas fundamentales:

* **Los JWT no están encriptados:** El payload está codificado en Base64Url, lo que significa que cualquiera puede leerlo. **Nunca almacenes información sensible** (como contraseñas, números de tarjeta de crédito o tokens de acceso a APIs de terceros) en los Claims.
* **Gestión del Secreto:** En los ejemplos usamos un string duro o pasado por parámetro. En producción, el secreto debe cargarse desde variables de entorno de forma segura (veremos cómo manejar esto con `dotenvy` en el Capítulo 43).
* **Revocación (El límite de JWT):** Debido a que los JWT son *stateless*, no se pueden invalidar fácilmente antes de su fecha de expiración sin introducir estado (como una *denylist* en Redis). Hablaremos de estrategias para mitigar esto en la próxima sección de sesiones y en el Capítulo 22.

## 18.2 Manejo de sesiones y cookies

Mientras que los JWT (vistos en la sección anterior) brillan en arquitecturas *stateless* (sin estado), presentan un desafío inherente: la revocación instantánea. Si un usuario cierra sesión de forma anómala o su cuenta es comprometida, un JWT seguirá siendo válido hasta que expire, a menos que introduzcamos mecanismos complejos como listas de denegación (denylists).

Para aplicaciones web tradicionales o APIs que requieren un control estricto y centralizado sobre la autenticación, el patrón tradicional de **sesiones en el servidor y cookies** sigue siendo la opción más robusta. En este modelo, el estado reside en el backend (en memoria o en una base de datos) y el cliente solo almacena un identificador único (Session ID) de forma segura.

### El ecosistema de Cookies en Rust

En el ecosistema web de Rust, la manipulación de bajo nivel de cookies suele delegarse al crate `cookie`. Sin embargo, frameworks como Axum y Actix-Web proporcionan abstracciones de alto nivel o middlewares que facilitan enormemente este proceso.

Las cookies de sesión deben configurarse siempre con tres directivas de seguridad fundamentales:

* **`HttpOnly`**: Evita que el código JavaScript del cliente (como en un ataque XSS) pueda leer la cookie.
* **`Secure`**: Garantiza que la cookie solo se transmita a través de conexiones cifradas (HTTPS).
* **`SameSite`**: Mitiga los ataques de falsificación de peticiones en sitios cruzados (CSRF) controlando cuándo se envía la cookie en peticiones a otros dominios.

### Implementación práctica con Axum y `tower-sessions`

Dado que Axum se basa fuertemente en el ecosistema `tower`, la forma más estandarizada e idiomática de manejar sesiones es a través del crate `tower-sessions`. Este crate actúa como un middleware y permite usar diferentes "almacenes" (stores) para guardar los datos de la sesión.

Añadamos las dependencias a nuestro `Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1.0", features = ["full"] }
tower-sessions = "0.12"
serde = { version = "1.0", features = ["derive"] }
```

#### 1. Configuración del Session Store y el Middleware

Primero, necesitamos configurar dónde se guardarán las sesiones. Para desarrollo, usaremos `MemoryStore`, pero en producción (como veremos en el Capítulo 22), es recomendable usar almacenes persistentes como Redis (`RedisStore`) o PostgreSQL (`PostgresStore`).

```rust
use axum::{routing::{get, post}, Router};
use tower_sessions::{MemoryStore, SessionManagerLayer};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // 1. Inicializamos el almacén en memoria
    let session_store = MemoryStore::default();

    // 2. Configuramos la capa gestora de sesiones
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false) // En producción debe ser 'true' para requerir HTTPS
        .with_same_site(tower_sessions::cookie::SameSite::Lax);

    // 3. Acoplamos el middleware a nuestro Router de Axum
    let app = Router::new()
        .route("/login", post(login_handler))
        .route("/perfil", get(perfil_handler))
        .route("/logout", post(logout_handler))
        .layer(session_layer);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

#### 2. Handlers: Escribiendo y Leyendo la Sesión

La magia de `tower-sessions` radica en su integración con los **Extractors** de Axum (Capítulo 17). Simplemente inyectamos el tipo `Session` en la firma de nuestras funciones asíncronas para leer o modificar el estado asociado a ese cliente.

Definamos los datos que queremos guardar en sesión:

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
struct UsuarioInfo {
    id: u64,
    username: String,
}
```

Ahora, implementamos los endpoints:

```rust
use axum::{http::StatusCode, response::IntoResponse, Json};
use tower_sessions::Session;

// Handler para iniciar sesión
async fn login_handler(session: Session) -> impl IntoResponse {
    // Simulamos una validación exitosa en base de datos
    let usuario = UsuarioInfo {
        id: 42,
        username: "rustacean_senior".to_string(),
    };

    // Insertamos los datos en la sesión. 
    // El middleware se encarga automáticamente de generar el Session ID 
    // y enviar la cabecera Set-Cookie al cliente.
    match session.insert("usuario", usuario).await {
        Ok(_) => (StatusCode::OK, "Login exitoso"),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Error al crear la sesión"),
    }
}

// Handler protegido que requiere una sesión válida
async fn perfil_handler(session: Session) -> impl IntoResponse {
    // Intentamos extraer los datos del usuario de la sesión actual
    let usuario: Option<UsuarioInfo> = session.get("usuario").await.unwrap_or(None);

    match usuario {
        Some(u) => (
            StatusCode::OK,
            format!("Bienvenido a tu perfil, {}", u.username),
        ),
        None => (
            StatusCode::UNAUTHORIZED,
            "No estás autenticado. Por favor, inicia sesión.".to_string(),
        ),
    }
}

// Handler para cerrar sesión
async fn logout_handler(session: Session) -> impl IntoResponse {
    // Destruye la sesión en el servidor y limpia la cookie en el cliente
    session.delete().await;
    (StatusCode::OK, "Sesión cerrada correctamente")
}
```

### Gestión del Ciclo de Vida

Al utilizar sesiones, el ciclo de vida del estado es tu responsabilidad. Es crucial configurar políticas de expiración (por ejemplo, sesiones que expiran tras 30 minutos de inactividad) para evitar que el `MemoryStore` o tu base de datos agoten la memoria disponible (Out Of Memory) acumulando sesiones abandonadas. `tower_sessions` permite configurar una rutina de limpieza (`Expiry`) al inicializar el `SessionManagerLayer`.

## 18.3 Flujos de OAuth2 y OpenID Connect

A medida que las aplicaciones escalan, gestionar contraseñas locales se vuelve un riesgo de seguridad y una barrera de entrada para los usuarios. Delegar la autenticación y autorización a proveedores de identidad (IdP) como Google, GitHub o Auth0 es la práctica estándar de la industria. Para lograr esto, utilizamos dos protocolos estrechamente relacionados:

1. **OAuth 2.0:** Es un protocolo de *autorización*. Permite a tu aplicación acceder a recursos del usuario en otro servicio (como leer sus repositorios en GitHub) sin conocer su contraseña.
2. **OpenID Connect (OIDC):** Es una capa de *autenticación* construida sobre OAuth 2.0. Estandariza la forma en que el proveedor comunica la identidad del usuario a tu backend, típicamente devolviendo un JWT llamado `id_token`.

En Rust, el crate más maduro y seguro para manejar ambos estándares es `oauth2` (y su hermano `openidconnect` si necesitas validación estricta del estándar OIDC).

### Dependencias necesarias

Para este ejemplo, implementaremos el flujo más seguro y común para backends web: el **Authorization Code Flow**. Añadiremos el crate `oauth2` y `reqwest` (como cliente HTTP asíncrono para intercambiar los tokens) a nuestro `Cargo.toml`.

```toml
[dependencies]
oauth2 = "4.4"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1.0", features = ["full"] }
```

### 1. Configuración del Cliente OAuth2

El primer paso es registrar tu aplicación en el proveedor (por ejemplo, GitHub) para obtener un `client_id` y un `client_secret`. Con estos datos, configuramos nuestro cliente en Rust. Es altamente recomendable que esta configuración se inicialice una vez y se comparta en el estado de la aplicación (AppState).

```rust
use oauth2::{
    basic::BasicClient, AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl,
};

pub fn configurar_cliente_github(
    client_id: String,
    client_secret: String,
) -> BasicClient {
    let github_client_id = ClientId::new(client_id);
    let github_client_secret = ClientSecret::new(client_secret);
    
    // URLs de autorización y token proporcionadas por la documentación de GitHub
    let auth_url = AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
        .expect("URL de autorización inválida");
    let token_url = TokenUrl::new("https://github.com/login/oauth/access_token".to_string())
        .expect("URL de token inválida");

    BasicClient::new(
        github_client_id,
        Some(github_client_secret),
        auth_url,
        Some(token_url),
    )
    .set_redirect_uri(
        RedirectUrl::new("http://localhost:3000/auth/github/callback".to_string())
            .expect("URL de redirección inválida"),
    )
}
```

### 2. Generación de la URL de Autorización (Login)

Cuando el usuario hace clic en "Iniciar sesión con GitHub", nuestro backend no hace la petición directamente. En su lugar, genera una URL especial y redirige el navegador del usuario hacia el proveedor.

El crate `oauth2` nos obliga por diseño a generar un token de estado (`CsrfToken`). Esto es crucial para evitar ataques de Cross-Site Request Forgery (CSRF).

```rust
use axum::response::Redirect;
use oauth2::{CsrfToken, Scope};

// Asumimos que `client` se extrae del estado de la aplicación en Axum
async fn login_github_handler(client: axum::extract::State<BasicClient>) -> Redirect {
    // Generamos la URL y el token CSRF de estado
    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        // Solicitamos los permisos (scopes) que necesitamos
        .add_scope(Scope::new("read:user".to_string()))
        .add_scope(Scope::new("user:email".to_string()))
        .url();

    // NOTA DE SEGURIDAD: En un entorno real, debes guardar `csrf_token.secret()` 
    // en la sesión del usuario o en una cookie firmada para validarlo en el callback.

    // Redirigimos al usuario a la página de login de GitHub
    Redirect::to(auth_url.as_ref())
}
```

### 3. El Callback: Intercambio del Código por el Token

Si el usuario acepta dar permisos a tu aplicación, GitHub lo redirigirá de vuelta a tu `RedirectUrl` (el callback) adjuntando dos parámetros en la query: el `code` de autorización y el `state` (nuestro token CSRF).

Nuestro backend debe tomar ese `code` y hacer una petición HTTP de servidor a servidor (invisible para el usuario) para obtener el `access_token`.

```rust
use axum::{extract::Query, http::StatusCode, response::IntoResponse};
use oauth2::{reqwest::async_http_client, AuthorizationCode, TokenResponse};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct AuthRequest {
    code: String,
    state: String,
}

async fn github_callback_handler(
    client: axum::extract::State<BasicClient>,
    Query(params): Query<AuthRequest>,
) -> impl IntoResponse {
    // 1. Aquí deberías validar que `params.state` coincida con el CSRF token 
    // que guardaste en el handler de login.

    // 2. Intercambiamos el código por un token de acceso
    let code = AuthorizationCode::new(params.code);
    
    // Usamos el cliente HTTP asíncrono de reqwest integrado en el crate
    let token_result = client
        .exchange_code(code)
        .request_async(async_http_client)
        .await;

    match token_result {
        Ok(token) => {
            // ¡Éxito! Ahora tenemos el access_token.
            let access_token = token.access_token().secret();
            
            // Con este token, ya puedes hacer peticiones autenticadas a la API de GitHub
            // o crear una sesión local para este usuario en tu aplicación (vinculando 
            // este éxito con lo que vimos en la sección 18.2).
            
            (StatusCode::OK, format!("Login exitoso. Token: {}", access_token))
        }
        Err(_) => (StatusCode::UNAUTHORIZED, "Fallo al intercambiar el código".to_string()),
    }
}
```

> **Diferencia con OpenID Connect:** Si estuvieras configurando OIDC (como Google), el proveedor devolvería también un campo extra durante el intercambio del código: el `id_token`. Usando el crate `openidconnect` (construido sobre `oauth2`), Rust automáticamente validaría la firma criptográfica de ese `id_token` y te entregaría los Claims estructurados con el correo electrónico, nombre de perfil y foto del usuario.

### El flujo en arquitecturas desacopladas (Frontend SPA / Móvil)

Es importante notar que el flujo anterior asume que tu backend de Rust renderiza vistas o gestiona la redirección directa. Si tienes una SPA (React/Vue) separada, es común que el frontend se encargue de la redirección y envíe directamente el `code` a tu API en Rust para que el servidor haga el intercambio final, manteniendo el `client_secret` a salvo en el entorno del backend.

## 18.4 Control de Acceso Basado en Roles (RBAC) en endpoints

En las secciones anteriores resolvimos la **autenticación** (saber *quién* es el usuario, ya sea vía JWT, sesiones o OAuth2). Ahora debemos abordar la **autorización**: saber *qué* tiene permitido hacer ese usuario en nuestro sistema.

El Control de Acceso Basado en Roles (RBAC) es el patrón más extendido para gestionar permisos. En lugar de asignar permisos específicos a cada usuario, agrupamos los permisos en "Roles" (ej. Administrador, Moderador, Usuario Estándar) y asignamos estos roles a los usuarios.

Rust nos proporciona herramientas fantásticas para implementar RBAC de forma segura y elegante, aprovechando su sistema de tipos estricto y el patrón de Extractors de Axum.

### Modelando Roles con Enums (Seguridad en tiempo de compilación)

Una mala práctica común en otros lenguajes es usar cadenas de texto (Strings) para los roles (`"admin"`, `"user"`). Esto es propenso a errores tipográficos. En Rust, como vimos en el Capítulo 3, los `enum` son la herramienta perfecta para definir un conjunto cerrado y seguro de variantes.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Rol {
    Usuario,
    Moderador,
    Administrador,
}

// Representación de nuestro usuario autenticado (extraído de JWT o Sesión)
#[derive(Debug, Clone)]
pub struct UsuarioAutenticado {
    pub id: u64,
    pub username: String,
    pub rol: Rol,
}
```

### El patrón de Autorización mediante Extractors en Axum

La forma menos idiomática de proteger un endpoint sería verificar el rol dentro de cada función handler mediante un `if`. Esto rompe el principio DRY (Don't Repeat Yourself) y mezcla la lógica de negocio con la lógica de autorización.

La forma "Senior" en Axum es crear un **Extractor personalizado**. Si la petición no cumple con el rol requerido, el extractor la rechazará automáticamente devolviendo un error HTTP 403 Forbidden, y la petición nunca llegará a ejecutar el código de tu handler.

Para este ejemplo, asumiremos que un middleware previo (como el que decodifica el JWT de la sección 18.1) ya ha validado al usuario y lo ha inyectado en las "Extensiones" (Extensions) de la petición HTTP.

```rust
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};

// 1. Definimos un tipo "marcador" para nuestro extractor
pub struct RequiereAdmin(pub UsuarioAutenticado);

// 2. Implementamos la extracción y la lógica de autorización
#[async_trait]
impl<S> FromRequestParts<S> for RequiereAdmin
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Intentamos obtener el usuario de las extensiones de la request
        let usuario = parts
            .extensions
            .get::<UsuarioAutenticado>()
            .cloned()
            .ok_or((StatusCode::UNAUTHORIZED, "Debes iniciar sesión"))?;

        // Aplicamos la lógica de RBAC
        if usuario.rol == Rol::Administrador {
            Ok(RequiereAdmin(usuario))
        } else {
            Err((
                StatusCode::FORBIDDEN,
                "No tienes los permisos necesarios para realizar esta acción",
            ))
        }
    }
}
```

### Aplicando RBAC a nuestros Handlers

Con el extractor creado, la aplicación de permisos en nuestras rutas se vuelve declarativa, limpia y garantizada por el compilador de Rust.

```rust
use axum::{routing::{delete, get}, Router, Json};

// Handler público (no requiere autenticación)
async fn endpoint_publico() -> &'static str {
    "Cualquiera puede ver esto"
}

// Handler protegido (Requiere ser Administrador)
// Fíjate cómo inyectamos `RequiereAdmin` directamente en la firma.
async fn borrar_usuario(RequiereAdmin(admin): RequiereAdmin) -> String {
    // Si el código llega hasta aquí, Axum GARANTIZA que el usuario es Admin.
    format!("El administrador {} ha borrado un registro.", admin.username)
}

pub fn configurar_rutas() -> Router {
    Router::new()
        .route("/publico", get(endpoint_publico))
        .route("/admin/usuarios", delete(borrar_usuario))
        // Aquí añadirías tu middleware de autenticación global o por rutas
        // .layer(middleware_autenticacion)
}
```

### Escalando RBAC a ABAC (Attribute-Based Access Control)

A medida que el backend crece, el RBAC puro puede quedarse corto. Por ejemplo: *"Un usuario puede editar un artículo, pero solo si es el autor original"*. En este caso, el rol no basta; necesitas evaluar los atributos del recurso (ABAC).

Para resolver esto en Rust, es común pasar la responsabilidad a la capa de servicios o utilizar crates especializados como `oso` (un motor de autorización de políticas), pero el patrón de Extractors que acabamos de ver sigue siendo la primera línea de defensa para restringir el acceso a nivel de enrutamiento.
