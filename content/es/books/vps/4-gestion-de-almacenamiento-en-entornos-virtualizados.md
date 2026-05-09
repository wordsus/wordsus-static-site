La resiliencia de un SysAdmin no se mide por la potencia de sus procesos, sino por la integridad de sus datos. En este capítulo, abandonamos la rigidez de los discos locales para dominar la flexibilidad del **Block Storage**, la escalabilidad infinita del **Object Storage** y la ubicuidad de los **Sistemas de Archivos Distribuidos**.

Aprenderá a orquestar el almacenamiento como un recurso dinámico: desde redimensionar volúmenes en caliente sin un segundo de *downtime*, hasta garantizar la consistencia lógica de sus bases de datos mediante snapshots coordinados. El objetivo es claro: desacoplar la persistencia del cómputo para crear infraestructuras verdaderamente inmutables.

## 4.1. Volúmenes de bloques (Block Storage): Adjuntar, particionar y redimensionar en caliente

En la arquitectura moderna de infraestructura en la nube, el almacenamiento efímero (el disco local donde reside el SO) y los datos persistentes deben tratarse como entidades separadas. Acoplar los datos de la aplicación al ciclo de vida de la instancia de cómputo es una receta para el desastre. Aquí es donde entran los **Volúmenes de Bloques (Block Storage)**.

Un volumen de bloques es, a efectos prácticos, un disco duro virtual (un LUN respaldado por SAN, NVMe-oF o Ceph en el backend del proveedor) que se adjunta a tu VPS a través de la red del centro de datos, pero que el sistema operativo ve como un dispositivo de bloques físico local.

Su principal ventaja radica en su portabilidad y flexibilidad: sobreviven a la destrucción del VPS y pueden redimensionarse sobre la marcha (en caliente) sin interrupción del servicio.

### 1. Adjuntar e identificar el volumen

Cuando provisionas y adjuntas un volumen de bloques mediante la API de tu proveedor (tema cubierto en el Capítulo 1.4) o su panel de control, el hipervisor expone este nuevo dispositivo a la máquina virtual invitada.

En la mayoría de los entornos KVM modernos, este dispositivo utilizará los controladores paravirtualizados **VirtIO** y aparecerá como `/dev/vdb`, `/dev/vdc`, etc. En instancias de alto rendimiento, es común verlos expuestos como dispositivos **NVMe** (`/dev/nvme1n1`).

Para identificar el nuevo volumen sin reiniciar, utiliza `lsblk`:

```bash
$ lsblk -dp
NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
/dev/vda     252:0    0   25G  0 disk 
/dev/vda1    252:1    0 24.9G  0 part /
/dev/vda14   252:14   0    4M  0 part 
/dev/vda15   252:15   0  106M  0 part /boot/efi
/dev/vdb     252:16   0  100G  0 disk    <-- Nuestro nuevo volumen

```

También puedes verificar los mensajes del kernel con `dmesg -T | tail` para confirmar que el bus PCI/VirtIO ha registrado el nuevo hardware.

### 2. Particionado, formateo y montaje persistente

Aunque es posible formatear un disco completo sin tabla de particiones (ej. `mkfs.ext4 /dev/vdb`), **no es una buena práctica**. Carecer de una tabla de particiones dificulta la gestión futura, la compatibilidad con ciertas herramientas de recuperación y la implementación de LVM.

Utilizaremos `parted` para crear una tabla de particiones GPT y una partición primaria que ocupe todo el espacio.

```bash
# 1. Crear tabla GPT
parted -s /dev/vdb mklabel gpt

# 2. Crear una partición que ocupe el 100% del disco
parted -s /dev/vdb mkpart primary 0% 100%

# 3. Formatear con XFS (o ext4, dependiendo de la carga de trabajo)
mkfs.xfs /dev/vdb1

```

**El montaje persistente: La regla de oro del UUID**
Jamás montes un volumen de red usando identificadores de dispositivo como `/dev/vdb1` en el archivo `/etc/fstab`. Si el hipervisor reasigna los buses en un reinicio o adjuntas otro disco, los nombres pueden invertirse y tu servidor no arrancará (kernel panic por fallo al montar).

Obtén el Identificador Único Universal (UUID):

```bash
$ blkid /dev/vdb1
/dev/vdb1: UUID="e4a7b5c1-8d22-491f-b3a1-9d8e7c6f5a4b" TYPE="xfs" PARTLABEL="primary" PARTUUID="1234abcd-..."

```

Crea el punto de montaje y añade la entrada a `/etc/fstab`:

```bash
mkdir -p /mnt/datos
echo 'UUID=e4a7b5c1-8d22-491f-b3a1-9d8e7c6f5a4b /mnt/datos xfs defaults,nofail,discard 0 2' >> /etc/fstab
mount -a

```

*Nota SysAdmin: El parámetro `nofail` es crítico. Evita que el VPS se quede colgado en el proceso de arranque si el volumen de bloques falla al adjuntarse desde la infraestructura del proveedor.*

### 3. Redimensionamiento en caliente (Hot Resizing)

El verdadero poder del Block Storage se demuestra cuando una base de datos o un directorio de logs está a punto de llenar el disco al 100% y necesitas más espacio de inmediato, sin tiempo de inactividad.

El proceso de redimensionamiento requiere actuar en tres capas distintas, de abajo hacia arriba:

```text
[ Capa 1: Infraestructura ]  --> Proveedor Cloud aumenta el LUN a nivel de backend.
         |
[ Capa 2: Tabla Particiones] --> El SO reconoce la nueva geometría y expandimos la partición.
         |
[ Capa 3: File System ]      --> El sistema de archivos se expande para llenar la partición.

```

**Paso 1: Expandir en el proveedor**
Utiliza la API o el panel de tu proveedor para incrementar el tamaño del volumen (ej. de 100GB a 200GB).

**Paso 2: Forzar el re-escaneo del bus (Si es necesario)**
En la mayoría de instancias modernas (VirtIO/SCSI), el kernel detecta el cambio de tamaño mediante eventos ACPI automáticamente. Puedes comprobarlo ejecutando `lsblk`. Si el disco principal (`/dev/vdb`) sigue mostrando 100GB, fuerza un re-escaneo:

```bash
echo 1 > /sys/class/block/vdb/device/rescan

```

**Paso 3: Expandir la partición (Capa 2)**
Ahora que el disco físico virtual (`/dev/vdb`) muestra 200GB, la partición (`/dev/vdb1`) sigue estancada en 100GB. La herramienta más segura para modificar esto en caliente (con el disco montado y en uso) es `growpart` (parte del paquete `cloud-guest-utils`).

*Atención al espacio entre el dispositivo y el número de partición:*

```bash
$ growpart /dev/vdb 1
CHANGED: partition=1 start=2048 old: size=209715167 end=209717215 new: size=419428319 end=419430367

```

**Paso 4: Expandir el sistema de archivos (Capa 3)**
Finalmente, debemos indicarle al sistema de archivos que hay bloques disponibles en su partición anfitriona. El comando depende de si usaste `ext4` o `xfs`.

Para **ext4**, utiliza `resize2fs` apuntando al dispositivo:

```bash
resize2fs /dev/vdb1

```

Para **XFS**, utiliza `xfs_growfs` apuntando al **punto de montaje**, no al dispositivo:

```bash
xfs_growfs /mnt/datos

```

El proceso es instantáneo y se realiza sin interrumpir las operaciones de entrada/salida (I/O) de las aplicaciones en ejecución. Puedes verificar el resultado final con un simple `df -h /mnt/datos`.

> **Nota sobre LVM:** Si decidiste inicializar el volumen como un Volumen Físico de LVM (`pvcreate`) en lugar de usar particiones estándar, el flujo de redimensionamiento en caliente varía ligeramente. Tras el escaneo del proveedor (Paso 1 y 2), deberás redimensionar el volumen físico con `pvresize /dev/vdb`, luego extender el volumen lógico con `lvextend -l +100%FREE /dev/mapper/vg-lv_datos`, y finalmente, redimensionar el sistema de archivos de forma habitual con `resize2fs` o `xfs_growfs`.

## 4.2. Object Storage (S3 Compatible APIs) para respaldos y activos estáticos

A diferencia de los volúmenes de bloques (que requieren un sistema de archivos y se acoplan a un único sistema operativo), el **Object Storage** (Almacenamiento de Objetos) opera en una capa completamente diferente. Aquí no hay jerarquía de directorios, ni particiones, ni inodos. Los datos se almacenan como "objetos" dentro de un espacio plano llamado "Bucket", y se accede a ellos exclusivamente a través de peticiones HTTP/REST.

Hoy en día, la API de Amazon S3 se ha convertido en el estándar *de facto* de la industria. Ya sea que uses AWS S3, DigitalOcean Spaces, Linode Object Storage, Cloudflare R2 o un clúster MinIO autoalojado, las herramientas y la forma de interactuar son idénticas.

Para un SysAdmin, el Object Storage resuelve dos problemas críticos en una arquitectura de VPS: la externalización segura de respaldos y la descarga (offloading) de archivos estáticos del servidor web.

### 1. El paradigma S3: Herramientas esenciales

Olvídate de `cp`, `mv` o `rsync`. Para interactuar con Object Storage necesitas clientes que hablen la API S3. Las tres herramientas de cabecera en la terminal de un SysAdmin son:

* **`aws-cli`:** El cliente oficial. Aunque es de AWS, funciona con cualquier proveedor cambiando el parámetro `--endpoint-url`.
* **`s3cmd`:** Una herramienta clásica, ligera y muy utilizada en scripts en bash.
* **`rclone`:** La "navaja suiza" del almacenamiento en la nube. Excelente para sincronizaciones bidireccionales.

Para que cualquiera de estas herramientas funcione, siempre necesitarás tres credenciales fundamentales: el **Endpoint** (URL), el **Access Key** y el **Secret Key**.

### 2. Implementación de Respaldos Resilientes (El enfoque moderno)

Almacenar backups en el mismo VPS (o en un Block Storage adjunto al mismo) no es una estrategia de recuperación ante desastres, es una ilusión de seguridad. Si el VPS es comprometido o el centro de datos falla, lo pierdes todo.

El Object Storage es el destino ideal para los backups. Para ello, en lugar de crear un `.tar.gz` y subirlo con `s3cmd`, la mejor práctica actual es utilizar **Restic**. Restic es un programa de copias de seguridad rápido, cifrado por defecto y con deduplicación que soporta S3 de forma nativa.

**Ejemplo de flujo de respaldo con Restic hacia S3:**

Primero, exportamos las credenciales al entorno para no escribirlas en texto plano en los comandos:

```bash
export AWS_ACCESS_KEY_ID="tu_access_key"
export AWS_SECRET_ACCESS_KEY="tu_secret_key"
# Ejemplo usando un proveedor alternativo a AWS (ej. DigitalOcean Spaces o MinIO)
export RESTIC_REPOSITORY="s3:https://nyc3.digitaloceanspaces.com/mi-bucket-backups"
export RESTIC_PASSWORD="una_contraseña_muy_fuerte_para_cifrar"

```

Inicializamos el repositorio (solo se hace una vez):

```bash
restic init

```

Ejecutamos el respaldo de los directorios críticos (ej. configuraciones y un dump de la base de datos):

```bash
# Asumiendo que previamente hiciste un volcado: mysqldump > /opt/backups/db.sql
restic backup /etc/ /opt/backups/ /var/www/html/

```

*Nota SysAdmin: Gracias a la deduplicación de Restic, puedes ejecutar este cronjob cada hora; solo se subirán a S3 los bloques de datos que hayan cambiado, ahorrando ancho de banda y costes de almacenamiento.*

### 3. Offloading de Activos Estáticos (Static Assets)

Si tu VPS aloja una aplicación web o un CMS (como WordPress) con mucho tráfico, servir miles de imágenes, PDFs y videos locales consumirá rápidamente tus IOPS, tu ancho de banda y el espacio de tu Block Storage.

La arquitectura resiliente dicta que la aplicación solo debe procesar la lógica (PHP, Python, Node), mientras que los recursos estáticos deben despacharse desde un Object Storage, idealmente detrás de una CDN.

**El Antipatrón: Evita `s3fs-fuse` para producción**

> Existe una tentación común de usar `s3fs-fuse` o `goofys` para montar un bucket S3 como si fuera un disco local en `/var/www/html/wp-content/uploads`. **No lo hagas**. Las llamadas POSIX (como listar directorios o leer atributos) son lentas y costosas sobre HTTP. Tu servidor web se bloqueará esperando la respuesta de I/O de la red.

