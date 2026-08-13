import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";

import { BrandHeader } from "@/app/pages/login/components/brand-header";
import { FeatureHighlights } from "@/app/pages/login/components/feature-highlights";
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
      {/* LEFT - branding + login form. Always first in DOM order, which
          is also the correct mobile stacking order: brand, app name
          (part of BrandHeader), login form, then a small illustration
          appended below (rendered separately, md:hidden, further down). */}
      <div className="flex flex-1 flex-col justify-center gap-8 px-6 py-10 sm:px-10 md:px-16 lg:py-16 xl:px-20">
        <div className="animate-in fade-in-0 duration-500 fill-mode-both">
          <BrandHeader />
        </div>

        <p className="-mt-4 max-w-sm text-sm text-muted-foreground animate-in fade-in-0 duration-500 fill-mode-both [animation-delay:80ms]">
          Manage People, Assets, Procurement &amp; Workspace — all in one
          place.
        </p>

        <FeatureHighlights className="hidden max-w-md sm:grid" />

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

      {/* RIGHT - hero visual. Hidden on mobile (a small simplified
          version is appended after the form instead, see below), a
          reduced variant on tablet, the full illustration from lg up. */}
      <div className="hidden items-center justify-center bg-muted/30 p-6 md:flex lg:p-10">
        <HeroVisual
          variant="reduced"
          className="hidden h-full max-h-[560px] w-full md:block lg:hidden"
        />
        <HeroVisual
          variant="full"
          className="hidden h-full max-h-[640px] w-full lg:block"
        />
      </div>

      {/* Small simplified illustration for mobile only, placed after the
          login form per the requested stacking order. */}
      <div className="px-6 pb-10 md:hidden">
        <HeroVisual variant="minimal" />
      </div>
    </div>
  );
}
