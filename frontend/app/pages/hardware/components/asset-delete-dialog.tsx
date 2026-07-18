import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AssetRecord } from '@/app/pages/hardware/types';

interface AssetDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetRecord | null;
  deleting: boolean;
  onConfirm: () => Promise<void>;
}

export function AssetDeleteDialog({ open, onOpenChange, asset, deleting, onConfirm }: AssetDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retire this asset?</AlertDialogTitle>
          <AlertDialogDescription>
            {asset ? (
              <>
                <span className="font-medium text-foreground">{asset.asset_tag}</span> will be marked as{' '}
                <span className="font-medium">Decommissioned</span> and removed from the active inventory list. This
                action can be reviewed later in Audit History.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
          >
            {deleting ? 'Retiring…' : 'Retire Asset'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
