Our observability journey has largely focused on the backend—controlled environments with predictable resources. However, the true user experience begins at the edge: in the browser and on the mobile device. Instrumenting client-side applications introduces radically different constraints. You are no longer observing a trusted system; you are operating in an ephemeral environment characterized by battery limits, unreliable networks, and strict security perimeters. This chapter explores extending OpenTelemetry to the frontend, bridging backend traces with Real User Monitoring (RUM) to achieve true end-to-end visibility.

## 10.1 Unique Challenges of Client-Side Browser Instrumentation

Instrumenting a backend microservice is an exercise in measuring a controlled environment. You dictate the runtime, the allocated memory, the network topology, and the security perimeter. Transitioning OpenTelemetry to the client-side browser inverts this paradigm entirely. The browser is a fundamentally hostile, constrained, and unpredictable environment. 

When extending your telemetry pipeline to the edge, you must account for challenges that simply do not exist in server-side observability.

### 1. The Untrusted Environment and Security Perimeters

The most critical architectural difference when instrumenting a browser is that the client is public. Any code, configuration, or API key shipped to the browser can be read by the end-user or malicious actors. 

You cannot embed raw OTLP exporter credentials (such as an AWS IAM role, a Splunk token, or a Honeycomb API key) directly into your frontend JavaScript. Doing so exposes your observability backend to arbitrary data injection, quota exhaustion, and denial-of-wallet attacks. 

To mitigate this, client-side telemetry mandates the deployment of a public-facing OpenTelemetry Collector acting as a telemetry gateway or Backend-For-Frontend (BFF).

```text
+-----------------+       Untrusted Network       +-------------------------+      Trusted Network      +------------------+
|                 |       (Public Internet)       |                         |      (Internal VPC)       |                  |
|  User Browser   | ----------------------------> |  Public OTel Collector  | ------------------------> | Internal OTel    |
|  (Web OTel SDK) |   OTLP/HTTP (No Secrets)      |  (Gateway / Rate Limit) |   OTLP/gRPC (mTLS)        | Collector/Vendor |
|                 |                               |                         |                           |                  |
+-----------------+                               +-------------------------+                           +------------------+
```

This public gateway must be heavily restricted. It requires aggressive rate limiting, payload size restrictions, and CORS (Cross-Origin Resource Sharing) configurations to ensure it only accepts telemetry from your specific frontend domains.

### 2. Context Propagation and CORS Preflight Penalties

As covered in Chapter 7, distributed tracing relies on propagating the W3C `traceparent` and `tracestate` headers. On the server, appending a header to an outbound HTTP request is trivial. In the browser, appending custom headers to cross-origin requests triggers browser security mechanisms.

If your frontend is hosted at `https://app.example.com` and makes an API call to `https://api.example.com`, injecting the `traceparent` header forces the browser to issue a CORS Preflight `OPTIONS` request before the actual `GET` or `POST` request.

```javascript
// A standard fetch request
fetch('https://api.example.com/data'); 
// Browser: Sends GET directly (Simple Request)

// A fetch request instrumented by OpenTelemetry
fetch('https://api.example.com/data', {
  headers: {
    'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
  }
}); 
// Browser: Sends OPTIONS first to check CORS, then sends GET (Preflighted Request)
```

This preflight request adds a full network round-trip to the API call latency. For users on high-latency networks (e.g., 3G mobile), adding OpenTelemetry can ironically degrade the performance you are trying to measure. You must carefully configure your `Propagator` to only inject headers into same-origin requests or specific, pre-approved cross-origin domains where the backend is explicitly configured to cache `OPTIONS` responses via the `Access-Control-Max-Age` header.

### 3. Payload Size and Core Web Vitals

Backend services easily absorb a 15MB OpenTelemetry SDK binary. In the browser, every kilobyte matters. Shipping the full suite of OpenTelemetry features can bloat your JavaScript bundle, directly negatively impacting Core Web Vitals like Largest Contentful Paint (LCP) and Interaction to Next Paint (INP).

