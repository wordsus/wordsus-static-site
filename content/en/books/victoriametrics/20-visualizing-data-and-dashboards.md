Data is only as valuable as your ability to interpret it. Once VictoriaMetrics is reliably ingesting and storing your telemetry, the next critical step is making that data actionable. This chapter bridges the gap between raw time-series storage and operational observability. Because VictoriaMetrics acts as a flawless drop-in replacement for Prometheus, it integrates natively with industry-standard tools like Grafana. We will explore how to connect these systems, design high-performance dashboards that handle massive cardinality, configure Grafana alerting, and leverage the built-in VMUI for rapid, ad-hoc query debugging.

## 20.1 Adding VictoriaMetrics as a Prometheus Data Source in Grafana

Because VictoriaMetrics provides full compatibility with the Prometheus querying API, Grafana natively supports it without requiring any third-party plugins. To Grafana, a VictoriaMetrics instance acts exactly like a highly performant Prometheus backend. 

The primary difference when configuring VictoriaMetrics in Grafana lies in how you define the connection URL, which varies depending on whether you are running a single-node deployment or a cluster deployment with multi-tenancy.

### Understanding the Connection URLs

Before navigating the Grafana interface, you must determine the correct HTTP URL for your deployment type. 

#### Single-Node Deployments
For a single-node VictoriaMetrics instance, the Prometheus API is exposed on port `8428` by default. The URL must include the `/prometheus` suffix to direct Grafana to the correct API handlers.

```text
http://<victoriametrics-host>:8428/prometheus
```

#### Cluster Deployments
In a clustered architecture (as discussed in Part VI), Grafana does not query the storage nodes directly. Instead, it queries the `vmselect` component. Furthermore, because the cluster natively supports multi-tenancy, you must specify the `AccountID` (and optionally the `ProjectID`) in the URL path. 

The default port for `vmselect` is `8481`. The URL structure is:

```text
http://<vmselect-host>:8481/select/<accountID>/prometheus
```
*(For example, to query the default tenant `0`, you would use `http://<vmselect-host>:8481/select/0/prometheus`)*

```text
+-----------------------------------------------------------------------------------+
|                            Grafana Data Source Routing                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                              [ Grafana Dashboard ]                                |
|                                        |                                          |
|                         (Prometheus Data Source Plugin)                           |
|                                        |                                          |
+----------------------------------------+------------------------------------------+
                 |                                                |
        [ Single-Node Path ]                              [ Cluster Path ]
                 |                                                |
                 v                                                v
  URL: http://host:8428/prometheus      URL: http://host:8481/select/0/prometheus
                 |                                                |
                 v                                                v
    +-------------------------+                     +---------------------------+
    | VictoriaMetrics (Single)|                     |     vmselect (Cluster)    |
    +-------------------------+                     +---------------------------+
                                                                  |
                                                                  v
                                                    +---------------------------+
                                                    |    vmstorage (Cluster)    |
                                                    +---------------------------+
```

### Step-by-Step Configuration in Grafana

Once you have identified the correct URL for your environment, follow these steps to add the data source:

1. **Navigate to Data Sources:** In the left-hand Grafana menu, hover over the **Connections** (or **Configuration** gear icon, depending on your Grafana version) and click on **Data Sources**.
2. **Add a new source:** Click the blue **Add data source** button.
3. **Select Prometheus:** Choose **Prometheus** from the list of available time series databases. 
4. **Configure the HTTP settings:**
   * **URL:** Enter the appropriate Single-Node or Cluster URL determined above.
   * **Access:** Leave this as **Server (default)**. This ensures Grafana's backend proxies the requests, preventing Cross-Origin Resource Sharing (CORS) issues and keeping your database credentials hidden from the client's browser.
5. **Adjust the HTTP Method (Crucial for VictoriaMetrics):**
   * Scroll down to the **HTTP Method** dropdown and change it from `GET` to **`POST`**.
   * *Why this matters:* While VictoriaMetrics supports both, `POST` is highly recommended. Heavy MetricsQL queries or dashboards with massive amounts of label matchers can easily exceed the maximum URL length limits of standard HTTP `GET` requests. Using `POST` places the query payload in the request body, safely bypassing these limits.
6. **Save and Test:** Scroll to the bottom and click **Save & test**. You should see a green notification stating "Data source is working."

### Advanced Configuration Parameters

While the basic setup will get your dashboards running, there are a few VictoriaMetrics-specific adjustments you should consider in the Grafana data source settings:

* **Custom HTTP Headers:** If you are securing your VictoriaMetrics endpoints using `vmauth` (covered later in Chapter 22), you can inject `Authorization: Bearer <token>` directly into the **Custom HTTP Headers** section. 
* **Scrape Interval:** Under the **Prometheus type** settings, adjust the **Scrape interval** to match your `vmagent` configuration (typically `15s` or `30s`). This helps Grafana's `rate()` and `increase()` functions calculate appropriate step intervals automatically.
* **Query Timeout:** VictoriaMetrics is exceptionally fast, but if you are querying months of high-cardinality data simultaneously, you may hit Grafana's default HTTP timeouts. If you experience timeout errors on massive analytical queries, increase the **Timeout** field under the HTTP settings (e.g., to `60s`).

## 20.2 Building Highly Effective Dashboards

Because VictoriaMetrics is seamlessly compatible with the Prometheus API, building dashboards in Grafana follows the same foundational principles you would use for a standard Prometheus backend. However, because VictoriaMetrics often ingests significantly higher volumes of data and retains it for longer periods, dashboard design must balance analytical depth with browser rendering performance.

A highly effective dashboard is not just a collection of charts; it is a structured, interactive narrative that guides an operator from high-level system health down to granular, root-cause analysis.

### Structuring for Top-Down Troubleshooting

When designing a dashboard, arrange the visual hierarchy to reflect the troubleshooting workflow. The most critical, aggregated information should live at the top, with detailed, component-level metrics placed further down.

```text
+-----------------------------------------------------------------------+
|  Global Variables:  [ Environment ]  [ Datacenter ]  [ Service ]      |
+=======================================================================+
| ▼ Row: System Health & Golden Signals (At-a-Glance)                   |
|  +----------------+  +----------------+  +-------------------------+  |
|  |  Requests/sec  |  |   Error Rate   |  | P99 Latency (Stat Panel)|  |
|  |  (Stat Panel)  |  |  (Stat Panel)  |  |                         |  |
|  +----------------+  +----------------+  +-------------------------+  |
+-----------------------------------------------------------------------+
| ▼ Row: Traffic & Application Metrics (Trends over time)               |
|  +----------------------------------+ +----------------------------+  |
|  |  HTTP Requests by Route (Graph)  | |  Error Rates by Code       |  |
|  +----------------------------------+ +----------------------------+  |
+-----------------------------------------------------------------------+
| ▼ Row: Infrastructure Utilization (Granular Details)                  |
|  +----------------------------------+ +----------------------------+  |
|  |   CPU Usage per Node (Graph)     | |  Memory Saturation         |  |
|  +----------------------------------+ +----------------------------+  |
+-----------------------------------------------------------------------+
```

### Designing for Reusability with Variables

Hardcoding labels (like `instance="web-01"`) inside panel queries leads to dashboard sprawl. Instead, leverage Grafana variables to create dynamic dashboards that can adapt to different environments or nodes on the fly.

Because VictoriaMetrics speaks PromQL, you define variables using standard querying functions in the **Variables** settings:

* **To list all available values for a specific label:**
    ```promql
    label_values(env)
    ```
* **To dynamically chain variables (e.g., find instances only in the selected environment):**
    ```promql
    label_values(up{env="$env"}, instance)
    ```

When writing your panel queries, replace the hardcoded strings with your variables:
```promql
rate(http_requests_total{env="$env", instance=~"$instance"}[$__rate_interval])
```
*Note: Using the `=~` (regex match) operator alongside multi-value variables allows users to select "All" instances at once.*

### Optimizing Queries with `$__rate_interval`

One of the most common mistakes when building dashboards is hardcoding the time window for rate functions (e.g., `rate(metric[5m])`). If the user zooms out to view a year's worth of data, calculating 5-minute rates for thousands of pixels becomes computationally expensive and visually misleading. If they zoom in to a 15-minute window, a 5-minute rate is too coarse.

Always use Grafana's built-in `$__rate_interval` variable when working with `rate()`, `irate()`, or `increase()` functions:

```promql
sum by (status) (rate(http_requests_total{service="payment-gateway"}[$__rate_interval]))
```

The `$__rate_interval` variable dynamically adjusts the lookback window based on the dashboard's current time range and the panel's width, ensuring it is always at least four times the scrape interval. This guarantees accurate rate calculations without missing data points or over-smoothing spikes.

### Leveraging MetricsQL for Simpler Dashboards

While you can write standard PromQL, utilizing VictoriaMetrics' custom MetricsQL (covered in Chapters 7 and 8) can drastically simplify dashboard queries. 

For instance, if you want to display the percentage of errors, standard PromQL requires a complex division of two queries. With MetricsQL, you can use the implicit grouping and simpler syntax to clean up your panel queries:

**Standard PromQL:**
```promql
sum(rate(http_requests_total{status=~"5.."}[$__rate_interval])) 
/ 
sum(rate(http_requests_total[$__rate_interval])) 
* 100
```

**MetricsQL Equivalent:**
```promql
sum(rate(http_requests_total{status=~"5.."})) 
/ 
sum(rate(http_requests_total)) 
* 100
```
*(MetricsQL automatically applies the step interval to `rate()` if the lookback window is omitted).*

### Managing High-Cardinality Render Limits

VictoriaMetrics is capable of returning thousands of time series in milliseconds. However, rendering 5,000 distinct lines on a single Grafana time series panel will freeze the user's browser. 

To protect the dashboard experience:
1.  **Enforce Top-K Queries:** Use aggregation operators to limit the visual output to the most significant series. For example, to only show the top 10 instances by CPU usage:
    ```promql
    topk(10, sum by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[$__rate_interval])))
    ```
2.  **Use "Max Data Points":** In the panel's **Query options**, verify that **Max data points** is set (usually leaving it blank defaults to the pixel width of the panel). This forces VictoriaMetrics to downsample the visual representation before sending it over the network, drastically reducing the JSON payload size.
3.  **Rely on Recording Rules:** If a dashboard panel aggregates thousands of series across long time ranges (e.g., calculating global SLIs over 30 days), do not compute this on the fly. Instead, use `vmalert` to create a Recording Rule (Chapter 14) that pre-computes this metric, and simply query the resulting aggregate metric in Grafana.

## 20.3 Exploring Data with VMUI (Built-in Web Interface)

While Grafana is the undisputed industry standard for building persistent, complex dashboards, VictoriaMetrics ships with its own lightweight, built-in web interface known as **VMUI**. 

VMUI requires absolutely zero configuration, external databases, or user management setups. It is embedded directly within the VictoriaMetrics binary, making it an indispensable tool for ad-hoc querying, rapid debugging, query optimization, and administrative cardinality analysis.

### Accessing VMUI

Because VMUI is served directly by the VictoriaMetrics API, the access URL mirrors the PromQL endpoints discussed in Chapter 20.1, simply replacing `/prometheus` with `/vmui/`.

* **Single-Node Deployment:**
    ```text
    http://<victoriametrics-host>:8428/vmui/
    ```
* **Cluster Deployment:**
    ```text
    http://<vmselect-host>:8481/select/<accountID>/vmui/
    ```

### Core Analytical Features

When you load VMUI, you are presented with a clean, functional interface. Beyond simply graphing data, it offers several specialized tabs designed specifically for database administrators and power users.

#### 1. The Query Interface (Custom and Graph Views)
The default view provides a powerful PromQL/MetricsQL editor with syntax highlighting and intelligent autocomplete for both metric names and labels. 

Unlike Grafana, which defaults to graphical panels, VMUI allows you to seamlessly toggle between raw data formats and visualizations:
* **Graph:** Renders standard time-series charts using lightweight WebGL components, easily capable of plotting thousands of points without hanging your browser.
* **Table:** Displays the exact, raw data points at a given timestamp. This is critical when you need to verify if missing data on a Grafana chart is an artifact of the step interval or an actual gap in the storage layer.
* **JSON:** Outputs the raw API response from VictoriaMetrics, which is highly useful when writing automation scripts or building custom API integrations.

#### 2. Query Tracing for Performance Debugging
One of the most powerful features of VMUI is the built-in **Query Tracer**. By toggling the `Trace query` switch before executing a search, VictoriaMetrics will append a detailed execution tree to the response. 

If a specific Grafana dashboard is loading slowly, pasting the underlying query into VMUI with tracing enabled allows you to instantly identify the bottleneck.

```text
+-------------------------------------------------------------------------+
| VMUI Query Trace Summary                                                |
| Query: sum by (job) (rate(http_requests_total[5m]))                     |
| Total Execution Time: 87ms                                              |
+=========================================================================+
| [   1ms ] ├── Parse query into Abstract Syntax Tree (AST)               |
| [  12ms ] ├── Search Inverted Index (resolve label matchers to TSIDs)   |
| [  68ms ] ├── Fetch Data Blocks (Storage Layer)                         |
|           │    ├── Read blocks from memory cache: 8ms                   |
|           │    └── Read compressed blocks from disk: 60ms               |
| [   6ms ] └── Execute Aggregation (sum and rate calculation)            |
+-------------------------------------------------------------------------+
```
*If the "Search Inverted Index" phase takes an unusually long time, it is an indicator that your query's label matchers are too broad and require optimization.*

#### 3. The Cardinality Explorer
As discussed in Chapter 9, high cardinality (an explosion of unique label combinations) is the primary cause of out-of-memory (OOM) crashes in any time-series database. VMUI includes a dedicated **Cardinality** tab to proactively manage this.

The Cardinality Explorer allows you to visually identify the heaviest metrics in your database without writing complex administrative API queries. It provides top-10 lists across multiple dimensions:

* **Metrics with the most series:** Identifies metric names that contain the highest number of unique label variations.
* **Labels with the most values:** Highlights runaway labels (e.g., if a developer accidentally maps a highly variable user ID or session token to a Prometheus label).
* **High Churn Rate series:** Shows metrics where old time series are constantly dying and new ones are being created, which heavily taxes the inverted index.

#### 4. Top Queries Analysis
In a busy environment, it can be difficult to tell which users or dashboards are placing the heaviest load on the database. The **Top Queries** tab in VMUI tracks and aggregates the most resource-intensive queries executed against the node over the last few minutes.

You can sort this view by:
* **Duration:** Which queries take the longest to execute.
* **Frequency:** Which queries are executed most often (useful for identifying aggressive alerting rules).
* **Series Fetched:** Which queries are scanning the largest amount of raw data. 

By utilizing VMUI alongside Grafana, operators maintain a clear separation of concerns: Grafana is used to visualize the health of the infrastructure, while VMUI is used to visualize and troubleshoot the health of VictoriaMetrics itself.

## 20.4 Setting up Grafana Alerting with a VictoriaMetrics Backend

While Part V of this book dedicated several chapters to `vmalert`—VictoriaMetrics' native, highly optimized alerting engine—many organizations prefer to manage their alerts directly within Grafana. Grafana’s Unified Alerting system provides a rich, visual interface for rule creation and, crucially, allows users to build composite alerts that evaluate VictoriaMetrics data alongside other disparate data sources (such as SQL databases, Elasticsearch, or Loki).

Because VictoriaMetrics acts as a drop-in replacement for Prometheus, Grafana Alerting natively supports it. However, understanding how Grafana evaluates these rules against the VictoriaMetrics backend is essential for performance and reliability.

### Architectural Differences: Grafana Alerting vs. `vmalert`

When deciding whether to use Grafana Alerting or `vmalert`, it is important to understand where the computational load resides. 

```text
+-------------------------------------------------------------------------+
|                  Alert Evaluation Architecture Comparison               |
+-------------------------------------------------------------------------+
|                                                                         |
|     NATIVE APPROACH (vmalert)             GRAFANA UNIFIED ALERTING      |
|                                                                         |
|    [ vmalert ] evaluates rules           [ Grafana ] evaluates rules    |
|         |                                     |                         |
|         | (Sends MetricsQL query)             | (Sends MetricsQL query) |
|         v                                     v                         |
|  [ VictoriaMetrics ]                   [ VictoriaMetrics ]              |
|         |                                     |                         |
|         | (Returns evaluated state)           | (Returns raw vector)    |
|         v                                     |                         |
|    [ Alertmanager ]                           |                         |
|         | (Routes & Deduplicates)             v                         |
|         v                                [ Grafana Alert Engine ]       |
|    [ PagerDuty / Slack ]                      | (Applies Math/Reduce)   |
|                                               v                         |
|                                          [ Contact Points ]             |
+-------------------------------------------------------------------------+
```

With `vmalert`, the rules are executed entirely at the database layer. With Grafana Alerting, Grafana's backend fetches the raw time-series vector from VictoriaMetrics and executes the threshold logic within its own memory space. For high-cardinality data, this can severely strain the Grafana server.

### Creating a Multi-Dimensional Alert

To build an alert using your VictoriaMetrics data source in Grafana, navigate to the **Alerting** > **Alert rules** menu and click **New alert rule**.

Grafana uses a modular pipeline to define alert conditions. For a VictoriaMetrics backend, this pipeline typically consists of three stages:

1. **Stage A (The Query):** 
   Select your VictoriaMetrics data source. Write the MetricsQL query that fetches the necessary data. For example, to monitor CPU usage across all nodes:
   ```promql
   100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```
   *Note: Unlike dashboard panels, you cannot use `$__rate_interval` in backend alerting queries. You must hardcode the lookback window (e.g., `[5m]`).*

2. **Stage B (The Reduce Expression):**
   Grafana requires time-series data to be reduced to a single value per series before evaluating a threshold. Add a **Reduce** expression pointing to Stage A.
   * **Function:** Select `Last` to evaluate the most recent data point, or `Mean` to average the results over the query window and prevent temporary spikes from triggering false alarms.
   * **Input:** `A`

3. **Stage C (The Math Expression):**
   Add a **Math** expression to define the trigger threshold. This expression applies to every individual series returned by the reduction stage, creating a multi-dimensional alert (e.g., alerting individually for each `instance`).
   * **Expression:** `$B > 85` (Alert if the CPU usage is greater than 85%).
   * Set this stage as the **Alert condition**.

### Handling "No Data" and Timeouts

When querying VictoriaMetrics for alerting, network blips or sudden drops in target scraping can result in empty query responses. 

Under the **Evaluate behavior** section of the rule configuration, you must define how Grafana interprets missing data:
* **Alerting:** Best for critical availability metrics (e.g., `up == 0`). If VictoriaMetrics returns no data, Grafana assumes the worst and fires the alert.
* **No Data:** Best for metrics that only exist when an event occurs (e.g., error counters). If a service stops throwing 500 errors, the metric might vanish. The alert should resolve, not fire.
* **Keep Last State:** Useful for flaky network connections where intermittent scrape failures are common. 

If your MetricsQL query spans a long time range or processes thousands of series, VictoriaMetrics might take a few seconds to respond. If this exceeds Grafana's internal timeout, the alert rule will fail with an error. To mitigate this, ensure the `query_timeout` parameter in the VictoriaMetrics data source settings (discussed in Chapter 20.1) is set high enough (e.g., `30s` to `60s`) to accommodate complex alert evaluations.

### Best Practice: The Hybrid Approach

If you love Grafana's visual notification routing but suffer from performance issues due to heavy alert queries, the optimal enterprise strategy is a hybrid approach.

Instead of writing complex, computationally expensive aggregation queries directly in Grafana, use `vmalert` (Chapter 14) to create a **Recording Rule**. `vmalert` will continuously calculate the complex aggregate in the background and write it back into VictoriaMetrics as a brand-new, highly efficient time series. 

You can then configure Grafana Alerting to run a simple, lightweight query against that pre-computed metric. This offloads the heavy lifting to VictoriaMetrics' optimized storage engine while preserving Grafana's centralized alerting workflows.