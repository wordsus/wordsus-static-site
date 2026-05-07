Este capítulo aborda la interacción entre nuestras aplicaciones backend y el sistema de archivos del sistema operativo mediante el módulo `std::fs`. En el desarrollo de servicios robustos, no basta con leer o escribir datos; es imperativo gestionar los recursos con eficiencia y seguridad. Exploraremos desde operaciones directas con `File` hasta el uso estratégico de `BufReader` y `BufWriter` para minimizar llamadas al sistema. Además, aprenderemos a manejar los flujos estándar (`stdin`, `stdout`) y a construir rutas multiplataforma con `PathBuf`, garantizando que nuestro código sea portable, rápido y resiliente ante errores de I/O.

## 12.1 Lectura y escritura de archivos (`std::fs`)

El módulo `std::fs` de la Standard Library proporciona las primitivas fundamentales para interactuar con el sistema de archivos subyacente del sistema operativo. Aunque en el desarrollo de APIs modernas (como veremos en la Parte IV con Axum o Actix) a menudo nos apoyaremos en la I/O asíncrona de Tokio, dominar la I/O síncrona es vital para la escritura de utilidades CLI, scripts de inicialización, migraciones o simplemente para entender cómo Rust interactúa de forma segura con el disco.

Como ya cubrimos el manejo de errores en el Capítulo 5, notarás que la mayoría de las operaciones en `std::fs` retornan un `std::io::Result<T>`. Esto es simplemente un alias de `Result<T, std::io::Error>`, lo que significa que haremos un uso exhaustivo del operador `?` para propagar los fallos, como permisos denegados o archivos inexistentes.

### Operaciones rápidas: Lectura y escritura directa

Para las tareas más comunes, Rust provee funciones de conveniencia a nivel de módulo que abren, leen/escriben y cierran el archivo automáticamente. Es la vía más rápida y segura si el archivo cabe cómodamente en la memoria RAM (el Heap).

**1. Leer texto UTF-8 (`fs::read_to_string`)**
Si estás leyendo un archivo de configuración (como un JSON o un TOML) del cual tienes certeza de que contiene texto válido, esta es tu mejor opción.

```rust
use std::fs;
use std::io;

fn leer_configuracion() -> io::Result<String> {
    // Lee todo el contenido y lo valida como UTF-8 en un solo paso.
    let contenido = fs::read_to_string("config.json")?;
    Ok(contenido)
}
```

**2. Leer datos binarios (`fs::read`)**
Si estás procesando imágenes, ejecutables o cualquier flujo de bytes que no garantice ser UTF-8 válido, debes leerlo como un vector de bytes (`Vec<u8>`).

```rust
use std::fs;
use std::io;

fn cargar_imagen() -> io::Result<Vec<u8>> {
    // Lee los bytes crudos sin intentar validarlos como texto.
    let bytes = fs::read("avatar.png")?;
    Ok(bytes)
}
```

**3. Sobrescribir un archivo (`fs::write`)**
La función `fs::write` creará un archivo si no existe, o lo truncará (lo vaciará por completo) antes de escribir si ya existe. Acepta cualquier cosa que pueda convertirse a un *slice* de bytes (`&[u8]`), lo cual incluye tanto `&str` como `&[u8]`.

```rust
use std::fs;
use std::io;

fn guardar_estado(estado: &str) -> io::Result<()> {
    // ¡Cuidado! Si "estado.txt" ya tiene datos, se perderán y serán reemplazados.
    fs::write("estado.txt", estado)?;
    Ok(())
}
```

### Control granular con `std::fs::File` y `OpenOptions`

Las funciones rápidas anteriores son convenientes, pero limitadas. En el desarrollo backend, frecuentemente necesitas añadir datos al final de un archivo (como un log manual) sin borrar el contenido anterior, o necesitas abrir un archivo en modo de solo escritura sin truncarlo. 

Para este nivel de control, instanciamos directamente la estructura `File`.

**Abrir un archivo estándar:**

```rust
use std::fs::File;
use std::io::{self, Read}; // Importamos el trait Read para usar read_to_string sobre el archivo

fn procesar_archivo_manualmente() -> io::Result<()> {
    let mut archivo = File::open("datos.csv")?; // Solo lectura por defecto
    let mut contenido = String::new();
    
    archivo.read_to_string(&mut contenido)?;
    println!("Archivo procesado: {} bytes", contenido.len());
    
    Ok(())
    // El archivo se cierra automáticamente aquí cuando `archivo` sale del scope (Drop trait).
}
```

**Modificando el comportamiento con `OpenOptions`:**
Si necesitas permisos combinados (por ejemplo, crear el archivo si no existe y hacer un *append* de información), `std::fs::OpenOptions` utiliza el patrón *Builder* (que abordaremos a fondo en el Capítulo 28) para configurar exactamente cómo el sistema operativo debe abrir el descriptor de archivo.

```rust
use std::fs::OpenOptions;
use std::io::{self, Write}; // Importamos el trait Write para el método write_all

fn registrar_log(mensaje: &str) -> io::Result<()> {
    let mut archivo = OpenOptions::new()
        .create(true)   // Lo crea si no existe
        .append(true)   // Se posiciona al final del archivo
        .open("aplicacion.log")?;

    // write_all asegura que todos los bytes se escriban o devuelve un error
    archivo.write_all(mensaje.as_bytes())?;
    archivo.write_all(b"\n")?; // Añade un salto de línea
    
    Ok(())
}
```

### Consideraciones importantes para Backend

1.  **Cierre automático (RAII):** En lenguajes como C, Go o Java, es común tener que recordar escribir `file.close()` (o usar `defer`/`try-with-resources`). En Rust, gracias al sistema de Ownership, el archivo se cierra de forma segura y automática a nivel del SO en el instante en que la variable `File` sale de ámbito (scope).
2.  **Rutas:** En los ejemplos anteriores hemos usado literales de cadena (`&str`) para las rutas. Rust los acepta silenciosamente mediante un *Trait* llamado `AsRef<Path>`. Profundizaremos en el manejo idiomático y multiplataforma de rutas en la sección 12.4 con `Path` y `PathBuf`.
3.  **Bloqueo de Hilos:** Es vital recordar que `std::fs` es **síncrono**. Cuando llamas a `fs::read`, el hilo actual del sistema operativo se suspende hasta que el disco magnético o el SSD retorne la información. En un contexto de alta concurrencia, esto se conoce como *Blocking I/O*.

## 12.2 Manejo eficiente con buffers (`BufReader`, `BufWriter`)

En la sección anterior vimos cómo interactuar directamente con los archivos. Sin embargo, cuando construimos aplicaciones backend que procesan grandes volúmenes de datos, realizar operaciones de lectura o escritura directamente sobre el descriptor de archivo (`std::fs::File`) puede convertirse rápidamente en un cuello de botella crítico.

El problema radica en las **llamadas al sistema (system calls)**. Cada vez que le pides al sistema operativo que lea o escriba en el disco, hay un cambio de contexto entre el espacio de usuario (tu aplicación) y el espacio del núcleo (el OS). Si intentas leer un archivo de 1 GB byte a byte usando `File` directamente, ejecutarás mil millones de llamadas al sistema, destruyendo el rendimiento de tu aplicación.

Para solucionar esto, la Standard Library nos ofrece `BufReader` y `BufWriter` en el módulo `std::io`. Estas estructuras actúan como "envoltorios" (wrappers) alrededor de cualquier tipo que implemente los traits `Read` o `Write`, añadiendo una capa de memoria intermedia (buffer) en RAM.

### Lectura optimizada con `BufReader`

