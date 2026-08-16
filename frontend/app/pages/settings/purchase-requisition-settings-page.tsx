import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { AppRole, canManage } from '@/lib/auth/roles';

import {
  PurchaseRequisitionSettings,
  getPurchaseRequisitionSettings,
  updatePurchaseRequisitionSettings,
} from '@/lib/api/purchase-requisition-settings.api';

export default function PurchaseRequisitionSettingsPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();

  const canEdit = canManage(roles);

  const [settings, setSettings] =
    useState<PurchaseRequisitionSettings | null>(null);

  const [financeEmail, setFinanceEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getPurchaseRequisitionSettings();

      setSettings(data);
      setFinanceEmail(data.financeNotificationEmail ?? '');
    } catch (err) {
      console.error('Failed to load purchase requisition settings:', err);

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
    setSaving(true);

    try {
      const updated = await updatePurchaseRequisitionSettings({
        financeNotificationEmail: financeEmail.trim() || null,
      });

      setSettings(updated);
      setFinanceEmail(updated.financeNotificationEmail ?? '');
      setSuccess('Settings saved.');
    } catch (err: any) {
      console.error('Failed to save purchase requisition settings:', err);

      const message =
        err?.response?.data?.message ??
        err?.response?.data?.Message ??
        'Unable to save settings. Please try again.';

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">
            Purchase Requisition Settings
          </h1>
          <p className="nova-cmdbar-desc">
            Configure where a fully approved purchase requisition (PR
            details, quotation, and PR copy) is sent for PO generation.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="nova-panel">
        <div className="max-w-md space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="finance-email">Finance Notification Email</Label>

            <Input
              id="finance-email"
              type="email"
              placeholder="finance@yourcompany.com"
              value={financeEmail}
              onChange={(event) => setFinanceEmail(event.target.value)}
              disabled={!canEdit || loading}
            />

            <p className="text-xs text-muted-foreground">
              Once a purchase requisition is fully approved, its details
              along with the vendor quotation and PR copy are emailed here
              so Finance can raise the PO (e.g. in Tally) and upload the
              PO copy back onto the record.
            </p>
          </div>

          {settings?.updatedAt ? (
            <p className="text-xs text-muted-foreground">
              Last updated {settings.updatedAt.slice(0, 10)}
              {settings.updatedByUserName
                ? ` by ${settings.updatedByUserName}`
                : ''}
              .
            </p>
          ) : null}

          {canEdit ? (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
