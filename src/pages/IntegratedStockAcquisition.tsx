import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StockAcquisitionForm from '@/components/acquisition/StockAcquisitionForm';
import StockAcquisitionReport from '@/pages/StockAcquisitionReport';

const IntegratedStockAcquisition: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Check for tab query parameter, default to 'form'
  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromQuery === 'report' ? 'report' : 'form');

  // Update active tab when query parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'report') {
      setActiveTab('report');
    } else {
      setActiveTab('form');
    }
  }, [searchParams]);

  if (!id) {
    return <div className="p-8">Error: Tender ID not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/contract-tender')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Stock Acquisition Management</h1>
            <p className="text-muted-foreground">
              Complete acquisition workflow with expandable receiving details
            </p>
          </div>
        </div>
      </div>

      {/* Integrated Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Receiving Form
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary Report
          </TabsTrigger>
        </TabsList>

        {/* Expandable Receiving Form Tab */}
        <TabsContent value="form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Expandable Receiving Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage all receiving details with visit-based tracking. Expand items to see full delivery history and edit details.
              </p>
            </CardHeader>
            <CardContent>
              <StockAcquisitionForm 
                tenderId={id} 
                onSave={() => {
                  // Optionally switch to report tab after saving
                  // setActiveTab('report');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Acquisition Summary Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Overview and export functionality for this tender's acquisition data.
              </p>
            </CardHeader>
            <CardContent>
              <StockAcquisitionReport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Quick Guide</h3>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Receiving Form:</strong> Click items to expand and manage visit-by-visit delivery details. 
                Add new visits, update quantities, and track delivery status.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700">
                <strong>Summary Report:</strong> View complete acquisition overview and export data for documentation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegratedStockAcquisition;
