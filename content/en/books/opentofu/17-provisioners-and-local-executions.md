While OpenTofu excels at declaratively defining infrastructure, the real world often demands imperative actions. You might need to bootstrap a configuration management agent, run a local script, or trigger a legacy API that lacks a dedicated provider. Chapter 17 introduces provisioners: OpenTofu's built-in escape hatch for executing arbitrary commands. We will explore how to use `local-exec` and `remote-exec` to bridge the gap between infrastructure creation and software configuration. However, with this flexibility comes significant risk. We will examine how provisioners break the declarative paradigm, how to manage their failure states, and why they should always be your last resort.

## 17.1 The Role and Limitations of Provisioners in OpenTofu

OpenTofu is fundamentally built on a declarative paradigm: you define the desired state of your infrastructure, and the core engine calculates the execution plan to achieve that state. However, the real world of infrastructure is rarely perfectly declarative. Legacy systems, custom bootstrapping scripts, and internal APIs without dedicated providers often require imperative actions. 

This is where **provisioners** come into play. Provisioners act as the imperative escape hatch within OpenTofu’s declarative model. They allow you to execute arbitrary command-line scripts or configuration management tools on a local or remote machine as part of the resource lifecycle.

### The Role of Provisioners

While OpenTofu is exceptionally good at provisioning the *infrastructure* (creating a virtual machine, allocating an IP address, attaching a disk), it is not a configuration management tool. Provisioners bridge the gap between infrastructure creation and software configuration.

The primary roles of provisioners include:

* **Bootstrapping:** Installing an initial agent (like an Ansible, Chef, or Puppet client) on a newly created virtual machine so that a dedicated configuration management system can take over.
* **Integrating with Unsupported Systems:** Triggering an internal API endpoint, updating a legacy database table, or sending a specific webhook that does not have an existing OpenTofu provider.
* **Data Extraction:** Fetching an initial set of credentials or configuration files generated on a newly booted instance and saving them to your local environment for immediate use.

To understand where provisioners fit, you must understand their place in the resource lifecycle. By default, provisioners run immediately *after* the resource is created, but *before* OpenTofu marks the resource creation as complete in the state file.

```text
+-------------------+      +-------------------+      +-------------------+
|                   |      |                   |      |                   |
| 1. Cloud API Call | ---> | 2. Provisioner    | ---> | 3. State Updated  |
|  (Resource Built) |      |    Execution      |      |   (Marked Ready)  |
|                   |      |                   |      |                   |
+-------------------+      +-------------------+      +-------------------+
                                     |
                                     v
                           [If execution fails]
                                     |
                                     v
                         Resource marked as 'Tainted'
```

In the configuration language, a `provisioner` block is nested directly inside the `resource` block it applies to:

```hcl
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  # The provisioner runs after the EC2 instance is created
  provisioner "local-exec" {
    command = "echo 'The server ${self.public_ip} is up!' >> server_ips.txt"
  }
}
```

### The Limitations of Provisioners

Because provisioners fundamentally step outside of OpenTofu's core design principles, they introduce significant friction and complexity. Understanding these limitations is critical before introducing them into your codebase.

#### 1. They Break Declarative State
OpenTofu cannot model the behavior of a provisioner. When you use a standard provider block, OpenTofu understands exactly what attributes exist and can detect drift if someone manually changes the infrastructure. A provisioner, however, is a black box. If an arbitrary bash script runs via a provisioner, OpenTofu has no way to track the changes that script made, meaning it cannot repair or update those changes on subsequent runs.

#### 2. Lack of Idempotency
By default, provisioners only run during resource **creation**. If you modify the script inside the `provisioner` block and run `tofu apply`, OpenTofu will *not* execute the script again, because the resource itself has already been created. 

If you design a provisioner script that isn't idempotent (meaning it fails or causes errors if run more than once) and you find a way to force it to run again, you risk breaking your environment.

#### 3. State File Pollution (Tainting)
As shown in the lifecycle diagram above, if a resource is created successfully via the cloud provider's API, but the subsequent provisioner script exits with a non-zero status code (a failure), OpenTofu is caught in a difficult position. The infrastructure exists, but the expected configuration step failed. 

OpenTofu resolves this by marking the resource as **tainted** in the state file. On the next `tofu apply`, OpenTofu will completely destroy the resource and recreate it from scratch, hoping the provisioner succeeds the second time. This can lead to unexpected and potentially dangerous destruction of infrastructure if provisioners are flaky or heavily dependent on external network conditions.

