While the standalone VictoriaMetrics binary is highly capable, ingesting millions of metrics per second or querying petabytes of data eventually requires horizontal scalability. This chapter dissects the VictoriaMetrics cluster architecture, which decouples the time series database into three specialized microservices: `vminsert` for ingestion, `vmstorage` for persistent data storage, and `vmselect` for query execution. We will explore how this shared-nothing design enables near-infinite scaling, guarantees high availability through jump consistent hashing, and eliminates the complex coordination overhead typical of traditional distributed systems.

## 16.1 The `vminsert` Component: Ingestion Routing

In a VictoriaMetrics cluster architecture, the `vminsert` component serves as the primary gateway for all incoming data. Unlike the single-node version where ingestion, storage, and querying are tightly coupled within a single binary, the cluster version decouples these responsibilities. `vminsert` takes ownership of the very first phase of the data lifecycle: accepting writes, parsing them, and reliably routing them to the distributed storage backend.

At its core, `vminsert` is a highly optimized, **stateless** application. It writes no metric data to its local disk and maintains no long-term state regarding the time series it processes. This stateless design is a deliberate architectural choice that makes `vminsert` exceptionally easy to scale and highly resilient to hardware failures.

### The Ingestion Flow

To understand the role of `vminsert`, it is helpful to visualize its position within the cluster topology:

```text
  [ Push Sources: vmagent, Prometheus, Telegraf, OpenTelemetry ]
                               |
                               v (HTTP / TCP / UDP)
                       [ Load Balancer ]
                         /           \
                        /             \
                       v               v
                [ vminsert ]       [ vminsert ]    <-- Stateless Routing Layer
                     |   \           /   |
                     |    \         /    |
                     |     \       /     | (VM RPC over TCP)
                     v      v     v      v
      [ vmstorage-1 ]  [ vmstorage-2 ]  [ vmstorage-3 ]    <-- Stateful Storage Layer
```

When a data source pushes metrics to the cluster, the lifecycle within `vminsert` follows a strict pipeline:

1. **Protocol Termination:** `vminsert` listens on various ports to terminate incoming connections. As discussed in Chapter 4, it natively understands multiple ingestion protocols (Prometheus `remote_write`, InfluxDB Line Protocol, Graphite, JSON, etc.). `vminsert` identifies the protocol based on the HTTP endpoint or port used by the client.
2. **Parsing and Validation:** The raw payload is parsed into internal VictoriaMetrics data structures. During this phase, `vminsert` validates the data, dropping malformed payloads, checking for wildly out-of-bounds timestamps, and ensuring the data conforms to expected metric formats.
3. **Tenant Identification:** Because the VictoriaMetrics cluster is inherently multi-tenant (detailed further in Chapter 18), `vminsert` extracts the `AccountID` and `ProjectID` from the request URL (e.g., `/insert/123/prometheus/api/v1/write` maps to `AccountID=123`). If no tenant is specified, it routes the data to a default tenant.
4. **Hashing and Routing:** This is the most critical function of `vminsert`. Once a metric data point (consisting of a metric name, labels, timestamp, and value) is parsed, `vminsert` must decide which `vmstorage` node should persist it. 

### Consistent Hashing and Sharding

To distribute the ingestion load and storage requirements evenly across the cluster, `vminsert` employs a consistent hashing algorithm. 

When a data point is processed, `vminsert` generates a unique 64-bit hash based on the **Tenant ID** and the **Time Series Identity** (the metric name combined with all its label key-value pairs). 

```go
// A simplified conceptual representation of the hashing logic
hash := GenerateHash(AccountID, ProjectID, MetricName, Labels)
storageNodeIndex := hash % NumberOfStorageNodes
```

This hash-based routing guarantees that all data points belonging to a specific time series for a specific tenant will *always* be routed to the same `vmstorage` node (assuming the cluster topology remains unchanged). This principle is crucial for the storage layer's efficiency, as it ensures that data points for a single time series are contiguous on disk, maximizing the effectiveness of the MergeTree-inspired compression algorithms discussed in Chapter 10.

*Note: The exact routing mechanics, including jump hash algorithms and how `vminsert` handles replication to multiple nodes simultaneously, will be explored in depth in Section 16.4.*

### Connection Management and Buffering

`vminsert` does not open a new connection to a `vmstorage` node for every incoming data point. That would introduce catastrophic latency overhead. Instead, it maintains a pool of persistent, highly optimized RPC connections (using an internal binary protocol over TCP) to all configured `vmstorage` instances.

