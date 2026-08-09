import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  User,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Trash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at?: string;
  updated_at?: string;
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

const VendorManagementPage = () => {
  const { toast } = useToast();
  
  // State management
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    tax_number: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended'
  });

  // Load vendors
  const fetchVendors = async (includeDeleted = false) => {
    try {
      setLoading(true);
      const url = includeDeleted 
        ? 'http://localhost:3001/api/vendors?includeDeleted=true'
        : 'http://localhost:3001/api/vendors';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not { vendors: [] }
        setVendors(Array.isArray(data) ? data : (data.vendors || []));
      } else {
        throw new Error('Failed to fetch vendors');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(showDeleted);
  }, [showDeleted]);

  // Generate vendor code
  const generateVendorCode = () => {
    const maxCode = vendors.reduce((max, vendor) => {
      const codeNumber = parseInt(vendor.vendor_code.replace(/\D/g, ''));
      return Math.max(max, isNaN(codeNumber) ? 0 : codeNumber);
    }, 0);
    return `VEN-${String(maxCode + 1).padStart(3, '0')}`;
  };

  // Handle form submit
  const handleSaveVendor = async () => {
    if (!formData.vendor_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const vendorData = {
        ...formData,
        vendor_code: formData.vendor_code || generateVendorCode()
      };

      const url = editingVendor 
        ? `http://localhost:3001/api/vendors/${editingVendor.id}`
        : 'http://localhost:3001/api/vendors';
      
      const method = editingVendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendorData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Vendor ${editingVendor ? 'updated' : 'created'} successfully`,
          variant: "default"
        });
        resetForm();
        fetchVendors(showDeleted);
      } else {
        throw new Error(`Failed to ${editingVendor ? 'update' : 'create'} vendor`);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Operation failed',
        variant: "destructive"
      });
    }
  };

  // Handle edit
  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      country: vendor.country || '',
      tax_number: vendor.tax_number || '',
      status: vendor.status
    });
    setShowForm(true);
  };

  // Handle delete (soft delete)
  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!window.confirm(`Are you sure you want to move vendor "${vendor.vendor_name}" to trash?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/vendors/${vendor.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor moved to trash successfully",
          variant: "default"
        });
        fetchVendors(showDeleted);
      } else {
        throw new Error('Failed to delete vendor');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete vendor',
        variant: "destructive"
      });
    }
  };

  // Handle restore (soft delete restore)
  const handleRestoreVendor = async (vendorId: string) => {
    if (!window.confirm('Restore this vendor?')) {
      return;
    }

    try {
      setRestoringId(vendorId);
      const response = await fetch(`http://localhost:3001/api/vendors/${vendorId}/restore`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor restored successfully",
          variant: "default"
        });
        fetchVendors(showDeleted);
      } else {
        throw new Error('Failed to restore vendor');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to restore vendor',
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor_code: '',
      vendor_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      tax_number: '',
      status: 'Active'
    });
    setEditingVendor(null);
    setShowForm(false);
  };

  // Filter vendors
  const filteredVendors = vendors.filter(vendor => {
    // If not showing deleted, filter them out
    if (!showDeleted && (vendor.is_deleted === 1 || vendor.is_deleted === true)) {
      return false;
    }
    // If showing deleted, only show deleted ones
    if (showDeleted && (vendor.is_deleted === 0 || vendor.is_deleted === false)) {
      return false;
    }
    
    const matchesSearch = vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Inactive': return 'secondary';
      case 'Suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
          <p className="text-muted-foreground">
            Manage vendor information, contacts, and business relationships
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Show Deleted Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
            <Trash className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Show Deleted</span>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`ml-2 px-3 py-1 rounded text-sm font-medium transition ${
                showDeleted
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {showDeleted ? 'ON' : 'OFF'}
            </button>
            {!showDeleted && vendors.some(v => v.is_deleted === 1 || v.is_deleted === true) && (
              <Badge variant="destructive" className="ml-2">
                {vendors.filter(v => v.is_deleted === 1 || v.is_deleted === true).length}
              </Badge>
            )}
          </div>

          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Vendor
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </CardTitle>
            <CardDescription>
              {editingVendor ? 'Update vendor information' : 'Enter vendor details to add to your database'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vendor_code">Vendor Code</Label>
                <Input
                  id="vendor_code"
                  value={formData.vendor_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div>
                <Label htmlFor="vendor_name">Vendor Name *</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Enter contact person"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>
              
              <div>
                <Label htmlFor="tax_number">Tax Number</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                  placeholder="Enter tax number"
                />
              </div>
            </div>
            
            <div className="col-span-full">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveVendor}>
                <Save className="h-4 w-4 mr-2" />
                {editingVendor ? 'Update Vendor' : 'Save Vendor'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search vendors by name, code, or contact person..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vendors List
            <Badge variant="secondary" className="ml-2">
              {filteredVendors.length} vendors
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} className={vendor.is_deleted === 1 || vendor.is_deleted === true ? 'opacity-60 bg-red-50' : ''}>
                      <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {vendor.vendor_name}
                            {(vendor.is_deleted === 1 || vendor.is_deleted === true) && (
                              <Badge variant="destructive" className="text-xs">
                                🗑️ Deleted
                              </Badge>
                            )}
                          </div>
                          {vendor.tax_number && (
                            <div className="text-sm text-muted-foreground">
                              Tax: {vendor.tax_number}
                            </div>
                          )}
                          {vendor.deleted_at && (
                            <div className="text-xs text-red-600 mt-1">
                              Deleted: {new Date(vendor.deleted_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.contact_person ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {vendor.contact_person}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {vendor.email}
                            </div>
                          )}
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {vendor.phone}
                            </div>
                          )}
                          {!vendor.email && !vendor.phone && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.city || vendor.country ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {[vendor.city, vendor.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(vendor.status)}>
                          {vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vendor.is_deleted === 1 || vendor.is_deleted === true ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreVendor(vendor.id)}
                              disabled={restoringId === vendor.id}
                              className="text-green-600 hover:text-green-800 hover:bg-green-50"
                            >
                              {restoringId === vendor.id ? (
                                <span className="animate-spin">⟳</span>
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              {restoringId === vendor.id ? 'Restoring...' : 'Restore'}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVendor(vendor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVendor(vendor)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-12 w-12 text-gray-300" />
                        <div className="text-lg font-medium text-gray-500">
                          {showDeleted ? 'No deleted vendors' : 'No vendors found'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'Try adjusting your filters'
                            : showDeleted 
                              ? 'All vendors are active'
                              : 'Click "Add New Vendor" to create your first vendor'
                          }
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorManagementPage;