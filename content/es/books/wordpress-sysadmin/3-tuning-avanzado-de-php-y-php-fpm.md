PHP es el motor de WordPress, y su configuración dictaminará el techo de rendimiento de tu infraestructura. En este capítulo, abandonamos los ajustes genéricos para profundizar en la arquitectura de **PHP 8.x**. Analizaremos cómo el compilador **JIT** y una gestión precisa de **OPcache** eliminan la latencia de procesamiento.

Aprenderás a dimensionar los procesos de **PHP-FPM** mediante matemáticas aplicadas a tu RAM disponible, evitando colapsos por fugas de memoria. No se trata solo de que el código corra rápido, sino de garantizar que cada proceso sea eficiente, seguro y capaz de escalar bajo presión extrema sin comprometer la estabilidad del sistema.

## **3.1 Evolución de PHP: Impacto en el rendimiento desde PHP 7.4 hasta PHP 8.x (JIT Compiler)**

Históricamente, la forma más rápida y económica de mejorar el rendimiento de un sitio en WordPress ha sido actualizar su versión de PHP. Mientras que el salto de la serie 5.x a la 7.x representó una revolución que literalmente duplicó la velocidad de ejecución y redujo drásticamente el consumo de memoria, la transición de PHP 7.4 a la familia de PHP 8.x es una evolución arquitectónica más profunda.

El gran protagonista de este salto evolutivo es el **JIT (Just-In-Time) Compiler**, una característica introducida en PHP 8.0 que promete acercar el rendimiento de PHP al de lenguajes compilados nativos (como C o Go) en ciertos escenarios. Sin embargo, en el ecosistema de WordPress, es vital separar las expectativas teóricas de la realidad práctica del servidor.

---

### **La arquitectura de ejecución: Del Intérprete al JIT**

Para entender el impacto de PHP 8.x, primero debemos visualizar cómo PHP procesa el código. A diferencia de un lenguaje compilado (donde el código fuente se traduce a lenguaje máquina antes de ejecutarse), PHP es un lenguaje interpretado.

En PHP 7.4 y versiones anteriores (asumiendo que OPcache está activo), el flujo de ejecución es el siguiente:

1. El código fuente de WordPress (`.php`) se lee.
2. Un *Lexer* y un *Parser* lo convierten en un Árbol de Sintaxis Abstracta (AST).
3. El AST se compila en instrucciones intermedias llamadas **Opcodes**.
4. OPcache almacena estos Opcodes en la memoria RAM para no repetir los pasos 1 al 3 en peticiones futuras (profundizaremos en OPcache en la sección 3.4).
5. Finalmente, el **Zend Engine** (la máquina virtual de PHP) interpreta estos Opcodes línea por línea y los ejecuta en la CPU.

El problema radica en el paso 5: interpretar Opcodes sigue requiriendo una capa de abstracción. Aquí es donde entra el **JIT Compiler** en PHP 8.x.

```text
====================================================================
DIAGRAMA DE EJECUCIÓN: PHP 7.4 vs PHP 8.x (JIT)
====================================================================

[ PHP 7.4 (Con OPcache) ]
Código Fuente -> Lexer/Parser -> Compilador -> OPCODES -> (Memoria OPcache)
                                                  |
                                                  v
                                            Zend Engine VM (Interpreta)
                                                  |
                                                  v
                                            CPU (Ejecución)

--------------------------------------------------------------------

[ PHP 8.x (Con JIT Compiler) ]
Código Fuente -> Lexer/Parser -> Compilador -> OPCODES -> (Memoria OPcache)
                                                  |
                                                  +---> [ JIT COMPILER ] *
                                                              |
                                                              v
                                                 CÓDIGO MÁQUINA NATIVO
                                                              |
                                                              v
                                                        CPU (Ejecución)

* El JIT monitorea ("tracea") las partes del código que se ejecutan 
  con más frecuencia (código "caliente") y las compila directamente a 
  instrucciones de CPU, puenteando la Máquina Virtual de Zend.
====================================================================

```

El JIT Compiler no reemplaza a OPcache, sino que funciona como una extensión de este. Su trabajo es identificar los *Opcodes* que se ejecutan repetidamente y compilarlos directamente en código máquina comprensible por el procesador (x86, ARM, etc.), eliminando la necesidad de que el Zend Engine los interprete en cada ciclo.

---

### **El baño de realidad: JIT y WordPress**

Es común la creencia de que activar el JIT en PHP 8.x reducirá el tiempo de carga de WordPress a la mitad. **Esto es un concepto erróneo que debemos corregir.**

Para entender por qué, hay que diferenciar entre dos tipos de cuellos de botella en informática:

1. **CPU-bound (Limitado por Procesador):** Tareas matemáticas complejas, procesamiento de imágenes, renderizado 3D, cálculos fractales.
2. **I/O-bound (Limitado por Entrada/Salida):** Lectura/escritura en disco, consultas a bases de datos, llamadas a APIs externas a través de la red.

**WordPress es una aplicación inherentemente I/O-bound.** Cuando un visitante solicita una página, PHP pasa la inmensa mayoría de su tiempo de ejecución esperando: esperando a que la base de datos MySQL (Capítulo 4) devuelva una consulta, esperando a leer un archivo del disco, o esperando la respuesta de la API externa de un plugin.

Dado que el JIT Compiler optimiza puramente las operaciones *CPU-bound*, su impacto en la renderización estándar del frontend de WordPress es marginal. Los benchmarks muestran que un "Hello World" en PHP 8 con JIT puede ser hasta 3 veces más rápido que en PHP 7.4, pero en un entorno real de WordPress, la mejora de latencia en el frontend suele oscilar entre un modesto **2% y un 5%**.

### **¿Dónde brilla realmente PHP 8.x en un entorno WordPress?**

Aunque el JIT no sea una bala de plata para el *Time to First Byte* (TTFB) de visitantes anónimos, la adopción de PHP 8.x (8.1, 8.2 y 8.3) aporta beneficios tangibles y altamente recomendables en un entorno de alta disponibilidad:

* **Tareas en segundo plano y WP-CLI:** La ejecución de comandos pesados en terminal (como migraciones de datos masivas, regeneración de miniaturas o importaciones de WooCommerce vía WP-CLI) son procesos intensivos en CPU. Aquí, el JIT sí puede reducir los tiempos de ejecución drásticamente (hasta un 20-30% más rápido).
* **Procesamiento multimedia:** Plugins que manipulan imágenes al vuelo (compresión, redimensionamiento) o generan PDFs dinámicos se benefician enormemente de la compilación JIT.
* **Optimizaciones internas del motor (independientes del JIT):** PHP 8.x introdujo mejoras en el manejo de arrays, estructuras de datos internas más ligeras y una recolección de basura (*Garbage Collection*) optimizada. Esto significa que, incluso con el JIT desactivado, PHP 8 consume menos memoria RAM por cada proceso de *PHP-FPM* que PHP 7.4, lo que permite atender más concurrencia con los mismos recursos (vital para lo que veremos en la sección 3.3).
* **Código más estricto:** PHP 8 es menos tolerante con el código obsoleto y los errores fatales silenciados. A largo plazo, esto fuerza a los desarrolladores de temas y plugins a escribir código más eficiente y predecible, lo que indirectamente mejora la estabilidad del servidor.

### **Conclusión sobre la actualización**

Mantenerse en PHP 7.4 hoy en día es un riesgo de seguridad inasumible (llegó a su fin de vida útil en noviembre de 2022). La migración a PHP 8.x es obligatoria en cualquier pila orientada al rendimiento.

Al configurar servidores modernos para WordPress, se recomienda activar el JIT Compiler (específicamente en su modo `tracing`, que es más inteligente a la hora de elegir qué compilar), pero teniendo claro que es una optimización marginal para el tráfico web general. El verdadero rendimiento de alta disponibilidad en el frontend provendrá de las estrategias de caché (Capítulo 5) y la optimización de la base de datos (Capítulo 4).

## **3.2 Arquitectura de PHP-FPM: *Static*, *Dynamic* y *Ondemand process managers***

Como vimos en la evolución del servidor web, NGINX no tiene la capacidad nativa de procesar código PHP. Funciona como un proxy inverso rápido y eficiente que delega esa tarea a un servicio externo. En la pila moderna (LEMP), ese servicio es **PHP-FPM** (*FastCGI Process Manager*).

Entender la arquitectura interna de PHP-FPM es fundamental para cualquier SysAdmin que busque alta disponibilidad. Una mala configuración en esta capa es la causa número uno de los famosos errores `502 Bad Gateway` y `504 Gateway Timeout` en WordPress durante picos de tráfico.

### **El Modelo Maestro-Trabajador (Master-Worker)**

PHP-FPM opera bajo un modelo de procesos maestro-trabajador. Cuando inicias el servicio, se levanta un **Proceso Maestro** (ejecutado generalmente por el usuario `root`). Este proceso no ejecuta código PHP; su única función es gestionar el tráfico de red entrante, leer el archivo de configuración y administrar un "pool" (grupo) de **Procesos Trabajadores** (*Worker Processes* o *Children*), que normalmente se ejecutan bajo un usuario sin privilegios como `www-data`.

Son estos procesos trabajadores los que realmente cargan el entorno de WordPress y ejecutan el código. La forma en que el Proceso Maestro decide crear, mantener o destruir a estos trabajadores se define mediante la directiva `pm` (*Process Manager*) en el archivo de configuración del pool (usualmente `www.conf`).

Existen tres arquitecturas o gestores de procesos disponibles: **Static**, **Dynamic** y **Ondemand**.

---

### **1. El gestor estático (`pm = static`)**

En el modo estático, el Proceso Maestro levanta un número fijo y predeterminado de procesos trabajadores desde el momento en que se inicia PHP-FPM. Este número no cambia, independientemente de si el servidor está recibiendo mil peticiones por segundo o ninguna.

* **Cómo funciona:** Si configuras `pm.max_children = 50`, PHP-FPM arrancará exactamente 50 procesos y los mantendrá vivos perpetuamente.
* **Ventajas:** Es la configuración que ofrece el **máximo rendimiento absoluto** y la menor latencia. Al estar los procesos ya creados y esperando en la memoria RAM, no hay penalización de tiempo (*overhead*) por tener que "fabricar" un nuevo proceso cuando entra una petición HTTP.
* **Desventajas:** Consume una cantidad fija de memoria RAM en todo momento. Si el servidor está inactivo, esa RAM está reservada y no puede ser utilizada por otros servicios (como la base de datos MySQL o Redis).
* **Caso de uso en WordPress:** Es el **estándar de oro para servidores dedicados o VPS de alto rendimiento** donde WordPress es el único protagonista. Si tu servidor tiene RAM de sobra, sacrificar una porción fija para garantizar un tiempo de respuesta instantáneo es la mejor estrategia.

### **2. El gestor dinámico (`pm = dynamic`)**

Este es el comportamiento por defecto en casi todas las instalaciones de PHP. En este modo, PHP-FPM ajusta dinámicamente el número de procesos trabajadores en función del tráfico web actual, manteniendo siempre un mínimo de procesos "de repuesto" (*spare*) listos para actuar.

* **Cómo funciona:** Requiere configurar varias directivas. Inicia con un número base de procesos (`pm.start_servers`). Si el tráfico aumenta, el Maestro crea más procesos hasta un límite máximo (`pm.max_children`). Cuando el tráfico baja, destruye los procesos inactivos para liberar memoria, pero siempre mantiene un mínimo listo (`pm.min_spare_servers`).
* **Ventajas:** Ofrece un excelente equilibrio. Libera memoria RAM cuando el sitio no tiene tráfico, pero es capaz de escalar para absorber picos.
* **Desventajas:** Tiene un *overhead* de CPU y latencia. Cuando llega un pico de tráfico repentino (por ejemplo, una campaña de email marketing), NGINX enviará las peticiones a PHP-FPM. Si no hay suficientes procesos de repuesto, NGINX tendrá que esperar a que el Proceso Maestro de FPM "dé a luz" nuevos trabajadores antes de poder atender al usuario.
* **Caso de uso en WordPress:** Entornos de alojamiento compartido, servidores con múltiples sitios web de tráfico moderado, o instancias de VPS con recursos de RAM limitados donde MySQL o Redis compiten por la memoria.

### **3. El gestor bajo demanda (`pm = ondemand`)**

Como su nombre indica, este gestor no mantiene ningún proceso trabajador vivo si no hay peticiones. Solo el Proceso Maestro está activo, consumiendo una cantidad minúscula de RAM.

* **Cómo funciona:** Inicia con **0** procesos trabajadores. Cuando NGINX envía una petición, el Maestro crea un trabajador. Si entran 10 peticiones simultáneas, crea 10 trabajadores (hasta el límite de `pm.max_children`). Una vez que la petición termina, el trabajador se queda inactivo. Si pasa un tiempo determinado (`pm.process_idle_timeout`, usualmente 10 segundos) sin recibir nuevas tareas, el proceso es destruido y la RAM liberada.
* **Ventajas:** Es la configuración que más memoria RAM ahorra.
* **Desventajas:** Tiene el peor rendimiento y la latencia más alta. Cada nuevo visitante (si el servidor estaba inactivo) experimentará el retraso de que el sistema operativo tenga que instanciar un proceso PHP desde cero antes de empezar a procesar WordPress.
* **Caso de uso en WordPress:** Servidores que alojan cientos de sitios de bajísimo tráfico (entornos de pruebas, staging, o sitios en fase de desarrollo). **Nunca debe usarse en un entorno de producción de alta disponibilidad.**

