import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invmisApi } from '@/services/invmisApi';
import { ItemMaster, CreateItemMasterRequest } from '@/types/tender';
import { useToast } from '@/hooks/use-toast';

export const useItemMasterData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all Item Masters from local SQL Server
  const { 
    data: itemMastersResponse, 
    isLoading: itemMastersLoading,
    error: itemMastersError 
  } = useQuery({
    queryKey: ['itemMasters'],
    queryFn: async () => {
      try {
        const response = await invmisApi.items.getAll();
        
        if (!response.success) {
          throw new Error('Failed to fetch item masters');
        }

        return response.items || [];
      } catch (error: any) {
        console.error('Error fetching item masters:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });

  // Create Item Master mutation
  const createItemMasterMutation = useMutation({
    mutationFn: async (itemData: CreateItemMasterRequest) => {
      const response = await invmisApi.items.create(itemData);
      
      if (!response.success) {
        throw new Error('Failed to create item master');
      }
      
      return response.item;
    },
    onSuccess: (data) => {
      // Invalidate and refetch item masters
      queryClient.invalidateQueries({ queryKey: ['itemMasters'] });
      
      toast({
        title: "Success",
        description: "Item master created successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error creating item master:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create item master",
        variant: "destructive",
      });
    },
  });

  // Update Item Master mutation
  const updateItemMasterMutation = useMutation({
    mutationFn: async ({ id, itemData }: { id: string; itemData: Partial<CreateItemMasterRequest> }) => {
      const response = await invmisApi.items.update(id, itemData);
      
      if (!response.success) {
        throw new Error('Failed to update item master');
      }
      
      return response.item;
    },
    onSuccess: (data) => {
      // Invalidate and refetch item masters
      queryClient.invalidateQueries({ queryKey: ['itemMasters'] });
      
      toast({
        title: "Success",
        description: "Item master updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error updating item master:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update item master",
        variant: "destructive",
      });
    },
  });

  // Delete Item Master mutation
  const deleteItemMasterMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await invmisApi.items.delete(id);
      
      if (!response.success) {
        throw new Error('Failed to delete item master');
      }
      
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch item masters
      queryClient.invalidateQueries({ queryKey: ['itemMasters'] });
      
      toast({
        title: "Success",
        description: "Item master deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting item master:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete item master",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const createItemMaster = async (itemData: CreateItemMasterRequest) => {
    return createItemMasterMutation.mutateAsync(itemData);
  };

  const updateItemMaster = async (id: string, itemData: Partial<CreateItemMasterRequest>) => {
    return updateItemMasterMutation.mutateAsync({ id, itemData });
  };

  const deleteItemMaster = async (id: string) => {
    return deleteItemMasterMutation.mutateAsync(id);
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['itemMasters'] });
  };

  return {
    // Data
    itemMasters: itemMastersResponse || [],
    
    // Loading states
    isLoading: itemMastersLoading,
    isCreating: createItemMasterMutation.isPending,
    isUpdating: updateItemMasterMutation.isPending,
    isDeleting: deleteItemMasterMutation.isPending,
    
    // Error states
    error: itemMastersError,
    createError: createItemMasterMutation.error,
    updateError: updateItemMasterMutation.error,
    deleteError: deleteItemMasterMutation.error,
    
    // Functions
    createItemMaster,
    updateItemMaster,
    deleteItemMaster,
    refreshData,
  };
};
