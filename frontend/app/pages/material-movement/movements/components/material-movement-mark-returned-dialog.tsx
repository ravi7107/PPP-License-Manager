import { useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';

import { RgpTrackingItem } from '@/lib/api/material-movements.api';

interface MaterialMovementMarkReturnedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RgpTrackingItem | null;
  saving: boolean;
  error: string | null;
  onConfirm: (remarks: string | null) => void;
}

// Confirms closing out an RGP (Returnable Gate Pass) - a dispatched
// TemporaryMovement actually coming back. Remarks are optional (mirrors
// DecideMaterialMovementRequest/MarkReturnedRequest on the backend -
// neither has [Required] on their text field), same single-step confirm
// pattern as MaterialMovementDecisionDialog.
export function MaterialMovementMarkReturnedDialog({
  open,
  onOpenChange,
  item,
  saving,
  error,
  onConfirm,
}: MaterialMovementMarkReturnedDialogProps) {
  const [remarks, setRemarks] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);

        if (!next) {
          setRemarks('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark RGP returned?</DialogTitle>

          <DialogDescription>
            {item
              ? `${item.movementNumber ?? `#${item.id}`} — confirms the material has physically come back.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-xs">Remarks (optional)</Label>
          <Textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Add any remarks about the condition of the returned material…"
            disabled={saving}
          />
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

          <Button
            type="button"
            disabled={saving}
            onClick={() => onConfirm(remarks.trim() === '' ? null : remarks.trim())}
          >
            {saving ? 'Saving…' : 'Mark Returned'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
