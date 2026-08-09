// Shared types for Stock Transactions

export interface TenderItem {
  id: string;
  tender_id: string;
  item_code: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  actual_unit_price?: number; // Editable actual price
  total_amount: number;
  category?: string;
  subcategory?: string;
}

export interface Tender {
  id: string;
  tender_number: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  items?: TenderItem[];
}

export interface DeliveryItem {
  item_id: string;
  item_code: string;
  item_description: string;
  quantity_delivered: number;
  unit_price: number;
}

export interface Delivery {
  id: string;
  tender_id: string;
  delivery_date: string;
  delivery_note?: string;
  items: DeliveryItem[];
  created_at: string;
}

export interface TransactionItem extends TenderItem {
  quantity_received: number;
  remaining_quantity: number;
  is_complete: boolean;
}
