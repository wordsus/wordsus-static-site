Telemetry pipelines process highly sensitive data. Traces, metrics, and logs frequently capture PII, tokens, and proprietary queries, meaning the OpenTelemetry pipeline cannot be treated as inherently trusted. This chapter pivots from data collection to data protection. We will explore how to implement zero-trust observability architectures by enforcing strict network encryption (mTLS), application-level authentication (OIDC), pipeline role-based access control (RBAC), and compliance mechanisms to ensure your data remains secure, private, and auditable.

## 17.1 Encrypting OTLP Traffic with TLS and mTLS

Telemetry data is rarely just innocuous metadata. Distributed traces, metrics, and logs frequently capture highly sensitive information, including user identifiers, database queries, and HTTP headers. Transmitting this data in plaintext exposes your observability pipeline to eavesdropping and man-in-the-middle (MitM) attacks. To secure the telemetry pipeline, Transport Layer Security (TLS) must be applied to all OpenTelemetry Protocol (OTLP) communications, particularly when data crosses network boundaries such as the public internet or untrusted virtual private clouds (VPCs).

While standard TLS ensures that the client (an application SDK or an Agent Collector) can verify the identity of the server (a Gateway Collector or a vendor backend) and encrypt the payload, **Mutual TLS (mTLS)** takes security a step further. In an mTLS setup, both the client and the server authenticate each other using cryptographic certificates. This is a foundational requirement for zero-trust architectures.

### The Agent-to-Gateway Security Model

In an enterprise deployment, telemetry typically originates from application SDKs, travels to a local Agent Collector (running as a sidecar or DaemonSet), and is then forwarded to a centralized Gateway Collector. 

Because the SDK-to-Agent hop usually happens over a trusted local interface (e.g., `localhost` or a Unix domain socket), it is often left unencrypted to reduce overhead. However, the Agent-to-Gateway hop traverses the broader network and must be secured.

```text
+-------------------+                          +---------------------+
|   Compute Node    |                          |    Gateway Node     |
|                   |                          |                     |
|  +-------------+  |       Encrypted &        |  +---------------+  |
|  | Application |  |      Authenticated       |  |   Collector   |  |
|  |    (SDK)    |--|--[ plaintext ]--+        |  |   (Gateway)   |  |
|  +-------------+  |                 |        |  +-------+-------+  |
|                   |                 v        |          ^          |
|                   |        +----------------+|          |          |
|                   |        |   Collector    ||==== mTLS ====       |
|                   |        |    (Agent)     ||          |          |
|                   |        +----------------+|          |          |
+-------------------+                          +---------------------+
                                                          |
                                                          v
                                               +---------------------+
                                               | Observability Backend|
                                               +---------------------+
```

### Configuring Standard TLS (Server-Side Encryption)

To enable standard TLS, the receiving Collector must be configured with a valid X.509 certificate and its corresponding private key. The OpenTelemetry Collector handles TLS via the `configtls` shared package, meaning the configuration block is consistent across most receivers and exporters.

Here is how you configure the `otlp` receiver on a Gateway Collector to accept standard TLS connections:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /etc/ssl/certs/otel-gateway.crt
          key_file: /etc/ssl/private/otel-gateway.key
      http:
        endpoint: "0.0.0.0:4318"
        tls:
          cert_file: /etc/ssl/certs/otel-gateway.crt
          key_file: /etc/ssl/private/otel-gateway.key
```

On the client side (the Agent Collector exporting data), you must ensure it trusts the certificate presented by the Gateway. If the Gateway uses a certificate signed by a globally trusted Certificate Authority (CA), the Agent will trust it by default. If you are using a private internal CA, you must provide the CA certificate to the exporter:

```yaml
exporters:
  otlp:
    endpoint: "otel-gateway.internal.example.com:4317"
    tls:
      insecure: false
      ca_file: /etc/ssl/certs/internal-ca.crt
```

> **Warning:** The `insecure_skip_verify: true` parameter bypasses certificate validation entirely. While tempting to use in development environments to bypass self-signed certificate errors, it entirely defeats the purpose of TLS by leaving the connection vulnerable to MitM attacks. It should never be used in production.

### Implementing Mutual TLS (mTLS)

To upgrade from standard TLS to mTLS, the server (Gateway) must be configured to *require* and *verify* a certificate from the connecting client (Agent). Conversely, the client must be configured to present a valid certificate during the TLS handshake.

#### 1. The Gateway Collector (Server) Configuration

The Gateway's `otlp` receiver must specify a `client_ca_file`. This tells the server which Certificate Authority it should use to validate the incoming client certificates. We must also explicitly set the connection to require client certificates.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /etc/ssl/certs/otel-gateway.crt
          key_file: /etc/ssl/private/otel-gateway.key
          # mTLS specific configuration below:
          client_ca_file: /etc/ssl/certs/internal-ca.crt
          require_client_cert: true
```

#### 2. The Agent Collector (Client) Configuration

The Agent's `otlp` exporter must now point to its own certificate and private key, which it will present to the Gateway to prove its identity.

```yaml
exporters:
  otlp/mtls:
    endpoint: "otel-gateway.internal.example.com:4317"
    tls:
      insecure: false
      ca_file: /etc/ssl/certs/internal-ca.crt
      # mTLS specific configuration below:
      cert_file: /etc/ssl/certs/otel-agent.crt
      key_file: /etc/ssl/private/otel-agent.key
```

### TLS Configuration Reference

The following table details the most critical configuration parameters available within the `tls` block across both receivers and exporters:

| Parameter | Type | Context | Description |
| :--- | :--- | :--- | :--- |
| `cert_file` | Path | Both | Path to the TLS certificate file. Required on the server for TLS; required on the client for mTLS. |
| `key_file` | Path | Both | Path to the private key associated with the `cert_file`. |
| `ca_file` | Path | Client | Path to the CA certificate used by the client to verify the server's certificate. |
| `client_ca_file` | Path | Server | Path to the CA certificate used by the server to verify the client's certificate (Enables mTLS). |
| `require_client_cert` | Boolean | Server | If `true`, the server forces the client to present a valid certificate. Defaults to `false`. |
| `insecure` | Boolean | Client | If `true`, disables TLS entirely (plaintext communication). Defaults to `false` for gRPC exporters. |
| `insecure_skip_verify`| Boolean | Client | If `true`, encrypts traffic but ignores server certificate validation (vulnerable to MitM). |
| `include_system_roots`| Boolean | Client | If `true`, loads the operating system's default trusted CA root certificates. Defaults to `false`. |

### Dynamic Certificate Reloading

A common operational challenge with TLS is certificate expiration and rotation. Historically, rotating certificates required restarting the Collector process, which could lead to dropped telemetry if not carefully orchestrated with load balancers.

Modern versions of the OpenTelemetry Collector support dynamic reloading of certificates. When you provide file paths via `cert_file` and `key_file`, the Collector automatically watches these files for changes. If a configuration management tool (like Chef, Puppet, or Kubernetes cert-manager) updates the certificate and key on the disk, the Collector will transparently load the new cryptographic material for subsequent connections without requiring a process restart. Ensure that the updated files are written atomically (e.g., via symlink swapping) to prevent the Collector from reading a partial or mismatched certificate pair during the rotation window.

## 17.2 Implementing Authentication Mechanisms (Bearer Tokens, OIDC)

While mTLS (discussed in Section 17.1) provides excellent node-to-node security by verifying the cryptographic identity of the communicating machines, it does not inherently understand application-level identity or multi-tenancy. In large-scale enterprise environments, you often need to know *which* team, application, or tenant is sending telemetry to enforce rate limits, apply routing rules, or drop unauthorized traffic. This is where application-level authentication mechanisms, such as Bearer Tokens and OpenID Connect (OIDC), become essential.

In the OpenTelemetry Collector, authentication is decoupled from the receivers and exporters. It is handled via **Extensions**. You configure an authentication extension to define the logic, and then you attach that extension to specific receivers (to validate incoming data) or exporters (to authenticate outgoing data).

```text
+----------------+       [ OTLP + Auth Header ]       +-----------------------------+
| Telemetry      | ---------------------------------> |   OTel Collector (Gateway)  |
| Source         |    Authorization: Bearer <JWT>     |                             |
| (SDK or Agent) |                                    |   +---------------------+   |
+----------------+                                    |   | Receiver (e.g. otlp)|   |
                                                      |   +----------+----------+   |
                                                      |              | (Intercepts) |
                                                      |   +----------v----------+   |
                                                      |   |   Auth Extension    |   |
                                                      |   |   (Bearer / OIDC)   |   |
                                                      |   +----------+----------+   |
                                                      |              | (Validates)  |
                                                      |   +----------v----------+   |
                                                      |   |   Pipeline Process  |   |
                                                      +-----------------------------+
```

### Server-Side Authentication: Validating Incoming Telemetry

When operating a centralized Collector Gateway, you must ensure that only authorized agents or applications can ingest data.

#### Static Bearer Tokens
The simplest form of application-level authentication is the static bearer token. In this model, the client sends a pre-shared secret in the HTTP `Authorization` header. While easy to implement, static tokens carry the risk of being compromised and are notoriously difficult to rotate across hundreds of microservices without downtime.

To implement this, you use the `bearertokenauth` extension. You can provide a hardcoded list of valid tokens, or point the extension to a file on disk that contains the tokens (which allows for easier rotation via external configuration management).

```yaml
extensions:
  bearertokenauth:
    # In production, prefer loading this from an environment variable or secure file
    filename: /etc/otel/valid_tokens.txt

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        auth:
          authenticator: bearertokenauth
      http:
        endpoint: "0.0.0.0:4318"
        auth:
          authenticator: bearertokenauth

service:
  extensions: [bearertokenauth]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging]
```

*Note: The `auth` block inside the receiver configuration is what ties the receiver's inbound requests to the specified authenticator extension.*

#### OpenID Connect (OIDC) / OAuth2
For enterprise environments, OIDC provides a significantly more secure and dynamic approach. Instead of static secrets, clients obtain short-lived JSON Web Tokens (JWTs) from an Identity Provider (IdP) like Okta, Auth0, or Keycloak. The Collector intercepts the incoming request, parses the JWT, verifies its cryptographic signature against the IdP's public keys, and validates claims such as the token's audience (`aud`) and issuer (`iss`).

To configure OIDC, you utilize the `oidc` extension. The Collector will automatically fetch the necessary JSON Web Key Sets (JWKS) from the IdP's discovery URL to validate the signatures.

```yaml
extensions:
  oidc:
    issuer_url: "https://identity.internal.example.com/oauth2/default"
    audience: "otel-gateway"
    # Optional: Extract specific claims to append as resource attributes
    username_claim: "client_id" 
    groups_claim: "groups"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        auth:
          authenticator: oidc

service:
  extensions: [oidc]
  # ... pipeline configuration ...
```

By configuring `username_claim` or `groups_claim`, the Collector can automatically inject the authenticated identity into the telemetry payload as Resource Attributes. This creates a highly trusted, tamper-proof mechanism for attributing telemetry to specific teams or environments, bypassing the need to trust the application SDK to self-report its identity accurately.

### Client-Side Authentication: Exporting to Secured Backends

Authentication is a two-way street. Just as your Gateway Collector must authenticate incoming data, it must also authenticate itself when forwarding data to an observability vendor (like Datadog, Honeycomb, or Grafana Cloud) or a secured internal backend.

Exporters use a similar extension mechanism, but the extensions are designed to *attach* credentials rather than validate them. 

#### Attaching Static Tokens
If your observability vendor provides a static API key, you use the `bearertokenauth` extension configured in client mode, or the more standard `headers` configuration available directly on many exporters.

Using the `bearertokenauth` client extension:

```yaml
extensions:
  bearertokenauth/client:
    token: "${env:VENDOR_API_KEY}"

exporters:
  otlp/vendor:
    endpoint: "api.vendor.example.com:4317"
    auth:
      authenticator: bearertokenauth/client

service:
  extensions: [bearertokenauth/client]
  # ...
```

Alternatively, injecting the header directly in the exporter (often simpler for vendor API keys):

```yaml
exporters:
  otlp/vendor:
    endpoint: "api.vendor.example.com:4317"
    headers:
      "x-vendor-api-key": "${env:VENDOR_API_KEY}"
```

#### Utilizing OAuth2 Client Credentials
If your backend requires dynamic OAuth2 authentication (common in strict zero-trust architectures), the Collector can act as an OAuth2 client. It will automatically negotiate with the IdP, obtain a short-lived access token, attach it to outgoing telemetry, and refresh the token automatically before it expires.