---

### **Comparativa Visual de Comportamiento**

Para ilustrar cómo reaccionan estos gestores ante un pico de tráfico, analicemos el siguiente diagrama conceptual:

```text
=============================================================================
COMPORTAMIENTO DE PROCESOS (RAM) VS. TRÁFICO WEB EN EL TIEMPO
=============================================================================
Tráfico  |    __/\__               (Pico repentino de visitas)
         | __/      \_________     (Tráfico normal / Inactividad)
-----------------------------------------------------------------------------

1. pm = static
Procesos | ========================== (Línea plana: 50 procesos siempre listos)
         | 
(Impacto: Cero latencia. La RAM está bloqueada. El servidor absorbe el impacto 
 sin inmutarse, siempre que no supere los 50 procesos concurrentes).

-----------------------------------------------------------------------------

2. pm = dynamic
Procesos |    __/\__                  (Sube hasta pm.max_children)
         | ===      ====              (Mantiene pm.min_spare_servers)
(Impacto: Pequeña latencia al subir la curva. Libera RAM cuando la curva baja.
 Buen rendimiento general).

-----------------------------------------------------------------------------

3. pm = ondemand
Procesos |    __/\__                  (Sube desde 0 hasta pm.max_children)
         | ___      \_________        (Vuelve a 0 tras el timeout)
(Impacto: Alta latencia al inicio del pico. Máximo ahorro de RAM en inactividad).
=============================================================================

```

### **Conclusión Arquitectónica**

Para la optimización orientada a la **Alta Disponibilidad**, el objetivo es eliminar cualquier latencia introducida por el servidor que frene el TTFB (*Time to First Byte*). Por lo tanto, en un servidor dedicado exclusivamente a servir WordPress, la transición lógica es abandonar el predeterminado `dynamic` y forzar una arquitectura **`static`**.

El desafío crítico de la arquitectura `static` (y el límite máximo de `dynamic`) es saber exactamente cuántos procesos trabajadores (`pm.max_children`) puede permitirse levantar el servidor sin agotar la memoria física y provocar un colapso del sistema operativo por uso excesivo de memoria *Swap*. Esa matemática precisa será el foco de nuestra siguiente sección.

## **3.3 Cálculo y configuración de `pm.max_children`, `pm.start_servers` y `pm.max_requests` para evitar fugas de memoria**

Habiendo comprendido en la sección anterior cómo operan los gestores de procesos, nos enfrentamos al desafío más crítico en la configuración de PHP-FPM: la asignación de recursos.

El error más común en la administración de servidores WordPress es configurar `pm.max_children` con un valor arbitrariamente alto, creyendo que esto permitirá atender más tráfico. En la realidad, esto es una receta para el desastre. Si PHP-FPM levanta más procesos de los que la memoria RAM física puede soportar, el sistema operativo comenzará a usar la memoria *Swap* (disco duro), el rendimiento se desplomará y, eventualmente, el *OOM Killer* (Out of Memory) de Linux asesinará el proceso de la base de datos o del propio servidor web para sobrevivir, provocando una caída total del sitio.

Para evitar esto, la configuración debe basarse en matemáticas precisas.

---

### **Paso 1: Determinar la memoria disponible para PHP**

PHP-FPM no está solo en el servidor. Antes de asignarle memoria, debemos reservar lo que necesitan el sistema operativo y el resto de la pila (NGINX, MySQL/MariaDB, Redis, etc.).

Supongamos un escenario con un servidor de **4 GB de RAM (4096 MB)** dedicado a un único sitio WordPress:

1. **Sistema Operativo + NGINX:** ~500 MB
2. **Base de datos (MySQL/InnoDB Buffer Pool):** ~1000 MB
3. **Redis (Object Cache):** ~250 MB
4. **Margen de seguridad:** ~250 MB

**Memoria disponible para PHP-FPM:** `4096 - (500 + 1000 + 250 + 250) = 2096 MB`.

Tenemos aproximadamente **2 GB** dedicados exclusivamente para que PHP ejecute nuestro código.

### **Paso 2: Calcular el peso de un proceso PHP de WordPress**

No todos los sitios de WordPress consumen lo mismo. Un blog minimalista puede requerir 15 MB por proceso, mientras que un WooCommerce cargado con constructores visuales (como Elementor) y docenas de plugins puede dispararse a 70 MB o 100 MB por petición.

Para calcular el peso promedio en tu servidor real, ejecuta el sitio bajo un tráfico normal y utiliza el siguiente comando en la terminal (asegúrate de cambiar `php-fpm` por el nombre exacto de tu proceso, como `php8.1-fpm`):

