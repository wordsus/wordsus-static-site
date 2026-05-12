Tras comprender la arquitectura de Kubernetes, es hora de tomar el control. En este capítulo, exploramos el ecosistema práctico del ingeniero DevOps: desde la maestría de **kubectl** y el archivo de configuración **kubeconfig**, hasta la adopción del **paradigma declarativo** mediante YAML.

Analizamos el **Pod** como la unidad atómica y efímera donde reside la carga de trabajo, entendiendo su ciclo de vida y los patrones multicontenedor. Finalmente, sentamos las bases de la organización y seguridad mediante **Namespaces**, permitiendo el aislamiento lógico y el multi-tenancy. Este es el puente crítico entre la teoría del clúster y la orquestación real de aplicaciones.

## 2.1 Configuración y dominio de `kubectl` y `kubeconfig`

En el capítulo anterior, diseccionamos la arquitectura de Kubernetes y vimos cómo el API Server actúa como el cerebro y la única puerta de entrada al clúster. Sin embargo, para que un ingeniero DevOps pueda interactuar con ese cerebro, necesita una herramienta capaz de traducir sus intenciones en llamadas RESTful autenticadas. Esa herramienta es **`kubectl`** (pronunciado comúnmente como *kube-control*, *kube-c-t-l* o *kube-cuddle*).

En esta sección no solo aprenderemos a configurar esta herramienta, sino a dominarla. Un ingeniero Senior se distingue por su velocidad, precisión y conocimiento profundo de su CLI.

### El archivo `kubeconfig`: Tu pasaporte al clúster

Para que `kubectl` sepa con qué clúster comunicarse y cómo autenticarse, lee un archivo de configuración estructurado conocido como `kubeconfig`. Por defecto, `kubectl` busca este archivo en la ruta `~/.kube/config`.

Es un error común pensar que un archivo `kubeconfig` representa a un solo clúster. En realidad, es una base de datos local que puede contener la configuración de docenas de clústeres. Su estructura lógica se divide en tres pilares fundamentales:

```text
Estructura Lógica de un kubeconfig
│
├── 1. Clusters (¿DÓNDE está el clúster?)
│   ├── Nombre lógico del clúster (ej. "prod-cluster")
│   ├── URL del API Server (ej. https://192.168.1.10:6443)
│   └── Autoridad Certificadora (CA) para validar al servidor
│
├── 2. Users (¿QUIÉN se está conectando?)
│   ├── Nombre lógico del usuario (ej. "admin-prod")
│   └── Credenciales (Certificados cliente, Tokens, plugins Exec como AWS IAM)
│
└── 3. Contexts (La intersección: ¿CÓMO me conecto ahora mismo?)
    ├── Nombre del contexto (ej. "admin@prod-cluster")
    ├── Cluster referenciado
    ├── User referenciado
    └── Namespace por defecto (Opcional, muy útil)

```

**Ejemplo de un manifiesto `kubeconfig` mínimo:**

```yaml
apiVersion: v1
kind: Config
current-context: dev-admin@dev-cluster # <--- El contexto activo
clusters:
- cluster:
    certificate-authority-data: LS0t...
    server: https://api.dev.midominio.com
  name: dev-cluster
users:
- name: dev-admin
  user:
    client-certificate-data: LS0t...
    client-key-data: LS0t...
contexts:
- context:
    cluster: dev-cluster
    user: dev-admin
    namespace: backend
  name: dev-admin@dev-cluster

```

> **Pro-Tip (Nivel Senior): Gestión de múltiples archivos `kubeconfig`**
> En entornos corporativos reales, rara vez tendrás un único archivo. Tendrás un config para EKS, otro para GKE y otro para tu clúster local. En lugar de copiar y pegar YAML (lo cual es propenso a errores), puedes fusionar archivos en memoria utilizando la variable de entorno `KUBECONFIG`.
> `export KUBECONFIG=~/.kube/config:~/.kube/config-aws:~/.kube/config-gcp`
> Si deseas aplanar estos archivos en uno solo permanente, puedes hacerlo con:
> `kubectl config view --merge --flatten > ~/.kube/config-merged`

### Navegando entre Contextos

Cambiar de entorno (ej. de Desarrollo a Producción) significa simplemente cambiar el contexto activo. Los comandos esenciales para esto bajo el subcomando `config` son:

