Up to this point, you have learned to write scripts, manage files, and manipulate data within the boundaries of a default Bash session. However, to truly master the shell, you must learn how to mold it to your specific needs.

In this chapter, we transition from merely using the shell to deeply customizing its environment. You will discover the crucial differences between local shell variables and global environment variables, mastering the `export` command to control data flow across child processes. Finally, we will demystify startup files like `.bashrc`, construct time-saving aliases, and design a powerful, visually distinct custom prompt.

## 14.1 Environmental vs. Shell Variables

In Chapter 7, you learned how to declare and assign variables, and in Chapter 10, you explored how the `local` keyword restricts a variable's scope to a specific function. However, when we look at the Bash shell as a whole, variable scope is also dictated by process boundaries. Every command, script, or program you run from your terminal executes as a *child process* of your current Bash session.

Understanding how variables behave across these process boundaries is crucial. Bash categorizes variables into two distinct types based on this behavior: **Shell variables** and **Environment variables**.

### Shell Variables

A shell variable (sometimes called a local shell variable) is confined strictly to the instance of the shell in which it was created. If your current Bash shell spawns a new child process—whether that is another Bash script, a Python script, or a command line utility—the child process **will not** have access to the parent's shell variables.

To see this in action, we can define a variable and then spawn a temporary child shell using `bash -c`:

```bash
# Define a standard shell variable
GREETING="Hello, Shell!"

# Attempt to access it in a child Bash process
bash -c 'echo "Inside child process: $GREETING"'

```

**Output:**

```text
Inside child process: 

```

Because `GREETING` is merely a shell variable, it remains private to the parent shell. The child process evaluates `$GREETING` as an unset variable, resulting in an empty string.

Shell variables are typically used for temporary data, loop counters, or configuration settings that only the current script needs to know about. Many built-in Bash variables are shell variables. For example, `BASH_VERSION` and `UID` are specific to the current shell session.

### Environment Variables

Environment variables are variables that have been "promoted" so that they are inherited by any child process spawned by the shell. The collection of these variables is referred to as the "environment."

When a parent process creates a child process, the child receives an exact copy of the parent's environment. This makes environment variables the primary mechanism for passing configuration data (like paths, user preferences, and display settings) down to scripts and system commands.

We promote a shell variable to an environment variable using the `export` command (which we will cover in depth in Section 14.2). Let's see how this changes the behavior from our previous example:

```bash
# Define and export an environment variable
export GLOBAL_GREETING="Hello, Environment!"

# Attempt to access it in a child Bash process
bash -c 'echo "Inside child process: $GLOBAL_GREETING"'

```

**Output:**

```text
Inside child process: Hello, Environment!

```

Because `GLOBAL_GREETING` was exported into the environment, the child process inherited a copy of it and could successfully print its value. Common examples of environment variables include `PATH` (where the system looks for executables), `HOME` (the current user's home directory), and `USER` (the logged-in user's name).

### Visualizing the Process Boundary

The distinction between these two types of variables is best understood by visualizing the process hierarchy. When a child process is spawned, a one-way transfer of environment variables occurs.

```text
+-------------------------------------------------------------+
|                     Parent Bash Shell                       |
|                                                             |
|  [Shell Variables]                 [Environment Variables]  |
|  SESSION_THEME="dark"              PATH="/usr/bin:/bin"     |
|  TEMP_DIR="/tmp/workspace"         USER="alice"             |
|  GREETING="Hello"                  GLOBAL_GREETING="Hi"     |
+-------------------------------------------------------------+
         |                                     |
         | (Private to Parent)                 | (Inherited)
         X                                     V
+-------------------------------------------------------------+
|               Child Process (e.g., script.sh)               |
|                                                             |
|  [Shell Variables]                 [Environment Variables]  |
|  (SESSION_THEME is unset)          PATH="/usr/bin:/bin"     |
|  (TEMP_DIR is unset)               USER="alice"             |
|  (GREETING is unset)               GLOBAL_GREETING="Hi"     |
|                                                             |
|  * Note: The child can now create its own shell variables   |
|    or modify its copy of the environment variables without  |
|    affecting the parent shell.                              |
+-------------------------------------------------------------+

```

*Important Concept:* The inheritance is strictly top-down. If a child process modifies an environment variable it inherited, or exports a new one, those changes are **destroyed** when the child process terminates. The parent shell's environment remains untouched.

### Inspecting Your Variables

Because a typical Bash session contains dozens of variables, it is helpful to know how to list them. Different commands are used depending on which scope you want to inspect.

**1. Viewing Only Environment Variables**
To see the variables that will be passed to child processes, use the `env` or `printenv` commands. These will output a list of all currently exported variables.

```bash
# Display all environment variables
printenv

# Display a specific environment variable
printenv PATH

```

**2. Viewing All Variables (Shell and Environment)**
To see *everything*—including both unexported shell variables and environment variables—you use the `set` builtin command. Without any options, `set` prints all shell variables, environment variables, and even shell functions.

```bash
# Display all variables and functions (output will be very long)
set | less

```

By understanding the boundary between shell and environment variables, you can ensure that your scripts only expose data to child processes when intentionally designed to do so, keeping your scripting environment clean and secure.

## 14.2 The `export` Command

In the previous section, we established the strict boundary between local shell variables and environment variables. The `export` command is the bridge across that boundary. It instructs the Bash shell to mark a specific variable so that it is automatically inherited by any subsequently created child processes.

Without `export`, variables remain trapped in the current shell. With `export`, they become part of the environment payload handed down to scripts, command-line utilities, and background jobs.

### Syntax and Usage

There are two primary ways to use the `export` command. You can either export an existing shell variable, or you can define and export a variable in a single step.

**Method 1: Two-Step Export**
You define the variable as a standard shell variable first, and then promote it later in your script when you know a child process will need it.

```bash
# 1. Define a local shell variable
DATABASE_URL="postgres://user:pass@localhost:5432/mydb"

# 2. Promote it to the environment
export DATABASE_URL

```

**Method 2: Single-Step Export**
This is the most common and concise method. You declare the variable and promote it simultaneously.

```bash
# Define and export in one line
export API_KEY="a1b2c3d4e5f6"

```

Once exported, any script or command run from that shell will have access to `$DATABASE_URL` and `$API_KEY`.

### Viewing Exported Variables

If you want to see a list of all variables that have been explicitly exported in your current shell session, you can use the `-p` (print) flag. This outputs the variables in a format that can be reused as input.

```bash
export -p

```

**Output snippet:**

```text
declare -x API_KEY="a1b2c3d4e5f6"
declare -x DATABASE_URL="postgres://user:pass@localhost:5432/mydb"
declare -x HOME="/home/developer"
declare -x PATH="/usr/local/bin:/usr/bin:/bin"

```

*(Note: `declare -x` is the internal Bash representation of an exported variable; the `-x` stands for export).*

### Demoting and Removing Variables

Sometimes you may want to revoke a variable's environment status so that future child processes do not inherit it, without deleting the variable's value from your current shell. You can do this using the `-n` flag.

```bash
# Demote the variable back to a local shell variable
export -n API_KEY

# The variable still exists in the parent shell...
echo $API_KEY 
# Output: a1b2c3d4e5f6

# ...but a child process will no longer see it
bash -c 'echo "Child sees: $API_KEY"'
# Output: Child sees: 

```

If you want to completely destroy the variable—removing it from both the current shell and the environment—use the `unset` command instead:

```bash
unset DATABASE_URL

```

### The "One-Way Street" Rule

The most common misconception about `export` is that it makes a variable "globally" available to the entire system. This is fundamentally incorrect.

> **Crucial Concept:** The `export` command only passes data **down** the process tree, never **up**.

A child process can never alter the environment of its parent process. If you run a script that exports a variable, that variable exists only for the duration of that script and for any children *that script* spawns. Once the script finishes, it terminates, and its environment is destroyed. The parent shell that launched the script remains completely unaffected.

```bash
# inside child_script.sh
export SECRET="I am hidden"

```

```bash
# Back in your terminal (the parent shell)
./child_script.sh
echo "The secret is: $SECRET"

```

**Output:**

```text
The secret is: 

```

To bring variables from a file *into* your current shell's environment, you must execute the file within the current shell's context using the `source` command (or the `.` operator), which we will explore in Section 14.3 when discussing startup files.

## 14.3 Startup Files (`.bashrc`, `.bash_profile`)

In the previous sections, we learned how to use `export` to modify the environment. However, any variables or aliases you define directly in your terminal vanish the moment you close that session. To make your environment configurations permanent, you must place them inside Bash **startup files**.

