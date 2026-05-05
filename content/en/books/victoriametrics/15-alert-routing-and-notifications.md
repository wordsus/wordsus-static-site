While `vmalert` excels at evaluating MetricsQL queries to detect anomalies, it is an evaluation engine, not a notification dispatcher. To route alerts to human operators, VictoriaMetrics relies on seamless integration with Prometheus Alertmanager. This chapter bridges the gap between a triggered rule and an actionable notification. We explore how to connect `vmalert` to external notifiers, deploy the Kubernetes-native `vmalertmanager`, and design intelligent routing trees. Finally, we cover essential strategies for reducing alert fatigue by implementing automated inhibition rules and time-bound silences.

## 15.1 Integration with Prometheus Alertmanager

While `vmalert` is highly efficient at evaluating complex MetricsQL expressions and determining when a system state breaches predefined thresholds, it intentionally does not handle the delivery of notifications (like sending emails, Slack messages, or PagerDuty pages). Following the Unix philosophy of doing one thing well, VictoriaMetrics delegates the responsibilities of deduplication, grouping, and notification routing to Prometheus Alertmanager. 

To bridge the gap between alert evaluation and human notification, `vmalert` implements the exact same notification push protocol as a standard Prometheus server. This makes `vmalert` a drop-in replacement; any existing Alertmanager infrastructure will accept alerts from `vmalert` seamlessly.

### The Integration Architecture

The communication between `vmalert` and Alertmanager is unidirectional. `vmalert` periodically evaluates rules, identifies active alerts, and pushes their state to Alertmanager via HTTP POST requests using the Alertmanager OpenAPI v2 specification.

```text
  +------------------+                              +-----------------------+
  |                  |      HTTP POST /api/v2/alerts    |                       |
  | VictoriaMetrics  | -------------------------------> | Prometheus            |
  | vmalert          |                                  | Alertmanager          |
  |                  | <------------------------------- |                       |
  +------------------+         HTTP 200 OK              +-----------------------+
          ^                                                         |
          |                                                         v
  Reads metrics from                                        Sends notifications to
  vmselect/vmstorage                                        Slack, Email, PagerDuty
```

### Configuring the Notifier Endpoint

To instruct `vmalert` to send triggered alerts to Alertmanager, you must provide the `-notifier.url` command-line flag. This flag expects the base HTTP or HTTPS URL of your Alertmanager instance.

```bash
vmalert \
  -rule="/etc/vmalert/rules/*.yml" \
  -datasource.url="http://vmselect:8481/select/0/prometheus" \
  -notifier.url="http://alertmanager:9093"
```

Once configured, `vmalert` will begin sending active alerts to Alertmanager. It sends these alerts upon initial activation and then continuously resends them at a regular interval (determined by the evaluation interval) for as long as the alert condition remains true. This constant pushing acts as a heartbeat; if Alertmanager stops receiving updates for a specific alert, it eventually considers the alert resolved.

### High Availability and Multiple Alertmanagers

In production environments, Alertmanager is typically deployed in a highly available (HA) cluster to prevent a single point of failure from dropping critical notifications. 

To integrate `vmalert` with an HA Alertmanager cluster, you pass the `-notifier.url` flag multiple times—once for each Alertmanager replica:

```bash
vmalert \
  -rule="/etc/vmalert/rules/*.yml" \
  -datasource.url="http://vmselect:8481/select/0/prometheus" \
  -notifier.url="http://alertmanager-01:9093" \
  -notifier.url="http://alertmanager-02:9093" \
  -notifier.url="http://alertmanager-03:9093"
```

**Crucial Operational Detail:** When multiple `-notifier.url` flags are provided, `vmalert` does *not* load balance between them. Instead, it pushes every active alert to **all** configured Alertmanager endpoints simultaneously. This is the intended design. Alertmanager relies on its own internal gossip protocol across its cluster nodes to deduplicate the incoming alerts before sending a single notification to the end user.

### Authentication and Security

If your Alertmanager instances are secured, `vmalert` provides several flags to handle authentication and encrypted communication. Because `vmalert` may need to connect to different notifiers with different security requirements, these flags apply to the endpoints defined by `-notifier.url`.

* **Basic Authentication:** Use `-notifier.basicAuth.username` and `-notifier.basicAuth.password` to pass standard HTTP Basic Auth credentials.
* **Bearer Tokens:** If Alertmanager sits behind an authenticating proxy (like `vmauth`) requiring a token, use `-notifier.bearerToken` or pass a file containing the token using `-notifier.bearerTokenFile`.
* **TLS Configuration:** To enforce secure connections or use custom certificates, utilize `-notifier.tlsCAFile`, `-notifier.tlsCertFile`, and `-notifier.tlsKeyFile`. If you are connecting to an internal endpoint with a self-signed certificate and wish to bypass validation, you can use `-notifier.tlsInsecureSkipVerify` (though this is not recommended for production).

### Understanding the Alert Payload

When an alert fires, `vmalert` translates the evaluated rule into a JSON payload formatted for Alertmanager's `api/v2/alerts` endpoint. Understanding this payload is essential for designing effective routing rules in Alertmanager (covered in Chapter 15.3).

Here is an example of the payload `vmalert` transmits:

```json
[
  {
    "labels": {
      "alertname": "HighCPUUsage",
      "severity": "critical",
      "instance": "node-01.example.com",
      "job": "node_exporter"
    },
    "annotations": {
      "summary": "High CPU usage detected on node-01.example.com",
      "description": "CPU usage has been above 90% for the last 5 minutes. Current value: 94.2%."
    },
    "startsAt": "2023-10-27T10:00:00Z",
    "endsAt": "2023-10-27T10:05:00Z",
    "generatorURL": "http://vmalert.example.com/vmalert/alert?group_id=...&alert_id=..."
  }
]
```

Key takeaways from the payload mapping:
1.  **Labels:** These dictate how Alertmanager groups, routes, and silences the alert. The labels include everything statically defined in the `vmalert` rule file, plus any dynamic labels inherited from the time series data that triggered the alert.
2.  **Annotations:** These provide the human-readable context. They are typically passed directly into your Slack templates or email bodies.
3.  **GeneratorURL:** `vmalert` automatically injects a link back to its own UI. This allows operators receiving the alert to click the link and immediately view the specific rule evaluation state in `vmalert` that triggered the notification.

## 15.2 Deploying and Configuring `vmalertmanager`

While `vmalert` evaluates rules and pushes them to a notification endpoint, you still need a highly available mechanism to route those alerts, deduplicate them, and send them to integrations like Slack, PagerDuty, or email. In a Kubernetes-native environment, VictoriaMetrics solves this via the `vmalertmanager` component.

It is important to understand that `vmalertmanager` is not a custom, rewritten notification engine; rather, it is a Custom Resource Definition (CRD) provided by the VictoriaMetrics Kubernetes Operator (`vm-operator`). It acts as a sophisticated declarative wrapper around the standard Prometheus Alertmanager, simplifying its deployment, scaling, and configuration lifecycle within Kubernetes.

### Deploying the VMAlertmanager CRD

When you apply a `VMAlertmanager` custom resource, the `vm-operator` automatically provisions a Kubernetes `StatefulSet` running the official Alertmanager image. It also attaches a sidecar container to track configuration changes and send hot-reload signals, ensuring that configuration updates do not require pod restarts.

Here is an example of a basic `VMAlertmanager` deployment:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlertmanager
metadata:
  name: main-alertmanager
  namespace: monitoring
spec:
  replicaCount: 3
  retention: "120h"
  # Select all VMAlertmanagerConfig objects cluster-wide
  selectAllByDefault: true 
  resources:
    requests:
      memory: 128Mi
      cpu: 100m
```

By simply setting `replicaCount: 3`, the operator takes care of the complex high-availability (HA) networking. It automatically configures the Alertmanager gossip protocol between the three replicas. When `vmalert` pushes an alert to this cluster, the replicas communicate with each other to guarantee that notifications are deduplicated and sent exactly once, even if a replica experiences a network partition.

### Decentralized Configuration with VMAlertmanagerConfig

Historically, configuring Alertmanager meant managing a single, monolithic `alertmanager.yaml` file. In large organizations, this creates a bottleneck, as multiple teams must constantly update a shared configuration to add their specific routing rules and receiver endpoints.

The `vm-operator` eliminates this friction using the `VMAlertmanagerConfig` CRD. This resource allows application owners and individual teams to define their own routing trees and receivers within their own namespaces using a GitOps approach. The operator then dynamically merges all matching `VMAlertmanagerConfig` objects into a single, cohesive configuration file and injects it into the `VMAlertmanager` pods.

A team can define their notification preferences locally like this:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlertmanagerConfig
metadata:
  name: payment-team-alerts
  namespace: payments
spec:
  route:
    receiver: slack-payments
    group_interval: 5m
    matchers:
      - severity =~ "warning|critical"
      - team = "payments"
  receivers:
    - name: slack-payments
      slack_configs:
        - api_url:
            name: slack-webhook-secret
            key: url
          channel: '#alerts-payments'
          send_resolved: true
```

### Namespace Enforcement and Security

To prevent one team from accidentally (or maliciously) intercepting or silencing another team's alerts, the `VMAlertmanagerConfig` includes built-in safeguards. 

By default, the operator enforces a namespace matcher. If a `VMAlertmanagerConfig` is deployed in the `payments` namespace, the operator automatically rewrites the underlying routing tree to ensure it only applies to alerts that carry a `namespace="payments"` label. 

If you are managing cluster-wide infrastructure and explicitly want to route alerts regardless of their origin namespace, you can disable this enforcement by setting `disableNamespaceMatcher: true` at the `VMAlertmanager` specification level, though this should be reserved for global administration environments. 

### Connecting vmalert to vmalertmanager

Once the `VMAlertmanager` is running, the operator exposes it via a Kubernetes Service. To complete the integration, your `vmalert` configuration must point its `-notifier.url` to this service. 

In a fully operator-managed setup, this connection is handled implicitly. You simply reference the deployed `VMAlertmanager` service endpoint inside your `VMAlert` CRD:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlert
metadata:
  name: main-vmalert
  namespace: monitoring
spec:
  replicaCount: 2
  datasource:
    url: "http://vmsingle-main.monitoring.svc:8429"
  notifiers:
    # URL generated by the operator based on the VMAlertmanager name
    - url: "http://vmalertmanager-main-alertmanager.monitoring.svc:9093"
```

This completes the cloud-native pipeline: raw metrics are queried by `vmalert`, rules are evaluated asynchronously, and active alert states are pushed seamlessly to a highly available, dynamically configured `vmalertmanager` cluster.

## 15.3 Designing Routing Trees and Alert Receivers

Alertmanager’s true power lies in its ability to transform a chaotic, high-volume stream of raw alerts from `vmalert` into organized, actionable, and well-timed notifications. To achieve this, it relies on two foundational configuration constructs: **Receivers** (the destinations where notifications are sent) and the **Routing Tree** (the logical rule set that dictates which alert goes to which destination).

Whether you are configuring a monolithic `alertmanager.yaml` or using the decentralized `VMAlertmanagerConfig` CRD discussed in the previous section, the underlying syntax and logic remain identical to the upstream Prometheus Alertmanager specification.

### Defining Alert Receivers

A **Receiver** is a named configuration block that defines one or more integration endpoints. Alertmanager natively supports a wide array of notification mechanisms, including Slack, PagerDuty, OpsGenie, VictorOps, email, and generic HTTP webhooks.

A single receiver can trigger multiple actions simultaneously. For instance, a `critical-billing-receiver` might page the on-call engineer via PagerDuty *and* drop a message into a specific Slack channel.

```yaml
receivers:
  - name: 'slack-database-team'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T0000/B000/XXXX'
        channel: '#alerts-database'
        send_resolved: true
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - routing_key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        severity: 'critical'
        description: '{{ .CommonAnnotations.summary }}'
```

### The Routing Tree Architecture

The **Routing Tree** is a hierarchical structure of routing rules. When `vmalertmanager` receives an alert payload, the alert enters the tree at the "root" route. From there, it is evaluated against child nodes in a top-down, depth-first manner.

Here is a plain text representation of a typical routing tree topology:

```text
[Root Route] (Catches all unmatched alerts -> sends to default receiver)
   │
   ├── [Route A: match team=database] 
   │      └── Sends to Receiver: slack-database-team
   │
   └── [Route B: match severity=critical]
          │
          ├── [Sub-Route B1: match service=billing] 
          │      └── Sends to Receiver: pagerduty-billing
          │
          └── [Sub-Route B2: match service=frontend] 
                 └── Sends to Receiver: pagerduty-frontend
```

#### Traversal Logic
By default, Alertmanager stops evaluating a branch as soon as it finds the first child route that matches the alert's labels. If an alert matches `team=database` (Route A), it will not be evaluated against Route B, even if it is also a critical alert. 

If you want an alert to match multiple sibling routes (for example, to send a notification to a specific team's Slack, but *also* send all critical alerts to a global security channel), you must use the `continue: true` directive on the matching node.

### Grouping and Timing Parameters

The most critical—and often most misunderstood—aspect of the routing tree is how it batches alerts to prevent notification fatigue during widespread outages. This is controlled by four core parameters defined within each route node:

* **`group_by`**: A list of labels used to batch similar alerts together. If a database cluster goes offline, you might have 50 different alerts fire simultaneously (CPU high, connections dropped, query latency). If you group by `['cluster', 'job']`, Alertmanager rolls these 50 distinct alerts into a single, comprehensive notification.
* **`group_wait`**: The amount of time Alertmanager waits before sending the *very first* notification for a newly created group. This buffers the initial wave of an incident. If set to `30s`, Alertmanager waits 30 seconds to see if any other alerts belonging to that same group arrive before paging the on-call engineer.
* **`group_interval`**: The amount of time Alertmanager waits before sending a follow-up notification if *new* alerts are added to an already active group.
* **`repeat_interval`**: The amount of time Alertmanager waits before re-sending a notification if the exact same alerts are *still* firing, serving as a persistent reminder for unacknowledged issues.

### Putting It Together: A Complete Routing Block

The following YAML block translates the concepts and the topological diagram above into a fully functional Alertmanager configuration snippet:

```yaml
route:
  # The root route acts as a fallback. 
  # All alerts inherit these grouping and timing settings unless overridden by a child.
  receiver: 'default-email-receiver'
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Route A: Database Team
    - matchers:
        - team = "database"
      receiver: 'slack-database-team'
      # The DB team overrides the default grouping to group by specific instances
      group_by: ['instance'] 

    # Route B: Critical Alerts Branch
    - matchers:
        - severity = "critical"
      # We don't define a receiver here; we rely on child nodes to route properly
      
      routes:
        # Sub-Route B1: Billing
        - matchers:
            - service = "billing"
          receiver: 'pagerduty-billing'
          group_wait: 10s # Critical billing alerts page almost immediately
          repeat_interval: 1h
          
        # Sub-Route B2: Frontend
        - matchers:
            - service = "frontend"
          receiver: 'pagerduty-frontend'
