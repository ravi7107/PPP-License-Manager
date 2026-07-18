import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLoadAction, useMutateAction, useUser } from '@/lib/uibakery';
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
import { LookupCombobox } from '@/components/shared/lookup-combobox';
import loadDepartmentOptions from '@/actions/lookups/loadDepartmentOptions';
import loadEntityOptions from '@/actions/lookups/loadEntityOptions';
import loadClientOptions from '@/actions/lookups/loadClientOptions';
import { createDepartment, createClient, createEntity } from '@/actions/lookups/createLookups';
import {
  SoftwareFormValues,
  SoftwareInventoryRecord,
  LICENSE_TYPES,
  LICENSE_STATUSES,
  EMPTY_SOFTWARE_FORM,
} from '@/app/pages/licenses/types';

const softwareFormSchema = z.object({
  softwareName: z.string().min(1, 'Software name is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  version: z.string(),
  licenseType: z.enum(['Perpetual', 'Subscription', 'Floating', 'Node-locked']),
  licenseCount: z.string().min(1, 'License count is required'),
  costPerLicense: z.string().min(1, 'Cost per license is required'),
  expiryDate: z.string(),
  maintenanceExpiry: z.string(),
  status: z.enum(['Active', 'Expired', 'Retired']),
  entityId: z.string(),
  departmentId: z.string(),
  clientId: z.string(),
}) satisfies z.ZodType<Omit<SoftwareFormValues, 'softwareId'>>;

interface SoftwareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SoftwareInventoryRecord | null;
  saving: boolean;
  onSubmit: (values: SoftwareFormValues) => Promise<void>;
}

function toFormValues(record: SoftwareInventoryRecord | null): SoftwareFormValues {
  if (!record) return EMPTY_SOFTWARE_FORM;
  return {
    softwareId: record.software_id,
    softwareName: record.software_name,
    vendor: record.vendor,
    version: record.version ?? '',
    licenseType: (record.license_type as SoftwareFormValues['licenseType']) ?? 'Subscription',
    licenseCount: String(record.license_count ?? 0),
    costPerLicense: String(record.cost_per_license ?? 0),
    expiryDate: record.expiry_date ? record.expiry_date.slice(0, 10) : '',
    maintenanceExpiry: record.maintenance_expiry ? record.maintenance_expiry.slice(0, 10) : '',
    status: record.status,
    entityId: record.entity_id ? String(record.entity_id) : '',
    departmentId: record.department_id ? String(record.department_id) : '',
    clientId: record.client_id ? String(record.client_id) : '',
  };
}

export function SoftwareFormDialog({ open, onOpenChange, record, saving, onSubmit }: SoftwareFormDialogProps) {
  const user = useUser();
  const actorName = user?.name ?? 'System';

  const form = useForm<SoftwareFormValues>({
    resolver: zodResolver(softwareFormSchema),
    defaultValues: EMPTY_SOFTWARE_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(record));
    }
  }, [open, record]);

  const isEditing = Boolean(record);

  const [departmentOptions, , , reloadDepartments]: [
    { id: number; name: string; code: string }[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(loadDepartmentOptions, [], {});
  const [entityOptions, , , reloadEntities]: [
    { id: number; name: string; code: string }[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(loadEntityOptions, [], {});
  const [clientOptions, , , reloadClients]: [
    { id: number; name: string; code: string }[],
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(loadClientOptions, [], {});

  const [addDepartment, addingDepartment] = useMutateAction(createDepartment);
  const [addEntity, addingEntity] = useMutateAction(createEntity);
  const [addClient, addingClient] = useMutateAction(createClient);

  const slugCode = (name: string) =>
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 20);

  const handleCreateDepartment = async (name: string) => {
    const rows = await addDepartment({ name, code: slugCode(name), actorName });
    await reloadDepartments();
    const created = Array.isArray(rows) ? rows[0] : rows;
    if (created?.id) form.setValue('departmentId', String(created.id));
  };

  const handleCreateEntity = async (name: string) => {
    const rows = await addEntity({ name, code: slugCode(name), actorName });
    await reloadEntities();
    const created = Array.isArray(rows) ? rows[0] : rows;
    if (created?.id) form.setValue('entityId', String(created.id));
  };

  const handleCreateClient = async (name: string) => {
    const rows = await addClient({ name, code: slugCode(name), actorName });
    await reloadClients();
    const created = Array.isArray(rows) ? rows[0] : rows;
    if (created?.id) form.setValue('clientId', String(created.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Software License' : 'Add Software License'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update software license details.' : 'Register a new software title and its license pool.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit({ ...values, softwareId: record?.software_id });
            })}
          >
            <FormField
              control={form.control}
              name="softwareName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software Name</FormLabel>
                  <FormControl>
                    <Input placeholder="AutoCAD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl>
                    <Input placeholder="Autodesk" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder="2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licenseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select license type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LICENSE_TYPES.map((type) => (
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
              name="licenseCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Count</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPerLicense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Per License</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maintenanceExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Expiry</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                  <LookupCombobox
                    options={entityOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select entity"
                    onCreate={handleCreateEntity}
                    creating={addingEntity}
                  />
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
                  <LookupCombobox
                    options={departmentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select department"
                    onCreate={handleCreateDepartment}
                    creating={addingDepartment}
                  />
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
                  <LookupCombobox
                    options={clientOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select client (if client-billed)"
                    onCreate={handleCreateClient}
                    creating={addingClient}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LICENSE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="col-span-full mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Software'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