**La Arquitectura Correcta:**
La aplicación web debe estar configurada a nivel de código (mediante plugins o librerías) para subir los archivos directamente a S3 y guardar la URL pública en la base de datos.

Si tienes aplicaciones legacy que no soportan S3 de forma nativa, puedes utilizar tu servidor web (Nginx) como un **Reverse Proxy** que hace de caché hacia el bucket privado:

```text
[ Arquitectura de Proxy S3 ]

+-----------------+       +-------------------+       +-----------------------+
|  Cliente (Web)  | ----> | Nginx (Tu VPS)    | ----> | Object Storage (S3)   |
|  GET /img/x.jpg | <---- | Caché Local (SSD) | <---- | mi-bucket/img/x.jpg   |
+-----------------+       +-------------------+       +-----------------------+

```

**Ejemplo de configuración simplificada en Nginx para hacer proxy a S3:**

```nginx
server {
    server_name assets.midominio.com;

    location / {
        # Ocultamos cabeceras de S3 al cliente final
        proxy_hide_header x-amz-request-id;
        proxy_hide_header Set-Cookie;
        proxy_ignore_headers Set-Cookie;
        
        # Interceptamos errores de S3
        proxy_intercept_errors on;
        
        # Resolvemos contra el endpoint del S3
        proxy_pass https://mi-bucket-assets.s3.us-east-1.amazonaws.com/;
        
        # Configuración de caché local para no pedir a S3 en cada request
        proxy_cache mi_cache_estaticos;
        proxy_cache_valid 200 24h;
    }
}

```

Implementar Object Storage desacopla el estado de tu servidor. Si tu VPS de frontend muere, puedes provisionar uno nuevo en minutos (como veremos en el Capítulo 5 con Ansible y Terraform) sin preocuparte por recuperar gigabytes de imágenes subidas por los usuarios, ya que todas residen seguras en el bucket.

## 4.3. Sistemas de archivos distribuidos y compartidos (NFS, Ceph, GlusterFS)

Cuando tu infraestructura evoluciona de un único VPS a un clúster de alta disponibilidad (HA), te enfrentas a un problema fundamental: el estado de los archivos. Si tienes tres nodos web balanceados sirviendo una misma aplicación, y un usuario sube un archivo, ese archivo debe estar disponible instantáneamente para los otros dos nodos.

Mientras que el Object Storage (S3) es ideal para activos estáticos servidos al cliente, muchas aplicaciones *legacy* o arquitecturas específicas exigen un sistema de archivos compatible con POSIX real (que soporte bloqueos lógicos, inodos, permisos estándar y jerarquías de directorios). Aquí es donde entran los sistemas de archivos compartidos por red.

A nivel conceptual, pasamos de una relación 1:1 (Block Storage) a una relación N:N.

```text
[ Block Storage ]          [ Shared/Distributed FS ]
   1 Volumen                    1 Volumen Lógico
      │                                │
  1 Servidor                ┌──────────┼──────────┐
                       Servidor A  Servidor B  Servidor C

```

Existen tres grandes protagonistas en este espacio, cada uno con un nivel de complejidad y casos de uso muy diferentes: NFS, GlusterFS y CephFS.

### 1. NFS (Network File System): El estándar clásico

NFS es el veterano de la capa de red. Funciona bajo un modelo Cliente-Servidor estricto, donde un VPS exporta un directorio local y los demás lo montan a través de la red. Hoy en día, siempre debes desplegar **NFSv4**, ya que opera sobre un único puerto TCP (2049), facilitando enormemente la configuración de firewalls, e incorpora mejoras de rendimiento y seguridad.

**Ventajas:**

* **Simplicidad extrema:** Configurar un servidor NFS toma cinco minutos.
* **Bajo overhead:** Consume muy pocos recursos de CPU/RAM.
* **Soporte nativo:** El cliente está integrado en el kernel de Linux (`nfs-common`).

**El problema del SysAdmin (SPOF):**
Una configuración NFS estándar es un Punto Único de Fallo (SPOF). Si el VPS que actúa como servidor NFS se cae, todos los nodos clientes se colgarán esperando operaciones de entrada/salida (I/O wait), derribando todo tu clúster.

*Nota de rendimiento:* Al exportar en `/etc/exports`, usa opciones sensatas. `async` mejora el rendimiento enormemente a costa de un ligero riesgo de pérdida de datos en caso de apagón brusco, mientras que `sync` es más seguro pero penaliza la escritura.

