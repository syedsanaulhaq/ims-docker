// Clean Stock Transactions Service for SQL Server Backend
// This service handles stock_transactions_clean table operations
const BASE_URL = 'http://localhost:5000/api';

export interface StockTransactionClean {
  id: string;
  tender_id: string;
  item_master_id: string;
  estimated_unit_price: number;
  actual_unit_price: number;
  total_quantity_received: number;
  pricing_confirmed: boolean;
  type: 'IN' | 'OUT';
  remarks?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
  // Related data
  nomenclature?: string;
  specifications?: string;
  unit?: string;
}

export interface CreateStockTransactionClean {
  tender_id: string;
  item_master_id: string;
  estimated_unit_price?: number;
  actual_unit_price?: number;
  total_quantity_received?: number;
  pricing_confirmed?: boolean;
  type?: 'IN' | 'OUT';
  remarks?: string;
}

export interface UpdateStockTransactionClean {
  estimated_unit_price?: number;
  actual_unit_price?: number;
  total_quantity_received?: number;
  pricing_confirmed?: boolean;
  remarks?: string;
}

export const stockTransactionsCleanLocalService = {
  // Get all stock transactions for a tender
  async getByTenderId(tenderId: string): Promise<StockTransactionClean[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean?tender_id=${tenderId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock transactions: ${response.statusText}`);
    }
    return response.json();
  },

  // Get deleted stock transactions for a tender
  async getDeletedByTenderId(tenderId: string): Promise<StockTransactionClean[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean?tender_id=${tenderId}&deleted=true`);
    if (!response.ok) {
      throw new Error(`Failed to fetch deleted stock transactions: ${response.statusText}`);
    }
    return response.json();
  },

  // Get stock transaction by tender and item
  async getByTenderAndItem(tenderId: string, itemMasterId: string): Promise<StockTransactionClean | null> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean?tender_id=${tenderId}&item_master_id=${itemMasterId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock transaction: ${response.statusText}`);
    }
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  },

  // Create new stock transaction
  async create(transaction: CreateStockTransactionClean): Promise<StockTransactionClean> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transaction,
        type: transaction.type || 'IN',
        pricing_confirmed: transaction.pricing_confirmed || false,
        total_quantity_received: transaction.total_quantity_received || 0,
        estimated_unit_price: transaction.estimated_unit_price || 0,
        actual_unit_price: transaction.actual_unit_price || 0,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  // Update stock transaction
  async update(tenderId: string, itemMasterId: string, updates: UpdateStockTransactionClean): Promise<StockTransactionClean> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean/${tenderId}/${itemMasterId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  // Update actual price
  async updateActualPrice(tenderId: string, itemMasterId: string, actualUnitPrice: number): Promise<StockTransactionClean> {
    return this.update(tenderId, itemMasterId, {
      actual_unit_price: actualUnitPrice,
      pricing_confirmed: true
    });
  },

  // Update quantity received
  async updateQuantityReceived(tenderId: string, itemMasterId: string, quantity: number): Promise<StockTransactionClean> {
    return this.update(tenderId, itemMasterId, {
      total_quantity_received: quantity
    });
  },

  // Soft delete stock transaction
  async softDelete(tenderId: string, itemMasterId: string, deletedBy: string = 'user'): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean/${tenderId}/${itemMasterId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deleted_by: deletedBy }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return true;
  },

  // Restore soft deleted stock transaction
  async restore(tenderId: string, itemMasterId: string): Promise<StockTransactionClean> {
    const response = await fetch(`${BASE_URL}/stock-transactions-clean/${tenderId}/${itemMasterId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to restore stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  // Initialize stock transactions from tender items
  async initializeFromTender(tenderId: string, tenderItems: Array<{
    itemMasterId: string;
    nomenclature: string;
    specifications?: string;
    quantity: number;
    estimatedUnitPrice?: number;
  }>): Promise<StockTransactionClean[]> {
    const results: StockTransactionClean[] = [];
    
    for (const item of tenderItems) {
      try {
        // Check if already exists
        const existing = await this.getByTenderAndItem(tenderId, item.itemMasterId);
        
        if (!existing) {
          // Create new record
          const newTransaction = await this.create({
            tender_id: tenderId,
            item_master_id: item.itemMasterId,
            estimated_unit_price: item.estimatedUnitPrice || 0,
            actual_unit_price: 0,
            total_quantity_received: 0,
            pricing_confirmed: false,
            type: 'IN'
          });
          
          results.push(newTransaction);
        } else {
          results.push(existing);
        }
      } catch (error) {
        console.error(`Failed to initialize stock transaction for item ${item.itemMasterId}:`, error);
        // Continue with other items
      }
    }
    
    return results;
  },

  // Get tender pricing summary
  async getTenderSummary(tenderId: string): Promise<{
    totalEstimated: number;
    totalActual: number;
    itemsWithPricing: number;
    totalItems: number;
    completionPercentage: number;
  }> {
    try {
      const transactions = await this.getByTenderId(tenderId);
      
      let totalEstimated = 0;
      let totalActual = 0;
      let itemsWithPricing = 0;
      
      transactions.forEach(transaction => {
        totalEstimated += transaction.estimated_unit_price || 0;
        totalActual += transaction.actual_unit_price || 0;
        if (transaction.pricing_confirmed) {
          itemsWithPricing++;
        }
      });
      
      const completionPercentage = transactions.length > 0 
        ? (itemsWithPricing / transactions.length) * 100 
        : 0;
      
      return {
        totalEstimated,
        totalActual,
        itemsWithPricing,
        totalItems: transactions.length,
        completionPercentage
      };
    } catch (error) {
      console.error('Error getting tender summary:', error);
      return {
        totalEstimated: 0,
        totalActual: 0,
        itemsWithPricing: 0,
        totalItems: 0,
        completionPercentage: 0
      };
    }
  },

  // Bulk update multiple items
  async bulkUpdate(tenderId: string, updates: Array<{
    itemMasterId: string;
    actualUnitPrice?: number;
    totalQuantityReceived?: number;
    pricingConfirmed?: boolean;
  }>): Promise<StockTransactionClean[]> {
    const results: StockTransactionClean[] = [];
    
    for (const update of updates) {
      try {
        const updated = await this.update(tenderId, update.itemMasterId, {
          actual_unit_price: update.actualUnitPrice,
          total_quantity_received: update.totalQuantityReceived,
          pricing_confirmed: update.pricingConfirmed
        });
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update item ${update.itemMasterId}:`, error);
        // Continue with other items
      }
    }
    
    return results;
  }
};

export default stockTransactionsCleanLocalService;
