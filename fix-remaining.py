import re

# VendorManagement.tsx
with open('src/pages/VendorManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(<DropdownMenuItem\s+onClick=\{[^}]*handleDeleteVendor[^}]*\}\s+className="text-red-600"\s*>.*?Delete Vendor\s*</DropdownMenuItem>)',
    r'{/* Delete button hidden */}\n                    {/* \1 */}',
    content,
    flags=re.DOTALL
)

with open('src/pages/VendorManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ VendorManagement.tsx")

# items-master.tsx  
with open('src/pages/items-master.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(<Button\s+[^>]*onClick=\{\(\) => handleDelete\(item\)\}[^>]*>.*?<Trash2[^/]*/>\s*.*?Delete\s*</Button>)',
    r'{/* Delete button hidden */}\n                              {/* \1 */}',
    content,
    flags=re.DOTALL
)

with open('src/pages/items-master.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ items-master.tsx")

print("\n✨ All delete buttons hidden!")
