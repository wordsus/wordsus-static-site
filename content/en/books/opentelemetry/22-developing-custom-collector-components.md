The OpenTelemetry Collector is highly extensible, but off-the-shelf components sometimes fall short of specific enterprise needs. When integrating with proprietary internal systems, implementing custom PII redaction, or ingesting legacy data formats, you must build your own components.

In this chapter, we transition from pipeline configuration to software development. We will explore the Go programming prerequisites required to interact with the Collector's core APIs. You will learn how to scaffold custom receivers and processors, and how to test, benchmark, and compile your code into a production-ready binary.

## 22.1 Go Programming Prerequisites for Collector Development

Before you scaffold your first custom receiver or processor, you must ensure your Go programming foundation is aligned with the specific paradigms used by the OpenTelemetry (OTel) Collector. The Collector is not a standard web service; it is a high-throughput, highly concurrent data pipeline designed to ingest, process, and export millions of telemetry signals per second with minimal overhead. 

Working within this environment can be incredibly rewarding, but it can also be unforgiving if you are unfamiliar with the idioms the core maintainers use. While you do not need to be a Go master to write a custom component, mastering a specific subset of Go features is non-negotiable. 

Here are the critical Go concepts and patterns you must be comfortable with before diving into Collector component development.

### 1. Advanced Interfaces and the Factory Pattern

The OpenTelemetry Collector is fundamentally built on a plugin architecture. It achieves this through strict adherence to Go interfaces. Every component—whether a receiver, processor, exporter, or extension—must implement specific interfaces defined in the `go.opentelemetry.io/collector/component` module.

You will rarely instantiate structs directly. Instead, you will heavily utilize the **Factory Pattern**. A factory provides a standard way for the Collector builder to instantiate your configuration struct and then use that configuration to create the actual component instances.

```go
// A simplified conceptual representation of Collector component interfaces

// 1. The base Component interface that all plugins must satisfy
type Component interface {
    Start(ctx context.Context, host Host) error
    Shutdown(ctx context.Context) error
}

// 2. A signal-specific interface embedding the base Component
type TracesReceiver interface {
    Component
}

// 3. The Factory used to instantiate the configuration and the component
type ReceiverFactory interface {
    Factory
    CreateDefaultConfig() component.Config
    CreateTracesReceiver(ctx context.Context, set ReceiverCreateSettings, cfg component.Config, next consumer.Traces) (TracesReceiver, error)
}
```

**What you need to know:** You must be comfortable navigating deep interface hierarchies, understanding struct embedding, and implementing interface methods strictly. If your component fails to build, it is almost always because your struct signature slightly deviated from the required interface contract.

### 2. Pervasive Use of `context.Context`

In the Collector, `context.Context` is ubiquitous. It is passed into almost every function and method. The Collector relies on contexts for three primary reasons:

1.  **Lifecycle Management and Cancellation:** When the Collector shuts down, it uses context cancellation to signal all running components to gracefully terminate their goroutines and network connections.
2.  **Timeouts:** Exporters and processors use contexts to enforce strict timeouts on network requests and batching operations, preventing pipeline gridlock.
3.  **Self-Observability Context:** The Collector monitors itself. Contexts are used to pass tracing spans and metrics down the pipeline so the Collector can record telemetry about its own performance.

**What you need to know:** Never use `context.Background()` or `context.TODO()` inside a component's operational loop unless explicitly spawning a deeply detached background task. Always propagate the `ctx` passed to your `Start` method or your processing function, and always listen for `ctx.Done()` in your long-running loops.

```go
// Example: A common goroutine pattern in a Receiver
func (r *myReceiver) startPolling(ctx context.Context) {
    ticker := time.NewTicker(r.config.Interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            // The Collector is shutting down, gracefully exit
            r.logger.Info("Context cancelled, stopping receiver")
            return
        case <-ticker.C:
            // Perform the collection task
            r.scrapeMetrics(ctx)
        }
    }
}
```

### 3. Concurrency, Synchronization, and Data Races

By design, telemetry pipelines process data asynchronously and concurrently. A receiver might be listening on multiple TCP ports, pushing data to a processor that is concurrently batching data, which is then fanned out to multiple exporters.

If you are developing a stateful processor (e.g., a tail-based sampler) or an exporter that queues data, you will be writing concurrent code.

**What you need to know:**
* **Goroutine Leaks:** If you start a goroutine in your component's `Start()` method, you *must* ensure it terminates when `Shutdown()` is called. Orphaned goroutines cause severe memory leaks in long-running Collector deployments.
* **The `sync` Package:** You must be adept at using `sync.WaitGroup` to wait for background workers to finish during shutdown, and `sync.RWMutex` to protect in-memory state (like caches or metric registries) from concurrent reads and writes.
* **Data Races:** The `go test -race` flag will be your best friend. The Collector's CI pipelines enforce strict race condition checks. 

### 4. Navigating Module Management and Dependency Hell

Dependency management in Go can be frustrating, and the OpenTelemetry ecosystem—with its rapid iteration and hundreds of disparate modules—pushes `go.mod` to its absolute limits.

The Collector is split across dozens of repositories and modules (e.g., `go.opentelemetry.io/collector/pdata`, `go.opentelemetry.io/collector/component`, etc.). Because you will be using the OpenTelemetry Collector Builder (`ocb`) to compile your custom code alongside upstream modules, version conflicts are common.

```text
Dependency Tree Complexity:

[Your Custom Component]
   │
   ├── requires ──> [go.opentelemetry.io/collector/component v0.90.0]
   │
   └── requires ──> [github.com/some/vendor-sdk v1.2.0]
                           │
                           └── requires ──> [go.opentelemetry.io/otel v1.19.0] 
                                                  (Conflict! Core collector requires v1.21.0)
```

**What you need to know:**
You must deeply understand how to use `replace` directives in your `go.mod` file during local development to point to local directories, and how to use `go mod tidy` effectively. When building custom components, it is critical to align the version of the OTel Collector libraries your component imports with the version of the Collector binary you intend to build via `ocb`.

### 5. Multi-Error Handling

In a pipeline handling batches of thousands of spans or metrics, a failure in one item should not necessarily invalidate the entire batch. The Collector extensively uses the `go.uber.org/multierr` package to aggregate multiple errors into a single error object.

**What you need to know:**
Instead of returning immediately on the first error, you will often collect errors during a loop and return them together at the end. 

```go
import "go.uber.org/multierr"

func (p *myProcessor) processBatch(ctx context.Context, batch []TelemetryItem) error {
    var errs error

    for _, item := range batch {
        if err := p.processItem(item); err != nil {
            // Append the error without breaking the loop
            errs = multierr.Append(errs, err)
        }
    }

    // Returns nil if errs is empty, otherwise returns the aggregated errors
    return errs
}
```

Mastering these five areas will significantly reduce the friction of developing custom components. The OTel Collector's codebase is heavily standardized; once you understand these foundational Go patterns, you will find that writing a custom component is highly structured and predictable.

## 22.2 Scaffolding and Writing a Custom Receiver

Receivers act as the entry point into the OpenTelemetry Collector pipeline. They are responsible for translating external telemetry data—whether pushed to an endpoint or pulled via scraping—into the Collector’s internal, unified memory representation known as `pdata` (pipeline data). Once translated, the receiver hands this data off to the next component in the pipeline, typically a processor, via a `consumer` interface.

Writing a custom receiver involves implementing a specific set of Go interfaces. While the OpenTelemetry ecosystem provides tools like `mdatagen` for generating metric-specific receiver boilerplates, understanding the underlying manual scaffolding is essential for deep architectural comprehension and for building complex or multi-signal receivers.

### 1. The Standard Component Layout

A well-structured custom component follows a predictable directory layout. This separation of concerns ensures that configuration parsing, instantiation, and execution logic remain strictly isolated.

```text
mycustomreceiver/
├── config.go       # Defines the YAML configuration structure and validation
├── factory.go      # Provides the Collector with hooks to instantiate the receiver
├── receiver.go     # Implements the core polling/listening and translation logic
├── receiver_test.go# Unit tests for the execution loop
└── go.mod          # Module definition, critical for ocb integration
```

### 2. Defining the Configuration (`config.go`)

Every receiver must define a configuration struct that represents its section in the Collector's YAML configuration file. This struct must embed the base configuration settings provided by the Collector SDK.

```go
package mycustomreceiver

import (
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/receiver/scraperhelper"
)

// Config defines the configuration for our custom receiver.
type Config struct {
	// Keep the base settings (like receiver ID)
	component.ReceiverSettings `mapstructure:",squash"`

	// Embed scraper settings if this is a pull-based receiver (e.g., polling intervals)
	scraperhelper.ScraperControllerSettings `mapstructure:",squash"`

	// Custom fields specific to your receiver
	Endpoint string `mapstructure:"endpoint"`
	APIKey   string `mapstructure:"api_key"`
}

// Validate ensures the configuration is valid before the Collector starts.
func (c *Config) Validate() error {
	if c.Endpoint == "" {
		return fmt.Errorf("endpoint must be specified")
	}
	return nil
}
```

### 3. Implementing the Factory (`factory.go`)

The Collector uses the factory pattern to discover and initialize your component. You must define a `NewFactory` function that returns a `receiver.Factory`. This factory tells the Collector what your default configuration looks like and provides the constructor functions for the signals (traces, metrics, or logs) your receiver supports.

```go
package mycustomreceiver

import (
	"context"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/receiver"
)

const (
	// typeStr must be unique across all components in your custom Collector
	typeStr   = "mycustom" 
	stability = component.StabilityLevelBeta
)

// NewFactory creates a factory for the custom receiver.
func NewFactory() receiver.Factory {
	return receiver.NewFactory(
		component.MustNewType(typeStr),
		createDefaultConfig,
		receiver.WithMetrics(createMetricsReceiver, stability),
		// Use WithTraces or WithLogs if your receiver handles those signals
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		Endpoint: "http://localhost:8080/metrics",
	}
}

func createMetricsReceiver(
	_ context.Context,
	params receiver.CreateSettings,
	baseCfg component.Config,
	consumer consumer.Metrics,
) (receiver.Metrics, error) {
	cfg := baseCfg.(*Config)
	
    // Instantiate the actual receiver struct defined in receiver.go
	return newCustomReceiver(cfg, params.Logger, consumer), nil
}
```

### 4. Writing the Receiver Logic (`receiver.go`)

The core of your component lives here. A receiver must implement the `component.Component` interface, meaning it requires `Start` and `Shutdown` methods. 

For a push-based receiver (like an HTTP or gRPC server listening for incoming payloads), `Start` will initialize the listener, and the handler will pass data to the consumer. For a pull-based receiver (like scraping an API), `Start` will launch a background goroutine containing a polling loop.

Below is an outline of a basic pull-based metrics receiver:

```go
package mycustomreceiver

import (
	"context"
	"time"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.uber.org/zap"
)

type customReceiver struct {
	config   *Config
	logger   *zap.Logger
	consumer consumer.Metrics
	cancel   context.CancelFunc
}

func newCustomReceiver(cfg *Config, logger *zap.Logger, nextConsumer consumer.Metrics) *customReceiver {
	return &customReceiver{
		config:   cfg,
		logger:   logger,
		consumer: nextConsumer,
	}
}

// Start boots up the receiver's main execution loop.
func (r *customReceiver) Start(ctx context.Context, host component.Host) error {
	// Create a cancellable context for graceful shutdown
	var pollingCtx context.Context
	pollingCtx, r.cancel = context.WithCancel(ctx)

	go r.startPolling(pollingCtx)
	return nil
}

// Shutdown gracefully stops the receiver.
func (r *customReceiver) Shutdown(ctx context.Context) error {
	if r.cancel != nil {
		r.cancel()
	}
	return nil
}

func (r *customReceiver) startPolling(ctx context.Context) {
	ticker := time.NewTicker(r.config.CollectionInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			r.logger.Info("Stopping custom receiver polling loop")
			return
		case <-ticker.C:
			r.scrapeAndConsume(ctx)
		}
	}
}

func (r *customReceiver) scrapeAndConsume(ctx context.Context) {
	// 1. Fetch data from external system (e.g., HTTP GET)
	rawData := r.fetchExternalData()

	// 2. Translate raw external data into OTel pdata format
	metrics := r.translateToPdata(rawData)

	// 3. Pass the standard pmetric.Metrics object to the next component
	err := r.consumer.ConsumeMetrics(ctx, metrics)
	if err != nil {
		r.logger.Error("Failed to pass metrics to consumer", zap.Error(err))
	}
}

// translateToPdata is where the critical mapping logic occurs
func (r *customReceiver) translateToPdata(data []MyCustomData) pmetric.Metrics {
	md := pmetric.NewMetrics()
	rm := md.ResourceMetrics().AppendEmpty()
	
    // Configure Resource Attributes (e.g., host.name)
	rm.Resource().Attributes().PutStr("custom.endpoint", r.config.Endpoint)
	
	sm := rm.ScopeMetrics().AppendEmpty()
	sm.Scope().SetName("mycustomreceiver")

	for _, item := range data {
		m := sm.Metrics().AppendEmpty()
		m.SetName("custom_system.active_requests")
		m.SetDescription("Number of active requests in the custom system")
		
        // Add Data Points
		dp := m.SetEmptyGauge().DataPoints().AppendEmpty()
		dp.SetIntValue(item.Value)
		dp.SetTimestamp(pmetric.NewTimestampFromTime(time.Now()))
	}

	return md
}
```

