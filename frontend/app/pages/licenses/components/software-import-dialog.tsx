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
import { parseSoftwareExcelFile, ImportedSoftwareRow } from '@/lib/utils/software-excel';

interface SoftwareImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importing: boolean;
  onImport: (rows: ImportedSoftwareRow[]) => Promise<void>;
}

export function SoftwareImportDialog({ open, onOpenChange, importing, onImport }: SoftwareImportDialogProps) {
  const [rows, setRows] = useState<ImportedSoftwareRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    try {
      const parsed = await parseSoftwareExcelFile(file);
      const valid = parsed.filter((r) => r.softwareName);
      if (valid.length === 0) {
        setError('No valid rows found. Make sure the sheet has a "Software Name" column.');
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
          <DialogTitle>Import Software Licenses from Excel</DialogTitle>
          <DialogDescription>
            Upload an .xlsx file with columns: Software Name, Vendor, Version, License Type, Total Licenses, Cost Per
            License, Expiry Date, Maintenance Expiry, Status.
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

        {rows.length > 0 ? (
          <div className="max-h-64 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Software Name</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Licenses</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.softwareName}</TableCell>
                    <TableCell>{row.vendor}</TableCell>
                    <TableCell>{row.licenseCount}</TableCell>
                    <TableCell>{row.status || 'Active'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="p-2 text-xs text-muted-foreground">{rows.length} row(s) ready to import.</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={rows.length === 0 || importing}
            onClick={async () => {
              await onImport(rows);
              reset();
            }}
          >
            {importing ? 'Importing…' : `Import ${rows.length || ''} License(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
