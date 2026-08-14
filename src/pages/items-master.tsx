import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Tag, 
  Save, 
  X, 
  Building2,
  Settings,
  Search,
  Filter,
  MoreVertical,
  ArrowLeft,
  Layers,
  Box
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { formatDateDMY } from '@/utils/dateUtils';

interface ItemMaster {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: string | null;
  sub_category_id: string | null;
  unit_of_measure: string;
  specifications: string;
  category_name?: string;
  sub_category_name?: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  category_name: string;
}

interface SubCategory {
  id: string;
  sub_category_name: string;
  category_id: string;
}

interface ItemFormData {
  item_code: string;
  item_name: string;
  category_id: string;
  sub_category_id: string;
  unit_of_measure: string;
  specifications: string;
}

type ViewMode = 'list' | 'add' | 'edit';

const UNITS_LIST = [
  'Piece', 'Kg', 'Gram', 'Liter', 'Meter', 'Centimeter', 'Box', 'Pack', 'Set', 'Dozen', 'Pair',
  'Gallon', 'Inch', 'Foot', 'Yard', 'Square Meter', 'Cubic Meter', 'Ton', 'Pound'
];

const ItemsMaster: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>({
    item_code: '',
    item_name: '',
    category_id: '',
    sub_category_id: '',
    unit_of_measure: '',
    specifications: ''
  });

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Escape to clear search
      if (event.key === 'Escape' && searchTerm) {
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchSubCategories();
  }, []);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const fullyCategorized = items.filter(item => item.category_id && item.sub_category_id);
    const partiallyCategorized = items.filter(item => item.category_id && !item.sub_category_id);
    const uncategorizedItems = items.filter(item => !item.category_id);
    const itemsWithSpecs = items.filter(item => item.specifications && item.specifications.trim().length > 0);
    const uniqueUnits = new Set(items.map(item => item.unit_of_measure).filter(Boolean));
    
    return {
      totalItems: items.length,
      fullyCategorized: fullyCategorized.length,
      partiallyCategorized: partiallyCategorized.length,
      uncategorizedItems: uncategorizedItems.length,
      itemsWithSpecs: itemsWithSpecs.length,
      uniqueUnits: uniqueUnits.size,
      totalCategories: categories.length,
      completionRate: items.length > 0 ? ((fullyCategorized.length / items.length) * 100) : 0
    };
  }, [items, categories, subCategories]);

  // Get unique units for filter
  const availableUnits = React.useMemo(() => {
    const units = [...new Set(items.map(item => item.unit_of_measure).filter(Boolean))];
    return units.sort();
  }, [items]);

  // Filtered items based on search and filters
  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      const searchMatch = searchTerm === '' || 
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.specifications?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sub_category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_of_measure?.toLowerCase().includes(searchTerm.toLowerCase());

      const categoryMatch = categoryFilter === 'All' || 
        (categoryFilter === 'Categorized' ? item.category_id && item.sub_category_id : 
         categoryFilter === 'Uncategorized' ? !item.category_id : 
         categoryFilter === 'Partial' ? item.category_id && !item.sub_category_id : true);

      const unitMatch = unitFilter === 'All' || item.unit_of_measure === unitFilter;

      return searchMatch && categoryMatch && unitMatch;
    });
  }, [items, searchTerm, categoryFilter, unitFilter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/item-masters`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setItems(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(`Failed to fetch items: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(`Failed to fetch categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sub-categories`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSubCategories(data);
    } catch (err) {
      console.error('Error fetching sub-categories:', err);
      setError(`Failed to fetch sub-categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getFilteredSubCategories = () => {
    if (!formData.category_id || formData.category_id === '') {
      return [];
    }
    return subCategories.filter(sub => sub.category_id === formData.category_id);
  };

  const checkDuplicateCode = (code: string): boolean => {
    return items.some(item => 
      item.item_code.toLowerCase() === code.toLowerCase() && 
      (!editingItem || item.item_id !== editingItem.item_id)
    );
  };



  const resetForm = () => {
    setFormData({
      item_code: '',
      item_name: '',
      category_id: '',
      sub_category_id: '',
      unit_of_measure: '',
      specifications: ''
    });
    setEditingItem(null);
    setViewMode('list');
  };

  const handleAddNew = () => {
    resetForm();
    setShowItemDialog(true);
  };

  const handleEdit = (item: ItemMaster) => {
    setEditingItem(item);
    setViewMode('edit');
    setFormData({
      item_code: item.item_code,
      item_name: item.item_name,
      category_id: item.category_id || '',
      sub_category_id: item.sub_category_id || '',
      unit_of_measure: item.unit_of_measure,
      specifications: item.specifications
    });
    setShowItemDialog(true);
  };

  const handleCancel = () => {
    setShowItemDialog(false);
    resetForm();
  };

  const handleDelete = async (item: ItemMaster) => {
    if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/item-masters/${item.item_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Item deleted successfully",
      });

      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (viewMode === 'add' && checkDuplicateCode(formData.item_code)) {
      toast({
        title: "Error",
        description: "Item code already exists",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);
    
    try {
      const url = editingItem 
        ? `${import.meta.env.VITE_API_URL}/api/item-masters/${editingItem.item_id}`
        : `${import.meta.env.VITE_API_URL}/api/item-masters`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const payload = {
        item_code: formData.item_code,
        item_name: formData.item_name,
        category_id: formData.category_id,
        sub_category_id: formData.sub_category_id,
        unit_of_measure: formData.unit_of_measure,
        specifications: formData.specifications
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: editingItem ? "Item updated successfully" : "Item added successfully",
      });

      setShowItemDialog(false);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Error saving item:', err);
      toast({
        title: "Error", 
        description: editingItem ? "Failed to update item" : "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">Loading items...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchItems}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Items Master Management</h1>
          </div>
          <p className="text-gray-600 mt-1">Manage product items and inventory master data</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowItemDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <Box className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Fully Categorized</p>
              <p className="text-2xl font-bold text-green-600">{stats.fullyCategorized}</p>
              <p className="text-xs text-green-500">{stats.completionRate.toFixed(1)}% complete</p>
            </div>
            <Layers className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Need Categorization</p>
              <p className="text-2xl font-bold text-red-600">{stats.uncategorizedItems}</p>
              <p className="text-xs text-red-500">Missing categories</p>
            </div>
            <Package className="w-8 h-8 text-red-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">With Specifications</p>
              <p className="text-2xl font-bold text-purple-600">{stats.itemsWithSpecs}</p>
              <p className="text-xs text-purple-500">{stats.uniqueUnits} unique units</p>
            </div>
            <Tag className="w-8 h-8 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filter Section */}
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
              <Input
                placeholder="🔍 Search items, codes, specifications... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-20 h-12 text-base border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white/80 backdrop-blur"
              />
              
              {/* Keyboard shortcut indicator */}
              {!searchTerm && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs">K</kbd>
                </div>
              )}
              
              {/* Clear search button */}
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-blue-100"
                  onClick={() => setSearchTerm('')}
                  title="Clear search (Esc)"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </Button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Category Status Filter */}
              <div className="flex items-center gap-2 min-w-fit">
                <Filter className="w-4 h-4 text-blue-500" />
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Category:</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 h-10 border-blue-200 focus:border-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        All Items
                      </div>
                    </SelectItem>
                    <SelectItem value="Categorized">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Fully Categorized
                      </div>
                    </SelectItem>
                    <SelectItem value="Partial">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Partially Categorized
                      </div>
                    </SelectItem>
                    <SelectItem value="Uncategorized">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Uncategorized
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Filter */}
              <div className="flex items-center gap-2 min-w-fit">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Unit:</Label>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="w-32 h-10 border-blue-200 focus:border-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Units</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Results Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-full border border-blue-100">
                <Package className="w-4 h-4" />
                <span className="font-medium">
                  {filteredItems.length} of {items.length} items
                  {searchTerm && (
                    <span className="text-blue-600 font-semibold ml-1">
                      matching "{searchTerm}"
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          {!searchTerm && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${categoryFilter === 'Categorized' ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-green-50'}`}
                onClick={() => setCategoryFilter('Categorized')}
              >
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                Fully Categorized
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${categoryFilter === 'Partial' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'hover:bg-yellow-50'}`}
                onClick={() => setCategoryFilter('Partial')}
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                Needs Sub-Category
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${categoryFilter === 'Uncategorized' ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-red-50'}`}
                onClick={() => setCategoryFilter('Uncategorized')}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                Needs Categorization
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${categoryFilter === 'All' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-blue-50'}`}
                onClick={() => setCategoryFilter('All')}
              >
                <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                Show All Items
              </Button>
            </div>
          )}

          {/* Search Tips */}
          {searchTerm && filteredItems.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Search className="w-4 h-4" />
                <span className="font-medium">No results found for "{searchTerm}"</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Try searching for item names, item codes, specifications, categories, or units of measure. 
                You can also use the category and unit filters above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-600" />
              Items List
            </span>
            {filteredItems.length !== items.length && (
              <Badge variant="secondary">
                {filteredItems.length} of {items.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 && items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first inventory item</p>
              <Button onClick={() => setShowItemDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items match your filters</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search terms or filters</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setCategoryFilter('All'); setUnitFilter('All'); }}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Specifications</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.item_id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="font-mono">
                          {item.item_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                      </TableCell>
                      <TableCell>
                        {item.category_name ? (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            {item.category_name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No category</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.sub_category_name ? (
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                            {item.sub_category_name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No sub-category</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{item.unit_of_measure}</span>
                      </TableCell>
                      <TableCell>
                        {item.specifications ? (
                          <div className="text-sm text-gray-600 max-w-xs truncate" title={item.specifications}>
                            {item.specifications}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No specifications</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-2 h-6 w-6 p-0 text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? `Update details for ${editingItem.item_name}` : 'Create a new inventory item with all necessary details'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Code */}
              <div className="space-y-2">
                <Label htmlFor="item_code">Item Code *</Label>
                <Input
                  id="item_code"
                  name="item_code"
                  value={formData.item_code || ''}
                  onChange={handleInputChange}
                  placeholder="Enter unique item code"
                  className={viewMode === 'add' && formData.item_code && checkDuplicateCode(formData.item_code) ? 'border-red-300' : ''}
                  required
                />
                {viewMode === 'add' && formData.item_code && checkDuplicateCode(formData.item_code) && (
                  <p className="text-sm text-red-600">⚠️ Item code already exists</p>
                )}
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  name="item_name"
                  value={formData.item_name || ''}
                  onChange={handleInputChange}
                  placeholder="Enter item name"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id">Category *</Label>
                <Select
                  value={formData.category_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value, sub_category_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub Category */}
              <div className="space-y-2">
                <Label htmlFor="sub_category_id">Sub Category *</Label>
                <Select
                  value={formData.sub_category_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sub_category_id: value }))}
                  disabled={!formData.category_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.category_id ? 'Select category first' : 'Select a sub category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredSubCategories().map((subCat) => (
                      <SelectItem key={subCat.id} value={subCat.id}>
                        {subCat.sub_category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
                <Select
                  value={formData.unit_of_measure || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unit_of_measure: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_LIST.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specifications */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specifications">Specifications</Label>
                <Textarea
                  id="specifications"
                  name="specifications"
                  value={formData.specifications || ''}
                  onChange={handleInputChange}
                  placeholder="Enter technical specifications (optional)"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowItemDialog(false); resetForm(); }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
              >
                {formLoading ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemsMaster;