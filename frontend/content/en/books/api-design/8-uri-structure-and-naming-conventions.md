A URI is more than just a network address; it is the most visible interface of your API and the foundation of a great Developer Experience (DX). When URIs are intuitive and consistent, consumers can seamlessly navigate your domain and anticipate endpoint structures without constantly referring to documentation.

This chapter breaks down the mechanics of crafting elegant, predictable, and standardized URIs. We will resolve the foundational noun-versus-verb debate, establish strict conventions for pluralization and casing, clarify the semantic boundary between path variables and query parameters, and dismantle the most common anti-patterns in RESTful routing.

## 8.1 The Nouns vs. Verbs Debate in Endpoint Design

The most fundamental debate in URI structure centers on how to represent the actions performed on data. When developers transition from writing application code to designing APIs, their natural instinct is to map endpoints to functions. Since functions in code are universally named with verbs (`getUser()`, `createInvoice()`, `deleteAccount()`), it is tempting to design URIs using those same action-oriented words.

However, in RESTful architecture, the URI's sole responsibility is to identify the *target* of the interaction—the resource. The action being performed is meant to be communicated by the HTTP method (the protocol's built-in verbs). Consequently, a strict RESTful design dictates that **URIs should be composed exclusively of nouns, while HTTP methods provide the verbs.**

### The RPC Anti-Pattern: Verbs in the URI

Using verbs in your URIs is a hallmark of Remote Procedure Call (RPC) architectures. While perfectly valid in gRPC or older SOAP APIs, bringing RPC-style naming into a REST API creates fragile, sprawling architectures.

When you embed the action in the URI path, you bypass the standardized semantics of the HTTP protocol. This leads to endpoint proliferation, where every minor action requires a distinct path, ignoring the caching and idempotency benefits inherent to standard HTTP methods.

**The Shift from Verbs to Nouns**

```text
+-------------------------+-----------------------------+-----------------------+
| Developer Goal          | RPC Anti-Pattern (Verbs)    | REST Approach (Nouns) |
+-------------------------+-----------------------------+-----------------------+
| Retrieve all users      | GET /getAllUsers            | GET /users            |
| Create a new user       | POST /createUser            | POST /users           |
| Retrieve user #42       | GET /getUser?id=42          | GET /users/42         |
| Update user #42         | POST /updateUser/42         | PUT /users/42         |
| Delete user #42         | POST /deleteUser/42         | DELETE /users/42      |
+-------------------------+-----------------------------+-----------------------+

```

As illustrated above, relying on nouns collapses five distinct, verb-heavy URIs into just two consistent noun-based paths (`/users` and `/users/{id}`). The API becomes predictable, self-documenting, and aligned with standard web infrastructure.

### Navigating the "Debate": When Nouns Fail

The debate arises because not every business process cleanly maps to a simple CRUD (Create, Read, Update, Delete) operation on a static entity. Developers frequently encounter complex domain logic that feels impossible to express without a verb.

Consider the following common scenarios:

* Activating a user account.
* Calculating a shipping quote.
* Translating a document.

How do you handle these without resorting to `/activate`, `/calculate`, or `/translate`? There are two primary REST-compliant strategies to resolve this friction.

#### Strategy 1: State Transitions via PATCH

Many verbs actually describe a transition in the state of a resource. Instead of invoking an action via a verb, you can update the state of the underlying noun.

If the goal is to "activate" a user, "activate" is simply a verb describing the transition of the user's status from `pending` to `active`.

**Avoid:** `POST /users/42/activate`
**Embrace:** `PATCH /users/42`

```json
{
  "status": "active"
}

```

#### Strategy 2: Reification (Making a Noun out of a Verb)

When an action is complex, takes parameters, and produces a distinct result, you can apply *reification*—the process of treating an abstract concept or action as a concrete resource. You turn the verb into a noun.

For example, calculating a shipping quote is an intensive process. Instead of treating "calculate" as an action, treat "quote" as the resource being created.

```text
========================================================================
                      THE REIFICATION PATTERN
========================================================================

[Problematic Verb Approach]
POST /calculateShipping
Body: { "weight": 5, "destination": "NY" }
Response: 200 OK -> { "cost": 15.00 }

       |
       |  Refactoring the process into a tangible resource
       v

[RESTful Noun Approach]
POST /shipping-quotes
Body: { "weight": 5, "destination": "NY" }
Response: 201 Created
Location: /shipping-quotes/9982

GET /shipping-quotes/9982
Response: 200 OK -> { "id": 9982, "cost": 15.00, "expires_at": "..." }
========================================================================

```

Reification not only solves the noun/verb dilemma but also provides a superior architecture for asynchronous processing. If the translation or calculation takes ten minutes, creating a `/translations` or `/quotes` resource allows the client to poll that specific URI later to check the status.

### The Controller Exception

While nouns should be the default, pragmatic API design recognizes that dogma can sometimes harm developer experience. When an action changes state across multiple resources simultaneously, or when it truly represents an executable process with no logical resource counterpart, using a "Controller" resource is acceptable.

A Controller resource acts like an executable function. In these rare cases, it is permissible to use a verb, typically appended to the relevant resource collection.

**Examples of acceptable Controller endpoints:**

* `POST /search`: Search often spans multiple domains and doesn't fit a standard GET query easily if the query parameters are exceptionally complex or require a request body.
* `POST /users/42/lock`: While this could be a state transition (`PATCH {"locked": true}`), if locking triggers a massive cascade of security events, token revocations, and audit logs, a controller endpoint explicitly signals the gravity of the business process.

When employing verbs as controllers, **always restrict them to the `POST` method**, as POST is the "catch-all" semantic for processing data in HTTP. Using `GET /calculate` or `PUT /activate` violates the safety and idempotency rules of those methods.

## 8.2 Pluralization, Hyphens, and Casing Rules

While REST architectural constraints define how systems communicate, the syntactical choices made in your URIs dictate how developers *feel* when using your API. Predictability is the cornerstone of an excellent Developer Experience (DX). When consumers can accurately guess the URI of a resource without consulting the documentation, your API design has succeeded.

Achieving this predictability requires strict adherence to conventions regarding pluralization, word separation, and casing.

### The Collection Metaphor: Embracing Pluralization

One of the most common early design hurdles is deciding whether to name resources in the singular (`/user/123`) or the plural (`/users/123`).

The industry standard, adopted by nearly all modern enterprise APIs, is to **always use plural nouns**.

To understand why, it helps to conceptualize your API as a file directory or a database schema. A URI path is essentially a pointer to a collection, and an ID is a pointer to a specific item within that collection.

```text
=========================================================
            THE FOLDER STRUCTURE METAPHOR
=========================================================

[📁 /users]                   <-- The Collection (Plural)
   |-- [📄 /1]                <-- Item in Collection
   |-- [📄 /2]                <-- Item in Collection
   |-- [📁 /42]               <-- Item in Collection (User 42)
         |
         |-- [📁 /orders]     <-- Sub-Collection (Plural)
               |-- [📄 /998]  <-- Item in Sub-Collection
               |-- [📄 /999]  <-- Item in Sub-Collection

Resulting URI: /users/42/orders/999
=========================================================

```

Using singular nouns breaks this logical hierarchy. If you use `GET /user` to retrieve a list of users, it reads as grammatically incorrect. If you mix the two—using `GET /users` for the list and `GET /user/42` for the individual—you force the client to remember when to switch between singular and plural forms, introducing unnecessary cognitive load.

**Rule of Thumb:** Treat the base resource as a database table (which contains many records) and the appended ID as the primary key lookup.

* **Avoid:** `/employee/55/paystub/12`
* **Embrace:** `/employees/55/paystubs/12`

*Note on Uncountable Nouns:* Occasionally, you will encounter mass nouns that do not have a distinct plural form (e.g., `equipment`, `feedback`, `hardware`). In these edge cases, simply use the uncountable noun as-is (`/equipment/8A9B`). Do not force artificial plurals like `/equipments`.

### Word Separation: Hyphens vs. Underscores

When a resource name consists of multiple words, you need a delimiter to make the URI readable. The two primary contenders are hyphens (kebab-case) and underscores (snake_case).

**You should strictly use hyphens (`-`) for multi-word URI segments.**

This is not merely a stylistic preference; it is rooted in web standards and practical usability. According to RFC 3986, URIs can contain either character. However, in plain text environments (emails, chat applications, markdown documents), URLs are frequently rendered as clickable links with an automatic underline. When an underline is applied to a URI containing underscores, the delimiters disappear, making `/payment_methods` look identical to `/paymentmethods`.

