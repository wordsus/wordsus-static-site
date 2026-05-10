Now that we understand the architectural foundations of web APIs, it is time to design one. At the heart of REST lies the "resource"—a logical abstraction of your business domain into distinct, network-addressable entities.

This chapter moves beyond treating APIs as mere wrappers for database tables. We will explore how to properly identify domain resources, strictly differentiate between collections and singletons, and model complex relationships without falling into the trap of deep nesting. Finally, we will tackle the challenge of translating verb-based processes into RESTful nouns and securely managing resource state transitions.

## 5.1 Identifying Domain Resources and Entities

The foundation of any RESTful architecture—and resource-oriented design in general—lies in accurately identifying the resources that your API will expose. A "resource" is the fundamental unit of information in REST. It is a logical abstraction of data, a physical object, a service, or a process that your API consumers need to interact with.

However, one of the most common pitfalls in API design is treating API resources as exact replicas of the underlying database tables. To design a resilient and decoupled API, you must draw a strict boundary between **Domain Entities** (how data is stored) and **API Resources** (how data is presented and manipulated).

### The Boundary Between Entities and Resources

Before identifying resources, it is critical to understand the distinction between the persistence layer and the presentation layer of your architecture.

* **Entities (The Persistence Layer):** These are the internal data structures and database tables used by your application. They are optimized for storage, data integrity, and internal queries (e.g., normalized relational tables).
* **Resources (The Presentation Layer):** These are the outward-facing abstractions provided to the API consumer. They are optimized for network transmission, client consumption, and business logic execution.

While a resource *can* map one-to-one with a database entity, it rarely should. Exposing your database schema directly through your API creates tight coupling. If you refactor your database for performance, you will inadvertently break your API clients.

#### Mapping Patterns

When identifying resources, you will typically use one of three mapping patterns to translate entities into resources:

1. **1:1 Mapping (Direct Pass-through):** A single entity maps directly to a single resource. (e.g., a `Product` entity becomes a `/products` resource).
2. **N:1 Mapping (Aggregation):** Multiple database entities are combined into a single, cohesive API resource. This prevents the client from having to make multiple API calls to reconstruct a business object.
3. **1:N Mapping (Projection):** A single, complex database entity is split into multiple, distinct API resources based on context or security boundaries.

```text
+-----------------------------------------------------------------------+
|                    DATA MAPPING ABSTRACTION LAYER                     |
+-----------------------------------------------------------------------+
|                                                                       |
|  [ Database Entities ]                             [ API Resources ]  |
|                                                                       |
|  +----------------+                                                   |
|  | products       | ---------------------------->    Product          |
|  +----------------+           (1:1 Mapping)                           |
|                                                                       |
|                                                                       |
|  +----------------+                                                   |
|  | orders         | --+                                               |
|  +----------------+   |                                               |
|  +----------------+   +------------------------->    Order            |
|  | order_items    | --+       (N:1 Aggregation)                       |
|  +----------------+                                                   |
|                                                                       |
|                                                                       |
|  +----------------+   +------------------------->    User             |
|  | users          | --+                                               |
|  | (contains PII, |   |       (1:N Projection)                        |
|  |  passwords,    |   +------------------------->    PublicProfile    |
|  |  preferences)  |                                                   |
|  +----------------+                                                   |
|                                                                       |
+-----------------------------------------------------------------------+

```

### Techniques for Identifying Resources

Identifying the right resources requires stepping away from your database schema and looking closely at the business domain. The most effective approach leverages concepts from Domain-Driven Design (DDD), specifically focusing on the "Ubiquitous Language" shared by domain experts, developers, and users.

#### 1. Linguistic Analysis of User Stories

Start by analyzing the product requirements or user stories. Look for the nouns in these statements; they are your primary candidates for resources.

* *User Story:* "As a **customer**, I want to place an **order** for multiple **products**."
* *Extracted Nouns:* Customer, Order, Product.
* *Identified Resources:* `/customers`, `/orders`, `/products`.

#### 2. Identifying Aggregates

In DDD terminology, an aggregate is a cluster of domain objects that can be treated as a single unit. When defining API resources, identifying your aggregates tells you where to draw the boundary of a resource payload.

For example, an `Order` typically contains a list of `LineItems`. Does a `LineItem` make sense outside the context of an `Order`? Usually, no. Therefore, `LineItem` is not a top-level resource. It belongs inside the `Order` aggregate. When a client requests an order, the API should return the order details *and* the line items as a single JSON document.

#### 3. Defining Abstract and Process Resources

Not all resources map to physical or tangible things. Some of the most critical resources in an API represent abstract concepts or internal business processes.

* **Cross-Reference Resources:** When a client needs to track the relationship between two independent resources, the relationship itself can become a resource. For example, a user's subscription to a newsletter isn't just a boolean flag; it is a resource with its own lifecycle (`/subscriptions`).
* **Process Resources:** Long-running jobs or complex calculations should be modeled as resources. Instead of a synchronous endpoint that forces the client to wait, the API can expose an asynchronous process resource.

```text
[ Process Resource Lifecycle ]

Client Request:   POST /report-generations
                  { "type": "annual_sales", "year": 2026 }
                           |
                           v
API Response:     HTTP 202 Accepted
                  Location: /report-generations/rg-9982
                           |
                           v
Client Polling:   GET /report-generations/rg-9982
                  { "status": "processing", "progress": "45%" }
                           |
                           v
Client Polling:   GET /report-generations/rg-9982
                  { "status": "completed", "download_url": "..." }

```

### Validating Your Resources

Once you have drafted a list of potential resources, validate them against the following criteria:

* **Independence:** Can this resource exist on its own, or does it only make sense as an attribute of another resource? If it relies entirely on a parent, it might be a nested object within an aggregate rather than a standalone resource.
* **Business Value:** Does exposing this resource directly solve a use case for the client? If the resource only exists to mirror a legacy database table that the client doesn't care about, it should not be exposed.
* **Security Context:** Does this resource mix data of varying sensitivity levels? If a resource contains both public metadata and highly classified financial data, it should be split into two separate resources to simplify authorization logic.

By methodically separating your API presentation layer from your internal data structures and aligning your resources with business capabilities, you establish a resilient foundation. This approach ensures your API remains intuitive for consumers while allowing your internal architecture to evolve independently.

## 5.2 Differentiating Between Singletons and Collections

Once you have identified the core resources of your API domain, the next step is to categorize them structurally. In a RESTful architecture, resources almost universally fall into one of two structural archetypes: **Collections** and **Singletons**.

Failing to clearly distinguish between these two types leads to inconsistent URI structures, confusing HTTP method behaviors, and a frustrating developer experience. A well-designed API establishes a predictable rhythm by strictly adhering to the rules governing collections and singletons.

### The Collection Resource

A collection is a server-managed directory of resources. Think of it as a logical container for items of the same type. Clients can request the server to add new items to the collection, or they can query the collection to retrieve a list of its members.

**Key Characteristics of a Collection:**

* **Naming:** Collections should always be named using **plural nouns** (e.g., `/users`, `/transactions`, `/webhooks`).
* **Server Control:** The server decides the identity (the ID or URI) of newly created members within the collection.
* **Filtering and Pagination:** Because collections can grow infinitely large, endpoints representing collections must support pagination, filtering, and sorting (concepts covered deeply in Chapter 12).

### The Singleton Resource

A singleton represents a single, distinct entity. However, in RESTful design, the term "singleton" actually applies to two distinct scenarios: **Collection Items** and **True Singletons**.

#### 1. The Collection Item (The Addressed Singleton)

Most singletons in an API are simply specific instances residing within a collection. They are accessed by appending a unique identifier to the collection's URI.

* **URI Structure:** `/collections/{id}` (e.g., `/users/usr_98765`).
* **Purpose:** Allows a client to read, update, or delete one specific item without affecting the rest of the collection.

```text
[ Architectural Hierarchy: Collections and Items ]

  +-------------------------+
  |  Collection: /invoices  |  <--- (Plural, represents the whole set)
  +-------------------------+
         |
         |   +---------------------------------+
         +-> | Singleton: /invoices/INV-2026-A | <--- (Specific item)
         |   +---------------------------------+
         |
         |   +---------------------------------+
         +-> | Singleton: /invoices/INV-2026-B | <--- (Specific item)
             +---------------------------------+

```

#### 2. The True Singleton (The Contextual Singleton)

A "True Singleton" is a resource where only one instance can logically exist within a given context. Because there is only one, it does not need a unique identifier in the path, nor does it belong in a pluralized collection.

* **Naming:** True singletons should be named using **singular nouns**.
* **Examples:**
* `/user/profile` (The profile of the currently authenticated user).
* `/system/health` (The overall health status of the API server).
* `/organization/billing-settings` (The single billing configuration for an account).