* **Listar contextos disponibles:** `kubectl config get-contexts`
* **Ver el contexto actual:** `kubectl config current-context`
* **Cambiar de contexto:** `kubectl config use-context <nombre-del-contexto>`
* **Fijar un namespace por defecto para no tener que usar `-n` constantemente:** `kubectl config set-context --current --namespace=<nombre-namespace>`

### Dominando `kubectl`: Acelerando el flujo de trabajo

Un uso ineficiente de `kubectl` te hará perder horas valiosas a la semana. Configurar tu entorno de terminal es el primer paso hacia la maestría.

**1. Autocompletado y Alias (Obligatorio en tu día a día)**
Nadie escribe `kubectl` completo en la vida real. Lo primero que debes hacer en tu terminal (Bash o Zsh) es configurar el alias `k` y su autocompletado.

```bash
# Para Bash
echo 'alias k=kubectl' >> ~/.bashrc
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc
source ~/.bashrc

```

A partir de ahora, escribir `k get po` + `[TAB]` autocompletará el nombre de los Pods.

**2. El poder de `explain` (Tu documentación offline)**
A menudo olvidarás cómo se estructura el YAML de un recurso específico. En lugar de ir a la documentación oficial de Kubernetes, usa `kubectl explain`. Te permite explorar la especificación de cualquier objeto directamente desde la terminal.

```bash
# ¿Qué campos tiene la sección 'spec' de un Deployment?
kubectl explain deployment.spec

# ¿Cómo configuro los recursos de un contenedor dentro de un Pod?
kubectl explain pod.spec.containers.resources

```

**3. Generación imperativa de plantillas (El truco del `--dry-run`)**
Aunque en la siguiente sección (2.2) veremos por qué el paradigma declarativo (escribir YAMLs) es la mejor práctica, escribir YAMLs desde cero es tedioso. Puedes usar `kubectl` de forma imperativa para generar la estructura base de tus manifiestos utilizando `--dry-run=client -o yaml`.

```bash
# Genera un manifiesto YAML de un Pod sin crearlo en el clúster
kubectl run nginx-pod --image=nginx:alpine --dry-run=client -o yaml > pod.yaml

# Genera la plantilla para crear un Namespace
kubectl create namespace mi-app --dry-run=client -o yaml > ns.yaml

```

**4. Formateo y extracción de datos con JSONPath**
Cuando administras clústeres grandes, la salida tabular estándar no es suficiente. Necesitas extraer datos específicos para scripts de automatización. La bandera `-o jsonpath` te permite hacer consultas complejas a la API.

```bash
# Extraer solo las IPs de todos los Nodos del clúster
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'

# Obtener los nombres de las imágenes de los contenedores ejecutándose en un Deployment
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[*].image}'

```

### Ecosistema: Herramientas satélite para `kubectl`

A medida que asciendes a un rol Senior, integrarás plugins comunitarios que tapan las carencias ergonómicas de `kubectl`. El gestor de paquetes oficial para estos plugins es **Krew** (`kubectl krew`).

Dos herramientas independientes de las que no querrás prescindir son:

* **`kubectx`**: Un script superrápido para cambiar de contextos (reemplaza a `kubectl config use-context`).
* **`kubens`**: Permite cambiar tu namespace activo en milisegundos sin escribir comandos largos.

Con tu acceso configurado y tu terminal optimizada, estás listo para dejar de dar órdenes aisladas y empezar a declarar el estado deseado de tu infraestructura, introduciéndonos de lleno en el paradigma declarativo.

## 2.2 El paradigma declarativo: Manifiestos YAML y JSON

En la sección anterior exploramos cómo usar `kubectl` de forma imperativa (ej. `kubectl run`). Aunque los comandos imperativos son excelentes para pruebas rápidas, depuración o certificación (como el examen CKA), son el enemigo natural de la automatización, la trazabilidad y el trabajo en equipo.

En el mundo real, un ingeniero DevOps no da órdenes paso a paso; declara intenciones. Este es el núcleo del **paradigma declarativo**, el verdadero motor de Kubernetes y la base de prácticas avanzadas como GitOps.

### Imperativo vs. Declarativo

Para entender la diferencia, imagina que pides un taxi:

* **Enfoque Imperativo:** Le dices al conductor: *"Avanza 200 metros, gira a la derecha, acelera a 60 km/h, frena en el semáforo, gira a la izquierda..."*. Tú eres responsable de cada paso y de manejar los errores (¿qué pasa si la calle está cortada?).
* **Enfoque Declarativo:** Le das la dirección final: *"Quiero ir a la Avenida Principal 123"*. El conductor (Kubernetes) calcula la ruta, desvía el tráfico si hay accidentes y se asegura de que llegues a ese estado final.

En Kubernetes, tú describes el **Estado Deseado** en un archivo. Los controladores de Kubernetes ejecutan un "bucle de reconciliación" continuo para asegurarse de que el **Estado Actual** del clúster coincida exactamente con lo que has declarado.

```text
Bucle de Reconciliación (Reconciliation Loop)

[Estado Deseado (YAML)] ---> [API Server] ---> [etcd]
                                  ^
                                  | Compara y ajusta
                                  v
                            [Controladores] ---> [Estado Actual (Clúster)]

```

Si declaras que quieres 3 réplicas de un Pod y un nodo se cae destruyendo uno de ellos, Kubernetes detectará que el estado actual (2) difiere del deseado (3) y creará uno nuevo automáticamente. No tienes que intervenir.

### La anatomía de un Manifiesto: Los 4 pilares

Ya sea en YAML o JSON, todo objeto en Kubernetes requiere obligatoriamente cuatro campos de nivel raíz para ser aceptado por el API Server:

1. **`apiVersion`**: Define qué esquema de la API se utilizará. Kubernetes evoluciona rápido, y los recursos pasan por fases (alpha, beta, stable). Ejemplos: `v1`, `apps/v1`, `networking.k8s.io/v1`.
2. **`kind`**: El tipo de objeto que quieres crear (Pod, Service, Deployment, Namespace).
3. **`metadata`**: Datos que ayudan a identificar unívocamente al objeto. Incluye obligatoriamente el `name` y, opcionalmente, el `namespace`, `labels` (etiquetas para agrupar) y `annotations` (metadatos no identificativos).
4. **`spec`**: El corazón del manifiesto. Aquí es donde defines el estado deseado exacto del recurso. El formato de esta sección varía drásticamente dependiendo del `kind`.

**Ejemplo de un manifiesto declarativo:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: produccion
  labels:
    app: backend
    tier: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template: # A partir de aquí, es la definición del Pod
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: api-container
        image: mi-registro.com/api:v1.2.0
        ports:
        - containerPort: 8080

```

### YAML vs. JSON: ¿Por qué preferimos YAML?

Si bien el título menciona ambos formatos, la realidad es que **el 99% de los ingenieros escriben YAML**.

La razón es puramente ergonómica. YAML (YAML Ain't Markup Language) es un superconjunto de JSON diseñado para ser legible por humanos. Sus ventajas principales en el contexto de Kubernetes son:

* **Ausencia de llaves y comillas excesivas:** Utiliza la indentación (espacios, nunca tabulaciones) para definir la estructura, lo que lo hace mucho más limpio visualmente.
* **Soporte para comentarios:** Puedes usar `#` para documentar por qué tomaste cierta decisión arquitectónica. JSON nativo no soporta comentarios.
* **Múltiples documentos en un archivo:** Usando `---`, puedes separar varios manifiestos en un solo archivo, permitiendo desplegar una aplicación completa (Deployment + Service + ConfigMap) con un solo comando.

Sin embargo, hay un secreto técnico que todo Senior debe saber: **El API Server de Kubernetes no habla YAML**.
Cuando ejecutas `kubectl apply -f manifiesto.yaml`, `kubectl` traduce localmente tu archivo YAML a JSON antes de enviarlo a través de la red mediante una petición HTTP POST o PATCH. JSON es el verdadero lenguaje nativo del clúster.

> **Pro-Tip (Nivel Senior): `apply` vs `create` y el Server-Side Apply**
> Muchos principiantes usan `kubectl create -f archivo.yaml`. El problema es que `create` es imperativo y fallará si el objeto ya existe.
> La forma correcta y declarativa es usar `kubectl apply -f archivo.yaml`. `apply` calcula las diferencias (diff) entre tu archivo local, la última configuración aplicada y el estado actual (guardado en una anotación llamada `last-applied-configuration`).
> En versiones recientes, Kubernetes introdujo el **Server-Side Apply** (`kubectl apply --server-side`). En lugar de que `kubectl` calcule las diferencias localmente, envía el manifiesto completo al API Server, quien gestiona los conflictos campo por campo. Esto es fundamental cuando múltiples actores (tú, un HPA, o un operador custom) modifican el mismo objeto simultáneamente.

## 2.3 Pods: La unidad atómica de ejecución

Si vienes del mundo de Docker puro, es probable que tu instinto sea pensar en "desplegar contenedores". En Kubernetes, ese concepto no existe de forma aislada. No puedes interactuar directamente con un contenedor a través de la API; debes envolverlo en la unidad mínima desplegable y gestionable del ecosistema: **el Pod**.

Un Pod (término en inglés para una "vaina" de guisantes, o una manada de ballenas) es una abstracción lógica que agrupa uno o más contenedores, compartiendo almacenamiento, red y directrices sobre cómo deben ejecutarse.

### ¿Por qué Kubernetes inventó el Pod?

Podría parecer una capa de complejidad innecesaria. ¿Por qué no simplemente orquestar contenedores directamente? La respuesta radica en la co-localización y la simbiosis.

A veces, dos procesos están tan estrechamente acoplados que necesitan compartir recursos locales (como leer y escribir en el mismo directorio temporal) o comunicarse a través de `localhost` sin latencia de red. Si Kubernetes gestionara solo contenedores individuales, no podría garantizar que estos dos contenedores se planifiquen en el mismo nodo físico. El Pod actúa como una frontera de afinidad absoluta: **todos los contenedores dentro de un mismo Pod tienen la garantía absoluta de ejecutarse en el mismo Worker Node.**

### Anatomía Interna de un Pod (Bajo el capó)

A nivel de sistema operativo (Linux), un Pod no es más que un grupo de contenedores que comparten ciertos *Namespaces* (espacios de nombres) de Linux, específicamente el de red (`net`) y el de comunicación entre procesos (`ipc`), mientras mantienen separados sus sistemas de archivos (`mnt`).

Para que los contenedores de un Pod puedan reiniciarse de forma independiente sin perder la dirección IP del Pod, Kubernetes inyecta un componente invisible pero vital:

* **El contenedor `pause` (o Sandbox container):** Es el primer contenedor que se inicia en cualquier Pod. Su única función es reclamar y mantener abiertos los *namespaces* de red y PID a nivel del kernel de Linux. Los demás contenedores del Pod se "unen" a la red de este contenedor `pause`. Si tu contenedor de aplicación falla y se reinicia, la IP del Pod se mantiene intacta porque el contenedor `pause` nunca muere.

```text
+-------------------------------------------------------------+
|                            POD                              |
|                                                             |
|  IP del Pod: 10.244.1.5 (Compartida vía contenedor Pause)   |
|                                                             |
|  +----------------+  +----------------+  +----------------+ |
|  | Contenedor     |  | Contenedor     |  | Contenedor     | |
|  | de Aplicación  |  | Sidecar        |  | Pause (Infra)  | |
|  | (ej. Node.js)  |  | (ej. Fluent-bit|  | (Oculto)       | |
|  | Puerto: 8080   |  | Puerto: 9090   |  |                | |
|  +-------+--------+  +-------+--------+  +----------------+ |
|          |                   |                              |
|          |    (localhost)    |                              |
|          +---------<---------+                              |
|                                                             |
|  +--------------------------------------------------------+ |
|  |                  Volumen Compartido                    | |
|  |                  (ej. emptyDir)                        | |
|  +--------------------------------------------------------+ |
+-------------------------------------------------------------+

```

### Patrones de Arquitectura Multi-Contenedor

Un error común de diseño en niveles Junior es meter una aplicación entera (Frontend, Backend y Base de Datos) dentro de un solo Pod. **La regla de oro es: un Pod debe representar una sola instancia de un proceso o aplicación.** Los contenedores múltiples solo deben usarse cuando los procesos secundarios asisten al proceso principal.

Como ingeniero Senior, debes dominar estos tres patrones principales de Pods multi-contenedor:

