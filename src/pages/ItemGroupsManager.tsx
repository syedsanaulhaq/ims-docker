import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

interface ItemGroup {
  id: string;
  group_code: string;
  group_name: string;
  description: string;
  item_count?: number;
  created_at?: string;
}

interface ItemMaster {
  id?: string;
  item_id?: string;
  item_master_id?: string;
  item_code?: string;
  code?: string;
  item_name?: string;
  nomenclature?: string;
  name?: string;
  category_id?: string;
  unit?: string;
  specifications?: string;
  description?: string;
}

export const ItemGroupsManager: React.FC = () => {
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [itemFilter, setItemFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupItems, setGroupItems] = useState<{ [key: string]: ItemMaster[] }>({});
  const [newItemData, setNewItemData] = useState({
    nomenclature: '',
    item_code: '',
    unit: '',
    specifications: '',
    description: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    group_code: '',
    group_name: '',
    description: '',
    itemIds: [] as string[]
  });

  // Load data
  useEffect(() => {
    loadGroups();
    loadItems();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/item-groups');
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
      alert('Failed to load item groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupItems = async (groupId: string) => {
    try {
      const response = await fetch(`/api/item-groups/${groupId}/items`);
      const data = await response.json();
      setGroupItems(prev => ({ ...prev, [groupId]: data }));
    } catch (error) {
      console.error('Error loading group items:', error);
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      // Load items when expanding if not already loaded
      if (!groupItems[groupId]) {
        loadGroupItems(groupId);
      }
    }
    setExpandedGroups(newExpanded);
  };

  const loadItems = async () => {
    try {
      const response = await fetch('/api/item-masters');
      if (response.ok) {
        const data = await response.json();
        // Handle different possible response formats
        const processedItems = Array.isArray(data) ? data : (data.data || data.items || []);
        setItems(processedItems);
        }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.group_code || !formData.group_name) {
      alert('Group code and name are required');
      return;
    }

    try {
      const response = await fetch('/api/item-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: 'Current User'
        })
      });

      if (response.ok) {
        alert('✅ Item group created successfully!');
        loadGroups();
        setShowCreateDialog(false);
        resetForm();
      } else {
        alert('❌ Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const handleAddItem = async () => {
    if (!newItemData.nomenclature || !newItemData.item_code) {
      alert('Item name and code are required');
      return;
    }

    try {
      const response = await fetch('/api/item-masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemData)
      });
      if (response.ok) {
        alert('Item created successfully');
        setNewItemData({ nomenclature: '', item_code: '', unit: '', specifications: '', description: '' });
        setShowAddItemDialog(false);
        loadItems();
      } else {
        alert('Failed to create item');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Error creating item');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group? Associated items will be removed.')) {
      try {
        const response = await fetch(`/api/item-groups/${groupId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          alert('✅ Group deleted successfully!');
          loadGroups();
        } else {
          alert('❌ Failed to delete group');
        }
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      group_code: '',
      group_name: '',
      description: '',
      itemIds: []
    });
    setSelectedItems([]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Item Groups</h1>
          <p className="text-gray-600">Manage item groups for annual tenders</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Item Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Item Group</DialogTitle>
              <DialogDescription>
                Create a group and add items to it
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Group Code *</Label>
                <Input
                  value={formData.group_code}
                  onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
                  placeholder="e.g., FUR-G1"
                />
              </div>

              <div>
                <Label>Group Name *</Label>
                <Input
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  placeholder="e.g., Furniture Group 1"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Group description..."
                  rows={3}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">Select Items ({items.length} available)</Label>
                  <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Item</DialogTitle>
                        <DialogDescription>
                          Add a new item to the Item Master
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Item Name *</Label>
                          <Input
                            placeholder="e.g., Office Chair"
                            value={newItemData.nomenclature}
                            onChange={(e) => setNewItemData({ ...newItemData, nomenclature: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Item Code *</Label>
                          <Input
                            placeholder="e.g., CHAIR-001"
                            value={newItemData.item_code}
                            onChange={(e) => setNewItemData({ ...newItemData, item_code: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Input
                            placeholder="e.g., Unit, Piece, Box"
                            value={newItemData.unit}
                            onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Specifications</Label>
                          <Textarea
                            placeholder="e.g., Ergonomic design, adjustable height"
                            value={newItemData.specifications}
                            onChange={(e) => setNewItemData({ ...newItemData, specifications: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Additional details about the item"
                            value={newItemData.description}
                            onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddItem} className="w-full">
                          Create Item
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {items.length > 0 && (
                  <Input
                    placeholder="Filter items by name or code..."
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value)}
                    className="mb-3"
                  />
                )}

                {items.length === 0 ? (
                  <div className="border rounded p-6 bg-yellow-50 text-center">
                    <p className="text-yellow-800 font-medium">⚠️ No items found in Item Master</p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Please create items using the "Add Item" button above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-4 bg-gray-50">
                    {items.filter((item) => {
                      const itemName = item.nomenclature || item.item_name || item.name || '';
                      const itemCode = item.item_code || item.code || '';
                      const filterLower = itemFilter.toLowerCase();
                      return itemName.toLowerCase().includes(filterLower) || itemCode.toLowerCase().includes(filterLower);
                    }).map((item) => {
                      // Handle different possible field names
                      const itemId = item.id || item.item_id || item.item_master_id;
                      const itemName = item.nomenclature || item.item_name || item.name;
                      const itemCode = item.item_code || item.code || '';
                      
                      return (
                        <label 
                          key={itemId} 
                          className="flex items-center gap-3 p-3 hover:bg-white rounded cursor-pointer transition-colors border border-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={formData.itemIds.includes(itemId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, itemIds: [...formData.itemIds, itemId] });
                              } else {
                                setFormData({ ...formData, itemIds: formData.itemIds.filter(id => id !== itemId) });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-base text-blue-900">
                              {itemName}  ({itemCode})
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {formData.itemIds.length} item(s)
                </p>
              </div>

              <Button onClick={handleCreateGroup} className="w-full">
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading item groups...</div>
        ) : groups.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No item groups created yet</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          groups.map(group => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.group_name}</CardTitle>
                    <p className="text-sm text-gray-600">{group.group_code}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.description && (
                  <p className="text-sm text-gray-700">{group.description}</p>
                )}
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroupExpand(group.id)}
                    className="w-full flex justify-between items-center text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <span>{group.item_count || 0} items in group</span>
                    {expandedGroups.has(group.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  {expandedGroups.has(group.id) && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {groupItems[group.id] && groupItems[group.id].length > 0 ? (
                        groupItems[group.id].map((item) => (
                          <div key={item.id} className="bg-blue-50 rounded p-2 border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900">
                              {item.nomenclature || item.item_name}
                            </p>
                            <p className="text-xs text-blue-700">
                              Code: {item.item_code || item.code}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">No items in this group</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ItemGroupsManager;

