Provisioning a Kubernetes cluster is only half the battle; the true complexity lies in managing the workloads running inside it. Historically, teams relied on a fragmented toolchain—using one tool for the cluster and a chaotic mix of bash scripts and YAML for the applications. This chapter explores how Pulumi unifies cluster provisioning and workload management into a single workflow. We will dive into the Pulumi Kubernetes Provider, demonstrating how to declare native API objects using standard programming languages. You will also learn how to ingest raw YAML and Kustomize, orchestrate Helm charts via code, and integrate these practices into modern GitOps pipelines.

## 12.1 The Pulumi Kubernetes Provider

While the cloud providers discussed in Part III (AWS, Azure, GCP) handle the provisioning of managed control planes and worker nodes, the Pulumi Kubernetes Provider is responsible for managing the workloads, configuration, and infrastructure running *inside* those clusters. 

Unlike traditional Kubernetes management tools that rely heavily on templated YAML or intermediate domain-specific languages, the Pulumi Kubernetes provider offers direct, strongly-typed access to the entire Kubernetes API. Because the provider is generated directly from the upstream Kubernetes OpenAPI specification, day-zero support is guaranteed for new Kubernetes releases; every `apiVersion` and `kind` translates identically into a corresponding namespace and class within the Pulumi SDKs.

### Architecture of the Provider

The Kubernetes provider acts as a specialized translator between the Pulumi Engine and the target cluster's API Server. It handles authentication, translates resource definitions into API requests, and monitors the cluster's state.

```text
+-------------------+       +--------------------+       +----------------------+
|  Pulumi Program   | ----> |  Pulumi Engine     | ----> |  Pulumi K8s Provider |
|  (Resource State) |       |  (Diffing & Graph) |       |  (Reconciliation)    |
+-------------------+       +--------------------+       +----------+-----------+
                                                                    |
                                                                    | Kubeconfig
                                                                    v
                                                         +----------------------+
                                                         |  K8s API Server      |
                                                         |  (Cluster State)     |
                                                         +----------------------+
```

### From YAML to Code: 1-to-1 Mapping

The defining characteristic of the Pulumi Kubernetes provider is its predictable mapping of standard Kubernetes manifest schemas to programmatic objects. 

For instance, an `apps/v1/Deployment` in YAML translates directly to the `kubernetes.apps.v1.Deployment` class in Pulumi. The inputs for this class mirror the standard `spec` and `metadata` blocks.

```typescript
import * as k8s from "@pulumi/kubernetes";

// Define a standard Kubernetes namespace
const appNamespace = new k8s.core.v1.Namespace("nginx-namespace", {
    metadata: {
        name: "nginx-production",
    },
});

// Define a Deployment within that namespace
const appDeployment = new k8s.apps.v1.Deployment("nginx-deployment", {
    metadata: {
        namespace: appNamespace.metadata.name,
        labels: { app: "nginx" },
    },
    spec: {
        replicas: 3,
        selector: {
            matchLabels: { app: "nginx" },
        },
        template: {
            metadata: {
                labels: { app: "nginx" },
            },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx:1.25.0",
                    ports: [{ containerPort: 80 }],
                }],
            },
        },
    },
});
```

Because this is written in a general-purpose programming language, you gain immediate access to IDE autocomplete, inline documentation, and type-checking—catching malformed pod specs or invalid port configurations before the code ever reaches the `pulumi up` preview phase.

### Authentication and Explicit Providers

By default, the Pulumi Kubernetes provider behaves exactly like `kubectl`: it looks for a valid kubeconfig file in the environment (typically at `~/.kube/config` or the `KUBECONFIG` environment variable) and connects to the active context.

However, a core advantage of Pulumi is the ability to provision a cluster (e.g., EKS, AKS, or GKE) and deploy workloads into it during the *exact same execution*. Because the kubeconfig for a newly created cluster doesn't exist locally, you must instantiate an **Explicit Provider**.

An explicit provider allows you to pass connection credentials programmatically, bypassing the local environment entirely. You then map subsequent resources to this specific provider instance.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as gcp from "@pulumi/gcp";

// 1. Reference a cluster created earlier (e.g., based on concepts in Chapter 11)
const cluster = new gcp.container.Cluster("primary-cluster", {
    /* cluster configuration */
});

// 2. Generate the kubeconfig dynamically from the cluster attributes
const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.masterAuth]).apply(
    ([name, endpoint, auth]) => `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${name}
contexts:
- context:
    cluster: ${name}
    user: ${name}
  name: ${name}
current-context: ${name}
kind: Config
preferences: {}
users:
- name: ${name}
  user:
    password: ${auth.password}
    username: ${auth.username}`
);

// 3. Instantiate the Explicit Kubernetes Provider
const k8sProvider = new k8s.Provider("gke-k8s-provider", {
    kubeconfig: kubeconfig,
});

// 4. Deploy a resource USING the explicit provider
const service = new k8s.core.v1.Service("nginx-service", {
    metadata: { name: "nginx-service" },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: 80 }],
        selector: { app: "nginx" },
    },
}, { provider: k8sProvider }); // Crucial: Injecting the provider
```

### Built-in Readiness and Await Logic

One of the most complex aspects of Kubernetes automation is timing. Executing `kubectl apply` merely registers intent with the API server; it does not mean the underlying pods are running or that a LoadBalancer has received a public IP.

The Pulumi Kubernetes provider solves this through built-in **Await Logic**. When you declare a resource, Pulumi actively watches the cluster state and blocks the deployment's completion until the resource is fully operational. 

* **Deployments/StatefulSets:** Pulumi waits until the requested number of replicas are available and all containers pass their readiness probes.
* **Services (LoadBalancer):** Pulumi waits until the cloud provider successfully provisions the external IP or hostname and attaches it to the `status` block.
* **Ingress:** Pulumi waits until the Ingress controller processes the rule and assigns an endpoint.

This eliminates the need to write fragile polling scripts (e.g., `while ! kubectl get pods...`) in your CI/CD pipelines. If a deployment fails due to ImagePullBackOff or a CrashLoopBackOff, Pulumi detects the failure, halts the execution, surfaces the exact Kubernetes event logs to your console, and marks the resource creation as failed.

### Server-Side Apply (SSA)

By default, standard Kubernetes patching utilizes client-side strategic merge patches. This can cause friction when multiple controllers (like an autoscaler or a service mesh sidecar injector) modify the same resource, leading to persistent state diffs during `pulumi up`.

To mitigate this, the Pulumi Kubernetes provider strongly supports **Server-Side Apply (SSA)**. When enabled, Pulumi stops trying to calculate the patch client-side and instead sends the desired state directly to the API server, which manages field ownership. SSA is highly recommended for modern Pulumi workflows and can be enabled directly on the provider:

```typescript
const k8sProvider = new k8s.Provider("k8s-provider", {
    enableServerSideApply: true,
});
```

Using SSA allows Pulumi to seamlessly co-exist with cluster-side mutations, ensuring that your infrastructure as code only enforces the fields you explicitly define, rather than fighting against Kubernetes mutating webhooks.

## 12.2 Deploying Raw YAML and Kustomize

While the strongly-typed classes discussed in the previous section offer a superior developer experience for authoring *new* infrastructure, the reality is that the broader Kubernetes ecosystem speaks YAML. Whether you are adopting Pulumi in a brownfield environment, deploying off-the-shelf software like `cert-manager` or Prometheus, or utilizing complex Custom Resource Definitions (CRDs) provided by a vendor, rewriting thousands of lines of existing YAML into TypeScript is often impractical and error-prone.

Pulumi embraces this reality by providing first-class mechanisms to ingest, deploy, and even modify raw YAML and Kustomize overlays directly within your infrastructure as code programs.

### Managing Raw YAML Files

The `@pulumi/kubernetes` package includes a `yaml` module designed specifically for ingesting standard Kubernetes manifests. It parses the YAML into intermediate Pulumi resource definitions and submits them to the cluster just like natively authored objects.

The two primary classes for this are `ConfigFile` and `ConfigGroup`.

#### Using `ConfigFile`

`ConfigFile` is used to deploy resources defined in a single YAML file, which can be stored locally on disk or retrieved from a remote URL. This is the standard approach for deploying single-file third-party manifests.

```typescript
import * as k8s from "@pulumi/kubernetes";

// Deploy a remote manifest, such as an NGINX Ingress Controller
const nginxIngress = new k8s.yaml.ConfigFile("nginx-ingress", {
    file: "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml",
});
```

#### Using `ConfigGroup`

When your manifests are spread across multiple files or you want to parse raw YAML strings generated dynamically in your code, `ConfigGroup` is the appropriate tool.

```typescript
import * as k8s from "@pulumi/kubernetes";

// Deploy multiple local files and directories simultaneously
const monitoringStack = new k8s.yaml.ConfigGroup("monitoring-stack", {
    files: [
        "manifests/prometheus-config.yaml",
        "manifests/grafana/*.yaml"
    ],
});
```

### The Superpower: Transformations

Applying static YAML is useful, but the real power of Pulumi emerges when you need to bridge the gap between static manifests and dynamic infrastructure. How do you inject a newly generated database password or an RDS endpoint from AWS into a static Kubernetes `Secret` or `Deployment` YAML?

Pulumi solves this with **Transformations**. A transformation is a callback function that Pulumi executes on every resource parsed from a YAML file *before* it is registered with the Pulumi Engine. 

```text
[Static YAML Manifests]
         |
         v
+-----------------------+
|   Pulumi YAML Parser  |  Parses text into in-memory JS/TS objects
+-----------------------+
         |
         v
+-----------------------+
|    Transformations    |  Mutates metadata, injects dynamic Pulumi Outputs,
+-----------------------+  or enforces tagging standards
         |
         v
+-----------------------+
|     Pulumi Engine     |  Registers the final mutated resources into state
+-----------------------+
         |
         v
 [ Kubernetes API ]
```

Transformations allow you to programmatically mutate the YAML on the fly. You can add common labels, force resources into specific namespaces, or inject runtime configuration without ever altering the original source files.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as random from "@pulumi/random";

// Generate a random, secure password for Redis
const redisPassword = new random.RandomPassword("redis-pass", { length: 16 });

// Ingest a standard Redis YAML manifest, but dynamically inject the password
const redisApp = new k8s.yaml.ConfigFile("redis-app", {
    file: "manifests/redis.yaml",
    transformations: [
        (obj: any, opts: pulumi.CustomResourceOptions) => {
            // 1. Force all resources into a specific namespace
            if (obj.metadata) {
                obj.metadata.namespace = "caching-layer";
            }
            
            // 2. Inject the dynamic password into the specific Redis Secret
            if (obj.kind === "Secret" && obj.metadata.name === "redis-secret") {
                // Pulumi automatically handles base64 encoding if needed by the resource type,
                // but for raw YAML injection, we ensure the structure matches expectations.
                obj.stringData = {
                    "password": redisPassword.result
                };
            }
        }
    ],
});
```

### Integrating Kustomize

Kustomize is a popular Kubernetes-native configuration management tool that allows you to define a base set of YAML manifests and then layer "overlays" on top of them to patch or modify resources for different environments (e.g., dev, staging, prod) without templating.

If your team already uses Kustomize, Pulumi can execute a Kustomize build internally and manage the resulting resources. This is handled by the `kustomize.Directory` class.

```typescript
import * as k8s from "@pulumi/kubernetes";

// Pulumi will run the equivalent of `kubectl kustomize ./kustomize/overlays/production`
// parse the resulting YAML, and deploy the resources.
const prodApp = new k8s.kustomize.Directory("production-app", {
    directory: "./kustomize/overlays/production",
    
    // Transformations work here exactly as they do with ConfigFile!
    transformations: [
        (obj: any) => {
            if (obj.metadata && !obj.metadata.labels) {
                obj.metadata.labels = {};
            }
            obj.metadata.labels["managed-by"] = "pulumi";
        }
    ]
});
```

When using `kustomize.Directory`, Pulumi tracks the individual resources produced by the Kustomize build in its state file. This means if you change a parameter in your `kustomization.yaml` that removes a resource, Pulumi will accurately calculate the diff and delete that specific resource from the cluster during the next `pulumi up`, providing robust lifecycle management that raw `kubectl apply -k` lacks.

