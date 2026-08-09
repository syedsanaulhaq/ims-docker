import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddItemModalProps {
  selectedCategory?: string;
  onClose: () => void;
  onSuccess: (itemData: any) => void;
}

export default function AddItemModal({ selectedCategory, onClose, onSuccess }: AddItemModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    category_id: selectedCategory || '',
    sub_category_id: '',
    nomenclature: '',
    specifications: '',
    unit: 'Piece',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      fetchSubCategories(formData.category_id);
    }
  }, [formData.category_id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/categories/${categoryId}/subcategories`);
      if (response.ok) {
        const data = await response.json();
        setSubCategories(data);
      }
    } catch (err) {
      console.error('Error fetching subcategories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_id || !formData.nomenclature) {
      setError('Category and Item Name are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/item-masters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex justify-between items-center border-b px-6 py-4 z-10">
          <h2 className="text-xl font-bold text-slate-900">Add New Item</h2>
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
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value, sub_category_id: '' }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.category_description || cat.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sub-Category
              </label>
              <Select
                value={formData.sub_category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sub_category_id: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat.id} value={subCat.id}>
                      {subCat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Item Name / Nomenclature <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.nomenclature}
              onChange={(e) => setFormData(prev => ({ ...prev, nomenclature: e.target.value }))}
              placeholder="e.g., Ballpoint Pens (Blue, Pack of 10)"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Unit of Measure
            </label>
            <Select
              value={formData.unit}
              onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Piece">Piece</SelectItem>
                <SelectItem value="Box">Box</SelectItem>
                <SelectItem value="Pack">Pack</SelectItem>
                <SelectItem value="Ream">Ream</SelectItem>
                <SelectItem value="Carton">Carton</SelectItem>
                <SelectItem value="Dozen">Dozen</SelectItem>
                <SelectItem value="Set">Set</SelectItem>
                <SelectItem value="Unit">Unit</SelectItem>
                <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
                <SelectItem value="Liter">Liter</SelectItem>
                <SelectItem value="Meter">Meter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Specifications
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.specifications}
              onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
              placeholder="Technical specifications, dimensions, etc..."
              rows={4}
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
              {loading ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
