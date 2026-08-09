import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Search,
  RefreshCw,
  TrendingDown,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface InventoryItem {
  id: string;
  item_master_id: string;
  current_quantity: number;
  last_transaction_date: string;
  last_transaction_type: string;
  nomenclature: string;
  item_code: string;
  unit: string;
  specifications: string | null;
  category_name: string;
}

interface AlertItem extends InventoryItem {
  alertType: 'critical' | 'urgent' | 'warning';
  alertMessage: string;
}

const InventoryAlertsPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alertItems, setAlertItems] = useState<AlertItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlertType, setSelectedAlertType] = useState<string>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    processAlerts();
  }, [items]);

  useEffect(() => {
    filterItems();
  }, [alertItems, searchTerm, selectedAlertType]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/inventory/current-stock');
      if (!response.ok) throw new Error('Failed to load inventory data');
      const data = await response.json();
      setItems(data.inventory || []);
    } catch (error: any) {
      console.error('Error loading inventory items:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to load inventory data',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processAlerts = () => {
    const alerts: AlertItem[] = [];

    items.forEach(item => {
      let alertType: 'critical' | 'urgent' | 'warning' | null = null;
      let alertMessage = '';

      // Critical - Out of Stock
      if (item.current_quantity === 0) {
        alertType = 'critical';
        alertMessage = 'OUT OF STOCK - Immediate action required';
      }
      // Urgent - Very Low Stock (1-5 units)
      else if (item.current_quantity > 0 && item.current_quantity <= 5) {
        alertType = 'urgent';
        alertMessage = `Very low stock - Only ${item.current_quantity} ${item.unit} remaining`;
      }
      // Warning - Low Stock (6-10 units)
      else if (item.current_quantity > 5 && item.current_quantity <= 10) {
        alertType = 'warning';
        alertMessage = `Low stock - ${item.current_quantity} ${item.unit} available`;
      }

      if (alertType) {
        alerts.push({
          ...item,
          alertType,
          alertMessage
        });
      }
    });

    // Sort by alert priority: critical -> urgent -> warning
    alerts.sort((a, b) => {
      const priorityOrder = { critical: 0, urgent: 1, warning: 2 };
      return priorityOrder[a.alertType] - priorityOrder[b.alertType];
    });

    setAlertItems(alerts);
  };

  const filterItems = () => {
    let filtered = alertItems;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by alert type
    if (selectedAlertType !== 'all') {
      filtered = filtered.filter(item => item.alertType === selectedAlertType);
    }

    setFilteredItems(filtered);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getAlertCounts = () => {
    return {
      critical: alertItems.filter(item => item.alertType === 'critical').length,
      urgent: alertItems.filter(item => item.alertType === 'urgent').length,
      warning: alertItems.filter(item => item.alertType === 'warning').length,
    };
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const alertTypeOptions = [
    { value: 'all', label: 'All Alerts' },
    { value: 'critical', label: 'Critical' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'warning', label: 'Warning' },
  ];

  const alertCounts = getAlertCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/inventory-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Inventory Alerts
            </h1>
            <p className="text-gray-600">Items requiring immediate attention ({alertItems.length} alerts)</p>
          </div>
        </div>
        <Button onClick={loadItems} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertCounts.critical}</div>
            <p className="text-xs text-red-600">Out of stock (0 units)</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{alertCounts.urgent}</div>
            <p className="text-xs text-orange-600">Very low stock (1-5 units)</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Warning</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertCounts.warning}</div>
            <p className="text-xs text-yellow-600">Low stock (6-10 units)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedAlertType}
                onChange={(e) => setSelectedAlertType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {alertTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Alerts</span>
            <Badge variant="outline">{filteredItems.length} alerts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No alerts found matching your criteria</p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${getAlertColor(item.alertType)}`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(item.alertType)}
                    <div className="flex-1">
                      <div className="font-medium">{item.nomenclature}</div>
                      <div className="text-xs text-gray-600 mt-0.5">Code: {item.item_code} | Category: {item.category_name}</div>
                      <div className="text-sm mt-1">{item.alertMessage}</div>
                      <div className="text-xs mt-2 space-x-4">
                        <span>Current: {formatNumber(item.current_quantity)} {item.unit}</span>
                        <span className="text-gray-500">Last Updated: {new Date(item.last_transaction_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        item.alertType === 'critical' ? 'destructive' :
                        item.alertType === 'urgent' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {item.alertType.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAlertsPage;
