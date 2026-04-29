Modern applications rarely exist in isolation. Having mastered data persistence, we now turn to exposing that data to the world. Go was natively built for the internet, and its standard library provides an incredibly robust, production-ready HTTP toolkit. In this chapter, we will build secure, scalable REST APIs from the ground up. We will explore the inner mechanics of Go’s `net/http` package, evaluate modern routing strategies, design composable middleware pipelines, and implement industry practices like versioning and rate limiting to ensure our web services remain highly resilient.

## 13.1 HTTP Server and Client Basics with `net/http`

One of Go's most celebrated features is its standard library, and the `net/http` package stands out as a prime example of its power. Unlike many other languages where the standard library's HTTP package is relegated to development or basic scripts, Go's `net/http` is a production-grade, highly concurrent HTTP implementation. It is fully capable of serving high-traffic workloads without requiring a third-party framework or a reverse proxy like Nginx just to handle raw HTTP connections safely.

At the core of Go's HTTP ecosystem—both for serving and consuming—are a few elegant, heavily relied-upon interfaces and structs. 

### The Core Interface: `http.Handler`

Everything in Go's HTTP server architecture revolves around a single, remarkably simple interface: `http.Handler`. 

```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```

Any type that implements the `ServeHTTP` method can respond to HTTP requests. 
* **`*http.Request`**: A struct representing the incoming HTTP request (headers, body, URL, method, etc.). It is a pointer because it contains a substantial amount of data, and passing by reference avoids unnecessary memory allocations.
* **`http.ResponseWriter`**: An interface used to construct the HTTP response. Because it's an interface, you don't pass it as a pointer. It provides methods to write HTTP headers, the response body, and the HTTP status code.

### Building a Basic Server

To create an HTTP server, we need to register handlers to specific routes and then tell the server to listen for incoming connections. The standard library provides a default request multiplexer (router), `http.DefaultServeMux`, and a convenience function, `http.HandleFunc`, to quickly attach functions to it.

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

// helloHandler matches the http.HandlerFunc signature
func helloHandler(w http.ResponseWriter, r *http.Request) {
    // Only allow GET requests
    if r.Method != http.MethodGet {
        w.WriteHeader(http.StatusMethodNotAllowed)
        fmt.Fprintf(w, "Method not allowed")
        return
    }

    w.WriteHeader(http.StatusOK) // Explicitly set 200 OK (default behavior)
    fmt.Fprintf(w, "Hello, welcome to the Go server!\n")
}

func main() {
    // Register the handler function to the root route
    http.HandleFunc("/", helloHandler)

    fmt.Println("Server starting on port 8080...")
    // ListenAndServe blocks indefinitely unless an error occurs
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        log.Fatalf("Server failed to start: %v", err)
    }
}
```

In the example above, passing `nil` as the second argument to `http.ListenAndServe` instructs the server to use the `http.DefaultServeMux`. Under the hood, Go automatically spawns a new goroutine for every incoming HTTP request. This means your handlers are executing concurrently by default, making Go exceptionally efficient, but also requiring you to be mindful of race conditions when sharing state (as discussed in Chapter 10).

### Production-Ready Servers: Bypassing the Defaults

While `http.ListenAndServe` is great for local development, it is **dangerous in production**. It uses default settings that do not impose timeouts on reading requests or writing responses. A malicious user (or a slow network connection) could open thousands of connections, send data at a glacial pace, and exhaust your server's file descriptors—a classic Slowloris attack.

To build a robust server, you must instantiate an `http.Server` struct explicitly to enforce timeouts:

```go
package main

import (
    "log"
    "net/http"
    "time"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("System is operational"))
    })

    // Explicit Server configuration
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,              // Use our custom mux instead of the default
        ReadTimeout:  5 * time.Second,  // Max time to read the entire request
        WriteTimeout: 10 * time.Second, // Max time to write the response
        IdleTimeout:  120 * time.Second,// Max time connections remain idle (keep-alive)
    }

    log.Println("Production server listening on :8080")
    log.Fatal(srv.ListenAndServe())
}
```

### The HTTP Client

Just as `net/http` provides robust server tools, it provides an equally capable HTTP client. Similar to the server, there is a package-level default client (`http.Get`, `http.Post`), and just like the server, **you should almost never use it in production** because it lacks a default timeout. If the server you are calling hangs, your goroutine hangs forever.

#### The Client-Server Flow

```text
+-----------------------+                    +-----------------------+
|      HTTP Client      |                    |      HTTP Server      |
|                       |    1. Request      |                       |
|  client.Do(req)       | -----------------> |  Listens on port      |
|                       |                    |                       |
|                       |                    |  2. Multiplexer       |
|                       |                    |     Routes to Handler |
|                       |                    |                       |
|                       |    3. Response     |  3. ServeHTTP         |
|  resp.Body.Read()     | <----------------- |     w.Write(data)     |
|  resp.Body.Close()    |                    |                       |
+-----------------------+                    +-----------------------+
```

#### Writing a Resilient Client

To make safe external HTTP calls, define a custom `http.Client` with a strict `Timeout`. Furthermore, you should utilize `http.NewRequest` to construct the request, which allows you to manipulate headers before sending it via `client.Do`.

```go
package main

