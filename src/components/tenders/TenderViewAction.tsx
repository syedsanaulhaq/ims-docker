import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tender } from '@/types/tender';

interface TenderViewActionProps {
  onView: () => void;
}

const TenderViewAction: React.FC<TenderViewActionProps> = ({ onView }) => (
  <Button variant="ghost" size="icon" onClick={onView} title="View Details">
    <Eye className="h-5 w-5 text-blue-600" />
  </Button>
);

export default TenderViewAction;
