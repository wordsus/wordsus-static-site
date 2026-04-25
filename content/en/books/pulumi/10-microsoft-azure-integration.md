Microsoft Azure offers an enterprise-grade suite of services, but taming its complexity requires a robust automation strategy. In this chapter, we bridge the gap between Azure Resource Manager (ARM) and Pulumi. We will bypass legacy bridged providers and dive straight into the **Azure Native** provider—an auto-generated SDK guaranteeing same-day support for new Azure features. From foundational Resource Groups and fine-grained Role-Based Access Control (RBAC) to deploying serverless App Services and globally distributed Cosmos DB architectures, you will learn to architect secure, scalable Azure environments purely through code.

## 10.1 Configuring the Azure Native Provider

When working with Microsoft Azure in Pulumi, you have access to the **Azure Native** provider. Unlike the Azure Classic provider, which is built on top of the Terraform bridge, the Azure Native provider is automatically generated directly from the Azure Resource Manager (ARM) OpenAPI specifications. This architectural difference guarantees same-day access to all new Azure services and features the moment they are released, without waiting for upstream provider updates.

The following text diagram illustrates the direct relationship between Pulumi and Azure:

```text
+----------------+       gRPC       +-------------------------+       REST/HTTPS       +------------------------+
| Pulumi Engine  | <--------------> |  Azure Native Provider  | <--------------------> | Azure Resource Manager |
| (Core/State)   |                  |  (Auto-generated SDK)   |                        | (ARM API)              |
+----------------+                  +-------------------------+                        +------------------------+
```

Because it interacts directly with ARM, configuring the Azure Native provider correctly is your first step to reliably provisioning infrastructure. This involves handling authentication, selecting target subscriptions, and configuring regional locations.

### Authentication Strategies

Before Pulumi can communicate with the ARM API, it needs to be authenticated. The Azure Native provider supports several authentication methods, seamlessly bridging local development and automated CI/CD workflows.

**1. Azure CLI (Local Development)**
For local development, the provider automatically hooks into the Azure CLI session. If you have the Azure CLI installed, you simply log in:

```bash
az login
```

If your account has access to multiple subscriptions, ensure you set the active subscription before running Pulumi commands, as Pulumi will default to the CLI's active subscription:

```bash
az account set --subscription "<SUBSCRIPTION_ID>"
```

**2. Service Principals (CI/CD and Automation)**
In headless environments like GitHub Actions or GitLab CI (which we will explore further in Chapter 18), relying on a local CLI session is impossible. Instead, you must use a Service Principal. 

You expose the Service Principal credentials to Pulumi using standard environment variables:

* `ARM_CLIENT_ID`: The application ID of the Service Principal.
* `ARM_CLIENT_SECRET`: The client secret (password) for the Service Principal.
* `ARM_TENANT_ID`: The ID of your Azure Active Directory tenant.
* `ARM_SUBSCRIPTION_ID`: The Azure subscription you want to deploy into.

*Note: For enhanced security in CI/CD pipelines, modern architectures prefer OpenID Connect (OIDC) over static client secrets. OIDC uses short-lived tokens and integrates smoothly with Pulumi's Azure provider when configured in your CI runner.*

**3. Managed Identities**
If you are running the Pulumi CLI from within an Azure virtual machine or an Azure DevOps runner hosted in Azure, you can leverage Managed Service Identity (MSI). By setting the `ARM_USE_MSI` environment variable to `true`, Pulumi will automatically request tokens from the Azure instance metadata service, entirely eliminating the need to manage secrets.

### Setting Provider Configuration

Beyond authentication, Azure requires context for your deployments—most notably, the Azure region (Location). You can configure this globally for your stack using the Pulumi configuration system introduced in Chapter 6.

To set the default location for all Azure Native resources in your current stack, run:

```bash
pulumi config set azure-native:location EastUS
```

This ensures that any resource you define will default to the `EastUS` region without you needing to explicitly pass the `location` property to every single resource definition in your code.

### Explicit Provider Instantiation

