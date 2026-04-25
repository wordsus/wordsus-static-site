Treating infrastructure as code demands adopting core software engineering disciplines—chiefly, automated testing. In this chapter, we move beyond basic deployment to rigorously verifying your infrastructure's behavior and security posture before it ever reaches production. 

We will explore how to build a robust testing pyramid for your Pulumi projects. This begins with lightning-fast unit tests and mocking techniques to validate configurations entirely offline. We will then introduce property-based testing to aggressively fuzz your abstractions, and conclude with integration testing using ephemeral environments to validate live cloud deployments.

## 17.1 Unit Testing Pulumi Programs

Unit testing in software engineering isolates individual functions, classes, or components to verify their internal logic. When applied to Infrastructure as Code (IaC) via Pulumi, unit testing allows you to validate the configuration of your infrastructure *without* communicating with a cloud provider or deploying actual resources. 

By executing milliseconds after code is committed, unit tests form the first line of defense in your CI/CD pipeline. They are ideal for enforcing naming conventions, verifying mandatory tagging requirements, checking routing logic, and ensuring that specific security configurations (like preventing public block access on S3 buckets) are statically declared in your code before a `pulumi preview` is ever run.

### The Unit Testing Execution Model

A standard Pulumi deployment involves your code defining resources, the Pulumi language host serializing those requests, and the Pulumi engine communicating with cloud providers to provision them. In a unit test, this lifecycle is deliberately short-circuited. 

Your tests run entirely offline. The standard testing framework of your chosen language (e.g., Mocha or Jest for Node.js, `pytest` for Python, or the `testing` package in Go) executes the Pulumi program. When your code attempts to create a resource, a mocked Pulumi runtime intercepts the request, bypasses the cloud provider completely, and immediately returns dummy data.

```text
+--------------------+       +----------------------+       +--------------------+
|   Test Runner      | ----> |  Pulumi User Code    | ----> |  Pulumi Runtime    |
| (Mocha, Pytest, Go)|       | (new aws.s3.Bucket)  |       | (Intercepts Call)  |
+--------------------+       +----------------------+       +--------------------+
          ^                                                           |
          |                   +----------------------+                |
          +------------------ |  Assertion Check     | <--------------+
            (Pass/Fail)       | (e.g., tags exist?)  |     (Returns Mock Data)
                              +----------------------+
```

### Navigating Asynchronous Outputs

The most significant technical hurdle when unit testing Pulumi programs is dealing with `Output<T>` types. Because Pulumi is designed to resolve resource properties asynchronously during the engine's execution phase, standard assertions will fail if you attempt to inspect properties directly.

For example, `bucket.bucketName` does not hold a string; it holds an `Output<string>`. To evaluate the inner value during a test, you must extract it asynchronously using the `.apply()` method.

To make tests more readable, developers often create a helper function to convert Pulumi `Output<T>` objects into standard language promises or awaitables. 

Here is an example in TypeScript of a common helper function used throughout Pulumi unit tests:

```typescript
import * as pulumi from "@pulumi/pulumi";

// Helper to resolve an Output<T> into a Promise<T> for testing
export function promise<T>(output: pulumi.Output<T>): Promise<T | undefined> {
    return new Promise((resolve) => {
        output.apply(value => resolve(value));
    });
}
```

### Structuring a Pulumi Unit Test

Because Pulumi integrates with standard testing tools, your test files will look identical to standard application unit tests. The structure generally follows the Arrange-Act-Assert (AAA) pattern:

1. **Arrange:** Set up the mocked Pulumi runtime (covered in depth in Section 17.2) to simulate the environment.
2. **Act:** Instantiate the specific resource or `ComponentResource` you want to test.
3. **Assert:** Resolve the `Output` properties of the resource and use your framework's assertion library to validate the configuration.

Below is a complete TypeScript example using Mocha and Chai. This test verifies that an internal `SecureBucket` component automatically applies a mandatory `Environment` tag and enables versioning.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { expect } from "chai";
import { promise } from "./testHelpers"; // The promise helper defined above

