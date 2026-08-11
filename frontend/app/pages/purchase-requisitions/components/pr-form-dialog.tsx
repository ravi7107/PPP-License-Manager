import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Company } from '@/lib/api/companies.api';
import { Vendor } from '@/lib/api/vendors.api';
import {
  PurchaseRequisition,
  SavePurchaseRequisitionRequest,
} from '@/lib/api/purchase-requisitions.api';

const lineItemSchema = z.object({
  itemDescription: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  quantity: z.coerce
    .number()
    .positive('Quantity must be greater than zero'),
  unitOfMeasure: z.string().optional(),
  unitPrice: z.coerce
    .number()
    .min(0, 'Unit price cannot be negative'),
  notes: z.string().optional(),
});

const prFormSchema = z.object({
  companyId: z.string().min(1, 'Entity is required'),
  // Optional - "" means no vendor selected yet.
  vendorId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  justification: z.string().optional(),
  currency: z.string().min(1).max(3).default('INR'),
  // Default to the standard 9% each (18% combined GST) - changeable.
  cgstPercent: z.coerce.number().min(0).max(100).default(9),
  sgstPercent: z.coerce.number().min(0).max(100).default(9),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

export type PrFormValues = z.infer<typeof prFormSchema>;

const EMPTY_LINE_ITEM: PrFormValues['lineItems'][number] = {
  itemDescription: '',
  category: '',
  quantity: 1,
  unitOfMeasure: '',
  unitPrice: 0,
  notes: '',
};

const EMPTY_FORM: PrFormValues = {
  companyId: '',
  vendorId: '',
  title: '',
  justification: '',
  currency: 'INR',
  cgstPercent: 9,
  sgstPercent: 9,
  lineItems: [EMPTY_LINE_ITEM],
};

function toFormValues(pr: PurchaseRequisition | null): PrFormValues {
  if (!pr) {
    return EMPTY_FORM;
  }

  return {
    companyId: String(pr.companyId),
    vendorId: pr.vendorId ? String(pr.vendorId) : '',
    title: pr.title,
    justification: pr.justification ?? '',
    currency: pr.currency || 'INR',
    cgstPercent: pr.cgstPercent,
    sgstPercent: pr.sgstPercent,
    lineItems: pr.lineItems.length
      ? pr.lineItems.map((li) => ({
          itemDescription: li.itemDescription,
          category: li.category ?? '',
          quantity: li.quantity,
          unitOfMeasure: li.unitOfMeasure ?? '',
          unitPrice: li.unitPrice,
          notes: li.notes ?? '',
        }))
      : [EMPTY_LINE_ITEM],
  };
}

interface PrFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequisition: PurchaseRequisition | null;
  entities: Company[];
  vendors: Vendor[];
  saving: boolean;
  error?: string | null;
  onSubmit: (values: SavePurchaseRequisitionRequest) => Promise<void>;
}

export function PrFormDialog({
  open,
  onOpenChange,
  purchaseRequisition,
  entities,
  vendors,
  saving,
  error,
  onSubmit,
}: PrFormDialogProps) {
  const form = useForm<PrFormValues>({
    resolver: zodResolver(prFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(purchaseRequisition));
    }
  }, [open, purchaseRequisition, form]);

  const isEditing = Boolean(purchaseRequisition);

  const watchedLineItems = form.watch('lineItems');
  const watchedCgstPercent = form.watch('cgstPercent');
  const watchedSgstPercent = form.watch('sgstPercent');

  const subtotal = useMemo(() => {
    return (watchedLineItems ?? []).reduce((sum, li) => {
      const qty = Number(li.quantity) || 0;
      const price = Number(li.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [watchedLineItems]);

  const cgstAmount = (subtotal * (Number(watchedCgstPercent) || 0)) / 100;
  const sgstAmount = (subtotal * (Number(watchedSgstPercent) || 0)) / 100;
  const tax = cgstAmount + sgstAmount;
  const total = subtotal + tax;

  const handleSubmit = async (values: PrFormValues) => {
    const request: SavePurchaseRequisitionRequest = {
      companyId: Number(values.companyId),
      vendorId: values.vendorId ? Number(values.vendorId) : null,
      title: values.title,
      justification: values.justification || null,
      currency: values.currency || 'INR',
      cgstPercent: values.cgstPercent ?? 9,
      sgstPercent: values.sgstPercent ?? 9,
      lineItems: values.lineItems.map((li) => ({
        itemDescription: li.itemDescription,
        category: li.category || null,
        quantity: Number(li.quantity),
        unitOfMeasure: li.unitOfMeasure || null,
        unitPrice: Number(li.unitPrice),
        notes: li.notes || null,
      })),
    };

    await onSubmit(request);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Purchase Requisition' : 'New Purchase Requisition'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this draft. Only Draft requisitions can be edited.'
              : 'Fill in the details below, then save as a draft. You can add attachments and submit for approval afterward.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="New laptops for engineering"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity *</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entities.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground">
                            No entities available
                          </div>
                        ) : (
                          entities
                            .filter((e) => e.isActive)
                            .map((e) => (
                              <SelectItem key={e.id} value={String(e.id)}>
                                {e.name}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (optional)</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? '' : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No vendor selected" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No vendor selected</SelectItem>
                        {vendors
                          .filter((v) => v.isActive)
                          .map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vendorName} ({v.vendorCode})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Why is this purchase needed?"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* LINE ITEMS */}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(EMPTY_LINE_ITEM)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.itemDescription`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Description *
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Item description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Category</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Hardware"
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Qty *</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitOfMeasure`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Unit</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Nos"
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Unit Price *
                              </FormLabel>
                              <FormControl>
                                <Input type="number" step="any" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-end justify-end md:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Notes</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Optional notes"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {form.formState.errors.lineItems?.message ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {form.formState.errors.lineItems.message}
                </p>
              ) : null}
            </div>

            {/* TOTALS */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="INR"
                        maxLength={3}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cgstPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CGST %</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sgstPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SGST %</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-end rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (CGST + SGST)</span>
                  <span>{tax.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{total.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recalculated server-side on save.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Draft'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
