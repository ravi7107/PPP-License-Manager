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

import { MaterialCostCenter } from '@/lib/api/material-cost-centers.api';
import { Company } from '@/lib/api/companies.api';

const NO_COMPANY = '__none__';

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  companyId: z.string(),
  status: z.enum(['Active', 'Inactive']),
});

export type MaterialCostCenterFormValues = z.infer<typeof schema>;

const EMPTY: MaterialCostCenterFormValues = {
  code: '',
  name: '',
  companyId: NO_COMPANY,
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter: MaterialCostCenter | null;
  companies: Company[];
  saving: boolean;
  onSubmit: (
    values: MaterialCostCenterFormValues
  ) => Promise<void>;
}

export function MaterialCostCenterFormDialog({
  open,
  onOpenChange,
  costCenter,
  companies,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<MaterialCostCenterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      costCenter
        ? {
            code: costCenter.code,
            name: costCenter.name,
            companyId:
              costCenter.companyId != null
                ? String(costCenter.companyId)
                : NO_COMPANY,
            status: costCenter.isActive ? 'Active' : 'Inactive',
          }
        : EMPTY
    );
  }, [open, costCenter, form]);

  const activeCompanies = companies.filter(
    (company) =>
      company.isActive || company.id === costCenter?.companyId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {costCenter ? 'Edit Cost Center' : 'Add Cost Center'}
          </DialogTitle>

          <DialogDescription>
            Cost centers used to attribute material movement
            costs.
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Center Code</FormLabel>
                  <FormControl>
                    <Input placeholder="CC-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Center Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Warehouse Operations" {...field} />
                  </FormControl>
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
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Shared across all entities" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value={NO_COMPANY}>
                        Shared across all entities
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
