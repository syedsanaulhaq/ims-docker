import React, { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '@/services/invmisApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  QrCode,
  X,
  Hash,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API = () => getApiBaseUrl();

export interface IssuanceItem {
  id: string;
  item_master_id?: string;
  nomenclature: string;
  requested_quantity: number;
  approved_quantity?: number;
}

export interface AvailableSerial {
  id: string;
  delivery_id: string;
  delivery_item_id: string;
  item_master_id: string;
  serial_number: string;
  barcode_data: string;
  status: string;
  notes?: string;
  created_at?: string;
}

interface SelectSerialNumbersForIssuanceDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedSerials: Record<string, string[]>) => void;
  requestItems: IssuanceItem[];
  requestNumber: string;
  requesterName: string;
}

const SelectSerialNumbersForIssuanceDialog: React.FC<SelectSerialNumbersForIssuanceDialogProps> = ({
  open,
  onClose,
  onConfirm,
  requestItems,
  requestNumber,
  requesterName,
}) => {
  const { toast } = useToast();
  const scannerInputRef = useRef<HTMLInputElement>(null);
  
  // Available serials per item master id
  const [availableSerialsMap, setAvailableSerialsMap] = useState<Record<string, AvailableSerial[]>>({});
  // Selected serial IDs per item id
  const [selectedSerialsMap, setSelectedSerialsMap] = useState<Record<string, string[]>>({});
  
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Fetch available serial numbers when modal opens
  useEffect(() => {
    if (open && requestItems.length > 0) {
      fetchAvailableSerials();
    }
  }, [open, requestItems]);

  // Auto focus scanner input when modal opens or active tab changes
  useEffect(() => {
    if (open) {
      setTimeout(() => scannerInputRef.current?.focus(), 200);
    }
  }, [open, activeItemIndex]);

  const fetchAvailableSerials = async () => {
    setLoading(true);
    const availableMap: Record<string, AvailableSerial[]> = {};
    const selectedMap: Record<string, string[]> = {};

    try {
      await Promise.all(
        requestItems.map(async (item) => {
          selectedMap[item.id] = [];
          if (item.item_master_id) {
            try {
              const res = await fetch(`${API()}/barcode/available-serials/${item.item_master_id}`, { credentials: 'include' });
              const json = await res.json();
              if (json.success) {
                availableMap[item.item_master_id] = json.data || [];
              }
            } catch (err) {
              console.error(`Failed to fetch serials for item ${item.item_master_id}`, err);
            }
          }
        })
      );
      setAvailableSerialsMap(availableMap);
      setSelectedSerialsMap(selectedMap);
    } catch (err: any) {
      toast({
        title: 'Error loading serial numbers',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanInput.trim();
    if (!query) return;

    let matched = false;

    // Search through available serials for active item or any request item
    for (const item of requestItems) {
      const itemSerials = availableSerialsMap[item.item_master_id || ''] || [];
      const foundSerial = itemSerials.find(
        (s) => s.serial_number.toLowerCase() === query.toLowerCase() ||
               s.barcode_data.toLowerCase() === query.toLowerCase()
      );

      if (foundSerial) {
        matched = true;
        const currentSelected = selectedSerialsMap[item.id] || [];
        const requiredQty = item.approved_quantity ?? item.requested_quantity;

        if (currentSelected.includes(foundSerial.id)) {
          toast({
            title: 'Already Scanned',
            description: `Serial "${foundSerial.serial_number}" is already selected for ${item.nomenclature}.`,
          });
        } else if (currentSelected.length >= requiredQty) {
          toast({
            title: 'Quantity Reached',
            description: `Maximum required quantity (${requiredQty}) reached for ${item.nomenclature}.`,
            variant: 'destructive'
          });
        } else {
          setSelectedSerialsMap(prev => ({
            ...prev,
            [item.id]: [...(prev[item.id] || []), foundSerial.id]
          }));
          toast({
            title: '⚡ Barcode Scanned & Matched',
            description: `Serial "${foundSerial.serial_number}" assigned to ${item.nomenclature}`,
          });
        }
        break;
      }
    }

    if (!matched) {
      toast({
        title: 'No Matching Serial Found',
        description: `No available in-stock item found matching barcode/serial "${query}".`,
        variant: 'destructive'
      });
    }

    setScanInput('');
  };

  const toggleSerialSelection = (itemId: string, itemMasterId: string, serialId: string, requiredQty: number) => {
    const currentSelected = selectedSerialsMap[itemId] || [];
    if (currentSelected.includes(serialId)) {
      setSelectedSerialsMap(prev => ({
        ...prev,
        [itemId]: prev[itemId].filter(id => id !== serialId)
      }));
    } else {
      if (currentSelected.length >= requiredQty) {
        toast({
          title: 'Limit Reached',
          description: `You have selected the required ${requiredQty} serial number(s) for this item.`,
          variant: 'destructive'
        });
        return;
      }
      setSelectedSerialsMap(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), serialId]
      }));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedSerialsMap);
  };

  const activeItem = requestItems[activeItemIndex] || requestItems[0];
  const activeMasterId = activeItem?.item_master_id || '';
  const activeAvailableSerials = availableSerialsMap[activeMasterId] || [];
  const activeSelectedIds = selectedSerialsMap[activeItem?.id || ''] || [];
  const activeRequiredQty = activeItem ? (activeItem.approved_quantity ?? activeItem.requested_quantity) : 0;

  const totalAssignedCount = Object.values(selectedSerialsMap).reduce((acc, list) => acc + list.length, 0);
  const totalRequiredCount = requestItems.reduce((acc, item) => acc + (item.approved_quantity ?? item.requested_quantity), 0);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Barcode className="h-6 w-6 text-emerald-400" />
                Assign Barcode / Serial Numbers for Physical Issuance
              </DialogTitle>
              <DialogDescription className="text-blue-200 mt-1 text-sm">
                Request #{requestNumber} • Requester: <strong>{requesterName}</strong>
              </DialogDescription>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400 text-sm px-3 py-1">
              {totalAssignedCount} / {totalRequiredCount} Physical Serials Assigned
            </Badge>
          </div>
        </DialogHeader>

        {/* Body Container */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-5 bg-slate-50">
          
          {/* Quick Scanner Bar */}
          <form onSubmit={handleScanSubmit} className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-700">
              <QrCode className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">
                USB Barcode / QR Code Scanner Input (or manual search)
              </label>
              <Input
                ref={scannerInputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan barcode tag or type serial number here and press Enter..."
                className="border-gray-300 text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2">
              <Search className="h-4 w-4" /> Match Barcode
            </Button>
          </form>

          {/* Item Selector Tabs */}
          {requestItems.length > 1 && (
            <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
              {requestItems.map((item, idx) => {
                const assigned = (selectedSerialsMap[item.id] || []).length;
                const reqQty = item.approved_quantity ?? item.requested_quantity;
                const isComplete = assigned >= reqQty;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveItemIndex(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all whitespace-nowrap border ${
                      activeItemIndex === idx
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span>{item.nomenclature}</span>
                    <Badge variant="outline" className={activeItemIndex === idx ? 'bg-white/20 text-white border-white/40' : 'bg-gray-100'}>
                      {assigned} / {reqQty}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Item Selection Section */}
          {activeItem && (
            <Card className="flex-1 overflow-hidden flex flex-col border-gray-200 shadow-sm bg-white">
              <CardHeader className="py-3 px-5 border-b bg-gray-50/80 flex flex-row items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    {activeItem.nomenclature}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Required Quantity: <strong className="text-gray-900">{activeRequiredQty} unit(s)</strong> •
                    Selected: <strong className="text-blue-600">{activeSelectedIds.length}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchAvailableSerials} disabled={loading} className="text-xs text-gray-600">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh Stock
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
                {activeAvailableSerials.length === 0 ? (
                  <div className="text-center py-12 bg-amber-50/50 rounded-xl border border-amber-200 text-amber-800 p-6">
                    <AlertCircle className="h-10 w-10 mx-auto text-amber-500 mb-2" />
                    <p className="font-bold text-base">No tracked in-stock serial numbers found</p>
                    <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                      No physical items with registered serial numbers or barcodes are currently tagged in store for this item master. You can still complete issuance if un-tracked stock is available.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeAvailableSerials.map((serial) => {
                      const isSelected = activeSelectedIds.includes(serial.id);

                      return (
                        <div
                          key={serial.id}
                          onClick={() => toggleSerialSelection(activeItem.id, activeMasterId, serial.id, activeRequiredQty)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-300'
                              : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSerialSelection(activeItem.id, activeMasterId, serial.id, activeRequiredQty)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-sm text-gray-900 truncate">
                                {serial.serial_number}
                              </span>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                            </div>

                            {serial.barcode_data && serial.barcode_data !== serial.serial_number && (
                              <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                <Barcode className="h-3 w-3" /> {serial.barcode_data}
                              </p>
                            )}

                            <p className="text-[11px] text-gray-400 mt-1">
                              Added: {serial.created_at ? new Date(serial.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-white flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500">
            {totalAssignedCount === 0 ? (
              <span className="text-amber-600 font-medium">⚠️ No serial numbers selected. Issuance will process without serial tags.</span>
            ) : totalAssignedCount < totalRequiredCount ? (
              <span className="text-blue-600 font-medium">ℹ️ {totalAssignedCount} of {totalRequiredCount} physical items tagged.</span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> All physical serial numbers selected!
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-md shadow-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Proceed & Issue Items ({totalAssignedCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectSerialNumbersForIssuanceDialog;
