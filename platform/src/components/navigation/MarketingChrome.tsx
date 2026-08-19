import { Link, NavLink } from "react-router-dom";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/utils/cn";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/doctors", label: "Find Doctors" },
  { to: "/pharmacy", label: "Pharmacy" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/contact", label: "Help" },
];

export function MarketingNavbar() {
  const { isAuthenticated } = useAuthStore();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(23,20,31,0.04)] backdrop-blur-2xl">
      <div className="mx-auto flex h-[4.25rem] max-w-container items-center justify-between px-4">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-heading">
          GWAK
        </Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn("text-sm font-semibold transition hover:text-heading", isActive ? "text-heading" : "text-body")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <Link to="/pharmacy/cart" className="relative text-heading" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/app"
              className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-white shadow-glass transition hover:bg-blue-700"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth/login" className="text-sm font-bold text-heading transition hover:text-primary">
                Log in
              </Link>
              <Link
                to="/auth/signup"
                className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-white shadow-glass transition hover:bg-blue-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-white/60 bg-white/90 px-4 py-4 backdrop-blur-xl lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block py-2.5 font-semibold text-heading"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/pharmacy/cart" className="block py-2.5 font-semibold text-heading" onClick={() => setOpen(false)}>
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
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
            Consult, get medicines, view reports — finish the care episode at home.
          </p>
        </div>
        <div>
          <p className="font-semibold text-heading">Care</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link to="/doctors">Find Doctors</Link>
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
