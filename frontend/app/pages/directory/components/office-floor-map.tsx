import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Building2,
  HelpCircle,
  Home,
  Laptop,
  MapPin,
  Map,
  Minus,
  Plus,
  User,
  X,
} from 'lucide-react';

import { select } from 'd3-selection';
import {
  zoom,
  zoomIdentity,
  type ZoomBehavior,
} from 'd3-zoom';

import type {
  OfficeFloor,
  OfficeSeat,
} from '@/lib/api/office-locations.api';

interface OfficeFloorMapProps {
  floor: OfficeFloor;
  seats: OfficeSeat[];
  apiBaseUrl?: string;
  selectedSeatId?: number | null;

  // Controlled from the parent's sticky header search box now, instead
  // of this component owning its own search input - lets the header
  // drive both the on-map highlight below AND a results dropdown at the
  // same time from one shared value. Defaults to '' (no filtering) for
  // any consumer that doesn't pass it.
  searchText?: string;

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

// Imperative API the parent (sticky header) drives directly - fitMap()
// for the Fit Map control / auto-fit-on-load-or-resize, focusSeat() for
// "search result clicked -> pan, zoom, and highlight that workstation."
// A ref instead of props because both are one-shot camera commands, not
// values this component needs to keep rendering against.
export interface OfficeFloorMapHandle {
  fitMap: () => void;
  focusSeat: (seatId: number) => void;
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

function clampScale(value: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

// Exported so the parent's sticky header can compute the same
// occupied/vacant counts and search-result list shown on the map,
// without duplicating this logic.
export function isOccupied(seat: OfficeSeat) {
  return Boolean(seat.userId && seat.assetId);
}

export function matchesSearch(
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

// The map image is rendered at CSS width:100% of the viewport
// (regardless of zoom), so k=1 means "image width == viewport width,"
// not "natural pixel size" - a genuinely tall/narrow floor plan can
// still overflow the viewport's height at k=1. MIN_SCALE used to be
// pinned at 1 (never zoom out past width-fit), which meant Fit Map
// could never actually shrink such a plan enough to show it in full.
// 0.2 gives Fit Map room to do that while still stopping well short of
// making the map illegibly small. 6 = close enough to make small
// text/labels on a dense floor plan legible.
const MIN_SCALE = 0.2;
const MAX_SCALE = 6;

// Padding applied around the whole map when Fit Map centers it, and the
// zoom level focusSeat() settles on when jumping to a search result.
// Kept small (as opposed to something like 0.10+) because Fit Map
// already has to shrink a portrait-oriented floor plan a lot more than
// this to keep it fully visible inside a landscape viewport without
// distorting it - every extra point here comes directly out of the
// map's visible size on exactly those floor plans, so there's no
// reason to add more than a slim breathing margin.
const FIT_PADDING_RATIO = 0.04;
const FOCUS_SEAT_SCALE = 3;

// The minimap (and the zoom-% readout next to the controls) only add
// value once the user has actually zoomed in - at 1x the whole map is
// already fully visible, so showing a minimap of the whole map next to
// itself would be redundant clutter.
const OVERVIEW_VISIBLE_ABOVE_SCALE = 1.01;

const MINIMAP_WIDTH = 160;
const MINIMAP_MIN_HEIGHT = 60;
const MINIMAP_MAX_HEIGHT = 220;

const OfficeFloorMap = forwardRef<
  OfficeFloorMapHandle,
  OfficeFloorMapProps
>(function OfficeFloorMap({
  floor,
  seats,
  apiBaseUrl,
  selectedSeatId,
  searchText = '',
  onSeatClick,
  onSeatDoubleClick,
  onSeatMove,
  addMode,
  onMapClick,
}, ref) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  // A native double-click still fires two ordinary 'click' events before
  // the browser's own 'dblclick' event fires - so any handler that opens
  // a dialog immediately on the first of those two clicks intercepts
  // every double-click attempt before the second click (or 'dblclick'
  // itself) can ever be processed (worse still, once the dialog is open
  // it visually covers the seat, so the second click can't even reach
  // the button). For an editable (canEdit) seat, that immediate action
  // is fired from finishDrag() below - a plain click is a pointerdown +
  // pointerup with no movement in between, handled there rather than in
  // the button's own onClick, since the same pointer handlers also drive
  // drag-to-reposition. scheduleSeatClick()/cancelPendingSeatClick()
  // delay that action just long enough to see whether a second click (or
  // a native 'dblclick') follows, so a genuine double-click can cancel
  // it instead of racing it.
  const pendingClickTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSeatClick = (seat: OfficeSeat) => {
    if (pendingClickTimerRef.current) {
      clearTimeout(pendingClickTimerRef.current);
    }

    pendingClickTimerRef.current = setTimeout(() => {
      pendingClickTimerRef.current = null;
      onSeatClick?.(seat);
    }, 250);
  };

  const cancelPendingSeatClick = () => {
    if (pendingClickTimerRef.current) {
      clearTimeout(pendingClickTimerRef.current);
      pendingClickTimerRef.current = null;
    }
  };

  // Clears any single-click still pending a double-click check on
  // unmount, so a stale onSeatClick never fires against an already
  // torn-down component (e.g. the admin closed the map dialog inside
  // the 250ms window).
  useEffect(() => {
    return () => {
      cancelPendingSeatClick();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // applied) - this is now a fixed full-height box (see the "absolute
  // inset-0" comment on the viewport div below), NOT the image's own
  // rendered size, so anything that needs the image's actual content
  // dimensions (drag/click coordinate math, pan bounds, the minimap)
  // must go through renderedHeightAtScale1 below instead of this
  // directly. Still used as-is for d3-zoom's own `extent` (the
  // viewport's real screen box - that one genuinely wants the on-screen
  // size, not the image's) and as the width input renderedHeightAtScale1
  // is derived from (image width == viewport width always holds, by
  // construction, unlike height).
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

  // The floor image's own pixel dimensions, captured once it loads -
  // needed (alongside viewportSize below) to compute a Fit Map scale
  // that accounts for the image's real aspect ratio, not just its
  // CSS-rendered width. Reset to zero whenever the map image itself
  // changes (see the [mapUrl] effect below) so a stale previous floor's
  // size can never be used to fit the new one before its own onLoad
  // fires.
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0,
  });

  const [helpOpen, setHelpOpen] = useState(false);

  // The image's actual rendered height at zoom scale 1 - i.e. the real
  // height of the floor plan's own content box, as opposed to
  // viewportSize.height (the surrounding viewport's fixed on-screen
  // box, which the redesign made independent of the image's aspect
  // ratio - see the viewportSize comment above). Width doesn't need an
  // equivalent: the image is always rendered at CSS width:100% of the
  // viewport, so image width and viewport width match by construction
  // at every zoom level. Height doesn't, whenever the floor plan's
  // aspect ratio isn't identical to the viewport's - which is the
  // normal case, not an edge case. Everything that needs to convert
  // between a screen position and a position ON THE IMAGE (drag-to-
  // reposition, add-seat-mode clicks, pan-to-here on the minimap, and
  // the pan bounds that keep the image from being dragged fully off-
  // screen) needs to divide/multiply by this, not by viewportSize.height
  // - using viewportSize.height there would silently compute the wrong
  // Y position/bound whenever the two aspect ratios differ. Falls back
  // to viewportSize.height before the image has loaded (imageNaturalSize
  // still zero) purely so translateExtent/extent don't collapse to a
  // zero-size box in that brief window - fitMap/focusSeat already guard
  // themselves separately and simply no-op until the real value is
  // known.
  const renderedHeightAtScale1 =
    viewportSize.width && imageNaturalSize.width && imageNaturalSize.height
      ? viewportSize.width *
        (imageNaturalSize.height / imageNaturalSize.width)
      : viewportSize.height;

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

  // Occupied/vacant counts are no longer rendered here - the parent's
  // sticky header computes the same numbers itself (via the exported
  // isOccupied() above, against getFloorSeats()) for its compact stats,
  // so this component doesn't need to duplicate that state.

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

    // A new floor's image hasn't loaded yet at this point, so its real
    // natural size is unknown - clear out whatever the previous floor's
    // image reported. The fit-on-ready effect further below only runs
    // once this is populated again (by the new image's onLoad), so it
    // can never fit against a stale, mismatched size in between.
    setImageNaturalSize({ width: 0, height: 0 });

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
      // extent = the viewport's own screen box - d3-zoom uses this to
      // compute things like zoom-toward-pointer, so it genuinely wants
      // the real on-screen dimensions here, not the image's.
      .extent([[0, 0], [viewportSize.width, viewportSize.height]])
      // translateExtent = how far the CONTENT (the image, at scale 1)
      // can be panned - this has to be expressed in the image's own
      // coordinate space, i.e. [imageWidth, imageHeight], not the
      // viewport's screen box. Using renderedHeightAtScale1 here (not
      // viewportSize.height) is what keeps panning correctly bounded to
      // the actual floor plan whenever its aspect ratio doesn't match
      // the viewport's.
      .translateExtent([
        [0, 0],
        [viewportSize.width, renderedHeightAtScale1],
      ]);
  }, [viewportSize, renderedHeightAtScale1]);

  const getPosition = (
    clientX: number,
    clientY: number
  ) => {
    const container = mapRef.current;

    if (!container) return null;

    const rect =
      container.getBoundingClientRect();

    // rect.height is now the viewport's fixed full-height box (see the
    // viewportSize/renderedHeightAtScale1 comments above), not the
    // image's own rendered height - dividing localY by it directly
    // (like this used to, before the full-screen redesign) would
    // silently compute the wrong Y percentage whenever the floor plan's
    // aspect ratio doesn't exactly match the viewport's. rect.width is
    // still correct as-is: the image is always CSS width:100% of the
    // viewport, so image width and viewport width match at every zoom
    // level - only height needed the swap to renderedHeightAtScale1.
    // Requiring it to be known (not falling back like the effect above
    // does) is deliberate here: a drag/click that lands before the
    // image has actually loaded has nothing real to compute a position
    // against yet, so returning null (rather than a wrong number) is
    // the safe outcome - finishDrag() already falls back to the seat's
    // pre-drag position whenever getPosition() returns null.
    if (!rect.width || !renderedHeightAtScale1) {
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
    const y = (localY / renderedHeightAtScale1) * 100;

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
      scheduleSeatClick(seat);
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

  // Centers the WHOLE floor plan in the viewport with padding on every
  // side, computed from the image's real aspect ratio (imageNaturalSize)
  // rather than assuming it matches the viewport's - see the MIN_SCALE
  // comment above for why k=1 alone doesn't already guarantee this.
  // Silently no-ops until both the image has loaded and the viewport has
  // been measured at least once (both required inputs below).
  const fitMap = () => {
    const viewport = zoomViewportRef.current;
    const behavior = zoomBehaviorRef.current;

    if (
      !viewport ||
      !behavior ||
      !viewportSize.width ||
      !viewportSize.height ||
      !imageNaturalSize.width ||
      !imageNaturalSize.height
    ) {
      return;
    }

    // renderedHeightAtScale1 here is the component-level value declared
    // above (not recomputed) - the guard clause just above already
    // guarantees imageNaturalSize/viewportSize.width are both known, so
    // it's already the real image-derived height, not the viewportSize
    // fallback.
    const availableWidth =
      viewportSize.width * (1 - FIT_PADDING_RATIO * 2);

    const availableHeight =
      viewportSize.height * (1 - FIT_PADDING_RATIO * 2);

    const fitScale = clampScale(
      Math.min(
        availableWidth / viewportSize.width,
        availableHeight / renderedHeightAtScale1
      )
    );

    const renderedWidthAtFit = viewportSize.width * fitScale;
    const renderedHeightAtFit = renderedHeightAtScale1 * fitScale;

    const x = (viewportSize.width - renderedWidthAtFit) / 2;
    const y = (viewportSize.height - renderedHeightAtFit) / 2;

    select(viewport)
      .transition()
      .duration(300)
      .call(
        behavior.transform,
        zoomIdentity.translate(x, y).scale(fitScale)
      );
  };

  // Pans and zooms to a specific workstation (a search-result click) and
  // settles at a close-up but not-maxed-out scale so its neighbors stay
  // visible for context. Highlighting the seat itself is the caller's
  // job (via the selectedSeatId prop) - this only ever moves the camera.
  const focusSeat = (seatId: number) => {
    const viewport = zoomViewportRef.current;
    const behavior = zoomBehaviorRef.current;
    const seat = positionedSeats.find((item) => item.id === seatId);

    if (
      !viewport ||
      !behavior ||
      !seat ||
      !viewportSize.width ||
      !viewportSize.height ||
      !imageNaturalSize.width ||
      !imageNaturalSize.height
    ) {
      return;
    }

    // renderedHeightAtScale1 here is the component-level value declared
    // above (not recomputed) - see the same note in fitMap().
    const targetScale = clampScale(FOCUS_SEAT_SCALE);

    const pointX =
      (clamp(Number(seat.xPosition)) / 100) * viewportSize.width;

    const pointY =
      (clamp(Number(seat.yPosition)) / 100) * renderedHeightAtScale1;

    const x = viewportSize.width / 2 - pointX * targetScale;
    const y = viewportSize.height / 2 - pointY * targetScale;

    select(viewport)
      .transition()
      .duration(400)
      .call(
        behavior.transform,
        zoomIdentity.translate(x, y).scale(targetScale)
      );
  };

  useImperativeHandle(ref, () => ({
    fitMap,
    focusSeat,
  }));

  // Fit Map runs automatically once there's actually something to fit
  // (the image has loaded AND the viewport has been measured), and again
  // on every subsequent viewportSize change - which covers all of
  // "initial load," "floor changes" (imageNaturalSize resets to 0 on
  // mapUrl change above, so this only fires again once the NEW image
  // reports its size), and "browser window is resized." An explicit
  // click on the Fit Map button calls fitMap() directly instead.
  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) return;
    if (!imageNaturalSize.width || !imageNaturalSize.height) return;

    fitMap();
    // Deliberately keyed only on the actual inputs fitMap's math
    // depends on, not on fitMap itself (a plain function redefined
    // every render) - otherwise this would re-fit on every unrelated
    // re-render (e.g. a seat being dragged), fighting the user's
    // current pan/zoom for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapUrl,
    imageNaturalSize.width,
    imageNaturalSize.height,
    viewportSize.width,
    viewportSize.height,
  ]);

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
      !renderedHeightAtScale1
    ) {
      return;
    }

