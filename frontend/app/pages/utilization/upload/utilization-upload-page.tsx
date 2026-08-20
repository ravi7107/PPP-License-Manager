import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AppRole, canManage } from '@/lib/auth/roles';
import { getSoftware, Software } from '@/lib/api/software.api';
import {
  getUtilizationUploads,
  uploadUtilizationFile,
  getUtilizationUploadPreview,
  saveUtilizationMapping,
  processUtilizationUpload,
  deactivateUtilizationUpload,
  UtilizationUploadBatch,
  UtilizationUploadPreview,
} from '@/lib/api/utilization.api';

type WizardStep = 'upload' | 'map' | 'done';

/*
 * Human-friendly labels for the normalized field keys the backend sends
 * (UtilizationNormalizedFields' constant names, e.g. "RawSoftwareText") -
 * those are internal C# identifiers, not something an admin mapping
 * columns should have to decode. Falls back to the raw key itself if a
 * new normalized field is ever added here without updating this map, so
 * nothing silently disappears from the mapping UI.
 */
const FIELD_LABELS: Record<string, string> = {
  RawUserIdentifier: 'User (email or username)',
  RawUserDisplayName: 'User Display Name',
  RawSoftwareText: 'Software / Product',
  RawDepartmentText: 'Department / Team',
  RawLocationText: 'Location',
  LastUsedDate: 'Last Used Date',
  DaysUsedInPeriod: 'Days Used (in period)',
  MonthlyAverageUsage: 'Monthly Average Usage',
  VersionUsed: 'Version Used',
  AssignedFlag: 'Seat Assignment Status',
  RawStatusText: 'Status / Activity',
};

function fieldLabel(normalizedField: string): string {
  return FIELD_LABELS[normalizedField] ?? normalizedField;
}

/*
 * Pass-1 upload flow: Upload -> Preview/Map Columns -> Process. Modeled
 * as sequential steps within one flat route (no nested-route pattern
 * exists anywhere in this app's routing - see the module's plan) rather
 * than three separate pages, since a user can't meaningfully jump to
 * "map columns" without an uploaded batch to map.
 */
