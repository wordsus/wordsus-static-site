## 14.1 Profundización en HTTP/HTTPS, métodos, cabeceras y códigos de estado

Al adentrarnos en el desarrollo Backend, abandonamos el aislamiento de la ejecución local para empezar a interactuar con el mundo. La red es el sistema nervioso de las aplicaciones modernas, y el protocolo HTTP (Hypertext Transfer Protocol) es su lenguaje universal. Como desarrolladores de Python, ya sea que construyamos microservicios con FastAPI o aplicaciones monolíticas con Django, una comprensión profunda de HTTP es innegociable. No se trata solo de "hacer peticiones", sino de diseñar sistemas robustos, seguros y semánticamente correctos.

### HTTP vs HTTPS: La capa de seguridad

HTTP es, en su base, un protocolo de texto plano, sin estado (stateless) y basado en el modelo cliente-servidor. El cliente (un navegador, una app móvil o un script en Python) envía una **petición (Request)** y el servidor devuelve una **respuesta (Response)**. 

Al ser texto plano, cualquier intermediario en la red puede leer el tráfico HTTP. Aquí es donde entra **HTTPS (HTTP Secure)**. HTTPS no es un protocolo distinto, sino que es el mismo HTTP envolviendo su tráfico en una capa de cifrado mediante TLS (Transport Layer Security, el sucesor de SSL). Esto garantiza tres pilares fundamentales:
1. **Confidencialidad:** Los datos viajan cifrados.
2. **Integridad:** Los datos no pueden ser modificados en tránsito sin que el receptor lo note.
3. **Autenticación:** Asegura que el servidor con el que te comunicas es quien dice ser (mediante certificados digitales).

Un diagrama simplificado de este flujo luce así:

```text
[Cliente Python]                                     [Servidor API]
       |                                                    |
       | ------ 1. Resolución DNS y Handshake TCP/TLS ----> |
       |                                                    |
       | ------ 2. Petición HTTP (Método, Ruta, Headers) -> |
       |        (Ej: GET /api/v1/usuarios HTTP/1.1)         |
       |                                                    |
       | <----- 3. Procesamiento y Respuesta HTTP --------- |
       |        (Ej: HTTP/1.1 200 OK + JSON Payload)        |
```

### Métodos HTTP: Semántica e Idempotencia

Los métodos HTTP (o verbos) indican la intención de la petición. Un desarrollador Senior no solo usa GET y POST; entiende la semántica detrás de cada uno y domina dos conceptos clave: **Seguridad** (si el método altera el estado del servidor) e **Idempotencia** (si ejecutar el mismo método una o mil veces seguidas deja el servidor en el mismo estado).

* **GET:** Solicita la representación de un recurso. Es **seguro** e **idempotente**. Nunca debe usarse para alterar datos.
* **POST:** Envía datos para que el servidor los procese (generalmente para crear un nuevo recurso). **No es seguro** ni **idempotente** (dos POST idénticos crearían dos recursos distintos).
* **PUT:** Reemplaza un recurso completo o lo crea si no existe. Es **idempotente**. Si envías la misma actualización completa 10 veces, el resultado final es el mismo.
* **PATCH:** Aplica modificaciones parciales a un recurso. **No es estrictamente idempotente** (dependiendo de cómo se implemente, por ejemplo, si el patch es "incrementar valor en 1").
* **DELETE:** Elimina un recurso. Es **idempotente** (borrar algo que ya fue borrado no cambia el estado final del sistema, aunque el servidor responda con un 404 en el segundo intento).
* **OPTIONS:** Devuelve los métodos HTTP soportados por el servidor para una URL específica. Vital para el manejo de CORS (Cross-Origin Resource Sharing) en navegadores.
* **HEAD:** Idéntico a GET, pero el servidor solo devuelve las cabeceras, sin el cuerpo de la respuesta. Ideal para verificar si un archivo ha cambiado o su tamaño antes de descargarlo.

### Cabeceras (Headers): Los metadatos de la web

Las cabeceras permiten al cliente y al servidor pasar información adicional junto con la petición o la respuesta. Son pares clave-valor (case-insensitive). Se dividen en varias categorías, pero las más críticas para el desarrollo backend son:

**Cabeceras de Petición (Request Headers):**
* `Accept`: Le dice al servidor qué tipo de contenido espera el cliente (ej. `application/json`, `text/html`).
* `Authorization`: Contiene las credenciales para autenticar al usuario (ej. `Bearer <token_jwt>`).
* `User-Agent`: Identifica el cliente, sistema operativo y versión que realiza la petición.

**Cabeceras de Respuesta (Response Headers):**
* `Content-Type`: Indica el tipo de medio del cuerpo de la respuesta (ej. `application/json; charset=utf-8`).
* `Set-Cookie`: Envía cookies desde el servidor al cliente para mantener sesiones o rastreo.
* `Cache-Control`: Directivas de almacenamiento en caché para optimizar el rendimiento.

### Códigos de Estado (Status Codes)

El código de estado es un número de tres dígitos que el servidor devuelve para indicar el resultado de la petición. Están agrupados en 5 clases. Manejarlos correctamente es la base para diseñar APIs RESTful predecibles (que abordaremos en la siguiente sección).

* **1xx (Informativos):** Petición recibida, el proceso continúa. (Ej. `101 Switching Protocols` usado al iniciar WebSockets).
* **2xx (Éxito):** La acción fue recibida, entendida y aceptada exitosamente.
    * **200 OK:** Éxito estándar.
    * **201 Created:** Petición completada, nuevo recurso creado (típico en respuestas `POST`).
    * **204 No Content:** Éxito, pero no hay cuerpo en la respuesta (típico en respuestas `DELETE` exitosas).
* **3xx (Redirección):** El cliente debe tomar acciones adicionales para completar la petición.
    * **301 Moved Permanently:** El recurso cambió de URI definitivamente.
    * **304 Not Modified:** El recurso no ha cambiado desde la última petición (basado en caché).
* **4xx (Errores del Cliente):** La petición contiene sintaxis incorrecta o no puede procesarse. **El error es culpa de quien hace la petición.**
    * **400 Bad Request:** Sintaxis inválida (ej. un JSON mal formado).
    * **401 Unauthorized:** Faltan credenciales válidas o son incorrectas.
    * **403 Forbidden:** Credenciales correctas, pero el usuario no tiene permisos para esa acción.
    * **404 Not Found:** El recurso solicitado no existe.
    * **429 Too Many Requests:** El cliente ha superado el límite de peticiones (Rate Limiting).
* **5xx (Errores del Servidor):** El servidor falló al completar una petición aparentemente válida. **El error es culpa de nuestra aplicación (el backend).**
    * **500 Internal Server Error:** Error genérico. Hubo una excepción no manejada en tu código Python.
    * **502 Bad Gateway / 504 Gateway Timeout:** Problemas de comunicación entre proxies o balanceadores de carga y tu servidor de aplicación (ej. Nginx fallando al conectar con Gunicorn).

### HTTP en la práctica con Python

Aunque Python incluye herramientas nativas como `urllib` o `http.client`, el ecosistema moderno utiliza librerías de terceros para interactuar con HTTP debido a su ergonomía. Aquí tienes un ejemplo de cómo manipular y leer explícitamente estos elementos usando la librería `requests` (que actúa como cliente):

```python
import requests

def realizar_peticion_avanzada():
    url = "https://api.ejemplo.com/v1/recurso"
    
    # 1. Definimos cabeceras explícitas
    headers = {
        "User-Agent": "LibroPythonSeniorApp/1.0",
        "Accept": "application/json",
        "Authorization": "Bearer token_seguro_123"
    }
    
    # 2. Definimos el payload para un método POST
    payload = {
        "nombre": "Nuevo Recurso",
        "activo": True
    }
    
    try:
        # Realizamos un POST. 'requests' serializa el dict a JSON automáticamente
        # y añade el header 'Content-Type: application/json'
        response = requests.post(url, headers=headers, json=payload, timeout=5.0)
        
        # 3. Analizamos el Código de Estado
        if response.status_code == 201:
            print("Recurso creado exitosamente.")
        elif response.status_code == 401:
            print("Error: Token inválido o expirado.")
            
        # 4. Inspeccionamos Cabeceras de Respuesta
        content_type = response.headers.get("Content-Type")
        print(f"El servidor respondió con tipo: {content_type}")
        
        # Si el servidor implementa Rate Limiting, podríamos leerlo así:
        limite_restante = response.headers.get("X-RateLimit-Remaining")
        if limite_restante:
            print(f"Peticiones restantes: {limite_restante}")

    except requests.exceptions.Timeout:
        print("El servidor tardó demasiado en responder (Timeout).")
    except requests.exceptions.RequestException as e:
        print(f"Fallo catastrófico de red: {e}")

if __name__ == "__main__":
    realizar_peticion_avanzada()
```

Comprender esta anatomía de HTTP te permitirá no solo consumir APIs de terceros con confianza, sino también diseñar tus propias interfaces en los próximos capítulos utilizando frameworks como FastAPI o Django, asegurando que tus servicios se comuniquen en el lenguaje estándar y semánticamente correcto de la web.

## 14.2 Diseño de APIs RESTful: Mejores prácticas y versionado

En la sección anterior dominamos el vocabulario de la web: HTTP. Ahora, necesitamos aprender a estructurar nuestras oraciones. Si HTTP es el idioma, **REST (Representational State Transfer)** es la guía de estilo que dicta cómo debemos escribir para que cualquier cliente —ya sea una aplicación de React, un dispositivo IoT u otro microservicio en Python— pueda entendernos de manera intuitiva y predecible.

Diseñar una API RESTful no consiste simplemente en devolver JSONs a través de la red. Implica adoptar un estilo arquitectónico basado en **recursos**, y aplicar un conjunto de convenciones que separen a los desarrolladores junior de los arquitectos senior.

### 1. El concepto fundamental: Todo es un Recurso

En arquitecturas antiguas (como SOAP o RPC), las URLs solían representar acciones o verbos (ej. `/obtener_usuario`, `/crear_factura`). REST cambia este paradigma: **las URLs deben representar sustantivos (recursos)**, y la acción a realizar sobre ese recurso la dicta el método HTTP.

#### Mejores prácticas de nomenclatura (Routing)

* **Usa sustantivos en plural:** Es el estándar de facto. Representa colecciones de recursos.
    * ✅ BIEN: `GET /usuarios`
    * ❌ MAL: `GET /usuario` o `GET /obtenerUsuarios`
* **Aplica métodos HTTP para las acciones:**
    * `POST /usuarios`: Crea un nuevo usuario en la colección.
    * `GET /usuarios/123`: Recupera el usuario con ID 123.
    * `PUT /usuarios/123`: Reemplaza por completo el usuario 123.
    * `PATCH /usuarios/123`: Modifica parcialmente el usuario 123.
    * `DELETE /usuarios/123`: Elimina el usuario 123.
* **Anidamiento lógico (pero limitado):** Si un recurso pertenece a otro, refléjalo en la URL, pero evita niveles de profundidad extremos. Una regla empírica es **no superar los dos niveles de profundidad**.
    * ✅ BIEN: `GET /usuarios/123/pedidos` (Obtiene los pedidos del usuario 123).
    * ✅ BIEN: `GET /pedidos/456` (Para ver un pedido específico, accede directo a su colección, no a través del usuario).
    * ❌ MAL: `GET /usuarios/123/pedidos/456/articulos/789` (Demasiado acoplado y difícil de mantener).

### 2. Filtrado, Ordenación y Paginación

Cuando hacemos `GET /usuarios`, no queremos devolver un millón de registros. Las APIs de nivel de producción utilizan **Query Parameters** (parámetros de consulta en la URL, después del `?`) para controlar la colección devuelta, sin cambiar la estructura de la ruta.

```text
GET /api/usuarios?rol=admin&orden=-fecha_creacion&limite=50&pagina=2
```

* **Filtrado:** `?rol=admin&estado=activo`. Busca coincidencias exactas o parciales.
* **Ordenación:** `?orden=fecha_creacion` (ascendente) o `?orden=-fecha_creacion` (descendente, el signo menos es una convención común).
* **Paginación:** Imprescindible para el rendimiento y uso de memoria. Puede ser por desplazamiento (`limite=50&pagina=2`) o por cursor (`limite=50&cursor=XYZ`), siendo esta última mucho más eficiente en bases de datos masivas.

### 3. Respuestas de Error Estructuradas

Un error 500 con un stacktrace de Python es inaceptable en producción; filtra información sensible y no ayuda al cliente a resolver el problema. Un desarrollador Senior diseña un contrato de errores consistente.

Una buena práctica es basarse en estándares como el **RFC 7807 (Problem Details for HTTP APIs)**, devolviendo siempre un objeto JSON predecible cuando se utiliza un código de estado `4xx` o `5xx`:

```json
{
  "tipo": "https://api.miproyecto.com/errores/validacion",
  "titulo": "Error de Validación en la Petición",
  "estado": 400,
  "detalle": "El payload contiene campos inválidos o faltantes.",
  "errores_especificos": [
    {"campo": "email", "mensaje": "El formato del correo es inválido."},
    {"campo": "edad", "mensaje": "Debe ser mayor de 18."}
  ]
}
```

### 4. El Modelo de Madurez de Richardson (Un apunte Senior)

Al discutir REST en entrevistas o diseño arquitectónico, es vital conocer el Modelo de Madurez de Richardson, que clasifica las APIs en 4 niveles (del 0 al 3):

* **Nivel 0 (El Pantano HTTP):** Usa HTTP solo como túnel (ej. un solo endpoint `POST /api` que recibe comandos).
* **Nivel 1 (Recursos):** Introduce múltiples URIs para distintos recursos, pero sigue usando solo POST para todo.
* **Nivel 2 (Verbos HTTP):** Utiliza correctamente GET, POST, PUT, DELETE y los códigos de estado. **Este es el estándar de la industria y al que aspiramos el 99% del tiempo.**
* **Nivel 3 (HATEOAS - Hypermedia As The Engine Of Application State):** La respuesta incluye hipervínculos para descubrir qué otras acciones se pueden realizar (como navegar por una página web). Aunque es el REST "puro" concebido por Roy Fielding, rara vez se implementa en la práctica por su complejidad y la sobrecarga en el payload.

---

### Versionado de APIs: Diseñando para el futuro

El software evoluciona. Eventualmente, tendrás que hacer un *breaking change* (cambio que rompe la compatibilidad), como eliminar un campo, cambiar un tipo de dato (de entero a string) o modificar profundamente la lógica de negocio. 

Si sobrescribes la API actual, romperás las aplicaciones cliente (móviles, webs de terceros) que dependen de ella. **El versionado es tu póliza de seguro.** Existen tres estrategias principales:

#### A. Versionado por URI (El más pragmático)
Es el estándar de la industria (utilizado por Stripe, Twitter, y la mayoría de servicios). La versión se incluye explícitamente en la ruta.
* `GET /api/v1/usuarios`
* `GET /api/v2/usuarios`
* **Pros:** Explícito, fácil de entender, cacheable por URIs distintas, fácil de enrutar en el balanceador de carga o API Gateway (ej. mandar tráfico `v1` a servidores antiguos y `v2` a nuevos).
* **Contras:** Purísticamente, viola la idea de que una URI representa un único recurso inmutable a lo largo del tiempo.

#### B. Versionado por Cabeceras (Content Negotiation)
La versión no está en la URL. El cliente especifica qué versión espera mediante la cabecera `Accept`. Ésta es la forma REST "purista".
* `GET /api/usuarios`
* `Accept: application/vnd.miempresa.v1+json`
* **Pros:** Mantiene las URIs limpias. Fiel a la arquitectura REST estricta.
* **Contras:** Más difícil de probar (no puedes simplemente pegar la URL en el navegador), requiere clientes más sofisticados y complica el trabajo con cachés. (Utilizado por GitHub).

#### C. Versionado por Query Parameter
La versión se pasa como un filtro adicional.
* `GET /api/usuarios?version=1`
* **Pros:** Fácil de implementar temporalmente.
* **Contras:** Suele ensuciar la lógica de los controladores y no es tan semánticamente correcto para cambios arquitectónicos grandes.

