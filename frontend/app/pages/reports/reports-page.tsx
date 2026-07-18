import { useState } from 'react';
import {
  KeySquare,
  Building2,
  Briefcase,
  Users,
  MapPin,
  AlertTriangle,
  CalendarClock,
  HardDrive,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicenseUtilizationReport } from '@/app/pages/reports/components/license-utilization-report';
import { SoftwareCostReport } from '@/app/pages/reports/components/software-cost-report';
import { DepartmentCostReport } from '@/app/pages/reports/components/department-cost-report';
import { EntityWiseReport } from '@/app/pages/reports/components/entity-wise-report';
import { ClientWiseReport } from '@/app/pages/reports/components/client-wise-report';
import { UnusedLicensesReport } from '@/app/pages/reports/components/unused-licenses-report';
import { LicenseExpiryReport } from '@/app/pages/reports/components/license-expiry-report';
import { AssetAllocationReport } from '@/app/pages/reports/components/asset-allocation-report';
import { AssetUtilizationReport } from '@/app/pages/reports/components/asset-utilization-report';
import { AuditReport } from '@/app/pages/reports/components/audit-report';
import { MonthlySummaryReport } from '@/app/pages/reports/components/monthly-summary-report';

type ReportKey =
  | 'licenseUtilization'
  | 'softwareCost'
  | 'departmentCost'
  | 'entityCost'
  | 'clientCost'
  | 'unusedLicenses'
  | 'licenseExpiry'
  | 'assetAllocation'
  | 'assetUtilization'
  | 'audit'
  | 'monthlySummary';

const REPORTS: { key: ReportKey; label: string; icon: typeof KeySquare; description: string }[] = [
  { key: 'licenseUtilization', label: 'License Utilization', icon: KeySquare, description: 'Drill down into where a software title is used.' },
  { key: 'softwareCost', label: 'Software Cost', icon: BarChart3, description: 'Total license spend per software title.' },
  { key: 'departmentCost', label: 'Department Cost', icon: Briefcase, description: 'License spend attributable to each department.' },
  { key: 'entityCost', label: 'Entity Cost', icon: Building2, description: 'License spend and seat usage per entity.' },
  { key: 'clientCost', label: 'Client Cost', icon: Users, description: 'Client-billed license pools and allocations.' },
  { key: 'unusedLicenses', label: 'Unused Licenses', icon: AlertTriangle, description: 'License pools with unused seats and wasted spend.' },
  { key: 'licenseExpiry', label: 'License Expiry', icon: CalendarClock, description: 'License pools nearing or past expiry.' },
  { key: 'assetAllocation', label: 'Asset Allocation', icon: MapPin, description: 'Current assignment of every asset.' },
  { key: 'assetUtilization', label: 'Asset Utilization', icon: HardDrive, description: 'Fleet breakdown by status and assignment.' },
  { key: 'audit', label: 'Audit Report', icon: ShieldCheck, description: 'Recent create/update/delete activity across the system.' },
  { key: 'monthlySummary', label: 'Monthly Summary', icon: TrendingUp, description: 'Month-by-month activity trend.' },
];

export default function ReportsPage() {
  const [selected, setSelected] = useState<ReportKey>('licenseUtilization');
  const active = REPORTS.find((r) => r.key === selected) ?? REPORTS[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Management Reports</CardTitle>
          <CardDescription>{active.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selected} onValueChange={(v) => setSelected(v as ReportKey)}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a report…" />
            </SelectTrigger>
            <SelectContent>
              {REPORTS.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  <span className="flex items-center gap-2">
                    <r.icon className="h-4 w-4" />
                    {r.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selected === 'licenseUtilization' && <LicenseUtilizationReport />}
      {selected === 'softwareCost' && <SoftwareCostReport />}
      {selected === 'departmentCost' && <DepartmentCostReport />}
      {selected === 'entityCost' && <EntityWiseReport />}
      {selected === 'clientCost' && <ClientWiseReport />}
      {selected === 'unusedLicenses' && <UnusedLicensesReport />}
      {selected === 'licenseExpiry' && <LicenseExpiryReport />}
      {selected === 'assetAllocation' && <AssetAllocationReport />}
      {selected === 'assetUtilization' && <AssetUtilizationReport />}
      {selected === 'audit' && <AuditReport />}
      {selected === 'monthlySummary' && <MonthlySummaryReport />}
    </div>
  );
}
