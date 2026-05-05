VictoriaMetrics is built for extreme performance, but robust systems still require vigilant oversight. In this chapter, we transition from deploying the database to operating it reliably in production. You will learn how to monitor the VictoriaMetrics ecosystem using its native telemetry, configure official Grafana dashboards for deep visibility, and decode internal logs to rapidly pinpoint bottlenecks. Whether diagnosing cardinality explosions, hardware limits, or network partitions, these operational strategies equip you to maintain a resilient and highly available observability stack.

## 21.1 Identifying Critical Self-Monitoring Metrics

To maintain a reliable observability stack, you must monitor the monitor. VictoriaMetrics exposes a rich set of internal telemetry at the `/metrics` endpoint for both single-node and cluster components. Because VictoriaMetrics is engineered for high performance and low resource utilization, deviations in these core metrics are often the first indicators of underlying infrastructure limits, misconfigurations, or anomalous data patterns (such as cardinality explosions).

While the `/metrics` endpoint surfaces hundreds of variables, focusing on the following critical categories will provide a comprehensive view of your system's health.

### 1. Ingestion and Write-Path Metrics

The write path is heavily optimized, but it remains highly susceptible to network degradation and malformed client data. Monitoring these metrics helps ensure that data is successfully making it into the storage engine without bottlenecks.

*   **`vm_rows_inserted_total`**: The absolute count of data points successfully ingested. Tracking the `rate()` of this metric gives you your primary ingestion throughput. 
*   **`vm_rows_ignored_total`**: A critical error indicator. This counter increments when data is dropped. You should aggregate this by the `reason` label. Common reasons include out-of-order timestamps, duplicate points, or invalid metric formatting.
*   **`vm_rpc_errors_total`** *(Cluster only)*: Tracks communication failures between `vminsert` and `vmstorage` nodes. A sustained increase here almost always points to network partitioning, saturated network links, or an overloaded storage node dropping connections.
*   **`vmagent_remotewrite_queues`**: If you are using `vmagent` to buffer and route data, monitoring the length of its queues ensures you aren't silently falling behind and risking disk exhaustion during extended network outages.

### 2. Storage and Cardinality Metrics

The `vmstorage` component (or the underlying storage engine in single-node deployments) is the bedrock of the system. Storage metrics tell you how well the engine is compressing data and managing memory.

*   **`vm_active_time_series`**: Arguably the most important metric for preventing system crashes. High churn rates (where labels change constantly, creating new unique time series) will cause this to spike, directly leading to increased RAM usage and OOM (Out of Memory) kills.
*   **`vm_data_size_bytes`** and **`vm_index_size_bytes`**: Tracks the physical on-disk size of your compressed data and inverted indexes. 
*   **`vm_merge_operations_total`** and **`vm_merge_errors_total`**: VictoriaMetrics uses a MergeTree-like structure to compact data blocks in the background. If merge errors occur, or if the merge queue backs up, query performance will severely degrade over time.

### 3. Query and Read-Path Metrics

Query performance directly impacts the user experience of your dashboards and the reliability of your alerting pipelines. Monitor the `vmselect` (or single-node) component to track how effectively the database is answering PromQL/MetricsQL requests.

*   **`vm_requests_total`**: The total number of incoming queries. Combine this with the `handler` label (e.g., `/api/v1/query_range`) to understand usage patterns.
*   **`vm_request_duration_seconds`**: Exposed as a histogram, this allows you to calculate the p99 latency of your queries.
*   **`vm_concurrent_queries`**: Tracks the number of queries currently in flight. If this hits the configured concurrency limits, subsequent queries will be rejected, resulting in dashboard timeouts.
*   **`vm_cache_requests_total`** and **`vm_cache_misses_total`**: VictoriaMetrics heavily utilizes multiple internal caches (metric names, label values, compiled regular expressions). Monitoring the hit ratio helps determine if you need to allocate more memory to the system.

### Visualizing the Telemetry Flow

The following text diagram illustrates how these critical metrics map to the architecture of a VictoriaMetrics cluster deployment, forming a closed-loop observability system where the cluster is scraped by its own agents or a dedicated self-monitoring instance:

```text
+-------------------------+       +-------------------------+       +-------------------------+
|        vminsert         |       |        vmstorage        |       |        vmselect         |
|                         |       |                         |       |                         |
| Write-Path Metrics:     |       | Storage Metrics:        |       | Read-Path Metrics:      |
| > vm_rows_inserted...   | ----> | > vm_active_time_...    | <---- | > vm_requests_total     |
| > vm_rows_ignored...    |       | > vm_merge_operations.. |       | > vm_request_duration.. |
| > vm_rpc_errors_total   |       | > vm_data_size_bytes    |       | > vm_cache_misses_total |
+-----------+-------------+       +-----------+-------------+       +-----------+-------------+
            |                                 |                                 |
            v                                 v                                 v
          [ :8480/metrics ]                 [ :8482/metrics ]                 [ :8481/metrics ]
            |                                 |                                 |
            +---------------------------------+---------------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    vmagent (Self-Scraping)    |
                              |                               |
                              |  Scrapes targets, evaluates   |
                              |  recording rules, and alerts  |
                              +-------------------------------+
```

### 4. System and Resource Utilization

Because VictoriaMetrics is written in Go, you must monitor both standard operating system metrics and Go runtime internals.

*   **`process_resident_memory_bytes`**: The actual physical memory consumed by the binary. VictoriaMetrics relies heavily on the OS Page Cache, so this metric should ideally stay well below the total system RAM to leave room for the kernel to cache disk blocks.
*   **`process_cpu_seconds_total`**: Tracks CPU utilization.
*   **`go_goroutines`**: A sudden, sustained spike in goroutines without a corresponding increase in query or ingestion load usually indicates a blocked process, a network timeout issue, or a software bug.

### Deriving Insights via MetricsQL

Raw counters and gauges are rarely useful on their own. You will need to write MetricsQL expressions to derive actionable insights from them. 

For example, raw cache miss counters do not directly tell you if your cache is healthy. To determine the global Cache Hit Ratio across your `vmselect` nodes over a 5-minute window, you would use the following query:

```promql
100 * (
  1 - 
  sum(rate(vm_cache_misses_total[5m])) 
  / 
  sum(rate(vm_cache_requests_total[5m]))
)
```

Similarly, to track the overall ingestion error rate across the cluster, you can compare the rate of ignored rows against the total inserted rows:

```promql
sum(rate(vm_rows_ignored_total[5m]))
/
(
  sum(rate(vm_rows_inserted_total[5m])) + 
  sum(rate(vm_rows_ignored_total[5m]))
) * 100
```

By establishing baseline thresholds for these specific metrics and derivatives, you lay the foundation for the automated alerting rules and operational dashboards discussed in the subsequent sections of this chapter.

## 21.2 Setting Up the Official Self-Monitoring Dashboard

While understanding the underlying raw metrics is critical, you do not need to build your operational dashboards from scratch. The VictoriaMetrics team maintains a set of highly optimized, official Grafana dashboards designed to visualize the health, performance, and resource utilization of every component in the ecosystem. 

Deploying these dashboards should be one of your first steps when moving a VictoriaMetrics installation into production.

### Importing the Official Dashboards

The official dashboards are published and regularly updated on the Grafana Labs dashboard repository. They are compatible out-of-the-box with any standard Grafana installation.

Depending on your deployment architecture, you will need to import the corresponding dashboard ID:

*   **Single-Node Deployments:** Use Grafana Dashboard ID **`10229`**. This provides a unified view of ingestion, storage, and querying within the standalone binary.
*   **Cluster Deployments:** Use Grafana Dashboard ID **`11176`**. This dashboard is segmented to monitor the distributed architecture, breaking down metrics by `vminsert`, `vmstorage`, and `vmselect` nodes.
*   **Supplementary Components:** If you are utilizing other tools in the toolchain, you should also import their respective dashboards:
    *   **`vmagent`**: Tracks scraping targets, relabeling performance, and remote-write queues.
    *   **`vmalert`**: Monitors rule evaluation durations and alerting pipeline health.
    *   **`vmauth`**: Visualizes routing decisions, dropped requests, and authentication failures.

**To import a dashboard in Grafana:**
1. Navigate to **Dashboards** in the left-hand menu and click **New** -> **Import**.
2. Enter the corresponding ID (e.g., `11176`) into the "Import via grafana.com" field and click **Load**.
3. Select your VictoriaMetrics data source from the dropdown menu at the bottom of the configuration page.
4. Click **Import** to finalize.

### Configuring the Data Source for Self-Monitoring

For the dashboard to populate correctly, Grafana must be able to query the VictoriaMetrics instance. 

1. Go to **Connections** -> **Data Sources** -> **Add data source**.
2. Select **Prometheus** (VictoriaMetrics is fully compatible with the Prometheus querying API).
3. Set the HTTP URL to point to your query node. 
    * *Single-node:* `http://<victoriametrics-host>:8428`
    * *Cluster:* `http://<vmselect-host>:8481/select/0/prometheus` (assuming tenant `0`).
4. Ensure the **Scrape interval** matches the interval at which your self-monitoring data is collected (typically `15s` or `30s`).
5. Click **Save & Test**.

### Understanding the Dashboard Layout

The official dashboards are logically grouped into collapsible rows. Familiarizing yourself with these sections enables rapid troubleshooting during an incident.

#### 1. Quick Overview and Resource Usage
The top row provides an at-a-glance summary of the system's overall health. It typically includes:
*   **Uptime and Version:** Ensures all nodes are running the expected release.
*   **CPU and Memory:** High-level gauges showing operating system resource consumption.
*   **Total Active Time Series:** A critical gauge. Sudden spikes here indicate a cardinality explosion that requires immediate investigation.

#### 2. Ingestion Path (`vminsert` / Single-Node)
This section tracks the flow of data *into* the database.
*   **Ingestion Rate:** Displayed in data points per second.
*   **Dropped Points:** Counters showing data rejected due to rate limits, invalid timestamps, or parsing errors.
*   **Network Traffic:** Tracks the bandwidth consumed by incoming remote-write requests.

#### 3. Storage Engine (`vmstorage` / Single-Node)
This row dives into the background operations of the MergeTree engine.
*   **Pending Merges:** Shows the backlog of data blocks waiting to be compacted. A rising trend indicates disk IO bottlenecks.
*   **Disk Space Usage:** Visualizes the compressed size of data and the inverted index.
*   **Cache Hit Rates:** Displays the efficiency of the metric name, label, and regular expression caches. Values consistently below 90% may indicate the need to allocate more RAM via the `-memory.allowedPercent` flag.

#### 4. Query Performance (`vmselect` / Single-Node)
Monitors how efficiently the system is serving user and dashboard requests.
*   **Query Rate:** The number of PromQL/MetricsQL requests handled per second.
*   **Query Latency (p99):** A histogram visualizing the time taken to execute queries. Spikes here correlate directly with slow-loading Grafana dashboards.
*   **Concurrent Queries:** Tracks queries currently in flight against the configured `-search.maxConcurrentRequests` limit.

### Customizing and Extending the Dashboard

While the official dashboards are comprehensive, every environment is unique. Once imported, you can tailor the dashboard to your operational context:

*   **Adjusting Variables:** The top of the dashboard includes template variables like `$job`, `$instance`, and `$node`. Ensure these map correctly to your Prometheus/`vmagent` scraping configurations so you can filter metrics by specific cluster nodes.
*   **Adding Annotations:** You can configure Grafana to overlay deployment events (e.g., when a new version of your application is rolled out) onto the VictoriaMetrics graphs. This helps correlate sudden spikes in active time series with specific engineering activities.
*   **Setting Local Alerts:** If you prefer visualizing thresholds directly, you can edit critical panels (like CPU usage or dropped rows) to include Grafana-native alert lines, serving as a visual precursor to your `vmalert` rules.

## 21.3 Analyzing Logs and Reading Tracebacks

While metrics and dashboards tell you *when* and *where* a problem is occurring, logs are the definitive source for *why* it is happening. VictoriaMetrics is designed to be relatively quiet under normal operating conditions, adhering to a philosophy that logs should convey actionable information rather than serving as an auditing stream. 

When VictoriaMetrics logs an `ERROR` or a `FATAL` message, it warrants immediate attention.

### 1. Configuring the Logging Engine

By default, all VictoriaMetrics components output logs to standard error (`stderr`) in a plain text format. You can control the verbosity and format of these logs using command-line flags.

*   **`-loggerLevel`**: Controls the severity threshold. The default is `INFO`. Available levels are `INFO`, `WARN`, `ERROR`, and `FATAL`. 
    *   *Note:* A `FATAL` log will immediately terminate the application process. 
*   **`-loggerFormat`**: Controls the output structure. The default is `plain`. For production environments utilizing log aggregators (like Grafana Loki, Elasticsearch, or Datadog), you should set this to `json`.
*   **`-loggerOutput`**: By default, this is `stderr`. You can redirect it to `stdout` if your container runtime or orchestrator specifically requires it.

**Example of Plain Text vs. JSON Logs:**

```text
# Plain format (Default)
2023-10-27T14:32:01.123Z  info  VictoriaMetrics/app/vmstorage/main.go:45  starting vmstorage at :8482

# JSON format (-loggerFormat=json)
{"ts":"2023-10-27T14:32:01.123Z","level":"info","caller":"VictoriaMetrics/app/vmstorage/main.go:45","msg":"starting vmstorage at :8482"}
```

### 2. Common Log Patterns and Their Meanings

When troubleshooting, grep your log streams for the following common scenarios:

*   **Slow Queries (`WARN`)**: If a query takes longer than the `-search.logSlowQueryDuration` threshold (default 5s), it will be logged. This helps identify poorly written PromQL queries that are monopolizing CPU cycles.
*   **Connection Drops (`ERROR`)**: In a cluster environment, you may see `cannot connect to vmstorage`. This typically indicates a network partition, a firewall rule change, or a storage node that has crashed.
*   **Data Corruption or Disk Issues (`ERROR` / `FATAL`)**: Messages containing `cannot open index` or `failed to merge parts` usually point to exhausted disk space, underlying block storage failures, or file permission issues.
*   **Rate Limiting (`WARN`)**: If `-maxInsertRequestSize` or `-maxLabelsPerTimeseries` is exceeded, the component will drop the payload and log a warning.

### 3. Reading Go Tracebacks

Because VictoriaMetrics is written in Go, severe software bugs or hardware limitations can cause a "panic." When a Go program panics, it halts execution and dumps a **traceback** (or stack trace) to standard error.

Reading a traceback can seem intimidating, but it follows a strict, logical structure. Here is a simulated example of an Out-Of-Memory (OOM) related panic:

```text
panic: runtime error: makeslice: len out of range

goroutine 14352 [running]:
runtime.panicmakeslicelen()
        /usr/local/go/src/runtime/panic.go:119 +0x39
github.com/VictoriaMetrics/VictoriaMetrics/lib/mergeset.(*Table).mergeSmallParts(0xc0004a8000, 0xc0001b4c00, 0x15, 0x15)
        /app/lib/mergeset/table.go:412 +0x2b4
github.com/VictoriaMetrics/VictoriaMetrics/lib/mergeset.(*Table).mergePartsWorker(0xc0004a8000)
        /app/lib/mergeset/table.go:375 +0x18a
created by github.com/VictoriaMetrics/VictoriaMetrics/lib/mergeset.OpenTable
        /app/lib/mergeset/table.go:188 +0x345
```

**How to decode this:**

1.  **The Trigger (`panic: ...`)**: The very first line tells you *why* the process crashed. In this case, `makeslice: len out of range` often indicates the application tried to allocate a massive block of memory (likely due to a cardinality explosion) and failed.
2.  **The Goroutine State (`goroutine 14352 [running]:`)**: Tells you the ID of the lightweight thread that crashed, and that it was actively running.
3.  **The Stack Frame (Top-Down)**: The lines below show the function calls leading up to the crash, starting with the most recent.
    *   The top function `runtime.panicmakeslicelen()` is internal Go code handling the panic.
    *   The second function `mergeset.(*Table).mergeSmallParts` is the exact VictoriaMetrics function where the logic failed (file `table.go`, line 412). 
4.  **The Origin (`created by ...`)**: The bottom of the block shows which function originally spawned this goroutine.

If you encounter a traceback that is not tied to hardware limits (like OOM or disk failure), you should copy this entire block and open an issue on the VictoriaMetrics GitHub repository, as it likely indicates a bug.

### 4. Differentiating Kernel OOM vs. Application Panics

A common point of confusion is differentiating between an application panic and an Operating System OOM kill. 

If VictoriaMetrics suddenly stops, but there is **no traceback** in the application logs, it was almost certainly killed by the Linux kernel. The kernel's OOM killer terminates processes that consume too much RAM to save the OS from crashing.

To verify a kernel OOM kill, you must check the system's `dmesg` logs:

```bash
dmesg -T | grep -i oom
```

You will see an output similar to: `Out of memory: Killed process 12345 (vmstorage) total-vm:3456789kB`.

### Log Aggregation Architecture

To effectively search logs across a multi-node cluster, you should avoid SSH-ing into individual nodes. Instead, implement a log aggregation pipeline alongside your metrics pipeline.

```text
+-------------------+      +-------------------+      +-------------------+
| vminsert nodes    |      | vmstorage nodes   |      | vmselect nodes    |
| (-loggerFormat=   |      | (-loggerFormat=   |      | (-loggerFormat=   |
|   json)           |      |   json)           |      |   json)           |
+--------+----------+      +--------+----------+      +--------+----------+
         |                          |                          |
         | stdout/stderr            | stdout/stderr            | stdout/stderr
         v                          v                          v
+-------------------------------------------------------------------------+
|                    Log Shipper (Promtail / Fluent Bit)                  |
|          (Tails container/systemd logs, adds host/job labels)           |
+-----------------------------------+-------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  Log Storage Backend (Loki / Elastic)                   |
|          (Indexes logs based on labels for fast grep/filtering)         |
+-----------------------------------+-------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                         Grafana Dashboard                               |
|        (Correlates log lines with metric spikes via Split View)         |
+-------------------------------------------------------------------------+
```

By ensuring your log shipper attaches the same `instance` and `job` labels as your `vmagent` metrics scraper, you can use Grafana's split-view feature to seamlessly transition from seeing a latency spike in the dashboard to viewing the exact `WARN` logs generated by that specific node at that exact timestamp.

## 21.4 Troubleshooting Common Deployment Errors

Even with a robust architecture and careful configuration, deployments can encounter friction. VictoriaMetrics is engineered to fail predictably and loudly when hardware limits are breached or configurations are misaligned. 

This section covers the most frequent deployment errors encountered in production environments, their root causes, and the immediate steps required to resolve them.

### 1. Ingestion Failures and HTTP Connection Errors

When data fails to reach VictoriaMetrics, the symptoms usually manifest at the scraping layer (e.g., Prometheus or `vmagent` logs) as HTTP errors.

*   **Error:** `HTTP 400 Bad Request` or `cannot parse remote_write request`
    *   **Cause:** The ingestion node (`vminsert` or single-node) is receiving malformed data. This frequently occurs when a client attempts to send InfluxDB Line Protocol data to the Prometheus `remote_write` endpoint, or vice versa.
    *   **Resolution:** Ensure your ingestion URL explicitly matches the protocol. For Prometheus data, the endpoint must end in `/api/v1/write`. For InfluxDB data, it must end in `/write` or `/api/v2/write`.
*   **Error:** `HTTP 429 Too Many Requests`
    *   **Cause:** The cluster is rejecting data because a configured limit has been breached. This is commonly triggered by the `-maxLabelsPerTimeseries` or `-maxInsertRequestSize` flags.
    *   **Resolution:** Review the application generating the metrics. If the high label count is legitimate, increase the `-maxLabelsPerTimeseries` flag on the `vminsert` nodes.
*   **Error:** `HTTP 503 Service Unavailable`
    *   **Cause:** The `vminsert` node cannot forward data to the `vmstorage` nodes. This is almost always due to a network partition, a misconfigured `-storageNode` flag on `vminsert`, or all `vmstorage` nodes being offline.
    *   **Resolution:** Verify connectivity between `vminsert` and `vmstorage` on the designated RPC port (default `8400`).

### 2. Out of Memory (OOM) Panics and Kernel Kills

As discussed in Section 21.3, memory exhaustion is a critical failure mode. VictoriaMetrics uses an aggressive internal caching system designed to consume available memory to speed up queries. 

