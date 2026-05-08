The transition from abstract logical models to a concrete, operational database is governed by the Data Definition Language (DDL). This chapter explores how to instantiate normalized schemas into physical structures using SQL. We move beyond theoretical entities to define exact data types and storage parameters that dictate disk footprint and query performance. You will learn to construct tables and views, enforce strict business rules through declarative constraints and procedural triggers, and adopt modern, version-controlled strategies for managing schema alterations without disrupting production availability.

## 8.1 Choosing Appropriate Data Types and Storage Parameters

The transition from a logical relational schema (as established in Part III) to a physical database implementation begins with the Data Definition Language (DDL). While normalization ensures logical integrity, physical design dictates how the system stores, retrieves, and updates that data on disk. The most foundational decision in this phase is selecting the correct data types and configuring storage parameters for each attribute.

Choosing the right data type is not merely about ensuring the data "fits"; it is a critical exercise in performance optimization, memory management, and data integrity.

### The Impact of Data Type Selection

A common pitfall in physical design is over-provisioning—using a `BIGINT` when a `SMALLINT` would suffice, or defaulting to `VARCHAR(255)` for every string. Because databases read and write data in fixed-size blocks or pages (which will be detailed in Chapter 9), the physical size of a row directly dictates how many rows can fit into a single page.

Smaller data types lead to:

* **Denser Pages:** More rows per disk block, reducing I/O operations.
* **Efficient Caching:** More records fit into the database's memory buffer pool.
* **Faster Sorting and Scanning:** Operations require less CPU and memory overhead.

### Core Data Type Categories

Database Management Systems (DBMS) offer a wide array of data types, generally adhering to SQL standards but often with proprietary extensions.

#### 1. Numeric Types

Numerics are divided into exact and approximate categories.

* **Exact Numerics (Integers):** Ranging from `TINYINT` (1 byte) to `BIGINT` (8 bytes). Always choose the smallest integer type that can safely contain the maximum expected value.
* **Exact Numerics (Decimals/Numerics):** Defined with precision and scale (e.g., `DECIMAL(10,2)`). These are mandatory for financial data where rounding errors are unacceptable. They require more storage and CPU cycles than integers.
* **Approximate Numerics (Floating Point):** Types like `FLOAT` and `REAL`. These use IEEE 754 standards to store extremely large or small numbers. They are highly efficient for scientific calculations but must **never** be used for exact values like currency due to inherent binary rounding behaviors.

#### 2. Character and String Types

The choice between fixed-length and variable-length strings depends heavily on the uniformity of the data.

* **Fixed-Length (`CHAR(n)`):** Pads the data with spaces to always consume exactly *n* bytes. This is highly efficient for data with consistent lengths (e.g., MD5 hashes, 2-letter country codes, fixed-length IDs) because the database knows exactly where the next column begins without calculating offsets.
* **Variable-Length (`VARCHAR(n)`):** Stores only the actual characters plus a small overhead (usually 1 or 2 bytes) to record the string's length. Ideal for names, descriptions, and email addresses.

```text
+-------------------------------------------------------------+
| Memory Layout Comparison: CHAR(10) vs VARCHAR(10)           |
| Storing the string "DBA"                                    |
+-------------------------------------------------------------+
|                                                             |
| CHAR(10):    [D][B][A][ ][ ][ ][ ][ ][ ][ ]                 |
|              (Consumes 10 bytes on disk, fixed offset)      |
|                                                             |
| VARCHAR(10): [3][D][B][A]                                   |
|              (Consumes 4 bytes: 1 length byte + 3 data)     |
+-------------------------------------------------------------+

```

#### 3. Temporal Types

Dates and times present unique challenges, primarily regarding time zones and precision.

* **DATE:** Stores only the calendar date.
* **TIMESTAMP / DATETIME:** Stores both date and time.
* **TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ):** The gold standard for modern, globally distributed applications. It typically converts the input time to UTC for physical storage and translates it back to the client's local timezone upon retrieval, ensuring absolute point-in-time consistency.

### Advanced Storage Parameters

Beyond data types, DDL allows designers to specify how data behaves at the storage layer. While actual disk architecture is covered later, the schema definition often requires setting parameters that govern block usage.

#### Fill Factor (PCTFREE)

When a row is created, it takes up a certain amount of space. If a subsequent `UPDATE` operation increases the size of a variable-length column (e.g., updating a `VARCHAR` field from "N/A" to a 500-word description), the row expands.

