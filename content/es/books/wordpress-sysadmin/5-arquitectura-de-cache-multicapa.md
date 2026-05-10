La caché es el corazón de un WordPress de alto rendimiento. En este capítulo, desglosamos la infraestructura que permite escalar de miles a millones de visitas mediante una estrategia de capas. Desde la precompilación de scripts con **Bytecode Cache** y la optimización de consultas en RAM con **Object Cache** (Redis/Memcached), hasta la entrega de HTML estático mediante **Page Cache** (NGINX/Varnish). Aprenderás a configurar el *drop-in* `object-cache.php`, implementar el *bypass* de PHP y dominar la invalidación selectiva de contenido. El objetivo es claro: minimizar la carga en el servidor y reducir el TTFB al límite físico para garantizar la alta disponibilidad.

## 5.1 Entendiendo los tipos de caché: *Page Cache*, *Object Cache*, *Fragment Cache* y *Bytecode Cache*

En el ecosistema de WordPress, el término "caché" se utiliza a menudo como una solución mágica para cualquier problema de rendimiento. Sin embargo, para un administrador de sistemas o arquitecto de infraestructura, la caché no es un interruptor único; es una **arquitectura multicapa** (a menudo comparada con las muñecas rusas) donde cada capa tiene un propósito específico, intercepta la petición en una etapa distinta y mitiga un cuello de botella particular (CPU, RAM, I/O o red).

Para diseñar una pila de alta disponibilidad, primero debemos entender qué es exactamente lo que estamos almacenando, dónde reside y en qué momento de la anatomía de la petición (que vimos en el Capítulo 1) entra en acción.

A continuación, se ilustra cómo interactúan estas cuatro capas principales cuando una petición HTTP no almacenada en el borde (CDN) llega a nuestro servidor:

```text
[Petición HTTP del Cliente]
         │
         ▼
[ Web Server / Proxy Inverso ] ──(¿HTML generado?)──▶ [ 1. PAGE CACHE ] (Hit = Fin)
         │ (Miss)
         ▼
    [ PHP-FPM ] ──────────────(¿Script compilado?)──▶ [ 2. BYTECODE CACHE ] (OPcache)
         │ (Ejecuta PHP)
         ▼
[ Core de WordPress ] ──────────(¿Bloque parcial?)──▶ [ 3. FRAGMENT CACHE ]
         │ (Renderizando)
         ▼
[ Consultas / Funciones ] ──────(¿Dato en RAM?)─────▶ [ 4. OBJECT CACHE ] (Redis/Memcached)
         │ (Miss)
         ▼
[ Base de Datos (MySQL) ]

```

Analicemos la función de cada una de estas capas desde la más profunda (nivel de código) hasta la más externa (nivel de servidor web).

---

### 1. Bytecode Cache (La capa del intérprete)

PHP es un lenguaje interpretado. Por defecto, cada vez que se ejecuta un script de WordPress (como `index.php` o `wp-load.php`), el motor de PHP debe leer el archivo desde el disco, analizar el código fuente, compilarlo en un formato intermedio llamado *opcodes* (código de bytes) y, finalmente, ejecutarlo. Este proceso consume ciclos de CPU y operaciones de lectura/escritura (I/O).

El **Bytecode Cache** intercepta este proceso. Almacena los *opcodes* precompilados en la memoria compartida (RAM). Cuando llega una nueva petición, PHP omite las fases de lectura, análisis y compilación, ejecutando directamente el *bytecode* desde la memoria.

* **Implementación estándar:** Zend OPcache.
* **Impacto:** Reduce drásticamente el consumo de CPU y el tiempo de ejecución de PHP.
* **Nota arquitectónica:** Como cubrimos en la sección 3.4, esta es una optimización obligatoria a nivel de PHP-FPM. Es transparente para WordPress; el CMS no necesita saber que OPcache está funcionando.

### 2. Object Cache (La capa de datos y consultas)

El núcleo de WordPress, los plugins y los temas realizan cientos de llamadas a la base de datos para cargar opciones, metadatos, taxonomías y contenido de los posts. Ejecutar estas consultas repetidamente en MySQL para cada visitante es el cuello de botella más común y costoso en entornos de alto tráfico.

El **Object Cache** (Caché de objetos) almacena los resultados de estas consultas complejas o datos computados directamente en la memoria RAM, asociados a una clave única.

WordPress incluye una clase nativa llamada `WP_Object_Cache`. Sin embargo, **por defecto, esta caché no es persistente**. Solo vive durante la vida útil de una única petición HTTP; si una función pide el mismo dato dos veces en la misma carga de página, se reutiliza, pero al siguiente visitante se le vuelve a consultar a la base de datos.

Para escalar, necesitamos que esta caché sea **persistente** entre múltiples peticiones y sesiones.

* **Implementación:** Se logra mediante un archivo *drop-in* (`object-cache.php`) que redirige la API de caché de WordPress hacia un almacén de datos en memoria externo.
* **Tecnologías clave:** Redis o Memcached (profundizaremos en su despliegue y monitoreo en las secciones 5.2 y 5.3).
* **Impacto:** Libera a la base de datos (MySQL/InnoDB) de cargas de lectura redundantes, permitiéndole enfocarse en operaciones de escritura y consultas complejas inevitables.

### 3. Fragment Cache (La capa de componentes parciales)

Mientras que el *Object Cache* suele almacenar datos crudos o arrays directamente de la base de datos, el **Fragment Cache** almacena fragmentos de HTML ya procesado o bloques computados que son costosos de generar pero que no abarcan la página entera.

Imagina un *mega-menú* de navegación dinámico que requiere iterar sobre decenas de categorías, o un widget en el *sidebar* que extrae datos de una API externa (como los últimos tweets o el clima). No tiene sentido procesar esto en cada carga si la información solo cambia cada cierto tiempo.

* **Implementación:** En WordPress, el Fragment Caching suele gestionarse utilizando la **Transients API** (`set_transient()`, `get_transient()`). Los transients son similares a las opciones, pero tienen una fecha de caducidad.
* **Sinergia:** Si tienes un Object Cache persistente configurado (como Redis), los *transients* se guardan automáticamente en la RAM (en Redis) en lugar de en la tabla `wp_options` de la base de datos, combinando el poder de ambas capas.
* **Impacto:** Reduce el tiempo de procesamiento de PHP (y consultas a APIs de terceros) para bloques específicos, siendo crucial en tiendas WooCommerce o sitios de membresía donde no podemos cachear la página completa.

### 4. Page Cache (La capa de entrega final)

El **Page Cache** es el "Santo Grial" del *Time to First Byte* (TTFB). En lugar de inicializar PHP, cargar WordPress, conectar a la base de datos y construir el DOM, esta capa guarda el producto final: el documento HTML estático.

Cuando un usuario anónimo (no logueado) solicita una URL, el servidor web o el proxy inverso verifica si ya tiene el HTML generado para esa ruta. Si es así (un *Cache Hit*), envía el archivo estático inmediatamente. Esto hace que un sitio dinámico en WordPress se comporte con la velocidad de un sitio web estático en HTML puro.

* **Implementación a nivel de servidor:** A diferencia de los clásicos plugins de WordPress que gestionan el Page Cache mediante PHP (y por lo tanto aún requieren inicializar parte del motor), en entornos de alta disponibilidad esto se delega al servidor web o a un proxy.
* **Tecnologías clave:** NGINX FastCGI Cache (sección 5.4) o Varnish Cache (sección 5.5).
* **El desafío:** La complejidad del Page Cache no radica en guardarlo, sino en saber **cuándo invalidarlo** (Purgar la caché al publicar un post) y **a quién no entregárselo** (el carrito de compras de un usuario o el panel de administración).

---

## El flujo optimizado: Por qué necesitas todas las capas

Una arquitectura bien diseñada no elige un tipo de caché sobre otro; los apila estratégicamente.

Cuando el tráfico es anónimo, el **Page Cache** absorbe el 90% de las peticiones, evitando que lleguen a PHP. Sin embargo, para el 10% restante (tráfico dinámico, usuarios logueados en WooCommerce, peticiones a la REST API o el área de wp-admin) el Page Cache debe ser evitado (*Bypass*).

Es exactamente en ese tráfico no cacheable a nivel de página donde el servidor depende de la velocidad que otorgan el **Bytecode Cache** (OPcache) para acelerar el intérprete, y el **Object Cache** (Redis) para evitar que la base de datos colapse. Comprender esta sinergia es el paso fundamental antes de instalar e intervenir cualquier servicio en nuestro entorno.

## 5.2 *Object Caching* persistente: Instalación, configuración y monitoreo de Redis vs. Memcached

Como establecimos en la sección anterior, WordPress requiere de un almacén externo para que su caché de objetos no se pierda entre peticiones. Sin un sistema persistente, el trabajo de la base de datos se duplica innecesariamente. En esta sección, compararemos las dos tecnologías dominantes en el ecosistema SysAdmin: **Redis** y **Memcached**, y detallaremos su implementación técnica.

---

### 1. Redis vs. Memcached: ¿Cuál elegir para WordPress?

Aunque ambos son sistemas de almacenamiento de clave-valor en memoria, sus arquitecturas internas ofrecen ventajas distintas según el caso de uso.

| Característica | **Redis (Remote Dictionary Server)** | **Memcached** |
| --- | --- | --- |
| **Arquitectura** | Monohilo (Single-threaded), basado en eventos. | Multihilo (Multi-threaded). |
| **Tipos de Datos** | Strings, Lists, Sets, Hashes, Bitmaps. | Solo Strings (Datos planos). |
| **Persistencia** | Sí (RDB/AOF), sobrevive a reinicios. | No (Solo RAM), se vacía al reiniciar. |
| **Replicación** | Nativa (Master-Slave / Cluster). | Mediante herramientas externas. |
| **Evicción** | Políticas avanzadas (LRU, LFU, Random). | LRU (Least Recently Used) básico. |

