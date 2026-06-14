The transition from conceptual to logical design is a critical pivot in the database lifecycle. Previously, we modeled the domain using Entity-Relationship (ER) diagrams—abstract blueprints devoid of technical constraints. Now, we must transform these concepts into a structured format: the relational schema. This chapter provides a systematic methodology for mapping entities, complex attributes, relationship cardinalities, and inheritance hierarchies into normalized tables, primary keys, and foreign keys. Mastering this translation bridges the gap between business requirements and physical database deployment.

## 5.1 Mapping Regular Entities and Simple Attributes

The translation from a conceptual Entity-Relationship (ER) model to a logical relational schema follows a systematic set of rules. The most fundamental step in this transformation process is mapping regular (or strong) entities and their simple, single-valued attributes. Because regular entities have an independent existence in the database and possess their own unique identifiers, their translation into the relational model is straightforward.

### The General Mapping Rule

For every regular entity type $E$ in the ER schema, we create a corresponding relation (table) $R$ in the relational schema.

Once the relation $R$ is created, the following mapping rules apply to its attributes:

1. **Simple Attributes:** Each simple, single-valued attribute of entity $E$ becomes a distinct column (attribute) in relation $R$.
2. **Key Attributes:** The attribute (or combination of attributes) identified as the unique identifier of entity $E$ becomes the Primary Key (PK) of relation $R$.
3. **Derived Attributes:** Derived attributes—those whose values can be calculated from other attributes (e.g., calculating `Age` from a `BirthDate` attribute)—are typically omitted from the relational schema to avoid data redundancy and potential update anomalies.

### Example: Translating an `EMPLOYEE` Entity

Consider a conceptual model where we have identified a regular entity named `EMPLOYEE`. During the conceptual design phase (Chapter 3), we established that each employee is uniquely identified by an `EmpID` and has other simple attributes such as `FirstName`, `LastName`, and `BirthDate`.

**Conceptual Representation (ER Model)**

```text
       +-------------------+
       |     EMPLOYEE      |
       +-------------------+
       | _EmpID_           |  <-- Identifier (Key Attribute)
       | FirstName         |  <-- Simple Attribute
       | LastName          |  <-- Simple Attribute
       | BirthDate         |  <-- Simple Attribute
       | [Age]             |  <-- Derived Attribute
       +-------------------+

```

**Logical Representation (Relational Schema)**

Applying the mapping rules, we create a relation named `EMPLOYEE`. The simple attributes become the columns. The `EmpID` becomes the Primary Key (conventionally denoted by underlining). The derived attribute `[Age]` is excluded.

```text
  EMPLOYEE (EmpID, FirstName, LastName, BirthDate)
            -----

```

In a more detailed schema definition document, this mapping is often represented with standard data types mapped to the logical domains, forming a data dictionary outline:

| Attribute Name | Relational Mapping | Key Type | Null Status |
| --- | --- | --- | --- |
| `EmpID` | `EmpID` | Primary Key (PK) | NOT NULL |
| `FirstName` | `FirstName` | - | NOT NULL |
| `LastName` | `LastName` | - | NOT NULL |
| `BirthDate` | `BirthDate` | - | NULL |

### Handling Naming Conventions

While the translation process usually retains the names of the entities and attributes, logical database design is the phase where naming conventions must be strictly enforced. Depending on organizational standards, a conceptual entity named `Employee` might be mapped to a relation named `tbl_Employees`, `EMPLOYEE`, or `employees`.

Similarly, attributes may require renaming to comply with database management system (DBMS) constraints (e.g., avoiding reserved keywords like `Date` or `User`) or to improve clarity when multiple tables are joined later. For example, the `BirthDate` attribute might be explicitly mapped to `emp_birth_date` in the relational schema.

### Summary of the Mapping

At the conclusion of this initial mapping phase, every strong entity in the conceptual model exists as a standalone table in the logical schema. These relations are currently isolated; they do not yet contain foreign keys, nor do they account for attributes that are composed of smaller parts or contain multiple values. The structural complexity of the database is introduced in the subsequent steps, starting with the resolution of composite and multivalued attributes.

## 5.2 Mapping Composite and Multivalued Attributes

While simple, single-valued attributes map cleanly to standard relational columns, conceptual models frequently utilize composite and multivalued attributes to accurately reflect real-world complexity. The relational model, built on the principle of atomicity (where each cell in a table holds a single, indivisible value), cannot directly store these complex structures. Therefore, specific transformation rules must be applied during logical design.

### Mapping Composite Attributes

A composite attribute is an attribute that can be divided into smaller, independent subparts, which represent more basic attributes with independent meanings.

**The Mapping Rule:**
To map a composite attribute, you must "flatten" it. The composite attribute itself is discarded from the logical schema, and only its simple, individual components are mapped as distinct columns in the relation.

**Example:**
Consider an `EMPLOYEE` entity with a composite attribute `Address`. The `Address` is broken down into `Street`, `City`, `State`, and `ZipCode`.

**Conceptual Representation:**

```text
       +-------------------+
       |     EMPLOYEE      |
       +-------------------+
       | _EmpID_           | 
       | Address           | ---+ 
       +-------------------+    |-- Street
                                |-- City
                                |-- State
                                |-- ZipCode

```

**Logical Representation:**
In the relational schema, the parent `Address` attribute disappears. Its components become direct attributes of the `EMPLOYEE` relation.

```text
  EMPLOYEE (EmpID, Street, City, State, ZipCode)

```

If an entity has multiple composite attributes that share similar sub-components (e.g., `HomeAddress` and `MailingAddress`), a naming convention must be applied to prevent column name collisions:

```text
  EMPLOYEE (EmpID, Home_Street, Home_City, Mail_Street, Mail_City)

```

### Mapping Multivalued Attributes

A multivalued attribute is one that can store multiple distinct values for a single entity instance simultaneously (e.g., an employee who possesses multiple college degrees or phone numbers).

Attempting to map a multivalued attribute directly into a single table introduces structural flaws. Creating a single column with a comma-separated list of values violates First Normal Form (1NF) and severely degrades query performance. Alternatively, creating multiple distinct columns (e.g., `Phone1`, `Phone2`, `Phone3`) creates artificial limits on the data and leads to excessive `NULL` values when an entity uses fewer than the maximum allocated slots.

**The Mapping Rule:**
For each multivalued attribute, create a **new, separate relation**.

1. This new relation will contain a column for the multivalued attribute itself.
2. It will also contain a column for the Primary Key (PK) of the parent entity, which serves as a Foreign Key (FK) linking back to the parent table.
3. The Primary Key of this new relation is almost always a composite key, made up of the parent's PK and the multivalued attribute itself.

**Example:**
Consider the `EMPLOYEE` entity, this time possessing a multivalued attribute for `PhoneNumber` (denoted by curly braces in some ER notations).

**Conceptual Representation:**

```text
       +-------------------+
       |     EMPLOYEE      |
       +-------------------+
       | _EmpID_           | 
       | {PhoneNumber}     |  <-- Multivalued Attribute
       +-------------------+    

```

**Logical Representation:**
We maintain the base `EMPLOYEE` relation and create a new relation, typically named by combining the entity and the attribute, such as `EMP_PHONE`.

```text
  EMPLOYEE (EmpID)
            -----

  EMP_PHONE (EmpID, PhoneNumber)
             -------------------

```

**Data Dictionary Outline for EMP_PHONE:**

| Attribute Name | Key Type | Null Status | Foreign Key Constraint |
| --- | --- | --- | --- |
| `EmpID` | PK (Part 1) | NOT NULL | References `EMPLOYEE(EmpID)` |
| `PhoneNumber` | PK (Part 2) | NOT NULL | - |

By breaking out the multivalued attribute into its own relation, an employee can have zero, one, or a thousand phone numbers without requiring any structural changes to the database schema. This transformation rule is a vital prerequisite for normalization, as it naturally resolves first normal form (1NF) anomalies before formal normalization checks even begin.

## 5.3 Translating 1:1, 1:N, and M:N Relationships

Once regular entities and their attributes have been translated into base relations, the next critical phase in logical design is establishing the connections between these tables. The relational model does not have explicit "relationship" lines like an ER diagram; instead, it relies on shared data—specifically, Primary Key to Foreign Key linkages—to represent associations. The specific mapping rule you apply depends entirely on the maximum cardinality (1:1, 1:N, or M:N) of the relationship.

### Mapping 1:N (One-to-Many) Relationships

The one-to-many relationship is the workhorse of relational database design. In this relationship, one instance of entity A can be associated with multiple instances of entity B, but an instance of entity B is associated with at most one instance of entity A.

**The Mapping Rule:**
Identify the relation on the "many" (N) side of the relationship. Take the Primary Key (PK) from the "one" (1) side and insert it as a Foreign Key (FK) into the relation on the "many" side.

**Example:**
Consider a conceptual model where one `DEPARTMENT` employs many `EMPLOYEE`s, but each `EMPLOYEE` belongs to exactly one `DEPARTMENT`.

**Conceptual Representation:**

```text
  +------------+             +------------+
  | DEPARTMENT | 1 ------- N |  EMPLOYEE  |
  +------------+   (Employs) +------------+
  | _DeptID_   |             | _EmpID_    |
  | DeptName   |             | LastName   |
  +------------+             +------------+

```

**Logical Representation:**
Because `EMPLOYEE` is on the "N" side, it receives the Foreign Key.

```text
  DEPARTMENT (DeptID, DeptName)
              ------

  EMPLOYEE (EmpID, LastName, DeptID)
            -----            ^^^^^^
                             (FK to DEPARTMENT)

```

Placing the FK on the "1" side would be impossible, as a single cell in the `DEPARTMENT` table cannot hold multiple `EmpID` values without violating First Normal Form.

### Mapping 1:1 (One-to-One) Relationships

In a one-to-one relationship, each instance of entity A is linked to a maximum of one instance of entity B, and vice versa.

**The Mapping Rule:**
The standard approach is the **Foreign Key approach**. You cross-reference the tables by placing the PK of one table into the other as an FK. To decide which table should receive the FK, you must evaluate the participation constraints (mandatory vs. optional):

1. **Total/Mandatory Participation:** If one side of the relationship is mandatory (e.g., every `COMPANY_CAR` must be assigned to an `EMPLOYEE`), place the FK in that entity's relation. This prevents `NULL` values in the foreign key column.
2. **Partial/Optional Participation:** The entity that has optional participation (e.g., not every `EMPLOYEE` gets a `COMPANY_CAR`) should *not* receive the FK, as it would result in many empty (`NULL`) cells.

**Example:**
Assume a 1:1 relationship where an `EMPLOYEE` *may* manage exactly one `DEPARTMENT`, and a `DEPARTMENT` *must* be managed by exactly one `EMPLOYEE`.

**Conceptual Representation:**

```text
  +------------+             +------------+
  |  EMPLOYEE  | 1 ------- 1 | DEPARTMENT |
  +------------+  (Manages)  +------------+
  | _EmpID_    |  (Optional) | _DeptID_   | (Mandatory)
  +------------+             +------------+

```

**Logical Representation:**
Because every `DEPARTMENT` must have a manager, we place `EmpID` into the `DEPARTMENT` table as a Foreign Key. We can rename it `ManagerID` for semantic clarity.

```text
  EMPLOYEE (EmpID, LastName)
            -----

  DEPARTMENT (DeptID, DeptName, ManagerID)
              ------            ^^^^^^^^^
                                (FK to EMPLOYEE)

```

