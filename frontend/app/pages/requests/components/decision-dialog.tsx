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
import { RequestRecord } from '@/app/pages/requests/types';

const decisionSchema = z.object({ comment: z.string() });
type DecisionFormValues = z.infer<typeof decisionSchema>;

interface DecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RequestRecord | null;
  decision: 'Approved' | 'Rejected' | null;
  saving: boolean;
  onConfirm: (comment: string) => Promise<void>;
}

export function DecisionDialog({ open, onOpenChange, record, decision, saving, onConfirm }: DecisionDialogProps) {
  const form = useForm<DecisionFormValues>({ resolver: zodResolver(decisionSchema), defaultValues: { comment: '' } });

  useEffect(() => {
    if (open) {
      form.reset({ comment: '' });
    }
  }, [open]);

  const isApprove = decision === 'Approved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isApprove ? 'Approve Request' : 'Reject Request'}</DialogTitle>
          <DialogDescription>
            {record
              ? `${record.request_type} request from ${record.requester_name ?? 'Unknown'} for ${record.software_name ?? 'the selected resource'}.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => onConfirm(values.comment))}
          >
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment {isApprove ? '(optional)' : '(recommended)'}</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add context for this decision…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} variant={isApprove ? 'default' : 'destructive'}>
                {saving ? 'Saving…' : isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
