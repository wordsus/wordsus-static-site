Up to this point, you have interacted with the shell one command at a time—navigating directories, manipulating text, and piping outputs. While powerful, manually typing commands is inefficient for repetitive tasks.

In this chapter, we transition from interactive command-line usage to automation. A Bash script is essentially a plain text file containing a sequence of commands that the system executes sequentially. We will explore the absolute foundations of writing these scripts, from defining the correct interpreter with a shebang to managing file execution permissions and documenting your code for the future.

## 6.1 The Shebang and Its Purpose

When you write a Bash script, you are creating a plain text file containing a sequence of commands. However, Linux and Unix-like operating systems support many different scripting languages—Python, Perl, Ruby, and various shells (like `sh`, `zsh`, and `bash`). When you tell the operating system to execute your text file, it needs a way to know exactly *which* interpreter should read and execute the commands inside it.

This is where the **shebang** comes in.

The shebang (sometimes called a hashbang, hash-pling, or pound-bang) is a special character sequence comprising a hash symbol (`#`) followed immediately by an exclamation mark (`!`). It must be the absolute first two characters on the very first line of your script.

```bash
#!/bin/bash

echo "Hello, Shell!"

```

### How the Shebang Works

Behind the scenes, the `#!` sequence translates to the hexadecimal "magic number" `0x23 0x21`. When the operating system's kernel attempts to execute a file and sees this magic number at the start, it understands that the file is not a compiled binary executable, but rather a script.

The kernel parses the rest of that first line to find the absolute path to the interpreter program. It then passes the path of your script file as an argument to that interpreter.

```text
+----------------------------------------------------+
| Script File: backup.sh                             |
+----------------------------------------------------+
| #!/bin/bash                                        |  <-- 1. Kernel reads shebang
|                                                    |
| cp /docs/*.txt /backup/                            |  <-- 3. Bash interprets commands
| echo "Backup complete."                            |
+----------------------------------------------------+
       |
       v
+----------------------------------------------------+
| 2. Kernel executes:  /bin/bash backup.sh           |
+----------------------------------------------------+

```

### Common Shebang Variations

Depending on your script's requirements, you might see several different shebangs in the wild:

* `#!/bin/bash`
This is the standard shebang for Bash scripts. It tells the system to use the Bash executable located directly in the `/bin` directory.
* `#!/bin/sh`
This invokes the default system shell. Historically, this was the original Bourne shell, but on modern systems, it is often a symlink to a lightweight POSIX-compliant shell like `dash` (on Ubuntu/Debian) or `bash` running in a restricted POSIX mode. If you use Bash-specific features (bashisms) like arrays or double-bracket `[[ ]]` conditional testing, using `#!/bin/sh` can cause your script to fail on systems where `sh` is not `bash`.

### The Portability Problem and `env`

While `#!/bin/bash` is ubiquitous in the Linux world, Bash is not strictly guaranteed to be installed in `/bin` on every Unix-like operating system. On some systems (like FreeBSD or certain macOS environments), Bash might be installed in `/usr/local/bin/bash` or `/opt/homebrew/bin/bash`.

If you hardcode `#!/bin/bash` and share your script with a user whose Bash is installed elsewhere, the kernel will fail to execute it, throwing a `"bad interpreter: No such file or directory"` error.

To write highly portable scripts, it is a best practice to use the `env` command in your shebang:

```bash
#!/usr/bin/env bash

```

**How `env` solves the problem:**
Instead of hardcoding the path to Bash, this shebang tells the kernel to execute the `env` utility (which is almost universally located at `/usr/bin/env`). The `env` program then searches the executing user's `$PATH` variable for the first instance of the `bash` executable and hands execution over to it.

This ensures your script will execute correctly as long as Bash is installed *anywhere* in the user's standard executable path.

### Important Rules for the Shebang

To ensure your shebang functions correctly, keep these strict rules in mind:

1. **It must be the first line:** Not the second line, and not after a blank line. If there is a blank line above it, the kernel will not recognize the magic number, and the OS will likely try to execute the file using the user's current interactive shell.
2. **No leading spaces:** The `#` must be the absolute first character in the file.
3. **Absolute paths only:** You cannot use relative paths (like `#!../bin/bash`). The kernel requires a full, absolute path to the interpreter or the `env` command.
4. **No line breaks:** The entire shebang path must be on a single, continuous line.

With the shebang correctly in place, your script is fully prepared to be recognized and processed by the system.

## 6.2 Making Scripts Executable

You have written your Bash script, and you have included the perfect shebang at the very top. However, if you attempt to run the file right now, the system will likely stop you with a frustrating `bash: ./myscript.sh: Permission denied` error.

This happens because, as a security measure, Linux does not automatically grant execution rights to newly created files. As we explored in Chapter 3 (File Permissions and Ownership), your default `umask` ensures that new text files are created with read and write permissions, but never execute permissions. To turn your standard text file into a runnable program, you must explicitly change its permissions.

### Granting Execute Permissions with `chmod`

To make a script executable, we use the `chmod` (change mode) command. There are two primary ways to apply this change: using **symbolic mode** or **octal (numeric) mode**.

#### 1. Symbolic Mode (The Quick Way)

Symbolic mode is the most common and intuitive way to make a script executable. It allows you to add or remove specific permissions without worrying about the file's current permission state.

To make a script executable for the user who owns it, the group, and everyone else, use the `+x` flag:

```bash
chmod +x myscript.sh

```

If you are writing a script that contains sensitive operations and you only want the **owner** (yourself) to be able to execute it, you can specify the user (`u`) explicitly:

```bash
chmod u+x myscript.sh

```

#### 2. Octal Mode (The Absolute Way)

Octal mode explicitly sets the exact permissions for the user, group, and others using a three-digit number. This is highly useful when you want to standardize the permissions of your scripts regardless of what their previous permissions were.

The most common octal permission for a general-use script is `755`:

```bash
chmod 755 myscript.sh

```

* **7 (Owner):** Read (4) + Write (2) + Execute (1) = 7. The owner can read, modify, and run the script.
* **5 (Group):** Read (4) + Execute (1) = 5. Group members can read and run the script, but not modify it.
* **5 (Others):** Read (4) + Execute (1) = 5. Everyone else can read and run the script, but not modify it.

If the script contains hardcoded passwords or sensitive API keys (a practice we will discourage in Chapter 20, but which happens), you should restrict it entirely to the owner using `700`:

```bash
chmod 700 myscript.sh

```

### Verifying the Change

You can verify that your script is now executable by listing the directory contents with the long format (`ls -l`).

```text
+-----------------------------------------------------------------+
| Step 1: Before chmod (Plain text file)                          |
+-----------------------------------------------------------------+
| $ ls -l myscript.sh                                             |
| -rw-r--r-- 1 developer staff  45 Aug 10 10:00 myscript.sh       |
|    ^                                                            |
|    |__ Notice the lack of 'x'. The system will not run this.    |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| Step 2: Apply execute permission                                |
+-----------------------------------------------------------------+
| $ chmod +x myscript.sh                                          |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| Step 3: After chmod (Executable script)                         |
+-----------------------------------------------------------------+
| $ ls -l myscript.sh                                             |
| -rwxr-xr-x 1 developer staff  45 Aug 10 10:00 myscript.sh       |
|    ^  ^  ^                                                      |
|    |__|__|__ The 'x' is present. The script is now runnable.    |
+-----------------------------------------------------------------+

```

Once the `x` bit is set, the operating system recognizes the file as a program. When you execute it, the kernel will read the shebang we discussed in Section 6.1, load the appropriate interpreter, and run your code.

## 6.3 Script Execution Methods

With your shebang in place and execute permissions granted, your script is ready to run. However, the way you invoke your script dictates *how* the operating system and the shell process it. In Bash, there are three primary methods for executing a script, each serving a distinct purpose.

### 1. Direct Path Execution (The Standard Method)

This is the most common way to run a script. You tell the system exactly where the script lives by providing its path.

