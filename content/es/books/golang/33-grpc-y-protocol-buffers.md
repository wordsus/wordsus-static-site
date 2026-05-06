La comunicación eficiente es la columna vertebral de los sistemas distribuidos modernos. Mientras que REST ha sido el estándar por años, la arquitectura de microservicios demanda una eficiencia que el texto plano (JSON/XML) no siempre puede ofrecer. En este capítulo, exploramos **Protocol Buffers**, el mecanismo binario de serialización de Google, y **gRPC**, el framework que redefine la interacción inter-servicios. A diferencia del modelo tradicional, gRPC garantiza contratos estrictos, tipado fuerte en Go y una optimización extrema mediante HTTP/2, permitiendo que las llamadas remotas se sientan tan naturales y rápidas como una ejecución local en el mismo binario.

## 33.1. Introducción a Protobuf: Sintaxis y compilador (`protoc`)

En el capítulo 15 exploramos la serialización nativa con JSON y XML, formatos de texto ampliamente adoptados por su legibilidad humana y su integración ubicua en APIs RESTful (como vimos en la Parte 7). Sin embargo, en arquitecturas de microservicios de alto rendimiento (discutidas en el capítulo 32), el coste computacional de parsear texto y el tamaño de los *payloads* se convierten en cuellos de botella significativos.

Aquí es donde entra **Protocol Buffers** (comúnmente llamado **Protobuf**). Desarrollado por Google, Protobuf es un mecanismo agnóstico al lenguaje y a la plataforma para serializar datos estructurados. A diferencia de JSON, Protobuf es un formato binario, fuertemente tipado y requiere un esquema predefinido. Esto lo hace drásticamente más rápido de procesar y mucho más compacto en la red.

### La sintaxis de Protobuf (`proto3`)

El corazón de Protobuf es el archivo de definición de interfaz (IDL) con extensión `.proto`. En este archivo declaramos las estructuras de datos, llamadas `messages`. La versión más reciente y recomendada del estándar es `proto3`.

Veamos un ejemplo representativo de un archivo `.proto` para un microservicio de gestión de usuarios:

```protobuf
// user.proto
syntax = "proto3";

// Declaración del paquete en el ecosistema Protobuf para evitar colisiones
package identity;

// Opción específica para Go: define la ruta de importación y el nombre del paquete generado
option go_package = "github.com/tu-usuario/tu-proyecto/internal/identity/pb";

// Un mensaje representa una estructura de datos
message User {
  string id = 1;
  string username = 2;
  string email = 3;
  bool is_active = 4;
  
  // Enumeración anidada
  enum Role {
    USER = 0; // En proto3, el primer valor de un enum debe ser 0
    ADMIN = 1;
    MODERATOR = 2;
  }
  Role role = 5;
  
  // repeated equivale a un slice en Go
  repeated string preferences = 6;
}
```

#### Anatomía del mensaje y los números de campo
A diferencia de los *Structs* en Go, donde el nombre del campo dicta cómo se mapea en JSON (vía *Struct Tags*), en Protobuf la clave de la serialización es el **número de campo** (ej. `= 1`, `= 2`).

* **Identificadores binarios:** Estos números se utilizan para identificar los campos en el formato binario serializado. El nombre del campo (ej. `email`) solo existe para los desarrolladores; la máquina lee el número `3`.
* **Regla de oro de la compatibilidad:** Una vez que un número de campo entra en producción, **jamás debe modificarse ni reutilizarse**. Si un campo queda obsoleto, se debe usar la palabra reservada `reserved` (ej. `reserved 2;`) para evitar que futuros desarrolladores lo reasignen accidentalmente, lo que corrompería la deserialización en versiones antiguas de los clientes.
* **Eficiencia:** Los números del 1 al 15 ocupan un solo byte para codificarse (incluyendo el tipo de dato y el número de campo). Los números del 16 al 2047 ocupan dos bytes. Por tanto, optimiza tu diseño asignando los números 1-15 a los campos que se envían con mayor frecuencia.

### El compilador `protoc` y el ecosistema Go

Para transformar nuestro archivo `user.proto` en código Go utilizable, necesitamos un paso de compilación. Protobuf utiliza un compilador principal escrito en C++ llamado `protoc`. 

Dado que `protoc` es agnóstico, necesita un *plugin* específico para generar código Go. Para ello, debemos instalar el plugin oficial del equipo de Go:

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
```

*(Asegúrate de que tu directorio `$GOPATH/bin` esté en tu variable de entorno `$PATH`, tal como vimos en el Capítulo 1).*

#### Compilando el archivo `.proto`

Una vez instalado el compilador y el plugin, ejecutamos el siguiente comando en la raíz de nuestro proyecto para generar el código:

```bash
protoc --go_out=. --go_opt=paths=source_relative user.proto
```

* `--go_out=.`: Indica el directorio base donde se generará el código.
* `--go_opt=paths=source_relative`: Obliga al compilador a colocar el archivo generado en el mismo directorio relativo que el archivo `.proto` de origen, respetando la estructura de tu proyecto.

Este comando genera un archivo llamado `user.pb.go`. **Este archivo no debe editarse manualmente.** Contiene los *Structs* de Go equivalentes, métodos *Getters* seguros (que evitan *panics* al acceder a punteros nulos de campos anidados) y toda la lógica de reflexión interna necesaria para la serialización rápida.

### Utilizando Protobuf en Go

Para serializar y deserializar los mensajes generados en la memoria, utilizamos el paquete oficial `google.golang.org/protobuf/proto`. A diferencia del paquete `encoding/json` de la Standard Library, Protobuf opera estrictamente con punteros a *Structs* generados:

```go
package main

import (
	"fmt"
	"log"

	// Importa el paquete generado a partir de tu archivo .proto
	"github.com/tu-usuario/tu-proyecto/internal/identity/pb"
	"google.golang.org/protobuf/proto"
)

func main() {
	// 1. Instanciar el struct generado
	user := &pb.User{
		Id:       "usr_12345",
		Username: "gopher_ninja",
		Email:    "gopher@example.com",
		IsActive: true,
		Role:     pb.User_ADMIN,
		Preferences: []string{"dark_mode", "email_notifications"},
	}

	// 2. Serializar a formato binario (Marshal)
	data, err := proto.Marshal(user)
	if err != nil {
		log.Fatalf("Error al serializar el mensaje Protobuf: %v", err)
	}
	fmt.Printf("Tamaño del payload binario: %d bytes\n", len(data))

	// 3. Deserializar desde formato binario (Unmarshal)
	newUser := &pb.User{}
	err = proto.Unmarshal(data, newUser)
	if err != nil {
		log.Fatalf("Error al deserializar el mensaje Protobuf: %v", err)
	}

	// Uso de getters generados automáticamente (recomendado)
	fmt.Printf("Usuario deserializado: %s (Rol: %v)\n", newUser.GetUsername(), newUser.GetRole())
}
```

El uso de `proto.Marshal` y `proto.Unmarshal` es extremadamente eficiente. Al adoptar Protobuf, no solo reducimos el ancho de banda y el consumo de CPU, sino que obtenemos un contrato estricto (el archivo `.proto`) que sirve como fuente única de verdad para la comunicación inter-servicios. En las siguientes secciones (33.2 y 33.3), veremos cómo este esquema se convierte en la base para definir contratos de red y generar automáticamente clientes y servidores utilizando gRPC.

## 33.2. Definición de servicios, mensajes y generación de código Go

En la sección 33.1 establecimos cómo modelar estructuras de datos eficientes utilizando `message`. Sin embargo, en una arquitectura basada en microservicios, los datos estáticos no son suficientes; necesitamos definir **comportamientos**. gRPC permite establecer contratos estrictos de comunicación entre servicios a nivel de red mediante la palabra reservada `service`.

Un `service` en Protobuf agrupa un conjunto de llamadas a procedimientos remotos (RPCs), definiendo qué funciones pueden ser invocadas por un cliente, qué parámetros reciben y qué devuelven.

### Definición del contrato: Servicios y Mensajes

Continuando con nuestro dominio de identidad, vamos a definir un servicio que permita consultar la información de un usuario. Para ello, expandiremos nuestro archivo `user.proto`.

```protobuf
// user.proto
syntax = "proto3";

package identity;

option go_package = "github.com/tu-usuario/tu-proyecto/internal/identity/pb";

// Mensaje base (visto en 33.1)
message User {
  string id = 1;
  string username = 2;
  // ... resto de los campos ...
}

// 1. Definición de los mensajes de Petición y Respuesta
message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
  // Aquí podríamos añadir en el futuro metadatos, como:
  // int64 cache_ttl = 2;
}

// 2. Definición del Servicio gRPC
service UserService {
  // Define un RPC unario (petición simple, respuesta simple)
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```

#### El patrón de diseño Request/Response en gRPC

Observa que el método `GetUser` no recibe un `string` directamente ni devuelve el mensaje `User` puro. En su lugar, utiliza envoltorios específicos: `GetUserRequest` y `GetUserResponse`.

Esta es una **regla de oro en el diseño de APIs gRPC**. Si devolviéramos `User` directamente y en el futuro necesitáramos incluir metadatos de paginación o el estado de una caché en la respuesta, tendríamos que modificar la firma del RPC, rompiendo el contrato con todos los clientes existentes. Al encapsular la entrada y salida en mensajes dedicados, garantizamos la retrocompatibilidad evolutiva del esquema.

### Generación de código específico para gRPC

En la sección anterior generamos únicamente las estructuras de datos con el plugin `protoc-gen-go`. Para generar las interfaces de cliente y servidor de red, necesitamos un segundo plugin diseñado específicamente para el ecosistema gRPC:

```bash
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

Una vez instalado, debemos actualizar nuestro comando de compilación para invocar ambos plugins simultáneamente. Ejecutamos lo siguiente en la raíz del proyecto:

```bash
protoc \
  --go_out=. --go_opt=paths=source_relative \
  --go-grpc_out=. --go-grpc_opt=paths=source_relative \
  user.proto
```

La adición de los flags `--go-grpc_out` y `--go-grpc_opt` le indica al compilador que analice los bloques `service` y genere el código de transporte de red.

### Anatomía del código generado (`_grpc.pb.go`)

Tras la compilación, notarás que junto al archivo `user.pb.go` (que contiene los *structs* de los mensajes), ha aparecido un nuevo archivo: `user_grpc.pb.go`. 

Este archivo es el puente entre el mundo abstracto de Protobuf y las interfaces y estructuras concurrentes de Go que estudiamos en la Parte 2 y 3. Contiene dos componentes fundamentales:

**1. La Interfaz del Cliente (`UserServiceClient`)**
Go genera una interfaz lista para ser utilizada por cualquier cliente que necesite comunicarse con el servicio. Incluye internamente el manejo del paquete `context` (capítulo 13) para gestionar tiempos de espera y cancelaciones en la red.

```go
// Código generado (simplificado)
type UserServiceClient interface {
	GetUser(ctx context.Context, in *GetUserRequest, opts ...grpc.CallOption) (*GetUserResponse, error)
}
```

**2. La Interfaz del Servidor (`UserServiceServer`)**
Del mismo modo, se genera la interfaz que nuestro backend deberá satisfacer. 

```go
// Código generado (simplificado)
type UserServiceServer interface {
	GetUser(context.Context, *GetUserRequest) (*GetUserResponse, error)
	mustEmbedUnimplementedUserServiceServer()
}
```

#### Forward Compatibility y `UnimplementedUserServiceServer`

Un detalle arquitectónico crucial del código generado es la presencia de la estructura `UnimplementedUserServiceServer`. Por diseño, gRPC en Go exige que tu implementación del servidor incluya (mediante composición, *embedding*, capítulo 6) este *struct* generado automáticamente.

Si en el futuro añades un nuevo método al `.proto` (ej. `UpdateUser`) y regeneras el código, la interfaz `UserServiceServer` requerirá ese nuevo método. Sin el *embedding*, tu código dejaría de compilar inmediatamente al no satisfacer el contrato. Al incluir `UnimplementedUserServiceServer`, tu servidor compilará sin problemas y simplemente devolverá un error gRPC de tipo `Unimplemented` si un cliente intenta invocar la nueva ruta antes de que la hayas programado.

## 33.3. Implementación de servidores y clientes gRPC

Con las interfaces generadas por `protoc` en la sección anterior (33.2), ya tenemos el contrato estricto de nuestro servicio. El siguiente paso natural es dar vida a ese contrato: escribir la lógica de negocio en el servidor y consumir dicho servicio desde un cliente. 

A diferencia de un servidor HTTP tradicional basado en el paquete `net/http` (Capítulo 24), gRPC utiliza HTTP/2 por debajo, multiplexando múltiples llamadas concurrentes sobre una única conexión TCP. Afortunadamente, el paquete `google.golang.org/grpc` abstrae esta complejidad.

### Implementación del Servidor gRPC

Para implementar el servidor, debemos crear una estructura en Go (nuestro *handler* o controlador) que satisfaga la interfaz `UserServiceServer` generada en el archivo `user_grpc.pb.go`.

Como discutimos en la sección anterior, es obligatorio aplicar composición (Capítulo 6) e incrustar `UnimplementedUserServiceServer` para garantizar la compatibilidad futura (Forward Compatibility).

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/tu-usuario/tu-proyecto/internal/identity/pb"
)

