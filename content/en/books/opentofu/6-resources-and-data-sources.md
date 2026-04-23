If providers are the bridge to your cloud platforms, resources and data sources are the actual cargo crossing it. In this chapter, we dive into the beating heart of OpenTofu: the `resource` and `data` blocks. You will learn how to declare physical infrastructure—from compute instances to virtual networks—ensuring your desired state becomes a reality. We will explore how to elegantly manage implicit and explicit dependencies so your deployments run smoothly. Beyond creation, we will cover how to query existing external infrastructure using data sources to make your code dynamic. Finally, we will master resource lifecycles and handle cloud API timeouts.

## 6.1 Defining Physical Infrastructure with Resource Blocks

Resource blocks are the foundational building blocks of the OpenTofu language. If providers (discussed in Chapter 5) are the toolboxes that know how to communicate with external APIs, then resource blocks are the specific tools you pull from those boxes to build your environment. 

A `resource` block declares a physical or logical infrastructure object. This could be a tangible compute instance, a virtual network, a DNS record, or even a logical construct like a TLS certificate or an access policy. When you write a resource block, you are instructing OpenTofu to ensure that the specified object exists and is configured exactly as declared.

### The Anatomy of a Resource Block

Every resource block follows a strict, predictable syntax consisting of a keyword, a resource type, a local name, and a configuration body. 

Here is a standard example defining an AWS EC2 instance:

```hcl
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name        = "PrimaryWebServer"
    Environment = "Production"
  }
}
```

Let's break down this structure:

1.  **The Keyword (`resource`):** This tells the OpenTofu engine that you are defining a managed infrastructure component.
2.  **The Resource Type (`"aws_instance"`):** This is a fixed string defined by the provider. The prefix (in this case, `aws_`) tells OpenTofu which provider is responsible for managing the resource. The suffix (`instance`) specifies the exact type of object to create.
3.  **The Local Name (`"web_server"`):** This is an arbitrary identifier chosen by you. It is used strictly within your OpenTofu module to reference this specific resource.
4.  **The Configuration Body (`{ ... }`):** Enclosed in curly braces, this contains the arguments used to configure the resource.

### The Unique Identifier Rule

Within a given module, the combination of the **resource type** and the **local name** must be completely unique. In the example above, the unique identifier is `aws_instance.web_server`. 

You could create another resource named `aws_instance.database` or an `aws_s3_bucket.web_server`, but you cannot have two `aws_instance.web_server` blocks in the same module. This unique address is how OpenTofu tracks the resource in its state file (which we will explore deeply in Chapter 9).

### Arguments vs. Attributes

Inside the configuration body, you define **arguments**—the specific settings required by the provider to provision the resource. 

* **Required Arguments:** Some arguments must be provided. For an `aws_instance`, the `ami` (Amazon Machine Image) and `instance_type` are strictly required. Omitting them will cause OpenTofu to fail during the planning phase.
* **Optional Arguments:** Other parameters, like `tags`, have default behaviors or are not strictly necessary for creation.

Once OpenTofu successfully creates the resource, the provider returns **attributes**—data computed by the remote API. While you define the `ami` (an argument), the cloud provider generates the `public_ip` and `id` (attributes). 

The flow of definition to realization looks like this:

```text
+-----------------------------------------------------+
| 1. OpenTofu Code (Desired State)                    |
|                                                     |
| resource "aws_instance" "web_server" {              |
|   ami           = "ami-0c55b159cbfafe1f0" <---+     |
|   instance_type = "t2.micro"                  |     |
| }                                             |     |
+--------------------------+--------------------+     |
                           |                    |     |
            [ OpenTofu Core & AWS Provider ]    |     |
            Translates HCL to API Requests      |     |
                           |                    |     |
                           v                    |     |
+--------------------------+--------------------+     |
| 2. Cloud Infrastructure (Actual State)        |     |
|                                               |     |
| AWS EC2 Instance Running                      |     |
| - ID: i-0abcdef1234567890 (Computed)          |     |
| - Public IP: 203.0.113.42 (Computed)          |     |
| - AMI: ami-0c55b159cbfafe1f0  >---------------+     |
+-----------------------------------------------------+
```

### Lifecycle Context

Because OpenTofu operates declaratively, the resource block represents the *entire lifecycle* of the physical infrastructure object:

* **Creation:** Adding a new resource block tells OpenTofu to create it.
* **Update:** Modifying an argument inside the block (e.g., changing `"t2.micro"` to `"t3.medium"`) tells OpenTofu to update the existing resource in-place, or destroy and recreate it if the cloud API does not support in-place updates for that specific property.
* **Destruction:** Removing the resource block entirely from your configuration file is the declarative way to tell OpenTofu to terminate and delete the infrastructure object permanently.

### Best Practices for Resource Definition

1.  **Use Snake Case:** HCL convention dictates that local names should use `snake_case` (e.g., `web_server`, not `WebServer` or `web-server`).
2.  **Avoid Redundancy:** Do not include the resource type in the local name. Use `resource "aws_security_group" "web"` instead of `resource "aws_security_group" "aws_security_group_web"`. 
3.  **Group Logically:** Keep closely related resources near each other in your `.tf` files, or split them into logically named files (e.g., `network.tf`, `compute.tf`) to maintain readability as your physical footprint scales.

## 6.2 Managing Resource Dependencies: Implicit vs. Explicit

Unlike traditional imperative scripting languages where commands execute sequentially from top to bottom, OpenTofu is declarative. When you run `tofu apply`, the engine parses your `.tf` files, analyzes the relationships between all the declared resources, and constructs a **Directed Acyclic Graph (DAG)**. 

This graph determines the order of operations. Independent resources are provisioned concurrently to save time, while dependent resources are provisioned sequentially. Understanding how OpenTofu builds this graph—through implicit and explicit dependencies—is critical for designing reliable, race-condition-free infrastructure.

### The Power of Implicit Dependencies

An **implicit dependency** is established automatically when one resource block references an attribute exported by another resource block. This is the most common, safest, and highly recommended way to manage dependencies in OpenTofu.

When OpenTofu sees that Resource B needs a piece of data that only exists after Resource A is created (like an assigned IP address or a generated ID), it automatically knows it must create Resource A first.

Consider this standard network setup:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "web" {
  # The reference to aws_vpc.main.id creates an implicit dependency
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
```

In this example, OpenTofu detects the expression `aws_vpc.main.id` inside the `aws_subnet.web` block. It infers that the subnet cannot be created until the VPC exists and returns its `id`. The DAG will enforce that the VPC provisions completely before the subnet begins provisioning.

### When Automation Needs a Nudge: Explicit Dependencies

Sometimes, two resources are architecturally dependent, but their OpenTofu configurations do not share any data. Because there is no attribute reference, OpenTofu assumes they are independent and attempts to build them simultaneously, which often results in a race condition and a failed deployment.

To solve this, OpenTofu provides the `depends_on` meta-argument. This creates an **explicit dependency**, forcing OpenTofu to wait for one resource to finish before starting another.

A classic scenario involves compute instances and identity access management (IAM). Imagine an EC2 instance that runs a startup script requiring access to an S3 bucket. The instance needs an IAM role attached to it via an instance profile. 

```hcl
resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.s3_read.arn
}

