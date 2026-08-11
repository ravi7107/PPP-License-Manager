import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  PurchaseRequisition,
  PurchaseRequisitionApproverCandidate,
  SubmitPurchaseRequisitionRequest,
} from '@/lib/api/purchase-requisitions.api';

interface StageRow {
  approverUserId: string;
}

interface SubmitPrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequisition: PurchaseRequisition | null;
  candidates: PurchaseRequisitionApproverCandidate[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (request: SubmitPurchaseRequisitionRequest) => Promise<void>;
}

const MAX_STAGES = 3;

export function SubmitPrDialog({
  open,
  onOpenChange,
  purchaseRequisition,
  candidates,
  submitting,
  error,
  onSubmit,
}: SubmitPrDialogProps) {
  const [stages, setStages] = useState<StageRow[]>([{ approverUserId: '' }]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStages([{ approverUserId: '' }]);
      setLocalError(null);
    }
  }, [open, purchaseRequisition]);

  const updateStage = (index: number, approverUserId: string) => {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { approverUserId } : s))
    );
  };

  const addStage = () => {
    if (stages.length >= MAX_STAGES) return;
    setStages((prev) => [...prev, { approverUserId: '' }]);
  };

  const removeStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLocalError(null);

    if (stages.some((s) => !s.approverUserId)) {
      setLocalError('Select an approver for every stage.');
      return;
    }

    const approverIds = stages.map((s) => s.approverUserId);
    if (new Set(approverIds).size !== approverIds.length) {
      setLocalError('Each stage must have a different approver.');
      return;
    }

    await onSubmit({
      approvalStages: stages.map((s, index) => ({
        stepOrder: index + 1,
        approverUserId: Number(s.approverUserId),
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription>
            Choose who approves this requisition, in order. Once submitted,
            {' '}
            {purchaseRequisition?.title ?? 'this requisition'} can no longer
            be edited.
          </DialogDescription>
        </DialogHeader>

        {(error || localError) && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error ?? localError}
          </div>
        )}

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Stage {index + 1} Approver *</Label>
                <Select
                  value={stage.approverUserId}
                  onValueChange={(value) => updateStage(index, value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        No eligible approvers found
                      </div>
                    ) : (
                      candidates.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.fullName}
                          {c.departmentName ? ` (${c.departmentName})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={stages.length === 1}
                onClick={() => removeStage(index)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}

          {stages.length < MAX_STAGES && (
            <Button type="button" variant="outline" size="sm" onClick={addStage}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Stage
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