// userServer es la implementación concreta de nuestro servicio
type userServer struct {
	pb.UnimplementedUserServiceServer
	
	// Aquí inyectaríamos nuestras dependencias (repositorios, loggers, etc.)
	// db *sql.DB
}

// GetUser implementa la firma requerida por la interfaz generada
func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	// 1. Validación inicial
	if req.GetUserId() == "" {
		// Retornamos un error con un código gRPC estandarizado
		return nil, status.Error(codes.InvalidArgument, "el user_id es obligatorio")
	}

	// 2. Lógica de negocio simulada (ej. búsqueda en base de datos)
	if req.GetUserId() != "usr_123" {
		return nil, status.Error(codes.NotFound, "usuario no encontrado")
	}

	// 3. Construcción de la respuesta
	user := &pb.User{
		Id:       req.GetUserId(),
		Username: "gopher_ninja",
		Email:    "ninja@example.com",
		IsActive: true,
	}

	return &pb.GetUserResponse{User: user}, nil
}
```

#### Levantando el listener de red

Una vez definida la lógica, necesitamos abrir un puerto TCP y acoplar nuestra implementación al motor de gRPC:

```go
func main() {
	// 1. Crear un listener TCP (estudiado en el Capítulo 24)
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Error al abrir el puerto: %v", err)
	}

	// 2. Instanciar el servidor gRPC de Go
	grpcServer := grpc.NewServer()

	// 3. Registrar nuestra implementación en el servidor gRPC
	pb.RegisterUserServiceServer(grpcServer, &userServer{})

	fmt.Println("Servidor gRPC escuchando en el puerto 50051...")
	
	// 4. Iniciar el bucle de escucha (operación bloqueante)
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Error crítico en el servidor gRPC: %v", err)
	}
}
```

### Implementación del Cliente gRPC

El cliente en gRPC es notablemente más sencillo que configurar un cliente HTTP estándar. No necesitamos serializar JSON manualmente ni lidiar con cabeceras complejas para peticiones básicas; el código generado nos proporciona métodos fuertemente tipados.

En versiones recientes de `grpc-go`, la función tradicional `grpc.Dial` ha sido desaprobada (deprecated) en favor de `grpc.NewClient`.

```go
package main

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/tu-usuario/tu-proyecto/internal/identity/pb"
)