// 1. Arrange: Define a basic mock environment
pulumi.runtime.setMocks({
    newResource: (args: pulumi.runtime.MockResourceArgs): { id: string, state: any } => {
        return {
            id: args.inputs.name + "-id",
            state: args.inputs,
        };
    },
    call: (args: pulumi.runtime.MockCallArgs) => {
        return args.inputs;
    },
});

describe("SecureBucket Component", function() {
    let bucket: aws.s3.Bucket;

    before(async function() {
        // 2. Act: Instantiate the resource within the mocked context
        bucket = new aws.s3.Bucket("my-secure-bucket", {
            acl: "private",
            versioning: {
                enabled: true,
            },
            tags: {
                Environment: "Production",
                Team: "Platform",
            }
        });
    });

    // 3. Assert: Verify the expected properties
    it("must have versioning enabled", async function() {
        const versioning = await promise(bucket.versioning);
        expect(versioning).to.not.be.undefined;
        expect(versioning?.enabled).to.be.true;
    });

    it("must be tagged with an Environment tag", async function() {
        const tags = await promise(bucket.tags);
        expect(tags).to.not.be.undefined;
        expect(tags).to.have.property("Environment");
    });

    it("must not be publicly readable", async function() {
        const acl = await promise(bucket.acl);
        expect(acl).to.equal("private");
    });
});
```

### Unit Testing ComponentResources vs. Raw Resources

While you can unit test raw cloud provider resources (like `aws.s3.Bucket` in the example above), unit testing yields the highest return on investment when applied to your custom `ComponentResource` abstractions (discussed in Chapter 13). 

Testing raw resources often devolves into simply repeating the parameters you passed to the constructor. However, when testing a `ComponentResource`, you are validating the *internal logic* of that component: defaults that are applied automatically, conditional resource creation based on inputs, and naming conventions enforced by the component's internal code. 

By isolating these tests locally without touching the network, you ensure that your organization's internal infrastructure components behave predictably and securely before they are ever published to an internal registry or utilized by application teams.

## 17.2 Mocking Resources and Provider Calls

In the previous section, we established the fundamental execution model of a Pulumi unit test: running your infrastructure code entirely offline. However, to execute successfully without a cloud provider, the Pulumi language runtime requires an instruction set on how to behave when it encounters a request to provision a resource or fetch remote data. This is achieved through **mocking**.

Mocking in Pulumi intercepts the Remote Procedure Calls (RPCs) that the language host normally sends to the Pulumi engine. Instead of bridging out to the network, the runtime redirects these calls to a local mock object that you define, instantly returning simulated data.

### The Anatomy of Pulumi Mocks

To enable mocking, you must use the `pulumi.runtime.setMocks()` API before any of your infrastructure code is evaluated. This API expects an object that implements two distinct mocking interfaces:

1.  **`newResource`**: Intercepts requests to create, read, update, or delete infrastructure *resources* (e.g., `new aws.s3.Bucket`, `new azure.compute.VirtualMachine`).
2.  **`call`**: Intercepts requests to execute *provider functions* or data sources, which are typically used to query existing cloud state (e.g., `aws.ec2.getAmi`, `aws.iam.getPolicyDocument`).

```text
======================= The Pulumi Mocking Interception Flow =======================

[ User Code ]
      |
      | 1. new aws.ec2.Instance(...)
      v
[ Pulumi Language Host ] 
      |
      | 2. Intercepted by runtime! 
      v
+---------------------------------------------------+
| pulumi.runtime.setMocks({ ... })                  |
|                                                   |
|  newResource() <--- Routes resource creations     |
|  call()        <--- Routes data source lookups    |
+---------------------------------------------------+
      |
      | 3. Returns { id: "i-12345", state: { ... } }
      v
[ User Code continues executing offline ]

