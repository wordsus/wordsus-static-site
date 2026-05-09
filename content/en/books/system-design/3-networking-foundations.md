At its core, a distributed system is a collection of computers talking to each other. No matter how elegant your software architecture is, the fundamental limit on your system's performance, reliability, and scale is the network connecting its components.

In this chapter, we explore the plumbing of the internet. We will demystify how bits travel across the globe, how machines discover one another, and how applications structure their conversations. Understanding these foundational networking protocols is critical for making informed architectural trade-offs between latency, throughput, and availability when designing at a global scale.

## 3.1 The OSI and TCP/IP Models

To design reliable, scalable, and performant systems, you must first understand how computers talk to each other. Network communication is inherently complex, involving physical cables, electrical signals, routing logic, error correction, and application-specific formatting. To manage this complexity, network architects rely on layered models.

A layered model abstracts the networking process. Each layer is responsible for a specific, isolated function and only communicates with the layers immediately above and below it. This separation of concerns—a principle we explored in Chapter 2—allows hardware and software vendors to build interoperable components without needing to understand the entire stack.

The two most prominent frameworks for understanding network communication are the **OSI (Open Systems Interconnection) Model** and the **TCP/IP Model**.

### The OSI Model

Developed by the International Organization for Standardization (ISO) in the late 1970s, the OSI model is a conceptual framework consisting of seven distinct layers. While rarely implemented exactly as prescribed, it serves as the universal language for network engineers and system designers to describe network functions and troubleshoot issues.

```text
+-------------------------------------------------------------+
|                     THE 7-LAYER OSI MODEL                   |
+---+--------------+--------------------------------+---------+
| L7| Application  | Network process to application |  Data   |
+---+--------------+--------------------------------+---------+
| L6| Presentation | Data representation & encrypt  |  Data   |
+---+--------------+--------------------------------+---------+
| L5| Session      | Interhost communication        |  Data   |
+---+--------------+--------------------------------+---------+
| L4| Transport    | End-to-end connections & ports | Segment |
+---+--------------+--------------------------------+---------+
| L3| Network      | Logical addressing & routing   | Packet  |
+---+--------------+--------------------------------+---------+
| L2| Data Link    | Physical addressing (MAC)      | Frame   |
+---+--------------+--------------------------------+---------+
| L1| Physical     | Media, signal, and binary      | Bits    |
+---+--------------+--------------------------------+---------+
```

Here is a bottom-up look at the responsibilities of each layer:

* **Layer 1: Physical.** This is the hardware layer. It defines the physical medium (fiber optic cables, copper wires, radio frequencies) and represents the transmission of raw bits ($0$s and $1$s) over that medium.
* **Layer 2: Data Link.** This layer provides node-to-node data transfer across a single physical network. It handles framing, physical addressing (MAC addresses), and basic error detection. Ethernet and Wi-Fi operate here.
* **Layer 3: Network.** The network layer is responsible for routing data between different networks. It handles logical addressing (IP addresses) and determines the optimal path for data to travel. Routers operate at this layer.
* **Layer 4: Transport.** This layer manages end-to-end communication, ensuring complete data transfer. It segments data, manages flow control, and handles error recovery. Concepts like ports and connection reliability live here. (We will explore the dominant Layer 4 protocols in *3.3 TCP vs. UDP*).
* **Layer 5: Session.** This layer establishes, maintains, and terminates communication sessions between two distinct applications.
* **Layer 6: Presentation.** Think of this as the translation layer. It handles data formatting, compression, and encryption/decryption (e.g., TLS). It ensures that the application layer receives data in a readable format.
* **Layer 7: Application.** The layer closest to the end-user. It provides network services directly to applications. Protocols like HTTP, SMTP, and DNS (detailed in *3.2 DNS Internals*) reside here.

### The TCP/IP Model

While the OSI model is the theoretical gold standard for discussion, the **TCP/IP Model** is the practical architecture that actually powers the modern Internet. Developed by the Department of Defense (DoD) prior to the OSI model, it is a more streamlined, four-layer framework.

The TCP/IP model condenses the OSI layers into a strictly functional stack:

