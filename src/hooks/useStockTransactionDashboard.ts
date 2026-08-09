import { useQuery } from '@tanstack/react-query';
import { invmisApi } from '@/services/invmisApi';

export interface StockTransactionDashboardStats {
  totalTenders: number;
  activeTenders: number;
  finalizedTenders: number;
  totalItems: number;
  totalQuantity: number;
  tendersWithStockTransactions: number;
  tendersWithoutStockTransactions: number;
  acquisitionStats: {
    'Contract/Tender': {
      count: number;
      items: number;
      quantity: number;
    };
    'Petty Purchase': {
      count: number;
      items: number;
      quantity: number;
    };
  };
  // New separated arrays
  tendersWithStock: Array<{
    id: string;
    title: string;
    tenderNumber: string;
    acquisitionType: 'Contract/Tender' | 'Petty Purchase';
    is_finalized: boolean;
    createdAt: string;
    itemCount: number;
    totalQuantity: number;
    hasStockTransactions: boolean;
    status: string;
  }>;
  tendersAwaitingStock: Array<{
    id: string;
    title: string;
    tenderNumber: string;
    acquisitionType: 'Contract/Tender' | 'Petty Purchase';
    is_finalized: boolean;
    createdAt: string;
    itemCount: number;
    totalQuantity: number;
    hasStockTransactions: boolean;
    status: string;
  }>;
  // Keep backwards compatibility
  recentTenders: Array<{
    id: string;
    title: string;
    tenderNumber: string;
    acquisitionType: 'Contract/Tender' | 'Petty Purchase';
    is_finalized: boolean;
    createdAt: string;
    itemCount: number;
    totalQuantity: number;
    hasStockTransactions?: boolean;
    status?: string;
  }>;
}

export const useStockTransactionDashboard = () => {
  const {
    data: stats,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['stock-transaction-dashboard-stats-v2'], // Updated key to force refresh
    queryFn: async () => {
      const response = await invmisApi.dashboard.getSummary();
      
      if (!response) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      return response;
    },
    staleTime: 0, // Always fetch fresh data for now
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  const dashboardStats: StockTransactionDashboardStats = (stats as any) || {
    totalTenders: 0,
    activeTenders: 0,
    finalizedTenders: 0,
    totalItems: 0,
    totalQuantity: 0,
    tendersWithStockTransactions: 0,
    tendersWithoutStockTransactions: 0,
    acquisitionStats: {
      'Contract/Tender': { count: 0, items: 0, quantity: 0 },
      'Petty Purchase': { count: 0, items: 0, quantity: 0 }
    },
    tendersWithStock: [],
    tendersAwaitingStock: [],
    recentTenders: []
  };

  // Ensure acquisitionStats exists even if API doesn't return it
  if (dashboardStats.acquisitionStats === undefined) {
    dashboardStats.acquisitionStats = {
      'Contract/Tender': { count: 0, items: 0, quantity: 0 },
      'Petty Purchase': { count: 0, items: 0, quantity: 0 }
    };
  }

  return {
    stats: dashboardStats,
    isLoading,
    error,
    isError,
    isSuccess: !isError && !isLoading
  };
};
