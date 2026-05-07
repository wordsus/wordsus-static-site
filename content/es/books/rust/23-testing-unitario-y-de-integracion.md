En Rust, el testing no es una tarea secundaria, sino una extensión natural de la seguridad que ofrece el compilador. Este capítulo explora el framework nativo que hace de la fiabilidad una garantía de diseño. Aprenderás a utilizar `#[test]` para validar lógica interna y a estructurar el directorio `tests/` para pruebas de integración de caja negra que simulen el comportamiento real de tu API. Dominarás el uso de aserciones avanzadas y patrones RAII mediante el trait `Drop` para gestionar el setup y teardown de forma infalible. En un entorno backend de alto rendimiento, entender cómo Rust paraleliza estas pruebas es la clave para mantener una suite veloz, aislada y libre de efectos secundarios.

## 23.1 El framework de pruebas integrado (`#[test]`)

A lo largo de las Partes I y II de este libro, hemos visto cómo el estricto sistema de tipos de Rust y el *Borrow Checker* eliminan categorías enteras de errores en tiempo de compilación. Sin embargo, el compilador no entiende de reglas de negocio. No sabe si un descuento del 20% se aplicó correctamente al carrito de compras, o si la validación de un payload de entrada fue la adecuada. Para verificar la lógica de nuestra aplicación, necesitamos pruebas automatizadas.

A diferencia de otros lenguajes donde necesitas instalar librerías de terceros (como Jest en JavaScript, pytest en Python o JUnit en Java), Rust incluye un framework de pruebas robusto y sin dependencias directamente en su Standard Library y en el ecosistema de Cargo.

### La anatomía de un test en Rust

En su forma más básica, una prueba en Rust no es más que una función regular anotada con el atributo `#[test]`. Este atributo le indica al compilador que la función debe tratarse como un caso de prueba y solo debe ser ejecutada cuando corremos el comando `cargo test`.

El mecanismo subyacente de una prueba en Rust es muy simple: **si la función finaliza su ejecución sin entrar en pánico (ver Capítulo 5.1), la prueba pasa. Si la función invoca la macro `panic!`, la prueba falla.**

Veamos un ejemplo aplicado a una función de utilidad típica en un backend, como la validación de la edad de un usuario:

```rust
pub fn es_mayor_de_edad(edad: u8) -> bool {
    edad >= 18
}

#[test]
fn prueba_es_mayor_de_edad_valido() {
    // assert! invoca un panic! si la condición es falsa
    assert!(es_mayor_de_edad(21));
}

#[test]
fn prueba_es_mayor_de_edad_invalido() {
    // assert_eq! evalúa que ambos lados sean iguales
    assert_eq!(es_mayor_de_edad(16), false);
}
```

En este ejemplo utilizamos las macros de aserción básicas de la Standard Library: `assert!` (que verifica un valor booleano) y `assert_eq!` (que verifica igualdad). En la siguiente sección (23.2) profundizaremos en aserciones más complejas y de igualdad estructurada.

### El módulo de pruebas y `#[cfg(test)]`

Es una convención y una buena práctica en Rust escribir las **pruebas unitarias** en el mismo archivo donde reside el código de producción que están evaluando. Esto permite probar funciones privadas o internas de un módulo que no están expuestas (es decir, que no tienen la palabra clave `pub`).

Para evitar que el código de las pruebas y sus dependencias se compilen en el binario final de producción y aumenten su tamaño innecesariamente, agrupamos nuestras funciones de prueba dentro de un módulo dedicado, usualmente llamado `tests`, y lo anotamos con `#[cfg(test)]`.

```rust
// Código de producción
fn calcular_impuesto(monto: f64) -> f64 {
    monto * 0.21
}

// Módulo exclusivo para pruebas
#[cfg(test)]
mod tests {
    // Importamos todo lo del módulo padre (el código de producción)
    use super::*;

    #[test]
    fn impuesto_calculado_correctamente() {
        let resultado = calcular_impuesto(100.0);
        assert_eq!(resultado, 21.0);
    }
}
```

La anotación `#[cfg(test)]` le dice a Rust: *"Compila e incluye este módulo únicamente cuando se ejecute el comando `cargo test`, ignóralo por completo al usar `cargo build` o `cargo run`"*. La directiva `use super::*;` es idiomática y necesaria para traer al ámbito del submódulo `tests` las funciones del módulo principal que queremos evaluar.

### Pruebas que retornan `Result<T, E>`

Como desarrolladores backend, gran parte de nuestro código interactúa con operaciones que pueden fallar, devolviendo el enum `Result<T, E>` (visto en el Capítulo 5.2). Rust permite que las funciones anotadas con `#[test]` retornen un `Result<(), Error>` en lugar de usar `assert!` y entrar en pánico.

Esto es extremadamente útil porque nos permite aprovechar el operador `?` dentro de nuestras pruebas, haciendo el código mucho más limpio:

```rust
use std::num::ParseIntError;

fn parsear_id_usuario(id_str: &str) -> Result<i32, ParseIntError> {
    id_str.parse::<i32>()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parseo_exitoso() -> Result<(), ParseIntError> {
        // Si parsear_id_usuario falla, el operador ? propagará el error, 
        // la función de prueba retornará Err(..) y el test fallará automáticamente.
        let id = parsear_id_usuario("42")?;
        
        assert_eq!(id, 42);
        
        // Retornamos Ok(()) para indicar que la prueba pasó
        Ok(())
    }
}
```

Usar `Result` en los tests te ahorra tener que hacer *unwrap* (`.unwrap()`) constantemente en operaciones que pueden fallar, alineando la escritura de tus pruebas unitarias con el manejo de errores idiomático que aplicas en el resto de tu arquitectura backend.

## 23.2 Asserts personalizados e igualdades estructuradas

En la sección anterior vimos cómo las macros `assert!` y `assert_eq!` nos permiten validar aserciones simples. Sin embargo, en el desarrollo de un backend real rara vez nos limitamos a comparar enteros o booleanos. Lo más común es que necesitemos validar respuestas HTTP completas, *payloads* extraídos de una base de datos o entidades de dominio complejas. 

Para manejar estos escenarios con la rigurosidad que exige Rust, debemos entender cómo el framework de pruebas interactúa con el sistema de tipos y cómo podemos enriquecer la información que obtenemos cuando una prueba falla.

### El requisito fundamental: `PartialEq` y `Debug`

Cuando utilizas la macro `assert_eq!(izquierda, derecha)`, el compilador de Rust impone dos restricciones basadas en *Traits* (conceptos que exploramos a fondo en el Capítulo 7):

1.  Ambos valores deben implementar el trait `PartialEq` para poder ser comparados entre sí.
2.  Ambos valores deben implementar el trait `Debug` para que, en caso de que la aserción falle, Rust pueda imprimir por consola los valores exactos que causaron el error.

En structs y enums definidos por el usuario, la forma más rápida y común de satisfacer estos requisitos es utilizando la macro `#[derive]`.

```rust
// Código de producción
#[derive(Debug, PartialEq)]
pub struct PerfilUsuario {
    pub id: uuid::Uuid,
    pub username: String,
    pub rol: RolDeAcceso,
}

#[derive(Debug, PartialEq)]
pub enum RolDeAcceso {
    Admin,
    UsuarioEstandar,
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn creacion_de_perfil_por_defecto() {
        let id_esperado = Uuid::new_v4();
        
        let perfil_generado = PerfilUsuario {
            id: id_esperado,
            username: String::from("nuevo_dev"),
            rol: RolDeAcceso::UsuarioEstandar,
        };

        let perfil_esperado = PerfilUsuario {
            id: id_esperado,
            username: String::from("nuevo_dev"),
            rol: RolDeAcceso::UsuarioEstandar,
        };

        // Gracias a #[derive(Debug, PartialEq)], esta aserción compila y 
        // compara campo por campo.
        assert_eq!(perfil_generado, perfil_esperado);
    }
}
```

Si omites el `#[derive(PartialEq, Debug)]`, el compilador rechazará el `assert_eq!` indicando que no sabe cómo comparar ambas estructuras ni cómo formatearlas para mostrarlas en un posible mensaje de error.

### Mensajes de error contextuales

Cuando una prueba compleja falla, un simple `assertion failed: izquierda == derecha` puede no ser suficiente para diagnosticar el problema rápidamente, especialmente si la prueba se ejecuta en un pipeline de CI/CD. 

Todas las macros de aserción en Rust (`assert!`, `assert_eq!`, `assert_ne!`) aceptan argumentos adicionales que funcionan exactamente igual que `format!` o `println!`. Esto te permite inyectar contexto crítico en el fallo.

```rust
#[test]
fn validacion_de_limite_de_tasa() {
    let peticiones_actuales = 150;
    let limite_maximo = 100;

    assert!(
        peticiones_actuales <= limite_maximo,
        "Alerta de Rate Limiting: Se esperaban máximo {} peticiones, pero se registraron {}",
        limite_maximo,
        peticiones_actuales
    );
}
```

### Validando Errores y Variantes con `matches!`

En el desarrollo backend, verificar que tu código **falle** cuando debe hacerlo es tan importante como el camino feliz (*happy path*). Si tienes una función que retorna un `Result<T, MiErrorPersonalizado>`, a menudo querrás asegurar no solo que falló, sino que falló con la variante exacta de error esperada.

Aunque podrías implementar `PartialEq` para tus errores, la forma más idiomática y potente en Rust es utilizar la macro estándar `matches!`. Esta macro devuelve un booleano si un valor coincide con un patrón específico, lo que la hace perfecta para combinarla con `assert!`.

```rust
#[derive(Debug)]
pub enum ErrorDeAutenticacion {
    TokenExpirado,
    FirmaInvalida,
    UsuarioRevocado(uuid::Uuid),
}

fn validar_token(token: &str) -> Result<(), ErrorDeAutenticacion> {
    // Lógica simulada que devuelve un error específico
    Err(ErrorDeAutenticacion::TokenExpirado)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rechaza_tokens_vencidos() {
        let resultado = validar_token("eyJhbGciOi...");

        // Verificamos que el resultado es exactamente un Err con la variante TokenExpirado
        assert!(
            matches!(resultado, Err(ErrorDeAutenticacion::TokenExpirado)),
            "El token debía ser rechazado por expiración, pero el resultado fue: {:?}",
            resultado
        );
    }
}
```

### El estándar de la industria para estructuras gigantes: `pretty_assertions`

A nivel Senior, cuando construyes APIs que devuelven JSONs masivos o estructuras de base de datos con decenas de campos, el output nativo del `assert_eq!` estándar se vuelve muy difícil de leer (se imprime en una sola línea o en un bloque gigante de texto).

Una práctica casi obligatoria en el ecosistema es utilizar el *crate* `pretty_assertions`. Al agregarlo como dependencia de desarrollo (`[dev-dependencies]`), reemplaza tu `assert_eq!` con una versión que imprime un *diff* visual con colores en la terminal (similar a lo que hace `git diff`), resaltando exactamente qué línea y qué campo de la estructura falló la comparación. Esto reduce drásticamente el tiempo de depuración en pruebas de integración complejas.

## 23.3 Directorio `tests/` para pruebas de integración de caja negra

Hasta ahora hemos escrito pruebas unitarias que residen en los mismos archivos que el código de producción (dentro de `src/`). Estas pruebas son de **caja blanca**: tienen acceso a funciones privadas e internas del módulo, lo que las hace ideales para aislar y validar la lógica pura.

Sin embargo, a nivel de backend, no basta con saber que una función individual opera correctamente. Necesitamos asegurar que los distintos componentes de nuestra arquitectura (enrutadores, controladores, servicios y serializadores) se integran y funcionan en conjunto tal como lo espera el consumidor de nuestra API. Para esto, Rust proporciona soporte nativo para **pruebas de integración de caja negra** mediante el directorio `tests/`.

### El concepto de "Caja Negra" en Rust

En Rust, las pruebas de integración son completamente externas a tu librería o binario. Solo pueden importar y utilizar los elementos que tu aplicación expone públicamente (aquellos marcados con `pub`). Es decir, consumen tu código exactamente de la misma manera en que lo haría otro desarrollador o un cliente externo.

Para que Cargo reconozca estas pruebas, debes crear un directorio llamado `tests` en la raíz de tu proyecto, al mismo nivel que `src` y `Cargo.toml`.

La estructura típica se ve así:

```text
mi_backend_rust/
├── Cargo.toml
├── src/
│   ├── main.rs
│   └── auth.rs
└── tests/
    └── integracion_auth.rs
```

### Escribiendo tu primera prueba de integración

Cada archivo `.rs` dentro del directorio `tests/` es compilado por Cargo como un *crate* (paquete) independiente. Esto significa que no necesitas usar la anotación `#[cfg(test)]` para aislar el código; todo lo que está en este directorio se ignora en las compilaciones de producción de forma automática.

