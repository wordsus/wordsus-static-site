Administrar WordPress en entornos de hosting compartido exige un cambio de paradigma: ya no gestionamos la capacidad total del hardware, sino que operamos bajo las estrictas fronteras impuestas por **CloudLinux y LVE Manager**. En este ecosistema, cada megabyte de RAM y cada ciclo de CPU cuenta.

Este capítulo aborda las estrategias críticas para navegar estas limitaciones. Aprenderás a neutralizar el impacto del cron virtual, a dominar la gestión selectiva de extensiones de PHP y a realizar limpiezas profundas de bases de datos mediante SQL. El objetivo es transformar un entorno restringido en una arquitectura de alto rendimiento capaz de soportar picos de tráfico sin disparar errores 508.

## 12.1 Limitaciones del entorno compartido y CloudLinux: Entendiendo LVE Manager y cómo evitar los límites de CPU, RAM, I/O y concurrentes (EP)

Cuando migramos la mentalidad desde servidores dedicados o instancias VPS (donde administramos la totalidad de los recursos) hacia un entorno de alojamiento compartido gestionado por **cPanel y CloudLinux**, las reglas del juego cambian drásticamente. En este escenario, el enemigo ya no es únicamente la ineficiencia del código, sino los estrictos "techos de cristal" impuestos por el sistema operativo a nivel de kernel.

CloudLinux utiliza una tecnología llamada **LVE (Lightweight Virtual Environment)**, que aísla a cada inquilino (cuenta de cPanel) en su propio entorno virtualizado. Su objetivo es evitar que un sitio web de un usuario monopolice los recursos del servidor y afecte a los demás, el clásico problema del *"bad neighbor"*.

Para optimizar WordPress en este ecosistema, es vital comprender exactamente qué mide LVE Manager y cómo se comporta nuestro CMS cuando choca contra estos límites.

---

### Diagrama de Flujo LVE: Anatomía de una Petición Restringida

El siguiente diagrama ilustra cómo CloudLinux intercepta y evalúa una petición HTTP dinámica (que requiere PHP) antes y durante su ejecución:

```text
[ Cliente / Navegador ] ---> [ Servidor Web (Apache/LSWS) ]
                                       |
                                       v
                           [ Entorno LVE (CloudLinux) ]
                           /           |            \
                          /            |             \
                 [ ¿Límite EP? ]  [ ¿Límite CPU? ]  [ ¿Límite RAM? ]
                 /        |       /        |        /         |
               Sí         No    Sí         No     Sí          No
               |          |     |          |      |           |
         [ Error 508 ]    | [ Throttling ] | [ Error 500/503/OOM ]
      (Resource Limit)    | (Aumento TTFB) |  (Proceso aniquilado)
                          \-------+--------/
                                  |
                           [ Ejecución PHP ] -> [ Límite I/O ] -> [ Base de Datos ]
                                                        |
                                                (Si se excede el I/O)
                                                [ Ejecución congelada / Wait ]

```

---

### Desglosando las Métricas de LVE Manager

Cuando revisamos la interfaz de "Uso de Recursos" (Resource Usage) en cPanel, nos encontramos con cinco métricas fundamentales. Ignorarlas es la principal causa de caídas en entornos compartidos.

**1. SPEED (Límite de CPU)**
Representa la cantidad de procesamiento asignada a la cuenta, expresada en porcentajes, donde el 100% equivale a un núcleo físico (core) completo del servidor.

* **Comportamiento al límite:** CloudLinux **no** arroja un error inmediato cuando se alcanza este límite. En su lugar, aplica *throttling* (estrangulamiento). El servidor web pone los procesos de PHP en un estado de "sueño" forzado durante milisegundos para mantenerlos dentro de la cuota.
* **Síntoma en WordPress:** Un incremento dramático y errático en el *Time to First Byte* (TTFB). La web se siente lenta, pero no se rompe.

**2. PMEM / VMEM (Límite de Memoria)**
*PMEM* (Physical Memory) es la memoria RAM real consumida por los procesos de la cuenta, mientras que *VMEM* (Virtual Memory) incluye la memoria compartida o asignada que no necesariamente se está utilizando. CloudLinux moderna prioriza el límite de PMEM.

* **Comportamiento al límite:** Cuando un proceso PHP de WordPress intenta exceder la PMEM disponible, el kernel de CloudLinux invoca el OOM Killer (Out Of Memory) y aniquila el proceso instantáneamente.
* **Síntoma en WordPress:** Errores 500 (Internal Server Error) o 503 (Service Unavailable). En los logs del servidor aparecerá el mensaje *"Cannot allocate memory"* o *"OOM killed"*.

**3. I/O y IOPS (Límite de Entrada/Salida de Disco)**
*I/O* limita la velocidad (ej. 10 MB/s) a la que la cuenta puede leer o escribir en el disco físico. *IOPS* limita la cantidad de operaciones por segundo.

* **Comportamiento al límite:** Los procesos que requieren lectura/escritura (como consultas pesadas a MySQL en tablas sin indexar, o la generación de cachés en disco) se pausan y quedan a la espera (*I/O Wait*).
* **Síntoma en WordPress:** Las tareas del backend (wp-admin), las importaciones masivas o los plugins de backup se quedan congelados indefinidamente.

**4. EP (Entry Processes / Procesos Concurrentes)**
Es la métrica más incomprendida. **No equivale al número de visitantes simultáneos en la web**. Un "Entry Process" se cuenta *únicamente* cuando un script dinámico (PHP o CGI) está en ejecución. Si un visitante está descargando una imagen, un CSS o visualizando una página cacheada en HTML (servida directamente por NGINX o LiteSpeed), **el consumo de EP es 0**.

* **Matemática del EP:** El límite de EP se basa en la Ley de Little. Podemos modelar el consumo de EP con la siguiente fórmula:
$$EP = \lambda \times W$$

Donde:

* $\lambda$ = Tasa de llegada de peticiones dinámicas (peticiones por segundo).
* $W$ = Tiempo promedio de ejecución del script de WordPress (en segundos).

*Ejemplo:* Si tu WordPress tarda 2 segundos en procesar cada petición (checkout de WooCommerce sin caché) y recibes 10 peticiones por segundo, generarás **20 EP**. Si tu límite en CloudLinux es 20, tu sitio caerá, a pesar de tener solo 10 usuarios navegando.

* **Síntoma en WordPress:** El temido **Error 508 Resource Limit Is Reached**. El servidor web rechaza automáticamente cualquier nueva conexión dinámica.

**5. NPROC (Número de Procesos)**
Es el límite total de procesos de la cuenta. Incluye los EP (procesos de PHP), pero también procesos IMAP (consultas de correo), SSH, tareas cron de cPanel y subprocesos de la base de datos. Si se alcanza, no se podrán ejecutar nuevos comandos, ni siquiera entrar por SSH.

---

### Estrategias Prácticas para Sobrevivir y Evitar Límites en WordPress

Entender la fórmula del EP ($EP = \lambda \times W$) nos da la clave para optimizar en cPanel: solo podemos evitar el Error 508 reduciendo la cantidad de peticiones que llegan a PHP ($\lambda$) o reduciendo el tiempo que PHP tarda en procesarlas ($W$).

1. **Bypass total de PHP (El "Hack" del EP):**
Como se vio en los capítulos de caché (Cap. 5 y 11), la regla de oro en CloudLinux es **no tocar PHP a menos que sea estrictamente necesario**. Al utilizar LiteSpeed Cache (LSCache) o NGINX configurados correctamente en cPanel, las páginas cacheadas se sirven directamente desde el servidor web. Esto reduce $\lambda$ y $W$ a cero para el tráfico anónimo. Miles de visitantes concurrentes en una página cacheada consumirán 0 EP y un % insignificante de CPU.
2. **Mitigación de la API de Heartbeat:**
El archivo `admin-ajax.php` de WordPress se ejecuta constantemente por el *Heartbeat API* (para autoguardados o control de sesiones en el dashboard). Esto dispara el consumo de EP y CPU. Debes usar plugins como *Heartbeat Control* o las opciones de LSCache para reducir su frecuencia de ejecución a 60-120 segundos, o desactivarlo por completo en el frontend y backend (dejándolo solo en pantallas de edición).
3. **Reducción del `memory_limit` (Menos es Más):**
Un error común al sufrir límites de PMEM (RAM) es aumentar el `memory_limit` de PHP a valores absurdos (ej. 1024M). Si tu PMEM en CloudLinux es de 1 GB, un solo script mal optimizado que consuma ese giga aniquilará toda la RAM disponible, impidiendo que otras peticiones menores se ejecuten. Es preferible mantener un `memory_limit` de 128M o 256M para la mayoría de los sitios; esto fuerza la interrupción de un script individual problemático antes de que derribe la cuenta entera.
4. **Descarga de Tareas Secundarias (I/O y CPU):**
Plugins de estadísticas nativos (como WP Statistics o Jetpack en ciertos módulos) y plugins de seguridad que escanean archivos en tiempo real masacran los límites de I/O y CPU de CloudLinux. Estas tareas deben externalizarse (usar Google Analytics/Plausible para estadísticas, y escaneos de malware a nivel de servidor o vía Cloudflare WAF).
5. **Externalización del Cron (Reducción de bloqueos):**
El `wp-cron.php` nativo se ejecuta en el frontend de forma síncrona en las visitas no cacheadas. Si hay una tarea pesada encolada (ej. comprobación de actualizaciones, envíos de emails), inflará el tiempo $W$ de esa petición, disparando el EP. (Se abordará la solución técnica de esto en la sección 12.4).

## 12.2 Gestión de PHP (MultiPHP Manager vs. Select PHP Version): Habilitación de extensiones críticas para el rendimiento

Uno de los mayores puntos de confusión al optimizar WordPress en cPanel es la coexistencia de dos gestores de PHP diferentes. Dependiendo de la configuración del proveedor de alojamiento y de si el servidor utiliza CloudLinux, te encontrarás con **MultiPHP Manager** o con **Select PHP Version**.

Comprender la diferencia anatómica entre ambos es el primer paso para habilitar correctamente el motor que impulsará nuestro WordPress.

### Entendiendo la Dualidad: ea-php vs. alt-php

Para clarificar el panorama, debemos observar cómo cPanel compila y entrega PHP. El siguiente diagrama ilustra la jerarquía de decisión:

```text
                  [ Interfaz de cPanel ]
                            |
           ¿El servidor cuenta con CloudLinux OS?
                 /                     \
               NO                       SÍ
               |                         |
    [ MultiPHP Manager ]       [ Select PHP Version ]
       (Prefijo: ea-php)          (Prefijo: alt-php)
               |                         |
   Gestionado vía EasyApache 4   Gestionado vía LVE Manager
   Extensiones globales fijas    Extensiones dinámicas por cuenta
   Requiere acceso WHM (Root)    Control total para el usuario web

```

**1. MultiPHP Manager (`ea-php`)**
Es el gestor nativo de cPanel basado en EasyApache 4. Las versiones de PHP bajo este sistema llevan el prefijo `ea-php` (ej. `ea-php81`).

* **Limitación en entorno compartido:** Si tu cuenta solo dispone de MultiPHP Manager, estás sujeto a la configuración global del servidor. Como usuario final de cPanel, solo puedes cambiar la versión de PHP, pero **no puedes habilitar o deshabilitar extensiones individualmente**. Si necesitas `redis` y el administrador no lo compiló en el perfil de EasyApache, no podrás usarlo.

**2. Select PHP Version (`alt-php`)**
Es el gestor inyectado por CloudLinux. Las versiones llevan el prefijo `alt-php` (ej. `alt-php81`).

* **La ventaja para la optimización:** Este es el entorno ideal. Permite aislar completamente el binario de PHP para tu cuenta. Te otorga una interfaz gráfica (PHP Selector) donde puedes marcar y desmarcar casillas para cargar exactamente los módulos que WordPress necesita, reduciendo el consumo de memoria y habilitando integraciones de alto rendimiento.

---

### Habilitación de Extensiones Críticas (El "Tuning" del Selector)

Una vez posicionado en "Select PHP Version" (asegurándote de haber seleccionado una versión `alt-php` moderna como 8.1 u 8.2), la configuración por defecto suele ser conservadora. Para un WordPress de alto rendimiento, debes auditar y habilitar las siguientes extensiones críticas:

**1. `opcache` (Aceleración de Bytecode)**
Como detallamos en el Capítulo 3, OPcache es innegociable. Evita que PHP tenga que recompilar los scripts de WordPress en cada petición.

* **Acción:** Busca la extensión `opcache` y actívala.
* **Impacto en LVE:** Reduce drásticamente el consumo de CPU (SPEED) y el límite de procesos concurrentes (EP), ya que el tiempo de ejecución del script ($W$) se desploma al servir código precompilado desde la memoria RAM.

**2. `redis` o `memcached` (El puente del Object Cache)**
Existe una confusión clásica en entornos cPanel: tener un servidor Redis ejecutándose en segundo plano no sirve de nada si PHP no sabe cómo hablar con él.

* **Acción:** Activa la casilla `redis` (recomendado) o `memcached`. Esta extensión carga la API (el driver de PHP) necesaria para que el *drop-in* `object-cache.php` de WordPress pueda establecer la conexión TCP o por socket con el demonio de caché.
* **Impacto LVE:** Descarga la presión de Entrada/Salida (I/O) y el uso de CPU de la base de datos MySQL, trasladando la carga de consultas repetitivas a la memoria.

**3. `imagick` vs. `gd` (Procesamiento de Imágenes)**
WordPress utiliza por defecto la extensión de PHP activa para generar las miniaturas y procesar las imágenes subidas a la biblioteca multimedia.

* **Acción:** Activa `imagick`. ImageMagick ofrece una calidad de compresión y redimensionamiento superior, además de soporte nativo para formatos modernos como WebP y AVIF.
* **Precaución:** `imagick` consume más memoria (PMEM) que `gd` durante el procesamiento. Si tu cuenta de cPanel tiene un límite de RAM muy estricto (ej. 512 MB) y permites subidas de imágenes originales de 15 MB, es probable que dispares el OOM Killer (Error 508). En casos de recursos extremos, retroceder a `gd` puede estabilizar las subidas pesadas, a costa de una menor calidad de imagen.

**4. Extensiones base requeridas por el Core de WordPress**
Asegúrate de no deshabilitar accidentalmente los cimientos del CMS. Deben estar activos: `curl`, `dom`, `exif`, `fileinfo`, `hash`, `json`, `mbstring`, `mysqli`, `sodium`, `xml`, y `zip`.