### 5. Best Practices for State and Translation

When writing the translation logic (like `translateToPdata` above), you interact heavily with the `go.opentelemetry.io/collector/pdata` module. This module uses a highly optimized, allocation-conscious internal structure. 

Notice the use of `.AppendEmpty()` in the code above. The `pdata` API strictly avoids returning pointers to structs that developers must manually allocate. Instead, you append empty elements to collections and mutate them in place. This design pattern minimizes garbage collection overhead in high-throughput environments—a fundamental requirement when writing production-grade OpenTelemetry Collector components.

## 22.3 Developing a Custom Processor for Proprietary Logic

Processors are the functional heart of the OpenTelemetry Collector. While receivers handle ingestion and exporters handle transmission, processors are responsible for the heavy lifting: filtering, batching, aggregating, and mutating telemetry data. 

You typically write a custom processor when off-the-shelf components (like the standard `attributes` or `transform` processors) cannot express your organization's specific business logic. Common use cases include enriching telemetry with proprietary metadata queried from internal caches, implementing complex multi-signal correlation algorithms, or executing highly specific Data Loss Prevention (DLP) redactions before data leaves your secure network boundary.

### 1. The Architecture of a Processor

Unlike receivers, where you are responsible for managing the polling or listening loops, processors sit in the middle of a synchronous or asynchronous execution chain. They receive a batch of `pdata` (pipeline data), perform an operation on it, and immediately pass it to the next consumer.

```text
+----------+      +---------------------------+      +----------+
|          |      |    Custom Processor       |      |          |
| Receiver | ---> | [ processTraces(pdata) ]  | ---> | Exporter |
|          |      |                           |      |          |
+----------+      +---------------------------+      +----------+
                        ^
                        | (Optional)
                  [ Internal Cache / API ]
```

To prevent developers from rewriting the complex boilerplate required to safely receive, process, and forward data (along with handling observability for the processor itself), the Collector provides the `processorhelper` package.

### 2. Leveraging `processorhelper`

When building a processor, you almost never implement the base `consumer.Traces` or `consumer.Metrics` interfaces directly from scratch. Instead, you use the `processorhelper` factory functions. This guarantees your processor conforms strictly to the Collector's context propagation, error handling, and self-telemetry standards.

Here is how you define a factory for a custom traces processor using `processorhelper`:

```go
package proprietaryprocessor

import (
	"context"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/processor/processorhelper"
)

const (
	typeStr   = "proprietary_enrichment"
	stability = component.StabilityLevelBeta
)

func NewFactory() processor.Factory {
	return processor.NewFactory(
		component.MustNewType(typeStr),
		createDefaultConfig,
		processor.WithTraces(createTracesProcessor, stability),
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		EnrichmentTier: "standard",
	}
}

func createTracesProcessor(
	ctx context.Context,
	set processor.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Traces,
) (processor.Traces, error) {
	pCfg := cfg.(*Config)
	
	// Initialize our custom logic handler
	enricher := newProprietaryEnricher(pCfg, set.Logger)

	// processorhelper automatically wraps our mutation logic with 
	// standard Collector consumer boilerplate.
	return processorhelper.NewTracesProcessor(
		ctx,
		set,
		cfg,
		nextConsumer,
		enricher.processTraces, // This is our core mutation function
		processorhelper.WithCapabilities(consumer.Capabilities{MutatesData: true}),
		processorhelper.WithStart(enricher.Start),
		processorhelper.WithShutdown(enricher.Shutdown),
	)
}
```

**Crucial detail:** Notice `processorhelper.WithCapabilities(consumer.Capabilities{MutatesData: true})`. You *must* flag `MutatesData: true` if your processor alters the `pdata` in place. If this is `false`, the Collector assumes the data is read-only and may share the same memory reference concurrently with other components, leading to catastrophic race conditions if you modify it.

### 3. Iterating and Mutating `pdata`

The actual processing logic resides in the function passed to `processorhelper` (in our case, `enricher.processTraces`). To modify data efficiently, you must deeply understand the hierarchical structure of `pdata`. 

For traces, the hierarchy is `Traces` -> `ResourceSpans` -> `ScopeSpans` -> `Spans`. To alter a specific span, you must iterate through these nested slices.

```go
package proprietaryprocessor

import (
	"context"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

type proprietaryEnricher struct {
	config *Config
	logger *zap.Logger
}

func newProprietaryEnricher(cfg *Config, logger *zap.Logger) *proprietaryEnricher {
	return &proprietaryEnricher{
		config: cfg,
		logger: logger,
	}
}

// Start and Shutdown satisfy the processorhelper lifecycle hooks
func (p *proprietaryEnricher) Start(ctx context.Context, host component.Host) error {
    // e.g., Open database connections or warm up internal caches here
	return nil
}

func (p *proprietaryEnricher) Shutdown(ctx context.Context) error {
	return nil
}

// processTraces is the core mutation engine. It receives a batch of traces,
// mutates them in memory, and returns them to be passed to the next consumer.
func (p *proprietaryEnricher) processTraces(ctx context.Context, td ptrace.Traces) (ptrace.Traces, error) {
	// 1. Iterate over ResourceSpans (typically grouped by Application/Service)
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rs := td.ResourceSpans().At(i)
		
		// Optional: We can read or mutate the Resource (e.g., host.name) here
		// resourceAttr := rs.Resource().Attributes()

		// 2. Iterate over ScopeSpans (grouped by the Instrumentation Library)
		for j := 0; j < rs.ScopeSpans().Len(); j++ {
			ss := rs.ScopeSpans().At(j)

			// 3. Iterate over the actual Spans
			for k := 0; k < ss.Spans().Len(); k++ {
				span := ss.Spans().At(k)

				// Execute proprietary business logic
				p.enrichSpan(span)
			}
		}
	}

	// Return the mutated pdata batch. 
	return td, nil
}

func (p *proprietaryEnricher) enrichSpan(span ptrace.Span) {
	// Example: Inject a proprietary billing tier based on an existing attribute
	if tenantID, ok := span.Attributes().Get("tenant.id"); ok {
		billingTier := p.lookupBillingTier(tenantID.AsString())
		
		// Mutate the span by inserting a new attribute
		span.Attributes().PutStr("proprietary.billing.tier", billingTier)
	}

	// Example: Scrubbing sensitive proprietary data from span names
	if span.Name() == "TopSecretInternalProcess" {
		span.SetName("Redacted_Process")
	}
}

func (p *proprietaryEnricher) lookupBillingTier(tenantID string) string {
	// In a real scenario, this might query an internal cache or structure
	// initialized during the enricher's Start() method.
	if tenantID == "VIP-123" {
		return "enterprise"
	}
	return p.config.EnrichmentTier
}
```

### 4. Performance Considerations for Processors

Processors sit in the hot path. A poorly written processor will cause immediate backpressure, resulting in dropped telemetry across your entire infrastructure.

* **Avoid Allocations in the Loop:** The triple-nested loops (Resource -> Scope -> Span) will run millions of times per minute in a high-throughput environment. Avoid declaring new maps, slices, or complex structs inside these loops. 
* **Use Caches for Lookups:** If your enrichment logic requires querying an external API or database (e.g., translating an IP to a data center location), you *must* utilize an LRU cache or an in-memory map. Making a blocking network call inside `processTraces` will stall the entire Collector pipeline.
* **Filter Early:** If your processor only needs to operate on spans matching specific criteria, check those criteria as early in the iteration as possible and use `continue` to skip irrelevant spans, saving CPU cycles.

## 22.4 Testing, Benchmarking, and Distributing Custom Components

A custom Collector component is not production-ready simply because it compiles. Because the OpenTelemetry Collector operates at the critical intersection of all your infrastructure and application telemetry, a buggy or unoptimized component can cause severe data loss, introduce latency, or crash the entire pipeline. 

Before deploying your custom receiver or processor, you must rigorously test its logic, benchmark its memory footprint, and package it securely into a deployable binary using the OpenTelemetry ecosystem tools.

### 1. Unit Testing with the Collector Framework

Testing Collector components requires simulating the pipeline. You need to mock the components that come before and after your custom code. Fortunately, the core repository provides excellent testing utilities via the `componenttest`, `processortest`, and `consumertest` packages.

When testing a processor, for example, your primary goal is to pass a known batch of `pdata` into the processor, let it mutate the data, and then intercept that data using a "sink" (a mock consumer) to verify the output.