If the database page is already full, the expanded row can no longer fit, resulting in a **page split** or **row chaining/migration**. Both severely degrade performance.

To prevent this, designers use storage parameters like **Fill Factor** (in SQL Server) or **PCTFREE** (in Oracle/PostgreSQL). This setting tells the DBMS to leave a percentage of each data page intentionally empty during initial `INSERT` operations to accommodate future row expansion.

```text
+---------------------------------------+
|  Database Data Page (e.g., 8KB)       |
+---------------------------------------+
| Page Header (Metadata, LSN, etc.)     |
+---------------------------------------+
| Row 1: ID=1, Name="Alice"...          |
| Row 2: ID=2, Name="Bob"...            |
| Row 3: ID=3, Name="Charlie"...        |
+---------------------------------------+
|                                       |
|  Reserved Free Space (e.g., 20%)      |
|  (PCTFREE = 20)                       |
|                                       |
|  --> Used when Row 2 updates and      |
|      requires more bytes.             |
+---------------------------------------+

```

* **Read-Heavy Tables (e.g., Data Warehouses):** Set free space to 0% (Fill Factor 100%) to pack as many rows into a page as possible.
* **Write-Heavy Tables (e.g., Transactional Logs):** Set a higher free space percentage to prevent costly page splits during constant updates.

#### Character Sets and Collations

A final, critical parameter defined during schema creation is the character set and collation.

* The **Character Set** (e.g., `UTF8MB4`, `LATIN1`) defines how characters are mapped to bytes. `UTF8MB4` requires up to 4 bytes per character, meaning a `VARCHAR(50)` could theoretically consume up to 200 bytes.
* The **Collation** (e.g., `utf8mb4_unicode_ci`) dictates the rules for sorting and comparing strings, including case sensitivity and accent sensitivity. Defining this incorrectly at the schema level can invalidate indexes and force full table scans during string comparisons.

## 8.2 Creating and Modifying Tables, Views, and Materialized Views

Once the logical schema is finalized and data types are selected, the next step in physical database design is instantiating these structures using SQL's Data Definition Language (DDL). The three foundational objects used to store, project, and optimize relational data are tables, views, and materialized views. Understanding how to define and evolve these objects is critical for a maintainable and performant database architecture.

### 1. Tables: The Physical Data Store

Tables are the fundamental building blocks of a relational database, representing the physical implementation of the entities defined during conceptual modeling.

#### Creating Tables

The `CREATE TABLE` statement dictates the table's name, its columns, data types, and base constraints. It serves as the physical blueprint.

```sql
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    department_id INT,
    salary DECIMAL(10, 2),
    hire_date DATE DEFAULT CURRENT_DATE
);

```

When this DDL is executed, the DBMS allocates physical disk space (extents and pages) to store the incoming rows and registers the table's metadata in the system catalog.

#### Modifying Tables

Business requirements are rarely static, and database schemas must evolve. The `ALTER TABLE` statement allows administrators to modify the physical structure of an existing table without dropping it and losing the underlying data.

Common operations include:

* **Adding Columns:** `ALTER TABLE employees ADD email VARCHAR(100);`
* **Modifying Data Types:** Expanding a column (e.g., `VARCHAR(50)` to `VARCHAR(100)`) is generally a fast metadata operation. However, shrinking a column or changing its fundamental type (e.g., `VARCHAR` to `INT`) may require a full table rewrite, which can block read/write operations on large datasets.
* **Dropping Columns:** `ALTER TABLE employees DROP COLUMN salary;`

> **Design Tip:** While `ALTER TABLE` is powerful, applying structural changes to massive, highly-trafficked tables in production can cause severe locking issues. Modern schema migrations often rely on strategic techniques, such as creating a new table and migrating data in batches, which will be discussed in Section 8.4.

---

### 2. Standard Views: The Virtual Tables

A view is a stored SQL query that acts as a virtual table. It does not store data itself; instead, it dynamically fetches data from underlying "base" tables every time it is queried.

#### Benefits of Standard Views

1. **Security and Access Control:** Views can restrict access to specific rows (e.g., only showing employees in the 'Sales' department) or specific columns (e.g., hiding the `salary` column), allowing you to grant users access to the view rather than the base table.
2. **Simplifying Complexity:** Complex `JOIN` operations, aggregations, and subqueries can be encapsulated within a single view. Applications can query the view as if it were a simple, flat table.
3. **Schema Abstraction:** If the underlying base table structure changes, the view can be modified to return the same column names, insulating legacy applications from breaking.

