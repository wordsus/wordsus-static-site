En el dinámico ecosistema de Kubernetes, la eficiencia no es una opción, sino una necesidad operativa. Este capítulo aborda la transición de una infraestructura estática a una **reactiva e inteligente**. Exploramos el **HPA** para escalar réplicas y el **VPA** para el ajuste vertical de recursos, garantizando el rendimiento sin desperdicio.

Elevamos la complejidad hacia la infraestructura con el **Cluster Autoscaler** y el revolucionario **Karpenter**, que redefine el aprovisionamiento de nodos "just-in-time". Finalmente, implementamos **KEDA** para habilitar arquitecturas *event-driven* con escalado a cero, alcanzando la madurez en la gestión de costos y capacidad a nivel Senior.

## 10.1 Horizontal Pod Autoscaler (HPA) con métricas estándar y customizadas

En los capítulos anteriores exploramos cómo gestionar el ciclo de vida de nuestras aplicaciones mediante Deployments y StatefulSets (Capítulo 3), y cómo garantizar que tengan los recursos necesarios mediante Requests y Limits (Capítulo 7). Sin embargo, en un entorno de producción real, el tráfico rara vez es estático. Mantener un número fijo de réplicas conduce a dos escenarios indeseables: sobreaprovisionamiento (desperdicio de dinero y recursos) o subaprovisionamiento (latencia alta y caída del servicio).

El **Horizontal Pod Autoscaler (HPA)** es el controlador nativo de Kubernetes diseñado para resolver este problema. Su función es escalar automáticamente el número de Pods en un controlador de cargas de trabajo (como un Deployment o ReplicaSet) basándose en la observación de métricas.

### El Bucle de Control del HPA

El HPA no reacciona instantáneamente a cada pico de tráfico. Funciona como un bucle de control continuo (por defecto, evalúa las métricas cada 15 segundos, configurado mediante el flag `--horizontal-pod-autoscaler-sync-period` en el Controller Manager).

La decisión de escalado se basa en una fórmula matemática fundamental:

```text
Replicas Deseadas = ceil [ Replicas Actuales * ( Valor Metrica Actual / Valor Metrica Deseado ) ]

```

*Si el valor actual de CPU es del 80% y nuestro objetivo (target) es el 40%, el HPA calculará `80 / 40 = 2.0`. Si tenemos 2 réplicas, el controlador lo multiplicará por 2, escalando el Deployment a 4 réplicas.*

A nivel de arquitectura, el flujo de funcionamiento es el siguiente:

```text
+-----------------------+       1. Consulta API de métricas      +---------------------------+
|                       | -------------------------------------> | metrics.k8s.io (Estándar) |
|    HPA Controller     |                                        | custom.metrics.k8s.io     |
| (En el Control Plane) | <------------------------------------- | external.metrics.k8s.io   |
|                       |       2. Devuelve valores actuales     +---------------------------+
+-----------------------+                                                      ^
           |                                                                   |
           | 3. Calcula réplicas deseadas y                                    |
           |    actualiza el campo 'scale'                                     |
           v                                                                   |
+-----------------------+                                                      |
| Deployment/ReplicaSet | ---> 4. Crea o elimina Pods                          |
+-----------------------+                                                      |
           |                                                                   |
           +-------------------- 5. Los Pods reportan métricas ----------------+

```

### Escalado basado en Métricas Estándar (Resource Metrics)

Las métricas estándar en Kubernetes se refieren exclusivamente a **CPU** y **Memoria**. Para que el HPA pueda leer estos valores, es un requisito estricto tener desplegado el **Metrics Server** (visto en la sección 9.3) y que los contenedores dentro del Pod tengan definidos sus `resources.requests` (sección 7.2).

> **Advertencia de Arquitecto:** Si un Pod no tiene un *Request* de CPU o Memoria definido, el HPA no podrá calcular el porcentaje de utilización y mostrará el estado `Unknown`, bloqueando el escalado.

A partir de la versión `autoscaling/v2` de la API, podemos definir múltiples métricas. Aquí tienes un manifiesto HPA moderno para métricas estándar:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-backend-hpa
  namespace: produccion
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 500Mi

```

**Diferencia clave entre `Utilization` y `AverageValue`:**

* `Utilization` (Utilización): Se expresa en porcentaje (ej. 60%). Es relativo al *Request* configurado en el Pod. Solo es recomendable para CPU.
* `AverageValue` (Valor Promedio): Se expresa en valores absolutos (ej. 500Mi). Es la mejor práctica para la memoria, ya que escalar por porcentaje de memoria suele ser errático debido a cómo los lenguajes (como Java o Node.js) gestionan su Garbage Collector.

### Escalado basado en Métricas Customizadas (Custom Metrics)

Escalar por CPU o Memoria es útil, pero a menudo insuficiente. Una aplicación asíncrona que procesa mensajes en segundo plano (Worker) podría no consumir mucha CPU, pero tener un retraso enorme si la cola de mensajes crece. En estos casos, necesitamos métricas customizadas, como *peticiones HTTP por segundo* o *profundidad de una cola*.

Para usar métricas customizadas, necesitamos un adaptador que exponga estas métricas al API Server de Kubernetes. El más común es **Prometheus Adapter** (que se integra con la pila de monitoreo vista en la sección 9.2).

Existen dos tipos principales de métricas avanzadas en el HPA:

1. **Pods:** Métricas generadas por los propios Pods (ej. transacciones por segundo que procesa cada Pod).
2. **Object:** Métricas que describen un objeto específico del clúster independiente de los Pods (ej. conexiones activas en un objeto de tipo Ingress).

Ejemplo de un HPA escalando por peticiones HTTP por segundo (Métrica de tipo Pods):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-custom-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend-app
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: 100

```

*En este ejemplo, el HPA escalará la aplicación intentando que cada Pod maneje un promedio de 100 peticiones por segundo.*

### Comportamientos Avanzados: Políticas de Escalado (Behavior)

Un problema clásico en los entornos de producción es el *thrashing* o "aleteo": el HPA escala los Pods rápidamente ante un pico de tráfico temporal, y luego los destruye igual de rápido cuando el tráfico cae por un instante, causando inestabilidad en el servicio.

La API `autoscaling/v2` introdujo el campo `behavior`, permitiendo a los ingenieros de DevOps definir políticas granulares de estabilización (Stabilization Windows) y tasas de cambio.

```yaml
spec:
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # Espera 5 minutos antes de tomar la decisión de reducir
      policies:
      - type: Percent
        value: 10                     # Solo elimina el 10% de los pods...
        periodSeconds: 60             # ...cada minuto
    scaleUp:
      stabilizationWindowSeconds: 0   # Reacción inmediata al pico de tráfico (0 segundos)
      policies:
      - type: Pods
        value: 4                      # Sube de a 4 pods...
        periodSeconds: 15             # ...cada 15 segundos
      selectPolicy: Max               # Si hay múltiples políticas, usa la que añada más pods

```

**Buenas Prácticas para el Día 2:**

* **Scale Up agresivo, Scale Down conservador:** Como se muestra en el YAML anterior, tu política debe permitir escalar rápidamente ante demanda inesperada (protegiendo el servicio), pero reducir los Pods gradualmente. Un `stabilizationWindowSeconds` de 300 (5 minutos) en el `scaleDown` previene la destrucción de réplicas durante caídas momentáneas de tráfico.
* **Alineación con los Readiness Probes (Sección 9.1):** Si tu aplicación tarda 30 segundos en estar lista (`ReadinessProbe`), el HPA no enviará tráfico a la nueva réplica hasta entonces. Debes ajustar la métrica de umbral considerando este tiempo de calentamiento (Cold Start).

*Nota: Aunque la API `external.metrics.k8s.io` permite que el HPA consulte métricas fuera del clúster, como métricas de AWS CloudWatch o GCP Pub/Sub, hoy en día el estándar de la industria para arquitecturas dirigidas por eventos es utilizar herramientas especializadas como KEDA, la cual exploraremos a fondo en la sección 10.5.*

## 10.2 Vertical Pod Autoscaler (VPA)

Mientras que el Horizontal Pod Autoscaler (HPA) resuelve el problema de la concurrencia escalando *hacia afuera* (añadiendo más réplicas), el **Vertical Pod Autoscaler (VPA)** aborda un desafío distinto: el dimensionamiento correcto de los recursos (*rightsizing*). Es decir, escala *hacia arriba* o *hacia abajo* ajustando la cantidad de CPU y Memoria asignada a un Pod individual.

En el Capítulo 7, al estudiar *Requests* y *Limits*, mencionamos que los desarrolladores a menudo adivinan estos valores. Si los configuran muy altos, el clúster desperdicia recursos costosos; si los configuran muy bajos, las aplicaciones sufren estrangulamiento de CPU (CPU throttling) o son terminadas abruptamente por falta de memoria (OOMKilled). El VPA elimina estas conjeturas analizando el uso histórico y actual, ajustando las peticiones de recursos de forma automática.

### Arquitectura del VPA: Los Tres Componentes

A diferencia del HPA, que es un único controlador integrado en el *Control Plane*, el VPA es un conjunto de componentes adicionales (CRDs y controladores) que deben instalarse en el clúster. Funciona mediante la interacción de tres piezas fundamentales:

```text
+-------------------+      1. Analiza uso      +-------------------+
| Metrics Server /  | <----------------------- |   Recommender     |
| Prometheus        |                          +-------------------+
+-------------------+                                |   ^
                                 2. Calcula          |   | 3. Lee
                                 recomendaciones     v   | recomendación
+-------------------+                          +-------------------+
| Pod (En ejecución)| <----------------------- |     Updater       |
+-------------------+    4. Evict (Expulsa)    +-------------------+
        |                si difiere mucho
        v
+-------------------+      5. Intercepta       +-------------------+
|   API Server      | -----------------------> | VPA Admission     |
| (Creación de Pod) | <----------------------- | Controller        |
+-------------------+      6. Inyecta nuevos   +-------------------+
                           Requests/Limits

```

1. **Recommender:** Monitorea el consumo histórico y actual de los Pods (consultando el Metrics Server o Prometheus) y calcula los valores óptimos de CPU y Memoria.
2. **Updater:** Vigila los Pods en ejecución. Si detecta que los recursos asignados a un Pod difieren significativamente de la recomendación actual, expulsa (evict) el Pod para que pueda ser recreado.
3. **Admission Controller (Mutating Webhook):** Es un componente clave (repasado en la sección 8.6). Cuando un Pod está a punto de ser creado (ya sea por primera vez o porque el *Updater* lo expulsó), este controlador intercepta la petición y sobrescribe los valores de `resources.requests` en el manifiesto del Pod con las recomendaciones calculadas.

### Modos de Operación (UpdateMode)

El VPA es extremadamente potente, pero modificar recursos sobre la marcha implica reiniciar Pods (al menos hasta que la funcionalidad de *In-place Pod Resource Updates* se convierta en un estándar maduro en versiones futuras de Kubernetes). Para controlar este comportamiento, el VPA ofrece distintos modos operativos configurables en su manifiesto:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-vpa
  namespace: produccion
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-backend
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: '*'
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 1000m
          memory: 1Gi

```

Los modos de actualización (`updateMode`) disponibles son:

* **Off:** El VPA solo actúa como una herramienta de observabilidad. El *Recommender* genera las recomendaciones y las guarda en el objeto VPA, pero ni el *Updater* expulsa Pods ni el *Admission Controller* muta nuevos Pods. Es el modo ideal para implementar durante las primeras semanas (Día 1) para recolectar datos y ajustar presupuestos sin afectar el entorno de producción.
* **Initial:** El *Admission Controller* asignará los recursos recomendados solo cuando se crea un Pod nuevo. El *Updater* se desactiva, por lo que los Pods en ejecución nunca serán reiniciados para aplicar cambios. Es útil para cargas de trabajo que no toleran interrupciones.
* **Auto (o Recreate):** Es el modo totalmente automatizado. El *Updater* expulsará los Pods en ejecución si sus recursos necesitan ajustes, y el *Admission Controller* les inyectará los nuevos valores al recrearse.

### Limitaciones y Antipatrones (Consideraciones Nivel Senior)

Al implementar VPA en entornos de alta criticidad, debes considerar las siguientes advertencias de diseño:

> **Advertencia de Arquitecto:** Nunca mezcles HPA y VPA apuntando a la misma métrica (ejemplo: CPU o Memoria).

Si configuras el VPA para escalar los *requests* de CPU y al mismo tiempo el HPA está configurado para escalar réplicas basándose en la utilización de CPU, ambos controladores entrarán en conflicto. El VPA aumentará la CPU disponible, lo que hará que el porcentaje de uso disminuya; esto provocará que el HPA elimine réplicas, concentrando la carga nuevamente y desencadenando un ciclo caótico infinito.

**Patrones válidos de convivencia:**

* Utilizar VPA en modo `Auto` para CPU y Memoria, y prescindir del HPA (ideal para bases de datos o aplicaciones stateful pequeñas).
* Utilizar VPA exclusivamente para ajustar la **Memoria**, y dejar que el HPA controle el escalado horizontal basándose en **métricas customizadas** (como RPM o latencia, vistas en la sección 10.1).
* Proteger las aplicaciones en modo `Auto` utilizando **Pod Disruption Budgets (PDBs)**. El *Updater* del VPA respeta los PDBs, garantizando que no expulsará todos los Pods simultáneamente, previniendo caídas totales del servicio durante los reajustes de capacidad.

## 10.3 Cluster Autoscaler (Escalado de nodos tradicionales)

En las secciones anteriores (10.1 y 10.2), resolvimos el escalado a nivel de aplicación (Workloads). El HPA y el VPA garantizan que los Pods tengan los recursos lógicos necesarios para operar. Pero, ¿qué ocurre cuando el HPA solicita 15 nuevas réplicas ante un pico de tráfico y nuestros Nodos de Trabajo (Worker Nodes) físicos o virtuales ya están al 100% de su capacidad?

Como vimos en el Capítulo 1, el componente encargado de asignar Pods a Nodos es el *kube-scheduler*. Si no encuentra un Nodo con los recursos disponibles (basándose en los *Requests* de CPU y Memoria), los Pods se quedarán atascados en un estado `Pending` con el mensaje `FailedScheduling: Insufficient cpu/memory`.

Aquí es donde entra el **Cluster Autoscaler (CA)**. Su responsabilidad no es gestionar aplicaciones, sino **escalar la infraestructura subyacente**, añadiendo o eliminando Nodos del clúster dinámicamente.

### El Bucle de Decisión del Cluster Autoscaler

El CA opera de forma independiente a los controladores de Pods. Su lógica se divide en dos fases principales: **Scale-Up** (Escalado hacia afuera) y **Scale-Down** (Escalado hacia adentro).

**1. Scale-Up (Añadiendo capacidad)**

El CA observa continuamente el API Server buscando Pods en estado `Pending`. Cuando detecta uno, no añade un nodo ciegamente. Primero, realiza una simulación interna:

```text
+-----------------------+      1. Detecta Pods 'Pending'
|                       | <------------------------------------+
|  Cluster Autoscaler   |                                      |
|                       | ---+ 2. Simula: "¿Si añado un        |
+-----------------------+    | nodo del Grupo A, el Scheduler  |
           |                 | podrá asignar este Pod?"        |
           | 3. Solicita     +---------------------------------+
           v                                                   |
+-----------------------+      4. Aprovisiona VM       +---------------+
| API del Cloud Provider| ---------------------------> |  Nuevo Nodo   |
|   (AWS, GCP, Azure)   |                              |  (Registrado) |
+-----------------------+                              +---------------+

```

Si la simulación es exitosa, el CA se comunica con la API de tu proveedor de infraestructura para aumentar el tamaño del grupo de nodos.

**2. Scale-Down (Optimizando costos)**

Mantener nodos vacíos es costoso. El CA monitorea la utilización de recursos de todos los Nodos. Si un Nodo cae por debajo de un umbral de utilización (por defecto, 50% de la capacidad solicitada o *Requests*) durante un tiempo determinado (por defecto, 10 minutos), el CA lo marca como "innecesario".

Antes de eliminarlo, el CA verifica que los Pods que corren en ese nodo puedan ser reubicados en otros nodos existentes. Si es así, acordonará el nodo (`cordon`), drenará los Pods de forma segura (`drain`) respetando los **Pod Disruption Budgets (PDB)**, y finalmente instruirá al proveedor de nube para que destruya la máquina virtual.

### Integración con Proveedores de Nube (Node Groups)

A diferencia del HPA, que es completamente agnóstico a la infraestructura, el Cluster Autoscaler necesita saber cómo "hablar" con la capa física. Para ello, utiliza el concepto "tradicional" de Grupos de Autoescalado provistos por la nube:

* **AWS:** Auto Scaling Groups (ASG)
* **GCP:** Managed Instance Groups (MIG)
* **Azure:** Virtual Machine Scale Sets (VMSS)

El CA no crea estos grupos; asume que ya existen y se limita a modificar su propiedad `DesiredCapacity` (Capacidad Deseada).

Para que el CA sepa qué grupos puede gestionar, normalmente dependemos del etiquetado (Tags) en la nube. Por ejemplo, en AWS, un Auto Scaling Group debe tener etiquetas específicas para ser descubierto automáticamente:

```text
# Etiquetas requeridas en el ASG de AWS para el Auto-Discovery del CA:
k8s.io/cluster-autoscaler/<NOMBRE_DEL_CLUSTER> = owned
k8s.io/cluster-autoscaler/enabled = true

```

Y en el manifiesto de despliegue del CA, habilitamos el auto-descubrimiento pasando estos argumentos al contenedor:

```yaml
      containers:
        - command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste # Estrategia para elegir entre múltiples Node Groups
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/<NOMBRE_DEL_CLUSTER>

```

### Estrategias de Expansión (Expanders)

Cuando tienes múltiples *Node Groups* (por ejemplo, uno con instancias pequeñas y baratas, y otro con instancias grandes con GPUs), el CA debe decidir a qué grupo añadirle un nodo. Para ello usa los **Expanders**:

* `random`: Elige un grupo al azar (poco recomendado en producción).
* `most-pods`: Elige el grupo que permitirá agendar la mayor cantidad de Pods pendientes.
* `least-waste`: Elige el grupo que, tras ubicar los Pods, dejará la menor cantidad de CPU/Memoria sin usar (optimización estricta de costos).
* `priority`: Permite definir prioridades personalizadas mediante un ConfigMap (ej. priorizar instancias *Spot/Preemptible* antes que instancias *On-Demand*).

### Limitaciones del Modelo Tradicional (Perspectiva de Arquitecto)

Si bien el Cluster Autoscaler ha sido el estándar de la industria durante años, presenta desafíos significativos que un perfil Senior debe conocer:

1. **Rigidez de los Node Groups:** El CA asume que todos los nodos dentro de un grupo son idénticos en capacidad (CPU/Memoria). Si necesitas diversidad de instancias, debes crear y gestionar docenas de Auto Scaling Groups diferentes, lo que incrementa la sobrecarga operativa.
2. **Tiempo de respuesta lento:** Cuando el CA decide escalar, hace la llamada a la API de la nube. La nube debe provisionar la VM, arrancar el sistema operativo, descargar las imágenes de los contenedores (Capítulo 1), iniciar el proceso `kubelet` y unirse al clúster. Este proceso suele tardar entre **2 y 5 minutos**. Durante ese tiempo, tus usuarios podrían estar experimentando latencia porque los Pods siguen `Pending`.
3. **Desconexión del Scheduler:** El CA tiene su propia lógica de simulación que intenta imitar al *kube-scheduler*, pero a veces se desincronizan, especialmente en clústeres muy grandes con reglas complejas de *Affinities* y *Taints* (Capítulo 7).

Estas fricciones operativas y de rendimiento en arquitecturas modernas y dinámicas fueron el catalizador para crear una nueva generación de aprovisionadores "Just-In-Time" que rompen con la dependencia de los *Node Groups* estáticos. Esto nos lleva directamente a nuestra próxima sección: **Karpenter**.

## 10.4 Karpenter: Aprovisionamiento de nodos just-in-time

Como vimos al final del capítulo anterior, el *Cluster Autoscaler* (CA) ha sido el pilar del escalado de infraestructura durante años, pero su dependencia de los *Node Groups* estáticos (como los ASG de AWS) introduce rigidez y latencia. Si un Pod requiere una GPU o una arquitectura ARM, y no existe un grupo de nodos preconfigurado para ello, el Pod se quedará atascado indefinidamente.

Para resolver este problema de raíz, AWS desarrolló (y posteriormente donó a la CNCF) **Karpenter**: un aprovisionador de nodos de nueva generación, de código abierto, diseñado bajo el paradigma **"Groupless"** (sin grupos) y **"Just-In-Time"** (justo a tiempo).

### El Cambio de Paradigma: Adiós a los Node Groups

Karpenter abandona por completo la idea de gestionar grupos de autoescalado predefinidos. En su lugar, interactúa directamente con las APIs de cómputo del proveedor de nube (por ejemplo, Amazon EC2 Fleet API o Azure AKS Node Provisioning API).

Cuando el *kube-scheduler* nativo no puede ubicar un Pod, Karpenter entra en acción y evalúa todos los requisitos del Pod en tiempo real:

* ¿Cuánta CPU y Memoria (Requests) necesita exactamente?
* ¿Tiene reglas de *Node Affinity*? (Ej. `topology.kubernetes.io/zone: us-east-1a`)
* ¿Exige una arquitectura de CPU específica? (Ej. `kubernetes.io/arch: arm64`)
* ¿Tolera algún *Taint*? (Ej. Nodos dedicados a bases de datos).

Con esta información, Karpenter le pide a la nube **la instancia exacta, más barata y disponible en ese mismo milisegundo** que cumpla con los requisitos, y la inyecta directamente en el clúster, sin pasar por un grupo intermedio.

```text
+-------------------------------------------------------------------------+
|                    Comparativa de Flujos de Escalado                    |
+-------------------------------------------------------------------------+

[Modelo Tradicional: Cluster Autoscaler]
1. Pod 'Pending' -> 2. CA evalúa Node Groups -> 3. Sube la capacidad deseada
del ASG -> 4. La nube provisiona la instancia del tamaño fijo del ASG.
(Tiempo típico: 2 a 5 minutos)

[Modelo Moderno: Karpenter (Just-In-Time)]
1. Pod 'Pending' -> 2. Karpenter calcula requerimientos -> 3. Pide a la 
nube la instancia exacta a medida -> 4. Nodo inyectado al clúster.
(Tiempo típico: 40 a 60 segundos)

```

### Anatomía de Karpenter: NodePools

En lugar de definir "grupos de máquinas", en Karpenter definimos **políticas de aprovisionamiento** mediante un Custom Resource (CRD) llamado `NodePool`. Un `NodePool` establece los límites y restricciones de lo que Karpenter tiene permitido crear.

Aquí tienes un ejemplo de un manifiesto `NodePool` moderno (API `karpenter.sh/v1`):

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: computo-general
spec:
  template:
    spec:
      # Requisitos de los nodos que Karpenter puede provisionar
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"] # Permite instancias Spot para ahorrar
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64", "arm64"]    # Mezcla procesadores Intel/AMD y Graviton
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]       # Familias de cómputo, propósito general y memoria
      
      # Clase de nodo (CRD específico del proveedor de nube, ej. AWS)
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: configuracion-base

  # Límites globales para evitar facturas sorpresa
  limits:
    cpu: 1000
    memory: 1000Gi

  # Comportamiento de optimización (El superpoder de Karpenter)
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m

```

*(Nota: El `EC2NodeClass` referenciado en el YAML es otro CRD donde se configuran detalles puramente de infraestructura, como las subredes de la VPC, los Security Groups y el rol de IAM del nodo).*