## 12.3 Managing Helm Charts via Code

Helm has long established itself as the de facto package manager for Kubernetes. It allows developers to bundle complex applications—comprising Deployments, Services, Secrets, and Custom Resources—into reusable templates called Charts. 

Historically, orchestrating Helm deployments alongside underlying cloud infrastructure required fragile bash scripts or CI/CD pipeline glue. You would provision a database using Terraform, extract the connection string, and pass it via `--set` flags to a `helm install` command. 

Pulumi integrates Helm directly into its resource model, eliminating this friction. It provides two distinct methodologies for managing Helm charts: **Client-Side Rendering** (`helm.v3.Chart`) and **Server-Side Releases** (`helm.v3.Release`). Understanding the difference between these two approaches is crucial for designing a robust deployment strategy.

### The `Chart` Resource: Client-Side Rendering

When you use the `helm.v3.Chart` class, Pulumi does not use the Helm binary to manage the deployment lifecycle on the cluster. Instead, Pulumi fetches the chart, injects the values you provide, and executes the Go templates *locally* (client-side) to generate standard Kubernetes YAML. 

Pulumi then parses this YAML and registers each generated object (the Deployment, the ConfigMap, the Service, etc.) as an individual resource in the Pulumi state file.

```text
+--------------+       +-------------------+       +-----------------------+
|  Helm Chart  | ----> | Pulumi Engine     | ----> | Individual K8s Objects|
|  + Values    |       | (Template Render) |       | (Tracked in State)    |
+--------------+       +-------------------+       +-----------------------+
```

**Advantages of the `Chart` resource:**
* **Granular Diffs:** During `pulumi up`, you will see exactly which specific Kubernetes resources are being created, modified, or deleted, rather than a monolithic update to a Helm release.
* **Transformations:** Because Pulumi parses the rendered YAML before sending it to the API server, you can use the transformations feature discussed in Chapter 12.2 to programmatically mutate resources (e.g., forcing a specific `StorageClass` or injecting an init-container) even if the original Helm chart doesn't expose a value for it.

**Example: Deploying NGINX Ingress via `Chart`**

```typescript
import * as k8s from "@pulumi/kubernetes";

// Deploy the NGINX Ingress Controller using client-side rendering
const nginxIngress = new k8s.helm.v3.Chart("nginx-ingress", {
    chart: "ingress-nginx",
    version: "4.7.1",
    fetchOpts: {
        repo: "https://kubernetes.github.io/ingress-nginx",
    },
    // The values object corresponds directly to the custom values.yaml
    values: {
        controller: {
            replicaCount: 2,
            publishService: {
                enabled: true,
            },
            metrics: {
                enabled: true,
            }
        },
    },
    // Optional: Transform the generated resources
    transformations: [
        (obj) => {
            if (obj.kind === "Deployment") {
                obj.metadata.annotations = { "managed-by": "pulumi-chart" };
            }
        }
    ]
});
```

### The `Release` Resource: Server-Side Helm

The `helm.v3.Release` resource takes the opposite approach. It behaves identically to running `helm upgrade --install` from the command line. Pulumi hands over the chart and the values to the Helm engine, which then creates a "Release" object in the cluster (typically stored as a Secret in the target namespace).

```text
+--------------+       +-------------------+       +-----------------------+
|  Helm Chart  | ----> | Pulumi Engine     | ----> | Helm Release Secret   |
|  + Values    |       | (Release Manager) |       | (Cluster Manages State|
+--------------+       +-------------------+       +-----------------------+
```

**Advantages of the `Release` resource:**
* **Helm Hooks:** Many complex charts rely heavily on Helm lifecycle hooks (e.g., `pre-install` jobs to run database migrations, or `post-delete` hooks to clean up volumes). The `Chart` resource ignores these hooks because it merely renders templates. The `Release` resource fully supports them.
* **Native Tooling Compatibility:** Because the deployment creates standard Helm release secrets in the cluster, operations teams can still run commands like `helm list`, `helm rollback`, or `helm status` to interact with the workloads.

**Example: Deploying Prometheus via `Release`**

