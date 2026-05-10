Modern API design is the culmination of decades of architectural trial and error. To master API development today, we must understand how distributed systems communicated historically. In this chapter, we trace the evolutionary lineage of application programming interfaces. We begin with the tightly coupled binary procedures of RPC and CORBA, navigate the heavy enterprise integrations of SOAP and XML, and explore the web-native revolution that cemented RESTful architecture. Finally, we examine the modern landscape, where specialized protocols like GraphQL and gRPC address the unique complexities of today's distributed applications.

## 2.1 The Era of RPC and CORBA

To understand the design paradigms of modern Web APIs, we must first examine the historical context that necessitated them. Before the ubiquity of HTTP and the web browser, enterprise software systems were already distributed. Large organizations needed mainframe applications, Unix workstations, and desktop software to share data and execute business logic across physical networks.

The prevailing philosophy of this era was driven by a single, seductive idea: **distributed computing should look and feel exactly like local computing.**

This ambition birthed the Remote Procedure Call (RPC) and eventually the Common Object Request Broker Architecture (CORBA). While they represent a bygone era of enterprise architecture, their fundamental concepts—and their critical flaws—shaped the architectural styles we use today.

---

### The Remote Procedure Call (RPC) Paradigm

The core premise of a Remote Procedure Call (RPC) is location transparency. If a developer needs to calculate taxes on an invoice, they shouldn't need to write custom network socket code, handle byte streams, or manage connection retries. Instead, they should simply invoke a function—`calculate_tax(invoice_data)`—and let the underlying system figure out that the function actually executes on a server 500 miles away.

To achieve this illusion, RPC introduces the concept of **Stubs** (on the client side) and **Skeletons** (on the server side).

#### The Mechanics of RPC

When a client application invokes a remote procedure, the following sequence occurs:

1. **Invocation:** The client calls a local function (the Client Stub) that masquerades as the actual function.
2. **Marshaling:** The Client Stub packs the function parameters into a standardized binary message format.
3. **Transmission:** The stub delegates the binary payload to the operating system's network layer, which transmits it over a transport protocol (usually TCP or UDP) to the remote server.
4. **Unmarshaling:** The Server Skeleton receives the network packet, unpacks the parameters, and invokes the actual business logic.
5. **Return:** The process happens in reverse, sending the calculated result back to the client.

```text
  LOCAL MACHINE                                      REMOTE MACHINE
 +----------------+                                 +----------------+
 |                |                                 |                |
 | 1. Client App  |       5. Network Journey        | 8. Server App  |
 |    Calls       |                                 |    Executes    |
 |    Function()  |  =============================> |                |
 |                |  <============================= |                |
 +-------|--------+                                 +--------^-------+
         | 2. Parameter                                      | 7. Unpack
         v    Marshaling                                     |    Parameters
 +----------------+                                 +----------------+
 |                |  3. Binary Request Message      |                |
 |  Client Stub   |  -----------------------------> | Server Skeleton|
 |                |  <----------------------------- |                |
 +----------------+  6. Binary Response Message     +----------------+
         |                                                   ^
         v 4. OS Network Layer              Network Layer . 8|

```

While elegant in theory, early RPC implementations (such as Sun RPC, introduced in the 1980s) tightly coupled the client and server. Both applications generally had to be written in the same programming language (e.g., C) and share exact memory layouts for data structures.

---

### The Rise of CORBA

As the software industry shifted toward Object-Oriented Programming (OOP) in the 1990s, the procedural nature of basic RPC was no longer sufficient. Enterprises had disparate systems: a billing engine written in C++ on Solaris, a user interface built in Java on Windows, and legacy mainframes running COBOL.

The Object Management Group (OMG), a consortium of software vendors, introduced **CORBA (Common Object Request Broker Architecture)** to solve the interoperability problem. CORBA was designed to be the universal translator of the enterprise network—a standard that allowed objects to communicate regardless of their native programming language, operating system, or hardware architecture.

#### Core Components of CORBA

CORBA achieved language and platform neutrality through three critical innovations:

* **IDL (Interface Definition Language):** A declarative language used to define the public interfaces of an object (its methods and attributes). IDL was language-agnostic. Developers would write an IDL file, and a compiler would generate the native C++, Java, or Smalltalk stubs and skeletons.
* **ORB (Object Request Broker):** The middleware engine. The ORB was responsible for locating the remote object on the network, routing the request, handling security, and managing transactions.
* **IIOP (Internet Inter-ORB Protocol):** The standardized wire protocol that allowed ORBs from different vendors (e.g., IBM's ORB talking to Oracle's ORB) to communicate over TCP/IP networks.

```text
     Language A (e.g., Java)                        Language B (e.g., C++)
   +-------------------------+                    +-------------------------+
   |   Client Application    |                    |    Server Object        |
   +-------------------------+                    +-------------------------+
   |  IDL-Generated Stub     |                    |  IDL-Generated Skeleton |
   +-------------------------+                    +-------------------------+
   |       Vendor X ORB      |                    |       Vendor Y ORB      |
   +-------------------------+                    +-------------------------+
               |                                              |
               +---------- IIOP (Binary over TCP/IP) ---------+

```

---

### The Downfall: Why We Moved On

CORBA was an architectural marvel of its time, but it ultimately collapsed under its own weight, giving way to the web-centric protocols we use today. The failure of the RPC/CORBA era provides crucial lessons for modern API designers.

**1. The Fallacies of Distributed Computing**
RPC and CORBA's greatest strength—location transparency—was also their fatal flaw. By pretending that a network call was indistinguishable from a local memory call, they abstracted away the realities of the network. Local calls do not suffer from bandwidth limitations, network latency, packet loss, or DNS resolution failures. When developers treated remote objects like local objects, systems became incredibly brittle, resulting in catastrophic failures when the network inevitably degraded.

**2. Extreme Complexity and "Bloatware"**
To accommodate every possible enterprise use case, the OMG consortium continuously added specifications to CORBA (transaction management, concurrency control, event services). Implementing a compliant ORB became exceedingly difficult, resulting in expensive, heavyweight, and notoriously difficult-to-debug middleware.

**3. Firewall Hostility**
In the 1990s, the internet was becoming commercialized, and corporate security hardened. Firewalls were deployed to block arbitrary network traffic, heavily restricting which ports could communicate. CORBA and early RPC protocols dynamically allocated random high-number TCP ports for object communication. Firewalls summarily blocked these proprietary binary streams.

Network administrators generally kept only port `80` (HTTP) and `443` (HTTPS) open. Because CORBA could not easily traverse these firewalls, it was effectively trapped inside the internal corporate Intranet.

This specific networking hurdle—the need to penetrate firewalls via port 80—was the primary catalyst for the next phase of API evolution. To achieve cross-enterprise integration, the industry had to abandon binary object brokers and piggyback on the universal, firewall-friendly protocol of the World Wide Web.

## 2.2 Enterprise Integration: The Rise of SOAP and XML-RPC

The collapse of CORBA and the inherent firewall hostility of binary RPC protocols left enterprises with a critical problem: systems still needed to communicate, but the network perimeter had been locked down. Network administrators were unapologetic—only ports `80` (HTTP) and `443` (HTTPS) were left open for general traffic.

If distributed objects could no longer communicate over proprietary binary streams, they would have to disguise themselves. The solution was as pragmatic as it was revolutionary: tunnel procedure calls through the web's native protocol (HTTP) and format the data using the web's emerging markup language (XML).

This pivot marked the birth of Web Services, beginning with XML-RPC and maturing into the heavy-duty enterprise standard, SOAP.

---

### XML-RPC: The Pragmatic Bridge

Created in 1998 by Dave Winer with support from Microsoft, XML-RPC was a brilliantly simple specification. It abandoned the complex, tightly coupled binary marshaling of the past. Instead, it used a standard HTTP `POST` request to send an XML document representing the function call and its parameters.

The philosophy was straightforward: **HTTP is for transport; XML is for encoding.**

Here is what a standard XML-RPC request looked like. Notice how human-readable it is compared to a compiled binary stream:

```xml
POST /api/tax-calculator HTTP/1.1
Host: api.enterprise.com
Content-Type: text/xml

<?xml version="1.0"?>
<methodCall>
  <methodName>calculateTax</methodName>
  <params>
    <param>
        <value><double>150.50</double></value>
    </param>
  </params>
</methodCall>

```

XML-RPC succeeded because it was universally accessible. Because the payload was just text, a client written in Perl could easily construct an XML string and send it to a server written in Java. No specialized middleware or ORBs were required—just a standard HTTP library and a basic XML parser.

However, XML-RPC's simplicity was also its ceiling. It lacked standard mechanisms for security, routing, and complex data typing, which large enterprises desperately needed.

---

### The Ascendance of SOAP

To address the limitations of XML-RPC, Microsoft, IBM, and others collaborated to create the **Simple Object Access Protocol (SOAP)**, standardizing it through the W3C.

Despite its acronym, SOAP quickly abandoned "simplicity." It evolved into a highly rigid, extensible, and comprehensive framework for enterprise messaging. SOAP didn't just facilitate a remote procedure call; it provided a heavily standardized envelope for sending structured, typed messages across disparate networks.

#### The SOAP Envelope Architecture

A SOAP message is fundamentally an XML document, but it adheres to a strict anatomy. It relies on the metaphor of a physical letter:

```text
 +---------------------------------------------------+
 |  SOAP Envelope                                    |
 |                                                   |
 |  +---------------------------------------------+  |
 |  | SOAP Header (Optional)                      |  |
 |  | - Security tokens (WS-Security)             |  |
 |  | - Routing information (WS-Addressing)       |  |
 |  | - Transaction IDs                           |  |
 |  +---------------------------------------------+  |
 |                                                   |
 |  +---------------------------------------------+  |
 |  | SOAP Body (Required)                        |  |
 |  | - The actual payload/business data          |  |
 |  | - e.g., <CalculateTaxRequest>               |  |
 |  |                                             |  |
 |  |   +-------------------------------------+   |  |
 |  |   | SOAP Fault (Optional, inside Body)  |   |  |
 |  |   | - Standardized error reporting      |   |  |
 |  |   | - Error code, message, stack trace  |   |  |
 |  |   +-------------------------------------+   |  |
 |  +---------------------------------------------+  |
 +---------------------------------------------------+

```

1. **Envelope:** The root element that defines the XML document as a SOAP message.
2. **Header:** A highly extensible section used for metadata. This is where SOAP shined in the enterprise. Instead of mixing security credentials or routing instructions into the business data, they were neatly isolated in the header.
3. **Body:** The actual application-specific XML payload.
4. **Fault:** A built-in mechanism for error handling. If a server encountered an error, it didn't just drop the connection; it returned a structured `<soap:Fault>` block detailing exactly what went wrong.

---

### WSDL: The Ironclad Contract

If SOAP was the message, **WSDL (Web Services Description Language)** was the contract. Serving as the spiritual successor to CORBA's IDL, WSDL was an XML-based language used to describe exactly what a web service could do, where it resided, and how to invoke it.

A WSDL file defined:

* **Types:** The XML Schema (XSD) defining the exact data structures used (e.g., an `Invoice` must have a string `ID` and a decimal `Amount`).
* **Messages:** The specific inputs and outputs for the service.
* **Operations:** The actions the service could perform.
* **Bindings:** The protocol and data format (e.g., binding the operation to SOAP over HTTP).

WSDL enabled **automated code generation**. A developer could point a tool (like Java's `wsimport` or .NET's `wsdl.exe`) at a WSDL URL, and the tool would automatically generate all the client-side stubs, strongly typed classes, and network code. The developer could then interact with the remote service as if it were a local software library, restoring the cherished "location transparency" of the RPC era, but this time over HTTP.

---

### The WS-* "Alphabet Soup"

Because SOAP's header was extensible, standardizing bodies (like the OASIS consortium) began drafting specifications for every conceivable enterprise requirement. This collection of standards became known as the **WS-*** (WS-Star) specifications.

* **WS-Security:** Standardized how to encrypt specific parts of an XML payload and attach SAML or X.509 certificates to the header.
* **WS-ReliableMessaging:** Ensured a message was delivered exactly once, even if the underlying HTTP connection dropped.
* **WS-AtomicTransaction:** Allowed distributed databases across different companies to commit or roll back transactions together over the web.
* **WS-Addressing:** Decoupled the message routing from the HTTP transport layer, allowing messages to be sent over asynchronous message queues (like IBM MQ) instead of just HTTP.

#### The Legacy of SOAP

SOAP and the WS-* stack achieved what they set out to do: robust, highly secure, contract-driven enterprise integration. Today, SOAP remains deeply entrenched in industries where strict compliance, rigorous typing, and complex transaction management are non-negotiable—most notably in banking, telecommunications, and legacy healthcare systems.

However, the cost of this power was extreme verbosity. The sheer size of the XML payloads consumed massive amounts of bandwidth. The complexity of the WS-* standards meant that developers spent more time debugging XML parsing errors and interoperability quirks between different vendors' SOAP implementations than writing actual business logic.

As the industry shifted toward lightweight web applications, mobile devices, and agile development, the heavy, rigid nature of SOAP became a bottleneck. The stage was set for a massive architectural rebellion, leading to the simpler, resource-centric approach of the Web Revolution.

## 2.3 The Web Revolution: Shifting to RESTful Architecture

By the mid-2000s, the enterprise software landscape was suffering from protocol fatigue. SOAP and the WS-* specifications had successfully solved complex enterprise integration problems, but they had done so at the cost of immense complexity, rigid tooling dependencies, and massive bandwidth consumption.

Simultaneously, a new era of the internet was dawning: Web 2.0. The rise of interactive web applications, the impending explosion of mobile devices, and the shift toward Agile software development demanded a lighter, faster, and more flexible way for systems to communicate. Developers did not want to generate thousands of lines of boilerplate code just to fetch a user profile.

The solution to this complexity was not a new, heavier standard, but a return to the foundational principles of the World Wide Web itself.

### The Genesis of REST

In the year 2000, Roy Thomas Fielding, one of the principal authors of the HTTP specification, published a doctoral dissertation titled *Architectural Styles and the Design of Network-based Software Architectures*. In it, he formalized the architectural design principles that had allowed the World Wide Web to scale to millions of interconnected nodes without collapsing.

He called this architectural style **REST (Representational State Transfer)**.

It is crucial to understand that REST is fundamentally different from SOAP or CORBA. **REST is not a protocol; it is an architectural style.** There is no "W3C REST Specification" dictating exact message formats. Instead, REST is a set of constraints. If a system adheres to these constraints, it is considered "RESTful."

Fielding's revelation was that the industry had been misusing HTTP. In the XML-RPC and SOAP era, developers treated HTTP merely as a dumb transport tunnel—a way to punch through firewalls on port 80 to deliver custom binary or XML payloads. REST argued that HTTP was already a rich, application-level protocol with built-in semantics that developers were ignoring.

### The Paradigm Shift: From Actions to Resources

The most profound shift required to adopt REST was a change in mental models.

In the RPC and SOAP eras, APIs were **Action-Oriented**. You designed endpoints based on the operations or verbs you wanted to execute.
In the REST era, APIs became **Resource-Oriented**. You design endpoints based on the nouns (entities) in your system, and you rely on standard HTTP verbs to manipulate them.

```text
  THE RPC/SOAP PARADIGM (Action-Oriented)
  ---------------------------------------------------------
  Intent: Retrieve user #123

  Request:
  POST /api/UserService HTTP/1.1
  Body: { "action": "getUser", "userId": 123 }

  Concept: "Execute this function and give me the result."


  THE REST PARADIGM (Resource-Oriented)
  ---------------------------------------------------------
  Intent: Retrieve user #123

  Request:
  GET /users/123 HTTP/1.1
  Body: (Empty)

  Concept: "Fetch the current state of this specific resource."

```

In REST, a "resource" can be anything: a user, an invoice, a collection of tweets, or a physical IoT device. The URI (Uniform Resource Identifier) is the address of that resource.

### Embracing the Native Web

RESTful architecture relies heavily on the **Uniform Interface** constraint. Instead of inventing custom XML methods like `<CreateInvoice>` or `<DeleteCustomer>`, REST embraces the standardized verbs already built into HTTP:

* **POST:** Create a new resource.
* **GET:** Retrieve a representation of a resource.
* **PUT / PATCH:** Update an existing resource.
* **DELETE:** Remove a resource.

Furthermore, RESTful APIs leverage HTTP Status Codes natively. Instead of returning a generic HTTP `200 OK` with a SOAP envelope that contains an error message, a REST API returns a `404 Not Found` if a resource doesn't exist, or a `401 Unauthorized` if the client lacks credentials.

### Representations and State Transfer

The name "Representational State Transfer" accurately describes what happens in a RESTful transaction.

A database record of a user is a resource. But an API client never interacts with the raw database row. Instead, the server sends the client a **Representation** of that resource—typically serialized as JSON or XML.

When a client wants to update the user's name, it sends a modified representation back to the server. The server receives this representation, validates it, and updates the underlying database. The client has successfully *transferred* the new *state* of the *representation*.

```text
 +--------------+                                +---------------+
 |              | --- 1. GET /invoices/500 ----> |               |
 |  API Client  |                                |  API Server   |
 |              | <--- 2. Returns JSON data ---- |  (Database)   |
 +--------------+      (Representation of        +---------------+
 |              |       Invoice #500)                    |
 | Modifies the |                                        |
 | JSON locally |                                        |
 |              |                                        |
 +--------------+ --- 3. PUT /invoices/500 ----> +---------------+
 |              |      (Transfers new state)     |               |
 |              |                                | Updates DB    |
 |              | <--- 4. 200 OK --------------- |               |
 +--------------+                                +---------------+

```

### Why REST Won the API Wars

By 2010, REST had thoroughly unseated SOAP as the dominant paradigm for public-facing web APIs, championed by early pioneers like Flickr, Twitter, and Amazon Web Services (AWS). Several factors drove this victory:

1. **Lightweight Infrastructure:** REST APIs required no heavy middleware, ORBs, or complex code-generation tools. Any programming language capable of making a basic HTTP request could consume a REST API.
2. **The Rise of JSON:** While REST can return XML, it coincided with the rise of JSON (JavaScript Object Notation). JSON was vastly lighter than XML, easier for humans to read, and natively understood by the JavaScript engines running in web browsers.
3. **Scalability via Caching:** Because REST uses standard HTTP `GET` requests for data retrieval, responses can be easily cached by intermediate proxies, Content Delivery Networks (CDNs), and the browser itself. SOAP's reliance on `POST` made standard web caching nearly impossible.
4. **Statelessness:** By mandating that servers store no client context between requests (statelessness), REST allowed infrastructure to scale horizontally. Load balancers could route any request to any server without worrying about session affinity.

REST liberated data from the heavy, locked-down enterprise silos, democratizing access and paving the way for the explosive growth of the "API Economy." However, as client applications grew more complex—especially with the advent of mobile apps and single-page applications (SPAs)—the strict resource-by-resource nature of REST began to show its own limitations, setting the stage for the next evolution in API design.

## 2.4 Modern Protocols: The Emergence of GraphQL and gRPC

While REST successfully democratized API access and fueled the Web 2.0 explosion, the landscape of software engineering continued to shift. By the mid-2010s, two distinct pressures began to crack the universal dominance of RESTful architecture: the rise of data-heavy mobile applications and the proliferation of backend microservices.

REST, with its strict resource-oriented endpoints and bulky JSON payloads over HTTP/1.1, struggled to elegantly handle these new extremes. The industry needed specialized tools. This necessity birthed two distinctly different but highly influential modern protocols: **GraphQL** for client-to-server communication, and **gRPC** for server-to-server communication.

---

### GraphQL: Solving the Client-Side Dilemma

In 2012, Facebook was redesigning its native mobile applications. Their news feed was a deeply interconnected web of data: posts, authors, comments, likes, and nested replies.

Using traditional REST, fetching this data on a mobile network was highly inefficient, plagued by two fundamental problems:

1. **Under-fetching (The "N+1" Problem):** A client hits an endpoint (e.g., `/posts/123`) and gets the post data, but only receives the IDs of the comments. The client must then make subsequent HTTP requests for *each* comment (`/comments/4`, `/comments/5`), resulting in a waterfall of network round-trips. On a slow 3G network, this latency was crippling.
2. **Over-fetching:** To solve the N+1 problem, API developers would often create "fat" endpoints that returned a massive JSON blob containing the post, all comments, and all user profiles. However, if the mobile app only needed the post title and the author's name, it was forced to download kilobytes of unused data, wasting bandwidth and battery life.

To solve this, Facebook engineers created **GraphQL** (open-sourced in 2015). GraphQL inverted the traditional API power dynamic. Instead of the server dictating the shape of the data, the *client* asked for exactly what it needed—nothing more, nothing less.

#### The GraphQL Paradigm

Unlike REST, which relies on multiple endpoints (URIs) representing different resources, GraphQL typically exposes a single endpoint (e.g., `POST /graphql`). The client sends a query document written in the GraphQL query language, and the server returns a JSON response that mirrors the query's structure.

