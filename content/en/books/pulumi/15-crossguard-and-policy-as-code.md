As infrastructure scales, ensuring deployments adhere to corporate security, compliance, and cost standards becomes a critical bottleneck. Manual reviews are slow, while runtime scanners only detect issues after a vulnerability is live. In this chapter, we explore Pulumi CrossGuard, a native Policy as Code framework that shifts governance "left." We will learn how to write automated guardrails in familiar languages like TypeScript and Python, enforce strict security and financial controls before resources are provisioned, and integrate these policies into CI/CD pipelines for continuous compliance.

## 15.1 Introduction to Pulumi CrossGuard

As infrastructure codebases scale across teams and environments, ensuring that every deployed resource adheres to corporate security standards, compliance requirements, and cost constraints becomes a significant challenge. Relying solely on manual code reviews or out-of-band audits is error-prone and creates bottlenecks. This is where **Policy as Code (PaC)** becomes an essential practice. 

Pulumi CrossGuard is Pulumi’s native Policy as Code framework. It allows platform engineers, security teams, and cloud architects to express organizational rules using code and enforce them automatically during the infrastructure deployment lifecycle. Instead of finding out about an open S3 bucket or an oversized EC2 instance after it has been provisioned, CrossGuard evaluates these rules *before* any infrastructure is created or modified.

### The Shift to Policy as Code

Traditional infrastructure governance often relies on reactive, runtime scanning tools (like AWS Config or Azure Policy). While these tools are valuable for continuous compliance, they evaluate resources that already exist. If a non-compliant resource is deployed, there is a window of vulnerability before the runtime scanner detects and remediates it.

CrossGuard shifts this validation "left" into the provisioning phase. By integrating directly with the Pulumi engine, CrossGuard acts as a gatekeeper. If a developer attempts to deploy infrastructure that violates a mandatory policy, the deployment fails before any API calls are made to the cloud provider. 

### The CrossGuard Evaluation Flow

CrossGuard policies are grouped into **Policy Packs**. When you run a Pulumi operation (such as `pulumi preview` or `pulumi up`), the Pulumi engine calculates the desired state of the infrastructure. Before executing the resource creations, updates, or deletions, the engine pauses and hands the state data over to CrossGuard for evaluation against the applied Policy Packs.

```text
+-------------------+         +-----------------------+         +-------------------+
|                   |         |                       |         |                   |
|  Pulumi Program   | ------> |     Pulumi Engine     | ------> |  Cloud Providers  |
|  (Infrastructure) |         |  (State Calculation)  |         |  (AWS, Azure, etc)|
|                   |         |                       |         |                   |
+-------------------+         +-----------+-----------+         +-------------------+
                                          |      ^
                                 State &  |      | Pass/Fail
                                 Diffs    |      |
                                          v      |
                              +---------------------------+
                              |                           |
                              |     Pulumi CrossGuard     |
                              |  (Policy Pack Execution)  |
                              |                           |
                              +---------------------------+
```

Because this evaluation happens during both the `preview` and `up` phases, developers receive immediate feedback on their local machines. They can see exactly which policy they violated and why, long before the code is merged into the main branch.

### Core Concepts of CrossGuard

To understand how CrossGuard operates, you must be familiar with its foundational components: Policy Packs, Policy Types, and Enforcement Levels.

#### 1. Policy Packs
A Policy Pack is a standalone Pulumi project dedicated entirely to governance. It is a collection of individual policies packaged together. Unlike your standard Pulumi infrastructure code, Policy Packs do not provision resources; they only inspect them. You can write Policy Packs in TypeScript, Python, Go, or even using Open Policy Agent (OPA) Rego. 

Policy Packs can be executed locally by pointing the CLI to a directory (e.g., `pulumi up --policy-pack /path/to/policies`), or they can be published to the Pulumi Service to be enforced globally across an entire organization.

#### 2. Policy Types: Resource vs. Stack
CrossGuard evaluates rules at two distinct scopes:

* **Resource Policies:** These are evaluated on a per-resource basis. As the Pulumi engine processes the desired state of a specific resource (like a single AWS S3 Bucket or an Azure Storage Account), it runs any applicable Resource Policies against its inputs. This is ideal for localized checks, such as enforcing encryption on all databases or tagging requirements on all virtual machines.
* **Stack Policies:** These are evaluated comprehensively against the entire stack once all resources have been resolved. Stack Policies have access to the complete graph of resources. This makes them suitable for complex, cross-resource validations. For example, a Stack Policy could verify that every compute instance in a VPC is properly attached to a specific security group, or calculate the aggregate cost of the entire stack to ensure it stays below a specific budget threshold.

#### 3. Enforcement Levels
Not all policies require the deployment to halt. CrossGuard provides three enforcement levels to allow for flexible governance strategies:

* **Advisory:** If an advisory policy is violated, CrossGuard logs a warning message to the console but allows the deployment to proceed. This is highly useful for introducing new policies smoothly, giving teams time to remediate issues before the rule becomes strict, or for establishing "best practice" recommendations.
* **Mandatory:** If a mandatory policy is violated, the deployment immediately fails. The user will see an error detailing the violation, and no further infrastructure changes will occur. This is used for strict security controls, such as blocking public IP addresses on databases.
* **Disabled:** The policy is turned off and will not be evaluated. This is often used to temporarily bypass a rule during emergency hotfixes or while a policy is undergoing maintenance.

### The Developer Experience

One of the primary advantages of CrossGuard over domain-specific policy languages is its use of general-purpose programming languages. Because policies are written in the same languages used to define the infrastructure, developers can leverage existing tooling. 

Policies can utilize standard testing frameworks (like Jest or PyTest) to ensure the rules themselves are accurate. They can import external libraries, make HTTP requests to fetch dynamic compliance data, or share reusable logic via standard package managers. This unifies the workflow: infrastructure and the policies that govern it are both treated as standard software engineering artifacts.

## 15.2 Writing Policies in TypeScript/Python

One of the most significant architectural advantages of Pulumi CrossGuard is that it allows you to author policies in general-purpose programming languages. Instead of forcing security and compliance teams to learn domain-specific languages (DSLs) like Rego (used in OPA) or Sentinel (used in Terraform), CrossGuard enables the use of familiar languages like TypeScript and Python.

This unified approach breaks down silos. Infrastructure engineers and security teams can collaborate in the same language ecosystem, utilizing the same IDEs, linters, and package managers. It also means policies can pull in external libraries—for instance, to validate IP CIDR blocks against an internal database or to fetch the latest approved AMI list via an HTTP request during policy execution.

### The Anatomy of a Policy

Regardless of the language you choose, a CrossGuard policy generally consists of four primary components:

1.  **Name:** A unique, concise identifier for the policy.
2.  **Description:** A clear explanation of what the policy enforces and why it exists.
3.  **Enforcement Level:** The strictness of the rule (`mandatory`, `advisory`, or `disabled`), determining whether a violation blocks the deployment.
4.  **Validation Logic:** A callback function that inspects the properties of the resource or stack and triggers a violation report if the rules are broken.

### Authoring in TypeScript

TypeScript is arguably the most popular language for writing CrossGuard policies because its strong typing aligns perfectly with Pulumi’s strongly typed resource providers. When you write a policy in TypeScript, your IDE provides autocomplete for every property of a cloud resource, significantly reducing the chance of runtime errors.

Here is an example of a **Resource Policy** written in TypeScript that ensures no AWS S3 buckets are configured with public read access.

```typescript
import * as aws from "@pulumi/aws";
import { PolicyPack, ResourceValidationPolicy, validateResourceOfType } from "@pulumi/policy";

// Define the individual policy
const s3BucketNoPublicRead: ResourceValidationPolicy = {
    name: "s3-no-public-read",
    description: "Prohibits setting the publicRead or publicReadWrite ACL on S3 buckets.",
    enforcementLevel: "mandatory",
    // validateResourceOfType strongly types the resource arguments
    validateResource: validateResourceOfType(aws.s3.Bucket, (bucket, args, reportViolation) => {
        if (bucket.acl === "public-read" || bucket.acl === "public-read-write") {
            reportViolation(
                `S3 Bucket '${args.name}' has a public ACL (${bucket.acl}). ` +
                `Buckets must be strictly private.`
            );
        }
    }),
};

// Bundle the policy into a Policy Pack
new PolicyPack("aws-security-pack", {
    policies: [s3BucketNoPublicRead],
});
```

Notice the use of the `validateResourceOfType` helper function. This is a powerful feature of the TypeScript SDK. It automatically filters the incoming resource stream so that the validation function only executes when an `aws.s3.Bucket` is evaluated. Furthermore, it types the `bucket` parameter, allowing you to access `bucket.acl` safely without guessing the property name.

### Authoring in Python

Python is an excellent choice for organizations with strong data science or backend engineering cultures. The Pulumi Python policy SDK provides similar capabilities to TypeScript, utilizing Python's type hinting and dictionary manipulation.

Below is an example of a **Resource Policy** written in Python that enforces cost controls by restricting the allowed EC2 instance types developers can provision.

```python
from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ResourceValidationPolicy,
    ResourceValidationArgs,
    ReportViolation,
)

# Define the validation logic
def check_instance_type(args: ResourceValidationArgs, report_violation: ReportViolation):
    # Manually check the resource type URN
    if args.resource_type == "aws:ec2/instance:Instance":
        # Extract the instance type from the resource properties
        instance_type = args.props.get("instanceType")
        
        allowed_types = ["t3.micro", "t3.small", "t3.medium"]
        
        if instance_type and instance_type not in allowed_types:
            report_violation(
                f"Instance type '{instance_type}' is not permitted. "
                f"Please use one of the approved types: {', '.join(allowed_types)}."
            )

# Create the policy object
ec2_instance_type_policy = ResourceValidationPolicy(
    name="restrict-ec2-instance-type",
    description="Ensures all EC2 instances use approved, cost-effective instance types.",
    enforcement_level=EnforcementLevel.MANDATORY,
    validate=check_instance_type,
)

# Bundle the policy into a Policy Pack
def run_pack():
    PolicyPack(
        name="aws-cost-control-pack",
        enforcement_level=EnforcementLevel.MANDATORY,
        policies=[ec2_instance_type_policy],
    )

run_pack()
```

In the Python example, because we don't have an equivalent to TypeScript's `validateResourceOfType`, we check the `args.resource_type` string (the Pulumi URN type) to ensure we are only evaluating EC2 instances. We then extract the properties using `args.props.get()`. 

### Testing Your Policies

Because these policies are standard software, they can—and should—be tested using standard unit testing frameworks. You do not need to stand up actual infrastructure to verify your policy logic.

In TypeScript, you can use Mocha or Jest to pass mock resource objects into your validation function and assert whether `reportViolation` was called. In Python, you can achieve the same using `unittest` or `pytest`. 

```text
+-----------------------+      +-----------------------+      +-----------------------+
|                       |      |                       |      |                       |
|   Mock Inputs (JSON)  | ---> | Policy Function (SUT) | ---> | Assert Violations     |
|   (Valid & Invalid)   |      |   (TS / Python)       |      | (Pass/Fail Test)      |
|                       |      |                       |      |                       |
+-----------------------+      +-----------------------+      +-----------------------+
```

This testing paradigm shifts infrastructure governance even further left. You validate your infrastructure against your policies during deployment, but you validate the policies themselves during the CI build of the Policy Pack. This ensures that a poorly written rule doesn't accidentally halt production deployments or, conversely, silently allow security breaches.

## 15.3 Enforcing Security and Cost Controls

While knowing how to write and test policies is foundational, the true value of Pulumi CrossGuard emerges when you apply it to real-world business problems. For most organizations, infrastructure governance is driven by two primary mandates: preventing security breaches and controlling cloud spend. 

By encoding these mandates into Policy Packs, platform teams establish automated "guardrails." These guardrails enable developers to provision their own infrastructure self-sufficiently, with the cryptographic guarantee that their deployments will not violate the organization's risk tolerance or budget.

### Enforcing Security Posture

Security in the cloud is a shared responsibility, but misconfigurations remain the leading cause of cloud data breaches. CrossGuard mitigates this risk by ensuring that resources are secure by default before they ever reach the cloud provider's API. 

Common security policies implemented via CrossGuard include:

* **Encryption at Rest:** Enforcing that all databases, storage buckets, and block storage volumes have KMS encryption enabled.
* **Network Boundaries:** Prohibiting public IP addresses on internal microservices or databases.
* **Access Control:** Ensuring IAM roles follow the principle of least privilege, preventing the use of wildcard (`*`) permissions.
* **Vulnerability Management:** Restricting the deployment of container images to only those originating from a trusted, internal container registry.

#### Example: Blocking Open SSH Access (TypeScript)

A classic security violation is accidentally leaving SSH (Port 22) open to the entire internet (`0.0.0.0/0`) in an AWS Security Group. Using CrossGuard, we can write a Resource Policy to block this specific configuration.

```typescript
import * as aws from "@pulumi/aws";
import { ResourceValidationPolicy, validateResourceOfType } from "@pulumi/policy";

export const noOpenSsh: ResourceValidationPolicy = {
    name: "disallow-open-ssh",
    description: "Security groups must not permit SSH traffic from the public internet.",
    enforcementLevel: "mandatory",
    validateResource: validateResourceOfType(aws.ec2.SecurityGroup, (sg, args, reportViolation) => {
        if (!sg.ingress) return;

        for (const rule of sg.ingress) {
            const isSshPort = (rule.fromPort <= 22 && rule.toPort >= 22);
            const isPubliclyOpen = rule.cidrBlocks?.includes("0.0.0.0/0") || rule.ipv6CidrBlocks?.includes("::/0");

            if (isSshPort && isPubliclyOpen) {
                reportViolation(
                    `Security Group '${args.name}' allows inbound SSH access from the internet. ` +
                    `Please restrict CIDR blocks to internal corporate networks.`
                );
            }
        }
    }),
};
```

### Implementing Cost Controls (FinOps)

The dynamic nature of the cloud makes it incredibly easy to overspend. Without guardrails, a developer might provision a fleet of massive GPU instances for a simple test environment and forget to tear them down. CrossGuard acts as the enforcement arm for an organization's FinOps strategy.

Common cost control policies include:

* **Instance Sizing Limitations:** Restricting the allowed SKUs for virtual machines or databases based on the environment (e.g., only allowing `t3.micro` in development).
* **Resource Lifespans:** Enforcing a maximum Time-To-Live (TTL) on ephemeral environments to ensure they are cleaned up.
* **Mandatory Tagging:** Requiring specific tags (like `CostCenter`, `Owner`, or `Project`) on all billable resources so that cloud costs can be accurately attributed back to the responsible teams.

#### Example: Mandatory Cost Allocation Tags (Python)

Tagging is the cornerstone of cloud cost allocation. If a resource isn't tagged, the finance team cannot track who spent the money. Because AWS handles tagging differently across various resources, enforcing this can be tricky. However, Pulumi's provider abstractions make it easier to write a policy that checks for tags on any resource that supports them.

```python
from pulumi_policy import (
    EnforcementLevel,
    ResourceValidationPolicy,
    ResourceValidationArgs,
    ReportViolation,
)

REQUIRED_TAGS = ["CostCenter", "Environment"]

def ensure_mandatory_tags(args: ResourceValidationArgs, report_violation: ReportViolation):
    # Not all resources support tags. We only evaluate those that have a 'tags' property defined.
    if "tags" in args.props:
        resource_tags = args.props["tags"] or {}
        
        missing_tags = [tag for tag in REQUIRED_TAGS if tag not in resource_tags]
        
        if missing_tags:
            report_violation(
                f"Resource '{args.name}' of type '{args.resource_type}' is missing mandatory tags: {', '.join(missing_tags)}. "
                f"All taggable resources must include these tags for cost allocation."
            )

mandatory_tagging_policy = ResourceValidationPolicy(
    name="mandatory-cost-center-tags",
    description="Ensures all taggable resources include required FinOps tags.",
    enforcement_level=EnforcementLevel.MANDATORY,
    validate=ensure_mandatory_tags,
)
```

