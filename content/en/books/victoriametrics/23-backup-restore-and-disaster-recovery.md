In the realm of time series databases, data loss is catastrophic. Whether storing financial metrics or infrastructure telemetry, a robust disaster recovery plan is non-negotiable. This chapter dives deep into the native backup and restore capabilities of VictoriaMetrics. 

We will explore how to leverage the highly optimized `vmbackup` and `vmrestore` utilities to secure your data with zero downtime. You will uncover the internal mechanics of instant snapshotting, design efficient incremental backup strategies, and master the process of restoring distributed clusters and integrating seamlessly with cloud object storage like S3 and GCS.

## 23.1 Utilizing the `vmbackup` and `vmrestore` Utilities

While it is technically possible to back up a stopped VictoriaMetrics node using standard operating system utilities like `rsync` or `tar`, time series databases operate continuously. Stopping the database for a backup disrupts data ingestion and querying. To solve this, VictoriaMetrics provides `vmbackup` and `vmrestore`—purpose-built, highly optimized, standalone Go binaries designed to safely and efficiently back up and restore data without interrupting database operations.

These utilities are strictly aware of the VictoriaMetrics storage architecture. They do not just copy files blindly; they orchestrate with the database's internal API to capture a consistent state of the data at a specific point in time. 

### The Backup Workflow

The `vmbackup` utility automates a multi-step process to ensure data consistency. Rather than reading the live data files directly (which are actively being written to and merged), `vmbackup` triggers the VictoriaMetrics snapshot API. 

```text
+-------------------+                          +-------------------+
| VictoriaMetrics   | 1. Request Snapshot      |                   |
| Node              | <----------------------- |     vmbackup      |
| (Live Data)       |                          |                   |
|                   | 2. Snapshot path returned|                   |
+-------------------+ -----------------------> +---------+---------+
          |                                              |
          | 3. Creates hard links                        | 4. Reads from
          |    (Instantaneous)                           |    snapshot path
          v                                              v
+-------------------+                          +-------------------+
| Temporary         |                          | Local Filesystem, |
| Snapshot Storage  | === (Data Transfer) ===> | S3, GCS, etc.     |
| (Read-Only)       |                          | (Destination)     |
+-------------------+                          +-------------------+
          |                                              |
          | 5. Delete Snapshot API call                  |
          +<---------------------------------------------+
```

Because snapshots rely on underlying OS-level hard links (a process explored deeply in Section 23.2), the creation of the snapshot is virtually instantaneous and requires zero downtime. `vmbackup` then copies the immutable snapshot data to the target destination and cleans up the snapshot once the transfer is complete.

### Using `vmbackup`

To initiate a backup, `vmbackup` requires three primary pieces of information: where the live data lives, how to reach the snapshot API, and where to store the backup.

Here is a standard invocation for a single-node instance backing up to a local filesystem mount:

```bash
vmbackup \
  -storageDataPath=/var/lib/victoria-metrics-data \
  -snapshot.createURL=http://localhost:8428/snapshot/create \
  -dst=fs:///mnt/backups/vm/latest
```

**Key Flags Explained:**
*   `-storageDataPath`: The absolute path to the directory where VictoriaMetrics stores its data. `vmbackup` needs this to locate the physical snapshot files once the API generates them.
*   `-snapshot.createURL`: The HTTP endpoint of the VictoriaMetrics node. For cluster versions, this must point to the specific `vmstorage` node you are backing up (e.g., `http://<vmstorage-host>:8482/snapshot/create`). 
*   `-dst`: The destination for the backup. Notice the `fs://` prefix; `vmbackup` uses URI schemes to determine the storage backend. (Integration with cloud providers like S3 and GCS via these URIs is covered in Section 23.5).

**Operational Safeguards:**
When running backups in a production environment, you must ensure the backup process does not starve the database of disk I/O or network bandwidth. `vmbackup` includes flags specifically for throttling:
*   `-maxBytesPerSecond`: Limits the backup speed.
*   `-concurrency`: Limits the number of concurrent worker threads reading and uploading files (defaults to the number of CPU cores).