`BufReader` lee un bloque grande de datos (típicamente de 8 KB por defecto) del disco en una sola llamada al sistema y lo almacena en memoria. Las lecturas subsecuentes que hace tu código se sirven desde esta memoria rápida hasta que el buffer se vacía, momento en el cual `BufReader` realiza otra llamada al sistema para rellenarlo.

Una de las utilidades más comunes de `BufReader` es la capacidad de procesar archivos línea por línea de forma eficiente, algo esencial al analizar archivos de log (logs) o documentos CSV inmensos que no caben enteros en la memoria RAM.

```rust
use std::fs::File;
use std::io::{self, BufRead, BufReader};

fn procesar_logs_por_linea() -> io::Result<()> {
    let archivo = File::open("servidor_access.log")?;
    
    // Envolvemos el archivo en un BufReader
    let lector = BufReader::new(archivo);

    // El trait BufRead nos provee el método `.lines()`, que devuelve un iterador.
    // Cada iteración nos da un Result<String, io::Error>.
    for linea in lector.lines() {
        let contenido_linea = linea?;
        if contenido_linea.contains("ERROR") {
            println!("Se encontró un error: {}", contenido_linea);
        }
    }

    Ok(())
}
```

### Escritura eficiente con `BufWriter`

De manera inversa, si tu aplicación necesita escribir muchas porciones pequeñas de datos de forma repetitiva (por ejemplo, registrar eventos de telemetría a medida que ocurren), usar `File` directamente machacará el disco.

`BufWriter` intercepta tus peticiones de escritura y las acumula en memoria. Solo cuando el buffer se llena (o cuando se le indica explícitamente), realiza un *volcado* (flush) escribiendo todos los datos acumulados en el disco en una única operación.

```rust
use std::fs::File;
use std::io::{self, BufWriter, Write};

fn generar_reporte_masivo() -> io::Result<()> {
    let archivo = File::create("reporte_mensual.txt")?;
    
    // Envolvemos el archivo en un BufWriter
    let mut escritor = BufWriter::new(archivo);

    // Simulamos la escritura de 100,000 líneas cortas.
    // Sin BufWriter, esto serían 100,000 llamadas al sistema.
    for i in 1..=100_000 {
        writeln!(escritor, "Línea de reporte número {}", i)?;
    }

    // Opcional pero recomendado en contextos críticos: forzar el volcado final.
    escritor.flush()?;

    Ok(())
}
```

### Consideraciones Críticas y "Gotchas"

1.  **El volcado implícito al desechar (Drop):** Cuando un `BufWriter` sale de ámbito, su implementación del trait `Drop` intentará volcar los datos restantes al disco. Sin embargo, **si ocurre un error de I/O durante este volcado automático, el error será silenciado** (ya que los métodos `drop` no pueden devolver un `Result`). Por esta razón, en código backend de producción, es una buena práctica llamar explícitamente a `.flush()` o `.into_inner()` antes de que la variable salga de ámbito para poder manejar cualquier posible error.
2.  **No uses buffers si no los necesitas:** Si vas a leer todo el contenido de un archivo de golpe en un `String` o un `Vec<u8>` usando `fs::read_to_string` o `fs::read` (como vimos en 12.1), **no uses** `BufReader`. Esas funciones ya están altamente optimizadas por el sistema operativo para alojar la memoria necesaria y leer el archivo de la forma más rápida posible. Añadir un `BufReader` en ese caso solo agregaría una capa de copia de memoria innecesaria.
3.  **Tamaño de buffer personalizado:** Si los 8 KB por defecto no se ajustan a tu caso de uso (por ejemplo, estás procesando bloques de datos multimedia muy grandes), puedes usar `BufReader::with_capacity(tamaño_en_bytes, archivo)` para definir el tamaño exacto del buffer en RAM.

## 12.3 Interacción con la entrada y salida estándar (`stdin`, `stdout`)

