import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertCircle, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { AppRole, canManage } from '@/lib/auth/roles';

import {
  UtilizationTierSettings,
  getUtilizationTierSettings,
  updateUtilizationTierSettings,
} from '@/lib/api/utilization.api';

/*
 * Admin-configurable usage-tier thresholds (rule #5 of the module's
 * spec: "make utilization thresholds configurable"). Never hardcoded in
 * the analysis engine - see UtilizationAnalysisService, which reads
 * these values at query time on every dashboard load.
 */
export default function UtilizationTierSettingsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const canEdit = canManage(roles);

  const [settings, setSettings] = useState<UtilizationTierSettings | null>(null);
  const [heavy, setHeavy] = useState('60');
  const [regular, setRegular] = useState('30');
  const [occasional, setOccasional] = useState('10');
  const [low, setLow] = useState('1');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getUtilizationTierSettings();
      setSettings(data);
      setHeavy(String(data.heavyMinPct));
      setRegular(String(data.regularMinPct));
      setOccasional(String(data.occasionalMinPct));
      setLow(String(data.lowMinPct));
    } catch (err) {
      console.error('Failed to load utilization tier settings:', err);
      setError('Unable to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const heavyN = Number(heavy);
    const regularN = Number(regular);
    const occasionalN = Number(occasional);
    const lowN = Number(low);

    if ([heavyN, regularN, occasionalN, lowN].some((n) => Number.isNaN(n))) {
      setError('All thresholds must be numbers.');
      return;
    }

    if (!(heavyN > regularN && regularN > occasionalN && occasionalN > lowN && lowN >= 0)) {
      setError('Thresholds must be in strictly descending order: Heavy > Regular > Occasional > Low ≥ 0.');
      return;
    }

    setSaving(true);

    try {
      const updated = await updateUtilizationTierSettings({
        companyId: settings?.companyId ?? null,
        heavyMinPct: heavyN,
        regularMinPct: regularN,
        occasionalMinPct: occasionalN,
        lowMinPct: lowN,
      });

      setSettings(updated);
      setSuccess('Thresholds saved. The dashboard will reflect them on next load.');
    } catch (err: any) {
      console.error('Failed to save utilization tier settings:', err);
      const message =
        err?.response?.data?.message ?? 'Unable to save settings. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="nova-panel">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Only Super Admin / IT Admin can change utilization tier thresholds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">Utilization Tier Settings</h1>
          <p className="nova-cmdbar-desc">
            Define what counts as Heavy, Regular, Occasional, Low Utilization, and Inactive usage -
            as a minimum % of the reporting period&apos;s days used.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--nova-teal-500)',
            background: 'var(--nova-teal-50)',
            color: 'var(--nova-teal-600)',
          }}
        >
          {success}
        </div>
      )}

      <div className="nova-panel">
        <div className="nova-panel-toolbar">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold text-foreground">Thresholds (minimum % of period days used)</div>
          </div>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="heavy">Heavy Utilization</Label>
            <Input id="heavy" type="number" value={heavy} onChange={(e) => setHeavy(e.target.value)} disabled={loading || saving} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="regular">Regular Utilization</Label>
            <Input id="regular" type="number" value={regular} onChange={(e) => setRegular(e.target.value)} disabled={loading || saving} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="occasional">Occasional Utilization</Label>
            <Input id="occasional" type="number" value={occasional} onChange={(e) => setOccasional(e.target.value)} disabled={loading || saving} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="low">Low Utilization</Label>
            <Input id="low" type="number" value={low} onChange={(e) => setLow(e.target.value)} disabled={loading || saving} />
          </div>
        </div>

        <p className="px-4 pb-2 text-xs text-muted-foreground">
          A user below every threshold with zero days used in the period is classified &quot;Never
          Used&quot;; below every threshold but with some usage is &quot;Inactive&quot;.
        </p>

        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading || saving}>
            Reset
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save Thresholds'}
          </Button>
        </div>
      </div>

      {settings?.updatedByUserName && (
        <p className="text-xs text-muted-foreground">
          Last updated by {settings.updatedByUserName} on {new Date(settings.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
