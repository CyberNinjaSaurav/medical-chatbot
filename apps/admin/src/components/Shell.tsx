import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api/token-storage";
import { cn } from "@/utils/cn";
const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/catalog", label: "Catalog" },
  { to: "/ops", label: "Onboarding" },
  { to: "/orders", label: "Orders" },
  { to: "/compliance", label: "Compliance" },
];
export function Shell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-r border-border bg-secondary p-4 text-white">
        <p className="text-lg font-bold tracking-tight">GWAK Ops</p>
        <p className="text-[11px] uppercase tracking-wider text-white/50">Ops</p>
        <p className="mt-3 truncate text-xs text-white/70">{user?.email || user?.full_name}</p>
        <nav className="mt-6 space-y-0.5">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) =>
              cn("block rounded-md px-3 py-2 text-sm", isActive ? "bg-primary text-white" : "text-white/70 hover:bg-white/10")
            }>{l.label}</NavLink>
          ))}
        </nav>
        <button className="mt-8 text-xs text-white/60 hover:text-white" onClick={async () => {
          const r = tokenStorage.getRefresh();
          if (r) try { await authService.logout(r); } catch { /* */ }
          logout(); navigate("/login");
        }}>Sign out</button>
      </aside>
      <main className="px-4 py-6 md:px-8"><Outlet /></main>
    </div>
  );
}
