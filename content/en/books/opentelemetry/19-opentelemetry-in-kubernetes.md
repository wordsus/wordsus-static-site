Kubernetes is the standard for modern deployments, but its ephemeral nature creates steep observability challenges. This chapter bridges the gap between **application telemetry** and **infrastructure state**. We explore seamlessly deploying the **OpenTelemetry Operator** to manage pipelines at scale. You will learn to automate zero-code instrumentation via mutating webhooks, capture critical cluster events, and enrich signals with vital Kubernetes metadata. This deep correlation is essential for rapidly isolating whether a production failure stems from your code or the underlying orchestration layer.

## 19.1 Deploying the OpenTelemetry Kubernetes Operator

While deploying the OpenTelemetry Collector using standard Kubernetes manifests (like `Deployment` or `DaemonSet`) is entirely possible, managing configuration updates, sidecar injection, and version upgrades across a large cluster quickly becomes an operational burden. The OpenTelemetry Kubernetes Operator solves this by extending the Kubernetes API using Custom Resource Definitions (CRDs). It acts as a dedicated controller that understands how to deploy and manage OpenTelemetry components natively.

The Operator serves two primary functions:
1.  **Collector Management:** It manages the lifecycle of the OpenTelemetry Collector, allowing you to define the Collector's configuration, scaling, and deployment mode (e.g., Deployment, DaemonSet, StatefulSet, or Sidecar) through a single CRD.
2.  **Workload Auto-Instrumentation:** It utilizes mutating admission webhooks to inject auto-instrumentation libraries (Java, Python, Node.js, etc.) directly into application pods at creation time without requiring changes to the application's Docker image or deployment manifests.

### Prerequisites: Cert-Manager

Because the Operator relies heavily on mutating admission webhooks to validate Collector configurations and inject auto-instrumentation, it requires TLS certificates to communicate securely with the Kubernetes API server. The officially recommended and most straightforward way to provision these certificates is by installing `cert-manager`.

If `cert-manager` is not already present in your cluster, you must install it before deploying the Operator:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
```

*Note: Always verify the latest compatible version of cert-manager in the OpenTelemetry Operator documentation.*

### Installing the Operator via Helm

The most robust method for deploying the OpenTelemetry Operator in production is via its official Helm chart. Helm simplifies the installation and allows for easy configuration overrides using a `values.yaml` file.

First, add the OpenTelemetry Helm repository:

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
```

Next, install the Operator into a dedicated namespace (e.g., `opentelemetry-operator-system`). By default, the Helm chart will also install the necessary CRDs.

```bash
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  --set "manager.collectorImage.repository=otel/opentelemetry-collector-contrib"
```

In the command above, setting the `manager.collectorImage.repository` to the `contrib` distribution ensures that when the Operator provisions Collectors, they default to using the comprehensive set of receivers, processors, and exporters discussed in Part IV of this book.

### Operator Architecture Overview

Once deployed, the Operator continuously watches for changes to its specific Custom Resources. Here is a high-level logical view of the Operator's architecture within the cluster:

```text
+-------------------------------------------------------------------------+
|                          Kubernetes API Server                          |
+-------------------------------------------------------------------------+
       |                  |                             |
   (Watches)         (Mutates/Validates)            (Manages)
       |                  |                             |
       v                  v                             v
+-------------+   +-------------------+    +------------------------------+
| OpenTelemetry |   | Mutating Webhook  |    |     OpenTelemetryCollector     |
|  CRDs       |   | (Instrumentation) |    |            (CRD)               |
+-------------+   +-------------------+    +------------------------------+
       ^                  |                             |
       |                  | (Injects sidecars/env vars) | (Spawns Pods)
       |                  v                             v
+------------------------------------+     +------------------------------+
|      OpenTelemetry Operator        |     |       Collector Pod(s)       |
|      (Controller Manager)          |     | (DaemonSet, Deployment, etc) |
+------------------------------------+     +------------------------------+
```

### Deploying a Collector using the CRD

With the Operator running, you no longer write standard Kubernetes `Deployment` manifests for the Collector. Instead, you declare an `OpenTelemetryCollector` custom resource. The Operator reads this resource and automatically generates the underlying Kubernetes objects (Deployments, ConfigMaps, Services, etc.) based on the `mode` you specify.

The `mode` property maps directly to the deployment models discussed in Chapter 12:
* `deployment`: Creates a standard Kubernetes Deployment (stateless gateway).
* `daemonset`: Creates a DaemonSet, ensuring one Collector runs on every node (agent model).
* `statefulset`: Creates a StatefulSet, typically used for tail-based sampling or stateful processing.
* `sidecar`: Instructs the Operator to inject the Collector as a container directly into specific application pods.

Below is an example of an `OpenTelemetryCollector` resource configured to run as a DaemonSet. Notice how the `config` block accepts the standard YAML structure you would use in a standalone Collector configuration file:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: cluster-collector
  namespace: observability
spec:
  mode: daemonset
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
          http:
      hostmetrics:
        collection_interval: 10s
        scrapers:
          cpu:
          memory:

    processors:
      batch:
      memory_limiter:
        check_interval: 1s
        limit_percentage: 75
        spike_limit_percentage: 15

    exporters:
      otlp:
        endpoint: "gateway-collector.observability.svc.cluster.local:4317"
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
        metrics:
          receivers: [otlp, hostmetrics]
          processors: [memory_limiter, batch]
          exporters: [otlp]
```

When you apply this manifest (`kubectl apply -f collector.yaml`), the Operator intercepts the request, validates the OpenTelemetry configuration block, creates a `ConfigMap` containing the parsed configuration, and provisions the `DaemonSet`. If you later modify the `config` block and reapply the manifest, the Operator will automatically handle rolling out the configuration change to the running Collector pods.

## 19.2 Injecting Auto-Instrumentation via Mutating Webhooks

One of the most powerful capabilities of the OpenTelemetry Kubernetes Operator is its ability to seamlessly add observability to existing applications without requiring developers to alter their Docker images or write instrumentation code. This "zero-code" approach is achieved by leveraging a core Kubernetes feature: **Mutating Admission Webhooks**.

When a request to create a Pod reaches the Kubernetes API server, admission controllers can intercept, validate, or modify the request before it is persisted to `etcd`. The OpenTelemetry Operator registers a mutating webhook that watches for newly created Pods containing specific annotations. When it detects a matching Pod, it dynamically modifies the Pod's configuration on the fly to inject the necessary OpenTelemetry auto-instrumentation libraries and environment variables.

### The `Instrumentation` Custom Resource

Before the Operator can inject anything, it needs to know *what* to inject (which language agents) and *how* to configure them (where to send the telemetry). This is defined using the `Instrumentation` Custom Resource Definition (CRD).

The `Instrumentation` resource acts as a centralized configuration template. You can create multiple `Instrumentation` resources within your cluster (e.g., one per namespace or one cluster-wide default) to tailor settings for different environments or application groups.

Here is an example of an `Instrumentation` resource tailored for a typical environment:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: default-instrumentation
  namespace: application-ns
spec:
  exporter:
    endpoint: http://cluster-collector.observability.svc.cluster.local:4317
  propagators:
    - tracecontext
    - baggage
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
```

In this configuration, we define the OTLP endpoint pointing to the Collector we deployed in the previous section. We also establish distributed tracing defaults (context propagation mechanisms and a 25% sampling rate) and specify the container images containing the auto-instrumentation agents for Java and Node.js.

### Opting-In via Pod Annotations

The Operator does not blindly instrument every Pod in the cluster. It operates on an opt-in basis (though namespace-level opt-in is possible). Application developers trigger the injection by adding an `instrumentation.opentelemetry.io/inject-<language>` annotation to their Pod template definition.

Supported language annotations include `inject-java`, `inject-nodejs`, `inject-python`, `inject-dotnet`, and `inject-go` (via eBPF). 

Below is an example of a standard Java Spring Boot Deployment opting into OpenTelemetry auto-instrumentation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: application-ns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment
  template:
    metadata:
      labels:
        app: payment
      annotations:
        # Instructs the Operator to inject the Java agent using 
        # the 'default-instrumentation' CRD in this namespace.
        instrumentation.opentelemetry.io/inject-java: "true"
    spec:
      containers:
      - name: payment-app
        image: internal-registry.example.com/payment-service:v1.4.2
        ports:
        - containerPort: 8080
```

### The Anatomy of Injection: What Actually Happens?

To truly master the Operator, you must understand what happens under the hood when the mutating webhook processes the annotated Pod request. The Operator essentially rewrites the Pod specification.

```text
+-----------------------------------------------------------------------------------+
|                              The Mutated Pod Object                               |
|                                                                                   |
|  [Init Container: opentelemetry-auto-instrumentation]                             |
|  Action: cp /javaagent.jar /otel-auto-instrumentation/javaagent.jar               |
|                                     |                                             |
|                                     v                                             |
|  [Shared EmptyDir Volume: otel-auto-instrumentation]  <--- JAR file resides here  |
|                                     |                                             |
|                                     v                                             |
|  [Application Container: payment-app]                                             |
|  Injected Environment Variables:                                                  |
|    - JAVA_TOOL_OPTIONS: "-javaagent:/otel-auto-instrumentation/javaagent.jar"     |
|    - OTEL_SERVICE_NAME: "payment-service" (Derived from Deployment name)          |
|    - OTEL_EXPORTER_OTLP_ENDPOINT: "http://cluster-collector..."                   |
|    - OTEL_RESOURCE_ATTRIBUTES: "k8s.pod.name=...,k8s.namespace.name=..."          |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

When you query the running Pod (`kubectl get pod payment-service-... -o yaml`), you will observe the following injected components:

1.  **An `initContainer`:** The Operator injects an init container using the image specified in the `Instrumentation` CR. This container's sole purpose is to copy the instrumentation agent (e.g., `opentelemetry-javaagent.jar`) into a shared volume.
2.  **An `emptyDir` Volume:** A temporary directory is created and mounted into both the `initContainer` and your main application container.
3.  **Environment Variables:** The Operator injects crucial OpenTelemetry environment variables directly into your application container. 
    * It automatically configures language-specific loading mechanisms. For Java, it sets `JAVA_TOOL_OPTIONS` to load the javaagent from the shared volume. For Node.js, it sets `NODE_OPTIONS=--require`.
    * It translates the `Instrumentation` CRD settings into standard OTel environment variables like `OTEL_EXPORTER_OTLP_ENDPOINT`.
    * Crucially, it auto-detects and injects Kubernetes resource attributes (like Pod name, Node name, and ReplicaSet name) into `OTEL_RESOURCE_ATTRIBUTES`, ensuring your telemetry is deeply contextualized within your Kubernetes environment.

This architectural pattern ensures that your core application container remains pristine and decoupled from the specific version of the observability agent, shifting the operational burden of upgrading telemetry agents from the application developers to the platform engineers managing the OpenTelemetry Operator.

## 19.3 Collecting Advanced Kubernetes Cluster Metrics and Events

While application-level telemetry (traces and application metrics) provides visibility into the behavior of your software, it is often insufficient for diagnosing infrastructure-related outages. If a service degrades because its underlying Pod was throttled for CPU, or if an application is completely unavailable because the Kubernetes scheduler cannot find a node with adequate memory, application instrumentation alone will not surface the root cause. 

To achieve comprehensive observability in Kubernetes, you must collect infrastructure telemetry directly from the control plane and the node agents. The OpenTelemetry Collector facilitates this through three specialized receivers: the `kubeletstats` receiver, the `k8s_cluster` receiver, and the `k8sevents` receiver.

### Architectural Strategy: DaemonSet vs. Singleton

Before configuring these receivers, it is critical to understand *where* they should be deployed. Collecting cluster telemetry requires a bifurcated deployment strategy to prevent massive data duplication and excessive load on the Kubernetes API server.

1.  **The Agent Pattern (DaemonSet):** Metrics specific to individual nodes and the containers running on them must be collected by a Collector running locally on that specific node. 
2.  **The Singleton Pattern (Deployment):** Global cluster state and events must be collected by a single Collector instance (usually a Deployment with `replicas: 1` or a StatefulSet) to ensure the data is only scraped and exported once.

```text
+---------------------------------------------------------------------------------+
|                               Kubernetes Cluster                                |
|                                                                                 |
|  +-----------------------+              +------------------------------------+  |
|  | Kubernetes API Server | <---Watches--| OTel Collector (Deployment: 1 Rep) |  |
|  +-----------------------+              | ---------------------------------- |  |
|          ^                              | * k8s_cluster_receiver             |  |
|          |                              | * k8sevents_receiver               |  |
|          |                              +------------------------------------+  |
|          |                                                |                     |
|          | (Node/Pod state)                               | (Exports to Backend)|
|          v                                                v                     |
|  +---------------------------------------------------------------------------+  |
|  | Node 1                                                                    |  |
|  |  +---------+   +------------------------------------+                     |  |
|  |  | Kubelet |<--| OTel Collector (DaemonSet Agent)   |                     |  |
|  |  +---------+   | ---------------------------------- |                     |  |
|  |                | * kubeletstats_receiver            |                     |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

### 1. Node and Container Metrics: The `kubeletstats` Receiver

The `kubeletstats` receiver pulls metrics directly from the Kubelet's REST API (typically port 10250) running on each node. It retrieves highly granular data about node resource utilization, volume usage, and individual container metrics (leveraging cAdvisor under the hood). 

Because it needs to communicate with the local Kubelet, this receiver is always configured in your **DaemonSet** Collector.

```yaml
# configuration for the DaemonSet Collector
receivers:
  kubeletstats:
    collection_interval: 20s
    auth_type: "serviceAccount"
    endpoint: "https://${env:K8S_NODE_NAME}:10250"
    insecure_skip_verify: true
    metric_groups:
      - node
      - pod
      - container
      - volume
```

*Note: In the configuration above, the `${env:K8S_NODE_NAME}` variable relies on the Kubernetes Downward API injecting the node's name into the Collector Pod's environment variables.*

### 2. Cluster State Metrics: The `k8s_cluster` Receiver

If you have historically used Prometheus, you are likely familiar with `kube-state-metrics`. The `k8s_cluster` receiver serves the exact same purpose natively within OpenTelemetry. It watches the Kubernetes API server and generates metrics representing the current state of Kubernetes resources—such as how many Pods are in a `Pending` state, whether Deployments have met their target replica counts, and the condition of Nodes.

Because this receiver queries the global API, it must be run in your **Singleton Deployment** Collector. Running it in a DaemonSet would result in every node reporting the exact same global cluster state, multiplying your metric volume by the number of nodes in your cluster.

```yaml
# configuration for the Singleton Deployment Collector
receivers:
  k8s_cluster:
    collection_interval: 30s
    auth_type: serviceAccount
    node_conditions_to_report: [Ready, MemoryPressure, DiskPressure]
    allocatable_types_to_report: [cpu, memory, ephemeral-storage]
```

### 3. Capturing the Lifecycle: The `k8sevents` Receiver

Kubernetes Events are crucial for troubleshooting. They record lifecycle occurrences such as Pod evictions (`Evicted`), out-of-memory kills (`OOMKilled`), image pull failures (`ErrImagePull`), and scheduling delays. 

However, Kubernetes Events are ephemeral; by default, the API server purges them after one hour to save `etcd` storage. The `k8sevents` receiver solves this by watching the API server for new events and translating them into **OpenTelemetry Log records**. This allows you to export them to long-term storage (like Elasticsearch, Loki, or OpenSearch) where they can be correlated with your application logs and traces.

Like the cluster receiver, this must run in your **Singleton Deployment**.

```yaml
# configuration for the Singleton Deployment Collector
receivers:
  k8sevents:
    auth_type: serviceAccount
    namespaces:
      # If omitted, watches all namespaces
      - default
      - production

service:
  pipelines:
    logs/events:
      receivers: [k8sevents]
      processors: [batch]
      exporters: [otlp/backend]
