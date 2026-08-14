import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getApiBaseUrl } from '@/services/invmisApi';
import {
  Plus,
  Minus,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IssuanceItem {
  id: string;
  inventory_id?: string;
  item_master_id?: string;
  item_name: string;
  nomenclature: string;
  requested_quantity: number;
  unit: string;
  item_type: 'inventory' | 'custom';
  custom_item_name?: string;
  item_return_reason?: string;
}

interface ReturnedRequest {
  id: string;
  request_id: string;
  request_type: string;
  current_status: string;
  submitted_date: string;
  submitted_by_name: string;
  workflow_name?: string;
  returned_date: string;
  return_reason?: string;
  items?: any[];
}

const ReturnedRequestEditPage: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<ReturnedRequest | null>(null);
  const [returnedRequest, setReturnedRequest] = useState<any>(null);
  const [issuanceItems, setIssuanceItems] = useState<IssuanceItem[]>([]);
  const [purpose, setPurpose] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [justification, setJustification] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadReturnedRequest(id);
    }
  }, [id]);

  const loadReturnedRequest = async (approvalId: string) => {
    try {
      setIsLoading(true);
      // First, load the returned request information to get the actual request_id
      const returnedResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/my-returned-requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (returnedResponse.ok) {
        const returnedData = await returnedResponse.json();
        if (returnedData.success && returnedData.data) {
          const returnedReq = returnedData.data.find((r: any) => r.id === approvalId);
          if (returnedReq) {
            setReturnedRequest(returnedReq);

            // Now load the stock issuance request using the correct request_id
            const requestResponse = await fetch(`${getApiBaseUrl()}/stock-issuance/requests/${returnedReq.request_id}?returned_approval_id=${approvalId}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (requestResponse.ok) {
              const requestData = await requestResponse.json();
              if (requestData.success && requestData.data) {
                const req = requestData.data;
                setRequest(req);
                setPurpose(req.purpose || '');
                setUrgencyLevel(req.urgency_level || 'Normal');
                setJustification(req.justification || '');

                // Load items
                if (req.items && req.items.length > 0) {
                  const loadedItems = req.items.map((item: any) => ({
                    id: item.id || `item-${Date.now()}-${Math.random()}`,
                    inventory_id: item.item_master_id,
                    item_master_id: item.item_master_id,
                    item_name: item.nomenclature || item.item_name,
                    nomenclature: item.nomenclature || item.item_name,
                    requested_quantity: item.requested_quantity,
                    unit: item.unit || 'Each',
                    item_type: item.custom_item_name ? 'custom' : 'inventory',
                    custom_item_name: item.custom_item_name || '',
                    item_return_reason: item.item_return_reason || ''
                  }));
                  setIssuanceItems(loadedItems);
                }
              } else {
                console.error('📝 Failed to load request data:', requestData);
                setError(`Failed to load stock issuance request data: ${requestData.error || 'Unknown error'}`);
              }
            } else {
              const errorText = await requestResponse.text();
              console.error('📝 Request failed:', requestResponse.status, errorText);
              setError(`Failed to load stock issuance request: ${requestResponse.status} ${requestResponse.statusText} - ${errorText}`);
            }
          } else {
            setError('Returned request not found');
          }
        } else {
          setError('Failed to load returned requests data');
        }
      } else {
        setError('Failed to load returned request information');
      }
    } catch (error: any) {
      console.error('❌ Error loading returned request:', error);
      setError('Failed to load request: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setIssuanceItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, requested_quantity: newQuantity }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setIssuanceItems(items => items.filter(item => item.id !== itemId));
  };

  const validateForm = () => {
    if (!purpose.trim()) {
      setError('Purpose is required');
      return false;
    }

    if (issuanceItems.length === 0) {
      setError('At least one item must be requested');
      return false;
    }

    for (const item of issuanceItems) {
      if (item.requested_quantity <= 0) {
        setError('All items must have a quantity greater than 0');
        return false;
      }
    }

    return true;
  };

  const submitUpdatedRequest = async () => {
    if (!validateForm() || !id) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        purpose,
        urgency_level: urgencyLevel,
        justification: justification || undefined,
        items: issuanceItems.map(item => ({
          item_master_id: item.item_type === 'inventory' ? item.item_master_id : undefined,
          nomenclature: item.nomenclature,
          requested_quantity: item.requested_quantity,
          unit_price: 0, // Default unit price, can be updated later
          item_type: item.item_type,
          custom_item_name: item.item_type === 'custom' ? item.custom_item_name : undefined
        }))
      };

      const response = await fetch(`${getApiBaseUrl()}/stock-issuance/requests/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Request updated and resubmitted for approval successfully!');

          // Navigate back to my requests after a delay
          setTimeout(() => {
            navigate('/dashboard/my-requests');
          }, 2000);
        } else {
          setError('Failed to update request: ' + (result.error || 'Unknown error'));
        }
      } else {
        setError('Failed to update request');
      }
    } catch (error: any) {
      console.error('❌ Error updating request:', error);
      setError('Failed to update request: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load returned request. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/my-requests')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Requests
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Returned Request</h1>
              <p className="text-gray-600 mt-1">Modify and resubmit your returned request</p>
            </div>
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
              Returned for Revision
            </Badge>
          </div>
        </div>

        {/* Return Reason Alert */}
        {returnedRequest?.return_reason && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Return Reason:</strong> {returnedRequest.return_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Request Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the purpose of this request"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select value={urgencyLevel} onValueChange={(value: any) => setUrgencyLevel(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="justification">Additional Justification</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Provide additional justification if needed"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Requested Items ({issuanceItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issuanceItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{item.nomenclature}</h4>
                      {item.item_type === 'custom' && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Unit: {item.unit}</p>
                    {item.item_return_reason && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                        <strong>Return Reason:</strong> {item.item_return_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.requested_quantity - 1)}
                      disabled={item.requested_quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>

                    <span className="w-16 text-center font-medium">
                      {item.requested_quantity}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.requested_quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={issuanceItems.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={submitUpdatedRequest}
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update & Resubmit Request
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReturnedRequestEditPage;