In single-node databases, maintaining ACID guarantees is straightforward. However, when a system scales across multiple microservices, ensuring a transaction either completely succeeds or fails across the entire architecture becomes a formidable challenge. This chapter explores the evolution of distributed atomic commitment. We will first examine the strict, synchronous coordination of the Two-Phase Commit (2PC) and Three-Phase Commit (3PC) protocols. Then, we transition to modern, high-throughput architectures, exploring eventual consistency through the Saga Pattern and the complexities of executing Compensating Transactions to maintain data integrity.

## 15.1 The Two-Phase Commit (2PC) Protocol

While Chapter 5 established how single-node relational databases guarantee ACID properties, modern distributed systems often require data to be modified across multiple independent databases, partitions, or microservices. Maintaining atomicity in these scenarios—ensuring that a transaction spanning multiple nodes either completely succeeds or completely fails—is a notoriously difficult challenge. The **Two-Phase Commit (2PC)** protocol is the foundational algorithmic solution to this problem of distributed atomic commitment.

At its core, 2PC relies on a centralized orchestrator to coordinate the transaction across all participating nodes. The architecture involves two primary roles:

* **The Coordinator (Transaction Manager):** The central authority that initiates the transaction, gathers decisions, and dictates the final outcome.
* **The Participants (Resource Managers / Cohorts):** The individual distributed nodes, databases, or services that actually perform the data modifications.

To guarantee that no participant commits a transaction while another aborts, the protocol divides the commitment process into two distinct phases: the Prepare Phase and the Commit Phase.

### Phase 1: The Prepare Phase (Voting)

In the first phase, the coordinator asks all participants if they are ready to commit the transaction. Crucially, a participant's "yes" vote is a binding promise.

1. **Prepare Request:** The coordinator sends a `PREPARE` message to all participants involved in the distributed transaction.
2. **Participant Execution:** Upon receiving the request, each participant executes the transaction locally up to the point of committing. It writes the necessary undo and redo records to its Write-Ahead Log (WAL) on stable storage and acquires all necessary database locks.
3. **The Vote:**
    * If the participant successfully executes the steps and secures the resources, it replies to the coordinator with a `VOTE_COMMIT` (Yes).
    * If the participant encounters any error (e.g., a constraint violation, deadlock, or resource exhaustion), it replies with a `VOTE_ABORT` (No).

By replying with `VOTE_COMMIT`, a participant guarantees that it can commit the transaction if ordered to do so later, regardless of any subsequent local failures or crashes.

### Phase 2: The Commit Phase (Completion)

The second phase executes the final decision based entirely on the votes gathered in Phase 1.

1. **Decision Making:** The coordinator tallies the votes.
    * If *all* participants replied with `VOTE_COMMIT`, the coordinator logs a global commit decision.
    * If *any* participant replied with `VOTE_ABORT`, or if the coordinator times out waiting for a participant, it logs a global abort decision.
2. **The Directive:** The coordinator sends the final directive (`GLOBAL_COMMIT` or `GLOBAL_ROLLBACK`) to all participants.
3. **Execution and Release:** Participants execute the directive, record the outcome in their local logs, release all database locks held since Phase 1, and reply with an `ACKNOWLEDGMENT` (ACK) to the coordinator.
4. **Completion:** Once all ACKs are received, the coordinator clears the transaction from its memory.

### Visualizing the Happy Path

Below is a sequence diagram illustrating a successful Two-Phase Commit across a coordinator and two participants.

