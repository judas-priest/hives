#!/usr/bin/env python3
"""
Decode Unicode escape sequences to readable Cyrillic text.
This script helps convert the Unicode escaped Russian strings to actual Cyrillic characters.
"""

import re
import sys

def decode_unicode_escapes(text):
    """Decode Unicode escape sequences like \u0410 to actual characters."""
    # Handle \uXXXX sequences
    def replace_unicode(match):
        code = int(match.group(1), 16)
        return chr(code)

    result = re.sub(r'\\u([0-9a-fA-F]{4})', replace_unicode, text)
    return result

# Test with a sample from the code
sample = r"'\u041E\u0441\u043D\u043E\u0432\u044B:'"
print("Sample:", sample)
print("Decoded:", decode_unicode_escapes(sample))

# Read line from stdin if provided
if len(sys.argv) > 1:
    text = sys.argv[1]
    print(decode_unicode_escapes(text))
