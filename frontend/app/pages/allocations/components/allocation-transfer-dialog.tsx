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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALLOCATION_TYPES, AllocationRecord, LookupOption } from '@/app/pages/allocations/types';

const transferFormSchema = z
  .object({
    allocationType: z.enum(['User', 'Computer', 'Entity', 'Client']),
    userId: z.string(),
    assetId: z.string(),
    entityId: z.string(),
    clientId: z.string(),
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
  });

export type TransferFormValues = z.infer<typeof transferFormSchema>;

interface AllocationTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AllocationRecord | null;
  saving: boolean;
  users: LookupOption[];
  computers: LookupOption[];
  entities: LookupOption[];
  clients: LookupOption[];
  onSubmit: (values: TransferFormValues) => Promise<void>;
}

export function AllocationTransferDialog({
  open,
  onOpenChange,
  record,
  saving,
  users,
  computers,
  entities,
  clients,
  onSubmit,
}: AllocationTransferDialogProps) {
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: { allocationType: 'User', userId: '', assetId: '', entityId: '', clientId: '', notes: '' },
  });

  useEffect(() => {
    if (open && record) {
      form.reset({
        allocationType: record.allocation_type,
        userId: record.user_id ? String(record.user_id) : '',
        assetId: record.asset_id ? String(record.asset_id) : '',
        entityId: record.entity_id ? String(record.entity_id) : '',
        clientId: record.client_id ? String(record.client_id) : '',
        notes: '',
      });
    }
  }, [open, record]);

  const allocationType = form.watch('allocationType');

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer License</DialogTitle>
          <DialogDescription>
            Move this {record.software_name} seat to a different user, computer, entity, or client.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4" onSubmit={form.handleSubmit(onSubmit)}>
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

            {allocationType === 'User' ? (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New User</FormLabel>
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
                  <FormItem>
                    <FormLabel>New Computer</FormLabel>
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
                  <FormItem>
                    <FormLabel>New Entity</FormLabel>
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
                  <FormItem>
                    <FormLabel>New Client</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Reason / Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for transfer…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Transferring…' : 'Transfer License'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