**Veredicto para WordPress:** Para la gran mayoría de instalaciones, **Redis** es la opción superior. Su capacidad de persistencia evita el "Cache Stampede" (picos de carga en DB) tras un reinicio del servidor y su soporte para estructuras de datos complejas permite una gestión más eficiente de grupos de caché.

---

### 2. Implementación de Redis para WordPress

Para que Redis funcione como motor de caché de objetos, necesitamos tres componentes: el servidor Redis, la extensión de PHP y el *drop-in* de WordPress.

#### A. Instalación del Servidor y Extensión PHP (Debian/Ubuntu)

```bash
# Actualizar repositorios e instalar
sudo apt update
sudo apt install redis-server php-redis -y

# Verificar que el servicio esté corriendo
redis-cli ping # Debería devolver: PONG

```

#### B. Optimización de `redis.conf` para SysAdmins

En un entorno de producción, no podemos permitir que Redis consuma toda la RAM disponible, ya que causaría que el kernel eliminara procesos vitales (como PHP-FPM). Editamos `/etc/redis/redis.conf`:

```conf
# Limitar la memoria al 25-50% de la RAM disponible (según el stack)
maxmemory 512mb

# Política de evicción recomendada para WordPress
# 'allkeys-lru' elimina las claves menos usadas cuando se llena la memoria
maxmemory-policy allkeys-lru

# Desactivar guardado en disco si solo se usa para caché (opcional para máximo rendimiento)
# save "" 

```

---

### 3. Implementación de Memcached para WordPress

Memcached es preferido en arquitecturas extremadamente masivas y simples donde la multihilo es una ventaja crítica y no se requiere persistencia.

#### A. Instalación

```bash
sudo apt install memcached libmemcached-tools php-memcached -y

```

#### B. Configuración de `/etc/memcached.conf`

```conf
# Memoria asignada (-m)
-m 512

# Interfaz de escucha (por seguridad, solo localhost)
-l 127.0.0.1

# Número de hilos (-t)
-t 4

```

---

### 4. Monitoreo y Auditoría de Rendimiento

Instalar el servicio es solo la mitad del trabajo. Un SysAdmin debe monitorear la **Tasa de Aciertos (Hit Rate)** para asegurar que la caché sea efectiva.

#### Monitoreo de Redis

El comando `info` proporciona las métricas vitales:

```bash
redis-cli info stats | grep keyspace

```

* **keyspace_hits**: Peticiones servidas desde la RAM (Bien).
* **keyspace_misses**: Peticiones que fueron a la base de datos (Mal si es muy alto).

Para ver qué está pasando en tiempo real (ideal para debugging de plugins):

```bash
redis-cli monitor

```

#### Monitoreo de Memcached

Usamos la herramienta `memstat`:

```bash
memstat --servers="127.0.0.1"

```

Debemos prestar especial atención a la métrica **"Evictions"**. Si este número aumenta constantemente, significa que la memoria asignada es insuficiente y el sistema está borrando caché válida para hacer espacio a la nueva.

---

### 5. Consideraciones de Seguridad

Ambos servicios son extremadamente peligrosos si se exponen a internet.

1. **Bind**: Asegurarse de que escuchen solo en `127.0.0.1`.
2. **Autenticación**: En Redis, activar `requirepass` en el archivo de configuración.
3. **Sockets Unix**: Para rendimiento máximo y seguridad, usar sockets `.sock` en lugar de puertos TCP/IP para la comunicación entre PHP y el motor de caché.

## 5.3 Configuración del drop-in `object-cache.php` para integrar Redis/Memcached con WordPress

En el ecosistema de WordPress, un **drop-in** es un archivo especial que reside directamente en la carpeta `/wp-content/` y que el núcleo del CMS carga automáticamente para reemplazar o extender funcionalidades críticas. El archivo `object-cache.php` es el drop-in encargado de interceptar todas las llamadas a la API de caché de WordPress (`wp_cache_set`, `wp_cache_get`, etc.) y desviarlas desde la memoria volátil de PHP hacia nuestro servidor de persistencia (Redis o Memcached).

Sin este archivo, aunque tengas Redis instalado en el servidor, WordPress seguirá utilizando su caché no persistente por defecto.

---

### 1. Anatomía del proceso de integración

La integración no se realiza mediante un plugin convencional en el sentido estricto (aunque los plugins facilitan el proceso), sino mediante el siguiente flujo de archivos:

```text
[ WordPress Core ] 
      │
      ▼
[ /wp-content/object-cache.php ] <─── (El "puente" o drop-in)
      │
      ▼
[ Extensión PHP (redis.so / memcached.so) ]
      │
      ▼
[ Servidor Externo (Redis Port 6379 / Memcached Port 11211) ]

```

---

### 2. Implementación con Redis (Recomendado)

La forma más eficiente y estándar en la industria es utilizar el plugin **Redis Object Cache** (de Till Krüss), el cual proporciona el archivo drop-in necesario.

#### Paso 1: Instalación del drop-in

Si usas WP-CLI (herramienta que veremos en el Capítulo 8), el comando es:

```bash
wp plugin install redis-cache --activate
wp redis enable

```

Esto copiará automáticamente el archivo de la carpeta del plugin a `/wp-content/object-cache.php`.

#### Paso 2: Configuración en `wp-config.php`

Para que el drop-in sepa dónde encontrar el servidor y cómo autenticarse, debemos definir constantes antes de la línea `/* That's all, stop editing! */`:

```php
// Configuración básica de Redis
define( 'WP_REDIS_HOST', '127.0.0.1' );
define( 'WP_REDIS_PORT', 6379 );

// Seguridad y Aislamiento (Crucial en entornos multi-sitio)
define( 'WP_CACHE_KEY_SALT', 'tu_cadena_aleatoria_unica_' );
define( 'WP_REDIS_DATABASE', 0 ); // IDs del 0 al 15 disponibles

// Si configuraste contraseña en redis.conf
define( 'WP_REDIS_PASSWORD', 'tu_password_seguro' );

// Tiempos de espera y rendimiento
define( 'WP_REDIS_TIMEOUT', 1 );
define( 'WP_REDIS_READ_TIMEOUT', 1 );

```

---

### 3. Implementación con Memcached

Para Memcached, el proceso es similar, pero el drop-in suele provenir de plugins como "Memcached Object Cache".

#### Configuración en `wp-config.php`

Memcached utiliza una estructura de "servidores" (arrays) ya que permite el balanceo nativo:

```php
global $memcached_servers;
$memcached_servers = [
    [
        '127.0.0.1', // Host
        11211,       // Port
        1            // Weight (prioridad si hay varios nodos)
    ]
];

// Prefijo para evitar colisiones entre sitios en el mismo servidor
define( 'WP_CACHE_KEY_SALT', 'sitio1_prod_' );

```

---

### 4. La importancia del `WP_CACHE_KEY_SALT`

Este es el error más común del SysAdmin en servidores compartidos o entornos de staging/producción que comparten la misma instancia de Redis.

Si dos instalaciones de WordPress apuntan al mismo servidor Redis sin un `SALT` (sal) diferente, el sitio A podría intentar leer la caché del sitio B. Esto resultaría en:

* Usuarios viendo sesiones de otros sitios.
* Rutas de archivos cruzadas.
* Errores críticos de PHP al intentar cargar objetos con estructuras de clases diferentes.

---

### 5. Verificación de la conexión

Una vez configurado, puedes verificar si WordPress está realmente entregando datos a Redis mediante la terminal:

```bash
# Entrar al monitor de Redis
redis-cli monitor

```

Si al navegar por el sitio web ves un flujo constante de comandos `SET`, `GET` y `EXPIRE` en la terminal, la integración es exitosa.

## 5.4 *Page Caching* a nivel de servidor (Bypass de PHP): Implementación de NGINX FastCGI Cache

Hasta ahora hemos optimizado la ejecución del código (OPcache) y las consultas a la base de datos (Redis). Sin embargo, el mayor salto en el rendimiento métrico (especialmente en el *Time to First Byte* o TTFB) se logra cuando el servidor web no tiene que hablar con PHP en absoluto.

La mayoría de los usuarios de WordPress confían en plugins como WP Rocket o W3 Total Cache para generar HTML estático. El problema es que estos plugins, en su configuración por defecto, utilizan PHP para interceptar la petición y leer el archivo estático. En una arquitectura de alta disponibilidad, inicializar el intérprete de PHP solo para entregar un archivo plano es un desperdicio inaceptable de recursos.

Aquí es donde entra **NGINX FastCGI Cache**. Esta tecnología permite que NGINX guarde la respuesta generada por PHP-FPM y, en peticiones posteriores, entregue ese HTML estático directamente desde su propio motor, realizando un **Bypass total de PHP**.

---

### 1. Arquitectura del Bypass

El flujo de una petición con FastCGI Cache configurado funciona de la siguiente manera:

```text
[ Cliente ] ──(HTTP GET /contacto)──▶ [ NGINX ]
                                        │
                       (¿Cumple reglas de Bypass? Ej: Usuario Logueado)
                                        │
                     ┌──────────────────┴──────────────────┐
                  (NO)                                   (SÍ)
                   │                                       │
        [ FastCGI Cache Zone ]                             │
        ¿Existe en caché?                                  │
           │           │                                   │
         (SÍ)        (NO)                                  │
          │            │                                   │
    [ HIT ]            └───────────────▶ [ PHP-FPM ] ◀─────┘
(Entrega HTML)                         (Renderiza WP)
                                             │
                                   [ MISS / BYPASS ]
                             (NGINX guarda copia y entrega)

```

---

### 2. Configuración de la Zona de Caché (Contexto `http`)

El primer paso es definir dónde y cómo NGINX almacenará los archivos. Esto se configura en el archivo `nginx.conf` (o en un archivo dentro de `conf.d/`), dentro del bloque `http {}`.

```nginx
# 1. Definir la ruta y los parámetros de la zona
# Recomendación SysAdmin: Montar /var/run en tmpfs (RAM) para velocidad I/O extrema
fastcgi_cache_path /var/run/nginx-cache levels=1:2 keys_zone=WORDPRESS:100m inactive=60m max_size=1g;

# 2. Definir la clave de caché
# NGINX usará este formato para hashear y buscar la página correcta
fastcgi_cache_key "$scheme$request_method$host$request_uri";

# 3. Ignorar cabeceras de caché nativas de PHP que podrían interferir
fastcgi_ignore_headers Cache-Control Expires Set-Cookie;

```

**Parámetros clave explicados:**

* `levels=1:2`: Crea una estructura de directorios de dos niveles para evitar que un solo directorio tenga miles de archivos (lo cual degrada el rendimiento del sistema de archivos).
* `keys_zone=WORDPRESS:100m`: Crea una zona de memoria compartida llamada "WORDPRESS" con 100MB (suficiente para almacenar millones de claves de caché, no los archivos HTML en sí).
* `inactive=60m`: Si un archivo en caché no se solicita en 60 minutos, NGINX lo elimina del disco.

---

### 3. Lógica de exclusión: Cuándo NO cachear (Contexto `server`)

El mayor desastre que puede ocurrir con el Page Cache es entregar la versión en caché de un carrito de compras o del panel de administración a otro visitante. Dentro de la configuración de nuestro sitio (bloque `server {}`), debemos definir variables precisas para evitar esto.

```nginx
# Inicializamos la variable de salto de caché en 0 (Falso = Cachear)
set $skip_cache 0;

# 1. POST requests nunca deben ser cacheados
if ($request_method = POST) {
    set $skip_cache 1;
}

# 2. URIs específicas de WordPress que requieren dinamismo
if ($request_uri ~* "/wp-admin/|/xmlrpc.php|wp-.*.php|^/feed/*|/tag/.*/feed/*|index.php|/.*sitemap.*\.(xml|xsl)") {
    set $skip_cache 1;
}

# 3. Bypass para usuarios autenticados, comentaristas y carritos de WooCommerce
if ($http_cookie ~* "comment_author|wordpress_[a-f0-9]+|wp-postpass|wordpress_no_cache|wordpress_logged_in|woocommerce_items_in_cart|woocommerce_cart_hash") {
    set $skip_cache 1;
}

```

---

### 4. Activación de la Caché (Contexto `location`)

Finalmente, aplicamos las reglas en el bloque donde NGINX pasa las peticiones a PHP-FPM (`location ~ \.php$`).

```nginx
location ~ \.php$ {
    # (Configuración estándar de fastcgi_pass aquí...)
    fastcgi_pass unix:/run/php/php8.1-fpm.sock;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

    # Activar la zona que creamos en el bloque http
    fastcgi_cache WORDPRESS;

    # Aplicar la lógica de bypass
    fastcgi_cache_bypass $skip_cache; # No leer de la caché si es 1
    fastcgi_no_cache $skip_cache;     # No guardar en la caché si es 1

    # Tiempos de validez según el código HTTP
    fastcgi_cache_valid 200 301 302 60m;
    fastcgi_cache_valid 404 1m;

    # Cabecera vital para depuración (Debugging SysAdmin)
    add_header X-FastCGI-Cache $upstream_cache_status;
}

```

---

### 5. Depuración y Auditoría de la Caché

La directiva `add_header X-FastCGI-Cache $upstream_cache_status;` es la herramienta más importante de esta configuración. Permite auditar el comportamiento abriendo las herramientas de desarrollador del navegador (Pestaña *Network*) o usando `curl` desde la terminal:

```bash
curl -I https://midominio.com

```

Los resultados posibles para la cabecera `X-FastCGI-Cache` son:

* **MISS**: La página no estaba en caché. NGINX la solicitó a PHP y la acaba de guardar.
* **HIT**: Éxito absoluto. NGINX entregó la copia estática (Bypass total).
* **BYPASS**: La lógica dictó que no se debía cachear (ej. estabas logueado).
* **EXPIRED**: El tiempo definido (`fastcgi_cache_valid`) se superó. NGINX solicitará una nueva copia a PHP.

*Nota sobre invalidación: Al utilizar FastCGI a nivel de servidor, WordPress pierde la capacidad nativa de "limpiar" la caché al publicar un post. Se requerirá un plugin puente como "Nginx Helper" y el módulo `nginx-cache-purge`, conceptos que se desarrollarán en la sección 5.6 sobre estrategias de Purge.*

## 5.5 Caché de proxy inverso: Despliegue y configuración avanzada de Varnish Cache con VCL (Varnish Configuration Language) específico para WordPress

Si NGINX FastCGI Cache (sección 5.4) es una solución excelente e integrada para la mayoría de los servidores de alto rendimiento, **Varnish Cache** representa la artillería pesada. Diseñado desde cero exclusivamente como un acelerador HTTP y proxy inverso, Varnish es el estándar de facto en entornos empresariales, portales de noticias masivos y arquitecturas de alta disponibilidad (HA).

La principal ventaja de Varnish frente a NGINX no radica solo en la velocidad cruda (ambos son extraordinariamente rápidos al servir desde la RAM), sino en su motor de reglas: el **VCL (Varnish Configuration Language)**. El VCL permite escribir lógica de enrutamiento, manipulación de cabeceras y control de caché con una granularidad nivel de programador, compilándose en lenguaje C en tiempo de ejecución para un rendimiento insuperable.

---

### 1. Topología arquitectónica con Varnish

A diferencia de NGINX o Apache, **Varnish no soporta cifrado TLS/SSL de forma nativa**. Por diseño, sus creadores decidieron mantenerlo puro y enfocado en el protocolo HTTP. Por lo tanto, en una pila moderna moderna, Varnish requiere un "Terminador TLS" (usualmente NGINX, HAProxy o Hitch) delante de él.

El flujo de una petición segura (HTTPS) en esta arquitectura es el siguiente:

```text
[ Cliente (HTTPS) ]
         │ (Puerto 443)
         ▼
[ NGINX (Terminador TLS) ] ──(Descifra SSL y pasa a HTTP)──┐
                                                           │
                                                      (Puerto 80)
                                                           ▼
    [ NGINX (Backend) ] ◀──(Si es MISS/BYPASS)── [ VARNISH CACHE ]
    (Puerto 8080)                                 (Evalúa VCL)
         │                                                 │
    [ PHP-FPM ]                                   (Si es HIT)
         │                                                 │
 [ Base de Datos ]                                [ Entrega HTML ]

```

*Nota: En esta topología, NGINX cumple una doble función: actúa como terminador TLS en la frontera y como servidor web/procesador de PHP en la retaguardia.*

---

### 2. Despliegue y reasignación de puertos (Debian/Ubuntu)

El primer paso del SysAdmin es reconfigurar los puertos para que Varnish intercepte el tráfico no cifrado.

**1. Instalar Varnish:**

```bash
sudo apt update
sudo apt install varnish -y

```

**2. Reconfigurar NGINX:**
Editar los bloques `server {}` de NGINX para que escuchen en el puerto `8080` (en lugar del `80`), y configurar el terminador TLS para enviar el tráfico a Varnish.

**3. Configurar el puerto de Varnish:**
Editar `/etc/default/varnish` (o el servicio de systemd en distribuciones modernas) para que Varnish escuche en el puerto `80`.

---

### 3. VCL Específico para WordPress (El corazón del sistema)

El comportamiento de Varnish por defecto es muy conservador: **si la petición contiene una cookie, no la cachea**. Dado que WordPress, Google Analytics y los plugins de marketing llenan el navegador de cookies en el frontend, Varnish será inútil sin una configuración VCL adaptada.

El archivo de configuración principal se encuentra en `/etc/varnish/default.vcl`. A continuación, desglosamos las subrutinas críticas para WordPress.

#### A. Definición del Backend y ACL (Listas de Control de Acceso)

Le indicamos a Varnish dónde está nuestro servidor web y quién tiene permiso para vaciar (Purgar) la caché.

```varnish
vcl 4.0;

# El backend es nuestro NGINX escuchando en el 8080
backend default {
    .host = "127.0.0.1";
    .port = "8080";
    .first_byte_timeout = 60s;
}

# Solo el servidor local puede mandar comandos PURGE
acl purge {
    "localhost";
    "127.0.0.1";
}

```

#### B. `vcl_recv`: Intercepción y limpieza de peticiones

Esta es la puerta de entrada. Aquí decidimos qué ignorar y qué procesar. La regla de oro en WordPress es: *eliminar las cookies inútiles del frontend, pero preservar las de sesión del backend*.

