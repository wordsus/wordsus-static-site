Pulumi’s native providers handle most infrastructure, but what happens when you must manage a proprietary internal API, a niche SaaS tool, or a service lacking an official provider?

Enter **Dynamic Providers**—Pulumi’s native escape hatch. In this chapter, we explore how to author custom resource providers directly within your Node.js or Python programs. You will learn when to deploy them, how to execute the Create, Read, Update, and Delete (CRUD) lifecycle, and how to master state diffing. By the end of this chapter, you will be equipped to bring any addressable API or custom stateful operation securely under Pulumi's management.

## 14.1 When to Use Dynamic Providers

Pulumi’s expansive ecosystem of native providers covers the vast majority of infrastructure needs, from core AWS and Azure resources to Kubernetes orchestration. As you saw in Chapter 13, when you need to combine these existing resources into reusable, higher-level abstractions, `ComponentResources` are the ideal tool. However, a `ComponentResource` is ultimately bound by the capabilities of the underlying resource providers. 

What happens when you need to manage a resource, system, or stateful operation that *no* existing Pulumi provider supports? 

This is where **Dynamic Providers** come into play. A Dynamic Provider is a lightweight, language-specific mechanism that allows you to author a custom resource provider directly within your Pulumi program. Instead of writing a full, standalone provider plugin in Go and publishing it (a process detailed later in Chapter 16), a Dynamic Provider lets you define the exact Create, Read, Update, and Delete (CRUD) operations in the same language you are using to write your infrastructure (typically TypeScript/Node.js or Python).

### The Extensibility Decision Tree

Before reaching for a Dynamic Provider, it is critical to understand where it fits within Pulumi’s extensibility model. The following text-based decision tree illustrates the thought process for selecting the right abstraction:

```text
[Requirement: Provision or Manage 'X']
       |
       v
[Is 'X' supported by an existing Pulumi Provider?]
  |-- YES --> Use the Native Resource (e.g., aws.s3.Bucket)
  |
  |-- NO  --> [Is 'X' a logical grouping of existing Pulumi resources?]
                |
                |-- YES --> Author a ComponentResource (See Chapter 13)
                |
                |-- NO  --> [Does 'X' require multi-language support across teams?]
                              |
                              |-- YES --> Build a standard Pulumi Package (See Chapter 16)
                              |
                              |-- NO  --> 🟢 USE A DYNAMIC PROVIDER
```

### Primary Use Cases

Dynamic Providers are best utilized when you need a rapid, native-language escape hatch to integrate unsupported APIs or systems into the Pulumi state lifecycle. Here are the most common scenarios where Dynamic Providers excel:

#### 1. Managing Internal or Proprietary APIs
Many enterprises maintain homegrown systems that lack public Pulumi providers. For example, your organization might have a custom internal developer portal that requires a specific API call to register a new microservice. By wrapping this API call in a Dynamic Provider, the internal portal registration becomes a first-class citizen in your Pulumi state. If the Pulumi stack is destroyed, the Dynamic Provider will automatically issue the `DELETE` API call to deregister the service.

#### 2. Filling Gaps in Existing Cloud Providers
Cloud providers frequently release new services or features before the corresponding IaC providers can implement them. If you are blocked by a missing feature in the AWS or GCP provider, you can write a temporary Dynamic Provider that uses the cloud provider's official SDK to manage that specific resource. Once the official Pulumi provider is updated, you can migrate the state and retire the dynamic resource.

#### 3. Stateful Orchestration and Side-Effects
Some infrastructure deployments require executing actions that aren't strictly "cloud resources" but still require stateful tracking. Examples include:
* Executing database schema migrations (e.g., running Flyway or Prisma) immediately after provisioning an RDS instance.
* Invalidating a CDN cache or triggering a webhook payload after a static website deployment.
* Generating and securely storing a one-time API key from a third-party SaaS platform.

By modeling these side-effects as Dynamic Providers, Pulumi can track whether the action has already been performed, preventing redundant executions on subsequent `pulumi up` runs unless the inputs change.