---

### Micro-Optimización: Desactivación de *Bloatware* en PHP

Cada extensión activada en "Select PHP Version" aumenta la huella de memoria base de *cada* proceso de PHP-FPM o LSAPI que se levante en tu cuenta. En un entorno CloudLinux donde cada megabyte cuenta, la limpieza es fundamental.

Si tu WordPress no utiliza tecnologías específicas heredadas, **desactiva** las siguientes extensiones para ahorrar RAM:

* `pdo_sqlsrv` y `sqlsrv` (Solo útiles si conectas a bases de datos Microsoft SQL Server).
* `pdo_pgsql` y `pgsql` (Solo para PostgreSQL; WordPress usa MySQL/MariaDB).
* `snmp`, `soap`, `tidy`, `xmlrpc` (A menos que una pasarela de pago legacy o un ERP específico te exija SOAP o XML-RPC).

Al aplicar esta dieta estricta sobre las extensiones de PHP a través del panel, lograrás que la inicialización de cada *worker* sea mucho más ligera, permitiendo acomodar un mayor número de peticiones concurrentes antes de chocar contra el límite de RAM física (PMEM) del LVE Manager.

## 12.3 Sobreescritura segura de límites de recursos: Modificación de `memory_limit`, `upload_max_filesize` y `max_execution_time` a través de `.htaccess`, `php.ini` local o `.user.ini`

Aunque la interfaz gráfica de cPanel (como vimos en la sección anterior) facilita la gestión de PHP, los SysAdmins y optimizadores de WordPress a menudo se encuentran con escenarios donde la UI falla, los cambios no se aplican recursivamente a todos los subdirectorios, o se requiere una configuración granular (por ejemplo, asignar más memoria solo al backend).

Cuando la interfaz no responde, debemos descender al nivel del sistema de archivos. Sin embargo, el método que elijas dependerá enteramente de la arquitectura del servidor web y del manejador de PHP (PHP Handler) que esté utilizando el proveedor. Aplicar el método incorrecto no solo ignorará tus ajustes, sino que puede derribar tu sitio web con un Error 500 inmediato.

---

### 1. Las variables críticas y la regla de la proporción

Antes de modificar cualquier archivo, es vital entender qué estamos tocando y cómo se relacionan estas variables entre sí. En un entorno compartido con CloudLinux (donde la RAM total está limitada por LVE), sobredimensionar estos valores es un error fatal.

* **`memory_limit`:** La memoria máxima que puede consumir un solo script (ej. un plugin). **Jamás utilices el valor `-1` (ilimitado) en un entorno compartido.** Si tu cuenta tiene 1 GB de PMEM en LVE, configura un máximo de `256M` o `512M`. Esto asegura que si un script falla, el servidor mate ese proceso individual antes de agotar la RAM de toda la cuenta.
* **`upload_max_filesize`:** El tamaño máximo de un archivo individual que se puede subir a la biblioteca de medios.
* **`post_max_size`:** El tamaño máximo de todos los datos enviados en una petición POST. **Regla de oro:** Este valor siempre debe ser ligeramente superior a `upload_max_filesize`.
* **`max_execution_time`:** El tiempo máximo (en segundos) que un script puede ejecutarse antes de ser abortado. En cPanel, valores entre `60` y `120` son seguros.
* **`max_input_vars`:** Fundamental para WooCommerce o menús de WordPress gigantes. Define cuántas variables de entrada (formularios) se procesan. Un valor de `3000` o `5000` suele ser necesario para sitios complejos.

---

### 2. El estándar moderno: El archivo `.user.ini` (Para PHP-FPM y FastCGI)

En el 90% de los hostings cPanel modernos, PHP se ejecuta a través de PHP-FPM o FastCGI. En esta arquitectura, el archivo `.htaccess` no tiene autoridad para modificar directivas de PHP. El método correcto y seguro es crear un archivo llamado `.user.ini` en la raíz de tu WordPress (`public_html`).

PHP-FPM escanea este archivo periódicamente (por defecto cada 300 segundos, aunque en cPanel suele ser instantáneo) y aplica las directivas al directorio actual y sus subdirectorios.

**Ejemplo de configuración en `.user.ini`:**

```ini
; Configuración optimizada para WordPress en PHP-FPM
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 68M
max_execution_time = 120
max_input_vars = 5000

```

*Nota:* La sintaxis requiere el signo de igual (`=`) y permite comentarios con punto y coma (`;`).

---

### 3. El método `.htaccess` (Para LiteSpeed o mod_php legacy)

Si tu servidor cPanel utiliza **LiteSpeed Web Server (LSWS)** en lugar de Apache, el archivo `.htaccess` recupera su poder. LiteSpeed es capaz de leer directivas `php_value` y aplicarlas a su manejador nativo (LSAPI) de forma instantánea.

**Peligro Crítico:** Si insertas este código en un servidor Apache corriendo PHP-FPM, tu sitio arrojará un **Error 500 (Internal Server Error)** inmediatamente. Solo utiliza este método si tienes la certeza de estar en un entorno LiteSpeed o si el servidor aún usa el obsoleto `mod_php`.

**Ejemplo de configuración en `.htaccess`:**

```apache
<IfModule lsapi_module>
   php_value memory_limit 256M
   php_value upload_max_filesize 64M
   php_value post_max_size 68M
   php_value max_execution_time 120
   php_value max_input_vars 5000
</IfModule>

```

*Nota:* La sintaxis aquí **no** lleva signo de igual. Usamos la etiqueta condicional `<IfModule lsapi_module>` para evitar que Apache rompa el sitio si el servidor es migrado en el futuro.

---

### 4. El archivo `php.ini` local: Un relicario del pasado

Muchos tutoriales antiguos de WordPress sugieren crear un archivo `php.ini` en la raíz del sitio. En la arquitectura actual de cPanel, esto es altamente desaconsejable por dos razones:

1. **Falta de recursividad:** Antiguamente, un `php.ini` local solo afectaba al directorio exacto donde se encontraba. Si lo ponías en `public_html`, las subidas fallaban porque el directorio `wp-admin` (donde se ejecuta el uploader) no lo leía. Había que recurrir a directivas suPHP (`suPHP_ConfigPath`) en el `.htaccess` para forzar la recursividad.
2. **Sobreescritura del Core:** A veces, un `php.ini` local anula por completo el `php.ini` maestro del servidor, desactivando silenciosamente extensiones vitales (como OPcache o Redis) configuradas por el administrador.

**Conclusión técnica:** Evita el uso de `php.ini` locales en cPanel. Limítate a `.user.ini` o a la interfaz del panel.

---

### Estrategia Avanzada: Asignación asimétrica de recursos (`wp-admin` vs. Frontend)

Una técnica de SysAdmin muy efectiva en entornos CloudLinux es la "asignación asimétrica". El frontend de WordPress, al estar usualmente cacheado o realizar consultas ligeras, rara vez necesita más de 128MB de RAM. Sin embargo, el backend (`wp-admin`), especialmente al ejecutar page builders, reportes de WooCommerce o actualizaciones, puede requerir 512MB.

Si configuramos 512MB de manera global, un ataque DDoS o un pico de tráfico en el frontend podría agotar la RAM de CloudLinux rápidamente, ya que cada *worker* de PHP reservaría esa cantidad.

Para solucionarlo, aplicamos un límite bajo en la raíz, y un límite alto solo para el panel de administración:

1. **En `/public_html/.user.ini` (Para los visitantes):**

```ini
memory_limit = 128M

```

1. **En `/public_html/wp-admin/.user.ini` (Para los administradores):**

```ini
memory_limit = 512M
max_execution_time = 300

```

De esta forma, protegemos los recursos (EP y PMEM) del LVE Manager contra el tráfico general, pero le damos "combustible" ilimitado a las tareas administrativas pesadas.

## 12.4 Reemplazo del Cron Virtual: Desactivación de `wp-cron.php` y configuración de tareas programadas nativas en la interfaz de "Cron Jobs" de cPanel

Por defecto, WordPress no utiliza un programador de tareas real a nivel de sistema operativo. En su lugar, utiliza lo que conocemos como **"Virtual Cron"** o `wp-cron.php`. Este mecanismo es uno de los mayores "asesinos silenciosos" del rendimiento en entornos compartidos de cPanel si no se gestiona correctamente.

### El Problema del Cron Virtual

El archivo `wp-cron.php` se ejecuta cada vez que un visitante carga una página. WordPress comprueba si hay tareas pendientes (publicar entradas programadas, limpiar transitorios, backups, etc.) y, si las hay, intenta ejecutarlas lanzando una petición HTTP interna.

Esto genera dos problemas críticos de rendimiento:

1. **Picos de recursos (Alta carga):** En un sitio con mucho tráfico, WordPress intentará verificar el cron en cada visita. Aunque existen bloqueos para evitar ejecuciones simultáneas, la comprobación en sí consume un proceso de entrada (**EP**) y tiempo de **CPU**, inflando artificialmente el uso de recursos en LVE Manager.
2. **Tareas fallidas (Baja carga):** Si el sitio no recibe visitas, las tareas críticas (como un backup programado a las 3:00 AM) no se ejecutarán hasta que alguien entre a la web por la mañana.

---

### Paso 1: Desactivar el Cron Virtual

Para tomar el control, primero debemos decirle a WordPress que deje de intentar ejecutar el cron por su cuenta.

1. Accede al **Administrador de Archivos** de cPanel o vía FTP.
2. Edita el archivo `wp-config.php`.
3. Añade la siguiente constante antes de la línea que dice `/* That's all, stop editing! Happy publishing. */`:

```php
/** Desactivar el cron virtual para usar un cron real de sistema */
define('DISABLE_WP_CRON', true);

```

Desde este momento, WordPress "enmudecerá" su programador interno. Si no configuramos el paso siguiente, las tareas programadas dejarán de funcionar.

---

### Paso 2: Configuración del Cron Real en cPanel

Ahora debemos delegar esta tarea al demonio **crond** del servidor Linux. Esto garantiza que las tareas se ejecuten exactamente cuando deben, sin importar si hay visitas o no, y de una forma mucho más eficiente para el servidor.

1. En cPanel, busca la sección **Avanzado** -> **Cron Jobs** (Tareas Cron).
2. En **Common Settings**, selecciona un intervalo. Para la mayoría de los sitios WordPress, **"Once Per 15 Minutes"** (cada 15 minutos) o **"Once Per 30 Minutes"** es el equilibrio perfecto entre rendimiento y puntualidad.
3. En el campo **Command**, introduce el comando de ejecución.

Existen tres formas comunes de invocar el cron. La elección depende de las restricciones de tu hosting:

**Opción A: Ejecución vía PHP (Recomendada - Menos sobrecarga)**
Es la más eficiente porque no requiere una petición de red, sino que ejecuta el script directamente en el binario de PHP.

```bash
/usr/local/bin/php -q /home/usuario/public_html/wp-cron.php >/dev/null 2>&1

```

*(Nota: Asegúrate de cambiar `/home/usuario/public_html/` por la ruta real de tu cuenta, la cual puedes ver en la columna derecha de tu cPanel).*

**Opción B: Ejecución vía wget (Si la opción A falla)**
Útil si el servidor tiene restricciones sobre el binario de PHP en CLI.

```bash
wget -q -O - https://tusitio.com/wp-cron.php?doing_wp_cron >/dev/null 2>&1

```

**Opción C: Ejecución vía curl**
Similar a wget, realiza una petición HTTP silenciosa.

```bash
curl -sL https://tusitio.com/wp-cron.php?doing_wp_cron >/dev/null 2>&1

```

---

### Análisis de Impacto: Virtual vs. Real

Para entender por qué este cambio es vital para la optimización, observa la siguiente comparativa de cómo se comporta el consumo de recursos en el servidor:

| Característica | Cron Virtual (Default) | Cron Real (Sistema) |
| --- | --- | --- |
| **Peticiones HTTP** | Una por cada visita (potencialmente miles) | Una sola petición por intervalo (ej. 4 por hora) |
| **Uso de EP (Entry Processes)** | Alto y errático (ligado al tráfico) | Predecible y mínimo (1 EP solo durante la ejecución) |
| **Latencia para el usuario** | Puede aumentar el TTFB si el cron se dispara | Cero impacto. El usuario nunca nota el cron. |
| **Confiabilidad** | Depende del tráfico | Exacta y puntual |

Esta optimización es especialmente crítica si utilizas plugins de e-commerce o marketing automation que gestionan colas de correos electrónicos. Al mover el cron al sistema, aseguras que los correos salgan a tiempo sin penalizar la velocidad de navegación de tus clientes.

## 12.5 Optimización de Base de Datos sin consola: Uso avanzado de phpMyAdmin para limpieza masiva de *transients*, revisiones y conversión manual de tablas MyISAM a InnoDB

Aunque en el Capítulo 8 abordaremos la elegancia y velocidad de WP-CLI para estas tareas, la realidad del SysAdmin que administra entornos compartidos (o que hereda proyectos de clientes) es que muchas veces el acceso SSH está restringido. En estos escenarios, nuestra única ventana al corazón de WordPress es **phpMyAdmin**, la herramienta nativa de cPanel.

Operar una base de datos grande a través de una interfaz web tiene sus riesgos (principalmente los *timeouts* por el límite de `max_execution_time` visto en la sección 12.3), por lo que debemos abandonar los clics visuales lentos y aprovechar el poder de las consultas SQL directas.

> **Regla de Oro del SysAdmin:** Antes de ejecutar cualquiera de las siguientes consultas de manipulación de datos (DELETE, UPDATE, ALTER), debes exportar un backup completo (`.sql`) de la base de datos desde la pestaña "Exportar". No hay botón de deshacer.

---

### 1. Purga de *Transients* Huérfanos en `wp_options`

Como vimos en el Capítulo 1, la tabla `wp_options` se carga en memoria en casi cada petición (el temido *autoload*). Los *transients* son fragmentos de información cacheados temporalmente en la base de datos (por ejemplo, respuestas de APIs de redes sociales o recuentos de carritos de WooCommerce).

El problema surge cuando estos *transients* caducan pero el "Cron Virtual" falla al limpiarlos (o simplemente se acumulan por un plugin mal codificado). Cientos de megabytes de basura ralentizan las consultas del Core.

Para limpiarlos de golpe sin saturar la memoria de PHP, ve a la pestaña **SQL** en phpMyAdmin y ejecuta:

