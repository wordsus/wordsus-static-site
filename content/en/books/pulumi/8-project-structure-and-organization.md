As your Pulumi usage matures from simple prototypes to enterprise infrastructure, how you organize your codebase becomes critical. Because Pulumi leverages general-purpose programming languages, it offers immense flexibility but requires software engineering discipline to prevent unmaintainable code.

In this chapter, we will explore the architectural decisions that shape your infrastructure. We will evaluate the trade-offs between monorepos and polyrepos, learn to logically modularize resources, manage dependencies across autonomous teams using Stack References, and apply robust versioning strategies to ensure deployment stability.

## 8.1 Monorepos vs. Polyrepos for Infrastructure

When organizing your Pulumi codebase, the fundamental decision of where your infrastructure code lives dictates your team's workflow, CI/CD pipelines, and access control mechanisms. Because Pulumi utilizes general-purpose programming languages, the repository structure you choose closely mirrors software development practices. 

The two primary architectural strategies for organizing your Pulumi projects are the **monorepo** (a single repository for all infrastructure) and the **polyrepo** (multiple repositories divided by domain, team, or service). 

### The Monorepo Approach

In a monorepo, all of your organization’s Pulumi projects—from base networking to application-specific resources—reside in a single version control repository. 

**Advantages:**
* **Atomic Changes:** You can make cross-cutting changes in a single commit. If a network configuration change requires an update to an application's deployment script, both can be reviewed and merged together.
* **Frictionless Code Sharing:** Sharing local helper functions or custom `ComponentResources` is as simple as importing a local module. You do not need to publish packages to external registries (like npm or PyPI) just to share logic between your networking and compute stacks.
* **Unified Tooling:** Linting, formatting, and security policies (like CrossGuard) can be applied uniformly across the entire infrastructure codebase from a single root configuration.
* **Discoverability:** Engineers have a centralized view of the entire infrastructure landscape, making it easier to search for prior art or debug cross-stack issues.

**Disadvantages:**
* **Blast Radius:** A misconfigured CI/CD pipeline in a monorepo can potentially execute a `pulumi up` or `pulumi destroy` across all projects simultaneously.
* **Pipeline Complexity:** As the repository grows, CI/CD pipelines must become intelligent enough to only trigger updates for the specific Pulumi projects that have changed. 
* **Access Control:** Granular permission management is harder. If a developer has read/write access to the repository, they typically have access to all infrastructure code, requiring you to rely heavily on branch protection rules and code owner assignments.

**Typical Monorepo Structure:**

```text
infrastructure-monorepo/
├── Pulumi.yaml                  # (Optional) Root workspace file
├── shared-components/           # Reusable ComponentResources
│   ├── index.ts
│   └── package.json
├── core-network/                # Pulumi Project: VPC, Subnets
│   ├── Pulumi.yaml
│   ├── Pulumi.dev.yaml
│   └── index.ts
├── shared-data/                 # Pulumi Project: RDS, DynamoDB
│   ├── Pulumi.yaml
│   └── index.ts
└── applications/
    ├── frontend-app/            # Pulumi Project: CDN, S3
    └── backend-api/             # Pulumi Project: ECS, Lambda
```

### The Polyrepo Approach

In a polyrepo architecture, infrastructure code is decentralized. A single repository typically maps to a single Pulumi project or a tightly coupled group of projects managed by a specific team.

**Advantages:**
* **Strict Isolation:** The blast radius is naturally contained. A syntax error or malicious commit in the `frontend-app-infra` repository cannot affect the `core-network` repository.
* **Granular Access Control:** Repository-level permissions map directly to infrastructure domains. You can grant the data team access to the database repository while restricting application developers to their specific service repositories.
* **Simplified CI/CD:** Pipelines are straightforward. A push to the `main` branch of a repository simply triggers a `pulumi up` for that specific project.
* **Independent Lifecycles:** Teams can upgrade their Pulumi CLI versions, language runtimes, or provider versions at their own pace without forcing an organization-wide migration.

**Disadvantages:**
* **Sharing Code is Harder:** To share a custom `ComponentResource` across repositories, you must version, build, and publish it to an internal package registry. 
* **Complex Refactoring:** Changing an output in a base network stack that is consumed by multiple downstream repositories requires coordinated, multi-repository pull requests.
* **Visibility Fragmentation:** It becomes difficult to see the "big picture." Tracking down how an application connects to a database might require digging through three different repositories.

