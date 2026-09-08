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
import { parseLicensePurchasesExcelFile, ImportedLicensePurchaseRow } from '@/lib/utils/license-purchase-excel';

export interface LicensePurchaseImportResult {
  succeeded: number;
  failed: { row: ImportedLicensePurchaseRow; message: string }[];
}

interface LicensePurchaseImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importing: boolean;
  onImport: (rows: ImportedLicensePurchaseRow[]) => Promise<LicensePurchaseImportResult>;
}

export function LicensePurchaseImportDialog({
  open,
  onOpenChange,
  importing,
  onImport,
}: LicensePurchaseImportDialogProps) {
  const [rows, setRows] = useState<ImportedLicensePurchaseRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<LicensePurchaseImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    try {
      const parsed = await parseLicensePurchasesExcelFile(file);
      const valid = parsed.filter(
        (r) =>
          r.software.trim() &&
          r.vendor.trim() &&
          r.licenseType.trim() &&
          r.totalLicenses.trim() &&
          r.purchaseDate.trim(),
      );
      if (valid.length === 0) {
        setError(
          'No valid rows found. Make sure the sheet has "Software", "Vendor", "License Type", "Total Licenses" and "Purchase Date" columns filled in.',
        );
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
          <DialogTitle>Import License Purchases from Excel</DialogTitle>
          <DialogDescription>
            Upload the .xlsx template exported from this panel (Export button above) filled in with your real
            purchase batches, or any .xlsx with matching column headers: Software, Vendor, License Type, License
            Key, Total Licenses, Purchase Date, Expiry Date, Support Expiry Date, Entity, Department, Client, PO
            Number, Invoice Number, Contract Number, Cost, Currency, Purchase Source, Remarks. Software, Vendor,
            License Type, Total Licenses and Purchase Date are required — everything else falls back to a sensible
            default. Software is matched by name against what's already set up under Software Catalog; add it
            there first if a title is missing. Entity/Department/Client are optional and matched by name against
            existing records — leave them blank if this purchase isn't tied to one. Dates accept most everyday
            formats (e.g. "23/05/2027" or "23 May 2027") — a blank cell or placeholder text like "Perpetual"/"NA"
            is treated as no date, which is fine for Expiry/Support Expiry but not for the required Purchase Date.
            Column headers are matched case-insensitively and ignore extra spacing.
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
                  <TableHead>Software</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>License Type</TableHead>
                  <TableHead>Total Licenses</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.software}</TableCell>
                    <TableCell>{row.vendor}</TableCell>
                    <TableCell>{row.licenseType}</TableCell>
                    <TableCell>{row.totalLicenses}</TableCell>
                    <TableCell>{row.purchaseDate}</TableCell>
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
                      <TableHead>Software</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.failed.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{f.row.software || '—'}</TableCell>
                        <TableCell>{f.row.vendor || '—'}</TableCell>
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
              {importing ? 'Importing…' : `Import ${rows.length || ''} Purchase(s)`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
