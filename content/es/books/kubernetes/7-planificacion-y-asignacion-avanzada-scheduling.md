El éxito de una arquitectura en Kubernetes no reside solo en ejecutar contenedores, sino en orquestar con precisión **dónde** y **cómo** aterrizan en la infraestructura. Este capítulo explora el cerebro del clúster: el **Scheduling**.

Dominarás el uso de **Labels y Selectors** para organizar recursos, y aprenderás a proteger la estabilidad del sistema mediante la gestión de **Requests y Limits**. Profundizaremos en estrategias de ubicación mediante **Affinity, Taints y Tolerations**, permitiéndote diseñar topologías de alta disponibilidad con **Topology Spread Constraints**. Finalmente, establecerás políticas de gobernanza con **Resource Quotas**, garantizando un entorno multi-tenant eficiente y justo.

## 7.1 Labels, Selectors y Annotations: El pegamento lógico de Kubernetes

Hasta este punto del libro, hemos creado Pods, expuesto aplicaciones mediante Services y gestionado volúmenes. Sin embargo, en un clúster de producción con cientos o miles de recursos, surge un problema fundamental: ¿cómo sabe un `Service` a qué `Pods` debe enviar tráfico? ¿Cómo identifica un `Deployment` cuáles son las réplicas que debe gestionar?

En arquitecturas tradicionales, usábamos direcciones IP estáticas o nombres de host. En Kubernetes, donde los Pods son efímeros y se crean y destruyen constantemente, ese enfoque es inviable. Aquí es donde entran en juego los **Labels** (etiquetas) y **Selectors** (selectores), el verdadero "pegamento" que conecta los componentes desacoplados del clúster.

Por otro lado, a medida que integramos herramientas de terceros (como Ingress Controllers, herramientas de CI/CD o Service Meshes), necesitamos almacenar metadatos que no sirven para agrupar, pero sí para configurar. Ese es el dominio de las **Annotations** (anotaciones).

---

### Labels: Categorizando la infraestructura

Los **Labels** son pares clave-valor (`key: value`) que se adjuntan a los objetos de Kubernetes (Pods, Nodos, Services, etc.). Su propósito principal es identificar atributos que son significativos y relevantes para los usuarios, pero que no tienen un significado directo para el *core* del sistema.

Piensa en los Labels como las etiquetas que pones a tus correos electrónicos o a los recursos en la nube (tags). No cambian el comportamiento del objeto por sí solos, pero permiten organizarlos.

**Reglas de sintaxis:**

* **Clave (Key):** Puede tener un prefijo opcional seguido de un nombre (ej. `mi-empresa.com/entorno`). El prefijo debe ser un subdominio DNS válido. Si no hay prefijo, la etiqueta se considera privada para el usuario.
* **Valor (Value):** Debe tener 63 caracteres o menos, y debe comenzar y terminar con un carácter alfanumérico.

**Ejemplo en un manifiesto de Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend-app
  labels:
    entorno: produccion
    tier: frontend
    app.kubernetes.io/name: mi-aplicacion
    app.kubernetes.io/version: "1.4.0"
spec:
  containers:
  - name: nginx
    image: nginx:1.21

```

> **Nota de nivel Senior:** Es una excelente práctica (y casi un estándar de la industria) utilizar los [Labels recomendados por Kubernetes](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) (los que comienzan con `app.kubernetes.io/`). Esto garantiza que herramientas de terceros, como Helm o dashboards de observabilidad (Prometheus/Grafana), puedan agrupar tus recursos de forma automática.

---

### Selectors: Agrupando dinámicamente

Si los Labels son las etiquetas, los **Selectors** son las consultas de búsqueda. Son el mecanismo central que utiliza Kubernetes para seleccionar un grupo de objetos basándose en sus Labels.

Existen dos tipos principales de selectores en Kubernetes:

**1. Selectores basados en igualdad (Equality-based):**
Permiten filtrar por claves y valores exactos. Soportan los operadores `=`, `==` y `!=`. Son los más utilizados por objetos primitivos como los `Services`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    tier: frontend
    entorno: produccion
  ports:
  - port: 80

```

*En este ejemplo, el Service solo enrutará tráfico a los Pods que tengan EXACTAMENTE ambos labels.*

**2. Selectores basados en conjuntos (Set-based):**
Son más potentes y expresivos. Permiten filtrar claves de acuerdo a un conjunto de valores. Soportan los operadores `in`, `notin` y `exists` (solo la clave, sin importar el valor). Son comúnmente usados por `Deployments`, `Jobs` y configuraciones de afinidad (que veremos en las próximas secciones).

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deploy
spec:
  replicas: 3
  selector:
    matchExpressions:
      - {key: tier, operator: In, values: [frontend, web]}
      - {key: entorno, operator: NotIn, values: [testing, dev]}
  template:
    # ... (metadatos y especificaciones del pod)

```

**Diagrama de Relación (Label/Selector):**

```text
 [Deployment: frontend-deploy]
        |
        | (Selector: app=frontend)
        v
 +-----------------------------------+
 |          (ReplicaSet)             |
 |                                   |
 |  [Pod 1]    [Pod 2]    [Pod 3]    | <---- [Service: frontend-svc]
 |  labels:    labels:    labels:    |       (Selector: app=frontend)
 |  app=front  app=front  app=front  | 
 +-----------------------------------+

```

*Como se observa en el esquema, el `Service` y el `Deployment` no se conocen entre sí. Ambos apuntan a los `Pods` de manera independiente utilizando el mismo Label Selector.*

---

### Annotations: Metadatos para herramientas y automatización

Las **Annotations** también son pares clave-valor adjuntos a los objetos, pero su propósito es radicalmente distinto al de los Labels.

**No se utilizan para agrupar ni seleccionar objetos.** Su función es almacenar metadatos arbitrarios, a menudo extensos, que serán leídos por herramientas externas, controladores de Kubernetes o librerías.

**Casos de uso comunes para Annotations:**

* Configurar el comportamiento de un Ingress Controller (ej. indicar que se requiere un certificado SSL o un tamaño máximo de body).
* Almacenar información de compilación/release (ej. hash del commit de Git, URL del pipeline de CI).
* Guardar la configuración previa de un objeto para poder hacer *rollbacks* (usado internamente por `kubectl apply`).
* Desactivar temporalmente alertas de monitoreo para un Pod específico.

**Ejemplo de Annotations en un Ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    descripcion: "Ingress principal para la API v2. Actualizado por pipeline 451."
spec:
  # ... reglas de enrutamiento

```

