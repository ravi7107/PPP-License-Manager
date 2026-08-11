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

import { Vendor } from '@/lib/api/vendors.api';

const schema = z.object({
  vendorCode: z.string().min(1, 'Vendor code is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  contactPerson: z.string(),
  email: z
    .string()
    .refine(
      (value) => !value || /^\S+@\S+\.\S+$/.test(value),
      'Enter a valid email address'
    ),
  phone: z.string(),
  address: z.string(),
  status: z.enum(['Active', 'Inactive']),
});

export type VendorFormValues = z.infer<typeof schema>;

const EMPTY: VendorFormValues = {
  vendorCode: '',
  vendorName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  saving: boolean;
  onSubmit: (values: VendorFormValues) => Promise<void>;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    if (vendor) {
      form.reset({
        vendorCode: vendor.vendorCode,
        vendorName: vendor.vendorName,
        contactPerson: vendor.contactPerson ?? '',
        email: vendor.email ?? '',
        phone: vendor.phone ?? '',
        address: vendor.address ?? '',
        status: vendor.isActive ? 'Active' : 'Inactive',
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, vendor, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>

          <DialogDescription>
            Vendors can be selected on purchase requisitions and appear on
            the generated PR PDF.
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
              name="vendorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name</FormLabel>

                  <FormControl>
                    <Input placeholder="Acme Supplies Pvt Ltd" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Code</FormLabel>

                  <FormControl>
                    <Input placeholder="ACME01" {...field} />
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
                  <FormLabel>Contact Person (optional)</FormLabel>

                  <FormControl>
                    <Input placeholder="Contact name" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>

                    <FormControl>
                      <Input placeholder="vendor@example.com" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>

                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="Vendor's registered/billing address - shown on the PR PDF"
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

                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
                {saving ? 'Saving…' : 'Save Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