```go
package proprietaryprocessor

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/processor/processortest"
)

func TestProprietaryEnricher(t *testing.T) {
	// 1. Create a mock sink to capture the processor's output
	sink := new(consumertest.TracesSink)

	// 2. Instantiate the processor using the test utilities
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	
	processor, err := factory.CreateTracesProcessor(
		context.Background(),
		processortest.NewNopCreateSettings(), // Provides a no-op logger and tracer
		cfg,
		sink,
	)
	require.NoError(t, err)

	// 3. Start the processor
	err = processor.Start(context.Background(), componenttest.NewNopHost())
	require.NoError(t, err)

	// 4. Generate mock telemetry data
	traces := ptrace.NewTraces()
	span := traces.ResourceSpans().AppendEmpty().ScopeSpans().AppendEmpty().Spans().AppendEmpty()
	span.Attributes().PutStr("tenant.id", "VIP-123")

	// 5. Push the data through the processor
	err = processor.ConsumeTraces(context.Background(), traces)
	require.NoError(t, err)

	// 6. Inspect the data captured by the sink
	require.Len(t, sink.AllTraces(), 1)
	outputTraces := sink.AllTraces()[0]
	outputSpan := outputTraces.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0)

	// 7. Assert that our proprietary logic worked
	tier, exists := outputSpan.Attributes().Get("proprietary.billing.tier")
	assert.True(t, exists)
	assert.Equal(t, "enterprise", tier.AsString())
}
```

### 2. Benchmarking for Allocation Efficiency

In the Collector, CPU speed is important, but **memory allocation is critical**. High allocation rates lead to aggressive Garbage Collection (GC) pauses, which cause backpressure and dropped telemetry. You must benchmark your components to ensure they do not allocate unnecessary memory during the hot-path execution loop.

Use standard Go benchmarking, but always run it with the `-benchmem` flag. 

```go
func BenchmarkProcessTraces(b *testing.B) {
	sink := new(consumertest.TracesSink)
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	processor, _ := factory.CreateTracesProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, sink)
	
	// Generate a large payload once
	payload := generateLargeMockTracesPayload(10000) 

	b.ReportAllocs() // Crucial for observing memory footprints
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		// We ignore the error for the benchmark loop
		_ = processor.ConsumeTraces(context.Background(), payload)
	}
}
```

When you run `go test -bench . -benchmem`, pay close attention to the `allocs/op` metric. If your processor is generating thousands of allocations per operation, you need to refactor your code to reuse memory, utilize `pdata`'s in-place mutation methods, or leverage `sync.Pool`.

### 3. Distributing Custom Components via `ocb`

Once your component is tested and optimized, it cannot be dynamically loaded into a pre-compiled Collector binary as a shared library. Go's strict static linking model requires you to compile a brand-new binary that includes your custom code alongside the core components you need.

This is done using the **OpenTelemetry Collector Builder (`ocb`)**. 

To use `ocb`, you define a `builder-config.yaml` manifest. This manifest specifies exactly which extensions, receivers, processors, and exporters should be compiled into your custom distribution.

```yaml
# builder-config.yaml
dist:
  name: acmecorp-collector
  description: "Acme Corp's internal OpenTelemetry Collector"
  output_path: ./bin
  otelcol_version: 0.90.0

exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.90.0
  - gomod: go.opentelemetry.io/collector/exporter/debugexporter v0.90.0

receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.90.0

processors:
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.90.0
  # Include your custom processor here
  - gomod: github.com/acmecorp/telemetry/proprietaryprocessor v0.1.0

# If your custom component is not yet published to a public Git repository,
# you must use the replace directive to point to your local filesystem.
replaces:
  - github.com/acmecorp/telemetry/proprietaryprocessor => ../proprietaryprocessor
```

With the manifest defined, you invoke the builder tool:

```bash
# Download the builder binary
go install go.opentelemetry.io/collector/cmd/builder@latest

# Generate and compile the custom Collector
builder --config=builder-config.yaml
```

The `ocb` tool performs several actions under the hood:
1. It generates a dynamic `main.go` file that imports all the modules specified in your configuration.
2. It generates a `components.go` file that wires up the factories for all included components.
3. It resolves dependencies and runs `go mod tidy`.
4. It executes `go build` to produce a highly optimized, statically linked binary.

The resulting binary (`acmecorp-collector` in the `./bin` directory) is a fully functional OpenTelemetry Collector. It runs exactly like the upstream distributions but includes your proprietary logic, ready to be containerized via Docker and deployed to your infrastructure.