import (
    "fmt"
    "io"
    "log"
    "net/http"
    "time"
)

func fetchExternalData() {
    // 1. Create a customized client with a 3-second timeout
    client := &http.Client{
        Timeout: 3 * time.Second,
    }

    // 2. Construct the request
    req, err := http.NewRequest(http.MethodGet, "https://api.github.com/zen", nil)
    if err != nil {
        log.Fatalf("Failed to create request: %v", err)
    }

    // Add custom headers (e.g., authentication, content-type)
    req.Header.Add("Accept", "text/plain")
    req.Header.Add("User-Agent", "MasteringGo-App/1.0")

    // 3. Execute the request
    resp, err := client.Do(req)
    if err != nil {
        log.Fatalf("Request failed: %v", err)
    }
    
    // CRITICAL: Always defer the closure of the response body.
    // Failing to do so causes connection leaks.
    defer resp.Body.Close()

    // 4. Handle the response
    if resp.StatusCode != http.StatusOK {
        log.Fatalf("Unexpected status code: %d", resp.StatusCode)
    }

    bodyBytes, err := io.ReadAll(resp.Body)
    if err != nil {
        log.Fatalf("Failed to read response body: %v", err)
    }

    fmt.Printf("Response: %s\n", string(bodyBytes))
}
```

Notice the critical inclusion of `defer resp.Body.Close()`. When an HTTP response is received, the TCP connection remains open so it can be reused for subsequent requests (HTTP Keep-Alive). If you do not close the `Body` stream, the connection cannot be returned to the client's internal connection pool, leading to resource exhaustion over time. You must close the body even if you don't read from it.

## 13.2 Routing Strategies: Standard Library vs. Third-Party (Chi, Gorilla Mux)

While the `net/http` package provides the foundational `ServeMux` for handling incoming requests, building a modern RESTful API often requires more sophisticated routing capabilities. Developers need to extract variables from URLs (path parameters), restrict routes by HTTP method (GET, POST, PUT, DELETE), and seamlessly chain middleware. 

In the Go ecosystem, you generally have two paths for routing: leveraging the standard library (which received massive upgrades in Go 1.22) or utilizing a third-party package.

### The Standard Library Router (`net/http`)

For many years, Go's default `http.ServeMux` was intentionally minimalistic. It matched exact paths or prefixes but left HTTP method filtering and URL parameter extraction to the developer. However, starting with **Go 1.22**, the standard library introduced powerful routing enhancements that eliminated the need for third-party routers in many projects.

The modern `ServeMux` supports HTTP method specification and path wildcards natively.

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    mux := http.NewServeMux()

    // 1. Method-specific routing
    mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    // 2. Path parameters (Wildcards)
    mux.HandleFunc("GET /api/users/{id}", func(w http.ResponseWriter, r *http.Request) {
        // Extract the {id} wildcard using PathValue
        userID := r.PathValue("id")
        fmt.Fprintf(w, "Fetching user: %s", userID)
    })

    // 3. Exact matching vs. Prefix matching
    // "POST /items/" matches any path starting with /items/
    // "POST /items/{$}" matches exactly /items/ and nothing else
    mux.HandleFunc("POST /items/{$}", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Item created"))
    })

    http.ListenAndServe(":8080", mux)
}
```

**When to use it:** For greenfield projects using Go 1.22 or later, the standard library is often all you need. It introduces zero external dependencies, compiles instantly, and aligns perfectly with Go's philosophy of simplicity.

### Third-Party Routers: Why Look Elsewhere?

Even with the Go 1.22 upgrades, third-party routers remain highly relevant. They offer specialized features that the standard library omits by design, such as:
* **Regex-based routing:** Matching routes based on complex string patterns.
* **Ergonomic Middleware Chaining:** Cleanly applying cross-cutting concerns (logging, auth) to specific groups of routes.
* **Subrouting:** Breaking massive APIs into modular, maintainable routing files.

#### Chi (`go-chi/chi`): The Idiomatic Modern Choice

Chi has emerged as the standard-bearer for third-party routing in Go. Its defining feature is that it is **100% compatible with `net/http`**. Chi does not introduce a custom context or request object; it uses the standard `http.Handler` and `http.Request`.

Chi excels at composing large APIs through its intuitive middleware chaining and subrouting mechanics.

```go
package main

import (
    "net/http"
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    r := chi.NewRouter()

    // Global Middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Subrouting
    r.Route("/articles", func(r chi.Router) {
        r.Get("/", listArticles)       // GET /articles
        r.Post("/", createArticle)     // POST /articles
        
        // Inline subroute with a parameter
        r.Route("/{articleID}", func(r chi.Router) {
            // Route-specific middleware
            r.Use(ArticleCtxMiddleware) 
            
            r.Get("/", getArticle)     // GET /articles/123
            r.Put("/", updateArticle)  // PUT /articles/123
        })
    })

    http.ListenAndServe(":8080", r)
}

func getArticle(w http.ResponseWriter, r *http.Request) {
    // Chi provides a helper to extract URL parameters
    articleID := chi.URLParam(r, "articleID")
    w.Write([]byte("Article ID: " + articleID))
}
```

#### Gorilla Mux (`gorilla/mux`): The Legacy Heavyweight

Gorilla Mux is one of the oldest and most widely adopted routers in Go's history. It is highly featured, offering strict slash routing (differentiating between `/path` and `/path/`), host-based routing (routing based on domain names), and regular expression matching within URL parameters.

*Note: The Gorilla toolkit was briefly archived by its original maintainers before being adopted by a new core team. While perfectly stable, many new projects opt for Chi or the stdlib due to Gorilla Mux's slightly higher memory footprint and complex API.*

```go
package main

import (
    "net/http"
    "github.com/gorilla/mux"
)

func main() {
    r := mux.NewRouter()

    // Host-based routing and Regex constraints
    r.HandleFunc("/users/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        w.Write([]byte("User ID: " + vars["id"]))
    }).Host("api.example.com").Methods("GET")

    http.ListenAndServe(":8080", r)
}
```

### Strategy Comparison

Choosing a routing strategy dictates how your HTTP layer will scale as your codebase grows. Use the following baseline to guide your architectural decisions:

| Feature/Capability | `net/http` (Go 1.22+) | Chi (`go-chi`) | Gorilla Mux |
| :--- | :--- | :--- | :--- |
| **External Dependencies** | None (Built-in) | 1 (Lightweight) | 1 (Heavy) |
| **`http.Handler` Native** | Yes | Yes | Yes |
| **Path Variables** | Yes (`r.PathValue`) | Yes (`chi.URLParam`) | Yes (`mux.Vars`) |
| **Regex Path Matching** | No | Yes (via middleware/custom matchers) | **Yes (Built-in & Deep)** |
| **Middleware Ergonomics**| Verbose (Requires wrapper funcs) | **Excellent (Built-in `Use()`)** | Good (`Use()`) |
| **Subrouting / Groups** | Manual / Custom logic | **Excellent** | Good |
| **Best Use Case** | Greenfield apps, microservices with simple routes | Large REST APIs, heavy middleware usage | Legacy systems, complex Host/Regex routing needs |

**The Golden Rule for Routing in Go:** Start with the standard library `ServeMux`. If you find yourself writing custom wrappers just to group middleware or handle nested route prefixes cleanly, upgrade to Chi. Avoid large "frameworks" (like Gin or Fiber) unless their specific performance profiles or custom context objects solve a concrete problem your architecture faces.

## 13.3 Handling HTTP Requests, Query Parameters, and JSON Payloads

When a client makes a request to your Go server, all the information about that interaction is bundled into the `*http.Request` object. Mastering how to safely and efficiently extract data from this object is the bridge between a server that merely responds and an API that actually performs useful work.

To understand how to extract data, it helps to visualize the structure of an incoming request and where Go stores its components:

```text
+-------------------------------------------------------------+
|                        *http.Request                        |
+-------------------------------------------------------------+
| Method: "POST"                                              |
| URL:    /api/users?role=admin&active=true                   |
|         -> r.URL.Query() extracts the query string          |
+-------------------------------------------------------------+
| Header:                                                     |
|   Authorization: Bearer xyz...                              |
|   Content-Type: application/json                            |
|         -> r.Header.Get() retrieves specific headers        |
+-------------------------------------------------------------+
| Body: (io.ReadCloser)                                       |
|   {"username": "gopher", "email": "gopher@golang.org"}      |
|         -> json.NewDecoder() parses the payload             |
+-------------------------------------------------------------+
```

### Extracting Query Parameters

Query parameters are key-value pairs appended to the URL after a question mark (e.g., `/search?q=golang&page=2`). In Go, these are parsed automatically and stored in the `r.URL.Query()` map, which is of type `url.Values` (underneath, it's a `map[string][]string`).

```go
func searchHandler(w http.ResponseWriter, r *http.Request) {
    // r.URL.Query() parses the query string and returns a url.Values map.
    queryMap := r.URL.Query()

    // Get() returns the first value associated with the given key.
    // If the key is not present, it returns an empty string.
    searchTerm := queryMap.Get("q")
    if searchTerm == "" {
        http.Error(w, "Missing search term 'q'", http.StatusBadRequest)
        return
    }

    // Since a key can appear multiple times (?tag=go&tag=web), 
    // you can access the underlying slice directly if needed:
    tags := queryMap["tag"] 

    fmt.Fprintf(w, "Searching for: %s with tags: %v\n", searchTerm, tags)
}
```

### Reading HTTP Headers

Headers pass metadata between the client and server. Extracting them is straightforward using the `r.Header.Get()` method. 

```go
func authHandler(w http.ResponseWriter, r *http.Request) {
    // Header keys are automatically canonicalized (e.g., "authorization" 
    // becomes "Authorization").
    token := r.Header.Get("Authorization")
    
    if token == "" {
        // http.Error is a convenient helper for writing a string payload 
        // and a status code simultaneously.
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    fmt.Fprintf(w, "Token received: %s", token)
}
```

### Parsing JSON Payloads

In modern REST APIs, JSON is the lingua franca. The `*http.Request` contains a `Body` field, which implements the `io.ReadCloser` interface. 

To convert JSON into Go structs, we use the `encoding/json` package. Because `r.Body` is an `io.Reader`, we can stream the payload directly into the JSON decoder without loading the entire raw string into memory first.

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

// UserCreationRequest defines the expected JSON structure
type UserCreationRequest struct {
    Username string `json:"username"`
    Email    string `json:"email"`
    Age      int    `json:"age,omitempty"` // omitempty ignores missing fields
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    // 1. Ensure the method is POST
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // 2. Decode the JSON body into our struct
    var reqData UserCreationRequest
    
    // json.NewDecoder streams from the request body.
    decoder := json.NewDecoder(r.Body)
    
    // DisallowUnknownFields causes the decoder to return an error when the destination 
    // is a struct and the input contains object keys which do not match any
    // non-ignored, exported fields in the destination.
    decoder.DisallowUnknownFields()
    
    err := decoder.Decode(&reqData)
    if err != nil {
        http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
        return
    }

    // Note: Unlike the HTTP Client where YOU must close the response body, 
    // the HTTP Server automatically closes the request body for you when the handler returns.

    fmt.Fprintf(w, "Created user: %s (%s)", reqData.Username, reqData.Email)
}
```

### Hardening Your Endpoints: Limiting Payload Size

The example above works perfectly in a trusted environment. However, in production, reading directly from `r.Body` without limits is a severe security vulnerability. A malicious client could send a multi-gigabyte JSON file, causing your server to consume all available memory and crash (an Out-Of-Memory, or OOM, panic).

To defend against this, you should wrap `r.Body` with `http.MaxBytesReader`. This enforces a hard limit on how many bytes can be read from the incoming request.

```go
func secureCreateUserHandler(w http.ResponseWriter, r *http.Request) {
    // Limit the request body to 1 Megabyte (1 << 20 bytes)
    r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

    var reqData UserCreationRequest
    err := json.NewDecoder(r.Body).Decode(&reqData)
    if err != nil {
        // If the payload exceeds 1MB, Decode will return an error 
        // and the client connection will be safely terminated.
        http.Error(w, "Payload too large or invalid JSON", http.StatusRequestEntityTooLarge)
        return
    }

    // Process safely...
}
```

### Responding with JSON

Just as we decoded incoming JSON, we must encode Go structs back into JSON to send a response. This involves setting the correct `Content-Type` header, writing the HTTP status code, and streaming the encoded struct to the `http.ResponseWriter`.

```go
// APIResponse is a generic wrapper for our JSON responses
type APIResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
    Data    any    `json:"data,omitempty"` // Use 'any' (or interface{}) for flexible payloads
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
    // Fetch user data (simulated)
    userData := map[string]string{"id": "101", "name": "Alice"}

    // Construct the response
    resp := APIResponse{
        Success: true,
        Message: "User retrieved successfully",
        Data:    userData,
    }

    // 1. Always set the Content-Type header BEFORE calling w.WriteHeader
    w.Header().Set("Content-Type", "application/json")
    
    // 2. Write the status code
    w.WriteHeader(http.StatusOK)

    // 3. Encode the struct directly to the response writer
    if err := json.NewEncoder(w).Encode(resp); err != nil {
        // If encoding fails here, the status code is already sent,
        // but we should log the error internally.
        fmt.Printf("Error encoding response: %v\n", err)
    }
}
```

By streaming via `json.NewEncoder(w).Encode()`, you avoid allocating a temporary byte slice to hold the entire JSON string in memory, maintaining Go's signature high performance under heavy load.

## 13.4 Designing, Chaining, and Injecting Middleware

In robust web applications, you rarely want an HTTP request to hit your core business logic immediately. You typically need to perform a series of preliminary checks or tasks: logging the incoming request, authenticating the user, enforcing rate limits, or injecting request-scoped data. 

Middleware allows you to cleanly separate these cross-cutting concerns from your business logic. In Go, middleware is simply a function that wraps an `http.Handler`, executes some logic, and then optionally passes execution to the next handler in the chain.

You can visualize middleware as an onion. The request penetrates the layers from the outside in, hits the core handler, and the response flows back out through the same layers.

```text
Incoming Request 
       |
       v
+--------------------------------------------------+
| Logger Middleware                                |
|   +------------------------------------------+   |
|   | Auth Middleware                          |   |
|   |   +----------------------------------+   |   |
|   |   | Core Handler (Business Logic)    |   |   |
|   |   | w.Write("Hello!")                |   |   |
|   |   +----------------------------------+   |   |
|   +------------------------------------------+   |
+--------------------------------------------------+
       |
       v
Outgoing Response
```

### The Idiomatic Middleware Signature

The standard pattern for middleware in Go is a function that takes an `http.Handler` as its parameter and returns a new `http.Handler`. Because `http.HandlerFunc` acts as an adapter that allows regular functions to satisfy the `http.Handler` interface, middleware is almost always written using closures.

```go
func MyMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Code executed BEFORE the core handler
        fmt.Println("Before request...")

        // 2. Pass control to the next handler in the chain
        next.ServeHTTP(w, r)

        // 3. Code executed AFTER the core handler finishes
        fmt.Println("After request...")
    })
}
```

### Designing a Logging Middleware

Let's build a practical middleware that logs the HTTP method, URL path, and the time it took to process the request. 

```go
package main

import (
    "log"
    "net/http"
    "time"
)

// LoggingMiddleware logs the duration of each HTTP request.
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Pass execution to the next handler
        next.ServeHTTP(w, r)

        // Calculate and log the duration once the handler returns
        duration := time.Since(start)
        log.Printf("[%s] %s %v", r.Method, r.URL.Path, duration)
    })
}
```

### Injecting Context Data: The Authentication Middleware

Middleware often needs to pass data down the chain to the core handler. For example, an authentication middleware verifies a token and extracts the user's ID. The core handler needs that ID, but the `http.Handler` signature (`w http.ResponseWriter, r *http.Request`) cannot be altered.

The solution is the `context` package. Every `*http.Request` carries a `Context`, which can store request-scoped data safely. 

**Best Practice:** Always use custom, unexported types for context keys. Using built-in types like `string` can lead to key collisions between different packages.

```go
package main

import (
    "context"
    "fmt"
    "net/http"
)

// 1. Define a custom, unexported type for the context key
type contextKey string
const userIDKey contextKey = "userID"

// AuthMiddleware simulates verifying a token and injecting the User ID
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        
        // Simulated token check
        if token != "Bearer secret-token" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return // Halt the chain here; do NOT call next.ServeHTTP
        }

        // 2. Create a new context containing the user ID
        ctx := context.WithValue(r.Context(), userIDKey, "user_123")
        
        // 3. Create a new request derived from the old one, but with the new context
        reqWithCtx := r.WithContext(ctx)

        // 4. Pass the modified request to the next handler
        next.ServeHTTP(w, reqWithCtx)
    })
}

func profileHandler(w http.ResponseWriter, r *http.Request) {
    // 5. Extract the value from the context in the core handler
    userID, ok := r.Context().Value(userIDKey).(string)
    if !ok {
        http.Error(w, "User ID not found in context", http.StatusInternalServerError)
        return
    }

    fmt.Fprintf(w, "Welcome to your profile, %s!", userID)
}
```

Notice that if the authentication fails, the middleware calls `http.Error` and explicitly uses `return`. This prevents `next.ServeHTTP` from ever executing, effectively aborting the request and protecting your core handler from unauthorized access.

### Chaining Middleware

When you only have one middleware, wrapping the handler is straightforward:
`http.Handle("/profile", AuthMiddleware(http.HandlerFunc(profileHandler)))`

However, as your application grows, wrapping multiple middlewares becomes nested and unreadable:
`LoggingMiddleware(RecoverMiddleware(AuthMiddleware(CORS(myHandler))))`

#### Manual Chaining (Variadic Functions)

To solve this natively without third-party dependencies, you can write a simple helper function that takes a slice of middlewares and chains them together.

```go
// Middleware defines the standard signature
type Middleware func(http.Handler) http.Handler

// Chain applies middlewares to a handler in the order they are passed
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
    // Loop backwards to ensure the first middleware executes first
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

func main() {
    mux := http.NewServeMux()
    
    // Core handler
    finalHandler := http.HandlerFunc(profileHandler)

    // Chain them cleanly
    wrappedHandler := Chain(
        finalHandler,
        LoggingMiddleware, // Executes 1st
        AuthMiddleware,    // Executes 2nd
    )

    mux.Handle("/profile", wrappedHandler)
    http.ListenAndServe(":8080", mux)
}
```

#### Third-Party Chaining

If you are using a third-party router like Chi (as discussed in Section 13.2), middleware chaining is baked directly into the router's API. This is one of the primary reasons developers adopt it.

```go
// Example using go-chi/chi
r := chi.NewRouter()

// Global middleware applied to all routes
r.Use(LoggingMiddleware)

// Group routes to apply specific middleware (like Auth) only to them
r.Group(func(r chi.Router) {
    r.Use(AuthMiddleware)
    r.Get("/profile", profileHandler)
    r.Get("/settings", settingsHandler)
})
```

Regardless of how you chain them, the underlying architecture remains the same: closures wrapping `http.Handler` passing state via `r.Context()`. This functional approach keeps Go's HTTP server incredibly lightweight and composable.

## 13.5 API Best Practices: Versioning, Pagination, and Rate Limiting

Building an API that returns the correct JSON payload is only the first step. For an API to be considered production-ready, it must be stable for existing clients, efficient with server resources, and protected against accidental or malicious abuse. This requires implementing versioning, pagination, and rate limiting.

### 1. API Versioning

Once an API is consumed by external clients (mobile apps, partner services, or customer integrations), you lose control over when those clients update. If you change a response structure or require a new mandatory field, you will break existing integrations. Versioning solves this by allowing multiple iterations of your API to coexist.

There are two primary strategies for API versioning:

1.  **URI Path Versioning (Recommended for simplicity):** `GET /v1/users` vs. `GET /v2/users`
2.  **Header Versioning (Content Negotiation):** `GET /users` with a header `Accept: application/vnd.mycompany.v2+json`

In Go, URI path versioning is remarkably easy to implement using standard routing capabilities. By utilizing subrouters (or `ServeMux` prefixes), you can isolate different versions of your handlers.

```go
package main

import (
    "net/http"
)

func main() {
    mux := http.NewServeMux()

    // v1 Handlers
    mux.HandleFunc("GET /v1/users", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"version": 1, "data": [{"name": "Alice"}]}`))
    })

    // v2 Handlers (perhaps v2 adds new fields or changes the structure)
    mux.HandleFunc("GET /v2/users", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"version": 2, "data": [{"firstName": "Alice", "lastName": "Smith"}]}`))
    })

    http.ListenAndServe(":8080", mux)
}
```

**Best Practice:** Do not create a new version for purely additive changes (like adding a new optional field to a JSON response). Only bump the version for **breaking changes**, such as deleting a field, changing a data type, or altering the core business logic of an endpoint.

### 2. Pagination

If an endpoint returns a list of resources (e.g., `/users`), returning all 100,000 records in a single JSON array will exhaust your database's memory, saturate the network, and crash the client parsing it. Pagination divides the result set into manageable chunks.

There are two dominant pagination models:

#### Offset-Based Pagination
The client specifies how many records to skip (`offset`) and how many to take (`limit`). 
* **Pros:** Easy to implement, allows skipping to a specific page (e.g., "Page 5").
* **Cons:** Becomes extremely slow on large datasets because the database must compute and skip all preceding rows before returning the requested chunk.

```go
func getUsersHandler(w http.ResponseWriter, r *http.Request) {
    // 1. Extract query parameters
    query := r.URL.Query()
    
    // 2. Parse and apply safe defaults
    limit := parseQueryInt(query.Get("limit"), 10)   // Default to 10
    offset := parseQueryInt(query.Get("offset"), 0)  // Default to 0

    // 3. Enforce maximums to prevent abuse (e.g., ?limit=1000000)
    if limit > 100 {
        limit = 100
    }

    // Example DB call: SELECT * FROM users LIMIT $1 OFFSET $2
    // db.Query(query, limit, offset)

    // ... return JSON response
}
```

#### Cursor-Based (Keyset) Pagination
Instead of an offset, the client provides a unique, sequential identifier (the "cursor") from the last item of the previous page. The server then fetches the next set of items strictly greater than that cursor.
* **Pros:** Highly performant, even for millions of records. Immune to data shifting (where inserting a new row messes up the offset count).
* **Cons:** Cannot jump directly to "Page 10" without fetching pages 1-9 first.

```text
Cursor Pagination Flow:

1. Client requests initial data: GET /users?limit=2
   Server returns: [User_1, User_2]. NextCursor: "User_2_ID"

2. Client requests next page: GET /users?limit=2&cursor=User_2_ID
   DB Query executes: SELECT * FROM users WHERE id > 'User_2_ID' LIMIT 2
   Server returns: [User_3, User_4]. NextCursor: "User_4_ID"
```

### 3. Rate Limiting

Rate limiting restricts how many requests a client can make within a specified time window. It protects your application from DDoS attacks, brute-force login attempts, and overly aggressive API consumers.

The most common algorithm used in Go for rate limiting is the **Token Bucket**.

```text
+-----------------------+
|      Token Bucket     |  <-- Tokens are added at a fixed rate (e.g., 1 per second)
|   [o] [o] [o] [o]     |  <-- Bucket has a maximum capacity (burst size)
+-----------------------+
           |
   Incoming Request
           |
   Does bucket have a token?
      /              \
    YES               NO
   /                    \
Take 1 token.       Reject request.
Process Request.    Return HTTP 429 Too Many Requests.
```

Go provides a highly optimized implementation of this algorithm in the `golang.org/x/time/rate` package. We can implement this as middleware.

Below is an example of a simple rate limiter applied to an HTTP handler. *Note: In a real-world scenario, you would typically maintain a map of limiters keyed by the client's IP address or API key, rather than a single global limiter.*

```go
package main

import (
    "net/http"
    "golang.org/x/time/rate"
)

// Create a limiter that allows 2 requests per second, with a maximum burst of 5.
var limiter = rate.NewLimiter(2, 5)

// RateLimitMiddleware blocks requests if the rate limit is exceeded
func RateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        
        // Allow() consumes one token. Returns false if no tokens are available.
        if !limiter.Allow() {
            http.Error(w, "429 Too Many Requests - Slow down!", http.StatusTooManyRequests)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func main() {
    mux := http.NewServeMux()
    
    // Core handler
    apiHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("API Response Data"))
    })

    // Wrap the handler with the rate limiter
    mux.Handle("/api/data", RateLimitMiddleware(apiHandler))

    http.ListenAndServe(":8080", mux)
}
```

For distributed cloud-native applications running multiple instances of a Go server, an in-memory rate limiter like `x/time/rate` is insufficient because each server instance has its own bucket. In Chapter 14 and beyond, we will explore using a centralized data store, like Redis, to maintain global rate limits across a cluster.