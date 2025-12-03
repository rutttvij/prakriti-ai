import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function useAuthGuard(options?: { requireAuth?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const requireAuth = options?.requireAuth ?? true;

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      navigate("/login");
    }
  }, [loading, user, requireAuth, navigate]);

  return { user, loading };
}
