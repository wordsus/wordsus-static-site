In programming, the DRY (Don't Repeat Yourself) principle is fundamental. Until now, our scripts have executed sequentially, branching only with `if` statements. But what if you need to rename fifty files, ping a dozen servers, or process a log file line by line?

Loops solve this by executing a block of code repeatedly based on a list of items or a logical condition. In this chapter, we will explore Bash's core looping mechanisms: `for`, `while`, and `until`. You will learn how to iterate through data efficiently, manage continuous processes, and control your execution flow dynamically using the `break` and `continue` statements.

## 9.1 The `for` Loop: Iterating over Lists

In many programming languages, a `for` loop is primarily used to increment a numeric counter. While Bash supports that style (as we will see in Section 9.2), its native and most common `for` loop behaves more like a "for-each" loop. It is designed to iterate through a predefined list of items, executing a block of commands once for every item in that list.

### Anatomy of a `for` Loop

The syntax of a standard Bash `for` loop relies on the `for`, `in`, `do`, and `done` keywords:

```text
+---------------------------------------------------+
|  for VARIABLE in LIST_OF_ITEMS                    |
|  do                                               |
|      # Commands to execute for each item          |
|      command1 "$VARIABLE"                         |
|      command2                                     |
|  done                                             |
+---------------------------------------------------+

```

1. **`VARIABLE`**: A temporary variable name you choose. During each iteration, the loop assigns the next item from the list to this variable.
2. **`LIST_OF_ITEMS`**: A space-separated series of words, numbers, file paths, or command outputs.
3. **`do`** and **`done`**: These keywords enclose the body of the loop, marking where the repeatable commands begin and end.

*Note: You can also write the loop on a single line by using semicolons to separate the statements: `for var in item1 item2; do command "$var"; done*`

### Iterating over Hardcoded Lists

The simplest way to use a `for` loop is by providing an explicit, space-separated list of strings.

```bash
#!/bin/bash

for server in web-01 web-02 db-master cache-01
do
    echo "Pinging $server..."
    # In a real script, you might use: ping -c 1 "$server"
done

```

In this example, the loop runs four times. On the first pass, `$server` holds the value `web-01`. On the second pass, it holds `web-02`, and so forth.

### Generating Lists with Brace Expansion

Typing out long sequences is tedious. You can use Bash's **brace expansion** feature to generate lists of numbers or letters on the fly.

```bash
#!/bin/bash

# Iterating over a number sequence
for count in {1..5}
do
    echo "Countdown: $count"
done

# Iterating over a letter sequence
for letter in {A..C}
do
    echo "Letter: $letter"
done

```

You can even specify a step value in your sequence using the `{start..end..step}` syntax. For example, `{0..10..2}` will generate `0 2 4 6 8 10`.

### Iterating over Files (Globbing)

One of the most practical applications of the Bash `for` loop is iterating over files and directories. Instead of parsing the output of the `ls` command (which is generally considered a bad practice due to how spaces in filenames are handled), you should rely on shell **globbing** (wildcards).

```bash
#!/bin/bash

# Loop through all .log files in the current directory
for logfile in *.log
do
    echo "Archiving $logfile..."
    # As discussed in Chapter 7, always quote your variables!
    # gzip "$logfile"
done

```

If the directory contains `app.log`, `system.log`, and `auth.log`, the shell expands `*.log` into a list of those three files before the loop even begins. Because globbing handles word-splitting natively, this method correctly processes filenames that contain spaces.

### Iterating over Command Substitution

Recalling Section 7.5, you can use command substitution `$(...)` to dynamically generate a list of items for your loop based on the output of another command.

```bash
#!/bin/bash

# Find all stopped Docker containers and loop through their IDs
for container_id in $(docker ps -q -f status=exited)
do
    echo "Removing stopped container: $container_id"
    # docker rm "$container_id"
done

```

**A Word of Caution:** When iterating over command substitution, Bash relies on the Internal Field Separator (`IFS`) to determine where one item ends and the next begins. By default, `IFS` includes spaces, tabs, and newlines. If a line of output contains a space (e.g., a file named `my report.txt`), the `for` loop will treat "my" and "report.txt" as two separate items. For processing line-by-line data that may contain spaces, the `while` loop combined with `read` (covered in upcoming sections) is the safer choice.

## 9.2 C-Style `for` Loops

While the list-based `for` loop covered in the previous section is idiomatic to Bash and excellent for iterating over files or strings, there are times when you need strict mathematical control over your iterations. If you have a background in C, Java, C++, or JavaScript, Bash provides an alternative looping construct that will look instantly familiar: the C-style `for` loop.

This loop relies on Bash's arithmetic evaluation context—denoted by double parentheses `(( ))`—to initialize a variable, test a condition, and update the variable on each pass.

### Anatomy of a C-Style `for` Loop

The syntax uses three distinct expressions separated by semicolons, entirely enclosed within `(( ))`:

```text
+---------------------------------------------------------------+
|  for (( INITIALIZATION; CONDITION; STEP ))                    |
|  do                                                           |
|      # Commands to execute while CONDITION evaluates to true  |
|      command1                                                 |
|  done                                                         |
+---------------------------------------------------------------+

```

1. **`INITIALIZATION`**: Executed exactly once before the loop starts. Used to define and set the starting value of the counter variable (e.g., `i = 0`).
2. **`CONDITION`**: Evaluated before *every* iteration. If it evaluates to true (non-zero), the loop body executes. If false (zero), the loop terminates.
3. **`STEP`**: Executed at the end of every iteration, right before the condition is evaluated again. Used to increment or decrement the counter (e.g., `i++` or `i--`).

*Note: Because the expressions inside `(( ))` are evaluated as arithmetic operations, you do not need to prefix variables with a `$` sign inside the parentheses.*

### A Basic Counter

Here is the most common implementation, counting from 1 to 5:

```bash
#!/bin/bash

for (( i = 1; i <= 5; i++ ))
do
    echo "Iteration number: $i"
done

```

In this example:

* `i = 1` initializes the counter.
* `i <= 5` ensures the loop runs as long as `i` is less than or equal to 5.
* `i++` increments the counter by 1 after each pass.

### Dynamic Limits and Complex Steps

Where the C-style `for` loop truly outshines brace expansion (`{1..5}`) is in its ability to handle dynamic variables for its limits and complex mathematical steps. Brace expansion happens strictly before variable expansion in Bash, meaning `for i in {1..$MAX}` will not work as intended. The C-style loop solves this flawlessly.

```bash
#!/bin/bash

read -p "Enter a maximum limit: " max_limit
read -p "Enter the step size: " step_size

# Counting backwards from max_limit down to 0, decreasing by step_size
for (( count = max_limit; count >= 0; count -= step_size ))
do
    echo "Current count: $count"
done

```

If the user enters `10` for the limit and `3` for the step size, the script will output `10`, `7`, `4`, and `1`.

### Multiple Variables

Because the `(( ))` context supports comma-separated arithmetic expressions, you can actually initialize and step multiple variables simultaneously within the same loop statement. While less common, this is powerful for algorithms that require tracking two bounds at once.

```bash
#!/bin/bash

# Two variables: 'i' counts up, 'j' counts down
for (( i = 1, j = 10; i <= 5; i++, j -= 2 ))
do
    echo "Up: $i | Down: $j"
done

```

**Output:**

```text
Up: 1 | Down: 10
Up: 2 | Down: 8
Up: 3 | Down: 6
Up: 4 | Down: 4
Up: 5 | Down: 2

```

### When to Use Which Loop?

* **Use the `in` list loop (Section 9.1):** When iterating over files, directories, array elements, or explicitly defined strings.
* **Use the C-style loop (Section 9.2):** When you need to loop a specific, dynamic number of times based on variable input, or when you are implementing mathematical algorithms that require custom step sizes or multiple counters.

## 9.3 The `while` Loop

In previous sections, we explored `for` loops, which are ideal when you know exactly how many times you need to iterate or when you have a definitive list of items to process. But what if you need a loop to run an indeterminate number of times, stopping only when a specific condition changes? This is where the `while` loop comes in.

A `while` loop executes a block of code continuously **as long as** a given command or condition evaluates to true (an exit status of `0`).

### Anatomy of a `while` Loop

The structure is straightforward, utilizing the `while`, `do`, and `done` keywords:

```text
+---------------------------------------------------+
|  while COMMAND_OR_CONDITION                       |
|  do                                               |
|      # Commands to execute continuously           |
|      # as long as the condition remains TRUE      |
|  done                                             |
+---------------------------------------------------+

```

Most commonly, the condition is a test expression enclosed in `[ ]` or `[[ ]]`, which we covered in Chapter 8. However, it is crucial to remember that `while` evaluates the exit status of *any* command you put next to it.

### Condition-Based Looping

A classic use case for a `while` loop is waiting for a system state to change, such as waiting for a file to be created by another process before proceeding.

```bash
#!/bin/bash

FILE="/tmp/ready.flag"

echo "Waiting for $FILE to be created..."

# Loop as long as the file does NOT exist
while [ ! -f "$FILE" ]
do
    echo "Still waiting..."
    sleep 5  # Pause for 5 seconds to avoid overloading the CPU
done

echo "The file exists! Proceeding with the script."

```

In this script, the `test` command `[ ! -f "$FILE" ]` is evaluated every 5 seconds. As long as the file is missing, the condition is true, and the loop continues. Once the file is created, the condition becomes false, and the loop terminates.

### Processing Input Line-by-Line

Perhaps the most idiomatic and powerful use of the `while` loop in Bash is reading text data line-by-line. In Section 9.1, we warned against using a `for` loop to process the output of commands or files that contain spaces. The safe, reliable alternative is piping or redirecting text into a `while` loop using the `read` command.

```bash
#!/bin/bash

# Reading a file line-by-line via input redirection
while IFS= read -r line
do
    echo "Processing line: $line"
done < "server_list.txt"

```

Let's break down this standard idiom:

1. **`read -r line`**: The `read` command reads a single line of input and assigns it to the variable `line`. The `-r` flag prevents backslashes (`\`) from being interpreted as escape characters, preserving the raw text.
2. **`IFS=`**: Temporarily clearing the Internal Field Separator for the `read` command ensures that leading and trailing whitespace on the line is not trimmed off.
3. **`< "server_list.txt"`**: We redirect the file directly into the `done` statement of the loop.

Because `read` returns a successful exit status (`0`) as long as it successfully reads a line, the loop continues. When it hits the end of the file (EOF), `read` fails (returns non-zero), and the loop cleanly exits.

### The Infinite Loop

Sometimes, you want a script to run indefinitely—for example, a custom background service or a script that continuously monitors system resources. You can create an infinite loop using the `true` command, which always returns an exit status of `0`.

```bash
#!/bin/bash

while true
do
    echo "Checking system memory... (Press Ctrl+C to stop)"
    free -m
    sleep 60
done

```

The colon `:` is a shell built-in that also evaluates to true, so you will often see infinite loops written as `while :`. Both `while true` and `while :` function exactly the same way. We will discuss how to programmatically break out of these infinite loops in Section 9.5.

## 9.4 The `until` Loop

If you understand the `while` loop from the previous section, the `until` loop is simply its logical mirror. Where a `while` loop executes a block of code continuously *as long as* a condition is true (an exit status of `0`), an `until` loop executes continuously *as long as* a condition is false (a non-zero exit status).

The loop only terminates when the command or condition finally evaluates to true.

### Anatomy of an `until` Loop

The syntax uses the `until`, `do`, and `done` keywords:

```text
+---------------------------------------------------+
|  until COMMAND_OR_CONDITION                       |
|  do                                               |
|      # Commands to execute continuously           |
|      # as long as the condition remains FALSE     |
|  done                                             |
+---------------------------------------------------+

```

Anything you can write with an `until` loop can be written with a `while` loop by negating the condition (using `!`). However, `until` is provided to make your scripts more natural and readable when waiting for a specific state to be achieved.

### Waiting for a Command to Succeed

The most idiomatic use case for an `until` loop in Bash is waiting for a service to become available, a network host to come online, or a background process to finish initializing.

In this scenario, you want to keep trying a command *until* it succeeds.

```bash
#!/bin/bash

TARGET_IP="10.0.0.5"

echo "Waiting for $TARGET_IP to become reachable..."

# The loop runs continuously as long as 'ping' FAILS.
# We discard the standard output and error using &> /dev/null
until ping -c 1 -W 1 "$TARGET_IP" &> /dev/null
do
    echo "Host is unreachable. Retrying in 2 seconds..."
    sleep 2
done

echo "Host $TARGET_IP is up! Proceeding with the script."

```

In this example, if the server is offline, the `ping` command fails (returns a non-zero exit status). Because the condition is false, the `until` loop executes the `do` block, sleeping for two seconds. The exact moment `ping` succeeds (returns `0`), the loop stops, and the script moves on.

### Validating User Input

Another excellent use case for the `until` loop is prompting a user for input and trapping them in a loop until they provide a valid response.

```bash
#!/bin/bash

# Initialize an empty variable
user_input=""

# Loop until the input is exactly "yes" or "no"
until [[ "$user_input" == "yes" || "$user_input" == "no" ]]
do
    read -p "Do you want to continue? (yes/no): " user_input
    
    # Convert input to lowercase to handle "Yes", "YES", etc.
    user_input="${user_input,,}"
    
    if [[ "$user_input" != "yes" && "$user_input" != "no" ]]; then
        echo "Invalid input. Please type 'yes' or 'no'."
    fi
done

echo "You chose: $user_input. Proceeding..."

```

Here, the condition checks if `$user_input` is either "yes" or "no". Because the variable starts empty, the condition is initially false, forcing the script into the loop. It will continue to prompt the user *until* the condition evaluates to true.

### `while` vs. `until`: Which to Choose?

Choosing between `while` and `until` comes down entirely to readability. Ask yourself how the logic sounds when spoken aloud:

* **Use `while**` when the phrasing is "keep doing this *while* everything is okay." (e.g., while reading a file, while a service is running).
* **Use `until**` when the phrasing is "keep trying this *until* it finally works." (e.g., until a file is deleted, until a server responds, until a user provides correct input).

## 9.5 Loop Control: `break` and `continue`

While the conditions of `for`, `while`, and `until` loops dictate their general flow, real-world scripts often encounter exceptional situations inside the loop body. You might find the exact item you were searching for and no longer need to process the rest of the list, or you might encounter a corrupted line of data that should be skipped.

To handle these micro-interruptions without rewriting your entire loop logic, Bash provides two powerful built-in control statements: `break` and `continue`.

### The `break` Statement

The `break` command immediately terminates the execution of the loop it resides in. The script's execution jumps out of the loop entirely and resumes at the first command immediately following the `done` statement.

```text
+---------------------------------------------------+
|  for item in list                                 |
|  do                                               |
|      if [ condition_met ]; then                   |
|          break  --------+  # JUMPS OUT OF LOOP    |
|      fi                 |                         |
|      command2           |                         |
|  done                   |                         |
|  <----------------------+                         |
|  next_script_command                              |
+---------------------------------------------------+

```

**Example: Breaking an Infinite Loop**

In Section 9.3, we discussed infinite loops (`while true`). The `break` statement is the standard way to escape them gracefully once a desired state is reached.

```bash
#!/bin/bash

# A simple guessing game
secret_number=42

while true
do
    read -p "Guess the secret number: " guess
    
    if [[ "$guess" -eq "$secret_number" ]]; then
        echo "Correct! You found the secret."
        break  # Exits the infinite loop immediately
    fi
    
    echo "Incorrect. Try again."
done

echo "Game over. Thanks for playing!"

```

### The `continue` Statement

Unlike `break`, which destroys the loop, `continue` merely aborts the *current iteration*. When Bash encounters `continue`, it skips any remaining commands in the loop body and immediately jumps back to the top of the loop to evaluate the condition for the next pass.

```text
+-------------------------+
|  for item in list       | <----+
|  do                     |      |
|      if [ skip_item ]; then    |
|          continue  ------------+ # JUMPS TO NEXT ITERATION
|      fi                        |
|      process_item              |
|  done                          |
+--------------------------------+

```

**Example: Skipping Comments and Empty Lines**

A highly practical use of `continue` is parsing configuration files. If you want to process a file line-by-line but ignore lines that are empty or start with a `#` (comments), `continue` keeps your code clean and avoids deeply nested `if` statements.

```bash
#!/bin/bash

while IFS= read -r line
do
    # Skip empty lines
    if [[ -z "$line" ]]; then
        continue
    fi
    
    # Skip lines starting with #
    if [[ "$line" == \#* ]]; then
        continue
    fi
    
    echo "Processing configuration: $line"
    # Execute configuration logic here...
    
done < "app_config.ini"

```

### Advanced Control: Nested Loops

If you place a loop inside another loop (a "nested loop"), a standard `break` or `continue` will only affect the innermost loop where the command is executed.

Bash allows you to supply an optional numeric argument to both commands to specify how many levels of loops they should affect: `break [n]` and `continue [n]`.

```bash
#!/bin/bash

# Outer loop iterating through servers
for server in web-01 web-02 db-01
do
    echo "Connecting to $server..."
    
    # Inner loop checking multiple ports per server
    for port in 80 443 8080
    do
        if [[ "$server" == "db-01" && "$port" -eq 80 ]]; then
            echo "  Skipping HTTP check on Database server."
            # Skips the rest of the INNER loop, moving to port 443
            continue 
        fi
        
        if [[ "$server" == "web-02" ]]; then
            echo "  Fatal error on $server. Halting all checks!"
            # Breaks out of BOTH the inner and the outer loop
            break 2 
        fi
        
        echo "  Testing port $port on $server..."
    done
done

echo "Network scan complete."

```

* **`continue 1` (or just `continue`)**: Skips to the next iteration of the inner loop (the port list).
* **`continue 2`**: Skips the inner loop entirely and jumps to the next iteration of the outer loop (the next server).
* **`break 1` (or just `break`)**: Escapes the inner loop but stays in the outer loop, moving to the next server.
* **`break 2`**: Completely destroys both loops, jumping to the `echo "Network scan complete."` line.