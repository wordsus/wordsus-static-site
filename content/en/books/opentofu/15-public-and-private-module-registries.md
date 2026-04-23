As your infrastructure codebase grows, relying solely on local modules becomes inefficient. Chapter 15 explores how to share, version, and consume modules at scale using registries and version control systems. We will start by leveraging the vast ecosystem of the public OpenTofu Registry to rapidly deploy battle-tested configurations. From there, we will learn how to source code directly from Git repositories for internal prototyping. Finally, we will tackle enterprise-grade scaling by setting up a Private Module Registry to securely distribute internal IP, while mastering the complexities of managing nested, transitive module dependencies across your organization.

## 15.1 Consuming Modules directly from the OpenTofu Registry

While building local modules allows you to standardize internal infrastructure (as discussed in Chapter 13), you do not always need to reinvent the wheel. The OpenTofu Registry serves as a public, centralized index of community-contributed and vendor-maintained modules. Consuming these modules allows your teams to rapidly provision complex architectures—such as highly available networks or managed Kubernetes clusters—using battle-tested configurations.

### The Registry Source Syntax

When you source a module from the public OpenTofu Registry, the `source` argument inside your `module` block must follow a specific, three-part format: 

`<NAMESPACE>/<NAME>/<PROVIDER>`

* **Namespace:** The organization or user who published the module (e.g., `terraform-aws-modules`).
* **Name:** The specific infrastructure component being provisioned (e.g., `vpc`).
* **Provider:** The primary cloud provider the module targets (e.g., `aws`, `google`, `azurerm`).

Unlike local modules, which use relative file paths, a registry string tells the OpenTofu CLI to query the remote registry API to locate and download the configuration.

### Versioning Registry Modules

When consuming local modules, versioning is typically handled by your project's version control system (like Git). However, when relying on a remote registry, the underlying module code can be updated by its maintainers at any time. To prevent unexpected upstream changes from breaking your infrastructure, OpenTofu provides the `version` argument.

**It is a strict best practice to always pin a version when consuming public registry modules.**

```hcl
module "vpc" {
  # 1. Specify the registry source path
  source  = "terraform-aws-modules/vpc/aws"
  
  # 2. Pin the version using semantic versioning constraints
  version = "~> 5.0"

  # 3. Pass in the required variables defined by the module
  name = "production-core-network"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
}
```

In the example above, `~> 5.0` is a pessimistic constraint operator. It instructs OpenTofu to accept any `5.x.x` version (like `5.1.0` or `5.5.3`), but to reject version `6.0.0` or higher, which might contain breaking structural changes.

### The Resolution and Initialization Process

Adding a module block to your configuration does not immediately make the module's code available. OpenTofu must fetch the remote code and store it locally in a hidden cache directory before it can evaluate the module's resources. 

This process is triggered by running `tofu init`. 

```text
+-------------------------+
|  Your Configuration     |
|                         |
| module "vpc" {          |
|   source = ".../vpc/aws"|
| }                       |
+-------------------------+
            |
            |   Executes `tofu init`
            v
+-------------------------------------------------+
|  OpenTofu CLI                                   |
|  1. Parses the source string                    |
|  2. Evaluates the version constraint            |
|  3. Queries the OpenTofu Registry API           |
+-------------------------------------------------+
            |
            |   HTTPS GET Request
            v
+-------------------------------------------------+
|  OpenTofu Registry                              |
|  (Resolves location of the source repository)   |
+-------------------------------------------------+
            |
            |   Downloads tarball / git clone
            v
+-------------------------------------------------+
|  Local Workspace                                |
|  Places module contents into:                   |
|  .terraform/modules/<module_name>/              |
+-------------------------------------------------+
```

*Note: For compatibility and seamless migration purposes, OpenTofu currently retains the `.terraform/` naming convention for its hidden dependency directories. When `tofu init` pulls the module, you will find the downloaded source code residing inside `.terraform/modules/vpc/`.*

### Updating Cached Modules

If you change the `version` constraint in your configuration to target a newer release of a registry module, a standard `tofu apply` will fail because the required version no longer matches the cached version. 

To resolve this, you must instruct OpenTofu to reach back out to the registry and download the new payload by passing the `-upgrade` flag to the initialization command:

```bash
tofu init -upgrade
```

This ensures that the local `.terraform/modules` directory is synchronized with the newly requested version from the OpenTofu Registry, allowing you to safely proceed with planning and applying your changes.

## 15.2 Sourcing Remote Modules from Git and Mercurial Repositories

While module registries offer a streamlined experience with semantic versioning and discoverability, you may not always want or need the overhead of maintaining a private registry. For internal codebases, rapid prototyping, or utilizing community modules not published to a registry, OpenTofu allows you to source modules directly from Version Control Systems (VCS) like Git and Mercurial.

When using a VCS source, OpenTofu delegates the download process to the respective client (`git` or `hg`) installed on your system. This means your machine must have the necessary software installed and be configured with the appropriate access rights (such as SSH keys or personal access tokens) to clone the repository.

### Sourcing from Git

To instruct OpenTofu to clone a module from a Git repository, you prefix the repository URL with `git::`. OpenTofu supports both HTTPS and SSH protocols.

**HTTPS Example:**
```hcl
module "web_server" {
  source = "git::https://github.com/my-org/infrastructure-modules.git"
  
  instance_type = "t3.micro"
}
```

**SSH Example (Recommended for Private Repositories):**
```hcl
module "web_server" {
  source = "git::ssh://git@github.com/my-org/infrastructure-modules.git"
  
  instance_type = "t3.micro"
}
```

When you run `tofu init`, OpenTofu will invoke Git to clone the repository into the `.terraform/modules` directory. If the repository is private, OpenTofu will transparently use your system's existing SSH agent or credential helper to authenticate.

### Selecting Specific Revisions

When consuming modules from the OpenTofu Registry (as seen in Section 15.1), you use the `version` argument to pin module versions. **The `version` argument is not supported for VCS sources.** Instead, you must target specific branches, tags, or commit hashes by appending the `ref` query parameter to the end of the source URL. Pinning to a specific tag or commit hash is crucial for maintaining idempotent and stable infrastructure deployments.

```hcl
module "database" {
  # Pinning to a specific Git tag (e.g., v2.1.0)
  source = "git::https://github.com/my-org/db-modules.git?ref=v2.1.0"
}

module "cache" {
  # Pinning to a specific branch (e.g., development)
  source = "git::https://github.com/my-org/cache-modules.git?ref=development"
}

module "queue" {
  # Pinning to a specific commit hash for absolute immutability
  source = "git::https://github.com/my-org/queue-modules.git?ref=a1b2c3d4e5f6"
}
```

### Navigating Monorepos with Subdirectories

Organizations frequently group multiple related modules into a single "monorepo" rather than creating a separate repository for every infrastructure component. 

To source a module located in a nested directory of a repository, OpenTofu uses a special double-slash (`//`) syntax. The double-slash instructs OpenTofu to clone the entire repository, but only evaluate the configuration found within the specified subdirectory.

```text
infrastructure-modules/ (Git Repository Root)
├── ecs-cluster/
│   ├── main.tf
│   └── variables.tf
├── rds-postgres/       <-- We want to target this specific module
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── README.md
```

To call the `rds-postgres` module from the repository illustrated above, place the `//` immediately after the `.git` extension and before the directory path:

```hcl
module "postgres_db" {
  # Cloning the repo, navigating to the subdirectory, and pinning the version
  source = "git::https://github.com/my-org/infrastructure-modules.git//rds-postgres?ref=v1.5.2"
  
  db_name = "production_core"
}
```

### Sourcing from Mercurial

Though less common than Git, OpenTofu fully supports sourcing modules from Mercurial repositories. The mechanics are nearly identical to Git, but utilize the `hg::` prefix and the `rev` query parameter (instead of `ref`) to target specific branches or tags.

```hcl
module "network" {
  # Sourcing via HTTP, targeting a subdirectory, and pinning to a Mercurial revision
  source = "hg::http://bitbucket.org/my-org/hg-modules//vpc?rev=v1.0"
  
  vpc_cidr = "10.10.0.0/16"
}
```

### Updating VCS Modules

Just like with Registry modules, OpenTofu caches the cloned repository locally. If you update a remote branch (e.g., you are tracking `?ref=main` and a new commit is pushed), running `tofu plan` will not automatically fetch the latest code. 

To force OpenTofu to re-clone the repository or pull the latest changes for your specified reference, you must re-initialize the working directory with the upgrade flag:

```bash
tofu init -upgrade
```

## 15.3 Architecture and Setup of a Private Module Registry

While sourcing directly from Version Control Systems (VCS) is highly effective for rapid development and smaller teams, it lacks the sophisticated features of a full-fledged registry. VCS sourcing requires you to hardcode specific commit hashes or tags, bypassing OpenTofu's semantic versioning engine. Furthermore, as an organization scales, discovering available modules hidden within various Git repositories becomes a significant friction point.

A Private Module Registry solves these problems by providing internal teams with the exact same developer experience as the public OpenTofu Registry—including strict semantic versioning (`~> 1.2`), centralized discoverability, and module documentation—while keeping the intellectual property securely behind the corporate firewall.

