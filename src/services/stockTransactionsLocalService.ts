// Local stock transactions service for SQL Server backend
const BASE_URL = 'http://localhost:3001/api';

export interface StockTransaction {
  id: string;
  item_master_id: string;
  office_id: string;
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  unit_price?: number;
  total_value?: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  from_office_id?: string;
  to_office_id?: string;
  remarks?: string;
  transaction_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Related data
  item_masters?: {
    id: string;
    nomenclature: string;
    unit: string;
  };
  offices?: {
    intOfficeID: string;
    strOfficeName: string;
  };
}

export interface CreateStockTransaction {
  item_master_id: string;
  office_id: string;
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  unit_price?: number;
  total_value?: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  from_office_id?: string;
  to_office_id?: string;
  remarks?: string;
  transaction_date?: string;
  created_by: string;
}

export interface UpdateStockTransaction extends Partial<CreateStockTransaction> {}

export const stockTransactionsLocalService = {
  async getAll(): Promise<StockTransaction[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock transactions: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<StockTransaction> {
    const response = await fetch(`${BASE_URL}/stock-transactions/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock transaction: ${response.statusText}`);
    }
    return response.json();
  },

  async getByOffice(officeId: string): Promise<StockTransaction[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions?officeId=${officeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch office stock transactions: ${response.statusText}`);
    }
    return response.json();
  },

  async getByItem(itemMasterId: string): Promise<StockTransaction[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions?itemMasterId=${itemMasterId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch item stock transactions: ${response.statusText}`);
    }
    return response.json();
  },

  async getByType(transactionType: string): Promise<StockTransaction[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions?type=${transactionType}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock transactions by type: ${response.statusText}`);
    }
    return response.json();
  },

  async getByDateRange(startDate: string, endDate: string): Promise<StockTransaction[]> {
    const response = await fetch(`${BASE_URL}/stock-transactions?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock transactions by date range: ${response.statusText}`);
    }
    return response.json();
  },

  async create(transaction: CreateStockTransaction): Promise<StockTransaction> {
    const response = await fetch(`${BASE_URL}/stock-transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transaction,
        transaction_date: transaction.transaction_date || new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  // Create with response wrapper for compatibility
  async createWithResponse(data: CreateStockTransaction): Promise<{ success: boolean; data?: StockTransaction; message: string }> {
    try {
      const transaction = await this.create(data);
      return {
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create transaction'
      };
    }
  },

  async update(id: string, transaction: UpdateStockTransaction): Promise<StockTransaction> {
    const response = await fetch(`${BASE_URL}/stock-transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async remove(id: string): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/stock-transactions/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete stock transaction: ${errorData.error || response.statusText}`);
    }
    
    return true;
  },

  // Specialized methods for different transaction types
  async createInboundTransaction(data: {
    item_master_id: string;
    office_id: string;
    quantity: number;
    unit_price: number;
    reference_type: string;
    reference_id: string;
    reference_number?: string;
    remarks?: string;
    created_by: string;
  }): Promise<StockTransaction> {
    return this.create({
      ...data,
      transaction_type: 'IN',
      total_value: data.quantity * data.unit_price,
    });
  },

  async createOutboundTransaction(data: {
    item_master_id: string;
    office_id: string;
    quantity: number;
    reference_type: string;
    reference_id: string;
    reference_number?: string;
    remarks?: string;
    created_by: string;
  }): Promise<StockTransaction> {
    return this.create({
      ...data,
      transaction_type: 'OUT',
    });
  },

  async createAdjustmentTransaction(data: {
    item_master_id: string;
    office_id: string;
    quantity: number; // Can be positive or negative
    remarks: string;
    created_by: string;
  }): Promise<StockTransaction> {
    return this.create({
      ...data,
      transaction_type: 'ADJUSTMENT',
      reference_type: 'MANUAL_ADJUSTMENT',
    });
  },

  async createTransferTransaction(data: {
    item_master_id: string;
    from_office_id: string;
    to_office_id: string;
    quantity: number;
    reference_number?: string;
    remarks?: string;
    created_by: string;
  }): Promise<StockTransaction[]> {
    // Create both outbound and inbound transactions for transfers
    const outbound = await this.create({
      item_master_id: data.item_master_id,
      office_id: data.from_office_id,
      transaction_type: 'OUT',
      quantity: data.quantity,
      reference_type: 'TRANSFER',
      reference_number: data.reference_number,
      to_office_id: data.to_office_id,
      remarks: data.remarks,
      created_by: data.created_by,
    });

    const inbound = await this.create({
      item_master_id: data.item_master_id,
      office_id: data.to_office_id,
      transaction_type: 'IN',
      quantity: data.quantity,
      reference_type: 'TRANSFER',
      reference_number: data.reference_number,
      from_office_id: data.from_office_id,
      remarks: data.remarks,
      created_by: data.created_by,
    });

    return [outbound, inbound];
  },

  // Get stock transactions by tender ID
  async getByTenderId(tenderId: string): Promise<{ success: boolean; data: any[]; message: string }> {
    try {
      const response = await fetch(`${BASE_URL}/stock-transactions?tenderId=${tenderId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tender stock transactions: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Transactions fetched successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch transactions'
      };
    }
  },

  // Delete stock transaction
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${BASE_URL}/stock-transactions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Failed to delete stock transaction: ${response.statusText}`);
      }
      return {
        success: true,
        message: 'Transaction deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete transaction'
      };
    }
  },
};
