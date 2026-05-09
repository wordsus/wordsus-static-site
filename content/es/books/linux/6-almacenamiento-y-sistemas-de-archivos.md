Dominar el almacenamiento es la diferencia entre un administrador que sobrevive a las crisis y un **DevOps Senior** que las previene. En este capítulo, desmitificamos la gestión de datos en Linux, desde la identificación de discos físicos con `lsblk` hasta la flexibilidad extrema de **LVM**.

Aprenderás a estructurar particiones con `fdisk` y `parted`, a elegir el sistema de archivos adecuado (`EXT4` vs `XFS`) y a garantizar la persistencia mediante `/etc/fstab`. Entenderás que el almacenamiento no es un bloque estático, sino un recurso dinámico que debe crecer junto a tus aplicaciones, dominando las herramientas para expandir volúmenes en caliente y sin pérdida de datos.

## 6.1 Inspección de discos y bloques (`lsblk`, `df`, `du`)

Antes de poder particionar, formatear o montar un disco (temas que abordaremos en las siguientes secciones), necesitas saber exactamente qué recursos de almacenamiento están conectados a tu servidor y cómo se están utilizando. En el mundo de Linux, "todo es un archivo", y los dispositivos de almacenamiento no son la excepción.

Para diagnosticar problemas de almacenamiento, un ingeniero DevOps utiliza tres herramientas fundamentales que operan en diferentes capas de abstracción. El siguiente diagrama ilustra dónde actúa cada comando:

```text
+----------------------------------------------------+
|  Capa Física / Virtual (Discos duros, SSDs, EBS)   |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|  Dispositivos de Bloque (/dev/sda, /dev/nvme0n1)   | <--- lsblk
|  (Muestra la topología, particiones y LVMs)        |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|  Sistemas de Archivos (ext4, xfs, btrfs)           | <--- df
|  (Muestra el espacio libre/ocupado a nivel global) |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|  Directorios y Archivos (/var/log, /home/user)     | <--- du
|  (Muestra cuánto pesa cada archivo o carpeta)      |
+----------------------------------------------------+

```

A continuación, desglosaremos cada herramienta y sus casos de uso más críticos.

### 1. `lsblk`: Entendiendo la topología de bloques

El comando `lsblk` (List Block Devices) lee el sistema de archivos `sysfs` y la base de datos de `udev` para recopilar información sobre todos los dispositivos de bloque disponibles. Es tu "mapa" del hardware de almacenamiento.

Al ejecutar `lsblk` sin argumentos, obtendrás una vista de árbol:

```bash
$ lsblk
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda       8:0    0   50G  0 disk 
├─sda1    8:1    0  512M  0 part /boot/efi
└─sda2    8:2    0 49.5G  0 part /
sdb       8:16   0  100G  0 disk 

```

**Entendiendo las columnas clave:**

* **NAME:** El nombre del dispositivo (ej. `sda` es el primer disco SATA/SCSI, `nvme0n1` es un disco NVMe).
* **TYPE:** Indica si es un disco entero (`disk`), una partición (`part`), o un volumen lógico (`lvm`, que veremos en la sección 6.5).
* **MOUNTPOINT:** Dónde está accesible ese dispositivo en el árbol de directorios de Linux. Si está vacío (como en `sdb`), el disco está conectado pero no está montado (y probablemente ni siquiera formateado).

**Opciones clave para DevOps:**

| Comando | Caso de Uso |
| --- | --- |
| `lsblk -f` | Muestra el sistema de archivos (FSTYPE) y el identificador único (UUID). Es vital para configurar `/etc/fstab` de forma segura (ver sección 6.4). |
| `lsblk -J` | Imprime la salida en formato JSON. Indispensable si estás escribiendo scripts de automatización en Python o Bash para aprovisionar discos. |

### 2. `df`: Monitorizando la capacidad del sistema de archivos

Mientras que `lsblk` te muestra los *discos*, `df` (Disk Free) te muestra los *sistemas de archivos* que están actualmente montados y cuánto espacio de almacenamiento global les queda.

El comando por defecto muestra bloques de 1K, lo cual es difícil de leer. Como estándar de la industria, siempre usarás la bandera `-h` (human-readable):

```bash
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
udev            2.0G     0  2.0G   0% /dev
tmpfs           395M  1.1M  394M   1% /run
/dev/sda2        49G   38G  8.6G  82% /
/dev/sda1       511M  5.3M  506M   2% /boot/efi

```

**El "Gotcha" de nivel Senior: Los Inodos (`df -i`)**
Un problema clásico en producción es recibir una alerta de que no se pueden escribir más archivos en el disco, pero al ejecutar `df -h` ves que aún tienes un 40% de espacio libre. ¿Qué ocurrió? **Te quedaste sin Inodos.**

Un inodo es una estructura de datos que almacena los metadatos de un archivo. Si una aplicación (como un servidor de correo o un caché mal configurado) crea millones de archivos diminutos de 1 byte, agotarás los inodos antes que los gigabytes. Para diagnosticar esto, usa:

```bash
$ df -i
Filesystem      Inodes   IUsed   IFree IUse% Mounted on
/dev/sda2      3276800 3276800       0  100% /

```

*Si `IUse%` está al 100%, no podrás crear ni un solo archivo nuevo, sin importar cuánto espacio en disco quede.*

### 3. `du`: Cazando a los devoradores de espacio

Si `df` te dice que `/var` está al 99% de capacidad, `du` (Disk Usage) es la herramienta que te dirá *qué* directorio o archivo exacto está causando el problema. `du` calcula el tamaño de forma recursiva.

**Comandos tácticos para emergencias de almacenamiento:**

* **Ver el peso total de un directorio específico:**
```bash
$ du -sh /var/log
2.5G    /var/log

```


*(Nota: `-s` significa "summary", para no imprimir el tamaño de cada archivo individual dentro del directorio, y `-h` es "human-readable").*
* **Encontrar los directorios más pesados en la raíz (Nivel Pro):**
Para evitar que `du` escanee infinitamente y te abrume con datos, limitamos la profundidad de búsqueda con `-d 1` (o `--max-depth=1`) y lo combinamos con `sort` (que exploraremos a fondo en el Capítulo 8) para ordenar de mayor a menor:
```bash
$ du -h -d 1 / | sort -hr | head -n 5
45G     /
38G     /var
5G      /usr
1.2G    /home
512M    /opt

```

*(Nota: Es común añadir la bandera `-x` a `du` (`du -hx`) para evitar que salte a otros sistemas de archivos montados, manteniéndose solo en la partición actual).*

## 6.2 Particionado de discos (`fdisk`, `parted`)

Una vez que has identificado tus discos de bloque "crudos" con `lsblk` (como vimos en la sección anterior), el siguiente paso antes de poder guardar archivos en ellos es **particionarlos**.

Particionar un disco es como tomar un gran terreno vacío y dibujar líneas en el suelo para delimitar dónde se construirá la casa, dónde estará el jardín y dónde el garaje. A nivel técnico, consiste en escribir una **Tabla de Particiones** al principio del disco, la cual le dice al sistema operativo dónde empieza y dónde termina cada bloque lógico de datos.

```text
+---------------------------------------------------------------+
|                      Disco Físico (/dev/sdb)                  |
|                                                               |
| +---------+ +-------------------+ +-------------------------+ |
| | Tabla   | | Partición 1       | | Partición 2             | |
| | GPT/MBR | | (/dev/sdb1)       | | (/dev/sdb2)             | |
| |         | | (Ej. 20GB p/ OS)  | | (Ej. 80GB p/ Datos)     | |
| +---------+ +-------------------+ +-------------------------+ |
+---------------------------------------------------------------+

```

Existen dos estándares principales para las tablas de particiones:

1. **MBR (Master Boot Record):** El estándar heredado. Solo soporta discos de hasta 2 Terabytes y un máximo de 4 particiones primarias.
2. **GPT (GUID Partition Table):** El estándar moderno. Soporta discos de tamaños colosales (Zettabytes) y hasta 128 particiones. **En entornos DevOps y servidores modernos, GPT es la norma.**

Para interactuar con estas estructuras, Linux nos ofrece dos herramientas legendarias: `fdisk` y `parted`.

### 1. `fdisk`: El clásico interactivo

`fdisk` es la herramienta canónica de Linux para gestionar particiones. Históricamente estaba ligada a MBR, pero hoy en día soporta GPT perfectamente. Su principal característica es que es **interactiva**: te guía paso a paso mediante un menú de texto.

**Escenario:** Acabamos de conectar un nuevo disco de 100GB (`/dev/sdb`) y queremos crear una única partición que ocupe todo el espacio.

Iniciamos la sesión interactiva (requiere privilegios de superusuario):

```bash
$ sudo fdisk /dev/sdb

```

Dentro del prompt de `fdisk` (que se ve como `Command (m for help):`), los atajos más utilizados por un administrador son:

* **`p` (Print):** Muestra la tabla de particiones actual. Útil para verificar antes de tocar nada.
* **`g` (GPT):** Crea una nueva tabla de particiones GPT vacía. (Usa `o` si por alguna razón necesitas MBR).
* **`n` (New):** Crea una nueva partición. Te preguntará el número de partición, el primer sector (siempre presiona Enter para usar el valor por defecto) y el último sector (puedes escribir `+50G` para una partición de 50GB, o presionar Enter para usar todo el espacio restante).
* **`d` (Delete):** Elimina una partición existente.
* **`w` (Write):** **¡El comando más importante!** `fdisk` opera en memoria. Ningún cambio afectará tu disco hasta que presiones `w` para escribir los cambios y salir. Si te equivocas, simplemente presiona `q` (Quit) para salir sin guardar.

### 2. `parted`: La elección moderna y automatizable (El enfoque DevOps)

Mientras que `fdisk` es excelente para un administrador que configura un servidor manualmente, en DevOps rara vez hacemos las cosas a mano. Cuando usas herramientas como Ansible, Terraform o scripts de Bash para aprovisionar cientos de servidores, necesitas una herramienta que pueda particionar discos de forma **no interactiva** (sin prompts). Aquí es donde brilla GNU `parted`.

`parted` soporta GPT de forma nativa e impecable, y permite ejecutar comandos en una sola línea utilizando la bandera `-s` (script mode).

**Escenario de automatización:** Crear una tabla GPT y una partición que ocupe el 100% del disco `/dev/sdc` en un solo script de Bash.

```bash
# 1. Crear la tabla de particiones GPT
$ sudo parted -s /dev/sdc mklabel gpt

# 2. Crear una partición primaria desde el 0% hasta el 100% del espacio
$ sudo parted -s /dev/sdc mkpart primary ext4 0% 100%

```

*Nota Senior: Al usar `0% 100%`, `parted` se encarga automáticamente de alinear los sectores de la partición de manera óptima para el rendimiento del disco (especialmente importante en discos SSD o almacenamiento en la nube (EBS/Premium Storage)).*

### El "Truco" del Senior: Actualizando el Kernel sin reiniciar (`partprobe`)

Un problema muy común en producción ocurre cuando modificas la tabla de particiones de un disco que el sistema ya está utilizando. Ejecutas `fdisk` o `parted`, haces los cambios, pero al ejecutar `lsblk`, la nueva partición no aparece.

Esto sucede porque el Kernel de Linux mantiene la tabla de particiones antigua en su memoria caché para no interrumpir operaciones en curso. Los principiantes suelen resolver esto reiniciando el servidor, lo cual es inaceptable en un entorno de alta disponibilidad.

Para obligar al Kernel a releer la tabla de particiones en caliente, utilizamos la herramienta `partprobe` (parte del paquete `parted`):

```bash
$ sudo partprobe /dev/sdb

```

Tras ejecutar este comando, el Kernel registrará el nuevo dispositivo de bloque (por ejemplo, `/dev/sdb1`), dejándolo listo para el siguiente paso en nuestra cadena de almacenamiento: la creación del sistema de archivos.

## 6.3 Creación de sistemas de archivos (`mkfs.ext4`, `mkfs.xfs`)

En la sección anterior, usamos `parted` o `fdisk` para crear las particiones. Siguiendo con nuestra analogía del terreno, delimitamos las parcelas (particiones), pero estas parcelas siguen siendo solo tierra baldía. Aún no podemos construir ni guardar nada en ellas.

Para que el sistema operativo pueda almacenar, organizar y recuperar archivos, necesitamos instalar una estructura organizativa sobre esa partición: un **Sistema de Archivos** (Filesystem). Esta operación es lo que coloquialmente se conoce como "formatear".

```text
+-------------------------------------------------------+
| Partición Cruda (/dev/sdb1) - "El almacén vacío"      |
| 010101010101010101010101010101010101010101010101010...|
+-------------------------------------------------------+
                          |
                   mkfs.ext4 /dev/sdb1
                          v
+-------------------------------------------------------+
| Sistema de Archivos - "El almacén organizado"         |
| [Superbloque] [Tabla de Inodos] [Bloques de Datos]    |
+-------------------------------------------------------+

```

En el ecosistema Linux moderno, existen dos reyes indiscutibles para el almacenamiento en bloque tradicional: **EXT4** y **XFS**.

* **EXT4 (Fourth Extended Filesystem):** Es el estándar de facto en distribuciones basadas en Debian/Ubuntu. Es increíblemente estable, soporta volúmenes de hasta 1 Exabyte y permite reducir o ampliar su tamaño dinámicamente.
* **XFS:** Es el sistema de archivos por defecto en el ecosistema RHEL/CentOS. Es un sistema de archivos de alto rendimiento creado originalmente por Silicon Graphics. Brilla excepcionalmente en el manejo de archivos enormes (bases de datos, logs masivos) y en operaciones de lectura/escritura en paralelo. *Advertencia:* XFS puede crecer dinámicamente, pero **no puede reducirse**.

### La familia de comandos `mkfs`

En Linux, utilizamos el comando `mkfs` (Make Filesystem). En realidad, `mkfs` es solo un *frontend* (una interfaz) que llama al programa constructor específico en segundo plano (como `mkfs.ext4` o `mkfs.xfs`).

#### 1. Formateando en EXT4

Supongamos que queremos dar formato a la partición `/dev/sdb1` que acabamos de crear:

```bash
$ sudo mkfs.ext4 /dev/sdb1

```

La salida mostrará cómo se crea la tabla de inodos, el *journal* (bitácora de transacciones para recuperación ante fallos) y los bloques.

**El "Gotcha" de nivel Senior: Los bloques reservados (`-m`)**
Por defecto, al crear un sistema de archivos ext4, **el sistema reserva un 5% del espacio total exclusivamente para el usuario `root`**. Esto se diseñó hace décadas para asegurar que, si el disco se llenaba, el administrador aún tuviera espacio para entrar y limpiar logs sin que el sistema colapsara.

Sin embargo, en un disco de datos de 2 Terabytes (por ejemplo, para guardar imágenes de un bucket de S3 o datos de una base de datos), ¡el 5% son 100 GB desperdiciados! Como DevOps, si el disco es puramente para datos de aplicaciones, debes reducir esta reserva al 1% o al 0% usando la bandera `-m`:

```bash
# Formatea en ext4 reservando solo el 0% para root
$ sudo mkfs.ext4 -m 0 /dev/sdb1

```

#### 2. Formateando en XFS

Si estás configurando un servidor de base de datos PostgreSQL o un clúster de Elasticsearch, es probable que prefieras el rendimiento I/O de XFS. El comando es directo:

```bash
$ sudo mkfs.xfs /dev/sdc1

```

Si por algún motivo necesitas reformatear una partición XFS que ya contenía datos (y estás seguro de querer destruirlos), XFS te obligará a forzar la operación con la bandera `-f` (force):

```bash
$ sudo mkfs.xfs -f /dev/sdc1

```

### El resultado final: El nacimiento del UUID

El paso de crear el sistema de archivos hace algo más que organizar bloques: **genera un UUID (Universally Unique Identifier)**.

Los nombres de los dispositivos (`/dev/sdb1`, `/dev/sdc1`) pueden cambiar si reinicias el servidor y conectas los cables en diferente orden, o si agregas discos en la nube. Sin embargo, el UUID es una huella dactilar permanente para ese sistema de archivos exacto.

Como ingenieros, siempre verificamos que el UUID se haya generado correctamente utilizando el comando `blkid` (Block ID):

```bash
$ sudo blkid /dev/sdb1
/dev/sdb1: UUID="1a2b3c4d-5e6f-7g8h-9i0j-123456789abc" TYPE="ext4" PARTUUID="xyz987"

```

Este UUID será nuestra llave maestra para el siguiente y último paso: decirle al sistema operativo que conecte este nuevo almacenamiento de forma permanente.

## 6.4 Montaje temporal y persistente (`mount`, `umount`, `/etc/fstab`)

Hasta este punto, hemos identificado el disco (`lsblk`), trazado sus particiones (`parted`) y le hemos dado una estructura organizativa o formato (`mkfs`). Sin embargo, en Linux, un disco formateado no aparece mágicamente como "Disco D:" al conectarlo.

Para que el sistema operativo y los usuarios puedan interactuar con los archivos, debemos **montar** ese sistema de archivos en una carpeta vacía existente dentro de nuestro árbol de directorios principal. A esta carpeta se le llama **Punto de Montaje** (Mount Point).

```text
 Árbol de Directorios (VFS)
 / (Raíz)
 ├── etc/
 ├── var/
 ├── home/
 └── mnt/
      └── datos_db/  <=== [Punto de Montaje] === (/dev/sdb1 formateado en XFS)

```

*Una vez montado, cualquier archivo que escribas dentro de `/mnt/datos_db/` se guardará físicamente en la partición `/dev/sdb1`.*

### 1. Montaje y desmontaje en caliente (`mount` y `umount`)

Para montar un disco temporalmente (por ejemplo, para revisar el contenido de un volumen de respaldo o un USB), utilizamos el comando `mount`.

Primero, creamos el directorio que servirá como punto de montaje:

```bash
$ sudo mkdir -p /mnt/datos_db

```

Luego, conectamos la partición a ese directorio:

```bash
$ sudo mount /dev/sdb1 /mnt/datos_db

```

Puedes verificar que se montó correctamente ejecutando `df -h`, donde ahora verás `/dev/sdb1` listado junto a su espacio disponible y su punto de montaje.

**Desmontando con seguridad (`umount`)**
*(Nota: El comando es `umount`, sin la 'n' de unmount).*

Cuando termines de usar el disco, debes desmontarlo antes de desconectarlo físicamente o destruirlo, para asegurar que todos los datos en la memoria caché se escriban en el disco.

```bash
$ sudo umount /mnt/datos_db

```

> **El "Gotcha" del día a día: `target is busy`**
> Si intentas desmontar un disco y recibes el error `umount: /mnt/datos_db: target is busy`, significa que un proceso (o tú mismo) está utilizando ese directorio. El error más común de los principiantes es intentar ejecutar `umount` estando parados *dentro* del directorio (`cd /mnt/datos_db`).
> **Solución Senior:** Sal del directorio (`cd ~`) o usa el comando `lsof +D /mnt/datos_db` para descubrir exactamente qué programa está bloqueando el disco y cerrarlo.

### 2. Montaje Persistente: El archivo `/etc/fstab`

El gran problema del comando `mount` es que **no sobrevive a los reinicios**. Si el servidor se apaga, al encenderlo tendrás que volver a montar todo manualmente. En un entorno de producción automatizado, esto es inaceptable.

Para que el montaje sea permanente, debemos registrarlo en el archivo de la Tabla de Sistemas de Archivos: `/etc/fstab` (File System Table).

El archivo `/etc/fstab` tiene una estructura estricta de 6 columnas separadas por espacios o tabulaciones.

| Columna | Nombre | Descripción |
| --- | --- | --- |
| **1** | Device | El identificador del disco (Se recomienda usar UUID). |
| **2** | Mountpoint | La ruta de la carpeta donde se montará (ej. `/mnt/datos_db`). |
| **3** | FSType | El sistema de archivos (ej. `ext4`, `xfs`, `nfs`). |
| **4** | Options | Reglas de montaje (ej. `defaults`, `ro` para solo lectura, `noexec`). |
| **5** | Dump | Si la herramienta obsoleta 'dump' debe respaldarlo (siempre `0`). |
| **6** | Pass | Orden de revisión de errores `fsck` al arrancar (`0` no revisar, `1` para la Raíz `/`, `2` para el resto). |

**La regla de oro DevOps: Nunca uses `/dev/sdX` en fstab**
Como vimos en la sección anterior, los nombres `/dev/sdb1` pueden cambiar si agregas o quitas discos. Si `/dev/sdb1` pasa a ser `/dev/sdc1` tras un reinicio, tu servidor intentará montar el disco incorrecto y colapsará. **Siempre usa el UUID.**

Editamos el archivo de forma segura:

```bash
$ sudo nano /etc/fstab

```

Y añadimos nuestra nueva línea al final:

```text
# Device                                   Mountpoint       FSType  Options   Dump  Pass
UUID=1a2b3c4d-5e6f-7g8h-9i0j-123456789abc  /mnt/datos_db    xfs     defaults  0     2

```

### La Prueba de Fuego (`mount -a`)

> **Advertencia Crítica:** Si cometes un error tipográfico en `/etc/fstab` (por ejemplo, escribes mal el UUID o el punto de montaje no existe), **el servidor no arrancará en el próximo reinicio**. Entrará en "Emergency Mode" y te quedarás sin acceso remoto por SSH.

Para evitar esta catástrofe, los administradores Senior **siempre** verifican el archivo inmediatamente después de guardarlo ejecutando:

```bash
$ sudo mount -a

```

El comando `mount -a` lee el archivo `/etc/fstab` e intenta montar todo lo que esté listado allí y no esté montado aún.

* Si no devuelve ninguna salida (silencio en la terminal), ¡felicidades! Has configurado `/etc/fstab` correctamente.
* Si devuelve un error, corrige el archivo `/etc/fstab` inmediatamente antes de siquiera pensar en reiniciar el equipo.

## 6.5 Gestión de Volúmenes Lógicos (LVM: `pvcreate`, `vgcreate`, `lvcreate`, `lvextend`)

Si gestionas servidores en producción, tarde o temprano te enfrentarás a la siguiente pesadilla: creaste una partición tradicional de 50GB para la base de datos (`/dev/sdb1`), la base de datos creció inesperadamente y ahora el disco está al 100%. Con el particionado tradicional (Sección 6.2), tu única opción segura es apagar el servicio, añadir un disco más grande, copiar todos los datos, cambiar los puntos de montaje y rezar para que todo funcione al reiniciar.

Para evitar este dolor, Linux cuenta con **LVM (Logical Volume Manager)**. LVM introduce una capa de abstracción entre los discos físicos y el sistema de archivos. En lugar de atar un sistema de archivos a un trozo de metal rígido, LVM agrupa los discos físicos en una gran "piscina" de almacenamiento líquido, del cual puedes extraer, reducir o ampliar "discos virtuales" (volúmenes) sobre la marcha y sin tiempo de inactividad (Zero Downtime).

### La Arquitectura de LVM (Las 3 Capas)

Para dominar LVM, debes entender cómo fluyen los datos desde el hardware hasta el sistema de archivos:

```text
+------------------+   +------------------+
| Disco 1 (/dev/sdb|   | Disco 2 (/dev/sdc| <--- Hardware (Discos crudos)
+------------------+   +------------------+
         |                      |
         v                      v
+------------------+   +------------------+
| PV (/dev/sdb)    |   | PV (/dev/sdc)    | <--- 1. pvcreate (Physical Volumes)
+------------------+   +------------------+
         \                      /
          \                    /
           v                  v
+-----------------------------------------+
|      Volume Group (VG: "vg_datos")      | <--- 2. vgcreate (La piscina global)
|      Espacio Total: 200 GB              |
+-----------------------------------------+
         /                      \
        v                        v
+------------------+   +------------------+
| LV ("lv_mysql")  |   | LV ("lv_logs")   | <--- 3. lvcreate (Volúmenes Lógicos)
| Tamaño: 50 GB    |   | Tamaño: 20 GB    |      (Aquí instalas ext4 o xfs)
+------------------+   +------------------+

```

