import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Tag, Save, X, ExternalLink, Package, CheckCircle, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateDMY } from '@/utils/dateUtils';

interface Category {
  id: string;
  category_name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SubCategory {
  id: string;
  category_id: string;
  sub_category_name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

const SubCategories = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'with-stock' | 'without-stock'>('all');

  const [showSubCategoryForm, setShowSubCategoryForm] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<string | null>(null);

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
        fetch('/api/categories'),
        fetch('/api/sub-categories')
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
        description: "Failed to load sub-categories data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create new sub-category
  const handleCreateSubCategory = async () => {
    if (!subCategoryForm.category_id) {
      toast({
        title: "Validation Error",
        description: "Please select a parent category",
        variant: "destructive"
      });
      return;
    }

    if (!subCategoryForm.sub_category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Sub-category name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/sub-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subCategoryForm)
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category created successfully"
        });
        fetchData();
        handleCancelEdit();
      } else {
        throw new Error(data.error || 'Failed to create sub-category');
      }
    } catch (error) {
      console.error('💥 Error in handleCreateSubCategory:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create sub-category",
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
    if (!subCategoryForm.category_id) {
      toast({
        title: "Validation Error",
        description: "Please select a parent category",
        variant: "destructive"
      });
      return;
    }

    if (!subCategoryForm.sub_category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Sub-category name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/sub-categories/${editingSubCategory}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subCategoryForm)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category updated successfully"
        });
        fetchData();
        handleCancelEdit();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update sub-category');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update sub-category",
        variant: "destructive"
      });
    }
  };

  // Delete sub-category
  const handleDeleteSubCategory = async (subCategoryId: string, subCategoryName: string) => {
    if (!confirm(`Are you sure you want to delete the sub-category "${subCategoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/sub-categories/${subCategoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category deleted successfully"
        });
        fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete sub-category');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete sub-category",
        variant: "destructive"
      });
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingSubCategory(null);
    setSubCategoryForm({ category_id: '', sub_category_name: '', description: '', status: 'Active' });
    setShowSubCategoryForm(false);
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.category_name || 'Unknown Category';
  };

  // Filter sub-categories based on search term and stock filter
  const filteredSubCategories = subCategories
    .filter(subCategory => {
      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
          subCategory.sub_category_name.toLowerCase().includes(search) ||
          (subCategory.description && subCategory.description.toLowerCase().includes(search)) ||
          getCategoryName(subCategory.category_id).toLowerCase().includes(search)
        );
        if (!matchesSearch) return false;
      }

      // Apply stock filter
      const itemCount = subCategory.item_count || 0;
      if (stockFilter === 'with-stock' && itemCount === 0) return false;
      if (stockFilter === 'without-stock' && itemCount > 0) return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by parent category name
      const categoryA = getCategoryName(a.category_id).toLowerCase();
      const categoryB = getCategoryName(b.category_id).toLowerCase();
      return categoryA.localeCompare(categoryB);
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading sub-categories...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sub-Category Manager</h1>
          <p className="text-gray-600 mt-1">Manage inventory sub-categories</p>
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
                <p className="text-sm font-medium text-gray-600">Total Sub-Categories</p>
                <h3 className="text-3xl font-bold mt-2">{subCategories.length}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Tag className="h-6 w-6 text-blue-600" />
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
                  {subCategories.filter(subCat => (subCat.item_count || 0) > 0).length}
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
                  {subCategories.filter(subCat => (subCat.item_count || 0) === 0).length}
                </h3>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Categories Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Tag className="w-5 h-5" />
              <CardTitle>Sub-Categories</CardTitle>
            </div>
            <Button 
              onClick={() => setShowSubCategoryForm(!showSubCategoryForm)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sub-Category</span>
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search sub-categories by name, description, or parent category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Sub-Category Form */}
          {showSubCategoryForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-4">{editingSubCategory ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parent_category">Parent Category *</Label>
                  <Select 
                    value={subCategoryForm.category_id} 
                    onValueChange={(value) => setSubCategoryForm({...subCategoryForm, category_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sub_category_name">Sub-Category Name *</Label>
                  <Input
                    id="sub_category_name"
                    value={subCategoryForm.sub_category_name}
                    onChange={(e) => setSubCategoryForm({...subCategoryForm, sub_category_name: e.target.value})}
                    placeholder="Enter sub-category name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="sub_category_description">Description</Label>
                  <Input
                    id="sub_category_description"
                    value={subCategoryForm.description}
                    onChange={(e) => setSubCategoryForm({...subCategoryForm, description: e.target.value})}
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="sub_category_status">Status</Label>
                  <Select 
                    value={subCategoryForm.status} 
                    onValueChange={(value) => setSubCategoryForm({...subCategoryForm, status: value})}
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
              <div className="flex space-x-2 mt-4">
                <Button onClick={editingSubCategory ? handleUpdateSubCategory : handleCreateSubCategory}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingSubCategory ? 'Update Sub-Category' : 'Save Sub-Category'}
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

          {/* Sub-Categories Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Sub-Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    {searchTerm ? 'No sub-categories found matching your search.' : 'No sub-categories found. Click "Add Sub-Category" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubCategories.map((subCategory) => (
                  <TableRow key={subCategory.id} className="h-12">
                    <TableCell className="font-medium py-2">{getCategoryName(subCategory.category_id)}</TableCell>
                    <TableCell className="py-2">{subCategory.sub_category_name}</TableCell>
                    <TableCell className="py-2">{subCategory.description || '-'}</TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="link"
                        className="text-blue-600 hover:text-blue-800 font-semibold p-0 h-auto flex items-center gap-1"
                        onClick={() => navigate(`/dashboard/inventory-all-items?subCategory=${subCategory.id}`)}
                        title={`View ${subCategory.item_count || 0} items in this sub-category`}
                      >
                        {subCategory.item_count || 0}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditSubCategory(subCategory)}
                          title="Edit Sub-Category"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* Delete button hidden */}
                          {/* <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteSubCategory(subCategory.id, subCategory.sub_category_name)}
                          title="Delete Sub-Category"
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

export default SubCategories;

