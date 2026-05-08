Building on the ACID properties from Chapter 11, this chapter explores how databases safely manage simultaneous transactions. Strict sequential execution guarantees isolation but destroys throughput. Therefore, databases must carefully interleave operations to scale. We will examine critical read/write anomalies—like lost updates and phantom reads—and the primary protocols used to prevent them. From traditional Two-Phase Locking (2PL) and Deadlock Prevention to Optimistic Concurrency Control (OCC) and Multi-Version Concurrency Control (MVCC), you will learn how modern systems balance strict data consistency with high-performance concurrency.

## 12.1 The Lost Update, Dirty Read, and Phantom Read Problems

In Chapter 11, we established that the Isolation property of ACID ensures that concurrent transactions do not interfere with one another. However, true serial execution—running one transaction to completion before starting the next—severely limits a database's throughput and resource utilization. To maximize performance, a Database Management System (DBMS) must interleave the operations of multiple transactions.

When this interleaving occurs without adequate concurrency control mechanisms, it introduces data anomalies known as **read phenomena** or **concurrency problems**. These anomalies compromise database consistency. To design robust databases and select the appropriate isolation levels, database engineers must thoroughly understand the mechanics of the three primary concurrency problems: the Lost Update, the Dirty Read, and the Phantom Read.

### 1. The Lost Update Problem (Write-Write Conflict)

A **Lost Update** occurs when two concurrent transactions read the same piece of data, modify it based on the read value, and then write it back to the database. Because the transactions are unaware of each other, the second transaction's write operation simply overwrites the first transaction's write operation. The changes made by the first transaction are completely lost, leading to an inconsistent state.

Consider an inventory system where two users (Transaction A and Transaction B) attempt to update the stock of a product simultaneously. The initial stock is 100 units. Transaction A wants to add 50 units (a restock), while Transaction B wants to subtract 20 units (a sale).

```text
+------+------------------------------------+------------------------------------+
| Time | Transaction A (Restock 50 units)   | Transaction B (Sell 20 units)      |
+------+------------------------------------+------------------------------------+
|  t1  | READ(Stock)  -> 100                |                                    |
|  t2  |                                    | READ(Stock)  -> 100                |
|  t3  | Stock = Stock + 50  (Calculates 150|                                    |
|  t4  |                                    | Stock = Stock - 20  (Calculates 80)|
|  t5  | WRITE(Stock) -> 150                |                                    |
|  t6  |                                    | WRITE(Stock) -> 80                 |
|  t7  | COMMIT                             | COMMIT                             |
+------+------------------------------------+------------------------------------+

```

**The Result:** The final stock value in the database is 80. The 50 units added by Transaction A have vanished, and the business now has an inaccurate inventory. This is a classic write-write conflict, highlighting the danger of reading data into application memory, modifying it, and writing it back without locking the row or verifying if it changed in the interim.

### 2. The Dirty Read Problem (Read-Write Conflict)

A **Dirty Read** (also known as an Uncommitted Dependency) occurs when a transaction is permitted to read data that has been modified by another concurrent, *uncommitted* transaction.

If the transaction that made the modification eventually commits successfully, the dirty read might not cause immediate logical damage. However, if the modifying transaction fails and executes a `ROLLBACK` (as discussed in Chapter 11), the reading transaction is left holding data that theoretically never existed in the database.

Consider a banking scenario. Transaction A is transferring funds and temporarily updates an account balance. Transaction B reads this balance to generate a daily financial report.

```text
+------+------------------------------------+------------------------------------+
| Time | Transaction A (Fund Transfer)      | Transaction B (Report Generation)  |
+------+------------------------------------+------------------------------------+
|  t1  | READ(Balance) -> $1000             |                                    |
|  t2  | WRITE(Balance) -> $1500            |                                    |
|  t3  |                                    | READ(Balance) -> $1500 <DIRTY READ>|
|  t4  | [System Failure / Rule Violation]  |                                    |
|  t5  | ROLLBACK (Balance reverts to $1000)|                                    |
|  t6  |                                    | Calculate totals using $1500       |
|  t7  |                                    | COMMIT                             |
+------+------------------------------------+------------------------------------+

```

**The Result:** Transaction B generated a financial report based on a balance of $1500. Because Transaction A rolled back, the actual balance is still $1000. Transaction B's report is invalid. Dirty reads occur in isolation levels that prioritize absolute performance over consistency (such as `READ UNCOMMITTED` in the ANSI SQL standard).

*Note: Closely related to the Dirty Read is the **Non-Repeatable Read** (or Fuzzy Read), where a transaction reads the same row twice, but another transaction commits an UPDATE to that row in between the reads. The first transaction gets two different values for the exact same row.*

### 3. The Phantom Read Problem

While Dirty Reads and Non-Repeatable Reads involve modifications to *existing* rows, the **Phantom Read** involves the insertion or deletion of rows.

A Phantom Read occurs when a transaction executes a query that retrieves a set of rows based on a search condition (e.g., `WHERE Department = 'Sales'`). Before the transaction is finished, a second concurrent transaction `INSERT`s or `DELETE`s rows that satisfy that exact search condition and commits. If the first transaction repeats its query, it will see a different set of rows—the "phantoms."

Consider a payroll scenario. Transaction A is calculating the total budget needed for the 'Sales' department bonuses, while Transaction B is simultaneously hiring a new salesperson.

```text
+------+---------------------------------------+----------------------------------+
| Time | Transaction A (Budget Calculation)    | Transaction B (New Hire)         |
+------+---------------------------------------+----------------------------------+
|  t1  | SELECT SUM(Salary) FROM Employees     |                                  |
|      | WHERE Dept = 'Sales'                  |                                  |
|      | -> Returns $500,000 (Based on 5 rows) |                                  |
|  t2  |                                       | INSERT INTO Employees            |
|      |                                       | (Name, Dept, Salary)             |
|      |                                       | VALUES ('John Doe', 'Sales', $60k|
|  t3  |                                       | COMMIT                           |
|  t4  | SELECT COUNT(*) FROM Employees        |                                  |
|      | WHERE Dept = 'Sales'                  |                                  |
|      | -> Returns 6 rows <PHANTOM READ>      |                                  |
|  t5  | COMMIT                                |                                  |
+------+---------------------------------------+----------------------------------+

```

**The Result:** Transaction A calculated a budget for 5 employees, but later in the exact same transaction, it observes that there are 6 employees in the department. The transaction's internal logic is now operating on an inconsistent view of the dataset.

Preventing phantom reads is notoriously difficult because a database cannot easily place a row-level lock on a row that *does not exist yet*. It requires locking an entire range of data (Range Locks) or locking the entire table, which can cause significant bottlenecks.

Understanding these three core anomalies is the prerequisite for designing effective concurrency control. As we move into the subsequent sections, we will explore how Lock-Based Protocols (12.2) and Multi-Version Concurrency Control (12.5) approach the mitigation of these specific phenomena while attempting to maintain high transactional throughput.

## 12.2 Lock-Based Protocols (Shared vs. Exclusive Locks)

To prevent the concurrency anomalies detailed in the previous section (Lost Updates, Dirty Reads, and Phantom Reads), a Database Management System (DBMS) must regulate how transactions access shared data. The most traditional and fundamental mechanism for achieving this isolation is the **lock-based protocol**.

A lock is a system-level control variable associated with a specific data item (such as a row, a page, or an entire table). Before a transaction can perform an operation on a data item, it must first request and acquire the appropriate lock from the database's Lock Manager. If the lock is granted, the transaction proceeds; if the lock is held by another conflicting transaction, the requesting transaction must wait in a queue until the lock is released.

While a simple binary lock (locked/unlocked) guarantees isolation, it severely limits throughput because it forces read operations to wait for other read operations. To maximize concurrency while preserving safety, modern relational databases employ a multiple-mode locking scheme consisting of **Shared** and **Exclusive** locks.

### 1. Shared Locks (S-Locks)

A **Shared Lock** (denoted as **S**) is requested by a transaction when it only needs to *read* a data item.

The defining characteristic of an S-lock is that it is non-restrictive to other readers. If Transaction A holds a Shared Lock on Row 1, Transaction B can also acquire a Shared Lock on Row 1 simultaneously. The DBMS allows multiple transactions to read the same data item concurrently because read operations do not alter the data state and therefore cannot create conflicts with one another.

However, if a transaction holds an S-lock on a data item, no other transaction is permitted to modify that item.

### 2. Exclusive Locks (X-Locks)

An **Exclusive Lock** (denoted as **X**) is requested by a transaction when it intends to *write* (INSERT, UPDATE, or DELETE) a data item.

