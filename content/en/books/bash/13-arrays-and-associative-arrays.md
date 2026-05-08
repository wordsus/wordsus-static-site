Until now, our variables have stored single values. As your scripts tackle complex problems, you must manage collections of data. Arrays solve this by storing multiple items under a single identifier, perfect for handling file lists or configuration sets.

This chapter explores Bash's two array types. First, we will cover **indexed arrays**, which organize elements sequentially using numerical indices. Next, we explore **associative arrays**, acting like dictionaries to store key-value pairs using string keys. We will walk through creating, modifying, slicing, and iterating over both structures to vastly expand your scripting capabilities.

## 13.1 Indexed Arrays: Creation and Assignment

While standard variables in Bash hold a single string or integer, arrays allow you to store multiple values under a single identifier. Bash supports two types of arrays: indexed and associative. Indexed arrays are numerically driven, using integers as their keys (indices) to store and retrieve values. By default, Bash indexed arrays are zero-indexed, meaning the first element is assigned to index 0.

Unlike arrays in many lower-level programming languages, Bash indexed arrays are dynamic and sparse. You do not need to define their size upfront, and you do not need to assign values to contiguous memory locations.

### Declaring an Indexed Array

Strictly speaking, Bash does not require you to explicitly declare an indexed array before using it. Assigning a value to an index automatically creates the array. However, declaring it explicitly is a best practice that improves script readability and prevents variable type conflicts.

Use the `declare` built-in command with the `-a` flag:

```bash
declare -a my_array

```

This creates an empty indexed array named `my_array`.

### Method 1: Compound Assignment

The most common and efficient way to create and populate an array simultaneously is through compound assignment. You enclose the list of elements in parentheses `()`, separated by spaces.

```bash
# Creating and assigning elements in one step
operating_systems=("Linux" "macOS" "Windows" "FreeBSD")

```

Because Bash uses spaces as the delimiter for array elements, you must rely on the quoting rules covered in Chapter 7 to assign strings containing spaces to a single index:

```bash
# Correct: Elements with spaces are enclosed in quotes
web_servers=("Apache HTTP Server" "Nginx" "Lighttpd")

```

### Method 2: Individual Index Assignment

You can assign values to an array one element at a time by specifying the index in square brackets `[]`. This method is useful when building an array dynamically inside a loop or based on conditional logic.

```bash
declare -a user_roles

user_roles[0]="Admin"
user_roles[1]="Editor"
user_roles[2]="Viewer"

```

### Method 3: Sparse Assignment

Because Bash arrays are sparse, you are not forced to assign elements sequentially. You can assign values to arbitrary indices, leaving gaps in between. To do this during a compound assignment, specify the index inside brackets followed by an equals sign:

```bash
# Creating a sparse array using compound assignment
error_codes=([0]="Success" [404]="Not Found" [500]="Server Error")

```

*Memory Structure of a Sparse Array:*

```text
Index:   [0]        [1] ... [403]   [404]         [405] ... [499]   [500]
Value:   "Success"  NULL    NULL    "Not Found"   NULL      NULL    "Server Error"

```

*Note: Bash does not allocate memory for the empty indices (1-403, 405-499). It only stores the explicitly assigned key-value pairs.*

### Creating Arrays from Command Output

You will often need to create arrays from the output of other commands or file expansions.

**Using Globbing:**
You can populate an array with a list of files in a directory using standard shell globbing. Bash expands the wildcard into a space-separated list, which the compound assignment perfectly ingests:

```bash
# Assigns all .log files in the current directory to the array
log_files=(*.log)

```

**Using `readarray` (or `mapfile`):**
When reading lines from a file or command output, command substitution `my_array=$(command)` is generally avoided because it breaks elements on spaces, not just newlines. Instead, the `readarray` (synonymous with `mapfile`) command is the safest way to assign multiline output to an array, ensuring that each line becomes exactly one array element.

```bash
# Reads the contents of servers.txt into an array, line by line
readarray -t server_list < servers.txt

```

*(The `-t` flag strips the trailing newline characters from each assigned element).*

### Verifying Array Assignment

While Chapter 13.2 will cover accessing array elements in detail, you can easily verify that your array was created and assigned correctly using the `declare -p` command. This will print the array's type, indices, and values.

```bash
colors=("Red" "Green" "Blue")
declare -p colors

```

**Output:**

```bash
declare -a colors=([0]="Red" [1]="Green" [2]="Blue")

```

## 13.2 Accessing and Modifying Array Elements

Once an array is populated, you need to know how to retrieve its data safely and manipulate its contents. Bash provides specific parameter expansion syntax to handle array indices without confusing them with standard variables.

### Accessing Individual Elements

To retrieve a value from a specific index, you must enclose the variable name and its index within curly braces `${}`.

```bash
distros=("Ubuntu" "Fedora" "Arch")

# Correct access
echo "My favorite is ${distros[1]}"  # Outputs: Fedora

```

**Why are the curly braces required?**
If you attempt to use standard variable expansion like `$distros[1]`, Bash interprets `$distros` as a reference to the first element (index 0) of the array, and then literally appends the string `[1]` to the output.

```bash
# Incorrect access
echo "My favorite is $distros[1]"    # Outputs: Ubuntu[1]

```

*Note: Referencing an array name without an index (e.g., `$distros`) will always return the element at index 0. This is a common source of bugs in shell scripts.*

### Accessing All Elements

You will frequently need to output or process the entire array at once. Bash provides two special subscripts for this: `@` and `*`.

While both expand to all elements of the array, their behavior differs significantly when enclosed in double quotes, mirroring the behavior of the special parameters `$@` and `$*` covered in Chapter 7.

* `"${array[@]}"`: Expands each element as a separate, distinct word. This is almost always the method you want to use, especially when iterating through arrays or passing them to commands.
* `"${array[*]}"`: Expands all elements into a single word, separated by the first character of the `IFS` (Internal Field Separator) variable (usually a space).

```bash
files=("document 1.txt" "report.pdf")

# Expands to 2 separate arguments: "document 1.txt" and "report.pdf"
ls -l "${files[@]}" 

# Expands to 1 single argument: "document 1.txt report.pdf"
# (ls will look for a single file with that exact long name and fail)
ls -l "${files[*]}" 

```

### Modifying Existing Elements

Updating an element is as simple as reassigning a value to an existing index. The old value is immediately overwritten.

```bash
servers=("web01" "db01" "cache01")

# Update the database server
servers[1]="db02-replica"

echo "${servers[@]}"
# Outputs: web01 db02-replica cache01

```

### Appending to an Array

To add elements to the end of an array without needing to know the current highest index, use the append operator `+=`. You must wrap the new elements in parentheses, just like compound assignment.

```bash
ports=(80 443)

# Appending new elements
ports+=(8080 8443)

echo "${ports[@]}"
# Outputs: 80 443 8080 8443

```

*Warning: If you omit the parentheses (e.g., `ports+=8080`), Bash will treat `ports` as a standard string variable (specifically index 0) and append the string "8080" directly to the first element's value, changing "80" to "808080".*

### Deleting Elements and Arrays

To remove an element from an array, use the `unset` built-in command followed by the specific index.

Because Bash arrays are sparse (as established in Chapter 13.1), removing an element does not shift the remaining elements down. It simply creates an empty gap at that index.

```bash
tasks=("Build" "Test" "Deploy" "Notify")

# Remove the "Test" step
unset tasks[1]

```

*State of the `tasks` array after `unset`:*

```text
Index:   [0]        [1]        [2]        [3]
Value:   "Build"    <NULL>     "Deploy"   "Notify"

```

If you print the entire array with `"${tasks[@]}"`, Bash will only output `"Build" "Deploy" "Notify"`.

To completely destroy an array and free its memory, use `unset` on the array name without any brackets:

```bash
unset tasks

```

## 13.3 Iterating Through Arrays

Processing the data stored in an array usually involves looping through its elements one by one. In Bash, the `for` loop is the primary tool for this job. Depending on your needs, you can iterate over the values directly, iterate over the indices, or use a traditional C-style loop.

### Iterating Over Values

The most common and robust way to loop through an array is by expanding all of its elements using `"${array[@]}"`. This method safely handles elements that contain spaces, treating each element as a distinct word in the list.

```bash
services=("ssh" "http" "docker" "cron")

for service in "${services[@]}"; do
    echo "Checking status of: $service"
    # systemctl status "$service"
done

```

**The Importance of Quotes:**
Always wrap `${array[@]}` in double quotes. If you omit the quotes (`${array[@]}`), Bash performs word splitting on spaces *within* the elements.

```bash
# Example of why quotes matter
files=("backup 1.tar" "backup 2.tar")

# Incorrect: Without quotes, the loop runs 4 times (backup, 1.tar, backup, 2.tar)
for file in ${files[@]}; do 
    echo "Processing $file"
done

# Correct: With quotes, the loop runs 2 times
for file in "${files[@]}"; do 
    echo "Processing $file"
done

```

### Iterating Over Indices

Sometimes, processing an array requires knowing the index of the current element—perhaps to modify the element in place, or to reference a corresponding element in a parallel array.

By prefixing the array name with an exclamation mark `!`, Bash expands to the list of assigned **indices** rather than the values.

```bash
hostnames=("web-01" "db-01" "cache-01")

for i in "${!hostnames[@]}"; do
    echo "Host at index $i is ${hostnames[$i]}"
    
    # Example: Modifying the element based on its index
    hostnames[$i]="prod-${hostnames[$i]}"
done

```

**Handling Sparse Arrays:**
Iterating over indices using `"${!array[@]}"` is the safest method when dealing with sparse arrays (arrays with gaps in their indices). This loop dynamically skips the empty indices and only iterates over the keys that actually exist.

*Sparse Array Example:*

```bash
error_codes=([0]="Success" [404]="Not Found" [500]="Server Error")

for key in "${!error_codes[@]}"; do
    echo "Code $key represents: ${error_codes[$key]}"
done

```

*(This loop will run exactly three times, for indices 0, 404, and 500).*

### The C-Style `for` Loop

If you are coming from languages like C, Java, or JavaScript, you might naturally lean toward the arithmetic `for` loop. You can use the `${#array[@]}` syntax to get the total number of elements in the array and iterate up to that length.

```bash
packages=("curl" "git" "vim" "htop")

# ${#packages[@]} evaluates to 4
for (( i=0; i<${#packages[@]}; i++ )); do
    echo "Installing package $((i+1)): ${packages[$i]}"
done

```

**The Danger of C-Style Loops with Sparse Arrays:**
You must be extremely cautious when using C-style loops in Bash. Because `${#array[@]}` returns the *count* of elements, not the *highest index*, a sparse array will break this logic.

Consider an array with elements at index `[0]` and `[5]`.

* The length (`${#array[@]}`) is `2`.
* A C-style loop will iterate for `i=0` and `i=1`.
* It will successfully process index `0`, attempt to process the empty index `1` (returning null), and completely miss the data at index `5`.

*Rule of Thumb:* Only use the C-style `for` loop if you can guarantee the array is sequentially indexed without gaps. Otherwise, stick to `"${!array[@]}"`.

## 13.4 Associative Arrays (Key-Value Pairs)

While indexed arrays are limited to using integers as keys, associative arrays allow you to use arbitrary strings as keys. If you are familiar with other programming languages, you will recognize these as dictionaries (Python), hash maps (Java), or objects (JavaScript).

Associative arrays are incredibly powerful for mapping relationships, such as linking usernames to user IDs, file extensions to default applications, or server hostnames to IP addresses.

*Important Note: Associative arrays were introduced in Bash 4.0. If you are writing scripts for macOS (which defaults to Bash 3.2 for licensing reasons) or very old Linux distributions, you will need to upgrade Bash or use alternative logic.*

### Declaring an Associative Array

Unlike indexed arrays, which can be created on the fly simply by assigning a value, **associative arrays must be explicitly declared** before you can use them. If you skip this step, Bash will treat the variable as a standard indexed array, and any string key you use will evaluate to `0` mathematically, overwriting your data.

Use the `declare` built-in with the uppercase `-A` flag:

```bash
declare -A package_managers

```

### Assigning Values

Just like indexed arrays, you can assign data to an associative array using either individual assignments or a compound assignment.

**Individual Assignment:**
Specify the string key inside the square brackets. It is a best practice to quote the key, especially if it might contain spaces or special characters.

```bash
declare -A user_shells

user_shells["root"]="/bin/bash"
user_shells["postgres"]="/bin/sh"
user_shells["guest"]="/bin/false"

```

**Compound Assignment:**
You can define multiple key-value pairs at once using parentheses. You must explicitly write out the `[key]=` for every element.

```bash
declare -A server_ips=(
    ["web01"]="192.168.1.10"
    ["db01"]="192.168.1.20"
    ["cache01"]="192.168.1.30"
)

```

*Logical Structure of `server_ips`:*

```text
      KEY                 VALUE
    +-----------+       +--------------+
    | "web01"   | ----> | "192.168.1.10"|
    +-----------+       +--------------+
    | "db01"    | ----> | "192.168.1.20"|
    +-----------+       +--------------+
    | "cache01" | ----> | "192.168.1.30"|
    +-----------+       +--------------+

```

### Accessing and Modifying Elements

Retrieving data from an associative array follows the exact same syntax as indexed arrays, but you use the string key instead of a number. Remember to wrap the variable in curly braces `${}`.

```bash
# Retrieving a value
echo "The database IP is: ${server_ips["db01"]}"

# Modifying an existing value
server_ips["web01"]="10.0.0.15"

# Adding a new key-value pair
server_ips["lb01"]="192.168.1.5"

```

### Iterating Through Associative Arrays

You can loop through associative arrays using the same techniques covered in Chapter 13.3.

**Iterating over Values:**
Use `"${array[@]}"` to extract just the values.

```bash
for ip in "${server_ips[@]}"; do
    echo "Pinging $ip..."
done

```

**Iterating over Keys (The standard approach):**
Because the key is usually just as important as the value, the most common pattern is to iterate over the keys using the `!` prefix, and then use that key to fetch the corresponding value inside the loop.

```bash
for hostname in "${!server_ips[@]}"; do
    ip="${server_ips[$hostname]}"
    echo "Server $hostname is reachable at $ip"
done

```

### The Ordering Caveat

There is one critical behavior you must understand when working with associative arrays: **Bash does not maintain insertion order.**

Because associative arrays are implemented as hash tables under the hood for fast lookups, the order in which keys or values are returned during iteration is seemingly random and relies on the hash of the keys.

If you run the loop from the previous example, the output might look like this:

```text
Server cache01 is reachable at 192.168.1.30
Server lb01 is reachable at 192.168.1.5
Server db01 is reachable at 192.168.1.20
Server web01 is reachable at 10.0.0.15

```

If your script requires data to be processed in the exact order it was added, you must use an indexed array, or maintain a secondary indexed array specifically to track the order of the keys.

## 13.5 Array Slicing and Length Operations

As your scripts become more complex, you will frequently need to determine how much data an array holds or extract specific subsets of that data. Bash borrows its array length and slicing syntax directly from its string manipulation capabilities, making these operations powerful and concise.

### Determining Array Length

Bash uses the `#` symbol within parameter expansion to determine length. However, where you place the index determines whether Bash counts the total number of elements in the array, or the number of characters in a single element.

**1. Counting Total Elements:**
To find out how many elements are currently stored in an array, use the `@` or `*` subscript.

```bash
files=("index.html" "style.css" "app.js")

# Get the total number of elements
echo "Total files: ${#files[@]}"  
# Outputs: Total files: 3

```

*Note for Sparse Arrays:* Remember from Chapter 13.1 that Bash arrays are sparse. `${#array[@]}` returns the count of *assigned* elements, not the highest index number. If an array has elements only at index `[0]` and `[100]`, the length reported will be `2`.

**2. Counting Characters in a Specific Element:**
If you specify a numerical index (or a string key for associative arrays), Bash returns the string length (character count) of that specific element's value.

```bash
echo "Length of the first filename: ${#files[0]}" 
# Outputs: Length of the first filename: 10 (i-n-d-e-x-.-h-t-m-l)

```

### Array Slicing (Extracting Subsets)

Array slicing allows you to extract a contiguous sequence of elements without writing a loop. The syntax uses colons to specify an offset (where to start) and an optional length (how many elements to retrieve).

**Syntax:** `"${array[@]:offset:length}"`

* **offset:** The starting position. It is zero-indexed, meaning an offset of `0` starts at the first element, `1` starts at the second, and so on.
* **length:** The number of elements to extract. If omitted, Bash extracts everything from the offset to the end of the array.

```bash
log_levels=("DEBUG" "INFO" "WARN" "ERROR" "FATAL" "PANIC")

# Extract 3 elements starting from index 2 ("WARN")
subset=("${log_levels[@]:2:3}")
echo "${subset[@]}"
# Outputs: WARN ERROR FATAL

# Extract everything from index 3 to the end
tail_end=("${log_levels[@]:3}")
echo "${tail_end[@]}"
# Outputs: ERROR FATAL PANIC

```

*Visualizing the Slice:* `"${log_levels[@]:2:3}"`

```text
Index:     [0]      [1]      [2]      [3]      [4]      [5]
Value:    DEBUG    INFO     WARN     ERROR    FATAL    PANIC
                            |---------------------|
Offset (2) -----------------^                     |
Length (3) -----------------(1)------(2)------(3)-^

```

**Negative Offsets:**
You can slice from the end of the array by using a negative offset. **Crucially**, you must put a space before the negative number, or wrap it in parentheses, so Bash does not confuse it with the `:-` default value parameter expansion modifier.

```bash
# Extract the last two elements
last_two=("${log_levels[@]: -2}") 
echo "${last_two[@]}"
# Outputs: FATAL PANIC

```

### Slicing Strings Within Arrays

Just as the length operator `#` changes behavior based on the subscript used, the slicing operator changes behavior if you target a specific element rather than the whole array (`@`).

If you slice a specific index, you perform a substring extraction on the value stored at that index.

```bash
user_record=("john_doe" "admin" "active")

# Slice the first element (index 0), starting at character 5, length 3
echo "${user_record[0]:5:3}"
# Outputs: doe

```

### A Warning on Slicing Associative Arrays

Slicing operations (`:offset:length`) rely heavily on the concept of a sequential, ordered list. Because associative arrays (covered in Chapter 13.4) are implemented as hash tables and do not maintain a guaranteed order, **slicing an associative array will yield unpredictable results**.

While Bash might not throw an explicit syntax error, the subset of elements you receive will be effectively random. Only use array slicing with numerically indexed arrays.