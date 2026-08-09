import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp, Package, Building2, Calendar } from 'lucide-react';

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

interface VendorAssignment {
  id: string;
  vendor_id: string;
  category_id: string;
  category_name: string;
  status: string;
  assignment_date: string;
  created_at: string;
  vendor: Vendor;
}

interface TenderWithVendors {
  id: string;
  tender_number: string;
  title: string;
  status: string;
  vendors: VendorAssignment[];
}

export const VendorAssignmentDashboard: React.FC = () => {
  const [tenders, setTenders] = useState<TenderWithVendors[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTender, setExpandedTender] = useState<string | null>(null);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  useEffect(() => {
    loadTenderVendorData();
  }, []);

  const loadTenderVendorData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/tenders-vendor-assignments');
      if (response.ok) {
        const data = await response.json();
        setTenders(data);
      }
    } catch (error) {
      console.error('Error loading tender vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupVendorsByTender = (assignments: VendorAssignment[]) => {
    const grouped = new Map<string, { vendor: Vendor; categories: string[] }>();
    
    assignments.forEach(assignment => {
      const vendorKey = assignment.vendor_id;
      if (!grouped.has(vendorKey)) {
        grouped.set(vendorKey, {
          vendor: {
            id: assignment.vendor_id,
            vendor_name: assignment.vendor?.vendor_name || 'Unknown',
            vendor_code: assignment.vendor?.vendor_code || '',
            contact_person: assignment.vendor?.contact_person,
            email: assignment.vendor?.email,
            phone: assignment.vendor?.phone,
          },
          categories: [],
        });
      }
      const entry = grouped.get(vendorKey)!;
      if (!entry.categories.includes(assignment.category_name)) {
        entry.categories.push(assignment.category_name);
      }
    });

    return Array.from(grouped.values());
  };

  if (loading) {
    return <div className="text-center py-12">Loading vendor assignments...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Vendor Assignment Dashboard</h1>
        <p className="text-gray-600">Overview of vendor assignments across all annual tenders</p>
      </div>

      {tenders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No vendor assignments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenders.map(tender => {
            const vendorGroups = groupVendorsByTender(tender.vendors);
            const isExpanded = expandedTender === tender.id;

            return (
              <Card key={tender.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedTender(isExpanded ? null : tender.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl">{tender.title}</CardTitle>
                        <div className="flex gap-3 mt-2">
                          <Badge variant="outline" className="gap-1">
                            <Package className="w-3 h-3" />
                            {tender.tender_number}
                          </Badge>
                          <Badge className={getStatusColor(tender.status)}>
                            {tender.status}
                          </Badge>
                          <Badge variant="secondary">
                            {vendorGroups.length} vendor(s)
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-6">
                    {vendorGroups.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No vendors assigned to this tender</p>
                    ) : (
                      <div className="space-y-4">
                        {vendorGroups.map((group, idx) => {
                          const vendorKey = `${tender.id}-${group.vendor.id}`;
                          const vendorExpanded = expandedVendor === vendorKey;

                          return (
                            <div key={idx} className="border rounded-lg overflow-hidden">
                              <div
                                className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                                onClick={() => setExpandedVendor(vendorExpanded ? null : vendorKey)}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {vendorExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{group.vendor.vendor_name}</p>
                                    <p className="text-xs text-gray-500">Code: {group.vendor.vendor_code}</p>
                                  </div>
                                  <Badge variant="secondary" className="ml-auto">
                                    {group.categories.length} category/categories
                                  </Badge>
                                </div>
                              </div>

                              {vendorExpanded && (
                                <div className="p-4 border-t bg-white">
                                  <div className="space-y-3">
                                    {/* Contact Info */}
                                    {(group.vendor.contact_person || group.vendor.email || group.vendor.phone) && (
                                      <div className="bg-blue-50 p-3 rounded">
                                        <p className="text-xs font-semibold text-blue-900 mb-2">Contact Information</p>
                                        <div className="space-y-1 text-xs text-blue-800">
                                          {group.vendor.contact_person && (
                                            <p>👤 {group.vendor.contact_person}</p>
                                          )}
                                          {group.vendor.email && (
                                            <p>📧 {group.vendor.email}</p>
                                          )}
                                          {group.vendor.phone && (
                                            <p>📱 {group.vendor.phone}</p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Categories/Items */}
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Assigned Categories/Items
                                      </p>
                                      <div className="space-y-2">
                                        {group.categories.map((category, catIdx) => (
                                          <div key={catIdx} className="flex items-center gap-2 pl-6">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-sm text-gray-700">{category}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{tenders.length}</p>
              <p className="text-sm text-gray-600">Active Tenders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">
                {new Set(tenders.flatMap(t => t.vendors.map(v => v.vendor_id))).size}
              </p>
              <p className="text-sm text-gray-600">Total Vendors</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">
                {tenders.reduce((sum, t) => sum + t.vendors.length, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorAssignmentDashboard;
