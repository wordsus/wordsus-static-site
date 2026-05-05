Transitioning from a single-node deployment to a fully distributed VictoriaMetrics cluster is a major architectural milestone. While a standalone instance handles millions of data points effortlessly, true enterprise scale—demanding high availability, petabyte-scale retention, and multi-tenant isolation—necessitates a clustered approach. In this chapter, we bridge the gap between theory and practice. You will learn the end-to-end process of provisioning optimal infrastructure, wiring the stateless and stateful components together, and executing zero-downtime scaling operations to reliably master your dynamic workloads.

## 17.1 Provisioning the Cluster Infrastructure

Before executing a single VictoriaMetrics binary, the underlying infrastructure must be carefully designed and provisioned. Moving from a single-node deployment to a distributed cluster fundamentally shifts the operational burden from managing a single monolithic process to orchestrating a fleet of specialized nodes. Because VictoriaMetrics delegates much of its caching and data management to the operating system, the hardware and system-level configurations you choose at this stage directly dictate the ceiling of your cluster's performance.

While Chapter 19 covers Kubernetes-native deployments via the `vm-operator`, this section focuses on provisioning virtual machines (VMs) or bare-metal servers. This foundational knowledge applies whether you are using AWS, GCP, on-premises vSphere, or bare-metal racks.

### Infrastructure Topology and Component Sizing

As established in Chapter 16, a VictoriaMetrics cluster separates ingestion, storage, and querying into discrete components (`vminsert`, `vmstorage`, and `vmselect`). Because these components have vastly different resource profiles, co-locating them on the same servers in a production environment is an anti-pattern. Instead, you should provision distinct node pools optimized for each workload.

Here is a typical infrastructure topology for a highly available cluster:

```text
       [ Ingress / Load Balancer ]
               |         |
    +----------+         +----------+
    |                               |
[vminsert-01]                   [vminsert-02]   <-- Compute Optimized
    |   \                       /   |               (High CPU, Low RAM)
    |    \                     /    |
    |     +-------------------+     |           <-- 10Gbps+ LAN
    |     |                   |     |
[vmstorage-01]  [vmstorage-02]  [vmstorage-03]  <-- Storage Optimized
    |     |                   |     |               (NVMe SSDs, High RAM)
    |     +-------------------+     |           
    |    /                     \    |           <-- 10Gbps+ LAN
    |   /                       \   |
[vmselect-01]                   [vmselect-02]   <-- Balanced/Compute Optimized
    |                               |               (High CPU, Med-High RAM)
    +----------+         +----------+
               |         |
       [ Egress / Load Balancer ]
```

#### 1. Provisioning Storage Nodes (`vmstorage`)
The `vmstorage` nodes are the stateful heart of your cluster. They require the most capital investment and careful sizing.
* **Disk:** You must provision high-IOPS block storage. **NVMe SSDs are highly recommended.** If using cloud providers (like AWS EBS or GCP Persistent Disks), provision `io2` or `gp3` (AWS) / `pd-ssd` or `pd-extreme` (GCP) to guarantee baseline IOPS. Avoid network-attached rotational drives (HDDs) entirely, as merge operations and inverted index lookups will severely bottleneck.
* **Memory:** `vmstorage` relies heavily on the OS Page Cache to serve recently ingested data quickly. Provision instances with generous RAM.
* **CPU:** Moderate CPU is required for background data compression and merge operations.

#### 2. Provisioning Ingestion Nodes (`vminsert`)
`vminsert` nodes are entirely stateless. Their primary job is accepting incoming metrics, parsing protocols, applying consistent hashing, and routing data to `vmstorage`.
* **CPU:** This is a CPU-bound component. Provision compute-optimized instances (e.g., AWS `c6g` or `c6i` instances).
* **Memory & Disk:** Minimal memory is required. A small, standard root volume is sufficient since no metric data is stored locally.

#### 3. Provisioning Query Nodes (`vmselect`)
`vmselect` nodes are also stateless, but their resource usage is highly bursty depending on the complexity of the incoming PromQL/MetricsQL queries.
* **CPU & Memory:** Provision balanced or compute-optimized instances. Heavy aggregations across long time ranges will consume significant CPU and memory during query execution.
* **Disk:** While stateless regarding metric data, `vmselect` can utilize local disk for query caching. If you plan to enable disk-based query caching, attach a small, fast SSD.

