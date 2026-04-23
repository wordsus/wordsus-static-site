Up until now, we’ve written infrastructure configurations using hardcoded values. While this works for simple tests, it quickly becomes unmanageable as your infrastructure grows. To build truly reusable, scalable OpenTofu code, you need a way to pass dynamic data into your configurations and extract vital information back out. In this chapter, we will explore the lifecycle of data within OpenTofu. We will start by defining robust input variables with strict type constraints and validation rules. Then, we’ll look at the various ways to inject these values at runtime. Finally, we’ll cover how to use outputs to share data between modules and securely redact sensitive information.

## 7.1 Input Variables: Data Types and Strict Validation

Input variables are the parameters of your OpenTofu configurations. If you think of an OpenTofu module as a function, input variables are the arguments you pass into that function. They allow you to write reusable, dynamic infrastructure code without hardcoding environment-specific values like instance sizes, region names, or network CIDR blocks.

To define a variable, you use the `variable` block followed by a unique label representing the variable's name.

```hcl
variable "instance_type" {
  description = "The size of the compute instance."
  type        = string
  default     = "t3.micro"
  nullable    = false
}
```

While OpenTofu can often infer the type of a variable based on its default value, explicitly declaring data types and implementing strict validation rules is a foundational best practice. It ensures your modules fail fast with clear, human-readable errors during the `tofu plan` phase, rather than failing halfway through a `tofu apply` due to an obscure cloud provider API error.

### Understanding OpenTofu Data Types

OpenTofu relies on a strict type system to ensure that the data flowing through your configuration behaves predictably. Types are broadly categorized into primitive types, collection types, and structural types.

```text
OpenTofu Data Types
├── Primitive Types (Single values)
│   ├── string  (e.g., "us-east-1")
│   ├── number  (e.g., 8080, 3.14)
│   └── bool    (e.g., true, false)
│
└── Complex Types
    ├── Collection Types (Multiple values of the SAME type)
    │   ├── list(type) (Ordered, allows duplicates)
    │   ├── set(type)  (Unordered, unique values only)
    │   └── map(type)  (Key-value pairs, keys are strings)
    │
    └── Structural Types (Multiple values of DIFFERENT types)
        ├── object({...}) (Named attributes with defined types)
        └── tuple([...])  (Fixed-length list with specific types per index)
```

#### Primitive Types
Primitives represent single, scalar values. 
* **`string`**: A sequence of Unicode characters representing text.
* **`number`**: A numeric value. OpenTofu does not distinguish between integers and floats; both are represented as `number`.
* **`bool`**: A boolean value, either `true` or `false`.

#### Collection Types
Collections group multiple values of the *same* primitive or complex type.
* **`list`**: An ordered sequence of values. You define the inner type, such as `list(string)`. Elements are accessed by their zero-based index (e.g., `var.availability_zones[0]`).
* **`set`**: An unordered collection of unique values. Sets are particularly useful when order doesn't matter and you want to prevent duplicate entries, such as a list of IAM user names.
* **`map`**: A collection of key-value pairs where the keys are always strings, and the values are of the specified type, such as `map(string)`. 

```hcl
variable "resource_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {
    Environment = "Production"
    Team        = "Platform"
  }
}
```

#### Structural Types
When you need to pass a complex, nested data structure where elements have different types, you use structural types.

* **`object`**: The most common structural type. It allows you to define a schema with specific attribute names and their corresponding types.

```hcl
variable "database_config" {
  description = "Configuration for the primary database"
  type = object({
    engine_version = string
    port           = number
    multi_az       = bool
    backup_window  = string
  })
}
```

* **`tuple`**: Similar to a list, but each element at a specific index can have a different, strictly defined type. For example, `tuple([string, number, bool])`.

*Note: OpenTofu also supports the `any` type constraint, which allows a variable to accept any data type. However, using `any` bypasses the benefits of type checking and should be avoided in robust module design.*

### Implementing Strict Validation

