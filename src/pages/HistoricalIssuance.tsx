import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useOffices } from '@/hooks/useOffices';

interface IssuanceItem {
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  remarks?: string;
  category_name?: string;
}

interface User {
  Id: string;
  UserName: string;
  FullName?: string;
  Email?: string;
  intOfficeID?: number;
  intWingID?: number;
}

interface Wing {
  Id: number;
  Name: string;
  ShortName?: string;
  OfficeID?: number;
}

interface Office {
  intOfficeID: number;
  strOfficeName: string;
}

export default function HistoricalIssuance() {
  const navigate = useNavigate();
  const { offices, wings, loadWings } = useOffices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    request_type: 'personal', // 'personal' or 'wing'
    requested_by_id: '',
    requested_for_wing_id: '',
    request_date: new Date().toISOString().split('T')[0],
    approval_date: new Date().toISOString().split('T')[0],
    issuance_date: new Date().toISOString().split('T')[0],
    purpose: '',
    remarks: '',
  });

  // Hierarchical selection state
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [selectedWingId, setSelectedWingId] = useState<number | null>(null);

  // Dropdown data
  const [users, setUsers] = useState<User[]>([]);
  const [itemMasters, setItemMasters] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Items to issue
  const [items, setItems] = useState<IssuanceItem[]>([]);
  const [newItem, setNewItem] = useState({
    item_master_id: '',
    quantity: 1,
    remarks: '',
  });
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Load wings when office is selected
  useEffect(() => {
    if (selectedOfficeId) {
      loadWings(selectedOfficeId);
    }
  }, [selectedOfficeId]);

  const fetchInitialData = async () => {
    try {
      // Fetch all users
      const usersResponse = await fetch(`${getApiBaseUrl()}/auth/users`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      // Fetch item masters
      const itemsResponse = await fetch(`${getApiBaseUrl()}/item-masters`);
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        const itemsList = itemsData.items || [];
        setItemMasters(itemsList);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(itemsList
          .filter((item: any) => item.category_name)
          .map((item: any) => item.category_name)
        )].sort() as string[];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load form data');
    }
  };

  const handleAddItem = () => {
    if (!newItem.item_master_id || newItem.quantity <= 0) {
      alert('Please select an item and enter a valid quantity');
      return;
    }

    const selectedItem = itemMasters.find(im => im.id === newItem.item_master_id);
    if (!selectedItem) return;

    const issuanceItem: IssuanceItem = {
      item_master_id: newItem.item_master_id,
      nomenclature: selectedItem.nomenclature,
      quantity: newItem.quantity,
      remarks: newItem.remarks,
      category_name: selectedItem.category_name,
    };

    setItems([...items, issuanceItem]);
    setNewItem({ item_master_id: '', quantity: 1, remarks: '' });
    setSelectedCategory('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Filtered data based on hierarchical selection
  const filteredWings = selectedOfficeId 
    ? wings.filter(w => w.OfficeID === selectedOfficeId)
    : [];

  const filteredUsers = selectedWingId
    ? users.filter(u => u.intWingID === selectedWingId)
    : selectedOfficeId
    ? users.filter(u => u.intOfficeID === selectedOfficeId)
    : users;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!selectedOfficeId) {
      setError('Please select an office');
      return;
    }
    if (formData.request_type === 'personal') {
      if (!selectedWingId) {
        setError('Please select a wing');
        return;
      }
      if (!formData.requested_by_id) {
        setError('Please select a person');
        return;
      }
    }
    if (formData.request_type === 'wing' && !formData.requested_for_wing_id) {
      setError('Please select a wing');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    if (!formData.purpose.trim()) {
      setError('Please enter the purpose');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          item_master_id: item.item_master_id,
          quantity_requested: item.quantity,
          quantity_approved: item.quantity,
          quantity_issued: item.quantity,
          remarks: item.remarks,
        })),
      };

      const response = await fetch(`${getApiBaseUrl()}/stock-issuance/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create historical issuance');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/inventory-issuance');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating historical issuance:', err);
      setError(err.message || 'Failed to create historical issuance');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory
    ? itemMasters.filter(item => item.category_name === selectedCategory)
    : itemMasters;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/inventory-issuance')} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Historical Issuance Entry</h1>
          <p className="text-sm text-gray-600 mt-1">Create records for past inventory issuances</p>
        </div>
      </div>

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Historical issuance created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Request Type */}
              <div>
                <Label>Request Type *</Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      request_type: value,
                      requested_by_id: '',
                      requested_for_wing_id: '',
                    }));
                    setSelectedOfficeId(null);
                    setSelectedWingId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Staff Request</SelectItem>
                    <SelectItem value="wing">Wing Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Office Selection */}
              <div>
                <Label>Office *</Label>
                <Select
                  value={selectedOfficeId?.toString() || ''}
                  onValueChange={(value) => {
                    const officeId = parseInt(value);
                    setSelectedOfficeId(officeId);
                    setSelectedWingId(null);
                    setFormData(prev => ({
                      ...prev,
                      requested_by_id: '',
                      requested_for_wing_id: '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map(office => (
                      <SelectItem key={office.intOfficeID} value={office.intOfficeID.toString()}>
                        {office.strOfficeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wing Selection - For both Personal and Wing requests */}
              {formData.request_type === 'wing' ? (
                <div>
                  <Label>Wing *</Label>
                  <Select
                    value={formData.requested_for_wing_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, requested_for_wing_id: value }))}
                    disabled={!selectedOfficeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedOfficeId ? "Select wing..." : "Select office first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredWings.map(wing => (
                        <SelectItem key={wing.Id} value={wing.Id.toString()}>
                          {wing.Name} {wing.ShortName && `(${wing.ShortName})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  {/* Wing Selection for Personal Request */}
                  <div>
                    <Label>Wing *</Label>
                    <Select
                      value={selectedWingId?.toString() || ''}
                      onValueChange={(value) => {
                        const wingId = parseInt(value);
                        setSelectedWingId(wingId);
                        setFormData(prev => ({ ...prev, requested_by_id: '' }));
                      }}
                      disabled={!selectedOfficeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedOfficeId ? "Select wing..." : "Select office first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredWings.map(wing => (
                          <SelectItem key={wing.Id} value={wing.Id.toString()}>
                            {wing.Name} {wing.ShortName && `(${wing.ShortName})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Person Selection */}
                  <div>
                    <Label>Requested By (Person) *</Label>
                    <Select
                      value={formData.requested_by_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, requested_by_id: value }))}
                      disabled={!selectedWingId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedWingId ? "Select person..." : "Select wing first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map(user => (
                          <SelectItem key={user.Id} value={user.Id}>
                            {user.FullName || user.UserName} {user.Email && `(${user.Email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Request Date */}
              <div>
                <Label>Request Date *</Label>
                <Input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, request_date: e.target.value }))}
                  required
                />
              </div>

              {/* Approval Date */}
              <div>
                <Label>Approval Date *</Label>
                <Input
                  type="date"
                  value={formData.approval_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, approval_date: e.target.value }))}
                  required
                />
              </div>

              {/* Issuance Date */}
              <div>
                <Label>Issuance Date *</Label>
                <Input
                  type="date"
                  value={formData.issuance_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuance_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <Label>Purpose *</Label>
              <Textarea
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="e.g., Official use, New employee setup, Wing office furniture..."
                rows={3}
                required
              />
            </div>

            {/* Remarks */}
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Additional notes about this historical issuance..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Items Section */}
        <Card>
          <CardHeader>
            <CardTitle>Items to Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setNewItem(prev => ({ ...prev, item_master_id: '' }));
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Item *</Label>
                <Select
                  value={newItem.item_master_id}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, item_master_id: value }))}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={selectedCategory ? "Select item..." : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nomenclature}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="h-9"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="h-9 w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.nomenclature}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category_name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Use the form above to add items.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Ready to create historical issuance with {items.length} item(s)
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ This will create a complete issuance record (request + approval + issuance)
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/inventory-issuance')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || items.length === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Historical Issuance'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
