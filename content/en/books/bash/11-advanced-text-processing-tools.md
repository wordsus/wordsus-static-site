Welcome to the powerhouse of Bash scripting. You already know how to read, search, and redirect text; now, it's time to transform it. Real-world data rarely arrives in the exact format you need. Whether parsing server logs or cleaning CSV files, manual editing isn't an option for automated scripts.

This chapter introduces the core quartet of Unix text manipulation: `sed`, `awk`, `cut`, and `tr`. These battle-tested utilities are purpose-built for slicing, translating, and reshaping streams of data. Mastering them bridges the gap between simply viewing information and dynamically controlling it on the fly.

## 11.1 Stream Editing with `sed`

While interactive text editors like `nano` or `vim` are great for manual file modifications, they are useless in automated scripts. Enter `sed`, the **s**tream **ed**itor. Instead of opening a file and waiting for keystrokes, `sed` processes text automatically as it flows through a pipeline or is read from a file.

`sed` operates on a simple, line-by-line processing model known as the **Pattern Space**:

```text
  [Input Stream]      1. Read next line into Pattern Space
        │
        ▼
+---------------+     2. Apply script/commands to the Pattern Space
│ Pattern Space │
+---------------+     3. Output the Pattern Space to standard output (stdout)
        │                (unless suppressed)
        ▼
 [Output Stream]      4. Repeat until the end of the file/stream

```

### Basic Syntax

The general syntax for `sed` is:

```bash
sed [options] 'script' [input_file]

```

If you don't specify an input file, `sed` reads from standard input (stdin), making it a perfect companion for the pipelines you learned about in Chapter 5.

### The Substitution Command (`s`)

The most common use of `sed` is text substitution. The `s` command allows you to search for a pattern and replace it with something else.

```bash
sed 's/search_pattern/replacement_string/' filename

```

By default, the `s` command only replaces the **first occurrence** of the pattern on each line.

```bash
$ echo "apple banana apple" | sed 's/apple/orange/'
orange banana apple

```

#### Substitution Flags

To change the behavior of the substitution, you append flags after the final delimiter.

* **`g` (Global):** Replaces *all* occurrences on a line, not just the first.

```bash
$ echo "apple banana apple" | sed 's/apple/orange/g'
orange banana orange

```

* **`p` (Print):** Prints the modified line. This is almost always used with the `-n` option.
* **`i` or `I` (Case-Insensitive):** Ignores case when matching the search pattern (GNU `sed` extension).

#### Changing the Delimiter

The forward slash `/` is the traditional delimiter for the `s` command. However, if your search pattern or replacement string contains file paths, escaping all the slashes becomes an unreadable mess (often called "leaning toothpick syndrome"):

```bash
# Hard to read:
sed 's/\/var\/log\/syslog/\/var\/log\/messages/g' paths.txt

```

`sed` allows you to use almost any character as a delimiter. Common alternatives are `|`, `:`, or `#`:

```bash
# Much cleaner:
sed 's|/var/log/syslog|/var/log/messages|g' paths.txt

```

### Addressing: Targeting Specific Lines

By default, `sed` applies your commands to every line in the file. You can restrict commands to specific lines using **addresses** placed just before the command.

**By Line Number:**

```bash
# Only substitute 'error' with 'warning' on line 5
sed '5s/error/warning/' script.log

# Substitute from line 10 to line 20
sed '10,20s/error/warning/' script.log

```

**By Pattern (Regex):**
You can apply a command only to lines that match a specific pattern by enclosing the pattern in slashes. (We will cover regular expressions deeply in Chapter 12, but simple string matches work perfectly here).

```bash
# Find lines containing "CRITICAL", and on those lines, replace "user" with "admin"
sed '/CRITICAL/s/user/admin/g' app.log

```

### Deletion (`d`) and Printing (`p`)

`sed` isn't just for substitution. You can use it to filter lines out of a stream.

**The `d` (Delete) command:**
Removes the contents of the pattern space. The line is not printed.

