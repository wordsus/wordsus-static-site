En el desarrollo backend moderno, la seguridad no termina en el código que escribimos; se extiende a cada librería de terceros que integramos. Rust ofrece garantías de memoria excepcionales, pero no nos hace inmunes a crates maliciosos o vulnerables. Este capítulo aborda la **Gobernanza de Dependencias**, un pilar crítico para aplicaciones de nivel senior. Aprenderás a automatizar la detección de vulnerabilidades con `cargo-audit`, imponer políticas de licencias y vetar crates con `cargo-deny`, garantizar la integridad de tus artefactos mediante builds reproducibles y auditar el uso de código `unsafe` con análisis estático avanzado. Es el blindaje final para tu arquitectura.

## 44.1 Auditoría de dependencias con `cargo-audit`

En el ecosistema de Rust, la facilidad para integrar librerías de terceros gracias a `cargo` y *crates.io* es una de sus mayores ventajas. Sin embargo, esta misma facilidad introduce el riesgo de ataques a la cadena de suministro (Supply Chain). Cuando incluyes una dependencia, también heredas sus posibles fallos de seguridad.

Para mitigar este riesgo, la comunidad de Rust mantiene la **RustSec Advisory Database**, un repositorio centralizado donde se documentan las vulnerabilidades de seguridad descubiertas en los crates públicos. Aquí es donde entra en juego `cargo-audit`, una herramienta indispensable que contrasta automáticamente las dependencias exactas de tu proyecto contra esta base de datos.

### Instalación y funcionamiento básico

A diferencia de las herramientas de análisis estático que revisan tu código fuente, `cargo-audit` no examina código. Su trabajo consiste puramente en analizar tu archivo `Cargo.lock` (motivo por el cual tu proyecto debe estar compilado o haber resuelto sus dependencias previamente) y buscar coincidencias en la base de datos de RustSec.

Para instalarlo en tu entorno local, utiliza:

```bash
cargo install cargo-audit
```

Una vez instalado, ejecutarlo es tan simple como correr el comando en la raíz de tu proyecto:

```bash
cargo audit
```

Si tu proyecto está limpio, verás un mensaje de éxito. Sin embargo, si se detecta una vulnerabilidad, la salida te proporcionará información detallada:

```text
    Fetching advisory database from `https://github.com/RustSec/advisory-db.git`
      Loaded 542 security advisories
    Updating crates.io index
    Scanning Cargo.lock for vulnerabilities (321 crate dependencies)

Crate:     hyper
Version:   0.14.10
Title:     HTTP Request Smuggling in hyper
Date:      2021-07-08
ID:        RUSTSEC-2021-0078
URL:       https://rustsec.org/advisories/RUSTSEC-2021-0078
Solution:  Upgrade to >=0.14.11
Dependency tree: 
hyper 0.14.10
└── reqwest 0.11.4
    └── my_backend_api 0.1.0

error: 1 vulnerability found!
```

El reporte te indica la vulnerabilidad, el ID (útil para rastreo), el árbol de dependencias (para saber qué crate trajo la versión vulnerable de forma transitiva) y la solución recomendada (generalmente, actualizar a una versión parcheada usando `cargo update -p <crate>`).

### Configuración avanzada y excepciones (`audit.toml`)

En entornos empresariales, no siempre es posible actualizar una dependencia inmediatamente. Quizás el parche incluye *breaking changes* severos, o la vulnerabilidad afecta a una característica del crate que tu aplicación no utiliza (por ejemplo, una vulnerabilidad en una feature específica de Windows cuando tu backend corre exclusivamente en Linux).

Para estos casos, `cargo-audit` permite configurar excepciones mediante un archivo `.cargo/audit.toml` en la raíz de tu proyecto.

```toml
# .cargo/audit.toml

[advisories]
# Ignorar vulnerabilidades específicas por su ID
ignore = ["RUSTSEC-2021-0078"]

