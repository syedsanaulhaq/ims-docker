import React, { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/PermissionGate';

// Interface for item masters from vw_item_masters_with_categories view
interface ItemMaster {
  id: string; // UUID in database
  item_code: string;
  manufacturer?: string;
  nomenclature: string;
  category_id: string; // UUID in database
  sub_category_id: string; // UUID in database
  unit: string;
  specifications?: string;
  description?: string;
  status: string;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_level?: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  sub_category_name: string;
}

// Interface for form data
interface ItemFormData {
  item_code: string;
  manufacturer: string;
  nomenclature: string;
  category_id: string;
  sub_category_id: string;
  unit: string;
  specifications: string;
  description: string;
  status: string;
  minimum_stock_level: string;
  maximum_stock_level: string;
  reorder_level: string;
}

// Interface for categories
interface Category {
  id: string; // UUID in database
  category_name: string;
  description?: string;
  status?: string;
}

// Interface for sub-categories
interface SubCategory {
  id: string; // UUID in database
  sub_category_name: string;
  category_id: string; // UUID in database
  description?: string;
  status?: string;
}

const ItemMasterManagement = () => {
  // Simple state
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<keyof ItemMaster>('item_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  const [formData, setFormData] = useState<ItemFormData>({
    item_code: '',
    manufacturer: '',
    nomenclature: '',
    category_id: '',
    sub_category_id: '',
    unit: '',
    specifications: '',
    description: '',
    status: 'Active',
    minimum_stock_level: '',
    maximum_stock_level: '',
    reorder_level: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<SubCategory[]>([]);
  
  // CSV Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      (item.item_code ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nomenclature ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category_name === categoryFilter;
    const matchesSubCategory = subCategoryFilter === 'all' || item.sub_category_name === subCategoryFilter;
    return matchesSearch && matchesCategory && matchesSubCategory;
  });

  const sortedItems = [...filteredItems].sort((leftItem, rightItem) => {
    const leftValue = String(leftItem[sortColumn] ?? '').toLowerCase();
    const rightValue = String(rightItem[sortColumn] ?? '').toLowerCase();

    if (leftValue < rightValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    return 0;
  });

  const handleSort = (column: keyof ItemMaster) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  const getSortIndicator = (column: keyof ItemMaster) => {
    if (sortColumn !== column) {
      return '↕';
    }

    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Load categories and subcategories
  const loadCategories = async () => {
    try {
      // Load categories
      const categoriesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        }

      // Load all sub-categories
      const subCategoriesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/sub-categories`);
      if (subCategoriesResponse.ok) {
        const subCategoriesData = await subCategoriesResponse.json();
        setSubCategories(subCategoriesData);
        setFilteredSubCategories(subCategoriesData);
        }
    } catch (err) {
      console.error('❌ Load categories error:', err);
      // Set empty arrays if API fails - no fallback to mock data
      setCategories([]);
      setSubCategories([]);
      setFilteredSubCategories([]);
      console.error("Failed to load categories from database. Please try again.");
    }
  };

  // Filter sub-categories based on selected category
  const handleCategoryChange = (categoryId: string) => {
    setFormData({...formData, category_id: categoryId, sub_category_id: ''});
    
    if (categoryId) {
      const filtered = subCategories.filter(sub => sub.category_id === categoryId);
      setFilteredSubCategories(filtered);
    } else {
      setFilteredSubCategories([]);
    }
  };

  // Form functions
  const resetForm = () => {
    setFormData({
      item_code: '',
      manufacturer: '',
      nomenclature: '',
      category_id: '',
      sub_category_id: '',
      unit: '',
      specifications: '',
      description: '',
      status: 'Active',
      minimum_stock_level: '',
      maximum_stock_level: '',
      reorder_level: ''
    });
    setFilteredSubCategories([]);
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: ItemMaster) => {
    setFormData({
      item_code: item.item_code,
      manufacturer: item.manufacturer || '',
      nomenclature: item.nomenclature,
      category_id: item.category_id,
      sub_category_id: item.sub_category_id || '',
      unit: item.unit,
      specifications: item.specifications || '',
      description: item.description || '',
      status: item.status,
      minimum_stock_level: item.minimum_stock_level?.toString() || '',
      maximum_stock_level: item.maximum_stock_level?.toString() || '',
      reorder_level: item.reorder_level?.toString() || ''
    });
    
    // Filter sub-categories for the selected category
    const filtered = subCategories.filter(sub => sub.category_id === item.category_id);
    setFilteredSubCategories(filtered);
    
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        item_code: formData.item_code,
        manufacturer: formData.manufacturer || null,
        nomenclature: formData.nomenclature,
        category_id: formData.category_id,
        sub_category_id: formData.sub_category_id || null,
        unit: formData.unit,
        specifications: formData.specifications || null,
        description: formData.description || null,
        status: formData.status,
        minimum_stock_level: formData.minimum_stock_level ? parseInt(formData.minimum_stock_level) : null,
        maximum_stock_level: formData.maximum_stock_level ? parseInt(formData.maximum_stock_level) : null,
        reorder_point: formData.reorder_level ? parseInt(formData.reorder_level) : null
      };

      if (editingItem) {
        // Update existing item
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/item-masters/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          closeModal();
          loadItems();
        } else {
          const errorData = await response.text();
          console.error('❌ Update failed:', response.status, errorData);
          throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetails: ${errorData}`);
        }
      } else {
        // Create new item
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/item-masters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          closeModal();
          loadItems();
        } else {
          const errorData = await response.text();
          console.error('❌ Create failed:', response.status, errorData);
          throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetails: ${errorData}`);
        }
      }
    } catch (err) {
      console.error('❌ Form submit error:', err);
      alert(`Error ${editingItem ? 'updating' : 'creating'} item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Handler functions for actions
  const handleAddNew = () => {
    openAddModal();
  };

  const handleEdit = (item: ItemMaster) => {
    openEditModal(item);
  };

  const handleDelete = async (item: ItemMaster) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${item.nomenclature}" (${item.item_code})?`);
    if (confirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/item-masters/${item.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          loadItems();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('❌ Delete error:', err);
        alert(`Error deleting item: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // CSV Upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUploadCSV = async () => {
    if (!uploadFile) {
      alert('Please select a CSV file first');
      return;
    }

    setUploadLoading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/items-master/bulk-upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResult(data.results);
        // Reload items after successful upload
        if (data.results.success.length > 0) {
          await loadItems();
        }
      } else {
        alert(`Upload failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert(`Error uploading CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csvTemplate = `item_code,nomenclature,manufacturer,unit,specifications,description,category_name,sub_category_name,status,minimum_stock_level,maximum_stock_level,reorder_level
ABC-001,Sample Item,Sample Manufacturer,Each,Sample specifications,Sample description,Category1,SubCategory1,Active,10,100,20
ABC-002,Another Item,Brand X,Box,Technical specs here,Item description,Category2,SubCategory2,Active,5,50,10`;

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'item_masters_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (filteredItems.length === 0) {
      alert('No items to export');
      return;
    }

    const headers = [
      'Item Code',
      'Nomenclature',
      'Manufacturer',
      'Category',
      'Sub-Category',
      'Unit',
      'Specifications',
      'Description',
      'Status',
      'Minimum Stock Level',
      'Maximum Stock Level',
      'Reorder Level',
      'Created At',
      'Updated At'
    ];

    const rows = filteredItems.map(item => [
      item.item_code,
      item.nomenclature,
      item.manufacturer || '',
      item.category_name,
      item.sub_category_name,
      item.unit,
      item.specifications || '',
      item.description || '',
      item.status,
      item.minimum_stock_level?.toString() || '',
      item.maximum_stock_level?.toString() || '',
      item.reorder_level?.toString() || '',
      item.created_at,
      item.updated_at
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `item_masters_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadResult(null);
  };

  // Load items
  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/item-masters`);
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        } else {
        setError(`HTTP Error: ${response.status}`);
      }
    } catch (err) {
      setError(`Network Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('❌ Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  // Show loading
  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Items Management</h1>
        <div className="text-gray-600">Loading items...</div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Items Management</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={loadItems}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main UI
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Items Management</h1>
      
      {/* Stats */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{items.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {items.filter(item => item.status === 'Active').length}
            </div>
            <div className="text-sm text-gray-600">Active Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {new Set(items.map(item => item.category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {new Set(items.map(item => item.sub_category_name)).size}
            </div>
            <div className="text-sm text-gray-600">Sub-Categories</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by code, nomenclature, or specifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="min-w-[150px]">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubCategoryFilter('all'); // Reset sub-category when category changes
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Array.from(new Set(items.map(item => item.category_name))).sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[150px]">
            <select
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sub-Categories</option>
              {Array.from(new Set(
                items
                  .filter(item => categoryFilter === 'all' || item.category_name === categoryFilter)
                  .map(item => item.sub_category_name)
              )).sort().map(subCat => (
                <option key={subCat} value={subCat}>{subCat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Items List</h2>
            <p className="text-sm text-gray-600">
              Showing {filteredItems.length} of {items.length} items
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              title="Export to Excel/CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            <PermissionGate permission="inventory.create">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                title="Bulk Upload CSV"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload CSV
              </button>
            </PermissionGate>
            <PermissionGate permission="inventory.create">
              <button
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Item
              </button>
            </PermissionGate>
          </div>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-56 min-w-[220px] whitespace-nowrap">
                    <button type="button" onClick={() => handleSort('item_code')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      Code
                      <span className="text-xs">{getSortIndicator('item_code')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    <button type="button" onClick={() => handleSort('nomenclature')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      Nomenclature
                      <span className="text-xs">{getSortIndicator('nomenclature')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    <button type="button" onClick={() => handleSort('category_name')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      Category
                      <span className="text-xs">{getSortIndicator('category_name')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    <button type="button" onClick={() => handleSort('unit')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      Unit
                      <span className="text-xs">{getSortIndicator('unit')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    <button type="button" onClick={() => handleSort('specifications')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      Specifications
                      <span className="text-xs">{getSortIndicator('specifications')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono font-medium text-blue-600 whitespace-nowrap w-56 min-w-[220px]">
                      {item.item_code}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      {item.nomenclature}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.category_name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.unit}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {item.specifications || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex gap-2">
                        <PermissionGate permission="inventory.edit">
                          <button
                            onClick={() => handleEdit(item)}
                            className="border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm flex items-center gap-1.5 transition-colors"
                            title="Edit Item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </PermissionGate>
                        {/* Delete button hidden
                        <button
                          onClick={() => handleDelete(item)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                          title="Delete Item"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                        */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit Base Item' : 'Add New Base Item'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Row 1: Item Code and Manufacturer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_code}
                    onChange={(e) => setFormData({...formData, item_code: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., IT001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dell, HP, Lenovo"
                  />
                </div>
              </div>

              {/* Row 2: Nomenclature (Full Width) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomenclature *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nomenclature}
                  onChange={(e) => setFormData({...formData, nomenclature: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Desktop Computer"
                />
              </div>

              {/* Separator Line */}
              <div className="border-t-2 border-gray-300 my-6"></div>

              {/* Row 3: Categories and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub-Category
                  </label>
                  <select
                    value={formData.sub_category_id}
                    onChange={(e) => setFormData({...formData, sub_category_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.category_id}
                  >
                    <option value="">Select Sub-Category (Optional)</option>
                    {filteredSubCategories.map(subCat => (
                      <option key={subCat.id} value={subCat.id}>
                        {subCat.sub_category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PCS, KG, Liter"
                  />
                </div>
              </div>

              {/* Row 3: Stock Levels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimum_stock_level}
                    onChange={(e) => setFormData({...formData, minimum_stock_level: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maximum_stock_level}
                    onChange={(e) => setFormData({...formData, maximum_stock_level: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({...formData, reorder_level: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Row 4: Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Specifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specifications
                </label>
                <textarea
                  rows={3}
                  value={formData.specifications}
                  onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item specifications..."
                />
              </div>

              {/* Row 6: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item description..."
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md flex items-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingItem ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {editingItem ? 'Update Item' : 'Create Item'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Bulk Upload Items from CSV</h2>
              <button
                onClick={closeUploadModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-2">Upload Instructions:</h3>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  <li>Download the CSV template below to see the required format</li>
                  <li>Fill in your item data - <strong>nomenclature</strong> is required</li>
                  <li>Use exact category and sub-category names (case-insensitive)</li>
                  <li>Duplicate item codes will be rejected</li>
                  <li>Status should be "Active" or "Inactive" (default: Active)</li>
                </ul>
              </div>

              {/* Download Template Button */}
              <button
                onClick={downloadCSVTemplate}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-md flex items-center justify-center gap-2 transition-colors border border-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV Template
              </button>

              {/* File Input */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-600 font-medium">
                    {uploadFile ? uploadFile.name : 'Click to select CSV file'}
                  </span>
                  <span className="text-sm text-gray-500">
                    or drag and drop your CSV file here
                  </span>
                </label>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUploadCSV}
                disabled={!uploadFile || uploadLoading}
                className={`w-full px-4 py-3 rounded-md text-white font-medium transition-colors ${
                  !uploadFile || uploadLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {uploadLoading ? 'Uploading...' : 'Upload CSV'}
              </button>

              {/* Results */}
              {uploadResult && (
                <div className="mt-4 space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-semibold text-green-900 mb-2">
                      ✅ Import complete: {uploadResult.success.length} successful rows
                    </h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <div>Added: {uploadResult.created?.length || 0}</div>
                      <div>Updated by item code: {uploadResult.updated?.length || 0}</div>
                    </div>
                    {uploadResult.success.length > 0 && uploadResult.success.length <= 10 && (
                      <ul className="text-sm text-green-800 space-y-1 mt-2">
                        {uploadResult.success.map((item: any, idx: number) => (
                          <li key={idx}>
                            Row {item.row}: {item.nomenclature} ({item.item_code}) - {item.action === 'updated' ? 'updated' : 'added'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-60 overflow-y-auto">
                      <h4 className="font-semibold text-red-900 mb-2">
                        ❌ Errors: {uploadResult.errors.length} items failed
                      </h4>
                      <ul className="text-sm text-red-800 space-y-2 mt-2">
                        {uploadResult.errors.map((error: any, idx: number) => (
                          <li key={idx} className="border-b border-red-200 pb-2 last:border-0">
                            <div className="font-medium">Row {error.row}: {error.error}</div>
                            {error.data && (
                              <div className="text-xs text-red-700 mt-1">
                                Data: {JSON.stringify(error.data).substring(0, 100)}...
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={closeUploadModal}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMasterManagement;