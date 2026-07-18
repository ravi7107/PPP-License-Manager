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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RequestFormValues,
  REQUEST_TYPES,
  REQUEST_PRIORITIES,
  ALLOCATION_TYPES,
  EMPTY_REQUEST_FORM,
  SoftwareAvailabilityOption,
  LookupOption,
} from '@/app/pages/requests/types';

const requestFormSchema = z
  .object({
    requestType: z.enum([
      'New License',
      'Reallocation',
      'Release',
      'Temporary License Allocation',
      'Hardware Allocation',
      'Hardware Transfer',
      'Return Hardware',
    ]),
    softwareId: z.string(),
    licenseInventoryId: z.string(),
    allocationType: z.enum(['User', 'Computer', 'Entity', 'Client']),
    departmentId: z.string(),
    targetUserId: z.string(),
    assetId: z.string(),
    entityId: z.string(),
    clientId: z.string(),
    justification: z.string().min(1, 'Justification is required'),
    requestedDate: z.string().min(1, 'Requested date is required'),
    durationDays: z.string(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
    requiredFromDate: z.string(),
    requiredUntilDate: z.string(),
  })
  .superRefine((values, ctx) => {
    const isSoftwareRequest = ['New License', 'Reallocation', 'Release', 'Temporary License Allocation'].includes(values.requestType);
    if (isSoftwareRequest && values.requestType !== 'Release' && !values.licenseInventoryId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a software license pool', path: ['licenseInventoryId'] });
    }
    if (values.allocationType === 'User' && !values.targetUserId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a user', path: ['targetUserId'] });
    }
    const isHardwareReq = ['Hardware Allocation', 'Hardware Transfer', 'Return Hardware'].includes(values.requestType);
    if ((values.allocationType === 'Computer' || isHardwareReq) && !values.assetId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a computer', path: ['assetId'] });
    }
    if (values.allocationType === 'Entity' && !values.entityId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select an entity', path: ['entityId'] });
    }
    if (values.allocationType === 'Client' && !values.clientId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a client', path: ['clientId'] });
    }
  }) satisfies z.ZodType<RequestFormValues>;

interface RequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  softwareOptions: SoftwareAvailabilityOption[];
  departments: LookupOption[];
  users: LookupOption[];
  computers: LookupOption[];
  entities: LookupOption[];
  clients: LookupOption[];
  onSubmit: (values: RequestFormValues) => Promise<void>;
}

export function RequestFormDialog({
  open,
  onOpenChange,
  saving,
  softwareOptions,
  departments,
  users,
  computers,
  entities,
  clients,
  onSubmit,
}: RequestFormDialogProps) {
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: EMPTY_REQUEST_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_REQUEST_FORM);
    }
  }, [open]);

  const requestType = form.watch('requestType');
  const allocationType = form.watch('allocationType');
  const isSoftwareRequest = ['New License', 'Reallocation', 'Release', 'Temporary License Allocation'].includes(requestType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
          <DialogDescription>Submit a license or reallocation request for IT Administrator review.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="requestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUEST_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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

            {isSoftwareRequest && requestType !== 'Release' ? (
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
                          <SelectItem key={s.license_inventory_id} value={String(s.license_inventory_id)}>
                            {s.software_name} ({s.vendor}) — {s.available_licenses}/{s.total_seats} available
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
              name="allocationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>For</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target type" />
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
              name="requestedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested Date</FormLabel>
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
                name="targetUserId"
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

            {allocationType === 'Computer' || ['Hardware Allocation', 'Hardware Transfer', 'Return Hardware'].includes(requestType) ? (
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
              name="durationDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (days, optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="e.g. 30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUEST_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
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
              name="requiredFromDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required From (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiredUntilDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Until (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Justification</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain the business need for this request…" {...field} />
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
                {saving ? 'Submitting…' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
