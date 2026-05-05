In previous chapters, we explored how VictoriaMetrics ingests, stores, and queries massive volumes of time-series data. However, passive data storage is only half of the observability equation. To proactively monitor systems and respond to anomalies, you need a robust alerting pipeline.

This chapter introduces `vmalert`, the lightweight, standalone daemon responsible for evaluating PromQL and MetricsQL expressions in the VictoriaMetrics ecosystem. We will cover its stateless architecture, how to connect it to your storage and query nodes, the syntax for writing alerting and recording rules, and best practices for validating rules locally.

## 13.1 Architecture and Purpose of `vmalert`

In the standard Prometheus architecture, the tasks of collecting data, storing it, executing queries, and evaluating alerting rules are all tightly coupled within a single monolithic binary. While this simplifies initial setups, it can become a bottleneck at scale. VictoriaMetrics adheres to a philosophy of modularity and separation of concerns. In this ecosystem, the responsibility of evaluating rules and triggering alerts is delegated to a dedicated, lightweight component: `vmalert`.

### The Purpose of `vmalert`

`vmalert` is a standalone daemon designed to execute PromQL and MetricsQL expressions continuously against a VictoriaMetrics backend. It serves two primary functions:

1.  **Evaluating Alerting Rules:** `vmalert` periodically runs queries defined in alert rules to check for specific conditions (e.g., high CPU usage, application errors). When a query returns a result that breaches a defined threshold for a specified duration, `vmalert` fires an alert and pushes it to an external notification system, almost exclusively Prometheus Alertmanager.
2.  **Evaluating Recording Rules:** To optimize dashboards and heavily used queries, `vmalert` can pre-compute complex, resource-intensive expressions (such as aggregations over high-cardinality data) and write the resulting data back into VictoriaMetrics as a brand new, fully materialized time series.

By extracting these evaluation loops from the database layer, VictoriaMetrics ensures that heavy alerting queries do not directly compete for CPU and memory resources with active data ingestion (`vminsert`) or ad-hoc user dashboard queries (`vmselect`).

### Architectural Overview

The most critical architectural characteristic of `vmalert` is that it is completely **stateless**. It does not maintain a local time-series database, nor does it persist historical state on disk. All state regarding alert history, metrics, and rule evaluations is read from and written to the underlying VictoriaMetrics storage.

This stateless design dictates how `vmalert` interacts with the rest of the infrastructure:

```text
  +--------------------+                                
  | Alert/Record Rules |                                
  | (*.yaml, *.yml)    |                                
  +--------------------+                                
            | (Loads rules on startup/reload)           
            v                                           
+------------------------------------------------------+
|                       vmalert                        |
|                                                      |
|  [ Rule Parser ] -> [ Scheduler ] -> [ Evaluator ]   |
+------------------------------------------------------+
            |               |                 |          
      (1)   |         (2)   |           (3)   |          
  Querying  |       Writing |        Alerting |          
            v               v                 v          
  +-----------------+ +-----------------+ +-----------------+
  | VictoriaMetrics | | VictoriaMetrics | |  Alertmanager   |
  | (Read Endpoint) | | (Write Endpoint)| |                 |
  | e.g., vmselect  | | e.g., vminsert  | |                 |
  +-----------------+ +-----------------+ +-----------------+
```

#### The Data Flow

1.  **The Read Path (`-datasource.url`):** `vmalert` reads its configuration from standard Prometheus-compatible YAML rule files. Based on the evaluation interval (typically 15 to 60 seconds), its internal scheduler dispatches PromQL/MetricsQL queries to the VictoriaMetrics read endpoint. In a single-node setup, this is the main VictoriaMetrics process; in a cluster, this is the `vmselect` component.
2.  **The Write Path (`-remoteWrite.url`):** When `vmalert` evaluates a recording rule, it generates new time-series data. Furthermore, `vmalert` can be configured to write the state of alerts (e.g., `ALERTS` and `ALERTS_FOR_STATE` metrics) back to the database. It sends this generated data via the Prometheus `remote_write` protocol to the VictoriaMetrics write endpoint (single-node or `vminsert` in a cluster).
3.  **The Notification Path (`-notifier.url`):** When an alerting rule evaluates to true and satisfies its `for` duration, `vmalert` transitions the alert to a firing state. It then formats a payload containing the alert's labels and annotations and POSTs it to the configured Alertmanager instance, which handles grouping, deduplication, routing, and sending the final notifications to Slack, PagerDuty, Email, etc.