```

### A Note on RBAC Permissions

Collecting advanced cluster metrics is fundamentally different from receiving OTLP data pushed by an application. These receivers actively reach out and query Kubernetes APIs. Therefore, the `ServiceAccount` associated with your OpenTelemetry Collector pods must be granted the appropriate permissions via a `ClusterRole` and `ClusterRoleBinding`.

For the `kubeletstats` receiver, the DaemonSet requires permissions to access the `/stats/summary` endpoint of the nodes. For the `k8s_cluster` and `k8sevents` receivers, the Singleton Deployment requires `get`, `list`, and `watch` permissions on resources like `pods`, `nodes`, `events`, `deployments`, `replicasets`, and `namespaces`. When using the OpenTelemetry Helm chart or the Operator, these RBAC rules can generally be auto-generated by enabling the respective receiver flags in the deployment values.

## 19.4 Correlating K8s Pod Metadata with Application Telemetry

When investigating a spike in 500 errors or a sudden drop in application throughput, application-level traces and metrics only tell half the story. To locate the root cause in a dynamic environment, you must be able to pivot from an application trace directly to the underlying infrastructure. Is the error isolated to a single Pod? Is it affecting all Pods on a specific Node experiencing network packet loss? Is it isolated to a particular Kubernetes namespace or ReplicaSet?

To answer these questions, your telemetry data must be enriched with Kubernetes metadata. OpenTelemetry achieves this by appending standardized Resource Attributes (defined by the OpenTelemetry Semantic Conventions) to your telemetry signals, such as `k8s.pod.name`, `k8s.namespace.name`, `k8s.node.name`, and `k8s.deployment.name`. 

There are two primary mechanisms for injecting these attributes into your telemetry pipeline: at the source via the Downward API, or at the Collector via the `k8sattributes` processor.

### Method 1: Source-Level Injection (Downward API)

If you are using the OpenTelemetry Kubernetes Operator for auto-instrumentation (as covered in Section 19.2), this correlation is largely handled for you. The Operator's mutating webhook configures the injected container to use the Kubernetes Downward API. 

The Downward API allows Kubernetes to expose Pod and cluster information to running containers via environment variables. The Operator maps these variables into the `OTEL_RESOURCE_ATTRIBUTES` environment variable.

```yaml
# Conceptual view of what the Operator injects into your Pod spec
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "k8s.pod.name=$(POD_NAME),k8s.namespace.name=$(POD_NAMESPACE),k8s.node.name=$(NODE_NAME)"
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
```

When the OpenTelemetry SDK initializes inside the application, it reads this environment variable and attaches these attributes to every Span, Metric, and Log record it generates.

### Method 2: Collector-Level Enrichment (`k8sattributes` Processor)

Source-level injection is effective, but it has limitations. It requires mutating the Pod specification, and it cannot easily capture dynamic metadata like Kubernetes labels or annotations, which might change after the Pod starts. Furthermore, manually instrumented applications might not be configured to read the Downward API.

For a more robust and comprehensive approach, the industry standard is to enrich telemetry at the OpenTelemetry Collector using the `k8sattributes` processor.

#### How the `k8sattributes` Processor Works

The `k8sattributes` processor leverages the principle of IP matching. When an application sends telemetry to the Collector, the Collector inspects the incoming network request to determine the origin IP address (the Pod's IP). Simultaneously, the processor watches the Kubernetes API to maintain a real-time cache mapping Pod IPs to their current metadata.

```text
+---------------------+
|   Application Pod   |
|  (IP: 10.244.1.15)  |
+---------------------+
           |
           | 1. Sends trace (No K8s attributes)
           v
+-------------------------------------------------------------+
|                  OpenTelemetry Collector                    |
|                                                             |
|  [Receiver] --> [k8sattributes Processor] --> [Exporter]    |
|                          ^                                  |
|                          | 2. Matches IP (10.244.1.15)      |
|                          | 3. Appends k8s.* attributes      |
+-------------------------------------------------------------+
                           |
                           v (Watches API)
+-------------------------------------------------------------+
|                   Kubernetes API Server                     |
|  (Knows 10.244.1.15 is Pod 'payment-v2-abc', Node 'node-1') |
+-------------------------------------------------------------+
```

#### Configuring the Processor

Because the `k8sattributes` processor needs to match the origin IP of the telemetry, it is most effectively deployed in a **DaemonSet Collector** (Agent model). If you run it in a centralized Gateway Collector, the telemetry might be routed through a load balancer or service mesh proxy first, obfuscating the original Pod IP.

Here is an example configuration for the `k8sattributes` processor:

```yaml
processors:
  k8sattributes:
    # 1. Instructs the processor to use the connection IP for matching
    passthrough: false 
    extract:
      # 2. Defines which metadata fields to attach as Resource Attributes
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.pod.start_time
      # 3. Extracts custom Kubernetes labels and annotations
      labels:
        - tag_name: app.label.version
          key: app.kubernetes.io/version
          from: pod
    # 4. Filters to only cache metadata for Pods on the local node (DaemonSet optimization)
    filter:
      node_from_env_var: K8S_NODE_NAME
```

### The Value of Correlated Telemetry

Once your telemetry reaches your observability backend (e.g., Jaeger, Prometheus, or a commercial vendor), these Kubernetes attributes transform how you query and interact with your data.

1.  **Topology Mapping:** Observability tools can use attributes like `k8s.deployment.name` and `k8s.namespace.name` to automatically draw architecture diagrams, showing exactly how different microservices communicate.
2.  **Slicing and Dicing:** You can execute queries such as "Show me the 99th percentile latency for the `checkout` service, but *only* for Pods running version `v2.1.0` (via labels) on nodes in the `us-east-1a` availability zone."
3.  **Cost Attribution:** By correlating application metrics (like requests processed) with Kubernetes namespace labels (like `team: payment-processing`), platform engineering teams can accurately allocate cloud infrastructure costs to specific business units based on actual usage.