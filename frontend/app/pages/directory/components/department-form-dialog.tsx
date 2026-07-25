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
import { Department } from '@/lib/api/departments.api';

const schema = z.object({
  companyId: z.string().min(1, 'Entity is required'),
  departmentName: z.string().min(1, 'Department name is required'),
  departmentCode: z.string().min(1, 'Department code is required'),
  description: z.string(),
  status: z.enum(['Active', 'Inactive']),
});

export type DepartmentFormValues = z.infer<typeof schema>;

const EMPTY: DepartmentFormValues = {
  companyId: '',
  departmentName: '',
  departmentCode: '',
  description: '',
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  companies: Company[];
  saving: boolean;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  companies,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    if (department) {
      form.reset({
        companyId: String(department.companyId),
        departmentName: department.departmentName,
        departmentCode: department.departmentCode,
        description: department.description ?? '',
        status: department.isActive ? 'Active' : 'Inactive',
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, department, form]);

  const activeCompanies = companies.filter(
    (company) => company.isActive || company.id === department?.companyId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {department ? 'Edit Department' : 'Add Department'}
          </DialogTitle>

          <DialogDescription>
            Create and manage departments under a legal entity.
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
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity</FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
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
              name="departmentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="Engineering"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departmentCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Code</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="ENG"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="Department description"
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

              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Department'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
