
import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ComboboxItem } from '@/hooks/useItemsCombobox';

interface ItemComboboxProps {
  items: ComboboxItem[];
  value: string;
  onValueChange: (value: string) => void;
  onAddItem: (itemName: string) => ComboboxItem;
  placeholder?: string;
  className?: string;
}

export const ItemCombobox: React.FC<ItemComboboxProps> = ({
  // DEBUG: Log what safeItems contains on each render
  // (Move log after safeItems is defined)
  items,
  value,
  onValueChange,
  onAddItem,
  placeholder = "Select or add item...",
  className
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Defensive: filter out undefined/null and ensure .name is a string
  const safeItems = Array.isArray(items) ? items.filter(item => item && typeof item.name === 'string') : [];
  // Removed debug logging for safeItems

  const selectedItem = items.find(item => item.id === value);

  const handleSelect = (itemId: string) => {
    onValueChange(itemId === value ? '' : itemId);
    setOpen(false);
    setSearchValue('');
  };

  const handleAddNewItem = () => {
    if (searchValue.trim()) {
      const newItem = onAddItem(searchValue.trim());
      onValueChange(newItem.id);
      setOpen(false);
      setSearchValue('');
    }
  };

  // (Removed duplicate safeItems definition)

  // Filtering logic: show all items if searchValue is empty, else filter by name
  const filteredItems = !searchValue
    ? safeItems
    : safeItems.filter(item =>
        item.name && item.name.toLowerCase().includes(searchValue.toLowerCase())
      );

  const exactMatch = safeItems.find(item => 
    item.name && searchValue ? item.name.toLowerCase() === searchValue.toLowerCase().trim() : false
  );

  const showAddOption = searchValue.trim() && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selectedItem ? selectedItem.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full">
        <Command>
          <CommandInput 
            placeholder="Search or type new item..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue.trim() ? (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">No items found</p>
                </div>
              ) : (
                "No items found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.name}
                  {item.isNew && (
                    <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-1 rounded">
                      Custom
                    </span>
                  )}
                </CommandItem>
              ))}
              {showAddOption && (
                <CommandItem onSelect={handleAddNewItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{searchValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
