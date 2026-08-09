import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Package, Trash2, Plus } from 'lucide-react';
import { Delivery, DeliveryItem, TransactionItem } from './types';

interface DeliverySectionProps {
  tenderItems: TransactionItem[];
  deliveries: Delivery[];
  onDeliveryCreate: (delivery: Omit<Delivery, 'id' | 'created_at'>) => void;
  onDeliveryDelete: (deliveryId: string) => void;
  tenderId: string;
}

const DeliverySection: React.FC<DeliverySectionProps> = ({
  tenderItems,
  deliveries,
  onDeliveryCreate,
  onDeliveryDelete,
  tenderId
}) => {
  const [showForm, setShowForm] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  const addItemToDelivery = (item: TransactionItem) => {
    const existingIndex = deliveryItems.findIndex(di => di.item_id === item.id);
    if (existingIndex >= 0) {
      const updated = [...deliveryItems];
      updated[existingIndex].quantity_delivered += 1;
      setDeliveryItems(updated);
    } else {
      setDeliveryItems([...deliveryItems, {
        item_id: item.id,
        item_code: item.item_code,
        item_description: item.item_description,
        quantity_delivered: 1,
        unit_price: item.actual_unit_price || item.unit_price
      }]);
    }
  };

  const updateDeliveryItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setDeliveryItems(deliveryItems.filter(di => di.item_id !== itemId));
    } else {
      setDeliveryItems(deliveryItems.map(di => 
        di.item_id === itemId ? { ...di, quantity_delivered: quantity } : di
      ));
    }
  };

  const createDelivery = () => {
    if (deliveryItems.length === 0) return;

    onDeliveryCreate({
      tender_id: tenderId,
      delivery_date: deliveryDate,
      delivery_note: deliveryNote,
      items: deliveryItems
    });

    // Reset form
    setDeliveryItems([]);
    setDeliveryNote('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
  };

  return (
    <Card className="mb-6 border-green-200 bg-green-50">
      <CardHeader className="bg-green-100 border-b border-green-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-green-800 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Management
          </CardTitle>
          <Button 
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "secondary" : "default"}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            {showForm ? 'Cancel' : 'New Delivery'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="bg-white">
        {/* Create Delivery Form */}
        {showForm && (
          <div className="border border-green-200 rounded-lg p-4 mb-4 bg-green-50">
            <h3 className="font-medium text-green-800 mb-3">Create New Delivery</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="delivery-date">Delivery Date</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="delivery-note">Delivery Note</Label>
                <Textarea
                  id="delivery-note"
                  placeholder="Optional delivery notes..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Available Items to Add */}
            <div className="mb-4">
              <Label>Add Items to Delivery</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {tenderItems.map((item) => (
                  <Button
                    key={item.id}
                    onClick={() => addItemToDelivery(item)}
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-2"
                  >
                    <div>
                      <div className="font-medium text-xs">{item.item_code}</div>
                      <div className="text-xs text-gray-600 truncate">{item.item_description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Delivery Items */}
            {deliveryItems.length > 0 && (
              <div className="mb-4">
                <Label>Items in This Delivery</Label>
                <div className="space-y-2 mt-2">
                  {deliveryItems.map((deliveryItem) => (
                    <div key={deliveryItem.item_id} className="flex items-center gap-3 p-2 bg-white rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{deliveryItem.item_code}</div>
                        <div className="text-xs text-gray-600">{deliveryItem.item_description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Qty:</Label>
                        <Input
                          type="number"
                          min="1"
                          value={deliveryItem.quantity_delivered}
                          onChange={(e) => updateDeliveryItemQuantity(
                            deliveryItem.item_id, 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-20 h-8"
                        />
                        <Button
                          onClick={() => updateDeliveryItemQuantity(deliveryItem.item_id, 0)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={createDelivery} 
                disabled={deliveryItems.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Create Delivery
              </Button>
              <Button 
                onClick={() => setShowForm(false)} 
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Deliveries */}
        <div className="space-y-3">
          {deliveries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No deliveries recorded yet</p>
          ) : (
            deliveries.map((delivery) => (
              <div key={delivery.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{delivery.delivery_date}</span>
                    <Badge variant="secondary">{delivery.items.length} items</Badge>
                  </div>
                  <Button
                    onClick={() => onDeliveryDelete(delivery.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {delivery.delivery_note && (
                  <p className="text-sm text-gray-600 mb-2">{delivery.delivery_note}</p>
                )}
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {delivery.items.map((item) => (
                    <div key={item.item_id} className="flex justify-between bg-gray-50 p-1 rounded">
                      <span>{item.item_code}</span>
                      <span className="font-medium">Qty: {item.quantity_delivered}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliverySection;