Hyphens, on the other hand, remain clearly visible regardless of text formatting. Furthermore, search engines (like Google) traditionally treat hyphens as word separators in URLs but treat underscores as part of a single word, which can impact the SEO of public-facing APIs.

```text
+-----------------------+-----------------------------+-----------------------------+
| Resource Concept      | Anti-Pattern (Underscores)  | Standard Pattern (Hyphens)  |
+-----------------------+-----------------------------+-----------------------------+
| Payment Methods       | /payment_methods            | /payment-methods            |
| Shipping Quotes       | /shipping_quotes            | /shipping-quotes            |
| Two-Factor Auth       | /two_factor_auth            | /two-factor-auth            |
+-----------------------+-----------------------------+-----------------------------+

```

### Casing Rules: The Case for Strict Lowercase

RFC 3986 explicitly states that the scheme (e.g., `https://`) and host (e.g., `api.example.com`) components of a URI are case-insensitive. However, the path and query string components are **case-sensitive**.

This means that to a strict HTTP server, the following are three entirely distinct resources:

1. `[https://api.example.com/Users/42](https://api.example.com/Users/42)`
2. `[https://api.example.com/users/42](https://api.example.com/users/42)`
3. `[https://api.example.com/USERS/42](https://api.example.com/USERS/42)`

Allowing mixed casing (such as CamelCase or PascalCase) introduces a massive vector for client errors. Developers typing from memory might guess the capitalization incorrectly, leading to frustrating `404 Not Found` errors simply because they capitalized a single letter.

To eliminate this ambiguity, **all URI paths should be written entirely in lowercase.**

#### Differentiating Path Casing from Payload Casing

A common point of confusion arises when developers try to align the casing of their URIs with the casing of their JSON payloads or query parameters.

It is standard practice for JSON payloads to use `camelCase` (favored by JavaScript/Java ecosystems) or `snake_case` (favored by Python/Ruby ecosystems). You do not need to force your URIs to match your JSON body conventions.

Maintain a separation of concerns:

* **The Network Layer (URIs):** Use `lowercase-kebab-case`. It is optimized for network infrastructure, load balancers, and web readability.
* **The Application Layer (JSON/Query Params):** Use `camelCase` or `snake_case`. It is optimized for programmatic variable binding within the client application.

**Example of a well-architected separation:**

```http
POST /user-profiles/890/shipping-addresses HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "addressLine": "123 Main St",
  "postalCode": "90210",
  "isPrimary": true
}

```

In the example above, the URI utilizes plural nouns, lowercase letters, and hyphens (`/user-profiles`, `/shipping-addresses`), while the application payload gracefully utilizes `camelCase` (`addressLine`, `postalCode`) to map cleanly to the consuming application's internal data structures.

## 8.3 When to Use Query Parameters vs. Path Variables

One of the most persistent sources of confusion in RESTful API design is determining how to pass arguments to an endpoint. The HTTP protocol offers two primary mechanisms within the URI itself: **path variables** (segments of the URI path) and **query parameters** (key-value pairs appended after a `?`).

While both transmit data from the client to the server, they serve entirely different semantic purposes in a resource-oriented architecture. Conflating the two leads to APIs that are difficult to cache, hard to document, and unintuitive to consume.

### The Semantic Divide: Identification vs. Modification

The golden rule for choosing between path variables and query parameters comes down to the concept of **resource identity**.

* **Path Variables identify a specific resource or define the hierarchy.** They answer the question: *What are we looking at?*
* **Query Parameters modify the representation or filter a collection.** They answer the question: *How do we want to see it?*

```text
=============================================================================
                       ANATOMY OF A URI PARAMETERIZATION
=============================================================================

 GET /organizations/org_998/employees?department=sales&sort=desc
     \____________/ \_____/ \_______/ \________________________/
           |           |        |                 |
      Collection       |    Collection            |
         |       Path Variable  |          Query Parameters
         |       (Identifier)   |       (Filtering & Sorting)
         |             |        |                 |
          \_____________\_______/                 |
             Resource Hierarchy                   |
           (Defining the Target)        Representation Modifiers
                                        (Refining the Target)
=============================================================================

```

### Path Variables: Navigating the Domain

Path variables should be strictly reserved for identifying entities. If a piece of data is structurally required to point to a unique resource within your system, it belongs in the path.

Consider a system managing user accounts and their associated invoices.

**Correct Use of Path Variables:**
`GET /users/us_1abc9/invoices/inv_4452`

In this example, `us_1abc9` and `inv_4452` are path variables. They act as coordinates. If you remove `inv_4452` from the path, the meaning of the URI fundamentally changes—you are no longer asking for a specific invoice, but for the entire collection of a user's invoices. If omitting the parameter changes the *nature* of the resource being targeted, it must be a path variable.

**Rules for Path Variables:**

1. **Mandatory:** They are structurally required. A missing path variable usually results in a `404 Not Found` (or points to a completely different parent collection).
2. **Hierarchical:** They imply a parent-child relationship (e.g., this specific invoice belongs to this specific user).
3. **Non-Volatile:** Identifiers in the path should rarely, if ever, change.

### Query Parameters: Filtering, Sorting, and Pagination

Query parameters, conversely, are entirely optional from a routing perspective. They act as a set of instructions given to the server on how to process, format, or narrow down a collection of resources.

If you omit all query parameters, the URI still points to the exact same valid resource (usually a collection), it just returns the default view of that resource.

**Correct Use of Query Parameters:**
`GET /users/us_1abc9/invoices?status=paid&limit=10&page=2`

Here, the client is targeting the exact same collection (`/users/us_1abc9/invoices`), but is using query parameters to filter by `status` and apply pagination (`limit`, `page`).

**Rules for Query Parameters:**

1. **Optionality:** Omitting them should not break the request; it should simply return a broader or default dataset.
2. **Order Independence:** Unlike path variables, which must appear in a strict hierarchical order, query parameters can be appended in any sequence (`?limit=10&status=paid` is identical to `?status=paid&limit=10`).
3. **Non-Hierarchical Attributes:** They are ideal for passing attributes that cross-cut resource boundaries, such as dates, statuses, or boolean flags.

### The "Omission Test"

If you are ever in doubt during the design phase, apply the Omission Test to the parameter in question:

* *If I remove this parameter from the URI, does the request fail, or does it point to an entirely different structural entity?* -> **Use a Path Variable.**
* *If I remove this parameter, does the request succeed but simply return a larger list or an unformatted version of the same data?* -> **Use a Query Parameter.**

### Common Anti-Patterns to Avoid

**Anti-Pattern 1: Filtering via Path Variables**
Do not encode state or filter criteria into the URI path.

* **Bad:** `GET /invoices/paid/2023`
* **Good:** `GET /invoices?status=paid&year=2023`
The "bad" example forces you to create endless virtual hierarchies for every possible combination of filters, severely bloating your API routing logic.

**Anti-Pattern 2: Identifiers in the Query String**
Do not use query parameters to look up specific, singular resources by their primary ID.

* **Bad:** `GET /users?id=us_1abc9`
* **Good:** `GET /users/us_1abc9`
While the "bad" example technically functions, it breaks caching mechanisms. Content Delivery Networks (CDNs) and web caches are optimized to treat unique URI paths as distinct cacheable objects. Hiding primary identifiers in the query string undermines these optimizations and violates standard REST semantics.

**Anti-Pattern 3: Path Variable Fatigue (Deep Nesting)**
While path variables are for hierarchy, overly deep nesting becomes hostile to developers.

* **Bad:** `GET /regions/na/countries/us/states/ca/cities/sf/users/123`
If a resource has a globally unique identifier (like a UUID), you do not need to traverse its entire ancestral tree to access it. Flatten the architecture.
* **Good:** `GET /users/123` (Assuming the user ID is globally unique). Use query parameters if you instead need to find users *by* region: `GET /users?city=sf&state=ca`.

## 8.4 Common Anti-patterns in URI Design

Even when a design team successfully adopts plural nouns, standardizes on lowercase-kebab-case, and correctly segregates path variables from query parameters, structural flaws can still emerge. These anti-patterns often stem from treating the API as a direct reflection of internal architecture rather than a consumer-facing contract.

Avoiding the following common pitfalls is essential for maintaining a clean, scalable, and professional URI namespace.

### Anti-Pattern 1: Deep Nesting (The Ancestry Trap)

When designing a resource hierarchy, it is tempting to map the complete relational database structure directly into the URI path. If an organization has departments, departments have teams, and teams have employees, developers often create URIs that enforce this entire ancestry.

**The Problematic Deep Path:**
`GET /organizations/org_12/departments/dept_5/teams/team_99/employees/emp_401`

While logically sound, this deep nesting is a nightmare for consumers. It requires the client to know the IDs of four different parent resources just to look up a single employee. It creates fragile code, overly long URLs, and complex routing logic on the server.

**The Solution: Flattening and the "Rule of Three"**

If a resource has a globally unique identifier (like a UUID), it does not need its full ancestry in the URI to be located. You should flatten the architecture to a maximum of three path segments: `/collection/{id}/sub-collection`.

If you need to access `emp_401`, and that ID is unique across the entire system, access it directly at the root collection. If you need to find all employees within `team_99`, start the path at the team level.

```text
====================================================================
                  FLATTENING DEEP HIERARCHIES
====================================================================

[Avoid: Deep Traversal]
GET /organizations/org_12/departments/dept_5/teams/team_99/employees

[Embrace: Bounded Contexts]
GET /teams/team_99/employees

[Avoid: Full Ancestry for Singletons]
GET /organizations/org_12/departments/dept_5/teams/team_99/employees/emp_401

[Embrace: Direct Access via Unique ID]
GET /employees/emp_401
====================================================================

```

### Anti-Pattern 2: File Extensions in the URI

In the early days of web APIs, it was common practice to append file extensions to URIs to indicate the desired response format (e.g., `.json`, `.xml`, or `.csv`).

**Avoid:** `GET /users/42.json`
**Avoid:** `GET /users/42.xml`

This is a violation of REST principles. A URI is meant to identify the *resource itself*, not the *representation* of that resource. The user with ID 42 is the underlying entity, regardless of whether their data is serialized as JSON or XML.

Embedding the format in the URI tightly couples the endpoint to a specific data type and circumvents the HTTP protocol's built-in mechanism for format selection: **Content Negotiation**. Consumers should use the standard `Accept` HTTP header to specify their desired format, keeping the URI clean and format-agnostic.

**Embrace:**

```http
GET /users/42 HTTP/1.1
Host: api.example.com
Accept: application/json

```

### Anti-Pattern 3: Trailing Slashes

A seemingly trivial detail that routinely causes integration failures is the inconsistent use of trailing slashes.

According to RFC 3986, a URI with a trailing slash is distinct from a URI without one. To a strict router, `[https://api.example.com/users](https://api.example.com/users)` and `[https://api.example.com/users/](https://api.example.com/users/)` are two entirely different endpoints.

While some modern web frameworks automatically redirect one to the other (issuing a `301 Moved Permanently`), relying on redirects in an API context introduces unnecessary latency and can cause issues with HTTP methods like `POST` or `PUT` being stripped or downgraded to `GET` during the redirect.

**The Rule:** A URI should never end with a trailing slash. If a client requests an endpoint with a trailing slash, the API should ideally drop it or standardize on a strict routing policy. Consistency is key, but the industry standard is to omit the terminal slash.

### Anti-Pattern 4: Leaky Abstractions (Database Mirroring)

APIs are abstraction layers. They exist specifically to decouple the client from the server's internal implementation. A severe anti-pattern occurs when developers use URIs to expose their exact database schemas.

**Signs of a Leaky Abstraction:**

* **Table Prefixes:** `GET /tbl_customers` or `GET /vw_active_users`
* **Implementation Details:** `GET /mongo-documents/users`
* **Exposing Sequential Primary Keys:** `GET /users/1`, `GET /users/2` (While not inherently invalid REST, exposing auto-incrementing integers allows attackers to easily enumerate your entire user base. Using UUIDs or opaque alphanumeric hashes like `usr_9A2b8F` is highly preferred for public APIs).

If your URIs perfectly mirror your database tables, you have built a remote database access tool, not an API. This tight coupling means that if you ever need to refactor your database—perhaps splitting a monolithic `tbl_users` into `authentication_records` and `user_profiles`—you will be forced to introduce breaking changes to your API consumers. Design your URIs based on the business domain and the consumer's needs, completely insulated from how the data is stored on disk.
