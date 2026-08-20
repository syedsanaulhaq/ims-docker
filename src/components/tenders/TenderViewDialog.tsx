import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, FileText } from 'lucide-react';
import { Tender } from '@/types/tender';
import { useNavigate } from 'react-router-dom';

interface TenderViewDialogProps {
  tender: Tender | null;
  open: boolean;
  onClose: () => void;
}

const TenderViewDialog: React.FC<TenderViewDialogProps> = ({ tender, open, onClose }) => {
  const navigate = useNavigate();
  
  if (!tender) return null;

  const handleViewReport = () => {
    if (tender.id) {
      // Close the dialog first
      onClose();
      // Navigate to the tender report
      navigate(`/dashboard/tenders/${tender.id}/report`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Tender Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="font-semibold text-lg">{tender.title}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Reference Number</div>
              <div className="font-semibold">{tender.referenceNumber}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Type</div>
              <div>{tender.type}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div>{tender.tender_status || tender.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estimated Value</div>
              <div>Rs. {tender.estimatedValue?.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Publish Date</div>
              <div>{tender.publishDate}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Submission Deadline</div>
              <div>{tender.submissionDeadline}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Opening Date</div>
              <div>{tender.openingDate}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="whitespace-pre-line">{tender.description || '-'}</div>
            </div>
          </div>

          {/* Tender Items Table */}
          <div>
            <div className="font-semibold mb-2">Tender Items</div>
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Nomenclature</th>
                    {tender.type !== 'annual-tender' && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Quantity</th>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Unit Price</th>
                    {tender.type !== 'annual-tender' && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Total</th>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {tender.items && tender.items.length > 0 ? (
                    tender.items.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2 text-sm">{item.nomenclature}</td>
                        {tender.type !== 'annual-tender' && (
                          <td className="px-3 py-2 text-sm">{item.quantity}</td>
                        )}
                        <td className="px-3 py-2 text-sm">Rs. {item.estimatedUnitPrice?.toLocaleString()}</td>
                        {tender.type !== 'annual-tender' && (
                          <td className="px-3 py-2 text-sm">Rs. {(item.quantity * item.estimatedUnitPrice)?.toLocaleString()}</td>
                        )}
                        <td className="px-3 py-2 text-xs">{item.remarks || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={tender.type === 'annual-tender' ? 4 : 6} className="text-center text-xs py-4">No items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Links */}
          <div>
            <div className="font-semibold mb-2">Uploaded Documents</div>
            <ul className="space-y-1">
              {tender.rfp_file_path && (
                <li><a href={`/uploads/${tender.rfp_file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">RFP Document</a></li>
              )}
              {tender.contract_file_path && (
                <li><a href={`/uploads/${tender.contract_file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Contract Document</a></li>
              )}
              {tender.loi_file_path && (
                <li><a href={`/uploads/${tender.loi_file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Letter of Intent (LoI)</a></li>
              )}
              {tender.po_file_path && (
                <li><a href={`https://euhthwosspivtzmqifsy.supabase.co/storage/v1/object/public/${tender.po_file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Purchase/Supply Order</a></li>
              )}
              {tender.noting_file_path && (
                <li><a href={`/uploads/${tender.noting_file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Noting</a></li>
              )}
              {!(tender.rfp_file_path || tender.contract_file_path || tender.loi_file_path || tender.po_file_path || tender.noting_file_path) && (
                <li className="text-xs text-muted-foreground">No documents uploaded</li>
              )}
            </ul>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          <Button 
            onClick={handleViewReport}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Tender Report
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenderViewDialog;

