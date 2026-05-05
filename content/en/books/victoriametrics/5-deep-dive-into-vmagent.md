In the previous chapter, we explored the myriad of ingestion protocols supported by VictoriaMetrics. Now, we turn our attention to the engine that drives this ingestion at the edge: `vmagent`. Born out of the need to overcome the resource limitations of standard Prometheus, `vmagent` is a lightweight, highly efficient telemetry router and scraper. It is designed to collect metrics from thousands of targets, buffer them reliably during network outages, and forward them to centralized storage. In this chapter, we will dissect its internal architecture, explore advanced scraping configurations, and build a resilient, highly available ingestion pipeline.

## 5.1 The Architecture and Role of `vmagent`

In a modern observability stack, metric collection is often fraught with challenges: massive memory overhead during scraping, dropped data during network partitions, and the complexity of routing metrics across multi-cluster environments. `vmagent` was designed specifically to solve these problems. It is a lightweight, high-performance, and drop-in replacement for Prometheus's scraping and forwarding capabilities, but it extends far beyond a simple pull mechanism.

Fundamentally, the role of `vmagent` is to decouple **metric ingestion** from **metric storage**. By acting as an intermediary broker, it frees the storage backend (VictoriaMetrics single-node or cluster) from the CPU and memory-intensive tasks of service discovery, target scraping, and complex relabeling.

### Core Roles of `vmagent`

While `vmagent` is a single statically compiled binary, it serves multiple critical roles within an infrastructure:

1.  **High-Efficiency Scraper:** It implements Prometheus-compatible Service Discovery (SD) and scrape configurations. However, due to heavy optimization, it requires a fraction of the RAM and CPU that a standard Prometheus instance would consume for the same number of targets.
2.  **Multi-Protocol Ingestion Gateway:** As outlined in Chapter 4, `vmagent` accepts push-based metrics via numerous protocols (InfluxDB, OpenTelemetry, Graphite, etc.). It normalizes these disparate formats into a unified internal representation.
3.  **Data Router and Replicator:** `vmagent` can fan out collected metrics to multiple remote storage backends simultaneously using the Prometheus `remote_write` protocol.
4.  **Edge Buffer:** It acts as a resilient shock absorber. If the upstream storage is temporarily unreachable or overloaded, `vmagent` buffers the data locally to prevent data loss.

### Internal Architecture and Data Flow

To understand why `vmagent` is so efficient, we must look at its internal architecture. The data pipeline inside `vmagent` is strictly linear and highly optimized for concurrency, minimizing garbage collection pauses and memory allocations.

```text
  +----------------------+          +----------------------------------------------------+
  |     Pull Targets     |          |                      vmagent                       |
  | (e.g., node_exporter)| <======> |  +---------------+               +--------------+  |
  +----------------------+  Scrape  |  | Scrape Engine &|              |              |  |
                            Config  |  | Push Receivers |=============>|  Relabeling  |  |
  +----------------------+          |  +---------------+               |  Pipeline    |  |
  |     Push Sources     |=========>|                                  |              |  |
  | (OTLP, Influx, etc.) |          |                                  +--------------+  |
  +----------------------+          |                                         ||         |
                                    |                                         \/         |
                                    |                                  +--------------+  |
                                    |                                  | Disk Buffer  |  |
                                    |                                  | (Persistent) |  |
                                    |                                  +--------------+  |
                                    |                                         ||         |
                                    |                                         \/         |
                                    |                                  +--------------+  |
  +----------------------+          |                                  | Remote Write |  |
  | Upstream Storage A   | <===========================================| Clients      |  |
  | (VictoriaMetrics)    |          |                                  +--------------+  |
  +----------------------+          +----------------------------------------------------+
```

Let's break down the functional blocks of this architecture:

#### 1. The Scrape Engine and Receivers
The ingestion boundary of `vmagent` consists of two parallel systems. The **Scrape Engine** dynamically discovers targets (via Kubernetes, EC2, Consul, etc.) and executes HTTP `GET` requests to pull metrics. Concurrently, the **Push Receivers** listen on specific ports to accept payloads from agents like Telegraf or Promtail. 

Unlike Prometheus, which immediately attempts to append incoming data to an in-memory Time Series Database (TSDB) block, `vmagent` simply parses the data and immediately hands it off to the next stage. It maintains no complex, long-term state of the time series, which is why its memory footprint remains remarkably flat even with millions of active series.

#### 2. The Relabeling Pipeline
Once metrics are parsed, they enter the relabeling engine. This component executes the rules defined in your configuration to drop, modify, or add labels. Because `vmagent` processes metrics *in-flight*, relabeling is executed at highly optimized speeds. (We will explore the intricacies of building these rules in Chapter 6).

#### 3. The Disk Buffer (Persistent Queue)
After a metric is normalized and relabeled, it must be sent to the remote storage. If `vmagent` simply attempted to send data directly over the network, a momentary network blip would result in dropped metrics. To prevent this, metrics are placed into an internal queue. If the remote destination is slow or unavailable, this queue seamlessly spills over to an on-disk buffer. (The mechanics of this buffering system are detailed in Section 5.3).

#### 4. Remote Write Clients
The final stage of the architecture is the outbound network layer. `vmagent` can be configured with multiple `-remoteWrite.url` flags. 

```bash
/usr/local/bin/vmagent \
  -promscrape.config=/etc/vmagent/prometheus.yml \
  -remoteWrite.url=http://vminsert-cluster-1:8480/insert/0/prometheus/api/v1/write \
  -remoteWrite.url=https://backup-storage-provider.com/api/v1/write
```

When multiple URLs are provided, the Remote Write Clients replicate the internal queue, fanning out the identical metric payload to all configured destinations concurrently. If one destination goes down, it does not block the other destinations; `vmagent` maintains separate queues and buffer states for each remote endpoint.

### Common Architectural Topologies

Because of its architecture, `vmagent` is commonly deployed in two primary topologies:

* **Edge/IoT Deployment:** In environments with dozens or hundreds of edge locations (like retail stores, cell towers, or separate Kubernetes clusters), deploying a full database at every edge is cost-prohibitive. Instead, a lightweight `vmagent` is deployed at each edge. It scrapes the local components and reliably pushes the data over the public internet or WAN to a centralized VictoriaMetrics cluster.
* **Centralized Heavy-Scraper (Prometheus Replacement):** In massive single-cluster environments where a standard Prometheus server struggles to scrape 500,000+ targets without running out of memory, `vmagent` is deployed as a direct drop-in replacement. It takes over the identical `prometheus.yml` configuration and handles the massive scraping load, stateless and reliably.

## 5.2 Configuring Prometheus Target Scraping

One of the most compelling reasons teams adopt `vmagent` is its frictionless integration with existing Prometheus infrastructure. If you have spent months or years building complex service discovery rules and scrape configurations in Prometheus, you do not need to rewrite them. `vmagent` is fully compatible with standard `prometheus.yml` configuration files.

In this section, we will explore how to configure target scraping, starting from static definitions to dynamic service discovery, and highlight the specific command-line flags `vmagent` uses to optimize the scraping process.

### The `prometheus.yml` Compatibility

At its core, `vmagent` uses the exact same `scrape_configs` syntax as Prometheus. It supports all standard Service Discovery (SD) mechanisms, including Kubernetes (`kubernetes_sd_configs`), Consul (`consul_sd_configs`), EC2 (`ec2_sd_configs`), and file-based discovery (`file_sd_configs`).

Here is a standard example of a `prometheus.yml` file designed to scrape a static node exporter and dynamically discover pods in a Kubernetes cluster:

```yaml
global:
  scrape_interval: 15s
  scrape_timeout: 10s

scrape_configs:
  # 1. Static Configuration Example
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['192.168.1.10:9100', '192.168.1.11:9100']
        labels:
          environment: 'production'
          datacenter: 'us-east'

  # 2. Dynamic Service Discovery Example (Kubernetes)
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Keep only pods with the annotation: prometheus.io/scrape: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      # Map the prometheus.io/path annotation to the metrics path
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Passing the Configuration to `vmagent`

Unlike Prometheus, which relies heavily on the YAML file for both scraping and storage configuration, `vmagent` uses the YAML file *strictly* for target discovery and scraping rules. Global operational settings (like where to send the data, buffer sizes, and concurrency limits) are handled via command-line flags.

To instruct `vmagent` to start scraping targets using your configuration file, use the `-promscrape.config` flag:

```bash
/usr/local/bin/vmagent \
  -promscrape.config=/etc/vmagent/prometheus.yml \
  -remoteWrite.url=http://vminsert:8480/insert/0/prometheus/api/v1/write
```

#### Live Reloading
When you modify the `prometheus.yml` file, you do not need to restart `vmagent` (which would temporarily halt ingestion). You can trigger a zero-downtime configuration reload in two ways:

1.  **Sending a SIGHUP signal:** `kill -SIGHUP $(pidof vmagent)`
2.  **Using the HTTP API:** `curl -X POST http://localhost:8429/-/reload`

### `vmagent`-Specific Scraping Optimizations

While the YAML configuration dictates *what* to scrape, `vmagent` offers several powerful command-line flags to dictate *how* to scrape, allowing you to tune performance far beyond standard Prometheus capabilities.

* **`-promscrape.streamParse=true`**: By default, scrapers read the entire `/metrics` response into memory before parsing it. For targets exposing millions of metrics (like heavily loaded `kube-state-metrics` instances), this causes massive memory spikes. Enabling `streamParse` instructs `vmagent` to parse the HTTP response stream on the fly. This significantly reduces peak memory consumption, though it may slightly increase CPU usage.
* **`-promscrape.dropOriginalLabels=true`**: During the scraping phase, `vmagent` temporarily holds both the original discovered labels (e.g., `__meta_kubernetes_pod_name`) and the final relabeled metrics in memory. If you have massive service discovery metadata, this flag tells `vmagent` to drop the original labels immediately after the relabeling phase is complete, freeing up memory.
* **`-promscrape.maxScrapeSize`**: This acts as a circuit breaker. If a target suddenly starts exposing a gigabyte of metrics due to a misconfiguration (cardinality explosion), it can crash the scraper. You can set a strict limit (e.g., `-promscrape.maxScrapeSize=100MB`). If a target's payload exceeds this size, `vmagent` will abort the scrape and record an error for that specific target, protecting the rest of your ingestion pipeline.

### Monitoring Scrape Health

To ensure your scraping configuration is working, `vmagent` exposes a web interface on port `8429` by default. 

Navigating to `http://<vmagent-ip>:8429/targets` provides a UI similar to the Prometheus targets page. It lists all active, dropped, and unhealthy targets, along with the duration of the last scrape and any error messages (such as `connection refused` or `context deadline exceeded`).

Furthermore, `vmagent` exposes standard metrics about its own scraping performance at `http://<vmagent-ip>:8429/metrics`. Key metrics to monitor include:
* `up`: The classic metric indicating if a target is reachable.
* `vm_promscrape_targets`: The total number of discovered targets.
* `vm_promscrape_scrapes_total`: The number of successful and failed scrapes.
* `vm_promscrape_active_scrapers`: The number of concurrent scrape workers currently active.

## 5.3 Disk Buffering and Mitigating Network Outages

In distributed systems, the network is fundamentally unreliable. Whether due to routine maintenance on the VictoriaMetrics cluster, a transient DNS failure, or a complete network partition between an edge datacenter and the central cloud, ingestion pipelines must be resilient. Standard Prometheus handles remote write failures by holding data in its main TSDB memory, which can quickly lead to Out-Of-Memory (OOM) kills. 

`vmagent` approaches this problem differently. It utilizes a highly optimized, two-tiered buffering system (memory and disk) designed to act as a "shock absorber," ensuring zero data loss during outages while strictly bounding resource usage.

### The Two-Tiered Buffer Architecture

When `vmagent` prepares to send scraped or pushed metrics to a remote destination, the data flows through an internal queuing mechanism. 

```text
  +-------------------+
  | Ingestion Sources |
  | (Scrape / Push)   |
  +-------------------+
            |
            v
  +-------------------+      (Spillover on failure      +-------------------------+
  | In-Memory Queue   |       or network congestion)    | On-Disk Buffer          |
  | (Fast, Volatile)  | ==============================> | (Persistent, Resilient) |
  +-------------------+                                 +-------------------------+
            |                                                      |
            | (Direct dispatch                         (Replayed when connection
            |  when healthy)                            is restored)
            v                                                      |
  +=============================================================================+
  |                             Remote Write Clients                            |
  +=============================================================================+
                                      |
                                      v
                             [Remote Storage Node]
```

