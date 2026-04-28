Applications rarely operate in isolation; their performance is tied to the databases, caches, and message brokers they rely on. When latency spikes, external systems are often the prime suspect. However, these systems represent a boundary where distributed context is frequently lost. This chapter explores how OpenTelemetry bridges this gap. We will examine the standardized semantic conventions for SQL and NoSQL databases, strategies for propagating trace context through asynchronous message queues, and advanced techniques for capturing query execution plans while strictly protecting sensitive PII from leaking into your telemetry.

## 11.1 Standardizing SQL Database Instrumentation

In modern distributed architectures, the database is frequently both the ultimate source of truth and the most common source of latency. When diagnosing a degraded user experience, engineers invariably ask: *Was it the network, the application logic, or the database?* Without standardized telemetry, answering this question across a polyglot microservice ecosystem—where one service uses PostgreSQL via Python, and another uses MySQL via Java—requires deciphering disparate logging formats and proprietary APM metrics.

OpenTelemetry standardizes SQL database observability by defining rigorous Semantic Conventions for database client spans and metrics. This standardization ensures that regardless of the underlying language, driver, or Object-Relational Mapper (ORM), database interactions are recorded uniformly. Consequently, observability backends can aggregate, query, and visualize database performance across the entire fleet seamlessly.

### The Anatomy of a Database Span

When an application queries a database, the application acts as a client. Therefore, any span representing a database call must be created with a `SpanKind` of `CLIENT`. 

Unlike HTTP or gRPC calls, where the trace context is typically injected into headers and propagated to the receiving service (as discussed in Chapter 7), standard SQL protocols do not natively support W3C Trace Context headers. As a result, database spans are generally **leaf spans**—the final node in that specific branch of the distributed trace.

```text
+---------------------------------------------------------+
| Trace: Fetch User Profile                               |
+---------------------------------------------------------+
  |
  +-- [Span: HTTP GET /profile] (Kind: SERVER)
        |
        +-- [Span: App Logic / Auth] (Kind: INTERNAL)
        |
        +-- [Span: SELECT users] (Kind: CLIENT) <--- Leaf Span
              |
              | Network Boundary
              V
            [ PostgreSQL Database ] (No OTel agent inside)
```

### Applying Database Semantic Conventions

To achieve a standardized view, OpenTelemetry enforces a specific set of attributes for database spans. When instrumenting a SQL database interaction, either manually or via auto-instrumentation, the following attributes form the core of the standard:

* **`db.system` (Required):** The identifier for the database management system (DBMS) product. Examples include `postgresql`, `mysql`, `sqlite`, `oracle`, `sqlserver`. This attribute is critical; it allows observability platforms to render custom UI components (like a PostgreSQL logo) and apply system-specific analysis rules.
* **`db.name`:** The name of the database being accessed (e.g., `customers_db`).
* **`db.user`:** The username used to access the database. This is vital for tracking down noisy neighbor issues caused by background batch processes using specific service accounts.
* **`db.statement`:** The actual SQL query being executed. *Note: We will explore the critical topic of sanitizing this attribute to prevent PII leakage in Section 11.4.*
* **`db.operation`:** The name of the operation being executed, typically derived from the statement (e.g., `SELECT`, `INSERT`, `UPDATE`).
* **Network Attributes (`net.peer.name`, `net.peer.port`):** Used to identify the physical or logical network destination of the database server.

#### Code Example: Manual SQL Instrumentation

While automatic instrumentation (Chapter 8) handles this implicitly for popular frameworks, understanding how to apply these conventions manually clarifies the underlying mechanics. The following Python example demonstrates how to correctly construct a standardized database span using the OpenTelemetry SDK:

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind
import psycopg2

tracer = trace.get_tracer(__name__)

def fetch_user_by_id(user_id: int):
    query = "SELECT id, username, email FROM users WHERE id = %s"
    
    # 1. Start the span with the operation name and Kind: CLIENT
    with tracer.start_as_current_span(
        "SELECT users", 
        kind=SpanKind.CLIENT
    ) as span:
        
        # 2. Apply standard db.* semantic conventions
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.name", "identity_db")
        span.set_attribute("db.user", "app_service_role")
        span.set_attribute("db.operation", "SELECT")
        span.set_attribute("db.statement", query)
        span.set_attribute("net.peer.name", "db.internal.network")
        span.set_attribute("net.peer.port", 5432)

        try:
            conn = psycopg2.connect(dsn="...")
            cursor = conn.cursor()
            cursor.execute(query, (user_id,))
            result = cursor.fetchone()
            
            # Record rows returned as a custom span event or attribute if desired
            if result:
                 span.set_attribute("db.response.returned_rows", 1)
                 
            return result
            
        except Exception as e:
            # 3. Standardize error recording
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
        finally:
            if conn:
                cursor.close()
                conn.close()
```

### Standardizing Database Metrics

Traces provide high-fidelity insights into individual query performance, but they do not tell the whole story. Database performance is heavily dictated by connection management and client-side queuing. OpenTelemetry standardizes a suite of metrics specifically aimed at SQL database client behavior, primarily focusing on connection pools.

Standardized database metrics include:

1.  **`db.client.connections.usage` (UpDownCounter):** Tracks the number of connections currently in the pool, broken down by state (e.g., `idle`, `used`). A depleted pool where `used` equals the maximum pool size is a classic early warning sign of a cascading failure.
2.  **`db.client.connections.timeouts` (Counter):** The number of times the application timed out waiting for a connection from the pool. Spikes in this metric often correlate with slow queries blocking threads holding connections.
3.  **`db.client.connections.use_time` (Histogram):** The duration for which a connection was held by the application before being returned to the pool.

By implementing these standards—whether by wrapping a low-level driver (like Go's `database/sql`) or utilizing an ORM instrumentation library—you transform opaque database interactions into highly structured, queryable observability data. This foundational step ensures that when a database bottleneck occurs, it is immediately identifiable on the dashboard, completely decoupled from the specific language or framework making the call.

## 11.2 Handling NoSQL, Caches, and Message Queues

Beyond relational databases, modern microservice architectures rely heavily on NoSQL document stores, in-memory key-value caches, and asynchronous message brokers to achieve scalability and resilience. While the overarching principles of OpenTelemetry apply across all these technologies, the specific semantic conventions and context propagation mechanisms must adapt to accommodate non-relational queries, volatile storage, and disconnected event-driven workflows.

### Instrumenting Document Stores and Key-Value Caches

Interactions with NoSQL databases (like MongoDB or Cassandra) and caches (like Redis or Memcached) are typically synchronous from the application's perspective. Therefore, just like SQL databases, spans representing these calls use the `CLIENT` span kind and leverage the `db.*` semantic namespace. 

However, because there is no standardized query language like SQL, the `db.statement` attribute requires a different approach.

* **NoSQL (e.g., MongoDB):** The `db.operation` might be `find`, `insert`, or `aggregate`. The `db.statement` is often represented as a serialized JSON string of the query filter. It is critical to sanitize this JSON payload to prevent exposing sensitive user data (discussed further in Section 11.4).
* **Caches (e.g., Redis):** The `db.operation` will match the specific cache command, such as `GET`, `SET`, `HGETALL`, or `EXPIRE`. The `db.statement` usually contains the command and the key (e.g., `GET user:session:12345`). 

**Tracking Cache Performance via Metrics**
Tracing individual cache calls is useful for identifying latency spikes, but assessing the overall health of a caching layer requires metrics—specifically, tracking the **cache hit ratio**. While you can add a `cache.hit` boolean attribute to a span, it is far more efficient to record this using a metric counter:

* `cache.hits` (Counter)
* `cache.misses` (Counter)

By tagging these metrics with the `db.system` (e.g., `redis`) and `db.name` (e.g., `session_cache`), observability platforms can easily calculate and alert on degrading cache performance before it overwhelms the underlying primary database.

### Asynchronous Messaging and Event-Driven Architectures

Instrumenting message queues (like Apache Kafka, RabbitMQ, or Amazon SQS) introduces a fundamental shift in OpenTelemetry concepts. Unlike a synchronous database call that acts as a leaf node in a trace, a message queue acts as an intermediary bridge between two decoupled services. 

To maintain a continuous distributed trace across an asynchronous boundary, OpenTelemetry introduces two specific span kinds: `PRODUCER` and `CONSUMER`.

```text
+-------------------------------------------------------------------+
| Trace: Process Checkout Event                                     |
+-------------------------------------------------------------------+
  |
  +-- [Service A: Order API]
        |
        +-- [Span: publish checkout_topic] (Kind: PRODUCER)
              |
              | 1. Inject Trace Context into Message Headers
              V
            [ Kafka / RabbitMQ Broker ] (Opaque to the trace)
              |
              | 2. Extract Trace Context from Message Headers
              V
  +-- [Service B: Inventory Worker]
        |
        +-- [Span: receive checkout_topic] (Kind: CONSUMER)
              |
              +-- [Span: process order] (Kind: INTERNAL)
```

#### Messaging Semantic Conventions

When instrumenting messaging systems, the `db.*` attributes are replaced by the `messaging.*` namespace:

* **`messaging.system` (Required):** Identifies the broker technology (e.g., `kafka`, `rabbitmq`, `sqs`).
* **`messaging.destination.name`:** The name of the topic, queue, or exchange the message is being sent to or received from (e.g., `orders-topic`).
* **`messaging.operation`:** Describes the action being performed. The standard values are `publish` (for Producers), `receive` (fetching the message from the broker), and `process` (the actual business logic executed on the payload).
* **`messaging.message.id`:** A unique identifier for the message, crucial for tracking duplicated deliveries or dead-letter queue (DLQ) analysis.

#### Code Example: Context Propagation in Message Queues

The biggest challenge in asynchronous observability is ensuring the trace context survives the trip through the broker. Because brokers do not understand HTTP headers, you must use the OpenTelemetry Propagator API to manually inject the trace context into the message's native metadata or header properties.

The following Python example demonstrates how a Producer injects context into a Kafka message, and how a Consumer extracts it to continue the trace:

```python
from opentelemetry import trace, propagate
from opentelemetry.trace import SpanKind
from kafka import KafkaProducer, KafkaConsumer

tracer = trace.get_tracer(__name__)
producer = KafkaProducer(bootstrap_servers='localhost:9092')

def publish_message(topic: str, payload: bytes):
    # 1. Start a PRODUCER span
    with tracer.start_as_current_span(
        f"{topic} publish",
        kind=SpanKind.PRODUCER,
        attributes={
            "messaging.system": "kafka",
            "messaging.destination.name": topic,
            "messaging.operation": "publish"
        }
    ) as span:
        
        # 2. Create a dictionary to hold the propagated context
        headers = {}
        
        # 3. Inject the current trace context into the headers dictionary
        propagate.inject(headers)
        
        # 4. Format headers for Kafka (list of tuples: [(key, bytes_value)])
        kafka_headers = [(k, v.encode('utf-8')) for k, v in headers.items()]
        
        # 5. Send message with the trace context embedded
        producer.send(topic, value=payload, headers=kafka_headers)
        producer.flush()

def consume_messages(topic: str):
    consumer = KafkaConsumer(topic, bootstrap_servers='localhost:9092')
    
    for message in consumer:
        # 1. Reconstruct the headers dictionary from the Kafka format
        headers = {k: v.decode('utf-8') for k, v in message.headers}
        
        # 2. Extract the trace context using the Propagator API
        context = propagate.extract(headers)
        
        # 3. Start a CONSUMER span, passing in the extracted context
        with tracer.start_as_current_span(
            f"{topic} process",
            context=context, # This links the trace to the Producer!
            kind=SpanKind.CONSUMER,
            attributes={
                "messaging.system": "kafka",
                "messaging.destination.name": topic,
                "messaging.operation": "process"
            }
        ) as span:
            
            # Execute business logic on message.value
            process_payload(message.value)
```

By correctly applying the `PRODUCER` and `CONSUMER` span kinds and meticulously propagating context through message headers, you eliminate visibility black holes in event-driven architectures. This allows operators to easily visualize the end-to-end lifecycle of an asynchronous event, from the initial API request to the final worker process, regardless of how long the message sat in the queue.

## 11.3 Capturing Query Execution Plans and Payload Data

Knowing that a database query took five seconds is critical for identifying a bottleneck. However, resolving that bottleneck requires understanding *why* it took five seconds. Database administrators and engineers typically need two pieces of context to debug a slow query: the exact data being requested (bind parameters) and the database engine's strategy for retrieving it (the execution plan). 

While OpenTelemetry's standard `db.*` semantic conventions cover the operation and the parameterized SQL statement, capturing execution plans and high-fidelity payloads requires advanced instrumentation strategies to balance observability depth with system performance.

### Capturing Bind Parameters and Payloads

Modern applications use parameterized queries or prepared statements (e.g., `SELECT * FROM users WHERE status = ? AND age > ?`) to prevent SQL injection and improve database caching. If your telemetry only captures the parameterized string, you cannot replay the query to reproduce the performance issue.

To capture the actual payload data, you must extract the variables at the time of execution and attach them to the span.

* **Bind Parameters (`db.statement.parameters`):** While not universally finalized in the core OTel specification, the community standard for attaching bind parameters is to serialize them into a JSON array or dictionary and attach them as a span attribute (e.g., `span.set_attribute("db.statement.parameters", '["active", 30]')`).
* **Result Set Metadata:** Knowing the size of the payload returned to the application is just as important as the request. Always capture the number of rows returned using `db.response.returned_rows` (an integer attribute). If a query returns 10,000 rows when the application only needs 10, this metric will immediately highlight the inefficiency.

> **Crucial Warning:** Capturing bind parameters and payload data dramatically increases the risk of ingesting Personally Identifiable Information (PII) or sensitive credentials into your observability backend. This practice must always be paired with robust sanitization and redaction pipelines, which we will cover extensively in Section 11.4.

### Strategies for Capturing Execution Plans

An execution plan (generated via `EXPLAIN` or `EXPLAIN ANALYZE` in most SQL databases) details whether the database used an index, performed a full table scan, or executed a costly nested loop join.

Attaching execution plans to OpenTelemetry spans provides the ultimate context for database debugging, but it introduces a significant challenge: **Generating an execution plan requires a secondary call to the database, which adds latency and overhead.**

You cannot afford to run an `EXPLAIN` query for every single database span. Instead, you must employ conditional capture strategies:

#### 1. Threshold-Based In-Band Capture
The most straightforward approach is to evaluate the query duration post-execution. If the query exceeds a predefined SLA (e.g., > 500ms), the application immediately fires a secondary `EXPLAIN` query using the same parameters and attaches the result to the span before closing it.

* **Pros:** Easy to implement in middleware or ORM hooks.
* **Cons:** Blocks the application thread while the `EXPLAIN` runs, slightly exacerbating the latency for the end-user.

#### 2. Out-of-Band (Asynchronous) Capture
To avoid impacting the critical path, the telemetry pipeline can dispatch the `EXPLAIN` request asynchronously. When a slow query is detected, the statement and parameters are sent to a background worker queue. The worker executes the `EXPLAIN` and creates a standalone span (linked to the original trace via the W3C Trace Context) containing the plan.

#### 3. Baggage-Triggered Debug Capture
You can use OpenTelemetry Baggage to dynamically trigger plan capture. For example, an engineer troubleshooting in production can inject a specific header (e.g., `debug-db-plan=true`) into an HTTP request. This flag propagates via Baggage through the microservices. The database instrumentation checks for this Baggage entry; if present, it captures the execution plan regardless of the query duration.

### Recording the Plan: Attributes vs. Events

When you capture an execution plan, you must decide how to attach it to the OpenTelemetry span.

* **Span Attributes:** You can store the plan as a stringified JSON object or raw text under a custom attribute like `db.statement.plan`. This makes the plan easily searchable in most backends, but large plans can exceed attribute size limits (often capped at 4KB or 8KB depending on the backend and Collector configuration).
* **Span Events:** Because capturing a plan is a discrete occurrence (often happening after the main query completes), it is highly effective to record it as a Span Event. Events can hold larger text payloads and include their own timestamps.

### Code Example: Threshold-Based Plan Capture

The following Python snippet demonstrates how to instrument an ORM or database wrapper to capture both bind parameters and, conditionally, the execution plan using Span Events.

```python
import time
import json
from opentelemetry import trace
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)
SLOW_QUERY_THRESHOLD_MS = 500

