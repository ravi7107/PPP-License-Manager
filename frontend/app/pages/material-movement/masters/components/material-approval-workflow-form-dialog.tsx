import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';

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
  MaterialApprovalWorkflow,
  MOVEMENT_TYPES,
  APPROVER_ROLES,
} from '@/lib/api/material-approval-workflows.api';

import { Company } from '@/lib/api/companies.api';
import { User } from '@/lib/api/users.api';
import { Department } from '@/lib/api/departments.api';

const ANY_MOVEMENT_TYPE = '__any__';
const NO_COMPANY = '__none__';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  InternalTransfer: 'Internal Transfer',
  InterEntityTransfer: 'Inter-Entity Transfer',
  OutwardToVendor: 'Outward to Vendor',
  InwardFromVendor: 'Inward from Vendor',
  TemporaryMovement: 'Temporary Movement',
  DirectInward: 'Direct Inward',
  DirectOutward: 'Direct Outward',
};

const stepSchema = z.object({
  approverType: z.enum(['Role', 'User', 'Department']),
  approverRole: z.string(),
  approverUserId: z.string(),
  approverDepartmentId: z.string(),
  isMandatory: z.boolean(),
});

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    // '' means "applies to every movement type".
    movementType: z.string(),
    minValue: z.string(),
    maxValue: z.string(),
    // '' means "applies to every entity".
    fromCompanyId: z.string(),
    toCompanyId: z.string(),
    priority: z.coerce.number().int('Priority must be a whole number'),
    status: z.enum(['Active', 'Inactive']),
    steps: z
      .array(stepSchema)
      .min(1, 'Add at least one approval step'),
  })
  .superRefine((data, ctx) => {
    data.steps.forEach((step, index) => {
      if (step.approverType === 'Role' && !step.approverRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select an approver role',
          path: ['steps', index, 'approverRole'],
        });
      }

      if (step.approverType === 'User' && !step.approverUserId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select an approver user',
          path: ['steps', index, 'approverUserId'],
        });
      }

      if (
        step.approverType === 'Department' &&
        !step.approverDepartmentId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select an approver department',
          path: ['steps', index, 'approverDepartmentId'],
        });
      }
    });
  });

export type MaterialApprovalWorkflowFormValues = z.infer<typeof schema>;

const EMPTY_STEP: MaterialApprovalWorkflowFormValues['steps'][number] = {
  approverType: 'Role',
  approverRole: '',
  approverUserId: '',
  approverDepartmentId: '',
  isMandatory: true,
};

const EMPTY: MaterialApprovalWorkflowFormValues = {
  name: '',
  movementType: ANY_MOVEMENT_TYPE,
  minValue: '',
  maxValue: '',
  fromCompanyId: NO_COMPANY,
  toCompanyId: NO_COMPANY,
  priority: 100,
  status: 'Active',
  steps: [EMPTY_STEP],
};

