Entrar en el desarrollo web con Rust exige un cambio de mentalidad: la seguridad que el compilador ofrece en la gestión de memoria se traslada aquí a la **frontera de la red**. Este capítulo sienta las bases para construir APIs robustas, explorando un ecosistema modular donde `tokio`, `hyper` y `tower` colaboran en armonía. Aprenderás a dominar `serde` para transformar datos con un rendimiento cercano al metal y a estructurar peticiones y respuestas mediante el sistema de tipos. Al finalizar, entenderás cómo el enrutamiento y la validación estricta convierten a Rust en una herramienta imbatible para servicios backend de alta criticidad.

## 15.1 El ecosistema web de Rust

Si vienes de lenguajes como Go o Node.js, es probable que estés acostumbrado a encontrar un servidor HTTP funcional directamente en la librería estándar. En Rust, la filosofía es diferente. Como vimos en el Capítulo 13, la Standard Library (`std`) te proporciona las primitivas de red a nivel de sistema operativo (TCP y UDP), pero se detiene ahí. No existe un módulo `std::http`. 

El ecosistema web de Rust está diseñado de forma **modular y descentralizada**. En lugar de frameworks monolíticos tipo "baterías incluidas" (como Django en Python o Ruby on Rails), Rust apuesta por componentes altamente especializados que se apilan unos sobre otros. Esta arquitectura en capas permite a los desarrolladores backend construir aplicaciones extremadamente rápidas, seguras y adaptadas a sus necesidades exactas.

### La arquitectura en capas del backend moderno

Para entender cómo funciona el ecosistema, es fundamental visualizar las capas sobre las que se construyen las aplicaciones web en Rust. Desde la base hasta la superficie de la API, el "stack" estándar moderno suele verse así:

1. **El Runtime Asíncrono (`tokio`):** Dado que las operaciones web son intensivas en I/O (Entrada/Salida), los servidores web en Rust son asíncronos. Tokio es el estándar de facto que gestiona los hilos y el polling de red bajo el capó (profundizaremos en su anatomía en el Capítulo 32).
2. **El Motor HTTP (`hyper`):** Es una implementación a bajo nivel de los protocolos HTTP/1 y HTTP/2. Es increíblemente rápido, seguro y correcto, pero rara vez interactuarás con él directamente a menos que estés construyendo tu propio framework o un proxy de altísimo rendimiento.
3. **La Capa de Abstracción (`tower`):** Este es quizás el componente más importante para un desarrollador senior. `tower` define un trait llamado `Service`, que estandariza cómo una solicitud (Request) se transforma en una respuesta (Response). Esto permite que el ecosistema comparta middlewares (timeouts, rate limiting, logging) sin importar el framework final que utilices.
4. **El Framework Web (Axum, Actix, etc.):** Es la capa superior que provee la ergonomía: enrutamiento (routing), extracción de parámetros, manejo de websockets y respuestas amigables.

### Los principales frameworks del ecosistema

A la hora de elegir un framework para producción, el ecosistema se ha consolidado en torno a unas pocas opciones muy maduras. En los próximos capítulos profundizaremos en los dos grandes titanes de la industria, pero es vital conocer el panorama general:

* **Actix-Web (Ver Capítulo 16):** Uno de los frameworks más antiguos y maduros del ecosistema. Inicialmente construido sobre un modelo de actores (de ahí su nombre), hoy en día es un framework de propósito general famoso por liderar consistentemente los benchmarks de rendimiento de *TechEmpower*.
* **Axum (Ver Capítulo 17):** Desarrollado por el mismo equipo detrás de Tokio e Hyper. Su mayor ventaja es su integración nativa y sin fricciones con `tower`, lo que te permite usar un vasto ecosistema de middlewares. Actualmente es la opción recomendada para la mayoría de los proyectos nuevos debido a su excelente ergonomía.
* **Rocket:** Famoso por tener la mejor "Developer Experience" (DX) y una sintaxis muy declarativa basada en macros. Históricamente tardó en adoptar el ecosistema asíncrono estándar, lo que le hizo perder algo de terreno en entornos empresariales frente a Actix y Axum, pero sigue siendo una opción fantástica por su facilidad de uso.
* **Warp:** Un framework basado en el concepto funcional de "filtros" que se componen entre sí. Es muy elegante, pero los mensajes de error del compilador pueden volverse crípticos a medida que la aplicación crece.

### ¿Por qué Rust para la web? La ventaja de la "Ergonomía Segura"

A pesar de ser un lenguaje de sistemas a bajo nivel, los frameworks web de Rust han logrado un nivel de abstracción donde la seguridad de tipos (Type Safety) se convierte en tu mejor herramienta de validación de negocio.

Considera este ejemplo conceptual de un "Handler" moderno (similar a lo que veremos en Axum o Actix). Gracias al sistema de tipos y al *Ownership* que estudiamos en la Parte I, el ecosistema nos permite escribir código declarativo:

```rust
// Ejemplo conceptual: La firma de la función dicta la validación
async fn crear_usuario(carga_util: Json<CrearUsuarioPayload>) -> impl IntoResponse {
    // Si el flujo de ejecución llega a esta línea, el ecosistema web 
    // y el compilador garantizan que:
    // 1. La request era un POST/PUT válido.
    // 2. El Content-Type era application/json.
    // 3. El cuerpo del mensaje se pudo leer completamente en memoria.
    // 4. El JSON coincide exactamente con la estructura de `CrearUsuarioPayload`.
    
    let usuario = carga_util.0; // Extraemos el struct validado
    
    // ... lógica de persistencia en base de datos ...
    
    (StatusCode::CREATED, "Usuario creado exitosamente")
}
```

En otros lenguajes, tendrías que escribir código imperativo para validar el Content-Type, parsear el JSON y manejar los errores si faltan campos. En el ecosistema web de Rust, **si compila y los tipos encajan, una categoría entera de errores en tiempo de ejecución simplemente desaparece**. Además, al no depender de un Recolector de Basura (Garbage Collector), los tiempos de respuesta (latencia) se mantienen predecibles y sin los temidos "picos" bajo carga pesada.

Con esta base arquitectónica en mente, estamos listos para entender cómo los datos viajan desde el mundo exterior hacia nuestras estructuras en Rust.

## 15.2 Serialización y deserialización con `serde` y `serde_json`

En el desarrollo de APIs RESTful modernas, JSON es la *lingua franca*. Para que nuestra aplicación web en Rust pueda comunicarse con el mundo exterior (frontend, aplicaciones móviles u otros microservicios), necesitamos traducir las representaciones de texto en formato JSON a nuestras rigurosas estructuras de datos en Rust, y viceversa. 

Aquí es donde entra **`serde`** (abreviatura de **SER**ializer y **DE**serializer), el estándar absoluto y de facto en el ecosistema de Rust.

### ¿Por qué `serde` es excepcional?

Si vienes de lenguajes como Java (con Jackson), C# (con Newtonsoft) o Go (con `encoding/json`), es probable que estés acostumbrado a que la serialización se base en la **reflexión en tiempo de ejecución** (runtime reflection). El programa analiza la estructura de los objetos mientras se está ejecutando para saber cómo convertirlos, lo cual tiene un costo penalizador en rendimiento y memoria.

Rust no tiene reflexión en tiempo de ejecución. En su lugar, `serde` utiliza el poderoso sistema de macros de Rust (`derive`) para generar **en tiempo de compilación** el código exacto y altamente optimizado necesario para procesar tus datos. Esto se traduce en un rendimiento vertiginoso y una seguridad absoluta: si un JSON no coincide con tu `Struct`, fallará explícita y controladamente.

### La separación entre el modelo y el formato

Un concepto arquitectónico clave de `serde` es que es agnóstico al formato. 

* **`serde`**: Proporciona los *Traits* (`Serialize` y `Deserialize`) y el modelo de datos interno.
* **`serde_json`**: Es la implementación específica para leer y escribir JSON. 

Esta separación significa que puedes usar las mismas estructuras exactas para hablar JSON con un cliente web (`serde_json`), comunicarte internamente con MessagePack (`rmp-serde`) o leer archivos de configuración YAML (`serde_yaml`), sin tocar la lógica de tu dominio.

### Implementación básica en un Backend

Para habilitar la magia de `serde`, generalmente solo necesitas añadir una macro `#[derive]` a tus structs. Veamos un ejemplo clásico de un flujo de creación de usuario:

```rust
use serde::{Serialize, Deserialize};

// #[derive] le dice al compilador que genere el código de (de)serialización.
#[derive(Serialize, Deserialize, Debug)]
pub struct Usuario {
    pub id: u64,
    pub nombre: String,
    pub email: String,
}

fn main() -> Result<(), serde_json::Error> {
    // 1. Deserialización (De JSON String a Struct de Rust)
    let json_request = r#"
        {
            "id": 101,
            "nombre": "Ada Lovelace",
            "email": "ada@example.com"
        }
    "#;

    let usuario: Usuario = serde_json::from_str(json_request)?;
    println!("Usuario parseado: {:?}", usuario);

    // 2. Serialización (De Struct de Rust a JSON String)
    let json_response = serde_json::to_string(&usuario)?;
    println!("Respuesta JSON: {}", json_response);

    Ok(())
}
```

### Atributos Avanzados de Serde para APIs de Producción

En un entorno real, las APIs rara vez son perfectas. Los clientes frontend suelen usar convenciones diferentes (como `camelCase` en JavaScript), mientras que Rust exige `snake_case`. A veces los campos son opcionales, o cambian de nombre por motivos de retrocompatibilidad.

`serde` provee una familia de atributos de campo que te permiten manipular la representación sin alterar el código de tu aplicación. Estas son las herramientas que usarás a diario como desarrollador senior:

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
// Obliga a que todos los campos se mapeen desde/hacia camelCase automáticamente
#[serde(rename_all = "camelCase")] 
pub struct PerfilUsuario {
    pub id_usuario: String, // En JSON será "idUsuario"
    
    // Si el JSON no incluye "nivel", Rust usará el valor por defecto del tipo (ej. 0 para enteros)
    #[serde(default)] 
    pub nivel: u32,

    // Cambia el nombre de un campo específico en el JSON exterior
    #[serde(rename = "tipo_suscripcion")] 
    pub plan: String,

    // Si el valor es `None`, directamente omite la llave en el JSON resultante,
    // ahorrando ancho de banda en lugar de enviar "telefono": null
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telefono: Option<String>,
    
    // Ignora este campo por completo al serializar y deserializar (útil para campos internos)
    #[serde(skip)]
    pub cache_interno: String,
}
```

### Trabajando con JSON sin esquema (`serde_json::Value`)

Aunque la práctica recomendada es tener un tipado fuerte mediante Structs, a veces interactuarás con APIs de terceros (como webhooks de Stripe o pasarelas de pago) donde el payload JSON es dinámico o no conoces la estructura exacta de antemano.

Para estos casos de escape, `serde_json` expone el enum `Value`, que puede representar cualquier documento JSON válido:

```rust
use serde_json::{Value, json};

fn procesar_webhook_dinamico(payload_crudo: &str) -> Result<(), serde_json::Error> {
    // Parseamos a un árbol JSON genérico
    let datos: Value = serde_json::from_str(payload_crudo)?;

    // Podemos navegar el árbol usando indexación directa
    if let Some(tipo_evento) = datos["evento"]["tipo"].as_str() {
        println!("Recibido evento de tipo: {}", tipo_evento);
    }

    Ok(())
}

