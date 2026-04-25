Hardcoding values in infrastructure code limits reusability and creates severe security risks. To build flexible environments, your code must be completely decoupled from stack-specific parameters and sensitive credentials. 

This chapter explores Pulumi’s robust configuration system. You will learn how to inject dynamic settings, handle complex structured data, and securely manage secrets like database passwords. Whether utilizing the default Pulumi Service encryption or integrating third-party Key Management Systems (AWS KMS, Azure Key Vault, HashiCorp Vault), you will discover how to keep your deployments portable, scalable, and strictly compliant.

## 6.1 Using the Pulumi Config System

Writing infrastructure as code offers the distinct advantage of reusability. However, to truly reuse a Pulumi program across multiple environments—such as development, staging, and production—you must extract hardcoded values and replace them with configurable parameters. The Pulumi Configuration system provides a robust, strongly-typed mechanism to manage these parameters on a per-stack basis.

Instead of writing a separate program for each environment, you write a single logical definition and use configuration to drive variations like instance sizes, feature flags, or scaling capacities. 

### The Mechanics of Pulumi Config

Configuration values are stored as key-value pairs in a stack-specific YAML file, typically named `Pulumi.<stack-name>.yaml`. When the Pulumi engine executes your code, it injects these stack-specific configurations into your program, dictating how the infrastructure should be provisioned for that specific deployment.

```text
+---------------------+       +------------------------+       +---------------------+
|   Pulumi.dev.yaml   |       |                        |       |   Dev Environment   |
|---------------------| ----> |                        | ----> |---------------------|
| instanceSize: small |       |                        |       | -> t3.micro         |
| multiAz: false      |       |     Pulumi Engine      |       | -> 1 instance       |
+---------------------+       |  (Executes your code)  |       +---------------------+
                              |                        |
+---------------------+       |                        |       +---------------------+
|  Pulumi.prod.yaml   |       |                        |       |  Prod Environment   |
|---------------------| ----> |                        | ----> |---------------------|
| instanceSize: large |       |                        |       | -> m5.large         |
| multiAz: true       |       +------------------------+       | -> 3 instances      |
+---------------------+
```

### Setting Configuration Values

While you can technically edit the `Pulumi.<stack-name>.yaml` file by hand, it is highly recommended to use the Pulumi CLI to read and write configuration values. The CLI ensures proper formatting and helps prevent syntax errors.

To set a simple configuration value, use the `pulumi config set` command:

```bash
# Sets the "instanceSize" configuration key to "t3.micro" for the active stack
pulumi config set instanceSize t3.micro

# Sets a boolean flag
pulumi config set enableMonitoring true
```

After running these commands, your active stack's YAML file will be updated to reflect the new state:

```yaml
# Pulumi.dev.yaml
config:
  my-project:instanceSize: t3.micro
  my-project:enableMonitoring: "true"
```

### Retrieving Configuration in Code

Within your Pulumi program, you access these values using the `Config` object provided by the Pulumi SDK. The Config object exposes a suite of methods that fall into two main categories: **optional getters** and **required getters**.

* **Optional Getters (`get`, `getNumber`, `getBoolean`):** Attempt to read the configuration value. If the value is not found in the stack's YAML file, these methods return `null` or `undefined` (or the equivalent in your chosen language), allowing your code to implement default fallback values.
* **Required Getters (`require`, `requireNumber`, `requireBoolean`):** Demand that a value exists. If the user executing the deployment has forgotten to set the configuration key, the Pulumi program will immediately throw a descriptive error and halt the deployment before any infrastructure is mutated. This is a critical safety mechanism.

Here is how you retrieve configurations in both TypeScript and Python:

**TypeScript:**
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Instantiate the Config object for the current project
const config = new pulumi.Config();

// Read an optional configuration value with a default fallback
const instanceSize = config.get("instanceSize") || "t2.micro";

// Read a mandatory configuration value
// Pulumi will abort the deployment if "appName" is missing
const appName = config.require("appName");

// Type-safe retrieval of a boolean flag
const enableMonitoring = config.getBoolean("enableMonitoring") ?? false;

