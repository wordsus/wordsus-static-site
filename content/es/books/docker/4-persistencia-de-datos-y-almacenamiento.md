En Docker, la agilidad tiene un precio: la **volatilidad**. Por defecto, un contenedor es una entidad efímera; si se detiene y elimina, cualquier dato generado en su interior desaparece para siempre. Este comportamiento, ideal para la escalabilidad, es un desafío para bases de datos y aplicaciones con estado.

En este capítulo, aprenderás a separar el ciclo de vida del software del de la información. Exploraremos cómo los **Volumes** y **Bind Mounts** permiten que los datos sobrevivan a la destrucción de los contenedores, garantizando persistencia, rendimiento y seguridad en entornos de producción.

## 4.1. El problema del almacenamiento efímero en contenedores

En los capítulos anteriores, hemos visto cómo los contenedores brillan gracias a su portabilidad y, sobre todo, a la **inmutabilidad** de sus imágenes. Esta inmutabilidad nos garantiza que un contenedor se ejecutará exactamente igual en el entorno de desarrollo que en producción. Sin embargo, esta misma fortaleza introduce el mayor desafío arquitectónico cuando tratamos con bases de datos o aplicaciones con estado (Stateful): **la gestión de los datos generados durante la ejecución**.

Para entender el problema del almacenamiento en Docker, primero debemos comprender qué ocurre exactamente cuando un contenedor entra en ejecución y por qué decimos que su almacenamiento por defecto es "efímero".

### La Capa de Lectura/Escritura (The Container Layer)

Como vimos en la sección *3.1* al analizar el sistema de archivos por capas (UnionFS), una imagen de Docker es fundamentalmente una pila de capas de solo lectura. Cuando instanciamos un contenedor a partir de esa imagen usando `docker run`, el motor de Docker no modifica la imagen original. En su lugar, añade una capa superior muy delgada conocida como **Capa de Contenedor (Container Layer)**.

```text
+---------------------------------------------------+
|               Capa de Contenedor                  |
|          (Lectura / Escritura - EFÍMERA)          |  <-- Todos los cambios ocurren aquí
+---------------------------------------------------+
|                 Capa de Imagen                    |
|           (Solo Lectura - INMUTABLE)              |
+---------------------------------------------------+
|                 Capa de Imagen                    |
|           (Solo Lectura - INMUTABLE)              |
+---------------------------------------------------+
|               Imagen Base (ej. Alpine)            |
|           (Solo Lectura - INMUTABLE)              |
+---------------------------------------------------+

```

Cualquier archivo nuevo que la aplicación cree, cualquier log que escriba, o cualquier archivo de la imagen base que modifique, se guarda exclusivamente en esta capa superior de Lectura/Escritura.

### Los tres grandes problemas del almacenamiento por defecto

Depender de la capa del contenedor para almacenar datos críticos presenta tres problemas fundamentales en entornos de producción:

**1. La destrucción inminente de los datos (El ciclo de vida)**
El acoplamiento temporal es el problema más evidente. Los datos guardados en la capa del contenedor están estrechamente ligados al ciclo de vida de *esa instancia específica* del contenedor.

* Si detienes el contenedor (`docker stop`), los datos persisten.
* **Pero si eliminas el contenedor (`docker rm`), la Capa de Contenedor se destruye permanentemente**, llevándose consigo cualquier base de datos, archivo subido por un usuario o configuración generada en tiempo de ejecución. En la cultura DevOps, los contenedores deben ser tratados como ganado, no como mascotas (desechables y reemplazables en cualquier momento). Si tus datos mueren con tu contenedor, tu arquitectura es frágil.

**2. La penalización de rendimiento (Copy-on-Write)**
Escribir datos en la capa del contenedor requiere que el motor de almacenamiento de Docker (el *Storage Driver*, que analizaremos a bajo nivel en el *Capítulo 11*) gestione las escrituras. Cuando un contenedor modifica un archivo que ya existe en las capas inferiores, Docker debe realizar una operación llamada **Copy-on-Write (CoW)**:

1. Busca el archivo a través de las capas de solo lectura.
2. Copia ese archivo hacia la capa superior de lectura/escritura.
3. Aplica la modificación sobre la copia.

