Asegurar un clúster de Kubernetes exige una estrategia de **defensa en profundidad**. En este capítulo, exploraremos cómo el **API Server** actúa como guardián mediante la **Autenticación (OIDC/Certificados)** y la **Autorización (RBAC)**, garantizando que solo sujetos legítimos operen en el sistema.

Aprenderás a gestionar identidades para aplicaciones con **Service Accounts** y a blindar la ejecución de procesos mediante **Security Contexts**. Finalmente, implementaremos gobernanza automatizada con **Pod Security Admissions** y motores de **Políticas como Código (Kyverno/OPA)** para asegurar el cumplimiento normativo a escala.

## 8.1 Autenticación (OIDC, Certificados) y Autorización

Para entender cómo Kubernetes protege sus recursos, primero debemos comprender cómo procesa el *API Server* cada petición. Cada vez que ejecutas un comando con `kubectl` o un microservicio intenta comunicarse con la API de Kubernetes, la solicitud HTTP pasa por una canalización de seguridad estricta antes de ser escrita en `etcd`.

Este flujo se divide en tres etapas fundamentales. En esta sección nos centraremos en las dos primeras:

```text
+-----------------+      +--------------------------------+      +-------------------------------+      +-------------------------+      +--------+
| Petición HTTP   | ---> | 1. Autenticación (Authn)       | ---> | 2. Autorización (Authz)       | ---> | 3. Control de Admisión  | ---> |  etcd  |
| (Ej. crear Pod) |      |    ¿Quién eres?                |      |    ¿Tienes permiso para esto? |      |    ¿El objeto es válido?|      |        |
+-----------------+      +--------------------------------+      +-------------------------------+      +-------------------------+      +--------+

```

---

### 1. Autenticación (Authn): ¿Quién eres?

A diferencia de otros sistemas, **Kubernetes no tiene un objeto `User` o `Group` nativo** en su base de datos. No puedes hacer un `kubectl get users`. Kubernetes delega la gestión de identidades a sistemas externos.

El clúster reconoce dos tipos principales de usuarios:

1. **Usuarios humanos (Normal Users):** Administradores, desarrolladores o ingenieros DevOps. Son gestionados por servicios externos (Directorios Activos, proveedores en la nube, PKI).
2. **Cuentas de Servicio (Service Accounts):** Entidades gestionadas por Kubernetes utilizadas por los Pods para hablar con el API Server (profundizaremos en ellas en la sección 8.3).

Para validar a los usuarios humanos, el API Server soporta múltiples módulos de autenticación, pero en un entorno de producción (nivel Senior), las dos estrategias predominantes son los **Certificados X.509** y **OIDC**.

#### Autenticación mediante Certificados X.509

Es el método predeterminado que utiliza Kubernetes internamente y el que configuran herramientas como `kubeadm` o `kops` para el usuario administrador inicial.

Cuando el API Server recibe una petición con un certificado de cliente X.509, valida que esté firmado por la Autoridad Certificadora (CA) del clúster. Si es válido, extrae la identidad del usuario directamente de los campos del certificado:

* **Common Name (CN):** Se interpreta como el nombre de usuario (ej. `CN=juan.perez`).
* **Organization (O):** Se interpreta como la pertenencia a un grupo (ej. `O=devs`, `O=system:masters`).

*Ejemplo de solicitud de firmado de certificado (CSR) usando OpenSSL para un desarrollador:*

```bash
openssl req -new -key juan.key -out juan.csr -subj "/CN=juan.perez/O=devs/O=frontend"

```

*Nota de seguridad:* El grupo `system:masters` en Kubernetes es un grupo "hardcodeado" que tiene acceso absoluto al clúster (bypass de cualquier regla de autorización). Las credenciales atadas a este grupo deben resguardarse celosamente.

#### OpenID Connect (OIDC)

A medida que las organizaciones crecen, gestionar certificados individuales se vuelve insostenible (no existe un mecanismo nativo para revocar un certificado X.509 en Kubernetes; si se compromete, hay que rotar la CA o esperar a que expire).

Aquí entra **OIDC**, el estándar de la industria apoyado sobre OAuth2. Permite delegar la autenticación a un Proveedor de Identidad (IdP) externo como Azure AD, Google Workspace, Okta o Keycloak.

**El flujo OIDC en Kubernetes funciona así:**

1. El usuario se autentica contra el IdP (por ejemplo, introduciendo sus credenciales y pasando por un MFA/2FA).
2. El IdP devuelve un **ID Token** (un JSON Web Token o JWT).
3. El usuario (a través de `kubectl`) envía este JWT como un *Bearer Token* en la cabecera de la petición HTTP al API Server.
4. El API Server verifica la firma criptográfica del JWT comprobando las claves públicas del IdP (no necesita comunicarse con el IdP en cada petición).
5. Si es válido, el API Server extrae el usuario y los grupos de los *claims* del token.

Para que esto funcione, el API Server debe arrancarse con configuraciones específicas que le indiquen en quién confiar:

```yaml
# Fragmento de configuración del kube-apiserver
--oidc-issuer-url=https://dex.midominio.com
--oidc-client-id=kubernetes
--oidc-username-claim=email
--oidc-groups-claim=groups

```

#### Otros métodos de autenticación

Aunque menos comunes en producción moderna, Kubernetes también soporta *Static Token Files* (inseguro y obsoleto), *Authenticating Proxy* (delegar la validación a un proxy inverso) y *Webhook Token Authentication* (consultar a un servicio externo si un token Bearer es válido).

---

### 2. Autorización (Authz): ¿Puedes hacer esto?

Una vez que el API Server sabe quién eres (y a qué grupos perteneces), el siguiente paso es la autorización.

Cada petición HTTP a la API se descompone en atributos que el sistema de autorización evalúa:

* **Usuario y Grupos:** Extraídos en la fase de autenticación.
* **Verbo API:** La acción que se quiere realizar (ej. `get`, `list`, `create`, `update`, `patch`, `delete`).
* **Recurso:** El objeto sobre el que se actúa (ej. `pods`, `deployments`, `services`).
* **Namespace:** El espacio de nombres donde reside el objeto (si aplica).

Kubernetes permite configurar múltiples módulos de autorización simultáneamente mediante el flag `--authorization-mode` en el API Server (por ejemplo: `--authorization-mode=Node,RBAC`). Las peticiones se evalúan en cadena; si un módulo la aprueba, se concede el acceso inmediatamente (política de *fail-closed* y *allow-first*).

Los modos de autorización más relevantes son:

1. **Node Authorization:** Es un módulo de propósito especial diseñado exclusivamente para los `kubelets`. Restringe los permisos de un `kubelet` para que solo pueda leer servicios, endpoints o nodos, y modificar *solo* los Pods que están programados en su propio nodo. Esto es crucial: si un atacante compromete un Worker Node, el daño queda contenido (no puede modificar Pods de otros nodos).
2. **ABAC (Attribute-Based Access Control):** Basado en políticas escritas en archivos JSON que el API Server lee al arrancar. Es rígido, difícil de mantener en entornos dinámicos y requiere reiniciar el API Server para aplicar cambios. Actualmente se considera un enfoque legacy.
3. **Webhook:** Permite delegar la decisión de autorización a un servicio REST externo. Es útil si tu organización tiene un motor centralizado de políticas de seguridad empresarial (ej. integraciones con sistemas externos de IAM).
4. **RBAC (Role-Based Access Control):** Es el **estándar absoluto** de la industria y el modo por defecto en casi cualquier clúster moderno. Permite gestionar políticas de forma declarativa utilizando objetos nativos de Kubernetes (Roles y Bindings) sin necesidad de reiniciar servicios.

Dado que RBAC es la piedra angular del modelo de seguridad operativo en Kubernetes, su arquitectura, buenas prácticas y configuración se detallarán a profundidad en la siguiente sección (8.2).

## 8.2 Control de Acceso Basado en Roles (RBAC): Roles, ClusterRoles y Bindings

Una vez que el API Server ha autenticado a un usuario o aplicación (como vimos en la sección 8.1), necesita determinar si tiene los privilegios necesarios para ejecutar la acción solicitada. Aquí es donde brilla el **Control de Acceso Basado en Roles (RBAC)**.

RBAC es el motor de autorización estándar en Kubernetes. Su filosofía es completamente declarativa: defines "qué se puede hacer" y "quién puede hacerlo" utilizando manifiestos YAML, sin necesidad de reiniciar el clúster ni modificar configuraciones estáticas.

Para dominar RBAC, debes entender la relación entre tres elementos fundamentales:

1. **Sujeto (Subject):** *¿Quién* solicita el acceso? (Usuario, Grupo o Service Account).
2. **Rol (Role / ClusterRole):** *¿Qué* acciones están permitidas? (El conjunto de reglas/permisos).
3. **Vínculo (Binding):** El puente que une al Sujeto con el Rol.

A continuación, un diagrama conceptual de cómo se relacionan:

```text
  ¿Quién?                                El Puente                               ¿Qué puede hacer?
+---------+                          +---------------+                         +-------------------+
| Subject | <====== (Asigna) ======= |    Binding    | ======= (Apunta) =====> |       Role        |
| (User)  |                          | (RoleBinding) |                         | (Reglas/Permisos) |
+---------+                          +---------------+                         +-------------------+

```

---

### 1. Definiendo Permisos: Roles y ClusterRoles

En Kubernetes, los permisos son siempre **aditivos**. No existen reglas de denegación (Deny) explícitas. Si un permiso no está concedido explícitamente, la acción se bloquea por defecto.

Los permisos se agrupan en dos tipos de objetos, dependiendo de su alcance (scope):

#### Role (Alcance de Namespace)

Un `Role` define un conjunto de permisos que solo aplican dentro de un **Namespace específico**.

*Ejemplo: Un `Role` que permite leer (get, watch, list) Pods únicamente en el namespace `frontend`.*

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: frontend
  name: pod-reader
rules:
- apiGroups: [""] # El grupo API vacío indica el "Core" API (Pods, Services, etc.)
  resources: ["pods", "pods/log"]
  verbs: ["get", "watch", "list"]

```

#### ClusterRole (Alcance Global del Clúster)

Un `ClusterRole` define permisos que aplican a **todo el clúster**. Es necesario para:

1. Recursos que no pertenecen a ningún namespace (como `Nodes` o `PersistentVolumes`).
2. Endpoints que no son recursos (como `/healthz`).
3. Permitir el acceso a un recurso a lo largo de *todos* los namespaces (ej. un administrador que necesita listar Pods en todo el clúster).

*Ejemplo: Un `ClusterRole` para un sistema de monitoreo que necesita listar nodos y servicios globalmente.*

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-global-reader
rules:
- apiGroups: [""]
  resources: ["nodes", "services"]
  verbs: ["get", "list", "watch"]

```

---

### 2. Asignando Permisos: RoleBindings y ClusterRoleBindings

Tener un Rol creado no sirve de nada si no se lo asignamos a un Sujeto. Esto se logra mediante los **Bindings**.

#### RoleBinding

Aplica los permisos de un Rol a un Sujeto **dentro de un Namespace específico**.

*Ejemplo: Asignar el `Role` "pod-reader" al usuario "carlos" en el namespace "frontend".*

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods-carlos
  namespace: frontend
subjects:
- kind: User
  name: "carlos"       # Este nombre debe coincidir con el CN del certificado o el claim de OIDC
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader     # Apunta al Role creado anteriormente
  apiGroup: rbac.authorization.k8s.io

```

#### ClusterRoleBinding

Aplica los permisos de un `ClusterRole` a un Sujeto **en todo el clúster**. Esto otorga un acceso muy amplio y debe usarse con extrema precaución.

*Ejemplo: Darle permisos globales del `ClusterRole` "monitoring-global-reader" al grupo "sre-team".*

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sre-monitoring-binding
subjects:
- kind: Group
  name: "sre-team"
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: monitoring-global-reader
  apiGroup: rbac.authorization.k8s.io

```

---

### 3. El Patrón Senior: Reutilización de ClusterRoles con RoleBindings

Una de las técnicas más útiles (y que a menudo confunde a los principiantes) es la capacidad de **usar un `RoleBinding` (local) para apuntar a un `ClusterRole` (global)**.

Imagina que tienes 50 namespaces y quieres que los líderes técnicos tengan permisos de `admin` en sus respectivos namespaces. En lugar de crear 50 `Roles` idénticos (uno por namespace) y 50 `RoleBindings`, puedes usar el `ClusterRole` nativo llamado `admin`.

Si creas un `RoleBinding` en el namespace `backend` que apunta al `ClusterRole` `admin`, el usuario solo tendrá privilegios de administrador **dentro del namespace `backend**`. El `RoleBinding` "encapsula" el poder global del `ClusterRole` y lo limita al namespace donde se creó el Binding.

Esta práctica centraliza la gestión de reglas y evita la duplicación masiva de código YAML.

---

### 4. Mejores Prácticas Operativas (Día 2)

Para mantener la seguridad y gobernanza a escala, aplica estas reglas:

* **Principio de Menor Privilegio (PoLP):** Otorga solo los verbos y recursos estrictamente necesarios.
* **Evita el uso de comodines (`*`):** Un bloque como `resources: ["*"]` y `verbs: ["*"]` es una puerta trasera masiva. Si un atacante compromete a ese sujeto, compromete el clúster. Sé explícito en tu YAML.
* **Cuidado con el verbo `escalate` o `bind`:** Permiten a un usuario crear roles o modificar bindings, dándole la capacidad de escalar sus propios privilegios (escalación de privilegios).
* **Usa `kubectl auth can-i`:** Como ingeniero DevOps, no necesitas adivinar si una política RBAC funcionó. Puedes suplantar temporalmente a un usuario para probar sus permisos:

```bash
# ¿Puede carlos borrar pods en el namespace frontend?
kubectl auth can-i delete pods --namespace frontend --as carlos

```

Con las reglas de RBAC establecidas para usuarios humanos, el siguiente paso lógico es abordar cómo las aplicaciones (Pods) dentro del clúster se autentican frente a la API, lo cual exploraremos en la siguiente sección mediante las **Service Accounts**.

## 8.3 Service Accounts: Identidad para las aplicaciones

En las secciones anteriores aprendimos cómo se identifican los humanos y cómo se definen sus permisos. Sin embargo, en Kubernetes, los usuarios no son los únicos que necesitan hablar con el *API Server*. Muchas aplicaciones que corren dentro de los Pods (como un Ingress Controller, un sistema de CI/CD, o un microservicio que necesita listar otros Pods) también necesitan una identidad.

Esa identidad "no humana" es la **Service Account (SA)**.

---

### 1. Diferencia entre User Account y Service Account

Es vital entender por qué Kubernetes separa estas dos entidades:

* **User Accounts (Cuentas de Usuario):** Están pensadas para humanos. Son globales al clúster (no pertenecen a un namespace) y se gestionan externamente (como vimos con OIDC o Certificados).
* **Service Accounts (Cuentas de Servicio):** Están pensadas para procesos que corren en Pods. Son objetos nativos de Kubernetes y **pertenecen a un Namespace específico**. Se crean y gestionan mediante la API de Kubernetes.

### 2. El funcionamiento interno: El Token de Identidad

Cuando creas un Namespace, Kubernetes crea automáticamente una Service Account llamada `default`. Si no especificas ninguna cuenta en el manifiesto de tu Pod, Kubernetes le asignará esta cuenta predeterminada.

Cuando un Pod tiene asignada una Service Account, el proceso ocurre así:

1. Kubernetes genera un **Token** (un JWT) para esa cuenta.
2. El volumen `serviceaccount` se monta automáticamente en el contenedor en la ruta:
`/var/run/secrets/kubernetes.io/serviceaccount/`
3. Dentro de esa carpeta, el Pod encuentra tres archivos clave:

* `token`: El JWT para autenticarse.
* `ca.crt`: El certificado para verificar que el API Server es legítimo.
* `namespace`: Un archivo de texto con el nombre del namespace actual.

Cualquier SDK de Kubernetes (Go, Python, Java) o la propia herramienta `kubectl` buscarán automáticamente estos archivos para autenticar las peticiones contra la API.

---

### 3. Implementación: Creación y Uso

Para seguir el principio de menor privilegio, **nunca** debes darle permisos extra a la cuenta `default`. En su lugar, crea una cuenta específica para tu aplicación.

**Paso 1: Crear la Service Account**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-explorer
  namespace: produccion

```

**Paso 2: Vincularla con RBAC (RoleBinding)**
*(Aquí conectamos con lo aprendido en la sección 8.2)*

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-explorer-binding
  namespace: produccion
subjects:
- kind: ServiceAccount
  name: api-explorer # Nombre de la SA
  namespace: produccion
roleRef:
  kind: Role
  name: pod-reader # Un rol previamente definido
  apiGroup: rbac.authorization.k8s.io

```

**Paso 3: Asignarla al Pod**
En la especificación del Pod (`spec`), definimos `serviceAccountName`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-microservicio
spec:
  serviceAccountName: api-explorer # Asignación de identidad
  containers:
  - name: app
    image: my-app:1.0

```

---

### 4. Consideraciones de Seguridad (Nivel Senior)

Como ingeniero DevOps, debes conocer los riesgos asociados a las identidades automáticas:

1. **Desactivar el Automount:** Por defecto, Kubernetes monta el token en *todos* los Pods. Si tu aplicación no necesita hablar con la API (la mayoría no lo necesita), es una vulnerabilidad tener un token ahí. Desactívalo:

```yaml
spec:
  automountServiceAccountToken: false

```

1. **Bound Service Account Tokens:** Antiguamente, los tokens de las SA no expiraban. En versiones modernas de Kubernetes, los tokens están "atados" (bound) al ciclo de vida del Pod y tienen un tiempo de expiración (proyectados mediante el volumen `serviceAccountToken`). Esto reduce el impacto si un token es robado.
2. **Auditoría:** Siempre que revises logs de auditoría, busca el campo `user.username`. Para una Service Account, verás el formato:
`system:serviceaccount:<namespace>:<nombre-sa>`

## 8.4 Security Contexts (Privilegios, capacidades de Linux, runAsUser)

Hasta ahora hemos visto cómo proteger el *API Server* de Kubernetes mediante autenticación, RBAC y Service Accounts. Pero, ¿qué ocurre si un atacante logra explotar una vulnerabilidad en el código de tu aplicación y obtiene ejecución remota de comandos (RCE) dentro del contenedor?

Aquí es donde entra el **Security Context**. Mientras que RBAC protege el plano de control, el Security Context es la última línea de defensa que protege al **Nodo de Trabajo (Worker Node)** y a otros *tenants* del clúster. Define los privilegios y el control de acceso a nivel del sistema operativo subyacente (Linux) para un Pod o un contenedor específico.

---

### 1. Ámbito de aplicación: Pod vs. Contenedor

Las configuraciones de seguridad se pueden aplicar en dos niveles dentro del manifiesto YAML. Si hay un conflicto entre ambos, **la configuración a nivel de contenedor tiene prioridad** sobre la del Pod.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-demo
spec:
  securityContext:
    # 1. Nivel de Pod (Aplica a todos los contenedores y volúmenes)
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: app
    image: my-app:1.0
    securityContext:
      # 2. Nivel de Contenedor (Sobrescribe las reglas del Pod si hay conflicto)
      runAsUser: 2000
      allowPrivilegeEscalation: false

```

---

### 2. Configuraciones Críticas de Seguridad

Un ingeniero Senior no despliega contenedores como `root`. Por defecto, Docker y containerd ejecutan los procesos como el usuario `root` (UID 0) dentro del contenedor. Si ocurre una fuga del contenedor (*container breakout*), el atacante será `root` en el nodo anfitrión.

Para mitigar esto, utilizamos las siguientes directivas:

#### A. Identidad del Proceso (`runAsUser`, `runAsGroup`, `runAsNonRoot`)

Fuerza a la aplicación a ejecutarse con un ID de usuario o grupo específico sin privilegios.

* `runAsNonRoot: true`: Es una validación estricta de Kubernetes. Si el contenedor intenta arrancar como UID 0, el Kubelet lo bloqueará y el Pod fallará con el error `CreateContainerConfigError`.
* `runAsUser: 1000`: Obliga al proceso a ejecutarse con el UID 1000.

#### B. Protección del Sistema de Archivos (`readOnlyRootFilesystem`)

Gran parte de los ataques de malware implican descargar *scripts* maliciosos o modificar binarios del sistema (como sobrescribir `/bin/bash`).

* `readOnlyRootFilesystem: true`: Monta el sistema de archivos principal del contenedor como solo lectura. Si tu aplicación necesita escribir logs o archivos temporales, debes montar un volumen efímero (`emptyDir`) específicamente en esas rutas (ej. `/tmp` o `/var/log`).

#### C. Bloqueo de Escalada de Privilegios (`allowPrivilegeEscalation`)

En Linux, un proceso hijo puede obtener más privilegios que su proceso padre (por ejemplo, mediante binarios con el bit SUID o SGID activado, como el comando `sudo`).

* `allowPrivilegeEscalation: false`: Garantiza que ningún proceso dentro del contenedor pueda ganar más privilegios que los que tenía al arrancar.

---

### 3. Capabilities de Linux (Capacidades)

En el kernel de Linux tradicional, el usuario `root` es todopoderoso. Las **Linux Capabilities** dividen ese poder monolítico de `root` en piezas más pequeñas y granulares. Por ejemplo, en lugar de ser `root` para cambiar la configuración de red, solo necesitas la capacidad `CAP_NET_ADMIN`.

Por defecto, los *container runtimes* otorgan a los contenedores un conjunto reducido de capacidades (alrededor de 14). Sin embargo, la mejor práctica en un entorno *Zero Trust* es **eliminar todas las capacidades y añadir solo las estrictamente necesarias**.

```yaml
    securityContext:
      capabilities:
        drop:
          - ALL           # 1. Eliminamos todo (Postura de negación por defecto)
        add:
          - NET_BIND_SERVICE # 2. Añadimos solo la capacidad de usar puertos < 1024

```

*Nota: En Kubernetes se omite el prefijo `CAP_` al declarar capacidades.*

---

### 4. El Peligro del Modo Privilegiado (`privileged: true`)

El parámetro `privileged: true` le dice al *container runtime* que deshabilite casi todas las protecciones de aislamiento. Un contenedor privilegiado:

* Obtiene todas las capacidades de Linux.
* Tiene acceso directo a todos los dispositivos del host (puede ver y montar discos físicos ubicados en `/dev`).
* Puede eludir las restricciones de cgroups y AppArmor/SELinux.

**¿Cuándo se usa?** Casi nunca para cargas de trabajo estándar. Solo es aceptable para componentes del sistema (como un plugin CNI de red, un agente de monitoreo de bajo nivel, o herramientas como *Docker-in-Docker*), e idealmente se ejecutan como DaemonSets.

