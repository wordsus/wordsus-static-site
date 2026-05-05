VictoriaMetrics is built for extreme performance, but production deployments require robust security to protect sensitive operational data. By default, open-source VictoriaMetrics prioritizes speed over built-in authentication, relying on network boundaries. 

This chapter explores how to secure your telemetry pipeline from end to end. We will cover encrypting inter-node traffic with mTLS, implementing token authentication via proxies, and leveraging `vmauth` for advanced multi-tenant Role-Based Access Control (RBAC). Finally, we will establish best practices for firewalls to ensure a resilient, zero-trust perimeter.

## 22.1 Securing Inter-Node Network Traffic with TLS

In a VictoriaMetrics cluster, components operate under a "shared-nothing" architecture where `vminsert` and `vmselect` nodes communicate extensively with `vmstorage` nodes to route data and execute queries. By default, this inter-node Remote Procedure Call (RPC) traffic is transmitted over unencrypted TCP connections. While acceptable for highly secure, isolated local networks, unencrypted traffic poses a significant security risk when deploying across availability zones, public clouds, or zero-trust environments.

Depending on whether you are using the Open-Source or Enterprise edition of VictoriaMetrics, securing this communication requires different operational strategies.

### Native mTLS in VictoriaMetrics Enterprise

The VictoriaMetrics Enterprise edition includes native, built-in support for mutual TLS (mTLS) across all cluster components. This approach encrypts the traffic directly at the application layer without requiring third-party sidecars. 

To enable native mTLS, you must generate your own Certificate Authority (CA), server certificates for the `vmstorage` nodes, and client certificates for the `vminsert` and `vmselect` nodes. 

**Configuring `vmstorage` (Server Side):**
The `vmstorage` nodes must be configured to listen for TLS connections and verify the client certificates coming from the ingestion and query layers. Apply the following command-line flags to your `vmstorage` instances:

```bash
# Enable TLS and provide the server certificate and key
-tls
-tlsCertFile=/path/to/server-cert.pem
-tlsKeyFile=/path/to/server-key.pem

# Require and verify client certificates against your CA
-tlsCAFile=/path/to/ca.pem

# (Optional) Restrict allowed cipher suites for enhanced security
-tlsCipherSuites=TLS_AES_128_GCM_SHA256,TLS_AES_256_GCM_SHA384
```

**Configuring `vminsert` and `vmselect` (Client Side):**
The stateless components must be instructed to use TLS when establishing connections to the underlying `vmstorage` nodes defined by the `-storageNode` flag. Apply these flags to `vminsert` and `vmselect`:

```bash
# Enable TLS for cluster connections to storage nodes
-cluster.tls

# Provide the client certificate and key for mTLS authentication
-cluster.tlsCertFile=/path/to/client-cert.pem
-cluster.tlsKeyFile=/path/to/client-key.pem

# Provide the CA file to verify the vmstorage node's certificate
-cluster.tlsCAFile=/path/to/ca.pem
```

*Note: For debugging purposes, the `-cluster.tlsInsecureSkipVerify` flag can be used on the client nodes to bypass certificate validation. This fundamentally compromises the security of the connection and should never be used in a production environment.*

### The Sidecar Proxy Approach (Open-Source Edition)

The Open-Source edition of VictoriaMetrics cluster does not natively support TLS for internal RPC communication. To secure inter-node traffic in the OSS version, you must implement a "sidecar" architecture using lightweight mTLS proxies such as **Ghostunnel**, **Envoy**, or **Nginx**.

In this architecture, the VictoriaMetrics components communicate locally via plaintext TCP with a proxy running on the same host (or within the same Kubernetes Pod). The proxy transparently handles the TLS handshake, encryption, and certificate validation across the network.

```text
  Host A (Ingestion Node)                       Host B (Storage Node)
+-------------------------+                   +-------------------------+
|                         |                   |                         |
|  +----------+           |      mTLS         |           +-----------+ |
|  | vminsert |           |    over WAN       |           | vmstorage | |
|  | (Client) |           | <===============> |           | (Server)  | |
|  +----------+           |                   |           +-----------+ |
|       |                 |                   |                 ^       |
|  [localhost:8400]       |                   |           [localhost:8400]|
|       v                 |                   |                 |       |
|  +--------------+       |                   |       +--------------+  |
|  | mTLS Proxy   |       |                   |       | mTLS Proxy   |  |
|  | (Sidecar)    |       |                   |       | (Sidecar)    |  |
|  +--------------+       |                   |       +--------------+  |
|                         |                   |                         |
+-------------------------+                   +-------------------------+
```

**Implementation Steps Using Ghostunnel:**
Ghostunnel is an excellent choice for this pattern as it is designed specifically to secure non-native TCP services.

1. **Storage Node (Server-side):** Start a Ghostunnel server to listen on the public network interface, require mutual authentication, and forward traffic to the local `vmstorage` instance (which defaults to port `8400` for `vminsert` connections).
   ```bash
   ghostunnel server \
     --listen 0.0.0.0:8443 \
     --target 127.0.0.1:8400 \
     --keystore server-cert.pem \
     --cacert ca.pem \
     --allow-all # In production, restrict by client certificate SAN/CN
   ```

2. **Insert/Select Node (Client-side):** Start a Ghostunnel client to listen locally and forward traffic over mTLS to the remote Storage Node.
   ```bash
   ghostunnel client \
     --listen 127.0.0.1:8400 \
     --target <vmstorage-host>:8443 \
     --keystore client-cert.pem \
     --cacert ca.pem
   ```

3. **Routing Configuration:** Finally, instruct `vminsert` to point to the local sidecar proxy instead of the remote node by setting the storage node flag to the local proxy interface: `-storageNode=127.0.0.1:8400`.

### Integration with Kubernetes

If your VictoriaMetrics cluster is deployed via Kubernetes (as covered in Chapter 19), implementing inter-node TLS is vastly simplified by the surrounding cloud-native ecosystem.

For **Enterprise users**, mTLS can be enabled seamlessly through the `VMCluster` Custom Resource Definition (CRD). The `vm-operator` interacts with the Enterprise binary flags automatically and can be paired with `cert-manager` to handle the generation, rotation, and distribution of certificates to all cluster pods using Kubernetes Secrets.

For **Open-Source users**, Kubernetes provides built-in mechanisms for transparent mTLS at the network level via a service mesh. Tools like **Istio** or **Linkerd** are the industry-standard approach here. By injecting service mesh sidecars into the `vminsert`, `vmselect`, and `vmstorage` pods, all inter-node traffic is automatically intercepted and encrypted. This achieves zero-trust network security without requiring a single configuration change to the VictoriaMetrics binaries or manual sidecar management.

## 22.2 Implementing Basic Auth and Bearer Tokens

By design, the core open-source VictoriaMetrics components (`vminsert`, `vmselect`, and `vmstorage`) do not natively enforce authentication on their primary data ingestion and query pathways. The architectural philosophy is to keep the TSDB layer strictly focused on performance and efficiency, delegating client authentication and network security to dedicated proxy infrastructure. 

To secure your primary data endpoints, you must place a reverse proxy in front of your cluster. However, VictoriaMetrics *does* provide native, lightweight token protection for its sensitive internal administrative endpoints.

---

### Securing Data Pathways with a Reverse Proxy

The industry-standard approach for adding Basic Authentication or Bearer Token validation to open-source VictoriaMetrics is deploying a robust reverse proxy like NGINX, HAProxy, or relying on a Kubernetes Ingress controller. 

#### 1. Basic Authentication via NGINX
Basic Auth requires clients to send a base64-encoded username and password combination. To implement this with NGINX, you first generate a password file using the `htpasswd` utility:

```bash
# Create an htpasswd file with a user named 'vm_writer'
htpasswd -c /etc/nginx/.htpasswd vm_writer
```

Next, configure your NGINX server block to intercept requests, validate the credentials against the `.htpasswd` file, and proxy successful requests to your VictoriaMetrics node (e.g., `vminsert` running on port 8480):

```nginx
server {
    listen 80;
    server_name metrics.example.com;

    location /insert/ {
        # Enforce Basic Authentication
        auth_basic "VictoriaMetrics Ingestion";
        auth_basic_user_file /etc/nginx/.htpasswd;

        # Proxy to the vminsert component
        proxy_pass http://localhost:8480;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 2. Bearer Token Authentication via NGINX
Bearer tokens are generally preferred over Basic Auth in modern deployments. They eliminate the need to pass passwords over the network, are easily rotated via CI/CD pipelines, and integrate natively with the Prometheus `remote_write` specification. 

You can configure NGINX to validate an `Authorization: Bearer <token>` header using the `map` directive for efficient token matching:

```nginx
http {
    # Map incoming Authorization headers to a validity integer
    map $http_authorization $is_valid_token {
        default 0;
        "Bearer super-secret-admin-token" 1;
        "Bearer super-secret-writer-token" 1;
    }

    server {
        listen 80;
        
        location / {
            # Reject requests without a valid mapped token
            if ($is_valid_token = 0) {
                return 401 "Unauthorized: Invalid Bearer Token\n";
            }
            
            proxy_pass http://localhost:8428;
        }
    }
}
```

---

### Native Authentication for Operational Endpoints

While the ingestion and querying pathways require an external proxy, VictoriaMetrics components contain sensitive internal endpoints that reveal cluster state or trigger heavy administrative operations. To protect these, VictoriaMetrics includes native, lightweight token authentication via **`*AuthKey` flags**. 

When one of these flags is configured, the component will reject requests to that specific endpoint unless the exact string is provided. The client can provide this token in one of two ways:
1. As an HTTP header: `Authorization: Bearer <your-key>`
2. As a URL query parameter: `?authKey=<your-key>`

| Command-Line Flag | Endpoint Protected | Purpose and Security Context |
| :--- | :--- | :--- |
| **`-metricsAuthKey`** | `/metrics` | Protects self-monitoring data scraped by Prometheus or `vmagent`. Prevents unauthorized actors from viewing internal cluster health and metrics. |
| **`-flagsAuthKey`** | `/flags` | Exposes the active command-line configuration. (Note: Known password flags are automatically redacted by VictoriaMetrics for safety). |
| **`-pprofAuthKey`** | `/debug/pprof/*` | Secures the Go profiling endpoints. Prevents attackers from triggering profiling operations that can spike CPU or analyzing memory patterns. |
| **`-forceFlushAuthKey`** | `/internal/force_flush` | Secures the endpoint that forces immediate flushing of in-memory buffers to disk. |
| **`-forceMergeAuthKey`** | `/internal/force_merge` | Protects the endpoint that triggers manual, highly expensive background data compaction operations. |

**Implementation Example:**
To secure the metrics endpoint on a `vmselect` node, launch the binary with the flag:

```bash
/path/to/vmselect -metricsAuthKey="secret-monitoring-token-987"
```

When configuring your `vmagent` or Prometheus to scrape this protected node, you simply append the `bearer_token` directive to the scrape job:

```yaml
scrape_configs:
  - job_name: 'vmselect-metrics'
    bearer_token: 'secret-monitoring-token-987'
    static_configs:
      - targets: ['vmselect-node-1:8481']
```

> **A Note on Scaling Auth:** While using NGINX for Basic Auth and native flags for operational endpoints works perfectly for single-node setups and simple clusters, standard reverse proxies lack an understanding of VictoriaMetrics' internal multi-tenant architecture (`AccountID` and `ProjectID`). For complex, multi-tenant environments requiring dynamic routing, VictoriaMetrics provides a specialized, built-in proxy tool designed precisely for this task: `vmauth`.

## 22.3 Introducing `vmauth` for Advanced Security

While standard reverse proxies like NGINX or HAProxy (as discussed in the previous section) are excellent for basic authentication, they lack a deep understanding of VictoriaMetrics' internal architecture. In a single-node deployment, simply passing traffic through is often sufficient. However, in a clustered, multi-tenant environment, traffic must be dynamically routed based on the user's identity, the type of request (read vs. write), and the specific tenant ID they are attempting to access.

To bridge this gap, the VictoriaMetrics toolchain includes **`vmauth`**: a lightweight, high-performance API gateway and authentication proxy built specifically for the VictoriaMetrics ecosystem.

### Why Choose `vmauth` Over a Standard Proxy?

`vmauth` serves as the intelligent front door to your cluster. It evaluates every incoming HTTP request and applies logic that standard proxies struggle to implement efficiently without complex scripting:

1.  **Multi-Tenant Routing:** It can map a simple Bearer token or Basic Auth credential to a specific `AccountID` and `ProjectID` in the cluster, completely hiding the multi-tenant URL structure from the end user.
2.  **Read/Write Separation:** It can inspect the request payload or URL path to determine if a query is a read (e.g., PromQL evaluation) or a write (e.g., `remote_write` ingestion) and route it to `vmselect` or `vminsert` accordingly.
3.  **Load Balancing and High Availability:** It can distribute requests across multiple backend nodes and automatically failover if a node becomes unresponsive.
4.  **Request Manipulation:** It can append or drop specific HTTP headers, or rewrite URL paths on the fly before passing the request to the backend.

### The `vmauth` Architecture

When deployed, `vmauth` sits between your clients (Prometheus, Grafana, user scripts) and the VictoriaMetrics cluster components. 

```text
                           +-------------------+
                           |                   | ---> http://vminsert:8480 (Tenant 1)
[Prometheus / vmagent] --> |      vmauth       | 
   (Token: writer1)        |   (API Gateway &  | ---> http://vminsert:8480 (Tenant 2)
                           |      Router)      |
[Grafana / VMUI] --------> |                   | ---> http://vmselect:8481 (Tenant 1)
   (Token: reader1)        +-------------------+
```

Clients simply send their data or queries to the `vmauth` endpoint, providing an authentication token. `vmauth` references a declarative configuration file to determine exactly where that request belongs.

### Configuring the Auth YAML

`vmauth` relies on a YAML configuration file (typically passed via the `-auth.config` flag) to define its routing and security rules. The configuration revolves around a list of `users`, where each user has an authentication credential and a designated `url_prefix` (or multiple routing rules) pointing to the backend.

Here is a foundational configuration demonstrating how to separate writers from readers, while mapping them to specific tenants:

```yaml
# auth_config.yml

# Global rule: what to do if a request has no valid token?
unauthorized_user:
  drop_requests: true

users:
  # ---------------------------------------------------------
  # User 1: A writer for Tenant 100
  # ---------------------------------------------------------
  - token: "super-secret-writer-token-t100"
    # All requests with this token are securely forwarded to vminsert for AccountID 100
    url_prefix: "http://vminsert-node:8480/insert/100/prometheus"

  # ---------------------------------------------------------
  # User 2: A reader (Grafana) for Tenant 100
  # ---------------------------------------------------------
  - token: "super-secret-reader-token-t100"
    # All requests with this token are securely forwarded to vmselect for AccountID 100
    url_prefix: "http://vmselect-node:8481/select/100/prometheus"

  # ---------------------------------------------------------
  # User 3: A global admin using Basic Auth
  # ---------------------------------------------------------
  - username: "admin"
    password: "secure-admin-password"
    # Using 'url_map' for advanced routing based on the request path
    url_map:
      - src_paths: ["/insert/.*"]
        url_prefix: "http://vminsert-node:8480"
      - src_paths: ["/select/.*"]
        url_prefix: "http://vmselect-node:8481"
```

### Understanding Path Appending

One of the most crucial concepts to grasp when using `vmauth` is how it handles the HTTP request paths. By default, `vmauth` takes the original path requested by the client and **appends** it to the `url_prefix` defined in the configuration.

For example, if Grafana sends a query to `vmauth` using the reader token from the config above:
*   **Client Request to `vmauth`:** `GET /api/v1/query?query=up`
*   **`vmauth` Translates to:** `GET http://vmselect-node:8481/select/100/prometheus/api/v1/query?query=up`

This mechanism allows Grafana to act as if it is communicating with a standard, non-clustered Prometheus instance. `vmauth` invisibly injects the complex `select/100/prometheus/` cluster routing path on the fly. 

### Hot Reloading Configurations

In a dynamic infrastructure, tokens and routing rules change frequently. You do not need to restart the `vmauth` process to apply updates to the `auth_config.yml` file. 

Whenever you modify the file, you can trigger a seamless hot-reload by sending a `SIGHUP` signal to the `vmauth` process, or by calling its internal reload endpoint:

```bash
curl -X POST http://vmauth-host:8427/-/reload
```

This ensures zero downtime for your metrics pipeline while rotating credentials or onboarding new tenants.

## 22.4 Routing and Role-Based Authorization with `vmauth`

Building on the basic routing capabilities of `vmauth`, we can implement advanced, enterprise-grade Role-Based Access Control (RBAC). In a mature VictoriaMetrics deployment, simply isolating tenants by `AccountID` is rarely enough. You will encounter scenarios where different teams need varying levels of access to the same tenant data: some services only need to write metrics, developers need to read metrics and build dashboards, and administrators need the ability to delete data or trigger cluster maintenance.

`vmauth` facilitates this granular control through complex URL mapping, request manipulation, and resource limiting.

### Granular Roles via `url_map`

The core mechanism for enforcing RBAC in `vmauth` is the `url_map` directive. By combining regular expressions with HTTP methods, you can strictly define which endpoints a specific token is allowed to access. 

If a request matches the user's token but fails to match any of the defined `src_paths` in their `url_map`, `vmauth` immediately drops the request and returns an `HTTP 403 Forbidden` error.

Here is an example of defining strict Writer, Reader, and Admin roles for a single tenant (Account 42):

```yaml
users:
  # ---------------------------------------------------------
  # ROLE: Write-Only (e.g., used by vmagent or Telegraf)
  # ---------------------------------------------------------
  - token: "writer-token-42"
    url_map:
      # Only allow POST requests to ingestion endpoints for Tenant 42
      - src_paths: 
          - "^/insert/42/prometheus/api/v1/write$"
          - "^/insert/42/influx/write$"
        src_methods: ["POST"]
        url_prefix: "http://vminsert-pool:8480"

  # ---------------------------------------------------------
  # ROLE: Read-Only (e.g., used by Grafana or Developers)
  # ---------------------------------------------------------
  - token: "reader-token-42"
    url_map:
      # Allow GET/POST but strictly limit to query and export endpoints
      - src_paths: 
          - "^/select/42/prometheus/api/v1/query.*$"
          - "^/select/42/prometheus/api/v1/labels.*$"
        url_prefix: "http://vmselect-pool:8481"

  # ---------------------------------------------------------
  # ROLE: Tenant Admin (Allows destructive actions)
  # ---------------------------------------------------------
  - token: "admin-token-42"
    url_map:
      # Allows all read/write paths, plus the time-series deletion API
      - src_paths: ["^/select/42/prometheus/api/v1/admin/tsdb/delete_series$"]
        url_prefix: "http://vmselect-pool:8481"
      - src_paths: [".*"]
        url_prefix: "http://vmcluster-gateway:8080"
```

### Row-Level Security: Enforcing Label Filters

One of the most powerful security features in the VictoriaMetrics ecosystem is the ability to enforce "row-level security" using the `extra_label` query parameter. 

Imagine a scenario where multiple teams share the same VictoriaMetrics tenant (e.g., `AccountID 100`), but you want to restrict the Frontend team so they can only query metrics containing the label `team="frontend"`. 

Instead of relying on the users to honestly add this label to their PromQL queries, `vmauth` can forcibly inject it into the request URL before forwarding it to `vmselect`. VictoriaMetrics will then silently append this label matcher to every query the user executes.

```yaml
users:
  - token: "frontend-team-token"
    url_map:
      - src_paths: ["/select/100/prometheus/.*"]
        url_prefix: "http://vmselect-pool:8481"
    # Forcibly inject URL parameters to all requests made by this user
    headers:
      - "Query-String-Append: extra_label=team=frontend"
      - "Query-String-Append: extra_label=environment=production"
```

If the Frontend team submits the query `sum(rate(http_requests_total[5m]))`, `vmauth` passes it to the cluster, which evaluates it as:
`sum(rate(http_requests_total{team="frontend", environment="production"}[5m]))`.

### Protecting the Cluster: Limits and Quotas

Security is not just about data privacy; it is also about protecting the cluster from noisy neighbors and Denial of Service (DoS) attacks. `vmauth` acts as a resource governor, allowing you to impose strict limits on a per-user basis.

You can configure rate limits (requests per second), concurrency limits, and even restrict the maximum allowed size of incoming payloads to prevent a single compromised service or heavy dashboard from overwhelming the storage nodes.

```yaml
users:
  - token: "untrusted-developer-token"
    # Limit to 10 HTTP requests per second
    max_reqs_per_sec: 10
    # Limit to 5 simultaneous active connections
    max_concurrent_reqs: 5
    # Drop any request payload larger than 2 Megabytes
    max_req_size: 2097152
    
    url_prefix: "http://vmselect-pool:8481/select/50/prometheus"
```

### Dynamic Routing with Regex Groups

Maintaining a massive configuration file for thousands of tenants is operationally burdensome. `vmauth` supports dynamic routing by capturing regular expression groups from the incoming request path or headers and using them to construct the destination `url_prefix`.

In this example, we capture the `AccountID` from the incoming URL and seamlessly route it to the correct backend pool, reducing hundreds of lines of YAML to a single dynamic rule:

```yaml
users:
  - token: "global-router-token"
    url_map:
      # Capture the AccountID (the numbers after /insert/) into group %1
      - src_paths: ["^/insert/([0-9]+)/prometheus/api/v1/write$"]
        # Use the captured group %1 to reconstruct the destination URL
        url_prefix: "http://vminsert-pool:8480/insert/%1/prometheus/api/v1/write"
```

By leveraging `url_map` for granular role definition, `extra_label` injection for row-level security, and quota parameters for cluster protection, `vmauth` transforms a standard VictoriaMetrics deployment into a secure, multi-tenant enterprise data platform.

## 22.5 Best Practices for Network Policies and Firewalls

Even with rigorous application-layer security like TLS and `vmauth` in place, a robust VictoriaMetrics deployment requires a "defense-in-depth" approach. Network-level security forms the foundational perimeter, ensuring that if an application vulnerability or misconfiguration occurs, the blast radius is strictly contained. 

Whether you are deploying on bare metal, virtual machines, or Kubernetes, you must implement strict network policies and firewalls based on the principle of least privilege.

### Understanding the Component Port Matrix

To build effective firewall rules, you must first understand the default ports used by the VictoriaMetrics ecosystem. A standard cluster deployment utilizes distinct ports for HTTP APIs and internal Remote Procedure Calls (RPC).

| Component | Default Port | Protocol | Purpose & Access Scope |
| :--- | :--- | :--- | :--- |
| **`vmauth`** | `8427` | HTTP | **Public / Trusted Internal:** The main gateway. Expose to Grafana, Prometheus, and external metric sources. |
| **`vminsert`** | `8480` | HTTP | **Restricted:** Expose *only* to `vmauth` or internal metric scrapers. |
| **`vmselect`** | `8481` | HTTP | **Restricted:** Expose *only* to `vmauth` or internal dashboard tools. |
| **`vmstorage`** | `8482` | HTTP | **Strictly Internal:** Used for `/metrics` scraping and snapshots. |
| **`vmstorage`** | `8400` | TCP (RPC) | **Strictly Internal:** Ingestion traffic. Allow inbound *only* from `vminsert` nodes. |
| **`vmstorage`** | `8401` | TCP (RPC) | **Strictly Internal:** Query traffic. Allow inbound *only* from `vmselect` nodes. |

### Perimeter Security: Subnets and Security Groups

When deploying VictoriaMetrics on cloud providers (AWS, GCP, Azure) or traditional Linux VMs, your primary defense is the Virtual Private Cloud (VPC) configuration and Security Groups (or `iptables`/`firewalld`).

**The Golden Rule:** Only `vmauth` should be exposed outside the private subnet. The core cluster nodes (`vminsert`, `vmselect`, `vmstorage`) must never have public IP addresses.

Here is the ideal traffic flow enforced by Security Groups:

```text
                               +-------------------+
[ External Network ]           |   Private Subnet  |
                               |                   |
  Grafana / Telegraf    =>     |     [ vmauth ]    | (Allows 8427 from anywhere/trusted IPs)
        |                      |       |     |     |
        x (DENY)               |       |     |     |
        |                      |    (8480) (8481)  |
        v                      |       v     v     |
 [ Core Cluster Nodes ] =======#=== [ vminsert ]   |
                               |    [ vmselect ]   |
                               |       |     |     |
                               |    (8400) (8401)  |
                               |       v     v     |
                               |    [ vmstorage ]  |
                               +-------------------+
```

**Implementation Checklist:**
1. **Drop Default Ingress:** Set the default inbound rule to `DENY` for all nodes.
2. **Whitelisting `vmauth`:** Allow port `8427` into the `vmauth` load balancer. If your metric producers (like external data centers) have static IPs, restrict this rule to those specific IP CIDR blocks.
3. **Internal Cluster Rules:** Create a dedicated Security Group for the cluster. Allow all TCP traffic on ports `8400`, `8401`, `8480`, `8481`, and `8482` *only* if the source is another instance within the exact same Security Group.
4. **Outbound Traffic (Egress):** `vmstorage` rarely needs outbound internet access unless interacting directly with S3/GCS for backups. Restrict outbound rules on storage nodes strictly to your cloud provider's API endpoints or an internal NAT gateway.

### Ring-Fencing with Kubernetes Network Policies

In a Kubernetes environment, all pods can typically communicate with all other pods by default. This is a massive security risk. If a front-end web application pod is compromised, the attacker can directly query the `vmselect` or `vmstorage` APIs on the internal cluster network.

To prevent this, you must deploy Kubernetes `NetworkPolicy` resources. Network Policies act as pod-level firewalls, utilizing labels to control traffic flow.

The following is a best-practice `NetworkPolicy` designed specifically for `vmstorage` nodes. It employs a "default deny" posture for the storage pods, explicitly opening RPC ports only to the ingestion and query layers.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-vmstorage-access
  namespace: monitoring
spec:
  # Apply this policy ONLY to pods labeled as vmstorage
  podSelector:
    matchLabels:
      app: vmstorage
  policyTypes:
    - Ingress
  ingress:
    # 1. Allow ingestion traffic (Port 8400) ONLY from vminsert pods
    - from:
        - podSelector:
            matchLabels:
              app: vminsert
      ports:
        - protocol: TCP
          port: 8400
          
    # 2. Allow query traffic (Port 8401) ONLY from vmselect pods
    - from:
        - podSelector:
            matchLabels:
              app: vmselect
      ports:
        - protocol: TCP
          port: 8401

    # 3. Allow internal monitoring/scraping (Port 8482) ONLY from Prometheus/vmagent
    - from:
        - podSelector:
            matchLabels:
              app: vmagent
      ports:
        - protocol: TCP
          port: 8482
```

By applying complementary policies to `vminsert` (allowing traffic only from `vmauth`) and `vmselect` (allowing traffic only from `vmauth`), you create a zero-trust microsegmentation within your Kubernetes cluster. Even if a bad actor breaches the cluster boundary, the lateral movement required to access raw historical time-series data is severely restricted.