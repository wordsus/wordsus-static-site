El desarrollo backend moderno es, en esencia, comunicación. En este capítulo exploramos las herramientas nativas que Rust ofrece en `std::net` para interactuar con la red. Comenzamos con **TCP**, el protocolo de transporte confiable que sostiene a la web, analizando la gestión de servidores con `TcpListener` y flujos de datos con `TcpStream`. Luego, abordamos la velocidad y ligereza de **UDP** mediante `UdpSocket`. Finalmente, elevamos el nivel analizando la resolución DNS y el ajuste fino de sockets para optimizar latencia y rendimiento. Este capítulo sienta las bases síncronas necesarias para entender por qué y cuándo debemos dar el salto hacia el modelo asíncrono.

## 13.1 Conexiones TCP (`TcpListener`, `TcpStream`)

Hasta este punto del libro, hemos interactuado principalmente con la memoria local y el sistema de archivos (Capítulo 12). Sin embargo, en el desarrollo backend, la comunicación a través de la red es el núcleo de nuestro trabajo. La Standard Library de Rust nos proporciona el módulo `std::net` para manejar redes de forma nativa. 

En esta sección, nos enfocaremos en el Protocolo de Control de Transmisión (TCP), el cual es la base de la mayoría de los protocolos de la capa de aplicación, como HTTP o WebSockets. Rust maneja las conexiones TCP síncronas principalmente a través de dos estructuras: `TcpListener` (para el servidor) y `TcpStream` (para la conexión en sí).

> **Nota arquitectónica:** Lo que veremos aquí es I/O de red **síncrono** y bloqueante. Aunque en el Capítulo 32 (Ecosistema Asíncrono) veremos que frameworks como Tokio utilizan versiones asíncronas de estas mismas estructuras, los conceptos fundamentales, los nombres y la semántica son idénticos. Entender `std::net` es un requisito indispensable para dominar su contraparte asíncrona.

### El Servidor: `TcpListener`

Para que una aplicación backend pueda recibir conexiones, necesita "escuchar" en un puerto específico de una interfaz de red. Para esto utilizamos `TcpListener`.

El flujo básico para levantar un servidor TCP es:
1. Enlazar (bind) el listener a una dirección IP y un puerto.
2. Escuchar las conexiones entrantes (incoming).
3. Aceptar y procesar cada conexión.

Veamos cómo se implementa este flujo:

```rust
use std::net::TcpListener;

fn main() -> std::io::Result<()> {
    // 1. Enlazamos el servidor al localhost en el puerto 8080.
    // Usamos el operador `?` (Capítulo 5) para propagar posibles errores de red.
    let listener = TcpListener::bind("127.0.0.1:8080")?;

    println!("Servidor escuchando en el puerto 8080...");

    // 2. Iteramos sobre las conexiones entrantes.
    // El método `incoming()` devuelve un iterador que bloquea el hilo actual
    // hasta que un nuevo cliente intente conectarse.
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                // 3. Procesamos la conexión exitosa.
                println!("¡Nueva conexión establecida desde: {}!", stream.peer_addr()?);
                // Aquí pasaríamos el stream a una función para manejarlo
            }
            Err(e) => {
                eprintln!("Error al establecer la conexión: {}", e);
            }
        }
    }

    Ok(())
}
```

### La Conexión: `TcpStream`

Una vez que el `TcpListener` acepta una conexión, nos devuelve una instancia de `TcpStream`. Esta estructura representa el "tubo" de comunicación bidireccional entre el cliente y el servidor.

Si recuerdas el Capítulo 12, los traits `Read` y `Write` del módulo `std::io` son la abstracción estándar de Rust para operaciones de entrada y salida. `TcpStream` implementa ambos traits, lo que significa que puedes leer datos de la red y escribir en ella usando exactamente los mismos métodos que usas para leer o escribir en un archivo.

Vamos a expandir nuestro servidor anterior para que reciba datos y responda con una cabecera HTTP básica válida.