resource "aws_instance" "app_server" {
  ami                  = "ami-0c55b159cbfafe1f0"
  instance_type        = "t2.micro"
  iam_instance_profile = aws_iam_instance_profile.app_profile.name

  # The instance doesn't reference the policy attachment directly,
  # but the application will fail if the policy isn't attached before boot.
  depends_on = [
    aws_iam_role_policy_attachment.s3_access
  ]
}
```

Without the `depends_on` block, OpenTofu might create the instance and the instance profile simultaneously with the policy attachment. If the instance boots and runs its script before the policy is fully attached to the role, the script will fail with an "Access Denied" error.

### Visualizing the Dependency Graph

OpenTofu evaluates these relationships to build an execution plan. You can visualize this conceptually:

```text
[ Implicit Dependency Flow ]           [ Explicit Dependency Flow ]

  +-----------------+                    +------------------------------+
  |  aws_vpc.main   |                    | aws_iam_policy_attachment... |
  +--------+--------+                    +--------------+---------------+
           |                                            |
           | (Provides vpc.id)                          | (depends_on forces wait)
           v                                            v
  +-----------------+                    +------------------------------+
  | aws_subnet.web  |                    |   aws_instance.app_server    |
  +-----------------+                    +------------------------------+
```

If you ever need to debug complex relationships, you can use the `tofu graph` command, which outputs the DAG in DOT format. This can be piped into graph visualization tools like Graphviz to generate a visual map of your exact infrastructure dependencies.

### Best Practices for Dependencies

1.  **Prefer Implicit Over Explicit:** Always use implicit dependencies whenever possible. They are less prone to human error and keep the codebase cleaner. Let OpenTofu's graph engine do the heavy lifting.
2.  **Document Your `depends_on` Blocks:** Explicit dependencies are often non-obvious to other engineers reviewing the code. Always include a comment above a `depends_on` block explaining *why* it is necessary.
3.  **Use at the Module Level:** OpenTofu allows you to use `depends_on` on entire module calls, not just individual resources. If an entire application module relies on a database module finishing its setup, a module-level `depends_on` can be a clean architectural choice.
4.  **Beware of Graph Cycles:** Be careful not to create circular dependencies (A depends on B, and B depends on A). OpenTofu will catch this during the `tofu plan` phase and throw a "Cycle" error, forcing you to refactor your logic before deployment.

## 6.3 Querying Existing Infrastructure Using Data Sources

While `resource` blocks dictate the creation and management of infrastructure, no OpenTofu configuration exists in a vacuum. You will frequently need to interact with infrastructure that was provisioned manually, managed by a different OpenTofu state, or provided dynamically by the cloud vendor. 

This is where **data sources** come in. A `data` block allows OpenTofu to read information from an external system and expose it as structured, queryable data within your configuration. If resources are the "write" operations of OpenTofu, data sources are the "read" operations.

### The Anatomy of a Data Source

The syntax of a data source closely mirrors that of a resource block, using the `data` keyword instead of `resource`. 

Here is a common example used to dynamically fetch the most recent Ubuntu Amazon Machine Image (AMI) rather than hardcoding a static AMI ID:

```hcl
data "aws_ami" "latest_ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's official AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
```

Let's break down the structure:

1.  **The Keyword (`data`):** Instructs OpenTofu to query an existing object rather than create a new one.
2.  **The Data Source Type (`"aws_ami"`):** Defined by the provider, specifying exactly what type of API query to execute.
3.  **The Local Name (`"latest_ubuntu"`):** Your internal identifier for this data block.
4.  **The Query Arguments:** The configuration body contains filters and parameters required to narrow down the search on the provider's end.

### Referencing Data Source Attributes

Once OpenTofu successfully executes the query, the returned attributes are held in memory for the duration of the run. You reference this data using the syntax `data.<TYPE>.<NAME>.<ATTRIBUTE>`.

To use the AMI we queried above in an EC2 instance resource:

```hcl
resource "aws_instance" "web_server" {
  # Referencing the ID retrieved by the data source
  ami           = data.aws_ami.latest_ubuntu.id
  instance_type = "t3.micro"
}
```

### The Data Source Resolution Flow

```text
+-----------------------+        1. Query          +------------------------+
| OpenTofu Engine       | -----------------------> | Provider API           |
| (data "aws_vpc"...)   |                          | (e.g., AWS EC2)        |
|                       | <----------------------- |                        |
+-----------------------+  2. Returns Attributes   +------------------------+
          |                 (id, cidr_block, etc.)
          |
          | 3. Injects Data
          v
