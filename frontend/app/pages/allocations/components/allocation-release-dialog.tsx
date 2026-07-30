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

import type { ResourceAllocation } from '@/lib/api/resource-allocations.api';

const releaseFormSchema = z.object({
  remarks: z
    .string()
    .max(500, 'Remarks cannot exceed 500 characters'),
});

export type ReleaseFormValues =
  z.infer<typeof releaseFormSchema>;

interface AllocationReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ResourceAllocation | null;
  saving: boolean;
  onSubmit: (
    values: ReleaseFormValues
  ) => Promise<void>;
}

export function AllocationReleaseDialog({
  open,
  onOpenChange,
  record,
  saving,
  onSubmit,
}: AllocationReleaseDialogProps) {
  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: {
      remarks: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        remarks: '',
      });
    }
  }, [open, record, form]);

  if (!record) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Release License
          </DialogTitle>

          <DialogDescription>
            Release {record.licenseAliasCode}
            {' '}({record.softwareName}) from{' '}
            {record.userName}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div>
            <span className="font-medium">
              License:
            </span>{' '}
            {record.licenseAliasCode}
          </div>

          <div>
            <span className="font-medium">
              Software:
            </span>{' '}
            {record.softwareName}
          </div>

          <div>
            <span className="font-medium">
              Allocated To:
            </span>{' '}
            {record.userName}
          </div>

          {record.assetName ? (
            <div>
              <span className="font-medium">
                Asset:
              </span>{' '}
              {record.assetName}
            </div>
          ) : null}
        </div>

        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Release Remarks
                  </FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="Reason for releasing this license..."
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
                disabled={saving}
                onClick={() =>
                  onOpenChange(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="destructive"
                disabled={saving}
              >
                {saving
                  ? 'Releasing...'
                  : 'Release License'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