1.  **The In-Memory Queue:** Under normal, healthy conditions, `vmagent` attempts to send data immediately from memory to the remote storage. This avoids unnecessary disk I/O and keeps ingestion latency exceptionally low.
2.  **The On-Disk Buffer:** If the remote storage responds with a 5xx HTTP error, times out, or if the network connection drops, the in-memory queue will quickly fill. Once it reaches a small internal threshold, `vmagent` seamlessly spills the pending data into highly compressed blocks on disk. When the remote endpoint becomes available again, `vmagent` reads from this disk buffer and transmits the backlog alongside fresh data.

### Configuring the Disk Buffer

By default, `vmagent` operates purely in memory. To enable the persistent disk buffer (which is highly recommended for production environments), you must configure the temporary data path and its limits using command-line flags.

* **`-remoteWrite.tmpDataPath`**: This flag specifies the directory where `vmagent` should store the buffered blocks. 
* **`-remoteWrite.maxDiskUsagePerURL`**: By default, `vmagent` will fill the disk until no space is left. To prevent `vmagent` from starving the host OS of disk space, you should set a strict upper boundary.

```bash
/usr/local/bin/vmagent \
  -promscrape.config=/etc/vmagent/prometheus.yml \
  -remoteWrite.url=http://vminsert:8480/insert/0/prometheus/api/v1/write \
  -remoteWrite.tmpDataPath=/var/lib/vmagent-buffer \
  -remoteWrite.maxDiskUsagePerURL=10GB
```

#### What Happens When the Buffer is Full?
If an outage lasts so long that the `-remoteWrite.maxDiskUsagePerURL` limit is reached, `vmagent` makes a deliberate, safety-first decision: **it begins dropping the oldest data blocks to make room for the newest data**. 

This FIFO (First-In, First-Out) drop policy is intentional. In observability, the most recent metrics (reflecting the current state of your system) are almost always more valuable for incident response than metrics generated hours ago at the start of the outage. Furthermore, dropping data is infinitely preferable to crashing the agent and losing the ability to scrape altogether.

### Concurrency and Queue Tuning

When an outage resolves, `vmagent` must drain the accumulated backlog while simultaneously transmitting new, incoming metrics. Sending a massive backlog sequentially would take too long. To solve this, `vmagent` utilizes parallel network queues.

* **`-remoteWrite.queues`**: This dictates the number of concurrent connections `vmagent` uses to send data to a single URL. 
    * *Default Behavior:* `vmagent` auto-tunes this value based on network latency and CPU core count. It dynamically scales the number of queues up and down to maximize throughput without overwhelming the remote storage.
    * *Manual Override:* If you notice `vmagent` is too aggressive during recovery and is causing CPU spikes on your `vminsert` nodes, you can hardcode a limit (e.g., `-remoteWrite.queues=4`).

### Best Practices for Buffer Management

1.  **Use Dedicated SSDs:** The disk buffer writes heavily compressed blocks constantly during an outage. Using NVMe or standard SSDs ensures that disk I/O does not become the bottleneck when `vmagent` attempts to flush a massive backlog upon network recovery.
2.  **Separate Buffers for Separate Destinations:** If you configure multiple `-remoteWrite.url` destinations (e.g., a primary cluster and a disaster recovery cluster), `vmagent` automatically maintains completely separate disk buffers for each URL within the `tmpDataPath`. An outage in your DR datacenter will not affect the buffer or ingestion pipeline for your primary datacenter.
3.  **Monitor Buffer Health:** You should actively monitor the buffer via the `/metrics` endpoint. Critical metrics include:
    * `vmagent_remotewrite_pending_data_bytes`: The current size of the data waiting to be sent. Alert on this if it begins growing uncontrollably.
    * `vmagent_remotewrite_dropped_blocks_total`: If this counter increments, your disk buffer has hit its maximum capacity, and you are actively losing historical metric data.
    * `vmagent_remotewrite_queues`: Tracks the number of active parallel connections. High churn here indicates a struggling remote connection.

## 5.4 High Availability and Deduplication with `vmagent`

As your observability infrastructure grows, relying on a single `vmagent` instance introduces a single point of failure (SPOF). If the node hosting `vmagent` crashes, or undergoes routine maintenance, you lose visibility into your systems until it recovers. To achieve true production-grade reliability, `vmagent` must be deployed in a High Availability (HA) configuration. 

However, running multiple scrapers introduces a new challenge: **data duplication**. If two agents scrape the exact same targets and forward the metrics to the backend, your storage costs double, and query results (like `count()` or `sum()`) become artificially inflated. 

VictoriaMetrics solves this elegantly through a combination of **native scrape clustering** within `vmagent` and **transparent deduplication** at the storage layer.

### Scrape Clustering and Sharding

Instead of manually splitting `prometheus.yml` files into multiple smaller files to distribute the load across several agents, `vmagent` provides built-in cluster support. By passing a few command-line flags, you can deploy a fleet of identically configured `vmagent` instances. They will automatically coordinate to shard (distribute) the target list among themselves consistently.

This is controlled via three primary flags:
* `-promscrape.cluster.membersCount`: The total number of `vmagent` instances in the cluster.
* `-promscrape.cluster.memberNum`: The unique index (0 to `membersCount - 1`) of the current `vmagent` instance.
* `-promscrape.cluster.replicationFactor`: The number of `vmagent` instances that should scrape each target.

#### Example: Sharding for Horizontal Scaling (No HA)
If you simply want to split the workload of 100,000 targets across two agents, you set the replication factor to 1.

* **Agent 0:** `-promscrape.cluster.membersCount=2 -promscrape.cluster.memberNum=0 -promscrape.cluster.replicationFactor=1`
* **Agent 1:** `-promscrape.cluster.membersCount=2 -promscrape.cluster.memberNum=1 -promscrape.cluster.replicationFactor=1`

In this setup, Agent 0 scrapes ~50,000 targets, and Agent 1 scrapes the other ~50,000. If one agent goes down, its specific targets stop being scraped.

#### Example: Sharding with High Availability
To achieve High Availability, you increase the replication factor. If you want every target scraped by at least two agents simultaneously, you set `replicationFactor=2`.

```text
                                  +-------------------+
                                  |    Service SD     |
                                  | (e.g., Kubernetes)|
                                  +-------------------+
                                           | (Identical config)
          +-------------------------------------------------------------------+
          |                                |                                  |
          v                                v                                  v
+-------------------+            +-------------------+              +-------------------+
|     vmagent 0     |            |     vmagent 1     |              |     vmagent 2     |
|   (memberNum=0)   |            |   (memberNum=1)   |              |   (memberNum=2)   |
+-------------------+            +-------------------+              +-------------------+
          |                                |                                  |
          |                                |                                  |
          +--------------------------------+----------------------------------+
                                           |
                                           v
                             +---------------------------+
                             | VictoriaMetrics Storage   |
                             | (Handles Deduplication)   |
                             +---------------------------+
```

With `membersCount=3` and `replicationFactor=2`, the cluster ensures that even if `vmagent 1` crashes, `vmagent 0` and `vmagent 2` are already covering its share of the targets. The scraping workload is distributed evenly, and your metrics pipeline remains entirely uninterrupted.

### Resolving Duplication at the Storage Layer

When `replicationFactor` is greater than 1, multiple `vmagent` instances are actively scraping the same target at the same time and pushing identical metric payloads to the remote storage. 

Unlike Prometheus, which struggles to merge overlapping HA streams efficiently, VictoriaMetrics is designed to accept duplicate data and resolve it natively at the storage engine level. 

To make this work, you must configure the **VictoriaMetrics backend** (either the single-node binary or the `vmstorage` component in a cluster) with the `-dedup.minScrapeInterval` flag.

#### How Deduplication Works

The `-dedup.minScrapeInterval` flag instructs VictoriaMetrics to keep only one raw sample per time series within the specified time window. 

For example, if your global scrape interval in `prometheus.yml` is `15s`, you should start the VictoriaMetrics database with:

```bash
/usr/local/bin/victoria-metrics-prod -dedup.minScrapeInterval=15s
```

When the duplicate samples arrive from the HA `vmagent` pair:
1. VictoriaMetrics receives Sample A from `vmagent 0` at `10:00:00`.
2. VictoriaMetrics receives Sample B from `vmagent 1` at `10:00:01` (representing the exact same scrape event, slightly delayed by network jitter).
3. Because both samples fall within the same 15-second deduplication window for that specific time series, VictoriaMetrics silently discards the duplicate.

The deduplication process is deterministic. If two agents push conflicting values within the same window (which is rare but possible if a counter increments exactly between the split-second difference of the two scrapes), VictoriaMetrics simply keeps the sample with the largest timestamp.

By combining `vmagent`'s replication factor with VictoriaMetrics' deduplication window, you achieve a robust, self-healing ingestion pipeline that tolerates agent failures, network partitions, and host restarts without duplicating data or compromising query accuracy.