**Typical Polyrepo Structure:**

```text
Repository 1: core-network-infra/
├── Pulumi.yaml
└── index.ts                     # Exports VPC ID and Subnet IDs

Repository 2: core-data-infra/
├── Pulumi.yaml
└── index.ts                     # Uses StackReference to get Subnet IDs

Repository 3: frontend-app-infra/
├── Pulumi.yaml
└── index.ts                     
```

### Bridging the Gap: StackReferences

Whether you choose a monorepo or a polyrepo, Pulumi projects rarely exist in isolation. You will frequently need to pass data from a foundational project (like a VPC) to a dependent project (like an ECS cluster). 

In a polyrepo, because the codebases do not live together, you **must** rely on Pulumi `StackReferences` to query the state of other stacks. In a monorepo, while you *could* theoretically hardcode values, using `StackReferences` remains the best practice to maintain loose coupling between your directories.

### Making the Decision

There is no one-size-fits-all answer. The ideal choice depends entirely on your organizational structure (Conway's Law):

| Consideration | Favor Monorepo | Favor Polyrepo |
| :--- | :--- | :--- |
| **Team Structure** | Single platform/DevOps team managing all infrastructure. | Multiple autonomous product teams managing their own infra. |
| **Code Sharing** | High need for shared, rapidly changing custom resources. | Standardized infrastructure; shared code changes infrequently. |
| **Security & Compliance** | Trust is high across the engineering team; RBAC is handled at the Cloud/Pulumi Service layer. | Strict regulatory requirements demand code-level isolation and strict repo access controls. |
| **CI/CD Maturity** | High (Capable of building path-based triggers and matrix builds). | Low to Medium (Prefer simple, linear pipelines). |

**Recommendation:** Start with a monorepo. It significantly lowers the barrier to entry for establishing standards, sharing code, and maintaining visibility. As your organization scales, bottlenecks emerge, and security boundaries harden, you can naturally extract specific domains (like a highly sensitive payments environment) into separate repositories using the polyrepo model.

## 8.2 Modularizing Your Pulumi Code

When you first begin using Pulumi, it is tempting to place all of your infrastructure definitions into a single entrypoint file—typically `index.ts`, `__main__.py`, or `main.go`. While this monolithic approach is perfectly fine for tutorials or prototyping, it quickly devolves into an unmaintainable "Big Ball of Mud" as your infrastructure footprint grows. 

Because Pulumi leverages general-purpose programming languages, you are not forced into proprietary templating structures to organize your code. You can—and should—use the native modularization techniques provided by your chosen language, such as functions, classes, modules, and packages.

### Language-Native Abstractions

The simplest way to modularize Pulumi code is to extract resource definitions into separate files and encapsulate them within standard functions or classes. This provides immediate benefits in readability and separation of concerns without requiring deep knowledge of Pulumi-specific internals.

Consider a typical architecture requiring a Virtual Private Cloud (VPC), a database, and an application server. Instead of a thousand-line `index.ts`, you can structure your project directories logically:

```text
my-infrastructure-project/
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── index.ts           # The main entrypoint, acting as an orchestrator
├── network/
│   └── vpc.ts         # Contains functions to create VPCs and Subnets
├── data/
│   └── database.ts    # Contains functions to provision RDS or DynamoDB
└── compute/
    └── server.ts      # Contains functions to provision EC2 or ECS
```

### Functional Modularization

When extracting infrastructure into standard functions, the best practice is to design those functions to accept configuration parameters as inputs and return the created resources (or their key attributes) as outputs. 

Here is an example in TypeScript demonstrating how to extract networking logic into a reusable module.

**1. The Module (`network/vpc.ts`)**

Instead of reading Pulumi configuration directly inside the module, pass the required values as arguments. This keeps the function pure, testable, and reusable across different contexts.

```typescript
import * as aws from "@pulumi/aws";

// Define an interface for the function inputs
export interface VpcArgs {
    cidrBlock: string;
    environmentName: string;
    publicSubnetCount: number;
}

// Return an interface containing the essential outputs
export interface VpcOutput {
    vpcId: aws.ec2.Vpc["id"];
    publicSubnetIds: aws.ec2.Subnet["id"][];
}

export function createNetwork(args: VpcArgs): VpcOutput {
    // Create the VPC
    const vpc = new aws.ec2.Vpc(`${args.environmentName}-vpc`, {
        cidrBlock: args.cidrBlock,
        enableDnsHostnames: true,
        enableDnsSupport: true,
        tags: {
            Environment: args.environmentName,
        },
    });

    const publicSubnetIds: aws.ec2.Subnet["id"][] = [];

    // Dynamically provision the requested number of subnets
    for (let i = 0; i < args.publicSubnetCount; i++) {
        const subnet = new aws.ec2.Subnet(`${args.environmentName}-pub-subnet-${i}`, {
            vpcId: vpc.id,
            cidrBlock: `10.0.${i}.0/24`, 
            mapPublicIpOnLaunch: true,
            availabilityZone: aws.getAvailabilityZonesOutput().names[i],
        });
        publicSubnetIds.push(subnet.id);
    }

    return {
        vpcId: vpc.id,
        publicSubnetIds: publicSubnetIds,
    };
}
```

**2. The Orchestrator (`index.ts`)**

Your main entrypoint now transforms from a dense script into a high-level architectural blueprint. It handles reading the configuration and orchestrating the modules.

```typescript
import * as pulumi from "@pulumi/pulumi";
import { createNetwork } from "./network/vpc";
import { createDatabase } from "./data/database";

const config = new pulumi.Config();
const envName = pulumi.getStack();
const vpcCidr = config.require("vpcCidr");

// 1. Provision the Network
const network = createNetwork({
    cidrBlock: vpcCidr,
    environmentName: envName,
    publicSubnetCount: 2,
});

// 2. Provision the Database (passing the network IDs as dependencies)
const database = createDatabase({
    environmentName: envName,
    vpcId: network.vpcId,
    subnetIds: network.publicSubnetIds,
});

// Export final outputs
export const mainVpcId = network.vpcId;
export const dbEndpoint = database.endpoint;
```

### Limits of Basic Modularization

Organizing code with basic functions and files is highly effective for structuring a single Pulumi project. However, as you utilize this approach, you will notice a limitation: Pulumi tracks resources in the state file in a flat structure based on the parent-child relationships defined during execution. Standard language functions do not group resources logically in the Pulumi state file; they only group them visually in your code editor.

When you run `pulumi up`, the engine will display the VPC and the Subnets as top-level resources, completely independent of the `createNetwork` function that spawned them. 

While this functional modularity solves immediate code organization problems, true logical encapsulation of state—where multiple resources are treated as a single, cohesive unit in the Pulumi console and state file—requires `ComponentResources`. We will explore authoring these higher-level abstractions in **Chapter 13: ComponentResources and Abstractions**. Until then, relying on standard software modularity is the necessary first step toward clean Infrastructure as Code.

## 8.3 Dependency Management Across Teams

As your organization scales, the responsibility for provisioning infrastructure naturally decentralizes. A dedicated platform or network team might manage the foundational Virtual Private Clouds (VPCs) and transit gateways, while autonomous application teams are responsible for deploying their own containers and serverless functions. 

This separation of concerns prevents the "Big Ball of Mud" architecture, but it introduces a new challenge: **how do these teams share resource data?** The application team needs the VPC ID and Subnet IDs created by the network team to deploy their load balancers. 

Relying on hardcoded values, manual copy-pasting, or out-of-band communication (like Slack messages or wiki pages) leads to brittle infrastructure and configuration drift. Pulumi solves this programmatically through a mechanism called **Stack References**.

### The Core Mechanism: Stack References

A `StackReference` allows one Pulumi program to securely read the outputs of another Pulumi stack. It treats the remote stack's state file as a read-only data source.

This creates a producer-consumer relationship between teams, connected entirely through code and managed by the Pulumi backend (Pulumi Service, S3, Azure Blob, etc.).

#### The Producer: Exporting the "API"

To make infrastructure available to other teams, the producing team must explicitly export the necessary values. You should not export everything; only export what is absolutely necessary for downstream consumers, treating these exports as a public API.

**Team A (Platform Team) - Project: `core-network`**

```typescript
import * as aws from "@pulumi/aws";

// Provisioning a VPC
const mainVpc = new aws.ec2.Vpc("production-vpc", {
    cidrBlock: "10.0.0.0/16",
});

const privateSubnet = new aws.ec2.Subnet("app-subnet", {
    vpcId: mainVpc.id,
    cidrBlock: "10.0.1.0/24",
});

// EXPORTING values forms the contract with other teams
export const vpcId = mainVpc.id;
export const appSubnetId = privateSubnet.id;
export const securityGroupId = mainVpc.defaultSecurityGroupId;
```

#### The Consumer: Reading the State

The consuming team uses the `StackReference` class to query the producing stack. A Stack Reference requires the fully qualified name of the target stack, which generally follows the format `<organization>/<project>/<stack>`.

**Team B (App Team) - Project: `frontend-service`**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
// Allows the environment to be dynamic (e.g., dev, staging, prod)
const env = pulumi.getStack(); 

// 1. Establish the Stack Reference to the Platform team's network stack
const networkStack = new pulumi.StackReference(`my-org/core-network/${env}`);

// 2. Extract the needed values
// Note: getOutput returns an Output<T> (a Promise-like object), retaining dependency tracking
const vpcId = networkStack.getOutput("vpcId");
const subnetId = networkStack.getOutput("appSubnetId");

// 3. Consume the values in new resources
const appServer = new aws.ec2.Instance("web-server", {
    instanceType: "t3.micro",
    ami: "ami-0c55b159cbfafe1f0",
    subnetId: subnetId, // Passed seamlessly from the remote stack
    tags: {
        Name: `frontend-${env}`
    }
});
```

### Visualizing the Dependency Flow

```text
+-----------------------+                        +-----------------------+
|  TEAM A: PLATFORM     |                        |  TEAM B: APPLICATION  |
|  Repo: core-network   |                        |  Repo: frontend-app   |
+-----------------------+                        +-----------------------+
|                       |      1. Exports        |                       |
| export const vpcId;   | ---------------------> | const net = new       |
| export const subnets; |                        |   StackReference(...) |
|                       |                        |                       |
+-----------+-----------+                        | const vpcId =         |
            |                                    |   net.getOutput(...)  |
            v                                    |                       |
  +-------------------+        2. Reads          +-----------+-----------+
  |  PULUMI BACKEND   | <------------------------------------+
  |  State: core/prod |
  |  {                |
  |    "vpcId": "..." |
  |  }                |
  +-------------------+
```

### Establishing Infrastructure Contracts

When you use Stack References across teams, you are essentially establishing an API contract. If the platform team arbitrarily renames `appSubnetId` to `privateSubnetId` in their code, they will break the application team's deployment on their next `pulumi up`.

To manage dependencies effectively across organizational boundaries:

1.  **Version Your Exports:** While Pulumi doesn't natively version stack outputs like a REST API (e.g., `/v1/`), you can adopt naming conventions for major architectural shifts, such as exporting `vpcIdV2` if migrating to a completely new network topology, allowing downstream teams time to migrate.
2.  **Use Strongly Typed Config:** In languages like TypeScript or Go, you can wrap your Stack Reference calls in a strongly typed interface or helper function within a shared internal library. This provides autocomplete and compile-time warnings for consumers if a key is misspelled.
3.  **Deprecation Periods:** Before removing an output, communicate with downstream teams. You can use Pulumi's CrossGuard (Policy as Code) or internal scripts to query the Pulumi API and see which stacks are currently depending on a specific output.

### Security and Access Control Boundaries

Cross-team dependencies introduce security considerations. A `StackReference` requires read access to the target stack's state file. 

* **Pulumi Cloud:** If you are using the managed Pulumi Service, you can utilize Role-Based Access Control (RBAC). You can configure the `core-network` stack so that the Platform Team has `Admin` (Read/Write) access, while the Application Team is granted `Read` access. This allows the App team's CI/CD pipeline to query the network state without the risk of them accidentally modifying or destroying the network infrastructure.
* **Self-Managed Backends (S3/Azure Blob):** If you manage your own state files, you must configure the IAM policies or Bucket Policies to allow the application team's execution role to perform `s3:GetObject` on the specific state files belonging to the platform team. 

By defining strict access boundaries, teams can safely share necessary context without compromising the security or integrity of foundational infrastructure.

## 8.4 Versioning Infrastructure Code

Because Pulumi allows you to define infrastructure using standard programming languages, versioning your infrastructure is fundamentally no different than versioning your application code. However, the consequences of a bad infrastructure deployment are often more severe than a bug in application logic. Therefore, a robust versioning strategy must account for three distinct layers: the source code, the dependencies (providers), and the internal shared components.

### 1. Version Control (Git) as the Source of Truth

Your version control system (VCS), typically Git, is the ultimate source of truth for your infrastructure. The state of your `main` or `production` branch should always perfectly reflect the desired state of your production environment.

When versioning infrastructure code, consider the following practices:

* **Immutable Commits:** Never apply changes from a local developer machine directly to production. All changes must be committed to Git, reviewed via Pull Requests (PRs), and deployed through an automated CI/CD pipeline.
* **Tagging Releases:** Just as you tag application releases (e.g., `v1.2.0`), you should tag your infrastructure repository when significant architectural milestones are reached. This allows you to audit the exact state of the code that provisioned the environment at a specific point in time.
* **Commit Hashes as Metadata:** Pulumi allows you to attach metadata to your stack updates. It is a best practice to tag every `pulumi up` execution with the Git commit SHA that triggered it. This creates a bi-directional link between your code history and your Pulumi state history.

### 2. Pinning Dependencies and Providers

A common trap in Infrastructure as Code is the "works on my machine, breaks in CI" scenario, caused by unpinned dependencies. Your Pulumi code relies on SDKs and Cloud Providers (like `@pulumi/aws` or `pulumi-kubernetes`). These providers are actively developed, and a new major version might introduce breaking changes to resource schemas.

To guarantee reproducible deployments, you **must** strictly version both your language runtime dependencies and your Pulumi provider plugins.

**TypeScript/Node.js Example (`package.json`)**
Instead of using carets (`^`) which allow minor version updates, pin to exact versions or use strict lockfiles (`package-lock.json` or `yarn.lock`).

```json
{
  "dependencies": {
    "@pulumi/pulumi": "3.100.0",
    "@pulumi/aws": "6.15.2" 
  }
}
```

**Python Example (`requirements.txt`)**
Use double equals to pin exact versions.

```text
pulumi==3.100.0
pulumi-aws==6.15.2
```

### 3. Versioning Shared Infrastructure Components

As discussed in the sections on Polyrepos and Modularization, your platform team will likely build custom `ComponentResources` (e.g., a standardized `SecureVpc` or `CorporateMicroservice`). When these components are shared across multiple repositories, they must be treated as independent software products.

You should version these shared libraries using **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.

* **MAJOR (e.g., `2.0.0`):** Incompatible API changes. For example, replacing an underlying AWS Application Load Balancer with a Network Load Balancer, or requiring a new mandatory input property.
* **MINOR (e.g., `1.1.0`):** Adding functionality in a backwards-compatible manner. For example, adding an optional `enableFlowLogs` parameter to your VPC component that defaults to `false`.
* **PATCH (e.g., `1.0.1`):** Backwards-compatible bug fixes. For example, updating an internal tag schema.

By publishing these components to standard package managers (like npm, PyPI, or NuGet) or internal registries with strict SemVer, downstream application teams can safely consume them. They can confidently lock their infrastructure to `v1.x.x` knowing that a patch update will not unexpectedly destroy and recreate their databases.

### 4. Code Version vs. State Version

It is crucial to understand the distinction between your code history and your state history. 

* **Git History:** Tracks *what you intended* the infrastructure to look like over time.
* **Pulumi State History:** Tracks *what actually happened* during deployments over time.

While Git branches diverge and merge, the Pulumi state for a given stack (e.g., `production`) is strictly linear. If you revert a commit in Git, the next time you run `pulumi up`, Pulumi will calculate the difference between the current state file and the newly reverted code, and then execute the necessary CRUD operations (likely destroying the newer resources) to align the cloud environment back to the older version of the code.

By rigorously versioning your code, strictly pinning your providers, and adhering to SemVer for shared components, you ensure that this reconciliation process between code and state remains predictable, safe, and easily auditable.