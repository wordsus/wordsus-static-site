While Bash is famous for file manipulation and process management, it also possesses robust mathematical capabilities. Whether you are calculating loop iterations, evaluating system metrics, or converting data formats, mastering arithmetic is essential for writing dynamic, intelligent scripts.

In this chapter, we will explore how to process numbers in the shell. We will cover native integer math via arithmetic expansion, revisit legacy tools like `let` and `expr`, and break the integer barrier to perform precise floating-point calculations with `bc`. Finally, we will tackle random number generation and binary-level bitwise operations.

## 15.1 Integer Math using `$(( ))`

Bash provides a native, built-in mechanism for calculating mathematical operations known as **arithmetic expansion**. The syntax uses double parentheses prefixed by a dollar sign: `$(( expression ))`. When Bash encounters this construct, it evaluates the mathematical expression inside and replaces the entire block with the resulting integer.

It is crucial to note that native Bash arithmetic is strictly limited to **integers**. Any operation that would logically result in a fraction is truncated toward zero. (Handling floating-point decimals requires external tools, which will be covered in section 15.3).

### Basic Operators

Bash supports standard C-style mathematical operators within the `$(( ))` construct.

| Operator | Description | Example | Result |
| --- | --- | --- | --- |
| `+` | Addition | `$(( 10 + 5 ))` | 15 |
| `-` | Subtraction | `$(( 10 - 5 ))` | 5 |
| `*` | Multiplication | `$(( 10 * 5 ))` | 50 |
| `/` | Division (Integer) | `$(( 10 / 3 ))` | 3 |
| `%` | Modulo (Remainder) | `$(( 10 % 3 ))` | 1 |
| `**` | Exponentiation | `$(( 2 ** 3 ))` | 8 |

```bash
#!/bin/bash

# Simple inline calculations
echo "There are $(( 60 * 60 * 24 )) seconds in a day."

# Integer division truncates the decimal portion
echo "100 divided by 3 is $(( 100 / 3 ))" 

```

### Referencing Variables

A major advantage of arithmetic expansion is how it handles variables. Inside the `(( ))` block, **you do not need to prefix variables with a `$` to reference their values**. Bash automatically resolves the variable names to their numeric values. Furthermore, you can mix hardcoded integers and variables seamlessly.

```bash
base_salary=5000
bonus=750
deduction=200

# Notice the absence of '$' before the variable names inside the parentheses
net_pay=$(( base_salary + bonus - deduction ))

echo "Net Pay: $net_pay"

```

If you reference an unset variable or a variable containing a non-numeric string inside an arithmetic context, Bash will treat its value as `0`.

### Increment, Decrement, and Assignment Operators

Arithmetic expansion fully supports variable assignment and modification directly within the expression. This includes compound assignment operators and pre/post incrementing.

* **Compound Assignments:** `+=`, `-=`, `*=`, `/=`, `%=`
* **Increment/Decrement:** `++`, `--`

```bash
counter=10

# Post-increment: returns the value, then increments
echo "Post-increment: $(( counter++ ))"  # Outputs 10
echo "Current value: $counter"           # Outputs 11

# Pre-increment: increments, then returns the new value
echo "Pre-increment: $(( ++counter ))"   # Outputs 12

# Compound assignment inside expansion
echo "Add 5 to counter: $(( counter += 5 ))" # Outputs 17

```

### Arithmetic Expansion `$(( ))` vs. Arithmetic Evaluation `(( ))`

While they look similar, it is important to distinguish between `$(( ))` and `(( ))` (without the leading dollar sign).

* **`$(( ))` (Expansion):** Evaluates the math and *returns the output* as a string substitution. It is used when you need to assign the result to a variable or pass it to a command like `echo`.
* **`(( ))` (Evaluation):** Evaluates the math silently. It is used exclusively for its side effects (like updating a variable) or for its exit status (0 if the result is non-zero, 1 if the result is zero).

```bash
value=5

# Expansion: Replaces itself with the result
result=$(( value * 2 )) 

# Evaluation: Performs the operation silently
(( value *= 2 )) 

```

### Working with Different Number Bases

By default, Bash assumes numbers are base-10 (decimal). However, you can perform arithmetic using other bases (from base-2 up to base-64) by using the `base#number` syntax.

Bash also recognizes standard programmatic prefixes:

* Numbers starting with `0` are treated as **octal** (base-8).
* Numbers starting with `0x` are treated as **hexadecimal** (base-16).

