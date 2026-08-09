import React from 'react';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface StandardListProps<T> {
  title: string;
  items: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchFields?: (keyof T)[];
}

export function StandardList<T extends Record<string, any>>({
  title,
  items,
  columns,
  loading = false,
  error = null,
  onAdd,
  onEdit,
  onDelete,
  searchFields = []
}: StandardListProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!searchTerm || searchFields.length === 0) return items;
    
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [items, searchTerm, searchFields]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Search */}
          {searchFields.length > 0 && (
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          
          {/* Add Button */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Add {title.slice(0, -1)} {/* Remove 's' from plural title */}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="text-red-800">
            <p className="font-medium">Error loading data:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key.toString()}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1M7 7h10" />
                    </svg>
                    <p className="text-lg font-medium">No {title.toLowerCase()} found</p>
                    <p className="text-sm">
                      {searchTerm ? 'Try adjusting your search criteria' : `Get started by adding your first ${title.slice(0, -1).toLowerCase()}`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key.toString()} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}