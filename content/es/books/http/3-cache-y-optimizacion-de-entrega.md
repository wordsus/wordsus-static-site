La eficiencia de la Web no reside solo en la velocidad de procesamiento del servidor, sino en la capacidad de **no repetir trabajo innecesario**. En este capítulo, exploramos la arquitectura de la caché como una jerarquía de capas defensivas que reducen la latencia y el consumo de recursos. Desde el almacenamiento local en el navegador hasta las redes de distribución global (CDN), analizaremos cómo las directivas de `Cache-Control` y los mecanismos de validación condicional como `ETag` orquestan la frescura de los datos. El administrador de sistemas aprenderá aquí a dominar la variabilidad del contenido y las estrategias críticas de invalidación para garantizar una entrega de contenido siempre óptima y coherente.

## 3.1. La jerarquía de caché: Navegador, Proxy, CDN y Servidor

En la arquitectura de la Web moderna, la entrega eficiente de contenido no depende de un único mecanismo de almacenamiento, sino de una **arquitectura de defensa en profundidad** conocida como la jerarquía de caché. Para un administrador de sistemas, comprender esta cadena de suministro de datos es vital: cada solicitud HTTP que llega al servidor de origen (el punto más costoso computacionalmente) representa una falla en una o más de las capas defensivas anteriores.

El objetivo principal de esta jerarquía es doble: reducir drásticamente la latencia para el cliente acercando los datos a su ubicación física y proteger los recursos del servidor de origen (CPU, memoria, base de datos) del agotamiento.

A nivel de HTTP, la caché se divide fundamentalmente en dos categorías: **cachés privadas** (dedicadas a un único usuario) y **cachés compartidas** (que almacenan respuestas para múltiples usuarios).

A continuación, visualizamos el flujo de una petición a través de las distintas capas antes de llegar a la aplicación:

```text
[Cliente] -> (1) Caché del Navegador (Privada)
   |
   +-- Miss --+
              v
       [Red Local/ISP] -> (2) Proxy Directo (Compartida)
              |
              +-- Miss --+
                         v
                  [Internet / Borde] -> (3) CDN Edge Node (Compartida)
                         |
                         +-- Miss --+
                                    v
                           [Centro de Datos] -> (4) Proxy Inverso / Acelerador (Compartida)
                                    |
                                    +-- Miss --+
                                               v
                                     [Servidor de Origen]

```

### 1. Caché del Navegador (Caché Privada)

Es la primera línea de defensa y reside directamente en el dispositivo del usuario final (en memoria RAM o disco local). Al ser una caché privada, es el único lugar seguro para almacenar respuestas HTTP que contienen información personal o sesiones de usuario de forma persistente.

* **Perspectiva del Sysadmin:** Es la capa sobre la que tenemos **menor control directo**. Aunque dictamos su comportamiento mediante cabeceras HTTP emitidas desde el origen (que detallaremos en la sección 3.2), los navegadores web tienen sus propias políticas de recolección de basura, límites de tamaño y heurísticas que pueden desalojar nuestro contenido de forma impredecible.
* **Impacto:** Un "Cache Hit" (acierto) en esta capa significa que la latencia de red es efectivamente cero. La petición HTTP nunca sale del dispositivo del usuario.

### 2. Proxy Directo / Forward Proxy (Caché Compartida)

Históricamente gestionados por Proveedores de Servicios de Internet (ISPs) o en redes corporativas, estos servidores intermedios interceptan las peticiones salientes de un grupo de usuarios hacia Internet.

* **Perspectiva del Sysadmin:** En la era moderna de la Web, donde la adopción de HTTPS/TLS es prácticamente universal, la relevancia de los proxies directos transparentes ha disminuido drásticamente. Dado que el tráfico está cifrado de extremo a extremo, un ISP no puede inspeccionar ni cachear recursos estáticos sin romper el túnel TLS (MITM). Sin embargo, en entornos corporativos cerrados (donde se instalan certificados raíz personalizados en los equipos), siguen siendo una herramienta clave para ahorrar ancho de banda de salida.
* **Riesgo Operativo:** Es crucial configurar correctamente las respuestas del origen para diferenciar el contenido público del privado, evitando que un proxy mal configurado entregue la información bancaria del "Usuario A" al "Usuario B".

### 3. Red de Entrega de Contenidos (CDN - Edge Cache)

La CDN es la primera capa de infraestructura sobre la que el administrador de sistemas (o el equipo de operaciones) tiene control administrativo, aunque esté geográficamente distribuida fuera del centro de datos principal. Los nodos de la CDN o "Puntos de Presencia" (PoPs) actúan como cachés masivas compartidas ubicadas en ubicaciones estratégicas alrededor del mundo.

* **Perspectiva del Sysadmin:** La CDN actúa como el "escudo exterior" de la infraestructura. Absorbe picos masivos de tráfico, ataques DDoS volumétricos y sirve el grueso del contenido estático (imágenes, CSS, JS, videos). En esta capa, las reglas de caché suelen configurarse para ser extremadamente agresivas con el contenido inmutable.
* **Impacto:** Transforma el modelo de entrega de "uno a muchos" (desde el origen) a un modelo de "muchos a muchos", reduciendo drásticamente la latencia de red (Round-Trip Time o RTT) al responder desde la misma ciudad o país del cliente.

### 4. Proxy Inverso y Acelerador HTTP (Caché del Lado del Servidor)

Justo delante del servidor de aplicaciones de origen, habitualmente encontramos servidores web actuando como proxies inversos (como Nginx o HAProxy) o aceleradores HTTP especializados (como Varnish Cache). Esta es la última barrera antes de que la petición consuma recursos de cómputo en la aplicación.

* **Perspectiva del Sysadmin:** Aquí es donde el administrador ejerce el **control absoluto**. Se dispone de memoria RAM dedicada a alta velocidad para almacenar respuestas completas o fragmentos de las mismas (mediante tecnologías como ESI - *Edge Side Includes*).
* **Casos de uso:** Mientras la CDN suele encargarse de los archivos estáticos, el acelerador HTTP local es excelente para cachear "Micro-Cachés" (respuestas de APIs dinámicas almacenadas por 1 o 2 segundos durante un pico de tráfico) o páginas enteras generadas para usuarios no autenticados.

### 5. El Servidor de Origen (La Fuente de la Verdad)

Si una petición HTTP atraviesa el navegador, los proxies de red, la CDN y el acelerador local sin encontrar una respuesta válida (un "Cache Miss" a lo largo de toda la cadena), llega finalmente al backend. En este punto, la aplicación debe procesar lógica de negocio, consultar bases de datos y generar una nueva respuesta HTTP, gastando valiosos ciclos de CPU.

La tarea del administrador de sistemas es diseñar el flujo de tal manera que el servidor de origen solo dedique su poder de procesamiento a peticiones estrictamente dinámicas, personalizadas o mutables (como transacciones financieras o interacciones de bases de datos), mientras instruye a las cuatro capas anteriores sobre cómo, cuándo y por cuánto tiempo almacenar todo lo demás. El lenguaje utilizado para impartir estas instrucciones a toda la jerarquía se basa en las cabeceras HTTP, tema que exploraremos en profundidad en la siguiente sección.

## 3.2. Directivas de control: Profundizando en `Cache-Control`

Si la jerarquía de caché es la carretera, la cabecera `Cache-Control` (introducida en HTTP/1.1) es el conjunto de señales de tráfico. A diferencia de las cabeceras antiguas como `Expires` (que usaban fechas absolutas propensas a errores por desincronización de relojes), `Cache-Control` utiliza **tiempos relativos** y directivas explícitas que permiten un control granular sobre cada salto intermedio.

Como administrador, debes ver esta cabecera no como una sugerencia, sino como una instrucción imperativa que afecta tanto al ahorro de costes (ancho de banda) como a la frescura de la información (evitar datos obsoletos).

### 1. Control de Tiempos: `max-age` vs `s-maxage`

Estas directivas definen el **TTL (Time To Live)** o periodo de frescura del recurso.

