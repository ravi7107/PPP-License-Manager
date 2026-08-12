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

export type ReallocationRequestType =
  | 'Reassign'
  | 'Reseat'
  | 'RemoteMode'
  | 'ReturnToOffice';

const REQUEST_TYPE_OPTIONS: {
  value: ReallocationRequestType;
  label: string;
  description: string;
}[] = [
  {
    value: 'Reassign',
    label: 'Reallocate to another user',
    description: 'Move this asset to a different employee (optionally into a different seat too).',
  },
  {
    value: 'Reseat',
    label: 'Move to another seat',
    description: 'Same employee keeps the asset - just move it to a different workstation on the floor map.',
  },
  {
    value: 'RemoteMode',
    label: 'Set to Remote / WFH',
    description: 'Employee takes this asset home. It stays assigned to them but is removed from the office floor map.',
  },
  {
    value: 'ReturnToOffice',
    label: 'Return to office',
    description: 'Bring a Remote/WFH asset back to the office, optionally into a specific seat.',
  },
];

const requestFormSchema = z
  .object({
    requestType: z.enum(['Reassign', 'Reseat', 'RemoteMode', 'ReturnToOffice']),
    proposedUserId: z.string(),
    seatId: z.string(),
    remarks: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.requestType === 'Reassign' && !values.proposedUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposedUserId'],
        message: 'Select a user',
      });
    }

    if (
      values.requestType === 'Reseat' &&
      (!values.seatId || values.seatId === NO_SEAT_VALUE)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['seatId'],
        message: 'Select a seat',
      });
    }
  });

export type AssetReallocationRequestFormValues = z.infer<typeof requestFormSchema>;

const EMPTY_REQUEST_FORM: AssetReallocationRequestFormValues = {
  requestType: 'Reassign',
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
  // "Office" or "Remote" - determines whether "Set to Remote / WFH" or
  // "Return to office" is offered.
  currentWorkMode?: string | null;
  // Used to filter the seat picker down to seats the backend will actually
  // accept for this asset (same company as the asset's department, and
  // either department-agnostic or matching the asset's department).
  assetDepartmentId?: number | null;
  assetCompanyId?: number | null;
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
  currentWorkMode,
  assetDepartmentId,
  assetCompanyId,
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

  const requestType = form.watch('requestType');

  if (!asset) return null;

  const isRemote = currentWorkMode === 'Remote';

  const availableTypes = REQUEST_TYPE_OPTIONS.filter((option) => {
    if (option.value === 'RemoteMode') return !isRemote;
    if (option.value === 'ReturnToOffice') return isRemote;
    return true;
  });

  const safeUsers = Array.isArray(users) ? users : [];
  const safeSeats = Array.isArray(seats) ? seats : [];

  // Can't request reallocating to the user who already has it.
  const selectableUsers = safeUsers.filter((u) => u.id !== currentUserId);

  // The asset's current seat always stays selectable/visible, even if it
  // wouldn't pass the compatibility checks below (it's already assigned
  // there). A *new* seat can only be picked if it's vacant and compatible
  // with this asset:
  //  - same company as the asset's department (the backend rejects
  //    cross-company seat/workstation pairings), AND
  //  - either department-agnostic or matching the asset's department.
  const selectableSeats = safeSeats.filter((s) => {
    if (s.id === currentSeatId) return true;

    const isVacant = !s.assetId && !s.userId;

    const isSameCompany =
      assetCompanyId == null || s.companyId === assetCompanyId;

    const isCompatibleDepartment =
      !s.departmentId || s.departmentId === assetDepartmentId;

    return isVacant && isSameCompany && isCompatibleDepartment;
  });

  const showUserField = requestType === 'Reassign';
  const showSeatField = requestType === 'Reassign' || requestType === 'Reseat' || requestType === 'ReturnToOffice';
  const seatRequired = requestType === 'Reseat';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Hardware Reallocation</DialogTitle>
          <DialogDescription>
            {asset.assetTag} ({asset.hostName ?? asset.model ?? 'asset'}). A Super Admin and an
            IT Admin will both need to approve before it takes effect.
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
              name="requestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you want to do?</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {availableTypes.find((o) => o.value === field.value)?.description}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showUserField && (
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
            )}

            {showSeatField && (
              <FormField
                control={form.control}
                name="seatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Seat {seatRequired ? '' : '(optional)'}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!seatRequired && (
                          <SelectItem value={NO_SEAT_VALUE}>
                            No seat (won&apos;t show on the office floor map)
                          </SelectItem>
                        )}
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
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Why does this hardware need to change?…" {...field} />
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