### The Guardrail Matrix

When designing your organization's Policy Packs, it is helpful to categorize rules into a matrix balancing the *Domain* (Security vs. Cost) against the *Environment* (Non-Production vs. Production). This prevents overly strict policies from crippling developer velocity in sandbox environments.

```text
+----------------+-----------------------------------------+-----------------------------------------+
|                |        Development / Staging            |             Production                  |
+----------------+-----------------------------------------+-----------------------------------------+
| Security       | ADVISORY: Warn on overly permissive IAM.| MANDATORY: Strict Least Privilege IAM.  |
|                | MANDATORY: No public databases.         | MANDATORY: No public databases.         |
|                | ADVISORY: Warn on missing encryption.   | MANDATORY: Encrypt all storage/data.    |
+----------------+-----------------------------------------+-----------------------------------------+
| Cost Controls  | MANDATORY: Max instance size (Small).   | ADVISORY: Alert if over-provisioned.    |
|                | MANDATORY: Auto-delete TTL tags required| MANDATORY: CostCenter tags required.    |
|                | MANDATORY: No multi-AZ deployments.     | MANDATORY: Multi-AZ highly available.   |
+----------------+-----------------------------------------+-----------------------------------------+
```

By systematically applying these rules, CrossGuard transforms corporate governance from a lengthy, manual review process at the end of the development cycle into an invisible, continuous partner that guides engineers toward secure and cost-effective architectures.

## 15.4 Integrating Policy Packs into CI/CD Pipelines

Writing robust policies is only the first half of the governance equation; the second half is enforcement. If developers must manually remember to run the `--policy-pack` flag on their local machines, compliance is effectively optional. To guarantee that no non-compliant infrastructure ever reaches production, Policy as Code must be seamlessly integrated into your Continuous Integration and Continuous Deployment (CI/CD) pipelines.

The CI/CD pipeline acts as the authoritative choke point. By executing CrossGuard during the automated deployment lifecycle, organizations achieve a state of continuous compliance, catching violations at the Pull Request (PR) stage rather than post-deployment.

### Centralized vs. Decentralized Policy Management

There are two primary architectural approaches to integrating Policy Packs into your pipelines:

1.  **Decentralized (Local Paths):** The Policy Pack source code lives in the same repository as the infrastructure code (a monorepo approach), or is cloned down during the pipeline run. The pipeline executes `pulumi preview --policy-pack /path/to/policies`.
2.  **Centralized (Pulumi Service Enforcement):** The security or platform team manages the Policy Pack in an independent repository. They publish the compiled policies directly to the Pulumi Service (or Pulumi Enterprise) using `pulumi policy publish`. Once published and assigned to an organization or specific environment, the Pulumi Service automatically enforces these policies on all applicable stacks.

For enterprise environments, the **Centralized** approach is highly recommended. It guarantees that individual infrastructure teams cannot bypass policies by simply modifying their CI scripts, and it ensures that policy updates roll out uniformly across the organization.

### The Automated Governance Workflow

When centralized enforcement is active, the integration into the CI/CD workflow is entirely transparent to the infrastructure pipeline. The standard `pulumi preview` and `pulumi up` commands automatically pull the latest mandatory rules from the Pulumi backend.

