At the heart of every major social network lies the timeline. Designing a system capable of aggregating, sorting, and delivering personalized content to millions of users in under 200 milliseconds is one of the ultimate challenges in distributed systems.

This chapter bridges theory and practical application. We will explore the read-heavy workloads typical of social platforms, the engineering battle between push and pull fan-out models, the architectural bottlenecks caused by celebrity accounts, and the infrastructure required to process and deliver terabytes of media at the edge.

## 18.1 Requirements Gathering and Capacity Estimation

Before designing the architecture for a social media feed or timeline, establishing strict boundaries and expectations is paramount. System design is fundamentally an exercise in navigating trade-offs (as introduced in Chapter 1), and those trade-offs cannot be evaluated without clear requirements and traffic baselines.

This section breaks down the process of defining the scope of a global-scale social media feed and performing the back-of-the-envelope calculations necessary to anticipate infrastructural bottlenecks.

### Functional vs. Non-Functional Requirements

When approaching a feed system like Twitter (X), Instagram, or Facebook, the feature set must be constrained to a core viable product to keep the architectural discussion focused.

**Functional Requirements:**
These define *what* the system must do. For our social media feed case study, we will focus on the following core interactions:

* **Publishing:** Users should be able to publish posts containing text, images, or short videos.
* **Timeline Generation:** Users should be able to view a chronological or algorithmic feed of posts from the people they follow.
* **Social Graph:** Users should be able to follow and unfollow other users.

**Non-Functional Requirements:**
These define *how* the system performs. This is where architectural constraints are born.

* **High Availability:** The system must prioritize uptime. Users expect to read feeds and create posts 24/7.
* **Read-Heavy Operations:** In social media, the number of people consuming content vastly outnumbers the people creating it. The system must be optimized for a massive read-to-write ratio.
* **Low Latency Reads:** Generating and delivering a timeline must happen in under 200 milliseconds to maintain a fluid user experience.
* **Eventual Consistency (Acceptable):** Applying the concepts from Chapter 9, strong consistency is not required. If a user publishes a post, it is acceptable if it takes a few seconds to propagate to all of their followers' feeds. Availability and partition tolerance (AP in the CAP theorem) are prioritized over strict consistency.

### Capacity Estimation (Back-of-the-Envelope Math)

To design a system capable of global scale, we must translate our requirements into hard numbers. Capacity estimations allow us to choose the right data storage solutions, determine load balancing needs, and predict network bandwidth requirements.

For this case study, we will base our calculations on a hypothetical platform with **300 million Daily Active Users (DAU)**.

#### 1. Traffic Estimates (QPS)

First, we calculate the Queries Per Second (QPS) to understand the load on our API gateways and application servers.

* **Assumptions:**
* On average, 50% of DAU post once a day = 150 million posts/day.
* On average, each user requests their timeline 100 times a day (opening the app, scrolling, refreshing) = 30 billion read requests/day.
* Read-to-Write Ratio = 30,000,000,000 / 150,000,000 = **200:1**.


* **Write QPS (Average):**
150,000,000 posts / 86,400 seconds (in a day) = ~1,736 writes/second.
*Peak Write QPS* (assuming peak traffic is 2x average): ~3,472 writes/second.
* **Read QPS (Average):**
30,000,000,000 reads / 86,400 seconds = ~347,222 reads/second.
*Peak Read QPS:* ~694,444 reads/second.

*Architectural Takeaway:* A write QPS of ~3,500 is manageable for many modern distributed databases, but a read QPS nearing 700,000 dictates an aggressive caching strategy (Chapter 7) and robust load balancing (Chapter 10).

#### 2. Storage Estimates

Next, we calculate the volume of new data generated to size our database and object storage layers.

* **Assumptions per post:**
* Text payload and metadata (user ID, timestamp, etc.): 1 KB
* 20% of posts contain an image averaging 1 MB.
* 5% of posts contain a short video averaging 10 MB.


* **Daily Storage Calculation:**
* Text data: 150 million * 1 KB = 150 GB / day.
* Image data: (150 million * 20%) * 1 MB = 30 million * 1 MB = 30 TB / day.
* Video data: (150 million * 5%) * 10 MB = 7.5 million * 10 MB = 75 TB / day.
* **Total Daily Storage:** ~105 TB / day.


* **Long-Term Storage (5-Year Capacity):**
105 TB * 365 days * 5 years = **~191.6 Petabytes (PB)**.

