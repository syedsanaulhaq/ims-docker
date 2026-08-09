import React, { useState, useEffect } from 'react';
import { Trash, RefreshCw, Trash2 } from 'lucide-react';

// Exact API data structure
interface Item {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: string;
  sub_category_id: string;
  specifications: string;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
  category_name: string;
  sub_category_name: string;
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

const ItemMasterManagement = () => {
  // Simple state
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  // Load items
  const loadItems = async (includeDeleted = false) => {
    try {
      setLoading(true);
      setError('');
      
      const url = includeDeleted 
        ? 'http://localhost:3001/api/item-masters?includeDeleted=true'
        : 'http://localhost:3001/api/item-masters';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : (data.items || []));
        } else {
        setError(`HTTP Error: ${response.status}`);
      }
    } catch (err) {
      setError(`Network Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('❌ Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when showDeleted changes
  useEffect(() => {
    loadItems(showDeleted);
  }, [showDeleted]);

  // Delete item (soft delete)
  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (!window.confirm(`Move "${itemName}" to trash?`)) {
      return;
    }

    try {
      setDeletingId(itemId);
      const response = await fetch(`http://localhost:3001/api/item-masters/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Item moved to trash');
        loadItems(showDeleted);
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  // Restore item
  const handleRestoreItem = async (itemId: number, itemName: string) => {
    if (!window.confirm(`Restore "${itemName}"?`)) {
      return;
    }

    try {
      setRestoringId(itemId);
      const response = await fetch(`http://localhost:3001/api/item-masters/${itemId}/restore`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Item restored successfully');
        loadItems(showDeleted);
      } else {
        alert('Failed to restore item');
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRestoringId(null);
    }
  };

  // Filter items based on showDeleted
  const filteredItems = items.filter(item => {
    if (!showDeleted && (item.is_deleted === 1 || item.is_deleted === true)) {
      return false;
    }
    if (showDeleted && (item.is_deleted === 0 || item.is_deleted === false)) {
      return false;
    }
    return true;
  });

  // Show loading
  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Item Master Management</h1>
        <div className="text-gray-600">Loading items...</div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Item Master Management</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={() => loadItems(showDeleted)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main UI
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Item Master Management</h1>
        
        {/* Show Deleted Toggle */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <Trash className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Show Deleted</span>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`ml-2 px-3 py-1 rounded text-sm font-medium transition ${
              showDeleted
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {showDeleted ? 'ON' : 'OFF'}
          </button>
          {!showDeleted && items.some(i => i.is_deleted === 1 || i.is_deleted === true) && (
            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {items.filter(i => i.is_deleted === 1 || i.is_deleted === true).length}
            </span>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{items.length}</div>
            <div className="text-sm text-gray-600">{showDeleted ? 'Deleted Items' : 'Total Items'}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {items.filter(item => !item.is_deleted && item.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Active Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {new Set(items.filter(i => !i.is_deleted || showDeleted).map(item => item.category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {new Set(items.filter(i => !i.is_deleted || showDeleted).map(item => item.sub_category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Sub-Categories</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{showDeleted ? 'Deleted Items' : 'Items List'}</h2>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {showDeleted ? 'No deleted items' : 'No items found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sub-Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Specifications</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr 
                    key={item.item_id} 
                    className={`hover:bg-gray-50 ${item.is_deleted === 1 || item.is_deleted === true ? 'opacity-60 bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-2 text-sm font-mono font-medium text-blue-600">
                      {item.item_code}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {item.item_name}
                        {(item.is_deleted === 1 || item.is_deleted === true) && (
                          <span className="px-2 py-1 text-xs bg-red-500 text-white rounded">
                            🗑️ Deleted
                          </span>
                        )}
                      </div>
                      {item.deleted_at && (
                        <div className="text-xs text-red-600">
                          Deleted: {new Date(item.deleted_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.category_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.sub_category_name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.unit_of_measure}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {item.specifications || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.is_deleted === 1 || item.is_deleted === true ? (
                        <button
                          onClick={() => handleRestoreItem(item.item_id, item.item_name)}
                          disabled={restoringId === item.item_id}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                        >
                          {restoringId === item.item_id ? '...' : '📥 Restore'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteItem(item.item_id, item.item_name)}
                          disabled={deletingId === item.item_id}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === item.item_id ? '...' : '🗑️ Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
        <strong>Debug:</strong> 
        <div>API: http://localhost:3001/api/item-masters</div>
        <div>Items loaded: {items.length} (Showing: {filteredItems.length})</div>
        <div>Show Deleted: {showDeleted ? 'YES' : 'NO'}</div>
        <div>Last update: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default ItemMasterManagement;

  // Show loading
  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Item Master Management</h1>
        <div className="text-gray-600">Loading items...</div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Item Master Management</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={loadItems}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main UI
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Item Master Management</h1>
      
      {/* Stats */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{items.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {items.filter(item => item.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Active Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {new Set(items.map(item => item.category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {new Set(items.map(item => item.sub_category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Sub-Categories</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Items List</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sub-Category</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Specifications</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono font-medium text-blue-600">
                      {item.item_code}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.category_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.sub_category_name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.unit_of_measure}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {item.specifications || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
        <strong>Debug:</strong> 
        <div>API: http://localhost:3001/api/item-masters</div>
        <div>Items loaded: {items.length}</div>
        <div>Last update: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default ItemMasterManagement;