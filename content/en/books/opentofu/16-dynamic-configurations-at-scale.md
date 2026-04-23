As your OpenTofu codebase grows, hardcoding resources quickly becomes unsustainable. Copying and pasting infrastructure violates the DRY principle and introduces risk. This chapter explores how to scale configurations dynamically. We will dive into OpenTofu's iteration mechanisms, comparing the numeric indexing of the `count` meta-argument with the safer, key-based approach of `for_each`. You will also learn how to generate nested configurations on the fly using `dynamic` blocks. Ultimately, you will learn exactly which iteration strategy to choose to keep your state files stable and deployments predictable as your architecture expands.

## 16.1 Iterating Over Infrastructure Resources with `count`

As your infrastructure grows, you will inevitably encounter scenarios where you need to deploy multiple identical—or nearly identical—resources. Copying and pasting the same resource block multiple times violates the DRY (Don't Repeat Yourself) principle, leading to bloated configurations that are difficult to maintain and prone to human error. 

OpenTofu provides the `count` meta-argument to solve this exact problem. By adding `count` to a `resource` or `data` block, you instruct OpenTofu to create multiple instances of that block dynamically.

### The Basics of the `count` Meta-Argument

The `count` meta-argument accepts a whole number (integer) representing the exact number of resource instances you want to provision. 

Consider a scenario where you need to provision three identical web servers. Instead of writing three separate `aws_instance` blocks, you can define it once:

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "Web-Server"
  }
}
```

When you run `tofu plan`, OpenTofu will read this block and generate an execution plan for three distinct EC2 instances. 

### Differentiating Instances with `count.index`

Creating three completely identical resources is rarely useful in practice; usually, you need to differentiate them by name, IP address, or specific tags. Whenever you use the `count` meta-argument, OpenTofu makes a special `count` object available within the block. 

This object contains a single attribute: `count.index`. It represents the zero-based index of the current iteration. You can inject this index into your resource attributes using string interpolation.

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    # This will create Web-Server-0, Web-Server-1, and Web-Server-2
    Name = "Web-Server-${count.index}"
  }
}
```

You can also use `count.index` to look up values from a list variable. This allows you to apply unique configurations to each resource in the loop:

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-1111", "subnet-2222", "subnet-3333"]
}

resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  
  # Assigns each server to a different subnet from the list
  subnet_id = var.subnet_ids[count.index]
}
```

### Conditional Resource Creation

One of the most powerful and common use cases for `count` doesn't actually involve iterating over large numbers. Because `count` can be set to `0`, it serves as OpenTofu's primary mechanism for conditional resource creation. 

By evaluating a boolean variable with a ternary operator (as discussed in Chapter 8), you can toggle the deployment of a resource entirely:

```hcl
variable "enable_monitoring" {
  type        = bool
  description = "Set to true to deploy monitoring infrastructure."
  default     = false
}

resource "aws_cloudwatch_dashboard" "main" {
  # If true, count = 1 (creates resource). If false, count = 0 (ignores resource).
  count          = var.enable_monitoring ? 1 : 0
  dashboard_name = "Primary-Dashboard"
  dashboard_body = file("${path.module}/dashboard.json")
}
```

This pattern is heavily utilized in module development (Part IV) to allow consumers to turn specific features of your module on or off.

### Referencing `count` Resources

When a resource is created without `count`, OpenTofu tracks it as a single object. However, when you add `count`, OpenTofu alters how the resource is stored in the state file. It transforms the resource into a **list of objects**.

```text
Resource Block State Mapping:
-------------------------------------------------------------
Without count: aws_instance.web  --> { ami: "...", id: "i-123" }

With count=3:  aws_instance.web  --> [
                                       { ami: "...", id: "i-123" }, # Index 0
                                       { ami: "...", id: "i-456" }, # Index 1
                                       { ami: "...", id: "i-789" }  # Index 2
                                     ]
