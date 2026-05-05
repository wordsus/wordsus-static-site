One of VictoriaMetrics' most powerful features is its unparalleled flexibility in data ingestion. While it acts as a drop-in replacement for Prometheus, its capabilities extend far beyond the standard `remote_write` protocol. In this chapter, we will explore how VictoriaMetrics functions as a universal telemetry translator, natively accepting data from diverse agents without requiring intermediary proxies. Whether you are pushing metrics via InfluxDB Line Protocol, streaming legacy Graphite, adopting OpenTelemetry, or migrating from SaaS solutions like DataDog and NewRelic, VictoriaMetrics seamlessly unifies your data streams.

## 4.1 The Prometheus `remote_write` Protocol

While Prometheus was initially designed around a pull-based model—scraping targets directly to store data locally—the growing need for high availability, global views, and long-term storage led to the creation of the `remote_write` protocol. Today, this protocol is the de facto standard for pushing time-series data across the cloud-native ecosystem. 

VictoriaMetrics provides native, highly optimized support for ingesting data via `remote_write`, making it an ideal drop-in replacement for Prometheus long-term storage.

### How `remote_write` Works Under the Hood

The `remote_write` protocol is designed for high throughput and network efficiency. When a Prometheus server (or a compatible forwarder) collects data, it buffers the samples, batches them together, and transmits them to the remote endpoint. 

The transmission process relies on three core technologies:
1.  **Transport:** Standard HTTP POST requests.
2.  **Encoding:** Protocol Buffers (Protobuf), which provides a strictly typed, binary payload that is much smaller and faster to serialize than JSON or plain text.
3.  **Compression:** Snappy, a fast block-level compression algorithm that significantly reduces network bandwidth without heavily taxing the CPU.

```text
+-------------------+                                  +-------------------+
|    Prometheus     |                                  |  VictoriaMetrics  |
|   (Scraping node) |                                  |    (Storage)      |
+-------------------+                                  +-------------------+
| 1. Scrape targets |                                  |                   |
| 2. Append to WAL  | === HTTP POST /api/v1/write ===> | 1. Receive batch  |
| 3. Batch samples  |     (Protobuf + Snappy)          | 2. Unpack & Parse |
| 4. Compress       |                                  | 3. Write to Disk  |
+-------------------+                                  +-------------------+
```

Within the Protobuf payload, the data is organized into a `WriteRequest` message. This message contains an array of `TimeSeries` objects. Each `TimeSeries` includes:
* A set of **Labels** (key-value pairs, including the mandatory `__name__` label).
* An array of **Samples** (each containing a Unix timestamp in milliseconds and a 64-bit floating-point value).

### Configuring Prometheus to Send to VictoriaMetrics

To instruct a standard Prometheus server to push its scraped data to VictoriaMetrics, you only need to add a `remote_write` block to your `prometheus.yml` configuration file. 

Here is a basic example:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:9100']

# Instruct Prometheus to push data to VictoriaMetrics
remote_write:
  - url: "http://<victoriametrics-host>:8428/api/v1/write"
    # Optional: tune queue settings for high throughput
    queue_config:
      max_samples_per_send: 10000
      capacity: 20000
      max_shards: 30
```

Once Prometheus is restarted or reloaded with this configuration, it will begin tailing its Write-Ahead Log (WAL) and pushing batches of time-series data to the specified VictoriaMetrics URL.

### Endpoint Structures in VictoriaMetrics

The URL you provide in the `remote_write` configuration depends on the architectural deployment of VictoriaMetrics you are using (as outlined in Chapter 2).

* **Single-Node:** The ingestion endpoint maps directly to the standard API path.
    `http://<vm-host>:8428/api/v1/write`
* **Cluster Version:** Ingestion is handled by the `vminsert` component. Because the cluster supports multi-tenancy (covered in Chapter 18), the URL must include the `accountID` (and optionally a `projectID`).
    `http://<vminsert-host>:8480/insert/<accountID>/prometheus/api/v1/write`

