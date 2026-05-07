En arquitecturas de microservicios de alto rendimiento, la eficiencia en el intercambio de datos es innegociable. Mientras REST y JSON dominan la web pública por su flexibilidad, la comunicación interna exige mayor velocidad, menor consumo de ancho de banda y contratos estrictos. Aquí es donde **gRPC** se posiciona como el estándar de la industria.

En este capítulo, exploraremos cómo Rust, a través del crate `tonic`, se integra con **Protocol Buffers (Protobuf)** para construir APIs tipadas, seguras y extremadamente rápidas. Aprenderás a definir interfaces mediante un IDL, implementar servidores asíncronos con el runtime de Tokio y dominar flujos de datos complejos mediante streaming bidireccional y middleware especializado.

## 33.1 Protocol Buffers (Protobuf) e IDL

En el Capítulo 15 exploramos cómo construir APIs RESTful utilizando JSON como formato principal de intercambio de datos. Aunque JSON es el estándar de facto para la comunicación entre el frontend y el backend por su legibilidad, presenta ineficiencias críticas cuando hablamos de comunicación interna entre microservicios: es pesado, carece de un esquema estricto por defecto y su serialización/deserialización consume considerables ciclos de CPU. 

Para resolver esto en arquitecturas distribuidas de alto rendimiento, utilizamos **RPC (Remote Procedure Call)** apoyado por un **IDL (Interface Definition Language)**. En el ecosistema moderno, la combinación ganadora es gRPC con **Protocol Buffers (Protobuf)**.

### ¿Qué es un IDL?

Un IDL, o Lenguaje de Definición de Interfaces, es un contrato agnóstico al lenguaje de programación. Permite definir de manera estricta los servicios, los métodos disponibles y las estructuras de datos (mensajes) que un sistema expone. 

Al centralizar la definición de la API en un archivo IDL, puedes compilar este contrato para generar automáticamente el código base (estructuras, traits y clientes) en múltiples lenguajes. Esto significa que un microservicio escrito en Rust puede comunicarse de forma transparente con uno escrito en Go o Node.js, garantizando que ambos compartan exactamente la misma definición de tipos en tiempo de compilación.

### Protocol Buffers: El Estándar de Serialización

Protocol Buffers (comúnmente llamado Protobuf) es el IDL y formato de serialización binaria desarrollado por Google. A diferencia de JSON, Protobuf serializa los datos en un flujo binario altamente comprimido. No incluye los nombres de las claves en el payload (como hace `{"nombre": "Alice"}`), sino que utiliza **etiquetas numéricas** posicionales.

#### Sintaxis de un archivo `.proto`

En el ecosistema gRPC, trabajarás con la versión `proto3`. Veamos cómo se define un contrato típico orientando a un servicio de pagos:

```protobuf
// proto/pagos.proto

// Siempre declaramos la versión de la sintaxis
syntax = "proto3";

// El paquete ayuda a evitar colisiones de nombres entre diferentes proyectos
package pagos.v1;

// Definición de un enumerador
enum Moneda {
  MONEDA_UNSPECIFIED = 0; // En proto3, la primera variante SIEMPRE debe ser 0
  MONEDA_USD = 1;
  MONEDA_EUR = 2;
  MONEDA_ARS = 3;
}

// Un mensaje es equivalente a un Struct en Rust
message SolicitudPago {
  // tipo | nombre_campo = etiqueta_numerica;
  string id_usuario = 1;
  double monto = 2;
  Moneda moneda = 3;
}

message RespuestaPago {
  string id_transaccion = 1;
  bool exitoso = 2;
  string mensaje_error = 3; // Estará vacío si exitoso es true
}

// El servicio define los métodos RPC (El comportamiento)
service ServicioPagos {
  // Un RPC Unario (Request simple, Response simple)
  rpc ProcesarPago (SolicitudPago) returns (RespuestaPago);
}
```

#### Reglas de Oro de las Etiquetas Numéricas (Tags)

El número al final de cada campo (`= 1;`, `= 2;`, etc.) es la **etiqueta numérica**. Esta es la pieza más importante del diseño de tu IDL:
* **Identifican el campo en el formato binario:** Cuando Rust serializa el mensaje, no envía el texto `"monto"`, envía el identificador `2`.
* **Inmutabilidad estricta:** Una vez que un servicio está en producción, **jamás** debes cambiar la etiqueta numérica de un campo existente. Si lo haces, romperás la compatibilidad hacia atrás (backward compatibility).
* **Deprecación:** Si ya no necesitas un campo, bórralo o renómbralo, pero reserva su número usando `reserved 2;` para evitar que otro desarrollador lo reutilice accidentalmente en el futuro.

### ¿Cómo mapea Protobuf a Rust?

El ecosistema Rust no lee archivos `.proto` en tiempo de ejecución. En su lugar, utilizamos la librería **`prost`** (que genera la serialización binaria) en combinación con **`tonic-build`** (que genera los clientes y servidores gRPC) para compilar el IDL en código Rust durante el paso de compilación (`cargo build`).

Conceptualmente, el archivo `.proto` anterior se traduce a constructos de Rust que ya conoces muy bien por los Capítulos 2 y 3:

* **`message`** se convierte en un `struct` público con el macro `#[derive(Clone, PartialEq, ::prost::Message)]`.
* **`enum`** se convierte en un `enum` de Rust de estilo C (y algunas conversiones a `i32` requeridas por la especificación de Protobuf).
* **Tipos escalares** se mapean directamente: `string` es `String`, `double` es `f64`, `int32` es `i32`, y los campos repetidos (`repeated`) se convierten en `Vec<T>`.
* **`service`** se convierte en un `Trait` asíncrono que tu backend deberá implementar (usando las bases de Tokio que vimos en el Capítulo 32).

#### El paso de compilación (`build.rs`)

Para que esta magia ocurra, los desarrolladores backend en Rust utilizan un *build script* (`build.rs`) en la raíz del proyecto. Este archivo se ejecuta antes de compilar el resto de tu código.

```rust
// build.rs
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Le indicamos a cargo que vuelva a ejecutar este script 
    // solo si el archivo .proto cambia.
    println!("cargo:rerun-if-changed=proto/pagos.proto");

    // tonic_build lee el IDL y genera el código Rust internamente
    // en la carpeta OUT_DIR (archivos temporales de compilación).
    tonic_build::compile_protos("proto/pagos.proto")?;
    
    Ok(())
}
```

Gracias a este diseño, tu código Rust siempre está tipado fuertemente respecto a tu contrato `.proto`. Si cambias el IDL y omites un campo o modificas un tipo, el compilador de Rust (`rustc`) fallará inmediatamente, protegiendo tus microservicios de errores de integración antes de que lleguen a producción.

## 33.2 Construcción de servidores y clientes gRPC con `tonic`

En la sección anterior vimos cómo compilar nuestro archivo `pagos.proto` utilizando `tonic-build`. Ahora es el momento de darle vida a ese contrato. En el ecosistema de Rust, **`tonic`** es el framework gRPC por excelencia. Está construido sobre gigantes de rendimiento: utiliza `hyper` para el manejo de HTTP/2 y `tokio` para la asincronía, lo que garantiza que tus microservicios sean extremadamente rápidos y concurrentes.

El código generado por `tonic` nos entrega dos piezas fundamentales: un Trait para implementar el servidor y un cliente asíncrono listo para usar.

### 1. Implementando la Lógica del Servidor

Cuando `tonic-build` procesa nuestro servicio `ServicioPagos`, genera un Trait homónimo que describe exactamente las firmas de los métodos que debemos proveer. Para implementar nuestro servidor, primero definimos un `struct` (que puede contener dependencias como pools de base de datos, aunque aquí lo mantendremos simple) y luego implementamos el Trait sobre él.

```rust
use tonic::{transport::Server, Request, Response, Status};

// Importamos el código generado en tiempo de compilación.
// tonic::include_proto! busca el paquete definido en tu archivo .proto
pub mod pagos {
    tonic::include_proto!("pagos.v1");
}

// Importamos los tipos generados y el Trait del servidor
use pagos::servicio_pagos_server::{ServicioPagos, ServicioPagosServer};
use pagos::{SolicitudPago, RespuestaPago, Moneda};

// Definimos el estado de nuestro servicio
#[derive(Default)]
pub struct MiServicioPagos {}

// Implementamos el Trait. Usamos #[tonic::async_trait] porque 
// los métodos son asíncronos.
#[tonic::async_trait]
impl ServicioPagos for MiServicioPagos {
    async fn procesar_pago(
        &self,
        request: Request<SolicitudPago>, // El payload viene envuelto en un Request
    ) -> Result<Response<RespuestaPago>, Status> {
        
        println!("Recibiendo solicitud de pago desde: {:?}", request.remote_addr());
        
        // Extraemos el mensaje interno del Request
        let req = request.into_inner();

        // Lógica de negocio (Validación simple para el ejemplo)
        let exitoso = req.monto > 0.0;
        let mensaje_error = if exitoso { 
            String::new() 
        } else { 
            "El monto debe ser mayor a cero".to_string() 
        };

        // Construimos la respuesta basada en el contrato Protobuf
        let respuesta = RespuestaPago {
            id_transaccion: "TXN-987654321".to_string(), // Idealmente un UUID real
            exitoso,
            mensaje_error,
        };

        // Retornamos la respuesta envuelta en un Response, o un Status si falla
        Ok(Response::new(respuesta))
    }
}
```

**Puntos clave a tener en cuenta:**
* **`Request<T>` y `Response<T>`:** Tonic envuelve tus mensajes en estos tipos. Esto es vital porque te permite acceder (y mutar) a los metadatos de la petición HTTP/2 subyacente, como los *headers* (útiles para pasar tokens de autenticación).
* **`Status`:** En gRPC, los errores no se manejan con códigos HTTP estándar (404, 500), sino con códigos de estado gRPC (como `NOT_FOUND`, `PERMISSION_DENIED`, `INTERNAL`). El tipo `Status` de Tonic maneja este mapeo por ti.

### 2. Levantando el Servidor de Transporte

Con la lógica de negocio implementada, necesitamos indicarle a `tonic` que escuche en un puerto de red utilizando el runtime de Tokio.

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Definimos la dirección (usamos IPv6 localhost por convención en gRPC)
    let addr = "[::1]:50051".parse()?;
    
    // Instanciamos nuestro servicio
    let servicio_pagos = MiServicioPagos::default();

    println!("Servidor gRPC de Pagos escuchando en {}", addr);

    // Configuramos y levantamos el servidor
    Server::builder()
        // Envolvemos nuestro struct en el Server generado por Tonic
        .add_service(ServicioPagosServer::new(servicio_pagos))
        .serve(addr)
        .await?;

    Ok(())
}
```

### 3. Construyendo el Cliente gRPC

En el mundo REST, tendrías que lidiar con `reqwest`, serializar JSON manualmente y adivinar la estructura de la respuesta. Con gRPC y `tonic`, el cliente se autogenera y es fuertemente tipado.

Puedes crear un cliente en un microservicio distinto (o incluso en un binario CLI) simplemente apuntando al mismo archivo `.proto`.

```rust
use pagos::servicio_pagos_client::ServicioPagosClient;
use pagos::{SolicitudPago, Moneda};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Conectamos el cliente al servidor. Tonic maneja el multiplexado de HTTP/2.
    let mut client = ServicioPagosClient::connect("http://[::1]:50051").await?;

    // Construimos el payload tipado
    let solicitud = SolicitudPago {
        id_usuario: "usr_backend_sr".to_string(),
        monto: 2500.50,
        // Los enums de Protobuf se exponen como i32 en Rust
        moneda: Moneda::Usd as i32, 
    };

    // Envolvemos en un Request (opcionalmente podríamos inyectar headers aquí)
    let request = tonic::Request::new(solicitud);

    // Realizamos la llamada de red (Remote Procedure Call)
    let response = client.procesar_pago(request).await?;

    // Desempaquetamos la respuesta
    println!("Respuesta recibida: {:#?}", response.into_inner());

    Ok(())
}
```

El rendimiento de este cliente es excepcional porque `tonic` mantiene abierta una única conexión TCP (gracias a HTTP/2) y multiplexa múltiples llamadas `procesar_pago` concurrentes sobre ella, evitando el costoso *handshake* en cada petición.

## 33.3 Streaming Unidireccional y Bidireccional

Hasta ahora hemos explorado las llamadas RPC Unarias, donde un cliente envía una única petición y el servidor devuelve una única respuesta. Este modelo es perfecto para operaciones transaccionales estándar. Sin embargo, ¿qué sucede cuando necesitas transferir archivos masivos, enviar telemetría en tiempo real o mantener un canal de chat abierto? Aquí es donde brilla el soporte nativo de gRPC para **Streaming**, apalancado por la eficiencia de HTTP/2 y la asincronía de Tokio en Rust.

En gRPC, el streaming permite enviar múltiples mensajes a través de una única conexión TCP persistente, reduciendo drásticamente la latencia y el consumo de memoria en comparación con el *polling* tradicional en HTTP/1.1.

### 1. Definiendo el Streaming en el IDL (`.proto`)

Para habilitar el streaming, simplemente introducimos la palabra clave `stream` en la firma del método en nuestro archivo Protocol Buffers. Existen tres modalidades de streaming en gRPC:

```protobuf
syntax = "proto3";
package pagos.v1;

// (Definición de mensajes omitida por brevedad)

service ServicioPagos {
  // 1. Server Streaming: Un request, múltiples respuestas.
  // Ideal para descargar listas grandes o recibir eventos del servidor.
  rpc HistorialPagos (FiltroHistorial) returns (stream RespuestaPago);

  // 2. Client Streaming: Múltiples requests, una respuesta.
  // Ideal para subir archivos por chunks o enviar telemetría continua.
  rpc ProcesarLote (stream SolicitudPago) returns (ResumenLote);

  // 3. Bidirectional Streaming: Múltiples requests, múltiples respuestas.
  // Ideal para WebSockets super-cargados, chats o sincronización en tiempo real.
  rpc CanalSoporte (stream MensajeChat) returns (stream MensajeChat);
}
```

### 2. Server Streaming en Rust (Servidor a Cliente)

Cuando implementas un método de Server Streaming en `tonic`, la firma generada en el Trait cambia. En lugar de devolver un mensaje simple, debes devolver un *Stream* de Rust (la versión asíncrona de un Iterador).

Para lograr esto de forma idiomática, utilizamos los canales de Tokio (`tokio::sync::mpsc`) para producir los mensajes y el crate `tokio_stream` para convertir el receptor del canal en un Stream compatible con `tonic`.

```rust
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{Request, Response, Status};

// ... importaciones del código generado ...

#[tonic::async_trait]
impl ServicioPagos for MiServicioPagos {
    // Definimos el tipo asociado requerido por el Trait para el Stream de salida
    type HistorialPagosStream = ReceiverStream<Result<RespuestaPago, Status>>;

    async fn historial_pagos(
        &self,
        request: Request<FiltroHistorial>,
    ) -> Result<Response<Self::HistorialPagosStream>, Status> {
        let filtro = request.into_inner();
        
        // Creamos un canal MPSC (Multiple Producer, Single Consumer)
        // El tamaño del buffer (4) determina cuántos mensajes pueden encolarse
        let (tx, rx) = mpsc::channel(4);

        // Hacemos spawn de una tarea de Tokio para no bloquear la respuesta inicial.
        // Esta tarea se encargará de generar y enviar los datos al cliente.
        tokio::spawn(async move {
            for i in 0..5 {
                let respuesta = RespuestaPago {
                    id_transaccion: format!("TXN-HIST-{}-{}", filtro.usuario_id, i),
                    exitoso: true,
                    mensaje_error: String::new(),
                };

                // Enviamos el mensaje por el canal. Si el cliente se desconecta,
                // tx.send fallará y el loop terminará automáticamente.
                if tx.send(Ok(respuesta)).await.is_err() {
                    println!("El cliente cerró la conexión prematuramente.");
                    break; 
                }
                
                // Simulamos un retraso o procesamiento de base de datos
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
        });

        // Envolvemos el receptor del canal y lo retornamos inmediatamente
        Ok(Response::new(ReceiverStream::new(rx)))
    }
}
```

### 3. Streaming Bidireccional (El Máximo Poder)

El streaming bidireccional combina el streaming del cliente y del servidor. Ambos extremos pueden leer y escribir mensajes de forma totalmente asíncrona e independiente utilizando la misma conexión subyacente. 

En Rust, esto significa que recibirás un `tonic::Streaming<Request>` como entrada y retornarás un `ReceiverStream` como salida.

```rust
#[tonic::async_trait]
impl ServicioPagos for MiServicioPagos {
    type CanalSoporteStream = ReceiverStream<Result<MensajeChat, Status>>;