Este proceso de abstracción añade latencia y reduce significativamente el rendimiento de las operaciones de entrada/salida (I/O). Para aplicaciones con una alta carga de escritura, como un motor de base de datos PostgreSQL o MongoDB, escribir en la capa efímera resulta en un rendimiento inaceptable.

**3. El aislamiento e inaccesibilidad**
Los datos que residen en la capa de lectura/escritura de un contenedor son extremadamente difíciles de extraer, respaldar o compartir. Si tienes dos contenedores que necesitan leer los mismos datos (por ejemplo, un servidor web Nginx y un procesador de imágenes en Python), la capa efímera no permite compartir información entre ellos de forma nativa y eficiente.

### La Regla de Oro del Almacenamiento en Docker

Como ingenieros DevOps, la regla que debemos aplicar es simple: **La capa de lectura/escritura del contenedor debe usarse únicamente para datos verdaderamente temporales**, aquellos cuya pérdida no impacte a la aplicación (ej. cachés en memoria, archivos `.pid`, o archivos temporales de procesamiento).

Para cualquier dato que deba sobrevivir a la destrucción del contenedor, necesitamos extraer el almacenamiento del ciclo de vida del contenedor y pasarlo al host o a un sistema externo. Aquí es donde entran en juego los mecanismos de persistencia reales que resolverán este problema, los cuales exploraremos en la siguiente sección.

## 4.2. Tipos de montaje en Docker: Volumes, Bind Mounts y tmpfs

Para resolver el problema de la volatilidad de los datos que analizamos en la sección anterior, Docker proporciona mecanismos de **montaje (mounting)**. Estos mecanismos permiten que un contenedor lea y escriba datos en el sistema de archivos de la máquina host (o en la memoria), esquivando por completo la capa efímera de lectura/escritura (UnionFS).

Docker ofrece tres formas principales de montar datos en un contenedor. La elección entre una u otra no es cuestión de preferencias, sino de casos de uso y arquitectura.

A continuación, un diagrama conceptual de cómo interactúan estos tres mecanismos con el sistema host:

```text
+---------------------------------------------------------------+
|                      MÁQUINA HOST                             |
|                                                               |
|  +-------------------------+       +-----------------------+  |
|  |    Sistema de Archivos  |       | Memoria RAM del Host  |  |
|  |                         |       |                       |  |
|  |  /var/lib/docker/       |       |                       |  |
|  |      [ VOLUMES ] <------|-------|------ [ tmpfs ]       |  |
|  +-------------------------+       +-----------------------+  |
|             ^                                  ^              |
|             |                                  |              |
|  +-------------------------+                   |              |
|  | Cualquier ruta del host |                   |              |
|  | (/home/user/app/src)    |                   |              |
|  |    [ BIND MOUNTS ] <----|--+                |              |
|  +-------------------------+  |                |              |
+-------------------------------|----------------|--------------+
                                |                |
                                v                v
                     +-----------------------------------+
                     |           CONTENEDOR              |
                     |     (Capa efímera ignorada)       |
                     +-----------------------------------+

```

Analicemos en profundidad cada uno de ellos.

### 1. Volúmenes (Volumes)

Los volúmenes son el mecanismo preferido y más seguro para persistir datos en Docker. Cuando creas un volumen, este se almacena en una parte del sistema de archivos del host que es **administrada exclusivamente por Docker** (en sistemas Linux, habitualmente en `/var/lib/docker/volumes/`).

A diferencia de otros métodos, los procesos externos a Docker no deberían modificar esta ruta.

**Características principales:**

* **Aislamiento:** Al estar gestionados por el demonio de Docker, son independientes de la estructura de directorios del sistema operativo subyacente. Esto los hace 100% portables entre Linux, Windows (WSL2) y macOS.
* **Ciclo de vida propio:** Los volúmenes sobreviven a la eliminación del contenedor (`docker rm`). Si eliminas un contenedor de PostgreSQL, el volumen con la base de datos sigue existiendo y puede ser acoplado a un nuevo contenedor.
* **Compartición:** Varios contenedores pueden montar el mismo volumen simultáneamente, permitiendo compartir estado de forma segura.
* **Drivers de terceros:** Soportan *Volume Drivers*, lo que permite almacenar los datos directamente en un bucket de AWS S3, un recurso NFS corporativo o almacenamiento en la nube, sin cambiar el código de la aplicación (lo veremos en la sección 4.6).

**Caso de uso ideal:** Persistencia de bases de datos (PostgreSQL, MySQL, Redis), almacenamiento de archivos generados por los usuarios en producción, y cualquier dato crítico que deba ser respaldado o migrado.

### 2. Montajes de Enlace (Bind Mounts)

Los *Bind Mounts* existen desde los primeros días de Docker y su concepto es muy directo: mapeas una ruta o archivo exacto del sistema host directamente dentro del contenedor.

Por ejemplo, puedes decirle a Docker: *"Toma la carpeta `/home/dev/mi_proyecto/src` de mi laptop y móntala en `/app/src` dentro del contenedor"*.

**Características principales:**

* **Dependencia del Host:** El contenedor se acopla a la estructura de directorios de la máquina donde se ejecuta. Si mueves el contenedor a otro servidor donde esa ruta no existe, fallará.
* **Bidireccionalidad extrema:** Cualquier cambio que haga el contenedor se refleja inmediatamente en el host, y viceversa.
* **Riesgo de seguridad (Cuidado Senior):** Un contenedor con los privilegios adecuados y un Bind Mount mal configurado (por ejemplo, montando `/` o `/etc/`) podría alterar archivos críticos del sistema operativo host.

**Caso de uso ideal:** Entornos de **Desarrollo (Local)**. Los Bind Mounts son la pieza clave para el *Live Reload* o *Hot Reloading*. Montas el código fuente local dentro del contenedor; cuando editas el código en tu IDE (VS Code, IntelliJ), el contenedor detecta el cambio instantáneamente sin necesidad de reconstruir la imagen.

### 3. Montajes tmpfs (tmpfs mounts)

A diferencia de los Volúmenes y los Bind Mounts, los montajes `tmpfs` **no persisten en el disco duro del host**. En su lugar, se almacenan temporalmente en la memoria RAM del sistema operativo host. Una vez que el contenedor se detiene, el montaje `tmpfs` se destruye y el espacio de memoria es liberado.

**Características principales:**

* **Velocidad máxima:** Al operar exclusivamente en RAM, las velocidades de lectura y escritura son insuperables.
* **Volatilidad intencional:** Nunca se escribe nada en la capa efímera del contenedor (evitando el penalizador *Copy-on-Write*) ni en el disco del host.
* **Limitación por SO:** Solo están disponibles si estás ejecutando Docker en Linux (o a través de WSL2/máquinas virtuales de Linux en Windows y Mac).

**Caso de uso ideal:** 1. **Seguridad:** Para montar llaves criptográficas, secretos, o tokens temporales que bajo ninguna circunstancia deben tocar un disco físico o quedar registrados si la máquina se compromete.
2. **Rendimiento:** Para aplicaciones que necesitan procesar grandes cantidades de datos temporales a máxima velocidad y luego descartarlos sin agotar el I/O del disco duro.

### Resumen comparativo para la toma de decisiones

Como arquitecto o DevOps, tu decisión debe basarse en la siguiente matriz:

| Característica | Volumes | Bind Mounts | tmpfs |
| --- | --- | --- | --- |
| **Ubicación en el Host** | Gestionada por Docker | Cualquier ruta elegida por el usuario | Memoria RAM |
| **Persistencia tras `docker rm**` | Sí | Sí | No |
| **Ideal para Producción** | Sí (Altamente recomendado) | No (Salvo casos muy específicos) | Sí (Para secretos/caché en RAM) |
| **Ideal para Desarrollo** | No (Poco ágil para inyectar código local) | Sí (Perfecto para Live Reload) | Depende del caso |
| **Portabilidad** | Alta | Baja (Depende del File System local) | Media (Solo Linux) |

En la siguiente sección, nos ensuciaremos las manos y pasaremos a la práctica. Aprenderemos cómo crear, inspeccionar y gestionar el ciclo de vida de los Volúmenes usando el Docker CLI, asegurando que nuestras bases de datos sobrevivan a cualquier catástrofe.

## 4.3. Creación, inspección y gestión del ciclo de vida de los Volúmenes

Ahora que comprendemos que los Volúmenes son la solución nativa y segura para la persistencia en Docker, es momento de bajar a la terminal. En el pasado, los volúmenes solían crearse implícitamente al iniciar un contenedor. Sin embargo, la mejor práctica actual (y la que se espera de un perfil Senior) es **gestionar los volúmenes como entidades independientes** con su propio ciclo de vida.

