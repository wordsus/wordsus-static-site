As you transition from Pulumi's core mechanics to real-world deployments, Amazon Web Services (AWS) is the natural starting point. This chapter bridges the gap between Pulumi’s declarative programming model and the vast AWS ecosystem. We will explore how to establish a secure network foundation with VPCs, deploy scalable compute resources ranging from EC2 instances to serverless Lambda functions, and securely manage persistent data storage. Finally, we will navigate the critical differences between the AWS Classic and AWS Native providers, equipping you with the expertise to architect robust, production-ready AWS environments.

## 9.1 Setting up the Pulumi AWS Provider

To provision infrastructure on Amazon Web Services, Pulumi relies on the AWS Provider. The provider acts as the critical bridge between the Pulumi engine and the AWS Resource Manager APIs, responsible for understanding resource states, making API calls, and handling authentication. 

While Chapter 2 briefly touched on cloud credentials, configuring the AWS provider for production workloads requires a deeper understanding of credential resolution, region management, and provider instantiation. 

### Adding the AWS Provider Dependency

When you bootstrap a new Pulumi project using an AWS template (e.g., `pulumi new aws-typescript`), the AWS provider is automatically included. However, if you are adding AWS to an existing project, you must install the provider package via your language's package manager.

* **Node.js (TypeScript/JavaScript):** `npm install @pulumi/aws`
* **Python:** `pip install pulumi_aws`
* **Go:** `go get github.com/pulumi/pulumi-aws/sdk/v6/go/aws`
* **.NET (C#):** `dotnet add package Pulumi.Aws`

Once installed, the Pulumi CLI will automatically download the corresponding provider binary plugin the next time you run `pulumi up` or `pulumi preview`.

### The AWS Credential Resolution Chain

The Pulumi AWS Provider delegates authentication to the underlying AWS SDK. This means you do not need to invent new ways to authenticate; Pulumi seamlessly integrates with the tools and configurations you already use, such as the AWS CLI. 

When the AWS Provider initializes, it searches for credentials and configuration values (like the AWS region) in a specific order of precedence. Understanding this hierarchy is crucial for debugging authentication errors, especially in CI/CD pipelines.

```text
+-------------------------------------------------------------+
|               AWS Credential Resolution Chain               |
+-------------------------------------------------------------+
|  1. Pulumi Stack Configuration                              |
|     (e.g., `pulumi config set aws:profile staging-admin`)   |
|                             |                               |
|                             v                               |
|  2. Environment Variables                                   |
|     (e.g., AWS_ACCESS_KEY_ID, AWS_REGION)                   |
|                             |                               |
|                             v                               |
|  3. Shared Credentials File / AWS CLI Profile               |
|     (~/.aws/credentials and ~/.aws/config)                  |
|                             |                               |
|                             v                               |
|  4. Container/Instance Metadata                             |
|     (e.g., ECS Task Roles, EC2 Instance Profiles, EKS OIDC) |
+-------------------------------------------------------------+
```

Because Pulumi Stack Configuration has the highest precedence, it is the safest way to lock a specific stack to a specific AWS account or region, preventing accidental deployments to the wrong environment if your local terminal environment variables change.

### Configuring the Default Provider

The most common way to configure the AWS provider is through Pulumi Stack Configuration. By default, Pulumi implicitly creates a "default provider" based on these settings. Every AWS resource in your program will automatically use this default provider unless instructed otherwise.

To set the region and profile for your current stack, use the CLI:

```bash
# Set the target AWS region
pulumi config set aws:region us-west-2

# Set the AWS CLI profile to use for authentication
pulumi config set aws:profile production-deployer
```

This configuration is stored in your `Pulumi.<stack-name>.yaml` file. From your code's perspective, no additional setup is required. You simply import the AWS package and start defining resources.

### Explicit Providers: Multi-Region and Cross-Account Deployments

Relying on the default provider is sufficient for simple projects. However, enterprise architectures frequently require deploying resources across multiple regions (e.g., for disaster recovery or global content delivery) or across multiple AWS accounts (e.g., hub-and-spoke networking) within a single Pulumi program.

To achieve this, you must instantiate **Explicit Providers**. Instead of relying on ambient configuration, you define provider objects in your code and pass them to the resources that need them.

#### Example: Multi-Region Deployment

Here is how you can deploy an S3 bucket in `us-east-1` and another in `eu-west-1` simultaneously using explicit providers in TypeScript:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an explicit provider for the EU region
const euProvider = new aws.Provider("eu-provider", {
    region: "eu-west-1",
});

// Create an explicit provider for the US region
const usProvider = new aws.Provider("us-provider", {
    region: "us-east-1",
});

// Resource uses the EU provider
const euBucket = new aws.s3.Bucket("data-bucket-eu", {}, { provider: euProvider });

// Resource uses the US provider
const usBucket = new aws.s3.Bucket("data-bucket-us", {}, { provider: usProvider });
```

#### Example: Assuming an IAM Role (Cross-Account)

Explicit providers are also how you configure `AssumeRole` operations. If your CI/CD runner operates in an "Identity" AWS account, you can create explicit providers that assume different roles in different "Target" AWS accounts.

```python
import pulumi
import pulumi_aws as aws

# Create a provider that assumes a specific role in a target account
cross_account_provider = aws.Provider("cross-account-provider",
    region="us-east-2",
    assume_role=aws.ProviderAssumeRoleArgs(
        role_arn="arn:aws:iam::123456789012:role/PulumiDeploymentRole",
        session_name="PulumiCrossAccountDeploy",
    )
)

# Provision a VPC in the target account using the assumed role
target_vpc = aws.ec2.Vpc("target-account-vpc",
    cidr_block="10.0.0.0/16",
    opts=pulumi.ResourceOptions(provider=cross_account_provider)
)
```

By mastering explicit providers, you unlock the ability to orchestrate complex, globally distributed, and highly segmented AWS architectures from a single pane of glass, avoiding the fragmentation often found in legacy infrastructure codebases.

## 9.2 Core AWS Networking (VPC, Subnets, Security Groups)

Before deploying compute or database resources, establishing a robust and secure network foundation is paramount. In AWS, this begins with the Virtual Private Cloud (VPC) and its associated components. When managing these with Pulumi, you declare the desired state of your network topology, and the Pulumi engine orchestrates the intricate dependencies between routing tables, gateways, and security controls.

### The Virtual Private Cloud (VPC)

A VPC is your logically isolated slice of the AWS cloud. It acts as the container for your subnets, routing rules, and networked resources. Creating a VPC in Pulumi is straightforward, but it forms the root node of your infrastructure dependency graph.

Here is how you declare a foundational VPC using TypeScript:

```typescript
import * as aws from "@pulumi/aws";

// Define the core VPC
const mainVpc = new aws.ec2.Vpc("main-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        Name: "production-vpc",
        Environment: "production",
    },
});
```

Notice the use of the `tags` property. Tagging is a critical best practice in IaC, as it aids in cost allocation, resource grouping, and logical organization within the AWS console.

### Designing Subnets for High Availability

A VPC spans an entire AWS Region, but subnets are tied to specific Availability Zones (AZs). To ensure high availability, you must distribute your resources across multiple subnets in different AZs. Furthermore, subnets are generally divided into two tiers based on their routing configurations:

1.  **Public Subnets:** Have a route to an Internet Gateway (IGW). Resources here can be assigned public IP addresses and directly communicate with the internet.
2.  **Private Subnets:** Do not have a direct route to an IGW. Resources here are isolated from direct inbound internet traffic and typically use a NAT Gateway for outbound access (e.g., to download patches).

```text
+-----------------------------------------------------------------------+
| VPC (10.0.0.0/16)                                                     |
|                                                                       |
|  +-----------------------+           +-----------------------+        |
|  | Availability Zone A   |           | Availability Zone B   |        |
|  |                       |           |                       |        |
|  |  +-----------------+  |           |  +-----------------+  |        |
|  |  | Public Subnet   |  |           |  | Public Subnet   |  |        |
|  |  | 10.0.1.0/24     |  |           |  | 10.0.3.0/24     |  |        |
|  |  +-----------------+  |           |  +-----------------+  |        |
|  |          |            |           |          |            |        |
|  |  +-----------------+  |           |  +-----------------+  |        |
|  |  | Private Subnet  |  |           |  | Private Subnet  |  |        |
|  |  | 10.0.2.0/24     |  |           |  | 10.0.4.0/24     |  |        |
|  |  +-----------------+  |           |  +-----------------+  |        |
|  +-----------------------+           +-----------------------+        |
+-----------------------------------------------------------------------+
```

When defining subnets in Pulumi, we pass the `id` of the VPC we created earlier as an input. This creates an implicit dependency: Pulumi knows it must create the VPC *before* it attempts to create the subnets.

```typescript
// Public Subnet in AZ 'a'
const publicSubnetA = new aws.ec2.Subnet("public-subnet-a", {
    vpcId: mainVpc.id, // Implicit dependency on mainVpc
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-west-2a",
    mapPublicIpOnLaunch: true, // Auto-assign public IPs to instances
    tags: { Name: "public-us-west-2a" },
});