====================================================================================
```

### Implementing the `newResource` Mock

When your Pulumi program instantiates a resource, the `newResource` function is invoked. It is passed a `MockResourceArgs` object containing:
* `type`: The Pulumi resource type token (e.g., `"aws:s3/bucket:Bucket"`).
* `name`: The logical name provided in the constructor.
* `inputs`: The arguments passed into the resource by the user.
* `provider`: The specific provider instance being used (if any).
* `id`: The physical ID, if this is an import or a read operation.

Your mock must return an object containing an `id` (a mock physical identifier for the resource) and `state` (the properties of the resource).

**Handling Provider-Computed Values:**
A common pitfall in unit testing is forgetting that some resource properties are *computed by the provider* and are not part of the initial `inputs`. For example, when you create an AWS SNS Topic, you provide a name, but AWS generates the ARN. In your test, if your code expects `topic.arn` to exist, your mock must synthesize it.

```typescript
import * as pulumi from "@pulumi/pulumi";

class InfrastructureMocks implements pulumi.runtime.Mocks {
    public newResource(args: pulumi.runtime.MockResourceArgs): { id: string, state: any } {
        // Start with the inputs provided by the user code
        const state = { ...args.inputs };

        // Synthesize provider-computed values based on resource type
        switch (args.type) {
            case "aws:s3/bucket:Bucket":
                // AWS S3 buckets automatically compute an ARN based on the bucket name
                state.arn = `arn:aws:s3:::${args.inputs.bucket || args.name}`;
                break;
            case "aws:iam/role:Role":
                // Simulate an IAM Role ARN
                state.arn = `arn:aws:iam::123456789012:role/${args.name}`;
                break;
        }

        // Return a mock physical ID and the augmented state
        return {
            id: `${args.name}-mock-id`,
            state: state,
        };
    }

    public call(args: pulumi.runtime.MockCallArgs) {
        return args.inputs;
    }
}
```

### Implementing the `call` Mock

While `newResource` handles infrastructure creation, `call` handles data retrieval. In Pulumi, data sources (often invoked via `.get()` functions or `get...` functions) query the cloud provider for existing information. Because your test runs offline, these queries will fail or hang indefinitely if not mocked.

The `call` function receives a `MockCallArgs` object, containing the `token` of the function being called (e.g., `"aws:ec2/getAmi:getAmi"`) and the `inputs` passed to the function.

Consider a scenario where your code looks up the latest Amazon Linux 2 AMI to provision an EC2 instance. You must intercept that specific call and return a dummy AMI ID.

```typescript
class InfrastructureMocks implements pulumi.runtime.Mocks {
    // ... newResource implementation ...

    public call(args: pulumi.runtime.MockCallArgs): any {
        switch (args.token) {
            case "aws:ec2/getAmi:getAmi":
                // When the code asks for an AMI, return a hardcoded dummy ID
                return {
                    id: "ami-0abcdef1234567890",
                    architecture: "x86_64",
                    name: "amzn2-ami-hvm-2.0-x86_64-gp2",
                };
            case "aws:iam/getPolicyDocument:getPolicyDocument":
                // Often, policy documents just return their JSON representation
                return {
                    json: JSON.stringify(args.inputs),
                };
            default:
                // For unhandled calls, just reflect the inputs back
                return args.inputs;
        }
    }
}
```

### Applying Mocks in Test Suites

To utilize these mocks, you apply them in the setup phase of your testing framework (e.g., `before` or `beforeEach` in Mocha/Jest). It is critical to set the mocks *before* importing the module that contains your Pulumi infrastructure code; otherwise, the Pulumi runtime will attempt to connect to the engine during the module instantiation.

```typescript
import * as pulumi from "@pulumi/pulumi";
import { expect } from "chai";

// 1. Apply Mocks globally BEFORE importing the infrastructure
pulumi.runtime.setMocks(new InfrastructureMocks());

// 2. Import infrastructure only AFTER mocks are set
import { WebServer } from "../src/webServerComponent"; 

