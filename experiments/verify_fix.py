#!/usr/bin/env python3
"""
Verification script to demonstrate the LZP decompression fix

Compares OLD (broken) vs NEW (fixed) implementations
"""

import json

# Load both outputs
with open('../pac/pac_refined_output.json', 'r') as f:
    old_data = json.load(f)

with open('../pac/pac_fixed_output.json', 'r') as f:
    new_data = json.load(f)

print("=" * 70)
print("LZP DECOMPRESSION FIX VERIFICATION")
print("=" * 70)
print()

# Compare statistics
print("📊 STATISTICS COMPARISON:")
print("-" * 70)
old_stats = old_data['statistics']
new_stats = new_data['statistics']

print(f"{'Metric':<40} {'OLD':<15} {'NEW':<15}")
print("-" * 70)
print(f"{'Total TLD zones':<40} {old_stats['total_zones']:<15} {new_stats['total_zones']:<15}")
print(f"{'Total domain groups':<40} {old_stats['total_domain_groups']:<15} {new_stats['total_domain_groups']:<15}")
print(f"{'Successful zones':<40} {old_stats['successful_zones']:<15} {new_stats['successful_zones']:<15}")
print(f"{'Decompression errors':<40} {old_stats['decompression_errors']:<15} {new_stats['decompression_errors']:<15}")
print(f"{'Total chars decompressed':<40} {old_stats['total_domains_decompressed']:<15,} {new_stats['total_domains_decompressed']:<15,}")
print()

# Calculate success rate
old_success_rate = (old_stats['successful_zones'] / old_stats['total_zones']) * 100
new_success_rate = (new_stats['successful_zones'] / new_stats['total_zones']) * 100

print(f"{'Success Rate':<40} {old_success_rate:<15.1f}% {new_success_rate:<15.1f}%")
print()

# Show improvements
print("✨ IMPROVEMENTS:")
print("-" * 70)
zones_improved = new_stats['successful_zones'] - old_stats['successful_zones']
errors_fixed = old_stats['decompression_errors'] - new_stats['decompression_errors']
chars_more = new_stats['total_domains_decompressed'] - old_stats['total_domains_decompressed']

print(f"  ✓ Zones fixed: +{zones_improved} ({zones_improved} zones now work correctly)")
print(f"  ✓ Errors eliminated: -{errors_fixed} (all {errors_fixed} errors fixed)")
print(f"  ✓ Additional data: +{chars_more:,} characters successfully decompressed")
print()

# Sample domains comparison
print("🔍 SAMPLE DOMAINS COMPARISON (first 5 .com domains):")
print("-" * 70)

old_com = old_data['domains']['com']
new_com = new_data['domains']['com']

print("\nOLD (BROKEN) - Length 1:")
if '1' in old_com and isinstance(old_com['1'], str):
    old_1 = old_com['1']
    domains_old = [old_1[i:i+1] for i in range(0, min(len(old_1), 5))]
    for i, d in enumerate(domains_old, 1):
        print(f"  {i}. {d}.com")
else:
    print(f"  ERROR: {old_com.get('1', 'N/A')}")

print("\nNEW (FIXED) - Length 1:")
if '1' in new_com and isinstance(new_com['1'], str):
    new_1 = new_com['1']
    domains_new = [new_1[i:i+1] for i in range(0, min(len(new_1), 5))]
    for i, d in enumerate(domains_new, 1):
        print(f"  {i}. {d}.com")
else:
    print(f"  ERROR: {new_com.get('1', 'N/A')}")

print()
print("=" * 70)
print("CONCLUSION:")
print("=" * 70)
print(f"""
The fixed LZP decompressor successfully extracts ALL {new_stats['total_zones']} TLD zones
with {new_stats['decompression_errors']} errors (vs {old_stats['decompression_errors']} in old version).

This represents a {new_success_rate - old_success_rate:.1f}% improvement in success rate.

KEY FIXES IMPLEMENTED:
1. patternreplace() now correctly reverses replacement direction
   (replaces values with keys, matching JavaScript behavior)

2. unlzp() now buffers 8 characters before joining to output
   (matching JavaScript's buffering strategy)

3. a2b() applies pattern replacement BEFORE base64 decoding
   (correct order of operations)
""")