As the name implies, an Exclusive Lock grants a single transaction absolute, sole access to the data item. If Transaction A holds an X-lock on Row 1, no other transaction can acquire *any* lock (Shared or Exclusive) on Row 1. Other transactions attempting to read or write to that row are blocked and placed in a wait state until Transaction A releases its X-lock.

### The Lock Compatibility Matrix

The rules governing whether the Lock Manager grants or denies a lock request are summarized in the **Lock Compatibility Matrix**.

```text
+-----------------------+-----------------------------------------------+
|                       |            Lock Requested by Transaction B    |
| Current Lock State    +-----------------------+-----------------------+
| (Held by Trans. A)    |      Shared (S)       |    Exclusive (X)      |
+-----------------------+-----------------------+-----------------------+
| Unlocked / None       |       Granted         |       Granted         |
| Shared (S)            |       Granted         |       DENIED (Waits)  |
| Exclusive (X)         |       DENIED (Waits)  |       DENIED (Waits)  |
+-----------------------+-----------------------+-----------------------+

```

### Lock Upgrades and Downgrades

Transactions do not always know in advance if they will need to modify a row. A common pattern is to read a row, evaluate its contents, and conditionally update it.

To support this, lock-based protocols allow **Lock Upgrading** (or lock conversion). A transaction can initially acquire a Shared Lock to read a row, and later issue a request to upgrade that S-lock to an Exclusive Lock. The upgrade is only granted if no other transactions currently hold S-locks on that row. Conversely, a transaction can perform a **Lock Downgrade**, converting an X-lock to an S-lock once it has finished writing but still needs to read the data safely.

### Lock Granularity: The Concurrency vs. Overhead Trade-off

When we say a transaction locks a "data item," what exactly constitutes an item? This is known as **Lock Granularity**. The DBMS can apply locks at various levels of the storage hierarchy:

```text
[Database Level]    <--- Coarsest Granularity (Locks the entire DB)
       |
[Table Level]       <--- Locks an entire table (e.g., Employees)
       |
[Page/Block Level]  <--- Locks a disk page (e.g., containing 50 rows)
       |
[Row/Tuple Level]   <--- Finest Granularity (Locks a single record)

```

There is an inherent trade-off in choosing the granularity level:

* **Fine Granularity (Row-Level Locking):** Maximizes concurrency because transactions only lock the exact data they need. However, it requires high system overhead, as the Lock Manager must track and manage thousands or millions of individual locks.
* **Coarse Granularity (Table-Level Locking):** Minimizes system overhead because only a few locks are managed. However, it severely bottlenecks concurrency; if one transaction is updating a single row in the `Employees` table, a table-level X-lock prevents any other transaction from reading or writing to *any* other employee record.

Most modern relational databases (like PostgreSQL, MySQL/InnoDB, and SQL Server) default to row-level locking for standard DML operations (Data Manipulation Language) and automatically escalate to page or table locks (Lock Escalation) if a transaction attempts to lock a massive number of rows, thereby protecting the Lock Manager from running out of memory.

While Shared and Exclusive locks provide the fundamental mechanisms to prevent conflicts like the Lost Update, simply applying locks immediately before an operation and releasing them immediately after is not enough to guarantee full serializability. To achieve true ACID consistency, these locks must be governed by a broader set of rules: the Two-Phase Locking (2PL) protocol, which we will explore in the next section.

## 12.3 Two-Phase Locking (2PL) and Deadlock Detection/Prevention

While Shared (S) and Exclusive (X) locks provide the mechanism to restrict concurrent access, simply applying these locks is not sufficient to guarantee database consistency. If a transaction acquires and releases locks arbitrarily throughout its execution, it can still produce non-serializable schedules, leading to the very anomalies we discussed in Section 12.1.

To guarantee **serializability**—ensuring that the concurrent execution of transactions yields the exact same results as if they were executed sequentially—databases employ the **Two-Phase Locking (2PL)** protocol.

### 1. The Two-Phase Locking Protocol

The 2PL protocol dictates a strict set of rules regarding *when* a transaction is allowed to acquire and release its locks. As the name suggests, every transaction must go through two distinct, non-overlapping phases:

1. **The Growing Phase (Phase 1):** During this phase, the transaction may request new locks or upgrade existing locks (e.g., from Shared to Exclusive). However, it **cannot release any locks**.
2. **The Shrinking Phase (Phase 2):** Once the transaction releases its first lock, it enters the shrinking phase. During this phase, the transaction may release locks or downgrade existing locks (e.g., from Exclusive to Shared), but it **cannot acquire any new locks**.

