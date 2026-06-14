Las cabeceras son el sistema nervioso del protocolo HTTP. Mientras que los métodos definen la acción y los códigos el resultado, los **headers** permiten que cliente y servidor intercambien metadatos cruciales para la negociación de contenido, la seguridad y la persistencia de la conexión. En este capítulo, desglosaremos la taxonomía de las cabeceras para entender cómo la infraestructura web gestiona el estado a través de cookies y cómo los proxies preservan la identidad del cliente mediante metadatos de enrutamiento. Para un administrador, dominar las cabeceras es la diferencia entre una red opaca y una arquitectura optimizada, segura y fácilmente auditable.

## 2.1. Clasificación de Cabeceras: Generales, Request, Response y Entity

Como vimos en el Capítulo 1, la línea de inicio de un mensaje HTTP (ya sea la solicitud del cliente o el código de estado del servidor) nos indica *qué* está ocurriendo. Sin embargo, el *cómo*, el *quién* y las reglas de ese intercambio se definen en las cabeceras (headers).

Para un administrador de sistemas, entender la taxonomía de las cabeceras no es un mero ejercicio académico. Cuando configuras reglas de manipulación en un proxy inverso (como `proxy_set_header` frente a `add_header` en Nginx, o `http-request` frente a `http-response` en HAProxy), estás operando directamente sobre esta clasificación.

La especificación clásica de HTTP/1.1 (RFC 2616) estableció un modelo mental de cuatro categorías que, aunque ha sido refinado en RFCs modernos (como el RFC 9110 que prefiere el término "Representación" en lugar de "Entidad"), sigue siendo el estándar de facto para estructurar el tráfico a nivel de red.

A continuación, desglosamos estas cuatro categorías:

### 1. Cabeceras Generales (General Headers)

Son aquellas que se aplican tanto a las peticiones (Requests) como a las respuestas (Responses), pero **no tienen relación con los datos transferidos en el cuerpo (body) del mensaje**. Su función principal es proporcionar información sobre el mensaje en sí o sobre la conexión de red subyacente.

* **Ejemplos operativos:**
* `Date`: Indica la fecha y hora en que se originó el mensaje. Es vital para la sincronización de logs y depuración de problemas de caché.
* `Connection`: Dicta el estado de la conexión TCP subyacente una vez finalizado el intercambio actual (profundizaremos en su criticidad operativa en la sección 2.3).
* `Via`: Utilizada por proxies y gateways para rastrear el camino que ha tomado un mensaje a través de la infraestructura.

### 2. Cabeceras de Petición (Request Headers)

Solo tienen sentido en los mensajes enviados por el cliente. Proporcionan al servidor contexto adicional sobre quién hace la petición, qué capacidades tiene el cliente y qué se espera exactamente como respuesta.

* **Ejemplos operativos:**
* `Host`: La cabecera más crítica en HTTP/1.1 (y obligatoria). Permite el alojamiento virtual (Virtual Hosting) al indicar a qué dominio se dirige la petición, independiente de la IP resuelta (veremos su impacto en enrutamiento en la sección 2.5).
* `User-Agent`: Identifica el software del cliente. A nivel de WAF (Web Application Firewall), es una de las primeras líneas de defensa para bloquear *scrapers* o herramientas de ataque automatizadas.
* `Accept-*` (Accept, Accept-Encoding, Accept-Language): Indican qué formatos de contenido o algoritmos de compresión soporta el cliente (tema central de la sección 2.2).

### 3. Cabeceras de Respuesta (Response Headers)

Son exclusivas de los mensajes que el servidor devuelve al cliente. No describen el contenido del cuerpo, sino que entregan metadatos sobre el servidor en sí o instrucciones sobre acciones futuras que el cliente debe tomar.

* **Ejemplos operativos:**
* `Server`: Identifica el software que generó la respuesta (ej. `nginx/1.24.0`). Por seguridad (Security through obscurity), los administradores suelen ofuscar o minimizar esta cabecera para no revelar versiones exactas a posibles atacantes.
* `Set-Cookie`: Instruye al navegador para almacenar datos de estado (se abordará en detalle en la sección 2.4).
* `Location`: Utilizada en conjunto con los códigos de estado 3xx para indicar la URL a la que el cliente debe ser redirigido.

