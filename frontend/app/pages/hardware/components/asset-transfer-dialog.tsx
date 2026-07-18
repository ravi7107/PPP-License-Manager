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
import { AssetRecord, LookupOption } from '@/app/pages/hardware/types';

const transferFormSchema = z
  .object({
    allocationType: z.enum(['User', 'Entity', 'Client']),
    userId: z.string(),
    entityId: z.string(),
    clientId: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.allocationType === 'User' && !values.userId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a user', path: ['userId'] });
    }
    if (values.allocationType === 'Entity' && !values.entityId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select an entity', path: ['entityId'] });
    }
    if (values.allocationType === 'Client' && !values.clientId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a client', path: ['clientId'] });
    }
  });

export type AssetTransferFormValues = z.infer<typeof transferFormSchema>;

const EMPTY_TRANSFER_FORM: AssetTransferFormValues = {
  allocationType: 'User',
  userId: '',
  entityId: '',
  clientId: '',
  notes: '',
};

interface AssetTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
  users: LookupOption[];
  entities: LookupOption[];
  clients: LookupOption[];
  saving: boolean;
  onSubmit: (values: AssetTransferFormValues) => Promise<void>;
}

export function AssetTransferDialog({
  open,
  onOpenChange,
  asset,
  users,
  entities,
  clients,
  saving,
  onSubmit,
}: AssetTransferDialogProps) {
  const form = useForm<AssetTransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: EMPTY_TRANSFER_FORM,
  });

  useEffect(() => {
    if (open) form.reset(EMPTY_TRANSFER_FORM);
  }, [open]);

  const allocationType = form.watch('allocationType');

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer Hardware</DialogTitle>
          <DialogDescription>
            Reassign {asset.asset_tag} ({asset.computer_name ?? asset.model ?? 'asset'}) to a new user, entity, or client.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
            <FormField
              control={form.control}
              name="allocationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer To</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Entity">Entity</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
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
                            {u.full_name}
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
            ) : null}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
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
                {saving ? 'Transferring…' : 'Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
