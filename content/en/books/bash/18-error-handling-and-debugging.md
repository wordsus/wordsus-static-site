Writing bash scripts is easy; writing *resilient* bash scripts is an art. Up to this point, we have focused on making things happen. But what occurs when things go wrong? A missing file, a network timeout, or a misspelled variable can turn a helpful automation script into a destructive force. In this chapter, we transition from optimistic code to defensive programming. You will learn how to decipher exit statuses, gracefully intercept system signals, enforce strict execution modes to catch hidden bugs, and implement professional logging. Mastering these techniques elevates your scripts from fragile command sequences to robust, production-ready tools.

## 18.1 Exit Statuses and Evaluating Failures

In the Unix philosophy, silence is golden, but feedback is mandatory. When a command finishes executing—whether it prints output to the terminal or runs entirely silently—it communicates its result back to the shell using an integer value known as the **exit status** (or return code). Bash relies fundamentally on these statuses to determine if a command succeeded or failed, which in turn drives the flow of your scripts.

The core rule of exit statuses in Bash is simple, though it can feel counter-intuitive if you are coming from languages where `0` equates to boolean `false`:

* **`0` (Zero)** indicates **success**.
* **`1` through `255**` indicates **failure**.

Because there is only one way for a command to succeed but many ways for it to fail, Unix reserves the non-zero space to provide specific error codes that indicate *why* the failure occurred.

### Capturing the Exit Status

As briefly touched upon when discussing special parameters, the exit status of the most recently executed command is stored in the special variable `$?`.

```bash
$ ls /tmp > /dev/null
$ echo $?
0

$ ls /directory_that_does_not_exist
ls: cannot access '/directory_that_does_not_exist': No such file or directory
$ echo $?
2

```

It is crucial to remember that `$?` is highly volatile. It is overwritten by *every* command executed, including simple commands like `echo`. If you need to evaluate an exit status multiple times, you must save it to a variable immediately:

```bash
cp data.txt /backup/
CP_STATUS=$?

if [[ $CP_STATUS -ne 0 ]]; then
    echo "Copy failed with code $CP_STATUS" >&2
    exit $CP_STATUS
fi

```

### Standard Exit Codes

While developers can choose their own exit codes between 1 and 255 for custom scripts, several codes have standardized meanings defined by the Advanced Bash-Scripting Guide and POSIX standards. Understanding these helps you diagnose system failures quickly:

```text
+-----------+------------------------------------------------------+
| Exit Code | Meaning / Description                                |
+-----------+------------------------------------------------------+
| 0         | Success                                              |
| 1         | General or catch-all error (e.g., division by zero)  |
| 2         | Misuse of shell builtins (syntax error)              |
| 126       | Command invoked cannot execute (permission denied)   |
| 127       | Command not found (typo or missing from $PATH)       |
| 128       | Invalid argument to `exit`                           |
| 128 + n   | Fatal error signal "n"                               |
| 130       | Script terminated by Control-C (128 + 2 [SIGINT])    |
| 137       | Script terminated by kill -9 (128 + 9 [SIGKILL])     |
| 255       | Exit status out of range                             |
+-----------+------------------------------------------------------+

```

### The True Nature of `if` Statements

In Chapter 8, you learned how to use the `test` command (`[` and `[[`) with `if` statements. However, `if` does not strictly require brackets. The `if` construct simply executes a command and branches based on its exit status.

The brackets are actually commands themselves (either the `[` binary or the `[[` shell keyword) that perform a comparison and return `0` if true, or `1` if false. You can pass *any* standard command directly to `if`:

```bash
# Using grep's quiet mode (-q) to suppress standard output.
# grep returns 0 if the string is found, 1 if it is not.
if grep -q "ERROR" /var/log/syslog; then
    echo "Errors were found in the system log."
else
    echo "No errors found."
fi

```

This is highly efficient because it eliminates the need to capture command output into a variable just to check if an operation was successful.

### Inline Evaluation with Logical Operators

For quick evaluations and error handling, the logical AND (`&&`) and OR (`||`) operators rely entirely on exit statuses to perform short-circuit evaluation.

* **`command1 && command2`**: `command2` runs *only* if `command1` succeeds (returns `0`).
* **`command1 || command2`**: `command2` runs *only* if `command1` fails (returns non-zero).

These operators are often combined into a single line to handle failures immediately:

```bash
# Create the directory. If it fails, print an error and exit the script.
mkdir /opt/myapp || { echo "Failed to create directory." >&2; exit 1; }

# Download a file and, if successful, extract it.
wget -q http://example.com/data.tar.gz && tar -xzf data.tar.gz

```

### Controlling Your Script's Exit Status

By default, a Bash script exits with the status of the *last command executed* within it. This implicit behavior is a common source of bugs. If the last command in your script is an `echo "Done"`, your script will return `0` (success), even if a critical database backup failed two lines earlier.

To write robust, composable scripts, you must explicitly evaluate failures and use the `exit` command to halt execution and return a meaningful code to the calling environment.

```bash
#!/bin/bash

# Validate dependencies
if ! command -v curl >/dev/null 2>&1; then
    echo "Fatal: curl is required but not installed." >&2
    exit 127
fi

# Attempt critical operation
if ! curl -s -f -o config.json http://api.internal/config; then
    echo "Error: Failed to fetch configuration." >&2
    exit 1
fi

echo "Configuration applied successfully."
exit 0

```

Notice the use of the `!` operator in the `if` statements. This operator negates the exit status of the command that follows it, turning a failure (`1`) into a success (`0`) solely for the purpose of triggering the `if` block to handle the error.

For functions inside your scripts, use the `return` command instead of `exit`. Using `exit` inside a function will terminate the entire parent script, whereas `return` will gracefully exit just the function and pass an exit status back to the script for evaluation.

## 18.2 Trapping Signals for Clean Exits

In an ideal world, every script runs from the first line to the last and exits gracefully with a neat `0` status. In reality, scripts are frequently interrupted. A user might press `Ctrl+C` because the script is taking too long, the system administrator might issue a `kill` command, or the server might initiate a shutdown sequence.

When a script is abruptly terminated by a signal (as discussed in Chapter 17), it stops executing immediately. If your script was in the middle of creating temporary files, modifying a database, or holding a file lock, this abrupt halt leaves the system in a messy, potentially corrupted state.

To prevent this, Bash provides the `trap` builtin command. `trap` allows your script to intercept specific system signals and execute a designated command or function before the script finally exits.

### The Anatomy of `trap`

The syntax for `trap` is straightforward:

```bash
trap 'commands_to_execute' SIGNAL_NAME_OR_NUMBER...

```

* **`commands_to_execute`**: The Bash code to run when the signal is caught. This is usually a call to a dedicated cleanup function.
* **`SIGNAL_NAME_OR_NUMBER`**: A space-separated list of signals to intercept. You can use the signal number (e.g., `2`), the short name (e.g., `INT`), or the full name (e.g., `SIGINT`).

Here is a basic example that prevents a script from being silently killed by `Ctrl+C` (`SIGINT`):

```bash
#!/bin/bash

# Intercept SIGINT (Ctrl+C)
trap 'echo -e "\nCtrl+C detected. Exiting gracefully..."; exit 130' SIGINT

echo "Running a long process... Press Ctrl+C to interrupt."
sleep 100

```

### The Workflow of a Trapped Signal

When a trapped signal is received, Bash pauses the current execution, runs the code specified in the `trap`, and then resumes where it left off (unless the trap specifically calls `exit`, which is highly recommended for termination signals).

```text
+------------------+       +---------------+
| Running Script   | ----> | SIGINT (INT)  |
+------------------+       +---------------+
                                |
             +------------------v------------------+
             |         Is INT trapped?             |
             +------------------+------------------+
                   /                         \
                 YES                          NO
                 /                             \
+----------------v-----------------+  +---------v---------+
| Pause script execution           |  | Immediate script  |
| Execute trapped command/function |  | termination.      |
| Proceed to 'exit'                |  | (Orphaned files!) |
+----------------------------------+  +-------------------+

```

