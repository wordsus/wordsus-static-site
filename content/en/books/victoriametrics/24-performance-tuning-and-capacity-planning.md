As VictoriaMetrics scales to handle massive workloads, default configurations aren't enough. This chapter bridges the gap between basic operation and enterprise scale. We explore how to scientifically size hardware to avoid over-provisioning while maintaining fast queries. You will learn to optimize the Linux page cache, resolve ingestion bottlenecks, and mitigate the impact of high time series churn. Finally, we dive into advanced debugging using Go's `pprof` to profile CPU and memory, empowering you to maintain peak cluster performance under the most demanding production environments.

## 24.1 Hardware Sizing Guidelines for Scale

Sizing hardware for VictoriaMetrics requires a shift in mindset if you are migrating from other time-series databases. Because VictoriaMetrics is engineered for extreme efficiency—often utilizing 10x less RAM and disk space than competitors—standard industry sizing templates will likely result in massive over-provisioning. 

To determine the precise hardware requirements for a high-scale deployment, you must evaluate four primary dimensions of your workload:
1. **Ingestion Rate:** Total samples written per second across all tenants.
2. **Active Time Series:** The number of unique time series updated within the last hour (often referred to as churn rate or active cardinality).
3. **Query Load:** The complexity of your PromQL/MetricsQL queries, the time ranges they scan, and the concurrency of read requests.
4. **Retention Period:** How long the data is kept on disk before being purged.

### Disk Space Calculation

Disk space is the most predictable metric to size. VictoriaMetrics employs highly optimized compression algorithms (derived from MergeTree principles, as discussed in Chapter 10). In a production environment, you can expect an average of **0.4 to 0.8 bytes per sample** on disk, depending on the predictability of your data.

Use the following formula to calculate your base storage requirements:

$$ C = (R \times S \times T) \times (1 + M) $$

Where:
* $C$ = Total storage capacity required (in bytes)
* $R$ = Ingestion rate (samples per second)
* $S$ = Average size per compressed sample (conservatively estimate **1 byte** for capacity planning)
* $T$ = Retention period in seconds
* $M$ = Safety margin for temporary merge files and filesystem overhead (use **0.2** for a 20% margin)

**Example:**
For an ingestion rate of 1,000,000 samples/sec and a retention period of 30 days (2,592,000 seconds):
1,000,000 * 1 byte * 2,592,000 * 1.2 = **~3.1 TB** of disk space required.

### Sizing by Cluster Component

When operating the VictoriaMetrics cluster version at scale, resources are decoupled. You must size `vminsert`, `vmstorage`, and `vmselect` independently based on their specific bottlenecks.

#### 1. `vmstorage` (Stateful Data Nodes)
The `vmstorage` component is the workhorse of the cluster. It is heavily dependent on Memory and Disk I/O. 

* **Memory (RAM):** The golden rule is to provision **1GB of RAM per 1 million active time series**. However, VictoriaMetrics relies heavily on the OS Page Cache to serve queries efficiently. You should provision enough RAM so that `vmstorage` uses less than 50% of the total system memory, leaving the rest for the OS to cache recently accessed index and data blocks.
* **CPU:** 1 CPU core is generally sufficient per 100,000 ingested samples per second, though heavy background merging of data parts will consume idle cycles.
* **Disk:** NVMe or enterprise-grade SSDs are strongly recommended. While sequential write performance is low (due to batching), highly concurrent queries scanning historical data will heavily tax random read IOPS.

#### 2. `vminsert` (Stateless Ingestion Routing)
This component simply receives data, validates it, hashes the labels, and routes it to the appropriate `vmstorage` nodes. It is entirely **CPU-bound**.

* **CPU:** Provision 1 CPU core per 100,000 to 150,000 samples/sec.
* **Memory:** Minimal. 1GB to 2GB is typically sufficient regardless of throughput. 

#### 3. `vmselect` (Stateless Query Execution)
Sizing `vmselect` is the most variable part of the process because it depends entirely on human behavior and automated alerting configurations. It is both **CPU and Memory-bound**.

* **CPU:** Complex queries (e.g., massive aggregations over high cardinality labels) will pin CPU cores. Provision at least 2-4 cores as a baseline, scaling horizontally as user concurrency increases.
* **Memory:** When a query spans millions of series, `vmselect` must hold the intermediate uncompressed blocks in memory before aggregating them. Provide generous RAM allocations (e.g., 8GB - 16GB per pod) if your organization frequently runs heavy exploratory queries.

### Visualizing Resource Allocation

The following text diagram illustrates the resource constraints and scaling directions for each component in a high-scale topology:

```text
                     [ CLIENTS / SCRAPERS ]
                               |
                               v
+-------------------------------------------------------------+
| vminsert (Stateless)                                        |
| Bottleneck: CPU                                             |
| Scaling: Horizontal (Add more nodes as samples/sec grows)   |
| Baseline: 1 Core per 100k samples/sec                       |
+-------------------------------------------------------------+
                               |
                        (Data Routing)
                               v
+-------------------------------------------------------------+
| vmstorage (Stateful)                                        |
| Bottleneck: Disk I/O, RAM (Active Series), Disk Space       |
| Scaling: Horizontal (Add nodes for capacity/cardinality)    |
| Baseline: 1GB RAM per 1M active series + 50% for Page Cache |
+-------------------------------------------------------------+
                               |
                      (Data Retrieval)
                               v
+-------------------------------------------------------------+
| vmselect (Stateless)                                        |
| Bottleneck: CPU (Aggregations), RAM (Result Sets)           |
| Scaling: Horizontal (Add nodes as query concurrency grows)  |
| Baseline: Highly dependent on query complexity              |
+-------------------------------------------------------------+
                               |
                               v
                     [ GRAFANA / VMALERT ]
```

### Example Kubernetes Resource Topologies

To translate these guidelines into practical configurations, here is an example of what a `VMCluster` Custom Resource sizing block might look like for a mid-tier production workload handling **500,000 samples/sec** with **5 million active series**:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMCluster
metadata:
  name: prod-cluster
spec:
  # Ingestion tier: CPU focused
  vminsert:
    replicaCount: 3
    resources:
      requests:
        cpu: "2"
        memory: "1Gi"
      limits:
        cpu: "4"
        memory: "2Gi"
        
  # Storage tier: RAM, Storage, and Page Cache focused
  vmstorage:
    replicaCount: 3
    resources:
      requests:
        cpu: "4"
        # 5M series / 3 nodes = ~1.6M series per node
        # Need ~1.6GB + 2GB OS Page Cache overhead
        memory: "4Gi"
      limits:
        cpu: "8"
        memory: "8Gi"
    storage:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: "1000Gi"
              
  # Query tier: CPU and RAM focused for aggregations
  vmselect:
    replicaCount: 2
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
```

When scaling, always monitor the active time series churn rate and OS page cache hit ratios. CPU and Memory constraints on `vmstorage` are the most common root causes of degraded performance, which we will diagnose further in the subsequent performance tuning sections.

## 24.2 Tuning Memory Caching and OS Page Cache

A fundamental design philosophy of VictoriaMetrics is to avoid reinventing the wheel when it comes to disk I/O caching. Unlike many Java-based or custom-memory-managed databases that allocate massive internal heaps to cache disk blocks, VictoriaMetrics relies heavily on the Linux kernel's **OS Page Cache**. 

To achieve maximum performance, especially for queries spanning long historical time ranges, you must balance the memory VictoriaMetrics manages internally (via Go) with the memory left available for the operating system to cache heavily accessed data files.

### The Memory Allocation Hierarchy

When sizing and configuring a `vmstorage` node, system RAM is typically divided into three functional pools:

```text
+-----------------------------------------------------------------+
|                       Total Node RAM (e.g., 64 GB)              |
+-------------------+-------------------------+-------------------+
| OS & Daemons      | VictoriaMetrics Heap    | OS Page Cache     |
| (~2-5%)           | (~50-60%)               | (~35-48%)         |
|                   |                         |                   |
| SSH, systemd,     | Fast caches (indexdb),  | Memory-mapped     |
| node_exporter     | active time series,     | (mmap) data parts |
|                   | query processing buffers| and historical    |
|                   |                         | search data       |
+-------------------+-------------------------+-------------------+
```

If VictoriaMetrics consumes too much internal memory, the OS Page Cache shrinks, leading to disk thrashing (constant reading from physical SSD/NVMe) when users execute queries against historical data. Conversely, if internal memory is starved, VictoriaMetrics cannot efficiently index incoming metrics, leading to high CPU usage and ingestion bottlenecks.

### Tuning Internal Memory Limits

By default, VictoriaMetrics components (specifically `vmstorage` and `vmselect`) automatically cap their internal caches to **60% of total system memory**. This leaves a healthy 40% margin for the OS Page Cache.

However, in containerized environments (Kubernetes, Docker) or multi-tenant nodes, relying on the physical host's total RAM can lead to Out-Of-Memory (OOM) kills. You must explicitly control memory usage using command-line flags:

*   **`-memory.allowedPercent`**: Specifies the percentage of system memory the application can use for various internal caches. 
    *   *Default:* `60`.
    *   *Best Practice:* Keep at `60` for dedicated hosts. If running multiple VictoriaMetrics components on the same machine, lower this so the combined total does not exceed 70-80%.
*   **`-memory.allowedBytes`**: A hard limit defined in bytes (e.g., `32GB`, `1500MB`).
    *   *Best Practice:* Use this specifically in Kubernetes. Set this flag to roughly 10-20% lower than the pod's memory limit. For example, if your pod limit is `16Gi`, set `-memory.allowedBytes=14Gi`.

#### Example Kubernetes Configuration

When deploying via the VictoriaMetrics Operator, aligning the container limits with the application flags prevents the dreaded `OOMKilled` status:

```yaml
spec:
  vmstorage:
    resources:
      limits:
        memory: "32Gi"
      requests:
        memory: "16Gi"
    extraArgs:
      # Keep Go memory slightly under the 32Gi limit
      memory.allowedBytes: "28Gi" 
