import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Lock, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/auth-context';
import { changePassword } from '@/lib/api/auth.api';

// Rendered by ProtectedRoute in place of the normal app whenever
// user.mustChangePassword is true - most notably the auto-seeded default
// Super Admin account (see backend DbSeeder.SeedAsync), which is given a
// random one-time password specifically so it can't be used past this
// screen without being changed first. Blocks the whole app (not just a
// banner/reminder) so this can't be dismissed or navigated around.
export function ForceChangePasswordGate() {
  const { clearMustChangePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      clearMustChangePassword();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to change password. Please check your current password and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Set a New Password
          </h1>
          <p className="text-sm text-muted-foreground">
            This account is using a temporary password and must set a new
            one before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current (temporary) password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                className="h-10 rounded-lg pl-9"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                className="h-10 rounded-lg pl-9"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                className="h-10 rounded-lg pl-9"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <label className="flex select-none items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            Show passwords
          </label>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-lg text-sm font-semibold tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                UPDATING...
              </>
            ) : (
              'SET NEW PASSWORD'
            )}
          </Button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Log out instead
          </button>
        </form>
      </div>
    </div>
  );
}
