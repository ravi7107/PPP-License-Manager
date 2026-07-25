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

import { Company } from '@/lib/api/companies.api';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  code: z.string().trim().max(20).optional(),
  gstNumber: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  contactPerson: z.string().trim().max(100).optional(),
  contactEmail: z
    .string()
    .trim()
    .max(100)
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      'Enter a valid email address'
    )
    .optional(),
  contactPhone: z.string().trim().max(20).optional(),
  status: z.enum(['Active', 'Inactive']),
});

export type EntityFormValues = z.infer<typeof schema>;

const EMPTY: EntityFormValues = {
  name: '',
  code: '',
  gstNumber: '',
  address: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Company | null;
  saving: boolean;
  onSubmit: (values: EntityFormValues) => Promise<void>;
}

export function EntityFormDialog({
  open,
  onOpenChange,
  entity,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    if (entity) {
      form.reset({
        name: entity.name ?? '',
        code: entity.code ?? '',
        gstNumber: entity.gstNumber ?? '',
        address: entity.address ?? '',
        contactPerson: entity.contactPerson ?? '',
        contactEmail: entity.contactEmail ?? '',
        contactPhone: entity.contactPhone ?? '',
        status: entity.isActive ? 'Active' : 'Inactive',
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, entity, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {entity ? 'Edit Entity' : 'Add Entity'}
          </DialogTitle>

          <DialogDescription>
            Maintain legal entity/company information used across the license
            and asset management system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PPS Group Pvt Ltd"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PPS"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="27ABCDE1234F1Z5"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Contact person"
                      autoComplete="off"
                      {...field}
                    />
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
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      autoComplete="off"
                      {...field}
                    />
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
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+91 98765 43210"
                      autoComplete="off"
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
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Registered office address"
                      className="min-h-24 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : entity
                    ? 'Update Entity'
                    : 'Create Entity'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
