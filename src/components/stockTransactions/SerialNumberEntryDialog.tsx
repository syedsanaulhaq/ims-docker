import React, { useState, useEffect, useRef } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X, Download, Upload, FileSpreadsheet, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface SerialNumberEntry {
  id: string;
  serialNumber: string;
  notes?: string;
}

interface SerialNumberEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (serialNumbers: SerialNumberEntry[]) => void;
  itemName: string;
  requiredQuantity: number;
  existingSerialNumbers?: SerialNumberEntry[];
}

const SerialNumberEntryDialog: React.FC<SerialNumberEntryDialogProps> = ({
  open,
  onClose,
  onSave,
  itemName,
  requiredQuantity,
  existingSerialNumbers = []
}) => {
  const { toast } = useToast();
  const [serialNumbers, setSerialNumbers] = useState<SerialNumberEntry[]>([]);
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with existing serial numbers when dialog opens
  useEffect(() => {
    if (open) {
      setSerialNumbers([...existingSerialNumbers]);
      setNewSerialNumber('');
      setNewNotes('');
      setBulkInput('');
      setShowBulkInput(false);
    }
  }, [open, existingSerialNumbers]);

  const addSerialNumber = () => {
    if (!newSerialNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a serial number",
        variant: "destructive",
      });
      return;
    }

    // Check quantity limit
    const currentValidCount = serialNumbers.filter(sn => sn.serialNumber.trim()).length;
    if (currentValidCount >= requiredQuantity) {
      toast({
        title: "Limit Reached",
        description: `Cannot add more serial numbers. Maximum allowed: ${requiredQuantity}`,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    const isDuplicate = serialNumbers.some(sn => 
      sn.serialNumber.toLowerCase() === newSerialNumber.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      toast({
        title: "Error",
        description: "This serial number already exists",
        variant: "destructive",
      });
      return;
    }

    const newEntry: SerialNumberEntry = {
      id: `new-${Date.now()}-${Math.random()}`,
      serialNumber: newSerialNumber.trim(),
      notes: newNotes.trim()
    };

    setSerialNumbers(prev => [...prev, newEntry]);
    setNewSerialNumber('');
    setNewNotes('');
    
    toast({
      title: "Serial Number Added",
      description: `${newEntry.serialNumber} added successfully (${currentValidCount + 1}/${requiredQuantity})`,
    });
  };

  const addBulkSerialNumbers = () => {
    if (!bulkInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter serial numbers",
        variant: "destructive",
      });
      return;
    }

    const currentValidCount = serialNumbers.filter(sn => sn.serialNumber.trim()).length;
    const availableSlots = requiredQuantity - currentValidCount;

    if (availableSlots <= 0) {
      toast({
        title: "Limit Reached",
        description: `Cannot add more serial numbers. Maximum allowed: ${requiredQuantity}`,
        variant: "destructive",
      });
      return;
    }

    const lines = bulkInput.split('\n').filter(line => line.trim());
    const newEntries: SerialNumberEntry[] = [];
    const duplicates: string[] = [];
    const limitExceeded: string[] = [];
    const existing = serialNumbers.map(sn => sn.serialNumber.toLowerCase());

    lines.forEach(line => {
      const serialNumber = line.trim();
      if (serialNumber) {
        if (existing.includes(serialNumber.toLowerCase()) || 
            newEntries.some(entry => entry.serialNumber.toLowerCase() === serialNumber.toLowerCase())) {
          duplicates.push(serialNumber);
        } else if (newEntries.length >= availableSlots) {
          limitExceeded.push(serialNumber);
        } else {
          newEntries.push({
            id: `bulk-${Date.now()}-${Math.random()}`,
            serialNumber,
            notes: ''
          });
          existing.push(serialNumber.toLowerCase());
        }
      }
    });

    if (duplicates.length > 0) {
      toast({
        title: "Duplicates Found",
        description: `Skipped duplicates: ${duplicates.join(', ')}`,
        variant: "destructive",
      });
    }

    if (limitExceeded.length > 0) {
      toast({
        title: "Quantity Limit Exceeded",
        description: `Skipped ${limitExceeded.length} entries due to quantity limit (${requiredQuantity} max)`,
        variant: "destructive",
      });
    }

    if (newEntries.length > 0) {
      setSerialNumbers(prev => [...prev, ...newEntries]);
      setBulkInput('');
      setShowBulkInput(false);
      
      toast({
        title: "Bulk Import Complete",
        description: `${newEntries.length} serial numbers added`,
      });
    }
  };

  const exportToCSV = () => {
    if (serialNumbers.length === 0) {
      toast({
        title: "No Data",
        description: "No serial numbers to export",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ['Serial Number', 'Notes'],
      ...serialNumbers.map(sn => [sn.serialNumber, sn.notes || ''])
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${itemName}_serial_numbers.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `${serialNumbers.length} serial numbers exported to CSV`,
    });
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file must have at least a header and one data row",
          variant: "destructive",
        });
        return;
      }

      const currentValidCount = serialNumbers.filter(sn => sn.serialNumber.trim()).length;
      const availableSlots = requiredQuantity - currentValidCount;

      if (availableSlots <= 0) {
        toast({
          title: "Limit Reached",
          description: `Cannot import more serial numbers. Maximum allowed: ${requiredQuantity}`,
          variant: "destructive",
        });
        return;
      }

      // Skip header row
      const dataLines = lines.slice(1);
      const newEntries: SerialNumberEntry[] = [];
      const duplicates: string[] = [];
      const limitExceeded: string[] = [];
      const existing = serialNumbers.map(sn => sn.serialNumber.toLowerCase());

      dataLines.forEach((line, index) => {
        const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
        const serialNumber = columns[0];
        const notes = columns[1] || '';

        if (serialNumber) {
          if (existing.includes(serialNumber.toLowerCase()) || 
              newEntries.some(entry => entry.serialNumber.toLowerCase() === serialNumber.toLowerCase())) {
            duplicates.push(serialNumber);
          } else if (newEntries.length >= availableSlots) {
            limitExceeded.push(serialNumber);
          } else {
            newEntries.push({
              id: `csv-${Date.now()}-${index}`,
              serialNumber,
              notes
            });
            existing.push(serialNumber.toLowerCase());
          }
        }
      });

      if (duplicates.length > 0) {
        toast({
          title: "Duplicates Found",
          description: `Skipped duplicates: ${duplicates.join(', ')}`,
          variant: "destructive",
        });
      }

      if (limitExceeded.length > 0) {
        toast({
          title: "Quantity Limit Exceeded",
          description: `Skipped ${limitExceeded.length} entries due to quantity limit (${requiredQuantity} max)`,
          variant: "destructive",
        });
      }

      if (newEntries.length > 0) {
        setSerialNumbers(prev => [...prev, ...newEntries]);
        
        toast({
          title: "Import Complete",
          description: `${newEntries.length} serial numbers imported from CSV`,
        });
      }
    };

    reader.readAsText(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateSerialNumber = (id: string, field: 'serialNumber' | 'notes', value: string) => {
    setSerialNumbers(prev => 
      prev.map(sn => 
        sn.id === id ? { ...sn, [field]: value } : sn
      )
    );
  };

  const removeSerialNumber = (id: string) => {
    const removedSerial = serialNumbers.find(sn => sn.id === id);
    setSerialNumbers(prev => prev.filter(sn => sn.id !== id));
    
    if (removedSerial) {
      toast({
        title: "Serial Number Removed",
        description: `${removedSerial.serialNumber} removed`,
      });
    }
  };

  const handleSave = () => {
    // Filter out empty serial numbers
    const validSerials = serialNumbers.filter(sn => sn.serialNumber.trim());
    
    if (validSerials.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one serial number",
        variant: "destructive",
      });
      return;
    }

    // Check if quantity matches exactly
    if (validSerials.length !== requiredQuantity) {
      toast({
        title: "Quantity Mismatch",
        description: `You must enter exactly ${requiredQuantity} serial numbers. Current: ${validSerials.length}`,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates within the list
    const serialNumberSet = new Set();
    const duplicates = validSerials.filter(sn => {
      const lowerSerial = sn.serialNumber.toLowerCase();
      if (serialNumberSet.has(lowerSerial)) {
        return true;
      }
      serialNumberSet.add(lowerSerial);
      return false;
    });

    if (duplicates.length > 0) {
      toast({
        title: "Error",
        description: `Duplicate serial numbers found: ${duplicates.map(d => d.serialNumber).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    onSave(validSerials);
  };

  const handleCancel = () => {
    setSerialNumbers([]);
    setNewSerialNumber('');
    setNewNotes('');
    setBulkInput('');
    setShowBulkInput(false);
    onClose();
  };

  const validSerialCount = serialNumbers.filter(sn => sn.serialNumber.trim()).length;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600" />
            <span>Serial Numbers for {itemName}</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              {validSerialCount} / {requiredQuantity}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            <strong>Quantity Restriction:</strong> You must enter exactly {requiredQuantity} serial numbers (matching the delivered quantity). Current: {validSerialCount}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border">
            <Button
              onClick={() => setShowBulkInput(!showBulkInput)}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
              disabled={validSerialCount >= requiredQuantity}
            >
              <Plus className="h-4 w-4 mr-2" />
              Bulk Add
              {validSerialCount >= requiredQuantity && <span className="ml-1 text-xs">(Limit Reached)</span>}
            </Button>
            
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-300 hover:bg-green-50"
              disabled={validSerialCount === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
              disabled={validSerialCount >= requiredQuantity}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
              {validSerialCount >= requiredQuantity && <span className="ml-1 text-xs">(Limit Reached)</span>}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={importFromCSV}
              style={{ display: 'none' }}
            />

            <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
              <FileSpreadsheet className="h-4 w-4" />
              <span>CSV format: Serial Number, Notes</span>
            </div>
          </div>

          {/* Add Single Serial Number */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-medium text-green-800">Add Single Serial Number</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="new-serial" className="text-sm font-medium">
                    Serial Number *
                  </Label>
                  <Input
                    id="new-serial"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value)}
                    placeholder="Enter serial number..."
                    className="mt-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addSerialNumber();
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="new-notes" className="text-sm font-medium">
                    Notes (Optional)
                  </Label>
                  <Input
                    id="new-notes"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Additional notes..."
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={addSerialNumber}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!newSerialNumber.trim() || validSerialCount >= requiredQuantity}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                    {validSerialCount >= requiredQuantity && <span className="ml-1 text-xs">(Limit Reached)</span>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Input */}
          {showBulkInput && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <h3 className="text-sm font-medium text-blue-800">Bulk Add Serial Numbers</h3>
                <p className="text-xs text-blue-600">Enter one serial number per line</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Enter serial numbers (one per line)&#10;SN001&#10;SN002&#10;SN003"
                  className="min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={addBulkSerialNumbers}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!bulkInput.trim() || validSerialCount >= requiredQuantity}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add All ({bulkInput.split('\n').filter(line => line.trim()).length})
                    {validSerialCount >= requiredQuantity && <span className="ml-1 text-xs">(Limit Reached)</span>}
                  </Button>
                  <Button
                    onClick={() => {
                      setBulkInput('');
                      setShowBulkInput(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Serial Numbers Table */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Serial Numbers List</h3>
                <Badge variant="outline" className="bg-gray-100">
                  {validSerialCount} entries
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full overflow-hidden">
              {serialNumbers.length > 0 ? (
                <div className="h-full overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serialNumbers.map((serial, index) => (
                        <TableRow key={serial.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-500">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={serial.serialNumber}
                              onChange={(e) => updateSerialNumber(serial.id, 'serialNumber', e.target.value)}
                              placeholder="Enter serial number..."
                              className="border-0 bg-transparent focus:bg-white focus:border-blue-300"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={serial.notes || ''}
                              onChange={(e) => updateSerialNumber(serial.id, 'notes', e.target.value)}
                              placeholder="Notes..."
                              className="border-0 bg-transparent focus:bg-white focus:border-blue-300"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => removeSerialNumber(serial.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  <div className="text-center">
                    <Hash className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">No Serial Numbers</p>
                    <p className="text-sm">Add serial numbers using the forms above</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t bg-gray-50">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-gray-600">
              Status: {validSerialCount < requiredQuantity ? (
                <span className="text-orange-600 font-medium">
                  {requiredQuantity - validSerialCount} more needed
                </span>
              ) : validSerialCount > requiredQuantity ? (
                <span className="text-blue-600 font-medium">
                  {validSerialCount - requiredQuantity} extra entries
                </span>
              ) : (
                <span className="text-green-600 font-medium">Complete</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className={validSerialCount === requiredQuantity 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-blue-600 hover:bg-blue-700"
                }
                disabled={validSerialCount !== requiredQuantity}
              >
                <Save className="h-4 w-4 mr-2" />
                {validSerialCount === requiredQuantity 
                  ? `Save ${validSerialCount} Serial Numbers` 
                  : `Must Enter ${requiredQuantity} Serial Numbers (${validSerialCount}/${requiredQuantity})`
                }
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};export default SerialNumberEntryDialog;