Docker proporciona la familia de comandos `docker volume` para este propósito. Vamos a recorrer el ciclo de vida completo de un volumen paso a paso.

### 1. Creación y listado de Volúmenes

Para crear un volumen de forma explícita antes de que cualquier contenedor lo necesite, utilizamos el comando `create`. Supongamos que estamos preparando la infraestructura para una base de datos PostgreSQL:

```bash
$ docker volume create pg_data
pg_data

```

Podemos verificar que el volumen existe listando todos los volúmenes disponibles en nuestro host:

```bash
$ docker volume ls
DRIVER    VOLUME NAME
local     pg_data

```

> **Nota Senior:** Si no especificas un driver, Docker usa por defecto el driver `local`, que guarda los datos directamente en el disco del host. En la sección 4.6 veremos cómo cambiar esto para usar almacenamiento en la nube.

### 2. Inspección: ¿Dónde están realmente mis datos?

Uno de los mayores misterios cuando se empieza con Docker es saber dónde se guardan físicamente los archivos del volumen. Para descubrirlo, usamos `docker volume inspect`:

```bash
$ docker volume inspect pg_data
[
    {
        "CreatedAt": "2023-10-27T10:00:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/pg_data/_data",
        "Name": "pg_data",
        "Options": {},
        "Scope": "local"
    }
]

```

La clave aquí es el **`Mountpoint`**. Esa es la ruta real en tu sistema operativo host (si usas Linux) donde residirán los datos. Si entras a `/var/lib/docker/volumes/pg_data/_data` como usuario `root`, verás exactamente los mismos archivos que el contenedor ve en su interior.

### 3. Acoplando el Volumen al Contenedor (`-v` vs `--mount`)

Una vez que el volumen existe, debemos inyectarlo en el contenedor durante su ejecución. Históricamente, se usaba el flag `-v` (o `--volume`), pero su sintaxis era confusa.

**La recomendación oficial para entornos de producción es utilizar el flag `--mount`.** Es mucho más explícito, seguro y fácil de leer, ya que utiliza pares clave-valor.

Veamos cómo montar nuestro volumen `pg_data` en un contenedor de PostgreSQL:

```bash
$ docker run -d \
  --name mi_postgres \
  -e POSTGRES_PASSWORD=superseguro \
  --mount source=pg_data,target=/var/lib/postgresql/data \
  postgres:15-alpine

```

Desglosemos el flag `--mount`:

* `source=pg_data`: El nombre del volumen que creamos en el paso 1. (Si no existiera, Docker lo crearía automáticamente en este punto).
* `target=/var/lib/postgresql/data`: La ruta *dentro* del contenedor donde PostgreSQL espera encontrar sus bases de datos.

Cualquier escritura que haga el motor de PostgreSQL en su directorio interno `/var/lib/postgresql/data` irá a parar directamente a nuestro volumen seguro.

### 4. Destrucción y Limpieza (Pruning)

Como mencionamos en la sección anterior, si eliminamos el contenedor (`docker rm -f mi_postgres`), **el volumen `pg_data` permanece intacto**.

Si deseas eliminar el volumen de forma permanente (y destruir todos los datos que contiene), debes hacerlo explícitamente:

```bash
docker volume rm pg_data

```

*Docker te impedirá eliminar un volumen si actualmente está siendo utilizado (montado) por un contenedor, incluso si ese contenedor está detenido.*

Finalmente, en servidores de desarrollo o entornos de Integración Continua (CI), es común acumular decenas de volúmenes "huérfanos" (volúmenes que ya no están asociados a ningún contenedor). Para limpiar tu disco duro y eliminar **todos** los volúmenes que no estén en uso, Docker ofrece un comando de limpieza agresiva:

```bash
$ docker volume prune
WARNING! This will remove all local volumes not used by at least one container.
Are you sure you want to continue? [y/N] y

```

*(Profundizaremos en estrategias de limpieza más avanzadas en el Capítulo 10).*

Gestionar los volúmenes como recursos independientes te da un control total sobre el estado de tu aplicación. Ahora que sabemos cómo crear y asignar un volumen a un solo contenedor, surge un patrón de arquitectura muy potente: conectar múltiples servicios a la misma fuente de verdad.