```

Because of this structural change, you can no longer reference the resource simply as `aws_instance.web.id`. You must specify *which* instance you are referencing using its index:

```hcl
output "first_server_ip" {
  value = aws_instance.web[0].public_ip
}
```

If you need to retrieve an attribute across all instances generated by the `count` block, you can use the splat expression (`[*]`) introduced in Chapter 8 to extract a list of those values:

```hcl
output "all_server_ips" {
  # Returns a list: ["10.0.0.1", "10.0.0.2", "10.0.0.3"]
  value = aws_instance.web[*].public_ip
}
```

### The List Shift Problem

While `count` is incredibly useful, it has a significant architectural limitation when dealing with lists. Because `count` relies strictly on the numeric index (0, 1, 2), modifying the order or length of the underlying list can cause destructive behavior.

If you remove an element from the *middle* of a list that `count` is iterating over, OpenTofu shifts the indices of all subsequent elements. Consequently, OpenTofu will see this as a change in the configuration for those shifted indices, leading it to destroy and recreate infrastructure that shouldn't have been touched. This structural vulnerability is why OpenTofu offers an alternative iteration method, which we will explore next.

## 16.2 Creating Collections and Maps Safely with `for_each`

In the previous section, we explored the "List Shift Problem" associated with the `count` meta-argument. Because `count` relies on sequential integer indexing (0, 1, 2), any insertion or deletion in the middle of your source list shifts the indices of all subsequent elements. This forces OpenTofu to destroy and recreate infrastructure that otherwise hasn't changed.

To solve this, OpenTofu provides the `for_each` meta-argument. Introduced as a safer, more robust alternative to `count` for dynamic resource creation, `for_each` allows you to iterate over **maps** and **sets of strings**. By using meaningful keys instead of arbitrary integers, `for_each` ensures that your infrastructure remains stable regardless of the order of your source data.

### The `each` Object

When you use `for_each` within a `resource` or `data` block, OpenTofu injects a special `each` object into the block's scope. This object has two attributes:
* **`each.key`**: The map key (or set element) corresponding to the current instance.
* **`each.value`**: The map value corresponding to the current instance. (If iterating over a set, `each.value` is identical to `each.key`).

### Iterating Over Maps

Maps are the most common and powerful data structure to use with `for_each`. They allow you to define distinct configurations for every resource in the collection.

Consider a scenario where you need to create multiple Virtual Networks (Vnets) or Subnets, each with a different CIDR block.

```hcl
variable "subnets" {
  type = map(object({
    cidr_block = string
    az         = string
  }))
  default = {
    "frontend" = { cidr_block = "10.0.1.0/24", az = "us-east-1a" }
    "backend"  = { cidr_block = "10.0.2.0/24", az = "us-east-1b" }
    "database" = { cidr_block = "10.0.3.0/24", az = "us-east-1c" }
  }
}

resource "aws_subnet" "main" {
  for_each = var.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.az

  tags = {
    # each.key evaluates to "frontend", "backend", or "database"
    Name = "${each.key}-subnet" 
  }
}
```

If you later decide to remove the `backend` subnet from the variable, OpenTofu will uniquely identify it by the `"backend"` key and destroy *only* that specific subnet. The `frontend` and `database` subnets will remain completely untouched.

### Iterating Over Sets

Sometimes you don't need complex objects; you just need a simple list of names, such as creating multiple IAM users or S3 buckets. 

Because `for_each` only accepts maps or sets of strings (not lists), you must use the built-in `toset()` function to convert a standard list into a set before iterating.

```hcl
variable "iam_users" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

resource "aws_iam_user" "developers" {
  # Convert the list to a set of strings
  for_each = toset(var.iam_users)

  # For sets, each.key and each.value are the same
  name = each.key 
}
```

### How `for_each` Transforms the State File

Unlike `count`, which converts a resource block into an *array* of objects in the state file, `for_each` converts the resource block into a *map* (or dictionary) of objects. The keys of this map match the keys you provided in your configuration.

```text
State Mapping Comparison:
-------------------------------------------------------------
Using count:     aws_iam_user.developers[0]  --> "alice"
                 aws_iam_user.developers[1]  --> "bob"

Using for_each:  aws_iam_user.developers["alice"]   --> "alice"
                 aws_iam_user.developers["bob"]     --> "bob"
