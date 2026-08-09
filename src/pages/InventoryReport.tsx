// Inventory Report Component - Recreated for proper database integration
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { inventorySupabaseService } from '@/services/inventorySupabaseService';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  location: string;
  status: string;
  itemType: string;
  unitPrice?: number;
  vendorId?: string;
  item_masters?: {
    nomenclature: string;
    unit: string;
    categories?: {
      category_name: string;
    };
    sub_categories?: {
      sub_category_name: string;
    };
  };
  stores?: {
    store_name: string;
  };
  vendors?: {
    vendor_name: string;
  };
}

const InventoryReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) {
        setError('No item ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const itemData = await inventorySupabaseService.getById(id);
        
        if (!itemData) {
          setError('Item not found');
          return;
        }

        // Transform the data to match our interface
        const transformedItem: InventoryItem = {
          id: itemData.id,
          name: itemData.item_masters?.nomenclature || 'Unknown Item',
          category: itemData.category || 'General',
          subCategory: itemData.subCategory || 'General',
          currentStock: itemData.current_stock || 0,
          minimumStock: itemData.minimum_stock || 0,
          unit: itemData.item_masters?.unit || 'PCS',
          location: itemData.stores?.store_name || 'Unknown Location',
          status: itemData.status || 'Active',
          itemType: itemData.item_type || 'Consumable Items',
          unitPrice: itemData.unit_price,
          vendorId: itemData.vendor_id,
          item_masters: itemData.item_masters,
          stores: itemData.stores,
          vendors: itemData.vendors
        };

        setItem(transformedItem);
      } catch (err) {
        
        setError('Failed to load item data');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const formatDateDMY = (date: string | Date) => {
    if (!date) return 'Invalid Date';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid Date';
      
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!item) return;

    const rows = [
      ['Inventory Item Report'],
      ['Generated on', formatDateDMY(new Date())],
      [],
      ['Item Details'],
      ['Item Name', item.name],
      ['Category', item.category],
      ['Sub Category', item.subCategory],
      ['Current Stock', item.currentStock.toString()],
      ['Minimum Stock', item.minimumStock.toString()],
      ['Unit', item.unit],
      ['Location', item.location],
      ['Status', item.status],
      ['Item Type', item.itemType],
      ['Vendor', item.vendors?.vendor_name || 'N/A'],
      ['Unit Price', item.unitPrice ? `Rs. ${item.unitPrice}` : 'N/A'],
      ['Total Value', item.unitPrice ? `Rs. ${(item.currentStock * item.unitPrice).toLocaleString()}` : 'N/A']
    ];

    const csv = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-report-${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-96">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error || 'Item not found'}</p>
                <Button onClick={() => navigate('/inventory')} variant="outline">
                  Back to Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white">
      {/* Header with actions - hidden in print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button onClick={() => navigate('/inventory')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Item Report</h1>
          <p className="text-gray-600 mt-2">Generated on {formatDateDMY(new Date())}</p>
        </div>

        {/* Item Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Item Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Item Name</div>
                  <div className="text-lg font-medium">{item.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Category</div>
                  <div className="text-lg">{item.category}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Sub Category</div>
                  <div className="text-lg">{item.subCategory}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Current Stock</div>
                  <div className="text-lg font-medium text-blue-600">
                    {item.currentStock} {item.unit}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Minimum Stock</div>
                  <div className="text-lg">{item.minimumStock} {item.unit}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Location</div>
                  <div className="text-lg">{item.location}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <div className="text-lg">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      item.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Item Type</div>
                  <div className="text-lg">{item.itemType}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Vendor</div>
                  <div className="text-lg">{item.vendors?.vendor_name || 'N/A'}</div>
                </div>
                {item.unitPrice && (
                  <>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Unit Price</div>
                      <div className="text-lg">Rs. {item.unitPrice.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Total Value</div>
                      <div className="text-lg font-medium text-green-600">
                        Rs. {(item.currentStock * item.unitPrice).toLocaleString()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Stock Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{item.currentStock}</div>
                <div className="text-sm text-gray-600">Current Stock</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{item.minimumStock}</div>
                <div className="text-sm text-gray-600">Minimum Stock</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {item.currentStock > item.minimumStock ? 'OK' : 'LOW'}
                </div>
                <div className="text-sm text-gray-600">Stock Status</div>
              </div>
            </div>
            {item.currentStock <= item.minimumStock && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  ⚠️ Warning: Stock is at or below minimum threshold. Consider reordering.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Item ID</div>
                <div className="text-lg font-mono">{item.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Unit of Measurement</div>
                <div className="text-lg">{item.unit}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>This report was generated automatically from the Inventory Management System.</p>
        <p>Report ID: INV-{item.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  );
};

// Default export
export default InventoryReport;
