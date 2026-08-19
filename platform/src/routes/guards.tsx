import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/api";

function roleAllowed(role: UserRole | null, roles?: UserRole[]) {
  if (!roles || roles.length === 0) return true;
  if (!role) return false;
  return roles.includes(role);
}

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, role, logout } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }
  if (!roleAllowed(role, roles)) {
    logout();
    return <Navigate to="/auth/login" replace state={{ reason: "patient_only" }} />;
  }
  return <Outlet />;
}

/** Logged-in patients skip auth pages. */
export function PublicOnly() {
  const { isAuthenticated, role } = useAuthStore();
  if (isAuthenticated && role === "patient") {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}