```text
# Ejemplo de /etc/exports en el Servidor NFS (optimizando para red privada)
/mnt/compartido  10.0.0.0/24(rw,async,no_subtree_check,no_root_squash)

```

*(Cuidado con `no_root_squash`: solo debe usarse en redes privadas estrictamente controladas, ya que permite al usuario root del cliente tener privilegios de root sobre los archivos del servidor).*

### 2. GlusterFS: Sistema de archivos distribuido y sin maestro

Para solucionar el SPOF de NFS sin entrar en la extrema complejidad de soluciones empresariales, GlusterFS es el término medio perfecto. Es un sistema de archivos de red escalable que agrupa recursos de almacenamiento de múltiples servidores en un único volumen global.

A diferencia de NFS, GlusterFS no tiene un servidor maestro. Todos los nodos (llamados *peers*) son iguales. El almacenamiento que aporta cada nodo se denomina **Brick**.

Para un entorno web HA, el patrón más común es un **Volumen Replicado** (Replicated Volume). Si tienes tres VPS, GlusterFS se asegurará de que cada archivo escrito en el montaje de Gluster exista físicamente en los discos de los tres servidores. Si un nodo muere, los otros dos siguen sirviendo los datos sin interrupción.

**Flujo básico de despliegue (simplificado):**

```bash
# 1. Emparejar los nodos (desde el Nodo 1)
gluster peer probe nodo2.midominio.internal
gluster peer probe nodo3.midominio.internal

# 2. Crear un volumen replicado a 3 vías usando directorios locales (Bricks)
gluster volume create vol_web replica 3 \
  nodo1:/data/brick1/gv0 \
  nodo2:/data/brick1/gv0 \
  nodo3:/data/brick1/gv0

# 3. Iniciar el volumen
gluster volume start vol_web

```

**Consideraciones críticas para SysAdmins:**

* **Archivos pequeños (Small files problem):** GlusterFS sufre una latencia alta cuando se trata de miles de archivos diminutos (ej. cachés de aplicaciones, repositorios Git masivos). Es ideal para documentos, multimedia y copias de seguridad, pero no para alojar bases de datos.
* **Split-Brain:** En clusters de dos nodos, una pérdida temporal de red puede causar que ambos nodos escriban datos diferentes de forma independiente. **Siempre usa un número impar de nodos (quorum)** o configura un nodo árbitro (Arbiter) que no guarde datos pero vote para decidir quién tiene la verdad.

### 3. Ceph (CephFS): El leviatán de la infraestructura

Ceph no es solo un sistema de archivos; es un clúster de almacenamiento unificado y definido por software (SDS) masivo, diseñado para petabytes de datos. CephFS es la interfaz POSIX que se asienta sobre RADOS (el almacén de objetos subyacente de Ceph).

Ceph separa el almacenamiento en componentes altamente especializados:

1. **OSD (Object Storage Daemon):** Los discos físicos que guardan la data.
2. **MON (Monitors):** Mantienen el mapa del estado del clúster (requieren quorum, mínimo 3).
3. **MDS (Metadata Server):** *Exclusivo para CephFS*. Gestiona la jerarquía POSIX (inodos, directorios) para que los OSD solo tengan que preocuparse de servir bloques de datos brutos.

**Cuándo usar CephFS:**
Si estás montando una infraestructura equivalente a un mini-AWS utilizando múltiples hipervisores desnudos y necesitas provisionar cientos de volúmenes persistentes para Kubernetes o máquinas virtuales, Ceph es la herramienta indicada. Proporciona una resiliencia inigualable (se auto-repara, rebalancea datos automáticamente y soporta fallos catastróficos de hardware).

**Por qué EVITAR Ceph en arquitecturas VPS simples:**
El overhead administrativo y de hardware es brutal. Ceph devora memoria RAM y requiere redes de 10Gbps (idealmente separando el tráfico público del tráfico de replicación del clúster). Desplegar Ceph sobre instancias VPS estándar (que ya sufren de latencia de red virtualizada) suele resultar en un rendimiento paupérrimo.

### Resumen estratégico para la toma de decisiones

