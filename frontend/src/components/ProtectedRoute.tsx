import { ReactNode } from "react";
import { useAuthGuard } from "../hooks/useAuthGuard";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthGuard({ requireAuth: true });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
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