```sql
DELETE FROM wp_options 
WHERE option_name LIKE '_transient_%' 
OR option_name LIKE '_site_transient_%';

```

*Nota: WordPress regenerará automáticamente los transients que realmente necesite en la siguiente recarga de la página.*

---

### 2. Limpieza Quirúrgica de Revisiones y Metadatos Asociados

Cada vez que guardas un borrador en WordPress, se genera una revisión. En un blog con años de antigüedad o un sitio con muchos constructores visuales (Elementor, Divi), las revisiones pueden multiplicar por diez el tamaño real de la tabla `wp_posts`.

Muchos tutoriales sugieren un simple `DELETE FROM wp_posts WHERE post_type = 'revision'`. Sin embargo, esto es **incompleto y peligroso**. Las revisiones también dejan rastros huérfanos en las tablas de taxonomías y metadatos (`wp_postmeta`).

Para realizar una limpieza profunda e integral usando SQL avanzado (JOINs), ejecuta:

```sql
DELETE a,b,c
FROM wp_posts a
LEFT JOIN wp_term_relationships b ON (a.ID = b.object_id)
LEFT JOIN wp_postmeta c ON (a.ID = c.post_id)
WHERE a.post_type = 'revision';

```

Este comando no solo elimina la revisión, sino que purga cualquier relación de categoría o metadato atado específicamente a esa revisión "fantasma", liberando un espacio significativo en disco y reduciendo el tiempo de escaneo de índices de MySQL.

---

### 3. Conversión Masiva de MyISAM a InnoDB (Evitando el Table-Level Locking)

Ya cubrimos en el Capítulo 4 por qué InnoDB es el único motor de almacenamiento aceptable para WordPress. Tablas legacy en **MyISAM** sufren de *Table-Level Locking*: si un visitante hace un pedido en WooCommerce (UPDATE), toda la tabla queda bloqueada, y los demás usuarios que intenten leerla (SELECT) quedarán en cola, disparando el uso de CPU y el límite EP de CloudLinux.

Si migras un sitio antiguo a cPanel, es muy probable que algunas tablas sigan en MyISAM. Puedes cambiarlas una por una yendo a la pestaña "Operaciones" de cada tabla, pero si tienes 80 tablas, esto es ineficiente.

**El método avanzado (Generación de consultas dinámicas):**

Podemos usar phpMyAdmin para consultar el esquema de información de MySQL y pedirle que **escriba por nosotros** los comandos de conversión.

1. Selecciona tu base de datos y ve a la pestaña **SQL**.
2. Ejecuta esta consulta (reemplaza `tu_base_de_datos` por el nombre real de tu DB en cPanel):

```sql
SELECT CONCAT('ALTER TABLE ', table_name, ' ENGINE=InnoDB;') AS Sentencias_SQL
FROM information_schema.tables
WHERE table_schema = 'tu_base_de_datos'
AND `ENGINE` = 'MyISAM'
AND `TABLE_TYPE` = 'BASE TABLE';

```

1. **El resultado no alterará las tablas todavía.** Te devolverá una lista de resultados con los comandos generados, por ejemplo:

* `ALTER TABLE wp_comments ENGINE=InnoDB;`
* `ALTER TABLE wp_postmeta ENGINE=InnoDB;`

1. En phpMyAdmin, haz clic en "Opciones" (debajo de los resultados), selecciona **Textos completos** y desmarca la casilla de truncar textos. Copia todas esas líneas generadas.
2. Vuelve a la pestaña **SQL** principal, pega todas esas sentencias `ALTER TABLE` que acabas de copiar y presiona **Continuar**.

De esta forma habrás migrado todo el esquema a InnoDB en un solo movimiento, habilitando el *Row-Level Locking* (bloqueo a nivel de fila) y permitiendo que MySQL maneje cientos de transacciones concurrentes sin estrangular los recursos compartidos del servidor.

## 12.6 Herramientas de caché del proveedor: Configuración de "Optimize Website" (compresión zlib/Gzip) y despliegue del LiteSpeed Web Cache Manager si el servidor opera bajo CloudLinux/LSWS

Para cerrar el círculo de la optimización en un entorno compartido, debemos aprovechar las herramientas nativas que cPanel pone a nuestra disposición. Hasta ahora hemos blindado los recursos (LVE), afinado el motor (PHP) y aligerado la base de datos (phpMyAdmin). El último paso es garantizar que los datos viajen comprimidos y cacheados desde el servidor hacia el navegador del visitante, minimizando el consumo de ancho de banda y reduciendo drásticamente el *Time to First Byte* (TTFB).

En cPanel, esto se gestiona a través de dos interfaces clave, dependiendo de si el servidor corre bajo la pila tradicional (Apache) o la pila de alto rendimiento (LiteSpeed Web Server).

---

### 1. "Optimize Website" (Optimizar el sitio web): Compresión de activos estáticos y dinámicos

Independientemente del servidor web subyacente, cPanel ofrece un icono llamado **Optimize Website** (Optimizar el sitio web) en la sección de Software. Esta es la forma gráfica de configurar la compresión de salida.