```rust
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

fn handle_client(mut stream: TcpStream) {
    // Creamos un buffer temporal en la pila para almacenar los datos entrantes.
    let mut buffer = [0; 1024];

    // Leemos los datos enviados por el cliente.
    if let Ok(bytes_read) = stream.read(&mut buffer) {
        if bytes_read == 0 {
            return; // El cliente cerró la conexión
        }

        println!("Petición recibida:\n{}", String::from_utf8_lossy(&buffer[..bytes_read]));

        // Preparamos una respuesta HTTP hardcodeada.
        let response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n¡Hola desde el backend en Rust!";
        
        // Escribimos la respuesta de vuelta en el stream.
        if let Err(e) = stream.write_all(response.as_bytes()) {
            eprintln!("Error enviando la respuesta: {}", e);
        }
    }
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080")?;
    
    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            // Nota de diseño: Esta llamada es bloqueante.
            // El servidor no podrá aceptar una segunda conexión hasta que
            // handle_client termine. Resolveremos esto en el Capítulo 14 con hilos.
            handle_client(stream);
        }
    }
    
    Ok(())
}
```

**Manejo de recursos (Semántica de Ownership):** No necesitas cerrar manualmente la conexión TCP en Rust. Cuando la variable `stream` sale del ámbito de la función `handle_client` y se descarta (drop), Rust automáticamente cierra el socket de red y libera los recursos del sistema operativo gracias a las reglas de Ownership que vimos en el Capítulo 4.

### El Cliente: Conectándose a un Servidor

Aunque como desarrolladores backend pasamos la mayor parte del tiempo escribiendo servidores, a menudo necesitamos construir clientes para comunicarnos con otras APIs, bases de datos o microservicios. 

Para actuar como cliente, utilizamos el método `connect` de `TcpStream`. Este método intenta resolver la dirección y establecer el handshake de TCP con el servidor remoto.

```rust
use std::io::{Read, Write};
use std::net::TcpStream;

fn main() -> std::io::Result<()> {
    // Intentamos conectar al servidor que acabamos de crear.
    let mut stream = TcpStream::connect("127.0.0.1:8080")?;
    println!("Conectado al servidor de forma exitosa.");

    // Enviamos una petición simulada.
    let request = "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";
    stream.write_all(request.as_bytes())?;

    // Leemos la respuesta.
    let mut buffer = [0; 512];
    let bytes_read = stream.read(&mut buffer)?;
    
    let response = String::from_utf8_lossy(&buffer[..bytes_read]);
    println!("Respuesta del servidor:\n{}", response);

    Ok(())
}
```

### Consideraciones Clave para un Senior

Al trabajar directamente con `std::net`, hay comportamientos internos que debes dominar para evitar caídas en producción:

* **Bloqueo de Hilos:** En su configuración por defecto, llamadas como `read` esperarán indefinidamente hasta que lleguen datos, o hasta que el otro extremo cierre la conexión. Puedes configurar tiempos de espera (timeouts) usando `stream.set_read_timeout()` y `stream.set_write_timeout()` para evitar ataques de denegación de servicio por conexiones colgadas (Slowloris).
* **Lecturas Parciales:** Un error muy común en juniors es asumir que una sola llamada a `read()` traerá todo el mensaje enviado por el cliente. TCP es un protocolo basado en flujos (streams), no en mensajes. Los paquetes pueden fragmentarse. Si necesitas garantizar la lectura completa de un payload estructurado, debes implementar un buffer de lectura cíclica o utilizar utilidades como `BufReader` (que cubrimos en el Capítulo 12).

## 13.2 Comunicación UDP (`UdpSocket`)

Mientras que TCP es el equivalente informático a una llamada telefónica —donde se establece una conexión previa, se garantiza el orden de los mensajes y se confirma la recepción—, el Protocolo de Datagramas de Usuario (UDP) es más parecido a enviar una postal por correo tradicional. 

