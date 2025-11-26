#!/usr/bin/env python3
"""
Script to add D1 compliance fields to all screen entries in SCREEN_REGISTRY.md
This script adds the 6 required D1 fields before the **Notes** field in each entry.
"""

import re
import sys

def add_d1_fields(content):
    """Add D1 fields to each screen entry before the **Notes** field."""
    
    # Pattern to match screen entries
    # Looks for Status line followed by Notes line
    pattern = r'(- \*\*Status\*\*: [^\n]+\n)(\s*- \*\*Notes\*\*:)'
    
    # Replacement template with D1 fields
    replacement = r'''\1- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
\2'''
    
    # Apply the replacement
    updated_content = re.sub(pattern, replacement, content)
    
    return updated_content

def main():
    # Read the registry file
    try:
        with open('docs/SCREEN_REGISTRY.md', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("Error: docs/SCREEN_REGISTRY.md not found")
        sys.exit(1)
    
    # Check if D1 fields already exist
    if '**Purpose**:' in content:
        print("D1 fields appear to already exist in the file")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            print("Aborted")
            sys.exit(0)
    
    # Add D1 fields
    print("Adding D1 compliance fields...")
    updated_content = add_d1_fields(content)
    
    # Count how many entries were updated
    original_count = content.count('- **Notes**:')
    updated_count = updated_content.count('- **Purpose**:')
    
    print(f"Updated {updated_count} screen entries")
    
    # Write back to file
    with open('docs/SCREEN_REGISTRY.md', 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print("✅ Successfully updated SCREEN_REGISTRY.md")
    print("Note: All fields set to 'TBD (pending functional review)'")
    print("You can now manually update specific fields as needed")

if __name__ == '__main__':
    main()