Aunque el núcleo de una aplicación backend moderna suele comunicarse a través de la red (HTTP, gRPC, WebSockets), la interacción con la terminal sigue siendo un pilar fundamental. Ya sea que estés construyendo una utilidad de línea de comandos (CLI) para migraciones de bases de datos, un script de mantenimiento, o simplemente diseñando cómo tu aplicación registra sus logs en un contenedor Docker, necesitas dominar los flujos estándar (Standard Streams).

El módulo `std::io` proporciona acceso global a estos tres flujos fundamentales: **entrada estándar** (`stdin`), **salida estándar** (`stdout`) y **error estándar** (`stderr`).

### Escribiendo a la consola: `stdout` y `stderr`

En Rust, rara vez interactúas con los descriptores de salida de forma cruda. En su lugar, el lenguaje ofrece macros altamente optimizadas y seguras para formatear texto.

* **`stdout` (Salida esperada):** Se utiliza para la salida normal de tu programa o los datos solicitados. Para escribir aquí, usamos las macros `print!` y `println!`.
* **`stderr` (Diagnósticos y Errores):** Se utiliza exclusivamente para advertencias, errores y mensajes de depuración. Se accede mediante `eprint!` y `eprintln!`.

> **El contexto del Backend Developer:** Es vital separar `stdout` y `stderr`. Si tu aplicación se ejecuta dentro de un contenedor en Kubernetes o Docker, los orquestadores y recolectores de logs (como FluentBit o Datadog) capturan estos flujos. Si envías un volcado de error crítico a `stdout` mediante `println!`, tu sistema de monitoreo podría clasificarlo erróneamente como un evento normal de la aplicación.

```rust
fn iniciar_servidor(puerto: u16) {
    // Información normal, va a stdout
    println!("Iniciando el servidor en el puerto {}...", puerto);

    if puerto <= 1024 {
        // Advertencia de permisos, debe ir a stderr
        eprintln!("ADVERTENCIA: Usar puertos privilegiados requiere permisos de administrador.");
    }
}
```

### Leyendo desde `stdin`

Para aplicaciones CLI interactivas, necesitarás solicitar información al usuario. El manejador global `std::io::stdin()` nos permite leer esta entrada. 

El método más común es `read_line`, el cual añade el texto introducido (incluyendo el salto de línea `\n` o `\r\n`) a un `String` existente.

```rust
use std::io;

fn solicitar_confirmacion() -> io::Result<bool> {
    println!("¿Desea aplicar las migraciones a la base de datos? (s/N): ");
    
    let mut buffer = String::new();
    // Leemos la entrada del usuario
    io::stdin().read_line(&mut buffer)?;
    
    // .trim() es crucial para eliminar el salto de línea invisible
    let confirmacion = buffer.trim().to_lowercase();
    
    Ok(confirmacion == "s")
}
```

### Rendimiento Extremo: Bloqueo de Flujos (Locking)

Aquí es donde entra el conocimiento de nivel Senior. Las macros `println!` y los métodos como `read_line()` son **seguros para hilos (thread-safe)** por defecto. Esto significa que si tienes 10 hilos intentando imprimir en la consola al mismo tiempo, Rust garantiza que los mensajes no se mezclarán en un galimatías incomprensible.

Sin embargo, esta seguridad tiene un costo: **cada llamada adquiere y libera un bloqueo (Mutex) sobre el flujo estándar**. Si estás procesando un millón de líneas de un archivo CSV inyectado a tu script a través de un *pipe* (`cat datos.csv | mi_script_rust`), adquirir un Mutex un millón de veces hundirá el rendimiento de tu aplicación.

Para solucionar esto, Rust nos permite adquirir el bloqueo manualmente *una sola vez* usando el método `.lock()`.

**Lectura de alto rendimiento desde stdin:**

Al bloquear `stdin`, obtenemos un `StdinLock`, el cual implementa el trait `BufRead` (similar a lo que vimos con `BufReader` en la sección 12.2), permitiéndonos procesar la entrada de forma extremadamente eficiente.

