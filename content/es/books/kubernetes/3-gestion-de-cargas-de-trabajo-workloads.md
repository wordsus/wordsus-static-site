Dominar Kubernetes exige transicionar del Pod individual a arquitecturas resilientes y automatizadas. En este capítulo, exploraremos los controladores que dan vida a la infraestructura. Analizaremos el **ReplicaSet** como garante de la disponibilidad y el **Deployment** como motor de actualizaciones sin fricción mediante *RollingUpdates*. Abordaremos la complejidad de los datos con **StatefulSets**, la ubicuidad operativa de los **DaemonSets** para agentes de sistema, y la gestión de tareas efímeras con **Jobs** y **CronJobs**. Esta sección es el núcleo donde la teoría del contenedor se convierte en una estrategia de operaciones escalable y profesional.

## 3.1 ReplicaSets y escalado manual

En el capítulo anterior, establecimos que el Pod es la unidad atómica de ejecución en Kubernetes. Sin embargo, los Pods son efímeros y mortales por naturaleza. Si el nodo donde se ejecuta un Pod falla, o si el proceso interno colapsa y no puede ser reiniciado por el `kubelet`, ese Pod desaparece para siempre.

Para entornos de producción, ejecutar un único Pod de forma aislada (conocido como *Naked Pod*) es una práctica inaceptable. Necesitamos redundancia, alta disponibilidad y la garantía de que siempre habrá una cantidad específica de instancias de nuestra aplicación en ejecución. Aquí es donde entra en juego el **ReplicaSet**.

---

### El propósito del ReplicaSet

Un **ReplicaSet** es un controlador del plano de control cuyo único propósito es mantener un conjunto estable de Pods réplica ejecutándose en un momento dado. Garantiza que un número específico de Pods idénticos (la "flota") esté siempre disponible.

Si hay muy pocos Pods (por ejemplo, un nodo se cae), el ReplicaSet solicita la creación de nuevos Pods. Si hay demasiados (por ejemplo, un nodo que se creía caído vuelve a conectarse), el ReplicaSet elimina el exceso. Este es el principio básico del bucle de reconciliación (Control Loop) aplicado a la gestión de cargas de trabajo.

#### La magia de los Selectores (Labels y Selectors)

El ReplicaSet no "crea" Pods y los ata internamente a una base de datos rígida. En su lugar, utiliza **Labels** (etiquetas) y **Selectors** (selectores).

El ciclo funciona así:

1. El ReplicaSet vigila constantemente el clúster en busca de Pods que coincidan con su `selector`.
2. Cuenta cuántos Pods coinciden con esas etiquetas.
3. Compara ese número con su estado deseado (`replicas`).
4. Actúa en consecuencia (crea o destruye) usando la plantilla (`template`) que tiene definida.

A continuación, un diagrama en texto plano que ilustra esta relación:

```text
+----------------------------------------------------+
|                ReplicaSet: frontend                |
|                (Estado Deseado: 3)                 |
+----------------------------------------------------+
                         |
                 [Selector: app=nginx]
                         |
       +-----------------+-----------------+
       |                 |                 |
       v                 v                 v
+-------------+   +-------------+   +-------------+
|    Pod 1    |   |    Pod 2    |   |    Pod 3    |
| (app=nginx) |   | (app=nginx) |   | (app=nginx) |
+-------------+   +-------------+   +-------------+

```

---

### Definiendo un ReplicaSet en YAML

Veamos cómo se traduce esto al paradigma declarativo que introdujimos en el Capítulo 2.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: frontend-rs
  labels:
    tier: frontend
spec:
  # 1. Estado deseado: ¿Cuántos Pods queremos?
  replicas: 3
  
  # 2. Selector: ¿Cómo identifica el ReplicaSet a sus Pods?
  selector:
    matchLabels:
      app: webserver
  
  # 3. Template: Si faltan Pods, ¿qué modelo debe usar para crearlos?
  template:
    metadata:
      # CRÍTICO: Estas etiquetas deben coincidir con el selector de arriba
      labels:
        app: webserver
    spec:
      containers:
      - name: nginx
        image: nginx:1.25-alpine
        ports:
        - containerPort: 80

```

> **Nota de Arquitectura (De Cero a Senior):** Un error clásico de configuración es definir un `selector.matchLabels` que no coincide con las `labels` dentro del `template.metadata`. Si intentas aplicar un manifiesto así, el API Server lo rechazará inmediatamente, ya que el ReplicaSet crearía Pods que no podría identificar, entrando en un bucle infinito de creación.

Al aplicar este manifiesto (`kubectl apply -f replicaset.yaml`), Kubernetes creará el objeto ReplicaSet, y este, a su vez, instanciará los 3 Pods.

---

### Escalado Manual

El escalado manual consiste en alterar la cantidad de réplicas deseadas. En Kubernetes, existen dos enfoques principales para realizar esta tarea: el imperativo y el declarativo.

#### 1. Enfoque Imperativo (Vía CLI)

Puedes usar el comando `kubectl scale` para cambiar el número de réplicas al instante. Esto es útil para respuestas rápidas ante incidentes o pruebas directas, pero **no es una buena práctica** para operaciones regulares, ya que desincroniza el estado del clúster del código fuente (rompiendo los principios que veremos en el Capítulo 11 sobre GitOps).

Para escalar nuestro ReplicaSet a 5 réplicas:

```bash
kubectl scale replicaset frontend-rs --replicas=5

```

Salida esperada:

```bash
replicaset.apps/frontend-rs scaled

```

Si ejecutas `kubectl get pods -l app=webserver`, verás que dos nuevos Pods están en fase de creación (`ContainerCreating`) para cumplir con el nuevo estado deseado.

#### 2. Enfoque Declarativo (Vía Manifiesto)

Este es el enfoque correcto para DevOps. Consiste en modificar el archivo YAML original, cambiando el valor de `spec.replicas`.

Por ejemplo, para reducir la carga (scale down), modificamos el archivo a `replicas: 2` y aplicamos el cambio:

```bash
kubectl apply -f replicaset.yaml

```

El ReplicaSet detectará que el estado deseado ha bajado a 2, mientras que el estado actual es 5 (o 3). Inmediatamente, enviará una señal de terminación (`SIGTERM`) a los Pods sobrantes para ajustar el clúster a la nueva realidad.

---

### Adopción y Orfandad (Conceptos Senior)

Entender el comportamiento de los ReplicaSets va más allá de solo crearlos y escalarlos. Debes comprender qué sucede en los casos límite:

* **Adopción de Pods:** Si creas un *Naked Pod* manualmente que tiene las etiquetas `app: webserver`, el ReplicaSet `frontend-rs` lo "adoptará". Si el estado deseado es 3 y ya había 3 Pods, al detectar este cuarto Pod intruso, el ReplicaSet eliminará uno de los 4 para mantener el equilibrio estricto.
* **Aislamiento temporal:** Si un Pod se está comportando de manera extraña (por ejemplo, generando errores de memoria) y necesitas investigarlo sin que reciba tráfico ni sea reiniciado, puedes **cambiarle sus etiquetas manualmente** (`kubectl label pod <nombre-del-pod> app=debug --overwrite`). Al hacer esto, el ReplicaSet deja de reconocerlo. Como le "falta" un Pod para llegar a su objetivo, creará uno nuevo y sano, dejándote el Pod dañado aislado para hacer *troubleshooting*.
* **Eliminación en cascada vs. Orfandad:** Si eliminas un ReplicaSet (`kubectl delete rs frontend-rs`), por defecto se eliminarán todos los Pods que controla (eliminación en cascada). Si deseas eliminar la regla matemática del ReplicaSet pero dejar los Pods vivos corriendo en el clúster, debes usar la bandera `--cascade=orphan`.

**El límite del ReplicaSet:**
Aunque el ReplicaSet garantiza la alta disponibilidad y el escalado de nuestra aplicación, tiene una limitación fundamental: **no sabe cómo gestionar actualizaciones de versión**. Si cambias la imagen de `nginx:1.25-alpine` a `nginx:1.26-alpine` en el manifiesto y aplicas, el ReplicaSet se actualizará, pero *no recreará los Pods existentes*. Solo los nuevos Pods usarán la nueva imagen.

Para solucionar este problema de ciclo de vida de las aplicaciones y gestionar actualizaciones sin tiempo de inactividad, Kubernetes introduce una capa superior de abstracción, la cual exploraremos en la siguiente sección: **Los Deployments**.

## 3.2 Deployments: Estrategias de Rollout (RollingUpdate, Recreate) y Rollback

En la sección anterior, dejamos un problema crítico sobre la mesa: los ReplicaSets son excelentes para mantener la cantidad deseada de Pods, pero carecen de inteligencia para gestionar el ciclo de vida de las versiones de nuestra aplicación. Si modificamos la imagen de un contenedor en un ReplicaSet, este no reiniciará los Pods existentes; simplemente esperará a que mueran por alguna otra razón para usar la nueva plantilla.

En un entorno de producción moderno (y especialmente bajo la filosofía DevOps), desplegamos nuevas versiones de software constantemente. Necesitamos un mecanismo que automatice esta transición sin causar cortes en el servicio. La respuesta de Kubernetes a este desafío es el objeto **Deployment**.

---

### La Anatomía de un Deployment

Un Deployment es una abstracción de orden superior que gestiona ReplicaSets. Cuando creas un Deployment, este crea automáticamente un ReplicaSet debajo de él. Cuando actualizas la versión de tu aplicación en el Deployment, este crea un *nuevo* ReplicaSet, transfiere gradualmente los Pods del ReplicaSet antiguo al nuevo, y finalmente pausa o elimina el antiguo.

A nivel de manifiesto, un Deployment es casi idéntico a un ReplicaSet, pero con el campo `kind` distinto y una sección crucial: `strategy`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deploy
  labels:
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webserver
  # Aquí definimos CÓMO se actualizará la aplicación
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
  template:
    metadata:
      labels:
        app: webserver
    spec:
      containers:
      - name: nginx
        image: nginx:1.26-alpine # Nueva versión
        ports:
        - containerPort: 80

```

