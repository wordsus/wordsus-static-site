While basic PromQL handles simple monitoring, real-world observability demands more. VictoriaMetrics extends standard capabilities with MetricsQL, an optimized query language built to eliminate extrapolation anomalies and simplify complex logic. In this chapter, we move beyond simple aggregations to explore advanced rollup functions for rates, increases, and deltas. We will dive into exclusive MetricsQL features that streamline SLO calculations, master subqueries for historical data comparisons, and leverage `WITH` expressions to keep your code DRY. Prepare to unlock the full analytical power of the VictoriaMetrics engine.

## 8.1 Understanding Rate, Increase, and Delta Functions

When analyzing time series data, raw metric values often provide little actionable insight on their own. Knowing that a web server has handled 1,543,021 requests since it booted is less useful than knowing it is currently handling 500 requests per second. To derive these velocities and changes over time, MetricsQL provides a core set of rollup functions: `rate`, `increase`, and `delta`. 

While these functions share identical names with their PromQL counterparts, VictoriaMetrics implements them with a highly optimized, user-friendly logic that eliminates the infamous extrapolation anomalies often encountered in vanilla Prometheus.

### Applying the Right Function to the Right Metric Type

Before applying these functions, you must understand the underlying metric type, as applying the wrong function will yield mathematically invalid results:

* **Counters:** Metrics that only go up (or reset to zero upon restart), such as `http_requests_total` or `node_network_receive_bytes_total`. Use `rate()`, `irate()`, or `increase()`.
* **Gauges:** Metrics that can go up and down, such as `node_memory_MemFree_bytes` or `temperature_celsius`. Use `delta()` or `idelta()`.

### The `rate()` and `irate()` Functions

The `rate()` function calculates the per-second average rate of increase of a time series over a specified lookbehind window. It is the most common function used for generating dashboards and alerts for throughput, traffic, and error rates.

```metricsql
# Calculates the per-second rate of HTTP requests over a 5-minute window
rate(http_requests_total[5m])
```

When evaluating a window, `rate()` correctly handles **counter resets**. If a target restarts and its counter drops from `1000` to `0` and then climbs to `50`, `rate()` understands this as a total increase of `50` over the reset, not a negative drop.

**`irate()` (Instantaneous Rate):**
While `rate()` averages the increase over the entire `[5m]` window, `irate()` looks only at the **last two data points** within that window to calculate the per-second rate. 

```metricsql
# Calculates the per-second rate using only the two most recent samples in the 5m window
irate(http_requests_total[5m])
```

* Use `rate()` for alerting and slow-moving dashboards, as it smooths out volatile spikes.
* Use `irate()` for highly granular, real-time troubleshooting dashboards where you need to see brief, localized latency or traffic spikes.

### The `increase()` Function

The `increase()` function calculates the total absolute increase of a counter over the specified time window. 

```metricsql
# Returns the total number of errors that occurred in the last hour
increase(http_errors_total[1h])
```

#### The MetricsQL Advantage: Precise Increases
In standard PromQL, `increase()` functions by calculating the rate and multiplying it by the window duration, then extrapolating the results to the edges of the time window. This often leads to a confusing scenario where the `increase()` of an integer counter returns fractional values (e.g., returning `4.3` errors instead of `4`).

MetricsQL intentionally abandons this edge-extrapolation. In VictoriaMetrics, if a counter increments exactly 5 times between the first and last data point in the window, `increase()` returns exactly `5`. Furthermore, MetricsQL maintains a strict mathematical relationship: `increase(m[d])` is always exactly equal to `rate(m[d]) * d`.

### The `delta()` and `idelta()` Functions

When working with gauges (values that fluctuate up and down), `rate` and `increase` are inappropriate because they interpret drops as counter resets. To find the difference between values over time for a gauge, use `delta()`.

The `delta()` function calculates the difference between the first and last value in the specified time window. 

```metricsql
# Calculates how much free memory has changed over the last 30 minutes
# A negative value indicates memory is being consumed
delta(node_memory_MemFree_bytes[30m])
```

Similar to `irate`, the `idelta()` function calculates the difference between the last two data points within the time window, providing an instantaneous view of how a gauge is fluctuating right now.

### Visualizing the Rollup Logic

To understand how these functions process data points within a window (e.g., `[d]`), consider the following plain text diagram representing a counter metric queried at time `T`, looking back over window `d`:

```text
Time Window [d] 
|===================================================| (Query Time: T)
    
Value
 30 |                                            (p5)
    |                                            / 
 20 |                       (p3)               /
    |                       /|               /
 10 |        (p1)         /  |   (p4)      /
    |        /  \       /    |     \     /
  0 |  (p0)/     \(p2)/      |       \ /
____|___+---------+--+-------|--------+-------+-----|___ Time
        t0        t1 t2      t3       t4      t5    T
```

* **Scenario A (PromQL standard behavior):** Prometheus attempts to guess what the values were exactly at the `|` boundaries by drawing an imaginary line outward from `p0` and `p5`.
* **Scenario B (MetricsQL behavior):** VictoriaMetrics strictly evaluates the actual data points within the boundaries. 
    * For `increase([d])`: It sees a rise from `p0` to `p1` (10), a reset at `p2`, a rise from `p2` to `p3` (20), a reset at `p4`, and a rise to `p5` (30). Total increase = `10 + 20 + 30 = 60`.
    * For `rate([d])`: It takes that exact increase (`60`) and divides it by the exact timestamp difference between `p5` and `p0`.
    * For `idelta([d])` or `irate([d])`: It completely ignores `p0` through `p3` and only performs its calculation using the delta and time difference between `p4` and `p5`.

## 8.2 Exclusive MetricsQL Rollup Functions

While compatibility with standard PromQL is a cornerstone of VictoriaMetrics, strictly adhering to Prometheus’s limitations would ignore many real-world operational challenges. To address these, MetricsQL introduces a suite of exclusive rollup functions. These functions drastically simplify queries that would otherwise require complex, multi-layered PromQL statements—or would be entirely impossible to express.

These exclusive functions are particularly powerful for calculating Service Level Objectives (SLOs), analyzing statistical distributions, and tracking the lifespan and behavioral timing of time series.

### SLA and Availability Rollups: `share_le` and `share_gt`

One of the most common requirements in monitoring is determining the percentage of time a system spent in a "healthy" state. In standard PromQL, calculating the percentage of time a metric was below a certain threshold requires nested subqueries, `avg_over_time`, and boolean logic. 

MetricsQL solves this elegantly with the `share_le_over_time` (share less than or equal to) and `share_gt_over_time` (share greater than) functions. These functions look at all data points within a given time window and return a floating-point value between `0.0` and `1.0` representing the ratio of samples that meet the threshold criteria.

```metricsql
# Calculates the percentage of the last hour where CPU usage was greater than 80%
# A result of 0.15 means the CPU was running hot for 15% of the hour.
share_gt_over_time(node_cpu_usage_percent[1h], 80)

# Calculates the percentage of time available memory was less than or equal to 1GB
share_le_over_time(node_memory_MemAvailable_bytes[1h], 1024 * 1024 * 1024)
```

**Visualizing `share_gt_over_time(m[d], 50)`**

```text
Value
100 |       (p2)      (p3)
    |       /  \      /  \
 75 |     /      \  /      \
    |   /          |         \             (4 out of 9 points are > 50)
 50 |===========================\============= Threshold = 50
    | /                        \           
 25 |/                           \       (p9)
    |(p1)                         \      /
  0 |                              (p8)/
____|________________________________|___ Time
   t0                             Time Window [d]
```

### Advanced Statistical Distributions

When analyzing performance metrics like request latency or payload sizes, simple averages (`avg_over_time`) hide outliers, and standard quantiles can be difficult to calculate if the data wasn't explicitly exported as a Prometheus `histogram`.

**`histogram_over_time()`**
If you are scraping a standard gauge that measures latency (e.g., a script that periodically pings a database), you can generate a full histogram dynamically over a time window using `histogram_over_time()`. This function populates VictoriaMetrics-specific log-based histogram buckets on the fly.

```metricsql
# Dynamically generates a histogram from a regular gauge metric over a 24h window.
# This can then be wrapped in histogram_quantile() for precise P99 calculations.
histogram_quantile(0.99, sum(histogram_over_time(db_ping_latency_seconds[24h])) by (vmrange))
```

**`quantiles_over_time()`**
Instead of writing multiple queries to extract the P50, P90, and P99 of a metric, MetricsQL allows you to request multiple quantiles simultaneously. This function returns multiple time series, dynamically appending a `quantile` label to each result.

```metricsql
# Returns three distinct time series per target, tagged with quantile="0.5", "0.9", and "0.99"
quantiles_over_time("0.5", "0.9", "0.99", http_request_duration_seconds[1h])
```

**`distinct_over_time()`**
This function returns the number of *unique* values recorded within the specified time window. It is highly effective for tracking cardinality changes, user concurrency counts, or checking if a categorical metric (like a status code or a software version number) has fluctuated.

```metricsql
# Returns how many different software versions a specific node reported in the last 7 days
distinct_over_time(node_software_version_info[7d])
```

### Temporal Tracking: Timing and Lifespan Functions

Sometimes, the *value* of a metric is less important than *when* that value occurred or how long the metric has existed. 

**`tmax_over_time()` and `tmin_over_time()`**
Instead of returning the maximum or minimum *value* in a window, these functions return the exact **UNIX timestamp** of when that maximum or minimum value occurred. This is incredibly useful for root cause analysis annotations in Grafana.

```metricsql
# Returns the exact timestamp when memory usage hit its highest point today
tmax_over_time(node_memory_usage_bytes[24h])
```

**`lifetime()`**
The `lifetime()` function returns the duration (in seconds) that a specific time series has been continuously receiving data. If a target restarts or a pod is recreated, its lifetime resets to zero.

```metricsql
# Alerts if a Kubernetes pod has been running for less than 60 seconds (indicates crash-looping)
lifetime(kube_pod_status_ready[5m]) < 60
```

**`lag()`**
The `lag()` function computes the time difference in seconds between the current query execution time and the timestamp of the last recorded data point in the window. This is the definitive way to detect stalled data ingestion or broken metric scrapers.

```metricsql
# Returns the number of seconds since the last successful metric was written
lag(vmagent_http_requests_total[5m])
```

By leveraging these exclusive MetricsQL functions, operators can drastically reduce query complexity, execute advanced statistical analysis without specialized metric types, and create highly accurate alerts for system availability and data freshness.

## 8.3 Subqueries and Historical Data Comparisons

As your monitoring needs mature, you will often find that analyzing a single window of data is insufficient. You may need to answer complex questions like, "What was the 95th percentile of our daily peak CPU usage over the last month?" or "How does our current web traffic compare to this exact time last week?" 

MetricsQL handles these requirements through **subqueries** and **time-shifting modifiers**.

### Mastering Subqueries

A standard PromQL/MetricsQL query evaluates a function over a single time window (e.g., `[5m]`). A **subquery** allows you to nest queries, taking the output of an inner query—evaluated at regular intervals over a long period—and feeding it into an outer aggregation function.

The syntax for a subquery adds a resolution step to the lookbehind window: `[<range>:<resolution>]`.

```metricsql
# Calculates the maximum 5-minute request rate observed over the past 24 hours.
# The inner query (rate) is calculated every 1 hour.
max_over_time( rate(http_requests_total[5m])[24h:1h] )
```

#### Visualizing Subquery Execution

To understand how VictoriaMetrics executes the query above, consider the following diagram:

```text
Outer Window: [24h] 
Resolution:   :1h (Evaluate the inner query every 1 hour)

Now-24h                                                     Now
|------------------------------------------------------------|
 t0      t1      t2      t3                           t24
 [+]     [+]     [+]     [+]    ...                   [+]  <-- Inner Query Evaluates

[+] = rate(http_requests_total[5m])
      VictoriaMetrics looks back 5 minutes from t0, calculates the rate, 
      then moves to t1, does it again, repeating 24 times.

Finally, max_over_time() consumes these 24 calculated rate values 
and returns the highest single value.
```

Subqueries are incredibly powerful for SLA/SLO calculations. For example, if you want to know the percentage of days in the last 30 days where your daily error budget was blown:

```metricsql
# Calculates the percentage of the last 30 days where the daily error rate exceeded 1%
share_gt_over_time(
  (
    sum(increase(http_errors_total[1d])) 
    / 
    sum(increase(http_requests_total[1d]))
  )[30d:1d], 
  0.01
)
```

**Performance Warning:** While VictoriaMetrics optimizes subquery execution heavily, deeply nested subqueries over long ranges with high-cardinality data can still consume significant CPU and memory. If a subquery is used in a frequently viewed Grafana dashboard, it is highly recommended to convert the inner query into a **Recording Rule** (covered in Chapter 14).

### Historical Data Comparisons (Time Shifting)

To compare current metrics against historical data, MetricsQL uses the `offset` modifier. This instructs the query engine to evaluate the metric or function as if the current time were shifted back by a specific duration.

```metricsql
# Calculates the current 5-minute rate
rate(http_requests_total[5m])

# Calculates the 5-minute rate as it was exactly one week ago
rate(http_requests_total[5m] offset 1w)
```

#### Creating Day-over-Day or Week-over-Week Ratios

The most common use case for `offset` is creating ratio alerts or comparative dashboard panels. Anomaly detection often relies on comparing today's behavior to the same time last week (to account for natural diurnal and weekly business cycles).

```metricsql
# Calculates the ratio of current traffic to last week's traffic.
# A result of 1.0 means traffic is identical. 
# A result of 1.5 means traffic is 50% higher than last week.
sum(rate(http_requests_total[5m])) 
/ 
sum(rate(http_requests_total[5m] offset 1w))
```

#### Dealing with Missing Data in Comparisons

When doing math between two time series (current vs. offset), both sides must have precisely matching labels. If a pod name or instance ID changed over the last week, the division operator `/` will fail to find a match, resulting in missing data.

To safely compare aggregate infrastructure states, always use `sum by (...)` or `avg by (...)` to strip out ephemeral labels (like `pod` or `instance`) before applying the comparison:

```metricsql
# Safely comparing cluster-wide CPU usage, ignoring individual node replacements
sum by (cluster, region) (rate(node_cpu_seconds_total[5m]))
-
sum by (cluster, region) (rate(node_cpu_seconds_total[5m] offset 1d))
```

### The MetricsQL Advantage: Negative Offsets

Standard Prometheus historically only allowed looking backward in time with `offset`. VictoriaMetrics natively supports **negative offsets**, which shift the evaluation window forward into the future. 

```metricsql
# Looks forward 1 hour (evaluates data 1 hour newer than the query timestamp)
rate(http_requests_total[5m] offset -1h)
```

While you cannot query data that hasn't been ingested yet, negative offsets are exceptionally useful in two specific scenarios:
1. **Backfilling and Recalculating Data:** When using tools like `vmctl` or recording rules to process historical data over a past time range, negative offsets allow you to align leading and trailing indicators.
2. **Predictive Alerting:** When combined with `deriv()` or `predict_linear()`, you can graph forecasted values directly alongside current values by negatively offsetting the prediction to align with the present.

## 8.4 Template Functions and String Manipulation

In enterprise environments, telemetry data is rarely pristine. You will frequently encounter inconsistent label naming, bloated query expressions, and the need to extract substrings from monolithic labels (like pulling an IP address out of an `instance` label). MetricsQL tackles these issues with a robust set of string manipulation tools and introduces `WITH` expressions to keep your code DRY (Don't Repeat Yourself).

### `WITH` Expressions: Templating and Variables

One of the most significant architectural improvements MetricsQL introduces over standard PromQL is the `WITH` expression. Similar to Common Table Expressions (CTEs) in SQL, `WITH` allows you to define query-local templates, variables, and reusable subqueries.

When writing complex Service Level Objective (SLO) alerts or massive Grafana dashboards, repeating the same label selectors or sub-calculations leads to errors and unreadable code. 

```metricsql
# Without WITH: Hard to read, prone to typos
sum(rate(http_errors_total{cluster="prod-us-east", app="payment-gateway"}[5m])) 
/ 
sum(rate(http_requests_total{cluster="prod-us-east", app="payment-gateway"}[5m]))

# With WITH: Clean, modular, and maintainable
WITH (
  # Define a template for common label matchers
  filters = {cluster="prod-us-east", app="payment-gateway"},
  
  # Define query variables
  errors = sum(rate(http_errors_total{filters}[5m])),
  total  = sum(rate(http_requests_total{filters}[5m]))
)
# The final expression
errors / total
```

You can even parameterize `WITH` templates like custom functions, dramatically reducing the cognitive load when sharing queries across teams:

```metricsql
WITH (
  # Define a custom function template that accepts a selector
  error_ratio(selector) = sum(rate(http_errors_total{selector}[5m])) 
                          / 
                          sum(rate(http_requests_total{selector}[5m]))
)
# Call the template for different services
error_ratio({app="frontend"}) > 0.05
```

### Standard String Manipulation Functions

VictoriaMetrics fully supports the standard PromQL string manipulation functions, which rely heavily on regular expressions (regex) to transform labels on the fly.

**`label_replace()`**
This function matches a regex pattern against a source label and writes the capture groups to a destination label. It is essential for metadata extraction.

```metricsql
# Extracts the IP address from a socket string (e.g., "10.0.0.5:8080" -> "10.0.0.5")
# Format: label_replace(vector, "destination_label", "replacement", "source_label", "regex")
label_replace(up, "ip_address", "$1", "instance", "(.*):.*")
```

**`label_join()`**
This function takes multiple source labels and concatenates their values using a specified separator, storing the result in a new label.

```metricsql
# Combines the 'region' and 'zone' labels into a single 'datacenter' label
label_join(kube_pod_info, "datacenter", "-", "region", "zone")
```

### MetricsQL Exclusive Label Manipulations

While `label_replace` is powerful, using regex for simple label operations is computationally expensive and difficult to read. MetricsQL introduces several exclusive functions to handle everyday string manipulation more intuitively.

**Direct Label Operations:**
Instead of hacking `label_replace` to rename or delete labels, MetricsQL provides explicit functions:

* **`label_copy(q, "src", "dst")`**: Duplicates a label's value into a new label.
* **`label_move(q, "src", "dst")`**: Renames a label by copying it to the destination and deleting the source.
* **`label_keep(q, "label1", "label2")`**: Strips all labels from the time series *except* the ones specified.
* **`label_del(q, "label1", "label2")`**: Deletes only the specified labels.

```metricsql
# Clean up a messy metric by renaming 'env' to 'environment' and dropping 'temporary_id'
label_del(
  label_move(http_requests_total, "env", "environment"), 
  "temporary_id"
)
```

**Case Transformation:**
When integrating data from multiple systems (like Kubernetes and legacy VMs), case sensitivity often fragments your data. MetricsQL provides `label_uppercase()` and `label_lowercase()` to normalize string formats.

```metricsql
# Normalizes the 'status' label (e.g., converting "SUCCESS" or "Success" to "success")
label_lowercase(payment_transactions_total, "status")
```

**Comparing Labels with `labels_equal()`:**
A common operational challenge is finding series where two different labels happen to share the same value (e.g., checking if the reported `host` matches the `kubernetes_node`). MetricsQL solves this natively:

```metricsql
# Returns only the time series where the 'host' label is identical to the 'node' label
labels_equal(node_exporter_info, "host", "node")
```

### Preserving Metric Names (`keep_metric_names`)

In standard Prometheus, the moment you apply an arithmetic operation or a function to a metric, the `__name__` label is permanently dropped. Prometheus assumes the mathematical alteration changes the metric's fundamental identity. 

However, when you are simply scaling a value (like converting bytes to megabytes) or applying a smoothing function, you often want to keep the original name to avoid breaking downstream Grafana dashboards or alert annotations. MetricsQL introduces the `keep_metric_names` modifier to bypass this limitation.

```metricsql
# Standard behavior: The output loses the 'node_memory_MemFree_bytes' name
rate(node_memory_MemFree_bytes[5m]) * 1024

# MetricsQL behavior: The metric name is preserved in the output
(rate(node_memory_MemFree_bytes[5m]) * 1024) keep_metric_names
```

By combining `WITH` expressions for modularity and exclusive label manipulation functions for data hygiene, you can build a highly resilient query layer that protects your dashboards from messy, real-world metric ingestion.