```text
  Coordinator                          Participant A                      Participant B
       |                                     |                                  |
       | 1. -------- PREPARE --------------> |                                  |
       | 2. -------- PREPARE -------------------------------------------------> |
       |                                     |                                  |
       |                                     | (Executes, writes WAL, holds locks)
       |                                     |                                  |
       | 3. <------- VOTE_COMMIT ----------- |                                  |
       | 4. <------- VOTE_COMMIT ---------------------------------------------- |
       |                                     |                                  |
       | (Tally: All YES -> Decision: COMMIT)|                                  |
       |                                     |                                  |
       | 5. -------- GLOBAL_COMMIT --------> |                                  |
       | 6. -------- GLOBAL_COMMIT -------------------------------------------> |
       |                                     |                                  |
       |                                     | (Commits, releases locks)        |
       |                                     |                                  |
       | 7. <------- ACK ------------------- |                                  |
       | 8. <------- ACK ------------------------------------------------------ |
       |                                     |                                  |
```

### Failure Modes and The "Blocking" Problem

While 2PC provides strong guarantees for distributed atomicity, it is fundamentally a synchronous, blocking protocol. Understanding how it handles network and node failures reveals its critical limitations:

* **Participant Failure Before Voting:** If a participant crashes before sending a vote, the coordinator will eventually time out and safely issue a `GLOBAL_ROLLBACK` to the others.
* **Participant Failure After Voting:** If a participant replies `VOTE_COMMIT` and then crashes, it is obligated to finish the transaction upon restarting. When it recovers, it reads its WAL, realizes it is in an "in-doubt" state, and queries the coordinator for the final decision.
* **Coordinator Failure (The Fatal Flaw):** If the coordinator crashes *after* participants have voted `VOTE_COMMIT` but *before* it broadcasts the final decision, the participants are left in a suspended, in-doubt state. They cannot unilaterally commit (because another participant might have aborted), nor can they abort (because the coordinator might have logged a commit decision right before crashing).

This last scenario is known as the **blocking problem**. Participants must wait indefinitely for the coordinator to recover. While they wait, they continue to hold exclusive locks on their local databases, severely degrading system throughput and potentially bringing other non-related transactions to a halt. The coordinator becomes a classic Single Point of Failure (SPOF).

### Trade-offs and Modern Applicability

**Advantages:**

* **Strong Consistency:** It strictly enforces ACID isolation and atomicity across distributed boundaries.
* **Data Integrity:** Prevents partial commits, ensuring that financial ledgers, inventory systems, or critical state machines do not become fractured.

**Disadvantages:**

* **High Latency:** The protocol requires multiple network round-trips and forced disk syncs (WAL writes) during both phases. The transaction speed is dictated by the slowest participant.
* **Lock Contention:** Because participants hold locks from the beginning of Phase 1 until the end of Phase 2, system concurrency is drastically reduced.
* **Availability vs. Consistency:** In the context of the CAP theorem (Chapter 2.3), 2PC heavily favors Consistency at the expense of Availability. A single node or network failure can stall the entire transaction.

Due to its blocking nature and poor scaling characteristics, strict 2PC is rarely used in high-throughput, modern microservice architectures. Instead, it is mostly relegated to legacy distributed SQL databases or tightly coupled enterprise systems. To address these structural flaws, distributed system engineers developed non-blocking alternatives like the Three-Phase Commit (3PC) and eventual consistency models like the Saga Pattern, which we will explore in the following sections.

## 15.2 The Three-Phase Commit (3PC) Protocol

As discussed in Section 15.1, the Two-Phase Commit (2PC) protocol suffers from a critical vulnerability: the blocking problem. If the coordinator crashes after participants have voted but before the final decision is broadcast, participants are left in an "in-doubt" state, holding locks and blocking system resources indefinitely.

The **Three-Phase Commit (3PC)** protocol was introduced to eliminate this blocking behavior. It is a non-blocking protocol that ensures that if any single node (including the coordinator) fails, the remaining active nodes will eventually reach a consistent state without waiting indefinitely.

It achieves this by introducing two key modifications to 2PC:

1. **Participant Timeouts:** Participants are given strict rules on what to do if the coordinator times out, removing the need for infinite waiting.
2. **Splitting the Prepare Phase:** 3PC inserts a new phase between voting and committing to ensure that all participants are aware of the collective decision *before* anyone actually commits.

