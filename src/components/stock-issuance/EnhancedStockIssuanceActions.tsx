import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileCheck, Loader2 } from 'lucide-react';

interface StockIssuanceRequest {
  id: string;
  request_number: string;
  request_status: string;
  is_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;
}

interface EnhancedStockIssuanceActionsProps {
  request: StockIssuanceRequest;
  onRequestUpdate: () => void;
  userRole?: string;
  userEmail?: string;
}

const EnhancedStockIssuanceActions: React.FC<EnhancedStockIssuanceActionsProps> = ({
  request,
  onRequestUpdate,
  userRole,
  userEmail
}) => {
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if finalize button should be shown
  const canFinalize = () => {
    // Only show if request is Approved or Issued and not already finalized
    const validStatuses = ['Approved', 'Issued'];
    return validStatuses.includes(request.request_status) && !request.is_finalized;
  };

  const handleFinalizeClick = () => {
    setError(null);
    setFinalizeDialogOpen(true);
  };

  const handleFinalizeConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock-issuance/requests/${request.id}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: userEmail || 'system',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to finalize request');
      }

      const result = await response.json();

      // Close dialog and refresh data
      setFinalizeDialogOpen(false);
      onRequestUpdate();
    } catch (err) {
      console.error('Error finalizing request:', err);
      setError(err instanceof Error ? err.message : 'Failed to finalize request');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeCancel = () => {
    setFinalizeDialogOpen(false);
    setError(null);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Show finalized status if already finalized */}
      {request.is_finalized && (
        <Badge variant="secondary" className="flex items-center gap-1 text-green-700 bg-green-100">
          <CheckCircle className="h-3 w-3" />
          Finalized
        </Badge>
      )}

      {/* Show finalize button if conditions are met */}
      {canFinalize() && (
        <Button
          variant="default"
          size="sm"
          onClick={handleFinalizeClick}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <FileCheck className="h-4 w-4 mr-1" />
          Finalize
        </Button>
      )}

      {/* Finalize Confirmation Dialog */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Finalize Stock Issuance Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize this stock issuance request?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Request Details:</h4>
              <p className="text-sm text-gray-600">
                Request Number: {request.request_number}
              </p>
              <p className="text-sm text-gray-600">
                Current Status: {request.request_status}
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                Note: Once finalized, this request cannot be modified further.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleFinalizeCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalizeConfirm}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Finalize Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedStockIssuanceActions;
