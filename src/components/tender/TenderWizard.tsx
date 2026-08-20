import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VendorData {
  id: string;
  name: string;
  contact: string;
  email: string;
}

interface ItemData {
  id: string;
  nomenclature: string;
  category_id: string;
  unit: string;
}

interface SelectedItem {
  itemId: string;
  name: string;
  category: string;
  categoryName: string;
  quantity: number;
  unit: string;
}

interface TenderWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
  editingId?: string;
}

const TenderWizard: React.FC<TenderWizardProps> = ({ onComplete, onCancel, editingId }) => {
  // Current step tracking
  const [step, setStep] = useState(1);

  // Tender details (Step 1)
  const [tender, setTender] = useState({ code: '', name: '', date: '' });

  // Data loaded from DB
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 2: Selected vendors
  const [selectedVendors, setSelectedVendors] = useState<VendorData[]>([]);

  // Step 3+: Items per vendor
  const [vendorItems, setVendorItems] = useState<{ [vendorId: string]: SelectedItem[] }>({});

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch vendors
        const vendorsRes = await fetch('/api/vendors');
        const vendorsData = await vendorsRes.json();
        const vendorsList = (vendorsData.vendors || vendorsData || []).map((v: any) => ({
          id: v.id,
          name: v.vendor_name || v.name || 'Unknown',
          contact: (v.contact_person || v.contact || '').trim() || 'N/A',
          email: (v.email || '').trim() || 'N/A'
        }));
        setVendors(vendorsList);
        // Fetch categories
        const catsRes = await fetch('/api/categories');
        const catsData = await catsRes.json();
        const catsList = (Array.isArray(catsData) ? catsData : catsData.categories || []).sort((a: any, b: any) =>
          (a.name || '').localeCompare(b.name || '')
        );
        setCategories(catsList);
        // Fetch all items
        const allItemsList: ItemData[] = [];
        for (const cat of catsList) {
          const itemsRes = await fetch(`/api/items-master?category_id=${cat.id}`);
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            const items = itemsData.items || itemsData || [];
            items.forEach((item: any) => {
              allItemsList.push({
                id: item.id,
                nomenclature: item.nomenclature,
                category_id: cat.id,
                unit: item.unit || 'Pieces'
              });
            });
          }
        }
        setAllItems(allItemsList);
        } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle editing - fetch existing tender data
  useEffect(() => {
    if (editingId && editingId !== 'new') {
      const fetchTender = async () => {
        try {
          const res = await fetch(`/api/tenders/${editingId}`);
          if (res.ok) {
            const data = await res.json();
            setTender({ code: data.code, name: data.name, date: data.date });

            // Map vendors
            if (data.vendors) {
              setSelectedVendors(data.vendors.map((v: any) => ({
                id: v.id,
                name: v.vendor_name || v.name,
                contact: v.contact_person || v.contact,
                email: v.email
              })));
            }

            // Map items by vendor
            if (data.items) {
              const itemsByVendor: { [vendorId: string]: SelectedItem[] } = {};
              data.items.forEach((item: any) => {
                const vendorId = item.vendor_id;
                if (!itemsByVendor[vendorId]) itemsByVendor[vendorId] = [];
                itemsByVendor[vendorId].push({
                  itemId: item.id,
                  name: item.name,
                  category: item.category,
                  categoryName: categories.find(c => c.id === item.category)?.name || item.category,
                  quantity: item.quantity,
                  unit: item.unit
                });
              });
              setVendorItems(itemsByVendor);
            }
          }
        } catch (error) {
          console.error('❌ Error loading tender:', error);
        }
      };

      fetchTender();
    }
  }, [editingId, categories]);

  const handleVendorToggle = (vendor: VendorData) => {
    setSelectedVendors(prev => {
      const exists = prev.find(v => v.id === vendor.id);
      if (exists) {
        const newVendors = prev.filter(v => v.id !== vendor.id);
        const newVendorItems = { ...vendorItems };
        delete newVendorItems[vendor.id];
        setVendorItems(newVendorItems);
        return newVendors;
      } else {
        setVendorItems(prev => ({ ...prev, [vendor.id]: [] }));
        return [...prev, vendor];
      }
    });
  };

  const toggleItemForVendor = (vendorId: string, item: ItemData) => {
    setVendorItems(prev => {
      const vendorItemList = prev[vendorId] || [];
      const exists = vendorItemList.find(i => i.itemId === item.id);

      if (exists) {
        return { ...prev, [vendorId]: vendorItemList.filter(i => i.itemId !== item.id) };
      } else {
        const catName = categories.find(c => c.id === item.category_id)?.name || item.category_id;
        const newItem: SelectedItem = {
          itemId: item.id,
          name: item.nomenclature,
          category: item.category_id,
          categoryName: catName,
          quantity: 1,
          unit: item.unit
        };
        return { ...prev, [vendorId]: [...vendorItemList, newItem] };
      }
    });
  };

  const updateQuantity = (vendorId: string, itemId: string, quantity: number) => {
    setVendorItems(prev => ({
      ...prev,
      [vendorId]: prev[vendorId].map(item =>
        item.itemId === itemId ? { ...item, quantity } : item
      )
    }));
  };

  const removeItem = (vendorId: string, itemId: string) => {
    setVendorItems(prev => ({
      ...prev,
      [vendorId]: prev[vendorId].filter(item => item.itemId !== itemId)
    }));
  };

  const handleSubmit = async () => {
    // Validate
    if (!tender.code || !tender.name || !tender.date) {
      alert('Please fill all tender details');
      return;
    }
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor');
      return;
    }
    for (const vendor of selectedVendors) {
      if (!vendorItems[vendor.id]?.length) {
        alert(`Please assign items to ${vendor.name}`);
        return;
      }
    }

    // Build submission
    const items = Object.entries(vendorItems).flatMap(([vendorId, vendorItemList]) =>
      vendorItemList.map(item => ({
        id: item.itemId,
        quantity: item.quantity,
        vendor_id: vendorId
      }))
    );

    const formData = {
      code: tender.code,
      name: tender.name,
      date: tender.date,
      vendors: selectedVendors.map(v => v.id),
      items
    };

    try {
      const url = editingId && editingId !== 'new'
        ? `/api/tenders/${editingId}`
        : '/api/tenders';

      const response = await fetch(url, {
        method: editingId && editingId !== 'new' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const result = await response.json();
      onComplete({
        ...result,
        tender,
        vendors: selectedVendors,
        items
      });
    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Error: ${error}`);
    }
  };

  const totalSteps = 2 + selectedVendors.length;
  const currentVendorIdx = step - 3;
  const currentVendor = currentVendorIdx >= 0 ? selectedVendors[currentVendorIdx] : null;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Edit' : 'Create'} Annual Tender - Step {step} of {totalSteps}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Tender Details */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div>
              <Label>Tender Code *</Label>
              <Input
                placeholder="e.g., TEND-001"
                value={tender.code}
                onChange={(e) => setTender({ ...tender, code: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tender Name *</Label>
              <Input
                placeholder="e.g., Annual Medical Supplies"
                value={tender.name}
                onChange={(e) => setTender({ ...tender, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tender Date *</Label>
              <Input
                type="date"
                value={tender.date}
                onChange={(e) => setTender({ ...tender, date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!tender.code || !tender.name || !tender.date}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Vendors */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-semibold mb-4">Select Vendors</h3>
              <p className="text-sm text-gray-600 mb-4">Choose vendors for this tender. You'll assign items to each vendor in the next steps.</p>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading vendors...</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
                {vendors.map(vendor => (
                  <div
                    key={vendor.id}
                    className="flex items-start gap-3 p-3 bg-white rounded border hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleVendorToggle(vendor)}
                  >
                    <Checkbox checked={selectedVendors.some(v => v.id === vendor.id)} />
                    <div className="flex-1">
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-gray-600">{vendor.contact} • {vendor.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedVendors.length > 0 && (
              <div className="bg-green-50 p-3 rounded text-sm text-green-700">
                ✅ {selectedVendors.length} vendor(s) selected
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selectedVendors.length === 0}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Steps 3+: Per-Vendor Items */}
        {step > 2 && currentVendor && (
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-900">{currentVendor.name}</h3>
              <p className="text-sm text-blue-700">{currentVendor.contact} • {currentVendor.email}</p>
              <p className="text-xs text-blue-600 mt-2">Step {step} of {totalSteps} - Assign items to this vendor</p>
            </div>

            {loading ? (
              <p className="text-center py-8">Loading items...</p>
            ) : (
              <div className="space-y-4">
                {categories.map(category => {
                  const catItems = allItems.filter(i => i.category_id === category.id);
                  const vendorItemList = vendorItems[currentVendor.id] || [];
                  const selectedCatItems = vendorItemList.filter(i => i.category === category.id);

                  return (
                    <Card key={category.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{category.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                        {catItems.map(item => {
                          const isSelected = vendorItemList.find(i => i.itemId === item.id);
                          return (
                            <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                              <Checkbox
                                checked={!!isSelected}
                                onCheckedChange={() => toggleItemForVendor(currentVendor.id, item)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.nomenclature}</p>
                                <p className="text-xs text-gray-600">{item.unit}</p>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={isSelected.quantity}
                                    onChange={(e) =>
                                      updateQuantity(currentVendor.id, item.id, parseInt(e.target.value) || 1)
                                    }
                                    className="w-16 h-8 text-xs"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeItem(currentVendor.id, item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {(vendorItems[currentVendor.id]?.length || 0) > 0 && (
              <div className="bg-green-50 p-3 rounded text-sm text-green-700">
                ✅ {vendorItems[currentVendor.id].length} item(s) assigned
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                {step < totalSteps && (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={(vendorItems[currentVendor.id]?.length || 0) === 0}
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {step === totalSteps && (
                  <Button
                    onClick={handleSubmit}
                    disabled={(vendorItems[currentVendor.id]?.length || 0) === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {editingId ? 'Update' : 'Create'} Tender
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TenderWizard;

