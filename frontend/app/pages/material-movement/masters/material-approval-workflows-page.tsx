import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
const ANY_REQUIRES_IT_ASSET_LINE = '__any__';

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
      requiresItAssetLine:
        values.requiresItAssetLine === ANY_REQUIRES_IT_ASSET_LINE
          ? null
          : values.requiresItAssetLine === 'true',
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
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Approval Workflows</h1>
          <p className="nova-cmdbar-desc">
            The configurable approval matrix a material movement
            resolves to at submission time, based on its type, value,
            and entities.
          </p>
        </div>

        {canEdit ? (
          <div className="nova-cmdbar-actions">
            <Button
              size="sm"
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Workflow
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workflows…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filtered.length} workflow{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Movement Type</th>
                <th>Value Range</th>
                <th>Entities</th>
                <th>IT Asset Line</th>
                <th>Steps</th>
                <th>Priority</th>
                <th>Status</th>

                {canEdit ? <th className="nova-right">Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 9 : 8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading workflows…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 9 : 8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No approval workflows found.
                  </td>
                </tr>
              ) : (
                filtered.map((workflow) => (
                  <tr key={workflow.id}>
                    <td className="font-medium">{workflow.name}</td>

                    <td className="nova-cell-sub">
                      {workflow.movementType
                        ? MOVEMENT_TYPE_LABELS[
                            workflow.movementType
                          ] ?? workflow.movementType
                        : 'Any'}
                    </td>

                    <td className="nova-cell-sub">
                      {formatValueRange(
                        workflow.minValue,
                        workflow.maxValue
                      )}
                    </td>

                    <td>
                      <div className="flex flex-col text-xs">
                        <span>
                          From:{' '}
                          {workflow.fromCompanyName ?? 'Any'}
                        </span>
                        <span>
                          To: {workflow.toCompanyName ?? 'Any'}
                        </span>
                      </div>
                    </td>

                    <td className="nova-cell-sub">
                      {workflow.requiresItAssetLine == null
                        ? 'Any'
                        : workflow.requiresItAssetLine
                          ? 'Yes'
                          : 'No'}
                    </td>

                    <td className="nova-cell-sub">
                      {workflow.steps.length}
                    </td>

                    <td className="nova-cell-sub">{workflow.priority}</td>

                    <td>
                      <span
                        className={`nova-pill ${workflow.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                      >
                        <span className="nova-dot" />
                        {workflow.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    {canEdit ? (
                      <td className="nova-right space-x-1">
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
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
