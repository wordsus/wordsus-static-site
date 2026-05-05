While previous chapters focused on how `vmagent` collects data, raw metrics are rarely perfect. Applications often expose noisy, high-cardinality labels, redundant time series, or inconsistent naming conventions that can degrade database performance and inflate storage costs. 

Relabeling is your primary defense mechanism and standardization tool. In this chapter, we will master the VictoriaMetrics relabeling pipeline. You will learn the critical differences between target and metric relabeling, how to filter unwanted endpoints before scraping, drop useless data, and dynamically mutate labels on the fly to enforce consistency.

## 6.1 Understanding the Phases of Metric Relabeling

Relabeling is one of the most powerful and heavily utilized features within the VictoriaMetrics ecosystem (and the broader Prometheus ecosystem). It is a rule-based system that allows you to dynamically rewrite, filter, and enrich your monitoring data in flight. However, a common stumbling block for new administrators is understanding exactly *when* these rules are applied. 

Before diving into the syntax of specific rules (which we will cover in the upcoming sections), it is critical to understand the data lifecycle. Relabeling does not happen all at once; it occurs in two distinct, sequential phases: **Target Relabeling** and **Metric Relabeling**.

To conceptualize how data flows through `vmagent` or a single-node VictoriaMetrics instance, consider the following pipeline:

```text
  [Service Discovery]  <-- Discovers raw endpoints and attaches __meta__ labels
          │
          ▼
╔═════════════════════╗
║ Phase 1: Target     ║<-- (relabel_configs) 
║ Relabeling          ║    Filters/modifies the targets BEFORE scraping
╚═════════════════════╝
          │
          ▼
     [Scraping]        <-- Executes HTTP GET requests to the targets
          │
          ▼
╔═════════════════════╗
║ Phase 2: Metric     ║<-- (metric_relabel_configs)
║ Relabeling          ║    Filters/modifies individual time series AFTER scraping
╚═════════════════════╝
          │
          ▼
     [Storage]         <-- Data is written to disk or sent via remote_write
```

---

### Phase 1: Target Relabeling (Pre-Scrape)

Target relabeling occurs **before** any connection is made to your monitored applications. When `vmagent` or VictoriaMetrics uses Service Discovery (such as querying the Kubernetes API or reading a Consul registry), it receives a massive list of potential targets. 

At this stage, you don't have access to the actual metrics (like CPU usage or memory consumption). Instead, you only have access to metadata about the *endpoints* themselves. 

**Key Characteristics of Target Relabeling:**
* **Configuration Key:** Defined under `relabel_configs` in the scrape configuration.
* **Primary Purpose:** To decide *if* a target should be scraped at all, and to define exactly *how* to reach it.
* **Available Data:** Operates purely on target metadata. This includes the target's IP/port, HTTP scheme, and dynamic `__meta__` labels provided by the Service Discovery mechanism (e.g., `__meta_kubernetes_pod_label_env`).

During this phase, you are building the final connection string. For example, you might use target relabeling to drop all endpoints in a staging environment, or to dynamically change the `__address__` label to route traffic through a specific proxy.

### Phase 2: Metric Relabeling (Post-Scrape / Ingestion)

Metric relabeling occurs **after** a target has been successfully scraped, but **before** the data is written to the storage engine or forwarded via `remote_write`. 

Unlike Phase 1, the relabeling engine now has access to the actual time series data returned by the application. This means you can inspect the metric names and their associated labels.

**Key Characteristics of Metric Relabeling:**
* **Configuration Key:** Defined under `metric_relabel_configs` in the scrape configuration.
* **Primary Purpose:** To filter out high-cardinality data, drop useless time series, or clean up label names to enforce standardization across your organization.
* **Available Data:** Operates on the final labels attached to a specific sample (e.g., `__name__`, `job`, `instance`, `status_code`, `path`).

If an application exposes 1,000 different metrics, but you only care about 50 of them, metric relabeling is the phase where you configure rules to drop the remaining 950. This is your primary defense mechanism against storage bloat and high-cardinality explosions.

> **VictoriaMetrics Note on Push-Based Ingestion:** While the two-phase system originated from the pull-based Prometheus model, VictoriaMetrics heavily extends Phase 2. As discussed in Chapter 4, VictoriaMetrics accepts push protocols (InfluxDB, OTLP, Graphite). For data pushed directly into VictoriaMetrics, Phase 1 is skipped entirely. However, you can apply **Phase 2 (Metric Relabeling)** globally to all pushed data using the `-streamAggr.config` or stream-level relabeling flags, giving you the exact same transformation power over cloud-native and legacy push data.

---

### The Role of Internal Meta-Labels (`__`)

To master the relabeling phases, you must understand how the engine handles labels prefixed with a double underscore (`__`). These are internal labels, and their lifecycle is strictly tied to the relabeling phases.

1.  **Creation:** During Service Discovery, the system attaches dozens of temporary labels starting with `__meta_` to a target. It also creates `__address__` (the target host:port), `__metrics_path__` (usually `/metrics`), and `__scheme__` (http/https).
2.  **Manipulation (Phase 1):** In Target Relabeling, you can read these `__` labels to make routing or filtering decisions. If you want to keep a piece of metadata permanently (for example, keeping a Kubernetes namespace label), you *must* rename it to a label without the `__` prefix during this phase.
3.  **Purging:** Immediately after Phase 1 finishes, the system **deletes** all labels that still start with `__` (except `__name__`). 
4.  **Finality (Phase 2):** By the time Phase 2 (Metric Relabeling) begins, the `__meta_` labels no longer exist. If you try to write a rule in Phase 2 that looks for a `__meta_kubernetes_pod_name` label, it will silently fail because that data was stripped away after Phase 1.

Understanding this strict lifecycle—and knowing exactly which data is available during Target Relabeling versus Metric Relabeling—is the foundational key to writing effective, performant rules.

## 6.2 Target Relabeling Configurations

As established in the previous section, Target Relabeling is your first line of defense and configuration in the scraping pipeline. Executed by `vmagent` (or a standalone VictoriaMetrics instance) *before* any HTTP connection is made, this phase operates exclusively on endpoint metadata.

These rules are defined under the `relabel_configs` key within a specific job in your `scrape_configs`. You will use target relabeling to achieve three primary goals:

1.  **Filtering:** Deciding which discovered targets to keep and which to ignore.
2.  **Metadata Persistence:** Translating temporary `__meta_*` labels into permanent, queryable labels attached to your time series.
3.  **Connection Routing:** Modifying internal `__` labels (like `__address__` or `__scheme__`) to change how `vmagent` actually connects to the target.

### Anatomy of a Relabeling Rule

Before looking at specific use cases, let's break down the standard structure of a relabeling rule. A single rule is evaluated top-to-bottom and consists of several optional fields:

```yaml
- action: replace               # What to do (replace, keep, drop, labelmap, etc.)
  source_labels: [label1, ...]  # Which existing labels to evaluate
  separator: ;                  # How to join multiple source_labels (default is ';')
  regex: (.*)                   # Regular expression to match against the source_labels (default is '(.*)')
  target_label: new_label       # The label to create or modify (required for 'replace')
  replacement: $1               # The value to inject, usually referencing regex capture groups (default is '$1')
```

VictoriaMetrics supports the exact same relabeling actions as Prometheus: `replace` (the default), `keep`, `drop`, `hashmod`, `labelmap`, `labeldrop`, and `labelkeep`.

---

### Use Case 1: Filtering Targets (`keep` and `drop`)

When Service Discovery returns hundreds of endpoints, you rarely want to scrape all of them. The `keep` and `drop` actions allow you to filter targets based on their metadata. If a target is dropped, `vmagent` discards it entirely, saving memory and preventing unnecessary network requests.

**Example: Only scrape pods with a specific annotation**

In Kubernetes, you might only want to scrape pods explicitly annotated with `prometheus.io/scrape: "true"`. 

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Keep only targets where the scrape annotation is strictly "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

**Example: Drop targets in a "staging" environment**

If your Consul discovery returns nodes from all environments, you can discard staging nodes:

```yaml
    relabel_configs:
      - source_labels: [__meta_consul_tags]
        action: drop
        regex: .*staging.*
```

### Use Case 2: Persisting Metadata (`replace`)

Remember that all labels starting with `__` are deleted immediately after the Target Relabeling phase. If you want to use Service Discovery metadata in your PromQL queries later, you must map it to a standard label using the `replace` action.

**Example: Saving Kubernetes Namespace and Pod Name**

```yaml
    relabel_configs:
      # Extract the namespace and save it as 'namespace'
      - action: replace
        source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
        
      # Extract the pod name and save it as 'pod'
      - action: replace
        source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
```
*Note: Because `replace` is the default action, and `(.*)` is the default regex, you can omit them for basic 1:1 mapping to keep your YAML concise.*

### Use Case 3: Modifying Scrape Behavior

You can dynamically alter how `vmagent` reaches a target by overwriting internal variables like `__address__` (host:port), `__metrics_path__` (the URL path), and `__scheme__` (http/https).

**Example: Overriding the scrape port**

Suppose your Service Discovery finds applications on port `8080`, but their metrics are exposed on a dedicated management port `9090`. You can rewrite the `__address__` label on the fly:

```yaml
    relabel_configs:
      # Match the host part of __address__, ignore the port, and append :9090
      - source_labels: [__address__]
        action: replace
        regex: ([^:]+)(?::\d+)?
        replacement: ${1}:9090
        target_label: __address__
```

**Example: The Exporter Pattern (Blackbox Exporter)**

A classic use case for modifying `__address__` is when using exporters that probe other services (like the Blackbox Exporter or SNMP Exporter). You need `vmagent` to talk to the exporter, but you want to tell the exporter which actual target to probe.

```yaml
    relabel_configs:
      # 1. Take the original discovered target (e.g., example.com) and pass it as the 'target' URL parameter
      - source_labels: [__address__]
        target_label: __param_target
      # 2. Save the original target as an 'instance' label for dashboards
      - source_labels: [__param_target]
        target_label: instance
      # 3. Change the actual scrape destination to the Blackbox Exporter's address
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### Use Case 4: Mass Label Mapping (`labelmap`)

Sometimes, an orchestration system provides many dynamic metadata labels that you want to keep, but writing a `replace` rule for each one is tedious. The `labelmap` action allows you to map multiple labels dynamically using regex capture groups.

**Example: Importing all EC2 Tags**

AWS EC2 Service Discovery exposes instance tags as `__meta_ec2_tag_<tagname>`. You can map all of them to `tag_<tagname>` in just a few lines:

```yaml
    relabel_configs:
      - action: labelmap
        regex: __meta_ec2_tag_(.+)
        replacement: tag_$1
```
If an EC2 instance has the tags `__meta_ec2_tag_team=dev` and `__meta_ec2_tag_app=frontend`, this single rule will automatically generate the permanent labels `tag_team="dev"` and `tag_app="frontend"`.

## 6.3 Metric Relabeling for Dropping and Keeping Data

While Target Relabeling manages *where* `vmagent` goes to find data, Metric Relabeling dictates *what* actually gets stored. Operating entirely in Phase 2—after a scrape is successful but before the data is committed to the storage engine or sent via `remote_write`—metric relabeling is your primary tool for managing storage costs and mitigating high-cardinality explosions.

At this stage, you finally have access to the time series data itself. This means you can evaluate the metric's name (accessible via the special `__name__` label) and any custom labels the application has attached to it. 

The configurations in this section are defined under the `metric_relabel_configs` key in your scrape jobs, or globally in VictoriaMetrics using stream-level relabeling flags.

---

### Controlling Time Series with `drop` and `keep`

The most fundamental use of metric relabeling is filtering entire time series. If a time series is dropped, it is silently discarded; VictoriaMetrics will not allocate disk space or memory for it.

#### Use Case 1: Dropping Noisy or High-Cardinality Metrics

Applications often expose hundreds of default metrics (like Go runtime stats or JVM memory pools) that you may never look at. Furthermore, developers might accidentally introduce high-cardinality labels, such as user IDs or session tokens, which can rapidly degrade database performance. 

To discard an entire metric, you use the `drop` action and target the `__name__` label.

**Example: Dropping specific internal metrics**

```yaml
scrape_configs:
  - job_name: 'backend-app'
    static_configs:
      - targets: ['localhost:8080']
    metric_relabel_configs:
      # Drop all garbage collection duration histograms
      - source_labels: [__name__]
        action: drop
        regex: go_gc_duration_seconds.*
