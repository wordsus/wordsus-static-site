La seguridad en la capa de aplicación es el pilar que transforma una red abierta en un ecosistema empresarial confiable. Este capítulo analiza la evolución de los mecanismos de control de acceso, desde la sencillez de los esquemas **Básicos** y **Digest**, hasta la sofisticación de la autenticación basada en **Tokens (JWT)**. Exploraremos cómo protocolos como **OAuth 2.0** y **OIDC** permiten delegar la identidad de forma segura, y cerraremos con las estrategias de **Rate Limiting** esenciales para proteger la disponibilidad de la infraestructura mediante el código **429**. Como administrador, dominar estos flujos es vital para garantizar la integridad y resiliencia de cualquier servicio web moderno.

## 6.1. Autenticación Básica y Digest (Limitaciones y casos de uso legacy)

Antes de la proliferación de arquitecturas descentralizadas, tokens criptográficos y proveedores de identidad federados, el protocolo HTTP integró sus propios mecanismos nativos para el control de acceso: la Autenticación Básica y la Autenticación Digest. Aunque hoy en día se consideran enfoques *legacy* (heredados) para la mayoría de las aplicaciones orientadas al usuario, como administradores de sistemas y operadores de red, es crucial comprender cómo funcionan a nivel de protocolo, sus vulnerabilidades y en qué nichos de infraestructura aún tienen cabida.

Ambos esquemas se basan en un modelo de **desafío-respuesta** (challenge-response) utilizando los códigos de estado `401 Unauthorized` y las cabeceras `WWW-Authenticate` y `Authorization`.

---

### Autenticación Básica (Basic Authentication)

Es el mecanismo de control de acceso más simple integrado en HTTP. Su diseño prioritario fue la facilidad de implementación, no la seguridad.

**El Flujo del Protocolo:**

Cuando un cliente intenta acceder a un recurso protegido sin credenciales (o con credenciales inválidas), el servidor web rechaza la petición e instruye al cliente sobre el esquema de autenticación requerido y el *realm* (un identificador del área protegida).

```text
+---------+                               +----------+
| Cliente |                               | Servidor |
+---------+                               +----------+
     |                                         |
     | 1. GET /admin/metrics HTTP/1.1          |
     |---------------------------------------->|
     |                                         |
     | 2. HTTP/1.1 401 Unauthorized            |
     |    WWW-Authenticate: Basic realm="Ops"  |
     |<----------------------------------------|
     |                                         |
     | 3. GET /admin/metrics HTTP/1.1          |
     |    Authorization: Basic YWRtaW46czNjcmV0|
     |---------------------------------------->|
     |                                         |
     | 4. HTTP/1.1 200 OK                      |
     |<----------------------------------------|

```

**Anatomía de la cabecera `Authorization`:**
El cliente toma el nombre de usuario y la contraseña, los concatena con dos puntos (`usuario:contraseña`) y codifica la cadena resultante en **Base64**.

Si las credenciales son `admin` y `s3cret`, la cadena `admin:s3cret` codificada en Base64 es `YWRtaW46czNjcmV0`.

```http
Authorization: Basic YWRtaW46czNjcmV0

```

**Limitaciones Operativas y de Seguridad:**

1. **Falsa sensación de seguridad:** Base64 **no es cifrado**, es solo codificación. Cualquiera que intercepte el tráfico de red (como vimos en el Capítulo 8 con herramientas como `tcpdump` o `Wireshark`) puede decodificar las credenciales de forma trivial.
2. **Dependencia absoluta de TLS:** Debido al punto anterior, la Autenticación Básica *jamás* debe usarse sobre HTTP en texto plano. Requiere obligatoriamente un canal seguro (HTTPS), delegando toda la confidencialidad a la capa de transporte (Capítulo 5).
3. **Incapacidad para revocar sesiones:** HTTP es *stateless* (sin estado). El navegador enviará automáticamente la cabecera `Authorization` en cada petición posterior a ese dominio. No existe una forma nativa de hacer un "logout" o invalidar la sesión desde el servidor sin cerrar el navegador o limpiar la caché de credenciales del cliente.

**Casos de Uso Actuales (Legacy / Infraestructura):**

* **Endpoints internos de monitorización:** Por ejemplo, proteger los endpoints `/metrics` de Prometheus en exportadores internos donde el riesgo de exposición lateral es mínimo (o cuando se combina con mTLS).
* **APIs internas simples:** Comunicación máquina a máquina en redes aisladas donde implementar OAuth 2.0 supondría un *overhead* arquitectónico innecesario.
* **Paneles de control de hardware de red:** Routers antiguos o switches *out-of-band* que no soportan esquemas modernos.

---

### Autenticación Digest (Digest Authentication)

Introducida para solventar el envío de contraseñas en "texto plano" (Base64) de la Autenticación Básica, el esquema Digest utiliza funciones hash criptográficas (típicamente MD5, o en implementaciones más modernas SHA-256) para probar al servidor que el cliente conoce la contraseña, sin llegar a transmitirla por la red.

**El Flujo del Protocolo:**

El servidor envía un desafío que incluye un *nonce* (un valor numérico o cadena de texto único generado criptográficamente, válido para un solo uso o por un tiempo limitado).

```text
+---------+                                       +----------+
| Cliente |                                       | Servidor |
+---------+                                       +----------+
     |                                                 |
     | 1. GET /api/config HTTP/1.1                     |
     |------------------------------------------------>|
     |                                                 |
     | 2. HTTP/1.1 401 Unauthorized                    |
     |    WWW-Authenticate: Digest realm="Ops",        |
     |    qop="auth", nonce="dcd98b7102dd2f0e8b11..."  |
     |<------------------------------------------------|
     |                                                 |
     | 3. GET /api/config HTTP/1.1                     |
     |    Authorization: Digest username="admin",      |
     |    realm="Ops", nonce="dcd98b7102dd2f0e8b11...",|
     |    uri="/api/config", response="6629fae4939..." |
     |------------------------------------------------>|
     |                                                 |
     | 4. HTTP/1.1 200 OK                              |
     |<------------------------------------------------|

```

**Mecánica de Hashes (Matemática del Protocolo):**
Para generar la respuesta (el valor `response` en la cabecera), el cliente realiza una serie de cálculos utilizando el algoritmo especificado. Si asumiéramos el uso de MD5 clásico, la generación del hash sigue estas fórmulas:

1. Se genera un hash de las credenciales:
$HA1 = MD5(username : realm : password)$
2. Se genera un hash de los datos de la petición (para evitar manipulación de la ruta):
$HA2 = MD5(method : digestURI)$
3. Se genera el valor final utilizando el *nonce* proporcionado por el servidor:
$Response = MD5(HA1 : nonce : HA2)$

*(Nota: Implementaciones que utilizan `qop="auth"` incluyen además el recuento de peticiones `nc` y un nonce del cliente `cnonce` para evitar ataques de repetición).*

**Limitaciones Operativas y de Seguridad:**

1. **Vulnerabilidad del algoritmo:** Históricamente, Digest depende de MD5, un algoritmo de hash que hoy en día se considera criptográficamente roto y vulnerable a ataques de colisión.
2. **Almacenamiento de contraseñas en el servidor:** Esta es su mayor desventaja a nivel de SysAdmin. Para que el servidor pueda verificar el valor $HA1$, **debe conocer la contraseña en texto plano** o almacenar el hash exacto de $username : realm : password$. Esto impide el uso de algoritmos modernos y seguros para el almacenamiento de contraseñas en bases de datos (como bcrypt o Argon2), violando las normativas de seguridad contemporáneas.
3. **Complejidad y estado:** El servidor debe mantener el estado para validar los *nonces* emitidos, lo que complica el balanceo de carga en Capa 7 (Capítulo 7) y rompe la naturaleza *stateless* deseada para escalar aplicaciones web horizontalmente.
4. **Ataques Man-in-the-Middle (MitM):** Aunque oculta la contraseña, sin TLS, un atacante en la red puede interceptar la sesión o forzar al cliente a hacer *downgrade* a Autenticación Básica.

**Casos de Uso Actuales (Legacy / Infraestructura):**

* **Telefonía IP (VoIP) y SIP:** El protocolo Session Initiation Protocol (SIP) heredó extensivamente el uso de autenticación Digest de HTTP. Es estándar en la autenticación de teléfonos físicos contra centrales PBX (como Asterisk).
* **Dispositivos IoT y Cámaras IP:** Muchos dispositivos embebidos con recursos computacionales limitados (donde la negociación de un Handshake TLS completo es costosa) continúan usando Digest sobre HTTP en redes locales.