#### 4. Managing Niche SaaS Platforms
If you use a specialized SaaS tool (e.g., a specific incident management system or a niche analytics platform) that does not have an official Pulumi or Terraform provider to bridge, a Dynamic Provider allows you to manage its configuration—like alert routing rules or dashboard setups—as code alongside your primary infrastructure.

### When to Avoid Dynamic Providers

While highly flexible, Dynamic Providers are not a silver bullet. You should avoid them under the following conditions:

* **Multi-Language Environments:** Dynamic Providers execute in the language host they are written in. A TypeScript Dynamic Provider cannot be directly consumed by a Python or Go Pulumi program. If you are building platform tooling intended for consumption across multiple languages, you must build a standard Pulumi Package (Chapter 16).
* **High-Performance/Large-Scale Needs:** Because Dynamic Providers serialize their code and execute within the language runtime during the Pulumi engine's diffing phase, they carry a slight performance overhead compared to compiled Go providers. For thousands of resources, a native provider is vastly more efficient.
* **Stateless Operations:** If you only need to run a script every time Pulumi runs without tracking its state or diffing its inputs, `pulumi command` or a simple language-native function invocation is often sufficient and less complex.

### Conceptual Anatomy of a Dynamic Resource

While the specific implementation of the CRUD lifecycle is covered in the next section, it is helpful to understand how a Dynamic Provider is consumed. From the perspective of the infrastructure code, a dynamic resource looks and behaves exactly like any other Pulumi resource.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

// 1. Define the inputs the user will provide
interface CustomSystemArgs {
    endpoint: pulumi.Input<string>;
    apiKey: pulumi.Input<string>;
    settingValue: pulumi.Input<number>;
}

// 2. Define the Resource class that users will instantiate in their stacks
export class CustomSystemResource extends dynamic.Resource {
    public readonly createdId!: pulumi.Output<string>;

    constructor(name: string, args: CustomSystemArgs, opts?: pulumi.CustomResourceOptions) {
        // The core magic: passing a CustomProvider implementation to the superclass
        super(new CustomSystemProvider(), name, args, opts);
    }
}

// Usage in a Pulumi program is seamless:
const myResource = new CustomSystemResource("my-integration", {
    endpoint: "https://api.internal.corp/v1/config",
    apiKey: "secret-token",
    settingValue: 42,
});
```

The heavy lifting happens entirely within the `CustomSystemProvider` object passed to the `super()` call. In the next section, we will break down the `dynamic.Provider` interface and explore how to correctly implement the `create`, `diff`, `update`, and `delete` methods to ensure your custom resources behave predictably within Pulumi's state engine.

## 14.2 The CRUD Lifecycle in Dynamic Providers

To build a Dynamic Provider, you must understand how the Pulumi engine manages state transitions. When you run `pulumi up`, Pulumi doesn't simply execute your code from top to bottom. Instead, it constructs a desired state from your program and compares it against the last known state. 

For standard resources, the native provider plugin handles this reconciliation. For a dynamic resource, you must explicitly define how Pulumi should validate inputs, compare states, and execute the Create, Read, Update, and Delete (CRUD) operations by implementing the `dynamic.Provider` interface.

### The Lifecycle Flow

The following diagram illustrates the sequence of operations Pulumi invokes on your Dynamic Provider during a standard `pulumi up` execution:

```text
+-------------------+       User inputs defined in Pulumi program
| Pulumi Engine     | -------------------------------------------------+
+-------------------+                                                  |
        |                                                              v
        | 1. Validate Inputs                                   +---------------+
        +----------------------------------------------------> |   check()     |
        |                                                      +---------------+
        |                                                              | (Returns sanitized inputs)
        | 2. Compare State (Old vs. New)                               v
        +----------------------------------------------------> +---------------+
        |                                                      |   diff()      |
        |                                                      +---------------+
        |                                                              | (Returns changes & replacement flag)
        v                                                              v
   +----------+                                               [Requires Replacement?]
   | Action?  | <------------------------------------------------------+
   +----------+                                                        |
        |                                                 +------+-----+------+
        |-- (If No Changes) --> [Done]                    | (No)              | (Yes / New Resource)
        |                                                 v                   v
        |-- (If Update) ------------------------> +---------------+   +---------------+
        |                                         |  update()     |   |  create()     |
        |                                         +---------------+   +---------------+
        |-- (If Replace / Delete) --------------------->  |                   |
                                                          |                   v
                                                          |           +---------------+
                                                          +---------> |  delete()     |
                                                                      +---------------+
