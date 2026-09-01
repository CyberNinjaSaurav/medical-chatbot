import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/api";

const ALLOWED: UserRole[] = ["doctor"];

export function ProtectedRoute() {
  const { isAuthenticated, role, logout } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!role || !ALLOWED.includes(role)) {
    logout();
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { isAuthenticated, role } = useAuthStore();
  if (isAuthenticated && role && ALLOWED.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
