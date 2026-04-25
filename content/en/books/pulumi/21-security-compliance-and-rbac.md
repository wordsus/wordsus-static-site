As your Infrastructure as Code practice scales, security and compliance become paramount. This chapter explores the critical mechanisms required to harden your enterprise Pulumi environment. We begin by securing the Pulumi Console perimeter through network controls and organizational policies. Next, we examine federated identity management via SAML and SSO to centralize authentication. We then dive into Role-Based Access Control (RBAC), demonstrating how to enforce least privilege across teams and stacks programmatically. Finally, we cover audit logging, ensuring every infrastructure action is historically auditable and securely recorded.

## 21.1 Securing the Pulumi Console

The Pulumi Console (often referred to as Pulumi Cloud or the Pulumi Service) acts as the central control plane for your infrastructure deployments. Because it houses your organization's state files, coordinates concurrent deployments, and acts as the broker for encrypted secrets, securing the console is the foundational step in hardening your enterprise infrastructure practice. 

While earlier chapters covered encrypting secrets (Chapter 6) and managing state files (Chapter 5), this section focuses on securing the perimeter and the operational guardrails of the Pulumi Console itself. When operating at an enterprise scale, securing the console means strictly controlling *who* can access it, *where* they can access it from, and *what* default behaviors are enforced organization-wide.

### The Layers of Console Security

Securing the Pulumi Console requires a defense-in-depth approach. You are not just protecting the UI; you are protecting the backend API that your CLI, CI/CD pipelines, and Automation API scripts interact with constantly.

```text
+-----------------------------------------------------------------------+
|                       Pulumi Console / Service                        |
|                                                                       |
|  1. Network Perimeter             2. Authentication & Tokens          |
|  +-----------------------+        +--------------------------------+  |
|  |   IP Allowlisting     | =====> |   Personal Access Tokens       |  |
|  |   (VPNs, CI/CD IPs)   |        |   Team / Runner Tokens         |  |
|  +-----------------------+        +--------------------------------+  |
|                                                    ||                 |
|                                                    \/                 |
|  3. Organizational Guardrails                                         |
|  +-----------------------------------------------------------------+  |
|  | - Default Secrets Provider Enforcement                          |  |
|  | - Stack Transfer Restrictions                                   |  |
|  | - Default Project Policies                                      |  |
|  +-----------------------------------------------------------------+  |
|                                                    ||                 |
|                                                    \/                 |
|                       Protected State and Configurations              |
+-----------------------------------------------------------------------+
```

### Access Tokens and Machine Identity

While human users will eventually be secured via SAML/SSO (which we will explore in Section 21.2), headless processes—such as the CI/CD pipelines discussed in Chapter 18—rely on Access Tokens. The Pulumi Console issues different types of tokens, and managing their lifecycle is a critical security responsibility.

1. **Personal Access Tokens (PATs):** Tied to an individual user. If the user leaves the organization or is removed from the Identity Provider (IdP), their PAT is invalidated. PATs should be restricted to local development environments and never embedded in shared CI/CD environments.
2. **Team Access Tokens:** Tied to a specific team within the Pulumi organization. These are useful for departmental automation but carry the risk of broad access if a team is granted sweeping permissions across many projects.
3. **Organization Access Tokens (Runner Tokens):** These are specifically designed for CI/CD pipelines. They operate independently of any single human user's lifecycle. 

**Best Practice:** Always apply the Principle of Least Privilege to tokens. When generating a token for a GitHub Actions pipeline, for example, generate a Team or Runner token scoped *only* to the stacks that the specific pipeline is responsible for. Furthermore, organization administrators should regularly audit the **Access Tokens** page in the console settings to revoke stale or unused tokens.

### Enforcing Network Security via IP Allowlisting

Even if an attacker compromises a valid Pulumi Access Token, you can prevent them from accessing your infrastructure state by enforcing network boundaries. The Pulumi Console provides **IP Allowlisting**, which restricts access to your organization's data to requests originating from explicitly approved IP addresses or CIDR blocks.

