import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Save, Plus } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

interface ItemMaster {
  id: string;
  item_code: string;
  item_name: string;
}

interface VendorProposal {
  id: string;
  annual_tender_id: string;
  vendor_id: string;
  item_master_id: string;
  proposed_unit_price: number;
  vendor_name: string;
  item_name: string;
  item_code: string;
}

export const VendorProposalsGrid: React.FC = () => {
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [proposals, setProposals] = useState<VendorProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  // New proposal form
  const [newProposal, setNewProposal] = useState({
    vendor_id: '',
    item_master_id: '',
    proposed_unit_price: ''
  });

  useEffect(() => {
    loadTenders();
    loadVendors();
    loadItems();
  }, []);

  useEffect(() => {
    if (selectedTender && selectedVendor) {
      loadProposals();
    }
  }, [selectedTender, selectedVendor]);

  const loadTenders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/annual-tenders');
      const data = await response.json();
      setTenders(data);
      if (data.length > 0) {
        setSelectedTender(data[0]);
      }
    } catch (error) {
      console.error('Error loading tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadItems = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/item-masters');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadProposals = async () => {
    if (!selectedTender) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/vendor-proposals?vendorId=${selectedVendor}`
      );
      if (response.ok) {
        const data = await response.json();
        setProposals(data);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const handleAddProposal = async () => {
    if (!newProposal.vendor_id || !newProposal.item_master_id || !newProposal.proposed_unit_price) {
      alert('All fields are required');
      return;
    }

    if (!selectedTender) return;

    try {
      const response = await fetch('http://localhost:3001/api/vendor-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annual_tender_id: selectedTender.id,
          vendor_id: newProposal.vendor_id,
          item_master_id: newProposal.item_master_id,
          proposed_unit_price: parseFloat(newProposal.proposed_unit_price)
        })
      });

      if (response.ok) {
        alert('✅ Proposal added successfully!');
        setNewProposal({ vendor_id: '', item_master_id: '', proposed_unit_price: '' });
        setShowAddDialog(false);
        loadProposals();
      } else {
        alert('❌ Failed to add proposal');
      }
    } catch (error) {
      console.error('Error adding proposal:', error);
      alert('Failed to add proposal');
    }
  };

  const handleSavePrice = async (proposal: VendorProposal, newPrice: number) => {
    try {
      const response = await fetch('http://localhost:3001/api/vendor-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annual_tender_id: proposal.annual_tender_id,
          vendor_id: proposal.vendor_id,
          item_master_id: proposal.item_master_id,
          proposed_unit_price: newPrice
        })
      });

      if (response.ok) {
        alert('✅ Price updated!');
        setEditing(prev => {
          const updated = { ...prev };
          delete updated[proposal.id];
          return updated;
        });
        loadProposals();
      } else {
        alert('❌ Failed to update price');
      }
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const getTenderVendors = () => {
    if (!selectedTender) return [];
    return vendors; // In real implementation, filter by tender's assigned vendors
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Proposals</h1>
        <p className="text-gray-600">Manage item pricing for vendors in annual tenders</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Annual Tender</label>
              <Select
                value={selectedTender?.id || ''}
                onValueChange={(id) => {
                  const tender = tenders.find(t => t.id === id);
                  setSelectedTender(tender || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tender" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map(tender => (
                    <SelectItem key={tender.id} value={tender.id}>
                      {tender.title} ({tender.tender_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vendor</label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {getTenderVendors().map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Proposal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Proposal</DialogTitle>
                    <DialogDescription>
                      Add item pricing for vendor in this tender
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Vendor</label>
                      <Select value={newProposal.vendor_id} onValueChange={(val) => setNewProposal({ ...newProposal, vendor_id: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTenderVendors().map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Item</label>
                      <Select value={newProposal.item_master_id} onValueChange={(val) => setNewProposal({ ...newProposal, item_master_id: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Unit Price</label>
                      <Input
                        type="number"
                        value={newProposal.proposed_unit_price}
                        onChange={(e) => setNewProposal({ ...newProposal, proposed_unit_price: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <Button onClick={handleAddProposal} className="w-full">
                      Add Proposal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      {loading ? (
        <div className="text-center py-8">Loading proposals...</div>
      ) : selectedVendor && proposals.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Item Code</th>
                    <th className="text-left py-3 px-4 font-semibold">Item Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Proposed Price</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(proposal => (
                    <tr key={proposal.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{proposal.item_code}</td>
                      <td className="py-3 px-4 text-sm">{proposal.item_name}</td>
                      <td className="py-3 px-4 text-sm">
                        {editing[proposal.id] !== undefined ? (
                          <Input
                            type="number"
                            value={editing[proposal.id]}
                            onChange={(e) => setEditing({
                              ...editing,
                              [proposal.id]: parseFloat(e.target.value)
                            })}
                            className="w-32"
                          />
                        ) : (
                          <span className="font-medium">
                            PKR {proposal.proposed_unit_price.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {editing[proposal.id] !== undefined ? (
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(proposal, editing[proposal.id])}
                            className="flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing({
                              ...editing,
                              [proposal.id]: proposal.proposed_unit_price
                            })}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : selectedVendor ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No proposals for selected vendor</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Select a vendor to view proposals</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorProposalsGrid;
