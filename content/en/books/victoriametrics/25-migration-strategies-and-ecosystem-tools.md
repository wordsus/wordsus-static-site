You have learned how VictoriaMetrics operates, scales, and outperforms traditional time series databases. Now, it is time to make the switch. Migrating a production observability stack is a delicate operation—downtime and data loss are simply not options. 

This chapter provides a battle-tested blueprint for safely transitioning from Prometheus to VictoriaMetrics. We will explore how to objectively assess your current infrastructure footprint, design a zero-downtime dual-write strategy, backfill years of historical data using the `vmctl` utility, and mathematically validate your data integrity to guarantee a flawless cutover.

## 25.1 Assessing Your Current Prometheus Footprint

Before moving a single byte of data or changing a single DNS record to point to VictoriaMetrics, you must thoroughly understand the workload your current Prometheus infrastructure handles. A blind migration often leads to over-provisioning (wasting resources) or under-provisioning (causing immediate performance degradation post-migration). 

Because you have already learned how to calculate hardware sizing for VictoriaMetrics (Chapter 24), this phase is entirely about extracting the necessary variables from your existing Prometheus instances. You need to map out your ingestion load, storage volume, query patterns, and configuration complexity.

### 1. Profiling Ingestion and Time Series Complexity

The "write path" is usually the primary driver for migrating to VictoriaMetrics. To size your `vminsert` nodes (or your single-node binary) and calculate memory requirements, you must extract three critical metrics from your current Prometheus servers.

You can gather these by executing PromQL queries directly against your existing Prometheus instances:

*   **Active Time Series (ATS):** This is the number of series that have received new data points recently. It is the single most important metric for determining memory consumption.
    ```promql
    # Current Active Time Series
    prometheus_tsdb_head_series
    ```
*   **Ingestion Rate:** The number of raw samples appended per second. This dictates your CPU and disk I/O requirements.
    ```promql
    # Samples ingested per second (5-minute average)
    rate(prometheus_tsdb_head_samples_appended_total[5m])
    ```
*   **Series Churn Rate:** How quickly old series stop receiving data and new series are created (often driven by ephemeral Kubernetes pods or frequent deployments). High churn places significant stress on the inverted index.
    ```promql
    # New series created per second
    rate(prometheus_tsdb_head_series_created_total[5m])
    
```

**Assessment Check:** If your churn rate exceeds 10% of your ATS per hour, make a note of it. VictoriaMetrics handles churn much better than Prometheus, but you will still need to tune your memory caching (as discussed in Section 24.2) to accommodate the constant index updates.

### 2. Evaluating Storage and Retention Needs

Next, assess your historical data footprint. This step determines how long your backfill process will take (using `vmctl` in Section 25.3) and helps you estimate the target storage capacity for your `vmstorage` nodes.

Prometheus metrics to review:
```promql
# Total bytes currently retained on disk
prometheus_tsdb_storage_blocks_bytes
```

When evaluating storage, factor in the VictoriaMetrics compression advantage. As outlined in Chapter 10, VictoriaMetrics typically achieves a compression ratio that is 1.5x to 3x better than Prometheus depending on the data shape. 

*   *Assessment Formula:* `(Prometheus Disk Usage / 2) = Estimated VictoriaMetrics Disk Usage`
*   *Retention Assessment:* Document your current `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size` flags. Decide *before* migration if you plan to extend retention periods now that you will have more efficient storage. 

### 3. Analyzing the Query and Read Workload

High ingestion is only half the battle. Your dashboards, alerting rules, and ad-hoc queries form the "read path." Assessing the read workload ensures you provision enough `vmselect` nodes to handle concurrent queries without queuing delays.

Run these queries against Prometheus to understand your baseline read footprint:

```promql
# Total queries executed per second
rate(prometheus_engine_queries[5m])

# Concurrent queries currently executing
prometheus_engine_queries_concurrent_max

# 90th percentile query duration (identifies slow dashboards)
histogram_quantile(0.90, rate(prometheus_engine_query_duration_seconds_bucket[5m]))
```

*Tip:* Review your Grafana query logs or use the Prometheus `/api/v1/status/tsdb` endpoint to find the top 10 most expensive queries. If you identify heavy use of regular expressions or massive aggregations without selectors, you should plan to refactor these queries or use VictoriaMetrics recording rules (Chapter 14) post-migration.

### 4. Rule and Alerting Complexity 

If you are running Prometheus, it is highly likely that Prometheus is also evaluating your recording and alerting rules. During migration, these duties will be offloaded to `vmalert` (Chapter 13). 

You must inventory:
1.  **Total Rule Count:** How many distinct rules exist across your YAML files?
2.  **Rule Evaluation Duration:** How long does it take Prometheus to evaluate a rule group? If rule evaluation regularly spikes near your evaluation interval (e.g., taking 14 seconds on a 15-second interval), your Prometheus is struggling, and you will need to partition these rules across multiple `vmalert` instances.

```promql
# 99th percentile rule group evaluation time
histogram_quantile(0.99, rate(prometheus_rule_group_last_duration_seconds_bucket[5m]))
```

### The Assessment Matrix

To consolidate your findings, create an assessment matrix. This acts as the blueprint for your migration strategy in the next section. 

```text
+-------------------------+-------------------------+----------------------------------+
| Prometheus Metric       | Value (Peak/Avg)        | Maps to VictoriaMetrics Sizing   |
+-------------------------+-------------------------+----------------------------------+
| Active Time Series      |                         | RAM across all nodes             |
| Ingestion Rate (s/sec)  |                         | vminsert / vmstorage CPU & I/O   |
| Churn Rate (series/sec) |                         | Index memory & CPU usage         |
| Disk Usage (GiB/TiB)    |                         | vmstorage Disk Size (x 0.5)      |
| Query Rate (QPS)        |                         | vmselect CPU                     |
| Total Alerting Rules    |                         | vmalert replica count            |
+-------------------------+-------------------------+----------------------------------+
```

Once this matrix is filled out with data collected over at least a 7-day period (to account for weekend drops and weekday traffic spikes), you have a factual footprint. You are now ready to design a seamless, zero-downtime migration strategy.

## 25.2 Designing a Seamless Migration Strategy

With your Prometheus footprint assessed and your hardware requirements calculated, you are ready to execute the migration. The golden rule of time series database migration is **zero data loss and zero dashboard downtime.** To achieve this, we avoid "big bang" cutovers. Instead, we utilize a phased, dual-write strategy.

This strategy ensures that your engineering teams can continue querying Prometheus while VictoriaMetrics is silently populated, validated, and tuned in the background.

### The Dual-Write Architecture

The most reliable migration path involves configuring your existing Prometheus instances to duplicate their incoming data stream and forward it to VictoriaMetrics. This is achieved using the Prometheus `remote_write` protocol (covered in Chapter 4).

```text
                      +-------------------+
                      |                   |
    (1) Scrape        |    Prometheus     |  (2) remote_write
--------------------->|    (Existing)     |----------------------+
                      |                   |                      |
                      +--------+----------+                      v
                               |                       +-------------------+
                               | (3) Query             |                   |
                               v                       |  VictoriaMetrics  |
                      +-------------------+            |   (Single-Node    |
                      |                   |            |    or Cluster)    |
                      |      Grafana      |            |                   |
                      |                   |<-----------+-------------------+
                      +-------------------+  (4) Query
```

### Phase 1: Provision and Connect

First, deploy your VictoriaMetrics infrastructure based on the assessment matrix you developed in Section 25.1. Ensure all networking, firewall rules, and authentication layers (Chapter 22) are in place.

Next, update your existing `prometheus.yml` configuration to include a `remote_write` block pointing to your new VictoriaMetrics endpoint. 

```yaml
# prometheus.yml
remote_write:
  - url: http://<victoriametrics-insert-addr>:8428/api/v1/write
    # Optional: If you enabled basic auth in vmauth
    # basic_auth:
    #   username: 'migration_user'
    #   password: 'super_secret_password'
    
    # Tuning the queue for high throughput
    queue_config:
      max_samples_per_send: 10000
      capacity: 20000
      max_shards: 30
```

*Note: Reload your Prometheus configuration (`kill -HUP <pid>` or `/-/reload` API). Prometheus will immediately begin sending new data points to VictoriaMetrics. Monitor the `prometheus_remote_storage_samples_total` and `prometheus_remote_storage_dropped_samples_total` metrics to ensure the queue is healthy.*

### Phase 2: Read-Path Validation (The Shadow Phase)

At this point, VictoriaMetrics only possesses data starting from the moment you applied the `remote_write` configuration. Let it run for 24 to 48 hours to build up a recent data cache and to allow you to monitor the ingestion performance.

During this shadow phase, update your Grafana instance:
1.  Add VictoriaMetrics as a **new** Prometheus-type Data Source in Grafana. Do *not* overwrite the existing Prometheus data source yet.
2.  Duplicate your most critical, high-traffic dashboards.
3.  Change the data source of the duplicated dashboards to VictoriaMetrics.

Compare the two sets of dashboards. Look for visual discrepancies, missing metrics, or slight variations in query evaluation times. Because VictoriaMetrics implements MetricsQL (a superset of PromQL), 99% of your queries will work seamlessly. However, this is the time to spot any edge cases or identify queries that could benefit from VictoriaMetrics-specific optimizations (Chapter 9).

### Phase 3: Rule and Alert Translation

While data is dual-writing, you must migrate your recording and alerting rules. 

1.  Extract your rule YAML files from Prometheus.
2.  Deploy `vmalert` (Chapter 13) and configure it to read these files.
3.  Point `vmalert` to your VictoriaMetrics read endpoint (`-datasource.url`) and write endpoint (`-remoteWrite.url`), and connect it to your Alertmanager.
4.  **Crucial Step:** To avoid duplicate paging and alert spam, configure `vmalert` with a `-notifier.blackhole` flag temporarily, or route its alerts to a testing Slack channel. 

Once you have verified that `vmalert` is firing the exact same alerts as Prometheus, you can disable the rule evaluation inside your legacy Prometheus instances and remove the blackhole from `vmalert`.

### Phase 4: Historical Data Backfill

You now have a live VictoriaMetrics instance handling current ingestion, dashboard reads, and rule evaluations. However, it is missing your historical data (e.g., data from last month or last year).

This is where you execute the historical backfill. You will use the `vmctl` utility (detailed in Section 25.3) to read the TSDB blocks from Prometheus's disk and write them into VictoriaMetrics. 

Because you are already handling live data via `remote_write`, the backfill can run at a controlled, throttled pace in the background without impacting your real-time observability. VictoriaMetrics natively handles the insertion of out-of-order historical data seamlessly.

### Phase 5: The Cutover and Decommissioning

Once `vmctl` finishes importing your historical blocks, the migration is essentially complete. 

1.  In Grafana, safely update your default Prometheus Data Source URL to point to VictoriaMetrics. Delete the duplicated "shadow" dashboards.
2.  Replace Prometheus instances with `vmagent` (Chapter 5) to act as your lightweight scrapers. `vmagent` uses a fraction of the RAM and CPU that Prometheus uses for scraping, finalizing your resource efficiency gains.
3.  Spin down your legacy Prometheus servers.

By following this strategy, your end-users will experience uninterrupted observability, and your on-call engineers will not suffer from missing alerts or broken dashboards during the transition.

## 25.3 Backfilling Historical Data using `vmctl`

While the dual-write strategy established in Section 25.2 handles real-time incoming metrics, your historical context—the weeks, months, or years of data sitting on your legacy Prometheus disks—remains inaccessible to your new VictoriaMetrics cluster. To achieve a complete migration, you must backfill this historical data.

VictoriaMetrics provides an official, purpose-built command-line utility for this exact task: `vmctl`. 

### The Architecture of `vmctl`

`vmctl` acts as an intelligent data bridge. It does not scrape endpoints or evaluate PromQL; instead, it reads raw time series data from various sources (Prometheus, InfluxDB, OpenTSDB) and ingests it directly into VictoriaMetrics using native, highly optimized import protocols.

```text
+-------------------+                                  +-------------------+
|                   |                                  |                   |
|  Prometheus Disk  |           +-------+              |  VictoriaMetrics  |
|  (TSDB Blocks)    |---------->| vmctl |------------->|    vminsert /     |
|                   |   Read    +-------+    Write     |   Single-Node     |
+-------------------+                              +-------------------+
```

When migrating from Prometheus, `vmctl` reads the on-disk TSDB blocks directly. It parses the index and chunks, packages them into VictoriaMetrics-compatible formats, compresses them, and pushes them over HTTP(S).

### Step 1: Taking a Prometheus Snapshot

**Crucial Warning:** You should never run `vmctl` directly against the live data directory of a running Prometheus instance. Doing so can lead to read errors if Prometheus attempts to compact or delete blocks while `vmctl` is reading them.

Instead, you must use the Prometheus Snapshot API. This creates a hard-link copy of the current TSDB state, which takes up almost zero additional disk space and provides a safe, immutable target for `vmctl`.

Ensure your Prometheus instance is started with the `--web.enable-admin-api` flag, then trigger a snapshot:

```bash
curl -XPOST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

The response will look like this:
```json
{
  "status": "success",
  "data": {
    "name": "20231027T101530Z-7a6b5c4d3e2f1a0b"
  }
}
```

Navigate to your Prometheus data directory. You will find the snapshot located under `data/snapshots/<snapshot-name>`.

### Step 2: Executing the Backfill

With the snapshot ready, you can execute the migration. Download the `vmctl` binary that matches your operating system and architecture from the official VictoriaMetrics GitHub releases page.

Here is the standard command structure for a Prometheus-to-VictoriaMetrics backfill:

```bash
./vmctl prometheus \
  --prom-snapshot=/path/to/prometheus/data/snapshots/20231027T101530Z-7a6b5c4d3e2f1a0b \
  --vm-addr=http://<victoriametrics-insert-addr>:8428
