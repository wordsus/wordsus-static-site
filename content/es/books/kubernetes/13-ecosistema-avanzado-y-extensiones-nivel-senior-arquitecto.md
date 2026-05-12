En esta etapa final, Kubernetes deja de ser un simple orquestador para transformarse en un **framework de ingeniería de plataformas**. Un perfil Senior no solo opera recursos nativos; diseña extensiones mediante **CRDs** y automatiza el conocimiento operativo con el **Patrón Operador**.

Exploraremos cómo gestionar la complejidad de los microservicios con **Service Meshes**, desde la madurez de Istio hasta el rendimiento de **eBPF** con Cilium. Finalmente, abordaremos la escala global mediante arquitecturas **multi-clúster**, el paradigma **Serverless** con Knative y la conquista del **Edge Computing** con distribuciones ligeras como K3s. Es el momento de trascender el clúster individual.

## 13.1 Extendiendo la API: Custom Resource Definitions (CRDs)

A lo largo de los doce capítulos anteriores, hemos tratado a Kubernetes fundamentalmente como un orquestador de contenedores. Has aprendido a desplegar aplicaciones, enrutarlas, asegurarlas, escalarlas y operarlas mediante GitOps. Sin embargo, en el nivel de arquitectura Senior, la perspectiva cambia: **Kubernetes no es solo un orquestador; es un marco de trabajo (framework) para construir plataformas.**

El corazón de este framework es el **API Server**. Por defecto, el API Server entiende recursos primitivos o *built-in* (`Pods`, `Deployments`, `Services`, `Ingresses`). Pero, ¿qué ocurre si tu dominio de negocio o infraestructura requiere conceptos que no existen nativamente en Kubernetes? ¿Qué pasa si necesitas que Kubernetes entienda qué es un `PostgreSQLCluster`, un `CertificadoSSL`, o un `Tenant`?

Aquí es donde entran en juego los **Custom Resource Definitions (CRDs)**.

### ¿Qué es un CRD y por qué lo necesitamos?

Un CRD es, en esencia, una forma de enseñar al API Server nuevas palabras para su vocabulario. Te permite registrar un nuevo tipo de recurso (Custom Resource o CR) en el clúster.

Antes de la existencia de los CRDs, si querías almacenar configuración personalizada, tenías que abusar de los `ConfigMaps` o mantener una base de datos externa. Al usar un CRD, obtienes todos los beneficios del ecosistema de Kubernetes "gratis":

1. **Almacenamiento nativo:** Los recursos personalizados se guardan directamente en `etcd`.
2. **Interfaz unificada:** Puedes interactuar con ellos usando el mismo `kubectl get`, `kubectl describe` o `kubectl delete` que usas para un Pod.
3. **Seguridad integrada:** Al ser ciudadanos de primera clase en la API, heredan inmediatamente el modelo de RBAC (Capítulo 8). Puedes crear `ClusterRoles` que permitan a un usuario modificar un `PostgreSQLCluster` pero no borrarlo.
4. **Auditoría y Políticas:** Herramientas como OPA Gatekeeper o Kyverno pueden aplicar *Policy-as-Code* directamente sobre tus CRDs.

### Diferencia entre CRD y CR

Es vital distinguir entre la **definición** y la **instancia**:

* **CRD (Custom Resource Definition):** Es el esquema. Define el nombre del recurso, su versión, a qué grupo de la API pertenece, si tiene alcance de *Namespace* o de *Cluster*, y la validación de sus campos.
* **CR (Custom Resource):** Es el objeto real creado a partir de ese esquema, equivalente a cómo un objeto específico de `Deployment` es una instancia del recurso `deployments.apps`.

### Anatomía de un CRD: Definiendo el Esquema

Para evitar que se inserte "basura" en `etcd`, Kubernetes utiliza **OpenAPI v3** para validar los manifiestos de los recursos personalizados antes de aceptarlos.

Veamos un ejemplo de cómo definiríamos un CRD para gestionar bases de datos PostgreSQL de forma declarativa.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # El nombre debe seguir el formato: <plural>.<grupo>
  name: postgresqlclusters.database.midominio.com
spec:
  group: database.midominio.com
  names:
    kind: PostgreSQLCluster
    listKind: PostgreSQLClusterList
    plural: postgresqlclusters
    singular: postgresqlcluster
    shortNames:
      - pgc
  scope: Namespaced # Puede ser Namespaced o Cluster
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engineVersion:
                  type: string
                  pattern: '^1[2-5]\.[0-9]+$' # Regex para validar versiones (ej. 14.2)
                storageSize:
                  type: string
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 5
              required: ["engineVersion", "storageSize"]

```

**Puntos clave del manifiesto:**

* **`group` y `versions`:** Define la ruta de la API. Este recurso vivirá en `/apis/database.midominio.com/v1alpha1/namespaces/<namespace>/postgresqlclusters`.
* **`scope`:** Al definirlo como `Namespaced`, garantizamos que la base de datos de un entorno de desarrollo no colisione con la de producción, apoyándonos en el aislamiento lógico que ya conoces (Capítulo 2.4).
* **`openAPIV3Schema`:** Esta es la barrera de seguridad. Si un ingeniero intenta crear un cluster con `replicas: 10`, el API Server rechazará el manifiesto inmediatamente, del mismo modo que rechazaría un Deployment mal formado.

### El Ciclo de Vida: De la Declaración al Almacenamiento

El flujo de cómo Kubernetes procesa esta extensión se puede visualizar en la siguiente arquitectura lógica:

```text
[ Ingeniero DevOps / Pipeline CI/CD ]
                |
                | (1) kubectl apply -f my-postgres-cr.yaml
                v
       +-------------------+
       |    API Server     |
       |                   |
       |  (2) Autenticación/RBAC (¿Tiene permisos para database.midominio.com?)
       |                   |
       |  (3) Validación OpenAPI v3 (¿Esquema correcto? ¿Replicas entre 1 y 5?)
       +--------+----------+
                |
                | (4) Persistencia exitosa
                v
           +--------+
           |  etcd  |
           +--------+

```

Una vez que el CRD está registrado en el clúster, un desarrollador puede crear su base de datos usando un manifiesto ridículamente simple y limpio, abstrayéndose de la complejidad subyacente:

```yaml
apiVersion: database.midominio.com/v1alpha1
kind: PostgreSQLCluster
metadata:
  name: billing-db
  namespace: finance
spec:
  engineVersion: "14.5"
  storageSize: "100Gi"
  replicas: 3

```

### Subrecursos: `/status` y `/scale`

A medida que diseñes CRDs más avanzados, necesitarás habilitar los **subrecursos**. El más importante es el subrecurso `status`.

En Kubernetes, es una mejor práctica estricta separar el estado deseado (`spec`) del estado actual (`status`). Al habilitar el subrecurso status en el CRD, permites que los controladores actualicen el campo `.status` de un objeto sin alterar el `.spec` y sin disparar validaciones mutantes que podrían causar bucles infinitos en el API Server.

### La limitación de los CRDs (y la transición al Patrón Operador)

Si aplicas los dos YAMLs anteriores en tu clúster, podrás ejecutar `kubectl get pgc -n finance` y verás tu recurso `billing-db` ahí, perfectamente guardado.

Sin embargo, **no pasará absolutamente nada más.** No se creará ningún Pod, no se aprovisionará ningún Persistent Volume (Capítulo 5), ni se configurará ningún StatefulSet (Capítulo 3). Un CRD, por sí solo, es simplemente "datos inertes" estructurados dentro de `etcd`. Es la promesa de una infraestructura declarativa, pero sin un motor que la haga realidad.

Para que Kubernetes lea ese manifiesto `PostgreSQLCluster` y ejecute las acciones necesarias para materializar una base de datos real con 3 réplicas, necesitamos un componente activo que observe este nuevo recurso y concilie su estado. Ese componente de software, que da vida a los CRDs, es lo que exploraremos en la siguiente sección: **13.2 El Patrón Operador.**

## 13.2 El Patrón Operador (Operator Pattern) y el Operator SDK

Como vimos en la sección anterior, un CRD te permite definir el "qué" (el estado deseado de tu base de datos, tu clúster de caché o tu tenant), pero carece del "cómo". Un CRD guardado en `etcd` es un objeto inerte. Para que ese manifiesto se convierta en infraestructura real, necesitamos un cerebro informático que lea esa configuración y actúe en consecuencia.

Ese cerebro es el **Patrón Operador**.

Introducido originalmente por CoreOS en 2016, un Operador es un controlador de Kubernetes personalizado cuyo propósito es empaquetar, desplegar y gestionar una aplicación compleja. En términos sencillos, **un Operador es un Site Reliability Engineer (SRE) codificado en software**. Encapsula el conocimiento humano operativo —cómo instalar la aplicación, cómo hacerle un upgrade sin caída, cómo reaccionar si un nodo muere, cómo hacer backups— en un ciclo de control automatizado.

### El Bucle de Reconciliación (Reconciliation Loop)

El corazón de cualquier Operador es el bucle de reconciliación. Al igual que el `kube-controller-manager` vigila continuamente que el número de Pods de un `Deployment` coincida con las réplicas deseadas, tu Operador vigilará tu Custom Resource.

El proceso sigue este patrón continuo:

```text
                      +-----------------------------------------+
                      |                                         |
                      v                                         |
          +-----------------------+                 +-----------------------+
          |      1. OBSERVAR      |                 |       3. ACTUAR       |
          |  (Leer el estado      |                 | (Crear Pods, mover    |
          |  actual del clúster   |                 | datos, reconfigurar   |
          |  y el CRD en etcd)    |                 | la aplicación)        |
          +-----------+-----------+                 +-----------+-----------+
                      |                                         ^
                      v                                         |
          +-----------------------+                             |
          |      2. ANALIZAR      |                             |
          | (Comparar el Estado   |-----------------------------+
          | Deseado vs el Estado  |  ¿Hay diferencias (Diff)?
          | Actual)               |
          +-----------------------+

