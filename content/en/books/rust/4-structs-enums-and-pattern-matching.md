While primitives and tuples are foundational, they are rarely enough to model real-world domains. To build robust applications, you need tools to create custom data types.

This chapter introduces Rust's core modeling abstractions. We will explore **Structs** to group related fields into cohesive records, and **Enums** to define types by enumerating their possible states. Finally, we will dive into **Pattern Matching**—a powerful control flow construct that safely extracts data from these types and guarantees at compile-time that every scenario in your logic is explicitly handled.

## 4.1 Defining and Instantiating Structs

Structures, or *structs*, are the primary way to create custom data types in Rust. They allow you to name and package multiple related values into a single, cohesive unit. 

While you saw in Chapter 2 that tuples can also group multiple values of different types, tuples rely entirely on their ordering. If you have a tuple representing a user—`(String, String, u64)`—you have to remember which `String` is the email and which is the username. Structs solve this by giving each piece of data a clear, descriptive name.

### Defining a Struct

To define a struct, use the `struct` keyword followed by the name of the struct. Struct names in Rust conventionally use `UpperCamelCase`. Inside curly brackets, you define the names and types of the pieces of data, which are called **fields**.

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
```

### Instantiating and Accessing Data

Once defined, you create an **instance** of the struct by specifying the struct's name and providing concrete values for every field in a comma-separated list inside curly brackets. The order in which you specify the fields during instantiation does not need to match the order in the struct's definition.

```rust
let user1 = User {
    email: String::from("alice@example.com"),
    username: String::from("alice_smith"),
    active: true,
    sign_in_count: 1,
};
```

To access a specific value from a struct, use dot notation (e.g., `user1.email`). 

If you want to change a value, the *entire* struct instance must be mutable. Rust does not allow you to mark only specific fields as mutable; mutability is a property of the variable binding, not the struct's internal layout.

```rust
let mut user1 = User {
    email: String::from("alice@example.com"),
    username: String::from("alice_smith"),
    active: true,
    sign_in_count: 1,
};

user1.email = String::from("alice.smith@example.com");
```

### Field Init Shorthand

When writing functions that return a struct instance, it is common to name the function parameters the same as the struct fields. Rust provides a syntactic sugar called the **field init shorthand** to make this less repetitive. Because the parameter names exactly match the field names, you do not need to write `email: email`.

```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username, // Shorthand for username: username
        email,    // Shorthand for email: email
        sign_in_count: 1,
    }
}
```

### Struct Update Syntax

Often, you will want to create a new struct instance based on an existing one, keeping most of the old values but changing a few. You can achieve this concisely using **struct update syntax**.

Using `..` specifies that any fields not explicitly set should be filled with the values from the given instance.

```rust
let user2 = User {
    email: String::from("new_alice@example.com"),
    ..user1
};
```

**Warning: Ownership and the Update Syntax**

It is critical to remember the ownership rules from Chapter 3 when using struct update syntax. The `..user1` syntax works like an assignment (`=`). Because `username` is a `String` (which manages heap data and does not implement the `Copy` trait), the `username` field is **moved** from `user1` to `user2`. 

```text
[ user1: User ]
├── active: true           (Copied to user2)
├── username: "alice_..."  (MOVED to user2) ───> [ user2: User ]
├── email: "alice@..."     (Ignored)             ├── active: true
└── sign_in_count: 1       (Copied to user2)     ├── username: "alice_..."
                                                 ├── email: "new_alice@..."
                                                 └── sign_in_count: 1
```

After creating `user2`, you can no longer use `user1` as a whole, nor can you access `user1.username`. However, you *can* still access `user1.active` and `user1.sign_in_count` because those types implement `Copy`. 

### Tuple Structs

Rust also supports **tuple structs**, which look like a hybrid between a tuple and a struct. Tuple structs have an overarching name, but their fields do not have names—only types. 

Tuple structs are highly effective for the **newtype pattern**, where you want to create a distinct type to enforce compile-time safety but don't need the verbosity of named fields.

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

let black = Color(0, 0, 0);
let origin = Point(0, 0, 0);
```

Even though `Color` and `Point` are both composed of three `i32` values, they are completely different types. A function expecting a parameter of type `Color` will refuse to accept a `Point`. You can access the values in a tuple struct using dot notation followed by the index (e.g., `black.0`).

### Unit-Like Structs

Finally, you can define structs that don't have any fields at all. These are called **unit-like structs** because they behave similarly to the unit type `()`.

```rust
struct AlwaysEqual;

let subject = AlwaysEqual;
```

Unit-like structs might seem useless at first glance, but they become powerful later in the book when we discuss Traits in Chapter 7. They are frequently used when you need to implement a trait on some type, but you don't actually need to store any state or data within the type itself.

## 4.2 Method Syntax and Associated Functions

While structs allow you to define custom data layouts, **methods** allow you to specify the behavior associated with those types. Methods are similar to regular functions—they are declared with the `fn` keyword, accept parameters, and return values—but they are defined within the context of a specific type. Furthermore, their first parameter is always `self`, representing the instance of the type the method is being called on.

### Defining Methods in `impl` Blocks

To define methods for a struct, you create an **implementation block** using the `impl` keyword followed by the struct's name. Everything inside this block is associated with your custom type.

Let's look at an example using a `Rectangle` struct:

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // A method to calculate the area
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // A method to check if this rectangle can hold another
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

fn main() {
    let rect1 = Rectangle { width: 30, height: 50 };
    let rect2 = Rectangle { width: 10, height: 40 };

    println!("The area is {} square pixels.", rect1.area());
    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
}
```

Notice the syntax for calling a method: `rect1.area()`. We use dot notation, appending the method name and parentheses directly to the struct instance.

### The `self` Parameter and Ownership

The most critical part of method syntax is how you handle the `self` parameter. The way you define `self` dictates how the method interacts with the instance's ownership, directly mirroring the borrowing rules from Chapter 3.

There are three primary ways a method can receive `self`:

| Method Signature | Shorthand For | Semantics | Typical Use Case |
| :--- | :--- | :--- | :--- |
| `fn method(&self)` | `self: &Self` | **Immutable Borrow:** The method reads data but cannot modify it. | Calculations, getters, checking state. |
| `fn method(&mut self)` | `self: &mut Self` | **Mutable Borrow:** The method can modify the instance's data. | Setters, state mutations, clearing buffers. |
| `fn method(self)` | `self: Self` | **Takes Ownership:** The method consumes the instance. It becomes invalid after the call. | Transformations, builder pattern finalizers (`build()`). |

*Note: `Self` (capital 'S') is an alias for the type that the `impl` block is for (e.g., `Rectangle`). `self` (lowercase 's') is the name of the instance.*

### Automatic Referencing and Dereferencing

If you come from languages like C or C++, you might be used to using `->` for calling methods on pointers and `.` for calling methods on values directly. Rust simplifies this with a feature called **automatic referencing and dereferencing**.

When you call a method like `object.something()`, Rust automatically adds `&`, `&mut`, or `*` to `object` so that it matches the method's signature. 

The following two lines of code are completely equivalent in Rust:

```rust
// Automatic referencing
rect1.area();

// Explicit referencing
(&rect1).area();
```

Rust evaluates the type of `rect1`, looks at the signature of `area` (which requires `&self`), and automatically borrows `rect1` immutably. This creates clean, readable code while strictly adhering to the underlying memory safety rules.

### Associated Functions

Not all functions defined within an `impl` block need to take `self` as a parameter. Functions that *do not* take `self` are called **associated functions** because they are associated with the struct's namespace, but they do not operate on a specific instance. 

In other languages, these are often called *static methods*. Associated functions are frequently used as constructors to return a new instance of the struct. By convention in Rust, the most common name for a constructor is `new`.

```rust
impl Rectangle {
    // Associated function (no 'self')
    fn new(width: u32, height: u32) -> Self {
        Self { width, height } // Self refers to Rectangle
    }

    // Another associated function acting as a specialized constructor
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}
```

Because associated functions don't have an instance to call them on, you cannot use dot notation. Instead, you use the `::` syntax with the struct name. This is the exact same syntax used for namespaces, which you've already seen with `String::from()`.

```rust
let my_rect = Rectangle::new(20, 40);
let my_square = Rectangle::square(15);
```

### Multiple `impl` Blocks

Rust allows you to spread the methods and associated functions for a single type across multiple `impl` blocks. 

```rust
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

impl Rectangle {
    fn perimeter(&self) -> u32 {
        (self.width + self.height) * 2
    }
}
```

While there's no reason to separate these methods into two blocks in this simple example, multiple `impl` blocks become highly useful for organizing code in larger projects, particularly when implementing Traits (covered in Chapter 7) or using conditional compilation.

## 4.3 Enums and the Ubiquitous `Option<T>` Type

Where structs give you a way of grouping related fields together (an "AND" relationship), **enumerations**, or *enums*, allow you to define a type by enumerating its possible variants (an "OR" relationship). 

Whenever you have a value that can only be one of a specific set of possibilities, an enum is the correct tool. For example, an IP address can be either a version 4 address *or* a version 6 address, but never both at the same time.

### Defining an Enum

You define an enum using the `enum` keyword followed by its name, and then you list its variants inside curly brackets.

```rust
enum IpAddrKind {
    V4,
    V6,
}

