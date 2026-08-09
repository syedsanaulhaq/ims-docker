import { getApiBaseUrl } from './invmisApi';

interface StockReturnItem {
  issued_item_id: string;
  nomenclature: string;
  return_quantity: number;
  condition_on_return: string;
  damage_description?: string;
}

interface StockReturn {
  return_date: string;
  returned_by: string;
  verified_by?: string;
  return_notes?: string;
  return_status: string;
  return_items: StockReturnItem[];
}

class StockReturnService {
  private baseUrl = `${getApiBaseUrl()}/stock-returns`;

  async createReturn(stockReturn: StockReturn): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockReturn),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error creating stock return:', error);
      throw error;
    }
  }

  async getReturns(): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching stock returns:', error);
      throw error;
    }
  }

  async getReturnById(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('❌ Error fetching stock return:', error);
      throw error;
    }
  }
}

export default new StockReturnService();
export const stockReturnService = new StockReturnService();
export type { StockReturn, StockReturnItem };