**¿Qué hace realmente esta herramienta?**
Cuando activas la compresión aquí, cPanel no instala ningún software nuevo. Simplemente inyecta directivas en el archivo `.htaccess` de tu directorio `public_html` para instruir al servidor web (usando `mod_deflate` en Apache o su equivalente nativo en LiteSpeed) que aplique el algoritmo **zlib/Gzip** a los archivos antes de enviarlos.

**Configuración recomendada:**
Al abrir la herramienta, verás tres opciones. Debes seleccionar **"Compress the specified MIME types"** (Comprimir los tipos MIME especificados) en lugar de comprimir "Todo" (All content).

* **Tipos MIME a incluir:**

```text
text/html text/plain text/xml text/css text/javascript application/javascript application/x-javascript application/xml application/json image/svg+xml

```

* **¿Por qué no "Todo"?**
Comprimir archivos que ya están comprimidos por naturaleza (como imágenes `.jpg`, `.png`, `.webp`, videos `.mp4` o archivos `.zip`) es un desperdicio masivo de CPU (SPEED en LVE Manager). Si fuerzas a Gzip a intentar comprimir un `.jpg`, el archivo resultante será del mismo tamaño, pero habrás gastado valiosos ciclos de CPU en el proceso, acercándote al estrangulamiento de CloudLinux.

**El código generado (Lo que el SysAdmin debe auditar):**
Una vez guardado, puedes verificar tu `.htaccess` para confirmar que las reglas se han inyectado correctamente. Verás un bloque similar a este:

```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

```

*Nota Avanzada:* Si tu proveedor ha habilitado **Brotli** a nivel de servidor (un algoritmo de compresión moderno de Google, superior a Gzip), este sobrescribirá automáticamente a Gzip para los navegadores compatibles, usando las mismas reglas MIME definidas aquí.

---

### 2. LiteSpeed Web Cache Manager: El puente entre cPanel y WordPress

Si el proveedor de alojamiento ha invertido en **LiteSpeed Web Server Enterprise (LSWS)**, encontrarás un icono llamado **LiteSpeed Web Cache Manager** en la sección Avanzada o de Software de cPanel.

Esta no es una simple herramienta de compresión; es una consola de mando que permite al SysAdmin gestionar la caché a nivel de servidor sin tener que iniciar sesión en el panel de administración de WordPress (`wp-admin`).

**Arquitectura de la Caché en LSWS:**

```text
[ Visitante ] ---> [ LiteSpeed Web Server (Caché en RAM/Disco) ]
                                |
                   (Si no hay caché: MISS)
                                |
                 [ LiteSpeed Cache Plugin (WordPress) ]
                                |
                     [ PHP-FPM / Base de Datos ]

```

El servidor web LiteSpeed maneja la caché, pero necesita saber *cuándo* purgarla (por ejemplo, cuando se publica un nuevo artículo o se agota el stock de un producto). Para ello, requiere que el plugin de WordPress "LiteSpeed Cache" (LSCache) esté instalado y configurado para enviarle las cabeceras de invalidación.

**Funciones críticas del Cache Manager en cPanel:**

1. **WordPress Cache (Escaneo y Despliegue Masivo):**
En lugar de entrar a 10 instalaciones de WordPress distintas para instalar el plugin, puedes hacer clic en **"WordPress Cache"** y luego en **"Scan"**. La herramienta buscará todos los WordPress en la cuenta (incluyendo subdominios).
Una vez detectados, puedes seleccionarlos todos y hacer clic en **"Enable"**. Esto instalará, activará y configurará de manera silenciosa el plugin oficial LSCache con los parámetros recomendados para ese servidor específico, todo desde la interfaz de cPanel.
2. **Flush LSCache (Purga de Emergencia):**
Cuando un sitio se "rompe" por una mala actualización de CSS/JS o el cliente se queja de que no ve los cambios de diseño, el SysAdmin no necesita pedir credenciales de WP. Basta con entrar al LiteSpeed Web Cache Manager y usar la función **"Flush LSCache"**. Esto envía una señal nativa al servidor para vaciar la carpeta de caché asociada a ese dominio de forma instantánea.
3. **LSCache Version Management:**
Permite actualizar la versión del plugin LSCache en todos los sitios de la cuenta con un solo clic, mitigando vulnerabilidades de seguridad sin interactuar con WP-CLI o el escritorio de WordPress.

**La Regla de Exclusión (Evitando Conflictos Lógicos):**
Si utilizas el LiteSpeed Web Cache Manager para habilitar la caché de nivel de servidor, **debes desactivar cualquier otro plugin de *Page Caching*** en WordPress (como WP Rocket, W3 Total Cache o Super Cache). Mantener dos sistemas de caché de página activos simultáneamente provocará bucles de redirección, errores en la serialización de datos y picos de consumo de CPU que derribarán la cuenta por superar los límites de LVE.