When configuring IP Allowlisting, you must account for all legitimate traffic sources:
* **Corporate VPNs / Office Networks:** Ensuring developers can run `pulumi up` or `pulumi preview` locally.
* **CI/CD Runners:** The static outbound IP addresses of your build agents (e.g., GitHub Actions hosted runners, self-hosted GitLab runners).
* **VPC NAT Gateways:** If you are utilizing the Pulumi Automation API from within your own cloud environments (as covered in Chapter 19).

If a request is made with a valid token but from an unapproved IP address, the Pulumi Service will reject the API call with a `403 Forbidden` error, effectively neutralizing leaked tokens on the public internet.

### Organization Policies and Guardrails

The Pulumi Console allows Organization Admins to enforce specific security baselines that override individual user or project-level choices. Configuring these settings ensures that new projects cannot be spun up insecurely.

**Enforcing a Custom Secrets Provider**
By default, Pulumi encrypts secrets using a service-managed key. However, enterprise compliance often dictates that organizations must control the underlying Key Management Service (KMS), as discussed in Chapter 6. Through the console's security settings, administrators can enforce a policy that *requires* all new stacks to be initialized with a custom secrets provider (like AWS KMS, Azure Key Vault, or HashiCorp Vault). If a developer attempts to run `pulumi stack init` without specifying a compliant KMS key, the console will reject the creation of the stack.

**Restricting Stack Transfers**
Stacks contain sensitive configuration and state data. To prevent data exfiltration or accidental moves, administrators can disable stack transfers out of the organization. This ensures that a disgruntled or compromised user cannot use `pulumi stack change-owner` to migrate a production stack to a personal Pulumi account.

**Enforcing CrossGuard Policy Packs**
While Chapter 15 covers how to write CrossGuard policies, the console is where these policies are centrally enforced. Administrators can bind Policy Packs to the entire organization, ensuring that no stack can be deployed if it violates baseline rules (e.g., "All S3 buckets must be private"). By configuring this at the console level, enforcement is decoupled from the application code repositories, providing a tamper-proof compliance layer.

## 21.2 SAML/SSO Integration for Enterprise Workspaces

While individual developers often begin their Pulumi journey using GitHub, GitLab, or email-based authentication, operating at an enterprise scale requires centralized identity management. Relying on fragmented authentication methods creates blind spots, complicates offboarding, and circumvents corporate security policies like mandatory Multi-Factor Authentication (MFA).

To solve this, the Pulumi Enterprise and Business Critical editions support Single Sign-On (SSO) via SAML 2.0 and OIDC (OpenID Connect). By integrating the Pulumi Console with your corporate Identity Provider (IdP)—such as Okta, Microsoft Entra ID (formerly Azure AD), or Google Workspace—you shift the responsibility of identity verification and lifecycle management away from Pulumi and back to your security team.

### The Enterprise Authentication Flow

When SSO is enabled, the authentication flow for a human user shifts from a local credential check to a federated trust model. This applies whether the user is logging into the web console or authenticating their local Pulumi CLI via `pulumi login`.

```text
+-----------+                +----------------+                 +----------------------+
| Developer |                | Pulumi Service |                 |   Identity Provider  |
|   (CLI)   |                |   (Console)    |                 | (Okta/Entra/G-Suite) |
+-----------+                +----------------+                 +----------------------+
      |                              |                                     |
      | 1. `pulumi login`            |                                     |
      |----------------------------->|                                     |
      |                              | 2. SAML/OIDC Redirect Request       |
      |<-----------------------------|------------------------------------>|
      |                              |                                     |
      | 3. User Authenticates (Password + MFA via Browser)                 |
      |------------------------------------------------------------------->|
      |                              |                                     |
      | 4. IdP Returns Signed Assertion / Token                            |
      |<-------------------------------------------------------------------|
      |                              |                                     |
      | 5. CLI Submits Token         |                                     |
      |----------------------------->|                                     |
      |                              | 6. Validate Token & Provision Auth  |
      |<-----------------------------|-------------------------------------|
      | 7. Session Established       |                                     |
      |                              |                                     |
```

### Core Benefits of SSO Integration

Integrating your IdP with Pulumi unlocks several critical administrative capabilities that are non-negotiable in regulated environments:

1. **Just-In-Time (JIT) Provisioning:** You no longer need to manually invite users to your Pulumi organization. When an authorized user logs in via the IdP for the first time, Pulumi automatically provisions their account within your organization.
2. **Instant Revocation:** If an employee leaves the company or changes roles, disabling their account in the IdP instantly severs their access to the Pulumi Console, preventing them from viewing state files, secrets, or triggering deployments.
3. **MFA Enforcement:** Pulumi delegates the authentication challenge to the IdP. This ensures that whatever conditional access policies your organization enforces (e.g., requiring hardware security keys, restricting logins to managed corporate devices) are natively applied to Pulumi access.

### Automating Role-Based Access with Group Sync

The true power of SAML/SSO integration lies in **Group Sync**. Managing individual user permissions within Pulumi is an anti-pattern at scale. Instead, organizations should map groups from their IdP directly to Pulumi Teams.

For example, an Okta group named `aws-platform-engineers` can be mapped to a Pulumi Team of the same name. When a user is added to the Okta group, they automatically inherit the Pulumi Team's permissions upon their next login. 

Interestingly, you can manage these Pulumi Teams and their stack permissions using Infrastructure as Code via the official `pulumiservice` provider. This allows you to treat your Pulumi access controls with the same rigor as your cloud infrastructure.

```typescript
import * as pulumiservice from "@pulumi/pulumiservice";

// Define a Pulumi Team that will receive members via IdP Group Sync
const platformTeam = new pulumiservice.Team("platform-engineering", {
    organizationName: "my-enterprise-org",
    name: "Platform Engineering",
    description: "Membership managed automatically via Entra ID / Okta",
});

// Grant the synchronized team 'admin' access to the production core-infra stack
const prodStackAccess = new pulumiservice.TeamStackPermission("platform-prod-access", {
    organization: "my-enterprise-org",
    project: "core-infrastructure",
    stack: "production",
    team: platformTeam.name,
    permission: "admin", 
});

// Grant the same team 'read' access to the networking stack
const networkStackAccess = new pulumiservice.TeamStackPermission("platform-network-read", {
    organization: "my-enterprise-org",
    project: "global-networking",
    stack: "production",
    team: platformTeam.name,
    permission: "read",
});
```

### Enforcing Strict SSO

Once SAML/SSO is configured and validated, administrators should enable **Strict SSO Mode** within the Pulumi organization settings. 

Without Strict Mode, users might still be able to bypass the IdP and log in using their underlying GitHub or email credentials. Enabling Strict SSO ensures that the *only* pathway into your organization's workspace is through the corporate IdP. 

*Note: Before enabling Strict SSO, ensure you have established a "break-glass" administrative account. If your IdP experiences an outage, or if a configuration error breaks the SAML trust relationship, a dedicated, highly secured machine account (using standard authentication) ensures you do not permanently lock yourself out of your infrastructure state.*

## 21.3 Managing Team Permissions and Scopes

With identity federation handled via SAML/SSO (as covered in Section 21.2), the next step in establishing a robust enterprise security posture is defining exactly what those authenticated identities are allowed to do. Pulumi Cloud implements a granular Role-Based Access Control (RBAC) system designed to enforce the Principle of Least Privilege across your infrastructure estate. 

Managing permissions effectively means navigating two distinct scopes: **Organization Roles**, which dictate administrative control over the workspace itself, and **Stack Permissions**, which govern access to the actual infrastructure states and deployments.

### Organization Roles

At the highest level, every user in a Pulumi organization is assigned an organization role. This role defines their baseline capabilities before any stack-specific permissions are evaluated.

* **Organization Admin:** Has unrestricted access. Admins can manage billing, configure SSO, adjust IP allowlists, manage access tokens, and implicitly possess "Admin" rights over every stack within the organization. 
* **Organization Member:** The default role for developers. Members can view other users and teams, but they cannot access or modify any stacks unless explicitly granted permission via Team or individual assignments.

### Stack-Level Permissions

The true power of Pulumi's RBAC lies at the stack level. Because a stack represents a specific instance of your infrastructure (e.g., `api-gateway-prod` vs. `api-gateway-dev`), permissions must be scoped to ensure developers can move fast in development environments without endangering production.

Pulumi defines three primary permission tiers for stacks:

| Action / Capability | `read` | `write` | `admin` |
| :--- | :---: | :---: | :---: |
| View stack configuration and outputs | ✅ | ✅ | ✅ |
| View historical updates and diffs | ✅ | ✅ | ✅ |
| Run `pulumi preview` | ❌ | ✅ | ✅ |
| Run `pulumi up` (modify infrastructure) | ❌ | ✅ | ✅ |
| Modify stack configuration values | ❌ | ✅ | ✅ |
| Run `pulumi destroy` | ❌ | ❌ | ✅ |
| Change stack owner or permissions | ❌ | ❌ | ✅ |

*Note: While a `read` role cannot modify infrastructure, it still allows users to view stack outputs and configuration values. If your configuration contains unencrypted sensitive data (which should be avoided, see Chapter 6), a user with `read` access will be able to see it.*

### Project-Level Defaults vs. Explicit Scopes

Assigning permissions to hundreds of individual stacks manually is prone to human error. To streamline this, Pulumi allows you to assign permissions at the **Project** level. 

When a team is granted access to a project, they automatically inherit that permission level for all *current and future* stacks within that project. However, you can override this inheritance with explicit stack-level assignments. A common pattern is to grant a development team `write` access to a project, but explicitly downgrade their access to `read` on the `production` stack.

### Managing RBAC as Code

In an enterprise environment, clicking through a UI to manage permissions breaks the core tenet of Infrastructure as Code. Access controls should be version-controlled, auditable, and peer-reviewed.

Using the Pulumi Service provider (`@pulumi/pulumiservice`), platform engineering teams can define the organization's entire permission structure in code.

```typescript
import * as pulumiservice from "@pulumi/pulumiservice";

const orgName = "acme-corp";
const projectName = "core-networking";

// Define the Development Team
const devTeam = new pulumiservice.Team("dev-team", {
    organizationName: orgName,
    name: "Backend Developers",
    description: "Application development team",
});

// Grant the Dev Team 'write' access to all stacks in the networking project by default
const projectAccess = new pulumiservice.TeamProjectPermission("dev-project-write", {
    organization: orgName,
    project: projectName,
    team: devTeam.name,
    permission: "write", 
});

// Override the project-level permission: Downgrade to 'read' for the production stack
const prodStackOverride = new pulumiservice.TeamStackPermission("dev-prod-read", {
    organization: orgName,
    project: projectName,
    stack: "production",
    team: devTeam.name,
    permission: "read",
}, { dependsOn: [projectAccess] });
```

### Designing Scopes for CI/CD

When integrating CI/CD pipelines (Chapter 18), the concept of "scopes" becomes vital. A common mistake is using a single Organization Access Token with administrative privileges for all deployment pipelines. If that token is compromised, the entire infrastructure is at risk.

Instead, map CI/CD workflows to dedicated machine-user teams or use carefully scoped Pulumi Access Tokens. 
1.  **Dev Pipeline:** Uses a token scoped strictly to `write` on `*-dev` stacks.
2.  **Prod Pipeline:** Uses a token scoped to `write` or `admin` only on `*-prod` stacks, and is physically restricted to run only from the static IPs of your production deployment runners (utilizing the IP Allowlisting discussed in Section 21.1).

By meticulously scoping team permissions and segregating human access from machine access, you establish a blast radius that protects your critical state files from both malicious actors and well-intentioned mistakes.

## 21.4 Audit Logs and Compliance Tracking

In highly regulated industries, preventing unauthorized access through SSO and RBAC (as covered in the previous sections) is only half the battle. To satisfy compliance frameworks like SOC 2, HIPAA, or PCI-DSS, you must be able to prove *historically* that your access controls were effective. You must be able to answer the fundamental audit questions: *Who did what, when, and from where?*

Pulumi Cloud addresses this requirement through comprehensive, immutable Audit Logs. For organizations on the Enterprise and Business Critical tiers, every administrative and access-related action taken within the workspace is recorded, timestamped, and tied to an authenticated identity.

