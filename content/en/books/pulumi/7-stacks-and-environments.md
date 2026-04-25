Transitioning from a single local deployment to a robust, enterprise-grade cloud architecture requires a systematic approach to managing multiple environments. In Pulumi, this is achieved through Stacks. A Stack is an isolated, independently configurable instance of your Pulumi program, allowing you to deploy the exact same infrastructure code to Development, Staging, and Production with tailored configurations. In this chapter, we will explore how to architect multi-environment deployments, securely share data between independent stacks using Stack References, organize deployments with metadata, and align your Pulumi workflows with Git branching strategies.

## 7.1 Managing Multiple Environments (Dev, Staging, Prod)

In modern infrastructure management, a single deployment target is rarely sufficient. Teams require isolated environments to safely develop, test, and release software. A standard progression typically includes Development (Dev), Staging (or Pre-Production), and Production (Prod). 

In Pulumi, the relationship between your infrastructure code and your deployed environments is governed by the separation of **Projects** and **Stacks**. As established in earlier chapters, a Pulumi Project contains your program (the blueprint), while a Stack represents a distinct, independently configurable instance of that program. Therefore, the idiomatic way to manage multiple environments in Pulumi is by mapping each environment to a unique Stack.

```text
+-------------------------------------------------------------+
|                   Pulumi Project: "core-api"                |
|                    (Infrastructure as Code)                 |
+-------------------------------------------------------------+
          |                      |                      |
          v                      v                      v
+------------------+   +------------------+   +------------------+
|   Stack: "dev"   |   | Stack: "staging" |   |   Stack: "prod"  |
+------------------+   +------------------+   +------------------+
| Config:          |   | Config:          |   | Config:          |
| - size: t3.micro |   | - size: t3.small |   | - size: m5.large |
| - count: 1       |   | - count: 2       |   | - count: 5       |
| - multiAZ: false |   | - multiAZ: true  |   | - multiAZ: true  |
+------------------+   +------------------+   +------------------+
          |                      |                      |
          v                      v                      v
  [ Sandbox Account ]     [ Pre-Prod Account ]    [ Production Account ]
```

### The Data-Driven Environment Strategy

When provisioning multiple environments using the same codebase, the primary goal is to maximize code reuse while accommodating the necessary variations between environments (e.g., smaller instances in Dev to save costs, high availability configurations in Prod). 

A common anti-pattern is writing imperative conditional logic based directly on the stack's name:

```typescript
// Anti-pattern: Hardcoding environment logic
import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();
let instanceSize = "t3.micro";

if (stack === "prod") {
    instanceSize = "m5.large";
} else if (stack === "staging") {
    instanceSize = "t3.small";
}
```

While functional, this approach tightly couples your code to specific stack names, making it difficult to spin up ephemeral environments (e.g., `pr-123-env`) or clone configurations. Instead, you should utilize the Pulumi Configuration system to adopt a **data-driven approach**. The code remains declarative and environment-agnostic, relying on the stack's specific configuration file (`Pulumi.<stack-name>.yaml`) to dictate behavior.

#### Example: Configuring Stacks

First, define the parameters for your environments in their respective configuration files:

**`Pulumi.dev.yaml`**
```yaml
config:
  core-api:instanceSize: t3.micro
  core-api:minInstances: 1
  core-api:enableDeletionProtection: false
```

**`Pulumi.prod.yaml`**
```yaml
config:
  core-api:instanceSize: m5.large
  core-api:minInstances: 5
  core-api:enableDeletionProtection: true
```

#### Example: Implementing Environment-Agnostic Code

Next, read these values within your Pulumi program. The program does not need to know *which* stack is currently active; it only needs to fulfill the configuration contract provided to it.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();

// Retrieve configuration with safe defaults
const instanceSize = config.get("instanceSize") || "t3.micro";
const minInstances = config.getNumber("minInstances") || 1;
const isProtected = config.getBoolean("enableDeletionProtection") || false;

// The infrastructure scales and secures itself based purely on config
const appCluster = new aws.ecs.Cluster("app-cluster", {
    settings: [
        {
            name: "containerInsights",
            // Enable insights only if we have strict protection enabled (e.g., Prod)
            value: isProtected ? "enabled" : "disabled", 
        },
    ],
});

