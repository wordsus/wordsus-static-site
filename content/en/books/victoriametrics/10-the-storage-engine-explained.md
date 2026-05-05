At the heart of VictoriaMetrics lies a ruthlessly efficient, custom-built storage engine. While APIs and ingestion protocols dictate how data enters the system, the storage layer defines its ultimate performance and scalability. In this chapter, we peel back the architectural layers to uncover how VictoriaMetrics effortlessly ingests millions of data points per second. We will explore its MergeTree-inspired design, the balance between high-speed in-memory buffers and immutable on-disk structures, the mechanics of inverted indexes for rapid lookups, and the aggressive compression algorithms under the hood.

## 10.1 MergeTree-Inspired Design Principles

To truly understand how VictoriaMetrics achieves its remarkable ingestion throughput and query performance, we must examine the foundation of its storage engine. Unlike traditional relational databases that rely on B-Tree variants, or general-purpose NoSQL databases that use standard Log-Structured Merge-trees (LSM), VictoriaMetrics utilizes a custom storage architecture heavily inspired by ClickHouse’s **MergeTree** family of table engines. 

This design choice is not accidental; time-series data exhibits a distinct lifecycle. It is almost exclusively append-only, is typically ingested in chronological order, and requires massive sequential scan speeds for aggregation queries over long time ranges. The MergeTree philosophy is uniquely suited to these characteristics.

### The Concept of Immutable Data Parts

At the core of the MergeTree design is the concept of **immutable parts**. When VictoriaMetrics flushes data from its in-memory buffers (which we will detail in Section 10.2) to persistent storage, it writes this data as a self-contained, read-only directory on disk called a *part*. 

Once a part is written to disk, it is never modified in place. If an update or a deletion is required—which is rare in time-series workloads but possible—it is handled via separate mechanisms (like writing a new version or a tombstone) rather than mutating the existing file. 

This immutability provides several critical advantages:
* **Lock-Free Reads:** Queries can read data from parts without acquiring read locks, completely eliminating read-write contention.
* **Mechanical Sympathy:** Data is written sequentially to disk in large blocks, maximizing write throughput on both SSDs and rotational HDDs.
* **Crash Resilience:** Because existing files are never overwritten, power failures or process crashes cannot corrupt already-persisted data.

### The Background Merge Process

If VictoriaMetrics only ever appended new parts, the disk would quickly fill with thousands of tiny files. This would exhaust file descriptors (inodes) and degrade query performance, as every read operation would need to open and scan a multitude of small files. 

To prevent this, the storage engine employs continuous, background **Merge Workers**. These workers scan the disk for smaller data parts and merge them together into larger, more highly optimized parts.

Here is a plain text representation of how the background merge process consolidates data:

```text
Time -------->

Level 0 (Recent Flushes)    Level 1 (First Merge)        Level 2 (Deep Merge)

[Part A: 10MB] \
                ---(Merge)---> [Part D: 25MB] \
[Part B: 15MB] /                               \
                                                ---(Merge)---> [Part F: 75MB]
[Part C: 20MB] ----------------[Part C: 20MB]--/

[Part E: 50MB] ----------------------------------------------- [Part E: 50MB]
                                                               (Awaits similar sized part)
```

During this merge process, the storage engine does much more than simply concatenate files. The merge phase is where the real magic of VictoriaMetrics happens:
1. **Sorting and Aligning:** Data from the source parts is decompressed, sorted by time and metric identity (TSID), and seamlessly woven together.
2. **Deduplication:** If configured, identical samples with the exact same timestamp and value are dropped. 
3. **Aggressive Compression:** The newly merged, larger blocks of data provide a broader context for compression algorithms, resulting in significantly higher compression ratios than the smaller constituent parts could achieve individually.

Once the new merged part (e.g., `Part D`) is fully and successfully written to disk, the original parts (`Part A` and `Part B`) are atomically marked for deletion and eventually garbage collected.

### Directory Structure of a Part

If you were to inspect the storage directory of a VictoriaMetrics node (typically `/storage/data/small/YYYY_MM/` or `/storage/data/big/YYYY_MM/`), you would see directories representing these parts. The naming convention of a part directory often includes the number of rows, blocks, and the time range it covers.

Inside a typical MergeTree-inspired part directory, you will find a structure similar to this:

```bash
part_directory_name/
├── metaindex.bin   # Sparse index pointing to byte offsets in the data files
├── index.bin       # Detailed index for blocks mapping TSIDs and timestamps
├── timestamps.bin  # Compressed arrays of time series timestamps
├── values.bin      # Compressed arrays of the actual float64 values
└── metadata.json   # Information about the part (row count, min/max time, etc.)
```

This strict separation of timestamps, values, and index data allows VictoriaMetrics to only load the exact bytes from disk necessary to fulfill a specific query. If a PromQL query only needs to count the number of samples, it might only need to read the `timestamps.bin` file, completely skipping the `values.bin` file.

### Divergence from ClickHouse's MergeTree

While heavily inspired by ClickHouse, VictoriaMetrics implements a highly specialized version of this architecture tailored specifically for metrics. 

Unlike ClickHouse, which uses a traditional columnar layout where each label/tag might be a separate column, VictoriaMetrics uses a **Time Series ID (TSID)** model. It maps the complex, multi-dimensional labels of a Prometheus metric into a single, highly efficient internal integer (the TSID). The storage engine then groups data strictly by this TSID and time. 

This adaptation means VictoriaMetrics' MergeTree implementation avoids the "wide table" problem where high-cardinality label sets create sparse, inefficient columns, ensuring that the engine remains robust even when faced with high churn rates and complex Kubernetes environments.

## 10.2 In-Memory Buffers vs. On-Disk Data Structures

Before data can be transformed into the highly optimized, immutable MergeTree parts discussed in the previous section, it must first navigate the high-velocity ingestion path. Time-series workloads are characterized by continuous, massive streams of small data points. If a database attempted to write each incoming sample directly to disk, the resulting I/O thrashing would cripple performance, regardless of the underlying storage hardware.

To bridge the gap between network speed and disk speed, VictoriaMetrics employs a robust, two-tier architecture: fast **in-memory buffers** for immediate ingestion, and durable **on-disk data structures** for long-term storage.

### The In-Memory Buffering Phase

When an ingestion payload (e.g., via Prometheus `remote_write` or InfluxDB line protocol) reaches a `vmstorage` node, the data is immediately routed to the in-memory buffer. 

The primary goal of this buffer is to absorb the shock of high-throughput writes. It achieves this by focusing on concurrency and mutability:
* **Lock-Free Inserts:** The buffer utilizes highly optimized Go data structures (like `sync.Pool` and atomic operations) to allow thousands of concurrent connections to append data simultaneously without blocking each other.
* **Row-Oriented Grouping:** As raw samples arrive, they are parsed, their labels are mapped to a unique Time Series ID (TSID), and the values are appended to an array in memory associated with that TSID. 
* **Minimal Processing:** At this stage, data is generally uncompressed (or only lightly compressed). The engine avoids heavy CPU cycles here to keep ingestion latency as low as possible.

### The Flush: From Memory to Disk

Data cannot live in volatile memory forever. The transition from the in-memory buffer to persistent storage is known as a **flush**. VictoriaMetrics triggers a flush asynchronously based on specific thresholds—typically when the memory buffer reaches a certain size limit, or after a predefined time interval (usually a few seconds) has elapsed.

Here is a conceptual flow of how data moves through this pipeline:

