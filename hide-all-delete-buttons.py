#!/usr/bin/env python3
"""
Quick script to hide all delete buttons across dashboard pages.
Simply comments out the delete button JSX elements.
"""
import os
import re

def comment_out_delete_buttons():
    """Comment out delete buttons in all dashboard files."""
    
    files_to_process = [
        ("src/pages/Categories.tsx", [
            (r'(<Button[^>]*onClick=\{[^}]*handleDeleteCategory[^}]*\}[^>]*>.*?<Trash2[^/]*/>\s*</Button>)', 
             r'{/* Delete button hidden */}\n                  {/* \1 */}'),
        ]),
        ("src/pages/SubCategories.tsx", [
            (r'(<Button[^>]*onClick=\{[^}]*handleDeleteSubCategory[^}]*\}[^>]*>.*?<Trash2[^/]*/>\s*</Button>)', 
             r'{/* Delete button hidden */}\n                          {/* \1 */}'),
        ]),
        ("src/pages/UnifiedTenderManagement.tsx", [
            (r'(onClick=\{[^}]*deleteDelivery[^}]*\}[^>]*title="Delete delivery"[^>]*>.*?<Trash2[^/]*/>\s*</Button>)', 
             r'{/* Delete button hidden */} {/* \1 */}'),
            (r'(<Button[^>]*onClick=\{[^}]*deleteDelivery[^}]*\}[^>]*>.*?<Trash2[^/]*/>\s*.*?Delete Delivery\s*</Button>)', 
             r'{/* Delete button hidden */}\n                            {/* \1 */}'),
        ]),
        ("src/pages/VendorManagement.tsx", [
            (r'(<Button[^>]*onClick=\{[^}]*handleDeleteVendor[^}]*\}[^>]*>.*?<Trash2[^/]*/>\s*.*?Delete Vendor\s*</Button>)', 
             r'{/* Delete button hidden */}\n                          {/* \1 */}'),
        ]),
        ("src/pages/VendorInfo.tsx", [
            (r'(<Button[^>]*onClick=\{[^}]*deleteVendor[^}]*\}[^>]*>.*?<Trash2[^/]*/>\s*</Button>)', 
             r'{/* Delete button hidden */}\n                      {/* \1 */}'),
        ]),
        ("src/pages/items-master.tsx", [
            (r'(<Button[^>]*onClick=\{[^}]*handleDelete\(item\)[^}]*\}[^>]*>.*?<Trash2[^/]*/>\s*.*?Delete\s*</Button>)', 
             r'{/* Delete button hidden */}\n                              {/* \1 */}'),
        ]),
    ]
    
    modified_count = 0
    
    for file_path, patterns in files_to_process:
        if not os.path.exists(file_path):
            print(f"⚠️  Skipped (not found): {file_path}")
            continue
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ {file_path}")
            modified_count += 1
        else:
            print(f"ℹ️  No change needed: {file_path}")
    
    return modified_count

if __name__ == "__main__":
    print("🔧 Hiding delete buttons across all dashboard pages...\n")
    count = comment_out_delete_buttons()
    print(f"\n✨ Done! Modified {count} files.")