The exact moment a transaction acquires its final lock and transitions from the growing phase to the shrinking phase is known as the **Lock Point**.

```text
Number
of Locks
   ^
   |                 [LOCK POINT]
   |                /      \
   |               /        \
   |              /          \
   |             /            \
   |            /              \
   |  GROWING  /                \  SHRINKING
   |   PHASE  /                  \   PHASE
   |         /                    \
   |        /                      \
   +--------------------------------------------> Time
           BEGIN                    COMMIT/
                                    ROLLBACK

```

#### Strict 2PL and Rigorous 2PL

Basic 2PL guarantees serializability, but it introduces a severe vulnerability: **Cascading Rollbacks**. If Transaction A enters its shrinking phase and releases an X-lock on a row, Transaction B might acquire an S-lock to read that row. If Transaction A subsequently fails and rolls back, Transaction B has now read invalid data and must *also* be rolled back.

To prevent this, nearly all modern relational databases implement a variant called **Strict Two-Phase Locking (Strict 2PL)**. In Strict 2PL, a transaction still acquires locks gradually, but it **does not release any Exclusive (X) locks until the transaction commits or aborts**.

An even more restrictive variant, **Rigorous 2PL (or SS2PL)**, mandates that *all* locks (both Shared and Exclusive) are held until the very end of the transaction.

### 2. The Deadlock Problem

The primary side effect of Two-Phase Locking is the inevitability of **deadlocks**. A deadlock is a system state where two or more transactions are indefinitely waiting for one another to release locks, creating a circular dependency. Because neither transaction can proceed to its shrinking phase (or commit) until it acquires the locks held by the other, they remain frozen forever.

Consider the following execution sequence between Transaction A and Transaction B:

```text
+------+------------------------------------+------------------------------------+
| Time | Transaction A                      | Transaction B                      |
+------+------------------------------------+------------------------------------+
|  t1  | Request X-Lock on Row 1 (Granted)  |                                    |
|  t2  |                                    | Request X-Lock on Row 2 (Granted)  |
|  t3  | Request X-Lock on Row 2 (WAITS)    |                                    |
|  t4  |    ...waiting for Trans B...       | Request X-Lock on Row 1 (WAITS)    |
|  t5  |    ...waiting for Trans B...       |    ...waiting for Trans A...       |
+------+------------------------------------+------------------------------------+

```

At `t4`, a deadlock occurs. Transaction A cannot proceed without Row 2 (held by B), and Transaction B cannot proceed without Row 1 (held by A).

Databases must proactively manage deadlocks using one of two primary strategies: Prevention or Detection.

### 3. Deadlock Prevention

Deadlock prevention schemes are designed to ensure that the system never enters a deadlocked state. These protocols often rely on assigning a unique timestamp to each transaction when it begins, establishing an "age" hierarchy (older transactions have earlier timestamps).

Two common timestamp-based prevention protocols are:

* **Wait-Die Protocol (Non-Preemptive):** If a transaction requests a lock held by another, the DBMS checks their ages.
* If the requesting transaction is *older*, it is allowed to **wait**.
* If the requesting transaction is *younger*, it immediately **dies** (rolls back) and restarts with its original timestamp.


* **Wound-Wait Protocol (Preemptive):**
* If the requesting transaction is *older*, it preempts or **wounds** the younger transaction (forcing the younger one to roll back and release its locks).
* If the requesting transaction is *younger*, it is allowed to **wait**.



While prevention guarantees deadlocks won't happen, it is highly aggressive. It often forces the rollback of transactions that *might* have completed successfully without actually causing a deadlock, thereby wasting system resources.

### 4. Deadlock Detection and Resolution

Because prevention can severely impact performance in high-concurrency environments, most modern DBMS architectures (such as SQL Server and PostgreSQL) rely on **Deadlock Detection**. The database assumes deadlocks will happen and actively monitors for them.

The Lock Manager maintains a background data structure called a **Wait-For Graph**. In this directed graph:

* **Nodes** represent active transactions.
* **Edges (Arrows)** represent a lock request, pointing from the transaction waiting for a lock to the transaction currently holding the lock.

A background thread—the Deadlock Detector—periodically sweeps the wait-for graph looking for **cycles** (closed loops). If a cycle is found, a deadlock exists.

```text
      Wait-For Graph Example
      
        +-------------+
        | Transaction |
        |      A      |
        +-------------+
          ^         |
          |         | (A waits for B)
(B waits  |         v
 for A)   |       +-------------+
          |       | Transaction |
          +-------+      B      |
                  +-------------+

```

Once detected, the DBMS must perform **Deadlock Resolution** by choosing one of the transactions in the cycle to be the **victim**. The victim's transaction is forcefully aborted and rolled back, which breaks the cycle and allows the surviving transactions to proceed.

The database does not choose the victim randomly. It evaluates a **cost function** to determine which rollback will cause the least disruption. Factors considered include:

* The number of locks the transaction currently holds.
* The amount of effort (CPU/I/O) the transaction has already expended.
* The number of rows the transaction has already updated (which dictates the cost of undoing its work).

Applications must be programmed to anticipate these victim rollbacks, typically by catching the specific deadlock error code and automatically retrying the failed transaction from the beginning.

## 12.4 Timestamp Ordering and Optimistic Concurrency Control

The lock-based protocols discussed in the previous sections, such as Two-Phase Locking (2PL), are fundamentally **pessimistic**. They operate on the assumption that concurrent transactions *will* conflict, and therefore, they preemptively block access using locks to ensure serializability. While safe, managing locks and resolving deadlocks introduces significant system overhead.

In environments where data contention is low (i.e., transactions rarely attempt to modify the same data simultaneously), this pessimistic approach throttles performance unnecessarily. To address this, databases employ non-locking protocols: **Timestamp Ordering** and **Optimistic Concurrency Control (OCC)**.

### 1. Timestamp Ordering (TO) Protocol

Instead of using locks to dictate execution order, the Timestamp Ordering protocol determines the serializability order of transactions *in advance*.

When a transaction $T_i$ begins, the Database Management System (DBMS) assigns it a unique, monotonically increasing timestamp, denoted as $TS(T_i)$. This timestamp can be derived from the system clock or a logical counter. If transaction $T_1$ starts before $T_2$, then $TS(T_1) < TS(T_2)$. The protocol guarantees that the final database state will be equivalent to a serial execution where older transactions are processed before younger ones.

To enforce this, the DBMS must track two timestamp values for every data item $X$ in the database:

* **$R\_TS(X)$ (Read Timestamp):** The largest (youngest) timestamp of any transaction that has successfully read $X$.
* **$W\_TS(X)$ (Write Timestamp):** The largest (youngest) timestamp of any transaction that has successfully written $X$.

Whenever a transaction attempts a read or write operation, the DBMS compares the transaction's timestamp against the data item's timestamps.

#### The Read Rule

If transaction $T_i$ attempts to read item $X$:

1. If $TS(T_i) < W\_TS(X)$: $T_i$ is trying to read an older value of $X$ that has already been overwritten by a younger transaction. The read is **rejected**, and $T_i$ is rolled back and restarted with a new timestamp.
2. If $TS(T_i) \geq W\_TS(X)$: The read is **allowed**. The database then updates $R\_TS(X)$ to be the maximum of its current value and $TS(T_i)$.

#### The Write Rule

If transaction $T_i$ attempts to write item $X$:

1. If $TS(T_i) < R\_TS(X)$: $T_i$ is trying to overwrite a value that a younger transaction has already read (which would cause a Dirty/Inconsistent Read for the younger transaction). The write is **rejected**, and $T_i$ is rolled back.
2. If $TS(T_i) < W\_TS(X)$: $T_i$ is trying to write an obsolete value because a younger transaction has already updated $X$. Basic TO **rejects** this and rolls back $T_i$.
3. Otherwise: The write is **allowed**, and $W\_TS(X)$ is updated to $TS(T_i)$.

#### Thomas Write Rule (Optimization)

In 1979, Robert H. Thomas introduced an optimization for the Write Rule. If a transaction violates condition #2 ($TS(T_i) < W\_TS(X)$), but does *not* violate condition #1, it means $T_i$'s write is outdated, but no younger transaction has actively read the old value yet.

Instead of rolling back $T_i$, the **Thomas Write Rule** simply ignores the write operation. The database pretends the write occurred but allows the younger, more recent value to remain. This effectively solves the Lost Update problem without forcing a costly transaction abort.

### 2. Optimistic Concurrency Control (OCC)

Optimistic Concurrency Control (also known as the Validation-Based Protocol) takes a different philosophical approach: *it is better to ask for forgiveness than permission.*

OCC assumes that conflicts are so rare that transactions should be allowed to execute completely without acquiring any locks or checking timestamps during their execution. Instead, validation happens strictly at the end of the transaction lifecycle.

Under OCC, every transaction proceeds through three distinct phases:

```text
+------------------------------------------------------------------------+
|                      The Three Phases of OCC                           |
+------------------------------------------------------------------------+
|                                                                        |
|  [ 1. READ PHASE ]                                                     |
|  Transaction reads data from the database but performs all WRITES      |
|  to a temporary, private workspace in memory. No other transaction     |
|  can see these changes.                                                |
|           |                                                            |
|           v                                                            |
|  [ 2. VALIDATION PHASE ]                                               |
|  When the transaction issues a COMMIT, the DBMS checks if applying     |
|  the private workspace to the database will violate serializability    |
|  (i.e., it checks for conflicts with other concurrent transactions).   |
|           |                                                            |
|           +-----------------------+                                    |
|           | (Passes Validation)   | (Fails Validation)                 |
|           v                       v                                    |
|  [ 3. WRITE PHASE ]       [ TRANSACTION ABORTED ]                      |
|  The changes in the       The private workspace is discarded.          |
|  private workspace        The transaction is rolled back and           |
|  are permanently          restarted from the Read Phase.               |
|  applied to the DB.                                                    |
+------------------------------------------------------------------------+

```

#### The Validation Process

To perform validation, the DBMS assigns a timestamp to the transaction only when it enters the Validation Phase (unlike Timestamp Ordering, which assigns it at the very beginning). The DBMS also keeps track of two sets for every active transaction:

* **Read Set ($RS$):** The data items the transaction read.
* **Write Set ($WS$):** The data items the transaction modified in its private workspace.

For a validating transaction $T_v$ to succeed, the DBMS checks it against all previously committed transactions ($T_c$) that executed concurrently. The most common validation rule ensures that:

* The Write Set of the committed transaction $T_c$ does not intersect with the Read Set of the validating transaction $T_v$. ($WS(T_c) \cap RS(T_v) = \emptyset$).

If this condition holds true, it means $T_v$ did not base its internal logic on data that was modified by $T_c$ behind its back. $T_v$ passes validation and enters the Write Phase. If the sets intersect, $T_v$ fails validation and is instantly aborted.

### Evaluating the Trade-offs: Pessimistic vs. Optimistic

Choosing between Lock-Based (Pessimistic) and Validation-Based (Optimistic) concurrency control depends entirely on the workload's characteristics.

* **Pessimistic Control (2PL)** is ideal for **High-Contention Environments** (e.g., heavily trafficked financial ledgers or inventory systems). The overhead of locking is worth it because, without it, the system would spend all its CPU cycles continuously aborting and restarting transactions that collide.
* **Optimistic Control (OCC)** is ideal for **Low-Contention, Read-Heavy Environments** (e.g., content management systems or analytical workloads). Because reads outnumber writes, collisions are rare. Transactions execute at maximum speed without the bottleneck of a Lock Manager, and the occasional aborted transaction is a small price to pay for the massive gain in overall throughput.

Modern architectures have evolved to combine the best of both worlds. As we will see in Section 12.5, Multi-Version Concurrency Control (MVCC) blends optimistic read behaviors with pessimistic write protections to provide non-blocking reads in highly concurrent systems.

## 12.5 Multi-Version Concurrency Control (MVCC) Architecture

As database workloads scale, the fundamental limitations of the concurrency control models discussed earlier become apparent. Lock-based protocols (Section 12.2) guarantee safety but severely restrict throughput by forcing read operations to wait for write operations. Conversely, Optimistic Concurrency Control (Section 12.4) allows high concurrency but can suffer from cascading aborts in write-heavy environments.

**Multi-Version Concurrency Control (MVCC)** bridges this gap. It is the architectural foundation of most modern, high-performance relational databases, including PostgreSQL, Oracle, and MySQL (via the InnoDB engine).

The defining mantra of MVCC is simple but powerful: **Readers do not block writers, and writers do not block readers.**

### 1. The Core Philosophy of Versioning

In a traditional lock-based system, an `UPDATE` operation modifies a record in place. In MVCC, data is treated as virtually immutable. When a transaction modifies a row, the database does not overwrite the existing data. Instead, it creates a completely new **version** of that row.