## 4.4. Compartir datos entre múltiples contenedores

Hasta ahora hemos tratado a los volúmenes como un mecanismo para asegurar que los datos de un único contenedor sobrevivan a su destrucción. Sin embargo, el verdadero potencial arquitectónico de los volúmenes en Docker se desata cuando rompemos la relación uno a uno (1:1) y comenzamos a montar un mismo volumen en **múltiples contenedores simultáneamente**.

Este patrón es fundamental para arquitecturas de microservicios y despliegues con contenedores auxiliares (el famoso patrón *Sidecar*).

### El Patrón Productor-Consumidor

El caso de uso más común para compartir datos es tener un contenedor que genera información (Productor) y otro contenedor que la procesa, sirve o analiza (Consumidor).

Veamos un diagrama conceptual de esta arquitectura:

```text
+-------------------------+                                +-------------------------+
|     Contenedor A        |                                |     Contenedor B        |
|    (App Principal)      |                                |   (Agente / Sidecar)    |
|                         |       +----------------+       |                         |
|  Escribe logs o assets  | ====> |    VOLUMEN     | ====> | Lee logs para enviar a  |
|                         |       | (shared_data)  |       | Datadog, ELK o servir   |
|   Montaje: LECTURA Y    |       +----------------+       |                         |
|      ESCRITURA (R/W)    |                                |  Montaje: SOLO LECTURA  |
+-------------------------+                                |          (R/O)          |
                                                           +-------------------------+

```

Imaginemos un escenario clásico: tienes una aplicación web en Nginx que genera logs de acceso de forma constante, y necesitas un segundo contenedor (por ejemplo, un agente de Fluentd o un simple recolector en Alpine) que lea esos logs para enviarlos a un servidor centralizado.

Primero, creamos el volumen compartido:

```bash
docker volume create app_logs

```

Luego, levantamos el contenedor principal (Nginx) montando el volumen con permisos de escritura por defecto:

```bash
$ docker run -d \
  --name web_server \
  --mount source=app_logs,target=/var/log/nginx \
  nginx:alpine

```

Finalmente, levantamos nuestro contenedor consumidor apuntando al mismo volumen:

```bash
$ docker run -d \
  --name log_forwarder \
  --mount source=app_logs,target=/logs \
  alpine tail -f /logs/access.log

```

En este momento, ambos contenedores están accediendo físicamente al mismo directorio en el host. Cuando Nginx escribe en `/var/log/nginx`, el contenedor de Alpine ve ese cambio instantáneamente en su directorio `/logs`.

### Seguridad Senior: Montajes de Solo Lectura (Read-Only)

Si observas el ejemplo anterior con una mentalidad orientada a la seguridad (DevSecOps), notarás un vector de riesgo. El contenedor `log_forwarder` solo necesita *leer* los logs, pero por defecto, Docker monta los volúmenes con permisos de lectura y escritura (R/W). Si el contenedor secundario fuera comprometido, un atacante podría alterar o borrar los logs del contenedor principal.

Para aplicar el **Principio de Menor Privilegio**, siempre debemos restringir el acceso del consumidor usando la opción `readonly` (o `:ro` si usas la sintaxis antigua `-v`).

Corrijamos la ejecución de nuestro consumidor usando las mejores prácticas:

```bash
$ docker run -d \
  --name log_forwarder_seguro \
  --mount source=app_logs,target=/logs,readonly \
  alpine tail -f /logs/access.log

```

Al agregar la directiva `readonly`, le indicamos al demonio de Docker que bloquee cualquier intento de escritura desde este contenedor hacia el volumen. Si el proceso de Alpine intenta hacer un `touch /logs/archivo_falso.txt`, el sistema de archivos le devolverá un error de "Read-only file system".

### El flag `--volumes-from` (Herencia de montajes)

Existe una utilidad avanzada en el CLI de Docker que es muy útil para tareas de mantenimiento o depuración rápida: el flag `--volumes-from`.

En lugar de especificar manualmente todos los volúmenes que tiene un contenedor usando `--mount`, puedes decirle a un nuevo contenedor que "herede" o copie exactamente la misma configuración de volúmenes de un contenedor existente.

Por ejemplo, si tienes un contenedor llamado `db_data` que tiene montados tres volúmenes diferentes, y quieres levantar un contenedor temporal de Ubuntu para inspeccionar todos esos datos, puedes ejecutar:

```bash
$ docker run --rm -it \
  --volumes-from db_data \
  ubuntu bash

```

Este comando mapeará automáticamente en tu contenedor interactivo de Ubuntu todos los volúmenes en las mismas rutas exactas donde están montados en `db_data`. Es una herramienta indispensable en el cinturón de un ingeniero DevOps para realizar diagnósticos o backups manuales sin tener que recordar o reescribir complejas rutas de montaje.

Compartir datos es esencial, pero también introduce la necesidad de protegerlos. Ahora que dominamos cómo crear y distribuir volúmenes, estamos listos para asegurar que esa información nunca se pierda.

## 4.5. Estrategias de Backup, restauración y migración de Volúmenes

Hemos establecido que los volúmenes protegen nuestros datos de la destrucción del contenedor. Sin embargo, un volumen **no es un backup**. Si un desarrollador ejecuta accidentalmente un `DROP TABLE` en producción, el volumen persistirá obedientemente esa base de datos vacía.

Para alcanzar un nivel de madurez Senior en nuestras operaciones, necesitamos una estrategia robusta para extraer los datos de los volúmenes, respaldarlos de forma segura y restaurarlos (o migrarlos a otro servidor) cuando sea necesario.

El desafío principal radica en que los volúmenes están aislados y gestionados por Docker. No debemos intentar copiar los archivos directamente desde `/var/lib/docker/volumes/` en el host, ya que podríamos enfrentarnos a problemas de permisos o corromper los datos si el motor de Docker los está utilizando.

La solución elegante y nativa de Docker es utilizar el **Patrón del Contenedor Efímero**.

### El Patrón del Contenedor Efímero para Backups

Este patrón consiste en levantar un contenedor ligero (como Alpine o Ubuntu) que viva únicamente el tiempo necesario para comprimir los datos y luego se autodestruya.

Este es el flujo de trabajo conceptual:

```text
                               CONTENEDOR EFÍMERO (Alpine)
                             +-----------------------------+
                             |                             |
[ VOLUMEN DE DATOS ] =======>| 1. Lee los datos del Vol.   |
  (Ej. pg_data)     --mount  |                             |
                             | 2. Comprime en un .tar      |
                             |                             |
[ DIRECTORIO HOST  ] <=======| 3. Guarda el .tar en el Host|
  (Ej. ./backups)   --mount  |                             |
                             +-----------------------------+
                                     (Se destruye al terminar)

```

### 1. Realizando un Backup (Extracción)

Supongamos que tenemos un contenedor llamado `db_produccion` que utiliza un volumen montado en `/var/lib/postgresql/data`. Queremos crear un archivo `.tar` con esos datos y guardarlo en la carpeta actual de nuestra máquina host.

Ejecutaremos el siguiente comando:

```bash
$ docker run --rm \
  --volumes-from db_produccion \
  --mount type=bind,source=$(pwd),target=/backup \
  alpine tar -cvf /backup/backup_db_2023.tar /var/lib/postgresql/data

```

**Desglosando la magia (Hardskills):**

* `--rm`: La clave del patrón efímero. Le dice a Docker que elimine este contenedor de Alpine en el milisegundo en que termine de ejecutarse el comando `tar`. No deja basura.
* `--volumes-from db_produccion`: Como vimos en la sección *4.4*, esto mapea el volumen de la base de datos exactamente en la misma ruta dentro de nuestro contenedor Alpine temporal.
* `--mount type=bind...`: Usamos un Bind Mount para inyectar nuestra carpeta local actual (`$(pwd)`) dentro del contenedor en la ruta `/backup`.
* `alpine tar...`: Es el comando que se ejecuta. Toma los datos, los comprime en un `.tar` y los escupe en la carpeta `/backup` (que, gracias al Bind Mount, es nuestro disco duro local).

Al finalizar, tendrás un archivo `backup_db_2023.tar` listo para ser subido a un almacenamiento en frío (como Amazon S3 Glacier).

### 2. Restauración de un Backup

Restaurar es simplemente el proceso inverso. Imagina que ocurre un desastre, pierdes tu servidor y necesitas levantar la base de datos en un entorno completamente nuevo a partir del archivo `.tar`.

**Paso A: Crear un volumen vacío nuevo.**

