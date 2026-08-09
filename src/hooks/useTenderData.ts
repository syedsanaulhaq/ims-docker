
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tendersLocalService } from '@/services/tendersLocalService';
import { CreateTenderRequest, Tender } from '@/types/tender';

// Note: This hook now uses SQL Server through the tendersLocalService

export const useTenderData = () => {
  const queryClient = useQueryClient();

  // Fetch tenders from SQL Server
  const {
    data: tendersResponse,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['tenders'],
    queryFn: async () => {
      
      try {
        const response = await tendersLocalService.getAll();
        
        return response;
      } catch (error: any) {
        
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Extract data from mock API response
  const tenders: Tender[] = tendersResponse?.data || [];

  // Compute stats
  const stats = {
    totalTenders: tenders.length,
    activeTenders: tenders.filter(t => t.tender_status === 'Published').length,
    draftTenders: tenders.filter(t => t.status === 'Draft').length,
    closedTenders: tenders.filter(t => t.status === 'Closed').length,
    totalEstimatedValue: tenders.reduce((sum, t) => sum + t.estimatedValue, 0),
    contractTenders: tenders.filter(t => t.type === 'Contract/Tender').length,
    spotPurchases: tenders.filter(t => t.type === 'Petty Purchase').length,
  };

  const isApiError = isError;

  // Create tender mutation
  const createMutation = useMutation({
    mutationFn: async (tender: CreateTenderRequest) => {
      
      const response = await tendersLocalService.create(tender);
      
      return response;
    },
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      toast.success('Tender created successfully');
    },
    onError: (error: any) => {
      
      toast.error(error.message || 'Failed to create tender');
    },
  });

  // Update tender mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, tender }: { id: string; tender: CreateTenderRequest }) => {
      
      const response = await tendersLocalService.update(id, tender);
      
      return response;
    },
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      toast.success('Tender updated successfully');
    },
    onError: (error: any) => {
      
      toast.error(error.message || 'Failed to update tender');
    },
  });

  // Delete tender mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      
      const response = await tendersLocalService.delete(id);
      
      return response;
    },
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      toast.success('Tender deleted successfully');
    },
    onError: (error: any) => {
      
      toast.error(error.message || 'Failed to delete tender');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Tender['status'] }) => {
      
      const response = await tendersLocalService.updateStatus(id, status);
      
      return response;
    },
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      toast.success('Status updated successfully');
    },
    onError: (error: any) => {
      
      toast.error(error.message || 'Failed to update status');
    },
  });

  return {
    tenders,
    stats,
    isLoading,
    error,
    isApiError,
    createTender: createMutation.mutate,
    updateTender: updateMutation.mutate,
    deleteTender: deleteMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};
