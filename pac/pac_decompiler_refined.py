#!/usr/bin/env python3
"""
Refined PAC File Decompiler
Complete and accurate extraction of addresses and information from PAC files

This decompiler properly handles:
- Domain extraction by TLD zones
- IP address decoding (base36 with delta encoding)
- CIDR range extraction with proper mask conversion
- LZP decompression with pattern replacement
- Complete data validation and error handling

Based on analysis of:
- pac.pac structure
- JavaScript functions: patternreplace, a2b, unlzp, nmfc
- Existing decompilers: lzp_decompiler_final.py, pac_decompiler_advanced.py
"""

import base64
import re
import json
import sys
import struct
from typing import List, Tuple, Dict, Any, Optional


class LZPDecompressor:
    """
    LZP (Lempel-Ziv-Prediction) Decompressor
    Implements the algorithm from the PAC file's unlzp function
    """

    def __init__(self):
        # Hash table for LZP prediction (2^18 entries)
        self.table = [0] * 262144
        self.hash_mask = 262143  # (1 << 18) - 1
        self.hash_val = 0

    def patternreplace(self, s: str, lzpmask: bool = False) -> str:
        """
        Implements JavaScript patternreplace function

        CRITICAL: JavaScript code does s.split(patterns[pattern]).join(pattern)
        This means it replaces the VALUE with the KEY (reverse direction!)

        This function is ONLY used for encoding the mask (lzpmask=True).
        For domain decompression, use patternexpand() instead.
        """
        if lzpmask:
            # Patterns for LZP mask decoding
            # Format: 'KEY': 'VALUE' but we replace VALUE -> KEY
            patterns = {
                'AA': '!', 'gA': '@', 'AB': '#', 'AQ': '$',
                'AE': '%', 'AC': '^', 'AI': '*', 'Ag': '(',
                'AD': ')', 'Aw': '[', 'AM': ']', 'Bg': '-',
                'CA': ',', 'IA': '.', 'BA': '?'
            }
        else:
            # Patterns for domain data (encoding direction: VALUE -> KEY)
            patterns = {}

        result = s
        # Replace VALUE with KEY (reversed from typical replacement)
        for pattern_key, pattern_value in patterns.items():
            result = result.replace(pattern_value, pattern_key)

        return result

    def patternexpand(self, s: str) -> str:
        """
        Expands compressed patterns in decompressed domain data.
        This is the OPPOSITE of patternreplace - it expands KEY -> VALUE.

        CRITICAL FIX FOR BUG #57:
        After LZP decompression, the domain data still contains compressed patterns.
        These patterns must be expanded to get readable domain names.

        For example:
        - 'sV' -> 'sex' (s + V->ex)
        - 'mI' -> 'mon' (m + I->on)
        - '!A' -> 'porn'
        - '@gw' -> 'kagw' (@->ka + g + w)

        This function must be applied AFTER unlzp decompression.
        """
        # Domain patterns - expand KEY to VALUE (opposite of patternreplace)
        # Order matters: process longer patterns first to avoid partial replacements
        patterns_ordered = [
            # Two-character patterns first (to avoid conflicts)
            ('!A', 'porn'), ('!B', 'film'), ('!C', 'lord'), ('!D', 'kino'), ('!E', 'oker'), ('!F', 'trad'),
            ('!G', 'line'), ('!H', 'game'), ('!I', 'pdom'), ('!J', 'tion'), ('!K', '.com'), ('!L', 'leon'),
            ('!M', 'port'), ('!N', 'shop'), ('!O', 'club'), ('!P', 'prav'), ('!Q', 'vest'), ('!R', 'inco'),
            ('!S', 'mark'), ('!T', 'ital'), ('!U', 'slot'), ('!V', 'play'), ('!W', 'eria'), ('!X', 'russ'),
            ('!Y', 'vide'), ('!Z', 'tube'), ('!@', 'medi'), ('!#', 'ster'), ('!$', 'star'), ('!%', 'nter'),
            ('!^', 'scho'), ('!&', 'free'), ('!*', 'enta'), ('!(', 'best'), ('!)', 'mega'), ('!=', 'gama'),
            ('!+', 'prof'), ('!/', 'oney'), ('!,', 'rypt'), ('!<', 'kra3'), ('!>', 'stor'), ('!~', 'ture'),
            ('![', 'tech'), ('!]', 'ance'), ('!{', 'coin'), ('!}', 'seed'), ('!`', 'anim'), ('!:', 'stro'),
            ('!;', 'ment'), ('!?', 'site'),
            # Single-character patterns last
            ('A', 'in'), ('B', 'an'), ('C', 'er'), ('D', 'ar'), ('E', 'or'),
            ('F', 'et'), ('G', 'al'), ('H', 'st'), ('I', 'on'), ('J', 'en'), ('K', 'at'), ('L', 'ro'), ('M', 'es'),
            ('N', 'as'), ('O', 'el'), ('P', 'it'), ('Q', 'ch'), ('R', 'am'), ('S', 'ol'), ('T', 'om'), ('U', 'ra'),
            ('V', 'ex'), ('W', 'is'), ('X', 'ic'), ('Y', 're'), ('Z', 'os'), ('@', 'ka'), ('#', 'ot'), ('$', 'us'),
            ('%', 'ap'), ('^', 'ov'), ('&', 'im'), ('*', '-s'), ('(', 'ad'), (')', 'il'), ('=', 'op'), ('+', 'ed'),
            ('/', 'em'), (',', 'a-'), ('<', 'od'), ('>', 'ir'), ('~', 'id'), ('[', 'ob'), (']', 'ag'), ('{', 'ig'),
            ('}', 'ip'), ('`', 'ok'), (':', 'e-'), (';', 'ec'), ('?', 'un')
        ]

        result = s
        # Expand KEY to VALUE (normal replacement direction)
        for pattern_key, pattern_value in patterns_ordered:
            result = result.replace(pattern_key, pattern_value)

        return result

    def a2b(self, encoded: str) -> str:
        """
        Implements JavaScript a2b function
        Converts ASCII-safe base64 to binary data and returns as string
        """
        try:
            # Apply pattern replacement for LZP mask
            processed = self.patternreplace(encoded, lzpmask=True)

            # Add padding if needed for base64
            missing_padding = len(processed) % 4
            if missing_padding:
                processed += '=' * (4 - missing_padding)

            # Decode base64
            decoded_bytes = base64.b64decode(processed)

            # Return as string (JavaScript returns string from a2b)
            return decoded_bytes.decode('latin-1')  # Use latin-1 to preserve byte values
        except Exception as e:
            print(f"⚠ Warning: a2b decoding failed: {e}")
            return ''

    def unlzp(self, data: str, mask: str, limit: int) -> Tuple[str, int, int]:
        """
        Implements JavaScript unlzp function
        Decompresses LZP-encoded data using the mask

        Returns: (decompressed_string, data_bytes_used, mask_bytes_used)
        """
        mask_pos = 0
        data_pos = 0
        output = []

        # Reset hash state for each decompression
        self.hash_val = 0

        try:
            while mask_pos < len(mask) and len(output) < limit:
                # Get mask byte
                if mask_pos >= len(mask):
                    break

                mask_byte = ord(mask[mask_pos])
                mask_pos += 1

                # Process 8 bits of the mask byte
                for bit_index in range(8):
                    if len(output) >= limit:
                        break

                    # Check if bit is set
                    if mask_byte & (1 << bit_index):
                        # Bit = 1: retrieve from prediction table
                        char_code = self.table[self.hash_val]
                    else:
                        # Bit = 0: retrieve from data stream
                        if data_pos >= len(data):
                            char_code = 0
                        else:
                            char_code = ord(data[data_pos])
                            data_pos += 1

                        # Store in prediction table
                        self.table[self.hash_val] = char_code

                    # Add to output
                    if char_code > 0:
                        output.append(chr(char_code))
                    else:
                        output.append('\x00')

                    # Update hash for next prediction
                    self.hash_val = ((self.hash_val << 7) ^ char_code) & self.hash_mask

        except Exception as e:
            print(f"⚠ Warning: LZP decompression error: {e}")

        return ''.join(output), data_pos, mask_pos


class IPAddressDecoder:
    """Decodes IP addresses from base36 with delta encoding"""

    @staticmethod
    def decode_ip_list(ip_strings: List[str]) -> List[str]:
        """
        Decodes base36-encoded IPs with delta encoding
        JavaScript implementation:
        ```
        var prev_ipval = 0;
        for (var i = 0; i < d_ipaddr.length; i++) {
            cur_ipval = parseInt(d_ipaddr[i], 36) + prev_ipval;
            d_ipaddr[i] = cur_ipval;
            prev_ipval = cur_ipval;
        }
        ```
        """
        decoded_ips = []
        prev_ip_val = 0

        for ip_str in ip_strings:
            try:
                # Parse base36 and add previous value (delta encoding)
                cur_ip_val = int(ip_str, 36) + prev_ip_val

                # Convert integer to IP address (32-bit)
                ip_bytes = struct.pack('>I', cur_ip_val)
                ip_addr = '.'.join(str(b) for b in ip_bytes)

                decoded_ips.append(ip_addr)
                prev_ip_val = cur_ip_val

            except (ValueError, struct.error) as e:
                print(f"⚠ Warning: Failed to decode IP '{ip_str}': {e}")
                decoded_ips.append(f"<invalid: {ip_str}>")

        return decoded_ips

    @staticmethod
    def nmfc(netmask_bits: int) -> str:
        """
        Implements JavaScript nmfc function
        Converts CIDR bit count to netmask

        JavaScript implementation:
        ```
        function nmfc(b) {
            var m=[];
            for(var i=0;i<4;i++) {
                var n=Math.min(b,8);
                m.push(256-Math.pow(2, 8-n));
                b-=n;
            }
            return m.join('.');
        }
        ```
        """
        mask_octets = []
        remaining_bits = netmask_bits

        for i in range(4):
            bits_in_octet = min(remaining_bits, 8)
            octet_value = 256 - pow(2, 8 - bits_in_octet)
            mask_octets.append(str(octet_value))
            remaining_bits -= bits_in_octet

        return '.'.join(mask_octets)