To manage this, the OpenTelemetry Web SDK (`@opentelemetry/sdk-trace-web`) is highly modular. Unlike the Node.js SDK which provides a massive "batteries-included" auto-instrumentation package, browser instrumentation requires a selective, tree-shakable approach. You must manually compose the specific instrumentations you need (e.g., `DocumentLoadInstrumentation`, `FetchInstrumentation`, `XMLHttpRequestInstrumentation`) to ensure the instrumentation payload remains under 50-100KB compressed.

### 4. The Ephemeral Page Lifecycle and Telemetry Loss

Server-side processes run for days or weeks. A browser tab might exist for three seconds before the user abruptly closes it, navigates away, or the mobile OS suspends the browser tab in the background to save battery.

OpenTelemetry processors rely on batching (as detailed in Chapter 14) to optimize network egress. If the browser tab is closed while telemetry is sitting in the Web SDK's `BatchSpanProcessor` memory queue, that data is lost forever. You lose the exact telemetry—errors and high-latency spans—that likely caused the user to abandon the page in frustration.

To combat this, web-specific exporters often hook into the browser's `visibilitychange` event and utilize the `navigator.sendBeacon()` API or the `fetch` API with the `keepalive: true` flag. 

```javascript
// Conceptual representation of a web-aware exporter flush mechanism
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Force a synchronous flush of all queued spans before the 
    // browser terminates the execution thread.
    provider.forceFlush().then(() => {
      console.debug('Telemetry flushed on page hide');
    });
  }
});
```
*Note: While `sendBeacon` allows data to be transmitted after the page unloads, it only supports HTTP POST requests and has strict payload limits (typically ~64KB), requiring careful tuning of the `BatchSpanProcessor` size limits.*

### 5. Clock Skew and Timestamp Alignment

Distributed tracing relies heavily on chronological alignment to render waterfall diagrams. Backend servers utilize NTP (Network Time Protocol) to keep their clocks synchronized to within milliseconds. 

Client device clocks, however, are notoriously unreliable. Users may manually change their system time, or their device battery may die, causing the hardware clock to drift significantly. If a browser reports a span that started at 10:00:00 AM, but the server received the API request at 09:55:00 AM (server time), the resulting trace visualization will be broken, showing child spans executing minutes before their parents.

To maintain temporal accuracy, the OpenTelemetry Web SDK primarily relies on the `performance.now()` API, which provides a high-resolution, monotonically increasing timestamp relative to the time the page loaded (the `timeOrigin`), rather than relying on the device's wall-clock time (`Date.now()`). Even so, backend trace visualizers often have to apply clock-skew adjustment algorithms to align client-generated root spans with server-generated child spans.

## 10.2 Integrating Session Replay and Real User Monitoring (RUM)

Distributed tracing excels at answering *why* a backend request was slow, but it falls short in answering *how* that slowness impacted the user. A frontend API call might return in 50 milliseconds, but if the browser's main thread is locked up parsing a massive JavaScript bundle, the user experiences the application as frozen. 

Real User Monitoring (RUM) and Session Replay bridge this gap. By extending OpenTelemetry to capture user-centric telemetry, you create a continuous thread of observability from a mouse click in the browser down to a database query in your infrastructure.

### 1. The Unifying Thread: Session Context

The foundational requirement for integrating RUM and Session Replay with OpenTelemetry is a shared identifier. Without a unified `session.id`, your backend traces and your frontend user sessions exist in isolated silos, making root-cause analysis nearly impossible.

In browser instrumentation, a session is typically defined as a continuous period of user activity. The session ID must be generated on the client, persisted across page loads (usually via `sessionStorage` or cookies), and attached to every piece of telemetry emitted by the browser.

In the OpenTelemetry Web SDK, this is best implemented as a globally applied Resource Attribute.

```javascript
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { v4 as uuidv4 } from 'uuid';

// 1. Retrieve or initialize the Session ID
let sessionId = sessionStorage.getItem('app_session_id');
if (!sessionId) {
  sessionId = uuidv4();
  sessionStorage.setItem('app_session_id', sessionId);
}

// 2. Attach the Session ID to the OTel Resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'frontend-web-app',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.4.2',
  'session.id': sessionId,
  'browser.user_agent': navigator.userAgent,
  'browser.language': navigator.language,
});

// Pass this resource to your TracerProvider and MeterProvider
```

