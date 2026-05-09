So far, your scripts have executed commands strictly sequentially. However, robust automation requires decision-making. Control flow enables your script to react dynamically—like checking if a file exists before reading it, or verifying user permissions.

This chapter explores conditionals in Bash. We must immediately correct a common misconception: unlike languages that evaluate strict boolean `true` or `false` values, Bash conditionals evaluate the *exit status* of a command (0 for success, non-zero for failure). You will learn to master `if` statements, the `test` command, and logical operators to build intelligent, adaptable shell scripts.

## 8.1 The `if`, `elif`, and `else` Constructs

In shell scripting, you rarely want every command to execute sequentially every time the script runs. Control flow allows your script to make decisions, branching into different blocks of code based on specific conditions. In Bash, the primary mechanism for this branching logic is the `if` statement.

Crucially, unlike many other programming languages that evaluate boolean values (`true` or `false`), **the Bash `if` statement evaluates the exit status of a command**.

If the evaluated command succeeds (returns an exit status of `0`), the condition is considered true, and the subsequent code block runs. If it fails (returns a non-zero exit status), the condition is considered false, and the block is skipped.

### The Basic `if` Statement

The simplest form of a conditional is the standalone `if` statement. It executes a block of code only if the condition is met.

**Syntax:**

```bash
if command_to_evaluate; then
    # Commands to run if the exit status is 0
fi

```

*Notice the `fi` keyword (which is `if` spelled backward). It is strictly required to close the `if` block.*

**Example:**

```bash
#!/bin/bash

# Creating a directory and entering it only if the creation was successful
if mkdir new_project; then
    echo "Directory created successfully."
    cd new_project
fi

```

---

### Branching with `else`

When you need a fallback action for when a condition fails, you use the `else` clause. It guarantees that one, and only one, of the two code blocks will execute.

**Syntax:**

```bash
if command_to_evaluate; then
    # Commands to run if success (0)
else
    # Commands to run if failure (non-zero)
fi

```

**Text Diagram: The `if-else` Logical Flow**

```text
          [Evaluate Command]
                  |
             Success (0)?
            /            \
         YES              NO
         /                  \
[Execute `then` block]   [Execute `else` block]
         \                  /
          \                /
         [Resume Script Execution]

```

**Example:**

```bash
#!/bin/bash

# Checking if a user is currently logged in using the 'who' and 'grep' commands
# The -q flag makes grep quiet; we only care about its exit status
if who | grep -q "johndoe"; then
    echo "User johndoe is currently logged in."
else
    echo "User johndoe is NOT logged in."
fi

```

---

### Chaining Conditions with `elif`

For more complex decision trees requiring multiple checks, you can chain conditions using `elif` (short for "else if"). Bash will evaluate each condition sequentially. As soon as one command succeeds, its corresponding code block executes, and the rest of the structure is bypassed.

**Syntax:**

```bash
if command_1; then
    # Runs if command_1 succeeds
elif command_2; then
    # Runs if command_1 fails, but command_2 succeeds
else
    # Runs if both command_1 and command_2 fail
fi

```

**Example:**

```bash
#!/bin/bash

# In the upcoming sections, you will learn how to use the `test` command 
# to evaluate strings and numbers. For now, observe the structural flow:

if grep -q "^admin:" /etc/passwd; then
    echo "The admin user exists on this system."
elif grep -q "^guest:" /etc/passwd; then
    echo "No admin found, but the guest user exists."
else
    echo "Neither admin nor guest users were found."
fi

```

---

### Syntax Formatting Rules

Bash is notoriously strict about syntax formatting. When structuring your conditionals, keep the following rules in mind:

* **The Semicolon (`;`):** The semicolon before `then` is required if you place `then` on the same line as the evaluated command. If you move `then` to the next line, the semicolon can be omitted.
* **Indentation:** While Bash ignores leading whitespace, you should always indent the commands inside the `then`, `elif`, and `else` blocks. This is a crucial best practice for script readability.
* **Termination:** Always double-check that you have closed your conditional block with a matching `fi`. A missing `fi` will result in a syntax error (`syntax error: unexpected end of file`), which frustratingly often points to the very end of your script rather than the location of the missing keyword.

## 8.2 The `test` Command and Brackets

In the previous section, you learned that the Bash `if` statement evaluates the *exit status* of a command, not a traditional boolean true/false. But what if you want to evaluate a condition, such as whether a variable equals a specific string, or if a file exists?

You need a command designed specifically to evaluate an expression and return an exit status of `0` (success/true) or `1` (failure/false). That command is `test`.

### The Traditional `test` Command

The `test` command evaluates conditional expressions. If the expression is true, `test` exits silently with a status of `0`. If false, it exits with a status of `1`.

**Syntax:**

```bash
if test "$USER" = "admin"; then
    echo "Welcome, Administrator."
fi

```

While functional, writing the word `test` repeatedly can make scripts visually dense and harder to read. To solve this, early Unix developers created an alias of sorts: the single bracket.

---

### The Single Bracket: `[ ]`

In Bash, `[` is not merely punctuation—**it is a command**. In fact, `[` is functionally identical to the `test` command. It evaluates the expression that follows it, but it carries one strict requirement: the final argument passed to the command must be a closing bracket `]`.

Because `[` is a command, it follows the universal rule of shell commands: **it must be separated from its arguments by spaces.**

**Text Diagram: Anatomy of the Single Bracket**

```text
    Command Name
          |
          v
if        [        "$USER" = "admin"        ] ; then
          ^         ^             ^         ^
        Space     Space         Space     Space 
      (Required) (Required)  (Required) (Required)

```

Failing to include spaces around the brackets and the operators is one of the most common syntax errors in Bash scripting:

**Incorrect (Will cause errors):**

```bash
if ["$USER"="admin"]; then   # Bash looks for a command literally named '["$USER"="admin"]'

```

**Correct:**

```bash
if [ "$USER" = "admin" ]; then
    echo "Welcome, Administrator."
fi

```

*Note: Because the single bracket is an external command (or a shell built-in acting like one), it is highly susceptible to word-splitting. You must **always** double-quote your variables inside single brackets to prevent errors if the variable is empty or contains spaces.*

---

### The Double Bracket: `[[ ]]` (Extended Test)

While `[` is standard across all POSIX-compliant shells (like `sh`), Bash introduces a modernized, safer, and more powerful version: the double bracket `[[ ]]`.

The `[[ ]]` construct is a shell *keyword* rather than a standard command. Because it is built deep into the Bash parser, it handles variables and strings much more gracefully.

**Advantages of `[[ ]]`:**

1. **No Word Splitting:** If an unquoted variable contains spaces, `[[ ]]` will not break your script, unlike `[ ]`. (However, quoting variables remains a best practice).
2. **Pattern Matching:** You can use wildcard characters (like `*` or `?`) on the right side of a string comparison.
3. **Safer Logic:** It supports `&&` and `||` for logical AND/OR operations directly inside the brackets, without confusing the shell parser.

**Example: Pattern Matching with `[[ ]]`**

```bash
#!/bin/bash

filename="report_january.csv"

# The * acts as a wildcard because we use [[ ]]
if [[ $filename == report_*.csv ]]; then
    echo "This is a report CSV file."
fi

```

---

### `test` vs `[ ]` vs `[[ ]]`: Which should you use?

| Construct | Type | Portability | Features | Recommendation |
| --- | --- | --- | --- | --- |
| `test` | Built-in / Command | Universal (POSIX) | Basic evaluations | Rarely used directly today. |
| `[ ]` | Built-in / Command | Universal (POSIX) | Basic evaluations | Use only if you must write scripts for strictly POSIX shells (`sh`, `dash`). |
| `[[ ]]` | Bash Keyword | Bash, Zsh, Ksh | Pattern matching, safer variable handling | **Use this** for all modern Bash scripts. |

As a developer mastering Bash, you should establish a clear habit: **default to `[[ ]]` for your conditional expressions** unless you are specifically tasked with writing highly portable, cross-shell (POSIX) scripts.

## 8.3 Numeric and String Comparisons

One of the most common pitfalls for developers learning Bash is understanding how the shell interprets variables. Because Bash does not have a strict type system, a variable containing `10` could be treated as the integer ten, or as the literal text string "10".

To solve this ambiguity, Bash forces *you* to define the context. It provides two entirely separate sets of comparison operators: one exclusively for numbers, and one exclusively for strings. Mixing them up will lead to logic bugs that fail silently.

### Numeric Comparison Operators

When you want to evaluate values mathematically, you must use the traditional alphabetical operators. These tell Bash to parse the variables as integers before comparing them.

| Operator | Meaning | Example | True if... |
| --- | --- | --- | --- |
| `-eq` | Equal to | `[[ $a -eq $b ]]` | `$a` and `$b` are mathematically identical. |
| `-ne` | Not equal to | `[[ $a -ne $b ]]` | `$a` and `$b` are mathematically different. |
| `-gt` | Greater than | `[[ $a -gt $b ]]` | `$a` is strictly larger than `$b`. |
| `-ge` | Greater than or equal to | `[[ $a -ge $b ]]` | `$a` is larger than or equal to `$b`. |
| `-lt` | Less than | `[[ $a -lt $b ]]` | `$a` is strictly smaller than `$b`. |
| `-le` | Less than or equal to | `[[ $a -le $b ]]` | `$a` is smaller than or equal to `$b`. |

**Example:**

```bash
#!/bin/bash

users_logged_in=5
max_users=10

if [[ $users_logged_in -ge $max_users ]]; then
    echo "Warning: Maximum user capacity reached!"
else
    echo "Capacity is okay."
fi

```

### String Comparison Operators

When you want to evaluate values as text, you use symbolic operators. These tell Bash to look at the exact characters, their length, or their alphabetical (lexicographical) order.

| Operator | Meaning | Example | True if... |
| --- | --- | --- | --- |
| `==` (or `=`) | Equal to | `[[ $str1 == $str2 ]]` | The strings contain the exact same characters. |
| `!=` | Not equal to | `[[ $str1 != $str2 ]]` | The strings are different. |
| `<` | Less than | `[[ $str1 < $str2 ]]` | `$str1` sorts alphabetically before `$str2`. |
| `>` | Greater than | `[[ $str1 > $str2 ]]` | `$str1` sorts alphabetically after `$str2`. |
| `-z` | Is null / zero-length | `[[ -z $str1 ]]` | The string is empty (`""`) or unset. |
| `-n` | Is not null / non-zero | `[[ -n $str1 ]]` | The string contains at least one character. |

*Note: While `[ ]` requires the single `=` for string equality to remain POSIX compliant, `[[ ]]` supports `==`, which is generally preferred by developers used to C-style languages.*

**Example:**

```bash
#!/bin/bash

read -p "Enter your environment (dev/prod): " env_name

# Checking if the string is completely empty
if [[ -z $env_name ]]; then
    echo "Error: No environment provided."
    exit 1
fi

# Checking exact string match
if [[ $env_name == "prod" ]]; then
    echo "Deploying to production..."
fi

```

---

### The Comparison Trap: Strings vs. Numbers

To truly understand why the separation of operators matters, consider what happens when comparing variables with leading zeros or differing formats.

**Text Diagram: The Operator Trap**

```text
Variables: var1="05"  |  var2="5"

        Numeric Comparison           String Comparison
        ------------------           -----------------
        [[ "05" -eq "5" ]]           [[ "05" == "5" ]]
                |                            |
          Math Parser                  Text Parser
         "Is 5 equal to 5?"         "Is '05' literally '5'?"
                |                            |
             [ TRUE ]                     [ FALSE ]

```

**Code Demonstration:**

```bash
#!/bin/bash

var1="010"
var2="10"

# This evaluates to FALSE. 
# Lexicographically, "0" is not the same character as "1".
if [[ $var1 == $var2 ]]; then
    echo "Strings are identical."
else
    echo "Strings are different." # This will print
fi

# This evaluates to TRUE.
# Mathematically, 010 and 10 are both the integer ten.
if [[ $var1 -eq $var2 ]]; then
    echo "Numbers are mathematically equal." # This will print
fi

```

### A Brief Note on Arithmetic Evaluation `(( ))`

While `-eq` and `-lt` are standard for testing numbers inside conditional brackets, Bash provides a dedicated construct strictly for mathematics: the double parentheses `(( ))`.