```bash
# Delete the first line of the file (useful for removing CSV headers)
sed '1d' data.csv

# Delete lines 1 through 5
sed '1,5d' data.csv

# Delete any line containing the word "DEBUG"
sed '/DEBUG/d' app.log

```

**The `p` (Print) command and the `-n` option:**
By default, `sed` prints every line it processes. If you pass the `-n` option, `sed` suppresses this automatic printing. You can then use the `p` command to print *only* the lines you explicitly want.

```bash
# Print ONLY lines 5 through 10
sed -n '5,10p' large_file.txt

# Print ONLY lines containing "ERROR" (similar to basic grep)
sed -n '/ERROR/p' app.log

```

### In-Place Editing (`-i`)

So far, all our `sed` commands have sent their output to the terminal. To actually save the changes back to the original file, you use the `-i` (in-place) option.

**Warning:** Using `-i` permanently alters the file.

```bash
# Modifies config.txt directly
sed -i 's/localhost/127.0.0.1/g' config.txt

```

**A crucial cross-platform gotcha:** The `-i` flag behaves differently depending on whether you are using GNU `sed` (standard on Linux) or BSD `sed` (standard on macOS).

* On **Linux**, `sed -i 's/a/b/' file` works perfectly.
* On **macOS**, `sed -i` requires you to provide an extension for a backup file. To do it without a backup, you must provide an empty string: `sed -i '' 's/a/b/' file`.

To write cross-platform scripts, developers often redirect to a temporary file and move it back, or use tools like `perl` or `awk` to avoid this discrepancy.

### Using Shell Variables in `sed`

Because `sed` scripts are typically wrapped in single quotes (`'...'`), the shell will not expand variables inside them (as discussed in Chapter 7). If you need to pass a bash variable into a `sed` command, you must use double quotes (`"..."`).

```bash
OLD_VERSION="v1.0"
NEW_VERSION="v1.1"

# Using double quotes allows Bash to expand the variables before sed runs
sed -i "s/$OLD_VERSION/$NEW_VERSION/g" package.json

```

Be careful when using double quotes: if your `sed` script utilizes shell special characters like `$` (which in `sed` denotes the end of a line), you will need to escape them (`\$`) so Bash doesn't try to evaluate them before `sed` sees them.

## 11.2 Pattern Scanning and Processing with `awk`

If `sed` is your tool for modifying streams of text horizontally, `awk` is your tool for slicing and analyzing text vertically. Named after its creators (Aho, Weinberger, and Kernighan), `awk` is not just a command; it is a complete, data-driven programming language designed specifically for text processing and reporting.

`awk` excels when dealing with structured or tabular data—like CSV files, system logs, or the output of commands like `ls -l` or `ps aux`.

### The `awk` Data Model: Records and Fields

To use `awk` effectively, you must understand how it interprets text. By default, `awk` processes input one line at a time.

* **Record:** A single line of input. `awk` refers to the entire current record using the special variable `$0`.
* **Field:** A word or column within that record. By default, `awk` splits records into fields based on whitespace (spaces or tabs). Fields are accessed using `$1`, `$2`, `$3`, and so on.

```text
Record ($0) ────────────────────────────────────────────────────────┐
                                                                    │
          Field ($1)  Field ($2)  Field ($3)  Field ($4) Field ($5) │
          ▼           ▼           ▼           ▼          ▼          │
Line 1:   drwxr-xr-x  2           root        root       4096       │
Line 2:   -rw-r--r--  1           admin       staff      128        │

```

### Basic Syntax

The fundamental structure of an `awk` program is a series of patterns and actions:

```bash
awk 'pattern { action }' input_file

```

* **Pattern:** Determines *which* records the action applies to. If you omit the pattern, the action applies to *every* record.
* **Action:** Enclosed in curly braces `{ }`, this defines *what* to do with the matched records. If you omit the action, the default is to print the entire record (`{ print $0 }`).

### Field Extraction (The Action)

The most common use of `awk` is extracting specific columns from data.

```bash
# Print only the 1st and 3rd columns from a file
awk '{ print $1, $3 }' data.txt

```

Notice the comma `,` in the `print` statement. This tells `awk` to separate the output fields with an Output Field Separator (OFS), which is a single space by default. If you omit the comma (`print $1 $3`), the fields will be mashed together without spaces.

You can also mix plain text with fields:

```bash
$ echo "Alice 85" | awk '{ print "Student:", $1, "- Score:", $2 }'
Student: Alice - Score: 85

```

### Changing the Field Separator (`-F`)

System files rarely use spaces as delimiters. For instance, `/etc/passwd` uses colons (`:`), and CSV files use commas (`,`). You can tell `awk` how to split fields using the `-F` option.

```bash
# Print the username ($1) and default shell ($7) from /etc/passwd
awk -F':' '{ print $1, $7 }' /etc/passwd

# Parse a CSV file (assuming no quoted commas)
awk -F',' '{ print $2 }' data.csv

```

### Filtering Rows (The Pattern)

You can restrict your actions to specific rows by providing a pattern before the curly braces.

**Regular Expression Matching:**
Enclose a regex pattern in slashes `/pattern/`.

```bash
# Only print the 2nd field if the line contains "ERROR"
awk '/ERROR/ { print $2 }' server.log

```

**Relational Operators:**
Because `awk` understands numbers, you can use operators like `==`, `>`, `<`, `>=`, `<=`, and `!=` on specific fields.

```bash
# Print the 1st field only if the value in the 3rd field is greater than 100
awk '$3 > 100 { print $1 }' inventory.txt

# Print the entire record if the 1st field exactly matches "root"
awk -F':' '$1 == "root" { print $0 }' /etc/passwd

```

### Built-in Variables: `NR` and `NF`

`awk` provides several extremely useful built-in variables that maintain the state of the processing loop:

* **`NR` (Number of Records):** This variable keeps track of the current line number being processed.
* **`NF` (Number of Fields):** This variable holds the total number of fields in the *current* record.

**Using `NR` for line numbers:**

```bash
# Prepend the line number to the output
awk '{ print NR, $0 }' list.txt

# Skip the first line (header) of a CSV and print the rest
awk -F',' 'NR > 1 { print $1 }' data.csv

```

**Using `NF` for dynamic field access:**
Because `NF` is the total number of fields, `$NF` translates to "the value of the last field," regardless of how long the line is.

```bash
# Print the last column of every line
awk '{ print $NF }' jagged_data.txt

# Print the second-to-last column
awk '{ print $(NF-1) }' jagged_data.txt

```

### The `BEGIN` and `END` Blocks

Sometimes you need to execute code *before* any data is read, or *after* all data has been processed. `awk` provides two special patterns for this: `BEGIN` and `END`.

* `BEGIN { ... }`: Executes once before the first record is read. Perfect for printing headers or initializing variables.
* `END { ... }`: Executes once after the last record is read. Perfect for printing footers, summaries, or calculated totals.

**Example: Summing a Column**
Because variables in `awk` are automatically initialized to zero and dynamically typed, calculating the sum of a column is incredibly succinct.

```bash
# Assuming file.txt contains a list of file sizes in the 5th column
awk '
    BEGIN { print "--- Calculating Total Size ---" }
    { total = total + $5 } 
    END { print "Total bytes:", total }
' file.txt

```

In this script, `total = total + $5` (which can be shortened to `total += $5`) runs for every line, accumulating the sum. Once the file is exhausted, the `END` block triggers, printing the final tally.

## 11.3 Extracting Columns with `cut`

If `awk` is the versatile Swiss Army knife of text processing, `cut` is a highly specialized scalpel. It is designed to do exactly one thing: extract vertical slices of text from a file or standard input.

While `awk` can also extract columns, `cut` is significantly faster, consumes less memory, and is conceptually simpler for straightforward extraction tasks. However, it trades flexibility for this speed.

Here is a visual representation of how `cut` parses and extracts data from a structured string:

