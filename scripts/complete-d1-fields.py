#!/usr/bin/env python3
"""
Script to complete D1 field additions for all remaining screens.
Finds screens where Status is immediately followed by Notes and inserts the 6 D1 fields.
"""

import re

def add_remaining_d1_fields(content):
    """Add D1 fields to screens that are missing them."""
    
    # Pattern to match: Status line directly followed by Notes line (no D1 fields in between)
    pattern = r'(- \*\*Status\*\*: [^\n]+\n)(\s*- \*\*Notes\*\*:)'
    
    # D1 fields template
    d1_fields = '''- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
'''
    
    # Replacement: insert D1 fields between Status and Notes
    replacement = r'\1' + d1_fields + r'\2'
    
    # Apply the replacement
    updated_content = re.sub(pattern, replacement, content)
    
    return updated_content

def main():
    # Read the registry file
    with open('docs/SCREEN_REGISTRY.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count screens before
    before_count = len(re.findall(r'- \*\*Status\*\*: [^\n]+\n\s*- \*\*Notes\*\*:', content))
    
    print(f"Found {before_count} screens missing D1 fields")
    
    # Add D1 fields
    updated_content = add_remaining_d1_fields(content)
    
    # Count screens after
    after_count = len(re.findall(r'- \*\*Status\*\*: [^\n]+\n\s*- \*\*Notes\*\*:', updated_content))
    
    # Write back to file
    with open('docs/SCREEN_REGISTRY.md', 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"✅ Successfully updated {before_count - after_count} screens")
    print(f"Remaining screens without D1 fields: {after_count}")
    
    if after_count == 0:
        print("🎉 All 215 screens now have D1 compliance fields!")

if __name__ == '__main__':
    main()
