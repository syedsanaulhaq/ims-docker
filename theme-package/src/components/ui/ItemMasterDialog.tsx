import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ItemMasterForm from '@/components/itemmaster/ItemMasterForm';
import { CreateItemMasterRequest } from '@/types/tender';

interface ItemMasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemCreated?: (item: any) => void;
}

const ItemMasterDialog: React.FC<ItemMasterDialogProps> = ({ open, onOpenChange, onItemCreated }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: CreateItemMasterRequest) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call or mutation
      if (onItemCreated) onItemCreated(values);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item Master</DialogTitle>
        </DialogHeader>
        <ItemMasterForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ItemMasterDialog;
