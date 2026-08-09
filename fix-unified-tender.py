import re

with open('src/pages/UnifiedTenderManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the second delete button
content = re.sub(
    r'(\{!isReportMode && !delivery\.is_finalized && \(\s*<div className="flex justify-end mb-4 print:hidden">\s*<Button\s+variant="outline"\s+size="sm"\s+onClick=\{\(\) => deleteDelivery\(delivery\.id, delivery\.delivery_number\)\}\s+className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"\s*>\s*<Trash2 className="w-4 h-4 mr-2" />\s*Delete Delivery\s*</Button>\s*</div>\s*\)\})',
    r'{/* Delete button hidden - prevents accidental deletion */}\n                  {/* \1 */}',
    content,
    flags=re.DOTALL
)

with open('src/pages/UnifiedTenderManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ UnifiedTenderManagement.tsx fixed!")