### The `EXIT` Pseudo-Signal

While you can trap specific signals like `SIGTERM` (15) and `SIGINT` (2), Bash provides a special, highly useful pseudo-signal called `EXIT` (or `0`).

A trap set on `EXIT` will execute its commands when the script terminates for *any* reason—whether it reached the end naturally, encountered an explicit `exit` command, or was killed by a standard termination signal.

This makes `EXIT` the absolute best choice for general cleanup operations:

```bash
#!/bin/bash

# Create a temporary directory securely
TEMP_DIR=$(mktemp -d)

# Define the cleanup function
cleanup() {
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    echo "Cleanup complete."
}

# Bind the cleanup function to the EXIT signal
trap cleanup EXIT

echo "Working inside $TEMP_DIR..."
# ... perform operations using $TEMP_DIR ...

# Even if we explicitly exit here, the trap will fire!
if [[ ! -f "$TEMP_DIR/data.txt" ]]; then
    echo "Error: Data file missing." >&2
    exit 1 
fi

echo "Script finished successfully."
# The cleanup function automatically runs right after this line.

```

### Best Practices for Trapping

**1. Set the trap immediately after creating the resource.**
Do not wait to set the trap. If you create a temporary file on line 10 and set the trap on line 15, an interruption between those lines will leave the file behind.

**2. Use a dedicated cleanup function.**
Avoid writing complex inline commands within the `trap` string. Wrapping your cleanup logic in a function makes your code readable and easier to maintain.

**3. Preserve the original exit status.**
If your script fails and calls `exit 1`, but your `EXIT` trap executes a `rm` command that succeeds, the script might accidentally exit with `0`. You can capture and reuse the exit status within your trap:

```bash
cleanup() {
    local exit_status=$?
    rm -rf "$TEMP_DIR"
    exit $exit_status
}
trap cleanup EXIT

```

### Ignoring and Resetting Signals

Sometimes you want to completely ignore a signal. You can do this by passing an empty string to `trap`. For example, to make a script immune to `Ctrl+C`:

```bash
trap '' SIGINT

```

If you need to revert a signal back to its default system behavior later in the script, use a dash (`-`):

```bash
trap - SIGINT

```

*Note: You cannot trap `SIGKILL` (kill -9). `SIGKILL` goes directly to the kernel, which terminates the process immediately without giving the script a chance to run its trap. This is why `kill -9` should always be a last resort.*

## 18.3 The `set` Command for Strict Modes

By design, Bash is an incredibly forgiving language. If a command in a script fails, Bash simply moves on to the next line. If you reference a variable you never defined, Bash treats it as an empty string without complaining. While this behavior is convenient for quick, interactive command-line usage, it is a nightmare for writing reliable, production-grade scripts.

To transform Bash from a loose interpreter into a robust programming environment, developers rely on the `set` builtin command. The `set` command modifies internal shell options. When specific options are combined, they form what the community refers to as the "Bash Strict Mode."

### The Unofficial Bash Strict Mode

The gold standard for beginning any modern Bash script is to include the following line immediately after your shebang:

```bash
set -euo pipefail

```

This single line activates three distinct shell options that drastically alter how Bash handles errors and edge cases. Let us break down what each flag does.

### `set -e` (Fail Fast)

Also known by its long-form name `set -o errexit`, the `-e` flag instructs Bash to exit the script immediately if any command exits with a non-zero status.

Without `-e`, a script will blindly blunder forward, compounding errors. Consider this disastrous, yet common, scenario:

```bash
#!/bin/bash
# WITHOUT set -e

cd /var/www/html/backups
# If 'cd' fails (e.g., directory deleted), the script continues!
rm -rf * 
# This now deletes everything in the current working directory!

```

With `set -e` active, the script halts the moment `cd` returns an exit code of `1` (or any non-zero value), preventing the catastrophic `rm -rf *` from executing in the wrong directory.

**Exceptions to `-e`:** Bash is smart enough to know when you are intentionally handling an error. The `-e` flag will *not* trigger an exit if the failing command is part of a conditional test (`if`, `while`, `until`) or is part of a short-circuit list (`&&` or `||`).

```bash
set -e

# This will NOT exit the script, because the failure is handled by '||'
mkdir /existing_dir || echo "Directory already exists, continuing."

```

### `set -u` (No Unbound Variables)

The `-u` flag (or `set -o nounset`) forces the script to exit immediately if it attempts to use an undefined variable.

Typographical errors in variable names are notoriously difficult to debug in Bash because the shell silently substitutes them with nothing.

```bash
#!/bin/bash
set -u

BACKUP_DIR="/data/backups"

# A typo in the variable name:
echo "Saving to $BAKUP_DIR"

```

When this runs, Bash intercepts the typo and halts execution with a clear error message: `bash: BAKUP_DIR: unbound variable`. This is especially critical when dealing with destructive commands where an empty string could change `rm -rf "$TARGET_DIR/"` into the terrifying `rm -rf /`.

### `set -o pipefail` (Strict Pipelines)

This option addresses a critical blind spot in how Bash evaluates pipelines (`|`). By default, the exit status of a pipeline is the exit status of the *last command* in the chain.

If the first command fails but the last command succeeds, the pipeline hides the failure, returning `0`.

```text
Default Pipeline Behavior:
[ command1 (Fails: exit 2) ] ---> | ---> [ command2 (Succeeds: exit 0) ] ===> Pipeline Exit Status: 0

```

For example, if you pipe `grep` into `awk`, and `grep` crashes because the input file is missing, `awk` still executes successfully on an empty input stream. The script assumes everything went perfectly.

`set -o pipefail` changes this behavior. It ensures that a pipeline returns the exit status of the *last (rightmost) command to exit with a non-zero status*.

```text
Behavior with 'set -o pipefail':
[ command1 (Fails: exit 2) ] ---> | ---> [ command2 (Succeeds: exit 0) ] ===> Pipeline Exit Status: 2

```

### Temporarily Disabling Strict Modes

There are rare situations where you explicitly want a command to fail silently without using an `if` statement or `||`, or you need to reference a variable that might legitimately be unset.

You can toggle these options off and back on using the `+` symbol (which intuitively turns options *off*).

```bash
set -euo pipefail

# ... strict code ...

set +e  # Turn off errexit
failing_command_we_dont_care_about
set -e  # Turn errexit back on

# ... strict code resumes ...

```

By enforcing `set -euo pipefail` at the top of your files, you force your script to be explicit about error handling, turning silent, unpredictable bugs into loud, manageable failures.

## 18.4 Tracing Execution

Even with strict modes enabled and comprehensive error handling in place, you will inevitably write a script that runs without throwing an error but produces the wrong result. Perhaps a variable expanded incorrectly, a glob pattern matched the wrong files, or a loop iterated one too many times. When logic fails, you need visibility into what the shell is actually doing behind the scenes.

Bash provides a built-in debugging mechanism called **execution tracing**. Tracing allows you to look over the shell's shoulder and see exactly what command is about to be executed *after* all variable substitutions, command substitutions, and globbing have taken place.

### The `xtrace` Option (`set -x`)

The primary tool for tracing is the `-x` option (short for `xtrace`). When enabled, Bash prints each command to standard error (stderr) immediately before executing it.

You can enable tracing for an entire script by invoking Bash with the `-x` flag:

```bash
$ bash -x ./deploy.sh

```

Alternatively, you can modify the script's shebang line:

```bash
#!/bin/bash -x

```

To see why this is so powerful, consider a script that moves files based on a variable. If the variable is empty due to a bug, the command behaves unexpectedly.

```bash
#!/bin/bash
# A buggy script

DESTINATION=""
mkdir -p /backup/data
cp *.txt $DESTINATION/backup/data/

```