```text
+-------------------+       +-------------------------+       +-------------------------+
|                   |       |                         |       |                         |
| 1. Developer      | ----> | 2. Pull Request Created | ----> | 3. CI System Triggers   |
| Commits Infra Code|       |    (GitHub, GitLab)     |       |    (pulumi preview)     |
|                   |       |                         |       |                         |
+-------------------+       +-------------------------+       +-------------------------+
                                                                          |
                                                                          v
+-------------------+       +-------------------------+       +-------------------------+
|                   |       |                         |       |                         |
| 6. CI Pipeline    | <---- | 5. CrossGuard Evaluates | <---- | 4. Pulumi Engine        |
| Fails or Passes   |       |    (Blocks on Mandatory)|       |    Calculates Diff      |
|                   |       |                         |       |                         |
+-------------------+       +-------------------------+       +-------------------------+
          |
          | (If Pass & Merged)
          v
+-------------------+       +-------------------------+
|                   |       |                         |
| 7. CD System      | ----> | 8. Infrastructure is    |
| Triggers (up)     |       |    Provisioned Securely |
|                   |       |                         |
+-------------------+       +-------------------------+
```

### Implementing in GitHub Actions

Integrating policy enforcement into a CI/CD platform like GitHub Actions requires no specialized plugins beyond the standard Pulumi Action. Because the Pulumi Service handles the policy association, the pipeline configuration remains remarkably clean.

Below is an example of a Pull Request workflow. When a developer opens a PR, this pipeline runs a `preview`. If any **Mandatory** policies are violated, the Pulumi CLI exits with a non-zero status code, which subsequently fails the GitHub Action step and blocks the PR from being merged.

```yaml
name: Infrastructure Preview & Policy Check

on:
  pull_request:
    branches:
      - main

jobs:
  preview:
    name: Preview and Validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x

      - name: Install Dependencies
        run: npm install

      - name: Pulumi Preview (Evaluates Policies)
        uses: pulumi/actions@v4
        with:
          command: preview
          stack-name: organization/my-app/staging
          # The Pulumi Service automatically applies active 
          # Policy Packs during this preview phase.
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Handling Violations in the Pipeline

When a pipeline fails due to a policy violation, developer experience is paramount. A failed build with an obscure error message creates friction and slows down delivery. CrossGuard is designed to output clear, actionable remediation steps directly into the CI logs.

A typical failure log in your CI system will look like this:

```text
Previewing update (staging)

View Live: https://app.pulumi.com/organization/my-app/staging/previews/1a2b3c4d

     Type                 Name           Plan       Info
 +   pulumi:pulumi:Stack  my-app-staging create     1 error
 +   └─ aws:s3:Bucket     data-bucket    create     

Diagnostics:
  pulumi:pulumi:Stack (my-app-staging):
    error: preview failed

Policy Violations:
    [mandatory]  aws-security-pack v1.2.0 (s3-no-public-read)
    S3 Bucket 'data-bucket' has a public ACL (public-read). Buckets must be strictly private.
    Remediation: Change the 'acl' property to 'private' in your bucket definition.
```

If the policy violated is categorized as **Advisory**, the `pulumi preview` will complete successfully (returning a zero exit code), allowing the pipeline to pass. However, the warnings will still be clearly printed in the CI logs and recorded in the Pulumi Console, allowing security teams to audit non-breaking infractions.

### The Policy Pack Lifecycle

It is crucial to treat your Policy Packs with the same engineering rigor as your application and infrastructure code. The Policy Packs themselves should have their own CI/CD pipeline.

1.  **Testing:** When a security engineer updates a policy rule, a CI pipeline should run unit tests against mock infrastructure resources to ensure the rule behaves as expected.
2.  **Publishing:** Once the PR for the policy update is approved, the CD pipeline runs `pulumi policy publish`, pushing a new, versioned artifact to the Pulumi Service.
3.  **Enforcement Groups:** The Pulumi Service allows you to configure which Policy Packs apply to which stacks (e.g., applying PCI-DSS compliance policies only to stacks tagged with `environment: production` and `data: sensitive`).

By decoupling the lifecycle of policies from the lifecycle of the infrastructure, organizations can iterate on security requirements dynamically, ensuring that all subsequent infrastructure deployments are instantly measured against the most up-to-date corporate standards.