En un entorno orquestado, la gestión de datos presenta un desafío único: mientras los contenedores son efímeros y reemplazables, la información del negocio debe ser inmutable y resiliente. Este capítulo explora cómo Kubernetes resuelve la persistencia de datos más allá del ciclo de vida de un Pod.

Comenzaremos analizando mecanismos básicos de intercambio de datos como **emptyDir** y el acceso al nodo con **hostPath**, para luego profundizar en la robusta arquitectura de **PV y PVC**. Finalmente, dominaremos el aprovisionamiento dinámico mediante **Storage Classes** y el estándar **CSI**, herramientas esenciales para automatizar el almacenamiento en nubes modernas y entornos on-premise.

## 5.1 Volúmenes efímeros (emptyDir) y montajes de host (hostPath)

Por diseño, el sistema de archivos de un contenedor es efímero. Si un contenedor falla y el `kubelet` lo reinicia, el contenedor volverá a su estado inicial, perdiendo cualquier archivo modificado o generado durante su ejecución. Además, en arquitecturas donde múltiples contenedores coexisten dentro de un mismo Pod (patrones como *Sidecar* o *Ambassador*), surge la necesidad de compartir datos entre ellos.

Para resolver estos desafíos iniciales sin entrar aún en el almacenamiento persistente a largo plazo, Kubernetes nos ofrece los volúmenes de tipo `emptyDir` y `hostPath`.

### El volumen `emptyDir`: Almacenamiento atado al ciclo de vida del Pod

Un volumen `emptyDir` se crea en el momento en que un Pod es asignado a un Nodo. Como su nombre indica, comienza como un directorio vacío. Todos los contenedores dentro del Pod pueden leer y escribir en este volumen, e incluso pueden montarlo en rutas diferentes dentro de sus respectivos sistemas de archivos.

La característica fundamental del `emptyDir` es su ciclo de vida: **existe exactamente el mismo tiempo que el Pod**. Si el Pod es eliminado (ya sea intencionalmente, por un *eviction* del nodo o por un fallo crítico), los datos del `emptyDir` se borran de forma permanente e irrecuperable. Sin embargo, es importante destacar que si un *contenedor* dentro del Pod falla y es reiniciado, los datos del `emptyDir` **se mantienen intactos**.

**Casos de uso comunes:**

* **Espacio de *scratch*:** Procesamiento temporal de datos, como operaciones de ordenamiento en disco que exceden la memoria RAM disponible.
* **Compartición de datos (Patrón Sidecar):** Un contenedor principal que escribe logs o procesa datos, y un contenedor *sidecar* que lee esos mismos datos para exportarlos (por ejemplo, a un sistema de centralización de logs).
* **Puesta en marcha (Init Containers):** Un *Init Container* descarga un archivo de configuración o un binario desde un repositorio externo, lo guarda en el `emptyDir` y finaliza. Luego, el contenedor principal arranca y utiliza ese archivo.

**Diagrama de arquitectura de un emptyDir:**

```text
+-----------------------------------------------------------+
| Nodo de Trabajo (Worker Node)                             |
|                                                           |
|  +-----------------------------------------------------+  |
|  | Pod                                                 |  |
|  |                                                     |  |
|  |  +------------------+         +------------------+  |  |
|  |  | Contenedor App   |         | Contenedor Log   |  |  |
|  |  | Montaje: /app/out|         | Montaje: /var/log|  |  |
|  |  +--------|---------+         +---------|--------+  |  |
|  |           |                             |           |  |
|  |           +------> emptyDir <-----------+           |  |
|  |                 (Directorio físico)                 |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+

```

**Ejemplo de implementación:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-sidecar-emptydir
spec:
  containers:
  - name: app-principal
    image: busybox
    command: ["/bin/sh", "-c", "while true; do echo 'Generando datos...' >> /app/out/datos.log; sleep 5; done"]
    volumeMounts:
    - name: volumen-compartido
      mountPath: /app/out
  - name: app-sidecar
    image: busybox
    command: ["/bin/sh", "-c", "tail -f /var/log/datos.log"]
    volumeMounts:
    - name: volumen-compartido
      mountPath: /var/log
  volumes:
  - name: volumen-compartido
    emptyDir: {}

```

> **Tip Senior:** Por defecto, `emptyDir` utiliza el medio de almacenamiento del disco del nodo. Si necesitas almacenamiento de altísima velocidad y no te importa consumir memoria RAM del nodo, puedes configurar `emptyDir.medium: Memory`. Esto crea un volumen respaldado por un *tmpfs* (RAM). Ten cuidado, ya que el espacio utilizado aquí contará contra los *Limits* de memoria del contenedor y podría provocar un OOMKilled si se descontrola.

---

### El volumen `hostPath`: Rompiendo el aislamiento

El volumen `hostPath` monta un archivo o directorio del sistema de archivos del Nodo directamente en el Pod.

A diferencia de `emptyDir`, los datos de un `hostPath` persisten en el servidor físico o máquina virtual subyacente incluso si el Pod muere. Sin embargo, **este no es un mecanismo de persistencia recomendado para aplicaciones de usuario o bases de datos**. En un clúster de Kubernetes, un Pod puede ser reprogramado en cualquier otro nodo en cualquier momento. Si el Pod se levanta en un nodo distinto, el directorio `hostPath` no tendrá los datos del nodo anterior.

**¿Por qué usar `hostPath` entonces?**
Este tipo de volumen es una herramienta de infraestructura, no de aplicación. Está pensado para cargas de trabajo altamente acopladas a la administración y observabilidad del nodo, habitualmente desplegadas como *DaemonSets* (vistos en el Capítulo 3).

**Casos de uso válidos:**

* **Agentes de Monitoreo/Logging:** Herramientas como Fluentd, Promtail o Datadog Agent necesitan montar `/var/log` o `/var/lib/docker/containers` del host para leer los logs de todos los contenedores que corren en ese nodo.
* **Plugins CNI/CSI:** Los componentes de red (como Calico o Cilium) y de almacenamiento necesitan acceso a directorios del sistema operativo del nodo (`/opt/cni/bin` o `/etc/cni/net.d`) para configurar interfaces o montar discos físicos.
* **Acceso a dispositivos de hardware:** Montar `/dev` para acceder a GPUs o hardware específico.

El campo `type` dentro de la especificación de `hostPath` permite definir qué esperamos encontrar en el nodo (o qué debe crear Kubernetes). Algunos tipos útiles son:

* `DirectoryOrCreate`: Si no existe nada en la ruta dada, crea un directorio vacío con permisos `0755`.
* `Directory`: El directorio debe existir previamente.
* `FileOrCreate`: Crea un archivo vacío si no existe.
* `Socket`: Útil para montar el socket de Docker (`/var/run/docker.sock`) o containerd.

**Ejemplo de implementación:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-explorador-nodos
spec:
  containers:
  - name: explorador
    image: ubuntu
    command: ["sleep", "infinity"]
    volumeMounts:
    - name: logs-del-nodo
      mountPath: /host-logs
      readOnly: true
  volumes:
  - name: logs-del-nodo
    hostPath:
      path: /var/log
      type: Directory

```

**⚠️ Advertencia de Seguridad y Gobernanza:**
El uso indiscriminado de `hostPath` es uno de los mayores vectores de ataque en Kubernetes. Si un contenedor comprometido tiene un `hostPath` a la raíz del nodo (`/`), el atacante podría modificar archivos de configuración del `kubelet` o robar credenciales. Como veremos en el **Capítulo 8 (Seguridad y Gobernanza)**, el uso de `hostPath` suele estar estrictamente bloqueado en entornos de producción mediante *Pod Security Standards (PSS)* o políticas con *OPA Gatekeeper / Kyverno*, permitiéndose únicamente a Service Accounts específicas del sistema.

Si tu aplicación (por ejemplo, un PostgreSQL o un Redis) necesita mantener datos más allá del ciclo de vida de un Pod de manera segura y agnóstica al nodo, `hostPath` y `emptyDir` no son la solución. Para eso, Kubernetes introduce las abstracciones de volúmenes persistentes que exploraremos en la siguiente sección.

