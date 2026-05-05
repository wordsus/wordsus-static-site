As monitoring infrastructure scales, managing isolated environments for different teams, departments, or customers becomes a major operational burden. Historically, this meant deploying and maintaining dozens of independent Prometheus servers. VictoriaMetrics cluster edition solves this through native, highly performant multi-tenancy. By pooling physical resources while enforcing strict logical data isolation via URL-based routing, you can consolidate your entire observability stack into a single unified cluster. In this chapter, we will explore multi-tenancy concepts, configure tenant routing structures, and execute powerful global cross-tenant queries.

## 18.1 Multi-Tenancy Concepts and Use Cases

As organizations scale their observability infrastructure, they inevitably face a critical architectural decision: how to handle metrics from completely separate teams, environments, or customers. Historically, the Prometheus ecosystem solved this by running isolated instances for every boundary—one Prometheus server for the frontend team, another for the backend team, and yet another for staging environments. While this ensures strict isolation, it leads to massive resource fragmentation, operational overhead, and a highly complex query landscape.

VictoriaMetrics cluster edition introduces **native multi-tenancy**, allowing you to consolidate all these disparate workloads into a single, unified storage cluster while maintaining strict logical boundaries between them. 

### The Core Concept of Multi-Tenancy

In a multi-tenant VictoriaMetrics cluster, a "tenant" is a logically isolated namespace for data. From the perspective of a user or an application querying the database, it appears as though they have their own dedicated time-series database. They cannot see, query, or accidentally impact the data of other tenants unless explicitly authorized to do so.

Behind the scenes, however, the underlying cluster components (`vminsert`, `vmstorage`, and `vmselect`) are shared. The infrastructure pools CPU, memory, and disk resources, dynamically allocating them to tenants based on active load. 

```text
+-----------------+       +------------------------------------+       +-----------------+
|   Ingestion     |       |    VictoriaMetrics Cluster         |       |    Querying     |
+-----------------+       |                                    |       +-----------------+
                          |                                    |
[Team A Scrapers] ------->|  +------------------------------+  |-------> [Team A Grafana]
                          |  |        Tenant A Data         |  |
[Team B Scrapers] ------->|  +------------------------------+  |-------> [Team B Grafana]
                          |  |        Tenant B Data         |  |
[Customer C Data] ------->|  +------------------------------+  |-------> [Customer C API]
                          |  |        Tenant C Data         |  |
                          |  +------------------------------+  |
                          +------------------------------------+
                          *Physically shared, logically isolated*
```

*Note: It is important to emphasize that native multi-tenancy is an exclusive feature of the VictoriaMetrics **Cluster** version. The single-node version does not support multi-tenant URL routing, as it is designed for simpler, high-throughput single-namespace deployments.*

### Primary Use Cases

The flexibility of logical data isolation within a shared physical cluster opens the door to several powerful architectural patterns.

#### 1. Software-as-a-Service (SaaS) and Platform Providers
If you are building a monitoring platform, a Managed Service Provider (MSP) offering, or an internal Platform-as-a-Service (PaaS), multi-tenancy is non-negotiable. You can assign each of your clients a dedicated tenant identifier. This guarantees that Client A cannot access Client B’s infrastructure metrics. Furthermore, it simplifies onboarding and offboarding; provisioning a new customer does not require spinning up new storage nodes or persistent volumes—it merely requires routing their data to a new tenant ID in the existing cluster.

#### 2. Enterprise Departmental Isolation
Large enterprises often struggle with the "noisy neighbor" problem in shared observability stacks. A development team testing a new application might accidentally introduce a cardinality explosion, writing millions of unique time series and degrading query performance for the production operations team. 

By utilizing multi-tenancy, an enterprise can place the operations team and the development team into separate tenants. While they share the hardware, VictoriaMetrics can enforce per-tenant limits (via configuration and tools like `vmauth`, which we will explore later) to ensure that a cardinality spike in the `dev` tenant does not crash the cluster or throttle the `prod` tenant's critical alerting dashboards.

#### 3. Environment Separation (Dev, Staging, Prod)
Rather than maintaining three completely separate VictoriaMetrics clusters for Development, Staging, and Production environments, infrastructure teams can run a single, highly available cluster and use multi-tenancy to separate the environments. 
* **Tenant 1:** Production
* **Tenant 2:** Staging
* **Tenant 3:** Development

This drastically reduces the total cost of ownership (TCO). Development and staging environments often have highly variable loads and do not justify the cost of dedicated, idle hardware. Pooling them into a single cluster maximizes resource utilization.

#### 4. Ephemeral Testing and CI/CD Pipelines
In modern CI/CD workflows, it is common to spin up ephemeral environments for integration testing. You can configure your pipeline to write telemetry from these short-lived environments to dynamically generated tenants. Because tenant creation in VictoriaMetrics is completely implicit (a tenant is created the moment data is written to its URL), pipelines can write to `Tenant 9991`, run their tests, assert the metrics, and exit. The data will naturally age out according to the cluster's retention policies, requiring zero database administration.

### The Advantage over Label-Based "Pseudo-Tenancy"

A common workaround in single-tenant systems like standard Prometheus is to inject a label, such as `tenant="team-a"`, into every metric. While this works for basic filtering, it is fraught with risks:

1.  **Security Leaks:** If a user forgets to append `tenant="team-a"` to their PromQL query, they might accidentally query data across all teams, leading to performance degradation and unauthorized data access.
2.  **Dashboard Complexity:** Every single Grafana dashboard and alerting rule must be meticulously updated to include the tenant label matcher.
3.  **Label Tampering:** Malicious or misconfigured clients can easily forge or overwrite labels during ingestion.

Native multi-tenancy entirely bypasses these issues. The separation happens at the URL path level during ingestion and querying. The user does not need to add a `tenant` label to their queries; the storage engine automatically confines their query scope to the data residing within their assigned tenant boundary.

## 18.2 Understanding the AccountID and ProjectID Structure

While some databases implement multi-tenancy through complex HTTP headers, authentication tokens, or enforced payload labels, VictoriaMetrics takes a remarkably straightforward and highly performant approach: **URL-path based routing**. 

When interacting with a VictoriaMetrics cluster, the tenant identity is explicitly defined within the HTTP request path itself. This design allows load balancers, reverse proxies, and the internal VictoriaMetrics components (`vminsert` and `vmselect`) to route traffic with virtually zero overhead.

### The Tenant URL Anatomy

To write data to or read data from a specific tenant, the URL must follow a strict pattern containing the `accountID` and, optionally, a `projectID`. 

The standard URL structures look like this:

**For Ingestion (via `vminsert`):**
```text
http://<vminsert>:8480/insert/<accountID>:<projectID>/<api_path>
```

**For Querying (via `vmselect`):**
```text
http://<vmselect>:8481/select/<accountID>:<projectID>/<api_path>
```

Let's break down the components of this structure:

* **`<accountID>` (Mandatory):** This is an arbitrary 32-bit integer (ranging from `0` to `4294967295`) that serves as the primary identifier for a tenant. For example, it could represent a specific customer in a SaaS application or a specific department in an enterprise.
* **`:<projectID>` (Optional):** This is also an arbitrary 32-bit integer. It acts as a sub-namespace within the `accountID`. If you omit the `:` and the `projectID` (e.g., `/insert/42/prometheus/api/v1/write`), VictoriaMetrics automatically defaults the `projectID` to `0`. 

Because these IDs are integers rather than strings, VictoriaMetrics can highly optimize the internal indexing and storage routing. The combination of `accountID` and `projectID` is integrated directly into the internal Time Series ID (TSID) of every metric, guaranteeing strict logical separation at the lowest storage level.

### Mapping IDs to Organizational Structures

How you assign `accountID` and `projectID` depends entirely on your architectural needs. The two-tier structure offers significant flexibility.

#### Scenario A: The MSP / SaaS Provider
If you are a Managed Service Provider handling multiple clients, the `accountID` typically maps to the Client, while the `projectID` maps to that client's specific environments.

```text
Client: Acme Corp (AccountID: 100)
 ├── Production  -> /insert/100:1/...
 ├── Staging     -> /insert/100:2/...
 └── Development -> /insert/100:3/...

Client: Globex (AccountID: 200)
 ├── Production  -> /insert/200:1/...
 └── QA          -> /insert/200:4/...
```