describe("WebServer Component", function() {
    it("should use the standardized AMI", async function() {
        const server = new WebServer("test-server", { instanceType: "t3.micro" });
        
        // Use a helper to resolve the Output (as detailed in 17.1)
        const amiId = await promise(server.instance.ami);
        
        // Assert that the mocked AMI ID was correctly utilized
        expect(amiId).to.equal("ami-0abcdef1234567890");
    });
});
```

### Advanced Mocking Techniques

* **Error Simulation:** Mocks are not only for "happy paths." You can configure your `newResource` mock to throw specific errors when given invalid configurations (e.g., an EC2 instance type that your organization forbids). This allows you to test your program's error handling and validation logic.
* **Fixture Data:** For complex `call` mocks (like querying complex Kubernetes cluster states or intricate networking setups), storing the mock return values in external JSON files (fixtures) keeps your mock classes clean and easier to maintain.
* **Project and Stack Variables:** During unit testing, calls to `pulumi.getProject()` and `pulumi.getStack()` will return standard values (usually `"project"` and `"stack"`). If your code relies on specific stack names (like `"prod"`), you should set the `PULUMI_NODEJS_PROJECT` and `PULUMI_NODEJS_STACK` environment variables before running the test suite to simulate that environment.

## 17.3 Property-Based Testing

While standard unit testing (often called *example-based testing*) is excellent for verifying known scenarios, it inherently suffers from the limits of the author's imagination. You write tests for the "happy path" and a few known edge cases, but what happens when an infrastructure module receives an unexpectedly long string, an unusual combination of tags, or a negative number for a desired instance count?

**Property-based testing** addresses this by shifting the focus from specific examples to universal rules (properties) that must *always* hold true for a given piece of code, regardless of the input. Instead of hardcoding test inputs, you define the constraints of valid data, and a testing framework generates hundreds or thousands of random variations (fuzzing) to aggressively exercise your infrastructure logic.

Because Pulumi leverages general-purpose programming languages, you can directly integrate established property-based testing libraries into your IaC workflows, such as `fast-check` for TypeScript/Node.js, `hypothesis` for Python, or `testing/quick` for Go.

### The Mechanism of Property-Based IaC Testing

In the context of Pulumi, property-based testing is always combined with the mocking techniques discussed in Section 17.2. You do not want to spin up hundreds of actual cloud resources. Instead, you rapidly instantiate your custom `ComponentResource` classes offline using randomized inputs, and then assert that the resulting configuration satisfies your invariants.

```text
+-----------------------+      Generates randomized inputs      +------------------------+
|  Property Framework   | ------------------------------------> | Pulumi Component Code  |
| (fast-check, etc.)    |       (e.g., random bucket names,     | (Runs against Mocks)   |
+-----------------------+        arbitrary nested tags)         +------------------------+
            ^                                                               |
            |                                                               |
            +---------------------------------------------------------------+
                 Asserts invariants (e.g., "Name never exceeds 63 chars", 
                                     "Public access block is always true")
```

### Identifying Invariants in Infrastructure

Before writing a property-based test, you must identify the invariants—the unshakeable truths about your infrastructure component. Common IaC invariants include:

* **Naming Conventions:** "No matter the input string, the resulting resource name will be sanitized, lowercase, and never exceed the cloud provider's character limit."
* **Security Baselines:** "Regardless of the environment type passed to the component, the storage resource's encryption-at-rest is always enabled."
* **Mathematical Constraints:** "For any requested auto-scaling capacity, the configured `minSize` is never greater than the `maxSize`, and `desiredCapacity` always falls between them."
* **Tagging Compliance:** "Any arbitrary dictionary of tags passed by the user will be successfully merged with the mandatory corporate billing tags."

### Implementing a Property-Based Test

Consider an organization that provides a custom `StandardVpc` component. To comply with internal standards, the VPC must dynamically allocate subnets based on a provided CIDR block, but it must *never* create more subnets than there are Availability Zones, and the generated names must conform to a strict format.

Below is an example using TypeScript, Mocha, and the `fast-check` library. We use the `promise` helper from Section 17.1 to resolve the Pulumi outputs.

```typescript
import * as fc from "fast-check";
import * as pulumi from "@pulumi/pulumi";
import { expect } from "chai";
import { promise } from "./testHelpers";
import { StandardVpc } from "../src/network"; // Our custom component

// Note: Ensure pulumi.runtime.setMocks() is called before this block!

