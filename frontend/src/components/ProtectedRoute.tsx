import type { ReactNode } from "react";
import { useAuthGuard } from "../hooks/useAuthGuard";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthGuard({ requireAuth: true });

  if (loading) {
    return (
      <div className="landing-aurora min-h-screen flex items-center justify-center text-emerald-50/90">
        Loading...
      </div>
    );
  }

  if (!user) {
    // Redirect handled inside useAuthGuard
    return null;
  }

  return <>{children}</>;
}
