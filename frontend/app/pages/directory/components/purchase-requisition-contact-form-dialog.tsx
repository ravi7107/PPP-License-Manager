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
import { PurchaseRequisitionContact } from '@/lib/api/purchase-requisition-contacts.api';

const schema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  contactType: z.enum(['Initiator', 'Approver', 'Both']),
  // "" means org-wide (no specific company).
  companyId: z.string(),
  status: z.enum(['Active', 'Inactive']),
});

export type PurchaseRequisitionContactFormValues = z.infer<typeof schema>;

const EMPTY: PurchaseRequisitionContactFormValues = {
  fullName: '',
  email: '',
  contactType: 'Approver',
  companyId: '',
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PurchaseRequisitionContact | null;
  companies: Company[];
  saving: boolean;
  onSubmit: (values: PurchaseRequisitionContactFormValues) => Promise<void>;
}

export function PurchaseRequisitionContactFormDialog({
  open,
  onOpenChange,
  contact,
  companies,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<PurchaseRequisitionContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    if (contact) {
      form.reset({
        fullName: contact.fullName,
        email: contact.email,
        contactType: contact.contactType,
        companyId: contact.companyId ? String(contact.companyId) : '',
        status: contact.isActive ? 'Active' : 'Inactive',
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, contact, form]);

  const activeCompanies = companies.filter(
    (company) => company.isActive || company.id === contact?.companyId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Edit Contact' : 'Add Contact'}
          </DialogTitle>

          <DialogDescription>
            Initiators and approvers who don't need a login of their own -
            typically a Gmail or Office 365 address. Approval steps
            assigned to a contact are decided via a secure link sent to
            their email.
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
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>

                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="jane.doe@gmail.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>

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
                      <SelectItem value="Initiator">
                        Initiator only
                      </SelectItem>
                      <SelectItem value="Approver">
                        Approver only
                      </SelectItem>
                      <SelectItem value="Both">
                        Both Initiator and Approver
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity (optional)</FormLabel>

                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? '' : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Org-wide (any entity)" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="none">
                        Org-wide (any entity)
                      </SelectItem>

                      {activeCompanies.map((company) => (
                        <SelectItem
                          key={company.id}
                          value={String(company.id)}
                        >
                          {company.name}
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
                {saving ? 'Saving…' : 'Save Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