*(Note: If both sides have total participation, they can often be merged into a single relation. If both sides have partial participation, the FK can theoretically go in either table, but should be placed in the one that will yield the fewest `NULL` values).*

### Mapping M:N (Many-to-Many) Relationships

Relational database systems cannot implement many-to-many relationships directly. If a `STUDENT` can enroll in multiple `COURSE`s, and a `COURSE` contains multiple `STUDENT`s, placing a Foreign Key in either table will fail because it would require storing multiple values in a single cell.

**The Mapping Rule:**
To resolve an M:N relationship, you must create a new, third table—often called a **junction table**, **associative entity**, or **cross-reference table**.

1. The junction table receives the Primary Keys from *both* participating entities as Foreign Keys.
2. Together, these two Foreign Keys form a composite Primary Key for the junction table.
3. If the relationship itself has any attributes in the ER model, they are placed in this new junction table.

**Example:**
Consider an `EMPLOYEE` working on multiple `PROJECT`s, and a `PROJECT` having multiple `EMPLOYEE`s assigned to it. The relationship also tracks the `HoursWorked` by an employee on a specific project.

**Conceptual Representation:**

```text
  +------------+             +------------+
  |  EMPLOYEE  | M ------- N |  PROJECT   |
  +------------+   (Works_   +------------+
  | _EmpID_    |     On)     | _ProjID_   |
  +------------+      |      +------------+
                      |
                 (HoursWorked)

```

**Logical Representation:**
The original entities become standard tables, and a new table (`WORKS_ON`) is created to bridge them.

```text
  EMPLOYEE (EmpID, LastName)
            -----

  PROJECT (ProjID, ProjName)
           ------

  WORKS_ON (EmpID, ProjID, HoursWorked)
            -----  ------

```

**Data Dictionary Outline for WORKS_ON:**

| Attribute Name | Key Type | Null Status | Foreign Key Constraint |
| --- | --- | --- | --- |
| `EmpID` | PK (Part 1), FK | NOT NULL | References `EMPLOYEE(EmpID)` |
| `ProjID` | PK (Part 2), FK | NOT NULL | References `PROJECT(ProjID)` |
| `HoursWorked` | - | NULL | - |

By decomposing the M:N relationship into two separate 1:N relationships pointing toward the junction table, the relational model successfully captures complex, multi-directional associations while maintaining strict data atomicity.

## 5.4 Mapping Supertype and Subtype Relationships

In Enhanced Entity-Relationship (EER) modeling, as discussed in Chapter 4, supertypes and subtypes are used to represent hierarchical relationships where a general entity (the supertype) shares common attributes with specialized entities (the subtypes). Subtypes inherit all attributes and relationships from the supertype but also possess their own unique attributes or relationships.

Because the standard relational model lacks a native concept of inheritance, we cannot simply define a table as a "child" of another. Instead, database designers must choose between three primary strategies to translate these hierarchies into physical tables. The optimal choice depends heavily on the constraints defined during conceptual design: whether the subtypes are disjoint or overlapping, and whether the generalization is total (mandatory) or partial (optional).

### Strategy 1: Multiple Relations (Supertype and Subtype Tables)

This approach, often called **Table-per-Type**, represents the most literal translation of an EER diagram. We create a distinct relation for the supertype and a distinct relation for every subtype.

**The Mapping Rule:**

1. Create a base table for the supertype containing all its common attributes and the Primary Key (PK).
2. Create a separate table for each subtype containing only its specific attributes.
3. Place the PK of the supertype into every subtype table. In the subtype tables, this attribute serves a dual purpose: it is both the Primary Key of the subtype and a Foreign Key (FK) referencing the supertype.

**Conceptual Representation:**

```text
          +-------------------+
          |      PERSON       |
          +-------------------+
          | _PersonID_        |
          | Name              |
          +-------------------+
                    |
                   (d)  <-- Disjoint Constraint
                   / \
                 /     \
  +----------------+ +----------------+
  |    EMPLOYEE    | |    STUDENT     |
  +----------------+ +----------------+
  | Salary         | | GPA            |
  | HireDate       | | Major          |
  +----------------+ +----------------+

```

**Logical Representation:**

```text
  PERSON (PersonID, Name)
          --------

  EMPLOYEE (PersonID, Salary, HireDate)
            --------
            (FK to PERSON)

  STUDENT (PersonID, GPA, Major)
           --------
           (FK to PERSON)

```

**Evaluation:** This is the most flexible strategy. It works flawlessly for overlapping subtypes (a person can exist in both the `EMPLOYEE` and `STUDENT` tables simultaneously) and partial participation. However, retrieving a complete record requires a SQL `JOIN` operation between the supertype and the relevant subtype, which can impact performance in read-heavy applications with deep hierarchies.

### Strategy 2: Single Relation (Table-per-Hierarchy)

This approach flattens the entire inheritance hierarchy into a single, comprehensive table.

**The Mapping Rule:**

1. Create exactly one table for the entire hierarchy.
2. Include all attributes from the supertype.
3. Include all attributes from all subtypes.
4. Add a new, specialized attribute called a **Type Discriminator** (e.g., `PersonType`) to indicate which subtype a specific row represents.

**Logical Representation (Using previous example):**

```text
  PERSON_ALL (PersonID, PersonType, Name, Salary, HireDate, GPA, Major)
              --------  ^^^^^^^^^^
                        (Discriminator)

```

**Evaluation:** This method is optimized for read performance, as no `JOIN` operations are required to fetch a complete record. However, it introduces significant structural drawbacks. If a row represents an `EMPLOYEE`, the `GPA` and `Major` columns must be explicitly set to `NULL`. If subtypes have many specific attributes, this results in a "sparse" table with excessive nullability. This strategy is best used when subtypes are **disjoint** and have very few subtype-specific attributes.

### Strategy 3: Subtype Relations Only (Table-per-Concrete-Class)

This strategy eliminates the supertype table entirely, pushing all inherited data down into the individual subtype tables.

**The Mapping Rule:**

1. Do not create a table for the supertype.
2. Create a table for each subtype.
3. Duplicate all attributes of the supertype (including the PK) into every subtype table, alongside their specific attributes.

**Logical Representation:**

```text
  EMPLOYEE (PersonID, Name, Salary, HireDate)
            --------

  STUDENT (PersonID, Name, GPA, Major)
           --------

```

**Evaluation:** This strategy is highly restrictive. It should *only* be used when the generalization is **total** (every entity must belong to at least one subtype; there are no generic `PERSON` entities) and **disjoint** (an entity belongs to exactly one subtype). If the subtypes are overlapping (a person is both an employee and a student), their `Name` and `PersonID` must be stored twice, once in each table, violating normalization principles and creating a high risk of update anomalies.

### Strategy Selection Matrix

To guide the physical implementation phase, database designers rely on the following decision matrix when translating EER hierarchies:

| Subtype Characteristics | Best Mapping Strategy | Rationale |
| --- | --- | --- |
| **Overlapping** (Entity can be multiple types) | **Strategy 1** (Supertype + Subtype tables) | Prevents data duplication. Normalizes inherited attributes into a single source of truth. |
| **Disjoint**, Many Specific Attributes | **Strategy 1** (Supertype + Subtype tables) | Prevents sparse tables full of `NULL` values. |
| **Disjoint**, Few Specific Attributes | **Strategy 2** (Single table with discriminator) | Maximizes query performance by avoiding joins; the cost of a few `NULL` cells is negligible. |
| **Disjoint** AND **Total Participation** | **Strategy 3** (Subtype tables only) | Efficient storage when the supertype is purely abstract and entities never change types. |

## 5.5 Handling Weak Entities in the Relational Model

In conceptual modeling, a weak entity is defined by two primary characteristics: it lacks a sufficient set of attributes to form its own Primary Key, and its very existence depends entirely on a strong entity, known as the identifying or owner entity. To uniquely identify a specific instance of a weak entity, it must be paired with the Primary Key of its owner. The attribute (or attributes) within the weak entity that distinguishes its instances from one another *under the same owner* is called a partial key (or discriminator).

Because a weak entity cannot exist independently, its translation into the relational schema requires a strict structural bond with its owner's relation.

### The Mapping Rule

To translate a weak entity $W$ and its identifying strong entity $E$ into a relational schema:

1. **Create the Base Relation:** Create a relation $R$ to represent the weak entity $W$. Include all simple, single-valued attributes of $W$ as columns in $R$.
2. **Import the Foreign Key:** Take the Primary Key (PK) of the identifying strong entity $E$ and include it as a Foreign Key (FK) in $R$.
3. **Define the Composite Primary Key:** The Primary Key of relation $R$ is formed by concatenating the Foreign Key (imported from $E$) with the partial key of the weak entity $W$.

Furthermore, the identifying relationship itself (the diamond in an ER diagram) is not translated into its own table, even if it is technically a 1:N relationship. The linkage is entirely absorbed by the weak entity's table.

### Example: Translating a `DEPENDENT` Entity

Consider an organization that tracks employee benefits. We have a strong entity `EMPLOYEE`. The organization also tracks the dependents (spouses, children) of each employee via a weak entity named `DEPENDENT`. A dependent cannot exist in the database without being tied to an employee. The `DEPENDENT` entity has a partial key, `DepName`, because an employee might have multiple dependents, but we assume they will not have two dependents with the exact same name.

**Conceptual Representation (ER Model)**
*Note: Weak entities are typically denoted by double-lined rectangles, and their partial keys by dotted or dashed underlines.*

```text
  +------------+               +================+
  |  EMPLOYEE  | 1 ========= N H   DEPENDENT    H  <-- Weak Entity
  +------------+  (Has_Dep)    +================+
  | _EmpID_    |               | .DepName.      |  <-- Partial Key
  | LastName   |               | Relation       |  <-- Simple Attribute
  +------------+               | BirthDate      |  <-- Simple Attribute
                               +================+

```

**Logical Representation (Relational Schema)**

Following the mapping rules, we create a `DEPENDENT` table. We pull in `EmpID` from the `EMPLOYEE` table. The Primary Key for the new table becomes the composite of `(EmpID, DepName)`.

```text
  EMPLOYEE (EmpID, LastName)
            -----

  DEPENDENT (EmpID, DepName, Relation, BirthDate)
             -----  -------
             ^^^^^
             (FK to EMPLOYEE)

```

**Data Dictionary Outline for DEPENDENT:**

| Attribute Name | Key Type | Null Status | Foreign Key Constraint |
| --- | --- | --- | --- |
| `EmpID` | PK (Part 1), FK | NOT NULL | References `EMPLOYEE(EmpID)` |
| `DepName` | PK (Part 2) | NOT NULL | - |
| `Relation` | - | NOT NULL | - |
| `BirthDate` | - | NULL | - |

### The Importance of Cascading Deletes

While the structural mapping correctly represents the composite key, a purely logical schema is incomplete without specifying the exact referential integrity constraints required by a weak entity.

Because the weak entity is existentially dependent on the strong entity, what happens if an `EMPLOYEE` record is deleted? Leaving the `DEPENDENT` records in the database would result in "orphan" records—data that has no meaning and violates the core definition of the entity.

Therefore, when implementing this schema in a physical database (as will be covered in Chapter 8), the Foreign Key on the weak entity must almost always be accompanied by a cascading delete constraint.

**Conceptual SQL Implementation Note:**

```sql
FOREIGN KEY (EmpID) REFERENCES EMPLOYEE(EmpID) ON DELETE CASCADE

```

This enforces the business rule at the database level: if the parent (owner) is removed from the system, all associated weak entities are instantly and automatically purged alongside it, maintaining absolute database integrity.
