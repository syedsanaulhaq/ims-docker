import React, { useState } from 'react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'number' | 'email' | 'password';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
  dependent?: string; // For cascading dropdowns
  rows?: number; // For textarea
}

export interface StandardFormProps<T> {
  title: string;
  fields: FormField[];
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode: 'add' | 'edit';
}

export function StandardForm<T extends Record<string, any>>({
  title,
  fields,
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  mode
}: StandardFormProps<T>) {
  const [formData, setFormData] = useState<T>(() => {
    const initial = {} as T;
    fields.forEach(field => {
      initial[field.name as keyof T] = (initialData[field.name as keyof T] || '') as T[keyof T];
    });
    return initial;
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Handle dependent fields (cascade dropdowns)
      const field = fields.find(f => f.name === name);
      const dependentFields = fields.filter(f => f.dependent === name);
      dependentFields.forEach(depField => {
        newData[depField.name as keyof T] = '' as T[keyof T];
      });
      
      return newData;
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      const value = formData[field.name as keyof T];
      
      // Required field validation
      if (field.required && (!value || value === '')) {
        newErrors[field.name] = `${field.label} is required`;
      }
      
      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name as keyof T];
    const error = errors[field.name];
    const hasError = !!error;

    switch (field.type) {
      case 'select':
        return (
          <select
            id={field.name}
            name={field.name}
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            rows={field.rows || 3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <input
            type={field.type}
            id={field.name}
            name={field.name}
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {mode === 'add' ? `Add New ${title}` : `Edit ${title}`}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && '*'}
              </label>
              {renderField(field)}
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  ⚠️ {errors[field.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (mode === 'add' ? 'Add' : 'Update')} {title}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}