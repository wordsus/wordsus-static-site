With the foundational concepts established, it is time to translate theory into practice. This chapter guides you through the complete lifecycle of a Pulumi deployment, taking you from an empty directory to fully provisioned cloud resources. 

You will learn how to bootstrap a new workspace using the CLI, author infrastructure using standard programming languages, and safely deploy utilizing the engine's preview mechanism. Finally, we will cover how to cleanly decommission environments. By the end of this chapter, you will have the practical skills needed to confidently build, modify, and destroy your cloud architecture.

## 4.1 Bootstrapping a Project via CLI

With the Pulumi CLI installed and your environment authenticated, the first step in authoring infrastructure is initializing a new project. Pulumi streamlines this process through the `pulumi new` command. This command acts as a scaffolding tool, generating the foundational directory structure, configuration files, and dependency manifests required to start writing code immediately.

Rather than starting from a blank directory and manually wiring together package managers and YAML files, `pulumi new` leverages a vast repository of official and community-driven templates. These templates are pre-configured combinations of cloud providers and programming languages.

### The Interactive Bootstrapping Process

To initialize a project, create an empty directory, navigate into it, and execute the command:

```bash
mkdir my-first-infrastructure && cd my-first-infrastructure
pulumi new
```

Executing `pulumi new` without any arguments launches an interactive wizard. The CLI will guide you through a series of prompts to configure your new workspace:

1. **Template Selection:** You will be presented with a searchable list of templates. You can use the arrow keys to navigate or type to filter. For example, selecting `aws-typescript` will scaffold an Amazon Web Services project using Node.js and TypeScript.
2. **Project Name:** By default, this defaults to the name of your current directory. As covered in Chapter 3, this name must be unique within your Pulumi organization or backend.
3. **Project Description:** A brief, human-readable summary of what this infrastructure project manages.
4. **Stack Name:** The CLI will prompt you to initialize your first stack. The default is typically `dev`. 
5. **Configuration Values:** Depending on the chosen template, the wizard may ask for required configuration variables. For an AWS template, it will explicitly request the `aws:region` (e.g., `us-east-1`, `eu-central-1`) to determine where the resources should be deployed.

Once the prompts are completed, the CLI downloads the template, generates the files, and automatically runs the language-specific package manager (such as `npm install`, `pip install`, or `go mod tidy`) to install the necessary Pulumi SDKs and provider plugins.

### Bypassing the Wizard for Automation

If you know exactly which template you want to use, or if you are bootstrapping a project within an automated script, you can pass arguments directly to the CLI to bypass the interactive prompts:

```bash
pulumi new aws-typescript \
  --name "my-first-infrastructure" \
  --description "A sample AWS network" \
  --stack "dev" \
  --config aws:region=us-east-1 \
  --yes
```

The `--yes` (or `-y`) flag automatically accepts default values for any prompts not explicitly satisfied by your flags, ensuring a completely headless setup.

### Anatomy of a Bootstrapped Project

After the command finishes executing, your directory will be populated with the core files needed to run Pulumi. While the specific code files will vary based on your chosen programming language, the structural anatomy remains consistent. 

Here is the plain text layout of a newly bootstrapped `aws-typescript` project:

```text
my-first-infrastructure/
├── Pulumi.yaml           # The Project configuration file
├── Pulumi.dev.yaml       # The Stack configuration file (for the 'dev' stack)
├── index.ts              # The main entrypoint for your infrastructure code
├── package.json          # Node.js dependencies and metadata
├── tsconfig.json         # TypeScript compiler configuration
└── node_modules/         # Installed SDKs and dependencies
```

#### The Project File: `Pulumi.yaml`

The `Pulumi.yaml` file defines the project itself. It tells the Pulumi engine how to execute your code. For a TypeScript project, it typically looks like this:

```yaml
name: my-first-infrastructure
runtime: nodejs
description: A sample AWS network
```

The `runtime` key is critical; it informs the Pulumi engine which Language Host it needs to spin up to evaluate your program.

#### The Stack File: `Pulumi.dev.yaml`

Configuration values specific to the stack you just created are stored in the `Pulumi.<stack-name>.yaml` file. Because you specified the AWS region during the setup, this file will contain that configuration:

```yaml
config:
  aws:region: us-east-1
```

As you add more secrets and environment-specific variables later, they will be appended to this file. 

