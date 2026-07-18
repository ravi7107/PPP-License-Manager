import { useLoadAction } from '@/lib/uibakery';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadAssetAllocationReport from '@/actions/reports/loadAssetAllocationReport';
import { AssetAllocationRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const columns: ReportColumn<AssetAllocationRow>[] = [
  { key: 'asset_tag', header: 'Asset ID' },
  { key: 'computer_name', header: 'Computer Name' },
  { key: 'asset_type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'assigned_user_name', header: 'Assigned User' },
  { key: 'department_name', header: 'Department' },
  { key: 'entity_name', header: 'Entity' },
  { key: 'client_name', header: 'Client' },
  { key: 'location', header: 'Location' },
];

export function AssetAllocationReport() {
  const [rows, loading]: [AssetAllocationRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAssetAllocationReport,
    [],
    {},
  );

  return (
    <ReportTableCard
      title="Asset Allocation Report"
      description="Current assignment of every asset: user, department, entity, client, and location."
      rows={rows}
      columns={columns}
      loading={loading}
      fileBaseName="asset-allocation-report"
    />
  );
}
