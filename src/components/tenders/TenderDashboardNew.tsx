import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, FileCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "http://localhost:3001";

interface Tender {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  status: string;
  tender_status: string;
  tender_spot_type: string;
  procurement_method: string;
  publication_date: string;
  submission_date: string;
  opening_date: string;
  is_finalized: boolean;
  finalized_at: string;
  finalized_by: string;
  created_at: string;
  vendor_name?: string;
}

const TenderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch tenders");
      }
      
      const data = await response.json();
      setTenders(data);
    } catch (error) {
      console.error("Error fetching tenders:", error);
      toast({
        title: "Error",
        description: "Failed to load tenders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tender?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tender");
      }

      toast({
        title: "Success",
        description: "Tender deleted successfully",
      });

      fetchTenders();
    } catch (error) {
      console.error("Error deleting tender:", error);
      toast({
        title: "Error",
        description: "Failed to delete tender",
        variant: "destructive",
      });
    }
  };

  const handleFinalize = async (id: string) => {
    if (!confirm("Are you sure you want to finalize this tender? This action cannot be undone.")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}/finalize`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ finalized_by: "System User" }),
      });

      if (!response.ok) {
        throw new Error("Failed to finalize tender");
      }

      toast({
        title: "Success",
        description: "Tender finalized successfully",
      });

      fetchTenders();
    } catch (error) {
      console.error("Error finalizing tender:", error);
      toast({
        title: "Error",
        description: "Failed to finalize tender",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "draft": return "secondary";
      case "published": return "default";
      case "finalized": return "destructive";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tender Management</h1>
          <p className="text-muted-foreground">
            Manage contract tenders and procurement processes
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/tenders/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Tender
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenders.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenders.filter(t => t.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenders.filter(t => t.status === "published").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalized Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenders.filter(t => t.is_finalized).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Publication Date</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell className="font-medium">
                    {tender.reference_number || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tender.title}</div>
                      {tender.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {tender.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tender.tender_spot_type || tender.procurement_method || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(tender.estimated_value)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={getStatusVariant(tender.status)}>
                        {tender.status || "Draft"}
                      </Badge>
                      {tender.is_finalized && (
                        <Badge variant="destructive" className="ml-1">
                          Finalized
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(tender.publication_date)}</TableCell>
                  <TableCell>{formatDate(tender.submission_date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/tenders/${tender.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {!tender.is_finalized && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/tenders/${tender.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFinalize(tender.id)}
                          >
                            <FileCheck className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tender.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {tenders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tenders found</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate("/dashboard/tenders/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tender
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenderDashboard;
