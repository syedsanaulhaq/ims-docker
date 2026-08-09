import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Plus, Trash2, Save, Send } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { HierarchicalUserSelector } from '@/components/stock/HierarchicalUserSelector';
import stockIssuanceService, { StockIssuanceRequest } from '@/services/stockIssuanceService';
import { approvalForwardingService } from '@/services/approvalForwardingService';
import { useToast } from '@/hooks/use-toast';

// Form schema
const stockIssuanceFormSchema = z.object({
  request_type: z.enum(['Individual', 'Organizational']),
  requester_office_id: z.number().min(1, 'Office is required'),
  requester_wing_id: z.number().min(1, 'Wing is required'),
  requester_branch_id: z.number().min(1, 'Branch is required'),
  requester_user_id: z.string().min(1, 'User is required'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  urgency_level: z.enum(['Low', 'Normal', 'High', 'Critical']),
  justification: z.string().optional(),
  expected_return_date: z.date().optional(),
  is_returnable: z.boolean(),
  items: z.array(z.object({
    nomenclature: z.string().min(1, 'Item name is required'),
    requested_quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0, 'Unit price must be non-negative').optional(),
  })).min(1, 'At least one item is required'),
});

type StockIssuanceFormData = z.infer<typeof stockIssuanceFormSchema>;

interface StockIssuanceRequestFormProps {
  onSuccess?: (request: any) => void;
  onCancel?: () => void;
  initialData?: Partial<StockIssuanceFormData>;
}

export function StockIssuanceRequestForm({
  onSuccess,
  onCancel,
  initialData
}: StockIssuanceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const { toast } = useToast();

  const form = useForm<StockIssuanceFormData>({
    resolver: zodResolver(stockIssuanceFormSchema),
    defaultValues: {
      request_type: 'Individual',
      urgency_level: 'Normal',
      is_returnable: false,
      items: [{ nomenclature: '', requested_quantity: 1, unit_price: 0 }],
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = async (data: StockIssuanceFormData) => {
    setIsSubmitting(true);
    try {
      const requestData: StockIssuanceRequest = {
        request_type: data.request_type,
        requester_office_id: data.requester_office_id,
        requester_wing_id: data.requester_wing_id,
        requester_branch_id: data.requester_branch_id.toString(),
        requester_user_id: data.requester_user_id,
        purpose: data.purpose,
        urgency_level: data.urgency_level,
        justification: data.justification,
        expected_return_date: data.expected_return_date?.toISOString().split('T')[0],
        is_returnable: data.is_returnable,
        items: data.items.map(item => ({
          nomenclature: item.nomenclature || '',
          requested_quantity: item.requested_quantity || 1,
          unit_price: item.unit_price || 0,
          item_type: 'inventory' as const, // Default to inventory type
          item_master_id: undefined,
          custom_item_name: undefined
        })),
      };

      const { data: result, error } = await stockIssuanceService.createRequest(requestData);
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create stock issuance request. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // NOW submit the items separately
      try {
        const itemsResult = await stockIssuanceService.submitItems(
          result.id.toString(),
          data.items.map(item => ({
            nomenclature: item.nomenclature || '',
            requested_quantity: item.requested_quantity || 1,
            unit_price: item.unit_price || 0,
            item_type: 'inventory' as const,
            item_master_id: undefined,
            custom_item_name: undefined
          }))
        );
        } catch (itemsError) {
        console.error('Error submitting items:', itemsError);
        toast({
          title: 'Error',
          description: 'Request created but failed to add items. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Auto-submit for approval using Stock Issuance workflow
      try {
        await approvalForwardingService.submitForApproval(
          result.id.toString(),
          'stock_issuance',
          'D806EC95-FB78-4187-8FC2-87B897C124A4' // Stock Issuance Approval workflow
        );

        toast({
          title: 'Success',
          description: `Stock issuance request ${result.request_number} created and submitted for approval!`,
        });
      } catch (approvalError) {
        console.error('Error submitting for approval:', approvalError);
        toast({
          title: 'Partial Success',
          description: `Stock issuance request ${result.request_number} created but could not submit for approval. Please submit manually.`,
          variant: 'destructive',
        });
      }

      onSuccess?.(result);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    append({ nomenclature: '', requested_quantity: 1, unit_price: 0 });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const watchedItems = form.watch('items');
  const totalEstimatedValue = watchedItems.reduce(
    (sum, item) => sum + (item.requested_quantity * (item.unit_price || 0)),
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Issuance Request Form</CardTitle>
          <CardDescription>
            Create a new stock issuance request through organizational hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Request Type & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="request_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select request type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Individual">Individual Request</SelectItem>
                          <SelectItem value="Organizational">Organizational Request</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Low">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Low</Badge>
                              <span>Non-urgent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Normal">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Normal</Badge>
                              <span>Standard priority</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="High">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">High</Badge>
                              <span>High priority</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Critical">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">Critical</Badge>
                              <span>Urgent/Emergency</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hierarchical User Selection */}
              <HierarchicalUserSelector
                control={form.control}
                officeFieldName="requester_office_id"
                wingFieldName="requester_wing_id"
                branchFieldName="requester_branch_id"
                userFieldName="requester_user_id"
                title="Requester Information"
                description="Select the user making this request through organizational hierarchy"
              />

              <Separator />

              {/* Request Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Request Details</h3>
                
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this stock issuance request..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justification (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide additional justification if needed..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_returnable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Returnable Items</FormLabel>
                          <FormDescription>
                            Check if items need to be returned after use
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('is_returnable') && (
                    <FormField
                      control={form.control}
                      name="expected_return_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expected Return Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Requested Items</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Total Estimated Value: ${totalEstimatedValue.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <FormField
                          control={form.control}
                          name={`items.${index}.nomenclature`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Item Name/Nomenclature</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter item name or nomenclature" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.requested_quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Qty"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price (Optional)</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
                
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
