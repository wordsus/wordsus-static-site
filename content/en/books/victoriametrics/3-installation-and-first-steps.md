With the foundational concepts and architectural patterns established, it is time to put theory into practice. This chapter provides a hands-on guide to getting your first VictoriaMetrics instance up and running. 

Whether you prefer executing the remarkably lightweight standalone binary or deploying a reproducible containerized environment via Docker, the installation process is designed for absolute simplicity. We will explore the essential configuration flags needed to tailor the database to your environment, and conclude by manually writing and reading your first data points. By the end of this chapter, your database will be ready for action.

## 3.1 Downloading and Running the Standalone Binary

The most straightforward way to get started with VictoriaMetrics is by utilizing the standalone binary. Because VictoriaMetrics is written in Go, the single-node version compiles down to a statically linked executable. This means it carries zero external dependencies—no Java Virtual Machine, no external libraries, and no complex installation wizards. You simply download the file, extract it, and execute it. 

### Sourcing the Right Binary

Official binaries for all supported architectures are hosted on the VictoriaMetrics GitHub repository under the **Releases** page. You will need to identify the correct archive for your operating system (Linux, macOS, or Windows) and architecture (amd64, arm64, etc.).

For a standard Linux environment running on an x86_64 processor, you can download the latest stable release using `wget` or `curl`. 

```bash
# Define the version you wish to download
export VM_VERSION="v1.99.0"

# Download the compressed tarball using wget
wget https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/${VM_VERSION}/victoria-metrics-linux-amd64-${VM_VERSION}.tar.gz
```

*Note: Always check the official GitHub releases page for the most current version number, as the ecosystem iterates rapidly.*

### Extraction and Directory Structure

Once the download completes, extract the archive. The tarball is intentionally minimalist; it does not contain sprawling directory structures or scattered configuration files. 

```bash
# Extract the binary
tar -xzf victoria-metrics-linux-amd64-${VM_VERSION}.tar.gz
```

After extraction, you will find a single executable file named `victoria-metrics-prod`.

### Execution and the Data Directory

To start the time series database, invoke the binary directly from your terminal. VictoriaMetrics is designed to be "secure and functional by default," meaning it requires no initial configuration file to boot successfully.

```bash
./victoria-metrics-prod
```

When you start the binary without any explicit flags, VictoriaMetrics makes a few immediate assumptions:
1. It binds to the default port **8428** on all available network interfaces (`0.0.0.0`).
2. It automatically creates a new directory named `victoria-metrics-data` in the current working directory to store all time-series data, indexes, and metadata.

Below is a plain text representation of your local directory structure before and after executing the binary for the first time:

```text
======================================================
Directory State: Pre-Execution
======================================================
/opt/victoriametrics/
 ├── victoria-metrics-linux-amd64-v1.99.0.tar.gz
 └── victoria-metrics-prod       <-- The static binary

======================================================
Directory State: Post-Execution
======================================================
/opt/victoriametrics/
 ├── victoria-metrics-linux-amd64-v1.99.0.tar.gz
 ├── victoria-metrics-prod
 └── victoria-metrics-data/      <-- Auto-created upon startup
      ├── data/                  (Compressed raw metric data)
      ├── indexdb/               (Inverted index for fast lookups)
      ├── metadata/              (Internal metadata and state)
      ├── snapshots/             (Directory for future backups)
      └── flock.lock             (Prevents concurrent process access)
```

In your terminal window, you will see startup logs indicating that the server is initializing the storage components and starting the HTTP listener. The output will look similar to this:

```text
2026-04-28T03:45:12.123Z info VictoriaMetrics/lib/logger/flag.go:12	build version: victoria-metrics-20240428-034512-tags-v1.99.0-0-gabcdef123
2026-04-28T03:45:12.124Z info VictoriaMetrics/lib/logger/flag.go:13	command line flags
2026-04-28T03:45:12.124Z info VictoriaMetrics/app/victoria-metrics/main.go:50	starting VictoriaMetrics at ":8428"...
2026-04-28T03:45:12.125Z info VictoriaMetrics/app/victoria-metrics/main.go:62	opened storage at "victoria-metrics-data" in 0.001 seconds
```

### Verifying the Process is Alive

With the process running in your terminal (or pushed to the background), you can verify the health of your newly spun-up database by querying its HTTP endpoint. Open a new terminal session and use `curl` to ping the server:

```bash
curl http://localhost:8428/ping
```