**Recomendación para un perfil Senior:** Inicia siempre tus proyectos backend colocando un `/v1/` en tu prefijo de rutas base. Aunque no planees una `v2` a corto plazo, el día que la necesites agradecerás haber establecido esta separación desde el primer commit. En el Capítulo 16, veremos cómo frameworks como FastAPI hacen que gestionar estos prefijos modulares sea cuestión de un par de líneas de código.

## 14.3 Alternativas a REST: Conceptos de GraphQL y gRPC

REST ha sido el estándar de facto para el desarrollo de APIs durante más de una década. Sus convenciones y su uso semántico de HTTP lo hacen predecible y universal. Sin embargo, a medida que las aplicaciones frontend se vuelven más complejas (Single Page Applications, apps móviles) y las arquitecturas backend se fragmentan en cientos de microservicios, las limitaciones de REST comienzan a manifestarse.

Para un desarrollador Senior, REST no es la única herramienta en el cinturón. Es vital entender sus deficiencias y conocer las alternativas: **GraphQL** para interfaces de usuario dinámicas y **gRPC** para la comunicación ultrarrápida entre servidores.

---

### 1. El problema con REST: Over-fetching y Under-fetching

En REST, el backend dicta la estructura de la respuesta. Si un cliente móvil necesita mostrar una lista de usuarios con su nombre y avatar, hace un `GET /usuarios`. 

* **Over-fetching (Sobredescarga):** El servidor devuelve el nombre, avatar, pero también el email, fecha de nacimiento, rol, dirección y otros 20 campos que el cliente móvil no necesita. Se desperdicia ancho de banda y memoria.
* **Under-fetching (Subdescarga):** Si además de los usuarios, el cliente necesita los últimos 3 artículos que escribió cada uno, REST suele obligar a realizar múltiples peticiones: primero un `GET /usuarios` y luego iterar haciendo `GET /usuarios/{id}/articulos`. Esto penaliza severamente el rendimiento por la latencia de red.

### 2. GraphQL: El poder de decisión para el cliente

Creado por Facebook en 2012, GraphQL es un lenguaje de consulta para APIs. Su filosofía invierte el control: **el servidor define qué datos están disponibles (mediante un Esquema estricto), pero el cliente decide exactamente qué datos quiere recibir.**

En lugar de tener múltiples URLs (endpoints) para cada recurso, GraphQL expone **un único endpoint** (usualmente `POST /graphql`).

#### Diagrama de flujo: REST vs GraphQL

```text
[Cliente] --- GET /usuarios -------------> [API REST] ---> Devuelve Usuario + 20 campos inútiles
[Cliente] --- GET /usuarios/1/posts -----> [API REST] ---> Devuelve Posts del usuario 1
[Cliente] --- GET /usuarios/2/posts -----> [API REST] ---> Devuelve Posts del usuario 2
(Múltiples viajes, latencia alta)

vs

[Cliente] --- POST /graphql -------------> [API GraphQL] -> Devuelve SOLO lo solicitado, todo junto.
Query: { 
  usuarios { 
    nombre 
    avatar 
    posts(limite: 3) { titulo } 
  } 
}
```

#### Conceptos Clave en GraphQL
1.  **Schema (Esquema):** Un contrato fuertemente tipado que define los tipos de datos y sus relaciones.
2.  **Query:** Equivalente a un `GET` en REST. Solicita datos sin modificarlos.
3.  **Mutation:** Equivalente a `POST/PUT/DELETE`. Modifica datos en el servidor.
4.  **Resolvers:** Funciones en tu código Python que se encargan de ir a la base de datos y obtener los campos específicos solicitados en la Query.

#### GraphQL en Python (Ejemplo con `strawberry`)
El ecosistema moderno de Python brilla con GraphQL gracias a librerías como **Strawberry**, que utiliza los Type Hints (que vimos en el Capítulo 11) para generar el esquema automáticamente:

```python
import strawberry
from typing import List

# 1. Definimos los tipos de datos (El Esquema)
@strawberry.type
class Articulo:
    titulo: str
    contenido: str

@strawberry.type
class Usuario:
    nombre: str
    avatar: str
    articulos: List[Articulo]

# 2. Creamos la base de datos simulada y los Resolvers
def obtener_usuarios() -> List[Usuario]:
    return [
        Usuario(
            nombre="Ana", 
            avatar="ana.png", 
            articulos=[Articulo(titulo="GraphQL en Python", contenido="...")]
        )
    ]

# 3. Definimos la Query principal
@strawberry.type
class Query:
    usuarios: List[Usuario] = strawberry.field(resolver=obtener_usuarios)

# 4. Compilamos el esquema
schema = strawberry.Schema(query=Query)
```

**Pros:** Flexibilidad extrema para el frontend, tipado estricto, evolución de la API sin versionamiento (solo añades campos nuevos al esquema).
**Contras:** Dificulta el uso de la caché HTTP tradicional, añade complejidad en el backend (problema N+1 en bases de datos) y es excesivo para APIs simples.

---

### 3. gRPC: Rendimiento puro para Microservicios

Mientras GraphQL optimiza la comunicación entre el Cliente (navegador/móvil) y el Servidor, **gRPC** (desarrollado por Google) está diseñado para la comunicación interna **entre Servidores** (Backend a Backend).

Si tienes un microservicio de Facturación en Python que necesita validar un usuario en el microservicio de Autenticación (quizás escrito en Go), usar JSON sobre REST HTTP/1.1 es lento: hay que convertir objetos a texto (JSON), enviarlos, recibirlos y volver a parsearlos a objetos.

gRPC cambia las reglas del juego utilizando dos tecnologías clave:
1.  **HTTP/2:** Permite multiplexación (múltiples llamadas paralelas sobre una sola conexión TCP) y streaming bidireccional real.
2.  **Protocol Buffers (Protobuf):** Un formato de serialización **binario**. En lugar de enviar texto legible, envía bytes empaquetados de forma extremadamente eficiente.

#### El flujo de trabajo con gRPC

Con gRPC, no escribes directamente el código de las rutas. Escribes un archivo `.proto` independiente del lenguaje, que actúa como el contrato irrompible entre los microservicios.

**Archivo `usuario.proto`:**
```protobuf
syntax = "proto3";

// Definimos los tipos de mensajes (Payloads)
message SolicitudUsuario {
  int32 usuario_id = 1;
}

message RespuestaUsuario {
  int32 id = 1;
  string nombre = 2;
  bool activo = 3;
}

// Definimos el Servicio (La API)
service ServicioUsuarios {
  rpc ObtenerUsuario (SolicitudUsuario) returns (RespuestaUsuario);
}
```

Luego, utilizas herramientas (como `grpcio-tools` en Python) para compilar este archivo. El compilador genera automáticamente las clases Python y el código de red necesario. En tu código, llamar al microservicio remoto se siente como llamar a una función local de Python, ocultando toda la complejidad de la red.

**Pros:** Ultrarrápido, menor consumo de ancho de banda, contratos de datos estrictos y autogeneración de código para múltiples lenguajes.
**Contras:** Los payloads no son legibles por humanos (no puedes usar `curl` o Postman tan fácilmente sin configuración), su soporte en navegadores web es limitado (requiere proxies como grpc-web) y la curva de aprendizaje es más pronunciada.

---

### Resumen: ¿Cuándo usar qué?

Como Arquitecto de Software o Backend Senior, elegir el protocolo correcto es tu responsabilidad. Aquí tienes una matriz de decisión rápida:

| Característica | REST | GraphQL | gRPC |
| :--- | :--- | :--- | :--- |
| **Formato de datos** | JSON / XML (Texto) | JSON (Texto) | Protobuf (Binario) |
| **Transporte** | HTTP/1.1 o HTTP/2 | HTTP/1.1 o HTTP/2 | HTTP/2 (Obligatorio) |
| **Endpoint** | Múltiples URLs | Un solo endpoint (`/graphql`) | Llamadas a procedimientos |
| **Tipado** | Débil (Depende de OpenAPI/Swagger) | Fuerte (Esquema estricto) | Muy Fuerte (`.proto`) |
| **Caso de uso ideal** | APIs públicas, CRUDs estándar, integraciones de terceros. | APIs complejas para Frontend/Móvil con interfaces muy dinámicas. | Comunicación interna entre microservicios, sistemas de alta carga. |