| Característica | NFS (v4) | GlusterFS | Ceph (CephFS) |
| --- | --- | --- | --- |
| **Arquitectura** | Cliente-Servidor | Distribuida (sin maestro) | Clúster Unificado |
| **Complejidad de gestión** | Baja | Media | Muy Alta |
| **Consumo de recursos** | Muy Bajo | Moderado | Muy Alto (RAM/CPU/Red) |
| **Alta Disponibilidad (HA)** | No (SPOF nativo) | Sí (mediante volúmenes replicados) | Sí (Resiliencia extrema) |
| **Caso de uso ideal en VPS** | Compartir repositorios internos, logs centralizados temporales. | Directorios `/uploads` compartidos en un clúster web pequeño/mediano. | Nivel hipervisor: respaldar discos virtuales completos y Kubernetes a gran escala. |

La regla general en la orquestación de VPS es: **Comienza con Object Storage (S3)** si tu aplicación lo permite. Si POSIX es obligatorio, implementa **NFS** hasta que su disponibilidad se convierta en un riesgo para el negocio. Llegado a ese punto, migra a **GlusterFS** con 3 nodos. Deja Ceph solo para cuando te conviertas en tu propio proveedor de nube.

## 4.4. Estrategias de Snapshots consistentes (congelación de I/O y bases de datos)

El botón de "Crear Snapshot" en el panel de control de un proveedor Cloud es una trampa mortal para el SysAdmin inexperto. Aunque la API del proveedor ejecute la acción en segundos, la realidad técnica a nivel de hardware y sistema operativo es mucho más compleja y peligrosa.

Si tomas un snapshot de un Block Storage mientras el VPS está en funcionamiento, estás creando una copia con **Consistencia de Caída (Crash Consistency)**. Es el equivalente exacto a desenchufar el servidor de la corriente: los datos que estaban en la memoria RAM, en las cachés del procesador o en las colas de entrada/salida (I/O) del kernel no se escriben en el disco. Para archivos estáticos, esto no suele ser un problema; para una base de datos transaccional, es una garantía de corrupción.

El objetivo de una infraestructura resiliente es lograr **Consistencia de Aplicación (Application Consistency)**. Esto requiere orquestar una pausa controlada (congelación) en todas las capas de datos antes de disparar el snapshot en el backend del proveedor.

### 1. La capa del hipervisor y el Sistema de Archivos (`qemu-guest-agent` y `fsfreeze`)

Para que el hipervisor se comunique con el sistema operativo de tu VPS (el *guest*) y le advierta que un snapshot está a punto de ocurrir, existe un puente fundamental: el **QEMU Guest Agent**.

Si usas KVM (la norma en proveedores como DigitalOcean, Linode, AWS EC2, etc.), instalar y habilitar `qemu-guest-agent` es el primer paso obligatorio de hardening de almacenamiento:

```bash
apt install qemu-guest-agent
systemctl enable --now qemu-guest-agent

```

Cuando el proveedor inicia el snapshot, envía una señal a este agente. El agente, a su vez, invoca una llamada al sistema (`FIFREEZE` / `FITHAW`) que obliga al sistema de archivos (ext4, XFS) a volcar todas sus cachés pendientes al disco y bloquear nuevas escrituras temporalmente.

Si tu proveedor no soporta esta integración automática, o si estás escribiendo tu propio script de automatización mediante API, debes congelar el sistema de archivos manualmente usando `fsfreeze`:

```bash
# Congelar las escrituras en la partición montada
fsfreeze -f /mnt/datos

# -> [ AQUI SE EJECUTA EL SNAPSHOT MEDIANTE LA API DEL PROVEEDOR ] <-

# Descongelar el sistema de archivos
fsfreeze -u /mnt/datos

```

*Nota SysAdmin: Cualquier proceso que intente escribir en `/mnt/datos` durante el estado congelado no fallará inmediatamente, sino que pasará a estado de espera ininterrumpible (Estado `D` en htop) hasta que el disco se descongele. Si la congelación dura más de unos pocos segundos, los procesos empezarán a colapsar por timeouts.*

### 2. La capa de la Aplicación: El problema de las Bases de Datos

Congelar el sistema de archivos protege la integridad estructural del disco (inodos, journal), pero **no protege los motores de bases de datos**.