---

### 5. Manifiesto Reforzado: El Estándar de Producción

Para consolidar estos conceptos, aquí tienes la anatomía de un `securityContext` considerado altamente seguro para un microservicio web tradicional en producción:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-microservice
spec:
  template:
    spec:
      securityContext:
        runAsUser: 10000
        runAsGroup: 10000
        runAsNonRoot: true
        fsGroup: 10000
      containers:
      - name: app
        image: my-company/app:v1.2
        securityContext:
          privileged: false
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL

```

Configurar esto manualmente para cada Deployment es propenso a errores humanos. Para garantizar que todos los equipos de desarrollo cumplan con estas reglas antes de desplegar en el clúster, Kubernetes nos proporciona mecanismos de validación automatizados, los cuales exploraremos en la siguiente sección: **8.5 Pod Security Standards (PSS) y Pod Security Admissions**.

## 8.5 Pod Security Standards (PSS) y Pod Security Admissions

En la sección anterior aprendimos cómo blindar un Pod a nivel de sistema operativo utilizando el `securityContext`. Sin embargo, a escala empresarial, depender de que cada desarrollador o equipo recuerde configurar correctamente estas directivas en sus manifiestos YAML es una receta para el desastre. Necesitamos **gobernanza automatizada**.

Históricamente, Kubernetes resolvía esto mediante un recurso llamado *PodSecurityPolicies (PSP)*. Como ingeniero Senior, debes saber que las PSPs eran notoriamente complejas, difíciles de depurar y propensas a romper clústeres enteros, por lo que fueron **deprecadas en Kubernetes v1.21 y eliminadas definitivamente en la v1.25**.

Su reemplazo oficial es un sistema mucho más elegante, predecible y nativo: el dúo formado por los **Pod Security Standards (PSS)** y el controlador **Pod Security Admission (PSA)**.

---

### 1. Pod Security Standards (PSS): Los Perfiles de Seguridad

En lugar de obligarte a escribir políticas personalizadas desde cero, Kubernetes define tres "perfiles" estándar (PSS) mantenidos por la comunidad. Estos perfiles dictan qué campos del `securityContext` están permitidos y cuáles no:

| Perfil | Nivel de Restricción | Caso de Uso Ideal | Ejemplos de lo que prohíbe |
| --- | --- | --- | --- |
| **Privileged** | **Nulo** (Abierto) | Componentes core del clúster (CNI, CSI, kube-proxy, agentes de monitoreo de bajo nivel). | Nada. Permite escalada de privilegios, acceso al host, etc. |
| **Baseline** | **Moderado** | Aplicaciones empresariales estándar y cargas de trabajo legacy que necesitan flexibilidad pero sin ser peligrosas. | `privileged: true`, montajes de `hostPath`, compartir la red del host (`hostNetwork`). |
| **Restricted** | **Estricto** | Microservicios modernos, entornos *Zero Trust* e infraestructura crítica de alta seguridad. | Requiere `runAsNonRoot: true`, obliga a descartar todas las *capabilities* (`drop: ["ALL"]`), exige `allowPrivilegeEscalation: false`. |

---

### 2. Pod Security Admission (PSA): El Motor de Ejecución

Los perfiles PSS son solo un documento de estándares; no hacen nada por sí solos. Para hacerlos cumplir, Kubernetes incluye un controlador de admisión integrado (Admission Controller) llamado **Pod Security Admission (PSA)**.

El PSA evalúa las peticiones de creación o modificación de Pods en la última fase del API Server (Control de Admisión, como vimos en la sección 8.1). Su diseño es brillante por su simplicidad: **se configura exclusivamente a través de las *Labels* (etiquetas) del Namespace**.

El controlador opera bajo tres modos distintos:

1. **Enforce (Forzar):** Si el Pod viola el estándar PSS, la petición es rechazada (HTTP 403) y el Pod no se crea.
2. **Audit (Auditar):** Si el Pod viola el estándar, se permite su creación, pero se registra una alerta en los *Audit Logs* del API Server. Útil para que los equipos de seguridad investiguen a posteriori.
3. **Warn (Advertir):** Si el Pod viola el estándar, se permite su creación, pero se le devuelve un mensaje de advertencia (Warning) al usuario en su terminal de `kubectl`.

**Diagrama de flujo del Controlador de Admisión (PSA):**

```text
+-------------------+      +-------------------------+      +---------------------------+
| kubectl apply     |      | API Server              |      | Pod Security Admission    |
| (Pod Inseguro)    | ---> | 1. Autenticación (OK)   | ---> | Evalúa Labels del         |
+-------------------+      | 2. Autorización (OK)    |      | Namespace destino         |
                           +-------------------------+      +---------------------------+
                                                                         |
                                    +------------------------------------+------------------------------------+
                                    |                                    |                                    |
                          [Label: enforce]                     [Label: audit]                       [Label: warn]
                                    |                                    |                                    |
                           Bloquea la creación                 Permite creación pero                Permite creación pero
                           (Error 403 Forbidden)               escribe en Audit Log                 muestra Warning al CLI

```

---

### 3. Implementación: Configurando las Labels en el Namespace

Para activar esta protección, simplemente editamos el Namespace. La sintaxis de las etiquetas sigue el formato:

`pod-security.kubernetes.io/<modo>: <perfil>`

Además, Kubernetes requiere que fijes una versión de la API para garantizar que las políticas no se vuelvan más estrictas sorpresivamente tras actualizar el clúster (puedes usar `v1.28`, `v1.29`, o `latest`).

*Ejemplo de un Namespace de Producción altamente seguro:*

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: produccion-financiera
  labels:
    # 1. Bloqueamos cualquier pod que no cumpla el estándar RESTRICTED
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    
    # 2. (Opcional) Podemos añadir alertas. Si usamos un modo estricto en 'enforce', 
    # estas líneas son redundantes, pero son útiles si 'enforce' estuviera en 'baseline'.
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest

```

