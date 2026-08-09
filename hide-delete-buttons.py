#!/usr/bin/env python3
"""
Script to hide delete buttons across all dashboard pages
by commenting them out to prevent accidental deletions.
"""

import re
from pathlib import Path

# Define the files and their delete button patterns to comment out
files_to_fix = {
    "src/pages/ContractTender.tsx": [
        {
            "pattern": r'(\s+)</Button>\s+<Button\s+variant="outline"\s+size="sm"\s+onClick=\{\(\) => handleDelete\(tender\.id\)\}\s+className="text-red-600 hover:text-red-700 hover:bg-red-50"\s+>\s+<Trash2 className="w-4 h-4" />\s+</Button>',
            "replacement": r'\1</Button>\n\n                        {/* Delete button hidden - prevents accidental deletion */}\n                        {/* <Button\n                          variant="outline"\n                          size="sm"\n                          onClick={() => handleDelete(tender.id)}\n                          className="text-red-600 hover:text-red-700 hover:bg-red-50"\n                        >\n                          <Trash2 className="w-4 h-4" />\n                        </Button> */}'
        }
    ],
    "src/pages/Categories.tsx": [
        {
            "pattern": r'(<Button[^>]*onClick=\{\(\) => handleDeleteCategory\([^)]+\)[^>]*>\s*<Trash2[^/]*/>.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                        {/* \1 */}'
        }
    ],
    "src/pages/SubCategories.tsx": [
        {
            "pattern": r'(<Button[^>]*onClick=\{\(\) => handleDeleteSubCategory\([^)]+\)[^>]*>\s*<Trash2[^/]*/>.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                          {/* \1 */}'
        }
    ],
    "src/pages/UnifiedTenderManagement.tsx": [
        {
            "pattern": r'(deleteDelivery\(delivery\.id, delivery\.delivery_number\);[^}]*}\s*title="Delete delivery"[^>]*>\s*<Trash2[^/]*/>.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                                {/* \1 */}',
            "flags": re.DOTALL
        },
        {
            "pattern": r'(<Button[^>]*onClick=\{\(\) => deleteDelivery\([^)]+\)[^>]*>\s*<Trash2[^/]*/>.*?Delete Delivery.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                            {/* \1 */}',
            "flags": re.DOTALL
        }
    ],
    "src/pages/VendorManagement.tsx": [
        {
            "pattern": r'(<Button[^>]*onClick=\{\(\) => handleDeleteVendor\([^)]+\)[^>]*>\s*<Trash2[^/]*/>.*?Delete Vendor.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                          {/* \1 */}',
            "flags": re.DOTALL
        }
    ],
    "src/pages/VendorInfo.tsx": [
        {
            "pattern": r'(<Button[^>]*onClick=\{\(\) => deleteVendor\([^)]+\)[^>]*>\s*<Trash2[^/]*/>.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                      {/* \1 */}',
            "flags": re.DOTALL
        }
    ],
    "src/pages/items-master.tsx": [
        {
            "pattern": r'(<Button[^>]*onClick=\{\(\) => handleDelete\(item\)[^>]*>\s*<Trash2[^/]*/>.*?Delete.*?</Button>)',
            "replacement": r'{/* Delete button hidden - prevents accidental deletion */}\n                              {/* \1 */}',
            "flags": re.DOTALL
        }
    ],
}

def hide_delete_buttons():
    """Hide delete buttons in all specified files."""
    base_path = Path(__file__).parent
    modified_files = []
    
    for file_path, patterns in files_to_fix.items():
        full_path = base_path / file_path
        
        if not full_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue
        
        print(f"📝 Processing: {file_path}")
        
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        for pattern_info in patterns:
            pattern = pattern_info["pattern"]
            replacement = pattern_info["replacement"]
            flags = pattern_info.get("flags", 0)
            
            content = re.sub(pattern, replacement, content, flags=flags)
        
        if content != original_content:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Modified: {file_path}")
            modified_files.append(file_path)
        else:
            print(f"ℹ️  No changes needed: {file_path}")
    
    print(f"\n✨ Modified {len(modified_files)} files:")
    for file in modified_files:
        print(f"   - {file}")

if __name__ == "__main__":
    hide_delete_buttons()
    print("\n✅ All delete buttons have been hidden!")
