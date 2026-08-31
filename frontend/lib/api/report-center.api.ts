import api from './client';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ReportFilterField {
  key: string;
  label: string;
  type: string;
  options?: string[] | null;
  defaultValue?: string | null;
}

export interface ReportCatalogEntry {
  id: string;
  title: string;
  category: string;
  description: string;
  filters: ReportFilterField[];
}

export interface AppliedFilterEntry {
  label: string;
  value: string;
}

export interface PagedResult {
  items: Record<string, unknown>[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages?: number;
}

export interface ReportPreviewEnvelope {
  reportId: string;
  reportTitle: string;
  result: unknown;
  appliedFilters: AppliedFilterEntry[];
  generatedAtUtc: string;
}

export interface ReportQueryRequest {
  companyId?: number | null;
  departmentId?: number | null;
  locationId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: string | null;
  search?: string | null;
  vendorId?: number | null;
  softwareId?: number | null;
  assetType?: string | null;
  groupBy?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc';
}

export async function getReportCatalog(): Promise<ReportCatalogEntry[]> {
  const response = await api.get<ApiResponse<ReportCatalogEntry[]>>(
    '/ReportCenter/catalog'
  );
  return response.data.data ?? [];
}

export async function previewReport(
  reportId: string,
  request: ReportQueryRequest
): Promise<ReportPreviewEnvelope> {
  const response = await api.post<ApiResponse<ReportPreviewEnvelope>>(
    `/ReportCenter/${encodeURIComponent(reportId)}/preview`,
    request
  );
  return response.data.data;
}

function fileNameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

export async function exportReport(
  reportId: string,
  request: ReportQueryRequest,
  fallbackName: string
): Promise<{ blob: Blob; fileName: string }> {
  try {
    const response = await api.post(
      `/ReportCenter/${encodeURIComponent(reportId)}/export`,
      request,
      { responseType: 'blob' }
    );

    const blob = response.data as Blob;
    if (blob.type && blob.type.includes('application/json')) {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { message?: string };
      throw new Error(parsed.message || 'Export failed.');
    }

    const fileName = fileNameFromDisposition(
      response.headers['content-disposition'],
      fallbackName
    );

    return { blob, fileName };
  } catch (error) {
    const axiosError = error as {
      response?: { data?: Blob; status?: number };
      message?: string;
    };
    const data = axiosError.response?.data;
    if (data instanceof Blob) {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || 'Export failed.');
      } catch (inner) {
        if (inner instanceof Error && inner.message !== 'Export failed.') {
          throw inner;
        }
        throw new Error(text || 'Export failed.');
      }
    }
    throw error;
  }
}

export function isPagedResult(value: unknown): value is PagedResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && typeof candidate.totalRecords === 'number';
}
