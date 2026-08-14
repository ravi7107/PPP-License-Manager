import { useEffect } from 'react';
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

import {
  MaterialMovement,
  MOVEMENT_TYPES,
} from '@/lib/api/material-movements.api';

import { Company } from '@/lib/api/companies.api';
import { OfficeLocation } from '@/lib/api/office-locations.api';
import { Department } from '@/lib/api/departments.api';
import { MaterialCostCenter } from '@/lib/api/material-cost-centers.api';
import { Vendor } from '@/lib/api/vendors.api';
import { MaterialItem } from '@/lib/api/material-items.api';
import { Asset } from '@/lib/api/assets.api';

const NONE = '__none__';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  InternalTransfer: 'Internal Transfer',
  InterEntityTransfer: 'Inter-Entity Transfer',
  OutwardToVendor: 'Outward to Vendor',
  InwardFromVendor: 'Inward from Vendor',
  TemporaryMovement: 'Temporary Movement',
  DirectInward: 'Direct Inward',
  DirectOutward: 'Direct Outward',
};

// Mirrors MaterialMovementService.ValidateAndNormalizeAsync's per-type
// rules on the backend - kept here only to drive which field groups this
// form shows/requires, not as a replacement for the backend's own
// validation.
const MOVEMENT_TYPE_CONFIG: Record<
  string,
  {
    requireFrom: boolean;
    requireTo: boolean;
    requireVendor: boolean;
    requireReturnDate: boolean;
  }
> = {
  InternalTransfer: {
    requireFrom: true,
    requireTo: true,
    requireVendor: false,
    requireReturnDate: false,
  },
  InterEntityTransfer: {
    requireFrom: true,
    requireTo: true,
    requireVendor: false,
    requireReturnDate: false,
  },
  OutwardToVendor: {
    requireFrom: true,
    requireTo: false,
    requireVendor: true,
    requireReturnDate: false,
  },
  InwardFromVendor: {
    requireFrom: false,
    requireTo: true,
    requireVendor: true,
    requireReturnDate: false,
  },
  TemporaryMovement: {
    requireFrom: true,
    requireTo: true,
    requireVendor: false,
    requireReturnDate: true,
  },
  DirectInward: {
    requireFrom: false,
    requireTo: true,
    requireVendor: false,
    requireReturnDate: false,
  },
  DirectOutward: {
    requireFrom: true,
    requireTo: false,
    requireVendor: false,
    requireReturnDate: false,
  },
};

const itemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  assetId: z.string(),
  quantity: z.coerce
    .number()
    .positive('Quantity must be greater than zero'),
  unitOfMeasure: z.string(),
  serialNumbers: z.string(),
  condition: z.string(),
  remarks: z.string(),
});

const schema = z
  .object({
    movementType: z.string().min(1, 'Movement type is required'),
    fromCompanyId: z.string(),
    fromLocationId: z.string(),
    fromDepartmentId: z.string(),
    fromCostCenterId: z.string(),
    toCompanyId: z.string(),
    toLocationId: z.string(),
    toDepartmentId: z.string(),
    toCostCenterId: z.string(),
    vendorId: z.string(),
    expectedReturnDate: z.string(),
    purpose: z.string(),
    items: z.array(itemSchema).min(1, 'Add at least one item'),
  })
  .superRefine((data, ctx) => {
    const config = MOVEMENT_TYPE_CONFIG[data.movementType];

    if (!config) {
      return;
    }

    if (config.requireFrom) {
      if (!data.fromCompanyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From entity is required',
          path: ['fromCompanyId'],
        });
      }

      if (!data.fromLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From location is required',
          path: ['fromLocationId'],
        });
      }
    }

    if (config.requireTo) {
      if (!data.toCompanyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'To entity is required',
          path: ['toCompanyId'],
        });
      }

      if (!data.toLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'To location is required',
          path: ['toLocationId'],
        });
      }
    }

    if (config.requireVendor && !data.vendorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vendor is required',
        path: ['vendorId'],
      });
    }

    if (config.requireReturnDate && !data.expectedReturnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected return date is required',
        path: ['expectedReturnDate'],
      });
    }
  });

export type MaterialMovementFormValues = z.infer<typeof schema>;

const EMPTY_ITEM: MaterialMovementFormValues['items'][number] = {
  itemId: '',
  assetId: NONE,
  quantity: 1,
  unitOfMeasure: '',
  serialNumbers: '',
  condition: '',
  remarks: '',
};

const EMPTY: MaterialMovementFormValues = {
  movementType: '',
  fromCompanyId: NONE,
  fromLocationId: NONE,
  fromDepartmentId: NONE,
  fromCostCenterId: NONE,
  toCompanyId: NONE,
  toLocationId: NONE,
  toDepartmentId: NONE,
  toCostCenterId: NONE,
  vendorId: NONE,
  expectedReturnDate: '',
  purpose: '',
  items: [EMPTY_ITEM],
};

function idOrNone(id: number | null): string {
  return id != null ? String(id) : NONE;
}

function toFormValues(
  movement: MaterialMovement | null
): MaterialMovementFormValues {
  if (!movement) {
    return EMPTY;
  }

  return {
    movementType: movement.movementType,
    fromCompanyId: idOrNone(movement.fromCompanyId),
    fromLocationId: idOrNone(movement.fromLocationId),
    fromDepartmentId: idOrNone(movement.fromDepartmentId),
    fromCostCenterId: idOrNone(movement.fromCostCenterId),
    toCompanyId: idOrNone(movement.toCompanyId),
    toLocationId: idOrNone(movement.toLocationId),
    toDepartmentId: idOrNone(movement.toDepartmentId),
    toCostCenterId: idOrNone(movement.toCostCenterId),
    vendorId: idOrNone(movement.vendorId),
    expectedReturnDate: movement.expectedReturnDate
      ? movement.expectedReturnDate.substring(0, 10)
      : '',
    purpose: movement.purpose ?? '',
    items: movement.items.length
      ? movement.items.map((item) => ({
          itemId: String(item.itemId),
          assetId: idOrNone(item.assetId),
          quantity: item.quantity,
          unitOfMeasure: item.unitOfMeasure ?? '',
          serialNumbers: item.serialNumbers ?? '',
          condition: item.condition ?? '',
          remarks: item.remarks ?? '',
        }))
      : [EMPTY_ITEM],
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MaterialMovement | null;
  companies: Company[];
  officeLocations: OfficeLocation[];
  departments: Department[];
  costCenters: MaterialCostCenter[];
  vendors: Vendor[];
  items: MaterialItem[];
  assets: Asset[];
  saving: boolean;
  error?: string | null;
  onSubmit: (values: MaterialMovementFormValues) => Promise<void>;
}

export function MaterialMovementFormDialog({
  open,
  onOpenChange,
  movement,
  companies,
  officeLocations,
  departments,
  costCenters,
  vendors,
  items,
  assets,
  saving,
  error,
  onSubmit,
}: Props) {
  const form = useForm<MaterialMovementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (!open) return;

    form.reset(toFormValues(movement));
  }, [open, movement, form]);

  const movementType = form.watch('movementType');
  const config = MOVEMENT_TYPE_CONFIG[movementType];

  const fromCompanyId = form.watch('fromCompanyId');
  const toCompanyId = form.watch('toCompanyId');

  const activeCompanies = companies.filter((c) => c.isActive);
  const activeVendors = vendors.filter((v) => v.isActive);
  const activeItems = items.filter((i) => i.isActive);
  const activeAssets = assets.filter((a) => a.isActive);

  const locationsFor = (companyId: string) =>
    officeLocations.filter(
      (l) => l.isActive && String(l.companyId) === companyId
    );

  const departmentsFor = (companyId: string) =>
    departments.filter(
      (d) => d.isActive && String(d.companyId) === companyId
    );

  const costCentersFor = (companyId: string) =>
    costCenters.filter(
      (c) =>
        c.isActive &&
        (c.companyId == null || String(c.companyId) === companyId)
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            {movement ? 'Edit Movement' : 'New Movement'}
          </DialogTitle>

          <DialogDescription>
            Saved as a Draft. Submitting for approval comes later,
            once the workflow it resolves to is reviewed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex flex-col gap-6"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="movementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movement Type</FormLabel>

                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select movement type" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {MOVEMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MOVEMENT_TYPE_LABELS[type] ?? type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {config?.requireReturnDate ? (
                <FormField
                  control={form.control}
                  name="expectedReturnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Return Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {config?.requireFrom ? (
              <div className="rounded-md border border-border p-3">
                <h3 className="mb-3 text-sm font-semibold">
                  From
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="fromCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Entity
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('fromLocationId', NONE);
                            form.setValue('fromDepartmentId', NONE);
                            form.setValue('fromCostCenterId', NONE);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select entity" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {activeCompanies.map((company) => (
                              <SelectItem
                                key={company.id}
                                value={String(company.id)}
                              >
                                {company.name}
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
                    name="fromLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Location
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !fromCompanyId || fromCompanyId === NONE
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {locationsFor(fromCompanyId).map(
                              (location) => (
                                <SelectItem
                                  key={location.id}
                                  value={String(location.id)}
                                >
                                  {location.locationName}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromDepartmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Department (optional)
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !fromCompanyId || fromCompanyId === NONE
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value={NONE}>
                              None
                            </SelectItem>

                            {departmentsFor(fromCompanyId).map(
                              (department) => (
                                <SelectItem
                                  key={department.id}
                                  value={String(department.id)}
                                >
                                  {department.departmentName}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromCostCenterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Cost Center (optional)
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !fromCompanyId || fromCompanyId === NONE
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value={NONE}>
                              None
                            </SelectItem>

                            {costCentersFor(fromCompanyId).map(
                              (costCenter) => (
                                <SelectItem
                                  key={costCenter.id}
                                  value={String(costCenter.id)}
                                >
                                  {costCenter.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : null}

            {config?.requireTo ? (
              <div className="rounded-md border border-border p-3">
                <h3 className="mb-3 text-sm font-semibold">To</h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="toCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Entity
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('toLocationId', NONE);
                            form.setValue('toDepartmentId', NONE);
                            form.setValue('toCostCenterId', NONE);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select entity" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {activeCompanies.map((company) => (
                              <SelectItem
                                key={company.id}
                                value={String(company.id)}
                              >
                                {company.name}
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
                    name="toLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Location
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !toCompanyId || toCompanyId === NONE
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {locationsFor(toCompanyId).map(
                              (location) => (
                                <SelectItem
                                  key={location.id}
                                  value={String(location.id)}
                                >
                                  {location.locationName}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toDepartmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Department (optional)
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !toCompanyId || toCompanyId === NONE
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value={NONE}>
                              None
                            </SelectItem>

                            {departmentsFor(toCompanyId).map(
                              (department) => (
                                <SelectItem
                                  key={department.id}
                                  value={String(department.id)}
                                >
                                  {department.departmentName}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toCostCenterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Cost Center (optional)
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !toCompanyId || toCompanyId === NONE
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value={NONE}>
                              None
                            </SelectItem>

                            {costCentersFor(toCompanyId).map(
                              (costCenter) => (
                                <SelectItem
                                  key={costCenter.id}
                                  value={String(costCenter.id)}
                                >
                                  {costCenter.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : null}

            {config?.requireVendor ? (
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>

                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {activeVendors.map((vendor) => (
                          <SelectItem
                            key={vendor.id}
                            value={String(vendor.id)}
                          >
                            {vendor.vendorName} ({vendor.vendorCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is this movement needed?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ITEMS */}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Items</h3>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(EMPTY_ITEM)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const selectedItemId = form.watch(
                    `items.${index}.itemId`
                  );

                  const selectedItem = activeItems.find(
                    (i) => String(i.id) === selectedItemId
                  );

                  const showAssetPicker =
                    selectedItem?.materialType === 'ITAsset' &&
                    selectedItem.isSerialized;

                  return (
                    <div
                      key={field.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.itemId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Item
                                </FormLabel>

                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                  </FormControl>

                                  <SelectContent>
                                    {activeItems.map((item) => (
                                      <SelectItem
                                        key={item.id}
                                        value={String(item.id)}
                                      >
                                        {item.itemName} (
                                        {item.itemCode})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Quantity
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="any"
                                    {...field}
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
                            name={`items.${index}.unitOfMeasure`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Unit
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Nos" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-3">
                          {showAssetPicker ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.assetId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Asset (optional)
                                  </FormLabel>

                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="None" />
                                      </SelectTrigger>
                                    </FormControl>

                                    <SelectContent>
                                      <SelectItem value={NONE}>
                                        None
                                      </SelectItem>

                                      {activeAssets.map((asset) => (
                                        <SelectItem
                                          key={asset.id}
                                          value={String(asset.id)}
                                        >
                                          {asset.assetName} (
                                          {asset.assetTag})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={`items.${index}.serialNumbers`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Serial Numbers (optional)
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <div className="flex items-end justify-end md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.condition`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Condition (optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Good, Damaged, For Repair…"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.remarks`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Remarks (optional)
                              </FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {form.formState.errors.items?.message ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {form.formState.errors.items.message}
                </p>
              ) : null}
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
                {saving ? 'Saving…' : 'Save Draft'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