```bash
# Binary (Base-2) to Decimal
echo "Binary 1010 is: $(( 2#1010 ))"

# Hexadecimal (Base-16) to Decimal
echo "Hex FF is: $(( 16#FF ))"
echo "Hex FF with 0x prefix is: $(( 0xFF ))"

# Octal (Base-8) to Decimal
echo "Octal 77 is: $(( 8#77 ))"
echo "Octal 77 with 0 prefix is: $(( 077 ))"

```

## 15.2 The `let` and `expr` Commands

While arithmetic expansion (`$(( ))`) is the modern and preferred way to perform math in Bash, you will inevitably encounter the `let` and `expr` commands, especially in older scripts or when aiming for strict POSIX compliance. Understanding how they work, and their historical context, is essential for maintaining legacy code and understanding shell evolution.

### The `let` Built-in

The `let` command is a Bash built-in designed specifically for evaluating arithmetic expressions. Unlike `$(( ))`, which replaces itself with the result of the calculation (expansion), `let` evaluates the expression silently. Its primary purpose is assigning values to variables.

**Syntax and Rules:**

* You do not need to prefix variables with a `$` sign.
* Spaces are strictly forbidden unless the entire expression is wrapped in quotes.
* Multiple expressions can be evaluated in a single `let` command by separating them with spaces.

```bash
#!/bin/bash

# Basic assignment without spaces
let a=5
let b=a+10
echo "b is $b" # Outputs: b is 15

# Using quotes to allow spaces for readability
let "c = a + b"
echo "c is $c" # Outputs: c is 20

# Multiple expressions on a single line
let x=10 y=20 "z = x * y"
echo "z is $z" # Outputs: z is 200

```

#### `let` and Exit Statuses

One of the unique features of `let` (and the `(( ))` construct from section 15.1) is its exit status. `let` sets its exit status based on the *mathematical result* of the last evaluated expression:

* If the result is **non-zero**, the exit status is `0` (Success).
* If the result is **zero**, the exit status is `1` (Failure).

This makes `let` useful as a condition in `if` statements or `while` loops, though `(( ))` is more commonly used for this today.

```bash
let "result = 5 - 5"
echo $? # Outputs 1 (Failure) because the result is mathematically 0

```

### The `expr` Command

Unlike `let`, `expr` is not a Bash built-in; it is a separate, external executable (usually found at `/usr/bin/expr`). It originates from the early days of the Bourne shell (sh) before native shell math existed.

Because `expr` is an external command, the shell parses its arguments *before* passing them to the program. This leads to several strict formatting requirements that make `expr` notoriously error-prone.

**Syntax and Rules:**

* You **must** separate every token (numbers and operators) with spaces.
* You **must** use the `$` prefix for variables (since `expr` cannot access internal shell variables on its own).
* You **must** escape shell metacharacters like `*`, `<`, and `>` to prevent the shell from interpreting them (e.g., preventing `*` from triggering filename expansion).

```bash
#!/bin/bash

num1=10
num2=5

# Correct usage: spaces around operators, variables prefixed with $
sum=$(expr $num1 + $num2)
echo "Sum: $sum"

# Multiplication requires escaping the asterisk
product=$(expr $num1 \* $num2)
echo "Product: $product"

# WRONG: No spaces (expr treats it as a single string)
expr 10+5 # Outputs: 10+5

```

#### Beyond Math: `expr` String Operations

Because early shells lacked advanced string manipulation, `expr` was designed to handle more than just arithmetic. It can calculate string lengths, extract substrings, and evaluate basic regular expressions.

```bash
text="BashScripting"

# Find the length of a string
expr length "$text" # Outputs 13

# Extract a substring (Start index 5, length 6)
expr substr "$text" 5 6 # Outputs Script

```

*(Note: Modern Bash provides native parameter expansions for string manipulation, making `expr` largely obsolete for these tasks as well).*

### Comparing Arithmetic Methods

To summarize when and why you might see these different tools, refer to the following capability matrix:

| Feature / Requirement | `$(( ))` | `let` | `expr` |
| --- | --- | --- | --- |
| **Type** | Native Shell Expansion | Native Shell Built-in | External Command |
| **Output** | Returns a string value | Silent (Variable assignment) | Prints to standard output |
| **Variable Prefix (`$`)** | Optional | Optional | **Required** |
| **Spaces around operators** | Optional | Forbidden (unless quoted) | **Required** |
| **Escaping operators (`\*`)** | Not required | Not required | **Required** |
| **Performance** | Fastest | Fast | Slowest (Forks a new process) |
| **POSIX Portability** | Yes (POSIX standard) | No (Bash/Ksh specific) | Yes (Ancient POSIX standard) |

**Best Practice Rule of Thumb:** Use `$(( ))` for calculating and returning values, use `(( ))` or `let` for silent variable assignment and incrementing, and avoid `expr` entirely unless you are writing a script that must run on a highly restricted, legacy Bourne shell (sh) environment.

## 15.3 Floating-Point Math with `bc`

As we established in previous sections, Bash's native arithmetic expansion (`$(( ))`) and built-in commands (`let`, `expr`) are strictly limited to integer mathematics. If you attempt an operation like `10 / 3`, Bash will aggressively truncate the decimal portion and return `3`.

When your script requires floating-point precision—such as calculating percentages, handling currency, or dealing with scientific data—you must turn to an external utility. The standard and most reliable tool for this job in the Linux ecosystem is `bc`.

### What is `bc`?

The `bc` command stands for **Basic Calculator** (or Arbitrary-Precision Calculator Language). It is not merely a command, but a complete, C-like mathematical scripting language that reads from standard input, processes expressions, and prints the results to standard output.

Because it reads from standard input, the standard way to use `bc` in a Bash script is to pipe (`|`) or redirect an equation into it.

```bash
#!/bin/bash

# Standard piping using echo
echo "10.5 + 4.2" | bc

# Using a Here String (Modern, cleaner approach)
bc <<< "10.5 + 4.2"

```

### Controlling Precision with `scale`

By default, `bc` does not automatically display decimal places for division operations; it behaves much like integer math unless you explicitly define the precision. You control this using the special internal `bc` variable called `scale`.

The `scale` variable determines the number of digits following the decimal point. You can pass multiple instructions to `bc` by separating them with a semicolon (`;`).

```bash
dividend=10
divisor=3

# Default behavior (truncates)
echo "10 / 3" | bc               # Outputs: 3

# Setting scale to 2 decimal places
echo "scale=2; 10 / 3" | bc      # Outputs: 3.33

# Setting scale to 5 decimal places
bc <<< "scale=5; $dividend / $divisor"  # Outputs: 3.33333

```

### The Standard Math Library (`-l`)

If you are performing complex calculations, you should invoke `bc` with the `-l` (lowercase L) option. This flag does two very important things:

1. **Changes the default `scale`:** It automatically sets the `scale` to 20, saving you from defining it manually.
2. **Loads the standard math library:** This grants access to advanced mathematical functions, including sine `s(x)`, cosine `c(x)`, arctangent `a(x)`, natural logarithm `l(x)`, and exponential `e(x)`.

```bash
# Division with -l (defaults to scale=20)
bc -l <<< "10 / 3"  # Outputs: 3.33333333333333333333

# Calculating the sine of 1 radian
bc -l <<< "s(1)"    # Outputs: .84147098480789650665

# You can still override the scale if 20 is too much
bc -l <<< "scale=4; e(2)" # Outputs: 7.3890 (e to the power of 2)

```

### Capturing `bc` Results into Variables

To use the calculated floating-point value later in your script, wrap the `bc` command in command substitution `$( )`.

```bash
#!/bin/bash

price=19.99
tax_rate=0.07

# Calculate tax and total
tax=$(bc <<< "scale=2; $price * $tax_rate")
total=$(bc <<< "scale=2; $price + $tax")

echo "Base Price: $$price"
echo "Tax:        $$tax"
echo "Total:      $$total"

```

### Floating-Point Comparisons

Bash's standard conditional operators (`-eq`, `-lt`, `>`, etc.) inside `[ ]` or `[[ ]]` **do not support floating-point numbers**. If you try to evaluate `[ 3.5 -gt 2.1 ]`, Bash will throw an integer expression error.

You can solve this by offloading the comparison to `bc`. When `bc` evaluates a logical comparison, it returns `1` if the statement is true, and `0` if the statement is false. You can then test that output in your `if` statement.

| `bc` Expression | Meaning | Output if True | Output if False |
| --- | --- | --- | --- |
| `10.5 > 5.5` | Greater than | `1` | `0` |
| `3.2 <= 4.1` | Less than or equal to | `1` | `0` |
| `1.1 == 2.2` | Equal to | `1` | `0` |

```bash
#!/bin/bash

temp=98.6
fever_threshold=100.4

# Evaluate the expression in bc, then check if the output is 1
if [ $(bc <<< "$temp >= $fever_threshold") -eq 1 ]; then
    echo "Alert: Patient has a fever."
else
    echo "Temperature is normal."
fi

```

