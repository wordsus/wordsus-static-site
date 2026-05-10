While URIs define the *nouns* of your API by identifying resources, they lack action. To build a truly RESTful system, we must combine these nouns with the standardized *verbs* of the web: HTTP methods. This chapter explores how to strictly leverage GET, POST, PUT, PATCH, and DELETE to manage resource state predictably, adhering to the critical contracts of safety and idempotency.

Beyond action, APIs require precise communication of outcomes. We will delve into the vital role of HTTP status codes. Moving beyond binary success or failure flags, you will learn to use the 2xx, 4xx, and 5xx classes to establish robust, machine-readable communication.

## 6.1 Safe and Idempotent Methods (GET, PUT, DELETE)

When designing a RESTful API, HTTP methods serve as the primary verbs indicating the action a client wishes to perform on a resource. However, these methods are more than just labels; they represent strict architectural contracts defined by HTTP specifications (RFC 9110). Two of the most critical guarantees an API designer must understand and implement are **safety** and **idempotency**.

Understanding these properties is essential for building robust, fault-tolerant network applications, particularly when dealing with the realities of latency, dropped connections, and automated client retries discussed in Chapter 4.

### The Concept of Safety: Looking Without Touching

An HTTP method is considered **safe** if making a request does not alter the state of the resource on the server. Safe methods are essentially read-only operations. The client can invoke a safe method multiple times, or not at all, and the overarching state of the system remains identical.

**The GET Method**
`GET` is the quintessential safe method. It requests a representation of a specific resource or a collection of resources.

Because `GET` is safe, clients and intermediate proxies know they can cache the response (subject to HTTP cache headers) and pre-fetch data without worrying about accidentally triggering an unintended action, such as executing a financial transaction or deleting a user profile.

*Note: While a safe method must not alter the resource's domain state, it is perfectly acceptable for it to trigger side effects that do not affect the resource representation, such as logging the request, updating analytics counters, or modifying internal cache states.*

### The Concept of Idempotency: The Guarantee of Consistency

A method is **idempotent** if the intended effect on the server of multiple identical requests is the same as the effect of a single request. Borrowed from mathematics, where applying an operation multiple times yields the same result as applying it once (e.g., multiplying by 1, or $f(f(x)) = f(x)$), idempotency in APIs is a safeguard against the unreliability of networks.

If a client sends a request and the network connection drops before receiving a response, the client does not know if the server processed the request. If the method is idempotent, the client can safely retry the exact same request without fear of duplicating an action or corrupting data.

All safe methods are inherently idempotent (if you read a record ten times, the state is unchanged, meaning the end state is the same as reading it once). However, not all idempotent methods are safe.

**The PUT Method**
The `PUT` method is used to completely replace a target resource with the payload provided in the request. `PUT` is not safe because it alters server state, but it is strictly idempotent.

If a client sends a `PUT` request to update a user's address, and a network timeout forces the client to retry the request three more times, the server simply overwrites the resource with the exact same data three more times. The final state of the user's address is identical to what it would have been if only the first request had succeeded.

```text
[ Network Retry Scenario with an Idempotent PUT ]

Client                          Server                          Resource State
  |                               |                                   |
  |--- PUT /users/12 (Update A)-->| (Processed)                       |--> State A
  |<-- [Network Drops] -----------|                                   |
  |                               |                                   |
  |--- PUT /users/12 (Update A)-->| (Processed again)                 |--> State A
  |<-- 200 OK --------------------|                                   |

```

**The DELETE Method**
The `DELETE` method requests the removal of a resource. Like `PUT`, it is unsafe but idempotent. Deleting a resource once removes it. Attempting to delete the exact same resource five more times does not result in "extra" deletions; the resource simply remains absent.

### The DELETE Nuance: State vs. Response Code

A common point of confusion among API developers is the distinction between the server's *state* and the server's *response code* regarding idempotency, particularly with the `DELETE` method.

Idempotency guarantees that the *state of the server* remains the same across multiple requests. It does not guarantee that the server will return the exact same *HTTP status code* every time.

1. **Request 1:** `DELETE /articles/42`

* Server State: Article 42 is removed.
* Response: `204 No Content` (or `200 OK`).

1. **Request 2:** `DELETE /articles/42`

* Server State: Article 42 remains absent (State is unchanged).
* Response: `404 Not Found`.

Even though the response code changed from a 2xx success to a 4xx error, the `DELETE` operation strictly adhered to the contract of idempotency because the underlying data state did not diverge.

### Summary Matrix of Method Properties

To build predictable systems, clients rely on you, the API designer, to enforce these contracts. Using `GET` to trigger a state change, or writing a `PUT` handler that increments a value rather than replacing it, breaks the HTTP contract and leads to erratic client behavior.

| HTTP Method | Modifies State? | Safe? | Idempotent? | Primary Use Case |
| --- | --- | --- | --- | --- |
| **GET** | No | Yes | Yes | Retrieving resource representations. |
| **OPTIONS** | No | Yes | Yes | Discovering available communication options. |
| **HEAD** | No | Yes | Yes | Retrieving headers without the response body. |
| **PUT** | Yes | No | Yes | Completely replacing a specific resource. |
| **DELETE** | Yes | No | Yes | Removing a specific resource. |
| **POST** | Yes | No | No | Appending/creating new sub-resources. |
| **PATCH** | Yes | No | No* | Partially modifying a resource. |

*Note: While PATCH can be designed to be idempotent depending on the implementation and payload type, it is not strictly defined as idempotent by the HTTP specification. The nuances of POST, PUT, and PATCH in state management are detailed in the following section.*

## 6.2 Managing Creation and State Updates (POST vs. PUT vs. PATCH)

While the semantics of retrieving (`GET`) and removing (`DELETE`) resources are relatively straightforward, the waters muddy considerably when it comes to creating new resources and modifying existing ones. The HTTP specification provides three primary methods for these operations: `POST`, `PUT`, and `PATCH`. Misunderstanding the nuances between these three verbs is one of the most common sources of architectural debt in RESTful API design.

The choice between them dictates not only the shape of your payload but also the guarantees your API provides to the consuming client regarding idempotency and state management.

### The POST Method: The Non-Idempotent Workhorse

`POST` is the most versatile, and consequently the most loosely defined, of the HTTP verbs. The specification states that `POST` requests that the target resource process the representation enclosed in the request according to the resource's own specific semantics.

**Primary Use Case: Subordinate Resource Creation**
In a resource-oriented architecture, `POST` is primarily used to create a new resource within a collection, where the *server* is responsible for determining the new resource's identifier (URI).

Because the server generates the ID, `POST` is strictly **not idempotent**. If a client sends a `POST` request to create a user, and a network timeout causes the client to retry the request, the server will process it twice, resulting in two distinct user records with two different IDs.

```text
POST /users
Host: api.example.com
Content-Type: application/json

{
  "name": "Alice Developer",
  "email": "alice@example.com"
}

// Server Response
201 Created
Location: /users/8472

```

**Secondary Use Case: The "Catch-All" Controller**
Because it makes no guarantees about safety or idempotency, `POST` is also the accepted standard for triggering processes or actions that do not map cleanly to CRUD (Create, Read, Update, Delete) operations. For example, processing a payment, triggering an email dispatch, or running a complex calculation are all appropriately modeled with `POST` (e.g., `POST /invoices/123/pay`).

### The PUT Method: Complete Replacement and Upserts

As established in the previous section, `PUT` is strictly idempotent. Its definition is absolute: it replaces all current representations of the target resource with the request payload.

**Primary Use Case 1: Complete Overwrite**
When a client wishes to update a resource via `PUT`, it must send the *entire* representation of that resource. If a user profile has 20 fields, and the client wants to update just the email address, a strictly compliant `PUT` request must still include all 20 fields. If a field is omitted from the `PUT` payload, the server should logically set that field to null or its default value, as the new payload entirely replaces the old state.

**Primary Use Case 2: Client-Directed Creation (Upsert)**
`PUT` can also be used to *create* a resource, but only if the *client* dictates the resource's identifier. If the client generates a UUID and decides where the resource should live, `PUT` is the correct method. This is often referred to as an "upsert" (update or insert).

