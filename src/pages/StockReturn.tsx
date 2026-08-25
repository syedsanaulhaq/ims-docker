import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateDMY } from '@/utils/dateUtils';
import { 
  ArrowLeftRight, 
  Search, 
  Check, 
  AlertTriangle,
  Calendar,
  Package,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { stockIssuanceService } from '@/services/stockIssuanceService';
import { stockReturnService } from '@/services/stockReturnService';
import { useSession } from '@/contexts/SessionContext';

// Database response interfaces
interface StockIssuanceRequest {
  request_number: string;
  requester_name: string;
  created_at: string;
  expected_return_date: string;
  is_returnable: boolean;
}

interface StockIssuanceRequestItem {
  id: string;
  request_id: string;
  nomenclature: string;
  approved_quantity: number;
  stock_issuance_requests: StockIssuanceRequest;
}

interface IssuedItem {
  id: string;
  request_number: string;
  nomenclature: string;
  issued_quantity: number;
  return_due_date: string;
  requester_name: string;
  issue_date: string;
  condition_at_issue: string;
  days_overdue: number;
}

interface ReturnItem {
  issued_item_id: string;
  nomenclature: string;
  issued_quantity: number;
  return_quantity: number;
  condition_on_return: 'Good' | 'Damaged' | 'Lost';
  damage_description?: string;
}

const StockReturn: React.FC = () => {
  const { getCurrentUserName } = useSession();

  const [issuedItems, setIssuedItems] = useState<IssuedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('return');

  // Return form fields
  const [returnNotes, setReturnNotes] = useState('');
  const [returnedBy, setReturnedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');

  const [returnScope, setReturnScope] = useState('personal');

  useEffect(() => {
    setReturnedBy(getCurrentUserName() || '');
  }, [getCurrentUserName]);

  useEffect(() => {
    fetchIssuedItems();
  }, [returnScope]);

  const fetchIssuedItems = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Get issued items from stockIssuanceService based on selected scope
      const data = await stockIssuanceService.getIssuedItems(returnScope);

      // Transform the data to match IssuedItem interface
      const transformedItems: IssuedItem[] = data.map(item => {
        const dueDate = new Date(item.expected_return_date || Date.now());
        const today = new Date();
        const daysOverdue = Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: item.id,
          request_number: item.request_number || '',
          nomenclature: item.nomenclature,
          issued_quantity: item.approved_quantity || 0,
          return_due_date: item.expected_return_date || '',
          requester_name: item.requester_name || '',
          issue_date: item.created_at || '',
          condition_at_issue: 'Good',
          days_overdue: daysOverdue
        };
      });

      setIssuedItems(transformedItems);
    } catch (error: any) {
      setError('Failed to load issued items: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = issuedItems.filter(item =>
    item.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.request_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addReturnItem = (item: IssuedItem) => {
    const existing = returnItems.find(r => r.issued_item_id === item.id);
    if (existing) {
      setError('Item already added to return list');
      return;
    }

    const newReturnItem: ReturnItem = {
      issued_item_id: item.id,
      nomenclature: item.nomenclature,
      issued_quantity: item.issued_quantity,
      return_quantity: item.issued_quantity,
      condition_on_return: 'Good'
    };

    setReturnItems([...returnItems, newReturnItem]);
    setError('');
  };

  const updateReturnQuantity = (issued_item_id: string, quantity: number) => {
    setReturnItems(items =>
      items.map(item =>
        item.issued_item_id === issued_item_id
          ? { ...item, return_quantity: Math.max(0, Math.min(quantity, item.issued_quantity)) }
          : item
      )
    );
  };

  const updateCondition = (issued_item_id: string, condition: 'Good' | 'Damaged' | 'Lost') => {
    setReturnItems(items =>
      items.map(item =>
        item.issued_item_id === issued_item_id
          ? { ...item, condition_on_return: condition }
          : item
      )
    );
  };

  const updateDamageDescription = (issued_item_id: string, description: string) => {
    setReturnItems(items =>
      items.map(item =>
        item.issued_item_id === issued_item_id
          ? { ...item, damage_description: description }
          : item
      )
    );
  };

  const removeReturnItem = (issued_item_id: string) => {
    setReturnItems(items => items.filter(item => item.issued_item_id !== issued_item_id));
  };

  const processReturn = async () => {
    if (!returnedBy || returnItems.length === 0) {
      setError('Please fill in all required fields and add at least one item');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare stock return data
      const stockReturnData = {
        return_date: new Date().toISOString().split('T')[0],
        returned_by: returnedBy,
        verified_by: verifiedBy || undefined,
        return_notes: returnNotes || undefined,
        return_status: 'Completed',
        return_items: returnItems.map(item => ({
          issued_item_id: item.issued_item_id,
          nomenclature: item.nomenclature,
          return_quantity: item.return_quantity,
          condition_on_return: item.condition_on_return,
          damage_description: item.damage_description || undefined
        }))
      };

      // Create stock return using service (backend handles inventory updates)
      await stockReturnService.createReturn(stockReturnData);

      setSuccess(`Successfully processed return for ${returnItems.length} items`);
      
      // Reset form
      setReturnItems([]);
      setReturnedBy('');
      setVerifiedBy('');
      setReturnNotes('');
      
      // Refresh issued items
      fetchIssuedItems();

    } catch (error: any) {
      setError('Failed to process return: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const overdueItems = issuedItems.filter(item => item.days_overdue > 0);
  const dueSoonItems = issuedItems.filter(item => {
    const dueDate = new Date(item.return_due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7 && daysUntilDue > 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Returns</h1>
            <p className="text-gray-600 mt-1">Process returns of issued inventory items</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Label htmlFor="returnScope" className="font-semibold text-gray-700">Return Scope:</Label>
            <Select value={returnScope} onValueChange={(val) => { setReturnScope(val); setReturnItems([]); }}>
              <SelectTrigger id="returnScope" className="w-48 bg-white shadow-sm border-gray-200">
                <SelectValue placeholder="Select Return Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Items</SelectItem>
                <SelectItem value="branch">Branch Items</SelectItem>
                <SelectItem value="wing">Wing Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="return">Process Returns</TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue Items
              {overdueItems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {overdueItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="due-soon">
              Due Soon
              {dueSoonItems.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {dueSoonItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="return" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Items to Return */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Items Available for Return
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by item, requester, or request number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Available Items */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredItems.map(item => (
                      <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.nomenclature}</span>
                              {item.days_overdue > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {item.days_overdue} days overdue
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>Qty: {item.issued_quantity} | Requester: {item.requester_name}</div>
                              <div>Request: {item.request_number}</div>
                              <div>Due: {formatDateDMY(item.return_due_date)}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addReturnItem(item)}
                            disabled={returnItems.some(r => r.issued_item_id === item.id)}
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Return Processing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Process Return
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Return Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="returnedBy">Returned By *</Label>
                      <Input
                        id="returnedBy"
                        value={returnedBy}
                        onChange={(e) => setReturnedBy(e.target.value)}
                        placeholder="Name of person returning items"
                      />
                    </div>
                    <div>
                      <Label htmlFor="verifiedBy">Verified By</Label>
                      <Input
                        id="verifiedBy"
                        value={verifiedBy}
                        onChange={(e) => setVerifiedBy(e.target.value)}
                        placeholder="Name of person verifying return"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="returnNotes">Return Notes</Label>
                    <Textarea
                      id="returnNotes"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Any additional notes about the return"
                      rows={2}
                    />
                  </div>

                  {/* Return Items */}
                  <div>
                    <h4 className="font-medium mb-3">Items to Return ({returnItems.length})</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {returnItems.map(item => (
                        <div key={item.issued_item_id} className="p-3 bg-blue-50 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{item.nomenclature}</div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeReturnItem(item.issued_item_id)}
                            >
                              ×
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Return Quantity</Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.issued_quantity}
                                value={item.return_quantity}
                                onChange={(e) => updateReturnQuantity(item.issued_item_id, parseInt(e.target.value) || 0)}
                                className="text-sm"
                              />
                              <div className="text-xs text-gray-500">
                                Max: {item.issued_quantity}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Condition</Label>
                              <Select
                                value={item.condition_on_return}
                                onValueChange={(value: 'Good' | 'Damaged' | 'Lost') => updateCondition(item.issued_item_id, value)}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Good">Good</SelectItem>
                                  <SelectItem value="Damaged">Damaged</SelectItem>
                                  <SelectItem value="Lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {item.condition_on_return === 'Damaged' && (
                            <div>
                              <Label className="text-xs">Damage Description</Label>
                              <Textarea
                                value={item.damage_description || ''}
                                onChange={(e) => updateDamageDescription(item.issued_item_id, e.target.value)}
                                placeholder="Describe the damage"
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Process Button */}
                  <div className="pt-4">
                    <Button
                      onClick={processReturn}
                      disabled={isLoading || returnItems.length === 0}
                      className="w-full"
                    >
                      {isLoading ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Process Return ({returnItems.length} items)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Items ({overdueItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueItems.map(item => (
                    <div key={item.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.nomenclature}</div>
                          <div className="text-sm text-gray-600">
                            Requester: {item.requester_name} | Qty: {item.issued_quantity}
                          </div>
                          <div className="text-sm text-gray-600">
                            Request: {item.request_number}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="mb-1">
                            {item.days_overdue} days overdue
                          </Badge>
                          <div className="text-sm text-gray-600">
                            Due: {formatDateDMY(item.return_due_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {overdueItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No overdue items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="due-soon" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <Calendar className="w-5 h-5" />
                  Items Due Soon ({dueSoonItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dueSoonItems.map(item => (
                    <div key={item.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.nomenclature}</div>
                          <div className="text-sm text-gray-600">
                            Requester: {item.requester_name} | Qty: {item.issued_quantity}
                          </div>
                          <div className="text-sm text-gray-600">
                            Request: {item.request_number}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            Due in {Math.ceil((new Date(item.return_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                          </Badge>
                          <div className="text-sm text-gray-600">
                            Due: {formatDateDMY(item.return_due_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dueSoonItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No items due soon
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StockReturn;
