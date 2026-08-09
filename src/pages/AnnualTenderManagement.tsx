import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Eye, MoreVertical } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  total_budget: number;
  created_at: string;
  groups?: any[];
}

interface ItemGroup {
  id: string;
  group_code: string;
  group_name: string;
  description: string;
}

export const AnnualTenderManagement: React.FC = () => {
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tender_number: '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    total_budget: '',
    remarks: '',
    groupIds: [] as string[]
  });

  // Load data
  useEffect(() => {
    loadTenders();
    loadItemGroups();
  }, []);

  const loadTenders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/annual-tenders');
      const data = await response.json();
      setTenders(data);
    } catch (error) {
      console.error('Error loading tenders:', error);
      alert('Failed to load annual tenders');
    } finally {
      setLoading(false);
    }
  };

  const loadItemGroups = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/item-groups');
      const data = await response.json();
      setItemGroups(data);
    } catch (error) {
      console.error('Error loading item groups:', error);
    }
  };

  const handleCreateTender = async () => {
    if (!formData.tender_number || !formData.title) {
      alert('Tender number and title are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/annual-tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
          created_by: 'Current User' // TODO: Get from session
        })
      });

      if (response.ok) {
        alert('✅ Annual tender created successfully!');
        loadTenders();
        setShowCreateDialog(false);
        resetForm();
      } else {
        alert('❌ Failed to create tender');
      }
    } catch (error) {
      console.error('Error creating tender:', error);
      alert('Failed to create tender');
    }
  };

  const handleViewTender = async (tender: AnnualTender) => {
    try {
      const response = await fetch(`http://localhost:3001/api/annual-tenders/${tender.id}`);
      const data = await response.json();
      setSelectedTender(data);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error loading tender details:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      tender_number: '',
      title: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      total_budget: '',
      remarks: '',
      groupIds: []
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'Expired': 'bg-red-100 text-red-800',
      'Draft': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Annual Tenders</h1>
          <p className="text-gray-600">Manage framework agreements with vendors</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Annual Tender
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Annual Tender</DialogTitle>
              <DialogDescription>
                Create a new framework agreement for vendor management
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Tender Number *</Label>
                <Input
                  value={formData.tender_number}
                  onChange={(e) => setFormData({ ...formData, tender_number: e.target.value })}
                  placeholder="e.g., AT-2024-001"
                />
              </div>

              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual Tender 2024-2025"
                />
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Total Budget</Label>
                <Input
                  type="number"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Item Groups</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {itemGroups.map(group => (
                    <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.groupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, groupIds: [...formData.groupIds, group.id] });
                          } else {
                            setFormData({ ...formData, groupIds: formData.groupIds.filter(id => id !== group.id) });
                          }
                        }}
                      />
                      <span className="text-sm">{group.group_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tender description..."
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateTender} className="w-full">
                Create Tender
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tenders List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading annual tenders...</div>
        ) : tenders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">No annual tenders created yet</p>
            </CardContent>
          </Card>
        ) : (
          tenders.map(tender => (
            <Card key={tender.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{tender.title}</h3>
                      <Badge className={getStatusColor(tender.status)}>
                        {tender.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Tender #:</strong> {tender.tender_number}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Period:</strong> {new Date(tender.start_date).toLocaleDateString()} - {new Date(tender.end_date).toLocaleDateString()}
                    </p>
                    {tender.total_budget && (
                      <p className="text-sm text-gray-600">
                        <strong>Budget:</strong> PKR {tender.total_budget.toLocaleString()}
                      </p>
                    )}
                    {tender.description && (
                      <p className="text-sm text-gray-700 mt-2">{tender.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewTender(tender)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Tender Details Dialog */}
      {selectedTender && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTender.title}</DialogTitle>
              <DialogDescription>
                Tender #{selectedTender.tender_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Start Date:</strong>
                  <p>{new Date(selectedTender.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <strong>End Date:</strong>
                  <p>{new Date(selectedTender.end_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <strong>Status:</strong>
                  <Badge className={getStatusColor(selectedTender.status)}>
                    {selectedTender.status}
                  </Badge>
                </div>
                {selectedTender.total_budget && (
                  <div>
                    <strong>Total Budget:</strong>
                    <p>PKR {selectedTender.total_budget.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedTender.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="text-sm">{selectedTender.description}</p>
                </div>
              )}

              {selectedTender.groups && selectedTender.groups.length > 0 && (
                <div>
                  <strong>Item Groups:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTender.groups.map(group => (
                      <Badge key={group.group_id} variant="outline">
                        {group.group_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button className="flex items-center gap-2">
                  Manage Vendors & Proposals
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AnnualTenderManagement;
