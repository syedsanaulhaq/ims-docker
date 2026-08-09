import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  Package, 
  AlertTriangle, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Tag,
  BarChart3,
  Info,
  TrendingUp
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface ItemDetails {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  current_quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  reorder_point?: number;
  unit?: string;
  specifications?: string;
  description?: string;
  status?: string;
  last_updated?: string;
  created_at?: string;
}

const ItemDetailsPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemId) {
      loadItemDetails(itemId);
    }
  }, [itemId]);

  const loadItemDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from inventory stock API
      const response = await fetch('http://localhost:3001/api/inventory-stock', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }

      const data = await response.json();
      const itemData = Array.isArray(data) ? data.find((item: any) => item.id === id) : null;

      if (itemData) {
        setItem(itemData);
      } else {
        setError('Item not found');
      }
    } catch (err) {
      console.error('Error loading item details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = () => {
    if (!item) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: Info };
    
    if (item.current_quantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: XCircle };
    } else if (item.minimum_stock_level > 0 && item.current_quantity <= item.minimum_stock_level) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Item Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The item details could not be loaded.'}</p>
          <Button onClick={() => navigate('/dashboard/inventory-details')} variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/dashboard/inventory-details')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Inventory
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.item_name}</h1>
            <p className="text-gray-600 mt-1">Item Code: {item.item_code}</p>
          </div>
        </div>
        <Badge className={`${stockStatus.color} flex items-center gap-1 text-base px-4 py-2`}>
          <StatusIcon size={16} />
          {stockStatus.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Levels Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={20} />
              Stock Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Package size={14} />
                  Current Stock
                </label>
                <p className={`text-3xl font-bold mt-2 ${
                  item.current_quantity === 0 ? 'text-red-600' :
                  (item.minimum_stock_level > 0 && item.current_quantity <= item.minimum_stock_level) ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {item.current_quantity || 0}
                  {item.unit && <span className="text-sm text-gray-600 ml-1">{item.unit}</span>}
                </p>
              </div>

              {item.available_quantity !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <CheckCircle size={14} />
                    Available
                  </label>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {item.available_quantity}
                    {item.unit && <span className="text-sm text-gray-600 ml-1">{item.unit}</span>}
                  </p>
                </div>
              )}

              {item.reserved_quantity !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Reserved
                  </label>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {item.reserved_quantity}
                    {item.unit && <span className="text-sm text-gray-600 ml-1">{item.unit}</span>}
                  </p>
                </div>
              )}

              {item.reorder_point !== undefined && item.reorder_point > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <TrendingUp size={14} />
                    Reorder Point
                  </label>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {item.reorder_point}
                    {item.unit && <span className="text-sm text-gray-600 ml-1">{item.unit}</span>}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info size={20} />
              Quick Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.category && (
              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <p className="text-gray-900 mt-1 font-medium">{item.category}</p>
              </div>
            )}

            {item.status && (
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p className="text-gray-900 mt-1 capitalize">{item.status}</p>
              </div>
            )}

            {item.last_updated && (
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Calendar size={14} />
                  Last Updated
                </label>
                <p className="text-gray-900 mt-1">{formatDateDMY(item.last_updated)}</p>
              </div>
            )}

            {item.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Calendar size={14} />
                  Created
                </label>
                <p className="text-gray-900 mt-1">{formatDateDMY(item.created_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 gap-6">
        {(item.specifications || item.description) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag size={20} />
                Item Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.specifications && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Specifications</label>
                  <p className="text-gray-900 mt-1">{item.specifications}</p>
                </div>
              )}

              {item.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{item.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ItemDetailsPage;
