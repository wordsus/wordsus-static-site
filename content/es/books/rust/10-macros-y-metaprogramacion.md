Rust permite escribir código que genera código, una capacidad conocida como metaprogramación. En el desarrollo backend, las macros son el motor que impulsa la eficiencia: desde la serialización de JSON con `serde` hasta la definición de rutas en frameworks web. A diferencia de las funciones, las macros operan sobre la sintaxis misma antes de que el programa se compile, permitiendo crear abstracciones poderosas sin penalizaciones en runtime. En este capítulo, exploraremos desde las macros declarativas (`macro_rules!`) hasta la sofisticación de las macros procedurales, herramientas clave para alcanzar un nivel senior y construir sistemas robustos, expresivos y altamente mantenibles.

## 10.1 Macros declarativas (`macro_rules!`)

Hasta este punto del libro, hemos utilizado la abstracción mediante funciones, traits y genéricos para evitar la duplicación de código. Sin embargo, hay escenarios donde estas herramientas se quedan cortas. Por ejemplo, las funciones en Rust no pueden aceptar un número variable de argumentos (variadic arguments) y no pueden operar sobre la estructura misma del código fuente. Aquí es donde entra la **metaprogramación**, y su herramienta más accesible en Rust: las macros declarativas.

A diferencia de las macros en C o C++ (que realizan un simple reemplazo de texto), las macros en Rust operan a nivel del Árbol de Sintaxis Abstracta (AST). Esto significa que el compilador entiende la estructura del código, haciéndolas mucho más seguras y evitando comportamientos inesperados.

### La anatomía de `macro_rules!`

Las macros declarativas se definen utilizando la construcción `macro_rules!`. Funcionan de manera muy similar a una expresión `match`, pero en lugar de evaluar valores en tiempo de ejecución, evalúan **patrones de sintaxis** en tiempo de compilación.

Veamos la estructura básica con una macro sencilla que simplifica la creación de un saludo:

```rust
macro_rules! saludar {
    // Brazo 1: Sin argumentos
    () => {
        println!("¡Hola, backend developer!");
    };
    // Brazo 2: Con una expresión
    ($nombre:expr) => {
        println!("¡Hola, {}!", $nombre);
    };
}

fn main() {
    saludar!(); // Coincide con el Brazo 1
    saludar!("Rustacean"); // Coincide con el Brazo 2
}
```

Cada "brazo" de la macro tiene dos partes:
1.  **El Matcher `(...)`**: Define el patrón sintáctico que la macro espera recibir.
2.  **El Transcriber `{...}`**: Define el código de Rust que se generará y reemplazará la llamada a la macro.

### Especificadores de fragmentos (Designators)

En el ejemplo anterior, `$nombre:expr` captura una expresión de Rust y la asigna a la metavariable `$nombre`. El sufijo `expr` se conoce como especificador de fragmento. 

Para escribir macros útiles, necesitas conocer los especificadores más comunes:

| Especificador | Qué captura | Ejemplo de uso válido |
| :--- | :--- | :--- |
| `expr` | Una expresión de Rust. | `2 + 2`, `"Hola"`, `mi_funcion()` |
| `ident` | Un identificador (nombre de variable o función). | `x`, `mi_variable`, `Procesador` |
| `ty` | Un tipo de dato. | `String`, `Vec<u8>`, `HashMap<K, V>` |
| `stmt` | Una sentencia (normalmente termina en `;`). | `let x = 5;` |
| `block` | Un bloque de código delimitado por `{}`. | `{ let y = 2; y + 1 }` |
| `tt` | Token Tree (Cualquier token individual o grupo). | Útil para macros muy genéricas o recursivas. |

### Repeticiones: Creando macros variádicas

El uso más poderoso de las macros declarativas en el desarrollo backend es la creación de interfaces que aceptan múltiples elementos. Ya conoces `vec![]`, la cual instancia un vector con "N" elementos. Vamos a construir nuestra propia versión para inicializar un `HashMap`, algo extremadamente útil al definir configuraciones o payloads estáticos.

Para manejar repeticiones, usamos la sintaxis `$( ... )sep rep`, donde `sep` es un separador opcional (como una coma) y `rep` es el operador de repetición (`*` para 0 o más, `+` para 1 o más, `?` para 0 o 1).

