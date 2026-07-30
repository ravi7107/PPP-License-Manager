import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AssetRecord } from '@/app/pages/hardware/types';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Allocated':
      return 'default';
    case 'Maintenance':
      return 'secondary';
    case 'Scrap':
      return 'destructive';
    default:
      return 'outline';
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value && value.length > 0 ? value : '—'}</p>
    </div>
  );
}

interface AssetViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
}

export function AssetViewDialog({ open, onOpenChange, asset }: AssetViewDialogProps) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {asset.asset_tag}
            <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
          </DialogTitle>
          <DialogDescription>{asset.asset_type} asset details</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Computer Name" value={asset.computer_name} />
          <Field label="Host Name" value={asset.host_name} />
          <Field label="Serial Number" value={asset.serial_number} />
          <Field label="Manufacturer" value={asset.manufacturer} />
          <Field label="Model" value={asset.model} />
          <Field label="Operating System" value={asset.operating_system} />
          <Field label="Purchase Date" value={asset.purchase_date?.slice(0, 10)} />
          <Field label="Warranty Expiry" value={asset.warranty_expiry?.slice(0, 10)} />
          <Field label="Current User" value={asset.assigned_user_name} />
          <Field label="Department" value={asset.department_name} />
          <Field label="Entity" value={asset.entity_name} />
          <Field label="Client" value={asset.client_name} />
          <Field label="Location" value={asset.location} />
          <Field label="Remarks" value={asset.remarks} />
          <Field label="Created By" value={asset.created_by} />
          <Field label="Last Updated By" value={asset.updated_by} />
          <Field label="Last Updated At" value={asset.updated_at?.slice(0, 19).replace('T', ' ')} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
