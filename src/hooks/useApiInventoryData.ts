import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/services/inventoryApi';
import { itemMasterApi } from '@/services/itemMasterApi';
import { inventoryLocalService } from '@/services/inventoryLocalService';
import { Vendor } from '@/types/vendor';
import { useToast } from '@/hooks/use-toast';

// Updated types to match your actual API response
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  itemType: 'Deadlock Items' | 'Consumable Items';
  unitPrice: number | null;
  vendorId: string;
}

export interface RawInventoryItem {
  id: string;
  name: string;
  category: string; // This is an ID from backend
  currentStock: number;
  minimumStock: number;
  unit: string;
  location: string; // This is an ID from backend
  status: string; // Backend returns "Active" instead of stock status
  itemType: 'Deadlock Items' | 'Consumable Items';
  unitPrice: number | null;
  vendorId: string;
  itemMasterId: string; // Reference to item master
  categories?: any; // For category name lookup
  sub_categories?: any; // For subcategory name lookup
}

export interface Transaction {
  id: string;
  type: 'Purchase' | 'Issuance';
  date: string;
  amount: number;
  description?: string;
  status?: string;
  item?: string;
  quantity?: number;
}

export interface StockTransaction {
  id: string;
  vendorId: string;
  procurementProcedure: string;
  transactionDate: string;
  transactionType?: 'In' | 'Out';
  item?: string;
  quantity?: number;
  status?: 'Pending' | 'Completed' | 'Verified';
  remarks?: string;
}

// Fallback data when API returns empty results
const fallbackVendors: Vendor[] = [
  {
    id: '1',
    vendor_code: 'VENDOR-001',
    vendor_name: 'Tech Solutions Ltd',
    contact_person: 'John Doe',
    email: 'contact@techsolutions.com',
    phone: '+1-555-0123',
    address: '123 Tech Street',
    city: 'Karachi',
    country: 'Pakistan',
    tax_number: 'TAX-001',
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    vendor_code: 'VENDOR-002',
    vendor_name: 'Office Supplies Co',
    contact_person: 'Jane Smith',
    email: 'sales@officesupplies.com',
    phone: '+1-555-0456',
    address: '456 Supply Avenue',
    city: 'Lahore',
    country: 'Pakistan',
    tax_number: 'TAX-002',
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const fallbackStockTransactions: StockTransaction[] = [
  {
    id: 'ST-001',
    vendorId: 'VENDOR-001',
    procurementProcedure: 'Direct Purchase',
    transactionDate: new Date().toISOString(),
    transactionType: 'In',
    item: 'Sample Laptop',
    quantity: 10,
    status: 'Completed'
  },
  {
    id: 'ST-002',
    vendorId: 'VENDOR-002',
    procurementProcedure: 'Standard Order',
    transactionDate: new Date(Date.now() - 86400000).toISOString(),
    transactionType: 'Out',
    item: 'Office Supplies',
    quantity: 5,
    status: 'Verified'
  }
];

const fallbackInventoryItems: RawInventoryItem[] = [
  {
    id: 'INV-001',
    name: 'Fallback Laptop',
    category: 'IT Equipment',
    currentStock: 5,
    minimumStock: 2,
    unit: 'PCS',
    location: 'Main Store',
    status: 'Active',
    itemType: 'Deadlock Items',
    unitPrice: 150000,
    vendorId: '1',
    itemMasterId: 'IM-001'
  }
];

const fallbackTransactions: Transaction[] = [
  {
    id: 'TR-001',
    type: 'Purchase',
    date: new Date().toISOString(),
    amount: 150000,
    description: 'Fallback purchase transaction'
  }
];

const fallbackCategories = [
  { CategoryName: 'IT Equipment', name: 'IT Equipment', id: '1' },
  { CategoryName: 'Stationery', name: 'Stationery', id: '2' },
  { CategoryName: 'Furniture', name: 'Furniture', id: '3' }
];

export const useApiInventoryData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries with proper error handling
  const { 
    data: inventoryItemsResponse, 
    isLoading: itemsLoading,
    error: itemsError 
  } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => inventoryApi.getInventoryItems(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const {
    data: itemMastersResponse,
    isLoading: itemMastersLoading
  } = useQuery({
    queryKey: ['itemMasters'],
    queryFn: () => itemMasterApi.getItemMasters(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: vendorsResponse, 
    isLoading: vendorsLoading 
  } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => inventoryApi.getVendors(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: storesResponse, 
    isLoading: storesLoading 
  } = useQuery({
    queryKey: ['stores'],
    queryFn: () => inventoryApi.getStores(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: transactionsResponse, 
    isLoading: transactionsLoading 
  } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => inventoryApi.getTransactions(),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: stockTransactionsResponse, 
    isLoading: stockTransactionsLoading 
  } = useQuery({
    queryKey: ['stockTransactions'],
    queryFn: () => inventoryApi.getStockTransactions(),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: statsResponse, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: () => inventoryApi.getStats(),
    staleTime: 1 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: categoriesResponse, 
    isLoading: categoriesLoading 
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => Promise.resolve(fallbackCategories), // Using fallback data since API method doesn't exist
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const { 
    data: officesResponse, 
    isLoading: officesLoading 
  } = useQuery({
    queryKey: ['offices'],
    queryFn: () => inventoryLocalService.getOffices(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: inventoryApi.createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] });
      toast({
        title: "Success",
        description: "Inventory item created successfully"
      });
    },
    onError: (error: any) => {
      
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive"
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: (updateData: any) => {
      
      return inventoryApi.updateInventoryItem(updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] });
      toast({
        title: "Success",
        description: "Inventory item updated successfully"
      });
    },
    onError: (error: any) => {
      
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory item",
        variant: "destructive"
      });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: inventoryApi.deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] });
      toast({
        title: "Success",
        description: "Inventory item deleted successfully"
      });
    },
    onError: (error: any) => {
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item",
        variant: "destructive"
      });
    }
  });

  // Enhanced data extraction with fallback logic
  const extractArrayData = <T>(response: any, fallback: T[] = []): T[] => {
    if (!response) return fallback;
    if (Array.isArray(response)) return response.length > 0 ? response : fallback;
    if (response.data && Array.isArray(response.data)) {
      return response.data.length > 0 ? response.data : fallback;
    }
    return fallback;
  };

  // Transform backend data to frontend structure
  // Create a map for faster lookups
  const rawCategories = extractArrayData(categoriesResponse, fallbackCategories);
  const rawOffices = extractArrayData(officesResponse, []);
  const rawItemMasters = extractArrayData(itemMastersResponse, []);

  const itemMasterMap = new Map(rawItemMasters.map((item: any) => [item.id, item]));

  // Now that we're getting item_name directly from the database, simplify the transformation
  const transformInventoryItems = (rawItems: any[]): InventoryItem[] => {
    return rawItems.map(item => {
      let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
      if (item.currentStock === 0) {
        stockStatus = 'Out of Stock';
      } else if (item.currentStock <= item.minimumStock) {
        stockStatus = 'Low Stock';
      } else {
        stockStatus = 'In Stock';
      }

      return {
        ...item,
        name: item.name || 'Unknown Item', // Use name directly from API
        unit: item.unit || 'N/A', // Use unit directly from API
        category: item.categories?.category_name || 'Unknown',
        subCategory: item.sub_categories?.sub_category_name || 'Unknown',
        location: item.location || 'Unknown',
        status: stockStatus,
        itemType: item.itemType || 'Deadlock Items' // Ensure itemType is preserved
      };
    });
  };

  const rawInventoryItems = extractArrayData<RawInventoryItem>(inventoryItemsResponse, fallbackInventoryItems);

  const inventoryItems = transformInventoryItems(rawInventoryItems);
  const vendors = extractArrayData<Vendor>(vendorsResponse, fallbackVendors);
  const stores = extractArrayData(storesResponse, []);
  const transactions = extractArrayData<Transaction>(transactionsResponse, fallbackTransactions);
  const stockTransactions = extractArrayData<StockTransaction>(stockTransactionsResponse, fallbackStockTransactions);
  const categories = rawCategories;
  const offices = rawOffices;

  // Calculate stats from actual data
  const stats = {
    totalItems: inventoryItems.length,
    lowStockItems: inventoryItems.filter(item => item.currentStock <= item.minimumStock).length,
    totalVendors: vendors.filter(vendor => vendor.status === 'Active').length,
    thisMonthPurchases: transactions.filter(t => t.type === 'Purchase').length
  };

  // Helper functions
  const getLowStockItems = () => 
    inventoryItems.filter(item => item.currentStock <= item.minimumStock);

  const getActiveVendors = () => 
    vendors.filter(vendor => vendor.status === 'Active');

  const getThisMonthPurchases = () => 
    transactions.filter(t => t.type === 'Purchase');

  // Loading state
  const isLoading = itemsLoading || vendorsLoading || storesLoading || transactionsLoading || 
                   stockTransactionsLoading || statsLoading || itemMastersLoading;

  // Refresh functions
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    queryClient.invalidateQueries({ queryKey: ['itemMasters'] });
    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    queryClient.invalidateQueries({ queryKey: ['stores'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['stockTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['inventoryStats'] });
  };

  return {
    // Data
    inventoryItems,
    vendors,
    stores,
    transactions,
    stockTransactions,
    categories,
    offices,
    stats,
    
    // Loading states
    isLoading,
    itemsLoading,
    vendorsLoading,
    storesLoading,
    transactionsLoading,
    stockTransactionsLoading,
    statsLoading,
    categoriesLoading,
    officesLoading,
    itemMastersLoading,
    
    // Error states
    itemsError,
    
    // Helper functions
    getLowStockItems,
    getActiveVendors,
    getThisMonthPurchases,
    refreshData,
    
    // Mutations
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    
    // Mutation states
    isCreatingItem: createItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
  };
};
