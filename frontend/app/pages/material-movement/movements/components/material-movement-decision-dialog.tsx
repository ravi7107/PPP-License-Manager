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

import { MaterialMovementListItem } from '@/lib/api/material-movements.api';

interface MaterialMovementDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MaterialMovementListItem | null;
  mode: 'approve' | 'reject';
  saving: boolean;
  error: string | null;
  onConfirm: (comments: string | null) => void;
}

// One dialog for both Approve and Reject - which action it takes is set
// by `mode`, same split as Purchase Requisition's public approval page.
// Comments are optional either way (see DecideMaterialMovementRequest on
// the backend - no [Required] on Comments), so this stays a single,
// simple confirm step rather than PR's public-link flow, since Material
// Movement approvers are always logged-in internal users acting from
// inside the app, not an emailed link.
export function MaterialMovementDecisionDialog({
  open,
  onOpenChange,
  movement,
  mode,
  saving,
  error,
  onConfirm,
}: MaterialMovementDecisionDialogProps) {
  const [comments, setComments] = useState('');

  const isApprove = mode === 'approve';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);

        if (!next) {
          setComments('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve movement?' : 'Reject movement?'}
          </DialogTitle>

          <DialogDescription>
            {movement
              ? `${movement.movementNumber ?? `#${movement.id}`} — ${movement.movementType}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-xs">Comments (optional)</Label>
          <Textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder={
              isApprove
                ? 'Add any comments for the record…'
                : 'Add a reason for rejecting…'
            }
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
            variant={isApprove ? 'default' : 'destructive'}
            disabled={saving}
            onClick={() => onConfirm(comments.trim() === '' ? null : comments.trim())}
          >
            {saving
              ? 'Saving…'
              : isApprove
                ? 'Approve'
                : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
