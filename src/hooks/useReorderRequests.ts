
import { useState, useEffect } from 'react';

export interface ReorderRequest {
  id: string;
  itemId: string;
  itemName: string;
  currentStock: number;
  minimumStock: number;
  requestedDate: string;
  status: 'Pending' | 'Processing' | 'Completed';
}

const useReorderRequests = () => {
  const [reorderRequests, setReorderRequests] = useState<ReorderRequest[]>(() => {
    try {
      const saved = localStorage.getItem('reorderRequests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('reorderRequests', JSON.stringify(reorderRequests));
  }, [reorderRequests]);

  const addReorderRequest = (item: any) => {
    const newRequest: ReorderRequest = {
      id: `RR-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };

    setReorderRequests(prev => [...prev, newRequest]);
    return newRequest;
  };

  const updateRequestStatus = (id: string, status: ReorderRequest['status']) => {
    setReorderRequests(prev => 
      prev.map(req => req.id === id ? { ...req, status } : req)
    );
  };

  const removeRequest = (id: string) => {
    setReorderRequests(prev => prev.filter(req => req.id !== id));
  };

  const getRequestForItem = (itemId: string) => {
    return reorderRequests.find(req => req.itemId === itemId && req.status === 'Pending');
  };

  const getPendingRequests = () => {
    return reorderRequests.filter(req => req.status === 'Pending');
  };

  return {
    reorderRequests,
    addReorderRequest,
    updateRequestStatus,
    removeRequest,
    getRequestForItem,
    getPendingRequests
  };
};

export default useReorderRequests;