#### The Entrypoint: `index.ts` (or `__main__.py`, `main.go`, `Program.cs`)

This is where your actual infrastructure definitions live. The template provides a minimal, functional example—usually a single storage bucket—to prove that the toolchain is working. It imports the necessary provider packages and sets up the scaffolding for you to begin declaring your resources, which is the immediate next step in your infrastructure journey.

## 4.2 Writing Infrastructure Code

With the project scaffolded, it is time to define the desired state of your infrastructure. Unlike domain-specific languages (DSLs) such as HCL or YAML-based templates, writing Pulumi code means writing standard software. You open the entrypoint file generated during the bootstrapping phase (e.g., `index.ts` for TypeScript, `__main__.py` for Python, or `main.go` for Go) and begin instantiating classes or calling functions.

### The IDE Advantage

The most immediate benefit you will notice when writing Pulumi code is the integration with your Integrated Development Environment (IDE). Because you are using general-purpose languages, you inherit their entire tooling ecosystem.

* **IntelliSense and Autocomplete:** As you type `new aws.s3.Bucket(`, your IDE will instantly prompt you with the required and optional arguments based on the SDK's type definitions.
* **Type Safety:** If a cloud provider expects an integer for a timeout value and you mistakenly pass a string, your compiler (or linter) will catch the error immediately as a red underline, long before you attempt a deployment.
* **Inline Documentation:** Hovering over a resource class or property reveals the official cloud provider documentation directly in your editor, significantly reducing the need to constantly switch context to a web browser.

### Structuring the Code

To illustrate the workflow, let's build upon the AWS TypeScript project bootstrapped in the previous section. We will define a simple, yet practical architecture: an Amazon S3 bucket with versioning enabled, and a text file uploaded directly into that bucket via code.

Here is the complete `index.ts` file:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// 1. Resource Declaration: Create an AWS S3 Bucket
const storageBucket = new aws.s3.Bucket("my-storage-bucket", {
    versioning: {
        enabled: true,
    },
    tags: {
        Environment: "Dev",
    }
});

// 2. Resource Declaration: Create an S3 Bucket Object (a text file)
const sampleObject = new aws.s3.BucketObject("sample-data.txt", {
    bucket: storageBucket.id, // Implicit dependency created here
    source: new pulumi.asset.StringAsset("This infrastructure is managed by Pulumi."),
    contentType: "text/plain",
});

// 3. Stack Exports: Expose the generated properties
export const bucketName = storageBucket.id;
export const bucketArn = storageBucket.arn;
```

### Breaking Down the Anatomy

Let's examine the three core phases occurring within this script, relying on the theoretical foundations established in Chapter 3:

**1. Imports:**
We import the core `@pulumi/pulumi` library and the specific cloud provider package, `@pulumi/aws`. These packages were downloaded by your package manager (npm) during `pulumi new`.

**2. Resource Declaration:**
We define our infrastructure by creating instances of Resource classes. 
* The first argument (e.g., `"my-storage-bucket"`) is the **logical name**. Pulumi uses this internally in its state file to track the resource across updates. It is *not* the physical name assigned in AWS. By default, Pulumi appends a random suffix to the logical name to generate the physical name (e.g., `my-storage-bucket-a3f9b2c`), preventing naming collisions if you deploy multiple copies of this stack.
* The second argument is the **arguments object**, which contains the configuration properties defining the resource (like tags and versioning).

**3. Implicit Dependencies:**
Notice how `sampleObject` references `storageBucket.id`. You do not need to write explicit "depends_on" statements. Because the `BucketObject` requires the ID of the `Bucket` as an input, the Pulumi engine automatically infers that the bucket must be fully created *before* the object can be uploaded. 

This creates a directed acyclic graph (DAG) of your infrastructure:

```text
Dependency Graph (DAG) automatically inferred by Pulumi:

  [ aws.s3.Bucket: "my-storage-bucket" ]
                  │
                  │ (provides bucket.id asynchronously)
                  ▼
  [ aws.s3.BucketObject: "sample-data.txt" ]