```

### The `dynamic.Provider` Interface

Implementing a Dynamic Provider requires authoring an object that adheres to the `dynamic.Provider` interface. Let's examine the exact responsibilities of each lifecycle hook.

#### 1. `check(olds, news)`: Validation and Defaults
Before any state comparison happens, Pulumi passes the current inputs (`news`) and the previous state (`olds`) to the `check` method. 
* **Purpose:** Validate user input, enforce constraints, and inject default values. 
* **Returns:** A sanitized dictionary of inputs that will be passed to subsequent methods. If validation fails, you throw an array of detailed failure objects.

#### 2. `diff(id, olds, news)`: Detecting Changes
If `check` succeeds, Pulumi calls `diff` to understand *what* changed and *how* to handle it.
* **Purpose:** Compare the old state with the new sanitized inputs. You must determine if a change occurred and whether that change requires destroying the old resource and creating a new one (a replacement), or if it can be updated in place.
* **Returns:** A `DiffResult` object containing `changes` (a boolean) and `replaces` (an array of property names that triggered a replacement).

#### 3. `create(inputs)`: Provisioning
This is the heart of the provider. If `diff` indicates a new resource is needed (or if it's the very first deployment), `create` is called.
* **Purpose:** Make the API calls or execute the scripts necessary to bring the resource into existence.
* **Returns:** A `CreateResult` containing a unique `id` for the newly created resource and the `outs` (the final state of the resource, which will be saved in the Pulumi state file). **Crucially, the ID must be unique and persistent**, as Pulumi uses it to track the resource across subsequent runs.

#### 4. `update(id, olds, news)`: In-Place Modification
If `diff` returns `changes: true` but `replaces: []` (meaning no replacement is necessary), Pulumi calls `update` instead of `create`.
* **Purpose:** Call the underlying API's update or patch method.
* **Returns:** An `UpdateResult` containing the updated `outs`.

#### 5. `delete(id, props)`: Teardown
When a resource is removed from your Pulumi program, or when a replacement is triggered (create-before-replace or replace-before-create), `delete` is invoked.
* **Purpose:** Gracefully destroy the resource in the backend system using the provided `id`.
* **Returns:** Nothing. If the operation fails, throwing an error will halt the deletion and keep the resource in the state file.

#### 6. `read(id, props)`: State Refresh (Optional but Recommended)
Invoked when a user runs `pulumi refresh` or when a resource is imported.
* **Purpose:** Fetch the absolute truth from the external system to synchronize Pulumi's state file with reality.
* **Returns:** A `ReadResult` containing the updated `id` and `props`.

### A Skeleton Implementation

Below is a complete skeleton of a Dynamic Provider in TypeScript, demonstrating the exact type signatures and expected return shapes for the CRUD lifecycle.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

export class CustomSystemProvider implements dynamic.Provider {
    
    // 1. Validate and set defaults
    public async check(olds: any, news: any): Promise<dynamic.CheckResult> {
        const failures: dynamic.CheckFailure[] = [];
        
        if (!news.endpoint) {
            failures.push({ property: "endpoint", reason: "endpoint is required." });
        }
        
        // Return sanitized inputs, injecting a default if necessary
        return { 
            inputs: { 
                ...news, 
                settingValue: news.settingValue ?? 100 // default value 
            }, 
            failures 
        };
    }

    // 2. Determine changes and replacements
    public async diff(id: string, olds: any, news: any): Promise<dynamic.DiffResult> {
        const replaces: string[] = [];
        let changes = false;

        // If the endpoint changes, we must replace the resource entirely
        if (olds.endpoint !== news.endpoint) {
            changes = true;
            replaces.push("endpoint");
        }

        // If the setting changes, we can update it in-place
        if (olds.settingValue !== news.settingValue) {
            changes = true;
        }

        return {
            changes: changes,
            replaces: replaces,
            deleteBeforeReplace: false, // Optional: Force delete before create
        };
    }

    // 3. Provision the resource
    public async create(inputs: any): Promise<dynamic.CreateResult> {
        // [Execute API calls to external system here]
        // const response = await myCustomApiClient.create(inputs);
        
        // Generate or retrieve the unique identifier
        const resourceId = `custom-res-${Math.random().toString(36).substring(2, 9)}`;

        return {
            id: resourceId,
            // The 'outs' will become the resource's state and output properties
            outs: { ...inputs, createdId: resourceId },
        };
    }

    // 4. Update the resource in-place
    public async update(id: string, olds: any, news: any): Promise<dynamic.UpdateResult> {
        // [Execute API calls to update the external system]
        // await myCustomApiClient.update(id, news);

        return {
            outs: { ...news, createdId: id },
        };
    }

    // 5. Destroy the resource
    public async delete(id: string, props: any): Promise<void> {
        // [Execute API calls to delete the external system]
        // await myCustomApiClient.delete(id);
        console.log(`Resource ${id} successfully deleted.`);
    }
}
```

### Critical Gotchas in the Lifecycle

When implementing the lifecycle methods, keep these constraints in mind:

* **Serialization Context:** The code inside your provider methods (`create`, `update`, etc.) is serialized, shipped to the Pulumi engine, and executed in an isolated context during the diff/apply phase. This means you cannot rely on global variables or closures captured from the surrounding Pulumi program. Any dependencies (like API clients or helper functions) must be explicitly imported inside the provider methods or carefully structured to survive serialization.
* **Idempotency:** Your `delete` method should ideally be idempotent. If Pulumi attempts to delete a resource that has already been deleted manually outside of Pulumi, your provider should catch the "Not Found" error and return successfully, rather than throwing a fatal error and locking the state.
* **Secrets Handling:** If your inputs contain secrets, they will arrive as plain text within the `check`, `diff`, `create`, and `update` methods. You must ensure you do not inadvertently log these values to the console. Pulumi will handle re-encrypting them when saving them back to the state file as `outs`.

## 14.3 Implementing a Custom Resource Provider in Node.js/Python

With a solid grasp of the CRUD lifecycle and the `dynamic.Provider` interface from the previous section, it is time to write functional code. While the conceptual model is identical across languages, the specific syntax and standard libraries used for implementation vary between Node.js (TypeScript) and Python.

In this section, we will build a practical Dynamic Provider in both languages. Our objective is to manage a **Custom Webhook Registration** against a hypothetical internal developer platform API. 

The lifecycle requires us to:
1. `create`: Issue a POST request to register the webhook and save the returned ID.
2. `update`: Issue a PUT request if the webhook URL or secret changes.
3. `delete`: Issue a DELETE request to remove the webhook.
4. `diff`: Determine if changes require an in-place update or a full replacement.

### The TypeScript / Node.js Implementation

In Node.js, we utilize the `@pulumi/pulumi/dynamic` module. When building Dynamic Providers in TypeScript, it is highly recommended to explicitly define interfaces for your Resource Inputs (what the user types) and Provider Inputs (what the provider receives after Pulumi processes outputs).

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";
import axios from "axios"; // External libraries must be carefully managed

// 1. Define the inputs expected from the user
export interface WebhookArgs {
    targetUrl: pulumi.Input<string>;
    events: pulumi.Input<string[]>;
    secretToken: pulumi.Input<string>;
}

// 2. Define the Provider implementation
class WebhookProvider implements dynamic.Provider {
    private apiUrl = "https://api.internal.corp/v1/webhooks";

    public async check(olds: any, news: any): Promise<dynamic.CheckResult> {
        const failures = [];
        if (!news.targetUrl.startsWith("https://")) {
            failures.push({ property: "targetUrl", reason: "URL must be HTTPS." });
        }
        return { inputs: news, failures };
    }

    public async diff(id: string, olds: any, news: any): Promise<dynamic.DiffResult> {
        let changes = false;
        // If the URL changes, we require a full replacement (destroy and recreate)
        const replaces: string[] = [];

        if (olds.targetUrl !== news.targetUrl) {
            changes = true;
            replaces.push("targetUrl");
        }
        if (JSON.stringify(olds.events) !== JSON.stringify(news.events) || 
            olds.secretToken !== news.secretToken) {
            changes = true;
        }

        return { changes, replaces };
    }

    public async create(inputs: any): Promise<dynamic.CreateResult> {
        const response = await axios.post(this.apiUrl, {
            url: inputs.targetUrl,
            events: inputs.events,
            secret: inputs.secretToken
        });

        // The API returns a unique 'id' for the webhook
        return { id: response.data.id, outs: inputs };
    }

    public async update(id: string, olds: any, news: any): Promise<dynamic.UpdateResult> {
        await axios.put(`${this.apiUrl}/${id}`, {
            events: news.events,
            secret: news.secretToken
        });
        return { outs: news };
    }

    public async delete(id: string, props: any): Promise<void> {
        try {
            await axios.delete(`${this.apiUrl}/${id}`);
        } catch (error: any) {
            // Ignore 404s to ensure idempotency during teardown
            if (error.response?.status !== 404) throw error;
        }
    }
}

// 3. Define the custom Resource class
export class Webhook extends dynamic.Resource {
    public readonly targetUrl!: pulumi.Output<string>;
    public readonly events!: pulumi.Output<string[]>;
    // Notice we do not expose the secretToken as an output for security

    constructor(name: string, args: WebhookArgs, opts?: pulumi.CustomResourceOptions) {
        super(new WebhookProvider(), name, args, opts);
    }
}
```

#### A Note on Node.js Dependencies
In the example above, we imported `axios`. During execution, Pulumi serializes the `WebhookProvider` class to run it within the engine. Pulumi attempts to automatically capture closures and dependencies, but complex external C-bindings or deeply nested module trees can occasionally fail serialization. For maximum reliability, use standard Node.js built-ins (like `https` or the global `fetch` in Node 18+) inside your provider methods, or ensure your dependencies are strictly pure JavaScript.

### The Python Implementation

The Python model mirrors TypeScript but utilizes the `pulumi.dynamic` module. Python's object-oriented nature makes defining the provider straightforward, but type hinting requires a bit more verbosity to ensure Pulumi correctly infers inputs and outputs.

```python
import pulumi
from pulumi.dynamic import Resource, ResourceProvider, CreateResult, UpdateResult, DiffResult
import requests

# 1. Define the Provider implementation
class WebhookProvider(ResourceProvider):
    def __init__(self):
        self.api_url = "https://api.internal.corp/v1/webhooks"

    def check(self, _olds, news):
        failures = []
        if not news.get("target_url", "").startswith("https://"):
            failures.append({"property": "target_url", "reason": "URL must be HTTPS."})
        return {"inputs": news, "failures": failures}

    def diff(self, _id, olds, news):
        changes = False
        replaces = []

        if olds.get("target_url") != news.get("target_url"):
            changes = True
            replaces.append("target_url")
            
        if (olds.get("events") != news.get("events") or 
            olds.get("secret_token") != news.get("secret_token")):
            changes = True

        return DiffResult(changes=changes, replaces=replaces)

    def create(self, props):
        response = requests.post(self.api_url, json={
            "url": props["target_url"],
            "events": props["events"],
            "secret": props["secret_token"]
        })
        response.raise_for_status()
        
        # Return the generated ID and the state to be saved
        webhook_id = response.json().get("id")
        return CreateResult(id=webhook_id, outs=props)

    def update(self, id, _olds, news):
        response = requests.put(f"{self.api_url}/{id}", json={
            "events": news["events"],
            "secret": news["secret_token"]
        })
        response.raise_for_status()
        return UpdateResult(outs=news)

    def delete(self, id, _props):
        response = requests.delete(f"{self.api_url}/{id}")
        # Ignore 404s for idempotency
        if response.status_code != 404:
            response.raise_for_status()