export const clusterName = appCluster.name;
```

### Isolating Environments

Beyond sizing and scaling, security isolation is critical when managing multiple environments. A misconfiguration in `dev` must never have the capacity to impact `prod`. 

You can achieve strict physical isolation by deploying different stacks into completely separate cloud accounts (e.g., AWS Accounts, Azure Subscriptions, or GCP Projects). This is managed by configuring the cloud provider credentials uniquely per stack.

Instead of relying on a global environment variable (like `AWS_PROFILE`), you can encode the target account directly into the stack configuration:

**`Pulumi.prod.yaml`**
```yaml
config:
  aws:profile: production-admin-role
  aws:region: us-east-1
```

By binding the provider configuration to the stack file, running `pulumi up --stack prod` guarantees that Pulumi will assume the `production-admin-role`, preventing accidental deployments of production infrastructure into a staging environment due to human error on the local developer machine.

### Environment Parity

Maintaining environment parity—ensuring that Dev, Staging, and Prod are as similar as possible—is a core tenet of Infrastructure as Code. Staging should act as a true dress rehearsal for Production. 

To maintain this parity using Pulumi:
1. **Minimize Structural Differences:** Dev and Prod should run the same architectural components. If Prod uses a load balancer, Dev should ideally use one too, even if it's only routing traffic to a single container.
2. **Abstract Complexity:** If specific resources are genuinely unnecessary in lower environments (e.g., a complex Web Application Firewall), encapsulate them within custom `ComponentResources` (covered in Chapter 13) so the main execution flow remains clean and consistent. 
3. **Validate Pre-Flight:** Utilize `pulumi preview` heavily when migrating changes up the environment chain to catch drift or configuration mismatches before they are applied to staging or production.

## 7.2 Stack References for Cross-Stack Communication

As your infrastructure grows, managing everything within a single Pulumi stack quickly becomes an anti-pattern. A monolithic stack increases deployment times, widens the blast radius of a failed update, and makes it difficult for multiple teams to collaborate safely. The solution is to decompose your infrastructure into smaller, independently manageable stacks—often referred to as "micro-stacks" or layered architecture.

For example, a dedicated networking team might manage the core Virtual Private Cloud (VPC) and subnets in one stack, while product teams deploy their application stacks into that VPC. However, for the application stack to place a container or a database in the correct network, it needs to know the VPC and Subnet IDs generated by the networking stack.

This is where **Stack References** come into play. A Stack Reference allows one Pulumi stack to securely read the exported outputs of another stack.

```text
+-------------------------+                                     +-------------------------+
|    Stack: core-infra    |          Stack Reference            |    Stack: web-app       |
|  (Networking, IAM, DBs) | ==================================> |   (ECS, Lambda, API)    |
|                         |  (Exports: vpcId, publicSubnets)    |                         |
+-------------------------+                                     +-------------------------+
```

### Exporting Values from a Stack

For a stack to share information, it must explicitly `export` it. In Pulumi, exporting a value makes it part of the stack's state file, rendering it queryable by the CLI (`pulumi stack output`) and accessible to other stacks via references.

Here is an example of a foundational networking stack exporting its critical identifiers:

**Project: `core-infra` | Stack: `dev`**
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create a foundational VPC
const mainVpc = new aws.ec2.Vpc("main-vpc", {
    cidrBlock: "10.0.0.0/16",
});

// Create a public subnet
const publicSubnet = new aws.ec2.Subnet("public-subnet", {
    vpcId: mainVpc.id,
    cidrBlock: "10.0.1.0/24",
});

// Export the IDs so other stacks can consume them
export const vpcId = mainVpc.id;
export const publicSubnetId = publicSubnet.id;
```

### Consuming Values with `StackReference`

To consume these exported values in a dependent stack, you instantiate a `StackReference`. You must provide the fully qualified name of the target stack, which follows the format: `<organization>/<project>/<stack>`. 

If you are using the Pulumi Service backend, your organization is your Pulumi username or your enterprise organization name. If you are using a self-managed backend (like S3), the format is simply `<project>/<stack>`.

Here is how the application stack retrieves the network IDs:

**Project: `web-app` | Stack: `dev`**
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
// Read the target environment (e.g., 'dev', 'staging', 'prod')
const env = pulumi.getStack(); 

// 1. Create the Stack Reference
// Assuming organization name is 'my-org'
const infraStack = new pulumi.StackReference(`my-org/core-infra/${env}`);

// 2. Extract the outputs
// We use requireOutput to ensure the deployment fails fast if the value is missing
const vpcId = infraStack.requireOutput("vpcId");
const subnetId = infraStack.requireOutput("publicSubnetId");

