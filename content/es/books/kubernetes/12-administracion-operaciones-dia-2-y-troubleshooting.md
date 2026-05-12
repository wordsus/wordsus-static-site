Dominar el despliegue de aplicaciones es solo el inicio. El verdadero desafío de un Ingeniero Senior comienza en el **"Día 2"**: el ciclo de vida continuo donde la estabilidad se pone a prueba. En este capítulo, exploraremos cómo elegir la estrategia de *bootstrapping* ideal y cómo ejecutar actualizaciones de versión sin afectar la disponibilidad. Aprenderás a blindar tus datos mediante estrategias de *Disaster Recovery* y a utilizar técnicas de depuración avanzada, desde el análisis de logs del sistema hasta la inspección de red y el uso de contenedores efímeros para resolver incidentes críticos en producción.

## 12.1 Estrategias de Bootstrapping (kubeadm, kubespray, kops) vs Servicios Gestionados (EKS, GKE, AKS)

Llegados a este punto del libro, ya dominas la arquitectura interna de Kubernetes, el despliegue de cargas de trabajo complejas, la seguridad y la observabilidad. Sin embargo, en el mundo real, antes de poder aplicar todo este conocimiento, te enfrentarás a una de las decisiones arquitectónicas más críticas como ingeniero DevOps o Site Reliability Engineer (SRE): **¿Cómo construimos, desplegamos y mantenemos el clúster?**

Esta decisión define el esfuerzo operativo del "Día 2" (mantenimiento, actualizaciones, escalado y recuperación ante desastres). Fundamentalmente, existen dos grandes caminos: el aprovisionamiento manual/automatizado por cuenta propia (Bootstrapping) y el uso de plataformas como servicio (Managed Services).

---

### 1. Estrategias de Bootstrapping (Self-Managed)

Cuando optas por el *bootstrapping*, asumes la responsabilidad total del clúster. Eres el dueño absoluto tanto de los Nodos de Trabajo (Worker Nodes) como del Plano de Control (Control Plane). Debes garantizar la alta disponibilidad de `etcd`, gestionar los certificados del `API Server` y configurar el modelo de red (CNI).

Para no hacer esto a mano, el ecosistema ofrece herramientas maduras:

#### A. `kubeadm`: El bloque de construcción estándar

`kubeadm` es la herramienta oficial del proyecto Kubernetes para inicializar clústeres. No aprovisiona infraestructura (no crea máquinas virtuales ni redes); asume que ya tienes los servidores listos con el *Container Runtime* instalado (como vimos en el Capítulo 1.2).

Su filosofía es hacer el "levantamiento pesado" de la configuración de K8s de forma estandarizada.

```bash
# Ejemplo del flujo básico de kubeadm
# En el nodo master:
kubeadm init --control-plane-endpoint "loadbalancer.local:6443" --pod-network-cidr=192.168.0.0/16

# Esto genera un token y un comando que ejecutas en tus worker nodes:
kubeadm join loadbalancer.local:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>

```

* **Cuándo usarlo:** Excelente para entornos de desarrollo, laboratorios, o como motor interno si estás construyendo tu propia herramienta de automatización de clústeres.
* **El reto del Día 2:** Las actualizaciones de versión (que veremos en la sección 12.2) y la rotación de certificados requieren intervención manual o scripts de automatización propios.

#### B. Kubespray: La potencia de Ansible

Kubespray es un proyecto de incubación de Kubernetes que utiliza Ansible para automatizar el despliegue. A diferencia de `kubeadm` (que Kubespray usa por debajo), esta herramienta **sí** se encarga de configurar el sistema operativo, instalar containerd/CRI-O, configurar la red y endurecer (harden) los servidores.

* **Cuándo usarlo:** Es el estándar de facto para entornos *On-Premise* (Bare-Metal o VMs en VMware/Proxmox) donde necesitas clústeres listos para producción.
* **Ventaja clave:** Es agnóstico a la infraestructura y altamente personalizable mediante variables de Ansible (Inventories). Soporta múltiples distribuciones de Linux y despliegues *air-gapped* (sin salida a internet).

#### C. kops (Kubernetes Operations): "kubectl para clústeres"

`kops` te permite gestionar el ciclo de vida del clúster de forma declarativa, de la misma manera que usas manifiestos YAML para gestionar Pods. A diferencia de Kubespray, `kops` interactúa directamente con las APIs de los proveedores de nube (AWS, GCP, DigitalOcean) para crear las VPCs, balanceadores y máquinas virtuales.

```bash
# kops crea tanto la infraestructura como el clúster
kops create cluster \
    --zones=us-east-1a,us-east-1b,us-east-1c \
    --master-size=t3.medium \
    --node-size=m5.large \
    --name=mi-cluster.k8s.local \
    --yes

```

* **Cuándo usarlo:** Cuando estás en la nube (especialmente AWS), quieres control absoluto sobre el Plano de Control (por ejemplo, para modificar *Feature Gates* del API Server), pero no quieres escribir Terraform para cada componente de infraestructura.

---

### 2. Servicios Gestionados (EKS, GKE, AKS)

En un entorno Cloud Native moderno, los servicios gestionados son la opción preferida por la mayoría de las organizaciones. El proveedor de nube asume el modelo de **responsabilidad compartida**, abstrayendo por completo el Plano de Control. Tú interactúas exclusivamente con el `API Server` y gestionas (en mayor o menor medida) los *Worker Nodes*.

A continuación, un esquema lógico de la barrera de responsabilidad:

```text
+-------------------------------------------------------------+
|                     PROVEEDOR DE NUBE                       |
|  +-------------------------------------------------------+  |
|  |                   CONTROL PLANE                       |  |
|  |  [ API Server ]  [ etcd (Alta Disponibilidad) ]       |  |
|  |  [ Scheduler  ]  [ Cloud Controller Manager   ]       |  |
|  +-------------------------------------------------------+  |
+------------------------------+------------------------------+
                               | <--- Límite de responsabilidad
+------------------------------+------------------------------+
|                        TU EQUIPO                            |
|  +-------------------------------------------------------+  |
|  |                   WORKER NODES                        |  |
|  |  [ Kubelet ]  [ Kube-proxy ]  [ CNI Plugin ]          |  |
|  |  [ Tus Pods y Cargas de Trabajo (Deployments) ]       |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+

```

#### A. Google Kubernetes Engine (GKE)

Considerado el "estándar de oro" de los K8s gestionados (GCP es la cuna de Kubernetes).

* **Destaque:** Ofrece canales de lanzamiento (Rapid, Regular, Stable) que automatizan las actualizaciones con una fiabilidad casi absoluta.
* **Autopilot:** GKE ofrece un modo donde ni siquiera gestionas los nodos; pagas solo por los recursos (Requests/Limits) que consumen tus Pods, eliminando la necesidad de configurar Karpenter o Cluster Autoscaler (Capítulo 10).

#### B. Amazon Elastic Kubernetes Service (EKS)

EKS es robusto, pero delega muchas decisiones arquitectónicas al usuario.

* **Destaque:** Requiere una configuración más exhaustiva en cuanto a red (VPC CNI) y roles IAM (IRSA) en comparación con GKE o AKS.
* **Flexibilidad:** Permite usar *Managed Node Groups*, instancias autogestionadas o AWS Fargate (ejecución serverless de Pods). Es el entorno ideal para implementar Karpenter, ya que AWS mantiene activamente este proyecto.

#### C. Azure Kubernetes Service (AKS)

AKS destaca por su altísima integración con el ecosistema empresarial de Microsoft.

* **Destaque:** Integración nativa e impecable con Entra ID (anteriormente Azure AD) para RBAC (Capítulo 8.2), y Azure Policy (basado en OPA Gatekeeper).
* **Costo:** Tradicionalmente, AKS no cobra por el Plano de Control en su capa gratuita (SLA no garantizado financieramente), pagando solo por las VMs de los nodos, aunque ofrecen un tier Standard con SLA respaldado por un costo adicional.

---

### 3. Matriz de Decisión: ¿Qué debe elegir un Arquitecto DevOps?

La decisión no se basa en cuál tecnología es "mejor", sino en qué modelo operativo se adapta a la madurez de la empresa, el presupuesto y los requisitos de cumplimiento (compliance).

| Criterio | Bootstrapping (ej. Kubespray / kops) | Servicio Gestionado (EKS, GKE, AKS) |
| --- | --- | --- |
| **Acceso al Control Plane** | Total. Puedes modificar flags del API, acceder a la DB etcd y usar cualquier CNI o Container Runtime. | Restringido. El proveedor bloquea ciertas configuraciones y no tienes acceso por SSH a los masters. |
| **Costo Base (CapEx/OpEx)** | Pagas por la infraestructura de los masters (mínimo 3 VMs para HA). Alto costo en horas/hombre para mantenimiento. | Tarifa plana por el Control Plane (ej. ~$70/mes en AWS/GCP) + costo de los worker nodes. Menor costo en horas/hombre. |
| **Actualizaciones (Upgrades)** | Proceso manual y riesgoso. Requiere pruebas exhaustivas de compatibilidad de etcd y API. | Automatizadas (con un clic o programadas por canales). El proveedor se encarga de rotar los masters sin downtime. |
| **Recuperación ante Desastres** | Eres responsable de hacer snapshots directos de `etcd` y restaurarlos en caso de corrupción. | El proveedor realiza backups continuos de `etcd` de forma invisible para el usuario. |
| **Time-to-Market** | Días o semanas para diseñar, probar y desplegar clústeres de producción consistentes. | Minutos (usualmente mediante un módulo de Terraform o Pulumi). |

**La recomendación nivel Senior:**
A menos que tengas requerimientos estrictos de estar en entornos desconectados (*air-gapped*), que la latencia exija procesar en el Edge extremo, o que necesites habilitar características Alpha (Feature Gates) del API de Kubernetes, **la norma en la industria es utilizar Servicios Gestionados**.

El esfuerzo de ingeniería de tu equipo aporta mucho más valor configurando el Autoscalado (Capítulo 10), estableciendo pipelines GitOps (Capítulo 11) y afinando las políticas de seguridad (Capítulo 8), que parcheando vulnerabilidades del sistema operativo en un servidor master a las 3 de la mañana. Entiende cómo funciona el bootstrapping para dominar los fundamentos, pero adopta los servicios gestionados para operar a gran escala.

## 12.2 Proceso seguro de Upgrade de versiones del clúster (Plano de control y Nodos)

Si hay una tarea operativa que históricamente ha quitado el sueño a los administradores de sistemas, es la actualización de un clúster de Kubernetes en producción. El ecosistema se mueve rápido (tres *releases* mayores al año) y quedarse atrás no es una opción debido a los parches de seguridad y al ciclo de vida de soporte oficial (generalmente 14 meses por versión).

Afortunadamente, Kubernetes está diseñado para ser actualizado sin tiempo de inactividad (*zero-downtime*), siempre y cuando se respeten rigurosamente sus reglas arquitectónicas y el orden de las operaciones.

---

### 1. La Regla de Oro y la Política de "Version Skew"

La arquitectura de Kubernetes dicta una regla inquebrantable para los upgrades: **El Plano de Control (Control Plane) siempre se actualiza primero, seguido de los Nodos de Trabajo (Worker Nodes).**

Para permitir actualizaciones progresivas, Kubernetes soporta un *Version Skew* (diferencia de versiones) estricto entre sus componentes:

* **kube-apiserver:** Es el componente central. Si está en la versión `1.30`.
* **kube-controller-manager y kube-scheduler:** Pueden estar en la versión `1.30` o `1.29` (N-1 respecto al API Server).
* **kubelet (Worker Nodes):** Puede estar hasta tres versiones menores por detrás del API Server (`1.30`, `1.29`, `1.28` o `1.27`). Esto te da un margen de maniobra inmenso para actualizar tus nodos con calma.
* **kubectl:** Soporta N+1 y N-1 respecto al API Server.

```text
[ Diagrama Lógico de Version Skew Permitido ]

+-------------------------+      +-------------------------+      +-------------------------+
|      Control Plane      |      |      Control Plane      |      |      Worker Node        |
|     (v1.30) ACTUAL      |      |     (v1.29) ANTIGUO     |      |    (v1.27 - v1.30)      |
|                         |      |                         |      |                         |
|  [ kube-apiserver ] <----------|-- [ kube-scheduler ]    |      |                         |
|          ^              |      |                         |      |                         |
|          |              |      +-------------------------+      |                         |
|          |              |                                       |                         |
|          +------------------------------------------------------|---- [ kubelet ]         |
+-------------------------+                                       +-------------------------+

```

---

### 2. Fase 1: Pre-flight y Planificación (El Día Antes)

El 90% del éxito de un upgrade radica en la preparación.

1. **Lectura de Release Notes y Deprecación de APIs:** Este es el paso donde la mayoría falla. Kubernetes elimina versiones de APIs (ej. pasar de `v1beta1` a `v1` en Ingress o CronJobs). Si actualizas el clúster y tienes manifiestos desplegados con APIs eliminadas, esos recursos quedarán huérfanos o fallarán.

* *Tip de Senior:* Usa herramientas estáticas como `pluto` o `kubepug` contra tu repositorio GitOps para detectar APIs obsoletas antes de tocar el clúster.

1. **Backup del Estado:** Aunque lo profundizaremos en la sección 12.3, **nunca** inicies un upgrade sin un snapshot reciente de la base de datos `etcd`.
2. **Actualizar herramientas cliente:** Asegúrate de que tu binario de `kubectl` coincida con la nueva versión objetivo.

---

### 3. Fase 2: Upgrade del Plano de Control

Si usas un Servicio Gestionado (EKS, GKE, AKS), esta fase se reduce a un clic en la consola o un cambio de versión en tu código de Terraform. El proveedor se encarga de rotar las máquinas virtuales de `etcd` y el `API Server` de forma transparente.

Si gestionas tu propio clúster (Bootstrapping con `kubeadm`), el proceso manual en el nodo master sería:

```bash
# 1. Actualizar el gestor de paquetes y el binario de kubeadm
apt-get update && apt-get install -y kubeadm=1.30.0-00

# 2. Verificar el plan de actualización (muy importante, comprueba certificados y etcd)
kubeadm upgrade plan

# 3. Aplicar la actualización al Control Plane
kubeadm upgrade apply v1.30.0

# 4. Actualizar los binarios locales del master
apt-get install -y kubelet=1.30.0-00 kubectl=1.30.0-00
systemctl daemon-reload
systemctl restart kubelet

```

*Nota: Después de actualizar el Control Plane, es el momento de actualizar tus plugins de infraestructura (CNI para la red, CSI para el almacenamiento y CoreDNS).*

---

### 4. Fase 3: Upgrade de los Nodos de Trabajo (El verdadero reto)

Aquí es donde residen tus aplicaciones de negocio. El objetivo es actualizar el sistema operativo o el agente `kubelet` sin tirar el servicio. Para lograrlo, usamos la estrategia de **Cordon and Drain** (Aislar y Drenar).

#### A. Aislar el Nodo (Cordon)

Evita que el `kube-scheduler` asigne nuevos Pods a este nodo mientras trabajamos en él.

```bash
kubectl cordon nodo-worker-01

```

#### B. Drenar el Nodo (Drain)

Expulsa de manera controlada todos los Pods existentes en el nodo. Kubernetes enviará una señal `SIGTERM` a los contenedores, permitiendo un apagado elegante (Graceful Shutdown). Como los Pods pertenecen a Deployments o ReplicaSets (Capítulo 3), el clúster automáticamente creará réplicas de reemplazo en otros nodos disponibles.

```bash
kubectl drain nodo-worker-01 --ignore-daemonsets --delete-emptydir-data

```

* `--ignore-daemonsets`: Necesario porque los DaemonSets (ej. Fluentd, Cilium) no pueden ser movidos; se reiniciarán con el nodo.
* `--delete-emptydir-data`: Fuerza el borrado de datos efímeros locales.
* *Salvavidas:* Si configuraste correctamente los **Pod Disruption Budgets (PDB)**, `kubectl drain` respetará el mínimo de réplicas disponibles de tu aplicación y esperará pacientemente antes de matar un Pod, garantizando el *zero-downtime*.

#### C. Ejecutar la actualización en el Nodo

Una vez vacío, procedes a parchear el SO, actualizar `kubelet` y `kube-proxy`, o en entornos cloud, simplemente destruyes la VM antigua y dejas que el *Auto Scaling Group* aprovisione una nueva con la AMI/Imagen actualizada (estrategia inmutable).

#### D. Devolver el Nodo al Clúster (Uncordon)

Si reciclaste el mismo nodo, debes indicarle al clúster que está listo para recibir tráfico nuevamente.

```bash
kubectl uncordon nodo-worker-01

```

---

### 5. Estrategias a Gran Escala (Blue/Green Node Pools)

Drenar nodo por nodo secuencialmente con `kubectl drain` en un clúster de 100 nodos tomaría horas. Para entornos a gran escala o servicios gestionados, la técnica recomendada es la migración de **Node Pools (Grupos de Nodos)**.

1. Creas un nuevo *Node Pool* con la versión de K8s actualizada (ej. `v1.30`).
2. Esperas a que los nuevos nodos se unan al clúster y estén en estado `Ready`.
3. Aplicas un `Taint` de tipo `NoSchedule` al *Node Pool* antiguo (`v1.29`).
4. Comienzas a escalar o drenar progresivamente el *Node Pool* antiguo. Todos los Pods nuevos caerán obligatoriamente en el nuevo conjunto de servidores.
5. Una vez que el pool antiguo está vacío, lo eliminas.

Este enfoque inmutable reduce drásticamente el riesgo de inconsistencias en el sistema operativo o dependencias residuales en los discos de los workers.

## 12.3 Estrategias de Backup y Disaster Recovery (Velero, snapshots de etcd)

En el mundo ideal, fundamentado en la filosofía GitOps que exploramos en el Capítulo 11, la respuesta a un desastre total de un clúster sería sencilla: crear un clúster nuevo y dejar que ArgoCD o Flux sincronicen todo desde nuestro repositorio Git.

Sin embargo, la realidad operativa es mucho más compleja. Git almacena nuestra *intención* (los manifiestos), pero no almacena el *estado dinámico* del clúster (certificados generados automáticamente, tokens de Service Accounts) y, lo más crítico, **no almacena los datos de estado** (el contenido de tus Persistent Volumes).

Por lo tanto, una estrategia sólida de Backup y Disaster Recovery (DR) en Kubernetes se aborda desde dos frentes distintos pero complementarios: la recuperación de la infraestructura base (`etcd`) y la recuperación a nivel de aplicación (Velero).

---

### 1. Respaldos a nivel de Infraestructura: Snapshots de `etcd`

Como vimos en el Capítulo 1, `etcd` es el "cerebro" y la única base de datos de estado del clúster. Si pierdes `etcd` y no tienes copias de seguridad, pierdes el clúster entero, sin importar cuántos nodos de trabajo sigan encendidos.

Hacer un snapshot de `etcd` captura absolutamente todo: configuraciones, secretos, metadatos de los volúmenes y el estado actual de cada Pod.

**¿Cómo funciona?**
Se utiliza la herramienta CLI `etcdctl` directamente contra los nodos del Plano de Control.

```bash
# Ejemplo de creación de un snapshot de etcd
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /opt/backups/etcd-snapshot-$(date +%Y-%m-%d).db

```

**Ventajas y Desventajas:**

* ✅ **Garantía absoluta:** Te devuelve el clúster exactamente al milisegundo en que se tomó el snapshot.
* ❌ **Todo o nada:** No puedes restaurar un solo Namespace o un solo Deployment. La restauración sobrescribe todo el clúster.
* ❌ **Sensibilidad a la versión:** Restablecer un snapshot en una versión de Kubernetes/etcd diferente a la original es extremadamente peligroso y a menudo falla.
* ❌ **Sin datos de usuario:** Esto **no** hace una copia de seguridad del contenido de tus discos (PV/PVCs), solo de la referencia (el puntero) a ellos.

**Cuándo usarlo:** Es tu "botón nuclear". Se utiliza principalmente en entornos de *Bootstrapping* (kubeadm, Kubespray) justo antes de realizar un Upgrade del clúster (Capítulo 12.2), o para recuperarse de una corrupción catastrófica de los datos del Control Plane. *Nota: En servicios gestionados (EKS, GKE, AKS), el proveedor realiza esto por ti automáticamente de forma invisible.*

---

### 2. Respaldos a nivel de Aplicación: Velero

Si `etcd` es el respaldo de la infraestructura, **Velero** (un proyecto open-source respaldado por VMware/Tanzu) es el estándar de facto en la industria para el respaldo Cloud-Native a nivel de aplicación.

Velero no habla con `etcd`; interactúa directamente con la **API de Kubernetes** y con las **APIs de tu proveedor de nube** (o tu almacenamiento local).

```text
[ Diagrama Lógico: etcd vs Velero ]

+-------------------------+      +-------------------------+
|     Control Plane       |      |     Infraestructura     |
| [ etcd ] <--- etcdctl --|------|---> (Backup Completo)   |
|    |                    |      |                         |
| [ API Server ] <--------|--+   |                         |
+-------------------------+  |   +-------------------------+
                             |
+-------------------------+  |   +-------------------------+
|     Worker Nodes        |  |   |    Almacenamiento S3    |
| [ Pod Velero ] ---------|--+---|--> [ Metadatos YAML ]   |
|                         |      |                         |
| [ PV (Disco) ] ---------|------|--> [ Snapshots CSI  ]   |
+-------------------------+      +-------------------------+

```

**¿Cómo funciona?**
Velero opera mediante Custom Resource Definitions (CRDs - Capítulo 13.1) y un controlador (Pod) que se ejecuta dentro del clúster. Cuando solicitas un backup, Velero hace dos cosas simultáneamente:

1. Consulta la API de K8s para descargar todos los YAMLs de los recursos seleccionados y los comprime en un *tarball* que envía a un Object Storage (como AWS S3, Google Cloud Storage o MinIO).
2. Invoca al Container Storage Interface (CSI) para que el proveedor de almacenamiento realice un Snapshot a nivel de bloque de los Volúmenes Persistentes (PVs) asociados a la aplicación.

```bash
# Ejemplo: Backup de un namespace específico, incluyendo sus volúmenes
velero backup create mi-app-backup --include-namespaces backend-prod

# Restauración en caso de desastre (incluso en un clúster diferente)
velero restore create --from-backup mi-app-backup

```

**Ventajas clave para el Ingeniero DevOps:**

* **Granularidad:** Puedes respaldar por Namespace, por Labels (ej. `app=mi-base-de-datos`), o excluir recursos específicos.
* **Migración de Clústeres:** Es la herramienta perfecta para migraciones. Puedes hacer un backup en un clúster local (On-Premise) y restaurarlo en un clúster de AWS EKS, mapeando incluso las clases de almacenamiento (StorageClasses) sobre la marcha.
* **Hooks de pre/post ejecución:** Permite ejecutar comandos dentro de los contenedores antes del backup (ej. `pg_dump` o hacer un *fsync* de la base de datos para garantizar la consistencia de los datos) y después del backup.

---

### 3. Estrategia Combinada y Mejores Prácticas

Como Arquitecto o Senior DevOps, no debes elegir entre uno y otro, sino implementar la herramienta adecuada para el escenario de fallo adecuado.

1. **Si no usas GitOps:** Necesitas backups frecuentes y completos del clúster con Velero (ej. cada hora) para no perder las configuraciones manuales.
2. **Si usas GitOps (Recomendado):** Configura Velero para que **solo** respalde los recursos con estado (StatefulSets, PVCs, PVs y Secrets). Deja que ArgoCD/Flux se encarguen de restaurar los Deployments y Services sin estado. Esto ahorra costos de almacenamiento y acelera los tiempos de recuperación (RTO).
3. **La regla 3-2-1:** Asegúrate de que los buckets de S3 donde Velero guarda los datos estén en una región geográfica diferente a la de tu clúster, con versionado de objetos activado y protección contra borrado accidental (Object Lock / WORM).
4. **Game Days:** Un backup no es un backup hasta que se ha probado su restauración exitosamente. Un equipo maduro realiza simulacros periódicos ("Game Days") destruyendo un Namespace en un entorno de staging y cronometrando cuánto tardan en recuperarlo usando Velero.

## 12.4 Depuración avanzada: Análisis de eventos, logs del sistema (journalctl) y contenedores efímeros (ephemeral containers)

Hasta ahora, seguramente te has acostumbrado a utilizar comandos básicos como `kubectl logs` y `kubectl describe` para resolver problemas cotidianos (CrashLoopBackOffs, errores de sintaxis en YAMLs o secretos faltantes). Sin embargo, en el día a día de un ingeniero Senior, te enfrentarás a escenarios donde los contenedores no emiten logs, los nodos desaparecen sin dejar rastro o las aplicaciones fallan en la red sin motivo aparente.

Cuando las herramientas básicas se quedan cortas, necesitamos descender una capa más en la abstracción del clúster.

---

### 1. El rastro de migas de pan: Análisis de Eventos

Muchos administradores creen que los eventos solo viven al final de la salida de un `kubectl describe`. En realidad, en Kubernetes, un **Evento es un objeto de primer nivel en la API**.

Cada vez que el Scheduler asigna un Pod, el Kubelet extrae una imagen, o un controlador reinicia un contenedor, se emite un Evento. Analizarlos globalmente es la forma más rápida de entender el "latido" del clúster.

**El problema de la visibilidad temporal:**
Por defecto, los eventos en Kubernetes tienen un **TTL (Time to Live) de solo 1 hora** (para no saturar la base de datos `etcd`). Si un problema ocurrió durante la madrugada, no lo verás por la mañana a menos que estés exportando estos eventos a tu sistema de centralización (como Loki o Elasticsearch, vistos en el Capítulo 9).

**Comandos avanzados para eventos:**
Para depurar en tiempo real, `kubectl get events` es tu mejor aliado si sabes cómo filtrarlo:

```bash
# Ver todos los eventos de un namespace ordenados cronológicamente
kubectl get events --sort-by='.metadata.creationTimestamp'

# Filtrar solo eventos de advertencia (Warnings) en todo el clúster
kubectl get events --field-selector type=Warning --all-namespaces

# Seguir el flujo de eventos en tiempo real (similar a tail -f)
kubectl get events --watch

```

> **Nota de Arquitectura:** Si un nodo está experimentando problemas de recursos (Disk Pressure, Memory Pressure), los eventos del clúster te lo advertirán mucho antes de que los Pods empiecen a ser desalojados (Evicted).

---

### 2. Cuando K8s es ciego: Logs del Sistema (`journalctl`)

¿Qué haces cuando un Pod se queda atascado en el estado `ContainerCreating` y `kubectl logs` devuelve un error diciendo que el contenedor no existe? ¿O cuando un Nodo entero pasa a estado `NotReady`?

En este punto, la API de Kubernetes no puede ayudarte porque **el problema reside en el sistema operativo subyacente del Nodo de Trabajo**. Debes acceder por SSH al nodo problemático y consultar los logs del sistema (systemd) usando `journalctl`.

Los dos demonios críticos que debes investigar son el **Kubelet** (el agente de K8s) y el **Container Runtime** (containerd o CRI-O).

**Buscando la causa raíz en el host:**

```bash
# 1. Verificar el estado del servicio Kubelet
systemctl status kubelet

# 2. Leer los logs del Kubelet en tiempo real
journalctl -u kubelet -f

# 3. Buscar errores específicos en containerd en la última hora
journalctl -u containerd --since "1 hour ago" | grep -i error

```

**Problemas comunes que solo descubrirás con `journalctl`:**

* **Fallos del CNI:** Verás errores del Kubelet quejándose de que no puede asignar una IP al Pod porque el plugin de red (ej. Calico o Cilium) falló a nivel de host.
* **OOM (Out of Memory) del Host:** Si el kernel de Linux se queda sin memoria, el `OOMKiller` del sistema operativo asesinará procesos de forma implacable (incluso al propio Kubelet). Ver esto en `journalctl` o en `/var/log/syslog` es vital.
* **Problemas de montaje de volúmenes (CSI):** Fallos al adjuntar discos EBS o discos locales a nivel del sistema operativo.

---

### 3. El arte de depurar en la oscuridad: Contenedores Efímeros

En el Capítulo 8 y 11 hablamos de la seguridad y las mejores prácticas en la construcción de imágenes. Una regla de oro es usar imágenes **Distroless** o *scratch*. Estas imágenes solo contienen el binario compilado de tu aplicación y sus dependencias exactas; **no tienen shell (`sh`, `bash`), no tienen `curl`, ni utilidades de red (`ping`, `netcat`).**

Si tienes un problema de conectividad de red o de DNS dentro de un Pod Distroless, no puedes ejecutar `kubectl exec -it mi-pod -- sh`. Estás completamente ciego.

Aquí es donde brillan los **Contenedores Efímeros (Ephemeral Containers)**, introducidos como funcionalidad estable en K8s 1.25.

**¿Qué es un Contenedor Efímero?**
Es un comando que inyecta dinámicamente un nuevo contenedor temporal dentro de un Pod que ya está en ejecución. Este contenedor de depuración comparte los **Namespaces de Linux** (Red, Procesos) con tu contenedor de aplicación problemático, permitiéndote "ver" lo que él ve, pero usando tus propias herramientas.

```text
[ Arquitectura Lógica de un Ephemeral Container ]

+------------------------------------------------------+
|                     POD (mi-app)                     |
|                                                      |
|  +-------------------------+  Espacio de Red (Compartido)
|  |   Contenedor Original   | <--------------------+  |
|  |   (Distroless, sin shell|                      |  |
|  |   Ni utilidades)        |                      |  |
|  +-------------------------+                      |  |
|                                                   |  |
|  +-------------------------+                      |  |
|  |   Contenedor Efímero    | <--------------------+  |
|  |   (Inyectado por debug) |                         |
|  |   [ curl, bash, tcpdump]|                         |
|  +-------------------------+                         |
+------------------------------------------------------+

```

**Cómo utilizar `kubectl debug`:**

Imagina que tu aplicación backend no puede resolver el DNS de la base de datos. Para inyectar una imagen de diagnóstico (como `nicolaka/netshoot`, que contiene todas las herramientas de red imaginables) en ese Pod, ejecutas:

```bash
kubectl debug -it mi-pod --image=nicolaka/netshoot --target=mi-contenedor-app

```

* `--image`: Especifica la imagen llena de herramientas que quieres usar.
* `--target`: (Opcional pero recomendado) Indica que quieres compartir el espacio de nombres de procesos (PID) con el contenedor de tu aplicación, lo que te permite ver sus procesos corriendo con herramientas como `htop` o `ps aux`.

**Características clave de los contenedores efímeros:**

* No reinician el Pod. Se añaden "en caliente".
* No puedes eliminar un contenedor efímero una vez inyectado; morirá y desaparecerá cuando el Pod principal sea destruido.
* Son la herramienta definitiva para mantener los estándares de alta seguridad (PSS) en tus imágenes, sin sacrificar la capacidad operativa del equipo de SRE para resolver incidentes en producción.

## 12.5 Troubleshooting de red: DNS issues, caídas de CNI, asimetría de ruteo

Existe un chiste recurrente en la comunidad de operaciones: *"No fue DNS. No hay forma de que fuera DNS. Fue DNS"*. En Kubernetes, la red es el componente más abstracto y, por lo tanto, el más complejo de depurar. Cuando los Pods están corriendo pero las aplicaciones no pueden comunicarse, entramos en el territorio del "Día 2" más temido por los ingenieros.

Para dominar el *troubleshooting* de red a nivel Senior, debes dividir el problema en tres capas fundamentales: resolución de nombres (DNS), conectividad a nivel de Pod/Nodo (CNI), y flujo de tráfico externo/interno (Ruteo).

---

### 1. "It's always DNS": Depurando CoreDNS

CoreDNS es el servidor DNS autoritativo de tu clúster (introducido en el Capítulo 4.2). Si CoreDNS falla, la comunicación intra-clúster mediante nombres de *Services* (ej. `http://backend.mi-namespace.svc.cluster.local`) colapsa, aunque las IPs sigan siendo enrutables.

**Síntomas comunes:**

* Latencia extrema al iniciar conexiones entre microservicios.
* Errores `NXDOMAIN` o `Timeout` en los logs de la aplicación al intentar contactar a otro servicio o a APIs externas.

**Flujo de depuración:**

1. **Inyectar un Pod de diagnóstico:** Usando la estrategia de contenedores efímeros (Sección 12.4) o levantando un Pod temporal, utiliza herramientas como `dig` o `nslookup`.

```bash
kubectl run -it --rm debug-dns --image=infoblox/dnstools --restart=Never -- sh
# Dentro del pod:
dnsq a backend.default.svc.cluster.local

```

1. **Verificar la salud de CoreDNS:** CoreDNS corre como un Deployment en el namespace `kube-system`.

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns

```

1. **El problema del `ndots:5` (Tip de Senior):**
Por defecto, Kubernetes configura el archivo `/etc/resolv.conf` de los Pods con la opción `ndots:5`. Esto significa que cualquier consulta DNS con menos de 5 puntos (ej. `google.com`) generará múltiples consultas locales basura (ej. `google.com.default.svc.cluster.local`, `google.com.svc.cluster.local`) antes de resolverse externamente. Si tu aplicación hace muchas consultas externas, esto satura CoreDNS.

* *Solución:* Ajustar el `dnsConfig` en el manifiesto del Pod para reducir el `ndots` o forzar un punto final en las llamadas externas (`google.com.`).

---

### 2. Caídas del CNI (Container Network Interface)

El CNI (Calico, Cilium, Flannel, VPC CNI) es el responsable de asignar direcciones IP a los Pods y programar las reglas de ruteo (o eBPF) en el kernel de Linux.

**Síntomas de un CNI roto:**

* Pods atascados indefinidamente en estado `ContainerCreating`.
* Eventos del Pod (vistos en 12.4) mostrando errores como: `Failed to create pod sandbox: rpc error: code = Unknown desc = failed to set up sandbox container network: networkPlugin cni failed to teardown pod`.
* Nodos enteros pasando a estado `NotReady` con el error `NetworkPluginNotReady`.

**Causas principales y cómo resolverlas:**

* **Agotamiento de IPAM (IP Address Management):** Si la subred asignada a un Nodo se queda sin IPs, el CNI no puede arrancar nuevos Pods. En AWS EKS (VPC CNI), esto ocurre si la VPC o las subredes se quedan sin IPs privadas.
* *Solución:* Revisar las métricas de uso de IPs. En entornos On-Prem, ampliar el `PodCIDR`. En AWS, habilitar *Custom Networking* o *Prefix Delegation*.

* **Desajuste del MTU (Maximum Transmission Unit):** Clásico en infraestructuras anidadas (Overlay Networks). Si el CNI empaqueta el tráfico (ej. VXLAN o Geneve) y el MTU resultante supera el MTU físico de la red de la nube (usualmente 1500 o 9000), los paquetes grandes se descartan silenciosamente (*Packet Drop*). Las conexiones SSH o TLS se quedan "congeladas" en el *handshake*.
* *Solución:* Configurar explícitamente el MTU en el ConfigMap del CNI para que sea menor al MTU de la interfaz física del host (ej. MTU físico 1500 -> MTU Calico VXLAN 1450).

* **Fallo del DaemonSet:** El CNI corre un agente por nodo. Si ese Pod cae (por falta de memoria o CPU), el nodo pierde su capacidad de gestionar redes.

```bash
kubectl get daemonset -n kube-system

```

---

### 3. Asimetría de Ruteo y el problema del SNAT/DNAT

La asimetría de ruteo ocurre cuando un paquete de red entra al clúster por un camino (Nodo A), pero la respuesta intenta salir por un camino diferente o con una IP de origen modificada. Los firewalls de estado o el `conntrack` (connection tracking) de Linux detectan esto como tráfico inválido y lo bloquean (Dropping packets).

En Kubernetes, esto se manifiesta típicamente al interactuar con *Services* de tipo `LoadBalancer` o `NodePort`.

**El escenario clásico: `externalTrafficPolicy: Cluster` (Por defecto)**

```text
[ Cliente Externo ] IP: 200.0.0.1
        |
        v
[ Balanceador de Carga (AWS/GCP) ]
        |
        v (El tráfico llega al Nodo A, pero el Pod está en el Nodo B)
+-------+-------+
|    NODO A     | ---> kube-proxy hace SNAT y DNAT ---> +-------+-------+
+---------------+                                       |    NODO B     |
                                                        |   [ Mi Pod ]  |
                                                        +---------------+

```

1. El paquete entra al Nodo A.
2. `kube-proxy` en el Nodo A ve que el Pod destino está en el Nodo B.
3. Para asegurar que la respuesta vuelva a través del Nodo A (y evitar asimetría), el Nodo A hace **SNAT (Source Network Address Translation)**, cambiando la IP del cliente (200.0.0.1) por la IP interna del Nodo A.
4. **El problema:** La aplicación dentro del Pod ve la IP del Nodo A, **perdiendo la IP real del cliente**.

**La solución a medias y su trampa: `externalTrafficPolicy: Local`**

Para preservar la IP del cliente, los arquitectos cambian el Service a `Local`. Esto le dice a `kube-proxy`: "Solo enruta el tráfico a los Pods que estén en *este* mismo nodo. No hagas SNAT".

```text
[ Cliente Externo ] IP: 200.0.0.1
        |
        v
[ Balanceador de Carga ] (Intenta enviar a NODO A y NODO B)
        |
   +----+----+
   |         |
   v         v
[NODO A]   [NODO B]
(Sin Pod)  (Con Pod)
   X         |
 (Falla)     v
         [ Mi Pod ] -> Ve la IP real 200.0.0.1

```

**El nuevo problema (Asimetría y Caídas de tráfico):**
Si el balanceador de carga externo no está configurado correctamente con un *Health Check* apuntando al puerto del servicio (`healthCheckNodePort`), enviará tráfico al Nodo A. Como el Nodo A tiene la política `Local` y no tiene un Pod de esa aplicación, **descartará el paquete**. El cliente experimentará un `Timeout` intermitente (funciona cuando el LB le atina al nodo correcto, falla cuando le atina a un nodo vacío).

**Cómo resolver problemas de asimetría y visibilidad:**

1. **Observabilidad de red:** Usa herramientas como `tcpdump` o `Hubble` (si usas Cilium) para trazar el viaje del paquete a nivel de host.
2. **Configuración de Health Checks:** Si usas `externalTrafficPolicy: Local`, asegúrate imperativamente de que el Load Balancer externo solo enrute tráfico a nodos que pasen el *Health Check* del NodePort específico.
3. **Modernización (Gateway API):** Como se discutió en el Capítulo 4.5, la adopción de Ingress Controllers modernos o el Gateway API, operando en capa 7 y pasando la IP real a través del header `X-Forwarded-For`, suele ser una solución mucho más elegante y menos frágil que lidiar con las reglas de iptables/SNAT en capa 4.
