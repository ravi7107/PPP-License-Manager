import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileClock, Pencil, Plus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { KpiCard } from '@/components/layout/kpi-card';

import { Department, getDepartments } from '@/lib/api/departments.api';
import { Vendor, getVendors } from '@/lib/api/vendors.api';

import {
  AttachmentType,
  createPurchaseRequisitionDraft,
  deletePurchaseRequisitionAttachment,
  deletePurchaseRequisitionDraft,
  getApproverCandidates,
  getMyPurchaseRequisitions,
  getPurchaseRequisition,
  PurchaseRequisition,
  PurchaseRequisitionApproverCandidate,
  PurchaseRequisitionListItem,
  SavePurchaseRequisitionRequest,
  submitPurchaseRequisition,
  SubmitPurchaseRequisitionRequest,
  updatePurchaseRequisitionDraft,
  uploadPurchaseRequisitionAttachment,
} from '@/lib/api/purchase-requisitions.api';

import { PrFormDialog } from '@/app/pages/purchase-requisitions/components/pr-form-dialog';
import { PrDetailDialog } from '@/app/pages/purchase-requisitions/components/pr-detail-dialog';
import { SubmitPrDialog } from '@/app/pages/purchase-requisitions/components/submit-pr-dialog';

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Rejected':
      return 'destructive';
    case 'Draft':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default function PurchaseRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisitionListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approverCandidates, setApproverCandidates] = useState<
    PurchaseRequisitionApproverCandidate[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPr, setEditingPr] = useState<PurchaseRequisition | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPr, setDetailPr] = useState<PurchaseRequisition | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await getMyPurchaseRequisitions();
      setRequisitions(data);
    } catch (err: any) {
      setListError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to load purchase requisitions.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    void getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
    void getVendors()
      .then(setVendors)
      .catch(() => setVendors([]));
  }, [loadList]);

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.prNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requisitions, statusFilter, searchTerm]);

  const draftCount = requisitions.filter((r) => r.status === 'Draft').length;
  const inApprovalCount = requisitions.filter((r) => r.status === 'InApproval').length;
  const approvedCount = requisitions.filter((r) => r.status === 'Approved').length;

  const openCreate = () => {
    setEditingPr(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = async (row: PurchaseRequisitionListItem) => {
    setPageError(null);
    try {
      const full = await getPurchaseRequisition(row.id);
      setEditingPr(full);
      setFormError(null);
      setFormOpen(true);
    } catch (err: any) {
      setPageError(err?.response?.data?.message ?? 'Failed to load purchase requisition.');
    }
  };

  const openDetail = async (row: PurchaseRequisitionListItem) => {
    setPageError(null);
    try {
      const full = await getPurchaseRequisition(row.id);
      setDetailPr(full);
      setUploadError(null);
      setDetailOpen(true);
    } catch (err: any) {
      setPageError(err?.response?.data?.message ?? 'Failed to load purchase requisition.');
    }
  };

  const handleDelete = async (row: PurchaseRequisitionListItem) => {
    setPageError(null);
    try {
      await deletePurchaseRequisitionDraft(row.id);
      await loadList();
    } catch (err: any) {
      setPageError(err?.response?.data?.message ?? 'Failed to delete draft.');
    }
  };

  const handleFormSubmit = async (values: SavePurchaseRequisitionRequest) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editingPr) {
        await updatePurchaseRequisitionDraft(editingPr.id, values);
      } else {
        await createPurchaseRequisitionDraft(values);
      }
      setFormOpen(false);
      await loadList();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to save purchase requisition.'
      );
    } finally {
      setSaving(false);
    }
  };

  const refreshDetail = async (id: number) => {
    const full = await getPurchaseRequisition(id);
    setDetailPr(full);
    await loadList();
  };

  const handleUploadAttachment = async (file: File, attachmentType: AttachmentType) => {
    if (!detailPr) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadPurchaseRequisitionAttachment(detailPr.id, file, attachmentType);
      await refreshDetail(detailPr.id);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message ?? 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!detailPr) return;
    setUploadError(null);
    try {
      await deletePurchaseRequisitionAttachment(detailPr.id, attachmentId);
      await refreshDetail(detailPr.id);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message ?? 'Failed to remove attachment.');
    }
  };

  const openSubmitDialog = async () => {
    if (!detailPr) return;
    setSubmitError(null);
    try {
      const candidates = await getApproverCandidates(detailPr.id);
      setApproverCandidates(candidates);
      setSubmitOpen(true);
    } catch (err: any) {
      setUploadError(
        err?.response?.data?.message ?? 'Failed to load approver candidates.'
      );
    }
  };

  const handleSubmitForApproval = async (request: SubmitPurchaseRequisitionRequest) => {
    if (!detailPr) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPurchaseRequisition(detailPr.id, request);
      setSubmitOpen(false);
      setDetailOpen(false);
      await loadList();
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to submit for approval.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Purchase Requisitions
          </h2>
          <p className="text-sm text-muted-foreground">
            Raise, track, and submit purchase requisitions for approval.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Requisition
        </Button>
      </div>

      {pageError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Drafts" value={draftCount} icon={FileClock} />
        <KpiCard
          title="In Approval"
          value={inApprovalCount}
          icon={FileClock}
          tone={inApprovalCount > 0 ? 'warning' : 'default'}
        />
        <KpiCard title="Approved" value={approvedCount} icon={FileClock} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Purchase Requisitions</CardTitle>
          <CardDescription>Requisitions you have raised.</CardDescription>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by title or PR number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-xs"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="InApproval">In Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {listError ? (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {listError}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading purchase requisitions…
                  </TableCell>
                </TableRow>
              ) : filteredRequisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No purchase requisitions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequisitions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.prNumber ?? '—'}
                    </TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.departmentName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.currency} {r.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>{r.createdAt.slice(0, 10)}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                      {r.status === 'Draft' ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5 text-red-600" /> Delete
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PrFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        purchaseRequisition={editingPr}
        departments={departments}
        vendors={vendors}
        saving={saving}
        error={formError}
        onSubmit={handleFormSubmit}
      />

      <PrDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        purchaseRequisition={detailPr}
        uploading={uploading}
        uploadError={uploadError}
        onUploadAttachment={handleUploadAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        onOpenSubmit={openSubmitDialog}
      />

      <SubmitPrDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        purchaseRequisition={detailPr}
        candidates={approverCandidates}
        submitting={submitting}
        error={submitError}
        onSubmit={handleSubmitForApproval}
      />
    </div>
  );
}