# 2. Define the custom Resource class
class Webhook(Resource):
    target_url: pulumi.Output[str]
    events: pulumi.Output[list]

    def __init__(self, name: str, target_url: pulumi.Input[str], events: pulumi.Input[list], secret_token: pulumi.Input[str], opts: pulumi.ResourceOptions = None):
        super().__init__(
            WebhookProvider(), 
            name, 
            {
                "target_url": target_url,
                "events": events,
                "secret_token": secret_token,
            }, 
            opts
        )
```

### Managing Secrets in Dynamic Providers

A critical difference between Native Providers and Dynamic Providers is how you handle sensitive data. In a standard provider like AWS, passing an `Output<string>` marked as a secret to a database password field is handled securely by the engine; the provider plugin never leaks it.

In Dynamic Providers, because the state (`outs`) is returned as a plain dictionary from your `create` and `update` methods, you must be careful not to accidentally strip the "secretness" from the data. 

To ensure a property remains encrypted in the state file:
1. The user must pass it as a secret (e.g., `pulumi.secret("my-token")`).
2. Inside your dynamic resource class, do *not* declare a public `pulumi.Output` property for that secret field unless absolutely necessary.
3. If you must expose the secret as an output, ensure you wrap it using `pulumi.secret()` inside the provider's `create` and `update` returns, or utilize Pulumi's `additionalSecretOutputs` resource option to explicitly instruct the engine to encrypt specific keys in the `outs` dictionary.

## 14.4 Handling State and Diffing in Dynamic Providers

The most common source of bugs in Dynamic Providers does not stem from the API calls in `create` or `delete`, but rather from incorrect logic within the `diff` method or improper state returned in `outs`. The `diff` method is the brain of your provider; it dictates the exact transition path from the current state to the desired state. If you get this wrong, Pulumi may unnecessarily destroy and recreate resources, or worse, silently ignore changes to your infrastructure code.

### The Mechanics of `olds` and `news`

During the preview phase (`pulumi up`), Pulumi passes two objects to your `diff` method:
* **`olds`**: The current state of the resource, exactly as it was returned in the `outs` dictionary during the last successful `create` or `update` operation. 
* **`news`**: The desired state of the resource, which consists of the sanitized inputs returned by your `check` method.

Your primary job in the `diff` method is to compare these two objects and return a `DiffResult`.

#### The `DiffResult` Object

The `DiffResult` tells the Pulumi engine what action to take. It contains three critical properties:

1.  **`changes` (boolean):** Set this to `true` if *any* meaningful property has changed between `olds` and `news`. If this is `false`, Pulumi will take no action and report that the resource is up to date.
2.  **`replaces` (array of strings):** If changes exist, can the underlying system apply them in place (e.g., via a `PUT` or `PATCH` request)? If not, you must list the names of the properties that force a replacement. If this array is populated, Pulumi will destroy the old resource and create a new one.
3.  **`deleteBeforeReplace` (boolean):** By default, Pulumi attempts a "Create-Before-Replace" strategy to minimize downtime. It creates the new resource, and if successful, deletes the old one. However, if the resource relies on a globally unique identifier (like a specific hostname or a singleton database table name), creating the new one first will fail. Setting this to `true` forces Pulumi to delete the old resource *before* provisioning the new one.

### A Complex Diffing Example

Consider a hypothetical dynamic resource that manages an API Gateway Route. Changing the route's `description` or `timeout` can be done in-place, but changing the actual `path` or `httpMethod` requires destroying the old route and creating a new one.

```typescript
public async diff(id: string, olds: any, news: any): Promise<dynamic.DiffResult> {
    const replaces: string[] = [];
    let changes = false;

    // 1. Check properties that force a replacement
    if (olds.path !== news.path) {
        changes = true;
        replaces.push("path");
    }
    if (olds.httpMethod !== news.httpMethod) {
        changes = true;
        replaces.push("httpMethod");
    }

    // 2. Check properties that can be updated in place
    if (olds.description !== news.description || olds.timeout !== news.timeout) {
        changes = true;
    }

    // 3. Evaluate replacement strategy
    // If the path changes, we cannot have two routes with the same path at the 
    // same time on the gateway, so we must delete the old one first.
    const requiresDeleteFirst = replaces.includes("path");

    return {
        changes: changes,
        replaces: replaces,
        deleteBeforeReplace: requiresDeleteFirst,
    };
}
```

### State Management: The Golden Rule of `outs`

When your `create` or `update` methods execute successfully, they must return an `outs` dictionary. **The Golden Rule of State is that whatever you return in `outs` becomes the `olds` for the very next Pulumi run.**

A common mistake is failing to merge the new inputs into the outputs during an update. If your `update` method only returns the specific property that was changed, all other properties will be wiped from the Pulumi state file, causing chaotic diffs on the subsequent run.

```text
// Incorrect State Handling flow