// Private Subnet in AZ 'a'
const privateSubnetA = new aws.ec2.Subnet("private-subnet-a", {
    vpcId: mainVpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: "us-west-2a",
    tags: { Name: "private-us-west-2a" },
});
```

> **Note on `pulumi/awsx`:** While the core `@pulumi/aws` package provides fine-grained control, mapping out Internet Gateways, Route Tables, and NAT Gateways manually can be tedious. The `@pulumi/awsx` (AWS Crosswalk) package offers a higher-level abstraction, allowing you to create a fully configured, multi-AZ VPC with public and private subnets in a single line of code. We will explore high-level components in Chapter 13.

### Security Groups: Stateful Firewalls as Code

Security Groups (SGs) act as virtual firewalls for your instances and services, controlling inbound (ingress) and outbound (egress) traffic. SGs operate at the instance level, not the subnet level (unlike Network ACLs), and they are *stateful*—meaning if you allow an inbound request, the response traffic is automatically allowed, regardless of egress rules.

When defining SGs in code, avoid using inline magic strings. Clearly define ports and protocols to ensure your code remains readable and auditable.

```typescript
// A Security Group for web servers
const webSecurityGroup = new aws.ec2.SecurityGroup("web-sg", {
    vpcId: mainVpc.id,
    description: "Allow inbound HTTP/HTTPS and all outbound traffic",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ["0.0.0.0/0"],
            description: "Allow HTTP traffic from anywhere",
        },
        {
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ["0.0.0.0/0"],
            description: "Allow HTTPS traffic from anywhere",
        },
    ],
    egress: [
        {
            protocol: "-1", // "-1" means all protocols
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
            description: "Allow all outbound traffic",
        },
    ],
    tags: { Name: "web-server-sg" },
});
```

#### Self-Referencing and Chained Security Groups

A powerful feature of Security Groups is their ability to reference *other* Security Groups as the source or destination, rather than relying solely on CIDR blocks. This is vital for zero-trust architectures. 

For example, you can configure your database Security Group to only accept traffic originating from your web server Security Group:

```typescript
const dbSecurityGroup = new aws.ec2.SecurityGroup("db-sg", {
    vpcId: mainVpc.id,
    description: "Allow database access only from web servers",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 5432, // PostgreSQL
            toPort: 5432,
            // Reference the Web SG ID directly
            securityGroups: [webSecurityGroup.id], 
            description: "Allow PostgreSQL from Web SG",
        },
    ],
});
```

By passing `webSecurityGroup.id` into the database SG, Pulumi automatically understands that the Web Security Group must be created first. This chained approach ensures that as your auto-scaling groups expand or IP addresses change, your network security rules dynamically adapt without requiring manual updates to firewall CIDRs.

## 9.3 Compute Resources (EC2, ECS, Lambda)

With a secure and highly available network foundation in place, the next step in provisioning an AWS environment is deploying compute resources. AWS provides a broad continuum of compute services, ranging from raw virtual machines where you manage the operating system, to serverless functions where you only provide the application code. Pulumi excels across this entire spectrum, treating a low-level EC2 instance and a high-level Lambda function as equal citizens in your infrastructure graph.

### Amazon EC2: Virtual Machines as Code

Amazon Elastic Compute Cloud (EC2) provides resizable compute capacity in the cloud. While the industry has shifted toward containers and serverless architectures, EC2 remains the backbone for legacy applications, specialized workloads, and self-managed platforms like databases or Kubernetes clusters.

When provisioning an EC2 instance with Pulumi, a common anti-pattern is hardcoding the Amazon Machine Image (AMI) ID. Because AMIs are region-specific and frequently updated with security patches, hardcoding them leads to brittle code. Instead, you should dynamically look up the most recent AMI at deployment time.

```typescript
import * as aws from "@pulumi/aws";

