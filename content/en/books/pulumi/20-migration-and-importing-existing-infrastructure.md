Transitioning to Pulumi is rarely a greenfield endeavor. Most teams already manage existing cloud resources via manual "ClickOps," scripts, or legacy tools like Terraform. This chapter tackles the practical realities of adopting Pulumi in brownfield environments. We will explore proven adoption strategies, demonstrate how to bring untracked resources under management without downtime using `pulumi import`, detail the automated conversion of Terraform code, and establish techniques for reconciling state drift when manual interventions inevitably occur. Welcome to the real-world operational shift of Infrastructure as Code.

## 20.1 Strategies for Adopting Pulumi

Transitioning to a new Infrastructure as Code (IaC) paradigm is rarely a "big bang" event. In established enterprise environments, rewriting thousands of lines of Terraform, CloudFormation, or ARM templates into Pulumi overnight is neither practical nor inherently valuable. Instead, successful adoption requires a calculated strategy that mitigates risk, proves value early, and respects the existing organizational inertia.

Organizations typically adopt Pulumi through one of four strategic pathways, often progressing from one to the next as maturity increases.

### 1. The Greenfield Approach (The Pilot Phase)

The lowest-risk strategy for introducing Pulumi is to restrict its use to entirely new projects. This allows teams to familiarize themselves with the programming model, state management, and CI/CD integrations without the pressure of touching mission-critical, legacy infrastructure.

* **Best for:** Organizations with a high volume of net-new microservices or cloud migrations.
* **Execution:** Identify an upcoming project that requires a discrete infrastructure stack. Build it entirely in Pulumi, utilizing standard programming languages to write the infrastructure, tests (as covered in Chapter 17), and deployment pipelines.
* **Outcomes:** This strategy generates a reference architecture and internal documentation, serving as a template for future projects.

### 2. The Coexistence Model (Boundary Definition)

In the Coexistence Model, Pulumi is introduced into an environment that already relies heavily on another IaC tool. Rather than replacing the legacy tool, Pulumi operates alongside it, with clear architectural boundaries defining the responsibilities of each.

A common implementation of this strategy is the **Core vs. Application** split:
* **Legacy IaC (e.g., Terraform):** Maintains the foundational network infrastructure (VPCs, Transit Gateways, foundational IAM roles).
* **Pulumi:** Manages application-specific infrastructure (ECS clusters, Lambda functions, API Gateways, application-specific databases).

To make this work, Pulumi must dynamically read the state of the existing infrastructure. Because Pulumi supports native cloud data source lookups, you do not need to import the Terraform state directly; you simply query the cloud provider for the existing resources.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Strategy: Read existing infrastructure provisioned by another IaC tool
// We fetch an existing VPC and Subnets based on tags managed by Terraform
const coreVpc = aws.ec2.getVpcOutput({
    tags: {
        Environment: "production",
        ManagedBy: "terraform",
    },
});

const appSubnets = aws.ec2.getSubnetsOutput({
    filters: [{
        name: "vpc-id",
        values: [coreVpc.id],
    }],
    tags: {
        Tier: "application",
    },
});

// Provision new Pulumi-managed resources inside the legacy VPC
const appSecurityGroup = new aws.ec2.SecurityGroup("app-sg", {
    vpcId: coreVpc.id,
    description: "Managed by Pulumi",
    ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
});
```

### 3. The Strangler Fig Pattern

Adapted from software modernization techniques, the Strangler Fig pattern involves gradually wrapping and replacing legacy infrastructure components until the old system can be safely decommissioned. 

Instead of rewriting everything, you import existing resources into Pulumi state (detailed in Section 20.2) one architectural layer at a time. 

```text
Migration Flow: The Strangler Fig Pattern

Phase 1: Pure Coexistence
[ Legacy IaC (100%) ]  <--- No Pulumi presence

Phase 2: Edge Takeover
[ Legacy IaC (80%)  ]  <--- DNS, CDNs, and API Gateways imported to Pulumi (20%)

