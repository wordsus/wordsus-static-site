# Getting Started with Python

Welcome to **Introduction to Python**! This chapter will guide you through the basics of setting up your environment and writing your first Python program.

## What is Python?

Python is a high-level, interpreted programming language known for its simplicity and readability. Created by Guido van Rossum and first released in 1991, Python has grown to become one of the world's most popular programming languages.

```python
# Your first Python program
print("Hello, World!")
```

## Installing Python

Before we begin coding, you need to install Python on your system.

### Windows

1. Visit [python.org](https://python.org)
2. Download the latest version (Python 3.x)
3. Run the installer and check **"Add Python to PATH"**

### macOS

The easiest way is via Homebrew:

```bash
brew install python3
```

### Linux

Most Linux distributions include Python. You can install or update via:

```bash
sudo apt update && sudo apt install python3
```

## Your First Program

Open a text editor and create a file called `hello.py`:

```python
# hello.py
name = input("What is your name? ")
print(f"Hello, {name}! Welcome to Python.")
```

Run it from your terminal:

```bash
python3 hello.py
```

## The Python REPL

Python includes an interactive shell (REPL – Read, Eval, Print, Loop) that lets you experiment instantly:

```
$ python3
>>> 2 + 2
4
>>> print("Hello from REPL!")
Hello from REPL!
>>> exit()
```

## Summary

In this chapter, you learned:

- What Python is and why it's popular
- How to install Python on different operating systems
- How to write and run your first Python program
- How to use the interactive Python shell

In the next chapter, we'll explore **Variables and Data Types**.
