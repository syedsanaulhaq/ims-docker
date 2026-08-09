import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Building, Users, Calendar, Package, DollarSign } from 'lucide-react';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import { createNameResolver } from '@/utils/nameResolver';

interface TenderData {
  id: string;
  tender_number: string;
  title: string;
  description: string;
  tender_date: string;
  opening_date: string;
  closing_date: string;
  tender_type: string;
  estimated_value: number;
  status: string;
  vendor_name?: string;
  vendor_code?: string;
  office_names?: string;
  wing_names?: string;
  dec_names?: string;
  office_ids?: string;
  wing_ids?: string;
  dec_ids?: string;
  created_at: string;
  updated_at: string;
}

const NewTenderReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenderData, setTenderData] = useState<TenderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTenderData(id);
    }
  }, [id]);

  const fetchTenderData = async (tenderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}`);
      
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
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tender data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
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
      </div>
    );
  }

  if (!tenderData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/tenders')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tenders</span>
          </Button>
          <div className="text-sm text-gray-500">
            Tender ID: {tenderData.id}
          </div>
        </div>

        {/* Main Tender Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>{tenderData.title || 'Tender Details'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Tender Number</label>
                <p className="text-gray-900 font-semibold">{tenderData.tender_number || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  tenderData.status === 'active' ? 'bg-green-100 text-green-800' :
                  tenderData.status === 'closed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tenderData.status || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="text-gray-900">{tenderData.tender_type || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Estimated Value</label>
                <p className="text-gray-900 font-semibold">{formatCurrency(tenderData.estimated_value)}</p>
              </div>
            </div>

            {tenderData.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-900 mt-1">{tenderData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span>Important Dates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Tender Date</label>
                <p className="text-gray-900">{formatDate(tenderData.tender_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Opening Date</label>
                <p className="text-gray-900">{formatDate(tenderData.opening_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Closing Date</label>
                <p className="text-gray-900">{formatDate(tenderData.closing_date)}</p>
              </div>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Offices</label>
                <p className="text-gray-900">{tenderData.office_names || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Wings</label>
                <p className="text-gray-900">{tenderData.wing_names || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Departments</label>
                <p className="text-gray-900">{tenderData.dec_names || 'N/A'}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Vendor Name</label>
                  <p className="text-gray-900">{tenderData.vendor_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Vendor Code</label>
                  <p className="text-gray-900">{tenderData.vendor_code || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-500">Created At</label>
                <p className="text-gray-700">{formatDate(tenderData.created_at)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Updated At</label>
                <p className="text-gray-700">{formatDate(tenderData.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button onClick={() => navigate('/tenders')} variant="outline">
            Back to List
          </Button>
          <Button onClick={() => window.print()} variant="default">
            Print Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewTenderReport;