```

**4. Stack Exports:**
Using standard language export syntax (`export const`), we declare Stack Outputs (as covered in Section 3.3). When the Pulumi engine finishes deploying, it will print the dynamically generated `bucketName` and `bucketArn` to your terminal. This is crucial for retrieving connection strings, IP addresses, or endpoints that are only known *after* the cloud provider provisions the infrastructure.

By keeping your infrastructure logic within familiar constructs—variables, classes, implicit references, and standard imports—writing infrastructure code becomes a seamless extension of standard application development.

## 4.3 Running `pulumi up`: The Preview Phase

Writing infrastructure code defines your *desired* state, but transitioning the cloud provider from its *current* state to that desired state requires a deployment mechanism. In the Pulumi ecosystem, this is handled almost exclusively by a single, powerful command: `pulumi up`.

However, `pulumi up` does not blindly execute API calls against your cloud provider. It operates in two distinct phases: **Preview** and **Update**. Understanding the preview phase is crucial for preventing catastrophic infrastructure outages and maintaining confidence in your deployments.

### The Engine's Evaluation Process

When you execute `pulumi up` in your terminal, the Pulumi CLI initiates a complex sequence of events before a single cloud resource is ever touched:

1. **Compilation and Execution:** The CLI invokes the appropriate Language Host (e.g., Node.js for TypeScript) to run your program.
2. **Graph Construction:** As your code executes, the Language Host does not provision resources; instead, it registers resource intents with the Pulumi Engine, constructing a Directed Acyclic Graph (DAG) of your desired infrastructure.
3. **State Comparison (The Diff):** The Pulumi Engine retrieves your stack's previous state file (which tracks what currently exists in the cloud) and compares it against the newly generated DAG.

```text
The Preview Diffing Engine:

[ Desired State ]  <--- (Generated by running index.ts)
       |
       v
[ Diffing Engine ] ---> (Calculates the delta: Creates, Updates, Deletes)
       ^
       |
[ Current State ]  <--- (Loaded from the Pulumi state file)
```

### Deciphering the Preview Output

Once the diffing process completes, the CLI pauses and presents a summary of the planned actions. This is your safety net. Using the S3 bucket example from Section 4.2, running `pulumi up` on a fresh stack will yield an output similar to this:

```text
Previewing update (dev)

View Live: https://app.pulumi.com/my-org/my-first-infrastructure/dev/previews/1a2b3c4d

     Type                    Name                         Plan       
 +   pulumi:pulumi:Stack     my-first-infrastructure-dev  create     
 +   ├─ aws:s3:Bucket        my-storage-bucket            create     
 +   └─ aws:s3:BucketObject  sample-data.txt              create     

Outputs:
    bucketArn : "output<string>"
    bucketName: "output<string>"

Resources:
    + 3 to create

Do you want to perform this update?
> yes
  no
  details
```

Let's break down the critical components of this interface:

* **The Plan Column and Symbols:** The CLI clearly marks what will happen to each resource. 
    * `+` (Green): The resource does not exist in the state file and will be **created**.
    * `-` (Red): The resource exists in the state but was removed from your code; it will be **deleted**.
    * `~` (Yellow): The resource exists in both, but its properties have changed; it will be **updated** (which may involve in-place modifications or a disruptive delete-and-replace operation).
    * *No symbol*: The resource is unchanged.
* **Hierarchical Display:** The CLI uses a tree structure (`├─` and `└─`) to illustrate the dependency graph. It shows that the `Bucket` and `BucketObject` are children of the overall `Stack`.
* **Unknown Outputs:** Notice that the `Outputs` section displays `"output<string>"` instead of actual values. Because the infrastructure has not been created yet, Pulumi cannot know the AWS-assigned ARN or the physical bucket name. These are represented as strongly-typed "promises" that will be resolved during the actual update phase.

### The Interactive Prompt: Verifying Intent

At the bottom of the preview, execution is halted, and you are presented with a prompt:

* **`yes`:** Proceed with the update phase, executing the changes against the cloud provider.
* **`no`:** Safely abort the operation. No changes will be made to your cloud environment or your state file.
* **`details`:** This is the most powerful option during a complex deployment. 

Selecting `details` shifts the CLI from a high-level summary to an exhaustive, property-by-property breakdown. It will show you precisely which tags are being added, which configuration values are shifting, and critically, whether an "update" requires a resource replacement. 

For instance, changing a tag on an S3 bucket is an in-place update. However, changing the *region* of an S3 bucket requires destroying the old bucket and creating a new one—a potentially disastrous action if that bucket contains production data. The `details` view will explicitly warn you if an update forces a replacement, allowing you to catch errors before they impact your systems.

Once you have reviewed the details and are confident in the plan, selecting `yes` instructs the Pulumi Engine to traverse the dependency graph and execute the necessary API calls in parallel wherever possible.

## 4.4 Destroying Resources with `pulumi destroy`

A foundational principle of Infrastructure as Code is that the lifecycle of your infrastructure should be fully managed by your tooling—from initial provisioning to final decommissioning. When an environment is no longer needed, whether it is an ephemeral testing stack, a completed feature branch, or a deprecated production service, leaving orphaned resources running in the cloud incurs unnecessary costs and expands your attack surface.

To cleanly tear down an environment, Pulumi provides the `pulumi destroy` command. This command is the inverse of `pulumi up`: it systematically dismantles every resource tracked within the current stack's state file.

### The Reverse Dependency Graph

Just as `pulumi up` relies on a Directed Acyclic Graph (DAG) to understand the order in which resources must be created, `pulumi destroy` uses the exact same graph to determine the safe order of deletion. It must walk the graph in reverse. 

If we revisit the S3 example from previous sections, the S3 Bucket Object implicitly depends on the S3 Bucket. AWS will reject an API request to delete a bucket if it still contains objects. Therefore, the Pulumi Engine understands that it must delete the children before the parents.

```text
The Destruction Sequence (Reverse DAG):

  [ aws.s3.BucketObject: "sample-data.txt" ]  <-- 1. Deleted First
                  │
                  │ (wait for successful deletion)
                  ▼
  [ aws.s3.Bucket: "my-storage-bucket" ]      <-- 2. Deleted Second
