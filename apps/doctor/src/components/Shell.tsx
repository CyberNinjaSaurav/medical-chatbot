import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api/token-storage";
import { cn } from "@/utils/cn";

const links = [
  { to: "/", label: "Queue", end: true },
  { to: "/consult", label: "Workspace" },
  { to: "/prescriptions", label: "Rx issued" },
];

export function Shell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-secondary p-5 text-white">
        <p className="font-display text-xl font-bold tracking-tight">GWAK Clinical</p>
        <p className="mt-1 text-xs text-white/70">Doctor Portal</p>
        <p className="mt-4 truncate text-sm text-white/80">{user?.full_name || user?.phone}</p>
        <nav className="mt-8 space-y-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) =>
              cn("block rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium", isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10")
            }>{l.label}</NavLink>
          ))}
        </nav>
        <button className="mt-8 text-sm text-white/70 hover:text-white" onClick={async () => {
          const r = tokenStorage.getRefresh();
          if (r) try { await authService.logout(r); } catch { /* */ }
          logout(); navigate("/login");
        }}>Sign out</button>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