**Relative Path Execution:**
If you are in the same directory as your script, you must prefix the filename with `./` (which represents the current directory):

```bash
./myscript.sh

```

**Why is `./` required?**
If you simply type `myscript.sh`, Bash searches for that command in a predefined list of system directories known as the `$PATH` (e.g., `/bin`, `/usr/bin`). Because your current directory is usually *not* in the `$PATH` for security reasons, Bash will return a `command not found` error, even if you are staring right at the file. Using `./` explicitly tells Bash, "Do not search the `$PATH`; run the file located exactly here."

**Absolute Path Execution:**
You can also run a script from anywhere on the system by providing its full, absolute path:

```bash
/home/developer/scripts/myscript.sh

```

*Note: Both direct path methods require the script to have execute permissions (`chmod +x`) and a valid shebang.*

### 2. Explicit Interpreter Invocation

Sometimes, you may want to run a script without granting it execute permissions, or you might want to override the interpreter defined in its shebang. You can do this by passing the script file as an argument to the interpreter directly.

```bash
bash myscript.sh

```

When you do this:

1. The `bash` command itself is executed (found via your `$PATH`).
2. Bash reads the `myscript.sh` file and executes its contents.
3. The shebang inside `myscript.sh` is completely ignored.
4. Execute permissions (`+x`) are not required because you are reading the file as data, not executing it as a standalone program.

### 3. Sourcing the Script

The previous two methods have a crucial behavior in common: they execute your script in a **subshell**. The current shell spawns a new, temporary child process to run the script. When the script finishes, that child process dies, and any variables, functions, or directory changes (`cd`) created by the script disappear with it.

If you want a script to modify your *current* terminal session, you must **source** it. Sourcing tells the active Bash shell to read and execute the commands within the current process.

There are two synonymous ways to source a script:

```bash
source myscript.sh
# or using the dot operator (more portable):
. myscript.sh

```

### Subshell vs. Sourcing: A Visual Comparison

To understand the practical difference, imagine a script called `setup.sh` containing two commands:
`MY_VAR="Hello"` and `cd /tmp`

```text
       Execution: ./setup.sh                  Sourcing: . setup.sh
+---------------------------------+   +---------------------------------+
| 1. Current Shell (Terminal)     |   | 1. Current Shell (Terminal)     |
|    Prompt: ~/projects$          |   |    Prompt: ~/projects$          |
+---------------------------------+   +---------------------------------+
               |                                       |
               v                                       |
+---------------------------------+                    |
| 2. Subshell (Child Process)     |                    v
|    - Sets MY_VAR="Hello"        |   | 2. Executes directly in Current |
|    - Changes dir to /tmp        |   |    - Sets MY_VAR="Hello"        |
|    - Script ends. Process dies. |   |    - Changes dir to /tmp        |
+---------------------------------+                    |
               |                                       |
               v                                       |
+---------------------------------+   +---------------------------------+
| 3. Back in Current Shell        |   | 3. Current Shell (Terminal)     |
|    - MY_VAR is completely empty |   |    - MY_VAR contains "Hello"    |
|    - Prompt is still ~/projects$|   |    - Prompt is now /tmp$        |
+---------------------------------+   +---------------------------------+

```

**When to use which:**

* **Use Path Execution (`./`)** for standard scripts, automation, and tools. This keeps your environment clean and prevents script variables from accidentally breaking your current terminal session.
* **Use Sourcing (`.`)** for configuration scripts, activating virtual environments, or loading custom functions and aliases into your active terminal (e.g., when you modify your `.bashrc` and run `source ~/.bashrc`).

## 6.4 Commenting and Script Documentation

Code is written once, but it is read many times—mostly by you, six months later, when you have completely forgotten what the script does. In Bash scripting, just as in any programming language, leaving clear, concise notes inside your code is not just a courtesy; it is a critical component of maintainable software.

The Bash interpreter ignores these notes, allowing you to explain the *why* behind your code without affecting how it runs.

### Single-Line and Inline Comments

In Bash, comments are initiated using the hash symbol (`#`). The moment the shell encounters a `#`, it ignores that character and everything following it until the end of the line.

**1. Full-Line Comments:**
These are used to explain the block of code immediately below them.

```bash
# Calculate the total backup size and save it to the log
du -sh /var/backups >> /var/log/backup_size.log

```

**2. Inline Comments:**
These are placed on the same line as a command, typically to explain a specific, non-obvious parameter or action.

```bash
tar -czvf archive.tar.gz /data  # -z uses gzip, -v enables verbose output

```

**Exceptions to the Rule:**
There are two notable situations where a `#` does *not* start a comment:

1. **The Shebang:** As we learned in Section 6.1, `#!/bin/bash` on the very first line is processed by the kernel, not ignored as a comment.
2. **Inside Quotes:** If a hash is wrapped in single or double quotes, Bash treats it as a literal string character.
```bash
echo "Please press the # key to continue." # Only the text after this second hash is a comment.

```



### Multi-Line Comments (Block Commenting)

Unlike languages such as C or Java, which use `/* ... */` to block out multiple lines, Bash does not have a dedicated multi-line comment syntax.

The standard, most widely accepted way to create a multi-line comment in Bash is simply to stack single-line comments:

```bash
# ---------------------------------------------------------
# This function checks if the database is running.
# It attempts to connect via ping 3 times before failing.
# If it fails, it sends an email alert to the admin team.
# ---------------------------------------------------------

```

#### The Null Command Hack

Occasionally, you might see developers use a workaround involving the null command (`:`) and a Here Document (a concept we will explore deeply in Section 16.4) to block out large chunks of code during debugging. The null command essentially tells Bash to "do nothing."

```bash
: <<'END_COMMENT'
Everything in this block is technically passed to the null command,
meaning it is executed but does absolutely nothing.
This is a handy hack for temporarily disabling large chunks of code
without having to place a '#' in front of every single line.
END_COMMENT

```

*Note: While useful for quick debugging, stacking `#` is the preferred and safest method for permanent documentation.*

### Anatomy of a Well-Documented Script

Documentation goes beyond just explaining tricky lines of code. Every production-grade script should begin with a **Script Header**—a standardized block of comments immediately following the shebang that acts as a manual page for your script.

A strong script header answers four questions: *What does this do? Who wrote it? When was it updated? How do I use it?*

```text
+----------------------------------------------------------------------+
| Standard Bash Script Header Template                                 |
+----------------------------------------------------------------------+
| #!/usr/bin/env bash                                                  |
|                                                                      |
| # ================================================================== |
| # Script Name:   system_monitor.sh                                   |
| # Description:   Checks CPU and RAM usage, alerting if over 90%.     |
| # Author:        Jane Doe (jdoe@example.com)                         |
| # Date:          2024-08-15                                          |
| # Version:       1.2                                                 |
| # Usage:         ./system_monitor.sh [--verbose]                     |
| # ================================================================== |
|                                                                      |
| # --- System Variables ---                                           |
| THRESHOLD=90                                                         |
| ADMIN_EMAIL="alerts@example.com"                                     |
|                                                                      |
| # --- Main Execution ---                                             |
| # Check memory usage and strip out percentage symbols                |
| current_usage=$(free | awk '/Mem/{printf("%.2f"), $3/$2*100}')      |
+----------------------------------------------------------------------+

```

### Self-Documenting Code

The best comment is often no comment at all, provided your code is inherently readable. You can achieve this by using descriptive variable and function names (topics we will cover in the next chapters).

Consider this comparison:

**Poorly Written (Requires Comments):**

```bash
# Get the d and check if it's over 7
d=$(date +%u)
if [ $d -gt 7 ]; then # ...

```

**Self-Documenting (No Comments Needed):**

```bash
day_of_week=$(date +%u)
if [ "$day_of_week" -gt 7 ]; then # ...

```

By combining a robust script header, strategic inline comments for complex logic, and self-documenting variable names, you ensure your scripts are professional, maintainable, and accessible to anyone who inherits your code.

