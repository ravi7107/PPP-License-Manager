import { AppliedFilterEntry, ReportQueryRequest } from '@/lib/api/report-center.api';

const PREFIX = 'smartasset-report-center';

export interface SavedReport {
  id: string;
  name: string;
  reportId: string;
  reportTitle: string;
  filters: ReportQueryRequest;
  createdAt: string;
}

export interface RecentReport {
  reportId: string;
  reportTitle: string;
  usedAt: string;
}

export interface ReportHistoryEntry {
  id: string;
  reportId: string;
  reportTitle: string;
  generatedAt: string;
  filters: AppliedFilterEntry[];
  recordCount: number;
  format: 'Preview' | 'Excel';
  query: ReportQueryRequest;
}

function key(userKey: string, suffix: string): string {
  return `${PREFIX}:${userKey}:${suffix}`;
}

function readJson<T>(storageKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(storageKey: string, value: unknown): void {
  localStorage.setItem(storageKey, JSON.stringify(value));
}

export function getFavoriteIds(userKey: string): string[] {
  return readJson<string[]>(key(userKey, 'favorites'), []);
}

export function toggleFavorite(userKey: string, reportId: string): string[] {
  const current = getFavoriteIds(userKey);
  const next = current.includes(reportId)
    ? current.filter((id) => id !== reportId)
    : [reportId, ...current];
  writeJson(key(userKey, 'favorites'), next);
  return next;
}

export function getRecentReports(userKey: string): RecentReport[] {
  return readJson<RecentReport[]>(key(userKey, 'recent'), []);
}

export function recordRecentUse(
  userKey: string,
  reportId: string,
  reportTitle: string
): RecentReport[] {
  const next = [
    { reportId, reportTitle, usedAt: new Date().toISOString() },
    ...getRecentReports(userKey).filter((item) => item.reportId !== reportId),
  ].slice(0, 8);
  writeJson(key(userKey, 'recent'), next);
  return next;
}

export function getSavedReports(userKey: string): SavedReport[] {
  return readJson<SavedReport[]>(key(userKey, 'saved'), []);
}

export function saveReport(userKey: string, report: Omit<SavedReport, 'id' | 'createdAt'>): SavedReport {
  const entry: SavedReport = {
    ...report,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  writeJson(key(userKey, 'saved'), [entry, ...getSavedReports(userKey)]);
  return entry;
}

export function deleteSavedReport(userKey: string, id: string): SavedReport[] {
  const next = getSavedReports(userKey).filter((item) => item.id !== id);
  writeJson(key(userKey, 'saved'), next);
  return next;
}

export function getReportHistory(userKey: string): ReportHistoryEntry[] {
  return readJson<ReportHistoryEntry[]>(key(userKey, 'history'), []);
}

export function recordReportHistory(
  userKey: string,
  entry: Omit<ReportHistoryEntry, 'id'>
): ReportHistoryEntry[] {
  const next = [
    { ...entry, id: crypto.randomUUID() },
    ...getReportHistory(userKey),
  ].slice(0, 50);
  writeJson(key(userKey, 'history'), next);
  return next;
}

export function queryToSearch(query: ReportQueryRequest): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.set(k, String(value));
  });
  return params.toString();
}
