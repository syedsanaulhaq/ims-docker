import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { invmisApi } from "@/services/invmisApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  Truck, 
  ArrowLeft,
  Database,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Users,
  Calendar,
  MapPin,
  Lock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { deliveriesLocalService } from '@/services/deliveriesLocalService';
import { toast } from 'sonner';

const ProcurementDetails = () => {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tenders'); // tenders, deliveries
  const [finalizingDeliveries, setFinalizingDeliveries] = useState<Set<string>>(new Set());

  // Fetch procurement data from InvMIS API
  useEffect(() => {
    const fetchProcurementData = async () => {
      try {
        setDataLoading(true);
        const [tendersResponse, deliveriesResponse] = await Promise.all([
          invmisApi.tenders.getAwards(),
          invmisApi.deliveries.getAll()
        ]);
        
        // Handle InvMIS API response format
        const tendersData = tendersResponse?.success ? tendersResponse.awards : [];
        const deliveriesData = deliveriesResponse?.success ? deliveriesResponse.deliveries : [];
        
        setTenders(Array.isArray(tendersData) ? tendersData : []);
        setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : []);
        
        } catch (error) {
        console.error('Error fetching procurement data:', error);
        setTenders([]);
        setDeliveries([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchProcurementData();
  }, []);

  // Filter data based on search
  const filteredTenders = tenders.filter(tender => 
    tender.title?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.tender_type?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.description?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeliveries = deliveries.filter(delivery => 
    delivery.delivery_number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.delivery_personnel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const tenderStats = {
    total: tenders.length,
    active: tenders.filter(t => t.tender_status === 'Published').length,
    draft: tenders.filter(t => t.status === 'Draft').length,
    closed: tenders.filter(t => t.status === 'Closed').length
  };

  const deliveryStats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.delivery_status === 'Pending').length,
    completed: deliveries.filter(d => d.delivery_status === 'Completed').length,
    cancelled: deliveries.filter(d => d.delivery_status === 'Cancelled').length
  };

  // Finalize delivery function
  const handleFinalizeDelivery = async (deliveryId: string) => {
    if (window.confirm('Are you sure you want to finalize this delivery? This action cannot be undone.')) {
      try {
        setFinalizingDeliveries(prev => new Set(prev).add(deliveryId));
        // TODO: Get actual user ID from auth context
        const userId = 'system-user-id';
        const result = await deliveriesLocalService.finalize(deliveryId, userId);
        
        if (result.success) {
          toast.success('Delivery finalized successfully');
          // Refresh deliveries data
          const deliveriesResponse = await fetch('http://localhost:5000/api/deliveries');
          const deliveriesData = await deliveriesResponse.json();
          setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : []);
        } else {
          toast.error(result.message || 'Failed to finalize delivery');
        }
      } catch (error) {
        toast.error('Failed to finalize delivery');
      } finally {
        setFinalizingDeliveries(prev => {
          const newSet = new Set(prev);
          newSet.delete(deliveryId);
          return newSet;
        });
      }
    }
  };

  const getStatusIcon = (status: string, type: 'tender' | 'delivery') => {
    if (type === 'tender') {
      switch (status?.toLowerCase()) {
        case 'published':
        case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'closed': return <XCircle className="h-4 w-4 text-gray-600" />;
        case 'draft': return <Clock className="h-4 w-4 text-orange-600" />;
        default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      }
    } else {
      switch (status?.toLowerCase()) {
        case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
        case 'pending': return <Clock className="h-4 w-4 text-orange-600" />;
        default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      }
    }
  };

  const getStatusBadgeVariant = (status: string, type: 'tender' | 'delivery') => {
    if (type === 'tender') {
      switch (status?.toLowerCase()) {
        case 'published':
        case 'active': return 'default';
        case 'closed': return 'secondary';
        case 'draft': return 'outline';
        default: return 'outline';
      }
    } else {
      switch (status?.toLowerCase()) {
        case 'completed': return 'default';
        case 'cancelled': return 'destructive';
        case 'pending': return 'secondary';
        default: return 'outline';
      }
    }
  };

  if (dataLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading procurement details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-4">
            Procurement Details
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Comprehensive view of tenders, deliveries, and vendor activities
          </p>
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Live Data Connected
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {activeTab === 'tenders' ? filteredTenders.length : filteredDeliveries.length} of {activeTab === 'tenders' ? tenderStats.total : deliveryStats.total} Items
            </Badge>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'tenders' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tenders')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Tenders ({tenderStats.total})
        </Button>
        <Button
          variant={activeTab === 'deliveries' ? 'default' : 'outline'}
          onClick={() => setActiveTab('deliveries')}
          className="flex items-center gap-2"
        >
          <Truck className="h-4 w-4" />
          Deliveries ({deliveryStats.total})
        </Button>
      </div>

      {/* Summary Cards - Tenders */}
      {activeTab === 'tenders' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-700">Total Tenders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{tenderStats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-700">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{tenderStats.active}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-orange-700">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{tenderStats.draft}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-l-gray-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{tenderStats.closed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards - Deliveries */}
      {activeTab === 'deliveries' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-700">Total Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{deliveryStats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-orange-700">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{deliveryStats.pending}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-700">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{deliveryStats.completed}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-red-700">Cancelled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{deliveryStats.cancelled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeTab === 'tenders' ? <FileText className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            {activeTab === 'tenders' ? `Tenders (${filteredTenders.length})` : `Deliveries (${filteredDeliveries.length})`}
          </CardTitle>
          <CardDescription>
            {activeTab === 'tenders' 
              ? 'Detailed view of all tender documents and their current status'
              : 'Detailed view of all delivery records and their current status'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === 'tenders' ? (
            filteredTenders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No tenders found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTenders.map((tender) => (
                  <Card key={tender.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{tender.title || 'Untitled Tender'}</h3>
                            <Badge variant={getStatusBadgeVariant(tender.status, 'tender')}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(tender.status, 'tender')}
                                {tender.status || 'Unknown'}
                              </div>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{tender.tender_type || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Created:</span>
                              <span className="font-medium">{formatDateDMY(tender.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Procurement:</span>
                              <span className="font-medium">{tender.procurement_method || 'N/A'}</span>
                            </div>
                          </div>
                          {tender.description && (
                            <p className="text-sm text-gray-600 mt-2">{tender.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => navigate(`/dashboard/tenders/${tender.id}/report`)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            filteredDeliveries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No deliveries found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">Delivery #{delivery.delivery_number || delivery.id}</h3>
                            <Badge variant={getStatusBadgeVariant(delivery.delivery_status, 'delivery')}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(delivery.delivery_status, 'delivery')}
                                {delivery.delivery_status || 'Unknown'}
                              </div>
                            </Badge>
                            {delivery.is_finalized && (
                              <Badge variant="secondary" className="text-xs">
                                Finalized
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Personnel:</span>
                              <span className="font-medium">{delivery.delivery_personnel || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Date:</span>
                              <span className="font-medium">{formatDateDMY(delivery.delivery_date || delivery.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Location:</span>
                              <span className="font-medium">{delivery.delivery_location || 'N/A'}</span>
                            </div>
                          </div>
                          {delivery.notes && (
                            <p className="text-sm text-gray-600 mt-2">{delivery.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {!delivery.is_finalized ? (
                            <Button
                              onClick={() => handleFinalizeDelivery(delivery.id)}
                              variant="outline"
                              size="sm"
                              disabled={finalizingDeliveries.has(delivery.id)}
                              className="flex items-center gap-2"
                            >
                              <Lock className="h-4 w-4" />
                              {finalizingDeliveries.has(delivery.id) ? 'Finalizing...' : 'Finalize'}
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              className="flex items-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Finalized
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementDetails;