### Network Provisioning

VictoriaMetrics components communicate aggressively over the network. 
* **Bandwidth:** Provision instances in the same availability zone or region where possible, utilizing a network capable of at least **10 Gbps**. 
* **Latency:** Sub-millisecond latency between `vminsert`/`vmselect` and `vmstorage` is critical. High latency will degrade ingestion throughput and slow down distributed queries.
* **Firewall/Security Groups:** At the infrastructure level, ensure your firewalls allow TCP traffic on the default ports: `8480` (vminsert), `8481` (vmselect), and `8482` (vmstorage for internal clustering), as well as `8400` and `8401` for `vmstorage` data routing. *(Note: Securing this traffic is covered in Chapter 22).*

### Operating System Tuning

Once the Linux VMs or bare-metal servers are provisioned, default OS settings are rarely sufficient for a high-performance time series database. You must apply the following tuning to the infrastructure prior to installing the VictoriaMetrics binaries.

#### File Descriptors
`vmstorage` handles thousands of concurrent connections and manipulates many small files during the MergeTree lifecycle. The default Linux limit of 1,024 open files will cause immediate crashes under load.

Update the system limits by creating a configuration file in `/etc/security/limits.d/`:

```bash
# /etc/security/limits.d/99-victoriametrics.conf
* soft    nofile      1048576
* hard    nofile      1048576
root    soft    nofile      1048576
root    hard    nofile      1048576
```

#### Disabling Swap
Time series databases prefer predictability. If a `vmselect` query unexpectedly consumes too much memory, it is better for the OS Out-Of-Memory (OOM) killer to terminate the stateless `vmselect` process (which can be instantly restarted) rather than swapping to disk and causing the entire node to lock up and become unresponsive.

Disable swap entirely on all cluster nodes:

```bash
# Disable immediately
sudo swapoff -a

# Ensure it persists across reboots by commenting out the swap line in fstab
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

#### Filesystem Configuration
For the attached data volumes on `vmstorage` nodes, format the disks using **ext4** or **xfs**. Avoid network file systems like NFS or clustered file systems like GlusterFS, as the latency jitter will cause unpredictable `vmstorage` behavior.

When mounting the data volume, use the `noatime` flag to prevent the OS from writing metadata updates every time a data block is read, which wastes disk IOPS:

```bash
# Example /etc/fstab entry for a vmstorage data disk
UUID=abc123xx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /var/lib/victoria-metrics-data  ext4  defaults,noatime  0  2
```

### Infrastructure as Code (IaC)

Because you are provisioning multiple distinct node types, manual server creation is highly discouraged. Best practices dictate using Infrastructure as Code tools like Terraform to ensure reproducibility. 

Below is an abstract Terraform snippet demonstrating the provisioning of a `vmstorage` node pool with attached IOPS-provisioned disks. Notice how it defines the specific requirements outlined above:

```hcl
resource "aws_instance" "vmstorage" {
  count         = 3
  ami           = data.aws_ami.ubuntu.id
  instance_type = "r6g.2xlarge" # Memory optimized

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  # Dedicated high-speed NVMe block for time series data
  ebs_block_device {
    device_name = "/dev/sdb"
    volume_size = 1000      # 1 TB
    volume_type = "io2"     # Guaranteed IOPS
    iops        = 5000
  }

  tags = {
    Name      = "vmstorage-node-${count.index + 1}"
    Component = "vmstorage"
  }
}
```

Once the physical or virtual hardware is instantiated, networked, and tuned at the OS level, your infrastructure is ready. The next step is securely linking these independent nodes together to form a cohesive, functioning cluster.

## 17.2 Configuring Component Interconnectivity

Once your infrastructure is provisioned and tuned, the next step is establishing the communication mesh between the VictoriaMetrics cluster components. In this architecture, `vmstorage` acts as the authoritative backend. Both `vminsert` and `vmselect` are completely stateless and act as clients that independently connect to the storage layer. 

Crucially, `vminsert` and `vmselect` do not communicate with each other, nor do the `vmstorage` nodes natively cluster or replicate data among themselves (unless explicitly configured for data re-routing). The intelligence of the cluster lies entirely in how the stateless nodes route data to the stateful ones.

### The Internal Port Bindings

Before configuring the interconnectivity flags, you must understand the dedicated ports `vmstorage` opens for internal cluster traffic. By default, a `vmstorage` node listens on three primary ports:

* **Port `8482` (HTTP):** Exposes internal metrics (`/metrics`), pprof profiles, and administrative APIs.
* **Port `8400` (TCP):** The `vminsert` protocol port. `vmstorage` listens here to accept incoming compressed data streams from `vminsert` nodes.
* **Port `8401` (TCP):** The `vmselect` protocol port. `vmstorage` listens here to accept distributed search queries from `vmselect` nodes.

### Wiring the Ingestion Path (`vminsert` to `vmstorage`)

When starting a `vminsert` process, you must explicitly tell it where the storage nodes are located. This is achieved using the `-storageNode` command-line flag. 

If you have provisioned three storage nodes, you provide a comma-separated list of their IP addresses or DNS names, appending the `8400` port:

```bash
# Example: Starting vminsert and pointing it to three storage nodes
/usr/local/bin/vminsert \
  -storageNode=10.0.1.11:8400,10.0.1.12:8400,10.0.1.13:8400 \
  -httpListenAddr=:8480