### Reliability and Backpressure

The `remote_write` protocol handles delivery guarantees through HTTP status codes. VictoriaMetrics is engineered to process massive influxes of data, but in scenarios where the storage backend is overwhelmed, it relies on this status code mechanism to manage backpressure:

* **HTTP 2xx (Success):** VictoriaMetrics successfully received and processed the batch. The sender can discard these samples from its buffer.
* **HTTP 4xx (Client Error):** The payload was malformed, too large, or violated a hard limit. The sender will *drop* the data and will not retry, preventing poison pills from blocking the pipeline.
* **HTTP 5xx (Server Error):** VictoriaMetrics is temporarily unavailable or overloaded. The sender will retain the data in its WAL and retry with exponential backoff.

By strictly adhering to these protocol standards, VictoriaMetrics ensures zero data loss during temporary network partitions or ingestion spikes, provided the sending agent has sufficient disk buffer space.

## 4.2 Integrating with the InfluxDB Line Protocol

While the Prometheus `remote_write` protocol is dominant in cloud-native environments, the InfluxDB Line Protocol (ILP) remains exceptionally popular, particularly in IoT (Internet of Things), industrial telemetry, and environments heavily reliant on the Telegraf agent. VictoriaMetrics natively understands and accepts the InfluxDB Line Protocol, allowing you to seamlessly migrate from InfluxDB or use Telegraf as a data collection agent without needing translation proxies.

### The Anatomy of the Line Protocol

Unlike the binary payload of `remote_write`, the InfluxDB Line Protocol is a text-based format. Each line represents a single data point. It is highly readable but requires parsing at the ingestion layer.

The protocol consists of four primary components, separated by spaces and commas:

```text
<measurement>[,<tag_key>=<tag_value>...] <field_key>=<field_value>[,<field_key2>=<field_value2>...] [timestamp]

|--------------------------------------| |-------------------------------------------------------| |---------|
                Part 1:                                           Part 2:                             Part 3: 
          Measurement & Tags                                 Fields (Metrics)                        Timestamp
          (Comma-separated)                                 (Comma-separated)                       (Optional)
```

Here is a practical example of a CPU metric:
```text
cpu_usage,host=server-01,region=us-east cpu_idle=85.2,cpu_user=10.1 1677600000000000000
```

### How VictoriaMetrics Maps InfluxDB Data

Because VictoriaMetrics utilizes a Prometheus-compatible underlying data model, it must translate the InfluxDB multi-field, measurement-based model into flat time series. It does this automatically during ingestion.

When VictoriaMetrics receives the line protocol payload above, it performs the following transformations:

1.  **Metric Name Creation:** It concatenates the `<measurement>` and the `<field_key>` with an underscore (`_`).
2.  **Label Mapping:** InfluxDB tags are mapped directly to Prometheus-style labels.
3.  **Timestamp Conversion:** InfluxDB typically sends timestamps in nanoseconds. VictoriaMetrics automatically truncates or converts these to milliseconds (its native resolution) unless instructed otherwise.

The single line of InfluxDB protocol from our example is split and stored in VictoriaMetrics as two distinct time series:

```promql
# Resulting Time Series 1
cpu_usage_cpu_idle{host="server-01", region="us-east"} 85.2 1677600000000

# Resulting Time Series 2
cpu_usage_cpu_user{host="server-01", region="us-east"} 10.1 1677600000000
```

### Ingestion Endpoints and Telegraf Configuration

To ingest Line Protocol data, you must point your agents to the specific InfluxDB-compatible endpoint exposed by VictoriaMetrics.

* **Single-Node:** `http://<vm-host>:8428/write`
* **Cluster Version:** `http://<vminsert-host>:8480/insert/<accountID>/influx/write`

You can test this immediately using a standard `curl` command:

```bash
curl -d 'temperature,sensor=bme280,location=warehouse value=22.5' -X POST 'http://localhost:8428/write'
```

**Configuring Telegraf**

Telegraf is the most common source of Line Protocol data. To route Telegraf metrics to VictoriaMetrics, configure the `[[outputs.influxdb]]` plugin in your `telegraf.conf` file. You do not need the `influxdb_v2` plugin; the standard v1 plugin works perfectly because VictoriaMetrics mimics the v1 write API.

```toml
[[outputs.influxdb]]
  ## The HTTP endpoint of your VictoriaMetrics instance
  urls = ["http://<victoriametrics-host>:8428"]
  
  ## VictoriaMetrics ignores the database name by default, 
  ## but Telegraf requires this field to be present.
  database = "telegraf"
  
  ## Optional: Increase timeout for large batches
  timeout = "5s"
```

### Handling Timestamps and Precision

A common pitfall when integrating external protocols is timestamp mismatch. InfluxDB defaults to nanosecond precision, while VictoriaMetrics operates internally on milliseconds. 

If you are using custom scripts to push ILP data and your timestamps are in seconds or milliseconds, you must append the `precision` query parameter to the write URL to tell VictoriaMetrics how to interpret the time.

* For milliseconds: `http://localhost:8428/write?precision=ms`
* For seconds: `http://localhost:8428/write?precision=s`

If the timestamp is omitted entirely from the ingested line, VictoriaMetrics will automatically assign the current server time (in milliseconds) at the exact moment the payload is processed.

## 4.3 Scraping Data via the Graphite Plaintext Protocol

Graphite is one of the oldest and most influential time-series monitoring tools. While its ecosystem has largely been superseded by Prometheus and modern cloud-native stacks, the Graphite plaintext protocol remains incredibly prevalent. Many legacy applications, network switches, and custom scripts still rely on it because of its absolute simplicity. 

VictoriaMetrics provides native, high-performance ingestion of Graphite data, allowing you to bridge legacy infrastructure with modern MetricsQL querying and alerting without needing intermediary services like `graphite_exporter` or `statsd`.

### The Anatomy of the Plaintext Protocol

The Graphite plaintext protocol is arguably the simplest ingestion format in the monitoring ecosystem. It consists of a single line of text per data point, separated by spaces. 

```text
<metric_path> <metric_value> <metric_timestamp>

|--------------------------| |------------| |----------------|
          Part 1:               Part 2:          Part 3:
   Hierarchical Metric Name   Floating Point    Unix Epoch 
                              or Integer        (in seconds)
```

Here is a practical example of a memory metric being reported:
```text
servers.us-east.web01.memory.free 1048576 1677600000
```

Unlike the multidimensional labeled approach of Prometheus, classic Graphite uses a rigid, dot-separated hierarchical namespace. 

#### Handling Graphite Tags (Graphite 1.1+)
To compete with modern TSDBs, later versions of Graphite introduced "Graphite Tags." This appends key-value pairs to the end of the metric path using semicolons. VictoriaMetrics fully supports this syntax:

```text
servers.memory.free;region=us-east;host=web01 1048576 1677600000
```

### Data Translation and Storage in VictoriaMetrics

When VictoriaMetrics ingests Graphite data, it must adapt the hierarchical model into its internal labeled architecture.

1.  **Classic Graphite:** The entire dot-separated string is mapped directly to the `__name__` label.
    * Input: `servers.web01.cpu.load 1.5 1677600000`
    * Stored as: `{__name__="servers.web01.cpu.load"}`
2.  **Tagged Graphite:** The base metric path becomes the `__name__` label, and the semicolon-separated tags are parsed into native Prometheus labels.
    * Input: `cpu.load;host=web01 1.5 1677600000`
    * Stored as: `cpu.load{host="web01"}`

*(Note: If you need to extract labels from a classic, rigid dot-separated path, you will use Stream Aggregation or Relabeling rules, which we will cover extensively in Chapter 6).*

### Ingestion Methods and Configuration

VictoriaMetrics supports ingesting Graphite data via two distinct methods: a dedicated TCP/UDP listener, and standard HTTP POST requests.

#### Method 1: The TCP/UDP Listener (Recommended for Legacy Systems)
Many older systems expect to open a raw socket (typically port `2003`) and stream text directly. To enable this in VictoriaMetrics, you must start the single-node binary or the `vminsert` component with the `-graphiteListenAddr` flag.

```bash
# Start VictoriaMetrics listening for Graphite on port 2003
./victoria-metrics-prod -graphiteListenAddr=":2003"
```

Once enabled, you can stream data to it using basic networking tools like `netcat` (`nc`):

```bash
echo "local.random.diceroll 4 `date +%s`" | nc localhost 2003
```

#### Method 2: HTTP POST Ingestion
If you are passing data through proxies, load balancers, or serverless functions, HTTP is often easier to manage than raw TCP sockets. VictoriaMetrics exposes dedicated HTTP endpoints for Graphite plaintext payloads.

* **Single-Node:** `http://<vm-host>:8428/api/v1/import/graphite`
* **Cluster Version:** `http://<vminsert-host>:8480/insert/<accountID>/prometheus/api/v1/import/graphite`

You can test this endpoint using `curl`:

```bash
curl -d "servers.web01.disk.bytes_used 500000000 $(date +%s)" \
  -X POST 'http://localhost:8428/api/v1/import/graphite'
```

### Timestamp Precision

It is critical to note that the Graphite protocol historically expects timestamps in **seconds**, whereas VictoriaMetrics natively operates in **milliseconds**. 

When VictoriaMetrics receives a Graphite payload, it uses a heuristic to determine the timestamp format:
* If the timestamp value is less than `2147483647` (the year 2038 in seconds), VictoriaMetrics assumes it is in seconds and automatically multiplies it by 1,000 to store it as milliseconds.
* If the timestamp is much larger, it assumes the client is already sending milliseconds or nanoseconds.

If you omit the timestamp entirely from the payload (e.g., `servers.web01.cpu.load 1.5`), VictoriaMetrics will instantly append the server's current timestamp at the moment the metric is processed.

## 4.4 Cloud-Native Ingestion with OpenTelemetry (OTLP)

As the cloud-native landscape has matured, the OpenTelemetry Protocol (OTLP) has rapidly emerged as the vendor-neutral standard for transmitting observability data—including traces, logs, and metrics. While many organizations historically relied on Prometheus `remote_write` to bridge the gap between OpenTelemetry Collectors and their storage backends, VictoriaMetrics eliminates this middleman by offering robust, native support for OTLP metrics ingestion.

By ingesting OTLP directly, you bypass the CPU-intensive translation layers previously required to convert OTLP into Prometheus-compatible payloads, resulting in a leaner and more efficient telemetry pipeline.

```text
Traditional Translation Architecture:
[OTel SDK] ---> (OTLP) ---> [OTel Collector (PRW Exporter)] ---> (remote_write) ---> [VictoriaMetrics]

Native OTLP Architecture (VictoriaMetrics Recommended):
[OTel SDK] ---> (OTLP) ---> [OTel Collector (OTLP Exporter)] ---> (Native OTLP)  ---> [VictoriaMetrics]
```

### How VictoriaMetrics Handles OTLP

When an OpenTelemetry SDK or an OTel Collector pushes metrics to VictoriaMetrics, the data arrives as Protocol Buffers (Protobuf) payloads. VictoriaMetrics unpacks these payloads and intelligently maps the OTLP data model into its internal time-series architecture on the fly:

1.  **Resource Attributes:** In OpenTelemetry, infrastructure metadata (like `host.name`, `cloud.region`, or `k8s.pod.name`) are defined as Resource Attributes. VictoriaMetrics automatically promotes all Resource Attributes to standard Prometheus labels, attaching them to every ingested metric point.
2.  **Histograms:** OpenTelemetry's advanced exponential histograms are natively translated into VictoriaMetrics' highly optimized internal histogram format (utilizing `vmrange` labels) without losing precision.
3.  **Temporality:** OpenTelemetry supports both Delta and Cumulative aggregation temporality. VictoriaMetrics operates best with Cumulative temporality (the Prometheus standard). While VictoriaMetrics can ingest Delta temporality natively (queryable later via `sum_over_time`), it is highly recommended to configure your OTel Collector to use a `deltatocumulative` processor before pushing data to ensure seamless compatibility with standard `rate()` functions in PromQL.

### Configuration and Endpoints

VictoriaMetrics accepts OTLP over both HTTP and gRPC transports. By default, the standard VictoriaMetrics HTTP server listens for OTLP metrics on a dedicated API path.

* **Single-Node:** `http://<vm-host>:8428/opentelemetry/v1/metrics`
* **Cluster Version (vminsert):** `http://<vminsert-host>:8480/insert/<accountID>/opentelemetry/v1/metrics`

If your OpenTelemetry agents enforce gzip compression (which is standard and highly recommended for network efficiency), VictoriaMetrics respects the `Content-Encoding: gzip` HTTP header and decompresses the batch seamlessly.

### Naming Conventions and the Prometheus Gap

One of the largest friction points when adopting OpenTelemetry alongside an existing Prometheus ecosystem is the metric naming convention. OpenTelemetry strictly utilizes dot-notation (e.g., `process.cpu.time`), whereas Prometheus and PromQL mandate underscores (e.g., `process_cpu_time`).

If you migrate from Prometheus scrapers to OpenTelemetry SDKs overnight, your existing Grafana dashboards and `vmalert` rules will likely break because they expect the legacy underscored names.

VictoriaMetrics solves this gracefully via command-line flags that can be applied to the single-node binary or the `vminsert` cluster component:

* **`-opentelemetry.usePrometheusNaming`**: When enabled, VictoriaMetrics intercepts incoming OTLP metrics and transforms their names and labels to comply strictly with the Prometheus specification. For example, `process.cpu.time{service.name="auth"}` is translated instantly to `process_cpu_time_seconds_total{service_name="auth"}` before being written to disk.
* **`-usePromCompatibleNaming`**: A broader flag that aggressively replaces any characters unsupported by Prometheus with underscores across *all* ingestion protocols.

### Integrating the OpenTelemetry Collector

If you are using the OpenTelemetry Collector as a central aggregation tier, configuring it to push to VictoriaMetrics is as simple as defining an `otlphttp` exporter.

Here is a practical, production-ready example of the Collector configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_max_size: 10000
    timeout: 5s

exporters:
  # Export natively to VictoriaMetrics using OTLP/HTTP
  otlphttp/victoriametrics:
    # Use the /opentelemetry/v1/metrics path for VictoriaMetrics
    metrics_endpoint: "http://<victoriametrics-host>:8428/opentelemetry/v1/metrics"
    tls:
      insecure: true # Set to false and provide certs if using HTTPS

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/victoriametrics]
```

By pointing the OTel Collector directly at VictoriaMetrics via the `otlphttp` exporter, you achieve a highly scalable, zero-translation ingestion pipeline that leverages the full power and semantic conventions of modern cloud-native instrumentation.

## 4.5 Handling DataDog and NewRelic Formats

For organizations transitioning away from expensive SaaS monitoring solutions, re-instrumenting an entire fleet of servers and applications is often the biggest bottleneck. VictoriaMetrics removes this friction by acting as a drop-in replacement for proprietary backends, natively accepting metrics generated by the DataDog Agent and the NewRelic Infrastructure Agent.

This allows you to keep your existing agents running while routing their data to VictoriaMetrics—either for a permanent migration or for a "dual-shipping" strategy during a transition period.

### Integrating the DataDog Agent

VictoriaMetrics natively implements the DataDog "Submit Metrics" API (`/api/v2/series` and `/api/beta/sketches`). When DataDog payloads are received, VictoriaMetrics automatically parses the proprietary JSON structure, sanitizes the metric names according to DataDog conventions, and maps DataDog "tags" into standard Prometheus labels.

**Endpoint Structures**
The base URL you provide to the DataDog agent depends on your VictoriaMetrics deployment:
* **Single-Node:** `http://<vm-host>:8428/datadog`
* **Cluster Version:** `http://<vminsert-host>:8480/insert/<accountID>/datadog`

*(Note: The agent will automatically append the specific API paths like `/api/v2/series` to this base URL).*

**Configuring the DataDog Agent**
You can redirect the DataDog agent's output by overriding its default destination URL. This is done by setting the `DD_DD_URL` environment variable or modifying the `dd_url` parameter in the `datadog.yaml` configuration file.

```bash
# Running the DataDog agent and routing metrics to VictoriaMetrics
DD_DD_URL="http://<victoriametrics-host>:8428/datadog" \
DD_API_KEY="fake_key_not_used_by_vm" \
datadog-agent run
```

*Dual-shipping setup:* If you want to send data to *both* DataDog and VictoriaMetrics simultaneously, use the `DD_ADDITIONAL_ENDPOINTS` environment variable instead.

```json
DD_ADDITIONAL_ENDPOINTS="{\"http://<victoriametrics-host>:8428/datadog\": [\"fake_key\"]}"
```

### Integrating the NewRelic Infrastructure Agent

Similarly, VictoriaMetrics implements the NewRelic Events API (`/newrelic/infra/v2/metrics/events/bulk`). The NewRelic agent pushes "Events," which contain a mix of numeric metrics and string metadata. 

When VictoriaMetrics receives a NewRelic Event, it performs the following transformation:
1. Every string field (including the `eventType`) is converted into a standard Prometheus label.
2. Every numeric field is extracted and stored as a raw metric value, using the numeric field's key as the base metric name.

**Endpoint Structures**
* **Single-Node:** `http://<vm-host>:8428/newrelic`
* **Cluster Version:** `http://<vminsert-host>:8480/insert/<accountID>/newrelic`

**Configuring the NewRelic Agent**
To point the NewRelic Infrastructure Agent to VictoriaMetrics, you must override the `COLLECTOR_URL` environment variable. The agent also strictly requires a license key to start, but because VictoriaMetrics does not validate NewRelic licenses natively (unless placed behind `vmauth`), you can provide any arbitrary string to satisfy the agent's startup checks.

```bash
# Running the NewRelic agent and routing metrics to VictoriaMetrics
COLLECTOR_URL="http://<victoriametrics-host>:8428/newrelic" \
NRIA_LICENSE_KEY="dummy_license_key" \
./newrelic-infra
```

### Data Normalization Considerations

Because VictoriaMetrics translates these proprietary formats into a Prometheus-compatible structure under the hood, you should be aware of how the data will look when you query it via MetricsQL (which will be covered extensively in Chapter 7):

| Source Agent | Original Format | Resulting VictoriaMetrics / PromQL Format |
| :--- | :--- | :--- |
| **DataDog** | `system.cpu.idle` tag: `host:web01` | `system_cpu_idle{host="web01"}` |
| **NewRelic** | EventType: `SystemSample`, Field: `cpuPercent: 25.5`, Entity: `mac-01` | `cpuPercent{eventType="SystemSample", entityKey="mac-01"} 25.5` |

If you need the metric names to bypass automatic sanitization (for example, if you want to keep DataDog's dot-notation exactly as it is to prevent legacy custom scripts from breaking), you can start the VictoriaMetrics binary with the `-datadog.sanitizeMetricName=false` command-line flag. However, keeping the default sanitization enabled is highly recommended to ensure maximum compatibility with standard Grafana dashboards and PromQL functions.