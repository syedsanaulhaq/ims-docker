import React, { useState } from 'react';
import { Eye, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { tendersLocalService } from '@/services/tendersLocalService';
import { sessionService } from '@/services/sessionService';
import { toast } from 'sonner';

interface EnhancedTenderActionsProps {
  tenderId: string;
  tenderStatus?: string;
  isFinalized?: boolean;
  onFinalize?: () => void;
  onViewDialog?: () => void; // For non-finalized tenders to show dialog
}

const EnhancedTenderActions: React.FC<EnhancedTenderActionsProps> = ({ 
  tenderId, 
  tenderStatus,
  isFinalized = false,
  onFinalize,
  onViewDialog
}) => {
  const navigate = useNavigate();
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Debug logging
  const handleFinalize = async () => {
    if (window.confirm('Are you sure you want to finalize this tender? This action cannot be undone.')) {
      try {
        setIsFinalizing(true);
        // Get current user ID from session service
        const userId = sessionService.getCurrentUserId();
        const result = await tendersLocalService.finalize(tenderId, userId);
        
        if (result.success) {
          toast.success('Tender finalized successfully');
          onFinalize?.();
        } else {
          toast.error(result.message || 'Failed to finalize tender');
        }
      } catch (error) {
        toast.error('Failed to finalize tender');
      } finally {
        setIsFinalizing(false);
      }
    }
  };

  const handleViewAction = () => {
    // Navigate to the tender report page for both finalized and non-finalized tenders
    navigate(`/dashboard/tenders/${tenderId}/report`);
  };

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleViewAction}
        className="flex items-center space-x-1"
        title="View stock acquisition report"
      >
        <Eye className="h-4 w-4" />
        <span>View Report</span>
      </Button>
      
      {!isFinalized && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleFinalize}
          disabled={isFinalizing}
          className="flex items-center space-x-1"
          title="Finalize tender"
        >
          <Lock className="h-4 w-4" />
          <span>{isFinalizing ? 'Finalizing...' : 'Finalize'}</span>
        </Button>
      )}
      
      {isFinalized && (
        <Button 
          variant="secondary" 
          size="sm"
          disabled
          className="flex items-center space-x-1"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Finalized</span>
        </Button>
      )}
    </div>
  );
};

export default EnhancedTenderActions;