fn crear_json_dinamico() -> Value {
    // La macro json! permite construir payloads dinámicos con una sintaxis similar a JavaScript
    json!({
        "status": "success",
        "timestamp": 1678886400,
        "tags": ["backend", "rust", "api"]
    })
}
```

Como veremos en las siguientes secciones, los frameworks web modernos de Rust utilizan `serde` de manera transparente bajo el capó. Cuando declares que una ruta espera un JSON, el framework llamará a `serde_json::from_slice` o `from_str`, manejará los errores de parseo por ti, y te entregará el `Struct` ya validado, listo para aplicar la lógica de negocio.

## 15.3 Estructuración de requests y responses HTTP

Ahora que entendemos la arquitectura general del ecosistema y cómo traducir datos con `serde`, debemos abordar el protocolo que une todo: HTTP. 

En lenguajes dinámicos, una petición HTTP suele representarse como un gran diccionario o un objeto mutable donde puedes inyectar o leer propiedades arbitrarias. Rust, fiel a su enfoque en la seguridad y el rendimiento, maneja esto de una manera mucho más estructurada y estricta a través del crate fundamental **`http`**.

### El crate `http`: El vocabulario universal

En el ecosistema Rust, el crate `http` proporciona un conjunto de tipos base (`Request`, `Response`, `Method`, `StatusCode`, `HeaderMap`, etc.) que actúan como el vocabulario universal. Frameworks como Axum, Actix, o clientes como Reqwest, utilizan estos mismos tipos bajo el capó. 

Lo crucial de entender sobre el crate `http` es que **no realiza ninguna operación de red**. Simplemente define las estructuras de datos. Esto permite que el ecosistema comparta librerías (middlewares, validadores) sin importar qué framework de red estés usando finalmente.

### La anatomía de una Petición (`Request<T>`)

Una petición HTTP en Rust se modela como un `Struct` genérico. El tipo genérico `T` representa el cuerpo (body) de la petición, el cual puede ser cualquier cosa: un flujo de bytes en crudo, una cadena de texto, o un tipo ya parseado por `serde`.

Veamos cómo se construye explícitamente una petición para entender sus partes:

```rust
use http::{Request, Method, Version};

// Construcción manual de una petición (útil para testing o clientes HTTP)
let request = Request::builder()
    .method(Method::POST)
    .uri("https://api.midominio.com/v1/usuarios")
    .version(Version::HTTP_11)
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token_super_seguro")
    // El cuerpo determina el tipo T del Request<T>. Aquí T es &str
    .body(r#"{"nombre": "Rustacean"}"#) 
    .unwrap();

// Podemos inspeccionar las partes de forma segura
assert_eq!(request.method(), Method::POST);
assert_eq!(request.headers().get("Content-Type").unwrap(), "application/json");
```

### De HTTP a Rust: El patrón de Extractores

En un servidor web real, tú no construyes el `Request`; el framework lo recibe de la red y te lo entrega. Sin embargo, trabajar directamente con `Request<Body>` a bajo nivel para sacar cabeceras o parsear JSON es tedioso. 

Aquí es donde los frameworks web de Rust brillan utilizando un patrón llamado **Extractores**. Un extractor es un tipo que sabe cómo tomar una pieza específica de información de la petición HTTP y convertirla en un tipo de Rust seguro.

Conceptualmente, así es como tu código de negocio interactúa con la estructura HTTP entrante:

```rust
// Ejemplo conceptual de Handlers en frameworks modernos (Axum/Actix)

// 1. Extracción de Query Parameters de la URI (?limite=10&pagina=2)
async fn listar_usuarios(Query(paginacion): Query<PaginacionParams>) { ... }

// 2. Extracción de Headers
async fn ruta_protegida(Header(auth): Header<Authorization>) { ... }

// 3. Extracción del Body (Requiere que el Header Content-Type sea correcto)
async fn crear_usuario(Json(usuario): Json<UsuarioPayload>) { ... }
```

El framework analiza la firma de tu función. Si pides un `Json<UsuarioPayload>`, el framework inspecciona el `Request` subyacente, verifica los headers, lee el body genérico de bytes, usa `serde_json` para deserializarlo, y solo si todo es correcto, ejecuta tu función. ¡Seguridad de tipos aplicada a las peticiones HTTP!

### La anatomía de una Respuesta (`Response<T>`)

De manera análoga, una respuesta HTTP se compone de un código de estado, cabeceras y un cuerpo. 

```rust
use http::{Response, StatusCode};

// Construcción de una respuesta de error personalizada
let response = Response::builder()
    .status(StatusCode::BAD_REQUEST)
    .header("X-Error-Code", "ERR_042")
    .body("El formato del correo electrónico no es válido")
    .unwrap();
```

### De Rust a HTTP: El trait `IntoResponse`

Escribir el `Response::builder()` manualmente para cada endpoint sería agotador. Por ello, el ecosistema utiliza un trait (comúnmente llamado `IntoResponse` o similar dependiendo del framework) que define cómo un tipo de Rust debe transformarse en un `http::Response`.

Esto te permite devolver desde tus funciones cosas que tienen sentido para tu dominio de negocio, y dejar que el framework se encargue de ensamblar el HTTP puro:

```rust
// Podemos devolver tuplas que implementan IntoResponse automáticamente.
// El framework sabe que el primer elemento es el StatusCode y el segundo el Body.
async fn crear_recurso() -> (StatusCode, Json<RespuestaExito>) {
    let respuesta = RespuestaExito { id: 123, mensaje: "Creado".into() };
    
    // El framework ensamblará un HTTP 201 Created con el Content-Type application/json
    (StatusCode::CREATED, Json(respuesta))
}

// O podemos devolver un Result. Si hay error, el framework llamará al 
// IntoResponse del error para generar un HTTP 400 o 500 según corresponda.
async fn buscar_recurso(id: u32) -> Result<Json<Recurso>, MiErrorPersonalizado> {
    // ... lógica que puede fallar ...
}
```

Esta separación entre la definición estricta de HTTP (el crate `http`) y la ergonomía de los frameworks (Extractores e `IntoResponse`) es lo que te permite mantener el código de tus controladores web limpio, declarativo y totalmente enfocado en la lógica de negocio, delegando la fontanería HTTP al sistema de tipos de Rust.

## 15.4 Manejo avanzado de rutas y queries

Hasta ahora hemos visto cómo estructurar peticiones y respuestas, y cómo `serde` nos ayuda a traducir el cuerpo (body) de los mensajes. Sin embargo, en una API RESTful madura, gran parte de la información crucial no viaja en el cuerpo de la petición, sino en la propia URL. 

El enrutamiento (routing) en Rust va mucho más allá de la simple coincidencia de cadenas de texto (string matching). En el ecosistema moderno, el enrutador actúa como una barrera de validación estricta: si la URL no cumple con los tipos de datos esperados, la petición es rechazada con un error HTTP 400 antes de que siquiera alcance tu lógica de negocio.

### 1. Parámetros de Ruta (Path Parameters) dinámicos y seguros

En APIs REST, es común identificar recursos anidados mediante la URL, por ejemplo: `GET /api/v1/usuarios/123/ordenes/456`.

En lenguajes dinámicos, extraerías estas variables como cadenas de texto ("123" y "456") y luego intentarías convertirlas a enteros, manejando los errores manualmente. En Rust, utilizamos el extractor de `Path` combinado con `serde` para garantizar que nuestro "Handler" solo se ejecute si los parámetros son del tipo correcto (por ejemplo, UUIDs o enteros sin signo).

```rust
use serde::Deserialize;
// Nota: La sintaxis exacta varía ligeramente entre Axum y Actix, 
// pero el concepto subyacente de usar un Struct es idéntico.

#[derive(Deserialize)]
pub struct IdentificadoresRuta {
    pub usuario_id: u32,
    pub orden_id: String, // Podría ser un tipo uuid::Uuid en un caso real
}

// El framework inyectará los valores de la URL directamente en nuestra estructura
async fn obtener_orden_usuario(
    Path(params): Path<IdentificadoresRuta>,
) -> impl IntoResponse {
    // Aquí tenemos la garantía absoluta de que params.usuario_id es un u32 válido
    let mensaje = format!(
        "Buscando la orden {} para el usuario {}", 
        params.orden_id, params.usuario_id
    );
    
    (StatusCode::OK, mensaje)
}
```

### 2. Manejo de Query Strings complejos

Los parámetros de consulta (Query Strings) que aparecen después del signo de interrogación en la URL (`?filtro=activo&limite=10`) son notoriamente difíciles de manejar debido a su naturaleza opcional y la falta de un estándar universal para representar listas o tipos anidados.

De nuevo, delegamos este problema a `serde` mediante el extractor `Query`. Como desarrollador senior, debes aprovechar los tipos `Option<T>` y `Vec<T>` para modelar filtros de búsqueda robustos:

```rust
#[derive(Deserialize, Debug)]
pub struct FiltrosBusqueda {
    // Si el cliente no envía este parámetro, Rust lo evalúa como None
    pub estado: Option<String>,
    
    // Podemos proveer valores por defecto si la clave no existe
    #[serde(default = "default_limite")]
    pub limite: u32,
    
    // Manejo de múltiples valores (ej. ?etiquetas=rust&etiquetas=backend)
    #[serde(default)]
    pub etiquetas: Vec<String>,
}

fn default_limite() -> u32 { 10 }

async fn buscar_productos(
    Query(filtros): Query<FiltrosBusqueda>,
) -> impl IntoResponse {
    // La estructura `filtros` ya está validada y tipada
    println!("Filtros aplicados: {:?}", filtros);
    // ... lógica de búsqueda en la base de datos ...
    StatusCode::OK
}
```

*Nota arquitectónica:* El formato estándar de codificación de URLs (`application/x-www-form-urlencoded`) tiene limitaciones para representar estructuras muy anidadas. Si necesitas enviar JSON complejo dentro de un Query String (una práctica común en algunas integraciones de frontend), el ecosistema ofrece crates especializados como `serde_qs` que se integran perfectamente con los frameworks web.

### 3. Composición y Modularización de Rutas (Scopes/Routers)

Un archivo con 100 definiciones de rutas planas es una pesadilla de mantenimiento. Todos los frameworks de Rust de nivel de producción ofrecen mecanismos para componer rutas. Esto se logra creando "Enrutadores" (Routers) más pequeños que luego se anidan (nest) dentro del enrutador principal.

Esta composición no solo agrupa prefijos de URL, sino que permite aplicar "Middlewares" (interceptores) de manera selectiva. Por ejemplo, podrías querer que todas las rutas bajo `/api/admin` requieran autenticación, mientras que `/api/public` no.

```rust
// Ejemplo conceptual de composición de rutas (estilo Axum)

fn rutas_usuarios() -> Router {
    Router::new()
        .route("/", get(listar_usuarios).post(crear_usuario))
        .route("/:usuario_id", get(obtener_usuario))
}

fn rutas_admin() -> Router {
    Router::new()
        .route("/dashboard", get(dashboard_admin))
        // Aquí aplicaríamos un middleware exclusivo para el scope de admin
        // .route_layer(middleware::from_fn(verificar_rol_admin))
}

pub fn app_router() -> Router {
    Router::new()
        // Prefijamos todas las rutas de usuarios con /api/v1/usuarios
        .nest("/api/v1/usuarios", rutas_usuarios())
        // Prefijamos todas las rutas de admin con /admin
        .nest("/admin", rutas_admin())
        // Manejador por defecto (Fallback) para rutas no encontradas (404)
        .fallback(manejador_404)
}

async fn manejador_404() -> (StatusCode, &'static str) {
    (StatusCode::NOT_FOUND, "La ruta solicitada no existe en esta API.")
}
```

### 4. El orden de evaluación y conflictos de rutas

A medida que tu API crece, es posible que definas rutas que parezcan superponerse, como `/recursos/:id` y `/recursos/recientes`.

En lenguajes como Node.js (con Express), el orden en el que declaras las rutas importa enormemente, ya que el framework evalúa de arriba hacia abajo. En Rust, frameworks modernos como **Axum** utilizan árboles radix (Radix Trees) increíblemente rápidos bajo el capó. Estos árboles son capaces de resolver superposiciones de forma inteligente, priorizando siempre las rutas estáticas exactas (`/recursos/recientes`) sobre las dinámicas con parámetros (`/recursos/:id`), independientemente del orden en que las hayas escrito en el código. Esto elimina una clase entera de bugs sutiles de enrutamiento.

Con esto concluimos el Capítulo 15. Ahora tienes una comprensión sólida de la arquitectura subyacente, cómo viajan los datos y cómo el tipado estricto protege la frontera (edge) de tu aplicación. 