```typescript
import * as k8s from "@pulumi/kubernetes";

// Deploy Prometheus using native server-side Helm mechanics
const prometheus = new k8s.helm.v3.Release("prometheus-monitoring", {
    chart: "kube-prometheus-stack",
    version: "48.2.1",
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },
    namespace: "monitoring",
    createNamespace: true, // Emulates the --create-namespace flag
    values: {
        grafana: {
            adminPassword: "strong-secure-password",
        },
        prometheus: {
            prometheusSpec: {
                retention: "15d",
            }
        }
    },
    // Pulumi will wait for the Release to be fully rolled out
    waitForJobs: true,
});
```

### Injecting Dynamic Infrastructure Values

The most powerful aspect of managing Helm charts via Pulumi is the seamless integration of infrastructure state. Because the `values` block accepts standard TypeScript objects, you can directly inject Pulumi `Outputs` (Promises) returned by other cloud resources.

If you provision an AWS RDS instance or an Azure Cosmos DB instance earlier in your Pulumi program, you can pass the generated connection endpoints directly into the Helm chart. Pulumi resolves the asynchronous dependency graph automatically.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

// 1. Provision an AWS RDS Database
const db = new aws.rds.Instance("app-database", {
    engine: "postgres",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    dbName: "webapp",
    username: "admin",
    password: "supersecretpassword", // In production, use Pulumi Secrets!
    skipFinalSnapshot: true,
});

// 2. Deploy a Helm Chart, injecting the dynamic DB endpoint
const myApp = new k8s.helm.v3.Release("my-backend-app", {
    chart: "my-app-chart",
    // This assumes you have the chart available locally or in a private repo
    path: "./charts/my-app", 
    values: {
        database: {
            // Pulumi handles the implicit dependency: The Helm release 
            // will not execute until the RDS instance is provisioned 
            // and the endpoint string is available.
            host: db.endpoint,
            user: db.username,
            password: db.password,
            name: db.dbName,
        },
        replicaCount: 3,
    }
});
```

By unifying infrastructure provisioning and application deployment within a single language construct, you eliminate the "last mile" automation gap that typically plagues Kubernetes adoptions.

## 12.4 GitOps Workflows with Pulumi and Kubernetes

GitOps is an operational framework that takes DevOps best practices used for application development—such as version control, collaboration, compliance, and CI/CD—and applies them to infrastructure automation. In a GitOps model, a Git repository serves as the single source of truth for your declarative infrastructure and applications.

Historically, the Kubernetes ecosystem has adopted a "pull-based" GitOps model using tools like Argo CD or Flux. In this model, an agent runs *inside* the cluster, constantly monitoring a Git repository and reconciling the cluster's state to match the manifests found in the repository.

Integrating Pulumi into a GitOps workflow requires a strategic choice between three primary architectural patterns: the Push Model, the Pull Model (via the Pulumi Kubernetes Operator), and the Hybrid Model.

### The Push Model (Git-Driven CI/CD)

The most straightforward way to implement GitOps with Pulumi is through standard continuous integration pipelines (e.g., GitHub Actions, GitLab CI). In this approach, Git remains the source of truth, but the reconciliation engine is your external CI/CD runner rather than an in-cluster agent.

When a developer merges a pull request containing changes to a Pulumi program, a pipeline triggers, authenticates with the cloud provider and the Kubernetes cluster, and executes `pulumi up`. 

```text
[ Developer ] -> (git push) -> [ Git Repository ] -> (webhook) -> [ CI/CD Runner ]
                                                                        |
                                                                        v
                                                          [ Pulumi Engine (pulumi up) ]
                                                                        |
                                                                        v
                                                            [ Kubernetes API Server ]
