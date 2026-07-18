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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AllocationFormValues,
  ALLOCATION_TYPES,
  EMPTY_ALLOCATION_FORM,
  SoftwareAvailabilityOption,
  LookupOption,
} from '@/app/pages/allocations/types';

const allocationFormSchema = z
  .object({
    licenseInventoryId: z.string().min(1, 'Select a software license pool'),
    allocationType: z.enum(['User', 'Computer', 'Entity', 'Client']),
    userId: z.string(),
    assetId: z.string(),
    entityId: z.string(),
    clientId: z.string(),
    allocationDate: z.string().min(1, 'Allocation date is required'),
    isTemporary: z.boolean(),
    shareEndDate: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.allocationType === 'User' && !values.userId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a user', path: ['userId'] });
    }
    if (values.allocationType === 'Computer' && !values.assetId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a computer', path: ['assetId'] });
    }
    if (values.allocationType === 'Entity' && !values.entityId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select an entity', path: ['entityId'] });
    }
    if (values.allocationType === 'Client' && !values.clientId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a client', path: ['clientId'] });
    }
    if (values.isTemporary && !values.shareEndDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Share end date is required for temporary allocations', path: ['shareEndDate'] });
    }
  }) satisfies z.ZodType<AllocationFormValues>;

interface AllocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  softwareOptions: SoftwareAvailabilityOption[];
  users: LookupOption[];
  computers: LookupOption[];
  entities: LookupOption[];
  clients: LookupOption[];
  onSubmit: (values: AllocationFormValues) => Promise<void>;
}

export function AllocationFormDialog({
  open,
  onOpenChange,
  saving,
  softwareOptions,
  users,
  computers,
  entities,
  clients,
  onSubmit,
}: AllocationFormDialogProps) {
  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: EMPTY_ALLOCATION_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_ALLOCATION_FORM);
    }
  }, [open]);

  const allocationType = form.watch('allocationType');
  const isTemporary = form.watch('isTemporary');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate License</DialogTitle>
          <DialogDescription>Assign a license seat to a user, computer, entity, or client.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="licenseInventoryId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Software</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select software license pool" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {softwareOptions.map((s) => (
                        <SelectItem
                          key={s.license_inventory_id}
                          value={String(s.license_inventory_id)}
                          disabled={s.available_licenses <= 0}
                        >
                          {s.software_name} ({s.vendor}) — {s.available_licenses}/{s.total_seats} available
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
              name="allocationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocate To</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select allocation type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALLOCATION_TYPES.map((type) => (
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
              name="allocationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocation Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {allocationType === 'User' ? (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>User</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {allocationType === 'Computer' ? (
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Computer</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select computer/asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {computers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name} {c.asset_tag ? `(${c.asset_tag})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {allocationType === 'Entity' ? (
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
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
            ) : null}

            {allocationType === 'Client' ? (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
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
            ) : null}

            <FormField
              control={form.control}
              name="isTemporary"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel>Temporary Share</FormLabel>
                    <FormDescription>Automatically scheduled for release on the share end date.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isTemporary ? (
              <FormField
                control={form.control}
                name="shareEndDate"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Share End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional context for this allocation…" {...field} />
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
                {saving ? 'Allocating…' : 'Allocate License'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