```text
[Network Ingestion] (Millions of samples/sec)
        |
        v
+---------------------------------------------------+
|  In-Memory Buffer (Mutable, Fast Appends)         |
|                                                   |
|  TSID 1234: [(t1, v1), (t2, v2), (t3, v3)]        |
|  TSID 5678: [(t1, v1)]                            |
|  TSID 9012: [(t1, v1), (t2, v2)]                  |
+---------------------------------------------------+
        |
        |  Trigger: Size Threshold or Time Limit
        v
[ Background Flush Worker ] -> Sorts by TSID & Time, Compresses
        |
        v
+---------------------------------------------------+
|  On-Disk Part (Level 0) (Immutable, Compressed)   |
|                                                   |
|  ├── index.bin       (Block locations)            |
|  ├── timestamps.bin  (Delta-encoded times)        |
|  └── values.bin      (Gorilla-compressed floats)  |
+---------------------------------------------------+
```

During the flush, the CPU steps in to do the heavy lifting. The background worker takes the loosely organized arrays from memory, sorts them strictly by TSID and timestamp, applies aggressive compression algorithms, and writes the resulting "Level 0" part to disk as an immutable directory.

### Structural Comparison

Understanding the differences between these two tiers is crucial for performance tuning and capacity planning.

| Feature | In-Memory Buffer | On-Disk Data Structures (Parts) |
| :--- | :--- | :--- |
| **State** | Mutable (constantly updated). | Immutable (read-only, never modified in place). |
| **Data Layout** | Arrays of raw samples grouped by TSID. | Strictly separated, compressed columns (timestamps, values, indices). |
| **Durability** | Volatile. Data here is lost if the process crashes before a flush. | Durable. Data survives process restarts and power failures. |
| **Performance Focus** | Maximizing concurrent write throughput (IOPS). | Maximizing sequential read throughput and disk space efficiency. |
| **Memory Footprint** | Dynamic, spikes during high ingestion bursts. | Predictable, relies heavily on the OS Page Cache for fast reads. |

### The Query Engine's Perspective

A common question arises: *If recent data is sitting in memory and hasn't been flushed yet, how do real-time alerting queries see it?*

The architecture requires the query layer (`vmselect` in a cluster setup, or the unified query engine in a single-node setup) to be "tier-aware." When a PromQL query executes, VictoriaMetrics does not just scan the disk. It simultaneously interrogates both the on-disk index and the in-memory buffers. The results from both tiers are dynamically merged at query time. This ensures that a dashboard or an alert evaluating the last 1 minute of data will receive mathematically accurate results, seamlessly blending the uncompressed samples currently in RAM with the compressed blocks stored on the NVMe or SSD.

## 10.3 Understanding Indexing and Inverted Indexes

When dealing with time-series data at scale, storing the data efficiently on disk is only half the battle. The other, arguably more complex challenge is retrieving specific subsets of that data instantly. In a Prometheus-compatible ecosystem, users rarely query for a single metric directly. Instead, they use complex label matchers (e.g., `kube_pod_status_phase{phase="Running", namespace=~"prod-.*"}`) to slice and filter across millions of active time series.

To solve this needle-in-a-haystack problem without scanning the entire database, VictoriaMetrics employs a highly optimized **Inverted Index**, a concept originally popularized by full-text search engines like Elasticsearch or Apache Lucene, but heavily tuned here for the specific cardinality patterns of time-series labels.

### The Role of the Time Series ID (TSID)

As mentioned in previous sections, VictoriaMetrics does not store raw label strings alongside every single data point on disk. Doing so would waste an enormous amount of space and memory. Instead, the very first time a new combination of a metric name and its labels is ingested, VictoriaMetrics generates a unique, internal 64-bit integer called the **Time Series ID (TSID)**.

The entire storage engine (the `values.bin` and `timestamps.bin` files) organizes data strictly by this TSID. The indexing layer's primary job is to act as a hyper-fast translation dictionary between the human-readable PromQL labels and these internal TSIDs.

### The Inverted Index Structure

An inverted index maps the *content* (the label key-value pairs) to its *location* (the TSID). 

To understand this, let us look at a simplified example. Imagine we ingest three distinct time series:

```text
Series A: http_requests_total{method="GET", status="200"}  -> Assigned TSID: 101
Series B: http_requests_total{method="POST", status="200"} -> Assigned TSID: 102
Series C: http_requests_total{method="GET", status="500"}  -> Assigned TSID: 103
```

Behind the scenes, VictoriaMetrics parses these labels—treating the metric name itself as just another label (`__name__`)—and populates its inverted index. The resulting index structure conceptually looks like this:

```text
Label Key=Value             List of Associated TSIDs
------------------------------------------------------
__name__="http_requests"    [101, 102, 103]
method="GET"                [101, 103]
method="POST"               [102]
status="200"                [101, 102]
status="500"                [103]
```

### Query Execution: Set Intersection

When a user executes a PromQL query, the VictoriaMetrics indexing engine performs a rapid series of set operations (intersections, unions, and exclusions) on these arrays of integers.

Consider a query looking for successful GET requests: 
`http_requests_total{method="GET", status="200"}`

The execution flows as follows:
1. **Index Lookup:** The engine queries the inverted index for each exact-match label.
   * `__name__="http_requests_total"` returns `[101, 102, 103]`
   * `method="GET"` returns `[101, 103]`
   * `status="200"` returns `[101, 102]`
2. **Intersection:** The engine intersects these sorted lists of integers to find the common TSIDs. 
   * `[101, 102, 103] ∩ [101, 103] ∩ [101, 102] = [101]`
3. **Data Retrieval:** Now knowing that the only relevant TSID is `101`, the query engine goes to the storage layer, opens the parts containing TSID `101`, and sequentially reads only the necessary timestamps and values from disk.

This set-intersection process is mathematically deterministic and incredibly fast for exact matches. For regular expression matchers (e.g., `method=~"GET|POST"`), the engine simply expands the regex into multiple exact-match lookups, unions the resulting TSID lists (`[101, 103] ∪ [102]`), and proceeds with the intersection.

### The IndexDB and Prefix Compression

Just like the data points themselves, the index in VictoriaMetrics is massive, constantly updated, and must be persisted to disk. The inverted index is stored in a separate internal database hierarchy known as the **indexdb**.

The `indexdb` uses a structure similar to the MergeTree concepts discussed in Section 10.1. It maintains its own in-memory buffers for newly discovered series and flushes them to disk as immutable, sorted parts. 

Because labels in cloud-native environments are highly repetitive (e.g., thousands of pods might share the label `kubernetes_namespace="production-backend-services"`), VictoriaMetrics heavily utilizes **Prefix Compression** within the indexdb. Instead of storing the string `"production-backend-services"` thousands of times, the engine stores the string once and uses compact byte-offsets to reference it. This allows the index to remain small enough to fit almost entirely within the operating system's page cache (RAM), ensuring that label lookups rarely incur a physical disk read penalty.

## 10.4 Data Compression Algorithms under the Hood

The sheer volume of time-series data generated by modern cloud-native environments makes raw storage mathematically and financially untenable. A single raw sample in a time-series database typically consists of an 8-byte (64-bit) timestamp and an 8-byte float value, totaling 16 bytes. At a moderate ingestion rate of 1 million samples per second, uncompressed storage would consume roughly 1.3 terabytes per day just for the data points, excluding indices and metadata. 

VictoriaMetrics addresses this through a multi-stage, highly aggressive compression pipeline. By understanding the predictable nature of time-series data, the storage engine routinely shrinks this 16-byte payload down to an industry-leading **0.4 to 1 byte per sample** on average.

### Phase 1: Columnar Separation

As discussed in Section 10.1, the foundation of VictoriaMetrics' compression is its columnar storage layout. Compression algorithms perform best when fed a stream of highly similar data. 

If timestamps and values were interleaved in a row-based format `[(time1, value1), (time2, value2)]`, the bitstream would be chaotic. By splitting the data into a pure array of timestamps `[time1, time2, time3]` and a pure array of values `[value1, value2, value3]`, the engine creates two distinct, highly predictable data streams that can be optimized using domain-specific mathematical algorithms.

### Phase 2: Domain-Specific Encoding

Once separated, VictoriaMetrics applies specialized encoding techniques to the two arrays before passing them to a general-purpose compressor.