```sql
-- Creating a secure view that hides sensitive data
CREATE VIEW public_employee_directory AS
SELECT employee_id, first_name, last_name, department_id
FROM employees;

```

#### Modifying Views

Because standard views do not store physical data, modifying them is typically a lightweight operation using `CREATE OR REPLACE VIEW` or `ALTER VIEW`.

---

### 3. Materialized Views: Bridging Storage and Computation

While standard views are excellent for abstraction, they execute their defining query *every time* they are accessed. If a view contains a highly complex aggregation across millions of rows, querying it will be computationally expensive and slow.

**Materialized Views** solve this by executing the query and saving the resulting dataset physically to the disk, just like a standard table.

```text
+-------------------------------------------------------------------------+
|                  Standard View vs. Materialized View                    |
+-------------------------------------------------------------------------+
|                                                                         |
|  [Standard View Query Flow]                                             |
|  Client ----> Query View ----> DBMS Computes Base SQL ----> Returns     |
|                                (High CPU, Slow for complex joins)       |
|                                                                         |
|  [Materialized View Query Flow]                                         |
|  Client ----> Query M-View --> DBMS Reads Pre-Built Data -> Returns     |
|                                (Low CPU, Fast read, but uses disk space)|
+-------------------------------------------------------------------------+

```

#### The Trade-off: Staleness vs. Performance

The primary challenge with materialized views is **data staleness**. When the base tables are updated, the data inside the materialized view becomes out of sync. Database designers must define a refresh strategy:

* **ON DEMAND:** The materialized view is only updated when an administrator or scheduled job explicitly triggers a refresh (e.g., `REFRESH MATERIALIZED VIEW sales_summary;`). This is common in Data Warehousing (Chapter 15) where data is loaded nightly.
* **ON COMMIT:** The materialized view is updated automatically in the same transaction that updates the base table. This guarantees fresh data but imposes a heavy write penalty on the base table.

#### Modifying Materialized Views

Altering a materialized view often requires rebuilding the physical data structure entirely. If the underlying logic needs to change, it generally involves dropping the object and recreating it, which can be resource-intensive depending on the size of the pre-computed dataset.

## 8.3 Implementing Constraints and Database Triggers in SQL

While the conceptual and logical design phases (Parts II and III) define the business rules and relationships governing your data, the physical design phase must strictly enforce them. In a relational database, data integrity is safeguarded at the storage tier using declarative constraints and procedural triggers. Implementing these correctly ensures that invalid data never reaches the disk, regardless of bugs or oversights in the application layer.

### 1. Declarative Constraints in DDL

Constraints are rules applied to columns or tables that the Database Management System (DBMS) validates during every `INSERT`, `UPDATE`, or `DELETE` operation. Because they are baked into the schema, they are highly optimized by the database engine.

Constraints can be defined inline (at the column level) or out-of-line (at the table level).

#### Key Integrity Constraints

* **PRIMARY KEY:** Uniquely identifies each record. Physically, creating a primary key almost always generates a unique index (often a clustered index, which dictates the physical sorting of the data on disk, as detailed in Chapter 9).
* **FOREIGN KEY:** Enforces referential integrity between tables. When implementing a foreign key, the designer must decide how the database should handle the deletion or modification of the referenced parent row.
* `RESTRICT` / `NO ACTION`: Prevents deletion of the parent if child records exist.
* `CASCADE`: Automatically deletes or updates the corresponding child records.
* `SET NULL`: Sets the child's foreign key column to `NULL`.



```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    -- Table-level Foreign Key with Cascade
    CONSTRAINT fk_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) 
        ON DELETE CASCADE
);

```

#### Domain Integrity Constraints

* **UNIQUE:** Ensures all values in a column (or composite set of columns) are distinct. Like the primary key, this physically creates a unique non-clustered index behind the scenes.
* **NOT NULL:** Rejects any `INSERT` or `UPDATE` that attempts to leave the column blank.
* **CHECK:** Evaluates a boolean expression before allowing data modification. This is essential for enforcing domain rules that span multiple columns or require specific data ranges.

```sql
ALTER TABLE employees
ADD CONSTRAINT chk_salary_range 
CHECK (salary >= 30000 AND salary <= 500000);

```

> **Performance Note:** While constraints are essential for data quality, they incur a transactional cost. Every time a row is inserted into the `orders` table, the DBMS must perform a hidden read operation against the `customers` table to validate the foreign key. In high-throughput, write-heavy systems, designers must carefully balance constraint strictness with write latency.

---

### 2. Database Triggers: Procedural Enforcement

When declarative constraints (`CHECK`, `FOREIGN KEY`) are not expressive enough to handle complex business logic, database designers utilize **Triggers**. A trigger is a specialized stored procedure that the DBMS automatically executes (or "fires") in response to specific Data Manipulation Language (DML) events—namely `INSERT`, `UPDATE`, or `DELETE`.

#### The Trigger Execution Pipeline

Triggers operate at specific points in the DML lifecycle, allowing developers to intercept and modify operations.

```text
+-------------------------------------------------------------+
|               DML Statement Execution Pipeline              |
+-------------------------------------------------------------+
|  1. Client issues INSERT / UPDATE / DELETE                  |
|                           |                                 |
|  2. BEFORE Triggers Fire  |  (Can modify incoming data)     |
|                           V                                 |
|  3. Constraints Checked   |  (PK, FK, CHECK, UNIQUE)        |
|                           |  (Rollback if violated)         |
|                           V                                 |
|  4. Data modified in Buffer Pool / Disk                     |
|                           |                                 |
|  5. AFTER Triggers Fire   V  (For logging/cross-table sync) |
|                           |                                 |
|  6. Transaction Completes (Commit or Rollback)              |
+-------------------------------------------------------------+

```

#### Types of Triggers

1. **BEFORE Triggers:** Execute before constraints are checked or data is written. They are typically used to format incoming data (e.g., forcing text to uppercase), calculate derived column values, or perform complex pre-validation that a `CHECK` constraint cannot handle.
2. **AFTER Triggers:** Execute after the data modification is successful. They are heavily utilized for cross-table operations, such as writing to an audit log table or updating aggregate summary tables.
3. **INSTEAD OF Triggers:** Completely bypass the triggering DML statement. These are exclusively used on Views (particularly complex, multi-table views) to translate a generic `UPDATE` against the view into specific, valid `UPDATE` statements against the underlying base tables.

#### Example: Implementing an Audit Trail with an AFTER Trigger

One of the most common physical design patterns for security and compliance is using an `AFTER UPDATE` trigger to maintain an immutable history of data changes.

```sql
-- Trigger pseudo-code (syntax varies by DBMS like PL/pgSQL or T-SQL)
CREATE TRIGGER trg_audit_employee_salary
AFTER UPDATE ON employees
FOR EACH ROW
WHEN (OLD.salary IS DISTINCT FROM NEW.salary)
BEGIN
    INSERT INTO salary_audit_log (
        employee_id, 
        old_salary, 
        new_salary, 
        changed_by, 
        change_date
    ) VALUES (
        NEW.employee_id, 
        OLD.salary, 
        NEW.salary, 
        CURRENT_USER, 
        CURRENT_TIMESTAMP
    );
END;

```

#### The Dangers of Triggers

While highly capable, triggers are often considered a "code smell" in modern database architecture if overused. They introduce hidden side effects that are not immediately obvious to application developers reading the codebase.

Furthermore, triggers can cause **Mutating Table Errors** (if a trigger attempts to read or modify the table that fired it) and **Cascading Triggers** (where an update in Table A fires a trigger updating Table B, which fires a trigger updating Table C). This chain reaction can lead to deadlocks, severe performance degradation, and transaction timeouts. Therefore, triggers should be used judiciously, strictly for database-centric tasks like auditing or strict referential integrity, rather than housing core application business logic.

## 8.4 Managing Schema Alterations and Version Migrations

Database schemas are not static artifacts. As business requirements change and applications evolve, the underlying physical database must adapt. However, managing schema alterations introduces a fundamental challenge that application code deployments do not face: **state**. You cannot simply overwrite a database schema without considering the gigabytes or terabytes of data currently residing within those structures. A poorly planned `ALTER TABLE` statement on a multi-million-row table can result in exclusive table locks, application timeouts, and catastrophic production downtime.

Modern physical database design requires treating the schema as code, utilizing structured methodologies to manage versions, automate deployments, and ensure zero-downtime migrations.

### 1. State-Based vs. Migration-Based Management

There are two primary paradigms for tracking and applying schema changes in a version control system (VCS) like Git.

#### State-Based Approach

In a state-based model, the code repository reflects the *desired end-state* of the database. Every table, view, and trigger has its own `.sql` file representing its current structure.

* **Deployment:** A deployment tool compares the repository's state against the live production database. It then dynamically generates the necessary DDL scripts (the "diff") to make production match the repository.
* **Pros:** Easy to see the current structure in version control.
* **Cons:** The generated diffs can be unpredictable, especially for complex operations like table splits or column renames (the tool might drop and recreate a table instead of renaming it, causing data loss).

#### Migration-Based Approach

In a migration-based model, the repository contains an immutable, chronologically ordered sequence of DDL scripts. The current state of the database is the sum of all executed scripts.

* **Deployment:** A migration engine (e.g., Flyway, Liquibase) checks a metadata table in the target database to see which scripts have already run, and applies only the pending scripts in sequential order.
* **Pros:** Highly predictable; the exact script tested in staging is the exact script executed in production.
* **Cons:** Harder to visualize the complete current state of a specific table without looking at the live database or reading through dozens of historical migration scripts.

```text
+-------------------+      +-------------------+      +-----------------------+
| Version Control   | ---> | CI/CD Pipeline    | ---> | Migration Engine      |
| (Git)             |      | (Jenkins/Actions) |      | (Flyway / Liquibase)  |
+-------------------+      +-------------------+      +-----------------------+
     | V1.0__Init.sql                                         |
     | V1.1__Add_idx.sql                                      v
     | V1.2__Drop_col.sql                           +-----------------------+
     | V2.0__Add_fk.sql                             | Target Database       |
                                                    |-----------------------|
                                                    | 1. Reads 'schema_log' |
                                                    | 2. Applies pending V2 |
                                                    | 3. Updates log table  |
                                                    +-----------------------+

```

### 2. Transactional DDL and Idempotency

When writing migration scripts, database designers must account for failures. If a migration script contains three `ALTER TABLE` statements and the server crashes on the second one, the database is left in a corrupted, half-migrated state.

* **Transactional DDL:** Some modern relational databases (notably PostgreSQL) support transactional DDL. This means schema changes can be wrapped in a `BEGIN ... COMMIT` block. If any step fails, the entire schema change is rolled back. Conversely, systems like MySQL and Oracle issue an implicit commit before and after every DDL statement, making automated rollbacks impossible.
* **Idempotency:** In systems lacking transactional DDL, scripts must be written idempotently—meaning they can be run multiple times without causing an error or changing the result beyond the initial application. This is achieved using constructs like `CREATE TABLE IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`.

### 3. Zero-Downtime Migrations: The Expand and Contract Pattern

In continuous deployment environments, bringing the application down for a "maintenance window" to update the database schema is unacceptable. Furthermore, the application code and the database schema are often updated at slightly different times during a deployment.

To prevent breaking the live application, designers use the **Expand and Contract** (or Parallel Change) pattern. This breaks destructive schema changes into backward-compatible phases.

#### Scenario: Splitting a column

Suppose a legacy table has a `full_name` column, and the new requirement is to store `first_name` and `last_name` separately.

**Phase 1: Expand (Additive Change)**
Add the new columns to the schema without removing the old one. The database now supports both the old application version (v1) and the new application version (v2). To keep data synchronized during the transition, a database trigger (as discussed in Section 8.3) or application-level dual-writing is implemented.

```text
[Existing Table Structure]
+----+----------------+------------------+-----------------+
| ID | full_name      | first_name (NEW) | last_name (NEW) |
+----+----------------+------------------+-----------------+
| 1  | John Doe       | NULL             | NULL            |
+----+----------------+------------------+-----------------+

```

**Phase 2: Migrate (Data Backfill)**
A background batch process runs to populate the new columns for all historical data, parsing "John Doe" into "John" and "Doe". Because this runs in the background, it does not lock the table or impact live user traffic.

```text
[After Backfill]
+----+----------------+------------------+-----------------+
| ID | full_name      | first_name       | last_name       |
+----+----------------+------------------+-----------------+
| 1  | John Doe       | John             | Doe             |
+----+----------------+------------------+-----------------+

```

**Phase 3: Contract (Destructive Change)**
Once the backfill is complete, and all application servers have been upgraded to v2 (which only reads/writes to `first_name` and `last_name`), the old schema can be safely removed. The synchronization triggers are dropped, and a final migration script executes: `ALTER TABLE users DROP COLUMN full_name;`.

```text
[Final Table Structure]
+----+------------------+-----------------+
| ID | first_name       | last_name       |
+----+------------------+-----------------+
| 1  | John             | Doe             |
+----+------------------+-----------------+

```

By adhering to migration-based deployments and utilizing patterns like Expand and Contract, database administrators and designers can ensure that the physical schema remains agile, resilient, and tightly coupled to the application's lifecycle without sacrificing availability.