```text
PUT /users/550e8400-e29b-41d4-a716-446655440000
Host: api.example.com
Content-Type: application/json

{
  "name": "Bob Architect",
  "email": "bob@example.com"
}

// Server Response (if creating)
201 Created

// Server Response (if overwriting an existing record)
200 OK  (or 204 No Content)

```

### The PATCH Method: Partial Modifications

To address the inefficiency of sending full resource payloads over the network just to change a single field via `PUT`, the `PATCH` method was introduced (RFC 5789). `PATCH` is used to apply partial modifications to a resource.

Unlike `PUT`, a `PATCH` payload does not represent the complete new state of the resource. Instead, it contains a set of *instructions* describing how the resource currently residing on the server should be modified to produce a new version.

**The Idempotency Caveat**
`PATCH` is **not inherently idempotent**. Applying a set of changes to a resource might yield different results if applied multiple times, depending on the patch format used.

There are two dominant patterns for implementing `PATCH`:

1. **JSON Merge Patch (RFC 7396):** The client sends a partial JSON object containing only the fields that need updating. The server merges this partial object into the existing resource. This specific implementation *is* generally idempotent in practice.

```json
// Payload to just update the email
{
  "email": "new.bob@example.com"
}

```

1. **JSON Patch (RFC 6902):** The client sends an array of explicit operational instructions (add, remove, replace, move, copy, test). This is highly powerful but rarely idempotent.

```json
    [
      { "op": "replace", "path": "/email", "value": "new.bob@example.com" },
      { "op": "increment", "path": "/loginCount", "value": 1 } // Not idempotent!
    ]
    ```

### Decision Matrix: Choosing the Right Method

Navigating creation and update semantics relies on understanding the relationship between the client's knowledge of the URI and the scope of the intended change. Use the following logic flow to enforce architectural consistency:

```text
[ Decision Tree: State Modification ]

[ Does the client know the exact URI of the resource? ]
   |
   +-- NO  --> [ Action: Create a new resource ]
   |              Method: POST (e.g., POST /articles)
   |              Result: Server assigns ID and returns 201 Created.
   |
   +-- YES --> [ What is the scope of the modification? ]
                  |
                  +-- REPLACE --> [ Action: Overwrite entire resource ]
                  |               Method: PUT (e.g., PUT /articles/12)
                  |               Rule: Must send the full payload. Omitted 
                  |                     fields are deleted/nullified.
                  |
                  +-- PARTIAL --> [ Action: Update specific fields ]
                                  Method: PATCH (e.g., PATCH /articles/12)
                                  Rule: Send only the fields to change, or 
                                        a set of structural operations.

```

By strictly adhering to these operational definitions, APIs become highly predictable. Clients immediately know whether they need to manage state locally (PUT), whether they can blindly retry upon failure (PUT/PATCH-Merge), or whether they must handle potential duplicate creation errors (POST).

## 6.3 The 2xx Success Class: Confirming Intent

When a client transmits a request to an API, the initial parsing phase determines if the request is well-formed, authenticated, and semantically valid. If the server successfully receives, understands, and accepts the request, it must confirm this intent by returning a status code from the 2xx class.

While many developers default to returning `200 OK` for every successful operation, treating the 2xx class as a monolithic "success" flag misses an opportunity for rich, machine-readable communication. The HTTP specification provides distinct 2xx codes that precisely articulate *how* the success was handled, allowing clients to optimize their subsequent actions.

### 200 OK: The Standard Acknowledgment

`200 OK` is the baseline response for successful HTTP requests. It indicates that the action requested by the client was successful and the payload contains the requested data or the result of the operation.

* **GET:** The resource was fetched and is transmitted in the message body.
* **PUT/PATCH:** The resource was successfully updated, and the server is returning the updated representation of the resource.
* **POST:** The action was executed, and the result is in the body (though if a resource was created, `201 Created` is strictly preferred).

If an API designer is ever in doubt about which 2xx code to use, `200 OK` is the safest fallback, provided there is a response body.

### 201 Created: The Promise of a New Resource

As discussed in Section 6.2, when a `POST` or `PUT` request results in the creation of a brand new resource on the server, the API should return `201 Created`.