```

Si el estado actual coincide con el estado deseado (declarado en tu CRD), el Operador no hace nada y vuelve a dormir. Si hay divergencias, ejecuta el código necesario (acciones en la API de Kubernetes o llamadas a APIs externas) para converger ambos estados.

### El Modelo de Madurez de los Operadores

No todos los Operadores son iguales. El ecosistema clasifica la capacidad de un Operador en cinco niveles de madurez (*Operator Capability Model*):

1. **Nivel 1 (Basic Install):** Instala y configura la aplicación. Reemplaza a un simple chart de Helm.
2. **Nivel 2 (Seamless Upgrades):** Capaz de actualizar la aplicación a versiones menores o mayores sin tiempo de inactividad (gestionando migraciones de esquemas, por ejemplo).
3. **Nivel 3 (Full Lifecycle):** Gestiona copias de seguridad (backups), restauraciones y recuperación ante desastres.
4. **Nivel 4 (Deep Insights):** Emite métricas personalizadas para Prometheus, genera alertas específicas del dominio y expone dashboards detallados.
5. **Nivel 5 (Auto Pilot):** Escalado horizontal y vertical automático basado en métricas internas de la aplicación, auto-ajuste (tuning) de configuración y curación anómala predictiva.

### Construyendo Operadores: El Operator SDK

Escribir un Operador desde cero requiere lidiar con la complejidad de la API REST de Kubernetes, cachés locales (informers), colas de trabajo (workqueues) y manejo de reintentos. Para no reinventar la rueda, la comunidad estándarizó la creación de Operadores mediante el framework **Operator SDK** (parte del proyecto Cloud Native Computing Foundation).

El Operator SDK permite generar la estructura base (scaffolding) de tu controlador y ofrece tres lenguajes/enfoques de desarrollo, dependiendo de tus necesidades y las habilidades de tu equipo:

| Enfoque | Curva de Aprendizaje | Nivel Máximo de Madurez | Caso de Uso Ideal |
| --- | --- | --- | --- |
| **Helm** | Muy baja | Nivel 1 - 2 | Equipos que ya tienen Charts complejos y quieren transformarlos en ciudadanos de primera clase (CRDs) sin escribir código. |
| **Ansible** | Media | Nivel 1 - 3 | Equipos de infraestructura tradicionales con un gran inventario de *playbooks* y *roles* de Ansible que desean orquestar desde Kubernetes. |
| **Go (Golang)** | Alta | Nivel 1 - 5 (Auto Pilot) | Desarrollo de Operadores nativos de alto rendimiento. Acceso total a las librerías `client-go` y `controller-runtime`. |

### La Anatomía de un Operador en Go

Para los desarrolladores Senior y Arquitectos, Golang es la opción predeterminada. Cuando generas un Operador en Go usando el SDK (`operator-sdk init --domain midominio.com`), el núcleo de tu trabajo se centrará en escribir la función `Reconcile`.

Este es un pseudocódigo simplificado de cómo se ve el cerebro de un Operador escrito en Go:

```go
func (r *PostgreSQLReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    // 1. Obtener la instancia del CRD PostgreSQLCluster
    var pgCluster databasev1alpha1.PostgreSQLCluster
    if err := r.Get(ctx, req.NamespacedName, &pgCluster); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 2. Comprobar si el StatefulSet base existe
    var sts appsv1.StatefulSet
    err := r.Get(ctx, types.NamespacedName{Name: pgCluster.Name, Namespace: pgCluster.Namespace}, &sts)
    
    // 3. Si no existe, crearlo (Actuar)
    if errors.IsNotFound(err) {
        log.Info("Creando un nuevo StatefulSet de PostgreSQL")
        newSts := r.deploymentForPostgreSQL(&pgCluster)
        err = r.Create(ctx, newSts)
        return ctrl.Result{Requeue: true}, err
    }

    // 4. Si existe, comprobar si el tamaño (replicas) es el correcto
    if *sts.Spec.Replicas != pgCluster.Spec.Replicas {
        log.Info("Actualizando el número de réplicas", "Actual", *sts.Spec.Replicas, "Deseado", pgCluster.Spec.Replicas)
        sts.Spec.Replicas = &pgCluster.Spec.Replicas
        err = r.Update(ctx, &sts)
        return ctrl.Result{Requeue: true}, err
    }

    // El estado actual coincide con el deseado. Fin del ciclo.
    return ctrl.Result{}, nil
}

```

El Patrón Operador es el pináculo de la extensibilidad en Kubernetes. Al dominar los CRDs junto con controladores personalizados, dejas de usar Kubernetes simplemente para alojar contenedores y comienzas a extender su panel de control para gestionar cualquier tipo de infraestructura, tanto dentro como fuera del clúster.

## 13.3 Service Meshes: Conceptos, Istio, Linkerd y Cilium (eBPF)

En el Capítulo 4, exploramos cómo los recursos nativos como `Services`, `Ingress` y el estándar CNI resuelven la conectividad fundamental dentro del clúster (Capa 3 y 4 del modelo OSI) y el enrutamiento básico HTTP hacia el exterior. Sin embargo, a medida que una arquitectura evoluciona hacia cientos o miles de microservicios, surgen nuevos desafíos operativos que los primitivos nativos no pueden resolver con elegancia.

¿Cómo implementas reintentos automáticos (retries) o *circuit breakers* sin modificar el código de cada aplicación? ¿Cómo garantizas que todo el tráfico interno esté cifrado (mTLS) sin gestionar certificados manualmente en cada Pod? ¿Cómo obtienes métricas doradas (latencia, tráfico, errores, saturación) de cada conexión sin instrumentar el código de negocio?

La respuesta arquitectónica a estos problemas es el **Service Mesh** (Malla de Servicios).

### Conceptos Centrales: Plano de Control y Plano de Datos

Un Service Mesh desacopla la lógica de red de la lógica de la aplicación, interceptando todo el tráfico de red entre los microservicios. Para lograrlo de forma escalable, la arquitectura de cualquier Service Mesh se divide estrictamente en dos componentes:

* **El Plano de Datos (Data Plane):** Es el componente que mueve los bytes. Históricamente, se implementa inyectando un contenedor adicional (un *proxy*, como Envoy) dentro de cada Pod. Este proxy intercepta todo el tráfico de entrada y salida de la aplicación, aplicando reglas de enrutamiento, cifrando la carga útil y emitiendo telemetría.
* **El Plano de Control (Control Plane):** Es el cerebro de la operación. Los administradores interactúan con el Plano de Control (usualmente mediante CRDs, como vimos en la sección 13.1) para definir políticas. El Plano de Control traduce estas reglas y las distribuye dinámicamente a todos los proxies del Plano de Datos.

### El Patrón Sidecar tradicional

Hasta hace poco, el estándar de facto para implementar el Plano de Datos era el patrón *Sidecar*.

```text
+-----------------------+                    +-----------------------+
|       Nodo A          |                    |       Nodo B          |
|  +-----------------+  |                    |  +-----------------+  |
|  |      Pod A      |  |                    |  |      Pod B      |  |
|  | +-------------+ |  |                    |  | +-------------+ |  |
|  | | Aplicación  | |  |    Tráfico mTLS    |  | | Aplicación  | |  |
|  | +------^------+ |  | <================> |  | +------^------+ |  |
|  |        |        |  |  (Red del Clúster) |  |        |        |  |
|  | +------v------+ |  |                    |  | +------v------+ |  |
|  | | Proxy Envoy | |  |                    |  | | Proxy Envoy | |  |
|  | +-------------+ |  |                    |  | +-------------+ |  |
|  +-----------------+  |                    |  +-----------------+  |
+-----------------------+                    +-----------------------+

