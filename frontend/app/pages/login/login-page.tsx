import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";

import { BrandHeader } from "@/app/pages/login/components/brand-header";
import { LoginForm } from "@/app/pages/login/components/login-form";
import { HeroVisual } from "@/app/pages/login/components/hero-visual";
import { SecurityFooter } from "@/app/pages/login/components/security-footer";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      console.error("Login error:", err);

      setError(
        err?.response?.data?.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:grid md:grid-cols-2">
      {/* LEFT - branding + login form. Kept deliberately compact top to
          bottom (small gaps, no oversized padding) so the whole column -
          including the password field and Sign In button - fits inside
          one screen on ordinary laptop/desktop viewports without having
          to scroll. The feature-highlight tiles and the stats strip from
          the previous version were dropped for the same reason: both are
          now shown inside the hero image itself (badges + a stats row
          baked into the artwork), so keeping separate HTML copies here
          was redundant weight, not extra information. */}
      <div className="flex flex-1 flex-col justify-center gap-5 px-6 py-8 sm:px-10 md:px-12 lg:px-16">
        <div className="animate-in fade-in-0 duration-500 fill-mode-both">
          <BrandHeader />
        </div>

        <div className="animate-in fade-in-0 duration-500 fill-mode-both [animation-delay:80ms]">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Digital Workplace &amp; IT Management
          </h2>

          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Manage People, Assets, Procurement &amp; Workspace — all in
            one place.
          </p>
        </div>

        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both [animation-delay:120ms]">
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            error={error}
            onSubmit={handleSubmit}
          />
        </div>

        <SecurityFooter />
      </div>

      {/* RIGHT - hero image. Hidden on mobile (a smaller version is
          appended after the form instead, see below); scales up via
          max-width at each breakpoint rather than swapping content,
          since it's the same picture throughout. */}
      <div className="hidden items-center justify-center bg-muted/30 p-6 md:flex lg:p-10">
        <HeroVisual
          variant="full"
          className="w-full max-w-sm md:max-w-md lg:max-w-xl"
        />
      </div>

      {/* Small illustration for mobile only, placed after the login form
          per the requested stacking order. */}
      <div className="px-6 pb-8 md:hidden">
        <HeroVisual variant="minimal" />
      </div>
    </div>
  );
}