This requires the `oauth2client` extension:

```yaml
extensions:
  oauth2client:
    client_id: "${env:OAUTH_CLIENT_ID}"
    client_secret: "${env:OAUTH_CLIENT_SECRET}"
    token_url: "https://identity.internal.example.com/oauth2/token"
    scopes: ["telemetry:write"]

exporters:
  otlp/secure_backend:
    endpoint: "secure-backend.internal.example.com:4317"
    auth:
      authenticator: oauth2client

service:
  extensions: [oauth2client]
  # ...
```

### The Crucial Intersection of Authentication and Encryption

It is imperative to understand that Bearer Tokens and JWTs are essentially passwords. If intercepted, they can be replayed by malicious actors to flood your pipelines, incur massive vendor overages, or inject false telemetry data to mask a concurrent attack.

**Authentication mechanisms must never be deployed in isolation.** They are dependent on the transport layer security discussed in Section 17.1. Whether you are using static tokens or dynamic OIDC JWTs, the traffic must be encrypted via standard TLS to ensure the token remains confidential during transit. In a highly secure environment, mTLS and OIDC are often deployed together—mTLS verifies the machine, while OIDC verifies the application identity and its authorization scope.

## 17.3 Establishing Role-Based Access Control (RBAC)

While authentication (Section 17.2) verifies the identity of the client sending or receiving telemetry, authorization determines what that authenticated identity is permitted to do. In the context of observability, Role-Based Access Control (RBAC) is typically associated with the backend platform (e.g., controlling which engineers can view specific Grafana dashboards or Datadog indexes). However, enforcing RBAC at the **pipeline level**—within the OpenTelemetry Collector—is a critical security frontier.

Pipeline-level RBAC ensures that a compromised microservice cannot flood the pipeline with garbage data, overwrite telemetry belonging to another tenant, or exfiltrate sensitive metrics by routing them to unauthorized destinations.

### The Pipeline Authorization Model

The OpenTelemetry Collector does not feature a monolithic "RBAC Engine." Instead, authorization is an emergent property achieved by combining three distinct pipeline components:

1.  **Authentication Extensions:** Validate the token and extract identity claims (roles, groups, tenant IDs) into the request context.
2.  **Context Propagators / Receivers:** Map these transient identity claims onto the telemetry data itself (typically as Resource Attributes).
3.  **Processors and Connectors:** Evaluate the attributes using the OpenTelemetry Transformation Language (OTTL) to filter, drop, or route the data accordingly.

```text
  Incoming Telemetry + JWT: { "sub": "payment-api", "group": "tier-1" }
                               |
                               v
+-----------------------------------------------------------------------+
|                       OpenTelemetry Collector                         |
|                                                                       |
|  1. Auth Extension                                                    |
|     (Validates JWT signature, extracts "group" claim)                 |
|                               |                                       |
|  2. Receiver / Transform Processor                                    |
|     (Injects "auth.group" = "tier-1" as a Resource Attribute)         |
|                               |                                       |
|  3. Routing Connector / Filter Processor                              |
|     (Evaluates OTTL logic against "auth.group")                       |
|        /                                   \                          |
+-------/-------------------------------------\-------------------------+
       /                                       \
[ Allowed: Matches Policy ]             [ Denied: Fails Policy ]
      v                                         v
+---------------+                       +---------------+
| High-Priority |                       | Dropped Telemetry|
| Exporter Sink |                       | (Logged/Discarded)|
+---------------+                       +---------------+
```

### Implementing Multi-Tenant Isolation via Routing

A common RBAC use case is enforcing multi-tenancy. If you operate a shared Gateway Collector for multiple internal teams or external customers, you must ensure that telemetry from `Team A` cannot be spoofed to look like it came from `Team B`.

Once an OIDC or Bearer Token extension authenticates the payload, you can use the **Routing Connector** to isolate traffic based on headers or injected attributes.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        auth:
          authenticator: oidc_auth

connectors:
  routing/team_isolation:
    default_pipelines: [traces/unauthorized]
    error_mode: ignore
    match_once: true
    table:
      # Route telemetry to Team A's pipeline if the auth context matches
      - statement: route() where resource.attributes["tenant_id"] == "team-a"
        pipelines: [traces/team_a_sink]
      # Route telemetry to Team B's pipeline
      - statement: route() where resource.attributes["tenant_id"] == "team-b"
        pipelines: [traces/team_b_sink]

pipelines:
  traces/ingress:
    receivers: [otlp]
    exporters: [routing/team_isolation]
  
  traces/team_a_sink:
    receivers: [routing/team_isolation]
    processors: [batch]
    exporters: [otlp/team_a_backend]

  traces/unauthorized:
    receivers: [routing/team_isolation]
    exporters: [logging/security_audit]
```

### Restricting Access to Sensitive Data

Another critical application of pipeline RBAC is preventing unauthorized applications from logging highly sensitive events or modifying reserved resource attributes. 

Using the **Filter Processor** and OTTL, you can establish policies that drop telemetry if the authenticated role does not possess the required permissions. For example, you may want to ensure that only services explicitly tagged with the `pci-compliant` role are allowed to send spans containing payment processing metadata.

```yaml
processors:
  filter/pci_enforcement:
    error_mode: ignore
    traces:
      span:
        # Drop the span if it contains a 'credit_card' attribute 
        # BUT the sender's auth role is NOT 'pci-compliant'
        - 'attributes["payment.credit_card"] != nil and resource.attributes["auth.role"] != "pci-compliant"'
```

### Securing Collector Administrative Endpoints

RBAC is not limited to the ingestion and exportation of OTLP payloads; it must also be applied to the Collector's own administrative surfaces. The Collector exposes several internal endpoints that can leak infrastructure topology or allow for denial-of-service if left unprotected:

* **Self-Telemetry (`metrics`):** Often exposed on port `8888`. Contains detailed metrics about throughput, drops, and pipeline health.
* **Health Check (`health_check`):** Typically exposed on port `13133`.
* **zPages (`zpages`):** Usually on port `55679`. Exposes real-time tracing of the Collector's internal operations.
* **pprof (`pprof`):** Exposes Golang runtime profiling data, which can be resource-intensive to query and may leak memory state.

By default, these extensions do not require authentication. In a zero-trust environment, these ports should never be exposed to the broader network. Instead, you should enforce RBAC by binding these extensions exclusively to `localhost` (`127.0.0.1`) and using sidecar proxies (like Envoy) or Kubernetes RBAC (via `RoleBindings`) to strictly limit which users or automated scraping tools (like Prometheus) are authorized to query them.

```yaml
extensions:
  health_check:
    endpoint: "127.0.0.1:13133" # Bound strictly to localhost
  zpages:
    endpoint: "127.0.0.1:55679"
  pprof:
    endpoint: "127.0.0.1:1777"
```

## 17.4 Meeting Compliance, Auditing, and Data Residency Requirements

While encryption, authentication, and authorization secure your telemetry pipeline from malicious actors, enterprise organizations must also navigate a complex web of legal and regulatory frameworks. Regulations such as the General Data Protection Regulation (GDPR), the Health Insurance Portability and Accountability Act (HIPAA), and the Payment Card Industry Data Security Standard (PCI-DSS) dictate not just who can see your data, but where it can physically reside and how its handling is documented.

Because observability data (especially logs and trace attributes) often inadvertently captures Personally Identifiable Information (PII) or Protected Health Information (PHI), the OpenTelemetry Collector must be configured to act as a compliance enforcement checkpoint before data ever reaches a storage backend.

### Redacting and Masking Sensitive Data

The most critical compliance control within the Collector is data minimization: ensuring that sensitive information is scrubbed before it leaves your network boundaries. Relying on application developers to manually sanitize every log line or span attribute is error-prone. Instead, you should enforce redaction globally at the Gateway Collector.

Using the **Transform Processor** powered by the OpenTelemetry Transformation Language (OTTL), you can apply regular expressions to detect and mask sensitive patterns across traces, metrics, and logs.

```yaml
processors:
  transform/redact_pii:
    error_mode: ignore
    trace_statements:
      context: span
      statements:
        # Mask Credit Card Numbers in any string attribute
        - replace_pattern(attributes, "key", "value", "\\b(?:\\d[ -]*?){13,16}\\b", "****-****-****-****")
        
        # Hash specific user-identifying attributes completely
        - set(attributes["user.email"], SHA256(attributes["user.email"])) where attributes["user.email"] != nil
        
        # Drop restricted attributes entirely
        - delete_key(attributes, "patient.medical_record_number")

    log_statements:
      context: log
      statements:
        # Mask Social Security Numbers in the log body
        - replace_pattern(body, "\\b\\d{3}-\\d{2}-\\d{4}\\b", "***-**-****")
```

> **Note:** Redaction via regex processing is CPU-intensive. When applying these transformations at scale, you must closely monitor the Collector's CPU usage and scale your Gateway tier horizontally to handle the overhead.

### Enforcing Data Residency and Sovereignty

Data residency laws (such as those in the European Union or Canada) often require that data concerning a region's citizens physically remain within that region's borders. In a globally distributed microservices architecture, this presents a massive challenge: a centralized observability backend in `us-east-1` is no longer viable for all telemetry.

The OpenTelemetry Collector solves this through intelligent geo-routing. By tagging telemetry at the source (the Agent Collector) with a region attribute, a global routing Gateway can split the pipeline and forward data to region-specific compliance boundaries.

```text
                               +-------------------------+
                               | Global Routing Gateway  |
                               +------------+------------+
                                            |
           Evaluates resource.attributes["cloud.region"] via Routing Connector
                                            |
                  +-------------------------+-------------------------+
                  |                         |                         |
           [ region == "eu-*" ]     [ region == "us-*" ]      [ region == "ap-*" ]
                  |                         |                         |
                  v                         v                         v
        +-------------------+     +-------------------+     +-------------------+
        | EU Storage Region |     | US Storage Region |     | AP Storage Region |
        | (Frankfurt)       |     | (N. Virginia)     |     | (Tokyo)           |
        +-------------------+     +-------------------+     +-------------------+
```

To implement this, you utilize the `routing` connector combined with conditional pipelines. The telemetry never crosses the restricted geographic boundary if configured correctly.

```yaml
connectors:
  routing/data_residency:
    default_pipelines: [logs/us_storage] # Default fallback
    match_once: true
    table:
      - statement: route() where resource.attributes["cloud.region"] == "eu-central-1"
        pipelines: [logs/eu_storage]
      - statement: route() where resource.attributes["cloud.region"] == "eu-west-1"
        pipelines: [logs/eu_storage]

pipelines:
  logs/ingress:
    receivers: [otlp]
    exporters: [routing/data_residency]

  logs/eu_storage:
    receivers: [routing/data_residency]
    exporters: [otlp/frankfurt_backend]

  logs/us_storage:
    receivers: [routing/data_residency]
    exporters: [otlp/virginia_backend]
```

### Auditing the Observability Pipeline

Compliance frameworks like SOC2 require you to prove *how* your data is handled and alert on anomalies. The telemetry pipeline itself must be observable and auditable. 

#### 1. Tamper-Proof Audit Trails
Certain classes of logs—such as authentication failures, privilege escalations, or database schema changes—are too critical to be mixed with standard application logs. They must be routed to a secure, tamper-proof destination (like AWS S3 with Object Lock or a dedicated SIEM) where they cannot be modified or deleted by standard engineering roles.

You can achieve this by filtering based on a semantic convention like `event.name` or `log.level` and routing those specific events to an immutable storage exporter, bypassing your standard observability vendor.

#### 2. Collector Self-Auditing
To prove the pipeline has not been tampered with or misconfigured, the Collector’s internal logs and metrics must be aggregated and monitored. 

* **Configuration Drift:** Ensure that the checksum of the Collector's YAML configuration file is monitored. Any unauthorized change to the configuration (e.g., an attacker disabling the PII redaction processor) should trigger an immediate high-severity alert.
* **Pipeline Drops:** Monitor the `otelcol_processor_dropped_spans` and `otelcol_exporter_send_failed_requests` metrics. In a compliance context, silently dropping audit logs due to backpressure is a severe violation. You must configure persistent queuing (via the `sending_queue` configuration in exporters) to ensure telemetry survives temporary network outages or backend downtime.

```yaml
exporters:
  otlp/secure_audit:
    endpoint: "siem.internal.example.com:4317"
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
```

By combining strict OTTL redaction, attribute-based geographic routing, and resilient pipeline architectures, the OpenTelemetry Collector transforms from a simple data pipeline into a robust compliance enforcement engine.