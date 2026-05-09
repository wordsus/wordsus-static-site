import os
import sys
import re

# The root cause in all variants is the same: the bold-closing `**` ends up
# *inside* an inline code span, right before its closing backtick.
#
# Pattern (broken):  `code**`
# Pattern (fixed):   `code`**
#
# This single substitution handles every variant:
#   1. Line starts with bold:     **text `code**`   → **text `code`**
#   2. Mid-line:                  **text `/path**`,  → **text `/path`**,
#   3. Multiple code spans:       **`a` and `b**`.   → **`a` and `b`**.
#
# The regex simply finds any inline-code span where `**` appears before
# the closing backtick and moves it outside.
BROKEN_PATTERN = re.compile(r'`([^`]*)\*\*`')
REPLACEMENT = r'`\1`**'


def fix_broken_bold_code(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    modified = False
    in_code_block = False

    for line in lines:
        # Track fenced code blocks — don't touch content inside them.
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if not in_code_block and BROKEN_PATTERN.search(line):
            new_line = BROKEN_PATTERN.sub(REPLACEMENT, line)
            new_lines.append(new_line)
            modified = True
        else:
            new_lines.append(line)

    if modified:
        new_content = '\n'.join(new_lines)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[{os.path.basename(filepath)}] Fixed broken bold-code formatting.")


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/fix_broken_bold_code.py <directory_path>")
        sys.exit(1)

    dir_path = sys.argv[1]
    if not os.path.isdir(dir_path):
        print(f"Error: {dir_path} is not a valid directory.")
        sys.exit(1)

    for root, _, files in os.walk(dir_path):
        for file in sorted(files):
            if file.endswith('.md'):
                filepath = os.path.join(root, file)
                fix_broken_bold_code(filepath)


if __name__ == "__main__":
    main()
