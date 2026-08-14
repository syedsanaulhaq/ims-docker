import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, FolderOpen, Tag, Save, X, ExternalLink, Package, CheckCircle, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateDMY } from '@/utils/dateUtils';

interface Category {
  id: string;
  category_name: string;
  description: string;
  item_type?: string; // 'Dispensable' or 'Indispensable'
  status: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

interface SubCategory {
  id: string;
  category_id: string;
  sub_category_name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const Categories = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'with-stock' | 'without-stock'>('all');

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubCategoryForm, setShowSubCategoryForm] = useState(false);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<string | null>(null);

  // Form states using exact database field names
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    description: '',
    item_type: 'Dispensable',
    status: 'Active'
  });

  const [subCategoryForm, setSubCategoryForm] = useState({
    category_id: '',
    sub_category_name: '',
    description: '',
    status: 'Active'
  });

  // Fetch categories and sub-categories
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [categoriesRes, subCategoriesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/categories`),
        fetch(`${import.meta.env.VITE_API_URL}/api/sub-categories`)
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (subCategoriesRes.ok) {
        const subCategoriesData = await subCategoriesRes.json();
        setSubCategories(subCategoriesData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load categories data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create new category
  const handleCreateCategory = async () => {
    if (!categoryForm.category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "Category created successfully",
        });
        
        setCategoryForm({ category_name: '', description: '', item_type: 'Dispensable', status: 'Active' });
        setShowCategoryForm(false);
        fetchData(); // Refresh data
      } else {
        const errorText = await response.text();
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('❌ Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      });
    }
  };

  // Create new sub-category
  const handleCreateSubCategory = async () => {
    if (!subCategoryForm.sub_category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Sub-category name is required",
        variant: "destructive"
      });
      return;
    }

    if (!subCategoryForm.category_id) {
      toast({
        title: "Validation Error",
        description: "Please select a parent category",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sub-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subCategoryForm)
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "Sub-category created successfully",
        });
        
        setSubCategoryForm({ category_id: '', sub_category_name: '', description: '', status: 'Active' });
        setShowSubCategoryForm(false);
        fetchData(); // Refresh data
      } else {
        const errorText = await response.text();
        throw new Error('Failed to create sub-category');
      }
    } catch (error) {
      console.error('❌ Error creating sub-category:', error);
      toast({
        title: "Error",
        description: "Failed to create sub-category",
        variant: "destructive"
      });
    }
  };

  // Edit category
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setCategoryForm({
      category_name: category.category_name,
      description: category.description || '',
      item_type: category.item_type || 'Dispensable',
      status: category.status
    });
    setShowCategoryForm(true);
  };

  // Update category
  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    if (!categoryForm.category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${editingCategory}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
        
        // Reset form and close
        setCategoryForm({ category_name: '', description: '', item_type: 'Dispensable', status: 'Active' });
        setShowCategoryForm(false);
        setEditingCategory(null);
        fetchData(); // Refresh data
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to update category: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  // Edit sub-category
  const handleEditSubCategory = (subCategory: SubCategory) => {
    setEditingSubCategory(subCategory.id);
    setSubCategoryForm({
      category_id: subCategory.category_id,
      sub_category_name: subCategory.sub_category_name,
      description: subCategory.description || '',
      status: subCategory.status
    });
    setShowSubCategoryForm(true);
  };

  // Update sub-category
  const handleUpdateSubCategory = async () => {
    if (!editingSubCategory) return;
    
    if (!subCategoryForm.category_id || !subCategoryForm.sub_category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category and sub-category name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sub-categories/${editingSubCategory}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subCategoryForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category updated successfully",
        });
        
        // Reset form and close
        setSubCategoryForm({ category_id: '', sub_category_name: '', description: '', status: 'Active' });
        setShowSubCategoryForm(false);
        setEditingSubCategory(null);
        fetchData(); // Refresh data
      } else {
        const errorText = await response.text();
        throw new Error('Failed to update sub-category');
      }
    } catch (error) {
      console.error('❌ Error updating sub-category:', error);
      toast({
        title: "Error",
        description: "Failed to update sub-category",
        variant: "destructive"
      });
    }
  };

  // Delete sub-category
  const handleDeleteSubCategory = async (subCategoryId: string, subCategoryName: string) => {
    if (!confirm(`Are you sure you want to delete the sub-category "${subCategoryName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sub-categories/${subCategoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category deleted successfully",
        });
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sub-category');
      }
    } catch (error) {
      console.error('❌ Error deleting sub-category:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete sub-category",
        variant: "destructive"
      });
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingSubCategory(null);
    setCategoryForm({ category_name: '', description: '', item_type: 'Dispensable', status: 'Active' });
    setSubCategoryForm({ category_id: '', sub_category_name: '', description: '', status: 'Active' });
    setShowCategoryForm(false);
    setShowSubCategoryForm(false);
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.category_name || 'Unknown Category';
  };

  // Filter categories based on search term and stock filter
  const filteredCategories = categories.filter(category => {
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        category.category_name.toLowerCase().includes(search) ||
        (category.description && category.description.toLowerCase().includes(search))
      );
      if (!matchesSearch) return false;
    }

    // Apply stock filter
    const itemCount = category.item_count || 0;
    if (stockFilter === 'with-stock' && itemCount === 0) return false;
    if (stockFilter === 'without-stock' && itemCount > 0) return false;

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Category Manager</h1>
          <p className="text-gray-600 mt-1">Manage inventory categories</p>
        </div>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${stockFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStockFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <h3 className="text-3xl font-bold mt-2">{categories.length}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${stockFilter === 'with-stock' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStockFilter('with-stock')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Stock</p>
                <h3 className="text-3xl font-bold mt-2 text-green-600">
                  {categories.filter(cat => (cat.item_count || 0) > 0).length}
                </h3>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${stockFilter === 'without-stock' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setStockFilter('without-stock')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Without Stock</p>
                <h3 className="text-3xl font-bold mt-2 text-orange-600">
                  {categories.filter(cat => (cat.item_count || 0) === 0).length}
                </h3>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-5 h-5" />
              <CardTitle>Categories</CardTitle>
            </div>
            <Button 
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Category Form */}
          {showCategoryForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-4">Add New Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_name">Category Name</Label>
                  <Input
                    id="category_name"
                    value={categoryForm.category_name}
                    onChange={(e) => setCategoryForm({...categoryForm, category_name: e.target.value})}
                    placeholder="Enter category name"
                  />
                </div>
                <div>
                  <Label htmlFor="item_type">Item Type</Label>
                  <Select 
                    value={categoryForm.item_type} 
                    onValueChange={(value) => setCategoryForm({...categoryForm, item_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dispensable">Dispensable</SelectItem>
                      <SelectItem value="Indispensable">Indispensable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="category_status">Status</Label>
                  <Select 
                    value={categoryForm.status} 
                    onValueChange={(value) => setCategoryForm({...categoryForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="category_description">Description</Label>
                <Input
                  id="category_description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="flex space-x-2 mt-4">
                <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Item Type</TableHead>
                <TableHead>Total Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    {searchTerm ? 'No categories found matching your search.' : 'No categories found. Click "Add Category" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} className="h-12">
                  <TableCell className="font-medium py-2">{category.category_name}</TableCell>
                  <TableCell className="py-2">{category.description || '-'}</TableCell>
                  <TableCell className="py-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      category.item_type === 'Indispensable' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {category.item_type || 'Dispensable'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 font-semibold p-0 h-auto flex items-center gap-1"
                      onClick={() => navigate(`/dashboard/inventory-all-items?category=${category.id}`)}
                      title={`View ${category.item_count || 0} items in this category`}
                    >
                      {category.item_count || 0}
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {/* Delete button hidden */}
                  {/* <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.category_name)}
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};



export default Categories;