* **`max-age=[segundos]`**: Indica el tiempo máximo que una respuesta se considera "fresca" desde el momento de la petición. Es acatada por todas las cachés (navegador y proxies).
* *Ejemplo:* `Cache-Control: max-age=3600` (El recurso es válido por una hora).

* **`s-maxage=[segundos]`**: (La "s" es de *shared*). Esta directiva está diseñada específicamente para **cachés compartidas** (CDNs, Proxies inversos). El navegador la ignora por completo.
* **Prioridad:** Si ambas están presentes, una CDN ignorará `max-age` y obedecerá a `s-maxage`. Esto es crucial para estrategias donde quieres que el navegador cachee el recurso poco tiempo, pero la CDN lo mantenga por mucho más para proteger tu origen.

### 2. El gran malentendido: `no-cache` vs `no-store`

Es común ver a administradores usar estas directivas indistintamente, pero su comportamiento a nivel de protocolo es radicalmente opuesto:

* **`no-cache`**: **No significa "no guardar"**. Significa que la caché puede almacenar el recurso, pero **debe revalidar** con el servidor de origen antes de entregarlo al cliente. Si el origen responde con un `304 Not Modified`, la caché sirve la copia que ya tenía. Se usa para garantizar que, aunque el recurso no haya cambiado, el servidor siempre tenga la última palabra.
* **`no-store`**: Esta es la directiva de seguridad por excelencia. Instruye a todas las capas (navegador, CDN, Proxies) a **no guardar rastro alguno** de la respuesta en almacenamiento persistente o memoria. Es obligatoria para datos sensibles, tokens de sesión o información bancaria.

### 3. Visibilidad y Privacidad: `public` vs `private`

* **`public`**: Indica que la respuesta puede ser almacenada por cualquier caché, incluso si la petición tenía una cabecera `Authorization` o el código de estado normalmente no es cacheable.
* **`private`**: Establece que el recurso es específico para un usuario y **solo debe ser guardado por el navegador** (caché privada). Ningún proxy intermedio o CDN debe almacenarlo. Es la configuración por defecto para contenido personalizado.

### Resumen de flujo lógico de decisión

El siguiente diagrama de flujo describe cómo una caché interpreta estas directivas:

```text
¿Contiene 'no-store'?
 ├─ SÍ: Descargar recurso y ELIMINAR inmediatamente (No guardar).
 └─ NO:
    ¿Contiene 'no-cache'?
     ├─ SÍ: Guardar, pero SIEMPRE preguntar al origen antes de servir.
     └─ NO:
        ¿Es una caché compartida (CDN/Proxy)?
         ├─ SÍ: ¿Existe 's-maxage'? 
         │   ├─ SÍ: Usar 's-maxage' como TTL.
         │   └─ NO: Usar 'max-age'.
         └─ NO (Navegador): Usar 'max-age'.

```

### Casos Prácticos para el Administrador

1. **Activos estáticos con hash (Ej: `style.a8f32.css`):**
`Cache-Control: public, max-age=31536000, immutable`
*Estrategia:* Como el nombre del archivo cambia si el contenido cambia, podemos decirle al mundo que lo guarde por un año.
2. **Página de perfil de usuario (Datos dinámicos):**
`Cache-Control: private, no-cache`
*Estrategia:* El navegador guarda el HTML para navegación rápida (atrás/adelante), pero debe preguntar al servidor si hubo cambios antes de mostrarlo.
3. **API de precios de criptomonedas (Actualización constante):**
`Cache-Control: public, s-maxage=1, max-age=1`
*Estrategia:* "Micro-caching". Evita que 10,000 peticiones por segundo lleguen a la DB; la CDN sirve la misma respuesta durante un segundo a todos los clientes.

## 3.3. Validación condicional: Uso de `ETag`, `If-None-Match`, `Last-Modified` y `If-Modified-Since`

En la sección anterior vimos cómo dictar la vida útil de un recurso usando `max-age`. Sin embargo, ¿qué sucede cuando ese tiempo de vida expira o cuando usamos la directiva `no-cache`?

En lugar de descartar la copia almacenada y descargar ciegamente todo el recurso de nuevo (lo cual desperdiciaría ancho de banda y ciclos de CPU), HTTP utiliza un mecanismo llamado **Validación Condicional**. Esto permite a la caché (del navegador o de la CDN) preguntar al servidor de origen: *"Tengo esta versión del archivo, ¿sigue siendo válida?"*.

Si el archivo no ha cambiado, el servidor responde con un código **`304 Not Modified`**. Esta respuesta carece de cuerpo (body), por lo que pesa apenas unos pocos bytes, ahorrando una cantidad masiva de ancho de banda y tiempo de transferencia.

Existen dos estrategias para realizar esta validación: basada en tiempo y basada en contenido.

### 1. Validación basada en el tiempo: `Last-Modified`

Es el método más antiguo y sencillo. Cuando el servidor entrega un recurso, incluye la fecha y hora exacta en que el archivo fue modificado por última vez.

* **La entrega original:** El servidor incluye la cabecera `Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT`.
* **La validación:** Cuando la caché necesita verificar el archivo, emite una nueva petición GET incluyendo la cabecera condicional **`If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT`**.
* **Resolución del origen:** El servidor compara esta fecha con la fecha de modificación actual del archivo en su disco (o base de datos). Si coinciden, devuelve `304 Not Modified`. Si el archivo es más nuevo, devuelve `200 OK` con el nuevo contenido y un nuevo `Last-Modified`.

**⚠️ Advertencia Operativa para Sysadmins:**
La validación por tiempo tiene limitaciones severas:

1. **Resolución de 1 segundo:** `Last-Modified` no puede registrar cambios que ocurran en fracciones de segundo.
2. **Falsos positivos en despliegues:** Si haces un despliegue clonando un repositorio Git o usando `rsync` sin preservar los *timestamps*, los archivos obtendrán una nueva fecha de modificación en el sistema operativo, incluso si su contenido es idéntico. Esto invalidará todas las cachés, provocando una tormenta de peticiones `200 OK` masivas al origen.

### 2. Validación basada en el contenido: `ETag` (Entity Tag)

Para solucionar las deficiencias del tiempo, HTTP/1.1 introdujo los `ETags`. Un `ETag` es un identificador único opaco asignado por el servidor web a una versión específica de un recurso. Generalmente, es un hash (como MD5 o SHA-1) del contenido del archivo.

* **La entrega original:** El servidor calcula el hash y lo envía: `ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"`.
* **La validación:** La caché envía la petición condicional **`If-None-Match: "33a64..."`** (que se traduce como: *"Entrégame el archivo SOLO si el ETag actual NO coincide con este"*).
* **Resolución del origen:** Si el hash actual es igual al recibido, el origen devuelve `304 Not Modified`.

#### ETags Fuertes vs. ETags Débiles (`W/`)

Como administrador, gestionar cómo los proxies manejan la compresión (Gzip/Brotli) es crucial. Si tienes un ETag fuerte (exactitud byte por byte), y un balanceador de carga comprime el archivo al vuelo, los bytes cambian y la validación falla.

Para evitar esto, existen los **ETags débiles**, prefijados con `W/` (Ej: `ETag: W/"0815"`). Un ETag débil indica que, aunque los bytes exactos puedan diferir (debido a la compresión), el *significado semántico* del archivo es el mismo.

**🛠️ Tip de Arquitectura (El problema del clúster de servidores):**
Por defecto, servidores como Apache e IIS solían generar ETags basándose en tres factores del sistema operativo: `INode + MTime + Size`.
Si tienes un clúster de 3 servidores detrás de un balanceador de carga, el mismo archivo exacto tendrá un número de INode diferente en cada servidor. Si la petición de validación de un usuario cae en el Servidor A hoy, y en el Servidor B mañana, los ETags no coincidirán y se forzará un `200 OK` innecesario.
*Solución:* En clústeres, debes configurar tu servidor web para generar ETags basándose únicamente en el tamaño y la fecha de modificación (`FileETag MTime Size` en Apache), o delegar la generación del ETag a la aplicación/proxy frontal.

### Diagrama de Flujo de Validación (Client-Server)

```text
[Cliente / Caché]                                     [Servidor de Origen]
       |                                                        |
       | 1. GET /api/data.json                                  |
       | -----------------------------------------------------> |
       |                                                        |
       | 2. 200 OK                                              |
       |    Cache-Control: max-age=3600                         |
       |    ETag: "v1-xyz"                                      |
       |    [Cuerpo: 500 KB de JSON]                            |
       | <----------------------------------------------------- |
       |                                                        |
    (Pasa 1 hora, el recurso expira en caché)                   |
       |                                                        |
       | 3. GET /api/data.json                                  |
       |    If-None-Match: "v1-xyz"                             |
       | -----------------------------------------------------> |
       |                                                        |
       | 4. 304 Not Modified                                    |
       |    (El origen verifica que el hash sigue siendo "v1-xyz")|
       |    [Cuerpo: Vacío - 0 KB]                              |
       | <----------------------------------------------------- |

```

## 3.4. Gestión de variaciones: El encabezado `Vary` y la fragmentación de caché

Hasta este punto, hemos asumido que la "clave de caché" (el identificador único que usa un proxy o CDN para saber si tiene un archivo) es simplemente la URL exacta. Si dos usuarios piden `https://midominio.com/estilos.css`, ambos reciben exactamente los mismos bytes.

Sin embargo, la Web moderna es multiforme. Un mismo servidor de origen puede entregar representaciones completamente distintas para una misma URL dependiendo de quién pregunte. Por ejemplo:

* Entregar el archivo comprimido en **Brotli** a un navegador moderno, en **Gzip** a uno antiguo, o sin compresión a una herramienta CLI obsoleta (`Accept-Encoding`).
* Entregar el sitio en español o en inglés (`Accept-Language`).
* Entregar una versión móvil o de escritorio de una imagen webp (`User-Agent` o `Accept`).

Si la caché usara *solo* la URL como clave, ocurriría un desastre: el primer usuario (con Chrome moderno) pediría el recurso, el origen devolvería la versión comprimida en Brotli, la CDN guardaría esa versión bajo la URL `/estilos.css`, y cuando el segundo usuario (con un sistema heredado que no soporta compresión) pidiera la misma URL, la CDN le escupiría bytes comprimidos incomprensibles, rompiendo la página.

Para evitar esto, HTTP/1.1 introdujo el encabezado de respuesta **`Vary`**.

### 1. La anatomía de la clave de caché y `Vary`

El encabezado `Vary` es una instrucción que el servidor de origen envía a las cachés intermedias (Navegador, Proxy, CDN). Les dice: *"Para esta URL, no uses solo la ruta como clave de caché. Debes incluir también el valor exacto de estos encabezados de petición que te indico"*.

El comportamiento lógico se transforma de la siguiente manera:

```text
[ COMPORTAMIENTO SIN VARY ]
Clave de Caché = Método + Host + URI
Ej: GET + midominio.com + /app.js  -----> [ Almacena: app.js (Brotli) ] 
(Riesgo de entregar Brotli a clientes incompatibles)

[ COMPORTAMIENTO CON VARY: Accept-Encoding ]
Clave de Caché = Método + Host + URI + Valor de 'Accept-Encoding'
Ej 1: GET + midominio.com + /app.js + (gzip)   -----> [ Almacena: Bucket A ]
Ej 2: GET + midominio.com + /app.js + (br)     -----> [ Almacena: Bucket B ]
Ej 3: GET + midominio.com + /app.js + (vacío)  -----> [ Almacena: Bucket C ]

```

El uso de `Vary: Accept-Encoding` es el estándar de facto en la industria y es **obligatorio** si tu servidor web origen realiza compresión al vuelo.

### 2. El lado oscuro: La Fragmentación de Caché (Cache Fragmentation)

Como administrador de sistemas, el encabezado `Vary` es una espada de doble filo. Si bien es necesario para la correcta entrega de contenido, su uso irresponsable puede destruir el rendimiento de tu infraestructura.