Whenever a Bash shell starts, it reads a specific sequence of hidden configuration files to set up its environment before giving you a prompt. Which files it reads depends entirely on *how* the shell was started.

### The Two Types of Interactive Shells

To understand startup files, you must first understand the difference between the two main types of interactive shells:

1. **Login Shells:** A shell started after you successfully authenticate. Examples include logging into a remote server via SSH, dropping into a basic TTY virtual console, or (by default) opening a new terminal window on macOS.
2. **Interactive Non-Login Shells:** A shell started after you have already logged in. The most common example is opening a new terminal tab or window in a Linux graphical desktop environment (like GNOME Terminal or Konsole), or typing `bash` inside an existing terminal.

### The Execution Order

Bash follows a strict flow to determine which configuration files to execute. The diagram below illustrates the typical load order for a standard user session.

```text
+-----------------------------------------------------------+
|                     SYSTEM-WIDE FILES                     |
|                (Applied to all users first)               |
+-----------------------------------------------------------+
        |                                       |
  [Login Shell]                        [Non-Login Shell]
        V                                       V
   /etc/profile                           /etc/bash.bashrc
        |                                       |
+-----------------------------------------------------------+
|                     USER-SPECIFIC FILES                   |
|              (Overrides system-wide settings)             |
+-----------------------------------------------------------+
        |                                       |
  [Login Shell]                        [Non-Login Shell]
        V                                       V
 Looks for the FIRST                     Looks ONLY for:
 file it can find in                     
 this exact order:                       ~/.bashrc
   1. ~/.bash_profile                           |
   2. ~/.bash_login                             |
   3. ~/.profile                                |
        |                                       |
        +-------------------+-------------------+
                            |
                            V
                     [Bash Prompt]

```

> **Note on Non-Interactive Shells:** When you execute a shell script (e.g., `./myscript.sh`), Bash runs in a *non-interactive* mode. It bypasses the files above and looks for the environment variable `$BASH_ENV` to determine if a startup file should be run, though this is rarely used in standard script execution.

### Demystifying the Core Files

#### `~/.bash_profile` (or `~/.profile`)

This file is executed **only once** upon logging in. Because it is executed at the very beginning of your session, it is the ideal place to put environment variables (`export PATH`, `export EDITOR`) that should be inherited by all child processes, including graphical applications.

* *Note:* If `~/.bash_profile` does not exist, Bash will look for `~/.profile`, which is a universal profile read by other shells like `sh` and `dash`.

#### `~/.bashrc`

This file is executed every time you open an interactive **non-login** shell. Because environment variables are already inherited from the login shell, `~/.bashrc` is strictly meant for things that are *not* inherited by child processes. This includes:

* Shell Variables (unexported)
* Aliases (e.g., `alias ll='ls -al'`)
* Custom Prompt configurations (`PS1`)
* Shell functions

### The "Sourcing" Best Practice

A common developer frustration occurs when setting up a new machine: you put all your aliases in `~/.bashrc`, but when you log in via SSH (a login shell), your aliases do not work. This happens because a login shell reads `~/.bash_profile` and completely ignores `~/.bashrc`.

To solve this, the universal best practice is to have your login shell manually load your non-login configuration. You do this by **sourcing** your `~/.bashrc` from within your `~/.bash_profile`.

Here is the standard boilerplate snippet you should include in your `~/.bash_profile`:

```bash
# inside ~/.bash_profile

# If ~/.bashrc exists, execute it in the current shell context
if [ -f ~/.bashrc ]; then
    source ~/.bashrc
fi

# Export environment variables below
export PATH="$HOME/bin:$PATH"
export EDITOR="vim"

```

### Applying Changes with `source`

When you edit `~/.bashrc` or `~/.bash_profile`, the changes do not take effect in your current terminal window because the startup files have already been read.

Instead of closing the terminal and opening a new one, you can instruct your current Bash session to re-read the file using the `source` command (or its shorthand equivalent, a single period `.`).

```bash
# Re-load the bashrc file in the current session
source ~/.bashrc

# Shorthand version doing the exact same thing
. ~/.bashrc

```

The `source` command reads and executes commands from the specified file within the *current* shell environment, which is why it can successfully update your existing variables and aliases.

## 14.4 Creating and Managing Aliases

