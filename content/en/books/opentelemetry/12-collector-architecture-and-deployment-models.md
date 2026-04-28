Instrumenting applications is only the first step; routing that telemetry efficiently to your observability backends is a distinct architectural challenge. The OpenTelemetry Collector acts as the vendor-agnostic engine bridging this gap. In this chapter, we transition from the application layer to infrastructure management. We will explore the critical decisions behind deploying the Collector—evaluating localized agents versus centralized gateways—and dissect the internal ingest, process, and export pipelines. Finally, we will cover optimizing your security and resource footprint by compiling bespoke Collector binaries.

## 12.1 Deploying as an Agent (DaemonSet/Sidecar) vs. Gateway

The OpenTelemetry Collector is distributed as a single, compiled binary, yet its role within your infrastructure is entirely dictated by where you place it and how you configure it. Because the Collector decoupled telemetry extraction from data transmission, architecting its deployment is one of the most critical decisions in your observability strategy. 

Broadly, Collector deployments fall into two primary architectural patterns: the **Agent** model and the **Gateway** model. While they can be used in isolation, enterprise environments almost universally combine them.

### The Agent Model (Local Deployment)

In the Agent pattern, the Collector is deployed geographically or logically close to the application emitting the telemetry. This typically takes one of two forms in containerized environments:

1.  **Sidecar:** The Collector runs as a container within the exact same Pod (or task definition) as the application. There is a 1:1 relationship between application instances and Collectors.
2.  **DaemonSet (Host Agent):** The Collector runs as a background service on the host operating system or as a DaemonSet in Kubernetes. There is a 1:N relationship: one Collector serves all application instances running on that specific physical or virtual node.

The primary directive of the Agent is to act as a localized offloading point. Applications do not need to manage complex retry logic, batching, or authentication to external vendors; they simply fire-and-forget their OTLP payloads to `localhost` or the local node IP.

```text
+---------------------------------------------------+
| Node / Host                                       |
|                                                   |
|  +-------+    +-------+           +------------+  |
|  | App A |    | App B |           | OTel Agent |  |
|  | (SDK) |    | (SDK) |           | (DaemonSet)|  |
|  +---+---+    +---+---+           +------+-----+  |
|      |            |                      |        |
|      +------------+-----(localhost)------+        |
+---------------------------------------------------+
```

**Advantages of the Agent Model:**
* **Simplicity for Applications:** SDKs can be configured with default local endpoints (e.g., `127.0.0.1:4317`), completely decoupling the application from the ultimate telemetry destination.
* **Rich Infrastructure Context:** A host-level Agent inherently knows which node it is running on. It can easily scrape host metrics (CPU, memory, disk) and append infrastructure-specific resource attributes (like `host.name` or `k8s.pod.uid`) to incoming application telemetry before forwarding it.
* **Network Efficiency:** If network partitions occur, the local Agent can buffer data in memory or on the local disk, preventing application memory from bloating.

**Disadvantages of the Agent Model:**
* **Resource Overhead:** Running hundreds or thousands of sidecars or node agents consumes cumulative CPU and memory across the cluster.
* **Configuration Sprawl:** Updating processing logic or changing destination endpoints requires rolling out updates to thousands of Agent instances.
* **Limited Processing Scope:** Because an Agent only sees a fraction of the system's traffic (just its local node or pod), it *cannot* perform cluster-wide aggregations or global tail-based sampling.

### The Gateway Model (Centralized Deployment)

In the Gateway pattern, the Collector is deployed as a standalone, scalable cluster (often as a Kubernetes Deployment behind a Service/Load Balancer). Applications or downstream Agents send their data over the network to this centralized tier.

```text
                            +-------------------+
                            |  Load Balancer    |
                            +---------+---------+
                                      |
                 +--------------------+--------------------+
                 |                    |                    |
        +--------+-------+   +--------+-------+   +--------+-------+
        |  OTel Gateway  |   |  OTel Gateway  |   |  OTel Gateway  |
        |   Instance 1   |   |   Instance 2   |   |   Instance 3   |
        +--------+-------+   +--------+-------+   +--------+-------+
                 |                    |                    |
                 +--------------------+--------------------+
                                      |
                             [Observability Backend]
```

**Advantages of the Gateway Model:**
* **Centralized Configuration and Security:** API keys, authentication tokens for observability vendors, and TLS certificates are managed centrally. Agents and applications do not need access to external credentials.
* **Advanced Processing:** Since the Gateway cluster receives telemetry from the entire infrastructure, it has a holistic view. This is mandatory for stateful operations like Tail-Based Sampling (where the decision to keep a trace is made only after the trace completes) and span-to-metrics generation.
* **Data Routing and Redaction:** It serves as a central firewall for telemetry, dropping sensitive PII, enforcing global rate limits, and routing specific signals to different backends (e.g., metrics to Prometheus, traces to Jaeger, billing logs to an S3 bucket).

**Disadvantages of the Gateway Model:**
* **Single Point of Failure:** If the Gateway cluster goes down or the load balancer is misconfigured, all telemetry from the infrastructure is dropped.
* **Network Traffic:** Telemetry must traverse the network to reach the Gateway, potentially incurring cross-AZ egress costs if not architected carefully.

### The Standard Enterprise Architecture: Agent + Gateway

In production environments, it is rarely an "either/or" decision. The industry standard pattern chains these deployments together. 

Applications send OTLP to a lightweight local **Agent** (handling immediate offloading and infrastructure enrichment). The Agent forwards this partially processed data to the central **Gateway** cluster (handling heavy processing, data masking, vendor authentication, and tail-based sampling). Finally, the Gateway exports to the observability backends.

#### Configuration Differences

The deployment model directly influences how you configure the Collector's receivers and exporters. 

**Agent Configuration Snippet:**
An Agent typically listens on local interfaces and exports to the internal Gateway over gRPC without TLS (relying on internal network security).

```yaml
# agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317" # Receives from local apps

exporters:
  otlp/gateway:
    endpoint: "otel-gateway.observability.svc.cluster.local:4317"
    tls:
      insecure: true # Internal cluster traffic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp/gateway]
```

**Gateway Configuration Snippet:**
A Gateway receives from Agents, requires heavier memory configurations, and handles the secure export to external vendors.

```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317" # Receives from Agents via Load Balancer

exporters:
  otlp/vendor:
    endpoint: "ingest.vendor.com:443"
    headers:
      "x-api-key": "${env:VENDOR_API_KEY}" # Centralized secret management

service:
  pipelines:
    traces:
      receivers: [otlp]
      # Incorporates tail-based sampling and attribute redaction
      processors: [memory_limiter, attributes/redact_pii, tail_sampling, batch]
      exporters: [otlp/vendor]
```

### Deployment Model Comparison Matrix

To summarize the decision space, evaluate the two models against these operational dimensions:

| Capability | Local Agent (Sidecar/DaemonSet) | Central Gateway (Cluster/Deployment) |
| :--- | :--- | :--- |
| **Primary Goal** | Fast offloading, host metrics, metadata enrichment. | Centralized processing, routing, and vendor authentication. |
| **Resource Footprint** | Small per instance, but multiplied by total nodes/pods. | Large per instance, but isolated to a few dedicated nodes. |
| **Credential Management**| Difficult. Requires distributing vendor API keys to every node. | **Ideal.** Secrets are isolated to the Gateway cluster. |
| **Tail-Based Sampling** | **Impossible.** Agents only see partial trace fragments. | **Required.** The Gateway aggregates the full trace. |
| **Network Resilience** | High. Buffers locally if the network to the backend drops. | Medium. If the Gateway drops, Agents must buffer data. |

## 12.2 Dissecting Collector Pipelines: Ingest, Process, Export

At the heart of the OpenTelemetry Collector is a unidirectional, stage-driven data processing engine known as the pipeline. While the Collector supports dozens of plugins, they do nothing until they are explicitly instantiated and wired together. Understanding how to construct these pipelines is essential for ensuring data integrity, optimizing performance, and preventing regressions in your observability infrastructure.

Pipelines are always defined per telemetry signal: **traces**, **metrics**, or **logs**. You cannot mix signal types within a single pipeline; a metric cannot flow through a trace processor. However, you can configure multiple pipelines of the same signal type to handle different routing requirements.

Every pipeline consists of three distinct phases: **Ingest (Receivers)**, **Process (Processors)**, and **Export (Exporters)**.

```text
+-----------------------------------------------------------------------+
|                       OpenTelemetry Collector                         |
|                                                                       |
|                     [ Internal Memory Format (pdata) ]                |
|                                                                       |
|  +-------------+       +-------------------------+       +---------+  |
|  |             |       |       PROCESSORS        |       |         |  |
|  |  RECEIVERS  | ----> | 1. memory_limiter       | ----> | EXPORTER|  |
|  |  (OTLP,     |       | 2. attributes/redaction |       | (Vendor,|  |
|  |   Prom,     |       | 3. filter/routing       |       |  OTLP)  |  |
|  |   Jaeger)   |       | 4. batch                |       |         |  |
|  |             |       +-------------------------+       |         |  |
|  +-------------+                                         +---------+  |
+-----------------------------------------------------------------------+
```

### 1. Ingest: Receivers

Receivers dictate how data gets into the Collector. They can operate in two modes:
* **Push-based:** The receiver opens a network port and listens for incoming payloads (e.g., the OTLP receiver listening on gRPC port 4317).
* **Pull-based:** The receiver actively reaches out to external systems to scrape data (e.g., the Prometheus receiver scraping a `/metrics` endpoint, or the Host Metrics receiver querying the host OS).

**The Translation Boundary:** A critical architectural feature of receivers is translation. Whether a receiver ingests Jaeger Thrift, Zipkin JSON, or Prometheus text format, it immediately translates that incoming payload into the Collector's unified internal memory representation, known as `pdata` (Pipeline Data). Because of `pdata`, your processors do not need to care what protocol was originally used to send the telemetry.

### 2. Process: Processors

Processors are the mutators and filters of the pipeline. They sit between receivers and exporters, taking in `pdata`, applying logic, and passing the mutated `pdata` to the next step. 

**Order is strictly enforced.** The order in which you define processors in your pipeline array dictates the exact sequence of execution. A misordered processor chain can lead to out-of-memory (OOM) errors or dropped telemetry. 

While custom processors can be built for specific business logic, the industry-standard sequence for production pipelines follows this pattern:

1.  **`memory_limiter` (Mandatory First Step):** Monitors the Collector's memory usage and drops data or forces garbage collection if thresholds are breached, preventing the Collector from crashing the node.
2.  **Enrichment/Mutation (`attributes`, `resource`):** Appending cluster names, environment tags, or redacting Personally Identifiable Information (PII) before the data is batched.
3.  **Filtering (`filter`, `tail_sampling`):** Dropping spans or metrics that are unnecessary (e.g., dropping health check endpoint traces) to save backend costs.
4.  **`batch` (Mandatory Last Step):** Accumulates individual spans, metrics, or log records over a specific time window or size limit before sending them to the exporter. Batching drastically reduces network overhead and prevents overwhelming backend APIs.

### 3. Export: Exporters

Exporters handle the final phase: translating the internal `pdata` back into a specific protocol (like OTLP, Datadog, Prometheus, or Elasticsearch) and transmitting it to its final destination.

Exporters inherently rely on the `batch` processor from the previous stage to ensure they are transmitting optimally sized payloads. Most standard exporters utilize the Collector's "Exporter Helper," a built-in library that automatically handles **retry logic**, **timeouts**, and **sending queues**. If a backend system experiences momentary downtime, the exporter queue will buffer the batched data (in memory or on disk) and employ exponential backoff to retry the transmission.

### Constructing the Pipeline: The `service` Block

To bring these components to life, they must be declared in their respective sections and then explicitly linked in the `service::pipelines` block. 

A component can be defined but never used if it isn't added to a pipeline. Conversely, **Fan-in** and **Fan-out** patterns are natively supported: multiple receivers can feed a single pipeline (Fan-in), and a single pipeline can broadcast to multiple exporters (Fan-out).

Here is how a complete pipeline is structured in configuration:

```yaml
# 1. Instantiate the Components
receivers:
  otlp:
    protocols:
      grpc:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'collector-self-scrape'
          static_configs:
            - targets: ['0.0.0.0:8888']

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1000
  attributes/redact:
    actions:
      - key: user.email
        action: hash
  batch:
    send_batch_size: 8192
    timeout: 1s

exporters:
  otlp/vendor_a:
    endpoint: "vendor-a.com:443"
  otlp/vendor_b:
    endpoint: "vendor-b.com:443"

# 2. Wire the Components into Pipelines
service:
  pipelines:
    # A trace pipeline demonstrating Fan-out (exporting to two vendors)
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, batch]
      exporters: [otlp/vendor_a, otlp/vendor_b]
      
    # A metrics pipeline demonstrating Fan-in (receiving from OTLP and Prometheus)
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [otlp/vendor_a]
```

## 12.3 Generating Custom Binaries with the OpenTelemetry Collector Builder (ocb)

While downloading a pre-compiled OpenTelemetry Collector binary is the fastest way to get started, it is rarely the optimal deployment strategy for a mature enterprise environment. The OpenTelemetry community provides two primary distributions: **Core** (which contains only foundational components) and **Contrib** (which contains hundreds of community-contributed receivers, processors, and exporters). 

Deploying the full Contrib distribution introduces several architectural risks:
* **Security Attack Surface:** The Contrib binary includes hundreds of Go modules spanning integrations for AWS, GCP, Azure, countless databases, and proprietary vendors. If a vulnerability (CVE) is discovered in an integration you aren't even using, your security scanners will still flag your Collector, forcing emergency patching.
* **Binary Bloat:** The compiled Contrib binary frequently exceeds 150MB. In large-scale DaemonSet deployments, pulling and storing this image across thousands of nodes wastes network bandwidth and storage.
* **Memory Overhead:** Even if components are unconfigured, their underlying libraries and initialization routines can incrementally consume memory.

To solve this, the OpenTelemetry project provides the **OpenTelemetry Collector Builder (`ocb`)**. This CLI tool allows you to compile a bespoke Collector binary containing *only* the specific components your infrastructure requires.

### The Build Workflow

The `ocb` tool acts as an orchestrator. It does not compile the binary itself; rather, it reads a declarative manifest, dynamically generates the necessary Go boilerplate code (`main.go`, `components.go`), and then invokes the local Go compiler to produce the final executable.

```text
[ builder-config.yaml ]
         |
         | (1. Read Manifest)
         v
  +-------------+
  |     ocb     | ---> (2. Generate Go Code: main.go, go.mod)
  | (CLI Tool)  |
  +-------------+
         |
         | (3. Invoke `go build`)
         v
  [ Go Compiler ] ---> (4. Fetch strictly required modules)
         |
         v
[ custom-otelcol ]
 (Lean, Secure, Optimized Binary)
```

### Creating the Build Manifest

The foundation of the `ocb` process is the build manifest, conventionally named `builder-config.yaml`. This file strictly defines the Collector's version and explicitly lists the Go module paths for the exact components you want to include.

Here is an example manifest tailored for a Gateway Collector that only needs to receive OTLP, process data with standard batching/memory limiting, and export to an external OTLP vendor and Prometheus:

```yaml
# builder-config.yaml
dist:
  name: my-custom-collector
  description: "Bespoke Gateway Collector for Production"
  output_path: ./build
  otelcol_version: 0.95.0 # The target base version of the Collector

receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.95.0

processors:
  - gomod: go.opentelemetry.io/collector/processor/memorylimiterprocessor v0.95.0
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.95.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/attributesprocessor v0.95.0

exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.95.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter v0.95.0

extensions:
  - gomod: go.opentelemetry.io/collector/extension/zpagesextension v0.95.0
```

> **Important Note:** Notice the distinct namespaces. Core components reside under `go.opentelemetry.io/collector/...`, while community components are sourced from `github.com/open-telemetry/opentelemetry-collector-contrib/...`. It is a strict best practice to ensure the version tags (e.g., `v0.95.0`) match identically across all components to prevent Go dependency conflicts during compilation.

### Executing the Build

To generate the binary, you must have Go installed on your build machine (or CI/CD runner) and download the `ocb` binary corresponding to your operating system.

Execute the build by passing the manifest to the `ocb` tool:

```bash
# Execute the builder
./ocb --config builder-config.yaml
```

The output will detail the generation and compilation process:

```text
2024-05-12T10:00:00Z INFO OpenTelemetry Collector Builder {"version": "0.95.0"}
2024-05-12T10:00:00Z INFO Parsing configuration...
2024-05-12T10:00:00Z INFO Generating source code...
2024-05-12T10:00:01Z INFO Compiling custom collector...
2024-05-12T10:00:05Z INFO Build complete! Binary located at ./build/my-custom-collector
```

### CI/CD Integration and Distribution

In an enterprise environment, this process should never be performed on a local developer machine. Instead, `ocb` should be integrated directly into your CI/CD pipelines.

A standard pipeline pattern involves:
1.  **Version Control:** Storing the `builder-config.yaml` in a Git repository.
2.  **Compilation Stage:** A CI runner (e.g., GitHub Actions, GitLab CI) running a standard Golang container executes `ocb`.
3.  **Containerization Stage:** A multi-stage Dockerfile takes the resulting static binary and injects it into a distroless or Alpine Linux image.
4.  **Distribution:** The resulting lean, highly secure Docker image (often weighing under 40MB) is pushed to the internal container registry, ready to be pulled by Kubernetes DaemonSets or Deployments. 

By taking ownership of the compilation process via `ocb`, platform teams drastically reduce their security burden and ensure that the Collector scales efficiently alongside the workloads it monitors.

## 12.4 Choosing Between Core and Contrib Distributions

If you decide not to build a bespoke Collector binary using the OpenTelemetry Collector Builder (`ocb`) as detailed in the previous section, your primary operational decision is selecting a pre-compiled distribution. The OpenTelemetry project officially maintains and publishes two primary Docker images and binaries: **Core** (`otelcol`) and **Contrib** (`otelcol-contrib`).

Understanding the architectural boundaries between these two distributions is critical for managing your infrastructure's footprint, security posture, and vendor lock-in.

### The Core Distribution (`otelcol`)

The Core distribution is the upstream foundation of the Collector. It is maintained directly by the core OpenTelemetry governance committee and is designed to be as lean and strictly standardized as possible.

**What it includes:**
* **Essential Receivers:** OTLP (gRPC/HTTP), Prometheus, Jaeger, Zipkin, and Host Metrics.
* **Standard Processors:** `memory_limiter`, `batch`, `filter`, and basic `attributes` manipulation.
* **Fundamental Exporters:** OTLP, Prometheus, logging (stdout), and File.

**When to use it:**
The Core distribution is ideal for internal routing tiers where telemetry is exclusively spoken in the OTLP standard. If your applications emit OTLP, and your backend vendor natively accepts OTLP, you do not need third-party plugins. Deploying Core keeps your attack surface minimal and your memory footprint low. It is also the designated baseline if you plan to write your own custom processors.

### The Contrib Distribution (`otelcol-contrib`)

The Contrib distribution is a massive superset of Core. It includes the entire Core distribution, plus hundreds of community-maintained and vendor-contributed components. 

```text
+-------------------------------------------------------------------+
|                   otelcol-contrib (Superset)                      |
|                                                                   |
|  [Vendor Exporters]   [Database Receivers]   [Cloud Integrations] |
|  (Datadog, Splunk)    (MySQL, Redis, Kafka)  (AWS X-Ray, GCP)     |
|                                                                   |
|       +---------------------------------------------------+       |
|       |                 otelcol (Core)                    |       |
|       |                                                   |       |
|       |       [OTLP Receiver/Exporter]  [Prometheus]      |       |
|       |       [Memory Limiter]          [Batch]           |       |
|       +---------------------------------------------------+       |
+-------------------------------------------------------------------+
```

**What it includes:**
* **Vendor Exporters:** Proprietary exporters for almost every commercial observability backend (Datadog, Dynatrace, Honeycomb, Splunk, New Relic, etc.).
* **Infrastructure Receivers:** Components to scrape databases (PostgreSQL, MongoDB), message queues (RabbitMQ, Kafka), and web servers (Nginx, Apache).
* **Advanced Processors:** Tail-based sampling, complex routing, span metrics generation, and PII redaction capabilities.

**When to use it:**
Contrib is the default choice for Proof of Concepts (PoCs) and rapid onboarding. If you are mandated to scrape legacy infrastructure components or if your observability vendor requires a proprietary exporter rather than standard OTLP, you must use Contrib (or build a custom binary containing those specific Contrib modules).

### Decision Matrix

When architecting your deployment, evaluate the trade-offs between the two distributions using the following operational dimensions:

| Dimension | Core (`otelcol`) | Contrib (`otelcol-contrib`) |
| :--- | :--- | :--- |
| **Binary Size** | ~40 MB | ~150+ MB |
| **Security Posture** | **High.** Minimal attack surface; highly vetted code. | **Moderate.** Huge dependency tree; higher risk of third-party CVEs. |
| **Vendor Neutrality** | Strict. Forces reliance on the open OTLP standard. | Flexible. Allows proprietary vendor protocols. |
| **Memory Footprint**| Extremely low baseline. | Higher baseline due to initialized library overhead. |
| **Best Use Case** | Pure OTLP architectures, Edge Gateways. | Legacy infra scraping, vendor-specific exporting, PoCs. |

### The Third Path: Vendor Distributions

It is worth noting a prevalent third option in the enterprise landscape: **Vendor-packaged Distributions**. 

Major cloud providers and observability platforms often fork the OpenTelemetry Collector, package it with their specific Contrib exporters, strip out competitors' exporters, and provide native support agreements for it. Examples include the AWS Distro for OpenTelemetry (ADOT) or the Splunk OpenTelemetry Collector.

If your organization has an exclusive contract with a specific cloud provider or observability vendor, utilizing their supported distribution can simplify compliance and guarantee that your Collector versions align perfectly with their backend ingestion APIs. However, this re-introduces a degree of vendor lock-in that the core OpenTelemetry project was designed to eliminate. 

**Architectural Recommendation:** Start your journey with the `otelcol-contrib` distribution to prove the value of OpenTelemetry in your environment. As your deployment scales to production and your pipeline topology solidifies, transition to generating a custom, hardened binary (via `ocb`) that strips away the unused bloat of Contrib while retaining the exact custom processors your business logic demands.