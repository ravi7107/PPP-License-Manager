import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";
import { ForceChangePasswordGate } from "@/components/auth/force-change-password-gate";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Blocks the entire authenticated app (not just a dismissible banner)
  // until the user sets a new password - see User.MustChangePassword on
  // the backend and DbSeeder.SeedAsync for where this gets set.
  if (user?.mustChangePassword) {
    return <ForceChangePasswordGate />;
  }

  return <>{children}</>;
}