```bash
ps --no-headers -o "rss,cmd" -C php-fpm | awk '{ sum+=$1 } END { printf ("%d%s\n", sum/NR/1024,"MB") }'

```

*Nota de SysAdmin:* Si no tienes tráfico real aún, asume un promedio conservador de **60 MB** para un WordPress estándar moderno, o **90 MB** para un eCommerce pesado. Para nuestro cálculo, usaremos **60 MB**.

### **Paso 3: La fórmula de `pm.max_children**`

Con estos dos datos, el cálculo del límite máximo absoluto de procesos es simple:

> **`pm.max_children`** = Memoria RAM dedicada a PHP / Tamaño promedio del proceso

En nuestro ejemplo: `2096 MB / 60 MB = 34.9`.

Redondeamos siempre hacia abajo. Nuestro **`pm.max_children` seguro es 34**. Esto garantiza que, bajo el peor escenario de tráfico (los 34 procesos ocupados simultáneamente), PHP nunca consumirá más memoria de la que le hemos asignado.

---

### **Configuración según la Arquitectura (Static vs. Dynamic)**

Basándonos en nuestro límite máximo de 34 procesos, así es como lo plasmaríamos en el archivo de configuración del pool (`/etc/php/8.x/fpm/pool.d/www.conf`), dependiendo de la arquitectura elegida:

**Si usas la arquitectura Estática (Recomendado para Alta Disponibilidad):**
Solo necesitas configurar una directiva. FPM levantará los 34 procesos al iniciar y los mantendrá en RAM.

```ini
pm = static
pm.max_children = 34

```

**Si usas la arquitectura Dinámica (Para servidores con recursos compartidos):**
Aquí entran en juego las variables de control de procesos *spare* (de repuesto). Como regla general en entornos dinámicos:

* `pm.start_servers`: ~25% de max_children.
* `pm.min_spare_servers`: ~25% de max_children.
* `pm.max_spare_servers`: ~50% de max_children.

```ini
pm = dynamic
pm.max_children = 34
pm.start_servers = 8
pm.min_spare_servers = 8
pm.max_spare_servers = 17

```

---

### **El salvavidas contra las fugas de memoria: `pm.max_requests**`

Incluso con los cálculos perfectos, hay un factor impredecible: **el código de terceros**. WordPress es un ecosistema de plugins, y no todos están bien programados.

Muchos plugins (y a veces bibliotecas del propio PHP) sufren de *memory leaks* (fugas de memoria). Esto ocurre cuando un proceso ejecuta un script, reserva una porción de RAM, pero falla al liberarla completamente cuando termina. En arquitecturas donde los procesos se mantienen vivos mucho tiempo (como `static` o las horas pico de `dynamic`), un proceso que empezó pesando 60 MB puede ir "engordando" a 80 MB, 120 MB o 200 MB tras atender miles de peticiones, colapsando eventualmente el cálculo que hicimos.

Para mitigar esto, PHP-FPM incluye la directiva **`pm.max_requests`**.

```ini
pm.max_requests = 500

```

**¿Cómo funciona?**
Esta directiva le indica al Proceso Maestro: *"Cuando un proceso trabajador haya atendido exactamente 500 peticiones HTTP, asesínalo y crea un clon nuevo y limpio en su lugar"*.

Este reciclaje constante garantiza que cualquier memoria "atrapada" por código ineficiente sea devuelta al sistema operativo.

**Recomendaciones para WordPress:**

* **Valor recomendado:** Entre `500` y `1000`.
* **No lo pongas muy bajo (ej. 50):** Destruir y crear procesos consume ciclos de CPU. Hacerlo constantemente anulará las ventajas de rendimiento de mantener procesos vivos.
* **No lo dejes en 0 (infinito):** A menos que estés ejecutando código propio auditado meticulosamente, el valor predeterminado `0` (que desactiva el reinicio) es un riesgo en un entorno de WordPress con múltiples plugins. Un valor de `500` ofrece el equilibrio perfecto entre estabilidad de memoria a largo plazo y rendimiento.

## **3.4 Implementación y optimización de Zend OPcache: Acelerando la ejecución de scripts precompilados**

En la sección 3.1 exploramos cómo el compilador JIT traduce el código a lenguaje máquina. Sin embargo, antes de llegar al JIT (o si este está desactivado), existe un cuello de botella fundamental en PHP: su naturaleza de lenguaje interpretado.