let four = IpAddrKind::V4;
let six = IpAddrKind::V6;
```

Notice that the variants of the enum are namespaced under its identifier, and we use a double colon `::` to access them. Both `IpAddrKind::V4` and `IpAddrKind::V6` are of the same custom type: `IpAddrKind`. Any function that takes an `IpAddrKind` will accept either variant.

### Attaching Data to Variants

In many languages, enums are essentially just named integer constants. Rust’s enums are significantly more powerful because you can attach data directly to each variant. 

If we wanted to store the actual IP address data alongside its version using just structs and our basic enum, it would look like this:

```rust
// The cumbersome way
struct IpAddr {
    kind: IpAddrKind,
    address: String,
}

let home = IpAddr {
    kind: IpAddrKind::V4,
    address: String::from("127.0.0.1"),
};
```

Rust allows us to bypass the struct entirely and put the data directly into the enum variants. Furthermore, each variant can have different types and amounts of associated data.

```rust
// The idiomatic Rust way
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

let home = IpAddr::V4(127, 0, 0, 1);
let loopback = IpAddr::V6(String::from("::1"));
```

This design beautifully captures the domain logic. A V4 address fundamentally consists of four octets (`u8`), while we might want to represent a V6 address as a `String`. 

To visualize the structural difference between structs and enums:

```text
STRUCT (The "AND" Type)                ENUM (The "OR" Type)
=======================                ====================
struct Message {                       enum Message {
    id: u64,           <--- AND --->       Quit,                  <--- OR --->
    body: String,      <--- AND --->       Move { x: i32, y: i32 }, <--- OR --->
    urgent: bool,                          Write(String),         <--- OR --->
}                                          ChangeColor(i32, i32, i32),
                                       }
(An instance holds ALL fields)         (An instance holds ONE variant)
```

As seen in the `Message` enum above, variants can be empty (`Quit`), have named fields like an anonymous struct (`Move`), or hold single or multiple positional values like a tuple struct (`Write`, `ChangeColor`).

### Methods on Enums

Just as you can with structs, you can define methods on enums using an `impl` block.

```rust
impl Message {
    fn call(&self) {
        // Method body would define what happens
        // when a message is executed
    }
}

let m = Message::Write(String::from("hello"));
m.call();
```

### The Null Problem and `Option<T>`

One of the most important enums in all of Rust is `Option`. It is the standard library's solution to a problem that has plagued software engineering for decades: the Null Pointer.

In languages like C, Java, or C#, variables can often hold a "null" value, meaning there is no data there. The inventor of the null reference, Tony Hoare, famously called it his "billion-dollar mistake" because it has led to countless vulnerabilities, system crashes, and bugs when a program attempts to use a null value as if it were valid data.

**Rust does not have nulls.** Instead, Rust uses the `Option` enum to encode the concept of a value being present or absent directly into the type system. It is defined by the standard library as follows:

```rust
enum Option<T> {
    None,
    Some(T),
}
```

The `<T>` syntax means `Option` is generic (a concept we will explore deeply in Chapter 7). For now, just know that `T` stands for "any type." You can have an `Option<i32>`, an `Option<String>`, or an `Option<Message>`.

Because `Option` is so foundational, its variants `Some` and `None` are included in the prelude. You don't need to prefix them with `Option::`.

```rust
let some_number = Some(5);
let some_char = Some('e');

// We must specify the type here because the compiler 
// cannot infer what 'T' is from 'None' alone.
let absent_number: Option<i32> = None; 
```

### Why `Option<T>` is Better Than Null

The genius of `Option<T>` lies in the fact that `Option<i8>` and `i8` are **different types**. 

In a language like C, if you have a variable of type integer, you can never be 100% sure if it holds a valid integer or a null reference without checking it. In Rust, if you have an `i8`, the compiler guarantees it has a valid `i8` value. You can use it confidently.

If a value *might* be absent, you must change its type to `Option<i8>`. Because an `Option<i8>` is not an `i8`, the compiler will completely prevent you from doing this:

```rust
let x: i8 = 5;
let y: Option<i8> = Some(5);

