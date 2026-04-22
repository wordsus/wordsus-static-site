As we transition from the ephemeral nature of web requests to the absolute necessity of durable state, we arrive at the cornerstone of backend engineering: the relational database. While modern Python frameworks offer powerful Object-Relational Mappers (ORMs) that abstract away SQL, relying solely on these abstractions is dangerous. True mastery requires understanding the engine underneath. In this chapter, we strip away the Python layer to explore the mechanics of data persistence. We will dive deep into schema normalization, query execution plans, connection pooling, and the ACID properties that guarantee our system's integrity.

## 17.1 Normalization, Indexing Strategies, and Query Execution Plans

Before introducing abstraction layers like Object-Relational Mappers (ORMs), a backend engineer must understand how data is structured and retrieved at the database engine level. Relational database management systems (RDBMS) are highly optimized C/C++ applications, but they cannot overcome poor schema design or inefficient querying. This section explores the mechanics of structuring data, accelerating retrieval, and diagnosing performance bottlenecks.

### The Pragmatics of Normalization

Normalization is the systematic process of organizing data to minimize redundancy and eliminate undesirable characteristics like insertion, update, and deletion anomalies. It involves dividing large tables into smaller, less redundant tables and defining relationships between them.

While academic database theory defines several Normal Forms (up to 6NF), practical backend engineering typically focuses on achieving **Third Normal Form (3NF)**.

* **First Normal Form (1NF):** Ensures atomicity. Every column must contain a single, indivisible value, and each record must be unique (typically enforced via a Primary Key).
* **Second Normal Form (2NF):** Satisfies 1NF and ensures that all non-key attributes are fully functionally dependent on the *entire* primary key. This primarily applies to tables with composite primary keys.
* **Third Normal Form (3NF):** Satisfies 2NF and ensures that no transitive dependencies exist. A non-key attribute must not depend on another non-key attribute.

**Normalization in Practice: A Plain-Text Example**

Consider an unnormalized `orders` table:

| order_id | customer_name | customer_email | product_name | category | price |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 101 | Alice | alice@ex.com | Laptop | Tech | 1200 |
| 102 | Alice | alice@ex.com | Mouse | Tech | 25 |

This structure is highly redundant. If Alice changes her email, we must update multiple rows (Update Anomaly). Normalizing to 3NF yields three distinct tables:

```text
[ Customers ]          [ Orders ]               [ Products ]
- customer_id (PK) <-- - order_id (PK)      --> - product_id (PK)
- name                 - customer_id (FK)   |   - name
- email                - product_id (FK) ---|   - category
                                                - price
```

**The Case for Denormalization**

Strict normalization optimizes for write operations and data integrity. However, it penalizes read performance because reconstructing the data requires computationally expensive `JOIN` operations. In highly read-heavy systems, engineers intentionally violate normal forms—a process called **denormalization**. 

By pre-computing aggregates or duplicating read-heavy fields (e.g., storing `total_order_value` on the `Customers` table), you trade storage space and write-time complexity for faster reads.

### Indexing Strategies: Beyond the B-Tree

An index is an auxiliary data structure that improves the speed of data retrieval operations at the cost of additional storage space and slower writes (since the index must be updated synchronously with `INSERT`, `UPDATE`, and `DELETE` operations).

The default index in almost all modern RDBMS (PostgreSQL, MySQL, SQLite) is the **B-Tree (Balanced Tree)**. B-Trees maintain sorted data and allow for searches, sequential access, insertions, and deletions in logarithmic time $O(\log n)$.

```text
Conceptual B-Tree Structure:
                      [ 50 ]
                    /        \
              [ 25 ]          [ 75 ]
             /      \        /      \
          [10, 20] [30, 40][60, 70] [80, 90]
```

#### Types of Indexes and Application

1.  **Single-Column Indexes:** Applied to a single field. Highly effective for exact matches (`WHERE email = '...'`) or range queries (`WHERE created_at > '...'`).
2.  **Composite Indexes:** Applied across multiple columns. The order of columns is critical due to the **Leftmost Prefix Rule**. An index on `(last_name, first_name)` will accelerate queries filtering by `last_name`, or by `last_name` AND `first_name`. It will *not* help queries filtering solely by `first_name`.
3.  **Unique Indexes:** Enforces data integrity by preventing duplicate values in the indexed column(s), while simultaneously acting as a standard index for lookups.
4.  **Covering Indexes:** An index that contains all the data required to satisfy a query. If you query `SELECT first_name FROM users WHERE last_name = 'Smith'`, and you have a composite index on `(last_name, first_name)`, the database can return the result directly from the index without ever reading the actual table row (the "heap").

