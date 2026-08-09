import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import AddCategoryModal from '@/components/tender/AddCategoryModal';
import AddItemModal from '@/components/tender/AddItemModal';

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
  category_name?: string;
  category_description?: string;
  source_required_item_id?: string;
  source_required_item_ids?: string[];
  source_request_id?: string;
  source_request_number?: string;
  requested_by_wing_name?: string;
  urgency_level?: string;
  unit?: string;
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
}

interface ItemMaster {
  id: string;
  nomenclature: string;
  category_name?: string;
  category_description?: string;
  sub_category_name?: string;
}

interface Category {
  id: string;
  category_name: string;
  description?: string;
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

const CreateTender: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine tender type from referrer or URL params
  const getTenderType = () => {
    const searchParams = new URLSearchParams(location.search);
    const typeParam = searchParams.get('type');
    if (typeParam) return typeParam;
    
    // Check referrer URL
    const referrer = document.referrer;
    if (referrer.includes('spot-purchases')) return 'spot-purchase';
    if (referrer.includes('type=annual-tender')) return 'annual-tender';
    if (referrer.includes('contract-tender')) return 'contract';
    
    return 'contract'; // default
  };
  
  const tenderType = getTenderType();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    tender_type: tenderType,
    status: tenderType === 'spot-purchase' ? 'published' : 'draft',
    vendor_id: '',
    office_ids: [] as string[],
    wing_ids: [] as string[],
    dec_ids: [] as string[],
    // Additional fields
    publication_dailies: '',
    procurement_methods: '',
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
    evaluation_report_file: null as File | null,
    tender_docs_file: null as File | null,
    contract_awarded_letter_file: null as File | null,
    noting_file: null as File | null
  });

  // Tender items
  const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [bidders, setBidders] = useState<any[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [showRequiredItemsModal, setShowRequiredItemsModal] = useState<boolean>(false);
  const [requiredItemOptions, setRequiredItemOptions] = useState<RequiredItemOption[]>([]);
  const [selectedRequiredItemIds, setSelectedRequiredItemIds] = useState<Set<string>>(new Set());
  const [requiredItemsSearch, setRequiredItemsSearch] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [sourceRequiredItemIds, setSourceRequiredItemIds] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<TenderItem>({
    item_master_id: '',
    nomenclature: '',
    quantity: 1,
    estimated_unit_price: 0,
    specifications: '',
    remarks: '',
    vendor_id: ''
  });

  // For annual tenders, auto-select the vendor when only one bidder is checked.
  useEffect(() => {
    if (tenderType !== 'annual-tender') return;
    const checkedBidders = bidders.filter(b => b.is_successful);
    if (checkedBidders.length === 1 && !newItem.vendor_id) {
      setNewItem(prev => ({ ...prev, vendor_id: checkedBidders[0].vendor_id }));
    }
  }, [bidders, tenderType, newItem.vendor_id]);

  // Fetch initial data (item masters, offices, and vendors)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Item Masters
        const itemMastersResponse = await fetch('http://localhost:3001/api/item-masters');
        if (itemMastersResponse.ok) {
          const itemMastersData = await itemMastersResponse.json();
          // Handle the {success: true, items: [...]} format
          setItemMasters(itemMastersData.items || []);
        }

        // Fetch Categories/Groups separately so groups with no currently linked item masters still appear
        const categoriesResponse = await fetch('http://localhost:3001/api/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }

        // Fetch Offices
        const officesResponse = await fetch('http://localhost:3001/api/offices');
        if (officesResponse.ok) {
          const officesData = await officesResponse.json();
          setOffices(Array.isArray(officesData) ? officesData : []);
        }

        // Fetch Vendors
        const vendorsResponse = await fetch('http://localhost:3001/api/vendors');
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json();
          // Handle the {vendors: [...]} format
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

    // Load pre-filled items from required items pipeline if present
    try {
      const prefilledStr = sessionStorage.getItem('prefilled_tender_items');
      if (prefilledStr) {
        const items = JSON.parse(prefilledStr);
        if (Array.isArray(items) && items.length > 0) {
          const mappedItems = items.map((item: any, index: number) => ({
            id: `prefilled-${Date.now()}-${index}`,
            item_master_id: item.item_master_id,
            nomenclature: item.nomenclature,
            quantity: item.quantity,
            estimated_unit_price: 0,
            total_amount: 0,
            specifications: '',
            remarks: item.remarks || 'Imported from Out-of-Stock Pipeline',
            source_required_item_id: item.source_required_item_id,
            source_required_item_ids: item.source_required_item_ids,
            source_request_id: item.source_request_id,
            source_request_number: item.source_request_number,
            requested_by_wing_name: item.requested_by_wing_name,
            urgency_level: item.urgency_level,
            vendor_id: ''
          }));
          setTenderItems(mappedItems);
          sessionStorage.removeItem('prefilled_tender_items');
        }
      }

      const prefilledSourceIds = sessionStorage.getItem('prefilled_tender_source_required_item_ids');
      if (prefilledSourceIds) {
        const parsedIds = JSON.parse(prefilledSourceIds);
        if (Array.isArray(parsedIds)) {
          setSourceRequiredItemIds(parsedIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0));
        }
        sessionStorage.removeItem('prefilled_tender_source_required_item_ids');
      }

      // Fetch pending required items for the picker modal
      fetchPendingRequiredItems();
    } catch (e) {
      console.error('Failed to parse prefilled tender items:', e);
    }
  }, []);

  const fetchPendingRequiredItems = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/required-items?status=Pending&limit=500');
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

    // Group selected required items by item_master_id or nomenclature
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

    const newTenderItems: TenderItem[] = Array.from(grouped.values()).map(({ item, sourceIds, totalQty, sourceRequests }) => {
      // Annual tender is a rate contract: items carry only price, no quantity.
      const isAnnual = tenderType === 'annual-tender';
      const qty = isAnnual ? 1 : totalQty;
      return {
        id: `req-${item.item_master_id || item.id}`,
        item_master_id: item.item_master_id || '',
        nomenclature: item.nomenclature,
        quantity: qty,
        unit: item.unit || '',
        estimated_unit_price: 0,
        total_amount: 0,
        specifications: '',
        remarks: `Imported from required items pipeline | Requests: ${sourceRequests.join(', ') || 'N/A'}`,
        source_required_item_ids: sourceIds,
        source_request_number: sourceRequests.join(', '),
        requested_by_wing_name: item.requested_by_wing_name || '',
        urgency_level: item.urgency_level,
        vendor_id: ''
      };
    });

    setTenderItems(prev => {
      // Merge with existing items by same item_master_id/nomenclature
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
            quantity: tenderType === 'annual-tender' ? 1 : existing.quantity + newItem.quantity,
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
      return merged;
    });

    const newSourceIds = selected.map(i => i.id);
    setSourceRequiredItemIds(prev => Array.from(new Set([...prev, ...newSourceIds])));

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

  // Helper function to refresh item masters
  const fetchItemMasters = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/item-masters');
      if (response.ok) {
        const data = await response.json();
        setItemMasters(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching item masters:', err);
    }
  };

  // Helper function to refresh vendors
  const fetchVendors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendors');
      if (response.ok) {
        const data = await response.json();
        if (data.vendors && Array.isArray(data.vendors)) {
          setVendors(data.vendors);
        } else if (Array.isArray(data)) {
          setVendors(data);
        }
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };

  // Fetch wings when offices are selected
  useEffect(() => {
    const fetchWingsForOffices = async () => {
      if (tenderData.office_ids.length === 0) {
        setFilteredWings([]);
        setFilteredDecs([]);
        setTenderData(prev => ({ ...prev, wing_ids: [], dec_ids: [] }));
        return;
      }

      try {
        const allWings: Wing[] = [];
        
        for (const officeId of tenderData.office_ids) {
          const response = await fetch(`http://localhost:3001/api/offices/${officeId}/wings`);
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
            dec_ids: [] // Clear decs when wings change
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
          const response = await fetch(`http://localhost:3001/api/wings/${wingId}/decs`);
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
    if (!newItem.item_master_id || !newItem.nomenclature) {
      alert('Please fill in all required item fields');
      return;
    }

    // For non-annual tenders, quantity is required and must be > 0.
    if (tenderType !== 'annual-tender' && (newItem.quantity === undefined || newItem.quantity <= 0)) {
      alert('Please enter a valid quantity');
      return;
    }

    // Validate vendor selection based on tender type
    if (tenderType === 'annual-tender') {
      // Annual tender requires vendor_id for each item
      if (!newItem.vendor_id) {
        alert('Please select a vendor for this item');
        return;
      }
    } else if (tenderType === 'contract' || tenderType === 'spot-purchase') {
      // Contract tender and Petty Purchase require one successful bidder
      const successfulBidder = bidders.find(b => b.is_successful);
      if (!successfulBidder) {
        alert('Please select a successful bidder/vendor in the "Participating Bidders" section first');
        return;
      }
      // Auto-assign the successful bidder to this item
      newItem.vendor_id = successfulBidder.vendor_id;
    }

    const item: TenderItem = {
      ...newItem,
      id: `temp-${Date.now()}` // Temporary ID for frontend
    };

    setTenderItems(prev => [...prev, item]);
    setNewItem({
      item_master_id: '',
      nomenclature: '',
      quantity: 1,
      estimated_unit_price: 0,
      specifications: '',
      remarks: '',
      vendor_id: ''  // Reset vendor selection
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
      vendor_id: item.vendor_id || '',
      category_name: item.category_name || '',
      category_description: item.category_description || ''
    }));

    setTenderItems(prev => [...prev, ...newItems]);
    alert(`Successfully imported ${newItems.length} items from CSV`);
  };

  // Calculate total tender value
  const totalTenderValue = tenderItems.reduce((sum, item) => {
    if (tenderType === 'annual-tender') {
      // For annual tenders, sum the unit prices (each represents value for that vendor)
      return sum + (item.estimated_unit_price || 0);
    } else {
      // For contract/spot-purchase, sum the total amounts (quantity * unit price)
      return sum + (item.total_amount || 0);
    }
  }, 0);

  // Format currency - Must be defined before validation functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  // Petty Purchase Amount Validation
  const getSpotPurchaseValidation = () => {
    if (tenderType !== 'spot-purchase') return { isValid: true, message: '' };
    
    const procurementMethod = tenderData.procurement_methods;
    
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

    // Vendor validation based on tender type
    if (tenderType === 'contract') {
      // Contract tender: Check for successful bidder selection
      const successfulBidder = bidders.find(b => b.is_successful);
      if (!successfulBidder) {
        alert('Please select a successful bidder in the "Participating Bidders" section');
        return;
      }
      // Set the vendor_id from successful bidder for backend
      tenderData.vendor_id = successfulBidder.vendor_id;
    } else if (tenderType === 'spot-purchase') {
      // Petty Purchase: Check for selected vendor
      const selectedVendor = bidders.find(b => b.is_successful);
      if (!selectedVendor) {
        alert('Please select a vendor in the "Participating Bidders" section');
        return;
      }
      // Set the vendor_id from selected vendor for backend
      tenderData.vendor_id = selectedVendor.vendor_id;
    }
    // Annual tender: No global vendor_id needed (vendors assigned per item)

    // Validate Petty Purchase amounts
    if (tenderType === 'spot-purchase' && !spotPurchaseValidation.isValid) {
      alert(spotPurchaseValidation.message);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add tender data
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
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price || 0,
          total_amount: item.total_amount || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || '',
          // Send single vendor_id for all tender types
          vendor_id: item.vendor_id || null,
          source_required_item_id: item.source_required_item_id || null,
          source_required_item_ids: item.source_required_item_ids || null
        }))
      };

      // Log each item's vendor info specifically
      tenderFormData.items.forEach((item, idx) => {
        });

      // Add tender data as JSON string
      formData.append('tenderData', JSON.stringify(tenderFormData));

      // Add file uploads
      if (fileUploads.contract_file) {
        formData.append('contract_file', fileUploads.contract_file);
      }
      if (fileUploads.loi_file) {
        formData.append('loi_file', fileUploads.loi_file);
      }
      if (fileUploads.po_file) {
        formData.append('po_file', fileUploads.po_file);
      }
      if (fileUploads.rfp_file) {
        formData.append('rfp_file', fileUploads.rfp_file);
      }

      const response = await fetch('http://localhost:3001/api/tenders', {
        method: 'POST',
        body: formData, // Remove Content-Type header to let browser set it for FormData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const newTenderId = result.tenderId;

      if (newTenderId && sourceRequiredItemIds.length > 0) {
        try {
          const attachResponse = await fetch('http://localhost:3001/api/required-items/attach-tender', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item_ids: sourceRequiredItemIds,
              tender_id: newTenderId,
              tender_type: tenderType,
              tender_reference: tenderData.reference_number || tenderData.title
            })
          });

          if (!attachResponse.ok) {
            const attachError = await attachResponse.json().catch(() => ({}));
            }
        } catch (attachErr) {
          }
      }
      
      // Save bidders to the newly created tender
      if (bidders.length > 0 && newTenderId) {
        for (const bidder of bidders) {
          try {
            const bidderResponse = await fetch(`http://localhost:3001/api/tenders/${newTenderId}/vendors`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vendor_id: bidder.vendor_id,
                vendor_name: bidder.vendor_name,
                quoted_amount: bidder.quoted_amount || null,
                remarks: bidder.remarks || null,
                is_selected: bidder.is_selected || 0,
                is_successful: bidder.is_successful || 0
              })
            });
            
            if (!bidderResponse.ok) {
              console.error('⚠️ Failed to save bidder:', bidder.vendor_name);
            } else {
              }
          } catch (bidderErr) {
            console.error('❌ Error saving bidder:', bidderErr);
          }
        }
      }
      
      const successMessage = tenderType === 'spot-purchase' ? 'Petty Purchase' : tenderType === 'annual-tender' ? 'Annual tender' : 'Contract tender';
      alert(`${successMessage} created successfully!`);
      
      let redirectPath = '/dashboard/contract-tender';
      if (tenderType === 'spot-purchase') {
        redirectPath = '/dashboard/spot-purchases';
      } else if (tenderType === 'annual-tender') {
        redirectPath = '/dashboard/contract-tender?type=annual-tender';
      }
      navigate(redirectPath);
    } catch (err) {
      console.error('Error creating tender:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories
    .filter(category => category.category_name)
    .sort((a, b) => (a.description || '').localeCompare(b.description || ''))
    .map(category => ({
      value: category.category_name,
      label: category.description ? `${category.description} - ${category.category_name}` : category.category_name
    }));

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => {
            let dashboardPath = '/dashboard/contract-tender';
            if (tenderType === 'spot-purchase') {
              dashboardPath = '/dashboard/spot-purchases';
            } else if (tenderType === 'annual-tender') {
              dashboardPath = '/dashboard/contract-tender?type=annual-tender';
            }
            navigate(dashboardPath);
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenderType === 'spot-purchase' ? 'Petty Purchases' : tenderType === 'annual-tender' ? 'Annual Tenders' : 'Contract Tenders'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenderType === 'spot-purchase' ? 'Create New Petty Purchase' : 'Create New Contract'}
            </h1>
            <p className="text-muted-foreground">
              {tenderType === 'spot-purchase' 
                ? 'Enter Petty Purchase details for quick procurement'
                : 'Enter contract tender details and add items for procurement'
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
                
                {tenderType !== 'spot-purchase' && (
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
                {tenderType === 'spot-purchase' ? 'Petty Purchase Information' : 'Tender Information'}
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
                  placeholder={tenderType === 'spot-purchase' ? 'Enter Petty Purchase title' : 'Enter tender title'}
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
                  placeholder={tenderType === 'spot-purchase' ? 'Enter Petty Purchase description' : 'Enter tender description'}
                />
              </div>

              {/* Hide date fields for Petty Purchase */}
              {tenderType !== 'spot-purchase' && (
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
                          if (tenderType === 'annual-tender' && newPublishDate) {
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
                    {tenderType === 'annual-tender' && (
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

          {/* Location Selection - For Contract Tenders and Petty Purchase */}
          {tenderType !== 'annual-tender' && (
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
                {tenderType !== 'annual-tender' && (
                  <div>
                    <label className="text-sm font-medium">Estimated Value *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tenderData.estimated_value}
                      onChange={(e) => setTenderData(prev => ({
                        ...prev,
                        estimated_value: e.target.value
                      }))}
                      placeholder="Enter estimated value"
                    />
                  </div>
                )}

                {/* Hide publication dailies for Petty Purchase */}
                {tenderType !== 'spot-purchase' && (
                  <div>
                    <label className="text-sm font-medium">Publication Dailies</label>
                    <Input
                      value={tenderData.publication_dailies}
                      onChange={(e) => setTenderData(prev => ({
                        ...prev,
                        publication_dailies: e.target.value
                      }))}
                      placeholder="Enter publication dailies"
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Procurement Methods</label>
                  <Select 
                    value={tenderData.procurement_methods} 
                    onValueChange={(value) => setTenderData(prev => ({
                      ...prev,
                      procurement_methods: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select procurement method" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenderType === 'spot-purchase' ? (
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

                {/* Hide procedure adopted for Petty Purchase */}
                {tenderType !== 'spot-purchase' && (
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

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Document Uploads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contract Tender Documents */}
              {tenderData.tender_type === 'contract' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">RFP</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, rfp_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.rfp_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.rfp_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tender Docs</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, tender_docs_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.tender_docs_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.tender_docs_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">LOI</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, loi_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.loi_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.loi_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Contract Awarded Letter</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, contract_awarded_letter_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.contract_awarded_letter_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.contract_awarded_letter_file.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Petty Purchase Documents */}
              {tenderData.tender_type === 'spot-purchase' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">RFQ (Request for Quotation)</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, rfq_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.rfq_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.rfq_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Quotation Response</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, quotation_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.quotation_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.quotation_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Comparison Sheet</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, comparison_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.comparison_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.comparison_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">PO (Purchase/Supply Order)</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, po_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.po_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.po_file.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Annual Tender Documents */}
              {tenderData.tender_type === 'annual-tender' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">RFP</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, rfp_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.rfp_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.rfp_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tender Docs</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, tender_docs_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.tender_docs_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.tender_docs_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">LOI</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, loi_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.loi_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.loi_file.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Contract Awarded Letter</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileUploads(prev => ({ ...prev, contract_awarded_letter_file: file }));
                      }}
                      className="mt-1"
                    />
                    {fileUploads.schedule_file && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {fileUploads.schedule_file.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Default message when no tender type selected */}
              {!tenderData.tender_type && (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Please select a tender type to see available document upload options</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Accepted formats:</strong> PDF, DOC, DOCX, XLS, XLSX
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Maximum file size: 10MB per file
                </p>
                {tenderData.tender_type === 'contract' && (
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Contract Tender:</strong> RFP, Tender Docs, LOI, Contract Awarded Letter
                  </p>
                )}
                {tenderData.tender_type === 'spot-purchase' && (
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Petty Purchase:</strong> RFQ, Quotation Response, Comparison Sheet, and PO documents
                  </p>
                )}
                {tenderData.tender_type === 'annual-tender' && (
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Annual Tender:</strong> RFP, Tender Docs, LOI, Contract Awarded Letter
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Participating Bidders Section */}
          <TenderVendorManagement
            tenderId={location.state?.tenderId}
            vendors={vendors}
            tenderItems={tenderItems}
            tenderType={tenderType}
            onVendorsChange={(updatedVendors) => {
              // Store the bidders to be saved after tender creation
              setBidders(updatedVendors);
            }}
            onSuccessfulVendorChange={(vendorId) => {
              // When a vendor is marked as successful/selected, set it as the main vendor_id
              setTenderData(prev => ({
                ...prev,
                vendor_id: vendorId || ''
              }));
            }}
            onVendorAdded={() => {
              fetchVendors();
            }}
            maxVendors={tenderType === 'spot-purchase' && tenderData.procurement_methods === 'single_quotation' ? 1 : tenderType === 'spot-purchase' && tenderData.procurement_methods === 'multiple_quotation' ? 3 : undefined}
            minVendors={tenderType === 'spot-purchase' && tenderData.procurement_methods === 'multiple_quotation' ? 3 : undefined}
            procurementMethod={tenderType === 'spot-purchase' ? tenderData.procurement_methods : undefined}
          />

          {/* Tender Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {tenderType === 'spot-purchase' ? 'Petty Purchase Items' : 'Tender Items'} ({tenderItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSV Upload Button - Annual Tender Only */}
              {tenderType === 'annual-tender' && (
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
                
                {/* Contract Tender / Petty Purchase Layout - Successful Bidder Display */}
                {(tenderType === 'contract' || tenderType === 'spot-purchase') && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-blue-900 block mb-1">
                          {tenderType === 'spot-purchase' ? 'Selected Vendor' : 'Successful Bidder'}
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-9 bg-white border-blue-300"
                            value={(() => {
                              const successfulBidder = bidders.find(b => b.is_successful);
                              return successfulBidder ? successfulBidder.vendor_name : `No ${tenderType === 'spot-purchase' ? 'vendor' : 'bidder'} selected yet`;
                            })()}
                            disabled
                            readOnly
                          />
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            🔒 Locked
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {!bidders.find(b => b.is_successful) && (
                      <p className="text-xs text-amber-600 mt-2">⚠️ Please select a {tenderType === 'spot-purchase' ? 'vendor' : 'successful bidder'} first in the "Participating Bidders" section above</p>
                    )}
                  </div>
                )}

                {/* Annual Tender Layout */}
                {tenderType === 'annual-tender' ? (
                  <>
                    {/* First Row - Vendor, Category, Name of Article */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Vendor Select - only the bidders checked in Participating Bidders */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Vendor *</label>
                        <Select 
                          value={newItem.vendor_id || ''}
                          onValueChange={(selectedVendorId) => {
                            setNewItem(prev => ({
                              ...prev,
                              vendor_id: selectedVendorId
                            }));
                          }}
                          disabled={bidders.filter(b => b.is_successful).length === 0}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={bidders.filter(b => b.is_successful).length === 0 ? "Select a bidder first..." : "Select vendor..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {bidders.filter(b => b.is_successful).length > 0 ? (
                              bidders
                                .filter(b => b.is_successful)
                                .map(vendor => (
                                  <SelectItem key={vendor.vendor_id} value={vendor.vendor_id}>
                                    {vendor.vendor_name}
                                  </SelectItem>
                                ))
                            ) : (
                              <div className="p-2 text-xs text-gray-500">No bidder selected</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category/Group Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Category/Group *</label>
                        <div className="flex gap-2">
                          <SearchableSelect
                            options={categoryOptions}
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddCategoryModal(true)}
                            className="h-9 px-3 flex-shrink-0"
                            title="Add new category"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Name of the Article Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Name of the Article *</label>
                        <div className="flex gap-2">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddItemModal(true)}
                            disabled={!selectedCategory}
                            className="h-9 px-3 flex-shrink-0"
                            title="Add new item"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
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
                    {/* Contract Tender / Petty Purchase Layout */}
                    {/* First Row - Category, Name of Article, Qty */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Category/Group Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Category/Group *</label>
                        <div className="flex gap-2">
                          <SearchableSelect
                            options={categoryOptions}
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddCategoryModal(true)}
                            className="h-9 px-3 flex-shrink-0"
                            title="Add new category"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Name of the Article Select with Search */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Name of the Article *</label>
                        <div className="flex gap-2">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddItemModal(true)}
                            disabled={!selectedCategory}
                            className="h-9 px-3 flex-shrink-0"
                            title="Add new item"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Quantity - hidden for annual tenders (price-only rate contract) */}
                      {tenderType !== 'annual-tender' && (
                        <div>
                          <label className="text-xs font-medium mb-1 block">Qty *</label>
                          <Input
                            className="h-9"
                            type="number"
                            min="1"
                            value={newItem.quantity || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              quantity: parseInt(e.target.value) || 0
                            }))}
                            placeholder="Enter quantity"
                          />
                        </div>
                      )}
                    </div>

                    {/* Second Row - Unit Price, Specifications, Remarks */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      {/* Unit Price */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Unit Price *</label>
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
                      {tenderType === 'spot-purchase' ? 'Petty Purchase Items List' : tenderType === 'annual-tender' ? 'Annual Tender Items List' : 'Tender Items List'}
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
                          {tenderType === 'annual-tender' ? (
                            <>
                              <TableHead>Category</TableHead>
                              <TableHead>Name of the Article</TableHead>
                              <TableHead>Vendor</TableHead>
                              <TableHead>Unit Price</TableHead>
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
                        {(tenderType === 'annual-tender' 
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
                            {tenderType === 'annual-tender' ? (
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
                                  {item.vendor_id ? (
                                    <div>
                                      {(() => {
                                        const vendor = vendors.find(v => v.id === item.vendor_id);
                                        return (
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {vendor?.vendor_name || item.vendor_id}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendor</span>
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
                                            // Annual tender is price-only; total equals unit price.
                                            total_amount: price
                                          };
                                        }
                                        return next;
                                      });
                                    }}
                                  />
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
                    {tenderType === 'annual-tender' ? (
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

                    {/* Petty Purchase Validation Alert */}
                    {tenderType === 'spot-purchase' && !spotPurchaseValidation.isValid && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription className="font-medium">
                          {spotPurchaseValidation.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Petty Purchase Limits Info */}
                    {tenderType === 'spot-purchase' && tenderData.procurement_methods && spotPurchaseValidation.isValid && (
                      <Alert className="mt-4 bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          {tenderData.procurement_methods === 'single_quotation' 
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
                    Ready to create tender with {tenderItems.length} items
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
                      if (tenderType === 'spot-purchase') {
                        dashboardPath = '/dashboard/spot-purchases';
                      } else if (tenderType === 'annual-tender') {
                        dashboardPath = '/dashboard/contract-tender?type=annual-tender';
                      }
                      navigate(dashboardPath);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !tenderData.title}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : `Create ${tenderType === 'spot-purchase' ? 'Petty Purchase' : 'Contract'}`}
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

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <AddCategoryModal
          onClose={() => setShowAddCategoryModal(false)}
          onSuccess={(categoryData) => {
            // Refresh item masters to get new category
            fetchItemMasters();
            setShowAddCategoryModal(false);
          }}
        />
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <AddItemModal
          selectedCategory={selectedCategory}
          onClose={() => setShowAddItemModal(false)}
          onSuccess={(itemData) => {
            // Refresh item masters to get new item
            fetchItemMasters();
            // Auto-select the new item
            if (itemData.id) {
              setNewItem(prev => ({
                ...prev,
                item_master_id: itemData.id,
                nomenclature: itemData.nomenclature || ''
              }));
            }
            setShowAddItemModal(false);
          }}
        />
      )}

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

export default CreateTender;