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
    // On a very wide monitor, letting the split screen fill the entire
    // viewport edge-to-edge left both halves looking sparse - narrow
    // content with a lot of dead space around it. From md up, this
    // instead centers a width-capped "page card" (rounded, bordered,
    // shadowed) on a softly tinted backdrop, which is the same fix most
    // enterprise SaaS login pages use for this. Mobile keeps the plain
    // full-bleed stacked layout - no card chrome eating into a small
    // screen.
    <div className="flex min-h-screen flex-col bg-background md:min-h-screen md:items-center md:justify-center md:bg-muted/40 md:p-6 lg:p-10">
      {/* The new hero banner has its own internal left-to-right
          composition - logo + headline + subtitle on its own left
          portion, the office illustration + badges + floor map on its
          own right portion - so it reads best anchored to the page's
          actual left edge, rather than being squeezed into a fixed
          half-width column the way a smaller, illustration-only image
          was before. That's why this is an asymmetric flex row (image
          flexible on the left, form fixed-width on the right) instead
          of the previous 50/50 grid split. */}
      <div className="flex flex-1 flex-col bg-background md:w-full md:max-w-6xl md:flex-none md:flex-row md:overflow-hidden md:rounded-3xl md:border md:border-border md:shadow-xl">
        {/* Hero image - desktop/tablet only, flexible width, no padding
            or background of its own so the banner bleeds edge-to-edge
            inside the card (it's a finished, self-contained piece of
            artwork, not a small icon that needs breathing room). */}
        <div className="hidden md:flex md:flex-1 md:items-stretch md:justify-center">
          <HeroVisual variant="full" className="h-full" />
        </div>

        {/* Login form column - fixed width on desktop so it stays a
            comfortable, readable size no matter how wide the image side
            stretches on a large monitor; full width (the whole card) on
            mobile, where it's the only column. Kept deliberately
            compact top to bottom (small gaps, no oversized padding) so
            everything - including the password field and Sign In
            button - fits inside one screen on ordinary laptop/desktop
            viewports without having to scroll. */}
        <div className="flex w-full flex-col justify-center gap-5 px-6 py-8 sm:px-10 md:w-[420px] md:shrink-0 md:px-10 lg:w-[460px] lg:px-12">
          {/* Small mark next to the form at every size. On desktop the
              hero image already carries the full logo, but a small
              repeat mark right next to the form is standard practice
              for split-screen login pages (keeps the form panel
              self-identifying even if the hero side scrolls out of view
              on a short viewport). On mobile it's a repeat mark too -
              the illustration below now bakes in its own headline/
              subtitle text (see HeroVisual's "minimal" comment), so
              there's no separate HTML headline here any more. */}
          <div className="animate-in fade-in-0 duration-500 fill-mode-both">
            <BrandHeader compact />
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

          {/* Illustration - mobile only, placed after the form/footer
              so the actionable content (the form) is reachable without
              scrolling past decorative artwork first. */}
          <div className="md:hidden">
            <HeroVisual variant="minimal" />
          </div>
        </div>
      </div>
    </div>
  );
}
