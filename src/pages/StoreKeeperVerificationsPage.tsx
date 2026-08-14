import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, Clock, Eye, Edit2, Send, Package } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface ForwardedVerification {
  id: number;
  stock_issuance_id: string;
  item_master_id: string;
  item_nomenclature: string;
  requested_by_user_id: string;
  requested_by_name: string;
  requested_quantity: number;
  verification_status: 'pending' | 'verified_available' | 'verified_partial' | 'verified_unavailable';
  forwarded_by_user_id?: string;
  forwarded_by_name?: string;
  forwarded_at?: string;
  forwarded_to_user_id?: string;
  forwarded_to_name?: string;
  verified_by_user_id?: string;
  verified_by_name?: string;
  physical_count?: number;
  available_quantity?: number;
  verification_notes?: string;
  wing_id: number;
  requester_designation?: string;
  created_at: string;
  verified_at?: string;
}

interface VerificationItemDetail {
  id: string;
  nomenclature: string;
  requested_quantity: number;
  wing_available: number;
  admin_available: number;
}

export const StoreKeeperVerificationsPage: React.FC = () => {
  const { user } = useSession();
  const [verifications, setVerifications] = useState<ForwardedVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<ForwardedVerification | null>(null);
  const [itemDetails, setItemDetails] = useState<VerificationItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationResult, setVerificationResult] = useState<'available' | 'partial' | 'unavailable'>('available');
  const [availableQuantity, setAvailableQuantity] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [submittedVerificationId, setSubmittedVerificationId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch forwarded verifications for this store keeper
  useEffect(() => {
    fetchForwardedVerifications();
  }, [user]);

  const fetchForwardedVerifications = async () => {
    try {
      setLoading(true);
      
      if (!user?.user_id) {
        console.error('User ID not found in session context');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/my-forwarded-verifications?userId=${encodeURIComponent(user.user_id)}`);
      const data = await response.json();
      
      if (data.success) {
        setVerifications(data.data || []);
      } else if (Array.isArray(data)) {
        setVerifications(data);
      } else {
        setVerifications([]);
      }
    } catch (error) {
      console.error('❌ Error fetching forwarded verifications:', error);
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (verification: ForwardedVerification) => {
    setSelectedVerification(verification);
    setVerificationResult('available');
    setVerificationNotes('');
    
    // Fetch detailed inventory information
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemMasterId: verification.item_master_id,
          wingId: verification.wing_id
        })
      });
      const data = await response.json();

      if (data.success) {
        const requestedQty = verification.requested_quantity ?? 0;
        setItemDetails({
          id: String(verification.id),
          nomenclature: verification.item_nomenclature || 'Item',
          requested_quantity: requestedQty,
          wing_available: data.data?.available_quantity || data.wing_available || 0,
          admin_available: data.admin_available || 0
        });
        
        const totalAvailable = (data.data?.available_quantity || data.wing_available || 0) + (data.admin_available || 0);
        setAvailableQuantity(Math.min(totalAvailable, requestedQty));
      } else {
        const requestedQty = verification.requested_quantity ?? 0;
        setItemDetails({
          id: String(verification.id),
          nomenclature: verification.item_nomenclature || 'Item',
          requested_quantity: requestedQty,
          wing_available: 0,
          admin_available: 0
        });
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      const requestedQty = verification.requested_quantity ?? 0;
      setItemDetails({
        id: String(verification.id),
        nomenclature: verification.item_nomenclature || 'Item',
        requested_quantity: requestedQty,
        wing_available: 0,
        admin_available: 0
      });
    }
    
    setShowModal(true);
  };

  const handleSubmitVerification = async () => {
    if (!selectedVerification) return;

    try {
      setSubmitting(true);
      
      const statusMap: { [key: string]: string } = {
        'available': 'verified_available',
        'partial': 'verified_partial',
        'unavailable': 'verified_unavailable'
      };

      const verificationPayload = {
        verificationId: String(selectedVerification.id),
        verificationStatus: statusMap[verificationResult] || 'verified_available',
        physicalCount: availableQuantity,
        availableQuantity: availableQuantity,
        verificationNotes: verificationNotes,
        verifiedByUserId: user?.user_id || 'system-user',
        verifiedByName: user?.user_name || 'System'
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/update-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationPayload)
      });
      const result = await response.json();

      if (result.success) {
        setVerificationSubmitted(true);
        setSubmittedVerificationId(selectedVerification.id);
        
        setTimeout(async () => {
          await fetchForwardedVerifications();
        }, 3000);
      } else {
        console.error('❌ Verification failed:', result.error);
        alert('❌ Failed to submit verification: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error submitting verification:', err);
      alert('❌ Error submitting verification: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getPendingCount = () => verifications.filter(r => {
    const status = (r.verification_status || '').toLowerCase();
    return status === 'pending';
  }).length;

  const getVerifiedCount = () => verifications.filter(r => (r.verification_status || '').toLowerCase().startsWith('verified')).length;
  const getVerifiedAvailableCount = () => verifications.filter(r => (r.verification_status || '').toLowerCase() === 'verified_available').length;
  const getVerifiedPartialCount = () => verifications.filter(r => (r.verification_status || '').toLowerCase() === 'verified_partial').length;
  const getVerifiedUnavailableCount = () => verifications.filter(r => (r.verification_status || '').toLowerCase() === 'verified_unavailable').length;

  const getFilteredVerifications = () => {
    if (!statusFilter) {
      return verifications.filter(r => {
        const status = (r.verification_status || '').toLowerCase();
        return status === 'pending';
      });
    }
    return verifications.filter(r => r.verification_status === statusFilter);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
          <p className="text-gray-600">Loading verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏪 Store Keeper Verifications</h1>
        <p className="text-gray-600">Verify items that have been forwarded by supervisors</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-5 gap-4">
        {/* Pending Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            statusFilter === null ? 'border-2 border-yellow-400 shadow-lg' : 'border-gray-200'
          }`}
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

        {/* Available Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            statusFilter === 'verified_available' ? 'border-2 border-green-400 shadow-lg' : 'border-gray-200'
          }`}
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

        {/* Partial Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            statusFilter === 'verified_partial' ? 'border-2 border-orange-400 shadow-lg' : 'border-gray-200'
          }`}
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

        {/* Unavailable Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            statusFilter === 'verified_unavailable' ? 'border-2 border-red-400 shadow-lg' : 'border-gray-200'
          }`}
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
              <p className="text-3xl font-bold text-blue-600">{verifications.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List */}
      <Card className="shadow-lg border-2 border-indigo-200">
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            Forwarded Verifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {verifications.length === 0 || getFilteredVerifications().length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-600">No verifications found for selected filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredVerifications().map((verification) => (
                <div key={verification.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-gray-900">{verification.item_nomenclature || 'Item'}</h3>
                        <Badge className="bg-red-100 text-red-800 border-red-300">{verification.verification_status === 'pending' ? 'Pending' : 'Verified'}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Quantity Requested</p>
                          <p className="font-semibold text-gray-900">{verification.requested_quantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Designation</p>
                          <p className="font-semibold text-gray-900">{verification.requester_designation || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Requested By</p>
                          <p className="font-semibold text-gray-900">{verification.requested_by_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Created</p>
                          <p className="font-semibold text-gray-900">{new Date(verification.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {verification.verification_status && verification.verification_status !== 'pending' && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-600 mb-1">Verified by: {verification.verified_by_name || 'N/A'}</p>
                          {verification.verification_notes && (
                            <p className="text-xs text-gray-700 italic">Notes: {verification.verification_notes}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handleViewDetails(verification)}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4" />
                      {verification.verification_status === 'pending' ? 'Verify' : 'View'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      {showModal && selectedVerification && itemDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-gradient-to-r from-teal-50 to-teal-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-600" />
                  {verificationSubmitted ? 'Verification Submitted ✅' : 'Verify Item Inventory'}
                </CardTitle>
                {selectedVerification.verification_status !== 'pending' && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    View Only
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
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

                  {/* Verification Result Selection - Only for PENDING */}
                  {selectedVerification.verification_status === 'pending' ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">Verification Result</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          style={{ borderColor: verificationResult === 'available' ? '#0d9488' : '#e5e7eb' }}>
                          <input
                            type="radio"
                            name="verification"
                            value="available"
                            checked={verificationResult === 'available'}
                            onChange={(e) => {
                              setVerificationResult(e.target.value as 'available' | 'partial' | 'unavailable');
                              setAvailableQuantity(itemDetails.requested_quantity);
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">✅ Available</p>
                            <p className="text-xs text-gray-600">Item is fully available in stock</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          style={{ borderColor: verificationResult === 'partial' ? '#0d9488' : '#e5e7eb' }}>
                          <input
                            type="radio"
                            name="verification"
                            value="partial"
                            checked={verificationResult === 'partial'}
                            onChange={(e) => setVerificationResult(e.target.value as 'available' | 'partial' | 'unavailable')}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">⚠️ Partial</p>
                            <p className="text-xs text-gray-600">Item is available in reduced quantity</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          style={{ borderColor: verificationResult === 'unavailable' ? '#0d9488' : '#e5e7eb' }}>
                          <input
                            type="radio"
                            name="verification"
                            value="unavailable"
                            checked={verificationResult === 'unavailable'}
                            onChange={(e) => {
                              setVerificationResult(e.target.value as 'available' | 'partial' | 'unavailable');
                              setAvailableQuantity(0);
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">❌ Unavailable</p>
                            <p className="text-xs text-gray-600">Item is not available in stock</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">Verification Result</p>
                      <div className="p-3 border rounded-lg bg-gray-50">
                        {selectedVerification.verification_status === 'verified_available' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-600">✅ Available</span>
                          </div>
                        )}
                        {selectedVerification.verification_status === 'verified_partial' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <span className="font-semibold text-orange-600">⚠️ Partially Available</span>
                          </div>
                        )}
                        {selectedVerification.verification_status === 'verified_unavailable' && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="font-semibold text-red-600">❌ Unavailable</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Available Quantity Input (for partial) - Only for PENDING */}
                  {selectedVerification.verification_status === 'pending' && verificationResult === 'partial' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Quantity Found in Stock
                      </label>
                      <input
                        type="number"
                        value={availableQuantity}
                        onChange={(e) => setAvailableQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                        max={Math.max(itemDetails.wing_available, itemDetails.admin_available)}
                        min={0}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  )}

                  {/* Verification Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {selectedVerification.verification_status === 'pending' ? 'Verification Notes' : 'Verified Notes'}
                    </label>
                    <textarea
                      value={verificationNotes}
                      onChange={(e) => {
                        if (selectedVerification.verification_status === 'pending') {
                          setVerificationNotes(e.target.value);
                        }
                      }}
                      placeholder={selectedVerification.verification_status === 'pending' ? "Add any notes about the verification, condition of items, location found, etc." : "View notes from verification"}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg resize-none ${
                        selectedVerification.verification_status === 'pending' 
                          ? 'focus:outline-none focus:ring-2 focus:ring-teal-600' 
                          : 'bg-gray-50 cursor-not-allowed'
                      }`}
                      rows={4}
                      disabled={selectedVerification.verification_status !== 'pending'}
                    />
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
                          ✅ Verification Completed Successfully!
                        </h3>
                        <div className="space-y-3 text-sm text-green-800">
                          <div className="bg-white p-3 rounded border border-green-200">
                            <p className="font-medium mb-1">Verification ID: #{submittedVerificationId}</p>
                            <p className="text-xs text-gray-600">
                              Item: <strong>{itemDetails.nomenclature}</strong>
                            </p>
                          </div>

                          <div>
                            <p className="font-medium mb-2">Result:</p>
                            <p className="ml-2">
                              {verificationResult === 'available' && '✅ Item is Available'}
                              {verificationResult === 'partial' && '⚠️ Item is Partially Available'}
                              {verificationResult === 'unavailable' && '❌ Item is Unavailable'}
                            </p>
                          </div>

                          <p className="text-xs italic text-green-700">
                            The verification result has been recorded in the system.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                {selectedVerification.verification_status === 'pending' && !verificationSubmitted ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedVerification(null);
                        setItemDetails(null);
                        setVerificationSubmitted(false);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitVerification}
                      disabled={submitting}
                      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? 'Submitting...' : 'Submit Verification'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedVerification(null);
                      setItemDetails(null);
                      setVerificationSubmitted(false);
                    }}
                  >
                    Close
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