```

Aunque este modelo es poderoso, introduce latencia adicional (el tráfico debe saltar de la aplicación al proxy a través de *localhost* antes de salir a la red) y consume recursos significativos (memoria y CPU por cada proxy inyectado).

Para entender las opciones del mercado, analicemos las tres herramientas líderes y cómo abordan estos desafíos.

### Istio: El peso pesado y la evolución hacia Ambient Mesh

Istio fue desarrollado originalmente por Google, IBM y Lyft. Es el Service Mesh más maduro, rico en funcionalidades y adoptado en entornos empresariales. Utiliza el proxy **Envoy** en su plano de datos.

* **Fortalezas:** Control de tráfico de Capa 7 extremadamente granular (canary releases, inyección de fallos, traffic mirroring), integración nativa profunda con ecosistemas de telemetría y un modelo de seguridad muy robusto.
* **Desafíos:** Tradicionalmente ha sido criticado por su alta complejidad operativa y el consumo de recursos de sus cientos de sidecars de Envoy.
* **La evolución (Ambient Mesh):** Para mitigar el problema del consumo de recursos, Istio introdujo *Ambient Mesh*. Este modo elimina el sidecar por Pod y utiliza un proxy seguro por *Nodo* (llamado ztunnel) para gestionar el cifrado de Capa 4 (mTLS), delegando las operaciones complejas de Capa 7 a proxies dedicados (Waypoints) solo cuando es estrictamente necesario.

### Linkerd: Simplicidad y rendimiento en Rust

Creado por Buoyant, Linkerd es un proyecto graduado de la CNCF que tomó un camino opuesto a Istio. Su filosofía es "simplicidad operativa ante todo".

* **Micro-proxy en Rust:** En lugar de usar Envoy (escrito en C++), Linkerd desarrolló su propio proxy súper ligero escrito en Rust, llamado *Linkerd2-proxy*. Rust garantiza seguridad de memoria y un consumo de recursos radicalmente menor (a menudo menos de 20 MB de RAM por proxy).
* **Filosofía "Just Works":** Puedes instalar Linkerd y obtener mTLS mutuo, métricas de éxito/latencia y mapas topológicos en menos de 5 minutos, sin escribir una sola línea de configuraciónYAML.
* **Trade-offs:** Aunque es brillante en observabilidad y seguridad, carece de algunas de las funcionalidades de enrutamiento avanzado de Capa 7 altamente específicas que Istio domina.

### Cilium y eBPF: El cambio de paradigma a nivel de Kernel

Cilium representa la evolución más disruptiva en la red de Kubernetes. En lugar de depender exclusivamente de proxies en el espacio de usuario (user-space) como los sidecars, Cilium utiliza **eBPF (Extended Berkeley Packet Filter)**.

eBPF permite ejecutar programas seguros directamente dentro del núcleo (kernel) de Linux. Cilium intercepta las llamadas de red (sockets) a nivel del sistema operativo, antes de que los paquetes viajen por la pila TCP/IP tradicional.

```text
+-----------------------+                    +-----------------------+
|       Nodo A          |                    |       Nodo B          |
|  +-----------------+  |                    |  +-----------------+  |
|  |      Pod A      |  |                    |  |      Pod B      |  |
|  | [ Aplicación  ] |  |                    |  | [ Aplicación  ] |  |
|  +-------^---------+  |                    |  +-------^---------+  |
|          |            |    Tráfico mTLS    |          |            |
|  [ eBPF en Kernel  ]  | <================> |  [ eBPF en Kernel  ]  |
+-----------------------+                    +-----------------------+

