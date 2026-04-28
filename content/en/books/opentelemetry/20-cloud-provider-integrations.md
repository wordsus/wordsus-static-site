OpenTelemetry’s greatest strength is its vendor-neutrality, decoupling your application instrumentation from specific backends. Yet, deploying workloads in the public cloud inevitably intersects with proprietary tools like AWS CloudWatch, Google Cloud Observability, and Azure Monitor. 

This chapter bridges that gap. We explore how to configure the OpenTelemetry Collector to seamlessly authenticate, translate, and route standard OTLP signals into these cloud-native ecosystems. We will also tackle the unique architectural challenges of tracing ephemeral serverless environments, ensuring your telemetry is never lost in the void.

## 20.1 AWS: Using the Distro for OTel (ADOT) and X-Ray

When deploying OpenTelemetry within Amazon Web Services (AWS), you are interacting with an ecosystem that has established its own proprietary observability tools—namely, Amazon CloudWatch for metrics and logs, and AWS X-Ray for distributed tracing. To bridge the vendor-neutral OpenTelemetry standard with these AWS-specific backends, AWS maintains the **AWS Distro for OpenTelemetry (ADOT)**. 

ADOT is a secure, AWS-supported distribution of the upstream OpenTelemetry Collector. While you could technically compile a custom collector using the `ocb` tool (as covered in Chapter 12) with the necessary AWS components, using ADOT provides out-of-the-box support, security patching, and predictable performance tuning specifically validated by AWS.

### The Architecture of AWS Telemetry Ingestion

Integrating OpenTelemetry with AWS requires addressing two primary challenges: **Authentication** and **Format Translation**. AWS services require API requests to be signed using AWS Signature Version 4 (SigV4), and backend services like X-Ray and CloudWatch expect data in highly specific formats.

Here is a high-level logical flow of an ADOT implementation:

```text
+-----------------------+                                +-----------------------+
|   Application Node    |                                |      AWS Cloud        |
|                       |                                |                       |
|  +-----------------+  |            OTLP                |  +-----------------+  |
|  | OTel SDK        |  |  (gRPC/HTTP, unauthenticated)  |  | Amazon          |  |
|  | - X-Ray ID Gen  |  | -----------------------------> |  | CloudWatch      |  |
|  | - X-Ray Propag. |  |                                |  |                 |  |
|  +-----------------+  |                                |  +-----------------+  |
+-----------------------+                                |           ^           |
                                                         |           | SigV4     |
+-----------------------+                                |           |           |
|    ADOT Collector     |                                |  +-----------------+  |
|   (Agent / Gateway)   |           SigV4                |  | AWS X-Ray       |  |
|                       | -----------------------------> |  |                 |  |
|  [awsemf exporter]    |                                |  +-----------------+  |
|  [awsxray exporter]   |                                |                       |
|  [sigv4 auth extension|                                +-----------------------+
+-----------------------+
   ^ Attached IAM Role
```

### The AWS X-Ray Trace ID Anomaly

The most critical hurdle when integrating OpenTelemetry with AWS X-Ray is the structure of the Trace ID. 

As established in Chapter 4, the W3C Trace Context specification mandates a 128-bit randomly generated hex string for Trace IDs. However, AWS X-Ray predates this standard and enforces its own strict ID format. An X-Ray Trace ID must be a 96-bit identifier where the first 32 bits represent an epoch timestamp, formatted as: `1-[8-digit-hex-timestamp]-[24-digit-hex-random]`.

If your OpenTelemetry SDK generates standard W3C Trace IDs and you forward them to X-Ray, **the trace data will be dropped or corrupted by the AWS backend.**

To resolve this, you must configure your application's OpenTelemetry SDK to use the **AWS X-Ray ID Generator**. This ensures the SDK originates traces compliant with X-Ray's epoch-based requirements while maintaining OTLP compatibility. 

Here is an example of configuring the X-Ray ID Generator in the OpenTelemetry Java SDK:

```java
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.contrib.awsxray.AwsXrayIdGenerator;

SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    // Override the default random W3C ID generator
    .setIdGenerator(AwsXrayIdGenerator.getInstance()) 
    .build();
```

Additionally, if your application communicates with managed AWS services that inject their own headers (like Application Load Balancers or API Gateway), you must configure the SDK to use the **AWS X-Ray Propagator** alongside the W3C propagator. This ensures the SDK can parse the `x-amzn-trace-id` HTTP header.

### Configuring the ADOT Collector

Once the application is generating X-Ray-compliant OTLP data, the ADOT Collector takes over. The Collector relies on two primary exporters to translate OTLP into AWS-native formats:

1.  **`awsxray` exporter:** Translates OTLP spans into AWS X-Ray segment documents.
2.  **`awsemf` exporter:** Translates OTLP metrics into Amazon CloudWatch Embedded Metric Format (EMF) logs. This is AWS's preferred method for ingesting high-cardinality custom metrics, as it parses structured JSON logs to extract metric data asynchronously.

Because the Collector must write data to AWS, the environment hosting the Collector (e.g., an EC2 instance, an ECS Task, or an EKS Pod via IRSA) must have an IAM Role attached with the appropriate permissions, typically `AWSXrayWriteOnlyAccess` and `CloudWatchAgentServerPolicy`.

Below is a production-ready configuration snippet for an ADOT Collector routing metrics and traces to AWS:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  # The resourcedetection processor is highly recommended in AWS
  # to automatically append EC2, ECS, or EKS resource attributes to telemetry
  resourcedetection:
    detectors: [env, ec2, ecs, eks, system]
    timeout: 2s
    override: false

exporters:
  awsxray:
    region: us-east-1
    # The exporter relies on the standard AWS SDK credential chain
    # and the IAM role attached to the Collector's host.
  
  awsemf:
    region: us-east-1
    log_group_name: "/metrics/otel-adot"
    log_stream_name: "{TaskId}"
    namespace: "MyApplicationMetrics"
    # Dimension rollups allow CloudWatch to aggregate metrics 
    # based on specific resource attributes.
    dimension_rollup_option: "NoCards"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [awsxray]
    metrics:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [awsemf]
```

By correctly configuring the X-Ray ID generator at the SDK level and utilizing the `awsxray` and `awsemf` exporters at the Collector level, you create a seamless pipeline. The development teams can write instrumentation using standard, vendor-agnostic OpenTelemetry APIs, while the platform engineering teams successfully route that telemetry into native AWS managed services without operational friction.

## 20.2 Google Cloud: Integrating with Cloud Observability

Google Cloud has deeply embraced OpenTelemetry, positioning it as the primary instrumentation standard for modern workloads. Rather than maintaining isolated, proprietary agents for each observability pillar, Google Cloud Observability (formerly known as Stackdriver) provides first-class ingestion for OpenTelemetry data. This allows you to route traces to Cloud Trace, metrics to Cloud Monitoring, and logs to Cloud Logging using a single pipeline.

While Google offers the "Ops Agent" for standard Compute Engine VMs (which uses the OpenTelemetry Collector under the hood), Kubernetes and serverless deployments benefit most from deploying the standard OpenTelemetry Collector (Contrib distribution) configured with Google-specific components.

### The Google Cloud Ingestion Architecture

Integrating with Google Cloud is largely driven by a single, unified exporter: the `googlecloud` exporter. Unlike AWS, which splits concerns between `awsxray` and `awsemf`, the `googlecloud` exporter multiplexes the three telemetry signals—traces, metrics, and logs—translating OTLP directly into Google Cloud Operations APIs.

```text
+-----------------------+                                +-----------------------+
|    Application Pod    |                                |     Google Cloud      |
|                       |                                |                       |
|  +-----------------+  |            OTLP                |  +-----------------+  |
|  | OTel SDK        |  |  (gRPC/HTTP, unauthenticated)  |  | Cloud Trace     |  |
|  |                 |  | -----------------------------> |  +-----------------+  |
|  +-----------------+  |                                |           ^           |
+-----------------------+                                |           | gRPC/REST |
                                                         |           |           |
+-----------------------+                                |  +-----------------+  |
|    OTel Collector     |        Application Default     |  | Cloud Monitoring|  |
|   (Contrib Distro)    |        Credentials (ADC)       |  +-----------------+  |
|                       | -----------------------------> |           ^           |
|  [gcp res. detector]  |                                |           | gRPC/REST |
|  [googlecloud export] |                                |           |           |
+-----------------------+                                |  +-----------------+  |
           ^                                             |  | Cloud Logging   |  |
           | GKE Workload Identity /                     |  +-----------------+  |
             Compute Engine Service Account              +-----------------------+
```

### Authentication via Application Default Credentials (ADC)

One of the most frictionless aspects of integrating OpenTelemetry with Google Cloud is authentication. The `googlecloud` exporter inherently relies on Google's Application Default Credentials (ADC) mechanism. 

You do not need to configure complex signature processes or inject static API keys into your configuration files. Instead, you grant the underlying infrastructure the necessary Identity and Access Management (IAM) roles:
* `roles/cloudtrace.agent` (for writing traces)
* `roles/monitoring.metricWriter` (for writing metrics)
* `roles/logging.logWriter` (for writing logs)

If your Collector is running on a Google Compute Engine (GCE) VM, it automatically assumes the attached Service Account. On Google Kubernetes Engine (GKE), you should utilize **Workload Identity** to bind a Kubernetes Service Account to a Google Cloud IAM Service Account, granting the Collector pod secure, ephemeral access to the APIs.

### Mapping Monitored Resources

Google Cloud Observability relies heavily on the concept of a **Monitored Resource**. Every metric data point and log entry ingested into Google Cloud must be associated with a specific entity, such as a `gce_instance` or a `k8s_container`. If telemetry arrives without the necessary attributes to map to a recognized Monitored Resource, Google Cloud will default to a generic `global` resource type, severely limiting your ability to filter and dashboard the data.

To prevent this, you must configure the `resourcedetection` processor using the `gcp` detector. This processor queries the metadata server of the underlying Google Cloud environment (GCE, GKE, Cloud Run, etc.) and injects the precise attributes required for the `googlecloud` exporter to seamlessly map OTLP data to native Google Cloud Monitored Resources.

### Configuring the Collector for Google Cloud

Below is a robust configuration snippet demonstrating how to ingest OTLP data and export it to Google Cloud Observability.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 8192
    timeout: 5s
  
  # Crucial for Google Cloud: Detects GCE/GKE metadata
  # to populate the required Monitored Resource attributes.
  resourcedetection:
    detectors: [gcp, env]
    timeout: 2s
    override: false

  # Optional but recommended: Memory limiter to prevent OOM kills
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 20

exporters:
  # The unified Google Cloud exporter
  googlecloud:
    # Set the target project. If omitted, it will attempt to infer 
    # the project ID from the ADC environment.
    project: "my-production-gcp-project"
    
    # Trace-specific configuration
    trace:
      # Optional: Control the ratio of traces actually sent to Cloud Trace
      # if not using tail-based sampling earlier in the pipeline.
      # 1.0 = 100%
      sample_rate: 1.0 
    
    # Metric-specific configuration
    metric:
      # Use the 'create_service_timeseries' API which is optimized 
      # for high-throughput metric ingestion
      create_service_timeseries: true
    
    # Log-specific configuration
    log:
      default_log_name: "opentelemetry-default-log"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [googlecloud]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [googlecloud]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [googlecloud]
```

By ensuring the `resourcedetection` processor captures the `gcp` environment variables and utilizing the unified `googlecloud` exporter, you can maintain a standard OpenTelemetry footprint while leveraging the full analytical power of Google Cloud's native observability suite.

## 20.3 Azure: Connecting to Application Insights and Monitor

Microsoft has made a definitive strategic shift in its observability roadmap, officially adopting OpenTelemetry as the standard for instrumenting applications on Azure. The proprietary Application Insights SDKs are being phased out in favor of native OpenTelemetry data collection. When operating in Azure, "Azure Monitor" acts as the overarching observability platform, while "Application Insights" serves as the specific Application Performance Monitoring (APM) interface powered by underlying Log Analytics workspaces.

Integrating OpenTelemetry with Azure Monitor generally follows one of two paths: utilizing the **Azure Monitor OpenTelemetry Distro** directly within the application, or routing standard OTLP data through an **OpenTelemetry Collector** equipped with the Azure Monitor exporter. For enterprise architectures, the Collector-based approach remains the most resilient and flexible.

### The Azure Ingestion Architecture

Unlike AWS and Google Cloud, which have distinct APIs for different telemetry signals, Azure Monitor ingests all APM data through a unified ingestion endpoint (historically known as the Breeze API). The OpenTelemetry Collector must translate standard OTLP traces, metrics, and logs into Azure's specific telemetry envelope schema before transmission.

```text
+-----------------------+                                +-----------------------+
|   AKS Pod / App Svc   |                                |    Azure Cloud        |
|                       |                                |                       |
|  +-----------------+  |            OTLP                |  +-----------------+  |
|  | OTel SDK        |  |  (gRPC/HTTP, unauthenticated)  |  |                 |  |
|  |                 |  | -----------------------------> |  |                 |  |
|  +-----------------+  |                                |  |                 |  |
+-----------------------+                                |  |  Azure Monitor  |  |
                                                         |  |  (Application   |  |
+-----------------------+                                |  |   Insights)     |  |
|    OTel Collector     |     HTTPS / Azure Schema       |  |                 |  |
|   (Contrib Distro)    |                                |  |                 |  |
|                       | -----------------------------> |  |                 |  |
|  [azuremonitor exp.]  |                                |  +-----------------+  |
+-----------------------+                                |           |           |
           ^                                             |     Log Analytics     |
           | Microsoft Entra ID (Managed Identity)       |     Workspace         |
             or Connection String                        +-----------------------+
```

### Data Mapping: From OTLP to Azure Tables

A critical concept to understand when utilizing Azure Monitor is how OpenTelemetry signals map to the underlying Kusto Query Language (KQL) tables in the Log Analytics workspace. The `azuremonitor` exporter performs this translation automatically:

* **Traces (Span Kind `SERVER`):** Mapped to the `AppRequests` table. These represent incoming requests to your application.
* **Traces (Span Kind `CLIENT` or `PRODUCER`):** Mapped to the `AppDependencies` table. These represent outgoing calls to databases, external APIs, or message queues.
* **Metrics:** Mapped to the `AppMetrics` table. OpenTelemetry histograms, counters, and gauges are converted into Azure's pre-aggregated metric format.
* **Logs:** Mapped to the `AppTraces` table (standard logs) or the `AppExceptions` table (if the log represents an error or exception stack trace).

Because Azure relies heavily on this specific table structure, ensuring that your application emits standard OpenTelemetry Semantic Conventions (as discussed in Chapter 3) is vital. If an outgoing database call lacks the `db.system` attribute, Azure Monitor may fail to render it correctly in the Application Map visualizer.

### Authentication and Collector Configuration

To route telemetry to Azure, the Collector requires a destination address and authorization. Historically, this was handled via an "Instrumentation Key" (IKey). However, the modern standard relies on a **Connection String**, which contains both the ingestion endpoint and the workspace identifier.

For heightened security, especially in Azure Kubernetes Service (AKS) or Azure Container Apps, it is highly recommended to use **Microsoft Entra ID (formerly Azure AD) authentication** via Managed Identities. This eliminates the need to hardcode Connection Strings in your Collector configuration.

Below is a production-grade Collector configuration utilizing the `azuremonitor` exporter. Note the inclusion of the memory limiter and batch processors, which are critical for preventing data loss during network blips to the Azure ingestion endpoints.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 8192
    timeout: 10s
  
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 20

  # Highly recommended in Azure to attach VM or AKS context
  resourcedetection:
    detectors: [env, azure]
    timeout: 2s
    override: false

