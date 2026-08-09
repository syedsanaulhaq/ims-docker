import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, Clock, Eye, Edit2, Send, Package } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface InventoryVerificationRequest {
  id: number;
  stock_issuance_id: string;
  item_master_id: string;
  item_nomenclature: string;
  requested_by_user_id: string;
  requested_by_name: string;
  status: 'pending' | 'forwarded' | 'approved' | 'rejected' | 'verified_available' | 'verified_partial' | 'verified_unavailable' | 'verified';
  verified_by_user_id?: string;
  verified_by_name?: string;
  forwarded_to_user_id?: string;
  forwarded_to_name?: string;
  forward_notes?: string;
  forwarded_by_user_id?: string;
  forwarded_by_name?: string;
  forwarded_at?: string;
  physical_count?: number;
  available_quantity?: number;
  verification_notes?: string;
  wing_id: number;
  wing_name: string;
  requested_at: string;
  verified_at?: string;
  requested_quantity?: number;
}

interface VerificationItemDetail {
  id: string;
  nomenclature: string;
  requested_quantity: number;
  wing_available: number;
  admin_available: number;
  verification_status: 'pending' | 'available' | 'partial' | 'unavailable';
  verification_notes?: string;
}

export const PendingVerificationsPage: React.FC = () => {
  const { user } = useSession();
  const [verificationRequests, setVerificationRequests] = useState<InventoryVerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<InventoryVerificationRequest | null>(null);
  const [itemDetails, setItemDetails] = useState<VerificationItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationResult, setVerificationResult] = useState<'available' | 'partial' | 'unavailable'>('available');
  const [availableQuantity, setAvailableQuantity] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [submittedVerificationId, setSubmittedVerificationId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null); // null = show all pending, 'pending', 'verified_available', etc.
  const [storeKeepers, setStoreKeepers] = useState<any[]>([]); // List of wing store keepers
  const [selectedStoreKeeperId, setSelectedStoreKeeperId] = useState<string>(''); // Selected store keeper

  // Fetch pending verification requests
  useEffect(() => {
    fetchPendingVerifications();
  }, [user]);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      
      if (!user?.user_id) {
        console.error('User ID not found in session context');
        return;
      }
      
      // Use the same endpoint as WingDashboard - fetches verification requests made BY the user
      const response = await fetch(`http://localhost:3001/api/inventory/my-verification-requests?userId=${encodeURIComponent(user.user_id)}`);
      const data = await response.json();
      
      if (data.success) {
        setVerificationRequests(data.data || []);
      } else if (Array.isArray(data)) {
        // Fallback if API returns array directly
        setVerificationRequests(data);
      } else if (data.data) {
        // Fallback if response has data property
        setVerificationRequests(data.data);
      } else {
        setVerificationRequests([]);
      }
    } catch (error) {
      console.error('❌ Error fetching pending verifications:', error);
      setVerificationRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (request: InventoryVerificationRequest, action: 'approve' | 'reject' | 'forward') => {
    if (!user?.user_id) {
      alert('User session missing. Please re-login.');
      return;
    }

    let verificationNotes = '';
    let forwardToUserId = '';
    let forwardToName = '';

    if (action === 'forward') {
      forwardToUserId = window.prompt('Enter User ID to forward to:', '') || '';
      forwardToName = window.prompt('Enter name for the forward target (optional):', '') || '';
      verificationNotes = window.prompt('Add a note for forwarding (optional):', '') || '';
      if (!forwardToUserId) {
        alert('Forward target is required.');
        return;
      }
    } else {
      verificationNotes = window.prompt(`Add a note for ${action} (optional):`, '') || '';
    }

    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      forward: 'forwarded'
    };

    const payload = {
      verificationId: String(request.id),
      verificationStatus: statusMap[action],
      action,
      physicalCount: request.physical_count || 0,
      availableQuantity: request.available_quantity || 0,
      verificationNotes: verificationNotes,
      verifiedByUserId: user.user_id,
      verifiedByName: user.user_name,
      forwardToUserId,
      forwardToName
    };

    try {
      const response = await fetch('http://localhost:3001/api/inventory/update-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        await fetchPendingVerifications();
      } else {
        alert('Action failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Action failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleViewDetails = async (request: InventoryVerificationRequest) => {
    setSelectedRequest(request);
    setSelectedStoreKeeperId(''); // Reset store keeper selection
    
    // Fetch detailed inventory information
    try {
      // Get availability data for this item
      const response = await fetch('http://localhost:3001/api/inventory/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemMasterId: request.item_master_id,
          wingId: request.wing_id
        })
      });
      const data = await response.json();

      if (data.success) {
        const requestedQty = request.requested_quantity ?? request.available_quantity ?? 0;
        setItemDetails({
          id: String(request.id),
          nomenclature: request.item_master_id || 'Item',
          requested_quantity: requestedQty,
          wing_available: data.data?.available_quantity || data.wing_available || 0,
          admin_available: data.admin_available || 0,
          verification_status: 'pending'
        });
        
        // Pre-fill available quantity
        const totalAvailable = (data.data?.available_quantity || data.wing_available || 0) + (data.admin_available || 0);
        setAvailableQuantity(Math.min(totalAvailable, requestedQty));
      } else {
        // Use default values if check fails
        const requestedQty = request.requested_quantity ?? request.available_quantity ?? 0;
        setItemDetails({
          id: String(request.id),
          nomenclature: request.item_master_id || 'Item',
          requested_quantity: requestedQty,
          wing_available: 0,
          admin_available: 0,
          verification_status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      // Set minimal defaults on error
      const requestedQty = request.requested_quantity ?? request.available_quantity ?? 0;
      setItemDetails({
        id: String(request.id),
        nomenclature: request.item_master_id || 'Item',
        requested_quantity: requestedQty,
        wing_available: 0,
        admin_available: 0,
        verification_status: 'pending'
      });
    }

    // Fetch store keepers for the same wing
    try {
      const skResponse = await fetch(`http://localhost:3001/api/ims/users?wing_id=${request.wing_id}&role=WING_STORE_KEEPER`);
      const skData = await skResponse.json();
      if (skData.success && Array.isArray(skData.data)) {
        setStoreKeepers(skData.data);
        } else {
        setStoreKeepers([]);
      }
    } catch (error) {
      console.error('Error fetching store keepers:', error);
      setStoreKeepers([]);
    }
    
    setShowModal(true);
  };

  const handleSubmitVerification = async () => {
    if (!selectedRequest || !selectedStoreKeeperId) {
      alert('⚠️ Please select a Store Keeper');
      return;
    }

    try {
      setSubmitting(true);

      // Find the selected store keeper's name
      const selectedStoreKeeperObj = storeKeepers.find(sk => sk.Id === selectedStoreKeeperId);
      const storeKeeperName = selectedStoreKeeperObj?.FullName || 'Store Keeper';

      const forwardingPayload = {
        verificationId: String(selectedRequest.id),
        forwardedToUserId: selectedStoreKeeperId,
        forwardedToName: storeKeeperName,
        forwardedByUserId: user?.user_id || 'system-user',
        forwardedByName: user?.user_name || 'System',
        forwardNotes: verificationNotes || 'Please verify item availability from the store.'
      };

      const response = await fetch('http://localhost:3001/api/inventory/forward-verification-to-storekeeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forwardingPayload)
      });
      const result = await response.json();

      if (result.success) {
        setVerificationSubmitted(true);
        setSubmittedVerificationId(selectedRequest.id);
        
        // Refresh the list after a delay
        setTimeout(async () => {
          await fetchPendingVerifications();
        }, 3000);
      } else {
        console.error('❌ Forwarding failed:', result.error);
        alert('❌ Failed to forward verification: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error forwarding verification:', err);
      alert('❌ Error forwarding verification: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getPendingCount = () => verificationRequests.filter(r => {
    const status = (r.status || '').toLowerCase();
    return status === 'pending' || status === 'submitted' || status === 'under_review' || status === 'forwarded';
  }).length;
  const getVerifiedCount = () => verificationRequests.filter(r => (r.status || '').toLowerCase().startsWith('verified')).length;
  const getVerifiedAvailableCount = () => verificationRequests.filter(r => (r.status || '').toLowerCase() === 'verified_available').length;
  const getVerifiedPartialCount = () => verificationRequests.filter(r => (r.status || '').toLowerCase() === 'verified_partial').length;
  const getVerifiedUnavailableCount = () => verificationRequests.filter(r => (r.status || '').toLowerCase() === 'verified_unavailable').length;

  const getFilteredRequests = () => {
    if (!statusFilter) {
      // Show only pending when no filter selected
      return verificationRequests.filter(r => {
        const status = (r.status || '').toLowerCase();
        return status === 'pending' || status === 'submitted' || status === 'under_review' || status === 'forwarded';
      });
    }
    // Show requests matching the selected status
    return verificationRequests.filter(r => r.status === statusFilter);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Pending Card */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === null ? 'border-yellow-500 border-2 bg-yellow-50' : ''}`}
          onClick={() => setStatusFilter(null)}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{getPendingCount()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Verified Available Card */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'verified_available' ? 'border-green-500 border-2 bg-green-50' : ''}`}
          onClick={() => setStatusFilter('verified_available')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Available</p>
              <p className="text-3xl font-bold text-green-600">{getVerifiedAvailableCount()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Verified Partial Card */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'verified_partial' ? 'border-orange-500 border-2 bg-orange-50' : ''}`}
          onClick={() => setStatusFilter('verified_partial')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Partial</p>
              <p className="text-3xl font-bold text-orange-600">{getVerifiedPartialCount()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Verified Unavailable Card */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${statusFilter === 'verified_unavailable' ? 'border-red-500 border-2 bg-red-50' : ''}`}
          onClick={() => setStatusFilter('verified_unavailable')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Unavailable</p>
              <p className="text-3xl font-bold text-red-600">{getVerifiedUnavailableCount()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Total</p>
              <p className="text-3xl font-bold text-blue-600">{verificationRequests.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Requests List */}
      <Card className="shadow-lg border-2 border-indigo-200">
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            Pending Inventory Verifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {verificationRequests.length === 0 || getFilteredRequests().length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-600">No verifications found for selected filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredRequests().map((request) => (
                <div key={request.id}>
                  <div
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{request.item_nomenclature || request.item_master_id}</h4>
                        <Badge
                          variant={
                            request.status === 'pending'
                              ? 'secondary'
                              : request.status?.startsWith('verified')
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {request.status === 'pending' && 'Pending'}
                          {request.status === 'verified_available' && '✅ Available'}
                          {request.status === 'verified_partial' && '⚠️ Partial'}
                          {request.status === 'verified_unavailable' && '❌ Unavailable'}
                          {!['pending', 'verified_available', 'verified_partial', 'verified_unavailable'].includes(request.status) && request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                      {request.status === 'forwarded' && request.forwarded_by_name && (
                        <p className="text-xs text-blue-700 font-semibold mb-2">
                          Forwarded by {request.forwarded_by_name}{request.forwarded_to_name ? ` to ${request.forwarded_to_name}` : ''}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Button size="sm" variant="default" onClick={() => handleQuickAction(request, 'approve')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleQuickAction(request, 'reject')}>
                          Disapprove
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuickAction(request, 'forward')}>
                          Forward
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Quantity Requested</p>
                          <p className="text-lg font-bold text-gray-900">{request.requested_quantity ?? request.available_quantity ?? 0}</p>
                        </div>
                        <div>
                          <p className="font-medium">Wing</p>
                          <p className="text-gray-900">{request.wing_name}</p>
                        </div>
                        <div>
                          <p className="font-medium">Created</p>
                          <p className="text-gray-900">{new Date(request.requested_at).toLocaleDateString()}</p>
                        </div>
                        {request.status !== 'pending' && (
                          <div>
                            <p className="font-medium">Verified By</p>
                            <p className="text-gray-900">{request.verified_by_name || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {['pending', 'forwarded'].includes(request.status) && (
                      <Button
                        onClick={() => handleViewDetails(request)}
                        className="ml-4 whitespace-nowrap"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Verify Item
                      </Button>
                    )}
                    {request.status !== 'pending' && (
                      <div className="ml-4">
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Show verification details if verified */}
                  {request.status !== 'pending' && request.verified_by_name && (
                    <div className="ml-0 p-4 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                      <div className="flex items-start gap-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="font-semibold text-gray-900">Verification Feedback</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Status</p>
                              <p className="font-bold text-teal-600">
                                {request.status === 'verified_available' && '✅ Available'}
                                {request.status === 'verified_partial' && '⚠️ Partially Available'}
                                {request.status === 'verified_unavailable' && '❌ Unavailable'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Physical Count</p>
                              <p className="font-bold text-gray-900">{request.physical_count || request.available_quantity || 0} units</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-gray-600">Verified By</p>
                              <p className="font-semibold text-gray-900">{request.verified_by_name}</p>
                            </div>
                            {request.verification_notes && (
                              <div className="col-span-2">
                                <p className="text-gray-600">Notes</p>
                                <p className="font-medium text-gray-900 bg-white p-2 rounded border border-blue-100">
                                  {request.verification_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      {showModal && itemDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-600" />
                  {verificationSubmitted ? 'Verification Sent ✅' : selectedRequest.status === 'pending' ? 'Forward to Store Keeper' : 'View Verification Details'}
                </CardTitle>
                {selectedRequest.status !== 'pending' && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    View Only
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!verificationSubmitted ? (
                <>
                  {/* Item Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Item</p>
                      <p className="font-semibold text-gray-900">{itemDetails.nomenclature}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity Requested</p>
                      <p className="font-semibold text-gray-900">{itemDetails.requested_quantity}</p>
                    </div>
                  </div>

                  {/* Availability Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Available Stock Levels</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Wing Store Available</p>
                        <p className="text-2xl font-bold text-teal-600">{itemDetails.wing_available}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Admin Store Available</p>
                        <p className="text-2xl font-bold text-blue-600">{itemDetails.admin_available}</p>
                      </div>
                    </div>
                  </div>

                  {/* Store Keeper Selection - Only show if PENDING */}
                  {selectedRequest.status === 'pending' ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900">🏪 Select Wing Store Keeper</p>
                    <p className="text-xs text-gray-600 mb-2">Send this verification request to the store keeper of {selectedRequest.wing_name} wing</p>
                    {storeKeepers.length > 0 ? (
                      <select
                        value={selectedStoreKeeperId}
                        onChange={(e) => setSelectedStoreKeeperId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        <option value="">-- Select a Store Keeper --</option>
                        {storeKeepers.map((sk) => (
                          <option key={sk.Id} value={sk.Id}>
                            {sk.FullName} ({sk.UserName})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">⚠️ No store keepers found for this wing</p>
                      </div>
                    )}
                  </div>
                  ) : (
                    // VIEW ONLY - Show who verified it
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">Verification Status</p>
                      <div className="p-3 border rounded-lg bg-gray-50">
                        {selectedRequest.status === 'verified_available' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-600">✅ Available</span>
                          </div>
                        )}
                        {selectedRequest.status === 'verified_partial' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <span className="font-semibold text-orange-600">⚠️ Partially Available</span>
                          </div>
                        )}
                        {selectedRequest.status === 'verified_unavailable' && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="font-semibold text-red-600">❌ Unavailable</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Forwarding Notes - Only for PENDING */}
                  {selectedRequest.status === 'pending' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        📝 Additional Notes (Optional)
                      </label>
                      <textarea
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Add any notes for the store keeper about what to verify, special items to check, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-600"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* View Only Notes - for verified items */}
                  {selectedRequest.status !== 'pending' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Verification Notes
                      </label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
                        {selectedRequest.verification_notes || 'No notes provided'}
                      </div>
                    </div>
                  )}

                  {/* Verified By Information - Show only for verified items */}
                  {selectedRequest.status !== 'pending' && selectedRequest.verified_by_name && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Verification Information</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Verified By</p>
                          <p className="font-semibold text-gray-900">{selectedRequest.verified_by_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Verified On</p>
                          <p className="font-semibold text-gray-900">
                            {selectedRequest.verified_at 
                              ? new Date(selectedRequest.verified_at).toLocaleDateString() 
                              : 'Recently'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    {selectedRequest.status === 'pending' ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowModal(false);
                            setSelectedRequest(null);
                            setItemDetails(null);
                            setVerificationSubmitted(false);
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitVerification}
                          disabled={submitting || !selectedStoreKeeperId}
                          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {submitting ? 'Sending...' : 'Send to Store Keeper'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowModal(false);
                          setSelectedRequest(null);
                          setItemDetails(null);
                          setVerificationSubmitted(false);
                        }}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-900 mb-3">
                          ✅ Verification Submitted Successfully!
                        </h3>
                        <div className="space-y-3 text-sm text-green-800">
                          <div className="bg-white p-3 rounded border border-green-200">
                            <p className="font-medium mb-1">Reference ID: #{submittedVerificationId}</p>
                            <p className="text-xs text-gray-600">
                              Item: <strong>{itemDetails.nomenclature}</strong>
                            </p>
                          </div>

                          <div>
                            <p className="font-medium mb-2">What happens next:</p>
                            <ul className="list-disc list-inside space-y-1 ml-1">
                              <li>Your verification is recorded in the system</li>
                              <li>The wing supervisor will see your findings</li>
                              <li>They will proceed with approval based on your verification</li>
                              <li>If item was unavailable, procurement will be initiated</li>
                            </ul>
                          </div>

                          <div className="bg-white p-3 rounded border border-green-200">
                            <p className="text-xs font-medium">Result: <strong>{verificationResult.toUpperCase()}</strong></p>
                            <p className="text-xs font-medium mt-1">Quantity Found: <strong>{availableQuantity}</strong></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button
                      onClick={() => {
                        setShowModal(false);
                        setSelectedRequest(null);
                        setItemDetails(null);
                        setVerificationSubmitted(false);
                        setVerificationNotes('');
                        setVerificationResult('available');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Got It, Close Modal
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PendingVerificationsPage;