```text
  THE GRAPHQL REQUEST/RESPONSE CYCLE
  ---------------------------------------------------------
  CLIENT QUERY:                     SERVER RESPONSE (JSON):
  query {                           {
    post(id: "123") {                 "data": {
      title                             "post": {
      author {                            "title": "API Design",
        name                              "author": {
      }                                     "name": "Jane Doe"
    }                                     }
  }                                     }
                                      }
                                    }

```

By allowing clients to traverse the data graph in a single network request, GraphQL effectively eliminated both over-fetching and under-fetching. It became the architecture of choice for complex frontend applications, Single Page Applications (SPAs), and mobile clients.

---

### gRPC: The Return of the Remote Procedure Call

While frontend developers were embracing GraphQL, backend engineers were facing a different crisis: the microservices bottleneck.

As monolithic applications were broken down into dozens or hundreds of independent microservices, the volume of internal network traffic skyrocketed. Services were constantly communicating with each other using REST/JSON over HTTP/1.1.

For internal, high-throughput, server-to-server communication, REST was fundamentally inefficient:

* **JSON is slow:** Text-based JSON serialization and deserialization consumed significant CPU cycles.
* **HTTP/1.1 is blocking:** It suffered from head-of-line blocking, requiring multiple TCP connections to handle concurrent requests.
* **Lack of strict contracts:** REST APIs often relied on out-of-band documentation (like OpenAPI), making it easy for internal teams to accidentally break contracts.

In 2015, Google open-sourced **gRPC** (gRPC Remote Procedure Calls), an evolution of their internal `Stubby` framework. gRPC boldly resurrected the RPC paradigm of the 1990s, but it learned from the failures of CORBA and early RPC protocols.

#### The gRPC Architecture

gRPC achieved massive performance gains by combining two critical technologies: **Protocol Buffers (Protobuf)** and **HTTP/2**.

1. **Protocol Buffers (The Contract & Payload):** Instead of JSON, gRPC uses Protobuf, a highly compressed, binary serialization format. Developers define their services and messages in a `.proto` file. The gRPC framework then automatically generates strictly typed client and server code in virtually any programming language.
2. **HTTP/2 (The Transport):** gRPC natively runs on HTTP/2, which supports full multiplexing (sending multiple requests concurrently over a single TCP connection), server push, and bidirectional streaming.

```text
  THE gRPC COMMUNICATION MODEL
  +-----------------------+                      +-----------------------+
  |    Microservice A     |                      |    Microservice B     |
  |       (Python)        |                      |        (Go)           |
  |                       |                      |                       |
  |  +-----------------+  |                      |  +-----------------+  |
  |  |  gRPC Client    |  |    Binary Stream     |  |  gRPC Server    |  |
  |  |  (Auto-gen)     |  |======================|  |  (Auto-gen)     |  |
  |  +-----------------+  |    over HTTP/2       |  +-----------------+  |
  |          ^            |                      |          ^            |
  |          | (Local     |                      |          | (Executes  |
  |          v  Call)     |                      |          v  Logic)    |
  |  Business Logic       |                      |  Business Logic       |
  +-----------------------+                      +-----------------------+

```

gRPC restored the developer experience of "calling a local method" (location transparency) but backed it with modern, cloud-native networking primitives. Firewalls no longer blocked the traffic because it utilized standard HTTP/2 routing.

---

### The Modern Tripartite Landscape

By understanding this evolutionary journey—from the rigid RPCs of the past to XML-heavy SOAP, through the lightweight REST revolution, and finally to modern specializations—we can view API design not as a search for the "perfect" protocol, but as a practice of applying the right architectural style to the right problem.

The modern API designer must now navigate a tripartite landscape:

| Protocol / Style | Primary Data Format | Transport Protocol | Ideal Use Case |
| --- | --- | --- | --- |
| **REST** | JSON (or XML) | HTTP/1.1 or HTTP/2 | Public APIs, standard web integrations, and broad ecosystem compatibility. |
| **GraphQL** | JSON | HTTP/1.1 or HTTP/2 | Data-heavy frontend applications, mobile apps, and aggregating multiple backend sources. |
| **gRPC** | Protocol Buffers (Binary) | HTTP/2 | Internal microservices, polyglot backend environments, and low-latency/high-throughput systems. |

With the historical context established, we are now equipped to dive deeply into the mechanics, design principles, and best practices of these individual architectures in the chapters to come.
