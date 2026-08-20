// ====================================================================
// 🚀 InvMISDB API Service - Central API Configuration  
// ====================================================================
// This replaces all Supabase services with new SQL Server API calls
// ====================================================================

// Environment-based API URL configuration
export const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const currentPort = window.location.port;
  
  // Check if running on staging port (8081)
  const isStaging = currentPort === '8081' || hostname.includes('staging');
  
  // Environment-based URL selection
  if (isStaging) {
    return 'http://localhost:5001/api';  // Staging API
  }
  
  // Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  
  // Default to our current backend server
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Enhanced error handling
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error instanceof ApiError ? error : new ApiError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      endpoint
    );
  }
}

// ====================================================================
// 🎯 API Response Types (matching InvMISDB structure)
// ====================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardSummary {
  totalItems: number;
  lowStockItems: number;
  totalRequests: number;
  pendingApprovals: number;
  totalAwards: number;
  totalDeliveries: number;
  recentTransactions: StockTransaction[];
  lowStockAlerts: StockAlert[];
}

export interface StockTransaction {
  transaction_id: number;
  item_id: number;
  transaction_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  transaction_date: string;
  created_by: string;
  reason?: string;
}

export interface StockAlert {
  stock_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  current_quantity: number;
  minimum_level: number;
  stock_status: string;
}

export interface Category {
  id: string;
  category_name: string;
  description: string;
  status: string;
  created_at: string;
}

export interface SubCategory {
  subcategory_id: string;
  sub_category_name: string;
  category_id: string;
  description: string;
  status: string;
}

export interface Item {
  item_id: number;
  item_code: string;
  item_name: string;
  description: string;
  unit_of_measure: string;
  sub_category_id: string;
  sub_category_name: string;
  category_id: string;
  category_name: string;
  is_active: boolean;
  created_at: string;
}

export interface CurrentStock {
  stock_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  current_quantity: number;
  minimum_level: number;
  maximum_level: number;
  stock_status: string;
  last_updated: string;
  updated_by: string;
  updated_by_name: string;
}

export interface ProcurementRequest {
  request_id: number;
  request_code: string;
  request_title: string;
  description: string;
  justification: string;
  priority: string;
  status: string;
  requested_by: string;
  requester_name: string;
  dec_id: number;
  department_name: string;
  required_date: string;
  created_at: string;
}

export interface Office {
  office_id: number;
  office_name: string;
  office_code: number;
}

export interface Department {
  intAutoID: number;
  DECName: string;
  DECCode: number;
}

export interface User {
  Id: string;
  UserName: string;
  FullName: string;
  Email: string;
  Role: string;
}

// ====================================================================
// 🏢 API Service Functions
// ====================================================================

export const invmisApi = {
  // ====================================================================
  // 📈 Dashboard APIs
  // ====================================================================
  dashboard: {
    getSummary: () => apiRequest<DashboardSummary>('/dashboard/summary'),
  },

  // ====================================================================
  // 👥 Users & Organization APIs  
  // ====================================================================
  users: {
    getAll: () => apiRequest<{ success: boolean; users: User[] }>('/users'),
    getById: (id: string) => apiRequest<{ success: boolean; user: User }>(`/users/${id}`),
  },

  offices: {
    getAll: () => apiRequest<{ success: boolean; offices: Office[] }>('/offices'),
  },

  departments: {
    getAll: () => apiRequest<{ success: boolean; departments: Department[] }>('/departments'),
  },

  wings: {
    getAll: () => apiRequest<{ success: boolean; wings: any[] }>('/wings'),
  },

  // ====================================================================
  // 📦 Items & Categories APIs
  // ====================================================================
  categories: {
    getAll: () => apiRequest<Category[]>('/categories'),
    create: (data: any) => apiRequest<{ success: boolean; category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiRequest<{ success: boolean; category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiRequest<{ success: boolean }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
    createSubCategory: (data: any) => apiRequest<{ success: boolean; subCategory: SubCategory }>('/sub-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateSubCategory: (id: string, data: any) => apiRequest<{ success: boolean; subCategory: SubCategory }>(`/sub-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteSubCategory: (id: string) => apiRequest<{ success: boolean }>(`/sub-categories/${id}`, {
      method: 'DELETE',
    }),
  },

  subcategories: {
    getAll: () => apiRequest<SubCategory[]>('/sub-categories'),
    getByCategory: (categoryId: string) => 
      apiRequest<SubCategory[]>(`/sub-categories/category/${categoryId}`),
  },

  items: {
    getAll: () => apiRequest<Item[]>('/item-masters'),
    create: (data: any) => apiRequest<{ success: boolean; item: Item }>('/item-masters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiRequest<{ success: boolean; item: Item }>(`/item-masters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiRequest<{ success: boolean }>(`/item-masters/${id}`, {
      method: 'DELETE',
    }),
  },

  // ====================================================================
  // 📊 Stock Management APIs
  // ====================================================================
  stock: {
    getCurrent: () => apiRequest<CurrentStock[]>('/inventory-stock'),
    updateQuantity: (stockId: number, data: any) => 
      apiRequest(`/inventory-stock/${stockId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ====================================================================
  // 📋 Procurement APIs
  // ====================================================================
  procurement: {
    getRequests: () => apiRequest<{ success: boolean; requests: ProcurementRequest[] }>('/procurement-requests'),
    createRequest: (data: any) => apiRequest('/procurement-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // ====================================================================
  // 💰 Tender Awards APIs
  // ====================================================================
  tenders: {
    getAwards: () => apiRequest<{ success: boolean; awards: any[] }>('/tender-awards'),
    getById: (id: string) => apiRequest<{ success: boolean; tender: any }>(`/view-tenders/${id}`),
    createAward: (data: any) => apiRequest('/tender-awards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // ====================================================================
  // 🚚 Deliveries APIs  
  // ====================================================================
  deliveries: {
    getAll: () => apiRequest<{ success: boolean; deliveries: any[] }>('/deliveries'),
  },

  // ====================================================================
  // ✅ Approval Workflow APIs
  // ====================================================================
  approval: {
    getWorkflow: (requestId: number) => 
      apiRequest<{ success: boolean; workflow: any[] }>(`/approval-workflow/${requestId}`),
    processApproval: (data: any) => apiRequest('/approval-workflow/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
};

export default invmisApi;