```

You can also drop metrics based on their specific label values. 

**Example: Dropping successful HTTP requests to save space**

If you only use `http_requests_total` to calculate error rates, you might choose to drop all time series where the HTTP status code is a 200-level success.

```yaml
    metric_relabel_configs:
      - source_labels: [__name__, status]
        separator: "@"
        action: drop
        # Match metric name 'http_requests_total' AND any status starting with '2'
        regex: http_requests_total@2.*
```
*Note the use of `separator: "@"`. The relabeling engine concatenates the `source_labels` using the separator before evaluating the regex. The resulting string tested by the regex is `http_requests_total@200`.*

#### Use Case 2: The Allowlist Approach (`keep`)

Instead of explicitly dropping unwanted metrics, you can invert the logic using the `keep` action. This acts as a strict allowlist. **Warning:** Any metric from this scrape job that does *not* match the `keep` regex will be dropped immediately.

**Example: Keeping only essential Node Exporter metrics**

```yaml
    metric_relabel_configs:
      - source_labels: [__name__]
        action: keep
        # Keep ONLY cpu, memory, and disk usage metrics
        regex: (node_cpu_seconds_total|node_memory_MemTotal_bytes|node_filesystem_avail_bytes)
```

---

### Controlling Labels with `labeldrop` and `labelkeep`

Sometimes you want to keep the metric, but discard specific labels attached to it. This is a critical technique for reducing cardinality without losing the underlying data point.

Consider an application that improperly attaches a unique `client_ip` to an HTTP request counter. This creates a new time series for every single user visiting your site.

```text
BEFORE LABELDROP:
http_requests_total{method="GET", status="200", client_ip="192.168.1.5"}   1
http_requests_total{method="GET", status="200", client_ip="10.0.0.42"}     1
http_requests_total{method="GET", status="200", client_ip="172.16.0.9"}    1
```

If you apply `labeldrop` to remove the `client_ip` label, VictoriaMetrics will automatically aggregate the incoming data points into a single time series, incrementing the counter as expected.

```text
AFTER LABELDROP:
http_requests_total{method="GET", status="200"}                            3
```

#### The Syntax for Label Dropping/Keeping

Unlike `drop` and `keep`, which evaluate the *values* of labels using `source_labels`, the `labeldrop` and `labelkeep` actions evaluate the **label names themselves**. Therefore, you do not use `source_labels`. You write the `regex` to match the name of the label you wish to discard.

**Example: Dropping volatile labels to fix cardinality**

```yaml
    metric_relabel_configs:
      # Drop the 'client_ip' and 'request_id' labels from ALL metrics in this job
      - action: labeldrop
        regex: (client_ip|request_id)
```

**Example: Keeping only specific labels (`labelkeep`)**

If an integration attaches dozens of useless labels, you can strip all of them away except for the ones you explicitly need. Note that the `__name__` label is always preserved automatically; you do not need to include it in your `labelkeep` regex.

```yaml
    metric_relabel_configs:
      # Strip all labels EXCEPT 'job', 'instance', 'method', and 'status'
      - action: labelkeep
        regex: (job|instance|method|status)
```

By strategically combining `drop` for noisy time series and `labeldrop` for volatile labels, you can drastically reduce your storage footprint and improve VictoriaMetrics query performance, transforming a messy application endpoint into a clean, highly optimized data stream.

## 6.4 Modifying Labels and Metric Names on the Fly

While dropping unwanted time series controls your database's physical footprint, dynamically modifying labels is how you ensure data cleanliness, consistency, and usability. Because different applications and teams often use conflicting naming conventions, metric relabeling acts as a universal translator, standardizing your telemetry before it ever hits the storage engine.

All of these transformations utilize the `replace` action (which is the default action if none is specified) or the `labelmap` action within your `metric_relabel_configs`. 

### 1. Renaming the Metric Itself

In the Prometheus and VictoriaMetrics data model, the metric name is not actually a special entity; it is simply the value of the internal `__name__` label. Because of this, you can rename a metric using the exact same logic you would use to modify any other label.

This is highly useful during migrations when an old application exposes `legacy_requests_total` but your Grafana dashboards expect `http_requests_total`.

**Example: Renaming a legacy metric**

```yaml
    metric_relabel_configs:
      - source_labels: [__name__]
        action: replace
        regex: legacy_requests_total
        replacement: http_requests_total
        target_label: __name__
```

### 2. Fixing Cardinality by Masking Label Values

One of the most powerful uses of on-the-fly modification is fixing cardinality issues caused by poorly instrumented applications. A common mistake developers make is including dynamic IDs (like user IDs, UUIDs, or order numbers) inside an HTTP path label.

```text
BEFORE MODIFICATION (High Cardinality Explosion):
http_requests_total{path="/api/v1/users/94837/profile"}  1
http_requests_total{path="/api/v1/users/12049/profile"}  1
```

By using regex capture groups in the `replace` action, you can mask these dynamic values. The relabeling engine will rewrite the string, grouping all those distinct time series into a single, highly cacheable metric.

**Example: Masking user IDs in the `path` label**

```yaml
    metric_relabel_configs:
      - source_labels: [path]
        action: replace
        # Match the start, the dynamic digits, and the end
        regex: (/api/v1/users/)\d+(/profile)
        # Reconstruct the string injecting "<id>" in the middle
        replacement: ${1}<id>${2}
        target_label: path
```

```text
AFTER MODIFICATION (Optimized):
http_requests_total{path="/api/v1/users/<id>/profile"}   2
```

### 3. Concatenating Multiple Labels

You can extract values from multiple existing labels and stitch them together to form an entirely new label. The engine uses the `separator` field (which defaults to `;`) to join the `source_labels` together before applying the regex.

Suppose an exporter provides `host="192.168.1.5"` and `port="8080"` as separate labels, but your alerting rules require a combined `endpoint` label.

**Example: Creating an `endpoint` label from `host` and `port`**

```yaml
    metric_relabel_configs:
      - source_labels: [host, port]
        separator: ":"      # Join host and port with a colon
        action: replace
        regex: (.*)         # Capture the entire joined string
        replacement: $1     # Inject the captured string
        target_label: endpoint
```
If a metric arrives with `host="db-01"` and `port="5432"`, this rule evaluates the string `db-01:5432`, matches the whole thing, and creates a new label: `endpoint="db-01:5432"`.

### 4. Standardizing Label Names with `labelmap`

While `replace` changes label *values*, `labelmap` is used to dynamically rename label *keys*. This is particularly useful when importing data from external systems that prefix labels differently than your internal standards.

If a vendor application attaches labels like `vendor_app_version`, `vendor_app_region`, and `vendor_app_tier`, you might want to strip the `vendor_app_` prefix so they align with your standard `version`, `region`, and `tier` labels.

**Example: Stripping prefixes from label names**

```yaml
    metric_relabel_configs:
      - action: labelmap
        # Capture whatever comes AFTER "vendor_app_"
        regex: vendor_app_(.+)
        # Use that captured string as the new label name
        replacement: $1
```

**Crucial Note on `labelmap`:** The `labelmap` action does *not* delete the original labels. It creates a copy of the label with the new name. If you want to completely replace the label keys and remove the old ones, you must follow your `labelmap` rule with a `labeldrop` rule:

```yaml
    metric_relabel_configs:
      # Step 1: Create the new, clean labels
      - action: labelmap
        regex: vendor_app_(.+)
        replacement: $1
        
      # Step 2: Drop the original, messy labels
      - action: labeldrop
        regex: vendor_app_.+
```

## 6.5 Debugging and Testing Relabeling Rules Locally

Relabeling is incredibly powerful, but it is notoriously difficult to get right on the first try. A single typo or misunderstood regular expression can act as a black box, silently dropping thousands of critical metrics or corrupting your data's schema. Because of this, testing relabeling rules directly in production is highly discouraged.

Fortunately, VictoriaMetrics and `vmagent` provide a suite of built-in tools specifically designed to safely test, trace, and validate your rules before they ever touch live data.

### The Number One Pitfall: Implicit Regex Anchoring

Before looking at the tools, you must understand the most common reason relabeling rules fail: **In Prometheus and VictoriaMetrics, relabeling regular expressions are implicitly anchored to the beginning and end of the string.** Unlike standard `grep` or application logging where a regex matches *anywhere* in the text, relabeling evaluates as if your regex is wrapped in `^` and `$`.

**The Mistake:**
You want to drop any target in the staging environment. You write:
```yaml
- source_labels: [__meta_env]
  action: drop
  regex: staging
```
If the actual label is `staging-eu-west`, this rule **will fail** to match. It only matches the exact string `staging`.

**The Fix:**
You must explicitly use wildcards to allow surrounding text:
```yaml
- source_labels: [__meta_env]
  action: drop
  regex: .*staging.*
```
Keep this behavior at the forefront of your mind whenever you are debugging a rule that "should be matching, but isn't."

---

### Tool 1: The Web UI Debuggers (The Best Method)

The most effective way to debug relabeling is using the interactive web interfaces built directly into `vmagent` (and single-node VictoriaMetrics). These interfaces provide a step-by-step visual execution trace of your rules.

If `vmagent` is running locally on its default port, open your browser and navigate to:
1.  **`http://localhost:8429/target_relabel_debug`** (For testing Phase 1)
2.  **`http://localhost:8429/metric_relabel_debug`** (For testing Phase 2)

**How it works:**
These pages present you with two text boxes. In the first box, you paste your raw YAML `relabel_configs` or `metric_relabel_configs`. In the second box, you provide the starting labels formatted as a standard metric (e.g., `{__address__="10.0.1.5:8080", __meta_env="prod"}`). 

When you click "Submit," the engine evaluates your rules and outputs an execution trace.

```text
[Plain Text Diagram of a Debug Trace]

Initial labels:
{__address__="10.0.1.5:8080", __meta_env="prod", __meta_team="frontend"}

Step 1: Rule: {action: "replace", source_labels: ["__meta_team"], target_label: "team"}
Result: Match! 
Current labels:
{__address__="10.0.1.5:8080", __meta_env="prod", __meta_team="frontend", team="frontend"}

Step 2: Rule: {action: "drop", source_labels: ["__meta_env"], regex: ".*staging.*"}
Result: No match. Target kept.

Final labels (after internal __meta_ stripping):
{__address__="10.0.1.5:8080", team="frontend"}
```
This step-by-step output instantly reveals *which* rule in the chain failed to execute, or *why* a metric was unexpectedly dropped.

### Tool 2: Validating Syntax with `-dryRun`

Before restarting a live `vmagent` instance, you must ensure your YAML syntax is perfectly valid. A malformed configuration file will cause `vmagent` to crash on startup.

You can validate your configuration offline using the `-dryRun` flag.

```bash
./vmagent -promscrape.config=/path/to/prometheus.yml -dryRun
```

If the configuration is valid, the command will output `configuration is valid` and exit cleanly. If there are indentation errors, invalid action types, or malformed regular expressions, it will print the exact line number of the error.

### Tool 3: Verifying Target State via `/targets`

Once you have validated your rules and applied them to a running `vmagent` instance, your next debugging stop is the Targets page: **`http://localhost:8429/targets`**.

This page is invaluable for verifying **Phase 1 (Target Relabeling)**. It splits your targets into two tables: `UP/DOWN` (active targets) and `DROPPED`.

* **If a target is missing entirely:** It means your Service Discovery failed to find it. Relabeling never even occurred.
* **If a target is in the `DROPPED` table:** You can click the "Labels" column to see the original `__meta_` labels it was discovered with, which helps you reverse-engineer why your `drop` or `keep` rules filtered it out.
* **If a target is `DOWN` (Red):** Target relabeling succeeded, but the scrape failed. This usually means you incorrectly mutated the `__address__` or `__scheme__` label, pointing `vmagent` to an invalid IP or port.

### A Reliable Local Testing Workflow

To safely develop complex relabeling strategies, adopt this workflow:

1.  **Extract Sample Data:** Go to your production database and query a raw metric. Copy the exact labels of a time series you want to manipulate. If working with target relabeling, go to the `/targets` page and copy the raw `__meta_` labels of a discovered node.
2.  **Isolate the Rules:** Write your `relabel_configs` or `metric_relabel_configs` in a temporary text file.
3.  **Trace Locally:** Paste the YAML and the sample labels into the `vmagent` web debugger (`/target_relabel_debug` or `/metric_relabel_debug`). Tweak the regex and separator logic until the final output matches your exact desired state.
4.  **Dry Run:** Integrate the snippet into your main configuration file and run `vmagent -dryRun` to ensure YAML integrity.
5.  **Deploy and Monitor:** Apply the configuration and monitor the `vmagent_relabel_metrics_dropped_total` metric to ensure your drop rules are executing at the expected volume.