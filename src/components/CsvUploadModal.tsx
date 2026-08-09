import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CsvUploadModalProps {
  open: boolean;
  onClose: () => void;
  onItemsImported: (items: any[]) => void;
  bidders: any[];
}

interface CsvError {
  row: number;
  record: any;
  error: string;
}

interface CsvResult {
  success: boolean;
  items: any[];
  errors: CsvError[];
  total: number;
  successful: number;
  failed: number;
}

export function CsvUploadModal({ open, onClose, onItemsImported, bidders }: CsvUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CsvResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file first');
      return;
    }

    if (bidders.filter(v => v.is_successful).length === 0) {
      alert('Please add vendors/bidders to the tender first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bidders', JSON.stringify(bidders.filter(v => v.is_successful)));

    try {
      const response = await fetch('http://localhost:3001/api/tender-items/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Non-JSON response:', textResponse.substring(0, 200));
        throw new Error(`Server returned ${response.status}: Not a JSON response. Check if backend server is running on port 3001.`);
      }

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        } else {
        throw new Error(data.error || 'Failed to upload CSV');
      }
    } catch (error: any) {
      console.error('❌ CSV upload error:', error);
      alert(`Failed to upload CSV: ${error.message}`);
      setResult(null);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = () => {
    if (result && result.items.length > 0) {
      onItemsImported(result.items);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    setUploading(false);
    onClose();
  };

  const downloadSampleCsv = () => {
    const csvContent = `item_code,item_name,vendor_name,unit_price,specifications,remarks
ITM-001,Dell Laptop,ABC Traders,15000,Intel i7 with 16GB RAM,Preferred brand
ITM-002,Office Chair,XYZ Suppliers,8500,Ergonomic design,Black color
,HP Desktop Computer,ABC Traders,25000,32GB RAM and 1TB SSD,For admin use`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-tender-items.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Upload className="h-6 w-6 mr-2 text-blue-600" />
            Bulk Upload Tender Items from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple items at once. You can use item codes or item names, and vendor IDs or vendor names.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format:</strong> Your CSV should have columns: <code className="bg-gray-100 px-1">item_code</code> OR <code className="bg-gray-100 px-1">item_name</code>, 
              <code className="bg-gray-100 px-1 ml-1">vendor_id</code> OR <code className="bg-gray-100 px-1">vendor_name</code>, 
              <code className="bg-gray-100 px-1">unit_price</code>, 
              <code className="bg-gray-100 px-1">specifications</code>, 
              <code className="bg-gray-100 px-1">remarks</code>
            </AlertDescription>
          </Alert>

          {/* Sample Download */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-sm font-medium text-blue-900">Need a template?</p>
              <p className="text-xs text-blue-700">Download a sample CSV file to get started</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSampleCsv}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample
            </Button>
          </div>

          {/* File Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Select CSV File</label>
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              {selectedFile && (
                <span className="text-sm text-gray-600">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading || bidders.filter(v => v.is_successful).length === 0}
              className="flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Process CSV
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Processing Results</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {result.successful} succeeded
                  </span>
                  <span className="flex items-center text-red-600">
                    <XCircle className="h-4 w-4 mr-1" />
                    {result.failed} failed
                  </span>
                </div>
              </div>

              {/* Success Summary */}
              {result.successful > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully processed {result.successful} items. Click "Import Items" to add them to your tender.
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors Table */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600">Errors Found:</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Row</th>
                          <th className="px-3 py-2 text-left font-medium">Item Code/Name</th>
                          <th className="px-3 py-2 text-left font-medium">Vendor</th>
                          <th className="px-3 py-2 text-left font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.errors.map((error, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-gray-600">{error.row}</td>
                            <td className="px-3 py-2">
                              {error.record?.item_code || error.record?.item_name || '-'}
                            </td>
                            <td className="px-3 py-2">
                              {error.record?.vendor_id || error.record?.vendor_name || '-'}
                            </td>
                            <td className="px-3 py-2 text-red-600">{error.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Successful Items Preview */}
              {result.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-green-600">Items Ready to Import:</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Item Code</th>
                          <th className="px-3 py-2 text-left font-medium">Name of Article</th>
                          <th className="px-3 py-2 text-left font-medium">Category</th>
                          <th className="px-3 py-2 text-left font-medium">Unit Price</th>
                          <th className="px-3 py-2 text-left font-medium">Specifications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-gray-600">{item.item_code}</td>
                            <td className="px-3 py-2 font-medium">{item.nomenclature}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.category_description} - {item.category_name}
                            </td>
                            <td className="px-3 py-2 text-right">{item.estimated_unit_price?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-gray-600 truncate max-w-xs">
                              {item.specifications || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Button */}
              {result.successful > 0 && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleImport}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import {result.successful} Items to Tender
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
