While receivers gather telemetry and exporters deliver it, the true power of the OpenTelemetry Collector lies in the middle. Processors act as the central nervous system for your observability data, mutating, enriching, filtering, and batching traces, metrics, and logs before they hit your backends. Without processors, the Collector is just a passive proxy. With them, it becomes a sophisticated gateway capable of enforcing global metadata standardization, protecting downstream systems from unmetered data floods, and securing sensitive PII through robust redaction. This chapter explores how to master these critical pipeline components.

## 14.1 Memory Limiting and Batching for Stability

In a distributed system, the volume of telemetry data is rarely constant. A sudden surge in user traffic, a cascading failure, or an infinite loop can trigger massive spikes in trace, metric, and log generation. If the OpenTelemetry Collector attempts to ingest, process, and export this unmetered flood of data simultaneously, it will inevitably exhaust the host's resources and crash due to Out-Of-Memory (OOM) errors. Ironically, this means the observability pipeline fails at the exact moment you need it the most.

To guarantee resilience, the Collector relies on two foundational components that should be present in virtually every production deployment: the `memory_limiter` processor and the `batch` processor. While other processors mutate or filter data, these two are exclusively responsible for the mechanical stability and efficiency of the pipeline.

### The Memory Limiter Processor

The `memory_limiter` processor acts as a circuit breaker for the Collector's memory heap. It periodically checks the memory usage of the Collector process and, if usage exceeds configured thresholds, it forces the garbage collector to run. If memory continues to rise, it begins to reject or drop incoming data until the memory pressure subsides.

Data rejection at this stage applies backpressure to the receivers. If an OTLP receiver pushes back, a well-configured OpenTelemetry SDK in the application will briefly queue the data or drop it locally, ensuring the Collector remains standing.

#### Configuration Mechanics

The memory limiter operates on two primary thresholds: a hard limit and a soft limit (defined by the spike limit). 

* **Hard Limit (`limit_mib` or `limit_percentage`):** The absolute maximum amount of memory the Collector is allowed to use. 
* **Spike Limit (`spike_limit_mib` or `spike_limit_percentage`):** The safety buffer. The soft limit is calculated as the Hard Limit minus the Spike Limit. When memory usage crosses this soft limit, the Collector enters a memory-constrained state and begins refusing new data.

Here is a standard configuration using percentages, which is highly recommended for Kubernetes environments where pod resource limits might change dynamically:

```yaml
processors:
  memory_limiter:
    # Check memory usage every 1 second
    check_interval: 1s
    # Max memory allowed is 80% of the total allocated to the container/host
    limit_percentage: 80
    # Soft limit triggers at 55% (80% - 25%)
    spike_limit_percentage: 25
```

If you are running the Collector on a bare-metal machine or a dedicated VM with fixed resources, absolute values are often more predictable:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 4000
    spike_limit_mib: 800
```

*Note on Go Runtime:* Because the Collector is written in Go, it relies on Go's garbage collection (GC). As of Go 1.19, setting the `GOMEMLIMIT` environment variable is strongly recommended alongside the `memory_limiter` processor. Setting `GOMEMLIMIT` to roughly 80% of the container's memory allows the Go runtime to optimize GC cycles aggressively before the processor ever needs to intervene.

### The Batch Processor

While the `memory_limiter` protects the Collector's internals, the `batch` processor protects the network and the downstream observability backends. 

Receivers often ingest telemetry point-by-point or in small fragments. Exporting these tiny payloads individually across a network introduces immense overhead: each request requires TCP/TLS handshakes, HTTP headers, and individual disk I/O operations on the backend. 

The `batch` processor intercepts incoming telemetry, buffers it in memory, and groups it into larger payloads before passing it to the exporters. This drastically improves payload compression (especially for gRPC/Protobuf streams) and increases the ingestion throughput of your storage backends.

#### Configuration Mechanics

The batch processor operates on three main triggers: time, size, and a hard cap.

1.  **`timeout`:** The maximum amount of time to wait before sending a batch, regardless of its size. This ensures low-volume signals don't get stuck in memory indefinitely.
2.  **`send_batch_size`:** The target number of spans, metric data points, or log records required to trigger a batch send.
3.  **`send_batch_max_size`:** An absolute upper limit on the batch size. This is critical because many backends (and gRPC itself) have maximum payload size limits (e.g., 4MB). If a batch exceeds this limit, it is split into smaller batches.

```yaml
processors:
  batch:
    # Send whatever we have every 200 milliseconds (improves latency)
    timeout: 200ms
    # Or send when we accumulate 8,192 items
    send_batch_size: 8192
    # Never exceed 10,000 items in a single payload to prevent gRPC errors
    send_batch_max_size: 10000
```

When configuring `send_batch_size`, you must balance memory usage against network efficiency. A larger batch size compresses better and requires fewer network requests, but consumes more Collector RAM while buffering. 

### Pipeline Placement: The Golden Rule

The order in which processors are defined in the `service.pipelines` section is strictly enforced. Processors execute sequentially. Because of their distinct roles, the `memory_limiter` and `batch` processors must bracket your processing pipeline.

```text
+-------------------------------------------------------------------------+
|                        OpenTelemetry Collector                          |
|                                                                         |
|  +-----------+    +----------------+    +------------+    +----------+  |
|  |           |    |   Processor:   |    | Processors:|    |Processor:|  |
|  | Receivers |--->| memory_limiter |--->| (Mutations)|--->|   batch  |  |
|  |           |    |                |    | (Filtering)|    |          |  |
|  +-----------+    +----------------+    +------------+    +----------+  |
|                                                                 |       |
|                                                                 v       |
|                                                           +----------+  |
|                                                           | Exporters|  |
|                                                           +----------+  |
+-------------------------------------------------------------------------+
```

1.  **`memory_limiter` must be the FIRST processor.** It needs to inspect the incoming data volume and apply backpressure *before* the Collector spends CPU cycles parsing, modifying, or enriching the data. Placing it later defeats the purpose, as the memory will have already been allocated.
2.  **`batch` should be the LAST processor.** Data should be filtered, redacted, and enriched (e.g., via the `attributes` or `transform` processors) while it is still streaming. Once the data is perfectly formatted, the `batch` processor packs it efficiently and hands it off to the exporter queuing mechanisms. 

Combining these two processors correctly transforms the Collector from a fragile intermediary into a highly resilient, enterprise-grade telemetry router.

## 14.2 Mastering the OpenTelemetry Transformation Language (OTTL)

Before the introduction of the OpenTelemetry Transformation Language (OTTL), mutating telemetry within the Collector required stitching together a fragmented collection of specialized processors. You needed the `attributes` processor to modify span tags, the `resource` processor to change host metadata, the `filter` processor to drop data, and the `metricstransform` processor to rename metrics. This approach was verbose, prone to configuration errors, and difficult to maintain at scale.

OTTL was engineered to solve this fragmentation. It is a domain-specific language (DSL) built natively into the Collector designed explicitly for interacting with and mutating telemetry payloads. Today, OTTL is the standard mechanism for data manipulation, primarily executed via the `transform` processor, though it is increasingly supported in routing and filtering contexts.

### The OTTL Execution Model: Contexts

To use OTTL effectively, you must first understand the shape of OTLP (OpenTelemetry Protocol) data. Telemetry is not flat; it is highly nested. To optimize performance, OTTL statements do not execute against the entire payload at once. Instead, they execute within a specific **Context**. 

The context dictates which fields are accessible and what operations are valid. If you write an OTTL statement for a Span, it cannot directly mutate the underlying Resource attributes unless you explicitly declare the correct context path.

```text
+-------------------------------------------------------------------+
|               OTLP Telemetry Hierarchy (OTTL Contexts)            |
|                                                                   |
|  [Resource Context]                                               |
|  (Attributes: service.name, host.name, cloud.region)              |
|   │                                                               |
|   └── [Scope Context]                                             |
|       (Attributes: instrumentation.library.name)                  |
|        │                                                          |
|        ├── [Span Context]                                         |
|        │   (TraceID, SpanID, duration, span attributes)           |
|        │    └── [SpanEvent Context]                               |
|        │                                                          |
|        ├── [Metric Context]                                       |
|        │   (Metric name, description, unit)                       |
|        │    └── [DataPoint Context]                               |
|        │        (Timestamp, value, datapoint attributes)          |
|        │                                                          |
|        └── [LogRecord Context]                                    |
|            (Timestamp, severity, log body, log attributes)        |
+-------------------------------------------------------------------+
```

When configuring the `transform` processor, you group your OTTL statements by these contexts. 

### Syntax and Structure

An OTTL statement generally follows a functional structure, often combined with an optional boolean condition (a `where` clause).

**Format:** `Function(Target, [Arguments...]) where Condition`

* **Function:** The action to perform (e.g., `set`, `replace_match`, `delete`, `keep_keys`).
* **Target (Path Expression):** The field within the payload you are modifying (e.g., `attributes["http.status_code"]`, `resource.attributes["k8s.pod.name"]`, `body`).
* **Condition:** A logical test that must evaluate to `true` for the function to execute.

### Practical OTTL Patterns

Mastering OTTL is best achieved by examining common enterprise use cases. Below are practical implementations utilizing the `transform` processor.

#### 1. Standardizing and Enriching Resource Attributes

In large environments, different teams might use different naming conventions. OTTL allows you to enforce standard Semantic Conventions at the Collector edge. In this example, we standardize an environment flag and promote a Kubernetes namespace from a custom attribute to a standard resource attribute.

```yaml
processors:
  transform/resource_standardization:
    error_mode: ignore
    resource_statements:
      # Context: Resource
      # 1. Standardize 'env' to 'deployment.environment'
      - set(attributes["deployment.environment"], attributes["env"]) where attributes["env"] != nil
      - delete_key(attributes, "env")
      
      # 2. Hardcode a fallback environment if one doesn't exist
      - set(attributes["deployment.environment"], "production") where attributes["deployment.environment"] == nil
```

*Note: The `error_mode: ignore` directive instructs the processor to continue evaluating subsequent statements even if one statement fails (e.g., due to a type mismatch).*

#### 2. Advanced Span Attribute Manipulation

Often, developers inject attributes that are too verbose, or you need to derive new attributes from existing ones to improve indexing in your backend. 

```yaml
processors:
  transform/span_enrichment:
    trace_statements:
      # Context: Span
      # 1. Parse a JSON string stored in an attribute into a native map
      - merge_maps(attributes, ParseJSON(attributes["user.metadata"]), "insert") where attributes["user.metadata"] != nil
      
      # 2. Extract a database table name from a raw SQL query using Regex
      # Warning: Heavy Regex can impact CPU performance. Use judiciously.
      - replace_match(attributes["db.statement"], "(?i)SELECT .* FROM ([a-zA-Z0-9_]+)", "db.table", "$1")
      
      # 3. Drop all span attributes EXCEPT the ones we explicitly want to keep
      - keep_keys(attributes, ["http.method", "http.status_code", "http.url", "db.table"])
```

#### 3. Log Body Parsing and Routing Prep

Logs are frequently unstructured text. OTTL can be used to promote data from the log body into structured attributes, making the logs highly queryable before they reach your storage backend.

```yaml
processors:
  transform/log_parsing:
    log_statements:
      # Context: LogRecord
      # Example Log Body: "User login successful for tenant_id=9942"
      
      # Extract tenant_id from the body into a formal attribute
      - extract_patterns(body, "tenant_id=(?P<tenant_id>\\d+)")
      
      # Elevate severity if a specific attribute is found, overriding the default
      - set(severity_number, SEVERITY_NUMBER_FATAL) where attributes["tenant_id"] == "9942"
```

#### 4. Metric Pruning at the DataPoint Level

High-cardinality metrics can incur massive costs. You can use OTTL at the `datapoint` context to strip away specific labels (attributes) from metrics that are driving up cardinality unnecessarily.

```yaml
processors:
  transform/metric_pruning:
    metric_statements:
      # Context: Metric
      # Only target the "http.server.duration" metric
      - context: datapoint
        statements:
          # Remove the highly-cardinal 'user_agent' and 'client.ip' attributes 
          # from this specific metric's data points
          - delete_key(attributes, "user_agent")
          - delete_key(attributes, "client.ip")
        where: name == "http.server.duration"
```

### Performance Implications of OTTL

While powerful, OTTL is not free. Every statement evaluated consumes CPU cycles. 

1.  **Context Optimization:** Always target the highest applicable context. If you want to drop a telemetry payload based on a `host.name`, do it in the `resource_statements` block, not the `trace_statements` block. If you drop it at the resource level, the Collector doesn't waste time evaluating the hundreds of individual spans attached to that resource.
2.  **Short-Circuiting:** Use `where` clauses aggressively. Functions like `replace_pattern` (Regex matching) are computationally expensive. Shield them with simple boolean checks (e.g., `where attributes["http.url"] != nil and IsMatch(...)`) so the regex engine only runs when absolutely necessary.

## 14.3 Redacting Sensitive Data and Masking PII

In modern distributed systems, telemetry data is incredibly rich. While this high fidelity is invaluable for debugging, it presents a massive liability regarding Personally Identifiable Information (PII), Protected Health Information (PHI), and financial data (PCI). Passwords, social security numbers, credit card details, and API tokens can easily leak into logs, span attributes, or database query traces. 

Relying on thousands of individual developers to manually sanitize data before emitting telemetry is an error-prone strategy. The OpenTelemetry Collector solves this by acting as a centralized privacy gateway, applying redaction rules at the infrastructure edge before the data crosses the trust boundary to observability backends or third-party vendors.

### The Privacy Gateway Pattern

The standard architectural pattern for data masking places the redaction logic immediately after data ingestion and initial enrichment, but crucially before routing and exporting. 

```text
+---------------------------------------------------------------------------------+
|                              Internal Trust Boundary                            |
|                                                                                 |
|  +-----------+    +----------------+    +-----------------+    +-------------+  |
|  |           |    |   Processor:   |    |   Processor:    |    | Processors: |  |
|  | Receivers |--->| memory_limiter |--->|    transform    |--->| batch, etc. |  |
|  |           |    |                |    | (PII Redaction) |    |             |  |
|  +-----------+    +----------------+    +-----------------+    +-------------+  |
|                                                  |                              |
+--------------------------------------------------|------------------------------+
                                                   | 
                                                   v External Untrusted Network
                                            +-------------+
                                            |  Exporters  | (Datadog, Honeycomb, etc.)
                                            +-------------+
```

By enforcing redaction within the Collector, you decouple privacy compliance from application code. If a new regulation emerges or a new sensitive pattern is discovered, operators can update the Collector configuration without requiring a redeployment of the instrumented applications.

### Applying Redaction via OTTL

While historically operators used specialized processors like the `redaction` processor, the modern and most robust approach is utilizing the OpenTelemetry Transformation Language (OTTL) within the `transform` processor. OTTL provides the granular control necessary to inspect nested JSON, standard attributes, and raw text bodies.

Redaction generally falls into three categories: explicit attribute removal, structural masking, and pattern-based replacement.

#### 1. Explicit Attribute Deletion

The simplest form of redaction is dropping known, high-risk attributes entirely. If an application is known to inadvertently attach an authorization header or a user's email to a span, you can cleanly delete it.

```yaml
processors:
  transform/redact_explicit:
    trace_statements:
      - context: span
        statements:
          # Remove authorization tokens
          - delete_key(attributes, "http.request.header.authorization")
          # Remove explicitly tagged PII
          - delete_key(attributes, "user.email")
          - delete_key(attributes, "user.phone_number")
```

#### 2. Structural Masking (Hashing)

Sometimes, you need to redact the raw value of a field but retain its uniqueness for correlation and analytics. For example, you might want to track how many unique users hit a specific error path without knowing *who* those users are. In this case, cryptographic hashing via OTTL is the ideal solution.

```yaml
processors:
  transform/hash_pii:
    trace_statements:
      - context: span
        statements:
          # Replace the user's IP address with a SHA-256 hash
          - set(attributes["client.address.hash"], SHA256(attributes["client.address"])) where attributes["client.address"] != nil
          - delete_key(attributes, "client.address")
```

#### 3. Pattern-Based Replacement (Regex)

The most complex scenario involves unstructured data, such as a log body or an SQL query in a span attribute, where sensitive data might be embedded within surrounding text. Here, you must use regular expressions to find and mask the sensitive fragments.

The `replace_pattern` function in OTTL allows you to target specific strings and replace them with a static mask (e.g., `[REDACTED]`).

```yaml
processors:
  transform/redact_unstructured:
    log_statements:
      - context: log
        statements:
          # Mask US Social Security Numbers (SSN) in log bodies
          - replace_pattern(body, "\\b\\d{3}-\\d{2}-\\d{4}\\b", "[REDACTED_SSN]")
          
          # Mask standard 16-digit Credit Card Numbers
          - replace_pattern(body, "\\b(?:\\d[ -]*?){13,16}\\b", "[REDACTED_CC]")

    trace_statements:
      - context: span
        statements:
          # Sanitize URL parameters in HTTP spans (e.g., ?password=secret)
          - replace_pattern(attributes["http.url"], "(password|token|api_key)=([^&]+)", "$1=[REDACTED]")
          
          # Redact specific values in database query statements
          - replace_pattern(attributes["db.statement"], "(?i)(insert into users .* values \\().*(\\))", "$1[REDACTED_PAYLOAD]$2")
```

### Performance and Security Considerations

Implementing redaction—particularly pattern-based replacement—introduces computational overhead. 

1. **Regex Penalty:** Regular expressions are notoriously CPU-intensive. Applying `replace_pattern` across the `body` of every single log record ingested by the Collector will dramatically increase CPU utilization.
2. **Targeted Execution:** To mitigate performance hits, heavily utilize OTTL's `where` clauses. Instead of scanning all spans for SQL injection or PII, constrain the regex to execute only if the span is identified as a database span or from a specific service.

```yaml
          # Efficient: Only run the regex if we know this is an HTTP span with query parameters
          - replace_pattern(attributes["http.target"], "session_id=([^&]+)", "session_id=[MASKED]") where attributes["http.target"] != nil and IsMatch(attributes["http.target"], "session_id=")
```

3. **Defense in Depth:** While the Collector is a powerful privacy gateway, it should not be the *only* line of defense. Applications should still attempt to avoid logging sensitive data natively. The Collector acts as the safety net for human error, ensuring that when developers inevitably make mistakes, the blast radius is contained before it reaches immutable storage.

## 14.4 Applying Resource and Attribute Processors Globally

Consistency is the bedrock of effective observability. If your Kubernetes team tags clusters as `k8s.cluster.name`, but your cloud provisioning team uses `cluster_name`, cross-signal correlation in your observability backend will fail. When querying across thousands of services, you need a unified taxonomy.

While the OpenTelemetry Transformation Language (OTTL) provides surgical precision for mutating data, the dedicated `resource` and `attributes` processors remain the standard, highly efficient tools for applying sweeping, global metadata changes across your entire telemetry pipeline.

### Understanding the Hierarchy: Resources vs. Attributes

To use these processors correctly, you must understand the OpenTelemetry data model's hierarchy. Telemetry is not sent as a flat list; it is grouped by the entity that produced it.

```text
+-------------------------------------------------------------+
|                     Telemetry Payload                       |
|                                                             |
|  [ Resource ] (The entity: Host, Pod, Cloud Instance)       |
|  ├── attributes: { service.name, host.name, env }           |
|  │                                                          |
|  └── [ Scope ] (The instrumentation library)                |
|      ├── [ Span 1 ] (attributes: http.method, db.table )    |
|      ├── [ Span 2 ] (attributes: http.status_code )         |
|      └── [ Span 3 ] (attributes: custom.tenant_id )         |
+-------------------------------------------------------------+
```

1.  **Resource:** Represents the underlying entity producing the telemetry. If you add a key-value pair to the Resource, it automatically applies to *all* spans, metrics, and logs generated by that entity. 
2.  **Attributes:** Represents the metadata attached to a specific, individual signal (like a single Span or Log Record).

**The Golden Rule of Global Tagging:** Always apply global metadata at the Resource level whenever possible. It is computationally cheaper to stamp a `cloud.region` once on the Resource than to stamp it a thousand times on a thousand individual spans.

### The Resource Processor

The `resource` processor is designed to mutate the top-level entity metadata. This is typically used at the "edge" of your observability pipeline (e.g., a Collector running as a DaemonSet on a Kubernetes node) to inject infrastructure context that the application itself cannot or should not know about.

Common use cases include injecting geographic regions, datacenter names, cluster identifiers, or overriding default service names.

#### Configuration Actions

The processor supports several actions:
* `insert`: Adds the attribute only if it does not already exist.
* `update`: Modifies the attribute only if it already exists.
* `upsert`: Adds the attribute if it doesn't exist, or overwrites it if it does.
* `delete`: Removes the attribute.

```yaml
processors:
  resource/global_infrastructure:
    attributes:
      # Hardcode the region for all data passing through this Collector
      - key: cloud.region
        value: "us-east-1"
        action: upsert
      
      # Standardize environment tagging
      - key: deployment.environment
        value: "production"
        action: insert
        
      # Strip out verbose or unnecessary default resource attributes
      - key: process.command_line
        action: delete
```

### The Attributes Processor

While the `resource` processor modifies the entity, the `attributes` processor modifies the tags on individual spans and log records. You apply this globally when you need to enforce standardization on the data emitted *by the application code*, rather than the infrastructure.

For example, if multiple teams are instrumenting HTTP clients, they might use different casing for HTTP methods. You can use the `attributes` processor globally to standardize this data before it hits your backend.

#### Configuration and Pattern Matching

In addition to static inserts and upserts, the `attributes` processor supports pattern matching and extraction.

```yaml
processors:
  attributes/standardize_spans:
    actions:
      # Ensure a specific custom attribute is always present for billing purposes
      - key: billing.tier
        value: "unassigned"
        action: insert

      # Extract a project ID from a custom URL attribute using Regex
      # e.g., url="https://api.example.com/v1/projects/proj-123/users" -> project_id="proj-123"
      - key: project_id
        pattern: ^https://api\.example\.com/v1/projects/(?P<project_id>[^/]+)/.*$
        from_attribute: http.url
        action: insert
```

### Pipeline Placement for Global Processors

Because these processors enforce global taxonomy and context, they must be positioned early in the Collector pipeline, immediately following the foundational stability processors but *before* any routing, filtering, or metric-generation processors.

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      # memory_limiter protects the collector.
      # resource comes next to stamp the entity globally.
      # attributes standardizes the span data.
      # Only then do we sample or route.
      processors: [memory_limiter, resource/global_infrastructure, attributes/standardize_spans, tail_sampling, batch]
      exporters: [otlp/backend]
```

By stamping Resource attributes early, downstream components like the `tail_sampling` processor or a routing connector can make decisions based on that newly injected metadata (e.g., "route all traces where `cloud.region` is `eu-west-1` to a specific EU compliance cluster"). If the `resource` processor were placed at the end of the pipeline, those intermediate routing mechanisms would be blind to that context.

## 14.5 Conditional Routing and Data Filtering

As your observability footprint grows, the philosophy of "collect everything and send it everywhere" quickly becomes financially and technically unsustainable. You will encounter high-volume, low-value telemetry—such as thousands of successful health check spans per minute—that inflate your vendor bills without providing actionable insights. Conversely, you will have highly critical data, such as payment processing errors, that must be routed to specialized, high-availability monitoring backends.

The OpenTelemetry Collector addresses these challenges through data filtering (dropping telemetry) and conditional routing (forking the telemetry pipeline). 

### Data Filtering: Shedding the Noise

Filtering is the act of intentionally dropping telemetry before it reaches the batching and exporting phases. While sampling (covered in Chapter 16) reduces volume based on probabilistic math, filtering reduces volume based on deterministic, hardcoded business rules.

The modern standard for dropping data is the `filter` processor, which relies entirely on the OpenTelemetry Transformation Language (OTTL) to evaluate whether a span, metric, or log should be discarded.

#### Configuration Mechanics

The `filter` processor evaluates a set of OTTL conditions. If a condition evaluates to `true`, the telemetry payload is dropped.

```yaml
processors:
  filter/drop_noisy_spans:
    error_mode: ignore
    traces:
      span:
        # Drop all successful Kubernetes liveness probe spans
        - 'attributes["http.target"] == "/healthz" and attributes["http.status_code"] == 200'
        
        # Drop spans generated by a specific noisy, legacy background job
        - 'name == "LegacyQueuePoller"'

  filter/drop_debug_logs:
    error_mode: ignore
    logs:
      log_record:
        # Only retain logs that are INFO level or higher (Drop DEBUG and TRACE)
        - 'severity_number < SEVERITY_NUMBER_INFO'
```

**Architectural Placement:** Filtering processors should be placed as early in the pipeline as possible, immediately after structural processors (like `memory_limiter` and `resource`). Dropping a span early saves the Collector from wasting CPU cycles running subsequent mutation, redaction, or batching logic on data that is destined for the trash.

### Conditional Routing

While filtering destroys data, routing directs it. The `routing` processor intercepts the pipeline flow and forwards telemetry to specific exporters based on the data's content.

This is critical for several enterprise architectures:
1.  **Multi-Tenancy:** Routing data to different vendor accounts or storage indices based on a `tenant_id`.
2.  **Tiered Storage:** Sending all data to a cheap, cold-storage blob bucket, but routing only `ERROR` level logs and spans to an expensive, hot-storage observability vendor.
3.  **Data Sovereignty:** Ensuring telemetry originating from European servers is routed exclusively to EU-based observability backends to comply with GDPR.

```text
+-----------------------------------------------------------------------+
|                       OpenTelemetry Collector                         |
|                                                                       |
|  +-----------+    +-----------+    +-------------------------------+  |
|  |           |    |           |    |       routing processor       |  |
|  | Receivers |--->|  filter   |--->|                               |  |
|  |           |    |           |    |  [Condition: region == "EU"]--+-----> [Exporter: OTLP/EU]
|  +-----------+    +-----------+    |                               |  |
|                                    |  [Condition: region == "US"]--+-----> [Exporter: OTLP/US]
|                                    |                               |  |
|                                    |  [Default Route]              |  |
+------------------------------------|-------------------------------+--+
                                     |
                                     v
                           [Exporter: OTLP/Global_Archive]
```

#### Configuration Mechanics

The modern `routing` processor utilizes OTTL to evaluate conditions against the incoming data. You define a default set of exporters, and then an array of routing statements. The processor evaluates statements sequentially.

```yaml
processors:
  routing/geo_and_compliance:
    default_exporters: [otlp/global_archive]
    error_mode: ignore
    routes:
      # Route 1: High Priority Errors
      - condition: 'attributes["error"] == true or severity_number >= SEVERITY_NUMBER_ERROR'
        exporters: [otlp/pagerduty, otlp/hot_storage]
        
      # Route 2: European Data Sovereignty
      - condition: 'resource.attributes["cloud.region"] == "eu-central-1"'
        exporters: [otlp/eu_backend]

      # Route 3: Multi-tenant billing routing
      - condition: 'resource.attributes["tenant.tier"] == "enterprise"'
        exporters: [otlp/premium_analytics]
```

### The Connector Alternative

It is worth noting that as the OpenTelemetry Collector architecture evolves, the community is increasingly adopting **Connectors** for complex routing. A connector acts as both an exporter and a receiver, allowing you to link entirely separate pipelines together.

Instead of putting a complex `routing` processor inside a single pipeline, you can use a `routing` connector to split data into dedicated pipelines (e.g., a "traces/eu" pipeline and a "traces/us" pipeline), each with its own independent batching and memory limiters. While the `routing` processor remains highly effective for simple exporter multiplexing, connectors provide superior isolation for highly complex, multi-tenant Collector deployments.