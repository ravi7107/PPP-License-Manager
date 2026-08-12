import { useEffect, useState, type ReactNode } from 'react';
import { Landmark, Laptop, MapPin, User as UserIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  AssetFullDetail,
  OfficeSeat,
  getAssetFullDetail,
} from '@/lib/api/office-locations.api';

import { getUsers } from '@/lib/api/users.api';
import { LookupOption, AssetRecord } from '@/app/pages/hardware/types';

import {
  AssetReallocationRequestDialog,
  AssetReallocationRequestFormValues,
} from '@/app/pages/hardware/components/asset-reallocation-request-dialog';

import {
  createReallocationRequest,
} from '@/lib/api/asset-reallocation-requests.api';

interface AssetDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seat: OfficeSeat | null;
  seats: OfficeSeat[];
  // Whether the signed-in user is allowed to raise a reallocation request
  // (Team Lead/Manager). Super Admin/IT Admin use direct
  // Assign/Transfer/Return from the Hardware page instead, so the button
  // here is scoped to the request-workflow roles only.
  canRequestReallocation: boolean;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
  );
}

export function AssetDetailDialog({
  open,
  onOpenChange,
  seat,
  seats,
  canRequestReallocation,
}: AssetDetailDialogProps) {
  const [detail, setDetail] = useState<AssetFullDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [users, setUsers] = useState<LookupOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!open || !seat?.assetId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getAssetFullDetail(seat.assetId as number);

        if (!cancelled) setDetail(result);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load this asset’s details.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, seat?.assetId]);

  const openReallocationRequest = async () => {
    setRequestError(null);
    setRequestOpen(true);

    if (users.length === 0 && !usersLoading) {
      setUsersLoading(true);

      try {
        const paged = await getUsers('', 1, 200);

        setUsers(
          (paged.items ?? []).map((u) => ({
            id: u.id,
            full_name: u.fullName,
          })),
        );
      } catch {
        // Non-fatal - the user picker just shows "No users available"
        // until this succeeds; the rest of the panel still works.
      } finally {
        setUsersLoading(false);
      }
    }
  };

  const handleReallocationSubmit = async (
    values: AssetReallocationRequestFormValues,
  ) => {
    if (!detail) return;

    setRequestSaving(true);
    setRequestError(null);

    const parsedSeatId = Number(values.seatId);
    const seatId =
      values.seatId && values.seatId !== '__none__' && !Number.isNaN(parsedSeatId)
        ? parsedSeatId
        : null;

    try {
      await createReallocationRequest({
        assetId: detail.assetId,
        requestType: values.requestType,
        proposedUserId:
          values.requestType === 'Reassign'
            ? Number(values.proposedUserId)
            : null,
        proposedSeatId: seatId,
        remarks: values.remarks || null,
      });

      setRequestOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      setRequestError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to submit this reallocation request. Please try again.',
      );
    } finally {
      setRequestSaving(false);
    }
  };

  const pseudoAsset = detail
    ? ({
        id: detail.assetId,
        assetTag: detail.assetTag,
        assetName: detail.assetName,
        assetType: detail.assetType,
        hostName: detail.hostName ?? undefined,
        model: detail.model ?? undefined,
        departmentId: detail.departmentId ?? 0,
        departmentName: detail.departmentName ?? '',
        status: detail.status,
        isReadyForAssignment: false,
        isActive: true,
      } as unknown as AssetRecord)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {seat?.seatCode ?? 'Workstation'}
            </DialogTitle>
            <DialogDescription>
              {seat?.assetId
                ? 'System, installed software, and current holder for this workstation.'
                : 'This workstation is vacant - no asset is currently placed here.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}

          {!loading && !error && !seat?.assetId && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No system is assigned to this seat yet.
            </div>
          )}

          {!loading && !error && detail && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Laptop className="h-4 w-4" />
                  System
                </div>

                <DetailRow label="Asset Tag" value={detail.assetTag} />
                <DetailRow label="Name" value={detail.assetName} />
                <DetailRow label="Type" value={detail.assetType} />
                <DetailRow label="Hostname" value={detail.hostName} />
                <DetailRow
                  label="Make / Model"
                  value={[detail.manufacturer, detail.model].filter(Boolean).join(' / ') || '—'}
                />
                <DetailRow label="Serial No." value={detail.serialNumber} />
                <DetailRow label="OS" value={detail.operatingSystem} />
                <DetailRow
                  label="Specs"
                  value={
                    [
                      detail.processor,
                      detail.ramGb ? `${detail.ramGb} GB RAM` : null,
                      detail.storageGb ? `${detail.storageGb} GB Storage` : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
                <DetailRow
                  label="Status"
                  value={<Badge variant="outline">{detail.status}</Badge>}
                />
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <UserIcon className="h-4 w-4" />
                  Assigned To
                </div>

                {detail.userId ? (
                  <>
                    <DetailRow label="Employee" value={detail.userName} />
                    <DetailRow label="Employee Code" value={detail.employeeCode} />
                    <DetailRow label="Email" value={detail.userEmail} />
                    <DetailRow label="Department" value={detail.departmentName} />
                    <DetailRow
                      label="Entity"
                      value={
                        detail.companyName ? (
                          <span className="inline-flex items-center gap-1">
                            <Landmark className="h-3 w-3" />
                            {detail.companyName}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <DetailRow
                      label="Work Mode"
                      value={
                        <Badge variant={detail.workMode === 'Remote' ? 'secondary' : 'outline'}>
                          {detail.workMode === 'Remote' ? 'Remote / WFH' : 'Office'}
                        </Badge>
                      }
                    />
                    <DetailRow
                      label="Seat"
                      value={
                        detail.seatCode ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[detail.officeLocationName, detail.floorName, detail.seatCode]
                              .filter(Boolean)
                              .join(' / ')}
                          </span>
                        ) : (
                          'Not on the floor map'
                        )
                      }
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This asset isn&apos;t currently assigned to anyone.
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-3 sm:col-span-2">
                <div className="mb-2 text-sm font-semibold">
                  Installed Applications / License Copies
                </div>

                {detail.installedSoftware.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No software has been recorded as installed on this asset.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Software</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>License Key</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.installedSoftware.map((item) => (
                        <TableRow key={item.softwareId + item.softwareName}>
                          <TableCell>{item.softwareName}</TableCell>
                          <TableCell>{item.version || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.licenseKey || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {canRequestReallocation && detail.userId && (
                <div className="sm:col-span-2">
                  <Button onClick={openReallocationRequest}>
                    Raise Reallocation Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AssetReallocationRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        asset={pseudoAsset}
        currentUserId={detail?.userId ?? null}
        currentSeatId={detail?.seatId ?? null}
        currentSeatLabel={
          detail?.seatCode
            ? [detail.officeLocationName, detail.floorName, detail.seatCode]
                .filter(Boolean)
                .join(' / ')
            : null
        }
        currentWorkMode={detail?.workMode ?? null}
        assetDepartmentId={detail?.departmentId ?? null}
        assetCompanyId={detail?.companyId ?? null}
        users={users}
        seats={seats}
        saving={requestSaving}
        error={requestError}
        onSubmit={handleReallocationSubmit}
      />
    </>
  );
}