    // translateTo's x/y are in the image's own coordinate space (see
    // the translateExtent comment above) - contentFractionY therefore
    // has to scale against renderedHeightAtScale1 (the image's real
    // rendered height), not viewportSize.height, or a click on the
    // minimap would center the wrong point whenever the floor plan's
    // aspect ratio doesn't match the viewport's.
    select(viewport)
      .transition()
      .duration(300)
      .call(
        behavior.translateTo,
        clamp01(contentFractionX) * viewportSize.width,
        clamp01(contentFractionY) * renderedHeightAtScale1
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

    // Same content-space-vs-viewport-space distinction as
    // translateExtent/panTo above - the visible region's top edge, as a
    // percentage of the image's real height, needs renderedHeightAtScale1
    // as the denominator, not viewportSize.height.
    const topPct = clamp(
      (-transform.y / transform.k / renderedHeightAtScale1) * 100
    );

    // widthPct can get away with the simpler 100/k form because
    // content-width equals viewportSize.width by construction (the
    // image is always CSS width:100% of the viewport), so that ratio
    // already cancels out. heightPct doesn't have that shortcut -
    // content-height is renderedHeightAtScale1, not viewportSize.height
    // (same distinction as topPct just above), so the visible slice's
    // screen-space height (viewportSize.height / k) has to be expressed
    // as a percentage of renderedHeightAtScale1 explicitly, or this
    // rectangle comes out the wrong height whenever the floor plan's
    // aspect ratio doesn't match the viewport's.
    const widthPct = Math.min(
      100 / transform.k,
      100 - leftPct
    );

    const heightPct = Math.min(
      ((viewportSize.height / transform.k) / renderedHeightAtScale1) * 100,
      100 - topPct
    );

    return { leftPct, topPct, widthPct, heightPct };
    // zoomScale is read only to force this to recompute on every zoom
    // event (zoomTransformRef itself doesn't trigger re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOverview, zoomScale, viewportSize, renderedHeightAtScale1]);

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
    // See the onPointerDown handler on this same minimap element below
    // for why this is needed - stopping propagation here too closes the
    // same door for the 'click' event, not just 'pointerdown'.
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    panTo(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height
    );
  };

