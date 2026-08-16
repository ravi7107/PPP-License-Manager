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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { MaterialMovementListItem } from '@/lib/api/material-movements.api';
import { MaterialTransporter } from '@/lib/api/material-transporters.api';

const NONE = '__none__';

interface MaterialMovementDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MaterialMovementListItem | null;
  transporters: MaterialTransporter[];
  saving: boolean;
  error: string | null;
  onConfirm: (transporterId: number | null, vehicleNumber: string | null) => void;
}

// Transporter and vehicle number are both optional - a movement can be
// hand-carried internally with neither set (see MaterialMovementDispatch's
// doc comment: "when goods travel via a third-party carrier rather than
// an internal vehicle/hand-carry").
export function MaterialMovementDispatchDialog({
  open,
  onOpenChange,
  movement,
  transporters,
  saving,
  error,
  onConfirm,
}: MaterialMovementDispatchDialogProps) {
  const [transporterId, setTransporterId] = useState(NONE);
  const [vehicleNumber, setVehicleNumber] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);

        if (!next) {
          setTransporterId(NONE);
          setVehicleNumber('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispatch movement</DialogTitle>

          <DialogDescription>
            {movement
              ? `${movement.movementNumber ?? `#${movement.id}`} — generates a Gate Pass number and PDF.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Transporter (optional)</Label>
            <Select value={transporterId} onValueChange={setTransporterId}>
              <SelectTrigger>
                <SelectValue placeholder="None (hand-carried / internal vehicle)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {transporters
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Vehicle number (optional)</Label>
            <Input
              value={vehicleNumber}
              onChange={(event) => setVehicleNumber(event.target.value)}
              placeholder="e.g. MH-12-AB-1234"
            />
          </div>
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
            onClick={() =>
              onConfirm(
                transporterId === NONE ? null : Number(transporterId),
                vehicleNumber.trim() === '' ? null : vehicleNumber.trim()
              )
            }
          >
            {saving ? 'Dispatching…' : 'Dispatch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
