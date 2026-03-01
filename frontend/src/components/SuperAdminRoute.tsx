import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="landing-aurora min-h-screen flex items-center justify-center text-emerald-50/90">
        Loading...
      </div>
    );
  }

  if (!user) return null;
  if (user.role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