```

### Tuning the Linux OS for VictoriaMetrics

Because VictoriaMetrics expects the operating system to handle hot data efficiently, tuning kernel parameters (`sysctl`) on your storage nodes is critical. Default Linux distributions are often optimized for desktop or general-purpose server workloads, not high-throughput time-series databases.

Add the following parameters to `/etc/sysctl.d/99-victoriametrics.conf` and apply them with `sysctl -p`:

#### 1. Disable or Minimize Swapping
When the OS moves VictoriaMetrics data to swap space, query latency becomes unpredictable and can spike from milliseconds to minutes.

```ini
# Strongly discourage the kernel from swapping RAM to disk. 
# Set to 1 rather than 0 to prevent the OOM killer from being overly aggressive.
vm.swappiness = 1
```

#### 2. Optimize Dirty Page Flushing
During high ingestion, VictoriaMetrics batches data in memory before writing it to disk as a "part" (similar to an LSM tree). If the OS waits too long to flush these "dirty" pages to physical storage, it creates massive I/O spikes that stall queries. 

By forcing the kernel to write smaller chunks more frequently, disk I/O becomes a smooth, continuous stream.

```ini
# Start flushing to disk when 5% of memory contains dirty data (default is usually 10-20%)
vm.dirty_background_ratio = 5

# Force synchronous I/O if dirty pages reach 15% of RAM (default is often 20-30%)
# This prevents the system from locking up during huge background merges.
vm.dirty_ratio = 15
```

#### 3. Increase Max Map Count
VictoriaMetrics heavily relies on memory-mapped files (`mmap`). Heavy query loads against heavily partitioned historical data can exhaust the default OS limits for memory map areas.

```ini
# Increase the maximum number of memory map areas a process may have.
# The default is 65530, which is too low for a high-scale TSDB.
vm.max_map_count = 262144
```

### Monitoring Cache Effectiveness

Tuning memory is an iterative process. Once your cluster is live, you should monitor both internal cache hits and OS-level memory metrics using the official Grafana dashboards. 

Pay close attention to these PromQL queries:

1.  **Cache Hit Ratio:** 
    A healthy `vmstorage` node should serve the vast majority of index lookups from RAM.
    ```promql
    sum(rate(vm_cache_requests_total[5m])) by (type) 
    - 
    sum(rate(vm_cache_misses_total[5m])) by (type)
    ```
2.  **OS Page Cache Availability:**
    Ensure your nodes are successfully utilizing the remaining memory for caching. In node_exporter, this is represented by `node_memory_Cached_bytes`. If free memory (`node_memory_MemFree_bytes`) is high but cached memory is low, your system has not yet "warmed up," or your queries are purely targeting recent data held in the VictoriaMetrics heap.
3.  **Go Memory Allocations:**
    Monitor `go_memstats_alloc_bytes` against your configured limits to ensure the garbage collector is keeping up with the query load and not threatening to hit the container's hard limit.

## 24.3 Diagnosing and Fixing Ingestion Bottlenecks

Even with hardware meticulously sized and the operating system tuned, you may eventually hit a ceiling where VictoriaMetrics struggles to ingest incoming data. In a distributed environment, an ingestion bottleneck rarely results in immediate data loss. Instead, thanks to VictoriaMetrics' push-back mechanisms and `vmagent`'s persistent queuing, bottlenecks manifest as **ingestion lag**—data taking longer to appear in dashboards than expected.

Identifying the root cause requires tracing the data path backward: from `vmstorage` (where data is written to disk), to `vminsert` (where data is routed), back to `vmagent` or Prometheus (where data is scraped and buffered).

### Symptoms of an Ingestion Bottleneck

Before applying fixes, you must confirm where the pipeline is choking. Use the official VictoriaMetrics Grafana dashboards or query these specific metrics via `vmselect`:

1.  **`vmagent` or Prometheus is buffering:**
    If the storage backend cannot accept data fast enough, the agents will start queueing it on disk.
    *   *PromQL:* `rate(vmagent_remotewrite_packets_dropped_total[5m])` or monitor the size of the persistent queue.
2.  **`vminsert` is throwing errors or slowing down:**
    `vminsert` will return HTTP 503 errors to agents if `vmstorage` nodes are unresponsive or rejecting writes.
    *   *PromQL:* `rate(vm_http_request_errors_total{path="/insert/..."}[5m])`
3.  **`vmstorage` concurrent inserts are maxed out:**
    This is the most common true bottleneck. `vmstorage` limits the number of concurrent ingestion requests to prevent Out-Of-Memory (OOM) crashes.
    *   *PromQL:* `vm_concurrent_insert_capacity` vs `vm_concurrent_insert_current`. If `current` frequently hits `capacity`, the node is overwhelmed.

### Common Causes and Remediation Strategies

Once you have verified an ingestion bottleneck, investigate the following four primary culprits.

#### 1. Disk I/O Saturation on `vmstorage`

VictoriaMetrics batches incoming data in memory and flushes it to disk in heavily compressed "parts." If the underlying storage cannot handle the write throughput, memory buffers fill up, and `vmstorage` stops accepting new data.

*   **Diagnosis:** Check the `node_disk_io_time_seconds_total` metric or use `iostat -x 1` on the host machine. If `%util` is consistently near 100% for the data disk, you are I/O bound. Furthermore, watch the `vm_merge_need_free_disk_space` metric; if merges are blocked due to slow disks, ingestion halts.
*   **Fix:** 
    *   Upgrade to faster storage (e.g., moving from standard SSDs to NVMe or increasing Provisioned IOPS in cloud environments).
    *   Ensure you have tuned the OS Page Cache and dirty ratio settings as detailed in Section 24.2, to allow the kernel to flush data more smoothly.

#### 2. CPU Starvation during Background Merges

`vmstorage` performs continuous background merges (similar to an LSM-tree compaction) to keep queries fast and compression ratios high. This is a CPU-intensive process.

*   **Diagnosis:** Look at overall CPU utilization on `vmstorage` nodes. Check `rate(vm_merge_time_seconds_total[5m])`. If CPU is pegged at 100% and concurrent inserts are blocked, the node lacks the compute power to process the incoming volume.
*   **Fix:**
    *   **Scale Up (Vertical):** Add more CPU cores to the `vmstorage` nodes.
    *   **Scale Out (Horizontal):** Add more `vmstorage` nodes to the cluster to distribute the background merge penalty.

#### 3. High Active Time Series (Churn Rate)

Ingesting 1 million samples per second across 100,000 active time series is incredibly fast. Ingesting 100,000 samples per second across 10 million active time series is computationally heavy. Every *new* or heavily churning time series requires VictoriaMetrics to update the inverted index (`indexdb`), which is an expensive operation.

*   **Diagnosis:** Compare `rate(vm_rows_inserted_total[5m])` (throughput) against `vm_cache_entries{type="storage/hour_metric_ids"}` (active series). If throughput is stable but active series are spiking, churn is your bottleneck. You will also see a high rate of `vm_index_blocks_written_total`.
*   **Fix:**
    *   Identify the source of the churn. Usually, this is caused by a misconfigured label (e.g., injecting a unique `session_id`, `client_ip`, or `uuid` into a metric label).
    *   Use PromQL to find the highest cardinality metrics: 
        ```promql
        topk(10, count by (__name__) ({__name__=~".+"}))
        ```
    *   Once identified, use `vmagent` relabeling rules to drop the offending high-cardinality labels before they ever reach the cluster. (See Chapter 24.4 for a deep dive into handling churn).

#### 4. Unbalanced Routing from `vminsert`

In a clustered setup, `vminsert` routes data to `vmstorage` nodes based on a hash of the metric labels. If the cluster topology changes (e.g., a node restarts or is added) or if network routing is flawed, one `vmstorage` node might receive a disproportionate amount of traffic.

*   **Diagnosis:** Compare the ingestion rate across your storage nodes:
    ```promql
    rate(vm_rows_inserted_total[5m]) by (instance)
    ```
    If one node is ingesting 80% of the traffic while others sit idle, you have a routing imbalance.
*   **Fix:**
    *   Ensure that all `vminsert` instances are configured with the exact same `-storageNode` list.
    *   If you recently added a new `vmstorage` node, the traffic will gradually balance out. Do not aggressively restart nodes, as this forces `vminsert` to recalculate hashes and can temporarily exacerbate the imbalance.

### The Emergency Relief Valve: Rate Limiting

If a rogue application suddenly starts blasting millions of new metrics and threatens to take down the entire cluster, you can temporarily apply tenant-level rate limits on `vminsert`.

Use the `-maxLabelsPerTimeseries`, `-maxMetricsDaily`, or `-maxHourlySeries` flags on `vminsert` to hard-cap the ingestion of new metrics. This acts as a circuit breaker, discarding the rogue data and preserving cluster stability while you investigate the source of the anomaly.

## 24.4 Handling High Active Time Series (Churn Rates)

In the realm of time-series databases, high ingestion throughput (millions of samples per second) is generally a solved problem. VictoriaMetrics can easily handle massive throughput provided the data maps to a stable set of time series. However, **high churn rate**—the rapid creation of new, unique time series and the abandonment of old ones—is the single most common cause of cluster degradation and Out-Of-Memory (OOM) crashes.

A time series is defined by a unique combination of a metric name and its key-value labels. If an application injects a highly variable label—such as a `session_id`, `user_id`, `client_ip`, or a Kubernetes `pod_id` in a rapidly scaling deployment—it creates "cardinality explosion."

### The Cost of Churn

To understand why churn is dangerous, you must understand how VictoriaMetrics writes data. 

When a new sample arrives, VictoriaMetrics checks if its exact label combination exists in the in-memory cache. 
1. **If it exists (Low Churn):** The sample value and timestamp are heavily compressed and appended to the existing time series block. This costs fractions of a byte and almost zero CPU.
2. **If it does not exist (High Churn):** VictoriaMetrics must generate a new internal Time Series ID (TSID), update the inverted index (`indexdb`), and write the new metadata to disk. 

If millions of series are created every hour, the `indexdb` swells massively. The OS Page Cache is evicted to make room for new index entries, memory usage skyrockets, and query performance collapses because the database must scan millions of fragmented index blocks to resolve a PromQL selector.

```text
+-------------------------------------------------------------+
|               The Impact of High Churn Rates                |
+-------------------------------------------------------------+
|                                                             |
|  [ STABLE SERIES ]             [ HIGH CHURN SERIES ]        |
|  10,000 unique series          10,000,000 unique series     |
|  100 samples per series        1 sample per series          |
|                                                             |
|  Data Written: 1,000,000 pts   Data Written: 1,000,000 pts  |
|  Index Size:   Tiny            Index Size:   Massive        |
|  RAM Required: < 50 MB         RAM Required: ~ 10 GB        |
|  Query Speed:  Milliseconds    Query Speed:  Seconds/OOM    |
|                                                             |
+-------------------------------------------------------------+
```

### Identifying the Source of Churn

Before you can fix churn, you must identify which metrics and labels are causing it. VictoriaMetrics provides powerful built-in tools for cardinality exploration.

#### 1. The TSDB Status API
Instead of guessing, use the official `/api/v1/status/tsdb` endpoint. It provides exact statistics on index size and label cardinality.

```bash
curl -s http://<vmselect-host>:8481/select/<tenant_id>/prometheus/api/v1/status/tsdb \
  | jq '.data.seriesCountByMetricName'
```
Look for metrics with millions of series. You can also query `labelValueCountByLabelName` to find the specific label (e.g., `client_ip`) that is responsible for the explosion.

#### 2. MetricsQL Cardinality Queries
If you want to visualize this in Grafana, VictoriaMetrics extends standard PromQL with functions to count time series directly without pulling their actual data points:

```promql
# Find the top 10 metrics with the highest number of active series
topk(10, count({__name__=~".+"}) by (__name__))
```

### Mitigation Strategies

Once you have identified the offending metrics and labels, you have three primary ways to handle them at scale.

#### Strategy 1: Drop the High-Cardinality Labels (Relabeling)
The most effective fix is to prevent the high-cardinality labels from ever reaching the storage tier. You can configure `vmagent` (or `vminsert`) to drop specific labels during the ingestion phase using `labeldrop`.

If an application is exposing `http_requests_total` with a `user_id` label, you can strip the `user_id` label while keeping the rest of the metric intact.

```yaml
# vmagent or vminsert relabeling configuration
- action: labeldrop
  regex: "user_id|client_ip"
```
*Note: If dropping the label results in duplicate series (e.g., two identical series with the same timestamp), VictoriaMetrics will automatically deduplicate them based on your `-dedup.minScrapeInterval` settings.*

#### Strategy 2: Drop the Entire Metric
If the metric is purely analytical and not useful for operational alerting (e.g., a custom metric tracking specific database query strings that change dynamically), it may be best to drop the metric entirely.

```yaml
- action: drop
  source_labels: [__name__]
  regex: "db_query_duration_seconds_.*"
