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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseUsersExcelFile, ImportedUserRow } from '@/lib/utils/user-excel';

export interface UserImportResult {
  succeeded: number;
  failed: { row: ImportedUserRow; message: string }[];
}

interface UserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importing: boolean;
  onImport: (
    rows: ImportedUserRow[],
    temporaryPassword: string,
    mustChangePassword: boolean,
  ) => Promise<UserImportResult>;
}

// Same 8-20 character rule CreateUserRequest.Password enforces server-side
// - checked here too so a bad shared password fails fast, before spending
// one API call per row just to find out.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 20;

export function UserImportDialog({ open, onOpenChange, importing, onImport }: UserImportDialogProps) {
  const [rows, setRows] = useState<ImportedUserRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<UserImportResult | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    try {
      const parsed = await parseUsersExcelFile(file);
      const valid = parsed.filter((r) => r.employeeCode || r.email);
      if (valid.length === 0) {
        setError('No valid rows found. Make sure the sheet has "Employee Code" and "Email" columns.');
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
    setTemporaryPassword('');
    setMustChangePassword(true);
    if (inputRef.current) inputRef.current.value = '';
  };

  const passwordValid =
    temporaryPassword.length >= PASSWORD_MIN && temporaryPassword.length <= PASSWORD_MAX;

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
          <DialogTitle>Import Users from Excel</DialogTitle>
          <DialogDescription>
            Upload the .xlsx template exported from this page (Export button above) filled in with your real
            employee data, or any .xlsx with matching column headers: Employee Code, Full Name, Email, Role, Entity,
            Department, Reports To (Employee Code). Employee Code, Full Name, Email and Role are required per row.
            Entity and Department are matched by name against what's already set up in the system and must both be
            filled in together — leave both blank, or leave either one unmatched, and the user is created
            unassigned rather than the row failing. Reports To is matched by Employee Code against existing users and
            other rows already imported earlier in this same file — list managers before their direct reports if
            you want that link to resolve in one pass. Column headers are matched case-insensitively.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="temp-password">Temporary password for every imported user</Label>
          <Input
            id="temp-password"
            type="password"
            autoComplete="new-password"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            placeholder="e.g. Welcome@2026"
          />
          <p className="text-xs text-muted-foreground">
            {PASSWORD_MIN}-{PASSWORD_MAX} characters. Everyone imported in this batch starts with this exact
            password — nothing per-row, so it never has to sit in your spreadsheet.
          </p>
          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
            />
            Force each imported user to change their password the first time they log in
          </label>
        </div>

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
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.employeeCode || '—'}</TableCell>
                    <TableCell>{row.fullName || '—'}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    <TableCell>{row.role || '—'}</TableCell>
                    <TableCell>{row.entity || '—'}</TableCell>
                    <TableCell>{row.department || '—'}</TableCell>
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
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.failed.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{f.row.employeeCode || f.row.email || '—'}</TableCell>
                        <TableCell className="text-destructive">{f.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Rows that failed because the person already exists are expected on a re-upload — nothing was
              duplicated. Fix and re-upload the same file any time; already-imported rows simply fail again
              harmlessly.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {result ? 'Close' : 'Cancel'}
          </Button>

          {!result ? (
            <Button
              type="button"
              disabled={rows.length === 0 || importing || !passwordValid}
              title={!passwordValid ? `Temporary password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` : undefined}
              onClick={async () => {
                try {
                  const outcome = await onImport(rows, temporaryPassword, mustChangePassword);
                  setResult(outcome);
                } catch (e: any) {
                  // Defense in depth: onImport itself already contends with
                  // per-row failures internally and shouldn't normally
                  // reject, but if it ever does, surface it instead of
                  // leaving the button silently stuck.
                  setError(e?.message || 'Import failed unexpectedly. Please try again.');
                }
              }}
            >
              {importing ? 'Importing…' : `Import ${rows.length || ''} User(s)`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
