import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

interface ItemWithCategory {
  id: string;
  nomenclature: string;
  item_code: string;
  category_id: string;
  category_name: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

export const VendorAssignmentManager: React.FC = () => {
  // Main states
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  
  // Categories - extracted from items view
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  
  // Items from view
  const [allItems, setAllItems] = useState<ItemWithCategory[]>([]);
  const [categoryItems, setCategoryItems] = useState<ItemWithCategory[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemWithCategory[]>([]);
  
  // Vendors
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  
  // Assigned vendors
  const [assignedVendors, setAssignedVendors] = useState<Array<{ id: string; vendor_name: string; status: string; created_at: string }>>([]);

  // Dialog and loading states
  const [showAssignVendorsDialog, setShowAssignVendorsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  // Load initial data from view-backed endpoints
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadTenders(),
          loadVendors(),
          loadItems()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load tenders from database
  const loadTenders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/annual-tenders');
      const data = await response.json();
      setTenders(data);
      if (data.length > 0) {
        setSelectedTender(data[0]);
      }
    } catch (error) {
      console.error('Error loading tenders:', error);
    }
  };

  // Load vendors from database
  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendors');
      const data = await response.json();
      // Handle both array and { vendors: [...] } response formats
      const vendorsArray = Array.isArray(data) ? data : (data.vendors || data.data || []);
      setVendors(vendorsArray);
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors([]);
    }
  };

  // Load items from vw_item_masters_with_categories view via API
  const loadItems = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/item-masters');
      const data = await response.json();
      const itemsArray = Array.isArray(data) ? data : (data.data || data.items || []);
      
      // Limit items to prevent memory issues (up to 10000 items max)
      const limitedItems = itemsArray.slice(0, 10000);
      
      // Store all items
      setAllItems(limitedItems);
      
      // Extract unique categories with their IDs
      const categoryMap = new Map<string, string>();
      limitedItems.forEach((item: ItemWithCategory) => {
        if (item.category_name && item.category_id) {
          categoryMap.set(item.category_name, item.category_id);
        }
      });
      
      const uniqueCategories = Array.from(categoryMap.entries())
        .map(([name, id]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading items:', error);
      setAllItems([]);
      setCategories([]);
    }
  };

  // Load assigned vendors for a tender-category combination
  const loadAssignedVendors = async (tenderId: string, categoryId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${tenderId}/category/${categoryId}/assigned-vendors`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignedVendors(data);
      } else {
        setAssignedVendors([]);
      }
    } catch (error) {
      console.error('Error loading assigned vendors:', error);
      setAssignedVendors([]);
    }
  };

  // Filter items when category is selected
  const handleSelectCategory = (category: { id: string; name: string }) => {
    setSelectedCategory(category);
    const filtered = allItems.filter(item => item.category_id === category.id);
    setCategoryItems(filtered);
    setSelectedItems([]);  // Reset item selection when category changes
    
    // Load assigned vendors for this tender-category combo
    if (selectedTender) {
      loadAssignedVendors(selectedTender.id, category.id);
    }
  };

  // Assign selected vendors to selected items
  const handleAssignVendors = async () => {
    if (!selectedTender || !selectedCategory || selectedItems.length === 0 || selectedVendors.length === 0) {
      alert('Please complete all steps: Tender → Category → Items → Vendors');
      return;
    }

    setIsAssigning(true);
    try {
      const vendorIds = selectedVendors.map(vendor => vendor.id);
      
      const payload = {
        categoryId: selectedCategory.id,
        vendorIds: vendorIds
      };
      
      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        const errorMsg = responseData.error || responseData.message || 'Failed to assign vendors';
        throw new Error(errorMsg);
      }

      alert('✅ Vendors assigned successfully!');
      
      // Reload assigned vendors for this tender-category combo
      if (selectedTender && selectedCategory) {
        await loadAssignedVendors(selectedTender.id, selectedCategory.id);
      }
      
      setShowAssignVendorsDialog(false);
      setSelectedItems([]);
      setSelectedVendors([]);
    } catch (error) {
      console.error('❌ Error assigning vendors:', error);
      alert('Failed to assign vendors: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Assignment</h1>
        <p className="text-gray-600">Assign vendors to items in categories for annual tenders</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Select Tender */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1: Select Annual Tender</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {tenders.map(tender => (
                  <Button
                    key={tender.id}
                    variant={selectedTender?.id === tender.id ? 'default' : 'outline'}
                    onClick={() => setSelectedTender(tender)}
                  >
                    {tender.title}
                    <Badge variant="secondary" className="ml-2">{tender.tender_number}</Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedTender && (
            <>
              {/* Step 2: Select Category from vw_item_masters_with_categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 2: Select Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? (
                    <p className="text-gray-500">No categories found. Please create items first.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => handleSelectCategory(category)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedCategory?.id === category.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold">{category.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedCategory && (
                <>
                  {/* Step 3: Select Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Step 3: Select Items from {selectedCategory?.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categoryItems.length === 0 ? (
                          <p className="text-center py-8 text-gray-500">No items in this category</p>
                        ) : (
                          categoryItems.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedItems.some(i => i.id === item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, item]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                                  }
                                }}
                              />
                              <div>
                                <p className="font-medium">{item.nomenclature}</p>
                                <p className="text-xs text-gray-600">Code: {item.item_code}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                      {selectedItems.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-700">
                            ✓ {selectedItems.length} item(s) selected
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedItems.length > 0 && (
                    <>
                      {/* Step 4: Assign Vendors */}
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Step 4: Assign Vendors</CardTitle>
                            <Dialog open={showAssignVendorsDialog} onOpenChange={setShowAssignVendorsDialog}>
                              <DialogTrigger asChild>
                                <Button className="gap-2">
                                  <Plus className="w-4 h-4" />
                                  Assign Vendors
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Select Vendors</DialogTitle>
                                  <DialogDescription>
                                    Select vendors to provide these items
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-3">
                                  {/* Selected Items Summary */}
                                  <div className="p-3 bg-blue-50 rounded">
                                    <p className="text-sm font-semibold mb-2">Items to Assign:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedItems.map(item => (
                                        <Badge key={item.id} variant="secondary">
                                          {item.nomenclature}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Vendor Selection */}
                                  <div>
                                    <p className="text-sm font-semibold mb-2">Select Vendors:</p>
                                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
                                      {vendors.map(vendor => (
                                        <label key={vendor.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={selectedVendors.some(v => v.id === vendor.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedVendors([...selectedVendors, vendor]);
                                              } else {
                                                setSelectedVendors(selectedVendors.filter(v => v.id !== vendor.id));
                                              }
                                            }}
                                          />
                                          <div>
                                            <p className="font-medium text-sm">{vendor.vendor_name}</p>
                                            <p className="text-xs text-gray-600">{vendor.vendor_code}</p>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {selectedVendors.length > 0 && (
                                    <div className="p-3 bg-green-50 rounded">
                                      <p className="text-sm font-medium text-green-700">
                                        ✓ {selectedVendors.length} vendor(s) selected
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowAssignVendorsDialog(false)}
                                    disabled={isAssigning}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleAssignVendors}
                                    disabled={selectedVendors.length === 0 || isAssigning}
                                    className="gap-2"
                                  >
                                    {isAssigning ? (
                                      <>
                                        <span className="animate-spin">⏳</span>
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-4 h-4" />
                                        Save & Assign Vendors
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Click "Assign Vendors" to select vendors that can provide the {selectedItems.length} selected item(s)
                          </p>
                        </CardContent>
                      </Card>

                      {/* Display Assigned Vendors */}
                      {assignedVendors.length > 0 && (
                        <Card className="border-green-200 bg-green-50">
                          <CardHeader>
                            <CardTitle className="text-lg text-green-800">✓ Assigned Vendors</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {assignedVendors.map(vendor => (
                                <div key={vendor.id} className="p-3 bg-white rounded border border-green-200">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{vendor.vendor_name}</p>
                                      <p className="text-xs text-gray-600">ID: {vendor.id.substring(0, 8)}...</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Assigned: {new Date(vendor.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <Badge variant="default" className="bg-green-600">{vendor.status}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorAssignmentManager;