### The Module Registry Protocol

To understand how to set up a private registry, you must first understand how OpenTofu communicates with one. OpenTofu does not require proprietary software to host a registry; instead, it relies on a standardized, open HTTP-based API called the **Module Registry Protocol**.

Any web server that correctly implements these specific REST endpoints can act as an OpenTofu registry.

#### 1. Service Discovery
When you reference a private registry in your module source, OpenTofu first performs "Service Discovery" by requesting a specific JSON file at the root of the domain: `https://<REGISTRY_HOST>/.well-known/terraform.json`.

This file tells OpenTofu the base URL for the module API:
```json
{
  "modules.v1": "/api/modules/v1/"
}
```

#### 2. The API Flow
Once OpenTofu knows the API base URL, running `tofu init` triggers a predictable sequence of HTTP GET requests to resolve the module:

```text
+----------------+                                        +---------------------------+
|                | ---- 1. GET /.well-known/terraform.json -> |                           |
|                | <--- Returns API Base Path --------------- |                           |
|                |                                        |                           |
|  OpenTofu CLI  | ---- 2. GET /v1/my-org/vpc/aws/versions -> |  Private Registry Server  |
|                | <--- Returns Available Versions ---------- |  (e.g., GitLab, env0,     |
|                |                                        |   Artifactory, or Custom) |
|                | ---- 3. GET /v1/.../aws/2.0.0/download --> |                           |
|                | <--- Returns HTTP 204 or 302 Redirect ---- |                           |
+----------------+                                        +---------------------------+
        |
        |  4. Downloads Tarball from Redirect URL (e.g., S3 Bucket)
        v
+----------------+
| Local Cache    |
| (.terraform/)  |
+----------------+
```

Notably, the registry server itself does not need to store the heavy module code. Step 3 typically returns an HTTP `X-Terraform-Get` header or a `302 Found` redirect pointing OpenTofu to a secure, temporary download link (like an AWS S3 presigned URL or a raw Git archive endpoint).

### Options for Hosting a Private Registry

Organizations generally choose one of three paths to implement a private registry:

1. **Native VCS Integrated Registries:** Modern enterprise VCS platforms, most notably **GitLab**, have built-in support for the Module Registry Protocol. You can publish modules directly to your GitLab project's package registry, making it a seamless extension of your existing CI/CD workflow.
2. **Dedicated Artifact Repositories:** Tools like **JFrog Artifactory** or **Sonatype Nexus** support OpenTofu module registries out of the box. If your enterprise already uses these for Docker images or npm packages, they are the logical choice for IaC modules.
3. **Specialized IaC Automation Platforms:** Platforms like **env0**, **Spacelift**, or **Scalr** offer built-in private module registries alongside their state management and remote execution features. 

### Authenticating the OpenTofu CLI

Unlike the public registry, your private registry will require authentication. OpenTofu manages registry authentication via the CLI configuration file, typically named `.tofurc` (or `tofu.rc` on Windows) located in the user's home directory.

You configure authentication using the `credentials` block, which maps a registry hostname to a sensitive API token:

```hcl
# ~/.tofurc

credentials "registry.mycompany.internal" {
  token = "tkn_a1b2c3d4e5f6g7h8i9j0"
}

credentials "gitlab.com" {
  # Used if utilizing GitLab's SaaS package registry
  token = "glpat-xxxxxxxxxxxxxxxxxxxx"
}
```

*Warning: Because this file contains plaintext tokens, you should ensure its file permissions are tightly restricted (`chmod 600 ~/.tofurc`). In CI/CD pipelines, this file is usually generated dynamically on the runner using environment variables, or configured via the `TF_CLI_CONFIG_FILE` environment variable.*

### Consuming Private Modules

Once the registry is online and your CLI is authenticated, consuming a private module is nearly identical to consuming a public one. The only difference is that you must prepend the registry's hostname to the `source` string. 

If no hostname is provided, OpenTofu defaults to the public registry (`registry.opentofu.org`).

```hcl
module "secure_database" {
  # Structure: <HOSTNAME>/<NAMESPACE>/<NAME>/<PROVIDER>
  source  = "registry.mycompany.internal/infrastructure/rds-postgres/aws"
  
  # Semantic versioning is now fully supported!
  version = "~> 2.1"

  # Module variables...
  environment       = "production"
  allocated_storage = 100
}
```

By transitioning to a private module registry, you enable your infrastructure teams to publish versioned, immutable releases of their modules. Downstream consumers can confidently pin to major versions (e.g., `~> 2.0`), ensuring they receive non-breaking bug fixes automatically during `tofu init -upgrade`, while being protected from disruptive architectural changes until they are ready to migrate.

## 15.4 Managing Transitive Module Dependencies

As your infrastructure automation matures, you will inevitably encounter situations where a module you are writing or consuming depends on *another* module. This creates a nested hierarchy. A **transitive dependency** occurs when your root configuration calls Module A, which in turn calls Module B. To the root configuration, Module B is a transitive (or indirect) dependency.

While nesting modules can encapsulate complex logic, it introduces significant challenges regarding state management, provider inheritance, and version compatibility.

### Visualizing the Dependency Tree

Consider a scenario where you are deploying a microservice. You call a top-level `web_service` module, which internally provisions computing resources but also calls a shared `network_security` module to configure firewalls.

```text
Root Configuration (main.tf)
 └── module "frontend_service" (Source: ./modules/web_service)
      ├── aws_instance.web
      ├── aws_lb.main
      └── module "firewall" (Source: registry.internal/security/aws) <-- Transitive
           ├── aws_security_group.allow_web
           └── aws_waf_web_acl.main
```

When you run `tofu init`, OpenTofu resolves this entire tree. It downloads the `frontend_service` module, inspects its code, discovers the `firewall` module call, and queries the private registry to download that transitive dependency as well.

### The Danger of Provider Version Conflicts

One of the most common pitfalls of transitive dependencies involves **Provider Versioning**. 

OpenTofu allows different modules in the tree to be instantiated multiple times and even at different versions (e.g., you could technically have two different modules calling two different versions of the `firewall` module). However, **OpenTofu requires a single, unified version of any given Provider** (like the AWS or Google provider) across the *entire* state.

If Module A enforces a strict constraint for the AWS provider (e.g., `version = "~> 4.0"`) and Module B enforces a conflicting constraint (e.g., `version = ">= 5.0"`), `tofu init` will immediately fail.

**Best Practice:**
* **Root Configurations** should dictate exact provider versions using a lock file (`.terraform.lock.hcl`).
* **Reusable Modules** (especially those published to registries) should be extremely permissive with provider constraints (e.g., `>= 4.0, < 6.0`) to avoid locking out downstream consumers who rely on them transitively.

### Implicit vs. Explicit Provider Passing

By default, OpenTofu utilizes **implicit inheritance** for providers. A nested module will automatically inherit the default (un-aliased) provider configurations defined in the root module. 

However, if your transitive module requires an *aliased* provider—for example, deploying the `firewall` module to a secondary disaster-recovery region—implicit inheritance will not work. You must explicitly pass the provider configuration down through every layer of the module tree using the `providers` meta-argument.

```hcl
# Root Configuration (main.tf)
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr_region"
  region = "us-west-2"
}

module "frontend_service" {
  source = "./modules/web_service"
  
  # Passing the aliased provider down to the first-level module
  providers = {
    aws.secondary = aws.dr_region
  }
}
```

Inside the `web_service` module, you must then receive that provider and pass it down *again* to the transitive `firewall` module:

```hcl
# modules/web_service/main.tf

# 1. Declare the required provider alias in this module
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      configuration_aliases = [aws.secondary]
    }
  }
}

# 2. Pass it down to the transitive dependency
module "firewall" {
  source  = "registry.internal/security/aws"
  version = "~> 2.0"
  
  providers = {
    aws = aws.secondary
  }
}
```

If you fail to explicitly pass providers through the entire chain, the deeply nested module will fall back to the root's default provider, potentially deploying resources into the wrong region or account.

### Architectural Best Practice: Composition over Inheritance

Because passing providers, variables, and outputs through multiple layers of nested modules is tedious and prone to human error, the OpenTofu community strongly advocates for **Composition over Inheritance** (often referred to as building a "flat" module architecture).

Instead of Module A calling Module B inside its own code, design your root configuration to call both modules independently, using the outputs of Module B as the inputs for Module A.

**The Anti-Pattern (Deep Nesting):**
```hcl
# Root -> calls App Module -> calls DB Module -> calls Network Module
module "app" {
  source = "./modules/app"
}
```

**The Recommended Pattern (Flat Composition):**
```hcl
# Root acts as an orchestrator, calling flat modules and linking them
module "network" {
  source = "./modules/network"
}

module "database" {
  source    = "./modules/database"
  subnet_id = module.network.private_subnet_id
}

module "app" {
  source        = "./modules/app"
  database_url  = module.database.connection_string
  subnet_id     = module.network.public_subnet_id
}
```

By flattening the dependency tree, you eliminate complex transitive provider passing, make the root configuration easier to read, and ensure that modules remain loosely coupled and highly reusable across different contexts. Deep nesting should generally be reserved for encapsulating very tightly coupled resources that would never logically be deployed independently.