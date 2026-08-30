import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Landmark,
  Laptop,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  // Compact-view collapse state for the two data-table sections. Both
  // default to collapsed so System + Assigned To - the two sections a
  // user needs on every open - fit inside the panel without needing to
  // scroll at all, sidestepping the panel's own wheel-scroll entirely
  // for the common case. Reset to collapsed on every new seat/asset open
  // below so a previous seat's expanded state doesn't carry over.
  const [installedAppsExpanded, setInstalledAppsExpanded] = useState(false);
  const [allocatedLicensesExpanded, setAllocatedLicensesExpanded] = useState(false);

  // This panel is a genuine Radix Dialog (see the render below), stacked
  // on top of the full-screen map Dialog it's opened from - exactly the
  // same nesting pattern already used successfully by the "Raise
  // Reallocation Request" and "Add/Edit Software" dialogs launched from
  // within this same panel further down this file. Radix tracks open
  // dialogs as a layer stack (not by DOM containment), so this gets, for
  // free and without any hand-rolled guards: Escape closes only the
  // topmost open layer; a click anywhere NOT inside the topmost layer -
  // including on a <Select> dropdown or another dialog portalled
  // elsewhere in the DOM - is correctly attributed to that layer instead
  // of misfiring an "outside click" on a dialog further down the stack;
  // background (map) scroll/interaction is locked while this is open;
  // and the content area below scrolls natively via plain
  // `overflow-y-auto`, no manual wheel/touch handling required.
  //
  // This replaces an earlier "plain fixed-position div" version of this
  // panel that deliberately avoided being a real Dialog so the map could
  // stay interactive underneath it. That approach needed hand-written
  // guards to stop the map's own Dialog from treating clicks inside this
  // panel as "outside clicks," and those guards only work for elements
  // that are actual DOM descendants of the panel - which a dropdown menu
  // or a nested dialog portalled to the document body is not. That gap
  // is exactly what let clicking things like "Raise Reallocation
  // Request" or a dropdown inside this panel close the whole map dialog
  // underneath it. Making this a real, properly nested Dialog removes
  // the guesswork entirely: viewing a seat's details is now a deliberate
  // action the user opens and closes explicitly, and the map simply
  // isn't interactive while it's open - matching how every other modal
  // in this app already behaves.

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

  // Collapse both data-table sections again whenever a different seat's
  // panel opens, so an earlier seat's "expanded" choice doesn't carry
  // over and silently defeat the compact default for the next one.
  useEffect(() => {
    setInstalledAppsExpanded(false);
    setAllocatedLicensesExpanded(false);
  }, [seat?.assetId]);

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
        A genuine, nested Radix Dialog - stacked on top of the
        full-screen map Dialog it's opened from - rather than the plain
        fixed-position "stay open alongside the map" panel this used to
        be. See the comment above this component's state declarations
        for why: that version needed hand-rolled outside-click guards
        that couldn't see clicks on anything portalled elsewhere in the
        DOM (a dropdown, a nested dialog), which is exactly what let
        clicking things like "Raise Reallocation Request" close the
        whole map underneath this panel. Being a real Dialog means the
        map is deliberately not interactive while this is open - opening
        seat details is now a focused, deliberate action the user closes
        explicitly (X, Escape, or clicking the overlay), matching every
        other modal in this app.
      */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-4 py-3 pr-10 text-left">
            <DialogTitle className="truncate text-base">
              {seat?.seatCode ?? 'Workstation'}
            </DialogTitle>

            <DialogDescription>
              {seat?.assetId
                ? 'System, installed software, and current holder for this workstation.'
                : 'This workstation is vacant - no asset is currently placed here.'}
            </DialogDescription>
          </DialogHeader>

          {/*
            min-h-0 is required here, not optional Tailwind polish: a
            flex item's default min-height is `auto`, which resolves to
            its content's height - so without this, this flex-1 child
            would refuse to shrink below the full height of everything
            inside it (System/Assigned To/Installed Applications/
            Allocated Licenses), and overflow-y-auto would never
            actually have anything to clip or scroll; the content would
            instead push DialogContent's own max-h-[85vh] cap open.
            min-h-0 lets this element actually be constrained to the
            space the header leaves it within that cap.

            Plain native overflow-y-auto scrolling is all that's needed
            here - no manual wheel handling, since this is now a real
            modal layer and there's nothing "underneath" for a wheel
            gesture to leak into. overscrollBehavior: 'contain' is kept
            as a lightweight belt-and-suspenders against rubber-band
            scroll chaining at the top/bottom of this content, though
            Radix's own modal scroll-lock already keeps everything
            behind the overlay from moving.
          */}
          <div
            className="min-h-0 flex-1 overflow-y-auto p-4"
            style={{ overscrollBehavior: 'contain' }}
          >
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
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setInstalledAppsExpanded((v) => !v)}
                    aria-expanded={installedAppsExpanded}
                    className="flex flex-1 items-center gap-2 text-left text-sm font-semibold"
                  >
                    {installedAppsExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>Installed Applications / License Copies</span>
                    {!installedLoading && (
                      <Badge variant="secondary" className="ml-1">
                        {installedSoftware.length}
                      </Badge>
                    )}
                  </button>

                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={openAddSoftware}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Software
                    </Button>
                  )}
                </div>

                {installedAppsExpanded && (
                  <div className="mt-2">
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
                )}
              </div>

              <div className="rounded-lg border p-3">
                <button
                  type="button"
                  onClick={() => setAllocatedLicensesExpanded((v) => !v)}
                  aria-expanded={allocatedLicensesExpanded}
                  className="flex w-full items-center gap-2 text-left text-sm font-semibold"
                >
                  {allocatedLicensesExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>Allocated Licenses</span>
                  {!allocatedLicensesLoading && (
                    <Badge variant="secondary" className="ml-1">
                      {allocatedLicenses.length}
                    </Badge>
                  )}
                </button>

                {allocatedLicensesExpanded && (
                  <div className="mt-2">
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