const server = new aws.ec2.Instance(`${appName}-server`, {
    instanceType: instanceSize,
    ami: "ami-0c55b159cbfafe1f0", // Example AMI
    monitoring: enableMonitoring,
});
```

**Python:**
```python
import pulumi
import pulumi_aws as aws

# Instantiate the Config object for the current project
config = pulumi.Config()

# Read an optional configuration value with a default fallback
instance_size = config.get("instanceSize") or "t2.micro"

# Read a mandatory configuration value
app_name = config.require("appName")

# Type-safe retrieval of a boolean flag
enable_monitoring = config.get_bool("enableMonitoring") or False

server = aws.ec2.Instance(f"{app_name}-server",
    instance_type=instance_size,
    ami="ami-0c55b159cbfafe1f0", # Example AMI
    monitoring=enable_monitoring,
)
```

### Configuration Namespaces

By default, when you instantiate a `Config` object without arguments, Pulumi scopes the configuration lookups to the current project's name. This prevents key collisions if you are utilizing multiple packages or components. 

However, configurations can be namespaced to target specific providers or logical groupings. The most common use case is configuring a cloud provider directly. For example, setting the AWS region:

```bash
pulumi config set aws:region us-west-2
```

In this command, `aws` is the namespace and `region` is the key. The Pulumi AWS provider automatically reads configurations from the `aws` namespace, meaning you rarely have to pass the region explicitly into your provider initialization code.

You can also create your own custom namespaces to organize complex projects. For example, if you are building an application with a database and a frontend, you might logically group their configurations:

```bash
pulumi config set database:capacity 100
pulumi config set frontend:cacheTtl 3600
```

To retrieve these namespaced values in your code, you pass the namespace as an argument when instantiating the `Config` object:

```typescript
// Look specifically in the "database" namespace
const dbConfig = new pulumi.Config("database");
const capacity = dbConfig.requireNumber("capacity");

// Look specifically in the "frontend" namespace
const frontendConfig = new pulumi.Config("frontend");
const cacheTtl = frontendConfig.requireNumber("cacheTtl");
```

By heavily utilizing the `Config` system, you ensure that your code remains a pure blueprint, cleanly separated from the environment-specific data required to bring that blueprint to life. Building on these foundational types, the configuration system can be expanded to handle complex structures and sensitive data, which we will explore in the following sections.

## 6.2 Structured Configuration Data

While basic strings, numbers, and booleans are sufficient for simple deployments, real-world infrastructure often demands complex data structures. You might need to pass a list of CIDR blocks, a dictionary of mandatory enterprise tags, or a deeply nested set of routing rules. Instead of flattening these into dozens of individual configuration keys, Pulumi allows you to define and consume **structured configuration data** using JSON-like objects and arrays.

Using structured data keeps your `Pulumi.<stack-name>.yaml` file organized and prevents configuration sprawl as your infrastructure grows in complexity.

### Flat vs. Structured Configuration

To understand the value of structured data, consider the difference in how configurations are stored in the stack file:

```text
Flat Configuration (Hard to scale)      Structured Configuration (Clean & Grouped)
----------------------------------      ------------------------------------------
config:                                 config:
  app:port: "80"                          app:settings:
  app:protocol: "http"                      port: 80
  app:flag1: "newUI"                        protocol: "http"
  app:flag2: "betaAccess"                   featureFlags:
                                              - "newUI"
                                              - "betaAccess"
```

### Setting Structured Configuration via CLI

There are two primary ways to populate structured data in your Pulumi stack using the CLI: passing JSON directly or using path-based assignments.

**1. Passing JSON Objects**
You can pass a raw JSON string to the `pulumi config set` command. Pulumi will automatically parse this JSON and store it as structured YAML in the stack file.

```bash
# Sets a complex JSON object to the "settings" key in the "app" namespace
pulumi config set app:settings '{"port": 80, "protocol": "http", "featureFlags": ["newUI", "betaAccess"]}'
```

**2. Using the `--path` Flag**
For targeted updates to nested structures without rewriting the entire JSON object, use the `--path` flag. This is incredibly useful in CI/CD pipelines where you might only need to update a single value within a larger configuration block.

```bash
# Updates only the 'port' value within the 'settings' object
pulumi config set --path app:settings.port 443

# Appends a new item to the 'featureFlags' array
pulumi config set --path app:settings.featureFlags[2] "metricsEnabled"
```

### Retrieving Structured Data in Code

When you retrieve structured data in your Pulumi program, the SDK deserializes it directly into native objects, dictionaries, or lists for your chosen programming language.

Similar to scalar values, Pulumi provides both optional (`getObject`) and required (`requireObject`) methods for structured data.

**TypeScript**

TypeScript shines with structured configuration because you can define interfaces to enforce strict type-checking on the imported configuration object.

```typescript
import * as pulumi from "@pulumi/pulumi";

// 1. Define the expected shape of your configuration
interface AppSettings {
    port: number;
    protocol: string;
    featureFlags: string[];
}

const config = new pulumi.Config("app");

// 2. Retrieve the structured data, casting it to the interface
// Pulumi will throw an error if the 'settings' key is missing
const settings = config.requireObject<AppSettings>("settings");

// 3. Access properties natively
const isSecure = settings.protocol === "https";

pulumi.log.info(`Deploying on port ${settings.port}. Secure: ${isSecure}`);
// Output: Deploying on port 80. Secure: false
```

**Python**

In Python, `require_object` returns a native Python dictionary or list, depending on the structure stored in the YAML file.

```python
import pulumi

config = pulumi.Config("app")

# 1. Retrieve the structured data (returns a dict)
settings = config.require_object("settings")

# 2. Access values using standard dictionary syntax
port = settings.get("port")
protocol = settings.get("protocol")
feature_flags = settings.get("featureFlags", [])

is_secure = protocol == "https"

pulumi.log.info(f"Deploying on port {port}. Secure: {is_secure}")
# Output: Deploying on port 80. Secure: False
```

### Best Practices for Structured Configurations

* **Fail Fast with Validation:** While TypeScript interfaces provide compile-time safety, they do not validate the data at runtime (e.g., if the YAML contains a string where a number was expected). Consider using validation libraries (like Zod in TypeScript or Pydantic in Python) to parse and validate complex `requireObject` outputs before passing them into your infrastructure resources.
* **Keep YAML Readable:** If your structured configuration grows beyond a few dozen lines, it becomes difficult to manage inside `Pulumi.<stack>.yaml`. At that scale, consider extracting the configuration into a dedicated external JSON or YAML file within your project directory and using standard language file I/O (like Node's `fs` or Python's `open()`) to read it at runtime. 
* **Avoid Deep Nesting:** Keep your configuration structures relatively shallow (1-3 levels deep). Overly nested configuration paths are difficult to update via the CLI and increase the cognitive load required to understand the infrastructure environment variations.

## 6.3 Encrypting Secrets with Pulumi Service

Modern infrastructure provisioning relies heavily on sensitive data: database passwords, API tokens, TLS certificates, and OAuth client secrets. Storing these values in plain text within your configuration files or version control system is a critical security vulnerability. 

Pulumi treats secrets as a first-class citizen. Rather than relying entirely on external scripts or forcing you to build custom encryption pipelines, Pulumi integrates secrets management directly into its configuration system and state file engine. When using the default Pulumi Service backend, this encryption is handled automatically using per-stack encryption keys.

### The Secrets Encryption Flow

When you designate a configuration value as a secret, the Pulumi CLI requests a unique, per-stack encryption key from the Pulumi Service. The CLI then encrypts your secret *locally* before saving it. The plain text value never leaves your machine during the configuration phase, and only the ciphertext is written to your `Pulumi.<stack-name>.yaml` file.

```text
+----------------------+      Requests Key      +------------------------+
|                      | ---------------------> |                        |
|  Local Pulumi CLI    |                        |     Pulumi Service     |
|                      | <--------------------- |                        |
+----------------------+    Returns Stack Key   +------------------------+
          |
          | (Encrypts secret locally)
          v
