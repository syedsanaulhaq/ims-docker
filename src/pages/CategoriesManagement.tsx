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
  FolderOpen, 
  Tag, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Building2,
  Settings,
  Search,
  Filter,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateDMY } from '@/utils/dateUtils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Category {
  id: string;
  category_name: string;
  description: string;
  item_type?: string; // 'Dispensable' or 'Indispensable'
  status: string;
  created_at: string;
  updated_at: string;
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface SubCategory {
  id: string;
  category_id: string;
  sub_category_name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface CategoryWithSubs extends Category {
  subCategories: SubCategory[];
  isExpanded: boolean;
}

const CategoriesManagement = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoriesWithSubs, setCategoriesWithSubs] = useState<CategoryWithSubs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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

  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSubCategoryDialog, setShowSubCategoryDialog] = useState(false);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<string | null>(null);

  // Form states
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
  const fetchData = async (includeDeleted = false) => {
    try {
      setIsLoading(true);
      
      const catUrl = includeDeleted 
        ? 'http://localhost:3001/api/categories?includeDeleted=true'
        : 'http://localhost:3001/api/categories';
      const subCatUrl = includeDeleted 
        ? 'http://localhost:3001/api/sub-categories?includeDeleted=true'
        : 'http://localhost:3001/api/sub-categories';

      const [categoriesRes, subCategoriesRes] = await Promise.all([
        fetch(catUrl),
        fetch(subCatUrl)
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

  // Combine categories with their sub-categories
  useEffect(() => {
    const combined = categories.map(category => ({
      ...category,
      subCategories: subCategories.filter(sub => sub.category_id === category.id),
      isExpanded: false
    }));
    setCategoriesWithSubs(combined);
  }, [categories, subCategories]);

  useEffect(() => {
    fetchData(showDeleted);
  }, [showDeleted]);

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    setCategoriesWithSubs(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, isExpanded: !cat.isExpanded }
          : cat
      )
    );
  };

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
      const response = await fetch('http://localhost:3001/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category created successfully",
        });
        resetCategoryForm();
        fetchData();
      } else {
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      });
    }
  };

  // Create new sub-category
  const handleCreateSubCategory = async () => {
    if (!subCategoryForm.category_id || !subCategoryForm.sub_category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Parent category and sub-category name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/sub-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subCategoryForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category created successfully",
        });
        resetSubCategoryForm();
        fetchData();
      } else {
        throw new Error('Failed to create sub-category');
      }
    } catch (error) {
      console.error('Error creating sub-category:', error);
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
    setShowCategoryDialog(true);
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
    setShowSubCategoryDialog(true);
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
      const response = await fetch(`http://localhost:3001/api/categories/${editingCategory}`, {
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
        resetCategoryForm();
        fetchData();
      } else {
        throw new Error('Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  // Update sub-category
  const handleUpdateSubCategory = async () => {
    if (!editingSubCategory) return;
    
    if (!subCategoryForm.category_id || !subCategoryForm.sub_category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Parent category and sub-category name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/sub-categories/${editingSubCategory}`, {
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
        resetSubCategoryForm();
        fetchData();
      } else {
        throw new Error('Failed to update sub-category');
      }
    } catch (error) {
      console.error('Error updating sub-category:', error);
      toast({
        title: "Error",
        description: "Failed to update sub-category",
        variant: "destructive"
      });
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Move "${categoryName}" to trash?`)) {
      return;
    }

    try {
      setDeletingId(categoryId);
      const response = await fetch(`http://localhost:3001/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category moved to trash",
        });
        fetchData(showDeleted);
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Restore category
  const handleRestoreCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Restore "${categoryName}"?`)) {
      return;
    }

    try {
      setRestoringId(categoryId);
      const response = await fetch(`http://localhost:3001/api/categories/${categoryId}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category restored successfully",
        });
        fetchData(showDeleted);
      } else {
        throw new Error('Failed to restore category');
      }
    } catch (error) {
      console.error('Error restoring category:', error);
      toast({
        title: "Error",
        description: "Failed to restore category",
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  };

  // Delete sub-category
  const handleDeleteSubCategory = async (subCategoryId: string, subCategoryName: string) => {
    if (!confirm(`Move "${subCategoryName}" to trash?`)) {
      return;
    }

    try {
      setDeletingId(subCategoryId);
      const response = await fetch(`http://localhost:3001/api/sub-categories/${subCategoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category moved to trash",
        });
        fetchData(showDeleted);
      } else {
        throw new Error('Failed to delete sub-category');
      }
    } catch (error) {
      console.error('Error deleting sub-category:', error);
      toast({
        title: "Error",
        description: "Failed to delete sub-category",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Restore sub-category
  const handleRestoreSubCategory = async (subCategoryId: string, subCategoryName: string) => {
    if (!confirm(`Restore "${subCategoryName}"?`)) {
      return;
    }

    try {
      setRestoringId(subCategoryId);
      const response = await fetch(`http://localhost:3001/api/sub-categories/${subCategoryId}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category restored successfully",
        });
        fetchData(showDeleted);
      } else {
        throw new Error('Failed to restore sub-category');
      }
    } catch (error) {
      console.error('Error restoring sub-category:', error);
      toast({
        title: "Error",
        description: "Failed to restore sub-category",
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  };

  // Reset forms
  const resetCategoryForm = () => {
    setCategoryForm({ category_name: '', description: '', status: 'Active' });
    setShowCategoryDialog(false);
    setEditingCategory(null);
  };

  const resetSubCategoryForm = () => {
    setSubCategoryForm({ category_id: '', sub_category_name: '', description: '', status: 'Active' });
    setShowSubCategoryDialog(false);
    setEditingSubCategory(null);
  };

  // Enhanced filter categories based on search and status
  const filteredCategories = categoriesWithSubs.filter(category => {
    // Filter by deleted status
    if (!showDeleted && (category.is_deleted === 1 || category.is_deleted === true)) {
      return false;
    }
    if (showDeleted && (category.is_deleted === 0 || category.is_deleted === false)) {
      return false;
    }

    // If no search term, only apply status filter
    if (!searchTerm.trim()) {
      const matchesStatus = statusFilter === 'All' || category.status === statusFilter;
      return matchesStatus;
    }

    // Search in multiple fields
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      // Category fields
      category.category_name.toLowerCase().includes(searchLower) ||
      category.description?.toLowerCase().includes(searchLower) ||
      category.status.toLowerCase().includes(searchLower) ||
      // Sub-category fields
      category.subCategories.some(sub => 
        sub.sub_category_name.toLowerCase().includes(searchLower) ||
        sub.description?.toLowerCase().includes(searchLower) ||
        sub.status.toLowerCase().includes(searchLower)
      );
    
    const matchesStatus = statusFilter === 'All' || category.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get category statistics
  const stats = {
    totalCategories: categories.length,
    activeCategories: categories.filter(c => c.status === 'Active').length,
    totalSubCategories: subCategories.length,
    activeSubCategories: subCategories.filter(s => s.status === 'Active').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Categories Management
          </h1>
          <p className="text-gray-600 mt-1">Manage product categories and sub-categories</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Update the category details below.' : 'Create a new category for organizing products.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="category_name">Category Name *</Label>
                  <Input
                    id="category_name"
                    value={categoryForm.category_name}
                    onChange={(e) => setCategoryForm({...categoryForm, category_name: e.target.value})}
                    placeholder="Enter category name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    placeholder="Enter description (optional)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="item_type">Item Type *</Label>
                  <Select 
                    value={categoryForm.item_type} 
                    onValueChange={(value) => setCategoryForm({...categoryForm, item_type: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dispensable">Dispensable</SelectItem>
                      <SelectItem value="Indispensable">Indispensable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={categoryForm.status} 
                    onValueChange={(value) => setCategoryForm({...categoryForm, status: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between w-full">
                  {editingCategory ? (
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        handleDeleteCategory(editingCategory, categoryForm.category_name);
                        setShowCategoryDialog(false);
                      }}
                      disabled={deletingId === editingCategory}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deletingId === editingCategory ? 'Deleting...' : 'Delete Category'}
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => resetCategoryForm()}>
                      Cancel
                    </Button>
                    <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingCategory ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSubCategoryDialog} onOpenChange={setShowSubCategoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Tag className="w-4 h-4 mr-2" />
                Sub-Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  {editingSubCategory ? 'Edit Sub-Category' : 'Add New Sub-Category'}
                </DialogTitle>
                <DialogDescription>
                  {editingSubCategory ? 'Update the sub-category details below.' : 'Create a new sub-category under a parent category.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="parent_category">Parent Category *</Label>
                  <Select 
                    value={subCategoryForm.category_id} 
                    onValueChange={(value) => setSubCategoryForm({...subCategoryForm, category_id: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.status === 'Active').map((category) => (
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
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sub_description">Description</Label>
                  <Input
                    id="sub_description"
                    value={subCategoryForm.description}
                    onChange={(e) => setSubCategoryForm({...subCategoryForm, description: e.target.value})}
                    placeholder="Enter description (optional)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sub_status">Status</Label>
                  <Select 
                    value={subCategoryForm.status} 
                    onValueChange={(value) => setSubCategoryForm({...subCategoryForm, status: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between w-full">
                  {editingSubCategory ? (
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        handleDeleteSubCategory(editingSubCategory, subCategoryForm.sub_category_name);
                        setShowSubCategoryDialog(false);
                      }}
                      disabled={deletingId === editingSubCategory}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deletingId === editingSubCategory ? 'Deleting...' : 'Delete Sub-Category'}
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => resetSubCategoryForm()}>
                      Cancel
                    </Button>
                    <Button onClick={editingSubCategory ? handleUpdateSubCategory : handleCreateSubCategory}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingSubCategory ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
            </div>
            <FolderOpen className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Categories</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeCategories}</p>
            </div>
            <Settings className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sub-Categories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubCategories}</p>
            </div>
            <Tag className="w-8 h-8 text-purple-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sub-Categories</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeSubCategories}</p>
            </div>
            <Settings className="w-8 h-8 text-green-600" />
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
                placeholder="🔍 Search categories, sub-categories, descriptions... (Ctrl+K)"
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
              {/* Status Filter */}
              <div className="flex items-center gap-2 min-w-fit">
                <Filter className="w-4 h-4 text-blue-500" />
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-10 border-blue-200 focus:border-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        All Status
                      </div>
                    </SelectItem>
                    <SelectItem value="Active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Active Only
                      </div>
                    </SelectItem>
                    <SelectItem value="Inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Inactive Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show Deleted Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-blue-100 bg-white/60">
                <Trash2 className="w-4 h-4 text-red-500" />
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {showDeleted ? 'Showing Deleted' : 'Show Deleted'}
                </Label>
                <button
                  onClick={() => setShowDeleted(!showDeleted)}
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium transition ${
                    showDeleted
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {showDeleted ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Search Results Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-full border border-blue-100">
                <Tag className="w-4 h-4" />
                <span className="font-medium">
                  {filteredCategories.length} of {categoriesWithSubs.length} categories
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
                className={`h-8 ${statusFilter === 'Active' ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-green-50'}`}
                onClick={() => setStatusFilter('Active')}
              >
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                Active Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${statusFilter === 'Inactive' ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-red-50'}`}
                onClick={() => setStatusFilter('Inactive')}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                Inactive Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${statusFilter === 'All' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-blue-50'}`}
                onClick={() => setStatusFilter('All')}
              >
                <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                Show All
              </Button>
            </div>
          )}

          {/* Search Tips */}
          {searchTerm && filteredCategories.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Search className="w-4 h-4" />
                <span className="font-medium">No results found for "{searchTerm}"</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Try searching for category names, sub-category names, or descriptions. 
                You can also check different status filters.
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  Clear Search
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter('All')}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  Show All Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Master-Detail Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Categories & Sub-Categories
          </CardTitle>
          <CardDescription>
            Click on a category row to expand and view its sub-categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Item Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sub-Categories</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <React.Fragment key={category.id}>
                  {/* Category Row */}
                  <TableRow 
                    className="cursor-pointer hover:bg-gray-50 group"
                    onClick={() => toggleCategoryExpansion(category.id)}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        {category.isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        {category.category_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          category.item_type === 'Indispensable' 
                            ? 'bg-orange-50 text-orange-700 border-orange-200' 
                            : 'bg-green-50 text-green-700 border-green-200'
                        }
                      >
                        {category.item_type || 'Dispensable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.status === 'Active' ? 'default' : 'secondary'}>
                        {category.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {category.subCategories.length} items
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateDMY(category.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!showDeleted && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCategory(category);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category.id, category.category_name);
                                }}
                                className="text-red-600"
                                disabled={deletingId === category.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === category.id ? 'Deleting...' : 'Delete Category'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {showDeleted && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreCategory(category.id, category.category_name);
                              }}
                              className="text-green-600"
                              disabled={restoringId === category.id}
                            >
                              💚 {restoringId === category.id ? 'Restoring...' : 'Restore Category'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Sub-Categories Rows (Expanded) */}
                  {category.isExpanded && category.subCategories.map((subCategory) => (
                    <TableRow key={subCategory.id} className="bg-gray-50/50">
                      <TableCell></TableCell>
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-px bg-gray-300"></div>
                          <Tag className="w-4 h-4 text-purple-600" />
                          <span className="text-gray-700">{subCategory.sub_category_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {subCategory.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subCategory.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                          {subCategory.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                          Sub-Category
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDateDMY(subCategory.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!showDeleted && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleEditSubCategory(subCategory)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Sub-Category
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSubCategory(subCategory.id, subCategory.sub_category_name)}
                                  className="text-red-600"
                                  disabled={deletingId === subCategory.id}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {deletingId === subCategory.id ? 'Deleting...' : 'Delete Sub-Category'}
                                </DropdownMenuItem>
                              </>
                            )}
                            {showDeleted && (
                              <DropdownMenuItem
                                onClick={() => handleRestoreSubCategory(subCategory.id, subCategory.sub_category_name)}
                                className="text-green-600"
                                disabled={restoringId === subCategory.id}
                              >
                                💚 {restoringId === subCategory.id ? 'Restoring...' : 'Restore Sub-Category'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}

              {filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No categories found matching your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoriesManagement;