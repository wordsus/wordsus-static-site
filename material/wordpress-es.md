Aquí tienes el roadmap completo de aprendizaje sobre Optimización de WordPress, estructurado como el índice de un libro técnico avanzado. Este temario está diseñado específicamente con un enfoque de administración de sistemas (SysAdmin) e infraestructura, yendo mucho más allá de la simple instalación de plugins.

---

#### **Capítulo 1: Fundamentos de la Arquitectura de WordPress**

* **1.1** Anatomía de una petición en WordPress: Desde el navegador hasta la base de datos.
* **1.2** La pila tradicional vs. moderna: LAMP (Linux, Apache, MySQL, PHP) vs. LEMP (Linux, Nginx, MySQL, PHP).
* **1.3** El Core de WordPress, Temas y Plugins: Cómo impactan los *hooks* (Actions y Filters) en el tiempo de carga.
* **1.4** El sistema de opciones (`wp_options`) y el problema del *autoload*.
* **1.5** El archivo `wp-config.php`: Constantes vitales para el rendimiento y la depuración.

#### **Capítulo 2: Optimización del Sistema Operativo y Servidor Web**

* **2.1** Afinación del Kernel de Linux (Sysctl) para alto tráfico (TCP BBR, TCP Keepalive, max file descriptors).
* **2.2** Apache vs. NGINX: Por qué NGINX es el estándar para la optimización de WordPress.
* **2.3** Configuración avanzada de NGINX: *Worker processes*, *worker connections* y *buffers*.
* **2.4** Protocolos modernos: Implementación y ventajas de HTTP/2, HTTP/3 y QUIC.
* **2.5** Compresión a nivel de servidor: Transición de Gzip a Brotli.
* **2.6** Configuración de cabeceras de caché del navegador (*Browser Caching*) y *Expire Headers*.

#### **Capítulo 3: Tuning Avanzado de PHP y PHP-FPM**

* **3.1** Evolución de PHP: Impacto en el rendimiento desde PHP 7.4 hasta PHP 8.x (JIT Compiler).
* **3.2** Arquitectura de PHP-FPM: *Static*, *Dynamic* y *Ondemand process managers*.
* **3.3** Cálculo y configuración de `pm.max_children`, `pm.start_servers` y `pm.max_requests` para evitar fugas de memoria.
* **3.4** Implementación y optimización de Zend OPcache: Acelerando la ejecución de scripts precompilados.
* **3.5** Límites de recursos en `php.ini`: `memory_limit`, `max_execution_time` y su relación con tareas pesadas en WP.

#### **Capítulo 4: Rendimiento y Optimización de Base de Datos**

* **4.1** Elección del motor: MySQL 8.x vs. MariaDB y el uso exclusivo del motor de almacenamiento InnoDB.
* **4.2** Afinación de variables de InnoDB: `innodb_buffer_pool_size`, `innodb_log_file_size` y `innodb_flush_log_at_trx_commit`.
* **4.3** Análisis de cuellos de botella: Uso del *Slow Query Log* y la herramienta `EXPLAIN` para auditar consultas de WordPress.
* **4.4** Mantenimiento de la base de datos a nivel de servidor: Fragmentación, optimización de tablas e índices personalizados.
* **4.5** Separación de la base de datos: Configuración de un servidor de DB dedicado y reducción de latencia de red.

#### **Capítulo 5: Arquitectura de Caché Multicapa (El Core del SysAdmin)**

* **5.1** Entendiendo los tipos de caché: *Page Cache*, *Object Cache*, *Fragment Cache* y *Bytecode Cache*.
* **5.2** *Object Caching* persistente: Instalación, configuración y monitoreo de Redis vs. Memcached.
* **5.3** Configuración del drop-in `object-cache.php` para integrar Redis/Memcached con WordPress.
* **5.4** *Page Caching* a nivel de servidor (Bypass de PHP): Implementación de NGINX FastCGI Cache.
* **5.5** Caché de proxy inverso: Despliegue y configuración avanzada de Varnish Cache con VCL (Varnish Configuration Language) específico para WordPress.
* **5.6** Estrategias de invalidación de caché (Purge) y manejo del tráfico autenticado (usuarios logueados vs. visitantes anónimos).

#### **Capítulo 6: Redes de Entrega de Contenido (CDN) y Edge Computing**

* **6.1** CDN Push vs. CDN Pull: Descarga de *assets* estáticos (imágenes, CSS, JS).
* **6.2** Integración a nivel de DNS y red proxy: Cloudflare de extremo a extremo.
* **6.3** *Edge Caching*: Caché de HTML en el borde usando Cloudflare APO (Automatic Platform Optimization) o Fastly.
* **6.4** *Edge Workers*: Uso de Cloudflare Workers para manipulaciones de cabeceras y redirecciones sin tocar el servidor de origen.

#### **Capítulo 7: Escalabilidad y Alta Disponibilidad (High Availability - HA)**

* **7.1** Concepto de "Stateless WordPress": Separación de archivos, base de datos y sesiones.
* **7.2** Balanceo de carga: Configuración de HAProxy o AWS ALB para distribuir tráfico entre múltiples nodos web.
* **7.3** Gestión de archivos multimedia (`wp-content/uploads`): Sistemas de archivos distribuidos (NFS, GlusterFS) vs. *Offloading* a Object Storage (Amazon S3, Google Cloud Storage, MinIO).
* **7.4** Escalado de la base de datos: Replicación Master-Slave y clusters de alta disponibilidad (Galera Cluster / Amazon Aurora).
* **7.5** Sesiones distribuidas: Almacenamiento de sesiones de PHP en un cluster de Redis.

#### **Capítulo 8: Automatización, Despliegue y Contenedores**

* **8.1** WP-CLI (WordPress Command Line Interface): Gestión de plugins, temas, regeneración de caché y operaciones masivas desde la terminal.
* **8.2** Infraestructura como Código (IaC): Provisionamiento de entornos optimizados para WP con Ansible y Terraform.
* **8.3** Dockerización de WordPress: Creación de imágenes ligeras (Alpine) y gestión de persistencia con volúmenes.
* **8.4** Orquestación con Kubernetes: Helm charts para WordPress, *Auto-scaling groups* y manejo de *Secrets*.
* **8.5** Pipelines CI/CD: Despliegues *Zero-Downtime* de código de temas y plugins sin afectar la caché de producción.

#### **Capítulo 9: Monitoreo, Profiling y Resolución de Problemas**

* **9.1** Monitoreo de infraestructura: Prometheus y Grafana para visualizar consumo de CPU, RAM, I/O y métricas de NGINX/Redis.
* **9.2** Application Performance Monitoring (APM): Integración de New Relic o Datadog para encontrar plugins lentos y transacciones pesadas.
* **9.3** Análisis de tráfico y *Access Logs*: Uso de GoAccess o ELK Stack (Elasticsearch, Logstash, Kibana).
* **9.4** *Profiling* de PHP: Uso de Xdebug y Blackfire.io para analizar cuellos de botella a nivel de código.
* **9.5** Herramientas de SysAdmin para emergencias: `htop`, `strace`, `tcpdump` y análisis de estados de PHP-FPM.

#### **Capítulo 10: Seguridad y su Impacto en el Rendimiento**

* **10.1** Bloqueo a nivel de servidor: Uso de Fail2ban para evitar consumo de recursos por ataques de fuerza bruta (wp-login.php, xmlrpc.php).
* **10.2** Desactivación y protección de endpoints conflictivos: XML-RPC y la REST API de WordPress.
* **10.3** *Rate Limiting*: Configuración de límites de peticiones (zonas) en NGINX para mitigar ataques DDoS a nivel de capa 7.
* **10.4** Web Application Firewall (WAF): Implementación de ModSecurity o WAF en el Edge (Cloudflare) y su penalización (o mejora) en la latencia.
* **10.5** Gestión de tareas en segundo plano: Reemplazo del `wp-cron.php` virtual por Cron Jobs reales a nivel de sistema operativo para liberar recursos en las peticiones web.