By ensuring `'session.id'` is attached at the `Resource` level, every span (like a `fetch` request or a route change) and every metric (like a Core Web Vital) automatically inherits this tag. 

### 2. Capturing Real User Monitoring (RUM) Telemetry

Standard OpenTelemetry browser instrumentation (`@opentelemetry/auto-instrumentations-web`) primarily focuses on network requests (`fetch`, `XHR`) and initial document loads. To build a robust RUM solution, you must expand this to capture two specific domains: **User Interactions** and **Core Web Vitals**.

**User Interactions:** The `@opentelemetry/instrumentation-user-interaction` package automatically creates spans for user events such as clicks, key presses, and form submissions. This transforms ambiguous backend traffic spikes into understandable user behaviors. A span named `click on "Checkout Button"` is infinitely more useful for debugging than a generic `POST /api/cart` span.

**Core Web Vitals:** Web Vitals—such as Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Interaction to Next Paint (INP)—are the industry standard for measuring user experience. While these can be represented as span events, they are mathematically best represented as OpenTelemetry **Metrics** (specifically Histograms), allowing you to alert on the 95th percentile of your users' LCP.

### 3. Integrating Session Replay

While RUM metrics tell you *that* an experience was poor, Session Replay shows you *what* the user actually saw. Session replay tools do not record video; instead, they record a stream of Document Object Model (DOM) mutations, mouse movements, and scroll events. This data is then reconstructed in the observability backend to play back a "video-like" representation of the user's screen.

OpenTelemetry does not natively support DOM mutation recording, as the payload sizes and data structures differ fundamentally from Traces, Metrics, and Logs. Therefore, integrating Session Replay requires running a specialized DOM-recording library (such as the open-source `rrweb` or a vendor-specific agent) alongside the OpenTelemetry SDK.

The architectural pattern for this integration relies on cross-pollinating identifiers between the two telemetry streams.

```text
+-----------------------------------------------------------------------+
|                             User Browser                              |
|                                                                       |
|  +-------------------------+                 +---------------------+  |
|  |    OpenTelemetry SDK    |                 | Session Replay Lib  |  |
|  |  (Traces/Metrics/Logs)  |                 |    (e.g., rrweb)    |  |
|  +-------------------------+                 +---------------------+  |
|               |                                         |             |
|               | <---------- Shared Session ID --------> |             |
|               |                                         |             |
+---------------|-----------------------------------------|-------------+
                |                                         |
                | (OTLP over HTTP)                        | (Custom HTTP)
                v                                         v
       +-----------------+                      +------------------+
       | OTel Collector  |                      | Replay Storage   |
       | (Gateway)       |                      | (Blob/DB/Vendor) |
       +-----------------+                      +------------------+
                |                                         |
                |          +------------------+           |
                +--------> | Observability UI | <---------+
                           | (Correlates via  |
                           |  session.id)     |
                           +------------------+
```

To achieve tight synchronization, the integration must go beyond just the `session.id`:

1. **Trace to Replay Linkage:** When an error occurs in the frontend, the OpenTelemetry SDK can capture the exact timestamp or the specific Replay "tick" and record it as a span attribute (e.g., `replay.timestamp = 162983749281`). 
2. **Replay to Trace Linkage:** The Session Replay payload can embed active `trace_id`s. If a user clicks a button that triggers a 5-second API call, the replay viewer can overlay the exact OpenTelemetry distributed trace waterfall directly alongside the video timeline of the frozen UI.

### 4. Privacy, PII, and Data Redaction

Recording DOM mutations introduces immense security and privacy risks. If your application handles passwords, credit card numbers, personal health information (PHI), or any Personally Identifiable Information (PII), Session Replay will capture these raw values as the user types them into inputs or as they render on the screen.

When integrating these tools, data sanitization must happen **client-side**, before the payload ever reaches the network.

* **Input Masking:** All password fields and sensitive inputs must be strictly ignored by the replay library. 
* **DOM Scrubbing:** Replay libraries typically offer CSS-class-based redaction (e.g., `.rr-block` or `.mask-pii`). Any DOM element carrying this class will have its text content replaced with asterisks (`***`) or blurred blocks before serialization.