When data points are routed, they are placed into in-memory buffers associated with their destination `vmstorage` nodes. `vminsert` batches these points and flushes them to the storage nodes asynchronously. 

This buffering mechanism provides a slight shock absorber against network latency spikes or micro-outages on the storage nodes. However, because `vminsert` is stateless, these buffers live entirely in RAM. If a `vminsert` process crashes or is forcefully restarted, any data points residing in its memory buffers that haven't yet been acknowledged by `vmstorage` will be lost. This is why pairing `vminsert` with a robust buffer upstream—like `vmagent` (Chapter 5)—is a recommended best practice.

### Configuration and Scalability

Deploying and scaling `vminsert` is straightforward. The primary configuration flag it requires is a list of the storage nodes it should route to:

```bash
./vminsert -storageNode=vmstorage-1:8400,vmstorage-2:8400,vmstorage-3:8400
```

Because it holds no state, scaling `vminsert` is simply a matter of spinning up more instances behind an HTTP load balancer. 

**Resource Profiling:**
* **CPU:** `vminsert` is highly CPU-bound. Parsing text-based protocols (especially InfluxDB Line Protocol or massive Prometheus remote_write Snappy payloads) and calculating hashes for millions of series per second requires significant compute power. 
* **Network:** It is also network-bound, acting as a proxy that takes in external HTTP traffic and outputs internal RPC traffic.
* **Memory:** Memory usage is generally low and stable, dictated primarily by the size of the internal routing buffers and the volume of active concurrent connections.
* **Disk:** Disk I/O is effectively zero.

If your cluster begins rejecting writes or load balancers report high latency during ingestion, but your `vmstorage` nodes show low CPU and disk utilization, the bottleneck is almost certainly at the `vminsert` layer. Adding more `vminsert` replicas or increasing their CPU allocation is the standard operational response.

## 16.2 The `vmstorage` Component: Distributed Data Nodes

If `vminsert` is the gateway and `vmselect` is the analytical engine, `vmstorage` is the bedrock of the VictoriaMetrics cluster. It is the only component in the cluster architecture that is inherently **stateful**. Its sole responsibility is to persist the incoming metric data to disk, maintain the inverted index for rapid lookups, and serve raw data back to the query layer when requested.

### The Shared-Nothing Architecture

The most defining characteristic of `vmstorage` is its strict "shared-nothing" design. Unlike traditional distributed databases (like Cassandra or Elasticsearch) where storage nodes constantly communicate to negotiate quorums, rebalance shards, or manage cluster state via gossip protocols, `vmstorage` nodes are completely oblivious to one another.

```text
       Ingestion Traffic (From vminsert)
               |                 |
               v                 v
        +-------------+   +-------------+
        |             |   |             |  <-- NO lateral communication
        | vmstorage-1 | X | vmstorage-2 |      between storage nodes
        |             |   |             |
        +-------------+   +-------------+
               ^                 ^
               |                 |
         Query Traffic (From vmselect)
```

This deliberate design choice yields massive operational advantages:
1. **Zero East-West Traffic:** Network bandwidth is reserved entirely for ingesting data and serving queries, rather than cluster management overhead.
2. **Infinite Horizontal Scalability:** Adding a new node does not increase the coordination complexity of the cluster.
3. **Blast Radius Isolation:** If `vmstorage-1` experiences a catastrophic hardware failure, `vmstorage-2` continues operating without any degraded performance caused by cluster recalculations or blocked quorum votes.

### How `vmstorage` Handles Operations

Because it does not coordinate with its peers, `vmstorage` relies entirely on `vminsert` and `vmselect` to act as the distributed routing logic.

**1. Handling Writes (Ingestion):**
When a `vmstorage` node receives a batch of time series data from `vminsert`, it temporarily holds it in a highly optimized in-memory buffer. Once the buffer fills, or a specific time interval passes, the node flushes the data to disk using the MergeTree-inspired structures detailed in Chapter 10. The node assumes that `vminsert` has routed the data correctly; it simply accepts the payload, compresses it, and writes it to its local directory (defined by the `-storageDataPath` flag).

**2. Handling Reads (Queries):**
When a user executes a PromQL query, `vmselect` broadcasts a request for raw data to the `vmstorage` nodes. The `vmstorage` node performs the heavy lifting:
* It searches its local inverted index to find which time series match the requested label selectors (e.g., `env="prod"`).
* It locates the corresponding compressed data blocks on disk.
* It decompresses the blocks, filters the data points by the requested time range, and streams the raw data points back to `vmselect` via a fast, internal RPC protocol.