```

This state structure is what guarantees stability. If `"bob"` is removed from the configuration, OpenTofu simply drops the `"bob"` key from the state and destroys the corresponding resource. The `"alice"` key is entirely independent.

### Referencing `for_each` Resources

Because `for_each` turns the resource into a map of objects, you must reference specific instances using their string keys:

```hcl
output "alice_arn" {
  value = aws_iam_user.developers["alice"].arn
}
```

If you want to output attributes from *all* instances created by `for_each`, you cannot use the splat expression (`[*]`) because splats only work with lists. Instead, you must use a `values()` function or a `for` expression (covered in Chapter 8) to extract the data from the map:

```hcl
output "all_user_arns" {
  # Extracts all ARN values from the generated map
  value = [for user in aws_iam_user.developers : user.arn]
}
```

### The Limitations of `for_each`

While `for_each` is overwhelmingly preferred over `count` for collections, it does have a strict requirement: **OpenTofu must know the keys of the map or set during the planning phase.**

If you attempt to use `for_each` with a map whose keys are generated dynamically by another resource (e.g., an auto-generated ID from an API), OpenTofu will throw an error during `tofu plan`. The keys must be deterministic and known before any infrastructure is actually created. If you face this scenario, you must either structure your configuration so the keys are known inputs, or fall back to `count` in specific edge cases where dynamic keys are unavoidable.

## 16.3 Generating Configuration Blocks Dynamically with `dynamic`

While `count` and `for_each` are the standard mechanisms for generating entirely new, top-level resources, they cannot be used *inside* a resource to generate nested configuration blocks. Many cloud resources rely heavily on these nested blocks. For example, an AWS Security Group uses nested `ingress` and `egress` blocks to define firewall rules, while an Auto Scaling Group uses nested `tag` blocks. 

If you are building a reusable module and need to allow consumers to define an arbitrary number of these nested rules, hardcoding them is not an option. OpenTofu provides the `dynamic` block specifically to solve this problem.

### The Anatomy of a `dynamic` Block

A `dynamic` block acts as a localized `for` loop designed exclusively to stamp out nested configuration blocks. It replaces static nested blocks with a dynamic generator.

```text
Dynamic Block Structure:
-------------------------------------------------------------
resource "..." "..." {
  # Static top-level arguments
  name = "example"

  dynamic "<block_name>" {
    for_each = <collection_or_map>
    
    content {
      <argument_1> = <block_name>.value
      <argument_2> = <block_name>.key
    }
  }
}
```

The `dynamic` block takes the name of the nested block you want to generate (e.g., `"ingress"`, `"setting"`, `"tag"`). Inside, it requires two main components:
1. **`for_each`**: The collection (list, set, or map) that you want to iterate over. 
2. **`content`**: The actual configuration arguments that will be generated for each item in the collection.

### Practical Application: Security Group Rules

Consider a scenario where you want to deploy a web server, but you want to pass a dynamic list of ports to open via a variable, rather than hardcoding multiple `ingress` blocks.

```hcl
variable "ingress_ports" {
  type        = list(number)
  description = "List of TCP ports to open for inbound traffic"
  default     = [22, 80, 443, 8080]
}

resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Allow inbound web and SSH traffic"
  vpc_id      = aws_vpc.main.id

  # Generates one 'ingress' block for every number in the variable list
  dynamic "ingress" {
    for_each = var.ingress_ports
    
    content {
      description = "Allow traffic on port ${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

Notice the use of `ingress.value`. By default, OpenTofu creates a temporary iterator object named after the `dynamic` block itself. Because our block is named `"ingress"`, we access the current item in the loop using `ingress.value`. 

### Customizing the Iterator

In complex configurations, especially when dealing with nested `dynamic` blocks (a dynamic block inside another dynamic block), relying on the default iterator name can become confusing. OpenTofu allows you to rename this temporary variable using the `iterator` argument.

Here is an example of iterating over a map of database settings, where the iterator is explicitly renamed to `db_setting` to improve code readability:

```hcl
variable "database_settings" {
  type = map(string)
  default = {
    "max_connections" = "100"
    "shared_buffers"  = "128MB"
  }
}

resource "aws_db_parameter_group" "main" {
  name   = "custom-postgres-params"
  family = "postgres14"

  dynamic "parameter" {
    for_each = var.database_settings
    iterator = db_setting # Renames the iterator from 'parameter' to 'db_setting'
    
    content {
      name  = db_setting.key
      value = db_setting.value
    }
  }
}
```

### Best Practices and Anti-Patterns

While `dynamic` blocks are an incredibly powerful tool for writing flexible modules, they should be used with caution. 

**The Readability Cost:** Overusing `dynamic` blocks can quickly turn an easily understandable declarative configuration into complex, imperative-looking code. If an engineer has to reverse-engineer a complex variable structure just to figure out what ports a security group is opening, the IaC has lost its primary benefit of readability.

**When to use them:**
* Use `dynamic` blocks heavily in **shared modules** (Part IV) where flexibility is paramount, and the module consumer expects to pass in variable lists of configurations.
* Use them when the underlying API requires an unpredictable number of nested blocks based on the environment (e.g., tagging resources dynamically based on the active workspace).

**When to avoid them:**
* Avoid `dynamic` blocks in **root configurations** (the code you actually deploy) if the nested blocks are static and rarely change. Writing out three static `ingress` blocks is almost always preferable to building a complex data structure and a `dynamic` block just to save a few lines of code. Optimize for human readability first.

## 16.4 Deciding Between `count` and `for_each` for Stability

Now that we have explored both iteration mechanisms, a critical architectural decision emerges: when should you use `count` and when should you use `for_each`? Choosing the wrong iteration strategy can lead to fragile configurations and terrifying `tofu plan` outputs where OpenTofu threatens to destroy and recreate large swaths of production infrastructure.

The decision ultimately boils down to **state stability** and **resource identity**.

### The Core Difference: Identity in State

To summarize the previous sections, OpenTofu tracks iterated resources differently based on the meta-argument used:

* **`count`** identifies resources by their **position in a sequence** (an integer index: `[0]`, `[1]`, `[2]`).
* **`for_each`** identifies resources by a **meaningful key** (a string: `["frontend"]`, `["backend"]`).

If a resource's identity is tied to its position, any disruption to that sequence (inserting or deleting an item in the middle of a list) destroys the identity of all subsequent items. If a resource's identity is tied to a unique string key, the surrounding items can change without affecting it.

### When to Use `for_each` (The Default Choice)

As a general best practice in OpenTofu, **`for_each` should be your default choice for iterating over collections.**

You should explicitly use `for_each` when:
* **The resources have distinct identities:** If you are creating subnets, IAM users, databases, or route tables, each item has a specific purpose. Losing one should not impact the others.
* **The collection is likely to change:** If there is any chance you will add or remove items from the configuration over the lifecycle of the infrastructure, `for_each` guarantees that only the modified items are touched.
* **You are iterating over complex objects:** `for_each` cleanly maps to complex input variables (like a map of objects), making it easy to pass distinct configurations to each resource instance.

### When to Use `count` (The Exceptions)

Despite the dominance of `for_each` for collections, `count` still has three highly specific and vital use cases where `for_each` either fails or is unnecessarily complex.

You should use `count` when:

1.  **Conditional Resource Creation (Toggling):**
    This is the most common and powerful use of `count`. When you simply need to turn a single resource on or off using `count = var.enabled ? 1 : 0`, it is cleaner and more idiomatic than attempting to use `for_each` with an empty map.

2.  **Iterating Over Unknown Values:**
    `for_each` has a strict limitation: the map keys or set elements must be known *before* OpenTofu applies the configuration (during the plan phase). If you need to iterate over a list of IDs generated dynamically by another resource being created in the same run, `for_each` will throw an error. In this edge case, `count` is your only viable option.

3.  **Truly Identical, Ephemeral Resources:**
    If you are provisioning a batch of resources where individual identity genuinely does not matter—such as spinning up 50 identical load-testing worker nodes—`count` is perfectly acceptable. If node `[12]` is deleted and OpenTofu recreates it, the system's overall function remains unaffected.

### Feature Comparison Matrix

Use the following table as a quick reference guide when designing your modules and configurations:

| Feature/Scenario | `count` | `for_each` |
| :--- | :--- | :--- |
| **Data Structure Used** | Whole Numbers (Integers) | Maps or Sets of Strings |
| **State Tracking** | By Integer Index (`[0]`, `[1]`) | By String Key (`["key"]`) |
| **List Shift Vulnerability**| **High** (Changes shift all indices) | **None** (Keys are independent) |
| **Conditional Toggling** | **Excellent** (`1` or `0`) | Clunky (Requires empty maps/sets) |
| **Keys Known at Apply** | Supported | **Not Supported** (Keys must be known at Plan) |
| **Resource Reference** | `resource.name[index]` | `resource.name["key"]` |
| **Nested Blocks** | Not Supported | Supported (via `dynamic` blocks) |

> **A Note on Refactoring:** If you realize you have mistakenly used `count` for a critical list of resources and want to upgrade to `for_each` for better stability, you cannot simply change the code. OpenTofu will see the `count` resources as deleted and the `for_each` resources as brand new, resulting in a destructive recreation. You must safely transition the state using `moved` blocks, a technique we will cover thoroughly in Chapter 12.