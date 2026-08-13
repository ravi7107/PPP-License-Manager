import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  loading: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
  className?: string;
}

// Pure presentation - every prop here is owned and computed by
// login-page.tsx (email/password/loading/error state, the submit
// handler that calls useAuth().login(...)). This component doesn't call
// the auth API, read/write storage, or navigate; it only renders the
// form and reports user input back up.
export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  onSubmit,
  className,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotHint, setShowForgotHint] = useState(false);

  // Presentational only, by design: AuthStorage always persists the
  // session to localStorage today (see lib/auth/auth-storage.ts), so
  // there's no "remember me vs. not" behavior to switch between without
  // changing session/token handling, which is out of scope for this
  // redesign. The checkbox is included because it's expected UI for an
  // enterprise login form; wiring it up is a small, separate follow-up
  // if session-scoped (non-persistent) logins are ever wanted.
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <div className={cn('w-full max-w-sm', className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Welcome Back
      </h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to continue to your workspace.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Username / Email</Label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="login-email"
              type="email"
              placeholder="admin@pps.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>

            <button
              type="button"
              onClick={() => setShowForgotHint((v) => !v)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              className="pl-9 pr-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {showForgotHint && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Self-service reset isn&apos;t available yet - please contact
              your IT Administrator to reset your password.
            </p>
          )}
        </div>

        <label className="flex select-none items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          Remember Me
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  );
}
