Every pipeline begins with ingestion. In the OpenTelemetry Collector, receivers act as the front door, accepting, pulling, and translating diverse telemetry into a unified internal memory model. Before data can be processed or exported, it must cross this boundary.

This chapter explores this foundational role. We will configure the native OTLP receiver for modern apps, integrate third-party receivers to ingest Prometheus and FluentBit data, and scrape host infrastructure metrics. Finally, we will cover the network and security practices required to protect these critical ingestion endpoints.

## 13.1 Configuring the Native OTLP Receiver

The OpenTelemetry Protocol (OTLP) receiver is the foundational ingestion point for the OpenTelemetry Collector. Because OTLP is the native, vendor-agnostic protocol defined by the OpenTelemetry specification (as covered in Chapter 3), this receiver is universally supported and is the recommended default for receiving telemetry data from your instrumented applications.

Unlike third-party receivers that translate proprietary formats into the Collector's internal memory model, the OTLP receiver directly accepts traces, metrics, and logs formatted as OTLP Protobuf or JSON. It supports two primary transport protocols: gRPC and HTTP.

### Minimal Configuration

At its most basic, enabling the OTLP receiver requires defining it under the `receivers` section of your Collector configuration and specifying the transport protocols you wish to enable. If you provide empty configuration blocks for the protocols, the Collector will bind them to their default ports.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:
```

By default, this minimal configuration binds the gRPC receiver to `0.0.0.0:4317` and the HTTP receiver to `0.0.0.0:4318`. 

### Configuring the gRPC Transport

The gRPC protocol is highly recommended for backend service-to-Collector communication due to its efficiency, connection multiplexing, and binary serialization. 

When configuring the gRPC block, the most common adjustment is the `endpoint`. You can also configure connection parameters such as maximum receive message sizes, which is crucial for applications that generate massive trace payloads containing deep span event histories.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        max_recv_msg_size_mib: 16
        max_concurrent_streams: 100
        read_buffer_size: 524288
```

* **`endpoint`**: Defines the network interface and port. Binding to `0.0.0.0` allows external connections, whereas `localhost:4317` or `127.0.0.1:4317` restricts ingestion to local traffic (useful in sidecar deployments).
* **`max_recv_msg_size_mib`**: Overrides the default 4 MiB limit. Increase this if your applications send large batches of telemetry or heavily enriched spans.
* **`max_concurrent_streams`**: Limits the number of concurrent gRPC streams per client connection to prevent resource exhaustion.

### Configuring the HTTP Transport

While gRPC is optimal for backend services, HTTP (often using Protobuf payloads, though JSON is supported) is essential for environments where gRPC is blocked by firewalls, load balancers, or when ingesting telemetry directly from web browsers (as explored in Chapter 10).

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"
        cors:
          allowed_origins:
            - "https://foo.example.com"
            - "https://*.test.com"
          allowed_headers:
            - "Example-Header"
          max_age: 7200
```

The HTTP block introduces configurations specific to web traffic:
* **`cors`**: Cross-Origin Resource Sharing (CORS) is mandatory if you are ingesting telemetry directly from web applications operating on different domains. Without explicitly defining `allowed_origins`, browser security policies will block OTLP HTTP requests from reaching the Collector.
* **`max_age`**: Caches the preflight response for a specified number of seconds, reducing the overhead of `OPTIONS` requests on high-traffic browser endpoints.

### Application to Receiver Flow

The relationship between the application's SDK and the Collector's OTLP receiver is straightforward but requires port alignment. The following diagram illustrates the network boundaries and ingestion paths:

```text
+-----------------------+                    +---------------------------------------+
|  Instrumented App     |                    |  OpenTelemetry Collector              |
|  (OTel SDK)           |                    |                                       |
|                       |    gRPC (4317)     |  +---------------------------------+  |
|  +-----------------+  |===================>|  | receivers:                      |  |
|  | OTLP Exporter   |  |                    |  |   otlp:                         |  |
|  +-----------------+  |    HTTP (4318)     |  |     protocols:                  |  |
|                       |------------------->|  |       grpc: {endpoint: ...}     |  |
|                       |                    |  |       http: {endpoint: ...}     |  |
+-----------------------+                    |  +---------------------------------+  |
                                             |                  |                    |
                                             |                  v                    |
                                             |        (To Processors/Pipelines)      |
                                             +---------------------------------------+
```

### Enabling the Receiver in Pipelines

Defining the receiver in the `receivers` section does not automatically activate it. To begin ingesting data, the receiver must be referenced in the `service.pipelines` block. The native OTLP receiver is capable of handling all three telemetry signals: traces, metrics, and logs.

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]
```

By including `[otlp]` in multiple pipelines, the Collector multiplexes the incoming data stream, routing traces, metrics, and logs to their respective processing and exporting chains based on the signal type detected in the OTLP payload.

## 13.2 Utilizing Third-Party Receivers (Prometheus, FluentBit)

While the native OTLP receiver is the ideal ingestion point for modern, fully instrumented applications, enterprise environments are rarely uniform. A typical infrastructure footprint includes legacy applications, third-party infrastructure components (like databases and message queues), and existing observability agents. To achieve a unified telemetry pipeline, the OpenTelemetry Collector must bridge the gap between these disparate protocols and the OpenTelemetry standard.

Third-party receivers solve this by ingesting vendor-specific or legacy telemetry formats and translating them into the Collector's internal memory representation, known as `pdata` (Pipeline Data). Once translated, this data is indistinguishable from natively ingested OTLP data, allowing you to route, process, and export it uniformly.

*Note: The receivers discussed in this section are part of the `opentelemetry-collector-contrib` distribution. They are not included in the barebones `core` release.*

### The Prometheus Receiver: Embracing the Pull Model

The OpenTelemetry architecture is primarily push-based. However, the Prometheus ecosystem is famously pull-based (scraping). The Prometheus receiver bridges this paradigm by allowing the Collector to act as a Prometheus scraping client.

Rather than reinventing the wheel, the Prometheus receiver directly embeds the core Prometheus scraping engine. This means you can reuse your existing Prometheus `scrape_configs` line-for-line within the Collector's configuration.

```yaml
receivers:
  prometheus:
    config:
      global:
        scrape_interval: 15s
        scrape_timeout: 10s
      scrape_configs:
        - job_name: 'kubernetes-apiservers'
          kubernetes_sd_configs:
            - role: endpoints
          scheme: https
          tls_config:
            ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        - job_name: 'legacy-app-metrics'
          static_configs:
            - targets: ['10.0.0.5:8080', '10.0.0.6:8080']
```

When the receiver pulls data, it performs a crucial translation step. Prometheus time-series data (which lacks strict OTel concepts like Resources or specific Aggregation Temporalities) is mapped to the OpenTelemetry Metric Data Model. For example:
* Prometheus `Gauge` becomes an OTel `Gauge`.
* Prometheus `Counter` becomes an OTel `Sum` with monotonic and cumulative properties.
* Prometheus `Summary` and `Histogram` map to their respective OTel equivalents.

**Important Consideration:** Because the Collector is scraping stateful metric endpoints, deploying multiple Collector instances with the exact same Prometheus receiver configuration will result in duplicate scrapes. In clustered environments like Kubernetes, you must implement the Target Allocator (discussed further in Chapter 19) to shard the scraping workload across the Collector fleet.

### The Fluent Forward Receiver: Ingesting Legacy Logs

Before OpenTelemetry defined its logging signal, Fluentd and FluentBit were the industry standards for log collection and routing. Many organizations have massive deployments of FluentBit acting as DaemonSets on Kubernetes nodes, tailing files and enriching container logs.

Tearing out these robust FluentBit deployments is often unfeasible. Instead, you can configure FluentBit to forward its logs to the OpenTelemetry Collector using the `fluentforward` receiver. This receiver implements the Fluentd Forward Protocol, accepting TCP-based payload submissions.

```yaml
receivers:
  fluentforward:
    endpoint: "0.0.0.0:24224"
```

In your existing FluentBit configuration, you simply point a `Forward` output plugin at the Collector's address:

```ini
[OUTPUT]
    Name          forward
    Match         *
    Host          otel-collector.observability.svc.cluster.local
    Port          24224
```

The Collector ingests the Fluentd events, maps the Fluentd tags and metadata to OpenTelemetry Resource and Log Record attributes, and converts the payload into the OTLP Log data model.

### Architecture: The Universal Translation Layer

The true power of the Collector lies in its ability to normalize these diverse inputs. The following diagram illustrates how the Collector sits at the center of a heterogeneous environment, normalizing pull-based metrics, push-based logs, and native OTLP telemetry into a single, unified pipeline stream.

```text
  EXTERNAL SYSTEMS                      OPENTELEMETRY COLLECTOR
                                        
+-------------------+                   +-----------------------------------+
| Prometheus Target |    HTTP Pull      | Receivers                         |
| (e.g., node_exprt)| <---------------- | +---------------+                 |
+-------------------+                   | | prometheus    |--+              |
                                        | +---------------+  |   +-------+  |
+-------------------+   Fluent Fwd      | +---------------+  |   | pdata |  |
| FluentBit Agent   | ----------------> | | fluentforward |--+=> | (OTLP |  |
| (Tailing /var/log)|    TCP Push       | +---------------+  |   |  Mem) |  |
+-------------------+                   | +---------------+  |   +-------+  |
                                        | | otlp          |--+              |
+-------------------+   gRPC / HTTP     | +---------------+                 |
| Modern App        | ----------------> |                                   |
| (OTel SDK)        |                   +-----------------------------------+
+-------------------+                             |
                                                  v
                                          (To Processors)
```

### Unifying the Pipeline

Once configured, these third-party receivers are integrated into the `service.pipelines` section alongside your native OTLP receiver. You can mix and match receivers within a single pipeline, allowing a processor (like the `batch` processor) to bundle Prometheus metrics and OTLP metrics together before exporting them to your backend.

```yaml
service:
  pipelines:
    metrics:
      # Combining native OTLP metrics with scraped Prometheus metrics
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [otlp/metrics_backend]
    
    logs:
      # Combining native OTLP logs with legacy FluentBit logs
      receivers: [otlp, fluentforward]
      processors: [memory_limiter, batch]
      exporters: [otlp/logs_backend]
```

## 13.3 Scraping Host and Infrastructure System Metrics

Application-level telemetry provides deep visibility into code execution, but without understanding the underlying infrastructure, diagnosing performance degradation is often impossible. A memory leak in an application is only critical when the host runs out of physical memory; high latency might be the direct result of CPU throttling at the hypervisor level.

To bridge this gap, OpenTelemetry provides the `hostmetrics` receiver. Available in the `contrib` distribution, this receiver eliminates the need for legacy infrastructure monitoring agents like Telegraf or Prometheus Node Exporter by pulling telemetry directly from the operating system.

### How the Hostmetrics Receiver Works

Unlike the OTLP receiver (which waits for data to be pushed) or the Prometheus receiver (which pulls data over a network), the `hostmetrics` receiver interfaces directly with local operating system APIs (such as `/proc` and `/sys` on Linux, or WMI/Performance Counters on Windows). 

Because of this direct OS interaction, the `hostmetrics` receiver mandates a specific deployment topology: **it must be run as a local agent**. You cannot deploy a centralized Collector Gateway and configure it to scrape remote hosts using this receiver. It must be deployed as a `systemd` service on virtual machines or as a `DaemonSet` on Kubernetes nodes.

The following diagram illustrates this topology, where local agent Collectors gather both application OTLP data and host metrics, forwarding them to a centralized gateway:

```text
+-----------------------+         +-----------------------+
| Node 1 (VM/Baremetal) |         | Node 2 (VM/Baremetal) |
|                       |         |                       |
|  +-----------------+  |         |  +-----------------+  |
|  | App (OTel SDK)  |  |         |  | App (OTel SDK)  |  |
|  +--------+--------+  |         |  +--------+--------+  |
|           | OTLP      |         |           | OTLP      |
|           v           |         |           v           |
|  +-----------------+  |         |  +-----------------+  |
|  | OTel Collector  |  |         |  | OTel Collector  |  |
|  | (Agent Mode)    |  |         |  | (Agent Mode)    |  |
|  |                 |  |         |  |                 |  |
|  | [hostmetrics] <----|-- OS    |  | [hostmetrics] <----|-- OS
|  +--------+--------+  |         |  +--------+--------+  |
+-----------|-----------+         +-----------|-----------+
            |                                 |
            |           OTLP (gRPC)           |
            +---------------------------------+
                            |
                            v
                  +-------------------+
                  | OTel Collector    |
                  | (Gateway Mode)    |
                  +-------------------+
```

### Configuring Scrapers

The `hostmetrics` receiver is modular. It uses individual "scrapers" for different subsystems (CPU, memory, disk, network, etc.). You must explicitly enable the scrapers you want to use.

Here is a comprehensive configuration for a typical Linux host:

```yaml
receivers:
  hostmetrics:
    collection_interval: 15s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
      disk:
      filesystem:
        exclude_mount_points:
          match_type: strict
          mount_points: [/dev, /proc, /sys, /run]
      network:
      load:
      paging:
      process:
        mute_process_name_error: true
```

* **`collection_interval`**: Determines how often the Collector polls the OS. 10 to 15 seconds is standard. Setting this too low (e.g., 1 second) can introduce unnecessary CPU overhead on the host.
* **`cpu` / `memory` / `disk`**: These basic scrapers gather overall system utilization. Notice that specific metrics, like `system.cpu.utilization`, can be explicitly enabled or disabled within a scraper's block.
* **`filesystem`**: Scrapes disk space usage. It is highly recommended to exclude virtual or ephemeral mount points (like `/proc` or `/dev` on Linux) to avoid noisy, irrelevant metrics.
* **`process`**: This scraper gathers CPU, memory, and disk I/O metrics *per running process*. 

### Managing Cardinality with the Process Scraper

While the `process` scraper is incredibly powerful for identifying "noisy neighbor" applications on a shared host, it introduces a significant risk: **metric cardinality explosion**. 

If your host runs hundreds of short-lived processes (e.g., cron jobs, container probes, bash scripts), the Collector will generate new time-series data for every single Process ID (PID). This can overwhelm your observability backend and inflate storage costs.

If you enable the `process` scraper, it is a best practice to pair it with a `filter` processor (covered in Chapter 14) to drop metrics for irrelevant system processes or to restrict metrics only to the specific application binaries you care about.

### Adding Host Metrics to the Pipeline

Once configured, the `hostmetrics` receiver is added exclusively to your metrics pipeline. It does not generate traces or logs.

```yaml
service:
  pipelines:
    metrics/infrastructure:
      receivers: [hostmetrics]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp/gateway]
```

*Note: In the pipeline above, the `resourcedetection` processor is included. When scraping host metrics, it is vital to automatically append resource attributes (like `host.name`, `cloud.region`, or `os.type`) so that the raw infrastructure metrics can be correlated with the specific machine that generated them.*

## 13.4 Managing Receiver Network Ports, Protocols, and Authentication

As the "front door" to your observability pipeline, receivers are the most exposed components of the OpenTelemetry Collector. If left unmanaged, a Collector can inadvertently expose sensitive internal networks, suffer from port conflicts, or become a vector for denial-of-service and data-poisoning attacks. Properly configuring network bindings, transport security, and authentication mechanisms is critical for enterprise deployments.

### Network Interface Binding and Port Management

By default, many receivers bind to `0.0.0.0`, meaning they listen on all available IPv4 network interfaces. While convenient for getting started, this is a security risk in production if the host machine is exposed to the public internet or untrusted subnets.

You can explicitly control interface binding by prefixing the port with an IP address in the `endpoint` configuration:

* **`localhost:<port>` or `127.0.0.1:<port>`**: Restricts the receiver to accept traffic only from the local machine. This is the recommended configuration when the Collector is deployed as a sidecar alongside an application container.
* **`<Private-IP>:<port>`**: Binds the receiver to a specific internal network interface (e.g., `10.0.1.15:4317`), isolating ingestion traffic from public-facing interfaces.

When running multiple receivers, port collisions are a common failure mode. Here is a quick reference for standard observability ports to avoid overlaps:

| Protocol / Receiver | Default gRPC Port | Default HTTP Port |
| :--- | :--- | :--- |
| **Native OTLP** | `4317` | `4318` |
| **Jaeger** | `14250` | `14268` (Thrift HTTP) |
| **Zipkin** | N/A | `9411` |
| **Prometheus (Scrape)** | N/A | `9090` (Target port varies) |
| **FluentForward** | `24224` (TCP) | N/A |

### Encrypting Traffic with TLS and mTLS

Transport Layer Security (TLS) ensures that telemetry data is encrypted in transit. This is vital when telemetry crosses untrusted networks, such as sending data from a remote data center to a centralized observability SaaS.

For receivers, you configure TLS within the specific protocol block. To establish **Mutual TLS (mTLS)**—where both the client and the Collector verify each other's certificates—you must provide the `client_ca_file` to validate incoming client certificates.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /etc/ssl/certs/collector.crt
          key_file: /etc/ssl/private/collector.key
          # The presence of client_ca_file enables mTLS
          client_ca_file: /etc/ssl/certs/internal-ca.crt
```

### Implementing Receiver Authentication

While TLS encrypts the connection, it does not inherently authorize the client to write data (unless strict mTLS is used). To validate identity, the Collector utilizes **Authentication Extensions**. 

In the OpenTelemetry architecture, receivers do not implement authentication logic themselves. Instead, they delegate this responsibility to centralized extensions. This decoupling allows you to define an authentication strategy once and apply it across multiple receivers.

The flow of an incoming request operates as follows:

```text
Client Application (OTLP Payload + Auth Token)
      |
      v
+-------------------------------------------------------+
|  Network Interface Binding (e.g., 0.0.0.0:4317)       |
+-------------------------------------------------------+
      |
      v
+-------------------------------------------------------+
|  TLS Termination (Decryption & Cert Validation)       |
+-------------------------------------------------------+
      | (If successful)
      v
+-------------------------------------------------------+
|  Authentication Extension (e.g., Bearer Token, OIDC)  | <-- Evaluates Headers
+-------------------------------------------------------+
      | (If authenticated)
      v
+-------------------------------------------------------+
|  Receiver Logic (Payload Translation -> pdata)        |
+-------------------------------------------------------+
```

#### Configuring an Authentication Extension

To secure a receiver, you must first define the authenticator in the `extensions` section, and then reference it within the receiver's configuration.

The following example demonstrates how to secure the OTLP receiver using the `bearertokenauth` extension (available in the contrib distribution), which validates a static token passed in the `Authorization: Bearer <token>` HTTP/gRPC header.

```yaml
extensions:
  # 1. Define the Authentication Extension
  bearertokenauth:
    scheme: "Bearer"
    # In production, use environment variables for secrets: ${env:API_TOKEN}
    bearer_token: "super-secret-ingestion-token"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        # 2. Attach the extension to the receiver
        auth:
          authenticator: bearertokenauth

service:
  # 3. Ensure the extension is enabled in the service block
  extensions: [bearertokenauth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
```

By linking the `bearertokenauth` extension to the OTLP gRPC protocol, the Collector will actively reject any incoming requests that lack the correct authorization header, returning an `HTTP 401 Unauthorized` or the gRPC equivalent `UNAUTHENTICATED` status code. More advanced extensions, such as `oidc`, can validate dynamically issued JSON Web Tokens (JWTs) against an external Identity Provider like Keycloak or Auth0.