Phase 3: Compute Replacement
[ Legacy IaC (40%)  ]  <--- App Servers, Serverless, and K8s imported to Pulumi (60%)

Phase 4: Complete Assimilation
[ Decommissioned    ]  <--- Core Data and Networking imported. Pulumi (100%)
```

This strategy is highly methodical. You might start by importing only the CDN and DNS layers, managing routing via Pulumi. Once stable, you import the compute layer. Finally, you tackle the most sensitive layer: stateful data storage and core networking.

### 4. The Platform Engineering Strategy (Self-Service)

For large enterprises, the goal of adopting Pulumi isn't just to change the syntax of their IaC; it's to change *who* provisions infrastructure. The Platform Engineering strategy shifts infrastructure provisioning left to the application developers, using Pulumi as the invisible engine.

In this strategy, the central cloud team does not force developers to write raw Pulumi infrastructure code. Instead, they provide high-level, organizational constructs.

* **Phase 1 - Componentization:** The platform team authors opinionated `ComponentResources` (Chapter 13) that encapsulate compliance, tagging, and security defaults.
* **Phase 2 - Distribution:** These components are packaged and distributed via internal package managers (npm, PyPI) (Chapter 16).
* **Phase 3 - Abstraction:** Using the Automation API (Chapter 19), the platform team builds internal developer portals (IDPs) or CLI tools. Application developers simply request a "Standard Microservice Workspace" via a web form or internal CLI, and the Pulumi Automation API provisions it in the background.

By adopting this strategy, the organization benefits from the power of general-purpose programming languages without requiring every developer to become an infrastructure expert.

## 20.2 Using `pulumi import` for Brownfield Projects

A "brownfield" project is any environment where infrastructure already exists. This infrastructure might have been provisioned manually via the cloud provider's web console (often colloquially referred to as "ClickOps"), created by custom bash scripts, or managed by a legacy tool that the organization is moving away from. 

The primary challenge in a brownfield scenario is bringing these existing, untracked resources under Pulumi's management *without* destroying and recreating them. Recreating stateful resources like databases or core networking components usually means unacceptable downtime or data loss. 

To solve this, Pulumi provides the `pulumi import` command.

### The Import Workflow

When you import a resource, Pulumi performs two critical actions simultaneously:
1. **State Acquisition:** It queries the cloud provider for the current configuration of the physical resource and saves this baseline into the Pulumi state file.
2. **Code Generation:** It analyzes the physical resource and automatically generates the corresponding Pulumi code (in your chosen language) required to manage it moving forward.

```text
The Import Data Flow
====================

[ Physical Cloud Resource ] ---> ( e.g., AWS RDS Instance "prod-db" )
             |
             |  1. API Read Request
             v
      ( pulumi import )
             |
             +----------------------------------+
             |                                  |
             | 2a. Update State                 | 2b. Generate Code
             v                                  v
 [ Pulumi State File ]               [ index.ts / __main__.py ]
 (Resource is now tracked)           (Resource definition created)
```

### Method 1: Single Resource CLI Import

For importing individual resources, you can use the CLI directly. The command requires three key pieces of information:

1. **Type Token:** The Pulumi resource type (e.g., `aws:ec2/vpc:Vpc`).
2. **Logical Name:** The name you want to give the resource *inside* your Pulumi program.
3. **Physical ID:** The unique identifier assigned to the resource by the cloud provider (e.g., `vpc-0a1b2c3d4e5f6g7h8`).

**Example: Importing an existing AWS S3 bucket**

```bash
# Syntax: pulumi import [Type-Token] [Logical-Name] [Physical-ID]

pulumi import aws:s3/bucket:Bucket my-legacy-bucket existing-bucket-name-123
```

When you run this command, Pulumi reaches out to AWS, reads the configuration for `existing-bucket-name-123`, adds it to your current stack's state, and outputs the generated code directly to your terminal. It will prompt you to automatically append this generated code to your project file.

### Method 2: Bulk Import via Manifest

Importing dozens or hundreds of resources one by one via the CLI is tedious and error-prone. For larger brownfield migrations, Pulumi supports bulk importing using a JSON manifest file.

First, you author an `import.json` file detailing all the resources you wish to bring under management:

```json
{
    "resources": [
        {
            "type": "aws:ec2/vpc:Vpc",
            "name": "core-vpc",
            "id": "vpc-0123456789abcdef0"
        },
        {
            "type": "aws:ec2/subnet:Subnet",
            "name": "public-subnet-1",
            "id": "subnet-0abcdef1234567890"
        },
        {
            "type": "aws:rds/instance:Instance",
            "name": "production-db",
            "id": "prod-db-identifier"
        }
    ]
}
```

Then, you execute the import command, passing the file as an argument and directing the generated code into a new file:

```bash
pulumi import -f import.json --out imported_infra.ts
```

This approach is highly programmable. Many teams write simple scripts to query their cloud provider for a list of resource IDs and output the required `import.json` format, completely automating the first phase of their Pulumi migration.

### The "Zero Diff" Verification

The final and most crucial step of importing brownfield infrastructure is verifying that the generated code perfectly matches reality. 

After you have integrated the generated code into your Pulumi project, you must run `pulumi preview`. 

Because the code was generated based on the actual state of the cloud resources, the preview should indicate that **0 resources will be created, updated, or deleted**. 

```bash
$ pulumi preview
Previewing update (dev):
     Type                 Name          Plan       
     pulumi:pulumi:Stack  my-app-dev               
     
Resources:
    3 unchanged
```

If `pulumi preview` attempts to modify the imported resources, it means there is a mismatch between the generated code and the required state, or the provider's API returned default values during the import that you do not want to explicitly define in your code. You must adjust your Pulumi code until the preview shows a clean, zero-diff execution before ever running `pulumi up`. Once you achieve a zero-diff preview, the brownfield resources are successfully under Pulumi's full control.

## 20.3 Converting Terraform to Pulumi (tf2pulumi)

While the `pulumi import` workflow discussed in the previous section is excellent for bringing existing physical resources into Pulumi, it still requires you to write the target Pulumi code by hand. If your organization has already invested heavily in Terraform, you likely have thousands of lines of HCL (HashiCorp Configuration Language) that you want to reuse. 

To accelerate this specific migration path, Pulumi provides automated conversion tools to translate existing Terraform code directly into Pulumi programs.

### The Evolution of `tf2pulumi`

Historically, Pulumi provided a standalone CLI tool called `tf2pulumi` to handle HCL translation. As the ecosystem matured, this functionality was integrated directly into the core Pulumi CLI. Today, the modern approach utilizes the `pulumi convert` command with the Terraform plugin. However, the underlying concept and the community's shorthand reference to this process remain synonymous with "tf2pulumi."

### The Dual Migration Strategy

Migrating from Terraform to Pulumi is not a single action; it is a parallel process. You must migrate both the **Configuration** (the code) and the **State** (the database of managed resources).

```text
The Terraform to Pulumi Migration Path
======================================

Track 1: Configuration Migration
[ Terraform HCL Code ] --------( pulumi convert )--------> [ Pulumi Code (TS, Python, Go, etc.) ]
                                                                           |
                                                                           v
                                                            ( Manual Refactoring & Optimization )

Track 2: State Migration
[ Terraform State File ] --( pulumi import / state tools )--> [ Pulumi State File ]
```

### Track 1: Converting the Code

To convert an existing Terraform module or project, you navigate to the directory containing your `.tf` files and execute the convert command, specifying your target programming language:

```bash
# Convert Terraform HCL to Pulumi TypeScript
pulumi convert --from terraform --language typescript --out ./pulumi-project
```

The conversion engine parses the HCL syntax, maps the Terraform providers to their corresponding Pulumi providers, and generates idiomatic code in the target language.

**Example Conversion:**

*Terraform HCL (`main.tf`):*
```hcl
resource "aws_s3_bucket" "b" {
  bucket = "my-tf-test-bucket"

  tags = {
    Name        = "My bucket"
    Environment = "Dev"
  }
}

output "bucket_name" {
  value = aws_s3_bucket.b.id
}
```

*Generated Pulumi TypeScript (`index.ts`):*
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const b = new aws.s3.Bucket("b", {
    bucket: "my-tf-test-bucket",
    tags: {
        Name: "My bucket",
        Environment: "Dev",
    },
});

export const bucketName = b.id;
```

### Track 2: Migrating the State

Converting the code does not automatically transfer the management of the resources. If you run `pulumi up` on the newly generated code without migrating the state, Pulumi will attempt to create duplicate resources, which will likely fail due to naming conflicts.

To bring the existing physical resources under the control of the new Pulumi code, you must migrate the state. You can achieve this by using the bulk import strategy detailed in Section 20.2, reading the resource IDs from your Terraform state and generating an `import.json` manifest.

Alternatively, for smaller stacks, you can use the targeted import command directly matching the logical names generated by the conversion tool.

### The Limitations of Automated Conversion

Automated conversion is a massive time-saver, but it is rarely a 100% perfect, production-ready solution out of the box. It is vital to understand what the converter *cannot* do:

1. **It performs transliteration, not architectural refactoring:** The converter maps HCL constructs directly to their closest programming language equivalents. If your Terraform code uses `count` or `for_each` loops, the generated Pulumi code will replicate that exact logic, often resulting in complex mapping functions rather than clean, native `for` loops in Python or TypeScript.
2. **Loss of comments:** Depending on the complexity of the parsing, inline comments in the HCL may not perfectly migrate to the resulting Pulumi code.
3. **Module translation:** Complex, deeply nested Terraform modules can be challenging to convert perfectly. The converter will attempt to create equivalent Pulumi `ComponentResources`, but these often require manual tweaking to ensure the inputs and outputs align correctly.

### The "Day 2" Refactoring Phase

Because of these limitations, `pulumi convert` should be viewed as the *starting point* of your migration, not the finish line. 

Once you have a zero-diff deployment (meaning your Pulumi code matches reality and your state is migrated), you should immediately begin refactoring. Replace clunky HCL-style loops with native programming constructs (like `map` and `filter` in TypeScript), encapsulate repetitive resource blocks into reusable classes or functions, and implement standard error handling. This ensures you are actually leveraging the power of general-purpose programming languages, rather than just writing Terraform syntax in a different file extension.

## 20.4 Reconciling State Drifts and Manual Changes

No matter how strictly an organization mandates the use of Infrastructure as Code, "ClickOps" happens. During a severe outage, an engineer might log directly into the AWS Console to open a security group port, scale up a database instance, or manually flush a queue. 

When physical infrastructure is modified outside of Pulumi's execution cycle, it creates a condition known as **State Drift**. Reconciling this drift—bridging the gap between what your code says, what your state file remembers, and what actually exists in the cloud—is a critical day-to-day operational task.

### The Anatomy of State Drift

To understand how to fix drift, you must first understand the three layers of truth in Pulumi:

1.  **Desired Truth:** Your Pulumi code (e.g., TypeScript, Python).
2.  **Recorded Truth:** The Pulumi state file (managed by Pulumi Service or a self-managed backend).
3.  **Actual Truth:** The physical configuration running in the cloud provider.

Drift occurs when the Actual Truth diverges from the Recorded Truth. 

```text
State Drift Scenario
====================

1. Normal State:
[ Code: Port 80 ] ===> [ State: Port 80 ] ===> [ Cloud: Port 80 ]

2. Out-of-Band Manual Intervention:
[ Code: Port 80 ]      [ State: Port 80 ] =/=> [ Cloud: Port 443 ]  <-- DRIFT

3. The Danger (Next `pulumi up`):
Pulumi compares Code to State, sees no changes, but may fail or 
inadvertently overwrite the Cloud back to Port 80 without warning.
```