### The Three Phases

The protocol unfolds in the following sequence:

#### Phase 1: CanCommit (Voting)

The goal of this phase is simply to check if the participants are alive and willing to proceed, without immediately acquiring heavy database locks.

1. The coordinator sends a `CAN_COMMIT` message to all participants.
2. Participants evaluate if they can handle the transaction. If yes, they reply with a `YES` vote; otherwise, they reply with `NO` (or simply time out, which is treated as a `NO`).
*Crucially, at this stage, participants do not lock resources or write to their WAL.*

#### Phase 2: PreCommit (Preparation)

This phase mirrors the first half of 2PC's execution, but acts as a safety buffer.

1. If the coordinator receives a `YES` from all participants, it broadcasts a `PRE_COMMIT` message. (If it received any `NO` votes, it sends an `ABORT` message instead).
2. Upon receiving `PRE_COMMIT`, participants now acquire necessary locks, write the transaction to their Write-Ahead Log (WAL), and reply with an `ACK` (acknowledgment).
*Timeout behavior:* If a participant times out waiting for the `PRE_COMMIT` message, it assumes the transaction failed and safely aborts, releasing no locks since none were held yet.

#### Phase 3: DoCommit (Completion)

This is the final execution phase.

1. Once the coordinator receives `ACK` from all participants, it broadcasts a `DO_COMMIT` message.
2. Participants commit the transaction to the database, release all locks, and send a final `ACK` back to the coordinator.
*Timeout behavior:* This is the genius of 3PC. If a participant has received a `PRE_COMMIT` message but times out waiting for `DO_COMMIT` (e.g., the coordinator crashes), the participant will **automatically commit** the transaction. It can safely do this because receiving `PRE_COMMIT` guarantees that *every* participant voted `YES` in Phase 1.

### Visualizing the 3PC Happy Path

```text
  Coordinator                          Participant A                      Participant B
       |                                     |                                  |
       | 1. -------- CAN_COMMIT -----------> |                                  |
       | 2. -------- CAN_COMMIT ----------------------------------------------> |
       |                                     |                                  |
       | 3. <------- YES ------------------- |                                  |
       | 4. <------- YES ------------------------------------------------------ |
       |                                     |                                  |
       | (Tally: All YES)                    |                                  |
       |                                     |                                  |
       | 5. -------- PRE_COMMIT -----------> |                                  |
       | 6. -------- PRE_COMMIT ----------------------------------------------> |
       |                                     |                                  |
       |                                     | (Writes WAL, acquires locks)     |
       |                                     |                                  |
       | 7. <------- ACK ------------------- |                                  |
       | 8. <------- ACK ------------------------------------------------------ |
       |                                     |                                  |
       | 9. -------- DO_COMMIT ------------> |                                  |
       | 10.------- DO_COMMIT ----------------------------------------------> |
       |                                     |                                  |
       |                                     | (Commits, releases locks)        |
```

### The Catch: Network Partitions vs. Node Failures

On paper, 3PC beautifully solves the blocking problem of 2PC. If the coordinator dies at any point, the participants have enough local context (and timeout rules) to independently push the transaction forward or roll it back safely.

However, 3PC has a fatal flaw in real-world distributed systems: **it cannot distinguish between a node crash and a network partition.**

Consider a scenario where the coordinator sends the `PRE_COMMIT` message, but a network partition occurs. Half the participants receive it, and half do not.

* The nodes that did *not* receive `PRE_COMMIT` will time out and **abort**.
* The nodes that *did* receive `PRE_COMMIT` will time out waiting for `DO_COMMIT`, assume the coordinator crashed, and automatically **commit**.

The result is a fractured database state (a split-brain scenario). By attempting to favor Availability (non-blocking) alongside Consistency, 3PC fails violently when Partition Tolerance is tested, making it an unacceptable choice under the realities of the CAP theorem.

### Trade-offs and Modern Applicability

**Advantages:**

* **Non-Blocking:** Solves the primary architectural bottleneck of 2PC; participants are never left indefinitely holding locks if a single node fails.

**Disadvantages:**

* **Split-Brain Vulnerability:** Extremely susceptible to data corruption during network partitions.
* **Terrible Latency:** 3PC requires three full network round-trips (compared to two in 2PC). In a globally distributed system, the latency cost is prohibitive.

Because networks are inherently unreliable (as discussed in Chapter 3), the risk of network partitions makes 3PC largely a theoretical construct. It is rarely implemented in production environments. When engineers need strict distributed consensus without the blocking flaws of 2PC, they turn to quorum-based consensus algorithms like Paxos or Raft (Chapter 14). When they need high-throughput distributed transactions, they abandon distributed locks entirely in favor of the Saga Pattern, which we cover next.

## 15.3 The Saga Pattern

The Two-Phase (2PC) and Three-Phase Commit (3PC) protocols share a fundamental limitation that makes them unsuitable for highly scalable microservice architectures: they rely on distributed locks. While holding locks guarantees strict ACID isolation, it creates severe performance bottlenecks and couples independent services together. If an e-commerce platform uses 2PC for checkout, the Order service, Payment service, and Inventory service must all lock their respective database rows simultaneously. If the Payment service experiences latency, the entire system slows down.

To achieve high throughput and loose coupling, modern distributed systems abandon distributed locks in favor of the **Saga Pattern**. Originally proposed by Hector Garcia-Molina and Kenneth Salem in 1987 to handle Long-Lived Transactions (LLTs) within a single database, the pattern has been adapted as the standard for maintaining data consistency across distributed microservices.

A Saga is a sequence of independent local transactions. Each local transaction updates the data within a single service and then publishes a message or event to trigger the next local transaction in the saga.

### Core Mechanism: Local Commits and Compensations

Unlike 2PC, there is no `PREPARE` phase in a Saga. When a service executes its step of the process, it commits the changes to its local database immediately. This means that at any given moment, the overall distributed transaction is only partially complete, yet the intermediate state is visible to other processes in the system.

Because data is actually committed at each step, you cannot rely on a traditional database `ROLLBACK` if a subsequent step fails. Instead, if a local transaction fails (e.g., the Inventory service realizes the item is out of stock), the saga must execute a series of **compensating transactions** to logically undo the changes made by the preceding steps.

For example, if Step 1 (Create Order) and Step 2 (Charge Credit Card) succeeded, but Step 3 (Reserve Inventory) failed, the saga must trigger a compensating transaction for Step 2 (Refund Credit Card) and Step 1 (Mark Order as Cancelled). We will explore the mechanics of compensating transactions in depth in Section 15.4.

### Coordination Models

To manage the execution sequence and handle failures, a saga must be coordinated. There are two primary ways to structure this coordination: Choreography and Orchestration.

#### 1. Choreography (Event-Based Coordination)

In a choreographed saga, there is no central controller. Instead, participants subscribe to each other's events and react accordingly. When a service completes its local transaction, it publishes a domain event to a message broker (e.g., Kafka or RabbitMQ). Other services listen for that event and execute their local transactions in response.

**Visualizing a Choreographed Success Path:**

```text
[Order Service] 
      | (1. Create Order, Publish "OrderCreated" event)
      v
[Message Broker] 
      | (2. Routes event to subscribers)
      v
[Payment Service] 
      | (3. Charge Card, Publish "PaymentProcessed" event)
      v
[Message Broker]
      | (4. Routes event to subscribers)
      v
[Inventory Service]
      | (5. Reserve Items, Publish "InventoryReserved" event)
```

**Pros:**

* **Decoupled:** Services only know about events, not about each other.
* **No Central SPOF:** There is no single orchestrator service that can fail or become a bottleneck.

**Cons:**

* **Emergent Complexity:** It is difficult to conceptualize the overall business process because the logic is scattered across multiple codebases.
* **Cyclic Dependencies:** Services can easily fall into infinite event loops if not carefully designed.
* **Difficult Debugging:** Tracing a failed saga requires aggregating logs from many independent services to understand where the chain broke.

#### 2. Orchestration (Command-Based Coordination)

In an orchestrated saga, a centralized controller—the Saga Orchestrator—tells the participants what local transactions to execute. The orchestrator acts as a state machine. It sends command messages to participants, waits for replies, and decides which step to execute next. If a step fails, the orchestrator is responsible for issuing the commands to trigger the necessary compensating transactions.

**Visualizing an Orchestrated Success Path:**

```text
                      [Order Saga Orchestrator]
                      /           |           \
                     /            |            \
       1. (Command: Pay)          |             \
      2. (Reply: Success)         |              \
                   /              |               \
                  v               |                v
         [Payment Service]        |      [Inventory Service]
                                  | 
                         3. (Command: Reserve)
                        4. (Reply: Success)
```

**Pros:**

* **Centralized Logic:** The entire workflow and compensation logic is defined in one place, making it easy to understand, maintain, and test.
* **Avoids Cyclic Dependencies:** The orchestrator strictly controls the flow of execution.
* **Simpler Participants:** The participating services do not need to know about the overarching saga; they simply listen for commands and reply with success or failure.

**Cons:**

* **Risk of "God Service":** The orchestrator can become bloated with too much domain logic if not carefully restricted to pure coordination tasks.
* **Infrastructure Overhead:** Requires deploying and maintaining a resilient orchestrator mechanism (often implemented using tools like AWS Step Functions, Temporal, or Camunda).

### The Loss of Isolation (ACID vs. BASE)

The most significant trade-off of the Saga pattern is the loss of **Isolation** (the 'I' in ACID). Because local transactions commit immediately, a saga exposes intermediate states to the rest of the system.

Consider a user checking their order history. If they query the database after the Payment Service has committed but before the Inventory Service has failed and triggered a rollback, they will see an order that appears to be successfully paid for. A few milliseconds later, that order will be cancelled.

Because of this, Sagas shift a system from strict ACID compliance to **BASE** (Basically Available, Soft state, Eventual consistency). To mitigate the anomalies caused by a lack of isolation (such as lost updates or dirty reads), engineers must employ application-level countermeasures. Common techniques include:

* **Semantic Locks:** Adding status flags to records (e.g., setting an order status to `PENDING_VERIFICATION` rather than `CREATED`) to warn other processes that the data is subject to an ongoing saga.
* **Commutative Updates:** Designing operations so they can be executed in any order, ensuring that concurrent sagas do not overwrite each other's data unexpectedly.

## 15.4 Compensating Transactions

In a traditional, single-node ACID database, aborting a transaction is a trivial operation. The database engine utilizes its Write-Ahead Log (WAL) to simply discard uncommitted changes or physically roll back the state to exactly how it was before the transaction began.

In a distributed Saga (as explored in Section 15.3), this mechanism is impossible. Because a Saga consists of multiple independent local transactions that commit immediately, the data becomes permanent at each step. You cannot issue a standard `ROLLBACK` command to a database that has already committed a transaction. Instead, if a downstream step in a Saga fails, the system must execute **compensating transactions** to logically reverse the effects of the previously successful steps.

A compensating transaction is a dedicated, application-level business operation designed to undo the work of a specific local transaction.

### Semantic Undo vs. Physical Undo

It is critical to understand that a compensating transaction performs a **semantic undo**, not a physical undo.

When a local transaction commits, its locks are released, and the updated data becomes visible to other concurrent processes. By the time a compensating transaction is triggered milliseconds or minutes later, the underlying data may have changed.

* **Physical Undo (Traditional):** Restoring the database row to the exact byte-for-byte state it held prior to the transaction.
* **Semantic Undo (Compensation):** Applying a business logic operation that balances the ledger.

**Example:**
Suppose Step 1 of a Saga deposits $100 into a bank account (Current Balance: $500 -> $600). The lock is released. Another user deposits $50 (Balance: $600 -> $650). If the Saga later fails at Step 3, the compensation for Step 1 must be executed. A physical undo would force the balance back to $500, erroneously erasing the second user's $50 deposit. A semantic undo simply issues a "Withdraw $100" command, resulting in the correct balance of $550.

### The Anatomy of a Saga Workflow

To effectively design compensations, architects divide the steps of a Saga into three distinct categories based on the "Point of No Return":

1. **Compensatable Transactions:** These are the initial steps of the Saga. They represent actions that can be safely reversed if something goes wrong later. *Example: Reserving items in a cart, allocating a temporary seat on a flight.*
2. **The Pivot Transaction:** This is the critical juncture—the point of no return. If the pivot transaction succeeds, the Saga is guaranteed to run to completion. If it fails, the Saga aborts and triggers compensations. *Example: Actually charging the user's credit card.*
3. **Retriable Transactions:** These are steps that occur *after* the pivot transaction. Because the pivot succeeded, these steps must not fail permanently. They are designed to be retried indefinitely until they succeed. They do not have compensating transactions. *Example: Sending a confirmation email, notifying the shipping warehouse.*

### Visualizing the Compensation Flow

Below is a sequence demonstrating an orchestrated Saga for a travel booking platform where the pivot transaction (Car Rental) fails, triggering the reverse sequence of compensations.

```text
[Saga Orchestrator]
       |
       |--- 1. Book Flight ---> [Flight Service] (Success: Commits)
       |
       |--- 2. Book Hotel ----> [Hotel Service]  (Success: Commits)
       |
       |--- 3. Rent Car ------> [Car Service]    (FAILS: No cars available)
       |
       | (Initiate Compensation Phase in Reverse Order)
       |
       |--- 4. Cancel Hotel --> [Hotel Service]  (Executes Semantic Undo)
       |
       |--- 5. Cancel Flight -> [Flight Service] (Executes Semantic Undo)
       |
       | (Saga Terminated. System state is logically consistent.)
```

### Core Design Principles for Compensations

Designing reliable compensating transactions is one of the most complex tasks in distributed systems engineering. They must adhere to several strict rules to prevent data corruption.

#### 1. Strict Idempotency

Network partitions and orchestrator retries mean that a service might receive the exact same "Cancel Order" command multiple times. Compensating transactions **must be idempotent**; applying them once should have the exact same effect as applying them a hundred times. This is typically achieved by passing a unique `Transaction_ID` or `Saga_ID` with the event, allowing the receiving service to check its database to see if the compensation has already been applied.

#### 2. Certainty of Execution

A compensating transaction is not allowed to fail due to business logic. For example, if a compensation attempts to "Refund $100", it cannot be rejected because the account balance has subsequently dropped to $0. The system must process the refund (perhaps driving the account into the negative) and resolve the discrepancy out-of-band.

#### 3. Handling Infrastructure Failures (The Dead Letter Queue)

While compensations cannot fail due to business rules, they *can* fail due to infrastructure outages (e.g., the target database is down). If an orchestrator cannot execute a compensation after exhausting its exponential backoff and retry limits, it must route the failure to a **Dead Letter Queue (DLQ)**. This triggers an alert for manual human intervention or an automated batch reconciliation process.

#### 4. Commutativity (When Possible)

In highly concurrent systems, the original transaction of *Saga B* might arrive at a service at the exact same time as the compensating transaction of *Saga A*. If operations are commutative—meaning they can be applied in any order yielding the same result (e.g., adding and subtracting from a counter)—the system is significantly more resilient to race conditions.

By combining asynchronous messaging, local commits, and robust compensating transactions, the Saga Pattern allows systems to maintain global data integrity without sacrificing the high availability and throughput demanded by modern global-scale architectures.