```

#### Strategy 3: Stream Aggregation (`vmagent`)
Sometimes, developers genuinely need the high-cardinality data for a short period, but storing it raw will crash the cluster. VictoriaMetrics provides **Stream Aggregation** within `vmagent`.

Stream aggregation allows you to calculate rates, sums, or histograms on the fly, stripping away the high-cardinality labels *before* forwarding the aggregated, low-cardinality result to `vmstorage`.

```yaml
# stream-aggr.yaml
- match: 'http_requests_total'
  interval: 1m
  without: [user_id, client_ip]
  outputs: [sum]
```
This configuration takes incoming `http_requests_total` metrics, groups them by all labels *except* `user_id` and `client_ip`, sums them up over a 1-minute tumbling window, and writes the lightweight aggregated metric to the cluster.

### Configuring Circuit Breakers

To protect the cluster from sudden, unexpected bursts of cardinality (e.g., a developer accidentally deploying code that adds a `uuid` label to every log metric), you should configure circuit breakers on the `vminsert` nodes.

Use the following command-line flags to enforce hard limits:

*   **`-maxLabelsPerTimeseries`**: Drops metrics that have too many labels (default is 30). Set this to `15` or `20` to catch misconfigured applications.
*   **`-maxHourlySeries`**: Limits the number of unique time series a single `vminsert` instance will accept per hour. If the limit is reached, it drops new series and logs an error. This is a critical safety net for multi-tenant environments to prevent one noisy neighbor from taking down the cluster.

## 24.5 Profiling CPU and Memory Usage with pprof

When system-level metrics and Grafana dashboards indicate a bottleneck but fail to pinpoint the exact cause, you must look inside the application itself. Because VictoriaMetrics is written entirely in Go, it natively supports `pprof`—the standard Go profiling tool. 

Profiling allows you to capture exact stack traces and resource allocations down to the specific line of code executing during a performance spike. VictoriaMetrics exposes these profiling endpoints securely over HTTP.

### Accessing the pprof Endpoints

By default, the `pprof` endpoints are exposed on the same HTTP port as the component's main API. In a cluster environment, you will target the specific node you suspect is struggling:

*   **Single Node:** `http://<host>:8428/debug/pprof/`
*   **`vminsert`:** `http://<host>:8480/debug/pprof/`
*   **`vmselect`:** `http://<host>:8481/debug/pprof/`
*   **`vmstorage`:** `http://<host>:8482/debug/pprof/`