Inside `(( ))`, you can use standard C-style math operators (`<`, `>`, `==`, `!=`). We will explore this thoroughly in Chapter 15, but you may encounter it in modern Bash scripts as an alternative to `[[ ]]` for purely numeric evaluations:

```bash
# Both lines do exactly the same thing:
if [[ $count -lt 5 ]]; then ... fi
if (( count < 5 )); then ... fi

```

## 8.4 File Testing Operators

Shell scripts are fundamentally tools for automating system administration and file manipulation. Because scripts interact heavily with the filesystem, it is dangerous to assume a file exists or that you have the right permissions to modify it. Attempting to read a missing file or execute a file without the proper permissions will cause your script to throw errors and potentially fail mid-execution.

Bash provides a robust set of **file testing operators** (also called unary operators because they take a single argument: the file path). These operators allow your script to inspect the filesystem before attempting an operation.

### Common File Testing Operators

These operators are used inside the conditional brackets (`[ ]` or `[[ ]]`). As recommended in previous sections, use `[[ ]]` for modern Bash scripts.

| Operator | True if the file... | Use Case / Meaning |
| --- | --- | --- |
| `-e` | **E**xists | The path exists (can be a file, directory, or link). |
| `-f` | is a regular **F**ile | The path exists and is a standard file (not a directory or device). |
| `-d` | is a **D**irectory | The path exists and is a directory. |
| `-L` | is a **L**ink | The path exists and is a symbolic link (symlink). |
| `-s` | has **S**ize > 0 | The file exists and is not empty. |
| `-r` | is **R**eadable | You have permission to read the file. |
| `-w` | is **W**ritable | You have permission to modify the file. |
| `-x` | is e**X**ecutable | You have permission to execute the file (or search the directory). |

### The `-e` vs. `-f` Pitfall

A common mistake for beginners is using `-e` when they actually mean `-f`.

If you want to read a text file, checking if it exists with `-e` is not enough. A directory can share the same name as the file you are looking for. If the path points to a directory, `-e` returns true, but trying to read it with a text processing command like `cat` will result in an error. **Always use `-f` when you specifically expect a regular file.**

**Text Diagram: The Safe File Processing Flow**

```text
                     [ Path: /etc/config.conf ]
                                 |
                          Does it exist? (-e)
                         /                   \
                       YES                   NO -> [ Exit/Error ]
                       /
            Is it a regular file? (-f)
           /                          \
         YES                          NO -> [ Handle as Dir/Link or Error ]
         /
  Is it readable? (-r)
   /                 \
 YES                 NO -> [ Print Permission Denied ]
  |
[ Process File ]

```

### Examples of File Testing

**Example 1: Safe Configuration Loading**

```bash
#!/bin/bash

config_file="/etc/myapp/config.conf"

# Check if the file exists AND is a regular file
if [[ -f "$config_file" ]]; then
    
    # Check if we have read permissions before trying to load it
    if [[ -r "$config_file" ]]; then
        echo "Loading configuration..."
        source "$config_file"
    else
        echo "Error: Config file exists, but permission is denied." >&2
        exit 1
    fi

else
    echo "Warning: Configuration file not found at $config_file."
    echo "Falling back to default settings."
fi

```

**Example 2: Directory Creation and Validation**

```bash
#!/bin/bash

backup_dir="/var/backups/daily"

# Check if the directory does NOT exist using the logical NOT operator (!)
if [[ ! -d "$backup_dir" ]]; then
    echo "Backup directory is missing. Creating it now..."
    
    # Create the directory, suppressing output
    mkdir -p "$backup_dir" 2>/dev/null
    
    # Verify the creation was successful
    if [[ $? -ne 0 ]]; then
        echo "Fatal Error: Failed to create $backup_dir. Check permissions." >&2
        exit 1
    fi
fi

echo "Proceeding with backup into $backup_dir..."

```

**Example 3: Checking if a File is Empty**

```bash
#!/bin/bash

log_file="error.log"

# -s checks if the file exists AND has a size greater than zero
if [[ -s "$log_file" ]]; then
    echo "Errors found in the log! Triggering alert..."
    cat "$log_file"
else
    echo "Log file is empty or missing. All systems normal."
fi

```

## 8.5 Logical Operators

Real-world scripts rarely rely on a single, isolated condition. Often, you need to verify multiple criteria before executing a block of code—for instance, ensuring a file exists *and* is readable, or checking if a user is an admin *or* a manager.

Bash provides logical operators to combine or invert conditions. However, because of how Bash parses commands, these operators can be used in two distinct contexts: inside the conditional brackets, or outside them to chain commands together.

### 1. Logical Operators Inside `[[ ]]`

When using the modern double bracket `[[ ]]` (as recommended in Section 8.2), you can use standard C-style logical operators directly inside the expression.

| Operator | Name | True if... |
| --- | --- | --- |
| `&&` | Logical AND | Both the left AND right conditions are true. |
| ` |  | ` |
| `!` | Logical NOT | Inverts the condition (true becomes false, false becomes true). |

**Example: Combining Conditions**

```bash
#!/bin/bash

file="/etc/shadow"
user="alice"

# Check if the user is 'alice' AND the file is readable
if [[ $user == "alice" && -r "$file" ]]; then
    echo "Access granted. Reading file..."
    cat "$file"
    
# Check if the user is 'bob' OR 'charlie'
elif [[ $user == "bob" || $user == "charlie" ]]; then
    echo "Limited access granted."
    
# Use NOT (!) to check if the file does NOT exist
elif [[ ! -e "$file" ]]; then
    echo "Error: The file does not exist."
else
    echo "Access denied."
fi

```

*Note: You can group complex logic using parentheses inside double brackets, e.g., `[[ ( $a -eq 1 || $b -eq 2 ) && $c -eq 3 ]]`.*

---

### 2. Command Chaining (Control Operators)

In Bash, `&&` and `||` are not just for evaluating variables inside brackets; they are also **Control Operators** used to chain separate commands together based on their exit statuses.

This relies on a concept called **Short-Circuit Evaluation**:

* **`Command1 && Command2` (AND):** Bash executes `Command1`. If it *succeeds* (exit status 0), it moves on to execute `Command2`. If `Command1` fails, Bash stops immediately; it knows the overall "AND" statement cannot be true, so it short-circuits and skips `Command2`.
* **`Command1 || Command2` (OR):** Bash executes `Command1`. If it *fails* (non-zero exit status), it moves on to execute `Command2` as a fallback. If `Command1` succeeds, Bash short-circuits and skips `Command2`, because the overall "OR" statement is already satisfied.

**Text Diagram: Short-Circuit Control Flow**

```text
[ AND Chaining: cmd1 && cmd2 ]
cmd1 executes
      |
   Success? ---> YES ---> executes cmd2
      |
      NO ---> (Short-circuit) Script continues, skips cmd2

[ OR Chaining: cmd1 || cmd2 ]
cmd1 executes
      |
   Success? ---> YES ---> (Short-circuit) Script continues, skips cmd2
      |
      NO ---> executes cmd2

```

This leads to highly idiomatic, concise Bash one-liners that replace clunky `if` statements.

**Idiomatic Examples:**

```bash
# Instead of:
# if mkdir new_dir; then cd new_dir; fi
mkdir new_dir && cd new_dir

# Fallback/Error handling:
# If the directory doesn't exist, create it.
[[ -d /var/log/myapp ]] || mkdir /var/log/myapp

# Chain an action and an error exit:
# If grep fails to find the string, print an error AND exit the script
grep -q "CRITICAL" error.log || { echo "No critical errors found."; exit 0; }

```

---

### 3. The Legacy POSIX Operators (`-a` and `-o`)

If you maintain older scripts that use the single bracket `[ ]` or the `test` command, you will likely encounter the older POSIX logical operators.

* `-a` is the equivalent of logical AND.
* `-o` is the equivalent of logical OR.

**Example (Legacy):**

```bash
if [ "$USER" = "root" -a -x "/opt/script.sh" ]; then
    echo "Root user can execute the script."
fi

```

**Best Practice Warning:** Modern Bash development strongly discourages the use of `-a` and `-o` inside single brackets. Because `[ ]` is subject to word-splitting and strict POSIX parsing rules, complex statements using `-a` and `-o` often lead to unpredictable syntax errors if variables are empty.

**Always prefer `[[ condition1 && condition2 ]]` or command chaining `[ condition1 ] && [ condition2 ]` in your modern scripts.**