Returning a 201 is not just about semantic pedantry; it dictates a specific architectural contract. A strictly compliant `201 Created` response must include a `Location` header. This header provides the client with the exact URI where the newly minted resource can be accessed.

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v2/organizations/org_9a8b7c6d/users/usr_12345

{
  "id": "usr_12345",
  "status": "active",
  "createdAt": "2023-10-27T08:30:00Z"
}

```

By providing the `Location` header, the client does not need to parse the response body to figure out how to interact with the new entity, streamlining automated workflows and RESTful traversals.

### 202 Accepted: Managing Asynchronous Workflows

In distributed systems, not all requests can be processed synchronously. Generating a massive report, encoding a video file, or provisioning cloud infrastructure might take minutes or hours. Forcing the client to hold an HTTP connection open until the task completes leads to timeouts and resource exhaustion.

The `202 Accepted` status code solves this problem. It tells the client: *"I have received your valid request, and I have placed it in a queue to be processed, but the processing is not yet complete."*

Because the action is incomplete, a `202` response payload typically contains a status object or a "Job ID" rather than the final resource. Like the `201 Created` response, a `202 Accepted` should also include a `Location` header, but in this context, it points to a status monitor endpoint where the client can poll for updates.

```text
[ The Asynchronous Polling Pattern ]

Client                                     API Server (Worker Queue)
  |                                            |
  |-- POST /reports/export (Large Data) ------>|
  |                                            | (Task queued)
  |<-- 202 Accepted ---------------------------|
  |    Location: /reports/jobs/job_99          |
  |                                            |
  |-- GET /reports/jobs/job_99 --------------->|
  |<-- 200 OK { "status": "processing" } ------|
  |                                            |
  |-- GET /reports/jobs/job_99 --------------->|
  |<-- 303 See Other --------------------------|
  |    Location: /reports/downloads/file.csv   |

```

*(Note: Asynchronous patterns like Webhooks and Server-Sent Events, which eliminate the need for client polling, will be covered in depth in Chapter 10).*

### 204 No Content: The Silent Success

Bandwidth is a finite resource, and parsing JSON requires CPU cycles. If a client requests an action and the server completes it successfully, but there is absolutely no new information to send back to the client, the server should return `204 No Content`.

A `204` response explicitly forbids a message body. It is most commonly used in two scenarios:

1. **DELETE Operations:** Once a resource is deleted, there is often nothing left to say. Returning `204 No Content` confirms the deletion was successful.
2. **PUT/PATCH Operations (Sometimes):** If a client updates a resource and the server accepts the exact payload without making any server-side modifications (like auto-generating a timestamp), it may return `204` to acknowledge the update while saving bandwidth, as the client already possesses the current state of the resource.

### Navigating the 2xx Decision Tree

To ensure consistency across an API surface, teams should standardize how they route successful operations to specific 2xx codes. The following decision matrix provides a reliable heuristic:

```text
[ 2xx Success Status Code Routing ]

Did the server complete the request synchronously?
 ├── NO  ──> Request is queued for background processing.
 │           └─> Return 202 Accepted
 │
 ├── YES ──> Did the request result in a NEW resource?
             ├── YES ──> Action was POST or upsert PUT.
             │           └─> Return 201 Created (Include Location header)
             │
             ├── NO  ──> Does the server need to return a response body?
                         ├── NO  ──> Typical for DELETE or simple state toggles.
                         │           └─> Return 204 No Content
                         │
                         ├── YES ──> Typical for GET, or updates returning new state.
                                     └─> Return 200 OK