Data types ensure a variable is a `string` or a `number`, but they do not ensure the value makes logical sense for your infrastructure. For example, an AWS region must be a string, but `"moon-base-alpha"` is not a valid AWS region. 

OpenTofu allows you to enforce arbitrary constraints using the `validation` block nested inside a `variable` block. 

A `validation` block requires two arguments:
1.  **`condition`**: An expression that evaluates to `true` if the value is valid, and `false` if it is not.
2.  **`error_message`**: A string that is displayed to the user if the condition evaluates to `false`. This message should explicitly tell the user what the acceptable values are.

#### Validating Against a List of Allowed Values
You can use the `contains` function to restrict a variable to a specific set of allowed strings (essentially creating an enum).

```hcl
variable "environment_tier" {
  description = "The deployment tier for the application."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment_tier)
    error_message = "The environment_tier must be either 'dev', 'staging', or 'prod'."
  }
}
```

#### Enforcing Naming Conventions with Regex
The `can` and `regex` functions are frequently paired to enforce strict naming conventions, ensuring that user-provided names comply with cloud provider restrictions or organizational policies.

```hcl
variable "storage_bucket_name" {
  description = "The name of the S3 bucket."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9.-]{3,63}$", var.storage_bucket_name))
    error_message = "Bucket names must be between 3 and 63 characters, and contain only lowercase letters, numbers, hyphens, and periods."
  }
}
```

#### Multiple Validation Blocks
You are not limited to a single validation rule. OpenTofu allows you to define multiple `validation` blocks within a single `variable`. OpenTofu evaluates all validation blocks; if any condition fails, it outputs the respective error message.

```hcl
variable "app_port" {
  description = "The network port the application listens on."
  type        = number

  validation {
    condition     = var.app_port >= 1024
    error_message = "The app_port must be 1024 or higher to avoid requiring root privileges."
  }

  validation {
    condition     = var.app_port <= 65535
    error_message = "The app_port cannot exceed the maximum TCP port limit of 65535."
  }
}
```

#### Validation Limitations
When writing validation conditions, the expression can only refer to the variable itself (e.g., `var.app_port`). You cannot cross-reference other variables, local values, or resource attributes within a standard variable validation block. The validation rule must be entirely self-contained, ensuring that the variable's validity is evaluated solely based on its own input.

## 7.2 Passing Variables via Files, CLI, and Environment

In the previous section, we established how to define input variables and enforce strict data validation. However, defining a variable is only half the equation; you must also provide the actual values during the execution of your OpenTofu workflow. 

Hardcoding values directly into your `.tf` files defeats the purpose of modular infrastructure. Instead, OpenTofu provides several mechanisms to inject values at runtime, allowing you to deploy the exact same code across different environments (e.g., Development, Staging, Production) simply by swapping out the inputs.

There are three primary ways to pass variable values to OpenTofu: through dedicated definition files, command-line arguments, and environment variables.

### 1. Variable Definitions Files (`.tfvars`)

For most deployments, especially those managed within version control, variable definitions files are the standard and most reliable method for passing inputs. These files use the same HCL syntax as your main configuration but are dedicated solely to assigning values to previously defined variables.

**The `terraform.tfvars` File**
By default, OpenTofu automatically looks for and loads a file named exactly `terraform.tfvars` or `terraform.tfvars.json` in the current working directory. 

```hcl
# terraform.tfvars
environment_tier    = "prod"
instance_type       = "m5.large"
app_port            = 8443
resource_tags = {
  Environment = "Production"
  Team        = "Platform"
  CostCenter  = "12345"
}
```

**Auto-loaded Files (`*.auto.tfvars`)**
If you need to split your variable assignments into multiple files for better organization (e.g., separating networking variables from database variables), you can use the `.auto.tfvars` extension. OpenTofu automatically loads any file matching `*.auto.tfvars` or `*.auto.tfvars.json`. 

```text
Project Structure Example
├── main.tf
├── variables.tf
├── networking.auto.tfvars
└── database.auto.tfvars
```