---

**Resumen Operativo:**
Como administradores de sistemas, es probable que solo interactúen con la autenticación Básica al configurar proxies inversos (ej. directivas `auth_basic` en Nginx o HAProxy) para proteger endpoints internos sin exponer un proveedor de identidad. Digest ha sido prácticamente desterrado de las aplicaciones modernas. Las serias limitaciones en la gestión del ciclo de vida de la sesión, el riesgo de exposición lateral y la incompatibilidad con las mejores prácticas de hashing de contraseñas han impulsado a la industria hacia soluciones más robustas y *stateless*, como veremos en la siguiente sección al abordar los Tokens (Bearer/JWT).

## 6.2. Autenticación basada en Tokens (Bearer tokens, JWT) y el encabezado `Authorization`

Para superar las limitaciones de estado y escalabilidad que presentan los esquemas tradicionales como Basic y Digest, la web moderna —y especialmente el ecosistema de APIs RESTful y microservicios— adoptó la autenticación basada en tokens. En este paradigma, el servidor no necesita recordar la "sesión" del usuario; todo el contexto necesario para autorizar una petición viaja encriptado o firmado dentro del propio mensaje HTTP.

Para un administrador de sistemas, este cambio es fundamental: permite que los servidores web y los microservicios operen de manera verdaderamente *stateless* (sin estado), facilitando enormemente el balanceo de carga y el escalado horizontal.

---

### El Patrón "Bearer Token"

El esquema *Bearer* (portador) es un mecanismo de autorización donde cualquier parte que posea el token (el "portador") puede utilizarlo para acceder a los recursos protegidos. El servidor no verifica la identidad del cliente que envía el token, sino **la validez del token en sí**.

A nivel HTTP, el cliente incluye el token en las peticiones mediante el encabezado `Authorization`, utilizando la palabra clave `Bearer`:

```http
GET /api/v1/servers/stats HTTP/1.1
Host: api.infraestructura.local
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```

**La Regla de Oro de Operaciones:** Dado que el token equivale a las credenciales ("quien tiene el token, tiene el poder"), **el uso de TLS (HTTPS) es absolutamente obligatorio**. Si un Bearer token es interceptado en texto plano, el atacante tiene acceso inmediato y total hasta que el token expire.

---

### JSON Web Tokens (JWT): El Estándar de la Industria

Aunque un Bearer token puede ser cualquier cadena opaca (como un UUID generado por una base de datos), el estándar dominante hoy en día es el **JWT (JSON Web Token)**, definido en el RFC 7519.

Un JWT es un estándar abierto que define una forma compacta y autónoma de transmitir información de forma segura entre partes como un objeto JSON. Para los SysAdmins e Ingenieros DevOps, la magia del JWT radica en que está **firmado digitalmente**, lo que garantiza que no ha sido alterado en tránsito.

**Anatomía de un JWT:**
Si inspeccionas un JWT (por ejemplo, decodificando el tráfico en tu proxy inverso), verás que consiste en tres partes separadas por puntos (`.`):

`Header.Payload.Signature`

```text
+----------------+       +-------------------+       +--------------------+
|    Header      |       |      Payload      |       |     Signature      |
| (Algoritmo y   |   .   | (Datos del usuario|   .   | (Firma cripto-     |
|  tipo de token)|       |  y permisos)      |       |  gráfica)          |
+----------------+       +-------------------+       +--------------------+
 Base64URL encoded         Base64URL encoded           Hash calculado

```

1. **Header:** Describe el algoritmo de firma (ej. `HS256` para simétrico, `RS256` para asimétrico) y el tipo (`JWT`).
2. **Payload (Claims):** Contiene las afirmaciones (*claims*). Aquí viajan datos como el ID del usuario (`sub`), el rol (`role`), el momento de emisión (`iat`), y, críticamente, **la fecha de expiración (`exp`)**.
3. **Signature:** Es el sello de seguridad. El servidor toma el Header y el Payload codificados, el secreto o clave privada, y aplica el algoritmo especificado en el Header.

**Ejemplo de un Payload decodificado:**

```json
{
  "sub": "sysadmin_juan",
  "role": "cluster_admin",
  "iat": 1698765432,
  "exp": 1698769032
}

```

---

### Implicaciones Arquitectónicas y de Infraestructura

