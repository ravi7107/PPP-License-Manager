import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { Textarea } from '@/components/ui/textarea';

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

import { InventoryCategory, InventoryItem } from '@/lib/api/inventory.api';
import { Company } from '@/lib/api/companies.api';
import { Department } from '@/lib/api/departments.api';
import { OfficeLocation } from '@/lib/api/office-locations.api';
import { Vendor } from '@/lib/api/vendors.api';
import { Asset } from '@/lib/api/assets.api';
import { PurchaseRequisitionAvailableLine } from '@/lib/api/purchase-requisitions.api';

const schema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  description: z.string(),
  serialNumber: z.string(),
  categoryId: z.string().min(1, 'Category is required'),
  companyId: z.string().min(1, 'Entity is required'),
  locationId: z.string(),
  departmentId: z.string(),
  assetId: z.string(),
  purchaseRequisitionLineItemId: z.string(),
  purchaseCost: z.string(),
  vendorId: z.string(),
  remarks: z.string(),
});

export type InventoryFormValues = z.infer<typeof schema>;

const EMPTY: InventoryFormValues = {
  itemName: '',
  description: '',
  serialNumber: '',
  categoryId: '',
  companyId: '',
  locationId: '',
  departmentId: '',
  assetId: '',
  purchaseRequisitionLineItemId: '',
  purchaseCost: '',
  vendorId: '',
  remarks: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  saving: boolean;
  categories: InventoryCategory[];
  companies: Company[];
  departments: Department[];
  locations: OfficeLocation[];
  vendors: Vendor[];
  assets: Asset[];
  purchaseRequisitionLines: PurchaseRequisitionAvailableLine[];
  onSubmit: (values: InventoryFormValues) => Promise<void>;
}

export function InventoryFormDialog({
  open,
  onOpenChange,
  item,
  saving,
  categories,
  companies,
  departments,
  locations,
  vendors,
  assets,
  purchaseRequisitionLines,
  onSubmit,
}: Props) {
  const isEditing = !!item;

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    if (item) {
      form.reset({
        itemName: item.itemName,
        description: item.description ?? '',
        serialNumber: item.serialNumber ?? '',
        categoryId: String(item.categoryId),
        companyId: String(item.companyId),
        locationId: item.locationId ? String(item.locationId) : '',
        departmentId: item.departmentId ? String(item.departmentId) : '',
        assetId: item.assetId ? String(item.assetId) : '',
        purchaseRequisitionLineItemId: item.purchaseRequisitionLineItemId
          ? String(item.purchaseRequisitionLineItemId)
          : '',
        purchaseCost:
          item.purchaseCost != null ? String(item.purchaseCost) : '',
        vendorId: item.vendorId ? String(item.vendorId) : '',
        remarks: item.remarks ?? '',
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, item, form]);

  const selectedCompanyId = form.watch('companyId');
  const selectedAssetId = form.watch('assetId');

  // Narrow Location/Department pickers to the chosen Entity, same
  // client-side-filter convention already used elsewhere in this app
  // (small lookup lists, no server-side cascade endpoint needed).
  const companyLocations = useMemo(
    () =>
      selectedCompanyId
        ? locations.filter((l) => String(l.companyId) === selectedCompanyId)
        : locations,
    [locations, selectedCompanyId]
  );

  const companyDepartments = useMemo(
    () =>
      selectedCompanyId
        ? departments.filter(
            (d) => String(d.companyId) === selectedCompanyId
          )
        : departments,
    [departments, selectedCompanyId]
  );

  const isAssetLinked = !!selectedAssetId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}
          </DialogTitle>

          <DialogDescription>
            A physical item tracked with its own QR label - IT, Facility,
            HR, or any other category.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Office chair, generator, laptop…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (optional)</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(v) =>
                        field.onChange(v === 'none' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {companyLocations.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.locationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Role (optional)</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(v) =>
                        field.onChange(v === 'none' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {companyDepartments.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.departmentName}
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
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Serial / model number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* LINK TO EXISTING ASSET */}
            {!isEditing && (
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Link to existing IT Asset (optional)
                </h3>
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(v) => {
                          field.onChange(v === 'none' ? '' : v);
                          if (v !== 'none') {
                            form.setValue('purchaseRequisitionLineItemId', '');
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Not linked to an Asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            Not linked to an Asset
                          </SelectItem>
                          {assets.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.assetTag} — {a.assetName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  If this item already exists as an IT Asset, link it here
                  instead of re-entering its cost/vendor/PR/PO - those are
                  read straight from the Asset.
                </p>
              </div>
            )}

            {/* LINK TO PURCHASE REQUISITION */}
            {!isEditing && !isAssetLinked && (
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Link to Purchase Requisition (optional)
                </h3>
                <FormField
                  control={form.control}
                  name="purchaseRequisitionLineItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Requisition Line</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(v) =>
                          field.onChange(v === 'none' ? '' : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Not linked to a PR" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            Not linked to a PR
                          </SelectItem>
                          {purchaseRequisitionLines.map((l) => (
                            <SelectItem
                              key={l.lineItemId}
                              value={String(l.lineItemId)}
                            >
                              {l.prNumber} — {l.itemDescription} (Qty left:{' '}
                              {l.remainingQuantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Optional. Linking to an approved PR/PO line automatically
                  carries over its PR Number, PO Number, PO Date, and PO
                  Amount.
                </p>
              </div>
            )}

            {!isAssetLinked && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchaseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Cost (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
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
                        onValueChange={(v) =>
                          field.onChange(v === 'none' ? '' : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vendorName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {saving ? 'Saving…' : 'Save Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
