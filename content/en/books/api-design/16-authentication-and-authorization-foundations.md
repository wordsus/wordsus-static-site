Building a functional, high-performing API is only half the battle; the true test of enterprise-grade architecture lies in securing it. Exposing endpoints to the web without stringent access controls is a recipe for data breaches and system compromise. In this chapter, we transition from API design to API defense. We will explore the critical distinction between authentication (verifying identity) and authorization (verifying permissions). From the simplicity of API keys to the robust delegation frameworks of OAuth 2.0 and OpenID Connect, you will learn how to design secure, stateless access controls using JSON Web Tokens and Role-Based Access Control.

## 16.1 Implementing Basic Authentication and API Keys

Before diving into complex identity frameworks and token-based exchanges, every API designer must understand the foundational mechanisms of access control: Basic Authentication and API Keys. While modern consumer-facing applications often require federated identity or delegated access (topics covered in subsequent sections on OAuth 2.0 and OIDC), these simpler methods remain ubiquitous in server-to-server communication, internal microservices, and foundational B2B integrations.

Both methods serve the primary goal of authentication—verifying *who* is making the request—but they do so with different trade-offs regarding security, lifecycle management, and developer experience.

### HTTP Basic Authentication

HTTP Basic Authentication (defined in RFC 7617) is one of the oldest and simplest mechanisms for enforcing access controls on web resources.

#### How It Works

In Basic Authentication, the client sends the user credentials (a username and a password) combined into a single string separated by a colon (`username:password`). This string is then Base64-encoded and transmitted in the HTTP `Authorization` header.

If a client attempts to access a protected resource without this header, the server responds with a `401 Unauthorized` status code and a `WWW-Authenticate` header indicating that Basic Auth is required.

```text
Sequence of Basic Authentication:

1. Client              --- GET /secure-data ---------------------> Server
2. Client              <-- 401 Unauthorized ---------------------- Server
                           WWW-Authenticate: Basic realm="api"

3. Client (Encodes)    --- GET /secure-data ---------------------> Server
   "admin:secret"          Authorization: Basic YWRtaW46c2VjcmV0
   to Base64

4. Client              <-- 200 OK (Data returned) ---------------- Server

```

#### Security Implications and Best Practices

The most critical characteristic of Basic Authentication is that **Base64 encoding is not encryption**. Anyone intercepting the HTTP request can easily decode the string and read the plaintext username and password.

Because APIs are designed to be stateless (as discussed in Chapter 3), these credentials must be sent with *every single request*. If an attacker compromises one request, they possess the user's permanent credentials.

To use Basic Authentication safely:

* **Mandate TLS:** It is absolutely non-negotiable; Basic Auth must only be routed over HTTPS. As covered in Chapter 4, TLS encrypts the entire transport layer, protecting the plaintext credentials in transit.
* **Scope to Internal Systems:** Reserve Basic Auth for internal, highly trusted environments (e.g., a legacy backend communicating with an API Gateway) where the network perimeter is already secured.
* **Avoid in Mobile/Web Clients:** Never hardcode Basic Auth credentials into client-side code (mobile apps or Single Page Applications), as they are easily reverse-engineered.

### API Keys

An API Key is a generated, opaque string (often a UUID or a cryptographically secure random alphanumeric string) assigned to an API consumer. Unlike Basic Auth, which maps to a human user's identity, an API key typically represents the *calling application* or a specific integration.

#### Implementation Patterns

API keys can be transmitted from the client to the server in three common ways, each with distinct security profiles:

1. **Custom HTTP Headers (Recommended):**
The key is passed in a custom header, such as `X-API-Key` or `Authorization: ApiKey <token>`. This is the safest standard approach, as headers are not logged by default in web servers or intermediate proxies, and they are protected by TLS in transit.
2. **Query Parameters (Anti-Pattern):**
The key is appended to the URI (e.g., `GET /v1/users?api_key=abcdef12345`). While easy for developers to test in a browser, this is a severe security risk. URIs are routinely recorded in plain text in server access logs, browser histories, and proxy caches, exposing the key to internal threats and accidental leakage.
3. **Cookies (Niche Use Case):**
Useful only when the API is consumed directly by a browser-based application on the same domain, though this introduces CSRF risks (covered in Chapter 17) and goes against the stateless nature of APIs.

```text
Standard API Key Validation Flow:

+-------------+                                   +---------------+
|             | -- 1. GET /data                -> |               |
|             |       X-API-Key: abcd123          |  API Gateway  |
| Third-Party |                                   |               |
|   Client    |                                   +-------+-------+
|             |                                           | 2. Look up key
|             |                                   +-------v-------+
|             |                                   |  Key/Client   |
|             |                                   |   Database    |
|             | <-- 4. 200 OK (Data) -----------  +-------+-------+
+-------------+        (If valid)                         | 3. Valid & Active

```

#### Advantages of API Keys

* **Granular Revocation:** If an API key is compromised, the API provider can revoke or regenerate it immediately without affecting the user's core password or other systems.
* **Rate Limiting and Analytics:** API Gateways (Chapter 20) use API keys as the primary identifier to track usage metrics and enforce rate limits and quotas (Chapter 19). You cannot easily enforce a "1,000 requests per day" quota without a reliable way to identify the caller.
* **Simplicity:** They offer an excellent Developer Experience (DX). A developer can copy a key from an API console and immediately begin testing endpoints via `curl` or Postman without complex cryptographic signing or multi-step token exchanges.

#### Operational Limitations

While superior to Basic Authentication for B2B and public APIs, API Keys lack the nuance required for modern, user-centric security. An API key proves *what* application is calling, but it does not prove *who* is using that application. Furthermore, API keys are typically long-lived and do not automatically expire. If an attacker extracts an API key from a public GitHub repository—a notoriously common occurrence—they retain indefinite access until the provider or developer manually detects the breach and rolls the key.

For applications requiring scoped, time-bound access, or the delegation of user permissions, API designers must move beyond these foundational mechanisms and implement robust authorization frameworks.

## 16.2 Demystifying the OAuth 2.0 Authorization Framework

While Basic Authentication and API Keys are sufficient for simple or internal integrations, they fail when a system requires **delegated access**. If a user wants a third-party application to print their photos stored on a cloud drive, giving that application their username and password is a massive security risk. The application would have unrestricted, permanent access to the user's entire account.

OAuth 2.0 (RFC 6749) was designed specifically to solve this problem. It is an **authorization framework**, not an authentication protocol. It allows a user to grant a third-party application limited access to their resources without exposing their credentials.

The classic analogy for OAuth 2.0 is a valet key for a car: the valet key allows the attendant to drive and park the car (limited access), but it does not open the glove box or the trunk, and it certainly doesn't allow them to keep the car forever.

### The Four Core Roles of OAuth 2.0

To understand OAuth 2.0, you must understand the four distinct actors involved in any transaction:

1. **Resource Owner:** Typically the human user who owns the data and can grant access to it.
2. **Client:** The application (web, mobile, or server) attempting to access the user's data.
3. **Authorization Server:** The central security authority. It authenticates the Resource Owner, obtains their consent, and issues tokens to the Client.
4. **Resource Server:** The API hosting the protected data. It validates the tokens presented by the Client and serves the request.

```text
+--------+                               +---------------+
|        |--(A)- Authorization Request ->|   Resource    |
|        |                               |     Owner     |
|        |<-(B)-- Authorization Grant ---|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(C)-- Authorization Grant -->| Authorization |
| Client |                               |     Server    |
|        |<-(D)----- Access Token -------|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(E)----- Access Token ------>|    Resource   |
|        |                               |     Server    |
|        |<-(F)--- Protected Resource ---|     (API)     |
+--------+                               +---------------+

Figure 16.2.1: Abstract OAuth 2.0 Protocol Flow

```

### Tokens: The Currency of OAuth

Instead of passing passwords, OAuth 2.0 relies on tokens.