```

Because this logic is handled automatically by the Pulumi Engine based on your state file, you do not need to write custom teardown scripts or manually empty buckets before issuing a destroy command.

### Executing the Teardown

To destroy the infrastructure provisioned in the previous sections, ensure you are in your project directory and execute:

```bash
pulumi destroy
```

Like deployments, destruction is treated as a highly sensitive operation. Pulumi will not immediately begin deleting resources. Instead, it enters a **Preview Phase**. It calculates the destruction plan and presents a summary, pausing for your explicit confirmation.

```text
Previewing destroy (dev)

View Live: https://app.pulumi.com/my-org/my-first-infrastructure/dev/previews/9f8e7d6c

     Type                    Name                         Plan       
 -   pulumi:pulumi:Stack     my-first-infrastructure-dev  delete     
 -   ├─ aws:s3:BucketObject  sample-data.txt              delete     
 -   └─ aws:s3:Bucket        my-storage-bucket            delete     

Outputs:
  - bucketArn : "arn:aws:s3:::my-storage-bucket-a3f9b2c"
  - bucketName: "my-storage-bucket-a3f9b2c"

Resources:
    - 3 to delete

Do you want to perform this destroy?
> yes
  no
  details
```

Notice that the Plan column now displays `delete`, accompanied by the `-` symbol (which renders in red in supported terminals). If you select `yes`, Pulumi will issue the delete API calls to the cloud provider, executing them concurrently where the dependency graph allows.

### Targeted Destruction

While `pulumi destroy` targets the entire stack by default, there are scenarios where you might need to surgically remove a single resource without affecting the rest of the environment (e.g., forcing the recreation of a tainted resource). You can achieve this using the `--target` flag combined with the resource's unique Uniform Resource Name (URN), which can be found via the `pulumi stack` command.

```bash
pulumi destroy --target urn:pulumi:dev::my-first-infrastructure::aws:s3/bucketObject:BucketObject::sample-data.txt
```

*Note: Use targeted destruction with caution. Deleting a resource that other active resources depend on can leave your stack in an inconsistent state.*

### Cleaning Up the Stack Metadata

It is a common misconception that `pulumi destroy` deletes the stack itself. After a successful destroy operation, your cloud environment will be completely clean, but the logical `dev` stack still exists within the Pulumi backend. It is simply an empty stack with zero managed resources.

If your intention is to permanently remove the stack and all of its associated history, configuration, and state metadata, you must follow the destroy command with the stack removal command:

```bash
pulumi stack rm dev
```

The CLI will ask for confirmation before permanently deleting the stack's history. Once this is done, the lifecycle of your first Pulumi project is fully complete, from bootstrapping to total teardown.