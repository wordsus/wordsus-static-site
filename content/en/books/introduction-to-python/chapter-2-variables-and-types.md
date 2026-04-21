# Variables and Data Types

In Python, **variables** are containers for storing data values. Unlike other languages, Python has no command for declaring a variable — it is created the moment you first assign a value to it.

## Creating Variables

```python
# String
name = "Alice"
greeting = 'Hello, World!'

# Integer
age = 30
year = 2024

# Float
price = 19.99
pi = 3.14159

# Boolean
is_active = True
has_access = False
```

## Python Data Types

Python has several built-in data types:

| Type | Example | Description |
|------|---------|-------------|
| `str` | `"hello"` | Text |
| `int` | `42` | Integer numbers |
| `float` | `3.14` | Decimal numbers |
| `bool` | `True` | Boolean (True/False) |
| `list` | `[1, 2, 3]` | Ordered, mutable collection |
| `tuple` | `(1, 2, 3)` | Ordered, immutable collection |
| `dict` | `{"key": "val"}` | Key-value pairs |
| `set` | `{1, 2, 3}` | Unordered unique items |

## Type Checking

Use the `type()` function to check a variable's type:

```python
x = 42
print(type(x))        # <class 'int'>

y = 3.14
print(type(y))        # <class 'float'>

z = "hello"
print(type(z))        # <class 'str'>
```

## Type Conversion

You can convert between types using built-in functions:

```python
# String to Integer
age_str = "25"
age_int = int(age_str)   # 25

# Integer to String
num = 42
num_str = str(num)       # "42"

# Integer to Float
x = float(10)            # 10.0
```

## String Operations

Strings are one of the most used types in Python:

```python
name = "Python"

# Concatenation
greeting = "Hello, " + name    # "Hello, Python"

# Repetition
repeated = name * 3            # "PythonPythonPython"

# f-strings (recommended)
version = 3
msg = f"{name} {version} is great!"  # "Python 3 is great!"

# String methods
print(name.upper())    # PYTHON
print(name.lower())    # python
print(name.replace("P", "J"))  # Jython
print(len(name))       # 6
```

## Summary

You've learned:

- How to create and assign variables
- The main Python data types
- How to check and convert types
- Basic string operations

Next, we'll explore **Control Flow** — how to make decisions and repeat actions in Python.
