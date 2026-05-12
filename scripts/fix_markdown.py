"""
fix_markdown.py — Combined markdown fixer.

Applies the following fixes to every .md file found recursively in the given
directory, in this exact order per file:

  1. fix_broken_bold_code  — Moves the closing ** outside the last code span
       when bold wraps inline code incorrectly.
       Broken:  **Title with `code**`
       Fixed:   **Title with `code`**

  2. fix_headings          — Normalises heading levels so that the first heading
       starts at H1 or H2 (removes excess leading '#' characters).

  3. remove_bold_headings  — Strips bold markers (**) from inside heading lines.

Usage:
    python3 scripts/fix_markdown.py <directory_path>
"""

import os
import re
import sys

# ---------------------------------------------------------------------------
# Pattern used by fix_broken_bold_code
# ---------------------------------------------------------------------------
BROKEN_BOLD_CODE_PATTERN = re.compile(r'^\*\*(.*)`([^`]*)\*\*`\s*$')
BROKEN_BOLD_CODE_REPLACEMENT = r'**\1`\2`**'


# ---------------------------------------------------------------------------
# Step 1 – Fix broken bold+code formatting
# ---------------------------------------------------------------------------
def _fix_broken_bold_code(lines: list[str]) -> tuple[list[str], bool]:
    """Return (new_lines, was_modified)."""
    new_lines: list[str] = []
    modified = False
    in_code_block = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if not in_code_block and BROKEN_BOLD_CODE_PATTERN.match(line.rstrip('\r')):
            new_line = BROKEN_BOLD_CODE_PATTERN.sub(
                BROKEN_BOLD_CODE_REPLACEMENT, line.rstrip('\r')
            )
            # Preserve the original carriage-return if present
            if line.endswith('\r'):
                new_line += '\r'
            new_lines.append(new_line)
            modified = True
        else:
            new_lines.append(line)

    return new_lines, modified


# ---------------------------------------------------------------------------
# Step 2 – Normalise heading levels
# ---------------------------------------------------------------------------
def _fix_headings(lines: list[str]) -> tuple[list[str], int]:
    """Return (new_lines, extra_hashes_removed).

    extra_hashes_removed is 0 when no modification was made.
    """
    in_code_block = False

    # Pass 1: find the first heading level.
    first_level = 0
    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue
        if not in_code_block and line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            if level > 0 and len(line) > level and line[level] == ' ':
                first_level = level
                break

    # No headings, or already starting at H1/H2 → nothing to do.
    if first_level == 0 or first_level <= 2:
        return lines, 0

    extra = first_level - 2

    # Pass 2: strip the extra leading '#' characters from every heading.
    new_lines: list[str] = []
    in_code_block = False
    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if not in_code_block and line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            if level > 0 and len(line) > level and line[level] == ' ':
                if level >= extra + 1:
                    line = line[extra:]

        new_lines.append(line)

    return new_lines, extra


# ---------------------------------------------------------------------------
# Step 3 – Remove bold markers from heading lines
# ---------------------------------------------------------------------------
def _remove_bold_headings(lines: list[str]) -> tuple[list[str], bool]:
    """Return (new_lines, was_modified)."""
    new_lines: list[str] = []
    modified = False
    in_code_block = False

    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if not in_code_block and line.startswith('#'):
            if re.match(r'^#+ ', line) and '**' in line:
                line = line.replace('**', '')
                modified = True

        new_lines.append(line)

    return new_lines, modified


# ---------------------------------------------------------------------------
# Main per-file processor
# ---------------------------------------------------------------------------
def fix_file(filepath: str) -> None:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split preserving the empty string after a trailing newline.
    lines = content.split('\n')

    # Apply the three fixes in order.
    lines, bold_code_fixed = _fix_broken_bold_code(lines)
    lines, extra_hashes = _fix_headings(lines)
    lines, bold_headings_fixed = _remove_bold_headings(lines)

    any_modified = bold_code_fixed or extra_hashes > 0 or bold_headings_fixed

    if any_modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        basename = os.path.basename(filepath)
        messages: list[str] = []
        if bold_code_fixed:
            messages.append("fixed broken bold-code formatting")
        if extra_hashes > 0:
            messages.append(f"removed {extra_hashes} extra '#' from headings")
        if bold_headings_fixed:
            messages.append("removed bold from headings")

        print(f"[{basename}] {'; '.join(messages)}.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/fix_markdown.py <directory_path>")
        sys.exit(1)

    dir_path = sys.argv[1]
    if not os.path.isdir(dir_path):
        print(f"Error: {dir_path} is not a valid directory.")
        sys.exit(1)

    for root, _, files in os.walk(dir_path):
        for file in sorted(files):
            if file.endswith('.md'):
                fix_file(os.path.join(root, file))


if __name__ == "__main__":
    main()
