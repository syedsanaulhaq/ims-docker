import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateUUID } from '@/utils/uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, FileText, Upload, PackagePlus, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TenderVendorManagement from '@/components/tenders/TenderVendorManagement';
import { CsvUploadModal } from '@/components/CsvUploadModal';

interface TenderItem {
  id?: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price?: number;
  total_amount?: number;
  specifications?: string;
  remarks?: string;
  vendor_id?: string;
  vendor_ids?: string[];
  category_name?: string;
  category_description?: string;
  unit?: string;
  source_required_item_id?: string;
  source_required_item_ids?: string[];
  source_request_id?: string;
  source_request_number?: string;
  requested_by_wing_name?: string;
  urgency_level?: string;
}

interface RequiredItemOption {
  id: string;
  item_master_id: string | null;
  nomenclature: string;
  quantity_needed: number;
  unit: string | null;
  urgency_level: string;
  source_request_number: string | null;
  requested_by_wing_name: string | null;
  category_name: string | null;
  request_type: 'Individual' | 'Organizational' | string | null;
  requester_name: string | null;
  employee_view_requester_name: string | null;
  employee_view_branch_name: string | null;
  requester_wing_name: string | null;
  requester_office_name: string | null;
  requester_branch_name: string | null;
  source_request_id?: string;
}

interface ItemMaster {
  id: string;
  nomenclature: string;
  category_name?: string;
  category_description?: string;
  sub_category_name?: string;
}

interface Office {
  intOfficeID: number;
  strOfficeName: string;
  OfficeCode?: number;
  strOfficeDescription?: string;
}

interface Wing {
  Id: number;
  Name: string;
  ShortName?: string;
  FocalPerson?: string;
  ContactNo?: string;
}

interface Dec {
  intAutoID: number;
  WingID: number;
  DECName: string;
  DECAcronym?: string;
  DECAddress?: string;
  Location?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code?: string;
  contact_person?: string;
}

const groupTenderItems = (items: TenderItem[], tenderType: string): TenderItem[] => {
  const map = new Map<string, TenderItem>();
  items.forEach(item => {
    const vendorKey = tenderType === 'annual-tender'
      ? (Array.isArray(item.vendor_ids) ? [...item.vendor_ids].sort().join(',') : item.vendor_id || '')
      : (item.vendor_id || '');
    const key = `${item.item_master_id || item.nomenclature || ''}|${vendorKey}`;
    const existing = map.get(key);
    if (existing) {
      const qty = (existing.quantity || 0) + (item.quantity || 0);
      const price = existing.estimated_unit_price || item.estimated_unit_price || 0;
      map.set(key, {
        ...existing,
        quantity: qty,
        estimated_unit_price: price,
        total_amount: qty * price,
        remarks: [existing.remarks, item.remarks].filter(Boolean).join('; '),
        specifications: [existing.specifications, item.specifications].filter(Boolean).join('; ')
      });
    } else {
      map.set(key, { ...item });
    }
  });
  return Array.from(map.values());
};

const EditTender: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [decs, setDecs] = useState<Dec[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredWings, setFilteredWings] = useState<Wing[]>([]);
  const [filteredDecs, setFilteredDecs] = useState<Dec[]>([]);
  
  // Main tender form data
  const [tenderData, setTenderData] = useState({
    reference_number: '',
    title: '',
    description: '',
    estimated_value: '',
    publish_date: '',
    submission_deadline: '',
    opening_date: '',
    tender_type: 'contract',
    status: 'draft',
    vendor_id: '',
    office_ids: [] as string[],
    wing_ids: [] as string[],
    dec_ids: [] as string[],
    // Additional fields
    publication_daily: '',
    procurement_method: '',
    procedure_adopted: ''
  });

  // File uploads state
  const [fileUploads, setFileUploads] = useState({
    contract_file: null as File | null,
    loi_file: null as File | null,
    po_file: null as File | null,
    rfp_file: null as File | null,
    rfq_file: null as File | null,
    quotation_file: null as File | null,
    comparison_file: null as File | null,
    tender_notice_file: null as File | null,
    standing_arrangement_file: null as File | null,
    vendor_list_file: null as File | null,
    schedule_file: null as File | null,
    evaluation_report_file: null as File | null
  });

  // Tender items
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [bidders, setBidders] = useState<any[]>([]);
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [showRequiredItemsModal, setShowRequiredItemsModal] = useState<boolean>(false);
  const [requiredItemOptions, setRequiredItemOptions] = useState<RequiredItemOption[]>([]);
  const [selectedRequiredItemIds, setSelectedRequiredItemIds] = useState<Set<string>>(new Set());
  const [requiredItemsSearch, setRequiredItemsSearch] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState<TenderItem>({
    item_master_id: '',
    nomenclature: '',
    quantity: 1,
    estimated_unit_price: 0,
    total_amount: 0,
    specifications: '',
    remarks: '',
    vendor_ids: []
  });

  // Load tender data on mount
  useEffect(() => {
    const loadTenderData = async () => {
      if (!id) return;
      
      try {
        setLoadingData(true);
        const response = await fetch(`/api/tenders/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load tender');
        }

        const tender = await response.json();
        setTenderData({
          reference_number: tender.reference_number || '',
          title: tender.title || '',
          description: tender.description || '',
          estimated_value: tender.estimated_value?.toString() || '',
          publish_date: tender.publish_date ? tender.publish_date.split('T')[0] : '',
          submission_deadline: tender.submission_deadline ? tender.submission_deadline.split('T')[0] : '',
          opening_date: tender.opening_date ? tender.opening_date.split('T')[0] : '',
          tender_type: tender.tender_type || 'contract',
          status: tender.status || 'draft',
          vendor_id: tender.vendor_id || '',
          office_ids: tender.office_ids
            ? tender.office_ids.split(',').map((id: string) => id.trim()).filter(id => id)
            : [],
          wing_ids: tender.wing_ids
            ? tender.wing_ids.split(',').map((id: string) => id.trim()).filter(id => id)
            : [],
          dec_ids: tender.dec_ids
            ? tender.dec_ids.split(',').map((id: string) => id.trim()).filter(id => id)
            : [],
          publication_daily: tender.publication_daily || '',
          procurement_method: tender.procurement_method || '',
          procedure_adopted: tender.procedure_adopted || ''
        });

        // Load tender items
        if (tender.items && Array.isArray(tender.items)) {
          // Normalize annual tender vendor selection into vendor_ids array
          const processedItems = tender.items.map(item => {
            if (tender.tender_type === 'annual-tender') {
              if (item.vendor_ids && typeof item.vendor_ids === 'string') {
                return {
                  ...item,
                  vendor_ids: item.vendor_ids.split(',').map(id => id.trim()).filter(id => id)
                };
              }
              if (!item.vendor_ids && item.vendor_id) {
                return {
                  ...item,
                  vendor_ids: [item.vendor_id]
                };
              }
            }
            return item;
          });
          setTenderItems(groupTenderItems(processedItems, tender.tender_type));
        }

        // Load tender vendors/bidders
        try {
          const vendorsResponse = await fetch(`/api/tenders/${id}/vendors`);
          if (vendorsResponse.ok) {
            const vendorsData = await vendorsResponse.json();
            const vendorsList = Array.isArray(vendorsData) ? vendorsData : vendorsData.vendors || [];
            setBidders(vendorsList);
            
            // For annual tenders: validate item vendors against bidders list
            if (tender.tender_type === 'annual-tender' && tender.items && Array.isArray(tender.items)) {
              const bidderVendorIds = vendorsList.map(b => b.vendor_id);
              
              const itemsWithValidVendors = tender.items.map(item => {
                // Get vendor_ids array
                let itemVendorIds = [];
                if (item.vendor_ids && typeof item.vendor_ids === 'string') {
                  itemVendorIds = item.vendor_ids.split(',').map(id => id.trim()).filter(id => id);
                } else if (item.vendor_ids && Array.isArray(item.vendor_ids)) {
                  itemVendorIds = item.vendor_ids;
                } else if (item.vendor_id) {
                  itemVendorIds = [item.vendor_id];
                }
                
                // Keep only vendors that exist in the bidders list
                const validVendorIds = itemVendorIds.filter(vid => bidderVendorIds.includes(vid));
                
                if (validVendorIds.length !== itemVendorIds.length) {
                  }
                
                return {
                  ...item,
                  vendor_ids: validVendorIds
                };
              });

              setTenderItems(groupTenderItems(itemsWithValidVendors, tender.tender_type));
            }
          } else {
            }
        } catch (err) {
          console.error('Error loading tender vendors:', err);
        }
      } catch (err) {
        console.error('Error loading tender:', err);
        setError('Failed to load tender data');
      } finally {
        setLoadingData(false);
      }
    };

    loadTenderData();
  }, [id]);

  // Fetch initial data (item masters, offices, and vendors)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Item Masters
        const itemMastersResponse = await fetch('/api/item-masters');
        if (itemMastersResponse.ok) {
          const itemMastersData = await itemMastersResponse.json();
          // Handle the {success: true, items: [...]} format
          setItemMasters(itemMastersData.items || []);
        }

        // Fetch Offices
        const officesResponse = await fetch('/api/offices');
        if (officesResponse.ok) {
          const officesData = await officesResponse.json();
          setOffices(Array.isArray(officesData) ? officesData : []);
        }

        // Fetch Vendors
        const vendorsResponse = await fetch('/api/vendors');
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json();
          if (vendorsData.vendors && Array.isArray(vendorsData.vendors)) {
            setVendors(vendorsData.vendors);
          } else if (Array.isArray(vendorsData)) {
            setVendors(vendorsData);
          } else {
            setVendors([]);
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch wings when offices are selected
  useEffect(() => {
    const fetchWingsForOffices = async () => {
      if (tenderData.office_ids.length === 0) {
        setFilteredWings([]);
        setFilteredDecs([]);
        return;
      }

      try {
        const allWings: Wing[] = [];
        
        for (const officeId of tenderData.office_ids) {
          const response = await fetch(`/api/offices/${officeId}/wings`);
          if (response.ok) {
            const wingsData = await response.json();
            const wings = Array.isArray(wingsData) ? wingsData : wingsData.data || [];
            allWings.push(...wings);
          }
        }

        setFilteredWings(allWings);
        
        // Clear wing and dec selections that are no longer valid
        const validWingIds = allWings.map(w => w.Id.toString());
        const filteredWingIds = tenderData.wing_ids.filter(id => validWingIds.includes(id));
        
        if (filteredWingIds.length !== tenderData.wing_ids.length) {
          setTenderData(prev => ({ 
            ...prev, 
            wing_ids: filteredWingIds,
            dec_ids: []
          }));
        }
      } catch (err) {
        console.error('Error fetching wings:', err);
      }
    };

    fetchWingsForOffices();
  }, [tenderData.office_ids]);

  // Fetch decs when wings are selected
  useEffect(() => {
    const fetchDecsForWings = async () => {
      if (tenderData.wing_ids.length === 0) {
        setFilteredDecs([]);
        setTenderData(prev => ({ ...prev, dec_ids: [] }));
        return;
      }

      try {
        const allDecs: Dec[] = [];
        
        for (const wingId of tenderData.wing_ids) {
          const response = await fetch(`/api/wings/${wingId}/decs`);
          if (response.ok) {
            const decsData = await response.json();
            const decs = Array.isArray(decsData) ? decsData : decsData.data || [];
            allDecs.push(...decs);
          }
        }

        setFilteredDecs(allDecs);
        
        // Clear dec selections that are no longer valid
        const validDecIds = allDecs.map(d => d.intAutoID.toString());
        const filteredDecIds = tenderData.dec_ids.filter(id => validDecIds.includes(id));
        
        if (filteredDecIds.length !== tenderData.dec_ids.length) {
          setTenderData(prev => ({ 
            ...prev, 
            dec_ids: filteredDecIds
          }));
        }
      } catch (err) {
        console.error('Error fetching decs:', err);
      }
    };

    fetchDecsForWings();
  }, [tenderData.wing_ids]);

  // Calculate total amount when quantity or price changes
  useEffect(() => {
    const total = (newItem.quantity || 0) * (newItem.estimated_unit_price || 0);
    setNewItem(prev => ({ ...prev, total_amount: total }));
  }, [newItem.quantity, newItem.estimated_unit_price]);

  // Handle adding new item to tender
  const handleAddItem = () => {
    if (!newItem.item_master_id || !newItem.nomenclature || newItem.quantity <= 0) {
      alert('Please fill in all required item fields');
      return;
    }

    if (tenderData.tender_type === 'annual-tender') {
      if (!Array.isArray(newItem.vendor_ids) || newItem.vendor_ids.length === 0) {
        alert('Please select at least one vendor for this item');
        return;
      }
    } else {
      if (!tenderData.vendor_id) {
        alert('Please add vendors in the "Participating Bidders" section and mark one as selected');
        return;
      }
    }

    const item: TenderItem = {
      ...newItem,
      id: `temp-${Date.now()}`
    };

    setTenderItems(prev => groupTenderItems([...prev, item], tenderData.tender_type));
    setNewItem({
      item_master_id: '',
      nomenclature: '',
      quantity: 1,
      estimated_unit_price: 0,
      total_amount: 0,
      specifications: '',
      remarks: '',
      vendor_ids: []
    });
  };

  // Handle removing item from tender
  const handleRemoveItem = (index: number) => {
    setTenderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle bulk delete of selected items
  const handleBulkDelete = () => {
    if (selectedItemIds.size === 0) {
      alert('Please select items to delete');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedItemIds.size} selected item(s)?`)) {
      setTenderItems(prev => prev.filter(item => !selectedItemIds.has(item.id || '')));
      setSelectedItemIds(new Set());
    }
  };

  // Handle select all items
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(tenderItems.map(item => item.id || '').filter(id => id));
      setSelectedItemIds(allIds);
    } else {
      setSelectedItemIds(new Set());
    }
  };

  // Handle single item selection
  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  // Handle item master selection
  const handleItemMasterSelect = (itemMasterId: string) => {
    const selectedItem = itemMasters.find(item => item.id === itemMasterId);
    if (selectedItem) {
      setNewItem(prev => ({
        ...prev,
        item_master_id: itemMasterId,
        nomenclature: selectedItem.nomenclature,
        category_name: selectedItem.category_name,
        category_description: selectedItem.category_description
      }));
    }
  };

  // Handle items imported from CSV modal
  const handleCsvItemsImport = (items: any[]) => {
    const newItems: TenderItem[] = items.map((item: any) => ({
      id: generateUUID(),
      item_master_id: item.item_master_id || '',
      nomenclature: item.nomenclature || '',
      quantity: 1,
      estimated_unit_price: item.estimated_unit_price || 0,
      total_amount: item.estimated_unit_price || 0,
      specifications: item.specifications || '',
      remarks: item.remarks || '',
      vendor_ids: item.vendor_id ? [item.vendor_id] : [],
      category_name: item.category_name || '',
      category_description: item.category_description || ''
    }));

    setTenderItems(prev => groupTenderItems([...prev, ...newItems], tenderData.tender_type));
    alert(`Successfully imported ${newItems.length} items from CSV`);
  };

  const fetchPendingRequiredItems = async () => {
    try {
      const res = await fetch('/api/required-items?status=Pending&limit=500');
      if (!res.ok) throw new Error('Failed to fetch required items');
      const data = await res.json();
      setRequiredItemOptions(data.data || []);
    } catch (err) {
      console.error('Error fetching required items for tender picker:', err);
    }
  };

  const handleOpenRequiredItemsModal = () => {
    setShowRequiredItemsModal(true);
    fetchPendingRequiredItems();
  };

  const handleToggleRequiredItem = (id: string, checked: boolean) => {
    setSelectedRequiredItemIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAllRequiredItems = (checked: boolean) => {
    if (checked) {
      setSelectedRequiredItemIds(new Set(filteredRequiredItems.map(i => i.id)));
    } else {
      setSelectedRequiredItemIds(new Set());
    }
  };

  const handleAddSelectedRequiredItems = () => {
    const selected = requiredItemOptions.filter(i => selectedRequiredItemIds.has(i.id));
    if (selected.length === 0) {
      alert('Please select at least one item.');
      return;
    }

    const grouped = new Map<string, { item: RequiredItemOption; sourceIds: string[]; totalQty: number; sourceRequests: string[] }>();

    for (const item of selected) {
      const key = item.item_master_id || item.nomenclature;
      const existing = grouped.get(key);
      if (existing) {
        existing.sourceIds.push(item.id);
        existing.totalQty += item.quantity_needed;
        if (item.source_request_number && !existing.sourceRequests.includes(item.source_request_number)) {
          existing.sourceRequests.push(item.source_request_number);
        }
      } else {
        grouped.set(key, {
          item,
          sourceIds: [item.id],
          totalQty: item.quantity_needed,
          sourceRequests: item.source_request_number ? [item.source_request_number] : []
        });
      }
    }

    const newTenderItems: TenderItem[] = Array.from(grouped.values()).map(({ item, sourceIds, totalQty, sourceRequests }) => ({
      id: `req-${item.item_master_id || item.id}`,
      item_master_id: item.item_master_id || '',
      nomenclature: item.nomenclature,
      quantity: totalQty,
      unit: item.unit || '',
      estimated_unit_price: 0,
      total_amount: 0,
      specifications: '',
      remarks: `Imported from required items pipeline | Requests: ${sourceRequests.join(', ') || 'N/A'}`,
      source_required_item_ids: sourceIds,
      source_request_number: sourceRequests.join(', '),
      requested_by_wing_name: item.requested_by_wing_name || '',
      urgency_level: item.urgency_level,
      vendor_id: '',
      vendor_ids: []
    }));

    setTenderItems(prev => {
      const merged = [...prev];
      for (const newItem of newTenderItems) {
        const existingIndex = merged.findIndex(existing =>
          (existing.item_master_id && existing.item_master_id === newItem.item_master_id) ||
          (!existing.item_master_id && existing.nomenclature === newItem.nomenclature)
        );
        if (existingIndex >= 0) {
          const existing = merged[existingIndex];
          merged[existingIndex] = {
            ...existing,
            quantity: existing.quantity + newItem.quantity,
            source_required_item_ids: Array.from(new Set([
              ...(existing.source_required_item_ids || []),
              ...(newItem.source_required_item_ids || [])
            ])),
            source_request_number: [
              ...(existing.source_request_number ? existing.source_request_number.split(', ') : []),
              ...(newItem.source_request_number ? newItem.source_request_number.split(', ') : [])
            ].filter((v, i, a) => a.indexOf(v) === i).join(', ')
          };
        } else {
          merged.push(newItem);
        }
      }
      return groupTenderItems(merged, tenderData.tender_type);
    });

    setSelectedRequiredItemIds(new Set());
    setShowRequiredItemsModal(false);
  };

  const filteredRequiredItems = requiredItemOptions.filter(item => {
    const term = requiredItemsSearch.toLowerCase();
    return (
      item.nomenclature.toLowerCase().includes(term) ||
      (item.source_request_number && item.source_request_number.toLowerCase().includes(term)) ||
      (item.employee_view_requester_name && item.employee_view_requester_name.toLowerCase().includes(term)) ||
      (item.employee_view_branch_name && item.employee_view_branch_name.toLowerCase().includes(term)) ||
      (item.requester_wing_name && item.requester_wing_name.toLowerCase().includes(term)) ||
      (item.requester_office_name && item.requester_office_name.toLowerCase().includes(term))
    );
  });

  // Calculate total tender value
  const totalTenderValue = tenderItems.reduce((sum, item) => {
    if (tenderData.tender_type === 'annual-tender') {
      // For annual tenders, sum the unit prices (each represents value for that vendor)
      return sum + (item.estimated_unit_price || 0);
    } else {
      // For contract/spot-purchase, sum the total amounts (quantity * unit price)
      return sum + (item.total_amount || 0);
    }
  }, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  // Petty Purchase Amount Validation
  const getSpotPurchaseValidation = () => {
    if (tenderData.tender_type !== 'spot-purchase') return { isValid: true, message: '' };
    
    const procurementMethod = tenderData.procurement_method;
    
    if (procurementMethod === 'single_quotation') {
      if (totalTenderValue > 100000) {
        return {
          isValid: false,
          message: `Single Quotation maximum limit is PKR 100,000. Current total: ${formatCurrency(totalTenderValue)}`
        };
      }
    } else if (procurementMethod === 'multiple_quotation') {
      if (totalTenderValue <= 100000) {
        return {
          isValid: false,
          message: `Multiple Quotation minimum limit is PKR 100,001. Current total: ${formatCurrency(totalTenderValue)}`
        };
      }
      if (totalTenderValue > 500000) {
        return {
          isValid: false,
          message: `Multiple Quotation maximum limit is PKR 500,000. Please register a tender instead. Current total: ${formatCurrency(totalTenderValue)}`
        };
      }
    }
    
    if (totalTenderValue > 500000) {
      return {
        isValid: false,
        message: `Petty Purchase maximum limit is PKR 500,000. You must register a tender for amounts exceeding this limit. Current total: ${formatCurrency(totalTenderValue)}`
      };
    }
    
    return { isValid: true, message: '' };
  };

  const spotPurchaseValidation = getSpotPurchaseValidation();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenderData.title.trim()) {
      alert('Please enter a tender title');
      return;
    }

    if ((tenderData.tender_type === 'contract' || tenderData.tender_type === 'spot-purchase') && !tenderData.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    if (tenderData.tender_type === 'spot-purchase' && !spotPurchaseValidation.isValid) {
      alert(spotPurchaseValidation.message);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tenderFormData = {
        ...tenderData,
        estimated_value: totalTenderValue || (tenderData.estimated_value ? parseFloat(tenderData.estimated_value) : null),
        publish_date: tenderData.publish_date || null,
        submission_deadline: tenderData.submission_deadline || null,
        opening_date: tenderData.opening_date || null,
        vendor_id: tenderData.vendor_id || null,
        office_ids: tenderData.office_ids.length > 0 ? tenderData.office_ids.join(',') : null,
        wing_ids: tenderData.wing_ids.length > 0 ? tenderData.wing_ids.join(',') : null,
        dec_ids: tenderData.dec_ids.length > 0 ? tenderData.dec_ids.join(',') : null,
        items: tenderItems.map(item => ({
          ...(item.id && !item.id.startsWith('temp-') ? { id: item.id } : {}),
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price || 0,
          total_amount: item.total_amount || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || '',
          source_required_item_id: item.source_required_item_id || null,
          source_required_item_ids: item.source_required_item_ids || [],
          source_request_id: item.source_request_id || null,
          source_request_number: item.source_request_number || null,
          requested_by_wing_name: item.requested_by_wing_name || null,
          urgency_level: item.urgency_level || null,
          ...(tenderData.tender_type === 'annual-tender'
            ? { vendor_ids: item.vendor_ids || [] }
            : { vendor_id: item.vendor_id || null }
          )
        })),
        // Include bidders data so backend can update successful status
        bidders: bidders
      };

      const response = await fetch(`/api/tenders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenderFormData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(`${tenderData.tender_type === 'spot-purchase' ? 'Petty Purchase' : tenderData.tender_type === 'annual-tender' ? 'Annual tender' : 'Contract tender'} updated successfully!`);
      
      let redirectPath = '/dashboard/contract-tender';
      if (tenderData.tender_type === 'spot-purchase') {
        redirectPath = '/dashboard/spot-purchases';
      } else if (tenderData.tender_type === 'annual-tender') {
        redirectPath = '/dashboard/contract-tender?type=annual-tender';
      }
      navigate(redirectPath);
    } catch (err) {
      console.error('Error updating tender:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tender');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tender data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => {
            let dashboardPath = '/dashboard/contract-tender';
            if (tenderData.tender_type === 'spot-purchase') {
              dashboardPath = '/dashboard/spot-purchases';
            } else if (tenderData.tender_type === 'annual-tender') {
              dashboardPath = '/dashboard/contract-tender?type=annual-tender';
            }
            navigate(dashboardPath);
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenderData.tender_type === 'spot-purchase' ? 'Petty Purchases' : tenderData.tender_type === 'annual-tender' ? 'Annual Tenders' : 'Contract Tenders'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenderData.tender_type === 'spot-purchase' ? 'Edit Petty Purchase' : tenderData.tender_type === 'annual-tender' ? 'Edit Annual Tender' : 'Edit Contract'}
            </h1>
            <p className="text-muted-foreground">
              {tenderData.tender_type === 'spot-purchase' 
                ? 'Update Petty Purchase details for quick procurement'
                : 'Update contract tender details and modify items for procurement'
              }
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tender Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tender Type *</label>
                  <Select 
                    value={tenderData.tender_type} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      tender_type: value
                    }))}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tender type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">Contract Tender</SelectItem>
                      <SelectItem value="spot-purchase">Petty Purchase</SelectItem>
                      <SelectItem value="annual-tender">Annual Tender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {tenderData.tender_type !== 'spot-purchase' && (
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={tenderData.status} 
                      onValueChange={(value) => setTenderData(prev => ({
                        ...prev,
                        status: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Tender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {tenderData.tender_type === 'spot-purchase' ? 'Petty Purchase Information' : 'Tender Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reference Number</label>
                <Input
                  value={tenderData.reference_number}
                  onChange={(e) => setTenderData(prev => ({
                    ...prev,
                    reference_number: e.target.value
                  }))}
                  placeholder="Enter reference number"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  required
                  value={tenderData.title}
                  onChange={(e) => setTenderData(prev => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  placeholder={tenderData.tender_type === 'spot-purchase' ? 'Enter Petty Purchase title' : 'Enter tender title'}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full p-3 border border-input rounded-md resize-none"
                  rows={4}
                  value={tenderData.description}
                  onChange={(e) => setTenderData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder={tenderData.tender_type === 'spot-purchase' ? 'Enter Petty Purchase description' : 'Enter tender description'}
                />
              </div>

              {tenderData.tender_type !== 'spot-purchase' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Publish Date</label>
                    <Input
                      type="date"
                      value={tenderData.publish_date}
                      onChange={(e) => {
                        const newPublishDate = e.target.value;
                        setTenderData(prev => {
                          // For annual tenders, auto-set submission deadline 15 days ahead
                          if (tenderData.tender_type === 'annual-tender' && newPublishDate) {
                            const publishDate = new Date(newPublishDate);
                            publishDate.setDate(publishDate.getDate() + 15);
                            const submissionDate = publishDate.toISOString().split('T')[0];
                            return {
                              ...prev,
                              publish_date: newPublishDate,
                              submission_deadline: submissionDate
                            };
                          }
                          return {
                            ...prev,
                            publish_date: newPublishDate
                          };
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Submission Deadline</label>
                    <Input
                      type="date"
                      value={tenderData.submission_deadline}
                      onChange={(e) => setTenderData(prev => ({
                        ...prev,
                        submission_deadline: e.target.value
                      }))}
                    />
                    {tenderData.tender_type === 'annual-tender' && (
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculated as 15 days after publish date (editable)</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Opening Date</label>
                    <Input
                      type="date"
                      value={tenderData.opening_date}
                      onChange={(e) => setTenderData(prev => ({
                        ...prev,
                        opening_date: e.target.value
                      }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Selection - Only for Contract Tenders */}
          {tenderData.tender_type !== 'spot-purchase' && tenderData.tender_type !== 'annual-tender' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Tender Request Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Offices *</label>
                  <MultiSelect
                    options={offices.map(office => ({
                      label: `${office.strOfficeName}${office.OfficeCode ? ` (${office.OfficeCode})` : ''}`,
                      value: office.intOfficeID.toString()
                    }))}
                    onValueChange={(values) => setTenderData(prev => ({
                      ...prev,
                      office_ids: values
                    }))}
                    defaultValue={tenderData.office_ids}
                    placeholder="Select offices first"
                    variant="inverted"
                    animation={2}
                    maxCount={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select offices to load their wings
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Wings</label>
                  <MultiSelect
                    options={filteredWings.map(wing => ({
                      label: `${wing.Name}${wing.ShortName ? ` (${wing.ShortName})` : ''}`,
                      value: wing.Id.toString()
                    }))}
                    onValueChange={(values) => setTenderData(prev => ({
                      ...prev,
                      wing_ids: values
                    }))}
                    defaultValue={tenderData.wing_ids}
                    placeholder={tenderData.office_ids.length === 0 ? "Select offices first" : "Select wings"}
                    variant="inverted"
                    animation={2}
                    maxCount={3}
                    disabled={tenderData.office_ids.length === 0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredWings.length} wings available
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">DECs</label>
                  <MultiSelect
                    options={filteredDecs.map(dec => ({
                      label: `${dec.DECName.trim()}${dec.DECAcronym ? ` (${dec.DECAcronym})` : ''}`,
                      value: dec.intAutoID.toString()
                    }))}
                    onValueChange={(values) => setTenderData(prev => ({
                      ...prev,
                      dec_ids: values
                    }))}
                    defaultValue={tenderData.dec_ids}
                    placeholder={tenderData.wing_ids.length === 0 ? "Select wings first" : "Select DECs"}
                    variant="inverted"
                    animation={2}
                    maxCount={3}
                    disabled={tenderData.wing_ids.length === 0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredDecs.length} DECs available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Additional Tender Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tenderData.tender_type !== 'spot-purchase' && (
                  <div>
                    <label className="text-sm font-medium">Publication Daily</label>
                    <Input
                      value={tenderData.publication_daily}
                      onChange={(e) => setTenderData(prev => ({
                        ...prev,
                        publication_daily: e.target.value
                      }))}
                      placeholder="Enter publication daily"
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Procurement Methods</label>
                  <Select 
                    value={tenderData.procurement_method} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      procurement_method: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select procurement method" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenderData.tender_type === 'spot-purchase' ? (
                        <>
                          <SelectItem value="single_quotation">Single Quotation</SelectItem>
                          <SelectItem value="multiple_quotation">Multiple Quotation</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="open_bidding">Open Bidding</SelectItem>
                          <SelectItem value="limited_bidding">Limited Bidding</SelectItem>
                          <SelectItem value="direct_contracting">Direct Contracting</SelectItem>
                          <SelectItem value="framework_agreement">Framework Agreement</SelectItem>
                          <SelectItem value="request_for_quotation">Request for Quotation</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {tenderData.tender_type !== 'spot-purchase' && (
                  <div>
                    <label className="text-sm font-medium">Procedure Adopted</label>
                    <Select 
                      value={tenderData.procedure_adopted} 
                      onValueChange={(value) => setTenderData(prev => ({
                        ...prev,
                        procedure_adopted: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select procedure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_stage">Single Stage</SelectItem>
                        <SelectItem value="two_stage">Two Stage</SelectItem>
                        <SelectItem value="pre_qualification">Pre-qualification</SelectItem>
                        <SelectItem value="expression_of_interest">Expression of Interest</SelectItem>
                        <SelectItem value="request_for_proposal">Request for Proposal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Participating Bidders Section */}
          <TenderVendorManagement
            tenderId={id}
            vendors={vendors}
            initialBidders={bidders}
            tenderItems={tenderItems}
            onVendorsChange={(updatedVendors) => {
              setBidders(updatedVendors);
            }}
            onSuccessfulVendorChange={(vendorId) => {
              setTenderData(prev => ({
                ...prev,
                vendor_id: vendorId || ''
              }));
            }}
            onItemsChange={(updatedItems) => {
              setTenderItems(groupTenderItems(updatedItems, tenderData.tender_type));
            }}
            maxVendors={tenderData.tender_type === 'spot-purchase' && tenderData.procurement_method === 'single_quotation' ? 1 : tenderData.tender_type === 'spot-purchase' && tenderData.procurement_method === 'multiple_quotation' ? 3 : undefined}
            minVendors={tenderData.tender_type === 'spot-purchase' && tenderData.procurement_method === 'multiple_quotation' ? 3 : undefined}
            procurementMethod={tenderData.tender_type === 'spot-purchase' ? tenderData.procurement_method : undefined}
          />

          {/* Tender Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {tenderData.tender_type === 'spot-purchase' ? 'Petty Purchase Items' : 'Tender Items'} ({tenderItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSV Upload Button - Annual Tender Only */}
              {tenderData.tender_type === 'annual-tender' && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCsvModal(true)}
                    disabled={bidders.filter(v => v.is_successful).length === 0}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Bulk Import from CSV
                  </Button>
                  {bidders.filter(v => v.is_successful).length === 0 && (
                    <p className="text-sm text-amber-600 ml-3">⚠️ Add vendors first</p>
                  )}
                </div>
              )}

              {/* Add New Item Form */}
              <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-4">Add New Item</h3>
                
                {/* Annual Tender Layout */}
                {tenderData.tender_type === 'annual-tender' ? (
                  <>
                    {/* First Row - Vendor, Category, Name of Article */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Vendor Select */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Vendor *</label>
                        <Select 
                          value={Array.isArray(newItem.vendor_ids) && newItem.vendor_ids.length > 0 ? newItem.vendor_ids[0] : ''}
                          onValueChange={(selectedVendorId) => {
                            setNewItem(prev => ({
                              ...prev,
                              vendor_ids: [selectedVendorId]
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select vendor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bidders.length > 0 ? (
                              bidders.map(vendor => (
                                <SelectItem key={vendor.vendor_id} value={vendor.vendor_id}>
                                  {vendor.vendor_name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-gray-500">No vendors available. Add vendors in the Bidders section first.</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category/Group Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Category/Group *</label>
                        <SearchableSelect
                          options={Array.from(new Map(itemMasters
                            .filter(item => item.category_name)
                            .map(item => [item.category_name, {
                              category_name: item.category_name,
                              category_description: item.category_description
                            }])).values())
                            .sort((a, b) => (a.category_description || '').localeCompare(b.category_description || ''))
                            .map(cat => ({
                              value: cat.category_name,
                              label: cat.category_description ? `${cat.category_description} - ${cat.category_name}` : cat.category_name
                            }))}
                          value={selectedCategory}
                          onValueChange={(value) => {
                            setSelectedCategory(value);
                            setNewItem(prev => ({
                              ...prev,
                              item_master_id: ''
                            }));
                          }}
                          placeholder="Select category"
                          searchPlaceholder="Search categories..."
                          emptyMessage="No categories found"
                        />
                      </div>

                      {/* Name of the Article Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Name of the Article *</label>
                        <SearchableSelect
                          options={itemMasters
                            .filter(item => item.category_name === selectedCategory)
                            .map(item => ({
                              value: item.id,
                              label: item.nomenclature
                            }))}
                          value={newItem.item_master_id}
                          onValueChange={handleItemMasterSelect}
                          disabled={!selectedCategory}
                          placeholder={selectedCategory ? "Select item" : "Select category first"}
                          searchPlaceholder="Search items..."
                          emptyMessage="No items found"
                        />
                      </div>
                    </div>

                    {/* Second Row - Unit Price, Specifications, Remarks */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Unit Price */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Unit Price</label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.01"
                          value={newItem.estimated_unit_price || ''}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            estimated_unit_price: parseFloat(e.target.value) || 0
                          }))}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Specifications */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Specifications</label>
                        <Input
                          className="h-9"
                          value={newItem.specifications || ''}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            specifications: e.target.value
                          }))}
                          placeholder="Technical specifications"
                        />
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Remarks</label>
                        <Input
                          className="h-9"
                          value={newItem.remarks || ''}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            remarks: e.target.value
                          }))}
                          placeholder="Additional remarks"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Normal/Spot Tender Layout */}
                    {/* Category and Item Select - First Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Category/Group Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Category/Group *</label>
                        <SearchableSelect
                          options={Array.from(new Map(itemMasters
                            .filter(item => item.category_name)
                            .map(item => [item.category_name, {
                              category_name: item.category_name,
                              category_description: item.category_description
                            }])).values())
                            .sort((a, b) => (a.category_description || '').localeCompare(b.category_description || ''))
                            .map(cat => ({
                              value: cat.category_name,
                              label: cat.category_description ? `${cat.category_description} - ${cat.category_name}` : cat.category_name
                            }))}
                          value={selectedCategory}
                          onValueChange={(value) => {
                            setSelectedCategory(value);
                            setNewItem(prev => ({
                              ...prev,
                              item_master_id: ''
                            }));
                          }}
                          placeholder="Select category"
                          searchPlaceholder="Search categories..."
                          emptyMessage="No categories found"
                        />
                      </div>

                      {/* Name of the Article Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Name of the Article *</label>
                        <SearchableSelect
                          options={itemMasters
                            .filter(item => item.category_name === selectedCategory)
                            .map(item => ({
                              value: item.id,
                              label: item.nomenclature
                            }))}
                          value={newItem.item_master_id}
                          onValueChange={handleItemMasterSelect}
                          disabled={!selectedCategory}
                          placeholder={selectedCategory ? "Select item" : "Select category first"}
                          searchPlaceholder="Search items..."
                          emptyMessage="No items found"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Quantity *</label>
                        <Input
                          className="h-9"
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            quantity: parseInt(e.target.value) || 1
                          }))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {/* Second Row - Unit Price, Total */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Unit Price */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Unit Price</label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.01"
                          value={newItem.estimated_unit_price || ''}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            estimated_unit_price: parseFloat(e.target.value) || 0
                          }))}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Total */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Total</label>
                        <Input
                          className="h-9 bg-gray-100"
                          value={formatCurrency(newItem.total_amount || 0)}
                          disabled
                        />
                      </div>
                    </div>

                    {/* Text areas for longer content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Specifications</label>
                        <textarea
                          className="w-full p-2 border border-input rounded-md resize-none text-sm"
                          rows={2}
                          value={newItem.specifications || ''}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            specifications: e.target.value
                          }))}
                          placeholder="Technical specifications"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium mb-1 block">Remarks</label>
                        <textarea
                          className="w-full p-2 border border-input rounded-md resize-none text-sm"
                          rows={2}
                          value={newItem.remarks || ''}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            remarks: e.target.value
                          }))}
                          placeholder="Additional remarks"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Add Button at the bottom */}
                <Button type="button" onClick={handleAddItem} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {/* Pick from Required Items Pipeline */}
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Add from Required Items Pipeline</p>
                    <p className="text-xs text-emerald-700">
                      Pick items that are out-of-stock and pending procurement
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    onClick={handleOpenRequiredItemsModal}
                  >
                    <PackagePlus className="h-4 w-4 mr-1" />
                    Pick Items
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              {tenderItems.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      {tenderData.tender_type === 'spot-purchase' ? 'Petty Purchase Items List' : tenderData.tender_type === 'annual-tender' ? 'Annual Tender Items List' : 'Tender Items List'}
                    </h3>
                    {selectedItemIds.size > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Selected ({selectedItemIds.size})
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={tenderItems.length > 0 && selectedItemIds.size === tenderItems.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                          </TableHead>
                          {tenderData.tender_type === 'annual-tender' ? (
                            <>
                              <TableHead>Category</TableHead>
                              <TableHead>Name of the Article</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Vendor</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Actions</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>Item</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Specifications</TableHead>
                              <TableHead>Actions</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(tenderData.tender_type === 'annual-tender' 
                          ? [...tenderItems].sort((a, b) => {
                              const categoryA = a.category_description && a.category_name 
                                ? `${a.category_description} - ${a.category_name}`
                                : a.category_name || '';
                              const categoryB = b.category_description && b.category_name 
                                ? `${b.category_description} - ${b.category_name}`
                                : b.category_name || '';
                              return categoryA.localeCompare(categoryB);
                            })
                          : tenderItems
                        ).map((item, index) => (
                          <TableRow key={item.id || index} className={selectedItemIds.has(item.id || '') ? 'bg-blue-50' : ''}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedItemIds.has(item.id || '')}
                                onChange={(e) => handleSelectItem(item.id || '', e.target.checked)}
                              />
                            </TableCell>
                            {tenderData.tender_type === 'annual-tender' ? (
                              <>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {item.category_description && item.category_name 
                                        ? `${item.category_description} - ${item.category_name}`
                                        : item.category_name || 'N/A'
                                      }
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="font-medium">{item.nomenclature}</p>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 w-24 text-xs"
                                    value={item.quantity || ''}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 0;
                                      setTenderItems(prev => {
                                        const next = [...prev];
                                        const idx = next.findIndex(i => i.id === item.id);
                                        if (idx >= 0) {
                                          next[idx] = {
                                            ...next[idx],
                                            quantity: qty,
                                            total_amount: qty * (next[idx].estimated_unit_price || 0)
                                          };
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {item.vendor_ids ? (
                                    <div className="flex flex-wrap gap-1">
                                      {(() => {
                                        // Handle both string and array formats
                                        const vendorIds = Array.isArray(item.vendor_ids) 
                                          ? item.vendor_ids 
                                          : String(item.vendor_ids).split(',').map(id => id.trim()).filter(id => id);
                                        
                                        return vendorIds.length > 0 ? (
                                          vendorIds.map(vendorId => {
                                            // For annual tenders: lookup from bidders list, otherwise from vendors list
                                            const vendor = tenderData.tender_type === 'annual-tender'
                                              ? bidders.find(b => b.vendor_id === vendorId)
                                              : vendors.find(v => v.id === vendorId);
                                            return (
                                              <span key={vendorId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {vendor?.vendor_name || vendor?.vendor_code || vendorId}
                                              </span>
                                            );
                                          })
                                        ) : (
                                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendors</span>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendors</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-8 w-28 text-xs"
                                    value={item.estimated_unit_price || ''}
                                    onChange={(e) => {
                                      const price = parseFloat(e.target.value) || 0;
                                      setTenderItems(prev => {
                                        const next = [...prev];
                                        const idx = next.findIndex(i => i.id === item.id);
                                        if (idx >= 0) {
                                          next[idx] = {
                                            ...next[idx],
                                            estimated_unit_price: price,
                                            total_amount: price * next[idx].quantity
                                          };
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(item.total_amount ?? ((item.quantity || 1) * (item.estimated_unit_price || 0)))}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{item.nomenclature}</p>
                                    <p className="text-xs text-gray-500">ID: {item.item_master_id}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 w-24 text-xs"
                                    value={item.quantity || ''}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 0;
                                      setTenderItems(prev => {
                                        const next = [...prev];
                                        const idx = next.findIndex(i => i.id === item.id);
                                        if (idx >= 0) {
                                          next[idx] = {
                                            ...next[idx],
                                            quantity: qty,
                                            total_amount: qty * (next[idx].estimated_unit_price || 0)
                                          };
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-8 w-28 text-xs"
                                    value={item.estimated_unit_price || ''}
                                    onChange={(e) => {
                                      const price = parseFloat(e.target.value) || 0;
                                      setTenderItems(prev => {
                                        const next = [...prev];
                                        const idx = next.findIndex(i => i.id === item.id);
                                        if (idx >= 0) {
                                          next[idx] = {
                                            ...next[idx],
                                            estimated_unit_price: price,
                                            total_amount: price * next[idx].quantity
                                          };
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(item.total_amount || 0)}
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    {item.specifications && (
                                      <p className="text-xs truncate" title={item.specifications}>
                                        {item.specifications}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    {tenderData.tender_type === 'annual-tender' ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-lg font-bold">{tenderItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Value</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(totalTenderValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Price</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(
                              tenderItems.length > 0 
                                ? totalTenderValue / tenderItems.length
                                : 0
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-lg font-bold">{tenderItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Quantity</p>
                          <p className="text-lg font-bold">
                            {tenderItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Value</p>
                          <p className={`text-lg font-bold ${!spotPurchaseValidation.isValid ? 'text-red-600' : ''}`}>
                            {formatCurrency(totalTenderValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Unit Price</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(
                              tenderItems.length > 0 
                                ? totalTenderValue / tenderItems.reduce((sum, item) => sum + item.quantity, 0)
                                : 0
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {tenderData.tender_type === 'spot-purchase' && !spotPurchaseValidation.isValid && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription className="font-medium">
                          {spotPurchaseValidation.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {tenderData.tender_type === 'spot-purchase' && tenderData.procurement_method && spotPurchaseValidation.isValid && (
                      <Alert className="mt-4 bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          {tenderData.procurement_method === 'single_quotation' 
                            ? `✓ Single Quotation: Amount within limit (Max: PKR 100,000)`
                            : `✓ Multiple Quotation: Amount within limit (Min: PKR 100,001, Max: PKR 500,000)`
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Ready to update tender with {tenderItems.length} items
                  </p>
                  <p className="text-lg font-semibold">
                    Total Value: {formatCurrency(totalTenderValue)}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      let dashboardPath = '/dashboard/contract-tender';
                      if (tenderData.tender_type === 'spot-purchase') {
                        dashboardPath = '/dashboard/spot-purchases';
                      } else if (tenderData.tender_type === 'annual-tender') {
                        dashboardPath = '/dashboard/contract-tender?type=annual-tender';
                      }
                      navigate(dashboardPath);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !tenderData.title}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Updating...' : `Update ${tenderData.tender_type === 'spot-purchase' ? 'Petty Purchase' : 'Contract'}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onItemsImported={handleCsvItemsImport}
        bidders={bidders}
      />

      {/* Required Items Picker Modal */}
      {showRequiredItemsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Pick Required Items</h3>
                <p className="text-sm text-muted-foreground">Select pending out-of-stock items to add to this tender</p>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowRequiredItemsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search items, requests, or wings..."
                  className="pl-8"
                  value={requiredItemsSearch}
                  onChange={(e) => setRequiredItemsSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-auto flex-1 p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={filteredRequiredItems.length > 0 && selectedRequiredItemIds.size === filteredRequiredItems.length}
                        onChange={(e) => handleSelectAllRequiredItems(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead>Nomenclature</TableHead>
                    <TableHead>Qty Needed</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Source Request</TableHead>
                    <TableHead>Requested By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequiredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pending required items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequiredItems.map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedRequiredItemIds.has(item.id)}
                            onChange={(e) => handleToggleRequiredItem(item.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.nomenclature}</div>
                          {item.category_name && <div className="text-xs text-muted-foreground">{item.category_name}</div>}
                        </TableCell>
                        <TableCell>{item.quantity_needed} {item.unit || 'units'}</TableCell>
                        <TableCell>{item.urgency_level}</TableCell>
                        <TableCell>
                          {item.source_request_number ? (
                            <a
                              href={`/dashboard/request-details/${item.source_request_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                            >
                              {item.source_request_number}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {item.source_request_number ? (
                            <a
                              href={`/dashboard/request-details/${item.source_request_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View Request
                            </a>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{selectedRequiredItemIds.size} item(s) selected</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRequiredItemsModal(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddSelectedRequiredItems} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Add Selected to Tender
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTender;

