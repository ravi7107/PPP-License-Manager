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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { AllocationRecord } from '@/app/pages/allocations/types';

const releaseFormSchema = z.object({
  releaseDate: z.string().min(1, 'Release date is required'),
  notes: z.string(),
});

export type ReleaseFormValues = z.infer<typeof releaseFormSchema>;

interface AllocationReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AllocationRecord | null;
  saving: boolean;
  onSubmit: (values: ReleaseFormValues) => Promise<void>;
}

export function AllocationReleaseDialog({ open, onOpenChange, record, saving, onSubmit }: AllocationReleaseDialogProps) {
  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: { releaseDate: new Date().toISOString().slice(0, 10), notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ releaseDate: new Date().toISOString().slice(0, 10), notes: '' });
    }
  }, [open, record]);

  const releaseDate = form.watch('releaseDate');
  const isFuture = releaseDate > new Date().toISOString().slice(0, 10);

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Release License</DialogTitle>
          <DialogDescription>
            Release the {record.software_name} seat held by{' '}
            {record.user_name ?? record.computer_name ?? record.entity_name ?? record.client_name ?? 'this allocation'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="releaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    {isFuture
                      ? 'Seat stays active until this date, then it is automatically scheduled for release.'
                      : 'Seat will be released immediately and returned to the available pool.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for release…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? 'Releasing…' : isFuture ? 'Schedule Release' : 'Release Now'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