*Architectural Takeaway:* Relational databases alone cannot handle this volume efficiently. Media files must be separated into distributed object storage, while metadata and text can reside in a highly partitioned NoSQL or NewSQL store.

#### 3. Bandwidth Estimates

Network bottlenecks are a common point of failure. We must estimate Ingress (incoming traffic) and Egress (outgoing traffic).

* **Ingress (Data flowing into our servers):**
105 TB / 86,400 seconds = **~1.2 GB/second**.
* **Egress (Data flowing out to users):**
Egress calculation is complex due to caching and variable payload sizes during feed scrolling. However, given our 200:1 read-to-write ratio, egress bandwidth will be massively higher than ingress.
If an average timeline fetch pulls down 100 KB of metadata and thumbnails:
347,222 Read QPS * 100 KB = **~34.7 GB/second**.

*Architectural Takeaway:* Serving ~35 GB/s of egress traffic directly from application servers is expensive and inefficient. This highlights the absolute necessity of Content Delivery Networks (CDNs), as discussed in Chapter 13, to offload media delivery to the edge, drastically reducing the load on our core data centers.

#### 4. Memory Estimation (Caching)

To meet the strict sub-200ms latency requirement, we cannot query the database for every timeline request. We must cache the most frequently accessed data. Applying the 80/20 rule (the Pareto Principle), we assume 80% of our read traffic is generated by 20% of our active users.

* We need to cache the timeline metadata (e.g., arrays of post IDs) for 20% of our 300 million DAU.
* 20% of 300 million = 60 million users.
* If caching a user's recent timeline metadata requires 5 KB:
60 million * 5 KB = **300 GB of memory**.

*Architectural Takeaway:* 300 GB easily fits within a small cluster of Redis or Memcached nodes. This memory footprint scales linearly and can be distributed safely across multiple availability zones.

---

### Estimation Summary Matrix

The following table synthesizes our baseline requirements. In a real-world engineering environment, this matrix serves as the foundational document against which all subsequent architectural decisions are tested.

```text
+--------------------------------------------------------------------------+
|                 SYSTEM CAPACITY ESTIMATION SUMMARY                       |
|                 (Based on 300M Daily Active Users)                       |
+--------------------------+-----------------------------------------------+
| Metric                   | Estimated Baseline                            |
+--------------------------+-----------------------------------------------+
| Read/Write Ratio         | 200:1 (Heavy Read Skew)                       |
| Average Write QPS        | ~1,700 requests / sec                         |
| Peak Read QPS            | ~694,000 requests / sec                       |
| Daily Storage Generation | ~105 Terabytes (Text + Media)                 |
| 5-Year Storage Target    | ~192 Petabytes                                |
| Incoming Bandwidth       | ~1.2 Gigabytes / sec                          |
| Outgoing Bandwidth       | ~34.7 Gigabytes / sec (Prior to CDN offload)  |
| Distributed Cache Size   | ~300 Gigabytes (Timeline Metadata)            |
+--------------------------+-----------------------------------------------+

```

With the requirements bounded and the physical constraints mapped out, the next step is to design the specific mechanism that takes an incoming post and distributes it into millions of different timelines—a process explored in Section 18.2: Feed Generation.

## 18.2 Feed Generation: Push vs. Pull Models

With the requirements and capacity constraints established, the central engineering challenge of a social media platform is computing the timeline itself. When a user opens their app, the system must aggregate recent posts from everyone they follow, sort them (chronologically or algorithmically), and deliver the results in under 200 milliseconds.

This process is commonly referred to as **Fan-out**. There are two primary architectural models for handling this: the Pull Model (Fan-out on Read) and the Push Model (Fan-out on Write).

### 1. The Pull Model (Fan-out on Read)

In the Pull model, the feed is generated dynamically *at the exact moment* the user requests it. The system does virtually no work when a new post is created; instead, it shifts all the computational burden to the read operations.

**How it works:**

1. **Write Path:** User A publishes a post. The system simply saves the post to the database (and perhaps a cache of User A's recent posts).
2. **Read Path:** User B opens their app and requests their timeline.
3. The Timeline Service queries the Social Graph to find everyone User B follows.
4. The service fetches the 50 most recent posts for every person User B follows.
5. The service merges these lists, sorts them by timestamp, and returns the compiled feed to User B.

```text
[ Architecture of the Pull Model (Fan-out on Read) ]

                      +-------------------+
                      |  Timeline Service |
                      +-------------------+
                               | 1. Get Followees
                               v
+--------+            +-------------------+
| User B | ---------> |   Social Graph    | ---> (Returns: User A, C, D)
+--------+  Request   +-------------------+
  ^  |                         | 2. Fetch Posts for A, C, D
  |  |                         v
  |  |                +-------------------+
  |  +----------------|    Post Store     | ---> (Returns: Unsorted Posts)
  |      3. Merge,    +-------------------+
  +-------  Sort, & 
           Return

```

**Pros:**

* **Cheap and Fast Writes:** Publishing a post takes milliseconds because it only needs to be written once.
* **No Wasted Compute:** Inactive users don't have feeds generated for them. Compute is only used when a user explicitly requests their timeline.
* **Handles Celebrities Perfectly:** If a user with 100 million followers posts a photo, the system only writes one record. There is no massive cascade of background tasks.

**Cons:**

* **Expensive and Slow Reads:** This is the fatal flaw for global-scale platforms. If User B follows 2,000 people, the Timeline Service must query 2,000 different data partitions, merge thousands of posts, and sort them. This is highly likely to violate our 200ms latency requirement.
* **High Compute at Peak:** During major global events, massive spikes in read requests will overwhelm the database and application servers due to the heavy read-time computation.

### 2. The Push Model (Fan-out on Write)

To solve the slow read times of the Pull model, modern systems invert the architecture. In the Push model, feeds are pre-computed. When a user publishes a post, the system does the heavy lifting in the background to "push" that post into the dedicated timeline caches of all their followers.

**How it works:**

1. **Write Path:** User A publishes a post. The system saves the post to the database.
2. A background worker queries the Social Graph to get User A's followers.
3. The worker iterates through the list of followers and pushes the new Post ID into a Redis or Memcached list dedicated to each follower's timeline.
4. **Read Path:** User B requests their timeline. The system simply fetches User B's pre-computed timeline list from the cache and retrieves the corresponding post payloads.

```text
[ Architecture of the Push Model (Fan-out on Write) ]

+--------+            +-------------------+       +--------------------+
| User A | ---------> |   Post Service    | ----> | Background Workers |
+--------+  1. Post   +-------------------+       +--------------------+
                                                        | 2. Fetch Followers
                                                        v
                                                  +--------------------+
                                                  |   Social Graph     | ---> (B, C)
                                                  +--------------------+
                                                        | 3. Push to Caches
                                                        v
                                       +-----------------------------------+
+--------+  4. Read Cache              | +-----------+       +-----------+ |
| User B | --------------------------> | | Cache B   |       | Cache C   | |
+--------+                             | +-----------+       +-----------+ |
                                       |      Timeline Cache Cluster       |
                                       +-----------------------------------+

```

**Pros:**

* **Lightning Fast Reads:** Generating a timeline becomes an $O(1)$ operation. The system just reads a pre-sorted list of IDs from an in-memory cache. This easily satisfies our low-latency requirements.
* **Predictable Read Load:** Because the feeds are pre-computed, a massive spike in users opening the app will only hit the fast in-memory cache, protecting the underlying databases.

**Cons:**

* **Expensive Writes:** A single write triggers asynchronous background tasks.
* **Wasted Storage:** Feeds are pre-computed for inactive users who may never log in to see them (though this can be mitigated by only pushing to users active in the last 14 days).
* **The "Celebrity Problem" (Thundering Herd):** If an account with 100 million followers publishes a post, the system must perform 100 million cache write operations. This creates an enormous backlog in the message queues and delays the post from appearing in timelines, violating our eventual consistency thresholds.

### 3. The Hybrid Approach

Given that social media platforms exhibit a massive read-to-write ratio (as calculated in 18.1), the **Push Model (Fan-out on Write)** is the default choice for the vast majority of users. Fast reads are non-negotiable.

However, because the Push model collapses under the weight of celebrity accounts, system designers employ a **Hybrid Architecture**.

The strategy is simple: **Push for the masses, Pull for the elite.**

1. Users are categorized based on follower count. For example, a user with more than 1,000,000 followers is flagged as a "Celebrity" (or a "VIP" node in the social graph).
2. When a normal user posts, the system uses the **Push** model, fanning out the post to their followers' caches.
3. When a Celebrity posts, the system uses the **Pull** model. It does *not* fan out the post. It simply saves it to the database and a dedicated Celebrity cache.
4. When a user requests their timeline, the system fetches their pre-computed Push feed, but simultaneously performs a quick Pull query to check if any Celebrities they follow have posted recently.
5. The results are merged in memory at read-time.

### Summary Comparison

| Feature | Pull Model (Fan-out on Read) | Push Model (Fan-out on Write) | Hybrid Approach |
| --- | --- | --- | --- |
| **Read Latency** | High (Slow) | Low (Fast) | Low (Fast) |
| **Write Complexity** | Low | High | Medium/High |
| **Storage Usage** | Optimal | Wasteful (Caches inactive feeds) | Balanced |
| **Celebrity Handling** | Excellent | Terrible (Causes Queue Backlogs) | Excellent |
| **Best Used For** | Small systems, or fetching celebrity posts | The majority of normal user traffic | Global scale social media platforms |

Implementing this Hybrid model requires highly optimized data storage and retrieval systems to handle the mixed workloads, a topic that will be detailed further in Section 18.4. However, before addressing storage, we must explicitly solve the specific architectural challenges introduced by the "Celebrity Problem" in Section 18.3.

## 18.3 Handling Celebrity Users (The Fan-Out Problem)

In Section 18.2, we established that the Push model (Fan-out on Write) is the optimal architecture for the vast majority of users because it guarantees the low-latency reads required by social media platforms. However, this model possesses a fatal flaw when exposed to users with massive follower counts. This flaw is known in system design as the **Fan-Out Problem** or the **Thundering Herd**.

### The Anatomy of the Fan-Out Problem

Consider a standard asynchronous architecture where a user's post triggers a background worker to push the new post ID into the timeline caches of all their followers.

If a typical user with 300 followers publishes a post, the message queue processes 300 tasks. This takes a fraction of a millisecond.

Now, consider a "celebrity" user with 100 million followers. When they publish a post, the system attempts to push that update to 100 million individual timeline caches.

1. **Message Queue Backlog:** 100 million tasks are suddenly dumped into the asynchronous task queue.
2. **Worker Starvation:** The background workers become entirely consumed by processing this single celebrity post.
3. **SLA Violations:** While the workers are busy with the celebrity, thousands of normal users are also posting. Their fan-out tasks get stuck in the queue behind the 100 million celebrity tasks. What should take 2 seconds to propagate to a timeline might now take 45 minutes, violating the system's eventual consistency Service Level Agreement (SLA).
4. **Cache Trashing:** Writing to 100 million Redis or Memcached nodes simultaneously creates enormous network congestion and CPU spikes across the caching tier.

### The Hybrid Solution: Push for the Masses, Pull for the Elite

To prevent a single highly-followed user from crippling the asynchronous worker pool, the system must break the rules of the Push model. We implement a **Hybrid Architecture** that treats high-follower accounts fundamentally differently than normal accounts.

#### 1. Defining a "Celebrity" Node

The first step is identifying which users require special treatment. In the context of system design, a "celebrity" has nothing to do with real-world fame; it is purely a mathematical threshold within the social graph.

A user is dynamically flagged as a "VIP" or "Celebrity" node if their out-degree (follower count) exceeds a specific threshold (e.g., $> 100,000$ followers). This status is typically cached alongside their user profile.

#### 2. The Celebrity Write Path (Bypassing Fan-Out)

When a flagged Celebrity publishes a post, the system intentionally skips the massive Fan-out on Write process.

1. The post is saved to the primary Post Database.
2. The post ID is pushed to a dedicated **Celebrity Cache** (a global, highly replicated cache holding the recent posts of VIP users).
3. **No background workers are triggered.** The write operation is entirely finished. The $O(N)$ operation (where $N$ is 100 million followers) has been successfully reduced to $O(1)$.

#### 3. The Follower Read Path (Merge on Read)

Because the celebrity's post was never pushed to their followers' individual timeline caches, the complexity is shifted to the Read Path. When a normal user opens their app, the system must construct their feed from two different sources.

```text
[ Architecture of the Hybrid Read Path ]

+----------+       1. Request Feed
|  User B  | ------------------------> +------------------------+
+----------+                           |    Timeline Service    |
                                       +------------------------+
                                         |      |        |
    +------------------------------------+      |        +-------------------------+
    | 2. Fetch pre-computed Push Feed           | 3. Get Followed Celebrities      |
    v                                           v                                  |
+---------------------+              +--------------------+                        |
|  User B's Timeline  |              |    Social Graph    | ---> (Celeb X, Y)      |
|  Cache (Redis)      |              +--------------------+                        |
+---------------------+                                                            |
    | (Returns IDs: 101, 105)                                                      |
    |                                                                              |
    |                                   4. Fetch Celeb Posts (Pull)                |
    |                                   +-------------------------+                |
    |                                   v                                          |
    |                           +---------------------+                            |
    |                           |   Celebrity Cache   |                            |
    |                           +---------------------+                            |
    |                                   | (Returns IDs: 999, 1002)                 |
    +-----------------------------------|------------------------------------------+
                                        v
                               5. Merge & Sort by Timestamp
                                        |
                                        v
                            [ Final Timeline to User B ]
                            (IDs: 1002, 105, 101, 999)

```

**Step-by-Step Execution:**

1. **Fetch the Push Cache:** The Timeline Service grabs User B's pre-computed timeline from Redis (this contains posts from their normal friends).
2. **Identify VIP Followees:** The service quickly checks the Social Graph (or a cached subset of it) to see which Celebrities User B follows.
3. **Pull VIP Posts:** The service queries the global Celebrity Cache for any recent posts from those specific VIPs.
4. **Merge and Sort:** The application servers merge the list of normal posts and VIP posts, sort them chronologically (or algorithmically), and return the final payload to User B.

### Performance Optimizations for the Hybrid Model

While the Hybrid model solves the queue backlog, fetching and merging data at read-time introduces latency. To ensure the read operation remains under the 200ms threshold, the following optimizations are strictly required:

* **Aggressive Caching of the Social Graph:** Step 2 (identifying VIP followees) cannot result in a database query. A user's list of followed celebrities must be stored in a rapid-access key-value store.
* **Time-Bounding the Pull:** To keep the in-memory sort fast, the Timeline Service only pulls celebrity posts from the last 24 to 48 hours. Older posts are accessed via standard database pagination only if the user scrolls deeply into their feed.
* **Edge Caching for Media:** Because celebrity posts are viewed by millions, the actual payloads (the text, images, and videos) achieve near 100% cache hit rates at the CDN layer (Edge Computing). The application servers only need to merge the lightweight Post IDs and metadata, leaving the heavy lifting of media delivery to the edge nodes closest to the end user.

By isolating nodes with massive out-degrees and treating them with a Pull methodology, the system protects its asynchronous message queues and maintains high availability for the millions of write operations occurring across the rest of the platform.

## 18.4 Optimizing Media Storage and Retrieval

As calculated in Section 18.1, our hypothetical social media platform generates approximately 105 Terabytes of new data every single day. A staggering 99.8% of this storage footprint consists of unstructured media: images and videos.

Attempting to store this volume of binary data directly within a relational or NoSQL database alongside the post text is an anti-pattern that will quickly lead to database degradation, massive backup sizes, and severe latency issues. To achieve global scale, the architecture must strictly decouple the *metadata* (text, timestamps, user IDs) from the *media payloads*.

### 1. The Principle of Decoupling: Object Storage

In a modern distributed system, media files are treated as **BLOBs** (Binary Large Objects). Because social media posts are generally immutable (users don't typically edit the pixels of an image once posted; they delete and re-upload), they are perfectly suited for **Object Storage** solutions like Amazon S3, Google Cloud Storage, or Azure Blob Storage.

**How Decoupling Works:**

1. When a user uploads a photo, the actual file is sent to the Object Storage layer.
2. The Object Storage layer returns a globally unique identifier or URL (e.g., `[https://cdn.example.com/media/img_98765.jpg](https://cdn.example.com/media/img_98765.jpg)`).
3. The system stores only this string URL in the primary Post Database alongside the text content and metadata.

This keeps the primary database incredibly lightweight, ensuring that the in-memory timeline caches discussed in Sections 18.2 and 18.3 only have to shuffle tiny text strings rather than megabytes of binary data.

### 2. The Asynchronous Media Processing Pipeline

Raw files uploaded from mobile devices are often massive (e.g., a 10MB 4K photo from an iPhone). Serving these raw files directly to users scrolling a timeline would instantly overwhelm mobile data plans and violate our latency requirements.

Media must be optimized *before* it is served. This requires an asynchronous processing pipeline decoupled from the main application API.

```text
[ Architecture of the Media Processing Pipeline ]

+--------+   Raw Upload    +---------------+
| User A | --------------> |  API Gateway  |
+--------+                 +---------------+
                                   |
                                   v
                           +---------------+      Returns 202 Accepted
                           | Media Service | ------------------------> (UI shows "Posting...")
                           +---------------+
                                   | 1. Drops task in queue
                                   v
                           +---------------+
                           | Message Queue | (e.g., Kafka / RabbitMQ)
                           +---------------+
                                   | 2. Consumed by workers
                                   v
                     +---------------------------+
                     |  Media Processing Workers |
                     +---------------------------+
                     | - Virus Scanning          |
                     | - EXIF Data Removal       |
                     | - Compression             |
                     | - Thumbnail Generation    |
                     | - Video Transcoding       |
                     +---------------------------+
                                   | 3. Saves optimized files
                                   v
                           +---------------+
                           | Object Storage| (e.g., Amazon S3)
                           +---------------+
                                   | 4. Update Post DB with URLs
                                   v
                           +---------------+
                           | Primary DB    |
                           +---------------+

```

**Key Steps in the Pipeline:**

* **Upload & Acknowledge:** The upload is handled via a multi-part upload directly to a staging area. The API immediately returns a `202 Accepted` to the client so the user isn't stuck waiting on a loading screen while servers process the image.
* **Security & Privacy:** Workers strip EXIF data (GPS coordinates embedded by cameras) to protect user privacy and scan for malicious payloads.
* **Derivatives Generation:** For a single image upload, the workers might generate three derivatives: a high-resolution version for full-screen viewing, a medium-resolution version for the standard feed, and a heavily compressed micro-thumbnail for fast previews.

### 3. Edge Delivery via Content Delivery Networks (CDNs)

Storing the media is only half the battle; retrieving it efficiently is the other. As calculated earlier, delivering media to 300 million daily active users creates roughly 35 GB/second of egress traffic.

Routing all of this traffic through the core data centers would require an unsustainable amount of bandwidth and result in high latency for users geographically distant from those servers. This is solved by placing a **Content Delivery Network (CDN)** in front of the Object Storage layer (building upon the concepts from Chapter 13).

**The Read Path with a CDN:**

1. **Timeline Fetch:** User B's app fetches their feed metadata (as designed in 18.3). The payload contains the CDN URLs for the media (e.g., `[cdn.social.com/images/xyz.jpg](https://cdn.social.com/images/xyz.jpg)`).
2. **Client Request:** The mobile app makes a parallel HTTP request directly to that CDN URL.
3. **Edge Node Routing:** DNS routing directs the user to the closest physical CDN Edge Node (e.g., a server in Tokyo for a Japanese user, rather than a data center in Virginia).
4. **Cache Hit / Miss:**
* *Cache Hit:* If the edge node has the image (because another user in Tokyo recently requested it), it returns it immediately. Latency is often under 20ms.
* *Cache Miss:* If the edge node does not have the image, it acts as a reverse proxy, pulls the image from the origin Object Storage bucket, serves it to the user, and caches a copy locally for the next request.



### 4. Mitigating Stale Data and Cache Invalidation

Because media in a social feed is essentially immutable, we can employ very aggressive caching headers.

By setting the HTTP `Cache-Control` header to `public, max-age=31536000` (one year), we instruct both the CDN and the user's local browser/device to cache the image indefinitely.

If a user *does* decide to update their profile picture or edit an image, we do not attempt to invalidate the cache at the edge (which is notoriously difficult and slow). Instead, we use **Cache Busting**. The media processing pipeline simply generates a brand new filename (e.g., `profile_v2.jpg`), uploads it as a new object, and updates the database pointer. The next time a user requests the timeline, they receive the new URL, naturally bypassing the old cached image.

### Chapter Summary

Designing a global-scale social media feed requires balancing high-throughput writes against extremely low-latency read requirements. By carefully defining boundaries through capacity estimation (18.1), selecting a hybrid Push/Pull fan-out model to protect system resources (18.2 & 18.3), and aggressively offloading media storage and delivery to asynchronous workers and CDN edges (18.4), architects can build systems capable of serving billions of users seamlessly.