Failing to strictly enforce client-side redaction transforms your observability pipeline into a massive compliance violation, exposing you to severe GDPR, CCPA, and HIPAA penalties. Telemetry is meant to measure the system, not spy on the user.

## 10.3 Utilizing OpenTelemetry Mobile SDKs (iOS and Android)

While browser-based telemetry contends with ephemeral sessions and CORS restrictions, mobile applications present an entirely different set of environmental hostilities. Mobile devices operate in a state of constant physical and network flux. Users seamlessly transition between high-speed Wi-Fi, spotty 4G cell towers, and complete offline isolation (e.g., entering a subway). Furthermore, the operating systems (iOS and Android) aggressively manage battery and memory, frequently suspending or terminating applications without warning.

To effectively instrument mobile applications, the OpenTelemetry ecosystem provides dedicated native SDKs: `opentelemetry-swift` for iOS/macOS and `opentelemetry-android` (which builds upon the core Java SDK) for Android. 

Deploying these SDKs requires architecting for the unique realities of the mobile ecosystem.

### 1. Intermittent Connectivity and Disk-Backed Caching

The standard OpenTelemetry `BatchSpanProcessor` holds telemetry in memory until a threshold is reached or a timer fires. On a mobile device, if a user loses cell reception and the app crashes or is terminated by the OS, all in-memory telemetry is permanently lost. This creates a dangerous blind spot: you lose the exact telemetry associated with the worst user experiences.

To guarantee telemetry delivery in a mobile environment, your pipeline must utilize **disk-backed caching**.

```text
+---------------------+       +-----------------------+       +-------------------------+
|  Mobile App Thread  |       |   OTel Memory Queue   |       |  Local Disk (SQLite)    |
|  (Generates Spans)  | ----> |  (BatchSpanProcessor) | ----> |  (Persistent Storage)   |
+---------------------+       +-----------------------+       +-------------------------+
                                                                          |
                                                                          | (Network Restored / App Restarted)
                                                                          v
                                                              +-------------------------+
                                                              |  OTLP Network Exporter  | ---> To OTel Gateway
                                                              +-------------------------+
```

When network connectivity drops, the OpenTelemetry mobile SDKs must spool outbound spans, metrics, and logs to local storage. Once the OS signals that network connectivity has been restored, a background worker process reads from this local cache and resumes exporting. This ensures that a crash report or a failed checkout trace generated on an airplane is successfully delivered hours later when the device reconnects to the internet.

### 2. Auto-Instrumenting Native Network Stacks

Just as frontend web applications use the `fetch` API, native mobile apps rely on heavily optimized network clients: `URLSession` on iOS and `OkHttp` or `HttpURLConnection` on Android.

Manual instrumentation of every network call is error-prone and pollutes the codebase. The mobile SDKs provide auto-instrumentation libraries that intercept these native networking calls at the framework level to automatically generate spans, record HTTP status codes, and, crucially, inject W3C trace context headers for distributed tracing.

**Example: iOS URLSession Instrumentation**

In Swift, you do not modify every network call. Instead, you initialize the `URLSessionInstrumentation` during app startup, which swizzles (intercepts) the standard URLSession delegate methods.

```swift
import OpenTelemetryApi
import OpenTelemetrySdk
import URLSessionInstrumentation

// 1. Initialize the Tracer Provider
let tracerProvider = TracerProviderBuilder()
    .add(spanProcessor: diskCachingSpanProcessor)
    .build()
OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)

// 2. Initialize Network Auto-Instrumentation
// This automatically hooks into URLSession to create spans and inject trace headers
let urlSessionInstrumentation = URLSessionInstrumentation(
    configuration: URLSessionInstrumentationConfiguration(
        shouldRecordPayload: false, // Prevent PII leaks
        injectCustomHeaders: { request in
            // Custom logic to only inject trace headers to known backend domains
            return request.url?.host == "api.yourdomain.com"
        }
    )
)
```

### 3. Application Lifecycle and App Start Metrics

