#!/usr/bin/env python3
"""
Test script to verify the LZP decompression bug and fix

BUG IDENTIFIED:
The current implementation decompresses LZP data but DOES NOT apply patternreplace
to expand compressed patterns. The JavaScript code in pac.pac shows that after
decompressing, the data still contains compressed patterns like:
- 'A' -> 'in'
- 'B' -> 'an'
- 'C' -> 'er'
- '!A' -> 'porn'
- '!K' -> '.com'
etc.

These patterns need to be expanded AFTER decompression to get readable domains.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pac'))

from pac_decompiler_fixed import FixedLZPDecompressor

def test_pattern_replacement():
    """Test that patternreplace correctly expands patterns"""
    decompressor = FixedLZPDecompressor()

    # Test single character patterns
    test_cases = [
        ("sV", "sex"),           # s + V -> s + ex = sex
        ("mI", "mon"),           # m + I -> m + on = mon
        ("Nhc", "ashc"),         # N + h + c -> as + h + c = ashc
        ("kW", "kis"),           # k + W -> k + is = kis
        ("fai!", "faiin"),       # f + a + i + ! (no match for !) = faiin
        ("!A", "porn"),          # !A -> porn
        ("!K", ".com"),          # !K -> .com
        ("A", "in"),             # A -> in
        ("AB", "in an"),         # This is WRONG - should be separate
    ]

    print("=" * 70)
    print("TEST: Pattern Replacement (REVERSE MODE - NOT USED FOR DECODING)")
    print("=" * 70)

    # The current patternreplace REVERSES - replaces value with key
    # This is used for ENCODING the mask, not for DECODING domains!
    for compressed, expected in test_cases:
        result = decompressor.patternreplace(compressed, lzpmask=False)
        status = "✓" if result != compressed else "✗"
        print(f"{status} '{compressed}' -> '{result}' (expected something different)")

    print("\n" + "=" * 70)
    print("CRITICAL BUG FOUND:")
    print("=" * 70)
    print("The patternreplace function REVERSES the replacement!")
    print("It replaces VALUE with KEY (e.g., 'in' -> 'A')")
    print("But we need the OPPOSITE for decompression (e.g., 'A' -> 'in')")
    print("\nThe JavaScript code does: s.split(patterns[pattern]).join(pattern)")
    print("This means: split by VALUE, join with KEY = VALUE -> KEY")
    print("\nFor decompression, we need: KEY -> VALUE")
    print("=" * 70)

def test_decompressed_data_analysis():
    """Analyze actual decompressed data to confirm the bug"""
    print("\n" + "=" * 70)
    print("ANALYSIS: Actual Decompressed Data from pac_refined_output_domains.txt")
    print("=" * 70)

    # Sample data from the output file
    corrupted_domains = [
        "sV",      # Should be something like "sex" if V -> ex
        "mI",      # Should be "mon" if I -> on
        "Nhc",     # Should be "ashc" if N -> as
        "@gw",     # Should be "kagw" if @ -> ka
        "!gwkr",   # Has compressed pattern !g
        "oggUoi",  # Has U -> ra, so should be "oggraoi"
    ]

    decompressor = FixedLZPDecompressor()

    print("\nCurrent (buggy) behavior - patternreplace ENCODES:")
    for domain in corrupted_domains:
        encoded = decompressor.patternreplace(domain, lzpmask=False)
        print(f"  '{domain}' -> '{encoded}' (wrong direction!)")

    print("\nWhat we need - DECODE the patterns:")
    print("  'sV' should expand to 'sex' (s + V->ex)")
    print("  'mI' should expand to 'mon' (m + I->on)")
    print("  'Nhc' should expand to 'ashc' (N->as + h + c)")
    print("  '@gw' should expand to 'kagw' (@->ka + g + w)")
    print("  etc.")

    print("\n" + "=" * 70)
    print("FIX NEEDED:")
    print("=" * 70)
    print("1. Add a new function to EXPAND patterns (not reverse them)")
    print("2. Apply pattern expansion AFTER unlzp decompression")
    print("3. The function should replace KEY -> VALUE")
    print("   (opposite of current patternreplace)")
    print("=" * 70)

if __name__ == "__main__":
    test_pattern_replacement()
    test_decompressed_data_analysis()

    print("\n" + "=" * 70)
    print("CONCLUSION")
    print("=" * 70)
    print("The bug is clear: decompressed LZP data contains compressed patterns")
    print("that need to be expanded (KEY -> VALUE) but the current implementation")
    print("doesn't do this. The patternreplace function does the OPPOSITE")
    print("(VALUE -> KEY) which is used for encoding the mask, not decoding domains.")
    print("\nNext step: Fix pac_decompiler_fixed.py to add pattern expansion")
    print("=" * 70)