class RefinedPACDecompiler:
    """
    Complete PAC file decompiler with accurate extraction
    """

    def __init__(self, pac_file_path: str):
        self.pac_file_path = pac_file_path
        self.pac_content = ""

        # Extracted data
        self.domains = {}
        self.d_ipaddr_raw = []
        self.d_ipaddr_decoded = []
        self.special_cidrs = []
        self.domains_lzp = ""
        self.mask_lzp_encoded = ""
        self.mask_lzp_decoded = ''
        self.proxy_rules = ""

        # Components
        self.lzp_decompressor = LZPDecompressor()
        self.ip_decoder = IPAddressDecoder()

        # Statistics
        self.stats = {
            'total_zones': 0,
            'total_domain_groups': 0,
            'total_domains_decompressed': 0,
            'decompression_errors': 0,
            'successful_zones': 0
        }

    def load_pac_file(self) -> bool:
        """Load PAC file content"""
        try:
            with open(self.pac_file_path, 'r', encoding='utf-8') as f:
                self.pac_content = f.read()
            print(f"✓ PAC file loaded: {self.pac_file_path}")
            print(f"  File size: {len(self.pac_content):,} characters")
            return True
        except Exception as e:
            print(f"✗ Error loading PAC file: {e}")
            return False

    def extract_domains_structure(self) -> bool:
        """Extract domains structure (TLD zones with counts)"""
        try:
            # Match: domains = { ... };
            # Note: no 'var' prefix in the actual PAC file
            pattern = r'domains\s*=\s*\{(.*?)\};'
            match = re.search(pattern, self.pac_content, re.DOTALL)

            if match:
                domains_str = '{' + match.group(1) + '}'
                # Safely evaluate JavaScript object as Python dict
                self.domains = eval(domains_str)

                self.stats['total_zones'] = len(self.domains)
                self.stats['total_domain_groups'] = sum(
                    len(domain_dict) for domain_dict in self.domains.values()
                )

                print(f"✓ Extracted domains structure:")
                print(f"  - {self.stats['total_zones']} TLD zones")
                print(f"  - {self.stats['total_domain_groups']} domain groups")
                return True
            else:
                print("⚠ Warning: domains structure not found")
                return False

        except Exception as e:
            print(f"✗ Error extracting domains: {e}")
            return False

    def extract_ip_addresses(self) -> bool:
        """Extract and decode IP addresses"""
        try:
            # Match: var d_ipaddr = "...".split(" ");
            # Note: The string uses line continuations with backslash at EOL
            pattern = r'var\s+d_ipaddr\s*=\s*"\\?\s*(.*?)"\s*\.split'
            match = re.search(pattern, self.pac_content, re.DOTALL)

            if match:
                ip_data = match.group(1)
                # Remove line continuation backslashes (backslash followed by newline)
                ip_data = re.sub(r'\\\s*\n\s*', ' ', ip_data)
                # Remove any remaining backslashes
                ip_data = ip_data.replace('\\', '')
                # Split by whitespace and filter empty
                self.d_ipaddr_raw = [x.strip() for x in ip_data.split() if x.strip()]

                # Decode IPs from base36 with delta encoding
                self.d_ipaddr_decoded = self.ip_decoder.decode_ip_list(self.d_ipaddr_raw)

                print(f"✓ Extracted and decoded IP addresses:")
                print(f"  - {len(self.d_ipaddr_raw)} raw entries")
                print(f"  - {len(self.d_ipaddr_decoded)} decoded IPs")
                return True
            else:
                print("⚠ Warning: IP address list not found")
                return False

        except Exception as e:
            print(f"✗ Error extracting IP addresses: {e}")
            return False

    def extract_special_cidrs(self) -> bool:
        """Extract special CIDR ranges"""
        try:
            # Match: var special = [[ip, mask], ...];
            pattern = r'var\s+special\s*=\s*\[(.*?)\];'
            match = re.search(pattern, self.pac_content, re.DOTALL)

            if match:
                special_str = match.group(1)
                # Extract CIDR entries: ["ip", bits]
                cidr_pattern = r'\["([^"]+)",\s*(\d+)\]'
                cidr_matches = re.findall(cidr_pattern, special_str)

                for ip, bits in cidr_matches:
                    netmask = self.ip_decoder.nmfc(int(bits))
                    self.special_cidrs.append({
                        'ip': ip,
                        'cidr_bits': int(bits),
                        'netmask': netmask
                    })

                print(f"✓ Extracted special CIDR ranges:")
                print(f"  - {len(self.special_cidrs)} CIDR blocks")
                return True
            else:
                print("⚠ Warning: special CIDR ranges not found")
                return False

        except Exception as e:
            print(f"✗ Error extracting CIDR ranges: {e}")
            return False

    def extract_lzp_data(self) -> bool:
        """Extract LZP compressed data and mask"""
        try:
            # Extract domains_lzp
            pattern = r'var\s+domains_lzp\s*=\s*"([^"]+)";'
            match = re.search(pattern, self.pac_content, re.DOTALL)

            if match:
                self.domains_lzp = match.group(1)
                print(f"✓ Extracted LZP compressed domains:")
                print(f"  - {len(self.domains_lzp):,} characters")
            else:
                print("⚠ Warning: domains_lzp not found")
                return False

            # Extract mask_lzp
            pattern = r'var\s+mask_lzp\s*=\s*"([^"]+)";'
            match = re.search(pattern, self.pac_content, re.DOTALL)

            if match:
                self.mask_lzp_encoded = match.group(1)
                # Decode the mask using a2b
                self.mask_lzp_decoded = self.lzp_decompressor.a2b(self.mask_lzp_encoded)

                print(f"✓ Extracted and decoded LZP mask:")
                print(f"  - {len(self.mask_lzp_encoded):,} characters (encoded)")
                print(f"  - {len(self.mask_lzp_decoded):,} bytes (decoded)")
                return True
            else:
                print("⚠ Warning: mask_lzp not found")
                return False

        except Exception as e:
            print(f"✗ Error extracting LZP data: {e}")
            return False

    def decompress_domains(self) -> bool:
        """Decompress all domains using LZP algorithm"""
        try:
            if not self.domains_lzp or not self.mask_lzp_decoded:
                print("⚠ Warning: LZP data incomplete, cannot decompress")
                return False

            print("\n🔄 Decompressing domains using LZP algorithm...")
            print("=" * 60)

            # Working copies
            remaining_data = self.domains_lzp
            remaining_mask = self.mask_lzp_decoded
            leftover = ''

            # Process each TLD zone
            for zone_idx, (zone, domain_dict) in enumerate(self.domains.items(), 1):
                zone_success = True
                zone_decompressed = 0

                # Process each length group in the zone
                for length_key, count in domain_dict.items():
                    if not isinstance(count, int) or count <= 0:
                        continue

                    # Request data from LZP stream
                    required_chars = count

                    # Check if we need more data from LZP stream
                    if len(leftover) < required_chars:
                        # Request buffer (at least 8192 or required amount)
                        request_size = max(8192, required_chars)

                        try:
                            # Decompress next chunk
                            decompressed, data_used, mask_used = self.lzp_decompressor.unlzp(
                                remaining_data, remaining_mask, request_size
                            )

                            # Update streams
                            remaining_data = remaining_data[data_used:]
                            remaining_mask = remaining_mask[mask_used:]
                            leftover += decompressed

                        except Exception as e:
                            print(f"  ✗ Zone {zone}, length {length_key}: LZP error: {e}")
                            self.stats['decompression_errors'] += 1
                            zone_success = False
                            break

                    # Extract required characters from leftover
                    if len(leftover) >= required_chars:
                        # Extract compressed domain data
                        compressed_data = leftover[:required_chars]
                        leftover = leftover[required_chars:]

                        # CRITICAL FIX: Expand patterns to get readable domains
                        # The decompressed data still contains compressed patterns that must be expanded
                        expanded_data = self.lzp_decompressor.patternexpand(compressed_data)

                        self.domains[zone][length_key] = expanded_data
                        zone_decompressed += len(expanded_data)
                        self.stats['total_domains_decompressed'] += len(expanded_data)
                    else:
                        # Not enough data
                        self.domains[zone][length_key] = f"<LZP_ERROR: need {required_chars}, got {len(leftover)}>"
                        self.stats['decompression_errors'] += 1
                        zone_success = False

                if zone_success:
                    self.stats['successful_zones'] += 1
                    if zone_idx <= 10 or zone_idx % 50 == 0:
                        print(f"  ✓ Zone {zone_idx}/{self.stats['total_zones']}: {zone} ({zone_decompressed} chars)")

            print("=" * 60)
            print(f"✓ LZP decompression completed")
            print(f"  - {self.stats['successful_zones']}/{self.stats['total_zones']} zones successful")
            print(f"  - {self.stats['total_domains_decompressed']:,} total characters decompressed")
            if self.stats['decompression_errors'] > 0:
                print(f"  - {self.stats['decompression_errors']} errors encountered")

            return True

        except Exception as e:
            print(f"✗ Error during domain decompression: {e}")
            return False

    def extract_proxy_rules(self) -> bool:
        """Extract proxy routing rules"""
        try:
            # Look for return statement in FindProxyForURL
            pattern = r'return\s+"([^"]+)";'
            match = re.search(pattern, self.pac_content)

            if match:
                self.proxy_rules = match.group(1)
                print(f"✓ Extracted proxy rules: {self.proxy_rules}")
                return True
            else:
                print("⚠ Warning: proxy rules not found")
                return False

        except Exception as e:
            print(f"✗ Error extracting proxy rules: {e}")
            return False

    def export_results(self, output_file: str = "pac_refined_output.json",
                      export_ips: bool = True,
                      export_cidrs: bool = True,
                      export_domains: bool = True) -> bool:
        """Export decompiled data to JSON and text files"""
        try:
            print(f"\n📝 Exporting results...")

            # CRITICAL FIX FOR BUG #57:
            # Clean domain data by removing null characters before JSON export
            # Null characters are padding/markers from LZP decompression
            clean_domains = {}
            if export_domains:
                for zone, domain_dict in self.domains.items():
                    clean_domains[zone] = {}
                    for length_key, data in domain_dict.items():
                        if isinstance(data, str) and not data.startswith('<LZP_ERROR'):
                            # Remove all null characters from the domain data
                            clean_data = data.replace('\x00', '')
                            clean_domains[zone][length_key] = clean_data
                        else:
                            # Keep error messages as-is
                            clean_domains[zone][length_key] = data

            # Create output structure
            output_data = {
                "metadata": {
                    "source_file": self.pac_file_path,
                    "file_size": len(self.pac_content),
                    "proxy_rules": self.proxy_rules
                },
                "statistics": self.stats,
                "domains": clean_domains,
                "ip_addresses": {
                    "count": len(self.d_ipaddr_decoded),
                    "addresses": self.d_ipaddr_decoded[:100] if export_ips else []
                },
                "cidr_ranges": {
                    "count": len(self.special_cidrs),
                    "ranges": self.special_cidrs if export_cidrs else []
                }
            }

            # Export main JSON file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            print(f"  ✓ Main output: {output_file}")

            # Export IP addresses to text file
            if export_ips:
                ip_file = output_file.replace('.json', '_ips.txt')
                with open(ip_file, 'w') as f:
                    for ip in self.d_ipaddr_decoded:
                        f.write(f"{ip}\n")
                print(f"  ✓ IP addresses: {ip_file}")

            # Export CIDR ranges to text file
            if export_cidrs:
                cidr_file = output_file.replace('.json', '_cidrs.txt')
                with open(cidr_file, 'w') as f:
                    for cidr in self.special_cidrs:
                        f.write(f"{cidr['ip']}/{cidr['cidr_bits']} (mask: {cidr['netmask']})\n")
                print(f"  ✓ CIDR ranges: {cidr_file}")

            # Export domains by zone to text file
            if export_domains:
                domains_file = output_file.replace('.json', '_domains.txt')
                with open(domains_file, 'w', encoding='utf-8') as f:
                    for zone, domain_dict in sorted(self.domains.items()):
                        f.write(f"\n{'='*60}\n")
                        f.write(f"TLD Zone: .{zone}\n")
                        f.write(f"{'='*60}\n")
                        for length, data in sorted(domain_dict.items()):
                            if isinstance(data, str) and not data.startswith('<LZP_ERROR'):
                                # Split domains (they're concatenated by length)
                                domains = [data[i:i+int(length)] for i in range(0, len(data), int(length))]

                                # CRITICAL FIX: Filter out domains with null characters
                                # Null characters indicate padding or invalid domains
                                valid_domains = [d for d in domains if '\x00' not in d]

                                if valid_domains:  # Only write section if there are valid domains
                                    f.write(f"\nLength {length} ({len(valid_domains)} domains, {len(domains) - len(valid_domains)} filtered):\n")
                                    for i, domain in enumerate(valid_domains[:20], 1):  # Show first 20
                                        f.write(f"  {i}. {domain}.{zone}\n")
                                    if len(valid_domains) > 20:
                                        f.write(f"  ... and {len(valid_domains) - 20} more\n")
                print(f"  ✓ Domains by zone: {domains_file}")

            print(f"✓ Export completed successfully")
            return True

        except Exception as e:
            print(f"✗ Error exporting results: {e}")
            return False

    def run_complete_decompilation(self) -> bool:
        """Run complete decompilation process"""
        print("=" * 70)
        print("REFINED PAC FILE DECOMPILER")
        print("Complete extraction of addresses and routing information")
        print("=" * 70)
        print()

        # Step 1: Load file
        if not self.load_pac_file():
            return False
        print()

        # Step 2: Extract basic structures
        self.extract_domains_structure()
        self.extract_ip_addresses()
        self.extract_special_cidrs()
        self.extract_proxy_rules()
        print()

        # Step 3: Extract and decode LZP data
        if not self.extract_lzp_data():
            print("⚠ Cannot proceed without LZP data")
            return False
        print()

        # Step 4: Decompress domains
        self.decompress_domains()
        print()

        # Step 5: Export results
        self.export_results()

        print()
        print("=" * 70)
        print("DECOMPILATION COMPLETED")
        print("=" * 70)

        return True


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python pac_decompiler_refined.py <pac_file>")
        print("Example: python pac_decompiler_refined.py pac.pac")
        sys.exit(1)

    pac_file = sys.argv[1]
    decompiler = RefinedPACDecompiler(pac_file)
    success = decompiler.run_complete_decompilation()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
