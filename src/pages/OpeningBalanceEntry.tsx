import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, Package, Info, Rocket, Clock, Calendar } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface OpeningBalanceItem {
  item_master_id: string;
  nomenclature: string;
  category_name?: string;
  quantity_received: number;
  quantity_already_issued: number;
  quantity_available: number;
  unit_cost: number;
  isExisting?: boolean; // Track if this item was loaded from database
  entry_id?: string; // Database entry ID for updates
  isModified?: boolean; // Track if existing item was modified
  originalValues?: {
    quantity_received: number;
    quantity_already_issued: number;
    unit_cost: number;
  };
}

export default function OpeningBalanceEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  
  // Opening Balance Status
  const [goLiveStatus, setGoLiveStatus] = useState<{
    opening_balance_completed: boolean;
    go_live_date: string | null;
    total_opening_balance_entries: number;
  }>({
    opening_balance_completed: false,
    go_live_date: null,
    total_opening_balance_entries: 0
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  
  // Submission status dropdown (Pending/Completed)
  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'completed'>('pending');
  
  // Existing entries (previously submitted items)
  const [existingEntries, setExistingEntries] = useState<any[]>([]);
  
  // Check if redirected from Dashboard with setup message
  const showSetupMessage = location.state?.showSetupMessage;
  const setupMessage = location.state?.message;
  
  // Form data
  const [formData, setFormData] = useState({
    tender_id: null as string | null,
    tender_reference: '',
    tender_title: '',
    source_type: 'TENDER' as 'TENDER' | 'PURCHASE' | 'DONATION' | 'OTHER',
    opening_balance_date: new Date().toISOString().split('T')[0], // Today as the cut-off date
    remarks: '',
  });

  // Dropdown data
  const [itemMasters, setItemMasters] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; category_name: string }[]>([]);
  const [financialYears, setFinancialYears] = useState<{ year_code: string; year_label: string; is_current: boolean }[]>([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>('');
  
  // Items to add
  const [items, setItems] = useState<OpeningBalanceItem[]>([]);
  const [newItem, setNewItem] = useState({
    item_master_id: '',
    quantity_received: 0,
    quantity_already_issued: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Quick-add dialog states
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ category_name: '', category_code: '' });
  const [newItemForm, setNewItemForm] = useState({ 
    nomenclature: '', 
    item_code: '', 
    unit: 'Nos',
    manufacturer: '',
    specifications: ''
  });
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const sampleCsv = `item_name,item_code,quantity_received,quantity_issued\nPrinter Paper A4,,100,30\n,ITEM-002,50,10\nLaptop Dell,ITEM-003,25,5\n`;

  useEffect(() => {
    fetchInitialData();
    fetchGoLiveStatus();
  }, []);

  // Reload entries when financial year changes
  useEffect(() => {
    if (selectedFinancialYear) {
      fetchExistingEntries(selectedFinancialYear);
    }
  }, [selectedFinancialYear]);

  // Fetch existing opening balance entries and load into editable form
  const fetchExistingEntries = async (fyFilter?: string) => {
    try {
      const url = fyFilter 
        ? `${getApiBaseUrl()}/stock-acquisitions/opening-balance?financial_year=${fyFilter}`
        : `${getApiBaseUrl()}/stock-acquisitions/opening-balance`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const entries = data.entries || [];
        setExistingEntries(entries);
        
        // If entries exist, load them into the editable form
        if (entries.length > 0) {
          // Load source information from first entry (they all share the same)
          const firstEntry = entries[0];
          setFormData(prev => ({
            ...prev,
            tender_reference: firstEntry.tender_reference || '',
            tender_title: firstEntry.tender_title || '',
            source_type: firstEntry.source_type || 'OPENING_BALANCE',
            opening_balance_date: firstEntry.acquisition_date 
              ? new Date(firstEntry.acquisition_date).toISOString().split('T')[0]
              : prev.opening_balance_date,
            remarks: firstEntry.remarks || '',
          }));
          
          // Set financial year from entries if not already set
          if (firstEntry.financial_year && !fyFilter) {
            setSelectedFinancialYear(firstEntry.financial_year);
          }
          
          // Load items into editable items array - mark as existing
          const loadedItems: OpeningBalanceItem[] = entries.map((entry: any) => ({
            item_master_id: entry.item_master_id,
            nomenclature: entry.nomenclature,
            category_name: entry.category_name,
            quantity_received: entry.quantity_received || 0,
            quantity_already_issued: entry.quantity_already_issued || 0,
            quantity_available: entry.quantity_available || 0,
            unit_cost: entry.unit_cost || 0,
            isExisting: true, // Mark as loaded from database
            entry_id: entry.id, // Store the entry ID for updates
            isModified: false,
            originalValues: {
              quantity_received: entry.quantity_received || 0,
              quantity_already_issued: entry.quantity_already_issued || 0,
              unit_cost: entry.unit_cost || 0,
            },
          }));
          setItems(loadedItems);
        } else {
          // Clear items if no entries for this year
          setItems([]);
        }
      }
    } catch (err) {
      console.error('Error fetching existing entries:', err);
    }
  };

  // Fetch Go-Live / Opening Balance Status
  const fetchGoLiveStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/stock-acquisitions/go-live-status`);
      if (response.ok) {
        const data = await response.json();
        setGoLiveStatus({
          opening_balance_completed: data.opening_balance_completed || false,
          go_live_date: data.go_live_date || null,
          total_opening_balance_entries: data.total_opening_balance_entries || 0
        });
      }
    } catch (err) {
      console.error('Error fetching go-live status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Update Opening Balance Status (mark as Completed or Pending)
  const handleStatusChange = async (newStatus: 'completed' | 'pending') => {
    if (newStatus === 'completed' && items.length === 0 && goLiveStatus.total_opening_balance_entries === 0) {
      alert('Cannot mark as Completed without any entries. Please add at least one item first.');
      return;
    }
    
    setStatusUpdating(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/stock-acquisitions/opening-balance-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          go_live_date: newStatus === 'completed' ? (formData.opening_balance_date || new Date().toISOString().split('T')[0]) : null
        })
      });
      
      if (response.ok) {
        await fetchGoLiveStatus();
        if (newStatus === 'completed') {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      // Fetch item masters
      const itemsResponse = await fetch(`${getApiBaseUrl()}/item-masters`);
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        const itemsList = itemsData.items || [];
        setItemMasters(itemsList);
      }
      
      // Fetch categories from categories API
      const categoriesResponse = await fetch(`${getApiBaseUrl()}/categories`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        const categoryList = categoriesData.categories || categoriesData || [];
        setCategories(categoryList.filter((c: any) => c.category_name).map((c: any) => ({
          id: c.id,
          category_name: c.category_name
        })));
      }
      
      // Fetch financial years
      const fyResponse = await fetch(`${getApiBaseUrl()}/stock-acquisitions/financial-years`);
      if (fyResponse.ok) {
        const fyData = await fyResponse.json();
        setFinancialYears(fyData.financial_years || []);
        // Set default to current year
        const currentYear = fyData.current_year || fyData.financial_years?.find((fy: any) => fy.is_current)?.year_code;
        if (currentYear && !selectedFinancialYear) {
          setSelectedFinancialYear(currentYear);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load form data');
    }
  };

  // Quick-add category handler
  const handleAddCategory = async () => {
    if (!newCategoryForm.category_name.trim()) {
      alert('Category name is required');
      return;
    }
    
    setQuickAddLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: newCategoryForm.category_name.trim(),
          category_code: newCategoryForm.category_code.trim() || newCategoryForm.category_name.trim().substring(0, 3).toUpperCase()
        })
      });
      
      if (response.ok) {
        // Refresh categories
        await fetchInitialData();
        setSelectedCategory(newCategoryForm.category_name.trim());
        setNewCategoryForm({ category_name: '', category_code: '' });
        setShowAddCategoryDialog(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create category');
      }
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Failed to create category');
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Quick-add item handler
  const handleAddNewItem = async () => {
    if (!newItemForm.nomenclature.trim()) {
      alert('Nomenclature is required');
      return;
    }
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }
    
    // Find category_id from categories list
    const category = categories.find(c => c.category_name === selectedCategory);
    const categoryId = category?.id || null;
    
    setQuickAddLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/item-masters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomenclature: newItemForm.nomenclature.trim(),
          item_code: newItemForm.item_code.trim() || `ITEM-${Date.now()}`,
          category_id: categoryId,
          unit: newItemForm.unit || 'Nos',
          manufacturer: newItemForm.manufacturer.trim(),
          specifications: newItemForm.specifications.trim()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh items
        await fetchInitialData();
        // Select the newly created item - the response returns itemId not id
        if (data.itemId) {
          setNewItem({ ...newItem, item_master_id: data.itemId });
        }
        setNewItemForm({ nomenclature: '', item_code: '', unit: 'Nos', manufacturer: '', specifications: '' });
        setShowAddItemDialog(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create item');
      }
    } catch (err) {
      console.error('Error creating item:', err);
      alert('Failed to create item');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.item_master_id || newItem.quantity_received <= 0) {
      alert('Please select an item and enter valid quantity');
      return;
    }

    const selectedItem = itemMasters.find(im => im.id === newItem.item_master_id);
    if (!selectedItem) return;

    // Opening balance captures:
    // - quantity_received: total purchased historically
    // - quantity_already_issued: already distributed before system start
    // - quantity_available: what's actually in stock now
    const qtyIssued = newItem.quantity_already_issued || 0;
    if (qtyIssued > newItem.quantity_received) {
      alert('Qty Issued cannot be greater than Qty Received');
      return;
    }
    
    const openingBalanceItem: OpeningBalanceItem = {
      item_master_id: newItem.item_master_id,
      nomenclature: selectedItem.nomenclature,
      category_name: selectedItem.category_name,
      quantity_received: newItem.quantity_received,
      quantity_already_issued: qtyIssued,
      quantity_available: newItem.quantity_received - qtyIssued,
      unit_cost: 0,
    };

    setItems([...items, openingBalanceItem]);
    setNewItem({ 
      item_master_id: '', 
      quantity_received: 0, 
      quantity_already_issued: 0
    });
    setSelectedCategory('');
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'opening-balance-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleCsvImport = (file: File) => {
    setCsvError(null);
    setCsvSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        setCsvError('CSV file must include a header row and at least one data row.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const itemCodeIndex = headers.indexOf('item_code');
      const itemIdIndex = headers.indexOf('item_master_id');
      const itemNameIndex = headers.indexOf('item_name') !== -1 ? headers.indexOf('item_name') : headers.indexOf('nomenclature');
      const qtyIndex = headers.indexOf('quantity_received');
      const qtyIssuedIndex = headers.indexOf('quantity_issued');

      if (qtyIndex === -1 || (itemCodeIndex === -1 && itemIdIndex === -1 && itemNameIndex === -1)) {
        setCsvError('CSV must include columns: quantity_received and at least one of: item_code, item_name, or item_master_id.');
        return;
      }

      const importedItems: OpeningBalanceItem[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i += 1) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const itemCode = itemCodeIndex >= 0 ? cols[itemCodeIndex] : '';
        const itemId = itemIdIndex >= 0 ? cols[itemIdIndex] : '';
        const itemName = itemNameIndex >= 0 ? cols[itemNameIndex] : '';
        const qtyRaw = cols[qtyIndex] || '0';
        const qtyIssuedRaw = qtyIssuedIndex >= 0 ? (cols[qtyIssuedIndex] || '0') : '0';
        const quantityReceived = parseFloat(qtyRaw);
        const quantityIssued = parseFloat(qtyIssuedRaw) || 0;

        if (!itemCode && !itemId && !itemName) {
          errors.push(`Row ${i + 1}: missing item_code, item_name, or item_master_id.`);
          continue;
        }

        if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
          errors.push(`Row ${i + 1}: invalid quantity_received.`);
          continue;
        }

        // Find item by ID, code, or name (case-insensitive partial match for name)
        let matchedItem = itemId
          ? itemMasters.find((im) => im.id === itemId)
          : itemCode 
            ? itemMasters.find((im) => im.item_code === itemCode)
            : itemMasters.find((im) => im.nomenclature.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(im.nomenclature.toLowerCase()));

        if (!matchedItem) {
          errors.push(`Row ${i + 1}: item not found for (${itemName || itemCode || itemId}).`);
          continue;
        }

        if (quantityIssued > quantityReceived) {
          errors.push(`Row ${i + 1}: qty issued (${quantityIssued}) cannot exceed qty received (${quantityReceived}).`);
          continue;
        }

        importedItems.push({
          item_master_id: matchedItem.id,
          nomenclature: matchedItem.nomenclature,
          category_name: matchedItem.category_name,
          quantity_received: quantityReceived,
          quantity_already_issued: quantityIssued,
          quantity_available: quantityReceived - quantityIssued,
          unit_cost: 0,
        });
      }

      if (importedItems.length === 0) {
        setCsvError(errors.length > 0 ? errors.slice(0, 5).join(' ') : 'No valid rows found in CSV.');
        return;
      }

      setItems((prev) => {
        const byId = new Map(prev.map((item) => [item.item_master_id, { ...item }]));
        importedItems.forEach((item) => {
          const existing = byId.get(item.item_master_id);
          if (existing) {
            existing.quantity_received += item.quantity_received;
            existing.quantity_available += item.quantity_received;
            byId.set(item.item_master_id, existing);
          } else {
            byId.set(item.item_master_id, item);
          }
        });
        return Array.from(byId.values());
      });

      if (errors.length > 0) {
        setCsvError(errors.slice(0, 5).join(' '));
      }

      setCsvSuccess(`Imported ${importedItems.length} item(s) from CSV.`);
    };

    reader.readAsText(file);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Separate new items from existing ones
    const newItems = items.filter(item => !item.isExisting);
    const modifiedItems = items.filter(item => item.isExisting && item.isModified);
    const existingItemsCount = items.filter(item => item.isExisting).length;

    // If no new items and no modified items, just update status
    if (newItems.length === 0 && modifiedItems.length === 0 && existingItemsCount > 0) {
      // Just update the status
      await handleStatusChange(submissionStatus);
      return;
    }

    // Validation - need at least one item total
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    // If no new items and no modified items, show message
    if (newItems.length === 0 && modifiedItems.length === 0) {
      setError('No changes to save.');
      return;
    }

    setLoading(true);

    // If no reference provided, generate one automatically
    const reference = formData.tender_reference.trim() || 
      `Opening Balance - ${formData.opening_balance_date}`;

    try {
      // First, update any modified existing items
      if (modifiedItems.length > 0) {
        const updatePayload = {
          items: modifiedItems,
          status: submissionStatus,
        };

        const updateResponse = await fetch(`${getApiBaseUrl()}/stock-acquisitions/opening-balance`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update opening balance entries');
        }
      }

      // Then, add any new items
      if (newItems.length > 0) {
        const payload = {
          ...formData,
          tender_reference: reference,
          acquisition_date: formData.opening_balance_date,
          items: newItems,
          status: submissionStatus,
          financial_year: selectedFinancialYear, // Add financial year to payload
        };

        const response = await fetch(`${getApiBaseUrl()}/stock-acquisitions/opening-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create opening balance entries');
        }
      }
      
      // Show success message
      setSuccess(true);
      
      // Refresh existing entries (this will reload all items with isExisting=true)
      await fetchExistingEntries(selectedFinancialYear);
      await fetchGoLiveStatus();
      
      // Don't redirect - stay on page to show the submitted entries
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving opening balance:', err);
      setError(err.message || 'Failed to save opening balance entries');
    } finally {
      setLoading(false);
    }
  };

  // Use all items from item masters
  const availableItems = itemMasters;

  const filteredItems = selectedCategory
    ? availableItems.filter(item => item.category_name === selectedCategory)
    : availableItems;

  const itemOptions = filteredItems.map((item) => {
    const itemCode = item.item_code || item.item_code?.code || 'N/A';
    return {
      value: item.id,
      label: `${itemCode} - ${item.nomenclature}`,
    };
  });

  const totalReceived = items.reduce((sum, item) => sum + item.quantity_received, 0);
  const totalIssued = items.reduce((sum, item) => sum + item.quantity_already_issued, 0);
  const totalAvailable = items.reduce((sum, item) => sum + item.quantity_available, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity_received * item.unit_cost), 0);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard/stock-acquisitions')} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Opening Balance Entry</h1>
            <p className="text-sm text-gray-600 mt-1">Record existing stock from past tenders/purchases (2020 onwards)</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/yearwise-inventory-report')}>
          <Calendar className="w-4 h-4 mr-2" />
          Year-Wise Report
        </Button>
      </div>

      {/* System Setup Welcome Message */}
      {showSetupMessage && (
        <Alert className="mb-6 bg-blue-50 border-blue-300 border-2">
          <Rocket className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-800 font-semibold text-lg">Welcome to IMS - System Setup Required</AlertTitle>
          <AlertDescription className="text-blue-700 mt-2">
            <p className="mb-2">{setupMessage || 'To start using the Inventory Management System properly, please enter the Opening Balance first.'}</p>
            <div className="bg-blue-100 p-3 rounded mt-3">
              <p className="font-medium mb-2">What is Opening Balance?</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><strong>Qty Received:</strong> Total quantity purchased historically</li>
                <li><strong>Qty Already Issued:</strong> Items already distributed before system go-live</li>
                <li><strong>Available Stock:</strong> What's physically in stock now (auto-calculated)</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Note:</strong> After completing this entry, all future deliveries must have dates on or after today (the go-live date).
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Opening Balance Status Card */}
      <Card className={`mb-6 ${goLiveStatus.opening_balance_completed ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${goLiveStatus.opening_balance_completed ? 'bg-green-200' : 'bg-orange-200'}`}>
                {goLiveStatus.opening_balance_completed ? (
                  <CheckCircle className="h-6 w-6 text-green-700" />
                ) : (
                  <Clock className="h-6 w-6 text-orange-700" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Opening Balance Status</h3>
                  <Badge variant={goLiveStatus.opening_balance_completed ? "default" : "secondary"} 
                         className={goLiveStatus.opening_balance_completed ? "bg-green-600" : "bg-orange-500"}>
                    {goLiveStatus.opening_balance_completed ? 'COMPLETED' : 'PENDING'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {goLiveStatus.opening_balance_completed ? (
                    <>
                      Go-live Date: <strong>{goLiveStatus.go_live_date}</strong> | 
                      Entries: <strong>{goLiveStatus.total_opening_balance_entries}</strong>
                    </>
                  ) : (
                    'Enter your existing inventory to set the system go-live date'
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {goLiveStatus.opening_balance_completed ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('pending')}
                  disabled={statusUpdating}
                  className="border-orange-400 text-orange-700 hover:bg-orange-100"
                >
                  {statusUpdating ? 'Updating...' : 'Reopen for Edits'}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  disabled={statusUpdating || (items.length === 0 && goLiveStatus.total_opening_balance_entries === 0)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {statusUpdating ? 'Updating...' : 'Mark as Completed'}
                </Button>
              )}
            </div>
          </div>
          
          {goLiveStatus.opening_balance_completed && (
            <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
              <Info className="h-4 w-4 inline mr-1" />
              System is live. All new deliveries must have dates on or after {goLiveStatus.go_live_date}.
              Click "Reopen for Edits" if you need to make changes.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Opening balance entries saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {csvSuccess && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {csvSuccess}
          </AlertDescription>
        </Alert>
      )}

      {csvError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{csvError}</AlertDescription>
        </Alert>
      )}

      {/* Main Form - Editable when PENDING, Read-only when COMPLETED */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Details */}
        <Card className={goLiveStatus.opening_balance_completed ? 'opacity-75' : ''}>
          <CardHeader>
            <CardTitle>
              Source Information 
              <span className="text-sm font-normal text-gray-500 ml-2">
                {goLiveStatus.opening_balance_completed ? '(Read Only)' : '(Optional)'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Financial Year Selection - Required */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <Label className="text-blue-800 font-semibold">Financial Year * <span className="text-xs font-normal text-blue-600">(Required - Select the year for this opening balance)</span></Label>
              <Select
                value={selectedFinancialYear}
                onValueChange={setSelectedFinancialYear}
                disabled={goLiveStatus.opening_balance_completed}
              >
                <SelectTrigger className="mt-2 bg-white">
                  <SelectValue placeholder="Select Financial Year" />
                </SelectTrigger>
                <SelectContent>
                  {financialYears.map((fy) => (
                    <SelectItem key={fy.year_code} value={fy.year_code}>
                      {fy.year_label} {fy.is_current && '(Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600 mt-1">
                Opening balance entries are tracked by financial year. You can add entries for any year.
              </p>
            </div>

            {/* Manual Entry - Tender Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
              {/* Tender Reference */}
              <div>
                <Label>Reference <span className="text-xs text-gray-500">(Optional - auto-generated if blank)</span></Label>
                <Input
                  value={formData.tender_reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, tender_reference: e.target.value }))}
                  disabled={goLiveStatus.opening_balance_completed}
                  placeholder="e.g., TENDER-2023-001, Initial Stock, etc."
                  className="bg-white"
                />
              </div>

              {/* Tender Title */}
              <div>
                <Label>Title/Description</Label>
                <Input
                  value={formData.tender_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, tender_title: e.target.value }))}
                  disabled={goLiveStatus.opening_balance_completed}
                  placeholder="e.g., Laptops and Office Equipment 2023"
                  className="bg-white"
                />
              </div>
            </div>

            {/* Opening Balance Date */}
            <div>
              <Label>Opening Balance Date * <span className="text-xs text-gray-500">(Cut-off date for this inventory snapshot)</span></Label>
              <Input
                type="date"
                value={formData.opening_balance_date}
                onChange={(e) => setFormData(prev => ({ ...prev, opening_balance_date: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                disabled={goLiveStatus.opening_balance_completed}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Stock counts are effective as of this date</p>
            </div>

            {/* Remarks */}
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                disabled={goLiveStatus.opening_balance_completed}
                placeholder="Additional notes about this stock..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Items Section */}
        <Card className={goLiveStatus.opening_balance_completed ? 'opacity-75' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Items & Quantities {goLiveStatus.opening_balance_completed && <span className="text-sm font-normal text-gray-500">(Read Only)</span>}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!goLiveStatus.opening_balance_completed && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-semibold">Import Items from CSV</div>
                    <div className="text-xs text-gray-600">
                      CSV columns: item_name or item_code, quantity_received, quantity_issued (optional)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={downloadSampleCsv}>
                      Download Sample CSV
                    </Button>
                    <div className="relative inline-flex">
                      <input
                        id="opening-balance-csv-upload"
                        type="file"
                        accept=".csv,text/csv"
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCsvImport(file);
                          e.currentTarget.value = '';
                        }}
                      />
                      <span className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium inline-flex items-center justify-center">
                        Upload CSV
                      </span>
                    </div>
                  </div>
                </div>
                <pre className="mt-3 text-xs bg-gray-50 border rounded p-2 overflow-x-auto">{sampleCsv}</pre>
              </div>
            )}
            {/* Add Item Form - Only show when not completed */}
            {!goLiveStatus.opening_balance_completed && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs">Category</Label>
                  <div className="flex gap-1">
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setNewItem(prev => ({ ...prev, item_master_id: '' }));
                      }}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.category_name}>{cat.category_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setShowAddCategoryDialog(true)}
                      title="Add new category"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Item *</Label>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <SearchableSelect
                        options={itemOptions}
                        value={newItem.item_master_id}
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, item_master_id: value }))}
                        placeholder={selectedCategory ? "Select item..." : "Category first"}
                        searchPlaceholder="Search by item code or name..."
                        disabled={!selectedCategory}
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setShowAddItemDialog(true)}
                    disabled={!selectedCategory}
                    title="Add new item"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Qty Received *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity_received || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity_received: parseInt(e.target.value) || 0 }))}
                  className="h-9"
                  placeholder="Total bought"
                />
              </div>

              <div>
                <Label className="text-xs">Qty Already Issued</Label>
                <Input
                  type="number"
                  min="0"
                  max={newItem.quantity_received || 0}
                  value={newItem.quantity_already_issued || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity_already_issued: parseInt(e.target.value) || 0 }))}
                  className="h-9"
                  placeholder="Already given"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="h-9 w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>Category</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Received</TableHead>
                      <TableHead className="text-right">Qty Issued</TableHead>
                      <TableHead className="text-right font-bold">Total Qty</TableHead>
                      {!goLiveStatus.opening_balance_completed && <TableHead className="w-[60px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} className={item.isModified ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          <Badge variant="outline">{item.category_name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.nomenclature}</TableCell>
                        <TableCell className="text-right">
                          {!goLiveStatus.opening_balance_completed ? (
                            <Input
                              type="number"
                              min={0}
                              value={item.quantity_received}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value) || 0;
                                setItems(prev => prev.map((it, i) => {
                                  if (i !== index) return it;
                                  const isModified = it.isExisting && it.originalValues ? (
                                    newVal !== it.originalValues.quantity_received ||
                                    it.quantity_already_issued !== it.originalValues.quantity_already_issued ||
                                    it.unit_cost !== it.originalValues.unit_cost
                                  ) : false;
                                  return {
                                    ...it,
                                    quantity_received: newVal,
                                    quantity_available: newVal - it.quantity_already_issued,
                                    isModified,
                                  };
                                }));
                              }}
                              className="w-20 text-right"
                            />
                          ) : (
                            item.quantity_received
                          )}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {!goLiveStatus.opening_balance_completed ? (
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity_received}
                              value={item.quantity_already_issued}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value) || 0;
                                setItems(prev => prev.map((it, i) => {
                                  if (i !== index) return it;
                                  const isModified = it.isExisting && it.originalValues ? (
                                    it.quantity_received !== it.originalValues.quantity_received ||
                                    newVal !== it.originalValues.quantity_already_issued ||
                                    it.unit_cost !== it.originalValues.unit_cost
                                  ) : false;
                                  return {
                                    ...it,
                                    quantity_already_issued: newVal,
                                    quantity_available: it.quantity_received - newVal,
                                    isModified,
                                  };
                                }));
                              }}
                              className="w-20 text-right"
                            />
                          ) : (
                            item.quantity_already_issued
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">{item.quantity_available}</TableCell>
                        {!goLiveStatus.opening_balance_completed && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-gray-100 font-semibold">
                      <TableCell colSpan={2}>TOTALS ({items.length} items)</TableCell>
                      <TableCell className="text-right">{totalReceived}</TableCell>
                      <TableCell className="text-right text-orange-600">{totalIssued}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{totalAvailable}</TableCell>
                      {!goLiveStatus.opening_balance_completed && <TableCell></TableCell>}
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Total Items</div>
                      <div className="text-2xl font-bold">{items.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Qty Received</div>
                      <div className="text-2xl font-bold">{totalReceived}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Qty Already Issued</div>
                      <div className="text-2xl font-bold text-orange-600">{totalIssued}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-green-700">Available Stock</div>
                      <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No items added yet. Use the form above to add items.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Section - Only show when not completed */}
        {!goLiveStatus.opening_balance_completed && (
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  {(() => {
                    const newItemsCount = items.filter(i => !i.isExisting).length;
                    const existingCount = items.filter(i => i.isExisting).length;
                    return (
                      <>
                        <p className="text-sm text-gray-600">
                          {existingCount > 0 && newItemsCount > 0 && (
                            <>Existing: {existingCount} | <strong>New: {newItemsCount}</strong></>
                          )}
                          {existingCount > 0 && newItemsCount === 0 && (
                            <>Total items: {existingCount} (already saved)</>
                          )}
                          {existingCount === 0 && newItemsCount > 0 && (
                            <>New items to save: {newItemsCount}</>
                          )}
                          {items.length === 0 && <>No items added</>}
                        </p>
                        {newItemsCount > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Will add <strong>{items.filter(i => !i.isExisting).reduce((sum, i) => sum + i.quantity_available, 0)}</strong> new units to stock
                          </p>
                        )}
                      </>
                    );
                  })()}
                  {totalIssued > 0 && (
                    <p className="text-xs text-orange-600">
                      (Already issued: {totalIssued} units tracked for historical reference)
                    </p>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Status:</Label>
                    <Select
                      value={submissionStatus}
                      onValueChange={(value: 'pending' | 'completed') => setSubmissionStatus(value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/stock-acquisitions')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || items.length === 0}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : (
                      items.filter(i => !i.isExisting).length > 0 
                        ? 'Save New Items' 
                        : (submissionStatus === 'completed' ? 'Mark Completed' : 'Update Status')
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category for organizing items</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category_name">Category Name *</Label>
              <Input
                id="category_name"
                value={newCategoryForm.category_name}
                onChange={(e) => setNewCategoryForm(prev => ({ ...prev, category_name: e.target.value }))}
                placeholder="e.g., Electronics, Stationery"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category_code">Category Code (Optional)</Label>
              <Input
                id="category_code"
                value={newCategoryForm.category_code}
                onChange={(e) => setNewCategoryForm(prev => ({ ...prev, category_code: e.target.value }))}
                placeholder="Auto-generated if empty"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={quickAddLoading}>
              {quickAddLoading ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>Create a new item in category: <strong>{selectedCategory}</strong></DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nomenclature">Nomenclature *</Label>
              <Input
                id="nomenclature"
                value={newItemForm.nomenclature}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, nomenclature: e.target.value }))}
                placeholder="Item name/description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item_code">Item Code (Optional)</Label>
                <Input
                  id="item_code"
                  value={newItemForm.item_code}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, item_code: e.target.value }))}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={newItemForm.unit}
                  onValueChange={(value) => setNewItemForm(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nos">Nos (Numbers)</SelectItem>
                    <SelectItem value="Kg">Kg (Kilogram)</SelectItem>
                    <SelectItem value="Ltr">Ltr (Liter)</SelectItem>
                    <SelectItem value="Mtr">Mtr (Meter)</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Pack">Pack</SelectItem>
                    <SelectItem value="Set">Set</SelectItem>
                    <SelectItem value="Pair">Pair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manufacturer">Manufacturer (Optional)</Label>
              <Input
                id="manufacturer"
                value={newItemForm.manufacturer}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Brand/Manufacturer name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specifications">Specifications (Optional)</Label>
              <Textarea
                id="specifications"
                value={newItemForm.specifications}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, specifications: e.target.value }))}
                placeholder="Item specifications or details"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewItem} disabled={quickAddLoading}>
              {quickAddLoading ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