export default function UtilizationUploadPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const canManageUploads = canManage(roles) || roles.includes('IT Admin' as AppRole);

  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [uploads, setUploads] = useState<UtilizationUploadBatch[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  const [step, setStep] = useState<WizardStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1 - upload form
  const [file, setFile] = useState<File | null>(null);
  const [vendorSourceName, setVendorSourceName] = useState('Autodesk Account');
  const [softwareId, setSoftwareId] = useState<string>('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Step 2 - preview/mapping
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [preview, setPreview] = useState<UtilizationUploadPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saveProfileName, setSaveProfileName] = useState('');

  const loadUploads = async () => {
    setLoadingUploads(true);
    try {
      const data = await getUtilizationUploads();
      setUploads(data);
    } catch {
      // upload history is a convenience list - a failed load here
      // shouldn't block the wizard itself
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => {
    void loadUploads();
    getSoftware().then(setSoftwareList).catch(() => {});
  }, []);

  const requiredFields = useMemo(
    () => (preview ? preview.suggestions.filter((s) => s.isRequired) : []),
    [preview]
  );

  const missingRequired = useMemo(
    () => requiredFields.filter((f) => !mapping[f.normalizedField]),
    [requiredFields, mapping]
  );

  async function handleUpload() {
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    if (!vendorSourceName.trim()) {
      setError('A vendor/source name is required.');
      return;
    }
    if (!periodStart || !periodEnd) {
      setError('Reporting period start and end dates are required.');
      return;
    }

    setBusy(true);
    try {
      const batch = await uploadUtilizationFile({
        file,
        vendorSourceName: vendorSourceName.trim(),
        softwareId: softwareId ? Number(softwareId) : null,
        reportingPeriodStart: periodStart,
        reportingPeriodEnd: periodEnd,
      });

      if (batch.duplicateOfBatchId) {
        setError(
          `This exact file was already uploaded as batch #${batch.duplicateOfBatchId}. ` +
            'Remove it first, or use a different file, if you meant to upload something new.'
        );
        await loadUploads();
        return;
      }

      setActiveBatchId(batch.id);
      const p = await getUtilizationUploadPreview(batch.id);
      setPreview(p);

      const initialMapping: Record<string, string> = {};
      p.suggestions.forEach((s) => {
        if (s.suggestedSourceColumn) initialMapping[s.normalizedField] = s.suggestedSourceColumn;
      });
      setMapping(initialMapping);

      setStep('map');
      await loadUploads();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmMapping() {
    if (!activeBatchId) return;
    setError(null);

    if (missingRequired.length > 0) {
      setError(
        `Map the required field${missingRequired.length === 1 ? '' : 's'}: ${missingRequired
          .map((f) => fieldLabel(f.normalizedField))
          .join(', ')}.`
      );
      return;
    }

    setBusy(true);
    try {
      await saveUtilizationMapping(activeBatchId, mapping, saveProfileName.trim() || null);
      const result = await processUtilizationUpload(activeBatchId);
      setSuccess(
        `Processed ${result.totalRowCount} rows: ${result.usableRowCount} usable, ` +
          `${result.warningRowCount} with warnings, ${result.duplicateRowCount} duplicate rows, ` +
          `${result.unmatchedSoftwareCount} unmatched software, ${result.unmatchedUserCount} unmatched users.`
      );
      setStep('done');
      await loadUploads();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Processing failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function startNewUpload() {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMapping({});
    setActiveBatchId(null);
    setSaveProfileName('');
    setError(null);
    setSuccess(null);
  }

  async function handleDeactivate(id: number) {
    setError(null);
    try {
      await deactivateUtilizationUpload(id);
      await loadUploads();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not remove this upload.');
    }
  }

  if (!canManageUploads) {
    return (
      <div className="nova-panel">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Only Super Admin / IT Admin can upload utilization reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Upload Utilization Report</h1>
          <p className="nova-cmdbar-desc">
            Upload a vendor usage export (Excel or CSV) - e.g. an Autodesk Account report - map its
            columns, and process it into the utilization dashboard.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && step === 'done' && (
        <div
          className="flex items-start gap-2 rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--nova-teal-500)',
            background: 'var(--nova-teal-50)',
            color: 'var(--nova-teal-600)',
          }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {step === 'upload' && (
        <div className="nova-panel">
          <div className="nova-panel-toolbar">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold text-foreground">Step 1 - Upload File</div>
            </div>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="file">Usage Report (.xlsx or .csv)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="vendor">Vendor / Source Name</Label>
              <Input
                id="vendor"
                value={vendorSourceName}
                onChange={(e) => setVendorSourceName(e.target.value)}
                placeholder="e.g. Autodesk Account"
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="software">Product (optional)</Label>
              <Select value={softwareId} onValueChange={setSoftwareId}>
                <SelectTrigger id="software" disabled={busy}>
                  <SelectValue placeholder="Not scoped to one product" />
                </SelectTrigger>
                <SelectContent>
                  {softwareList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave blank for a company-wide, multi-product export - each row is reconciled to a
                product individually.
              </p>
            </div>

            <div />

            <div className="space-y-1.5">
              <Label htmlFor="periodStart">Reporting Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodEnd">Reporting Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="flex justify-end border-t p-4">
            <Button size="sm" onClick={() => void handleUpload()} disabled={busy}>
              <FileUp className="mr-1.5 h-4 w-4" />
              {busy ? 'Uploading…' : 'Upload & Continue'}
            </Button>
          </div>
        </div>
      )}

      {step === 'map' && preview && (
        <div className="nova-panel">
          <div className="nova-panel-toolbar">
            <div className="text-sm font-semibold text-foreground">
              Step 2 - Map Columns ({preview.totalRowCount} rows found)
            </div>
          </div>

          {preview.matchingMappingProfileId && (
            <div className="mx-4 mt-3 rounded-md border px-3 py-2 text-xs text-muted-foreground">
              A saved mapping profile &quot;{preview.matchingMappingProfileName}&quot; matches this
              source - the suggestions below already reflect it where possible.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {preview.suggestions.map((s) => (
              <div key={s.normalizedField} className="space-y-1.5">
                <Label>
                  {fieldLabel(s.normalizedField)}
                  {s.isRequired && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={mapping[s.normalizedField] ?? '__none__'}
                  onValueChange={(v) =>
                    setMapping((m) => ({ ...m, [s.normalizedField]: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unmapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unmapped</SelectItem>
                    {preview.sourceColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="px-4 pb-2">
            <Label htmlFor="saveProfile">Save this mapping for reuse (optional)</Label>
            <Input
              id="saveProfile"
              className="mt-1.5"
              value={saveProfileName}
              onChange={(e) => setSaveProfileName(e.target.value)}
              placeholder="e.g. Autodesk Account - Usage Export"
            />
          </div>

          <div className="nova-table-wrap mx-4 mb-4 mt-2 max-h-64 overflow-auto rounded-md border">
            <table>
              <thead>
                <tr>
                  {preview.sourceColumns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2 text-left text-xs">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.map((row, i) => (
                  <tr key={i}>
                    {preview.sourceColumns.map((col) => (
                      <td key={col} className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                        {row[col] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between border-t p-4">
            <Button variant="outline" size="sm" onClick={startNewUpload} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleConfirmMapping()} disabled={busy}>
              {busy ? 'Processing…' : 'Confirm Mapping & Process'}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="nova-panel">
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              This upload has been processed and is now part of the utilization dashboard.
            </p>
            <Button size="sm" onClick={startNewUpload}>
              Upload Another Report
            </Button>
          </div>
        </div>
      )}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="text-sm font-semibold text-foreground">Upload History</div>
          <div className="nova-spacer" />
          <Button variant="outline" size="sm" onClick={() => void loadUploads()} disabled={loadingUploads}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="nova-table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Vendor / Source</th>
                <th>Period</th>
                <th>Status</th>
                <th className="text-center">Rows</th>
                <th>Uploaded By</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUploads ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : uploads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No uploads yet.
                  </td>
                </tr>
              ) : (
                uploads
                  .filter((u) => u.isActive)
                  .map((u) => (
                    <tr key={u.id}>
                      <td className="max-w-[220px] truncate" title={u.originalFileName}>
                        {u.originalFileName}
                      </td>
                      <td>{u.vendorSourceName}</td>
                      <td className="whitespace-nowrap text-xs">
                        {u.reportingPeriodStart} → {u.reportingPeriodEnd}
                      </td>
                      <td>{u.status}</td>
                      <td className="text-center text-xs">
                        {u.usableRowCount}/{u.totalRowCount}
                      </td>
                      <td className="whitespace-nowrap text-xs">{u.uploadedByUserName}</td>
                      <td className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeactivate(u.id)}
                          title="Remove from analysis"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