When a client interacts with a True Singleton, the server infers the resource's identity from the authentication token or the surrounding path context, rather than a trailing ID.

### The HTTP Method Matrix: Expected Behaviors

The most profound difference between collections and singletons is how they respond to standard HTTP methods. A predictable API strictly enforces the following behaviors based on the resource type.

| HTTP Method | Collection (`/articles`) | Singleton (`/articles/123`) | True Singleton (`/user/preferences`) |
| --- | --- | --- | --- |
| **GET** | **List:** Returns an array of items (paginated). | **Read:** Returns the specific item object. | **Read:** Returns the single object. |
| **POST** | **Create:** Adds a new item to the collection. The server generates the ID. | **Error (405):** Usually not allowed. Cannot create an item *on* an item. | **Error (405):** Usually not allowed, as the resource already exists. |
| **PUT** | **Replace All:** Replaces the entire collection. (Rare and highly dangerous). | **Replace:** Fully replaces the specific item. | **Replace:** Fully replaces the singleton state. |
| **PATCH** | **Bulk Update:** Modifies multiple items at once. (Advanced use case). | **Partial Update:** Modifies specific fields of the item. | **Partial Update:** Modifies specific fields. |
| **DELETE** | **Delete All:** Destroys the entire collection. (Extremely rare/dangerous). | **Delete:** Removes the specific item. | **Reset/Delete:** Reverts to defaults or disables the singleton. |

### Common Anti-Patterns to Avoid

When differentiating between singletons and collections, watch out for these frequent design mistakes:

* **The Singular Collection Anti-pattern:** Naming collections with singular nouns (e.g., `GET /user`). If a client sees `/user`, they expect a True Singleton. If the API returns an array of multiple users, it breaks the contract of predictability. Always pluralize collections (`/users`).
* **The "Create via Singleton" Anti-pattern:** Using `POST /users/{id}` to create a user when the client determines the ID. If the client dictates the ID, they are technically proposing a specific state at a specific URI. According to HTTP semantics, this should be a `PUT` request to the singleton, not a `POST` request. `POST` is reserved for appending to the collection (`POST /users`).
* **Forcing True Singletons into Collections:** If an organization can only ever have one active subscription, do not design the endpoint as `GET /organizations/123/subscriptions/sub_456`. This implies multiple subscriptions could exist. Instead, model it as a True Singleton: `GET /organizations/123/subscription`. This explicitly communicates the business rule (1:1 relationship) through the URI design.

## 5.3 Modeling Sub-resources and Complex Relationships

While top-level collections and singletons form the backbone of an API, business domains are rarely flat. Entities interact, depend on one another, and form complex webs of data. In RESTful API design, we use **sub-resources** to express hierarchy and ownership, and we use **linking and embedding** to represent relationships within data payloads.

Mastering relationships is a balancing act: you must provide enough interconnected data to make the API useful, without creating brittle, overly complex URI structures or bloated JSON responses.

### Understanding Sub-resources

A sub-resource is a collection or singleton that is logically scoped under a specific parent resource. It communicates a strict "has-a" or "belongs-to" relationship.

**URI Structure:** `/parents/{parentId}/children`

#### When to Use Sub-resources

You should use a sub-resource path when the child entity cannot logically exist, or has no meaning, outside the context of its parent. This is known as **composition**.

* **Valid Sub-resource:** `GET /articles/123/comments`
*(Comments cannot exist without an article. If the article is deleted, the comments are deleted.)*
* **Valid Sub-resource:** `GET /users/456/preferences`
*(A user's preferences are entirely dependent on the user.)*

#### The Deep Nesting Anti-Pattern

One of the most frequent mistakes in API design is mimicking a deep relational database hierarchy within the URI structure. This leads to the "Deep Nesting" anti-pattern.

Imagine an API for a corporate directory modeled like this:
`GET /companies/abc/departments/sales/employees/emp_882/paychecks/chk_001`

**Why this is dangerous:**

1. **Fragility:** If an employee moves to a different department, their URI changes. This breaks bookmarks, caching, and client integrations. URIs should be permanent locators.
2. **Redundancy:** If `emp_882` is a globally unique identifier (UUID) across the system, requiring the client to provide the company and department IDs is redundant and forces the client to know the entire hierarchy just to look up a paycheck.

#### The Solution: Shallow Routing

To avoid deep nesting, adopt the **Shallow Routing** strategy (often called the "Rule of Maximum Two").

1. Use sub-resources to retrieve a *collection* scoped to a parent.
2. Once a resource has a globally unique identifier, access it directly via its own top-level collection, completely bypassing the parent hierarchy.

```text
[ Architectural Pattern: Shallow Routing ]

❌ ANTI-PATTERN: Deep Nesting
   GET /authors/12/books/89/chapters/3

✅ BEST PRACTICE: Shallow Routing
   GET /authors/12/books      (Look up the books belonging to the author)
   GET /books/89              (Look up the specific book directly)
   GET /books/89/chapters     (Look up the chapters belonging to the book)
   GET /chapters/3            (Look up the specific chapter directly)

```

By keeping URIs shallow, you decouple the resource from its parent hierarchy, making the API far more resilient to organizational changes.

### Modeling Many-to-Many Relationships

Composition (parent-child) is straightforward, but what about aggregation, where resources exist independently but share a relationship? A classic example is `Students` and `Courses`. A student can take many courses, and a course has many students. Neither "owns" the other.

There are two primary ways to model this in an API:

#### 1. The Association Resource

If the relationship itself contains metadata (e.g., an enrollment date, a final grade), the relationship is no longer just a link; it is a first-class resource. In DDD terms, this is an association entity.

You model this by creating a top-level collection for the relationship:

* `POST /enrollments`
`{ "student_id": "stu_1", "course_id": "cs_101", "term": "Fall 2026" }`

#### 2. Query Parameter Filtering

If the relationship is purely a link without metadata, avoid creating artificial association resources. Instead, use query parameters on the top-level collections to filter by the relationship.

* `GET /courses?student_id=stu_1` (Returns all courses for the student)
* `GET /students?course_id=cs_101` (Returns all students in the course)

This approach keeps the API surface area small and utilizes existing collection endpoints.

### Representing Relationships in Payloads: Link vs. Embed

Once you have defined how to locate related resources via URIs, you must decide how to represent those relationships inside the JSON payload.

When a client requests `GET /orders/123`, how should the API represent the customer associated with that order?

**Strategy A: Referencing (Linking)**
The payload includes only the identifier or the URI of the related resource.

```json
{
  "id": "ord_123",
  "total": 150.00,
  "customer_id": "cust_88" 
}

```

* **Pros:** Keeps payloads small, reduces database query complexity, prevents infinite loops.
* **Cons:** Forces the client to make a second HTTP request (`GET /customers/cust_88`) to get the customer's name, leading to the "N+1 query problem" on the client side.

**Strategy B: Embedding (Sideloading)**
The payload includes the entire related object nested within the response.

```json
{
  "id": "ord_123",
  "total": 150.00,
  "customer": {
    "id": "cust_88",
    "name": "Acme Corp",
    "email": "billing@acme.com"
  }
}

```

* **Pros:** Highly efficient for the client; all necessary data is returned in a single round-trip.
* **Cons:** Inflates payload size. If the client doesn't need the customer data, the server wasted resources fetching it.

#### The Dynamic Expansion Compromise

To get the best of both worlds, modern REST APIs often employ **Dynamic Expansion**. The API defaults to referencing (Strategy A) but allows the client to explicitly request embedding (Strategy B) via a query parameter, usually named `expand` or `include`.

* **Request:** `GET /orders/123` (Returns only the `customer_id`)
* **Request:** `GET /orders/123?expand=customer` (Returns the embedded customer object)

This design shifts the control to the consumer, allowing them to optimize their network requests based on the specific needs of their UI or application context.

## 5.4 Translating Actions and Processes into REST

The most common point of friction for developers adopting RESTful design is the "verb vs. noun" dilemma. Traditional Remote Procedure Call (RPC) architectures are fundamentally verb-oriented. When you need a system to do something, you call a function: `approveLoan()`, `translateText()`, or `rebootServer()`.

REST, however, is resource-oriented (noun-based). The HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) are the only verbs allowed. A strict RESTful API avoids URIs that contain actions, such as `POST /approve-loan`.

So, how do you map complex business processes and arbitrary actions into a purely noun-based framework? API designers typically employ one of three core strategies.

### Strategy 1: Map Actions to State Changes (The Implicit Action)

Many business actions, upon closer inspection, are simply state transitions applied to an existing resource. Instead of invoking an action to change the resource, the client directly requests the new state.

Consider the action of "publishing" an article.

* **RPC Approach (Anti-Pattern in REST):** `POST /articles/123/publish`
* **RESTful Approach:** The client modifies the `status` attribute of the article.

```json
PATCH /articles/123
{
  "status": "published",
  "published_at": "2026-05-08T12:00:00Z"
}

```

The server receives the `PATCH` request, detects the state change to `published`, and triggers the underlying business logic (e.g., sending notifications, updating search indexes). The action is *implicit* in the state change.

### Strategy 2: Nounifying Verbs (The Process Resource)

When an action requires complex inputs, generates a distinct output, or involves a multi-step workflow, it cannot be modeled as a simple state change. The solution is to treat the action itself as a resource. We "nounify" the verb.

Instead of thinking about *performing an action*, think about *creating a record of that action*.

* **Translate** becomes a **Translation**
* **Calculate** becomes a **Calculation**
* **Refund** becomes a **Refund**

By treating the process as a resource, you unlock the full power of standard HTTP methods. You can create a process (`POST`), check its status (`GET`), or cancel it (`DELETE`).

```text
[ Nounifying Verbs: RPC vs REST ]

Action: Convert a USD transaction to EUR.

❌ RPC Style:
   POST /convertCurrency
   { "from": "USD", "to": "EUR", "amount": 100 }

✅ RESTful Process Resource:
   POST /currency-conversions
   { "base_currency": "USD", "target_currency": "EUR", "amount": 100 }
   
   Response: 201 Created
   {
      "id": "conv_982",
      "converted_amount": 92.50,
      "exchange_rate": 0.925
   }

```

### Strategy 3: Sub-Resource Controllers (Targeted Actions)

Sometimes, an action applies to a specific parent resource but doesn't result in a new data entity or a simple state change. A classic example is rebooting a server. There is no `reboot` attribute to update via `PATCH`, and a top-level `/reboots` collection feels disconnected from the server it acts upon.

In these cases, use a sub-resource to represent the command. To keep it RESTful, name the sub-resource as a noun representing the event.

* **Action:** Reboot Server 123
* **RESTful Design:** `POST /servers/123/reboots`

This approach provides immense architectural flexibility. If you `POST` to the `/reboots` collection, you are telling the server, "Create a new reboot event for this server."

This naturally scales to support auditing and history. If a client wants to know how many times a server has been restarted, they simply perform a `GET /servers/123/reboots` to view the collection of past reboot events.

### Handling Long-Running Processes (Asynchronous REST)

When translating actions into REST, you will inevitably encounter processes that take too long to complete synchronously (e.g., generating a massive PDF report, provisioning a virtual machine). Blocking the HTTP connection until the task finishes leads to timeouts and poor client performance.

To map long-running actions to REST, combine the **Process Resource** pattern with the **HTTP 202 Accepted** status code.

1. **Initiate the Process:** The client `POST`s a payload to a process resource collection.
2. **Acknowledge and Defer:** The server immediately responds with `202 Accepted`. This code explicitly means: "The request has been accepted for processing, but the processing has not been completed."
3. **Provide a Location:** The response includes a `Location` header pointing to a temporary status resource.
4. **Client Polling (or Webhooks):** The client periodically checks the status URI until the process completes.

```text
[ Asynchronous Process Flow ]

1. POST /video-encodings { "source": "raw_vid.mp4", "format": "h264" }
   ----------------------------------------------------------------->

2. HTTP/1.1 202 Accepted
   Location: /video-encodings/enc_555
   <-----------------------------------------------------------------

3. GET /video-encodings/enc_555
   ----------------------------------------------------------------->

4. HTTP/1.1 200 OK
   { "status": "processing", "progress_percent": 45 }
   <-----------------------------------------------------------------

   [ ... Time Passes ... ]

5. GET /video-encodings/enc_555
   ----------------------------------------------------------------->

6. HTTP/1.1 303 See Other
   Location: /videos/vid_999   (The final encoded video resource)
   <-----------------------------------------------------------------

```

By utilizing state changes, nounifying verbs into process resources, and leveraging HTTP status codes like `202 Accepted`, you can model even the most complex, verb-heavy business workflows within a strict, predictable RESTful paradigm.

## 5.5 Managing and Representing Resource States

The "ST" in REST stands for **State Transfer**. A RESTful API is not simply a static database over HTTP; it is a system for transferring the representation of a resource's state between a client and a server.

In complex business domains, resources rarely remain static. An `Order` moves from *pending* to *paid* to *shipped*. A `UserAccount` moves from *unverified* to *active* to *suspended*. Effectively managing and representing these lifecycles is crucial for preventing invalid business operations and guiding clients through complex workflows.