Bases de datos como MySQL (InnoDB) o PostgreSQL gestionan sus propios búferes de memoria masivos (`innodb_buffer_pool_size`, `shared_buffers`). Si congelas el sistema de archivos mientras la base de datos está a mitad de una transacción, el snapshot capturará los archivos físicos `.ibd` o de la carpeta `pg_data` en un estado lógicamente inconsistente. Al intentar restaurar ese snapshot, el motor de la base de datos tendrá que ejecutar procesos pesados de recuperación de colisiones (crash recovery), los cuales no siempre son exitosos.

Para lograr un snapshot perfecto, debemos indicarle a la base de datos que bloquee las tablas temporalmente.

**Para MySQL / MariaDB:**
El comando crítico es `FLUSH TABLES WITH READ LOCK` (FTWRL). Cierra todas las tablas abiertas y bloquea las escrituras, pero permite que las lecturas continúen.

**Para PostgreSQL:**
PostgreSQL utiliza un modelo de escritura anticipada (WAL). Se usan las funciones `pg_backup_start()` y `pg_backup_stop()` para forzar un punto de control (checkpoint) y asegurar que los archivos del clúster base sean consistentes para ser copiados.

### 3. Orquestación: El flujo de trabajo del Snapshot Perfecto

Para automatizar esto de forma segura (por ejemplo, en un cronjob o mediante una tubería de CI/CD), la ejecución debe seguir un orden de capas estrictamente secuencial de arriba hacia abajo (Aplicación -> SO -> Infraestructura) y descongelarse en el orden inverso.

```text
[ Diagrama de Flujo: Snapshot con Consistencia de Aplicación ]

TIEMPO
  |   1. MySQL: Ejecutar 'FLUSH TABLES WITH READ LOCK'
  |   2. SO: Ejecutar 'fsfreeze -f /' (Congelar I/O)
  |   3. API Cloud: Disparar creación de Snapshot del Volumen
  |      -> (Esperar confirmación de que el snapshot ha *iniciado*, 
  |          no de que haya *terminado*. Solo necesitamos el estado inicial).
  |   4. SO: Ejecutar 'fsfreeze -u /' (Descongelar I/O)
  |   5. MySQL: Ejecutar 'UNLOCK TABLES'
  V

```

**Ejemplo de implementación (Pseudo-script Bash para MySQL):**

Este script demuestra la lógica crítica de mantener la sesión de la base de datos abierta en segundo plano, ya que los bloqueos de lectura en MySQL se liberan automáticamente si la sesión se desconecta.

```bash
#!/bin/bash
# Script de Snapshot Consistente

VOLUME_ID="vol-12345"
MOUNT_POINT="/mnt/datos"

echo "[1] Aplicando bloqueo de lectura en MySQL..."
# Abrimos un descriptor de archivo (fd 3) para mantener la sesión viva
exec 3< <(mysql -u root -p'tu_password' -e "FLUSH TABLES WITH READ LOCK; DO SLEEP(3600);")
sleep 2 # Dar tiempo a que el comando SQL se procese

echo "[2] Congelando Sistema de Archivos ($MOUNT_POINT)..."
fsfreeze -f $MOUNT_POINT

echo "[3] Disparando Snapshot vía API..."
# Ejemplo usando AWS CLI (se adapta a la herramienta de tu proveedor)
aws ec2 create-snapshot --volume-id $VOLUME_ID --description "Backup-Consistente"
# Importante: Las APIs cloud modernas inician el snapshot de forma asíncrona. 
# El I/O ya está capturado, no necesitamos esperar a que se suban los 100GB a S3.

echo "[4] Descongelando Sistema de Archivos..."
fsfreeze -u $MOUNT_POINT

echo "[5] Liberando base de datos..."
# Matamos el proceso mysql que mantiene el sleep, lo que libera el LOCK automáticamente
kill $! 
exec 3<&- 

echo "Snapshot orquestado con éxito. El VPS vuelve a operar con normalidad."

```

**Advertencia final:** En entornos de muy alto rendimiento (bases de datos que manejan miles de transacciones por segundo), retener las escrituras, incluso por el par de segundos que toma lanzar la llamada a la API y descongelar, puede saturar las conexiones de la aplicación web. En arquitecturas HA (que veremos en el Capítulo 7), esta operación de snapshot **siempre debe realizarse en un nodo esclavo/pasivo (Replica)**, nunca en el nodo maestro que está sirviendo el tráfico de producción.
