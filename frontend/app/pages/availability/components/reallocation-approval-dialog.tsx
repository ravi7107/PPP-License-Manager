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
import { ReallocationRequest } from '@/app/pages/availability/types';

const decisionFormSchema = z.object({
  decisionNotes: z.string(),
});

type DecisionFormValues = z.infer<typeof decisionFormSchema>;

interface ReallocationApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ReallocationRequest | null;
  saving: boolean;
  onDecide: (decision: 'Approved' | 'Rejected', values: DecisionFormValues) => Promise<void>;
}

export function ReallocationApprovalDialog({ open, onOpenChange, request, saving, onDecide }: ReallocationApprovalDialogProps) {
  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: { decisionNotes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ decisionNotes: '' });
    }
  }, [open, request]);

  if (!request) return null;

  const resourceLabel = request.resource_type === 'Asset' ? request.asset_tag : request.software_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Reallocation Request</DialogTitle>
          <DialogDescription>
            {resourceLabel} from {request.source_user_name} to {request.target_user_name ?? 'Unknown'}. Approving
            immediately performs the reallocation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p><span className="text-muted-foreground">Requested by:</span> {request.requested_by ?? 'Unknown'}</p>
              <p className="mt-1"><span className="text-muted-foreground">Justification:</span> {request.justification ?? '—'}</p>
            </div>
            <FormField
              control={form.control}
              name="decisionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes on this decision…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={form.handleSubmit((values) => onDecide('Rejected', values))}
              >
                Reject
              </Button>
              <Button type="button" disabled={saving} onClick={form.handleSubmit((values) => onDecide('Approved', values))}>
                {saving ? 'Processing…' : 'Approve'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