// 1. Dynamically look up the latest Amazon Linux 2023 AMI
const ami = aws.ec2.getAmiOutput({
    filters: [
        { name: "name", values: ["al2023-ami-2023.*-x86_64"] },
        { name: "architecture", values: ["x86_64"] },
    ],
    owners: ["amazon"],
    mostRecent: true,
});

// 2. Provision the EC2 Instance using the dynamic AMI
const webServer = new aws.ec2.Instance("web-server", {
    // Reference the dynamically resolved AMI ID
    ami: ami.id, 
    instanceType: aws.ec2.InstanceType.t3_micro,
    // Reference networking components created in Section 9.2
    subnetId: publicSubnetA.id, 
    vpcSecurityGroupIds: [webSecurityGroup.id],
    userData: `#!/bin/bash
echo "Hello, Pulumi!" > index.html
nohup python -m SimpleHTTPServer 80 &`,
    tags: {
        Name: "primary-web-server",
    },
});

// Export the public IP so we can access it after deployment
export const publicIp = webServer.publicIp;
```

In this example, `getAmiOutput` is an asynchronous data source invocation that seamlessly integrates with Pulumi's promise-based architecture. The `userData` property allows you to pass a bash script that executes on the first boot, providing a simple mechanism for bootstrapping the instance.

### Amazon ECS and Fargate: Container Orchestration

For modern applications, packaging code into Docker containers is the standard. Amazon Elastic Container Service (ECS) is a highly scalable container orchestration service. While ECS can run on underlying EC2 instances that you manage, AWS Fargate is the preferred launch type. Fargate operates as a serverless compute engine for containers, removing the need to provision or manage underlying servers.

The architectural hierarchy of ECS is structured as follows:

```text
+-------------------------------------------------------------------+
|                           ECS Cluster                             |
|  Logical grouping of services and tasks.                          |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |                        ECS Service                          |  |
|  |  Maintains the desired count of running tasks (e.g., 2).    |  |
|  |                                                             |  |
|  |  +-----------------------+       +-----------------------+  |  |
|  |  |    Task (Fargate)     |       |    Task (Fargate)     |  |  |
|  |  | Instantiation of a    |       |                       |  |  |
|  |  | Task Definition.      |       |                       |  |  |
|  |  |                       |       |                       |  |  |
|  |  | +-------------------+ |       | +-------------------+ |  |  |
|  |  | | Container (Nginx) | |       | | Container (Nginx) | |  |  |
|  |  | +-------------------+ |       | +-------------------+ |  |  |
|  |  +-----------------------+       +-----------------------+  |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

To deploy a Fargate service, you must define the Cluster, the Task Definition (which specifies the Docker image, CPU, and memory), and the Service itself. 

```typescript
// 1. Create an ECS Cluster
const cluster = new aws.ecs.Cluster("app-cluster");

// 2. Define the Execution Role (Allows ECS to pull images and log to CloudWatch)
const taskExecRole = new aws.iam.Role("task-exec-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
});
new aws.iam.RolePolicyAttachment("task-exec-policy", {
    role: taskExecRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// 3. Create a Task Definition
const appTask = new aws.ecs.TaskDefinition("app-task", {
    family: "my-app-task",
    cpu: "256", // 0.25 vCPU
    memory: "512", // 512 MB
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecRole.arn,
    containerDefinitions: JSON.stringify([{
        name: "my-app-container",
        image: "nginx:latest", // Pulling from Docker Hub for simplicity
        portMappings: [{ containerPort: 80, hostPort: 80, protocol: "tcp" }],
    }]),
});

// 4. Create the ECS Service to run the Task Definition
const appService = new aws.ecs.Service("app-service", {
    cluster: cluster.arn,
    desiredCount: 2,
    launchType: "FARGATE",
    taskDefinition: appTask.arn,
    networkConfiguration: {
        assignPublicIp: true,
        subnets: [publicSubnetA.id], // From Section 9.2
        securityGroups: [webSecurityGroup.id],
    },
});
```

*(Note: In Chapter 13, we will explore the `awsx` package, which can reduce the above boilerplate into a single `awsx.ecs.FargateService` component.)*

### AWS Lambda: Serverless Functions

AWS Lambda represents the pinnacle of compute abstraction. You provide the application code, and AWS handles the provisioning, scaling, patching, and administration of the compute infrastructure. Lambda is inherently event-driven, designed to be triggered by HTTP requests (via API Gateway), database changes (via DynamoDB Streams), or message queues (via SQS).

Deploying a Lambda function with Pulumi requires two primary resources: an IAM Role that grants the function permission to execute, and the Function resource itself, which points to a localized asset archive containing your code.

Assuming you have a local directory named `app` containing an `index.js` file with your Lambda handler:

```typescript
import * as pulumi from "@pulumi/pulumi";

// 1. Create an IAM Role for the Lambda function
const lambdaRole = new aws.iam.Role("lambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});

// 2. Attach the AWS managed basic execution policy (allows writing logs to CloudWatch)
new aws.iam.RolePolicyAttachment("lambda-basic-execution", {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

// 3. Create the Lambda Function
const dataProcessor = new aws.lambda.Function("data-processor", {
    runtime: aws.lambda.Runtime.NodeJS18dX,
    role: lambdaRole.arn,
    handler: "index.handler", // Refers to the exported 'handler' function in 'index.js'
    
    // Package the local './app' directory into a zip archive dynamically during deployment
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./app"),
    }),
    
    // Pass environment variables to the function
    environment: {
        variables: {
            LOG_LEVEL: "debug",
            TABLE_NAME: "users-table",
        },
    },
});
```

Pulumi's `AssetArchive` is a powerful primitive. During the `pulumi up` execution, Pulumi automatically zips the contents of the `./app` directory, computes a SHA256 hash of the archive, and uploads it to AWS. If you modify your `index.js` code and run `pulumi up` again, Pulumi detects the changed hash and automatically deploys the new version of your function, streamlining the serverless deployment lifecycle without requiring third-party packaging tools.

## 9.4 Data Storage (S3, RDS, DynamoDB)

Compute resources are ephemeral, but data is the lifeblood of most applications. AWS offers a vast array of purpose-built databases and storage services. When provisioning stateful resources with Pulumi, the focus shifts from pure deployment mechanics to data durability, secure access patterns, and lifecycle management. 

In this section, we will cover the three foundational pillars of AWS data storage: Object Storage (S3), Relational Databases (RDS), and NoSQL Databases (DynamoDB).

### Architectural Overview

Before diving into the code, let's visualize how these storage services fit into the network topology we designed in Section 9.2.

```text
+-------------------------------------------------------------------------+
| AWS Cloud                                                               |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Virtual Private Cloud (VPC)                                       |  |
|  |                                                                   |  |
|  |  +-----------------------+      +------------------------------+  |  |
|  |  | Public Subnet         |      | Private Subnet               |  |  |
|  |  | [ Web Servers / ECS ] | ---> | [ RDS PostgreSQL Instance ]  |  |  |
|  |  +-----------------------+      +------------------------------+  |  |
|  |           |                     (Secured by DB Security Group)    |  |
|  +-----------|-------------------------------------------------------+  |
|              v                                                          |
|  +-----------------------+         +------------------------------+     |
|  | Amazon S3 Bucket      |         | Amazon DynamoDB Table        |     |
|  | (Global Object Store) |         | (Serverless NoSQL)           |     |
|  +-----------------------+         +------------------------------+     |
+-------------------------------------------------------------------------+
```

Notice that RDS lives strictly within the boundaries of our VPC's private subnets, whereas S3 and DynamoDB are managed AWS services accessed via API endpoints over the network (or via VPC Endpoints for enhanced security).

### Amazon S3: Object Storage

Amazon Simple Storage Service (S3) is the industry standard for object storage, ideal for unstructured data like user uploads, application assets, and backup archives. 

When creating an S3 bucket with Pulumi, it is crucial to handle data lifecycle and security explicitly. AWS now recommends disabling public Access Control Lists (ACLs) and relying entirely on IAM and Bucket Policies for access management.

```typescript
import * as aws from "@pulumi/aws";

// 1. Create a secure, private S3 bucket
const appDataBucket = new aws.s3.Bucket("app-data-bucket", {
    // Enable versioning to protect against accidental overwrites/deletes
    versioning: { enabled: true },
    
    // Force deletion of the bucket even if it contains objects 
    // (Use cautiously; typically set to 'false' in production)
    forceDestroy: false,
});

// 2. Explicitly block all public access
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("app-data-block", {
    bucket: appDataBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
});
```

### Amazon RDS: Managed Relational Databases

Amazon Relational Database Service (RDS) automates the operational burden of running databases like PostgreSQL, MySQL, and MariaDB. 

Provisioning RDS introduces two critical IaC challenges: network placement and secrets management. We must place the database in the private subnets created in Section 9.2 and ensure the master database password is not hardcoded in our source code. 

As covered in Chapter 6, we will use Pulumi's Config system to retrieve a securely encrypted password.

```typescript
import * as pulumi from "@pulumi/pulumi";

// Initialize Pulumi config to fetch the encrypted database password
const config = new pulumi.Config();
// This value was set via: `pulumi config set --secret dbPassword [PASSWORD]`
const dbPassword = config.requireSecret("dbPassword");

// 1. Create a DB Subnet Group spanning our private subnets
const dbSubnetGroup = new aws.rds.SubnetGroup("db-subnet-group", {
    // Assuming privateSubnetA and privateSubnetB were exported from your network stack
    subnetIds: [privateSubnetA.id, privateSubnetB.id],
    tags: { Name: "My DB Subnet Group" },
});

// 2. Provision the RDS PostgreSQL Instance
const appDatabase = new aws.rds.Instance("app-database", {
    engine: "postgres",
    engineVersion: "15.4",
    instanceClass: aws.rds.InstanceType.t3_micro,
    allocatedStorage: 20, // Gigabytes
    
    // Network and Security
    dbSubnetGroupName: dbSubnetGroup.name,
    vpcSecurityGroupIds: [dbSecurityGroup.id], // From Section 9.2
    publiclyAccessible: false,
    
    // Credentials
    dbName: "application_db",
    username: "dbadmin",
    password: dbPassword,
    
    // Lifecycle
    skipFinalSnapshot: true, // Set to false in production to ensure backups on deletion
});

// Export the database endpoint for application consumption
export const dbEndpoint = appDatabase.endpoint;
```

### Amazon DynamoDB: Serverless NoSQL

For highly scalable applications requiring single-digit millisecond latency, Amazon DynamoDB is the go-to NoSQL datastore. DynamoDB is completely serverless; there are no instances to provision, and you scale based on read/write capacity rather than CPU and memory.

When defining a DynamoDB table, you only need to declare the attributes that make up the Primary Key (Hash Key) and Sort Key (Range Key). Because it is a schemaless database, you do *not* define every column in Pulumi—only the keys used for indexing.

```typescript
// Provision a serverless DynamoDB Table
const usersTable = new aws.dynamodb.Table("users-table", {
    // Define only the attributes used for primary and global secondary indexes
    attributes: [
        { name: "UserId", type: "S" }, // 'S' stands for String
        { name: "LastLoginTimestamp", type: "N" }, // 'N' stands for Number
    ],
    
    // Define the Primary Key structure
    hashKey: "UserId",
    rangeKey: "LastLoginTimestamp",
    
    // On-Demand capacity model (PAY_PER_REQUEST) avoids the need to guess capacity
    // and automatically scales to zero when not in use.
    billingMode: "PAY_PER_REQUEST",
    
    // Enable Point-in-Time Recovery (PITR) for continuous backups
    pointInTimeRecovery: {
        enabled: true,
    },
    
    tags: { Environment: "production" },
});

// Export the table name to be injected into Lambda functions or ECS tasks
export const usersTableName = usersTable.name;
```

By explicitly enabling features like `pointInTimeRecovery` for DynamoDB, `versioning` for S3, and leveraging Pulumi secrets for RDS, your Infrastructure as Code moves beyond simply provisioning resources to actively enforcing security and data durability best practices by default.

## 9.5 AWS Classic vs. AWS Native Providers

Throughout this chapter, we have utilized the standard `@pulumi/aws` package. However, as you dive deeper into the Pulumi ecosystem, you will inevitably encounter the `@pulumi/aws-native` package. Understanding the architectural differences between these two providers is crucial for making informed decisions about your infrastructure's foundation.

Pulumi offers two distinct providers for Amazon Web Services: the **AWS Classic Provider** and the **AWS Native Provider**. While they accomplish the same ultimate goal—provisioning AWS resources—their underlying mechanics and API surfaces differ significantly.

### Architectural Differences

The fundamental difference between the two lies in how they communicate with the AWS APIs.

```text
+-------------------------------------------------------------------------+
|                      Pulumi Engine & Language Host                      |
+-------------------------------------------------------------------------+
           |                                                 |
+----------------------+                          +-----------------------+
| AWS Classic Provider |                          |  AWS Native Provider  |
| (@pulumi/aws)        |                          |  (@pulumi/aws-native) |
+----------------------+                          +-----------------------+
           |                                                 |
           v                                                 v
+----------------------+                          +-----------------------+
| Pulumi TF Bridge     |                          |                       |
| (Translates TF SDK)  |                          | Direct Integration    |
+----------------------+                          |                       |
           |                                                 |
           v                                                 v
+----------------------+                          +-----------------------+
| Terraform AWS        |                          | AWS Cloud Control API |
| Provider SDK         |                          |                       |
+----------------------+                          +-----------------------+
           |                                                 |
           +-----------------------+-------------------------+
                                   |
                                   v
+-------------------------------------------------------------------------+
|                        AWS Service REST APIs                            |
+-------------------------------------------------------------------------+
```

**1. AWS Classic (`@pulumi/aws`)**
The Classic provider is built on top of the Terraform AWS Provider using Pulumi's bridging technology. When you declare a resource using Classic, Pulumi translates that request into a format the Terraform provider understands, which then makes the underlying AWS API calls. 

**2. AWS Native (`@pulumi/aws-native`)**
The Native provider is built directly on top of the **AWS Cloud Control API**, a standard set of APIs introduced by AWS to provide consistent Create, Read, Update, and Delete (CRUD) operations across AWS services. It bypasses the Terraform bridge entirely.

### Comparing Features and Trade-offs

Each approach carries specific advantages and trade-offs regarding maturity, feature availability, and API design.

#### The Case for AWS Classic
* **Maturity and Stability:** It is battle-tested by thousands of enterprises. It handles complex edge cases, retries, and eventual consistency issues that have been ironed out over years of community usage.
* **Ecosystem and Abstractions:** Higher-level libraries like `@pulumi/awsx` (AWS Crosswalk) are built exclusively on top of the Classic provider.
* **Coverage:** It covers virtually 100% of AWS services, including legacy resources that predate modern AWS API standards.
* **The Drawback:** Because it relies on the Terraform bridge, the API property names often reflect Terraform's naming conventions rather than official AWS documentation, which can sometimes be confusing when cross-referencing AWS manuals. Additionally, new AWS features may take a few days or weeks to be implemented.

#### The Case for AWS Native
* **Same-Day Support:** Because Native is auto-generated directly from AWS Cloud Control API specifications, new AWS features and services are typically available in Pulumi on the exact day AWS releases them.
* **1:1 AWS API Mapping:** The property names and structures in your code exactly match the official AWS CloudFormation and Cloud Control documentation. There is no translation layer.
* **Speed:** By removing the bridge translation layer, Native provider operations can be slightly faster and consume less memory during deployment.
* **The Drawback:** AWS Cloud Control API does not yet support every single legacy AWS resource. If a service is not supported by Cloud Control, it is not available in the Native provider.

### Code Comparison: API Surface Differences

Because Classic maps to Terraform and Native maps to the AWS API, the way you declare resources looks different. In Classic, properties are often flattened. In Native, properties are deeply nested, mirroring JSON objects used in AWS APIs.

Here is a comparison of creating an ECS Cluster using both providers:

**Using AWS Classic:**
```typescript
import * as aws from "@pulumi/aws";

// Classic Provider: Flattened properties
const classicCluster = new aws.ecs.Cluster("classic-cluster", {
    name: "my-classic-cluster",
    settings: [{
        name: "containerInsights",
        value: "enabled",
    }],
});
```

**Using AWS Native:**
```typescript
import * as awsNative from "@pulumi/aws-native";

// Native Provider: Nested properties matching AWS documentation
const nativeCluster = new awsNative.ecs.Cluster("native-cluster", {
    clusterName: "my-native-cluster",
    clusterSettings: [{
        name: "containerInsights", // Note: Often uses enums mapped to AWS API
        value: "enabled",
    }],
});
```

### Strategic Recommendation

For most teams, the **AWS Classic provider remains the recommended default** due to its unparalleled stability, comprehensive coverage of edge cases, and compatibility with the `awsx` library. 

However, one of Pulumi's greatest strengths is that **you do not have to choose just one**. Because they are simply Node packages (or Python/Go/C# modules), you can seamlessly mix and match them within the exact same Pulumi program. 

```typescript
import * as aws from "@pulumi/aws";
import * as awsNative from "@pulumi/aws-native";

// Use Classic for networking (due to maturity and awsx support)
const vpc = new aws.ec2.Vpc("main", { cidrBlock: "10.0.0.0/16" });

// Use Native for a brand-new AWS service released today
const newFeature = new awsNative.newservice.BrandNewFeature("bleeding-edge", {
    vpcId: vpc.id, // Referencing the Classic resource ID works seamlessly
    configuration: { mode: "Advanced" }
});
```

The best practice is to build your core infrastructure using `@pulumi/aws` and pull in `@pulumi/aws-native` specifically when you need access to a newly released AWS feature that has not yet made its way into the Classic provider bridge.