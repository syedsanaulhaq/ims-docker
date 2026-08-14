import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Building, Users, Calendar, Package } from 'lucide-react';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import { createNameResolver } from '@/utils/nameResolver';

interface TenderItem {
  id: string;
  item_master_id: string;
  quantity: number;
  estimated_unit_price: number;
  total_amount: number;
  calculated_total_amount: number;
  specifications?: string;
  remarks?: string;
  item_name?: string;
  item_description?: string;
  item_unit?: string;
  item_code?: string;
}

interface TenderData {
  id: string;
  tender_number: string;
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  submission_date: string;
  opening_date: string;
  tender_type: string;
  procurement_method: string;
  tender_status: string;
  publication_daily: string;
  office_names: string;
  wing_names: string;
  dec_names: string;
  office_ids?: string;
  wing_ids?: string; 
  dec_ids?: string;
  vendor_name?: string;
  vendor_code?: string;
  created_at: string;
  updated_at: string;
  items: TenderItem[];
}

const TenderReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenderData, setTenderData] = useState<TenderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch office hierarchy data for name resolution
  const { offices, wings, decs, isLoading: isLoadingHierarchy } = useOfficeHierarchy();

  // Create name resolver with safety check
  const nameResolver = useMemo(() => {
    try {
      return createNameResolver(offices || [], wings || [], decs || []);
    } catch (error) {
      // Fallback resolver that just returns the IDs
      return {
        resolveOfficeNames: (ids: (string | number)[]) => ids.map(id => `Office-${id}`),
        resolveWingNames: (ids: (string | number)[]) => ids.map(id => `Wing-${id}`),
        resolveDecNames: (ids: (string | number)[]) => ids.map(id => `DEC-${id}`)
      };
    }
  }, [offices, wings, decs]);

  // Helper functions to resolve names from IDs
  const getResolvedNames = (tenderData: TenderData) => {
    // Parse IDs from comma-separated strings
    const parseIds = (idString: string): number[] => {
      if (!idString || idString.trim() === '') return [];
      return idString.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    };

    // Try to resolve from IDs first, fall back to existing names
    const resolveOfficeNames = () => {
      if (tenderData.office_ids) {
        const ids = parseIds(tenderData.office_ids);
        if (ids.length > 0) {
          return nameResolver.resolveOfficeNames(ids).join(', ');
        }
      }
      return tenderData.office_names || 'N/A';
    };

    const resolveWingNames = () => {
      if (tenderData.wing_ids) {
        const ids = parseIds(tenderData.wing_ids);
        if (ids.length > 0) {
          return nameResolver.resolveWingNames(ids).join(', ');
        }
      }
      return tenderData.wing_names || 'N/A';
    };

    const resolveDecNames = () => {
      if (tenderData.dec_ids) {
        const ids = parseIds(tenderData.dec_ids);
        if (ids.length > 0) {
          return nameResolver.resolveDecNames(ids).join(', ');
        }
      }
      return tenderData.dec_names || 'N/A';
    };

    return {
      officeNames: resolveOfficeNames(),
      wingNames: resolveWingNames(),
      decNames: resolveDecNames()
    };
  };

  useEffect(() => {
    if (id) {
      fetchTenderData(id);
    }
  }, [id]);

  const fetchTenderData = async (tenderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tenders/${tenderId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tender data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTenderData(data);
    } catch (err) {
      console.error('❌ Error fetching tender data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tender data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  const calculateItemTotal = (item: TenderItem) => {
    // Use calculated_total_amount from backend if available, otherwise calculate here
    return item.calculated_total_amount || (item.quantity * item.estimated_unit_price) || item.total_amount || 0;
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tender data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600 mb-4">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">Error Loading Tender</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex space-x-2">
              <Button onClick={() => fetchTenderData(id!)} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => navigate('/tenders')} variant="default">
                Back to Tenders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenderData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">No tender data found.</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => navigate('/tenders')}>
                Back to Tenders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate('/contract-tender')}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tenders</span>
        </Button>
        
        <div className="flex space-x-2">
          <Button onClick={() => window.print()} variant="outline">
            Print Report
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div className="text-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {tenderData.title || 'Tender Report'}
        </h1>
        <p className="text-gray-600">
          Reference: {tenderData.reference_number || tenderData.tender_number || 'N/A'}
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Tender Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tender Type</label>
              <p className="text-gray-900">{tenderData.tender_type || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Procurement Method</label>
              <p className="text-gray-900">{tenderData.procurement_method || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                tenderData.tender_status === 'Active' ? 'bg-green-100 text-green-800' :
                tenderData.tender_status === 'Closed' ? 'bg-red-100 text-red-800' :
                tenderData.tender_status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {tenderData.tender_status || 'Unknown'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Value</label>
              <p className="text-gray-900 font-semibold">{formatCurrency(tenderData.estimated_value)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Submission Date</label>
              <p className="text-gray-900">{formatDate(tenderData.submission_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Opening Date</label>
              <p className="text-gray-900">{formatDate(tenderData.opening_date)}</p>
            </div>
          </div>

          {tenderData.description && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{tenderData.description}</p>
            </div>
          )}

          {tenderData.publication_daily && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Publication Daily</label>
              <p className="text-gray-900">{tenderData.publication_daily}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organizational Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-purple-600" />
            <span>Organizational Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Offices</label>
              <p className="text-gray-900 bg-blue-50 p-3 rounded-md">{getResolvedNames(tenderData).officeNames}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Wings</label>
              <p className="text-gray-900 bg-green-50 p-3 rounded-md">{getResolvedNames(tenderData).wingNames}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Departments</label>
              <p className="text-gray-900 bg-purple-50 p-3 rounded-md">{getResolvedNames(tenderData).decNames}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Information */}
      {(tenderData.vendor_name || tenderData.vendor_code) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span>Vendor Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor Name</label>
                <p className="text-gray-900">{tenderData.vendor_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor Code</label>
                <p className="text-gray-900">{tenderData.vendor_code || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tender Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Tender Items ({tenderData.items?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenderData.items && tenderData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specifications
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenderData.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.item_code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.item_name || 'N/A'}</div>
                          {item.item_description && (
                            <div className="text-gray-500 text-xs">{item.item_description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity || 0} {item.item_unit || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.estimated_unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(calculateItemTotal(item))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.specifications || item.remarks || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Total Estimated Value:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(tenderData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items found for this tender.</p>
              <p className="text-sm text-gray-400">Items will appear here once they are added to the tender.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created At</label>
              <p className="text-gray-700">{formatDate(tenderData.created_at)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Updated At</label>
              <p className="text-gray-700">{formatDate(tenderData.updated_at)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tender ID</label>
              <p className="text-gray-700 font-mono text-xs">{tenderData.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenderReport;