Veamos cómo se vería el contenido de `tests/integracion_auth.rs`:

```rust
// Importamos nuestro crate como si fuéramos un consumidor externo.
// Nota: El nombre del crate se define en tu Cargo.toml. 
// Asumiremos que se llama `mi_backend_rust`.
use mi_backend_rust::auth::{generar_token, validar_token};

#[test]
fn flujo_completo_de_autenticacion() {
    // 1. Setup: Preparamos los datos
    let id_usuario = 1024;

    // 2. Ejecución: Llamamos a nuestra API pública
    let token = generar_token(id_usuario).expect("Fallo al generar el token");
    
    // 3. Validación: Comprobamos la integración entre generar y validar
    let resultado_validacion = validar_token(&token);
    
    assert!(
        resultado_validacion.is_ok(),
        "El token generado internamente debería ser válido"
    );
    
    assert_eq!(resultado_validacion.unwrap(), id_usuario);
}
```

Al ejecutar `cargo test`, Cargo compilará primero tus pruebas unitarias, y luego compilará y ejecutará cada archivo en el directorio `tests/`.

### El "Gotcha" de los módulos compartidos en `tests/`

A medida que tu backend crezca, tus pruebas de integración necesitarán código compartido. Por ejemplo, funciones para levantar una base de datos temporal, limpiar tablas o generar usuarios de prueba.

Un error muy común que cometen los desarrolladores intermedios es crear un archivo `tests/helpers.rs` o `tests/common.rs` para colocar esta lógica compartida. El problema es que **Cargo tratará ese archivo como otro archivo de pruebas de integración**, intentará compilarlo como un binario separado y ejecutará pruebas vacías, lo que consume tiempo y contamina la salida de la consola.

La forma correcta (y el patrón estándar en la comunidad Rust) para compartir código entre pruebas de integración sin que Cargo lo evalúe como un test independiente es utilizar el patrón de directorios heredado con un archivo `mod.rs`:

```text
tests/
├── common/
│   └── mod.rs         <-- Aquí va tu código de setup y utilidades compartidas
├── integracion_api.rs
└── integracion_db.rs
```

Cargo ignora los archivos dentro de subdirectorios en `tests/` a menos que sean invocados por los archivos principales. En tu archivo `tests/common/mod.rs` podrías tener:

```rust
// tests/common/mod.rs
pub fn setup_base_de_datos_temporal() {
    // Lógica para levantar un contenedor de Postgres o limpiar tablas...
    println!("Base de datos de prueba inicializada.");
}
```

Y luego, en tus archivos de prueba reales, lo declaras como un módulo y lo utilizas:

```rust
// tests/integracion_api.rs
mod common; // Importa el módulo common/mod.rs

#[test]
fn endpoint_crear_usuario_funciona() {
    // Usamos la función compartida
    common::setup_base_de_datos_temporal();

    // Lógica de la prueba de integración...
    assert!(true);
}
```

Este enfoque mantiene tu conjunto de pruebas ordenado, modular y con tiempos de compilación óptimos.

## 23.4 Setup, teardown y paralelización de pruebas

En muchos frameworks de pruebas de otros lenguajes (como Jest en JavaScript, JUnit en Java o pytest en Python), es común encontrar decoradores o bloques del tipo `before_each` y `after_each` para preparar el entorno antes de cada prueba y limpiarlo al finalizar. 

El framework integrado de Rust toma una filosofía mucho más explícita y minimalista: **no existen hooks globales de setup y teardown en la Standard Library**. Esto obliga al desarrollador a ser intencional con el manejo del estado, lo cual, aunque al principio puede parecer una limitación, en realidad previene la temida "magia oculta" que hace que las suites de pruebas complejas sean difíciles de depurar.

### Setup explícito y el poder del Trait `Drop` para el Teardown

Para el **setup** (preparación), la práctica estándar en Rust es simplemente invocar una función de inicialización al comienzo de tu test. 

El verdadero desafío es el **teardown** (limpieza). Si tu prueba falla y hace un `panic!`, la ejecución de esa función se interrumpe inmediatamente. Cualquier código de limpieza que hayas puesto al final de la función de prueba jamás se ejecutará, dejando archivos temporales abiertos o registros basura en tu base de datos.

