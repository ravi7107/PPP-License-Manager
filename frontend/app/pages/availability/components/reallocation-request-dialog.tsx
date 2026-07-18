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
import { AvailableResource, EMPTY_REALLOCATION_FORM, LookupOption, ReallocationFormValues } from '@/app/pages/availability/types';

const reallocationFormSchema = z.object({
  targetUserId: z.string().min(1, 'Select a target user'),
  justification: z.string().min(1, 'Justification is required'),
});

interface ReallocationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  resource: AvailableResource | null;
  users: LookupOption[];
  onSubmit: (values: ReallocationFormValues) => Promise<void>;
}

export function ReallocationRequestDialog({
  open,
  onOpenChange,
  saving,
  resource,
  users,
  onSubmit,
}: ReallocationRequestDialogProps) {
  const form = useForm<ReallocationFormValues>({
    resolver: zodResolver(reallocationFormSchema),
    defaultValues: EMPTY_REALLOCATION_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_REALLOCATION_FORM);
    }
  }, [open, resource]);

  if (!resource) return null;

  const eligibleUsers = users.filter((u) => u.id !== resource.user_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Reallocation</DialogTitle>
          <DialogDescription>
            Request to reallocate {resource.resource_type === 'Asset' ? resource.resource_label : resource.software_name}{' '}
            (currently held by {resource.user_name}, unavailable). Requires IT Administrator approval before it takes
            effect.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="targetUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reallocate To</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleUsers.map((u) => (
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
            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Why should this resource be reallocated…" {...field} />
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
                {saving ? 'Submitting…' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
