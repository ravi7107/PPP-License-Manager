import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Software } from '@/lib/api/software.api';
import { AssetSoftware } from '@/lib/api/asset-software.api';

const formSchema = z.object({
  softwareId: z.string().min(1, 'Select the software'),
  version: z.string().optional(),
  licenseKey: z.string().optional(),
  installDate: z.string().min(1, 'Install date is required'),
  status: z.enum(['Installed', 'Removed']),
  remarks: z.string().optional(),
});

export type AssetSoftwareFormValues = z.infer<typeof formSchema>;

function toDateInputValue(value: string | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function emptyValues(): AssetSoftwareFormValues {
  return {
    softwareId: '',
    version: '',
    licenseKey: '',
    installDate: new Date().toISOString().slice(0, 10),
    status: 'Installed',
    remarks: '',
  };
}

interface AssetSoftwareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string | null;
  softwareCatalog: Software[];
  // Present when editing an existing record - the software picker is
  // locked in that case (changing the software is a remove + re-add,
  // matching the "one active install per asset/software pair" rule the
  // backend already enforces on create).
  editing: AssetSoftware | null;
  onSubmit: (values: AssetSoftwareFormValues) => Promise<void>;
}

export function AssetSoftwareFormDialog({
  open,
  onOpenChange,
  saving,
  error,
  softwareCatalog,
  editing,
  onSubmit,
}: AssetSoftwareFormDialogProps) {
  const form = useForm<AssetSoftwareFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        softwareId: String(editing.softwareId),
        version: editing.version || '',
        licenseKey: editing.licenseKey || '',
        installDate: toDateInputValue(editing.installDate),
        status: editing.status === 'Removed' ? 'Removed' : 'Installed',
        remarks: editing.remarks || '',
      });
    } else {
      form.reset(emptyValues());
    }
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit Installed Software' : 'Add Installed Software'}
          </DialogTitle>
          <DialogDescription>
            Record which software or license copy is installed on this
            asset. This is separate from seat-based license allocation on
            the Software License Allocations page - use that page for
            "who owns this license seat", and this panel for "what's
            actually on this machine".
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="softwareId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!editing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select software" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {softwareCatalog.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                          {s.vendor ? ` (${s.vendor})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2024.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Install Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="licenseKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Key (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. XXXXX-XXXXX-XXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Installed">Installed</SelectItem>
                      <SelectItem value="Removed">Removed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this installation…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Software'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