Aquí tienes el capítulo adicional sobre LiteSpeed, manteniendo el enfoque técnico y avanzado orientado a infraestructura:

---

#### **Capítulo 11: Ecosistema LiteSpeed: La Alternativa de Alto Rendimiento a NGINX**

* **11.1** Arquitectura y versiones: OpenLiteSpeed (OLS) vs. LiteSpeed Web Server Enterprise (LSWS) y la ventaja de la compatibilidad nativa con reglas de Apache (`.htaccess`).
* **11.2** El manejador de PHP de LiteSpeed (LSAPI): Diferencias arquitectónicas, gestión de procesos y consumo de memoria en comparación con PHP-FPM.
* **11.3** LiteSpeed Cache (LSCache) a nivel de servidor: Implementación y afinación del motor de caché integrado (bypass del backend) como reemplazo de Varnish o NGINX FastCGI Cache.
* **11.4** Dominando Edge Side Includes (ESI) en WordPress: Cómo cachear páginas mixtas (contenido público con fragmentos dinámicos como carritos de compra o barras de usuario logueado) sin romper el rendimiento.
* **11.5** Optimización de red nativa: Despliegue y configuración de los protocolos QUIC y HTTP/3, y gestión integrada de compresión Brotli/Gzip.
* **11.6** El Crawler de LSCache: Estrategias de precalentamiento de caché automatizado (*Cache Warmup*) desde el servidor para garantizar un *Time to First Byte* (TTFB) bajo constante tras purgas de contenido.
* **11.7** Seguridad en el Edge del servidor web: Limitación de conexiones (Connection/Request Rate Limiting) orientada a WordPress, mitigación de ataques L7 y compatibilidad nativa con ModSecurity WAF.

Aquí tienes los siguientes tres capítulos, enfocados en maximizar el rendimiento en entornos de alojamiento compartido (Shared Hosting).

Aunque en estos entornos un SysAdmin no tiene acceso *root*, el enfoque se traslada a exprimir al máximo las herramientas, límites y arquitecturas que ofrecen los paneles de control más populares del mercado.

---

#### **Capítulo 12: Optimización en cPanel: Maximizando Recursos Restringidos**

* **12.1** Limitaciones del entorno compartido y CloudLinux: Entendiendo LVE Manager y cómo evitar los límites de CPU, RAM, I/O y concurrentes (EP).
* **12.2** Gestión de PHP (MultiPHP Manager vs. Select PHP Version): Habilitación de extensiones críticas para el rendimiento (`opcache`, `imagick`, `redis`/`memcached`).
* **12.3** Sobreescritura segura de límites de recursos: Modificación de `memory_limit`, `upload_max_filesize` y `max_execution_time` a través de `.htaccess`, `php.ini` local o `.user.ini`.
* **12.4** Reemplazo del Cron Virtual: Desactivación de `wp-cron.php` y configuración de tareas programadas nativas en la interfaz de "Cron Jobs" de cPanel.
* **12.5** Optimización de Base de Datos sin consola: Uso avanzado de phpMyAdmin para limpieza masiva de *transients*, revisiones y conversión manual de tablas MyISAM a InnoDB.
* **12.6** Herramientas de caché del proveedor: Configuración de "Optimize Website" (compresión zlib/Gzip) y despliegue del LiteSpeed Web Cache Manager si el servidor opera bajo CloudLinux/LSWS.

#### **Capítulo 13: Optimización en Plesk: Gestión Avanzada y Proxy Inverso**

* **13.1** Arquitectura web de Plesk: Aprovechando el modelo híbrido de Apache con NGINX actuando como proxy inverso.
* **13.2** Configuración nativa de NGINX en Plesk: Habilitación del procesamiento de archivos estáticos directamente por NGINX para reducir la carga de Apache.
* **13.3** Caché a nivel de servidor sin plugins: Configuración de la caché de NGINX (*Microcaching*) directamente desde la pestaña de "Configuración de Apache y nginx" del dominio.
* **13.4** Tuning de PHP-FPM en Plesk: Ajustes de rendimiento dedicados para la aplicación (FPM application served by nginx) y gestión de peticiones concurrentes.
* **13.5** Dominando el WordPress Toolkit de Plesk: Auditorías de seguridad automáticas, actualizaciones inteligentes (*Smart Updates*) con testeo visual previo y gestión de *Smart Cron*.
* **13.6** Entornos de Staging y Clonación: Cómo realizar pruebas de rendimiento y estrés en entornos clonados mediante Plesk sin afectar la base de datos o el tráfico de producción.

#### **Capítulo 14: Optimización en hPanel (Hostinger): Ecosistema Orientado a la Nube**

* **14.1** La infraestructura de hPanel: Comprendiendo el entorno basado puramente en LiteSpeed y su impacto directo en el rendimiento de WordPress.
* **14.2** Gestión de caché nativa de hPanel: Sincronización entre la herramienta de "Caché de Objetos" (Redis) del panel a un clic y el plugin LiteSpeed Cache.
* **14.3** Redes de Entrega Integradas: Configuración de la CDN nativa de Hostinger vs. integración de Cloudflare a través de la interfaz del panel.
* **14.4** Control de Inodos y Almacenamiento SSD/NVMe: Auditoría del sistema de archivos a través del panel para evitar cuellos de botella por acumulación de caché de disco y archivos huérfanos.
* **14.5** Gestión del PHP y Base de Datos: Selección de ramas de PHP 8.x, activación de OPcache y gestión del tamaño de la base de datos a través del gestor integrado de hPanel.
* **14.6** Diagnóstico de consumo: Uso de la herramienta "Order Usage" (Uso del pedido) en hPanel para identificar picos de carga, rastrear peticiones pesadas y auditar procesos huérfanos de PHP.

Aquí tienes el capítulo dedicado a Apache, asumiendo el rol de Capítulo 15. Este bloque está enfocado en cómo un SysAdmin debe reconfigurar este servidor, a menudo considerado pesado o tradicional, para llevarlo a estándares modernos de alto rendimiento que puedan competir en latencia y concurrencia.

---

#### **Capítulo 15: Modernización y Optimización Extrema de Apache web server**

* **15.1** El adiós definitivo a `mod_php` y `mpm_prefork`: Transición arquitectónica obligatoria hacia `mpm_event` acoplado con PHP-FPM a través de `mod_proxy_fcgi`.
* **15.2** Afinación matemática de directivas Core: Cálculo y dimensionamiento de `MaxRequestWorkers`, `ServerLimit`, `ThreadsPerChild` y `Min/MaxSpareThreads` para evitar el agotamiento de memoria y errores 503 bajo estrés.
* **15.3** El cuello de botella de `.htaccess` (Directory-level configuration): Impacto en el I/O de disco por recursividad y cómo migrar reglas de reescritura de WordPress directamente al `VirtualHost` declarando `AllowOverride None`.
* **15.4** Protocolos de última generación: Implementación nativa de HTTP/2 (`mod_http2`) en Event MPM, priorización de flujos y configuración de compresión moderna con `mod_brotli` por encima de `mod_deflate` (Gzip).
* **15.5** Caché a nivel de servidor web: Despliegue y configuración de `mod_cache` y `mod_cache_disk` para emular el comportamiento de *Page Caching* (bypass de PHP), sirviendo el HTML de WordPress directamente desde la memoria o el disco rápido.
* **15.6** *Debloating* y reducción de superficie: Auditoría estricta para desactivar módulos cargados por defecto que consumen RAM innecesaria (ej. `mod_autoindex`, `mod_cgi`, `mod_env`, `mod_status`) usando directivas de limpieza.
* **15.7** Optimización de conexiones TCP: Configuración agresiva de `KeepAliveTimeout` y `MaxKeepAliveRequests` para liberar *workers* rápidamente frente a clientes lentos, mitigando los ataques tipo Slowloris.
