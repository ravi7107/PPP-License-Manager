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
import { SoftwareInventoryRecord } from '@/app/pages/licenses/types';

interface SoftwareDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SoftwareInventoryRecord | null;
  deleting: boolean;
  onConfirm: () => Promise<void>;
}

export function SoftwareDeleteDialog({ open, onOpenChange, record, deleting, onConfirm }: SoftwareDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retire this software license?</AlertDialogTitle>
          <AlertDialogDescription>
            {record ? (
              <>
                <span className="font-medium text-foreground">{record.software_name}</span> will be marked as{' '}
                <span className="font-medium">Retired</span> and removed from the active inventory list.
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
            {deleting ? 'Retiring…' : 'Retire License'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