A diferencia de los Labels, los valores de las Annotations no tienen restricciones estrictas de longitud o caracteres permitidos; pueden contener cadenas JSON, formatos multilinea y caracteres especiales.

---

### Resumen: Labels vs. Annotations

Para consolidar ambos conceptos antes de pasar a temas de *Scheduling* más avanzados, aquí tienes la regla de oro:

| Característica | Labels | Annotations |
| --- | --- | --- |
| **Propósito Principal** | Identificar, agrupar y seleccionar objetos. | Adjuntar metadatos arbitrarios o configuración. |
| **¿Son consultables?** | **Sí.** Se usan con Selectors (`kubectl get pods -l app=web`). | **No.** No puedes filtrar objetos basándote en ellas. |
| **Longitud del valor** | Estricta (máximo 63 caracteres). | Flexible (pueden ser textos largos o JSONs). |
| **Consumidor habitual** | Kube-scheduler, Services, Deployments, operadores humanos. | Ingress Controllers, Service Meshes, Helm, herramientas de auditoría. |

Dominar el uso de Labels y Selectors es el primer paso vital para controlar dónde y cómo se ejecutan tus cargas de trabajo. En las siguientes secciones (7.3 en adelante), utilizaremos estos mismos principios para decirle a Kubernetes en qué nodos específicos queremos (o no queremos) que se ejecuten nuestros Pods.

## 7.2 Requests y Limits: Gestión de CPU y Memoria (Quality of Service - QoS)

Una vez que sabemos cómo etiquetar y seleccionar nuestras cargas de trabajo (como vimos en la sección anterior), nos enfrentamos a uno de los desafíos operativos más grandes en Kubernetes: **la gestión de recursos físicos**.

En un clúster, múltiples Pods comparten el mismo hardware subyacente (los Nodos). Si no establecemos reglas claras, un Pod mal configurado o bajo un ataque de denegación de servicio (DDoS) podría consumir toda la CPU y Memoria del Nodo, provocando la caída de las demás aplicaciones. Esto se conoce como el problema del "vecino ruidoso" (*noisy neighbor*).

Para solucionar esto, Kubernetes utiliza dos conceptos fundamentales que se configuran a nivel de contenedor: **Requests** (Peticiones) y **Limits** (Límites).

---

### Requests: La garantía mínima y el planificador

Los **Requests** le indican a Kubernetes la cantidad **mínima** de recursos que un contenedor necesita para funcionar correctamente.

**Su función principal es el Scheduling (Planificación).** Cuando creas un Pod, el `kube-scheduler` suma los *Requests* de todos sus contenedores y busca un Nodo que tenga esa cantidad de recursos libres. Si ningún Nodo tiene la capacidad disponible, el Pod se quedará en estado `Pending` (Pendiente).

* **CPU:** Se mide en "millicores" o "millicpu" (`m`). Un núcleo de CPU (1 core) equivale a `1000m`. Si un contenedor pide `250m`, está pidiendo un cuarto de un núcleo.
* **Memoria:** Se mide en bytes, comúnmente expresado en Mebibytes (`Mi`) o Gibibytes (`Gi`).

> **Nota técnica:** Es crucial usar `Mi` (base 2, 1024x1024) en lugar de `M` (base 10, 1000x1000). Kubernetes lee `100M` y `100Mi` de manera diferente, y usar la nomenclatura incorrecta puede llevar a cálculos de capacidad erróneos.

### Limits: El techo máximo y la contención

Los **Limits** establecen la cantidad **máxima** de recursos que un contenedor tiene permitido consumir. Si el Nodo tiene recursos ociosos, el contenedor puede superar su *Request* y crecer hasta su *Limit*, pero jamás podrá sobrepasarlo.

La forma en que se aplica el límite depende del tipo de recurso, y entender esta diferencia es vital para un ingeniero Senior:

* **CPU (Recurso compresible):** Si un contenedor intenta usar más CPU que su límite, el sistema operativo (a través de los *cgroups* de Linux) estrangulará el proceso (CPU Throttling). **La aplicación no se caerá**, pero se volverá mucho más lenta.
* **Memoria (Recurso incompresible):** La memoria no se puede "estrangular". Si un contenedor intenta asignar más memoria de la permitida por su límite, el kernel de Linux invocará al temido **OOMKiller** (Out Of Memory Killer) y el proceso será terminado abruptamente (el Pod mostrará el estado `OOMKilled`).

**Ejemplo en un manifiesto YAML:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: backend-api
spec:
  containers:
  - name: nodejs-app
    image: nodejs-backend:1.0
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"

```

---

### Quality of Service (QoS): Clases de prioridad

Cuando un Nodo se queda sin recursos (por ejemplo, la memoria total del servidor físico está al 99%), el `kubelet` debe tomar decisiones drásticas y empezar a expulsar (evict) Pods para salvar la integridad del Nodo.

¿A qué Pod mata primero? Aquí entra en juego el **QoS (Quality of Service)**. Kubernetes asigna automáticamente una clase QoS a cada Pod basándose en cómo configuraste sus Requests y Limits.

Existen tres clases, ordenadas de mayor a menor probabilidad de ser sacrificadas:

| Clase QoS | Condición de configuración | Riesgo de Eviction |
| --- | --- | --- |
| **BestEffort** | El Pod **no tiene** ni Requests ni Limits configurados. | **Alto.** Serán los primeros en ser eliminados (OOMKilled o Evicted) si el Nodo sufre presión. |
| **Burstable** | El Pod tiene Requests y Limits, pero **son diferentes** (Limits > Requests), o solo tiene Requests. | **Medio.** Serán sacrificados si ya no quedan Pods BestEffort y el Nodo sigue en peligro. |
| **Guaranteed** | Todos los contenedores del Pod tienen Requests y Limits, y **son exactamente iguales** (Requests == Limits). | **Bajo.** Son intocables. Solo serán eliminados si son los únicos que quedan y el Nodo está colapsando. |

**Diagrama de Capacidad y QoS en un Nodo:**

```text
+-------------------------------------------------------------+
| NODO: 4 Cores (4000m) / 16Gi RAM                            |
|-------------------------------------------------------------|
|  [Pod A: Guaranteed]  |  [Pod B: Burstable]                 |
|  Req: 1Gi / Lim: 1Gi  |  Req: 2Gi / Lim: 4Gi                |
|  (Reserva rígida)     |  (Puede expandirse al área libre)   |
|                       |                                     |
|-----------------------+------------------+------------------|
|       [Espacio Libre / Utilizable por Pod B o C]            |
|-------------------------------------------------------------|
|                                       | [Pod C: BestEffort] |
|                                       | Req: 0 / Lim: 0     |
+-------------------------------------------------------------+
 * Si la memoria se agota, el Kubelet matará primero al Pod C, 
   luego al Pod B (si excede su Request), y por último al Pod A.

```

---

### Estrategias y Anti-patrones (Nivel Senior)

Para pasar de un conocimiento básico a uno avanzado, debes aplicar estas buenas prácticas operativas:

1. **Iguala Requests y Limits de Memoria en bases de datos:** Para aplicaciones críticas y sistemas con estado (como Redis, PostgreSQL o Elasticsearch), configura siempre la clase `Guaranteed` (Requests de Memoria == Limits de Memoria). Esto previene que una base de datos sea sacrificada por culpa del pico de consumo de otro Pod secundario.
2. **El debate sobre los Limits de CPU:** Un patrón avanzado (y a veces contraintuitivo) es **no configurar Limits de CPU**, solo Requests. Debido a cómo funciona el `Completely Fair Scheduler (CFS)` de Linux, establecer límites de CPU estrictos a menudo provoca micro-throttling injustificado, aumentando la latencia de las aplicaciones web. Si el Nodo tiene CPU ociosa, dejar que las aplicaciones la usen (sin límite) suele ser mejor para el rendimiento global.
3. **Configura un LimitRange:** Para evitar que un desarrollador despliegue un Pod en `BestEffort` por accidente (olvidando poner los resources en el YAML), utiliza un objeto `LimitRange` en el Namespace (lo veremos a fondo en la sección 7.7) para inyectar Requests y Limits por defecto.

Entender la interacción entre el Scheduler (que mira los Requests) y el Cgroup/Kubelet (que aplica los Limits) es la piedra angular para construir clústeres estables, predecibles y altamente disponibles.

## 7.3 Node Selectors y Node Affinity/Anti-Affinity: Controlando el destino de los Pods

En la sección 7.1 aprendimos a etiquetar recursos y en la 7.2 a dimensionarlos. Sin embargo, el `kube-scheduler` por defecto asume que todos los Nodos de tu clúster son iguales. Busca un Nodo con suficientes recursos libres (basado en los Requests) y despliega el Pod allí.

En el mundo real, la infraestructura es heterogénea. Quizás tienes Nodos con discos SSD ultrarrápidos para tus bases de datos, Nodos con GPUs costosas para cargas de Machine Learning, o Nodos en zonas de disponibilidad (AZ) específicas por temas de latencia. ¿Cómo le decimos a Kubernetes: *"Quiero que este Pod corra estrictamente en un Nodo con GPU"* o *"Preferiría que este Pod corra en la Zona A, pero si está llena, ponlo en la Zona B"*?

Aquí es donde entran las reglas de asignación topológica: **Node Selectors** y **Node Affinity**.

---

### NodeSelector: El método clásico y directo

`nodeSelector` es la forma más antigua y sencilla de restringir la asignación de Nodos. Funciona bajo el mismo principio de "igualdad estricta" que vimos en la sección 7.1.

Simplemente añades un campo `nodeSelector` a la especificación de tu Pod, indicando los Labels que el Nodo debe poseer.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: db-postgres
spec:
  nodeSelector:
    disktype: ssd
    environment: produccion
  containers:
  - name: postgres
    image: postgres:14

```

**Limitaciones de nodeSelector:**
Aunque es fácil de entender, es extremadamente rígido:

* Opera bajo lógica `AND` estricta (el Nodo debe tener TODAS las etiquetas solicitadas).
* Solo permite buscar por igualdad exacta (no puedes decir "cualquier disco que NO sea hdd").
* Es una regla "dura": si ningún Nodo cumple con el `nodeSelector`, el Pod se quedará en estado `Pending` para siempre.

---

### Node Affinity: La evolución expresiva y flexible

Para resolver las limitaciones del `nodeSelector`, Kubernetes introdujo **Node Affinity** (Afinidad de Nodo). Este mecanismo utiliza selectores basados en conjuntos (operadores como `In`, `NotIn`, `Exists`, `DoesNotExist`, `Gt`, `Lt`) y, lo más importante, introduce el concepto de **reglas duras (requeridas)** y **reglas blandas (preferidas)**.

La sintaxis es más verbosa, pero infinitamente más potente. Se divide en dos categorías principales con nombres deliberadamente largos:

**1. requiredDuringSchedulingIgnoredDuringExecution (Regla Dura)**
Es el equivalente moderno y mejorado del `nodeSelector`. El Pod **no se programará** en un Nodo a menos que cumpla con la regla.

**2. preferredDuringSchedulingIgnoredDuringExecution (Regla Blanda)**
El planificador intentará buscar un Nodo que cumpla con la regla. Si encuentra varios, puedes asignarles un "peso" (`weight` del 1 al 100) para priorizarlos. Si no encuentra ninguno que cumpla la regla, no hay problema: el Pod se programará en otro Nodo disponible.

> **El significado de "IgnoredDuringExecution":** Esta frase larga que acompaña a ambas reglas es clave. Significa que si las etiquetas de un Nodo cambian *después* de que el Pod ya se está ejecutando en él, el Pod NO será expulsado. La regla solo se evalúa en el momento del "Scheduling" (la planificación inicial).

