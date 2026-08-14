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

import { MaterialTransporter } from '@/lib/api/material-transporters.api';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z
    .string()
    .email('Invalid email')
    .or(z.literal('')),
  vehicleDetails: z.string(),
  status: z.enum(['Active', 'Inactive']),
});

export type MaterialTransporterFormValues = z.infer<typeof schema>;

const EMPTY: MaterialTransporterFormValues = {
  name: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  vehicleDetails: '',
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transporter: MaterialTransporter | null;
  saving: boolean;
  onSubmit: (
    values: MaterialTransporterFormValues
  ) => Promise<void>;
}

export function MaterialTransporterFormDialog({
  open,
  onOpenChange,
  transporter,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<MaterialTransporterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      transporter
        ? {
            name: transporter.name,
            contactName: transporter.contactName ?? '',
            contactPhone: transporter.contactPhone ?? '',
            contactEmail: transporter.contactEmail ?? '',
            vehicleDetails: transporter.vehicleDetails ?? '',
            status: transporter.isActive ? 'Active' : 'Inactive',
          }
        : EMPTY
    );
  }, [open, transporter, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transporter ? 'Edit Transporter' : 'Add Transporter'}
          </DialogTitle>

          <DialogDescription>
            Third-party carriers available for material
            dispatch.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transporter Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Speedy Logistics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email (optional)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Details (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Vehicle number, type, capacity…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="Active">
                        Active
                      </SelectItem>
                      <SelectItem value="Inactive">
                        Inactive
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