**1. InitContainers (Contenedores de Inicialización)**
Son contenedores que se ejecutan secuencialmente *antes* de que arranquen los contenedores principales. Si un `initContainer` falla, el Pod se reinicia. Son ideales para tareas de preparación:

* Esperar a que una base de datos esté lista resolviendo su DNS.
* Ejecutar migraciones de bases de datos.
* Descargar secretos o archivos de configuración desde un servicio externo e inyectarlos en un volumen compartido.

**2. Patrón Sidecar**
Un contenedor secundario que se ejecuta en paralelo al principal para extender su funcionalidad sin modificar el código de la aplicación.

* *Ejemplo:* Un contenedor principal con NGINX produciendo logs, y un Sidecar con Fluent-bit leyendo esos logs desde un volumen compartido para enviarlos a ElasticSearch.
* *Ejemplo (Service Mesh):* Istio o Linkerd inyectan proxies Envoy como sidecars para interceptar y asegurar todo el tráfico de red del Pod.

**3. Patrones Adapter y Ambassador**
Variaciones del Sidecar. El *Adapter* transforma la salida del contenedor principal (ej. normalizando métricas para Prometheus), mientras que el *Ambassador* actúa como un proxy local para ocultar la complejidad de la red externa al contenedor principal (ej. un proxy a una base de datos shardeada).

### Manifiesto de ejemplo: Pod con InitContainer y Sidecar

A continuación, un manifiesto declarativo que implementa estos conceptos en la práctica:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-avanzada
  labels:
    app: backend
spec:
  # 1. Volumen compartido a nivel de Pod
  volumes:
  - name: shared-logs
    emptyDir: {}

  # 2. InitContainer: Se ejecuta y termina antes del principal
  initContainers:
  - name: wait-for-db
    image: busybox:1.36
    command: ['sh', '-c', 'echo "Esperando a la BD..."; sleep 5; echo "BD lista!"']

  # 3. Contenedores principales y Sidecars (Se ejecutan en paralelo)
  containers:
  - name: main-app
    image: nginx:alpine
    # Monta el volumen para escribir logs
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
    ports:
    - containerPort: 80

  - name: log-exporter-sidecar
    image: busybox:1.36
    # Lee del mismo volumen que el contenedor principal
    command: ['sh', '-c', 'tail -f /var/log/nginx/access.log']
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx

```

### Mascotas vs. Ganado (Pets vs. Cattle)

Para cerrar la comprensión atómica del Pod, es vital interiorizar su naturaleza **efímera**. Los Pods en Kubernetes son mortales; nacen, viven y mueren, pero nunca resucitan (si un nodo falla, el Pod se destruye y se crea *otro* Pod idéntico con otro ID).

Nunca debes apegarte a un Pod, ni guardar estado local crítico en su sistema de archivos raíz, ni depender de su dirección IP directamente. En los próximos capítulos, veremos cómo Kubernetes gestiona esta volatilidad agrupando los Pods mediante controladores de más alto nivel (como Deployments o StatefulSets) y abstrayendo su red mediante Services.

## 2.4 Namespaces: Aislamiento lógico de recursos y multi-tenancy básico

A medida que tu adopción de Kubernetes crece, desplegar todas tus aplicaciones en un único espacio se vuelve inmanejable. Los nombres de los recursos colisionan, el riesgo de que un ingeniero elimine por error un componente crítico aumenta (el famoso "radio de explosión" o *blast radius*), y el clúster se convierte en un caos organizativo.

Para resolver esto, Kubernetes ofrece los **Namespaces** (espacios de nombres). Un Namespace proporciona un mecanismo para aislar grupos de recursos dentro de un único clúster físico. Puedes pensarlo como "clústeres virtuales" que comparten el mismo plano de control y los mismos nodos de trabajo.

### Los Namespaces por defecto

Cuando instalas un clúster desde cero, Kubernetes no viene vacío; incluye cuatro Namespaces fundamentales:

* **`default`**: El espacio predeterminado para los objetos que se crean sin especificar un Namespace. En un entorno de producción Senior, **nunca** debes desplegar aplicaciones aquí.
* **`kube-system`**: El núcleo del sistema. Aquí residen los componentes de infraestructura creados por Kubernetes (CoreDNS, kube-proxy, CNI, Ingress Controllers base). Operar aquí requiere extrema precaución.
* **`kube-public`**: Un espacio legible por todos los usuarios (incluso los no autenticados). Generalmente se usa para exponer información de descubrimiento del clúster.
* **`kube-node-lease`**: Contiene objetos "Lease" asociados a cada nodo, utilizados por el plano de control para determinar el estado de salud (heartbeats) de los nodos a una frecuencia alta.

### Visualizando el Aislamiento Lógico

```text
+-----------------------------------------------------------------------+
|                       Clúster Físico Kubernetes                       |
|                                                                       |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Namespace:         |  | Namespace:         |  | Namespace:      |  |
|  | backend-dev        |  | backend-prod       |  | kube-system     |  |
|  |                    |  |                    |  |                 |  |
|  | [Pod: api-v2]      |  | [Pod: api-v1]      |  | [Pod: CoreDNS]  |  |
|  | [Secret: db-cred]  |  | [Secret: db-cred]  |  | [Pod: Flannel]  |  |
|  | [Service: db]      |  | [Service: db]      |  |                 |  |
|  +--------------------+  +--------------------+  +-----------------+  |
|                                                                       |
|                 (Nodos de Trabajo Compartidos subyacentes)            |
+-----------------------------------------------------------------------+

