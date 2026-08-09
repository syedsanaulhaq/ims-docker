
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderLocalService } from '@/services/reorderLocalService';
import { ReorderRequest } from './useReorderRequests';
import { useToast } from '@/hooks/use-toast';

// Type guard for ReorderRequest array
function isReorderRequestArray(obj: any): obj is ReorderRequest[] {
  return Array.isArray(obj) && (obj.length === 0 || (obj[0] && typeof obj[0].id === 'string'));
}

// Extract data from API response using the same logic as categories
const extractResponseData = <T>(response: any): T | null => {
  if (!response) return null;
  
  // Try to extract from .data or directly
  const raw = response?.data ?? response;
  return raw as T;
};

export const useApiReorderRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for all reorder requests

  const {
    data: reorderRequestsRaw,
    isLoading,
    error
  } = useQuery({
    queryKey: ['reorderRequests'],
    queryFn: async () => {
      return await reorderLocalService.getAll();
    },
  });

  // Always use an array for downstream logic
  const reorderRequests = Array.isArray(reorderRequestsRaw) ? reorderRequestsRaw : [];

  // Mutations
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      // Map UI requestData to Local Service type
      const localData = {
        item_master_id: requestData.itemId,
        office_id: requestData.officeId || '1', // Default office if not provided
        current_stock: requestData.currentStock,
        minimum_level: requestData.minimumStock,
        reorder_level: requestData.reorderLevel || requestData.minimumStock,
        suggested_quantity: requestData.suggestedQuantity || Math.max(requestData.minimumStock - requestData.currentStock, 0),
        priority: requestData.priority || 'Medium',
        requested_by: requestData.requestedBy || 'System',
        remarks: requestData.remarks,
      };
      return await reorderLocalService.create(localData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorderRequests'] });
      toast({
        title: "Success",
        description: "Reorder request created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reorder request",
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' }) => {
      return await reorderLocalService.update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorderRequests'] });
      toast({
        title: "Success",
        description: "Reorder request status updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reorder request",
        variant: "destructive"
      });
    }
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      return await reorderLocalService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorderRequests'] });
      toast({
        title: "Success",
        description: "Reorder request deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reorder request",
        variant: "destructive"
      });
    }
  });

  // Helper functions
  const getPendingRequests = () => 
    reorderRequests.filter(request => request.status === 'Pending');

  const getRequestForItem = (itemId: string) => 
    reorderRequests.find(request => request.item_master_id === itemId && request.status === 'Pending');

  const addReorderRequest = async (item: any) => {
    const requestData = {
      itemId: item.id,
      itemName: item.name,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock
    };

    createRequestMutation.mutate(requestData);
  };

  return {
    // Data
    reorderRequests,
    
    // Loading states
    isLoading,
    
    // Error states
    error,
    
    // Helper functions
    getPendingRequests,
    getRequestForItem,
    addReorderRequest,
    
    // Mutations
    updateRequestStatus: updateStatusMutation.mutate,
    deleteRequest: deleteRequestMutation.mutate,
    
    // Mutation states
    isCreatingRequest: createRequestMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeletingRequest: deleteRequestMutation.isPending,
  };
};