def execute_query_with_telemetry(db_conn, query: str, params: tuple):
    with tracer.start_as_current_span(
        "DB Query", 
        kind=SpanKind.CLIENT,
        attributes={"db.system": "postgresql"}
    ) as span:
        
        # 1. Attach the parameterized statement
        span.set_attribute("db.statement", query)
        
        # 2. Attach bind parameters (JSON serialized for safety/formatting)
        # Note: Ensure these are sanitized before serialization in production!
        span.set_attribute("db.statement.parameters", json.dumps(params))

        start_time = time.perf_counter()
        
        try:
            cursor = db_conn.cursor()
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Record payload size
            span.set_attribute("db.response.returned_rows", len(results))
            
            # 3. Check duration and conditionally capture EXPLAIN plan
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if duration_ms > SLOW_QUERY_THRESHOLD_MS:
                explain_query = f"EXPLAIN (FORMAT JSON) {query}"
                cursor.execute(explain_query, params)
                plan = cursor.fetchone()[0]
                
                # Attach the plan as a Span Event to avoid attribute bloat
                span.add_event(
                    "Query Execution Plan",
                    attributes={
                        "db.statement.plan": json.dumps(plan),
                        "db.statement.plan.format": "json"
                    }
                )
                
            return results
            
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
        finally:
            cursor.close()
```

By intelligently layering payload data and conditional execution plans onto your database spans, you bridge the gap between application performance monitoring and deep database administration. This transforms a simple "slow database" alert into a fully contextualized debug package, equipping engineers with exactly what they need to optimize indexing, rewrite queries, or adjust connection pooling.

## 11.4 Sanitizing Queries to Prevent PII Leaks

The fundamental tension in observability is the trade-off between fidelity and privacy. As established in Section 11.3, capturing deep context like bind parameters and execution plans is invaluable for diagnosing complex database performance issues. However, databases are the primary repositories of Personally Identifiable Information (PII), Personal Health Information (PHI), and financial data (PCI). If your telemetry pipeline blindly captures queries and their parameters, your observability backend inadvertently becomes an unencrypted, broadly accessible shadow database of your most sensitive user data.

Preventing PII leaks requires a defense-in-depth strategy. You must sanitize telemetry data across multiple layers: at the point of origin (within the application SDK) and at the aggregation layer (within the OpenTelemetry Collector).

### The Anatomy of a Telemetry Data Leak

PII typically leaks into OpenTelemetry database spans through three primary vectors:

1.  **Unparameterized Raw Queries:** When applications concatenate strings to build SQL queries rather than using prepared statements (e.g., `SELECT * FROM users WHERE email = 'jane.doe@example.com'`), the PII becomes hardcoded into the `db.statement` attribute.
2.  **Captured Bind Parameters:** If you enable the capture of bind variables (`db.statement.parameters`), raw values like passwords, social security numbers, and credit card strings will be attached directly to the span.
3.  **Database Exception Messages:** Many database engines include the offending data in constraint violation errors. For example, a PostgreSQL unique constraint error might return: `duplicate key value violates unique constraint "users_email_key". Detail: Key (email)=(jane.doe@example.com) already exists.` If your instrumentation records raw exceptions, this data is leaked.

### Layer 1: Client-Side Redaction via Span Processors

The most secure place to sanitize data is inside the application process, before the telemetry is ever serialized or transmitted over the network. This ensures that intermediary proxies and the network itself are never exposed to sensitive payloads.

OpenTelemetry SDKs provide **Span Processors**, which allow you to hook into the lifecycle of a span. By implementing a custom span processor, you can inspect and mutate the span's attributes immediately before it is exported.

#### Code Example: A PII-Redacting Span Processor

The following Python example demonstrates how to create a custom `SpanProcessor` that intercepts completed spans, looks for the `db.statement.parameters` attribute, and redacts sensitive keys based on a predefined deny-list.

```python
import json
from opentelemetry.sdk.trace import SpanProcessor
from opentelemetry import trace

class PIIRedactionProcessor(SpanProcessor):
    def __init__(self):
        # Define fields that should never be recorded in plain text
        self.sensitive_keys = {'password', 'ssn', 'credit_card', 'email', 'phone'}

    def on_start(self, span, parent_context):
        pass # We only need to inspect spans when they finish

    def on_end(self, span):
        # Only process spans that are actual database calls
        if span.kind != trace.SpanKind.CLIENT or not span.attributes.get("db.system"):
            return

        # 1. Redact Bind Parameters
        params_str = span.attributes.get("db.statement.parameters")
        if params_str:
            try:
                params = json.loads(params_str)
                if isinstance(params, dict):
                    redacted_params = {
                        k: "[REDACTED]" if k.lower() in self.sensitive_keys else v 
                        for k, v in params.items()
                    }
                    span.set_attribute("db.statement.parameters", json.dumps(redacted_params))
            except json.JSONDecodeError:
                # If parsing fails, fail secure and redact the whole string
                span.set_attribute("db.statement.parameters", "[REDACTED_PARSE_ERROR]")

        # 2. Sanitize Error Messages
        # Iterate through span events to find and scrub exception details
        for event in span.events:
            if event.name == "exception":
                msg = event.attributes.get("exception.message", "")
                if "Key (email)=" in msg:
                    # Scrub the email from the PostgreSQL error message
                    safe_msg = msg.split("Detail:")[0] + "Detail: [REDACTED_PII]"
                    # Note: OpenTelemetry span events are immutable in some SDKs once added.
                    # In those cases, you must prevent the raw exception from being recorded 
                    # at the source (the try/catch block) rather than mutating it here.
```

### Layer 2: Pipeline Redaction via the OTel Collector

While client-side redaction is the most secure, relying solely on it is risky in a polyglot microservice environment. You would need to ensure every single development team, across every language, correctly implements and updates their redaction processors. 

To mitigate this risk, the OpenTelemetry Collector acts as a centralized secondary firewall. By utilizing the `transform` processor (powered by the OpenTelemetry Transformation Language, OTTL) or the community-contributed `redaction` processor, operators can enforce global sanitization rules.

```text
+-------------------+       +------------------------------------+       +-------------+
| Microservice A    |       | OpenTelemetry Collector            |       | Observability|
| (Python)          | ----> | 1. Receive OTLP Data               | ----> | Backend     |
+-------------------+       | 2. Transform Processor (Regex/Hash)|       |             |
                            | 3. Export Safe Data                |       +-------------+
+-------------------+       +------------------------------------+
| Microservice B    | ----> / 
| (Java - Legacy)   |
+-------------------+
```

#### Collector Configuration Example

The following `otelcol-config.yaml` snippet uses the `transform` processor to globally scrub email addresses from any `db.statement` attribute across all incoming traces, regardless of which service generated them.

```yaml
processors:
  transform/redact_pii:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          # Use OTTL to regex-replace standard email formats in the db.statement
          - replace_pattern(attributes["db.statement"], "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[REDACTED_EMAIL]")
          
          # Alternatively, hash a user ID to maintain debuggability without exposing the ID
          - set(attributes["db.user_id"], SHA256(attributes["db.user_id"])) where attributes["db.user_id"] != nil

pipelines:
  traces:
    receivers: [otlp]
    processors: [transform/redact_pii, batch] # Apply redaction before batching/exporting
    exporters: [otlp/backend]
```

### Strategic Recommendations for Data Sanitization

To architect a secure and compliant observability pipeline:

1.  **Opt-In, Not Opt-Out:** Never capture `db.statement.parameters` by default. This capability should be strictly opt-in, explicitly enabled via environment variables only in pre-production environments, or enabled dynamically for short periods in production under strict auditing.
2.  **Use Cryptographic Hashing for Correlation:** If you need to know that *the same* user is experiencing repeated database timeouts, but you cannot legally store their User ID, use an HMAC (Hash-Based Message Authentication Code) with a secret salt. This allows you to track a consistent anonymous identifier (e.g., `user_hash: 8f4e2...`) across spans without knowing who the user actually is.
3.  **Regularly Audit Telemetry Data:** Treat your observability backend as an attack surface. Run automated queries against your tracing backend to search for regex patterns matching credit cards or emails in span attributes to detect accidental regressions in your instrumentation.