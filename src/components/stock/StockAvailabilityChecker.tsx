import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Stock Availability Checker Component
 * Use this in your Stock Issuance form to check if requested items are available
 */

interface StockItem {
  item_master_id: string;
  nomenclature: string;
  item_code: string;
  description: string;
  category_name: string;
  item_type: string;
  sub_category_name: string;
  unit_price: number;
  current_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  minimum_stock_level: number;
  stock_status: 'Available' | 'Low Stock' | 'Out of Stock';
}

interface AvailabilityCheckResult {
  item_master_id: string;
  nomenclature: string;
  requested_quantity: number;
  available_quantity: number;
  availability_status: 'Available' | 'Partial' | 'Out of Stock';
  can_fulfill: boolean;
}

interface StockAvailabilityCheckerProps {
  onItemSelect?: (item: StockItem) => void;
  onAvailabilityCheck?: (result: AvailabilityCheckResult) => void;
  selectedItems?: Array<{ item_master_id: string; requested_quantity: number }>;
}

export default function StockAvailabilityChecker({ 
  onItemSelect, 
  onAvailabilityCheck,
  selectedItems = [] 
}: StockAvailabilityCheckerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState<number>(1);
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);
  const [batchCheckResult, setBatchCheckResult] = useState<any>(null);

  // Search items with stock availability
  const searchItems = async (term?: string) => {
    const searchValue = term !== undefined ? term : searchTerm;
    
    if (!searchValue.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/stock/search-with-availability?search=${encodeURIComponent(searchValue)}`
      );
      const data = await response.json();
      setSearchResults(data.items || []);
      } catch (error) {
      console.error('❌ Error searching items:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search as user types (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchItems(searchTerm);
      } else if (searchTerm.trim().length === 0) {
        setSearchResults([]);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Check availability for a specific item
  const checkSingleItemAvailability = async (itemId: string, quantity: number) => {
    try {
      const response = await fetch('/api/stock/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_master_id: itemId,
          requested_quantity: quantity
        })
      });
      const data = await response.json();
      setAvailabilityResult(data);
      
      if (onAvailabilityCheck && data.stock_info) {
        onAvailabilityCheck({
          item_master_id: itemId,
          nomenclature: data.stock_info.nomenclature,
          requested_quantity: quantity,
          available_quantity: data.stock_info.available_quantity,
          availability_status: data.stock_info.availability_status,
          can_fulfill: data.available
        });
      }

      } catch (error) {
      console.error('❌ Error checking availability:', error);
    }
  };

  // Check availability for all selected items (batch check)
  const checkBatchAvailability = async () => {
    if (selectedItems.length === 0) return;

    try {
      const response = await fetch('/api/stock/check-availability-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems })
      });
      const data = await response.json();
      setBatchCheckResult(data);
      } catch (error) {
      console.error('❌ Error checking batch availability:', error);
    }
  };

  // Auto-check batch availability when selectedItems changes
  useEffect(() => {
    if (selectedItems.length > 0) {
      checkBatchAvailability();
    }
  }, [selectedItems]);

  // Handle item selection
  const handleItemSelect = (item: StockItem) => {
    setSelectedItem(item);
    if (onItemSelect) {
      onItemSelect(item);
    }
    // Auto-check availability with quantity 1
    checkSingleItemAvailability(item.item_master_id, 1);
  };

  // Handle quantity change and re-check availability
  const handleQuantityChange = (quantity: number) => {
    setRequestedQuantity(quantity);
    if (selectedItem) {
      checkSingleItemAvailability(selectedItem.item_master_id, quantity);
    }
  };

  // Get stock status badge
  const getStockStatusBadge = (status: string) => {
    const badges = {
      'Available': <Badge className="bg-green-500 text-white">Available</Badge>,
      'Low Stock': <Badge className="bg-yellow-500 text-white">Low Stock</Badge>,
      'Out of Stock': <Badge className="bg-red-500 text-white">Out of Stock</Badge>
    };
    return badges[status as keyof typeof badges] || <Badge>Unknown</Badge>;
  };

  // Get availability icon
  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'Available':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'Partial':
        return <AlertTriangle className="text-yellow-500" size={24} />;
      case 'Out of Stock':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search size={20} />
          Search Items with Stock Availability
        </h3>

        <div className="flex gap-2">
          <Input
            placeholder="Type at least 2 characters to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchItems()}
            className="flex-1"
          />
          <Button onClick={() => searchItems()} disabled={loading || searchTerm.trim().length < 2}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Search hint */}
        {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
          <p className="text-sm text-gray-500 mt-2">
            ℹ️ Type at least 2 characters to search
          </p>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4 text-center text-gray-500">
            <p>🔍 Searching for items...</p>
          </div>
        )}

        {/* No results message */}
        {!loading && searchTerm.trim().length >= 2 && searchResults.length === 0 && (
          <div className="mt-4 text-center text-gray-500 p-4 bg-gray-50 rounded-lg">
            <p>📦 No items found matching "{searchTerm}"</p>
            <p className="text-xs mt-1">Try a different search term or check the spelling</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((item) => (
              <div
                key={item.item_master_id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedItem?.item_master_id === item.item_master_id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleItemSelect(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.nomenclature}</h4>
                    <p className="text-sm text-gray-600">{item.item_code}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs text-gray-500">{item.category_name}</span>
                      {item.sub_category_name && (
                        <span className="text-xs text-gray-500">• {item.sub_category_name}</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {item.item_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStockStatusBadge(item.stock_status)}
                    <p className="text-sm font-semibold mt-2">
                      Available: {item.available_quantity}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: {item.current_quantity}
                    </p>
                    {item.reserved_quantity > 0 && (
                      <p className="text-xs text-yellow-600">
                        Reserved: {item.reserved_quantity}
                      </p>
                    )}
                    {item.unit_price !== undefined && item.unit_price !== null && (
                      <p className="text-sm text-gray-600 mt-1">
                        ₨ {item.unit_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability Check Section */}
      {selectedItem && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package size={20} />
            Check Availability
          </h3>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">{selectedItem.nomenclature}</p>
              <p className="text-sm text-gray-600">Code: {selectedItem.item_code}</p>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Requested Quantity:</label>
                <Input
                  type="number"
                  min="1"
                  value={requestedQuantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-32 mt-1"
                />
              </div>
              <Button
                onClick={() => checkSingleItemAvailability(selectedItem.item_master_id, requestedQuantity)}
              >
                Check Availability
              </Button>
            </div>

            {/* Availability Result */}
            {availabilityResult && availabilityResult.error && (
              <div className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-500" size={24} />
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-yellow-800">Availability Check Not Available</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The stock availability function is not yet set up in the database. You can still add items to your request.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {availabilityResult && !availabilityResult.error && availabilityResult.stock_info && (
              <div className={`p-4 rounded-lg border-2 ${
                availabilityResult.available 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-start gap-3">
                  {getAvailabilityIcon(availabilityResult.stock_info.availability_status)}
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{availabilityResult.message}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600">Requested:</p>
                        <p className="font-semibold">{availabilityResult.stock_info.requested_quantity} units</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available:</p>
                        <p className="font-semibold">{availabilityResult.stock_info.available_quantity} units</p>
                      </div>
                      <div>
                        <p className="text-gray-600">After Issue:</p>
                        <p className="font-semibold">{availabilityResult.stock_info.remaining_after_issue} units</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estimated Value:</p>
                        <p className="font-semibold">₨ {availabilityResult.stock_info.estimated_value?.toLocaleString()}</p>
                      </div>
                    </div>

                    {availabilityResult.stock_info.will_trigger_reorder === 'Yes' && (
                      <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                        <p className="text-sm text-yellow-800">
                          ⚠️ This issuance will trigger reorder alert (minimum level: {availabilityResult.stock_info.minimum_stock_level})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Availability Summary */}
      {batchCheckResult && !batchCheckResult.error && batchCheckResult.summary && selectedItems.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">
            Request Items Availability Summary
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded text-center">
              <p className="text-2xl font-bold">{batchCheckResult.summary.total_items}</p>
              <p className="text-sm text-gray-600">Total Items</p>
            </div>
            <div className="p-3 bg-green-50 rounded text-center">
              <p className="text-2xl font-bold text-green-600">{batchCheckResult.summary.available}</p>
              <p className="text-sm text-gray-600">Available</p>
            </div>
            <div className="p-3 bg-red-50 rounded text-center">
              <p className="text-2xl font-bold text-red-600">{batchCheckResult.summary.unavailable}</p>
              <p className="text-sm text-gray-600">Unavailable</p>
            </div>
          </div>

          {batchCheckResult.all_available ? (
            <div className="p-4 bg-green-50 border border-green-300 rounded flex items-center gap-3">
              <CheckCircle className="text-green-500" size={24} />
              <p className="text-green-800 font-semibold">
                ✅ All requested items are available in stock!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-4 bg-red-50 border border-red-300 rounded flex items-center gap-3">
                <XCircle className="text-red-500" size={24} />
                <p className="text-red-800 font-semibold">
                  ❌ Some items are not available in requested quantities
                </p>
              </div>

              <div className="space-y-2">
                {batchCheckResult.items.filter((item: any) => !item.can_fulfill).map((item: any) => (
                  <div key={item.item_master_id} className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="font-semibold">{item.nomenclature}</p>
                    <p className="text-sm text-red-600">
                      Requested: {item.requested_quantity}, Available: {item.available_quantity || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

