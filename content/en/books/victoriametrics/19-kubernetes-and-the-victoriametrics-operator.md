As organizations adopt cloud-native architectures, Kubernetes is the de facto standard for deploying distributed systems. Running VictoriaMetrics at scale in Kubernetes introduces challenges around stateful storage, configuration management, and dynamic scaling. 

This chapter introduces the official `vm-operator`, a dedicated Kubernetes controller designed to automate the lifecycle of your observability stack. We will explore transitioning from static deployments to declarative Custom Resource Definitions (CRDs), enabling automated cluster provisioning, zero-downtime upgrades, and self-discovering monitoring pipelines.

## 19.1 Introduction to the `vm-operator`

Kubernetes has firmly established itself as the modern standard for container orchestration. While deploying stateless applications in Kubernetes is relatively straightforward, managing stateful, high-performance database clusters requires a deeper level of operational intelligence. This is where the **`vm-operator`** comes into play. 

The `vm-operator` brings native VictoriaMetrics automation to Kubernetes. By leveraging the Kubernetes Operator pattern, it acts as a software-encoded site reliability engineer (SRE) dedicated specifically to managing the lifecycle of your VictoriaMetrics deployments.

### The Kubernetes Operator Pattern Explained

To understand the `vm-operator`, one must first understand the Operator pattern. In Kubernetes, controllers run in loops, constantly comparing the *desired state* of the cluster (what you asked for) with the *actual state* (what is currently running). If there is a discrepancy, the controller takes action to reconcile the two.

An Operator extends this concept by introducing **Custom Resource Definitions (CRDs)**. Instead of forcing you to manually configure raw Kubernetes primitives like StatefulSets, Deployments, ConfigMaps, and Services for a complex database, an Operator allows you to declare high-level, domain-specific resources. The `vm-operator` watches these custom resources and automatically translates them into the necessary underlying Kubernetes components.

### Core Architecture and Workflow

The `vm-operator` continuously monitors the Kubernetes API for changes to VictoriaMetrics-specific CRDs. When you create or update a custom resource, the operator dynamically provisions, configures, or scales the corresponding VictoriaMetrics components.

Below is a conceptual workflow of how the `vm-operator` manages cluster state:

```text
+-------------------+       Watches State    +-----------------------+
|   Kubernetes API  | <--------------------- |      vm-operator      |
|      Server       |                        |  (Controller Pattern) |
+-------------------+                        +-----------------------+
        ^                                            |
        | Applies definitions                        | Reconciles & Creates
        |                                            v
+-------------------+                        +-----------------------+
| VM Custom         |                        | Kubernetes Native     |
| Resources (CRDs)  |                        | Resources             |
| - VMCluster       | ----- Translated ----> | - StatefulSets        |
| - VMAgent         |       by Operator      | - Deployments         |
| - VMRule          |                        | - Services            |
| - VMAlert         |                        | - ConfigMaps/Secrets  |
+-------------------+                        +-----------------------+
```

### The VictoriaMetrics Custom Resources

The `vm-operator` introduces several CRDs that map directly to the components discussed in previous chapters. By defining these resources, you dictate the architecture of your monitoring stack:

* **`VMSingle`:** Deploys a standalone, single-node instance of VictoriaMetrics. Ideal for smaller environments or isolated edge deployments.
* **`VMCluster`:** Deploys the distributed version of VictoriaMetrics. A single `VMCluster` definition automatically orchestrates the correct deployment of `vminsert`, `vmstorage`, and `vmselect` pods, ensuring they are properly networked and configured to communicate with one another.
* **`VMAgent`:** Manages the deployment of the `vmagent` component. It automatically gathers scraping targets and handles the distribution of configuration to the underlying agent pods.
* **`VMAlert`:** Deploys and manages `vmalert` instances for evaluating alerting and recording rules against your VictoriaMetrics data.
* **`VMRule`:** Defines recording and alerting rules. The operator automatically mounts these rules into `vmalert` or Prometheus instances without requiring manual ConfigMap restarts.
* **`VMServiceScrape` / `VMPodScrape` / `VMNodeScrape`:** Defines dynamic discovery rules for scraping metrics from Kubernetes Services, Pods, or Nodes. This allows for declarative, cloud-native target discovery.

### Why Use the `vm-operator`?

Migrating from raw Kubernetes manifests to the `vm-operator` provides several immediate operational advantages:

1.  **Automated Lifecycle Management:** The operator handles rolling updates seamlessly. If you change a configuration flag or upgrade a container image version, the operator ensures pods are restarted in the correct order to maintain high availability and prevent data loss.
2.  **Configuration Management via CRDs:** Rather than wrestling with complex, monolithic YAML ConfigMaps, configuration is split into modular, manageable custom resources. For instance, adding a new application to be monitored is as simple as applying a small `VMServiceScrape` YAML file alongside the application itself.
3.  **Dynamic Reloading:** When scrape configurations or alerting rules change, the `vm-operator` automatically triggers the configuration reload mechanisms inside `vmagent` and `vmalert`. There is no need to manually send `SIGHUP` signals or restart pods.
4.  **Self-Healing:** If a user accidentally deletes a Service or StatefulSet belonging to a `VMCluster`, the operator's reconciliation loop immediately notices the drift from the desired state and recreates the missing components.
5.  **Scaling Abstractions:** Scaling the query or ingestion tiers of a cluster becomes a matter of changing a single `replicaCount` integer in a `VMCluster` manifest. The operator manages the underlying Pod distribution and network routing changes.

By abstracting away the low-level infrastructure wiring, the `vm-operator` allows SRE and observability teams to focus entirely on the design, retention, and performance tuning of the monitoring stack, treating the database itself as a declarative cloud-native resource.

## 19.2 Deploying VMCluster via Custom Resource Definitions (CRDs)

The `VMCluster` Custom Resource Definition (CRD) is the centerpiece of the `vm-operator` when deploying VictoriaMetrics at scale. Instead of manually maintaining dozens of intricate Kubernetes manifests—StatefulSets for storage, Deployments for ingestion and querying, and Services for internal routing—the `VMCluster` CRD allows you to declare the entire topology of your distributed database in a single, cohesive YAML file.

### Anatomy of the VMCluster CRD

A VictoriaMetrics cluster consists of three primary microservices: `vmstorage`, `vminsert`, and `vmselect`. The `VMCluster` CRD mirrors this architecture directly. By defining the specifications for each of these components within the CRD, the operator automatically handles the underlying Kubernetes orchestration.

Here is a plain-text representation of how the `VMCluster` manifest translates into Kubernetes primitives:

```text
                      [ VMCluster CRD ]
                              |
      +-----------------------+-----------------------+
      |                       |                       |
[ vminsert Spec ]       [ vmstorage Spec ]      [ vmselect Spec ]
      |                       |                       |
      v                       v                       v
(Stateless)             (Stateful)              (Stateless)
- K8s Deployment        - K8s StatefulSet       - K8s Deployment
- K8s Service           - K8s Headless Svc      - K8s Service
                        - PVCs (Storage)        - Cache Volumes
```

### A Production-Ready Baseline Example

To deploy a cluster, you must craft a YAML manifest that defines the desired state of these three components. Below is a foundational example that includes resource requests, limits, and persistent storage definitions.

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMCluster
metadata:
  name: example-vmcluster
  namespace: monitoring
spec:
  # 1. The Storage Tier (Stateful)
  vmstorage:
    replicaCount: 2
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
    storageDataPath: "/vm-data"
    storage:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi

  # 2. The Ingestion Tier (Stateless)
  vminsert:
    replicaCount: 2
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
    # Extra arguments can be passed directly to the binary
    extraArgs:
      maxLabelsPerTimeseries: "30"

  # 3. The Query Tier (Stateless)
  vmselect:
    replicaCount: 2
    cacheMountPath: "/select-cache"
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
    # Select nodes benefit from temporary disk cache
    storage:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 2Gi
```

### Breaking Down the Configuration

When the operator processes the above manifest, it takes specific actions for each tier:

* **`vmstorage`:** Because this is the stateful data tier, the operator creates a `StatefulSet`. It uses the `volumeClaimTemplate` to dynamically provision PersistentVolumeClaims (PVCs) for each pod. In this example, two pods will be created, each with a 50Gi dedicated volume mounted at `/vm-data`. The operator also configures a headless service to ensure `vminsert` and `vmselect` can discover and route traffic to these specific storage nodes.
* **`vminsert`:** The operator deploys this as a K8s `Deployment` because ingestion nodes are stateless. They simply receive data, hash the labels, and forward the metrics to the appropriate `vmstorage` nodes. You can safely autoscale this tier based on CPU utilization without worrying about data loss.
* **`vmselect`:** This is also deployed as a `Deployment`. However, notice the `cacheMountPath` and its own `volumeClaimTemplate`. While `vmselect` does not store long-term metric data, it heavily utilizes disk-based caching for evaluated queries to improve performance. The operator provisions smaller, temporary volumes for this purpose.

### Deployment and Verification

Once your YAML is prepared (e.g., saved as `vmcluster.yaml`), deployment is a standard Kubernetes operation:

```bash
kubectl apply -f vmcluster.yaml
```

To verify that the operator has successfully interpreted your CRD and spawned the necessary resources, you can inspect the pods in the namespace:

```bash
kubectl get pods -n monitoring -l app.kubernetes.io/instance=example-vmcluster
```

You should see output similar to this, indicating that the operator has prefixed the pod names with the component type and the cluster name:

```text
NAME                                           READY   STATUS    RESTARTS   AGE
vminsert-example-vmcluster-5d4b8f8b4-abcde     1/1     Running   0          2m
vminsert-example-vmcluster-5d4b8f8b4-fghij     1/1     Running   0          2m
vmselect-example-vmcluster-789cf4d2b-klmno     1/1     Running   0          2m
vmselect-example-vmcluster-789cf4d2b-pqrst     1/1     Running   0          2m
vmstorage-example-vmcluster-0                  1/1     Running   0          2m
vmstorage-example-vmcluster-1                  1/1     Running   0          2m
```

### Injecting Advanced Kubernetes Primitives

The `VMCluster` CRD is designed to pass through standard Kubernetes scheduling primitives. For a highly available production deployment, you should ensure that pods of the same component are not scheduled on the same physical node. 

You can seamlessly add standard K8s `affinity`, `nodeSelector`, and `tolerations` blocks directly into the `vmstorage`, `vminsert`, or `vmselect` specifications:

```yaml
  vmstorage:
    replicaCount: 3
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
              - vmstorage
          topologyKey: "kubernetes.io/hostname"
```

By adding this block, the `vm-operator` guarantees that Kubernetes will spread your three storage nodes across three distinct physical K8s worker nodes, protecting your cluster from single-node failures.

## 19.3 Managing Discovery with VMRule and VMServiceScrape

Once your VictoriaMetrics cluster is deployed, the immediate next step is operationalizing it: you need to ingest data from your applications and configure rules to evaluate that data. In a dynamic Kubernetes environment where Pod IPs are ephemeral and workloads scale horizontally, static configuration files are a severe anti-pattern. 

The `vm-operator` solves this through declarative, label-based discovery using two critical Custom Resource Definitions (CRDs): **`VMServiceScrape`** for data ingestion and **`VMRule`** for data evaluation.

### Dynamic Ingestion with `VMServiceScrape`

`VMServiceScrape` is the VictoriaMetrics equivalent of the widely known Prometheus `ServiceMonitor`. It instructs the `vmagent` component on how to automatically discover and scrape metric endpoints exposed by Kubernetes Services. 

Instead of hardcoding targets, a `VMServiceScrape` relies on Kubernetes label selectors. When a new application is deployed with labels matching the selector, `vmagent` immediately begins scraping it without any manual restarts or configuration reloads.

Here is an example of a typical `VMServiceScrape` definition targeting a backend API application:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMServiceScrape
metadata:
  name: backend-api-scrape
  namespace: monitoring
spec:
  # 1. Target Selection
  selector:
    matchLabels:
      app: backend-api
      environment: production
  # 2. Scrape Configuration
  endpoints:
  - port: metrics         # The name of the port in the Kubernetes Service
    path: /metrics        # The HTTP path exposing the metrics
    interval: 15s         # How frequently to scrape
    scrapeTimeout: 5s
    # 3. Target-specific Relabeling
    relabelConfigs:
    - action: replace
      sourceLabels: [__meta_kubernetes_pod_node_name]
      targetLabel: node
```

**Key Components:**
* **`selector`:** This is the core discovery mechanism. The operator will search for any Kubernetes Service in the cluster that possesses the labels `app: backend-api` and `environment: production`.
* **`endpoints`:** Defines the technical details of the scrape. Notice that it uses the logical `port` name defined in the Service manifest rather than a hardcoded port number.
* **`relabelConfigs`:** Allows you to apply relabeling rules directly at the point of discovery, enriching your metrics with Kubernetes metadata before they reach the storage tier.

> **Note:** While `VMServiceScrape` is the most common, the `vm-operator` also provides **`VMPodScrape`** (for scraping Pods directly, bypassing Services) and **`VMNodeScrape`** (for scraping Kubernetes node-level metrics like `node-exporter`).

### Managing Logic with `VMRule`

Data is only as valuable as the insights you extract from it. The `VMRule` CRD allows you to declare Prometheus-compatible alerting and recording rules natively in Kubernetes. 

When you apply a `VMRule` to the cluster, the `vm-operator` detects it, translates the rules, and hot-reloads the `vmalert` instances to apply the new logic. 

Below is an example defining both an alerting rule and a recording rule:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMRule
metadata:
  name: backend-api-rules
  namespace: monitoring
  labels:
    role: alert-rules
spec:
  groups:
  - name: backend.rules
    rules:
    # A Recording Rule
    - record: job:http_requests_total:rate5m
      expr: rate(http_requests_total{job="backend-api"}[5m])
      
    # An Alerting Rule
    - alert: HighErrorRate
      expr: job:http_errors_total:rate5m / job:http_requests_total:rate5m > 0.05
      for: 2m
      labels:
        severity: critical
        team: backend
      annotations:
        summary: "High error rate detected on backend API"
        description: "Error rate is currently {{ $value | humanizePercentage }}."
```

### The Discovery Pipeline: Tying it Together

Creating a `VMServiceScrape` or a `VMRule` will not achieve anything on its own. The `vmagent` and `vmalert` components must be configured to *watch* for them. 

This linkage is defined back in your root configuration (either a standalone `VMAgent`/`VMAlert` CRD, or within your `VMCluster` CRD). You must provide label selectors that tell the agents which resources to pick up.

```text
[ VMAgent/VMCluster CRD ]
       |
       |  serviceScrapeSelector:
       |    matchLabels:
       |      discovery: enabled
       v
+-----------------------------------+
| Kubernetes API Server             |
|                                   |
|  [VMServiceScrape]                |
|    labels: discovery=enabled  <------ Picked up by vmagent
|                                   |
|  [VMServiceScrape]                |
|    labels: team=frontend      <------ Ignored (labels don't match)
+-----------------------------------+
```

To configure this pipeline, you add the selector definitions to your agent or cluster specifications:

```yaml
# Inside your VMAgent or VMCluster spec:
spec:
  # Instructs vmagent to discover VMServiceScrapes globally
  serviceScrapeSelector:
    matchLabels:
      discovery: enabled
  
  serviceScrapeNamespaceSelector:
    matchExpressions:
    - key: name
      operator: Exists

  # Instructs vmalert to discover VMRules
  ruleSelector:
    matchLabels:
      role: alert-rules
```

By standardizing on specific labels (e.g., requiring all valid metric scrapes to carry the label `discovery: enabled`), SRE teams can establish a self-service monitoring platform. Development teams can drop their own `VMServiceScrape` and `VMRule` manifests into their application namespaces, and the `vm-operator` will automatically route the configurations to the central monitoring pipeline without human intervention.

## 19.4 Upgrading the Cluster via the Operator

Upgrading a distributed, stateful database cluster is traditionally one of the most nerve-wracking tasks for an infrastructure team. It usually involves meticulously draining nodes, coordinating downtime, and crossing fingers that data corruption does not occur during restarts. The `vm-operator` transforms this high-risk procedure into a declarative, automated, and routine operation.

Because the operator understands the intricate dependencies between the ingestion, storage, and query tiers, it can orchestrate zero-downtime rolling upgrades safely.

### The Declarative Upgrade Process

In a Kubernetes-native environment managed by the `vm-operator`, you do not SSH into servers to replace binaries. Instead, an upgrade is simply a change to the desired state of your `VMCluster` Custom Resource. 

To initiate an upgrade, you modify the `image.tag` or `version` field within your CRD manifest to point to the new VictoriaMetrics release version.

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMCluster
metadata:
  name: example-vmcluster
  namespace: monitoring
spec:
  # Upgrading the Storage Tier
  vmstorage:
    replicaCount: 3
    image:
      repository: victoriametrics/vmstorage
      tag: "v1.93.0" # <-- Update this to the new version (e.g., v1.94.0)
    # ... other configurations ...

  # Upgrading the Ingestion Tier
  vminsert:
    replicaCount: 2
    image:
      repository: victoriametrics/vminsert
      tag: "v1.93.0" # <-- Update this

  # Upgrading the Query Tier
  vmselect:
    replicaCount: 2
    image:
      repository: victoriametrics/vmselect
      tag: "v1.93.0" # <-- Update this
```

Once the modified YAML is applied (`kubectl apply -f vmcluster.yaml`), the operator detects the drift between the current running pods and the new desired configuration and immediately begins the reconciliation loop.

### How the Operator Orchestrates the Rollout

The `vm-operator` does not simply restart everything at once. It follows a strict sequence utilizing Kubernetes `RollingUpdate` strategies to ensure that metrics continue to be ingested and queries continue to be served throughout the process.

Here is the step-by-step flow of how the operator handles the rollout:

1. **Stateless Tiers First (Optional but common):** The operator updates the `Deployment` manifests for `vmselect` and `vminsert`. 
2. **Pod Replacement:** Kubernetes spins up a new pod with the new version alongside the old ones.
3. **Readiness Gates:** The operator waits for the new pod's `/health` endpoint to return a successful status.
4. **Traffic Shifting:** Once healthy, the Kubernetes Service routes traffic to the new pod, and the old pod is gracefully terminated.
5. **Stateful Storage Upgrade:** For `vmstorage`, the StatefulSet is updated. Kubernetes upgrades these pods sequentially (typically in reverse ordinal order, e.g., `vmstorage-2`, then `vmstorage-1`, then `vmstorage-0`).

```text
[ Rolling Upgrade of vmstorage StatefulSet ]

Time (t=0)  [ Pod 0 (v1.93) ]  [ Pod 1 (v1.93) ]  [ Pod 2 (v1.93) ]  <- All healthy

Time (t=1)  [ Pod 0 (v1.93) ]  [ Pod 1 (v1.93) ]  [ Pod 2 (Terminating..) ]

Time (t=2)  [ Pod 0 (v1.93) ]  [ Pod 1 (v1.93) ]  [ Pod 2 (v1.94 - Starting) ]

Time (t=3)  [ Pod 0 (v1.93) ]  [ Pod 1 (v1.93) ]  [ Pod 2 (v1.94 - Ready) ]
                  |                  |
                  v                  v
            (Process repeats for Pod 1, then Pod 0)
```

Because `vminsert` routes data to all available `vmstorage` nodes, if one storage node is down for an upgrade, data is buffered or routed to the remaining active nodes (depending on your replication settings), ensuring no data is dropped.

### Upgrading the Operator Itself

Often, VictoriaMetrics releases updates to the `vm-operator` itself to support new CRD features or Kubernetes versions. It is a best practice to keep the operator updated. 

When you upgrade the `vm-operator` deployment (via Helm or static manifests), it will automatically update its bundled Custom Resource Definitions. By default, a new version of the operator might also carry a new default VictoriaMetrics image tag. If you have not hardcoded the `image.tag` in your `VMCluster` (allowing the operator to manage the version), upgrading the operator will subsequently trigger a rolling upgrade of your entire VictoriaMetrics cluster to that new default version.

### Safety Checks and Best Practices

While the operator makes upgrades seamless, you should still adhere to database administration best practices:

* **Review the Changelog:** Always read the official VictoriaMetrics release notes. Look specifically for breaking changes, deprecated command-line flags, or changes in metric storage formats. If a flag you use in `extraArgs` was deprecated, the new pods will enter a `CrashLoopBackOff` state.
* **Ensure High Availability (HA):** Zero-downtime upgrades are only possible if you have `replicaCount: 2` or higher for your components. A single-node `vmstorage` cluster will experience downtime during the pod restart.
* **Verify Cluster Health:** Never start an upgrade if the cluster is already degraded, experiencing OOM (Out of Memory) kills, or has a high volume of pending data in the `vmagent` buffers.
* **Snapshot the Data:** For major version bumps, utilize the `vmbackup` tool to take an instant snapshot of your `vmstorage` data before applying the new CRD configuration.

## 19.5 Overview of Official Helm Charts

While the `vm-operator` excels at managing the lifecycle and state of VictoriaMetrics components through Custom Resource Definitions (CRDs), administrators still need a mechanism to deploy the operator itself, provision default dashboards, and package auxiliary services. This is where **Helm**, the package manager for Kubernetes, enters the ecosystem.

Helm and the `vm-operator` are not mutually exclusive; in fact, they are highly complementary. Helm acts as the delivery vehicle, while the operator acts as the autonomous pilot once the software is deployed.

### The VictoriaMetrics Helm Chart Ecosystem

The official VictoriaMetrics Helm repository (`[https://victoriametrics.github.io/helm-charts/](https://victoriametrics.github.io/helm-charts/)`) maintains several distinct charts tailored to different deployment philosophies. They can be broadly categorized into two groups: Operator-driven charts and Standalone charts.

```text
                      [ VictoriaMetrics Helm Repository ]
                                      |
          +---------------------------+---------------------------+
          |                                                       |
[ Operator-Driven Charts ]                              [ Standalone Charts ]
(Recommended for Production)                           (For isolated use cases)
          |                                                       |
  - victoria-metrics-k8s-stack                            - victoria-metrics-cluster
  - victoria-metrics-operator                             - victoria-metrics-single
                                                          - victoria-metrics-agent
```

#### 1. The Standalone Charts
Charts like `victoria-metrics-cluster` or `victoria-metrics-single` deploy the database components directly using raw Kubernetes StatefulSets and Deployments, bypassing the `vm-operator` entirely. While useful for teams explicitly avoiding CRDs, this approach lacks the automated lifecycle management, seamless upgrades, and dynamic scrape discovery provided by the operator.

#### 2. The `victoria-metrics-operator` Chart
This is the foundational chart for a cloud-native deployment. It installs the `vm-operator` Deployment, configures the necessary RBAC (Roles and RoleBindings) allowing the operator to interact with the Kubernetes API, and registers the VictoriaMetrics CRDs (`VMCluster`, `VMRule`, etc.) into your cluster.

#### 3. The `victoria-metrics-k8s-stack` Chart
This is the flagship Helm chart and the recommended entry point for new enterprise deployments. It is designed as a direct, drop-in replacement for the popular `kube-prometheus-stack`. 

Instead of just deploying the database, the `k8s-stack` chart deploys an entire, pre-configured observability platform:
*   The `vm-operator` itself.
*   A default `VMCluster` or `VMSingle` instance (managed by the operator).
*   **kube-state-metrics:** For Kubernetes object metrics (Pod status, Deployment replicas).
*   **prometheus-node-exporter:** For hardware and OS metrics from K8s worker nodes.
*   **Grafana:** Pre-wired to use VictoriaMetrics as its default datasource, bundled with dozens of community-vetted dashboards for cluster and application monitoring.
*   **Default Alerting Rules:** Hundreds of pre-configured `VMRule` manifests covering standard Kubernetes failure modes (e.g., PodCrashLooping, HighCPUUtilization).

### Deploying the Kubernetes Stack

Deploying the complete observability stack via Helm requires adding the repository and passing a configuration file (`values.yaml`).

First, register the official repository:

```bash
helm repo add vm https://victoriametrics.github.io/helm-charts/
helm repo update
```

Next, prepare your `values.yaml`. Because the `k8s-stack` chart utilizes the operator beneath the surface, you actually define your `VMCluster` specifications directly within the Helm values. Helm templates these values into the CRDs, which the operator then executes.

Here is an example `values.yaml` configuring a highly available cluster and enabling Grafana:

```yaml
# values.yaml
victoria-metrics-operator:
  createCRD: true

# Configure the VictoriaMetrics Cluster via the stack chart
vmcluster:
  enabled: true
  spec:
    retentionPeriod: "30d"
    vmstorage:
      replicaCount: 3
      storage:
        volumeClaimTemplate:
          spec:
            resources:
              requests:
                storage: 100Gi
    vmselect:
      replicaCount: 2
    vminsert:
      replicaCount: 2

# Enable and configure Grafana
grafana:
  enabled: true
  adminPassword: "secure-admin-password"
  ingress:
    enabled: true
    hosts:
      - grafana.internal.mycompany.com

# Enable default Kubernetes monitoring rules and scrapers
defaultDashboardsEnabled: true
kubeApiServer:
  enabled: true
kubelet:
  enabled: true
```

Execute the deployment using the Helm install command:

```bash
helm install vms vm/victoria-metrics-k8s-stack \
  --namespace monitoring \
  --create-namespace \
  -f values.yaml
```

### Managing Infrastructure as Code (IaC)

Integrating these Helm charts into modern GitOps workflows (such as ArgoCD or Flux) provides the ultimate operational maturity. 

In a GitOps paradigm:
1.  Your infrastructure team commits changes to the `values.yaml` file in a Git repository (e.g., increasing `vmstorage` replicas from 3 to 5).
2.  ArgoCD detects the Git commit and renders the Helm chart into Kubernetes manifests (which include the updated `VMCluster` CRD).
3.  ArgoCD applies the updated CRD to the Kubernetes cluster.
4.  The `vm-operator` detects the CRD update and performs a safe, rolling expansion of the storage tier.

By utilizing Helm to package the deployment and the `vm-operator` to execute the state changes, administrators achieve a self-documenting, version-controlled, and automated VictoriaMetrics architecture.