UDP es un protocolo "sin conexión" (connectionless). No garantiza que los paquetes (datagramas) lleguen a su destino, ni que lleguen en el mismo orden en que fueron enviados, ni evita que lleguen duplicados. A cambio de sacrificar estas garantías, UDP elimina el *overhead* del *handshake* inicial y de la validación constante de paquetes, ofreciendo una transmisión de datos extremadamente rápida y ligera.

Como desarrollador backend, elegirás UDP para sistemas donde la velocidad o la frescura del dato es más importante que la fiabilidad absoluta: servidores de videojuegos multijugador en tiempo real, transmisión de video/audio, consultas DNS, o el envío masivo de métricas y logs internos (como StatsD).

### El paradigma unificado: `UdpSocket`

A diferencia de TCP, donde usábamos `TcpListener` para el servidor y `TcpStream` para la conexión, en UDP no existe el concepto de una "conexión abierta". Por lo tanto, tanto el emisor como el receptor utilizan exactamente la misma estructura: `std::net::UdpSocket`.

Cualquier socket UDP puede enviar datagramas a cualquier dirección y, simultáneamente, recibir datagramas de múltiples orígenes distintos.

Veamos cómo implementaríamos un servidor UDP simple que recibe mensajes y responde confirmando su recepción:

```rust
use std::net::UdpSocket;

fn main() -> std::io::Result<()> {
    // 1. Enlazamos el socket a un puerto específico para escuchar.
    let socket = UdpSocket::bind("127.0.0.1:8081")?;
    println!("Servidor UDP escuchando en el puerto 8081...");

    // Creamos un buffer estático. En UDP, el tamaño importa mucho.
    let mut buffer = [0; 1024];

    loop {
        // 2. recv_from bloquea el hilo hasta recibir un datagrama.
        // Nos devuelve la cantidad de bytes leídos y la dirección (IP:Puerto) del remitente.
        let (bytes_read, src_addr) = socket.recv_from(&mut buffer)?;
        
        let data = String::from_utf8_lossy(&buffer[..bytes_read]);
        println!("Recibidos {} bytes de {}: {}", bytes_read, src_addr, data);

        // 3. Usamos send_to para enviar una respuesta de vuelta al origen.
        let response = b"Datagrama recibido correctamente";
        socket.send_to(response, src_addr)?;
    }
}
```

### Actuando como cliente UDP

El cliente UDP es prácticamente idéntico. La única diferencia radica en cómo configuramos el puerto local. Como normalmente no nos importa desde qué puerto local enviamos la petición, podemos dejar que el sistema operativo asigne uno aleatorio enlazando el socket al puerto `0`.

```rust
use std::net::UdpSocket;

fn main() -> std::io::Result<()> {
    // Al usar el puerto 0, el OS nos asigna un puerto efímero libre.
    let socket = UdpSocket::bind("127.0.0.1:0")?;

    // Enviamos nuestro datagrama directamente a la dirección del servidor.
    let mensaje = b"Hola servidor UDP, soy un cliente rustaceo!";
    socket.send_to(mensaje, "127.0.0.1:8081")?;
    println!("Datagrama enviado.");

    // Esperamos la respuesta.
    let mut buffer = [0; 512];
    let (bytes_read, _src_addr) = socket.recv_from(&mut buffer)?;

    println!("Respuesta del servidor: {}", String::from_utf8_lossy(&buffer[..bytes_read]));

    Ok(())
}
```

### El método `connect` en UDP (Sintaxis Avanzada)

Un patrón que a veces confunde a los desarrolladores intermedios es ver el método `connect` utilizado en un `UdpSocket`. 

```rust
// Esto NO establece una conexión real en la red
socket.connect("127.0.0.1:8081")?;
socket.send(b"Mensaje directo")?;
```

Dado que UDP no tiene estado de conexión, `UdpSocket::connect()` en Rust **no se comunica por red**. Lo único que hace es configurar internamente una "dirección de destino por defecto" a nivel del sistema operativo. Una vez conectado, puedes usar los métodos más ergonómicos `send` y `recv` en lugar de `send_to` y `recv_from`. Además, el socket filtrará y solo aceptará datagramas entrantes que provengan de esa dirección específica.

### Consideraciones Clave para un Senior

Trabajar con UDP a bajo nivel requiere gestionar manualmente problemas que TCP resuelve por ti:

1. **Truncamiento silencioso:** Si el servidor recibe un datagrama de 2048 bytes, pero tu buffer de `recv_from` (como en nuestro ejemplo) es de solo 1024 bytes, los 1024 bytes restantes **se descartan y se pierden para siempre**. Rust no emitirá un error; simplemente te devolverá los primeros 1024 bytes. Siempre debes dimensionar tus buffers adecuadamente (típicamente se usa un tamaño ligeramente inferior a la MTU de la red, como 1472 bytes para IPv4, para evitar fragmentación IP).
2. **Reintentos y Timeouts:** Como `recv_from` puede bloquearse eternamente si un paquete se pierde en el camino, es imperativo configurar `socket.set_read_timeout(Some(duracion))` si estás esperando una respuesta crítica.
3. **Orden y Reensamblaje:** Si necesitas enviar un archivo grande por UDP, tendrás que dividirlo, asignarle un número de secuencia a cada pedazo en el payload, y reescribir la lógica para reensamblarlo y solicitar los trozos perdidos. (Si te ves haciendo esto, probablemente deberías estar usando TCP o un protocolo como QUIC).

## 13.3 Resolución de direcciones IP y manipulación de Sockets

En los ejemplos anteriores de TCP y UDP, utilizamos cadenas de texto estáticas como `"127.0.0.1:8080"` para conectarnos o levantar un servidor. En el mundo real, los backends raramente operan exclusivamente con direcciones IP hardcodeadas; interactuamos con dominios, balanceadores de carga y entornos con soporte dual para IPv4 e IPv6.

Para manejar esto, la Standard Library de Rust nos ofrece un sistema de tipos robusto para representar direcciones y un trait fundamental para la resolución de nombres (DNS).

### El Trait `ToSocketAddrs` y Resolución DNS

El secreto detrás de por qué pudimos pasar un `&str` a funciones como `TcpStream::connect` radica en el trait `std::net::ToSocketAddrs`. Este trait convierte representaciones de direcciones (como cadenas de texto o tuplas) en un iterador de estructuras `SocketAddr` (que combinan una IP y un puerto).

Cuando le pasas un dominio a una función que requiere `ToSocketAddrs`, Rust realiza una **resolución DNS síncrona** utilizando las llamadas nativas del sistema operativo. 

```rust
use std::net::{TcpStream, ToSocketAddrs};

fn main() -> std::io::Result<()> {
    let dominio = "www.rust-lang.org:443";
    
    // Podemos resolver las direcciones manualmente para inspeccionarlas
    println!("Resolviendo direcciones para {}...", dominio);
    for addr in dominio.to_socket_addrs()? {
        println!("- IP resuelta: {}", addr);
        // addr será de tipo SocketAddr (puede contener una IPv4 o IPv6)
    }

    // O dejar que connect lo haga por debajo.
    // Intentará conectarse a la primera IP del iterador, y si falla, 
    // pasará a la siguiente automáticamente.
    let _stream = TcpStream::connect(dominio)?;
    println!("¡Conexión exitosa!");

    Ok(())
}
```

> **Advertencia de rendimiento:** Dado que la resolución DNS a través de `ToSocketAddrs` depende del sistema operativo, **es una operación bloqueante**. En un servidor altamente concurrente, resolver dominios dinámicamente en el hilo principal puede degradar severamente el rendimiento. En los capítulos de Tokio (Parte VIII), veremos cómo realizar esto de forma asíncrona.

### Representación Estricta: `IpAddr` y `SocketAddr`

En lugar de usar cadenas de texto que pueden estar mal formateadas, Rust nos anima a usar sus tipos estrictos para garantizar la validez en tiempo de compilación o al parsear la configuración inicial de nuestro servidor:

