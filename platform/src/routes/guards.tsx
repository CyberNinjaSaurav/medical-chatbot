import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/api";

function roleAllowed(role: UserRole | null, roles?: UserRole[]) {
  if (!roles || roles.length === 0) return true;
  if (!role) return false;
  if (roles.includes(role)) return true;
  if (role.startsWith("admin") && roles.includes("admin")) return true;
  return false;
}

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, role } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }
  if (!roleAllowed(role, roles)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { isAuthenticated, role } = useAuthStore();
  if (!isAuthenticated) return <Outlet />;
  if (role === "doctor") return <Navigate to="/doctor" replace />;
  if (role === "pharmacist") return <Navigate to="/pharmacist" replace />;
  if (role?.startsWith("admin")) return <Navigate to="/admin" replace />;
  if (role === "delivery") return <Navigate to="/delivery" replace />;
  return <Navigate to="/app" replace />;
}