While relying on default environment variables and stack configuration is standard practice, there are times you need explicit control. For example, your architecture might require deploying resources into multiple Azure subscriptions or across multiple regions simultaneously within the same Pulumi program.

To achieve this, you must explicitly instantiate the Azure Native provider and pass it to your resources.

**TypeScript Example:**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// Instantiate a provider for a specific secondary subscription and region
const drProvider = new azure_native.Provider("disaster-recovery-provider", {
    location: "WestUS",
    subscriptionId: "12345678-1234-1234-1234-123456789012",
    // When explicit credentials are provided, they override the environment variables
    clientId: process.env.DR_ARM_CLIENT_ID,
    clientSecret: process.env.DR_ARM_CLIENT_SECRET,
    tenantId: process.env.DR_ARM_TENANT_ID,
});

// Use the explicit provider for a resource
const resourceGroup = new azure_native.resources.ResourceGroup("dr-rg", {}, {
    provider: drProvider,
});
```

**Python Example:**

```python
import os
import pulumi
import pulumi_azure_native as azure_native

# Instantiate a provider for a specific secondary subscription and region
dr_provider = azure_native.Provider("disaster-recovery-provider",
    location="WestUS",
    subscription_id="12345678-1234-1234-1234-123456789012",
    client_id=os.getenv("DR_ARM_CLIENT_ID"),
    client_secret=os.getenv("DR_ARM_CLIENT_SECRET"),
    tenant_id=os.getenv("DR_ARM_TENANT_ID")
)

# Use the explicit provider for a resource
resource_group = azure_native.resources.ResourceGroup("dr-rg",
    opts=pulumi.ResourceOptions(provider=dr_provider)
)
```

By mastering these authentication and configuration patterns, you establish a secure and flexible foundation. Whether you are hacking on a prototype locally or orchestrating massive multi-region deployments through an automated pipeline, the Azure Native provider adapts to the environment's context.

## 10.2 Resource Groups and Role-Based Access Control (RBAC)

In Microsoft Azure, every provisioned resource—whether it is a virtual machine, a database, or a serverless function—must reside within a **Resource Group**. Furthermore, securing access to these resources is handled via **Role-Based Access Control (RBAC)**. When managing infrastructure as code with Pulumi, provisioning the logical containers and securing them should happen simultaneously.

### The Foundation: Resource Groups

A Resource Group is a logical container that holds related resources for an Azure solution. In Pulumi, creating a Resource Group using the Azure Native provider is typically the first step in any Azure project, as it dictates the lifecycle and default region for the resources within it.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// Create an Azure Resource Group
const appResourceGroup = new azure_native.resources.ResourceGroup("my-app-rg", {
    // Location can be omitted if globally set via `pulumi config set azure-native:location`
    location: "eastus",
    tags: {
        environment: "production",
        department: "finance"
    }
});
```

**Understanding Pulumi Auto-Naming**
Notice that the logical Pulumi name is `"my-app-rg"`. By default, Pulumi appends a random hex string to the physical name in Azure (e.g., `my-app-rg-a1b2c3d`). This auto-naming prevents collisions, allows for zero-downtime replacements, and ensures you can deploy the same stack multiple times in the same subscription. If you must enforce a specific physical name to comply with strict enterprise naming conventions, you can override this by explicitly setting the `resourceGroupName` property.

### Codifying Role-Based Access Control (RBAC)

Azure RBAC is an authorization system built on Azure Resource Manager (ARM) that provides fine-grained access management. To codify RBAC in Pulumi, you must understand its three core pillars, which combine to form a **Role Assignment**.

The following diagram illustrates how these components interact:

```text
  [ Security Principal ]       [ Role Definition ]             [ Scope ]
  Who needs access?            What can they do?               Where can they do it?
  ----------------------       -------------------------       -------------------------
  • User                       • Reader                        • Management Group
  • Group                 +    • Contributor              +    • Subscription
  • Service Principal          • Owner                         • Resource Group (<- Our focus)
  • Managed Identity           • (Custom Role)                 • Specific Resource
          |                            |                               |
          v                            v                               v
          +------------------------------------------------------------+
          |                  ROLE ASSIGNMENT                           |
          |  Grants the Principal the specified Role at the Scope.     |
          +------------------------------------------------------------+
```