**Ejemplo de un Manifiesto de Nivel Senior:**
Imagina un microservicio que necesita procesamiento intensivo. *Debe* ejecutarse en Nodos con arquitectura ARM, y *preferiría* estar en la zona de disponibilidad `us-east-1a` (peso 80) o en la `us-east-1b` (peso 20).

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: processor
  template:
    metadata:
      labels:
        app: processor
    spec:
      affinity:
        nodeAffinity:
          # --- REGLA DURA ---
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - arm64
          # --- REGLA BLANDA ---
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            preference:
              matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1a
          - weight: 20
            preference:
              matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1b
      containers:
      - name: app
        image: my-processor:latest

```

---

### Node Anti-Affinity: La repulsión de Nodos

Un concepto que suele confundir en las certificaciones (como CKA o CKAD) es la "Anti-Afinidad de Nodo". A diferencia de los Pods (que tienen un campo específico `podAntiAffinity` que veremos en la sección 7.4), **no existe un campo `nodeAntiAffinity` en Kubernetes**.

Para lograr que un Pod evite ciertos Nodos, simplemente utilizamos **Node Affinity** combinándolo con operadores lógicos negativos como `NotIn` o `DoesNotExist`.

**Diagrama de Flujo del Kube-Scheduler para Node Affinity:**

```text
[Pod entrante con Node Affinity]
          |
          v
1. ¿Existen reglas 'required' (Duras)?
   ├── SÍ --> Filtra y descarta los Nodos que NO cumplen.
   |          (Si quedan 0 Nodos -> Pod queda en 'Pending').
   └── NO --> Pasa todos los Nodos al siguiente paso.
          |
          v
2. ¿Existen reglas 'preferred' (Blandas)?
   ├── SÍ --> Suma los "weights" (pesos) de las reglas que cada Nodo cumple.
   |          Ordena los Nodos de mayor a menor puntuación.
   └── NO --> Utiliza el algoritmo de puntuación estándar (recursos libres, etc.).
          |
          v
3. Asignación Final:
   [El Pod se despliega en el Nodo con la puntuación más alta]

```

---

### Resumen de Estrategias

Como arquitecto o ingeniero DevOps, debes elegir la herramienta adecuada según el nivel de estrictez requerido:

| Mecanismo | Flexibilidad | Operadores | Caso de Uso Principal |
| --- | --- | --- | --- |
| **NodeSelector** | Rígida (Obligatorio) | Solo `=` (Igualdad) | Asignaciones rápidas, simples y temporales. |
| **Node Affinity (Required)** | Rígida (Obligatorio) | `In`, `NotIn`, `Exists`... | Restricciones de hardware (Ej. *Este Pod REQUIERE GPU*). |
| **Node Affinity (Preferred)** | Blanda (Opcional) | `In`, `NotIn`, `Exists`... | Optimización topológica (Ej. *Prefiero estar en esta zona por latencia, pero si no se puede, arranca igual*). |

Con estas herramientas, garantizamos que las cargas de trabajo aterricen en el hardware correcto. En la siguiente sección, llevaremos este concepto a la interacción *entre aplicaciones*, asegurando que ciertos Pods se ejecuten juntos (o separados) utilizando Pod Affinity y Anti-Affinity.

## 7.4 Pod Affinity y Anti-Affinity: Distribución topológica y relación entre aplicaciones

En la sección anterior (7.3) aprendimos cómo usar `Node Affinity` para dictar en qué hardware o ubicación debe ejecutarse un Pod (relación **Pod -> Nodo**). Pero, ¿qué ocurre cuando la regla de ubicación no depende del hardware, sino de *otras aplicaciones* que ya se están ejecutando en el clúster?

Imagina dos escenarios críticos:

1. **Baja latencia (Atracción):** Tienes un microservicio web que consulta intensivamente una caché en memoria (Redis). Si el Pod web y el Pod de Redis se despliegan en Nodos ubicados en centros de datos diferentes, la latencia de red arruinará el rendimiento. Necesitas que se ejecuten "juntos".
2. **Alta Disponibilidad (Repulsión):** Tienes un `Deployment` con 3 réplicas de tu aplicación principal. Por azar, el planificador coloca las 3 réplicas en el mismo Nodo físico. Si ese Nodo falla, tu aplicación entera se cae, anulando el propósito de tener réplicas. Necesitas que se ejecuten "separados".

Para resolver esto, Kubernetes ofrece **Pod Affinity** (Afinidad de Pod) y **Pod Anti-Affinity** (Anti-Afinidad de Pod).

---

### El concepto clave: `topologyKey` (El Dominio Topológico)

Antes de escribir YAML, como ingeniero Senior debes entender perfectamente el campo `topologyKey`.

Cuando decimos que queremos que dos Pods se ejecuten "juntos" o "separados", la pregunta lógica del planificador es: *"¿Juntos en qué contexto?"*. ¿En el mismo servidor físico? ¿En el mismo rack? ¿En la misma zona de disponibilidad (AZ)? ¿En la misma región?

Ese contexto es el **Dominio Topológico**, y se define mediante el `topologyKey`, que no es más que el nombre de un Label presente en los Nodos.

* Si `topologyKey: kubernetes.io/hostname`: La regla aplica a nivel de **Nodo individual**.
* Si `topologyKey: topology.kubernetes.io/zone`: La regla aplica a nivel de **Zona de Disponibilidad** (agrupando múltiples Nodos que comparten ese label).

---

### Pod Affinity (Afinidad): Atrayendo cargas de trabajo

La afinidad de Pod le dice al `kube-scheduler`: *"Por favor, despliega este Pod en el mismo dominio topológico donde ya se esté ejecutando al menos un Pod que cumpla con este Label Selector"*.

Al igual que en la afinidad de nodos, contamos con reglas duras (`requiredDuringScheduling...`) y blandas (`preferredDuringScheduling...`).

**Caso de uso:** Acercar un backend a su base de datos.

### Pod Anti-Affinity (Anti-Afinidad): Repeliendo cargas de trabajo

La anti-afinidad le dice al planificador: *"Bajo ninguna circunstancia (o preferiblemente no) despliegues este Pod en el mismo dominio topológico donde ya exista un Pod con este Label Selector"*.

**Caso de uso principal:** Maximizar la Alta Disponibilidad (HA) dispersando las réplicas de un mismo `Deployment` (haciendo anti-afinidad consigo mismas).

---

### Ejemplo Completo de Nivel Arquitecto

El siguiente manifiesto ilustra un patrón avanzado muy común en producción. Es un `Deployment` de una aplicación web (`app: frontend`) que tiene dos reglas de programación simultáneas:

1. **Anti-Afinidad (Dura):** Ninguna réplica del frontend puede compartir el mismo Nodo (`hostname`) con otra réplica del frontend. (Garantiza que si un Nodo muere, solo perdamos una réplica).
2. **Afinidad (Blanda):** Preferiblemente, intenta colocar las réplicas del frontend en los mismos Nodos donde ya se esté ejecutando la caché (`app: redis`).

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-ha
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      affinity:
        # 1. REGLA DE REPULSIÓN (Alta Disponibilidad)
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - frontend
            topologyKey: "kubernetes.io/hostname" # Nivel de Nodo
        
        # 2. REGLA DE ATRACCIÓN (Rendimiento)
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - redis
              topologyKey: "kubernetes.io/hostname" # Nivel de Nodo
      containers:
      - name: web
        image: nginx:alpine

```

**Diagrama de Asignación Resultante:**

```text
 DOMINIO TOPOLÓGICO: kubernetes.io/hostname (Nivel Nodo)
 
 +------------------+   +------------------+   +------------------+
 |      NODO 1      |   |      NODO 2      |   |      NODO 3      |
 |------------------|   |------------------|   |------------------|
 |                  |   |                  |   |                  |
 |  [Pod: redis]    |   |                  |   |  [Pod: redis]    |
 |                  |   |                  |   |                  |
 |  [Pod: frontend] |   |  [Pod: frontend] |   |  [Pod: frontend] |
 |    (Réplica 1)   |   |    (Réplica 2)   |   |    (Réplica 3)   |
 +------------------+   +------------------+   +------------------+
          ^                      ^                      ^
          |                      |                      |
     Ideal: Cumple        Aceptable: No hay      Ideal: Cumple
     Anti-Afinidad y      Redis, pero cumple     Anti-Afinidad y
     Afinidad (Redis).    Anti-Afinidad.         Afinidad (Redis).

```

---

### Advertencia de Operaciones (Día 2): Impacto en el Rendimiento

El uso de `PodAffinity` y `PodAntiAffinity` conlleva un costo computacional significativo para el Plano de Control de Kubernetes.

A diferencia de `NodeAffinity` (donde el planificador solo compara las etiquetas del Pod entrante con las de los Nodos), en la afinidad de Pods, el `kube-scheduler` debe realizar un escaneo continuo cruzando las etiquetas del Pod entrante con las etiquetas de **todos los Pods existentes** en el clúster, agrupándolos dinámicamente por la topología solicitada.

En clústeres masivos (miles de Nodos y decenas de miles de Pods), abusar de reglas duras de afinidad de Pods puede ralentizar drásticamente la velocidad de programación (*scheduling throughput*).

> **Mejor Práctica:** Si tu objetivo único es dispersar réplicas para Alta Disponibilidad (como en el ejemplo anterior de Anti-Afinidad), es altamente recomendable utilizar la funcionalidad más moderna y eficiente llamada **Pod Topology Spread Constraints**, la cual abordaremos exactamente en la sección 7.6.

## 7.5 Taints y Tolerations: Repulsión y atracción de cargas

En la sección 7.3 analizamos `Node Affinity`, que funciona como un imán: **atrae** los Pods hacia Nodos específicos basándose en sus etiquetas. Sin embargo, ¿qué sucede si nuestro objetivo principal no es atraer, sino **repeler**?

Imagina que acabas de agregar al clúster un grupo de Nodos súper costosos equipados con GPUs de última generación para procesamiento de Inteligencia Artificial. Si solo usas etiquetas, el `kube-scheduler` podría, por error, desplegar en esos Nodos un Pod irrelevante (como un NGINX básico), desperdiciando recursos valiosos.

Necesitamos una forma de decirle al Nodo: *"No aceptes a ningún Pod, a menos que el Pod tenga un pase VIP explícito"*. Ese mecanismo de repulsión es el **Taint** (Mancha/Infección), y el pase VIP es la **Toleration** (Tolerancia).

---

### Taints: Protegiendo a los Nodos

Los **Taints** se aplican a los Nodos. Al "manchar" un Nodo, este automáticamente repelerá a todos los Pods que intenten programarse en él, a menos que demuestren que pueden tolerar dicha mancha.

Un Taint se compone de tres elementos fundamentales: `Clave=Valor:Efecto`.

Puedes aplicar un Taint mediante la línea de comandos:

```bash
kubectl taint nodes nodo-gpu-01 hardware=gpu:NoSchedule

```

**Los tres Efectos de un Taint:**

El `Efecto` define la agresividad con la que el Nodo rechazará a los Pods:

| Efecto | Comportamiento del Scheduler y del Kubelet | Nivel de Severidad |
| --- | --- | --- |
| **`NoSchedule`** | **Regla dura.** Ningún Pod nuevo será programado en este Nodo a menos que tenga la Toleration adecuada. Los Pods que *ya estaban* ejecutándose en el Nodo antes de aplicar el Taint no se verán afectados. | Alto |
| **`PreferNoSchedule`** | **Regla blanda.** El planificador *intentará* no colocar Pods en este Nodo, pero si el clúster está al límite de capacidad y no hay otro lugar, los dejará entrar. | Medio |
| **`NoExecute`** | **Evicción activa.** No solo impide que entren nuevos Pods, sino que **expulsa (evicts) inmediatamente** a los Pods que ya se estaban ejecutando en el Nodo si no tienen la Toleration. | Crítico |

> **Dato de Arquitectura:** ¿Te has preguntado por qué tus Pods de aplicación nunca aterrizan en los Nodos del Control Plane (Master nodes)? Es porque el proceso de inicialización (`kubeadm`) les inyecta automáticamente el taint `node-role.kubernetes.io/control-plane:NoSchedule`.

---

### Tolerations: El pase VIP de los Pods

Las **Tolerations** se configuran en el manifiesto del Pod. Si un Pod tiene una Toleration que coincide exactamente (o parcialmente, dependiendo del operador) con el Taint del Nodo, el planificador "ignora" la repulsión y evalúa el Nodo como un candidato válido.

**Reglas de coincidencia (Operadores):**
Existen dos operadores para las tolerancias:

1. **`Equal` (Por defecto):** La clave, el valor y el efecto del Pod deben coincidir exactamente con los del Nodo.
2. **`Exists`:** Solo exige que la clave y el efecto coincidan. El valor no importa (de hecho, se omite en el YAML). Es útil para tolerar múltiples taints bajo la misma clave.

**Ejemplo de un Manifiesto con Toleration:**
Este Pod está configurado para poder ingresar al Nodo con GPUs que "manchamos" anteriormente.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ia-model-processor
spec:
  containers:
  - name: tensorflow
    image: tensorflow/tensorflow:latest-gpu
  tolerations:
  - key: "hardware"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"

```

**Diagrama de Interacción (Taints vs. Tolerations):**

```text
       [ NODO MANCHADO ]
       Taint: hardware=gpu:NoSchedule
       ----------------------------------
              |
              | (Intenta programarse)
              v
+-----------------------+     +-----------------------+
|        POD 'A'        |     |        POD 'B'        |
|  (NGINX Frontend)     |     |  (IA Processor)       |
|                       |     |                       |
| Tolerations: Ninguna  |     | Tolerations:          |
|                       |     | - hardware=gpu        |
+-----------------------+     +-----------------------+
         RESULTADO                     RESULTADO
    [ X ] RECHAZADO               [ ✓ ] ACEPTADO
    (Queda en Pending             (Se despliega en 
    o busca otro Nodo)             el Nodo GPU)

```

---

### Patrones de Nivel Senior: Casos de Uso Avanzados

Para dominar verdaderamente el *Scheduling* en Kubernetes, debes comprender cómo combinar Taints y Tolerations con otras mecánicas, y cómo Kubernetes las usa internamente.

**1. El Patrón de "Nodos Dedicados" (Taints + Node Affinity)**
Este es el error más común de los ingenieros intermedios: *Creer que una Toleration atrae al Pod.* Tener una Toleration **no obliga** al Pod a ir a ese Nodo; solo le da permiso. Si aplicas la toleration al Pod de IA del ejemplo anterior, el `kube-scheduler` aún podría desplegarlo en un Nodo normal de CPU si hay espacio libre.

Para crear verdaderos **Nodos Dedicados** (donde los Pods ajenos no puedan entrar, y los Pods específicos ESTÉN OBLIGADOS a ir allí), debes combinar ambas herramientas:

* Aplica un **Taint** al Nodo (para repeler a los demás).
* Aplica una **Toleration** al Pod (para que pueda entrar).
* Aplica **Node Affinity** al Pod (para obligarlo a elegir ese Nodo y no otro).

**2. TolerationSeconds y Evicciones por estado del Nodo**
Kubernetes utiliza internamente Taints con el efecto `NoExecute` para gestionar fallos. Cuando el Kubelet detecta un problema grave (por ejemplo, el nodo pierde conexión de red), el Controlador de Nodos le aplica automáticamente un Taint como `node.kubernetes.io/network-unavailable:NoExecute`.

Por defecto, Kubernetes añade automáticamente a todos los Pods una toleración a fallos de red y fallos de nodo con un campo especial llamado `tolerationSeconds: 300` (5 minutos).
Esto significa: *"Si el nodo recibe el Taint de que está caído, el Pod lo tolerará durante 300 segundos. Si el problema no se resuelve en ese tiempo, el Pod será expulsado (evicted) y reprogramado en otro lugar"*.
Como administrador, puedes modificar este valor en el `Deployment` si tu aplicación requiere una reprogramación casi inmediata ante la caída de un servidor físico.

## 7.6 Pod Topology Spread Constraints: Distribución equitativa y alta disponibilidad real

En la sección 7.4 exploramos cómo la **Anti-Afinidad de Pods** nos ayuda a separar nuestras réplicas para evitar puntos únicos de fallo. Sin embargo, dejamos una advertencia pendiente: la anti-afinidad tradicional es, a menudo, demasiado rígida para escenarios del mundo real.

**El problema de la Anti-Afinidad:**
Imagina que tienes un clúster con 3 Nodos y quieres desplegar un `Deployment` con 10 réplicas de tu frontend.
Si utilizas una regla estricta de `podAntiAffinity` (nivel Nodo), Kubernetes colocará 1 réplica en el Nodo 1, 1 réplica en el Nodo 2, 1 réplica en el Nodo 3... y dejará las **7 réplicas restantes en estado `Pending**`. La regla prohíbe estrictamente que dos réplicas compartan un Nodo, lo que rompe el escalado de tu aplicación.

Lo que realmente queremos decirle a Kubernetes no es *"prohíbe que estén juntos"*, sino: ***"Distribuye estas 10 réplicas de la manera más uniforme posible entre los 3 Nodos"*** (es decir, 4 en el Nodo 1, 3 en el Nodo 2 y 3 en el Nodo 3).

Esa es exactamente la función de las **Pod Topology Spread Constraints** (Restricciones de propagación topológica de Pods). Es el estándar moderno y la herramienta definitiva de un ingeniero Senior para garantizar la Alta Disponibilidad (HA).

---

### Anatomía de una restricción de propagación

Para configurar esta distribución, debemos definir cuatro parámetros fundamentales dentro de la especificación de nuestro Pod:

* **`topologyKey`**: El dominio sobre el cual queremos distribuir. ¿Queremos distribuir uniformemente por Nodos (`kubernetes.io/hostname`) o por Zonas de Disponibilidad (`topology.kubernetes.io/zone`)?
* **`labelSelector`**: Le indica al planificador qué Pods debe "contar" para calcular la distribución. Habitualmente, seleccionas los mismos Labels de tu propia aplicación.
* **`maxSkew` (Desviación máxima)**: Es el grado de desequilibrio permitido. Define la diferencia máxima permitida en la cantidad de Pods entre el dominio topológico con más Pods y el que tiene menos. Debe ser un número entero mayor a cero (ej. `1`).
* **`whenUnsatisfiable`**: ¿Qué debe hacer Kubernetes si no puede cumplir con el `maxSkew`?
* `DoNotSchedule`: (Estricto) No despliega el nuevo Pod. Queda en `Pending`.
* `ScheduleAnyway`: (Flexible) Despliega el Pod de todos modos, intentando minimizar el desequilibrio, pero priorizando que la aplicación esté en línea.

---

### Ejemplo Práctico: Distribución Multi-Zona

Supongamos que operamos en AWS, GCP o Azure y tenemos Nodos repartidos en 3 Zonas de Disponibilidad (AZs). Queremos que las réplicas de nuestro `backend` se distribuyan uniformemente entre las zonas para sobrevivir a la caída de un centro de datos completo.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-spread
spec:
  replicas: 7
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: backend
      containers:
      - name: api
        image: my-backend-api:v2

```

**Análisis del comportamiento (Diagrama de Skew):**
Con 7 réplicas, 3 Zonas y un `maxSkew` de 1, el planificador evalúa la distribución constantemente:

```text
ESTADO IDEAL (7 Réplicas, 3 Zonas)
----------------------------------
Zona A: [Pod] [Pod] [Pod]  (Total: 3)
Zona B: [Pod] [Pod]        (Total: 2)
Zona C: [Pod] [Pod]        (Total: 2)

Cálculo del Skew (Desviación):
Máximo (Zona A = 3) - Mínimo (Zona B o C = 2) = 1. 
¿Es 1 <= maxSkew (1)? -> SÍ. ¡Distribución válida!

```

Si el escalador automático intentara agregar un 8º Pod, el `kube-scheduler` **jamás** lo pondría en la Zona A, porque eso crearía un desequilibrio de 2 (4 en Zona A, 2 en Zona B), violando el `maxSkew`. Lo colocará obligatoriamente en la Zona B o C.

---

### Patrones Avanzados (Nivel Arquitecto)

El verdadero poder de las `topologySpreadConstraints` radica en que **puedes anidar múltiples reglas**.

En un entorno de producción masivo, no solo te preocupa que se caiga una Zona entera, sino también que falle un Nodo individual dentro de esa Zona.

Puedes configurar una regla dual:

1. **Regla 1 (Nivel Zona):** Distribuye equitativamente entre las Zonas de Disponibilidad (`maxSkew: 1`, `whenUnsatisfiable: DoNotSchedule`).
2. **Regla 2 (Nivel Nodo):** Dentro de cada Zona, distribuye equitativamente entre los Nodos físicos (`maxSkew: 1`, `whenUnsatisfiable: ScheduleAnyway`). Nota que aquí usamos `ScheduleAnyway` (regla blanda) para que, si un Nodo está lleno, el Pod se despliegue de todas formas en otro Nodo de la misma Zona, priorizando tener la capacidad computacional disponible antes que una perfección topológica estricta a nivel de hardware.

> **Nota sobre el Cluster Autoscaler:** Es importante saber que las Topology Spread Constraints a veces pueden generar fricción con los autoscaladores de nodos tradicionales si usas reglas muy estrictas (`DoNotSchedule`). El autoscalador podría no saber en qué zona aprovisionar un nuevo nodo para resolver el estado `Pending`. Herramientas modernas como **Karpenter** (que veremos en el Capítulo 10) entienden estas restricciones de forma nativa e inyectan el hardware exacto en la zona correcta para satisfacer tu `maxSkew`.

Con esta herramienta, pasamos de usar "fuerza bruta" (Anti-Afinidad) a implementar una orquestación inteligente y equilibrada. Ahora que dominamos cómo y dónde desplegar nuestras cargas, en la próxima sección (7.7) estableceremos límites de gobernanza a nivel de `Namespace` para evitar que un equipo monopolice todos los recursos del clúster.

## 7.7 Resource Quotas y Limit Ranges por Namespace: Gobernanza en entornos Multi-Tenant

En la sección 7.2, aprendimos a configurar *Requests* y *Limits* a nivel de contenedor individual para controlar el consumo de CPU y Memoria. Sin embargo, en el mundo real (especialmente a nivel corporativo), un clúster de Kubernetes rara vez es utilizado por un solo desarrollador o una sola aplicación.

Lo habitual es operar en un modelo **Multi-Tenant** (multi-inquilino), donde diferentes equipos, proyectos o entornos (Dev, QA, Staging) comparten el mismo hardware físico mediante el aislamiento lógico que proporcionan los `Namespaces`.

Aquí surge un problema crítico de gobernanza: ¿Qué impide que un desarrollador junior despliegue por error un `Deployment` con 500 réplicas que consuma toda la capacidad del clúster, dejando sin recursos a los demás equipos? ¿Qué pasa si un equipo olvida definir los *Requests* y *Limits* en sus YAMLs, creando Pods `BestEffort` inestables?

Para resolver esto, Kubernetes nos ofrece dos herramientas fundamentales que actúan a nivel de Namespace: **LimitRange** (Gobernanza a nivel micro) y **ResourceQuota** (Gobernanza a nivel macro).

---

### LimitRange: Inyección de valores por defecto y límites individuales

Un objeto `LimitRange` se asegura de que cualquier Pod o Contenedor creado dentro de un Namespace cumpla con ciertas reglas de dimensionamiento individual. Se ejecuta en la fase de los *Admission Controllers* (específicamente el `LimitRanger`), interceptando el manifiesto antes de que llegue al `kube-scheduler`.

**Sus tres funciones principales son:**

