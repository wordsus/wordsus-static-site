Before diving into the deep waters of ownership, borrowing, and concurrency, you must master the fundamental building blocks of Rust. If you are coming from languages like Python, C++, or JavaScript, some of these concepts will feel familiar, while others—such as immutability by default and expression-based control flow—will require a structural shift in how you reason about your code. 

In this chapter, we will explore how Rust handles variables and memory types, structure logic using functions and loops, and document code effectively. By the end of this chapter, you will possess the foundational vocabulary needed to read and write idiomatic Rust programs.

## 2.1 Variables, Mutability, and Constants

In Rust, the way you store and manipulate data is fundamentally tied to the language's core goals of safety and concurrency. Understanding how Rust handles variables—specifically its strict rules around mutability—is your first step toward writing predictable, bug-free code.

### Variables and Immutability by Default

You declare a variable in Rust using the `let` keyword. However, unlike many mainstream programming languages, Rust variables are **immutable by default**. Once a value is bound to a variable name, you cannot change that value. 

This design choice prevents a whole class of bugs where data is altered unexpectedly, especially in concurrent programming (which will be explored deeply in Chapter 11).

Consider the following example:

```rust
fn main() {
    let x = 5;
    println!("The value of x is: {}", x);
    
    // The following line will cause a compile-time error
    // x = 6; 
}
```

If you uncomment `x = 6;`, the Rust compiler (`rustc`) will stop and throw an error: `cannot assign twice to immutable variable x`. The compiler guarantees that if you state a value won't change, it truly will not change. This allows you to reason about your code locally without worrying about distant functions altering your state.

### Opting into Mutability

While immutability is safe, software must eventually process and change data. Rust requires you to explicitly opt into mutability by placing the `mut` keyword immediately after `let`. 

Adding `mut` signals to both the compiler and future readers of your code that this variable's state will change over its lifetime.

```rust
fn main() {
    let mut y = 5;
    println!("The value of y is: {}", y);
    
    y = 6; // This is now perfectly valid
    println!("The mutated value of y is: {}", y);
}
```

By forcing you to type `mut`, Rust makes state changes intentional and easily searchable. When debugging, you immediately know which variables are safe to ignore (the immutable ones) and which ones you need to track (the mutable ones).

### Constants

Constants are similar to immutable variables, but with stricter rules. They are values that are bound to a name and are *never* allowed to change. 

While variables are immutable by default, constants are immutable by definition. You declare them using the `const` keyword instead of `let`. 

Here are the critical differences between constants and variables:
1.  **No `mut` allowed:** You cannot use `mut` with constants. 
2.  **Explicit type annotations:** You *must* annotate the type of the value (types are covered in Section 2.2). The compiler will not infer it for you.
3.  **Global scope capable:** Constants can be declared in any scope, including the global scope, making them useful for values that many parts of the program need to know about.
4.  **Compile-time evaluation:** Constants may be set only to a constant expression, not the result of a value that could only be computed at runtime.

```rust
const MAX_CONCURRENT_USERS: u32 = 100_000;
const TIMEOUT_SECONDS: u8 = 30;
```

*Note: By convention, Rust constants are written in uppercase with underscores separating words. Naming conventions will be formally detailed in Section 2.5.*

### Shadowing

Rust allows you to declare a new variable with the same name as a previous variable. This is known as **shadowing**. The first variable is "shadowed" by the second, meaning the compiler will see the second variable when you use the name.

You shadow a variable by using the `let` keyword again with the same name:

```rust
fn main() {
    let z = 5;
    
    // We shadow `z` by redeclaring it with `let`
    let z = z + 1;
    
    {
        // Shadowing in an inner scope
        let z = z * 2;
        println!("Inner scope z is: {}", z); // Prints 12
    }
    
    println!("Outer scope z is: {}", z); // Prints 6
}
```

#### Shadowing vs. Mutability

It is crucial to understand that shadowing is not the same as marking a variable as `mut`. 

When you use `mut`, you are altering the value stored in the existing memory location. The type of the variable must remain the same.
When you use `let` to shadow, you are essentially creating a brand-new variable, taking a new memory allocation, and simply reusing the name. Because it is a new variable, you can change the *data type* while reusing the same name.

```text
+-------------------------------------------------------------+
|  MUTABILITY (`mut`)                                         |
|  Reusing the same memory container, replacing the contents. |
|                                                             |
|  let mut spaces = "   ";   [ Memory Addr A: "   " ]         |
|  spaces = spaces.len();    ERROR: Expected &str, found usize|
+-------------------------------------------------------------+
|  SHADOWING (`let`)                                          |
|  Creating a new container, painting the same label on it.   |
|                                                             |
|  let spaces = "   ";       [ Memory Addr X: "   " ]         |
|  let spaces = spaces.len();[ Memory Addr Y: 3     ]         |
|                            (Addr X is now inaccessible)     |
+-------------------------------------------------------------+
```

Shadowing is incredibly useful when performing transformations on a value (like parsing a string into an integer) where you don't want to invent convoluted names like `spaces_str` and `spaces_num`. Once the shadowing `let` statement finishes, the variable returns to being immutable, preserving Rust's safety guarantees.

## 2.2 Primitive and Compound Data Types

Rust is a statically typed language, which means that it must know the types of all variables at compile time. However, the compiler is exceptionally smart and can usually infer what type we want to use based on the value and how we use it. We only need to add explicit type annotations when many types are possible—such as when parsing a string into a number.

Rust categorizes its built-in data types into two primary subsets: **scalar** (primitive) types and **compound** types.

### Scalar Types

A scalar type represents a single value. Rust has four primary scalar types: integers, floating-point numbers, booleans, and characters.

#### 1. Integers

An integer is a number without a fractional component. Rust provides a comprehensive set of built-in integer types, divided into signed (can be negative or positive) and unsigned (can only be positive).

| Length | Signed | Unsigned |
| :--- | :--- | :--- |
| 8-bit | `i8` | `u8` |
| 16-bit | `i16` | `u16` |
| 32-bit | `i32` | `u32` |
| 64-bit | `i64` | `u64` |
| 128-bit| `i128` | `u128` |
| Arch | `isize` | `usize` |

The `isize` and `usize` types depend on the architecture of the computer your program is running on: 64 bits if you are on a 64-bit architecture and 32 bits if you are on a 32-bit architecture. These are predominantly used when indexing collections.

By default, Rust infers integers to be `i32`, as it is generally the fastest, even on 64-bit systems. 

**Integer Overflow:**
In a production environment, you must be aware of how Rust handles integer overflow (e.g., trying to fit the number 256 into a `u8`, which only holds 0-255). 
* In **debug** builds (compiled with `cargo build`), Rust includes checks for integer overflow that will cause your program to panic at runtime if this behavior occurs.
* In **release** builds (compiled with `cargo build --release`), Rust does *not* include checks for integer overflow that cause panics. Instead, it performs two's complement wrapping. In short, 256 becomes 0, 257 becomes 1, and so on. Your program won't panic, but it will contain an invalid value. 

#### 2. Floating-Point Numbers

Rust’s floating-point types are `f32` and `f64`, which are 32 bits and 64 bits in size, respectively. The default type is `f64` because on modern CPUs, it’s roughly the same speed as `f32` but is capable of much higher precision. All floating-point types are signed.

```rust
let x = 2.0; // f64 is inferred
let y: f32 = 3.0; // explicit f32
```

Rust's floating-point numbers are implemented according to the IEEE-754 standard.

#### 3. Booleans

As in most other languages, a boolean type in Rust has two possible values: `true` and `false`. Booleans are one byte in size and are specified using the `bool` keyword.

```rust
let is_active = true;
let has_errors: bool = false;
```

#### 4. The Character Type

Rust’s `char` type is the language’s most primitive alphabetic type. Unlike some languages where a char is inherently a single byte (like C), a Rust `char` represents a **Unicode Scalar Value**. 

This means it takes up 4 bytes in memory and can represent a lot more than just ASCII. Accented letters, Chinese, Japanese, and Korean characters, emojis, and zero-width spaces are all valid `char` values. Note that `char` literals are specified with single quotes, as opposed to string literals, which use double quotes.

```rust
let c = 'z';
let z: char = 'ℤ'; // with explicit type annotation
let heart_eyed_cat = '😻';
```

---

### Compound Types

Compound types can group multiple values into one type. Rust has two primitive compound types: tuples and arrays.

#### 1. Tuples

A tuple is a general way of grouping together a number of values with a variety of types into one compound type. Tuples have a fixed length: once declared, they cannot grow or shrink in size.

You create a tuple by writing a comma-separated list of values inside parentheses.

```rust
let tup: (i32, f64, u8) = (500, 6.4, 1);
```

There are two ways to extract data from a tuple. The first is **pattern matching** to destructure the tuple value:

```rust
let tup = (500, 6.4, 1);
let (x, y, z) = tup;

println!("The value of y is: {}", y); // Prints 6.4
```

The second way is to access a tuple element directly by using a period (`.`) followed by the index of the value we want to access. As with most languages, indices start at 0.

```rust
let x: (i32, f64, u8) = (500, 6.4, 1);

let five_hundred = x.0;
let six_point_four = x.1;
```

**The Unit Type `()`**
A tuple without any values has a special name: the **unit**. This value and its corresponding type are both written as `()`. It represents an empty value or an empty return type. Expressions implicitly return the unit value if they don't return any other value.

#### 2. Arrays

Unlike a tuple, every element of an array must have the *same type*. Furthermore, arrays in Rust have a fixed length. If you need a collection that can grow or shrink, you will use a `Vec<T>` (covered in Chapter 6). Arrays are useful when you want your data allocated on the stack rather than the heap, or when you want to ensure you always have a fixed number of elements.

You write an array as a comma-separated list inside square brackets:

```rust
let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
```

To explicitly declare the type of an array, you use square brackets containing the type of each element, a semicolon, and then the number of elements:

```rust
let a: [i32; 5] = [1, 2, 3, 4, 5];
```

You can also initialize an array to contain the same value for every element by specifying the initial value, followed by a semicolon, and then the length. This is particularly useful for initializing buffers:

```rust
// Creates an array of 1024 elements, all set to 0.
let buffer = [0u8; 1024]; 
```

**Accessing Array Elements**

An array is a single chunk of memory of a known, fixed size that can be allocated on the stack. You access elements of an array using indexing:

```text
Memory Layout of `let a = [10, 20, 30, 40, 50];`

Index:    0    1    2    3    4
        +----+----+----+----+----+
Value:  | 10 | 20 | 30 | 40 | 50 |
        +----+----+----+----+----+
```

```rust
let first = a[0]; // 10
let second = a[1]; // 20
```

**Invalid Array Element Access**

One of Rust's core safety principles is preventing out-of-bounds memory access. If you attempt to access an array index that is past the end of the array, the program will compile (unless the index is hardcoded and the compiler can catch it), but it will **panic** at runtime.

```rust
let a = [1, 2, 3, 4, 5];
let index = 10;
let element = a[index]; // PANIC: index out of bounds
```

In many low-level languages, this kind of check is not done, resulting in invalid memory being accessed (buffer over-read). Rust protects you against this by immediately exiting instead of allowing the memory access and continuing.

## 2.3 Functions, Expressions, and Statements

Functions are prevalent in Rust code. You have already seen one of the most important functions in the language: `main`, which is the entry point of many programs. You have also seen the `fn` keyword, which allows you to declare new functions.

Rust code uses *snake case* as the conventional style for function and variable names, in which all letters are lowercase and underscores separate words. 

```rust
fn main() {
    println!("Hello, world!");
    another_function();
}

fn another_function() {
    println!("Another function.");
}
```

Rust does not care where you define your functions, only that they are defined somewhere in a scope that can be seen by the caller.

### Function Parameters

Functions can have parameters, which are special variables that are part of a function's signature. In Rust, you **must** declare the type of each parameter. This is a deliberate decision in Rust's design: requiring type annotations in function definitions means the compiler almost never needs you to use them elsewhere in the code to figure out what type you mean.

```rust
fn print_measurements(value: i32, unit_label: char) {
    println!("The measurement is: {}{}", value, unit_label);
}
```

### Statements and Expressions

Understanding the distinction between statements and expressions is arguably the most critical step in grasping Rust's syntax. Rust is primarily an **expression-based language**. 

* **Statements** are instructions that perform some action and do *not* return a value.
* **Expressions** evaluate to a resulting value.

#### Statements

Creating a variable and assigning a value to it with the `let` keyword is a statement. 

```rust
fn main() {
    let y = 6; // This is a statement
}
```

Because `let y = 6;` does not return a value, you cannot assign a `let` statement to another variable. The following code will produce a compilation error:

```rust
// ERROR: expected expression, found statement (`let`)
let x = (let y = 6); 
```

This is different from languages like C or Ruby, where the assignment returns the value of the assignment (allowing `x = y = 6`). In Rust, assignments do not return the assigned value; they return the unit type `()`.

#### Expressions

Expressions evaluate to a value and make up most of the rest of the code that you will write in Rust. Consider a simple math operation, such as `5 + 6`, which is an expression that evaluates to the value `11`.

Calling a function is an expression. Calling a macro is an expression. Furthermore, a new scope block created with curly brackets is an expression.

```rust
fn main() {
    let y = {
        let x = 3;
        x + 1 // Note the lack of a semicolon here!
    };

    println!("The value of y is: {}", y); // Prints 4
}
```

Look closely at the `x + 1` line. It does not have a semicolon at the end. **Expressions do not include ending semicolons.** If you add a semicolon to the end of an expression, you turn it into a statement, and it will then return the unit type `()` instead of the expected value. 

```text
+-------------------------------------------------------------+
|  THE SEMICOLON RULE                                         |
|                                                             |
|  Expression:  x + 1       (Evaluates to a value, e.g., 4)   |
|  Statement:   x + 1;      (Executes, then yields `()`)      |
+-------------------------------------------------------------+
```

### Functions with Return Values

Functions can return values to the code that calls them. We do not name return values, but we must declare their type after an arrow (`->`). 

In Rust, the return value of the function is synonymous with the value of the final expression in the block of the body of a function. You can return early from a function by using the `return` keyword and specifying a value, but most functions return the last expression implicitly.

```rust
fn five() -> i32 {
    5 // Implicit return (no semicolon)
}

fn main() {
    let x = five();
    println!("The value of x is: {}", x);
}
```

If we were to add a semicolon to the end of the `5` inside the `five` function, turning it from an expression into a statement, the code would fail to compile:

```rust
fn five() -> i32 {
    5; 
}
```

The compiler will point out that the function signature claims it returns an `i32`, but because of the semicolon, the function actually returns `()` (the unit type). 

### Combining Control Flow and Returns

Because blocks are expressions, you can use them cleanly to evaluate and return data. (Control flow will be covered in depth in Section 2.4, but observe how expression-based design simplifies assignments).

```rust
fn get_status_code(is_healthy: bool) -> u16 {
    if is_healthy {
        200
    } else {
        500
    }
}
```

Notice that neither `200` nor `500` has a semicolon. The `if` expression evaluates to one of those integers, which then becomes the implicit return value of the `get_status_code` function.

## 2.4 Control Flow: `if`, `loop`, `while`, and `for`

The ability to run or skip code depending on whether a condition is true, or to run code repeatedly while a condition holds, is fundamental to writing logic in any programming language. Rust provides familiar control flow constructs—`if`, `loop`, `while`, and `for`—but integrates them tightly with its expression-based nature and strict type system.

### `if` Expressions

An `if` expression allows you to branch your code depending on conditions. You provide a condition, and if that condition evaluates to `true`, the provided block of code executes.

```rust
fn main() {
    let number = 7;

    if number < 10 {
        println!("The condition was true!");
    } else {
        println!("The condition was false!");
    }
}
```

Unlike languages such as C, C++, or JavaScript, **Rust will not automatically try to convert non-boolean types to a boolean**. The condition in an `if` expression *must* evaluate to a `bool`. If you write `if number { ... }` where `number` is an integer, the compiler will throw an error. You must be explicit, e.g., `if number != 0 { ... }`.

You can handle multiple conditions using `else if`:

```rust
fn main() {
    let number = 6;

    if number % 4 == 0 {
        println!("number is divisible by 4");
    } else if number % 3 == 0 {
        println!("number is divisible by 3");
    } else {
        println!("number is not divisible by 4 or 3");
    }
}
```

#### Using `if` in a `let` Statement

Because `if` is an expression (as discussed in Section 2.3), you can use it on the right side of a `let` statement to assign the outcome to a variable. 

```rust
fn main() {
    let condition = true;
    let number = if condition { 5 } else { 6 };

    println!("The value of number is: {}", number);
}
```

There is a critical rule here: **the types of the values in all branches of the `if` expression must be identical**. Rust must know at compile time what type the `number` variable is. 

```text
+-------------------------------------------------------+
|  `if` AS AN EXPRESSION (TYPE MATCHING)                |
|                                                       |
|  let num = if condition {                             |
|      5        <-- Evaluates to i32                    |
|  } else {                                             |
|      "six"    <-- ERROR: Expected i32, found &str     |
|  };                                                   |
+-------------------------------------------------------+
```

### Repetition with Loops

Rust provides three kinds of loops to execute a block of code more than once: `loop`, `while`, and `for`.

#### 1. The `loop` Keyword

The `loop` keyword tells Rust to execute a block of code over and over again forever, or until you explicitly tell it to stop using the `break` keyword. You can use the `continue` keyword to skip the rest of the current iteration and jump to the beginning of the next one.

```rust
fn main() {
    let mut count = 0;
    
    loop {
        count += 1;
        if count == 3 {
            println!("Skipping 3");
            continue; 
        }
        
        println!("Count: {}", count);
        
        if count == 5 {
            println!("Breaking the loop");
            break;
        }
    }
}
```

**Returning Values from Loops:**
Because `loop` is an expression, you can return a value out of it. You do this by placing the value you want to return immediately after the `break` keyword.

```rust
fn main() {
    let mut counter = 0;

    let result = loop {
        counter += 1;

        if counter == 10 {
            break counter * 2; // Returns 20 out of the loop
        }
    };

    println!("The result is {}", result);
}
```

**Loop Labels:**
If you have loops within loops, `break` and `continue` apply to the innermost loop at that point. You can optionally specify a **loop label** on a loop, which you can then use with `break` or `continue` to specify that those keywords apply to the labeled loop instead of the innermost loop. Loop labels must begin with a single quote (`'`).

```rust
fn main() {
    let mut count = 0;
    'counting_up: loop {
        let mut remaining = 10;

        loop {
            if remaining == 9 {
                break; // Breaks the inner loop
            }
            if count == 2 {
                break 'counting_up; // Breaks the outer loop
            }
            remaining -= 1;
        }

        count += 1;
    }
}
```

#### 2. Conditional Loops with `while`

A program often needs to evaluate a condition within a loop. While the condition is `true`, the loop runs. When the condition ceases to be `true`, the program calls `break`. You could write this with `loop`, `if`, `else`, and `break`, but Rust has a built-in language construct for this: `while`.

```rust
fn main() {
    let mut number = 3;

    while number != 0 {
        println!("{}!", number);
        number -= 1;
    }

    println!("LIFTOFF!!!");
}
```

#### 3. Iterating with `for`

The `for` loop is by far the most commonly used loop construct in Rust. It is used to execute some code for each item in a collection, such as an array.

While you *could* use a `while` loop to iterate over an array by managing an index variable, it is prone to errors. If the index length is incorrect, your program will panic. Furthermore, the compiler must add runtime bounds checks for every iteration of a `while` loop index access. 

The `for` loop avoids these safety and performance pitfalls:

```rust
fn main() {
    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("the value is: {}", element);
    }
}
```

The safety and conciseness of `for` loops make them the go-to loop in Rust. Even if you want to run code a certain number of times rather than iterate over an existing collection, you should use a `for` loop in conjunction with a **Range** (`start..end`), which is provided by the standard library.

A `Range` generates all numbers in sequence starting from the first number and stopping *before* the last number.

```rust
fn main() {
    // Iterates 1, 2, 3. The `rev()` method reverses the range.
    for number in (1..4).rev() {
        println!("{}!", number);
    }
    println!("LIFTOFF!!!");
}
```

## 2.5 Comments, Documentation, and Naming Conventions

Code is read far more often than it is written. Rust provides robust, built-in tooling not just for leaving notes in your codebase, but for generating beautiful, HTML-formatted documentation directly from your source files. Coupled with strict, community-wide naming conventions, Rust ensures that codebases remain navigable and consistent, whether you are reading the standard library or a third-party crate.

### Code Comments

For general notes, explanations, or disabling code during debugging, Rust uses standard C-style comments. The compiler completely ignores these during the build process.

**Line Comments:**
Line comments start with two slashes (`//`) and continue until the end of the line. This is the idiomatic way to write normal comments in Rust, even for multi-line explanations.

```rust
// Initialize the connection pool.
// We use a max size of 10 to prevent exhausting database connections.
let pool_size = 10;
```

**Block Comments:**
Block comments start with `/*` and end with `*/`. While they can be used to span multiple lines, they are most frequently used in Rust to quickly comment out chunks of code during development.

```rust
let x = 5;
/*
let y = 10;
println!("y is {}", y);
*/
let z = 15;
```

*Best Practice:* Your code should generally explain the *what* and the *how* through clear variable names and logical structure. Use comments to explain the *why*—the business logic, the edge cases, or the reason a particular algorithm was chosen over another.

### Documentation Comments

Rust takes documentation incredibly seriously. The language includes a tool called `rustdoc` (invoked via Cargo) that extracts special comments from your code and generates formatted HTML documentation.

Documentation comments support full Markdown formatting, allowing you to include headings, bold text, lists, and code blocks. 

#### Outer Doc Comments (`///`)

Outer doc comments use three slashes (`///`) and apply to the item that immediately follows them. They are typically used to document functions, structs, enums, and modules.

```rust
/// Calculates the distance between two points on a 2D plane.
///
/// # Arguments
///
/// * `x1` - The x-coordinate of the first point.
/// * `y1` - The y-coordinate of the first point.
/// * `x2` - The x-coordinate of the second point.
/// * `y2` - The y-coordinate of the second point.
///
/// # Examples
///
/// ```
/// let dist = calculate_distance(0.0, 0.0, 3.0, 4.0);
/// assert_eq!(dist, 5.0);
/// ```
fn calculate_distance(x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    let dx = x2 - x1;
    let dy = y2 - y1;
    (dx * dx + dy * dy).sqrt()
}
```

**The Power of Doctests:**
Notice the code block under the `# Examples` heading. When you run `cargo test` (which will be covered extensively in Chapter 18), Rust will actually compile and execute the code inside your documentation comments. This ensures that your documentation examples never become outdated or broken as your code evolves.

#### Inner Doc Comments (`//!`)

Inner doc comments use two slashes and a bang (`//!`). Instead of documenting the item that follows them, they document the item that *contains* them. These are almost exclusively used at the very top of a file (to document a module) or at the top of `src/main.rs` or `src/lib.rs` (to document the entire crate).

```rust
//! # Math Utilities
//!
//! This crate provides a collection of high-performance mathematical 
//! utilities for 2D and 3D graphics rendering.

pub mod geometry;
pub mod algebra;
```

To generate and view your documentation locally, you simply run:

```bash
cargo doc --open
```

This command builds the HTML documentation for your code and all of your dependencies, and opens it in your default web browser.

### Naming Conventions

Rust has strong opinions on how things should be named. If you violate these conventions, your code will still compile, but the compiler (and the official linter, Clippy) will emit warnings by default. Adhering to these conventions is mandatory for writing idiomatic Rust.

Here is the standard matrix for naming identifiers in Rust:

| Item | Convention | Example |
| :--- | :--- | :--- |
| **Variables** | `snake_case` | `user_profile` |
| **Functions** | `snake_case` | `calculate_total()` |
| **Modules** | `snake_case` | `network_utils` |
| **Structs** | `PascalCase` | `HttpResponse` |
| **Enums** | `PascalCase` | `ConnectionState` |
| **Enum Variants** | `PascalCase` | `Connected`, `Disconnected` |
| **Traits** | `PascalCase` | `IntoIterator` |
| **Type Aliases** | `PascalCase` | `Result<T, E>` |
| **Constants** | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES` |
| **Statics** | `SCREAMING_SNAKE_CASE` | `GLOBAL_TIMEOUT` |

**A Note on Type Parameters:**
When defining generic types (which will be introduced in Chapter 7), the convention is to use short, single-letter `PascalCase` names. The most common is `T` (for Type), followed by `U`, `V`, or `E` (for Error). If a single letter isn't descriptive enough, a concise `PascalCase` word is acceptable (e.g., `Key`, `Value`).