```

#### Avoiding Overlap with Dual-Write
Because you initiated the `remote_write` phase (Section 25.2) *before* triggering this backfill, your snapshot will contain a few hours or days of data that VictoriaMetrics already possesses. 

While VictoriaMetrics handles duplicate data gracefully (ignoring exact duplicates), you can save network bandwidth and processing time by telling `vmctl` to stop reading data at the exact timestamp you enabled `remote_write`.

```bash
./vmctl prometheus \
  --prom-snapshot=/path/to/prometheus/data/snapshots/20231027... \
  --vm-addr=http://<victoriametrics-insert-addr>:8428 \
  --prom-filter-time-end="2023-10-25T14:00:00Z"
```

### Step 3: Performance Tuning and Concurrency

Migrating terabytes of historical data can take time. `vmctl` is heavily multithreaded and exposes several flags to maximize throughput. Your limiting factors will typically be the read speed of the Prometheus disk or the network bandwidth between the machines.

To optimize the transfer, adjust the following parameters:

*   **`--prom-concurrency`**: Controls the number of concurrent readers scanning the Prometheus snapshot. Increase this if you are reading from fast NVMe SSDs (e.g., `--prom-concurrency=4`).
*   **`--vm-concurrency`**: Controls the number of concurrent workers sending data to VictoriaMetrics. This should generally match or slightly exceed the `prom-concurrency` (e.g., `--vm-concurrency=4`).
*   **`--vm-batch-size`**: Dictates the maximum number of samples sent per single HTTP request. The default is `200000`. Increasing this can improve throughput on high-latency networks but uses more RAM on both `vmctl` and the VictoriaMetrics node.

**A Production-Ready Command:**
```bash
./vmctl prometheus \
  --prom-snapshot=/var/lib/prometheus/snapshots/20231027... \
  --vm-addr=http://vminsert.internal.network:8428 \
  --prom-filter-time-end="2023-10-25T14:00:00Z" \
  --prom-concurrency=4 \
  --vm-concurrency=8 \
  --vm-batch-size=500000
```

### Handling Failures and Interruptions

Network blips happen, and occasionally a `vmctl` process might crash or be killed by an Out-Of-Memory (OOM) killer on constrained machines. 

**Do not panic.** You do not need to start over from scratch. 

Because VictoriaMetrics utilizes an advanced time series storage engine (Chapter 10), inserting identical data points multiple times is idempotent. If `vmctl` fails halfway through a migration, simply restart the command. 

VictoriaMetrics will ingest the data again, recognize the identical timestamps and values, and seamlessly deduplicate them during the background merge process, ensuring your historical data remains perfectly intact and mathematically accurate.

## 25.4 Validating Data Integrity Post-Migration

The final step in any migration strategy is proving that the data safely arrived and remains mathematically accurate. A successful run of `vmctl` simply means the data was transferred; it does not automatically guarantee that your dashboards will render identically. 

Validating time series data across two different storage engines requires a strategic approach. You cannot simply compare the raw disk size or the total byte count, as VictoriaMetrics utilizes significantly heavier compression than Prometheus (as discussed in Chapter 10). Instead, validation must focus on query behavior, data shape, and mathematical equivalency.

### 1. The Discrepancy Paradox: Understanding Deduplication

Before running any validation queries, you must understand a critical architectural difference between Prometheus and VictoriaMetrics that often causes immediate panic during post-migration checks: **background deduplication**.

If your `remote_write` dual-write phase (Section 25.2) overlapped with the end-time of your `vmctl` backfill (Section 25.3), VictoriaMetrics will have received the same data points twice for that overlapping time window. 

*   **Prometheus** will store duplicate samples if they arrive via different mechanisms or if blocks overlap without compaction.
*   **VictoriaMetrics** automatically identifies identical timestamps and values for the same time series and discards the duplicates during its background merge process.

Therefore, if you run a query to count the *absolute number of raw samples* over the migrated time window, **VictoriaMetrics will likely report a lower number than Prometheus.** This is not data loss; it is data hygiene. Validation must rely on aggregated values and functions, not raw sample counts.

### 2. Macro-Level Mathematical Validation

The most effective way to validate data integrity is to run heavy aggregations over a specific historical time window on both systems and compare the results. 

Select 3 to 5 critical, high-volume metrics (e.g., CPU usage, HTTP request rates, network throughput) and execute the following PromQL queries against both the legacy Prometheus snapshot and the new VictoriaMetrics cluster. 

*Be sure to use an absolute time range in your query tool (e.g., exactly `2023-10-01T00:00:00Z` to `2023-10-25T00:00:00Z`) so both systems evaluate the exact same data window.*

```promql
# 1. Validate the sum of all counter increases (captures volume accuracy)
sum(increase(http_requests_total[30d]))

# 2. Validate the maximum gauge value (captures peak accuracy)
max(max_over_time(node_memory_MemAvailable_bytes[30d]))

# 3. Validate average rates (captures distribution accuracy)
avg(rate(node_cpu_seconds_total[30d]))
```

**Expected Result:** The numbers returned by VictoriaMetrics should be mathematically identical (or within a microscopic floating-point rounding margin) to those returned by Prometheus.

### 3. Visual Validation via Dual-Datasource Dashboards

While mathematical validation ensures the data is accurate at a macro level, visual validation ensures the data *shape* is correct at a micro level. 

In Grafana, create a temporary "Validation Dashboard." For your most critical panels, utilize Grafana's mixed data source capability to plot the Prometheus data and the VictoriaMetrics data on the exact same graph.

```text
Grafana Panel Configuration: "HTTP Errors"
+--------------------------------------------------------------------------+
|  [A] Data Source: Prometheus (Legacy)                                    |
|      Query: sum(rate(http_requests_total{status="500"}[5m]))             |
|      Style: Solid Line, Color: Red, Line Width: 4                        |
|                                                                          |
|  [B] Data Source: VictoriaMetrics (New)                                  |
|      Query: sum(rate(http_requests_total{status="500"}[5m]))             |
|      Style: Dotted Line, Color: Yellow, Line Width: 2                    |
+--------------------------------------------------------------------------+
```

When you view this panel over historical time ranges, the yellow dotted line should perfectly overlay the thick red line. If you see deviations, gaps, or spikes on the VictoriaMetrics line that do not exist on the Prometheus line, check the `vmctl` logs for potential skipped blocks during the backfill.

### 4. Alert State Validation

Historical data is validated, but what about real-time alerting? If you followed the migration strategy, `vmalert` is currently running alongside Prometheus.

Before decommissioning Prometheus, compare the active alert states:

1.  Query the Prometheus `/api/v1/alerts` endpoint.
2.  Query the `vmalert` `/api/v1/alerts` endpoint.
3.  Compare the output.

```json
// Example comparison checklist:
{
  "Validation_Check": "Active Alerts Match",
  "Prometheus_Firing": 14,
  "vmalert_Firing": 14,
  "Prometheus_Pending": 3,
  "vmalert_Pending": 3
}
```

If `vmalert` is firing alerts that Prometheus is not, verify that you migrated your recording rules correctly, as missing pre-computed recording rules will cause subsequent alerting rules to evaluate to empty sets or trigger false positives.

### 5. The Final Sign-Off

Create a final validation matrix to document the success of the migration before destroying the legacy infrastructure.

```text
+-----------------------------------+-----------+----------------+--------+
| Validation Check                  | Legacy OS | VictoriaMetrics| Status |
+-----------------------------------+-----------+----------------+--------+
| 30-Day CPU `sum(increase(...))`   | 145,291.4 | 145,291.4      | PASS   |
| Active Time Series Count          | ~2.4M     | ~2.4M          | PASS   |
| Active Alert Count                | 12 Firing | 12 Firing      | PASS   |
| 99th Percentile Query Latency     | 850ms     | 120ms          | PASS   |
| Storage Disk Footprint            | 1.8 TB    | 650 GB         | PASS   |
+-----------------------------------+-----------+----------------+--------+
```

Once this matrix is complete and all checks pass, your migration is officially successful. You have safely transitioned from Prometheus to VictoriaMetrics, resulting in lower resource consumption, faster queries, and a highly scalable, long-term observability platform.

With your migration complete and data validated, you have officially mastered VictoriaMetrics. From understanding the core architecture and ingestion protocols to scaling distributed clusters and tuning performance, this book has equipped you with the knowledge to build a robust, cost-effective observability platform. 

VictoriaMetrics is designed to get out of your way, allowing you to focus on the insights your metrics provide rather than fighting the database that stores them. As the ecosystem continues to evolve, your foundational understanding will serve as a reliable anchor. Congratulations on completing *VictoriaMetrics: The Definitive Guide*. Happy monitoring!