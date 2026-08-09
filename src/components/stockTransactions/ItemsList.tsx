import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Package, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { TransactionItem } from './types';

interface ItemsListProps {
  items: TransactionItem[];
  onUpdateActualPrice: (itemId: string, actualPrice: number) => void;
  onDeleteItem: (itemId: string) => void;
  loading?: boolean;
}

const ItemsList: React.FC<ItemsListProps> = ({
  items,
  onUpdateActualPrice,
  onDeleteItem,
  loading = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCompletionStatus = (item: TransactionItem) => {
    const percentage = (item.quantity_received / item.quantity) * 100;
    if (percentage >= 100) return { status: 'complete', color: 'green', icon: CheckCircle };
    if (percentage > 0) return { status: 'partial', color: 'yellow', icon: AlertCircle };
    return { status: 'pending', color: 'gray', icon: Package };
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => {
      const price = item.actual_unit_price || item.unit_price;
      return total + (price * item.quantity);
    }, 0);
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No items selected. Please choose a tender to view items.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Transaction Items ({items.length})
          </CardTitle>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Value</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(getTotalValue())}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => {
            const status = getCompletionStatus(item);
            const StatusIcon = status.icon;
            const actualPrice = item.actual_unit_price || item.unit_price;
            const totalItemValue = actualPrice * item.quantity;
            
            return (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`h-4 w-4 text-${status.color}-500`} />
                      <h3 className="font-medium text-gray-900">{item.item_code}</h3>
                      <Badge 
                        variant={status.status === 'complete' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          status.status === 'complete' ? 'bg-green-100 text-green-800' :
                          status.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {status.status === 'complete' ? 'Complete' :
                         status.status === 'partial' ? 'Partial' : 'Pending'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{item.item_description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <div className="font-medium">{item.quantity}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Received:</span>
                        <div className="font-medium text-green-600">
                          {item.quantity_received} / {item.quantity}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Original Price:</span>
                        <div className="font-medium">{formatCurrency(item.unit_price)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Value:</span>
                        <div className="font-medium text-green-600">{formatCurrency(totalItemValue)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      onClick={() => onDeleteItem(item.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:border-red-300"
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Editable Actual Unit Price */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Actual Unit Price:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={actualPrice}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          onUpdateActualPrice(item.id, newPrice);
                        }}
                        className="w-32 h-8"
                        disabled={loading}
                      />
                      {item.actual_unit_price && item.actual_unit_price !== item.unit_price && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-blue-50 text-blue-700 border-blue-300"
                        >
                          Modified
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {item.actual_unit_price && item.actual_unit_price !== item.unit_price && (
                    <div className="mt-2 text-xs text-gray-600">
                      Price difference: {formatCurrency(Math.abs(item.actual_unit_price - item.unit_price))}
                      {item.actual_unit_price > item.unit_price ? ' increase' : ' decrease'}
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Delivery Progress</span>
                    <span>{Math.round((item.quantity_received / item.quantity) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        status.status === 'complete' ? 'bg-green-500' :
                        status.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min((item.quantity_received / item.quantity) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-lg font-semibold">{items.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Quantity</div>
              <div className="text-lg font-semibold">{items.reduce((sum, item) => sum + item.quantity, 0)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(getTotalValue())}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemsList;