*Security Warning: The `/debug/pprof/` endpoints expose internal application state and can trigger expensive profiling operations. Ensure these endpoints are protected by firewalls or `vmauth` and are never exposed to the public internet.*

### Capturing a CPU Profile

If a `vmselect` node is pegging at 100% CPU during a specific query, you can capture a snapshot of the CPU's activity over a designated time window (typically 30 seconds).

Use the `go tool pprof` command from your local machine (assuming Go is installed and you have network access to the node):

```bash
# Capture a 30-second CPU profile from a vmselect node
go tool pprof http://<vmselect-host>:8481/debug/pprof/profile?seconds=30
```

Once the 30 seconds elapse, you will drop into an interactive `pprof` shell. 

**What to look for:** Type `top 10` to see the functions consuming the most CPU cycles. 
*   If you see functions related to `regexp`, the bottleneck is likely a PromQL query with an extremely expensive regular expression matcher.
*   If you see `runtime.gcBgMarkWorker`, the Go Garbage Collector is working overtime, usually indicating high memory churn (often related to high active time series).
*   If profiling `vmstorage` and you see `merge` or `compress` functions dominating, the node is heavily bound by background data compaction.

### Capturing a Memory (Heap) Profile

Memory profiling is critical when diagnosing Out-Of-Memory (OOM) kills or when the VictoriaMetrics internal cache utilization (`-memory.allowedPercent`) is completely saturated.

To capture the current memory allocations:

```bash
# Capture the heap profile from a vmstorage node
go tool pprof http://<vmstorage-host>:8482/debug/pprof/heap
```

By default, the heap profile shows `inuse_space` (the memory currently allocated and not yet garbage collected). You can switch the view to `alloc_space` (total memory allocated since the process started, regardless of whether it was freed) by typing `alloc_space` in the interactive shell.

**What to look for:**
*   Functions tied to `indexdb` indicate that the node is holding massive amounts of inverted index data in memory (a classic symptom of high cardinality churn).
*   Functions tied to `net/http` or `query` on a `vmselect` node suggest that a massive query result set is being buffered in memory before being sent to the client.

### Visualizing Profiling Data

While the interactive CLI is powerful, visualizing the call stack is often the fastest way to understand complex execution paths. 

```text
[ Profiling Data Workflow ]

+------------------+       HTTP GET        +-------------------+
|                  | --------------------> |                   |
| Developer Work-  |                       | VictoriaMetrics   |
| station (go tool)| <-------------------- | Node (Port 848x)  |
|                  |    Raw pprof Data     |                   |
+------------------+                       +-------------------+
        |
        |  (Rendered via Local Web Server)
        v
+------------------+
|                  |
|  Browser UI      | ---> [ Flame Graph ]
|  (localhost)     | ---> [ Graphviz Tree ]
|                  | ---> [ Top Stack ]
+------------------+
```

To view the profile visually, append the `-http` flag to your command. This will download the profile and automatically open a web interface in your browser:

```bash
go tool pprof -http=:8080 http://<vmstorage-host>:8482/debug/pprof/profile?seconds=30
```

From the web UI, navigate to the **View -> Flame Graph** menu. The Flame Graph provides a hierarchical view of execution time or memory allocation. 
*   **Width** represents the resource consumed (CPU time or Memory bytes).
*   **Y-Axis** represents the call stack depth.

Look for the widest "flames" at the bottom of the graph. If a single VictoriaMetrics internal function is dominating the width, you have found your bottleneck. You can then correlate this function back to the operational guidelines—such as tuning the OS page cache or applying rate limits—to resolve the underlying issue.

### Capturing Mutex and Block Profiles

In highly concurrent environments, threads may stall while waiting for locks. If CPU usage is suspiciously low but queries are slow or timing out, the system might be suffering from lock contention.

*   **Block Profile:** Identifies where goroutines block waiting on synchronization primitives.
    ```bash
    go tool pprof http://<host>:8428/debug/pprof/block
    ```
*   **Mutex Profile:** Identifies the holders of contended mutexes.
    ```bash
    go tool pprof http://<host>:8428/debug/pprof/mutex
    ```

If you regularly observe severe mutex contention in standard deployment scenarios, it is highly recommended to capture these profiles and attach them to a GitHub issue, as they often represent areas where the VictoriaMetrics core team can optimize the open-source codebase.