```varnish
sub vcl_recv {
    # 1. Bypass para métodos no cacheables y áreas de administración
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass); # Enviar directamente a NGINX
    }
    
    if (req.url ~ "^/wp-admin/" || req.url ~ "^/wp-login.php") {
        return (pass);
    }

    # 2. Bypass para usuarios logueados y WooCommerce
    if (req.http.cookie) {
        if (req.http.cookie ~ "(wordpress_[a-zA-Z0-9_]+|wp-postpass|wordpress_logged_in_[a-zA-Z0-9_]+|woocommerce_items_in_cart|woocommerce_cart_hash)") {
            return (pass);
        }
        
        # 3. Limpieza extrema de cookies:
        # Si la petición llegó hasta aquí, es tráfico anónimo.
        # Eliminamos TODAS las cookies de rastreo (Analytics, Ads, etc.)
        # para forzar a Varnish a cachear la URL limpia.
        unset req.http.cookie;
    }

    # 4. Manejo de purgado de caché
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return (synth(405, "No autorizado."));
        }
        return (purge);
    }

    return (hash);
}

```

#### C. `vcl_backend_response`: Modificando la respuesta del servidor

Aquí procesamos lo que NGINX y PHP nos acaban de devolver antes de guardarlo en la RAM.

```varnish
sub vcl_backend_response {
    # Evitar que WordPress obligue al navegador a no cachear estáticos
    if (bereq.url ~ "\.(css|js|png|gif|jp(e)?g|swf|ico|woff(2)?|svg|eot|ttf)") {
        unset beresp.http.set-cookie;
        set beresp.ttl = 30d; # Cachear estáticos por 30 días
        return (deliver);
    }

    # Cachear el HTML de páginas no excluidas por 1 hora
    if (bereq.url !~ "wp-admin|wp-login|post.php") {
        unset beresp.http.set-cookie;
        set beresp.ttl = 1h;
    }
}

```

#### D. `vcl_deliver`: Cabeceras de diagnóstico

Para el SysAdmin, es vital saber qué está pasando sin revisar los logs. Añadimos cabeceras que el navegador pueda leer.

```varnish
sub vcl_deliver {
    if (obj.hits > 0) {
        set resp.http.X-Varnish-Cache = "HIT";
        set resp.http.X-Varnish-Hits = obj.hits;
    } else {
        set resp.http.X-Varnish-Cache = "MISS";
    }
    
    # Ocultar la versión de Varnish por seguridad
    unset resp.http.X-Varnish;
    unset resp.http.Via;
}

```

---

### 4. La ventaja táctica del VCL en Producción

Mientras que NGINX FastCGI Cache requiere múltiples bloques condicionales `if` (que en NGINX se evalúan de forma secuencial y a veces impredecible, conocido como el problema "*If is Evil*"), Varnish evalúa el VCL como una máquina de estados determinista.

Esto permite a los ingenieros de infraestructura implementar lógicas complejas en el borde (Edge-like computing), como:

* Normalizar las cadenas de *User-Agent* para evitar fragmentación excesiva de la caché.
* Redirigir tráfico malicioso al sumidero (`synth`) antes de que toque los hilos del servidor web.
* Implementar mecanismos de *Grace Mode*: si PHP-FPM o MySQL colapsan y devuelven un error 500, Varnish puede seguir entregando una versión "caducada" de la caché durante unas horas para mantener el sitio online mientras se resuelve la emergencia.

Esta resiliencia es el verdadero valor de Varnish Cache en la arquitectura de alta disponibilidad.

## 5.6 Estrategias de invalidación de caché (Purge) y manejo del tráfico autenticado (usuarios logueados vs. visitantes anónimos)

Existe un adagio clásico en la ingeniería de software atribuido a Phil Karlton: *"Solo hay dos cosas difíciles en Ciencias de la Computación: la invalidación de la caché y nombrar cosas"*.

En la arquitectura de WordPress, guardar una página HTML estática es trivial (como vimos en las secciones 5.4 y 5.5). El verdadero desafío del SysAdmin es garantizar que los usuarios vean el contenido actualizado inmediatamente después de una publicación, sin destruir el rendimiento del servidor en el proceso, y aislar estrictamente el tráfico que no debe ser cacheado.

---

### 1. El manejo del tráfico: Autenticado vs. Anónimo

El tráfico de un sitio en WordPress se divide fundamentalmente en dos flujos que el servidor web debe enrutar de manera distinta antes de siquiera invocar a PHP.

* **Visitantes Anónimos (90-99% del tráfico):** Usuarios no logueados que consumen contenido público. Reciben un *Cache Hit* directo desde la RAM (NGINX o Varnish).
* **Tráfico Autenticado (y Dinámico):** Editores en `/wp-admin`, usuarios con sesión iniciada, o clientes con artículos en un carrito de WooCommerce.

La frontera entre estos dos mundos se gestiona a través de **Cookies**. Cuando un usuario se loguea o realiza una acción dinámica, WordPress emite cookies específicas (ej. `wordpress_logged_in_*` o `woocommerce_items_in_cart`). El servidor web lee estas cabeceras en milisegundos y aplica un *Bypass*, enviando la petición directamente a PHP-FPM.

