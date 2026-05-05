Managing the lifecycle of time-series data is critical for performance and cost-efficiency as your VictoriaMetrics deployment scales. Storing every metric indefinitely is rarely viable. This chapter explores how the database handles data aging and redundancy to optimize your storage footprint. 

We will cover configuring global retention periods to automatically purge stale data, setting up multi-tiered policies for transient vs. high-value metrics, and managing out-of-order ingestion. Finally, we will dive into deduplication rules to ensure highly available, redundant scraping architectures do not artificially inflate your disk usage.

## 11.1 Configuring Global Retention Periods

At the heart of managing storage lifecycle in VictoriaMetrics is the global retention period. As time-series data ages, its operational value typically diminishes. Storing every data point indefinitely is rarely a cost-effective strategy, making data retention a fundamental configuration for any production deployment. 

The global retention period defines the baseline lifespan of your metrics. Once data points age past this threshold, VictoriaMetrics permanently deletes them from disk to reclaim space.

### The `-retentionPeriod` Flag

Global retention is controlled entirely by a single command-line flag: `-retentionPeriod`. 

By default, if you start VictoriaMetrics without specifying this flag, it defaults to `1`—which VictoriaMetrics interprets as **1 month**. If you are running a test cluster and suddenly notice older data missing after 30 days, this default configuration is the reason.

The flag accepts various time units, allowing for flexible configuration:
* `h` - hours (e.g., `24h`)
* `d` - days (e.g., `14d`)
* `w` - weeks (e.g., `4w`)
* `y` - years (e.g., `5y`)
* `mo` - months (e.g., `3mo`)
* *Numeric values without a suffix are treated as months.*

**Examples:**
```bash
# Keep data for 14 days
/path/to/victoria-metrics-prod -retentionPeriod=14d

# Keep data for 6 months
/path/to/victoria-metrics-prod -retentionPeriod=6mo

# Keep data for 5 years
/path/to/victoria-metrics-prod -retentionPeriod=5y
```

If your business or compliance requirements mandate keeping time-series data indefinitely, you can set the retention period to an arbitrarily high value, such as `100y` (100 years).

### Single-Node vs. Cluster Configuration

Where you apply the `-retentionPeriod` flag depends on your architectural deployment (as discussed in Chapter 2).

* **Single-Node:** Pass the flag directly to the `victoria-metrics` binary.
* **Cluster Version:** The flag must be passed to the `vmstorage` components, as they are responsible for physically writing and deleting data on disk. 

While not strictly required for data deletion, it is highly recommended to also pass the exact same `-retentionPeriod` flag to your `vmselect` nodes. Doing so optimizes query performance; `vmselect` will immediately short-circuit queries requesting data outside the retention window rather than unnecessarily querying the `vmstorage` nodes for data that no longer exists.

### How Data Deletion Works Under the Hood

A common misconception among new VictoriaMetrics administrators is that a metric point is instantly deleted the millisecond it crosses the retention threshold. In reality, VictoriaMetrics optimizes disk I/O by deleting data in bulk based on time partitions.

VictoriaMetrics natively partitions data by month. Within each month's partition, data is organized into smaller "parts" (immutable files on disk). The background worker process periodically checks these parts against the current time. 

A part is only dropped from disk when **all of the data points within that part** fall entirely outside the configured `-retentionPeriod`.

```text
Time ->                                          Current Date: Nov 15
                                                 Retention: 2mo (60 days)
                                                 Threshold Date: Sep 16
+-------------------+-------------------+-------------------+
|    August Part    |  September Part   |   October Part    |
| (Aug 1 - Aug 31)  | (Sep 1 - Sep 30)  | (Oct 1 - Oct 31)  |
+-------------------+-------------------+-------------------+
          |                   |                   |
    [ DROPPED ]           [ KEPT ]            [ KEPT ]
          |                   |                   |
 Max timestamp is     Max timestamp is    Max timestamp is
 older than Sep 16.   newer than Sep 16.  newer than Sep 16.
```

In the diagram above, even though the data from September 1st to September 15th is technically older than the 60-day threshold, it resides in a part that also contains data from late September. Therefore, the entire part is kept until the newest data point inside it crosses the threshold. 

**Operational Takeaways from this Design:**
1.  **Delayed Disk Space Recovery:** If you lower the `-retentionPeriod` on a running cluster (e.g., changing from `12mo` to `1mo`), your disk space will not instantly drop. Space is freed incrementally as the background processes identify and delete parts that are completely out of bounds.
2.  **Grace Period:** You will often be able to query data slightly older than your retention period, depending on how data is grouped into parts on disk. However, you should never rely on this grace period for business-critical querying.
3.  **Storage Sizing:** When performing capacity planning (Chapter 24), you must account for this month-based partitioning. A retention of `14d` might require enough disk space to temporarily hold almost a month's worth of data before an entire underlying part ages out and is purged.

## 11.2 Setting Up Multi-Tiered Retention Policies

While a global retention period provides a necessary safety net for disk usage, treating all time-series data equally is rarely the most efficient approach at scale. In a real-world observability ecosystem, not all metrics hold the same historical value. 

For example, high-cardinality debugging metrics from a development environment might lose their value after a few days, whereas core business KPIs (like checkout success rates or daily active users) may need to be retained for years for compliance and year-over-year trend analysis. Storing gigabytes of transient `dev` metrics for a year simply because your global retention is set to `1y` is a massive waste of storage resources.

This is where **multi-tiered retention policies** come into play.

> **Note:** Granular, per-metric retention via the `-retentionFilter` flag is a feature exclusive to VictoriaMetrics Enterprise. Open-source users typically achieve a rough approximation of this by running entirely separate VictoriaMetrics instances or clusters for different data tiers, or by aggressively dropping metrics at the `vmagent` ingestion layer.

### The `-retentionFilter` Flag

Multi-tiered retention is configured using the `-retentionFilter` command-line flag. This flag allows you to define specific retention periods for time series that match a given PromQL/MetricsQL label selector.

The syntax for the flag is strictly formatted as `timeseries_selector:retention_period`.

You can specify this flag multiple times to create a comprehensive, multi-tiered policy. If a time series does not match any of your defined filters, VictoriaMetrics falls back to the global `-retentionPeriod` discussed in Section 11.1.

**Basic Configuration Example:**

```bash
/path/to/victoria-metrics-enterprise \
  -retentionPeriod=6mo \
  -retentionFilter='{env="dev"}:7d' \
  -retentionFilter='{env="staging"}:14d' \
  -retentionFilter='{team="finance", job="transactions"}:5y'
```

### How Policies are Evaluated

When configuring multi-tiered retention, it is crucial to understand how VictoriaMetrics resolves overlapping filters. Time series often carry dozens of labels, meaning a single metric might match multiple `-retentionFilter` rules simultaneously.

**The Rule of Minimum Retention:** If a single time series matches multiple retention filters, VictoriaMetrics prioritizes the **shortest** retention period among the matches.

Consider the following configuration:

```bash
-retentionFilter='{env="prod"}:1y'
-retentionFilter='{job="kubernetes-cadvisor"}:30d'
```

If a metric arrives with the labels `{env="prod", job="kubernetes-cadvisor"}`, it successfully matches both filters. Because VictoriaMetrics applies the minimum matching retention, this specific metric will be deleted after **30 days**, overriding the broader 1-year production rule.

#### Visualizing the Evaluation Flow

```text
Incoming Metric: {env="prod", team="analytics", job="nginx"}
                      │
                      ▼
+---------------------------------------------------+
|            Retention Filter Evaluation            |
+---------------------------------------------------+
| 1. Match: {env="prod"}                 -> 1y      |
| 2. Match: {team="analytics"}           -> 5y      |
| 3. Match: {job="nginx"}                -> No Match|
+---------------------------------------------------+
                      │
                      ▼
            Multiple Matches Found?
           (Yes: 1y and 5y applied)
                      │
                      ▼
         Apply Minimum Retention Rule
             (1y is less than 5y)
                      │
                      ▼
        Final Applied Retention: 1 Year
```

### Architectural Deployment Considerations

Just like the global retention flag, `-retentionFilter` must be applied to the storage layer where data deletion actually occurs.

* **Single-Node:** Pass all `-retentionFilter` flags directly to the main binary.
* **Cluster:** Pass the filters to your `vmstorage` nodes. 

**Important optimization for Clusters:** You must also pass the exact same `-retentionFilter` flags to your `vmselect` nodes. 
While `vmselect` does not delete data, it uses these filters to intelligently optimize queries. If a user queries `{env="dev"}` over a 30-day time range, a properly configured `vmselect` node knows that `dev` data only exists for 7 days. It will truncate the query's time window before dispatching it to `vmstorage`, saving significant network bandwidth, disk I/O, and CPU cycles across the cluster.

### Best Practices for Multi-Tiered Retention

1. **Start Broad, Go Specific:** Rely on your global `-retentionPeriod` for your baseline (e.g., 30 days). Use filters to target specific high-value metrics for longer storage, or highly volatile/spammy metrics for rapid deletion.
2. **Avoid Overly Complex Selectors:** While you can use complex regex matchers (e.g., `-retentionFilter='{__name__=~"http_requests_.*"}:90d'`), evaluating heavy regex against millions of active time series can introduce CPU overhead. Prefer exact label matches whenever possible.
3. **Audit Your Multi-Matches:** Because the shortest retention always wins, be exceptionally careful when applying long retention periods to broad categories. A rogue, short-retention filter on a common label (like `instance` or `job`) can inadvertently purge your long-term business metrics.
4. **Use VMUI for Testing:** Before applying a filter like `{job="kube-state-metrics"}`, paste that exact selector into the VictoriaMetrics UI (VMUI) to see exactly which metrics it captures. This ensures you aren't accidentally capturing data you intended to keep.

## 11.3 Handling Out-of-Order Data Ingestion

In an ideal observability ecosystem, telemetry data flows into the storage layer in perfect chronological order. In reality, distributed systems are messy. Network partitions occur, IoT devices lose connectivity and batch-sync their offline buffers, and data engineering teams frequently need to backfill historical datasets. This results in **out-of-order (OoO) data ingestion**—metrics arriving at the database with timestamps older than the most recently ingested points for that same time series.

For many traditional time-series databases (like older versions of Prometheus), out-of-order data is a critical error. They rely on strict append-only files and will flatly reject older data points. VictoriaMetrics takes a fundamentally different approach.

### The Native Advantage

VictoriaMetrics **natively and transparently supports out-of-order data ingestion by default.** There are no special configuration flags to enable, no separate storage blocks to allocate, and no architectural penalties for occasional delayed metrics.

This capability is a direct result of its MergeTree-inspired storage engine (detailed in Chapter 10). Because VictoriaMetrics does not strictly append data to a single monolithic file per time series, it doesn't care if a data point from two hours ago arrives right now. 

#### How the Storage Engine Handles It

When an out-of-order metric point arrives, VictoriaMetrics simply buffers it in memory alongside real-time data and flushes it to a new, small "part" on disk. A background worker process eventually notices that this new part and older existing parts overlap in time, and merges them together efficiently.

```text
Time Flow: Left to Right (Older to Newer)

1. Normal Ingestion:
   [ Part 1: 10:00 - 11:00 ] ---> [ Part 2: 11:00 - 12:00 ] ---> (Live Data: 12:15)

2. Out-of-Order Data Arrives (Timestamp: 10:30):
   [ Part 1: 10:00 - 11:00 ]      [ Part 2: 11:00 - 12:00 ]
             ^
             |___ [ New Part 3: 10:30 ] (Written immediately to disk)

3. Background Merge Process:
   [ Merged Part: 10:00 - 11:00 (Now includes the OoO point) ]
```

### The Catch: Retention Policy Boundaries

While the storage engine can handle out-of-order data gracefully, it is strictly bound by the retention policies you configured in Sections 11.1 and 11.2. 

**VictoriaMetrics will silently drop incoming out-of-order data if its timestamp is older than the applicable retention period.**

If your global `-retentionPeriod` is set to `30d`, and an IoT device connects to the network to flush a buffer of metrics recorded 35 days ago, VictoriaMetrics accepts the HTTP request but immediately discards the payload during the ingestion pipeline. It will not write this data to disk, as doing so would only trigger an immediate deletion cycle, wasting CPU and disk I/O.

If you know you are about to ingest a massive historical backfill that exceeds your current retention period, you must temporarily increase the `-retentionPeriod` (and `-retentionFilter`, if applicable), restart the storage nodes, perform the backfill, and then revert the configuration.

### Performance Considerations for Massive Backfills

While occasional out-of-order data (e.g., a Prometheus scraper lagging by a few minutes) has zero noticeable impact on cluster performance, massive historical backfills are a different story.

If you use a tool like `vmctl` (covered in Chapter 25) to ingest months of historical data while the cluster is simultaneously handling high real-time traffic, you may observe the following:

1.  **Increased Disk I/O:** The background merge process works overtime to stitch the massive historical parts together with existing data.
2.  **Increased CPU Usage:** Compression and decompression algorithms run heavily during the background merges.
3.  **Temporary Query Slowness:** If a user queries the exact time range being actively backfilled, `vmselect` has to read from dozens of unmerged, fragmented parts on disk before the background workers finish organizing them.

**Best Practice:** If you are backfilling large amounts of out-of-order data, it is highly recommended to sort the data chronologically *before* sending it to the VictoriaMetrics ingestion endpoints. While VictoriaMetrics can sort the data for you, doing it client-side significantly reduces the CPU and memory pressure on your `vminsert` and `vmstorage` nodes.

## 11.4 Configuring and Tuning Deduplication Rules

In highly available observability architectures, data duplication is an expected reality rather than an exception. Running redundant scraping pairs (like two identical `vmagent` or Prometheus instances scraping the same targets) ensures that if one agent fails, the other continues to collect data. However, this also means VictoriaMetrics receives every data point twice. Other sources of duplication include unstable network connections causing client retries, or overlapping historical backfills.

Without deduplication, storing redundant data unnecessarily inflates disk usage, increases query evaluation times, and can even skew aggregated metrics (like `sum()` or `count()`) if identical time series aren't properly grouped at query time.

### The `-dedup.minScrapeInterval` Flag

VictoriaMetrics handles deduplication natively through the command-line flag `-dedup.minScrapeInterval`. 

This flag instructs the database to keep only a single raw sample per time series within the specified time interval. If multiple data points for the exact same time series (meaning the metric name and all labels match perfectly) arrive within this interval, VictoriaMetrics retains only the one with the highest timestamp and discards the rest.

**Typical Configuration:**
You should set this flag to a value that matches your global scrape interval. 

* If your scraping agents are configured to scrape targets every 15 seconds, set `-dedup.minScrapeInterval=15s`.
* If your scrape interval is 1 minute, set `-dedup.minScrapeInterval=1m`.

```bash
# Example: Deduplicate points arriving closer than 30 seconds apart
/path/to/victoria-metrics -dedup.minScrapeInterval=30s
```

By default, this flag is set to `0` (disabled). 

### How Deduplication Operates Across the Cluster

Configuring deduplication correctly depends heavily on your architectural deployment. A frequent pitfall for administrators migrating from single-node to cluster deployments is forgetting that data in a cluster is distributed across multiple disks.

**Single-Node Deployments:**
Pass the flag to the main `victoria-metrics` binary. The system will handle deduplication during ingestion (dropping duplicates before they are written to disk) and during querying (if any duplicates slipped through or were ingested prior to the flag being enabled).

**Cluster Deployments:**
In a clustered setup, data is routed by `vminsert` to multiple `vmstorage` nodes. If two Prometheus replicas send the exact same data point at slightly different milliseconds, `vminsert` might route replica A's point to `vmstorage-1` and replica B's point to `vmstorage-2`. 

Because `vmstorage-1` and `vmstorage-2` do not share a disk or memory state, they cannot deduplicate against each other during ingestion. Therefore:

1.  **Ingestion-Time Deduplication:** Apply `-dedup.minScrapeInterval` to all `vmstorage` nodes. This handles basic deduplication (e.g., client retries sending identical data to the same storage node).
2.  **Query-Time Deduplication (Critical):** You **must** also apply the exact same `-dedup.minScrapeInterval` flag to all `vmselect` nodes. When a user runs a query, `vmselect` fetches the data from all `vmstorage` nodes and merges the results. By providing the deduplication flag to `vmselect`, it will identify identical points that were split across different storage nodes and merge them into a single, clean time series before returning the payload to Grafana or the end user.

### High Availability (HA) Prerequisites

For deduplication to work, the incoming metric streams must be *absolutely identical*. VictoriaMetrics identifies a time series by its full set of labels. If even a single label differs, VictoriaMetrics considers them entirely different time series, and the `-dedup.minScrapeInterval` rule will not merge them.

When running HA Prometheus or `vmagent` pairs, the agents typically attach a unique `replica` or `prometheus` label to identify themselves (e.g., `replica="A"` and `replica="B"`).

```text
# To VictoriaMetrics, these are two different time series. Deduplication will FAIL.
cpu_usage{host="server-1", replica="A"} 85.2 1630000000
cpu_usage{host="server-1", replica="B"} 85.2 1630000000
```

To enable VictoriaMetrics to deduplicate these streams, you must use relabeling (as covered in Chapter 6) at the `vmagent` or Prometheus level to drop the `replica` label *before* or *during* the remote write process, or configure VictoriaMetrics to drop it upon ingestion using the `-relabelConfig` flag.

```text
# After dropping the replica label, the series match perfectly. Deduplication will SUCCEED.
cpu_usage{host="server-1"} 85.2 1630000000
cpu_usage{host="server-1"} 85.2 1630000000
```

### Tuning and Caveats

* **Jitter:** Scrape intervals are rarely perfectly precise due to network latency and application response times. A 15-second scrape interval might result in data points arriving 14.8 seconds or 15.2 seconds apart. VictoriaMetrics accounts for this internally, but be mindful not to set `-dedup.minScrapeInterval` higher than your actual scrape interval, or you will inadvertently drop valid data points.
* **Historical Data:** If you enable `-dedup.minScrapeInterval` on an existing cluster, `vmstorage` will not go back and retroactively delete historical duplicates from your hard drives. However, if you add the flag to `vmselect`, it will deduplicate that historical data dynamically *at query time*, immediately fixing your graphs and dashboards.
* **Performance:** Query-time deduplication at the `vmselect` layer requires CPU cycles. While highly optimized, relying solely on `vmselect` to deduplicate massive amounts of redundant data will increase your query latency. Ensuring your ingestion pipeline drops identical replica labels properly is the most performant strategy.