Because multiple versions of a single logical row can coexist in the database simultaneously, the database can provide different transactions with different views of the data, based on when those transactions started.

### 2. Transaction IDs and Row Metadata

To manage these versions, the DBMS assigns a unique, incrementally advancing Transaction ID (TXID) to every transaction when it begins execution. Furthermore, every physical row in the database is augmented with hidden metadata columns that track its lifecycle:

* **Created_By (Insert TXID):** The ID of the transaction that created this version of the row.
* **Deleted_By (Delete/Expire TXID):** The ID of the transaction that marked this version as deleted or obsolete. If the row is the current, active version, this value is null or infinity.

Consider a simple `Accounts` table. Transaction 50 (T50) inserts an account for Alice. Later, Transaction 62 (T62) updates Alice's balance. Under the hood, the physical storage looks like this:

```text
+-------+------------+------------+-----------+---------+--------------------------+
| RowID | Created_By | Deleted_By | Name      | Balance | State / Status           |
+-------+------------+------------+-----------+---------+--------------------------+
|   1   |    T50     |    T62     | Alice     | $100    | OBSOLETE (Old Version)   |
|   2   |    T62     |    NULL    | Alice     | $150    | ACTIVE (Current Version) |
+-------+------------+------------+-----------+---------+--------------------------+

```

Notice that the `UPDATE` performed by T62 is actually executed as two operations: a `DELETE` of Row 1 (setting `Deleted_By` to T62) and an `INSERT` of Row 2 (setting `Created_By` to T62).

### 3. Snapshot Isolation and Read Rules

When a new transaction starts, the database takes a "snapshot" of the current system state, recording which transactions are currently active. When this transaction attempts to read data, it evaluates the metadata of every row version against its own TXID to determine visibility.

For a transaction ($T_{current}$) to see a specific row version, the version must satisfy two primary rules:

1. **It must have been committed before $T_{current}$ started:** `Created_By` < $T_{current}$.
2. **It must NOT have been deleted before $T_{current}$ started:** `Deleted_By` is NULL, or `Deleted_By` > $T_{current}$ (meaning the deletion happened in the future relative to the snapshot).

**The Result:** If Transaction 55 reads Alice's account while T62 is actively modifying it, T55 will see Row 1 (Balance $100). The read is not blocked by T62's write, and the read is completely protected from observing a dirty or incomplete state. T55 simply reads the version of the data that was valid at the exact moment T55 began.

### 4. Resolving Write-Write Conflicts in MVCC

While MVCC entirely eliminates read-write and write-read conflicts, it does not magically prevent **write-write conflicts** (Lost Updates).

If two concurrent transactions attempt to update the exact same active row version simultaneously, the database must intervene. MVCC systems typically handle this using a **First-Updater-Wins** rule combined with brief, localized row locks:

1. Transaction A attempts to update a row and acquires a write lock on the active version.
2. Transaction B attempts to update the same row and is forced to wait (blocking).
3. If Transaction A commits, it creates a new version. Transaction B wakes up, realizes the version it intended to modify is now obsolete, and either restarts the operation on the new version or aborts with a serialization error (depending on the requested isolation level).

### 5. The Trade-off: Garbage Collection

The massive concurrency advantages of MVCC come with a significant physical cost: **Database Bloat**.

Every update and delete leaves behind "dead tuples" (obsolete row versions). Over time, these dead rows consume disk space and slow down sequential scans, as the database engine must read past thousands of invisible rows just to find the active ones.

To maintain system health, MVCC databases require a **Garbage Collection** mechanism to reclaim space used by dead rows once no active transactions can possibly see them:

* **PostgreSQL (VACUUM):** Uses a background process called the Autovacuum Daemon. It periodically scans tables, identifies dead tuples that are older than the oldest currently running transaction, and marks their space as available for future inserts.
* **MySQL/InnoDB (Undo Logs):** Modifies the row in place within the main table but copies the old version into a separate Undo Tablespace. When the old versions are no longer needed for snapshots, a background thread purges the undo logs.

Understanding MVCC is critical for modern database design because it dictates how systems behave under extreme load. A designer who understands versioning will know how to construct long-running analytical queries without disrupting concurrent transactional updates, and will recognize the necessity of configuring garbage collection parameters to prevent catastrophic performance degradation.