+-----------------------+
| Resource Block        |
| (vpc_id = data...)    |
+-----------------------+
```

### Common Architectural Use Cases

Data sources are a cornerstone of scalable, modular infrastructure. Relying on them helps you avoid hardcoded values, making your code more portable and resilient.

* **Cross-Team Collaboration:** In large organizations, a central platform team might manage the core network (VPCs, Subnets, Transit Gateways). Application teams can use `data` blocks to look up the IDs of these networks by their tags, rather than hardcoding VPC IDs that might change.
* **Provider Metadata:** You can query the environment itself. For example, `data "aws_caller_identity" "current" {}` returns the AWS Account ID, User ID, and ARN of the credentials currently running the `tofu` command.
* **Dynamic Lookups:** Fetching the latest managed database versions, available Availability Zones (`data "aws_availability_zones" "available"`), or the current IP address of a managed service.

### Data Sources and the Lifecycle

Understanding *when* OpenTofu executes a data source query is critical for debugging:

1.  **During the Plan Phase:** By default, OpenTofu reads data sources during `tofu plan`. This allows the engine to show you exactly what will happen during the apply phase (e.g., "I am going to build an instance using AMI `ami-12345`").
2.  **Deferred to the Apply Phase:** If a data source's query arguments depend on a resource that *has not been created yet* (e.g., querying the details of a database that is being built in the same configuration), OpenTofu cannot read it during the plan. The read operation is deferred to the `tofu apply` phase. In the plan output, you will see the data source attributes marked as `(known after apply)`.

### Best Practices for Querying

* **Be Highly Specific:** Most data sources expect to return exactly *one* result. If your filters are too broad and the provider returns multiple objects, OpenTofu will throw an error and halt execution. Use precise tags and strict filters.
* **Handle Multiple Results Intentionally:** If you *want* to retrieve multiple items (like a list of all subnet IDs in a VPC), look for pluralized data sources provided by the vendor. For example, `data "aws_subnet"` returns a single subnet, while `data "aws_subnets"` returns a list of IDs.
* **Use Tags for Discovery:** The most robust way to link decoupled infrastructure is through tagging. Tag your core infrastructure thoroughly so that downstream workspaces can reliably query those resources using `filter { name = "tag:Environment" values = ["Production"] }`.

## 6.4 Mastering Resource Lifecycles and Meta-Arguments

By default, OpenTofu manages resources using a predictable, straightforward lifecycle: it creates resources that don't exist, updates resources when configuration arguments change, and destroys resources that are removed from the code. If an update requires changing an immutable attribute (an attribute the cloud provider’s API does not allow to be updated in-place), OpenTofu defaults to destroying the existing resource first, and then creating the new one.

However, real-world infrastructure is rarely so simple. You will encounter scenarios where destroying a resource before replacing it causes unacceptable downtime, where a database must be protected from accidental deletion at all costs, or where an external system modifies a resource tag that OpenTofu shouldn't try to revert. 

To override OpenTofu's default behavior, you use **meta-arguments**. While standard arguments (like `ami` or `instance_type`) are specific to a provider's resource, meta-arguments are parsed directly by the OpenTofu core engine and can be used on *any* resource.

While `depends_on` (covered in 6.2) and scaling arguments like `count` and `for_each` (covered in Chapter 16) are meta-arguments, the most direct control over how a resource is handled over time comes from the `lifecycle` block.

### The `lifecycle` Configuration Block

The `lifecycle` block is a nested meta-argument that alters the standard CRUD (Create, Read, Update, Delete) operations. It supports several specific arguments:

#### 1. `create_before_destroy`
When OpenTofu needs to replace a resource due to an immutable change, the default behavior is **Destroy → Create**. For critical infrastructure like load balancers or Auto Scaling Groups, this means downtime. 

Setting `create_before_destroy = true` reverses this order to **Create → Update References → Destroy**. OpenTofu will provision the replacement, update any dependent resources to point to the new infrastructure, and only then destroy the old resource.

```hcl
resource "aws_launch_template" "web_app" {
  name_prefix   = "web-app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  lifecycle {
    create_before_destroy = true
  }
}
```
*Note: When using `create_before_destroy`, ensure the resource name can be unique. In the example above, `name_prefix` is used instead of a static `name` to prevent naming collisions when the new and old templates exist simultaneously.*

#### 2. `prevent_destroy`
This is your safety mechanism for stateful, mission-critical infrastructure like databases, storage buckets, or KMS keys. When `prevent_destroy = true` is set, OpenTofu will instantly reject any `tofu plan` or `tofu apply` that includes the destruction of this resource.

```hcl
resource "aws_db_instance" "production_database" {
  allocated_storage = 100
  engine            = "postgres"
  instance_class    = "db.m5.large"
  
  lifecycle {
    prevent_destroy = true
  }
}
```
If you ever genuinely need to destroy this database, you must first deliberately remove the `prevent_destroy` block from your configuration, apply that change, and *then* destroy the resource.

#### 3. `ignore_changes`
Often, infrastructure is modified by external actors after provisioning. For example, an Auto Scaling Group might scale its `desired_capacity` based on traffic, or a security tool might automatically append metadata `tags`. 

If OpenTofu detects these changes during a plan, it will attempt to revert the resource back to the exact state defined in your code. The `ignore_changes` argument tells OpenTofu to overlook drift on specific attributes.

```hcl
resource "aws_autoscaling_group" "web_asg" {
  max_size         = 10
  min_size         = 2
  desired_capacity = 4 # OpenTofu sets this initially

  lifecycle {
    # OpenTofu will ignore future changes to desired_capacity made by auto-scaling policies
    ignore_changes = [
      desired_capacity,
      tags["LastScanned"]
    ]
  }
}
```
You can also use `ignore_changes = [all]` to ignore all attributes, which is useful for resources that OpenTofu should create but never update again.

#### 4. `replace_triggered_by`
Introduced in later versions of the IaC ecosystem, this argument forces a resource replacement when an entirely different resource (or a specific attribute of another resource) changes. 

Imagine an application running on an EC2 instance or ECS task that pulls its configuration from a specific database parameter group. If the parameter group changes, the instance might need a hard reboot (replacement) to pick up the new settings, even if the instance code itself hasn't changed.

```text
[ Triggering Resource ]                 [ Target Resource ]
aws_db_parameter_group.custom  ======>  aws_instance.app_server
(Action: Updates parameter)             (Action: replacement forced by trigger)
```

Here is how that relationship is defined in code:

```hcl
resource "aws_db_parameter_group" "app_config" {
  name   = "app-config"
  family = "postgres14"
  # ... parameters ...
}

resource "aws_instance" "app_server" {
  ami           = "ami-123456"
  instance_type = "t3.micro"

  lifecycle {
    replace_triggered_by = [
      # Forces replacement of the EC2 instance if the parameter group is updated
      aws_db_parameter_group.app_config
    ]
  }
}
```

### Strategic Use of Meta-Arguments

Mastering the `lifecycle` block transitions you from merely provisioning infrastructure to actively managing its operational realities. By strategically combining `create_before_destroy` for high availability and `prevent_destroy` for data security, you build resilience directly into the declarative code.

## 6.5 Handling Resource Timeouts and API Retries

Cloud infrastructure is inherently distributed and subject to the physical realities of networking. APIs rate-limit requests, network packets drop, and complex physical hardware takes variable amounts of time to provision. A virtual machine might boot in ten seconds, while a managed relational database or a specialized Kubernetes cluster might take over forty minutes. 

If OpenTofu expected instantaneous results from every API call, deployments would fail constantly. To handle this, OpenTofu and its providers utilize a combination of resource-level timeouts and provider-level API retry logic.

### Configuring Resource Timeouts

When OpenTofu sends a "Create" request to a cloud provider, it enters a polling loop. It repeatedly asks the provider, "Is the resource ready yet?" until the provider responds with a success signal or until a predefined timer expires.

If the timer expires, OpenTofu aborts the operation and marks the deployment as tainted or failed. Most providers set sensible default timeouts for their resources, but you will occasionally need to override these defaults for heavily customized, slow-provisioning infrastructure.

You manage this using the nested `timeouts` block within a resource definition:

```hcl
resource "aws_db_instance" "analytical_warehouse" {
  allocated_storage = 500
  engine            = "postgres"
  instance_class    = "db.r6g.8xlarge"
  # ... other configuration ...

  timeouts {
    create = "1h30m"  # Allow up to 1.5 hours for initial creation
    update = "2h"     # Allow up to 2 hours for major version upgrades
    delete = "30m"    # Allow 30 minutes for graceful teardown and final snapshots
  }
}
```

The `timeouts` block supports standard duration strings (e.g., `"10s"` for seconds, `"5m"` for minutes, `"2h"` for hours). The specific actions you can override (`create`, `update`, `read`, `delete`, and sometimes `default`) depend on the specific resource type and how its provider is programmed.

### Understanding Provider-Level API Retries

While timeouts dictate how long OpenTofu waits for an operation to *finish*, API retries dictate how OpenTofu behaves when an API request *fails to connect* or is explicitly rejected.

Cloud providers enforce strict rate limits. If a large `tofu apply` attempts to create 200 security group rules simultaneously, the cloud API might respond with an `HTTP 429 Too Many Requests` error. 

Providers handle this internally using **exponential backoff**. Instead of failing immediately, the provider pauses, retries the request, pauses a bit longer, and retries again.

```text
[ Standard API Retry Logic with Exponential Backoff ]

tofu apply -> [ API Request ] 
                 |
                 v
            (HTTP 429: Rate Limited)
                 |
                 +-> Wait 2s -> [ Retry 1 ] -> (HTTP 429)
                                    |
                                    +-> Wait 4s -> [ Retry 2 ] -> (HTTP 500)
                                                       |
                                                       +-> Wait 8s -> [ Retry 3 ] -> (HTTP 200 OK!)
```

#### Configuring Provider Retries

If you are operating in a heavily throttled environment, or deploying a massive architecture, the default number of retries might not be enough. You can usually configure this retry behavior directly within the `provider` block.

For example, configuring the AWS provider to be more patient during throttling events:

```hcl
provider "aws" {
  region = "us-east-1"

  # Increase the maximum number of API retries (default is usually 25)
  max_retries = 50 
}
```

*Note: The exact argument name (like `max_retries`) varies depending on the provider you are using. Always consult the specific provider's documentation in the OpenTofu Registry.*

### Eventual Consistency and Timeouts

One of the most frustrating errors in IaC occurs due to **eventual consistency**. This happens when Resource A is successfully created, but the cloud provider's internal database hasn't fully synchronized. When OpenTofu immediately tries to create Resource B (which depends on Resource A), the cloud provider responds with a "Resource A Not Found" error.

Well-designed providers anticipate this and automatically catch these specific "Not Found" errors, treating them as temporary network blips and retrying the request. 

If you consistently encounter eventual consistency failures that cause your deployments to crash, you have two courses of action:
1.  **Check Provider Versions:** Ensure you are using the latest version of the provider, as maintainers frequently add new retry logic for endpoints that are notoriously slow to sync.
2.  **Strategic Delays (Use with Caution):** In rare cases where provider logic fails, you might have to rely on community modules like `time_sleep` to force OpenTofu to pause execution between resources. However, this is considered a brittle anti-pattern and should only be used as a last resort when native timeouts and API retries are insufficient.