## 14.4 Comunicación bidireccional con WebSockets

Hasta ahora, en nuestra exploración de HTTP, REST, GraphQL y gRPC, hemos operado bajo un paradigma estricto: **el cliente siempre da el primer paso**. El servidor es reactivo; espera una petición, la procesa, envía una respuesta y la transacción termina. 

Pero, ¿qué ocurre si el servidor necesita notificar al cliente sobre un evento en tiempo real? (Por ejemplo, un nuevo mensaje en un chat, una actualización de precio en una plataforma de trading o el movimiento de otro jugador en un videojuego).

En el pasado, simulábamos esta bidireccionalidad utilizando "hacks" sobre HTTP:
1. **Short Polling:** El cliente pregunta cada 2 segundos: *"¿Hay algo nuevo?"*. Genera un desperdicio masivo de recursos de red y CPU si la respuesta suele ser *"No"*.
2. **Long Polling:** El cliente pregunta, pero si no hay datos, el servidor mantiene la petición HTTP en suspenso hasta que ocurra un evento. Cuando ocurre, responde y el cliente vuelve a abrir otra petición. Es más eficiente, pero la latencia de reabrir conexiones sigue siendo alta.
3. **Server-Sent Events (SSE):** Una conexión HTTP unidireccional permanente donde el servidor puede enviar datos al cliente. Excelente para notificaciones (como un *feed* de noticias), pero el cliente no puede usar este mismo canal para enviar datos de vuelta.

Para resolver esto de forma nativa y elegante, nacieron los **WebSockets**.

### ¿Qué es un WebSocket?

WebSocket es un protocolo de comunicaciones que proporciona un canal **full-duplex** (bidireccional simultáneo) sobre una única conexión TCP de larga duración. 

A diferencia de HTTP, que es *stateless* (sin estado), una conexión WebSocket es *stateful* (con estado). Una vez establecida, ambos extremos pueden enviarse mensajes (llamados *frames*) en cualquier momento y en cualquier dirección, sin la sobrecarga de enviar las cabeceras HTTP en cada transmisión.

#### El Handshake: De HTTP a WebSocket

Un detalle fascinante (y pregunta clásica de entrevista Senior) es cómo se inicia una conexión WebSocket. Todo comienza como una petición HTTP GET normal. El cliente envía una petición pidiendo "actualizar" (upgrade) el protocolo.

```text
[Cliente] --- GET /chat HTTP/1.1 ---------------------> [Servidor]
              Host: api.ejemplo.com
              Upgrade: websocket
              Connection: Upgrade
              Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
              Sec-WebSocket-Version: 13

[Cliente] <--- HTTP/1.1 101 Switching Protocols -------- [Servidor]
              Upgrade: websocket
              Connection: Upgrade
              Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

[Cliente] <================ Conexión TCP Persistente ===============> [Servidor]
          <------ (Frame binario o de texto desde el servidor) ------
          ------- (Frame binario o de texto desde el cliente) ------>
```

Como vimos en la sección 14.1, el servidor responde con el código de estado **101 Switching Protocols**. A partir de ese momento, la semántica HTTP desaparece. La conexión permanece abierta utilizando los esquemas `ws://` (texto plano) o `wss://` (seguro mediante TLS, equivalente a HTTPS).

### Implementación asíncrona en Python

Para manejar cientos o miles de conexiones WebSocket simultáneas, el uso de programación asíncrona (que dominamos en el Capítulo 12) es obligatorio. Un hilo o proceso dedicado por cada conexión colapsaría nuestro servidor rápidamente.

Aunque en el Capítulo 16 veremos cómo frameworks modernos como FastAPI integran WebSockets de forma nativa, es fundamental entender las bases utilizando la librería estándar de facto para este propósito: `websockets`.

A continuación, implementaremos un servidor básico de chat donde cualquier mensaje enviado por un cliente es retransmitido (broadcast) a todos los demás clientes conectados.

