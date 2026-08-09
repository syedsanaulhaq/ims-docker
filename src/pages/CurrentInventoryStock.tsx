import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, Calendar, Search, Filter, Eye, History } from 'lucide-react';

interface InventoryItem {
  id: string;
  item_master_id: string;
  current_quantity: number;
  last_transaction_date: string;
  last_transaction_type: string;
  last_updated: string;
  nomenclature: string;
  item_code: string;
  unit: string;
  specifications: string | null;
  category_name: string;
  category_description: string | null;
}

interface InventorySummary {
  total_items: number;
  total_quantity: number;
  total_categories: number;
  low_stock_items: number;
  total_acquisitions: number;
  last_updated: string;
}

interface TransactionHistory {
  delivery_number: string;
  delivery_date: string;
  receiving_date: string;
  delivery_personnel: string;
  delivery_chalan: string;
  po_number: string;
  delivery_qty: number;
  quality_status: string;
  acquisition_number: string;
  acquisition_date: string;
}

const CurrentInventoryStock: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemHistory, setItemHistory] = useState<TransactionHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    fetchInventoryData();
    fetchSummary();
  }, [searchTerm, showLowStock]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (showLowStock) params.append('low_stock', 'true');

      const response = await fetch(`http://localhost:3001/api/inventory/current-stock?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      
      const data = await response.json();
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory/current-stock/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchItemHistory = async (itemId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/inventory/current-stock/${itemId}/history`);
      if (!response.ok) throw new Error('Failed to fetch item history');
      
      const data = await response.json();
      setItemHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching item history:', error);
    }
  };

  const handleViewHistory = async (item: InventoryItem) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    await fetchItemHistory(item.item_master_id);
  };

  const getStockStatusColor = (quantity: number): string => {
    if (quantity === 0) return 'text-red-600 bg-red-50';
    if (quantity < 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Current Inventory Stock</h1>
          <p className="text-gray-600 mt-1">Real-time inventory from purchase/supply order deliveries</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_items}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_quantity}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.low_stock_items}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Acquisitions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_acquisitions}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by item name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              showLowStock
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-5 w-5" />
            {showLowStock ? 'Show All' : 'Low Stock Only'}
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3">Loading inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No inventory items found</p>
                    <p className="text-sm mt-1">
                      {searchTerm || showLowStock
                        ? 'Try adjusting your filters'
                        : 'Receive deliveries from purchase/supply orders to add items to inventory'}
                    </p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.nomenclature}</div>
                        <div className="text-sm text-gray-500">{item.item_code}</div>
                        {item.specifications && (
                          <div className="text-xs text-gray-400 mt-1">{item.specifications}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {item.category_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStockStatusColor(
                          item.current_quantity
                        )}`}
                      >
                        {item.current_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.unit}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.last_transaction_type}</div>
                      <div className="text-xs text-gray-500">{formatDate(item.last_transaction_date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewHistory(item)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        title="View Transaction History"
                      >
                        <History className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedItem.nomenclature}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedItem.item_code}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Current Quantity: <span className="font-semibold">{selectedItem.current_quantity} {selectedItem.unit}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
              {itemHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transaction history available</p>
              ) : (
                <div className="space-y-4">
                  {itemHistory.map((transaction, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900">{transaction.delivery_number}</span>
                          <span className="ml-2 text-sm text-gray-500">({transaction.po_number})</span>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          +{transaction.delivery_qty} {selectedItem.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Received:</span> {formatDate(transaction.receiving_date)}
                        </div>
                        <div>
                          <span className="font-medium">Personnel:</span> {transaction.delivery_personnel}
                        </div>
                        <div>
                          <span className="font-medium">Challan:</span> {transaction.delivery_chalan}
                        </div>
                        <div>
                          <span className="font-medium">Acquisition:</span> {transaction.acquisition_number}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentInventoryStock;
