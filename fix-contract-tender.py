#!/usr/bin/env python3
"""
Simple script to hide delete buttons across all dashboard pages.
"""

def hide_delete_button_contract_tender():
    """Hide delete button in ContractTender.tsx"""
    file_path = "src/pages/ContractTender.tsx"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the delete button around line 382-388
    modified = False
    for i in range(len(lines)):
        if i >= 381 and i <= 390 and 'onClick={() => handleDelete(tender.id)}' in lines[i]:
            # Found the button, now comment it out
            # Look backwards for <Button
            start_idx = i
            while start_idx > 0 and '<Button' not in lines[start_idx]:
                start_idx -= 1
            
            # Look forward for </Button>
            end_idx = i
            while end_idx < len(lines) and '</Button>' not in lines[end_idx]:
                end_idx += 1
            
            # Comment out these lines
            commented_lines = ['                        {/* Delete button hidden - prevents accidental deletion */}\n',
                             '                        {/* <Button\n']
            
            for j in range(start_idx + 1, end_idx):
                # Add proper indentation and comment markers
                commented_lines.append('                          ' + lines[j].lstrip())
            
            commented_lines.append('                        </Button> */}\n')
            
            # Replace the section
            lines = lines[:start_idx] + commented_lines + lines[end_idx + 1:]
            modified = True
            break
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"✅ Modified: {file_path}")
    else:
        print(f"ℹ️  No changes needed: {file_path}")

if __name__ == "__main__":
    hide_delete_button_contract_tender()
