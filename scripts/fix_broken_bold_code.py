import os
import sys
import re

# Fixes lines where:
#   - The line starts with ** (bold opening)
#   - The line ends with `code**` (bold closing is inside the last code span)
#
# Broken:  **Title with `code**`
# Fixed:   **Title with `code`**
#
# Only matches when ** is at the start and the broken code span is at the end.
# This narrow scope avoids false positives on well-formed mid-line patterns.
BROKEN_PATTERN = re.compile(r'^\*\*(.*)`([^`]*)\*\*`\s*$')
REPLACEMENT = r'**\1`\2`**'


def fix_broken_bold_code(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    modified = False
    in_code_block = False

    for line in lines:
        # Track fenced code blocks — don't touch content inside them.
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if not in_code_block and BROKEN_PATTERN.match(line.rstrip('\r')):
            new_line = BROKEN_PATTERN.sub(REPLACEMENT, line.rstrip('\r'))
            # Preserve the original line ending
            if line.endswith('\r'):
                new_line += '\r'
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