    async fn canal_soporte(
        &self,
        request: Request<tonic::Streaming<MensajeChat>>,
    ) -> Result<Response<Self::CanalSoporteStream>, Status> {
        
        // Obtenemos el stream de entrada (lo que el cliente envía)
        let mut in_stream = request.into_inner();
        
        // Creamos el canal para el stream de salida (lo que el servidor responde)
        let (tx, rx) = mpsc::channel(10);

        // Lanzamos una tarea concurrente para procesar los mensajes entrantes
        tokio::spawn(async move {
            // Iteramos sobre los mensajes a medida que llegan desde la red
            while let Some(resultado) = in_stream.message().await.transpose() {
                match resultado {
                    Ok(mensaje) => {
                        println!("Mensaje recibido del cliente: {}", mensaje.contenido);
                        
                        // Procesamos y respondemos en el mismo flujo
                        let respuesta = MensajeChat {
                            usuario: "Agente IA".to_string(),
                            contenido: format!("He recibido tu mensaje: {}", mensaje.contenido),
                        };

                        if tx.send(Ok(respuesta)).await.is_err() {
                            break; // El canal de salida se cerró
                        }
                    }
                    Err(e) => {
                        eprintln!("Error leyendo del stream del cliente: {}", e);
                        break;
                    }
                }
            }
            println!("Conexión bidireccional finalizada por el cliente.");
        });

        // Retornamos el canal de salida inmediatamente para abrir la comunicación
        Ok(Response::new(ReceiverStream::new(rx)))
    }
}
```

> **Nota Arquitectónica:** A diferencia de un endpoint HTTP/1.1 REST estándar, estas conexiones en streaming se mantienen vivas. Es fundamental monitorear los descriptores de archivos de tu servidor y la memoria del runtime de Tokio para evitar el agotamiento de recursos si tienes decenas de miles de clientes inactivos (idle) sosteniendo conexiones TCP.

## 33.4 Interceptors y autenticación en gRPC

En el desarrollo de microservicios robustos, no podemos permitir que cualquier servicio o cliente acceda a nuestros endpoints gRPC de forma indiscriminada. Necesitamos una capa intermedia que verifique la identidad de quien realiza la petición antes de ejecutar nuestra valiosa lógica de negocio. En el ecosistema REST usábamos *Middlewares*; en el mundo gRPC, esta abstracción se conoce como **Interceptors** (Interceptores).

Un interceptor en `tonic` te permite inspeccionar, modificar o rechazar tanto las peticiones entrantes (en el servidor) como las salientes (en el cliente).

### El Concepto de Metadata (Los Headers de gRPC)

gRPC no expone los *headers* HTTP de forma directa en su API de alto nivel. En su lugar, utiliza un concepto llamado **Metadata**. La metadata es un conjunto de pares clave-valor que se envía al inicio de la llamada RPC. Es el lugar ideal para alojar tokens de autenticación, como un JSON Web Token (JWT) o una API Key.

### 1. Construyendo un Interceptor en el Servidor

Una de las grandes ventajas de diseño en `tonic` es que el interceptor se ejecuta **antes** de deserializar el cuerpo del mensaje Protobuf. Esto significa que si una petición no está autenticada, rechazamos la conexión inmediatamente, ahorrando valiosos ciclos de CPU. Por esta razón, la firma de un interceptor recibe un `Request<()>` (una petición sin cuerpo).

Vamos a crear un interceptor que busque un token `Bearer` en la metadata:

```rust
use tonic::{Request, Status};
use tonic::metadata::MetadataMap;

// Definimos una estructura simple para inyectar en el contexto
#[derive(Clone)]
pub struct ContextoUsuario {
    pub usuario_id: String,
    pub rol: String,
}

/// Función interceptora que valida la autenticación
pub fn interceptor_autenticacion(mut req: Request<()>) -> Result<Request<()>, Status> {
    // 1. Extraemos la metadata de la petición
    let metadata: &MetadataMap = req.metadata();

    // 2. Buscamos la clave "authorization"
    match metadata.get("authorization") {
        Some(token_header) => {
            // Convertimos el valor a texto manejando posibles errores de codificación
            let token_str = token_header.to_str()
                .map_err(|_| Status::unauthenticated("Formato de token inválido"))?;

            // 3. Validamos el token (En producción, aquí verificarías la firma del JWT)
            if token_str.starts_with("Bearer jwt_valido_123") {
                
                // 4. Inyectamos información extraída del token hacia el manejador final
                // usando el sistema de "Extensions" (Contexto tipado)
                let contexto = ContextoUsuario {
                    usuario_id: "usr_backend_sr".to_string(),
                    rol: "admin".to_string(),
                };
                req.extensions_mut().insert(contexto);

                // Permitimos que la petición continúe
                Ok(req)
            } else {
                Err(Status::unauthenticated("Token incorrecto o expirado"))
            }
        }
        None => Err(Status::unauthenticated("Falta el header de autorización")),
    }
}
```

#### Aplicando el Interceptor al Servidor

Para usar este interceptor, modificamos ligeramente la forma en que instanciamos nuestro servidor en la función `main`. Usamos el método `with_interceptor`:

```rust
// ... importaciones previas ...

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50051".parse()?;
    let servicio_pagos = MiServicioPagos::default();