As you spend more time in the terminal, you will likely find yourself typing the same long, complex commands repeatedly. Bash provides a built-in mechanism called **aliases** to help you reduce keystrokes and work more efficiently. An alias is simply a custom shortcut—a user-defined string that the shell replaces with a longer command string before execution.

### Creating an Alias

You create an alias using the `alias` built-in command. The syntax is strict: there must be **no spaces** on either side of the equals sign.

```bash
alias name='command_to_run'

```

It is highly recommended to enclose the command string in single quotes (`'`). This prevents Bash from prematurely expanding variables or shell metacharacters when the alias is *defined*, ensuring they are only expanded when the alias is *executed*.

Here are a few common, highly useful aliases to illustrate the concept:

```bash
# A safer version of remove that prompts before deleting
alias rm='rm -i'

# A detailed, human-readable directory listing
alias ll='ls -alhF'

# Quickly navigate up the directory tree
alias ..='cd ..'
alias ...='cd ../..'

# A shortcut for a frequent Git command
alias gs='git status'

```

Once defined, you can type the alias exactly as if it were a standard program. When you type `ll`, Bash intercepts it, expands it to `ls -alhF`, and executes that instead.

### Viewing and Managing Current Aliases

If you want to see all the aliases currently active in your shell, simply type `alias` by itself:

```bash
alias

```

**Output snippet:**

```text
alias ..='cd ..'
alias grep='grep --color=auto'
alias ll='ls -alhF'
alias rm='rm -i'

```

To see the definition of a specific alias, pass its name as an argument:

```bash
alias ll
# Output: alias ll='ls -alhF'

```

### Bypassing and Removing Aliases

Because it is common to alias a command to itself with added flags (like `alias rm='rm -i'`), there will be times when you need to run the original, un-aliased command. You can temporarily bypass an alias in three ways:

1. **Escape it with a backslash:** `\rm file.txt`
2. **Quote it:** `'rm' file.txt`
3. **Use the full path:** `/bin/rm file.txt`

If you want to permanently remove an alias for the remainder of your session, use the `unalias` command:

```bash
# Remove a specific alias
unalias gs

# Remove ALL currently defined aliases
unalias -a

```

### Making Aliases Permanent

Just like shell variables defined in the terminal, aliases are confined to the current shell session. If you close your terminal window, your newly minted shortcuts will disappear.

To make an alias permanent, you must tie into the concepts learned in Section 14.3. You need to add your `alias` definitions to your `~/.bashrc` file.

```bash
# Open your bashrc file
nano ~/.bashrc

# Add your aliases at the bottom of the file
alias update='sudo apt update && sudo apt upgrade'

# Save, exit, and reload the file
source ~/.bashrc

```

*Note:* If you find yourself accumulating dozens of aliases, it is a common convention to create a separate file named `~/.bash_aliases` and source *that* file from within your `~/.bashrc` to keep things organized.

### Aliases vs. Shell Functions

While aliases are fantastic for simple text substitution, they have a major limitation: **they do not accept positional arguments gracefully.**

If you append arguments to an alias, Bash simply tacks them onto the very end of the expanded string. You cannot place arguments *inside* the alias string. If you need dynamic logic or need to insert user input into the middle of a command, you must use a shell function (as covered in Chapter 10) instead of an alias.

| Feature | Alias | Shell Function |
| --- | --- | --- |
| **Best used for** | Simple string substitution, adding default flags to commands. | Complex logic, multiple steps, passing arguments. |
| **Argument Handling** | Appends arguments to the end only. Cannot use `$1`, `$2`, etc. | Full support for positional parameters (`$1`, `$2`). |
| **Complexity** | Very low. One-liners only. | High. Can use loops, variables, and conditionals. |

**Example of when an alias fails:**
You want a shortcut to create a directory and immediately `cd` into it.
An alias like `alias mkcd='mkdir $1 && cd $1'` will **fail** because aliases do not understand `$1`.

Instead, you use a function in your `~/.bashrc`:

```bash
mkcd() {
    mkdir -p "$1"
    cd "$1"
}

```

## 14.5 Customizing the Bash Prompt

Every time your terminal waits for your input, it displays a line of text known as the prompt. While the default prompt provides basic information, customizing it can drastically improve your workflow by providing immediate context—such as the time, your current Git branch, or the exit status of the last command.

