import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api/token-storage";

export function Shell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-secondary px-4 py-3 text-white">
        <div>
          <p className="text-lg font-bold tracking-tight">GWAK Ride</p>
          <p className="text-xs text-white/70">{user?.full_name || user?.phone}</p>
        </div>
        <button className="text-sm text-amber-300" onClick={async () => {
          const r = tokenStorage.getRefresh();
          if (r) try { await authService.logout(r); } catch { /* */ }
          logout(); navigate("/login");
        }}>Sign out</button>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6"><Outlet /></main>
    </div>
  );
}