+----------------------+
| Pulumi.<stack>.yaml  |
|----------------------|
| dbPassword:          |
|   secure: v1:xYz...  |  <-- Only Ciphertext is stored and committed to Git
+----------------------+
```

During a `pulumi up`, the engine decrypts these secrets in memory just long enough to pass them to the cloud provider. When Pulumi records the resulting infrastructure state in the state file, the sensitive values remain encrypted.

### Setting Secrets via the CLI

To mark a configuration value as sensitive, append the `--secret` flag to the `pulumi config set` command.

```bash
# Sets a simple string secret
pulumi config set --secret dbPassword "super_safe_password_123"

# Sets a structured configuration object as a secret
pulumi config set --secret --path api.tokens.stripe "sk_live_12345"
```

If you inspect your stack's YAML file after running these commands, you will notice that the values are wrapped in a `secure` object and prefixed with a version marker (e.g., `v1:`).

```yaml
# Pulumi.prod.yaml
config:
  my-project:dbPassword:
    secure: v1:aB3...[base64-encoded-ciphertext]...
  my-project:api:
    secure: v1:cD4...[base64-encoded-ciphertext]...
```

### Retrieving and Handling Secrets in Code

Because Pulumi must prevent you from accidentally logging or exposing sensitive data, secrets are not retrieved as plain strings or numbers. Instead, they are retrieved as **Outputs** (specifically, `Output<string>` in TypeScript or `Output[str]` in Python). 

An `Output` in Pulumi acts as a wrapper that tracks the "secretness" of a value. 

* **`getSecret` / `get_secret`**: Retrieves an optional configuration value as a secret Output.
* **`requireSecret` / `require_secret`**: Retrieves a mandatory configuration value as a secret Output, throwing an error if it is missing.

Here is how you securely retrieve and use a secret to provision a database:

**TypeScript:**
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();

// Retrieve the secret. The variable type is Output<string>
const dbPassword = config.requireSecret("dbPassword");

// Provision an RDS instance
const db = new aws.rds.Instance("primary-db", {
    engine: "postgres",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    username: "admin",
    password: dbPassword, // Pulumi accepts Output<string> natively
    skipFinalSnapshot: true,
});
```

**Python:**
```python
import pulumi
import pulumi_aws as aws

config = pulumi.Config()

# Retrieve the secret. The variable type is Output[str]
db_password = config.require_secret("db_password")

# Provision an RDS instance
db = aws.rds.Instance("primary-db",
    engine="postgres",
    instance_class="db.t3.micro",
    allocated_storage=20,
    username="admin",
    password=db_password, # Pulumi accepts Output natively
    skip_final_snapshot=True,
)
```

### The "Taint" Propagation of Secrets

One of the most powerful features of Pulumi's secret management is how it tracks sensitive data through your infrastructure graph. 

If you pass a secret `Output` into a resource property (like the `password` field of an RDS instance), Pulumi automatically marks the entire resource property—and any downstream properties derived from it—as a secret. This "taint" propagation ensures that if you export the database connection string, the connection string is also encrypted because it implicitly contains the secret password.

Furthermore, the Pulumi CLI actively monitors the console output during `pulumi up` and `pulumi preview`. If a value marked as a secret is about to be printed to the terminal, the CLI will intercept it and replace it with `[secret]`, preventing sensitive data from leaking into your CI/CD build logs.

```text
Updating (prod)

     Type                 Name            Status      Info
 +   pulumi:pulumi:Stack  my-project-prod created
 +   └─ aws:rds:Instance  primary-db      created     password: [secret]
```

By default, the Pulumi Service handles the key generation and management for this encryption seamlessly. However, enterprise organizations often have compliance requirements dictating that they must manage their own encryption keys, which leads us to integrating third-party Key Management Systems.

## 6.4 Integrating Third-Party KMS (AWS KMS, Azure Key Vault, HashiCorp Vault)

While the default Pulumi Service provides seamless, managed secrets encryption, many enterprise environments operate under strict compliance frameworks. These frameworks often dictate that the organization must retain absolute, cryptographic control over the keys used to encrypt sensitive data—a principle known as Bring Your Own Key (BYOK). 

To support these requirements, Pulumi allows you to delegate secrets encryption to a third-party Key Management System (KMS).

### The Envelope Encryption Model

When you configure a third-party KMS, Pulumi employs **envelope encryption**. The external KMS does not directly encrypt your database passwords or API tokens. Instead, the KMS generates a master Data Encryption Key (DEK). 

1. The KMS provides the Pulumi CLI with two versions of the DEK: a plaintext version and an encrypted version.
2. The Pulumi CLI uses the *plaintext* DEK to encrypt your secrets locally on your machine.
3. The *encrypted* DEK is embedded directly into your `Pulumi.<stack-name>.yaml` file. The plaintext DEK is immediately discarded from memory.

During a deployment, Pulumi reads the encrypted DEK from the stack file, sends it to the external KMS to be decrypted, and then uses the resulting plaintext DEK to decrypt the secrets in the stack.

```text
+-------------------+       (1) Request Data Key       +-------------------+
|                   | -------------------------------> |                   |
|    Pulumi CLI     |                                  | Third-Party KMS   |
|  (Local Machine)  | <------------------------------- | (AWS, Azure, etc.)|
|                   |       (2) Encrypted Data Key     +-------------------+
+-------------------+           + Plaintext Data Key
         |
         | (3) Encrypt secrets locally using Plaintext Data Key
         v
+-------------------+
| Pulumi.<stack>.yaml|
|-------------------|
| encryptionsalt:   | <-- Encrypted Data Key stored here
| dbPassword:       |
|   secure: v1:...  | <-- Secret encrypted with Plaintext Data Key
+-------------------+
```

Because of this architecture, your plaintext secrets never leave your local machine or CI/CD runner, ensuring strict data sovereignty.

### Initializing Stacks with a KMS

You configure a KMS provider when you initialize a new stack using the `--secrets-provider` flag followed by a provider-specific URI. 

#### AWS Key Management Service (KMS)

To use AWS KMS, you must have standard AWS credentials configured in your environment (e.g., via `AWS_PROFILE` or environment variables) that grant `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` permissions for the target key.

```bash
# Initialize a stack using an AWS KMS Key ARN
pulumi stack init prod --secrets-provider="awskms://arn:aws:kms:us-east-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"

# Alternatively, use a KMS Key Alias
pulumi stack init prod --secrets-provider="awskms://alias/my-pulumi-secrets-key"
```

#### Azure Key Vault

For Azure Key Vault, the Pulumi CLI authenticates using the Azure CLI (`az login`), Managed Identities, or Service Principals. Ensure the identity has "Key Vault Crypto Service Encryption User" permissions or the equivalent access policies to wrap and unwrap keys.

```bash
# Initialize a stack using an Azure Key Vault URI
pulumi stack init prod --secrets-provider="azurekeyvault://mycompanyvault.vault.azure.net/keys/pulumi-stack-key"
```

#### HashiCorp Vault

To use HashiCorp Vault, the Pulumi CLI requires the `VAULT_ADDR` and `VAULT_TOKEN` environment variables to be set. You must configure a Transit Secrets Engine in Vault, as Pulumi relies on Vault's transit backend to encrypt and decrypt the data key.

```bash
# Initialize a stack using a HashiCorp Vault Transit Key
pulumi stack init prod --secrets-provider="hashivault://my-transit-key"
```

### Migrating an Existing Stack

If you started a project using the default Pulumi Service encryption but later need to comply with a new enterprise policy requiring AWS KMS, you do not need to recreate your stack. You can rotate the secrets provider on the fly.

Use the `change-secrets-provider` command:

```bash
pulumi stack change-secrets-provider "awskms://alias/my-enterprise-key"
```

When you execute this command, the Pulumi CLI performs the following sequence automatically:
1. Decrypts all existing secrets in the `Pulumi.<stack-name>.yaml` file using the *old* provider (the Pulumi Service).
2. Requests a new Data Encryption Key from the *new* provider (AWS KMS).
3. Re-encrypts all secrets locally using the new key.
4. Updates the stack file with the new ciphertexts and the new encrypted data key.

This operation modifies your `Pulumi.<stack-name>.yaml` file, so ensure you commit the changes to your version control system immediately after the migration succeeds. 

By leveraging third-party KMS integrations, you bridge the gap between developer velocity and stringent enterprise security, ensuring that infrastructure code remains both flexible and compliant.