```rust
use std::collections::HashMap;

macro_rules! map {
    // Patrón: $( clave => valor ),* $(,)?
    // Explicación:
    // $( ... )* indica que el contenido se puede repetir 0 o más veces.
    // La `,` antes del asterisco indica que los elementos se separan por comas.
    // $(,)? al final permite una coma final opcional (trailing comma), muy idiomático en Rust.
    ( $( $k:expr => $v:expr ),* $(,)? ) => {
        {
            let mut temp_map = HashMap::new();
            // El bloque de repetición en el transcriber expande el código
            // por cada par capturado.
            $(
                temp_map.insert($k, $v);
            )*
            temp_map // Retornamos el mapa instanciado y poblado
        }
    };
}

fn main() {
    // Uso de nuestra macro variádica
    let headers = map! {
        "Content-Type" => "application/json",
        "Authorization" => "Bearer token123", // La coma final es soportada
    };

    assert_eq!(headers.len(), 2);
    assert_eq!(headers.get("Content-Type"), Some(&"application/json"));
}
```

Al compilar, Rust expandirá `map!` reemplazándolo exactamente por el bloque `{ let mut temp_map = HashMap::new(); ... temp_map }`. Al estar envuelto en un bloque, el mapa es inicializado, poblado y evaluado como una única expresión que se asigna a `headers`.

### Higiene y Limitaciones

Las macros declarativas en Rust son **parcialmente higiénicas**. Esto significa que las variables locales creadas dentro de la macro (como `temp_map` en nuestro ejemplo) no colisionarán con variables del mismo nombre en el código donde se invoca la macro.

Sin embargo, hay que tener cuidado con las variables que *pasas* a la macro. Además, abusar de `macro_rules!` puede hacer que tu código sea difícil de leer y mantener. 

> **Tip para Nivel Senior:** Si una macro declarativa crece a más de 50 líneas o requiere lógica condicional compleja de parsing, es una señal de advertencia. Ese es el momento exacto para migrar a una **Macro Procedural**, la cual te permite usar todo el poder de Rust para manipular el AST. Además, para depurar macros declarativas complejas, la herramienta externa `cargo-expand` es indispensable, ya que te permite ver el código exacto que tu macro está generando antes de la compilación.

## 10.2 Macros procedurales personalizadas

Si las macros declarativas (`macro_rules!`) que vimos en la sección anterior son como usar expresiones regulares avanzadas, las **macros procedurales** son como escribir un mini-compilador dentro de tu propio código. 

Mientras que las macros declarativas operan haciendo coincidir patrones de sintaxis, las macros procedurales son funciones reales de Rust que toman código fuente (un flujo de tokens o `TokenStream`), lo analizan, ejecutan lógica arbitraria en **tiempo de compilación** y devuelven un nuevo flujo de tokens que el compilador finalmente convertirá en código binario.

Esta es la magia detrás de herramientas que usas a diario en el backend, como el enrutamiento en Actix/Axum o la validación de consultas SQL en tiempo de compilación con SQLx.

### La "Santísima Trinidad" de las macros procedurales

Para escribir macros procedurales en Rust, casi siempre dependerás de tres herramientas fundamentales:

1.  **`proc_macro`**: Es parte de la biblioteca estándar de Rust y proporciona el tipo `TokenStream`, que representa el código fuente crudo de entrada y salida.
2.  **`syn`**: Un crate de terceros (prácticamente un estándar de la industria) que toma el `TokenStream` y lo "parsea" (analiza) convirtiéndolo en un Árbol de Sintaxis Abstracta (AST). Te permite entender si un token es un `struct`, una función, un identificador, etc.
3.  **`quote`**: El crate inverso a `syn`. Toma la estructura de datos que has manipulado en Rust y la vuelve a convertir en un `TokenStream` para entregárselo al compilador.

### Configuración del proyecto: Un crate separado

Una regla estricta en Rust es que **las macros procedurales deben vivir en su propio crate**, separado del código que las va a utilizar. Esto se debe a que el código de la macro debe compilarse y ejecutarse *antes* de que se pueda compilar el resto de tu proyecto.

Para crear una macro procedural, debes definir un crate de tipo biblioteca y añadir lo siguiente en su `Cargo.toml`:

```toml
[package]
name = "mis_macros"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true # ¡Esto es obligatorio!

[dependencies]
syn = { version = "2.0", features = ["full"] }
quote = "1.0"
```

### Tu primera macro procedural (Estilo Función)

Existen tres tipos de macros procedurales: tipo función, tipo derive (10.3) y tipo atributo (10.4). Empecemos por la más pura, la **macro de tipo función**, que se invoca de la misma manera que un `macro_rules!` (ej. `mi_macro!(...)`).

Imagina que estamos construyendo un ORM o un query builder y queremos una macro que valide en tiempo de compilación que una cadena SQL comienza con "SELECT". Si no es así, la compilación fallará.

En tu crate `mis_macros` (en `src/lib.rs`), escribirías:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitStr};

/// Macro que valida una consulta SQL básica en tiempo de compilación.
#[proc_macro]
pub fn sql_seguro(input: TokenStream) -> TokenStream {
    // 1. Parsear la entrada usando 'syn'. Esperamos un string literal ("...").
    let string_literal = parse_macro_input!(input as LitStr);
    let consulta = string_literal.value();

    // 2. Ejecutar lógica arbitraria de Rust (¡en tiempo de compilación!)
    let consulta_upper = consulta.to_uppercase();
    if !consulta_upper.starts_with("SELECT") {
        // Un panic aquí detiene la compilación y muestra este mensaje de error al desarrollador
        panic!("Error de compilación: La macro sql_seguro solo permite consultas SELECT. Recibido: {}", consulta);
    }

    // 3. Generar el código de salida usando 'quote'
    // Las variables de Rust se inyectan en quote! usando el prefijo '#'
    let output = quote! {
        {
            // Aquí podríamos retornar un struct pre-compilado, 
            // pero para el ejemplo solo imprimimos.
            println!("Ejecutando en runtime la consulta validada: {}", #consulta);
            #consulta
        }
    };

    // 4. Devolver el nuevo TokenStream al compilador
    output.into()
}
```

### Uso en el proyecto principal

Ahora, en tu aplicación backend principal, agregarías el crate `mis_macros` como dependencia y lo usarías así:

```rust
use mis_macros::sql_seguro;

fn main() {
    // Esto compilará perfectamente y ejecutará el código generado.
    let query_valida = sql_seguro!("SELECT * FROM usuarios WHERE activo = true");
    
    // Si descomentas la siguiente línea, ¡el código NO COMPILARÁ!
    // let query_invalida = sql_seguro!("DELETE FROM usuarios");
}
```

### El costo oculto: Tiempos de compilación

Es importante tener candidez técnica aquí: las macros procedurales son increíblemente poderosas, pero **tienen un costo**. 

Crates como `syn` son masivos porque deben entender toda la sintaxis de Rust. Añadir macros procedurales a tu proyecto aumentará significativamente el tiempo de compilación desde cero (cold build time). Como desarrollador Senior, debes evaluar si el beneficio de la ergonomía y la seguridad en tiempo de compilación supera la penalización en la experiencia de desarrollo local de tu equipo (tiempos de espera en el CI/CD y en las compilaciones locales).

## 10.3 Macros tipo Derive (`#[derive(...)]`)

Como desarrollador backend en Rust, es muy probable que utilices macros tipo Derive docenas de veces al día. Cada vez que anotas un struct con `#[derive(Debug, Clone, Serialize, Deserialize)]` para comunicarte mediante JSON o interactuar con una base de datos, estás invocando este tipo de macro procedural.

A diferencia de las macros tipo función que vimos en la sección anterior (las cuales reemplazan su propia invocación con código nuevo), las macros **Derive** tienen un propósito muy específico: **leer la definición de un `struct`, `enum` o `union` y generar código adicional de forma adjunta**, generalmente implementaciones de Traits (`impl MiTrait for MiStruct`).

### ¿Cómo funciona un Derive internamente?

Cuando el compilador encuentra un `#[derive(MiTrait)]`, le pasa el `TokenStream` que representa toda la estructura de datos a la macro procedural asociada. La macro analiza esa estructura (nombres de los campos, tipos, etc.) y devuelve un nuevo `TokenStream` que contiene *únicamente* el código generado. El compilador luego toma ese código generado y lo añade al código original.

Veamos cómo construir una macro Derive que automatice una tarea típica de backend: deducir el nombre de una tabla de base de datos a partir del nombre de un `struct` (una versión muy simplificada de lo que hace Diesel o SeaORM).

### Creando la macro `#[derive(TableName)]`

Continuando en nuestro crate de macros procedurales (`mis_macros`), debemos registrar la función usando el atributo `#[proc_macro_derive(...)]`.

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

/// Implementa automáticamente un método `table_name()` para el struct.
#[proc_macro_derive(TableName)]
pub fn table_name_derive(input: TokenStream) -> TokenStream {
    // 1. Parsear la entrada como una definición de tipo (DeriveInput)
    // Esto es diferente a LitStr; DeriveInput entiende structs y enums.
    let ast = parse_macro_input!(input as DeriveInput);

    // 2. Extraer el identificador (el nombre del struct)
    let nombre_struct = &ast.ident;

    // 3. Lógica de negocio: convertir "Usuario" a "usuarios"
    // (Lógica ingenua para el ejemplo: a minúsculas y añadir una 's')
    let nombre_tabla = format!("{}s", nombre_struct.to_string().to_lowercase());

    // 4. Generar el bloque `impl`
    // Usamos #nombre_struct para inyectar el tipo y #nombre_tabla para el string literal
    let expansion = quote! {
        impl #nombre_struct {
            pub fn table_name() -> &'static str {
                #nombre_tabla
            }
        }
    };

    // 5. Retornar el código generado
    expansion.into()
}
```

### Uso en el proyecto principal

En tu código de aplicación, el uso es extremadamente limpio y declarativo:

```rust
use mis_macros::TableName;

