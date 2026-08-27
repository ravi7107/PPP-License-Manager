import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MapPin,
  Map,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';

import { select } from 'd3-selection';
import {
  zoom,
  zoomIdentity,
  type ZoomBehavior,
} from 'd3-zoom';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import type {
  OfficeFloor,
  OfficeSeat,
} from '@/lib/api/office-locations.api';

interface OfficeFloorMapProps {
  floor: OfficeFloor;
  seats: OfficeSeat[];
  apiBaseUrl?: string;
  selectedSeatId?: number | null;

  onSeatClick?: (seat: OfficeSeat) => void;

  // Fires on a double-click/double-tap of a seat marker, independent of
  // onSeatClick/onSeatMove - used to open a read-only detail panel that's
  // available even to viewers who can't drag/edit seats.
  onSeatDoubleClick?: (seat: OfficeSeat) => void;

  onSeatMove?: (
    seat: OfficeSeat,
    xPosition: number,
    yPosition: number
  ) => Promise<void> | void;

  // When true, clicking anywhere on the map background (not on an
  // existing seat marker) fires onMapClick with the clicked position -
  // used to place a brand-new seat directly on the map instead of
  // guessing X/Y numbers in a form.
  addMode?: boolean;
  onMapClick?: (xPosition: number, yPosition: number) => void;
}

function buildMapUrl(
  path: string | null,
  apiBaseUrl?: string
): string | null {
  if (!path) return null;

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  const base =
    apiBaseUrl ??
    import.meta.env.VITE_API_URL ??
    '';

  return `${base.replace(/\/api\/?$/, '')}${path}`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isOccupied(seat: OfficeSeat) {
  return Boolean(seat.userId && seat.assetId);
}

function matchesSearch(
  seat: OfficeSeat,
  search: string
) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const values = [
    seat.userName,
    seat.employeeCode,
    seat.hostName,
    seat.assetTag,
    seat.assetName,
    seat.departmentName,
    seat.seatCode,
    seat.seatName,
  ];

  return values.some((value) =>
    value?.toLowerCase().includes(query)
  );
}

// Zoom in this ratio per click on the +/- buttons.
const ZOOM_STEP = 1.4;

// 1 = the map at its natural (un-zoomed) size, matching the pre-zoom
// baseline exactly. 6 = close enough to make small text/labels on a
// dense floor plan legible.
const MIN_SCALE = 1;
const MAX_SCALE = 6;

// The minimap (and the zoom-% readout next to the controls) only add
// value once the user has actually zoomed in - at 1x the whole map is
// already fully visible, so showing a minimap of the whole map next to
// itself would be redundant clutter.
const OVERVIEW_VISIBLE_ABOVE_SCALE = 1.01;

const MINIMAP_WIDTH = 160;
const MINIMAP_MIN_HEIGHT = 60;
const MINIMAP_MAX_HEIGHT = 220;

export default function OfficeFloorMap({
  floor,
  seats,
  apiBaseUrl,
  selectedSeatId,
  onSeatClick,
  onSeatDoubleClick,
  onSeatMove,
  addMode,
  onMapClick,
}: OfficeFloorMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  // --- Pan/zoom (Google-Maps-style scroll-to-zoom, drag-to-pan) ---
  //
  // d3-zoom only ever touches the CSS transform of zoomLayerRef - it
  // never reads or writes seat.xPosition/seat.yPosition. Seat
  // coordinates stay in the original 0-100 percent coordinate system
  // used everywhere else in this file; getPosition() below is the one
  // place that has to know about the current zoom transform, so it can
  // convert a raw pointer position back into that same percent system
  // regardless of how far the map is currently zoomed/panned.
  const zoomViewportRef =
    useRef<HTMLDivElement | null>(null);
  const zoomLayerRef =
    useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef =
    useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const zoomTransformRef = useRef(zoomIdentity);

  // Mirrors zoomTransformRef into render-visible state. Only the scale
  // is ever read directly off this value - x/y are read from the ref
  // (always in sync, since it's written first on every 'zoom' event) -
  // this just exists to force a re-render when the transform changes,
  // so the zoom-% badge and the minimap's viewport rectangle stay live.
  const [zoomScale, setZoomScale] = useState(1);

  // The zoom viewport's own on-screen size at rest (i.e. with no zoom
  // applied). A CSS transform never changes the box a parent uses to
  // size itself around a transformed child, so this rect is stable
  // across every zoom/pan state - it only actually changes on a real
  // resize (window resize, sidebar toggle, or the floor image finishing
  // its initial load). Used to bound panning to the map image itself
  // (translateExtent) and to size the minimap with the right aspect
  // ratio.
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  });

  const [draggingSeatId, setDraggingSeatId] =
    useState<number | null>(null);

  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [savingSeatId, setSavingSeatId] =
    useState<number | null>(null);

  const [searchText, setSearchText] =
    useState('');

  const mapUrl = useMemo(
    () => buildMapUrl(floor.mapImagePath, apiBaseUrl),
    [floor.mapImagePath, apiBaseUrl]
  );

  const positionedSeats = useMemo(
    () =>
      seats.filter(
        (seat) =>
          seat.isActive &&
          seat.xPosition !== null &&
          seat.yPosition !== null
      ),
    [seats]
  );

  const matchingSeatIds = useMemo(() => {
    if (!searchText.trim()) {
      return new Set<number>();
    }

    return new Set(
      positionedSeats
        .filter((seat) =>
          matchesSearch(seat, searchText)
        )
        .map((seat) => seat.id)
    );
  }, [positionedSeats, searchText]);

  const occupiedCount = useMemo(
    () =>
      positionedSeats.filter(isOccupied).length,
    [positionedSeats]
  );

  const vacantCount =
    positionedSeats.length - occupiedCount;

  const searchActive =
    searchText.trim().length > 0;

  // Wire up d3-zoom once per mount. This only ever runs against
  // zoomViewportRef - the seat buttons, search box, badges, and every
  // other existing control live outside this element (or, for seats,
  // call stopPropagation() on their own pointer handlers before this
  // ever sees the event), so none of that behavior changes.
  //
  // Depends on [mapUrl], not []: the viewport/layer divs below don't
  // exist yet while mapUrl is falsy (see the early-return placeholder
  // branch further down), so this needs to (re)run once a map becomes
  // available - e.g. an admin uploading a floor's first map from
  // inside an already-open dialog, which re-renders this same
  // component instance from the placeholder branch into the real one
  // without ever unmounting it. Re-running on every mapUrl change (not
  // just null -> non-null) also means switching floors gets a clean,
  // freshly-reset zoom state instead of inheriting the previous
  // floor's pan/zoom.
  useEffect(() => {
    const viewport = zoomViewportRef.current;
    const layer = zoomLayerRef.current;

    if (!viewport || !layer) {
      return;
    }

    const viewportSelection = select(viewport);

    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .on('zoom', (event) => {
        zoomTransformRef.current = event.transform;

        select(layer).style(
          'transform',
          `translate(${event.transform.x}px, ${event.transform.y}px) scale(${event.transform.k})`
        );

        setZoomScale(event.transform.k);
      });

    viewportSelection.call(behavior);
    zoomBehaviorRef.current = behavior;

    // Double-click-to-zoom isn't a requested feature, and it would
    // otherwise fire on a double-click landing on a seat marker too
    // (d3 binds this directly on the viewport element, an ancestor of
    // every seat button, so it sees the event on the way up regardless
    // of the seat's own onDoubleClick) - stacking an unrequested zoom
    // on top of the seat's existing double-click behavior. Disabling
    // it keeps double-click on a seat doing exactly one thing, as
    // before. This must be called on the SELECTION (after .call), not
    // chained on the zoom() behavior object - the behavior's own
    // .on() forwards to a d3-dispatch instance restricted to the
    // fixed "start"/"zoom"/"end" event set and throws on any other
    // type name (including "dblclick"); only the selection's plain
    // .on() can remove an arbitrary DOM listener like this one.
    viewportSelection.on('dblclick.zoom', null);

    // Reset to a clean, unzoomed view every time this (re)runs -
    // otherwise a DOM node reused across a floor switch would keep
    // showing whatever pan/zoom the previous floor's map was left at.
    viewportSelection.call(behavior.transform, zoomIdentity);

    return () => {
      viewportSelection.on('.zoom', null);
      zoomBehaviorRef.current = null;
    };
  }, [mapUrl]);

  // Keep the pan/zoom bounds in sync with the viewport's real on-screen
  // size, and re-measure whenever it changes (window resize, sidebar
  // collapse, or the floor image finishing loading and establishing its
  // natural height). Without this, panning could drag the map
  // completely off-screen with no way back short of the reset button.
  //
  // Depends on [mapUrl] for the same reason as the effect above - the
  // viewport div doesn't exist yet until a map is actually available.
  useEffect(() => {
    const viewport = zoomViewportRef.current;

    if (!viewport || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => {
      const rect = viewport.getBoundingClientRect();

      setViewportSize((previous) => {
        if (
          Math.abs(previous.width - rect.width) < 0.5 &&
          Math.abs(previous.height - rect.height) < 0.5
        ) {
          return previous;
        }

        return { width: rect.width, height: rect.height };
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [mapUrl]);

  useEffect(() => {
    const behavior = zoomBehaviorRef.current;

    if (
      !behavior ||
      !viewportSize.width ||
      !viewportSize.height
    ) {
      return;
    }

    behavior
      .extent([[0, 0], [viewportSize.width, viewportSize.height]])
      .translateExtent([
        [0, 0],
        [viewportSize.width, viewportSize.height],
      ]);
  }, [viewportSize]);

  const getPosition = (
    clientX: number,
    clientY: number
  ) => {
    const container = mapRef.current;

    if (!container) return null;

    const rect =
      container.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return null;
    }

    // The map is visually scaled/translated by d3-zoom, but seat
    // coordinates stay in the original 0-100 percent space. Reverse the
    // current transform before converting the pointer position, so
    // clicking/dragging a seat lands in the same place on the
    // underlying floor plan regardless of the current zoom level.
    const transform = zoomTransformRef.current;

    const localX =
      (clientX - rect.left - transform.x) / transform.k;

    const localY =
      (clientY - rect.top - transform.y) / transform.k;

    const x = (localX / rect.width) * 100;
    const y = (localY / rect.height) * 100;

    return {
      x: Number(clamp(x).toFixed(3)),
      y: Number(clamp(y).toFixed(3)),
    };
  };

  const startDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    seat: OfficeSeat
  ) => {
    if (!onSeatMove) return;

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setDraggingSeatId(seat.id);

    setDragPosition({
      x: Number(seat.xPosition ?? 0),
      y: Number(seat.yPosition ?? 0),
    });
  };

  const moveDrag = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (draggingSeatId === null) return;

    event.preventDefault();
    event.stopPropagation();

    const position = getPosition(
      event.clientX,
      event.clientY
    );

    if (position) {
      setDragPosition(position);
    }
  };

  const finishDrag = async (
    event: React.PointerEvent<HTMLButtonElement>,
    seat: OfficeSeat
  ) => {
    if (
      draggingSeatId !== seat.id ||
      !onSeatMove
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const position =
      getPosition(
        event.clientX,
        event.clientY
      ) ?? dragPosition;

    setDraggingSeatId(null);
    setDragPosition(null);

    if (!position) return;

    const oldX =
      Number(seat.xPosition);

    const oldY =
      Number(seat.yPosition);

    const moved =
      Math.abs(position.x - oldX) > 0.01 ||
      Math.abs(position.y - oldY) > 0.01;

    if (!moved) {
      onSeatClick?.(seat);
      return;
    }

    try {
      setSavingSeatId(seat.id);

      await onSeatMove(
        seat,
        position.x,
        position.y
      );
    } finally {
      setSavingSeatId(null);
    }
  };

  const zoomBy = (factor: number) => {
    const viewport = zoomViewportRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!viewport || !behavior) return;

    select(viewport)
      .transition()
      .duration(200)
      .call(behavior.scaleBy, factor);
  };

  const resetView = () => {
    const viewport = zoomViewportRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!viewport || !behavior) return;

    select(viewport)
      .transition()
      .duration(300)
      .call(behavior.transform, zoomIdentity);
  };

  const panTo = (
    contentFractionX: number,
    contentFractionY: number
  ) => {
    const viewport = zoomViewportRef.current;
    const behavior = zoomBehaviorRef.current;

    if (
      !viewport ||
      !behavior ||
      !viewportSize.width ||
      !viewportSize.height
    ) {
      return;
    }

    select(viewport)
      .transition()
      .duration(300)
      .call(
        behavior.translateTo,
        clamp01(contentFractionX) * viewportSize.width,
        clamp01(contentFractionY) * viewportSize.height
      );
  };

  const showOverview =
    zoomScale > OVERVIEW_VISIBLE_ABOVE_SCALE &&
    viewportSize.width > 0 &&
    viewportSize.height > 0;

  // Current visible region of the map, expressed as a percentage of the
  // full floor plan - used to draw the minimap's viewport rectangle.
  const overviewRect = useMemo(() => {
    if (!showOverview) return null;

    const transform = zoomTransformRef.current;

    const leftPct = clamp(
      (-transform.x / transform.k / viewportSize.width) * 100
    );

    const topPct = clamp(
      (-transform.y / transform.k / viewportSize.height) * 100
    );

    const widthPct = Math.min(
      100 / transform.k,
      100 - leftPct
    );

    const heightPct = Math.min(
      100 / transform.k,
      100 - topPct
    );

    return { leftPct, topPct, widthPct, heightPct };
    // zoomScale is read only to force this to recompute on every zoom
    // event (zoomTransformRef itself doesn't trigger re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOverview, zoomScale, viewportSize]);

  const minimapHeight = viewportSize.width
    ? Math.max(
        MINIMAP_MIN_HEIGHT,
        Math.min(
          MINIMAP_MAX_HEIGHT,
          MINIMAP_WIDTH *
            (viewportSize.height / viewportSize.width)
        )
      )
    : MINIMAP_MIN_HEIGHT;

  const handleOverviewClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    panTo(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height
    );
  };

  if (!mapUrl) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
        <Map className="mb-3 h-10 w-10 text-muted-foreground" />

        <p className="font-medium">
          No floor map uploaded
        </p>

        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Upload a JPG, PNG, or SVG floor plan to display
          workstation positions visually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {floor.floorName} Map
          </p>

          <p className="text-xs text-muted-foreground">
            {floor.mapOriginalFileName ??
              'Floor plan'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* SEARCH */}
      <div className="rounded-lg border bg-muted/10 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Search employee, hostname, asset, department or seat..."
              className="pl-9 pr-9"
            />

            {searchText && (
              <button
                type="button"
                onClick={() =>
                  setSearchText('')
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">

            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-white bg-green-500 shadow" />
              <span>Occupied</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-white bg-gray-400 shadow" />
              <span>Vacant / Unassigned</span>
            </div>

          </div>
        </div>

        {searchActive && (
          <div className="mt-2 text-xs text-muted-foreground">
            {matchingSeatIds.size === 0
              ? 'No matching workstation found.'
              : `${matchingSeatIds.size} matching workstation${
                  matchingSeatIds.size === 1
                    ? ''
                    : 's'
                } found.`}
          </div>
        )}
      </div>

      {/* ADD-SEAT MESSAGE */}
      {addMode && onMapClick ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <MapPin className="h-4 w-4" />
          Click anywhere on the map to place a new workstation there.
        </div>
      ) : (
        <>
          {/* DRAG MESSAGE */}
          {onSeatMove && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <Move className="h-4 w-4" />
              Drag a workstation dot to reposition it.
              The new position is saved automatically.
            </div>
          )}

          {onSeatDoubleClick && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Double-click a workstation to see the system, installed software,
              and who it&apos;s assigned to.
            </div>
          )}
        </>
      )}

      {/* MAP */}
      <div className="overflow-auto rounded-lg border bg-muted/20 p-2">
        {/*
          This wrapper (not overflow-hidden) is what the zoom controls
          and minimap are positioned against. It sits OUTSIDE the
          overflow-hidden/zoom-managed viewport below, so neither
          overlay is ever clipped by it, and neither one is a
          descendant of the element d3-zoom attaches its wheel/pointer
          listeners to - clicking a control can never also start a pan.
        */}
        <div
          className="relative mx-auto w-full"
          style={{ maxWidth: '1400px' }}
        >
          <div
            ref={(element) => {
              mapRef.current = element;
              zoomViewportRef.current = element;
            }}
            className={[
              'relative w-full overflow-hidden rounded-md bg-background',
              addMode && onMapClick ? 'cursor-crosshair' : '',
            ].join(' ')}
            style={{
              touchAction: 'none',
            }}
            onClick={(event) => {
              if (!addMode || !onMapClick) return;

              const position = getPosition(
                event.clientX,
                event.clientY
              );

              if (position) {
                onMapClick(position.x, position.y);
              }
            }}
          >
            <div
              ref={zoomLayerRef}
              className="relative w-full"
              style={{ transformOrigin: '0 0' }}
            >
              <img
                src={mapUrl}
                alt={`${floor.floorName} floor plan`}
                className="pointer-events-none block h-auto w-full select-none"
                draggable={false}
              />

              {positionedSeats.map((seat) => {
                const storedX =
                  clamp(Number(seat.xPosition));

                const storedY =
                  clamp(Number(seat.yPosition));

                const isDragging =
                  draggingSeatId === seat.id;

                const x =
                  isDragging && dragPosition
                    ? dragPosition.x
                    : storedX;

                const y =
                  isDragging && dragPosition
                    ? dragPosition.y
                    : storedY;

                const selected =
                  selectedSeatId === seat.id;

                const saving =
                  savingSeatId === seat.id;

                const occupied =
                  isOccupied(seat);

                const matches =
                  !searchActive ||
                  matchingSeatIds.has(seat.id);

                const searchMatch =
                  searchActive &&
                  matchingSeatIds.has(seat.id);

                return (
                  <button
                    key={seat.id}
                    type="button"

                    onPointerDown={(event) =>
                      startDrag(event, seat)
                    }

                    onPointerMove={moveDrag}

                    onPointerUp={(event) =>
                      void finishDrag(event, seat)
                    }

                    onPointerCancel={() => {
                      setDraggingSeatId(null);
                      setDragPosition(null);
                    }}

                    onClick={(event) => {
                      event.stopPropagation();

                      if (!onSeatMove) {
                        onSeatClick?.(seat);
                      }
                    }}

                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      onSeatDoubleClick?.(seat);
                    }}

                    className={[
                      'group absolute',
                      'focus:outline-none',
                      'select-none touch-none',
                      'transition-opacity duration-200',

                      onSeatMove
                        ? 'cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer',

                      !matches
                        ? 'opacity-20'
                        : 'opacity-100',

                      isDragging
                        ? 'z-50'
                        : searchMatch
                          ? 'z-50'
                          : selected
                            ? 'z-40'
                            : 'z-30',

                    ].join(' ')}

                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      // The dot and its tooltip are descendants of
                      // zoomLayerRef, which is what d3-zoom actually
                      // scales - without counter-scaling here, both
                      // would balloon in on-screen size right along
                      // with the map at higher zoom levels, easily
                      // growing the tooltip box large enough to
                      // visually swallow neighboring seats' dots. The
                      // 1/zoomScale factor cancels the ancestor's
                      // scale(k) exactly (k * 1/k = 1), so every
                      // marker stays a constant screen size at any
                      // zoom level - the same convention Google Maps
                      // (and similar) markers use. Position (left/top
                      // %) is unaffected, since transform is a
                      // paint-only effect, not a layout one.
                      transform: `translate(-50%, -50%) scale(${1 / zoomScale})`,
                    }}

                    aria-label={
                      seat.hostName ??
                      seat.assetTag ??
                      seat.seatCode
                    }
                  >

                    {/* DOT */}
                    <span
                      className={[
                        'block rounded-full border-2 border-white shadow-md',
                        'transition-all duration-200',

                        occupied
                          ? 'bg-green-500'
                          : 'bg-gray-400',

                        isDragging
                          ? 'h-5 w-5 scale-125 ring-4 ring-primary/30'
                          : searchMatch
                            ? 'h-6 w-6 scale-125 ring-4 ring-yellow-400/60'
                            : selected
                              ? 'h-5 w-5 scale-125 ring-4 ring-primary/25'
                              : 'h-4 w-4 group-hover:scale-125',

                        saving
                          ? 'animate-pulse'
                          : '',

                      ].join(' ')}
                    />

                    {/* TOOLTIP */}
                    {!isDragging && (
                      <span
                        className={[
                          'pointer-events-none absolute',
                          'left-1/2 top-7',
                          '-translate-x-1/2',
                          'min-w-[210px]',
                          'rounded-md border',
                          'bg-background px-3 py-2',
                          'text-left text-xs shadow-lg',

                          searchMatch ||
                          selected
                            ? 'block'
                            : 'hidden group-hover:block',

                        ].join(' ')}
                      >

                        <span className="mb-1 block font-semibold">
                          {seat.userName ??
                            'Unassigned user'}
                        </span>

                        {seat.employeeCode && (
                          <span className="block">
                            <span className="text-muted-foreground">
                              Employee:{' '}
                            </span>

                            {seat.employeeCode}
                          </span>
                        )}

                        <span className="block">
                          <span className="text-muted-foreground">
                            Hostname:{' '}
                          </span>

                          {seat.hostName ?? '—'}
                        </span>

                        <span className="block">
                          <span className="text-muted-foreground">
                            Department:{' '}
                          </span>

                          {seat.departmentName ?? '—'}
                        </span>

                        <span className="block">
                          <span className="text-muted-foreground">
                            Asset:{' '}
                          </span>

                          {seat.assetTag ?? '—'}
                        </span>

                        <span className="block">
                          <span className="text-muted-foreground">
                            Seat:{' '}
                          </span>

                          {seat.seatCode}
                        </span>

                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {occupied
                            ? 'Occupied workstation'
                            : 'Vacant / unassigned'}
                        </span>

                      </span>
                    )}

                  </button>
                );
              })}
            </div>
          </div>

          {/* ZOOM CONTROLS */}
          <div className="pointer-events-auto absolute right-3 top-3 z-[100] flex flex-col overflow-hidden rounded-md border bg-background shadow-md">
            <button
              type="button"
              onClick={() => zoomBy(ZOOM_STEP)}
              className="flex h-9 w-9 items-center justify-center hover:bg-muted"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="border-t" />

            <button
              type="button"
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              className="flex h-9 w-9 items-center justify-center hover:bg-muted"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="border-t" />

            <button
              type="button"
              onClick={resetView}
              className="flex h-9 w-9 items-center justify-center hover:bg-muted"
              aria-label="Reset view"
              title="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {zoomScale > OVERVIEW_VISIBLE_ABOVE_SCALE && (
              <div className="border-t px-1.5 py-1 text-center text-[10px] text-muted-foreground">
                {Math.round(zoomScale * 100)}%
              </div>
            )}
          </div>

          {/* MINIMAP OVERVIEW */}
          {showOverview && overviewRect && (
            <div
              className="pointer-events-auto absolute bottom-3 right-3 z-[100] overflow-hidden rounded-md border bg-background shadow-md"
              style={{ width: MINIMAP_WIDTH }}
            >
              <div
                className="relative cursor-pointer"
                style={{ width: MINIMAP_WIDTH, height: minimapHeight }}
                onClick={handleOverviewClick}
                title="Click to jump to that part of the map"
              >
                <img
                  src={mapUrl}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none block h-full w-full select-none object-fill"
                />

                <div
                  className="pointer-events-none absolute border-2 border-primary bg-primary/10"
                  style={{
                    left: `${overviewRect.leftPct}%`,
                    top: `${overviewRect.topPct}%`,
                    width: `${overviewRect.widthPct}%`,
                    height: `${overviewRect.heightPct}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {positionedSeats.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          No workstations have been positioned on this
          floor map yet.
        </div>
      )}

    </div>
  );
}
