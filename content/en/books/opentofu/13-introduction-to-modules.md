As your infrastructure footprint expands, relying on flat, monolithic configuration files quickly becomes unsustainable. Part IV of this handbook shifts the focus from managing isolated environments to building robust, scalable architectures. Chapter 13 introduces the fundamental building block of OpenTofu scalability: the module. Modules allow you to encapsulate complex resource combinations into reusable, parameterized components. We will explore why modules are essential for adhering to the DRY (Don't Repeat Yourself) principle, how to organize their internal directory structure to industry standards, and the mechanics of safely passing data in and extracting outputs out.

## 13.1 What are Modules and Why Are They Essential?

In the early stages of adopting Infrastructure as Code (IaC), it is common to place all configuration files into a single directory. As your infrastructure grows from a handful of resources to hundreds or thousands, this monolithic approach quickly becomes unmanageable. Files grow to thousands of lines, finding specific resources becomes a chore, and replicating environments (like development, staging, and production) often devolves into dangerous copy-and-paste exercises.

This is where **modules** come in. 

In OpenTofu, a module is simply a container for multiple resources that are used together. You can think of a module as the OpenTofu equivalent of a function or method in traditional programming languages. Just as functions allow you to encapsulate logic, define inputs (parameters), and return outputs, modules allow you to group related infrastructure components, parameterize them with variables, and expose specific data as outputs.

It is worth noting that if you have written any OpenTofu code up to this point, you have already used a module. The directory where you execute `tofu plan` or `tofu apply` is known as the **root module**. When this root module includes and configures other modules, those are referred to as **child modules**.

```text
+-------------------------------------------------------------------+
|                           Root Module                             |
|                    (e.g., Production Environment)                 |
|                                                                   |
|       +-------------------+               +-------------------+   |
|       |   Child Module    |               |   Child Module    |   |
|       |   (Networking)    |               |    (Database)     |   |
|       |                   |               |                   |   |
|       | - VPC             |  Provides ID  | - RDS Instance    |   |
|       | - Subnets         | ------------> | - Parameter Group |   |
|       | - Route Tables    |               | - Security Group  |   |
|       +-------------------+               +-------------------+   |
+-------------------------------------------------------------------+
```

### Why Are Modules Essential?

Modules are not just an organizational convenience; they are a fundamental building block for scalable, maintainable, and secure infrastructure. Embracing a modular architecture provides several critical benefits:

#### 1. The DRY Principle (Don't Repeat Yourself)
Without modules, creating a second web architecture requires copying all the resource blocks from your first architecture. If a bug is found or an update is needed, you must manually track down and modify every duplicated instance across your codebase. Modules allow you to write the HCL code once and instantiate it multiple times, passing different variable values for each instance. 

#### 2. Logical Abstraction and Reduced Cognitive Load
Infrastructure can be complex. Provisioning a secure network architecture on AWS, for example, might require configuring a VPC, multiple public and private subnets, NAT gateways, Internet gateways, and complex route tables. 

By wrapping these resources in a `network` module, you abstract that complexity away from the end-user (the engineer calling the module). The caller does not need to understand the intricate routing relationships; they only need to know which inputs the module requires, such as `cidr_block` and `environment_name`.

```hcl
# Instead of 500 lines of complex networking code, 
# the root module simply calls the abstracted child module:

module "secure_network" {
  source = "./modules/network"

  environment_name = "production"
  cidr_block       = "10.0.0.0/16"
  enable_nat       = true
}
```

#### 3. Enforcing Consistency and Security Baselines
Modules are a powerful tool for governance. If your organization mandates that every storage bucket must be encrypted at rest, have versioning enabled, and include specific billing tags, you can bake these requirements directly into a custom `secure_storage` module. 

By instructing your teams to consume this module rather than writing raw `aws_s3_bucket` resources, you guarantee that every deployed bucket automatically adheres to corporate security policies. 

#### 4. Managing Blast Radius
When a monolithic configuration is applied, a mistake can potentially impact the entire infrastructure footprint. By breaking infrastructure down into independent modules (and eventually separating their state files, as discussed in Chapter 11), you isolate changes. Modifying a standalone `database` module allows you to test and deploy database changes with confidence that you are not inadvertently altering your core routing infrastructure.

In the subsequent sections of this chapter, we will explore how to structure these reusable containers, how to invoke them properly from your root configurations, and how to seamlessly pass data between them.

## 13.2 The Standard Structure of a Reusable Module

While OpenTofu is highly flexible and does not strictly enforce a specific directory layout, the infrastructure-as-code community has coalesced around a standardized module structure. Adhering to this standard is critical; it ensures that your modules are predictable, easily navigable for other engineers, and compatible with automated tooling and registries.

A well-architected OpenTofu module represents a clear contract: it takes defined inputs, performs a specific infrastructural task, and returns defined outputs.

### The Standard Directory Layout

At its core, a standard module is a directory containing a specific set of `.tf` files. Here is the canonical structure for a robust, production-ready module:

```text
terraform-aws-secure-network/
├── README.md           # Comprehensive documentation
├── main.tf             # Core resource declarations
├── variables.tf        # Input variable definitions (The parameters)
├── outputs.tf          # Output value definitions (The return values)
├── versions.tf         # OpenTofu and provider version constraints
├── modules/            # (Optional) Nested submodules for complex logic
│   ├── vpc/
│   └── routing/
└── examples/           # (Optional) Executable examples of module usage
    └── complete/
```

### Deconstructing the Core Files

Each file in the root of the module serves a distinct architectural purpose:

* **`main.tf`**: This is the heart of your module. It contains the primary `resource` and `data` blocks that provision the infrastructure. If your module is relatively simple, all logic resides here. For highly complex modules, it is common to split `main.tf` into logically named files (e.g., `vpc.tf`, `security_groups.tf`, `endpoints.tf`) to improve readability.
* **`variables.tf`**: This file acts as the input API for your module. It defines every parameter the caller can or must provide. In a reusable module, every variable should be thoroughly documented with a `description`, constrained with a specific `type`, and provided with a `default` value where sensible.
* **`outputs.tf`**: This file acts as the return API. It defines the specific data points—such as resource IDs, ARNs, or generated IP addresses—that the calling module can extract and use elsewhere. A well-designed module only outputs what is strictly necessary.
* **`versions.tf`**: This is arguably the most critical file for *reusable* modules. It explicitly defines the minimum required version of OpenTofu and specifies the required providers along with their accepted version ranges. Without this file, a module might inadvertently break when consumed by a root configuration using an incompatible provider version.

```hcl
# Example of a standard versions.tf file inside a module
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}
```

* **`README.md`**: No reusable module is complete without documentation. The README should explain the module's purpose, provide a basic usage example, and list all required inputs and available outputs. Tools like `terraform-docs` are often used to automatically generate this markdown based on the contents of your `variables.tf` and `outputs.tf` files.

### Optional but Recommended Directories

As your modules grow in complexity or are published for wider organizational use, you will likely need to expand beyond the flat file structure:

* **The `modules/` Directory**: If a single module attempts to do too much, it becomes brittle. The `modules/` subdirectory allows you to break a large module down into smaller, private submodules. For instance, a complex `database` module might call internal `modules/rds` and `modules/parameter_group` components. These submodules are not intended to be called directly by the end-user, but rather orchestrated by the root `main.tf` of the parent module.
* **The `examples/` Directory**: Documentation is helpful, but executable code is better. Providing an `examples/` directory gives consumers out-of-the-box configurations they can run to see how the module behaves in different scenarios. This directory is also heavily utilized by testing frameworks (like Terratest) to validate the module's functionality in CI/CD pipelines.

## 13.3 Calling a Local Module within Your Configuration

Once you have structured your reusable module, the next step is to actually put it to work. In OpenTofu, you instantiate a child module from your root configuration using the `module` block. 

Think of the `module` block as the mechanism for calling a function. You declare the module, tell OpenTofu where the code lives, and pass in the necessary arguments (variables) that the module requires to execute.

### The `module` Block Syntax

To call a module, you define a block starting with the `module` keyword, followed by a local name you assign to this specific instance. This local name is used to reference the module elsewhere in your root configuration (for example, when extracting its outputs).

Inside the block, you must define the `source` meta-argument. When working with local modules, the `source` is the relative file path to the directory containing the module's `.tf` files.

> **Crucial Rule:** Local file paths in the `source` argument **must** begin with `./` (current directory) or `../` (parent directory). If you omit this prefix, OpenTofu will assume you are trying to download a remote module from the public registry.

### A Practical Example

Imagine you have the following directory structure, where your root configuration wants to deploy two separate instances of a custom web server module:

```text
my-infrastructure/
├── main.tf                 # Root configuration
└── modules/
    └── web_server/         # Local child module
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

Let's assume the `modules/web_server/variables.tf` file defines two required inputs: `instance_type` and `environment_name`. 

To deploy a staging server and a production server using this single module, your root `main.tf` would look like this:

```hcl
# main.tf (Root Module)

# Call the local module to create a staging server
module "staging_web" {
  source = "./modules/web_server"

  # Pass arguments corresponding to the module's variables
  environment_name = "staging"
  instance_type    = "t3.micro"
}

# Call the EXACT SAME local module to create a production server
module "production_web" {
  source = "./modules/web_server"

  environment_name = "production"
  instance_type    = "t3.large"
}
```

In this example, OpenTofu reads the `web_server` module code twice. During the first pass, it injects the "staging" variables; during the second, it injects the "production" variables. This elegantly satisfies the DRY (Don't Repeat Yourself) principle.

### The Initialization Requirement (`tofu init`)

There is a critical step in the OpenTofu workflow that engineers often forget when working with modules. 

When you add a new `module` block to your configuration, modify the `source` argument, or change the version of a remote module, OpenTofu does not automatically recognize the code. Before you can successfully run `tofu plan` or `tofu apply`, you **must** run:

```bash
tofu init
```

During initialization, OpenTofu reads your configuration files, identifies all `module` blocks, and resolves the `source` paths. For local modules, it simply creates a symbolic link or copies the files into the hidden `.terraform/modules/` directory. This internal directory is what OpenTofu actually uses when compiling the execution graph. 

If you forget to run `tofu init` after adding a new local module, OpenTofu will halt execution and throw an error stating that the module has not been installed. Note that if you are only modifying the internal logic of a module *already* initialized (e.g., changing a resource inside `./modules/web_server/main.tf`), you do not need to re-run `tofu init`.

## 13.4 Passing Variables and Extracting Outputs from Modules

To make modules truly reusable and dynamic, they must be able to accept external data (inputs) and return information about the resources they create (outputs). This data flow is what allows you to stitch multiple independent modules together into a cohesive, large-scale infrastructure architecture.

### Passing Variables (The Inputs)

When you define a variable in a child module's `variables.tf` file, that variable automatically becomes an available argument within the `module` block when called from the root configuration. 

If a variable in the child module does not have a `default` value, it is considered a **required** input. Failing to provide it in the root module block will cause OpenTofu to throw an error during the `plan` phase.

**1. Defining the Variable in the Child Module (`./modules/database/variables.tf`):**

```hcl
variable "db_password" {
  description = "The master password for the database instance."
  type        = string
  sensitive   = true
  # No default provided; this MUST be passed by the caller
}

variable "allocated_storage" {
  description = "The size of the database in gigabytes."
  type        = number
  default     = 20
  # Has a default; optional for the caller to provide
}
```

**2. Passing the Values from the Root Module (`main.tf`):**

```hcl
module "app_database" {
  source = "./modules/database"

  # Passing a required variable
  db_password       = var.root_db_password 
  
  # Overriding an optional variable
  allocated_storage = 100 
}
```

Notice that in the root module, we are taking a variable defined at the root level (`var.root_db_password`) and passing it down into the child module's `db_password` argument. This is a common pattern for injecting sensitive credentials (fetched from CI/CD pipelines or secret managers) deep into nested modules.

### Extracting Outputs (The Returns)

Just as variables act as inputs, OpenTofu uses `output` blocks to return data from a module. 

A common misconception among engineers new to OpenTofu is that outputs defined in a child module will automatically print to the console when `tofu apply` finishes. **This is false.** Child module outputs are only exposed to the parent module that called them. If you want a child module's output to print to the console, you must explicitly capture it and output it again from the root module.

You access a child module's output using the following syntax:
`module.<MODULE_NAME>.<OUTPUT_NAME>`

**1. Defining the Output in the Child Module (`./modules/network/outputs.tf`):**

```hcl
output "vpc_id" {
  description = "The ID of the VPC created by the module."
  value       = aws_vpc.main.id
}
```

**2. Accessing the Output in the Root Module (`main.tf`):**

```hcl
module "core_network" {
  source = "./modules/network"
  # ... inputs ...
}

# Explicitly bubbling the child output up to the root level to print to the console
output "production_vpc_id" {
  value = module.core_network.vpc_id
}
```

### Module Orchestration: Chaining Modules Together

The true power of variables and outputs is realized when you use the output of one module as the input to another. This creates an implicit dependency graph, ensuring OpenTofu provisions resources in the exact correct order.

```text
+-----------------------------------------------------------------+
|                         Root Module                             |
|                                                                 |
|  +------------------+                    +------------------+   |
|  | Module: Network  |                    | Module: Compute  |   |
|  |                  |                    |                  |   |
|  | Creates VPC &    |    [vpc_id]        | Needs a VPC to   |   |
|  | Subnets          | -----------------> | place EC2        |   |
|  |                  |    [subnet_ids]    | instances in.    |   |
|  +------------------+                    +------------------+   |
+-----------------------------------------------------------------+
```

Here is how that orchestration looks in code:

```hcl
# 1. Provision the network first
module "network" {
  source   = "./modules/network"
  vpc_cidr = "10.0.0.0/16"
}

# 2. Provision compute, relying on the network module's outputs
module "web_servers" {
  source = "./modules/compute"

  # These references tell OpenTofu that 'web_servers' MUST wait for 
  # 'network' to finish creating before it can begin.
  target_vpc_id  = module.network.vpc_id
  target_subnets = module.network.private_subnet_ids
  
  instance_count = 3
}
```

By chaining modules in this way, you create highly abstracted, lego-like infrastructure components. The `compute` module does not need to know *how* the network was created; it only needs to trust that the `network` module will fulfill its contract and return the required IDs.