El rendimiento de una caché se mide por su **Hit Ratio** (porcentaje de aciertos). Para que el Hit Ratio sea alto, muchos usuarios deben solicitar exactamente la misma clave de caché. ¿Qué ocurre si un desarrollador decide que el servidor backend entregue HTML distinto según el navegador y configura el origen para enviar **`Vary: User-Agent`**?

El encabezado `User-Agent` es extremadamente granular. Contiene el sistema operativo, la versión del navegador, el motor de renderizado y, a veces, extensiones o parches del SO.
Si envías `Vary: User-Agent`, estás obligando a la CDN a crear un "bucket" o compartimento de caché distinto para:

* `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537...`
* `Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537...` (Versión antigua)
* `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X)...`
* ...y decenas de miles de variaciones más.

**El resultado:** La clave de caché se fragmenta tanto que es estadísticamente improbable que dos usuarios coincidan. Tu Hit Ratio caerá a cerca del 0%, la CDN se volverá inútil (almacenando gigabytes de datos redundantes) y todo el tráfico golpeará tu servidor de origen sin piedad. A esto se le conoce como **envenenamiento por variabilidad** o fragmentación.

### 3. Estrategias de Operaciones: Normalización en el Borde (Edge Normalization)

La solución técnica a la fragmentación no es eliminar la adaptación de contenido, sino **normalizar las variables antes de que se evalúe la caché**.

En arquitecturas empresariales (usando Varnish, HAProxy, o CDNs avanzadas), el administrador intercepta la petición entrante, evalúa el caos del `User-Agent`, y lo traduce a un encabezado personalizado muy simple y controlado.

**Ejemplo de flujo en un Proxy Inverso (Varnish/Nginx):**

1. Llega la petición con un `User-Agent` caótico.
2. El proxy lee el string mediante expresiones regulares.
3. El proxy inyecta un nuevo encabezado limpio: `X-Device-Type: Mobile` (o `Desktop`, o `Tablet`).
4. El proxy reenvía la petición al servidor origen.
5. El servidor origen responde usando ese dispositivo y adjunta: **`Vary: X-Device-Type`**.

Gracias a esto, hemos reducido cientos de miles de posibles claves de caché a **exactamente tres variaciones** (Desktop, Mobile, Tablet). Protegemos el servidor de origen (alto Hit Ratio) manteniendo la funcionalidad intacta.

## 3.5. Invalidación de caché y estrategias de purga (Purge/Ban) en Varnish y CDNs

Existe una famosa cita en ingeniería de software atribuida a Phil Karlton: *"Solo hay dos cosas difíciles en Ciencias de la Computación: la invalidación de caché y nombrar cosas"*.

Como administradores de sistemas, lidiamos con la primera a diario. Diseñar una política perfecta de `Cache-Control` (con sus tiempos de vida o TTLs) es ideal para contenido predecible. Sin embargo, la realidad operativa es caótica: un editor publica una noticia con un error legal, un desarrollador sube un CSS defectuoso que rompe la interfaz, o un producto cambia de precio repentinamente en pleno Black Friday.

En estos escenarios, no podemos esperar horas o días a que expire el `max-age`. Necesitamos un mecanismo de **evicción activa** para forzar a la caché a "olvidar" un recurso inmediatamente. A nivel de infraestructura (especialmente en Varnish y CDNs modernas), existen tres estrategias principales para lograr esto.

### 1. Purga Exacta (El método HTTP `PURGE`)

La purga exacta actúa como un francotirador. Consiste en enviar una petición HTTP utilizando un método no estándar (comúnmente `PURGE`) a la URL exacta que deseamos eliminar de la memoria.

* **Mecanismo:** El administrador (o la aplicación backend) envía un `PURGE /assets/estilos.css` a la IP del proxy inverso.
* **Comportamiento en Varnish:** Varnish busca en su memoria la clave de caché que coincide exactamente con esa URL (y su respectivo `Vary`, si lo tiene) y la marca como expirada o la elimina.
* **Ventajas:** Es extremadamente rápido (complejidad $O(1)$) y no consume apenas CPU en el servidor de caché.
* **Desventajas:** No escala. Si un cambio en el menú de navegación afecta a 10,000 páginas HTML distintas, tendrías que enviar 10,000 peticiones `PURGE` individuales.

**🛡️ Seguridad Operativa (ACLs):**
El método `PURGE` es un vector de ataque clásico (Denegación de Servicio sobre el origen o *Cache Poisoning*). Nunca debe estar expuesto a Internet. A continuación, se muestra un patrón estándar en Varnish (VCL) para asegurar este endpoint:

```vcl
# 1. Definimos la Lista de Control de Acceso (ACL)
acl purge_ips {
    "localhost";
    "192.168.1.0"/24; # Red interna de microservicios
}

sub vcl_recv {
    # 2. Interceptamos el método PURGE
    if (req.method == "PURGE") {
        # 3. Validamos la IP de origen
        if (!client.ip ~ purge_ips) {
            return(synth(405, "Acceso denegado: IP no autorizada para purgas."));
        }
        # 4. Ejecutamos la purga
        return (purge);
    }
}

```

### 2. Invalidación por Patrones (El método `BAN` / Wildcards)

Cuando necesitamos invalidar múltiples recursos simultáneamente, recurrimos al "escopetazo". En CDNs, esto suele llamarse *Wildcard Purge* (`/imagenes/*`), y en Varnish se gestiona mediante la directiva `BAN`.

* **Mecanismo:** En lugar de buscar una URL, le damos a la caché una expresión regular (Regex). Por ejemplo: *"Invalida todo lo que empiece por `/catalogo/`"*.
* **Comportamiento en Varnish (BAN List):** A diferencia de un `PURGE`, un `BAN` no busca en la memoria para borrar objetos inmediatamente. En su lugar, Varnish añade la regla (Regex) a una "lista negra" interna. Cada vez que un usuario pide un archivo, Varnish primero comprueba si el archivo está en caché y luego verifica si su fecha de creación es *anterior* a alguna regla de la lista de `BAN` que coincida con su URL. Si coincide, lo descarta y pide uno nuevo.
* **El Riesgo Operativo:** Las expresiones regulares son costosas computacionalmente. Si tienes una lista de BANs con miles de reglas Regex complejas, la CPU de tu proxy inverso se disparará con cada petición HTTP entrante intentando evaluar el objeto contra la lista.

### 3. Llaves Sustitutas (Surrogate-Keys / Cache-Tags)

Esta es la evolución moderna de la invalidación y el estándar en CDNs empresariales (Fastly, Cloudflare, Akamai) y arquitecturas avanzadas. Resuelve el problema de purgar contenido relacionado que no comparte una estructura de URL común.

* **Mecanismo:** Cuando el servidor de origen genera la respuesta HTTP `200 OK`, inyecta una cabecera interna especial (por ejemplo, `Surrogate-Key` o `Cache-Tag`) que asocia el contenido a ciertas entidades lógicas.

**Ejemplo de respuesta del origen a la CDN:**

```http
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: public, max-age=86400
Surrogate-Key: articulo-45, autor-juan, categoria-deportes

```

*(La CDN guarda el HTML y toma nota de estas tres etiquetas. Opcionalmente, la CDN elimina esta cabecera antes de entregar el archivo al navegador final para ahorrar ancho de banda).*

* **La Purga:** Si el "autor Juan" actualiza su foto de perfil, el administrador no necesita saber qué URLs tienen artículos de Juan. Simplemente hace una llamada a la API de la CDN: `PURGE / HTTP/1.1\nSurrogate-Key: autor-juan`.
* **Impacto:** En milisegundos, la CDN localiza a través de un índice invertido (similar a cómo funciona una base de datos) todos los miles de objetos cacheados que contengan esa etiqueta y los elimina simultáneamente. Es eficiente, altamente escalable y desacopla la lógica de caché de la estructura de enrutamiento web.

Con esta sección cerramos el Capítulo 3 sobre almacenamiento y optimización de entrega. Hemos cubierto desde la anatomía física de la red hasta las directivas lógicas de cabeceras y las estrategias de emergencia.
