import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, X } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';

interface Tender {
  id: number;
  title: string;
  tender_type: string;
  reference_number: string;
}

interface TenderItem {
  id: string;
  item_master_id: string;
  nomenclature?: string;
  quantity: number;
  estimated_unit_price?: number;
  vendor_id?: string;
  vendor_ids?: string; // For annual tenders with multiple vendors
  category_name?: string;
  unit_price?: number; // For annual tenders
  specifications?: string; // Tender specifications (read-only reference)
}

interface Vendor {
  id: string;
  vendor_name: string;
}

interface ItemPrice {
  itemId: number;
  unitPrice: number;
}

export default function CreatePurchaseOrder() {
  // VERSION CHECK: PO with Vendor+Specification in summary - Feb 11, 2026 - v1.2.0
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenderIdFromUrl = searchParams.get('tenderId');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenderIdFromUrl || '');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [vendors, setVendors] = useState<{ [key: string]: Vendor }>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});
  const [itemVendors, setItemVendors] = useState<{ [key: string]: string }>({});
  const [itemQuantities, setItemQuantities] = useState<{ [key: string]: number }>({});
  const [itemSpecifications, setItemSpecifications] = useState<{ [key: string]: string }>({});
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fileNumber, setFileNumber] = useState<string>('');
  const [poDetail, setPoDetail] = useState<string>('It is submitted that the following items may kindly be provided to this Commission Secretariat at the earliest to meet the official requirements as per annual tender rates. Furthermore, the supplier may be requested to furnish the corresponding bill/invoice to this office after delivery of the items, so that necessary arrangements for payment can be made in accordance with the prescribed financial rules and procedures.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    fetchTenders();
    // If tenderId is provided in URL, auto-select it
    if (tenderIdFromUrl) {
      setSelectedTenderId(tenderIdFromUrl);
    }
  }, [tenderIdFromUrl]);

  useEffect(() => {
    if (selectedTenderId) {
      // Fetch vendors FIRST, then items (so vendors are available when items load)
      fetchVendors().then(() => {
        fetchTenderDetails(selectedTenderId);
        fetchTenderItems(selectedTenderId);
      });
    }
  }, [selectedTenderId]);

  const fetchTenderDetails = async (tenderId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/tenders/${tenderId}`);
      if (!response.ok) throw new Error('Failed to fetch tender details');
      const data = await response.json();
      setSelectedTender(data);
    } catch (err) {
      console.error('Error fetching tender details:', err);
    }
  };

  const fetchVendors = async () => {
    return new Promise<void>((resolve) => {
      (async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/vendors`);
          if (!response.ok) throw new Error('Failed to fetch vendors');
          let data = await response.json();
          
          // Extract vendors array from the response
          let vendorsArray: Vendor[] = [];
          if (data && typeof data === 'object') {
            if ('vendors' in data && Array.isArray(data.vendors)) {
              vendorsArray = data.vendors;
            } else if (Array.isArray(data)) {
              vendorsArray = data;
            }
          }
          
          // Create a map of vendor ID to vendor details (use only original ID to avoid duplicates)
          const vendorMap: { [key: string]: Vendor } = {};
          vendorsArray.forEach((v: any) => {
            if (v && v.id) {
              const vendorData = {
                id: v.id,
                vendor_name: v.vendor_name || v.name || 'Unknown Vendor'
              };
              // Store using original ID only (no duplicates)
              vendorMap[String(v.id)] = vendorData;
              }
          });
          
          setVendors(vendorMap);
          resolve();
        } catch (err) {
          console.error('❌ Error fetching vendors:', err);
          setVendors({});
          resolve();
        }
      })();
    });
  };

  const fetchTenders = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/tenders`);
      if (!response.ok) throw new Error('Failed to fetch tenders');
      const data = await response.json();
      setTenders(data.filter((t: Tender) => t.id)); // Filter valid tenders
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError('Failed to load tenders');
    }
  };

  const fetchTenderItems = async (tenderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/tenders/${tenderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch tender items');
      const data = await response.json();
      setTenderItems(data);
      
      // Auto-select all items (user can deselect if needed)
      const allItemIds = data.map((item: TenderItem) => item.id);
      setSelectedItems(new Set(allItemIds));
      // Initialize quantities and prices from tender items
      const initialQuantities: { [key: string]: number } = {};
      const initialPrices: { [key: string]: number } = {};
      const initialVendors: { [key: string]: string } = {};
      
      data.forEach((item: TenderItem) => {
        initialQuantities[item.id] = item.quantity || 1;
        // For annual tenders, use unit_price from item; otherwise use estimated_unit_price
        initialPrices[item.id] = item.unit_price || item.estimated_unit_price || 0;
        
        // ✅ OPTION A: Use ONLY vendor_id field (single vendor per item)
        let selectedVendorId = null;
        
        if (item.vendor_id) {
          // Single vendor per item
          selectedVendorId = item.vendor_id;
          }
        
        if (selectedVendorId) {
          initialVendors[item.id] = selectedVendorId;
          } else {
          }
      });
      
      setItemQuantities(initialQuantities);
      setItemPrices(initialPrices);
      setItemVendors(initialVendors);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load tender items');
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByVendor = () => {
    // No vendor grouping in simple version - just validate pricing is entered
    const missingPrices = Array.from(selectedItems).filter(itemId => {
      return !itemPrices[itemId] || itemPrices[itemId] <= 0;
    });
    
    if (missingPrices.length > 0) {
      setError(`Please enter valid unit price for ${missingPrices.length} item(s)`);
      return false;
    }
    return true;
  };

  const handleItemToggle = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    const filteredItemIds = tenderItems
      .filter((item) => (item.nomenclature || '').toLowerCase().includes(itemSearchQuery.toLowerCase().trim()))
      .map((item) => item.id);

    if (checked) {
      const newSelection = new Set(selectedItems);
      filteredItemIds.forEach((id) => newSelection.add(id));
      setSelectedItems(newSelection);
    } else {
      const newSelection = new Set(selectedItems);
      filteredItemIds.forEach((id) => newSelection.delete(id));
      setSelectedItems(newSelection);
    }
  };

  const handleCreatePOs = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item');
      return;
    }

    if (!poDate) {
      setError('Please select a PO date');
      return;
    }

    // For annual tenders, validate vendor selection for each item
    if (selectedTender?.tender_type === 'annual-tender') {
      const itemsWithoutVendor = Array.from(selectedItems).filter(itemId => !itemVendors[itemId]);
      if (itemsWithoutVendor.length > 0) {
        setError(`Please select vendor for ${itemsWithoutVendor.length} item(s)`);
        return;
      }
    }

    // Validate all selected items have prices
    const itemsWithoutPrice = Array.from(selectedItems).filter(itemId => {
      return !itemPrices[itemId] || itemPrices[itemId] <= 0;
    });
    
    if (itemsWithoutPrice.length > 0) {
      setError(`Please enter valid unit price for ${itemsWithoutPrice.length} item(s)`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const payload = {
        tenderId: selectedTenderId,
        tenderType: selectedTender?.tender_type,
        selectedItems: Array.from(selectedItems),
        poDate,
        fileNumber,
        poDetail,
        itemPrices: itemPrices,
        itemVendors: itemVendors, // For annual tenders
        itemQuantities: itemQuantities,
        itemSpecifications: itemSpecifications // PO-specific specifications
      };
      const response = await fetch(`${apiBaseUrl}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create POs');
      }

      const result = await response.json();
      alert(`✅ PO(s) created successfully!`);
      // Navigate back to tender-specific PO dashboard
      navigate(selectedTenderId ? `/dashboard/purchase-orders?tenderId=${selectedTenderId}` : '/dashboard/purchase-orders');
    } catch (err) {
      console.error('Error creating POs:', err);
      setError(err instanceof Error ? err.message : 'Failed to create POs');
    } finally {
      setLoading(false);
    }
  };

  const getTenderTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'contract':
        return 'bg-purple-100 text-purple-800';
      case 'spot-purchase':
        return 'bg-orange-100 text-orange-800';
      case 'annual-tender':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalSelectedAmount = Array.from(selectedItems).reduce((sum, itemId) => {
    const item = tenderItems.find(ti => ti.id === itemId);
    const price = itemPrices[itemId] || 0;
    return sum + (price * (item?.quantity || 1));
  }, 0);

  const filteredTenderItems = tenderItems.filter((item) =>
    (item.nomenclature || '').toLowerCase().includes(itemSearchQuery.toLowerCase().trim())
  );
  const filteredItemIds = filteredTenderItems.map((item) => item.id);
  const selectedFilteredCount = filteredItemIds.filter((id) => selectedItems.has(id)).length;
  const allFilteredSelected = filteredItemIds.length > 0 && selectedFilteredCount === filteredItemIds.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Purchase/Supply Order</h1>
          <p className="text-slate-600">Select items from a tender and enter pricing to create a PO</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" />
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Select Tender (only show if not pre-selected from URL) */}
        {!tenderIdFromUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Tender</CardTitle>
              <CardDescription>Choose a tender to create POs from</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Select a tender..." />
                </SelectTrigger>
                <SelectContent>
                  {tenders
                    .filter((tender) => tender && tender.id) // Filter out invalid tenders
                    .map((tender) => {
                      const tenderId = String(tender.id);
                      // Only render if tender ID is not empty
                      if (!tenderId || tenderId.trim() === '') return null;
                      return (
                        <SelectItem key={tender.id} value={tenderId}>
                          <div className="flex items-center gap-2">
                            <span>{tender.reference_number}: {tender.title}</span>
                            <Badge className={getTenderTypeColor(tender.tender_type)}>
                              {tender.tender_type}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {tenderIdFromUrl && selectedTender && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Selected Tender</p>
                <p className="font-bold text-slate-900">{selectedTender.reference_number}: {selectedTender.title}</p>
              </div>
              <Badge className={getTenderTypeColor(selectedTender.tender_type)}>
                {selectedTender.tender_type}
              </Badge>
            </CardContent>
          </Card>
        )}

        {selectedTenderId && (
          <>
            {/* Step 2: Select Items */}
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Select Items</CardTitle>
                <CardDescription>Choose items from this tender ({filteredTenderItems.length} shown of {tenderItems.length})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && <p className="text-slate-600">Loading items...</p>}

                {!loading && tenderItems.length === 0 && (
                  <p className="text-slate-600">No items found in this tender</p>
                )}

                {!loading && tenderItems.length > 0 && (
                  <>
                    <div className="max-w-md">
                      <Input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        placeholder="Filter by item name..."
                        className="border-slate-300"
                      />
                    </div>
                    {/* Debug: Log vendor state */}
                    {}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="font-medium text-slate-700">
                          Select Filtered ({selectedFilteredCount}/{filteredTenderItems.length})
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Total Selected</p>
                        <p className="text-lg font-bold text-blue-600">
                          Rs {totalSelectedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left"><input type="checkbox" checked={allFilteredSelected} onChange={(e) => handleSelectAll(e.target.checked)} /></th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Item</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Vendor</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Specification</th>
                            <th className="px-3 py-2 text-center font-semibold text-slate-700">Qty</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Unit Price (Rs)</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Total (Rs)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredTenderItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              {/* Checkbox */}
                              <td className="px-3 py-3">
                                <Checkbox
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => handleItemToggle(item.id)}
                                />
                              </td>

                              {/* Item Name */}
                              <td className="px-3 py-3">
                                <div>
                                  <p className="font-medium text-slate-900">{item.nomenclature || 'Item'}</p>
                                  {selectedTender?.tender_type !== 'annual-tender' && (
                                    <p className="text-xs text-slate-500">Tender Qty: {item.quantity}</p>
                                  )}
                                </div>
                              </td>

                              {/* Vendor */}
                              <td className="px-3 py-3">
                                {selectedTender?.tender_type === 'annual-tender' ? (
                                  <div className="text-sm">
                                    {itemVendors[item.id] ? (
                                      (() => {
                                        const vendorId = itemVendors[item.id];
                                        const vendor = vendors[vendorId];
                                        
                                        if (vendor?.vendor_name) {
                                          return <span className="text-green-700 font-medium">✅ {vendor.vendor_name}</span>;
                                        } else {
                                          return <span className="text-orange-600 text-xs" title={`Vendor ID: ${vendorId}`}>⚠️ Not found ({vendorId})</span>;
                                        }
                                      })()
                                    ) : (
                                      <span className="text-red-600 text-xs" title="No vendor assigned">❌ None</span>
                                    )}
                                  </div>
                                ) : (
                                  (() => {
                                    const vendorId = itemVendors[item.id];
                                    const vendor = vendorId ? vendors[vendorId] : null;
                                    return vendor?.vendor_name ? (
                                      <span className="text-slate-700 text-xs">{vendor.vendor_name}</span>
                                    ) : (
                                      <span className="text-slate-400 text-xs italic">No vendor</span>
                                    );
                                  })()
                                )}
                              </td>

                              {/* Specification Input */}
                              <td className="px-3 py-3">
                                <Input
                                  type="text"
                                  placeholder={item.specifications || "Enter specification..."}
                                  disabled={!selectedItems.has(item.id)}
                                  value={itemSpecifications[item.id] || ''}
                                  onChange={(e) => {
                                    setItemSpecifications({
                                      ...itemSpecifications,
                                      [item.id]: e.target.value
                                    });
                                  }}
                                  className="h-8 text-xs w-48"
                                  title={item.specifications ? `Tender spec: ${item.specifications}` : 'No tender specification'}
                                />
                              </td>

                              {/* Quantity Input */}
                              <td className="px-3 py-3 text-center">
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  min="1"
                                  step="1"
                                  disabled={!selectedItems.has(item.id)}
                                  value={itemQuantities[item.id] || ''}
                                  onChange={(e) => {
                                    setItemQuantities({
                                      ...itemQuantities,
                                      [item.id]: parseInt(e.target.value) || 1
                                    });
                                  }}
                                  className="h-8 text-xs w-20 text-center"
                                />
                              </td>

                              {/* Unit Price */}
                              <td className="px-3 py-3">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  step="0.01"
                                  disabled={!selectedItems.has(item.id)}
                                  value={itemPrices[item.id] || ''}
                                  onChange={(e) => {
                                    setItemPrices({
                                      ...itemPrices,
                                      [item.id]: parseFloat(e.target.value) || 0
                                    });
                                  }}
                                  className="h-8 text-xs w-28 text-right"
                                />
                              </td>

                              {/* Total Price */}
                              <td className="px-3 py-3 text-right">
                                <p className="font-semibold text-slate-900">
                                  Rs {((itemPrices[item.id] || 0) * (itemQuantities[item.id] || 1)).toLocaleString()}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Details */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Details</CardTitle>
                <CardDescription>
                  {selectedTender?.tender_type === 'annual-tender' 
                    ? 'Set the PO date and supply order details (Vendors selected per item)' 
                    : 'Select the vendor, set the PO date, and enter supply order details'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Only show vendor selection for non-annual tenders */}
                {selectedTender?.tender_type !== 'annual-tender' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vendor</label>
                    <Select
                      value={Object.values(itemVendors)[0] || ''}
                      onValueChange={(vendorId) => {
                        // Set same vendor for all items (for non-annual tenders)
                        const newVendors: { [key: string]: string } = {};
                        Array.from(selectedItems).forEach(itemId => {
                          newVendors[itemId] = vendorId;
                        });
                        setItemVendors(newVendors);
                      }}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue placeholder="Select vendor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(vendors).length > 0 ? (
                          Object.entries(vendors).map(([id, vendor]) => (
                            <SelectItem key={id} value={id}>
                              {vendor.vendor_name}
                            </SelectItem>
                          ))
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">PO Date</label>
                    <Input
                      type="date"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">File Number</label>
                    <Input
                      type="text"
                      value={fileNumber}
                      onChange={(e) => setFileNumber(e.target.value)}
                      placeholder="Enter file number..."
                      className="border-slate-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Supply Order Details</label>
                  <textarea
                    value={poDetail}
                    onChange={(e) => setPoDetail(e.target.value)}
                    rows={5}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the supply order details that will appear in the PO document..."
                  />
                  <p className="text-xs text-slate-500 mt-1">This text will be displayed in the 'Supply Order' section of the PO document.</p>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedItems.size > 0 && (
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
                <CardHeader className="border-b border-green-200">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Check className="w-5 h-5" />
                    Purchase/Supply Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-xs text-slate-600 mb-1">Selected Items</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedItems.size}</p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-xs text-slate-600 mb-1">Total Value</p>
                        <p className="text-2xl font-bold text-green-600">
                          Rs {Array.from(selectedItems).reduce((sum, itemId) => {
                            const price = itemPrices[itemId] || 0;
                            const qty = itemQuantities[itemId] || 1;
                            return sum + (price * qty);
                          }, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-xs text-slate-600 mb-1">PO Date</p>
                        <p className="text-xl font-bold text-slate-900">
                          {new Date(poDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Show selected items in table format */}
                    {selectedItems.size > 0 && (
                      <div className="border-t border-green-200 pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Selected Items Details</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-100 border-b border-slate-200">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-slate-700">Item</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-700">Vendor</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-700">Specification</th>
                                <th className="text-center px-3 py-2 font-semibold text-slate-700">Qty</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Unit Price</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(selectedItems).map((itemId, idx) => {
                                const item = tenderItems.find(ti => ti.id === itemId);
                                const vendorId = itemVendors[itemId];
                                const qty = itemQuantities[itemId] || 1;
                                const unitPrice = itemPrices[itemId] || 0;
                                const total = qty * unitPrice;
                                const specification = itemSpecifications[itemId] || item?.specifications || '-';
                                return (
                                  <tr key={itemId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-3 py-2 text-slate-900 font-medium">{item?.nomenclature}</td>
                                    <td className="px-3 py-2 text-slate-700">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                        {vendors[vendorId]?.vendor_name || 'Unassigned'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-700 text-sm max-w-xs truncate" title={specification}>
                                      {specification}
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-700">{qty}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">Rs {unitPrice.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">Rs {total.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate(selectedTenderId ? `/dashboard/purchase-orders?tenderId=${selectedTenderId}` : '/dashboard/purchase-orders')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePOs}
                disabled={loading || selectedItems.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Creating...' : `Create PO`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