```

By leveraging the full spectrum of the 2xx class, API designers create self-documenting systems where the network layer itself informs the client about the exact nature of the operation's success, reducing the need for custom, payload-specific status flags.

## 6.4 Distinguishing 4xx Client Errors and 5xx Server Failures

When an API request fails, the most critical piece of information the server must communicate is the **fault domain**: who is to blame for the failure? Establishing this blame is not about finger-pointing; it is the fundamental mechanism that dictates how the consuming application should react.

The HTTP specification divides error states into two distinct classes. The **4xx class** indicates that the client made a mistake, while the **5xx class** indicates that the server failed to fulfill a seemingly valid request. Conflating these two classes is a severe anti-pattern that leads to infinite retry loops, masked system outages, and deeply frustrated developers.

### The 4xx Class: Client-Side Errors

A 4xx status code tells the client: *"I understand what you are asking, but you have done something wrong, and I refuse to process this request until you fix it."*

The defining characteristic of a 4xx error is that **blindly retrying the exact same request will result in the exact same error**. The client must alter the request—by fixing the syntax, providing valid credentials, or changing the payload—before trying again.

While `400 Bad Request` is the generic catch-all, a well-designed API leverages specific 4xx codes to provide precise, actionable feedback:

* **400 Bad Request:** The request was malformed. This is typically used for invalid JSON parsing, missing required parameters, or domain validation failures (e.g., an email address lacking an `@` symbol).
* **401 Unauthorized:** The client must authenticate itself to get the requested response. Despite the historical name "Unauthorized," this code strictly means **Unauthenticated**. The client has not proven *who* they are.
* **403 Forbidden:** The client is authenticated, but does not have the necessary permissions to access the resource. The server knows exactly who the client is, but refuses to authorize the action.
* **404 Not Found:** The URI provided by the client does not map to any existing resource.
* **409 Conflict:** The request could not be completed due to a conflict with the current state of the target resource. This is common in `POST` or `PUT` requests that violate uniqueness constraints (e.g., trying to register a username that is already taken).
* **415 Unsupported Media Type:** The client sent data in a format the server does not understand (e.g., sending `application/xml` when the API only accepts `application/json`).
* **429 Too Many Requests:** The client has exceeded its rate limit or quota. (The mechanics of handling this will be explored deeply in Chapter 19).

### The 5xx Class: Server-Side Failures

A 5xx status code tells the client: *"Your request looks perfectly valid, but something went wrong on my end while trying to process it."*

The defining characteristic of a 5xx error is that **the client is innocent**. Because the failure is transient or system-related, retrying the exact same request later might actually succeed.

* **500 Internal Server Error:** The generic catch-all for unexpected server failures. This typically means an unhandled exception was thrown in the backend code, a database query failed, or a null pointer was dereferenced.
* **502 Bad Gateway:** The API gateway or reverse proxy received an invalid response from the upstream backend service it was trying to communicate with.
* **503 Service Unavailable:** The server is currently unable to handle the request due to a temporary overload, scheduled maintenance, or an orchestrated shutdown.
* **504 Gateway Timeout:** The API gateway or proxy did not receive a timely response from the upstream backend service.

### The "Retry Tax" Heuristic

Correctly distinguishing between 4xx and 5xx codes is vital for the stability of both the client and the server. If an API incorrectly returns a `500 Internal Server Error` when a client submits a malformed JSON payload, the client's automated retry logic will assume the server is just having a temporary hiccup. The client will hammer the server with retries, wasting bandwidth and compute cycles on a request that is mathematically doomed to fail.

Conversely, if the server returns a `400 Bad Request` during a database timeout, the client will assume its payload is flawed and surface a fatal error to the end-user, rather than seamlessly retrying in the background.

```text
[ The Error Resolution Strategy Matrix ]

                       Error Response Received
                                  |
               +------------------+------------------+
               |                                     |
           [ 4xx Class ]                         [ 5xx Class ]
         Client is at fault                    Server is at fault
               |                                     |
     Does the request need to              Is the failure likely
       be modified? (Yes)                     transient? (Yes)
               |                                     |
     +---------+---------+                 +---------+---------+
     |                   |                 |                   |
 Fix Code /        Prompt User         Implement           Alert Ops /
 Fix Payload       for Input           Exponential         Check Status
                                       Backoff             Page

```

### Masking Server Errors

A final, crucial rule of API design is that **5xx errors should never leak internal stack traces or sensitive system details to the client**. While a `400 Bad Request` should include a detailed payload explaining exactly which field failed validation (as will be discussed in Chapter 13 regarding RFC 7807 Problem Details), a `500 Internal Server Error` should be opaque.

The client only needs to know that the server failed and an internal reference ID to provide to support. Exposing SQL syntax errors or framework stack traces transforms a simple bug into a critical security vulnerability.