```text
Input Line:   root:x:0:0:root:/root:/bin/bash
              └─┬┘ ├┘│ │ └─┬┘ └─┬─┘ └──┬────┘
Field (#):      1  2 3 4   5    6      7

Command:      cut -d ':' -f 1,7
Output:       root:/bin/bash

```

### Extracting by Fields (`-f`) and Delimiters (`-d`)

By default, `cut` assumes that fields are separated by the **TAB** character. If you are dealing with a TSV (Tab-Separated Values) file, you only need to specify which fields you want using the `-f` flag.

```bash
# Extract the first and third columns of a tab-separated file
cut -f 1,3 data.tsv

```

For most system configurations and CSV files, the delimiter is not a tab. You must define the custom field separator using the `-d` flag.

**Crucial limitation:** `cut` only accepts a **single character** as a delimiter.

```bash
# Extract the username (field 1) and default shell (field 7)
# from /etc/passwd using the colon as a delimiter
cut -d ':' -f 1,7 /etc/passwd

# Extract the second column of a comma-separated file
cut -d ',' -f 2 data.csv

```

#### Specifying Field Ranges

The `-f` flag is highly flexible when it comes to selecting multiple columns. You can use commas for distinct fields and hyphens for ranges:

* **`cut -f 2`**: Only the 2nd field.
* **`cut -f 1,4,5`**: The 1st, 4th, and 5th fields.
* **`cut -f 2-5`**: Fields 2 through 5 inclusive.
* **`cut -f 3-`**: Field 3 and everything until the end of the line.
* **`cut -f -4`**: From the beginning of the line up to field 4.

```bash
# Get the first three columns of a CSV
cut -d ',' -f -3 inventory.csv

```

**Note:** `cut` always outputs the extracted fields in the order they appear in the original file, regardless of how you ask for them. `cut -f 3,1` will output field 1 followed by field 3. If you need to reorder columns, you must use `awk`.

### Extracting by Character Position (`-c`)

Sometimes data isn't separated by delimiters, but rather structured by fixed widths (character counts). The `-c` flag allows you to slice text based on absolute character positions.

The syntax for ranges with `-c` works exactly the same as with `-f`.

```bash
# Extract the first 10 characters of every line (e.g., file permissions from ls -l)
ls -l | cut -c 1-10

# Extract from character 15 to character 25
cat fixed_width_data.txt | cut -c 15-25

```

### The "Multiple Spaces" Trap

The most common trap developers fall into with `cut` involves processing command output that aligns columns using multiple spaces, such as the output of `ls -l` or `df -h`.

`cut` treats *every single delimiter* as a field boundary. If there are three spaces between two words, `cut` sees two empty fields between them.

```bash
# This string has multiple spaces between words
$ echo "File      Size" | cut -d ' ' -f 2
# Output is empty, because field 2 is a blank space!

```

**The Rule of Thumb:**

* If your data has a **strict, single-character delimiter** (like `:`, `,`, or a single tab), use `cut`. It is faster and cleaner.
* If your data is separated by **variable amounts of whitespace**, abandon `cut` and use `awk`. `awk` treats any contiguous block of whitespace as a single delimiter by default.

```bash
# Failing with cut:
$ df -h | cut -d ' ' -f 5  # Produces erratic, broken output

# Succeeding with awk:
$ df -h | awk '{ print $5 }' # Cleanly extracts the 5th column

```

## 11.4 Translating Characters with `tr`

While `sed` handles strings, `awk` handles records, and `cut` handles columns, `tr` (translate) operates at the most fundamental level: individual characters. It is a streamlined, fast utility designed exclusively to translate, squeeze, or delete characters from standard input.

**A crucial distinction:** Unlike `sed`, `awk`, or `cut`, the `tr` command does *not* accept file names as arguments. It only reads from standard input (stdin). You must use input redirection (`<`) or pipes (`|`) to feed it data.

### The 1-to-1 Mapping Model

