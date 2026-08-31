import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReportFilterField, ReportQueryRequest } from '@/lib/api/report-center.api';
import { Company } from '@/lib/api/companies.api';
import { Department } from '@/lib/api/departments.api';
import { Software } from '@/lib/api/software.api';
import { Client } from '@/lib/api/clients.api';
import { NamedLookup } from '@/lib/reports/lookups';

const ALL = '__all__';

export function emptyQueryFromFilters(
  filters: ReportFilterField[],
  defaults?: Partial<ReportQueryRequest>
): ReportQueryRequest {
  const query: ReportQueryRequest = {
    page: 1,
    pageSize: 20,
    sortDirection: 'asc',
    ...defaults,
  };

  filters.forEach((field) => {
    if (field.defaultValue && field.key === 'status' && !query.status) {
      query.status = field.defaultValue;
    }
    if (field.defaultValue && field.key === 'assetType' && !query.assetType) {
      query.assetType = field.defaultValue;
    }
  });

  return query;
}

export function ReportFilterPanel({
  filters,
  query,
  onChange,
  companies,
  departments,
  locations,
  vendors,
  software,
  clients = [],
}: {
  filters: ReportFilterField[];
  query: ReportQueryRequest;
  onChange: (next: ReportQueryRequest) => void;
  companies: Company[];
  departments: Department[];
  locations: NamedLookup[];
  vendors: NamedLookup[];
  software: Software[];
  clients: Client[];
}) {
  const departmentOptions = query.companyId
    ? departments.filter((department) => department.companyId === query.companyId)
    : departments;

  const locationOptions = query.companyId
    ? locations.filter(
        (location) => location.companyId === undefined || location.companyId === query.companyId
      )
    : locations;

  function patch(partial: Partial<ReportQueryRequest>) {
    onChange({ ...query, ...partial, page: 1 });
  }

  function selectNumber(
    key: 'companyId' | 'departmentId' | 'locationId' | 'vendorId' | 'softwareId' | 'clientId',
    value: string
  ) {
    const parsed = value === ALL ? null : Number(value);
    const next: Partial<ReportQueryRequest> = { [key]: parsed };
    if (key === 'companyId') {
      const stillValid = departmentOptions.some(
        (department) =>
          department.companyId === parsed && department.id === query.departmentId
      );
      if (!stillValid) next.departmentId = null;
    }
    patch(next);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {filters.map((field) => {
        if (field.type === 'company') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={query.companyId != null ? String(query.companyId) : ALL}
                onValueChange={(value) => selectNumber('companyId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.type === 'department') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={query.departmentId != null ? String(query.departmentId) : ALL}
                onValueChange={(value) => selectNumber('departmentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.type === 'location') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={query.locationId != null ? String(query.locationId) : ALL}
                onValueChange={(value) => selectNumber('locationId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.type === 'vendor') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={query.vendorId != null ? String(query.vendorId) : ALL}
                onValueChange={(value) => selectNumber('vendorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={String(vendor.id)}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.type === 'software') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={query.softwareId != null ? String(query.softwareId) : ALL}
                onValueChange={(value) => selectNumber('softwareId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {software.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.type === 'client') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={query.clientId != null ? String(query.clientId) : ALL}
                onValueChange={(value) => selectNumber('clientId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.type === 'dateRange') {
          return (
            <FilterField key={field.key} label={field.label} className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={query.dateFrom?.slice(0, 10) ?? ''}
                  onChange={(event) =>
                    patch({ dateFrom: event.target.value || null })
                  }
                />
                <Input
                  type="date"
                  value={query.dateTo?.slice(0, 10) ?? ''}
                  onChange={(event) =>
                    patch({ dateTo: event.target.value || null })
                  }
                />
              </div>
            </FilterField>
          );
        }

        if (field.type === 'status' || field.type === 'select') {
          const options = field.options ?? [];
          const current =
            field.key === 'groupBy'
              ? query.groupBy
              : field.key === 'movementType'
                ? query.movementType
                : query.status;
          return (
            <FilterField key={field.key} label={field.label}>
              <Select
                value={current || ALL}
                onValueChange={(value) =>
                  patch(
                    field.key === 'groupBy'
                      ? { groupBy: value === ALL ? null : value }
                      : field.key === 'movementType'
                        ? { movementType: value === ALL ? null : value }
                        : { status: value === ALL ? null : value }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          );
        }

        if (field.key === 'assetType') {
          return (
            <FilterField key={field.key} label={field.label}>
              <Input
                value={query.assetType ?? ''}
                placeholder="Laptop, Desktop…"
                onChange={(event) => patch({ assetType: event.target.value || null })}
              />
            </FilterField>
          );
        }

        return (
          <FilterField key={field.key} label={field.label}>
            <Input
              value={query.search ?? ''}
              placeholder="Search…"
              onChange={(event) => patch({ search: event.target.value || null })}
            />
          </FilterField>
        );
      })}
    </div>
  );
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
