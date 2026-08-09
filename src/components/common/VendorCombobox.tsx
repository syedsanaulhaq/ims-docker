import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useVendors } from '@/hooks/useVendors';

interface VendorComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const VendorCombobox: React.FC<VendorComboboxProps> = ({
  value,
  onValueChange,
  placeholder = "Select vendor...",
  className,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const { vendors, loading: isLoading } = useVendors();

  const selectedVendor = vendors?.find(vendor => vendor.id === value);

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            "Loading vendors..."
          ) : selectedVendor ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedVendor.vendor_code}</span>
              <span className="text-muted-foreground">-</span>
              <span>{selectedVendor.vendor_name}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search vendors..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center text-sm text-muted-foreground">
                No vendors found.
              </div>
            </CommandEmpty>
            <CommandGroup>
              {vendors?.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={vendor.id}
                  onSelect={() => handleSelect(vendor.id)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === vendor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium text-blue-600">{vendor.vendor_code}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{vendor.vendor_name}</span>
                  </div>
                  {vendor.status && (
                    <div className="ml-auto">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                        vendor.status === 'Active' ? "bg-green-100 text-green-800" :
                        vendor.status === 'Inactive' ? "bg-gray-100 text-gray-800" :
                        "bg-yellow-100 text-yellow-800"
                      )}>
                        {vendor.status}
                      </span>
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default VendorCombobox;