### 2. Command-Line Flags (`-var` and `-var-file`)

When you need to override a specific value for a one-off run, or when you are testing configurations locally, passing variables via the Command-Line Interface (CLI) is highly effective. 

**The `-var` Flag**
You can assign individual variables directly in your `tofu plan` or `tofu apply` commands using the `-var` flag. This is useful for temporary overrides but becomes unwieldy for complex structural types like maps or objects.

```bash
tofu plan -var="instance_type=t3.nano" -var="environment_tier=dev"
```

**The `-var-file` Flag**
If you manage multiple environments without using OpenTofu Workspaces (discussed in Chapter 11), you might keep distinct variable files that are *not* automatically loaded, such as `dev.tfvars` and `prod.tfvars`. You must explicitly tell OpenTofu to use these files via the `-var-file` flag.

```bash
tofu apply -var-file="config/prod.tfvars"
```

### 3. Environment Variables (`TF_VAR_name`)

In automated Continuous Integration and Continuous Deployment (CI/CD) pipelines, managing physical `.tfvars` files can sometimes be cumbersome or pose security risks. OpenTofu can read environment variables from the host operating system, provided they are prefixed with `TF_VAR_`.

If you have an OpenTofu variable named `database_password`, you can pass its value by setting the `TF_VAR_database_password` environment variable.

```bash
# Export the variable in your shell or CI/CD pipeline
export TF_VAR_database_password="SuperSecretPassword123!"

# OpenTofu will automatically pick this up
tofu apply
```

*Note: Environment variables are strictly parsed as literal strings. While OpenTofu will attempt to automatically convert them to the correct type (like `number` or `bool`) if the variable's type constraint allows it, passing complex types like maps or lists via environment variables requires writing them in valid HCL syntax within the string, which is highly prone to escaping errors.*

### The Variable Definition Precedence

A common scenario in mature infrastructure projects is having the same variable defined in multiple places—for instance, a default value in `variables.tf`, a team-wide standard in `terraform.tfvars`, and a temporary override via a `-var` CLI flag. 

OpenTofu resolves these conflicts using a strict order of precedence. The list below goes from lowest priority to highest priority. Values defined lower down this list will silently override values defined higher up.

```text
Variable Precedence Hierarchy (Lowest to Highest)

  [Lowest Priority]
   │
   ├── 1. Variable Defaults: The `default` argument inside the `variable` block.
   │
   ├── 2. Environment Variables: Values starting with `TF_VAR_`.
   │
   ├── 3. The `terraform.tfvars` file (or `terraform.tfvars.json`).
   │
   ├── 4. Auto-loaded files: `*.auto.tfvars` (or `*.auto.tfvars.json`).
   │      (Processed in alphabetical order of their filenames).
   │
   ├── 5. CLI Flags: `-var` and `-var-file` arguments. 
   │      (Processed in the exact order they are typed in the terminal).
   │
  [Highest Priority]
```

Understanding this precedence is critical for debugging. If a variable is inexplicably taking on the wrong value during a `tofu plan`, check your command-line flags and `.auto.tfvars` files first, as they will override almost everything else in your configuration.

## 7.3 Defining and Exposing Output Values

If input variables are the arguments you pass into an OpenTofu configuration, then output values are the data your configuration returns. Just as a function in a traditional programming language returns a calculated result, an OpenTofu module uses outputs to expose specific attributes of the infrastructure it manages.

Outputs serve as the critical communication layer between your infrastructure code, the engineer running the CLI, and other dependent modules or workspaces.

### The Anatomy of an Output Block

Defining an output requires the `output` block, followed by a unique label representing the output's name. The only strictly required argument within this block is `value`, which dictates what data is being exposed.

```hcl
output "load_balancer_dns" {
  description = "The fully qualified domain name of the production load balancer."
  value       = aws_lb.main.dns_name
}
```

