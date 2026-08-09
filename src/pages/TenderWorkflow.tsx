import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Trash2 } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

interface Category {
  id: string;
  name: string;
}

interface VendorAssignment {
  id: string;
  vendor_id: string;
  category_id: string;
  category_name: string;
  vendor_name: string;
  status: string;
}

type StepType = 'tender' | 'vendors' | 'items';

export const TenderWorkflow: React.FC = () => {
  // Data
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<VendorAssignment[]>([]);

  // Workflow state
  const [currentStep, setCurrentStep] = useState<StepType>('tender');
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedVendorForItems, setSelectedVendorForItems] = useState<string>('');
  const [selectedItemsForVendor, setSelectedItemsForVendor] = useState<string[]>([]);

  // UI
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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTenderAssignments = async (tenderId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/annual-tenders/${tenderId}`);
      const data = await response.json();
      const transformed = data.vendors?.map((v: any) => ({
        id: v.id,
        vendor_id: v.vendor_id,
        category_id: v.category_id,
        category_name: v.category_name || 'Unknown',
        vendor_name: v.vendor_name,
        status: v.status
      })) || [];
      setAssignments(transformed);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleAssignVendorsToTender = async () => {
    if (!selectedTender || selectedVendors.length === 0) {
      alert('Please select vendors');
      return;
    }

    setIsSaving(true);
    try {
      // For each category, assign selected vendors
      const mainCategory = categories[0];
      if (!mainCategory) throw new Error('No categories found');

      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: mainCategory.id,
            vendorIds: selectedVendors
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      alert('✅ Vendors assigned to tender');
      await loadTenderAssignments(selectedTender.id);
      setSelectedVendors([]);
      setCurrentStep('items');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignItemsToVendor = async () => {
    if (!selectedTender || !selectedVendorForItems || selectedItemsForVendor.length === 0) {
      alert('Please select items');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: selectedItemsForVendor[0],
            vendorIds: [selectedVendorForItems]
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      alert('✅ Items assigned to vendor');
      await loadTenderAssignments(selectedTender.id);
      setSelectedItemsForVendor([]);
      setSelectedVendorForItems('');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/vendor-assignments/${assignmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove');
      if (selectedTender) await loadTenderAssignments(selectedTender.id);
      alert('✅ Assignment removed');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tender Setup Workflow</h1>
          <p className="text-gray-600">Complete these steps to set up your annual tender</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-8">
          <StepButton
            step="tender"
            label="Step 1: Select Tender"
            active={currentStep === 'tender'}
            completed={selectedTender !== null}
            onClick={() => setCurrentStep('tender')}
          />
          <div className="flex-1 h-1 bg-gray-300"></div>
          <StepButton
            step="vendors"
            label="Step 2: Assign Vendors"
            active={currentStep === 'vendors'}
            completed={selectedVendors.length > 0}
            onClick={() => selectedTender && setCurrentStep('vendors')}
            disabled={!selectedTender}
          />
          <div className="flex-1 h-1 bg-gray-300"></div>
          <StepButton
            step="items"
            label="Step 3: Assign Items"
            active={currentStep === 'items'}
            completed={assignments.length > 0}
            onClick={() => selectedTender && setCurrentStep('items')}
            disabled={!selectedTender}
          />
        </div>

        {/* STEP 1: SELECT TENDER */}
        {currentStep === 'tender' && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle>Step 1: Select Annual Tender</CardTitle>
              <p className="text-blue-100 mt-2">Choose which tender you want to set up</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenders.map(tender => (
                  <button
                    key={tender.id}
                    onClick={() => {
                      setSelectedTender(tender);
                      setCurrentStep('vendors');
                    }}
                    className={`p-6 rounded-lg border-2 text-left transition-all duration-200 ${
                      selectedTender?.id === tender.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-gray-900">{tender.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{tender.tender_number}</p>
                        <Badge className="mt-3" variant={tender.status === 'Active' ? 'default' : 'secondary'}>
                          {tender.status}
                        </Badge>
                      </div>
                      {selectedTender?.id === tender.id && (
                        <Check className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: ASSIGN VENDORS */}
        {currentStep === 'vendors' && selectedTender && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle>Step 2: Assign Vendors to Tender</CardTitle>
              <p className="text-green-100 mt-2">Select which vendors can participate in {selectedTender.title}</p>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Currently Assigned Vendors */}
              {assignments.length > 0 && (
                <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-900 mb-3">✓ Currently Assigned Vendors ({assignments.length})</p>
                  <div className="space-y-2">
                    {Array.from(new Set(assignments.map(a => a.vendor_id))).map(vendorId => {
                      const vendor = assignments.find(a => a.vendor_id === vendorId);
                      return (
                        <div key={vendorId} className="flex items-center justify-between bg-white p-3 rounded border border-green-200">
                          <span className="font-medium text-gray-900">{vendor?.vendor_name}</span>
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            {assignments.filter(a => a.vendor_id === vendorId).length} item(s)
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Vendors */}
              <p className="font-semibold text-gray-900 mb-4">Available Vendors</p>
              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {vendors.map(vendor => (
                  <label
                    key={vendor.id}
                    className="flex items-center gap-3 p-3 hover:bg-white rounded cursor-pointer transition-colors"
                  >
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
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{vendor.vendor_name}</p>
                      <p className="text-xs text-gray-600">{vendor.vendor_code}</p>
                    </div>
                  </label>
                ))}
              </div>

              {selectedVendors.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                  <p className="text-sm font-medium text-blue-900">✓ {selectedVendors.length} vendor(s) selected</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setCurrentStep('tender')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleAssignVendorsToTender}
                  disabled={selectedVendors.length === 0 || isSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? 'Saving...' : 'Continue to Items →'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: ASSIGN ITEMS */}
        {currentStep === 'items' && selectedTender && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle>Step 3: Assign Items to Vendors</CardTitle>
              <p className="text-purple-100 mt-2">Specify which items each vendor can provide</p>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Current Assignments */}
              {assignments.length > 0 && (
                <div className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="font-semibold text-purple-900 mb-4">Vendor Item Assignments</p>
                  <div className="space-y-3">
                    {Array.from(new Set(assignments.map(a => a.vendor_id))).map(vendorId => {
                      const vendorAssignments = assignments.filter(a => a.vendor_id === vendorId);
                      const vendor = vendorAssignments[0];
                      return (
                        <div key={vendorId} className="bg-white rounded-lg border border-purple-200 p-4">
                          <p className="font-semibold text-gray-900">{vendor?.vendor_name}</p>
                          <div className="mt-2 space-y-2">
                            {vendorAssignments.map(assignment => (
                              <div key={assignment.id} className="flex items-center justify-between pl-4">
                                <span className="text-sm text-gray-700">• {assignment.category_name}</span>
                                <button
                                  onClick={() => handleRemoveAssignment(assignment.id)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assign More Items */}
              <div className="space-y-6 mb-6">
                <div>
                  <label className="block font-semibold text-gray-900 mb-3">Select Vendor</label>
                  <select
                    value={selectedVendorForItems}
                    onChange={(e) => setSelectedVendorForItems(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">-- Choose a vendor --</option>
                    {Array.from(new Set(assignments.map(a => a.vendor_id))).map(vendorId => {
                      const vendor = assignments.find(a => a.vendor_id === vendorId);
                      return (
                        <option key={vendorId} value={vendorId}>
                          {vendor?.vendor_name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedVendorForItems && (
                  <div>
                    <label className="block font-semibold text-gray-900 mb-3">Assign Categories to Vendor</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                      {categories.map(category => (
                        <label
                          key={category.id}
                          className="flex items-center gap-3 p-3 hover:bg-white rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItemsForVendor.includes(category.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItemsForVendor([...selectedItemsForVendor, category.id]);
                              } else {
                                setSelectedItemsForVendor(selectedItemsForVendor.filter(i => i !== category.id));
                              }
                            }}
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <span className="font-medium text-gray-900">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedItemsForVendor.length > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 mb-6">
                  <p className="text-sm font-medium text-purple-900">✓ {selectedItemsForVendor.length} item(s) selected</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setCurrentStep('vendors')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleAssignItemsToVendor}
                  disabled={selectedItemsForVendor.length === 0 || !selectedVendorForItems || isSaving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isSaving ? 'Saving...' : 'Save Item Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {selectedTender && (
          <Card className="mt-8 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">{selectedTender ? 1 : 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Tender Selected</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{new Set(assignments.map(a => a.vendor_id)).size}</p>
                  <p className="text-sm text-gray-600 mt-1">Vendors Assigned</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{assignments.length}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Item Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

interface StepButtonProps {
  step: StepType;
  label: string;
  active: boolean;
  completed: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const StepButton: React.FC<StepButtonProps> = ({ label, active, completed, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-md'
        : completed
        ? 'bg-green-600 text-white'
        : disabled
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    {completed && <Check className="w-4 h-4" />}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default TenderWorkflow;
