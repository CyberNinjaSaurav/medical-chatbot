import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  FileText,
  FlaskConical,
  Home,
  LogOut,
  Package,
  Pill,
  Settings,
  User,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { tokenStorage } from "@/services/api/token-storage";
import { authService } from "@/services/auth.service";

const patientLinks = [
  { to: "/app", label: "Dashboard", icon: Home, end: true },
  { to: "/app/appointments", label: "Appointments", icon: Calendar },
  { to: "/app/prescriptions", label: "Prescriptions", icon: FileText },
  { to: "/app/orders", label: "Orders", icon: Package },
  { to: "/app/labs", label: "Lab tests", icon: FlaskConical },
  { to: "/app/records", label: "Health records", icon: FileText },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function PatientShell() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const onLogout = async () => {
    const refresh = tokenStorage.getRefresh();
    if (refresh) {
      try {
        await authService.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-border bg-card p-4 md:block">
        <NavLink to="/" className="text-xl font-extrabold text-primary">
          GWAK
        </NavLink>
        <p className="mt-2 truncate text-sm text-body">{user?.full_name || user?.phone}</p>
        <nav className="mt-8 space-y-1" aria-label="Patient">
          {patientLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  isActive ? "bg-blue-50 text-primary" : "text-body hover:bg-muted",
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => void onLogout()}
          className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </aside>
      <div className="min-w-0">
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          <NavLink to="/app" className="rounded-lg px-3 py-2 text-sm">
            Home
          </NavLink>
          <NavLink to="/pharmacy" className="rounded-lg px-3 py-2 text-sm">
            <Pill className="inline h-4 w-4" /> Pharmacy
          </NavLink>
          <NavLink to="/app/orders" className="rounded-lg px-3 py-2 text-sm">
            Orders
          </NavLink>
        </div>
        <main className="mx-auto max-w-container px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function RoleShell({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string; end?: boolean }>;
}) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-card p-4">
        <p className="text-xl font-extrabold text-primary">GWAK</p>
        <p className="mt-1 text-sm font-medium text-heading">{title}</p>
        <nav className="mt-8 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium",
                  isActive ? "bg-blue-50 text-primary" : "text-body hover:bg-muted",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="mt-8 text-sm text-body"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Log out
        </button>
      </aside>
      <main className="mx-auto max-w-container w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