Para resolver esto de forma infalible, los desarrolladores Senior en Rust utilizan el patrón **RAII** (Resource Acquisition Is Initialization) apoyándose en el trait `Drop`. Como vimos en capítulos anteriores, el compilador garantiza que el método `drop` se ejecute siempre que un valor sale de su ámbito (scope), **incluso si ocurrió un pánico**.

Veamos un ejemplo simulando la creación y limpieza de un directorio temporal para pruebas:

```rust
use std::fs;
use std::path::{Path, PathBuf};

// Creamos un struct que representará nuestro contexto de prueba
struct ContextoDePrueba {
    directorio_temp: PathBuf,
}

impl ContextoDePrueba {
    // Actúa como nuestro "Setup"
    fn nuevo(nombre_dir: &str) -> Self {
        let path = PathBuf::from(format!("./tmp_tests/{}", nombre_dir));
        fs::create_dir_all(&path).expect("Fallo al crear directorio de prueba");
        
        ContextoDePrueba { directorio_temp: path }
    }
}

// Actúa como nuestro "Teardown" a prueba de fallos
impl Drop for ContextoDePrueba {
    fn drop(&mut self) {
        // Se ejecutará siempre al final del test, haya pasado o fallado
        let _ = fs::remove_dir_all(&self.directorio_temp);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prueba_escritura_archivos() {
        // 1. Setup: Se crea el directorio
        let ctx = ContextoDePrueba::nuevo("test_escritura");
        
        let archivo_path = ctx.directorio_temp.join("datos.txt");
        fs::write(&archivo_path, "hola mundo").unwrap();
        
        // Simulamos un fallo. Incluso con este panic, el trait Drop de `ctx` 
        // se ejecutará y el directorio será eliminado.
        assert!(archivo_path.exists());
        
        // 2. Teardown implícito al salir del scope
    }
}
```

*Nota: Para casos de uso reales de manipulación de archivos temporales en pruebas, el ecosistema de Cargo cuenta con el excelente crate `tempfile`, que implementa este exacto patrón por debajo.*

### Paralelización agresiva por defecto

Una de las mayores ventajas de Rust es su velocidad, y esto se extiende a su suite de pruebas. Cuando ejecutas `cargo test`, **Rust ejecuta todas tus pruebas en paralelo** utilizando un pool de hilos del sistema operativo (un hilo por cada núcleo lógico de tu CPU).

Para pruebas unitarias puras que no comparten estado, esto es fantástico porque tu suite de CI terminará en segundos. Sin embargo, para pruebas de integración de backend, esto suele ser la causa número uno de *flaky tests* (pruebas inestables que a veces pasan y a veces fallan).

Si la Prueba A inserta un usuario con ID 1 en la base de datos de pruebas, y la Prueba B (ejecutándose exactamente al mismo tiempo) intenta insertar otro usuario con el ID 1 o borra toda la tabla, ambas pruebas colisionarán.

### Controlando la concurrencia

Tienes dos caminos arquitectónicos para lidiar con el estado compartido en pruebas paralelizadas:

**Opción 1: Desactivar la paralelización (El camino fácil)**
Puedes forzar a Cargo a ejecutar las pruebas secuencialmente (una por una). Esto garantiza que no haya colisiones de estado, a costa de aumentar el tiempo total de ejecución.

Se logra pasando un flag al binario de pruebas:
```bash
cargo test -- --test-threads=1
```
*(Nota: El primer `--` le dice a Cargo que los argumentos siguientes son para el binario compilado de las pruebas, no para el comando `cargo` en sí).*

**Opción 2: Aislamiento total (El camino Senior)**
En lugar de limitar a Rust, diseña tus pruebas para que no compartan estado. En el contexto de bases de datos (que profundizaremos en el Capítulo 26 con Testcontainers), esto significa:
* Generar nombres de esquema de base de datos únicos (usando UUIDs) para cada prueba en la fase de Setup, y eliminarlos en la fase de Teardown mediante `Drop`.
* O bien, envolver cada prueba en una transacción SQL y hacer un `ROLLBACK` forzado al final, asegurando que los datos nunca se persistan realmente.

Comprender la interacción entre el paralelismo por defecto de Cargo y el manejo de recursos con `Drop` te permitirá construir suites de pruebas extremadamente rápidas y resilientes, características distintivas de un proyecto maduro en Rust.
