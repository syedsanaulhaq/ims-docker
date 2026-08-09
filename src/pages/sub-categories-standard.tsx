import React, { useState, useEffect } from 'react';
import { StandardForm, FormField } from '../components/StandardForm';
import { StandardList, TableColumn } from '../components/StandardList';
import { useCrudOperations } from '../hooks/useCrudOperations';

interface SubCategory {
  id: string;
  sub_category_name: string;
  category_id: string;
  category_name?: string;
  description?: string;
  status?: string;
  created_at?: string;
}

interface Category {
  id: string;
  category_name: string;
}

type ViewMode = 'list' | 'add' | 'edit';

const SubCategories: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<SubCategory | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const { items, loading, error, create, update, remove } = useCrudOperations<SubCategory>({
    endpoint: '/api/sub-categories',
    idField: 'id'
  });

  // Fetch categories for dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Form field definitions
  const formFields: FormField[] = [
    {
      name: 'sub_category_name',
      label: 'Sub Category Name',
      type: 'text',
      required: true,
      placeholder: 'Enter sub category name'
    },
    {
      name: 'category_id',
      label: 'Parent Category',
      type: 'select',
      required: true,
      options: categories.map(cat => ({ value: cat.id, label: cat.category_name }))
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter sub category description (optional)',
      rows: 3
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
      ]
    }
  ];

  // Table column definitions
  const columns: TableColumn<SubCategory>[] = [
    {
      key: 'sub_category_name',
      label: 'Sub Category Name'
    },
    {
      key: 'category_name',
      label: 'Parent Category',
      render: (value) => value || 'Unknown'
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => value || '-'
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    }
  ];

  const handleAdd = () => {
    setViewMode('add');
    setEditingItem(null);
  };

  const handleEdit = (item: SubCategory) => {
    setViewMode('edit');
    setEditingItem(item);
  };

  const handleDelete = async (item: SubCategory) => {
    if (!confirm(`Are you sure you want to delete "${item.sub_category_name}"?`)) {
      return;
    }
    
    try {
      await remove(item.id);
    } catch (error) {
      alert(`Failed to delete sub category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFormSubmit = async (data: SubCategory) => {
    try {
      if (viewMode === 'add') {
        await create(data);
      } else if (editingItem) {
        await update(editingItem.id, data);
      }
      setViewMode('list');
      setEditingItem(null);
    } catch (error) {
      throw error; // Let StandardForm handle the error display
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingItem(null);
  };

  if (viewMode === 'add' || viewMode === 'edit') {
    return (
      <div className="container mx-auto px-4 py-8">
        <StandardForm<SubCategory>
          title="Sub Category"
          fields={formFields}
          initialData={editingItem || { status: 'Active' }}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          mode={viewMode}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <StandardList<SubCategory>
        title="Sub Categories"
        items={items}
        columns={columns}
        loading={loading}
        error={error}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchFields={['sub_category_name', 'category_name', 'description']}
      />
    </div>
  );
};

export default SubCategories;