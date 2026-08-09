import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tender } from './types';

interface TenderSelectorProps {
  tenders: Tender[];
  selectedTender: Tender | null;
  onTenderSelect: (tender: Tender) => void;
  loading?: boolean;
}

const TenderSelector: React.FC<TenderSelectorProps> = ({
  tenders,
  selectedTender,
  onTenderSelect,
  loading = false
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Select Transaction/Tender
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select
            value={selectedTender?.id || ""}
            onValueChange={(value) => {
              const tender = tenders.find(t => t.id === value);
              if (tender) onTenderSelect(tender);
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a tender/transaction..." />
            </SelectTrigger>
            <SelectContent>
              {tenders.map((tender) => (
                <SelectItem key={tender.id} value={tender.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{tender.tender_number}</span>
                    <span className="text-sm text-gray-600">{tender.title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedTender && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900">{selectedTender.tender_number}</h3>
              <p className="text-blue-700 text-sm">{selectedTender.title}</p>
              {selectedTender.description && (
                <p className="text-blue-600 text-xs mt-1">{selectedTender.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                <span>Status: {selectedTender.status}</span>
                <span>Items: {selectedTender.items?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TenderSelector;
