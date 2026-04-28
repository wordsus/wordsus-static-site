Before diving into specific telemetry signals, we must understand the foundational architecture underpinning OpenTelemetry. Unlike legacy monitoring tools that operate as monolithic black boxes, OpenTelemetry is a meticulously decoupled framework. 

This chapter explores the structural paradigms enabling this flexibility. We examine the critical separation between the instrumentation API and the operational SDK, unpack the OpenTelemetry Protocol (OTLP), and learn how Semantic Conventions and Context Propagation guarantee that telemetry remains uniform and tightly correlated across complex distributed environments.

## 3.1 Understanding the API vs. SDK Separation

One of the most defining architectural decisions in the OpenTelemetry project is the strict, deliberate decoupling of its Application Programming Interface (API) from its Software Development Kit (SDK). While many legacy monitoring tools bundle instrumentation interfaces and telemetry processing into a single, monolithic library, OpenTelemetry physically separates them into distinct packages. 

Understanding this separation is crucial, as it solves a historical problem in software observability: the "dependency hell" of third-party instrumentation.

### The Historical Problem: Vendor Lock-in at the Library Level

Before OpenTelemetry, if the author of an open-source HTTP client or database driver wanted to provide built-in telemetry, they had to force a specific vendor’s monitoring library onto their users. If the library author chose Vendor A, but the application developer using that library used Vendor B, the application developer was forced to either pull in Vendor A’s heavy SDK (risking dependency conflicts and performance overhead) or forgo the library's telemetry entirely. 

OpenTelemetry's API/SDK split was designed specifically to allow library authors to instrument their code without dictating how, where, or even *if* that telemetry data is processed and exported.

### The OpenTelemetry API: The Contract

The OpenTelemetry API is a minimal set of interfaces and definitions used to generate telemetry data. It is the package imported by library authors and application developers to instrument their code.

Key characteristics of the API include:
* **Zero Implementation Logic:** The API defines the "what" (e.g., getting a tracer, starting a span, recording a metric), but not the "how." It contains no logic for sampling, batching, or network transmission.
* **No-Op by Default:** If an application includes a library that calls the OpenTelemetry API, but the application owner has not installed and configured the OpenTelemetry SDK, the API silently defaults to "No-Op" (No Operation) implementations. The instrumentation calls return immediately, consuming near-zero CPU and memory.
* **Minimal Dependency Footprint:** Because it lacks implementation logic, the API package is exceptionally lightweight. 

**API Usage Example (Python)**
Notice how the developer only interacts with the API to create telemetry, completely unaware of where this data will ultimately go:

```python
from opentelemetry import trace

# 1. Acquire a tracer from the global API provider
tracer = trace.get_tracer(__name__)

def process_order(order_id):
    # 2. Start a span. If no SDK is configured, this is a fast no-op.
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        # Business logic goes here...
```

### The OpenTelemetry SDK: The Engine

The OpenTelemetry SDK is the concrete implementation of the API. It is the "engine" that application owners plug into their application at startup to give the API calls actual behavior. 

Key characteristics of the SDK include:
* **State Management:** It manages the context, tracks active spans, and aggregates metric data.
* **Pipeline Configuration:** It houses the logic for sampling (deciding which traces to keep), processing (batching data for efficiency), and exporting (sending data to an OTLP endpoint or console).
* **Application Owner Exclusive:** Library authors should **never** import the SDK. The SDK is strictly the domain of the final application orchestrator. 

**SDK Initialization Example (Python)**
This code is typically placed at the very entry point of an application. It wires the SDK up to the API so that the previously "No-Op" calls start generating real, exportable data.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

# 1. Initialize the SDK's TracerProvider
provider = TracerProvider()

# 2. Configure how telemetry is processed and exported
processor = BatchSpanProcessor(ConsoleSpanExporter())
provider.add_span_processor(processor)

# 3. Register the SDK provider with the global API
trace.set_tracer_provider(provider)
```

### Visualizing the Architecture

The separation creates a unidirectional dependency graph. Application code and shared libraries depend only on the API. The SDK implements the API, and the application owner binds them together at runtime.

```text
                      +-------------------+       +--------------------+
                      |  Application Code |       | 3rd Party Library  |
                      |  (e.g., FastAPI)  |       | (e.g., SQLAlchemy) |
                      +---------+---------+       +---------+----------+
                                |                           |
                                v                           v
=================================================================================
  THE CONTRACT                  |                           |
+-------------------------------------------------------------------------------+
|                             OpenTelemetry API                                 |
|                  (Interfaces, Context, No-Op Implementations)                 |
+-------------------------------------------------------------------------------+
=================================================================================
                                ^                           ^
                                | Implements                | Registers
=================================================================================
  THE ENGINE                    |                           |
+-------------------------------------------------------------------------------+
|                             OpenTelemetry SDK                                 |
|               (State, Samplers, Processors, Resource Detectors)               |
+-----------------------------------------------------------+-------------------+
============================================================|====================
                                                            v
                                            +-------------------------------+
                                            |           Exporters           |
                                            |  (OTLP, Prometheus, Console)  |
                                            +-------------------------------+
```

### Architectural Benefits

1.  **Universal Library Instrumentation:** Open-source maintainers can now safely embed OpenTelemetry API calls directly into their libraries without bloating their users' dependency trees or causing version conflicts with monitoring tools.
2.  **Ultimate Vendor Neutrality:** You can change your observability backend (e.g., moving from Datadog to Honeycomb, or Jaeger to an OTel Collector) by changing a few lines of SDK configuration, without ever touching the instrumentation API calls scattered across thousands of lines of business logic.
3.  **Performance Safety:** Because the API gracefully degrades to a No-Op state, you can leave instrumentation code in your production binaries permanently. If you need to disable telemetry globally, simply removing the SDK initialization renders the API calls inert.

## 3.2 The OpenTelemetry Protocol (OTLP) Specification

If the OpenTelemetry API is the contract and the SDK is the engine, the OpenTelemetry Protocol (OTLP) is the shipping network. OTLP is a general-purpose telemetry delivery protocol designed specifically to encode, transport, and decode traces, metrics, and logs efficiently at scale.

To truly master modern observability, it is critical to understand not just how telemetry is generated, but exactly how it travels over the wire.

### The Eradication of Protocol Fragmentation

Historically, observability backends demanded their own proprietary or project-specific data formats. Traces had to be exported in Jaeger or Zipkin formats; metrics in Prometheus text format or StatsD; logs in various JSON schemas or Syslog formats. 

This fragmentation placed a heavy burden on the application. To send data to multiple backends, the application (or a local agent) had to encode the same telemetry multiple times, consuming valuable CPU and memory. 

OTLP was created to be the "lingua franca" of observability. It provides a single, unified, vendor-agnostic protocol that handles all three telemetry signals simultaneously. Today, virtually all major commercial and open-source observability backends natively ingest OTLP.

### Serialization and Transport Protocols

OTLP is highly flexible and defines specifications for both how the data is structured (serialization) and how it is transmitted (transport). 

**1. Serialization Formats**
* **Protocol Buffers (Protobuf):** This is the default and recommended serialization format. Protobuf is a strongly typed, binary serialization mechanism developed by Google. It is exceptionally compact and fast to encode/decode, making it ideal for high-throughput telemetry.
* **JSON:** OTLP also supports JSON serialization. While significantly more CPU-intensive and bandwidth-heavy than Protobuf, JSON is invaluable for debugging, local development, and environments where binary transport is problematic (like certain client-side browser scenarios).

**2. Transport Mechanisms**
* **gRPC (`otlp/grpc`):** The primary and most performant transport mechanism. gRPC operates over HTTP/2, utilizing persistent connections and multiplexing. It is highly resilient and handles backpressure elegantly.
* **HTTP (`otlp/http`):** OTLP can be transmitted via standard HTTP POST requests. You can send Protobuf payloads over HTTP (`application/x-protobuf`) or JSON payloads (`application/json`). HTTP transport is crucial for environments where gRPC traffic is blocked by legacy firewalls or Layer 7 load balancers that do not fully support HTTP/2.

### The OTLP Payload Architecture: Designed for Compression

A naive telemetry protocol might attach environmental data (like the server hostname, cloud region, or application version) to every single span or metric data point. In a highly distributed system generating millions of spans a second, this duplication wastes massive amounts of bandwidth.

To optimize network utilization, OTLP relies on a strictly hierarchical data model. Data is grouped and batched logically before transmission.

**The Three-Tiered Hierarchy:**

1.  **Resource:** The root of the payload. A `Resource` represents the entity producing the telemetry (e.g., a Kubernetes Pod, a physical server, an AWS Lambda function). All attributes describing this entity (hostname, OS, cloud provider) are declared exactly once at this level.
2.  **Scope (Instrumentation Library):** Inside a Resource, data is grouped by the `Scope`. This represents the specific instrumentation library that generated the data (e.g., `opentelemetry-instrumentation-django` or `mysql-driver`). This allows backends to identify exactly which piece of code emitted the signal.
3.  **Telemetry Data:** Finally, inside the Scope, the actual Spans, Metric Data Points, or Log Records are listed. 

Because the Data tier inherits the metadata from the Scope and Resource tiers above it, the actual signal payloads are incredibly lightweight.

### Visualizing an OTLP Export Request

When an OpenTelemetry SDK flushes a batch of spans to a Collector, the payload structure looks like this:

```text
ExportTraceServiceRequest
│
└─── ResourceSpans (List)
     │
     ├── Resource: 
     │   └── Attributes: {"service.name": "checkout-service", "host.name": "node-1"}
     │
     └── ScopeSpans (List)
         │
         ├── Scope: {"name": "opentelemetry.instrumentation.flask", "version": "1.20.0"}
         │   │
         │   └── Spans: 
         │       ├── Span: {"name": "GET /checkout", "trace_id": "...", "duration": 15ms}
         │       └── Span: {"name": "POST /payment", "trace_id": "...", "duration": 42ms}
         │
         └── Scope: {"name": "opentelemetry.instrumentation.psycopg2", "version": "0.40.0"}
             │
             └── Spans:
                 ├── Span: {"name": "SELECT orders", "trace_id": "...", "duration": 5ms}
                 └── Span: {"name": "UPDATE inventory", "trace_id": "...", "duration": 12ms}
```

This structural efficiency is what allows OTLP to scale from tiny edge devices to massive, multi-cluster enterprise deployments without crippling network infrastructure. Understanding this hierarchy will also become critical when we discuss OpenTelemetry Collector Processors in Part IV, as processors often target specific layers of this exact OTLP hierarchy.

## 3.3 Semantic Conventions for Standardized Naming

Imagine a scenario where three different teams in your organization manage three interacting microservices: a Node.js frontend, a Python billing service, and a Java inventory backend. When a user checks out, an error occurs. You open your observability tool to trace the request across all three services. 

You try to query for the user who experienced the error. 
* The Node.js team tagged their spans with `userId: 8472`.
* The Python team used `user_id: 8472`.
* The Java team used `customer.id: 8472`.

Because the attribute names do not match, your cross-service query fails. You cannot easily aggregate metrics, correlate logs, or trace requests across language and team boundaries. This is the naming chaos that arises in distributed systems when telemetry metadata is left to individual discretion.

The OpenTelemetry Semantic Conventions were created to solve this exact problem.

### The Babel Translation Dictionary

Semantic Conventions define a unified, standardized vocabulary for naming telemetry attributes, metric names, and span names across all common technologies and protocols. They serve as a shared dictionary for your entire observability pipeline.

By standardizing how we describe a database query, an HTTP request, or a cloud resource, OpenTelemetry ensures that observability backends (like Jaeger, Prometheus, or Datadog) can automatically understand, index, and correlate the data without manual mapping rules.

```text
Without Semantic Conventions:                With Semantic Conventions:
+-------------------+                        +-------------------+
| Service A (HTTP)  |  "http_method": "GET"  | Service A (HTTP)  |  "http.method": "GET"
+-------------------+                        +-------------------+
        |                                            |
+-------------------+                        +-------------------+
| Service B (DB)    |  "db.type": "mysql"    | Service B (DB)    |  "db.system": "mysql"
+-------------------+                        +-------------------+
        |                                            |
+-------------------+                        +-------------------+
| Service C (Queue) |  "rabbitmq_q": "DLQ"   | Service C (Queue) |  "messaging.destination.name": "DLQ"
+-------------------+                        +-------------------+
        |                                            |
    [BACKEND] --> Needs 3 custom parsing         [BACKEND] --> Instantly correlates all
                  rules to understand            activity using standard keys.
                  the topology.
```

### Key Domains of Semantic Conventions

The OpenTelemetry project maintains a rigorous, version-controlled specification that categorizes conventions into logical domains. Some of the most critical domains include:

| Domain | Example Attributes | Purpose |
| :--- | :--- | :--- |
| **HTTP** | `http.method`, `http.status_code`, `http.target` | Describes incoming and outgoing web traffic. |
| **Database** | `db.system`, `db.statement`, `db.user` | Describes queries made to SQL and NoSQL datastores. |
| **Messaging** | `messaging.system`, `messaging.operation` | Describes interactions with queues like Kafka or RabbitMQ. |
| **Exceptions** | `exception.type`, `exception.message` | Standardizes how application errors and stack traces are recorded. |
| **Resources** | `cloud.provider`, `k8s.pod.name`, `host.name` | Describes the physical or virtual environment producing the telemetry. |

> **Note on Namespacing:** Semantic conventions heavily utilize dot-notation for namespacing (e.g., `http.request.method`). This hierarchical structure prevents collisions and makes it easy for backend tools to group related attributes in their user interfaces.

### Implementing Conventions in Code

While you could manually type the string `"http.method"` into your instrumentation code, doing so introduces the risk of typos and makes upgrading to future versions of the specification difficult.

To prevent this, OpenTelemetry SDKs provide official semantic convention packages. These packages expose the standard attribute keys as constants in your programming language. 

Here is an example of how a developer should apply semantic conventions when manually instrumenting a custom database call in Node.js:

```javascript
const { trace } = require('@opentelemetry/api');
// Import the semantic conventions library
const { SemanticAttributes } = require('@opentelemetry/semantic-conventions');

const tracer = trace.getTracer('my-inventory-service');

function fetchInventory(productId) {
  // Use a standardized span name (e.g., <db.operation> <db.name>.<db.sql.table>)
  return tracer.startActiveSpan('SELECT inventory', (span) => {
    
    // Apply semantic attributes using official constants
    span.setAttribute(SemanticAttributes.DB_SYSTEM, 'postgresql');
    span.setAttribute(SemanticAttributes.DB_NAME, 'inventory_db');
    span.setAttribute(SemanticAttributes.DB_STATEMENT, `SELECT * FROM items WHERE id = ${productId}`);
    
    try {
      const result = executeQuery(productId);
      return result;
    } catch (error) {
      span.setAttribute(SemanticAttributes.EXCEPTION_TYPE, error.name);
      span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error.message);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### The Value Multiplier for Observability Backends

Adhering to Semantic Conventions is what unlocks the "magic" in modern observability platforms. 

If your telemetry complies with these standards, your backend vendor knows exactly what to look for. When it sees `db.system: "redis"`, it can automatically render a Redis-specific performance dashboard. When it sees `http.status_code: 500`, it knows to automatically flag the trace as an error and potentially trigger an alert. 

By utilizing these conventions, you abstract away the complexity of parsing and categorization, allowing your organization to focus on investigating the data rather than translating it.

## 3.4 Context Propagation and Distributed State

In a monolithic application, tracking a transaction from start to finish is relatively straightforward. When a request arrives, the application can store metadata—like a transaction ID—in memory constructs such as ThreadLocals (in Java) or context variables (in Python). As long as the execution remains within the same memory space, any function can access this metadata.

Distributed systems break this paradigm. When a microservice makes an HTTP request to another service, or publishes a message to a Kafka topic, memory-bound state is left behind. Without a mechanism to carry this state across network boundaries, a single user request shatters into dozens of disconnected, orphaned telemetry signals.

**Context Propagation** is the mechanism OpenTelemetry uses to solve this. It is the invisible thread that stitches disparate services together into a single, unified distributed trace.

### The Anatomy of Context

Before data can be propagated, it must be stored. OpenTelemetry defines a core concept simply called **Context**. 

Context is an immutable, key-value store that travels alongside the execution path of your code. It is designed to hold highly scoped, request-specific data. Context operates in two distinct phases: in-process and inter-process.

#### 1. In-Process Context (Implicit vs. Explicit)
Moving context between functions, threads, or asynchronous callbacks within a *single* service. 
* In languages with global execution context management (like Java, Python, or Node.js using `AsyncLocalStorage`), OpenTelemetry handles in-process propagation **implicitly**. Developers rarely interact with the Context object directly.
* In languages without implicit global state (like Go), Context must be passed **explicitly** as the first argument to every function in the call chain.

#### 2. Inter-Process Context (Distributed)
Moving context across network boundaries between *different* services. This requires serializing the in-memory Context into a format that can be transmitted over the wire.

### Injection and Extraction: The Propagation Engine

To transmit Context across a network, OpenTelemetry utilizes two core operations performed by components called **Propagators**: Injection and Extraction.

1.  **The Carrier:** The medium used to transport the data. In HTTP, the carrier is the HTTP headers. In a message queue, it is the message properties or metadata headers.
2.  **Injection:** The act of reading the active in-memory Context and writing it into the Carrier before the request leaves the client boundary.
3.  **Extraction:** The act of reading the Carrier upon receiving a request at the server boundary and translating it back into an active in-memory Context.

### Visualizing Context Propagation

Consider a scenario where Service A (a checkout API) calls Service B (a billing system) via HTTP:

```text
+------------------------------------------------------------------+
| SERVICE A (Client)                                               |
| 1. Receives external request, starts Trace 123, Span A.          |
| 2. Prepares to call Service B.                                   |
|                                                                  |
|   [Context: TraceID=123, SpanID=A]                               |
|          |                                                       |
|          v  (Injection via Propagator)                           |
+----------|-------------------------------------------------------+
           |
           | HTTP POST /bill
           | Headers: { 
           |   "traceparent": "00-123-A-01" <--- The Carrier
           | }
           |
+----------|-------------------------------------------------------+
| SERVICE B (Server)                                               |
|          v  (Extraction via Propagator)                          |
|                                                                  |
|   [Context: TraceID=123, ParentSpanID=A]                         |
|                                                                  |
| 3. Creates Span B, linking it to Parent Span A.                  |
| 4. Executes business logic as part of Trace 123.                 |
+------------------------------------------------------------------+
```

### The W3C Trace Context Standard

Historically, different observability vendors used proprietary headers for propagation (e.g., Datadog used `x-datadog-trace-id`, Zipkin used `X-B3-TraceId`). This meant that if Service A used Zipkin and Service B used Datadog, the trace would break because they did not understand each other's headers.

OpenTelemetry defaults to the **W3C Trace Context** specification, a globally recognized standard for distributed tracing headers. W3C defines two specific HTTP headers:
* `traceparent`: Contains the core routing information (Version, Trace ID, Parent Span ID, and Sampled Flags). 
* `tracestate`: An optional header used to carry vendor-specific routing data, ensuring that proprietary systems can still pass their required data through standard OpenTelemetry infrastructure.

### Trace Context vs. Baggage

While Trace Context is strictly reserved for observability routing metadata (IDs and sampling decisions), OpenTelemetry provides a secondary, parallel propagation mechanism called **Baggage**.

Baggage allows application developers to propagate arbitrary, business-specific key-value pairs across the distributed system. 

For example, if the API Gateway authenticates a user and determines their `tenant_id` and `subscription_tier`, it can inject these into Baggage. Every downstream microservice will extract this Baggage, allowing a database-layer service five network hops away to access the `tenant_id` without requiring it to be explicitly passed through five different function signatures and API payloads.

**Code Example (Conceptual Injection)**
When using auto-instrumentation, Injection and Extraction happen invisibly. However, if you are writing a custom HTTP client, manual injection looks like this:

```python
from opentelemetry import propagate
import requests

# 1. We have an active span/context running in memory
def call_billing_service():
    headers = {}
    
    # 2. Inject current context into the empty headers dictionary
    # The default TextMapPropagator uses W3C Trace Context
    propagate.inject(headers) 
    
    # headers now contains: {'traceparent': '00-abc123def456-7890-01'}
    
    # 3. Transmit the carrier over the network
    response = requests.post("http://billing-service/charge", headers=headers)
    return response
```

By ensuring that every network client injects context, and every network server extracts it, OpenTelemetry maintains a continuous, unbroken chain of distributed state, transforming isolated microservice logs into a cohesive, system-wide narrative.

## 3.5 Resource Attributes and Entity Identification

If spans, metrics, and logs describe *what* is happening in your system, the **Resource** describes *where* it is happening. 

In OpenTelemetry, a Resource is an immutable representation of the entity producing telemetry. Whether that entity is a Kubernetes Pod, an AWS Lambda function, a mobile phone, or an on-premise database server, identifying the telemetry source accurately is foundational to modern observability. Without robust entity identification, it is impossible to correlate application performance issues with underlying infrastructure constraints.

### The Distinction Between Resource and Signal Attributes

It is easy to confuse Resource attributes with the attributes we attach to individual spans or log records. The distinction lies in scope and cardinality.

* **Signal Attributes (e.g., Span Attributes):** These describe the specific, ephemeral operation taking place. Examples include `http.target` (`/checkout`), `db.statement` (`SELECT * FROM users`), or `user.id`. They change with every single request.
* **Resource Attributes:** These describe the static environment that hosts the application. Examples include `host.name`, `cloud.region`, `k8s.pod.name`, and `service.name`. They remain constant for the entire lifecycle of the application process.

As discussed in Section 3.2 regarding the OTLP payload, OpenTelemetry enforces this distinction strictly to optimize network bandwidth. Instead of attaching `k8s.cluster.name: "us-east-prod"` to 10,000 individual spans generated by a microservice, that attribute is defined exactly once at the Resource level, and all 10,000 spans logically inherit it.

```text
+-------------------------------------------------------------+
| RESOURCE: Defines the "Actor"                               |
| attributes: {                                               |
|   "service.name": "payment-processor",                      |
|   "service.version": "v1.4.2",                              |
|   "host.name": "ip-10-0-1-55",                              |
|   "cloud.provider": "aws",                                  |
|   "cloud.region": "us-east-1"                               |
| }                                                           |
+-----------------------------+-------------------------------+
                              |
                              v
+-----------------------------+-------------------------------+
| SIGNAL DATA: Defines the "Actions"                          |
|                                                             |
| -> Span 1: { name: "POST /charge", duration: 120ms }        |
| -> Span 2: { name: "UPDATE balances", duration: 45ms }      |
| -> Metric: { name: "http.server.requests", value: 1 }       |
| -> Log:    { body: "Connection to upstream timed out" }     |
+-------------------------------------------------------------+
```

### The Primary Key: `service.name`

While OpenTelemetry allows you to define arbitrary Resource attributes, one attribute reigns supreme: `service.name`. 

This is the primary identifier used by almost every observability backend to group your telemetry. If you view a topology map, an architecture diagram, or a list of applications in a vendor UI, the nodes on that map are dictated by `service.name`. If you fail to configure this attribute, SDKs will often default to a placeholder like `unknown_service:<process_name>`, which rapidly leads to a chaotic and unusable observability backend.

It is highly recommended to pair `service.name` with `service.namespace` (to group related services, like `billing-team`) and `service.version` (to track error rates across deployments).

### Resource Detectors: Automating Entity Discovery

Hardcoding infrastructure attributes into application code is an anti-pattern. A containerized Python application shouldn't need to execute shell commands to figure out which Kubernetes node it is running on.

To solve this, the OpenTelemetry SDK provides **Resource Detectors**. These are pluggable components that execute once during SDK initialization. They interrogate the local environment, query metadata APIs (like the AWS EC2 instance metadata endpoint or Kubernetes downward APIs), and automatically populate the Resource with accurate, standardized attributes.

When you initialize the SDK, you typically merge multiple detectors together:

1.  **Environment Detector:** Reads configuration provided by the developer.
2.  **Process Detector:** Captures OS-level details like `process.pid`, `process.executable.name`, and `process.runtime.version`.
3.  **Cloud/Platform Detectors:** Captures provider-specific details (e.g., `aws.ecs.cluster.arn`, `gcp.project.id`).

### Configuring Resource Attributes

There are two primary ways to define Resource attributes: programmatically in the SDK, or externally via Environment Variables. 

**1. Environment Variables (Recommended)**
The most flexible, cloud-native approach is to inject attributes via standard OpenTelemetry environment variables. This keeps infrastructure concerns entirely out of the codebase. The `OTEL_RESOURCE_ATTRIBUTES` variable accepts a comma-separated list of key-value pairs.

```bash
# Set the primary service name
export OTEL_SERVICE_NAME="inventory-api"

# Append additional resource attributes
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,team.owner=platform"
```

**2. Programmatic Configuration**
If you need to construct attributes dynamically at startup, you can define the Resource directly in the SDK initialization code. 

**Example (Java SDK):**
```java
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.semconv.resource.attributes.ResourceAttributes;

Resource myResource = Resource.getDefault()
    .merge(
        Resource.create(
            Attributes.builder()
                .put(ResourceAttributes.SERVICE_NAME, "inventory-api")
                .put(ResourceAttributes.SERVICE_VERSION, "2.1.0")
                .put("custom.tenant.id", "acme-corp")
                .build()
        )
    );

// The resource is then passed to the TracerProvider and MeterProvider
```

By ensuring that every piece of telemetry is stamped with a highly detailed, standardized Resource, you enable powerful cross-signal correlation. When an alert fires for a spike in HTTP 500 errors (Metrics), you can immediately filter down to the exact traces (Tracing) and look at the application logs (Logging) for the specific Kubernetes Pod (Resource) that is failing.