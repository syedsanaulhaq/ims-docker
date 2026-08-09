
import { useState, useEffect } from 'react';
import { InventoryItem } from '@/hooks/useInventoryData';

export interface ComboboxItem {
  id: string;
  name: string;
  isNew?: boolean;
}

export const useItemsCombobox = (inventoryItems: InventoryItem[]) => {
  const [customItems, setCustomItems] = useState<ComboboxItem[]>([]);
  const [allItems, setAllItems] = useState<ComboboxItem[]>([]);

  useEffect(() => {
    // Load custom items from localStorage
    const savedItems = localStorage.getItem('customItems');
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        setCustomItems(parsed);
      } catch (error) {
        
      }
    }
  }, []);

  useEffect(() => {
    // Support both InventoryItem[] and ItemMaster[] as input
    const inventoryComboboxItems: ComboboxItem[] = inventoryItems.map(item => {
      // If item has 'nomenclature', treat as ItemMaster
      if ('nomenclature' in item) {
        // Use (item as any) to access itemCode for ItemMaster
        const nomenclature = (item as any).nomenclature || '';
        const itemCode = (item as any).itemCode || '';
        const name = itemCode ? `${itemCode} - ${nomenclature}` : nomenclature;
        return {
          id: item.id,
          name
        };
      } else {
        // Fallback for InventoryItem (legacy)
        return {
          id: item.id,
          name: (item as any).name || ''
        };
      }
    });

    const combined = [...inventoryComboboxItems, ...customItems];
    setAllItems(combined);
  }, [inventoryItems, customItems]);

  const addCustomItem = (itemName: string): ComboboxItem => {
    const newItem: ComboboxItem = {
      id: `custom-${Date.now()}`,
      name: itemName.trim(),
      isNew: true
    };

    const updatedCustomItems = [...customItems, newItem];
    setCustomItems(updatedCustomItems);
    
    // Save to localStorage
    localStorage.setItem('customItems', JSON.stringify(updatedCustomItems));
    
    return newItem;
  };

  const findItemByName = (name: string): ComboboxItem | undefined => {
    return allItems.find(item => 
      item.name.toLowerCase() === name.toLowerCase().trim()
    );
  };

  return {
    allItems,
    addCustomItem,
    findItemByName
  };
};