// ERROR: Cannot add `Option<i8>` to `i8`
let sum = x + y; 
```

To use the `i8` hiding inside `y`, you are forced to handle the possibility that it might be `None`. You have to explicitly extract the value out of the `Some` variant before you can perform operations on it.

This simple type-system rule eliminates the risk of accidentally assuming a null value is valid. By forcing you to unwrap the `Option`, Rust converts a common runtime crash into a compile-time error, ensuring your programs are fundamentally safer. We will explore exactly how to extract these values in the next section on pattern matching.

## 4.4 The `match` Control Flow Construct and Exhaustiveness

Rust provides an exceptionally powerful control flow operator called `match`. You can think of it like a highly advanced switch statement found in other languages, or fundamentally, like a coin-sorting machine. You drop a value in, it slides down a series of tracks (patterns), and it falls into the first bucket where it fits perfectly.

While `if` conditions must evaluate to a boolean, `match` allows you to compare a value against a series of structural patterns and execute code based on which pattern matches.

### Basic `match` Syntax

A `match` expression begins with the `match` keyword followed by an expression. Then, inside curly brackets, you define multiple **arms**. Each arm consists of a pattern, the `=>` operator, and the code to execute if the pattern matches. Arms are separated by commas.

```rust
enum TrafficLight {
    Red,
    Yellow,
    Green,
}

fn light_action(light: TrafficLight) -> &'static str {
    match light {
        TrafficLight::Red => "Stop immediately!",
        TrafficLight::Yellow => "Slow down and prepare to stop.",
        TrafficLight::Green => "Proceed with caution.",
    }
}
```

When `light_action` is called, Rust checks the value of `light` against each pattern in order. If `light` is `TrafficLight::Yellow`, it skips `Red`, matches `Yellow`, evaluates the expression `"Slow down and prepare to stop."`, and returns it.

### Extracting Values with Patterns

The true power of `match` reveals itself when used with enums that hold data. The patterns in your match arms can bind to the data inside the enum variants, allowing you to extract and use those values safely.

Consider the `Message` enum from the previous section:

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}

fn process_message(msg: Message) {
    match msg {
        Message::Quit => {
            println!("Shutting down the system.");
        }
        Message::Move { x, y } => {
            println!("Moving cursor to x: {}, y: {}", x, y);
        }
        Message::Write(text) => {
            println!("Displaying text: {}", text);
        }
    }
}
```

Notice how `Message::Move { x, y }` unpacks the named fields, making `x` and `y` available inside the execution block for that arm. Similarly, `Message::Write(text)` binds the inner `String` to the variable name `text`.

### Matching `Option<T>`

In Section 4.3, we learned that Rust uses `Option<T>` instead of nulls, forcing you to handle the possibility of a missing value. The `match` expression is the idiomatic way to extract the `T` from the `Some` variant.

Suppose we want to write a function that takes an `Option<i32>` and adds 1 to it if there is a value inside, but does nothing if it's absent:

```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}

let five = Some(5);
let six = plus_one(five);
let none = plus_one(None);
```

When `plus_one(five)` executes:
1. `x` is `Some(5)`.
2. Does `Some(5)` match `None`? No.
3. Does `Some(5)` match `Some(i)`? Yes. The variable `i` binds to the value `5`.
4. The code `Some(i + 1)` executes, returning `Some(6)`.

### The Rule of Exhaustiveness

Rust requires that `match` expressions be **exhaustive**. This means your patterns must cover *every possible value* the compiler knows the type can take.

If we made a mistake in our `plus_one` function and forgot to handle the `None` case:

```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        Some(i) => Some(i + 1),
    }
}
```

Rust will refuse to compile this code. It will produce an error message clearly stating that the pattern `None` is not covered:

```text
error[E0004]: non-exhaustive patterns: `None` not covered
 --> src/main.rs:2:11
  |
2 |     match x {
  |           ^ pattern `None` not covered
```

Exhaustiveness is a massive safety net. It guarantees that if you add a new variant to an enum later in your project's lifecycle, the compiler will instantly point out every `match` statement in your codebase that needs to be updated to handle the new state. You never have to worry about silent failures caused by unhandled variants.

### Catch-all Patterns and the `_` Placeholder

Sometimes you only care about a few specific variants and want to apply a default action to all the rest. Instead of listing every remaining variant, you can use a catch-all pattern.

If you want to use the value of the unmatched variants, you provide a variable name:

```rust
let dice_roll = 9;
match dice_roll {
    3 => add_fancy_hat(),
    7 => remove_fancy_hat(),
    other => move_player(other), // 'other' catches everything else
}
```

If you want a catch-all but do *not* need to use the value, Rust provides the `_` (underscore) pattern. This is a special wildcard that matches any value and completely ignores it.

```rust
let dice_roll = 9;
match dice_roll {
    3 => add_fancy_hat(),
    7 => remove_fancy_hat(),
    _ => reroll(), // Matches everything else, doesn't bind a variable
}
```

And finally, if you want to do absolutely nothing for the remaining cases, you can provide the unit value `()` as the execution code for the `_` arm:

```rust
let config_setting = Some(3);

match config_setting {
    Some(3) => println!("Applying special optimization rule 3"),
    _ => (), // Do nothing for any other value, including None
}
```

While `match` is incredibly robust, using it for situations where you only care about a single pattern and want to ignore everything else can feel slightly verbose. Rust provides a specialized, concise syntax for exactly this scenario, which we will explore in the next section.

## 4.5 Concise Control Flow with `if let` and `while let`

In the previous section, we saw how `match` forces you to handle every possible variant of an enum. While exhaustiveness is a fantastic safety feature, it can sometimes lead to boilerplate code when you only care about a single variant and want to ignore everything else.

Consider this scenario where we want to execute code only if an `Option<u8>` contains a value:

```rust
let config_max = Some(3u8);

match config_max {
    Some(max) => println!("The maximum is configured to be {}", max),
    _ => (), // Boilerplate to satisfy the compiler
}
```

To satisfy the `match` expression's requirement for exhaustiveness, we are forced to add `_ => ()`. For situations exactly like this, Rust provides a syntactic sugar: the `if let` construct.

### The `if let` Syntax

The `if let` syntax allows you to combine `if` and `let` into a less verbose way to handle values that match one pattern while ignoring the rest. 

Here is the exact same logic written using `if let`:

```rust
let config_max = Some(3u8);

if let Some(max) = config_max {
    println!("The maximum is configured to be {}", max);
}
```

The syntax reads as: "If the value `config_max` lets itself be destructured into the pattern `Some(max)`, execute this block." 

Behind the scenes, `if let` is exactly equivalent to a `match` with a single arm and a `_ => ()` catch-all. You lose the compile-time exhaustiveness check, but you gain brevity. It is a deliberate trade-off you make based on the specific needs of your logic.

### Adding an `else` Block

You can also include an `else` block with an `if let`. The block of code inside the `else` is exactly the same as the block of code that would go inside the `_` case of a `match` expression.

Suppose we have a `Message` enum, and we want to process text messages but simply increment a counter for all other message types:

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}

let msg = Message::Quit;
let mut non_text_messages = 0;

if let Message::Write(text) = msg {
    println!("Received text: {}", text);
} else {
    non_text_messages += 1;
}
```

### Looping with `while let`

Closely related to `if let` is the `while let` loop. It allows a `while` loop to run for as long as a pattern continues to match.

This construct shines when used with methods that return an `Option<T>` or a `Result<T, E>`. For example, a `Vec<T>` (Rust's standard growable array) has a method called `pop()` that removes and returns the last element. If the vector is empty, `pop()` returns `None`.

We can use `while let` to cleanly pop elements off a vector until it is empty:

```rust
let mut stack = vec![10, 20, 30];

// This loop continues as long as `stack.pop()` returns `Some(value)`
while let Some(top) = stack.pop() {
    println!("Popped: {}", top);
}

// At this point, stack is empty, and the loop naturally terminated
// because pop() returned None.
```

If we tried to write this with a `loop` and a `match`, the structural noise would obscure the logic:

```rust
// The verbose equivalent
let mut stack = vec![10, 20, 30];

loop {
    match stack.pop() {
        Some(top) => println!("Popped: {}", top),
        None => break,
    }
}
```

### Choosing the Right Tool

Understanding when to use `match` versus `if let` or `while let` is an important part of mastering idiomatic Rust. 

| Feature | `match` | `if let` / `while let` |
| :--- | :--- | :--- |
| **Verbosity** | High (Requires handling all arms) | Low (Focuses only on the pattern you care about) |
| **Exhaustiveness** | Enforced by the compiler | Bypassed entirely (silently ignores non-matches) |
| **Best Used For** | Complex branching logic where a missed variant would be a bug. | Extracting a single variant's inner value simply and concisely. |

By internalizing structs, enums, `Option<T>`, and these pattern-matching control flows, you have now grasped the core data modeling tools of Rust. You can safely represent complex domain logic without the fear of null pointer dereferences or unhandled edge cases. In the next part of the book, we will scale these concepts up by looking at how to organize this code into modules, crates, and workspaces.