# Ignorar vulnerabilidades de tipo "informacional" (ej. un crate fue abandonado pero no tiene fallos críticos conocidos)
informational_warnings = ["unmaintained", "unsound"]
```

Al usar `ignore`, estás asumiendo el riesgo explícitamente. Es una buena práctica del equipo documentar el *por qué* se ignoró la vulnerabilidad en un comentario junto a la regla, y establecer un ticket en tu gestor de proyectos para revisarlo en el futuro.

### Integración en el pipeline de CI/CD

Auditar dependencias localmente está bien, pero el verdadero valor de `cargo-audit` se materializa cuando se bloquean los pases a producción si se introducen vulnerabilidades. Debe ser un paso obligatorio en tu Integración Continua (CI).

Afortunadamente, existen acciones prefabricadas para plataformas como GitHub Actions que instalan y ejecutan la auditoría de forma eficiente, aprovechando la caché para no descargar la base de datos completa en cada ejecución.

Ejemplo de un *job* en GitHub Actions (`.github/workflows/audit.yml`):

```yaml
name: Security Audit
on:
  push:
    paths:
      - 'Cargo.lock'
  schedule:
    - cron: '0 0 * * *' # Ejecutar diariamente

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Audit dependencies
        uses: rustsec/audit-check@v1.4.1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

**Nota arquitectónica:** Observa que el pipeline anterior también se ejecuta mediante un `cron` diario. Las vulnerabilidades se descubren constantemente; un `Cargo.lock` que era seguro el lunes puede ser marcado como vulnerable el viernes, incluso si nadie en tu equipo ha tocado el código. La auditoría programada garantiza que te enteres de los problemas de seguridad de tus dependencias en el momento en que se publican.

## 44.2 Restricción de licencias y crates de confianza con `cargo-deny`

Mientras que `cargo-audit` es excelente para detectar vulnerabilidades conocidas (CVEs), la seguridad y la salud de la cadena de suministro en un entorno corporativo abarcan mucho más. Como desarrolladores senior o arquitectos de software, también debemos asegurar el **cumplimiento legal** (compliance de licencias) y establecer **políticas de arquitectura** estrictas sobre qué código de terceros tiene permitido ingresar a nuestro grafo de dependencias.

Para resolver estas necesidades de forma integral, el ecosistema de Rust cuenta con `cargo-deny`, una herramienta desarrollada por Embark Studios que actúa como un "linter para tus dependencias".

### Instalación e Inicialización

Para instalar la herramienta en tu entorno local, ejecuta:

```bash
cargo install --locked cargo-deny
```

A diferencia de otras herramientas que funcionan con banderas por consola, `cargo-deny` se basa en un archivo de configuración fuertemente tipado. Para generarlo, colócate en la raíz de tu proyecto y ejecuta:

```bash
cargo deny init
```

Esto creará un archivo `deny.toml` predeterminado. `cargo-deny` evalúa tu proyecto en cuatro ejes principales: **advisories** (similar a `cargo-audit`), **bans** (prohibiciones), **licenses** (licencias) y **sources** (orígenes de los registros). A continuación, exploraremos los dos más críticos para la gobernanza del código.

### 1. Control estricto de Licencias (`[licenses]`)

Uno de los mayores riesgos no técnicos al integrar dependencias es introducir accidentalmente una licencia restrictiva (como GPL o AGPL) en un backend de código cerrado (propietario). Esto podría obligar legalmente a tu empresa a liberar el código fuente de toda la aplicación.

Con `cargo-deny`, puedes definir un listado en blanco y negro de las licencias permitidas a nivel organizativo.

En tu archivo `deny.toml`, la sección de licencias se configura así:

```toml
[licenses]
# Bloquear inmediatamente cualquier crate que no especifique su licencia
unlicensed = "deny"

# Lista blanca: Licencias permisivas seguras para código propietario
allow = [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
]

# Lista negra explícita: Licencias copyleft fuertes
deny = [
    "GPL-1.0-or-later",
    "GPL-2.0-or-later",
    "GPL-3.0-or-later",
    "AGPL-3.0-or-later",
]

# Las licencias que no estén ni en 'allow' ni en 'deny' generarán una advertencia (warn) por defecto.
```

Si un desarrollador de tu equipo intenta añadir un crate con licencia GPL, al compilar o pasar el CI, `cargo-deny` abortará el proceso instantáneamente, protegiendo la propiedad intelectual del proyecto.

### 2. Prohibición de Crates y control de versiones (`[bans]`)

La sección `[bans]` es una herramienta arquitectónica excepcionalmente potente. Sirve para dos propósitos principales: evitar la proliferación de múltiples versiones de la misma librería (lo cual infla el tamaño del binario y dispara los tiempos de compilación) y vetar crates específicos por razones técnicas.

Por ejemplo, imagina que tu equipo ha decidido estandarizar la inicialización estática asíncrona usando `once_cell` (o `std::sync::LazyLock` en versiones recientes de Rust) y quieres evitar que alguien introduzca el antiguo crate `lazy_static`. O quizás quieres vetar un crate porque se ha demostrado que está abandonado o tiene problemas de rendimiento (como depender excesivamente de código `unsafe`).

```toml
[bans]
# Avisar si el grafo de dependencias compila más de una versión del mismo crate.
# Extremadamente útil para mantener los tiempos de compilación bajos en proyectos grandes.
multiple-versions = "warn"

# Bloquear crates específicos
[[bans.deny]]
name = "lazy_static"
# Puedes incluso sugerir alternativas para mejorar la experiencia del desarrollador
wrappers = ["once_cell", "std::sync::LazyLock"]

[[bans.deny]]
name = "openssl"
# Ejemplo: la empresa ha decidido usar exclusivamente 'rustls' por seguridad de memoria.
```

### Integración en el Pipeline (CI/CD)

Al igual que la auditoría de vulnerabilidades, `cargo-deny` debe ser una puerta de control (gatekeeper) en tu Integración Continua. Si utilizas GitHub Actions, la comunidad mantiene una acción oficial muy optimizada:

```yaml
# .github/workflows/deny.yml
name: Check Cargo Deny
on: [push, pull_request]

jobs:
  cargo-deny:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check licenses, bans, and sources
        uses: EmbarkStudios/cargo-deny-action@v2
        with:
          # Ejecutamos las validaciones sin la de vulnerabilidades (advisories) 
          # si ya usamos cargo-audit en otro job.
          command: check bans licenses sources
```

Implementar `cargo-deny` eleva la madurez de un proyecto de Rust, pasando de una simple resolución funcional de dependencias a una verdadera gestión de riesgos en la cadena de suministro de software.

## 44.3 Reproducibilidad de builds

En el contexto de la seguridad de la cadena de suministro, auditar el código fuente y restringir las licencias no es suficiente si no puedes garantizar que el binario final se generó estrictamente a partir de ese código. La **reproducibilidad de builds** (o compilaciones deterministas) es la capacidad de compilar el mismo código fuente, en diferentes máquinas o momentos, y obtener un binario bit a bit idéntico (mismo hash criptográfico).

Para un desarrollador backend de nivel senior, esto es crucial. Si el binario generado por tu servidor de Integración Continua (CI) tiene un hash diferente al generado localmente, se abre una brecha de confianza: ¿Fue el compilador? ¿Fue una diferencia en el sistema operativo? ¿O el servidor de CI fue comprometido y ha inyectado código malicioso en el binario final?

Rust ofrece excelentes herramientas para alcanzar la reproducibilidad, pero requiere disciplina y configuración explícita para lograr un determinismo absoluto.

### 1. El anclaje absoluto con `Cargo.lock` y `--locked`

El primer paso y el más fundamental para la reproducibilidad es fijar las versiones exactas de tus dependencias. Aunque `Cargo.lock` existe precisamente para esto, por defecto, si ejecutas `cargo build` y alguien ha modificado el `Cargo.toml` sin actualizar el `.lock`, Cargo intentará resolver y actualizar las dependencias automáticamente.

En cualquier entorno de CI/CD o pipeline de despliegue, la compilación **siempre** debe fallar si el `.lock` no está sincronizado con el manifiesto. Esto se logra forzando el uso del flag `--locked`:

```bash
cargo build --release --locked
```

Esta simple bandera garantiza que el compilador usará exactamente los mismos commits o versiones de *crates.io* que el desarrollador validó localmente, previniendo la introducción accidental de actualizaciones transitivas vulnerables durante el despliegue.

### 2. Eliminación de metadatos ambientales (Path Remapping)

Incluso con las mismas dependencias y la misma versión del compilador, el binario resultante suele ser diferente entre dos ordenadores. Esto ocurre porque `rustc` (el compilador de Rust) inyecta información del entorno en el binario por defecto.

El caso más común son las **rutas absolutas del sistema de archivos**. Cuando ocurre un `panic!` en Rust, el mensaje suele incluir el archivo y la línea donde ocurrió (ej. `/home/developer/proyecto/src/main.rs`). Si el servidor de CI compila el código en `/opt/ci/runner/workspace/`, los binarios serán distintos.

Para solucionar esto, debemos instruir a `rustc` para que "remapee" las rutas locales a un prefijo neutral. Puedes configurarlo globalmente para tu proyecto creando o modificando el archivo `.cargo/config.toml`:

```toml
# .cargo/config.toml
[profile.release]
# Reemplaza la ruta local absoluta de tu máquina con un prefijo genérico.
# En lugar de '/home/usuario/proyecto/src/main.rs', el binario guardará '/app/src/main.rs'
rustflags = ["--remap-path-prefix", "$PWD=/app"]

# Adicionalmente, suele ser buena práctica eliminar los símbolos de debug en release
# para evitar filtrar nombres de variables o estructuras internas.
strip = "symbols" 
```

### 3. Evitar macros dependientes del entorno

En Rust, las macros procedurales y declarativas se expanden en tiempo de compilación. El uso de ciertas macros de la Standard Library o de terceros destruye la reproducibilidad inmediatamente.

Debes evitar (o gestionar cuidadosamente) macros como:

* `env!("USER")` o `env!("HOME")`: Inyectan variables de entorno de la máquina que compila.
* Macros relacionadas con el tiempo (como las que inyectan la fecha de compilación como una constante en el binario). Si compilas hoy y mañana, el código fuente (expandido) será diferente.

Si necesitas inyectar la versión de la aplicación, es preferible usar la variable que Cargo provee y que es constante para ese build: `env!("CARGO_PKG_VERSION")`.

### 4. Entornos de compilación herméticos

La última pieza del rompecabezas es el entorno del sistema operativo. `rustc` puede depender de librerías del sistema en tiempo de compilación (como `pkg-config`, `openssl-sys` o el linker de C, `gcc`/`clang`).

Para garantizar que el binario es reproducible, debes aislar el proceso de construcción utilizando **contenedores herméticos** (como Docker o Podman) y fijando explícitamente la versión de la toolchain de Rust.

Un archivo `rust-toolchain.toml` en la raíz de tu proyecto asegura que todos usen la misma versión del compilador:

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.75.0" # Fija la versión de rustc. No uses "stable" aquí si buscas reproducibilidad extrema.
components = ["rustfmt", "clippy"]
```

Combinado con un `Dockerfile` multiplataforma (Multi-stage build) que fije los hashes de las imágenes base (ej. `FROM rust:1.75.0-slim-bullseye@sha256:...`), te aseguras de que el sistema operativo, las librerías dinámicas (glibc), el linker y el compilador sean idénticos cada vez que se empaqueta tu aplicación backend.

## 44.4 Análisis estático de vulnerabilidades

En la mayoría de los lenguajes de programación, el Análisis Estático de Seguridad de Aplicaciones (SAST, por sus siglas en inglés) es vital para detectar inyecciones SQL, *null pointer dereferences* o vulnerabilidades de concurrencia. En Rust, la buena noticia es que el compilador (`rustc`) y el *borrow checker* ya actúan como el analizador estático más riguroso del mercado, eliminando familias enteras de vulnerabilidades de memoria (CWE-89, CWE-476, etc.) desde la fase de desarrollo.

Sin embargo, el compilador de Rust garantiza la seguridad de la memoria, **no la lógica de negocio ni la seguridad criptográfica**. Un atacante no puede provocar un *buffer overflow* en tu backend de Rust, pero sí puede explotar credenciales hardcodeadas, algoritmos de hashing obsoletos o pánicos no controlados que causen una Denegación de Servicio (DoS).

Para un desarrollador senior, implementar SAST en Rust significa configurar herramientas para atrapar estos vectores de ataque lógicos y controlar estrictamente el uso de las "válvulas de escape" del lenguaje.

### 1. Elevando `clippy` a herramienta de seguridad

Aunque introdujimos `clippy` en el Capítulo 1 como un linter de estilo y rendimiento, también cuenta con grupos de reglas (*lints*) enfocados directamente en la seguridad y la resiliencia que por defecto están desactivados (en modo `allow`).

Para un backend en producción, es recomendable ser draconiano con el manejo de errores. En la raíz de tu proyecto (o en la raíz de tu *workspace*), puedes configurar lints restrictivos a nivel de proyecto editando el archivo `Cargo.toml` o mediante directivas al inicio de `main.rs` / `lib.rs`:

```rust
// lib.rs o main.rs

// Prohíbe el uso de unwrap() y expect(). Obliga a los desarrolladores
// a manejar el Option o Result, previniendo pánicos que puedan ser
// explotados para tirar el servidor (DoS).
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]

// Advierte sobre operaciones matemáticas que podrían desbordarse
// si no se manejan explícitamente (integer overflow).
#![warn(clippy::integer_arithmetic)]

// Advierte sobre el uso de generadores de números pseudoaleatorios
// no seguros para criptografía en contextos sensibles.
#![warn(clippy::insecure_math_uninit)]
```

Alternativamente, en versiones recientes de Cargo, puedes definir esto en el `Cargo.toml` para que aplique a todo el workspace sin modificar el código fuente:

```toml
[workspace.lints.clippy]
unwrap_used = "deny"
expect_used = "deny"
```

### 2. Detección de código inseguro con `cargo-geiger`

El lema de Rust de "seguridad de memoria garantizada" tiene un asterisco importante: el bloque `unsafe`. Si una dependencia (o tu propio código) utiliza `unsafe`, el compilador apaga sus protecciones y confía ciegamente en el desarrollador, abriendo la puerta a las mismas vulnerabilidades que existen en C o C++.

`cargo-geiger` es una herramienta de análisis estático diseñada específicamente para rastrear y cuantificar el uso de `unsafe` en tu proyecto y en todo tu árbol de dependencias.

Para instalarlo:

```bash
cargo install cargo-geiger
```

Al ejecutar `cargo geiger` en la terminal, la herramienta escanea el código fuente y genera un reporte visual (un contador Geiger) que lista qué crates usan `unsafe` y cuántas líneas lo contienen. Si un crate de utilidad matemática simple de repente introduce miles de líneas de `unsafe`, es una bandera roja gigante de seguridad que merece una auditoría manual o un reemplazo.

### 3. Motores SAST de propósito general (Semgrep y CodeQL)

Para vulnerabilidades lógicas más complejas, como la inyección de comandos en el sistema operativo o el uso de *path traversal* (ej. leer `/etc/passwd` mediante un input del usuario), debemos recurrir a motores SAST empresariales que entienden el flujo de datos (Taint Analysis).

1. **Semgrep:** Es un analizador estático rápido y de código abierto que soporta Rust. En lugar de reglas complejas, utiliza patrones que se parecen al código fuente. Es ideal para prohibir el uso de ciertas funciones internas inseguras.
    * *Ejemplo:* Puedes escribir una regla de Semgrep que falle el CI si alguien usa `std::process::Command::new` con inputs concatenados directamente desde una petición HTTP.
2. **GitHub Advanced Security (CodeQL):** CodeQL compila una base de datos relacional a partir de tu código Rust y permite ejecutar consultas de seguridad sobre él. Soporta Rust de forma oficial y es capaz de seguir el rastro de una variable desde que entra en un *endpoint* de Axum o Actix hasta que llega a una consulta SQL, alertando si no fue sanitizada.

### Resumen de integración en CI/CD

Una tubería de seguridad (*Security Pipeline*) completa y madura para un backend en Rust, combinando todo lo aprendido en este capítulo, debería verse así:

1. **Fase de Linting:** `cargo clippy -- -D warnings` (falla si hay advertencias).
2. **Fase de Supply Chain:**
    * `cargo audit` (busca CVEs conocidos).
    * `cargo deny check` (valida licencias y crates prohibidos).
3. **Fase de Análisis Estático Avanzado:** `cargo geiger` (opcionalmente configurado para fallar si el número de bloques `unsafe` supera un umbral histórico) y ejecución de Semgrep/CodeQL.
4. **Fase de Build:** `cargo build --release --locked` (garantizando la reproducibilidad).

Al implementar estas cuatro herramientas, blindas tu infraestructura backend contra la inmensa mayoría de ataques automatizados y vulnerabilidades de la cadena de suministro, permitiendo que tu equipo se concentre puramente en la lógica de negocio.