By leveraging `bc` for both calculation and logical evaluation, you can bypass Bash's strict integer limitations and build scripts capable of handling precise, real-world numerical data.

## 15.4 Generating Random Numbers

Bash provides a built-in mechanism for generating pseudo-random integers through a special internal variable named `$RANDOM`. While it behaves like a standard environment variable when you read it, it is actually an internal function that returns a new random number each time it is accessed.

### The `$RANDOM` Variable

By default, querying `$RANDOM` yields an integer between `0` and `32767` (inclusive).

```bash
#!/bin/bash

echo "First random number: $RANDOM"
echo "Second random number: $RANDOM"

```

Because `$RANDOM` is a pseudo-random number generator (PRNG), the sequence of numbers it produces is determined by an initial seed value. Bash seeds this automatically when the shell starts. However, you can manually seed the generator by assigning a value to `RANDOM`. This is particularly useful in testing environments where you want reproducible, predictable "random" sequences.

```bash
# Seeding the generator
RANDOM=42
echo "Reproducible random number: $RANDOM"

```

### Scaling Random Numbers to a Specific Range

A number between 0 and 32767 is rarely exactly what you need. Most scripts require a random number within a specific, bounded range (e.g., simulating a 6-sided die roll, or picking a number between 1 and 100).

To scale `$RANDOM` to your desired range, you use the modulo operator (`%`) introduced in Section 15.1. The modulo operator returns the remainder of a division. Therefore, dividing any number by $N$ will always yield a remainder between $0$ and $N-1$.

**Formula:** `$(( RANDOM % N ))` generates a number from `0` to `N-1`.

```bash
# Generate a number between 0 and 9
random_digit=$(( RANDOM % 10 ))
echo "Random digit: $random_digit"

```

To shift the starting point away from `0`, you simply add your desired minimum value to the result of the modulo operation.

**General Range Formula:** `$(( RANDOM % (MAX - MIN + 1) + MIN ))`

```bash
#!/bin/bash

min=1
max=6

# Simulating a standard 6-sided die
# MAX (6) - MIN (1) + 1 = 6. 
# RANDOM % 6 yields 0-5. Adding MIN (1) yields 1-6.
die_roll=$(( RANDOM % (max - min + 1) + min ))

echo "You rolled a $die_roll"

```

### Limitations and Alternatives

It is critical to understand the limitations of `$RANDOM`:

1. **Not Cryptographically Secure:** You should never use `$RANDOM` for generating passwords, encryption keys, or security tokens. It is highly predictable.
2. **Upper Limit:** The maximum value is strictly 32767. If you need a random number larger than this, `$RANDOM` alone is insufficient.

When you need larger numbers, easier range syntax, or better randomness, Linux provides external tools that can be called from within your Bash script.

#### Using `shuf`

The `shuf` (shuffle) command is a modern, flexible alternative for generating random selections and numbers. It completely bypasses the 32767 limit and simplifies the range syntax.

```bash
# Generate a single random number between 1 and 100000
large_random=$(shuf -i 1-100000 -n 1)
echo "Large random number: $large_random"

```

#### Using `/dev/urandom`

For security-sensitive scripts, you should draw random bytes directly from the Linux kernel's random number generator via the `/dev/urandom` file. Because this outputs raw binary data, it must be filtered or translated to be readable in Bash.

```bash
# Read 4 bytes from /dev/urandom and format them as an unsigned decimal
secure_random=$(od -An -N4 -tu4 < /dev/urandom | tr -d ' ')

echo "Cryptographically secure number: $secure_random"

```

For general scripting tasks, script logic, and simple simulations, `$RANDOM` remains the fastest and most convenient method, provided you stay within its mathematical boundaries.

## 15.5 Bitwise Operations

While most scripting tasks involve standard arithmetic, there are times—particularly when dealing with networking, file permissions, or low-level system configuration—where you need to manipulate numbers at their fundamental binary level. Bash supports standard C-style bitwise operations natively within the `$(( ))` arithmetic expansion.

Bitwise operators treat integers as sequences of bits (0s and 1s) and perform logical operations on each corresponding pair of bits. Note that Bash typically represents integers as 64-bit signed numbers.

### The Bitwise Operators

Bash provides six primary bitwise operators:

| Operator | Name | Description | Example |
| --- | --- | --- | --- |
| `&` | **AND** | Returns `1` if both bits are `1`, otherwise `0`. | `$(( a & b ))` |
| `|` | **OR** | Returns `1` if at least one bit is `1`, otherwise `0`. | `$(( a | b ))` |
| `^` | **XOR** (Exclusive OR) | Returns `1` if the bits are different, `0` if they are the same. | `$(( a ^ b ))` |
| `~` | **NOT** (Inversion) | Flips all bits (`0` becomes `1`, `1` becomes `0`). | `$(( ~a ))` |
| `<<` | **Left Shift** | Shifts bits to the left, filling with zeros. | `$(( a << 2 ))` |
| `>>` | **Right Shift** | Shifts bits to the right. | `$(( a >> 2 ))` |

### Visualizing Bitwise Logic

To understand how these operators work, it helps to look at the binary representations of the numbers being evaluated. Let's compare decimal `10` and `12`.

* Decimal 10 = Binary `1010`
* Decimal 12 = Binary `1100`

**Bitwise AND (`&`)**
Only columns where *both* top and bottom bits are `1` result in a `1`.

```text
  1010  (10)
& 1100  (12)
-------
  1000  (Result: 8)

```

**Bitwise OR (`|`)**
Any column with at least one `1` results in a `1`.

```text
  1010  (10)
| 1100  (12)
-------
  1110  (Result: 14)

```

**Bitwise XOR (`^`)**
Columns where the bits are *different* result in a `1`.

```text
  1010  (10)
^ 1100  (12)
-------
  0110  (Result: 6)

```

### Scripting with Bitwise Operators

You apply these operators in Bash just like standard arithmetic operators.

```bash
#!/bin/bash

a=10
b=12

echo "AND: $(( a & b ))" # Outputs: 8
echo "OR:  $(( a | b ))" # Outputs: 14
echo "XOR: $(( a ^ b ))" # Outputs: 6

```

#### A Note on Bitwise NOT (`~`)

When you use the bitwise NOT operator, you might get an unexpected negative number. This is because Bash uses "two's complement" to represent negative numbers. Flipping the bits of a positive integer flips the "sign bit" (the furthest left bit in a 64-bit integer), turning it into a negative number.

```bash
# NOT 10 in a 64-bit signed integer environment
echo "NOT: $(( ~10 ))" # Outputs: -11

```

### Bit Shifting

Bit shifting moves the binary representation of a number to the left or the right by a specified number of positions.

* **Left Shift (`<<`):** Equivalent to multiplying the number by $2^n$.
* **Right Shift (`>>`):** Equivalent to performing integer division by $2^n$.

```bash
#!/bin/bash

num=5  # Binary: 0101

# Shift left by 1 (5 * 2^1) -> Binary: 1010
echo "Left shift 1: $(( num << 1 ))"  # Outputs: 10

# Shift left by 2 (5 * 2^2) -> Binary: 10100
echo "Left shift 2: $(( num << 2 ))"  # Outputs: 20

# Shift right by 1 (5 / 2^1) -> Binary: 0010 (truncates the decimal)
echo "Right shift 1: $(( num >> 1 ))" # Outputs: 2

```

### Practical Application: Bitmasks

The most common use of bitwise operations in shell scripting is evaluating **bitmasks**. Bitmasks allow you to store multiple boolean (true/false) options within a single integer. Each option is assigned a value that is a power of 2 (1, 2, 4, 8, 16, etc.), ensuring that every bit represents a specific flag.

You use the **OR** (`|`) operator to combine flags, and the **AND** (`&`) operator to check if a specific flag is set.

```bash
#!/bin/bash

# Define binary flags (powers of 2)
FLAG_READ=1    # 0001
FLAG_WRITE=2   # 0010
FLAG_EXECUTE=4 # 0100

# Combine flags using OR (Read + Execute)
# 0001 | 0100 = 0101 (Decimal 5)
user_permissions=$(( FLAG_READ | FLAG_EXECUTE ))

echo "Current Permission Value: $user_permissions"

# Check if a specific flag is set using AND
if (( (user_permissions & FLAG_WRITE) == FLAG_WRITE )); then
    echo "User has WRITE permission."
else
    echo "User DOES NOT have WRITE permission."
fi

if (( (user_permissions & FLAG_EXECUTE) == FLAG_EXECUTE )); then
    echo "User has EXECUTE permission."
fi

```

This pattern is highly memory-efficient and is exactly how underlying POSIX file permissions (which you learned about in Chapter 3) are evaluated by the operating system.