#### Scenario B: The Enterprise Internal Platform
For an internal platform team managing observability for a large engineering organization, the `accountID` might represent the business unit, while the `projectID` represents the microservice or team.

```text
Business Unit: E-Commerce (AccountID: 5)
 ├── Cart Service     -> /insert/5:10/...
 ├── Checkout Service -> /insert/5:20/...
 └── Catalog Service  -> /insert/5:30/...
```

### Configuration Examples

To put this into practice, here is how you would configure Prometheus to write data to two different tenants within the same VictoriaMetrics cluster.

**Prometheus `prometheus.yml` Configuration:**

```yaml
# Scraping configuration for Team A (Account 10, Project 1)
remote_write:
  - url: "http://vminsert:8480/insert/10:1/prometheus/api/v1/write"
    name: "team_a_storage"

# Scraping configuration for Team B (Account 20, Project 1)
remote_write:
  - url: "http://vminsert:8480/insert/20:1/prometheus/api/v1/write"
    name: "team_b_storage"
```

Similarly, when querying this data via Grafana, you would configure two separate Prometheus data sources, pointing to the respective `vmselect` endpoints:

* **Team A Data Source URL:** `http://vmselect:8481/select/10:1/prometheus`
* **Team B Data Source URL:** `http://vmselect:8481/select/20:1/prometheus`

### Implicit Creation and Lifecycle

One of the most powerful aspects of VictoriaMetrics' multi-tenancy is that **tenants do not need to be explicitly created or provisioned**. There is no API call required to "create tenant 42." 

The lifecycle works as follows:
1.  **Creation:** The moment `vminsert` receives the very first data point routed to `/insert/42:0/`, the tenant is implicitly created in memory and on disk by the `vmstorage` nodes.
2.  **Maintenance:** The cluster manages the metadata and indexing for this tenant automatically, keeping it strictly isolated from tenant `43:0`.
3.  **Deletion:** To delete a tenant and free up its disk space, you use a specific cluster API call to drop the tenant's data (`/delete/<accountID>:<projectID>/...`). Alternatively, if the tenant stops sending data, the data will simply age out and be deleted automatically once it surpasses the cluster's configured retention period.

## 18.3 Tenant Isolation at the Storage and Query Levels

When adopting a multi-tenant architecture, a critical question inevitably arises: *If all my teams and customers are sharing the same physical cluster, how does VictoriaMetrics guarantee that their data remains completely separate and secure?*

The answer lies in how VictoriaMetrics handles data isolation at both the internal storage layer and the query execution layer. Rather than relying on brute-force physical separation (like spinning up separate database instances or creating distinct file directories per tenant), VictoriaMetrics uses highly optimized logical isolation. This approach allows it to maintain strict security boundaries while achieving the extreme compression ratios it is famous for.

### Isolation at the Storage Level (`vmstorage`)

To understand storage-level isolation, we must look at how VictoriaMetrics structures its internal primary key, known as the **Time Series ID (TSID)**. 

When a metric arrives at the `vminsert` node, it includes the `AccountID` and `ProjectID` derived from the ingestion URL. Before the data is written to disk by the `vmstorage` nodes, VictoriaMetrics generates a unique TSID for that specific time series. 

Crucially, the tenant identifiers are cryptographically bound into the very beginning of this TSID structure.

```text
+-----------------------------------------------------------------------+
|                     Internal Time Series ID (TSID)                    |
+------------+------------+-----------------------+---------------------+
| AccountID  | ProjectID  | Metric Name Hash      | Labels Hash         |
| (32-bit)   | (32-bit)   | (64-bit)              | (64-bit)            |
+------------+------------+-----------------------+---------------------+
| e.g., 100  | e.g., 1    | hash("cpu_usage")     | hash("host=node1")  |
+------------+------------+-----------------------+---------------------+
```

This design unlocks a brilliant architectural advantage: **Tenants share the same underlying storage files.**

If VictoriaMetrics were to create separate directories or database files for every single tenant, an environment with 10,000 tenants would generate an explosion of tiny, fragmented files. This would exhaust file descriptors, ruin disk I/O performance, and destroy data compression. 

