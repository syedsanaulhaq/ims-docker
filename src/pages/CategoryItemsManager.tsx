import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface ItemWithCategory {
  id: string;
  nomenclature: string;
  item_code: string;
  category_id: string;
  category_name: string;
  unit?: string;
  specifications?: string;
  description?: string;
  status?: string;
  manufacturer?: string;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_point?: number;
  sub_category_id?: string;
}

interface ItemForm {
  nomenclature: string;
  item_code: string;
  unit: string;
  specifications: string;
  description: string;
  status: string;
  minimum_stock_level: number;
  maximum_stock_level: number;
  reorder_point: number;
  manufacturer: string;
}

interface Category {
  id: string;
  category_name: string;
}

export const CategoryItemsManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categoryItems, setCategoryItems] = useState<ItemWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState<ItemForm>({
    nomenclature: '',
    item_code: '',
    unit: 'Pieces',
    specifications: '',
    description: '',
    status: 'Active',
    minimum_stock_level: 0,
    maximum_stock_level: 0,
    reorder_point: 0,
    manufacturer: '',
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [deleteItem, setDeleteItem] = useState<ItemWithCategory | null>(null);

  useEffect(() => {
    loadAllItems();
  }, []);

  const loadAllItems = async () => {
    try {
      setLoading(true);
      
      // Load items from vw_item_masters_with_categories view
      const itemsResponse = await fetch('http://localhost:3001/api/item-masters');
      const itemsData = await itemsResponse.json();
      const itemsArray = Array.isArray(itemsData) ? itemsData : (itemsData.data || itemsData.items || []);
      
      setItems(itemsArray);
      
      // Load categories directly from API (not just from items)
      try {
        const categoriesResponse = await fetch('http://localhost:3001/api/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const categoriesArray = Array.isArray(categoriesData) ? categoriesData : (categoriesData.data || []);
          
          // Keep full category objects with id and category_name
          const categoryObjects: Category[] = categoriesArray
            .filter((cat: any) => cat.id && cat.category_name)
            .map((cat: any) => ({
              id: cat.id,
              category_name: cat.category_name
            }))
            .sort((a, b) => a.category_name.localeCompare(b.category_name));
          
          setCategories(categoryObjects);
          
          if (categoryObjects.length > 0) {
            setSelectedCategory(categoryObjects[0]);
            filterItemsByCategory(categoryObjects[0].category_name, itemsArray);
          }
        } else {
          // Fallback: extract from items if API fails
          const uniqueCategoryMap = new Map<string, string>();
          itemsArray.forEach((item: ItemWithCategory) => {
            if (item.category_name && item.category_id) {
              uniqueCategoryMap.set(item.category_name, item.category_id);
            }
          });
          
          const categoryObjects: Category[] = Array.from(uniqueCategoryMap.entries())
            .map(([name, id]) => ({ id, category_name: name }))
            .sort((a, b) => a.category_name.localeCompare(b.category_name));
          
          setCategories(categoryObjects);
          
          if (categoryObjects.length > 0) {
            setSelectedCategory(categoryObjects[0]);
            filterItemsByCategory(categoryObjects[0].category_name, itemsArray);
          }
        }
      } catch (error) {
        // Fallback: extract from items if API call fails
        console.error('Error fetching categories from API, using items fallback:', error);
        const uniqueCategoryMap = new Map<string, string>();
        itemsArray.forEach((item: ItemWithCategory) => {
          if (item.category_name && item.category_id) {
            uniqueCategoryMap.set(item.category_name, item.category_id);
          }
        });
        
        const categoryObjects: Category[] = Array.from(uniqueCategoryMap.entries())
          .map(([name, id]) => ({ id, category_name: name }))
          .sort((a, b) => a.category_name.localeCompare(b.category_name));
        
        setCategories(categoryObjects);
        
        if (categoryObjects.length > 0) {
          setSelectedCategory(categoryObjects[0]);
          filterItemsByCategory(categoryObjects[0].category_name, itemsArray);
        }
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItemsByCategory = (categoryName: string, allItems: ItemWithCategory[]) => {
    const filtered = allItems.filter(item => item.category_name === categoryName);
    setCategoryItems(filtered);
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    filterItemsByCategory(category.category_name, items);
  };

  const handleAddItem = async () => {
    if (!itemForm.nomenclature || !itemForm.item_code || !selectedCategory) {
      alert('Please fill in item name and code');
      return;
    }

    try {
      if (!selectedCategory) {
        alert('Please select a category');
        return;
      }

      const response = await fetch('http://localhost:3001/api/item-masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomenclature: itemForm.nomenclature,
          item_code: itemForm.item_code,
          category_id: selectedCategory.id,
          unit: itemForm.unit || 'Pieces',
          specifications: itemForm.specifications || null,
          description: itemForm.description || null,
          status: itemForm.status || 'Active',
          minimum_stock_level: itemForm.minimum_stock_level || 0,
          maximum_stock_level: itemForm.maximum_stock_level || 0,
          reorder_point: itemForm.reorder_point || 0,
          manufacturer: itemForm.manufacturer || null,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      // Save current category ID before reloading
      const currentCategoryId = selectedCategory.id;
      const currentCategoryName = selectedCategory.category_name;
      
      // Reload items from API
      const itemsResponse = await fetch('http://localhost:3001/api/item-masters');
      const itemsData = await itemsResponse.json();
      const newItemsArray = Array.isArray(itemsData) ? itemsData : (itemsData.data || itemsData.items || []);
      setItems(newItemsArray);
      
      // Filter items for the current category
      const filteredItems = newItemsArray.filter((item: ItemWithCategory) => item.category_id === currentCategoryId);
      setCategoryItems(filteredItems);
      
      setShowAddItemDialog(false);
      setItemForm({
        nomenclature: '',
        item_code: '',
        unit: 'Pieces',
        specifications: '',
        description: '',
        status: 'Active',
        minimum_stock_level: 0,
        maximum_stock_level: 0,
        reorder_point: 0,
        manufacturer: '',
      });
      alert('✅ Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !itemForm.nomenclature || !itemForm.item_code) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/item-masters/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomenclature: itemForm.nomenclature,
          item_code: itemForm.item_code,
          category_id: editingItem.category_id,
          unit: itemForm.unit || 'Pieces',
          specifications: itemForm.specifications || null,
          description: itemForm.description || null,
          status: itemForm.status || 'Active',
          minimum_stock_level: itemForm.minimum_stock_level || 0,
          maximum_stock_level: itemForm.maximum_stock_level || 0,
          reorder_point: itemForm.reorder_point || 0,
          manufacturer: itemForm.manufacturer || null,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      // Save current category before reloading
      const currentCategoryId = selectedCategory?.id;
      const currentCategoryName = selectedCategory?.category_name;

      await loadAllItems();

      // Restore the selected category
      if (currentCategoryId && currentCategoryName) {
        setSelectedCategory({
          id: currentCategoryId,
          category_name: currentCategoryName
        });
        // Filter items for the current category
        const updatedItems = items.filter((item: ItemWithCategory) => item.category_id === currentCategoryId);
        setCategoryItems(updatedItems);
      }

      setShowEditItemDialog(false);
      setEditingItem(null);
      setItemForm({
        nomenclature: '',
        item_code: '',
        unit: 'Pieces',
        specifications: '',
        description: '',
        status: 'Active',
        minimum_stock_level: 0,
        maximum_stock_level: 0,
        reorder_point: 0,
        manufacturer: '',
      });
      alert('✅ Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;

    try {
      const response = await fetch(`http://localhost:3001/api/item-masters/${deleteItem.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      await loadAllItems();
      setShowDeleteConfirmDialog(false);
      setDeleteItem(null);
      alert('✅ Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const openEditDialog = (item: ItemWithCategory) => {
    setEditingItem(item);
    setItemForm({
      nomenclature: item.nomenclature,
      item_code: item.item_code,
      unit: item.unit || 'Pieces',
      specifications: item.specifications || '',
      description: item.description || '',
      status: item.status || 'Active',
      minimum_stock_level: item.minimum_stock_level || 0,
      maximum_stock_level: item.maximum_stock_level || 0,
      reorder_point: item.reorder_point || 0,
      manufacturer: item.manufacturer || '',
    });
    setShowEditItemDialog(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: newCategoryName,
          description: `Category for ${newCategoryName}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      await loadAllItems();
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
      setNewCategoryCode('');
      alert('✅ Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Category Items</h1>
        <p className="text-gray-600">View and manage items from vw_item_masters_with_categories</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="text-lg">Categories</CardTitle>
                  <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 p-2 h-auto">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                          Create a new category for organizing items
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Category Name *</label>
                          <Input
                            placeholder="e.g., Office Equipment"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Category Code (Optional)</label>
                          <Input
                            placeholder="e.g., OFFICE_EQ (auto-generated if blank)"
                            value={newCategoryCode}
                            onChange={(e) => setNewCategoryCode(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddCategoryDialog(false);
                              setNewCategoryName('');
                              setNewCategoryCode('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddCategory} className="gap-2">
                            <Check className="w-4 h-4" />
                            Create Category
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No categories</p>
                  ) : (
                    categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleSelectCategory(category)}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-all text-sm ${
                          selectedCategory?.id === category.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold">{category.category_name}</p>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Management */}
          <div className="lg:col-span-3">
            {selectedCategory ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{selectedCategory.category_name}</CardTitle>
                      <p className="text-sm text-gray-600">{categoryItems.length} item(s)</p>
                    </div>
                    <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Item</DialogTitle>
                          <DialogDescription>
                            Add a new item to {selectedCategory.category_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Item Code *</label>
                              <Input
                                placeholder="e.g., CHAIR-001"
                                value={itemForm.item_code}
                                onChange={(e) => setItemForm({...itemForm, item_code: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Item Name *</label>
                              <Input
                                placeholder="e.g., Office Chair"
                                value={itemForm.nomenclature}
                                onChange={(e) => setItemForm({...itemForm, nomenclature: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Unit</label>
                              <Input
                                placeholder="e.g., Pieces"
                                value={itemForm.unit}
                                onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Manufacturer</label>
                              <Input
                                placeholder="e.g., Sony"
                                value={itemForm.manufacturer}
                                onChange={(e) => setItemForm({...itemForm, manufacturer: e.target.value})}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Specifications</label>
                            <Input
                              placeholder="e.g., 4GB RAM, 256GB SSD"
                              value={itemForm.specifications}
                              onChange={(e) => setItemForm({...itemForm, specifications: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Input
                              placeholder="Item description"
                              value={itemForm.description}
                              onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium">Min Stock</label>
                              <Input
                                type="number"
                                value={itemForm.minimum_stock_level}
                                onChange={(e) => setItemForm({...itemForm, minimum_stock_level: parseInt(e.target.value) || 0})}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Max Stock</label>
                              <Input
                                type="number"
                                value={itemForm.maximum_stock_level}
                                onChange={(e) => setItemForm({...itemForm, maximum_stock_level: parseInt(e.target.value) || 0})}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Reorder Point</label>
                              <Input
                                type="number"
                                value={itemForm.reorder_point}
                                onChange={(e) => setItemForm({...itemForm, reorder_point: parseInt(e.target.value) || 0})}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowAddItemDialog(false);
                                setItemForm({
                                  nomenclature: '',
                                  item_code: '',
                                  unit: 'Pieces',
                                  specifications: '',
                                  description: '',
                                  status: 'Active',
                                  minimum_stock_level: 0,
                                  maximum_stock_level: 0,
                                  reorder_point: 0,
                                  manufacturer: '',
                                });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddItem} className="gap-2">
                              <Check className="w-4 h-4" />
                              Add Item
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {categoryItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No items in this category</p>
                      <p className="text-sm text-gray-400 mt-2">Click "Add Item" to create one</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.nomenclature}</p>
                            <p className="text-xs text-gray-600">Code: {item.item_code}</p>
                            {item.manufacturer && (
                              <p className="text-xs text-gray-600">Manufacturer: {item.manufacturer}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Dialog open={showEditItemDialog && editingItem?.id === item.id} onOpenChange={setShowEditItemDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(item)}
                                  className="gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Item</DialogTitle>
                                  <DialogDescription>
                                    Update item details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-sm font-medium">Item Code *</label>
                                      <Input
                                        placeholder="e.g., CHAIR-001"
                                        value={itemForm.item_code}
                                        onChange={(e) => setItemForm({...itemForm, item_code: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Item Name *</label>
                                      <Input
                                        placeholder="e.g., Office Chair"
                                        value={itemForm.nomenclature}
                                        onChange={(e) => setItemForm({...itemForm, nomenclature: e.target.value})}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-sm font-medium">Unit</label>
                                      <Input
                                        placeholder="e.g., Pieces"
                                        value={itemForm.unit}
                                        onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Manufacturer</label>
                                      <Input
                                        placeholder="e.g., Sony"
                                        value={itemForm.manufacturer}
                                        onChange={(e) => setItemForm({...itemForm, manufacturer: e.target.value})}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-sm font-medium">Specifications</label>
                                    <Input
                                      placeholder="e.g., 4GB RAM, 256GB SSD"
                                      value={itemForm.specifications}
                                      onChange={(e) => setItemForm({...itemForm, specifications: e.target.value})}
                                    />
                                  </div>

                                  <div>
                                    <label className="text-sm font-medium">Description</label>
                                    <Input
                                      placeholder="Item description"
                                      value={itemForm.description}
                                      onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="text-sm font-medium">Min Stock</label>
                                      <Input
                                        type="number"
                                        value={itemForm.minimum_stock_level}
                                        onChange={(e) => setItemForm({...itemForm, minimum_stock_level: parseInt(e.target.value) || 0})}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Max Stock</label>
                                      <Input
                                        type="number"
                                        value={itemForm.maximum_stock_level}
                                        onChange={(e) => setItemForm({...itemForm, maximum_stock_level: parseInt(e.target.value) || 0})}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Reorder Point</label>
                                      <Input
                                        type="number"
                                        value={itemForm.reorder_point}
                                        onChange={(e) => setItemForm({...itemForm, reorder_point: parseInt(e.target.value) || 0})}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex gap-2 justify-end pt-4">
                                    <Button
                                      variant="outline"
                                      onClick={() => setShowEditItemDialog(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={handleEditItem} className="gap-2">
                                      <Check className="w-4 h-4" />
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={showDeleteConfirmDialog && deleteItem?.id === item.id} onOpenChange={setShowDeleteConfirmDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteItem(item)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Item?</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete "{item.nomenclature}"? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirmDialog(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={handleDeleteItem}
                                    className="gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Item
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">Select a category to manage its items</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryItemsManager;