* **Access Token:** A credential used to access protected resources. It is a string representing an issued authorization. Access tokens are typically short-lived (e.g., 15 to 60 minutes) to minimize the blast radius if they are intercepted. In modern API design, these are usually JSON Web Tokens (JWTs), which we will explore deeply in Section 16.4.
* **Refresh Token:** A long-lived credential used to obtain a new access token when the current one expires. Because they are powerful, refresh tokens are stored securely by the Client and are never sent to the Resource Server (the API).

### Modern Grant Types (Flows)

OAuth 2.0 defines multiple "grant types"—methods by which a Client can acquire an access token. Over the years, security best practices have evolved, deprecating older flows (like the Implicit Grant and Password Grant) in favor of more secure alternatives. API designers should focus on the following two primary flows:

#### 1. The Authorization Code Grant (with PKCE)

This is the gold standard for web applications, mobile apps, and single-page applications (SPAs). It involves a browser redirect to ensure the Client never sees the user's credentials.

Because mobile apps and SPAs cannot securely store a "Client Secret" (a password for the application itself), this flow is augmented with **PKCE** (Proof Key for Code Exchange). PKCE dynamically generates a cryptographic secret for every single login attempt, preventing malicious apps from intercepting the authorization code.

```text
Sequence of Authorization Code Grant (with PKCE):

1. Client (App) generates a random string (Code Verifier) and hashes it (Code Challenge).
2. Client redirects User's browser to Auth Server: 
   GET /authorize?response_type=code&client_id=APP1&code_challenge=XYZ
3. User logs in at Auth Server and consents to access.
4. Auth Server redirects browser back to Client with a temporary Auth Code.
5. Client sends the Auth Code AND the original plaintext Code Verifier to Auth Server.
   POST /token (Code + Verifier)
6. Auth Server hashes the Verifier, compares it to the initial Challenge, and if they match, returns the Access Token.
7. Client calls the API (Resource Server) with the Access Token.

```

#### 2. The Client Credentials Grant

Not all API calls involve a human user. When a microservice needs to call another microservice, or a backend daemon job needs to sync data via a B2B API, there is no "Resource Owner" to present a login screen to.

For machine-to-machine (M2M) communication, the Client Credentials grant is used. The Client authenticates directly with the Authorization Server using its own credentials (e.g., a Client ID and Client Secret, or a private key JWT) and requests an access token in its own name.

### Scopes: Limiting the Blast Radius

A critical feature of OAuth 2.0 for API designers is the concept of **Scopes**. Scopes are strings defined by the API that specify the *extent* of access being granted.

For example, a banking API might define the following scopes:

* `read:balance`: Allows reading account balances.
* `execute:transfer`: Allows moving money between accounts.

When a Client requests an access token, it requests specific scopes. The Authorization Server presents these scopes to the user during the consent phase ("App XYZ wants to read your balance"). When the API receives the access token, it must inspect the token's scopes and reject the request (with an HTTP `403 Forbidden` status) if the token lacks the necessary permissions for the requested endpoint.

### API Design Responsibilities for OAuth 2.0

When building an API protected by OAuth 2.0, the Resource Server (your API) has three primary responsibilities:

1. **Extract the Token:** Look for the token in the `Authorization` HTTP header using the `Bearer` schema (e.g., `Authorization: Bearer eyJhbGci...`).
2. **Validate the Token:** Ensure the token was issued by a trusted Authorization Server, has not expired, and has not been revoked.
3. **Enforce Scopes:** Check the scopes embedded in the token against the requirements of the specific HTTP method and URI being accessed.

By offloading the complexities of user authentication and consent to a dedicated Authorization Server, your API remains strictly focused on business logic and fine-grained access control based on the validated token.

## 16.3 Identity Management with OpenID Connect (OIDC)

As established in the previous section, OAuth 2.0 is an authorization framework. It is designed to grant access to resources, not to verify human identity. Historically, developers routinely misused OAuth 2.0 to log users into applications by assuming that if an access token was successfully issued, the user must be authenticated. This "pseudo-authentication" anti-pattern led to widespread security vulnerabilities, such as token substitution attacks.