```bash
docker volume create pg_data_recuperado

```

**Paso B: Usar un contenedor efímero para descomprimir.**
Inyectamos tanto el volumen vacío como el archivo `.tar` en un contenedor temporal para que haga el trabajo de extracción:

```bash
$ docker run --rm \
  --mount source=pg_data_recuperado,target=/datos_destino \
  --mount type=bind,source=$(pwd),target=/backup \
  alpine sh -c "cd /datos_destino && tar -xvf /backup/backup_db_2023.tar --strip-components=1"

```

> **Nota Senior (`--strip-components=1`):** Al comprimir, `tar` guarda la estructura de directorios absoluta (ej. `/var/lib/postgresql/data`). Al extraer, si no tenemos cuidado, anidaremos carpetas innecesariamente. `--strip-components` recorta la ruta original para que los archivos caigan limpiamente en la raíz del nuevo volumen.

### 3. Migración entre Servidores

La migración no es más que la combinación de un Backup y una Restauración, unidos por una transferencia de red. Si necesitas mover un volumen del `Servidor A` al `Servidor B`, el pipeline clásico de un SysAdmin o DevOps sería:

1. **Servidor A:** Ejecutar el backup con el contenedor efímero (`tar`).
2. **Red:** Transferir el archivo de forma segura mediante SSH usando `scp` o `rsync` (`scp backup.tar usuario@servidor-b:/rutal/local`).
3. **Servidor B:** Ejecutar la restauración en el nuevo volumen.

### Advertencia Crítica: Consistencia de Datos en Caliente

Antes de automatizar scripts de compresión `tar` con `cron`, es vital entender una limitación técnica. Copiar archivos a nivel de sistema de archivos (File-level backup) mientras una base de datos está activa escribiendo transacciones en el disco **puede generar un backup corrupto**.

Si Docker lee un archivo grande justo en el momento en que el motor de PostgreSQL lo está modificando a la mitad, el `.tar` resultante será inconsistente.

* **La solución de fuerza bruta:** Detener el contenedor de la base de datos (`docker stop db_produccion`), hacer el backup y volver a iniciarlo. Esto implica tiempo de inactividad (Downtime).
* **La solución elegante (Logical Backup):** Para bases de datos, siempre es preferible usar las herramientas nativas del motor enviadas a través de la red de Docker o usando `docker exec`, en lugar de hacer un backup del volumen entero. Por ejemplo:

```bash
docker exec -t db_produccion pg_dumpall -c -U usuario_postgres > dump_logico.sql

```

Guardar los datos localmente y hacer copias de seguridad manuales está bien para un solo nodo, pero cuando nuestra infraestructura escala, necesitamos que Docker hable directamente con proveedores de almacenamiento externos.

## 4.6. Uso de drivers de volumen de terceros (NFS, Cloud Storage)

Hasta este punto de nuestro recorrido, hemos confiado ciegamente en el driver por defecto de Docker: el driver `local`. Como su nombre indica, este aprovisiona el almacenamiento directamente en el disco físico del servidor donde se ejecuta el demonio de Docker.

Para un entorno de desarrollo o un servidor de producción único (Single-Node), esto es perfectamente funcional. Sin embargo, como ingenieros Senior, debemos diseñar pensando en la **alta disponibilidad y la tolerancia a fallos**.

¿Qué ocurre si la placa base de nuestro servidor se quema? ¿O si estamos balanceando carga entre tres servidores de Docker y un usuario sube una imagen de perfil al Servidor A, pero su siguiente petición es atendida por el Servidor B?

Aquí es donde la arquitectura de almacenamiento local se rompe y necesitamos externalizar el estado.

```text
       [ Infraestructura Distribuida con Almacenamiento Externo ]

+---------------+       +---------------+       +---------------+
| Docker Host 1 |       | Docker Host 2 |       | Docker Host 3 |
|  (App Web)    |       |  (App Web)    |       |  (Worker)     |
+-------+-------+       +-------+-------+       +-------+-------+
        |                       |                       |
        |      ===================================      |
        +====> ||       RED INTERNA / CLOUD     || <====+
               ===================================
                                |
                                v
               +-----------------------------------+
               |     ALMACENAMIENTO CENTRALIZADO   |
               | (NFS, AWS EFS, S3, Azure Blob...) |
               +-----------------------------------+

```