```

* **Rendimiento inigualable:** Al eliminar la necesidad de inyectar sidecars y evitar los saltos entre el espacio de usuario y el núcleo, Cilium reduce drásticamente la latencia y el consumo de CPU.
* **Seguridad profunda:** Cilium puede aplicar políticas de red no solo basadas en IPs o puertos, sino en metadatos criptográficos y llamadas al sistema de Linux.
* **Service Mesh Sidecarless:** Cilium CNI ha evolucionado hacia *Cilium Service Mesh*, ofreciendo características completas de enrutamiento y mTLS sin requerir la arquitectura sidecar tradicional, acercándose a la red puramente nativa.

### Resumen Estratégico para el Arquitecto

La elección del Service Mesh dependerá directamente de los objetivos de tu plataforma:

| Característica | Istio | Linkerd | Cilium (eBPF) |
| --- | --- | --- | --- |
| **Plano de Datos** | Envoy (Sidecar / ztunnel) | Linkerd2-proxy (Sidecar Rust) | eBPF Kernel / Envoy per-node |
| **Complejidad de Adopción** | Alta | Muy Baja | Media (Requiere un kernel moderno) |
| **Rendimiento / Overhead** | Alto (modo sidecar clásico) | Muy Bajo | Ultra Bajo (casi nativo) |
| **Caso de Uso Ideal** | Clusters masivos con requisitos complejos de enrutamiento L7 y políticas corporativas estrictas. | Equipos pequeños/medianos que necesitan mTLS inmediato y métricas sin sobrecarga operativa. | Plataformas modernas de alto rendimiento que buscan unificar el CNI, la seguridad L4/L7 y la observabilidad a nivel OS. |

## 13.4 Arquitecturas Multi-clúster y Federación (Karmada, Submariner)

A medida que una organización madura en su adopción de la nube nativa, se topa inevitablemente con los límites físicos y lógicos de un único clúster de Kubernetes. Aunque la documentación oficial indica que un clúster puede soportar hasta 5.000 nodos, operar a esa escala introduce riesgos masivos.

El *blast radius* (radio de explosión) de un error humano, una actualización fallida del plano de control o la corrupción de la base de datos `etcd` puede derribar la plataforma global de una compañía. Además, surgen necesidades de baja latencia (desplegar cerca del usuario final en diferentes regiones geográficas) y estrategias multi-nube (evitar el *vendor lock-in*).

La respuesta arquitectónica es dividir las cargas de trabajo en múltiples clústeres más pequeños y especializados. Sin embargo, esto genera un nuevo desafío operacional: **¿Cómo evitamos que la gestión de 50 clústeres se convierta en una pesadilla de configuración fragmentada y redes aisladas?**

Para resolver esto, la arquitectura multi-clúster se aborda desde dos dimensiones distintas: **Federación de Recursos** (Karmada) y **Conectividad de Red** (Submariner).

---

### 1. Federación y Orquestación de Cargas: Karmada

Históricamente, la comunidad intentó resolver la orquestación multi-clúster con proyectos como *KubeFed* (Federation v1 y v2), los cuales resultaron demasiado complejos e intrusivos, obligando a reescribir manifiestos. **Karmada** (Kubernetes Armada) es el sucesor moderno y el estándar de facto actual alojado en la CNCF.

Karmada te permite gestionar múltiples clústeres de Kubernetes de forma centralizada sin tener que modificar los manifiestos originales de tus aplicaciones. Funciona proporcionando un API Server "virtual" (el clúster anfitrión o *Host Cluster*) al que te conectas exactamente igual que a un clúster normal.

**Conceptos Core de Karmada:**

* **Host Cluster:** El clúster central donde se instala el plano de control de Karmada.
* **Member Clusters:** Los clústeres de trabajo reales (EKS, GKE, clústeres on-premise) registrados en Karmada. Pueden ser gestionados en modo *Push* (Karmada se conecta a su API) o *Pull* (un agente en el clúster miembro lee de Karmada).
* **PropagationPolicy:** El "cerebro" de Karmada. Un CRD que define **dónde** y **cómo** se debe distribuir un recurso estándar.
* **OverridePolicy:** Permite mutar un recurso dependiendo del clúster de destino (ej. usar una StorageClass diferente en AWS que en GCP para el mismo Deployment).

**Ejemplo Práctico:**

Imagina que tienes un `Deployment` estándar de NGINX. En lugar de aplicarlo clúster por clúster, lo aplicas en el Host Cluster de Karmada. Luego, aplicas una `PropagationPolicy` como esta:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: nginx-propagation
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx-deployment
  placement:
    clusterAffinity:
      clusterNames:
        - cluster-aws-us-east
        - cluster-gcp-europe
    replicaScheduling:
      replicaDivisionPreference: Aggregated
      replicaSchedulingType: Divided
      weightPreference:
        staticWeightList:
          - targetCluster:
              clusterNames:
                - cluster-aws-us-east
            weight: 2
          - targetCluster:
              clusterNames:
                - cluster-gcp-europe
            weight: 1

```

En este escenario, si tu `Deployment` especifica 9 réplicas, Karmada calculará automáticamente los pesos e inyectará 6 réplicas en el clúster de AWS y 3 en el de GCP. Si uno de los clústeres se cae, Karmada puede reprogramar (failover) los Pods hacia los clústeres supervivientes.

---

### 2. Conectividad y Descubrimiento: Submariner

Karmada resuelve la distribución de las cargas, pero expone un problema de red: por diseño, el estándar CNI (Capítulo 4) aísla el tráfico de los Pods y Services dentro del límite de su propio clúster. Si un frontend en el clúster de AWS necesita consultar una API en el clúster on-premise, tradicionalmente tendrías que exponer la API a través de un Ingress público, comprometiendo la seguridad y añadiendo latencia.

**Submariner** es una herramienta de red open-source que aplana las redes de múltiples clústeres. Permite la comunicación directa a nivel de Capa 3 entre Pods y Services de distintos clústeres de Kubernetes, de forma segura y cifrada, sin necesidad de Ingress Controllers ni de exponer puertos a Internet.

**Arquitectura y Componentes de Submariner:**

1. **Gateway Nodes:** Submariner elige nodos específicos en cada clúster para actuar como puertas de enlace. Estos nodos establecen túneles seguros (mediante IPsec o WireGuard) entre sí a través de Internet o de redes WAN corporativas.
2. **Route Agent:** Un DaemonSet que se ejecuta en cada nodo de trabajo. Su trabajo es interceptar el tráfico destinado a otro clúster y enrutarlo internamente hacia el Gateway Node local.
3. **Lighthouse (Multi-cluster Service Discovery):** Submariner implementa la API estándar de Kubernetes de `Multi-Cluster Services (MCS)`. Exporta la información de DNS de un clúster a los demás.

**El Flujo de Multi-cluster Services:**

Para que un servicio sea consumible globalmente, debes "exportarlo".

```yaml
# Aplicado en el Clúster A (donde vive la base de datos)
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: postgres-svc
  namespace: database

```

Una vez exportado, Submariner intercepta esto y programa el DNS de CoreDNS en todos los demás clústeres miembros. Ahora, un Pod en el Clúster B puede resolver y conectarse a la base de datos simplemente llamando a:

`postgres-svc.database.svc.clusterset.local`