Run 1 (Create):
Inputs: { a: 1, b: 2 }  --> create() --> Returns outs: { a: 1, b: 2 } 
State File: { a: 1, b: 2 }

Run 2 (Update 'b' to 3):
olds: { a: 1, b: 2 }, news: { a: 1, b: 3 }
--> diff() says update is needed.
--> update() executes, but INCORRECTLY returns outs: { b: 3 }
State File: { b: 3 }  <-- 'a' is now missing from state!

Run 3 (No code changes):
olds: { b: 3 }, news: { a: 1, b: 3 }
--> diff() sees 'a' is missing from olds, assumes it was added!
--> False diff triggered.
```

To prevent this, your `update` and `create` methods should generally return the full `news` object, augmented with any computed values (like generated IDs or timestamps) returned by the external API.

```typescript
public async update(id: string, olds: any, news: any): Promise<dynamic.UpdateResult> {
    await externalApi.updateResource(id, news);
    
    // ALWAYS return the full 'news' object to preserve the complete state
    return {
        outs: { 
            ...news, 
            lastUpdated: new Date().toISOString() 
        }
    };
}
```

### Drift Detection with the `read` Method

Infrastructure drift occurs when a resource managed by Pulumi is modified directly via a web console, a script, or another process outside of Pulumi. Standard Pulumi providers handle this gracefully during `pulumi refresh`, but for Dynamic Providers, you must implement the optional `read` method to detect drift.

If you omit the `read` method, Pulumi assumes the state file is always perfectly accurate. By implementing it, you allow Pulumi to query the external system, synchronize the state file, and then accurately calculate diffs during the next `pulumi up`.

The `read` method receives the resource `id` and the current state (`props`). It must query the external API and return the actual, current properties.

```typescript
public async read(id: string, props: any): Promise<dynamic.ReadResult> {
    try {
        // Query the external system using the tracked ID
        const actualResource = await externalApi.getResource(id);

        // Map the external API response back to your Pulumi property names
        return {
            id: id,
            props: {
                path: actualResource.route_path,
                httpMethod: actualResource.method,
                description: actualResource.desc,
                timeout: actualResource.timeout_ms,
            }
        };
    } catch (error: any) {
        // If the resource was deleted outside of Pulumi, catching a 404
        // and returning an empty object tells Pulumi to drop it from state.
        if (error.response?.status === 404) {
            return {};
        }
        throw error;
    }
}
```

By combining a rigorous `diff` implementation, careful state preservation in `outs`, and an accurate `read` method for drift detection, your Dynamic Providers will achieve the same level of reliability and predictability as Pulumi's native cloud providers.