Docker fue diseñado con una arquitectura conectable (*pluggable*), lo que nos permite cambiar el motor que gestiona los volúmenes utilizando **Volume Drivers**.

### 1. Integración Nativa: Network File System (NFS)

NFS es el estándar de la industria para compartir sistemas de archivos en red. La gran ventaja de NFS en Docker es que **no necesitas instalar plugins adicionales**; el driver `local` de Docker tiene soporte nativo para montar recursos NFS.

*El error clásico del nivel Junior:* Modificar el archivo `/etc/fstab` del sistema operativo host para montar la unidad NFS de forma permanente y luego usar un *Bind Mount* de Docker. Esto crea una fuerte dependencia del sistema operativo y rompe la portabilidad.

*La solución nivel Senior:* Dejar que Docker gestione la conexión NFS dinámicamente.

Para crear un volumen respaldado por un servidor NFS externo (ej. la IP `10.0.0.50`), ejecutamos:

```bash
$ docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=10.0.0.50,rw \
  --opt device=:/ruta/exportada/en/el/nfs \
  mi_volumen_nfs

```

Al inspeccionar este volumen y montarlo en un contenedor, el proceso será transparente para la aplicación. Si el contenedor se destruye y se levanta en otro servidor Docker de la misma red (y ejecutas el mismo comando de creación), la aplicación recuperará exactamente el mismo estado.

### 2. Almacenamiento en la Nube (Cloud Storage y Block Storage)

Cuando operamos en entornos de nube pública (AWS, Google Cloud, Azure), a menudo queremos conectar nuestros contenedores directamente a servicios de almacenamiento elástico (como AWS S3 para objetos, o AWS EBS para bloques de alta velocidad).

A diferencia de NFS, estos servicios requieren la instalación de **Docker Plugins** desarrollados por la comunidad o los proveedores de la nube.

Por ejemplo, para usar un plugin clásico como *RexRay* o los plugins oficiales de AWS para montar un volumen EBS:

1. **Instalación del plugin:**

```bash
$ docker plugin install rexray/ebs \
  EBS_ACCESSKEY=tu_clave \
  EBS_SECRETKEY=tu_secreto

```

1. **Creación del volumen usando el nuevo driver:**

```bash
docker volume create --driver rexray/ebs --name mi_disco_ebs --opt size=50

```

### El elefante en la habitación: La transición a Kubernetes (CSI)

*Candor técnico:* Aunque la arquitectura de plugins de Docker Swarm y el demonio de Docker es funcional, la realidad de la industria ha evolucionado.

Hoy en día, la gestión avanzada de almacenamiento en la nube (como el aprovisionamiento dinámico de discos, redimensionamiento en caliente y snapshots) ha sido estandarizada bajo el **CSI (Container Storage Interface)**, el cual es el estándar de facto en Kubernetes.

Manejar drivers de volumen complejos directamente en servidores Docker aislados se considera una práctica heredada (*legacy*) en infraestructuras modernas de gran escala. Si tu arquitectura requiere conectar contenedores dinámicamente a AWS EBS o Google Persistent Disks a través de múltiples nodos, es la señal definitiva de que tu ecosistema debe migrar a Kubernetes (tema que abordaremos de lleno en el Capítulo 12).

### Resumen del Capítulo 4

* **Evita la capa efímera:** Nunca guardes datos de valor en la capa de lectura/escritura del contenedor (penaliza el rendimiento y se pierde al eliminar el contenedor).
* **Bind Mounts para Desarrollo:** Úsalos para inyectar tu código local y aprovechar el *Live Reload*.
* **Volúmenes para Producción:** Son la única forma de gestionar bases de datos y persistencia real, manteniendo los datos aislados del ciclo de vida del contenedor y del sistema operativo host.
* **Patrón Sidecar y Efímero:** Comparte volúmenes entre contenedores de forma segura (R/O) y usa contenedores temporales para ejecutar copias de seguridad consistentes.
* **Externaliza el estado:** En arquitecturas de alta disponibilidad, usa NFS o Cloud Storage para desacoplar los datos del hardware físico.

Con esto, cerramos oficialmente el **Capítulo 4: Persistencia de Datos y Almacenamiento**. Tenemos contenedores que no pierden la memoria. El siguiente paso evolutivo es hacer que hablen entre ellos y con el mundo exterior.