// 3. Use the referenced values in new resources
const webSecurityGroup = new aws.ec2.SecurityGroup("web-sg", {
    vpcId: vpcId, // Passed as a Pulumi Output<string>
    ingress: [{
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

const webServer = new aws.ec2.Instance("web-server", {
    instanceType: "t3.micro",
    ami: "ami-0c55b159cbfafe1f0", // Amazon Linux 2 (Example)
    subnetId: subnetId,           // Passed as a Pulumi Output<string>
    vpcSecurityGroupIds: [webSecurityGroup.id],
});
```

### `getOutput` vs. `requireOutput`

When accessing data from a `StackReference`, Pulumi provides two primary methods:
* **`getOutput("key")`**: Returns an `Output<any>`. If the key does not exist in the target stack, it returns an output containing `undefined`. This is useful for optional configurations.
* **`requireOutput("key")`**: Returns an `Output<any>`. If the key does not exist, the Pulumi program immediately throws an error and halts the deployment. This is the recommended approach for required dependencies, as it prevents resources from being provisioned with invalid configurations.

### Handling Secrets Across Stacks

Pulumi's secrets management extends seamlessly to Stack References. If a base stack exports a value marked as a secret (e.g., a database password), the Pulumi engine automatically encrypts it in the state file. 

When a dependent stack reads that secret via a `StackReference`, Pulumi keeps the value encrypted in memory and propagates its secret status to any downstream resources that use it. You do not need to write additional decryption logic; Pulumi handles the secure handoff natively.

### Best Practices for Cross-Stack Communication

1.  **Loose Coupling:** Only export the absolute minimum required data. Exporting complete resource objects or massive configuration blocks tightly couples stacks together, making it harder to refactor the base stack later. Export IDs, ARNs, and connection strings.
2.  **Avoid Circular Dependencies:** Stack A cannot depend on Stack B if Stack B also depends on Stack A. Design your stack architecture as a Directed Acyclic Graph (DAG), typically flowing from Core Infrastructure $\rightarrow$ Data Persistence $\rightarrow$ Application Services.
3.  **Treat Exports as APIs:** Once another stack is consuming an exported value, changing the name or data type of that export is a breaking change. Manage your stack exports with the same care you would apply to a public API.

## 7.3 Stack Tags and Metadata

As an organization adopts Pulumi, the number of stacks can multiply rapidly. A microservices architecture deployed across multiple environments (Dev, Staging, Prod) and multiple regions can quickly result in hundreds of individual stacks. Without a rigorous organizational system, discovering stacks, tracking ownership, and auditing deployments becomes an operational nightmare.

Pulumi addresses this through **Stack Tags** and **Metadata**—a system of key-value pairs associated with a stack's state.

### Understanding Stack Tags vs. Resource Tags

Before diving into implementation, it is crucial to distinguish between the two primary types of tagging you will encounter:

1.  **Stack Tags (Pulumi Metadata):** These are key-value pairs attached to the Stack object *within the Pulumi Backend* (e.g., Pulumi Cloud). They help you organize, search, and filter stacks within the Pulumi Console or via the Pulumi CLI. They do not directly affect the cloud resources.
2.  **Resource Tags (Cloud Metadata):** These are key-value pairs applied directly to the infrastructure components within your cloud provider (e.g., AWS EC2 tags, Azure Resource Group tags). They are used for cloud cost allocation, compliance monitoring, and operational routing.

A mature Infrastructure as Code strategy bridges these two concepts: using Stack Tags to organize the deployment pipelines, and propagating that stack metadata down into Resource Tags for cloud billing.

```text
+-------------------------------------------------+
|               Pulumi Cloud Backend              |
|                                                 |
|  Stack: "checkout-service-prod"                 |
|  Tags: { owner: "team-alpha", env: "prod" }     | <--- Stack Tags
+-------------------------------------------------+
                         |
      (pulumi up reads stack context and applies)
                         |
                         v
+-------------------------------------------------+
|                  AWS Environment                |
|                                                 |
|  Resource: DynamoDB Table                       |
|  Tags: { Owner: "team-alpha", Env: "prod" }     | <--- Resource Tags
+-------------------------------------------------+
```

### Managing Stack Tags

Stack tags can be managed manually via the CLI or automated through your CI/CD pipelines.

#### Setting Tags via the CLI

You can attach tags to the currently active stack using the `pulumi stack tag set` command. This is useful for defining static ownership or routing information.

```bash
# Set an ownership tag
pulumi stack tag set department "platform-engineering"

# Set a compliance tier tag
pulumi stack tag set data-classification "pci-sensitive"

# List all tags for the current stack
pulumi stack tag ls
```

Once set, these tags become searchable in the Pulumi Cloud Console, allowing you to filter your view to only show stacks owned by `platform-engineering` or those handling `pci-sensitive` data.

#### Automated CI/CD Metadata

When you execute `pulumi up` within a recognized CI/CD environment (like GitHub Actions, GitLab CI, or Jenkins), Pulumi automatically captures relevant metadata and applies it as Stack Tags. These built-in tags typically include:

* **VCS Information:** The Git repository URL, commit hash, and branch name.
* **CI System Information:** The name of the CI system and the ID of the specific workflow run.
* **Pull Request Details:** If the run was triggered by a PR, the PR number and author.

This automatic metadata is invaluable for auditing. If a production stack begins failing, a platform engineer can look at the Pulumi Stack Tags, immediately identify the exact Git commit that triggered the update, and click directly through to the corresponding Pull Request.

### Propagating Metadata to Cloud Resources

The most powerful use of stack metadata is utilizing it within your Pulumi program to automatically tag your underlying cloud resources. This ensures that every resource provisioned by a stack accurately reflects its environment, project, and ownership, guaranteeing accurate cost attribution.

Instead of manually adding tags to every single resource, you can define **Default Tags** at the provider level. 

Here is how you can dynamically pull stack metadata and apply it universally to AWS resources:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// 1. Retrieve current stack and project metadata
const projectName = pulumi.getProject();
const stackName = pulumi.getStack();

// 2. Define standard tags based on this metadata
const standardTags = {
    "managed-by": "pulumi",
    "pulumi-project": projectName,
    "pulumi-stack": stackName,
    "environment": stackName.includes("prod") ? "production" : "development",
};

// 3. Configure the AWS Provider to apply these tags globally
const awsProvider = new aws.Provider("aws-provider", {
    region: "us-east-1",
    defaultTags: {
        tags: standardTags,
    },
});

// 4. Provision resources using the customized provider
// This bucket will automatically receive the standardTags without explicit declaration
const dataBucket = new aws.s3.Bucket("data-bucket", {}, { provider: awsProvider });

export const bucketName = dataBucket.bucket;
```

#### Global Resource Transformations

Not all cloud providers support a `defaultTags` argument natively at the provider level. In such cases, or when you need more granular control over how tags are merged (e.g., overriding a default tag on a specific resource), you can use **Resource Transformations**.

A resource transformation is a callback invoked by the Pulumi engine for every resource before it is registered. This allows you to programmatically inject tags across the entire stack:

```typescript
import * as pulumi from "@pulumi/pulumi";

// Define the transformation function
const applyStandardTags: pulumi.ResourceTransformation = (args) => {
    const defaultTags = {
        "pulumi-stack": pulumi.getStack(),
        "managed-by": "pulumi"
    };

    // Merge existing tags with default tags
    const mergedTags = { ...defaultTags, ...(args.props["tags"] || {}) };
    
    // Mutate the resource properties
    args.props["tags"] = mergedTags;
    
    return { props: args.props, opts: args.opts };
};

// Register the transformation globally for the entire stack
pulumi.runtime.registerStackTransformation(applyStandardTags);
```

By institutionalizing Stack Tags and systematically passing them down to your cloud resources, you establish a direct lineage from a line of infrastructure code, through the CI/CD pipeline, all the way to the line items on your monthly cloud billing report.

## 7.4 Branching Strategies for Stack Management

Infrastructure as Code is most effective when it is tightly coupled with your version control system. How you structure your Git branches directly dictates how, when, and where your Pulumi stacks are deployed. Because Pulumi stores the state of your infrastructure independently of your source code, aligning your branching strategy with your stack management is essential to prevent state drift and deployment conflicts.

While application code branching strategies (like GitFlow or Trunk-Based Development) are well understood, applying them to infrastructure requires accounting for the physical reality of cloud resources. You cannot simply "merge" two databases in the cloud the way you merge two text files.

### Mapping Branches to Stacks

The most common and effective pattern is to map specific Git branches to specific Pulumi stacks. 

```text
Git Branch Lifecycle       Pulumi Stack            Target Environment
====================       ============            ==================
main / master       ==>    prod               ==>  Production Account
      |
      +-- release/* ==>    staging            ==>  Pre-Prod Account
      |
      +-- feature/* ==>    dev-<branch-name>  ==>  Sandbox Account (Ephemeral)
```

#### 1. Long-Lived Branches (Static Stacks)

Long-lived branches represent your stable environments. Typically, your `main` or `master` branch represents truth for your `production` stack. 

When adopting this mapping, standard Git protections must apply:
* **Direct commits are blocked:** No one should push directly to the branch tied to production.
* **Require passing status checks:** A Pulumi preview must succeed before a merge is allowed.
* **Code owner reviews:** Infrastructure changes should require approval from a designated platform or DevOps team.

In this model, configuration files like `Pulumi.prod.yaml` and `Pulumi.staging.yaml` are checked directly into the repository. When a commit lands on `main`, the CI/CD pipeline executes `pulumi up --stack prod`.

#### 2. Feature Branches (Ephemeral Stacks)

The true power of Pulumi's stack architecture is unlocked through **ephemeral stacks** tied to short-lived feature branches. 

Instead of multiple developers colliding in a shared `dev` environment, every Pull Request can automatically spin up its own isolated copy of the infrastructure. This allows developers to test database migrations, new API gateways, or lambda function configurations in a real cloud environment without impacting their peers.

The lifecycle of an ephemeral stack looks like this:

1. **Branch Creation:** A developer creates `feature/add-redis-cache`.
2. **Pull Request Opened:** The CI/CD pipeline detects the PR and dynamically initializes a new stack, often named after the PR number (e.g., `pr-1042`).
3. **Configuration Inheritance:** Instead of committing a `Pulumi.pr-1042.yaml` file, the pipeline dynamically copies the configuration from a baseline development stack.
4. **Provisioning:** The pipeline runs `pulumi up --stack pr-1042 --yes`.
5. **Testing:** The developer and QA team validate the changes against real cloud resources.
6. **Merge/Close:** Once the PR is merged or closed, the pipeline automatically runs `pulumi destroy --yes` and `pulumi stack rm --yes`, cleaning up the cloud resources and removing the stack from the Pulumi backend.

### Handling Stack Configurations in Branching

A common challenge when managing stacks via branches is how to handle the `Pulumi.<stack-name>.yaml` configuration files. 

If you create an ephemeral stack in a feature branch, generating a new `Pulumi.feature-x.yaml` file, you **must not** commit this file to the repository. If you do, your `main` branch will quickly become cluttered with orphaned configuration files from merged feature branches.

**Best Practice:** Add ephemeral stack patterns to your `.gitignore`.

```gitignore
# .gitignore
Pulumi.dev-*.yaml
Pulumi.pr-*.yaml
```

During your CI/CD pipeline execution for a feature branch, you can generate the required configuration on the fly using the Pulumi CLI before running the update:

```bash
# Example CI/CD Script for an Ephemeral Stack
export STACK_NAME="pr-${PULL_REQUEST_ID}"

# Initialize the stack (will not fail if it already exists)
pulumi stack select $STACK_NAME || pulumi stack init $STACK_NAME

# Copy baseline configuration from the main dev stack
pulumi config cp dev $STACK_NAME

# Dynamically set a tag for resource tracking
pulumi stack tag set "ephemeral" "true"

# Deploy
pulumi up --yes
```

### Trunk-Based Development for Infrastructure

For infrastructure management, **Trunk-Based Development** is highly recommended over complex models like GitFlow. 

In GitFlow, long-running feature branches and release branches are common. However, long-running branches in IaC inevitably lead to severe state drift. If Team A updates the base VPC configuration in `main`, and Team B has a feature branch that has been open for three weeks, Team B's infrastructure preview is operating on outdated assumptions. When Team B finally merges, their deployment may fail catastrophically because the underlying network reality has changed.

Trunk-Based Development mitigates this by enforcing small, frequent integrations directly into the main branch. 
* Changes are batched into small logical units.
* Previews (`pulumi preview`) are run on every commit to the PR to catch drift early.
* Ephemeral stacks are destroyed within days, not weeks.

By keeping branches short-lived and utilizing Pulumi's ability to rapidly spin up and tear down stacks, teams can iterate on infrastructure with the same velocity and confidence as they do with application code.