```

**Replication and Routing:**
By default, `vminsert` uses a consistent hashing algorithm based on the metric name and its labels to route a specific time series to a *single* `vmstorage` node. If you require High Availability for your data, you must configure replication directly at the `vminsert` level using the `-replicationFactor` flag.

```bash
# Replicate every incoming data point to at least 2 storage nodes
/usr/local/bin/vminsert \
  -storageNode=10.0.1.11:8400,10.0.1.12:8400,10.0.1.13:8400 \
  -replicationFactor=2
```

### Wiring the Query Path (`vmselect` to `vmstorage`)

Similarly, `vmselect` needs to know which storage nodes to query. When a user executes a PromQL query, `vmselect` fans out the request to all configured `vmstorage` nodes concurrently, gathers the partial results, merges them, and returns the final response.

Configure `vmselect` using its own `-storageNode` flag, this time targeting port `8401`:

```bash
# Example: Starting vmselect and pointing it to the same three storage nodes
/usr/local/bin/vmselect \
  -storageNode=10.0.1.11:8401,10.0.1.12:8401,10.0.1.13:8401 \
  -httpListenAddr=:8481
```

If you enabled `-replicationFactor` on the `vminsert` nodes, `vmselect` will automatically detect duplicate data points during the merge phase and deduplicate them on the fly, ensuring your query results remain accurate without requiring any additional configuration flags on the query side.

### Interconnectivity Topology Summary

The resulting logical interconnectivity can be visualized as follows:

```text
Incoming Metrics (Port 8480)                   User Queries (Port 8481)
          |                                              |
    [ vminsert ]                                   [ vmselect ]
          |                                              |
          | --- -storageNode=...:8400                    | --- -storageNode=...:8401
          |                                              |
          v                                              v
+-----------------------------------------------------------------------+
|                           [ vmstorage ]                               |
|                                                                       |
|   Port 8400 (TCP) <------------------ Accepts Write Streams           |
|   Port 8401 (TCP) <------------------ Accepts Query Searches          |
|   Port 8482 (HTTP)<------------------ Scrapes/Metrics                 |
+-----------------------------------------------------------------------+
```

### Best Practices for Connection Management

1.  **Use DNS over Static IPs:** In highly dynamic environments, passing static IP addresses to the `-storageNode` flag is fragile. VictoriaMetrics supports DNS `A` and `SRV` record resolution. You can pass a single DNS hostname (e.g., `-storageNode=vmstorage.local:8400`), and `vminsert`/`vmselect` will automatically discover all underlying IPs and dynamically update their connection pools if the DNS record changes.
2.  **Connection Pooling:** You do not need to deploy an internal load balancer (like HAProxy or Nginx) *between* `vminsert`/`vmselect` and `vmstorage`. The VictoriaMetrics components maintain persistent, highly optimized TCP connection pools internally. Placing a load balancer in the middle of this internal mesh will introduce unnecessary latency, break consistent hashing, and degrade performance. Load balancers should only be used at the edge of the cluster (routing external traffic into `vminsert` or `vmselect`).

## 17.3 Scaling Up Storage Nodes Dynamically

As your metric ingestion volume grows or your historical retention periods lengthen, you will eventually reach the disk space or IOPS limits of your existing `vmstorage` tier. VictoriaMetrics is designed to handle horizontal scaling gracefully, allowing you to add new storage nodes to a live cluster without incurring downtime.

Before executing a scaling operation, it is crucial to understand the architectural philosophy of VictoriaMetrics regarding data rebalancing.

### The No-Rebalancing Philosophy

In many distributed database systems (like Cassandra or Elasticsearch), adding a new storage node triggers an automatic background process that moves historical data from old nodes to the new one to balance the disk usage evenly. 

**VictoriaMetrics explicitly does not do this.** Automatic data rebalancing consumes massive amounts of network bandwidth, CPU, and disk I/O, often causing severe performance degradation on production clusters exactly when they are already under load. Instead, VictoriaMetrics relies on the stateless query layer to mask the underlying storage distribution.

When you add a new `vmstorage` node:
1. **Historical data stays where it is.** Your older nodes will remain at their current disk capacity.
2. **New data is distributed.** The `vminsert` nodes recalculate their consistent hashing ring. A proportional share of active time series will immediately start routing to the newly added, completely empty node.
3. **Queries remain transparent.** Because `vmselect` fans out queries to *all* configured `vmstorage` nodes and merges the results, it seamlessly pieces together a time series where the first half lives on an old node and the second half lives on the new node.

### The Step-by-Step Scaling Procedure

Because `vminsert` and `vmselect` operate independently, the order in which you update them is critical to prevent temporary data invisibility. **Always update `vmselect` before `vminsert`.** If you update `vminsert` first, it will begin writing new data points to the new storage node. Until `vmselect` is also updated to query that new node, those incoming data points will be invisible to users and alerting rules.

#### Step 1: Provision and Start the New Storage Node
Following the infrastructure guidelines from Chapter 17.1, provision your new server (e.g., `vmstorage-04` at `10.0.1.14`). Mount the high-performance disk and start the `vmstorage` process exactly as you did for the existing nodes.

```bash
# Starting the newly provisioned node
/usr/local/bin/vmstorage \
  -storageDataPath=/var/lib/victoria-metrics-data \
  -retentionPeriod=30d
```

At this stage, the node is running and listening on ports `8400` and `8401`, but it is entirely idle because the rest of the cluster does not know it exists.

#### Step 2: Update the Query Nodes (`vmselect`)
You must now instruct all `vmselect` instances to include the new node in their query fan-out. 

If you are using static IP addresses in your configuration, you must perform a rolling restart of your `vmselect` tier, appending the new IP to the `-storageNode` flag. Because `vmselect` is stateless, restarting it is completely safe and instantaneous.

```bash
# Previous configuration:
# -storageNode=10.0.1.11:8401,10.0.1.12:8401,10.0.1.13:8401

# New configuration for all vmselect nodes:
/usr/local/bin/vmselect \
  -storageNode=10.0.1.11:8401,10.0.1.12:8401,10.0.1.13:8401,10.0.1.14:8401 \
  -httpListenAddr=:8481
```

*Note: If you are using DNS-based discovery (e.g., `-storageNode=vmstorage.local:8401`), you simply update the DNS record to include the new IP address. `vmselect` will automatically resolve the new IP and open connections without requiring a restart.*

#### Step 3: Update the Ingestion Nodes (`vminsert`)
Finally, update the `vminsert` tier to start routing incoming metric streams to the new node. Perform a rolling restart of your `vminsert` instances, updating the `-storageNode` flag.

```bash
# New configuration for all vminsert nodes:
/usr/local/bin/vminsert \
  -storageNode=10.0.1.11:8400,10.0.1.12:8400,10.0.1.13:8400,10.0.1.14:8400 \
  -httpListenAddr=:8480
```

Once the `vminsert` process restarts, the consistent hashing ring updates immediately. You will see CPU and disk I/O activity spike on `vmstorage-04` as it begins receiving its share of the ingestion workload.

### Visualizing the Scaling Event

The following diagram illustrates the routing behavior before and after adding `vmstorage-04`.

```text
=================== STATE 1: BEFORE SCALING ===================

[Active Time Series: metric_A, metric_B, metric_C, metric_D]

vminsert (Consistent Hashing)
   |-- Routes metric_A ---> [vmstorage-01] (Disk: 85% full)
   |-- Routes metric_B ---> [vmstorage-02] (Disk: 82% full)
   |-- Routes metric_C ---> [vmstorage-03] (Disk: 88% full)
   |-- Routes metric_D ---> [vmstorage-01]

=================== STATE 2: AFTER SCALING ====================

[Added: vmstorage-04. Hashing ring recalculates.]

vminsert (Updated Hashing)
   |-- Routes metric_A ---> [vmstorage-01] (Disk stays at 85%)
   |-- Routes metric_B ---> [vmstorage-02] (Disk stays at 82%)
   |-- Routes metric_C ---> [vmstorage-04] <--- ROUTE SHIFTED!
   |-- Routes metric_D ---> [vmstorage-04] <--- ROUTE SHIFTED!

* Note: Historical data for metric_C and metric_D remains on 
  nodes 03 and 01. New data points land on node 04.

vmselect (Querying metric_C)
   |-- Queries node 01 (returns nothing)
   |-- Queries node 02 (returns nothing)
   |-- Queries node 03 (returns old data) ---\
   |-- Queries node 04 (returns new data) ----+--> Merges & returns
                                                   seamlessly to user.
```

### Handling Churn During Scaling

Because the routing of some existing time series changes immediately upon updating `vminsert`, the new `vmstorage` node will begin creating new inverted index entries and on-disk structures for series that previously lived elsewhere. 

This causes a temporary, localized spike in "active series churn." Your overall cluster memory usage may increase slightly for a few hours as both the old nodes and the new node maintain these series in their memory caches before the old nodes eventually flush the stale series to disk and drop them from RAM. Ensure your `vmstorage` nodes are provisioned with sufficient memory headroom (at least 20-30% free RAM) before initiating a scaling event to absorb this temporary metadata overlap.

## 17.4 Scaling Ingestion and Query Nodes for Throughput

While scaling `vmstorage` requires careful consideration of disk topology and data routing, scaling the ingestion (`vminsert`) and query (`vmselect`) tiers is remarkably straightforward. Because these components are entirely stateless, they can be scaled in and out elastically to match your organization's traffic patterns without any risk of data loss or inconsistency.

The fundamental strategy for scaling these tiers relies on standard infrastructure components: you place an array of stateless nodes behind a traditional Load Balancer (such as NGINX, HAProxy, AWS ALB, or GCP HTTP(S) Load Balancer) and route external traffic exclusively through that endpoint.

### Scaling the Ingestion Tier (`vminsert`)

The `vminsert` component is highly optimized but primarily CPU-bound. Its job involves decompressing incoming HTTP requests, parsing various text or binary protocols (like Prometheus remote_write or InfluxDB line protocol), applying relabeling rules, recalculating consistent hashes, and multiplexing the data streams out to `vmstorage`.

**When to scale `vminsert`:**
* CPU utilization consistently exceeds 80%.
* You observe HTTP 503 errors or connection timeouts on your Prometheus instances or `vmagent` shippers.
* Network interface limits (packets per second or bandwidth) are reached on existing ingestion nodes.

**How to scale:**
Simply provision a new compute instance, configure its `-storageNode` flags to point to your existing `vmstorage` tier (as covered in Section 17.2), and attach it to your ingestion load balancer's target group. Because `vminsert` caches nothing locally, it is immediately ready to process traffic the millisecond the process starts.

#### Load Balancing `vminsert` (HAProxy Example)
When configuring a load balancer for `vminsert`, round-robin routing is perfectly acceptable and generally recommended. Here is a baseline configuration using HAProxy:

```haproxy
frontend ingestion_front
    bind *:8480
    mode http
    default_backend vminsert_backend

backend vminsert_backend
    mode http
    balance roundrobin
    # Ensure connections are closed to distribute load evenly
    option httpclose
    # Health check the dedicated /health endpoint
    option httpchk GET /health
    server insert1 10.0.1.21:8480 check inter 2s
    server insert2 10.0.1.22:8480 check inter 2s
    server insert3 10.0.1.23:8480 check inter 2s
```

### Scaling the Query Tier (`vmselect`)

Scaling `vmselect` is driven by completely different workload characteristics than ingestion. Query load is notoriously unpredictable. A user loading a Grafana dashboard spanning the last 30 days can trigger a massive, sudden spike in CPU and RAM as `vmselect` merges and calculates rates across billions of data points.

**When to scale `vmselect`:**
* Query latency increases during peak business hours.
* The OS OOM (Out Of Memory) killer terminates the `vmselect` process due to overly complex aggregations.
* Increased concurrent user load from dashboarding tools or automated alerting (`vmalert`).

**How to scale:**
Similar to ingestion, provision new nodes, point them to the `vmstorage` tier via `-storageNode`, and add them to a query-facing load balancer. 

#### Considerations for Query Caching
While `vmselect` is technically stateless regarding metric data, it maintains an internal query cache (in memory and, optionally, on disk). This cache prevents VictoriaMetrics from recalculating identical queries.

If you scale from 2 to 10 `vmselect` nodes and use a simple round-robin load balancer, your cache hit rate will temporarily plummet because the same query might land on a different node each time. To optimize this, configure your query load balancer to use **IP Hash** or **Consistent Hashing based on the Request URI**. This ensures that the same Grafana dashboard panel consistently hits the same `vmselect` node, maximizing cache utilization.

### The Completed Cluster Architecture

With dynamic scaling implemented across all three tiers, your final production architecture represents a highly decoupled, robust mesh. 

```text
                     [ External Monitoring Ecosystem ]
                    /                                 \
      (Prometheus / vmagent)                     (Grafana / vmalert)
               |                                           |
    +----------------------+                    +----------------------+
    | Internal TCP/HTTP LB |                    | Internal TCP/HTTP LB |
    |   (Round Robin)      |                    |   (URI Hashing)      |
    +----------------------+                    +----------------------+
          |         |                                 |         |
     [vminsert] [vminsert] ...                   [vmselect] [vmselect] ...
   (Stateless ASG / Node Pool)                 (Stateless ASG / Node Pool)
          |         |                                 |         |
          +---------+---------------------------------+---------+
                    |                                 |
                    |      Internal Cluster Mesh      |
                    | (TCP Port 8400) (TCP Port 8401) |
                    v                                 v
    +------------------------------------------------------------------+
    |                         Stateful Tier                            |
    |                                                                  |
    |  [vmstorage-01]  [vmstorage-02]  [vmstorage-03]  [vmstorage-04]  |
    |   (NVMe Disks)    (NVMe Disks)    (NVMe Disks)    (NVMe Disks)   |
    +------------------------------------------------------------------+
```

### Automation and Auto-Scaling

Because `vminsert` and `vmselect` start up in less than a second, they are prime candidates for cloud-native Auto-Scaling Groups (ASGs).

To implement auto-scaling effectively:
1. **Create an Image:** Bake your OS tuning (from 17.1) and the VictoriaMetrics binary into an Amazon AMI, GCP Custom Image, or equivalent template.
2. **Define Triggers:** Set auto-scaling policies based on CPU utilization. A common practice is scaling out when average CPU exceeds 70% for 3 minutes, and scaling in when it drops below 30% for 15 minutes.
3. **Graceful Shutdown:** When an ASG scales down, ensure it sends a `SIGINT` or `SIGTERM` signal to the `vminsert`/`vmselect` process. VictoriaMetrics components will gracefully drain active connections and flush any tiny internal buffers before shutting down, ensuring zero interrupted queries or dropped metrics during scale-in events.