A critical metric for mobile performance is App Start Time (the duration from the user tapping the app icon to the first frame being rendered). The OS handles app launches in two distinct ways:
* **Cold Start:** The app process does not exist in memory. The OS must allocate memory, load the binary, and initialize the application object.
* **Warm/Hot Start:** The app was suspended in the background and is merely brought to the foreground.

The OpenTelemetry mobile SDKs provide hooks to automatically capture these lifecycle events as spans. The `AppStart` span is particularly vital. Because OpenTelemetry initialization itself takes a few milliseconds, the SDKs hook into early native OS initialization events (like the `ContentProvider` lifecycle in Android) to capture the absolute earliest timestamp, ensuring the resulting `AppStart` span accurately reflects the system-level launch time, not just the time the OTel SDK finished booting.

Furthermore, lifecycle events dictate telemetry flushing. When the OS broadcasts a `didEnterBackground` (iOS) or `onStop` (Android) event, the SDK must force an immediate, synchronous flush of the memory queue to the disk cache or network before the OS freezes the process.

### 4. Managing Battery Drain and Cellular Data Constraints

Exporting telemetry consumes two highly protected resources on a mobile device: the battery (via radio usage) and the user's cellular data allowance. 

A poorly configured OpenTelemetry integration can result in the app constantly waking up the device's cellular radio to transmit a few kilobytes of spans, draining the battery and causing negative app store reviews.

To optimize for the mobile environment:
1.  **gRPC over HTTP/JSON:** Always configure the mobile OTLP exporter to use gRPC or HTTP/Protobuf. Protobuf payloads are significantly smaller than JSON, reducing data usage and shortening the time the radio must remain powered on.
2.  **Aggressive Batching:** Increase the `scheduleDelayMillis` in the `BatchSpanProcessor` compared to server-side configurations. Instead of flushing every 5 seconds, flush every 30 seconds or even 60 seconds to bundle more data into a single network request.
3.  **Network-Aware Exporting:** In highly optimized deployments, custom exporters are written to check the `NetworkCapabilities` (Android) or `NWPathMonitor` (iOS). If the device is on a metered cellular connection and the battery is low, the exporter can defer sending non-critical metrics and traces to the disk cache, only waking up the radio to transmit critical errors or waiting until the device is connected to unmetered Wi-Fi and charging.

## 10.4 Managing Client-Side Overhead and Payload Sizes

The fundamental paradox of client-side observability is the "Observer Effect": the act of measuring the performance of an application inherently degrades that performance. Every byte of telemetry logic added to a browser or mobile device consumes CPU cycles, memory, battery, and network bandwidth. If an OpenTelemetry deployment causes an e-commerce site to load half a second slower, the resulting loss in conversion rate will likely outweigh the value of the telemetry gathered.

Managing this overhead requires a defensive architectural posture, treating the OpenTelemetry SDK not as a free utility, but as a strict performance budget that must be actively managed.

### 1. Minimizing JavaScript Bundle Size and the Critical Path

In modern web development, the "Critical Rendering Path" dictates how quickly a browser can paint the initial pixels on the screen. Any JavaScript executed during this phase blocks the main thread, delaying the First Contentful Paint (FCP).

The OpenTelemetry Web SDK, while modular, can easily add 50KB to 150KB of compressed JavaScript to your application. If this is bundled into your primary `main.js` file, you are heavily taxing your users' initial load time.

To mitigate this, OpenTelemetry initialization should be decoupled from the critical path using **dynamic imports** and asynchronous execution. The application should load and render its primary UI first, and only instantiate the telemetry provider afterward.

```javascript
// anti-pattern: Synchronous import blocks the main thread during initial load
// import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

// Better approach: Asynchronously load telemetry after the window load event
window.addEventListener('load', () => {
  // Use a slight delay to ensure the browser has finished critical rendering
  setTimeout(() => {
    import('./telemetry-initializer.js')
      .then((module) => {
        module.initOpenTelemetry({
          serviceName: 'frontend-app',
          endpoint: 'https://otel.example.com/v1/traces'
        });
      })
      .catch((err) => console.error('Failed to load telemetry', err));
  }, 1000); // 1-second deferral
});
```
*Note: Deferring initialization means you will miss spans for the very beginning of the page load. To capture initial document load metrics while deferring the heavy SDK, you can utilize the browser's native `PerformanceObserver` API to capture the metrics natively, and then retroactively convert them into OpenTelemetry Spans once the SDK boots.*

