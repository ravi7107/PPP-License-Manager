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
import { parseAssetsExcelFile, ImportedAssetRow } from '@/lib/utils/asset-excel';

export interface AssetImportResult {
  succeeded: number;
  failed: { row: ImportedAssetRow; message: string }[];
}

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importing: boolean;
  onImport: (rows: ImportedAssetRow[]) => Promise<AssetImportResult>;
}

export function AssetImportDialog({ open, onOpenChange, importing, onImport }: AssetImportDialogProps) {
  const [rows, setRows] = useState<ImportedAssetRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<AssetImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    try {
      const parsed = await parseAssetsExcelFile(file);
      const valid = parsed.filter((r) => r.assetTag);
      if (valid.length === 0) {
        setError('No valid rows found. Make sure the sheet has an "Asset ID" column.');
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
          <DialogTitle>Import Assets from Excel</DialogTitle>
          <DialogDescription>
            Upload the .xlsx template exported from this page (Export button above) filled in with your real
            inventory data, or any .xlsx with matching column headers: Asset ID, Asset Name, Asset Type, Entity,
            Department, Host Name, Serial Number, Manufacturer, Model, Processor, RAM (GB), Storage (GB), Graphics
            Card, Purchase Date, Warranty Expiry, Operating System, Status, Ownership Type, Vendor, Rental Start
            Date, Rental End Date, Dual Monitor. Only Asset ID is strictly required — everything else falls back to
            a sensible default. Entity and Department are matched by name against what's already set up in the
            system, per row (so one file can cover multiple departments). Column headers are matched
            case-insensitively and ignore extra spacing.
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
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.assetTag}</TableCell>
                    <TableCell>{row.assetName || row.computerName || row.hostName || '—'}</TableCell>
                    <TableCell>{row.entity || '—'}</TableCell>
                    <TableCell>{row.department || '—'}</TableCell>
                    <TableCell>{row.status || 'Available'}</TableCell>
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
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.failed.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{f.row.assetTag || '—'}</TableCell>
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
              {importing ? 'Importing…' : `Import ${rows.length || ''} Asset(s)`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
