La optimización técnica es inútil si no es medible ni sostenible. En este capítulo, transformamos la infraestructura de un "agujero negro" de datos a un ecosistema de alta visibilidad. Aprenderás a implementar **Prometheus y Grafana** para el control de recursos, y a utilizar herramientas de **APM** y **Profiling** para diseccionar el rendimiento de PHP y plugins línea por línea. Finalmente, exploraremos el arsenal táctico del SysAdmin —desde **GoAccess** hasta **strace**— para diagnosticar y mitigar cuellos de botella en tiempo real. Aquí es donde la intuición se convierte en ciencia, garantizando que tu WordPress no solo sea rápido, sino también resiliente y predecible bajo cualquier carga.

## **9.1 Monitoreo de infraestructura: Prometheus y Grafana para visualizar consumo de CPU, RAM, I/O y métricas de NGINX/Redis**

Hasta este punto, hemos optimizado cada capa de la pila del servidor, desde el Kernel de Linux hasta el sistema de caché. Sin embargo, una arquitectura de alta disponibilidad es ciega sin un sistema de monitoreo robusto. Mientras que las herramientas de línea de comandos (que veremos en la sección 9.5) son excelentes para apagar incendios en tiempo real, carecen de memoria histórica.

Para entender cómo se comporta nuestra infraestructura de WordPress durante un pico de tráfico, detectar fugas de memoria a lo largo del tiempo o justificar un escalado de recursos, necesitamos recolectar métricas continuas. Aquí es donde entra en juego el estándar de la industria *cloud-native*: la dupla **Prometheus** y **Grafana**.

---

### **La Arquitectura: El modelo "Pull" y los Exporters**

A diferencia de los sistemas de monitoreo tradicionales que "empujan" (push) datos hacia un servidor central, Prometheus utiliza un modelo "Pull". Prometheus raspa (*scrapes*) periódicamente endpoints HTTP expuestos en tus servidores para recolectar métricas en un formato de series temporales.

Para que los servicios (Linux, NGINX, Redis) hablen el idioma de Prometheus, utilizamos piezas de software ligeras llamadas **Exporters**.

```text
[ Nodo Web / Base de Datos ]
  │
  ├── OS / Kernel ──────> Node Exporter   :9100
  ├── NGINX       ──────> NGINX Exporter  :9113
  └── Redis       ──────> Redis Exporter  :9121
                               │
                               │ HTTP GET /metrics (ej. cada 15s)
                               ▼
                        [ Prometheus ] (Almacenamiento Time-Series)
                               │
                               │ PromQL (Prometheus Query Language)
                               ▼
                         [ Grafana ]   (Dashboards y Alertas visuales)

```

---

### **1. Node Exporter: Radiografía del Servidor Físico/Virtual**

El **Node Exporter** se instala a nivel de sistema operativo y expone métricas de hardware y del kernel de Linux. En un entorno de WordPress, las métricas críticas a visualizar en Grafana son:

* **Uso de CPU (Load Average y % por core):** Un pico sostenido de CPU sin un aumento correlativo de tráfico web suele indicar un problema crónico de PHP-FPM o consultas de MySQL ineficientes (capítulo 4).
* **Consumo de RAM y Swap:** WordPress es intensivo en memoria. Monitorear la memoria disponible te permite verificar si el ajuste de `pm.max_children` configurado en el capítulo 3 fue el adecuado. Si el servidor empieza a usar memoria Swap, el rendimiento I/O colapsará.
* **Disk I/O y latencia de lectura/escritura:** Crucial si tu base de datos coexiste en el mismo servidor. Un alto valor de *I/O Wait* indica que la CPU está ociosa esperando que el disco termine de leer o escribir datos.

### **2. NGINX Exporter: Monitoreando la Puerta de Enlace**

Para que Prometheus pueda leer datos de NGINX, primero debemos habilitar el módulo `stub_status` en la configuración de nuestro servidor web, usualmente en un bloque accesible solo localmente:

```nginx
server {
    listen 127.0.0.1:80;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}

```

El **NGINX Prometheus Exporter** leerá esta ruta y la traducirá. En Grafana, debes enfocarte en:

* **Active Connections:** Cuántas conexiones TCP están abiertas. Si este número se acerca al límite de `worker_connections` que definimos en el capítulo 2, el servidor comenzará a rechazar visitantes.
* **Reading / Writing / Waiting:** * *Reading:* NGINX leyendo las cabeceras del cliente.
* *Writing:* NGINX enviando datos de vuelta al cliente.
* *Waiting:* Conexiones *Keep-Alive* abiertas esperando nuevas peticiones. Un número muy alto aquí puede requerir un ajuste en el tiempo de *keepalive_timeout*.

### **3. Redis Exporter: Salud del Object Cache**

Dado que en el capítulo 5 establecimos a Redis como el motor principal para el *Object Cache* de WordPress, monitorear su estado es vital para evitar caídas de rendimiento. Si Redis falla o se llena, las consultas irán directamente a MySQL, colapsando el sitio.

El **Redis Exporter** nos permite visualizar las siguientes métricas clave en Grafana:

* **Uso de Memoria (`redis_memory_used_bytes`):** Te avisa con anticipación si te estás acercando al límite de RAM asignado (`maxmemory`).
* **Tasa de Aciertos (*Cache Hit Ratio*):** Es la métrica reina. Se calcula comparando `keyspace_hits` contra `keyspace_misses`. En un WordPress bien optimizado, este ratio debería superar el 85% - 90%. Si cae drásticamente, significa que la caché se está purgando con demasiada frecuencia o las claves están expirando muy rápido.
* **Desalojos (*Evictions*):** Indica cuántas claves se eliminaron para hacer espacio a nuevas. Si hay *evictions* constantes, necesitas aumentar la memoria de Redis en `redis.conf`.

---

### **Configuración del Scrapeo en Prometheus**

Para unir todas estas piezas, el archivo de configuración central de Prometheus (`prometheus.yml`) debe instruirse para buscar estos puertos. Un ejemplo clásico en la infraestructura de WordPress se vería así:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node_wp_produccion'
    static_configs:
      - targets: ['10.0.0.5:9100']

  - job_name: 'nginx_wp'
    static_configs:
      - targets: ['10.0.0.5:9113']

  - job_name: 'redis_object_cache'
    static_configs:
      - targets: ['10.0.0.5:9121']

```

---

### **Grafana: El Panel de Control Unificado**

Una vez que Prometheus está recolectando los datos, Grafana actúa como el lienzo. En lugar de revisar *logs* fragmentados, Grafana te permite correlacionar eventos visualmente.

Por ejemplo: al crear un *dashboard* puedes superponer el gráfico de "Peticiones procesadas por NGINX" con el de "Uso de CPU del Servidor". Si observas un pico masivo de CPU que **no** está acompañado por un pico de peticiones en NGINX, la gráfica te está revelando un problema interno (quizás una tarea programada pesada a nivel de sistema operativo o un *backup* corriendo), y no un ataque DDoS o un aumento de visitantes.

Existen cientos de *dashboards* preconfigurados en la comunidad de Grafana (buscados por ID en grafana.com) que puedes importar con un solo clic para Node Exporter (ID: 1860) o NGINX, dándote visibilidad de grado empresarial en cuestión de minutos. Con la infraestructura cubierta, el siguiente paso es entender qué está sucediendo a nivel de la aplicación y el código PHP, lo cual abordaremos en la sección de Application Performance Monitoring (APM).

## **9.2 Application Performance Monitoring (APM): Integración de New Relic o Datadog para encontrar plugins lentos y transacciones pesadas**

Si en la sección anterior establecimos que Prometheus y Grafana actúan como el electrocardiograma de tu infraestructura física, las herramientas de **Application Performance Monitoring (APM)** son la resonancia magnética de tu código.

Prometheus te dirá que el proceso `php-fpm` está consumiendo el 100% de la CPU. Sin embargo, no te dirá *por qué*. Un APM como New Relic o Datadog te dirá exactamente que el archivo `woocommerce/includes/wc-cart-functions.php` ejecutó un *hook* que disparó 450 consultas a la base de datos y tardó 3.2 segundos en completarse. Para la optimización de WordPress en alta disponibilidad, esta visibilidad es innegociable.

---

### **La Arquitectura de un APM en PHP**

A diferencia del monitoreo de infraestructura que lee métricas desde afuera, un APM se inyecta directamente en el entorno de ejecución de PHP. Tanto New Relic como Datadog utilizan una arquitectura de dos piezas en el servidor:

```text
[ Hilo de ejecución de PHP-FPM / WordPress ]
         │
         ├── 1. Extensión PHP (Agente APM): Instrumenta el código de 
         │      forma transparente, midiendo el tiempo de cada función.
         ▼
[ Demonio Local (newrelic-daemon / datadog-agent) ]
         │
         ├── 2. Recolecta las trazas en memoria de forma asíncrona 
         │      para no bloquear la respuesta web de NGINX.
         ▼
[ Nube SaaS (New Relic / Datadog) ] <--- Análisis, Dashboards e IA

```

Esta separación es vital: el agente de PHP solo recopila datos en bruto y los pasa rápidamente al demonio local mediante sockets UNIX o puertos locales. El demonio es el encargado de empaquetar y enviar esos datos a través de Internet, evitando que un problema de red penalice el tiempo de carga (TTFB) de WordPress.

---

### **¿Qué buscar en el APM? Los Cuellos de Botella de WordPress**

Una vez integrado, el APM te inundará de datos. Como SysAdmin o ingeniero de rendimiento, debes enfocarte en cuatro áreas críticas específicas del ecosistema WordPress:

**1. Trazas de Transacciones Lentas (*Slow Traces*)**
Una "transacción" en WordPress suele ser una petición HTTP. Cuando una transacción supera tu umbral aceptable (por ejemplo, más de 1000ms), el APM guarda una traza detallada. Aquí descubrirás el temido problema de las consultas N+1, donde un plugin o tema ejecuta una consulta SQL dentro de un bucle `foreach` en lugar de hacer un `JOIN` optimizado.

**2. Servicios Externos (*External Services*)**
Este es el asesino silencioso del rendimiento en WordPress. Muchos plugins hacen llamadas cURL síncronas a servidores externos (para verificar licencias, sincronizar con CRMs, o conectar con pasarelas de pago) durante la carga de la página. Si la API de Mailchimp o PayPal tarda 5 segundos en responder, tu servidor PHP se quedará bloqueado 5 segundos. El APM categoriza esto bajo "External Services", permitiéndote identificar qué plugin está externalizando la latencia hacia tu servidor.

**3. Desglose de Hooks y Plugins**
Plataformas como New Relic detectan automáticamente que la aplicación es un WordPress y ofrecen una pestaña dedicada. Esta vista agrupa el tiempo de ejecución no por archivos PHP, sino por:

* **Plugins:** Te muestra el porcentaje total del tiempo de ejecución que consume, por ejemplo, *Elementor* vs. *Yoast SEO*.
* **Hooks (Actions y Filters):** Te permite ver si un `add_action('init', ...)` está ralentizando todo el sitio desde el arranque, o si un filtro en `the_content` está usando expresiones regulares pesadas.

**4. Tiempo en Base de Datos vs. Redis**
El APM separará visualmente cuánto tiempo pasó PHP ejecutando código, cuánto tiempo esperó a MySQL (o Aurora/Galera) y cuánto tiempo esperó a Redis. Si el tiempo de Redis es alto, tienes un problema de latencia de red en tu capa de caché (Capítulo 5). Si el tiempo de MySQL es alto, necesitas auditar tus índices o escalar tu base de datos (Capítulo 7).

---

### **Implementación y Precauciones: El *Overhead* del Observador**

Instalar un APM no es gratuito; observar un sistema irremediablemente altera su rendimiento. Activar la instrumentación profunda de PHP añade un *overhead* (sobrecarga) que puede oscilar entre un 2% y un 10% de consumo adicional de CPU y memoria, dependiendo de la configuración.

Para mitigar esto en entornos de producción de alto tráfico, debes aplicar las siguientes estrategias en la configuración del agente (ej. `newrelic.ini` o la configuración de entorno de Datadog):

* **Ajuste del Apdex (Application Performance Index):** Define correctamente el umbral "T" (satisfactorio). Si estableces un objetivo de 300ms, el APM solo guardará trazas detalladas de las peticiones que tarden significativamente más que eso, ignorando el ruido del tráfico rápido.
* **Sampling (Muestreo de Trazas):** En lugar de registrar el 100% de las transacciones (lo cual saturaría el demonio y tu cuota de facturación SaaS), configura una tasa de muestreo. Capturar el 10% o incluso el 1% del tráfico en sitios que reciben millones de visitas mensuales es estadísticamente suficiente para detectar tendencias y cuellos de botella.
* **Ignorar Transacciones Irrelevantes:** Usa la API del APM en tu código (ej. `newrelic_ignore_transaction()`) o reglas en el servidor para evitar trazar peticiones estáticas que hayan esquivado la caché por error, o ataques repetitivos a `xmlrpc.php` (antes de que Fail2ban los bloquee, como veremos en el Capítulo 10).

El APM te dará el diagnóstico exacto a nivel arquitectónico, pero a veces el problema es una sola función mal escrita dentro de un plugin a medida. Para desglosar el problema línea por línea en el código fuente, recurriremos a las herramientas de *Profiling* en la sección 9.4.

## **9.3 Análisis de tráfico y *Access Logs*: Uso de GoAccess o ELK Stack (Elasticsearch, Logstash, Kibana)**

Hasta ahora hemos cubierto el estado del hardware (Prometheus/Grafana) y el rendimiento del código (APM). Sin embargo, hay una pregunta fundamental que ni el hardware ni el APM pueden responder con el nivel de detalle necesario: *¿Quién está visitando qué, con qué frecuencia, y qué respuesta exacta les está dando el servidor web?*

Los *Access Logs* (registros de acceso) de NGINX son la fuente de la verdad absoluta. Cada petición, ya sea de un visitante real, un bot de Google o un ataque de denegación de servicio (DDoS), queda registrada aquí. El problema en entornos de alto tráfico es el volumen: un archivo `access.log` puede crecer gigabytes por día, haciendo que buscar patrones con `grep` o `awk` sea una tarea titánica y poco escalable.

Para extraer inteligencia procesable de estos registros, tenemos dos caminos principales: la agilidad local de **GoAccess** y la potencia distribuida del **ELK Stack**.

---

### **1. Nivel Táctico: GoAccess para análisis en tiempo real**

**GoAccess** es un analizador de logs de código abierto ultrarrápido que se ejecuta en la terminal. Es la herramienta perfecta para el SysAdmin que necesita respuestas inmediatas durante una emergencia, como un pico súbito de tráfico o un ataque de fuerza bruta.

No requiere bases de datos ni configuraciones complejas. Simplemente lee el log de NGINX y genera un *dashboard* interactivo en la propia consola (o lo exporta a un archivo HTML en tiempo real).

**Casos de uso en WordPress:**

* **Identificar ataques en curso:** Si el servidor se ralentiza repentinamente, ejecutar `goaccess /var/log/nginx/access.log -c` te mostrará en segundos qué dirección IP está acribillando tu archivo `xmlrpc.php` o `wp-login.php`.
* **Auditoría de errores 404:** Un alto número de errores 404 estresa a WordPress porque estas peticiones suelen esquivar la caché y obligar a PHP a renderizar la página de "No encontrado". GoAccess te muestra exactamente qué URLs rotas están consumiendo recursos.
* **Análisis de *User-Agents*:** Permite detectar rápidamente bots maliciosos o *crawlers* agresivos (como AhrefsBot o SemrushBot) que están agotando el *pool* de PHP-FPM, para luego bloquearlos a nivel de servidor.

---

### **2. Nivel Estratégico: ELK Stack para Alta Disponibilidad**

Cuando tu infraestructura escala al modelo de Alta Disponibilidad (Capítulo 7) con múltiples nodos web (por ejemplo, tres servidores NGINX detrás de un balanceador de carga), GoAccess deja de ser suficiente. No puedes conectarte por SSH a tres servidores distintos para cruzar datos manualmente.

Necesitas centralizar los logs. Aquí es donde entra el **ELK Stack** (o su variante moderna con Filebeat/Vector):

* **E**lasticsearch: El motor de búsqueda y almacenamiento de datos no relacional.
* **L**ogstash (o Filebeat): El recolector que lee los logs en cada nodo NGINX, los parsea (separa IP, URL, Código de Estado, etc.) y los envía al motor.
* **K**ibana: La interfaz visual para crear *dashboards* a partir de los datos de Elasticsearch.

**Arquitectura de Logs Centralizados:**

```text
[ Nodo NGINX Web 1 ] ---> (Filebeat) --┐
                                       │
[ Nodo NGINX Web 2 ] ---> (Filebeat) --┼---> [ Logstash / Elasticsearch ] ---> [ Kibana ]
                                       │       (Almacenamiento e Índice)       (Análisis visual)
[ Nodo NGINX Web 3 ] ---> (Filebeat) --┘

```

### **Optimizando el Log de NGINX para WordPress y ELK**

Para que ELK sea realmente útil, el formato de log por defecto de NGINX ("combined") no es suficiente. Debemos enriquecerlo. En el archivo `nginx.conf`, es crucial crear un `log_format` personalizado que incluya métricas vitales de rendimiento, especialmente el estado de la caché y el tiempo de respuesta:

```nginx
log_format wp_optimizado '$remote_addr - $remote_user [$time_local] '
                         '"$request" $status $body_bytes_sent '
                         '"$http_referer" "$http_user_agent" '
                         'rt=$request_time uct="$upstream_connect_time" uht="$upstream_header_time" urt="$upstream_response_time" '
                         'cache="$upstream_cache_status"';

```

Al ingerir este formato en ELK, Kibana te permitirá construir paneles de control (*dashboards*) extremadamente valiosos para un ingeniero de rendimiento:

**1. El Ratio de Caché (Cache HIT/MISS) en tiempo real:**
Al registrar `$upstream_cache_status`, puedes ver en Kibana un gráfico circular exacto de cuántas peticiones están siendo servidas por la caché de FastCGI (HIT) y cuántas están golpeando a PHP (MISS/BYPASS). Si el ratio de HIT cae por debajo del 80% después de un despliegue, sabrás inmediatamente que una actualización rompió las reglas de caché.

**2. Latencia del Upstream (PHP-FPM):**
Las variables `$upstream_response_time` te mostrarán cuánto tiempo tarda PHP en procesar las peticiones no cacheadas. Puedes configurar alertas en Kibana si el percentil 95 (P95) del tiempo de respuesta supera los 2 segundos, indicando un embotellamiento en la base de datos o en los *workers* de PHP.

**3. Mapa de calor de rutas vulnerables:**
Puedes crear visualizaciones que filtren específicamente las peticiones POST hacia `/wp-admin/admin-ajax.php`. Muchos plugins abusan de `admin-ajax.php` para funcionalidades en el *frontend*, lo que esquiva la caché de página y hunde el rendimiento. Identificar estos picos te permitirá reemplazar esas llamadas con la REST API de WP o técnicas de *lazy loading*.

En resumen: mientras GoAccess es tu navaja suiza para el combate cuerpo a cuerpo en un solo servidor, ELK es tu centro de comando. Ambos te proporcionarán la visibilidad necesaria para tomar decisiones informadas sobre dónde implementar reglas de bloqueo (Fail2ban, WAF) o dónde es imperativo refactorizar el código, lo cual nos lleva a la siguiente fase: el *profiling* directo con Xdebug y Blackfire.

## **9.4 *Profiling* de PHP: Uso de Xdebug y Blackfire.io para analizar cuellos de botella a nivel de código**

En la sección 9.2 vimos cómo las herramientas APM (como New Relic) actúan como un radar, señalando qué transacciones o plugins son lentos a nivel macro. Sin embargo, cuando el APM te dice que el archivo `functions.php` de tu tema o un controlador de WooCommerce está consumiendo 2 segundos de tiempo de ejecución, necesitas un nivel de granularidad mucho mayor para corregirlo.

Aquí es donde el APM se detiene y entra el **Profiling** (perfilado de código). El *profiling* es el equivalente a poner el código de WordPress bajo un microscopio: rastrea *cada* llamada a función, cuenta cuántas veces se ejecutó, cuánta memoria consumió y cuánto tiempo exacto de CPU requirió, permitiéndote encontrar la línea de código exacta que está causando el desastre.

Existen dos estándares en la industria PHP para esta tarea: el enfoque tradicional y de desarrollo con **Xdebug**, y el enfoque moderno y apto para producción con **Blackfire.io**.

---

### **1. Xdebug: El estándar de desarrollo local**

Xdebug es una extensión de PHP esencial para cualquier desarrollador de WordPress. Aunque es famoso por permitir la depuración paso a paso (*step debugging*), su modo de perfilado es una de sus herramientas más potentes.

**Cómo funciona:**
Cuando habilitas el perfilado, Xdebug monitorea la ejecución del script PHP desde el arranque de WordPress hasta que se envía la respuesta. Luego, vuelca todos estos datos en un archivo de texto pesado con formato *Cachegrind*.

```ini
; Configuración típica en php.ini para profiling local
zend_extension=xdebug.so
xdebug.mode=profile
xdebug.output_dir=/tmp/profiling
xdebug.profiler_output_name=cachegrind.out.%R

```

**Análisis de los resultados:**
Los archivos `cachegrind` son ilegibles a simple vista. Debes abrirlos con herramientas de visualización como **QCacheGrind** (Linux/Windows), **Webgrind** o directamente integrados en IDEs como **PhpStorm**.

Al abrir el archivo, verás tablas ordenadas por:

* **Self Time:** El tiempo invertido *exclusivamente* dentro de esa función (ignorando las funciones a las que llama).
* **Inclusive Time:** El tiempo total invertido en esa función y en todas las funciones anidadas que ejecutó.
* **Call Count:** Cuántas veces se invocó la función.

> **⚠️ REGLA DE ORO DEL SYSADMIN:** **Jamás, bajo ninguna circunstancia, actives Xdebug en un entorno de producción.** La sobrecarga de rastrear cada función reduce el rendimiento de PHP entre un 50% y un 80%, y llenará el disco duro de tu servidor con archivos temporales masivos en cuestión de minutos.

---

### **2. Blackfire.io: Profiling de grado de producción**

Dado que Xdebug está relegado a entornos locales o de *staging*, la industria necesitaba una forma de perfilar código en producción con datos reales, sin tumbar el servidor. Aquí brilla **Blackfire.io**.

A diferencia del overhead constante de Xdebug, Blackfire funciona "bajo demanda". Consiste en un módulo de PHP ligero (Probe) y un demonio a nivel de servidor (Agent). El módulo permanece inactivo (con un impacto de rendimiento del 0%) hasta que tú, como administrador, disparas una petición de *profiling* mediante una extensión del navegador o la terminal (`blackfire curl https://tusitio.com`).

**El "Call Graph" (Gráfico de llamadas)**
La mayor ventaja de Blackfire es su interfaz web y la generación automática de *Call Graphs*. Blackfire traza visualmente el camino que recorrió WordPress y resalta en rojo sangre el **Camino Crítico** (*Critical Path*), es decir, la secuencia de funciones que más contribuyó al tiempo total de carga.

```text
[ Visualización simplificada de un Call Graph en WP ]

  wp-settings.php (100% time)
       │
       ▼
  do_action('init') (80% time)
       │
       ▼
  [Plugin_Malo]->cargar_datos() <--- [NODO ROJO: 75% time, 1500 calls]
       │
       ▼
  wpdb->get_results() (Consumiendo I/O innecesario)

```

---

### **Casos de Uso: Cazando Cuellos de Botella en WordPress**

Ya sea que uses Xdebug o Blackfire, al perfilar WordPress buscarás patrones específicos de ineficiencia arquitectónica:

**1. El problema del N+1 encubierto en PHP:**
El *profiling* revelará funciones que tienen un *Call Count* (recuento de llamadas) anormalmente alto. Por ejemplo, un bucle en el tema que llama a `get_post_meta()` cientos de veces. Si bien la base de datos o el *Object Cache* (Capítulo 5) pueden ser rápidos, la latencia de procesar 500 llamadas a función en PHP suma una fracción de segundo que destruye el tiempo de respuesta general.

**2. Código redundante sin "Memoization":**
A menudo verás una función pesada que calcula precios, formatea fechas o procesa expresiones regulares y que se llama varias veces por página entregando el mismo resultado. El *profiling* te indica exactamente dónde debes implementar un patrón de *memoization* (guardar el resultado en una variable estática local de PHP) o usar la Transients API de WordPress (`get_transient()`).

**3. Impacto de Hooks y Eventos:**
WordPress está basado en eventos. Un *profiling* de Blackfire te desglosará exactamente qué funciones están enganchadas a `wp_loaded`, `template_redirect` o `wp_footer`, y cuánto "peaje" cobra cada plugin por existir en ese *hook*. Si un plugin de chat en vivo está consumiendo 200ms en el evento `init` solo para verificar si el usuario es administrador, el *profiling* te dará la evidencia irrefutable para reemplazar o reprogramar ese comportamiento.

Una vez que has localizado y neutralizado la línea de código ofensiva, has completado el ciclo de optimización reactiva. El siguiente paso en la gestión de infraestructura de alto rendimiento no es buscar lentitud, sino prepararse para lo peor: proteger los recursos del servidor frente a tráfico malicioso y emergencias en tiempo real (Sección 9.5 y Capítulo 10).

## **9.5 Herramientas de SysAdmin para emergencias: `htop`, `strace`, `tcpdump` y análisis de estados de PHP-FPM**

Los sistemas de monitoreo (Prometheus, APM, ELK) son brillantes para analizar tendencias, configurar alertas y entender el "por qué" después de que ocurrió un incidente. Sin embargo, cuando recibes una alerta de que tu clúster de producción está caído, el Load Average está por las nubes y los usuarios ven errores 502 Bad Gateway, no tienes tiempo de armar un *dashboard* en Grafana.

Necesitas entrar por SSH al servidor y operar a corazón abierto. Esta sección cubre la caja de herramientas táctica de un SysAdmin para diagnosticar y mitigar emergencias en tiempo real dentro de un entorno WordPress.

---

### **1. `htop`: La vista táctica del campo de batalla**

Mientras que `top` viene instalado por defecto en Linux, `htop` es su evolución natural y obligatoria. Ofrece un código de colores vital y la capacidad de interactuar con los procesos.

**En una emergencia de WordPress, en `htop` debes revisar:**

* **Las barras de CPU y Memoria:** Si la barra de memoria (RAM) está llena y la barra de SWAP (intercambio) empieza a llenarse, el servidor colapsará por latencia de disco. Si esto ocurre, el "asesino" (*OOM Killer* del Kernel) empezará a matar procesos de MySQL o NGINX aleatoriamente.
* **El Load Average:** Tres números arriba a la derecha (1 min, 5 min, 15 min). Si tu servidor tiene 8 núcleos y el Load Average de 1 minuto es `35.00`, tienes un embotellamiento masivo.
* **Vista de Árbol (Tecla `F5`):** Fundamental para WordPress. Agrupa los procesos hijo (`php-fpm`) bajo su proceso padre. Te permite ver si un solo *pool* de FPM está acaparando todo el sistema.

**Acción rápida:** Si ves un proceso de PHP-FPM consumiendo el 100% de CPU durante demasiado tiempo, puedes seleccionarlo y presionar `F9` (Kill) para terminarlo y liberar el núcleo, permitiendo que WordPress siga sirviendo otras peticiones.

---

### **2. Análisis de estados de PHP-FPM: Radiografía del Pool**

Cuando NGINX arroja errores `502 Bad Gateway` o `504 Gateway Timeout`, el culpable casi siempre es PHP-FPM. O bien todos los *workers* están ocupados, o están bloqueados esperando algo.

Para emergencias, debes tener habilitada la página de estado de FPM. En el archivo del *pool* (ej. `www.conf`, visto en el Capítulo 3), asegúrate de tener:
`pm.status_path = /status`

En pleno incidente, puedes consultar este estado desde la terminal sin necesidad de abrir un navegador web, usando `cgi-fcgi` o a través de un bloque interno de NGINX con `curl http://127.0.0.1/status`.

```text
[ Salida típica de emergencia de PHP-FPM Status ]

pool:                 www
process manager:      dynamic
start time:           15/Oct/2023:10:00:00 +0000
start since:          3600
accepted conn:        45000
listen queue:         152     <-- ¡Peligro! Peticiones en espera.
max listen queue:     200
listen queue len:     511
idle processes:       0       <-- Ningún worker libre.
active processes:     50      <-- Todos ocupados (Límite pm.max_children).
total processes:      50
max active processes: 50
max children reached: 12      <-- Veces que WP se quedó sin workers.

```

**Diagnóstico:** Si `listen queue` es mayor a 0 y `idle processes` es 0, significa que NGINX está enviando peticiones de WordPress a PHP, pero no hay "cajeros" disponibles para atenderlas. La solución rápida es reiniciar el servicio (`systemctl restart php8.1-fpm`) para vaciar la cola, y luego investigar qué atascó a los *workers*.

---

### **3. `strace`: Rayos X a nivel de sistema operativo**

Supongamos que en `htop` ves un proceso `php-fpm` específico (ej. PID 14502) atascado al 100% de CPU o colgado indefinidamente. El APM no te responde porque la transacción aún no termina. ¿Qué está haciendo exactamente ese proceso en ese milisegundo?

`strace` intercepta y registra las llamadas al sistema (*system calls*) que hace un proceso.

**Comando de emergencia:**

```bash
strace -p 14502 -s 256 -T -e trace=network,file

```

* `-p`: Se adjunta al PID problemático.
* `-s 256`: Aumenta el tamaño de la cadena leída (para ver URLs completas o fragmentos SQL).
* `-T`: Muestra el tiempo gastado en cada llamada.
* `-e trace=...`: Filtra solo operaciones de red y archivos (lo que más afecta a WP).

**¿Qué verás?**
Si el proceso está esperando respuesta de una API externa (ej. un plugin conectando a la API de Mailchimp caída), verás un `poll()` o `recvfrom()` atascado esperando en un *socket* de red. Si el problema es la base de datos, verás la consulta SQL literal enviándose al descriptor de archivo de MySQL y esperando. Esto te da el veredicto instantáneo para desactivar el plugin culpable.

---

### **4. `tcpdump`: El analizador de red de bajo nivel**

A veces el servidor tiene la CPU en 5% y PHP-FPM está vacío, pero el sitio no carga o responde con suma lentitud. El problema podría ser de red: un micro-corte con la base de datos externa, un ataque de denegación de servicio (DDoS) que no genera carga de CPU pero satura el ancho de banda, o un bucle de redirecciones a nivel de proxy.

`tcpdump` captura el tráfico de red en crudo.

**Escenario 1: ¿Está llegando el tráfico web real desde Cloudflare/Load Balancer?**

```bash
tcpdump -i eth0 -n port 80 or port 443

```

Si la pantalla se mueve excesivamente rápido con miles de IPs repitiendo los mismos paquetes `SYN`, estás bajo un ataque SYN Flood a nivel de red.

**Escenario 2: ¿Hay latencia real hacia la Base de Datos dedicada?**
Si separaste tu base de datos (Capítulo 4), puedes esnifar el tráfico hacia MySQL (puerto 3306) para ver si las consultas fluyen o si hay cortes de red (*packet loss*):

```bash
tcpdump -i eth0 -n dst port 3306

```

> **Precaución:** `tcpdump` es intensivo. Nunca lo dejes corriendo indefinidamente y siempre usa filtros de puerto o IP (`port`, `host`) para no saturar tu propia terminal con ruido blanco.

---

**Cierre del Capítulo:**
Con estas cuatro herramientas bajo tu cinturón, puedes diseccionar el estado físico del servidor, el comportamiento de los *workers* de PHP, las entrañas de las llamadas del sistema y el flujo de los paquetes de red en tiempo real.

Sin embargo, estar apagando incendios con `htop` y `tcpdump` es desgastante. La mayoría de estas emergencias suelen estar originadas por tráfico malicioso, *crawlers* agresivos o intentos de fuerza bruta que agotan los recursos de PHP y MySQL. Por lo tanto, el siguiente y último paso hacia la verdadera alta disponibilidad es detener estos ataques antes de que lleguen a la aplicación, tema central del **Capítulo 10: Seguridad y su Impacto en el Rendimiento.**
