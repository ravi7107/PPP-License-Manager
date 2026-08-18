import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Lightweight local history of scans - just enough to render the
 * "Recent Scans" list (section 16), never a mirror of the asset
 * database (section 16/24: "do not duplicate the entire database
 * locally"). Capped at MAX_ENTRIES, oldest dropped first.
 */

export interface RecentScanEntry {
  assetId: number;
  assetTag: string;
  assetName: string;
  locationName?: string | null;
  status: string;
  scannedAt: string; // ISO timestamp
}

const RECENT_SCANS_KEY = 'pps_scanner_recent_scans';
const MAX_ENTRIES = 50;

export async function getRecentScans(): Promise<RecentScanEntry[]> {
  const raw = await AsyncStorage.getItem(RECENT_SCANS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentScanEntry[]) : [];
  } catch {
    return [];
  }
}

export async function recordScan(entry: RecentScanEntry): Promise<void> {
  const existing = await getRecentScans();

  // Move a rescanned asset to the top instead of listing it twice.
  const withoutDuplicate = existing.filter((e) => e.assetId !== entry.assetId);
  const next = [entry, ...withoutDuplicate].slice(0, MAX_ENTRIES);

  await AsyncStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(next));
}

export async function clearRecentScans(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SCANS_KEY);
}