```

When designing your tree, keep the root node as generic as possible to act as a "catch-all" for mislabeled or unexpected alerts. Rely on the child nodes to filter out the noise and aggressively group alerts that share common failure domains (like physical hosts or network zones) to ensure your operators receive manageable, context-rich notifications rather than a flood of isolated warnings.

## 15.4 Managing Alert Silences and Inhibition Rules

No matter how well you tune your `vmalert` rules or design your `vmalertmanager` routing trees, there will always be scenarios where you need to suppress notifications. Maintenance windows, known systemic outages, and cascading failures can quickly generate a storm of irrelevant alerts, burying the actual root cause and causing severe alert fatigue. 

To manage this, the Alertmanager ecosystem provides two distinct mechanisms for suppression: **Silences** (which are manual and time-bound) and **Inhibition Rules** (which are automatic and state-bound).

### Silences: Time-Bound Suppression

A silence is a temporary, manual override that prevents notifications for any alerts matching a specific set of labels. Silences are not defined in your configuration files; instead, they are created dynamically at runtime via the Alertmanager Web UI, the HTTP API, or the `amtool` command-line utility.

**Common Use Cases for Silences:**
* Muting hardware failure alerts while a technician replaces a physical disk.
* Suppressing "high latency" warnings during a scheduled database migration.
* Temporarily pausing alerts for a non-critical service that is flapping while a patch is being developed.

Because `vmalertmanager` runs standard Alertmanager under the hood, you can create a silence using the `amtool` CLI just as you would in a vanilla Prometheus setup:

```bash
# Silence all critical alerts for the 'billing' service for 2 hours
amtool silence add \
  alertmanager.url="http://vmalertmanager:9093" \
  service="billing" \
  severity="critical" \
  --duration="2h" \
  --comment="Scheduled maintenance for billing DB migration (Ticket #4042)"
```

When an alert triggered by `vmalert` arrives at Alertmanager, it is evaluated against the list of active silences *before* it enters the routing tree. If it matches, the alert state is tracked internally, but the notification process is halted.

### Inhibition Rules: State-Bound Suppression

While silences are reactive, **Inhibition Rules** are proactive. An inhibition rule is a static configuration that mutes a target alert if a specific source alert is already actively firing. This is your primary defense against cascading failure notifications.

**Common Use Cases for Inhibition Rules:**
* If an entire physical host goes down (Source Alert), suppress the individual "Service Down" alerts (Target Alerts) for every application running on that host.
* If a cluster loses network connectivity, suppress "High Query Latency" alerts, as the latency is a symptom of the network failure.
* If a `critical` alert is firing for a specific component, suppress any `warning` level alerts for that exact same component.

Inhibition rules are defined in the `alertmanager.yaml` file or within the `VMAlertmanagerConfig` Custom Resource Definition in Kubernetes. 

#### Anatomy of an Inhibition Rule

An inhibition rule requires three components:
1.  **`source_matchers`**: The labels that must be present on an alert for it to trigger the suppression behavior.
2.  **`target_matchers`**: The labels that define which alerts should be suppressed.
3.  **`equal`**: A list of labels that must have the exact same values on *both* the source and the target alert for the suppression to take effect.

Here is a practical configuration example:

```yaml
inhibit_rules:
  # Rule 1: Suppress Warnings if a Critical alert is already firing
  # for the same service and environment.
  - source_matchers:
      - severity = "critical"
    target_matchers:
      - severity = "warning"
    equal: ['service', 'environment']

  # Rule 2: Suppress application-level alerts if the underlying node is down.
  - source_matchers:
      - alertname = "NodeDown"
    target_matchers:
      - severity =~ "warning|critical"
    equal: ['instance']
```

#### How Inhibition is Processed

When evaluating the second rule in the example above, `vmalertmanager` performs the following logic:

1.  It checks if an alert named `NodeDown` is actively firing. Let's say `NodeDown` is firing with the label `instance="node-05.prod.local"`.
2.  A new alert arrives from `vmalert`: `HighCPUUsage` with labels `severity="critical"` and `instance="node-05.prod.local"`.
3.  The new alert matches the `target_matchers` (it has a critical severity).
4.  The `vmalertmanager` checks the `equal` condition. Both the source and target alerts share the exact same value for the `instance` label (`node-05.prod.local`).
5.  Because all conditions are met, the `HighCPUUsage` notification is suppressed. The operators only receive the `NodeDown` notification, pointing them directly to the root cause.

By carefully combining `vmalert`'s precise MetricsQL evaluations with `vmalertmanager`'s routing, grouping, silences, and inhibition rules, you can build an alerting pipeline that guarantees operators are notified quickly, with high-context data, and minimal noise.