If the server is running correctly, it will respond simply with:
```text
OK
```

You can also navigate to `http://localhost:8428/` in your web browser. This will bring up the default landing page, which provides links to the built-in VMUI (VictoriaMetrics User Interface), internal metric dashboards, and troubleshooting endpoints.

## 3.2 Deploying the Single-Node Version via Docker

While running the standalone binary is excellent for quick testing and minimal environments, containerization is the industry standard for reproducible deployments, scaling, and integration into modern infrastructure pipelines. Deploying VictoriaMetrics via Docker encapsulates the application and its dependencies, ensuring it runs identically across development, staging, and production environments.

VictoriaMetrics provides official, highly optimized Docker images hosted on Docker Hub under the `victoriametrics/victoria-metrics` repository. These images are built "from scratch" containing only the compiled binary and necessary CA certificates, resulting in an exceptionally small attack surface and image size.

### The Basic `docker run` Command

To deploy the single-node version using the Docker CLI, you must map the internal port to your host machine and, crucially, mount a host volume to ensure data persistence. Without a volume mount, any time-series data ingested will be destroyed the moment the container is removed or updated.

```bash
# Create a local directory for persistent data storage
mkdir -p /opt/victoriametrics/data

# Run the VictoriaMetrics container
docker run -d \
  --name victoria-metrics \
  -p 8428:8428 \
  -v /opt/victoriametrics/data:/victoria-metrics-data \
  victoriametrics/victoria-metrics:v1.99.0
```

Let us break down the flags used in this command:
* `-d`: Runs the container in detached mode (in the background).
* `--name victoria-metrics`: Assigns a recognizable name to the container for easier management.
* `-p 8428:8428`: Maps port `8428` on the host to port `8428` inside the container, allowing HTTP access.
* `-v /opt/...:/victoria-metrics-data`: Binds the host directory to the default data directory inside the container.

### Understanding the Container-to-Host Mapping

When deploying databases via Docker, understanding the relationship between the host OS and the containerized environment is critical for troubleshooting and backup strategies.

```text
======================================================================
                  DOCKER DEPLOYMENT ARCHITECTURE
======================================================================

 [ Host Operating System ]               [ Docker Container ]
                                         (victoriametrics/victoria-metrics)
 ┌────────────────────────┐              ┌────────────────────────┐
 │                        │  Port Map    │                        │
 │ HTTP Traffic (:8428)   │◄────────────►│ Internal Port (:8428)  │
 │                        │ -p 8428:8428 │                        │
 │                        │              │                        │
 │                        │ Volume Mount │                        │
 │ Persistent Storage     │◄────────────►│ Ephemeral File System  │
 │ /opt/vm/data/          │ -v /...:/... │ /victoria-metrics-data/│
 └────────────────────────┘              └────────────────────────┘
             ▲
             │
      (Data survives container 
       restarts and upgrades)
```

### Deploying with Docker Compose

For production deployments or environments where VictoriaMetrics will run alongside other services (such as Grafana or Promtail), Docker Compose is the recommended approach. It allows you to declare your entire monitoring stack configuration in a single YAML file.

Create a file named `docker-compose.yml` with the following configuration:

```yaml
version: '3.8'

services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.99.0
    container_name: victoriametrics
    ports:
      - "8428:8428"
    volumes:
      - vm_data:/victoria-metrics-data
    command:
      - "--retentionPeriod=1y"
    restart: always

volumes:
  vm_data:
    driver: local
```

**Key Advantages of the Compose Approach:**
1.  **Managed Volumes:** Instead of hardcoding host paths, we use Docker-managed volumes (`vm_data`). Docker handles the exact placement on the host filesystem, preventing permission issues that often occur with direct bind mounts.
2.  **Configuration via Command:** We pass VictoriaMetrics configuration flags directly through the `command` array. In this example, `--retentionPeriod=1y` instructs the database to keep data for one year.
3.  **Automatic Restarts:** The `restart: always` policy ensures that if the host machine reboots or the database crashes, the Docker daemon will automatically attempt to restart it.

To spin up the service using this file, run:

```bash
docker-compose up -d
```

### Verifying Container Health and Logs

Once the deployment command is executed, you should verify that the container started successfully and that there are no permission errors regarding the storage volume.

To check the operational logs:
```bash
# If using basic Docker
docker logs -f victoria-metrics

# If using Docker Compose
docker-compose logs -f victoriametrics
```

Look for lines indicating that the storage was successfully opened and the HTTP server is listening. If you see errors related to `cannot open directory`, it typically means the container user (which runs as a non-root user in newer versions of the image) does not have write permissions to the mounted host directory. 

Finally, just as with the standalone binary, you can verify the deployment by querying the HTTP endpoint from your host:

```bash
curl http://localhost:8428/ping
```

## 3.3 Understanding Basic Configuration Flags

VictoriaMetrics takes a remarkably minimalist approach to configuration. Instead of relying on sprawling YAML, INI, or TOML files for its core database settings, the single-node version is configured almost entirely via command-line flags. This design choice aligns perfectly with modern twelve-factor app principles, making the database incredibly easy to configure via environment variables and orchestration tools like Kubernetes or Docker Compose.

While VictoriaMetrics ships with hundreds of flags to accommodate edge cases and deep performance tuning, it is designed to run perfectly well with its defaults. However, as you move toward a production deployment, there are a few fundamental flags you must understand.

### Discovering Available Flags

Because the ecosystem evolves quickly, the most accurate source of truth for configuration is the binary itself. You can view the comprehensive list of available flags, along with their current default values and descriptions, by passing the `-help` flag:

```bash
./victoria-metrics-prod -help
```

*Note: VictoriaMetrics treats single-dash (`-flag`) and double-dash (`--flag`) syntax identically. You can use whichever convention you prefer.*

### The "Big Three" Essential Flags

For 90% of basic deployments, you will only need to modify three core parameters: data retention, storage location, and network binding.

#### 1. Data Retention (`-retentionPeriod`)
By default, VictoriaMetrics retains data for **1 month**. Data older than the configured retention period is automatically deleted in the background. 

* **Syntax:** You can specify the duration in months (default if no unit is provided), days (`d`), weeks (`w`), or years (`y`). 
* **Examples:** * `-retentionPeriod=14d` (14 days)
    * `-retentionPeriod=6` (6 months)
    * `-retentionPeriod=1y` (1 year)
    * `-retentionPeriod=100y` (Effectively infinite retention)

#### 2. Storage Directory (`-storageDataPath`)
As seen in previous sections, the default behavior is to create a folder named `victoria-metrics-data` in the directory where the binary is executed. In production, you typically want to point this to a specific, high-performance mounted disk (like an SSD or NVMe drive).

* **Example:** `-storageDataPath=/mnt/fast-ssd/vm-data`

#### 3. Network Binding (`-httpListenAddr`)
By default, VictoriaMetrics listens on port `8428` across all available network interfaces (`:8428`). You may need to change this to avoid port conflicts or to restrict access strictly to the local loopback interface for security reasons.

* **Examples:**
    * `-httpListenAddr=127.0.0.1:8428` (Listens only on localhost)
    * `-httpListenAddr=:9090` (Changes the port to 9090, often used to mimic Prometheus)

### Basic Resource Management Flags

VictoriaMetrics is famously efficient, but you can explicitly define its resource boundaries to prevent it from starving other applications running on the same host.

* **`-memory.allowedPercent`**: This determines the maximum percentage of total system RAM VictoriaMetrics will use for its various internal caches. The default is **60%**. If you are running VictoriaMetrics on a dedicated server, this default is optimal. If sharing a server, you might lower this: `-memory.allowedPercent=30`.
* **`-memory.allowedBytes`**: An alternative to the percentage flag, allowing you to set a hard limit in bytes (e.g., `-memory.allowedBytes=4GB`). 

### Putting It All Together

How you pass these flags depends entirely on your deployment method. Below is a comparison of how to apply the exact same configuration profile across a standalone binary deployment and a Docker deployment.

**Goal Configuration:** Keep data for 1 year, store it in `/opt/data`, bind to port `9090`, and restrict memory usage to 40%.

**Method A: Standalone Binary**
```bash
./victoria-metrics-prod \
  -retentionPeriod=1y \
  -storageDataPath=/opt/data \
  -httpListenAddr=:9090 \
  -memory.allowedPercent=40
```

**Method B: Docker Compose**
When using Docker Compose, flags are passed as an array of strings to the `command` directive. Notice that we map the host directory to the internal `/opt/data` path defined by `-storageDataPath`.

```yaml
version: '3.8'
services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.99.0
    ports:
      - "9090:9090"
    volumes:
      - /mnt/host/disk:/opt/data
    command:
      - "-retentionPeriod=1y"
      - "-storageDataPath=/opt/data"
      - "-httpListenAddr=:9090"
      - "-memory.allowedPercent=40"
```

### Advanced: Passing Flags via Environment Variables

If your deployment environment makes passing command-line arguments difficult, VictoriaMetrics supports reading configuration via environment variables through a specific flag mapping feature. By starting the process with `-envflag.enable=true`, every command-line flag can be set using an environment variable formatted as `VM_FLAGNAME`.

For example, to set the retention period using environment variables:

```bash
export VM_retentionPeriod=1y
export VM_httpListenAddr=:9090

./victoria-metrics-prod -envflag.enable=true
```

This flexibility ensures that VictoriaMetrics can seamlessly integrate into nearly any configuration management or container orchestration system you choose to employ.

## 3.4 Writing and Reading Your First Data Points

With your single-node instance running and correctly configured, it is time to prove that the database is functional by moving data in and out of it. While production environments rely on automated scrapers and agents (which we will explore deeply in Part II), understanding the raw HTTP mechanics of ingestion and querying demystifies how VictoriaMetrics operates under the hood.

VictoriaMetrics natively supports a wide array of ingestion protocols, but for our first test, we will use the standard **Prometheus text exposition format**. It is human-readable, widely supported, and perfect for manual testing.

### Writing Data via HTTP

We will use `curl` to send a POST request to the VictoriaMetrics import endpoint: `/api/v1/import/prometheus`. 

Let's invent a metric named `book_sales_total`, tag it with a label (`edition="first"`), and assign it a value of `42`.

Open your terminal and execute the following command:

```bash
curl -X POST 'http://localhost:8428/api/v1/import/prometheus' \
     -d 'book_sales_total{edition="first"} 42'
```

If the command is successful, VictoriaMetrics will quietly return an HTTP `204 No Content` status. There is no verbose success message; the database is optimized for high-throughput ingestion and assumes silence means success. 

Behind the scenes, VictoriaMetrics has parsed your text, assigned the current Unix timestamp to the data point (because we didn't explicitly provide one), updated its inverted index with the `edition="first"` label, and written the compressed data block to your storage directory.

### Reading Data via PromQL

Now that the data is stored, we need to retrieve it. VictoriaMetrics provides 100% compatibility with the Prometheus HTTP API for querying. We will use the Instant Query endpoint (`/api/v1/query`) to ask the database for the current value of our metric.

Execute the following `curl` command:

```bash
curl 'http://localhost:8428/api/v1/query?query=book_sales_total'
```

The database evaluates the query string (`book_sales_total`) and returns a structured JSON payload containing the results. If you format the output, it will look exactly like this:

```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {
          "__name__": "book_sales_total",
          "edition": "first"
        },
        "value": [
          1714275726,
          "42"
        ]
      }
    ]
  }
}
```

**Understanding the Response:**
* **`status`**: Confirms the query was parsed and executed successfully.
* **`resultType`**: Indicates an instant vector (a single point in time for a time series).
* **`__name__`**: VictoriaMetrics internally converts the metric name into a standard label called `__name__`.
* **`value`**: An array containing exactly two items: the precise Unix timestamp when the metric was ingested (e.g., `1714275726`), and the string representation of our value (`"42"`).

### The Basic Request Lifecycle

To visualize what you just accomplished, here is the basic lifecycle of HTTP data flowing through the single-node VictoriaMetrics architecture:

```text
======================================================================
                  THE WRITE AND READ LIFECYCLE
======================================================================

 [ Client / Terminal ]                    [ VictoriaMetrics Node ]
          │                                          │
          │  1. POST /api/v1/import/prometheus       │
          │─────────────────────────────────────────►│
          │     Payload: book_sales_total 42         │ ──┐ 
          │                                          │   │ Data is compressed
          │  2. HTTP 204 No Content                  │   │ & written to disk
          │◄─────────────────────────────────────────│ ◄─┘
          │                                          │
          │  3. GET /api/v1/query?query=...          │
          │─────────────────────────────────────────►│ ──┐
          │                                          │   │ Engine searches index,
          │  4. HTTP 200 OK (JSON Response)          │   │ retrieves block, and
          │◄─────────────────────────────────────────│ ◄─┘ formats to JSON
          │                                          │
```

Congratulations! You have successfully installed, configured, and validated your VictoriaMetrics deployment. You now have a high-performance, single-node time series database ready to scale. In Part II, we will leave manual `curl` commands behind and learn how to automate data collection at an enterprise scale using `vmagent`.