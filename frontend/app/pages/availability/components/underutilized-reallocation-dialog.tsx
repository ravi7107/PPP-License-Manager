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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPTY_UNDERUTILIZED_REALLOCATION_FORM,
  LookupOption,
  UnderutilizedCandidate,
  UnderutilizedReallocationFormValues,
} from '@/app/pages/availability/types';

const formSchema = z.object({
  resourceAllocationId: z.string().min(1, 'Select the license to reallocate'),
  targetUserId: z.string().min(1, 'Select a target user'),
  justification: z
    .string()
    .min(1, 'Explain why this license is considered underutilized'),
});

interface UnderutilizedReallocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  candidates: UnderutilizedCandidate[];
  users: LookupOption[];
  // Preselected candidate when opened from a specific allocation row
  // (e.g. the Allocations page); null when opened generically and the
  // user picks the license themselves.
  preselected: UnderutilizedCandidate | null;
  onSubmit: (values: UnderutilizedReallocationFormValues) => Promise<void>;
}

export function UnderutilizedReallocationDialog({
  open,
  onOpenChange,
  saving,
  candidates,
  users,
  preselected,
  onSubmit,
}: UnderutilizedReallocationDialogProps) {
  const form = useForm<UnderutilizedReallocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_UNDERUTILIZED_REALLOCATION_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...EMPTY_UNDERUTILIZED_REALLOCATION_FORM,
        resourceAllocationId: preselected
          ? String(preselected.resource_allocation_id)
          : '',
      });
    }
  }, [open, preselected]);

  const selectedId = form.watch('resourceAllocationId');

  const selectedCandidate =
    candidates.find(
      (c) => String(c.resource_allocation_id) === selectedId
    ) ?? preselected;

  const eligibleUsers = users.filter(
    (u) => u.id !== selectedCandidate?.current_user_id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reallocate Underutilized License</DialogTitle>
          <DialogDescription>
            Flag a license seat as underutilized and request that it be
            permanently reallocated to someone else. This is not a
            temporary loan - there's no forced return date. Requires
            Super Admin / IT Administrator approval before it takes
            effect.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {!preselected ? (
              <FormField
                control={form.control}
                name="resourceAllocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an allocated license" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {candidates.map((c) => (
                          <SelectItem
                            key={c.resource_allocation_id}
                            value={String(c.resource_allocation_id)}
                          >
                            {c.software_name} ({c.license_alias_code}) -{' '}
                            {c.current_user_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-medium">
                  {preselected.software_name} ({preselected.license_alias_code})
                </div>
                <div className="text-muted-foreground">
                  Currently held by {preselected.current_user_name}
                  {preselected.asset_name
                    ? ` on ${preselected.asset_name}`
                    : ''}
                </div>
              </div>
            )}

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
                  <FormLabel>Why is this underutilized?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Not launched in 90+ days, holder moved to a role that doesn't need it…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
