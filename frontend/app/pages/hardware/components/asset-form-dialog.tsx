import { useEffect } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AssetFormValues,
  AssetRecord,
  AssetType,
  ASSET_TYPES,
  EMPTY_ASSET_FORM,
  LookupOption,
} from '@/app/pages/hardware/types';

const assetFormSchema = z.object({
  assetTag: z.string().min(1, 'Asset ID is required'),

  assetName: z.string().min(1, 'Asset Name is required'),

  assetType: z.enum([
    'Desktop',
    'Laptop',
    'Workstation',
    'Server',
  ]),
  computerName: z.string(),
  manufacturer: z.string(),
model: z.string(),
serialNumber: z.string(),
hostName: z.string(),

processor: z.string(),
ramGb: z.coerce.number().optional(),
purchaseDate: z.string(),
  warrantyExpiry: z.string(),
  operatingSystem: z.string(),
  location: z.string(),
  status: z.enum(['Allocated', 'Available', 'Maintenance', 'Scrap']),
  remarks: z.string(),
  assignedUserId: z.string(),
  departmentId: z.string(),
  entityId: z.string(),
  clientId: z.string(),
}) satisfies z.ZodType<AssetFormValues>;

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
  users: LookupOption[];
  departments: LookupOption[];
  entities: LookupOption[];
  clients: LookupOption[];
  saving: boolean;
  onSubmit: (values: AssetFormValues) => Promise<void>;
}

function toFormValues(asset: AssetRecord | null): AssetFormValues {
  if (!asset) return EMPTY_ASSET_FORM;

  return {
    assetTag: asset.assetTag ?? "",
    assetName: asset.assetName ?? "",
    assetType: (asset.assetType as AssetType) ?? "Workstation",

    computerName: "",
    hostName: asset.hostName ?? "",

    manufacturer: asset.manufacturer ?? "",
    model: asset.model ?? "",
    serialNumber: asset.serialNumber ?? "",

    processor: asset.processor ?? "",
    ramGb: asset.ramGb,

    purchaseDate: asset.purchaseDate
      ? asset.purchaseDate.slice(0, 10)
      : "",

    warrantyExpiry: asset.warrantyExpiry
      ? asset.warrantyExpiry.slice(0, 10)
      : "",

    operatingSystem: asset.operatingSystem ?? "",

    location: "",
    status: asset.status,

    remarks: asset.remarks ?? "",

    assignedUserId: "",
    departmentId: asset.departmentId
      ? String(asset.departmentId)
      : "",

    entityId: "",
    clientId: "",
  };
}


export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  users,
  departments,
  entities,
  clients,
  saving,
  onSubmit,
}: AssetFormDialogProps) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: EMPTY_ASSET_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(asset));
    }
  }, [open, asset]);

  const isEditing = Boolean(asset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update hardware asset details.' : 'Register a new hardware asset in the inventory.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="assetTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset ID</FormLabel>
                  <FormControl>
                    <Input placeholder="PPS-WS-1001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
  control={form.control}
  name="assetName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Asset Name</FormLabel>
      <FormControl>
        <Input
          placeholder="Dell OptiPlex 7010"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
              name="hostName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
  control={form.control}
  name="processor"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Processor</FormLabel>
      <FormControl>
        <Input
          placeholder="Intel Core i7-13700"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operatingSystem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operating System</FormLabel>
                  <FormControl>
                    <Input placeholder="Windows 11 Pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warrantyExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty Expiry</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="HQ - Floor 3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField                    
              control={form.control}
              name="assignedUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current User</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.full_name}
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
                  <FormLabel>Department</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
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
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}
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
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((c) => (
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
              name="remarks"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional notes about this asset" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="col-span-full mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