## 5.2 Persistent Volumes (PV) y Persistent Volume Claims (PVC)

Como vimos en la sección anterior, los volúmenes `emptyDir` y `hostPath` tienen limitaciones críticas cuando hablamos de aplicaciones con estado (Stateful) en un entorno distribuido. Si un Pod de base de datos es reprogramado en un nodo distinto, usar el almacenamiento local de ese nodo significa perder el acceso a los datos originales.

Para resolver esto, Kubernetes introduce un patrón de diseño fundamental: **el desacoplamiento del almacenamiento y la computación**. Esto permite que los equipos de infraestructura gestionen los recursos físicos de almacenamiento, mientras que los desarrolladores simplemente solicitan lo que necesitan sin preocuparse por los detalles subyacentes. Este patrón se implementa a través de dos objetos clave: los *Persistent Volumes* (PV) y los *Persistent Volume Claims* (PVC).

### Persistent Volume (PV): La pieza de infraestructura

Un Persistent Volume (PV) es un recurso a nivel de clúster (no pertenece a ningún *Namespace*) que representa una porción de almacenamiento físico en la red. Es aprovisionado típicamente por un administrador del clúster o dinámicamente mediante *Storage Classes* (que veremos en la sección 5.3).

El PV encapsula los detalles de implementación del backend de almacenamiento, ya sea un disco de red en la nube (AWS EBS, Google Persistent Disk, Azure Disk), un servidor NFS tradicional, o un clúster de Ceph. El ciclo de vida de un PV es completamente independiente de cualquier Pod individual.

### Persistent Volume Claim (PVC): La solicitud del desarrollador

Un Persistent Volume Claim (PVC) es una solicitud de almacenamiento realizada por un usuario o desarrollador. A diferencia del PV, el PVC **sí existe dentro de un Namespace**.

Así como un Pod consume recursos de CPU y Memoria del Nodo, un PVC consume recursos de un PV. En lugar de especificar qué servidor NFS usar, el desarrollador crea un PVC pidiendo, por ejemplo, "necesito 10 GiB de almacenamiento que pueda ser leído y escrito por un solo nodo".

### El proceso de "Binding" (Enlace)

Cuando un usuario crea un PVC, el *Control Plane* de Kubernetes busca un PV disponible que satisfaga las necesidades de esa solicitud (capacidad, modos de acceso y clase de almacenamiento). Si encuentra una coincidencia, realiza un proceso llamado **Binding**, enlazando el PVC al PV de forma exclusiva.

**Diagrama de Arquitectura: Separación de Responsabilidades**

```text
  ESPACIO DEL DESARROLLADOR (Namespace)  |  ESPACIO DEL ADMINISTRADOR (Cluster)
                                         |
+-------------------+                    |
|       Pod         |                    |
|                   |                    |
|  +-------------+  |   1. Solicita      |
|  | volumeMount | ----> almacenamiento  |
|  +-------------+  |                    |
+-------------------+                    |
          |                              |
          |                              |
          v                              |
+-------------------+    2. Hace Bind    |     +--------------------+
|       PVC         | <======================> |        PV          |
| (10Gi, ReadWrite) |    (Match exacto)  |     | (10Gi, NFS Server) |
+-------------------+                    |     +--------------------+
                                         |              |
                                         |              | 3. Respaldo físico
                                         |              v
                                         |     [ Servidor NFS Real ]
                                         |     [ AWS EBS / GCP PD  ]

```

### Modos de Acceso (Access Modes)

Para que un PVC se enlace a un PV, ambos deben soportar el mismo modo de acceso. Esto define cuántos nodos pueden montar el volumen y con qué permisos. Los modos principales son:

* **ReadWriteOnce (RWO):** El volumen puede ser montado como lectura/escritura por **un solo nodo** a la vez. Es el estándar para bases de datos transaccionales (como MySQL o PostgreSQL) respaldadas por discos de bloques (como AWS EBS).
* **ReadOnlyMany (ROX):** El volumen puede ser montado como solo lectura por **múltiples nodos** simultáneamente. Ideal para servir configuraciones estáticas o activos web a un *ReplicaSet* de Nginx.
* **ReadWriteMany (RWX):** El volumen puede ser montado como lectura/escritura por **múltiples nodos** simultáneamente. Requiere un sistema de archivos en red (como NFS, CephFS o AWS EFS).
* **ReadWriteOncePod (RWOP):** Introducido recientemente en Kubernetes, asegura que el volumen sea montado como lectura/escritura por **un solo Pod**, incluso si hay otros Pods en el mismo nodo. Ofrece un aislamiento mucho más estricto que RWO.

### Ejemplo de Implementación

**1. El Administrador crea el PV (NFS en este ejemplo):**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs-datos
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: /export/datos
    server: 192.168.1.100

```

**2. El Desarrollador crea el PVC en su Namespace:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-app-datos
  namespace: mi-app-backend
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 15Gi 
      # Kubernetes buscará un PV con al menos 15Gi. Enlazará el de 20Gi.

```

**3. El Desarrollador monta el PVC en su Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-backend
  namespace: mi-app-backend
spec:
  containers:
  - name: servidor
    image: nginx
    volumeMounts:
    - mountPath: "/usr/share/nginx/html"
      name: volumen-compartido
  volumes:
  - name: volumen-compartido
    persistentVolumeClaim:
      claimName: pvc-app-datos # Referencia al PVC, NO al PV

```

> **Tip Senior:** Ten mucho cuidado con los volúmenes de red de tipo bloque (RWO como AWS EBS) al realizar un *Rolling Update* de un Deployment. Si tu nueva réplica del Pod se programa en un Nodo B, pero la réplica antigua sigue corriendo en el Nodo A atada al volumen, el nuevo Pod quedará en estado `ContainerCreating` esperando a que el Nodo A libere el volumen. Para aplicaciones stateful, casi siempre debes usar `StatefulSets` (Capítulo 3), los cuales garantizan que el Pod antiguo se destruya por completo antes de levantar el nuevo y reasignar el volumen.

## 5.3 Storage Classes y Aprovisionamiento Dinámico

En la sección anterior, vimos cómo los PVs y PVCs desacoplan el almacenamiento de la computación. Sin embargo, el modelo de aprovisionamiento *estático* (donde un administrador debe crear manualmente un recurso `PersistentVolume` por cada volumen físico que existe) presenta un cuello de botella operativo masivo.

Imagina un clúster con cientos de desarrolladores desplegando aplicaciones constantemente. Si cada vez que alguien necesita una base de datos el equipo de plataforma debe ir a la consola de AWS, crear un disco EBS, copiar el ID del volumen y crear un manifiesto YAML de un PV, el paradigma ágil y declarativo de Kubernetes se rompe por completo.

Aquí es donde entra el **Aprovisionamiento Dinámico** y su objeto habilitador: la **StorageClass** (Clase de Almacenamiento).

### ¿Qué es una StorageClass?

Una `StorageClass` proporciona a los administradores una forma de describir los "perfiles" o "clases" de almacenamiento que ofrecen. Diferentes clases pueden mapear a distintos niveles de calidad de servicio (QoS), políticas de respaldo, o infraestructura subyacente.

Por ejemplo, podrías tener:

* Una clase `standard` respaldada por discos magnéticos (HDD) lentos pero económicos.
* Una clase `premium` respaldada por discos de estado sólido (SSD) de alto rendimiento (IOPS aprovisionados).
* Una clase `nfs-shared` para almacenamiento de red compartido (ReadWriteMany).

Cuando un desarrollador crea un PVC, simplemente especifica el nombre de la `StorageClass` que necesita. Kubernetes se encarga de hablar con el proveedor de la nube o la infraestructura subyacente, aprovisionar el disco físico de forma automatizada, y crear el objeto PV correspondiente al vuelo.

### Componentes clave de una StorageClass

Una `StorageClass` es inmutable; una vez creada, no puedes modificar sus parámetros, solo puedes borrarla y recrearla. Sus campos más importantes son:

1. **Provisioner:** Indica qué plugin de volumen interno (o driver CSI, que veremos en la sección 5.4) se utilizará para crear el disco físico. Ejemplos: `ebs.csi.aws.com`, `pd.csi.storage.gke.io`.
2. **Parameters:** Un diccionario clave-valor específico del *provisioner*. Aquí se define si el disco es tipo `gp3` (AWS), `pd-ssd` (GCP), el tipo de encriptación o el sistema de archivos (ext4, xfs).
3. **ReclaimPolicy:** Por defecto en el aprovisionamiento dinámico, suele ser `Delete`. Esto significa que si el usuario borra su PVC, Kubernetes destruirá automáticamente el PV y el disco físico en la nube. Si deseas conservar los datos tras borrar el PVC, debes configurarlo como `Retain`.
4. **VolumeBindingMode:** (Fundamental para alta disponibilidad). Define *cuándo* debe ocurrir el aprovisionamiento y el enlace del volumen.

**Diagrama de Arquitectura: Aprovisionamiento Dinámico**

```text
+-------------------+      1. Solicita PVC
| Desarrollador     | ----------------------+
+-------------------+                       |
                                            v
                              +----------------------------+
                              | PersistentVolumeClaim (PVC)|
                              | storageClassName: premium  |
                              +----------------------------+
                                            |
                                            | 2. K8s busca la SC
                                            v
+-------------------+         +----------------------------+
| Administrador     | ------> | StorageClass (SC)          |
+-------------------+  Define | name: premium              |
                              | provisioner: aws-ebs       |
                              | type: io1 (SSD rápido)     |
                              +----------------------------+
                                            |
                                            | 3. El Provisioner actúa
                                            v
                              +----------------------------+
                              | API del Proveedor (Nube)   |
                              | (Crea el disco real)       |
                              +----------------------------+
                                            |
                                            | 4. Retorna ID y crea PV
                                            v
                              +----------------------------+
                              | PersistentVolume (PV)      |
                              | (Enlazado al PVC)          |
                              +----------------------------+

```

### Ejemplo de Implementación: AWS EBS gp3

Primero, el administrador del clúster define la clase de almacenamiento:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc-fast
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"

```

Luego, el desarrollador solicita almacenamiento usando esa clase:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mi-base-de-datos-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-sc-fast # Referencia a la StorageClass
  resources:
    requests:
      storage: 50Gi

```

### El problema de la topología: `WaitForFirstConsumer`

> **Tip Senior:** Uno de los errores más comunes en clústeres multi-zona (Multi-AZ) es dejar el `volumeBindingMode` de la StorageClass en su valor por defecto: `Immediate`.

Imagina que tienes nodos en la Zona A y en la Zona B. Si usas `Immediate`, en el instante en que creas el PVC, Kubernetes aprovisiona el volumen físico. Supongamos que lo crea en la **Zona A**.
Momentos después, despliegas tu Pod. El *Scheduler* de Kubernetes, analizando recursos de CPU y memoria, decide colocar tu Pod en la **Zona B**.

¿El resultado? El Pod fallará al arrancar porque un disco EBS creado en la Zona A no puede ser montado (adjuntado) a una máquina virtual (Nodo) que se encuentra en la Zona B.

Al configurar **`volumeBindingMode: WaitForFirstConsumer`**, le dices a Kubernetes: *"No crees el disco físico todavía. Espera a que un Pod intente usar este PVC. Una vez que el Scheduler decida en qué Nodo (y por ende, en qué Zona) va a correr el Pod, entonces y solo entonces, aprovisiona el disco físico exactamente en esa misma Zona"*. Esta configuración es obligatoria en entornos productivos distribuidos.

## 5.4 Container Storage Interface (CSI) y plugins de nube

Para entender por qué existe Container Storage Interface (CSI), primero debemos comprender el problema histórico que Kubernetes enfrentó con el almacenamiento.

En las primeras versiones del orquestador, el código que permitía montar discos de AWS (EBS), Google Cloud (PD) o sistemas como Ceph y GlusterFS, estaba integrado directamente en el código fuente principal de Kubernetes. A esto se le conocía como plugins **"In-Tree"** (dentro del árbol de código).

Este enfoque era una pesadilla operativa y de desarrollo:

1. **Ciclos de release acoplados:** Si un proveedor de almacenamiento quería lanzar una nueva funcionalidad o parchear un error crítico en su driver, tenía que esperar al siguiente ciclo de lanzamiento oficial de Kubernetes (que ocurre cada varios meses).
2. **Seguridad y estabilidad:** El código de terceros (de los proveedores) se ejecutaba con los mismos privilegios que los componentes del *Control Plane* de Kubernetes (el `kube-controller-manager`). Un bug en un driver de almacenamiento podía tumbar todo el clúster.
3. **Código inflado:** El binario de Kubernetes crecía desproporcionadamente con cada nuevo proveedor de almacenamiento que se sumaba al ecosistema.

Para resolver esto, la comunidad creó el estándar **CSI (Container Storage Interface)**, migrando toda la lógica de almacenamiento hacia un modelo **"Out-of-Tree"**.

### ¿Qué es CSI y cómo funciona?

CSI no es exclusivo de Kubernetes; es un estándar de la industria diseñado para exponer sistemas de almacenamiento de bloques y archivos a cargas de trabajo en contenedores (también es soportado por orquestadores como Nomad).

En Kubernetes, CSI permite a los proveedores de almacenamiento escribir un plugin (el driver CSI) que puede ser desplegado, actualizado y gestionado de forma completamente independiente al ciclo de vida del clúster de Kubernetes.

La arquitectura de un driver CSI se divide típicamente en dos grandes bloques instalados en el clúster:

* **Componentes del Controlador (Control Plane):** Generalmente desplegados como un *Deployment* o *StatefulSet* con alta disponibilidad. Se encargan de hablar con la API del proveedor de la nube (por ejemplo, hacer la llamada HTTP a AWS para crear o borrar un disco EBS). Incluyen *sidecars* estándar provistos por Kubernetes como el `external-provisioner` (escucha los PVCs y crea los discos) y el `external-attacher` (adjunta el disco a la máquina virtual del Nodo).
* **Componentes del Nodo (Data Plane):** Desplegados obligatoriamente como un *DaemonSet* para asegurar que corra una instancia en cada *Worker Node*. Este componente (el `csi-node-driver`) es el que recibe el disco físico que el controlador adjuntó, y ejecuta los comandos del sistema operativo a bajo nivel (como `mkfs.ext4` y `mount`) para que el directorio quede disponible para el contenedor.

**Diagrama de Arquitectura CSI:**

```text
                               +------------------------------------+
                               | Nube / Infraestructura Externa     |
                               | (API de AWS, GCP, vSphere, Ceph)   |
                               +------------------------------------+
                                        ^                  |
                 (Crea/Borra/Adjunta)   |                  | (Disco físico)
                                        v                  v
+-----------------------------------------------+   +-------------------+
| Kubernetes Control Plane                      |   | Worker Node       |
|                                               |   |                   |
|  +--------------------+   +----------------+  |   |  +-------------+  |
|  | Kube API Server    |   | CSI Controller |  |   |  | CSI Node    |  |
|  | (PVCs, PVs, SCs)   |---| (Deployment)   |  |   |  | (DaemonSet) |  |
|  +--------------------+   +----------------+  |   |  +-------------+  |
+-----------------------------------------------+   |         |         |
                                                    |         v         |
                                                    |  [Pod de tu App]  |
                                                    +-------------------+

```

### Identificando y usando un driver CSI

Como vimos en la sección 5.3, la conexión entre Kubernetes y un driver CSI específico ocurre en el objeto `StorageClass`, a través del campo `provisioner`.

El nombre de un provisioner CSI siempre sigue un formato de dominio inverso. Algunos de los plugins de nube más comunes son:

* **AWS EBS:** `ebs.csi.aws.com`
* **AWS EFS:** `efs.csi.aws.com`
* **Google Persistent Disk:** `pd.csi.storage.gke.io`
* **Azure Disk:** `disk.csi.azure.com`
* **Ceph (Rook):** `rook-ceph.rbd.csi.ceph.com`

**Ejemplo:** Si tu clúster en EKS (AWS) utiliza el driver CSI de EBS, primero debes asegurarte de instalar el driver (usualmente vía Helm o como un Add-on de EKS). Una vez que los Pods del controlador y del nodo de CSI están en ejecución, tu clúster ya entiende cómo procesar una `StorageClass` que invoque a `ebs.csi.aws.com`.

### Capacidades Avanzadas: Volume Snapshots y Clonación

> **Tip Senior:** Uno de los mayores beneficios del estándar CSI es que introdujo características operativas de nivel empresarial que eran imposibles con los viejos plugins In-Tree.

CSI estandarizó la toma de **Snapshots** (instantáneas) y la clonación de volúmenes directamente desde la API de Kubernetes mediante *Custom Resource Definitions* (CRDs).

Si tu driver CSI soporta instantáneas (como lo hacen los principales proveedores de nube), puedes crear un objeto `VolumeSnapshot` apuntando a tu PVC. El driver CSI pausará las escrituras, se comunicará con la API de la nube, tomará un snapshot del bloque de almacenamiento real (por ejemplo, un snapshot de EBS en AWS) y guardará la referencia en Kubernetes.

**Ejemplo de un VolumeSnapshot:**

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: backup-db-diario
  namespace: mi-app-backend
spec:
  volumeSnapshotClassName: csi-aws-vsc # Clase de snapshot configurada previamente
  source:
    persistentVolumeClaimName: pvc-app-datos # El PVC que queremos respaldar

```

Posteriormente, podrías crear un *nuevo* PVC que utilice este `VolumeSnapshot` como fuente de datos (data source), levantando así un clon exacto de tu base de datos en cuestión de segundos, una técnica invaluable para el *troubleshooting* o la creación de entornos efímeros de prueba.

## 5.5 Estrategias de retención (Reclaim Policies) y redimensionamiento de volúmenes

Aprovisionar almacenamiento y enlazarlo a nuestras aplicaciones es solo la mitad del trabajo. En el ciclo de vida de una aplicación con estado, inevitablemente nos enfrentaremos a dos escenarios operativos críticos: qué sucede con los datos cuando la aplicación ya no es necesaria (o es eliminada por error), y qué hacer cuando el disco original se queda sin espacio.

Estas operaciones de "Día 2" se gestionan a través de las políticas de retención (*Reclaim Policies*) y las capacidades de redimensionamiento (*Volume Expansion*) de Kubernetes.

### Estrategias de retención (Reclaim Policies)

La política de retención (`persistentVolumeReclaimPolicy`) es una propiedad del objeto `PersistentVolume` (PV). Esta política le dicta al *Control Plane* de Kubernetes exactamente qué hacer con el volumen físico subyacente cuando el usuario elimina el `PersistentVolumeClaim` (PVC) asociado.

Existen dos políticas principales en uso hoy en día (una tercera, `Recycle`, está obsoleta y ha sido reemplazada por el aprovisionamiento dinámico):

**1. Política `Retain` (Retener)**

Cuando un PVC es eliminado y el PV tiene la política `Retain`, el PV pasa a un estado llamado `Released` (Liberado).

En este estado:

* El PV **no** está disponible para ser reclamado por otro PVC (sus metadatos aún conservan el enlace al PVC anterior).
* El disco físico en la nube o el servidor de almacenamiento subyacente **permanece intacto** con todos sus datos.
* Para reutilizar el disco, el administrador del clúster debe intervenir manualmente: borrar el recurso PV en Kubernetes, limpiar los datos físicos si es necesario, y crear un nuevo PV apuntando a ese mismo almacenamiento.

> **Tip Senior:** Esta es la política obligatoria para bases de datos de producción y datos críticos. Si un desarrollador o un script de CI/CD ejecuta un `kubectl delete namespace` por accidente, perderás los Pods y los PVCs, pero el disco de AWS EBS o GCP Persistent Disk sobrevivirá gracias al `Retain`, permitiéndote recuperar la base de datos.

