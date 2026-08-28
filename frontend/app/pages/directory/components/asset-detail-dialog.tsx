import { useEffect, useState, type ReactNode } from 'react';
import { Landmark, Laptop, MapPin, Pencil, Plus, Trash2, User as UserIcon } from 'lucide-react';

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

import { getSoftware, Software } from '@/lib/api/software.api';
import {
  AssetSoftware,
  createAssetSoftware,
  deleteAssetSoftware,
  getAssetSoftwareByAsset,
  updateAssetSoftware,
} from '@/lib/api/asset-software.api';
import {
  AssetSoftwareFormDialog,
  AssetSoftwareFormValues,
} from '@/app/pages/directory/components/asset-software-form-dialog';
import {
  ResourceAllocation,
  getActiveResourceAllocationsByAsset,
} from '@/lib/api/resource-allocations.api';

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
  // Whether the signed-in user can manage the "Installed Applications"
  // list for this asset (Super Admin / IT Admin, same gate as the rest
  // of the Hardware/Office Locations pages). Everyone else sees it
  // read-only.
  canEdit: boolean;
  // Fires after a reallocation request is submitted successfully, so the
  // parent page can refresh its own "My Reallocation Requests" list.
  onRequestSubmitted?: () => void;
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
  canEdit,
  onRequestSubmitted,
}: AssetDetailDialogProps) {
  const [detail, setDetail] = useState<AssetFullDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [users, setUsers] = useState<LookupOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Installed-software management (Add/Edit/Remove) - separate from the
  // read-only summary that comes back on `detail.installedSoftware`, since
  // that DTO doesn't carry the AssetSoftware row id needed to edit/delete.
  const [installedSoftware, setInstalledSoftware] = useState<AssetSoftware[]>([]);
  const [installedLoading, setInstalledLoading] = useState(false);
  const [softwareCatalog, setSoftwareCatalog] = useState<Software[]>([]);

  const [softwareFormOpen, setSoftwareFormOpen] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<AssetSoftware | null>(null);
  const [softwareSaving, setSoftwareSaving] = useState(false);
  const [softwareError, setSoftwareError] = useState<string | null>(null);

  // Phase 11 - "Allocated Licenses" - licenses tied directly to this asset
  // via ResourceAllocation.AssetId, separate from the "Installed
  // Applications" list above (that's AssetSoftware, an install-tracking
  // record with no relation to who a license is formally allocated to).
  const [allocatedLicenses, setAllocatedLicenses] = useState<ResourceAllocation[]>([]);
  const [allocatedLicensesLoading, setAllocatedLicensesLoading] = useState(false);

  const loadInstalledSoftware = async (assetId: number) => {
    setInstalledLoading(true);

    try {
      const result = await getAssetSoftwareByAsset(assetId);
      setInstalledSoftware(result);
    } catch {
      // Non-fatal - the panel just falls back to showing nothing until
      // this succeeds again on the next open/refresh.
    } finally {
      setInstalledLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !seat?.assetId) {
      setDetail(null);
      setError(null);
      setInstalledSoftware([]);
      setAllocatedLicenses([]);
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

    void loadInstalledSoftware(seat.assetId as number);

    (async () => {
      setAllocatedLicensesLoading(true);

      try {
        const result = await getActiveResourceAllocationsByAsset(seat.assetId as number);

        if (!cancelled) setAllocatedLicenses(result);
      } catch {
        // Non-fatal - the panel just falls back to showing nothing until
        // this succeeds again on the next open/refresh.
      } finally {
        if (!cancelled) setAllocatedLicensesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, seat?.assetId]);

  useEffect(() => {
    if (!open || !canEdit || softwareCatalog.length > 0) return;

    (async () => {
      try {
        const result = await getSoftware();
        setSoftwareCatalog(result.filter((s) => s.isActive));
      } catch {
        // Non-fatal - Add Software will just show an empty picker until
        // this succeeds again on the next open.
      }
    })();
  }, [open, canEdit]);

  const openAddSoftware = () => {
    setEditingSoftware(null);
    setSoftwareError(null);
    setSoftwareFormOpen(true);
  };

  const openEditSoftware = (item: AssetSoftware) => {
    setEditingSoftware(item);
    setSoftwareError(null);
    setSoftwareFormOpen(true);
  };

  const handleSoftwareSubmit = async (values: AssetSoftwareFormValues) => {
    if (!seat?.assetId) return;

    setSoftwareSaving(true);
    setSoftwareError(null);

    try {
      if (editingSoftware) {
        await updateAssetSoftware(editingSoftware.id, {
          version: values.version || '',
          licenseKey: values.licenseKey || null,
          installDate: values.installDate,
          status: values.status,
          remarks: values.remarks || null,
          isActive: values.status !== 'Removed',
        });
      } else {
        await createAssetSoftware({
          assetId: seat.assetId,
          softwareId: Number(values.softwareId),
          version: values.version || '',
          licenseKey: values.licenseKey || null,
          installDate: values.installDate,
          status: values.status,
          remarks: values.remarks || null,
        });
      }

      setSoftwareFormOpen(false);
      setEditingSoftware(null);
      await loadInstalledSoftware(seat.assetId);
    } catch (err: any) {
      setSoftwareError(
        err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          'Unable to save this installed-software record.',
      );
    } finally {
      setSoftwareSaving(false);
    }
  };

  const handleDeleteSoftware = async (item: AssetSoftware) => {
    if (!seat?.assetId) return;

    if (
      !window.confirm(
        `Remove ${item.softwareName} from this asset's installed-software record? This can't be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteAssetSoftware(item.id);
      await loadInstalledSoftware(seat.assetId);
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to remove this installed-software record.',
      );
    }
  };

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
      onRequestSubmitted?.();
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
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    Installed Applications / License Copies
                  </div>

                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={openAddSoftware}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Software
                    </Button>
                  )}
                </div>

                {installedLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : installedSoftware.length === 0 ? (
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
                        {canEdit && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installedSoftware.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.softwareName}</TableCell>
                          <TableCell>{item.version || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.licenseKey || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.status === 'Removed' ? 'outline' : 'default'}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditSoftware(item)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteSoftware(item)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-lg border p-3 sm:col-span-2">
                <div className="mb-2 text-sm font-semibold">
                  Allocated Licenses
                </div>

                {allocatedLicensesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : allocatedLicenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No license is currently allocated directly to this asset.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Software</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Allocated To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Allocated On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocatedLicenses.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.softwareName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.licenseAliasCode}
                          </TableCell>
                          <TableCell>{item.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.allocatedOn.slice(0, 10)}
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

      <AssetSoftwareFormDialog
        open={softwareFormOpen}
        onOpenChange={(open) => {
          setSoftwareFormOpen(open);

          if (!open) setEditingSoftware(null);
        }}
        saving={softwareSaving}
        error={softwareError}
        softwareCatalog={softwareCatalog}
        editing={editingSoftware}
        onSubmit={handleSoftwareSubmit}
      />
    </>
  );
}