describe("StandardVpc Property Tests", function() {
    it("should never generate subnet names exceeding 255 characters", async function() {
        // Use fast-check to assert a property
        await fc.assert(
            fc.asyncProperty(
                // 1. Generate random, potentially highly unusual, string inputs
                fc.string(), 
                fc.integer({ min: 1, max: 5 }), // Random number of subnets
                
                async (randomVpcName, subnetCount) => {
                    // 2. Act: Instantiate the component with the fuzzed data
                    const vpc = new StandardVpc(`vpc-${randomVpcName}`, {
                        baseName: randomVpcName,
                        subnetCount: subnetCount,
                    });

                    // 3. Extract the outputs
                    const subnets = await promise(vpc.publicSubnets);
                    
                    // 4. Assert the invariant property
                    for (const subnet of subnets || []) {
                        const subnetName = await promise(subnet.tags.apply(t => t["Name"]));
                        
                        // The property: Name must exist, and be <= 255 chars
                        expect(subnetName).to.not.be.undefined;
                        expect(subnetName!.length).to.be.at.most(255);
                    }
                }
            ),
            { numRuns: 100 } // Run this test 100 times with different random data
        );
    });

    it("should gracefully reject invalid CIDR blocks without throwing unhandled exceptions", async function() {
        await fc.assert(
            fc.asyncProperty(
                // Generate completely random strings (not valid CIDRs)
                fc.string({ minLength: 1 }), 
                
                async (invalidCidr) => {
                    try {
                        new StandardVpc("test-vpc", {
                            cidrBlock: invalidCidr,
                            subnetCount: 2,
                        });
                        // If it doesn't throw, the test should fail
                        expect.fail("Expected component to throw a validation error");
                    } catch (error: any) {
                        // The property: The error MUST be a handled validation error
                        expect(error.message).to.include("Invalid CIDR format");
                    }
                }
            )
        );
    });
});
```

### The Value of Shrinking

A major advantage of using dedicated property-based testing libraries like `fast-check` or `hypothesis` is a feature called **shrinking**. 

If a test fails during a run of 100 random inputs, the framework does not simply dump a massive, unreadable randomized string (e.g., `"&(*#HDKJ@hd8923idjk..."`) into your console. Instead, it attempts to "shrink" the failing input. It systematically reduces the complexity of the input that caused the failure until it finds the absolute minimal, simplest input that triggers the same bug (e.g., discovering that the failure happens specifically when the string contains a single hyphen `"-"`). 

This drastically reduces the time spent debugging complex infrastructure logic, ensuring that your core organizational abstractions are hardened against misuse before they are ever deployed to a production environment.

## 17.4 Integration Testing with Ephemeral Environments

While unit and property-based tests are incredibly fast and cost nothing to run, they share a fundamental limitation: they rely entirely on the accuracy of your mocks. They cannot verify if an AWS IAM policy actually grants the correct permissions, if an Azure naming constraint will reject your generated string, or if a GCP API is experiencing eventual consistency delays. 

To prove that your infrastructure code truly works, you must deploy it to a real cloud provider. **Integration testing** in Pulumi involves programmatically creating a temporary, isolated instance of your infrastructure, running assertions against the live environment, and then immediately destroying it. Because these environments live only for the duration of the test, they are referred to as **ephemeral environments**.

### The Ephemeral Testing Lifecycle

An integration test treats your entire Pulumi program as a black box. Instead of evaluating individual resources, the test orchestrates the Pulumi CLI directly (or via an API) to manage a full deployment lifecycle.

```text
=================== The Ephemeral Integration Test Flow ===================

[ Start Test Suite ]
        |
        v
1. Initialization: Generate a highly randomized stack name 
                   (e.g., `ci-test-web-7f8a9b`) to prevent collisions.
        |
        v
2. Provisioning:   Execute the equivalent of `pulumi up --yes`.
                   Wait for the cloud provider to provision resources.
        |
        v
3. Validation:     Extract Pulumi Stack Outputs (e.g., IPs, URLs).
                   Run live tests against the infrastructure:
                     - Make an HTTP GET request to the load balancer.
                     - Attempt an SQL connection to the test database.
                     - Assert that an S3 bucket rejects public reads.
        |
        v
4. Teardown:       Execute the equivalent of `pulumi destroy --yes`.
                   (Crucial: This must run even if Validation fails).
        |
        v
[ Report Pass/Fail to CI/CD ]

