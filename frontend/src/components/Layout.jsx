import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const roles = {
  Patient: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Medical Chat", path: "/medical-chat" },
    { label: "Appointments", path: "/appointments" },
    { label: "Pharmacy", path: "/pharmacy" },
  ],
  Doctor: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Medical Chat", path: "/medical-chat" },
    { label: "Appointments", path: "/appointments" },
  ],
  Admin: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Medical Chat", path: "/medical-chat" },
    { label: "Appointments", path: "/appointments" },
    { label: "Pharmacy", path: "/pharmacy" },
    { label: "Admin Panel", path: "/admin" },
  ],
};

const routeTitles = {
  "/dashboard": "Dashboard",
  "/medical-chat": "Medical Chat",
  "/appointments": "Appointments",
  "/pharmacy": "Pharmacy",
  "/admin": "Admin Panel",
};

function Layout() {
  const [role, setRole] = useState("Patient");
  const location = useLocation();
  const navigation = roles[role];
  const title = useMemo(() => routeTitles[location.pathname] || "Hospital Management", [location.pathname]);

  return (
    <div className="min-h-screen bg-app-bg text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-panel-border bg-slate-950/80 px-4 py-5 shadow-soft lg:flex lg:flex-col">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Hospital HMS</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Care Operations</h1>
          </div>

          <label className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="role-select">
            Role
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-2 rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
          >
            {Object.keys(roles).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <nav className="mt-6 flex flex-1 flex-col gap-1">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-100 shadow-[inset_3px_0_0_#22d3ee]"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-panel-border bg-app-bg/90 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{role} Workspace</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="h-10 rounded-lg border border-panel-border bg-slate-900 px-3 text-sm text-slate-100"
                  aria-label="Select role"
                >
                  {Object.keys(roles).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {navigation.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? "bg-cyan-500 text-slate-950" : "border border-panel-border bg-slate-900 text-slate-300"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-7xl rounded-2xl border border-panel-border bg-slate-950/30 p-3 shadow-soft sm:p-5">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default Layout;