### Defining Resource State

When designing an API, you must distinguish between two types of state:

1. **Application State:** The current context of the client's session (e.g., what page the user is on, what search filters are active). In REST, the server must be completely stateless regarding application state; the client holds this context.
2. **Resource State:** The actual data and business status of the entity on the server (e.g., the order is "shipped"). The server is the absolute source of truth for resource state.

### Explicitly Representing State

The most fundamental way to represent resource state is through explicit data fields within your JSON payload.

* **Status Fields:** Use explicit, string-based enums to define the current phase of a resource's lifecycle (e.g., `"status": "shipped"`). Avoid using generic booleans (like `is_active: true`) if the resource might evolve to have more than two states in the future.
* **Temporal State:** State is often closely tied to time. A robust representation includes timestamps that validate the state transition (e.g., `created_at`, `shipped_at`, `canceled_at`). This provides context without requiring the client to guess when a state changed.

### Designing the State Machine

Behind every complex resource is a Finite State Machine (FSM). As an API designer, you must map out all valid states and, more importantly, the valid **transitions** between those states. Clients should not be allowed to bypass business logic by submitting an arbitrary state update.

```text
[ Resource State Machine: Order Lifecycle ]

                  +-----------+
                  |  Pending  | <--- (Initial State)
                  +-----------+
                        |
       [Payment Authorized] | [Payment Failed]
                        v
                  +-----------+
             +--- |   Paid    | ---+
             |    +-----------+    |
             |          |          |
  [User Cancels]        |          | [Refund Issued]
             |    [Item Shipped]   |
             v          v          v
 +------------+   +-----------+   +----------+
 |  Canceled  |   |  Shipped  |   | Refunded |
 +------------+   +-----------+   +----------+
                        |
                 [Item Delivered]
                        v
                  +-----------+
                  | Delivered | <--- (Terminal State)
                  +-----------+

```

#### Enforcing State Transitions

When a client attempts to change a resource's state (typically via a `PATCH` request or a process resource as discussed in 5.4), the API must enforce the rules of the state machine.

If a client attempts an illegal transition—for example, trying to change an order's status from `Pending` directly to `Shipped` without going through `Paid`—the API should reject the request. The standard HTTP response for this is **409 Conflict**, as the request conflicts with the current business rules of the resource.

* **Error Payload Example:**

```json
HTTP/1.1 409 Conflict
{
  "error": "invalid_state_transition",
  "message": "Cannot transition Order from 'Pending' to 'Shipped'. Order must be 'Paid' first."
}

```

### Using Hypermedia to Guide State (HATEOAS)

While a `status` field tells the client the *current* state, it doesn't tell the client *what they can do next*. If a client has to hardcode your state machine logic into their frontend application, you have created a tightly coupled, brittle integration.

Hypermedia as the Engine of Application State (HATEOAS) solves this by embedding contextual links within the resource representation. The API dynamically provides only the links that are valid for the resource's *current* state.

**State 1: The Order is Pending**
The API provides links to pay for or cancel the order.

```json
{
  "id": "ord_123",
  "status": "pending",
  "links": {
    "self": "/orders/ord_123",
    "pay": "/orders/ord_123/payments",
    "cancel": "/orders/ord_123/cancellation"
  }
}

```

**State 2: The Order is Shipped**
Once the state changes, the API removes the `pay` and `cancel` links, replacing them with links valid for the new state.

```json
{
  "id": "ord_123",
  "status": "shipped",
  "links": {
    "self": "/orders/ord_123",
    "tracking": "/orders/ord_123/shipment-tracking",
    "return": "/orders/ord_123/returns"
  }
}

```

By leveraging hypermedia for state transitions, the API becomes self-descriptive. The client simply renders UI buttons based on the presence of links (e.g., if the `cancel` link exists, show the "Cancel Order" button). When your business logic changes, the API updates the links it serves, and the client automatically adapts without requiring a code change.

### Exposing State History

For critical business entities (financial transactions, legal contracts, access logs), simply knowing the current state is insufficient; consumers need the audit trail.

If your backend architecture utilizes Event Sourcing or simply maintains a status history table, you should expose this as a sub-resource.

* **Current State:** `GET /contracts/998`
* **State History:** `GET /contracts/998/history`

This separates the core entity payload from its potentially massive audit log, allowing clients to query the exact sequence of events, timestamps, and actors that drove the resource into its current state.