### El Superpoder del Día 2: Consolidación Continua

Si bien aprovisionar rápido es fantástico, la característica que define a Karpenter como una herramienta de nivel *Senior* es la **Consolidación**.

El *Cluster Autoscaler* clásico solo elimina nodos si están casi vacíos. Karpenter, en cambio, evalúa continuamente (cada pocos segundos) la topología del clúster buscando ineficiencias. Si configuramos `consolidationPolicy: WhenEmptyOrUnderutilized`, Karpenter hará lo siguiente:

1. **Reemplazo por Nodos más baratos:** Si tienes un nodo gigante al 30% de uso, Karpenter calculará si los Pods caben en un nodo más pequeño y barato. Si es así, provisionará el nodo pequeño, moverá los Pods de forma segura (respetando PDBs) y destruirá el nodo grande.
2. **Empaquetado denso (Bin-packing):** Si tienes tres nodos al 40% de uso, Karpenter consolidará todos los Pods en dos nodos y apagará el tercero, reduciendo tu factura mensual drásticamente.

> **Perspectiva de Arquitecto: ¿Cuándo usar Karpenter vs Cluster Autoscaler?**
> Aunque Karpenter es superior en flexibilidad y velocidad, no es un reemplazo universal (todavía).
>
> * **Elige Karpenter si:** Operas en AWS (donde es un ciudadano de primera clase) o AKS (soporte en crecimiento), tienes cargas de trabajo muy dinámicas o *batch* (Jobs), usas instancias *Spot*, y quieres reducir drásticamente los costos mediante la consolidación.
> * **Mantén Cluster Autoscaler si:** Operas on-premise (VMware, bare-metal), usas nubes con soporte aún inmaduro para Karpenter, o tienes clústeres muy estáticos donde la carga rara vez fluctúa y las máquinas virtuales ya están pre-compradas (Reserved Instances estables).

## 10.5 KEDA (Kubernetes Event-driven Autoscaling)

En la sección 10.1 exploramos cómo el Horizontal Pod Autoscaler (HPA) puede escalar aplicaciones basándose en métricas estándar (CPU/Memoria) y métricas customizadas. Sin embargo, en arquitecturas modernas basadas en microservicios y dirigidas por eventos (Event-Driven Architectures), depender exclusivamente del HPA nativo presenta dos grandes fricciones operativas:

1. **Complejidad de Integración:** Conectar el HPA a fuentes de eventos externas (como una cola de AWS SQS, un tópico de Kafka o una base de datos PostgreSQL) requiere configurar adaptadores complejos como *Prometheus Adapter*, exportadores de métricas y consultas PromQL intermedias.
2. **La limitación del Cero:** El HPA nativo de Kubernetes **no puede escalar a cero réplicas**. Su límite inferior es 1. Si tienes 50 microservicios tipo *worker* esperando mensajes que solo llegan un par de veces al día, estarás pagando por 50 Pods inactivos las 24 horas.

Para resolver esto nació **KEDA** (Kubernetes Event-driven Autoscaling), un proyecto graduado de la CNCF desarrollado originalmente por Microsoft y Red Hat. KEDA actúa como un orquestador de autoescalado ligero que dota a Kubernetes de verdaderas capacidades *Serverless* (anticipando conceptos que profundizaremos en la sección 13.5).

### Arquitectura de KEDA: El mejor amigo del HPA

Un error común es pensar que KEDA reemplaza al HPA. En realidad, KEDA **trabaja en conjunto con el HPA**, extendiendo sus capacidades.

KEDA se compone de dos elementos centrales:

1. **Metrics Adapter:** Actúa como un traductor. Se conecta a decenas de sistemas externos (llamados *Scalers*), lee la longitud de las colas o los eventos, y los traduce al formato de métricas nativo que el HPA entiende.
2. **Controller / Operator:** Es el responsable exclusivo de la "magia" de escalar de 0 a 1, y de 1 a 0.

El flujo de trabajo se visualiza así:

```text
       [Fuente de Eventos Externa] (Ej. RabbitMQ, Kafka, AWS SQS)
                  ^
                  | 1. Consulta el estado (ej. mensajes en cola)
+-----------------------------------+
|               KEDA                |
|                                   |       2. Inyecta métricas
|  +-----------------------------+  | ----------------------------+
|  |       Metrics Adapter       |  |                             v
|  +-----------------------------+  |                  +---------------------+
|                                   |                  | HPA (Nativo de K8s) |
|  +-----------------------------+  |                  +---------------------+
|  |    Controller / Operator    |  |                             |
|  +-----------------------------+  |                             | 3. Escala (1 a N)
+-----------------------------------+                             v
                  |                         +-----------------------------------+
                  | 4. Escala (0 a 1)       |    Deployment / StatefulSet       |
                  +-----------------------> |    (Tus Pods Worker)              |
                                            +-----------------------------------+

```

Cuando no hay eventos, el *Controller* de KEDA apaga el Deployment (0 réplicas). En cuanto llega el primer evento, KEDA escala el Deployment a 1 réplica. A partir de ahí, KEDA le cede el control al HPA nativo (que KEDA generó automáticamente) para que gestione el escalado de 1 a N réplicas basándose en la velocidad a la que llegan los eventos.

### Implementación: El Custom Resource `ScaledObject`

Para utilizar KEDA, introducimos un nuevo objeto en nuestro paradigma declarativo: el `ScaledObject`. Este CRD le dice a KEDA qué Deployment escalar y qué *Scaler* (fuente de eventos) observar.

A continuación, un ejemplo de un *Worker* que procesa mensajes de una cola de RabbitMQ:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: procesador-pagos-scaler
  namespace: produccion
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-pagos             # El Deployment que vamos a escalar
  minReplicaCount: 0               # ¡La magia del Scale-to-Zero!
  maxReplicaCount: 30              # Límite superior
  pollingInterval: 15              # Cada cuántos segundos KEDA revisa la cola
  cooldownPeriod: 300              # Cuánto esperar sin eventos antes de escalar a 0
  triggers:
  - type: rabbitmq                 # El Scaler a utilizar
    metadata:
      queueName: cola_pagos
      queueLength: "50"            # Target: 1 Pod por cada 50 mensajes en la cola
    authenticationRef:
      name: rabbitmq-credenciales  # Referencia a un TriggerAuthentication (Secretos)

```

> **Advertencia de Arquitecto:** Cuando creas un `ScaledObject`, **no debes crear un HPA manualmente**. KEDA creará, gestionará y eliminará automáticamente el recurso HPA subyacente por ti. Si creas uno manualmente, ambos controladores pelearán por el estado del Deployment, causando *thrashing*.

### ScaledJobs: Procesamiento de Larga Duración

Imagina que tienes una cola de renderizado de video. Procesar cada evento no toma milisegundos (como una petición HTTP), sino que puede tardar horas.

Si usas un `ScaledObject` (que escala Deployments), corres un riesgo enorme: si la cola de mensajes se vacía repentinamente, el HPA decidirá que ya no se necesitan tantas réplicas y enviará una señal `SIGTERM` (visto en la sección 2.5) a tus Pods. Si un Pod estaba a la mitad de renderizar un video de 2 horas, ese trabajo se pierde.

Para cargas de trabajo de ejecución prolongada, KEDA ofrece una alternativa brillante de nivel Senior: el **`ScaledJob`**.

En lugar de escalar un Deployment, un `ScaledJob` lee la cola y crea un **Kubernetes Job** (sección 3.5) independiente por cada mensaje (o lote de mensajes).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: renderizado-video-job
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: render-engine
          image: mi-app/render:v2
        restartPolicy: Never
  maxReplicaCount: 50
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123/cola-render
      queueLength: "1" # Lanza 1 Job por cada mensaje

```

Al usar Jobs en lugar de Pods en un Deployment, garantizas que Kubernetes respete el ciclo de vida de la tarea hasta su finalización (`Completed`). El HPA no intervendrá para matar procesos a medias, resolviendo uno de los problemas más complejos del procesamiento asíncrono en contenedores.
