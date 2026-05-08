Up to this point, our scripts have largely relied on positional parameters and basic standard output. However, robust bash scripting requires sophisticated data handling. In this chapter, we master the flow of information into and out of your scripts. You will learn to capture user input interactively with `read`, format terminal output precisely using `printf`, and manipulate data streams by creating custom file descriptors with `exec`. We will also explore Here Documents and Here Strings to elegantly feed text directly into commands. Mastering these tools bridges the gap between simple automation and professional, interactive command-line applications.

## 16.1 Reading User Input with `read`

While positional parameters (covered in Chapter 7) are excellent for passing data to a script at launch, interactive scripts require gathering information from the user while the script is actively running. The bash builtin command `read` is the primary tool for this job. It captures a single line of text from standard input (stdin) and assigns it to one or more variables.

### The Basics and the Golden Rule: Always use `-r`

The most basic form of the command is simply `read` followed by a variable name. However, the standard behavior of `read` is to interpret backslashes (`\`) as escape characters. In almost all scripting scenarios, you want to capture the user's input exactly as they typed it.

Therefore, **the golden rule of reading input is to always use the `-r` (raw) flag**.

```bash
echo "Please enter your name:"
read -r username
echo "Welcome to the system, $username!"

```

### Prompting the User (`-p`)

Instead of using an `echo` statement before the `read` command, you can use the `-p` option to specify a prompt string. This makes your code cleaner and keeps the user's cursor on the same line as the prompt.

```bash
read -r -p "Enter your target directory: " target_dir
echo "Backing up to $target_dir..."

```

### Reading Multiple Variables and Word Splitting

If you provide multiple variable names to `read`, it splits the input line into separate words based on the shell's Internal Field Separator (`IFS`), which defaults to spaces, tabs, and newlines.

The first word is assigned to the first variable, the second word to the second variable, and so on. If there are more words than variables, **all remaining words are packed into the final variable**.

```bash
read -r -p "Enter your first name, last name, and age: " first last age
echo "First: $first | Last: $last | Age/Extra: $age"

```

**Text Diagram: How `read` Distributes Input**

```text
User Input:   "Jane Doe 28 Software Engineer"
               |    |   |___________________|
               V    V             V
Variables:   first last          age

Resulting Values:
$first -> "Jane"
$last  -> "Doe"
$age   -> "28 Software Engineer"

```

If no variable names are supplied to `read`, bash automatically assigns the entire input string to the default built-in variable `$REPLY`.

### Reading into Arrays (`-a`)

Since you learned about arrays in Chapter 13, you can use the `-a` flag to instruct `read` to assign the word-split input into an indexed array instead of separate scalar variables.

```bash
read -r -a ip_addresses -p "Enter IP addresses separated by spaces: "
echo "You entered ${#ip_addresses[@]} addresses."
echo "The second IP is: ${ip_addresses[1]}"

```

### Securing Input (`-s`)

When asking for passwords, API keys, or other sensitive data, you do not want the user's keystrokes echoed to the terminal screen. The `-s` (silent) option suppresses this terminal output. It is highly recommended to combine this with `-p` so the user knows the script is waiting for input.

```bash
read -r -s -p "Enter database password: " db_pass
echo "" # Add a newline, as -s prevents the user's 'Enter' key from printing one
echo "Authenticating..."

```

*(Note: We will dive deeper into securely handling secrets in Chapter 20).*

### Restricting Input: Timeouts (`-t`) and Character Limits (`-n` / `-N`)

For automated scripts that might run unattended, indefinitely waiting for user input can block execution. The `-t` flag sets a timeout in seconds. If the user doesn't respond in time, `read` returns a non-zero exit status, which you can handle gracefully.

```bash
if read -r -t 5 -p "Continue with deployment? (y/n): " response; then
    echo "Proceeding with '$response'..."
else
    echo -e "\nTimeout reached. Aborting deployment."
    exit 1
fi

```

If you want to limit the amount of data a user can type, use `-n` followed by a number to specify a maximum character limit. The `read` command will automatically return as soon as that limit is hit, without waiting for the user to press Enter.

```bash
# Script pauses and waits for exactly 1 keystroke
read -r -n 1 -s -p "Press any key to continue..."

```

### The Idiomatic `while read` Loop

Because `read` pulls from standard input, its most powerful use case isn't just reading keyboard input, but processing files or streams line-by-line using redirection (Chapter 5) and loops (Chapter 9).

When looping over a file, you should clear the `IFS` variable specifically for the `read` command. If you don't, `read` will strip leading and trailing whitespace from each line.

```bash
# Correct way to process a file line-by-line
while IFS= read -r line; do
    echo "Processing: $line"
done < "server_list.txt"

```

**Anatomy of the `while read` construct:**

1. `while`: Begins the loop, running as long as the condition evaluates to true.
2. `IFS=`: Temporarily sets the Internal Field Separator to null for this single command execution, preserving leading/trailing indentation.
3. `read -r`: Reads the raw line safely.
4. `line`: The variable storing the current line.
5. `< "server_list.txt"`: Redirects the file contents into the standard input of the `while` loop block.

## 16.2 Formatting Output with `printf`

While the `echo` command (used extensively in previous chapters) is convenient for printing basic strings, it is notoriously inconsistent across different UNIX environments, particularly regarding how it handles flags like `-n` (no newline) and `-e` (enable escape sequences). When writing robust, professional Bash scripts, `printf` is the superior and more portable tool for generating output.

Derived from the C programming language, the `printf` (print formatted) command allows you to precisely control text alignment, numeric padding, and variable interpolation using a format string.

### The Anatomy of `printf`

The syntax for `printf` is different from `echo`. It requires a **format string** followed by a list of **arguments**:

```bash
printf format-string [arguments...]

```

Unlike `echo`, **`printf` does not automatically append a newline character (`\n`) to its output**. You must explicitly include it if you want the cursor to move to the next line.

```bash
# echo equivalent:
echo "Hello, World!"

# printf equivalent:
printf "Hello, World!\n"

```

### Format Specifiers

The power of `printf` comes from **format specifiers**—placeholders within the format string that dictate how the trailing arguments should be displayed.

* `%s`: String of characters
* `%d`: Decimal (integer) number
* `%f`: Floating-point number (Note: While Bash doesn't support native floating-point math as discussed in Chapter 15, `printf` *can* format floating-point strings)
* `%x`: Hexadecimal number

If you provide more arguments than format specifiers, `printf` will seamlessly loop through the format string until all arguments are consumed.

```bash
# Looping behavior
printf "User: %s (ID: %d)\n" "alice" 1001 "bob" 1002 "charlie" 1003

```

**Output:**

```text
User: alice (ID: 1001)
User: bob (ID: 1002)
User: charlie (ID: 1003)

```

### Width, Alignment, and Padding

`printf` excels at creating clean, tabular output. By adding numbers between the `%` and the specifier letter, you can dictate the width of the output field.

* **`%10s`**: Right-align the string within a 10-character field.
* **`%-10s`**: Left-align the string within a 10-character field (using the `-` flag).
* **`%05d`**: Pad an integer with leading zeros up to a 5-digit width.
* **`%.2f`**: Restrict a floating-point number to exactly two decimal places.

**Text Diagram: Field Widths and Alignment**

```text
Format string:  "| %-10s | %8d |"
Arguments:      "Apples"   42

Execution mapping:
      | %-10s | %8d |
          |        |
       "Apples"    42

Resulting Output:
| Apples     |       42 |
  \________/   \______/
  10 spaces    8 spaces
 (Left-aligned)(Right-aligned)

```

**Building a Report Table:**

Here is a practical example of generating a well-formatted table:

```bash
# Print the header
printf "%-15s | %-10s | %s\n" "SERVICE" "STATUS" "PORT"
printf "----------------|------------|------\n"

# Print the rows
printf "%-15s | %-10s | %04d\n" "Nginx" "Active" 80
printf "%-15s | %-10s | %04d\n" "PostgreSQL" "Active" 5432
printf "%-15s | %-10s | %04d\n" "Redis" "Stopped" 6379

```

**Output:**

```text
SERVICE         | STATUS     | PORT
----------------|------------|------
Nginx           | Active     | 0080
PostgreSQL      | Active     | 5432
Redis           | Stopped    | 6379

```

### Assigning Formatted Output to Variables (`-v`)

Sometimes you need to format a string, but instead of printing it to the screen, you want to save it to a variable for later use.

While you could use command substitution (e.g., `my_var=$(printf "%03d" 5)`), this spawns a subshell, which is slightly inefficient. Bash 3.1 introduced the `-v` option to `printf`, allowing you to assign the formatted string directly to a variable.

```bash
# Zero-padding a log file sequence number without a subshell
log_sequence=42
printf -v log_filename "backup_run_%04d.log" "$log_sequence"

echo "Writing to: $log_filename"
# Output: Writing to: backup_run_0042.log

```

Using `printf -v` is the most performant way to assemble complex, tightly formatted strings within a script.

## 16.3 Custom File Descriptors using `exec`

As covered in Chapter 5, every bash script automatically opens three standard file descriptors (FDs) upon execution: Standard Input (`0`), Standard Output (`1`), and Standard Error (`2`). While these are sufficient for basic scripts, complex automation often requires handling multiple input and output streams simultaneously. Bash allows you to create custom file descriptors (typically numbered 3 through 9) to manage these additional data streams.

To create and manage these custom file descriptors within a script, we use the built-in `exec` command.

### The Dual Nature of `exec`

You might encounter `exec` used to completely replace the current shell process with a new command (e.g., `exec python3 script.py`). However, when `exec` is used *without* a command and only with redirection operators, it does not replace the shell. Instead, it permanently alters the file descriptors for the current shell environment or script.

### Opening Custom File Descriptors

You assign a custom file descriptor by pointing a number (3 or higher) to a file using standard redirection operators.

* **For Reading (`<`):** `exec 3< input.txt`
* **For Writing (`>`):** `exec 4> output.log`
* **For Appending (`>>`):** `exec 5>> append.log`
* **For Reading and Writing (`<>`):** `exec 6<> data.txt`

**Text Diagram: The Script's File Descriptor Table**

```text
FD | Stream         | Target / Destination
--------------------------------------------------
 0 | stdin          | Keyboard / Terminal
 1 | stdout         | Terminal Display
 2 | stderr         | Terminal Display
 3 | Custom (Read)  | ---> input.txt (disk)
 4 | Custom (Write) | <--- output.log (disk)

```

### Writing to and Reading from Custom FDs

Once a file descriptor is open, you can redirect data to or from it using the `&` symbol followed by the FD number. The ampersand tells bash that the number is a file descriptor, not a file named "3" or "4".

**Writing to an FD:**

```bash
# Open FD 4 for writing
exec 4> report.txt

# Write to FD 4
echo "System Update Starting..." >&4
printf "Processing module %d\n" 1 >&4

# Write to standard output (Terminal)
echo "This prints to the screen, not the file."

```

**Reading from an FD:**

```bash
# Open FD 3 for reading
exec 3< data_list.txt

# Read the first line from FD 3 using the -u (unit) flag of read
read -r -u 3 first_line
echo "First line is: $first_line"

```

### Closing File Descriptors

File descriptors consume system memory. It is a critical best practice to close them once you are finished using them to prevent resource leaks. You close an FD by redirecting it to `-`.

```bash
# Close FD 3 (Read)
exec 3<&-

# Close FD 4 (Write)
exec 4>&-

```

### Practical Use Case: Bypassing Standard Input Conflicts

The most common reason to use a custom file descriptor is when you need a `while read` loop to process a file, but a command *inside* that loop also needs to interact with Standard Input (like asking for user confirmation or calling an external tool like `ssh` that consumes stdin).

If you redirect the file into the `while` loop conventionally, the inner command will swallow the lines of your file instead of user input.

**The Problem:**

```bash
# BAD: 'ssh' will consume the remaining lines of server_list.txt!
while read -r server; do
    echo "Connecting to $server..."
    ssh user@"$server" "uptime" 
done < server_list.txt

```

**The Solution with Custom FDs:**
By assigning the file to FD 3, we leave Standard Input (`0`) completely untouched and available for commands like `ssh` or user prompts.

```bash
# 1. Open server_list.txt on FD 3
exec 3< server_list.txt

# 2. Loop through FD 3 specifically using read -u 3
while IFS= read -r -u 3 server; do
    echo "Connecting to $server..."
    
    # Standard Input (FD 0) remains untouched, so ssh behaves normally
    ssh user@"$server" "uptime"
    
    # We can even ask for user input safely inside the loop!
    read -r -p "Continue to next server? (y/n) " choice
    if [[ $choice != "y" ]]; then
        break
    fi
done

# 3. Clean up and close FD 3
exec 3<&-

```

Using `exec` to manage file descriptors elevates a script from a simple series of commands to a robust program capable of safely managing multiple complex data streams at once.

## 16.4 Here Documents

In earlier chapters, you learned how to redirect the contents of a file into a command using the `<` operator, or pass a single string using `echo` and a pipe. But what if you want to feed a multi-line block of text directly into a command from within your script, without creating a separate external file?

This is where the **Here Document** (often abbreviated as "Heredoc") comes in. A Here Document is a special-purpose code block that treats a multi-line string as if it were an independent file being read by a command.

### The Syntax of a Heredoc

The syntax utilizes the `<<` operator followed by a **limit string** (also known as a delimiter token). This token marks the beginning of the text block. The shell will then read all subsequent lines until it encounters that exact same limit string on a line by itself.

**Text Diagram: Heredoc Structure**

```text
command << LIMIT_STRING
Line 1 of input
Line 2 of input
Line 3 of input
LIMIT_STRING

```

*Note: While `EOF` (End Of File) is the most traditional and widely used limit string, you can use any word you like, such as `END`, `TEXT`, or `SQL_QUERY`. The only requirement is that the closing token must be on its own line, with no leading or trailing spaces.*

### Basic Usage

The most common use case for a heredoc is passing a multi-line message to a command like `cat` to display it to the user or redirect it into a new file.

```bash
# Displaying a multi-line menu
cat << EOF
================================
      SYSTEM BACKUP MENU
================================
1. Backup Home Directory
2. Backup Database
3. Exit
================================
EOF

```

### Variable and Command Expansion

By default, the text inside a Here Document behaves similarly to text enclosed in double quotes (`"`). The shell will evaluate variables and execute command substitutions before passing the final text block to the command.

```bash
system_os="Ubuntu 22.04"

cat << REPORT
System Report generated on: $(date +%F)
Running operating system: $system_os
Logged in as: $USER
REPORT

```

**Output:**

```text
System Report generated on: 2026-05-05
Running operating system: Ubuntu 22.04
Logged in as: root

```

### Disabling Expansion (Literal Heredocs)

There are many scenarios—such as generating a new shell script from within your current script—where you want to output exact characters like `$var` without the current shell interpreting them.

To disable all variable, command, and arithmetic expansions inside a Heredoc, you simply **quote the limit string** in the opening line. You can use single quotes (`'EOF'`), double quotes (`"EOF"`), or escape it with a backslash (`\EOF`).

```bash
# Generating a script file using a literal heredoc
cat << 'EOF' > generate_report.sh
#!/bin/bash
echo "The current user is $USER"
echo "This variable will NOT be expanded by the parent script."
EOF

```

### Indentation and the `<<-` Operator

A major annoyance with standard Heredocs is that they break the visual indentation of your script. If you are writing a script with a loop or a function, you naturally indent your code. But if you indent the Heredoc block and its closing token, Bash will interpret those indentations as part of the string, and the closing token won't be recognized (because it's preceded by spaces).

To solve this, Bash provides the `<<-` operator. This operator **strips all leading tab characters** from the input lines and the line containing the closing delimiter.

```bash
if [[ -f "/etc/nginx/nginx.conf" ]]; then
	# Notice the dash in <<- and the indented EOF
	cat <<- EOF
	Configuration found!
	Please review the settings before restarting the service.
	EOF
fi

```

**⚠️ Critical Pitfall:** The `<<-` operator *only* strips literal Tab characters (`\t`), not spaces. If your code editor is configured to convert tabs to spaces (a common default in modern IDEs), the `<<-` operator will fail, and your script will throw a syntax error.

### Feeding Interactive Programs

Heredocs are not just for `cat`. They are incredibly powerful for automating interactive, command-line interfaces that normally expect a user to type commands sequentially, such as `ftp`, `mysql`, `python`, or `fdisk`.

```bash
# Executing Python code directly from a Bash script
python3 << 'END_PYTHON'
import json
data = {"status": "success", "code": 200}
print(json.dumps(data, indent=2))
END_PYTHON

```

```bash
# Automating a database query
mysql -u dbadmin -p"secret_password" << SQL_QUERY
USE production_db;
SELECT COUNT(*) FROM users WHERE status = 'active';
EXIT;
SQL_QUERY

```

By leveraging Here Documents, you can neatly encapsulate complex configurations and data payloads directly within the logical flow of your Bash scripts.

## 16.5 Here Strings

While Here Documents (covered in section 16.4) are fantastic for passing large, multi-line blocks of text to a command, they are unnecessarily verbose if you only need to pass a single line or a short variable. For these simpler scenarios, Bash provides a streamlined cousin: the **Here String**.

A Here String allows you to pass a string directly into the standard input of a command using the `<<<` operator.

### Basic Syntax

The syntax consists of the command, followed by the `<<<` operator, and then the string (or variable containing the string) you want to pass.

```bash
command <<< "Your string here"

```

Just like Here Documents and double quotes, Here Strings automatically expand variables and execute command substitutions before passing the data.

```bash
username="admin"
# Passing an expanded variable directly to grep via stdin
grep "admin" <<< "The current user is $username"

```

### The Subshell Trap: Why Here Strings Beat Pipes

At first glance, a Here String might seem redundant. You already know from Chapter 5 that you can pipe the output of `echo` into a command. Why learn a new operator?

```bash
# Using a pipe
echo "apple banana cherry" | wc -w

# Using a Here String
wc -w <<< "apple banana cherry"

```

Both yield the exact same result. However, there is a massive architectural difference between the two in Bash: **Pipes create subshells.**