func main() {
	// 1. Establecer la conexión con el servidor
	// Nota: En producción, usaríamos credenciales TLS válidas (Capítulo 38).
	// Aquí usamos credenciales inseguras para desarrollo local.
	conn, err := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("No se pudo conectar al servidor: %v", err)
	}
	defer conn.Close()

	// 2. Instanciar el cliente generado pasándole la conexión
	client := pb.NewUserServiceClient(conn)

	// 3. Crear un Contexto con timeout (Capítulo 13)
	// Es crucial para evitar que el cliente se quede bloqueado indefinidamente si el servidor cae.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// 4. Construir el payload de petición
	req := &pb.GetUserRequest{
		UserId: "usr_123",
	}

	// 5. Realizar la llamada RPC (parece una llamada local, pero viaja por la red)
	res, err := client.GetUser(ctx, req)
	if err != nil {
		log.Fatalf("Error al ejecutar GetUser RPC: %v", err)
	}

	log.Printf("Usuario recibido: %s (Email: %s)", res.GetUser().GetUsername(), res.GetUser().GetEmail())
}
```

### El modelo mental del manejo de errores (`status` y `codes`)

Habrás notado el uso del paquete `google.golang.org/grpc/status` y `codes` en el servidor. En REST, utilizamos códigos de estado HTTP (400, 404, 500). En gRPC, dado que opera sobre HTTP/2 pero abstrae la capa web, utiliza su propio conjunto de **códigos de estado gRPC** (ej. `codes.NotFound`, `codes.InvalidArgument`, `codes.Internal`). 

Cuando el servidor retorna un error usando `status.Error`, el cliente gRPC intercepta ese error. El cliente puede entonces usar `status.FromError(err)` para extraer exactamente el código y el mensaje original, permitiendo un manejo de errores robusto e idiomático entre microservicios, sin ambigüedades.

## 33.4. Patrones de comunicación: Streaming Unario, Servidor, Cliente y Bidireccional

Hasta ahora hemos operado bajo el paradigma tradicional de petición-respuesta, equivalente a una llamada HTTP/1.1 clásica. Sin embargo, gRPC está construido sobre **HTTP/2**, lo que le permite explotar características avanzadas a nivel de capa de transporte, siendo la más destacada la multiplexación bidireccional sobre una única conexión TCP persistente. 

gRPC expone esta capacidad a través de la palabra reservada `stream` en los archivos `.proto`. Dependiendo de dónde se coloque esta directiva, podemos definir cuatro patrones de comunicación distintos.

### 1. RPC Unario (Unary RPC)

Es el patrón por defecto que implementamos en la sección 33.3. El cliente envía una única petición y el servidor devuelve una única respuesta. Es ideal para operaciones CRUD o consultas transaccionales simples.

```protobuf
// Unario: Una petición, una respuesta
rpc GetUser(GetUserRequest) returns (GetUserResponse);
```

### 2. Streaming de Servidor (Server Streaming)

En este patrón, el cliente envía una única petición, pero el servidor responde con un flujo continuo de mensajes. El cliente lee de este flujo hasta que el servidor indica que no hay más datos.

Es la arquitectura ideal para notificaciones en tiempo real, colas de eventos locales o la descarga de grandes volúmenes de datos fragmentados (evitando sobrecargar la memoria RAM del servidor estudiada en el Capítulo 44).

**Definición Protobuf:**
```protobuf
// El servidor devuelve un stream
rpc WatchUserUpdates(WatchUserRequest) returns (stream UserUpdateResponse);
```

**Implementación en el Servidor (Go):**
El compilador genera una interfaz de stream (`UserService_WatchUserUpdatesServer`) que expone el método `Send()`.

```go
func (s *userServer) WatchUserUpdates(req *pb.WatchUserRequest, stream pb.UserService_WatchUserUpdatesServer) error {
	// Simulamos un bucle que envía actualizaciones periódicas
	for i := 0; i < 5; i++ {
		update := &pb.UserUpdateResponse{
			Status: fmt.Sprintf("Actualización %d para el usuario %s", i, req.GetUserId()),
		}
		
		// Enviamos el fragmento a través de la red
		if err := stream.Send(update); err != nil {
			return err // El cliente se desconectó o falló la red
		}
		time.Sleep(1 * time.Second)
	}
	// Al retornar nil, gRPC cierra automáticamente el stream del lado del servidor
	return nil
}
```

### 3. Streaming de Cliente (Client Streaming)

Aquí se invierte la dinámica: el cliente inicia la conexión y envía un flujo de múltiples mensajes al servidor. El servidor procesa el flujo a medida que llega y, una vez que el cliente ha terminado de transmitir, el servidor devuelve una única respuesta.

Este patrón brilla en escenarios como la subida de archivos pesados (chunking) o la ingesta masiva de métricas de telemetría IoT.

**Definición Protobuf:**
```protobuf
// El cliente envía un stream
rpc UploadAvatar(stream UploadAvatarRequest) returns (UploadAvatarResponse);
```

**Implementación en el Servidor (Go):**
El servidor utiliza la interfaz de stream generada para invocar `Recv()` repetidamente. Cuando el cliente cierra el canal de envío, `Recv()` devuelve el error estándar `io.EOF` (Capítulo 12), momento en el cual el servidor emite su respuesta final.

```go
import "io"

