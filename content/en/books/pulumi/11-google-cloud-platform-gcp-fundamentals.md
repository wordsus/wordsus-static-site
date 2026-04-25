Google Cloud Platform (GCP) offers a powerful suite of services emphasizing containerization, serverless computing, and global data distribution. In this chapter, we bridge the gap between GCP’s developer-centric philosophy and Pulumi’s infrastructure as code model. 

We will explore how to securely authenticate the Pulumi GCP provider and provision foundational services. You will learn to deploy serverless containers with Cloud Run, orchestrate Kubernetes clusters with GKE, and manage stateful resources like Cloud SQL and Cloud Storage to build production-ready, highly available architectures.

## 11.1 GCP Provider Authentication and Setup

Before Pulumi can provision resources like Cloud Run services or GKE clusters, it must be authorized to interact with the Google Cloud Platform (GCP) APIs. The Pulumi GCP provider relies on standard Google Cloud authentication mechanisms, meaning if you have already configured tools like the `gcloud` CLI or standard Google Cloud SDKs, Pulumi will seamlessly inherit that context.

When the Pulumi engine executes a program utilizing the GCP provider, it resolves credentials and configuration using a specific hierarchy.

```text
Authentication Resolution Pipeline:

[Pulumi Engine]
      │
      ├─► 1. Explicit Provider Instance (passed in code)
      │      │
      │      └─► Fails/Not provided?
      │
      ├─► 2. Environment Variables
      │      │  (GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_PROJECT)
      │      │
      │      └─► Fails/Not provided?
      │
      ├─► 3. Application Default Credentials (ADC)
      │      │  (~/.config/gcloud/application_default_credentials.json)
      │      │
      │      └─► Fails/Not provided?
      │
      ├─► 4. Pulumi Stack Configuration
      │      │  (gcp:project, gcp:region, gcp:zone)
      │      │
      │      └─► Fails/Not provided?
      │
      ▼
[Error: Missing credentials or project configuration]
```

### Authentication Strategies

Depending on the environment where Pulumi is executing, you will typically choose one of three authentication strategies: Local Development, Long-Lived Service Account Keys, or Workload Identity Federation.

#### 1. Local Development: Application Default Credentials (ADC)
For daily infrastructure development on a local machine, the most secure and convenient method is using Application Default Credentials via the Google Cloud CLI. This avoids the need to download or manage static JSON keys on your workstation.

Ensure the `gcloud` CLI is installed, then run:

```bash
gcloud auth application-default login
```

This command opens a browser window, prompts you to log in with your Google identity, and securely stores short-lived credentials locally. Pulumi automatically detects these credentials.

#### 2. Traditional CI/CD: Service Account Keys (JSON)
When running Pulumi in a headless environment like Jenkins or an older CI system, you often authenticate using a GCP Service Account key. 

After creating a Service Account with the necessary IAM roles (e.g., `roles/editor` or specific least-privilege roles), generate a JSON key and expose it to the Pulumi process via the standard GCP environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

*Note: As discussed in Chapter 6, never commit this JSON file to version control. In a CI/CD pipeline, inject the JSON content securely using your platform's secrets manager.*

#### 3. Modern CI/CD: Workload Identity Federation (WIF)
For modern continuous integration platforms like GitHub Actions or GitLab CI (covered extensively in Chapter 18), Workload Identity Federation is the best practice. WIF eliminates the need to export long-lived JSON keys entirely. Instead, it establishes a trust relationship between your CI provider and GCP, allowing Pulumi to request ephemeral, short-lived access tokens dynamically during the `pulumi up` execution.

### Configuring Provider Scope (Project, Region, Zone)

Once Pulumi is authenticated, it needs to know *where* to deploy your resources. GCP organizes infrastructure hierarchically by Project, Region, and Zone.

While you can set these via environment variables (`GOOGLE_PROJECT`, `GOOGLE_REGION`), the idiomatic approach is to use the Pulumi configuration system to tie these settings directly to your stack context.

```bash
# Set the default GCP project for the current stack
pulumi config set gcp:project my-production-project-id

# Set the default region for regional resources (e.g., Cloud Run)
pulumi config set gcp:region us-central1

# Set the default zone for zonal resources (e.g., Compute Engine instances)
pulumi config set gcp:zone us-central1-a
```

### Explicit Provider Instantiation

In most cases, relying on the stack configuration to automatically configure the default GCP provider is sufficient. However, if your architecture requires deploying to multiple GCP projects simultaneously (e.g., setting up VPC peering between a "Shared VPC" project and an "App" project), you must use explicit provider instances.

The following TypeScript example demonstrates how to instantiate a custom GCP provider and pass it to a resource, overriding the default stack configuration:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Initialize a provider for the network project
const networkProvider = new gcp.Provider("network-project-provider", {
    project: "corp-shared-network-vpc",
    region: "us-east1",
    // Optional: Explicitly pass credentials if varying by provider
    // credentials: process.env.NETWORK_PROJECT_CREDS_JSON,
});

// Initialize a provider for the application project
const appProvider = new gcp.Provider("app-project-provider", {
    project: "ecommerce-frontend-prod",
    region: "us-west2",
});

// Create a resource using the specific network provider
const sharedVpc = new gcp.compute.Network("shared-vpc", {
    autoCreateSubnetworks: false,
}, { provider: networkProvider }); // <-- Passing the explicit provider

// Create a resource using the specific app provider
const appBucket = new gcp.storage.Bucket("app-assets", {
    location: "US",
}, { provider: appProvider }); // <-- Passing the explicit provider
```

By mastering this authentication pipeline and the distinction between default and explicit providers, you ensure your Pulumi code can securely and predictably target any Google Cloud environment, laying the groundwork for the complex provisioning scenarios covered in the rest of this chapter.

## 11.2 Cloud Run and Serverless Deployments

Serverless computing has shifted the operational burden from infrastructure teams to cloud providers, and Google Cloud Run is arguably one of the most elegant implementations of this paradigm. Cloud Run allows you to deploy scalable, stateless HTTP containers without managing underlying Kubernetes clusters or Virtual Machines. 

For Pulumi users, managing Cloud Run is exceptionally streamlined. It allows you to define your container's environment variables, concurrency limits, and access policies in the same language you use to write your application code, treating your serverless infrastructure as true software.

```text
Serverless Deployment Architecture:

[Application Code] 
       │
       ▼ (Docker Build)
[Container Image] ──► [Google Artifact Registry]
                               │
                               ▼ (Pulumi Deployment)
                       [Cloud Run Service] ◄── Auto-scales from 0 to N
                               │
                               ▼ (IAM Binding)
                       [Public HTTP Endpoint]
```

### The Cloud Run v2 API

Google Cloud offers two Pulumi namespaces for Cloud Run: `cloudrun` (v1) and `cloudrunv2`. Whenever writing new infrastructure code, you should default to `cloudrunv2`. The v2 API better aligns with standard Kubernetes API structures, offers improved support for volume mounts (like Cloud Storage or NFS), and provides more granular control over traffic splitting and revision management.

### Anatomy of a Cloud Run Deployment

Deploying a publicly accessible Cloud Run service requires three primary steps in Pulumi:

1.  **Sourcing the Image:** Cloud Run requires a container image hosted in a registry accessible by GCP. While you can build and push images dynamically using the `@pulumi/docker` provider, production workflows typically reference an image already pushed to Google Artifact Registry via a CI/CD pipeline.
2.  **Defining the Service:** The `gcp.cloudrunv2.Service` resource defines *how* the container runs. This includes setting environment variables, allocating CPU/Memory, defining VPC egress rules, and setting scaling boundaries (e.g., maximum instances to prevent cost overruns).
3.  **Configuring IAM:** By default, all newly created Cloud Run services are secure and private. To expose the service to the public internet, you must explicitly grant the `roles/run.invoker` role to the special `allUsers` identity.

### Implementing the Deployment

The following TypeScript program demonstrates how to deploy a stateless container to Cloud Run, configure its runtime parameters, and expose it to the internet securely.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// 1. Define configuration for the deployment
const config = new pulumi.Config();
const location = config.get("region") || "us-central1";
const gcpProject = gcp.config.project;

// For this example, we use a public sample image. 
// In production, this would be your Artifact Registry URL.
const containerImage = "us-docker.pkg.dev/cloudrun/container/hello";

// 2. Provision the Cloud Run v2 Service
const appService = new gcp.cloudrunv2.Service("frontend-service", {
    project: gcpProject,
    location: location,
    ingress: "INGRESS_TRAFFIC_ALL",
    template: {
        scaling: {
            // Scale to zero when there is no traffic to save costs
            minInstanceCount: 0,
            // Hard limit to prevent run-away billing
            maxInstanceCount: 5,
        },
        containers: [{
            image: containerImage,
            resources: {
                limits: {
                    cpu: "1000m", // 1 vCPU
                    memory: "512Mi",
                },
            },
            ports: [{
                // Cloud Run expects containers to listen on this port
                containerPort: 8080, 
            }],
            envs: [
                {
                    name: "ENVIRONMENT",
                    value: "production",
                },
                {
                    name: "API_TIMEOUT_MS",
                    value: "5000",
                }
            ],
        }],
    },
});

// 3. Make the Cloud Run service publicly accessible
const publicInvoker = new gcp.cloudrunv2.ServiceIamPolicy("frontend-public-access", {
    project: appService.project,
    location: appService.location,
    name: appService.name,
    policyData: appService.name.apply(name => 
        gcp.organizations.getIAMPolicy({
            bindings: [{
                role: "roles/run.invoker",
                members: ["allUsers"],
            }],
        }).then(policy => policy.policyData)
    ),
});

// 4. Export the resulting URL so it can be easily accessed
export const serviceUrl = appService.uri;
```

### Managing Revisions and Traffic Splitting

One of Cloud Run's most powerful features is built-in revision management. Every time you run `pulumi up` with a new container image tag or modified environment variable, Cloud Run automatically creates a new immutable "Revision."

By default, Pulumi and GCP will route 100% of traffic to the latest deployed revision. However, you can manage complex rollout strategies—such as Canary deployments or Blue/Green testing—by explicitly defining the `traffic` block within the `gcp.cloudrunv2.Service` resource. This allows you to declaratively route, for example, 90% of traffic to the stable revision and 10% to the newly deployed revision, giving you a safe path to validate serverless deployments in production.

## 11.3 GKE (Google Kubernetes Engine) Clusters

While Cloud Run provides an excellent platform for stateless, event-driven containers, many enterprise architectures require the orchestration, state management, and ecosystem integrations that only Kubernetes can provide. Google Kubernetes Engine (GCP's managed Kubernetes service) is widely considered the industry standard for running Kubernetes in the cloud.

When managing GKE with Pulumi, it is crucial to understand the boundary between infrastructure and workloads. In this chapter, we focus on provisioning the *infrastructure*—the cluster control plane, networking, and worker nodes. In Chapter 12, we will use the `@pulumi/kubernetes` provider to deploy applications and configurations *into* this cluster.

### GKE Architecture and Pulumi Resource Mapping

A GKE Standard cluster consists of a Google-managed Control Plane and user-managed worker nodes organized into Node Pools. 

```text
GKE Cluster Architecture:

[Google Managed Control Plane] (API Server, Scheduler, etcd)
        │                │
        │ (TLS)          │ (TLS)
        ▼                ▼
┌──────────────────────────────────────┐
│  Customer VPC (Pulumi Managed)       │
│                                      │
│  [Node Pool: "primary-pool"]         │
│   ├── Node (e2-standard-4)           │
│   ├── Node (e2-standard-4)           │
│                                      │
│  [Node Pool: "high-memory-pool"]     │
│   ├── Node (e2-highmem-8)            │
└──────────────────────────────────────┘
```

A common anti-pattern in Infrastructure as Code is deploying a GKE cluster with the default node pool attached directly to the cluster resource. This binds the lifecycle of your nodes tightly to the cluster itself, making it difficult to update machine types or scale without recreating the entire cluster.

The Pulumi best practice is to decouple these resources:
1.  Create the `gcp.container.Cluster` and explicitly delete the default node pool upon creation.
2.  Create separate `gcp.container.NodePool` resources and attach them to the cluster.

### Provisioning a Standard Cluster

The following TypeScript program demonstrates how to provision a GKE cluster using the decoupled node pool pattern. It also dynamically generates the `kubeconfig` file required to authenticate `kubectl` or the Pulumi Kubernetes provider against the new cluster.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// 1. Fetch current GCP configuration context
const config = new pulumi.Config();
const project = gcp.config.project;
const location = config.get("zone") || "us-central1-a";

// 2. Define the GKE Cluster
const engineVersion = gcp.container.getEngineVersions({ location }).then(v => v.latestMasterVersion);

const cluster = new gcp.container.Cluster("primary-cluster", {
    project: project,
    location: location,
    // We can't create a cluster with no node pool defined, but we want to only use
    // separately managed node pools. So we create the smallest possible default
    // pool and immediately delete it.
    removeDefaultNodePool: true,
    initialNodeCount: 1,
    minMasterVersion: engineVersion,
    // Enable Workload Identity (Best practice for Pod-to-GCP authentication)
    workloadIdentityConfig: {
        workloadPool: `${project}.svc.id.goog`,
    },
});

// 3. Define a Custom Node Pool
const primaryNodePool = new gcp.container.NodePool("primary-node-pool", {
    project: project,
    location: location,
    cluster: cluster.name,
    nodeCount: 2,
    nodeConfig: {
        machineType: "e2-standard-4",
        // Minimum necessary OAuth scopes for nodes
        oauthScopes: [
            "https://www.googleapis.com/auth/compute",
            "https://www.googleapis.com/auth/devstorage.read_only",
            "https://www.googleapis.com/auth/logging.write",
            "https://www.googleapis.com/auth/monitoring",
        ],
    },
    management: {
        autoRepair: true,
        autoUpgrade: true,
    },
});

// 4. Generate the Kubeconfig securely
// We use pulumi.all() to wait for all necessary asynchronous cluster attributes
export const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.masterAuth]).apply(([name, endpoint, masterAuth]) => {
    const context = `${project}_${location}_${name}`;
    return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      provideClusterInfo: true
`;
});
```

### Understanding the Kubeconfig Generation

Generating the `kubeconfig` directly within Pulumi is one of the most powerful aspects of its programming model. Because Pulumi uses full programming languages, we can use string interpolation to construct the YAML file directly from the cluster's outputs.

Notice the use of `pulumi.all([...]).apply(...)`. Because `cluster.name`, `cluster.endpoint`, and `cluster.masterAuth` are `Output` values (promises representing values that won't exist until the cluster is provisioned), we cannot use standard JavaScript string concatenation. `pulumi.all()` gathers these asynchronous outputs and passes their resolved values into a callback function once the cloud provider has finished creating the cluster. 

Furthermore, modern GKE versions require the `gke-gcloud-auth-plugin` for authentication. The dynamically generated kubeconfig instructs the Kubernetes client to execute this plugin, seamlessly utilizing the machine's active `gcloud` credentials to securely authenticate with the cluster.

### GKE Autopilot

While the Standard pattern gives you complete control over the underlying Compute Engine instances, Google also offers **GKE Autopilot**. Autopilot is a hands-off mode where Google provisions and manages the underlying node infrastructure automatically based on the CPU and memory requests defined in your Kubernetes Pod manifests.

If your organization prefers Autopilot, the Pulumi implementation becomes vastly simpler. You omit the `gcp.container.NodePool` resource entirely and simply set `enableAutopilot: true` within the `gcp.container.Cluster` definition.

## 11.4 Cloud SQL and Cloud Storage Integration

While compute platforms like Cloud Run and GKE handle the execution of your application logic, the lifeblood of almost every modern enterprise application is its data. Google Cloud provides two foundational services for data persistence: Cloud Storage for unstructured object data (images, documents, backups) and Cloud SQL for fully managed relational databases (PostgreSQL, MySQL, SQL Server).

Provisioning these resources via Pulumi requires careful attention to security, high availability, and lifecycle management. A well-architected infrastructure avoids hardcoded credentials and relies on Google Cloud Identity and Access Management (IAM) to broker connections between compute and storage.

```text
Secure Data Integration Architecture:

┌─────────────────────┐       (IAM Binding)       ┌────────────────────────┐
│ Compute Environment │ ◄───────────────────────► │   Google Cloud IAM     │
│ (Cloud Run / GKE)   │                           │  (Service Account)     │
└─────────┬───────────┘                           └──────┬───────────┬─────┘
          │                                              │           │
          │ (Uses Service Account Identity)              │           │
          │                                              ▼           ▼
          │                                       (roles/     (roles/
          │                                  cloudsql.client) storage.objectAdmin)
          │                                              │           │
          ├─────────────────(TCP/IP)─────────────────────┼─┐         │
          │                                              │ │         │
          ▼                                              ▼ ▼         ▼
┌─────────────────────────────────┐           ┌────────────────────────────────┐
│           Cloud SQL             │           │         Cloud Storage          │
│ ┌────────────┐   ┌────────────┐ │           │                                │
│ │ Primary DB │──►│ Replica DB │ │           │  [ Object ]       [ Object ]   │
│ │ (Zone A)   │   │ (Zone B)   │ │           │                                │
│ └────────────┘   └────────────┘ │           │  [ Object ]       [ Object ]   │
└─────────────────────────────────┘           └────────────────────────────────┘
```

### Managing Cloud Storage

Google Cloud Storage (GCS) is globally available, highly durable, and scales infinitely. When defining buckets in Pulumi, it is critical to enforce security baselines, such as uniform bucket-level access (which disables legacy ACLs in favor of IAM) and object versioning to protect against accidental deletion.

Furthermore, Infrastructure as Code allows you to declaratively define lifecycle rules, automatically transitioning older data to cheaper storage tiers or deleting it entirely to optimize costs.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Define a secure, versioned Cloud Storage bucket
const appAssetsBucket = new gcp.storage.Bucket("app-assets-bucket", {
    location: "US",
    // Enforce IAM over legacy ACLs
    uniformBucketLevelAccess: true,
    // Protect against accidental data loss
    versioning: {
        enabled: true,
    },
    // Automatically manage costs
    lifecycleRules: [
        {
            // Move objects older than 90 days to Coldline storage
            action: {
                type: "SetStorageClass",
                storageClass: "COLDLINE",
            },
            condition: {
                age: 90,
            },
        },
        {
            // Delete non-current versions of objects after 30 days
            action: {
                type: "Delete",
            },
            condition: {
                daysSinceNoncurrentTime: 30,
            },
        }
    ],
});
```

### Provisioning Highly Available Cloud SQL

Deploying a Cloud SQL instance is more complex than a storage bucket because it requires orchestrating the instance infrastructure, the logical databases residing within it, and the users permitted to access them.

For production workloads, your Pulumi code should configure the instance for Regional Availability (creating a standby replica in a different zone for automatic failover) and automate the generation of secure passwords using the `@pulumi/random` provider, ensuring human operators never know the raw database password.

```typescript
import * as random from "@pulumi/random";

// 1. Generate a strong, random password for the database user
const dbPassword = new random.RandomPassword("db-user-password", {
    length: 24,
    special: true,
});

// 2. Provision the Cloud SQL Instance
const dbInstance = new gcp.sql.DatabaseInstance("primary-postgres-instance", {
    databaseVersion: "POSTGRES_15",
    region: "us-central1",
    // Prevent accidental deletion of the database via Pulumi
    deletionProtection: true,
    settings: {
        tier: "db-custom-2-7680", // 2 vCPU, 7.5 GB RAM
        availabilityType: "REGIONAL", // High Availability across zones
        backupConfiguration: {
            enabled: true,
            startTime: "02:00", // Perform backups at 2 AM
            pointInTimeRecoveryEnabled: true,
        },
        ipConfiguration: {
            // Best Practice: Disable public IP, require VPC peering
            ipv4Enabled: false,
            // (Assuming privateNetwork is a pre-existing VPC reference)
            // privateNetwork: customVpc.id, 
        },
    },
});

// 3. Create a logical database within the instance
const appDatabase = new gcp.sql.Database("ecommerce-db", {
    instance: dbInstance.name,
    name: "ecommerce_production",
});

// 4. Create a database user with the generated password
const dbUser = new gcp.sql.User("app-db-user", {
    instance: dbInstance.name,
    name: "ecommerce_app",
    password: dbPassword.result,
});
```

*Note: In Chapter 6, we discussed Secrets Management. Because `dbPassword.result` is generated by a Pulumi resource, Pulumi automatically treats it as a secret. It will be encrypted in the state file and masked in the CLI output.*

### Unifying Access with Service Accounts

The final piece of the integration puzzle is connecting your compute resources to these data stores securely. The legacy approach involved exporting the database password and a downloaded JSON Service Account key as environment variables. 

The modern, secure approach is to create a dedicated GCP Service Account representing your application, grant that specific account the exact IAM roles it needs, and bind that identity to your Cloud Run service or GKE Pods (via Workload Identity).

```typescript
// Create a dedicated Service Account for the application
const appServiceAccount = new gcp.serviceaccount.Account("app-identity", {
    accountId: "ecommerce-app-sa",
    displayName: "Ecommerce Application Identity",
});

// Grant the Service Account read/write access to the Storage Bucket
const bucketIamBinding = new gcp.storage.BucketIAMMember("app-bucket-access", {
    bucket: appAssetsBucket.name,
    role: "roles/storage.objectAdmin",
    member: pulumi.interpolate`serviceAccount:${appServiceAccount.email}`,
});

// Grant the Service Account the ability to connect to Cloud SQL securely
// (This allows the use of the Cloud SQL Auth Proxy without static passwords)
const sqlIamBinding = new gcp.projects.IAMMember("app-sql-access", {
    project: gcp.config.project,
    role: "roles/cloudsql.client",
    member: pulumi.interpolate`serviceAccount:${appServiceAccount.email}`,
});

// Example: Attaching the identity to a Cloud Run service (from Section 11.2)
const secureCloudRunService = new gcp.cloudrunv2.Service("secure-app-service", {
    // ... other configuration ...
    template: {
        // The container runs as the dedicated IAM service account
        serviceAccount: appServiceAccount.email,
        containers: [{
            image: "us-docker.pkg.dev/cloudrun/container/hello",
            envs: [
                // Pass connection names, not passwords
                {
                    name: "DB_CONNECTION_NAME",
                    value: dbInstance.connectionName,
                },
                {
                    name: "ASSETS_BUCKET_NAME",
                    value: appAssetsBucket.name,
                }
            ]
        }],
    },
});
```

By defining the Service Account, the IAM policies, and the data resources alongside the compute deployment, you achieve a tightly coupled, fully declarative security posture. This eliminates the "Day 2" operational drift that occurs when infrastructure teams manage databases while application teams manage deployments, bringing the full promise of Infrastructure as Code to your Google Cloud environments.