#### Compressing Timestamps: Delta-of-Deltas
Prometheus targets are typically scraped at regular intervals (e.g., every 15 seconds). Therefore, timestamps are highly predictable. Instead of storing the full Unix timestamp (a massive 64-bit integer) for every point, VictoriaMetrics calculates the difference (delta) between consecutive timestamps, and then the difference between those deltas.

* **Raw Timestamps:** `1680000000`, `1680000015`, `1680000030`, `1680000045`
* **First Delta (Difference from previous):** `1680000000`, `15`, `15`, `15`
* **Delta-of-Deltas:** `1680000000`, `15`, `0`, `0`

Because the network introduces minor jitter, the delta-of-deltas might occasionally be `1` or `-1` instead of `0`. Regardless, this encoding transforms massive integers into a stream consisting almost entirely of zeroes, which requires practically zero bits to represent in a variable-length encoding scheme.

#### Compressing Float Values: XOR Encoding
Time-series values also exhibit predictable patterns. A metric like `node_memory_MemTotal_bytes` never changes, and `node_cpu_seconds_total` usually increments by a predictable amount.

VictoriaMetrics utilizes a variant of the **XOR encoding** technique, famously detailed in Facebook's *Gorilla* TSDB paper. 
1. The engine takes the binary representation of the current float64 value and performs a bitwise XOR operation against the previous value.
2. If the values are identical, the XOR result is exactly zero.
3. If the values are similar, the XOR result contains a large block of leading and trailing zeroes.
4. The engine only stores the "meaningful" bits in the middle, along with tiny headers indicating the number of leading/trailing zeroes.

### Phase 3: Block Compression (Zstandard)

The domain-specific encodings (Delta-of-deltas and XOR) output a dense bitstream heavily populated by zeroes and small integers. To squeeze the final bytes out of this stream, VictoriaMetrics relies heavily on **Zstandard (ZSTD)**, a fast, lossless compression algorithm developed by Facebook.

ZSTD is uniquely suited for time-series databases because it offers a sliding scale of compression levels. 

* **During Ingestion:** The in-memory buffers utilize a very light compression level. This minimizes CPU usage to ensure ingestion throughput remains high.
* **During Background Merges:** When the background workers merge Level 0 parts into larger Level 1 and Level 2 parts (as detailed in Section 10.1), they have more time and context. The engine applies heavier ZSTD compression during these merges, aggressively shrinking historical data that is less likely to be queried frequently.

### The Complete Pipeline

Here is a conceptual flow of how a raw data payload is compressed into physical bytes on disk:

```text
[ Raw Ingested Data Stream ]
TSID: 40592
Data: (1680000000, 24.50), (1680000015, 24.55), (1680000030, 24.55)
Total Size: ~48 bytes
          |
          | 1. Columnar Separation
          v
Timestamps: [1680000000, 1680000015, 1680000030]
Values:     [24.50, 24.55, 24.55]
          |
          | 2. Domain-Specific Encoding
          v
Encoded Times: [1680000000, +15, 0]             -> Yields mostly '0' bits
Encoded Vals:  [24.50, XOR_Diff, 0]             -> Yields mostly '0' bits
          |
          | 3. Block Compression (ZSTD)
          v
[ Binary Payload written to timestamps.bin and values.bin ]
Total Size: ~3 bytes
```

### String and Dictionary Compression

It is worth noting that compression is not limited to metric values and timestamps. The inverted index (which stores strings like metric names and labels) also undergoes rigorous compression. 

Because labels are highly repetitive (e.g., the string `namespace="production"` might apply to 10,000 different time series), VictoriaMetrics avoids writing the same string to disk multiple times. It builds a localized **dictionary** within each index part. The string `production` is saved exactly once in the dictionary and assigned a short integer ID. Every subsequent appearance of that label in the index simply references the integer ID, massively reducing the disk footprint of the `indexdb` and allowing index lookups to remain entirely within the operating system's fast RAM cache.