function toFormValues(
  workflow: MaterialApprovalWorkflow | null
): MaterialApprovalWorkflowFormValues {
  if (!workflow) {
    return EMPTY;
  }

  return {
    name: workflow.name,
    movementType: workflow.movementType ?? ANY_MOVEMENT_TYPE,
    minValue:
      workflow.minValue != null ? String(workflow.minValue) : '',
    maxValue:
      workflow.maxValue != null ? String(workflow.maxValue) : '',
    fromCompanyId:
      workflow.fromCompanyId != null
        ? String(workflow.fromCompanyId)
        : NO_COMPANY,
    toCompanyId:
      workflow.toCompanyId != null
        ? String(workflow.toCompanyId)
        : NO_COMPANY,
    priority: workflow.priority,
    status: workflow.isActive ? 'Active' : 'Inactive',
    steps: workflow.steps.length
      ? workflow.steps.map((step) => ({
          approverType:
            (step.approverType as 'Role' | 'User' | 'Department') ??
            'Role',
          approverRole: step.approverRole ?? '',
          approverUserId:
            step.approverUserId != null
              ? String(step.approverUserId)
              : '',
          approverDepartmentId:
            step.approverDepartmentId != null
              ? String(step.approverDepartmentId)
              : '',
          isMandatory: step.isMandatory,
        }))
      : [EMPTY_STEP],
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: MaterialApprovalWorkflow | null;
  companies: Company[];
  users: User[];
  departments: Department[];
  saving: boolean;
  onSubmit: (
    values: MaterialApprovalWorkflowFormValues
  ) => Promise<void>;
}

export function MaterialApprovalWorkflowFormDialog({
  open,
  onOpenChange,
  workflow,
  companies,
  users,
  departments,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<MaterialApprovalWorkflowFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  useEffect(() => {
    if (!open) return;

    form.reset(toFormValues(workflow));
  }, [open, workflow, form]);

  const activeCompanies = companies.filter(
    (company) =>
      company.isActive ||
      company.id === workflow?.fromCompanyId ||
      company.id === workflow?.toCompanyId
  );

  const activeUsers = users.filter((user) => user.isActive);
  const activeDepartments = departments.filter(
    (department) => department.isActive
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {workflow
              ? 'Edit Approval Workflow'
              : 'Add Approval Workflow'}
          </DialogTitle>

          <DialogDescription>
            A movement resolves to the highest-priority active
            workflow whose movement type, value range, and
            entities match it, then routes through its ordered
            approval steps.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex flex-col gap-6"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Workflow Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="High-Value Inter-Entity Transfers"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="movementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movement Type</FormLabel>

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
                        <SelectItem value={ANY_MOVEMENT_TYPE}>
                          Any movement type
                        </SelectItem>

                        {MOVEMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MOVEMENT_TYPE_LABELS[type] ?? type}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Lower evaluates first when more than one
                      workflow matches.
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Value (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="No lower bound"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Value (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="No upper bound"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fromCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Entity (optional)</FormLabel>

                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any entity" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value={NO_COMPANY}>
                          Any entity
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
                name="toCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Entity (optional)</FormLabel>

                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any entity" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value={NO_COMPANY}>
                          Any entity
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
            </div>

            {/* APPROVAL STEPS */}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Approval Steps
                </h3>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(EMPTY_STEP)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const approverType = form.watch(
                    `steps.${index}.approverType`
                  );

                  return (
                    <div
                      key={field.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div className="md:col-span-1 flex items-center text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </div>

                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name={`steps.${index}.approverType`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Approver Type
                                </FormLabel>

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
                                    <SelectItem value="Role">
                                      Anyone with a role
                                    </SelectItem>
                                    <SelectItem value="User">
                                      Specific person
                                    </SelectItem>
                                    <SelectItem value="Department">
                                      Department head
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-5">
                          {approverType === 'Role' ? (
                            <FormField
                              control={form.control}
                              name={`steps.${index}.approverRole`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Role
                                  </FormLabel>

                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                    </FormControl>

                                    <SelectContent>
                                      {APPROVER_ROLES.map((role) => (
                                        <SelectItem
                                          key={role}
                                          value={role}
                                        >
                                          {role}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}

                          {approverType === 'User' ? (
                            <FormField
                              control={form.control}
                              name={`steps.${index}.approverUserId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Person
                                  </FormLabel>

                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select person" />
                                      </SelectTrigger>
                                    </FormControl>

                                    <SelectContent>
                                      {activeUsers.map((user) => (
                                        <SelectItem
                                          key={user.id}
                                          value={String(user.id)}
                                        >
                                          {user.fullName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}

                          {approverType === 'Department' ? (
                            <FormField
                              control={form.control}
                              name={`steps.${index}.approverDepartmentId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Department
                                  </FormLabel>

                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                      </SelectTrigger>
                                    </FormControl>

                                    <SelectContent>
                                      {activeDepartments.map(
                                        (department) => (
                                          <SelectItem
                                            key={department.id}
                                            value={String(
                                              department.id
                                            )}
                                          >
                                            {department.departmentName}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`steps.${index}.isMandatory`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col gap-1">
                                <FormLabel className="text-xs">
                                  Mandatory
                                </FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-end justify-end md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {form.formState.errors.steps?.message ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {form.formState.errors.steps.message}
                </p>
              ) : null}
            </div>

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
