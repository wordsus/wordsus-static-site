As your VictoriaMetrics deployment scales, relying on ad-hoc queries for complex dashboards becomes highly inefficient. To build a proactive observability pipeline, you must automate your metric evaluation. This chapter explores `vmalert`, the engine responsible for running continuous queries against your data. We will cover how to implement recording rules to pre-compute heavy aggregations, drastically reducing load times and cluster resource consumption. Additionally, we will dive into crafting precise alerting rules, leveraging Go templates for rich notifications, and managing complex rule dependencies to prevent alert fatigue.

## 14.1 Defining Recording Rules for Query Pre-computation

As your VictoriaMetrics deployment scales and your dashboards become more complex, you will inevitably encounter queries that scan millions of data points across thousands of time series. While VictoriaMetrics is highly optimized for fast query execution, executing heavy aggregations dynamically every time a user loads a Grafana dashboard wastes CPU cycles and memory. This is where **recording rules** become essential.

Recording rules allow you to pre-compute frequently needed or computationally expensive PromQL/MetricsQL expressions. `vmalert` evaluates these expressions at regular intervals and writes the resulting data back into VictoriaMetrics as a completely new, discrete time series.

### The Mechanics of Pre-computation

Instead of calculating an aggregation on the fly, a recording rule shifts the computation burden to the background. 

```text
[ Raw High-Cardinality Data ]
   metric_name{instance="a", handler="/api/v1", status="200"}
   metric_name{instance="b", handler="/api/v1", status="200"}
   metric_name{instance="c", handler="/api/v1", status="500"}
          |
          | (Evaluated by vmalert every 1m)
          v
[ MetricsQL Expression ]
   sum(rate(metric_name[5m])) by (handler)
          |
          | (Result ingested back into vminsert)
          v
[ Pre-computed Low-Cardinality Metric ]
   handler:metric_name:rate5m{handler="/api/v1"}
```

When a user opens a dashboard, Grafana simply queries the pre-computed `handler:metric_name:rate5m` metric. The dashboard loads instantly because the heavy lifting (scanning all instances and calculating the rate) has already been done.

### Anatomy of a Recording Rule

Recording rules are defined in YAML files, identical to the files used for alerting rules. They are organized into `groups`, which allow you to manage evaluation intervals and ensure sequential execution of dependent rules.

Here is a standard configuration for a recording rule:

```yaml
groups:
  - name: node_exporter_recording_rules
    interval: 1m # How often vmalert evaluates the rules in this group
    rules:
      # The name of the new metric being created
      - record: instance:node_cpu_utilisation:rate1m
        # The MetricsQL expression to evaluate
        expr: >
          1 - avg without (cpu, mode) (
            rate(node_cpu_seconds_total{mode="idle"}[1m])
          )
        # Optional: Add static labels to the resulting time series
        labels:
          environment: production
          tier: infrastructure
```

* **`record`**: This strictly defines the name of the new metric that will be saved to VictoriaMetrics.
* **`expr`**: The query to be executed. The result of this query is what gets stored under the `record` metric name.
* **`labels`**: (Optional) Key-value pairs appended to the newly created time series. This is useful for adding metadata that wasn't present in the original data or was stripped away during the `expr` aggregation.

### Naming Conventions

Because recording rules create entirely new metrics, adopting a strict naming convention is critical to prevent namespace pollution and confusion. The Prometheus ecosystem standard, which applies equally to VictoriaMetrics, recommends the following format:

`level:metric:operations`

* **`level`**: The aggregation level and the labels preserved in the output (e.g., `cluster`, `instance`, `namespace`).
* **`metric`**: The core metric name (e.g., `http_requests_total`, `node_cpu_seconds`).
* **`operations`**: A list of operations applied to the metric, from newest to oldest (e.g., `rate5m`, `sum_rate5m`, `avg_over_time1h`).

**Examples of good naming:**
* `namespace:http_requests:rate5m` (A rate of HTTP requests, aggregated by namespace).
* `cluster:node_memory_usage_bytes:sum` (The sum of memory usage across an entire cluster).

### Chaining Recording Rules

Because `vmalert` executes rules within a group sequentially, you can chain recording rules. This means a subsequent rule can query the output of a previous rule within the same group. This is highly efficient for hierarchical aggregations.

```yaml
groups:
  - name: API_SLI_Metrics
    interval: 1m
    rules:
      # Step 1: Pre-calculate the rate per instance
      - record: instance:api_requests_total:rate1m
        expr: rate(api_requests_total[1m])
      
      # Step 2: Use the result of Step 1 to calculate the cluster-wide sum
      # This is much cheaper than running sum(rate(api_requests_total[1m])) directly!
      - record: cluster:api_requests_total:sum_rate1m
        expr: sum without (instance) (instance:api_requests_total:rate1m)
```

### Common Pitfalls and Best Practices

1.  **Watch the Cardinality of the Output:** A recording rule's `expr` should reduce cardinality through aggregation operators (`sum`, `avg`, `max`, etc.). If your expression outputs millions of time series, your recording rule is simply duplicating raw data, which wastes storage and defeats the purpose of pre-computation.
2.  **Align Intervals:** Ensure that the `interval` of the recording rule group aligns sensibly with the time windows inside your `expr`. For instance, running a `[5m]` rate calculation every 10 seconds is computationally wasteful; a 1-minute interval is usually sufficient.
3.  **Handling Stale Data:** If the source metric temporarily drops out, the recording rule will evaluate to an empty result, meaning no data points are written for that interval. When querying recording rules, ensure your dashboard panels handle potential gaps gracefully, or use functions like `keep_last_value` in MetricsQL if continuous lines are required.

## 14.2 Crafting Effective Alerting Rules

While recording rules optimize your queries by running them in the background, alerting rules act as your automated sentries. In the VictoriaMetrics ecosystem, `vmalert` continuously evaluates alerting rules against your time series data. When a defined condition is met and sustained, an alert is triggered and forwarded to an external system (typically Prometheus Alertmanager) for routing, grouping, and notification.

Crafting effective rules is less about writing complex MetricsQL and more about preventing alert fatigue. A poorly tuned rule will wake engineers up at 3:00 AM for transient issues that resolve themselves. 

### The Anatomy of an Alerting Rule

Alerting rules are written in YAML and share the same file structure as recording rules. They exist within evaluation `groups`, but instead of a `record` field, they use an `alert` field.

Here is a standard, production-ready alerting rule:

```yaml
groups:
  - name: API_Availability_Alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        # The MetricsQL expression. It must evaluate to a non-empty result to trigger.
        expr: >
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / 
          sum(rate(http_requests_total[5m])) 
          > 0.05
        # The condition must remain true continuously for this duration.
        for: 5m
        # Key-value pairs used for routing and silencing in Alertmanager.
        labels:
          severity: page
          service: user-api
          team: backend
        # Human-readable information sent in the notification payload.
        annotations:
          summary: "High 5xx error rate on {{ $labels.service }}"
          description: "Error rate is currently {{ $value | humanizePercentage }}."
          runbook_url: "https://docs.internal.com/runbooks/high-error-rate"
```

### The Alert State Lifecycle

To understand how to craft reliable alerts, you must understand how `vmalert` processes the `for` clause. This clause is the primary defense against "flapping" alerts caused by momentary network blips or CPU spikes.

```text
[ State: Inactive ]
         |
         | (expr evaluates to TRUE during a scrape)
         v
[ State: Pending ]  <--- The 'for' timer starts. 
         |               vmalert remembers when the condition began.
         | 
         | (expr remains TRUE for the entire 'for' duration)
         v
[ State: Firing  ]  <--- The alert payload is actively pushed to Alertmanager.
         |
         | (expr evaluates to FALSE)
         v
[ State: Inactive ] <--- Alert resolves.
```