### High Availability and Scaling

Because `vmalert` is stateless, achieving High Availability (HA) is straightforward: you run multiple identical instances of `vmalert` pointing to the same rule files and the same VictoriaMetrics backend. 

There is no complex gossip protocol or cluster state sharing between `vmalert` replicas. Instead, VictoriaMetrics relies on downstream systems to handle deduplication:
* **Alert Deduplication:** Both `vmalert` replicas will evaluate the rules and send identical alerts to Alertmanager at roughly the same time. Alertmanager is natively designed to deduplicate incoming alerts with identical label sets.
* **Recording Rule Deduplication:** Both replicas will write the exact same pre-computed metrics back to VictoriaMetrics. VictoriaMetrics natively handles deduplication of identical data points (assuming standard deduplication settings are configured on the storage side, which will be covered in Chapter 11).

This architectural simplicity ensures that your alerting pipeline remains robust, easily scalable, and highly resilient to individual component failures without introducing operational complexity.

## 13.2 Connecting `vmalert` to Storage and Query Nodes

Because `vmalert` is entirely stateless, its ability to function depends entirely on how it is connected to the rest of your observability stack. It needs to know where to fetch metric data to evaluate rules, where to write the results of recording rules or alert states, and where to send the actual alert notifications. 

These connections are established using a set of highly specific command-line flags. Understanding how to configure these flags—and how they differ between VictoriaMetrics Single-Node and Cluster editions—is critical for a stable alerting pipeline.

### The Core Connection Flags

`vmalert` relies on three primary connection pathways, with a fourth optional (but highly recommended) pathway for state restoration:

1.  **`-datasource.url` (The Query Node):** This is the endpoint `vmalert` queries to evaluate your PromQL/MetricsQL expressions. 
2.  **`-remoteWrite.url` (The Storage Node):** If you are using recording rules, or if you want `vmalert` to persist the `ALERTS` time series (which tracks the state of active alerts), it sends this data via the Prometheus remote write protocol to this endpoint.
3.  **`-notifier.url` (The Alertmanager):** When an alert condition is met, the resulting payload is sent to this endpoint. You can specify this flag multiple times if you have a highly available Alertmanager cluster.
4.  **`-remoteRead.url` (State Restoration):** When `vmalert` restarts, it loses its internal memory of which alerts were currently pending or firing. By pointing this flag to your query node, `vmalert` can query the `ALERTS` metric on startup to instantly restore its state, preventing alert flapping or duplicate notifications.

```text
                           +-----------------------------------+
                           |                                   |
                           |             vmalert               |
                           |                                   |
                           +-----------------------------------+
                             |               |               |
         -datasource.url     |               |               | -notifier.url
         -remoteRead.url     |               |               |
                             v               |               v
+-----------------------------------+        |      +-------------------+
|       Query Node (Read)           |        |      |   Alertmanager    |
| (Single-Node or vmselect)         |        |      |                   |
+-----------------------------------+        |      +-------------------+
                                             |
                                             | -remoteWrite.url
                                             v
                            +-----------------------------------+
                            |      Storage Node (Write)         |
                            |  (Single-Node or vminsert)        |
                            +-----------------------------------+
```

### Scenario A: Connecting to VictoriaMetrics Single-Node

In a single-node deployment, reading and writing are handled by the same binary, typically exposed on port `8428`. However, the URL paths required for PromQL queries and remote write ingestion differ slightly.

Here is how you would configure `vmalert` to connect to a single-node instance running at `http://victoria-metrics:8428`:

```bash
./vmalert \
  -rule="/etc/vmalert/rules/*.yaml" \
  -datasource.url="http://victoria-metrics:8428" \
  -remoteRead.url="http://victoria-metrics:8428" \
  -remoteWrite.url="http://victoria-metrics:8428/api/v1/write" \
  -notifier.url="http://alertmanager:9093"
```

*Notice the `-remoteWrite.url` path.* While the datasource can often be pointed just at the root URL (as `vmalert` automatically appends the necessary `/api/v1/query` paths), the remote write endpoint requires the specific `/api/v1/write` path to function correctly.

### Scenario B: Connecting to VictoriaMetrics Cluster

Connecting `vmalert` to a VictoriaMetrics Cluster introduces two new complexities: separate components (`vmselect` for reading, `vminsert` for writing) and Multi-Tenancy.

In the cluster version, every read and write request must specify a `AccountID` (and optionally a `ProjectID`). If you are running a simple cluster setup without explicit multi-tenancy, you typically use the default tenant ID of `0`.

Assuming `vmselect` is on port `8481` and `vminsert` is on port `8480`:

```bash
./vmalert \
  -rule="/etc/vmalert/rules/*.yaml" \
  -datasource.url="http://vmselect:8481/select/0/prometheus" \
  -remoteRead.url="http://vmselect:8481/select/0/prometheus" \
  -remoteWrite.url="http://vminsert:8480/insert/0/prometheus/api/v1/write" \
  -notifier.url="http://alertmanager:9093"
```

#### Breaking down the Cluster URLs:
* **Querying (`vmselect`):** The URL `http://vmselect:8481/select/0/prometheus` tells `vmalert` to hit the select component, query data for tenant `0`, and expect a Prometheus-compatible API.
* **Writing (`vminsert`):** The URL `http://vminsert:8480/insert/0/prometheus/api/v1/write` tells `vmalert` to hit the insert component, write data to tenant `0`, using the standard Prometheus remote write path.

### Handling Authentication and Security

If your VictoriaMetrics endpoints are secured (e.g., placed behind `vmauth` or a standard reverse proxy like NGINX), `vmalert` supports various authentication methods.

For Basic Authentication, you can pass credentials directly in the URL (e.g., `http://user:password@vmselect:8481/...`) or use the dedicated CLI flags for a more secure approach (especially when passing secrets via environment variables in Kubernetes or Docker):

```bash
./vmalert \
  ...
  -datasource.basicAuth.username="admin" \
  -datasource.basicAuth.password="supersecret" \
  -remoteWrite.basicAuth.username="admin" \
  -remoteWrite.basicAuth.password="supersecret"
```

Similarly, if you are securing traffic via TLS, `vmalert` provides flags like `-datasource.tlsInsecureSkipVerify` (for self-signed certificates in dev environments) or `-datasource.tlsCAFile` to specify a custom Certificate Authority. Ensure that both the read and write pathways are appropriately secured according to your organization's network policies.

## 13.3 Understanding the Rule File YAML Syntax

One of the most significant advantages of adopting `vmalert` is its strict compatibility with the Prometheus alerting and recording rule format. If you are migrating from an existing Prometheus setup, you can typically lift and shift your existing `*.yaml` rule files directly to `vmalert` without any modifications.

At its core, the YAML configuration is organized into a hierarchy: **Groups** contain multiple **Rules**, and Rules can be either **Alerting Rules** or **Recording Rules**.

### The Anatomy of a Rule Group

Rules are never evaluated in isolation; they must belong to a `group`. The group level defines the execution context for all the rules nested within it. 

Here are the key parameters available at the group level:

* **`name`** *(string, required)*: A unique identifier for the group.
* **`interval`** *(duration, optional)*: How often the rules in this group should be evaluated. If omitted, `vmalert` defaults to the global `-evaluationInterval` flag.
* **`concurrency`** *(integer, optional)*: A VictoriaMetrics-specific extension. It defines how many rules within the group can be evaluated concurrently. By default, rules in a group execute sequentially.
* **`tenant`** *(string, optional)*: Another VictoriaMetrics-specific extension. In a cluster setup, this forces all queries within the group to execute against a specific `AccountID:ProjectID` (e.g., `tenant: "123:456"`).

### Defining Alerting Rules

An alerting rule determines whether a specific condition is met and, if so, triggers an alert. 

* **`alert`** *(string, required)*: The name of the alert (e.g., `HighCPUUsage`).
* **`expr`** *(string, required)*: The PromQL or MetricsQL expression to evaluate. The alert will fire for every time series returned by this query.
* **`for`** *(duration, optional)*: The "patience" threshold. The `expr` must evaluate to true continuously for this duration before the alert transitions from `pending` to `firing`.
* **`labels`** *(map, optional)*: Static or templated labels to attach to the alert. This is highly useful for routing in Alertmanager (e.g., `severity: critical`, `team: backend`).
* **`annotations`** *(map, optional)*: Informational labels used to store longer, human-readable text like summaries, descriptions, or runbook URLs. These support Go templating to inject dynamic values from the query results.

### Defining Recording Rules

A recording rule evaluates a computationally expensive expression and saves the result as a new, pre-aggregated time series.

* **`record`** *(string, required)*: The name of the new metric being created. By convention, this is often formatted as `level:metric:operations` (e.g., `node:cpu_usage:avg1m`).
* **`expr`** *(string, required)*: The PromQL or MetricsQL query whose result will be recorded.
* **`labels`** *(map, optional)*: Additional static labels to attach to the newly created metric.

### A Complete YAML Example

Below is a comprehensive example demonstrating both rule types, grouping, and the use of Go templates within alert annotations:

```yaml
groups:
  - name: node_performance
    interval: 30s
    concurrency: 2 # Evaluates up to 2 rules simultaneously
    rules:
      
      # --- Recording Rule ---
      # Pre-computes the average CPU usage per node over 5 minutes
      - record: instance:node_cpu_utilization:rate5m
        expr: >
          100 - (
            avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
          )
        labels:
          environment: production

      # --- Alerting Rule ---
      # Triggers if the pre-computed CPU usage exceeds 90% for 5 minutes
      - alert: NodeHighCPU
        expr: instance:node_cpu_utilization:rate5m > 90
        for: 5m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU utilization has been above 90% (currently {{ $value | humanize }}%) for the last 5 minutes."
          runbook_url: "https://wiki.internal.com/runbooks/node-high-cpu"

  - name: application_errors
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[1m])) > 50
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Spike in HTTP 5xx errors detected"
```

### Tips for Rule Management

As your observability footprint grows, managing rules in a single file becomes unwieldy. It is standard practice to organize rules logically by service, team, or domain into separate YAML files (e.g., `infra-rules.yaml`, `database-rules.yaml`). 

When launching `vmalert`, you can use wildcard globbing in the `-rule` flag to load them all dynamically:

```bash
./vmalert -rule="/etc/vmalert/rules/*.yaml" ...
```

## 13.4 Validating and Testing Alert Rules Locally

Before pushing new alerting or recording rules to a production VictoriaMetrics cluster, it is critical to validate their syntax and test their logic. A malformed MetricsQL query can cause `vmalert` to log errors and ignore the file, while a logical error—such as a misplaced decimal or incorrect label matcher—can lead to severe alert fatigue or missed critical incidents.

Local testing ensures that your rules behave exactly as intended against specific, predictable datasets.

### 1. Syntax Validation with Dry Run Mode

The fastest way to catch YAML formatting errors, invalid PromQL/MetricsQL syntax, or duplicate rule definitions is to use `vmalert`'s built-in dry run mode. 

By passing the `-dryRun` flag, `vmalert` will parse the specified rule files, validate their structural integrity, and immediately exit without attempting to connect to a VictoriaMetrics backend or Alertmanager.