```

*Nota: Como se observa, puedes tener un Pod llamado `api-v1` o un Secret llamado `db-cred` repetido, siempre y cuando residan en Namespaces distintos.*

### Comunicación Cross-Namespace y el FQDN

Una idea equivocada muy común en ingenieros Junior es creer que los Namespaces aíslan el tráfico de red por defecto. **Esto es falso.** En Kubernetes, por defecto, cualquier Pod en cualquier Namespace puede comunicarse con cualquier otro Pod si conoce su dirección IP.

El verdadero aislamiento que proporciona el Namespace en este aspecto es la **resolución DNS local**. Cuando un Pod busca un servicio llamado `database`, el DNS interno (CoreDNS) lo buscará en el mismo Namespace del Pod que hace la petición.

Si necesitas que una aplicación en el Namespace `frontend` se comunique con un servicio en el Namespace `backend`, debes usar el **FQDN** (Fully Qualified Domain Name) del servicio, que sigue esta estructura:

`<nombre-del-servicio>.<nombre-del-namespace>.svc.cluster.local`

Por ejemplo, para conectar con la base de datos en otro Namespace, la cadena de conexión apuntaría a:
`database.backend.svc.cluster.local`

### El Espejismo del Multi-tenancy (Soft vs. Hard)

El concepto de *Multi-tenancy* (multi-inquilino) se refiere a la capacidad de un sistema para servir a múltiples clientes o equipos de forma independiente. Los Namespaces son la base del multi-tenancy en Kubernetes, pero por sí solos solo ofrecen **"Soft Multi-tenancy"** (Multi-tenancy suave).

Para un ingeniero Senior, un Namespace es solo un lienzo en blanco. Para lograr un aislamiento real y seguro entre equipos, un Namespace debe estar flanqueado por tres políticas restrictivas (que exploraremos a fondo en capítulos posteriores):

1. **RBAC (Role-Based Access Control):** Un Namespace sirve como el límite perfecto para asignar permisos. Puedes otorgar a un equipo acceso de administrador *únicamente* dentro de su Namespace (`RoleBinding`), evitando que toquen el Namespace de otro equipo.
2. **Resource Quotas y Limit Ranges:** Sin límites, un error en el código del equipo de Desarrollo podría consumir toda la CPU y Memoria del clúster físico, afectando a Producción. Los Namespaces permiten definir cuotas máximas de recursos computacionales.
3. **Network Policies:** Dado que la red es plana por defecto, debes aplicar políticas de red como si fueran reglas de Firewall, indicando explícitamente qué Namespaces pueden comunicarse entre sí a nivel de Capa 4/Capa 7.

Si necesitas aislar cargas de trabajo de clientes hostiles o completamente desconfiados (ej. un proveedor de SaaS que ejecuta código arbitrario de usuarios), el *Soft Multi-tenancy* no es suficiente. Necesitarás **"Hard Multi-tenancy"**, lo cual implica usar clústeres separados, sandboxing avanzado (como gVisor) o microVMs (como Firecracker), ya que los Namespaces comparten el mismo kernel subyacente de Linux.

### Recursos "Namespaced" vs. "Cluster-scoped"

Es fundamental entender que **no todos los objetos en Kubernetes viven dentro de un Namespace**.

Los recursos atados a aplicaciones (Pods, Deployments, Secrets, ConfigMaps, Services) son "Namespaced". Sin embargo, los recursos que definen la infraestructura base del clúster son globales ("Cluster-scoped").

Puedes verificar qué recursos pertenecen a cada categoría utilizando `kubectl`:

```bash
# Listar recursos que VIVEN dentro de un Namespace
kubectl api-resources --namespaced=true

# Listar recursos GLOBALES (No pertenecen a ningún Namespace)
kubectl api-resources --namespaced=false

```

Ejemplos críticos de recursos globales:

* **Nodes:** Los servidores físicos o virtuales.
* **PersistentVolumes (PV):** Los discos de almacenamiento físico (los "Claims" o PVCs sí son namespaced).
* **ClusterRoles:** Permisos a nivel global.
* **Namespaces:** Irónicamente, el objeto `Namespace` en sí mismo es global (no puedes crear un Namespace dentro de otro Namespace).

**Ejemplo declarativo de creación de un Namespace:**

Aunque puedes crearlos con `kubectl create ns mi-equipo`, la práctica GitOps dicta que la infraestructura debe estar versionada. Un manifiesto de Namespace es uno de los más simples de escribir:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: equipo-pagos
  labels:
    entorno: produccion
    centro-costos: "4050"

```

El uso de *labels* (etiquetas) en los Namespaces es una práctica avanzada altamente recomendada, ya que te permitirá aplicar políticas de red o reglas de seguridad a múltiples Namespaces simultáneamente basándote en sus etiquetas.

## 2.5 Ciclo de vida de un Pod (Fases, estados y condiciones)

Uno de los mayores errores que cometen los ingenieros al empezar con Kubernetes es tratar a los Pods como si fueran máquinas virtuales tradicionales: los encienden y asumen que están "funcionando" o "apagados".

En la realidad, un Pod es una entidad orgánica dentro del clúster. Atraviesa un ciclo de vida complejo y altamente orquestado desde el milisegundo en que el API Server acepta su manifiesto YAML hasta el momento en que es destruido. Comprender la diferencia exacta entre una *Fase*, una *Condición* y el *Estado de un contenedor* es lo que separa a un operador Junior (que reinicia cosas al azar cuando fallan) de un Senior (que diagnostica con precisión quirúrgica).

### 1. Fases del Pod (PodPhase)

La fase de un Pod es un resumen macroscópico y de alto nivel de dónde se encuentra el Pod en su ciclo de vida. Es lo que ves en la columna `STATUS` cuando ejecutas `kubectl get pods`. Existen estrictamente cinco fases posibles:

* **`Pending` (Pendiente):** El API Server ha aceptado la creación del Pod, pero aún no se está ejecutando. ¿Por qué? Puede estar esperando a que el *Scheduler* le asigne un nodo, o el nodo asignado está descargando (pulling) las imágenes de los contenedores a través de la red.
* **`Running` (En ejecución):** El Pod ha sido asignado a un nodo y todos sus contenedores han sido creados. Al menos un contenedor está ejecutándose, o está en proceso de reinicio tras un fallo. *(Ojo: `Running` NO significa que la aplicación esté lista para recibir tráfico).*
* **`Succeeded` (Completado con éxito):** Todos los contenedores del Pod terminaron su ejecución con un código de salida cero (éxito) y no serán reiniciados. Es la fase final esperada para los Pods ejecutados por un `Job`.
* **`Failed` (Fallido):** Todos los contenedores han terminado, pero al menos uno de ellos terminó con un código de salida distinto de cero (error) o fue liquidado por el sistema operativo (ej. *OOMKilled* por falta de memoria).
* **`Unknown` (Desconocido):** El plano de control no puede obtener el estado del Pod. Casi siempre ocurre por una pérdida de comunicación en la red entre el API Server y el `kubelet` del nodo donde reside el Pod.

### 2. Condiciones del Pod (PodConditions)

Si la Fase es el "titular", las Condiciones son el "cuerpo de la noticia". Un Pod tiene un array de condiciones (que se evalúan como `True`, `False` o `Unknown`) que nos dicen exactamente qué hitos ha superado.

* **`PodScheduled`:** El Pod ha sido asignado exitosamente a un nodo.
* **`Initialized`:** Todos los contenedores de inicialización (`initContainers`) han terminado con éxito.
* **`ContainersReady`:** Todos los contenedores del Pod están listos.
* **`Ready`:** El Pod está listo para servir peticiones. Si esto es `True`, la dirección IP del Pod se añade a los *Endpoints* de los Servicios correspondientes para recibir tráfico.

> **Pro-Tip (Nivel Senior): El falso positivo de `Running**`
> Un Pod puede estar en fase `Running` pero tener la condición `Ready` en `False`. Esto ocurre si la aplicación dentro del contenedor arrancó (el proceso PID 1 está vivo), pero la aplicación aún está cargando datos en caché o falló su prueba de salud (*Readiness Probe*). Nunca asumas que `Running` equivale a "sistema operativo y sirviendo tráfico".

### 3. Estados del Contenedor (Container States)

Mientras que el Pod tiene "Fases", los contenedores individuales que viven dentro de él tienen "Estados". El `kubelet` es el encargado de reportar el estado de cada contenedor al API Server:

* **`Waiting` (Esperando):** El contenedor no se está ejecutando aún. Está realizando operaciones previas, como descargar la imagen (`ContainerCreating`) o aplicando secretos.
* **`Running` (Ejecutándose):** El contenedor se está ejecutando sin problemas.
* **`Terminated` (Terminado):** El contenedor dejó de ejecutarse, ya sea porque terminó su tarea con éxito o porque falló.

**¿Y qué pasa con `CrashLoopBackOff` o `ImagePullBackOff`?**
Es vital entender que estos **no son Fases ni Estados**, sino *Razones* (Reasons) del estado `Waiting`.
Si ves `CrashLoopBackOff`, significa que el contenedor está fallando repetidamente y el `kubelet` está aplicando un retraso exponencial (back-off) antes de intentar reiniciarlo de nuevo para no saturar el nodo. La Fase del Pod, en este caso, sigue siendo `Running`.

### El proceso de Terminación: "Graceful Shutdown"

El ciclo de vida no solo trata de cómo nace un Pod, sino de cómo muere. Cuando decides eliminar un Pod (o un Deployment decide reemplazarlo durante una actualización), Kubernetes no le corta la energía repentinamente. Sigue un protocolo de terminación elegante (*Graceful Shutdown*):

```text
Flujo de Terminación de un Pod

1. [kubectl delete pod] 
   -> El Pod pasa a estado "Terminating".
   -> Se elimina de los Endpoints (deja de recibir tráfico nuevo).

2. [Señal SIGTERM] 
   -> Kubelet envía la señal SIGTERM al proceso PID 1 del contenedor.
   -> La aplicación DEBE capturar esta señal, terminar sus tareas en vuelo 
      y cerrar conexiones a bases de datos.

3. [terminationGracePeriodSeconds]
   -> Kubernetes espera. Por defecto, le da a la aplicación 30 segundos 
      para que se apague por sí sola.

4. [Señal SIGKILL]
   -> Si tras los 30 segundos el contenedor sigue vivo, Kubelet envía SIGKILL.
   -> El proceso es asesinado brutalmente a nivel de Kernel (Linux).
   -> El Pod es purgado de etcd.

```

**La regla de oro de la resiliencia:** Como ingeniero DevOps, debes asegurar que los desarrolladores programen sus aplicaciones para interceptar la señal `SIGTERM`. Si una aplicación ignora esta señal, cada despliegue o escalado causará que las transacciones en vuelo de los usuarios se corten abruptamente tras 30 segundos, generando errores 500.

Para inspeccionar toda esta información del ciclo de vida de un Pod específico que está fallando, el comando fundamental es observar la sección `status` de su manifiesto en tiempo real:

```bash
# Extraer la sección de estado para ver las fases, condiciones y estados internos
kubectl get pod mi-aplicacion-fallida -o yaml | grep -A 20 "status:"

```

Con este conocimiento del ciclo de vida atómico, estamos listos para pasar al siguiente nivel: cómo Kubernetes utiliza controladores automáticos para crear, escalar y destruir miles de estos Pods sin intervención humana.
