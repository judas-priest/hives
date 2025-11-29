#!/usr/bin/env python3
"""
Experiment to test patternreplace function behavior
Based on JavaScript implementation from pac.pac
"""

import base64

def patternreplace_OLD(s: str, lzpmask: bool = False) -> str:
    """OLD (WRONG) implementation - replaces keys with values"""
    if lzpmask:
        patterns = {
            'AA': '!', 'gA': '@', 'AB': '#', 'AQ': '$',
            'AE': '%', 'AC': '^', 'AI': '*', 'Ag': '(',
            'AD': ')', 'Aw': '[', 'AM': ']', 'Bg': '-',
            'CA': ',', 'IA': '.', 'BA': '?'
        }
    else:
        patterns = {}

    result = s
    for pattern, replacement in patterns.items():
        result = result.replace(pattern, replacement)

    return result

def patternreplace_NEW(s: str, lzpmask: bool = False) -> str:
    """NEW (CORRECT) implementation - replaces values with keys"""
    if lzpmask:
        patterns = {
            'AA': '!', 'gA': '@', 'AB': '#', 'AQ': '$',
            'AE': '%', 'AC': '^', 'AI': '*', 'Ag': '(',
            'AD': ')', 'Aw': '[', 'AM': ']', 'Bg': '-',
            'CA': ',', 'IA': '.', 'BA': '?'
        }
    else:
        patterns = {}

    result = s
    # JavaScript does: s.split(patterns[pattern]).join(pattern)
    # This replaces the VALUE with the KEY (reverse direction!)
    for pattern, replacement in patterns.items():
        result = result.replace(replacement, pattern)

    return result

# Test with a sample string
test_input = "Hello!World@Test#"

print("=== Testing patternreplace ===")
print(f"Input: {test_input}")
print(f"OLD (wrong): {patternreplace_OLD(test_input, lzpmask=True)}")
print(f"NEW (correct): {patternreplace_NEW(test_input, lzpmask=True)}")
print()
print("Expected: '!' -> 'AA', '@' -> 'gA', '#' -> 'AB'")
print(f"So output should be: HelloAAWorldgATestAB")
