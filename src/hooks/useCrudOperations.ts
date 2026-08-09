import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../services/invmisApi';

export interface CrudHookConfig<T> {
  endpoint: string;
  idField: keyof T;
}

export interface CrudHookResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (data: Omit<T, 'id'>) => Promise<void>;
  update: (id: string | number, data: Partial<T>) => Promise<void>;
  remove: (id: string | number) => Promise<void>;
}

export function useCrudOperations<T extends Record<string, any>>({
  endpoint,
  idField
}: CrudHookConfig<T>): CrudHookResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = getApiBaseUrl().replace('/api', '');

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${baseUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const create = async (data: Omit<T, 'id'>) => {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Resource already exists');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid data provided');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      await fetchItems(); // Refresh list
    } catch (err) {
      console.error('Error creating item:', err);
      throw err;
    }
  };

  const update = async (id: string | number, data: Partial<T>) => {
    try {
      const response = await fetch(`${baseUrl}${endpoint}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Resource conflict');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid data provided');
        } else if (response.status === 404) {
          throw new Error('Resource not found');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      await fetchItems(); // Refresh list
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  };

  const remove = async (id: string | number) => {
    try {
      const response = await fetch(`${baseUrl}${endpoint}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Resource not found');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      await fetchItems(); // Refresh list
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    create,
    update,
    remove
  };
}