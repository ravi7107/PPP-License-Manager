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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetRecord, LookupOption } from '@/app/pages/hardware/types';
import { OfficeSeat } from '@/lib/api/office-locations.api';

const NO_SEAT_VALUE = '__none__';

const transferFormSchema = z.object({
  userId: z.string().min(1, 'Select a user'),
  seatId: z.string(),
  notes: z.string(),
});

export type AssetTransferFormValues = z.infer<typeof transferFormSchema>;

const EMPTY_TRANSFER_FORM: AssetTransferFormValues = {
  userId: '',
  seatId: NO_SEAT_VALUE,
  notes: '',
};

interface AssetTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
  isReassignment: boolean;
  currentUserId?: number | null;
  currentSeatId?: number | null;
  currentSeatLabel?: string | null;
  users: LookupOption[];
  seats: OfficeSeat[];
  saving: boolean;
  error?: string | null;
  onSubmit: (values: AssetTransferFormValues) => Promise<void>;
}

function seatLabel(seat: OfficeSeat): string {
  const parts = [seat.officeLocationName, seat.floorName, seat.seatCode].filter(Boolean);
  const location = parts.join(' / ');
  return seat.departmentName ? `${location} (${seat.departmentName})` : location;
}

export function AssetTransferDialog({
  open,
  onOpenChange,
  asset,
  isReassignment,
  currentUserId,
  currentSeatId,
  currentSeatLabel,
  users,
  seats,
  saving,
  error,
  onSubmit,
}: AssetTransferDialogProps) {
  const form = useForm<AssetTransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: EMPTY_TRANSFER_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...EMPTY_TRANSFER_FORM,
        // Reassignment starts out keeping the asset on its current seat
        // (if any); the user can still pick a different one or clear it.
        seatId: currentSeatId ? String(currentSeatId) : NO_SEAT_VALUE,
      });
    }
  }, [open, currentSeatId]);

  if (!asset) return null;

  const safeUsers = Array.isArray(users) ? users : [];
  const safeSeats = Array.isArray(seats) ? seats : [];

  // A reassignment can't go to the user who already has the asset.
  const selectableUsers = isReassignment
    ? safeUsers.filter((u) => u.id !== currentUserId)
    : safeUsers;

  // A seat can be picked if it's vacant, or if it's the seat this asset
  // already occupies (so reassignment can keep it selected).
  const selectableSeats = safeSeats.filter(
    (s) => (!s.assetId && !s.userId) || s.id === currentSeatId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReassignment ? 'Reassign Hardware' : 'Allocate Hardware'}
          </DialogTitle>
          <DialogDescription>
            {isReassignment
              ? `Reassign ${asset.assetTag} (${asset.hostName ?? asset.model ?? 'asset'}) to a different user.`
              : `Allocate ${asset.assetTag} (${asset.hostName ?? asset.model ?? 'asset'}) to a user.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectableUsers.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No users available
                        </div>
                      ) : (
                        selectableUsers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name ?? u.name ?? 'Unnamed User'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat (optional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No seat" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SEAT_VALUE}>
                        No seat (won&apos;t show on the office floor map)
                      </SelectItem>
                      {selectableSeats.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No vacant seats set up yet
                        </div>
                      ) : (
                        selectableSeats.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {seatLabel(s)}
                            {s.id === currentSeatId ? ' (current)' : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isReassignment && (
                    <p className="text-sm text-muted-foreground">
                      {currentSeatLabel
                        ? `Currently at ${currentSeatLabel}. Pick a different seat to move it, or "No seat" to unseat it.`
                        : 'This asset isn’t linked to a seat on the office floor map yet.'}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for allocation…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? isReassignment
                    ? 'Reassigning…'
                    : 'Allocating…'
                  : isReassignment
                    ? 'Reassign'
                    : 'Allocate'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