```text
      OSI Model                                  TCP/IP Model
+-------------------+                          +-------------------+
| 7. Application    | \                        |                   |
+-------------------+  \                       |                   |
| 6. Presentation   |  |=====================> | 4. Application    |
+-------------------+  /                       |                   |
| 5. Session        | /                        |                   |
+-------------------+                          +-------------------+
| 4. Transport      | =======================> | 3. Transport      |
+-------------------+                          +-------------------+
| 3. Network        | =======================> | 2. Internet       |
+-------------------+                          +-------------------+
| 2. Data Link      | \                        |                   |
+-------------------+  |=====================> | 1. Network Access |
| 1. Physical       | /                        |    (Link Layer)   |
+-------------------+                          +-------------------+
```

1. **Network Access (Link) Layer:** Combines OSI Layers 1 and 2. It handles everything required to transmit an IP packet across a physical link.
2. **Internet Layer:** Corresponds to OSI Layer 3. It is responsible for routing packets across independent networks. The Internet Protocol (IP) is the undisputed king of this layer.
3. **Transport Layer:** Maps directly to OSI Layer 4, providing host-to-host communication via TCP or UDP.
4. **Application Layer:** Combines OSI Layers 5, 6, and 7. TCP/IP assumes that application developers will handle session management and data formatting within the application protocol itself (e.g., HTTP handles its own formatting and TLS handles encryption).

### Data Encapsulation and Decapsulation

To understand how data actually moves through these models, system designers must understand **encapsulation**.

When an application sends data, it travels *down* the network stack of the sending machine. As the data passes through each layer, that layer attaches its own protocol header (and sometimes a trailer) to the data. This process is like putting a letter inside an envelope, then putting that envelope inside a larger shipping box, and finally putting a routing label on the box.

```text
               +-------------------------------------------------+
Layer 7 Data   |                   USER DATA                     |
               +-------------------------------------------------+
                                      |
                                      V (Encapsulation)
               +-------+-----------------------------------------+
Layer 4        |  TCP  |             USER DATA                   |  <-- Segment
               | Header|                                         |
               +-------+-----------------------------------------+
                                      |
                                      V
               +-------+-------+---------------------------------+
Layer 3        |  IP   |  TCP  |         USER DATA               |  <-- Packet
               | Header| Header|                                 |
               +-------+-------+---------------------------------+
                                      |
                                      V
       +-------+-------+-------+---------------------------------+-------+
Layer 2|  MAC  |  IP   |  TCP  |         USER DATA               | Frame | <-- Frame
       | Header| Header| Header|                                 | Check |
       +-------+-------+-------+---------------------------------+-------+
                                      |
                                      V
Layer 1        10101010111000101010100101011110000101010101000...   <-- Bits (Wire)
```

When the bits reach the destination machine, the process reverses. This is **decapsulation**. The receiving stack reads the outermost header, verifies it, strips it off, and passes the payload *up* to the next layer, until the original raw data reaches the receiving application.

### Why System Designers Care

You might wonder why a system designer needs to care about models built in the 1970s. The answer lies in fault domain isolation, performance tuning, and architectural decision-making:

* **Load Balancing:** When we design reverse proxies (Chapter 10), we explicitly choose between Layer 4 (Transport) and Layer 7 (Application) load balancers. A Layer 4 balancer only looks at IP addresses and ports, making it blazingly fast but "dumb." A Layer 7 balancer can read HTTP headers and make intelligent routing decisions based on the content, but it incurs a performance overhead because it must decapsulate the data all the way up to Layer 7.
* **Troubleshooting:** Latency and availability issues (Chapter 1) are often isolated by layer. If an API is down, a systematic check from Layer 3 (can I `ping` the IP?) to Layer 4 (can I `telnet` to the port?) to Layer 7 (does `curl` return an HTTP 200?) saves hours of misdirected debugging.
* **Security:** Defense-in-depth requires securing multiple layers. Access Control Lists (ACLs) secure Layer 3, mTLS (Chapter 17) secures Layer 4/6, and Web Application Firewalls (WAFs) protect Layer 7.

By anchoring your mental model to the OSI and TCP/IP stacks, you can cleanly dissect the behavior of distributed systems as data moves from a client's browser through the global internet and into your backend infrastructure.

## 3.2 DNS (Domain Name System) Internals

If the IP address is the exact geographic coordinate of a server, the Domain Name System (DNS) is the internet's GPS navigation and address book. Humans remember domain names like `example.com`, but machines route traffic using IP addresses like `192.0.2.1` (IPv4) or `2001:db8::1` (IPv6). DNS is the globally distributed, highly available hierarchical database that bridges this gap.

In the context of the OSI model discussed in Section 3.1, DNS operates at Layer 7 (Application) but typically relies on Layer 4's UDP (User Datagram Protocol) on port 53 for speed. Understanding DNS internals is critical for system designers because it represents the very first point of contact a user has with your system, dictating initial latency, geographic routing, and high availability.

### The DNS Hierarchy

The DNS namespace is organized as an inverted tree. A domain name is read from right to left, with each section separated by a dot representing a level in the hierarchy.

```text
                     [ Root Domain (.) ]
                    /         |         \
                   /          |          \
          [ .com ]         [ .net ]         [ .org ]     <-- Top-Level Domains (TLDs)
             |                |
             |                |
       [ example ]        [ myapp ]                      <-- Second-Level Domains (SLDs)
          /     \             |
         /       \            |
     [ api ]   [ www ]     [ blog ]                      <-- Subdomains
```

1. **Root Domain (`.`):** The implicit trailing dot in every domain (e.g., `[www.example.com](https://www.example.com).`). It is managed by 13 logical root server clusters distributed globally using Anycast.
2. **Top-Level Domain (TLD):** Managed by organizations like Verisign (`.com`, `.net`) or country-specific entities (`.uk`, `.jp`).
3. **Second-Level Domain (SLD):** The domain you register (e.g., `example` in `example.com`).
4. **Subdomain:** Prefixes created by the domain owner to route traffic to specific services (e.g., `api`, `www`, `mail`).

### The DNS Resolution Process

When a client wants to connect to a domain, a multi-step resolution process occurs. If the answer is not already cached locally, the client delegates the search to a **Recursive Resolver** (usually provided by the ISP or a public provider like Google's `8.8.8.8` or Cloudflare's `1.1.1.1`).

The recursive resolver acts as a proxy, traversing the DNS hierarchy to find the exact IP address.

```text
+----------+                                       +-------------------+
|          | --1. Query: www.example.com ------->  |                   |
|  Client  |                                       |     Recursive     |
| (Browser)| < 8. Response: 192.0.2.1 -----------  |      Resolver     |
+----------+                                       +-------------------+
                                                      |  ^   |  ^   |  ^
                 +-----------------+                  |  |   |  |   |  |
                 |                 | <- 2. Query (.) -+  |   |  |   |  |
                 |   Root Server   |                     |   |  |   |  |
                 |                 | -- 3. TLD IP -------+   |  |   |  |
                 +-----------------+                         |  |   |  |
                                                             |  |   |  |
                 +-----------------+                         |  |   |  |
                 |                 | <- 4. Query (.com) -----+  |   |  |
                 |   TLD Server    |                            |   |  |
                 |                 | -- 5. Auth Server IP ------+   |  |
                 +-----------------+                                |  |
                                                                    |  |
                 +-----------------+                                |  |
                 |  Authoritative  | <- 6. Query (example.com) -----+  |
                 |   Name Server   |                                   |
                 |                 | -- 7. A Record (192.0.2.1) -------+
                 +-----------------+
```

1. **The Root Server** does not know the IP of `[www.example.com](https://www.example.com)`, but it knows the IP of the `.com` TLD servers.
2. **The TLD Server** does not know the final IP, but it knows the IP of the **Authoritative Name Server** registered for `example.com`.
3. **The Authoritative Name Server** holds the actual DNS records for the domain and returns the final IP address.

### Common DNS Records

Authoritative servers store mappings in specific formats called Resource Records. System designers frequently interact with the following types:

| Record Type | Description | Use Case Example |
| :--- | :--- | :--- |
| **A** (Address) | Maps a domain to an IPv4 address. | `example.com -> 192.0.2.1` |
| **AAAA** (Quad-A) | Maps a domain to an IPv6 address. | `example.com -> 2001:db8::1` |
| **CNAME** (Canonical) | Maps one domain name to another domain name (alias). Cannot be placed at the root level (apex). | `[www.example.com](https://www.example.com) -> example.com` |
| **ALIAS / ANAME** | Non-standard, provider-specific records that act like CNAMEs but can be used at the domain apex by resolving the target to an IP dynamically. | `example.com -> lb1.aws.com` |
| **MX** (Mail Exchange)| Specifies the mail servers responsible for accepting email on behalf of the domain. | `example.com -> mail.example.com` |
| **NS** (Name Server) | Delegates a DNS zone to use specific Authoritative Name Servers. | `example.com -> ns1.provider.com` |
| **TXT** (Text) | Arbitrary text data, heavily used for domain verification and email security (SPF, DKIM, DMARC). | `v=spf1 include:_spf.google.com ~all` |

### Caching and Time-To-Live (TTL)

If every request required traversing the entire root-to-authoritative hierarchy, the internet would collapse under the latency and load. To prevent this, DNS heavily utilizes caching at multiple layers: the browser, the operating system, the home router, and the recursive resolver.

Every DNS record has a **Time-To-Live (TTL)** value, expressed in seconds. The TTL dictates how long a resolver should cache the record before discarding it and requesting a fresh copy.

* **High TTL (e.g., 86400 seconds / 24 hours):** Reduces load on authoritative servers and speeds up resolution for clients. Ideal for static infrastructure.
* **Low TTL (e.g., 60 seconds):** Allows for rapid DNS changes, which is crucial for failover strategies and blue-green deployments. However, it increases DNS query volume and slight latency for users.

*Design Trade-off:* System designers must balance propagation delay against traffic overhead. If a database goes down and you update DNS to point to a backup region, a TTL of 24 hours means some users will be routed to the dead server for an entire day.

### DNS in Distributed System Design

Modern DNS is not just an address book; it is the first layer of load balancing and traffic management. Managed DNS providers (like Route53, Cloudflare, or NS1) offer advanced routing capabilities natively at the DNS layer:

* **Weighted Routing:** Returns different IPs based on assigned weights (e.g., sending 10% of traffic to a new server cluster for canary testing).
* **Latency-Based Routing:** The authoritative server evaluates the origin of the recursive resolver and returns the IP of the data center closest to the user, minimizing Layer 3 network hops.
* **Geolocation Routing:** Restricts or directs traffic based on the user's country or state, essential for data sovereignty compliance or localized content.
* **Health Checks and Failover:** The DNS provider actively monitors your endpoints. If a primary data center fails a health check, the authoritative server automatically starts returning the IP of the disaster recovery site.

## 3.3 TCP vs. UDP Protocols

In Section 3.1, we explored how the Transport Layer (Layer 4) is responsible for end-to-end communication between hosts. When an application needs to send data across the network, it must choose how that data will be transported. Will it prioritize absolute reliability, ensuring every single byte arrives perfectly intact? Or will it prioritize raw speed, accepting that some data might be lost along the way?

This fundamental trade-off is embodied by the two undisputed heavyweights of Layer 4: **Transmission Control Protocol (TCP)** and **User Datagram Protocol (UDP)**.

### TCP: The Reliable Courier

TCP is a **connection-oriented** protocol. It guarantees that data sent from a client will reach the server completely, without errors, and in the exact order it was sent. If a packet is lost due to network congestion, TCP will automatically detect the loss and retransmit the missing data.

To establish this reliable channel, TCP requires a formal introduction before any actual application data is exchanged. This process is known as the **Three-Way Handshake**.

#### The Three-Way Handshake

Every TCP connection begins with the following sequence:

```text
      Client                                              Server
        |                                                   |
        | ------ 1. SYN (Sequence = X) -------------------> |
        |        "I want to connect. My starting number     |
        |         is X."                                    |
        |                                                   |
        | <----- 2. SYN-ACK (Seq = Y, Ack = X + 1) -------- |
        |        "I acknowledge X. I also want to connect.  |
        |         My starting number is Y."                 |
        |                                                   |
        | ------ 3. ACK (Ack = Y + 1) --------------------> |
        |        "I acknowledge Y. We are connected."       |
        |                                                   |
        | ====== APPLICATION DATA TRANSFER BEGINS ========= |
```

This handshake ensures both parties are ready to communicate, but it introduces **latency**. Before a browser can even request a webpage, it must wait for a full Round Trip Time (RTT) just to establish the TCP connection.

#### Key Features of TCP

* **Reliability & Acknowledgment:** Every packet sent requires an acknowledgment (ACK) from the receiver. If the sender doesn't receive an ACK within a specific timeframe, it assumes the packet was dropped and retransmits it.
* **Ordering:** Packets might take different physical routes and arrive out of order. TCP assigns sequence numbers to each packet and reassembles them in the correct order at the destination.
* **Flow Control:** TCP prevents a fast sender from overwhelming a slow receiver. It uses a "sliding window" mechanism to dynamically adjust how much data can be in transit based on the receiver's processing capacity.
* **Congestion Control:** TCP monitors the network for congestion (indicated by dropped packets) and throttles its transmission rate to prevent network collapse.

**Common TCP Use Cases:** Web browsing (HTTP/HTTPS), email (SMTP, IMAP), file transfers (FTP), and database connections (e.g., connecting an application server to PostgreSQL).

### UDP: The Fire-and-Forget Sprinkler

UDP is a **connectionless** protocol. It strips away all the overhead, handshakes, and guarantees of TCP. It simply takes the application data, slaps a minimal header on it, and shoots it into the network as fast as possible.

```text
      Client                                              Server
        |                                                   |
        | ====== 1. UDP Datagram (Data) ==================> |
        | ====== 2. UDP Datagram (Data) ==================> |
        | ====== 3. UDP Datagram (Data) ==================> |
        |        (No handshake, no waiting, no ACKs)        |
```

If a UDP datagram gets lost, it is gone forever. The sender will not know, and it will not retransmit. If datagrams arrive out of order, the receiver's networking stack hands them to the application out of order.

#### Why Use UDP?

You might wonder why a system designer would ever choose an unreliable protocol. The answer is **latency and overhead**.

Because UDP skips the three-way handshake, there is no setup delay. Because it doesn't track sequence numbers or wait for acknowledgments, it consumes minimal CPU and memory. Furthermore, UDP avoids the "head-of-line blocking" problem inherent in TCP, where one lost packet halts the processing of all subsequent packets until the lost one is retransmitted.

**Common UDP Use Cases:**

* **DNS (Domain Name System):** As discussed in Section 3.2, DNS queries are small, and speed is paramount. A lost query is simply retried by the application layer.
* **Live Video and Audio Streaming:** If a frame of video is lost during a live sports broadcast, retransmitting it a second later is useless—the moment has passed. It's better to accept a momentary glitch on the screen and keep playing the live feed. (We will explore this deeply in Chapter 19).
* **Online Multiplayer Gaming:** First-person shooters rely on UDP. Sending the player's real-time position instantly is more important than ensuring every single micro-movement packet arrived sequentially.
* **IoT Telemetry:** Sensors constantly broadcasting temperature or location data often use UDP, as the occasional dropped reading is acceptable given the high frequency of updates.

### TCP vs. UDP: Summary Comparison

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection Type** | Connection-oriented (requires handshake) | Connectionless (fire and forget) |
| **Reliability** | High (guaranteed delivery via retransmission) | Low (best-effort delivery) |
| **Ordering** | Guaranteed sequential order | Unordered |
| **Overhead** | High (20-byte header, stateful tracking) | Low (8-byte header, stateless) |
| **Speed** | Slower (due to handshakes and ACKs) | Extremely Fast |
| **Data Boundary** | Byte stream (continuous flow) | Datagrams (discrete packets) |

### System Design Implications

Choosing between TCP and UDP is rarely a coin toss; it is dictated by the precise latency, throughput, and availability requirements of your system (Chapter 1.3).

Historically, this was a strict binary choice: you either chose the reliability of TCP or the speed of UDP. However, modern system design is beginning to blur these lines. As we will see in the next section (*3.4 HTTP/1.1, HTTP/2, and HTTP/3*), the networking community is increasingly building reliable, congestion-controlled protocols *on top* of UDP (such as QUIC) to bypass the inherent handshake latency of TCP while maintaining its guarantees.

## 3.4 HTTP/1.1, HTTP/2, and HTTP/3

While TCP and UDP handle the physical and transport logistics of moving bits across the globe, the Application Layer (Layer 7) defines the actual conversational language between client and server. For the vast majority of web traffic, APIs, and microservices, that language is the **Hypertext Transfer Protocol (HTTP)**.

Since its inception, HTTP has undergone significant architectural shifts. System designers must understand these evolutions because the choice of protocol dictates latency, connection management, and infrastructure costs.

### HTTP/1.1: The Persistent Standard

Finalized in 1997, HTTP/1.1 is still widely used, particularly for internal communication between microservices. It is a human-readable, text-based protocol structured around a simple Request-Response paradigm.

One of the most critical improvements HTTP/1.1 brought to early web architecture was the concept of **Persistent Connections** (via the `Connection: keep-alive` header). Prior to this, a client had to open a new TCP connection (and perform a new three-way handshake) for every single asset on a webpage—an HTML file, an image, a stylesheet. HTTP/1.1 allowed a single TCP connection to be kept open and reused for multiple sequential requests.

