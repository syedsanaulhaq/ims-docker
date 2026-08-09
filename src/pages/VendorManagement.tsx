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
  Building, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  X, 
  Search,
  Filter,
  MoreVertical,
  Users,
  Globe,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { formatDateDMY } from '@/utils/dateUtils';
import { getApiBaseUrl } from '@/services/invmisApi';

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
  created_at: string;
  updated_at: string;
  is_deleted?: number | boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

const VendorManagement = () => {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Dialog states
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  
  // Edit state
  const [editingVendor, setEditingVendor] = useState<string | null>(null);

  // Form state
  const [vendorForm, setVendorForm] = useState({
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

  // Fetch vendors
  const fetchVendors = async (includeDeleted = false) => {
    try {
      setIsLoading(true);
      
      const url = includeDeleted
        ? `${getApiBaseUrl()}/vendors?includeDeleted=true`
        : `${getApiBaseUrl()}/vendors`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Handle both formats: direct array or nested in vendors property
        const vendorsData = Array.isArray(data) ? data : (data.vendors || []);
        setVendors(vendorsData);
      } else {
        throw new Error('Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(showDeleted);
  }, [showDeleted]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      if (event.key === 'Escape' && searchTerm) {
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  // Create vendor
  const handleCreateVendor = async () => {
    if (!vendorForm.vendor_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required",
        variant: "destructive"
      });
      return;
    }

    if (!vendorForm.vendor_code.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor code is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor created successfully",
        });
        resetForm();
        fetchVendors();
      } else {
        throw new Error('Failed to create vendor');
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      toast({
        title: "Error",
        description: "Failed to create vendor",
        variant: "destructive"
      });
    }
  };

  // Edit vendor
  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor.id);
    setVendorForm({
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
    setShowVendorDialog(true);
  };

  // Update vendor
  const handleUpdateVendor = async () => {
    if (!editingVendor) return;
    
    if (!vendorForm.vendor_name.trim() || !vendorForm.vendor_code.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name and code are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/vendors/${editingVendor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor updated successfully",
        });
        resetForm();
        fetchVendors();
      } else {
        throw new Error('Failed to update vendor');
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive"
      });
    }
  };

  // Delete vendor
  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    if (!confirm(`Move vendor "${vendorName}" to trash?`)) {
      return;
    }

    try {
      setDeletingId(vendorId);
      const response = await fetch(`${getApiBaseUrl()}/vendors/${vendorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor moved to trash",
        });
        fetchVendors(showDeleted);
      } else {
        throw new Error('Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Restore vendor
  const handleRestoreVendor = async (vendorId: string, vendorName: string) => {
    if (!confirm(`Restore vendor "${vendorName}"?`)) {
      return;
    }

    try {
      setRestoringId(vendorId);
      const response = await fetch(`${getApiBaseUrl()}/vendors/${vendorId}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor restored successfully",
        });
        fetchVendors(showDeleted);
      } else {
        throw new Error('Failed to restore vendor');
      }
    } catch (error) {
      console.error('Error restoring vendor:', error);
      toast({
        title: "Error",
        description: "Failed to restore vendor",
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setVendorForm({
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
    setShowVendorDialog(false);
    setEditingVendor(null);
  };

  // Filter vendors
  const filteredVendors = vendors.filter(vendor => {
    // Filter by deleted status
    if (!showDeleted && (vendor.is_deleted === 1 || vendor.is_deleted === true)) {
      return false;
    }
    if (showDeleted && (vendor.is_deleted === 0 || vendor.is_deleted === false)) {
      return false;
    }

    if (!searchTerm.trim() && statusFilter === 'All' && countryFilter === 'All') {
      return true;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchTerm.trim() || 
      vendor.vendor_code.toLowerCase().includes(searchLower) ||
      vendor.vendor_name.toLowerCase().includes(searchLower) ||
      vendor.contact_person?.toLowerCase().includes(searchLower) ||
      vendor.email?.toLowerCase().includes(searchLower) ||
      vendor.phone?.toLowerCase().includes(searchLower) ||
      vendor.city?.toLowerCase().includes(searchLower) ||
      vendor.country?.toLowerCase().includes(searchLower) ||
      vendor.tax_number?.toLowerCase().includes(searchLower) ||
      vendor.status.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'All' || vendor.status === statusFilter;
    const matchesCountry = countryFilter === 'All' || vendor.country === countryFilter;

    return matchesSearch && matchesStatus && matchesCountry;
  });

  // Get statistics
  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.status === 'Active').length,
    inactiveVendors: vendors.filter(v => v.status === 'Inactive').length,
    suspendedVendors: vendors.filter(v => v.status === 'Suspended').length
  };

  // Get unique countries for filter
  const countries = Array.from(new Set(vendors.map(v => v.country).filter(Boolean))).sort();

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700 border-green-200';
      case 'Inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Suspended': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircle className="w-3 h-3" />;
      case 'Inactive': return <Clock className="w-3 h-3" />;
      case 'Suspended': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
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
            <Building className="w-8 h-8 text-blue-600" />
            Vendor Management
          </h1>
          <p className="text-gray-600 mt-1">Manage supplier and vendor information</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </DialogTitle>
                <DialogDescription>
                  {editingVendor ? 'Update the vendor details below.' : 'Create a new vendor profile with complete information.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendor_code">Vendor Code *</Label>
                      <Input
                        id="vendor_code"
                        value={vendorForm.vendor_code}
                        onChange={(e) => setVendorForm({...vendorForm, vendor_code: e.target.value})}
                        placeholder="Enter vendor code"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendor_name">Vendor Name *</Label>
                      <Input
                        id="vendor_name"
                        value={vendorForm.vendor_name}
                        onChange={(e) => setVendorForm({...vendorForm, vendor_name: e.target.value})}
                        placeholder="Enter vendor name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        value={vendorForm.contact_person}
                        onChange={(e) => setVendorForm({...vendorForm, contact_person: e.target.value})}
                        placeholder="Enter contact person name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={vendorForm.status} 
                        onValueChange={(value: 'Active' | 'Inactive' | 'Suspended') => setVendorForm({...vendorForm, status: value})}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="Inactive">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-600" />
                              Inactive
                            </div>
                          </SelectItem>
                          <SelectItem value="Suspended">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              Suspended
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={vendorForm.email}
                        onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                        placeholder="Enter email address"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={vendorForm.phone}
                        onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})}
                        placeholder="Enter phone number"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={vendorForm.address}
                        onChange={(e) => setVendorForm({...vendorForm, address: e.target.value})}
                        placeholder="Enter complete address"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Location & Business Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location & Business Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={vendorForm.city}
                        onChange={(e) => setVendorForm({...vendorForm, city: e.target.value})}
                        placeholder="Enter city"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={vendorForm.country}
                        onChange={(e) => setVendorForm({...vendorForm, country: e.target.value})}
                        placeholder="Enter country"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tax_number">Tax Number</Label>
                      <Input
                        id="tax_number"
                        value={vendorForm.tax_number}
                        onChange={(e) => setVendorForm({...vendorForm, tax_number: e.target.value})}
                        placeholder="Enter tax/VAT number"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={editingVendor ? handleUpdateVendor : handleCreateVendor}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                  </Button>
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
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVendors}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeVendors}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Vendors</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactiveVendors}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended Vendors</p>
              <p className="text-2xl font-bold text-red-600">{stats.suspendedVendors}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
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
                placeholder="🔍 Search vendors by name, code, contact, email, or location... (Ctrl+K)"
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
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Active">Active Only</SelectItem>
                    <SelectItem value="Inactive">Inactive Only</SelectItem>
                    <SelectItem value="Suspended">Suspended Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-2 min-w-fit">
                <Globe className="w-4 h-4 text-purple-500" />
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Country:</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-36 h-10 border-blue-200 focus:border-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
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
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  {filteredVendors.length} of {vendors.length} vendors
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
                <CheckCircle className="w-3 h-3 mr-2" />
                Active Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${statusFilter === 'Inactive' ? 'bg-gray-50 border-gray-200 text-gray-700' : 'hover:bg-gray-50'}`}
                onClick={() => setStatusFilter('Inactive')}
              >
                <Clock className="w-3 h-3 mr-2" />
                Inactive Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${statusFilter === 'Suspended' ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-red-50'}`}
                onClick={() => setStatusFilter('Suspended')}
              >
                <AlertCircle className="w-3 h-3 mr-2" />
                Suspended Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${statusFilter === 'All' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-blue-50'}`}
                onClick={() => setStatusFilter('All')}
              >
                <Users className="w-3 h-3 mr-2" />
                Show All
              </Button>
            </div>
          )}

          {/* Search Tips */}
          {searchTerm && filteredVendors.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Search className="w-4 w-4" />
                <span className="font-medium">No vendors found for "{searchTerm}"</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Try searching for vendor names, codes, contact persons, email addresses, or locations. 
                You can also adjust the status and country filters.
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
                  onClick={() => {setStatusFilter('All'); setCountryFilter('All');}}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  Reset All Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Vendor Directory
          </CardTitle>
          <CardDescription>
            Comprehensive list of all registered vendors and suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Info</TableHead>
                <TableHead>Contact Details</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Business Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">{vendor.vendor_name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Code: <span className="font-mono bg-gray-100 px-1 rounded">{vendor.vendor_code}</span>
                      </div>
                      {vendor.contact_person && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          {vendor.contact_person}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                            {vendor.email}
                          </a>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">
                            {vendor.phone}
                          </a>
                        </div>
                      )}
                      {!vendor.email && !vendor.phone && (
                        <span className="text-sm text-gray-400">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.city && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {vendor.city}
                          {vendor.country && `, ${vendor.country}`}
                        </div>
                      )}
                      {vendor.address && (
                        <div className="text-xs text-gray-500 max-w-xs truncate" title={vendor.address}>
                          {vendor.address}
                        </div>
                      )}
                      {!vendor.city && !vendor.address && (
                        <span className="text-sm text-gray-400">No location info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.tax_number && (
                        <div className="text-sm">
                          <span className="text-gray-600">Tax: </span>
                          <span className="font-mono bg-gray-100 px-1 rounded text-xs">{vendor.tax_number}</span>
                        </div>
                      )}
                      {!vendor.tax_number && (
                        <span className="text-sm text-gray-400">No tax info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(vendor.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(vendor.status)}
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDateDMY(vendor.created_at)}
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
                            <DropdownMenuItem onClick={() => handleEditVendor(vendor)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Vendor
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteVendor(vendor.id, vendor.vendor_name)}
                              className="text-red-600"
                              disabled={deletingId === vendor.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {deletingId === vendor.id ? 'Deleting...' : 'Delete Vendor'}
                            </DropdownMenuItem>
                          </>
                        )}
                        {showDeleted && (
                          <DropdownMenuItem 
                            onClick={() => handleRestoreVendor(vendor.id, vendor.vendor_name)}
                            className="text-green-600"
                            disabled={restoringId === vendor.id}
                          >
                            💚 {restoringId === vendor.id ? 'Restoring...' : 'Restore Vendor'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}

              {filteredVendors.length === 0 && !searchTerm && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Building className="w-12 h-12 text-gray-300" />
                      <p className="text-lg font-medium">No vendors found</p>
                      <p className="text-sm">Get started by adding your first vendor.</p>
                    </div>
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

export default VendorManagement;