---

### 3. La Topología Unificada: Karmada + Submariner

Como Arquitecto de Infraestructura, el verdadero poder se desbloquea al combinar estas dos tecnologías. Karmada actúa como el plano de control global (orquestando) y Submariner como el plano de datos global (conectando).

```text
                                [ API Central Karmada ]
                                          |
                        +-----------------+-----------------+
    (PropagationPolicy) |                                   | (PropagationPolicy)
                        v                                   v
             +--------------------+              +--------------------+
             |  CLÚSTER A (AWS)   |              | CLÚSTER B (On-Prem)|
             |                    |              |                    |
             | [ Pod Frontend ]   |              | [ Pod Backend ]    |
             |        |           |              |        ^           |
             |        v           |              |        |           |
             | (Route Agent)      |              |  (Route Agent)     |
             |        |           |              |        ^           |
             |        v           |              |        |           |
             |  [ Gateway ]       | <=========>  |   [ Gateway ]      |
             +--------------------+  Túnel L3    +--------------------+
                                    (IPsec/WireGuard)

```

En esta arquitectura de nivel Senior, el clúster individual deja de ser el límite lógico. Kubernetes se convierte verdaderamente en el sistema operativo del centro de datos distribuido, permitiendo despliegues globales activos-activos, alta disponibilidad intercontinental y un enrutamiento de red transparente para el código de las aplicaciones.

## 13.5 Serverless en Kubernetes (Knative)

A lo largo de este libro, hemos construido una plataforma robusta. Tienes almacenamiento dinámico, redes cifradas con *Service Mesh*, operadores que gestionan bases de datos y una topología multi-clúster. Sin embargo, desde la perspectiva de un desarrollador de software, la fricción sigue siendo alta. Para desplegar un simple microservicio web, un desarrollador típicamente necesita escribir y mantener un `Deployment`, un `Service`, un `Ingress` (o `Gateway`), y un `HorizontalPodAutoscaler` (HPA).

El paradigma **Serverless** (cuyo mayor exponente comercial es AWS Lambda o Google Cloud Run) promete eliminar esta fricción: el desarrollador solo entrega el código fuente o el contenedor, y la plataforma se encarga de todo lo demás, incluyendo el enrutamiento, las actualizaciones seguras y el escalado desde cero hasta miles de instancias, pagando solo por el tiempo de ejecución.

¿Es posible tener esta experiencia de desarrollo sin abandonar nuestro clúster de Kubernetes y sin atarnos a un proveedor de nube específico? La respuesta de la Cloud Native Computing Foundation (CNCF) es **Knative**.

### ¿Qué es Knative?

Knative (pronunciado *kay-nay-tiv*) es una capa de abstracción construida sobre Kubernetes (usando CRDs, como vimos en la sección 13.1) y un sistema de enrutamiento avanzado (usualmente un Service Mesh como Istio, Envoy o Contour, vinculándose con la sección 13.3).

Su objetivo no es reemplazar a Kubernetes, sino **ocultar su complejidad a los desarrolladores**, ofreciendo primitivas diseñadas específicamente para cargas de trabajo sin estado (stateless) y orientadas a eventos.

Knative se divide en dos grandes componentes lógicos: **Knative Serving** y **Knative Eventing**.

---

### 1. Knative Serving: Escalado a cero y Gestión de Tráfico

`Knative Serving` se centra en la ejecución de contenedores HTTP respondiendo a peticiones web. Sus superpoderes principales son el **Scale-to-Zero** (escalar a cero réplicas cuando no hay tráfico) y el enrutamiento avanzado por revisiones.

Para entender su impacto, mira cómo se despliega una aplicación web completa con Knative:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-world
  namespace: developers
spec:
  template:
    spec:
      containers:
        - image: midominio.com/hello-world:v1.0
          env:
            - name: TARGET
              value: "Knative"

```

*Nota: No confundas este recurso `Service` (del grupo de API `serving.knative.dev`) con el `Service` nativo de Kubernetes.*

Este único manifiesto de 12 líneas reemplaza cientos de líneas de YAML tradicional. Al aplicar este CRD, Knative automáticamente:

1. Crea un `Deployment` inmutable.
2. Configura el enrutamiento interno y externo (creando una URL pública basándose en el DNS configurado).
3. Monitorea el tráfico HTTP entrante en lugar de métricas de CPU/Memoria.
4. Escala los Pods a cero si no hay peticiones durante un tiempo determinado (por defecto, 60 segundos).

#### La Arquitectura del Scale-to-Zero (El componente Activator)

¿Cómo puede Kubernetes responder a una petición HTTP si no hay ningún Pod ejecutándose? Aquí radica la genialidad arquitectónica de Knative:

```text
[ Usuario ] ---> [ Ingress Gateway (Ej. Istio) ]
                          |
             ¿Hay Pods vivos para 'hello-world'?
                          |
             +------------+-------------+
             |                          |
          (SÍ)                         (NO)
             |                          v
             |                  [ Knative Activator ]
             |                          |
             |             (1) Retiene la petición HTTP en memoria
             |             (2) Notifica al Autoscaler para crear un Pod
             |                          |
             v                          v
    [ Pod hello-world ] <------- (3) Reenvía la petición cuando el Pod está "Ready"

```

Cuando un servicio escala a cero, el enrutador redirige el tráfico hacia un componente interno llamado **Activator**. El Activator "sostiene" la petición HTTP del usuario, despierta la infraestructura y, tan pronto como el contenedor arranca (el temido *Cold Start* o arranque en frío), le pasa la petición. Para el usuario final, la primera petición simplemente tarda un poco más en responder, pero no falla.

#### Revisiones y Traffic Splitting

Cada vez que modificas el YAML de un servicio Knative (por ejemplo, cambiando la etiqueta de la imagen de `v1.0` a `v2.0`), Knative crea una **Revision** (una instantánea inmutable del código y la configuración).

Esto permite realizar estrategias de despliegue complejas (como *Canary Releases* o *Blue/Green*) de forma trivial y nativa, sin necesidad de herramientas de CD externas complejas:

```yaml
# Fragmento del CRD Service de Knative
  traffic:
  - latestRevision: true
    percent: 10
  - revisionName: hello-world-v1
    percent: 90

```

Con estas cuatro líneas, Knative configurará Istio/Envoy subyacente para enviar el 10% del tráfico a la nueva versión y el 90% a la versión estable.

---

### 2. Knative Eventing: Desacoplando Productores y Consumidores

Mientras que *Serving* es para tráfico síncrono (HTTP), **Knative Eventing** estandariza el enrutamiento de eventos asíncronos. Se basa fuertemente en el estándar **CloudEvents**, garantizando que los eventos fluyan con un formato de metadatos universal.

Como Arquitecto, usarás Eventing para crear topologías donde los sistemas que generan eventos no saben nada de los sistemas que los procesan.

Sus componentes principales son:

* **Sources (Fuentes):** Conectores que leen eventos de sistemas externos (Kafka, GitHub, AWS SQS, un bucket de S3) y los inyectan en el clúster como CloudEvents.
* **Broker:** Un "hub" de enrutamiento central. Recibe eventos y los almacena temporalmente.
* **Triggers:** Reglas de filtrado declarativas. Le dicen al Broker: *"Si ves un evento del tipo `com.github.pull_request.opened`, envíalo al servicio Knative llamado `pr-analyzer`"*.

```text
[ GitHub Source ] ---> [ Broker ] ---> (Trigger: type=image_upload) ---> [ Image Resizer Ksvc ]
                               |
                               +-----> (Trigger: type=db_backup) ------> [ Backup Job Ksvc ]

```

Lo más poderoso de esta combinación es que **los consumidores de eventos también pueden escalar a cero**. Si nadie sube una imagen durante toda la noche, el servicio `Image Resizer` consumirá cero recursos computacionales. Cuando el *Source* inyecte un evento en el *Broker*, Knative despertará al servicio para procesarlo y volverá a apagarlo al terminar.

### Consideraciones Arquitectónicas (Cuándo NO usar Knative)

Knative es una herramienta excepcional para el nivel superior de abstracción de tu plataforma, pero no es una bala de plata. Debes evaluar los siguientes *trade-offs*:

1. **Cold Starts (Arranques en frío):** Si tu aplicación es un monolito en Java con Spring Boot que tarda 15 segundos en arrancar, escalar a cero será inaceptable para tus usuarios. Knative brilla con lenguajes de inicio rápido (Go, Rust, Node.js) o usando compilación nativa (GraalVM).
2. **Procesos en segundo plano continuos:** Si tu Pod necesita estar escuchando constantemente una cola TCP propietaria o ejecutando un bucle infinito (*polling*), el patrón de `Deployment` tradicional es el correcto. Knative interrumpirá y apagará procesos que no reciban tráfico HTTP o CloudEvents.
3. **Consumo de recursos de la plataforma:** Knative requiere instalar varios controladores y, usualmente, un Service Mesh completo. En clústeres de borde (Edge) muy pequeños o con pocos recursos, el *overhead* del plano de control puede ser mayor que el ahorro obtenido por el escalado a cero.

Adoptar Serverless en Kubernetes significa convertir tu clúster en una verdadera Plataforma como Servicio (PaaS) interna, democratizando el acceso a la infraestructura para los desarrolladores y permitiendo a las organizaciones optimizar drásticamente su gasto en cómputo.

## 13.6 Kubernetes Edge (K3s, MicroK8s)

A lo largo de este libro, hemos asumido un entorno operativo relativamente estable: centros de datos masivos o regiones de nube pública con abundantes recursos de cómputo (CPU, memoria) y conectividad de red de alta velocidad y baja latencia. Sin embargo, la próxima gran frontera de la infraestructura no está en la nube centralizada, sino en el **Borde (Edge)**.

El *Edge Computing* implica llevar la capacidad de procesamiento lo más cerca posible de donde se generan los datos: torres de telecomunicaciones 5G, fábricas industriales, sucursales de supermercados, trenes en movimiento o incluso dispositivos IoT (Internet of Things) como Raspberry Pis.

### El problema de Kubernetes "Vanilla" en el Borde

Si intentas instalar el Kubernetes tradicional (el que desplegamos con `kubeadm` en el Capítulo 12) en un entorno Edge, te enfrentarás a tres barreras arquitectónicas críticas:

1. **Consumo de recursos (Footprint):** El plano de control estándar (`kube-apiserver`, `kube-controller-manager`, `kube-scheduler`) y el motor de base de datos `etcd` requieren fácilmente entre 1.5 GB y 2 GB de memoria RAM solo para existir, antes de ejecutar un solo contenedor de aplicación.
2. **Sensibilidad a la latencia de `etcd`:** Como vimos en el Capítulo 1, `etcd` es un almacén clave-valor fuertemente consistente basado en el algoritmo Raft. Raft es extremadamente sensible a la latencia de red y a la pérdida de paquetes. Si la conexión de una sucursal fluctúa, el clúster entero puede degradarse o corromperse.
3. **Complejidad operativa:** Gestionar cientos o miles de clústeres dispersos geográficamente con herramientas tradicionales de aprovisionamiento es inviable.

Para resolver esto, la comunidad ha creado distribuciones de Kubernetes altamente optimizadas. Las dos más dominantes en entornos productivos son **K3s** y **MicroK8s**.

---

### K3s: El Kubernetes ligero de Rancher

Creado por Rancher Labs (ahora parte de SUSE) y donado a la CNCF, K3s se define como "5 menos que K8s". Es una distribución de Kubernetes certificada, diseñada explícitamente para producción en entornos con recursos limitados.

**Decisiones de diseño de K3s:**

* **Un solo binario:** K3s empaqueta todos los componentes del plano de control, además de `containerd` (el runtime de contenedores), `Flannel` (el CNI), `CoreDNS` y `Traefik` (como Ingress Controller) en un único archivo binario de menos de 100 MB.
* **Kine y la eliminación de `etcd`:** Para solucionar el problema de recursos y latencia, K3s utiliza un componente llamado **Kine** (Kine is not etcd). Kine actúa como un "traductor" que permite al `kube-apiserver` (que solo sabe hablar con etcd) comunicarse con bases de datos relacionales tradicionales. Por defecto, K3s usa **SQLite** para clústeres de un solo nodo, y soporta MySQL o PostgreSQL para clústeres en Alta Disponibilidad (HA).
* **Ausencia de código inútil:** Se han eliminado todos los plugins de almacenamiento *in-tree* (antiguos) y los proveedores de nube integrados (AWS, GCP, Azure), delegando todo al estándar CSI (Capítulo 5).

**Despliegue típico:**
Arrancar un servidor K3s es tan sencillo como ejecutar un script:

```bash
curl -sfL https://get.k3s.io | sh -

```

---

### MicroK8s: El enfoque "Zero-Ops" de Canonical

Desarrollado por Canonical (la empresa detrás de Ubuntu), MicroK8s es otra distribución certificada, pero aborda el problema del Edge desde una perspectiva de empaquetado y modularidad.

**Decisiones de diseño de MicroK8s:**

* **Empaquetado Snap:** MicroK8s se distribuye como un paquete `snap`. Esto le otorga actualizaciones transaccionales automáticas (over-the-air) y un aislamiento estricto (sandboxing) del sistema operativo subyacente, lo cual es vital para la seguridad en dispositivos físicos desatendidos.
* **Dqlite (Distributed SQLite):** En lugar de depender de una base de datos externa para la Alta Disponibilidad, Canonical inventó **dqlite**. Es una versión en clúster, altamente disponible y fuertemente consistente de SQLite, escrita en C. Proporciona las garantías de HA sin la sobrecarga operativa de `etcd`.
* **Ecosistema de Add-ons:** MicroK8s viene minimalista por defecto, pero incluye un sistema de complementos que permite activar capacidades complejas con un solo comando. Si necesitas Istio (Capítulo 13.3) en tu dispositivo Edge, simplemente ejecutas `microk8s enable istio`.

---

### Arquitectura de Referencia: Hub-and-Spoke (De la Nube al Borde)

En un escenario Senior/Enterprise, K3s o MicroK8s no operan en el vacío. Se integran con las estrategias de federación que vimos en la sección anterior (13.4) y con los principios GitOps (Capítulo 11) para formar una arquitectura centralizada, comúnmente llamada **Hub-and-Spoke**.

```text
                  [ Repositorio Git Central ]
                               |
                               v
            +-----------------------------------+
            |        CLÚSTER HUB (Nube)         |
            | - Rancher / Karmada               |
            | - ArgoCD / FluxCD                 |
            | - Observabilidad Central (Loki)   |
            +-----------------------------------+
                  /            |            \
       (Conexión Pull)   (Conexión Pull)   (Conexión Pull)
             /                 |                 \
  +--------------+      +--------------+      +--------------+
  | Clúster Edge |      | Clúster Edge |      | Clúster Edge |
  | (Sucursal 1) |      | (Sucursal 2) |      | (Fábrica A)  |
  |     [K3s]    |      |     [K3s]    |      |  [MicroK8s]  |
  +--------------+      +--------------+      +--------------+

```

En esta topología:

1. El **Clúster Hub** (ejecutándose en AWS, GCP o un Datacenter con Kubernetes tradicional) no gestiona los contenedores individuales del Edge.
2. Los **Clústeres Edge** (K3s/MicroK8s) son independientes. Si la conexión a Internet se corta, la fábrica sigue operando con total normalidad, ya que el plano de control es local.
3. Cuando la conexión se restablece, los agentes de GitOps en el Edge hacen *Pull* de los nuevos cambios desde el Hub (nuevos Deployments, actualizaciones de seguridad) y sincronizan su estado.

### Conclusión del Capítulo

Al dominar la extensión de la API mediante CRDs y Operadores (13.1, 13.2), orquestar el tráfico de microservicios con Service Meshes (13.3), federar clústeres a nivel global (13.4), abstraer la complejidad para los desarrolladores con Serverless (13.5) y llevar el cómputo al extremo físico de la red con el Edge (13.6), has completado el viaje arquitectónico.

Has evolucionado de desplegar un simple Pod de NGINX a diseñar y operar plataformas distribuidas, resilientes y auto-gestionadas a escala global. Este es el verdadero nivel de un Arquitecto DevOps/SRE en el ecosistema Kubernetes.

## Conclusión: El viaje hacia la maestría

Dominar Kubernetes no es memorizar comandos, sino comprender un ecosistema en constante expansión. Desde el primer Pod hasta la orquestación global en el **Edge**, has recorrido el camino que separa a un administrador de un **Arquitecto Cloud Native**.

Ahora posees las herramientas para extender la API, automatizar operaciones con **Operadores** y escalar infraestructuras resilientes. La tecnología seguirá evolucionando, pero los principios de abstracción y declaración que has aprendido son los cimientos de la computación moderna. Tu clúster está listo; tu carrera, en pleno despliegue. **¡Bienvenido al nivel Senior!**
