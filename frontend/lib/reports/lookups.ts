import { getCompanies, Company } from '@/lib/api/companies.api';
import { getDepartments, Department } from '@/lib/api/departments.api';
import { getSoftware, Software } from '@/lib/api/software.api';
import api from '@/lib/api/client';

export interface NamedLookup {
  id: number;
  name: string;
  companyId?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

async function tryList(
  paths: string[],
  mapItem: (item: Record<string, unknown>) => NamedLookup | null
): Promise<NamedLookup[]> {
  for (const path of paths) {
    try {
      const response = await api.get(path);
      const payload = response.data as ApiResponse<unknown> | unknown[];
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as ApiResponse<unknown>).data)
          ? ((payload as ApiResponse<unknown>).data as unknown[])
          : [];
      return rows
        .map((row) => mapItem((row ?? {}) as Record<string, unknown>))
        .filter((item): item is NamedLookup => item !== null);
    } catch {
      // Try the next known path — inventory and older clones differ.
    }
  }
  return [];
}

export async function loadReportLookups(): Promise<{
  companies: Company[];
  departments: Department[];
  locations: NamedLookup[];
  vendors: NamedLookup[];
  software: Software[];
}> {
  const [companies, departments, locations, vendors, software] = await Promise.all([
    getCompanies().catch(() => [] as Company[]),
    getDepartments().catch(() => [] as Department[]),
    tryList(
      ['/OfficeLocation', '/OfficeLocations'],
      (item) => {
        const id = Number(item.id);
        const name = String(item.locationName ?? item.name ?? '');
        if (!id || !name) return null;
        return {
          id,
          name,
          companyId: typeof item.companyId === 'number' ? item.companyId : undefined,
        };
      }
    ),
    tryList(
      ['/Vendor', '/Vendors'],
      (item) => {
        const id = Number(item.id);
        const name = String(item.vendorName ?? item.name ?? '');
        if (!id || !name) return null;
        return { id, name };
      }
    ),
    getSoftware().catch(() => [] as Software[]),
  ]);

  return { companies, departments, locations, vendors, software };
}
