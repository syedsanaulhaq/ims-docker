import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Package, Users, FileText } from 'lucide-react';

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

type WorkflowStep = 'tender' | 'vendor' | 'items' | 'review';

export const TenderVendorWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('tender');
  const [loading, setLoading] = useState(true);

  // Step 1: Tender
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);

  // Step 2: Vendor
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);

  // Step 3: Items/Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Loading and submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const handleTenderSelect = (tender: AnnualTender) => {
    setSelectedTender(tender);
    setCurrentStep('vendor');
    setSelectedVendors([]);
    setSelectedCategories([]);
    setSubmitMessage('');
  };

  const handleVendorToggle = (vendor: Vendor) => {
    if (selectedVendors.find(v => v.id === vendor.id)) {
      setSelectedVendors(selectedVendors.filter(v => v.id !== vendor.id));
    } else {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const handleVendorContinue = () => {
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor');
      return;
    }
    setCurrentStep('items');
  };

  const handleCategoryToggle = (category: Category) => {
    if (selectedCategories.find(c => c.id === category.id)) {
      setSelectedCategories(selectedCategories.filter(c => c.id !== category.id));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleItemsContinue = () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category/item');
      return;
    }
    setCurrentStep('review');
  };

  const handleSubmit = async () => {
    if (!selectedTender || selectedVendors.length === 0 || selectedCategories.length === 0) {
      alert('Please complete all steps');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // For each vendor and category combination, create an assignment
      const assignments = [];
      for (const vendor of selectedVendors) {
        for (const category of selectedCategories) {
          assignments.push({
            tenderId: selectedTender.id,
            categoryId: category.id,
            vendorIds: [vendor.id]
          });
        }
      }

      // Send all assignments
      for (const assignment of assignments) {
        const response = await fetch(
          `http://localhost:3001/api/annual-tenders/${assignment.tenderId}/assign-vendors`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoryId: assignment.categoryId,
              vendorIds: assignment.vendorIds
            })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create assignment');
        }
      }

      setSubmitMessage(`✅ Successfully assigned ${selectedVendors.length} vendor(s) to ${selectedCategories.length} category/categories!`);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCurrentStep('tender');
        setSelectedTender(null);
        setSelectedVendors([]);
        setSelectedCategories([]);
        setSubmitMessage('');
      }, 2000);
    } catch (error) {
      setSubmitMessage('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tender Vendor Assignment Wizard</h1>
        <p className="text-gray-600">Follow the steps to assign vendors and items to your tender</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between">
        {/* Step 1: Tender */}
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
            currentStep === 'tender' || (currentStep !== 'tender' && selectedTender)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {selectedTender ? <Check className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <p className="text-xs font-semibold text-center">Step 1<br/>Tender</p>
        </div>

        {/* Connector */}
        <div className={`flex-1 h-1 mx-2 mb-6 ${selectedTender ? 'bg-blue-600' : 'bg-gray-300'}`}></div>

        {/* Step 2: Vendor */}
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
            currentStep === 'vendor' || (currentStep !== 'vendor' && selectedVendors.length > 0)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {selectedVendors.length > 0 ? <Check className="w-6 h-6" /> : <Users className="w-6 h-6" />}
          </div>
          <p className="text-xs font-semibold text-center">Step 2<br/>Vendors</p>
        </div>

        {/* Connector */}
        <div className={`flex-1 h-1 mx-2 mb-6 ${selectedVendors.length > 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>

        {/* Step 3: Items */}
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
            currentStep === 'items' || (currentStep !== 'items' && selectedCategories.length > 0)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {selectedCategories.length > 0 ? <Check className="w-6 h-6" /> : <Package className="w-6 h-6" />}
          </div>
          <p className="text-xs font-semibold text-center">Step 3<br/>Items</p>
        </div>

        {/* Connector */}
        <div className={`flex-1 h-1 mx-2 mb-6 ${selectedCategories.length > 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>

        {/* Step 4: Review */}
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
            currentStep === 'review'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            <Check className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-center">Step 4<br/>Review</p>
        </div>
      </div>

      {/* Step Content */}
      <Card>
        {/* STEP 1: SELECT TENDER */}
        {currentStep === 'tender' && (
          <div>
            <CardHeader>
              <CardTitle>Step 1: Select Annual Tender</CardTitle>
              <p className="text-sm text-gray-600 mt-2">Choose which tender you want to manage</p>
            </CardHeader>
            <CardContent>
              {tenders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tenders available</p>
              ) : (
                <div className="space-y-3">
                  {tenders.map(tender => (
                    <button
                      key={tender.id}
                      onClick={() => handleTenderSelect(tender)}
                      className="w-full p-4 border-2 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600">{tender.title}</p>
                          <p className="text-sm text-gray-600">{tender.tender_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tender.status === 'Active' ? 'default' : 'secondary'}>
                            {tender.status}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        )}

        {/* STEP 2: SELECT VENDORS */}
        {currentStep === 'vendor' && selectedTender && (
          <div>
            <CardHeader>
              <CardTitle>Step 2: Select Vendors</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Select vendors for: <span className="font-semibold text-blue-600">{selectedTender.title}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No vendors available</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {vendors.map(vendor => (
                    <label
                      key={vendor.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVendors.some(v => v.id === vendor.id)}
                        onChange={() => handleVendorToggle(vendor)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{vendor.vendor_name}</p>
                        <p className="text-xs text-gray-600">{vendor.vendor_code}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              <div className="pt-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep('tender');
                    setSelectedTender(null);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVendorContinue}
                  disabled={selectedVendors.length === 0}
                  className="flex-1 gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {selectedVendors.length > 0 && (
                <p className="text-sm text-blue-600 font-medium">✓ {selectedVendors.length} vendor(s) selected</p>
              )}
            </CardContent>
          </div>
        )}

        {/* STEP 3: SELECT ITEMS/CATEGORIES */}
        {currentStep === 'items' && selectedTender && (
          <div>
            <CardHeader>
              <CardTitle>Step 3: Assign Items/Categories</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Which items/categories can these vendors provide?
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No categories available</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.map(category => (
                    <label
                      key={category.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.some(c => c.id === category.id)}
                        onChange={() => handleCategoryToggle(category)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{category.name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('vendor')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleItemsContinue}
                  disabled={selectedCategories.length === 0}
                  className="flex-1 gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {selectedCategories.length > 0 && (
                <p className="text-sm text-blue-600 font-medium">✓ {selectedCategories.length} category/categories selected</p>
              )}
            </CardContent>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {currentStep === 'review' && selectedTender && (
          <div>
            <CardHeader>
              <CardTitle>Step 4: Review & Confirm</CardTitle>
              <p className="text-sm text-gray-600 mt-2">Review your selection before submitting</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tender Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">📋 Tender</p>
                <p className="text-sm text-blue-800">{selectedTender.title}</p>
                <p className="text-xs text-blue-700">{selectedTender.tender_number}</p>
              </div>

              {/* Vendors Summary */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">👥 Vendors ({selectedVendors.length})</p>
                <div className="space-y-1">
                  {selectedVendors.map(vendor => (
                    <p key={vendor.id} className="text-sm text-purple-800">• {vendor.vendor_name}</p>
                  ))}
                </div>
              </div>

              {/* Categories Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900 mb-2">📦 Items/Categories ({selectedCategories.length})</p>
                <div className="space-y-1">
                  {selectedCategories.map(category => (
                    <p key={category.id} className="text-sm text-green-800">• {category.name}</p>
                  ))}
                </div>
              </div>

              {/* Assignment Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">📊 Total Assignments to Create</p>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedVendors.length} × {selectedCategories.length} = {selectedVendors.length * selectedCategories.length}
                </p>
                <p className="text-xs text-gray-600 mt-1">vendors × items = total assignments</p>
              </div>

              {submitMessage && (
                <div className={`p-3 rounded-lg ${submitMessage.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {submitMessage}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('items')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Submit
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TenderVendorWizard;
