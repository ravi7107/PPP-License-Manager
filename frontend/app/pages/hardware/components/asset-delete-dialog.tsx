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
  error?: string | null;
  onConfirm: () => Promise<void>;
}

export function AssetDeleteDialog({ open, onOpenChange, asset, deleting, error, onConfirm }: AssetDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retire this asset?</AlertDialogTitle>
          <AlertDialogDescription>
            {asset ? (
              <>
                <span className="font-medium text-foreground">{asset.assetTag}</span> will be marked as{' '}
                <span className="font-medium">Retired</span> and removed from the active inventory list. This
                action can be reviewed later in the asset's assignment history.
              </>
            ) : null}
          </AlertDialogDescription>
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
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