    println!("Servidor gRPC escuchando con autenticación requerida...");

    Server::builder()
        // Envolvemos el servicio con nuestro interceptor
        .add_service(ServicioPagosServer::with_interceptor(
            servicio_pagos,
            interceptor_autenticacion,
        ))
        .serve(addr)
        .await?;

    Ok(())
}
```

Ahora, dentro de los métodos de tu trait `ServicioPagos`, puedes extraer el `ContextoUsuario` usando `request.extensions().get::<ContextoUsuario>()` para saber exactamente quién ejecutó la acción.

### 2. Automatizando la Inyección en el Cliente

Si tienes un microservicio en Rust que necesita consumir este servidor autenticado, sería tedioso agregar el token manualmente en cada llamada RPC. Podemos usar un interceptor en el cliente para inyectar el token automáticamente en cada petición saliente.

```rust
use tonic::metadata::MetadataValue;
use tonic::Request;
use tonic::transport::Channel;
use pagos::servicio_pagos_client::ServicioPagosClient;

/// Interceptor del cliente para adjuntar el token
fn interceptor_cliente(mut req: Request<()>) -> Result<Request<()>, tonic::Status> {
    // Parseamos nuestro token (idealmente leído de una variable de entorno o un gestor de secretos)
    let token: MetadataValue<_> = "Bearer jwt_valido_123".parse()
        .map_err(|_| tonic::Status::internal("Error parseando el token del cliente"))?;
    
    // Lo inyectamos en la metadata saliente
    req.metadata_mut().insert("authorization", token);
    
    Ok(req)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Creamos el canal de comunicación base
    let channel = Channel::from_static("http://[::1]:50051")
        .connect()
        .await?;

    // 2. Construimos el cliente envolviendo el canal con el interceptor
    let mut client = ServicioPagosClient::with_interceptor(channel, interceptor_cliente);

    // A partir de aquí, todas las llamadas como client.procesar_pago(...)
    // llevarán automáticamente el header de autorización.
    
    Ok(())
}
```

### Resumen del Capítulo

Con esto cerramos el **Capítulo 33**. Hemos visto cómo Protobuf nos proporciona un contrato estricto e independiente del lenguaje, cómo `tonic` lo convierte en código Rust de alto rendimiento para clientes y servidores, cómo el *streaming* nos permite flujos de datos continuos sobre una misma conexión TCP, y finalmente, cómo proteger estos endpoints utilizando interceptores.