### Storage Layout and Tenant Data

Because VictoriaMetrics is multi-tenant natively, `vmstorage` organizes its on-disk structures by `AccountID` and `ProjectID`. 

Inside the `-storageDataPath` directory, you will find a hierarchy structured roughly like this:

```text
/var/lib/victoria-metrics-data/
├── data/
│   ├── small/          # Unmerged, recent data blocks
│   └── big/            # Fully merged, highly compressed historical blocks
├── indexdb/            # The inverted index mapping labels to internal Time Series IDs
├── snapshots/          # Directory used for instant backups (vmbackup)
└── tmp/
```

Even though data is logically separated by tenant at the ingestion layer, `vmstorage` physically interleaves tenant data within these compressed blocks to maximize compression ratios. The inverted index ensures that data boundaries between tenants are strictly enforced during queries.

### Scaling and Data Distribution Truths

A critical concept to grasp about `vmstorage` is how it handles cluster expansion. Because of the shared-nothing architecture, **VictoriaMetrics does not automatically rebalance historical data** when you add a new `vmstorage` node to the cluster.

If you have a 2-node cluster and add a third `vmstorage` node:
1. `vminsert` recalculates its hash rings (discussed in Section 16.1) and immediately begins routing roughly 1/3 of *new* incoming data to the new node.
2. The historical data remains sitting exactly where it was on nodes 1 and 2.
3. `vmselect` simply queries all three nodes. 

This behavior is a feature, not a bug. Shuffling terabytes of historical data across a network to achieve perfect disk-usage symmetry is an expensive, risky operation that degrades database performance. VictoriaMetrics avoids this entirely. Over time, as old data hits its retention limit and is deleted, the disk usage across all nodes will naturally equalize.

### Resource Profiling for `vmstorage`

When provisioning hardware or Kubernetes pods for `vmstorage`, understand its resource priorities:

* **Storage/Disk (Primary Bottleneck):** `vmstorage` requires fast storage. NVMe SSDs or high-IOPS cloud block storage (like AWS EBS gp3) are strongly recommended. Using slow, spinning HDDs will severely bottleneck the inverted index lookups and background merging processes.
* **Memory (RAM):** Memory is heavily utilized, but not directly by the application heap. `vmstorage` relies aggressively on the OS Page Cache to keep frequently accessed index and data blocks in memory. Provision ample RAM, but expect the OS to report it as "cached" or "buff/cache."
* **CPU:** CPU is utilized primarily for the continuous background merging of data blocks (compression) and decompressing data on the fly during large analytical queries.

## 16.3 The `vmselect` Component: Merging Query Results

Completing the trifecta of the VictoriaMetrics cluster architecture is the `vmselect` component. If `vminsert` is responsible for writing data and `vmstorage` for keeping it safe, `vmselect` is the analytical engine responsible for retrieving, processing, and serving that data to users and dashboards. 

Like `vminsert`, `vmselect` is entirely **stateless**. It accepts incoming PromQL and MetricsQL queries via HTTP, fetches the necessary raw data from the stateful `vmstorage` nodes, computes the results in memory, and returns the formatted response to the client (typically Grafana or an alerting engine).

### The Scatter-Gather Architecture

Because `vmstorage` nodes do not communicate with each other, they lack a global view of the cluster's data. A single time series might have older data residing on `vmstorage-1` and newer data on `vmstorage-2` if the cluster was scaled up recently. 

To overcome this, `vmselect` employs a highly concurrent **scatter-gather** pattern:

```text
                      [ Grafana / VMUI / vmalert ]
                                   | (HTTP / PromQL)
                                   v
                         [ Load Balancer ]
                                   |
                                   v
                            [ vmselect ]   <-- The Query Engine
                              /    |    \
     (Scatter: Request    /      |      \   (Concurrent RPC calls)
      raw data blocks)  /        |        \
                      v          v          v
       [ vmstorage-1 ]    [ vmstorage-2 ]    [ vmstorage-3 ]
                      \          |          /
       (Gather: Stream  \        |        /   (Return filtered, compressed
        matching data)    \      |      /      raw data points)
                            v    v    v
                            [ vmselect ]   <-- Merging, Deduplication, and 
                                   |           PromQL/MetricsQL Evaluation
                                   v
                          (JSON Response)
```

When a query arrives, `vmselect` executes the following lifecycle:

1. **Parsing and Tenant Resolution:** The query is parsed, and the `AccountID` and `ProjectID` are extracted from the URL path.
2. **Scatter:** `vmselect` broadcasts a lightweight request to *all* configured `vmstorage` nodes simultaneously. It asks: *"Give me all raw data points for this tenant that match these label selectors within this specific time range."*
3. **Execution at the Storage Layer:** Each `vmstorage` node independently consults its inverted index, locates the relevant compressed blocks, and streams the raw, filtered data points back to `vmselect`.
4. **Gather and Merge:** As the raw data streams in, `vmselect` merges the timelines. If the cluster is configured for replication (e.g., a replication factor of 2), `vmselect` will inevitably receive duplicate data points from different storage nodes. It performs real-time deduplication based on timestamps and values to ensure accurate results.
5. **Evaluation:** Once the raw data is assembled, `vmselect` executes the requested PromQL/MetricsQL functions (like `rate()`, `sum()`, `histogram_quantile()`) in its local memory.
6. **Response:** The final computed time series or scalar values are serialized into JSON and returned to the client.

### Caching for High Performance

Because dashboards often refresh frequently with the exact same queries (just shifted by a few seconds or minutes), executing a full scatter-gather for every request would be incredibly wasteful. `vmselect` implements a sophisticated, multi-tiered caching mechanism to mitigate this.

* **Response Cache:** `vmselect` caches the final JSON responses for queries. If an identical query is received within a short time frame, it serves the cached response directly, bypassing the storage nodes entirely.
* **Rollup Cache:** This is VictoriaMetrics' secret weapon for rendering heavy dashboards quickly. If you query data over a 30-day period, `vmselect` caches the aggregated historical data. When you refresh the dashboard an hour later, `vmselect` only fetches the *new* raw data for the last hour from `vmstorage` and seamlessly merges it with the cached 30-day historical rollup.

These caches are maintained in RAM. If `vmselect` is restarted, the cache is wiped, and the first few queries will hit the storage nodes directly until the cache is warm again.

### Configuration and Scalability

Deploying `vmselect` requires pointing it at the cluster's storage nodes, using a syntax identical to `vminsert`:

```bash
./vmselect -storageNode=vmstorage-1:8401,vmstorage-2:8401,vmstorage-3:8401
```

*(Note that `vmselect` typically communicates with `vmstorage` on port `8401`, whereas `vminsert` uses `8400`.)*

**Resource Profiling:**
* **CPU:** `vmselect` is heavily CPU-bound during complex analytical queries. Sorting, merging, and applying complex math (like regex matching or standard deviation calculations) over millions of data points requires significant processing power.
* **Memory (RAM):** Memory consumption can spike dramatically during heavy queries. Because `vmselect` pulls raw data into memory to evaluate PromQL functions, queries that return high cardinality results (fetching millions of unique time series at once) will consume proportional RAM. VictoriaMetrics includes safeguards to terminate queries that exceed memory limits to prevent out-of-memory (OOM) crashes.
* **Network:** High network bandwidth is required to stream raw data blocks from the `vmstorage` nodes.

Scaling `vmselect` is as simple as launching additional instances and placing them behind an HTTP load balancer. Because it is stateless, query load is easily distributed. A common operational pattern is to isolate heavy analytical workloads from alerting workloads by routing Grafana users to one pool of `vmselect` nodes, and `vmalert` rules to a completely separate pool. This ensures that heavy user queries cannot starve the alerting infrastructure of resources.

## 16.4 Data Routing Algorithms and Replication Factors

As established in previous sections, the VictoriaMetrics cluster operates on a shared-nothing architecture where `vmstorage` nodes are completely unaware of one another. Because the storage nodes cannot coordinate data distribution or replicate data among themselves, the responsibility for data placement and high availability falls entirely on the routing logic within `vminsert` and the gathering logic within `vmselect`.

This section explores the mathematics of how `vminsert` guarantees deterministic routing, and how you can configure the cluster to survive hardware failures without losing data.

### The Problem with Simple Hashing

In Section 16.1, we introduced a simplified concept of hashing: `hash(TimeSeries) % NumberOfNodes`. While conceptually easy to understand, this modulo-based approach is disastrous in a dynamic cluster environment. 

Imagine a cluster with 3 `vmstorage` nodes. A time series hash calculates to `100`. `100 % 3 = 1` (Node 1). 
If you scale the cluster to 4 nodes to handle increased load, the math changes: `100 % 4 = 0` (Node 0). 

By simply adding one node, the destination for nearly *every single time series* in the cluster changes. Because VictoriaMetrics does not automatically shuffle historical data to match new routing topologies, queries would immediately become fragmented, and the system's efficiency would plummet.

### Jump Consistent Hashing

To solve this, `vminsert` utilizes a variant of **Jump Consistent Hashing**. This algorithm is specifically designed to minimize the number of keys that need to be remapped when the number of storage nodes (buckets) changes.

Instead of recalculating the destination for all time series, a jump consistent hash guarantees that when the cluster scales from *N* to *N+1* nodes, only `1 / (N+1)` of the data is re-routed to the new node. The remaining data continues flowing to its original destinations.

```text
Cluster Scaling Behavior (Jump Consistent Hash)

[ 2 Nodes ]                 [ 3 Nodes ]
Series A -> Node 1          Series A -> Node 1 (Unchanged)
Series B -> Node 2          Series B -> Node 2 (Unchanged)
Series C -> Node 1          Series C -> Node 3 (Re-routed to new node)
Series D -> Node 2          Series D -> Node 2 (Unchanged)
```

This mathematical stability is what allows you to add `vmstorage` nodes to a live VictoriaMetrics cluster without needing to perform expensive cluster rebalancing operations. 

### Understanding Replication Factors

While consistent hashing dictates *where* a single copy of data goes, it does not protect against node failures. If `vmstorage-1` suffers a catastrophic disk failure, all time series currently routed to it would be lost. 

VictoriaMetrics handles high availability natively via the **Replication Factor (RF)**, configured using the `-replicationFactor=N` flag.

Unlike complex quorum-based databases (like Cassandra or Elasticsearch), VictoriaMetrics implements replication in a brutally simple, highly efficient manner:

1. **Write Amplification at `vminsert`:** If you set `-replicationFactor=2`, `vminsert` takes the incoming data point, calculates its primary destination via the jump hash, and then calculates a secondary destination. It then writes the exact same data point to *both* `vmstorage` nodes simultaneously.
2. **Independent Storage:** The two `vmstorage` nodes receive the data and write it to their local disks independently. They do not communicate to verify the write.
3. **Read Deduplication at `vmselect`:** When a query arrives, `vmselect` broadcasts to all nodes. Because `RF=2`, it will receive the same data points from two different nodes. `vmselect` performs real-time deduplication based on exact timestamp and value matches, presenting a single, unified timeline to the user.

> **Important Configuration Note:** If you use replication, you **must** configure the `-replicationFactor=N` flag on *both* the `vminsert` and `vmselect` components, and the values must match. If `vmselect` is not aware of the replication factor, it may not apply the necessary deduplication logic aggressively enough, potentially skewing aggregation queries.

### Handling Node Failures and Rerouting

What happens when a storage node becomes unreachable in a replicated cluster? VictoriaMetrics prioritizes ingestion continuity over strict data placement.

Let's assume a cluster with 3 storage nodes and `-replicationFactor=2`. A time series is destined for Node 1 and Node 2. Suddenly, Node 2 goes offline due to a network partition.

1. `vminsert` attempts to send the replica to Node 2 and fails.
2. Instead of dropping the data or blocking the ingestion pipeline, `vminsert` dynamically **re-routes** the failed replica to an available node (in this case, Node 3).
3. The data point is now successfully stored on Node 1 and Node 3.
4. When Node 2 comes back online, `vminsert` reverts to the original routing topology.

```text
  Normal Operation (RF=2)          Node 2 Fails (Rerouting)
       [ vminsert ]                     [ vminsert ]
         /      \                         /      \
        /        \                       /        \ (Rerouted)
       v          v                     v          v
[ Node 1 ]     [ Node 2 ]        [ Node 1 ]     [ Node 3 ]
 (Active)       (Active)          (Active)       (Active)
                                       X [ Node 2 (DOWN) ]
```

During this outage, no data was lost. When `vmselect` queries the data, it will find the continuous timeline seamlessly merged from Node 1 (which holds the whole timeline) and Node 3 (which holds the rerouted segment).

### Choosing the Right Replication Factor

* **RF=1 (No Replication):** Ideal for non-critical environments (development, staging) or architectures where the underlying storage layer already provides high availability (e.g., relying on AWS EBS volume redundancy or Kubernetes persistent volume snapshots).
* **RF=2 (Standard HA):** The recommended setting for most production environments. It guarantees data survival if a single `vmstorage` node fails or is taken offline for maintenance. Note that RF=2 will double your disk space requirements and network bandwidth between `vminsert` and `vmstorage`.
* **RF=3 (Extreme Paranoia):** Used only in environments with extremely strict SLAs where surviving two simultaneous node failures is a business requirement. The storage overhead (3x) is rarely justified for standard observability workloads.