---

### Estrategias de Rollout (Actualización)

Kubernetes ofrece dos estrategias nativas principales para gestionar cómo se reemplazan los Pods antiguos por los nuevos. La elección correcta depende estrictamente de la naturaleza de tu aplicación y de tu tolerancia al tiempo de inactividad (downtime).

#### 1. Recreate (Recreación)

Esta es la estrategia más drástica y simple. El comportamiento es binario: el Deployment primero destruye **todos** los Pods de la versión anterior de golpe y, solo cuando han terminado de eliminarse, comienza a crear los Pods de la nueva versión.

* **Pros:** Evita por completo la coexistencia de dos versiones de la aplicación. Esto es vital si tu actualización incluye cambios incompatibles en el esquema de la base de datos que bloquearían la versión antigua, o si la aplicación requiere bloqueos de lectura/escritura en un volumen (RWO) que no puede ser compartido.
* **Contras:** Provoca un tiempo de inactividad garantizado (Downtime). Tu servicio no estará disponible desde que mueren los Pods antiguos hasta que los nuevos están listos (`Ready`).

```text
[Estrategia Recreate: Transición de v1 a v2]

Estado 1: [v1] [v1] [v1]  (Tráfico normal)
Estado 2: [ X] [ X] [ X]  (DOWNTIME: Todos eliminados)
Estado 3: [v2] [  ] [  ]  (Iniciando nuevos...)
Estado 4: [v2] [v2] [v2]  (Tráfico normal restaurado)

```

#### 2. RollingUpdate (Actualización Continua)

Esta es la estrategia por defecto de Kubernetes y la piedra angular del "Zero-Downtime Deployment" (despliegue sin tiempo de inactividad). Reemplaza los Pods antiguos por los nuevos de forma gradual y controlada.

Para orquestar este baile, `RollingUpdate` utiliza dos parámetros fundamentales (que pueden definirse en porcentajes o números absolutos):

* **`maxSurge` (Pico máximo):** Define cuántos Pods adicionales pueden crearse por encima de la cantidad deseada (`replicas`) durante la actualización. Por ejemplo, si tienes 4 réplicas y `maxSurge: 25%` (o 1), Kubernetes creará un 5º Pod temporalmente para empezar a absorber tráfico antes de matar uno antiguo.
* **`maxUnavailable` (Máximo indisponible):** Define cuántos Pods pueden estar no disponibles respecto a la cantidad deseada durante el proceso. Si tienes 4 réplicas y `maxUnavailable: 25%`, Kubernetes garantiza que al menos 3 Pods (el 75%) estarán siempre vivos atendiendo peticiones.

> **Nota de Arquitectura:** Un error común es configurar `maxSurge: 0` y `maxUnavailable: 0` simultáneamente. Esto es un estado imposible y la API de Kubernetes lo rechazará, ya que requiere crear sin destruir y destruir sin crear al mismo tiempo.

```text
[Estrategia RollingUpdate: Transición de v1 a v2 (replicas:3, maxSurge:1, maxUnavailable:0)]

1. Inicio:           [v1] [v1] [v1]
2. Surge (crea v2):  [v1] [v1] [v1] + [v2]
3. Reemplazo:        [v1] [v1] [v2] + [v2] (Destruye un v1, crea otro v2)
4. Continuación:     [v1] [v2] [v2] + [v2]
5. Fin:              [v2] [v2] [v2]

```

---

### Historial de Revisiones y Rollback (Marcha atrás)

Incluso con las mejores pruebas de integración, el código defectuoso llega a producción. Las *Probes* (que veremos en el Capítulo 9) pueden detectar que los nuevos Pods están fallando y detener un `RollingUpdate` a la mitad, pero tú sigues necesitando devolver el clúster a un estado estable.

Aquí brilla la gestión del estado declarativo. Cada vez que actualizas la plantilla (`podTemplate`) de un Deployment, Kubernetes crea una nueva **revisión**.

Puedes inspeccionar el historial de despliegues con:

```bash
kubectl rollout history deployment/frontend-deploy

```

Si descubres que la revisión actual (ej. v2) está causando errores 500, puedes ejecutar un **Rollback** instantáneo a la revisión anterior (v1):

```bash
kubectl rollout undo deployment/frontend-deploy

```

Este comando imperativo le dice a Kubernetes: *"Vuelve a activar el ReplicaSet de la revisión anterior y realiza un RollingUpdate inverso"*.

Si necesitas volver a una revisión mucho más antigua, puedes especificarla:

```bash
kubectl rollout undo deployment/frontend-deploy --to-revision=3

```

**Controlando el límite del historial:**
Por defecto, Kubernetes guarda las últimas 10 revisiones. En clústeres masivos, mantener cientos de ReplicaSets inactivos consume recursos de `etcd` (la base de datos del clúster). Puedes controlar cuántos históricos conservar ajustando el campo `spec.revisionHistoryLimit` en tu manifiesto. Si lo estableces en `0`, no podrás hacer rollbacks. Un valor entre `3` y `5` suele ser óptimo para producción.

## 3.3 StatefulSets: Gestión de aplicaciones con estado y bases de datos

Hasta ahora hemos explorado cómo los ReplicaSets y Deployments gestionan flotas de Pods. Estos controladores asumen una premisa fundamental: **las aplicaciones son apátridas (Stateless)**. En un Deployment, todos los Pods son clones idénticos y desechables. Si el Pod `frontend-7b94d6588-x2b8a` es destruido y reemplazado por `frontend-7b94d6588-zp9q1`, a la aplicación no le importa. Ninguno de los dos guarda información crítica de manera local; simplemente procesan peticiones y delegan el estado a una base de datos externa.

Pero, ¿qué sucede cuando queremos ejecutar esa misma base de datos (MySQL, MongoDB, Elasticsearch, Kafka) dentro de Kubernetes? Aquí es donde el paradigma de los Deployments se desmorona por completo.

Si tienes un clúster de base de datos con un nodo primario (escritura) y dos réplicas (lectura), los Pods **no son intercambiables**. Tienen identidades únicas, roles específicos y, lo más importante, necesitan acceso a **su propia porción de almacenamiento persistente** que debe sobrevivir a la muerte del Pod.

Para resolver este desafío de las aplicaciones con estado (Stateful), Kubernetes ofrece el controlador **StatefulSet**.

---

### Las tres garantías de un StatefulSet

A diferencia de un Deployment, un StatefulSet no asigna sufijos alfanuméricos aleatorios a sus Pods, ni asume que todos pueden arrancar al mismo tiempo o compartir el mismo disco. Proporciona tres garantías estrictas:

#### 1. Identidad de red estable y predecible (Sticky Identity)

Los Pods creados por un StatefulSet obtienen un nombre secuencial y fijo que comienza desde cero. Si nombras tu StatefulSet `mysql`, los Pods se llamarán `mysql-0`, `mysql-1` y `mysql-2`. Si `mysql-1` falla, el controlador creará un nuevo Pod exactamente con el nombre `mysql-1`. Esta identidad persistente permite que los clústeres de bases de datos mantengan sus topologías de replicación sin romperse tras un reinicio.

#### 2. Almacenamiento persistente exclusivo (VolumeClaimTemplates)

Un Deployment requiere que crees los Persistent Volume Claims (PVCs) por separado, y si lo montas, todos los Pods compartirán ese mismo volumen. Un StatefulSet introduce el concepto de `volumeClaimTemplates`. Esto le dice a Kubernetes: *"Cada vez que crees un nuevo Pod secuencial, provisiónale dinámicamente su propio volumen independiente y vincúlalo para siempre"*.
Si `mysql-1` es reprogramado en otro nodo, Kubernetes se asegurará de re-montar exactamente el PVC que pertenece a `mysql-1`, garantizando que no haya pérdida de datos.

#### 3. Despliegue y escalado ordenado

Los StatefulSets operan de manera estrictamente secuencial. Al crearse, `mysql-0` debe arrancar y estar en estado `Ready` antes de que Kubernetes intente crear `mysql-1`. Lo mismo ocurre al reducir la escala (scale down): se eliminará `mysql-2`, luego `mysql-1`, asegurando una desconexión elegante de los clústeres de datos.

```text
+-------------------------------------------------------------+
|                     StatefulSet: mongo                      |
+-------------------------------------------------------------+
       |                        |                        |
+--------------+         +--------------+         +--------------+
|    Pod:      |         |    Pod:      |         |    Pod:      |
|   mongo-0    |         |   mongo-1    |         |   mongo-2    |
+--------------+         +--------------+         +--------------+
       |                        |                        |
  [Monta PVC]              [Monta PVC]              [Monta PVC]
       |                        |                        |
       v                        v                        v
+--------------+         +--------------+         +--------------+
|   PVC:       |         |   PVC:       |         |   PVC:       |
| data-mongo-0 |         | data-mongo-1 |         | data-mongo-2 |
+--------------+         +--------------+         +--------------+

```

---

### El Service "Headless": El compañero inseparable

Para que la identidad de red estable funcione de verdad, los StatefulSets requieren la creación de un servicio especial llamado **Headless Service** (Servicio sin cabeza).

Normalmente, un Service en Kubernetes actúa como un balanceador de carga con una única IP virtual (`ClusterIP`). Sin embargo, en bases de datos a menudo necesitas hablar con un nodo específico (por ejemplo, enviar las escrituras a `mysql-0` y las lecturas a `mysql-1`). Un Headless Service se define estableciendo `clusterIP: None`. Al hacer esto, Kubernetes no asigna una IP única al servicio; en su lugar, configura el DNS interno (CoreDNS) para que devuelva directamente las IPs individuales de cada Pod asociado.

Esto permite que otros Pods alcancen instancias específicas usando URLs DNS predecibles:
`mongo-0.mongo-headless.default.svc.cluster.local`

---

### Definiendo un StatefulSet en YAML

Veamos cómo se estructura este conjunto de recursos:

```yaml
# 1. El Headless Service para resolución DNS directa
apiVersion: v1
kind: Service
metadata:
  name: mongo-headless
  labels:
    app: mongo
spec:
  ports:
  - port: 27017
    name: mongo
  clusterIP: None      # CRÍTICO: Esto lo convierte en "Headless"
  selector:
    app: mongo
---
# 2. El StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
spec:
  serviceName: "mongo-headless" # Debe coincidir con el nombre del Service superior
  replicas: 3
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
          name: mongo
        volumeMounts:
        - name: mongo-data      # Referencia al template de abajo
          mountPath: /data/db
  # 3. La fábrica de volúmenes exclusivos
  volumeClaimTemplates:
  - metadata:
      name: mongo-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi

```

> **Nota de Arquitectura (De Cero a Senior):**
> En entornos de producción reales, gestionar bases de datos altamente disponibles requiere más que solo levantar los Pods con almacenamiento estable. Necesitas configurar la replicación primaria/secundaria, gestionar los failovers si el primario muere, y realizar respaldos. Un StatefulSet por sí solo **no configura mágicamente tu base de datos** para que entienda que está en un clúster; solo proporciona la infraestructura subyacente.
> Es por esto que los arquitectos Kubernetes evitan usar StatefulSets "crudos" para bases de datos complejas. En su lugar, utilizan el **Patrón Operador** (que analizaremos en profundidad en el Capítulo 13). Operadores como el *Percona Operator para MySQL* o el *Zalando Postgres Operator* despliegan StatefulSets bajo el capó, pero inyectan un controlador adicional que entiende el dominio específico de la base de datos para automatizar tareas de "Día 2" (backups, restauraciones y rotación de credenciales).

### Pod Management Policies (Políticas de gestión)

Por defecto, la creación y eliminación secuencial (`OrderedReady`) que mencionamos antes es muy segura, pero puede ser lenta. Si estás desplegando un clúster donde los nodos no dependen estrictamente uno del otro para su inicialización en frío, puedes modificar este comportamiento.

Agregando `podManagementPolicy: Parallel` en la especificación (`spec`) del StatefulSet, le dices a Kubernetes que lance todos los Pods (ej. del 0 al 2) al mismo tiempo, ignorando la regla de esperar a que el anterior esté `Ready`. Esto es útil para sistemas de estado distribuido donde el orden de arranque no es un bloqueante, reduciendo drásticamente los tiempos de despliegue.

## 3.4 DaemonSets: Ejecución de agentes por nodo (monitoreo, logs, redes)

Hasta este punto, hemos analizado controladores diseñados para gestionar cargas de trabajo de aplicaciones. Un Deployment escala en función de la demanda (añadiendo más réplicas si hay más tráfico), y un StatefulSet garantiza la integridad de las bases de datos. En ambos casos, el *Scheduler* de Kubernetes decide en qué nodo colocar los Pods basándose en los recursos disponibles. A estos controladores les importa la **cantidad** y el **estado**, pero son flexibles respecto a la **ubicación**.

Sin embargo, existe una categoría de software que no sirve a los usuarios finales directamente, sino que sirve al propio clúster. Hablamos de procesos de infraestructura que necesitan ejecutarse con una topología muy específica: **exactamente una instancia por cada nodo**. Para este propósito, Kubernetes nos ofrece el **DaemonSet**.

---

### El propósito del DaemonSet

Un DaemonSet garantiza que todos los nodos del clúster (o un subconjunto específico de ellos) ejecuten una copia de un Pod.

Su comportamiento está intrínsecamente ligado al ciclo de vida de la infraestructura física o virtual del clúster:

* Si agregas un nuevo nodo al clúster, el DaemonSet detecta la nueva capacidad e inmediatamente programa un Pod en él.
* Si eliminas un nodo, el Pod asociado es recolectado por el *Garbage Collector* sin intentar ser reprogramado en otro lugar (porque los demás nodos ya tienen su propia copia).

```text
+-------------------------------------------------------------+
|                     Clúster Kubernetes                      |
+-------------------------------------------------------------+
       |                        |                        |
+--------------+         +--------------+         +--------------+
|    Nodo 1    |         |    Nodo 2    |         | Nodo 3 (Nuevo|
|--------------|         |--------------|         |--------------|
| [Pod App A]  |         | [Pod App B]  |         |              |
| [Pod App C]  |         | [Pod App A]  |         |              |
|              |         |              |         |              |
| *Daemon Pod* |         | *Daemon Pod* |         | *Daemon Pod* | < Automático
+--------------+         +--------------+         +--------------+

```

### Casos de uso clásicos (El estándar de la industria)

Casi todas las herramientas de operabilidad ("Día 2") en Kubernetes utilizan el patrón DaemonSet. Como ingeniero DevOps, te encontrarás configurando DaemonSets para:

1. **Recolección y Enrutamiento de Logs:** Agentes como `Fluentd`, `Fluent Bit` o `Promtail` necesitan estar en cada nodo para leer los archivos de registro de los contenedores que se escriben en el sistema de archivos del host (`/var/log/containers/`) y enviarlos a un sistema centralizado (Elasticsearch, Loki).
2. **Monitoreo de Nodos y Recursos:** Agentes como `Prometheus Node Exporter`, `Datadog Agent` o `Dynatrace` se despliegan por nodo para recolectar métricas a nivel de sistema operativo (CPU, memoria, disco, red).
3. **Redes y Seguridad:** Los plugins CNI (Container Network Interface) como `Calico`, `Cilium` o `Flannel`, así como el propio `kube-proxy`, operan como DaemonSets para configurar las reglas de enrutamiento y firewalls (iptables/eBPF) en el kernel de cada máquina.

---

### Definiendo un DaemonSet en YAML

La estructura de un DaemonSet es muy similar a la de un Deployment, con la notable excepción de que **no existe el campo `replicas`**. El número de réplicas es siempre dinámico y equivale al número de nodos elegibles.

Veamos un ejemplo de un agente recolector de logs (Fluent Bit):

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: kube-system
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.1
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      # Volúmenes de tipo hostPath para acceder a los archivos del nodo subyacente
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers

```

> **Nota de Arquitectura:** Observa el uso crítico de volúmenes `hostPath`. A diferencia de las aplicaciones normales que usan volúmenes efímeros o persistentes aislados, los Pods de un DaemonSet a menudo necesitan "romper" su aislamiento para inspeccionar o alterar el nodo anfitrión. Por esto, los DaemonSets suelen requerir privilegios de seguridad elevados (`SecurityContext: privileged`).

---

### Control Avanzado: Tolerations y Node Selectors (Conceptos Senior)

En la práctica real, "ejecutar en todos los nodos" suele tener matices. Aquí es donde los DaemonSets requieren configuraciones avanzadas de *Scheduling* (conceptos que profundizaremos en el Capítulo 7, pero que son vitales aquí).

#### 1. Ejecución en nodos especializados (Node Selectors / Affinity)

Imagina que tienes un clúster híbrido donde solo 5 de tus 50 nodos tienen tarjetas gráficas (GPUs). No tiene sentido ejecutar un agente de monitoreo de GPUs (como `nvidia-device-plugin`) en todos los nodos.

Puedes limitar el alcance de un DaemonSet usando un `nodeSelector`:

```yaml
    spec:
      nodeSelector:
        hardware-type: gpu
      containers:
      # ...

```

Con esto, el "100%" del DaemonSet pasa a ser "el 100% de los nodos que tengan la etiqueta `hardware-type: gpu`".

#### 2. Saltando las restricciones (Tolerations)

Por defecto, el plano de control (Master Nodes) de Kubernetes tiene un mecanismo de defensa llamado **Taint** (mancha/repulsión) que evita que los Pods de aplicaciones normales se programen allí, reservando sus recursos para componentes críticos como el `API Server` y `etcd`.

Sin embargo, ¡tú quieres recolectar los logs y monitorear la CPU de los nodos del plano de control! Para que tu DaemonSet pueda "aterrizar" en estos nodos restringidos, debes agregarle una **Toleration** (tolerancia) en su `podTemplate`:

```yaml
    spec:
      tolerations:
      # Esta tolerancia le permite ignorar la restricción del nodo maestro/plano de control
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
      containers:
      # ...

```

### Estrategia de Actualización

Al igual que los Deployments, los DaemonSets soportan actualizaciones continuas (`RollingUpdate`). Si cambias la imagen de `fluent-bit:2.1` a `2.2`, el controlador no reiniciará todos los agentes del clúster a la vez, lo cual podría causar un punto ciego masivo en tus métricas o logs.

Actualizará los Pods nodo por nodo, y puedes controlar la velocidad de este proceso utilizando el parámetro `maxUnavailable` dentro del bloque `updateStrategy`, asegurando que el impacto en la observabilidad de tu infraestructura sea mínimo durante las ventanas de mantenimiento.

## 3.5 Jobs y CronJobs: Ejecución de tareas efímeras y programadas

Hasta este momento de nuestro recorrido, hemos asumido una premisa implícita en casi todas las cargas de trabajo: **los Pods deben ejecutarse para siempre**. Un servidor web en un Deployment, una base de datos en un StatefulSet, o un agente de recolección de logs en un DaemonSet son procesos continuos (daemons). Si uno de estos procesos termina, el controlador asume que ha ocurrido un error y lo reinicia (tienen una política `restartPolicy: Always`).

Pero en el mundo real, no todo es un servicio continuo. Muchas operaciones son tareas por lotes (batch) o scripts de ejecución única:

* Migrar el esquema de una base de datos antes de una actualización.
* Entrenar un modelo de Machine Learning y guardar el resultado.
* Ejecutar un proceso de facturación a fin de mes.
* Realizar un respaldo de seguridad (backup) y subirlo a un bucket de S3.

Para estas tareas, queremos que el contenedor se ejecute, haga su trabajo y, al finalizar exitosamente, **muera con dignidad y no vuelva a ser reiniciado**. Para esto, Kubernetes nos ofrece los **Jobs** y su variante temporal, los **CronJobs**.

---

### Jobs: Ejecución hasta la finalización

Un **Job** es un controlador que crea uno o más Pods y se asegura de que un número específico de ellos termine con éxito (con un código de salida `0`).

A diferencia de un Deployment que busca un "estado deseado" de Pods en ejecución, el Job busca un "estado de completitud". Si el nodo donde se ejecuta el Pod falla, o si el contenedor falla por un error de software, el controlador del Job iniciará un nuevo Pod para reintentar la tarea.

```text
[Ciclo de vida de un Job]

+---------+     Crea      +--------------+ (Falla: Exit 1)
|   Job   | ------------> | Pod (Intento)| ----X
+---------+               +--------------+
     |
     |          Crea      +--------------+ (Éxito: Exit 0)
     +------------------> | Pod (Relevo) | ----> Job marcado como "Completado"
                          +--------------+

