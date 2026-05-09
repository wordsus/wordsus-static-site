Up until now, our scripts have been largely static, executing the exact same commands every time they run. To build truly dynamic and reusable tools, we need a way to store, retrieve, and manipulate data on the fly. This is where variables and parameters come in.

In this chapter, we will explore how Bash handles data storage. You will learn the strict syntax rules for declaring variables, the critical differences between single and double quoting, and how to capture user input using positional parameters. Finally, we will unlock the ability to capture the output of system commands and inject them into your scripts using command substitution.

## 7.1 Declaring and Assigning Variables

In Bash, a variable is a temporary store for a piece of information. Unlike many strongly typed programming languages (such as Java or C++), Bash variables are fundamentally untyped. By default, Bash treats every variable's value as a string of characters. It is only the context—such as using specific arithmetic operators—that forces Bash to evaluate a variable as a number.

### The Golden Rule of Assignment: No Spaces

To assign a value to a variable, you use the assignment operator (`=`). The most critical syntax rule in Bash variable assignment—and a frequent source of errors for beginners—is that **there must be no spaces on either side of the equals sign.**

```bash
# Correct assignment
city="Buenos Aires"
version=3

# Incorrect assignment (Will cause errors)
city = "Buenos Aires"
version= 3
```

**Why do spaces break the assignment?**
Bash processes lines by splitting them into tokens separated by spaces. The first token on a line is always treated as a command to execute.

```text
USER_NAME="alice"     --> Bash sees one token: a variable assignment.

USER_NAME = "alice"   --> Bash sees three tokens:
  [1] USER_NAME       <-- Bash looks for a command/program named "USER_NAME"
  [2] =               <-- Treated as the first argument to the "USER_NAME" command
  [3] "alice"         <-- Treated as the second argument
```

Because there is rarely a command on your system named `USER_NAME`, Bash will throw an error like `USER_NAME: command not found`.

### Naming Conventions

When naming your variables, adhere to the following rules and conventions:

* **Allowed characters:** Variable names can only contain letters (a-z, A-Z), numbers (0-9), and underscores (`_`).
* **Starting characters:** A variable name *cannot* start with a number. `file1` is valid; `1file` is not.
* **Case sensitivity:** Bash variables are case-sensitive. `myVar`, `MyVar`, and `MYVAR` are three distinct variables.
* **Convention:** By convention, environment variables (which we will cover in Chapter 14) and system-wide configurations are written in `UPPER_CASE`. For your script's internal, local variables, it is best practice to use `lower_case` or `snake_case` to prevent accidental collisions with system variables.

### Accessing Variable Values (Dereferencing)

To retrieve the value stored inside a variable, you must prepend the variable name with a dollar sign (`$`). This is known as parameter expansion or dereferencing.

```bash
greeting="Hello, world!"

# Printing the literal word 'greeting'
echo greeting

# Printing the value held by the variable 'greeting'
echo $greeting
```

#### The Curly Brace Syntax: `${VARIABLE}`

While `$variable` works perfectly in isolation, problems arise when you need to place a variable directly next to other alphanumeric characters or underscores. Bash will attempt to read the longest possible valid variable name, which can lead to empty outputs.

To safely isolate the variable name, wrap it in curly braces `{}`:

```bash
backup_dir="logs"

# Attempting to print "logs_2026":
# Bash looks for a variable named 'backup_dir_2026', which doesn't exist.
echo $backup_dir_2026

# Using curly braces to explicitly define the variable boundary:
echo ${backup_dir}_2026
```

### The `readonly` Command

If you have a variable that should act as a constant throughout the execution of your script, you can prevent it from being modified or unset by using the `readonly` command.

```bash
readonly PI=3.14159
readonly MAX_RETRIES=5

# Attempting to reassign a readonly variable will throw an error:
PI=3.14  # bash: PI: readonly variable
```

### Undeclared and Empty Variables

In Bash, if you attempt to access a variable that has not been declared, the shell will not throw an error or crash your script. Instead, it will silently evaluate to an empty string (null).

```bash
# Assuming 'undefined_var' was never assigned a value
echo "The value is: [${undefined_var}]"
# Output: The value is: []
```

You can also intentionally declare an empty variable by assigning it nothing:

```bash
empty_string=""
# or simply
empty_string=
```

*Note: In the next section (7.2), we will explore how quotes (`'` vs `"`) drastically change how Bash interprets the values you assign to these variables, especially when those values contain spaces or other variables.*

## 7.2 Quoting Rules: Single vs. Double Quotes

In the previous section, we established the golden rule of variable assignment: no spaces around the equals sign. But what happens when the *value* you want to assign contains spaces?

If you type `message=Hello World`, Bash sees the assignment `message=Hello` followed by a command named `World`. To tell Bash that "Hello World" is a single unit of data, you must use quotes. However, in Bash, not all quotes are created equal. Understanding the difference between single quotes (`'`) and double quotes (`"`) is one of the most crucial skills for writing robust scripts.

### Double Quotes: "Weak" Quoting (Interpolation)

Double quotes (`"..."`) are used to group multiple words into a single string while still allowing the shell to interpret special characters. This is often called "weak quoting" or "interpolation."

When you wrap text in double quotes, Bash protects spaces from word splitting, but it **still evaluates** the following special characters:

* `$` (Parameter/Variable Expansion)
* `\` (Escape Character)
* `\`` (Backticks for Command Substitution, though`$()` is preferred)

```bash
user_name="Alice"
greeting="Hello, $user_name!"

echo $greeting
# Output: Hello, Alice!
```

Because double quotes allow variable expansion, they are the go-to choice when you need to construct strings dynamically.

**Best Practice:** Always wrap your variable expansions in double quotes (e.g., `echo "$file_name"`) unless you specifically want Bash to perform word splitting on the variable's contents. This prevents scripts from breaking when filenames or strings contain unexpected spaces.

### Single Quotes: 'Strong' Quoting (Literal)

Single quotes (`'...'`) are absolute. They represent "strong quoting." When you wrap text in single quotes, Bash treats **every single character literally**.

Variable expansion (`$`), command substitution, and even escape characters (`\`) are completely ignored. What you see is exactly what you get.

```bash
user_name="Alice"
literal_greeting='Hello, $user_name!'

echo $literal_greeting
# Output: Hello, $user_name!
```

Notice how `$user_name` was not evaluated; it was treated as a literal sequence of characters. Use single quotes when you want to protect your text from *any* interpretation by the shell, such as when writing regular expressions or passing exact JSON strings to a command.

### Quoting Comparison Matrix

To visualize how different characters are treated under various quoting conditions, refer to this behavior matrix:

| Character | Unquoted | Inside Double Quotes (`" "`) | Inside Single Quotes (`' '`) |
| :--- | :--- | :--- | :--- |
| **Spaces** | Splits words | **Preserved** | **Preserved** |
| `$` **(Variables)** | Expanded | **Expanded** | Literal `$` |
| `\` **(Escapes)** | Interpreted | **Interpreted** (for `$`, `"`, `\`, `` ` ``) | Literal `\` |
| `*` **(Wildcards)** | Expanded (Globbing)| Literal `*` | Literal `*` |
| `!` **(History)** | Interpreted | Interpreted (in interactive mode) | Literal `!` |

### Escaping Quotes

Sometimes, you need to include a quote character *inside* a string that is already quoted.

**Inside Double Quotes:** You can use the backslash (`\`) to escape a literal double quote or a literal dollar sign.

```bash
# Escaping double quotes inside double quotes
quote="She said, \"Bash is awesome!\" and I agreed."
echo "$quote"
# Output: She said, "Bash is awesome!" and I agreed.

# Escaping a dollar sign to print a price
price_msg="The cost is \$5.00"
echo "$price_msg"
# Output: The cost is $5.00
```

**Inside Single Quotes:** You **cannot** put a single quote inside single quotes, not even if you try to escape it with a backslash. Bash will simply terminate the quote early.

To include a single quote inside a single-quoted string, you must exit the single quote, insert an escaped literal single quote (`\'`), and re-open the single quote. Alternatively, you can mix quoting styles.

```bash
# Mixing quoting styles to safely echo a single quote:
# 1. Double quotes around the string holding the single quote
echo "It's a beautiful day." 

# 2. Concatenating right next to each other
echo 'It'\''s a beautiful day.'
```

### Advanced: ANSI-C Quoting (`$'...'`)

Bash offers a third, specialized quoting mechanism using a dollar sign immediately followed by single quotes (`$'...'`). This is known as ANSI-C quoting.

Unlike standard single quotes, ANSI-C quoting replaces backslash-escaped characters with their actual control codes according to the ANSI C standard. This is incredibly useful for embedding real newlines (`\n`) or tabs (`\t`) directly into your variables.

```bash
# Using ANSI-C quoting to create a multi-line string
menu=$'Select an option:\n\t1) Start\n\t2) Stop\n\t3) Restart'

# We must double-quote the variable expansion so echo preserves the newlines
echo "$menu"
```

**Output:**

```text
Select an option:
 1) Start
 2) Stop
 3) Restart
```

## 7.3 Positional Parameters

When you write a Bash script, you rarely want it to do the exact same thing every time it runs. You usually want to pass it input—like a filename to process, a username to query, or a flag to change its behavior. Bash handles this input using **positional parameters**.

Positional parameters are special, built-in variables that hold the arguments passed to your script (or to a function) from the command line. They are automatically numbered based on their position.

### The Numbered Variables: `$0` through `$9`

When a script is executed, Bash automatically assigns the command-line arguments to the variables `$1`, `$2`, `$3`, and so on. The variable `$0` is reserved for the name of the script itself as it was invoked.

Here is a visual breakdown of how a command line is mapped to positional parameters:

```text
Command Execution:  ./backup.sh  /var/log  /etc/nginx  --verbose
                        │           │          │           │
Positional Param:       $0          $1         $2          $3
```

Let's look at a practical example. Imagine a script named `greet.sh`:

```bash
#!/bin/bash
# greet.sh

echo "Executing script: $0"
echo "Hello, $1! Welcome to $2."
```

If you run this script and pass it two arguments, Bash maps them to `$1` and `$2` respectively:

```bash
$ ./greet.sh Alice "the matrix"
Executing script: ./greet.sh
Hello, Alice! Welcome to the matrix.
```

**A crucial tie-in to Section 7.2:** Notice how `"the matrix"` was wrapped in double quotes. Because Bash uses spaces to separate arguments, quoting "the matrix" ensures it is passed entirely as `$2`. If you had omitted the quotes (`./greet.sh Alice the matrix`), `$2` would be "the", and `$3` would be "matrix".

### Double-Digit Parameters: The Curly Brace Rule

What happens if your script takes more than nine arguments? You might logically assume the tenth argument is `$10`. However, due to how Bash parses variables, typing `$10` tells the shell to fetch the value of `$1` and append a literal `0` to the end of it.

To access parameters from 10 and beyond, you must apply the curly brace syntax we discussed in Section 7.1 to clearly define the variable name:

```bash
# Incorrect way to access the 10th argument
echo "The tenth argument is: $10"  # Prints $1 followed by '0'

# Correct way to access the 10th argument
echo "The tenth argument is: ${10}"
```

### Shifting Arguments

Sometimes you don't know exactly how many arguments will be passed to your script, or you want to process them one by one without writing out `$1`, `$2`, `$3` indefinitely.

Bash provides the `shift` built-in command for this scenario. When you call `shift`, Bash discards `$1`, and shifts all the remaining positional parameters one position to the left.

* `$2` becomes `$1`
* `$3` becomes `$2`
* ...and so on.
* `$0` (the script name) remains unchanged.

Here is a conceptual mapping of the `shift` operation:

```text
Before shift:
$1="apple"   $2="banana"   $3="cherry"

(shift is executed)

After shift:
$1="banana"  $2="cherry"   $3=""
```

You can also pass a number to `shift` to move parameters multiple spots at once (e.g., `shift 2` discards `$1` and `$2`, making `$3` the new `$1`). This command is incredibly powerful when paired with loops to parse an arbitrary number of command-line options, a technique we will explore deeply in the looping and system interaction chapters.

## 7.4 Special Parameters

Beyond the positional parameters (`$1`, `$2`, etc.) used to capture user input, Bash automatically populates a set of **special parameters**. These built-in variables hold metadata about your script's execution state, the shell environment, and the arguments themselves. You cannot assign values to these parameters; they are strictly read-only.

Here are the most critical special parameters every Bash developer must know.

### Counting Arguments with `$#`

When writing robust scripts, you often need to verify that the user provided the correct number of arguments before proceeding. The `$#` parameter holds the total count of positional parameters passed to the script or function.

```bash
#!/bin/bash
# backup.sh

echo "You provided $# arguments."

# If the user runs: ./backup.sh /var/log /etc
# The output will be: You provided 2 arguments.
```

*Note: `$#` only counts `$1` and beyond. It does not include `$0` (the script name).*

### All Arguments: `$@` vs. `$*`

If you want to reference *all* the positional parameters at once (for example, to pass them wholesale to another command or loop through them), Bash provides two special parameters: `$@` and `$*`.

When unquoted, `$@` and `$*` do the exact same thing: they expand to a list of all arguments separated by spaces. However, their behavior diverges drastically when you apply the double-quoting rules we learned in Section 7.2.

This is one of the most common stumbling blocks in Bash scripting:

* `"$*"` **(The Single String):** Treats all arguments as a single, contiguous string. The arguments are separated by the first character of the `IFS` (Internal Field Separator) variable, which is usually a space.
* `"$@"` **(The Independent Strings):** Treats each argument as a separate, individually quoted string. **This is almost always what you want.**

#### Visualizing the Difference

Imagine you run a script with three arguments: `./script.sh apple "red apple" banana`

```text
Input Arguments:
$1 = apple
$2 = red apple  <-- (Passed as one argument due to quotes)
$3 = banana

How they expand inside double quotes:

"$*"  EXPANDS TO -->  "apple red apple banana" 
                      (1 single string. The boundary of $2 is lost!)

"$@"  EXPANDS TO -->  "apple" "red apple" "banana" 
                      (3 distinct strings. The boundary of $2 is preserved!)
```

**Best Practice:** When passing all arguments to another command or iterating over them in a `for` loop (Chapter 9), always use `"$@"`. It ensures that arguments containing spaces remain properly grouped.

### The Exit Status: `$?`

Every command executed in Linux returns an invisible integer to the shell when it finishes, known as the **exit status** or return code.

* An exit status of `0` means **success**.
* An exit status between `1` and `255` means **failure** (the specific number often indicates the type of error).

The `$?` parameter holds the exit status of the *most recently executed pipeline or command*.

```bash
# A successful command
ls /etc/passwd > /dev/null
echo "The exit status was: $?"  # Output: 0

# A failing command (listing a non-existent file)
ls /does/not/exist > /dev/null 2>&1
echo "The exit status was: $?"  # Output: 2 (or another non-zero error code)
```

You will rely heavily on `$?` when we reach Chapter 8 (Conditional Statements) to dictate how your script reacts to successes and failures.

### Process Identifiers: `$$` and `$!`

When your script runs, the operating system assigns it a unique Process ID (PID). Bash exposes PIDs through two special parameters, which are invaluable for process management and generating temporary files.

* `$$`: The PID of the current shell or script.
  * *Use case:* Appending `$$` to a filename is a quick, old-school way to create unique temporary files (e.g., `/tmp/my_temp_data.$$`). Though, as we'll see in Chapter 20, `mktemp` is the modern, secure standard.
* `$!`: The PID of the last command executed in the background.
  * *Use case:* If you start a long-running process in the background using an ampersand (`&`), you can capture its PID using `$!` so you can check on it or kill it later.

```bash
echo "This script is running with PID: $$"

# Start a background task (sleep for 60 seconds)
sleep 60 &

echo "The background sleep command has PID: $!"
```

## 7.5 Command Substitution

Up to this point, we have assigned static strings and captured command-line arguments using variables. However, the true power of Bash scripting lies in its ability to glue different programs together. **Command substitution** allows you to execute a command, capture its standard output (stdout), and seamlessly substitute that output into a variable assignment or another command.

### The Modern Syntax: `$(command)`

To perform command substitution, wrap the command you want to execute inside `$()`. Bash will run the enclosed command in a subshell, capture what it prints to the screen, and replace the `$()` expression with that text.

```bash
# Capture the current date and time
current_date=$(date)

# Capture the hostname of the machine
system_name=$(hostname)

echo "Backup started on $system_name at $current_date"
```

Here is a conceptual diagram of how Bash processes command substitution:

```text
Outer Command:    echo "I am logged in as $(whoami)."
                                             │
Step 1 (Execute):                            └───> whoami runs and outputs "alice"
                                                         │
Step 2 (Substitute):                                     │
                  echo "I am logged in as alice." <──────┘
                               │
Step 3 (Execute):              └───> Prints the final string to the terminal.
```

### The Legacy Syntax: Backticks `` `command` ``

You will frequently encounter an older syntax in legacy scripts: wrapping the command in backticks (`` ` ``).

```bash
# Legacy backtick syntax (Deprecated)
current_date=`date`
```

While backticks still work perfectly fine in modern Bash, **you should always use `$()` in your own scripts.** The POSIX-compliant `$()` syntax is heavily preferred for two major reasons: readability and nestability.

Look at how difficult it becomes to nest commands (running a command substitution inside another command substitution) using backticks, because the inner backticks must be escaped with backslashes:

```bash
# Hard to read and prone to errors (Legacy)
tar -czf backup.tar.gz `ls -d \`find /var/log -type d\``

# Clean and visually distinct (Modern)
tar -czf backup.tar.gz $(ls -d $(find /var/log -type d))
```

### Command Substitution and Quoting Rules

Section 7.2 emphasized the difference between weak quoting (`" "`) and strong quoting (`' '`). Command substitution behaves exactly like variable expansion when it comes to quotes.

If you wrap `$()` in **single quotes**, Bash will not execute the command. It will treat it as literal text.

```bash
# Double quotes: Evaluates the command
echo "The date is $(date +%F)"  # Output: The date is 2026-05-04

# Single quotes: Blocks evaluation
echo 'The date is $(date +%F)'  # Output: The date is $(date +%F)
```

#### The Word Splitting Trap

There is a critical caveat to command substitution: **Bash automatically strips trailing newlines from the captured output.** Furthermore, if you do not wrap the substitution in double quotes, Bash will apply word splitting to the results, converting all internal newlines and tabs into standard spaces.

Consider a command that outputs a multi-line list, such as `ls -l`.

```bash
# Capture the directory listing
dir_contents=$(ls -l)

# 1. Unquoted: Bash splits the words and collapses newlines into spaces
echo $dir_contents 
# Output: total 8 -rw-r--r-- 1 alice users 12 May 4 file1.txt -rw-r--r-- 1 alice users 45 May 4 file2.txt

# 2. Quoted: Bash preserves the internal newlines
echo "$dir_contents"
# Output: 
# total 8
# -rw-r--r-- 1 alice users 12 May 4 file1.txt
# -rw-r--r-- 1 alice users 45 May 4 file2.txt
```

**Best Practice:** Just like with standard variables, always wrap your command substitutions in double quotes—e.g., `"$()"`—unless you specifically need Bash to break the output into an array of separate words for a `for` loop.
