import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, Calendar, DollarSign, Clock, CheckCircle, AlertCircle, Eye, BarChart3 } from "lucide-react";
import TenderViewDialog from '@/components/tenders/TenderViewDialog';
import { formatDateDMY } from '@/utils/dateUtils';
import EnhancedTenderActions from '@/components/tenders/EnhancedTenderActions';
import { useStockTransactionDashboard } from '@/hooks/useStockTransactionDashboard';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorState from "@/components/common/ErrorState";
import { createNameResolver, formatNamesForDisplay } from '@/utils/nameResolver';
import { formatCurrency } from '@/utils/currency';

const StockTransactionList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewTender, setViewTender] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all-tenders');

  const { stats: dashboardData, isLoading, error } = useStockTransactionDashboard();
  
  // Fetch office hierarchy data for name resolution
  const { offices, wings, decs, isLoading: isLoadingHierarchy } = useOfficeHierarchy();

  // Create name resolver with safety check
  const nameResolver = React.useMemo(() => {
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

  const handleViewTender = (tender: any) => {
    setViewTender(tender);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewTender(null);
    setViewDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Published': return 'bg-blue-100 text-blue-800';
      case 'Closed': return 'bg-red-100 text-red-800';
      case 'Awarded': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateDMY(dateString);
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'all-tenders' || tab === 'with-stock' || tab === 'awaiting-setup') {
      setActiveTab(tab);
    } else {
      setActiveTab('all-tenders');
      setSearchParams({ tab: 'all-tenders' });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (isLoading || isLoadingHierarchy) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading stock transaction data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState 
          message="Failed to load stock transaction data. Please check your connection and try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const allTenders = [
    ...(dashboardData?.tendersWithStock || []),
    ...(dashboardData?.tendersAwaitingStock || [])
  ];

  const stats = {
    totalTenders: allTenders.length,
    tendersWithStock: dashboardData?.tendersWithStock?.length || 0,
    tendersAwaitingStock: dashboardData?.tendersAwaitingStock?.length || 0,
    totalItems: allTenders.reduce((sum, tender) => sum + (tender.itemCount || 0), 0),
  };

  const renderTenderTable = (tenders: any[], title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {tenders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tenders found in this category.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tender Details</TableHead>
                <TableHead>Tender ID</TableHead>
                <TableHead>Type & Office</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items & Quantity</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tender.title}</div>
                      <div className="text-sm text-muted-foreground">{tender.tenderNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell>{tender.id}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Office Information</div>
                      <div className="text-sm text-muted-foreground">Type: {tender.acquisitionType}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={getStatusColor(tender.status)}>
                        {tender.status}
                      </Badge>
                      {tender.is_finalized && (
                        <Badge variant="secondary" className="text-xs">
                          Finalized
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{tender.itemCount || 0} items</div>
                      <div className="text-muted-foreground">Qty: {tender.totalQuantity || 0}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Created: </span>
                        {formatDate(tender.createdAt)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tender.is_finalized ? (
                      <Badge className="bg-green-100 text-green-800">
                        Stock Transactions Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Awaiting Stock Setup
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {tender.is_finalized ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          onClick={() => navigate(`/dashboard/tenders/${tender.id}/report`)}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          View Report
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => navigate(`/transaction-manager/${tender.id}`)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Setup Stock
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewTender(tender)}
                        title="View tender details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Transaction Management</h1>
          <p className="text-muted-foreground mt-2">View and manage stock transactions for all tenders</p>
          
          {/* Workflow Guidance */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 max-w-2xl">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">How Stock Transactions Work</h3>
                <p className="mt-1 text-sm text-blue-700">
                  First create a new tender, then use Transaction Manager to set up stock transactions for delivery management.
                </p>
              </div>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/contract-tender')} 
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Tender</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenders}</div>
            <p className="text-xs text-muted-foreground">All tenders in system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Stock Transactions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.tendersWithStock}</div>
            <p className="text-xs text-muted-foreground">Stock setup complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Setup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.tendersAwaitingStock}</div>
            <p className="text-xs text-muted-foreground">Pending stock setup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Total items across tenders</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all-tenders">All Tenders</TabsTrigger>
          <TabsTrigger value="with-stock">With Stock Transactions ({stats.tendersWithStock})</TabsTrigger>
          <TabsTrigger value="awaiting-setup">Awaiting Setup ({stats.tendersAwaitingStock})</TabsTrigger>
        </TabsList>

        <TabsContent value="all-tenders" className="space-y-6">
          {renderTenderTable(allTenders, "All Tenders", "Complete list of all tenders in the system")}
        </TabsContent>

        <TabsContent value="with-stock" className="space-y-6">
          {renderTenderTable(
            dashboardData?.tendersWithStock || [], 
            "Tenders with Stock Transactions", 
            "Tenders that have completed stock transaction setup"
          )}
        </TabsContent>

        <TabsContent value="awaiting-setup" className="space-y-6">
          {renderTenderTable(
            dashboardData?.tendersAwaitingStock || [], 
            "Tenders Awaiting Stock Setup", 
            "Tenders that need stock transaction configuration"
          )}
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <TenderViewDialog
        tender={viewTender}
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
      />
    </div>
  );
};

export default StockTransactionList;