To create a Role Assignment via Pulumi, you need the IDs for the Principal, the Role Definition, and the Scope.

#### 1. Defining the Scope
In this context, the scope is the Resource Group we just created. We can retrieve its ID dynamically using the `appResourceGroup.id` output property. 

#### 2. Resolving the Role Definition ID
Azure provides hundreds of built-in roles. To assign a built-in role (like "Contributor" or "Reader"), you must retrieve its immutable UUID. Instead of hardcoding these UUIDs, it is a best practice to use Pulumi's authorization data sources to look them up dynamically during the deployment.

#### 3. Assigning the Role
Once you have the Principal ID (usually passed in via configuration or retrieved from Azure Active Directory), you map them together using the `azure_native.authorization.RoleAssignment` resource.

Here is a complete example of creating a Resource Group and granting a Service Principal "Contributor" access scoped exclusively to that group:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import * as azuread from "@pulumi/azuread"; // Required if interacting with Entra ID (Active Directory)

const config = new pulumi.Config();
// Assume the Principal ID is provided via `pulumi config set`
const targetPrincipalId = config.require("principalId"); 

// 1. Create the Resource Group (The Scope)
const appResourceGroup = new azure_native.resources.ResourceGroup("secure-app-rg");

// 2. Look up the Built-in Role Definition for "Contributor"
const contributorRole = pulumi.all([appResourceGroup.id]).apply(([rgId]) => 
    azure_native.authorization.getRoleDefinition({
        roleDefinitionId: "b24988ac-6180-42a0-ab88-20f7382dd24c", // Standard static UUID for "Contributor"
        scope: rgId,
    })
);

// 3. Create the Role Assignment
const roleAssignment = new azure_native.authorization.RoleAssignment("rg-contributor-assignment", {
    // The scope is the ID of the resource group
    scope: appResourceGroup.id,
    
    // The target identity receiving the permissions
    principalId: targetPrincipalId,
    
    // We format the ID of the role definition retrieved above
    roleDefinitionId: contributorRole.id,
    
    // Specifying the principal type (e.g., ServicePrincipal, User, Group) is recommended
    principalType: azure_native.authorization.PrincipalType.ServicePrincipal,
});

// Export the Resource Group name and the new Role Assignment ID
export const resourceGroupName = appResourceGroup.name;
export const assignmentId = roleAssignment.id;
```

### Best Practices for RBAC in IaC

* **Principle of Least Privilege:** Always scope Role Assignments as narrowly as possible. Avoid applying "Contributor" access at the Subscription level if the Principal only needs to manage resources within a specific Resource Group.
* **Avoid Implicit Dependencies:** Role Assignments can take a few moments to propagate through Azure's systems. If your Pulumi program provisions a resource that immediately assumes that newly assigned role to perform an action, you may encounter a race condition. In such cases, use Pulumi's `dependsOn` or `customTimeouts` options to introduce a brief pause or ensure strict ordering.
* **Group-Based Assignments:** Instead of assigning roles to individual user accounts, assign them to Azure Active Directory (Entra ID) Groups. You can manage the group membership dynamically without needing to alter your infrastructure code or trigger a new `pulumi up`.

## 10.3 App Services and Azure Functions

While they serve different primary use cases, Azure App Service (Platform-as-a-Service for web and API hosting) and Azure Functions (serverless, event-driven compute) share the exact same foundational architecture under the hood. In the Pulumi Azure Native provider, both resources are provisioned using the `azure_native.web.WebApp` class. The distinction between a traditional web application and a serverless function is simply defined by the `kind` property.

The following text diagram illustrates the resource hierarchy and dependencies required to provision these services:

```text
  [ Azure Resource Group ]
         │
         ├── [ App Service Plan ]  (Defines Compute, Memory, and Pricing Tier)
         │        │
         │        ├──> [ Web App ] (kind: "app") - Always-on web servers
         │        │
         │        └──> [ Function App ] (kind: "functionapp") - Event-driven execution
         │
         └── [ Storage Account ] (Required dependency for Function Apps)
```

### The Compute Foundation: App Service Plans

Before you can deploy an app or a function, you must provision an App Service Plan (referred to in the ARM API and Azure Native as a `ServerFarm`). The App Service Plan acts as the compute boundary, defining the operating system, the hardware specifications, and the pricing tier (SKU). 

For traditional Web Apps, you typically use a Dedicated tier (like `B1`, `S1`, or `P1v2`). For serverless Azure Functions, you use the Dynamic/Consumption tier (`Y1`), which scales to zero and bills only for execution time.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// Assume a resource group is already created
const resourceGroup = new azure_native.resources.ResourceGroup("app-rg");

// Create a Consumption App Service Plan for Serverless Functions
const consumptionPlan = new azure_native.web.AppServicePlan("consumption-plan", {
    resourceGroupName: resourceGroup.name,
    // "Dynamic" indicates a serverless consumption plan
    sku: {
        name: "Y1",
        tier: "Dynamic",
    },
});

// Create a Dedicated App Service Plan for Web Apps
const dedicatedPlan = new azure_native.web.AppServicePlan("dedicated-plan", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "B1",
        tier: "Basic",
    },
});
```

### Deploying a Web App

To deploy a standard web application, you instantiate a `WebApp` resource, pass in the ID of your Dedicated App Service Plan, and explicitly set the `kind` to `"app"`. 

The `siteConfig` block is where you define the runtime environment (e.g., Node.js, Python, .NET) and inject application settings (environment variables).

```typescript
const webApp = new azure_native.web.WebApp("frontend-app", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: dedicatedPlan.id,
    kind: "app",
    siteConfig: {
        alwaysOn: true, // Required for dedicated plans to prevent the app from idling
        appSettings: [
            {
                name: "NODE_ENV",
                value: "production",
            },
            {
                name: "API_ENDPOINT",
                value: "https://api.mycompany.com/v1",
            }
        ],
    },
});

export const webAppUrl = pulumi.interpolate`https://${webApp.defaultHostName}`;
```

### Going Serverless: Azure Functions

Deploying an Azure Function App introduces a critical new dependency: an Azure Storage Account. Azure Functions rely heavily on blob storage and queues to manage execution state, timers, triggers, and logging. 

Because of this requirement, creating a Function App in Pulumi is a multi-step process:
1. Create the Storage Account.
2. Retrieve the Storage Account's access keys dynamically using the `listStorageAccountKeys` function.
3. Construct the connection string.
4. Provision the `WebApp` (with `kind: "functionapp"`) and pass the connection string into the `AzureWebJobsStorage` application setting.

```typescript
// 1. Create the Storage Account
const storageAccount = new azure_native.storage.StorageAccount("fnstorage", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: azure_native.storage.SkuName.Standard_LRS,
    },
    kind: azure_native.storage.Kind.StorageV2,
});

// 2 & 3. Dynamically retrieve keys and construct the connection string
const storageAccountKeys = pulumi.all([resourceGroup.name, storageAccount.name]).apply(
    ([rgName, accountName]) => azure_native.storage.listStorageAccountKeys({
        resourceGroupName: rgName,
        accountName: accountName,
    })
);
const primaryStorageKey = storageAccountKeys.keys[0].value;
const storageConnectionString = pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryStorageKey};EndpointSuffix=core.windows.net`;

// 4. Provision the Function App
const functionApp = new azure_native.web.WebApp("serverless-api", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: consumptionPlan.id, // Linking to the Y1 Consumption Plan created earlier
    kind: "functionapp",
    siteConfig: {
        appSettings: [
            {
                name: "AzureWebJobsStorage", // Required by the Azure Functions runtime
                value: storageConnectionString,
            },
            {
                name: "FUNCTIONS_EXTENSION_VERSION", // Specifies the Functions runtime version
                value: "~4",
            },
            {
                name: "FUNCTIONS_WORKER_RUNTIME", // Specifies the language worker
                value: "node", 
            }
        ],
    },
});

export const functionAppUrl = pulumi.interpolate`https://${functionApp.defaultHostName}`;
```

### A Note on Code Deployment

The examples above provision the *infrastructure* to host your applications, but they do not deploy the application code itself. 

While you can use Pulumi's `pulumi.asset.FileArchive` or `pulumi.asset.AssetArchive` classes to zip up a local directory and push it directly to the App Service during `pulumi up`, modern enterprise architectures generally advise against this. Coupling infrastructure provisioning too tightly with application code deployment often leads to bloated state files and brittle deployments. 

Instead, best practice dictates that Pulumi should provision the Web Apps and Function Apps, outputting the necessary publish profiles or endpoint URLs. A dedicated Continuous Delivery (CD) pipeline (such as GitHub Actions or Azure DevOps) should then take over, compiling the application code and pushing the artifacts to the pre-provisioned Pulumi infrastructure. This separation of concerns will be explored further in Chapter 18.

## 10.4 Managing Azure Storage and Cosmos DB

Data is the center of gravity for most cloud architectures. While compute resources can often be treated as ephemeral and easily replaced, stateful resources require rigorous configuration, security hardening, and lifecycle management. In the Azure ecosystem, data persistence primarily revolves around two foundational services: **Azure Storage** (for unstructured data, files, and queues) and **Azure Cosmos DB** (for globally distributed NoSQL and relational workloads). 

Using the Pulumi Azure Native provider, you can manage these complex data topologies securely, ensuring that access controls, scaling parameters, and replication strategies are version-controlled alongside your application code.

### Managing Azure Storage

An Azure Storage Account is a secure, highly available namespace for your data. It provides access to several distinct data services under a single unified management layer: Blob (object storage), File (managed file shares), Queue (message queuing), and Table (NoSQL key-value store).

The logical hierarchy of Azure Storage looks like this:

```text
  [ Storage Account ]  (Defines Tier, Replication, and Network Access)
         │
         ├──> [ Blob Service ] ──> [ Container ] ──> [ Blob (File) ]
         │
         ├──> [ File Service ] ──> [ Share ] ──> [ Directory/File ]
         │
         └──> [ Queue Service] ──> [ Queue ] ──> [ Message ]
```

When provisioning a Storage Account via Infrastructure as Code, security should be your primary concern. By default, legacy Azure configurations often permitted anonymous public read access. In modern IaC deployments, you should explicitly disable public access and enforce TLS 1.2 or higher.

**Provisioning a Secure Storage Account and Blob Container:**

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const resourceGroup = new azure_native.resources.ResourceGroup("data-rg");

// 1. Provision the Storage Account
const storageAccount = new azure_native.storage.StorageAccount("appstorage", {
    resourceGroupName: resourceGroup.name,
    // StorageV2 is the current recommended kind for all general-purpose workloads
    kind: azure_native.storage.Kind.StorageV2,
    sku: {
        name: azure_native.storage.SkuName.Standard_ZRS, // Zone-Redundant Storage
    },
    // Security Best Practices
    allowBlobPublicAccess: false, // Explicitly deny anonymous access
    minimumTlsVersion: azure_native.storage.MinimumTlsVersion.TLS1_2,
    enableHttpsTrafficOnly: true,
});

// 2. Provision a Blob Container within the Account
const blobContainer = new azure_native.storage.BlobContainer("assets-container", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    // The container inherits the account's security posture, but we can enforce no public access here too
    publicAccess: azure_native.storage.PublicAccess.None,
});

export const storageAccountName = storageAccount.name;
export const containerName = blobContainer.name;
```

### Architecting Azure Cosmos DB

