Stateless apps are simple, but true business value relies on persistent data. In this chapter, we bridge the gap between Go’s transient memory and long-term storage. We explore how Go interacts with relational databases using the standard `database/sql` package, mastering connection pools, transactions, and prepared statements. We will evaluate data access patterns, from raw SQL extensions like `sqlx` to full ORMs like GORM. Finally, we venture into the polyglot persistence landscape—covering NoSQL solutions like MongoDB and Redis—and establish robust, automated database migration strategies essential for reliable cloud-native deployments.

## 12.1 Working with Relational Databases using `database/sql`

The standard library’s `database/sql` package provides a lightweight, idiomatic, and concurrency-safe abstraction layer for working with relational databases. Unlike fully-featured Object-Relational Mappers (ORMs) found in other ecosystems (like Hibernate in Java or Entity Framework in C#), `database/sql` does not attempt to hide SQL from the developer. Instead, it embraces SQL, providing a standardized set of methods to execute queries, manage connections, and map tabular data directly into Go variables and structs.

### Database Drivers and the Blank Identifier

The `database/sql` package is completely database-agnostic. It defines the interface, but it does not implement the actual communication protocols for PostgreSQL, MySQL, SQLite, or any other database engine. For that, you must import a third-party database driver.

Because you rarely interact with the driver's API directly—preferring instead to use the standard `database/sql` types—drivers are typically imported using Go's blank identifier (`_`). This triggers the driver's `init()` function, registering it with the `database/sql` package without raising an "unused import" compiler error.

```go
import (
    "database/sql"
    "fmt"
    "log"

    // Import the PostgreSQL driver
    _ "github.com/lib/pq" 
)
```

### Establishing a Connection

To interact with a database, you must first create a `*sql.DB` instance using `sql.Open()`. 

It is crucial to understand that `sql.Open()` **does not immediately establish a network connection to the database**. It merely validates the Data Source Name (DSN) string and initializes the internal connection pool. To verify that the database is reachable and your credentials are valid, you must explicitly call the `Ping()` or `PingContext()` method.

```go
func main() {
    // The DSN format varies depending on the driver being used
    dsn := "host=localhost port=5432 user=admin password=secret dbname=users_db sslmode=disable"
    
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        log.Fatalf("Failed to open database: %v", err)
    }
    
    // Deferring the close ensures all connections are released when the application exits.
    // However, *sql.DB is designed to be long-lived and shared across your application.
    defer db.Close() 

    // Explicitly check the connection
    if err := db.Ping(); err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    fmt.Println("Successfully connected to the database!")
}
```

*Note: As we will explore in Section 12.2, `*sql.DB` is a connection pool, not a single connection. You should create one `*sql.DB` object per database and share it globally across your application's goroutines.*

### The Core Execution Methods

The `database/sql` package categorizes SQL operations into three primary methods, depending on the expected result set.

| Operation Type | Expected Result | `*sql.DB` Method | Example SQL |
| :--- | :--- | :--- | :--- |
| **Mutation** | No rows (just metadata like rows affected) | `Exec()` | `INSERT`, `UPDATE`, `DELETE` |
| **Retrieval** | Exactly one row | `QueryRow()` | `SELECT ... LIMIT 1` |
| **Retrieval** | Zero, one, or multiple rows | `Query()` | `SELECT ...` |

#### 1. Mutating Data with `Exec()`

For operations that modify the database state and do not return rows, use `Exec()`. Always use parameterized queries (using placeholders like `$1, $2` for PostgreSQL, or `?, ?` for MySQL/SQLite) to protect your application against SQL injection attacks. The `database/sql` package automatically handles the safe escaping of these parameters.

```go
func createUser(db *sql.DB, username, email string) (int64, error) {
    query := `INSERT INTO users (username, email, created_at) VALUES ($1, $2, NOW())`
    
    result, err := db.Exec(query, username, email)
    if err != nil {
        return 0, fmt.Errorf("createUser: %w", err)
    }

    // Result provides metadata about the execution
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return 0, fmt.Errorf("createUser: failed to get rows affected: %w", err)
    }

    return rowsAffected, nil
}
```

#### 2. Retrieving a Single Row with `QueryRow()`

When you expect exactly one record—such as looking up a user by their unique ID—`QueryRow()` is the most ergonomic choice. It returns a `*sql.Row` object. You then call `Scan()` on this object, passing in pointers to the Go variables where the column data should be written.

```go
type User struct {
    ID       int
    Username string
    Email    string
}

func getUserByID(db *sql.DB, id int) (User, error) {
    var u User
    query := `SELECT id, username, email FROM users WHERE id = $1`
    
    // QueryRow executes the query and returns a single row.
    // Scan copies the columns from the matched row into the values pointed at.
    err := db.QueryRow(query, id).Scan(&u.ID, &u.Username, &u.Email)
    
    if err != nil {
        if err == sql.ErrNoRows {
            return User{}, fmt.Errorf("getUserByID: no user found with id %d", id)
        }
        return User{}, fmt.Errorf("getUserByID: %w", err)
    }
    
    return u, nil
}
```
Notice the handling of `sql.ErrNoRows`. This is a specific sentinel error provided by `database/sql` that allows you to cleanly distinguish between a "record not found" scenario and a genuine database failure (like a dropped connection).

#### 3. Retrieving Multiple Rows with `Query()`

For queries that return a collection of rows, use `Query()`. This returns a `*sql.Rows` object, which acts as a cursor over the result set. Iterating over `*sql.Rows` requires careful handling to prevent resource leaks.

```go
func getUsersByDomain(db *sql.DB, domain string) ([]User, error) {
    query := `SELECT id, username, email FROM users WHERE email LIKE $1`
    
    // Add the wildcard for the SQL LIKE operator
    searchPattern := "%@" + domain
    
    rows, err := db.Query(query, searchPattern)
    if err != nil {
        return nil, fmt.Errorf("getUsersByDomain: %w", err)
    }
    
    // CRITICAL: Always defer rows.Close() to return the connection to the pool.
    // Failing to close rows will result in rapid connection pool exhaustion.
    defer rows.Close()

    var users []User
    
    // rows.Next() advances the cursor to the next row. 
    // It returns false when there are no more rows or an error occurs.
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Username, &u.Email); err != nil {
            return nil, fmt.Errorf("getUsersByDomain scanning row: %w", err)
        }
        users = append(users, u)
    }
    
    // Check for errors encountered during iteration
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("getUsersByDomain iteration error: %w", err)
    }
    
    return users, nil
}
```

There are three critical lifecycle steps when working with `*sql.Rows`:
1. **Defer `rows.Close()`:** The database connection used by the query remains locked to this result set until the rows are closed. If you return early due to an error during iteration, the `defer` ensures the connection is freed.
2. **Iterate with `rows.Next()`:** This moves the cursor forward and prepares the row for `Scan()`.
3. **Check `rows.Err()`:** A `for rows.Next()` loop can terminate because it reached the end of the data, *or* because the network connection dropped mid-read. Checking `rows.Err()` after the loop guarantees you didn't silently process a partial result set.

### Dealing with Null Values

A common pitfall in Go database programming involves SQL `NULL` values. Go's primitive types (like `string` or `int`) cannot be `nil`—they default to their zero values. If a database column contains a `NULL` and you attempt to `Scan()` it into a standard `string`, the `database/sql` package will return an error.

To handle nullable columns, `database/sql` provides specialized types such as `sql.NullString`, `sql.NullInt64`, `sql.NullBool`, and `sql.NullTime`.

```go
// Assuming the 'email' column can be NULL in the database
var id int
var username string
var email sql.NullString 

err := db.QueryRow(`SELECT id, username, email FROM users WHERE id = 1`).Scan(&id, &username, &email)

if email.Valid {
    fmt.Printf("User email is: %s\n", email.String)
} else {
    fmt.Println("User has no email address provided.")
}
```

While functional, working with `sql.Null*` types can sometimes clutter your domain structs. In many modern Go applications, developers prefer using pointers for nullable fields (e.g., `*string`), which many third-party drivers and extensions support, or handling the nullability gracefully at the SQL level using `COALESCE()`.

## 12.2 Managing Connection Pooling, Transactions, and Prepared Statements

While executing basic queries is straightforward, production-grade applications require careful management of database resources and data integrity. The `database/sql` package provides robust, built-in mechanisms for connection pooling, atomic transactions, and statement preparation. 

### Mastering the Connection Pool

As established in Section 12.1, `*sql.DB` is not a single active connection; it is a concurrency-safe manager of a connection pool. When you call a method like `Query()` or `Exec()`, `database/sql` requests a connection from the pool. If an idle connection is available, it is reused. If not, and the pool hasn't reached its maximum size, a new connection is created. Once the operation completes (and resources like `sql.Rows` are closed), the connection is returned to the pool.

By default, Go's database pool grows unboundedly. In a high-traffic cloud environment, this can quickly overwhelm your database server, leading to connection limits being reached and cascading failures. You must explicitly configure the pool limits.

```text
+-------------------------------------------------------------+
|                      *sql.DB Connection Pool                |
|                                                             |
|  [ Idle Conn ]  <-- Reusable                                |
|  [ Idle Conn ]                                              |
|  [ Active Conn ] --> Executing Query in Goroutine A         |
|  [ Active Conn ] --> Executing Query in Goroutine B         |
|                                                             |
|  MaxOpenConns: Hard limit on Active + Idle                  |
|  MaxIdleConns: How many connections stay open when unused   |
+-------------------------------------------------------------+
```

You can configure the pool using four primary methods on your `*sql.DB` instance:

```go
// Limit the total number of open connections (in-use + idle)
// Default: 0 (unlimited). Set this based on your DB server's capacity.
db.SetMaxOpenConns(25)

// Limit the number of idle connections kept alive in the pool
// Default: 2. Set this higher for high-throughput applications to avoid
// the overhead of constantly opening and closing TCP connections.
db.SetMaxIdleConns(25)

// Set the maximum amount of time a connection may be reused
// Default: 0 (reused forever). Essential for load balancers that drop long-lived connections.
db.SetConnMaxLifetime(5 * time.Minute)

// Set the maximum amount of time a connection may remain idle before being closed
// Default: 0 (never closed due to idle time).
db.SetConnMaxIdleTime(1 * time.Minute)
```

**Best Practice:** Keep `MaxIdleConns` equal to or slightly less than `MaxOpenConns`. If `MaxIdleConns` is significantly lower, a burst of traffic will cause Go to open many connections, only to immediately close them when the burst ends because they exceed the idle limit, defeating the purpose of the pool.

### Guaranteeing Atomicity with Transactions

When you need to execute multiple SQL statements as a single, indivisible unit of work, you must use a transaction. If any statement within the transaction fails, the entire operation should be aborted (rolled back), leaving the database state unchanged.

In Go, transactions are managed using the `*sql.Tx` object. You initiate a transaction by calling `db.Begin()` (or `db.BeginTx()` for context-aware cancellation and isolation level control). 

A critical idiom in Go is to use a `defer` statement for the rollback immediately after successfully opening the transaction.

```go
func transferFunds(db *sql.DB, fromID, toID int, amount float64) error {
    // 1. Begin the transaction
    tx, err := db.Begin()
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }

    // 2. Defer a rollback. 
    // If the transaction is committed later, this Rollback will safely do nothing
    // because the transaction is already marked as completed. 
    // If a panic occurs or we return early with an error, it safely aborts the transaction.
    defer tx.Rollback()

    // 3. Execute queries using the 'tx' object, NOT the 'db' object
    _, err = tx.Exec(`UPDATE accounts SET balance = balance - $1 WHERE id = $2`, amount, fromID)
    if err != nil {
        return fmt.Errorf("failed to debit account: %w", err) // Rollback happens via defer
    }

    _, err = tx.Exec(`UPDATE accounts SET balance = balance + $1 WHERE id = $2`, amount, toID)
    if err != nil {
        return fmt.Errorf("failed to credit account: %w", err) // Rollback happens via defer
    }

    // 4. Commit the transaction
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }

    return nil
}
```

**Crucial Warning:** Once you call `db.Begin()`, the returned `*sql.Tx` binds to a single, specific connection from the pool. You must execute all queries for that transaction using the `tx` object (e.g., `tx.Exec()`, `tx.QueryRow()`). If you accidentally use the global `db` object inside the transaction block, those queries will execute outside the transaction scope on a different connection, breaking atomicity and potentially causing deadlocks.

### Optimizing with Prepared Statements

A prepared statement is a feature where the database parses, compiles, and optimizes a SQL query plan ahead of time, allowing you to execute it multiple times with different parameters with significantly reduced overhead. It also provides an impenetrable defense against SQL injection.

You create a prepared statement using `db.Prepare()`, which returns a `*sql.Stmt`.

```go
func bulkInsertUsers(db *sql.DB, users []User) error {
    // 1. Prepare the statement ONCE
    stmt, err := db.Prepare(`INSERT INTO users (username, email) VALUES ($1, $2)`)
    if err != nil {
        return fmt.Errorf("failed to prepare statement: %w", err)
    }
    
    // 2. A prepared statement occupies database resources. It MUST be closed.
    defer stmt.Close()

    // 3. Execute the statement multiple times
    for _, u := range users {
        if _, err := stmt.Exec(u.Username, u.Email); err != nil {
            return fmt.Errorf("failed to insert user %s: %w", u.Username, err)
        }
    }

    return nil
}
```

#### The Hidden Complexity of `*sql.Stmt`

While prepared statements are powerful, they interact with Go's connection pool in a way that can catch developers off guard. 

Prepared statements are intrinsically tied to a specific database connection. Because `*sql.DB` abstracts the connection pool, when you call `db.Prepare()`, Go prepares the statement on one connection. Later, when you call `stmt.Exec()`, Go might grab a *different* connection from the pool. 

To hide this complexity, the `database/sql` package does heavy lifting under the hood: if `stmt.Exec()` runs on a connection that hasn't prepared that statement yet, Go will transparently re-prepare the statement on that new connection. 

Because of this hidden machinery, you should adhere to these guidelines:
1.  **Do not use `db.Prepare()` for single executions.** If you only need to run a query once, just use `db.Exec()` or `db.Query()`. The underlying driver often uses prepared statements implicitly anyway, but without the overhead of maintaining the `*sql.Stmt` object across the pool.
2.  **Use `db.Prepare()` for tight loops** (like the bulk insert above) where the performance gain of skipping the query parsing phase outweighs the pooling overhead.
3.  **Prepared Statements in Transactions:** You can prepare statements within a transaction using `tx.Prepare()`. Because a `*sql.Tx` is locked to a single connection, you bypass the cross-connection overhead entirely. This is highly efficient for complex, multi-step transaction loops.

## 12.3 Utilizing Go ORMs and Query Builders (GORM, sqlx, Squirrel)

The Go community has a famously pragmatic, and sometimes skeptical, relationship with Object-Relational Mappers (ORMs). The language's philosophy strongly favors explicit behavior over implicit magic. As we saw in Sections 12.1 and 12.2, using the standard `database/sql` package gives you absolute control and excellent performance, but it comes at the cost of significant boilerplate—especially when mapping rows to structs or handling queries with dynamic parameters.

To bridge this gap, the Go ecosystem offers a spectrum of tools ranging from lightweight standard library extensions to fully-featured ORMs. Choosing the right tool depends entirely on your project's complexity, performance constraints, and your team's tolerance for writing raw SQL.

This section explores the three dominant approaches using their most popular respective libraries: **sqlx** (Extension), **Squirrel** (Query Builder), and **GORM** (Full ORM).

### 1. The Lightweight Extension: `sqlx`

If you are comfortable writing raw SQL but are tired of writing `for rows.Next()` loops and manually scanning variables, `github.com/jmoiron/sqlx` is the undisputed standard. It acts as a superset of `database/sql`, meaning any code written for the standard library works perfectly with `sqlx`, but it adds powerful struct scanning and named parameter capabilities.

#### Struct Scanning
`sqlx` uses struct tags (specifically the `db` tag) to automatically map database columns to struct fields. It introduces two major retrieval methods: `Get` (for a single row) and `Select` (for multiple rows).

```go
import (
    "log"
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
)

type Employee struct {
    ID         int    `db:"emp_id"`
    FirstName  string `db:"first_name"`
    LastName   string `db:"last_name"`
    Department string `db:"department"`
}

func getEmployeesByDept(db *sqlx.DB, dept string) ([]Employee, error) {
    var employees []Employee
    
    // sqlx.Select executes the query, iterates over the rows, 
    // and populates the slice in a single line of code.
    query := `SELECT emp_id, first_name, last_name, department FROM employees WHERE department = $1`
    
    if err := db.Select(&employees, query, dept); err != nil {
        return nil, err
    }
    return employees, nil
}
```

#### Named Queries
Writing `INSERT` or `UPDATE` statements with many columns often leads to positional parameter hell (e.g., matching `$17` to the correct variable). `sqlx` solves this with `NamedExec`, allowing you to bind SQL variables directly to struct fields.

```go
func createEmployee(db *sqlx.DB, emp Employee) error {
    query := `INSERT INTO employees (first_name, last_name, department) 
              VALUES (:first_name, :last_name, :department)`
              
    _, err := db.NamedExec(query, &emp)
    return err
}
```

### 2. The Dynamic Query Builder: `Squirrel`

Writing static SQL strings is simple, but building dynamic SQL—where `WHERE` clauses, `LIMIT`s, or `JOIN`s change based on user input—quickly devolves into a messy, bug-prone tangle of `if` statements and string concatenations. 

`github.com/Masterminds/squirrel` provides a fluent, composable API for building SQL queries programmatically. It ensures your queries are syntactically valid and safely parameterized before execution.

```go
import (
    "database/sql"
    sq "github.com/Masterminds/squirrel"
)

// SearchFilters represents optional API query parameters
type SearchFilters struct {
    Role   string
    Status string
    MinAge int
}

func buildSearchQuery(filters SearchFilters) (string, []interface{}, error) {
    // Start a Postgres-flavored statement builder (uses $1, $2 placeholders)
    users := sq.StatementBuilder.PlaceholderFormat(sq.Dollar).
        Select("id", "username", "email").
        From("users")

    // Conditionally chain WHERE clauses based on provided filters
    if filters.Role != "" {
        users = users.Where(sq.Eq{"role": filters.Role})
    }
    if filters.Status != "" {
        users = users.Where(sq.Eq{"status": filters.Status})
    }
    if filters.MinAge > 0 {
        users = users.Where(sq.GtOrEq{"age": filters.MinAge})
    }

    // Generate the final SQL string and the slice of arguments
    return users.ToSql()
}

// Usage Example:
// sqlStr, args, err := buildSearchQuery(filters)
// rows, err := db.Query(sqlStr, args...)
```
Notice that Squirrel *only* builds the SQL and the arguments array. It is entirely decoupled from the database connection. You still pass the resulting string and arguments to `database/sql` or `sqlx` for execution.

### 3. The Full ORM: `GORM`

For rapid application development, particularly in heavily relational domains, `gorm.io/gorm` is the most widely adopted full ORM in Go. GORM implements the Active Record pattern. It abstracts away SQL almost entirely, managing schema migrations, associations (Has One, Has Many, Belongs To, Many To Many), and lifecycle hooks automatically.

Because GORM relies heavily on Go's `reflect` package to perform this magic, it incurs a slight performance penalty compared to raw SQL or `sqlx`. However, for many CRUD-heavy applications, the developer velocity it provides outweighs the microsecond latency costs.

#### Defining Models and Auto-Migration
GORM models are standard Go structs heavily annotated with tags. GORM can inspect these structs to automatically generate and run `CREATE TABLE` and `ALTER TABLE` statements.

```go
import (
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
)

// Company belongs to Many Users, Users have One Company
type Company struct {
    ID   uint   `gorm:"primaryKey"`
    Name string `gorm:"uniqueIndex;not null"`
}

type User struct {
    gorm.Model       // Embeds ID, CreatedAt, UpdatedAt, DeletedAt
    Username  string `gorm:"uniqueIndex;size:100"`
    Email     string `gorm:"uniqueIndex"`
    CompanyID uint   // Foreign key for Belongs To relationship
    Company   Company 
}

func initDB(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, err
    }

    // AutoMigrate keeps the schema in sync with the struct definitions
    db.AutoMigrate(&Company{}, &User{})
    return db, nil
}
```

#### Querying with Associations
One of GORM's most powerful features is its ability to traverse and load relational data effortlessly using the `Preload` method, which automatically executes the necessary `JOIN`s or secondary queries.

```go
func getUserWithCompany(db *gorm.DB, userID uint) (User, error) {
    var user User
    
    // First() applies a LIMIT 1. 
    // Preload("Company") fetches the associated Company record based on CompanyID.
    result := db.Preload("Company").First(&user, userID)
    
    if result.Error != nil {
        return User{}, result.Error // Returns gorm.ErrRecordNotFound if no user matches
    }
    
    return user, nil
}
```

### Choosing the Right Paradigm

To summarize the data persistence landscape in Go, refer to this architectural decision matrix:

| Tool / Paradigm | Control | Developer Velocity | Boilerplate | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **`database/sql`** | Absolute | Low | High | High-performance, latency-critical microservices; simple schemas. |
| **`sqlx`** | High | Medium | Medium | Applications heavily reliant on SQL but needing easier struct mapping. |
| **`Squirrel`** | High | Medium | Low | Applications with highly dynamic, multi-parameter search/filter capabilities. |
| **`GORM`** | Low | High | Minimal | CRUD-heavy monoliths, administrative dashboards, rapid prototyping. |

In modern cloud-native Go architecture, it is common to see a hybrid approach: using an ORM like GORM for complex relational data entry and administrative tools, while relying on `sqlx` or pure `database/sql` for the high-throughput read paths of the application.

## 12.4 NoSQL Integrations (MongoDB, Redis, and Cassandra)

Modern cloud-native architectures frequently employ "polyglot persistence"—the practice of choosing different database technologies to handle specific workload requirements. While relational databases excel at structured data and complex joins, NoSQL databases are optimized for horizontal scalability, rapid prototyping, and specific data structures.

Crucially, NoSQL databases **do not** use Go's standard `database/sql` package. Because their querying paradigms—like document traversal, key-value fetching, or wide-column selections—do not map cleanly to tabular SQL structures, each NoSQL database relies on its own idiomatic Go driver and protocol.

```text
+-------------------+       +-------------------------+
|  Go Application   |       |   NoSQL Datastores      |
|                   |       |                         |
|  +-------------+  | BSON  |  +-------------------+  |
|  | mongo-driver|--------->|  | MongoDB (Document)|  |
|  +-------------+  |       |  +-------------------+  |
|                   |       |                         |
|  +-------------+  | RESP  |  +-------------------+  |
|  |  go-redis   |--------->|  | Redis (Key-Value) |  |
|  +-------------+  |       |  +-------------------+  |
|                   |       |                         |
|  +-------------+  | CQL   |  +-------------------+  |
|  |    gocql    |--------->|  | Cassandra (Column)|  |
|  +-------------+  |       |  +-------------------+  |
+-------------------+       +-------------------------+
```

### 1. MongoDB: The Document Store

MongoDB stores data in flexible, JSON-like documents. The official driver, `go.mongodb.org/mongo-driver/mongo`, relies heavily on BSON (Binary JSON) serialization.

When working with MongoDB in Go, you will constantly interact with the `bson` package to construct queries and define document structures. The two most important types are:
* `bson.D`: An ordered representation of a BSON document (used for commands and sorting where order matters).
* `bson.M`: An unordered map (used for general queries and simple updates).

```go
import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

// User represents a MongoDB document
type User struct {
    // primitive.ObjectID is the Go equivalent of MongoDB's _id
    ID    primitive.ObjectID `bson:"_id,omitempty"` 
    Name  string             `bson:"name"`
    Roles []string           `bson:"roles"`
}

func mongoExample() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // 1. Establish connection
    client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect(ctx)

    // 2. Select database and collection
    collection := client.Database("appdb").Collection("users")

    // 3. Insert a document
    newUser := User{Name: "Alice", Roles: []string{"admin", "user"}}
    res, err := collection.InsertOne(ctx, newUser)
    fmt.Printf("Inserted ID: %v\n", res.InsertedID)

    // 4. Query a document using bson.M
    filter := bson.M{"name": "Alice"}
    var result User
    
    err = collection.FindOne(ctx, filter).Decode(&result)
    if err == mongo.ErrNoDocuments {
        fmt.Println("No user found")
    } else if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Found user: %+v\n", result)
}
```

### 2. Redis: The In-Memory Data Structure Store

Redis is indispensable in modern architectures, serving as a high-performance cache, rate limiter, session store, or message broker. The community standard driver is `github.com/redis/go-redis/v9`.

A key feature of the `go-redis` v9 API is that it requires a `context.Context` as the first argument to every command. This perfectly aligns with Go's best practices for managing timeouts and request cancellation in microservices (which we will cover deeply in Chapter 14).

```go
import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

func redisExample() {
    ctx := context.Background()

    // 1. Initialize the client (automatically manages a connection pool)
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "", // no password set
        DB:       0,  // use default DB
    })
    defer rdb.Close()

    // 2. Set a key with a Time-To-Live (TTL)
    err := rdb.Set(ctx, "session:user:123", "active", 15*time.Minute).Err()
    if err != nil {
        panic(err)
    }

    // 3. Get a key
    val, err := rdb.Get(ctx, "session:user:123").Result()
    if err == redis.Nil {
        fmt.Println("Session does not exist or has expired")
    } else if err != nil {
        panic(err)
    } else {
        fmt.Println("Session status:", val)
    }
}
```

### 3. Cassandra: The Wide-Column Store

Apache Cassandra (and its API-compatible cloud counterpart, ScyllaDB) is designed to handle massive amounts of data across multiple geographic regions with zero single points of failure. The de facto driver for Go is `github.com/gocql/gocql`.

Unlike MongoDB or Redis, interacting with Cassandra feels somewhat similar to relational databases because it uses the Cassandra Query Language (CQL), which resembles SQL. However, `gocql` operates via a `*gocql.Session` connected to a `*gocql.ClusterConfig` rather than standard database connection strings, explicitly acknowledging the distributed nature of the database.

```go
import (
    "fmt"
    "log"

    "github.com/gocql/gocql"
)

func cassandraExample() {
    // 1. Configure the Cluster
    // You typically provide a comma-separated list of initial contact points
    cluster := gocql.NewCluster("192.168.1.100", "192.168.1.101")
    cluster.Keyspace = "system_auth" // Target keyspace (analogous to a database)
    cluster.Consistency = gocql.Quorum // Define replication consistency level

    // 2. Create the Session
    session, err := cluster.CreateSession()
    if err != nil {
        log.Fatal(err)
    }
    defer session.Close()

    // 3. Execute a Query
    var role string
    var isSuperuser bool

    // Similar to database/sql, we use query placeholders (?)
    query := `SELECT role, is_superuser FROM roles WHERE role = ? LIMIT 1`
    
    err = session.Query(query, "cassandra").Scan(&role, &isSuperuser)
    if err != nil {
        if err == gocql.ErrNotFound {
            fmt.Println("Role not found")
        } else {
            log.Fatal(err)
        }
    } else {
        fmt.Printf("Role: %s, Superuser: %v\n", role, isSuperuser)
    }
}
```

When integrating these NoSQL solutions, the driver selection dictates the design patterns. MongoDB necessitates structural mapping via tags, Redis requires meticulous timeout management via Context, and Cassandra demands an understanding of distributed consistency levels directly within your Go code.

## 12.5 Implementing and Automating Database Migrations

In Section 12.3, we explored how ORMs like GORM can automatically generate database schemas using `AutoMigrate()`. While this is an excellent feature for rapid prototyping, relying on automatic, state-inferred migrations in a production environment is a recipe for disaster. Production databases require deterministic, trackable, and reversible schema changes. 

Database migrations treat your database schema like application code. They provide version control for your database, ensuring that every environment (development, staging, and production) is in the exact same state.

### The Anatomy of a Migration

A migration system typically relies on a series of numbered SQL files. For every change to the database, you write two scripts:
1.  **Up Migration:** The SQL required to apply the change (e.g., `CREATE TABLE`, `ALTER TABLE ADD COLUMN`).
2.  **Down Migration:** The exact inverse SQL required to revert the change (e.g., `DROP TABLE`, `ALTER TABLE DROP COLUMN`).

To ensure migrations are applied in the correct sequence, files are prefixed with a version number, usually a sequential integer or a timestamp.

```text
db/migrations/
├── 000001_create_users_table.up.sql
├── 000001_create_users_table.down.sql
├── 000002_add_status_to_users.up.sql
└── 000002_add_status_to_users.down.sql
```

The migration tool tracks which migrations have been applied by creating a hidden metadata table in your database (e.g., `schema_migrations`). When you run the migration command, the tool compares the files on disk against the database table and only executes the missing `up.sql` files.

### Tooling: `golang-migrate` and `goose`

The Go ecosystem has several excellent migration tools. The two most prominent are:

* **`golang-migrate/migrate`:** The de facto standard for cloud-native Go applications. It is strictly SQL-based, extremely robust, and supports reading migration files from cloud storage (S3, GCS) or embedded file systems.
* **`pressly/goose`:** Another highly popular tool that allows you to write migrations either in raw SQL or as Go functions. Writing migrations in Go is useful when a schema change requires complex data transformations that are difficult to express in pure SQL.

For this section, we will focus on `golang-migrate`, as its architecture perfectly complements containerized deployments.

### Automating Migrations with `go:embed`

Historically, deploying an application that ran its own migrations meant you had to ship the SQL files alongside the compiled Go binary. This complicated Dockerfiles and created fragile file-path dependencies.

With the introduction of the `go:embed` directive in Go 1.16, you can compile your migration SQL files directly into your standalone Go binary. This aligns perfectly with the cloud-native philosophy of building single, immutable artifacts.

Here is how you implement an embedded, automated migration sequence using `golang-migrate` on application startup:

```go
package main

import (
    "database/sql"
    "embed"
    "errors"
    "fmt"
    "log"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    "github.com/golang-migrate/migrate/v4/source/iofs"
    _ "github.com/lib/pq"
)

//go:embed db/migrations/*.sql
var fs embed.FS

func runDatabaseMigrations(db *sql.DB) error {
    // 1. Tell golang-migrate to use our embedded file system
    sourceDriver, err := iofs.New(fs, "db/migrations")
    if err != nil {
        return fmt.Errorf("failed to create migration source driver: %w", err)
    }

    // 2. Tell golang-migrate about our active database connection
    dbDriver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return fmt.Errorf("failed to create migration database driver: %w", err)
    }

    // 3. Initialize the migrator
    migrator, err := migrate.NewWithInstance(
        "iofs", sourceDriver,
        "postgres", dbDriver,
    )
    if err != nil {
        return fmt.Errorf("failed to initialize migrator: %w", err)
    }

    // 4. Run the Up migrations
    err = migrator.Up()
    
    // 5. Handle the result
    if err != nil {
        if errors.Is(err, migrate.ErrNoChange) {
            log.Println("Database schema is already up to date.")
            return nil
        }
        return fmt.Errorf("failed to apply migrations: %w", err)
    }

    log.Println("Database migrations applied successfully!")
    return nil
}

func main() {
    db, err := sql.Open("postgres", "postgres://user:pass@localhost:5432/mydb?sslmode=disable")
    if err != nil {
        log.Fatalf("Database connection failed: %v", err)
    }
    defer db.Close()

    // Execute migrations before starting the application logic
    if err := runDatabaseMigrations(db); err != nil {
        log.Fatalf("Startup failed: %v", err)
    }

    // ... start HTTP server or workers
}
```

### Execution Strategy: Startup vs. CI/CD

While the code above successfully automates migrations on application startup, you must carefully consider *where* and *when* this code executes based on your deployment architecture.

#### 1. The Application Startup Strategy (Simple, but Risky at Scale)
Running `migrator.Up()` in your `main()` function is highly convenient. However, in a cloud-native environment (like Kubernetes), deploying a new version of your app usually means spinning up multiple replicas simultaneously. 

If three pods start at the exact same millisecond, they will all attempt to run the migrations. Robust tools like `golang-migrate` use database locking (e.g., PostgreSQL advisory locks) to ensure only one instance actually executes the SQL, but this can still lead to startup delays or deadlocks if the migration takes a long time. Furthermore, if a migration fails, your application crashes in a restart loop.

#### 2. The CI/CD Pipeline Strategy (The Standard)
In strict production environments, migrations are decoupled from the application code entirely. The CI/CD pipeline runs a standalone container (often utilizing the `golang-migrate` CLI tool) to execute the migrations against the production database *before* the new application containers are deployed.

#### 3. The Init Container Strategy (Kubernetes Native)
A hybrid approach involves using Kubernetes Init Containers. An Init Container runs to completion before the main application container starts. You can configure a specific Init Container whose sole job is to execute the compiled Go migration code. If it succeeds, the main application starts (and it doesn't need to check migrations itself). If it fails, the deployment halts, preventing broken application code from serving traffic.

Regardless of the execution strategy, treating database schema changes as immutable, version-controlled code is a mandatory practice for mastering cloud-native Go architecture.