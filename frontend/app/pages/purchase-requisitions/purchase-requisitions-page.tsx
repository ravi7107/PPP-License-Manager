import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileClock, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { KpiCard } from '@/components/layout/kpi-card';

import { Company, getCompanies } from '@/lib/api/companies.api';
import { Vendor, getVendors } from '@/lib/api/vendors.api';

import {
  AttachmentType,
  createPurchaseRequisitionDraft,
  deletePurchaseRequisitionAttachment,
  deletePurchaseRequisitionDraft,
  getApproverCandidates,
  getInitiatorCandidates,
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

function statusPillClass(status: string): string {
  switch (status) {
    case 'Approved':
      return 'nova-pill-success';
    case 'Rejected':
      return 'nova-pill-danger';
    case 'Draft':
      return 'nova-pill-neutral';
    default:
      return 'nova-pill-pending';
  }
}

export default function PurchaseRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisitionListItem[]>([]);
  const [entities, setEntities] = useState<Company[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approverCandidates, setApproverCandidates] = useState<
    PurchaseRequisitionApproverCandidate[]
  >([]);
  const [initiatorCandidates, setInitiatorCandidates] = useState<
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
    void getCompanies()
      .then(setEntities)
      .catch(() => setEntities([]));
    void getVendors()
      .then(setVendors)
      .catch(() => setVendors([]));
    void getInitiatorCandidates()
      .then(setInitiatorCandidates)
      .catch(() => setInitiatorCandidates([]));
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
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Purchase Requisitions</h1>
          <p className="nova-cmdbar-desc">
            Raise, track, and submit purchase requisitions for approval.
          </p>
        </div>

        <div className="nova-cmdbar-actions">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New Requisition
          </Button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="relative w-full sm:max-w-xs">
            <Input
              placeholder="Search by title or PR number…"
              className="h-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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

          <div className="nova-spacer" />

          <span className="nova-muted-count">
            {filteredRequisitions.length} requisition{filteredRequisitions.length === 1 ? '' : 's'}
          </span>
        </div>

        {listError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {listError}
          </div>
        ) : null}

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>PR Number</th>
                <th>Title</th>
                <th>Entity</th>
                <th>Status</th>
                <th className="nova-right">Total</th>
                <th>Created</th>
                <th className="nova-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading purchase requisitions…
                  </td>
                </tr>
              ) : filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No purchase requisitions found.
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((r) => (
                  <tr key={r.id}>
                    <td className="nova-mono">
                      {r.prNumber ?? '—'}
                    </td>
                    <td>{r.title}</td>
                    <td className="nova-cell-sub">{r.companyName}</td>
                    <td>
                      <span className={`nova-pill ${statusPillClass(r.status)}`}>
                        <span className="nova-dot" />
                        {r.status}
                      </span>
                    </td>
                    <td className="nova-right">
                      {r.currency} {r.totalAmount.toFixed(2)}
                    </td>
                    <td className="nova-cell-faint">{r.createdAt.slice(0, 10)}</td>
                    <td className="nova-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                      {r.status === 'Draft' ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Delete
                          </Button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PrFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        purchaseRequisition={editingPr}
        entities={entities}
        vendors={vendors}
        initiatorCandidates={initiatorCandidates}
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
