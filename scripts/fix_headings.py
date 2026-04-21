import os
import sys

def fix_headings_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_code_block = False
    first_heading_level = 0
    
    # 1. Find the first heading level
    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue
            
        if not in_code_block and line.startswith('#'):
            heading_level = len(line) - len(line.lstrip('#'))
            # Verify there is a space after the '#'
            if heading_level > 0 and len(line) > heading_level and line[heading_level] == ' ':
                first_heading_level = heading_level
                break

    if first_heading_level == 0:
        return # No headings found in this file

    # 2. If the first heading is # or ##, do not modify anything in this file
    if first_heading_level <= 2:
        print(f"[{os.path.basename(filepath)}] First heading is level {first_heading_level}. Skipping without modification.")
        return

    extra_hashes = first_heading_level - 2
    
    # 3. Correct headings throughout the file
    new_lines = []
    in_code_block = False
    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if not in_code_block and line.startswith('#'):
            heading_level = len(line) - len(line.lstrip('#'))
            if heading_level > 0 and len(line) > heading_level and line[heading_level] == ' ':
                # Remove the extra '#' characters
                if heading_level >= extra_hashes + 1:
                    line = line[extra_hashes:]
        
        new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"[{os.path.basename(filepath)}] Fixed headings by removing {extra_hashes} extra '#' character(s).")

def main():
    if len(sys.argv) != 2:
        print("Usage: python fix_headings.py <directory_path>")
        sys.exit(1)

    dir_path = sys.argv[1]
    if not os.path.isdir(dir_path):
        print(f"Error: {dir_path} is not a valid directory.")
        sys.exit(1)

    # Process all .md files in the directory and subdirectories
    for root, _, files in os.walk(dir_path):
        for file in sorted(files):
            if file.endswith('.md'):
                filepath = os.path.join(root, file)
                fix_headings_in_file(filepath)

if __name__ == "__main__":
    main()
