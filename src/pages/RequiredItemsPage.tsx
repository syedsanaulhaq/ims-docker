import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RequiredItem {
  id: string;
  item_master_id: string | null;
  nomenclature: string;
  quantity_needed: number;
  unit: string | null;
  urgency_level: string;
  status: string;
  source_request_id: string | null;
  source_request_number: string | null;
  requested_by_wing_name: string | null;
  tender_id: string | null;
  tender_type: string | null;
  tender_reference: string | null;
  notes: string | null;
  created_at: string;
  item_code: string | null;
  category_name: string | null;
  created_by_name: string | null;
  recommended_procurement_type: 'annual-tender' | 'contract' | 'spot-purchase' | null;
}

interface RequiredItemsSummary {
  group_key: string;
  item_master_id: string | null;
  nomenclature: string;
  unit: string | null;
  total_quantity_needed: number;
  request_count: number;
  highest_urgency: string;
  source_requests: string;
  oldest_request_date: string;
  item_code: string | null;
  category_name: string | null;
}

interface OpenTender {
  id: string;
  title: string;
  reference_number: string | null;
  tender_type: string;
  status: string;
}

export default function RequiredItemsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RequiredItem[]>([]);
  const [summary, setSummary] = useState<RequiredItemsSummary[]>([]);
  const [openTenders, setOpenTenders] = useState<OpenTender[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'summary'>('individual');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSummaryKeys, setSelectedSummaryKeys] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('Pending');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Tender linkage modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [tenderActionType, setTenderActionType] = useState<'new' | 'existing'>('new');
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  const [selectedTenderType, setSelectedTenderType] = useState<'annual-tender' | 'contract' | 'spot-purchase'>('contract');

  // Per-item tender selection state (row-level routing)
  const [itemTenderMap, setItemTenderMap] = useState<Record<string, string>>({});
  const [itemTenderTypeMap, setItemTenderTypeMap] = useState<Record<string, 'annual-tender' | 'contract' | 'spot-purchase'>>({});
  const [linkingItemIds, setLinkingItemIds] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({ Pending: 0, 'In Tender': 0, Procured: 0, Cancelled: 0 });

  const fetchRequiredItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch individual items
      const itemsRes = await fetch(`/api/required-items?status=${filterStatus}`);
      if (!itemsRes.ok) throw new Error('Failed to fetch required items list');
      const itemsData = await itemsRes.json();
      setItems(itemsData.data || []);

      // 2. Fetch grouped summary
      const summaryRes = await fetch('/api/required-items/summary');
      if (!summaryRes.ok) throw new Error('Failed to fetch required items summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData.data || []);

      // 3. Fetch stats
      const statsRes = await fetch('/api/required-items/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || { Pending: 0, 'In Tender': 0, Procured: 0, Cancelled: 0 });
      }

      // 4. Fetch open tenders for linking
      const tendersRes = await fetch('/api/tenders');
      if (tendersRes.ok) {
        const tendersData = await tendersRes.json();
        // The list can be array or {success: true, tenders: [...]}
        const rawTenders = Array.isArray(tendersData) 
          ? tendersData 
          : (tendersData.tenders || tendersData.data || []);
        
        // Filter to draft or published tenders
        setOpenTenders(rawTenders.filter((t: any) => t.status === 'draft' || t.status === 'published'));
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequiredItems();
  }, [filterStatus]);

  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAllItems = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectSummary = (key: string, checked: boolean) => {
    setSelectedSummaryKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSelectAllSummary = (checked: boolean) => {
    if (checked) {
      setSelectedSummaryKeys(new Set(summary.map(s => s.group_key)));
    } else {
      setSelectedSummaryKeys(new Set());
    }
  };

  const handleOpenLinkModal = () => {
    const selectedCount = activeTab === 'individual' ? selectedIds.size : selectedSummaryKeys.size;
    if (selectedCount === 0) {
      alert('Please select at least one item.');
      return;
    }
    setIsLinkModalOpen(true);
  };

  const handleLinkTenderSubmit = async () => {
    try {
      // Determine final selected item ids (resolve from summary if needed)
      let itemIdsToLink: string[] = [];
      if (activeTab === 'individual') {
        itemIdsToLink = Array.from(selectedIds);
      } else {
        // Expand summary group keys to actual item IDs
        const selectedSummaryObjs = summary.filter(s => selectedSummaryKeys.has(s.group_key));
        const matchedItems = items.filter(item => 
          selectedSummaryObjs.some(s => 
            s.item_master_id === item.item_master_id || s.nomenclature === item.nomenclature
          )
        );
        itemIdsToLink = matchedItems.map(item => item.id);
      }

      if (itemIdsToLink.length === 0) {
        alert('No matching items found to link.');
        return;
      }

      if (tenderActionType === 'existing') {
        if (!selectedTenderId) {
          alert('Please select an existing tender.');
          return;
        }

        const selectedTender = openTenders.find(t => t.id === selectedTenderId);

        const res = await fetch('/api/required-items/link-tender', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_ids: itemIdsToLink,
            tender_id: selectedTenderId,
            tender_type: selectedTender?.tender_type || 'contract'
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to link items to tender');
        }

        alert(`Successfully linked ${itemIdsToLink.length} item(s) to tender.`);
        setIsLinkModalOpen(false);
        setSelectedIds(new Set());
        setSelectedSummaryKeys(new Set());
        fetchRequiredItems();
      } else {
        // Create New Tender flow: Redirect to Create Tender screen with items details passed in state/storage
        // We will store selected item details in sessionStorage
        let itemsForNewTender: any[] = [];
        let sourceRequiredItemIds: string[] = [];
        if (activeTab === 'individual') {
          const selectedItems = items
            .filter(item => selectedIds.has(item.id))
          itemsForNewTender = selectedItems.map(item => ({
              item_master_id: item.item_master_id || '',
              nomenclature: item.nomenclature,
              quantity: item.quantity_needed,
              unit: item.unit || '',
              source_required_item_id: item.id,
              source_request_id: item.source_request_id,
              source_request_number: item.source_request_number,
              requested_by_wing_name: item.requested_by_wing_name,
              urgency_level: item.urgency_level,
              remarks: item.notes || 'Imported from Out-of-Stock Pipeline'
            }));
          sourceRequiredItemIds = selectedItems.map(item => item.id);
        } else {
          const selectedSummaries = summary
            .filter(s => selectedSummaryKeys.has(s.group_key))
          itemsForNewTender = selectedSummaries.map(s => ({
              item_master_id: s.item_master_id || '',
              nomenclature: s.nomenclature,
              quantity: s.total_quantity_needed,
              unit: s.unit || '',
              source_required_item_ids: items
                .filter(item => item.item_master_id === s.item_master_id || item.nomenclature === s.nomenclature)
                .map(item => item.id),
              source_request_numbers: s.source_requests,
              remarks: `Imported from Out-of-Stock Pipeline | Requests: ${s.source_requests}`
            }));
          sourceRequiredItemIds = items
            .filter(item => selectedSummaries.some(s => s.item_master_id === item.item_master_id || s.nomenclature === item.nomenclature))
            .map(item => item.id);
        }

        sessionStorage.setItem('prefilled_tender_items', JSON.stringify(itemsForNewTender));
        sessionStorage.setItem('prefilled_tender_source_required_item_ids', JSON.stringify(sourceRequiredItemIds));
        
        let path = '/dashboard/create-tender';
        if (selectedTenderType === 'annual-tender') {
          path += '?type=annual-tender';
        } else if (selectedTenderType === 'spot-purchase') {
          path += '?type=spot-purchase';
        }

        setIsLinkModalOpen(false);
        navigate(path);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete tender linkage action.');
    }
  };

  const handleCancelItem = async (id: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (reason === null) return; // cancel clicked

    try {
      const res = await fetch(`/api/required-items/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!res.ok) throw new Error('Failed to cancel required item');
      
      fetchRequiredItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel item');
    }
  };

  const getTenderTypeLabel = (type: string | null) => {
    switch (type) {
      case 'spot-purchase': return 'Petty Cash';
      case 'annual-tender': return 'Annual';
      case 'contract': return 'Contract';
      default: return 'Contract';
    }
  };

  const handleItemTenderTypeChange = (itemId: string, type: 'annual-tender' | 'contract' | 'spot-purchase') => {
    setItemTenderTypeMap(prev => ({ ...prev, [itemId]: type }));
    // Clear any selected tender when type changes
    setItemTenderMap(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleItemTenderChange = (itemId: string, tenderId: string) => {
    if (tenderId === '__new__') {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      const selectedType = itemTenderTypeMap[itemId] || 'contract';
      const itemsForNewTender = [{
        item_master_id: item.item_master_id || '',
        nomenclature: item.nomenclature,
        quantity: item.quantity_needed,
        unit: item.unit || '',
        source_required_item_id: item.id,
        source_request_id: item.source_request_id,
        source_request_number: item.source_request_number,
        requested_by_wing_name: item.requested_by_wing_name,
        urgency_level: item.urgency_level,
        remarks: item.notes || 'Imported from Out-of-Stock Pipeline'
      }];
      sessionStorage.setItem('prefilled_tender_items', JSON.stringify(itemsForNewTender));
      sessionStorage.setItem('prefilled_tender_source_required_item_ids', JSON.stringify([item.id]));

      let path = '/dashboard/create-tender';
      if (selectedType === 'annual-tender') {
        path += '?type=annual-tender';
      } else if (selectedType === 'spot-purchase') {
        path += '?type=spot-purchase';
      }
      navigate(path);
      return;
    }
    setItemTenderMap(prev => ({ ...prev, [itemId]: tenderId }));
  };

  const tendersForType = (type: string | undefined) => {
    if (!type) return [];
    return openTenders.filter(t => (t.tender_type || 'contract') === type);
  };

  const handleAssignItemTender = async (itemId: string) => {
    const tenderId = itemTenderMap[itemId];
    if (!tenderId) {
      alert('Please select a tender first.');
      return;
    }
    const selectedTender = openTenders.find(t => t.id === tenderId);
    if (!selectedTender) {
      alert('Selected tender not found.');
      return;
    }

    setLinkingItemIds(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });

    try {
      const res = await fetch('/api/required-items/link-tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: [itemId],
          tender_id: tenderId,
          tender_type: selectedTender.tender_type || 'contract'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to link item to tender');
      }

      alert('Item linked to tender successfully.');
      setItemTenderMap(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      fetchRequiredItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to link item to tender');
    } finally {
      setLinkingItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // Filter individual list based on search term
  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.nomenclature.toLowerCase().includes(term) ||
      (item.source_request_number && item.source_request_number.toLowerCase().includes(term)) ||
      (item.requested_by_wing_name && item.requested_by_wing_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Out-of-Stock Required Items
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze out-of-stock items logged from requests and route them to the appropriate Procurement/Tender pipeline.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleOpenLinkModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-300"
            disabled={activeTab === 'individual' ? selectedIds.size === 0 : selectedSummaryKeys.size === 0}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Route to Tender ({activeTab === 'individual' ? selectedIds.size : selectedSummaryKeys.size})
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pending Procurement</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-100">{stats.Pending}</h3>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Active in Tender</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-900 dark:text-blue-100">{stats['In Tender']}</h3>
            </div>
            <Layers className="h-8 w-8 text-blue-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Procured & Closed</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-100">{stats.Procured}</h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-l-4 border-l-slate-400">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">Cancelled / Ignored</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{stats.Cancelled}</h3>
            </div>
            <Trash2 className="h-8 w-8 text-slate-400 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Main Table Content Card */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle className="text-xl">Procurement Pipeline Items</CardTitle>
            <CardDescription>Select items to bunch into tenders or purchase orders.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search items or wings..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Tender">In Tender</SelectItem>
                <SelectItem value="Procured">Procured</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            {/* Tab Toggle */}
            <div className="inline-flex rounded-lg border p-1 bg-muted">
              <button
                onClick={() => {
                  setActiveTab('individual');
                  setSelectedSummaryKeys(new Set());
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'individual' ? 'bg-white shadow' : 'text-muted-foreground'
                }`}
              >
                Individual Items
              </button>
              <button
                onClick={() => {
                  setActiveTab('summary');
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'summary' ? 'bg-white shadow' : 'text-muted-foreground'
                }`}
              >
                Grouped Summary
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-2">
              <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading required items...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-500" />
              <p>{error}</p>
            </div>
          ) : activeTab === 'individual' ? (
            // ==========================================
            // INDIVIDUAL VIEW
            // ==========================================
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onCheckedChange={(checked) => handleSelectAllItems(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Nomenclature</TableHead>
                  <TableHead>Qty Needed</TableHead>
                  <TableHead>Requested By Wing</TableHead>
                  <TableHead>Source Request</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tender Type</TableHead>
                  <TableHead>Tender Association</TableHead>
                  {filterStatus === 'Pending' && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No matching required items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.nomenclature}</div>
                        {item.item_code && <div className="text-xs text-muted-foreground">Code: {item.item_code}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-950 dark:text-slate-50">
                          {item.quantity_needed} {item.unit || 'units'}
                        </span>
                      </TableCell>
                      <TableCell>{item.requested_by_wing_name || '—'}</TableCell>
                      <TableCell>
                        {item.source_request_number ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.source_request_number}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            item.urgency_level === 'Urgent' ? 'destructive' :
                            item.urgency_level === 'High' ? 'default' : 'secondary'
                          }
                        >
                          {item.urgency_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'Pending' ? (
                          <Select
                            value={itemTenderTypeMap[item.id] || ''}
                            onValueChange={(val) => handleItemTenderTypeChange(item.id, val as any)}
                          >
                            <SelectTrigger className="w-[140px] text-xs">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract" className="text-xs">Contract</SelectItem>
                              <SelectItem value="annual-tender" className="text-xs">Annual</SelectItem>
                              <SelectItem value="spot-purchase" className="text-xs">Petty Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">{item.tender_type?.replace('-', ' ') || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={itemTenderMap[item.id] || ''}
                              onValueChange={(val) => handleItemTenderChange(item.id, val)}
                              disabled={!itemTenderTypeMap[item.id]}
                            >
                              <SelectTrigger className="w-[180px] text-xs">
                                <SelectValue placeholder={itemTenderTypeMap[item.id] ? 'Select tender...' : 'Select type first...'} />
                              </SelectTrigger>
                              <SelectContent>
                                {tendersForType(itemTenderTypeMap[item.id]).map(tender => (
                                  <SelectItem key={tender.id} value={tender.id} className="text-xs">
                                    {tender.title} {tender.reference_number ? `(${tender.reference_number})` : ''}
                                  </SelectItem>
                                ))}
                                {tendersForType(itemTenderTypeMap[item.id]).length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                    No {getTenderTypeLabel(itemTenderTypeMap[item.id])} tenders found.
                                  </div>
                                )}
                                <SelectItem value="__new__" className="text-xs font-semibold text-emerald-600">
                                  + Create new {getTenderTypeLabel(itemTenderTypeMap[item.id])} tender
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {itemTenderMap[item.id] && itemTenderMap[item.id] !== '__new__' && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 text-xs"
                                onClick={() => handleAssignItemTender(item.id)}
                                disabled={linkingItemIds.has(item.id)}
                              >
                                {linkingItemIds.has(item.id) ? 'Linking...' : 'Assign'}
                              </Button>
                            )}
                          </div>
                        ) : item.tender_reference ? (
                          <div className="text-xs">
                            <div className="font-semibold text-blue-600 dark:text-blue-400">{item.tender_reference}</div>
                            <div className="text-muted-foreground capitalize">({item.tender_type?.replace('-', ' ')})</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Linked</span>
                        )}
                      </TableCell>
                      {filterStatus === 'Pending' && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleCancelItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            // ==========================================
            // SUMMARY VIEW
            // ==========================================
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={summary.length > 0 && selectedSummaryKeys.size === summary.length}
                      onCheckedChange={(checked) => handleSelectAllSummary(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Nomenclature</TableHead>
                  <TableHead>Aggregated Qty Needed</TableHead>
                  <TableHead>Source Request Count</TableHead>
                  <TableHead>Highest Urgency</TableHead>
                  <TableHead>Source Request Reference(s)</TableHead>
                  <TableHead>Oldest Request Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No summary data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.map(s => (
                    <TableRow key={s.group_key} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedSummaryKeys.has(s.group_key)}
                          onCheckedChange={(checked) => handleSelectSummary(s.group_key, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{s.nomenclature}</div>
                        {s.item_code && <div className="text-xs text-muted-foreground">Code: {s.item_code}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-slate-950 dark:text-slate-50">
                          {s.total_quantity_needed} {s.unit || 'units'}
                        </span>
                      </TableCell>
                      <TableCell>{s.request_count}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            s.highest_urgency === 'Urgent' ? 'destructive' :
                            s.highest_urgency === 'High' ? 'default' : 'secondary'
                          }
                        >
                          {s.highest_urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={s.source_requests}>
                        {s.source_requests}
                      </TableCell>
                      <TableCell>
                        {new Date(s.oldest_request_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tender Route Modal dialog */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Route Selected Items to Tender</DialogTitle>
            <DialogDescription>
              Choose whether to launch a new tender process or link these required items to an existing open procurement file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={tenderActionType === 'new' ? 'default' : 'outline'}
                onClick={() => setTenderActionType('new')}
                className="w-full flex flex-col items-center justify-center p-6 h-auto gap-2"
              >
                <Plus className="h-6 w-6" />
                <div className="font-semibold text-sm">Create New Tender</div>
              </Button>
              
              <Button
                variant={tenderActionType === 'existing' ? 'default' : 'outline'}
                onClick={() => setTenderActionType('existing')}
                className="w-full flex flex-col items-center justify-center p-6 h-auto gap-2"
                disabled={openTenders.length === 0}
              >
                <Layers className="h-6 w-6" />
                <div className="font-semibold text-sm">Add to Existing</div>
              </Button>
            </div>

            {tenderActionType === 'new' ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Tender Procurement Type</label>
                <Select
                  value={selectedTenderType}
                  onValueChange={(val: any) => setSelectedTenderType(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tender type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract / Spot Purchase Tender</SelectItem>
                    <SelectItem value="annual-tender">Annual Tender (Bulk / Annual contract)</SelectItem>
                    <SelectItem value="spot-purchase">Petty Cash Purchase (Small purchase)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTenderType === 'spot-purchase' && "💡 Ideal for low-value purchases under organizational threshold (e.g. < PKR 100K)."}
                  {selectedTenderType === 'contract' && "💡 Standard single vendor/competitively bid contract tender."}
                  {selectedTenderType === 'annual-tender' && "💡 Recurring or bulk items pooled for long-term contract pricing."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Select Target Tender File</label>
                <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target tender..." />
                  </SelectTrigger>
                  <SelectContent>
                    {openTenders.map(tender => (
                      <SelectItem key={tender.id} value={tender.id}>
                        {tender.title} {tender.reference_number ? `(${tender.reference_number})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleLinkTenderSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