func (s *userServer) UploadAvatar(stream pb.UserService_UploadAvatarServer) error {
	var totalBytes int32

	for {
		// Recibimos un fragmento (chunk) de datos del cliente
		chunk, err := stream.Recv()
		if err == io.EOF {
			// El cliente ha finalizado el envío. Respondemos y cerramos.
			return stream.SendAndClose(&pb.UploadAvatarResponse{
				Message: fmt.Sprintf("Subida exitosa. Total: %d bytes", totalBytes),
			})
		}
		if err != nil {
			return err
		}

		// Acumulamos o procesamos la porción de datos
		totalBytes += int32(len(chunk.GetChunkData()))
	}
}
```

### 4. Streaming Bidireccional (Bidirectional Streaming)

El patrón más avanzado y complejo. Tanto el cliente como el servidor envían un flujo de mensajes de forma completamente independiente sobre la misma conexión. Los *streams* operan de manera asíncrona; el servidor puede responder inmediatamente después de recibir un mensaje, o puede esperar a acumular varios antes de enviar su respuesta.

Los casos de uso típicos incluyen sistemas de chat en tiempo real, emparejamiento de videojuegos multijugador o sincronización continua de estado.

**Definición Protobuf:**
```protobuf
// Ambos lados envían un stream
rpc ChatSession(stream ChatMessage) returns (stream ChatMessage);
```

**Implementación en el Servidor (Go):**
Para manejar la concurrencia inherente a este patrón, aplicamos directamente los conceptos de *Goroutines* y Canales vistos en la Parte 3 del libro. Normalmente, delegaremos la lectura (`Recv`) y la escritura (`Send`) en subprocesos independientes para evitar bloqueos.

```go
func (s *userServer) ChatSession(stream pb.UserService_ChatSessionServer) error {
	// Usamos un canal para orquestar posibles errores en la Goroutine de escritura
	errChan := make(chan error)

	// Goroutine dedicada a recibir mensajes del cliente
	go func() {
		for {
			in, err := stream.Recv()
			if err == io.EOF {
				close(errChan) // El cliente terminó su transmisión
				return
			}
			if err != nil {
				errChan <- err
				return
			}

			// Procesamos el mensaje y enviamos una respuesta inmediata (Echo)
			out := &pb.ChatMessage{
				User:    "Sistema",
				Content: "Recibido: " + in.GetContent(),
			}
			
			// Nota de concurrencia: stream.Send es seguro (thread-safe) 
			// respecto a stream.Recv, pero NO se pueden hacer múltiples 
			// llamadas a Send() simultáneamente desde distintas goroutines sin sincronización (Mutex).
			if err := stream.Send(out); err != nil {
				errChan <- err
				return
			}
		}
	}()

	// Bloqueamos la ejecución de la función RPC hasta que ocurra un error o un EOF
	err := <-errChan
	return err
}
```

Como se observa en los fragmentos anteriores, el compilador `protoc` de Go maneja la complejidad subyacente de la serialización y el control de flujo de HTTP/2, permitiéndonos razonar sobre las interacciones de red utilizando primitivas idiomáticas (bucles, constructores de I/O y Goroutines).

## 33.5. Interceptores gRPC (Middlewares para gRPC)

En el Capítulo 25 exploramos cómo los *middlewares* en servidores HTTP (como Chi o Gin) son fundamentales para aislar la lógica transversal o de infraestructura —como el *logging*, la validación de tokens o el manejo de *panics*— de la lógica de negocio pura. En el ecosistema gRPC, este patrón de diseño recibe el nombre de **Interceptores** (*Interceptors*).

Los interceptores permiten ejecutar código predefinido antes y después de que se invoque el manejador (handler) real de una llamada RPC. Al igual que en la capa HTTP, la librería `google.golang.org/grpc` soporta interceptores tanto en el lado del servidor como en el lado del cliente, y se dividen en dos categorías principales según el patrón de comunicación: unarios y de *streaming*.

### 1. Interceptores Unarios en el Servidor

Un interceptor unario envuelve una llamada RPC unaria normal (petición única, respuesta única). Para implementarlo, debemos crear una función que satisfaga la firma `grpc.UnaryServerInterceptor`.

Veamos un ejemplo práctico de un interceptor de *logging* estructurado y medición de latencia, preparándonos para los conceptos de observabilidad que veremos en la Parte 11:

```go
package middlewares

import (
	"context"
	"log/slog"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// LoggingInterceptor registra la duración y el estado de cada llamada RPC unaria.
func LoggingInterceptor() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context, 
		req interface{}, 
		info *grpc.UnaryServerInfo, 
		handler grpc.UnaryHandler,
	) (interface{}, error) {
		
		start := time.Now()

		// 1. Pre-procesamiento: Podemos inspeccionar el contexto o el método
		slog.Info("Recibiendo petición gRPC", "metodo", info.FullMethod)

		// 2. Invocar al handler real (o al siguiente interceptor en la cadena)
		// Aquí es donde la ejecución pasa a nuestro método GetUser (sección 33.3)
		resp, err := handler(ctx, req)

		// 3. Post-procesamiento: Evaluamos el resultado y la duración
		duration := time.Since(start)
		
		if err != nil {
			// Extraemos el código gRPC real para logs más precisos
			st, _ := status.FromError(err)
			slog.Error("RPC fallido", 
				"metodo", info.FullMethod, 
				"duracion", duration.String(), 
				"codigo", st.Code().String(),
				"error", err.Error(),
			)
		} else {
			slog.Info("RPC exitoso", 
				"metodo", info.FullMethod, 
				"duracion", duration.String(), 
				"codigo", codes.OK.String(),
			)
		}

		// Retornamos la respuesta y el error originales al cliente
		return resp, err
	}
}
```

El parámetro `info *grpc.UnaryServerInfo` es especialmente útil, ya que contiene el nombre completo del método que se está invocando (ej. `/identity.UserService/GetUser`), lo que permite aplicar lógicas condicionales dinámicas, como excluir ciertos *endpoints* de la validación de autenticación.

### 2. Encadenamiento de Interceptores (Chaining)

Rara vez un microservicio en producción utiliza un solo interceptor. Necesitaremos encadenar múltiples lógicas transversales: recuperación de pánico (*recovery*), inyección de identificadores de traza (*tracing* distribuido) y validación de seguridad (ej. JWT).

En versiones antiguas de gRPC para Go, encadenar interceptores requería librerías de terceros (como `go-grpc-middleware`). Hoy en día, la librería estándar lo soporta de forma nativa mediante `grpc.ChainUnaryInterceptor`.

Para registrar estos interceptores al arrancar el servidor (modificando nuestro código de la sección 33.3):

```go
import (
	// ... otras importaciones ...
	"google.golang.org/grpc"
)

func main() {
	// ... configuración del listener net.Listen ...

	// Configuración del servidor gRPC con múltiples interceptores
	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			// El orden importa: se ejecutan de arriba a abajo en la petición,
			// y de abajo a arriba en la respuesta.
			middlewares.RecoveryInterceptor(),   // Evita que un panic tire el servidor
			middlewares.LoggingInterceptor(),    // Mide la latencia total
			middlewares.AuthInterceptor(),       // Valida el JWT antes de ejecutar el negocio
		),
	)

	// ... registro del servicio y grpcServer.Serve(listener) ...
}
```

### 3. Interceptores de Cliente

Los interceptores no son exclusivos del servidor. Un cliente gRPC puede utilizar interceptores para automatizar tareas antes de enviar la petición por la red. Los casos de uso más comunes en microservicios incluyen:

* **Propagación de Autenticación:** Inyectar automáticamente el token OAuth2 o JWT en los metadatos de gRPC (el equivalente a las cabeceras HTTP) de cada petición saliente.
* **Retries (Reintentos) y Circuit Breakers:** Implementar lógicas de resiliencia (Capítulo 32) transparentes para el desarrollador, reintentando llamadas automáticamente si la red sufre una caída temporal o el servidor retorna un código `codes.Unavailable`.

```go
// Ejemplo simplificado de registro en el cliente
conn, err := grpc.NewClient(
    "localhost:50051", 
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithChainUnaryInterceptor(
        // Inyecta el token en el context (metadatos) antes del envío
        clientMiddlewares.AddAuthTokenInterceptor("mi-jwt-token"), 
    ),
)
```

### 4. Interceptores de Stream

Para los patrones bidireccionales, de servidor o de cliente que vimos en la sección 33.4, los interceptores unarios no funcionarán. gRPC provee `grpc.StreamServerInterceptor` y `grpc.StreamClientInterceptor`. 

Su implementación es notablemente más compleja que la de sus contrapartes unarias. Al manejar flujos asíncronos continuos, un interceptor de stream no puede simplemente rodear la llamada con un pre y post-procesamiento estático. En su lugar, el interceptor debe aplicar el patrón *Decorator* (Capítulo 23) para "envolver" la interfaz `grpc.ServerStream` subyacente, interceptando cada invocación individual a los métodos `RecvMsg` y `SendMsg` a lo largo del ciclo de vida de la conexión.

Con esto concluimos el **Capítulo 33**, habiendo cubierto desde la sintaxis base de Protobuf hasta la arquitectura de red y la gestión transversal de peticiones gRPC, estableciendo un estándar sólido de comunicación síncrona para nuestra arquitectura de microservicios.