#### 4. Portability and OS Dependencies
When you write an imperative script, you are binding your OpenTofu configuration to a specific operating system or environment. 
* A `local-exec` running a bash script will fail if a teammate runs `tofu apply` from a Windows machine.
* A `remote-exec` running PowerShell will fail if the target server is swapped from Windows Server to Linux. 

Standard OpenTofu providers abstract away the underlying OS, ensuring cross-platform consistency. Provisioners immediately strip away this advantage.

#### 5. Obscure Error Handling
When a standard resource fails, the provider returns a structured, usually documented API error. When a provisioner fails, you are left parsing standard output (`stdout`) and standard error (`stderr`) streams dumped directly into the OpenTofu CLI logs. Debugging complex script failures inside an OpenTofu run is notoriously difficult and lacks the tooling available when running those scripts natively.

## 17.2 Executing Scripts with `local-exec` and `remote-exec`

When you have exhausted declarative options and must rely on provisioners, OpenTofu provides two primary tools for executing arbitrary scripts: `local-exec` and `remote-exec`. The fundamental difference between them lies entirely in **where** the execution takes place.

To visualize the execution boundaries, consider the following diagram:

```text
  [OpenTofu Execution Environment]
  (Your Laptop or CI/CD Runner)
         |
         |--- 1. local-exec  ---> Executes processes directly on this machine.
         |                        Useful for local scripts, API calls, or 
         |                        kicking off external pipelines (e.g., Ansible).
         |
         v  (Network Boundary)
         
  [Target Infrastructure]
  (e.g., newly created VM)
         |
         |--- 2. remote-exec ---> Authenticates via SSH or WinRM.
                                  Executes commands inside the remote instance.
                                  Useful for software bootstrapping.
```

### The `local-exec` Provisioner

The `local-exec` provisioner invokes a local executable after a resource is created. It runs on the machine that is currently executing the `tofu apply` command. 

Because it runs locally, it does not require authentication to the newly created resource, nor does it require the resource to have an accessible public IP or SSH port open. However, it *does* rely heavily on the software installed on the execution machine. If your `local-exec` command calls `jq` or `python3`, those binaries must exist in the environment running OpenTofu.

#### Common Arguments

* **`command`** (Required): The actual command to execute. This is typically evaluated in a shell (`/bin/sh` on Linux/macOS, `cmd.exe` on Windows).
* **`working_dir`** (Optional): Specifies the directory where the command should be executed.
* **`environment`** (Optional): A map of key-value pairs representing environment variables to inject into the execution context.

#### Example Usage

In this example, we use a `null_resource` (a special resource that does nothing but act as a container for provisioners) to trigger a local script, passing in the IP address of an AWS instance as an environment variable:

```hcl
resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}

resource "null_resource" "notify_slack" {
  # Triggers the provisioner whenever the instance ID changes
  triggers = {
    instance_id = aws_instance.app_server.id
  }

  provisioner "local-exec" {
    command     = "./scripts/notify.sh"
    working_dir = "${path.module}"
    
    environment = {
      NEW_IP   = aws_instance.app_server.public_ip
      ENV_NAME = "Production"
    }
  }
}
```

### The `remote-exec` Provisioner

The `remote-exec` provisioner connects to the newly created infrastructure over the network and executes scripts directly on that remote machine. This is commonly used to install packages, clone repositories, or start services immediately after a virtual machine boots.

To function, `remote-exec` strictly requires a `connection` block to be defined, detailing how OpenTofu should authenticate with the server.

#### The `connection` Block

OpenTofu supports two primary connection types for remote execution:
1.  **`ssh`**: The standard for Linux machines.
2.  **`winrm`**: Windows Remote Management, used for Windows Server environments.

The connection block requires the host address, the user, and the authentication method (e.g., an SSH private key or a password).

#### Common Arguments

Instead of a single `command` argument, `remote-exec` offers three ways to provide your scripts:

* **`inline`**: A list of command strings to execute sequentially.
* **`script`**: A path to a local script that OpenTofu will copy to the remote machine and execute.
* **`scripts`**: A list of paths to local scripts to be copied and executed in order.

#### Example Usage

The following example provisions an Ubuntu server and uses `remote-exec` to update the package manager and install Nginx. Notice how the `connection` block is nested inside the `provisioner` (though it can also be placed at the `resource` level to apply to all provisioners within that resource).

```hcl
resource "aws_instance" "web" {
  ami           = "ami-08d4ac5b634553e16" # Ubuntu 20.04
  instance_type = "t2.micro"
  key_name      = aws_key_pair.deployer.key_name

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/id_rsa")
      host        = self.public_ip
      timeout     = "2m"
    }

    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx"
    ]
  }
}
```

### Critical Security Considerations

When using `remote-exec`, you must provide OpenTofu with access to your SSH keys or administrative passwords. 

1.  **Never hardcode credentials** directly into your `.tf` files. Always use variables, and ensure sensitive variables are marked as `sensitive = true` to prevent them from printing in the CLI output.
2.  **Beware of the state file.** If you pass an SSH private key into a `connection` block (even via a variable), that key will be recorded in plaintext inside the `terraform.tfstate` file. This underscores the importance of Chapter 10's lessons on encrypting state files and strictly controlling access to remote state backends.
3.  **Network reachability.** If your infrastructure is deployed into a private subnet without a public IP, `remote-exec` running from your local laptop or a public CI runner will timeout and fail. You must configure Bastion hosts (`bastion_host`, `bastion_user`, etc., within the `connection` block) or ensure your OpenTofu execution environment is peered with your private network.

## 17.3 Handling Provisioner Failures and Destruction-Time Execution

As established in previous sections, provisioners introduce imperative fragility into a declarative system. When a network timeout occurs, a script contains a typo, or an external API is temporarily unavailable, OpenTofu must decide how to handle the resulting failure. Furthermore, the lifecycle of external configurations doesn't end at creation; you often need to clean up those external systems when the infrastructure is decommissioned. 

OpenTofu provides specific meta-arguments within the `provisioner` block to manage both failure states and destruction lifecycles.

### Managing Provisioner Failures with `on_failure`

By default, if a provisioner script exits with a non-zero status code, OpenTofu considers the provisioning step a failure. Because the cloud resource itself was successfully created via the provider API but the subsequent configuration failed, OpenTofu marks the resource as **tainted** in the state file. 

However, not all provisioner scripts are mission-critical. You might have a provisioner that sends a Slack notification or logs an entry to a non-essential tracking database. You do not want your entire deployment pipeline to halt or your primary servers to be tainted just because a webhook timed out.

To control this behavior, you can use the `on_failure` argument inside the `provisioner` block. It accepts two possible values:

1.  **`fail`** (Default): The standard behavior. The `tofu apply` run stops, an error is raised, and the resource is tainted.
2.  **`continue`**: OpenTofu will log the failure to the console but will *ignore* it. The execution will proceed to the next resource, and the resource will **not** be tainted. It will be marked as fully created and healthy in the state file.

#### Example: Overriding Default Failure Handling

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  # Critical step: Must succeed, or the instance is useless
  provisioner "remote-exec" {
    inline = ["sudo apt-get install -y nginx"]
    # on_failure = fail (Implicit default)
  }

  # Non-critical step: If this fails, we still want to keep the instance
  provisioner "local-exec" {
    command    = "curl -X POST -d 'Instance ${self.id} booted' https://metrics.internal/api/log"
    on_failure = continue
  }
}
```

*Warning:* Use `on_failure = continue` sparingly. If you ignore a failure in a script that genuinely configures the server for its primary role, OpenTofu will report a successful deployment, but the application will be broken in reality.

### Executing Scripts at Destruction Time

So far, we have only discussed **creation-time provisioners**, which run immediately after a resource is built. However, if your creation provisioner registered a server with an external load balancer, monitoring tool, or Active Directory domain that lacks a dedicated OpenTofu provider, deleting the virtual machine via OpenTofu will leave behind "ghost" records in those external systems.

To handle this, OpenTofu supports **destruction-time provisioners**. By setting the `when` argument to `destroy`, the provisioner will run *before* the resource is destroyed by the provider.

#### The Destruction-Time Lifecycle

```text
[tofu destroy / Resource Removal]
         |
         v
 1. Execute `when = destroy` Provisioners
         |
         |---> (If Failure) ---> Halt execution. Resource is NOT destroyed.
         |
         v---> (If Success)
         |
 2. Call Cloud Provider API to Destroy Resource
         |
         v
 3. Remove Resource from OpenTofu State
```

#### Example: Deregistering from a Legacy System

```hcl
resource "aws_instance" "worker" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  # 1. Runs when the instance is first created
  provisioner "local-exec" {
    command = "./register_node.sh ${self.private_ip}"
  }

  # 2. Runs ONLY when the instance is being destroyed
  provisioner "local-exec" {
    when    = destroy
    command = "./deregister_node.sh ${self.private_ip}"
  }
}
```

### Caveats of Destruction-Time Provisioners

Working with destruction-time provisioners requires careful planning due to several strict limitations enforced by OpenTofu's core engine:

1.  **They Must Exist in the State Before Destruction:** You cannot simply add a `when = destroy` provisioner to a resource block and immediately run `tofu destroy`. OpenTofu only runs destruction provisioners that are already recorded in the active state file. You must run `tofu apply` to update the state with the new provisioner definition *before* you attempt to destroy the resource.
2.  **Failure Blocks Destruction:** If a destruction-time provisioner fails (exits with a non-zero code), OpenTofu will **abort the destruction of the underlying resource**. This is a safety mechanism to prevent stranding external configuration. You must either fix the script, manually intervene in the external system, or temporarily set `on_failure = continue` to bypass the block.
3.  **Self Referencing Only:** Destruction-time provisioners can only safely reference the `self` object (attributes of the resource they are attached to). Because they run during the destroy phase of a dependency graph, referencing other resources (e.g., `aws_vpc.main.id`) is highly dangerous. The other resource might have already been destroyed by the time the provisioner executes, leading to unresolvable variable errors.

## 17.4 Why Provisioners Should Always Be a Last Resort

Throughout this chapter, we have explored how provisioners function and how to handle their unique failure states. However, the official stance of the OpenTofu core team—and the consensus among Site Reliability Engineers—is that **provisioners should only be used when no other option exists.** By their very nature, provisioners force an imperative workflow into a declarative tool. They circumvent the execution plan, bypass state tracking for the changes they make, and introduce fragile environmental dependencies. Whenever you are tempted to write a `provisioner` block, you should first evaluate the following declarative alternatives.

### Alternative 1: Cloud-Init and User Data

If your goal is to bootstrap a virtual machine (installing packages, writing configuration files, starting services), you should rely on the cloud provider's native bootstrapping mechanisms rather than `remote-exec`. 

Almost all major cloud providers (AWS, Google Cloud, Azure) support **Cloud-Init** or a generic `user_data` attribute. This allows you to pass a script or a declarative YAML file directly to the instance during creation. The cloud provider's hypervisor injects the script, and the instance executes it locally on boot.

**Why it is better:**
* **No Network Dependency:** OpenTofu does not need to connect via SSH/WinRM. It simply passes the string to the cloud API.
* **No Tainting on Script Failure:** OpenTofu considers the resource created as soon as the cloud API accepts the request. If the script fails, the instance is not automatically destroyed (though you will need to rely on instance-level logging, like `/var/log/cloud-init-output.log`, to debug).

```hcl
# The Declarative Approach using user_data
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  # The script is passed to the cloud API, not executed by OpenTofu
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y nginx
              systemctl start nginx
              EOF
}
```

### Alternative 2: Immutable Infrastructure (Golden Images)

An even more robust alternative to both provisioners and `user_data` is adopting an **immutable infrastructure** pattern. Instead of booting a vanilla Linux image and configuring it at runtime, you use a tool like HashiCorp Packer to build a "golden image" ahead of time.

In this workflow, the installation of Nginx, the copying of application code, and the hardening of the OS are done during the image build pipeline. OpenTofu is then responsible *only* for deploying that pre-baked image.

**Why it is better:**
* **Speed:** Booting a pre-configured image takes seconds. Running a `remote-exec` script can take minutes.
* **Reliability:** If a package repository goes offline, a provisioner script will fail during deployment, potentially bringing down your production rollout. With golden images, the failure happens during the image build phase, protecting your live environment.

### Alternative 3: Decoupling Configuration Management

If you rely on configuration management tools like Ansible, Chef, or Puppet, do not trigger them from inside OpenTofu using a `local-exec` provisioner. This creates a tight, synchronous coupling between infrastructure provisioning and software configuration.

Instead, separate these concerns in your CI/CD pipeline (which we will explore in depth in Chapter 19). 

```text
[ Bad Architecture ]
OpenTofu Apply -> local-exec -> Ansible Playbook -> Completion

[ Good Architecture ]
Step 1: OpenTofu Apply (Builds VMs, Outputs IPs to a JSON file)
Step 2: Dynamic Inventory Script reads OpenTofu Outputs
Step 3: Ansible Playbook executes against the newly provisioned IPs
```

By decoupling them, a failure in the Ansible playbook does not taint the OpenTofu state, and you can freely re-run the configuration management step without invoking OpenTofu at all.

### Alternative 4: Dedicated Providers (or Writing Your Own)

Often, `local-exec` is used to trigger a `curl` command against an internal API or a SaaS product that lacks an official OpenTofu provider. Before resorting to `curl`, check the OpenTofu Registry for community-supported providers. 

If you are simply making HTTP requests, you can use the official `http` provider to read data, or the `restapi` community provider to manage resources declaratively.

If the API is internal and heavily used, the ultimate "declarative" solution is to write a custom OpenTofu provider. While this requires an upfront investment in Go development (covered in Chapter 22), it replaces fragile, non-idempotent bash scripts with a robust, state-aware integration that your entire engineering organization can consume safely.