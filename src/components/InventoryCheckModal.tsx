import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sessionService } from '@/services/sessionService';

interface InventoryCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemDetails: {
    item_master_id: number | string;
    item_name: string;
    nomenclature?: string;
    requested_quantity: number;
    unit?: string;
  };
  stockIssuanceId: string;
  wingId: number;
  wingName: string;
  currentUser: any;
  onVerificationRequested?: () => void;
  onConfirmAvailable?: () => void;
}

interface InventoryAvailability {
  item_master_id: number;
  item_name: string;
  unit: string;
  requested_quantity: number;
  available_quantity: number;
  is_available: boolean;
  availability_status: string;
}

export const InventoryCheckModal: React.FC<InventoryCheckModalProps> = ({
  isOpen,
  onClose,
  itemDetails,
  stockIssuanceId,
  wingId,
  wingName,
  currentUser,
  onVerificationRequested,
  onConfirmAvailable
}) => {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<InventoryAvailability | null>(null);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [verificationId, setVerificationId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVerificationRequested(false);
      setVerificationId(null);
      checkInventoryAvailability();
    }
  }, [isOpen, itemDetails]);

  const checkInventoryAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/inventory/check-availability', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemMasterId: itemDetails.item_master_id,
          wingId: wingId,
          requestedQuantity: itemDetails.requested_quantity
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAvailability(data.data);
      } else if (response.ok && data.data) {
        // Even if success flag is not set, use the data if response is ok
        setAvailability(data.data);
      } else {
        console.error('❌ Inventory check failed:', data.error || data.details);
        setError(data.error || data.details || 'Failed to check inventory availability');
      }
    } catch (err: any) {
      console.error('❌ Error checking inventory:', err);
      setError(err.message || 'Failed to connect to inventory system');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      setRequestingVerification(true);
      
      // Get user ID from currentUser or from sessionService as fallback
      let userId = currentUser?.user_id || currentUser?.Id;
      let userName = currentUser?.user_name || currentUser?.FullName;
      
      if (!userId) {
        const sessionUser = sessionService.getCurrentUser();
        userId = sessionUser?.user_id;
        userName = sessionUser?.user_name;
      }
      
      const response = await fetch('http://localhost:3001/api/inventory/request-verification', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stockIssuanceId: stockIssuanceId,
          itemMasterId: itemDetails.item_master_id,
          itemNomenclature: itemDetails.nomenclature || itemDetails.item_name || 'Unknown Item',
          requestedQuantity: itemDetails.requested_quantity,
          requestedByUserId: userId,
          requestedByName: userName,
          wingId: wingId,
          wingName: wingName
        })
      });

      const data = await response.json();
      if (data.success) {
        setVerificationRequested(true);
        setVerificationId(data.verificationId);
        if (onVerificationRequested) {
          onVerificationRequested();
        }
      } else {
        console.error('❌ Verification request failed:', data.error || data);
        setError(data.error || 'Failed to request verification');
      }
    } catch (err: any) {
      console.error('❌ Error requesting verification:', err);
      setError(err.message || 'Failed to send verification request');
    } finally {
      setRequestingVerification(false);
    }
  };

  const handleConfirmAvailable = () => {
    if (onConfirmAvailable) {
      onConfirmAvailable();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Check Wing Inventory</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Item Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Item Name</p>
                  <p className="font-medium text-gray-900">{itemDetails.item_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requested Quantity</p>
                  <p className="font-medium text-gray-900">
                    {itemDetails.requested_quantity} {itemDetails.unit || 'units'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Wing</p>
                  <p className="font-medium text-gray-900">{wingName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Requested State */}
          {verificationRequested && (
            <Card className="bg-green-50 border-2 border-green-300">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      ✅ Verification Request Sent!
                    </h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p>
                        <strong>Reference ID:</strong> #{verificationId}
                      </p>
                      <p className="font-medium">What happens next:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Inventory Supervisor will receive this request</li>
                        <li>They will physically verify the item in the wing store</li>
                        <li>You'll be notified once verification is complete</li>
                        <li>You can then proceed with approval based on verification results</li>
                      </ul>
                      <p className="mt-3 text-xs text-green-700">
                        Check the Pending Verifications dashboard to track status
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && !verificationRequested && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Checking inventory...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !verificationRequested && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Availability Results */}
          {!loading && !error && availability && !verificationRequested && (
            <>
              <Card className={`border-2 ${availability.is_available ? 'bg-green-50 border-green-300' : availability.available_quantity > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {availability.is_available ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : availability.available_quantity > 0 ? (
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        {availability.availability_status}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Requested</p>
                          <p className="text-2xl font-bold">
                            {availability.requested_quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Available in Wing Store</p>
                          <p className="text-2xl font-bold">
                            {availability.available_quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-md flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availability.is_available ? (
                    <>
                      <p className="text-sm text-gray-700">
                        ✅ The requested item is available in the wing store. You can:
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li><strong>Confirm & Proceed:</strong> Approve immediately based on system check</li>
                        <li><strong>Request Verification:</strong> Ask Inventory Supervisor to physically verify for accuracy</li>
                      </ul>
                    </>
                  ) : availability.available_quantity > 0 ? (
                    <>
                      <p className="text-sm text-gray-700">
                        ⚠️ <strong>Partial stock available</strong> ({availability.available_quantity} of {availability.requested_quantity} requested).
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li><strong>Verify Partial:</strong> Request supervisor to confirm exact count</li>
                        <li><strong>Split Request:</strong> Approve partial from wing, forward rest to Admin Store</li>
                        <li><strong>Check Admin Store:</strong> Remaining quantity may be available from central store</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700">
                        ❌ <strong>Item not available in wing store.</strong>
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li><strong>Confirm Zero Stock:</strong> Request supervisor to verify item is truly unavailable</li>
                        <li><strong>Forward to Admin:</strong> Check if central store has the item</li>
                        <li><strong>Procurement:</strong> Consider placing a new order if urgent</li>
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={requestingVerification}
            >
              Close
            </Button>
            
            {!verificationRequested && availability && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRequestVerification}
                  disabled={requestingVerification}
                  className="bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {requestingVerification ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Ask Supervisor to Verify
                    </>
                  )}
                </Button>

                {availability.is_available && (
                  <Button
                    onClick={handleConfirmAvailable}
                    disabled={requestingVerification}
                    className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm & Proceed
                  </Button>
                )}
              </>
            )}

            {verificationRequested && (
              <Button
                onClick={onClose}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Got It, Close Modal
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryCheckModal;