* `Ipv4Addr` e `Ipv6Addr`: Representan las direcciones base.
* `IpAddr`: Es un enum que contiene la variante `V4` o `V6`.
* `SocketAddr`: Combina un `IpAddr` con un número de puerto (un `u16`).

```rust
use std::net::{IpAddr, Ipv4Addr, SocketAddr};

// Construcción manual y segura
let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
let puerto = 8080;
let direccion = SocketAddr::new(ip, puerto);

// Parseo seguro desde configuración (ej. variables de entorno)
let addr_parseada: SocketAddr = "192.168.1.100:5432".parse()
    .expect("El formato de la dirección IP es inválido");
```

### Manipulación Avanzada de Sockets (Tuning)

Una vez que tienes un `TcpStream` o un `UdpSocket`, puedes alterar su comportamiento interactuando con las opciones de socket del sistema operativo subyacente. Esto es crítico en sistemas distribuidos.

#### 1. Desactivar el Algoritmo de Nagle (`TCP_NODELAY`)
Por defecto, TCP utiliza el algoritmo de Nagle, el cual agrupa paquetes pequeños en uno más grande antes de enviarlos a la red para ahorrar ancho de banda. Si estás programando un backend para un videojuego en tiempo real o un sistema de trading financiero donde la latencia es más importante que el ancho de banda, **debes** desactivarlo.

```rust
let stream = TcpStream::connect("127.0.0.1:8080")?;
// Envía los paquetes inmediatamente, sin importar su tamaño
stream.set_nodelay(true)?; 
```

#### 2. Configurar el Time-To-Live (TTL)
El TTL define cuántos "saltos" (routers) puede atravesar tu paquete antes de que la red lo descarte. Si estás diseñando herramientas de red (como un traceroute) o te comunicas estrictamente dentro de una subred local, ajustar el TTL es una práctica común.

```rust
stream.set_ttl(64)?; // Limita los saltos a 64
```

#### 3. I/O No Bloqueante Básico
Aunque la librería estándar es síncrona, puedes configurar un socket para que retorne un error inmediatamente en lugar de bloquear el hilo si no hay datos listos. Esta es la base de cómo funcionan las librerías asíncronas por debajo.

```rust
stream.set_nonblocking(true)?;
// Ahora, stream.read() devolverá un error del tipo std::io::ErrorKind::WouldBlock 
// si no hay datos entrantes en lugar de pausar el programa.
```

### El límite de `std::net` y el crate `socket2`

**Perspectiva Senior:** La librería estándar de Rust (`std::net`) es deliberadamente conservadora y oculta mucha de la complejidad del sistema operativo. Sin embargo, tiene un límite arquitectónico importante: **no te permite configurar opciones de socket *antes* de enlazarlos (bind)**.

Por ejemplo, un problema muy común en desarrollo backend es reiniciar un servidor que se acaba de caer y obtener un error `Address already in use` (EADDRINUSE). Para evitarlo, a nivel de SO, necesitas activar la flag `SO_REUSEADDR` en el socket *antes* de llamar a `bind`. Con `std::net`, esto es imposible porque `TcpListener::bind` crea y enlaza el socket en un solo paso.

Para superar este límite, el ecosistema de Rust utiliza el crate **`socket2`**. Este crate te da acceso de bajo nivel a las primitivas de red de POSIX/Windows, permitiéndote crear el socket, configurarlo (`SO_REUSEADDR`, `SO_REUSEPORT`), enlazarlo y luego convertirlo de forma segura en un `TcpListener` o `TcpStream` estándar.

## 13.4 Limitaciones de Redes Síncronas

Hasta ahora hemos explorado cómo utilizar `std::net` para crear servidores y clientes TCP/UDP. Si ejecutas los ejemplos anteriores, notarás un comportamiento fundamental: son **bloqueantes**. Cuando llamas a `stream.read()`, el hilo de ejecución del sistema operativo se detiene por completo hasta que lleguen datos a través de la tarjeta de red.

En un script o en una herramienta interna pequeña, esto no es un problema. Sin embargo, para un desarrollador backend que aspira a nivel Senior, es crucial entender por qué el modelo síncrono estándar se desmorona cuando intentamos escalar a miles de conexiones simultáneas.

### El Modelo "Un Hilo por Conexión" (Thread-per-Connection)

Si nuestro servidor síncrono bloquea el hilo al procesar a un cliente, la solución más intuitiva para atender a múltiples clientes simultáneamente es delegar cada nueva conexión a un hilo independiente del sistema operativo.

Usando la librería estándar, esto se vería así:

```rust
use std::net::TcpListener;
use std::thread;

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080")?;
    println!("Servidor concurrente escuchando en el puerto 8080...");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                // Generamos un nuevo hilo del SO para cada cliente
                thread::spawn(move || {
                    // handle_client(stream); 
                    println!("Atendiendo cliente en un nuevo hilo.");
                });
            }
            Err(e) => eprintln!("Error de conexión: {}", e),
        }
    }
    Ok(())
}
```

Este es el modelo de concurrencia clásico que utilizaban servidores como las primeras versiones de Apache. Aunque funciona y es fácil de razonar mentalmente, presenta tres limitaciones arquitectónicas severas conocidas históricamente como el problema **C10K** (manejar 10.000 conexiones concurrentes).

#### 1. Consumo Excesivo de Memoria
Cada vez que invocas `thread::spawn`, el sistema operativo debe reservar un bloque contiguo de memoria para la pila (stack) del nuevo hilo. En Linux, el tamaño por defecto de la pila de un hilo suele ser de 2 MB (o hasta 8 MB en algunos entornos). 

Si tu servidor recibe 10.000 conexiones simultáneas (un número trivial para un backend moderno), el sistema operativo necesitará reservar **20 Gigabytes de memoria RAM exclusivamente para mantener las pilas de los hilos**, incluso si esos clientes están inactivos y no están enviando datos.

#### 2. Overhead de Cambio de Contexto (Context Switching)
Cuando tienes más hilos activos que núcleos físicos en tu CPU, el sistema operativo tiene que repartir el tiempo de ejecución entre ellos. Este proceso de pausar un hilo, guardar su estado en memoria, cargar el estado de otro hilo y reanudarlo se llama "cambio de contexto".

A medida que el número de hilos crece, el planificador (scheduler) del sistema operativo empieza a consumir más ciclos de CPU decidiendo qué hilo ejecutar que ejecutando tu código de negocio real. El rendimiento de tu servidor colapsa bajo su propio peso.

#### 3. Latencia Inducida por I/O
Las operaciones de red son tareas ligadas a la entrada/salida (*I/O bound*), no a la CPU (*CPU bound*). La mayor parte del tiempo, un hilo que maneja un socket no está calculando nada; simplemente está "durmiendo" a la espera de que los electrones viajen por un cable de fibra óptica. Desperdiciar un costoso hilo del sistema operativo para que se quede de brazos cruzados esperando la red es altamente ineficiente.

### El Camino Hacia la Asincronía

El modelo bloqueante de `std::net` es robusto, seguro y perfecto para operaciones simples. No obstante, las limitaciones descritas son la razón exacta por la que los lenguajes modernos y los backends de alto rendimiento han adoptado la **I/O Asíncrona**.

En lugar de tener un hilo bloqueado por cada conexión, los sistemas asíncronos configuran los sockets en modo no bloqueante (como vimos brevemente en la sección 13.3) y delegan la vigilancia de miles de sockets a una única API ultraeficiente del sistema operativo (como `epoll` en Linux o `kqueue` en macOS). 

En el ecosistema de Rust, no construimos este complejo bucle de eventos desde cero cada vez. Utilizamos *runtimes* asíncronos como **Tokio**. Sin embargo, antes de saltar a la asincronía en la Parte VIII del libro, debemos entender cómo manejar el estado compartido y dominar las herramientas de sincronización tradicionales.