### 4. Cabeceras de Entidad / Representación (Entity Headers)

Estas cabeceras pueden aparecer tanto en peticiones (por ejemplo, en un `POST` o `PUT` que sube datos) como en respuestas (cuando el servidor devuelve un recurso). Su propósito exclusivo es **describir el cuerpo (payload) del mensaje HTTP**. Si no hay cuerpo en el mensaje, estas cabeceras carecen de sentido.

* **Ejemplos operativos:**
* `Content-Type`: Indica el tipo MIME del cuerpo (ej. `application/json` o `text/html`). Un desajuste entre esta cabecera y el contenido real suele ser causa de vulnerabilidades o fallos de parseo en los microservicios.
* `Content-Length`: Indica el tamaño exacto del cuerpo en bytes. Es crítica para la persistencia de la conexión (Keep-Alive), ya que le dice al receptor exactamente cuándo termina el mensaje actual y cuándo empieza el siguiente en la misma conexión TCP.
* `Content-Encoding`: Indica si la entidad ha sido comprimida (ej. `gzip`, `br`), dictando cómo debe desempaquetarse antes de procesarse.

---

### Mapa Estructural del Mensaje HTTP

Para visualizar cómo interactúan estas cabeceras en un flujo real, podemos observar la anatomía estándar de un mensaje HTTP. Nota cómo las cabeceras forman una barrera de metadatos estructurados justo antes de la carga útil (payload):

```text
+-------------------------------------------------------------+
| Línea de Inicio (Ej. GET /api/v1/users HTTP/1.1)            |
+-------------------------------------------------------------+
| [Cabeceras Generales]                                       |
| Date: Wed, 21 Oct 2026 07:28:00 GMT                         |
| Connection: keep-alive                                      |
+-------------------------------------------------------------+
| [Cabeceras de Petición o Respuesta]                         |
| Host: api.midominio.com                                     |
| User-Agent: curl/7.81.0                                     |
+-------------------------------------------------------------+
| [Cabeceras de Entidad] (Si hay un Body)                     |
| Content-Type: application/json                              |
| Content-Length: 124                                         |
+-------------------------------------------------------------+
| (CRLF) - LÍNEA EN BLANCO OBLIGATORIA                        |
+-------------------------------------------------------------+
| [Cuerpo / Body]                                             |
| {"id": 123, "status": "active", "role": "sysadmin"}         |
+-------------------------------------------------------------+

```

**Nota para el administrador:** La línea en blanco (CRLF - *Carriage Return Line Feed*) no es un detalle estético; es el delimitador a nivel de protocolo que indica al servidor web (o al proxy) que el análisis de las cabeceras ha terminado y que los bytes subsiguientes deben tratarse estrictamente como datos (el cuerpo de la entidad). Entender esta división estructural es fundamental al diagnosticar ataques de tipo *HTTP Request Smuggling*, donde un atacante manipula este límite exacto.

## 2.2. Negociación de Contenido (`Accept`, `Content-Type`, `Accept-Encoding`)

En un entorno donde conviven navegadores modernos, utilidades de línea de comandos (como `curl`), aplicaciones móviles y microservicios, un servidor web o API Gateway no puede asumir que un único formato de respuesta o método de compresión servirá para todos. La **negociación de contenido** es el mecanismo del protocolo que permite al cliente y al servidor acordar dinámicamente la mejor representación de un recurso disponible.

Desde la perspectiva operativa, dominar esta negociación es vital por tres motivos: optimización de ancho de banda, versionado de APIs y enrutamiento inteligente en proxies inversos.

La arquitectura de esta negociación se sostiene principalmente sobre tres cabeceras clave:

### 1. `Accept` y el Sistema de Pesos (Q-Values)

La cabecera `Accept` es enviada por el cliente para informar al servidor qué tipos de medios (MIME types) es capaz de entender y procesar.

Lo que hace a esta cabecera excepcionalmente flexible es la capacidad de asignar prioridades utilizando **factores de calidad o pesos (`q`)**, que van de `0.0` a `1.0` (donde 1.0 es el valor por defecto si se omite).