### Decoding Query Execution Plans

Writing SQL is declarative; you tell the database *what* you want, not *how* to get it. The database's **Query Planner (or Optimizer)** analyzes the SQL, considers available indexes, evaluates table statistics, and generates an **Execution Plan**. 

To debug slow queries, backend engineers use the `EXPLAIN` command (or `EXPLAIN ANALYZE` in PostgreSQL, which actually executes the query to provide real timing data).

```sql
EXPLAIN ANALYZE 
SELECT * FROM orders WHERE customer_id = 452 AND status = 'shipped';
```

**Interpreting the Output**

A typical execution plan output reads from the inside out (or bottom up). It details the "nodes" of execution. You must recognize three primary access methods:

1.  **Sequential Scan (Seq Scan) / Table Scan:** The database reads every single row in the table, from beginning to end, to find matching records. This is acceptable for small tables but catastrophic for tables with millions of rows.
2.  **Index Scan:** The database traverses the B-Tree index to find the matching pointers, then visits the actual table (the heap) to retrieve the required rows. 
3.  **Index Only Scan:** The holy grail of read performance. The query was entirely satisfied by the data within the index itself (a Covering Index scenario), completely bypassing the heap.
4.  **Bitmap Heap Scan:** Often seen when an index returns too many pointers to fetch individually. The database builds an in-memory bitmap of the required pages, sorts them, and fetches them sequentially to minimize disk I/O seek times.

**Example PostgreSQL Execution Plan:**

```text
Index Scan using orders_customer_id_idx on orders  (cost=0.29..8.31 rows=1 width=64) (actual time=0.015..0.017 rows=2 loops=1)
  Index Cond: (customer_id = 452)
  Filter: ((status)::text = 'shipped'::text)
  Rows Removed by Filter: 5
Planning Time: 0.120 ms
Execution Time: 0.035 ms
```

**Breaking down the metrics:**
* **cost=0.29..8.31:** An arbitrary unit representing the planner's estimated cost. The first number is startup cost (time to return the first row); the second is total cost.
* **rows=1:** The planner's *estimate* of how many rows will be returned. If this differs wildly from the actual rows, your database statistics are stale (requiring an `ANALYZE` run).
* **actual time=0.015..0.017:** The real execution time in milliseconds (only visible with `ANALYZE`).
* **Filter / Rows Removed:** Indicates that while the index found the `customer_id`, the database still had to discard 5 rows because their `status` was not 'shipped'. If this query is run frequently, adding `status` to a composite index `(customer_id, status)` would eliminate this filter step and further optimize the query.

## 17.2 Advanced PostgreSQL: JSONB, Array Types, and Full-Text Search

While mastering standard normalization and B-Tree indexing forms the bedrock of database engineering, modern backend applications frequently encounter data that resists strict tabular structures. PostgreSQL distinguishes itself from other relational database management systems by offering first-class support for semi-structured data, collections, and advanced search capabilities, effectively blurring the lines between a traditional RDBMS, a document store, and a search engine.

### The JSONB Data Type: Bridging Relational and Document Models

PostgreSQL offers two JSON data types: `JSON` and `JSONB`. The `JSON` type stores an exact copy of the input text, meaning it preserves whitespace and duplicate keys, and requires reparsing on every execution. In almost all backend scenarios, you should use **`JSONB`** (JSON Binary). `JSONB` stores data in a decomposed binary format. It introduces a slight overhead during insertion but significantly accelerates processing and, crucially, supports indexing.

**When to use JSONB:**
* **User Preferences/Settings:** Storing highly variable, schema-less key-value pairs where defining columns for every possible setting is impractical.
* **Third-Party API Payloads:** Storing raw webhooks or API responses for auditing or deferred processing.
* **Replacing the EAV (Entity-Attribute-Value) Anti-pattern:** Avoiding complex and slow `JOIN` operations when dealing with products that have vastly different attributes.

**Schema and Query Mechanics:**

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    metadata JSONB
);

INSERT INTO users (username, metadata) 
VALUES ('alice_dev', '{"theme": "dark", "notifications": {"email": true, "sms": false}, "tags": ["python", "sql"]}');
```

PostgreSQL provides specialized operators to query inside the JSONB structure:

* **`->`**: Returns the value as a JSON object.
* **`->>`**: Returns the value as text.
* **`@>`**: The containment operator (checks if the left JSON value contains the right JSON path/value).

```sql
-- Extracting a nested value as text
SELECT username, metadata->'notifications'->>'email' AS email_enabled 
FROM users;

-- Filtering users where theme is 'dark' using the containment operator
SELECT username 
FROM users 
WHERE metadata @> '{"theme": "dark"}';
```

**Indexing JSONB:**
To make JSONB queries highly performant, you use a **GIN (Generalized Inverted Index)**. 

```sql
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);
```
This index allows PostgreSQL to instantly locate rows containing specific keys or key-value pairs without scanning the entire table.

### Array Types: Controlled Denormalization

PostgreSQL allows columns to be defined as multidimensional arrays of any built-in or user-defined type. While standard normalization dictates that one-to-many relationships should be handled with a separate table and a Foreign Key, arrays offer a pragmatic alternative for simple, cohesive lists of values where order might matter, and the list is rarely queried independently of its parent row.

**When to use Arrays:**
* Simple tagging systems where tags have no independent metadata (e.g., no `created_at` or `author_id` per tag).
* Storing matrices or coordinate sets.
* Caching aggregated lists to avoid frequent `JOIN`s on heavily read endpoints.

**Schema and Query Mechanics:**

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT[] -- Define an array of TEXT
);

INSERT INTO articles (title, tags) 
VALUES ('Understanding Asyncio', ARRAY['python', 'concurrency', 'async']);
```

Querying arrays utilizes the `ANY()` construct or the overlap/containment operators:

```sql
-- Find articles tagged with 'python'
SELECT title FROM articles WHERE 'python' = ANY(tags);

-- Find articles that contain BOTH 'python' AND 'async' (Containment)
SELECT title FROM articles WHERE tags @> ARRAY['python', 'async'];

-- Find articles that contain EITHER 'python' OR 'rust' (Overlap)
SELECT title FROM articles WHERE tags && ARRAY['python', 'rust'];
```

*Architectural Warning:* Overusing arrays can lead to maintenance nightmares. If you ever need to enforce referential integrity on the array elements (e.g., ensuring a tag actually exists in a master `tags` table) or attach metadata to the relationship, you must revert to a standard normalized junction table.

### Full-Text Search (FTS): Beyond `LIKE '%...%'`

Backend engineers often start implementing search features using the `LIKE` or `ILIKE` operators. However, these operators are fundamentally limited: they cannot use standard B-Tree indexes for left-wildcard searches (`%term`), they do not understand natural language (pluralization, verb tenses), and they cannot rank results by relevance.

PostgreSQL's native Full-Text Search solves this by parsing text into semantic tokens.

**Core FTS Concepts:**
1.  **`tsvector` (Text Search Vector):** Represents the *document* optimized for search. It parses the text, removes stop words (like "the", "a", "is"), and reduces words to their grammatical root (stemming). So, "running", "runs", and "ran" might all be reduced to "run".
2.  **`tsquery` (Text Search Query):** Represents the user's *search terms*, similarly normalized, combined with boolean operators (`&` for AND, `|` for OR, `!` for NOT).

**Implementation:**

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT,
    body TEXT
);

INSERT INTO documents (title, body) 
VALUES ('The Python GIL', 'The Global Interpreter Lock limits threads.');

-- Querying using the @@ (match) operator and dynamic parsing
SELECT title 
FROM documents 
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'locks & threading');
```
*Note how searching for "locks & threading" matches "Lock" and "threads" due to stemming.*

**Optimizing FTS:**
Calculating `tsvector` on the fly for every query is CPU-intensive. For production systems, you should pre-compute the vector, store it in a generated column, and index it using a **GiST (Generalized Search Tree)** or **GIN** index.

```sql
-- 1. Add a generated column to store the vector
ALTER TABLE documents 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED;

-- 2. Create a GIN Index on the vector
CREATE INDEX idx_fts_search ON documents USING GIN (search_vector);

-- 3. Execute highly optimized, indexed queries
SELECT title 
FROM documents 
WHERE search_vector @@ to_tsquery('english', 'python & threads');
```

Furthermore, PostgreSQL provides functions like `ts_rank()` to order results based on how frequently the search terms appear in the document, allowing you to build sophisticated, highly relevant search endpoints without deploying external infrastructure like Elasticsearch or Typesense until your scale absolutely demands it.

## 17.3 Connection Pooling and Database Session Management

Before a Python application can execute a single SQL query, it must establish a connection to the database engine. In low-traffic environments, this process is negligible. However, in high-throughput backend architectures, the overhead of managing these connections can quickly become the primary bottleneck, leading to latency spikes, connection timeouts, and cascading system failures. Understanding how to pool connections and safely manage their lifecycles is critical for application stability.

### The Anatomy of a Database Connection

Establishing a fresh connection to a relational database like PostgreSQL or MySQL is an expensive, multi-step operation. It is not merely a software abstraction; it requires significant network and operating system resources.

Every new connection requires:
1.  **TCP Handshake:** A three-way network handshake to establish the transport layer.
2.  **Cryptographic Handshake:** TLS/SSL negotiation to secure the transit layer.
3.  **Authentication:** Validating user credentials and checking access control lists.
4.  **Process Allocation:** In databases like PostgreSQL, the engine must fork a dedicated OS process (the `postgres` backend process) and allocate memory specifically for this new client.

If a highly concurrent web framework (like FastAPI or Django) opens and closes a connection for every single incoming HTTP request, the database will spend more CPU cycles creating and destroying connections than actually executing queries. Furthermore, database engines have a hard limit on `max_connections` (often defaulting to 100 in PostgreSQL). Once this limit is reached, subsequent requests are outright rejected.

### The Mechanics of Connection Pooling

A connection pool acts as an intermediary cache of active, ready-to-use database connections. Instead of opening a new connection, the application borrows an existing one from the pool, executes its queries, and then returns the connection to the pool without closing it.

```text
[ Unpooled Architecture ]
App Request 1  ----(Connect -> Query -> Disconnect)----> DB
App Request 2  ----(Connect -> Query -> Disconnect)----> DB
App Request 3  ----(Connect -> Query -> Disconnect)----> DB
(High latency, DB process exhaustion)

[ Pooled Architecture ]
                          +-------------------+
App Request 1  --(Borrow)->| Active Conn A     |----(Query)----> DB
App Request 2  --(Borrow)->| Active Conn B     |----(Query)----> DB
App Request 3  --(Wait)  ->| [Pool Manager]    |
                          +-------------------+
(Low latency, predictable DB load. Request 3 waits until A or B is returned)
```

**Pool Sizing Strategies**

A common misconception is that a larger connection pool yields better performance. In reality, a pool size that exceeds the number of CPU cores on the database server can degrade performance due to severe context switching and resource contention. 

A standard formula for sizing a pool, popularized by the HikariCP project, is:
`connections = ((core_count * 2) + effective_spindle_count)`
*(Where spindle count is the number of hard disks, often treated as 0 or 1 for modern SSDs).*

### Application-Level vs. Infrastructure-Level Pooling

Backend engineers must decide where the pool resides. Python applications generally utilize two distinct layers of pooling.

**1. Application-Level Pooling (In-Memory)**
This pool lives within the Python process itself. Libraries like SQLAlchemy utilize a `QueuePool` by default.

* **Pros:** Easy to configure, zero network latency between the app and the pool.
* **Cons:** In a distributed system (e.g., running 20 Kubernetes pods, each with 4 Gunicorn workers), every single worker has its own isolated pool. If each worker has a pool size of 5, you have suddenly provisioned 400 connections against the database, potentially overwhelming it.

```python
# Application-level pooling via SQLAlchemy Engine
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg://user:pass@host/dbname",
    pool_size=5,          # Maintain 5 connections in the pool
    max_overflow=10,      # Allow up to 10 extra temporary connections under heavy load
    pool_timeout=30,      # Wait up to 30s for a connection before raising an error
    pool_recycle=1800     # Reconnect connections older than 30 minutes to prevent staleness
)
```

**2. Infrastructure-Level Pooling (External Proxy)**
To solve the multi-worker scaling problem, backend architectures introduce an external connection pooler like **PgBouncer** or **Odyssey** (for PostgreSQL). 

The proxy sits between the Python application and the database. The Python workers connect to PgBouncer (which is incredibly cheap), and PgBouncer maintains a strictly controlled, small pool of real connections to the actual database.

* **Session Pooling:** A connection is assigned to a client for the entire duration the client stays connected. (Useful for older applications).
* **Transaction Pooling:** A connection is assigned to a client only for the duration of a single database transaction. Once the transaction commits or rolls back, the connection is instantly returned to the proxy's pool to serve another client. *This is the critical mode for modern, high-concurrency Python web applications.*

### Database Session Management and Leak Prevention

While a *connection* represents the physical network link, a *session* represents the logical workspace where transactions occur. In Python ORMs, the Session object checks out a connection from the pool, manages the state of objects (Identity Map), handles transaction boundaries (`BEGIN`, `COMMIT`, `ROLLBACK`), and returns the connection.

The most dangerous pitfall in database engineering is the **connection leak**. If your code checks out a connection but an unhandled exception prevents it from being explicitly returned, the connection remains "checked out" forever. Eventually, the pool is drained, and the application hangs indefinitely.

**The Context Manager Mandate**

To guarantee that connections and sessions are returned to the pool regardless of success or failure, you must rigidly enforce the use of Python's Context Manager protocol (`with` statements).

```python
# Anti-pattern: Prone to connection leaks if query_db() raises an error
def fetch_data_unsafe(engine):
    conn = engine.connect()  # Connection acquired
    result = query_db(conn)  # If this raises an Exception, close() is never reached
    conn.close()             
    return result

# Best Practice: Guaranteed release via Context Manager
def fetch_data_safe(engine):
    with engine.connect() as conn: # Connection acquired
        # Transaction begins automatically
        result = query_db(conn)
        conn.commit() 
        return result
    # Connection is cleanly returned to the pool here, even if Exceptions occur
```

By strictly managing session boundaries and appropriately layering application-level pools with infrastructure-level proxies, Python applications can safely scale to handle thousands of concurrent requests without overwhelming the persistence layer.

## 17.4 Managing Concurrency, Transactions, and ACID Properties

As a backend application scales, it transitions from handling sequential, isolated requests to managing hundreds or thousands of simultaneous operations. When multiple threads, processes, or distinct application servers attempt to read and write the exact same database records concurrently, data corruption is inevitable without strict enforcement mechanisms. This is where the concept of the database transaction and the ACID properties become paramount.

### The ACID Guarantee

Relational database systems are fundamentally built upon the ACID model, a set of properties that guarantee database transactions are processed reliably.

* **Atomicity ("All or Nothing"):** A transaction is treated as a single, indivisible logical unit of work. If a transaction comprises five `UPDATE` statements, and the fourth one fails, the database automatically rolls back the first three. The system is never left in a partially updated state.
* **Consistency:** A transaction can only bring the database from one valid state to another valid state, maintaining all defined rules, constraints (like Foreign Keys or `CHECK` constraints), and triggers.
* **Isolation:** Determines how and when changes made by one transaction become visible to other concurrent transactions. This is the most complex property and is tunable by the backend engineer.
* **Durability:** Once a transaction has been explicitly committed, it will remain in the system, even in the event of a power loss, crash, or fatal error. Modern databases achieve this via a **Write-Ahead Log (WAL)**, recording the intent to write to disk before actually modifying the main data files.

### Transaction Boundaries in Python

In raw SQL, a transaction begins implicitly or via the `BEGIN` command, and ends with a `COMMIT` (saving changes) or a `ROLLBACK` (aborting changes). 

When interacting with a database via Python drivers (like `psycopg2` or `asyncpg`), the driver usually initiates a transaction automatically when you execute the first query.

```python
import psycopg2

conn = psycopg2.connect("dbname=ecommerce user=admin")
cursor = conn.cursor()

try:
    # Transaction begins automatically
    cursor.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cursor.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    
    # Explicitly commit the transaction
    conn.commit()
except Exception as e:
    # If anything fails (e.g., account 2 doesn't exist, constraint violation),
    # revert the entire unit of work.
    conn.rollback()
    raise e
finally:
    cursor.close()
    conn.close()
```

### Navigating Concurrency: Read Phenomena

When multiple transactions interact with the same data, three distinct read phenomena can occur if isolation is not strictly enforced:

1.  **Dirty Read:** Transaction A reads data that has been modified by Transaction B, but Transaction B has *not yet committed*. If B rolls back, A operates on data that technically never existed.
2.  **Non-Repeatable Read:** Transaction A reads a row. Transaction B updates or deletes that *same row* and commits. If Transaction A reads the row again, it gets a different result or finds it missing.
3.  **Phantom Read:** Transaction A runs a query matching a specific condition (e.g., `SELECT * FROM users WHERE age > 30`). Transaction B inserts a new row that satisfies this condition and commits. If A repeats the query, a "phantom" row appears.

### Isolation Levels and MVCC

The SQL standard defines four isolation levels to manage these phenomena. Increasing the isolation level increases data correctness but decreases system concurrency (meaning transactions might have to wait for each other, increasing latency).

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Concurrency Speed |
| :--- | :--- | :--- | :--- | :--- |
| **Read Uncommitted** | Possible | Possible | Possible | Highest |
| **Read Committed** | Prevented | Possible | Possible | High (Postgres Default) |
| **Repeatable Read** | Prevented | Prevented | Possible* | Medium |
| **Serializable** | Prevented | Prevented | Prevented | Lowest (Serialization Anomalies block) |

*Note: In PostgreSQL, the `Repeatable Read` level actually prevents Phantom Reads as well, exceeding the ANSI SQL standard.*

**Multi-Version Concurrency Control (MVCC)**
PostgreSQL (and many modern engines) avoids the heavy performance penalty of locking entire tables by using MVCC. Instead of locking a row when someone is reading it, Postgres keeps multiple versions of that row. *Readers do not block writers, and writers do not block readers.* Each transaction simply sees a "snapshot" of the database at the exact moment the transaction began.

### Concurrency Patterns: Pessimistic vs. Optimistic Locking

Even with MVCC and transactions, backend engineers frequently encounter the **Lost Update Problem**. 

*Scenario:* Alice and Bob both read a concert ticket record showing `available_seats = 1`. Alice initiates a purchase and updates the count to 0. Simultaneously, Bob initiates a purchase, also updating the count from his read value (1) to 0. The system double-booked the seat.

To solve this, developers must implement explicit locking strategies.

**1. Pessimistic Locking (The Database-Level Lock)**
Assume the worst—that a conflict *will* happen. You lock the row at the database level the moment you read it, preventing any other transaction from reading or writing it until you are done.

You achieve this using `SELECT ... FOR UPDATE`.

```sql
-- Transaction A starts
BEGIN;
SELECT available_seats FROM tickets WHERE id = 42 FOR UPDATE;
-- The row with id=42 is now exclusively locked by Transaction A.
-- If Transaction B runs the exact same SELECT... FOR UPDATE query, 
-- it will physically hang and wait until Transaction A commits or rolls back.

UPDATE tickets SET available_seats = available_seats - 1 WHERE id = 42;
COMMIT; 
-- Lock released. Transaction B is unblocked and proceeds (but now sees seats = 0).
```

*Trade-offs:* Highly secure for exact operations (financial ledgers, ticketing), but can create deadlocks and significantly degrade throughput if many users try to access the same row.

**2. Optimistic Locking (The Application-Level Check)**
Assume the best—that conflicts are rare. Do not lock the database row. Instead, add a `version` integer column to the table. When updating, ensure the version hasn't changed since you read it.

```text
[ Process Flow: Optimistic Locking ]

1. User A reads: {id: 42, seats: 1, version: 1}
2. User B reads: {id: 42, seats: 1, version: 1}

3. User A buys seat:
   UPDATE tickets SET seats = 0, version = 2 
   WHERE id = 42 AND version = 1;
   --> (Database returns: 1 row affected. Success!)

4. User B buys seat:
   UPDATE tickets SET seats = 0, version = 2 
   WHERE id = 42 AND version = 1;
   --> (Database returns: 0 rows affected. The version is now 2!)
```

When the database returns `0 rows affected` for User B, the Python backend detects this, raises an exception (e.g., `StaleDataError`), and either prompts the user to try again or automatically retries the operation with the fresh data. 

*Trade-offs:* Exceptional performance and concurrency. Fails gracefully. It is the preferred method for standard CRUD operations in highly trafficked REST/GraphQL APIs where users rarely edit the exact same data simultaneously.