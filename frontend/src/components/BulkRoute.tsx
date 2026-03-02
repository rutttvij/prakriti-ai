import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const BULK_ROLES = new Set(["BULK_GENERATOR", "BULK_MANAGER", "BULK_STAFF"]);

export function BulkRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="landing-aurora min-h-screen flex items-center justify-center text-emerald-50/90">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (!BULK_ROLES.has(user.role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