If you run this normally, it might silently fail or copy files to the wrong place. If you run it with `bash -x`, the mystery is instantly solved:

```text
+ DESTINATION=
+ mkdir -p /backup/data
+ cp file1.txt file2.txt /backup/data/

```

Notice the `+` sign. This is the default trace prompt. The trace output reveals two critical things:

1. `*.txt` was correctly expanded to `file1.txt file2.txt`.
2. `$DESTINATION` evaluated to nothing, changing the target directory from what we intended to an absolute path of `/backup/data/`.

### Targeted Tracing

Running `bash -x` on a 500-line script can produce an overwhelming avalanche of output, making it harder to find the actual bug. A more surgical approach is to enable and disable tracing only around the problematic section of your code.

You do this using the `set` command. `set -x` turns tracing on, and `set +x` turns it off.

```bash
#!/bin/bash

echo "Starting system check..."
# ... hundreds of lines of working code ...

# We suspect the bug is in this loop
set -x  # Enable tracing
for config_file in /etc/myapp/*.conf; do
    process_config "$config_file"
done
set +x  # Disable tracing

echo "System check complete."

```

### Enhancing Trace Output with `PS4`

By default, Bash prefixes trace lines with a single plus sign (`+`). If a command involves subshells or nested evaluations, Bash adds more plus signs (e.g., `++` or `+++`) to indicate the depth of the nesting.

While helpful, a simple `+` doesn't provide much context in a large script. You can customize this prefix by modifying the special **`PS4`** environment variable (Prompt String 4).

By including special Bash variables like `$BASH_SOURCE` (the name of the script), `$LINENO` (the current line number), and `$FUNCNAME` (the current function), you can transform basic tracing into professional-grade debugging output.

```bash
#!/bin/bash

# Configure PS4 for detailed debugging
export PS4='+ [${BASH_SOURCE}:${LINENO}:${FUNCNAME[0]}] '

calculate_total() {
    local val1=$1
    local val2=$2
    echo $((val1 + val2))
}

set -x
RESULT=$(calculate_total 10 5)
set +x

echo "Result: $RESULT"

```

When you execute this script, the trace output pinpoints exactly where each operation occurs:

```text
+ [./script.sh:13:] calculate_total 10 5
++ [./script.sh:7:calculate_total] local val1=10
++ [./script.sh:8:calculate_total] local val2=5
++ [./script.sh:9:calculate_total] echo 15
+ [./script.sh:13:] RESULT=15
+ [./script.sh:14:] set +x
Result: 15

```

### `set -x` vs `set -v` (Verbose Mode)

Bash offers another debugging flag: `-v` (verbose). While `-x` prints the command *after* expansion, `-v` prints the raw lines of code exactly as the shell *reads* them, *before* any expansion occurs.

```text
+-----------------------+------------------------------------------+
| Mode                  | Output Example                           |
+-----------------------+------------------------------------------+
| Script Code           | echo "The value is $VAR"                 |
+-----------------------+------------------------------------------+
| Verbose (-v)          | echo "The value is $VAR"                 |
+-----------------------+------------------------------------------+
| Xtrace (-x)           | + echo 'The value is 42'                 |
+-----------------------+------------------------------------------+

```

Verbose mode is rarely used on its own for debugging logic errors, as it essentially just prints your source code back to you. However, it can be useful when combined with `xtrace` (`set -xv`) to see the "before and after" of how Bash parses and expands a particularly complex line of code.

## 18.5 Logging and System Log Integration

When a script is executed interactively, you can rely on `echo` and `printf` to display progress and errors directly to the terminal. However, bash scripts are frequently deployed as background processes, automated cron jobs (which we will cover in Chapter 19), or system startup routines. In these unattended environments, standard output and standard error disappear into the void. If a script fails at 3:00 AM, you need a persistent record of what happened.

Implementing a robust logging strategy ensures that your scripts leave a verifiable audit trail, making post-mortem debugging significantly easier.

### Custom File Logging

The simplest approach to logging is to append text to a dedicated file using redirection (`>>`). To make logs genuinely useful, every entry must include a timestamp and a severity level. Hardcoding this throughout your script is tedious, so standard practice dictates wrapping your logging logic into a dedicated function.

```bash
#!/bin/bash

# Define the log file location
LOG_FILE="/var/log/myapp_backup.log"

# Unified logging function
log_msg() {
    local severity="$1"
    shift
    local message="$@"
    # Generate an ISO 8601 compliant timestamp
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Append the formatted message to the log file
    echo "[$timestamp] [$severity] $message" >> "$LOG_FILE"
}

# Usage:
log_msg "INFO" "Backup process initialized."
# ... some code ...
log_msg "ERROR" "Failed to connect to the database server."

```

While custom log files are easy to create, they come with maintenance overhead. If your script runs frequently and generates extensive logs, that file will grow indefinitely until it consumes all available disk space. You must then configure tools like `logrotate` to manage it.

### Integrating with System Logs: The `logger` Command

Instead of managing your own files, the Unix philosophy encourages delegating this task to the system's dedicated logging daemon (such as `rsyslog` or `systemd-journald`). Bash interacts with these daemons via the `logger` command.

When you use `logger`, the system automatically handles log rotation, timestamping, and routing the messages to the appropriate files (typically `/var/log/syslog` on Debian/Ubuntu or `/var/log/messages` on RHEL/CentOS).

The `logger` command relies on two core concepts to classify messages: **Facilities** and **Priorities** (often combined as `facility.priority`).

* **Facilities:** Broad categories indicating what type of program generated the log. Common facilities include `user` (the default for user-level programs), `daemon` (for background services), `auth` (for security events), and `local0` through `local7` (reserved specifically for custom scripts and local applications).
* **Priorities:** The severity of the message. In descending order of severity: `emerg`, `alert`, `crit`, `err`, `warning`, `notice`, `info`, and `debug`.

```bash
# Basic usage: sends an 'info' message to the 'user' facility
logger "Backup script completed successfully."

# Advanced usage: tag the log (-t), specify facility and priority (-p)
logger -t "db_backup" -p local0.err "Database dump failed!"

```

If you search the system log after running the second command, you will see a beautifully formatted entry managed entirely by the OS:
`Oct 24 14:32:01 server1 db_backup: Database dump failed!`

### Automating Script-Wide Logging

Calling `logger` or `log_msg` manually for every single operation can clutter your code. A more advanced, highly elegant technique leverages the `exec` command (from Chapter 16) and process substitution (which we will explore further in Chapter 21) to capture *all* output from a script and pipe it directly to `logger`.

```text
+-------------------+       stdout       +-------------------------+
|                   | -----------------> | Process Substitution    |
|   Bash Script     |                    | >(logger -p user.info)  | ---> System Log
|  (echo, printf,   |       stderr       +-------------------------+
|   command output) | -----------------> | Process Substitution    |
|                   |                    | >(logger -p user.err)   | ---> System Log
+-------------------+                    +-------------------------+

```

By placing the following two lines near the top of your script (just below your `set` strict mode configurations), you instruct Bash to permanently redirect File Descriptor 1 (stdout) and File Descriptor 2 (stderr) into background `logger` processes:

```bash
#!/bin/bash
set -euo pipefail

# Define a tag using the script's filename
SCRIPT_NAME=$(basename "$0")

# Redirect stdout to logger with 'info' priority
exec 1> >(logger -t "$SCRIPT_NAME" -p user.info)

# Redirect stderr to logger with 'err' priority
exec 2> >(logger -t "$SCRIPT_NAME" -p user.err)

# From this point on, you never need to call logger manually.

echo "This standard output is secretly sent to the system log."
ls /non_existent_directory # This error is automatically logged as user.err!

```

This architecture is the gold standard for production automation. It keeps your script's logic clean and completely decouples the generation of output from the storage and management of logs, adhering perfectly to modern system administration practices.