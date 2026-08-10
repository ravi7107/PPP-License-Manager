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

const requestFormSchema = z.object({
  proposedUserId: z.string().min(1, 'Select a user'),
  seatId: z.string(),
  remarks: z.string(),
});

export type AssetReallocationRequestFormValues = z.infer<typeof requestFormSchema>;

const EMPTY_REQUEST_FORM: AssetReallocationRequestFormValues = {
  proposedUserId: '',
  seatId: NO_SEAT_VALUE,
  remarks: '',
};

interface AssetReallocationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
  currentUserId?: number | null;
  currentSeatId?: number | null;
  currentSeatLabel?: string | null;
  users: LookupOption[];
  seats: OfficeSeat[];
  saving: boolean;
  error?: string | null;
  onSubmit: (values: AssetReallocationRequestFormValues) => Promise<void>;
}

function seatLabel(seat: OfficeSeat): string {
  const parts = [seat.officeLocationName, seat.floorName, seat.seatCode].filter(Boolean);
  const location = parts.join(' / ');
  return seat.departmentName ? `${location} (${seat.departmentName})` : location;
}

export function AssetReallocationRequestDialog({
  open,
  onOpenChange,
  asset,
  currentUserId,
  currentSeatId,
  currentSeatLabel,
  users,
  seats,
  saving,
  error,
  onSubmit,
}: AssetReallocationRequestDialogProps) {
  const form = useForm<AssetReallocationRequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: EMPTY_REQUEST_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...EMPTY_REQUEST_FORM,
        seatId: currentSeatId ? String(currentSeatId) : NO_SEAT_VALUE,
      });
    }
  }, [open, currentSeatId]);

  if (!asset) return null;

  const safeUsers = Array.isArray(users) ? users : [];
  const safeSeats = Array.isArray(seats) ? seats : [];

  // Can't request reallocating to the user who already has it.
  const selectableUsers = safeUsers.filter((u) => u.id !== currentUserId);

  const selectableSeats = safeSeats.filter(
    (s) => (!s.assetId && !s.userId) || s.id === currentSeatId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Hardware Reallocation</DialogTitle>
          <DialogDescription>
            Request to move {asset.assetTag} ({asset.hostName ?? asset.model ?? 'asset'}) to a
            different user. A Super Admin and an IT Admin will both need to approve before it
            takes effect.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(async (values) => onSubmit(values))}
          >
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="proposedUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reallocate To</FormLabel>
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
                  <p className="text-sm text-muted-foreground">
                    {currentSeatLabel
                      ? `Currently at ${currentSeatLabel}.`
                      : 'This asset isn’t linked to a seat on the office floor map yet.'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for reallocation</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Why does this hardware need to move?…" {...field} />
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
                {saving ? 'Submitting…' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