When you use a pipe (`|`), Bash spawns a child process (subshell) to execute the command on the receiving end. If that command sets or modifies variables, those changes will vanish the moment the pipeline finishes, because a child process cannot alter the environment of its parent script.

This "subshell trap" frequently frustrates developers when using the `read` command.

**The Failing Pipe Approach:**

```bash
# Attempting to split a string into variables using a pipe
echo "John Doe" | read -r first last

# This will print nothing! The variables were set inside a subshell and immediately destroyed.
echo "First: $first, Last: $last" 

```

**The Successful Here String Approach:**
Because the `<<<` operator relies on redirection rather than pipelines, it does **not** spawn a subshell. The command runs in the current shell environment, allowing variables to persist.

```bash
# Correctly parsing a string using a Here String
read -r first last <<< "John Doe"

# This works perfectly
echo "First: $first, Last: $last"
# Output: First: John, Last: Doe

```

**Text Diagram: Pipes vs. Here Strings with `read**`

```text
❌ The Pipe Pipeline (Subshell execution):
"John Doe" -> [echo] ===(Pipe)==> (Subshell)[read first last] -> X (Variables Destroyed)
                                      ^
                               Current Shell cannot access these

✅ The Here String Redirection (Current shell execution):
"John Doe" ===(Stdin)==> [read first last] -> (Variables Saved in Current Shell)

```

### Practical Use Cases

Here Strings are incredibly useful for interacting with tools that heavily rely on standard input without cluttering your code with external files or pipeline subshells.

**1. Quick Math with `bc` (Referencing Chapter 15):**
The `bc` calculator expects expressions via standard input. Here Strings make inline floating-point math very readable.

```bash
radius=5
area=$(bc <<< "scale=2; 3.14 * $radius * $radius")
echo "Area is $area"

```

**2. Translating Characters with `tr` (Referencing Chapter 11):**

```bash
# Convert a specific string to uppercase
shout=$(tr 'a-z' 'A-Z' <<< "warning: low disk space")
echo "$shout"
# Output: WARNING: LOW DISK SPACE

```

**3. Parsing Delimited Data with `IFS`:**
You can temporarily alter the Internal Field Separator and use a Here String to instantly split CSV or colon-separated data into an array or individual variables.

```bash
user_record="alice:x:1001:1001:Alice Smith:/home/alice:/bin/bash"

# Split the string by colons and read into variables
IFS=':' read -r user pass uid gid desc home shell <<< "$user_record"

echo "User $user's home directory is $home"

```

By mastering Here Strings alongside `read`, `printf`, `exec`, and Here Documents, you possess complete, surgical control over how data flows into, out of, and throughout your Bash scripts.