Instead, VictoriaMetrics writes data from multiple tenants into the same highly compressed blocks (parts) on disk. However, because the `AccountID` and `ProjectID` form the prefix of every single internal TSID, the inverted index maintains an absolute, unbreakable logical partition between them. A block of data on disk may contain metrics for Tenant A and Tenant B, but the index treats them as entirely parallel universes.

### Isolation at the Query Level (`vmselect`)

When a user executes a query, they send their request to a `vmselect` node using a tenant-specific URL (e.g., `/select/100:1/prometheus/api/v1/query`).

Because the tenant ID is defined at the routing layer, isolation at the query level is implicit and enforced before the query planner even parses the PromQL/MetricsQL expression. The process flows as follows:

1. **Request Interception:** The `vmselect` node extracts `AccountID=100` and `ProjectID=1` from the URL path.
2. **Query Parsing:** The user's query (e.g., `sum(rate(http_requests_total[5m]))`) is parsed into an Abstract Syntax Tree (AST).
3. **Index Lookup Bound:** `vmselect` broadcasts the search request to the `vmstorage` nodes. However, it hard-codes the `AccountID:ProjectID` prefix into the search filter.
4. **Data Retrieval:** The `vmstorage` nodes consult their inverted index. Because the search is strictly prefixed by the tenant ID, it is computationally impossible for the storage engine to return a TSID belonging to Tenant 200, even if the metric names (`http_requests_total`) are identical.

```text
[Grafana / User] 
       |
       |  GET /select/100:1/prometheus/api/v1/query?query=up
       v
[vmselect node]
       |
       |  Internal RPC: "Fetch 'up' strictly for AccountID=100, ProjectID=1"
       v
[vmstorage nodes]
       |
       |-- Scans Index: Only matches TSIDs starting with 100:1
       |-- Ignores TSIDs starting with 200:1, 100:2, etc.
       v
[Returns Isolated Data]
```

### The "Noisy Neighbor" Caveat

While data isolation is absolute—Tenant A cannot see Tenant B's data—**resource isolation** is not. 

Because VictoriaMetrics clusters pool CPU, memory, and network bandwidth across all tenants, a single misconfigured tenant writing millions of high-cardinality metrics can consume the cluster's resources, degrading performance for everyone else. 

To mitigate this, multi-tenant deployments must implement resource quotas. While the storage engine itself focuses purely on data isolation, you enforce resource isolation at the gateway level using tools like `vmauth` or `vmagent`. These tools allow you to configure strict rate limits, active series limits, and query concurrency limits on a per-tenant basis, ensuring that a spike in one tenant's environment does not compromise the stability of the entire cluster.

## 18.4 Cross-Tenant Querying and Data Aggregation

Strict tenant isolation is exactly what you want for end-users, but it poses a significant challenge for cluster administrators. If an infrastructure team needs to monitor the global health of the platform, calculate total resource usage across all clients for billing, or correlate an incident spanning multiple isolated microservice teams, querying each tenant individually and merging the results in the application layer is highly inefficient. 

To solve this, VictoriaMetrics provides a dedicated mechanism for **cross-tenant querying**, often referred to as a "global view," which allows authorized users to query data across multiple—or all—tenants simultaneously.

### The Multitenant API Endpoint

Historically, querying across tenants in the Prometheus ecosystem required standing up an external proxy layer like Promxy or Thanos Query. VictoriaMetrics natively supports this within the cluster via a specialized `vmselect` endpoint.

Instead of specifying the `AccountID` and `ProjectID` in the URL path, you replace the tenant identifier with the literal string `multitenant`.

**Standard Single-Tenant Query:**
```text
http://<vmselect>:8481/select/100:1/prometheus/api/v1/query?query=http_requests_total
```

**Global Cross-Tenant Query:**
```text
http://<vmselect>:8481/select/multitenant/prometheus/api/v1/query?query=http_requests_total
```

When a query is dispatched to the `multitenant` endpoint, `vmselect` fans out the request to the underlying `vmstorage` nodes, instructing them to bypass the strict tenant prefix filter and scan the inverted index across all stored tenants.

### Preventing Data Collisions: The Virtual Labels

A major risk of querying multiple tenants simultaneously is data collision. If Tenant A and Tenant B both write a metric named `cpu_usage_idle{host="node-1"}`, a global query for `cpu_usage_idle` would return two distinct time series with the exact same identity. In PromQL and MetricsQL, returning identical series identities for a single query results in a fatal "duplicate series found" error, halting the query execution.

VictoriaMetrics elegantly solves this by automatically injecting two virtual labels into the results of any query executed against the `/select/multitenant/` endpoint:

* `vm_account_id`
* `vm_project_id`

Therefore, the global query results will look like this:

```json
[
  {
    "metric": {
      "__name__": "cpu_usage_idle",
      "host": "node-1",
      "vm_account_id": "100",
      "vm_project_id": "1"
    },
    "value": [1678886400, "95.2"]
  },
  {
    "metric": {
      "__name__": "cpu_usage_idle",
      "host": "node-1",
      "vm_account_id": "200",
      "vm_project_id": "1"
    },
    "value": [1678886400, "88.1"]
  }
]
```

Because these labels are dynamically attached, the time series identities remain mathematically distinct, allowing aggregation functions to work seamlessly.

### Filtering and Aggregating Across Tenants

Once you are using the multitenant endpoint, you can leverage the `vm_account_id` and `vm_project_id` labels directly inside your MetricsQL selectors. This allows you to perform highly targeted cross-tenant aggregations.

**1. Aggregating data across a specific subset of tenants:**
If you want to sum the total memory usage of just three specific enterprise customers (Accounts 42, 45, and 99), you can use standard regex matchers:
```promql
sum(
  process_resident_memory_bytes{vm_account_id=~"42|45|99"}
)
```

**2. Finding the top 5 highest-consuming tenants:**
For billing and capacity planning, you can group by the account ID to see which tenants are using the most resources:
```promql
topk(5, 
  sum by (vm_account_id) (
    rate(http_requests_total[5m])
  )
)
```

**3. Cross-tenant mathematical correlation:**
If you need to calculate the ratio of errors in the backend tenant (Account 10) compared to the frontend tenant (Account 20):
```promql
  sum(rate(errors_total{vm_account_id="10"}[5m])) 
/ 
  sum(rate(errors_total{vm_account_id="20"}[5m]))
```

### Multitenant Data Ingestion

It is worth noting that VictoriaMetrics also offers a mirror endpoint for ingestion: `/insert/multitenant/`. 

Just as the global select endpoint dynamically attaches tenant labels to outgoing data, the global insert endpoint strips them from incoming data. If an administrator configures a centralized ingestion pipeline, they can push data to `http://<vminsert>:8480/insert/multitenant/prometheus/api/v1/write`. 

`vminsert` will look for the `vm_account_id` and `vm_project_id` labels attached to the incoming Prometheus metrics, strip those labels off, and use their values to route the metric to the correct internal tenant storage. 

### Security and Architectural Considerations

The introduction of the `multitenant` APIs completely bypasses the logical isolation boundaries discussed in previous sections. Therefore, securing these endpoints is paramount.

1.  **Strict Internal Access Only:** The `/select/multitenant/` endpoint must **never** be exposed to end-users or customer-facing Grafana instances. It should be firewalled and restricted exclusively to internal administration tools, global SRE dashboards, and automated billing cronjobs.
2.  **Using `vmauth` for Endpoint Protection:** In an enterprise architecture, you should place `vmauth` (the VictoriaMetrics authentication proxy) in front of `vmselect`. You can configure `vmauth` rules to ensure that only requests carrying an administrative Bearer Token or specific mTLS certificates are allowed to route to the `/select/multitenant/*` path, dropping all unauthorized attempts with an HTTP 403 Forbidden.
3.  **Performance Impact:** A query executed against the global multitenant endpoint without any `vm_account_id` filters forces `vmselect` to merge indexes across the entire cluster. For clusters with tens of thousands of tenants, this can generate significant CPU and network overhead. Global queries should be well-optimized and ideally pre-computed using Recording Rules to minimize heavy ad-hoc scanning.