* **Ejemplo de Petición:** `Accept: application/json;q=1.0, application/xml;q=0.8, text/*;q=0.1`
* **Interpretación:** El cliente dice: *"Prefiero JSON. Si no puedes generar JSON, dame XML. Si tampoco tienes XML, envíame cualquier formato de texto plano, pero es mi última opción"*.

A nivel de administración de APIs, `Accept` se utiliza a menudo para el **versionado de endpoints** sin necesidad de alterar la URI (conocido como *Content Negotiation Versioning* o versionado por Media Type). En lugar de `/api/v1/users` y `/api/v2/users`, el cliente solicita la misma URI y envía:
`Accept: application/vnd.midominio.v2+json`

### 2. `Content-Type`: La Declaración de la Realidad

Mientras `Accept` es una petición o sugerencia del cliente, `Content-Type` es un hecho establecido. Cuando el servidor responde, utiliza esta cabecera (una cabecera de Entidad, como vimos en la sección 2.1) para afirmar categóricamente cuál es el formato del cuerpo (payload) que está entregando.

* **Ejemplo de Respuesta:** `Content-Type: application/json; charset=utf-8`

**Manejo de Errores Operativos:**
Como administrador, debes monitorizar dos códigos de estado HTTP íntimamente ligados a fallos en esta dinámica:

* **406 Not Acceptable:** El servidor entiende lo que pide el cliente en su cabecera `Accept`, pero no es capaz de generar una respuesta en ninguno de esos formatos.
* **415 Unsupported Media Type:** El cliente envía un payload (ej. un `POST`) con un `Content-Type` que el servidor (o el WAF) no soporta o tiene bloqueado por políticas de seguridad.

### 3. `Accept-Encoding`: Optimizando el Tráfico de Red

Si `Accept` negocia el formato, `Accept-Encoding` negocia la compresión de los datos en tránsito. El cliente lista los algoritmos de compresión que puede desempaquetar. Hoy en día, los estándares dominantes en la web son `gzip` y `br` (Brotli).

El servidor evalúa esta lista, comprime el cuerpo del mensaje en consecuencia, y notifica al cliente el algoritmo elegido utilizando la cabecera de respuesta **`Content-Encoding`**.

Esta negociación es una de las configuraciones más críticas que realizarás en balanceadores y servidores web. Configurar la compresión (ej. delegar el *Gzip/Brotli Offloading* al proxy inverso Nginx o HAProxy) reduce drásticamente el consumo de ancho de banda y la latencia, a costa de un ligero incremento en el uso de CPU.

---

### Diagrama de Flujo: Negociación de Contenido en Acción

En este esquema vemos cómo se cruzan las preferencias del cliente con las decisiones del servidor:

```text
[Cliente]                                              [Proxy/Servidor HTTP]
   |                                                             |
   | 1. GET /dashboard/datos HTTP/1.1                            |
   | 2. Accept: application/json;q=0.9, text/csv;q=0.5           |
   | 3. Accept-Encoding: br, gzip                                |
   |------------------------------------------------------------>|
   |                                                             | 4. Analiza capacidades.
   |                                                             | 5. Determina que tiene JSON y CSV.
   |                                                             |    JSON tiene mayor peso (0.9).
   |                                                             | 6. Comprime el JSON usando Brotli (br).
   | 7. HTTP/1.1 200 OK                                          |
   | 8. Content-Type: application/json                           |
   | 9. Content-Encoding: br                                     |
   | 10. Vary: Accept-Encoding                                   |
   |<------------------------------------------------------------|
   |                                                             |
   | [Payload binario comprimido con Brotli]                     |

```

**Nota sobre la cabecera `Vary`:** Observa la línea 10 del diagrama (`Vary: Accept-Encoding`). Esta es una directiva fundamental para los sistemas de caché intermediarios (Proxies y CDNs). Le indica a la caché que no debe servir la misma respuesta a todos los clientes a ciegas; debe almacenar versiones separadas del recurso dependiendo de lo que el cliente envió en su cabecera `Accept-Encoding`. Abordaremos las ramificaciones operativas de la fragmentación de caché por cabecera `Vary` en el Capítulo 3.

