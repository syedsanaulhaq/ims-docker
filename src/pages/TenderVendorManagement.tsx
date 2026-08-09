import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2 } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

interface Assignment {
  id: string;
  vendor_id: string;
  vendor_name: string;
  category_id: string;
  category_name: string;
}

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

export const TenderVendorManagement: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTender) {
      loadTenderAssignments(selectedTender.id);
    }
  }, [selectedTender]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tendersRes, vendorsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:3001/api/annual-tenders'),
        fetch('http://localhost:3001/api/vendors'),
        fetch('http://localhost:3001/api/categories')
      ]);

      const tendersData = await tendersRes.json();
      const vendorsData = await vendorsRes.json();
      const categoriesData = await categoriesRes.json();

      setTenders(tendersData);
      setVendors(Array.isArray(vendorsData) ? vendorsData : (vendorsData.vendors || []));
      setCategories(categoriesData.map((cat: any) => ({ id: cat.id, name: cat.category_name })));

      if (tendersData.length > 0) {
        setSelectedTender(tendersData[0]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTenderAssignments = async (tenderId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/annual-tenders/${tenderId}`);
      const data = await response.json();
      
      // Transform vendors data
      const transformedAssignments = data.vendors?.map((v: any) => ({
        id: v.id,
        vendor_id: v.vendor_id,
        category_id: v.category_id,
        category_name: v.category_name || 'Unknown',
        status: v.status,
        assignment_date: v.assignment_date,
        vendor_name: v.vendor_name
      })) || [];
      
      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleAssignVendors = async () => {
    if (!selectedTender || !selectedCategory || selectedVendors.length === 0) {
      alert('Please select tender, category, and at least one vendor');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: selectedCategory,
            vendorIds: selectedVendors
          })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      alert('✅ Vendors assigned successfully!');
      setShowAssignDialog(false);
      setSelectedVendors([]);
      setSelectedCategory('');
      
      // Reload assignments
      if (selectedTender) {
        await loadTenderAssignments(selectedTender.id);
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this vendor assignment?')) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/vendor-assignments/${assignmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove assignment');

      if (selectedTender) {
        await loadTenderAssignments(selectedTender.id);
      }
      alert('✅ Assignment removed');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const vendor = acc.find(v => v.vendorId === assignment.vendor_id);
    if (vendor) {
      vendor.categories.push({
        id: assignment.category_id,
        name: assignment.category_name
      });
    } else {
      acc.push({
        vendorId: assignment.vendor_id,
        vendorName: assignment.vendor_name,
        categories: [{ id: assignment.category_id, name: assignment.category_name }],
        assignments: [assignment]
      });
    }
    return acc;
  }, [] as any[]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Tender Vendor Management</h1>
        <p className="text-gray-600">Manage annual tenders, assign vendors, and track item allocations</p>
      </div>

      {/* Tender Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Annual Tender</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {tenders.map(tender => (
              <button
                key={tender.id}
                onClick={() => setSelectedTender(tender)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedTender?.id === tender.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{tender.title}</p>
                <p className="text-xs text-gray-600 mt-1">{tender.tender_number}</p>
                <Badge className="mt-2" variant={tender.status === 'Active' ? 'default' : 'secondary'}>
                  {tender.status}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTender && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Vendor Assignments</TabsTrigger>
            <TabsTrigger value="assign">Assign Vendors</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Vendors Assigned to {selectedTender.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {groupedAssignments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No vendors assigned yet</p>
                    <Button onClick={() => document.querySelector('[value="assign"]')?.click?.()}>
                      Assign Vendors Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedAssignments.map((group, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        {/* Vendor Header */}
                        <div
                          className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 cursor-pointer hover:from-blue-100 hover:to-blue-150 transition-colors flex items-center justify-between"
                          onClick={() => setExpandedVendor(expandedVendor === group.vendorId ? null : group.vendorId)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {expandedVendor === group.vendorId ? (
                              <ChevronUp className="w-5 h-5 text-blue-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <p className="font-bold text-gray-900">{group.vendorName}</p>
                              <p className="text-xs text-gray-600 mt-1">{group.categories.length} category/categories assigned</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {group.categories.length}
                          </Badge>
                        </div>

                        {/* Expanded Content */}
                        {expandedVendor === group.vendorId && (
                          <div className="bg-white p-4 border-t space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-3">Assigned Categories:</p>
                              <div className="space-y-2">
                                {group.categories.map((cat: any) => (
                                  <div key={cat.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                    <span className="text-sm text-gray-700">{cat.name}</span>
                                    <button
                                      onClick={() => {
                                        const assignment = group.assignments.find((a: any) => a.category_id === cat.id);
                                        if (assignment) handleRemoveAssignment(assignment.id);
                                      }}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                      title="Remove assignment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assign Tab */}
          <TabsContent value="assign">
            <Card>
              <CardHeader>
                <CardTitle>Assign Vendors to Categories</CardTitle>
                <p className="text-sm text-gray-600 mt-2">Select category and vendors to assign them to this tender</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Select Category</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          selectedCategory === cat.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{cat.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vendor Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Select Vendors</label>
                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {vendors.length === 0 ? (
                      <p className="text-gray-500">No vendors available</p>
                    ) : (
                      vendors.map(vendor => (
                        <label key={vendor.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedVendors.includes(vendor.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVendors([...selectedVendors, vendor.id]);
                              } else {
                                setSelectedVendors(selectedVendors.filter(v => v !== vendor.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{vendor.vendor_name}</p>
                            <p className="text-xs text-gray-600">{vendor.vendor_code}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedVendors.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2 font-medium">✓ {selectedVendors.length} vendor(s) selected</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAssignVendors}
                    disabled={isAssigning || !selectedCategory || selectedVendors.length === 0}
                    className="gap-2 flex-1"
                  >
                    {isAssigning ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Vendor Assignments
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedVendors([]);
                      setSelectedCategory('');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Summary Stats */}
      {selectedTender && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">{new Set(assignments.map(a => a.vendor_id)).size}</p>
                <p className="text-sm text-gray-600 mt-2">Vendors Assigned</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">{new Set(assignments.map(a => a.category_id)).size}</p>
                <p className="text-sm text-gray-600 mt-2">Categories Covered</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-purple-600">{assignments.length}</p>
                <p className="text-sm text-gray-600 mt-2">Total Assignments</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TenderVendorManagement;
