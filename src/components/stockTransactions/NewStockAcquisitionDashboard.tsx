import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Package,
  TrendingUp,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Plus,
  Eye,
  Calendar,
  Search,
  DollarSign,
  ShoppingCart,
  Truck
} from "lucide-react";

interface AcquisitionStats {
  totalTenders: number;
  activeTenders: number;
  completedTenders: number;
  pendingDeliveries: number;
  totalValue: number;
  totalItems: number;
  totalQuantity: number;
  monthlyAcquisitions: number;
}

interface TenderSummary {
  id: string;
  title: string;
  tenderNumber: string;
  acquisitionType: 'Contract/Tender' | 'Petty Purchase';
  status: string;
  totalValue: number;
  itemCount: number;
  createdAt: string;
  isFinalized: boolean;
  hasDeliveries: boolean;
}

interface RecentDelivery {
  id: string;
  tenderTitle: string;
  itemName: string;
  quantityReceived: number;
  deliveryDate: string;
  status: string;
}

const NewStockAcquisitionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for dashboard data
  const [stats, setStats] = useState<AcquisitionStats>({
    totalTenders: 0,
    activeTenders: 0,
    completedTenders: 0,
    pendingDeliveries: 0,
    totalValue: 0,
    totalItems: 0,
    totalQuantity: 0,
    monthlyAcquisitions: 0
  });
  
  const [activeTenders, setActiveTenders] = useState<TenderSummary[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch acquisition overview stats
      const statsResponse = await fetch('http://localhost:3001/api/acquisition/dashboard-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch active tenders
      const tendersResponse = await fetch('http://localhost:3001/api/acquisition/active-tenders');
      if (tendersResponse.ok) {
        const tendersData = await tendersResponse.json();
        setActiveTenders(tendersData);
      }

      // Fetch recent deliveries
      const deliveriesResponse = await fetch('http://localhost:3001/api/acquisition/recent-deliveries');
      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json();
        setRecentDeliveries(deliveriesData);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter active tenders based on search
  const filteredTenders = activeTenders.filter(tender =>
    tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.tenderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return <Badge variant="default" className="bg-green-600">Completed</Badge>;
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="default" className="bg-blue-600">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'awarded':
        return <Badge variant="default" className="bg-purple-600">Awarded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading acquisition dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Acquisition Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage stock acquisitions, tenders, and deliveries</p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/contract-tender')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Acquisition
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenders}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">{stats.activeTenders} active</span> • {stats.completedTenders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">+{stats.monthlyAcquisitions}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Acquired</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
            <p className="text-xs text-gray-600">
              {stats.totalQuantity.toLocaleString()} total quantity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-gray-600">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Tenders */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Active Tenders</CardTitle>
              <CardDescription>Current tenders and their acquisition status</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tenders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tender</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenders.length > 0 ? (
                  filteredTenders.map((tender) => (
                    <TableRow key={tender.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{tender.title}</div>
                          <div className="text-sm text-gray-500">{tender.tenderNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tender.acquisitionType === 'Contract/Tender' ? 'default' : 'secondary'}>
                          {tender.acquisitionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tender.status, tender.isFinalized)}
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{tender.itemCount}</div>
                          <div className="text-xs text-gray-500">items</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(tender.totalValue)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(tender.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/tenders/${tender.id}/stock-acquisition`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {tender.hasDeliveries && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/dashboard/transaction-manager/${tender.id}`)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No tenders match your search criteria' : 'No active tenders found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Latest items received and processed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{delivery.itemName}</div>
                      <div className="text-sm text-gray-500">{delivery.tenderTitle}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">Qty: {delivery.quantityReceived}</div>
                    <div className="text-sm text-gray-500">{formatDate(delivery.deliveryDate)}</div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {delivery.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent deliveries found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewStockAcquisitionDashboard;
