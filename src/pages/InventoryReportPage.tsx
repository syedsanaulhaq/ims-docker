import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import { supabase } from '@/integrations/supabase/client';

// Inventory Item interface based on database schema
interface InventoryItem {
  id: string;
  item_code: string;
  nomenclature: string;
  description?: string;
  quantity: number;
  store_name: string;
  vendor_name: string;
  category: string;
  subcategory?: string;
  item_type: string;
  minimum_stock: number;
  maximum_stock?: number;
  reorder_level?: number;
  last_updated: string;
  status: string;
}

// Helper to format date as dd/mm/yyyy
function formatDateDMY(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Simple Excel export for the single inventory item report
function handleExportExcel(item: InventoryItem | null) {
  if (!item) return;
  
  const rows = [
    ['Item Code', item.item_code],
    ['Nomenclature', item.nomenclature],
    ['Description', item.description || '-'],
    ['Current Stock', item.quantity],
    ['Minimum Stock', item.minimum_stock],
    ['Maximum Stock', item.maximum_stock || '-'],
    ['Reorder Level', item.reorder_level || '-'],
    ['Item Type', item.item_type],
    ['Store', item.store_name],
    ['Vendor', item.vendor_name],
    ['Category', item.category],
    ['Subcategory', item.subcategory || '-'],
    ['Status', item.status],
    ['Last Updated', formatDateDMY(item.last_updated)]
  ];
  
  const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `InventoryItemReport-${item.item_code || item.id}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

const InventoryReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchInventoryData();
    }
  }, [id]);

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          description,
          current_stock,
          minimum_stock,
          maximum_stock,
          reorder_level,
          item_type,
          status,
          created_at,
          updated_at,
          item_masters:item_master_id (
            id,
            item_code,
            nomenclature,
            unit,
            categories:category_id (
              category_name
            ),
            sub_categories:sub_category_id (
              sub_category_name
            )
          ),
          stores:store_id (
            store_name
          ),
          vendors:vendor_id (
            vendor_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedData: InventoryItem = {
        id: data.id,
        item_code: (data.item_masters as any)?.item_code || 'N/A',
        nomenclature: (data.item_masters as any)?.nomenclature || 'Unknown Item',
        description: data.description || '',
        quantity: data.current_stock || 0,
        minimum_stock: data.minimum_stock || 0,
        maximum_stock: data.maximum_stock,
        reorder_level: data.reorder_level,
        item_type: data.item_type || 'Unknown',
        store_name: (data.stores as any)?.store_name || 'Unknown Store',
        vendor_name: (data.vendors as any)?.vendor_name || 'Unknown',
        category: (data.item_masters as any)?.categories?.category_name || 'Unknown',
        subcategory: (data.item_masters as any)?.sub_categories?.sub_category_name || '',
        last_updated: data.updated_at,
        status: data.status
      };

      setInventoryItem(formattedData);
    } catch (err) {
      
      setError('Failed to load inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-96"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchInventoryData} />;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-96"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchInventoryData} />;
  }

  if (!inventoryItem) {
    return <ErrorState message="Inventory item not found." onRetry={() => navigate(-1)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top menu as horizontal nav */}
      <nav className="w-full bg-white border-b px-6 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">Inventory Management</div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" title="Export to Excel" onClick={() => handleExportExcel(inventoryItem)}>
              <Download />
            </Button>
            <Button variant="outline" size="icon" title="Print Report" onClick={() => window.print()}>
              <Printer />
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
          <a href="/inventory" className="text-blue-700 hover:underline">All Inventory</a>
          <a href="/inventory-reports" className="text-blue-700 hover:underline">Inventory Reports</a>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Inventory Item Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-muted-foreground">Item Code</div>
                <div className="font-semibold text-lg">{inventoryItem.item_code}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Nomenclature</div>
                <div className="font-semibold">{inventoryItem.nomenclature}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current Stock</div>
                <div>{inventoryItem.quantity}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Minimum Stock</div>
                <div>{inventoryItem.minimum_stock}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Maximum Stock</div>
                <div>{inventoryItem.maximum_stock || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reorder Level</div>
                <div>{inventoryItem.reorder_level || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Item Type</div>
                <div>{inventoryItem.item_type}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    inventoryItem.status === 'Active' ? 'bg-green-100 text-green-800' :
                    inventoryItem.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {inventoryItem.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Store</div>
                <div>{inventoryItem.store_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div>{inventoryItem.vendor_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Category</div>
                <div>{inventoryItem.category}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Subcategory</div>
                <div>{inventoryItem.subcategory || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
                <div>{formatDateDMY(inventoryItem.last_updated)}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="whitespace-pre-line">{inventoryItem.description || '-'}</div>
              </div>
            </div>

            {/* Stock Level Indicators */}
            <div className="mb-6">
              <div className="font-semibold mb-2">Stock Status</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Stock Level</div>
                  <div className={`font-semibold ${
                    inventoryItem.quantity <= inventoryItem.minimum_stock ? 'text-red-600' :
                    inventoryItem.reorder_level && inventoryItem.quantity <= inventoryItem.reorder_level ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {inventoryItem.quantity <= inventoryItem.minimum_stock ? 'Low Stock' :
                     inventoryItem.reorder_level && inventoryItem.quantity <= inventoryItem.reorder_level ? 'Reorder Required' :
                     'Normal'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Stock Coverage</div>
                  <div className="font-semibold">
                    {inventoryItem.minimum_stock > 0 ? 
                      `${Math.round((inventoryItem.quantity / inventoryItem.minimum_stock) * 100)}%` : 
                      'N/A'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Days to Reorder</div>
                  <div className="font-semibold">
                    {inventoryItem.reorder_level && inventoryItem.quantity > inventoryItem.reorder_level ? 
                      `${inventoryItem.quantity - inventoryItem.reorder_level} units buffer` : 
                      'Action Required'
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InventoryReportPage;