Si un desarrollador intenta desplegar el siguiente Pod (inseguro por ejecutarse como root) en este Namespace:

```yaml
# pod-inseguro.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-inseguro
  namespace: produccion-financiera
spec:
  containers:
  - name: nginx
    image: nginx:latest # Nginx por defecto corre como root

```

La respuesta inmediata del clúster será:

```bash
$ kubectl apply -f pod-inseguro.yaml
Error from server (Forbidden): error when creating "pod-inseguro.yaml": pods "nginx-inseguro" is forbidden: violates PodSecurity "restricted:latest": allowPrivilegeEscalation != false, unrestricted capabilities, runAsNonRoot != true...

```

---

### 4. Estrategia Operativa (Día 2): Cómo migrar sin romper nada

La transición de clústeres no seguros a clústeres con PSS/PSA es una de las tareas más críticas de un Arquitecto DevOps. **Nunca actives el modo `enforce: restricted` en un clúster existente de golpe.**

La estrategia "Senior" para un despliegue seguro (Rollout) es la siguiente:

1. **Fase de Descubrimiento:** Aplica las etiquetas `audit: restricted` y `warn: restricted` en todos los namespaces (excepto `kube-system`, que siempre debe ser `privileged`).

```bash
kubectl label --overwrite ns --all \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted

```

1. **Recolección de Datos:** Deja que los equipos desplieguen normalmente durante unas semanas. Monitorea los *Audit Logs* (usando herramientas como ElasticSearch, Loki o Datadog) para identificar qué aplicaciones están violando las reglas en silencio.
2. **Remediación:** Trabaja con los equipos de desarrollo para ajustar sus `securityContext` basándote en los logs recopilados (cerrando la brecha entre su código y el perfil `restricted` o `baseline`).
3. **Fase de Bloqueo (Enforce):** Una vez que el nivel de alertas llegue a cero, activa `enforce: baseline` (o `restricted` si tu madurez lo permite) namespace por namespace.

Aunque PSS y PSA cubren el 90% de las necesidades de seguridad en los Pods, son reglas "nativas" y predefinidas. Si tu organización requiere reglas de negocio personalizadas (por ejemplo: *"Solo se pueden descargar imágenes del registro privado de la empresa"* o *"Todos los Ingress deben tener TLS activado"*), PSS no es suficiente. Para esos casos, necesitamos herramientas más avanzadas que intervengan en el control de admisión, lo que nos lleva a la siguiente sección: **8.6 Admission Controllers: Mutating y Validating Webhooks**.

## 8.6 Admission Controllers: Mutating y Validating Webhooks

Si recordamos el diagrama del ciclo de vida de una petición al *API Server* que vimos en la sección 8.1, mencionamos una fase crucial justo antes de que el objeto se guarde en `etcd`: el **Control de Admisión (Admission Control)**.

Hasta ahora hemos visto controladores de admisión estáticos o integrados, como el *Pod Security Admission (PSA)*. Sin embargo, ¿qué sucede si tu organización tiene reglas de negocio personalizadas que Kubernetes no entiende de forma nativa? Por ejemplo:

* *"Todos los Pods deben tener la etiqueta `cost-center` asignada o deben ser rechazados."*
* *"Las imágenes de los contenedores solo pueden descargarse del registro corporativo `harbor.miempresa.com`."*
* *"Inyectar automáticamente un contenedor 'sidecar' de monitoreo en cada Pod que se despliegue en el namespace `produccion`."*

Para resolver esto sin tener que modificar el código fuente de Kubernetes, utilizamos el **Control de Admisión Dinámico**, implementado a través de **Webhooks**.

---

### 1. La Arquitectura: El flujo de Admisión Dinámica

Un Webhook de admisión no es más que un servidor HTTP (tu propio microservicio) que recibe una petición POST del *API Server* con un objeto JSON (el recurso que se intenta crear/modificar), ejecuta tu lógica de negocio y devuelve una respuesta en JSON indicando si aprueba, rechaza o modifica la petición.

Es vital para un ingeniero Senior entender el orden exacto en el que ocurren estas validaciones dentro del API Server:

```text
+----------------+      +---------------------------+      +-------------------+      +-----------------------------+      +--------+
| Petición HTTP  | ---> | 1. Mutating Webhooks      | ---> | 2. Validación de  | ---> | 3. Validating Webhooks      | ---> |  etcd  |
| (Autorizada)   |      |    (Pueden modificar      |      |    Esquema (JSON) |      |    (Solo aprueban/rechazan) |      |        |
+----------------+      |    el objeto original)    |      +-------------------+      +-----------------------------+      +--------+
                        +---------------------------+

```

*Nota arquitectónica:* La fase de mutación ocurre **antes** que la validación. Esto tiene sentido: si un webhook va a inyectar etiquetas o contenedores nuevos, los webhooks de validación deben evaluar el objeto final ya modificado, no el original.

---

### 2. Mutating Admission Webhooks

Los webhooks de mutación tienen el poder de interceptar la petición y **alterar el contenido (payload)** antes de que el clúster lo procese.

**Caso de uso clásico: Inyección de Sidecars (Service Mesh)**
Si has utilizado Istio o Linkerd, te habrás dado cuenta de que al desplegar un Pod con un solo contenedor, mágicamente aparecen dos contenedores en ejecución (tu app + el proxy Envoy). Esto no es magia; es un *Mutating Webhook*.
El API Server envía la definición del Pod al webhook de Istio, este añade el bloque YAML del contenedor Envoy y devuelve el manifiesto modificado al API Server.

Otro uso común es la **mutación de valores por defecto**. Por ejemplo, si un desarrollador olvida configurar los `Requests` y `Limits` de CPU/Memoria, un webhook puede interceptar el Pod e inyectar valores predeterminados seguros.

*Ejemplo de registro de un Mutating Webhook en el clúster:*

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: inject-sidecar-webhook
webhooks:
  - name: sidecar-injector.miempresa.internal
    clientConfig:
      service:
        name: sidecar-injector-svc
        namespace: infraestructura
        path: "/mutate"
      caBundle: "base64-encoded-ca-cert..."
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]

```

---

### 3. Validating Admission Webhooks

A diferencia de los de mutación, los webhooks de validación **no pueden alterar el objeto**. Son guardianes estrictos: leen el objeto final y emiten un veredicto binario (Aprobado o Rechazado). Si lo rechazan, deben proporcionar un mensaje explicando el motivo, el cual llegará directamente a la terminal del usuario.

**Caso de uso clásico: Gobernanza y Seguridad**

* Garantizar que no se desplieguen servicios de tipo `LoadBalancer` en entornos on-premise.
* Bloquear imágenes con la etiqueta `latest`.
* Validar que los nombres de los Ingress cumplan con la convención de nomenclatura de la empresa.

*Ejemplo de registro de un Validating Webhook:*

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: enforce-corporate-registry
webhooks:
  - name: registry-validator.miempresa.internal
    # ... (configuración de cliente omitida por brevedad) ...
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]

```

---

### 4. Consideraciones Críticas de Producción (Día 2)

Desarrollar y desplegar Webhooks es una tarea de nivel Arquitecto/Senior debido a su altísimo potencial destructivo. Si configuras un webhook incorrectamente, puedes paralizar todo el clúster. Presta especial atención a estos tres parámetros:

#### A. Requisito estricto de TLS

El *API Server* es extremadamente celoso con la seguridad. **Solo** se comunicará con tu servidor Webhook a través de HTTPS (puerto 443). Esto significa que tu servicio de webhook debe presentar un certificado SSL/TLS válido. Además, debes proporcionar el certificado de la Autoridad Certificadora (CA) en el campo `caBundle` del manifiesto de configuración para que el API Server confíe en tu webhook. (Suele gestionarse automáticamente con herramientas como `cert-manager`).

#### B. Failure Policy (Política de Fallos)

¿Qué pasa si el Pod de tu webhook se cae, o la red falla, y el API Server no puede alcanzarlo?
Tienes dos opciones (`failurePolicy`):

* `Ignore`: El API Server ignora la caída y permite que la petición continúe. Falla abierto (*fail-open*). Prioriza la disponibilidad sobre la seguridad.
* `Fail`: El API Server rechaza la petición. Falla cerrado (*fail-closed*). Prioriza la seguridad sobre la disponibilidad.

*Advertencia Senior:* Si configuras un webhook global para interceptar todos los `Pods` con `failurePolicy: Fail`, y el propio webhook corre como un Pod en el clúster... has creado un interbloqueo (*deadlock*). Si el nodo del webhook cae, Kubernetes intentará recrearlo, pero la petición de creación será interceptada y enviada al webhook (que está caído), por lo que la petición fallará y el clúster quedará bloqueado. **Siempre excluye el namespace `kube-system` y el namespace de tu propio webhook usando `namespaceSelector`.**

#### C. Timeouts

Los webhooks introducen latencia en la API. Por defecto, Kubernetes espera 10 segundos a que un webhook responda (configurable con `timeoutSeconds`, máximo 30s). Tu código debe ser extremadamente eficiente; de lo contrario, `kubectl` se sentirá lento y podrías causar *timeouts* en cascada en procesos de CI/CD.

Aunque escribir webhooks desde cero en Go o Python es un excelente ejercicio, mantener ese código a escala es costoso. Por ello, la industria ha evolucionado hacia motores genéricos que te permiten definir estas reglas utilizando lenguajes declarativos, tema que abordaremos a fondo en la siguiente sección: **8.7 Políticas como Código (Policy-as-Code) con OPA Gatekeeper y Kyverno**.

## 8.7 Políticas como Código (Policy-as-Code) con OPA Gatekeeper y Kyverno

En la sección anterior descubrimos el inmenso poder de los *Admission Webhooks* para imponer reglas de negocio. Sin embargo, como Arquitecto o Ingeniero Senior, pronto te darás cuenta de una dura realidad: **escribir y mantener webhooks personalizados en Go o Python no escala**.

Cada nueva regla requiere un ciclo completo de desarrollo: escribir código, compilar, construir una imagen Docker, desplegar, gestionar certificados TLS y monitorear el servicio. ¿Qué pasa si el equipo de seguridad quiere cambiar una regla a las 3 de la mañana? No deberían tener que pedirle a un desarrollador que recompile un microservicio.

La solución definitiva a este problema es el paradigma de **Políticas como Código (Policy-as-Code)**. Este enfoque desacopla la lógica de las políticas del código de la aplicación. En lugar de escribir servidores HTTP, despliegas un **Motor de Políticas** genérico en el clúster y le pasas las reglas de forma declarativa (mediante manifiestos).

Los dos titanes absolutos en el ecosistema de Kubernetes para esta tarea son **OPA Gatekeeper** y **Kyverno**.

---

### 1. OPA Gatekeeper: El Estándar Agnóstico

**OPA (Open Policy Agent)** es un motor de políticas de propósito general graduado por la CNCF. No es exclusivo de Kubernetes; puedes usar OPA para evaluar políticas en Terraform, Envoy, o microservicios.

**Gatekeeper** es la implementación nativa de OPA diseñada específicamente para Kubernetes. Actúa como un *Validating* y *Mutating Admission Webhook*, interceptando las peticiones y evaluándolas contra las reglas que hayas definido.

#### El lenguaje Rego y la Arquitectura