### 2. Offloading Serialization to Web Workers

When the OpenTelemetry `BatchSpanProcessor` flushes its queue, it must serialize hundreds of spans into a JSON payload. In a browser, JavaScript is single-threaded. If the serialization of a large telemetry payload takes 50 milliseconds, the browser UI will freeze (drop frames) for that duration, leading to a "janky" user experience.

To protect the main thread, advanced client-side deployments utilize **Web Workers**. A Web Worker runs in a separate background thread, completely isolated from the UI.

```text
  Main UI Thread (Fast & Responsive)                 Background Web Worker Thread
+------------------------------------+             +----------------------------------+
|                                    |             |                                  |
| 1. User clicks button              |             |                                  |
| 2. App logic executes              |             |                                  |
| 3. OTel API creates Span           | -- postMessage() -> | 4. Span received in Worker       |
| 4. UI updates instantly            |             | 5. BatchSpanProcessor queues Span|
|                                    |             | 6. Worker serializes to JSON     |
|                                    |             | 7. Worker sends fetch() to OTLP  |
+------------------------------------+             +----------------------------------+
```

By intercepting the span export process and passing the raw span objects over the `postMessage` bridge, the heavy lifting of batching, JSON serialization, and network transmission is entirely removed from the user's perception.

### 3. Payload Compression and Transport Optimization

Once telemetry is serialized, transmitting it over the public internet presents another bottleneck. Sending raw JSON over HTTP/1.1 is incredibly inefficient. 

To reduce payload sizes, you must enforce strict limits and compression:

* **HTTP/Protobuf vs. JSON:** As discussed in the mobile context, Protobuf (Protocol Buffers) is a binary serialization format that is significantly smaller and faster to parse than JSON. While the Web SDK defaults to JSON over HTTP, utilizing the `@opentelemetry/exporter-trace-otlp-proto` package drastically reduces network egress size.
* **Gzip/Brotli Compression:** The browser's `fetch` API does not automatically compress outbound request bodies (unlike responses, which are automatically decompressed). If you are sending large batches of JSON, you should configure your exporter to apply client-side Gzip compression (or utilize a library like `pako`) before transmission, though this must be weighed against the CPU cost of compressing the data.
* **Attribute Truncation:** Ensure that span attributes are strictly bounded. A common mistake is dumping an entire API response payload or a massive Redux state tree into a span attribute, which inflates the OTLP payload size to megabytes. Use the `SpanLimits` configuration in your `TracerProvider` to enforce maximum string lengths and attribute counts.

### 4. Client-Side Sampling and Rate Limiting

The most effective way to manage telemetry overhead is simply to generate less of it. However, applying sampling at the client side requires extreme caution.

If you implement a simple probabilistic sampler on the client (e.g., only keeping 10% of traces), you risk **broken distributed traces**. If the client drops its root span, but the backend service still generates and exports child spans for that request, the backend spans will be "orphaned" in your observability tool, disconnected from their client-side context.

Instead of blanket probabilistic sampling, client-side overhead is best managed through:

1.  **Strict Rate Limiting:** Rather than sampling based on a percentage, implement a leaky bucket or token bucket rate limiter in the browser. Allow a maximum of, for example, 50 spans per minute per user. This protects both the client's network and your backend ingestion limits during infinite loop bugs or rapid user clicking.
2.  **Semantic Dropping:** Configure your instrumentations to ignore high-volume, low-value noise. For example, configure the `FetchInstrumentation` to explicitly ignore polling requests to `GET /api/health` or analytics requests to third-party marketing tools.
3.  **Session-Based Sampling:** If sampling is necessary for cost control, perform the sampling decision at the *session* level, not the request level. When the `session.id` is generated (as discussed in Section 10.2), use a deterministic hash of that ID to decide if the entire session should be recorded. This ensures that if a user is selected for telemetry, you receive 100% of their traces, providing a complete picture without broken correlation.