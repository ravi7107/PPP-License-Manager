import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  GitBranch,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { AppRole, canManage } from '@/lib/auth/roles';

import {
  MaterialApprovalWorkflow,
  CreateMaterialApprovalWorkflowRequest,
  getMaterialApprovalWorkflows,
  createMaterialApprovalWorkflow,
  updateMaterialApprovalWorkflow,
  deleteMaterialApprovalWorkflow,
} from '@/lib/api/material-approval-workflows.api';

import { Company, getCompanies } from '@/lib/api/companies.api';
import { User, getUsers } from '@/lib/api/users.api';
import {
  Department,
  getDepartments,
} from '@/lib/api/departments.api';

import {
  MaterialApprovalWorkflowFormDialog,
  MaterialApprovalWorkflowFormValues,
} from '@/app/pages/material-movement/masters/components/material-approval-workflow-form-dialog';

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

function formatValueRange(
  minValue: number | null,
  maxValue: number | null
): string {
  if (minValue == null && maxValue == null) {
    return 'Any value';
  }

  if (minValue != null && maxValue != null) {
    return `${minValue} – ${maxValue}`;
  }

  if (minValue != null) {
    return `≥ ${minValue}`;
  }

  return `≤ ${maxValue}`;
}

export default function MaterialApprovalWorkflowsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [workflows, setWorkflows] = useState<
    MaterialApprovalWorkflow[]
  >([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] =
    useState<MaterialApprovalWorkflow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [workflowData, companyData, userData, departmentData] =
        await Promise.all([
          getMaterialApprovalWorkflows(),
          getCompanies(),
          getUsers('', 1, 500),
          getDepartments(),
        ]);

      setWorkflows(
        Array.isArray(workflowData) ? workflowData : []
      );

      setCompanies(
        Array.isArray(companyData) ? companyData : []
      );

      setUsers(
        Array.isArray(userData.items) ? userData.items : []
      );

      setDepartments(
        Array.isArray(departmentData) ? departmentData : []
      );
    } catch (err) {
      console.error(
        'Failed to load approval workflows:',
        err
      );

      setError(
        'Unable to load approval workflows. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return workflows;
    }

    return workflows.filter((workflow) =>
      [
        workflow.name,
        workflow.movementType ?? '',
        workflow.fromCompanyName ?? '',
        workflow.toCompanyName ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [workflows, search]);

  const handleSubmit = async (
    values: MaterialApprovalWorkflowFormValues
  ) => {
    setError(null);

    const request: CreateMaterialApprovalWorkflowRequest = {
      name: values.name.trim(),
      movementType:
        values.movementType === ANY_MOVEMENT_TYPE
          ? null
          : values.movementType,
      minValue:
        values.minValue.trim() === ''
          ? null
          : Number(values.minValue),
      maxValue:
        values.maxValue.trim() === ''
          ? null
          : Number(values.maxValue),
      fromCompanyId:
        values.fromCompanyId === NO_COMPANY
          ? null
          : Number(values.fromCompanyId),
      toCompanyId:
        values.toCompanyId === NO_COMPANY
          ? null
          : Number(values.toCompanyId),
      priority: values.priority,
      steps: values.steps.map((step) => ({
        approverType: step.approverType,
        approverRole:
          step.approverType === 'Role' ? step.approverRole : null,
        approverUserId:
          step.approverType === 'User'
            ? Number(step.approverUserId)
            : null,
        approverDepartmentId:
          step.approverType === 'Department'
            ? Number(step.approverDepartmentId)
            : null,
        isMandatory: step.isMandatory,
      })),
    };

    try {
      if (selected) {
        setUpdating(true);

        await updateMaterialApprovalWorkflow(selected.id, {
          ...request,
          isActive: values.status === 'Active',
        });
      } else {
        setCreating(true);

        await createMaterialApprovalWorkflow(request);
      }

      setFormOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error('Failed to save approval workflow:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save approval workflow. Please try again.';

      setError(message);
    } finally {
      setCreating(false);
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteMaterialApprovalWorkflow(selected.id);

      setDeleteOpen(false);
      setSelected(null);

      await loadData();
    } catch (err: any) {
      console.error(
        'Failed to deactivate approval workflow:',
        err
      );

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to deactivate approval workflow.';

      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Approval Workflows
            </CardTitle>

            <CardDescription>
              The configurable approval matrix a material
              movement resolves to at submission time, based on
              its type, value, and entities.
            </CardDescription>
          </div>

          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Workflow
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Search workflows…"
              className="pl-8"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Movement Type</TableHead>
                <TableHead>Value Range</TableHead>
                <TableHead>Entities</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>

                {canEdit ? (
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 8 : 7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading workflows…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 8 : 7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No approval workflows found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">
                      {workflow.name}
                    </TableCell>

                    <TableCell>
                      {workflow.movementType
                        ? MOVEMENT_TYPE_LABELS[
                            workflow.movementType
                          ] ?? workflow.movementType
                        : 'Any'}
                    </TableCell>

                    <TableCell>
                      {formatValueRange(
                        workflow.minValue,
                        workflow.maxValue
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>
                          From:{' '}
                          {workflow.fromCompanyName ?? 'Any'}
                        </span>
                        <span>
                          To: {workflow.toCompanyName ?? 'Any'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {workflow.steps.length}
                    </TableCell>

                    <TableCell>{workflow.priority}</TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          workflow.isActive
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {workflow.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit workflow"
                          onClick={() => {
                            setSelected(workflow);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate workflow"
                          disabled={!workflow.isActive}
                          onClick={() => {
                            setSelected(workflow);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MaterialApprovalWorkflowFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
        workflow={selected}
        companies={companies}
        users={users}
        departments={departments}
        saving={creating || updating}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);

          if (!open) {
            setSelected(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate workflow?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will mark "{selected?.name}" as inactive.
              It will no longer be matched against new
              movements, but movements that already resolved to
              it will keep their approval history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