OpenID Connect (OIDC) was created to solve this exact problem. Published in 2014, OIDC is an identity layer built directly on top of the OAuth 2.0 protocol. If OAuth 2.0 is a valet key that allows an application to perform actions, OIDC is the driver's license that proves who handed over the keys.

### How OIDC Extends OAuth 2.0

Because OIDC sits on top of OAuth 2.0, it utilizes the exact same infrastructure, endpoints, and grant types (such as the Authorization Code flow). To transform a standard OAuth 2.0 flow into an OIDC authentication flow, the client application simply includes the `openid` string in the requested scopes.

When the Authorization Server sees the `openid` scope, it knows the client is requesting identity verification. Upon successful authentication and token exchange, the server returns the standard Access Token alongside a new, highly specific credential: the **ID Token**.

```text
The OpenID Connect Token Exchange:

+--------+                               +---------------+
|        |-- 1. POST /token             >|               |
|        |   Grant Type: Auth Code       | Authorization |
| Client |   Scope: openid profile       |     Server    |
|        |                               |    (OIDC)     |
|        |<-- 2. 200 OK -----------------|               |
+--------+       {                       +---------------+
                   "access_token": "...",
                   "id_token": "...",
                   "expires_in": 3600
                 }

```

### The Anatomy of the ID Token

The Access Token is meant to be consumed by the API (the Resource Server) and is completely opaque to the client. Conversely, the ID Token is meant to be consumed *by the client application*.

The ID Token is always formatted as a JSON Web Token (JWT)—a standard we will dissect deeply in Section 16.4. It contains cryptographically signed key-value pairs called **claims**, which provide the client with verifiable assertions about the authenticated user and the authentication event itself.

OIDC standardizes a core set of claims that an ID Token must contain:

| Claim | Name | Description |
| --- | --- | --- |
| **`iss`** | Issuer | The URL of the Authorization Server that issued the token. |
| **`sub`** | Subject | A unique, never-reassigned identifier for the user (e.g., a database UUID). |
| **`aud`** | Audience | The specific Client ID for which this token was intended. |
| **`exp`** | Expiration Time | The timestamp after which the ID Token must not be accepted. |
| **`iat`** | Issued At | The timestamp of when the token was generated. |

By validating the cryptographic signature of the ID Token and checking these claims, the client application can securely log the user in, knowing exactly who they are, when they authenticated, and that the token was explicitly intended for that specific app.

### The UserInfo Endpoint

While an ID Token can contain profile information like the user's name or email address, stuffing too many claims into the token can bloat its size, leading to performance issues and HTTP header truncation.

To keep the ID Token lightweight, OIDC defines a standardized REST endpoint hosted by the Authorization Server called the **UserInfo Endpoint**.

Once the client application possesses a valid Access Token resulting from an OIDC flow, it can make a simple `GET` request to the UserInfo endpoint to fetch additional, granular profile data about the user.

```text
Retrieving Profile Data via UserInfo:

1. Client              --- GET /userinfo -----------------------> OIDC Server
                           Authorization: Bearer <Access Token>

2. Client              <-- 200 OK ------------------------------- OIDC Server
                           {
                             "sub": "248289761001",
                             "name": "Jane Doe",
                             "email": "jane.doe@example.com",
                             "picture": "https://example.com/jane.jpg"
                           }

```

### OIDC Discovery

A major advantage of OIDC for API and SDK designers is its emphasis on automation and discoverability. OIDC mandates a configuration endpoint, typically located at `/.well-known/openid-configuration`.

This endpoint returns a JSON document containing all the metadata a client needs to interact with the identity provider, including the URLs for the authorization and token endpoints, supported scopes, and the location of the public keys required to verify the ID Token's signature. This allows modern API gateways and client libraries to self-configure simply by being provided the issuer's base URL, vastly improving the developer experience.

## 16.4 The Mechanics of JSON Web Tokens (JWT)