### What the Audit Logs Capture

It is important to distinguish between **Stack History** and **Audit Logs**. 

Stack History (visible on a stack's timeline) records the technical details of infrastructure changes: which resources were created, modified, or destroyed during a `pulumi up`. 

Audit Logs, conversely, track the *security and administrative* lifecycle of the organization itself. Key events captured include:
* **Authentication Events:** User logins, SSO assertions, and the creation or revocation of Access Tokens.
* **Workspace Management:** Creating or deleting projects and stacks.
* **Access Control Changes:** Modifying Team memberships, altering Organization Roles, or changing stack-level permissions.
* **Data Exfiltration Attempts:** Viewing decrypted secure configuration values via the console, or transferring a stack out of the organization.
* **Policy Overrides:** Occurrences where an administrator bypassed a CrossGuard policy failure.

### The Audit Logging Architecture

While Pulumi retains these logs for a set period (typically 30 days for Enterprise), best practices dictate that audit logs should be ingested into your organization's centralized Security Information and Event Management (SIEM) system, such as Splunk, Datadog, or AWS CloudTrail. 

This prevents tampering and allows security teams to correlate Pulumi activity with broader network or identity events.

```text
+----------------+       1. Admin changes       +-------------------------+
|                |          team permissions    |                         |
|  Platform Dev  | ---------------------------> |  Pulumi Service         |
|                |                              |  (Audit Log Engine)     |
+----------------+                              +-------------------------+
                                                            |
                                                            | 2. Event Logged (JSON)
                                                            v
+----------------+       4. Alerts triggered    +-------------------------+
|                |          on anomalies        |                         |
| SIEM Dashboard | <--------------------------- | Webhook / API Poller    |
| (Splunk/etc.)  |                              | (AWS Lambda / Promtail) |
+----------------+       3. Pushes/Pulls logs   +-------------------------+
```

### Exporting Audit Logs via the REST API

To integrate Pulumi audit logs into your SIEM, you must retrieve them using the Pulumi REST API. Because this is a sensitive operation, it requires an Organization Access Token with administrative privileges.

Here is an example of how you might script the retrieval of audit logs using a simple Bash script and `curl`, which could run as a cron job or a scheduled AWS Lambda function:

```bash
#!/bin/bash

# Configuration
PULUMI_ORG="acme-corp"
# Securely inject your admin Pulumi token
PULUMI_ACCESS_TOKEN="${PULUMI_ACCESS_TOKEN}" 

# Calculate the timestamp for 24 hours ago (Unix epoch format)
START_TIME=$(date -v-1d +%s) 

# Fetch Audit Logs from the Pulumi REST API
curl -X GET \
  -H "Accept: application/vnd.pulumi+8" \
  -H "Authorization: token ${PULUMI_ACCESS_TOKEN}" \
  "https://api.pulumi.com/api/orgs/${PULUMI_ORG}/auditlogs?startTime=${START_TIME}" \
  > pulumi_audit_logs.json

# (Followed by commands to push pulumi_audit_logs.json to your SIEM)
echo "Logs successfully extracted and ready for ingestion."
```

### Compliance Tracking and Policy as Code

Audit logs tell you when rules change, but **Compliance Tracking** ensures your infrastructure remains in a compliant state between audits. 

By utilizing Pulumi CrossGuard (introduced in Chapter 15) in conjunction with the Pulumi Console, you can generate compliance reports. When a Policy Pack is enforced organization-wide, the Pulumi Service aggregates policy evaluations across all deployments. 

If a new compliance mandate dictates that all databases must use customer-managed encryption keys, you can update your Policy Pack. The Pulumi Console will then surface a compliance dashboard showing which stacks are currently violating the new policy, long before a formal security audit takes place. 

By combining SSO (ensuring verified identities), RBAC (enforcing least privilege), Policy as Code (mandating secure infrastructure), and Audit Logs (recording all meta-actions), the Pulumi Console transforms Infrastructure as Code from a simple deployment mechanism into a verifiable, enterprise-grade security platform.