*   **Symptom:** The process abruptly stops without logging a FATAL error, and `dmesg` shows an OOM kill.
    *   **Cause:** By default, VictoriaMetrics assumes it has exclusive access to the machine's RAM and limits its internal caches to 60% of total system memory (leaving the rest for the OS page cache). If you are running other memory-intensive containers on the same host, VictoriaMetrics will eventually be killed by the Linux kernel.
    *   **Resolution:** Constrain the application's memory target using the `-memory.allowedPercent` or `-memory.allowedBytes` flags. For example, setting `-memory.allowedPercent=30` will force the database to clear its internal caches much earlier.
*   **Symptom:** Application panics with a Go traceback mentioning memory allocation (e.g., `makeslice`).
    *   **Cause:** A sudden, massive cardinality explosion. If a misconfigured application suddenly creates millions of unique time series (e.g., embedding a UUID or timestamp in a label), the index size spikes, exhausting RAM before the internal garbage collector can respond.
    *   **Resolution:** Identify the offending metric using the `/api/v1/status/tsdb` endpoint. Use `vmagent` relabeling rules to drop or sanitize the offending label before it reaches the storage engine.

### 3. Storage and Disk I/O Bottlenecks

The MergeTree storage engine relies heavily on fast disk I/O. Slow disks will cause a cascading failure throughout the ingestion pipeline.

*   **Error:** `cannot merge small parts ... disk space is not enough`
    *   **Cause:** Background compaction (merging) requires temporary free space. If the disk is more than 80% full, the database will stop merging to prevent filling the disk entirely. This leads to an accumulation of small data parts, drastically slowing down queries.
    *   **Resolution:** Expand the underlying block storage immediately. If expansion is impossible, you can temporarily reduce the data retention period (`-retentionPeriod`) to force the deletion of older data blocks.
*   **Symptom:** Ingestion throughput drops, and `vm_merge_operations_total` stalls.
    *   **Cause:** IOPS (Input/Output Operations Per Second) exhaustion. The disk cannot write data as fast as the network is delivering it.
    *   **Resolution:** Upgrade to faster SSD/NVMe storage. If on a cloud provider (AWS EBS, GCP Persistent Disk), ensure you have provisioned sufficient IOPS for the volume size.

### 4. Cluster-Specific Tenant and Routing Errors

Cluster deployments introduce multi-tenancy and complex routing, which are common sources of configuration errors.

*   **Error:** `cannot find tenant <AccountID>:<ProjectID>`
    *   **Cause:** A query was sent to a `vmselect` node, but no data exists for that specific tenant ID. 
    *   **Resolution:** Tenants in VictoriaMetrics are created implicitly upon first data ingestion. Ensure that data is actively being written to the exact same `AccountID:ProjectID` via `vminsert`.
*   **Error:** Incomplete or partial query results.
    *   **Cause:** A `vmselect` node is not configured to connect to all active `vmstorage` nodes, or a `vmstorage` node is temporarily partitioned. If `-search.denyPartialResponse` is false (the default), `vmselect` will return whatever data it can gather from the healthy storage nodes and silently ignore the missing nodes.
    *   **Resolution:** Ensure the `-storageNode` flag on `vmselect` includes the complete list of all `vmstorage` instances. To prevent silent failures during critical alerting, set `-search.denyPartialResponse=true` to force queries to fail completely if any storage node is unreachable.

### Troubleshooting Workflow

When confronted with a deployment error, follow this standard diagnostic tree:

```text
[ Start: Application or Dashboard Reports Error ]
                   |
                   v
    Is the VictoriaMetrics process running?
           /                 \
        [NO]                 [YES]
         |                     |
 Check dmesg for OOM   Check /metrics endpoint
 Check process logs    Is active_time_series spiking?
         |             Is disk_free_bytes < 20%?
         v                     |
  Adjust RAM limits            v
  Fix file permissions    Check Application Logs
                          (grep for WARN or ERROR)
                               |
                               v
                       Is it a Read or Write issue?
                            /               \
                      [Write]               [Read]
                         |                     |
                Check vmagent queues    Check slow query logs
                Verify network ports    Verify tenant IDs
                Check max labels limit  Check for unmerged parts
```