**El problema de WooCommerce y la fragmentación dinámica:**
Si cacheamos la página de un producto, ¿cómo mostramos el contador del carrito en el menú superior (ej. "🛒 2 ítems") si la página es estática?
La solución moderna no es eludir la caché de la página entera, sino usar **Fragmentación asíncrona**. La página completa se sirve desde la caché, y posteriormente, un script de JavaScript realiza una petición AJAX en segundo plano (`/wc-ajax=get_refreshed_fragments`) para actualizar únicamente el número del carrito en el DOM del navegador.

---

### 2. Estrategias de Invalidación (Purge)

Cuando un editor actualiza un artículo o se publica un nuevo comentario, la versión estática de esa página queda obsoleta. Aquí es donde la estrategia de invalidación define la escalabilidad del clúster.

#### A. El Anti-Patrón: Flush Total (Vaciado completo)

Muchos plugins de optimización básicos, ante cualquier cambio en el sitio, ejecutan un vaciado completo de la zona de caché.

* **El impacto:** Si tienes 10,000 URLs cacheadas y vacías la caché, la siguiente ola de visitantes generará 10,000 peticiones simultáneas a PHP y MySQL. Esto provoca picos masivos de CPU y, a menudo, la caída del servicio.

#### B. La Solución SysAdmin: Purge Selectivo (Smart Purge)

Un entorno de Alta Disponibilidad utiliza invalidación quirúrgica. Si actualizas el post con ID 50, el servidor web solo debe eliminar la URL de ese post, la portada (donde aparece el extracto) y la categoría a la que pertenece. El 99% restante del sitio permanece intacto en la caché.

Para lograr esto, se necesita un puente entre los eventos nativos de WordPress (*Hooks*) y el servidor web:

```text
[ Editor de WordPress ] ──(Actualiza Post ID: 50)──▶ [ WP Core ]
                                                         │
                                               (Dispara 'save_post')
                                                         │
                                                         ▼
[ Plugin de Purge ] ◀──(Intercepta el evento y calcula URLs afectadas)
 (Ej. Nginx Helper)                                      │
                                                         ▼
    1. HTTP PURGE midominio.com/mi-post/
    2. HTTP PURGE midominio.com/categoria/noticias/
    3. HTTP PURGE midominio.com/
                                                         │
                                                         ▼
[ Servidor Web (NGINX/Varnish) ] ──(Elimina solo esas 3 claves de la RAM)

```

* **En NGINX:** Requiere compilar el módulo de terceros `ngx_cache_purge` (o usar versiones que lo incluyan, como *Nginx-Extras* u *OpenResty*). NGINX escuchará el método HTTP `PURGE` y borrará el archivo físico de la memoria.
* **En Varnish:** El VCL permite dos métodos poderosos:
* `PURGE`: Elimina una URL exacta.
* `BAN`: Utiliza expresiones regulares. Por ejemplo, puedes instruir a Varnish para que invalide todas las URLs que contengan imágenes `.jpg` antiguas con un solo comando (`ban req.url ~ "\.jpg$"`), lo cual es infinitamente más eficiente.

---

### 3. Mitigación del "Cache Stampede" (Estampida de Caché)

Incluso con un *Purge Selectivo*, existe un riesgo crítico de concurrencia. Supongamos que purgamos la portada de un portal de noticias. En el milisegundo exacto en que la caché se borra, 500 visitantes solicitan la portada simultáneamente.

Como no hay caché (*Miss*), NGINX pasará las 500 peticiones a PHP-FPM al mismo tiempo para que genere la portada. Esto colapsará los *workers* de PHP inmediatamente. Este fenómeno se conoce como **Cache Stampede** (Estampida de caché).

La arquitectura moderna resuelve esto con dos directivas a nivel de servidor web, sin tocar una sola línea de código en WordPress:

**1. Bloqueo de concurrencia (Cache Lock):**
En NGINX, la directiva `fastcgi_cache_lock on;` soluciona la estampida de raíz. Cuando llegan esas 500 peticiones a una URL purgada, NGINX solo permite que **una** (1) petición pase a PHP-FPM. Pone a las otras 499 en cola de espera. Una vez que PHP devuelve el HTML y NGINX lo guarda en la caché, libera a los 499 usuarios entregándoles instantáneamente la copia recién generada.

**2. Modo de Gracia (Stale Cache / Grace Mode):**
A veces, PHP tarda demasiado o el servidor de base de datos está bajo estrés. La directiva `fastcgi_cache_use_stale updating error timeout;` en NGINX (o `beresp.grace` en Varnish) le dice al servidor:
*"Si la caché expiró o fue purgada, pero PHP está tardando en responder o devuelve un error 500, no le muestres una página de error al usuario. Sírvele la versión 'obsoleta' (stale) de la caché temporalmente mientras el backend se recupera"*.

Implementar estas estrategias de invalidación y mitigación de estampidas es el último paso que transforma un servidor rápido en una infraestructura verdaderamente resiliente y de alta disponibilidad.