```bash
# Validate all YAML files in the rules directory
./vmalert -rule="/etc/vmalert/rules/*.yaml" -dryRun
```

If the syntax is correct, the command exits silently with a `0` status code. If there is an error (e.g., an unclosed parenthesis in an expression), `vmalert` will print a descriptive error pointing to the exact file and line number. This command is ideal for the first step of a continuous integration (CI) pipeline.

### 2. Unit Testing Alert Logic

While `-dryRun` confirms your rules are *syntactically* valid, it does not guarantee they are *logically* correct. To verify the logic, you must simulate how the rule evaluates over time.

Because VictoriaMetrics maintains strict compatibility with the Prometheus rule format, the industry-standard way to unit test `vmalert` rules is by leveraging the official Prometheus CLI utility, `promtool`. 

Unit testing involves writing a separate YAML test file that defines:
1.  The rule files to load.
2.  Mock time-series data to simulate an environment.
3.  The exact intervals at which to evaluate the rules.
4.  The expected alerts that should be firing at those specific times.

#### Anatomy of a Unit Test File

Let's assume you have an alerting rule file named `app_rules.yaml` containing an alert named `HighErrorRate` that triggers if the rate of HTTP 500 errors exceeds a certain threshold for 2 minutes.

You would create a test file, `test_app_rules.yaml`, structured like this:

```yaml
# test_app_rules.yaml
rule_files:
  - app_rules.yaml

evaluation_interval: 1m

tests:
  - interval: 1m
    
    # 1. Mock Data: Define the input time series
    input_series:
      - series: 'http_requests_total{status="500", job="web"}'
        # 'values' syntax: start_value + increment x num_intervals
        # e.g., starts at 0, increases by 50 every minute for 10 minutes
        values: '0+50x10' 
      
      - series: 'http_requests_total{status="200", job="web"}'
        values: '0+100x10'

    # 2. Assertions: Check alert states at specific minutes
    alert_rule_test:
      # At minute 1, the rate is high, but the 'for: 2m' condition isn't met.
      - eval_time: 1m
        alertname: HighErrorRate
        exp_alerts: [] # Expect no firing alerts

      # At minute 3, the alert should transition to firing.
      - eval_time: 3m
        alertname: HighErrorRate
        exp_alerts:
          - exp_labels:
              severity: critical
              job: web
            exp_annotations:
              summary: "Spike in HTTP 5xx errors detected"
```

#### Understanding the `values` Syntax

The `values` string is a powerful shorthand for generating mock time-series data over the `interval` period. 
* `0+50x10` means: Start at `0`, add `50` for the next data point, and repeat this increment `10` times. (Generates: 0, 50, 100, 150...)
* `100-10x5` means: Start at `100`, subtract `10` for the next data point, repeat `5` times. (Generates: 100, 90, 80, 70...)
* `10 10 10 50 50` means: Hardcode the exact values for the first 5 intervals. Use `_` to denote a missing scrape (staleness).

#### Executing the Test

Run the test using the `promtool test rules` command:

```bash
promtool test rules test_app_rules.yaml
```

**Expected Output:**
```text
Unit Testing:  test_app_rules.yaml
  SUCCESS
```

If the test fails, `promtool` will output a detailed diff showing exactly what it expected to see (e.g., an alert with specific labels) versus what the rule actually produced. 

### CI/CD Integration Best Practices

To maintain a highly reliable observability stack, manual testing should be replaced with automation. A robust GitOps workflow for VictoriaMetrics alerting should include the following automated steps upon every pull request modifying `*.yaml` rule files:

1.  **Linting:** Use tools like `yamllint` to ensure standard YAML formatting.
2.  **Validation:** Run `./vmalert -dryRun` to catch PromQL/MetricsQL syntax errors.
3.  **Unit Testing:** Execute `promtool test rules` against all defined test files to guarantee no regressions in alert logic. 

Only when all three steps pass should the new rules be merged and deployed to the `vmalert` instances.