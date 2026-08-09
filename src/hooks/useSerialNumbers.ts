
import { useState, useMemo } from 'react';

export interface SerialNumberItem {
  id: string;
  serialNumber: string;
  itemId: string;
  itemName: string;
  category: string;
  status: 'Available' | 'Issued' | 'Under Maintenance' | 'Retired';
  location: string;
  issuedTo?: string;
  issuedDate?: string;
  receivedDate: string;
  notes?: string;
  vendorId?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
}

const useSerialNumbers = () => {
  const [serialItems, setSerialItems] = useState<SerialNumberItem[]>([
    {
      id: '1',
      serialNumber: 'LT001',
      itemId: '3',
      itemName: 'Laptops',
      category: 'IT Equipment',
      status: 'Available',
      location: 'IT Storage',
      receivedDate: '2024-05-25',
      notes: 'Dell Inspiron 15',
      purchaseDate: '2024-05-25',
      warrantyExpiry: '2027-05-25'
    },
    {
      id: '2',
      serialNumber: 'LT002',
      itemId: '3',
      itemName: 'Laptops',
      category: 'IT Equipment',
      status: 'Issued',
      location: 'IT Department',
      issuedTo: 'John Doe',
      issuedDate: '2024-05-20',
      receivedDate: '2024-05-15',
      notes: 'Dell Inspiron 15',
      purchaseDate: '2024-05-15',
      warrantyExpiry: '2027-05-15'
    },
    {
      id: '3',
      serialNumber: 'CH001',
      itemId: '1',
      itemName: 'Office Chairs',
      category: 'Furniture',
      status: 'Available',
      location: 'Warehouse A',
      receivedDate: '2024-05-27',
      notes: 'Executive chair',
      purchaseDate: '2024-05-27'
    },
    {
      id: '4',
      serialNumber: 'MN001',
      itemId: '6',
      itemName: 'Monitors',
      category: 'IT Equipment',
      status: 'Under Maintenance',
      location: 'IT Storage',
      receivedDate: '2024-05-22',
      notes: '24-inch LCD, screen issue',
      purchaseDate: '2024-05-22',
      warrantyExpiry: '2026-05-22'
    }
  ]);

  const stats = useMemo(() => {
    const total = serialItems.length;
    const available = serialItems.filter(item => item.status === 'Available').length;
    const issued = serialItems.filter(item => item.status === 'Issued').length;
    const maintenance = serialItems.filter(item => item.status === 'Under Maintenance').length;
    const retired = serialItems.filter(item => item.status === 'Retired').length;

    return {
      total,
      available,
      issued,
      maintenance,
      retired
    };
  }, [serialItems]);

  const addSerialItem = (item: Omit<SerialNumberItem, 'id'>) => {
    const newItem: SerialNumberItem = {
      ...item,
      id: Date.now().toString()
    };
    setSerialItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateSerialItem = (id: string, updatedItem: Partial<SerialNumberItem>) => {
    setSerialItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      )
    );
  };

  const updateSerialItemStatus = (id: string, status: SerialNumberItem['status'], additionalData?: Partial<SerialNumberItem>) => {
    setSerialItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, status, ...additionalData } : item
      )
    );
  };

  const issueSerialItem = (id: string, issuedTo: string, location?: string) => {
    const issueDate = new Date().toISOString().split('T')[0];
    updateSerialItemStatus(id, 'Issued', {
      issuedTo,
      issuedDate: issueDate,
      location: location || 'Issued'
    });
  };

  const returnSerialItem = (id: string, location: string) => {
    updateSerialItemStatus(id, 'Available', {
      issuedTo: undefined,
      issuedDate: undefined,
      location
    });
  };

  const getSerialItemsByStatus = (status: SerialNumberItem['status']) => {
    return serialItems.filter(item => item.status === status);
  };

  const getSerialItemsByItem = (itemId: string) => {
    return serialItems.filter(item => item.itemId === itemId);
  };

  const searchSerialItems = (searchTerm: string) => {
    if (!searchTerm) return serialItems;
    
    const term = searchTerm.toLowerCase();
    return serialItems.filter(item =>
      item.serialNumber.toLowerCase().includes(term) ||
      item.itemName.toLowerCase().includes(term) ||
      item.issuedTo?.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term)
    );
  };

  return {
    serialItems,
    stats,
    addSerialItem,
    updateSerialItem,
    updateSerialItemStatus,
    issueSerialItem,
    returnSerialItem,
    getSerialItemsByStatus,
    getSerialItemsByItem,
    searchSerialItems
  };
};

export default useSerialNumbers;
