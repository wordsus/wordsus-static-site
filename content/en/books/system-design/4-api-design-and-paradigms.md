In modern distributed systems, components rarely exist in isolation. Building upon our networking foundations, this chapter explores the critical art of Application Programming Interface (API) design. An API acts as the strict digital contract between services, dictating how they interact across network boundaries. We will explore the primary paradigms shaping today's architectures: the resource-oriented ubiquity of REST, the client-driven flexibility of GraphQL, and the high-performance binary RPCs of gRPC. Finally, we will examine how to manage traffic securely via API Gateways and how to evolve these interfaces over time without breaking clients.

## 4.1 RESTful API Principles

Representational State Transfer (REST) is an architectural style for distributed hypermedia systems, first defined by Roy Fielding in his 2000 doctoral dissertation. Unlike SOAP (Simple Object Access Protocol), which is a rigid, standard-based protocol, REST is a set of guiding principles and constraints. When an API adheres to these principles, it is considered "RESTful."

Because REST is protocol-agnostic in theory, in practice, it is almost universally implemented over HTTP (leveraging the networking foundations discussed in Chapter 3). A well-designed RESTful API treats business entities as **resources** and relies on standard HTTP methods to interact with them, ensuring predictable, scalable, and resilient system interactions.

### The Six Architectural Constraints

To be strictly considered RESTful, a system must adhere to six architectural constraints. These constraints are designed to promote performance, scalability, simplicity, and reliability.

1. **Client-Server Separation:** The client and the server act independently. The client is responsible for the user interface and user state, while the server handles backend data storage and business logic (Separation of Concerns, as discussed in Chapter 2). This allows both components to evolve independently.
2. **Statelessness:** Every request from the client to the server must contain all the information necessary to understand and process the request. The server must not store any session state about the client context between requests. This constraint is critical for system scaling, as any server replica can handle any request without needing to synchronize session data.
3. **Cacheability:** Responses must explicitly define themselves as cacheable or non-cacheable. If a response is cacheable, the client (or an intermediary) is given the right to reuse that response data for later, equivalent requests.
4. **Layered System:** A client cannot ordinarily tell whether it is connected directly to the end server or to an intermediary along the way (such as a load balancer, reverse proxy, or API gateway). This enables the insertion of security, caching, and routing layers without altering client code.
5. **Code on Demand (Optional):** Servers can temporarily extend or customize the functionality of a client by transferring executable code (e.g., JavaScript). This is the only optional constraint.
6. **Uniform Interface:** This is the central feature that distinguishes a REST API from a non-REST API. It decouples the architecture, enabling each part to evolve independently. It is defined by four sub-constraints:
   * **Identification of resources:** Resources are identified in requests using URIs.
   * **Manipulation of resources through representations:** When a client holds a representation of a resource (e.g., a JSON document), it has enough information to modify or delete the resource on the server.
   * **Self-descriptive messages:** Each message includes enough information to describe how to process it (e.g., standard HTTP methods, MIME types like `application/json`).
   * **Hypermedia as the Engine of Application State (HATEOAS):** Clients dynamically discover available actions through hyperlinks provided by the server in the response.

### Resource-Oriented URI Design

In REST, everything revolves around **resources**. A resource is any data entity that can be named, such as a User, an Order, or a Product.

URIs (Uniform Resource Identifiers) should be designed to represent the hierarchy and identity of these resources using **nouns, not verbs**. Actions are inferred from the HTTP method used, keeping the URI clean and predictable.

```text
    Bad Design (Verb-based RPC style):
    POST /createNewUser
    GET  /getUserById?id=123
    POST /deleteOrder?id=456

    Good Design (Resource-oriented REST style):
    POST /users
    GET  /users/123
    DELETE /orders/456
```

#### Anatomy of a RESTful URI

```text
https://api.example.com/users/123/orders?status=shipped
\___/   \_____________/ \___/ \_/ \____/ \____________/
  |            |          |    |    |          |
Scheme        Host    Resource ID Sub-Resource Query Parameter
                     (Collection)              (Filter)
```

* **Collections vs. Instances:** Use plural nouns for collections (`/users`) and append an ID for a specific instance (`/users/123`).
* **Nesting:** Sub-resources can be nested to show relationships, but should generally be capped at one or two levels deep to avoid overly complex URLs (e.g., `/users/123/orders` is good; `/users/123/orders/456/items/789` should be simplified to `/orders/456/items`).

### HTTP Methods: Operations, Safety, and Idempotency

REST leverages standard HTTP methods to define the CRUD (Create, Read, Update, Delete) operations being performed on a resource.

When designing distributed systems, understanding the **safety** and **idempotency** of these methods is paramount.

* **Safe:** A method is safe if it does not modify the resource state on the server (read-only).
* **Idempotent:** A method is idempotent if making the identical request multiple times produces the same result on the server state as making a single request. This is crucial for designing **retry mechanisms** (Chapter 16) in distributed systems where network drops can cause duplicated requests.

| HTTP Method | CRUD Operation | Target | Safe | Idempotent | Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **GET** | Read | `/users` | Yes | Yes | Retrieves a representation of a resource or collection. |
| **POST** | Create | `/users` | No | No | Submits data to create a *new* resource. The server dictates the new ID. |
| **PUT** | Update (Replace) | `/users/123` | No | Yes | Replaces the *entire* resource with the payload. If it doesn't exist, it may create it. |
| **PATCH** | Update (Partial) | `/users/123` | No | No* | Applies partial modifications to a resource. |
| **DELETE** | Delete | `/users/123` | No | Yes | Removes the specified resource. |

*> Note on PATCH idempotency: While PUT is strictly idempotent (overwriting with the exact same state), PATCH is not inherently idempotent. For example, a PATCH request instructing the server to "increment a counter by 1" applied twice will result in a +2 increment.*

### Self-Descriptive Messages and Status Codes

A REST API must use standard HTTP status codes to communicate the outcome of a client's request. This prevents clients from having to parse a successful `200 OK` response just to find an embedded `{"error": "User not found"}` message—an anti-pattern common in early web services.