La adopción de JWT cambia radicalmente cómo diseñamos y operamos la infraestructura HTTP:

**1. Delegación en API Gateways (Offloading):**
En arquitecturas modernas, los servidores de backend (microservicios) no realizan autenticación. Un proxy inverso avanzado o un API Gateway (como Nginx, Kong, o Traefik) intercepta la petición HTTP, verifica matemáticamente la firma del JWT (usando una clave pública precompartida) y, si es válido, deja pasar la petición. Esto reduce drásticamente la carga de CPU en los backends y centraliza la seguridad.

**2. Escalabilidad Stateless:**
A diferencia de las cookies de sesión tradicionales (Capítulo 2), que requieren que el servidor (o una base de datos centralizada como Redis) mantenga un registro de quién está logueado, un backend HTTP solo necesita hacer una operación matemática (verificar la firma) para saber si debe procesar un request con un JWT. Cualquier nodo en un clúster puede atender cualquier request.

**3. El Problema de la Revocación (Troubleshooting crítico):**
Esta es la gran "trampa" operativa de los JWT. Como la validación es puramente matemática y no se consulta una base de datos central, **no hay una forma directa de invalidar un JWT antes de que expire**. Si un empleado es despedido, su JWT sigue siendo válido para el servidor web hasta llegar a su marca de tiempo `exp`.

*Estrategias de mitigación en operaciones:*

* **Tiempos de vida muy cortos (TTL):** Emitir JWTs que expiren en 5 o 15 minutos, requiriendo que el cliente solicite uno nuevo (usando un *Refresh Token* opaco) contra un servidor de identidad centralizado.
* **Listas Negras (Denylists) en memoria:** Configurar el API Gateway para que consulte rápidamente una base de datos en memoria (como Memcached o Redis) que contenga los IDs de los tokens revocados explícitamente, aunque esto reintroduce un pequeño estado en la arquitectura.

**4. Tamaño de las Cabeceras (Tuning del Servidor):**
A diferencia de Basic Auth, que añade unas pocas docenas de bytes al request HTTP, un JWT complejo con múltiples permisos puede ocupar varios kilobytes. Como SysAdmin, deberás estar atento a los errores **`431 Request Header Fields Too Large`** o similares.

* En **Nginx**, esto suele requerir ajustar las directivas `client_header_buffer_size` y `large_client_header_buffers` para evitar que el proxy rechace peticiones HTTP legítimas debido al tamaño masivo de la cabecera `Authorization`.

## 6.3. Integración de HTTP con protocolos de identidad: OAuth 2.0 y OIDC

En la sección anterior vimos cómo los tokens (especialmente los JWT) permiten a los servidores web validar solicitudes de forma *stateless*. Sin embargo, surge una pregunta crítica a nivel de arquitectura: **¿Cómo obtiene el cliente ese token de forma segura en primer lugar?** No queremos que los usuarios entreguen sus contraseñas directamente a cada aplicación o microservicio.

Aquí es donde entran en juego **OAuth 2.0** y **OpenID Connect (OIDC)**. Estos protocolos estandarizan el flujo de mensajes HTTP para delegar la autenticación y la autorización a un servidor centralizado (Identity Provider o IdP, como Keycloak, Auth0, Okta o Google Workspace).

Para un administrador de sistemas, comprender estos flujos es vital, ya que gran parte de la configuración de seguridad en API Gateways, Ingress Controllers y proxies inversos gira en torno a interceptar y gestionar estas redirecciones HTTP.

---

### La distinción fundamental: Autorización vs. Autenticación

Un error común en la industria es confundir los propósitos de ambos protocolos. Es crucial separarlos:

* **OAuth 2.0 es un marco de Autorización:** Responde a la pregunta *"¿Tiene esta aplicación permiso para acceder a este recurso en nombre del usuario?"*. Emite **Access Tokens** (Típicamente JWTs o tokens opacos). No está diseñado para decirle a la aplicación *quién* es el usuario.
* **OpenID Connect (OIDC) es una capa de Autenticación:** Se construye exactamente sobre OAuth 2.0 y responde a la pregunta *"¿Quién es el usuario actual?"*. Introduce un nuevo tipo de token llamado **ID Token** (que siempre es un JWT) con información estándar sobre el perfil del usuario.

---

### El Flujo de Código de Autorización (Authorization Code Flow)

Este es el flujo HTTP más seguro y el estándar *de facto* para aplicaciones web y móviles modernas. Evita que los tokens pasen por el navegador del usuario (frontend), previniendo su filtración en el historial o mediante scripts maliciosos (XSS).

**Actores involucrados:**

1. **User Agent (Navegador):** El cliente interactuando con la web.
2. **Client Application:** El servidor web que necesita consumir la API.
3. **Authorization Server (IdP):** El servidor que emite los tokens (ej. Keycloak).
4. **Resource Server (API):** El backend protegido.

**Secuencia HTTP (Simplificada):**

```text
+-----------+            +---------------+          +-------------------+
| Navegador |            | Client App    |          | Auth Server (IdP) |
+-----------+            +---------------+          +-------------------+
      |                          |                            |
      | 1. Clic en "Login"       |                            |
      |------------------------->|                            |
      |                          |                            |
      | 2. HTTP 302 Redirect a   |                            |
      | /authorize?client_id=... |                            |
      |<-------------------------|                            |
      |                          |                            |
      | 3. GET /authorize?client_id=...&redirect_uri=...      |
      |------------------------------------------------------>|
      |                                                       |
      | 4. El usuario se autentica (ej. Formulario / 2FA)     |
      | <interacción directa entre Navegador e IdP>           |
      |                                                       |
      | 5. HTTP 302 Redirect a   |                            |
      | redirect_uri?code=XYZ123 |                            |
      |<------------------------------------------------------|
      |                          |                            |
      | 6. GET /callback?code=XYZ123                          |
      |------------------------->|                            |
      |                          | 7. POST /token             |
      |                          | client_id, client_secret,  |
      |                          | code=XYZ123                |
      |                          |--------------------------->|
      |                          |                            |
      |                          | 8. HTTP 200 OK             |
      |                          | { "access_token": "...",   |
      |                          |   "id_token": "..." }      |
      |                          |<---------------------------|
      | 9. HTTP 200/302 (Sesión  |                            |
      | local establecida)       |                            |
      |<-------------------------|                            |

```

**Puntos Críticos para Operaciones (SysAdmins):**

1. **Redirect URIs estrictas:** El paso 5 (el IdP redirigiendo de vuelta a la app) es un vector de ataque masivo si no se configura bien. Como administradores, debemos asegurar que el IdP tenga una lista blanca (whitelist) estricta de `redirect_uris` exactas. Si se permite un comodín (`https://*.midominio.com/callback`), un atacante podría secuestrar el código de autorización (`code=XYZ123`).
2. **Gestión de Secretos:** En el paso 7, la aplicación cliente hace una llamada directa (backend a backend) al IdP usando un `client_secret`. Este secreto nunca debe exponerse en el frontend ni guardarse en repositorios de código; debe gestionarse a través de variables de entorno o bóvedas de secretos (como HashiCorp Vault).
3. **Seguridad del canal (TLS):** Al igual que con los Bearer tokens, todo este intercambio requiere que cada endpoint esté protegido por HTTPS.

---

### OIDC y el Punto de Descubrimiento (Discovery Endpoint)

Una de las maravillas operativas de OIDC es que estandariza la configuración del proveedor de identidad. Cualquier servidor compatible con OIDC expone un endpoint en una ruta estándar:

`GET /.well-known/openid-configuration`

Si haces un `curl` a este endpoint en tu IdP, recibirás un documento JSON masivo. Para la infraestructura, hay dos valores cruciales en ese JSON:

1. **`issuer`**: Identifica inequívocamente al servidor que emite los tokens.
2. **`jwks_uri` (JSON Web Key Set):** Apunta a un endpoint donde el IdP publica sus **claves públicas**.

**¿Por qué es esto importante para el balanceo y el ruteo?**
Cuando tu API Gateway (ej. Kong, Traefik) o tu proxy inverso recibe una petición HTTP con un JWT (`Authorization: Bearer <token>`), necesita validar la firma de ese token sin consultar al IdP en cada request (lo que arruinaría la latencia).
El API Gateway utiliza la URL proporcionada en el `jwks_uri` para descargar las claves públicas, las almacena en su caché local y valida matemáticamente la firma del JWT en microsegundos.

---

### Patrón de Despliegue: Identity-Aware Proxy (IAP) / OAuth2 Proxy

A nivel de infraestructura, la tendencia moderna es **sacar la lógica de autenticación del código de la aplicación**. Si tienes 20 microservicios, no quieres programar el flujo de OAuth 2.0 en cada uno de ellos.

En su lugar, desplegamos un patrón conocido como **Identity-Aware Proxy** o usamos herramientas como **OAuth2 Proxy** frente a nuestras aplicaciones:

1. El usuario envía una petición HTTP `GET /dashboard` al proxy inverso.
2. El proxy detecta que no hay una cookie de sesión o un token válido.
3. **El proxy intercepta la petición** y ejecuta el flujo de redirección OAuth 2.0 (pasos 2 al 8 del diagrama anterior) contra el IdP corporativo.
4. Una vez que el proxy recibe el JWT exitosamente del IdP, establece una cookie de sesión segura con el navegador.
5. Para las peticiones posteriores, el proxy valida la sesión, extrae la identidad del usuario y envía la petición original al backend inyectando cabeceras HTTP limpias y confiables (ej. `X-Forwarded-User: juan@empresa.com` o pasando el JWT directamente validado).

Este enfoque permite a los equipos de infraestructura proteger aplicaciones *legacy* o internas pesadas que no tienen soporte nativo para OIDC, añadiendo una capa de seguridad moderna puramente a nivel de enrutamiento HTTP.

## 6.4. Gestión de Rate Limiting y Throttling a nivel de API/Proxy (códigos 429)

Incluso con la autenticación más robusta y los backends más optimizados, ningún servidor web tiene recursos infinitos. Cuando un cliente (legítimo, malicioso o mal programado) envía más peticiones de las que la infraestructura puede o debe manejar, es responsabilidad de la capa de proxy intervenir para evitar la degradación del servicio o una falla en cascada (*cascading failure*).

Aquí es donde entran las estrategias de **Rate Limiting** (Limitación de Tasa) y **Throttling** (Estrangulamiento), herramientas fundamentales en el arsenal de cualquier administrador de sistemas para proteger la estabilidad del clúster, hacer cumplir acuerdos de nivel de servicio (SLA) y mitigar ataques de denegación de servicio (DoS).

---

### Rate Limiting vs. Throttling: La Diferencia Operativa

Aunque a menudo se usan como sinónimos, a nivel de ingeniería de tráfico representan acciones distintas:

* **Rate Limiting:** Es un límite estricto (*hard limit*). Se define una cuota (por ejemplo, 100 peticiones por minuto). Si el cliente supera esa cuota, el proxy rechaza inmediatamente las peticiones excedentes con un código de error HTTP.
* **Throttling:** Es un límite suave (*soft limit*) enfocado en modelar el tráfico (*traffic shaping*). Si un cliente envía demasiadas peticiones al mismo tiempo, el proxy no las rechaza de inmediato, sino que las encola y las retrasa artificialmente para procesarlas a un ritmo constante que el backend pueda soportar.

### El Código de Estado 429 y las Cabeceras de Control

Cuando se activa el Rate Limiting, el estándar HTTP dicta que el servidor debe responder con un código **`429 Too Many Requests`**.

A nivel operativo, simplemente devolver un 429 no es suficiente. Debemos proporcionar al cliente la telemetría necesaria para que su código se adapte y deje de saturar la red.

**1. La Cabecera Estándar `Retry-After`:**
Indica al cliente cuánto tiempo debe esperar antes de volver a intentarlo. Puede ser un número de segundos o una fecha HTTP exacta.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30

```

**2. Las Cabeceras de Estado (IETF Draft / Estándar de la Industria):**
La mayoría de los API Gateways modernos incluyen cabeceras adicionales en *todas* las respuestas (incluso las exitosas `200 OK`) para que el cliente conozca su límite en tiempo real. Históricamente usaban el prefijo `X-RateLimit-`, aunque el IETF está estandarizando la cabecera `RateLimit`.

```http
X-RateLimit-Limit: 1000       # Cuota total permitida en el periodo
X-RateLimit-Remaining: 998    # Cuota restante actual
X-RateLimit-Reset: 1698770000 # Timestamp UNIX de cuándo se reinicia la cuota

```

---

### Algoritmos Principales de Limitación

Los proxies inversos y Gateways implementan la limitación utilizando diferentes modelos matemáticos. Comprenderlos es vital para ajustar la configuración correctamente.

**1. Ventana Fija (Fixed Window)**
Se reinicia un contador en intervalos de tiempo fijos (ej. al inicio de cada minuto).

* *Problema operativo:* Sufre del "efecto ráfaga en el borde" (*boundary burst*). Si el límite es 100 req/minuto, un atacante podría enviar 100 peticiones en el segundo 00:59 y otras 100 en el segundo 01:00, bombardeando al servidor con 200 peticiones en 2 segundos sin violar la regla.

**2. Token Bucket (El Estándar de la Industria)**
Imagina un balde que tiene una capacidad máxima de *tokens*. Se añade un nuevo token al balde a una velocidad constante (ej. 2 tokens por segundo). Cada petición entrante "gasta" un token.

* Si hay tokens, la petición pasa.
* Si el balde está vacío, la petición devuelve `429`.

```text
  [ Tasa de Llenado: 2 tokens / seg ]
                 |
                 v
          +-------------+  <-- Capacidad máxima (Burst): 10 tokens
          |  [T] [T]    |
          |  [T] [T] [T]|
          +-------------+
                 |
  Petición HTTP  |  ¿Hay Tokens?
  -------------->+----------------> [Sí] -> Gasta 1 token -> Pasa al Backend
                 |
                 +----------------> [No] -> HTTP 429 Too Many Requests

```

* *Ventaja:* Permite "ráfagas" (bursts) controladas. Si el cliente no ha enviado tráfico en un rato, su balde está lleno y puede enviar varias peticiones simultáneas, pero a largo plazo no puede superar la tasa de llenado.

**3. Leaky Bucket (El Cubo Agujereado)**
Es la contraparte de Throttling. Las peticiones entran al cubo a cualquier velocidad, pero "gotean" (se procesan y se envían al backend) a una velocidad estrictamente constante y fija. Si el cubo se llena, las nuevas peticiones se descartan.

---

### Implementación en Infraestructura: El Ejemplo de Nginx

Nginx utiliza una implementación basada en el algoritmo de *Leaky Bucket* y requiere memoria compartida (`zone`) para mantener el estado de los contadores entre sus *worker processes*.

A continuación, un escenario típico de SysAdmin: Queremos limitar el tráfico de una API a **10 peticiones por segundo por IP**, pero queremos permitir picos ocasionales de hasta **20 peticiones simultáneas** sin retrasarlas.

```nginx
# 1. Definir la zona de memoria (Fuera del bloque server)
# 'binary_remote_addr' agrupa por IP del cliente de forma eficiente.
# 'zone=apilimit:10m' crea un espacio de memoria de 10MB llamado apilimit.
# 'rate=10r/s' es la velocidad de vaciado (10 peticiones por segundo).
limit_req_zone $binary_remote_addr zone=apilimit:10m rate=10r/s;

server {
    listen 443 ssl;
    server_name api.infraestructura.local;

    location /v1/ {
        # 2. Aplicar la regla a esta ruta
        # 'burst=20' permite encolar hasta 20 peticiones que excedan la tasa.
        # 'nodelay' es la clave: en lugar de procesar el burst lentamente 
        # (throttling), las deja pasar inmediatamente, actuando como Token Bucket.
        limit_req zone=apilimit burst=20 nodelay;

        # 3. Personalizar la respuesta (opcional, Nginx devuelve 503 por defecto)
        limit_req_status 429;
        
        proxy_pass http://backend_cluster;
    }
}

```

---

### Desafíos en Arquitecturas Distribuidas

Las zonas de memoria compartida (como la de Nginx o HAProxy) funcionan perfectamente en un solo nodo. Sin embargo, si tienes 5 proxies inversos balanceados por un Load Balancer de Capa 4 o un servicio DNS Anycast (Capítulo 7), una IP maliciosa podría consumir el límite de las 5 máquinas simultáneamente.

En arquitecturas *Cloud Native* maduras o clústeres de Kubernetes masivos, el Rate Limiting se extrae del proxy local y se delega a **almacenes de datos en memoria centralizados (como Redis)** usando scripts Lua o middleware especializado en el API Gateway. Esto garantiza que si el límite es 1000 req/hora, sea 1000 en total para todo el clúster perimetral global, a costa de añadir una ligera latencia de red (1-2ms) en la fase de validación de cada petición.