At its core, `tr` takes two sets of characters. It looks for characters in the first set and replaces them with the corresponding characters in the second set.

```text
Set 1 (Search):      a  b  c  d  e
                     │  │  │  │  │
                     ▼  ▼  ▼  ▼  ▼
Set 2 (Replace):     1  2  3  4  5

Input:   "bad"
Output:  "214"

```

### Basic Character Translation

The basic syntax for translation is:

```bash
tr 'SET1' 'SET2'

```

The most common use case for basic translation is converting text between lowercase and uppercase. You can define sets using literal characters or ranges separated by a hyphen.

```bash
# Convert lowercase to uppercase
$ echo "hello world" | tr 'a-z' 'A-Z'
HELLO WORLD

# Replace colons with spaces
$ echo "root:x:0:0:root" | tr ':' ' '
root x 0 0 root

# Scramble vowels (a->e, e->i, i->o, o->u, u->a)
$ echo "sequoia" | tr 'aeiou' 'eioua'
siqauee

```

If Set 1 is longer than Set 2, `tr` will simply repeat the last character of Set 2 to make up the difference.

### Deleting Characters (`-d`)

If you want to strip specific characters entirely, use the `-d` (delete) flag. When using `-d`, you only provide Set 1.

```bash
# Delete all vowels from the string
$ echo "Bash Scripting" | tr -d 'aeiou'
Bsh Scrptng

# Remove all numbers from a file
$ cat data.txt | tr -d '0-9'

```

**Practical Application: Fixing Windows Line Endings**
Windows and Linux handle newlines differently. Linux uses a single Line Feed character (`\n`), while Windows uses a Carriage Return followed by a Line Feed (`\r\n`). If you edit a script in Windows and move it to Linux, you will often get strange execution errors because Bash tries to interpret the hidden `\r` character. `tr` offers a quick fix:

```bash
# Strip all carriage returns from a file and save to a new file
cat windows_script.sh | tr -d '\r' > linux_script.sh

```

### Squeezing Repeating Characters (`-s`)

The `-s` (squeeze) flag replaces a sequence of repeated characters with a single instance of that character.

Remember the "Multiple Spaces Trap" from Section 11.3, where `cut` failed to process columns separated by variable spaces? The `tr` command provides the perfect workaround. You can use `tr` to squeeze all multiple spaces into a single space, creating a clean delimiter for `cut`.

```bash
# The original output with irregular spacing:
$ df -h | head -n 2
Filesystem      Size  Used Avail Use% Mounted on
tmpfs           793M  1.7M  791M   1% /run

# Squeeze the spaces, then pipe to cut:
$ df -h | head -n 2 | tr -s ' ' | cut -d ' ' -f 5
Use%
1%

```

### Complementing Sets (`-c`)

The `-c` (complement) flag inverts Set 1. It tells `tr` to operate on every character *except* the ones you specified. This is incredibly powerful when combined with deletion.

```bash
# Delete everything EXCEPT numbers and newlines
# (Without keeping '\n', all numbers would mash onto one line)
$ echo "User123 logged in at port 8080." | tr -cd '0-9\n'
1238080

# Replace everything EXCEPT letters with an underscore
$ echo "my_file-name v2.txt" | tr -c 'a-zA-Z\n' '_'
my_file_name_v__txt

```

### Character Classes

To make your scripts more readable and robust, especially when dealing with different locales, `tr` supports POSIX character classes. These must be enclosed in an extra set of brackets.

Common classes include:

* `[:alnum:]`: Letters and digits.
* `[:alpha:]`: Letters only.
* `[:digit:]`: Digits only.
* `[:space:]`: Whitespace (spaces, tabs, newlines).
* `[:punct:]`: Punctuation characters.

```bash
# Convert all letters to uppercase using classes
$ echo "secure_password_123" | tr '[:lower:]' '[:upper:]'
SECURE_PASSWORD_123

# Squeeze all types of whitespace (tabs, multiple spaces) into a single space
$ cat messy_file.txt | tr -s '[:space:]' ' '

```