El mayor desafío de OPA es que utiliza un lenguaje de consulta propio llamado **Rego**. Tiene una curva de aprendizaje pronunciada, pero es matemáticamente preciso y extremadamente potente.

Gatekeeper divide la creación de políticas en dos objetos distintos (patrón de instanciación):

1. **ConstraintTemplate (La plantilla de código):** Contiene la lógica en Rego. Define *cómo* se evalúa una regla y qué parámetros acepta.
2. **Constraint (La instanciación):** Es el objeto que aplica la plantilla a recursos específicos (ej. "Aplica la plantilla 'EtiquetasObligatorias' a todos los `Namespaces`, exigiendo la etiqueta `cost-center`").

*Ejemplo de la lógica Rego en un ConstraintTemplate (Simplificado):*

```yaml
# Fragmento del bloque Rego en el ConstraintTemplate
violation[{"msg": msg}] {
  provided_labels := {label | input.review.object.metadata.labels[label]}
  required_labels := {label | label := input.parameters.labels[_]}
  missing_labels := required_labels - provided_labels
  count(missing_labels) > 0
  msg := sprintf("Faltan las etiquetas obligatorias: %v", [missing_labels])
}

```

**Flujo de Gatekeeper:**

```text
[API Server] ---> [Gatekeeper Webhook] 
                        |
                        +---> Lee 'Constraint' (Ej. Necesita label 'entorno')
                        +---> Ejecuta 'ConstraintTemplate' (Código Rego)
                        |
[Respuesta] <-----------+ (Aprobado / Rechazado con mensaje)

```

---

### 2. Kyverno: El Enfoque Nativo de Kubernetes

Mientras que OPA busca dominar todos los ecosistemas, **Kyverno** nació con una filosofía radicalmente distinta: *Kubernetes es el único ciudadano de primera clase*.

La ventaja competitiva de Kyverno es que **no requiere aprender un lenguaje nuevo**. Las políticas se escriben utilizando exactamente la misma estructura **YAML** y los mismos patrones (como *selectors* y *match/exclude*) que ya usas para crear Pods o Deployments.

#### Capacidades de Kyverno

Además de validar (rechazar lo que incumple), Kyverno brilla en otras tres áreas fundamentales:

* **Mutate (Mutación):** Modificar objetos al vuelo (ej. añadir un `securityContext` por defecto si el usuario no lo puso).
* **Generate (Generación):** Crear recursos adicionales automáticamente. (Ej. Cuando se crea un nuevo `Namespace`, Kyverno puede generar automáticamente un `NetworkPolicy` por defecto por defecto, un `LimitRange` y un `RoleBinding` para los administradores).
* **Verify Images:** Integración nativa para verificar firmas criptográficas de imágenes de contenedores (con herramientas como Cosign) para garantizar la cadena de suministro de software (Supply Chain Security).

*Ejemplo de una ClusterPolicy en Kyverno (Prohibir la etiqueta 'latest'):*

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  validationFailureAction: Enforce # Puede ser Audit o Enforce
  rules:
  - name: require-image-tag
    match:
      resources:
        kinds:
        - Pod
    validate:
      message: "Prohibido usar la etiqueta 'latest'. Usa una versión semántica."
      pattern:
        spec:
          containers:
          - image: "!*:latest" # Sintaxis YAML nativa con wildcards

```

---

### 3. ¿Gatekeeper o Kyverno? La Decisión del Arquitecto

La elección entre ambas herramientas es un clásico debate de arquitectura. Aquí tienes la tabla de decisión:

| Característica | OPA Gatekeeper | Kyverno |
| --- | --- | --- |
| **Lenguaje** | Rego (Curva de aprendizaje alta). | YAML nativo (Curva de aprendizaje baja). |
| **Ecosistema** | Agnóstico (El mismo código Rego puede usarse en CI/CD, Terraform, etc.). | Exclusivo de Kubernetes. |
| **Complejidad de Lógica** | Extremadamente alta. Puede evaluar estructuras de datos complejas o cruzar datos de múltiples objetos. | Alta, pero limitada por las capacidades de evaluación de YAML y JSONPath. |
| **Mutación** | Soportada, pero compleja de implementar. | Excelente y muy intuitiva. |
| **Generación de recursos** | No soportada nativamente (requiere herramientas externas). | Nativa y muy potente (ideal para automatizar *tenancy*). |

**Recomendación Senior:** Si tu organización ya utiliza OPA para Terraform y tiene ingenieros de seguridad que dominan Rego, **Gatekeeper** es la opción lógica para unificar el stack. Si tu equipo es puramente de infraestructura Kubernetes y quieres resultados rápidos, mantenibles por cualquier desarrollador y automatización de recursos, **Kyverno** es el claro ganador.

---

### 4. Mejores Prácticas Operativas (Día 2)

Implementar Políticas como Código es como instalar frenos de alto rendimiento en un coche: te permiten ir más rápido con seguridad, pero si los configuras mal, bloquearás las ruedas.

1. **Modo Dry-Run / Audit First:** Nunca despliegues una política nueva en modo `Enforce` o `Deny`. Despliégala en modo `Audit` (en Kyverno) o `warn` (en Gatekeeper). Deja que recopile datos durante una semana. Analiza cuántos bloqueos legítimos habría causado antes de activarla.
2. **Excepciones explícitas:** Tu motor de políticas **jamás** debe evaluar los namespaces críticos del sistema (`kube-system`, o el propio namespace del motor de políticas). Usa directivas de exclusión para evitar bucles de bloqueo.
3. **Shift-Left en CI/CD:** No esperes a que el clúster rechace el manifiesto. Utiliza herramientas CLI (como `gator` para Gatekeeper o `kyverno CLI`) en tus pipelines de GitHub Actions o GitLab CI para validar los manifiestos YAML *antes* de que se fusionen a la rama principal.