#[derive(TableName)]
struct Usuario {
    id: uuid::Uuid,
    email: String,
}

#[derive(TableName)]
struct Producto {
    id: i32,
    precio: f64,
}

fn main() {
    // La macro generó estos métodos automáticamente en tiempo de compilación
    assert_eq!(Usuario::table_name(), "usuarios");
    assert_eq!(Producto::table_name(), "productos");
}
```

### El poder de los atributos auxiliares (Helper Attributes)

Las macros Derive rara vez operan solas en escenarios del mundo real. Herramientas como Serde permiten anotaciones como `#[serde(rename = "email_address")]`. Estos se conocen como **atributos auxiliares**.

Cuando defines una macro Derive, puedes declarar qué atributos auxiliares permite:

```rust
// Al declarar la macro, indicamos que buscaremos atributos #[tabla(...)]
#[proc_macro_derive(TableName, attributes(tabla))]
pub fn table_name_derive(input: TokenStream) -> TokenStream {
    // ...
}
```

Dentro de la lógica de la macro usando `syn`, tendrías que iterar sobre `ast.attrs` (los atributos a nivel de struct) o `campo.attrs` (a nivel de cada campo) para buscar `#[tabla(nombre = "...")]`. Si el atributo existe, usas ese valor; si no, aplicas tu lógica por defecto (como en nuestro ejemplo anterior). Esta combinación es lo que da a Rust su característica ergonomía y seguridad en el tipado para frameworks web y ORMs.

> **Tip para Nivel Senior:** Cuando generes código con `quote!`, acostúmbrate a usar rutas absolutas para los tipos y traits de la Standard Library o de tu propio crate (ej. `::std::string::String` en lugar de `String`). Como no controlas en qué contexto se expandirá tu macro, el usuario podría no tener importado el módulo necesario, o peor aún, podría tener un conflicto de nombres.

## 10.4 Macros tipo atributo y función

Para cerrar nuestra inmersión en la metaprogramación, abordaremos las **macros tipo atributo**, las cuales son, sin lugar a duda, las responsables de que el ecosistema backend en Rust se sienta tan moderno y ergonómico. 

Aunque en la sección 10.2 ya vimos cómo crear macros procedurales tipo función (las que se invocan con `mi_macro!(...)`), las macros tipo atributo llevan este concepto un paso más allá. En lugar de ser llamadas explícitamente dentro de un bloque de código, se "adjuntan" a elementos existentes (funciones, structs, módulos completos) y tienen el poder de **reescribirlos o reemplazarlos por completo**.

Si has usado Actix-Web, Axum o Tokio, ya has interactuado íntimamente con ellas: `#[get("/usuarios")]`, `#[tokio::main]`, o `#[tracing::instrument]` son ejemplos perfectos.

### La anatomía de un atributo procedural

A diferencia de las macros Derive (que solo pueden añadir código nuevo sin modificar el struct original) y las macros tipo función (que toman un solo flujo de tokens), las macros de atributo reciben **dos** flujos de tokens (`TokenStream`):

1.  **Los argumentos del atributo (`attr`):** Lo que va dentro de los paréntesis del atributo. Por ejemplo, en `#[get("/api/v1/users")]`, el `attr` es `"/api/v1/users"`.
2.  **El elemento al que se adjunta (`item`):** El código fuente completo de la función, struct o módulo que está debajo del atributo.

Veamos cómo construir un enrutador simplificado que inyecta automáticamente logs de acceso en nuestras funciones controladoras.

### Construyendo `#[ruta(...)]`

En tu crate de macros (`mis_macros`), la definición tendría esta estructura:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitStr};

/// Macro de atributo que envuelve una función con logs de enrutamiento.
#[proc_macro_attribute]
pub fn ruta(attr: TokenStream, item: TokenStream) -> TokenStream {
    // 1. Parseamos el atributo (esperamos un string literal como "/usuarios")
    let path = parse_macro_input!(attr as LitStr);
    let ruta_str = path.value();

    // 2. Parseamos el elemento subyacente (esperamos que sea una función)
    let funcion_original = parse_macro_input!(item as ItemFn);

    // 3. Extraemos las partes de la función original
    let visibilidad = &funcion_original.vis; // ej: pub
    let firma = &funcion_original.sig;       // ej: fn obtener_usuarios() -> Response
    let bloque = &funcion_original.block;    // el cuerpo {} de la función

    // 4. Construimos la nueva función, inyectando nuestra lógica
    let expansion = quote! {
        #visibilidad #firma {
            // Lógica inyectada antes de la ejecución
            println!("--> [Router] Petición entrante en la ruta: {}", #ruta_str);
            
            // Ejecutamos el cuerpo de la función original
            #bloque
        }
    };

    // 5. Retornamos el código que REEMPLAZARÁ a la función original
    expansion.into()
}
```

### Uso en el proyecto principal

Cuando utilizamos nuestra nueva macro en el backend, el desarrollador obtiene una experiencia limpia y declarativa:

```rust
use mis_macros::ruta;

// El desarrollador solo escribe esto:
#[ruta("/api/v1/ping")]
pub fn health_check() -> &'static str {
    "Pong!"
}

fn main() {
    // Al llamar a la función, el log se ejecutará automáticamente
    // gracias a la inyección de código en tiempo de compilación.
    let respuesta = health_check();
    println!("Respuesta: {}", respuesta);
}
```

### El caso de estudio definitivo: `#[tokio::main]`

> **Tip para Nivel Senior:** Comprender cómo funciona `#[tokio::main]` es un rito de paso para un backend developer en Rust. 

Rust, por diseño en su Standard Library, no permite que la función `main` sea asíncrona (`async fn main()`). El punto de entrada de un programa compilado debe ser síncrono. Entonces, ¿cómo es que podemos escribir `async fn main()` cuando usamos Tokio?

La respuesta es que `#[tokio::main]` es una macro de atributo que **reescribe por completo tu función**. Cuando tú escribes esto:

```rust
#[tokio::main]
async fn main() {
    println!("Servidor iniciado");
}
```

La macro de Tokio captura ese `TokenStream`, elimina la palabra clave `async`, y genera algo equivalente a esto por debajo:

```rust
fn main() {
    // 1. Construye el runtime asíncrono
    let mut runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap();

    // 2. Ejecuta tu código asíncrono bloqueando el hilo principal
    runtime.block_on(async {
        println!("Servidor iniciado");
    })
}
```

Esta es la verdadera potencia de las macros procedurales: permiten crear Abstracciones de Cero Costo (Zero-Cost Abstractions) que transforman código declarativo de alto nivel en código imperativo y optimizado (boilerplate) sin que el desarrollador tenga que escribirlo ni mantenerlo manualmente.

Con esto concluimos el **Capítulo 10** y la **Parte II** del libro. Ya dominas los fundamentos, el sistema de tipos, el borrow checker y las abstracciones más poderosas de Rust. 