```python
import asyncio
import websockets
import json

# Un conjunto (set) para guardar las referencias de las conexiones activas
clientes_conectados = set()

async def manejador_chat(websocket):
    """
    Esta corrutina se ejecuta cada vez que un nuevo cliente se conecta.
    """
    # 1. Registramos al nuevo cliente
    clientes_conectados.add(websocket)
    cliente_id = id(websocket)
    print(f"[+] Nuevo cliente conectado: {cliente_id}. Total: {len(clientes_conectados)}")
    
    try:
        # 2. Bucle infinito escuchando los mensajes de este cliente
        async for mensaje in websocket:
            print(f"[{cliente_id}] envió: {mensaje}")
            
            # Preparamos el payload a retransmitir
            payload = json.dumps({"origen": cliente_id, "texto": mensaje})
            
            # 3. Hacemos broadcast a todos LOS DEMÁS clientes
            for cliente in clientes_conectados:
                if cliente != websocket:
                    # Usamos asyncio.create_task para no bloquear el bucle
                    asyncio.create_task(cliente.send(payload))
                    
    except websockets.exceptions.ConnectionClosed:
        print(f"[-] Cliente {cliente_id} cerró la conexión bruscamente.")
        
    finally:
        # 4. Limpieza cuando el cliente se desconecta (por cualquier razón)
        clientes_conectados.remove(websocket)
        print(f"[*] Cliente {cliente_id} desconectado. Total: {len(clientes_conectados)}")

async def main():
    # Iniciamos el servidor en el puerto 8765
    async with websockets.serve(manejador_chat, "localhost", 8765):
        print("Servidor WebSocket corriendo en ws://localhost:8765")
        await asyncio.Future()  # Mantiene el servidor ejecutándose indefinidamente

if __name__ == "__main__":
    asyncio.run(main())
```

### Arquitectura Senior: Los retos de escalar WebSockets

Crear un chat local en Python es fácil. Escalarlo para un millón de usuarios es uno de los mayores desafíos de la ingeniería de software moderna. Cuando pases a un entorno de producción, te enfrentarás a tres problemas arquitectónicos clave:

1. **El problema del balanceo de carga:**
   Los balanceadores de carga tradicionales distribuyen cada petición HTTP al servidor menos ocupado. Con WebSockets, la conexión es de larga duración. Si un usuario se conecta al `Servidor A`, se queda allí. Necesitas un balanceador que soporte proxying de WebSockets (como Nginx, HAProxy o AWS ALB).
   
2. **El problema del estado distribuido (Pub/Sub):**
   Imagina que el Usuario 1 está conectado al `Servidor A` y el Usuario 2 al `Servidor B`. Si el Usuario 1 envía un mensaje al chat general, el `Servidor A` solo conoce sus propias conexiones. No puede enviárselo al Usuario 2. 
   La solución estándar en la industria es utilizar un **Backplane de mensajería o patrón Pub/Sub** (usualmente **Redis**, que abordaremos en el Capítulo 19). Cuando el Usuario 1 envía un mensaje, el `Servidor A` lo publica en Redis. Todos los servidores (A, B, C...) están suscritos a ese canal de Redis, reciben el mensaje y se lo retransmiten a sus respectivos clientes conectados.

3. **Mantenimiento de la conexión (Ping/Pong):**
   Los routers y firewalls intermedios en Internet suelen cerrar silenciosamente las conexiones TCP inactivas para ahorrar memoria. Para evitar que tus WebSockets "mueran", el protocolo incluye *frames* de control especiales llamados Ping y Pong. Tu servidor Python (o el cliente) debe enviar un "Ping" periódicamente, y el otro extremo debe responder con un "Pong" para demostrar que sigue ahí, manteniendo la conexión caliente.

Dominar WebSockets completa tu arsenal de protocolos de red. Ya tienes las herramientas para decidir cuándo el cliente debe pedir datos (REST/GraphQL), cuándo los servidores deben hablar entre ellos en binario (gRPC) y cuándo necesitas un puente continuo bidireccional (WebSockets). Estás listo para pasar a la capa de persistencia en el Capítulo 15.