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

const transferFormSchema = z.object({
  userId: z.string().min(1, 'Select a user'),
  notes: z.string(),
});

export type AssetTransferFormValues = z.infer<typeof transferFormSchema>;

const EMPTY_TRANSFER_FORM: AssetTransferFormValues = {
  userId: '',
  notes: '',
};

interface AssetTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
  isReassignment: boolean;
  currentUserId?: number | null;
  users: LookupOption[];
  saving: boolean;
  error?: string | null;
  onSubmit: (values: AssetTransferFormValues) => Promise<void>;
}

export function AssetTransferDialog({
  open,
  onOpenChange,
  asset,
  isReassignment,
  currentUserId,
  users,
  saving,
  error,
  onSubmit,
}: AssetTransferDialogProps) {
  const form = useForm<AssetTransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: EMPTY_TRANSFER_FORM,
  });

  useEffect(() => {
    if (open) form.reset(EMPTY_TRANSFER_FORM);
  }, [open]);

  if (!asset) return null;

  const safeUsers = Array.isArray(users) ? users : [];

  // A reassignment can't go to the user who already has the asset.
  const selectableUsers = isReassignment
    ? safeUsers.filter((u) => u.id !== currentUserId)
    : safeUsers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReassignment ? 'Reassign Hardware' : 'Allocate Hardware'}
          </DialogTitle>
          <DialogDescription>
            {isReassignment
              ? `Reassign ${asset.assetTag} (${asset.hostName ?? asset.model ?? 'asset'}) to a different user.`
              : `Allocate ${asset.assetTag} (${asset.hostName ?? asset.model ?? 'asset'}) to a user.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

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
                      {selectableUsers.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No users available
                        </div>
                      ) : (
                        selectableUsers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name ?? u.name ?? 'Unnamed User'}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for allocation…" {...field} />
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
                {saving
                  ? isReassignment
                    ? 'Reassigning…'
                    : 'Allocating…'
                  : isReassignment
                    ? 'Reassign'
                    : 'Allocate'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
