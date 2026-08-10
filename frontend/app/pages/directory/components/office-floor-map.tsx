import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Map,
  MapPin,
  Move,
  Search,
  X,
} from 'lucide-react';

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

  onSeatMove?: (
    seat: OfficeSeat,
    xPosition: number,
    yPosition: number
  ) => Promise<void> | void;
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

export default function OfficeFloorMap({
  floor,
  seats,
  apiBaseUrl,
  selectedSeatId,
  onSeatClick,
  onSeatMove,
}: OfficeFloorMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

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

    const x =
      ((clientX - rect.left) / rect.width) * 100;

    const y =
      ((clientY - rect.top) / rect.height) * 100;

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

      {/* DRAG MESSAGE */}
      {onSeatMove && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Move className="h-4 w-4" />
          Drag a workstation dot to reposition it.
          The new position is saved automatically.
        </div>
      )}

      {/* MAP */}
      <div className="overflow-auto rounded-lg border bg-muted/20 p-2">
        <div
          ref={mapRef}
          className="relative mx-auto w-full overflow-hidden rounded-md bg-background"
          style={{
            maxWidth: '1400px',
            touchAction: 'none',
          }}
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

                className={[
                  'group absolute -translate-x-1/2 -translate-y-1/2',
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
