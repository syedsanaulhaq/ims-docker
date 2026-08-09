import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Package, Clock, CheckCircle, PlusCircle } from 'lucide-react';
import { sessionService } from '../services/sessionService';

interface RequestItem {
  id: string;
  category: string;
  sub_category: string;
  item_name: string;
  quantity: number;
  submitted_date?: string;
  status?: string;
  alloted_date?: string;
}

const PersonalIMS: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'new' | 'pending' | 'my-items'>('new');
  const [newRequests, setNewRequests] = useState<RequestItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [myItems, setMyItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = sessionService.getCurrentUser();

  useEffect(() => {
    fetchPersonalData();
  }, []);

  const fetchPersonalData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // These would fetch data specific to the logged-in user from DS
      
      // Mock data for demonstration
      setNewRequests([
        {
          id: '1',
          category: 'Office Supplies',
          sub_category: 'Stationery',
          item_name: 'A4 Paper Ream',
          quantity: 5,
          submitted_date: '2025-11-01'
        },
        {
          id: '2',
          category: 'Electronics',
          sub_category: 'Computer Accessories',
          item_name: 'USB Mouse',
          quantity: 2,
          submitted_date: '2025-11-02'
        }
      ]);

      setPendingRequests([
        {
          id: '3',
          category: 'Office Supplies',
          sub_category: 'Printing',
          item_name: 'Printer Toner',
          quantity: 1,
          status: 'Awaiting Approval'
        },
        {
          id: '4',
          category: 'Furniture',
          sub_category: 'Office Furniture',
          item_name: 'Office Chair',
          quantity: 1,
          status: 'Processing'
        }
      ]);

      setMyItems([
        {
          id: '5',
          category: 'Electronics',
          sub_category: 'Computer Hardware',
          item_name: 'Laptop Dell Latitude 5420',
          quantity: 1,
          alloted_date: '2025-10-15'
        },
        {
          id: '6',
          category: 'Office Supplies',
          sub_category: 'Stationery',
          item_name: 'Stapler',
          quantity: 1,
          alloted_date: '2025-10-20'
        },
        {
          id: '7',
          category: 'Electronics',
          sub_category: 'Computer Accessories',
          item_name: 'USB Keyboard',
          quantity: 1,
          alloted_date: '2025-10-20'
        }
      ]);

    } catch (error) {
      console.error('Error fetching personal IMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'awaiting approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Personal Inventory Management
        </h1>
        <p className="text-gray-600">
          Welcome, {currentUser?.email || 'User'} - Manage your inventory requests and allocations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activeTab === 'new' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Requests</p>
                <p className="text-3xl font-bold text-blue-600">{newRequests.length}</p>
              </div>
              <PlusCircle className="h-12 w-12 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activeTab === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingRequests.length}</p>
              </div>
              <Clock className="h-12 w-12 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activeTab === 'my-items' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setActiveTab('my-items')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">My Items</p>
                <p className="text-3xl font-bold text-green-600">{myItems.length}</p>
              </div>
              <Package className="h-12 w-12 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Requests Table */}
      {activeTab === 'new' && (
        <Card>
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                New Requests
              </CardTitle>
              <Button size="sm" onClick={() => navigate('/dashboard/stock-issuance')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category → Sub-Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {newRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No new requests found
                      </td>
                    </tr>
                  ) : (
                    newRequests.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{item.category}</div>
                            <div className="text-gray-500">→ {item.sub_category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.submitted_date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests Table */}
      {activeTab === 'pending' && (
        <Card>
          <CardHeader className="bg-yellow-50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category → Sub-Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No pending requests
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{item.category}</div>
                            <div className="text-gray-500">→ {item.sub_category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(item.status || '')}>
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Items Table */}
      {activeTab === 'my-items' && (
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              My Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category → Sub-Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alloted Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No items allocated yet
                      </td>
                    </tr>
                  ) : (
                    myItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{item.category}</div>
                            <div className="text-gray-500">→ {item.sub_category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.alloted_date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonalIMS;
