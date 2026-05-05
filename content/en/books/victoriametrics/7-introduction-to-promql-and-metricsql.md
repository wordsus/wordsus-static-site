Data ingestion and storage are only half the battle; the true power of a time series database lies in how effectively you can extract, analyze, and visualize that data. VictoriaMetrics natively supports PromQL, the industry-standard query language of the Prometheus ecosystem, ensuring seamless compatibility with your existing Grafana dashboards. 

However, VictoriaMetrics also introduces MetricsQL, a backward-compatible superset of PromQL that adds powerful new functions, simplifies complex syntax, and optimizes execution. This chapter explores the foundational mechanics of querying, from basic data types to advanced aggregations.

## 7.1 Basic Syntax and Metric Data Types

To extract meaningful insights from VictoriaMetrics, you need a way to ask questions about your data. VictoriaMetrics natively supports PromQL (the Prometheus Query Language) and extends it with MetricsQL. Because MetricsQL is fully backwards-compatible with PromQL, any standard Prometheus query will work seamlessly in VictoriaMetrics. 

Before diving into complex aggregations and functions, it is critical to understand the foundational syntax of how a metric is structured and the specific data types the query engine uses to evaluate expressions.

### The Anatomy of a Time Series

In VictoriaMetrics, all data is stored as time series. A single time series is uniquely identified by its **metric name** and a set of key-value pairs called **labels**. 

Here is the basic syntax of a time series representation in a query:

```text
http_requests_total{environment="production", method="GET"}
|_________________| |_____________________________________|
    Metric Name                     Labels
```

* **Metric Name:** Represents the general feature of a system that is being measured (e.g., `http_requests_total`, `node_memory_MemFree_bytes`). It must match the regex `[a-zA-Z_:][a-zA-Z0-9_:]*`.
* **Labels:** Allow for dimensional data modeling. They differentiate the characteristics of the thing being measured (e.g., the specific environment, HTTP method, or server IP). The combination of the metric name and its specific label key-value pairs defines a unique stream of data.

When you submit a query, VictoriaMetrics evaluates the expression and returns data in one of several specific formats. Understanding these formats is essential because certain functions only accept specific data types as input.

### Query Engine Data Types

When working with PromQL and MetricsQL, you are dealing with four primary data types. The query engine automatically determines the data type based on the syntax of your expression.

#### 1. Instant Vector
An instant vector is a set of time series containing a **single sample** (a timestamp and a floating-point value) for each time series, all sharing the same evaluation timestamp. 

When you type a bare metric name into the query interface, you are asking for an instant vector. It returns the most recent data point for that series at the exact moment the query is executed.

**Example:**
```promql
node_cpu_seconds_total
```
*Result:* A list of all unique time series matching `node_cpu_seconds_total`, each displaying exactly one value representing its current state. Instant vectors are the most common data type used for drawing graphs, as visualization tools request an instant vector at regular intervals (steps) across a time range.

#### 2. Range Vector
A range vector is a set of time series containing a **range of data points over time** for each time series. 

You define a range vector by appending a time duration in square brackets `[]` to the end of an instant vector selector. This tells the database to look back over a specific duration from the evaluation moment and return all raw samples stored during that window.

**Supported time durations include:**
* `s` - seconds
* `m` - minutes
* `h` - hours
* `d` - days
* `w` - weeks
* `y` - years

**Example:**
```promql
node_cpu_seconds_total[5m]
```
*Result:* A list of all unique time series matching the metric name, but instead of a single value, each series contains an array of all data points collected over the last 5 minutes. 

> **Note:** You cannot graph a range vector directly in tools like Grafana. Because a range vector contains multiple values per timestamp per series, the graphing tool does not know which value to plot. Range vectors are typically passed into functions like `rate()`, `increase()`, or `deriv()` (covered in Chapter 8) to calculate behavior over time and return an instant vector that *can* be graphed.

#### 3. Scalar
A scalar is a simple numeric floating-point value. It has no labels and is not associated with any specific time series. 

Scalars are most often used in mathematical operations alongside vectors. For instance, if you want to convert bytes to megabytes, you divide the vector by a scalar.

**Example:**
```promql
node_memory_MemFree_bytes / 1048576
```
In this query, `node_memory_MemFree_bytes` returns an instant vector, and `1048576` is a scalar. The query engine automatically applies the scalar calculation to every single time series within the vector.

#### 4. String
A string is a simple textual value, currently unused in standard query evaluation aside from being returned by certain functions or used within label matchers. It is the least common data type you will interact with directly when writing analytical queries.

### MetricsQL Syntax Enhancements

While standard PromQL requires explicit syntax for duration brackets, MetricsQL introduces minor syntactical conveniences. For example, when applying functions like `rate()` in MetricsQL, if you omit the lookbehind window in brackets, VictoriaMetrics will automatically infer it based on the `step` interval of your graphing tool. 

```promql
// Standard PromQL requires explicit duration
rate(http_requests_total[5m])

// MetricsQL can infer the duration automatically based on the query step
rate(http_requests_total)
```

Understanding how these types interact—specifically the transition from Range Vectors to Instant Vectors via functions—forms the mental model required to master querying in VictoriaMetrics.

## 7.2 Utilizing Selectors and Label Matchers

While fetching an entire metric like `http_requests_total` is useful for small environments, enterprise deployments often have thousands of unique time series sharing the same metric name. To isolate the exact data you need, you must use **selectors** and **label matchers**. 

A selector is the complete expression used to identify a specific set of time series. The most common way to filter these series is by querying the labels attached to them using label matchers enclosed in curly braces `{}`.

### The Four Core Label Matchers

VictoriaMetrics fully supports the four standard PromQL label matching operators. These operators allow you to perform exact string matches, inverse matches, and complex regular expression (regex) evaluations.

| Operator | Name | Description | Example |
| :--- | :--- | :--- | :--- |
| `=` | **Equality** | Matches strings that are exactly equal to the provided value. | `env="production"` |
| `!=` | **Inequality** | Matches strings that are *not* equal to the provided value. | `env!="staging"` |
| `=~` | **Regex Match** | Matches strings that fit the provided RE2 regular expression. | `method="GET\|POST"` |
| `!~` | **Regex Non-Match** | Matches strings that do *not* fit the provided RE2 regular expression. | `status!~"5.."` |

### Practical Examples of Label Matching

To understand how these matchers interact, consider a scenario where you are monitoring an API gateway.

**1. Exact Matching (Equality and Inequality)**
If you want to track the total number of failed requests (HTTP 500) specifically in the production environment, you chain equality matchers together separated by commas:

```promql
http_requests_total{environment="production", status="500"}
```

If you want to exclude a specific internal testing tenant from your global SLA calculations, you use the inequality matcher:

```promql
http_requests_total{tenant!="load_tester_bot"}
```

**2. Pattern Matching (Regex)**
Regular expressions are incredibly powerful for grouping data dynamically. VictoriaMetrics uses the RE2 syntax for regex evaluation.

To match requests hitting any of your authentication endpoints (`/login`, `/logout`, `/signup`), you can use the regex match operator with a pipe `|` (OR):

```promql
http_requests_total{path=~"/login|/logout|/signup"}
```

Conversely, if you want to find all error codes (any status starting with 4 or 5) but exclude the `404 Not Found` errors because they are polluting your alerts, you can combine matchers:

```promql
http_requests_total{status=~"[45]..", status!="404"}
```

> **Note on Regex Anchoring:** In PromQL and MetricsQL, regex matchers are fully anchored by default. This means `=~"foo"` behaves like `=~"^foo$"`. If you want to match a substring anywhere within a label, you must use wildcards, such as `=~".*foo.*"`.

### The `__name__` Meta-Label

Under the hood, the metric name itself is just a regular label with the special key `__name__`. 

Writing `http_requests_total{status="200"}` is simply syntactic sugar for:

```promql
{__name__="http_requests_total", status="200"}
```

Understanding this is crucial because it allows you to perform regex queries against the metric name itself—a technique often used in advanced alerting or when searching for metrics you have forgotten the exact name of. 

For example, to find any metric related to memory across the node exporter:
```promql
{__name__=~"node_memory_.*_bytes"}
```

### MetricsQL Enhancements: The `in` Operator

While standard PromQL relies on regex pipes (`|`) for matching multiple specific values, MetricsQL introduces the much more readable `in` operator (and its inverse, `not in`), borrowed from standard SQL.

Instead of writing a complex and potentially error-prone regex string like this:
```promql
node_cpu_seconds_total{mode=~"idle|user|system|iowait"}
```

You can write this in MetricsQL:
```promql
node_cpu_seconds_total{mode in ("idle", "user", "system", "iowait")}
```

This not only improves the readability of your queries but also allows the VictoriaMetrics query engine to optimize the lookup process more effectively than standard regex parsing.

### Empty Label Matchers and Cardinality

A common pitfall when writing queries is how empty labels are handled. In the Prometheus data model, a label that does not exist on a time series is conceptually identical to a label that exists but has an empty string value `""`.

* `{env=""}` will match time series where the `env` label is explicitly set to empty, *and* time series that do not have an `env` label at all.
* `{env!=""}` will match only time series that possess the `env` label with a non-empty value.

**Best Practice:** Always try to include at least one equality matcher (`=`) or a specific metric name in your selectors. Queries that consist entirely of regex non-matchers or inequality matchers (e.g., `{env!="dev"}`) force the storage engine to scan a massive portion of the inverted index, which can cause high CPU and memory spikes on your `vmselect` nodes. Adding a metric name or a specific equal label narrows the initial search pool dramatically.

## 7.3 Mathematical and Binary Operators

Once you have selected your data using metric names and label matchers, you rarely want to view the raw numbers exactly as they were scraped. You will need to convert units, calculate percentages, compare series against thresholds, and join disparate metrics together. 

VictoriaMetrics supports a robust set of mathematical and binary operators to perform these transformations. These operators evaluate expressions involving scalars (single numbers) and instant vectors (sets of time series).

---

### 1. Arithmetic Operators

Arithmetic operators allow you to perform standard mathematical calculations. The supported operators are:

* `+` (Addition)
* `-` (Subtraction)
* `*` (Multiplication)
* `/` (Division)
* `%` (Modulo / Remainder)
* `^` (Power / Exponentiation)

**Scalar to Vector Operations:**
When you apply an arithmetic operator between a vector and a scalar, the operation is applied to the value of *every individual time series* within that vector. This is heavily used for unit conversion.

*Example: Converting bytes to gigabytes (GB)*
```promql
node_memory_MemTotal_bytes / (1024 * 1024 * 1024)
```

**Vector to Vector Operations:**
When you perform arithmetic between two instant vectors, the query engine must match the time series on the left side with the time series on the right side. By default, this is a **one-to-one match**, meaning VictoriaMetrics looks for series on both sides that have the *exact same set of labels*.

*Example: Calculating percentage of used memory*
```promql
(node_memory_MemTotal_bytes - node_memory_MemFree_bytes) / node_memory_MemTotal_bytes * 100
```
Because both metrics originate from the same target and share the exact same labels (e.g., `instance="node1"`, `job="node_exporter"`), the engine effortlessly matches them and calculates the result for each instance.

---

### 2. Comparison Operators

Comparison operators are used to compare values. In VictoriaMetrics, they serve a dual purpose: they act as **filters** by default, but can also be used to output **boolean** states.

* `==` (Equal)
* `!=` (Not equal)
* `>` (Greater than)
* `<` (Less than)
* `>=` (Greater than or equal to)
* `<=` (Less than or equal to)

**Filtering (Default Behavior):**
When used normally, a comparison operator acts as a filter. It evaluates the condition, and if the condition is false, that specific time series is dropped from the results entirely.

*Example: Find instances with less than 10GB of free disk space*
```promql
node_filesystem_avail_bytes < 10737418240
```
This query will only return time series whose value is strictly less than 10,737,418,240. If a server has 50GB free, it simply vanishes from the graph.

**Boolean Modifiers (`bool`):**
If you want to keep all time series in the result but change their values to `0` (false) or `1` (true) based on the condition, you append the `bool` modifier after the operator.

*Example: Output a binary state for disk space alerting*
```promql
node_filesystem_avail_bytes < bool 10737418240
```
Servers with less than 10GB free will return a `1`, and servers with more than 10GB free will return a `0`. This is exceptionally useful for constructing complex alert logic.

---

### 3. Logical and Set Operators

Logical operators combine multiple instant vectors based on their label sets. They only operate between vectors, never on scalars.

* `and` (Intersection): Returns series from the left side if they have a matching series on the right side.
* `or` (Union): Returns all series from the left side, plus any series from the right side that do not have matching labels on the left.
* `unless` (Complement): Returns series from the left side *only if* they do NOT have a matching series on the right side.

*Example: Compound Alerting Condition*
To trigger an alert only if the error rate is high *and* the CPU usage is also high, you can intersect two queries:
```promql
rate(http_requests_total{status="500"}[5m]) > 10
and
node_cpu_usage_percentage > 90
```

---

### 4. Advanced Vector Matching (`on`, `ignoring`, `group_left`)

The most common hurdle for new users is performing binary operations on two vectors that *almost* match, but have slight label differences.

If Vector A has labels `{instance="web1", env="prod", version="v2"}` and Vector B has `{instance="web1", env="prod"}`, standard arithmetic (`Vector A / Vector B`) will yield "no data" because the label sets are not 100% identical.

**`ignoring()` and `on()`:**
You can instruct VictoriaMetrics to ignore specific labels, or to match *only* on specific labels.

```promql
# Ignore the "version" label when matching left to right
VectorA / ignoring(version) VectorB

# Match ONLY on the "instance" and "env" labels
VectorA / on(instance, env) VectorB
```

**Many-to-One Matching (`group_left` / `group_right`):**
Often, you need to join a "many" vector (e.g., CPU usage per CPU core) with a "one" vector (e.g., maximum power limit per server). This is called a Many-to-One match. 

To achieve this, you must explicitly tell the engine which side has the higher cardinality ("many" side) using `group_left` (left side is many) or `group_right` (right side is many).

*Example Scenario: Appending metadata to a metric.*
You have a metric `http_requests_total` containing a `pod` label, and a metadata metric `kube_pod_info` containing the `pod` label alongside a `team` label. You want to calculate the total requests but attach the `team` label to the results.

```text
+------------------------------------------+       +------------------------------------+
| LEFT VECTOR (MANY)                       |       | RIGHT VECTOR (ONE)                 |
| http_requests_total                      |       | kube_pod_info                      |
+------------------------------------------+       +------------------------------------+
| pod="api-1", method="GET"  (Val: 500)    | \     |                                    |
| pod="api-1", method="POST" (Val: 120)    | ----->| pod="api-1", team="billing" (Val:1)|
| pod="api-1", method="PUT"  (Val: 15)     | /     |                                    |
+------------------------------------------+       +------------------------------------+
```

To execute this "SQL-like JOIN" in MetricsQL, you multiply the operational metric by the metadata metric, match on the `pod` label, allow Many-to-One matching with `group_left`, and pull the `team` label over:

```promql
http_requests_total 
  * on(pod) group_left(team) 
kube_pod_info
```

In this query:
1. `on(pod)` finds the common link.
2. `group_left` permits multiple `http_requests_total` series (GET, POST, PUT) to match a single `kube_pod_info` series.
3. `(team)` explicitly copies the `team` label from the right vector to the resulting left vector.

## 7.4 Aggregation Operators (Sum, Min, Max, Avg)

When monitoring infrastructure or applications, you rarely want to look at every individual time series in isolation. A cluster of 50 web servers might generate 50 separate CPU metrics, but your primary concern is likely the *overall* health of the cluster. 

Aggregation operators solve this by condensing an instant vector—which may contain hundreds or thousands of individual time series—into a smaller, more manageable set of time series (or even a single value) by calculating mathematical summaries across the different dimensions.

### Core Aggregation Operators

VictoriaMetrics supports all standard PromQL aggregators. The four most commonly used are:

* **`sum()`**: Calculates the total sum of all values across the aggregated time series.
* **`avg()`**: Calculates the arithmetic mean (average) across the aggregated time series.
* **`min()`**: Selects the smallest value across the aggregated time series.
* **`max()`**: Selects the largest value across the aggregated time series.

*Other notable operators include `count()` (counts the number of series), `stddev()` (standard deviation), `topk()` (returns the largest N series), and `quantile()` (calculates the φ-quantile).*

> **Important:** Aggregation operators only work on **instant vectors**. You cannot pass a range vector directly into an aggregator. For example, `sum(http_requests_total[5m])` is invalid syntax. You must first use a function like `rate()` to convert the range vector into an instant vector, e.g., `sum(rate(http_requests_total[5m]))`.

### Grouping with `by` and `without`

By default, if you apply an aggregation operator to a vector, it collapses **all** time series into a single, label-less result. 

```promql
# Returns a single number representing all memory used across your entire fleet
sum(node_memory_MemTotal_bytes - node_memory_MemFree_bytes)
```

However, you usually want to preserve some granularity—such as seeing the memory usage grouped *per environment* or *per datacenter*. To control which labels are preserved and which are aggregated away, you use the `by` and `without` grouping modifiers.

#### The `by` Clause (Opt-In)
The `by` clause explicitly defines which labels should be kept in the output. All other labels are discarded, and series that share the exact same values for the `by` labels are grouped together.

```promql
# Calculates total HTTP requests, grouped by the HTTP status code
sum by (status) (rate(http_requests_total[5m]))
```

#### The `without` Clause (Opt-Out)
The `without` clause explicitly defines which labels to remove. Any labels *not* listed in the `without` clause are preserved, forming the grouping basis. This is incredibly useful when a metric has dozens of labels and you only want to aggregate away a specific high-cardinality label (like a pod IP or instance ID) while keeping everything else.

```promql
# Calculates CPU usage, removing the 'cpu' core ID to get total usage per instance
avg without (cpu) (rate(node_cpu_seconds_total[5m]))
```

### Visualizing Aggregation State Changes

To fully grasp how the query engine processes aggregations, consider the following plain-text representation of a `sum by (method)` operation:

```text
+-----------------------------------------------------------+
| RAW INSTANT VECTOR (Input)                                |
+-----------------------------------------------------------+
| http_requests{method="GET",  status="200", instance="A"} : 50 |
| http_requests{method="GET",  status="500", instance="B"} : 10 |
| http_requests{method="POST", status="200", instance="A"} : 30 |
| http_requests{method="POST", status="403", instance="C"} :  5 |
+-----------------------------------------------------------+
                              |
                              |  sum by (method) (...)
                              v
+-----------------------------------------------------------+
| AGGREGATED INSTANT VECTOR (Output)                        |
+-----------------------------------------------------------+
| {method="GET"}  : 60  (50 + 10)                           |
| {method="POST"} : 35  (30 + 5)                            |
+-----------------------------------------------------------+
```
Notice how the `status` and `instance` labels are entirely stripped from the final output, and the mathematical addition merges the series based strictly on the unique values of the `method` label.

### Common Pitfall: "Averaging Averages"

A frequent mistake made by beginners is using the `avg()` operator incorrectly when dealing with rates or averages derived from varying sample sizes.

**The Anti-Pattern:**
```promql
# WRONG: Do not average rates directly if instances have different traffic volumes
avg by (cluster) (rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))
```
If Instance A handles 10 requests at 1.0s latency, and Instance B handles 1,000 requests at 0.1s latency, a direct `avg()` of their latencies will give you `0.55s`. This is mathematically flawed because it weights Instance A and B equally, ignoring the massive difference in request volume. The true average is much closer to `0.1s`.

**The Correct Approach:**
To correctly aggregate mathematical averages across multiple series, always sum the numerator and sum the denominator *before* dividing.

```promql
# RIGHT: Sum the totals, then divide
sum by (cluster) (rate(http_request_duration_seconds_sum[5m])) 
/ 
sum by (cluster) (rate(http_request_duration_seconds_count[5m]))
```
This fundamental rule ensures your aggregated SLA and SLO metrics in Grafana remain mathematically accurate regardless of how your infrastructure scales.