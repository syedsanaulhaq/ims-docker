import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';

interface POFulfillmentTrackerProps {
  poId: string;
  showDeliveryHistory?: boolean;
}

interface FulfillmentItem {
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  pending_quantity: number;
  fulfillment_percentage: number;
  delivery_status: string;
}

interface Delivery {
  delivery_number: string;
  delivery_date: string;
  receiving_date: string;
  delivery_status: string;
  delivery_personnel?: string;
  delivery_chalan?: string;
  total_items: number;
  total_quantity: number;
  good_quantity?: number;
  damaged_quantity?: number;
  rejected_quantity?: number;
}

interface DeliveryStatus {
  overallStatus: string;
  receivedPercentage: number;
  totalOrdered: number;
  totalReceived: number;
  totalPending: number;
}

const POFulfillmentTracker: React.FC<POFulfillmentTrackerProps> = ({ 
  poId, 
  showDeliveryHistory = true 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFulfillmentData();
  }, [poId]);

  const fetchFulfillmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fulfillment details
      const fulfillmentResponse = await fetch(`${getApiBaseUrl()}/purchase-orders/${poId}/fulfillment`);
      if (!fulfillmentResponse.ok) throw new Error('Failed to fetch fulfillment data');
      const fulfillmentData = await fulfillmentResponse.json();
      setItems(fulfillmentData.items);

      // Fetch delivery status
      const statusResponse = await fetch(`${getApiBaseUrl()}/purchase-orders/${poId}/delivery-status`);
      if (!statusResponse.ok) throw new Error('Failed to fetch delivery status');
      const statusData = await statusResponse.json();
      setDeliveryStatus(statusData.deliveryStatus);
      setDeliveries(statusData.deliveries || []);
    } catch (err: any) {
      console.error('Error fetching fulfillment data:', err);
      setError(err.response?.data?.error || 'Failed to load fulfillment data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'partial':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
      received: 'bg-blue-100 text-blue-800'
    };
    if (!status) return 'bg-gray-100 text-gray-800';
    return badges[status.toLowerCase() as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      {deliveryStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Overall Fulfillment</h3>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(deliveryStatus.overallStatus)}`}>
              {deliveryStatus.overallStatus}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-semibold">{deliveryStatus.receivedPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  deliveryStatus.receivedPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${deliveryStatus.receivedPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{deliveryStatus.totalOrdered}</p>
              <p className="text-sm text-gray-600">Ordered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{deliveryStatus.totalReceived}</p>
              <p className="text-sm text-gray-600">Received</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{deliveryStatus.totalPending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>

          {/* Receive Delivery Button */}
          {deliveryStatus.totalPending > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate(`/purchase-orders/${poId}/receive-delivery`)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Receive Delivery
              </button>
            </div>
          )}
        </div>
      )}

      {/* Item-by-Item Fulfillment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Item Fulfillment Status</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.ordered_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {item.received_quantity || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {item.pending_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden w-32">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.fulfillment_percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${item.fulfillment_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {item.fulfillment_percentage.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.delivery_status)}`}>
                      {item.delivery_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No items found for this purchase/supply order.</p>
          </div>
        )}
      </div>

      {/* Delivery History */}
      {showDeliveryHistory && deliveries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Delivery History</h3>
            <p className="text-sm text-gray-600 mt-1">{deliveries.length} delivery(ies) received</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {deliveries.map((delivery, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{delivery.delivery_number}</p>
                      <p className="text-sm text-gray-600">
                        Delivered: {new Date(delivery.delivery_date).toLocaleDateString()}
                      </p>
                      {delivery.receiving_date && (
                        <p className="text-sm text-gray-600">
                          Received: {new Date(delivery.receiving_date).toLocaleDateString()}
                        </p>
                      )}
                      {delivery.delivery_personnel && (
                        <p className="text-sm text-gray-600">
                          Delivered by: {delivery.delivery_personnel}
                        </p>
                      )}
                      {delivery.delivery_chalan && (
                        <p className="text-sm text-gray-600">
                          Challan No: {delivery.delivery_chalan}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(delivery.delivery_status)}`}>
                      {delivery.delivery_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Items</p>
                      <p className="font-semibold">{delivery.total_items}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Good Quantity</p>
                      <p className="font-semibold text-green-600">{delivery.good_quantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Damaged</p>
                      <p className="font-semibold text-yellow-600">{delivery.damaged_quantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rejected</p>
                      <p className="font-semibold text-red-600">{delivery.rejected_quantity || 0}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Total Quantity: <span className="font-semibold">{delivery.total_quantity}</span>
                      {' | '}
                      Good: <span className="font-semibold text-green-600">{delivery.good_quantity}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDeliveryHistory && deliveries.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-center text-gray-500">No deliveries received yet for this purchase/supply order.</p>
        </div>
      )}
    </div>
  );
};

export default POFulfillmentTracker;