```

**Pros:**
* Unified workflow for both cloud infrastructure (VPCs, databases) and Kubernetes resources.
* Leverages existing CI/CD infrastructure and secrets management.

**Cons:**
* The CI/CD runner needs direct network access and high-level credentials to the Kubernetes cluster API.
* Does not automatically detect and revert "configuration drift" (manual changes made via `kubectl`) until the next pipeline run.

### The Pull Model (The Pulumi Kubernetes Operator)

To bring Pulumi into the native Kubernetes pull-based ecosystem, you can deploy the **Pulumi Kubernetes Operator**. The Operator runs continuously inside your cluster and defines Custom Resource Definitions (CRDs) that allow you to represent Pulumi programs and stacks as standard Kubernetes objects.

Instead of running `pulumi up` from a CI pipeline, you apply a `Stack` manifest to your cluster. The Operator detects this object, clones the specified Git repository containing your Pulumi TypeScript/Python code, installs dependencies, and executes the deployment entirely within the cluster boundaries.

```text
[ Git Repository ] <---- (pulls code) ---- [ Pulumi Operator (Pod) ]
(Pulumi TS/Python Code)                             | (reconciles)
                                                    v
                                         [ Kubernetes API Server ]
                                         (Creates standard K8s resources)
```

Here is an example of what a `Stack` Custom Resource looks like. You can deploy this via `kubectl` or another GitOps tool:

```yaml
apiVersion: pulumi.com/v1
kind: Stack
metadata:
  name: my-app-production
spec:
  # The environment variables required by the Pulumi program
  envRefs:
    PULUMI_ACCESS_TOKEN:
      type: Secret
      secret:
        name: pulumi-api-secret
        key: accessToken
  # The Git repository containing the Pulumi code
  projectRepo: https://github.com/my-org/infrastructure-code.git
  repoDir: apps/my-app
  branch: main
  # Instructs the operator to immediately deploy the stack
  destroyOnRemover: false
```

**Pros:**
* **Enhanced Security:** The CI/CD system never needs credentials to access the Kubernetes API. The Operator handles everything internally.
* **Continuous Drift Detection:** The Operator can be configured to continuously monitor the resulting resources and automatically correct any manual changes, providing true GitOps reconciliation.

### The Hybrid Model (Pulumi + Argo CD / Flux)

In enterprise environments, it is highly common to see Pulumi and native Kubernetes GitOps tools (like Argo CD or Flux) working side-by-side. Rather than viewing them as mutually exclusive, architects treat them as complementary systems with strict boundaries of responsibility.

A standard hybrid architecture follows the **"Infrastructure + Bootstrapping"** pattern:

1. **Layer 1: Core Infrastructure (Pulumi).** Pulumi provisions the underlying cloud resources: the VPC, the managed Kubernetes cluster (EKS/GKE/AKS), node groups, and IAM roles.
2. **Layer 2: Cluster Bootstrapping (Pulumi).** In the same Pulumi program, you use the Kubernetes provider to install the foundational cluster services: the Ingress Controller, external-dns, cert-manager, and the Argo CD (or Flux) controllers.
3. **Layer 3: Workload Management (Argo CD).** Pulumi uses a `kubernetes.yaml.ConfigFile` or `kubernetes.apiextensions.CustomResource` to deploy the initial Argo CD `Application` or `AppProject` manifests.
4. **The Handoff:** Once the Argo CD application manifests are applied, Pulumi's job is complete. Argo CD takes over, pulling standard YAML or Helm charts for the actual business applications directly from the Git repository.

**Implementing the Boundary**

To prevent Pulumi and Argo CD from fighting over the state of the same resources, you must enforce a strict separation of concerns. If Pulumi deploys an Argo CD `Application` that subsequently creates a `Deployment`, Pulumi *does not* track that `Deployment` in its state file. 

If you must manage a resource with Pulumi but allow another controller (like an autoscaler or a GitOps agent) to modify specific fields, you utilize the `ignoreChanges` resource option.

```typescript
import * as k8s from "@pulumi/kubernetes";

const deployment = new k8s.apps.v1.Deployment("app-deployment", {
    metadata: { name: "my-app" },
    spec: {
        replicas: 3, // Pulumi sets the initial baseline
        // ... rest of deployment spec ...
    }
}, { 
    // Instruct Pulumi to ignore future changes to the replica count,
    // allowing a HorizontalPodAutoscaler (HPA) or GitOps tool to manage it.
    ignoreChanges: ["spec.replicas"] 
});
```

By defining clear ownership—Pulumi for infrastructure and complex orchestration, Argo CD/Flux for continuous application delivery—teams can build a resilient, highly automated platform that leverages the strengths of both paradigms.