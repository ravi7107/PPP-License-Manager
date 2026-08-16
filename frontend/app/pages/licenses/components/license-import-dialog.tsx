import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseLicensesExcelFile, ImportedLicenseRow } from '@/lib/utils/license-excel';

export interface LicenseImportResult {
  succeeded: number;
  failed: { row: ImportedLicenseRow; message: string }[];
}

interface LicenseImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importing: boolean;
  onImport: (rows: ImportedLicenseRow[]) => Promise<LicenseImportResult>;
}

export function LicenseImportDialog({ open, onOpenChange, importing, onImport }: LicenseImportDialogProps) {
  const [rows, setRows] = useState<ImportedLicenseRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<LicenseImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    try {
      const parsed = await parseLicensesExcelFile(file);
      const valid = parsed.filter((r) => r.aliasCode && r.software);
      if (valid.length === 0) {
        setError('No valid rows found. Make sure the sheet has "Alias Code" and "Software" columns filled in.');
      }
      setRows(valid);
      setFileName(file.name);
    } catch (e) {
      setError('Could not read this file. Please upload a valid .xlsx file.');
    }
  };

  const reset = () => {
    setRows([]);
    setFileName('');
    setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Licenses from Excel</DialogTitle>
          <DialogDescription>
            Upload the .xlsx template exported from this page (Export button above) filled in with your real
            license inventory, or any .xlsx with matching column headers: Alias Code, Software, Purchase Batch (PO
            Number), Licensed Email, Subscription ID, Purchase Date, Expiry Date, Purchase Cost, Allow Temporary
            Checkout, Max Checkout Days, Remarks. Alias Code and Software are required — everything else falls back
            to a sensible default. Software is matched by name against what's already set up under Software
            Catalog; add it there first if a title is missing. Purchase Batch is optional and matched by PO Number
            against existing License Purchases — leave it blank if you haven't set those up yet, the license will
            still import with its own Purchase Date/Expiry Date/Cost. Column headers are matched case-insensitively
            and ignore extra spacing.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/50"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{fileName || 'Click to select an .xlsx file'}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {rows.length > 0 && !result ? (
          <div className="max-h-64 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias Code</TableHead>
                  <TableHead>Software</TableHead>
                  <TableHead>Licensed Email</TableHead>
                  <TableHead>Purchase Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.aliasCode}</TableCell>
                    <TableCell>{row.software}</TableCell>
                    <TableCell>{row.licensedEmail || '—'}</TableCell>
                    <TableCell>{row.purchasePoNumber || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="p-2 text-xs text-muted-foreground">{rows.length} row(s) ready to import.</p>
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium text-emerald-700">{result.succeeded} imported</span>
              {result.failed.length > 0 ? (
                <span className="text-destructive"> · {result.failed.length} failed</span>
              ) : null}
            </p>

            {result.failed.length > 0 ? (
              <div className="max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alias Code</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.failed.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{f.row.aliasCode || '—'}</TableCell>
                        <TableCell className="text-destructive">{f.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {result ? 'Close' : 'Cancel'}
          </Button>

          {!result ? (
            <Button
              type="button"
              disabled={rows.length === 0 || importing}
              onClick={async () => {
                const outcome = await onImport(rows);
                setResult(outcome);
              }}
            >
              {importing ? 'Importing…' : `Import ${rows.length || ''} License(s)`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