1. **Imponer mínimos y máximos:** Evitar que un contenedor pida menos de "X" o más de "Y" recursos.
2. **Establecer valores por defecto (Defaulting):** Si un desarrollador envía un YAML sin bloque de `resources`, el `LimitRange` inyecta automáticamente Requests y Limits predeterminados. ¡Esta es la mejor defensa contra los Pods `BestEffort` accidentales!
3. **Controlar la proporción (Ratio):** Limitar la diferencia máxima entre un Request y un Limit (por ejemplo, prohibir que el Limit sea más del doble que el Request).

**Ejemplo de un Manifiesto LimitRange:**

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults-limites-memoria-cpu
  namespace: equipo-backend
spec:
  limits:
  - type: Container
    # El máximo absoluto que un contenedor puede pedir
    max:
      cpu: "1000m"
      memory: "1Gi"
    # El mínimo absoluto que un contenedor debe pedir
    min:
      cpu: "100m"
      memory: "128Mi"
    # Si el desarrollador olvida los LIMITS, se inyecta esto:
    default:
      cpu: "500m"
      memory: "512Mi"
    # Si el desarrollador olvida los REQUESTS, se inyecta esto:
    defaultRequest:
      cpu: "250m"
      memory: "256Mi"

```

---

### ResourceQuota: El presupuesto total del Namespace

Mientras que el `LimitRange` evalúa cada Pod de forma aislada, el **ResourceQuota** (o simplemente Quota) evalúa el Namespace en su totalidad. Actúa como un departamento de contabilidad que dice: *"Este Namespace tiene un presupuesto máximo mensual; si se agota, no se aprueban más gastos"*.

Un `ResourceQuota` puede limitar dos dimensiones principales:

1. **Recursos computacionales (Compute Quotas):** La suma total de CPU y Memoria (tanto en *Requests* como en *Limits*) de todos los Pods no terminales en el Namespace.
2. **Conteo de objetos (Object Quotas):** La cantidad máxima de recursos físicos o lógicos que se pueden crear (ej. máximo 10 `Pods`, máximo 5 `Services` tipo LoadBalancer, máximo 20 `PersistentVolumeClaims`).

**Ejemplo de un Manifiesto ResourceQuota:**

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cuota-computo-backend
  namespace: equipo-backend
spec:
  hard:
    # Límites agregados de recursos
    requests.cpu: "4"        # El Namespace no puede pedir más de 4 cores en total
    requests.memory: "8Gi"   # El Namespace no puede pedir más de 8Gi de RAM en total
    limits.cpu: "8"          # El techo máximo absoluto es de 8 cores
    limits.memory: "16Gi"    # El techo máximo absoluto es de 16Gi
    
    # Límites por conteo de objetos
    count/pods: "20"         # Máximo 20 Pods permitidos simultáneamente
    count/services: "5"      # Máximo 5 Services

```

---

### La Interacción (Nivel Senior): El "Catch-22" de las Cuotas

Aquí es donde muchos ingenieros fallan en su primera implementación de gobernanza. Existe una regla de oro en Kubernetes:

> **Si un Namespace tiene un `ResourceQuota` que limita recursos computacionales (`requests.cpu`, `limits.memory`, etc.), ENTONCES Kubernetes rechazará la creación de cualquier Pod que no tenga definidos explícitamente esos mismos *Requests* y *Limits*.**

Imagina este escenario:

1. Creas un `ResourceQuota` limitando la CPU a 10 cores.
2. Un desarrollador despliega un Pod sin configurar la sección de `resources`.
3. El clúster responde con un error frustrante: `Error creating: pods "mi-pod" is forbidden: failed quota: must specify limits.cpu`.

¿Por qué ocurre esto? Porque si el Pod no especifica cuánto va a consumir (BestEffort), la contabilidad de la Cuota no puede predecir si ese Pod hará que el Namespace exceda su límite. Ante la duda, lo bloquea.

**La Solución Arquitectónica:**
Siempre que despliegues un `ResourceQuota`, **debes** acompañarlo de un `LimitRange`.

**Diagrama de Flujo del Admission Controller:**

```text
 [ YAML del Desarrollador (Sin resources) ]
                   |
                   v
 +---------------------------------------------------+
 | 1. LIMITRANGER (Admission Controller)             |
 | - Detecta que faltan requests/limits.             |
 | - Inyecta los valores 'default' y 'defaultRequest'|
 |   (Ej. Req: 250m, Lim: 500m)                      |
 +---------------------------------------------------+
                   |
                   | (YAML Mutado y completado)
                   v
 +---------------------------------------------------+
 | 2. RESOURCE QUOTA (Admission Controller)          |
 | - Suma los 250m del nuevo Pod al total actual.    |
 | - ¿Supera el límite estricto (hard) del Namespace?|
 |    ├── SÍ -> RECHAZA el despliegue (Forbidden).   |
 |    └── NO -> APRUEBA el despliegue.               |
 +---------------------------------------------------+
                   |
                   v
           [ KUBE-SCHEDULER ]

```

De esta manera, la experiencia del desarrollador es fluida (su Pod se despliega con recursos seguros por defecto) y la seguridad del clúster se mantiene intacta (la Cuota garantiza que el Namespace no devorará todo el hardware).

---

## Cierre del Capítulo 7

A lo largo de este capítulo, hemos transformado nuestra forma de interactuar con el clúster. Pasamos de simplemente "correr contenedores" a tener un control granular y absoluto sobre su ciclo de vida y ubicación.

Hemos utilizado **Labels y Selectors** para organizar la arquitectura, **Requests y Limits** para domar el consumo de hardware, herramientas topológicas (**Affinity, Taints, Spread Constraints**) para dictar en qué servidores físicos y zonas exactas aterrizará cada pieza de software, y finalmente **Quotas** para gobernar el acceso.

Tu clúster ahora es altamente disponible, equilibrado y resistente al problema del "vecino ruidoso". Con la infraestructura bajo control, estamos listos para abordar el aspecto más crítico y delicado de cualquier entorno de producción. En el **Capítulo 8: Seguridad y Gobernanza**, aprenderemos a bloquear el clúster, gestionar identidades, roles (RBAC) y auditar todo lo que ocurre dentro de Kubernetes.