**2. Política `Delete` (Eliminar)**

Esta es la política por defecto cuando los volúmenes son creados mediante **Aprovisionamiento Dinámico** (StorageClasses).

Cuando un PVC es eliminado:

* Kubernetes elimina automáticamente el objeto PV.
* El driver de almacenamiento (ej. el plugin CSI de AWS) realiza una llamada a la API de la nube y **destruye el disco físico subyacente**. Los datos se pierden irreversiblemente (a menos que tengas snapshots de respaldo).

**Cambio de política al vuelo:**
Es una práctica común y recomendada modificar dinámicamente un PV aprovisionado por una StorageClass (que nace con `Delete`) para protegerlo. Puedes parchearlo directamente:

```bash
kubectl patch pv <nombre-del-pv> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'

```

### Redimensionamiento de Volúmenes (Volume Expansion)

Históricamente, si un disco se llenaba, la única solución era aprovisionar un disco nuevo más grande, detener la aplicación, copiar los datos con `rsync` y actualizar los manifiestos. Hoy, gracias al estándar CSI, Kubernetes soporta el redimensionamiento dinámico.

**Requisitos previos:**
Para que un volumen pueda crecer, la `StorageClass` que lo aprovisionó debe tener habilitada la propiedad `allowVolumeExpansion: true`.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc-expandible
provisioner: ebs.csi.aws.com
allowVolumeExpansion: true # <-- Habilitador clave
volumeBindingMode: WaitForFirstConsumer

```

**El flujo de redimensionamiento:**

A diferencia de la creación, donde intervienen varios objetos, para redimensionar un volumen el desarrollador **solo debe editar su PVC**.

Si tienes un PVC de `50Gi` y necesitas `100Gi`, simplemente editas el manifiesto del PVC y aplicas los cambios (`kubectl apply -f pvc.yaml`):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mi-base-de-datos-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi # Se incrementa el valor aquí

```

**Diagrama de Arquitectura: Flujo de expansión (Online Expansion)**

```text
+-------------------+
| Edición del PVC   | (1. Usuario cambia storage: 100Gi)
+-------------------+
          |
          v
+-------------------+
| CSI Controller    | (2. Llama a la API de la nube para expandir 
|                   |     el volumen de bloque de 50GB a 100GB)
+-------------------+
          |
          v
+-------------------+
| Kubelet / CSI Node| (3. Detecta el nuevo tamaño del bloque. Ejecuta
| (En el Nodo)      |     resize2fs o xfs_growfs dentro del nodo)
+-------------------+
          |
          v
+-------------------+
| Contenedor        | (4. La aplicación ve inmediatamente 100GB 
| (App corriendo)   |     sin necesidad de reiniciarse)
+-------------------+

```

**Consideraciones Críticas para Arquitectos:**

1. **Expansión "Online" vs "Offline":** La mayoría de los drivers CSI modernos (como AWS EBS, GCE PD y Azure Disk) soportan expansión *Online*. Esto significa que el sistema de archivos se expande mientras el Pod está corriendo y consumiendo el volumen. Si el driver solo soporta expansión *Offline*, deberás eliminar el Pod (escalar a 0) para que el disco se desenganche, se expanda y, al volver a levantar el Pod, el sistema de archivos refleje el nuevo tamaño.
2. **La regla de oro: Solo hacia arriba.** Puedes incrementar el tamaño de un volumen, pero **es arquitectónicamente imposible reducirlo** a través de Kubernetes. Ningún sistema de archivos tradicional soporta una contracción en caliente de forma segura. Si necesitas un disco más pequeño, deberás crear un PVC nuevo y migrar los datos manualmente.
3. **Límites del proveedor de nube:** Aunque Kubernetes lo soporte, los proveedores de nube imponen cuotas (por ejemplo, AWS solo permite modificar un volumen EBS una vez cada 6 horas). Si te equivocas en el cálculo y expandes muy poco, tendrás que esperar varias horas para volver a intentarlo. Siempre escala con un margen generoso.
