# Control Flow

Control flow allows your programs to make decisions and repeat actions. Python provides several control flow tools: `if` statements, `for` loops, and `while` loops.

## If Statements

The `if` statement evaluates a condition and executes a block of code if it's `True`:

```python
temperature = 25

if temperature > 30:
    print("It's hot outside!")
elif temperature > 20:
    print("It's a nice day!")
else:
    print("It might be cold.")
```

## Comparison Operators

| Operator | Meaning |
|----------|---------|
| `==` | Equal to |
| `!=` | Not equal |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |

## Logical Operators

```python
age = 22
has_id = True

# and: both must be True
if age >= 18 and has_id:
    print("Welcome!")

# or: at least one must be True
if age < 18 or not has_id:
    print("Access denied.")

# not: reverses the condition
if not has_id:
    print("Please show your ID.")
```

## For Loops

Use `for` to iterate over sequences:

```python
# Iterate over a list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)

# Iterate over a range
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4

# Range with start, stop, step
for i in range(0, 10, 2):
    print(i)  # 0, 2, 4, 6, 8
```

## While Loops

`while` loops repeat as long as a condition is `True`:

```python
count = 0
while count < 5:
    print(f"Count: {count}")
    count += 1
```

## Break and Continue

```python
# break: exit the loop early
for num in range(10):
    if num == 5:
        break
    print(num)  # prints 0 to 4

# continue: skip to next iteration
for num in range(10):
    if num % 2 == 0:
        continue
    print(num)  # prints only odd numbers
```

## Summary

You've learned:

- How to use `if`, `elif`, and `else` for decision-making
- Comparison and logical operators
- `for` loops to iterate over sequences
- `while` loops for condition-based repetition
- `break` and `continue` to control loop flow

Congratulations! You've completed the **Introduction to Python** foundations. Keep practicing by building small projects!
