import { useEffect, useState, type ReactNode } from 'react';
import { Landmark, Laptop, MapPin, Pencil, Plus, Trash2, User as UserIcon, X } from 'lucide-react';

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

  // This panel is deliberately not a modal Dialog (see the render below)
  // so it doesn't block map interaction while open - which also means it
  // doesn't get Radix's built-in Escape-to-close behavior for free, so
  // it's wired up by hand here instead. Skipped while either nested
  // Radix dialog (Raise Reallocation Request / Add-Edit Software) is
  // open - those are genuine Radix Dialogs and already handle their own
  // Escape correctly; without this guard, one Escape press would close
  // the nested dialog AND this panel underneath it in the same
  // keystroke, which isn't what a single Escape should do.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (requestOpen || softwareFormOpen) return;

      onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, requestOpen, softwareFormOpen]);

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
      {/*
        Slide-in details panel - deliberately NOT a Radix Dialog. The
        map redesign's whole point is SEARCH -> LOCATE -> ZOOM ->
        HIGHLIGHT -> SHOW DETAILS with the map staying pannable/
        zoomable the entire time this is open, and a modal Dialog's own
        backdrop would trap focus and block exactly that interaction.
        Instead this is a plain fixed-position panel that slides in
        from the right (CSS transform, not conditional mounting) and
        overlays the map without an underlying scrim. It's fixed to the
        viewport rather than positioned relative to its DOM parent, so
        it slides in from the true right edge of the screen regardless
        of where this component happens to be mounted (inside the
        full-screen floor map dialog). Closing it - the X button below,
        Escape (see the effect above), or the caller flipping `open`
        off some other way - never reads or writes any zoom/pan state;
        that lives entirely in OfficeFloorMap, so the map's current
        view is exactly as the user left it when this closes.
      */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={seat?.seatCode ?? 'Workstation details'}
        // Marks this panel so the full-screen map Dialog (a Radix
        // modal in office-locations-page.tsx) can recognize clicks
        // inside it as NOT an "outside click" - see that Dialog's own
        // onPointerDownOutside/onInteractOutside/onEscapeKeyDown
        // handlers, which look for this exact attribute. Without it,
        // Radix's dismissable-layer logic treats this panel (a plain
        // div, not a Radix layer) as outside the map dialog entirely,
        // and closes the whole map the instant anything in here is
        // clicked.
        data-asset-detail-panel="true"
        className={[
          'fixed inset-y-0 right-0 z-[200] flex w-full max-w-md flex-col',
          'border-l bg-background shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {seat?.seatCode ?? 'Workstation'}
            </p>

            <p className="text-xs text-muted-foreground">
              {seat?.assetId
                ? 'System, installed software, and current holder for this workstation.'
                : 'This workstation is vacant - no asset is currently placed here.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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
            <div className="space-y-4">
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

              <div className="rounded-lg border p-3">
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
                  <div className="overflow-x-auto">
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
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3">
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
                  <div className="overflow-x-auto">
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
                  </div>
                )}
              </div>

              {canRequestReallocation && detail.userId && (
                <div>
                  <Button onClick={openReallocationRequest}>
                    Raise Reallocation Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