===========================================================================
```

### The Pulumi Integration Testing Framework

While you could theoretically write bash scripts to orchestrate this lifecycle, Pulumi provides a robust, native framework for integration testing. Interestingly, the standard tool for this across the ecosystem is Pulumi’s Go package (`github.com/pulumi/pulumi/pkg/v3/testing/integration`), **regardless of the language your infrastructure is written in.**

You can write your infrastructure in TypeScript, Python, or C#, and use Go to test it. The Go `integration` module is purpose-built to handle the complexities of cloud deployments, including retries, dependency management, and guaranteed resource teardown.

Below is an example of a Go integration test executing against a Pulumi TypeScript program that provisions a web server. 

```go
package test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestWebServerIntegration(t *testing.T) {
	// 1. Arrange: Define the test options
	test := integration.ProgramTestOptions{
		// Directory containing your Pulumi program (e.g., index.ts, Pulumi.yaml)
		Dir: "../src/webserver", 
		
		// Pulumi will automatically install dependencies before running
		Dependencies: []string{"@pulumi/aws"}, 

		// 2. Act & Assert: The ExtraRuntimeValidation hook runs after `pulumi up` succeeds
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			
			// Extract the exported "websiteUrl" from the active stack
			url, ok := stack.Outputs["websiteUrl"].(string)
			if !ok || url == "" {
				t.Fatalf("Expected 'websiteUrl' output to be a valid string, got: %v", stack.Outputs["websiteUrl"])
			}

			// Validate the live infrastructure: Make an HTTP request to the new server
			t.Logf("Infrastructure deployed successfully. Polling %s...", url)
			
			// Simple retry logic to handle DNS propagation or server startup times
			maxRetries := 10
			for i := 0; i < maxRetries; i++ {
				resp, err := http.Get(url)
				if err == nil && resp.StatusCode == 200 {
					t.Log("Server is up and responding with HTTP 200!")
					return // Test passes
				}
				time.Sleep(5 * time.Second)
			}
			
			t.Errorf("Server at %s failed to return HTTP 200 after %d retries", url, maxRetries)
		},
	}

	// 3. Execute: This single function handles `up`, triggers the validation hook, 
	// and guarantees `destroy` is called afterward.
	integration.ProgramTest(t, &test)
}
```

### Advanced Validation: The `Preview` and `Edit` Hooks

The `ProgramTest` framework offers advanced hooks to simulate the day-to-day operations of an infrastructure team:

* **`EditDirs`**: Allows you to simulate a developer updating the code. The test deploys the initial directory, then replaces the code with a modified directory, runs `pulumi up` again, and verifies that the update transitions smoothly without causing unexpected resource replacements.
* **`ExpectRefreshChanges`**: Verifies that `pulumi refresh` accurately detects manual out-of-band changes made directly in the cloud console.
* **`ExpectFailure`**: Useful for testing negative scenarios, such as ensuring that attempting to deploy a database without an encryption key correctly fails the deployment.

### Cost and Cleanup Considerations

Integration tests are significantly slower than unit tests (often taking minutes rather than milliseconds) and incur actual cloud costs. Consequently, they are typically excluded from pre-commit hooks and are instead scheduled to run on pull requests to the main branch or as nightly CI/CD jobs.

The most critical challenge with integration testing is **orphaned resources**. If an integration test crashes mid-execution (e.g., the CI runner runs out of memory, or a power outage occurs), the `pulumi destroy` phase may be skipped, leaving expensive infrastructure running indefinitely.

To mitigate this, enterprise Pulumi environments enforce the following safeguards:
1.  **Dedicated Testing Accounts:** Run integration tests in an isolated AWS Account, Azure Subscription, or GCP Project entirely separate from production or staging.
2.  **Resource Tagging:** The test framework should inject a default tag (e.g., `Ephemeral: true`, `ManagedBy: CI-Integration-Test`) onto all resources.
3.  **Automated Sweepers:** Deploy an external cron job or serverless function (often utilizing tools like `aws-nuke` or Azure Resource Group expiration policies) that aggressively deletes any resources in the testing account older than a few hours, regardless of their Pulumi state.