Veamos cómo construir esto paso a paso desde la terminal.

### Paso 1: Inicializar los Volúmenes Físicos (`pvcreate`)

Primero, tomamos nuestros discos crudos (o particiones) y los marcamos para que LVM pueda utilizarlos. Esto inserta una cabecera de metadatos en el disco.

```bash
$ sudo pvcreate /dev/sdb /dev/sdc
  Physical volume "/dev/sdb" successfully created.
  Physical volume "/dev/sdc" successfully created.

```

*Tip: Puedes verificar el estado de tus volúmenes físicos en cualquier momento con el comando `pvs` o `pvdisplay`.*

### Paso 2: Crear el Grupo de Volúmenes (`vgcreate`)

Ahora, fusionamos ambos discos en una sola entidad lógica (el Volume Group). Si `/dev/sdb` tiene 100GB y `/dev/sdc` tiene 100GB, nuestro VG tendrá 200GB de capacidad combinada.

```bash
$ sudo vgcreate vg_datos /dev/sdb /dev/sdc
  Volume group "vg_datos" successfully created

```

*Tip: Usa `vgs` o `vgdisplay` para ver el tamaño total y el espacio libre de tu piscina de almacenamiento.*

### Paso 3: Crear los Volúmenes Lógicos (`lvcreate`)

Con nuestra piscina `vg_datos` lista, podemos "recortar" volúmenes virtuales. A los ojos del sistema operativo, estos volúmenes se comportarán exactamente igual que una partición tradicional.

Vamos a crear un volumen de 50GB para nuestra base de datos llamado `lv_mysql`:

```bash
$ sudo lvcreate -n lv_mysql -L 50G vg_datos
  Logical volume "lv_mysql" created.

```

Una vez creado, la ruta del dispositivo será `/dev/vg_datos/lv_mysql`. ¡Ya puedes formatearlo con `mkfs.xfs` y montarlo usando `/etc/fstab` tal como aprendimos en las secciones anteriores!

> **El "Truco" del Senior: La regla del 70/30**
> El error número uno de los novatos en LVM es ejecutar `lvcreate -l 100%FREE` asignando todo el espacio del VG inmediatamente. Si haces esto, destruyes la principal ventaja de LVM: la flexibilidad.
> La buena práctica DevOps dicta: **Asigna solo lo que necesites hoy (ej. el 70% del VG) y deja el 30% restante sin asignar.** Si un volumen se llena en el futuro, tendrás espacio de reserva en el VG para expandirlo en segundos.

### El Superpoder de LVM: Expansión en caliente (`lvextend`)

Volvamos a nuestra pesadilla inicial. El volumen `lv_mysql` de 50GB está lleno. Como fuimos inteligentes y dejamos espacio libre en nuestro `vg_datos`, podemos añadirle 20GB extra al volumen sin detener la base de datos.

**Fase 1: Expandir el bloque lógico**

```bash
$ sudo lvextend -L +20G /dev/vg_datos/lv_mysql
  Size of logical volume vg_datos/lv_mysql changed from 50.00 GiB to 70.00 GiB.

```

**Fase 2: El paso crítico que todos olvidan (Expandir el File System)**
Aunque el disco subyacente ahora es de 70GB, el sistema de archivos (EXT4 o XFS) que vive dentro de él todavía "cree" que tiene 50GB. Debemos decirle al sistema de archivos que se expanda para ocupar el nuevo espacio.

Si usaste **EXT4**:

```bash
$ sudo resize2fs /dev/vg_datos/lv_mysql

```

Si usaste **XFS**:

```bash
$ sudo xfs_growfs /mnt/datos_db 

```

*(Nota: a diferencia de resize2fs, xfs_growfs requiere que apuntes al punto de montaje, no a la ruta del dispositivo `/dev/...`).*

¡Y listo! Al ejecutar `df -h` verás que tu sistema tiene mágicamente 20GB más de espacio. Cero interrupciones, cero migración de datos, pura eficiencia operativa.
