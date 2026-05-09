import os
import sys
import re

def remove_bold_from_headings(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    in_code_block = False
    modified = False

    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue
        
        if not in_code_block and line.startswith('#'):
            # Check if it's a real heading (hashes followed by space)
            if re.match(r'^#+ ', line):
                if '**' in line:
                    line = line.replace('**', '')
                    modified = True
        
        new_lines.append(line)

    if modified:
        new_content = '\n'.join(new_lines)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[{os.path.basename(filepath)}] Removed bold from headings.")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/remove_bold_headings.py <directory_path>")
        sys.exit(1)

    dir_path = sys.argv[1]
    if not os.path.isdir(dir_path):
        print(f"Error: {dir_path} is not a valid directory.")
        sys.exit(1)

    for root, _, files in os.walk(dir_path):
        for file in sorted(files):
            if file.endswith('.md'):
                filepath = os.path.join(root, file)
                remove_bold_from_headings(filepath)

if __name__ == "__main__":
    main()
