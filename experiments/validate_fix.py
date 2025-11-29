#!/usr/bin/env python3
"""
Validation script to verify the LZP decompression fix

This script analyzes the decompressed domain data to ensure:
1. Domains are readable (contain valid characters)
2. No garbage characters (compressed patterns)
3. High success rate
"""

import re
import string

def is_readable_domain(domain: str) -> bool:
    """Check if a domain contains readable characters"""
    # Valid domain characters: lowercase letters, digits, hyphen, dot
    valid_chars = set(string.ascii_lowercase + string.digits + '-.')
    return all(c.lower() in valid_chars for c in domain)

def has_compressed_patterns(domain: str) -> bool:
    """Check if domain contains unresolved compressed patterns"""
    # Compressed patterns that should NOT appear in final output
    compressed_patterns = [
        '!A', '!B', '!C', '!D', '!E', '!F', '!G', '!H', '!I', '!J', '!K', '!L',
        '!M', '!N', '!O', '!P', '!Q', '!R', '!S', '!T', '!U', '!V', '!W', '!X',
        '!Y', '!Z', '!@', '!#', '!$', '!%', '!^', '!&', '!*', '!(', '!)', '!=',
        '!+', '!/', '!,', '!<', '!>', '!~', '![', '!]', '!{', '!}', '!`', '!:',
        '!;', '!?'
    ]

    # Single uppercase letters (should be expanded)
    if any(char.isupper() for char in domain):
        return True

    # Special symbols that indicate compression
    special_symbols = set('@#$%^&*()=+[]{}`;:<>~')
    if any(char in special_symbols for char in domain):
        return True

    # Two-char compressed patterns
    for pattern in compressed_patterns:
        if pattern in domain:
            return True

    return False

def analyze_domain_file(filepath: str) -> dict:
    """Analyze a domain file and return statistics"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        return {'error': 'File not found'}

    # Extract domain names from the file
    domain_pattern = r'\d+\.\s+([^\s]+)\.'
    domains = re.findall(domain_pattern, content)

    total_domains = len(domains)
    readable_domains = sum(1 for d in domains if is_readable_domain(d))
    compressed_domains = sum(1 for d in domains if has_compressed_patterns(d))

    readability_percent = (readable_domains / total_domains * 100) if total_domains > 0 else 0
    compressed_percent = (compressed_domains / total_domains * 100) if total_domains > 0 else 0

    # Sample readable domains
    sample_readable = [d for d in domains if is_readable_domain(d)][:20]

    # Sample problematic domains
    sample_compressed = [d for d in domains if has_compressed_patterns(d)][:20]

    return {
        'total_domains': total_domains,
        'readable_domains': readable_domains,
        'compressed_domains': compressed_domains,
        'readability_percent': readability_percent,
        'compressed_percent': compressed_percent,
        'sample_readable': sample_readable,
        'sample_compressed': sample_compressed
    }

def main():
    print("=" * 70)
    print("LZP DECOMPRESSION FIX VALIDATION")
    print("=" * 70)
    print()

    # Analyze the FIXED output
    print("📊 Analyzing FIXED output (pac_fixed_output_domains.txt)...")
    fixed_stats = analyze_domain_file('/tmp/gh-issue-solver-1764459977201/pac_fixed_output_domains.txt')

    if 'error' not in fixed_stats:
        print(f"\nResults:")
        print(f"  Total domains found: {fixed_stats['total_domains']}")
        print(f"  Readable domains: {fixed_stats['readable_domains']} ({fixed_stats['readability_percent']:.1f}%)")
        print(f"  Compressed/garbage: {fixed_stats['compressed_domains']} ({fixed_stats['compressed_percent']:.1f}%)")

        print(f"\nSample readable domains:")
        for i, domain in enumerate(fixed_stats['sample_readable'][:10], 1):
            print(f"  {i}. {domain}")

        if fixed_stats['sample_compressed']:
            print(f"\n⚠ Sample problematic domains (still compressed):")
            for i, domain in enumerate(fixed_stats['sample_compressed'][:10], 1):
                print(f"  {i}. {domain}")
    else:
        print(f"  ✗ {fixed_stats['error']}")

    print("\n" + "=" * 70)

    # Compare with old output if it exists
    print("\n📊 Comparing with OLD output (pac_refined_output_domains.txt)...")
    old_stats = analyze_domain_file('/tmp/gh-issue-solver-1764459977201/pac_refined_output_domains.txt')

    if 'error' not in old_stats:
        print(f"\nOLD Results:")
        print(f"  Total domains found: {old_stats['total_domains']}")
        print(f"  Readable domains: {old_stats['readable_domains']} ({old_stats['readability_percent']:.1f}%)")
        print(f"  Compressed/garbage: {old_stats['compressed_domains']} ({old_stats['compressed_percent']:.1f}%)")

        print(f"\nSample problematic domains from old output:")
        for i, domain in enumerate(old_stats['sample_compressed'][:10], 1):
            print(f"  {i}. {domain}")

        print("\n" + "=" * 70)
        print("IMPROVEMENT:")
        print("=" * 70)
        if 'error' not in fixed_stats:
            improvement = fixed_stats['readability_percent'] - old_stats['readability_percent']
            reduction = old_stats['compressed_percent'] - fixed_stats['compressed_percent']
            print(f"  Readability improved by: {improvement:+.1f}%")
            print(f"  Garbage reduced by: {reduction:+.1f}%")
    else:
        print(f"  ℹ Old output not found (expected if first run)")

    print("\n" + "=" * 70)
    print("CONCLUSION:")
    print("=" * 70)
    if 'error' not in fixed_stats:
        if fixed_stats['readability_percent'] >= 95:
            print("  ✓ SUCCESS: Decompression is working correctly!")
            print("  ✓ Domains are readable and valid")
            print("  ✓ Pattern expansion is working as expected")
        elif fixed_stats['readability_percent'] >= 80:
            print("  ⚠ PARTIAL SUCCESS: Most domains are readable")
            print("  ⚠ Some issues remain, further investigation needed")
        else:
            print("  ✗ FAILURE: Many domains still contain garbage")
            print("  ✗ Additional fixes needed")
    print("=" * 70)

if __name__ == "__main__":
    main()
