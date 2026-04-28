The true power of OpenTelemetry lies in its vendor-neutral architecture. After instrumenting applications and processing telemetry through the Collector, that data must be routed to specialized backends for storage, querying, and visualization. 

This chapter explores how the Collector serves as the ultimate universal router. We will detail exporting metrics to Prometheus and Grafana Mimir, sending distributed traces to Jaeger and Tempo, routing logs to Elasticsearch and Loki, and seamlessly integrating with commercial SaaS platforms like Datadog and Honeycomb—all without altering a single line of your application's instrumentation code.

## 21.1 Exporting Metrics to Prometheus and Grafana Mimir

Integrating OpenTelemetry with the Prometheus ecosystem bridges the gap between the standardized, vendor-neutral OTLP format and one of the most widely adopted metric storage and querying engines in the cloud-native landscape. While OpenTelemetry and Prometheus share common goals, their underlying architectures—specifically regarding telemetry transmission (push vs. pull) and metric temporality (delta vs. cumulative)—present unique integration challenges. 

Grafana Mimir, as a highly scalable, multi-tenant, long-term storage backend for Prometheus, inherits these exact paradigms but also introduces modern native OTLP ingestion paths.

### Bridging the Push/Pull Divide

OpenTelemetry was designed with a heavy emphasis on a "push" architecture via OTLP, whereas Prometheus is fundamentally built around a "pull" (scrape) model. Furthermore, as discussed in Chapter 5, OpenTelemetry supports both Delta and Cumulative aggregation temporalities. Prometheus, however, strictly operates on Cumulative temporality. 

When exporting metrics from the OpenTelemetry Collector to Prometheus or Mimir, you must decide which architectural model fits your infrastructure:

```text
+--------------+        +----------------------------------+
|              |        |      OpenTelemetry Collector     |
|   OTel SDK   |--OTLP->|                                  |      +------------+
|  (App/Host)  | (Push) |  +----------------------------+  |<-(1)-| Prometheus |
|              |        |  |    prometheus (exporter)   |  | Pull +------------+
+--------------+        |  +----------------------------+  |
                        |                                  |      +------------+
                        |  +----------------------------+  |-(2)->| Prometheus/|
                        |  | prometheusremotewrite      |  | Push | Mimir      |
                        |  +----------------------------+  |      +------------+
                        |                                  |
                        |  +----------------------------+  |      +------------+
                        |  | otlp / otlphttp (exporter) |  |-(3)->| Mimir      |
                        |  +----------------------------+  | Push | (Native)   |
                        +----------------------------------+      +------------+
```

### 1. The `prometheus` Exporter (Pull Model)

If you are running a traditional Prometheus server that scrapes targets, you can configure the Collector to act as a Prometheus target. The `prometheus` exporter spins up an HTTP server within the Collector, exposing an endpoint (typically `/metrics`) that serves ingested OTLP metrics in the Prometheus text-based format.

During this translation, the Collector automatically normalizes OTLP metric names (e.g., converting dots to underscores) and translates OpenTelemetry resource attributes into a specialized `target_info` metric, aligning with OpenMetrics specifications.

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    send_timestamps: true
    metric_expiration: 120m
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

*Note: The `resource_to_telemetry_conversion` flag is crucial here. By default, Prometheus handles resource attributes as metadata. If your PromQL queries rely on filtering by OTel resource attributes (like `k8s.pod.name` or `service.name`), enabling this flag forces the Collector to append these resource attributes as standard Prometheus labels on every metric.*

### 2. The `prometheusremotewrite` Exporter (Push Model)

In highly distributed environments, ephemeral workloads (like serverless functions or short-lived Kubernetes jobs), or strict firewall configurations, scraping via a pull model is often unfeasible. Grafana Mimir, as well as Prometheus instances with `web.enable-remote-write` configured, accept metrics pushed via the Prometheus Remote Write API.

The `prometheusremotewrite` exporter performs the OTLP-to-Prometheus data model translation internally and pushes the resulting Snappy-compressed Protobuf payloads to the backend.

When pushing to Grafana Mimir, multi-tenancy is a primary concern. Mimir routes data to specific tenants based on the `X-Scope-OrgID` HTTP header. The Collector allows you to inject this header natively:

```yaml
exporters:
  prometheusremotewrite/mimir:
    endpoint: "https://mimir-gateway.internal.example.com/api/v1/push"
    headers:
      "X-Scope-OrgID": "tenant-production"
    tls:
      insecure: false
    # Optional: Enable exemplar forwarding for Metric-to-Trace correlation
    export_exemplars: true 

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite/mimir]
```

### 3. Native OTLP Ingestion in Mimir

Recent advancements in Grafana Mimir have introduced native support for ingesting OTLP directly, bypassing the need for remote write translation at the Collector level. This is the most efficient and strongly recommended path for modern deployments, as it offloads the translation overhead from your Collectors to the Mimir backend and preserves the fidelity of the OTLP payload for as long as possible.

To use this, you leverage the standard `otlphttp` (or `otlp` for gRPC) exporter, pointing it directly at Mimir's OTLP ingestion endpoints, while still providing the required tenancy headers.

```yaml
exporters:
  otlphttp/mimir:
    endpoint: "https://mimir-gateway.internal.example.com/otlp"
    headers:
      "X-Scope-OrgID": "tenant-production"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/mimir]
```

### Handling Temporality and Dropped Metrics

A critical operational edge-case when exporting to Prometheus/Mimir involves Delta temporality. If an OpenTelemetry SDK is configured to export Delta metrics (which is the default for some languages reporting to certain backends), the Prometheus translation layer inside the Collector will drop these metrics. Prometheus simply does not know how to ingest Delta counters directly.

If you cannot change the SDK configuration to output Cumulative metrics, you must utilize the `transform` processor or the `cumulativetodelta` (and vice-versa) concepts within the Collector's processing pipeline to accumulate those deltas into cumulatives before they reach the `prometheus` or `prometheusremotewrite` exporters. However, native OTLP ingestion in Mimir is increasingly capable of handling these temporality conversions server-side, further solidifying it as the preferred export method.

## 21.2 Integrating with Tracing Backends (Jaeger, Tempo, Zipkin)

While metrics provide macroscopic visibility into system health, distributed tracing is the microscope required to diagnose latency bottlenecks and complex transaction failures. OpenTelemetry standardizes the generation and collection of spans, but you still need a dedicated tracing backend to index, visualize, and query this highly relational data. 

The OpenTelemetry Collector acts as a universal router, capable of translating and exporting traces to various open-source backends, regardless of their native data models.

```text
+-------------------+       +------------------------------------+
|                   |       |      OpenTelemetry Collector       |
|    Applications   |       |                                    |
|   (OTel SDKs)     |--OTLP>|  +-----------+     +------------+  |--OTLP/gRPC--> [ Jaeger ]
|                   |       |  | Receivers | --> | Processors |  |
+-------------------+       |  +-----------+     +------------+  |--OTLP/HTTP--> [ Grafana Tempo ]
                            |                          |         |
                            |                    +------------+  |
                            |                    | Exporters  |  |--Zipkin/HTTP->[ Zipkin ]
                            |                    +------------+  |
                            +------------------------------------+
```

### 1. Jaeger: The CNCF Standard

Jaeger has long been the de facto open-source standard for distributed tracing. Historically, Jaeger utilized its own proprietary Thrift or JSON formats. However, Jaeger has fully embraced OpenTelemetry. Modern versions of Jaeger (specifically Jaeger v1.35+ and the newer Jaeger v2 architecture) natively ingest the OpenTelemetry Protocol (OTLP).

This native integration means you no longer need a dedicated Jaeger exporter in the Collector; you simply use the standard `otlp` exporter pointing to Jaeger's OTLP gRPC port (default `4317`) or HTTP port (default `4318`).

**Collector Configuration:**

```yaml
exporters:
  otlp/jaeger:
    endpoint: "jaeger-collector.observability.svc.cluster.local:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/jaeger]
```

*Note: When deploying Jaeger in production, ensure you are using a robust storage backend like Elasticsearch or Cassandra. In-memory storage is strictly for testing and will drop historical traces.*

### 2. Grafana Tempo: High-Scale, Object-Storage Tracing

Grafana Tempo takes a fundamentally different architectural approach compared to Jaeger. Instead of indexing every single field in a trace (which requires expensive database backends like Elasticsearch), Tempo only indexes the trace ID. The trace data itself is compressed and stored in cheap, highly scalable object storage (like AWS S3 or GCS). You rely on external signals—typically logs or metrics containing trace IDs (Exemplars)—to find the trace you need, and Tempo fetches it instantly.

Like Jaeger, Tempo natively ingests OTLP. If you are operating a multi-tenant environment, you must inject the `X-Scope-OrgID` header, similar to the Grafana Mimir configuration discussed in the previous section.

**Collector Configuration:**

```yaml
exporters:
  otlp/tempo:
    endpoint: "tempo-gateway.internal.example.com:4317"
    headers:
      "X-Scope-OrgID": "tenant-production"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
```

### 3. Zipkin: Legacy Integration and Translation

Zipkin is one of the oldest distributed tracing systems, predating both OpenTracing and OpenTelemetry. While newer projects often default to Jaeger or Tempo, Zipkin remains deeply entrenched in many enterprise architectures, particularly within the Java Spring Boot ecosystem.

Because Zipkin does not natively speak OTLP, the Collector must translate OTel's internal representation into the Zipkin JSON format (specifically Zipkin V2 API). The Collector achieves this using the dedicated `zipkin` exporter.

When translating to Zipkin, the Collector maps OpenTelemetry's Span Kinds (Client, Server, Producer, Consumer) to Zipkin's equivalent annotations (`cs`, `sr`, etc.) and converts standard resource attributes into Zipkin tags.

**Collector Configuration:**

```yaml
exporters:
  zipkin:
    endpoint: "http://zipkin.observability.svc.cluster.local:9411/api/v2/spans"
    format: json
    # Optional: timeout setting for the HTTP push
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [zipkin]
```

### Critical Processing Considerations for Traces

Regardless of the backend you choose, exporting traces requires strict pipeline hygiene to ensure data integrity and avoid overloading the destination:

* **The Batch Processor is Mandatory:** Tracing backends are designed to ingest bulk payloads, not thousands of individual HTTP/gRPC requests per second. Always configure the `batch` processor before exporting. It compresses multiple spans into a single payload, drastically reducing network overhead.
* **Retry on Failure:** Network blips or temporary backend unavailability can cause dropped traces. Implement retry mechanisms within your exporters (most OTel exporters support a `retry_on_failure` block) to queue and resend data during transient outages.
* **Tail-Based Sampling Awareness:** If you are using tail-based sampling (discussed in Chapter 16), the backend you choose does not impact the sampling logic, as sampling occurs *inside* the Collector before export. However, the backend must be sized according to the *post-sampled* throughput, not the raw ingested volume.

## 21.3 Connecting Logging Backends (Elasticsearch, OpenSearch, Loki)

Logging in OpenTelemetry brings standardization to what has historically been the most fragmented and unstructured observability signal. As detailed in Chapter 6, once disparate logs are ingested and mapped to the standardized OpenTelemetry Log Data Model, the Collector normalizes them. The final step in the pipeline is routing these structured log records to persistent storage for indexing and querying.

Because the underlying architectures of logging backends vary drastically—from highly indexed document databases to label-indexed object storage—the Collector plays a crucial role in translating the OTLP payload into the native formats expected by these systems.

```text
+-------------------+       +------------------------------------+
|                   |       |      OpenTelemetry Collector       |
|  Log Sources      |       |                                    |
| (Files, OTLP,     |------>|  +-----------+     +------------+  |--HTTP/JSON--> [ Elasticsearch/OpenSearch ]
|  FluentBit)       |       |  | Receivers | --> | Processors |  |
+-------------------+       |  +-----------+     +------------+  |--HTTP/Push--> [ Grafana Loki ]
                            |                          |         |
                            |                    +------------+  |
                            |                    | Exporters  |  |
                            |                    +------------+  |
                            +------------------------------------+
```

### 1. Elasticsearch and OpenSearch

Elasticsearch and its open-source fork, OpenSearch, are Lucene-based document databases. They excel at full-text search and complex querying across heavily indexed JSON documents. 

When exporting logs to these systems, the Collector flattens the nested OpenTelemetry Log Data Model (which separates Resource Attributes, Scope Attributes, and Log Records) into individual JSON documents. Both the `elasticsearch` and `opensearch` exporters handle this translation automatically. They also support dynamic index routing, allowing you to partition logs by date, service, or environment.

**Collector Configuration (Elasticsearch):**

```yaml
exporters:
  elasticsearch:
    endpoints: ["https://elasticsearch.internal.example.com:9200"]
    user: "otel-collector"
    password: "${env:ES_PASSWORD}"
    # Dynamically route logs to daily indices
    logs_index: "logs-otel-%{+YYYY.MM.dd}"
    # Optional: Use data streams instead of raw indices for better lifecycle management
    logs_dynamic_index:
      enabled: false 
```

**Collector Configuration (OpenSearch):**

The OpenSearch exporter configuration is structurally similar but relies on a slightly different internal HTTP client implementation. 

```yaml
exporters:
  opensearch:
    logs_index: "otel-v1"
    http:
      endpoint: "https://opensearch.internal.example.com:9200"
      tls:
        insecure: false
```

*Architectural Note: Because Lucene indices map schemas dynamically by default, a sudden influx of highly varied log attributes can cause a "mapping explosion," degrading cluster performance. Use the `transform` processor in your Collector pipeline to sanitize and standardize log attributes before they reach Elastic or OpenSearch.*

### 2. Grafana Loki

Grafana Loki takes an entirely different architectural approach. Inspired by Prometheus, Loki does not index the contents of the logs themselves. Instead, it groups log streams by a set of labels and compresses the raw log text into object storage. This makes Loki highly cost-effective and horizontally scalable, but it shifts the burden of parsing log lines to query time (via LogQL).

**The Traditional `loki` Exporter:**

Because Loki relies on labels to index streams, exporting OTLP logs requires explicitly defining which OpenTelemetry attributes should be promoted to Loki labels. If you promote too many high-cardinality attributes (like a `trace_id` or `user_id`), you will overwhelm Loki's index, mirroring the cardinality problems found in Prometheus.

The `loki` exporter allows you to map specific attributes safely:

```yaml
exporters:
  loki:
    endpoint: "http://loki-gateway.internal.example.com:3100/loki/api/v1/push"
    tenant_id: "tenant-production"
    # Essential: Map OTel attributes to Loki labels
    labels:
      attributes:
        k8s.namespace.name: "namespace"
        k8s.pod.name: "pod"
        service.name: "service"
      # Optionally, extract labels directly from the log body if it is structured JSON
      record:
        level: "level"

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

**Native OTLP Ingestion in Loki:**

Just as Mimir and Tempo evolved, recent versions of Loki (3.0+) have introduced native support for ingesting OTLP directly. This allows you to use the standard `otlphttp` or `otlp` (gRPC) exporters. 

When using native OTLP ingestion, Loki automatically handles the translation, promoting key resource attributes to labels based on its internal heuristics, and storing the rest of the structured OpenTelemetry log data as structured metadata alongside the log line. This drastically simplifies Collector configuration and prevents mapping drift.

```yaml
exporters:
  otlphttp/loki:
    endpoint: "http://loki-gateway.internal.example.com:3100/otlp"
    headers:
      "X-Scope-OrgID": "tenant-production"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/loki]
```

### Critical Processing Considerations for Logs

Log pipelines are notoriously high-volume. A single misconfigured application in debug mode can easily overwhelm your network or storage backend.

1. **Aggressive Batching:** Logs should never be exported one by one. The `batch` processor is non-negotiable here. Configure it to send large payloads (e.g., `send_batch_size: 10000`) to optimize connection reuse and compression ratios.
2. **Filtering at the Edge:** Use the `filter` processor to drop low-value logs (like routine health checks or verbose debug statements) *before* they reach the exporter. 
3. **Format Translation:** If your backend expects a specific timestamp format or requires certain fields to be present (e.g., a rigid `@timestamp` field for older Elasticsearch deployments), utilize the OpenTelemetry Transformation Language (OTTL) within the `transform` processor to mutate the logs inline prior to export.

## 21.4 Integrating with Commercial Platforms (Datadog, Honeycomb, Dynatrace)

The ultimate architectural promise of OpenTelemetry is absolute vendor neutrality. Historically, adopting a commercial observability platform required coupling your application code to proprietary vendor SDKs. If a contract negotiation failed or a better platform emerged, migrating meant a costly, months-long engineering effort to rip out and replace instrumentation.

By standardizing on OpenTelemetry, you decouple telemetry generation from telemetry storage and analysis. The OpenTelemetry Collector becomes the integration point, allowing you to route OTLP data to any commercial vendor simply by updating a few lines of configuration.

```text
+-------------------+       +------------------------------------+
|                   |       |      OpenTelemetry Collector       |
|    Applications   |       |                                    |
|   (OTel SDKs)     |--OTLP>|  +-----------+     +------------+  |--Translated--> [ Datadog ]
|                   |       |  | Receivers | --> | Processors |  |
+-------------------+       |  +-----------+     +------------+  |--Native OTLP-> [ Honeycomb ]
                            |                          |         |
                            |                    +------------+  |
                            |                    | Exporters  |  |--Native OTLP-> [ Dynatrace ]
                            |                    +------------+  |
                            +------------------------------------+
```

While many commercial vendors now support native OTLP ingestion, their internal data models and capabilities differ. Understanding these nuances is key to configuring the Collector correctly.

### 1. Datadog: Translation and Enrichment

Datadog was an early contributor to the OpenTelemetry project, but its backend predates the OTLP standard. Therefore, exporting to Datadog typically involves translating OTLP into Datadog's proprietary payload formats. 

This translation is handled by the dedicated `datadog` exporter, which is maintained in the `opentelemetry-collector-contrib` repository. This exporter maps OpenTelemetry resource attributes to Datadog tags, converts OTLP histograms into Datadog distributions (sketches), and ensures traces are formatted correctly for Datadog APM.

**Collector Configuration:**

```yaml
exporters:
  datadog:
    api:
      key: "${env:DD_API_KEY}"
      site: "datadoghq.com" # Or datadoghq.eu, us3.datadoghq.com, etc.
    metrics:
      histograms:
        send_aggregations: true
    traces:
      # Optional: Enable Datadog's specific trace indexing
      span_name_as_resource_name: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [datadog]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [datadog]
```

*Architectural Note: Datadog also provides the Datadog Agent, which can act as an OTLP receiver. However, using the OpenTelemetry Collector with the `datadog` exporter is the vendor-neutral path, keeping your deployment architecture completely agnostic of Datadog-specific binaries.*

### 2. Honeycomb: Native High-Cardinality OTLP

Honeycomb's architecture was built entirely around the concept of arbitrarily wide, high-cardinality events. This design philosophy aligns perfectly with OpenTelemetry's Span and Log data models.

Honeycomb is a "native" OTLP backend. It does not require a custom translation exporter; it directly ingests the standard OTLP protobuf format. You configure this using the standard `otlp` (gRPC) or `otlphttp` exporter, passing your Honeycomb API key via the `x-honeycomb-team` header.

**Collector Configuration:**

```yaml
exporters:
  otlp/honeycomb:
    endpoint: "api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${env:HONEYCOMB_API_KEY}"
      # Optional: Specify a dataset name (defaults to "unknown_service" if not set in OTel Resource)
      "x-honeycomb-dataset": "production-traces" 

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/honeycomb]
```

*Note: Honeycomb traditionally treats metrics as just another type of event. When sending OTLP metrics to Honeycomb, they are stored as discrete events in a dedicated metrics dataset, allowing you to query them using the same analytical engine used for traces.*

### 3. Dynatrace: Multi-Signal Native Ingestion

Dynatrace has also transitioned to support native OTLP ingestion for traces, metrics, and logs. Like Honeycomb, you utilize the standard `otlphttp` exporter. 

Dynatrace requires a specific tenant-based URL endpoint and an API token passed via the `Authorization` header. Because Dynatrace heavily relies on topological mapping (its "Smartscape" feature), ensuring that your OpenTelemetry Resource Attributes (like `host.name`, `k8s.pod.uid`, and `service.instance.id`) are accurately populated is critical for achieving full value within the Dynatrace UI.

**Collector Configuration:**

```yaml
exporters:
  otlphttp/dynatrace:
    # Replace {your-environment-id} with your Dynatrace tenant ID
    endpoint: "https://{your-environment-id}.live.dynatrace.com/api/v2/otlp"
    headers:
      Authorization: "Api-Token ${env:DT_API_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/dynatrace]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/dynatrace]
```

### Best Practices for Commercial Integrations

When hooking your pipeline to SaaS platforms, several operational realities must be managed:

1. **Secret Management:** Never hardcode API keys in the `config.yaml`. Always use environment variable substitution (`${env:API_KEY}`) injected via secure secrets management (e.g., Kubernetes Secrets, HashiCorp Vault).
2. **Batching and Rate Limits:** Commercial vendors enforce strict rate limits based on your pricing tier. The `batch` processor is essential to pack data efficiently and avoid hitting HTTP connection limits or 429 Too Many Requests errors.
3. **Data Filtering for Cost Control:** SaaS vendors charge based on ingested volume (GBs) or custom metric cardinality. Use the Collector's `filter` or `drop` processors (discussed in Chapter 14) at the edge to discard noisy debug logs, low-value health check traces, or overly granular metrics *before* they cross the network and impact your vendor bill.