Por defecto, cada vez que un usuario solicita una página de WordPress, el servidor debe abrir los archivos `.php` del Core, el tema y los plugins, leer el código fuente, analizarlo (*Lexing/Parsing*) y compilarlo en instrucciones intermedias legibles por la máquina virtual de PHP, conocidas como **Opcodes**. Hacer esto en cada petición web es extremadamente ineficiente y consume una cantidad brutal de CPU e I/O de disco.

Aquí es donde **Zend OPcache** cambia las reglas del juego. OPcache interviene en el proceso capturando esos Opcodes recién compilados y almacenándolos en la memoria RAM compartida del servidor.

```text
=========================================================================
FLUJO DE EJECUCIÓN CON Y SIN OPCACHE
=========================================================================

[ Petición HTTP a NGINX -> PHP-FPM ]
                |
                v
       ¿Opcodes en OPcache?
              /   \
          (SÍ)     (NO) -> [Penalización de Rendimiento]
           |         |
           |         v
           |    1. Leer archivos .php desde el disco (I/O overhead)
           |    2. Analizar sintaxis (CPU overhead)
           |    3. Compilar a Opcodes (CPU overhead)
           |    4. Guardar Opcodes en la memoria RAM (OPcache)
           |         |
            \       /
             \     /
              v   v
    [ Zend Engine Ejecuta Opcodes ] -> [ Respuesta HTTP ]
=========================================================================

```

En un entorno optimizado, OPcache debe tener una tasa de aciertos (*Hit Rate*) superior al **98%**. Si PHP tiene que compilar código constantemente, tu servidor está desperdiciando recursos valiosos.

Para lograr esto en WordPress, los valores por defecto del archivo `php.ini` (o el archivo específico de configuración de OPcache, como `10-opcache.ini`) son insuficientes. A continuación, analizamos las directivas críticas para la Alta Disponibilidad.

---

### **1. Asignación de Memoria (`opcache.memory_consumption`)**

Esta directiva define cuánta memoria RAM (en megabytes) se reserva para almacenar los Opcodes compilados. El valor por defecto suele ser **128MB**.

Una instalación limpia de WordPress consume apenas unos 20-30 MB de OPcache. Sin embargo, un sitio con WooCommerce, constructores visuales pesados y docenas de plugins puede llenar 128 MB rápidamente. Cuando OPcache se llena, PHP tiene que purgar scripts antiguos o dejar de cachear nuevos, destruyendo el rendimiento.

* **Recomendación para WordPress estándar:** `256`
* **Recomendación para WooCommerce/Sitios pesados:** `512`

```ini
opcache.memory_consumption = 256

```

### **2. Límite de Archivos (`opcache.max_accelerated_files`)**

OPcache utiliza una tabla hash (diccionario) para mapear los archivos `.php` con sus Opcodes. Esta directiva dicta cuántos archivos individuales puede rastrear. El valor predeterminado es **10000**.

El Core de WordPress ronda los 2,500 archivos PHP. Suma un tema complejo y unos 30 plugins, y sobrepasarás fácilmente los 10,000 archivos. Si superas este límite, OPcache dejará de añadir nuevos archivos a la RAM, obligando a PHP a compilar desde el disco.

* **Recomendación para producción:** Un valor de al menos `50000`. (Nota: Internamente, PHP redondeará este número al primer número primo superior en la lista de tamaños de tablas hash permitidos).

```ini
opcache.max_accelerated_files = 50000

```

### **3. Optimización de Strings (`opcache.interned_strings_buffer`)**

En PHP, cuando usas la misma cadena de texto varias veces (por ejemplo, el nombre de una variable, una clave de un array o el nombre de un *hook* de WordPress), PHP almacena cada instancia en la memoria de forma separada. OPcache incluye un mecanismo de "internamiento de cadenas" que almacena estas cadenas repetidas una sola vez y las comparte entre todos los procesos de PHP-FPM, ahorrando muchísima memoria.

WordPress es un CMS que abusa de las cadenas de texto repetitivas (piensa en funciones como `do_action('wp_head')` o `get_option('siteurl')`). El valor por defecto de **8MB** se agota casi instantáneamente.

* **Recomendación:** Subirlo a `16` o `32` megabytes.

```ini
opcache.interned_strings_buffer = 32

```

### **4. El Secreto del Rendimiento Máximo: Validación de Timestamps**

De todas las configuraciones, esta es la que marca la diferencia entre una configuración de servidor "básica" y una de nivel de "Alta Disponibilidad".

Por defecto, OPcache verifica el disco duro periódicamente para comprobar si un archivo `.php` ha sido modificado recientemente (validando su fecha de modificación o *timestamp*). Si el archivo cambió, OPcache invalida la caché y recompila el archivo.

```ini
; Comportamiento por defecto (Entorno de Desarrollo)
opcache.validate_timestamps = 1
opcache.revalidate_freq = 2

```

Esto significa que cada 2 segundos, PHP interroga al disco duro (`stat()`). En un servidor con alto tráfico y miles de archivos, esta comprobación constante de I/O de disco introduce una latencia innecesaria.

**En un entorno de producción estricto, el código no cambia al vuelo.** Nadie debería estar editando archivos `.php` por FTP o desde el editor de temas de WordPress. Por lo tanto, podemos decirle a PHP que confíe ciegamente en la memoria RAM y nunca consulte el disco:

```ini
; Comportamiento para Producción de Alta Disponibilidad
opcache.validate_timestamps = 0

```

**Atención (Trade-off):** Al establecer `validate_timestamps = 0`, conseguirás el máximo rendimiento posible de PHP. Sin embargo, si actualizas un plugin, el tema o el Core de WordPress, los cambios **no se reflejarán en la web** porque PHP seguirá ejecutando el código antiguo almacenado en RAM.

Para solucionar esto, como veremos en el **Capítulo 8 (Pipelines CI/CD)**, cualquier despliegue o actualización de código debe ir acompañado de una recarga de los procesos de PHP-FPM (`systemctl reload php-fpm`) o de una purga mediante la función `opcache_reset()` para vaciar la memoria y forzar la recompilación del nuevo código de forma controlada.

## **3.5 Límites de recursos en `php.ini`: `memory_limit`, `max_execution_time` y su relación con tareas pesadas en WP**

Hasta ahora hemos optimizado la arquitectura de PHP-FPM a nivel de servidor y procesos (cuántos trabajadores actúan y cómo manejan la caché). Sin embargo, un servidor de Alta Disponibilidad debe tener mecanismos de defensa contra el código en sí mismo. ¿Qué ocurre cuando un único plugin entra en un bucle infinito o intenta cargar una tabla de base de datos de 2 GB en la memoria?

Para evitar que un solo proceso acapare todos los recursos y provoque un efecto dominó que tumbe el servidor, debemos establecer límites estrictos a nivel de script individual. Esto se controla mediante el archivo principal de configuración de PHP (`php.ini`).

En el ecosistema de WordPress, dos directivas son las protagonistas absolutas de la estabilidad: `memory_limit` y `max_execution_time`.

---

### **1. `memory_limit`: Conteniendo el apetito de RAM**

Esta directiva define la cantidad máxima de memoria RAM que un **único script de PHP** tiene permitido asignar. Es una red de seguridad. Si el límite es 256 MB y un script intenta consumir 257 MB, PHP detendrá la ejecución inmediatamente y registrará un error fatal (`Fatal error: Allowed memory size of X bytes exhausted`).

**La jerarquía de la memoria en WordPress:**
Uno de los errores más comunes de los administradores de WordPress es la confusión entre los límites de PHP y los límites internos de la aplicación. WordPress intenta gestionar su propia memoria a través de las constantes en `wp-config.php`:

* `WP_MEMORY_LIMIT`: Define la memoria para el *frontend* (por defecto 40MB).
* `WP_MAX_MEMORY_LIMIT`: Define la memoria para el área de administración `/wp-admin/` (por defecto 256MB).

Sin embargo, **WordPress nunca puede superar el límite físico impuesto por el servidor en `php.ini**`. Si tu `php.ini` tiene `memory_limit = 128M`, y configuras `WP_MAX_MEMORY_LIMIT = 512M` en `wp-config.php`, WordPress fallará al llegar a los 128 MB. El servidor web siempre tiene la última palabra.

**Recomendaciones para Alta Disponibilidad:**
En un entorno bien optimizado, un sitio web no debería necesitar cantidades masivas de memoria para renderizar una página. Darle demasiada memoria a PHP (`memory_limit = 1G`) es peligroso, ya que permite que scripts ineficientes sigan funcionando en lugar de fallar y ser detectados.

* **Sitios estándar / Blogs:** `memory_limit = 128M`
* **eCommerce (WooCommerce) / LMS:** `memory_limit = 256M` o `512M` (debido al alto costo de procesamiento de carritos y paneles de control).

```ini
; /etc/php/8.x/fpm/php.ini
memory_limit = 256M

```

---

### **2. `max_execution_time`: La trampa del 504 Gateway Timeout**

Esta directiva establece el tiempo máximo (en segundos) que se le permite a un script ejecutarse antes de que el motor de PHP lo termine a la fuerza. Su propósito es evitar que scripts mal programados bloqueen los procesos trabajadores de PHP-FPM indefinidamente.

* El valor por defecto es **30 segundos**.
* Para cargar una página normal en WordPress, el script suele tardar entre 0.1 y 1.5 segundos. Por lo tanto, 30 segundos es más que suficiente para el tráfico estándar.

**El problema de las tareas pesadas en WordPress:**
El desafío surge en el panel de administración (`wp-admin`). Tareas como actualizar un plugin pesado, importar un archivo XML con miles de productos o generar miniaturas de imágenes pueden tardar varios minutos. Si `max_execution_time` se agota, la tarea se corrompe a la mitad.

Aquí es donde entra el factor crítico en la arquitectura LEMP (Linux, NGINX, MySQL, PHP): **La alineación de *Timeouts***.

NGINX, como proxy inverso, tiene sus propios límites de tiempo cuando espera una respuesta de PHP-FPM, gobernados por la directiva `fastcgi_read_timeout` (que por defecto suele ser 60 segundos). Si PHP tiene permiso para correr durante 300 segundos, pero NGINX se rinde a los 60, el usuario verá un error **`504 Gateway Timeout`**, aunque PHP siga trabajando en segundo plano.

```text
=============================================================================
LA CADENA DE TIMEOUTS (Causa del Error 504)
=============================================================================

[ Navegador ] ---> [ NGINX ] ---------------------> [ PHP-FPM ]
                             esperando respuesta...
                                                       |
                       (Límite: fastcgi_read_timeout)  (Límite: max_execution_time)
                       Ej: 60 segundos                 Ej: 300 segundos

* Escenario de fallo:
Segundo 60: NGINX corta la conexión por timeout y envía "504" al navegador.
Segundo 61 a 300: PHP sigue procesando la tarea (consumiendo CPU y RAM) 
pero el usuario ya vio el error. ¡Un desperdicio absoluto de recursos!
=============================================================================

```

**La solución arquitectónica:**

1. **Alineación:** Si necesitas aumentar el tiempo de ejecución en `php.ini` para operaciones administrativas, **debes** igualar el límite en la configuración del bloque de NGINX de ese sitio.
2. **Valores seguros:** Un límite de `180` o `300` segundos es razonable para la mayoría de eCommerce pesados.

*En `php.ini`:*

```ini
max_execution_time = 300

```

*En el *Server Block* de NGINX (`/etc/nginx/sites-available/tusitio.com`):*

```nginx
location ~ \.php$ {
    # ... otras configuraciones fastcgi ...
    fastcgi_read_timeout 300;
}

```

---

### **3. Límites complementarios: Subida de archivos y el método POST**

Para que un sitio de WordPress funcione correctamente, especialmente al subir temas, plugins o archivos multimedia de gran tamaño, hay otras dos variables estrechamente relacionadas con la memoria y el tiempo de ejecución que deben ajustarse en bloque.

Estas directivas controlan el tamaño de los datos que PHP acepta desde una petición HTTP:

* `post_max_size`: El tamaño total máximo de todo el cuerpo de la petición (texto + archivos).
* `upload_max_filesize`: El tamaño máximo de un *único* archivo subido.

**Regla de oro de la configuración:** El límite de memoria siempre debe ser mayor que el tamaño del POST, y el tamaño del POST mayor que el tamaño del archivo. `memory_limit` > `post_max_size` > `upload_max_filesize`.

```ini
; Configuración recomendada para un entorno WP versátil
memory_limit = 256M
post_max_size = 128M
upload_max_filesize = 64M

```

*(Nota: Al igual que con los tiempos de ejecución, NGINX tiene su propio límite de tamaño de subida en la directiva `client_max_body_size`, que también debe subirse a, por ejemplo, `128M` para evitar el error "413 Request Entity Too Large").*

### **Conclusión: Cambiando el paradigma de las tareas pesadas**

En la filosofía estricta de un SysAdmin orientado a la Alta Disponibilidad, **las tareas de larga duración no deberían ejecutarse a través de peticiones web (HTTP)**.

Ampliar `max_execution_time` a 600 segundos (10 minutos) es una solución temporal ("parche") que expone los procesos web (diseñados para ser rápidos y efímeros) al riesgo de atascos. La solución definitiva para tareas pesadas en WordPress es el uso de **WP-CLI**, que abordaremos en el Capítulo 8. Al ejecutar tareas desde la consola (`php-cli`), el límite de ejecución es infinito (`max_execution_time = 0`) y no depende de los tiempos de espera de NGINX ni de los procesos trabajadores de FPM, dejando el servidor web 100% libre para atender a los visitantes.
