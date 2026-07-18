import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SoftwareInventoryRecord } from '@/app/pages/licenses/types';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Active':
      return 'default';
    case 'Expired':
      return 'destructive';
    default:
      return 'outline';
  }
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value !== null && value !== undefined && value !== '' ? value : '—'}</p>
    </div>
  );
}

interface SoftwareViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SoftwareInventoryRecord | null;
}

export function SoftwareViewDialog({ open, onOpenChange, record }: SoftwareViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {record.software_name}
            <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            {record.vendor} {record.version ? `· v${record.version}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="License Type" value={record.license_type} />
          <Field label="Entity" value={record.entity_name} />
          <Field label="Department" value={record.department_name} />
          <Field label="Client" value={record.client_name} />
          <Field label="License Count" value={record.license_count} />
          <Field label="Used Licenses" value={record.used_licenses} />
          <Field label="Available Licenses" value={record.available_licenses} />
          <Field label="Cost Per License" value={`$${Number(record.cost_per_license).toFixed(2)}`} />
          <Field label="Total Cost" value={`$${Number(record.total_cost).toFixed(2)}`} />
          <Field label="Expiry Date" value={record.expiry_date?.slice(0, 10)} />
          <Field label="Maintenance Expiry" value={record.maintenance_expiry?.slice(0, 10)} />
          <Field label="Associated Assets" value={record.associated_assets || 'None'} />
          <Field label="Associated Users" value={record.associated_users || 'None'} />
          <Field label="Created By" value={record.created_by} />
          <Field label="Last Updated By" value={record.updated_by} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