However, HTTP/1.1 suffers from a major architectural flaw: **Application-Level Head-of-Line (HoL) Blocking**.

Because HTTP/1.1 requires requests and responses on a single connection to be strictly sequential, a large or slow response completely blocks the connection for subsequent requests.

```text
HTTP/1.1 Connection (Sequential)
[TCP Handshake & TLS Setup]
  |
  +-- Request 1 (HTML) ---->
  <-- Response 1 ----------+
  |
  +-- Request 2 (Heavy Image) ----> (Blocks connection until complete)
  <-- Response 2 (Buffering...) --+
  <-- Response 2 (Done) ----------+
  |
  +-- Request 3 (Tiny CSS) -------> (Had to wait for Request 2)
  <-- Response 3 -----------------+
```

To work around this, modern web browsers open multiple parallel TCP connections to a single domain (typically capped at 6). While this mitigates HoL blocking, it wastes server resources and forces the network to maintain idle TCP connections.

### HTTP/2: Multiplexing and Binary Framing

Published in 2015, HTTP/2 aimed to solve the performance bottlenecks of HTTP/1.1 without changing the semantics (methods, status codes, and headers remained identical).

The most radical change was moving from a text-based protocol to a **binary framing layer**. Data is broken down into smaller, interleaved binary frames. This fundamental shift enabled **Multiplexing**.

With multiplexing, a client and server can send multiple concurrent requests and responses over a *single* TCP connection. The binary frames from different requests are tagged with a "Stream ID," allowing the receiver to reassemble them perfectly, regardless of the order they arrive in.

```text
HTTP/2 Single TCP Connection (Multiplexed)
[TCP Handshake & TLS Setup]
  |
  +-- Stream 1: Request 1 (HTML) ---->
  +-- Stream 3: Request 2 (Heavy Image) ---->
  +-- Stream 5: Request 3 (Tiny CSS) ------->
  |
  <-- Stream 1: Response 1 (HTML) ----------+
  <-- Stream 5: Response 3 (Tiny CSS) ------+ (Returns instantly!)
  <-- Stream 3: Response 2 (Heavy Image) ---+ (Still downloading, but not blocking)
```

**Additional HTTP/2 Features:**

* **Header Compression (HPACK):** HTTP/1.1 sends plain-text headers with every request, which often includes redundant data like large cookies. HTTP/2 uses HPACK to compress headers and deduplicate them across a session, significantly reducing bandwidth.
* **Server Push:** Allows the server to preemptively send resources to the client before the client even asks for them. (Note: In practice, Server Push proved difficult to optimize and is being deprecated by many browsers).

**The Remaining Bottleneck: TCP HoL Blocking**
HTTP/2 solved HoL blocking at the *application* layer. However, because it still relies on TCP, it is vulnerable to **TCP-Level HoL Blocking**. If a single TCP packet is dropped due to network congestion, the TCP protocol halts the entire stream to request a retransmission. Even if the lost packet only belonged to the "Heavy Image" stream, the "Tiny CSS" stream is blocked because TCP guarantees ordered delivery and doesn't understand HTTP/2's internal multiplexing.

### HTTP/3: The QUIC Revolution

To solve the limitations of TCP, the architects of the web had to look further down the OSI model. Finalized in 2022, HTTP/3 abandons TCP entirely. Instead, it runs on a new Transport Layer protocol called **QUIC** (Quick UDP Internet Connections).

QUIC is built on top of **UDP** (User Datagram Protocol). As discussed in Section 3.3, UDP is fast but unreliable. QUIC effectively rebuilds the reliability, congestion control, and ordering guarantees of TCP directly into the protocol, but with modern optimizations.

#### Why QUIC Changes Everything

1. **Independent Streams (Solving TCP HoL Blocking):** QUIC understands multiplexing natively at the transport layer. If a packet belonging to Stream A is dropped, only Stream A pauses to wait for retransmission. Streams B, C, and D continue processing unimpeded.
2. **Zero-RTT Connection Setup:** In older protocols, establishing a secure connection required a TCP handshake followed by a TLS handshake—often taking 3 to 4 round trips. QUIC merges the transport and cryptographic handshakes. If a client has spoken to a server before, QUIC can establish a secure connection in **0-RTT** (Zero Round Trip Time), meaning it starts sending application data immediately.
3. **Connection Migration:** TCP connections are bound by a 4-tuple: Source IP, Source Port, Destination IP, Destination Port. If your smartphone switches from Wi-Fi to a cellular network, your IP address changes, and all TCP connections instantly break. QUIC identifies connections using a unique **Connection ID** rather than an IP address. You can seamlessly jump between networks without dropping an active HTTP/3 download or API request.

