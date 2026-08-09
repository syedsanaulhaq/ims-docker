import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import TenderWizard from './TenderWizard';
import TenderView from './TenderView';

interface Tender {
  id: string;
  code: string;
  name: string;
  date: string;
  totalVendors: number;
  totalItems: number;
  vendors?: any[];
  items?: any[];
}

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const TenderDashboard: React.FC = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  // Fetch tenders from database on load
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/api/tenders?type=annual-tender');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setTenders(data.map((t: any) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          date: t.date,
          totalVendors: t.vendor_count || 0,
          totalItems: t.item_count || 0
        })));
      } catch (error) {
        console.error('❌ Failed to fetch tenders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, []);

  // Calculate stats
  const stats = {
    totalTenders: tenders.length,
    totalVendors: tenders.reduce((sum, t) => sum + t.totalVendors, 0),
    totalItems: tenders.reduce((sum, t) => sum + t.totalItems, 0)
  };

  const handleAddNew = () => {
    setEditingId(undefined);
    setShowWizard(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowWizard(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tender?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tenders/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from UI
        setTenders(tenders.filter(t => t.id !== id));
        alert('Tender deleted successfully');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to delete tender:', error);
      alert(`Failed to delete tender: ${error}`);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      const tenderId = data.id || editingId || generateUUID();
      if (editingId) {
        // Update existing tender
        setTenders(tenders.map(t => 
          t.id === tenderId
            ? {
                ...t,
                code: data.tender.code,
                name: data.tender.name,
                date: data.tender.date,
                totalVendors: data.vendors?.length || 0,
                totalItems: data.items?.length || 0
              }
            : t
        ));
        setEditingId(undefined);
      } else {
        // Add new tender to the list
        const newTender: Tender = {
          id: tenderId,
          code: data.tender.code,
          name: data.tender.name,
          date: data.tender.date,
          totalVendors: data.vendors?.length || 0,
          totalItems: data.items?.length || 0
        };
        setTenders([...tenders, newTender]);
      }

      setShowWizard(false);
      alert('Tender saved successfully!');
    } catch (error) {
      console.error('❌ Error saving tender:', error);
      alert(`Failed to save tender: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Annual Tender Management</h1>
          <p className="text-lg text-gray-600 mt-2">Manage all annual tenders, vendors, and items</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-5 w-5" />
          Add New Tender
        </Button>
      </div>

      {/* Summary Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalTenders}</div>
            <p className="text-xs text-gray-500 mt-2">Active tenders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.totalVendors}</div>
            <p className="text-xs text-gray-500 mt-2">Across all tenders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.totalItems}</div>
            <p className="text-xs text-gray-500 mt-2">In all tenders</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Tenders</CardTitle>
          <CardDescription>List of all annual tenders with vendors and items</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              Loading tenders...
            </div>
          ) : tenders.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No tenders created yet. Click "Add New Tender" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Tender Code</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Tender Name</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Date</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700">Vendors</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700">Items</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.map((tender) => (
                    <tr key={tender.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-blue-600 font-semibold">{tender.code}</td>
                      <td className="py-3 px-4">{tender.name}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(tender.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                          {tender.totalVendors}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold">
                          {tender.totalItems}
                        </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTender(tender)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tender.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tender.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wizard Modal */}
      {showWizard && (
        <TenderWizard
          editingId={editingId}
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* View Modal */}
      {selectedTender && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
            <TenderView
              tender={selectedTender}
              onClose={() => setSelectedTender(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TenderDashboard;
