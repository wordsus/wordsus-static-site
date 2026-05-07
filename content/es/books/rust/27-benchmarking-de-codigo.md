Optimizar el rendimiento en el backend no es una cuestión de intuición, sino de medición científica. En Rust, donde la eficiencia es una prioridad de primer orden, el benchmarking nos permite cuantificar el impacto de nuestros cambios y garantizar que la latencia se mantenga bajo control. A lo largo de este capítulo, exploraremos desde las herramientas nativas de Cargo hasta el análisis estadístico avanzado con Criterion. Aprenderás a identificar cuellos de botella reales, a evitar las optimizaciones engañosas del compilador y a integrar pruebas de rendimiento automáticas en tu pipeline de CI/CD para detectar regresiones antes de que afecten a tus usuarios en producción.

## 27.1 Benchmarks básicos con Cargo

En el desarrollo backend, no basta con que el código funcione correctamente (algo que ya aseguramos en el Capítulo 23 con `#[test]`); a menudo necesitamos probar qué tan rápido se ejecuta. Aquí es donde entra en juego el **benchmarking**. 

Rust incluye un framework de benchmarking integrado directamente en su ecosistema de herramientas a través de `cargo bench`. Sin embargo, hay un detalle arquitectónico crucial que debes conocer desde el principio: **el framework nativo de benchmarks de Rust (`#[bench]`) es inestable y requiere usar el compilador *nightly***. 

Aunque en entornos de producción normalmente utilizaremos herramientas estables (como veremos en la siguiente sección), comprender cómo funciona el benchmark nativo es fundamental para entender la evolución del ecosistema y los conceptos básicos de medición de rendimiento.

### Configurando un Benchmark Nativo (Nightly)

Para utilizar los benchmarks nativos, necesitamos habilitar la característica `test` del compilador. Esto nos da acceso a la macro `#[bench]` y a la estructura `Bencher`.

Imagina que tenemos una función que realiza un cálculo matemático intensivo y queremos medir su rendimiento. Así es como estructuraríamos el benchmark:

```rust
// Es obligatorio habilitar esta feature inestable al inicio del archivo (ej. lib.rs)
#![feature(test)]
extern crate test;

/// Una función de ejemplo que suma números de 1 hasta 'n'
pub fn suma_intensiva(n: u64) -> u64 {
    (1..=n).fold(0, |acc, x| acc + x)
}

#[cfg(test)]
mod tests {
    use super::*;
    use test::Bencher;
    use std::hint::black_box;

    #[bench]
    fn bench_suma_intensiva(b: &mut Bencher) {
        // b.iter() ejecutará el closure múltiples veces para obtener una media estadística
        b.iter(|| {
            // Pasamos 10,000 al closure para medir el rendimiento de este tamaño de carga
            let resultado = suma_intensiva(black_box(10_000));
            black_box(resultado);
        });
    }
}
```

### Ejecutando la prueba y analizando los resultados

Para ejecutar este código, debes asegurarte de estar usando la cadena de herramientas *nightly*. Puedes hacerlo ejecutando:

```bash
cargo +nightly bench
```

La salida en la terminal será muy similar a la de `cargo test`, pero incluirá métricas de tiempo:

```text
running 1 test
test tests::bench_suma_intensiva ... bench:       3,412 ns/iter (+/- 120)

test result: ok. 0 passed; 0 failed; 0 ignored; 1 measured; 0 filtered out
```

¿Qué significa esta salida?
* **`3,412 ns/iter`**: Es el tiempo medio que tardó el código dentro de `b.iter()` en ejecutarse (en nanosegundos).
* **`(+/- 120)`**: Representa la varianza. Una varianza alta indica que el rendimiento es inestable (tal vez por el planificador del sistema operativo, recolección de basura de otros procesos, o falta de calentamiento de la caché de la CPU).

### El enemigo del benchmarking: El Compilador (LLVM)

Uno de los errores más comunes al hacer benchmarking en lenguajes compilados modernos como Rust (apoyado por LLVM) es subestimar la agresividad del optimizador.

Si en el ejemplo anterior hubiéramos escrito simplemente `suma_intensiva(10_000);` sin hacer nada con el resultado, el compilador LLVM en modo *release* (que es como se ejecuta `cargo bench` por defecto) se daría cuenta de que el resultado nunca se utiliza. Para ahorrar tiempo, LLVM simplemente **eliminaría la llamada a la función por completo**. Tu benchmark reportaría un tiempo de `0 ns/iter`, dándote una falsa sensación de velocidad.

Para evitar esto, introducimos `std::hint::black_box`. Esta función le dice al compilador: *"Asume que el valor que te paso aquí puede ser leído o modificado por un ente externo opaco. No intentes predecirlo ni optimizarlo"*. 
* Al envolver el input (`black_box(10_000)`), evitamos que LLVM precalcule el resultado en tiempo de compilación (Constant Folding).
* Al envolver el output (`black_box(resultado)`), obligamos a LLVM a ejecutar la función porque le hacemos creer que el resultado final sí se utilizará.

### Limitaciones del enfoque nativo

Aunque `cargo bench` con `#[bench]` es rápido de implementar si ya estás en el ecosistema *nightly*, tiene deficiencias notables para proyectos backend a nivel empresarial:
1. **Atadura a Nightly:** La mayoría de los proyectos empresariales en Rust operan bajo la rama *stable* para garantizar retrocompatibilidad.
2. **Estadísticas limitadas:** Solo ofrece la media y una varianza básica. No detecta *outliers* (valores atípicos) de forma inteligente ni guarda un historial para comparar si un nuevo PR degradó el rendimiento (regresión).

Debido a estas limitaciones, la comunidad de Rust ha migrado casi por completo hacia soluciones de terceros que funcionan en Rust estable y ofrecen métricas mucho más ricas.

## 27.2 Análisis estadístico avanzado con `criterion`

Como vimos en la sección anterior, el framework nativo de Rust es útil para pruebas rápidas, pero su dependencia de la versión *nightly* y su falta de rigor estadístico lo hacen insuficiente para entornos de producción. Para el desarrollo backend a nivel empresarial, el estándar de facto es **Criterion.rs**.

Criterion es un framework de micro-benchmarking impulsado por estadísticas que funciona en la versión estable de Rust. Su objetivo principal no es solo decirte "cuánto tarda" tu código, sino darte confianza matemática sobre su rendimiento y, lo más importante, alertarte si un cambio reciente ha degradado la velocidad de tu aplicación (una regresión).

### Configuración de Criterion

A diferencia de las pruebas unitarias o el benchmark nativo, Criterion requiere una configuración específica en tu archivo `Cargo.toml`. Debemos añadirlo como una dependencia de desarrollo y declarar explícitamente nuestros archivos de benchmark, desactivando el *harness* (el arnés de pruebas por defecto de Rust) para que Criterion tome el control total de la ejecución.

```toml
# Cargo.toml
[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "procesamiento_datos"
harness = false
```

Esta configuración le indica a Cargo que busque un archivo llamado `procesamiento_datos.rs` dentro del directorio `benches/` (el cual debes crear en la raíz de tu proyecto, al mismo nivel que `src/`).

### Escribiendo un Benchmark Robusto

Imaginemos que estamos optimizando una función central de nuestra API que filtra y transforma un gran volumen de datos de usuarios. Así es como estructuraríamos la medición con Criterion:

```rust
// benches/procesamiento_datos.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

// Una función simulada que representa una carga de trabajo típica en el backend
fn procesar_usuarios(usuarios: &[String]) -> Vec<String> {
    usuarios.iter()
        .filter(|u| u.starts_with("activo_"))
        .map(|u| u.to_uppercase())
        .collect()
}

fn bench_procesamiento(c: &mut Criterion) {
    // 1. Preparación de datos (fuera del bucle de medición)
    let datos_prueba: Vec<String> = (0..10_000)
        .map(|i| format!("{}usuario_{}", if i % 2 == 0 { "activo_" } else { "" }, i))
        .collect();

    // 2. Definición del benchmark
    c.bench_function("filtrado_y_mapeo", |b| {
        b.iter(|| {
            // 3. Ejecución y uso de black_box (proporcionado por Criterion)
            let resultado = procesar_usuarios(black_box(&datos_prueba));
            black_box(resultado);
        })
    });
}

// Macros para registrar y ejecutar los grupos de benchmarks
criterion_group!(benches, bench_procesamiento);
criterion_main!(benches);
```

### Anatomía de la Ejecución Estadística

Cuando ejecutas `cargo bench`, Criterion no se limita a iterar tu código ciegamente. Realiza un proceso analítico riguroso dividido en varias fases:

1.  **Calentamiento (Warm-up):** Antes de medir nada, Criterion ejecuta tu función durante un breve periodo. Esto es vital en servidores modernos porque permite que la caché de la CPU (L1/L2/L3) se llene con tus datos y que el predictor de saltos (*branch predictor*) aprenda los patrones de tus bucles.
2.  **Muestreo (Sampling):** Criterion toma múltiples muestras del tiempo de ejecución, aumentando iterativamente el número de ejecuciones por muestra para obtener alta fidelidad tanto en funciones que tardan nanosegundos como en las que tardan milisegundos.
3.  **Análisis de Outliers:** Identifica y separa los valores atípicos severos. Si tu sistema operativo decidió indexar un archivo o descargar una actualización justo durante una iteración, Criterion detectará ese pico de latencia y evitará que arruine la media estadística.
4.  **Estimación Bootstrap:** Utiliza técnicas de remuestreo estadístico (bootstrapping) para calcular con alta precisión la media y los **intervalos de confianza**.

### Detección de Regresiones

La característica más poderosa de Criterion para un equipo de backend es su memoria histórica. Durante la primera ejecución, Criterion guarda las métricas base en el directorio `target/criterion/`. 

Si posteriormente modificas la función `procesar_usuarios` (por ejemplo, introduciendo un clon de memoria innecesario) y vuelves a ejecutar `cargo bench`, la salida en terminal será explícita y codificada por colores:

```text
filtrado_y_mapeo        time:   [125.40 µs 126.12 µs 127.05 µs]
                        change: [+15.20% +16.05% +16.82%] (p = 0.00 < 0.05)
                        Performance has regressed.
```

Criterion te indica no solo que el código es más lento, sino que el cambio estadístico es significativo (valor p < 0.05), descartando la posibilidad de que sea solo ruido del sistema operativo. Además, Criterion genera automáticamente informes HTML detallados con gráficos de dispersión y distribución (usando `gnuplot` o su motor integrado), permitiéndote visualizar la degradación de un vistazo.

## 27.3 Detección de regresiones de rendimiento en CI/CD

Tener `criterion` configurado localmente es un gran paso, pero en un equipo de desarrollo maduro, la responsabilidad de detectar código ineficiente no puede recaer en la memoria del desarrollador para ejecutar `cargo bench` antes de cada commit. Necesitamos automatizar este proceso en nuestro pipeline de Integración Continua (CI).

Sin embargo, aquí nos encontramos con uno de los problemas más frustrantes del desarrollo backend: **el ruido en los entornos CI**.

### El problema del "Wall-clock time" en servidores compartidos

Cuando ejecutas un benchmark en tu máquina local, tienes un control relativo sobre los recursos. En plataformas como GitHub Actions o GitLab CI, tus pruebas se ejecutan en máquinas virtuales alojadas en servidores compartidos. 

Si otro contenedor en el mismo servidor físico decide consumir mucha CPU (fenómeno conocido como *CPU steal time*), tu benchmark de Rust tardará más milisegundos en ejecutarse. Si tu pipeline está configurado para fallar cuando detecta una regresión del 5%, un pico de latencia del servidor en la nube provocará un **falso positivo**, rompiendo el pipeline (y la paciencia del equipo) aunque el código sea perfectamente óptimo.

### Estrategia 1: Monitoreo sin bloqueo (Visibilidad Continua)

Para mitigar el ruido, la primera estrategia para equipos que usan *runners* compartidos es ejecutar los benchmarks y registrar los resultados sin hacer fallar el *Pull Request* (PR). 

Podemos utilizar herramientas como `github-action-benchmark` para extraer los datos de Criterion y publicarlos en un dashboard estático (por ejemplo, en GitHub Pages) o comentarlos directamente en el PR.

Ejemplo de un flujo básico en GitHub Actions (`.github/workflows/bench.yml`):

```yaml
name: Benchmarks
on:
  pull_request:
    branches: [ main ]

jobs:
  benchmark:
    name: Run Performance Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Instalar Rust estable
        uses: dtolnay/rust-toolchain@stable
        
      - name: Ejecutar Criterion
        # Usamos cargo-criterion para exportar resultados en un formato fácil de parsear
        run: |
          cargo install cargo-criterion
          cargo criterion --message-format=json > benches.json

      - name: Reportar resultados en el PR
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'cargo'
          output-file-path: benches.json
          # Comentará en el PR pero NO fallará si hay fluctuaciones
          fail-on-alert: false 
          comment-on-alert: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Estrategia 2: Conteo de Instrucciones (El estándar Senior)

Si realmente necesitas que el CI rechace PRs que degraden el rendimiento (y quieres cero falsos positivos), medir el tiempo (wall-clock) no sirve. La solución a nivel senior es **medir las instrucciones de la CPU**.

Sin importar en qué máquina se ejecute, sumar `2 + 2` siempre tomará el mismo número de instrucciones a nivel de ensamblador. Herramientas modernas en el ecosistema Rust, como **CodSpeed** o el uso integrado de `Valgrind` / `Callgrind` junto a `iai-callgrind` (un framework alternativo a Criterion), se basan en este principio.

En lugar de medir milisegundos, miden cuántas instrucciones, lecturas de caché L1 y accesos a RAM requiere tu función. 
* Si tu PR original requería 150,000 instrucciones.
* Y tu nuevo commit requiere 180,000 instrucciones.
* Tienes una regresión matemática y absoluta del 20%.

Al utilizar este enfoque en CI, eliminas por completo el ruido del servidor. El pipeline puede configurarse de forma estricta (`fail-on-alert: true`) con total confianza, sabiendo que si falla, es porque el algoritmo introducido es genuinamente menos eficiente.

### Recomendaciones para el pipeline de Backend

1. **Separa los tests de los benchmarks:** Ejecuta `cargo test` en cada commit, pero considera ejecutar `cargo bench` solo en los PRs dirigidos a la rama `main` o mediante etiquetas manuales (`labels`), ya que los benchmarks consumen mucho tiempo de cómputo en CI.
2. **Usa cachés agresivamente:** Utiliza herramientas como `Swatinem/rust-cache` en tu pipeline para evitar recompilar las dependencias de tus benchmarks (que suelen ser pesadas) en cada ejecución.
3. **Mantén una línea base (Baseline):** Asegúrate de que tu herramienta de CI compare los resultados actuales contra la rama `main` (la línea base), no contra la ejecución anterior del mismo PR, para evaluar el impacto real del cambio propuesto.

## 27.4 Perfilado de memoria durante el testing

Es un mito común creer que, gracias al *Borrow Checker*, Rust es inmune a las fugas de memoria (memory leaks). La realidad es que las reglas de *Ownership* garantizan la seguridad de la memoria (evitan punteros colgantes o dobles liberaciones), pero el compilador de Rust permite explícitamente fugar memoria.

En un entorno backend, donde tu aplicación puede correr ininterrumpidamente durante meses en un contenedor de Kubernetes con límites estrictos (OOM Kills), una fuga provocada por un ciclo de referencias cruzadas con `Arc`, una caché interna (`HashMap`) que crece sin límite, o memoria no liberada en una llamada a una librería en C (FFI), derribará tu servicio. Por lo tanto, perfilar la memoria durante la fase de pruebas es tan crítico como medir el tiempo de CPU.

### El enfoque educativo: Interceptar el Asignador Global

Para entender cómo medir la memoria en Rust, primero debemos mirar bajo el capó. Rust nos permite definir nuestro propio asignador de memoria (Allocator) mediante el atributo `#[global_allocator]`. 

Podemos crear un envoltorio (wrapper) alrededor del asignador del sistema que incremente un contador atómico cada vez que se pide memoria. Esto nos permite escribir tests unitarios que fallen si una función asigna más memoria en el *heap* de la que consideramos aceptable:

```rust
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

// Nuestro asignador personalizado
struct TrackingAllocator;

// Contador global de bytes asignados
static ALLOCATED_BYTES: AtomicUsize = AtomicUsize::new(0);

unsafe impl GlobalAlloc for TrackingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        ALLOCATED_BYTES.fetch_add(layout.size(), Ordering::SeqCst);
        System.alloc(layout)
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        // En un caso real, también restaríamos al liberar
        System.dealloc(ptr, layout)
    }
}

// Advertencia: Esto afecta a todo el binario/test
#[global_allocator]
static GLOBAL: TrackingAllocator = TrackingAllocator;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_limite_asignacion_memoria() {
        let memoria_inicial = ALLOCATED_BYTES.load(Ordering::SeqCst);
        
        // Ejecutamos la función a evaluar
        let _gran_vector = vec![0u8; 10_000];
        
        let memoria_final = ALLOCATED_BYTES.load(Ordering::SeqCst);
        let bytes_usados = memoria_final - memoria_inicial;
        
        // Hacemos fallar el test si supera los 15KB
        assert!(bytes_usados < 15_000, "La función consumió demasiada memoria: {} bytes", bytes_usados);
    }
}
```

Este enfoque es excelente para comprender el funcionamiento interno, pero es rudimentario para aplicaciones empresariales, ya que no detalla *dónde* ocurrió la asignación ni rastrea el pico máximo de memoria viva de forma precisa.

### Análisis Avanzado de Heap con `dhat`

Para proyectos de nivel senior, el estándar de la industria es utilizar el crate `dhat` (Dynamic Heap Analysis Tool). Es un perfilador de memoria que se integra nativamente en el ecosistema de pruebas de Rust y funciona de manera similar a la herramienta Massif de Valgrind, pero a una fracción de su costo de rendimiento.

Para evitar que el sobrecosto de perfilar memoria afecte tus ejecuciones normales, la mejor práctica es aislar `dhat` detrás de una *feature flag* en tu `Cargo.toml`:

```toml
[features]
dhat-heap = []

[target.'cfg(feature = "dhat-heap")'.dependencies]
dhat = "0.3"
```

Luego, configuras el asignador global condicionalmente en el punto de entrada de tu aplicación o suite de pruebas de integración:

```rust
#[cfg(feature = "dhat-heap")]
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;

#[cfg(test)]
mod tests {
    #[test]
    #[cfg(feature = "dhat-heap")]
    fn test_perfilado_memoria_complejo() {
        // Iniciamos el rastreador de dhat al principio del test
        let _profiler = dhat::Profiler::builder().testing().build();

        // Simulamos una operación de backend costosa
        let mut cache = std::collections::HashMap::new();
        for i in 0..50_000 {
            cache.insert(i, i.to_string());
        }
        drop(cache); // Liberamos la memoria explícitamente

        // Obtenemos las estadísticas exactas generadas durante esta ejecución
        let stats = dhat::HeapStats::get();

        // Validamos el pico de memoria (Peak RAM)
        assert!(
            stats.max_bytes < 5_000_000, 
            "Pico de memoria excesivo: {} bytes", stats.max_bytes
        );

        // Validamos que no haya memory leaks al final de la operación
        assert_eq!(
            stats.curr_bytes, 0,
            "Fuga de memoria detectada: quedaron {} bytes sin liberar", stats.curr_bytes
        );
    }
}
```

### Integración en la cadena de CI/CD

Al ejecutar `cargo test --features dhat-heap`, este test no solo evaluará la lógica de negocio, sino que actuará como un guardián de la infraestructura. Si un desarrollador introduce un cambio que hace que el pico de memoria de un endpoint específico supere los 5MB permitidos en el test, el pipeline de CI fallará antes de que el código llegue a revisión.

Además, si configuras `dhat` para emitir archivos (eliminando la llamada a `.testing()`), generará un archivo `dhat-heap.json` que puedes cargar en visores web compatibles para ver un árbol de llamadas exacto de qué línea de código asignó qué bloque de memoria, permitiendo optimizaciones quirúrgicas en tus estructuras de datos.