  if (!mapUrl) {
    return (
      <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
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
    // Full-height/width shell - the parent (the sticky-header dialog
    // shell in office-locations-page.tsx) is what actually reserves the
    // viewport space; this component just fills whatever box it's
    // given. No header/search/legend text blocks live here any more -
    // those moved to the parent's sticky header (floor name, workstation/
    // occupied/vacant stats, search input) so the map itself gets
    // maximum space instead of being squeezed by stacked chrome above
    // it. overflow-hidden here is what guarantees "no page scrolling to
    // reach the map" - everything below is either the map itself or an
    // absolutely-positioned overlay on top of it.
    //
    // data-floor-map-root marks this whole subtree for the full-screen
    // map Dialog in office-locations-page.tsx (see its own
    // onPointerDownOutside/onInteractOutside handlers), which treat any
    // interaction inside this marker as NOT an outside click. This is a
    // belt-and-suspenders guard on top of the per-control
    // stopPropagation fix already applied to the minimap and zoom
    // buttons: live testing showed a plain click directly on the map's
    // own blank background (not any specific control, and not mid any
    // zoom/pan animation) could also occasionally get misclassified by
    // Radix as an outside click and close the whole dialog. Rather than
    // keep chasing individual descendants one at a time, this covers
    // the entire map surface at once, the same way data-asset-detail-
    // panel already covers the details panel.
    <div
      data-floor-map-root="true"
      className="relative flex h-full w-full flex-col overflow-hidden"
    >

      {/* MAP */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/20">
        {/*
          This wrapper (not overflow-hidden) is what the zoom controls,
          minimap, Help popover, and floating legend are positioned
          against. It sits OUTSIDE the overflow-hidden/zoom-managed
          viewport below, so none of those overlays are ever clipped by
          it, and none of them are a descendant of the element d3-zoom
          attaches its wheel/pointer listeners to - clicking a control
          can never also start a pan. It's pinned to fill this flex-1
          area exactly (absolute inset-0, not the old mx-auto/max-width
          block) - that's the fixed box viewportSize/fitMap's math is
          computed against, and it's what makes the map a true
          full-viewport surface instead of a capped-width column.
        */}
        <div className="absolute inset-0">
          <div
            ref={(element) => {
              mapRef.current = element;
              zoomViewportRef.current = element;
            }}
            className={[
              // A light neutral backdrop, not bg-background (near-white,
              // same as the floor plan's own white canvas) - a floor
              // plan whose proportions don't match the viewport's
              // (portrait plan, landscape screen) leaves visible margin
              // on one axis once fully fit (see the FIT_PADDING_RATIO
              // comment). Against a same-white backdrop that margin
              // reads as broken/empty space; against a slightly tinted
              // one, plus the shadow/ring on the image itself below, it
              // reads as a deliberately framed page instead.
              'absolute inset-0 overflow-hidden rounded-md bg-muted',
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
                // shadow/ring are purely cosmetic framing (they don't
                // change the image's own box size or position, so
                // getPosition()'s coordinate math and fitMap/focusSeat
                // are unaffected) - this is what makes a portrait floor
                // plan's side margins in a landscape viewport read as a
                // deliberately framed page instead of empty/broken
                // space, alongside the backdrop color above.
                className="pointer-events-none block h-auto w-full select-none rounded-sm shadow-lg ring-1 ring-black/10"
                draggable={false}
                onLoad={(event) => {
                  // The zoom layer's height is (and always was) driven
                  // purely by the img's own aspect ratio at CSS
                  // width:100% - see the MIN_SCALE comment above. This
                  // is the one place that ratio becomes known, so
                  // fitMap()/focusSeat() (and the auto-fit effect that
                  // calls fitMap on mount) stay no-ops until it fires.
                  const target = event.currentTarget;

                  setImageNaturalSize({
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                  });
                }}
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

                      // When onSeatMove is set (canEdit), a plain click
                      // is already handled by finishDrag() above via the
                      // pointerdown/pointerup pair - this branch only
                      // matters for a consumer that wires onSeatClick
                      // without onSeatMove, and uses the same delayed
                      // scheduling so it can't race onDoubleClick either.
                      if (!onSeatMove) {
                        scheduleSeatClick(seat);
                      }
                    }}

                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      cancelPendingSeatClick();
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

                      // A seat's tooltip already shows on plain hover
                      // (see the TOOLTIP className below), but a plain
                      // hover was never in the z-index tiers above -
                      // it stayed at the same z-30 as every other
                      // unselected seat. Two seats tied on z-index
                      // stack by DOM order, so a neighboring seat
                      // later in the list could paint its dot right
                      // over the hovered seat's tooltip whenever they
                      // were close enough on screen to overlap.
                      // hover:z-50 (CSS :hover, so this also fires
                      // while hovering the dot inside) outranks every
                      // tier above it, guaranteeing whatever you're
                      // currently pointing at is always on top.
                      'hover:z-50',

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

                    {/* TOOLTIP - color-coded to match the dot's own
                        occupied (green) / vacant (slate) status, since
                        on a black-and-white floor plan this card is the
                        only thing on screen with any color at all, and
                        it used to be a plain white/gray box that didn't
                        stand out against the line-art underneath it. A
                        light background tint (not a dark/heavy header)
                        is the main signal here, per explicit feedback -
                        the solid-color status pill still gives a strong
                        at-a-glance read without the whole header being
                        dark. */}
                    {!isDragging && (
                      <span
                        className={[
                          'pointer-events-none absolute',
                          'left-1/2 top-7',
                          '-translate-x-1/2',
                          'min-w-[220px] overflow-hidden',
                          'rounded-lg border shadow-xl',
                          occupied
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-300 bg-slate-50',

                          searchMatch ||
                          selected
                            ? 'block'
                            : 'hidden group-hover:block',

                        ].join(' ')}
                      >

                        {/* Header band - a light tint (not a solid dark
                            fill) carrying the user's name and a status
                            pill, so status is still legible at a glance
                            before reading any row below. */}
                        <span
                          className={[
                            'flex items-center justify-between gap-2 border-b px-3 py-1.5',
                            occupied
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                              : 'border-slate-300 bg-slate-200 text-slate-700',
                          ].join(' ')}
                        >
                          <span className="truncate font-semibold">
                            {seat.userName ??
                              'Unassigned user'}
                          </span>

                          <span
                            className={[
                              'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white',
                              occupied
                                ? 'bg-emerald-500'
                                : 'bg-slate-400',
                            ].join(' ')}
                          >
                            {occupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </span>

                        <span className="block space-y-1 px-3 py-2">
                          {seat.employeeCode && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3 w-3 shrink-0 text-emerald-600" />
                              <span className="text-muted-foreground">
                                Employee:
                              </span>
                              <span className="font-medium text-slate-800">
                                {seat.employeeCode}
                              </span>
                            </span>
                          )}

                          <span className="flex items-center gap-1.5">
                            <Laptop className="h-3 w-3 shrink-0 text-sky-600" />
                            <span className="text-muted-foreground">
                              Hostname:
                            </span>
                            <span className="font-medium text-slate-800">
                              {seat.hostName ?? '—'}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 shrink-0 text-amber-600" />
                            <span className="text-muted-foreground">
                              Department:
                            </span>
                            <span className="font-medium text-slate-800">
                              {seat.departmentName ?? '—'}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Laptop className="h-3 w-3 shrink-0 text-violet-600" />
                            <span className="text-muted-foreground">
                              Asset:
                            </span>
                            <span className="font-medium text-slate-800">
                              {seat.assetTag ?? '—'}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0 text-rose-600" />
                            <span className="text-muted-foreground">
                              Seat:
                            </span>
                            <span className="font-medium text-slate-800">
                              {seat.seatCode}
                            </span>
                          </span>
                        </span>

                      </span>
                    )}

                  </button>
                );
              })}
            </div>
          </div>

          {/* EMPTY STATE - overlaid centered on the map instead of a
              block stacked below it, so it never costs the map any of
              its full-height layout space (it only ever appears when
              there's nothing to actually see on the map anyway). */}
          {positionedSeats.length === 0 && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-[100] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md border border-dashed bg-background/95 px-3 py-2 text-sm text-muted-foreground shadow-sm">
              <MapPin className="h-4 w-4" />
              No workstations have been positioned on this
              floor map yet.
            </div>
          )}

          {/* ADD-SEAT BANNER - only visible in add-seat mode, replaces
              the old full-width instruction block with a small pill
              overlaid on the map so it never takes layout space away
              from the map itself. */}
          {addMode && onMapClick && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-full border border-primary/40 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium shadow-md">
              <MapPin className="h-3.5 w-3.5" />
              Click anywhere on the map to place a new workstation there.
            </div>
          )}

          {/* HELP - replaces the two old always-visible instruction
              boxes (drag-to-move, double-click-for-details) with a
              single small button that only shows that guidance when
              asked for. */}
          <div className="pointer-events-auto absolute left-3 top-3 z-[100]">
            <button
              type="button"
              onClick={() => setHelpOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-md hover:bg-muted"
              aria-label="Help"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {helpOpen && (
              <div className="absolute left-0 top-11 w-72 rounded-md border bg-background p-3 text-xs shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">
                    Using the map
                  </span>

                  <button
                    type="button"
                    onClick={() => setHelpOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close help"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <ul className="space-y-1.5 text-muted-foreground">
                  <li>
                    Scroll or use +/- to zoom. Drag an empty part of
                    the map to pan. Click ⌂ to fit the whole floor
                    back on screen.
                  </li>

                  <li>
                    Search by employee, hostname, asset, department,
                    or seat to jump straight to a workstation.
                  </li>

                  {onSeatMove && (
                    <li>
                      Drag a workstation dot to reposition it - the
                      new position saves automatically.
                    </li>
                  )}

                  {onSeatDoubleClick && (
                    <li>
                      Double-click a workstation to see the system,
                      installed software, allocated licenses, and who
                      it&apos;s assigned to.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* FLOATING LEGEND - same colors/meaning as before, just a
              small corner overlay instead of a full-width bar. */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[100] flex items-center gap-3 rounded-md border bg-background/95 px-2.5 py-1.5 text-[11px] shadow-md">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-white bg-green-500 shadow" />
              <span>Occupied</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-white bg-gray-400 shadow" />
              <span>Vacant</span>
            </div>
          </div>

          {/* ZOOM CONTROLS */}
          <div className="pointer-events-auto absolute right-3 top-3 z-[100] flex flex-col overflow-hidden rounded-md border bg-background shadow-md">
            {/* stopPropagation on pointerDown for all three buttons
                below - same defensive reasoning as the minimap's own
                onPointerDown a bit further down this file: zoomBy()/
                fitMap() also kick off a d3 transition that re-renders
                this component for its duration, so this closes the
                same latent "second interaction lands mid-transition"
                door for these controls too, cheaply and pre-emptively. */}
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
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
              onPointerDown={(event) => event.stopPropagation()}
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
              onPointerDown={(event) => event.stopPropagation()}
              onClick={fitMap}
              className="flex h-9 w-9 items-center justify-center hover:bg-muted"
              aria-label="Fit Map"
              title="Fit Map"
            >
              <Home className="h-3.5 w-3.5" />
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
                // Reported bug: clicking this minimap could close the
                // whole full-screen map Dialog it lives inside. Traced
                // to panTo() below kicking off a 300ms d3 transition
                // that re-renders this component on every animation
                // frame - a second click landing in that window can
                // resolve to a different DOM target than its own
                // pointerdown did, which is enough for Radix's dismiss-
                // outside detection (a document-level pointerdown
                // listener) to misclassify the interaction as outside
                // the dialog and close it. Stopping propagation here
                // keeps the pointerdown from ever reaching that
                // document-level listener at all, regardless of what
                // the DOM looks like a moment later when the click
                // itself resolves - same defensive pattern this file
                // already uses on every seat button's own pointer
                // handlers, just not previously applied here.
                onPointerDown={(event) => event.stopPropagation()}
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

    </div>
  );
});

export default OfficeFloorMap;