```rust
use std::io::{self, BufRead};

fn procesar_pipe_masivo() -> io::Result<()> {
    let stdin = io::stdin();
    
    // Adquirimos el bloqueo (lock) una única vez.
    // Esto suspende el acceso de otros hilos a stdin hasta que 'handle' salga de ámbito.
    let handle = stdin.lock();

    // Ahora iteramos sin la penalización de rendimiento del Mutex constante
    for linea in handle.lines() {
        let contenido = linea?;
        // Lógica de procesamiento de datos...
        if contenido.is_empty() { break; }
    }

    Ok(())
}
```

**Escritura de alto rendimiento a stdout:**

De la misma manera, si tu programa debe escupir gigabytes de datos generados hacia otro proceso a través de la terminal, debes bloquear `stdout` y utilizar el trait `Write`.

```rust
use std::io::{self, Write};

fn exportar_datos_rapido() -> io::Result<()> {
    let stdout = io::stdout();
    let mut handle = stdout.lock(); // Adquirimos el bloqueo

    for i in 0..100_000 {
        // Usamos writeln! sobre el handle bloqueado en lugar de println!
        writeln!(handle, "Fila exportada número: {}", i)?;
    }

    Ok(())
}
```

## 12.4 Rutas de archivos multiplataforma (`std::path::Path` y `PathBuf`)

Hasta ahora, en los ejemplos de este capítulo hemos utilizado literales de cadena (`&str`) como `"config.json"` o `"datos.csv"` para referirnos a los archivos. Para scripts rápidos o pruebas, esto es aceptable. Sin embargo, en un entorno de backend profesional, construir rutas concatenando cadenas (`directorio + "/" + archivo`) es un anti-patrón peligroso.

Los sistemas operativos manejan las rutas de manera diferente:
1. **Separadores:** Unix (Linux/macOS) utiliza `/`, mientras que Windows utiliza `\`.
2. **Codificación:** Mientras que las cadenas en Rust (`String` y `&str`) están estrictamente codificadas en UTF-8 válido, las rutas en los sistemas operativos no tienen esta garantía. Windows, por ejemplo, utiliza secuencias de 16 bits (similares a UTF-16) que pueden contener texto inválido, y Linux permite casi cualquier secuencia de bytes excepto nulos y `/`.

Para resolver estas inconsistencias de forma segura, la Standard Library de Rust proporciona el módulo `std::path`, centrado en dos tipos fundamentales: `Path` y `PathBuf`.

### La dualidad: `Path` vs `PathBuf`

Si recuerdas el Capítulo 6 ("Representaciones de texto: `String` vs `&str`"), la relación entre `Path` y `PathBuf` te resultará idéntica:

* **`PathBuf` (El Propietario):** Es el equivalente a `String` (y a `Vec<T>`). Es dueño de sus datos, puede crecer, mutar y asigna memoria en el montículo (Heap). Lo usarás cuando necesites construir o modificar una ruta paso a paso.
* **`&Path` (La Referencia):** Es el equivalente a `&str` (y a `&[T]`). Es una vista inmutable y prestada (borrowed) de una ruta. Se utiliza en las firmas de las funciones para aceptar cualquier cosa que pueda comportarse como una ruta de manera eficiente, sin obligar al llamador a asignar memoria.

### Construcción segura de rutas

La mayor ventaja de utilizar `PathBuf` es que se encarga automáticamente de insertar los separadores correctos según el sistema operativo donde se esté compilando y ejecutando el código.

```rust
use std::path::PathBuf;

fn construir_ruta_upload(usuario_id: u32, nombre_archivo: &str) -> PathBuf {
    // Creamos un PathBuf base
    let mut ruta = PathBuf::from("/var/www/uploads");
    
    // push() añade elementos usando el separador nativo del SO.
    // En Linux: /var/www/uploads/usuarios/123/avatar.png
    // En Windows: \var\www\uploads\usuarios\123\avatar.png
    ruta.push("usuarios");
    ruta.push(usuario_id.to_string());
    ruta.push(nombre_archivo);
    
    ruta
}
```

También puedes usar el método `.join()`, el cual es inmutable y retorna un nuevo `PathBuf`, ideal para encadenamiento funcional:

```rust
use std::path::{Path, PathBuf};

fn obtener_ruta_config(directorio_base: &Path) -> PathBuf {
    // join() crea un nuevo PathBuf combinando ambos fragmentos
    directorio_base.join("config").join("app.toml")
}
```

*Nota para Backend:* La mayoría de las funciones de `std::fs` (como `File::open`) y de frameworks web (como Axum o Actix) aceptan cualquier tipo que implemente el trait `AsRef<Path>`. Esto significa que puedes pasarles un `&str`, un `String`, un `PathBuf` o un `&Path` y todo funcionará mágicamente gracias al sistema de Traits que vimos en el Capítulo 7.

### Interrogación y manipulación de metadatos

El tipo `Path` expone decenas de métodos útiles para extraer información de una ruta sin tener que hacer malabares con expresiones regulares o manipulación manual de cadenas. Esto es vital cuando procesas archivos subidos por usuarios.

```rust
use std::path::Path;

fn analizar_archivo_subido(ruta_str: &str) {
    let ruta = Path::new(ruta_str);

    // 1. ¿Existe el archivo en el disco?
    if !ruta.exists() {
        println!("El archivo no existe en el sistema.");
        return;
    }

    // 2. ¿Es un archivo o un directorio?
    if ruta.is_dir() {
        println!("Error: Se esperaba un archivo, pero se recibió un directorio.");
        return;
    }

    // 3. Extraer el nombre del archivo (sin la ruta completa)
    // Retorna un Option<&OsStr>, ya que podría no tener nombre válido o no ser UTF-8
    if let Some(nombre) = ruta.file_name() {
        // Convertimos de OsStr (del sistema) a &str (de Rust) con .to_string_lossy()
        println!("Procesando: {}", nombre.to_string_lossy());
    }

    // 4. Validar la extensión para seguridad básica
    match ruta.extension().and_then(|ext| ext.to_str()) {
        Some("json") | Some("yaml") => println!("Formato de configuración aceptado."),
        Some("exe") | Some("sh") => println!("¡Alerta de seguridad! Ejecutable bloqueado."),
        _ => println!("Formato desconocido."),
    }
}
```

### El tipo `OsStr` y `OsString`

Habrás notado en el ejemplo anterior el uso de `.to_string_lossy()`. Dado que, como mencionamos, las rutas del sistema operativo no garantizan ser UTF-8 válido, los métodos de `Path` que extraen texto (como `file_name()` o `extension()`) no devuelven `&str` ni `String`. En su lugar, devuelven `&OsStr` (o `OsString` en su versión con propiedad). 

El tipo `OsStr` es la abstracción de Rust para "texto del sistema operativo". Cuando necesitas imprimirlo o usarlo en el resto de tu aplicación Rust, debes convertirlo. Usar `.to_str()` devuelve un `Option<&str>` (retornando `None` si la ruta contiene bytes no válidos para UTF-8), mientras que `.to_string_lossy()` fuerza la conversión reemplazando los caracteres inválidos con el carácter de reemplazo Unicode (``), garantizando que la aplicación no sufra un pánico (panic).

Con esto concluimos el **Capítulo 12**. Hemos pasado desde las operaciones de lectura/escritura directas y el manejo cuidadoso de la memoria con buffers, hasta la interacción con los flujos de la terminal y la estructuración segura de rutas. En el **Capítulo 13**, daremos el salto del sistema de archivos local a la red, explorando las conexiones TCP y UDP en la Standard Library.