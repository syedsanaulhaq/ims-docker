import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';

interface AddCategoryModalProps {
  onClose: () => void;
  onSuccess: (categoryData: any) => void;
}

export default function AddCategoryModal({ onClose, onSuccess }: AddCategoryModalProps) {
  const [formData, setFormData] = useState({
    category_code: '',
    category_name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_name) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const result = await response.json();
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Add New Category</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category Code
            </label>
            <Input
              value={formData.category_code}
              onChange={(e) => setFormData(prev => ({ ...prev, category_code: e.target.value }))}
              placeholder="e.g., CAT-001"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.category_name}
              onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
              placeholder="e.g., Office Supplies"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Category description..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