While only `value` is mandatory, consistently including a `description` is highly recommended. Tools like `tofu-docs` use these descriptions to automatically generate module documentation, making your codebase much easier to consume by other teams.

### The Three Pillars of Output Usage

Output values are not just for display; they are a fundamental routing mechanism in OpenTofu. They are primarily used in three distinct ways:

**1. CLI Feedback and Discovery**
When you execute a `tofu apply` on a root module, OpenTofu prints all defined outputs to the terminal upon successful completion. This is invaluable for immediately retrieving dynamic data generated by the cloud provider, such as an automatically assigned IP address, an SSH key pair ID, or an auto-generated database endpoint.

```text
# Terminal Output Example
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

load_balancer_dns = "internal-prod-lb-123456789.us-east-1.elb.amazonaws.com"
```

**2. Module Interoperability**
By default, all resources created inside a child module are completely encapsulated. A parent module cannot directly access `aws_instance.web.public_ip` if that instance was created inside a child module. To break this encapsulation safely, the child module must explicitly define an output. The parent module can then reference that output.

```text
Module Data Flow

┌──────────────────────────────────────────────┐
│ Parent Module (main.tf)                      │
│                                              │
│  module "networking" { ... }                 │
│                                              │
│  module "compute" {                          │
│    # Consuming the output from the child     │
│    subnet_id = module.networking.public_subnet
│  }                                           │
└──────────────────────────────────────────────┘
           ▲                        │
           │ (Exposes output)       │ (Passes variable)
           │                        ▼
┌──────────────────────────────────────────────┐
│ Child Module: Networking                     │
│                                              │
│  output "public_subnet" {                    │
│    value = aws_subnet.public.id              │
│  }                                           │
└──────────────────────────────────────────────┘
```

**3. Cross-Workspace Data Sharing (Remote State)**
In massive, enterprise-scale environments, you rarely deploy all infrastructure in a single state file. You might have a "Networking" workspace managed by the Network Team, and an "Application" workspace managed by developers. 

Outputs exposed in the Networking workspace's root module are saved in its state file. The Application workspace can then use the `terraform_remote_state` data source to read those exact outputs, allowing loosely coupled configurations to share critical IDs and endpoints.

### Advanced Output Arguments

Beyond simply passing data, OpenTofu outputs support advanced arguments for handling dependencies and data validation.

#### Explicit Dependencies (`depends_on`)
Normally, OpenTofu infers dependencies automatically. If an output references `aws_instance.web.id`, OpenTofu knows it cannot compute the output until the instance is created. However, occasionally you need an output to wait for a side effect that it doesn't directly reference in its `value`. 

You can force this using the `depends_on` meta-argument within the output block.

```hcl
output "api_gateway_url" {
  description = "The URL of the API Gateway."
  value       = aws_api_gateway_deployment.prod.invoke_url

  # Do not expose the URL until the DNS record is fully propagated
  depends_on = [
    aws_route53_record.api_validation
  ]
}
```

#### Output Validation (`precondition`)
Just as you can validate input variables, you can use `precondition` blocks within a `lifecycle` block to validate outputs before they are returned. This is exceptionally useful for module authors who want to guarantee the integrity of the data their module produces.

If the precondition fails, OpenTofu halts the apply process and returns your custom error message.

```hcl
output "secure_endpoint" {
  description = "The HTTPS endpoint for the service."
  value       = var.service_url

  lifecycle {
    precondition {
      condition     = startswith(var.service_url, "https://")
      error_message = "CRITICAL ERROR: The generated service URL is not using HTTPS. Check the certificate bindings."
    }
  }
}
```

## 7.4 Protecting Sensitive Variables and Redacting Outputs

Modern infrastructure relies heavily on secrets. Whether you are provisioning a database that requires an initial master password, configuring an API gateway with authentication tokens, or generating TLS certificates, your OpenTofu configurations will inevitably handle highly sensitive data. 

By default, OpenTofu is transparent. When you run a `tofu plan` or `tofu apply`, it prints the exact values being assigned to resource arguments. In a Continuous Integration (CI) pipeline, this transparency is a massive security vulnerability, as secrets can be permanently logged in plaintext for anyone with pipeline access to read.

To prevent this, OpenTofu provides the `sensitive` argument for both variables and outputs.

### Masking Input Variables

When you define an input variable that will accept a secret, you should immediately flag it using `sensitive = true`.

```hcl
variable "db_master_password" {
  description = "The master password for the production database."
  type        = string
  sensitive   = true
}

resource "aws_db_instance" "production" {
  engine         = "postgres"
  instance_class = "db.t3.micro"
  username       = "admin"
  password       = var.db_master_password
  # ... other configuration ...
}
```

When this configuration is evaluated, OpenTofu recognizes the sensitive flag. During the plan and apply phases, it intercepts any terminal output that would display the password and masks it:

```text
# Terminal Output Example
  + resource "aws_db_instance" "production" {
      + engine         = "postgres"
      + instance_class = "db.t3.micro"
      + password       = (sensitive value)
      + username       = "admin"
      ...
    }
```

### Cascading Sensitivity and Outputs

OpenTofu tracks the sensitivity of a value throughout your entire configuration graph. If you pass a sensitive variable into a resource, any attribute of that resource that derives from the sensitive variable is often treated as sensitive. 

More importantly, if you attempt to create an `output` that exposes a sensitive variable (or a provider attribute that is inherently sensitive, like a generated private key), OpenTofu will purposefully throw a validation error to prevent accidental data leakage.

```hcl
# This will cause an ERROR during 'tofu plan'
output "database_password" {
  value = var.db_master_password
}
```

To resolve this error and successfully output the value (perhaps to share it with another workspace), you must explicitly acknowledge the risk by marking the output itself as sensitive:

```hcl
# This works correctly and redacts the output in the CLI
output "database_password" {
  description = "The master password. Retrieve via 'tofu output -json'."
  value       = var.db_master_password
  sensitive   = true
}
```

When an output is marked as sensitive, running `tofu apply` will simply show `database_password = <sensitive>` in the terminal. To actually view the value, a machine or administrator must explicitly request it by running `tofu output -raw database_password` or parsing the `tofu output -json` payload.

### Generating Sensitive Material

Sometimes, the secret isn't provided as an input variable but is generated dynamically by OpenTofu itself using providers like `random` or `tls`. These providers have specific resource types designed to handle secrets safely.

For example, when generating a random password, you should use `random_password` rather than `random_string`. The `random_password` resource automatically treats its `result` attribute as sensitive, saving you from having to manually track it.

```hcl
resource "random_password" "db_auth" {
  length  = 16
  special = true
}

resource "aws_db_instance" "production" {
  # ...
  password = random_password.db_auth.result # Automatically masked in CLI
}
```

### The Critical Limitation: State Files

Marking variables and outputs as `sensitive = true` **does not encrypt the value**. It is purely a presentation-layer feature designed to redact values from console logs and CI/CD terminal outputs.

> **Security Warning:** Any value passed into OpenTofu, even if marked as sensitive, will be written in **plaintext** to the `terraform.tfstate` file. If a malicious actor gains read access to your state file, they have access to all your secrets.

Because of this limitation, `sensitive = true` must be part of a broader security strategy:

1.  **Never hardcode secrets:** Never write secrets in your `.tf` or `.tfvars` files. Inject them via environment variables (`TF_VAR_db_password`) in your CI/CD pipeline, or use native cloud secret managers.
2.  **Use Secret Manager Data Sources:** The most secure pattern is to pass an identifier (like a secret name) into OpenTofu, and use a `data` block to fetch the actual secret directly from a vault (e.g., AWS Secrets Manager, HashiCorp Vault) at runtime.
3.  **Encrypt State at Rest:** Always store your remote state in a secure backend (like an S3 bucket or Azure Blob Storage) with strict IAM access controls and at-rest encryption enabled. This will be explored deeply in Chapter 10.