In previous sections, we established that OAuth 2.0 and OpenID Connect rely heavily on tokens to communicate authorization grants and identity assertions. While these frameworks do not strictly mandate a specific token format for Access Tokens, the industry has almost universally standardized on the JSON Web Token (JWT, pronounced "jot"), defined in RFC 7519.

A JWT is a compact, URL-safe means of representing claims to be transferred between two parties. Its defining characteristic—and the reason it is overwhelmingly favored in modern API architecture—is that it is **stateless and self-contained**. An API can verify a user's permissions simply by examining the token itself, without needing to make a synchronous network call back to a central database or Authorization Server.

### The Three-Part Structure of a JWT

If you decode a JWT, you will see that it is always represented as a single string divided into three distinct sections, separated by periods (`.`):

```text
Header.Payload.Signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

```

Each section serves a specific cryptographic and informational purpose. The first two parts are Base64Url-encoded JSON objects, while the third is the cryptographic signature.

#### 1. The Header

The header typically consists of two parts: the type of the token (which is `JWT`) and the signing algorithm being used, such as HMAC SHA256 (`HS256`) or RSA (`RS256`).

```json
{
  "alg": "RS256",
  "typ": "JWT"
}

```

This JSON object is Base64Url-encoded to form the first part of the JWT.

#### 2. The Payload (Claims)

The payload contains the **claims**—statements about an entity (typically, the user) and additional metadata. Claims are divided into three classifications:

* **Registered (Standard) Claims:** These are predefined claims recommended by the specification to provide a set of useful, interoperable assertions.
* `iss` (Issuer): Who created and signed the token.
* `sub` (Subject): Whom the token refers to (e.g., User ID).
* `aud` (Audience): Who the token is intended for (e.g., your API's identifier).
* `exp` (Expiration Time): The exact timestamp when the token becomes invalid.
* `iat` (Issued At): When the token was created.

* **Public Claims:** These can be defined at will by those using JWTs, but to avoid collisions, they should be defined in the IANA JSON Web Token Registry or be formatted as collision-resistant URIs.
* **Private Claims:** Custom claims created to share information specific to your system, such as `tenant_id`, `roles`, or `permissions`.

```json
{
  "sub": "user_98765",
  "name": "Jane API Developer",
  "roles": ["admin", "editor"],
  "exp": 1716382000
}

```

This JSON object is Base64Url-encoded to form the second part of the JWT.

> **Crucial Security Warning:** Base64Url encoding is *not* encryption. Anyone who intercepts a JWT can easily decode the header and payload and read the contents in plain text. You must **never** put sensitive information, such as passwords, Social Security Numbers, or internal system secrets, inside a standard JWT payload.

#### 3. The Signature

The signature is what makes the JWT trustworthy. It guarantees that the token has not been tampered with in transit. If a malicious user intercepts a JWT and changes their `"roles": ["user"]` claim to `"roles": ["admin"]`, the signature validation will fail, and the API will reject the token.

To create the signature, the issuer takes the encoded header, the encoded payload, a secret key, and the algorithm specified in the header, and signs them together.

```text
RS256 Signature Generation Pseudo-code:

data = base64UrlEncode(header) + "." + base64UrlEncode(payload)
signature = RSASign(data, private_key)

```

### Symmetric vs. Asymmetric Signing

API designers must choose between two primary paradigms for signing JWTs:

1. **Symmetric Cryptography (HS256):** The same secret key is used to both sign the token and validate the token.

* *Pros:* Fast and computationally cheap.
* *Cons:* Every microservice or API gateway that needs to validate the token must possess the secret key. If one service is compromised, the attacker can use the secret to forge valid tokens for the entire system.

1. **Asymmetric Cryptography (RS256 / ES256):** Uses a public/private key pair. The Authorization Server uses the **private key** to sign the token. The APIs (Resource Servers) use the **public key** to validate the signature.

* *Pros:* Highly secure and scalable. Microservices only need the public key, which cannot be used to forge tokens. Public keys can be safely distributed via a `.well-known/jwks.json` endpoint.
* *Cons:* Slightly more computationally intensive, though usually negligible in modern systems.

**Best Practice:** Modern, distributed API architectures should almost exclusively use asymmetric algorithms (like RS256 or ES256) to ensure the integrity of the token minting process.

### The Stateless Validation Flow

When an API receives a JWT in the `Authorization: Bearer` header, it must perform a strict sequence of checks before granting access to the requested resource:

1. **Format Check:** Does the token have three parts separated by periods?
2. **Signature Verification:** Using the public key of the trusted issuer, does the signature cryptographically match the header and payload?
3. **Algorithm Verification:** Is the `alg` header exactly what the API expects? (This prevents the infamous `alg: none` downgrade attack).
4. **Issuer & Audience Verification:** Does the `iss` claim match the expected Authorization Server? Does the `aud` claim match this specific API?
5. **Expiration Check:** Is the current server time strictly before the `exp` timestamp?

```text
Stateless API Request Flow:

+--------+                                 +-----------------------+
|        |-- GET /v1/orders               >|     Order API         |
| Client |   Authorization: Bearer <JWT>   |                       |
|        |                                 | 1. Verify Signature   |
|        |<-- 200 OK (Data) ---------------| 2. Check Expiration   |
+--------+                                 | 3. Check Scopes/Roles |
                                           | 4. Return Data        |
                                           +-----------------------+
                             *(No call to Auth Server required!)*

```

### The Invalidation Dilemma

The greatest strength of a JWT—its statelessness—is also its greatest architectural challenge. Because the API validates the token locally without checking a central database, **a JWT cannot be easily revoked before it expires.**

If a user's account is compromised, or an employee is terminated, their active JWT remains valid until the `exp` timestamp is reached. API designers mitigate this through two primary strategies:

1. **Short Lifespans:** Keep Access Token lifespans incredibly short (e.g., 5 to 15 minutes). The client application relies on the Refresh Token (which *is* stateful and can be revoked by the Auth Server) to frequently request new JWTs.
2. **Denylists (Blocklists):** For highly sensitive endpoints, the API Gateway can maintain a distributed, low-latency cache (like Redis) of revoked token IDs (`jti` claim). The API checks this cache during validation. While this introduces state, it bridges the gap between performance and absolute security.

## 16.5 Designing Role-Based Access Control (RBAC) and Scopes

Up to this point, we have explored how to verify identity (Authentication via OIDC) and how to securely transmit access grants (OAuth 2.0 and JWTs). However, once a valid, authenticated request reaches your API, the most complex question remains: *Is this specific user allowed to perform this specific action on this specific resource?*

This is the domain of Authorization. To build scalable and maintainable APIs, designers must distinguish between delegated access (Scopes) and intrinsic user permissions (Roles), and implement a robust framework for evaluating them.

### The Great Confusion: Scopes vs. Roles

One of the most common anti-patterns in API security is conflating OAuth 2.0 scopes with user roles. Understanding the conceptual difference is critical:

* **Scopes represent Delegation (Client Authority):** A scope answers the question, "What did the user allow this *application* to do?" For example, a user might grant a third-party analytics app the `read:metrics` scope, but deny it the `write:metrics` scope.
* **Roles represent Identity Permissions (User Authority):** A role answers the question, "What is this *user* inherently allowed to do within the system?" For example, the user might be an `Admin`, an `Editor`, or a `Viewer`.

**The Intersection:** An API request is only authorized if **both** conditions are met. The user must have the internal role required to perform the action, *and* they must have granted the client application the scope to perform that action on their behalf.

If a user is only a `Viewer` in your system, granting a client application a `write:data` scope does not magically grant the user write privileges. The API must evaluate the intersection of the token's scope and the user's role, enforcing the principle of least privilege.

### Foundations of Role-Based Access Control (RBAC)

Role-Based Access Control (RBAC) is the industry-standard paradigm for managing internal permissions. Instead of assigning permissions directly to users (which becomes an administrative nightmare at scale), permissions are assigned to Roles, and Users are assigned to those Roles.

```text
The RBAC Entity Relationship:

+-----------+        +-------------+        +----------------+
|           |   N:M  |             |   M:N  |                |
|   Users   | <----> |    Roles    | <----> |  Permissions   |
|           |        |             |        |                |
+-----------+        +-------------+        +----------------+
  Alice                Admin                  create_user
  Bob                  Editor                 delete_user
  Charlie              Viewer                 read_document
                                              update_document

```

In this model, if you want to allow Editors to publish articles, you simply add the `publish_article` permission to the `Editor` role. Every user assigned to that role immediately inherits the new permission, requiring zero data migration or individual user updates.

### Implementing RBAC in API Architecture

When designing how your API enforces RBAC, you must decide where the role data lives and how the API accesses it during a request. There are two primary architectural approaches:

#### 1. Token-Based RBAC (Stateless)

In this approach, the Authorization Server injects the user's roles directly into the JWT Access Token as a custom claim when the token is minted.

```json
{
  "sub": "user_12345",
  "aud": "https://api.example.com",
  "scopes": ["read:documents", "write:documents"],
  "roles": ["editor", "reviewer"],
  "exp": 1716382000
}

```

* **Advantages:** Extremely fast. The API controller can read the roles from the validated JWT and make an immediate authorization decision without querying a database.
* **Disadvantages:** Token bloat (if a user has dozens of roles). More importantly, it suffers from the invalidation dilemma discussed in Section 16.4; if a user is demoted from `Admin` to `Viewer`, they retain Admin privileges until their current JWT expires.

#### 2. API-Level RBAC (Stateful Lookup)

In this approach, the JWT only contains the user's unique identifier (`sub`). The API must query a database or a high-speed cache (like Redis) to fetch the user's current roles upon receiving the request.

* **Advantages:** Real-time accuracy. The moment an administrator revokes a role, the user loses access on their very next API call.
* **Disadvantages:** Increased latency and database load, as authorization requires a lookup for nearly every protected API request.

**Best Practice:** Use Token-Based RBAC for coarse-grained roles with short-lived access tokens (e.g., 5-10 minutes). Use Stateful Lookups for highly sensitive systems where immediate revocation is a strict compliance requirement.

### Enforcing Permissions at the Endpoint Level

Within your API's code (the controllers or routing layer), authorization checks should evaluate *permissions*, not *roles*.

**Anti-Pattern (Role-checking):**

```text
IF user.roles CONTAINS "Admin" OR user.roles CONTAINS "Editor":
    allow update_document()

```

This couples your business logic tightly to your role names. If you later create a `SuperEditor` role, you must update the code in every endpoint.

**Best Practice (Permission-checking):**

```text
IF user.permissions CONTAINS "document:update":
    allow update_document()

```

Here, the API middleware maps the user's roles to a flattened list of permissions before the request hits the controller. The controller only cares if the user has the `document:update` permission, regardless of which role granted it.

### Beyond RBAC: A Glimpse into Fine-Grained Authorization

While RBAC is sufficient for most APIs, it has a significant limitation: it lacks context.

RBAC can easily answer: *"Can this user edit documents?"*
It struggles to answer: *"Can this user edit **this specific** document?"*

If Alice and Bob are both `Editors`, RBAC says they both have the `document:update` permission. But if Alice created Document A, Bob shouldn't necessarily be able to edit it unless he is explicitly granted access to that specific resource.

Solving this requires moving from RBAC to **Attribute-Based Access Control (ABAC)** or **Relationship-Based Access Control (ReBAC)**. These paradigms evaluate attributes of the user, the resource, and the environment (e.g., "User is the Owner of the Resource" or "Request is originating from a corporate IP address"). While implementing ABAC requires complex policy engines (like Open Policy Agent) or graph databases (like Google Zanzibar), API designers should structure their resources and URIs (Chapter 8) cleanly from the beginning to ensure smooth migration to these fine-grained authorization models as the system matures.
