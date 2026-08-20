import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, Plus, Save, CheckCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ItemMaster {
  id: string;
  nomenclature: string;
  unit: string;
  category_id: string;
  minimum_stock_level: number;
  maximum_stock_level: number;
  item_code?: string;
  specifications?: string;
}

interface Category {
  id: string;
  category_name: string;
  description?: string;
  status: string;
}

interface InitialStock {
  ItemMasterID: string;
  quantity: number;
  notes: string;
}

const InitialInventorySetup = () => {
  const { toast } = useToast();
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialStocks, setInitialStocks] = useState<InitialStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<ItemMaster[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter items based on search term
    const filtered = itemMasters.filter(item => 
      item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryName(item.category_id).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, itemMasters, categories]);

  const fetchData = async () => {
    try {
      // Fetch item masters, categories, and existing inventory stock
      const [itemMastersResponse, categoriesResponse, currentStockResponse] = await Promise.all([
        fetch('/api/item-masters'),
        fetch('/api/categories'),
        fetch('/api/inventory/current-stock')
      ]);

      if (itemMastersResponse.ok) {
        const itemsData = await itemMastersResponse.json();
        setItemMasters(itemsData);
        setFilteredItems(itemsData);

        // Get existing stock quantities
        let existingStock = [];
        if (currentStockResponse.ok) {
          const stockData = await currentStockResponse.json();
          if (stockData.success && stockData.data) {
            existingStock = stockData.data;
          }
        }

        // Initialize stock entries with existing quantities or 0
        setInitialStocks(itemsData.map((item: ItemMaster) => {
          const existingStockItem = existingStock.find((stock: any) => stock.item_master_id === item.id);
          return {
            ItemMasterID: item.id,
            quantity: existingStockItem ? existingStockItem.current_quantity : 0,
            notes: `Initial ${item.nomenclature} stock count`
          };
        }));
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        // Debug log
        setCategories(categoriesData);
      } else {
        console.error('Failed to fetch categories:', categoriesResponse.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load item masters and categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.category_name || `Category ${categoryId}`;
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setInitialStocks(prev => 
      prev.map(stock => 
        stock.ItemMasterID === itemId 
          ? { ...stock, quantity: Math.max(0, quantity) }
          : stock
      )
    );
  };

  const updateNotes = (itemId: string, notes: string) => {
    setInitialStocks(prev => 
      prev.map(stock => 
        stock.ItemMasterID === itemId 
          ? { ...stock, notes }
          : stock
      )
    );
  };

  const saveInitialInventory = async () => {
    setSaving(true);
    try {
      // Filter out items with zero quantity
      const validStocks = initialStocks.filter(stock => stock.quantity > 0);
      
      if (validStocks.length === 0) {
        toast({
          title: "Warning",
          description: "Please enter quantities for at least one item",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/inventory/initial-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialStocks: validStocks,
          setupDate: new Date(),
          setupBy: 'System Administrator'
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Initial inventory setup completed for ${validStocks.length} items`,
        });
      } else {
        throw new Error('Failed to save initial inventory');
      }
    } catch (error) {
      console.error('Error saving initial inventory:', error);
      toast({
        title: "Error",
        description: "Failed to save initial inventory setup",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const totalItems = initialStocks.filter(stock => stock.quantity > 0).length;
  const totalQuantity = initialStocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const hasValidData = totalItems > 0; // At least one item has quantity > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Package className="h-6 w-6" />
            Initial Inventory Setup
          </CardTitle>
          <CardDescription className="text-blue-600">
            Set up your starting inventory quantities. This will establish the baseline for all future stock movements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              {totalItems} items with stock
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              {totalQuantity} total units
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by item name, code, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Badge variant="outline" className="ml-auto">
              {filteredItems.length} of {itemMasters.length} items
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items Setup
          </CardTitle>
          <CardDescription>
            Enter initial quantities for each item to establish your baseline inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Item Description</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead className="w-[120px]">Initial Qty</TableHead>
                  <TableHead className="w-[200px]">Notes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stock = initialStocks.find(s => s.ItemMasterID === item.id);
                  const isLowStock = stock && stock.quantity > 0 && stock.quantity < (item.minimum_stock_level || 0);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{item.nomenclature}</div>
                          {item.specifications && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {item.specifications}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.item_code || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryName(item.category_id)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.minimum_stock_level || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={stock?.quantity || 0}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={stock?.notes || ''}
                          onChange={(e) => updateNotes(item.id, e.target.value)}
                          placeholder="Optional notes"
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        {stock?.quantity === 0 ? (
                          <Badge variant="outline" className="text-gray-500">
                            Not Set
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Below Min
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Set
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No items match your search criteria' : 'No items available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasValidData ? (
                <>Ready to initialize inventory with {totalItems} items and {totalQuantity} total units</>
              ) : (
                <span className="text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Enter quantities for at least one item to proceed
                </span>
              )}
              {searchTerm && (
                <div className="text-xs text-blue-600 mt-1">
                  Showing {filteredItems.length} of {itemMasters.length} items (filtered)
                </div>
              )}
            </div>
            <Button 
              onClick={saveInitialInventory}
              disabled={saving || !hasValidData}
              className="flex items-center gap-2"
              title={!hasValidData ? "Enter quantities for at least one item to enable" : "Save initial inventory setup"}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Initialize Inventory'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialInventorySetup;