### Summary Comparison

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
| :--- | :--- | :--- | :--- |
| **Transport Protocol** | TCP | TCP | UDP (QUIC) |
| **Data Format** | Plain Text | Binary | Binary |
| **Connection Strategy** | Multiple Connections (6 per origin)| Single Connection (Multiplexed) | Single Connection (Multiplexed) |
| **Application HoL Blocking**| Yes | No | No |
| **Transport HoL Blocking** | Yes | Yes | No |
| **Security (TLS)** | Optional (usually TLS 1.2+) | Mandatory in practice | Mandatory (Built-in TLS 1.3) |

### System Design Implications

As a system designer, your choice of HTTP version impacts infrastructure topology:

* **Public-Facing vs. Internal:** It is standard practice to terminate HTTP/3 (QUIC) or HTTP/2 at the edge of your network—such as a CDN (Chapter 13) or an API Gateway (Chapter 4). Once the traffic crosses your firewall into your secure data center, reverse proxies often translate the traffic down to HTTP/1.1 to communicate with backend microservices. This is because the latency benefits of HTTP/2/3 are most pronounced over long-distance, lossy mobile networks, whereas HTTP/1.1 overhead is negligible inside a multi-gigabit data center LAN.
* **CPU Overhead:** UDP is traditionally processed in user-space, bypassing some of the hardware-level kernel optimizations that TCP has enjoyed for decades. Consequently, terminating HTTP/3/QUIC traffic can consume significantly more CPU on your load balancers compared to HTTP/2. Designers must provision infrastructure accordingly.

## 3.5 WebSockets and Server-Sent Events (SSE)

Up to this point, our discussion of Layer 7 protocols has centered around a fundamental paradigm: the client asks, and the server answers. In standard HTTP, the server is inherently passive. It cannot initiate communication; it can only respond to a request.

However, modern applications demand real-time interactivity. Live chat, stock tickers, multiplayer games, and collaborative document editing require data to flow continuously without waiting for the user to click a button or refresh a page.

Historically, system designers bypassed the HTTP request-response limitation using a technique called **Long Polling**. In long polling, the client opens an HTTP request, but the server deliberately holds the connection open until it has new data to send. Once the server responds, the client immediately opens a new request. While functional, long polling is incredibly resource-intensive, generating massive HTTP header overhead and constantly burning CPU cycles on connection setup and teardown.

To solve this natively, two distinct technologies emerged: **WebSockets** and **Server-Sent Events (SSE)**.

### WebSockets: Full-Duplex Bidirectional Communication

Standardized in 2011, WebSockets provide a persistent, full-duplex (two-way) communication channel over a single, long-lived TCP connection. Both the client and the server can send data to each other simultaneously, at any time, with extremely low latency.

#### The WebSocket Handshake

WebSockets are designed to work seamlessly alongside standard web traffic over ports 80 and 443. The process actually begins as a standard HTTP request:

```text
      Client                                              Server
        |                                                   |
        | ------ 1. HTTP GET /chat -----------------------> |
        |        Headers: Upgrade: websocket                |
        |                 Connection: Upgrade               |
        |                                                   |
        | <----- 2. HTTP 101 Switching Protocols ---------- |
        |                                                   |
        | ====== 3. TCP Connection Kept Open ============== |
        |                                                   |
        | <----> 4. Bidirectional WebSocket Frames <------> |
        |        (Binary or Text Payload, Minimal Overhead) |
```

1. **The Upgrade:** The client sends an HTTP request asking the server to "upgrade" the connection to the WebSocket protocol.
2. **The Switch:** If the server supports WebSockets, it responds with an `HTTP 101 Switching Protocols` status code.
3. **The Stream:** The HTTP protocol is abandoned. The underlying TCP connection remains open, and the two parties now exchange raw WebSocket "frames" (which only have a 2-10 byte header overhead, compared to hundreds of bytes for HTTP headers).

**Common WebSocket Use Cases:**

* Real-time multiplayer gaming (where player positions must be constantly synchronized).
* Live chat and messaging applications (e.g., Slack, WhatsApp Web).
* Collaborative applications (e.g., Google Docs, Figma).

### Server-Sent Events (SSE): Unidirectional Streaming

While WebSockets are powerful, they are often overkill. Many real-time features only require the server to push updates to the client, without the client needing to stream continuous data back.

**Server-Sent Events (SSE)** is an HTML5 standard that allows a client to open a persistent connection over standard HTTP, through which the server can continuously push text-based event data.

#### The SSE Flow

Unlike WebSockets, SSE does not require a protocol upgrade or a custom framing mechanism. It is just a very long, continuous HTTP response.

```text
      Client                                              Server
        |                                                   |
        | ------ 1. HTTP GET /live-feed ------------------> |
        |        Headers: Accept: text/event-stream         |
        |                                                   |
        | <----- 2. HTTP 200 OK --------------------------- |
        |        Headers: Content-Type: text/event-stream   |
        |                 Transfer-Encoding: chunked        |
        |                                                   |
        | ====== 3. Connection Kept Open ================== |
        |                                                   |
        | <----- 4. Server Pushes Data -------------------- |
        |        data: {"score": "1-0", "team": "A"}\n\n    |
        |                                                   |
        | <----- 5. Server Pushes Data (Later) ------------ |
        |        data: {"score": "1-1", "team": "B"}\n\n    |
```

1. **The Request:** The client requests a resource, explicitly asking for an event stream.
2. **The Stream:** The server responds with `200 OK` but keeps the connection open, continuously flushing new chunks of text data as events occur.

**Key Features of SSE:**

* **Built-in Reconnection:** If the connection drops, the browser natively attempts to reconnect. It also sends a `Last-Event-ID` header, allowing the server to resume exactly where it left off. (WebSockets require you to write custom retry and state-recovery logic).
* **HTTP/2 Multiplexing:** As discussed in Section 3.4, HTTP/2 allows multiple streams over a single TCP connection. SSE leverages this perfectly. You can have a persistent SSE stream open while standard HTTP requests flow concurrently over the same connection.
* **Text-Only:** SSE is strictly limited to UTF-8 text (usually JSON). If you need to send binary data (like raw audio or images), you must base64 encode it, which increases payload size.

**Common SSE Use Cases:**

* Live sports scoreboards and stock market tickers.
* Social media news feed updates.
* Streaming AI-generated text responses (e.g., ChatGPT's typing effect).

### WebSockets vs. SSE: Summary Comparison

| Feature | WebSockets | Server-Sent Events (SSE) | Long Polling (Legacy) |
| :--- | :--- | :--- | :--- |
| **Direction** | Bidirectional (Full-Duplex) | Unidirectional (Server to Client) | Unidirectional (Server to Client) |
| **Protocol** | `ws://` or `wss://` (TCP) | standard `http://` or `https://` | standard `http://` or `https://` |
| **Data Format** | Binary or Text | UTF-8 Text Only | Any |
| **Overhead** | Very Low (after handshake) | Low | Very High (constant HTTP headers) |
| **Built-in Reconnect** | No (Requires custom logic) | Yes | N/A (inherently creates new requests) |

### System Design Implications

Introducing persistent connections fundamentally changes how you design backend infrastructure.

When dealing with standard HTTP/1.1 or HTTP/2 APIs, connections are stateless and relatively short-lived. Load balancers (Chapter 10) can distribute incoming requests evenly across any available application server.

However, with WebSockets and SSE, **connections are stateful and long-lived**. If User A connects to Server 1 via WebSocket, Server 1 must maintain that socket connection in memory.

1. **The C10M Problem:** Your servers must be tuned at the OS level to handle hundreds of thousands, or even millions, of concurrent open file descriptors (sockets). Memory management becomes critical.
2. **State Management:** If User B connects to Server 2, and wants to send a chat message to User A (who is on Server 1), Server 2 cannot communicate directly with User A. The system requires a distributed Pub/Sub mechanism (like Redis or Kafka, covered in Chapter 11) to route the message internally from Server 2 to Server 1, which then pushes it through the WebSocket to User A.
3. **Load Balancer Timeouts:** Most default reverse proxies (like Nginx or HAProxy) are configured to drop idle HTTP connections after 30 to 60 seconds. You must explicitly reconfigure your infrastructure to allow long-lived connections, and implement application-level "ping/pong" heartbeats to prevent intermediate firewalls from killing silent WebSockets.