Azure Cosmos DB is Microsoft's fully managed, globally distributed, multi-model database service. It is highly tunable, allowing you to optimize for throughput, latency, availability, and consistency. 

Because Cosmos DB is an underlying engine supporting multiple APIs (SQL/Core, MongoDB, Cassandra, Gremlin, Table), the Azure Resource Manager (and therefore Pulumi) categorizes it under the `documentdb` namespace.

When defining a Cosmos DB architecture in Pulumi, you must provision three distinct layers:
1. **The Database Account:** Defines the global distribution (regions), the API type, and the default Consistency Level.
2. **The Database:** The logical grouping of containers.
3. **The Container:** The actual table/collection holding the data, which defines the **Partition Key** and the Provisioned Throughput (RU/s).

```text
  [ Cosmos DB Account ]  (Defines API Type, Regions, Consistency Policy)
         │
         └──> [ SQL Database ] 
                │
                ├──> [ Container (Users) ]    (Partition Key: /tenantId, RUs: 400)
                │
                └──> [ Container (Orders) ]   (Partition Key: /orderYear, RUs: Autoscale)
```

**Provisioning a Cosmos DB SQL API Topology:**

```typescript
// 1. Provision the Cosmos DB Account
const cosmosAccount = new azure_native.documentdb.DatabaseAccount("cosmos-account", {
    resourceGroupName: resourceGroup.name,
    // Enable multiple write regions for high availability
    enableMultipleWriteLocations: true,
    // Define the consistency level (BoundedStaleness, Session, Strong, Eventual)
    consistencyPolicy: {
        defaultConsistencyLevel: azure_native.documentdb.DefaultConsistencyLevel.Session,
    },
    // Define the locations (Replication)
    locations: [
        {
            locationName: "East US",
            failoverPriority: 0,
            isZoneRedundant: false,
        },
        {
            locationName: "West US",
            failoverPriority: 1,
            isZoneRedundant: false,
        }
    ],
    // The default API is SQL (Core). 
    databaseAccountOfferType: "Standard",
});

// 2. Provision the Database
const sqlDatabase = new azure_native.documentdb.SqlResourceSqlDatabase("app-db", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosAccount.name,
    resource: {
        id: "ecommerce-db", // The physical name of the database
    },
});

// 3. Provision a Container with Autoscale Throughput
const ordersContainer = new azure_native.documentdb.SqlResourceSqlContainer("orders-container", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosAccount.name,
    databaseName: sqlDatabase.name,
    resource: {
        id: "orders",
        // The partition key is critical for Cosmos DB horizontal scaling
        partitionKey: {
            paths: ["/tenantId"],
            kind: azure_native.documentdb.PartitionKind.Hash,
        },
    },
    options: {
        // Configure Autoscale (Serverless scaling between 400 and 4000 RU/s)
        autoscaleSettings: {
            maxThroughput: 4000,
        },
    },
});
```

### Securing Data Access with Pulumi Secrets

To connect your application (like the Azure Functions deployed in Section 10.3) to Cosmos DB, you need the connection strings. Since these strings contain master access keys, they must never be exposed in plaintext in your console logs or CI/CD outputs.

Pulumi handles this elegantly by allowing you to retrieve the keys dynamically and explicitly mark them as secrets using `pulumi.secret()`.

```typescript
// Retrieve the connection strings for the Cosmos DB account
const cosmosKeys = pulumi.all([resourceGroup.name, cosmosAccount.name]).apply(
    ([rgName, accountName]) => azure_native.documentdb.listDatabaseAccountConnectionStrings({
        resourceGroupName: rgName,
        accountName: accountName,
    })
);

// Extract the primary connection string and wrap it as a secret
export const cosmosConnectionString = pulumi.secret(cosmosKeys.connectionStrings[0].connectionString);
```

By wrapping the value in `pulumi.secret()`, Pulumi encrypts it in the state file (as discussed in Chapter 6) and masks it with `[secret]` in all terminal outputs, ensuring your data tier remains both fully automated and highly secure.