* **`2xx` (Success):** The action was successfully received, understood, and accepted. (e.g., `200 OK`, `201 Created`, `204 No Content`).
* **`3xx` (Redirection):** Further action must be taken by the client to complete the request.
* **`4xx` (Client Error):** The request contains bad syntax or cannot be fulfilled due to client fault. (e.g., `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `429 Too Many Requests`).
* **`5xx` (Server Error):** The server failed to fulfill an apparently valid request. (e.g., `500 Internal Server Error`, `503 Service Unavailable`).

### HATEOAS: Hypermedia as the Engine of Application State

HATEOAS is the most advanced, yet most frequently ignored, constraint of REST (often referred to as Level 3 on the Richardson Maturity Model). Under HATEOAS, the client interacts with the server entirely through hypermedia dynamically provided by the server responses.

Instead of hardcoding endpoint URIs in the frontend application, the API provides links telling the client what state transitions are currently valid for the requested resource.

**Example of a HATEOAS Response:**

```json
{
  "account_number": "12345",
  "balance": 100.00,
  "currency": "USD",
  "status": "active",
  "_links": {
    "self": { "href": "/accounts/12345" },
    "deposit": { "href": "/accounts/12345/deposit" },
    "withdraw": { "href": "/accounts/12345/withdraw" },
    "close_account": { "href": "/accounts/12345/close" }
  }
}
```

If the account balance drops below zero, the server might omit the `withdraw` link in the next representation, inherently communicating business logic constraints to the client without requiring the client to replicate that logic locally. While powerful for decoupling clients and servers, HATEOAS introduces complexity in response parsing and payload size, leading many modern systems to adopt partial REST compliance.

## 4.2 GraphQL Fundamentals

While REST relies on a rigid, server-defined architecture of multiple endpoints, GraphQL shifts the power to the client. Developed internally by Facebook in 2012 and open-sourced in 2015, GraphQL is both a query language for APIs and a server-side runtime for executing those queries using a type system you define for your data.

GraphQL was explicitly designed to operate over a single endpoint (typically via HTTP POST), allowing clients to request exactly the data they need—nothing more, nothing less.

### The Problem It Solves: Over-fetching and Under-fetching

In a traditional REST architecture, clients are often at the mercy of how the server structures its resource representations. This leads to two common inefficiencies in distributed systems, especially pronounced on mobile networks:

* **Over-fetching:** A client needs a user's name to display a profile header, but the `GET /users/123` endpoint returns the entire user object, including their email, address, preferences, and account history. The network bandwidth is wasted on unused data.
* **Under-fetching (The N+1 Problem):** A client needs a user's name and the titles of their recent posts. It first calls `GET /users/123`, then parses the response to find the user's post IDs, and subsequently makes multiple calls to `GET /posts/{id}`. A single UI render requires a waterfall of sequential network requests.

GraphQL eliminates both issues by allowing the client to traverse a graph of relationships in a single request.

```text
+-------------------------------------------------------------+
| REST vs. GraphQL Data Fetching Paradigms                    |
+-------------------------------------------------------------+

REST Architecture (Multiple Trips, Fixed Payloads)
[Client]  -- 1. GET /users/123 ---------> [API] -> Returns User
          <-- User Data (Over-fetched) --
          -- 2. GET /users/123/posts ---> [API] -> Returns Posts
          <-- Posts Data ----------------
          -- 3. GET /users/123/friends -> [API] -> Returns Friends
          <-- Friends Data --------------

GraphQL Architecture (Single Trip, Tailored Payload)
[Client]  -- POST /graphql ------------------------> [GraphQL API]
             query {                                    |
               user(id: "123") {                        |-> Resolves User
                 name                                   |-> Resolves Posts
                 posts { title }                        |-> Resolves Friends
                 friends { name }
               }
             }
          <-- Tailored JSON Response (Exact Match) -
```

### The Schema Definition Language (SDL)

At the heart of any GraphQL API is its schema. The schema is a strongly typed contract between the client and the server. It defines what queries are allowed, what types of data can be fetched, and the relationships between those types.

GraphQL uses its own syntax, the Schema Definition Language (SDL), to define these types:

```graphql
type User {
  id: ID!
  name: String!
  email: String
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  getUser(id: ID!): User
  recentPosts(limit: Int!): [Post!]!
}
```

*Note: The `!` indicates that a field is non-nullable. If a client requests a `User`, the API guarantees that an `id` and `name` will be returned.*

### Core Operations: Queries, Mutations, and Subscriptions

While REST relies on HTTP methods (GET, POST, PUT, DELETE) to define actions, GraphQL uses three distinct operation types within the payload itself:

1. **Queries (Read):** Used by the client to request data. Queries run in parallel on the server, optimizing read times.
2. **Mutations (Write):** Used to modify data on the server (create, update, delete) and return a value. Unlike queries, mutations execute serially to prevent race conditions during state changes.
3. **Subscriptions (Real-time):** Used to establish a persistent connection (usually via WebSockets, discussed in Chapter 3) to the server. When a specific event occurs on the server, it pushes updated data to the subscribed clients.

### How it Works: The Resolver Architecture

GraphQL is not a database technology; it is an API routing layer. When a server receives a GraphQL query, it validates it against the schema. If valid, the GraphQL engine executes the query using **Resolvers**.

A resolver is simply a function responsible for populating the data for a single field in your schema.

If a client requests a `User` and their `posts`, the engine first calls the `User` resolver (which might query a relational database). Once the User object is retrieved, the engine looks at the next level of the query tree and calls the `posts` resolver (which might query a NoSQL document store or make an internal gRPC call to a separate Microservice).

This makes GraphQL an excellent pattern for **API Gateways** (Chapter 4.4) or a "Backend-for-Frontend" (BFF) layer, as it can aggregate data from legacy monolithic databases, modern microservices, and third-party APIs into a single, cohesive graph for the client.

### Trade-offs and System Considerations

While powerful, GraphQL introduces new complexities into system design:

* **Caching Complexity:** Because most GraphQL requests use `POST` to a single `/graphql` endpoint, you cannot rely on out-of-the-box HTTP caching mechanisms (like CDNs or browser caches) the way you can with REST `GET` requests. Caching must be implemented at the application layer or via specialized clients (like Apollo Client) using globally unique IDs.
* **Performance Bottlenecks:** Giving clients the power to query arbitrary data can be dangerous. A maliciously or poorly constructed query with deep nesting (e.g., requesting a user, their friends, their friends' friends, etc.) can easily DDoS the server. System designers must implement **query depth limiting** and **query cost analysis**.
* **The Server-Side N+1 Problem:** While GraphQL solves the N+1 problem for the *client*, it often shifts it to the *server*. If querying a list of 50 users and their posts, naive resolvers will make 1 database query for the users, and 50 separate database queries for each user's posts. Tools like **DataLoader** are required to batch and cache these internal requests before they hit the database.

## 4.3 gRPC and Protocol Buffers

While REST and GraphQL are dominant in client-to-server communication, they often fall short in high-throughput, low-latency, backend-to-backend scenarios (such as internal microservices communication). To address this, Google developed and open-sourced **gRPC** (gRPC Remote Procedure Calls) in 2015.

gRPC is a modern, high-performance evolution of the traditional RPC (Remote Procedure Call) framework. It relies on two fundamental technologies to achieve its performance: **HTTP/2** as the transport layer (discussed in Chapter 3.4) and **Protocol Buffers** (Protobuf) as both the Interface Definition Language (IDL) and the underlying message interchange format.

### Protocol Buffers: The Binary Advantage

Unlike REST and GraphQL, which typically rely on JSON (a human-readable, text-based format), gRPC uses Protocol Buffers. Protobuf is a strongly-typed, binary serialization format.

When data is serialized into JSON, it includes field names, quotes, and whitespace, resulting in a bulky payload. The parsing process at the destination involves reading characters and converting them into memory objects, which is computationally expensive.

Protobuf, conversely, serializes data into a highly compressed binary stream. It strips away field names and metadata, relying on a pre-defined contract to map the binary data back into objects at the destination. This results in significantly smaller payloads and dramatically faster serialization/deserialization times—often an order of magnitude faster than JSON.

#### The `.proto` Contract

To use gRPC, system designers must first define the service interface and the payload structures in a `.proto` file. This file acts as the ultimate source of truth for the API contract.

```protobuf
syntax = "proto3";

package ecommerceservice;

// The request message containing the user's ID.
message UserRequest {
  int32 user_id = 1;
}

// The response message containing user details.
message UserResponse {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

// The service definition.
service UserService {
  // A simple RPC
  rpc GetUser (UserRequest) returns (UserResponse);
}
```

Notice the integers (`= 1`, `= 2`) assigned to each field. These are **field numbers**, and they are critical. They are used to identify fields in the binary encoded data, allowing Protobuf to remain backward and forward compatible even if fields are added or removed later, provided the field numbers are not reused.

### The Architecture: Stubs and Polyglot Environments

Once the `.proto` file is defined, the gRPC compiler (`protoc`) auto-generates the client and server code in virtually any modern programming language (Java, Go, Python, Node.js, C++, etc.).

This auto-generated code includes **Stubs**. A stub provides the exact same methods as the server. To the client application, calling a remote microservice looks and feels exactly like calling a local function within its own codebase.

```text
+---------------------+                           +---------------------+
|   Client Service    |                           |   Server Service    |
|    (e.g., Node.js)  |                           |     (e.g., Go)      |
|                     |                           |                     |
|  +---------------+  |      Network (HTTP/2)     |  +---------------+  |
|  |  Client Stub  |  |----- Binary Protobuf ----->  |  Server Stub  |  |
|  | (Auto-gen)    |  |<---- Binary Protobuf ------  | (Auto-gen)    |  |
|  +---------------+  |                           |  +---------------+  |
+---------------------+                           +---------------------+
```

This architecture natively solves the polyglot microservices problem. A Node.js API Gateway can seamlessly call a Go user service, which in turn calls a Python recommendation engine, all sharing the same `.proto` contracts and enjoying type safety across language boundaries.

### Communication Paradigms

Because gRPC is built on top of HTTP/2, it natively supports multiplexing (sending multiple requests and responses over a single TCP connection concurrently) and bidirectional streaming. gRPC exposes four distinct communication paradigms:

1. **Unary RPC:** The classic request-response model. The client sends a single request and gets a single response.
2. **Server Streaming RPC:** The client sends a single request, and the server returns a stream of messages (e.g., downloading a large file or subscribing to a live stock ticker).
3. **Client Streaming RPC:** The client sends a stream of messages to the server, and the server returns a single response once the stream is complete (e.g., uploading a large file or IoT sensor data ingestion).
4. **Bidirectional Streaming RPC:** Both client and server send a sequence of messages using an independent read-write stream. The streams operate entirely independently, meaning the server can respond while the client is still sending data (e.g., real-time multiplayer gaming or chat applications).

### Trade-offs and System Considerations

While gRPC offers unparalleled performance for internal systems, it is not a silver bullet for all API design needs:

* **Browser Support (gRPC-Web):** Native gRPC requires direct access to HTTP/2 frames, which modern web browsers do not expose to JavaScript. To use gRPC from a web frontend to a backend, you must use a proxy layer like gRPC-Web or an API Gateway that transcodes REST/JSON to gRPC/Protobuf.
* **Human Readability:** Because Protobuf is binary, you cannot easily inspect the payload using standard network tools (like browser developer tools or simple `curl` commands) without an intermediary tool that knows the `.proto` schema to deserialize the data. Debugging requires specialized setups.
* **Load Balancing Complexity:** Because gRPC relies on persistent, long-lived HTTP/2 connections, traditional Layer 4 (Transport) load balancers are ineffective. They will route the initial connection to one server, and all subsequent multiplexed requests will hit that single server, leading to uneven loads. gRPC requires Layer 7 (Application) load balancers (discussed in Chapter 10.1) that can inspect HTTP/2 frames and balance individual RPC calls, or it requires client-side load balancing.

**Summary of API Paradigms:**

* Use **REST** for public-facing, generic web APIs where cacheability and ecosystem compatibility are paramount.
* Use **GraphQL** for dynamic frontends (web and mobile) where minimizing network trips and tailoring payloads is critical.
* Use **gRPC** for internal microservices communication, polyglot environments, and strict performance/latency requirements.

## 4.4 API Gateways and Rate Limiting

In a monolithic architecture, clients communicate directly with a single backend server. However, in a distributed microservices environment, an application might be split across dozens or hundreds of distinct, specialized services. If clients were to communicate directly with these internal microservices, it would introduce severe coupling, numerous network round-trips, and significant security vulnerabilities.

The **API Gateway** pattern solves this by introducing a single point of entry—a "front door"—for all incoming client requests.

### The Role of the API Gateway

An API Gateway sits between the clients and the backend services. It acts as a specialized reverse proxy (a concept explored further in Chapter 10), but with added intelligence specifically designed for API management.

```text
+--------------+
| Mobile App   |--\                                   /--> [User Service]
+--------------+   \      +-------------------+      /     (REST)
                    \     |                   |     /
+--------------+     \    |                   |    /
| Web Browser  | -------->|    API GATEWAY    | ---------> [Product Catalog]
+--------------+     /    |                   |    \       (GraphQL)
                    /     |                   |     \
+--------------+   /      +-------------------+      \
| B2B Partner  |--/                 |                 \--> [Payment Engine]
+--------------+                    |                      (gRPC)
                              [Cache / Redis]
```

#### Core Capabilities

1. **Request Routing:** The gateway inspects the incoming request URL and routes it to the appropriate internal microservice. For example, `[api.example.com/users](https://api.example.com/users)` maps to the internal User Service, while `[api.example.com/products](https://api.example.com/products)` maps to the Product Catalog.
2. **API Composition (Aggregation):** To prevent the under-fetching (N+1) problem discussed in Chapter 4.2, the gateway can fan out a single client request to multiple backend services, aggregate the responses, and return a single cohesive payload to the client. This is often referred to as the **Backend-for-Frontend (BFF)** pattern.
3. **Protocol Translation:** The gateway can translate between web-friendly protocols (like REST or GraphQL over HTTP/1.1) and internal high-performance protocols (like gRPC over HTTP/2 or message queues like AMQP).
4. **Offloading Cross-Cutting Concerns:** Instead of replicating the same logic in every microservice, the gateway handles shared responsibilities centrally:
    * **Authentication & Authorization:** Validating JWTs or OAuth tokens before the request ever hits a microservice.
    * **SSL Termination:** Decrypting incoming HTTPS traffic so internal network communication can happen over faster, unencrypted HTTP (though zero-trust networks mandate mTLS everywhere, as covered in Chapter 17).
    * **Logging and Tracing:** Injecting correlation IDs into headers for distributed tracing (Chapter 12).

### Rate Limiting: Protecting the System

A critical responsibility of the API Gateway is protecting the backend from being overwhelmed, whether by malicious Distributed Denial of Service (DDoS) attacks, buggy client scripts, or sudden, legitimate spikes in traffic. **Rate Limiting** controls the rate of traffic sent or received by an endpoint.

If a client exceeds their allotted quota, the API Gateway rejects the request, typically returning an HTTP `429 Too Many Requests` status code.

#### Common Rate Limiting Algorithms

System designers must choose the right rate-limiting algorithm based on their specific traffic patterns and strictness requirements.

**1. Token Bucket Algorithm**

* **How it works:** Imagine a bucket that holds a maximum number of tokens. Tokens are added to the bucket at a fixed rate (e.g., 10 tokens per second). When a request arrives, it must take a token from the bucket to proceed. If the bucket is empty, the request is dropped.
* **Pros:** Highly memory-efficient and allows for sudden, short bursts of traffic (up to the bucket's maximum capacity). This is the algorithm used by Amazon and Stripe.

**2. Leaking Bucket Algorithm**

* **How it works:** Similar to the token bucket, but requests themselves enter the bucket (a queue). The bucket leaks requests at a strictly constant rate to the backend. If the bucket/queue is full, incoming requests are discarded.
* **Pros:** Smooths out bursty traffic into a predictable, steady stream, which protects legacy backends that cannot handle sudden spikes.

**3. Fixed Window Counter**

* **How it works:** Time is divided into fixed windows (e.g., 12:00:00 to 12:01:00). A counter increments for every request in that window. If the counter exceeds the limit, requests are dropped until the next window begins.
* **Pros:** Simple to implement.
* **Cons:** The "boundary problem." A massive spike in traffic at the very end of one window and the very beginning of the next can effectively double the allowed rate over a short period.

**4. Sliding Window Log / Counter**

* **How it works:** A hybrid approach that mitigates the fixed window's boundary problem. It tracks the exact timestamps of requests or calculates a weighted average of the previous and current fixed windows to ensure a smooth rate limit over any rolling time frame.
* **Pros:** Highly accurate and prevents boundary spikes.
* **Cons:** Can be memory-intensive if tracking individual request timestamps (Sliding Window Log).

### Distributed Rate Limiting Challenges

In a highly available system, you will not have just one API Gateway; you will have a cluster of them behind a load balancer. If a user is allowed 100 requests per minute, that limit must be enforced globally across all gateway instances, not just per instance.

To achieve this, the API Gateways must share state. This is almost universally handled by an extremely fast, in-memory data store like **Redis**.

However, reading the current count from Redis, checking if it is below the limit, and then incrementing the count introduces a **race condition** in highly concurrent environments. If two gateways read the count simultaneously, they might both allow a request and increment the counter, resulting in an inaccurate total. This is solved by using atomic operations (like Redis's `INCR`), Lua scripts that execute transactionally on the cache server, or advanced techniques like Redis sorted sets for sliding window algorithms.

## 4.5 API Versioning and Backward Compatibility

When an API is deployed to production and consumed by clients, it establishes a strict contract. In distributed systems, the client and the server are decoupled and often managed by entirely different teams or organizations. If the server team alters this contract unexpectedly, client applications (such as mobile apps that users have not updated, or third-party B2B integrations) will break.

**Backward compatibility** is the guarantee that a newer version of an API will not break existing clients that were built for an older version. Managing this evolution safely is a critical responsibility in system design.

### Breaking vs. Non-Breaking Changes

The first step in API lifecycle management is identifying whether a proposed change is "breaking" (backward-incompatible) or "non-breaking" (backward-compatible).

If a change is non-breaking, it can be deployed to the existing API version immediately. If a change is breaking, the system designer must introduce a new API version.

| Change Type | Classification | Description & Examples |
| :--- | :--- | :--- |
| **Adding a new endpoint** | Non-Breaking | Existing clients ignore the new endpoint. |
| **Adding a new field to a response** | Non-Breaking | Well-behaved clients should ignore unrecognized JSON fields. *(Note: gRPC handles this natively via Protobuf field numbers, as seen in Chapter 4.3).* |
| **Adding an *optional* request parameter** | Non-Breaking | Existing clients omit it; the server falls back to a default value. |
| **Removing or renaming a field** | **Breaking** | Clients expecting the field will experience null reference errors or missing data. |
| **Changing a field's data type** | **Breaking** | Changing an `id` from an Integer (`123`) to a String (`"123"`) will crash strongly-typed clients (like iOS/Android apps). |
| **Making an optional parameter *required*** | **Breaking** | Existing clients will start receiving `400 Bad Request` errors. |
| **Tightening validation rules** | **Breaking** | E.g., changing a password maximum length from 50 to 20 characters will reject previously valid requests. |

### API Versioning Strategies

When a breaking change is unavoidable, you must expose the new contract without removing the old one. There are three primary strategies for versioning RESTful APIs, each with distinct trade-offs.

#### 1. URI Path Versioning

This is the most common and pragmatic approach. The version number is explicitly included in the URI path.

* **Example:** `[https://api.example.com/v1/users](https://api.example.com/v1/users)` -> `[https://api.example.com/v2/users](https://api.example.com/v2/users)`
* **Pros:** Extremely easy for clients to understand. Simple to test in a web browser. Trivial to route at the API Gateway layer.
* **Cons:** REST purists argue this violates the principle that a URI should represent a resource, not the schema of the resource (the resource itself hasn't changed, only its representation).

#### 2. Query Parameter Versioning

The version is passed as a query string parameter.

* **Example:** `[https://api.example.com/users?version=2](https://api.example.com/users?version=2)`
* **Pros:** Keeps the base URI clean and focused on the resource. Easy to implement default routing (if no version is provided, default to v1).
* **Cons:** Can be cumbersome for complex requests. Routing at the infrastructure layer is slightly more complex than path-based routing.

#### 3. Content Negotiation (Header Versioning)

This approach relies on HTTP headers, typically the `Accept` header, to specify the desired version.

* **Example:**
    `GET /users`
    `Accept: application/vnd.example.v2+json`
* **Pros:** The most strictly RESTful approach. The URI remains unchanged, and the client simply asks for a specific "representation" of that resource.
* **Cons:** Hardest for clients to use and debug. You cannot simply share a URL with a colleague or test it in a standard browser address bar without a tool like Postman or cURL to inject the headers.

### System Architecture for Multiple Versions

Supporting multiple versions is not just an API layer problem; it is a backend architectural challenge. When `v1` and `v2` are running simultaneously, they often must interact with the same underlying database to prevent data fragmentation.

**Approach A: API Gateway Routing (Microservices)**
The API Gateway inspects the version and routes the request to completely separate, independently deployed microservices.

```text
                          +---> [User Service v1] ---> (Maps data to v1 schema)
                          |
[Client] -> API GATEWAY --+
                          |
                          +---> [User Service v2] ---> (Maps data to v2 schema)
                                         |
                                  [ Shared Database ]
```

**Approach B: Adapter Pattern (Monolithic/Internal Routing)**
A single service handles all requests. The controller layer checks the version, utilizes an adapter to translate legacy `v1` requests into the new internal `v2` domain model, processes the business logic, and then translates the output back to the `v1` format before sending the response.

### The Deprecation Lifecycle

Maintaining old API versions indefinitely incurs significant technical debt, increases security attack surfaces, and slows down feature development. Systems must have a defined deprecation policy.

1. **Announcement:** Notify clients (via email, developer portals) that `v1` is deprecated and will be removed on a specific date.
2. **HTTP Headers:** Start including standard HTTP headers in `v1` responses to programmatically alert clients.
    * `Warning: 299 - "API v1 is deprecated and will be removed on 2026-12-31."`
    * `Sunset: Thu, 31 Dec 2026 23:59:59 GMT` (RFC 8594 explicitly defines this header for sunsetting APIs).
3. **Brownouts:** Temporarily disable the `v1` API for short, scheduled intervals (e.g., for 1 hour on a Tuesday) and return `410 Gone` or `503 Service Unavailable`. This flushes out unmonitored systems or clients who ignored the warnings, forcing them to upgrade before the permanent shutdown.
4. **Final Shutdown:** Permanently remove the `v1` endpoint. Return a `410 Gone` status code, which explicitly tells clients that the resource is no longer available and will not be coming back.