If the expression evaluates to `false` at any point while in the `Pending` state, the timer resets, and the alert reverts to `Inactive`.

### Principles of Effective Alert Design

To build a robust alerting pipeline, adhere to the following principles:

**1. Alert on Symptoms, Not Causes**
A user doesn't care if a specific node is running at 95% CPU; they care if their checkout process is failing or taking 10 seconds to load. 
* **Bad Alert:** CPU on `worker-node-04` > 90%. (The cluster might be handling this perfectly fine via auto-scaling).
* **Good Alert:** API 99th percentile latency > 2 seconds. (Users are actively experiencing slowdowns).
Reserve cause-based alerts for hard limits that require human intervention, such as disk space reaching 95%.

**2. Avoid Static Thresholds Where Possible**
Static thresholds (e.g., `requests > 1000`) often fail as your infrastructure scales or experiences normal cyclical traffic (like higher loads on Black Friday). Instead, use historical comparisons enabled by MetricsQL's `offset` modifier or rate comparisons.

```yaml
      - alert: TrafficDropAnomalous
        expr: >
          # Current 5m rate
          sum(rate(http_requests_total[5m])) 
          < 
          # Compared to the same time last week, minus a 20% tolerance
          (sum(rate(http_requests_total[5m] offset 1w)) * 0.8)
        for: 10m
```

**3. Make Annotations Actionable**
An alert that simply says "Database is down" is stressful and unhelpful. Use Go templating to inject contextual data into the `annotations` block.
* **Include `$labels`**: Identify exactly which instance or cluster is failing.
* **Include `$value`**: Show the engineer exactly what the current metric value is.
* **Include a Runbook URL**: Every alert should have a corresponding document explaining what the alert means, how to verify it, and steps to mitigate it. If an alert doesn't have a runbook, it likely isn't understood well enough to page someone for.

**4. Tune the `for` Clause to the Metric Type**
* **Latency/Errors:** Use a shorter `for` duration (e.g., `2m` or `5m`). You want to know quickly if users are seeing errors.
* **Resource Saturation:** Use a longer `for` duration (e.g., `15m` or `30m`). A CPU spiking to 100% for 3 minutes during a background job is normal; a CPU pinned at 100% for 30 minutes is a runaway process.
* **Capacity Planning:** For disk space, use linear prediction functions like `predict_linear` combined with a long `for` clause to catch disks that will fill up in 24 hours, rather than waiting until they are 99% full.

## 14.3 Using Go Templates in Alert Annotations and Labels

An alert is only as useful as the context it provides to the engineer receiving it. Receiving an alert titled "High CPU Usage" at 3:00 AM leaves the on-call responder scrambling to figure out *which* cluster, *which* node, and *how high* the usage actually is. 

To bridge the gap between a raw MetricsQL evaluation and a human-readable notification, `vmalert` heavily leverages standard Go text templating. This allows you to dynamically inject data from the firing time series directly into your alert `annotations` and `labels`.

### Core Template Variables

When `vmalert` evaluates an alerting rule and transitions it to a firing state, it exposes several context-aware variables to the templating engine. The two most critical are:

* **`$labels`**: A map containing all the labels of the specific time series that triggered the alert. You can access individual labels using dot notation (e.g., `{{ $labels.instance }}`, `{{ $labels.job }}`).
* **`$value`**: A float64 representing the exact numerical result of the MetricsQL expression at the moment the alert fired.

Here is a basic implementation within an alerting rule:

```yaml
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 2m
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "The scrape job {{ $labels.job }} failed to reach {{ $labels.instance }} in the {{ $labels.environment }} environment."
```

### Formatting Raw Values with Built-in Functions

The `$value` variable often returns raw, unformatted float64 numbers with many decimal places (e.g., `0.94532187`). Presenting this directly to users is poor practice. `vmalert` inherits a powerful suite of formatting functions from the Prometheus ecosystem to clean up these numbers.

Functions are applied using the Unix pipeline `|` syntax:

* **`humanize`**: Converts a number to a more readable format with metric prefixes (e.g., `1500000` becomes `1.5M`).
* **`humanize1024`**: Similar to `humanize`, but uses base-1024 (IEC) prefixes, ideal for bytes and memory (e.g., `1048576` becomes `1Mi`).
* **`humanizeDuration`**: Converts a value representing seconds into a readable time format (e.g., `3650` becomes `1h 50s`).
* **`humanizePercentage`**: Multiplies a ratio by 100 and adds a percentage sign (e.g., `0.85` becomes `85%`).
* **`printf`**: Standard Go string formatting for precise control over decimals.

**Example of formatting in action:**

```yaml
      - alert: HighDiskUsage
        expr: >
          node_filesystem_avail_bytes{mountpoint="/"} 
          / 
          node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        annotations:
          description: >
            "Only {{ $value | humanizePercentage }} of free space remains on {{ $labels.instance }}. 
            Current available space: {{ query "node_filesystem_avail_bytes{instance='${labels.instance}'}" | first | value | humanize1024 }}B."
```
*Note the use of the `query` function in the example above, which allows you to execute an entirely separate MetricsQL query within the template to fetch supplementary data.*

### Conditional Logic in Templates

Because this is a full Go templating engine, you can use control structures like `if/else` directly within your YAML strings. This is particularly useful for crafting dynamic runbook URLs or adjusting the message tone based on the severity of the metric.

```yaml
        annotations:
          description: >
            {{ if gt $value 95.0 }}
            CRITICAL INTERVENTION REQUIRED: Database {{ $labels.db_name }} connections are at {{ $value | printf "%.1f" }}%.
            {{ else }}
            WARNING: Database {{ $labels.db_name }} connections are running high at {{ $value | printf "%.1f" }}%.
            {{ end }}
          runbook_url: "https://wiki.internal/runbooks/db/{{ if eq $labels.environment "prod" }}prod-limits{{ else }}general-limits{{ end }}"
```

### Templating Labels Dynamically

While annotations are purely informational, labels dictate how Alertmanager routes, groups, and silences the alert. You can use Go templates to dynamically assign labels based on the metric's values.

However, **exercise extreme caution when templating labels.**

```yaml
        labels:
          # SAFE: Mapping an existing label to a new routing key
          team: "{{ if match "^api-.*" $labels.service }}backend{{ else }}infrastructure{{ end }}"
          
          # DANGEROUS: Do not inject $value into a label!
          # dynamic_value: "{{ $value }}" 
```

If you inject `$value` into a label, every time the metric value fluctuates (even slightly), `vmalert` will treat it as a brand new, distinct time series. This will generate a new alert instance, bypass the `for` duration, flood Alertmanager, and completely break alert grouping. Only template labels using static data derived from `$labels` or boolean conditions that rarely change.

## 14.4 Managing Complex Rule Dependencies

As your observability footprint grows, your recording and alerting rules will inevitably evolve from isolated expressions into a complex Directed Acyclic Graph (DAG). A high-level business dashboard might rely on a cluster-level recording rule, which in turn aggregates data from namespace-level rules, which finally compute rates from raw container metrics. 

Managing these dependencies incorrectly leads to race conditions, missing data points on dashboards, and false-positive alerts. 

### Intra-Group vs. Inter-Group Execution

The most critical concept to grasp when designing rule architectures in `vmalert` is the difference between how rules execute *within* a group versus *across* groups.

**1. Intra-Group Execution (Sequential and Safe)**
Rules defined within the same `group` in your YAML configuration are executed sequentially, top to bottom. `vmalert` guarantees that the output of Rule A is fully evaluated and written to the underlying storage before Rule B is evaluated. This makes it the safest place to define tight dependencies.

**2. Inter-Group Execution (Concurrent and Unpredictable)**
Different `groups` are evaluated concurrently by `vmalert` via a worker pool. If Group 1 contains a base recording rule and Group 2 contains an alerting rule that depends on it, there is no guarantee that Group 1 will finish before Group 2 begins its evaluation loop.

### The Problem of Evaluation Delay (Read-After-Write Lag)

Even if you place dependent rules in the same group, you must account for the distributed nature of VictoriaMetrics. 

When `vmalert` evaluates a rule, it sends the resulting data points to `vminsert`. Those points must then be flushed to disk or reside in the in-memory cache of `vmstorage` before `vmselect` can retrieve them for the next query. This network and storage transit takes milliseconds, but if your subsequent rule executes instantly, it might query `vmselect` *before* the previous rule's data is fully available.

```text
[ Bad Dependency Flow ]
Group A (Executes at T=0)
  Rule 1: node:rate -> Sends to vminsert (Transit time: 50ms)
  Rule 2: cluster:rate -> Queries vmselect for node:rate (Queries at T=5ms)
          Result: Empty! The data from Rule 1 hasn't arrived yet.
```

### Strategies for Robust Dependency Management

To prevent data gaps and race conditions, adopt the following architectural patterns:

#### 1. Consolidate Tight Dependencies
Whenever possible, keep hierarchical aggregations within the exact same rule group. This enforces sequential execution and is easier for human operators to trace.

```yaml
groups:
  - name: Tiered_Aggregations
    interval: 1m
    rules:
      # Base dependency
      - record: job:http_requests:rate1m
        expr: rate(http_requests_total[1m])
      
      # Dependent rule (Safe because it's in the same group)
      - record: namespace:http_requests:sum_rate1m
        expr: sum by (namespace) (job:http_requests:rate1m)
```

#### 2. Utilize the `evaluation_delay` Parameter
If rules *must* be separated into different groups (e.g., because they are managed by different teams or require different intervals), you can use the `evaluation_delay` parameter in `vmalert` (often set at the group level or globally via command-line flags). 

This parameter tells `vmalert` to evaluate the rule as if it were slightly in the past, allowing the underlying storage pipeline time to fully ingest the dependent metrics.

```yaml
groups:
  - name: Global_Alerts
    interval: 1m
    # Waits 30 seconds before evaluating to ensure upstream recording rules
    # from other concurrent groups have successfully populated the storage.
    evaluation_delay: 30s 
    rules:
      - alert: GlobalErrorRateHigh
        expr: global:http_errors:sum_rate1m > 1000
```

#### 3. Defensive PromQL/MetricsQL Structuring
When writing an alert that depends on a potentially lagged recording rule, you can structure your query to be tolerant of slight delays. Instead of checking the absolute instantaneous value (which might be missing due to ingestion lag), use a short lookback window.

* **Fragile:** `global:http_errors:sum_rate1m > 100` (Fails if the last scrape is 1 second late).
* **Robust:** `max_over_time(global:http_errors:sum_rate1m[2m]) > 100` (Succeeds as long as the threshold was breached at least once in the last two minutes).

### Documenting and Visualizing the Rule Chain

As your dependencies grow into the hundreds, YAML files become difficult to read. It is a best practice to enforce documentation standards for heavily depended-upon metrics.

```yaml
      # DEFINITION: job:http_requests:rate1m
      # OWNER: Telemetry Team
      # DEPENDENTS: 
      #   - Group: API_Alerts -> Alert: HighErrorRate
      #   - Group: Global_Aggs -> Record: global:http_requests:sum_rate
      - record: job:http_requests:rate1m
        expr: rate(http_requests_total[1m])
```

Additionally, leverage the built-in `vmalert` Web UI (accessible via the port `vmalert` runs on). The UI provides a dedicated "Groups" and "Rules" page where you can inspect the exact execution duration of each rule. If a dependent rule is consistently failing or evaluating to zero, the UI will highlight execution bottlenecks or `vmselect` timeout errors, allowing you to quickly identify if a dependency chain has been broken.