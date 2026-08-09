import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useInventoryData from "@/hooks/useInventoryData";
import { useOffices } from "@/hooks/useOffices";

interface StockIssuanceItem {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  itemType: 'Deadlock Items' | 'Consumable Items';
  quantityIssued: number;
  unitPrice: number;
  condition: 'Good' | 'Damaged' | 'Repairable';
  description: string;
  fileNo: string;
  pageNo: string;
}

interface StockIssuance {
  id: number;
  issuanceNo: string;
  wingBranchName: string;
  officerDesignation: string;
  issuanceDate: string;
  totalValue: number;
  status: 'Pending' | 'Issued' | 'Returned';
  createdBy: string;
  description: string;
  items: StockIssuanceItem[];
}

interface IssuanceItemForm {
  itemId: string;
  quantityIssued: string;
  condition: 'Good' | 'Damaged' | 'Repairable';
  fileNo: string;
  pageNo: string;
}

const StockIssuances = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { inventoryItems } = useInventoryData();
  const { offices, getParentOfficeName } = useOffices();
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<StockIssuance | null>(null);

  const [issuances, setIssuances] = useState<StockIssuance[]>([
    {
      id: 1,
      issuanceNo: "ISS-2024-001",
      wingBranchName: "IT Department",
      officerDesignation: "IT Manager",
      issuanceDate: "2024-01-20",
      totalValue: 85000,
      status: "Issued",
      createdBy: "Admin User",
      description: "Issuance of laptops for new employees",
      items: [
        {
          id: 1,
          itemId: 101,
          itemName: "Laptop Dell Inspiron 15",
          itemCode: "ITM-001",
          itemType: "Deadlock Items",
          quantityIssued: 2,
          unitPrice: 42500,
          condition: "Good",
          description: "Standard laptops for office use",
          fileNo: "FILE-2024-005",
          pageNo: "P012"
        }
      ]
    },
    {
      id: 2,
      issuanceNo: "ISS-2024-002",
      wingBranchName: "HR Department",
      officerDesignation: "HR Officer",
      issuanceDate: "2024-02-15",
      totalValue: 12000,
      status: "Pending",
      createdBy: "Admin User",
      description: "Supply of stationery items",
      items: [
        {
          id: 2,
          itemId: 201,
          itemName: "Printer Paper A4",
          itemCode: "ITM-002",
          itemType: "Consumable Items",
          quantityIssued: 10,
          unitPrice: 1200,
          condition: "Good",
          description: "Standard A4 paper for daily printing",
          fileNo: "FILE-2024-006",
          pageNo: "P025"
        }
      ]
    }
  ]);

  const [newIssuance, setNewIssuance] = useState({
    issuanceNo: '',
    wingBranchName: '',
    officerDesignation: '',
    issuanceDate: '',
    totalValue: 0,
    description: ''
  });

  const [issuanceItems, setIssuanceItems] = useState<IssuanceItemForm[]>([{
    itemId: '',
    quantityIssued: '',
    condition: 'Good',
    fileNo: '',
    pageNo: ''
  }]);

  // Group inventory items by type
  const groupedInventoryItems = inventoryItems.reduce((groups, item) => {
    const type = item.itemType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {} as Record<string, typeof inventoryItems>);

  // Group offices by hierarchy for display
  const getOfficeDisplayName = (office: any) => {
    if (!office.parentId) {
      return office.officeName; // Root office
    }
    const parent = getParentOfficeName(office.parentId);
    return `${parent} → ${office.officeName}`;
  };

  const handleEditIssuance = (issuance: StockIssuance) => {
    setEditingIssuance(issuance);
    setNewIssuance({
      issuanceNo: issuance.issuanceNo,
      wingBranchName: issuance.wingBranchName,
      officerDesignation: issuance.officerDesignation,
      issuanceDate: issuance.issuanceDate,
      totalValue: issuance.totalValue,
      description: issuance.description
    });
    setIssuanceItems(issuance.items.map(item => ({
      itemId: item.itemId.toString(),
      quantityIssued: item.quantityIssued.toString(),
      condition: item.condition,
      fileNo: item.fileNo,
      pageNo: item.pageNo
    })));
    setShowIssuanceForm(true);
  };

  const handleUpdateIssuance = () => {
    if (!newIssuance.wingBranchName.trim() || !newIssuance.officerDesignation.trim()) {
      toast({
        title: "Error",
        description: "Wing/Branch Name and Officer Designation are required",
        variant: "destructive"
      });
      return;
    }

    if (!editingIssuance) return;

    const updatedIssuance: StockIssuance = {
      ...editingIssuance,
      issuanceNo: newIssuance.issuanceNo || editingIssuance.issuanceNo,
      wingBranchName: newIssuance.wingBranchName,
      officerDesignation: newIssuance.officerDesignation,
      issuanceDate: newIssuance.issuanceDate,
      totalValue: newIssuance.totalValue,
      description: newIssuance.description,
      items: issuanceItems.map((item, index) => {
        const selectedItem = inventoryItems.find(inv => inv.id === item.itemId);
        return {
          id: index + 1,
          itemId: parseInt(item.itemId),
          itemName: selectedItem?.name || '',
          itemCode: selectedItem?.id || '',
          itemType: (selectedItem?.itemType as 'Deadlock Items' | 'Consumable Items') || 'Deadlock Items',
          quantityIssued: parseInt(item.quantityIssued) || 0,
          unitPrice: 0,
          condition: item.condition,
          description: newIssuance.description,
          fileNo: item.fileNo,
          pageNo: item.pageNo
        };
      })
    };

    setIssuances(issuances.map(issuance =>
      issuance.id === editingIssuance.id ? updatedIssuance : issuance
    ));

    setEditingIssuance(null);
    setNewIssuance({
      issuanceNo: '', wingBranchName: '', officerDesignation: '', issuanceDate: '',
      totalValue: 0, description: ''
    });
    setIssuanceItems([{ itemId: '', quantityIssued: '', condition: 'Good', fileNo: '', pageNo: '' }]);
    setShowIssuanceForm(false);

    toast({
      title: "Success",
      description: "Stock issuance updated successfully"
    });
  };

  const handleCancelIssuance = () => {
    setEditingIssuance(null);
    setNewIssuance({
      issuanceNo: '', wingBranchName: '', officerDesignation: '', issuanceDate: '',
      totalValue: 0, description: ''
    });
    setIssuanceItems([{ itemId: '', quantityIssued: '', condition: 'Good', fileNo: '', pageNo: '' }]);
    setShowIssuanceForm(false);
  };

  const handleCreateIssuance = () => {
    if (!newIssuance.wingBranchName.trim() || !newIssuance.officerDesignation.trim()) {
      toast({
        title: "Error",
        description: "Wing/Branch Name and Officer Designation are required",
        variant: "destructive"
      });
      return;
    }

    const issuance: StockIssuance = {
      id: Date.now(),
      issuanceNo: newIssuance.issuanceNo || `ISS-2024-${String(Date.now()).slice(-3)}`,
      wingBranchName: newIssuance.wingBranchName,
      officerDesignation: newIssuance.officerDesignation,
      issuanceDate: newIssuance.issuanceDate || new Date().toISOString().split('T')[0],
      totalValue: newIssuance.totalValue,
      status: 'Pending',
      createdBy: 'Current User',
      description: newIssuance.description,
      items: issuanceItems.map((item, index) => {
        const selectedItem = inventoryItems.find(inv => inv.id === item.itemId);
        return {
          id: index + 1,
          itemId: parseInt(item.itemId),
          itemName: selectedItem?.name || '',
          itemCode: selectedItem?.id || '',
          itemType: (selectedItem?.itemType as 'Deadlock Items' | 'Consumable Items') || 'Deadlock Items',
          quantityIssued: parseInt(item.quantityIssued) || 0,
          unitPrice: 0,
          condition: item.condition,
          description: newIssuance.description,
          fileNo: item.fileNo,
          pageNo: item.pageNo
        };
      })
    };

    setIssuances([...issuances, issuance]);
    setNewIssuance({
      issuanceNo: '', wingBranchName: '', officerDesignation: '', issuanceDate: '',
      totalValue: 0, description: ''
    });
    setIssuanceItems([{ itemId: '', quantityIssued: '', condition: 'Good', fileNo: '', pageNo: '' }]);
    setShowIssuanceForm(false);
    
    toast({
      title: "Success",
      description: "Stock issuance created successfully"
    });
  };

  const addIssuanceItem = () => {
    setIssuanceItems([...issuanceItems, { itemId: '', quantityIssued: '', condition: 'Good', fileNo: '', pageNo: '' }]);
  };

  const removeIssuanceItem = (index: number) => {
    const newItems = [...issuanceItems];
    newItems.splice(index, 1);
    setIssuanceItems(newItems);
  };

  const updateIssuanceItem = (index: number, field: string, value: string) => {
    const newItems = issuanceItems.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setIssuanceItems(newItems);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Issuances</h1>
          <p className="text-muted-foreground mt-2">Manage stock issuances to different departments</p>
        </div>
        <Button onClick={() => navigate('/dashboard/historical-issuance')} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Historical Issuance</span>
        </Button>
      </div>

      {/* Issuance Form */}
      {showIssuanceForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingIssuance ? 'Edit Issuance' : 'Create New Issuance'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issuanceNo">Issuance No</Label>
                <Input
                  id="issuanceNo"
                  value={newIssuance.issuanceNo}
                  onChange={(e) => setNewIssuance({ ...newIssuance, issuanceNo: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label htmlFor="wingBranchName">Wing/Branch Name *</Label>
                <Select
                  value={newIssuance.wingBranchName}
                  onValueChange={(value) => setNewIssuance({ ...newIssuance, wingBranchName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Wing/Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map(office => (
                      <SelectItem key={office.id} value={office.officeName}>
                        {getOfficeDisplayName(office)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="officerDesignation">Officer Designation *</Label>
                <Input
                  id="officerDesignation"
                  value={newIssuance.officerDesignation}
                  onChange={(e) => setNewIssuance({ ...newIssuance, officerDesignation: e.target.value })}
                  placeholder="Enter officer designation"
                />
              </div>
              <div>
                <Label htmlFor="issuanceDate">Issuance Date</Label>
                <Input
                  id="issuanceDate"
                  type="date"
                  value={newIssuance.issuanceDate}
                  onChange={(e) => setNewIssuance({ ...newIssuance, issuanceDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newIssuance.description}
                  onChange={(e) => setNewIssuance({ ...newIssuance, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
            </div>

            {/* Issuance Items Table */}
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity Issued</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>File No</TableHead>
                    <TableHead>Page No</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuanceItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <select
                          value={item.itemId}
                          onChange={(e) => updateIssuanceItem(index, 'itemId', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select Item</option>
                          {Object.entries(groupedInventoryItems).map(([itemType, items]) => (
                            <optgroup key={itemType} label={itemType}>
                              {items.map(invItem => (
                                <option key={invItem.id} value={invItem.id}>
                                  {invItem.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantityIssued}
                          onChange={(e) => updateIssuanceItem(index, 'quantityIssued', e.target.value)}
                          placeholder="Enter quantity"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.condition}
                          onChange={(e) => updateIssuanceItem(index, 'condition', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="Good">Good</option>
                          <option value="Damaged">Damaged</option>
                          <option value="Repairable">Repairable</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.fileNo}
                          onChange={(e) => updateIssuanceItem(index, 'fileNo', e.target.value)}
                          placeholder="Enter file number"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.pageNo}
                          onChange={(e) => updateIssuanceItem(index, 'pageNo', e.target.value)}
                          placeholder="Enter page number"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => removeIssuanceItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addIssuanceItem}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button onClick={editingIssuance ? handleUpdateIssuance : handleCreateIssuance}>
                {editingIssuance ? 'Update Issuance' : 'Create Issuance'}
              </Button>
              <Button variant="outline" onClick={handleCancelIssuance}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issuances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Issuances</CardTitle>
          <CardDescription>All stock issuances in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issuance Details</TableHead>
                <TableHead>Items Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuances.map((issuance) => (
                <TableRow key={issuance.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{issuance.issuanceNo}</div>
                      <div className="text-sm text-muted-foreground">{issuance.wingBranchName}</div>
                      <div className="text-sm text-muted-foreground">{issuance.officerDesignation}</div>
                      <div className="text-sm text-muted-foreground">Date: {issuance.issuanceDate}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {issuance.items.map(item => (
                      <div key={item.id} className="text-sm">
                        {item.itemName} ({item.quantityIssued}) - {item.fileNo}/{item.pageNo}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      issuance.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : (issuance.status === 'Issued' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                    }`}>
                      {issuance.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditIssuance(issuance)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
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

export default StockIssuances;
