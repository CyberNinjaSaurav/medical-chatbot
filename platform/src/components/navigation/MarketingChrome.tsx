import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

export function MarketingNavbar() {
  const { isAuthenticated, role } = useAuthStore();
  const [open, setOpen] = useState(false);

  const appHome =
    role === "doctor"
      ? "/doctor"
      : role?.startsWith("admin")
        ? "/admin"
        : role === "pharmacist"
          ? "/pharmacist"
          : role === "delivery"
            ? "/delivery"
            : "/app";

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/55 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between px-4">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-heading">
          GWAK
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <NavLink to="/doctors" className={({ isActive }) => cn("text-sm font-semibold", isActive ? "text-primary" : "text-body")}>
            Doctors
          </NavLink>
          <NavLink to="/pharmacy" className={({ isActive }) => cn("text-sm font-semibold", isActive ? "text-primary" : "text-body")}>
            Pharmacy
          </NavLink>
          <NavLink to="/how-it-works" className={({ isActive }) => cn("text-sm font-semibold", isActive ? "text-primary" : "text-body")}>
            How it works
          </NavLink>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Link to={appHome} className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-white transition hover:bg-[#0b8264]">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth/login" className="text-sm font-bold text-heading">
                Log in
              </Link>
              <Link
                to="/auth/signup"
                className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-white transition hover:bg-[#0b8264]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        <button className="md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <Link to="/doctors" className="block py-2 text-heading" onClick={() => setOpen(false)}>
            Doctors
          </Link>
          <Link to="/pharmacy" className="block py-2 text-heading" onClick={() => setOpen(false)}>
            Pharmacy
          </Link>
          <Link to="/how-it-works" className="block py-2 text-heading" onClick={() => setOpen(false)}>
            How it works
          </Link>
        </div>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-gradient-to-b from-white to-muted">
      <div className="mx-auto grid max-w-container gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="text-xl font-extrabold text-primary">GWAK</p>
          <p className="mt-2 text-sm text-body">
            Consult, get medicines, view reports — without visiting the hospital
          </p>
        </div>
        <div>
          <p className="font-semibold text-heading">Care</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link to="/doctors">Doctors</Link>
            <br />
            <Link to="/pharmacy">Pharmacy</Link>
            <br />
            <Link to="/how-it-works">How it works</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-heading">Policies</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link to="/policies/privacy">Privacy</Link>
            <br />
            <Link to="/policies/terms">Terms</Link>
            <br />
            <Link to="/policies/refund">Refunds</Link>
            <br />
            <Link to="/policies/grievance">Grievance</Link>
          </div>
        </div>
        <div className="text-sm text-body">
          <p>Pharmacy licence: Form 20/21 displayed on checkout</p>
          <p className="mt-2">Helpline: +91-20-0000-0000</p>
          <p className="mt-2">Grievance officer: grievance@gwak.health</p>
        </div>
      </div>
    </footer>
  );
}
