import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, Plus, ArrowLeft, Package, Edit, CheckCircle, FileText, Truck } from 'lucide-react';
import DeliveryListModal from '@/components/delivery/DeliveryListModal';

interface PurchaseOrder {
  id: number;
  po_number: string;
  tender_id: number;
  vendor_id: number;
  po_date: string;
  file_number?: string;
  total_amount: number;
  status: string;
  remarks?: string;
  created_at: string;
  tender_title: string;
  tender_type: string;
  vendor_name: string;
  item_count: number;
  deliveryStatus?: {
    overallStatus: string;
    receivedPercentage: number;
  };
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export default function PurchaseOrderDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenderId = searchParams.get('tenderId');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeliveryList, setShowDeliveryList] = useState(false);
  const [selectedPOForDeliveries, setSelectedPOForDeliveries] = useState<PurchaseOrder | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  
  const [filters, setFilters] = useState({
    status: 'all',
    tenderType: 'all',
    deliveryStatus: 'all',
    searchTerm: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchPurchaseOrders();
  }, [filters, tenderId, showDeleted]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      let query = 'http://localhost:3001/api/purchase-orders';
      const params = new URLSearchParams();

      // ✅ Include deleted if showDeleted is true
      if (showDeleted) {
        params.append('includeDeleted', 'true');
      }

      // ✅ Filter by tenderId if provided in URL
      if (tenderId) {
        params.append('tenderId', tenderId);
        }

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const queryString = params.toString();
      if (queryString) {
        query += '?' + queryString;
      }

      const response = await fetch(query);
      if (!response.ok) throw new Error('Failed to fetch POs');

      let data = await response.json();

      // Client-side filter by deleted status
      if (showDeleted) {
        data = data.filter((po: PurchaseOrder) => po.is_deleted === 1 || po.is_deleted === true);
      } else {
        data = data.filter((po: PurchaseOrder) => !po.is_deleted || po.is_deleted === 0 || po.is_deleted === false);
      }

      // Client-side filter by search term
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        data = data.filter((po: PurchaseOrder) => 
          po.po_number.toLowerCase().includes(term) ||
          po.tender_title.toLowerCase().includes(term) ||
          po.vendor_name.toLowerCase().includes(term) ||
          (po.file_number && po.file_number.toLowerCase().includes(term))
        );
      }

      // Client-side filter by tender type
      if (filters.tenderType !== 'all') {
        data = data.filter((po: PurchaseOrder) => 
          po.tender_type?.toLowerCase() === filters.tenderType.toLowerCase()
        );
      }

      // Fetch delivery status for finalized and completed POs
      const posWithStatus = await Promise.all(
        data.map(async (po: PurchaseOrder) => {
          if (po.status === 'finalized' || po.status === 'completed') {
            try {
              const statusResponse = await fetch(`http://localhost:3001/api/purchase-orders/${po.id}/delivery-status`);
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                return { ...po, deliveryStatus: statusData.deliveryStatus };
              }
            } catch (err) {
              console.error(`Error fetching delivery status for PO ${po.id}:`, err);
            }
          }
          return po;
        })
      );

      // Client-side filter by delivery status (after fetching delivery data)
      let filteredData = posWithStatus;
      if (filters.deliveryStatus !== 'all') {
        filteredData = posWithStatus.filter((po: PurchaseOrder) => 
          po.deliveryStatus?.overallStatus?.toLowerCase() === filters.deliveryStatus.toLowerCase()
        );
      }

      setPurchaseOrders(filteredData);
      setError(null);
    } catch (err) {
      console.error('Error fetching POs:', err);
      setError('Failed to load purchase/supply orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePO = async (id: number) => {
    if (!confirm('Move this PO to trash?')) {
      return;
    }

    try {
      setDeletingId(id);
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      await fetchPurchaseOrders();
      alert('✅ Purchase/Supply order moved to trash');
    } catch (err) {
      console.error('Error deleting PO:', err);
      alert('Failed to delete purchase/supply order');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestorePO = async (id: number) => {
    if (!confirm('Restore this PO?')) {
      return;
    }

    try {
      setRestoringId(id);
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${id}/restore`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      await fetchPurchaseOrders();
      alert('✅ Purchase/Supply order restored successfully');
    } catch (err) {
      console.error('Error restoring PO:', err);
      alert('Failed to restore purchase/supply order');
    } finally {
      setRestoringId(null);
    }
  };

  const handleFinalizePO = async (id: number) => {
    if (!confirm('Are you sure you want to finalize this PO? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/purchase-orders/${id}/finalize`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalized' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      // Update PO in list
      setPurchaseOrders(prev => prev.map(po => 
        po.id === id ? { ...po, status: 'finalized' } : po
      ));
      alert('✅ Purchase/Supply order finalized successfully');
    } catch (err) {
      console.error('Error finalizing PO:', err);
      alert('Failed to finalize purchase/supply order');
    }
  };

  const handleShowReceivingReport = (po: PurchaseOrder) => {
    navigate(`/dashboard/po/${po.id}/receiving-report`);
  };

  const handleShowDeliveries = (po: PurchaseOrder) => {
    setSelectedPOForDeliveries(po);
    setShowDeliveryList(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'finalized':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'issued':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getDeliveryStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const draftCount = purchaseOrders.filter(po => po.status === 'draft').length;

  // Filter POs based on deleted status and filters
  const filteredPOs = purchaseOrders.filter(po => {
    // Filter by deleted status
    if (!showDeleted && (po.is_deleted === 1 || po.is_deleted === true)) {
      return false;
    }
    if (showDeleted && (po.is_deleted === 0 || po.is_deleted === false)) {
      return false;
    }

    if (filters.status !== 'all' && po.status !== filters.status) return false;
    if (filters.tenderType !== 'all' && po.tender_type !== filters.tenderType) return false;
    if (filters.searchTerm && !(
      po.po_number.includes(filters.searchTerm) ||
      po.tender_title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      po.vendor_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (po.file_number && po.file_number.toLowerCase().includes(filters.searchTerm.toLowerCase()))
    )) return false;
    
    if (filters.deliveryStatus !== 'all' && po.deliveryStatus?.overallStatus !== filters.deliveryStatus) return false;
    
    if (filters.startDate && new Date(po.po_date) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(po.po_date) > new Date(filters.endDate)) return false;

    return true;
  });

  // Group POs by tender type
  const groupedPOs = filteredPOs.reduce((groups, po) => {
    const type = po.tender_type || 'Other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(po);
    return groups;
  }, {} as Record<string, PurchaseOrder[]>);

  const tenderTypeLabels: Record<string, string> = {
    'contract': 'Contract Tenders',
    'spot-purchase': 'Spot Purchase',
    'annual-tender': 'Annual Tenders',
    'Other': 'Other'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {tenderId && purchaseOrders.length > 0 && (
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/dashboard/contract-tender?type=${purchaseOrders[0].tender_type}`)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tender
              </Button>
            )}
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Purchase/Supply Orders</h1>
            <p className="text-slate-600">Manage all purchase/supply orders generated from tenders</p>
          </div>
          <Button 
            onClick={() => navigate(tenderId ? `/dashboard/create-po?tenderId=${tenderId}` : '/dashboard/create-po')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{purchaseOrders.length}</div>
              <p className="text-sm text-slate-600">Total POs</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">{draftCount}</div>
              <p className="text-sm text-slate-600">Draft POs</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">Rs {totalAmount.toLocaleString()}</div>
              <p className="text-sm text-slate-600">Total Value</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">
                {new Set(purchaseOrders.map(po => po.vendor_id)).size}
              </div>
              <p className="text-sm text-slate-600">Unique Vendors</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Input
                placeholder="Search PO number, file number, tender, vendor..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="border-slate-300"
              />

              <Select value={filters.tenderType} onValueChange={(value) => setFilters(prev => ({ ...prev, tenderType: value }))}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Tender Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="spot-purchase">Spot Purchase</SelectItem>
                  <SelectItem value="annual-tender">Annual Tender</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.deliveryStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, deliveryStatus: value }))}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Delivery Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Delivery</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="border-slate-300"
              />

              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="border-slate-300"
              />

              <Button
                variant={showDeleted ? 'destructive' : 'outline'}
                onClick={() => setShowDeleted(!showDeleted)}
                className="whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {showDeleted ? 'Deleted' : 'Show Deleted'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-slate-600">Loading purchase/supply orders...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && purchaseOrders.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-slate-600 mb-4">No purchase/supply orders found</p>
              <Button onClick={() => navigate(tenderId ? `/dashboard/create-po?tenderId=${tenderId}` : '/dashboard/create-po')} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First PO
              </Button>
            </CardContent>
          </Card>
        )}

        {/* POs by Tender Type - Grouped Blocks */}
        {!loading && purchaseOrders.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedPOs).map(([tenderType, pos]) => (
              <Card key={tenderType}>
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <Badge className={`${getTenderTypeColor(tenderType)} text-base px-4 py-1`}>
                          {tenderTypeLabels[tenderType] || tenderType}
                        </Badge>
                        <span className="text-slate-600 text-lg font-normal">
                          ({pos.length} PO{pos.length !== 1 ? 's' : ''})
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Total Value: Rs {pos.reduce((sum, po) => sum + po.total_amount, 0).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200">
                        <tr className="bg-slate-50">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">PO Number</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">File Number</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Tender</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Vendor</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Items</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Delivery</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pos.map((po) => (
                          <tr key={po.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono font-semibold text-blue-600">{po.po_number}</td>
                            <td className="py-3 px-4 text-slate-700">{po.file_number || '-'}</td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-900">{po.tender_title}</p>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{po.vendor_name}</td>
                            <td className="py-3 px-4 text-slate-700">
                              {new Date(po.po_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-900">
                              Rs {po.total_amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="secondary">{po.item_count} items</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusColor(po.status)}>
                                {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {(po.status === 'finalized' || po.status === 'completed') && po.deliveryStatus ? (
                                <div className="space-y-1">
                                  <Badge className={getDeliveryStatusColor(po.deliveryStatus.overallStatus)}>
                                    {po.deliveryStatus.overallStatus}
                                  </Badge>
                                  <div className="text-xs text-slate-600">
                                    {po.deliveryStatus.receivedPercentage.toFixed(0)}% received
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/dashboard/po/${po.id}`)}
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {(po.status === 'finalized' || po.status === 'partial' || po.status === 'completed') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-purple-50 hover:bg-purple-100 border-purple-300"
                                    onClick={() => handleShowDeliveries(po)}
                                    title="View Deliveries"
                                  >
                                    <Truck className="w-4 h-4" />
                                  </Button>
                                )}
                                {(po.status === 'finalized' || po.status === 'partial') && po.deliveryStatus?.overallStatus !== 'completed' && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => navigate(`/purchase-orders/${po.id}/receive-delivery`)}
                                    title="Receive Delivery"
                                  >
                                    <Package className="w-4 h-4" />
                                  </Button>
                                )}
                                {(po.status === 'finalized' || po.status === 'partial' || po.status === 'completed') && 
                                 po.deliveryStatus?.overallStatus && 
                                 po.deliveryStatus.overallStatus !== 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-green-50 hover:bg-green-100 border-green-300"
                                    onClick={() => handleShowReceivingReport(po)}
                                    title="View Receiving Report"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                                {po.status === 'draft' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/dashboard/po/${po.id}/edit`)}
                                      title="Edit PO"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    {!showDeleted && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleFinalizePO(po.id)}
                                          title="Finalize PO"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        {po.status === 'draft' && (
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeletePO(po.id)}
                                            disabled={deletingId === po.id}
                                            title="Delete PO"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    {showDeleted && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRestorePO(po.id)}
                                        disabled={restoringId === po.id}
                                        className="text-green-600 hover:text-green-700"
                                        title="Restore PO"
                                      >
                                        💚 {restoringId === po.id ? '...' : 'Restore'}
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delivery List Modal */}
      {showDeliveryList && selectedPOForDeliveries && (
        <DeliveryListModal
          poId={selectedPOForDeliveries.id.toString()}
          poNumber={selectedPOForDeliveries.po_number}
          vendorName={selectedPOForDeliveries.vendor_name}
          onClose={() => {
            setShowDeliveryList(false);
            setSelectedPOForDeliveries(null);
          }}
        />
      )}
    </div>
  );
}