## 2.3. Gestión de Conexiones: El rol crítico de `Connection: keep-alive` y `close`

HTTP es un protocolo de la capa de aplicación, pero su rendimiento está intrínsecamente ligado a la capa de transporte subyacente. Hasta la llegada de HTTP/3 (que abordaremos en el Capítulo 4), HTTP ha dependido históricamente de TCP.

Para un administrador de sistemas, abrir una conexión TCP no es "gratis". Implica un *3-way handshake* (SYN, SYN-ACK, ACK), asignación de buffers de memoria en el kernel del servidor, consumo de descriptores de archivo (file descriptors) y, si estamos usando HTTPS, la sobrecarga criptográfica de un *TLS handshake*.

La cabecera `Connection` es el mecanismo de control que dictamina qué sucede con este costoso túnel TCP una vez que el servidor ha terminado de enviar la respuesta HTTP.

### El Modelo Efímero: `Connection: close`

En los días de HTTP/1.0, el comportamiento por defecto era efímero. Por cada recurso solicitado (un HTML, una imagen, un archivo CSS), el cliente y el servidor debían establecer una nueva conexión TCP, intercambiar el mensaje HTTP y cerrar la conexión inmediatamente con un paquete FIN.

* **Impacto Operativo:** A nivel de infraestructura, esto es un desastre para el rendimiento moderno. Genera una latencia inmensa debido a los constantes *handshakes* (Round Trip Times o RTT) y somete al servidor a una carga tremenda. Además, provoca el agotamiento rápido de los puertos efímeros, llenando la tabla de estados del firewall y del kernel con conexiones en estado `TIME_WAIT`.

Hoy en día, ver un `Connection: close` explícito suele ser indicativo de un servidor que se está apagando elegantemente (graceful shutdown) y le pide a los clientes que no envíen más peticiones por ese socket, o de una política estricta de un balanceador de carga que no confía en el estado del cliente.

### El Estándar Persistente: `Connection: keep-alive`

Para solucionar la ineficiencia estructural de HTTP/1.0, HTTP/1.1 introdujo las conexiones persistentes y las hizo el comportamiento predeterminado. Al enviar `Connection: keep-alive` (o simplemente omitir la cabecera en HTTP/1.1), ambas partes acuerdan mantener el socket TCP abierto después de la respuesta.

Esto permite que el cliente envíe múltiples peticiones HTTP secuenciales a través del mismo túnel TCP, amortizando el costo del *handshake* inicial.

* **El prerrequisito estructural:** Como vimos en la sección 2.1, para que `keep-alive` funcione, el cliente debe saber exactamente dónde termina un mensaje y dónde empieza el siguiente en el flujo binario de TCP. Esto hace que cabeceras como `Content-Length` o `Transfer-Encoding: chunked` sean obligatorias; sin ellas, la única forma que tiene el cliente de saber que la respuesta terminó es si el servidor cierra la conexión (rompiendo el propósito de `keep-alive`).

---

### Diagrama de Flujo: `close` vs `keep-alive`

Observa la drástica reducción de latencia (Round Trip Times) al solicitar dos recursos (ej. `index.html` y `style.css`):

```text
  Sin Keep-Alive (Connection: close)       Con Keep-Alive (Connection: keep-alive)
  ----------------------------------       ---------------------------------------
  Cliente                     Servidor     Cliente                     Servidor
     |                           |            |                           |
     | == TCP 3-Way Handshake == |            | == TCP 3-Way Handshake == |
     |-------------------------->|            |-------------------------->|
     |<--------------------------|            |<--------------------------|
     |                           |            |                           |
     | GET /index.html (close)   |            | GET /index.html           |
     |-------------------------->|            |-------------------------->|
     | 200 OK (HTML)             |            | 200 OK (HTML)             |
     |<--------------------------|            |<--------------------------|
     | == TCP Teardown (FIN) === |            |                           |
     |                           |            | [El socket sigue abierto] |
     | == TCP 3-Way Handshake == |            |                           |
     |-------------------------->|            | GET /style.css            |
     |<--------------------------|            |-------------------------->|
     |                           |            | 200 OK (CSS)              |
     | GET /style.css (close)    |            |<--------------------------|
     |-------------------------->|            |                           |
     | 200 OK (CSS)              |            | [El socket sigue abierto] |
     |<--------------------------|            |                           |

```

---

### Perspectiva de Administración y Tuning

Aunque `keep-alive` reduce la latencia, introduce un nuevo riesgo: el consumo pasivo de recursos. Un socket abierto consume RAM y un descriptor de archivo, incluso si está inactivo. Si permites que las conexiones permanezcan abiertas indefinidamente, unos pocos miles de clientes inactivos (o un ataque *Slowloris*) pueden agotar los *workers* de tu servidor web, provocando una denegación de servicio (DoS).

Por ello, la gestión de conexiones requiere un ajuste fino (tuning) en los servidores web y proxies inversos. Como administrador, lidiarás constantemente con dos variables críticas:

**1. El Timeout de Inactividad (Keepalive Timeout):**
Define cuánto tiempo esperará el servidor por una nueva petición antes de cerrar unilateralmente una conexión inactiva.

* *Nginx (`keepalive_timeout`):* Por defecto suele ser de 75 segundos. En infraestructuras de alto tráfico perimetral (Edge), este valor a menudo se reduce drásticamente (ej. 10 a 15 segundos) para liberar memoria rápidamente y reciclar sockets.

**2. El Límite de Peticiones (Keepalive Requests):**
Define el número máximo de peticiones HTTP que se pueden servir a través de una única conexión TCP antes de forzar su cierre.

* *Nginx (`keepalive_requests`):* Limitar esto (por ejemplo, a 1000 peticiones por conexión) es una táctica defensiva para prevenir fugas de memoria (memory leaks) sutiles a largo plazo en los procesos del servidor y para forzar el rebalanceo de carga periódico en entornos distribuidos.

**Ejemplo de configuración defensiva en Nginx:**

```nginx
http {
    # Cierra la conexión si el cliente está inactivo por más de 15 segundos.
    keepalive_timeout 15s;
    
    # Obliga a cerrar y reabrir TCP después de 500 peticiones en el mismo socket.
    keepalive_requests 500;
}

```

**Nota sobre Proxies Inversos:** Un error de arquitectura clásico es configurar `keep-alive` entre el cliente y el balanceador de carga (Frontend), pero utilizar `Connection: close` entre el balanceador y los microservicios backend. Esto traslada el cuello de botella del TCP handshake a tu red interna. Al administrar herramientas como HAProxy o Nginx, es vital asegurar que el *connection pooling* (keep-alive hacia el upstream) esté correctamente configurado para evitar la saturación de los puertos locales.

## 2.4. Administración de Estado: Cookies, `Set-Cookie`, y seguridad en la sesión (`HttpOnly`, `Secure`, `SameSite`)

Como establecimos en el Capítulo 1, HTTP es un protocolo inherentemente **apátrida (stateless)**. A nivel de protocolo, el servidor no tiene memoria: la petición número 100 de un cliente es procesada con la misma amnesia que la primera. Sin embargo, las aplicaciones modernas requieren contexto (sesiones de usuario, carritos de compra, preferencias).

Para resolver esta carencia estructural, se introdujo la gestión de estado a través de las cabeceras `Set-Cookie` y `Cookie`.

Desde la perspectiva de operaciones e infraestructura, las cookies no son solo un "problema de los desarrolladores". Los administradores de sistemas interactúan con ellas constantemente: los balanceadores de carga las usan para mantener la afinidad de sesión (*Sticky Sessions*), los WAFs las inspeccionan en busca de inyecciones maliciosas, y los proxies inversos a menudo deben reescribirlas para parchear vulnerabilidades de seguridad que las aplicaciones backend omitieron.

### El Mecanismo de Intercambio

El ciclo de vida de una cookie se basa en un modelo de instrucción y eco:

1. **El Servidor instruye (`Set-Cookie`):** En una respuesta HTTP, el servidor envía una o más cabeceras `Set-Cookie`. Esto ordena al cliente almacenar un par clave-valor, junto con reglas sobre su validez.
2. **El Cliente hace eco (`Cookie`):** En cada petición posterior hacia ese mismo dominio (y que cumpla las reglas de la cookie), el cliente adjuntará la cabecera `Cookie` devolviendo únicamente los pares clave-valor, sin los metadatos de seguridad.

**Diagrama de Flujo: El Ciclo de la Cookie**

```text
[Cliente]                                              [Servidor / API]
   |  1. POST /login (Usuario/Password)                       |
   |--------------------------------------------------------->|
   |                                                          | (Autenticación exitosa)
   |  2. HTTP/1.1 200 OK                                      |
   |     Set-Cookie: session_id=abc123Xyz; HttpOnly; Secure   |
   |<---------------------------------------------------------|
   |                                                          |
   |  3. GET /dashboard                                       |
   |     Cookie: session_id=abc123Xyz                         |
   |--------------------------------------------------------->|
   |  4. HTTP/1.1 200 OK (Devuelve el dashboard privado)      |
   |<---------------------------------------------------------|

```

---

### La Triada de Seguridad Operativa

Las cookies de sesión (como identificadores de acceso o tokens) son el objetivo principal de múltiples vectores de ataque. Como administrador, tu responsabilidad es asegurar que, incluso si el código de la aplicación es vulnerable, la infraestructura aplique una postura de "Defensa en Profundidad". Esto se logra forzando tres directivas críticas en la cabecera `Set-Cookie`.

**1. `Secure` (Protección contra Man-in-the-Middle)**

* **¿Qué hace?** Instruye al navegador para que **solo** envíe la cookie si la petición se realiza a través de un canal cifrado (HTTPS).
* **Impacto Operativo:** Si un usuario intenta acceder a la versión `http://` del sitio (por ejemplo, antes de que ocurra una redirección HSTS), el navegador omitirá la cookie, evitando que un atacante pasivo en la red intercepte el identificador de sesión en texto plano.

**2. `HttpOnly` (Mitigación de Cross-Site Scripting - XSS)**

* **¿Qué hace?** Oculta la cookie de las APIs de JavaScript del lado del cliente (como `document.cookie`).
* **Impacto Operativo:** Si un atacante logra inyectar código JavaScript malicioso en tu sitio web (ataque XSS), ese script podrá manipular el DOM, pero **no podrá robar el token de sesión** para exfiltrarlo, aislando así el daño potencial. Solo el navegador enviará esta cookie en las peticiones HTTP a nivel de red.

**3. `SameSite` (Defensa contra Cross-Site Request Forgery - CSRF)**

* **¿Qué hace?** Controla si la cookie debe ser enviada en peticiones *Cross-Origin* (cuando el usuario hace clic en un enlace de tu sitio desde un dominio externo, o cuando un sitio externo intenta cargar un recurso del tuyo).
* **Valores:**
* `Strict`: La cookie solo se envía si la petición se origina en el mismo sitio (First-party). Es la máxima seguridad, pero puede afectar la experiencia de usuario (ej. si un usuario llega desde un enlace externo, no estará "logueado" en esa primera carga).
* `Lax`: Es el estándar por defecto en navegadores modernos. Permite que la cookie se envíe en navegaciones de nivel superior seguras (ej. hacer clic en un enlace regular GET hacia tu sitio), pero la bloquea en peticiones POST de terceros o en iframes.
* `None`: Permite enviar la cookie en todos los contextos cross-site (necesario para widgets incrustados, pasarelas de pago o SSO). **Nota crítica:** Los navegadores exigen que `SameSite=None` vaya obligatoriamente acompañado del atributo `Secure`.

---

### Tuning de Infraestructura: Reescribiendo Cookies en el Edge

Uno de los patrones más comunes en la administración de sistemas es lidiar con aplicaciones *legacy* que devuelven cookies inseguras (por ejemplo, omiten `HttpOnly` o `Secure`). En lugar de modificar el código fuente de la aplicación, es una práctica estándar utilizar el Proxy Inverso / Load Balancer para interceptar el `Set-Cookie` y parchearlo "al vuelo" antes de entregarlo al cliente.

**Ejemplo de endurecimiento (Hardening) en Nginx:**
Si tu aplicación backend (ej. Tomcat o Node.js) devuelve una cookie llamada `JSESSIONID` sin atributos de seguridad, puedes usar la directiva `proxy_cookie_path` o `proxy_cookie_flags` (disponible en versiones recientes) para inyectar la seguridad perimetral.

```nginx
server {
    listen 443 ssl;
    server_name midominio.com;

    location / {
        proxy_pass http://backend_legacy;
        
        # Nginx intercepta cualquier Set-Cookie y le añade los flags de seguridad
        proxy_cookie_flags ~ secure httponly samesite=lax;
    }
}

```

**Ejemplo equivalente en HAProxy:**
HAProxy permite manipular las respuestas HTTP utilizando `http-response replace-header` mediante expresiones regulares para asegurar que todas las cookies queden blindadas.

```haproxy
backend app_servers
    server app1 10.0.0.10:8080 check
    
    # Busca la cabecera Set-Cookie. Si no tiene Secure o HttpOnly, se lo añade al final.
    http-response replace-header Set-Cookie (.*) \1;\ Secure;\ HttpOnly;\ SameSite=Lax

```

Comprender la semántica de las cookies te permite desacoplar la seguridad de la sesión del ciclo de desarrollo de la aplicación, aplicando políticas consistentes a nivel de Gateway para todos los microservicios de la organización.

## 2.5. Metadatos de enrutamiento y proxy (`Host`, `X-Forwarded-For`, `X-Real-IP`)

Las arquitecturas web modernas rara vez implican una conexión directa entre el cliente final y el servidor que ejecuta la aplicación. Hoy en día, una petición HTTP atraviesa un laberinto de intermediarios: Redes de Entrega de Contenido (CDNs), Firewalls de Aplicaciones Web (WAFs), Ingress Controllers y proxies inversos.

Si bien estos intermediarios son esenciales para la escalabilidad y seguridad, introducen un problema operativo grave: **la ofuscación de la topología y del origen**. A nivel de la capa de red (Capa 3 de OSI), cuando un proxy reenvía una petición HTTP al servidor backend, el backend ve la dirección IP del proxy, no la del cliente original.

Para solucionar esta pérdida de contexto, el ecosistema HTTP se apoya en un conjunto de cabeceras que actúan como "metadatos de enrutamiento".

### 1. `Host`: La brújula del Enrutamiento Interno

Como mencionamos en la sección 2.1, `Host` es la única cabecera estrictamente obligatoria en HTTP/1.1. Su función es indicar a qué nombre de dominio se dirige la petición, independientemente de la dirección IP a la que se haya conectado el cliente.

* **El problema que resuelve (Virtual Hosting):** Una única dirección IP pública (y un único servidor web) puede alojar cientos de sitios web distintos (`sitio-a.com`, `sitio-b.com`). El servidor web utiliza el valor de la cabecera `Host` para determinar a qué bloque de configuración (ej. `VirtualHost` en Apache o `server_name` en Nginx) debe enrutar internamente la petición.
* **Consideración Operativa:** Cuando configuras un proxy inverso, debes decidir si le pasas al backend el `Host` original que envió el cliente, o si lo sobrescribes. En arquitecturas de microservicios, a menudo se conserva el `Host` original para que la aplicación sepa cómo generar enlaces absolutos o correos electrónicos correctamente.

### 2. `X-Forwarded-For` (XFF): Preservando la identidad del Cliente

Dado que la conexión TCP final se establece entre el proxy y el backend, el backend pierde la IP real del usuario. Esto es catastrófico para operaciones cotidianas: rompe los registros de auditoría (logs), inutiliza las reglas de Rate Limiting por IP (bloquearías a tu propio proxy en su lugar) y anula la geolocalización.

La cabecera `X-Forwarded-For` es el estándar de facto para resolver esto. A medida que la petición atraviesa diferentes proxies, cada uno añade la IP desde la que recibió la conexión a una lista separada por comas.

* **Formato:** `X-Forwarded-For: <IP_Cliente>, <IP_Proxy1>, <IP_Proxy2>`

**Advertencia Crítica de Seguridad (IP Spoofing):**
Cualquier cliente puede inyectar una cabecera `X-Forwarded-For` falsa (`X-Forwarded-For: 127.0.0.1`) al iniciar la petición. Si tu backend confía ciegamente en esta cabecera para conceder privilegios (por ejemplo, permitir acceso a un panel de administración solo a IPs internas), serás vulnerable.

* **La regla de oro del Sysadmin:** El proxy o WAF perimetral (el primer elemento de tu infraestructura que recibe tráfico de Internet) **jamás debe preservar** un XFF entrante. Debe ser configurado para sobrescribir la cabecera o purgar los valores preexistentes y colocar únicamente la IP real que validó a nivel TCP.

### 3. `X-Real-IP`: La alternativa directa

Mientras que XFF es una cadena que rastrea múltiples saltos, `X-Real-IP` es una convención (popularizada en gran medida por Nginx) que contiene una única dirección IP: la del cliente original.
Es más sencilla de procesar para algunas aplicaciones antiguas o scripts PHP/FastCGI que no saben cómo hacer el *parseo* de una lista separada por comas, pero pierde la información de la topología intermedia. En la práctica, muchos administradores inyectan ambas cabeceras en la capa de balanceo.

---

### Diagrama de Flujo: Evolución de las Cabeceras en una Arquitectura Multi-Capa

Observa cómo se construye la trazabilidad a medida que un paquete HTTP atraviesa la infraestructura desde un cliente público hasta un microservicio interno:

```text
[Cliente Final] IP: 203.0.113.5
      |
      | GET /api/data HTTP/1.1
      | Host: api.midominio.com
      v
[CDN / WAF Público] IP: 198.51.100.10
      | 
      | (Intercepta y reenvía hacia tu Data Center)
      | Host: api.midominio.com
      | X-Forwarded-For: 203.0.113.5
      v
[Balanceador de Carga Interno (HAProxy/Nginx)] IP: 10.0.0.5
      |
      | (Añade la IP de la CDN a la cadena XFF)
      | Host: api.midominio.com
      | X-Real-IP: 203.0.113.5
      | X-Forwarded-For: 203.0.113.5, 198.51.100.10
      v
[Servidor de Aplicaciones / Pod de Kubernetes] IP: 10.0.0.50
      |
      | El Backend lee XFF. Sabe que la IP 10.0.0.5 le habla,
      | pero registra en sus logs la IP 203.0.113.5 como el 
      | actor real de la transacción.

```

---

### Tuning de Infraestructura: Inyección de Metadatos en Nginx

Para materializar este comportamiento, el proxy inverso debe ser instruido explícitamente para mutar las cabeceras antes de usar `proxy_pass`. Este es el bloque de configuración fundamental que todo administrador debe estandarizar:

```nginx
location /api/ {
    # 1. Preservar el dominio original solicitado por el cliente
    proxy_set_header Host $http_host;
    
    # 2. Inyectar la IP real a nivel TCP en X-Real-IP
    proxy_set_header X-Real-IP $remote_addr;
    
    # 3. Construir la cadena XFF. $proxy_add_x_forwarded_for añade la IP 
    # del cliente ($remote_addr) a cualquier XFF existente provisto por 
    # un proxy de confianza (como una CDN configurada previamente).
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # 4. Informar al backend sobre el protocolo original (HTTP vs HTTPS).
    # Vital para que el backend genere redirecciones seguras (Evita bucles de redirección).
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_pass http://backend_cluster;
}

```

*Nota para el futuro (RFC 7239):* Aunque `X-Forwarded-For` sigue dominando la industria, el IETF estandarizó la cabecera única `Forwarded` (ej. `Forwarded: for=203.0.113.5;proto=https;host=api.midominio.com`) para consolidar todos estos metadatos. Sin embargo, su adopción en frameworks de backend sigue siendo fragmentada, por lo que las cabeceras "X-" continuarán siendo tu herramienta principal a corto y medio plazo.