exporters:
  azuremonitor:
    # Option 1: Hardcoded connection string (less secure, good for dev)
    # connection_string: "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://eastus-0.in.applicationinsights.azure.com/;"
    
    # Option 2: Entra ID Authentication (Recommended for Production)
    # Requires an Azure Managed Identity assigned to the Collector host
    # with the 'Monitoring Metrics Publisher' role.
    connection_string: ${env:APPLICATIONINSIGHTS_CONNECTION_STRING}
    
    # Enable span events to be exported as standard Application Insights logs
    export_span_events: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [azuremonitor]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [azuremonitor]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [azuremonitor]
```

### Handling Live Metrics and Profiling

While the Collector-based approach is ideal for standard traces, metrics, and logs, it is important to note that certain proprietary Application Insights features, such as **Live Metrics Stream** (which provides a real-time, sub-second view of telemetry) and the **Application Insights Profiler**, historically required the proprietary Azure SDKs. 

To bridge this gap while remaining faithful to the standard, Microsoft provides the Azure Monitor OpenTelemetry Distro as language-specific wrapper SDKs (available for Java, .NET, Node.js, and Python). If your operational teams heavily depend on Live Metrics or native Azure continuous profiling, utilizing these Distros at the application level alongside, or instead of, a standalone Collector is the officially supported architectural compromise.

## 20.4 Handling Ephemeral Serverless Environments (Lambda, Cloud Functions)

Serverless compute platforms like AWS Lambda and Google Cloud Functions fundamentally alter the operational paradigm of infrastructure. While they abstract away server provisioning and scaling, they introduce severe complications for traditional observability pipelines. Standard OpenTelemetry instrumentation assumes a long-lived, continuous background process—an assumption that breaks completely in ephemeral, event-driven environments.

### The "Freeze" Problem and the Telemetry Black Hole

To understand why OpenTelemetry struggles out-of-the-box in serverless architectures, we must examine how standard OTel SDKs export data. 

In a traditional microservice, the OpenTelemetry SDK utilizes a `BatchSpanProcessor` and a `BatchLogRecordProcessor`. These processors collect telemetry in memory and use asynchronous background threads to export the data to a Collector every few seconds. This prevents the application's critical path from being blocked by network I/O to the observability backend.

However, serverless environments employ a "freeze/thaw" lifecycle:
1.  An event triggers the function.
2.  The function executes its handler.
3.  The function returns a response to the caller.
4.  **The cloud provider instantly freezes the execution environment's CPU.**

If the OpenTelemetry SDK was waiting for its 5-second interval to batch and export data, that background thread is frozen the moment the response is sent. The telemetry remains trapped in memory. If the function is not invoked again before the cloud provider terminates the container, that telemetry is permanently lost.

### Approach 1: Synchronous Flushing (The SDK Method)

The simplest, framework-agnostic way to solve the freeze problem is to force the SDK to export data *before* the function returns a response. 

This involves replacing the default `BatchSpanProcessor` with a `SimpleSpanProcessor` (which exports each span immediately) or manually invoking a `forceFlush()` method at the end of your function handler.

**Pros:** Guarantees telemetry delivery without external dependencies.
**Cons:** Directly couples telemetry network latency to the user's request duration. If your observability backend takes 200ms to acknowledge the OTLP payload, your user waits an extra 200ms for their API response. In high-throughput systems, this added latency and cost is often unacceptable.

### Approach 2: Serverless Extensions and Layers (The Architectural Method)

To decouple telemetry export from function response time, cloud providers have introduced mechanisms to run sidecar-like processes within the serverless sandbox. AWS achieves this via **Lambda Extensions**, which is the gold standard for serverless OpenTelemetry deployment.

The AWS Distro for OpenTelemetry (ADOT) provides managed Lambda Layers for major programming languages. These layers inject an auto-instrumentation agent into your function and deploy a stripped-down OpenTelemetry Collector as an independent process within the same execution environment.

```text
+-----------------------------------------------------------------------+
|                   AWS Lambda Execution Environment                    |
|                                                                       |
|  +---------------------------------+   +---------------------------+  |
|  |        Function Runtime         |   |     Lambda Extension      |  |
|  |                                 |   |                           |  |
|  |  +---------------------------+  |   |  +---------------------+  |  |
|  |  | User Handler Code         |  |   |  | Embedded OTel       |  |  |
|  |  +---------------------------+  |   |  | Collector Binary    |  |  |
|  |  | OTel SDK (Auto-Instr)     |  |   |  |                     |  |  |
|  |  | (Exports via local IPC)   |-------O-> (Batches & Exports  |  |  |
|  |  +---------------------------+  | OTLP |  to Backend)        |  |  |
|  |                                 |   |  +---------------------+  |  |
|  +---------------------------------+   +---------------------------+  |
|          |                  |                         |               |
+----------|------------------|-------------------------|---------------+
           | (1. Event)       | (2. Response)           | (3. Async Export)
           v                  v                         v
```

Because the Lambda Extension runs as an independent process, the AWS Lambda lifecycle recognizes it. When the function handler finishes, AWS allows the Extension a brief window (typically a few seconds) to flush its internal queues and gracefully shut down or suspend, ensuring no telemetry is lost and the user's response is not delayed by OTLP network hops.

#### Configuring the ADOT Lambda Layer

Deploying the ADOT Lambda layer does not require code changes if you rely on auto-instrumentation. Instead, it is driven entirely by environment variables and Layer ARNs.

Here is an example of configuring a Node.js Lambda function using AWS SAM (Serverless Application Model) or CloudFormation to utilize the OpenTelemetry layer:

```yaml
Resources:
  MyServerlessFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs18.x
      Handler: index.handler
      CodeUri: src/
      # Attach the managed ADOT layer for Node.js
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:901920570463:layer:aws-otel-nodejs-amd64-ver-1-17-1:1
      Environment:
        Variables:
          # Enable auto-instrumentation wrapper
          AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
          # Tell the SDK to send data to the Extension's local collector
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318"
          # Define the target tracing backend (e.g., X-Ray)
          OTEL_TRACES_SAMPLER: always_on
```

### Google Cloud Functions and Cloud Run

Google Cloud approaches serverless differently. **Cloud Functions (2nd Gen)** is built directly on top of **Cloud Run**, which is a container-as-a-service platform. 

Because Cloud Run executes standard Docker containers, you have more flexibility. However, the same "freeze" problem applies if CPU allocation is set to "allocated only during request processing."

To handle OpenTelemetry in Google's serverless ecosystem, you have two primary options:

1.  **Always-on CPU:** In Cloud Run, you can configure the service to always allocate CPU. This behaves like a standard VM, allowing the OTel `BatchSpanProcessor` to run continuously in the background. This is the easiest solution but incurs higher continuous compute costs.
2.  **Synchronous Flushing via ADC:** If using ephemeral compute, you must fall back to Approach 1. You configure the OpenTelemetry SDK to use the `googlecloud` exporter and manually invoke the provider's `Shutdown()` or `ForceFlush()` routine immediately before your HTTP handler or Pub/Sub event subscriber returns its success status.

### Mitigating Cold Starts

Regardless of the cloud provider, adding OpenTelemetry SDKs, auto-instrumentation agents, and collector extensions increases the initialization time of your serverless functions (Cold Starts). 

To optimize performance:
* **Avoid heavy auto-instrumentation:** Languages like Java suffer heavy penalties from bytecode manipulation during cold starts. Prefer manual instrumentation or use native GraalVM images if cold starts must be strictly sub-second.
* **Trim the Collector:** If you use a custom Lambda extension, compile a custom Collector binary using `ocb` (as covered in Chapter 12) that contains *only* the specific receivers and exporters you need, reducing the memory footprint and startup time of the extension process.