```

#### Definiendo un Job en YAML

Veamos la anatomía de un Job diseñado para calcular los primeros 2000 decimales de Pi usando Perl (una tarea intensiva que eventualmente termina):

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi-calculator
spec:
  # 1. backoffLimit: Número de reintentos antes de marcar el Job como fallido (por defecto 6)
  backoffLimit: 4
  
  # 2. activeDeadlineSeconds: Tiempo máximo en segundos que el Job puede estar activo
  activeDeadlineSeconds: 100
  
  template:
    spec:
      containers:
      - name: pi
        image: perl:5.34
        command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      
      # CRÍTICO: restartPolicy no puede ser 'Always' en un Job.
      restartPolicy: Never

```

> **Nota de Arquitectura:** El campo `restartPolicy` es el error más común para los principiantes. Por defecto en un Pod común es `Always`. En un Job, **debe ser** `Never` (si falla, el Job crea un Pod totalmente nuevo) o `OnFailure` (si falla, el kubelet reinicia el contenedor dentro del mismo Pod).

#### Procesamiento Paralelo y Múltiples Finalizaciones

Los Jobs no se limitan a una sola tarea. Son extremadamente potentes para procesar colas de trabajo masivas. Puedes controlar su comportamiento con dos parámetros clave:

* **`completions`:** Define cuántas veces debe ejecutarse la tarea con éxito para que el Job se considere terminado.
* **`parallelism`:** Define cuántos Pods pueden ejecutarse simultáneamente.

Si configuras `completions: 10` y `parallelism: 5`, Kubernetes lanzará 5 Pods al mismo tiempo. A medida que terminen con éxito, lanzará los siguientes hasta alcanzar un total de 10 ejecuciones exitosas.

---

### CronJobs: Programación en el tiempo

Un **CronJob** es exactamente lo que su nombre sugiere: la fusión entre el demonio `cron` clásico de Linux y un Job de Kubernetes.

Su función no es ejecutar contenedores directamente, sino **crear objetos Job basándose en un horario**.

```text
[CronJob] --(Según horario cron)--> [Job] ----> [Pod]

```

#### Definiendo un CronJob en YAML

Imagina que necesitamos ejecutar un script de backup todos los días a las 2:00 AM.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-db-backup
spec:
  # 1. schedule: Formato Cron estándar (Minuto, Hora, Día del Mes, Mes, Día de la Semana)
  schedule: "0 2 * * *"
  
  # 2. concurrencyPolicy: ¿Qué pasa si el backup anterior aún no termina cuando toca el siguiente?
  concurrencyPolicy: Forbid
  
  # 3. Limpieza de historial: Cuántos Jobs completados/fallidos guardar en la API
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup-agent
            image: my-company/backup-cli:v1
            command: ["/bin/sh", "-c", "backup-db.sh && upload-to-s3.sh"]
          restartPolicy: OnFailure

```

#### Políticas de Concurrencia (concurrencyPolicy)

El comportamiento en sistemas distribuidos es impredecible. ¿Qué sucede si tu tarea de las 2:00 AM se atasca y a las 3:00 AM (cuando toca la siguiente ejecución) la primera aún sigue corriendo? El CronJob permite definir cómo manejar esta superposición mediante `concurrencyPolicy`:

1. **`Allow` (Permitir - Por defecto):** Lanza el nuevo Job independientemente. Podrías terminar con docenas de backups ejecutándose a la vez, lo cual podría saturar tu base de datos o agotar los recursos de tu clúster.
2. **`Forbid` (Prohibir):** El CronJob omite la nueva ejecución. Si la anterior sigue corriendo, se salta el turno y espera al siguiente horario programado. (Recomendado para tareas exclusivas como backups).
3. **`Replace` (Reemplazar):** El CronJob cancela el Job actual que está en ejecución y lanza el nuevo. Útil si la información vieja ya no sirve y solo te importa procesar el estado más reciente.

> **Concepto Senior: Idempotencia**
> Un principio fundamental al diseñar Jobs en Kubernetes es que tus scripts deben ser **idempotentes**. Esto significa que ejecutarlos una vez debe tener el mismo resultado final que ejecutarlos varias veces (en caso de fallos y reintentos).
> Si tu Job envía un correo electrónico de "Factura pagada", y el Pod es destruido abruptamente por falta de memoria justo después de enviarlo pero antes de reportar "Éxito" a Kubernetes, el controlador lanzará un nuevo Pod y el cliente recibirá dos correos. Para evitar esto, el código dentro del Job debe verificar el estado (por ejemplo, comprobar en la base de datos si la factura ya fue marcada como "notificada") antes de ejecutar la acción crítica.