### Using `vmrestore`

The `vmrestore` utility performs the inverse operation. However, there is one critical operational rule: **You must stop the VictoriaMetrics instance before restoring data.** 

VictoriaMetrics assumes it has exclusive control over its data directory. If you attempt to restore files into a directory while the database process is running, data corruption is highly likely.

A standard restoration process looks like this:

```bash
# 1. Stop the VictoriaMetrics service
systemctl stop victoriametrics

# 2. Run the restore utility
vmrestore \
  -src=fs:///mnt/backups/vm/latest \
  -storageDataPath=/var/lib/victoria-metrics-data

# 3. Start the service
systemctl start victoriametrics
```

**Key Flags Explained:**
*   `-src`: The URI pointing to the backup destination you previously specified in the `-dst` flag of `vmbackup`.
*   `-storageDataPath`: The local path where the restored data should be written. 

If the `-storageDataPath` already contains data, `vmrestore` is designed to be safe: it will merge the restored data with the existing data. However, if the existing data is corrupted or you are attempting a clean disaster recovery, it is strongly recommended to clear the `-storageDataPath` completely before executing `vmrestore`. 

Like the backup utility, `vmrestore` also respects the `-maxBytesPerSecond` and `-concurrency` flags, allowing you to throttle the restore process if you are restoring to a live storage area network (SAN) or shared disk that shouldn't be overwhelmed.

## 23.2 The Underlying Instant Snapshotting Process

To fully trust your backup strategy, it is crucial to understand *how* VictoriaMetrics achieves zero-downtime, instantaneous snapshots. A database processing millions of data points per second cannot afford to pause writes while terabytes of data are copied to a backup server. 

VictoriaMetrics solves this elegantly by leveraging a fundamental feature of POSIX-compliant file systems (like ext4, XFS, and ZFS): **hard links**, combined with the strict **immutability** of its own storage engine design.

### The Magic of Hard Links

In a Linux file system, a file consists of two parts: the actual data stored on the physical disk (represented by an **inode**), and the file name in a directory that points to that inode. 

A hard link is simply an additional directory entry that points to the *exact same inode*. 

```text
Live Data Directory (/data)           Snapshot Directory (/snapshots/001)
---------------------------           -----------------------------------
part-001.data (Link Count: 2) <----+       
                                   |       
                                   |-----> part-001.data (Link Count: 2)
                                   |
[ Physical Disk: Inode #84729 (Actual Metric Data) ]
```

When you create a hard link, the OS does not copy the physical data. It merely creates a new pointer. This operation takes fractions of a millisecond, regardless of whether the file is 1 Megabyte or 100 Gigabytes. 

### Why This Works: Immutability

Hard links alone are not enough for safe database snapshots. If a process modifies a file after a hard link is created, the changes are visible through all links, destroying the point-in-time consistency of the snapshot. 

This is where the VictoriaMetrics storage architecture (discussed in Chapter 10) shines. The VictoriaMetrics data directory is composed of "parts" (partitions of data). **Once a part is written to disk, it is strictly immutable.** It is never modified, appended to, or truncated. 

When new data arrives, it is written to *new* parts. When VictoriaMetrics optimizes storage, it reads multiple small parts, merges them in memory, writes out a brand new large part, and then deletes the old small parts. Because the data files are immutable, a hard link is a perfectly safe, mathematically sound snapshot.

### Step-by-Step API Execution

When `vmbackup` (or an administrator) calls the `http://<host>:8428/snapshot/create` API, the following sequence occurs internally in a matter of milliseconds:

1.  **Flush:** VictoriaMetrics flushes all in-memory buffers to disk, ensuring all recently ingested data is persisted as immutable parts.
2.  **Pause:** Background merge processes are briefly paused to prevent parts from being deleted during the snapshot creation.
3.  **Link:** The engine traverses the active data directory and creates hard links for every single file inside a new directory located at `<-storageDataPath>/snapshots/<snapshot-name>`.
4.  **Resume:** The merge processes are unpaused, and normal database operations continue uninterrupted.
5.  **Return:** The API returns the name of the snapshot directory to the caller.

### Disk Space Dynamics and the "Merge Penalty"

A common misconception is that snapshots consume massive amounts of disk space. Because they rely on hard links, **a freshly created snapshot consumes exactly zero additional bytes of physical disk space.** 

However, you must account for the lifecycle of the data *after* the snapshot is created. 

As VictoriaMetrics continues to operate, it will perform background merges. It will write a new merged part and attempt to delete the old parts. 
*   In a normal state, deleting the old parts frees up disk space.
*   If a snapshot exists, deleting the live database's reference to the old parts *reduces the link count from 2 to 1*. The actual file remains on disk because the snapshot directory still holds a hard link to it.

```text
Time T+0: Snapshot Created
Live DB Size: 100GB | Snapshot Size: 0GB (Shared Inodes) | Total Disk Used: 100GB

Time T+1: Database merges two 10GB parts into one 15GB part (compression)
Live DB Size: 95GB  | Snapshot Size: 20GB (Retained old parts) | Total Disk Used: 115GB
```

**Operational Warning:** If you leave a snapshot sitting on the disk indefinitely, the active database will continue to merge and replace files. Over time, the snapshot will force the OS to retain the old, unmerged files, causing your overall disk usage to balloon. Snapshots are meant to be ephemeral: create them, immediately copy the data off-site via `vmbackup`, and then delete them via the `http://<host>:8428/snapshot/delete` API.

## 23.3 Managing Incremental vs. Full Backups

In traditional relational databases, administrators must carefully orchestrate backup schedules, typically alternating between resource-heavy weekly "full" backups and daily "incremental" or "differential" backups. VictoriaMetrics vastly simplifies this paradigm. Because of the immutable nature of its storage engine, `vmbackup` performs incremental backups natively, automatically, and with near-zero computational overhead.

There are no special `--incremental` flags to pass to the utility. The distinction between a full and incremental backup is determined entirely by how you manage the destination path.

### The Mechanics of Automatic Incrementals

When you execute `vmbackup`, the utility generates an instantaneous snapshot (as detailed in Section 23.2) and begins comparing the local files in that snapshot with the files already present at the destination (`-dst`).

Because VictoriaMetrics data parts are strictly immutable, their filenames—which are deterministically generated based on their contents—never change. If a part named `3B7A91F...` exists in the local snapshot and is also found at the destination, `vmbackup` knows with 100% certainty that the file has not been modified. It skips it entirely.

```text
Run 1 (Monday): 
Local Snapshot has Parts A, B, C.
Destination is empty.
vmbackup action: Uploads A, B, C. (Effectively a Full Backup)

Run 2 (Tuesday):
Local Snapshot has Parts A, B, C, and new Part D.
Destination has A, B, C.
vmbackup action: Uploads ONLY Part D. (Effectively an Incremental Backup)
```

This file-level deduplication means that running `vmbackup` every hour to the same destination path is highly efficient. It only transfers the raw data ingested since the last successful execution.

### The "Merge Bloat" Challenge

While running endless incremental backups to a single destination is fast, it introduces a storage lifecycle problem at the destination.

VictoriaMetrics continuously performs background merges to optimize query performance, combining smaller data parts into larger, compressed parts. 
1. The database merges Parts A, B, and C into a new, larger Part E.
2. The active database deletes Parts A, B, and C.
3. The next time `vmbackup` runs, it uploads the new Part E to the destination.

However, `vmbackup` does **not** automatically delete Parts A, B, and C from the backup destination. It assumes you might want to restore to an older point in time. Over weeks and months, these redundant, pre-merged parts accumulate, causing the size of your backup destination to bloat significantly beyond the size of your active database.

### Designing a Backup Rotation Strategy

To solve the merge bloat problem, you must periodically force a new full backup and retire older backup chains. You achieve this by dynamically changing the `-dst` path.

A standard enterprise strategy involves creating a new backup "chain" (a new destination directory or cloud storage prefix) on a regular cadence, such as weekly or monthly, and applying lifecycle rules to delete old chains.

**Example: Monthly Full, Daily Incremental Strategy**

You can configure your backup cron job or Kubernetes CronJob to inject the current year and month into the destination path:

```bash
#!/bin/bash
# Generate a prefix like "2023-10"
CURRENT_MONTH=$(date +%Y-%m)

vmbackup \
  -storageDataPath=/var/lib/victoria-metrics-data \
  -snapshot.createURL=http://localhost:8428/snapshot/create \
  -dst=s3://my-company-backups/vm-cluster/${CURRENT_MONTH}
```

This creates a distinct storage architecture over time:

```text
S3 Bucket: my-company-backups/vm-cluster/
├── /2023-09/      (Started Sep 1: Initial full upload, daily incrementals until Sep 30)
├── /2023-10/      (Started Oct 1: Initial full upload, daily incrementals until Oct 31)
└── /2023-11/      (Currently Active: Receiving today's incremental parts)
```

**Managing Retention:**
With this structure, you do not need to rely on VictoriaMetrics to prune individual files. Instead, you use the native lifecycle management tools of your storage provider (e.g., AWS S3 Lifecycle Rules, or a simple `rm -rf` on a local NAS) to delete the entire `/2023-09/` prefix once it falls outside your required disaster recovery retention window. 

This strategy guarantees that your backups remain highly efficient on a daily basis, while preventing uncontrolled storage costs over the long term.

## 23.4 Restoring Data to a New Cluster Environment

Restoring a single-node VictoriaMetrics instance is a straightforward 1-to-1 operation. However, restoring a distributed cluster—whether for disaster recovery, migrating to a new cloud provider, or cloning a production environment for load testing—requires understanding how data is sharded across the architecture.

In a VictoriaMetrics cluster (as detailed in Chapter 16), data persistence is handled exclusively by the `vmstorage` nodes. The `vminsert` and `vmselect` components are entirely stateless. Therefore, cluster restoration is essentially the coordinated restoration of multiple `vmstorage` instances.

### The Cluster Backup Layout

When you back up a VictoriaMetrics cluster, you do not take a single monolithic backup. Instead, you run `vmbackup` independently against the snapshot API of *each* `vmstorage` node. 

Consequently, your backup destination (e.g., an S3 bucket) will typically contain separate subdirectories or prefixes for each node:

```text
s3://my-company-backups/prod-cluster/
├── storage-node-0/
│   └── 2023-10/  (Contains backup files for node 0)
├── storage-node-1/
│   └── 2023-10/  (Contains backup files for node 1)
└── storage-node-2/
    └── 2023-10/  (Contains backup files for node 2)
```

### Scenario 1: Restoring with an Identical Topology (1-to-1)

The simplest restoration scenario involves spinning up a new cluster with the exact same number of `vmstorage` nodes as the original cluster.

**Step-by-step Execution:**

1.  **Provision the New Cluster:** Deploy your new `vminsert`, `vmselect`, and `vmstorage` nodes. 
2.  **Stop Storage Services:** Before writing any data, you must stop the `vmstorage` daemon on all target nodes. Restoring into a running `vmstorage` process will cause severe data corruption.
3.  **Execute `vmrestore`:** On each individual `vmstorage` server, run the `vmrestore` utility, pointing it to the corresponding backup prefix.

*Command executed on `new-storage-node-0`:*
```bash
vmrestore \
  -src=s3://my-company-backups/prod-cluster/storage-node-0/2023-10 \
  -storageDataPath=/var/lib/victoria-metrics-data
```

*Command executed on `new-storage-node-1`:*
```bash
vmrestore \
  -src=s3://my-company-backups/prod-cluster/storage-node-1/2023-10 \
  -storageDataPath=/var/lib/victoria-metrics-data
```

4.  **Start Services:** Once `vmrestore` completes on all nodes, start the `vmstorage` services. The stateless `vmselect` nodes will immediately connect and begin serving queries against the restored data.

### Scenario 2: Restoring to a Different Topology (Topology Mismatch)

A unique and highly advantageous feature of the VictoriaMetrics architecture is that **historical data does not strictly belong to a specific node to be readable.** 

Because `vmselect` broadcasts every query to *all* configured `vmstorage` nodes and merges the results on the fly, it does not matter which physical storage node holds a specific historical metric. This allows you to restore a backup to a cluster with a different number of nodes.

#### Scaling Down (e.g., Restoring 3 nodes of data to a 2-node DR cluster)

If you are restoring a large production cluster to a smaller, scaled-down Disaster Recovery (DR) environment, you can safely merge multiple backup sources into a single new `vmstorage` node.

```text
[ Backup Source ]                    [ New DR Cluster ]
storage-node-0-backup  ==========>   new-dr-node-0
storage-node-1-backup  ==========>   new-dr-node-1
storage-node-2-backup  ==========>   new-dr-node-1 (Merged!)
```

To achieve this, you simply run `vmrestore` multiple times consecutively on the same target node, pointing to different sources. VictoriaMetrics uses deterministic UUIDs for its data parts, meaning there will be no filename collisions. The restored parts will safely sit side-by-side in the `/var/lib/victoria-metrics-data` directory, and the background merge process will eventually optimize them upon startup.

#### Scaling Up (e.g., Restoring 3 nodes of data to a 5-node cluster)

If you are migrating to a larger cluster to handle increased future throughput, you only need to restore data to 3 of the 5 new nodes. 

```text
[ Backup Source ]                    [ New Upgraded Cluster ]
storage-node-0-backup  ==========>   new-storage-node-0
storage-node-1-backup  ==========>   new-storage-node-1
storage-node-2-backup  ==========>   new-storage-node-2
(No historical data)                 new-storage-node-3
(No historical data)                 new-storage-node-4
```

When you bring the cluster online:
*   `vmselect` will query all 5 nodes. Nodes 3 and 4 will return empty results for historical time ranges, while Nodes 0, 1, and 2 will return the restored data. 
*   `vminsert` will begin hashing new incoming data evenly across all 5 nodes. 

Over time, as the retention period expires, the historical data on Nodes 0, 1, and 2 will age out, and the cluster's data distribution will naturally balance itself across all 5 nodes.

### Handling Replication

If your original cluster was configured with replication (e.g., `-replicationFactor=2` on `vminsert`), your backup data already contains duplicate parts. If you restore this data to a new cluster, the historical data will maintain its replicated state. 

However, if you deliberately merge multiple nodes' backups onto a single node in a DR scenario, you are bypassing the physical separation that replication provides. While the database will function perfectly, the redundancy of that specific historical data is lost until new data is ingested by the DR cluster's `vminsert` nodes.

## 23.5 Integrating with Cloud Object Storage (S3, GCS)

Local disk backups are sufficient for temporary snapshots or on-premise arrays, but for true disaster recovery and long-term retention, shipping data off-site is mandatory. Cloud object storage—such as Amazon S3, Google Cloud Storage (GCS), and Azure Blob Storage—provides virtually infinite scalability, high durability (often 11 nines), and cost-effective archiving tiers.

The `vmbackup` and `vmrestore` utilities are built with native, highly optimized clients for these cloud storage providers. They do not require intermediate shell scripts, `aws-cli`, or `gsutil` to transfer data. 

### The Direct-to-Cloud Architecture

When backing up to cloud storage, `vmbackup` reads the instant snapshot from the local disk and streams the immutable data parts directly to the cloud provider's API.

```text
+-------------------+       +-------------------+       +-----------------------+
| vmstorage Node    |       | vmbackup Utility  |       | Cloud Object Storage  |
| /data/snapshots/  | ====> | (Memory Buffers)  | ====> | (S3, GCS, MinIO)      |
| (Local NVMe/SSD)  |       |                   |       | s3://bucket/prefix/   |
+-------------------+       +-------------------+       +-----------------------+
```

Because VictoriaMetrics deduplicates data at the file level (as discussed in Section 23.3), the utility first queries the cloud bucket to list existing files. It then only streams the parts that are missing in the cloud, saving immense amounts of network bandwidth and cloud API request costs.

### Backing Up to Amazon S3 (and S3-Compatible Stores)

To use Amazon S3, you prefix your destination path (`-dst`) with `s3://`.

**Authentication:**
`vmbackup` automatically integrates with standard AWS authentication mechanisms. You do not pass plaintext keys as command-line flags. Instead, the utility will look for credentials in the following order:
1. Environment variables (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).
2. The shared credentials file (`~/.aws/credentials`).
3. IAM Roles attached to the EC2 instance or Kubernetes Pod (IRSA). This is the recommended approach for production environments.

**Standard S3 Backup Execution:**
```bash
vmbackup \
  -storageDataPath=/var/lib/victoria-metrics-data \
  -snapshot.createURL=http://localhost:8428/snapshot/create \
  -dst=s3://my-company-metrics-backup/cluster-01/node-0
```

#### Connecting to Custom S3 Endpoints (MinIO, Ceph)
If you are running an on-premise S3-compatible storage system like MinIO or Ceph, you must explicitly tell `vmbackup` not to route traffic to AWS servers. You do this using the `-customS3Endpoint` flag.

```bash
vmbackup \
  -storageDataPath=/var/lib/victoria-metrics-data \
  -snapshot.createURL=http://localhost:8428/snapshot/create \
  -dst=s3://local-minio-bucket/node-0 \
  -customS3Endpoint=http://minio.internal.svc:9000
```

### Backing Up to Google Cloud Storage (GCS)

For Google Cloud, use the `gcs://` prefix. 

**Authentication:**
Similar to AWS, `vmbackup` relies on Google's standard credential discovery. It will look for the `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account JSON key file, or it will use the default service account attached to the Compute Engine instance or GKE Workload Identity.

**Standard GCS Backup Execution:**
```bash
vmbackup \
  -storageDataPath=/var/lib/victoria-metrics-data \
  -snapshot.createURL=http://localhost:8428/snapshot/create \
  -dst=gcs://my-gcp-metrics-backup/cluster-01/node-0
```

### Advanced Cloud Tuning and Best Practices

When operating across wide area networks (WAN) to cloud providers, network latency and throughput become the primary bottlenecks.

**1. Tuning Concurrency and I/O**
By default, `vmbackup` sets its concurrency to the number of CPU cores. When uploading over a high-bandwidth connection to S3/GCS, you might want to increase this to saturate the network link. Conversely, if the backup is competing with live database traffic for outbound bandwidth, you should throttle it.
*   `-concurrency=16`: Increases the number of parallel upload streams.
*   `-maxBytesPerSecond=104857600`: Throttles the upload to 100 MB/s.

**2. Leveraging Cloud Storage Tiers**
You should **not** rely on VictoriaMetrics to move old backups to cheaper storage tiers (like AWS Glacier or GCS Coldline). 
Instead, push the backups to a standard tier bucket and configure **Storage Lifecycle Rules** directly within the AWS or GCP console. For example:
*   Day 0 - 30: Keep backups in S3 Standard (fast restoration).
*   Day 31 - 90: Transition to S3 Standard-IA (Infrequent Access).
*   Day 91+: Expire and delete the backup.

**3. Server-Side Encryption**
If your compliance requirements dictate that data must be encrypted at rest in the cloud, you configure this at the bucket level. Both S3 and GCS allow you to set default bucket encryption (e.g., AWS KMS). When `vmbackup` streams the files, the cloud provider will seamlessly encrypt them as they land on their storage arrays without requiring any additional configuration on the VictoriaMetrics side.