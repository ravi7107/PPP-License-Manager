import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  MapPin,
  Layers3,
  Armchair,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Map,
  Upload,
  Search,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  OfficeLocation,
  OfficeFloor,
  OfficeSeat,
  getOfficeLocations,
  getOfficeFloors,
  getOfficeSeats,
  createOfficeLocation,
  createOfficeFloor,
  createOfficeSeat,
  updateOfficeLocation,
  updateOfficeFloor,
  updateOfficeSeat,
  deleteOfficeLocation,
  deleteOfficeFloor,
  deleteOfficeSeat,
  uploadOfficeFloorMap,
} from '@/lib/api/office-locations.api';

import {
  Company,
  getCompanies,
} from '@/lib/api/companies.api';

import {
  Department,
  getDepartments,
} from '@/lib/api/departments.api';

import OfficeFloorMap, {
  isOccupied as isSeatOccupied,
  matchesSearch as seatMatchesSearch,
  type OfficeFloorMapHandle,
} from '@/app/pages/directory/components/office-floor-map';
import { AssetDetailDialog } from '@/app/pages/directory/components/asset-detail-dialog';

import { useAuth } from '@/lib/auth/auth-context';
import {
  canManage,
  isTeamLeader,
  isManagement,
  type AppRole,
} from '@/lib/auth/roles';
import { ReallocationRequestsPanel } from '@/app/pages/hardware/components/reallocation-requests-panel';

type DialogMode = 'create' | 'edit';

export default function OfficeLocationsPage() {
  const { user } = useAuth();

  const userRoles: AppRole[] =
    user?.role ? [user.role as AppRole] : [];

  const canEdit = canManage(userRoles);

  // Team Lead and Manager can both raise a hardware reallocation request
  // from here (same role gate as AssetReallocationRequestController's
  // Create endpoint) - Super Admin/IT Admin use direct Assign/Transfer
  // from the Hardware page instead. Manager doesn't have the separate
  // "hardware" module, but they do reach this dialog through Office
  // Locations, which they can already access - the request itself is
  // entity-scoped server-side the same way every other Manager-visible
  // hardware/license record already is.
  const canRequestReallocation =
    isTeamLeader(userRoles) || isManagement(userRoles);

  const [reallocationRefreshToken, setReallocationRefreshToken] =
    useState(0);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [floors, setFloors] = useState<OfficeFloor[]>([]);
  const [seats, setSeats] = useState<OfficeSeat[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locationDialog, setLocationDialog] = useState(false);
  const [floorDialog, setFloorDialog] = useState(false);
  const [seatDialog, setSeatDialog] = useState(false);

  const [locationMode, setLocationMode] = useState<DialogMode>('create');
  const [floorMode, setFloorMode] = useState<DialogMode>('create');
  const [seatMode, setSeatMode] = useState<DialogMode>('create');

  const [selectedLocation, setSelectedLocation] = useState<OfficeLocation | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<OfficeFloor | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<OfficeSeat | null>(null);

  const [saving, setSaving] = useState(false);

  // Floor map UI
  const [mapDialog, setMapDialog] = useState(false);
  const [mapFloor, setMapFloor] = useState<OfficeFloor | null>(null);
  const [mapUploadingFloorId, setMapUploadingFloorId] =
    useState<number | null>(null);

  // When on, clicking the map places a brand-new seat at that position
  // instead of the default drag-to-reposition/click-to-edit behavior.
  const [mapAddSeatMode, setMapAddSeatMode] = useState(false);

  // Imperative handle onto the currently-open OfficeFloorMap instance -
  // this is how the sticky header's Fit Map click and search-result
  // clicks drive the camera (fitMap()/focusSeat()), since both are
  // one-shot commands rather than values the map re-renders against.
  const floorMapRef = useRef<OfficeFloorMapHandle>(null);

  // Sticky-header search box, and the currently-highlighted seat (set on
  // a search-result click, cleared when the map dialog itself closes).
  // Both are owned here rather than inside OfficeFloorMap, since the
  // search input/dropdown now live in this page's header, not in that
  // component.
  const [mapSearchText, setMapSearchText] = useState('');
  const [mapSearchDropdownOpen, setMapSearchDropdownOpen] = useState(false);
  const [mapSelectedSeatId, setMapSelectedSeatId] = useState<number | null>(null);

  // Double-click detail panel - available to every role that can open the
  // map (Team Lead/Manager included), unlike single-click-to-edit which
  // stays canEdit-only.
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailSeat, setDetailSeat] = useState<OfficeSeat | null>(null);

  const [locationForm, setLocationForm] = useState({
    companyId: '',
    locationCode: '',
    locationName: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    isActive: true,
  });

  const [floorForm, setFloorForm] = useState({
    officeLocationId: '',
    floorCode: '',
    floorName: '',
    sortOrder: '1',
    isActive: true,
  });

  const [seatForm, setSeatForm] = useState({
    officeFloorId: '',
    seatCode: '',
    seatName: '',
    departmentId: 'none',
    xPosition: '',
    yPosition: '',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        companyData,
        departmentData,
        locationData,
        floorData,
        seatData,
      ] = await Promise.all([
        getCompanies(),
        getDepartments(),
        getOfficeLocations(),
        getOfficeFloors(),
        getOfficeSeats(),
      ]);

      setCompanies(Array.isArray(companyData) ? companyData : []);
      setDepartments(Array.isArray(departmentData) ? departmentData : []);
      setLocations(Array.isArray(locationData) ? locationData : []);
      setFloors(Array.isArray(floorData) ? floorData : []);
      setSeats(Array.isArray(seatData) ? seatData : []);
    } catch (err) {
      console.error(err);
      setError('Unable to load office location data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Belt-and-suspenders scroll lock for the full-screen map dialog.
  //
  // Radix's own modal scroll-lock (active by default on <Dialog>) only
  // intercepts wheel/touch-driven scroll attempts - it does not actually
  // set `overflow: hidden` on the page, so the underlying page (this
  // one, which can genuinely be taller than one viewport once it has
  // enough locations/floors/seats listed) keeps its own native
  // scrollbar visible and draggable the whole time the map is open.
  // Dragging that scrollbar's thumb doesn't fire a wheel event at all,
  // so it slips right past Radix's lock, scrolls this page underneath
  // the map, and - since that drag's pointerdown target is this page's
  // own DOM, not anything inside the map dialog or its seat-details
  // panel - Radix's own onPointerDownOutside correctly (if confusingly,
  // from a user's perspective) treats it as an outside click and closes
  // the whole map, dropping the user back on this page. That's what a
  // user is describing when they say scrolling "exits" or "closes" the
  // map.
  //
  // Locking only <body>'s overflow turned out not to be enough - in the
  // browser this was actually confirmed against, <html> (not <body>) was
  // the element the native scrollbar was really attached to, so a
  // body-only lock left it completely untouched. Per the CSS Overflow
  // spec, when <body>'s overflow isn't "visible" browsers are supposed
  // to propagate that behavior up to the viewport (effectively locking
  // <html> too), but relying on that propagation is exactly what failed
  // here - so both elements are locked directly and explicitly instead,
  // which is safe regardless of which one a given browser treats as the
  // "real" scrolling element. Restored on close/unmount so this page
  // scrolls normally again the instant the map isn't in the way.
  useEffect(() => {
    if (!mapDialog) return;

    const htmlEl = document.documentElement;
    const previousHtmlOverflow = htmlEl.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    htmlEl.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      htmlEl.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [mapDialog]);

  const visibleLocations = useMemo(() => {
    if (selectedCompanyId === 'all') return locations;

    return locations.filter(
      (x) => x.companyId === Number(selectedCompanyId)
    );
  }, [locations, selectedCompanyId]);

  const getLocationFloors = (locationId: number) =>
    floors
      .filter((x) => x.officeLocationId === locationId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const getFloorSeats = (floorId: number) =>
    seats.filter((x) => x.officeFloorId === floorId);

  const openCreateLocation = () => {
    setLocationMode('create');
    setSelectedLocation(null);

    setLocationForm({
      companyId: selectedCompanyId === 'all' ? '' : selectedCompanyId,
      locationCode: '',
      locationName: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      isActive: true,
    });

    setLocationDialog(true);
  };

  const openEditLocation = (location: OfficeLocation) => {
    setLocationMode('edit');
    setSelectedLocation(location);

    setLocationForm({
      companyId: String(location.companyId),
      locationCode: location.locationCode,
      locationName: location.locationName,
      address: location.address ?? '',
      city: location.city ?? '',
      state: location.state ?? '',
      country: location.country ?? 'India',
      isActive: location.isActive,
    });

    setLocationDialog(true);
  };

  const saveLocation = async () => {
    if (
      !locationForm.companyId ||
      !locationForm.locationCode.trim() ||
      !locationForm.locationName.trim()
    ) {
      setError('Entity, location code and location name are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const request = {
        companyId: Number(locationForm.companyId),
        locationCode: locationForm.locationCode.trim(),
        locationName: locationForm.locationName.trim(),
        address: locationForm.address.trim() || null,
        city: locationForm.city.trim() || null,
        state: locationForm.state.trim() || null,
        country: locationForm.country.trim() || 'India',
      };

      if (locationMode === 'edit' && selectedLocation) {
        await updateOfficeLocation(selectedLocation.id, {
          ...request,
          isActive: locationForm.isActive,
        });
      } else {
        await createOfficeLocation(request);
      }

      setLocationDialog(false);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to save office location.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreateFloor = (location: OfficeLocation) => {
    setFloorMode('create');
    setSelectedFloor(null);

    setFloorForm({
      officeLocationId: String(location.id),
      floorCode: '',
      floorName: '',
      sortOrder: String(getLocationFloors(location.id).length + 1),
      isActive: true,
    });

    setFloorDialog(true);
  };

  const openEditFloor = (floor: OfficeFloor) => {
    setFloorMode('edit');
    setSelectedFloor(floor);

    setFloorForm({
      officeLocationId: String(floor.officeLocationId),
      floorCode: floor.floorCode,
      floorName: floor.floorName,
      sortOrder: String(floor.sortOrder),
      isActive: floor.isActive,
    });

    setFloorDialog(true);
  };

  const saveFloor = async () => {
    setSaving(true);
    setError(null);

    try {
      const request = {
        officeLocationId: Number(floorForm.officeLocationId),
        floorCode: floorForm.floorCode.trim(),
        floorName: floorForm.floorName.trim(),
        sortOrder: Number(floorForm.sortOrder || 0),
      };

      if (floorMode === 'edit' && selectedFloor) {
        await updateOfficeFloor(selectedFloor.id, {
          ...request,
          isActive: floorForm.isActive,
        });
      } else {
        await createOfficeFloor(request);
      }

      setFloorDialog(false);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to save floor.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreateSeat = (
    floor: OfficeFloor,
    initialPosition?: { x: number; y: number }
  ) => {
    setSeatMode('create');
    setSelectedSeat(null);

    setSeatForm({
      officeFloorId: String(floor.id),
      seatCode: '',
      seatName: '',
      departmentId: 'none',
      xPosition: initialPosition ? String(initialPosition.x) : '',
      yPosition: initialPosition ? String(initialPosition.y) : '',
      isActive: true,
    });

    setSeatDialog(true);
  };

  const openEditSeat = (seat: OfficeSeat) => {
    setSeatMode('edit');
    setSelectedSeat(seat);

    setSeatForm({
      officeFloorId: String(seat.officeFloorId),
      seatCode: seat.seatCode,
      seatName: seat.seatName,
      departmentId: seat.departmentId
        ? String(seat.departmentId)
        : 'none',
      xPosition: seat.xPosition?.toString() ?? '',
      yPosition: seat.yPosition?.toString() ?? '',
      isActive: seat.isActive,
    });

    setSeatDialog(true);
  };

  const selectedSeatFloor = floors.find(
    (x) => x.id === Number(seatForm.officeFloorId)
  );

  const seatDepartments = departments.filter(
    (x) =>
      x.isActive &&
      selectedSeatFloor &&
      x.companyId === selectedSeatFloor.companyId
  );

  const saveSeat = async () => {
    setSaving(true);
    setError(null);

    try {
      const request = {
        officeFloorId: Number(seatForm.officeFloorId),
        seatCode: seatForm.seatCode.trim(),
        seatName: seatForm.seatName.trim(),
        departmentId:
          seatForm.departmentId === 'none'
            ? null
            : Number(seatForm.departmentId),
        xPosition:
          seatForm.xPosition === ''
            ? null
            : Number(seatForm.xPosition),
        yPosition:
          seatForm.yPosition === ''
            ? null
            : Number(seatForm.yPosition),
      };

      if (seatMode === 'edit' && selectedSeat) {
        await updateOfficeSeat(selectedSeat.id, {
          ...request,
          isActive: seatForm.isActive,
        });
      } else {
        await createOfficeSeat(request);
      }

      setSeatDialog(false);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to save seat.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openFloorMap = (floor: OfficeFloor) => {
    setMapFloor(floor);
    setMapAddSeatMode(false);
    setMapSearchText('');
    setMapSearchDropdownOpen(false);
    setMapSelectedSeatId(null);
    setMapDialog(true);
  };

  // Search results shown in the sticky header's dropdown while typing -
  // capped so a floor with hundreds of workstations doesn't render a
  // dropdown taller than the screen. Uses the same matchesSearch() the
  // map itself uses to highlight matches, so "what's in the dropdown"
  // and "what's highlighted on the map" never disagree.
  const mapSearchResults = useMemo(() => {
    if (!mapFloor || !mapSearchText.trim()) return [];

    return getFloorSeats(mapFloor.id)
      .filter(
        (seat) =>
          seat.isActive &&
          seat.xPosition !== null &&
          seat.yPosition !== null &&
          seatMatchesSearch(seat, mapSearchText)
      )
      .slice(0, 8);
  }, [mapFloor, seats, mapSearchText]);

  // SEARCH -> LOCATE -> ZOOM -> HIGHLIGHT -> SHOW DETAILS: a dropdown
  // click pans/zooms the map to the seat (via the imperative handle),
  // marks it selected so OfficeFloorMap highlights it, and opens the
  // read-only details panel - all without touching page scroll, and
  // without resetting anything else about the map's current view.
  const handleMapSearchResultClick = (seat: OfficeSeat) => {
    setMapSearchDropdownOpen(false);
    setMapSelectedSeatId(seat.id);
    floorMapRef.current?.focusSeat(seat.id);
    setDetailSeat(seat);
    setDetailDialog(true);
  };

  // Switching floors from the sticky header's selector, without closing
  // and reopening the whole map dialog - clears search/selection/add-seat
  // mode the same way opening the dialog fresh would, since none of that
  // state has any meaning on a different floor's map.
  const handleMapFloorChange = (floor: OfficeFloor) => {
    setMapFloor(floor);
    setMapAddSeatMode(false);
    setMapSearchText('');
    setMapSearchDropdownOpen(false);
    setMapSelectedSeatId(null);
    setDetailDialog(false);
    setDetailSeat(null);
  };

  const uploadFloorMap = async (
    floor: OfficeFloor,
    file: File
  ) => {
    setError(null);
    setMapUploadingFloorId(floor.id);

    try {
      const updatedFloor =
        await uploadOfficeFloorMap(floor.id, file);

      setFloors((current) =>
        current.map((item) =>
          item.id === updatedFloor.id
            ? updatedFloor
            : item
        )
      );

      if (mapFloor?.id === updatedFloor.id) {
        setMapFloor(updatedFloor);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to upload floor map.'
      );
    } finally {
      setMapUploadingFloorId(null);
    }
  };

  const selectFloorMapFile = (
    floor: OfficeFloor
  ) => {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/svg+xml,.svg';

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) return;

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/svg+xml',
      ];

      // Some browsers/OSes report SVG files with an empty or generic
      // type, so also fall back to checking the file extension.
      const isAllowed =
        allowedTypes.includes(file.type) ||
        file.name.toLowerCase().endsWith('.svg');

      if (!isAllowed) {
        setError(
          'Please select a JPG, PNG, or SVG floor-plan image.'
        );
        return;
      }

      void uploadFloorMap(floor, file);
    };

    input.click();
  };

  const deactivateLocation = async (id: number) => {
    if (
      !window.confirm(
        'Deactivate this office location? This also deactivates every floor and seat under it.'
      )
    )
      return;

    await deleteOfficeLocation(id);
    await loadData();
  };

  // Reactivating only flips this location back on - it deliberately does
  // NOT cascade back down to floors/seats (deactivating cascades down on
  // purpose, but bringing things back should be a deliberate per-level
  // choice, not an automatic bulk undo).
  const activateLocation = async (location: OfficeLocation) => {
    setError(null);

    try {
      await updateOfficeLocation(location.id, {
        companyId: location.companyId,
        locationCode: location.locationCode,
        locationName: location.locationName,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        isActive: true,
      });

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to activate this office location.'
      );
    }
  };

  const deactivateFloor = async (id: number) => {
    if (!window.confirm('Deactivate this floor and its seats?')) return;
    await deleteOfficeFloor(id);
    await loadData();
  };

  const activateFloor = async (floor: OfficeFloor) => {
    setError(null);

    try {
      await updateOfficeFloor(floor.id, {
        officeLocationId: floor.officeLocationId,
        floorCode: floor.floorCode,
        floorName: floor.floorName,
        sortOrder: floor.sortOrder,
        isActive: true,
      });

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to activate this floor. If its office location is still ' +
        'inactive, activate that first.'
      );
    }
  };

  const deactivateSeat = async (id: number) => {
    if (!window.confirm('Deactivate this seat?')) return;
    await deleteOfficeSeat(id);
    await loadData();
  };

  const activateSeat = async (seat: OfficeSeat) => {
    setError(null);

    try {
      await updateOfficeSeat(seat.id, {
        officeFloorId: seat.officeFloorId,
        seatCode: seat.seatCode,
        seatName: seat.seatName,
        departmentId: seat.departmentId,
        assetId: seat.assetId,
        userId: seat.userId,
        xPosition: seat.xPosition,
        yPosition: seat.yPosition,
        isActive: true,
      });

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Unable to activate this seat. If its floor is still inactive, ' +
        'activate that first.'
      );
    }
  };

  // Same as deactivateSeat, but also closes the Add/Edit Seat dialog -
  // lets you delete a seat without leaving the dialog you opened it from
  // (including when that dialog was opened by clicking a marker on the
  // interactive floor map).
  const deleteSeatFromDialog = async () => {
    if (!selectedSeat) return;
    if (!window.confirm('Deactivate this seat?')) return;

    await deleteOfficeSeat(selectedSeat.id);
    setSeatDialog(false);
    await loadData();
  };

  const activateSeatFromDialog = async () => {
    if (!selectedSeat) return;
    await activateSeat(selectedSeat);
    setSeatDialog(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Office Location Master</h1>
          <p className="nova-cmdbar-desc">
            {canEdit
              ? 'Manage entities, offices, floors and physical workstation locations.'
              : 'View offices, floors and physical workstation locations.'}
          </p>
        </div>

        <div className="nova-cmdbar-actions">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadData()}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>

          {canEdit && (
            <Button size="sm" onClick={openCreateLocation}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Office
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {canRequestReallocation && (
        <ReallocationRequestsPanel
          mode="mine"
          refreshToken={reallocationRefreshToken}
        />
      )}

      <div className="nova-panel">
        <div className="p-4 max-w-sm">
          <Label>Entity</Label>

          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All Entities
              </SelectItem>

              {companies
                .filter((x) => x.isActive)
                .map((company) => (
                  <SelectItem
                    key={company.id}
                    value={String(company.id)}
                  >
                    {company.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="nova-panel">
          <div className="p-10 text-center text-sm text-muted-foreground">
            Loading office locations…
          </div>
        </div>
      ) : visibleLocations.length === 0 ? (
        <div className="nova-panel">
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />

            <div>
              <p className="font-medium">
                No office locations found
              </p>
              <p className="text-sm text-muted-foreground">
                {canEdit
                  ? 'Create the first office for this entity.'
                  : 'No office locations are currently available.'}
              </p>
            </div>

            {canEdit && (
              <Button onClick={openCreateLocation}>
                <Plus className="mr-2 h-4 w-4" />
                Add Office
              </Button>
            )}
          </div>
        </div>
      ) : (
        visibleLocations.map((location) => (
          <div className="nova-panel" key={location.id}>
            <div className="nova-panel-toolbar">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between w-full">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />

                    <span className="text-sm font-semibold text-foreground">
                      {location.locationName}
                    </span>

                    <span
                      className={`nova-pill ${location.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                    >
                      <span className="nova-dot" />
                      {location.isActive
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {location.companyName}
                    {' • '}
                    {location.locationCode}

                    {location.city
                      ? ` • ${location.city}`
                      : ''}
                  </p>

                  {!location.isActive && canEdit && (
                    <p className="mt-1 text-xs text-amber-600">
                      Inactive - click Activate to add floors or seats under
                      this office again.
                    </p>
                  )}
                </div>

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditLocation(location)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>

                    {location.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreateFloor(location)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Floor
                      </Button>
                    )}

                    {location.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          void deactivateLocation(location.id)
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void activateLocation(location)
                        }
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Activate
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {getLocationFloors(location.id).length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No floors configured.
                </div>
              ) : (
                getLocationFloors(location.id).map((floor) => (
                  <div
                    key={floor.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-2">
                        <Layers3 className="h-4 w-4" />

                        <span className="font-medium">
                          {floor.floorName}
                        </span>

                        <span className="nova-mono text-xs text-muted-foreground">
                          {floor.floorCode}
                        </span>

                        <span
                          className={`nova-pill ${floor.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                        >
                          <span className="nova-dot" />
                          {floor.isActive
                            ? 'Active'
                            : 'Inactive'}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {getFloorSeats(floor.id).length} seats
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {floor.mapImagePath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFloorMap(floor)}
                          >
                            <Map className="mr-1 h-4 w-4" />
                            View Map
                          </Button>
                        )}

                        {canEdit && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditFloor(floor)}
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                mapUploadingFloorId === floor.id
                              }
                              onClick={() =>
                                selectFloorMapFile(floor)
                              }
                            >
                              <Upload className="mr-1 h-4 w-4" />

                              {mapUploadingFloorId === floor.id
                                ? 'Uploading...'
                                : floor.mapImagePath
                                  ? 'Replace Map'
                                  : 'Upload Map'}
                            </Button>

                            {floor.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCreateSeat(floor)}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Add Seat
                              </Button>
                            )}

                            {floor.isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() =>
                                  void deactivateFloor(floor.id)
                                }
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void activateFloor(floor)
                                }
                              >
                                <RefreshCw className="mr-1 h-4 w-4" />
                                Activate
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {!floor.isActive && canEdit && (
                      <p className="mb-3 text-xs text-amber-600">
                        Inactive - click Activate above to add seats to this
                        floor again.
                      </p>
                    )}

                    {getFloorSeats(floor.id).length === 0 ? (
                      <div className="rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">
                        No workstation seats configured.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {getFloorSeats(floor.id).map((seat) => (
                          <div
                            key={seat.id}
                            className="rounded-md border bg-background p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex gap-2">
                                <Armchair className="mt-1 h-4 w-4" />

                                <div>
                                  <p className="font-medium">
                                    {seat.seatCode}
                                  </p>

                                  <p className="text-sm text-muted-foreground">
                                    {seat.seatName}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`nova-pill ${seat.isActive ? 'nova-pill-success' : 'nova-pill-neutral'}`}
                              >
                                <span className="nova-dot" />
                                {seat.isActive
                                  ? 'Active'
                                  : 'Inactive'}
                              </span>
                            </div>

                            <div className="mt-3 text-xs text-muted-foreground">
                              User:{' '}
                              <span className="font-medium text-foreground">
                                {seat.userName ?? 'Unassigned'}
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground">
                              Department:{' '}
                              <span className="font-medium text-foreground">
                                {seat.departmentName ??
                                  'Unassigned'}
                              </span>
                            </div>

                            {canEdit && (
                              <div className="mt-3 flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditSeat(seat)}
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>

                                {seat.isActive ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() =>
                                      void deactivateSeat(seat.id)
                                    }
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Deactivate
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      void activateSeat(seat)
                                    }
                                  >
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    Activate
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}

      {/* FLOOR MAP DIALOG - full-screen shell: a slim sticky header
          (floor name/selector, search + results dropdown, compact
          stats, actions) on top, OfficeFloorMap filling every remaining
          pixel below it. Nothing here scrolls - the header is a fixed-
          height flex item and the map area is flex-1, so there's never
          a reason to scroll the page (or this dialog) to reach the
          map. */}
      <Dialog
        open={mapDialog}
        onOpenChange={(open) => {
          setMapDialog(open);

          if (!open) {
            setMapFloor(null);
            setMapAddSeatMode(false);
            setMapSearchText('');
            setMapSearchDropdownOpen(false);
            setMapSelectedSeatId(null);
            setDetailDialog(false);
            setDetailSeat(null);
          }
        }}
      >
        <DialogContent
          className="flex h-[95vh] max-h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]"
          // The workstation-details slide-in panel (AssetDetailDialog)
          // renders as a plain fixed-position div OUTSIDE this
          // DialogContent's own DOM subtree (it's a sibling further
          // down this file, not nested here) - deliberately, so the map
          // stays interactive while it's open. Radix's own outside-
          // click/Escape handling doesn't know about that panel, so
          // without these three guards, clicking anything inside the
          // panel (its Close button, a table row, "Add Software"...) or
          // pressing Escape while it's open would register as
          // dismissing THIS dialog and close the whole map out from
          // under the panel. Each guard checks for the panel's own
          // data-asset-detail-panel marker (see that component) and, if
          // the interaction is inside it, prevents Radix's default
          // close - the panel's own onOpenChange/Escape handling still
          // runs independently and closes just the panel.
          onPointerDownOutside={(event) => {
            const target = event.target as HTMLElement | null;

            if (target?.closest('[data-asset-detail-panel]')) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null;

            if (target?.closest('[data-asset-detail-panel]')) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (detailDialog) {
              event.preventDefault();
            }
          }}
        >
          {mapFloor && (() => {
            const positionedSeats = getFloorSeats(mapFloor.id).filter(
              (seat) =>
                seat.isActive &&
                seat.xPosition !== null &&
                seat.yPosition !== null
            );

            const occupiedCount = positionedSeats.filter(isSeatOccupied).length;
            const vacantCount = positionedSeats.length - occupiedCount;

            return (
              <>
                {/* STICKY HEADER */}
                <div className="flex flex-none flex-wrap items-center gap-2.5 border-b bg-background px-4 py-2.5 pr-14">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Map className="h-4 w-4 text-muted-foreground" />
                    {mapFloor.floorName}
                  </div>

                  {/* Floor selector - scoped to this floor's own office
                      location, so switching floors from here can never
                      jump to a different location's map. */}
                  <Select
                    value={String(mapFloor.id)}
                    onValueChange={(value) => {
                      const next = floors.find(
                        (f) => f.id === Number(value)
                      );

                      if (next) handleMapFloorChange(next);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[170px] text-xs">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {getLocationFloors(mapFloor.officeLocationId).map(
                        (floor) => (
                          <SelectItem key={floor.id} value={String(floor.id)}>
                            {floor.floorName}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  {/* SEARCH - typing shows a results dropdown; a result
                      click pans/zooms/highlights the seat on the map
                      (via floorMapRef) and opens the details panel,
                      without ever scrolling the page. */}
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      value={mapSearchText}
                      onChange={(event) => {
                        setMapSearchText(event.target.value);
                        setMapSearchDropdownOpen(true);
                      }}
                      onFocus={() => setMapSearchDropdownOpen(true)}
                      onBlur={() => {
                        // Delayed so a click on a dropdown result (which
                        // blurs the input first) still lands - without
                        // this the dropdown would close itself before
                        // the result's own onClick ever fires.
                        window.setTimeout(
                          () => setMapSearchDropdownOpen(false),
                          150
                        );
                      }}
                      placeholder="Search employee, hostname, asset, department or seat..."
                      className="h-8 pl-8 pr-7 text-xs"
                    />

                    {mapSearchText && (
                      <button
                        type="button"
                        onClick={() => {
                          setMapSearchText('');
                          setMapSearchDropdownOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {mapSearchDropdownOpen && mapSearchText.trim() && (
                      <div className="absolute left-0 right-0 top-9 z-[300] max-h-72 overflow-y-auto rounded-md border bg-background shadow-lg">
                        {mapSearchResults.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No matching workstation found.
                          </div>
                        ) : (
                          mapSearchResults.map((seat) => (
                            <button
                              type="button"
                              key={seat.id}
                              // Fires before the input's onBlur handler
                              // (mousedown precedes blur), so this
                              // click is never lost to the dropdown
                              // closing itself first.
                              onMouseDown={(event) =>
                                event.preventDefault()
                              }
                              onClick={() =>
                                handleMapSearchResultClick(seat)
                              }
                              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-muted"
                            >
                              <span className="flex items-center gap-1.5 font-medium">
                                <span
                                  className={[
                                    'h-2 w-2 rounded-full',
                                    isSeatOccupied(seat)
                                      ? 'bg-green-500'
                                      : 'bg-gray-400',
                                  ].join(' ')}
                                />
                                {seat.userName ??
                                  seat.hostName ??
                                  seat.seatCode}
                              </span>

                              <span className="text-muted-foreground">
                                {[seat.departmentName, seat.seatCode]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* COMPACT STATS */}
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">
                      {positionedSeats.length} workstations
                    </Badge>

                    <Badge variant="secondary">
                      {occupiedCount} occupied
                    </Badge>

                    <Badge variant="secondary">
                      {vacantCount} vacant
                    </Badge>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant={mapAddSeatMode ? 'default' : 'outline'}
                        onClick={() =>
                          setMapAddSeatMode((current) => !current)
                        }
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />

                        {mapAddSeatMode
                          ? 'Cancel Add Seat'
                          : 'Add Seat Here'}
                      </Button>
                    )}

                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          mapUploadingFloorId === mapFloor.id
                        }
                        onClick={() =>
                          selectFloorMapFile(mapFloor)
                        }
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />

                        {mapUploadingFloorId === mapFloor.id
                          ? 'Uploading...'
                          : 'Replace Map'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => setMapDialog(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* MAP - fills all remaining space */}
                <div className="relative min-h-0 flex-1">
                  <OfficeFloorMap
                    ref={floorMapRef}
                    floor={mapFloor}
                    seats={getFloorSeats(mapFloor.id)}
                    selectedSeatId={mapSelectedSeatId}
                    searchText={mapSearchText}
                    addMode={mapAddSeatMode}
                    onMapClick={
                      canEdit
                        ? (xPosition, yPosition) => {
                            const floor = mapFloor;

                            if (!floor) return;

                            setMapAddSeatMode(false);
                            setMapDialog(false);
                            setMapFloor(null);

                            openCreateSeat(floor, {
                              x: xPosition,
                              y: yPosition,
                            });
                          }
                        : undefined
                    }
                    onSeatClick={
                      canEdit && !mapAddSeatMode
                        ? (seat) => {
                            setMapDialog(false);
                            setMapFloor(null);
                            openEditSeat(seat);
                          }
                        : undefined
                    }
                    onSeatDoubleClick={(seat) => {
                      setMapSelectedSeatId(seat.id);
                      setDetailSeat(seat);
                      setDetailDialog(true);
                    }}
                    onSeatMove={canEdit && !mapAddSeatMode ? async (
                      seat,
                      xPosition,
                      yPosition
                    ) => {
                      try {
                        setError(null);

                        const updatedSeat =
                          await updateOfficeSeat(
                            seat.id,
                            {
                              officeFloorId:
                                seat.officeFloorId,
                              seatCode: seat.seatCode,
                              seatName: seat.seatName,
                              departmentId:
                                seat.departmentId,
                              assetId:
                                seat.assetId,
                              userId:
                                seat.userId,
                              xPosition,
                              yPosition,
                              isActive:
                                seat.isActive,
                            }
                          );

                        setSeats((current) =>
                          current.map((item) =>
                            item.id === updatedSeat.id
                              ? updatedSeat
                              : item
                          )
                        );
                      } catch (err: any) {
                        setError(
                          err?.response?.data?.message ??
                          'Unable to save workstation position.'
                        );

                        throw err;
                      }
                    } : undefined}
                  />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* OFFICE DIALOG */}
      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {locationMode === 'create'
                ? 'Add Office Location'
                : 'Edit Office Location'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Entity *</Label>
              <Select
                value={locationForm.companyId}
                onValueChange={(value) =>
                  setLocationForm({
                    ...locationForm,
                    companyId: value,
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter((x) => x.isActive)
                    .map((company) => (
                      <SelectItem
                        key={company.id}
                        value={String(company.id)}
                      >
                        {company.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Location Code *</Label>
                <Input
                  className="mt-1"
                  value={locationForm.locationCode}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      locationCode: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Location Name *</Label>
                <Input
                  className="mt-1"
                  value={locationForm.locationName}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      locationName: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input
                className="mt-1"
                value={locationForm.address}
                onChange={(e) =>
                  setLocationForm({
                    ...locationForm,
                    address: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>City</Label>
                <Input
                  className="mt-1"
                  value={locationForm.city}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      city: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>State</Label>
                <Input
                  className="mt-1"
                  value={locationForm.state}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      state: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Country</Label>
                <Input
                  className="mt-1"
                  value={locationForm.country}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLocationDialog(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={saving}
              onClick={() => void saveLocation()}
            >
              {saving ? 'Saving...' : 'Save Office'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FLOOR DIALOG */}
      <Dialog open={floorDialog} onOpenChange={setFloorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {floorMode === 'create'
                ? 'Add Floor'
                : 'Edit Floor'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Floor Code *</Label>
              <Input
                className="mt-1"
                value={floorForm.floorCode}
                onChange={(e) =>
                  setFloorForm({
                    ...floorForm,
                    floorCode: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Floor Name *</Label>
              <Input
                className="mt-1"
                value={floorForm.floorName}
                onChange={(e) =>
                  setFloorForm({
                    ...floorForm,
                    floorName: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                className="mt-1"
                value={floorForm.sortOrder}
                onChange={(e) =>
                  setFloorForm({
                    ...floorForm,
                    sortOrder: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFloorDialog(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={saving}
              onClick={() => void saveFloor()}
            >
              {saving ? 'Saving...' : 'Save Floor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEAT DIALOG */}
      <Dialog open={seatDialog} onOpenChange={setSeatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {seatMode === 'create'
                ? 'Add Workstation Seat'
                : 'Edit Workstation Seat'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Seat Code *</Label>
                <Input
                  className="mt-1"
                  value={seatForm.seatCode}
                  onChange={(e) =>
                    setSeatForm({
                      ...seatForm,
                      seatCode: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Seat Name *</Label>
                <Input
                  className="mt-1"
                  value={seatForm.seatName}
                  onChange={(e) =>
                    setSeatForm({
                      ...seatForm,
                      seatName: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Department</Label>
              <Select
                value={seatForm.departmentId}
                onValueChange={(value) =>
                  setSeatForm({
                    ...seatForm,
                    departmentId: value,
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">
                    Unassigned
                  </SelectItem>

                  {seatDepartments.map((department) => (
                    <SelectItem
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>X Position (0–100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1"
                  value={seatForm.xPosition}
                  onChange={(e) =>
                    setSeatForm({
                      ...seatForm,
                      xPosition: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Y Position (0–100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1"
                  value={seatForm.yPosition}
                  onChange={(e) =>
                    setSeatForm({
                      ...seatForm,
                      yPosition: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              X/Y coordinates place this workstation on the interactive floor
              map - leave them blank and it just won&apos;t show up there
              until positioned. Tip: open the floor map and use
              &quot;Add Seat Here&quot; to place a new seat by clicking,
              instead of typing coordinates by hand.
            </p>
          </div>

          <DialogFooter>
            {seatMode === 'edit' &&
              selectedSeat &&
              (selectedSeat.isActive ? (
                <Button
                  variant="ghost"
                  className="mr-auto text-red-600 hover:text-red-700"
                  disabled={saving}
                  onClick={() => void deleteSeatFromDialog()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mr-auto"
                  disabled={saving}
                  onClick={() => void activateSeatFromDialog()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Activate
                </Button>
              ))}

            <Button
              variant="outline"
              onClick={() => setSeatDialog(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={saving}
              onClick={() => void saveSeat()}
            >
              {saving ? 'Saving...' : 'Save Seat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WORKSTATION DETAIL PANEL (double-click on the floor map) */}
      <AssetDetailDialog
        open={detailDialog}
        onOpenChange={(open) => {
          setDetailDialog(open);

          if (!open) {
            setDetailSeat(null);
          }
        }}
        seat={detailSeat}
        seats={seats}
        canRequestReallocation={canRequestReallocation}
        canEdit={canEdit}
        onRequestSubmitted={() =>
          setReallocationRefreshToken((t) => t + 1)
        }
      />
    </div>
  );
}