### Detecting Drift with `pulumi refresh`

The primary tool for diagnosing drift is the `pulumi refresh` command. 

Unlike `pulumi up`, which pushes changes *to* the cloud, `pulumi refresh` pulls changes *from* the cloud. It queries the cloud provider APIs for every resource currently tracked in your state file and updates the state file to match reality.

```bash
# Update the state file to match the physical infrastructure
pulumi refresh
```

**Crucially, `pulumi refresh` does not alter your code.** After running a refresh, your State matches the Cloud, but your Code is now out of sync. 

If you run `pulumi preview` immediately after a refresh that detected drift, Pulumi will show a diff indicating that it wants to change the cloud resources back to match your code.

### The Reconciliation Decision

Once you have identified drift, you face a binary choice. You must align the Code and the Cloud, and the direction you choose depends entirely on *why* the manual change occurred.

#### Strategy 1: Eradicate the Drift (Reality Conforms to Code)
If the manual change was unauthorized, a mistake, or a temporary fix that is no longer needed, you want to revert the infrastructure back to its codified baseline.

1. Run `pulumi refresh` to ensure the state is aware of the rogue changes.
2. Run `pulumi up`. Pulumi will calculate the difference between your code (the desired state) and the refreshed state (the drifted reality) and apply the necessary modifications to revert the physical resources back to what is defined in code.

#### Strategy 2: Absorb the Drift (Code Conforms to Reality)
If the manual change was a necessary hotfix (e.g., scaling up a database to handle a traffic spike) and needs to become the new permanent baseline, you must update your code to match the new reality.

1. Run `pulumi refresh` to update the state.
2. Run `pulumi preview`. Analyze the diff to see exactly what parameters Pulumi wants to revert.
3. Modify your Pulumi code (e.g., change `allocatedStorage: 50` to `allocatedStorage: 100`).
4. Run `pulumi preview` again. Repeat step 3 until the preview shows a "zero diff" (0 resources to update).
5. The drift is now successfully absorbed, and your code is the single source of truth once again.

*Tip: You can combine the refresh and update steps by running `pulumi up --refresh`. This instructs Pulumi to automatically refresh the state before calculating the deployment plan, ensuring you are always operating on the most accurate data.*

### Automating Drift Detection

In mature enterprise environments, drift detection should not rely on an engineer remembering to run a command. It should be automated.

The standard pattern is to configure a scheduled CI/CD job (e.g., a nightly GitHub Action or GitLab Pipeline) that executes a programmatic drift check. 

```yaml
# Example snippet for a GitHub Action Drift Detector
name: Nightly Drift Detection
on:
  schedule:
    - cron: '0 0 * * *' # Run at midnight daily
jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pulumi/actions@v4
        with:
          command: preview
          # The --refresh flag ensures we check against actual cloud state
          # The --expect-no-changes flag forces a non-zero exit code (failure) if drift exists
          args: --refresh --expect-no-changes
```

If the pipeline fails, it means someone has manually altered the infrastructure. The pipeline can then automatically trigger an alert to a Slack or Microsoft Teams channel via webhooks, notifying the platform team that an unauthorized change requires reconciliation.

### Preventing Drift at the Source

While reconciling drift is necessary, preventing it is the ultimate goal. As your organization matures its Pulumi adoption, you should gradually revoke manual write access to cloud environments.

1. **Read-Only Console Access:** Grant developers "ViewOnly" or "ReadOnly" roles in the AWS/Azure/GCP console.
2. **Break-Glass Roles:** Implement privileged IAM roles that *can* make manual changes, but require an audited checkout process (like HashiCorp Vault or AWS IAM Identity Center temporary credentials) and trigger immediate alerts to security teams when assumed.
3. **Shift Access to the Pipeline:** Make the CI/CD pipeline the only entity with persistent administrative credentials to the cloud environment. If developers need to change infrastructure, they must do so via a Pull Request to the Pulumi code.