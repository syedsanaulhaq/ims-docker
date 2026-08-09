import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  Package, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  ShoppingCart,
  Calendar,
  MapPin,
  Clock,
  Eye,
  Building,
  FileText,
  Truck,
  ClipboardList,
  Database,
  BarChart3,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Settings,
  Shield
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { invmisApi } from "@/services/invmisApi";

const Dashboard = () => {
  const navigate = useNavigate();

  // State for real SQL Server data
  const [tenders, setTenders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [stockIssuanceRequests, setStockIssuanceRequests] = useState<any[]>([]);
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [offices, setOffices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch all data concurrently
        const [
          tendersData,
          deliveriesData,
          stockRequestsData,
          inventoryData,
          inventoryStatsData,
          officesData,
          usersData,
          wingsData
        ] = await Promise.allSettled([
          fetch(`${getApiBaseUrl()}/tenders`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/deliveries`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/stock-issuance/requests`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/inventory-stock`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/inventory/dashboard`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/offices`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/users`).then(r => r.json()),
          fetch(`${getApiBaseUrl()}/wings`).then(r => r.json())
        ]);

        // Process results
        if (tendersData.status === 'fulfilled') setTenders(tendersData.value || []);
        if (deliveriesData.status === 'fulfilled') setDeliveries(deliveriesData.value || []);
        if (stockRequestsData.status === 'fulfilled') setStockIssuanceRequests(stockRequestsData.value || []);
        if (inventoryData.status === 'fulfilled') setInventoryStock(inventoryData.value || []);
        if (inventoryStatsData.status === 'fulfilled') setInventoryStats(inventoryStatsData.value);
        if (officesData.status === 'fulfilled') setOffices(officesData.value || []);
        if (usersData.status === 'fulfilled') setUsers(usersData.value || []);
        if (wingsData.status === 'fulfilled') setWings(wingsData.value || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Loading state
  if (dataLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 flex items-center justify-center min-h-96">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600">Loading comprehensive dashboard data...</p>
              <p className="text-sm text-gray-500 mt-2">Fetching data from SQL Server...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate comprehensive system statistics
  const systemStats = {
    // Core System Data
    totalOffices: offices.length,
    totalWings: wings.length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.ISACT || u.isActive).length,
    
    // Tender Management
    totalTenders: tenders.length,
    activeTenders: tenders.filter(t => !t.is_finalized && (t.tender_status === 'Published' || t.status === 'Published')).length,
    finalizedTenders: tenders.filter(t => t.is_finalized === true || t.is_finalized === 1).length,
    draftTenders: tenders.filter(t => t.status === 'Draft' || t.tender_status === 'Draft').length,
    closedTenders: tenders.filter(t => t.status === 'Closed' || t.tender_status === 'Closed').length,
    
    // Delivery Management
    totalDeliveries: deliveries.length,
    pendingDeliveries: deliveries.filter(d => !d.is_finalized && (d.delivery_status === 'Pending' || d.status === 'Pending')).length,
    completedDeliveries: deliveries.filter(d => d.is_finalized || d.delivery_status === 'Completed' || d.status === 'Completed').length,
    
    // Stock Issuance
    totalStockRequests: stockIssuanceRequests.length,
    pendingRequests: stockIssuanceRequests.filter(r => 
      r.request_status === 'Submitted' || 
      r.request_status === 'Pending' || 
      r.ApprovalStatus === 'PENDING'
    ).length,
    approvedRequests: stockIssuanceRequests.filter(r => 
      r.request_status === 'Approved' || 
      r.ApprovalStatus === 'APPROVED'
    ).length,
    
    // Inventory Data
    totalInventoryItems: inventoryStats?.data?.stats?.totalItems || inventoryStock.length || 0,
    lowStockItems: inventoryStats?.data?.stats?.lowStockItems || 0,
    outOfStockItems: inventoryStats?.data?.stats?.outOfStockItems || 0,
    totalInventoryValue: inventoryStats?.data?.stats?.totalStockValue || 0
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Dashboard Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-6 h-6" />
                <span>System Dashboard</span>
              </CardTitle>
              <CardDescription>
                Comprehensive Inventory Management System Overview
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                <Activity className="h-3 w-3 mr-1" />
                System Online
              </Badge>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                <Clock className="h-3 w-3 mr-1" />
                Last Updated: {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Inventory Status */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
              <Package className="h-5 w-5" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Items</span>
                <span className="text-2xl font-bold text-blue-600">{systemStats.totalInventoryItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Available</span>
                <span className="text-lg font-semibold text-green-600">
                  {systemStats.totalInventoryItems - systemStats.outOfStockItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-600">Out of Stock</span>
                <span className="text-lg font-semibold text-red-600">{systemStats.outOfStockItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-600">Low Stock</span>
                <span className="text-lg font-semibold text-orange-600">{systemStats.lowStockItems}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Operations */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 text-base">
              <ClipboardList className="h-5 w-5" />
              Stock Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="text-2xl font-bold text-green-600">{systemStats.totalStockRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-600">Pending</span>
                <span className="text-lg font-semibold text-orange-600">{systemStats.pendingRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Approved</span>
                <span className="text-lg font-semibold text-green-600">{systemStats.approvedRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tender Management */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700 text-base">
              <FileText className="h-5 w-5" />
              Tender Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tenders</span>
                <span className="text-2xl font-bold text-purple-600">{systemStats.totalTenders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-600">Active</span>
                <span className="text-lg font-semibold text-blue-600">{systemStats.activeTenders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Finalized</span>
                <span className="text-lg font-semibold text-green-600">{systemStats.finalizedTenders}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Management */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700 text-base">
              <Truck className="h-5 w-5" />
              Delivery Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Deliveries</span>
                <span className="text-2xl font-bold text-orange-600">{systemStats.totalDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-600">Pending</span>
                <span className="text-lg font-semibold text-orange-600">{systemStats.pendingDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Completed</span>
                <span className="text-lg font-semibold text-green-600">{systemStats.completedDeliveries}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Recent Activities</span>
              </CardTitle>
              <CardDescription>
                Latest system activities and updates
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Recent Stock Requests */}
              {stockIssuanceRequests.slice(0, 3).map((request, index) => (
                <TableRow key={`stock-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-green-600" />
                      Stock Request
                    </div>
                  </TableCell>
                  <TableCell>Request #{request.id} - {request.requested_by}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      request.request_status === 'Approved' ? 'bg-green-100 text-green-700' :
                      request.request_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {request.request_status || request.ApprovalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateDMY(request.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Recent Tenders */}
              {tenders.slice(0, 2).map((tender, index) => (
                <TableRow key={`tender-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Tender
                    </div>
                  </TableCell>
                  <TableCell>{tender.title} - {tender.tender_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      tender.status === 'Published' ? 'bg-blue-100 text-blue-700' :
                      tender.status === 'Closed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {tender.status || tender.tender_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateDMY(tender.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => navigate('/tenders')}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {/* Recent Deliveries */}
              {deliveries.slice(0, 2).map((delivery, index) => (
                <TableRow key={`delivery-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-orange-600" />
                      Delivery
                    </div>
                  </TableCell>
                  <TableCell>Delivery #{delivery.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      delivery.delivery_status === 'Completed' ? 'bg-green-100 text-green-700' :
                      delivery.delivery_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {delivery.delivery_status || delivery.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateDMY(delivery.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => navigate('/deliveries')}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;