In Bash, the primary prompt is controlled by a dedicated environment variable called `PS1` (Prompt String 1). By modifying this variable, you can completely change the look and behavior of your command line.

### The Anatomy of `PS1`

If you type `echo $PS1` in your terminal, you will likely see a confusing string of backslashes and letters. Bash uses special escape sequences to represent dynamic data within the prompt string.

Here are the most common and useful escape sequences:

| Sequence | Description | Example Output |
| --- | --- | --- |
| `\u` | The username of the current user. | `alice` |
| `\h` | The hostname up to the first dot. | `dev-server` |
| `\H` | The full hostname. | `dev-server.local` |
| `\w` | The current working directory (uses `~` for home). | `~/projects/app` |
| `\W` | The basename of the current working directory. | `app` |
| `\t` | The current time in 24-hour HH:MM:SS format. | `14:30:05` |
| `\d` | The date in "Weekday Month Date" format. | `Tue May 05` |
| `\$` | Displays `#` if the user is root (UID 0), otherwise `$`. | `$` |
| `\n` | Inserts a newline character. | (moves to next line) |

By combining these sequences with standard text, you can build your prompt. For instance, the default prompt on many Linux distributions looks like this:

```bash
PS1="\u@\h:\w\$ "

```

This translates to: `username@hostname:~/current/dir$ `

### Testing Custom Prompts

Because `PS1` is just a variable, you can test new prompts in your current session without breaking anything permanently. If you make a mistake, simply closing the terminal or opening a new tab will revert to your default.

Let's test a prompt that puts the time, the directory, and the input on separate lines:

```bash
export PS1="[\t] \w\n\$ "

```

**Resulting Prompt:**

```text
[14:35:12] ~/projects/bash_scripts
$ 

```

### Adding Colors

A monochrome prompt can make it difficult to distinguish where your command output ends and your next prompt begins. Bash allows you to add colors using ANSI escape codes, though the syntax requires careful attention.

An ANSI color code usually looks like `\e[32m` (which sets the text to green) and `\e[0m` (which resets the text formatting back to default).

> **Crucial Rule:** When adding non-printing characters (like color codes) to `PS1`, you **must** wrap them in `\[` and `\]`. This tells Bash that these characters do not take up visual space. If you forget these brackets, Bash will miscalculate the length of your prompt, causing text to overwrite itself when you type long commands or use the up-arrow to cycle through history.

**Standard ANSI Color Codes:**

* Red: `\[\e[31m\]`
* Green: `\[\e[32m\]`
* Yellow: `\[\e[33m\]`
* Blue: `\[\e[34m\]`
* Cyan: `\[\e[36m\]`
* Reset: `\[\e[0m\]`

Let's build a colorful prompt. We want the username in green, the directory in blue, and the dollar sign in standard text:

```bash
export PS1="\[\e[32m\]\u\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ "

```

While powerful, reading and writing these raw strings can be tedious. A common trick in scripting is to define variables for your colors first:

```bash
GREEN="\[\e[32m\]"
BLUE="\[\e[34m\]"
RESET="\[\e[0m\]"

export PS1="${GREEN}\u${RESET}:${BLUE}\w${RESET}\$ "

```

### Making the Prompt Permanent

Once you have designed your ideal prompt, you need to make it survive system reboots and new terminal sessions. Drawing on what we learned in Section 14.3, you will save this configuration in your `~/.bashrc` file.

Open `~/.bashrc` in your preferred text editor, scroll to the bottom, and add your `PS1` export statement:

```bash
# Inside ~/.bashrc
export PS1="\[\e[36m\]\u@\h\[\e[0m\]:\[\e[33m\]\w\[\e[0m\]\$ "

```

Save the file and run `source ~/.bashrc`. Your custom, colorful prompt is now the default for all future interactive non-login shells.

### `PS2`: The Secondary Prompt

While `PS1` is the star of the show, it is worth knowing about `PS2`. This is the "secondary prompt," which Bash displays when a command expects further input. You see this most often when you type a command, end a line with a backslash `\`, and hit Enter to continue typing on the next line.

The default value for `PS2` is `> `.

```bash
$ echo "This is a very \
> long string."

```

You can customize `PS2` exactly like `PS1`. For example, if you prefer an arrow indicating continuation:

```bash
export PS2="---> "

```