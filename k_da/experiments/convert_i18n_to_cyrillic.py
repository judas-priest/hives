#!/usr/bin/env python3
"""
Convert Unicode escape sequences in JavaScript file to readable Cyrillic text.
"""

import re
import sys

def decode_unicode_escapes(text):
    """Decode Unicode escape sequences like \u0410 to actual characters."""
    def replace_unicode(match):
        code = int(match.group(1), 16)
        return chr(code)

    result = re.sub(r'\\u([0-9a-fA-F]{4})', replace_unicode, text)
    return result

def process_file(input_file, output_file, start_line, end_line):
    """Process a specific range of lines in the file."""
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Convert specified range
    for i in range(start_line - 1, min(end_line, len(lines))):
        lines[i] = decode_unicode_escapes(lines[i])

    # Write to output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"Converted lines {start_line}-{end_line} in {input_file}")
    print(f"Output written to {output_file}")

if __name__ == '__main__':
    if len(sys.argv) != 5:
        print("Usage: python3 convert_i18n_to_cyrillic.py <input_file> <output_file> <start_line> <end_line>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    start_line = int(sys.argv[3])
    end_line = int(sys.argv[4])

    process_file(input_file, output_file, start_line, end_line)
