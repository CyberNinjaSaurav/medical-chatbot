/**
 * Scaffolds GWAK ops portals under apps/{doctor,admin,pharmacist,delivery}.
 * Run: node scripts/scaffold-ops-portals.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = path.join(root, "apps");

const BRANDS = {
  doctor: {
    name: "gwak-doctor",
    title: "GWAK Clinical",
    product: "Doctor Portal",
    port: 5174,
    roles: ["doctor"],
    auth: "otp",
    fonts:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;700&display=swap",
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    displayFont: '"Source Serif 4", Georgia, serif',
    cssVars: {
      primary: "#1A7A6D",
      secondary: "#0B1F3A",
      accent: "#C4A35A",
      background: "#F4F6F8",
      card: "#FFFFFF",
      heading: "#0B1F3A",
      body: "#4A5568",
      danger: "#C53030",
      border: "#D5DCE5",
      muted: "#E8EEF4",
    },
    tailwindPrimary: "#1A7A6D",
    tailwindSecondary: "#0B1F3A",
    radius: "10px",
    tagline: "Clinical workspace for verified physicians",
  },
  admin: {
    name: "gwak-admin",
    title: "GWAK Ops",
    product: "Admin Console",
    port: 5175,
    roles: ["admin", "admin_pharmacy", "admin_content", "admin_support"],
    auth: "password",
    fonts:
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap",
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    displayFont: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    cssVars: {
      primary: "#4F46E5",
      secondary: "#18181B",
      accent: "#F59E0B",
      background: "#FAFAFA",
      card: "#FFFFFF",
      heading: "#18181B",
      body: "#52525B",
      danger: "#DC2626",
      border: "#E4E4E7",
      muted: "#F4F4F5",
    },
    tailwindPrimary: "#4F46E5",
    tailwindSecondary: "#18181B",
    radius: "8px",
    tagline: "Operations, catalog, compliance",
  },
  pharmacist: {
    name: "gwak-pharmacist",
    title: "GWAK Dispense",
    product: "Pharmacist Console",
    port: 5176,
    roles: ["pharmacist", "admin_pharmacy"],
    auth: "otp",
    fonts:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Literata:opsz,wght@7..72,600;700&display=swap",
    fontFamily: '"Figtree", ui-sans-serif, system-ui, sans-serif',
    displayFont: '"Literata", Georgia, serif',
    cssVars: {
      primary: "#166534",
      secondary: "#14532D",
      accent: "#A16207",
      background: "#FFFBEB",
      card: "#FFFFFF",
      heading: "#14532D",
      body: "#57534E",
      danger: "#B91C1C",
      border: "#E7E5E4",
      muted: "#FEF3C7",
    },
    tailwindPrimary: "#166534",
    tailwindSecondary: "#14532D",
    radius: "12px",
    tagline: "Mandatory Rx verification — audited, never skipped",
  },
  delivery: {
    name: "gwak-delivery",
    title: "GWAK Ride",
    product: "Delivery Agent",
    port: 5177,
    roles: ["delivery"],
    auth: "otp",
    fonts:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
    fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    displayFont: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    cssVars: {
      primary: "#D97706",
      secondary: "#1C1917",
      accent: "#0EA5E9",
      background: "#F5F5F4",
      card: "#FFFFFF",
      heading: "#1C1917",
      body: "#57534E",
      danger: "#DC2626",
      border: "#D6D3D1",
      muted: "#E7E5E4",
    },
    tailwindPrimary: "#D97706",
    tailwindSecondary: "#1C1917",
    radius: "6px",
    tagline: "Assigned orders · pack to delivered",
  },
};

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function sharedApiFiles(appRoot, storageKey) {
  write(
    path.join(appRoot, "src/utils/cn.ts"),
    `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  );
  write(
    path.join(appRoot, "src/services/api/api-error.ts"),
    `import type { ApiErrorBody } from "@/types/api";
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}
`,
  );
  write(
    path.join(appRoot, "src/services/api/token-storage.ts"),
    `const ACCESS = "${storageKey}-access";
const REFRESH = "${storageKey}-refresh";
export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
`,
  );
  write(
    path.join(appRoot, "src/services/api/http-client.ts"),
    `import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ApiError } from "@/services/api/api-error";
import { tokenStorage } from "@/services/api/token-storage";
import type { ApiErrorBody, TokenPair } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
export const http = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});
let refreshPromise: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post<TokenPair>(\`\${baseURL}/auth/refresh\`, { refresh_token: refresh });
    tokenStorage.set(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    tokenStorage.clear();
    return null;
  }
}
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});
http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
      const access = await refreshPromise;
      if (access) {
        original.headers.Authorization = \`Bearer \${access}\`;
        return http(original);
      }
    }
    if (error.response?.data?.code) throw new ApiError(error.response.status, error.response.data);
    throw new ApiError(error.response?.status ?? 500, {
      code: "NETWORK_ERROR",
      message: error.message || "Network error",
    });
  },
);
`,
  );
  write(
    path.join(appRoot, "src/types/api.ts"),
    `export type UserRole =
  | "patient" | "doctor" | "pharmacist" | "delivery"
  | "admin" | "admin_pharmacy" | "admin_content" | "admin_support";
export interface User {
  id: string; phone: string; email: string | null; role: UserRole;
  full_name: string | null; abha_id: string | null; language: string;
  totp_enabled: boolean; created_at: string;
}
export interface TokenPair {
  access_token: string; refresh_token: string; token_type: string;
  role: UserRole; user_id: string;
}
export interface ApiErrorBody {
  code: string; message: string; details?: unknown; request_id?: string;
}
export interface OrderSummary {
  id: string; status: string; total: number; tracking_code: string | null;
  prescription_id: string | null; verified_at: string | null; created_at: string;
}
`,
  );
  write(
    path.join(appRoot, "src/store/auth-store.ts"),
    `import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenPair, User, UserRole } from "@/types/api";
import { tokenStorage } from "@/services/api/token-storage";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  setSession: (tokens: TokenPair, user?: User | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      setSession: (tokens, user = null) => {
        tokenStorage.set(tokens.access_token, tokens.refresh_token);
        set({ user, role: tokens.role, isAuthenticated: true });
      },
      setUser: (user) => set({ user, role: user?.role ?? null, isAuthenticated: !!user }),
      logout: () => {
        tokenStorage.clear();
        set({ user: null, role: null, isAuthenticated: false });
      },
    }),
    { name: "${storageKey}-auth" },
  ),
);
`,
  );
  write(
    path.join(appRoot, "src/services/auth.service.ts"),
    `import { http } from "@/services/api/http-client";
import type { TokenPair, User } from "@/types/api";
export const authService = {
  requestOtp: (phone: string, purpose = "login") =>
    http.post<{ status: string; expires_in: number; dev_code?: string }>("/auth/otp/request", { phone, purpose }),
  verifyOtp: (payload: { phone: string; code: string; purpose?: string; full_name?: string }) =>
    http.post<TokenPair>("/auth/otp/verify", payload),
  login: (email: string, password: string, totp_code?: string) =>
    http.post<TokenPair>("/auth/login", { email, password, totp_code }),
  logout: (refresh_token: string) => http.post("/auth/logout", { refresh_token }),
  me: () => http.get<User>("/auth/me"),
};
`,
  );
  write(
    path.join(appRoot, "src/app/query-client.ts"),
    `import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});
`,
  );
  write(
    path.join(appRoot, "src/components/ui/button.tsx"),
    `import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:opacity-90 shadow-soft",
  secondary: "bg-secondary text-white hover:opacity-90",
  outline: "border border-border bg-card text-heading hover:bg-muted",
  ghost: "text-heading hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-6 text-base",
};
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button ref={ref} className={cn(
      "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
      variants[variant], sizes[size], className,
    )} disabled={disabled || loading} {...props}>{loading ? "…" : children}</button>
  ),
);
Button.displayName = "Button";
`,
  );
  write(
    path.join(appRoot, "src/components/ui/input.tsx"),
    `import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "h-11 w-full rounded-[var(--radius)] border border-border bg-card px-3 text-sm text-heading placeholder:text-body/70",
      className,
    )} {...props} />
  ),
);
Input.displayName = "Input";
`,
  );
  write(
    path.join(appRoot, "src/components/ui/primitives.tsx"),
    `import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("rounded-[var(--radius)] border border-border bg-card p-5 shadow-soft", className)} {...props}>{children}</div>;
}
export function Badge({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "danger" | "neutral" }) {
  const tones = {
    primary: "bg-muted text-primary",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700",
    neutral: "bg-zinc-100 text-zinc-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-border bg-card px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-heading">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-body">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius)] bg-zinc-200/80", className)} />;
}
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-heading md:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-body">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/components/forms/OtpInput.tsx"),
    `export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\\D/g, "").slice(0, 6))}
      placeholder="6-digit OTP"
      className="h-12 w-full rounded-[var(--radius)] border border-border bg-card px-4 text-center text-lg tracking-[0.4em] text-heading"
      aria-label="OTP"
    />
  );
}
`,
  );
}

function tooling(appRoot, brand) {
  write(
    path.join(appRoot, "package.json"),
    JSON.stringify(
      {
        name: brand.name,
        private: true,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc --noEmit && vite build",
          preview: "vite preview",
        },
        dependencies: {
          "@tanstack/react-query": "^5.62.8",
          axios: "^1.7.9",
          clsx: "^2.1.1",
          "lucide-react": "^0.469.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          "react-hot-toast": "^2.4.1",
          "react-router-dom": "^7.1.1",
          "tailwind-merge": "^2.6.0",
          zustand: "^5.0.2",
        },
        devDependencies: {
          "@types/react": "^19.0.2",
          "@types/react-dom": "^19.0.2",
          "@vitejs/plugin-react": "^4.3.4",
          autoprefixer: "^10.4.20",
          postcss: "^8.4.49",
          tailwindcss: "^3.4.17",
          typescript: "^5.7.2",
          vite: "^6.0.6",
        },
      },
      null,
      2,
    ),
  );
  write(
    path.join(appRoot, "vite.config.ts"),
    `import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const rootDir = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(rootDir, "src") } },
  server: {
    port: ${brand.port},
    proxy: {
      "/api/v1": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
`,
  );
  write(
    path.join(appRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          useDefineForClassFields: true,
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: "force",
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          baseUrl: ".",
          paths: { "@/*": ["src/*"] },
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
  write(path.join(appRoot, "tsconfig.node.json"), JSON.stringify({ compilerOptions: { composite: true, skipLibCheck: true, module: "ESNext", moduleResolution: "bundler", allowSyntheticDefaultImports: true }, include: ["vite.config.ts"] }, null, 2));
  write(path.join(appRoot, "postcss.config.js"), `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`);
  write(
    path.join(appRoot, "tailwind.config.js"),
    `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "${brand.tailwindPrimary}", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "${brand.tailwindSecondary}", foreground: "#FFFFFF" },
        background: "${brand.cssVars.background}",
        card: "${brand.cssVars.card}",
        heading: "${brand.cssVars.heading}",
        body: "${brand.cssVars.body}",
        danger: "${brand.cssVars.danger}",
        border: "${brand.cssVars.border}",
        muted: "${brand.cssVars.muted}",
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.06)" },
      fontFamily: {
        sans: [${brand.fontFamily.split(",").map((s) => JSON.stringify(s.trim())).join(", ")}],
        display: [${brand.displayFont.split(",").map((s) => JSON.stringify(s.trim())).join(", ")}],
      },
    },
  },
  plugins: [],
};
`,
  );
  const v = brand.cssVars;
  write(
    path.join(appRoot, "src/index.css"),
    `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${v.primary};
  --color-secondary: ${v.secondary};
  --color-accent: ${v.accent};
  --color-background: ${v.background};
  --color-card: ${v.card};
  --color-heading: ${v.heading};
  --color-body: ${v.body};
  --color-danger: ${v.danger};
  --radius: ${brand.radius};
}

html, body, #root { min-height: 100%; }
body {
  margin: 0;
  font-family: ${brand.fontFamily};
  background: var(--color-background);
  color: var(--color-body);
  -webkit-font-smoothing: antialiased;
}
.font-display { font-family: ${brand.displayFont}; }
*:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
`,
  );
  write(
    path.join(appRoot, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brand.title} · ${brand.product}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${brand.fonts}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  );
  write(
    path.join(appRoot, "src/vite-env.d.ts"),
    `/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_API_BASE_URL?: string }
interface ImportMeta { readonly env: ImportMetaEnv }
`,
  );
  write(
    path.join(appRoot, "src/main.tsx"),
    `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { App } from "@/app/App";
import { queryClient } from "@/app/query-client";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
`,
  );
  write(path.join(appRoot, ".npmrc"), "legacy-peer-deps=true\n");
  write(
    path.join(appRoot, ".gitignore"),
    `node_modules
dist
.env
.env.*
!.env.example
.DS_Store
`,
  );
  write(
    path.join(appRoot, ".env.example"),
    `VITE_API_BASE_URL=/api/v1
`,
  );
}

function guards(appRoot, roles) {
  write(
    path.join(appRoot, "src/routes/guards.tsx"),
    `import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/api";

const ALLOWED: UserRole[] = ${JSON.stringify(roles)};

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
`,
  );
}

function brandMd(appRoot, key, brand) {
  write(
    path.join(appRoot, "BRAND.md"),
    `# ${brand.title} brand guidelines

Distinct from the **patient consumer** app (mint / lavender / peach / Plus Jakarta).

| Token | Value |
|-------|-------|
| Product | ${brand.product} |
| Display type | ${brand.displayFont} |
| UI type | ${brand.fontFamily} |
| Primary | ${brand.cssVars.primary} |
| Secondary | ${brand.cssVars.secondary} |
| Accent | ${brand.cssVars.accent} |
| Background | ${brand.cssVars.background} |
| Radius | ${brand.radius} |
| Tagline | ${brand.tagline} |

Do not reuse patient consumer gradients, floating hero shapes, or Plus Jakarta Sans in this portal.
`,
  );
  write(
    path.join(appRoot, "README.md"),
    `# ${brand.title} (${brand.product})

${brand.tagline}

## Stack

React 19 + Vite + Tailwind + TanStack Query + Zustand. Shares \`gwak_api\` backend with the patient app.

## Run

\`\`\`powershell
# API (from monorepo root)
$env:PYTHONPATH="product"
python -m gwak_api.main

# This app
cd apps/${key}
npm install
npm run dev
\`\`\`

- App: http://localhost:${brand.port}
- Auth: **${brand.auth === "otp" ? "Phone OTP" : "Email + password"}**
- Allowed roles: ${brand.roles.join(", ")}

## Brand

See [BRAND.md](./BRAND.md).

## GitHub

This folder is published as its own GitHub repository (\`${brand.name}\`) while remaining developable inside the GWAK monorepo under \`apps/${key}\`.
`,
  );
}

// ——— App-specific pages ———

function doctorApp(appRoot, brand) {
  write(
    path.join(appRoot, "src/services/clinical.service.ts"),
    `import { http } from "@/services/api/http-client";
export const appointmentService = {
  list: () => http.get<{ items: Array<Record<string, unknown>> }>("/appointments"),
};
export const consultService = {
  token: (id: string) => http.get(\`/consultations/\${id}/token\`),
  notes: (id: string, body: Record<string, unknown>) => http.post(\`/consultations/\${id}/notes\`, body),
};
export const prescriptionService = {
  create: (body: Record<string, unknown>) => http.post("/prescriptions", body),
  list: () => http.get<{ items: Array<Record<string, unknown>> }>("/prescriptions"),
};
`,
  );
  write(
    path.join(appRoot, "src/components/Shell.tsx"),
    `import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
        <p className="font-display text-xl font-bold tracking-tight">${brand.title}</p>
        <p className="mt-1 text-xs text-white/70">${brand.product}</p>
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
`,
  );
  write(
    path.join(appRoot, "src/pages/LoginPage.tsx"),
    `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

export function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const send = async () => {
    setLoading(true);
    try {
      const { data } = await authService.requestOtp(phone);
      setDevCode(data.dev_code);
      setStep("otp");
      toast.success("OTP sent");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const { data } = await authService.verifyOtp({ phone, code: otp });
      setSession(data);
      const me = await authService.me();
      if (me.data.role !== "doctor") {
        logout();
        toast.error("Doctor credentials required. Use the patient app for patients.");
        return;
      }
      setUser(me.data);
      navigate("/");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Invalid OTP");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Physician access</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-heading">${brand.title}</h1>
      <p className="mt-2 text-body">${brand.tagline}</p>
      <div className="mt-8 space-y-4">
        {step === "phone" ? (
          <>
            <Input placeholder="Registered mobile" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button className="w-full" loading={loading} onClick={() => void send()}>Send OTP</Button>
          </>
        ) : (
          <>
            <OtpInput value={otp} onChange={setOtp} />
            {devCode ? <p className="text-xs text-body">Dev OTP: {devCode}</p> : null}
            <Button className="w-full" loading={loading} disabled={otp.length < 6} onClick={() => void verify()}>Enter workspace</Button>
          </>
        )}
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/DashboardPage.tsx"),
    `import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { appointmentService } from "@/services/clinical.service";
import { Card, EmptyState, PageHeader, Skeleton, Badge } from "@/components/ui/primitives";

export function DashboardPage() {
  const appts = useQuery({ queryKey: ["appointments"], queryFn: async () => (await appointmentService.list()).data });
  return (
    <div>
      <PageHeader title="Today's queue" description="Confirmed and booked consults assigned to you." />
      {appts.isLoading ? <Skeleton className="h-40" /> : appts.data?.items.length ? (
        <div className="space-y-3">
          {appts.data.items.map((a) => (
            <Card key={String(a.id)} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{String(a.status)}</p>
                <p className="text-sm text-body">{String(a.mode)} · ₹{String(a.fee)} · {String(a.payment_status)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{String(a.status)}</Badge>
                <Link to={\`/consult/\${a.id}\`} className="text-sm font-semibold text-primary">Open workspace</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No patients in queue" description="Appointments appear when patients book you." />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/WorkspacePage.tsx"),
    `import { useParams } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, PageHeader } from "@/components/ui/primitives";
import { consultService, prescriptionService } from "@/services/clinical.service";
import { ApiError } from "@/services/api/api-error";

export function WorkspacePage() {
  const { id = "" } = useParams();
  const [soap, setSoap] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [drug, setDrug] = useState("");
  const [tier, setTier] = useState("O");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");

  return (
    <div>
      <PageHeader title="Consultation workspace" description={id ? \`Episode \${id.slice(0, 8)}…\` : "Select a visit from the queue."} />
      {!id ? <p className="text-sm text-body">Open a consult from the queue to chart and prescribe.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h3 className="font-display font-semibold text-heading">SOAP notes</h3>
            <textarea className="h-40 w-full rounded-[var(--radius)] border border-border p-3 text-sm" value={soap} onChange={(e) => setSoap(e.target.value)} placeholder="S / O / A / P" />
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis" />
            <Button onClick={async () => {
              try {
                await consultService.notes(id, { subjective: soap, objective: "", assessment: diagnosis, plan: "", diagnosis });
                toast.success("Notes saved");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Save failed"); }
            }}>Save notes</Button>
          </Card>
          <Card className="space-y-3">
            <h3 className="font-display font-semibold text-heading">Prescription pad</h3>
            <Input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="Drug name" />
            <select className="h-11 w-full rounded-[var(--radius)] border border-border px-3" value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="O">List O</option>
              <option value="A">List A (video)</option>
              <option value="B">List B</option>
              <option value="H1">Schedule H1</option>
            </select>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose" />
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Frequency" />
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration" />
            <Button onClick={async () => {
              try {
                await prescriptionService.create({
                  consultation_id: id,
                  items: [{ drug_name: drug, dose, frequency, duration, schedule_tier: tier }],
                });
                toast.success("Rx issued (registration auto-included)");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Rx failed"); }
            }}>Sign & issue</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/PrescriptionsPage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import { prescriptionService } from "@/services/clinical.service";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function PrescriptionsPage() {
  const q = useQuery({ queryKey: ["rx"], queryFn: async () => (await prescriptionService.list()).data });
  return (
    <div>
      <PageHeader title="Issued prescriptions" description="Registration number is printed on every e-Rx." />
      {q.isLoading ? <Skeleton className="h-40" /> : q.data?.items?.length ? (
        <div className="space-y-3">
          {q.data.items.map((rx) => (
            <Card key={String(rx.id)}>
              <p className="font-semibold text-heading">Rx {String(rx.id).slice(0, 8)}</p>
              <p className="text-sm text-body">Reg. {String(rx.registration_no || "—")}</p>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No prescriptions issued yet" />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/app/App.tsx"),
    `import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { PrescriptionsPage } from "@/pages/PrescriptionsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="consult" element={<WorkspacePage />} />
            <Route path="consult/:id" element={<WorkspacePage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`,
  );
}

function adminApp(appRoot, brand) {
  write(
    path.join(appRoot, "src/services/admin.service.ts"),
    `import { http } from "@/services/api/http-client";
export const adminService = {
  dashboard: () => http.get<Record<string, number>>("/admin/dashboard"),
  audit: () => http.get<{ items: Array<Record<string, unknown>> }>("/admin/audit"),
  h1Register: () => http.get<{ items: Array<Record<string, unknown>> }>("/admin/compliance/h1-register"),
  createProduct: (payload: Record<string, unknown>) => http.post("/admin/catalog", payload),
  approveProduct: (id: string) => http.post(\`/admin/catalog/\${id}/approve\`),
  onboardDoctor: (payload: Record<string, unknown>) => http.post("/admin/ops/doctors", payload),
  seedProduct: (payload: Record<string, unknown>) => http.post("/admin/ops/products", payload),
  createPharmacist: (payload: Record<string, unknown>) => http.post("/admin/ops/pharmacist", payload),
  createDelivery: (payload: Record<string, unknown>) => http.post("/admin/ops/delivery", payload),
};
export const ordersService = {
  list: () => http.get<{ items: Array<Record<string, unknown>> }>("/orders"),
};
`,
  );
  write(
    path.join(appRoot, "src/components/Shell.tsx"),
    `import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
        <p className="text-lg font-bold tracking-tight">${brand.title}</p>
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
`,
  );
  write(
    path.join(appRoot, "src/pages/LoginPage.tsx"),
    `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

const ADMIN_ROLES = new Set(["admin", "admin_pharmacy", "admin_content", "admin_support"]);

export function LoginPage() {
  const [email, setEmail] = useState("admin@gwak.health");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await authService.login(email, password, totp || undefined);
      setSession(data);
      const me = await authService.me();
      if (!ADMIN_ROLES.has(me.data.role)) {
        logout();
        toast.error("Admin credentials required");
        return;
      }
      setUser(me.data);
      navigate("/");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Operations</p>
      <h1 className="mt-2 text-2xl font-bold text-heading">${brand.title}</h1>
      <p className="mt-1 text-sm text-body">${brand.tagline}</p>
      <div className="mt-8 space-y-3">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <Input value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="2FA code (if enabled)" />
        <Button className="w-full" loading={loading} onClick={() => void submit()}>Sign in</Button>
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/DashboardPage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { Card, PageHeader, Skeleton } from "@/components/ui/primitives";

export function DashboardPage() {
  const dash = useQuery({ queryKey: ["admin-dash"], queryFn: async () => (await adminService.dashboard()).data });
  const audit = useQuery({ queryKey: ["audit"], queryFn: async () => (await adminService.audit()).data });
  return (
    <div>
      <PageHeader title="Ops dashboard" description="Live counts from Neon — no mock KPIs." />
      {dash.isLoading ? <Skeleton className="h-28" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(dash.data || {}).map(([k, v]) => (
            <Card key={k} className="!p-4">
              <p className="text-xs uppercase tracking-wide text-body">{k.replaceAll("_", " ")}</p>
              <p className="mt-1 text-2xl font-bold text-heading">{v}</p>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mt-10 text-lg font-semibold text-heading">Audit log</h2>
      <div className="mt-3 space-y-2">
        {(audit.data?.items || []).slice(0, 25).map((a) => (
          <div key={String(a.id)} className="rounded-md border border-border bg-card px-3 py-2 text-xs font-mono text-body">
            {String(a.action)} · {String(a.resource_type)} · {String(a.created_at)}
          </div>
        ))}
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/CatalogPage.tsx"),
    `import { useState } from "react";
import toast from "react-hot-toast";
import { adminService } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, PageHeader } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function CatalogPage() {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("99");
  const [mrp, setMrp] = useState("120");
  const [rx, setRx] = useState(false);
  const [draftId, setDraftId] = useState("");

  return (
    <div>
      <PageHeader title="Catalog" description="Create draft SKUs then approve for the patient store." />
      <Card className="max-w-lg space-y-3">
        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
        <div className="grid grid-cols-2 gap-2">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
          <Input value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="MRP" />
        </div>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} /> Rx required
        </label>
        <Button onClick={async () => {
          try {
            const { data } = await adminService.createProduct({
              sku, name, price: Number(price), mrp: Number(mrp), rx_required: rx, schedule_tier: rx ? "H" : "O",
            });
            setDraftId(String((data as { id: string }).id));
            toast.success("Draft created");
          } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
        }}>Create draft</Button>
        {draftId ? (
          <Button variant="outline" onClick={async () => {
            try {
              await adminService.approveProduct(draftId);
              toast.success("Approved & publishable");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Approve failed"); }
          }}>Approve {draftId.slice(0, 8)}…</Button>
        ) : null}
      </Card>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/OpsPage.tsx"),
    `import { useState } from "react";
import toast from "react-hot-toast";
import { adminService } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, PageHeader } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function OpsPage() {
  const [docPhone, setDocPhone] = useState("");
  const [docName, setDocName] = useState("");
  const [reg, setReg] = useState("");
  const [pharmPhone, setPharmPhone] = useState("");
  const [delPhone, setDelPhone] = useState("");

  return (
    <div>
      <PageHeader title="Onboarding" description="Create doctor, pharmacist, and delivery accounts." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <h3 className="font-semibold text-heading">Doctor</h3>
          <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Full name" />
          <Input value={docPhone} onChange={(e) => setDocPhone(e.target.value)} placeholder="Phone" />
          <Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Registration no." />
          <Button onClick={async () => {
            try {
              await adminService.onboardDoctor({ phone: docPhone, full_name: docName, registration_no: reg });
              toast.success("Doctor verified + slots seeded");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
          }}>Onboard</Button>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold text-heading">Pharmacist</h3>
          <Input value={pharmPhone} onChange={(e) => setPharmPhone(e.target.value)} placeholder="Phone" />
          <Button onClick={async () => {
            try {
              await adminService.createPharmacist({ phone: pharmPhone, full_name: "Pharmacist" });
              toast.success("Pharmacist created");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
          }}>Create</Button>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold text-heading">Delivery</h3>
          <Input value={delPhone} onChange={(e) => setDelPhone(e.target.value)} placeholder="Phone" />
          <Button onClick={async () => {
            try {
              await adminService.createDelivery({ phone: delPhone, full_name: "Delivery Agent" });
              toast.success("Delivery agent created");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
          }}>Create</Button>
        </Card>
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/OrdersPage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import { ordersService } from "@/services/admin.service";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function OrdersPage() {
  const q = useQuery({ queryKey: ["orders"], queryFn: async () => (await ordersService.list()).data });
  return (
    <div>
      <PageHeader title="Orders" description="All pharmacy orders visible to ops." />
      {q.isLoading ? <Skeleton className="h-40" /> : q.data?.items?.length ? (
        <div className="space-y-2">
          {q.data.items.map((o) => (
            <Card key={String(o.id)} className="flex justify-between !p-4 text-sm">
              <span className="font-mono">{String(o.tracking_code)}</span>
              <span>₹{String(o.total)}</span>
              <Badge>{String(o.status)}</Badge>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No orders" />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/CompliancePage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function CompliancePage() {
  const h1 = useQuery({ queryKey: ["h1"], queryFn: async () => (await adminService.h1Register()).data });
  return (
    <div>
      <PageHeader title="H1 register" description="Schedule H1 dispense log for compliance." />
      {h1.isLoading ? <Skeleton className="h-40" /> : h1.data?.items?.length ? (
        <div className="space-y-2">
          {h1.data.items.map((r, i) => (
            <Card key={i} className="!p-4 text-sm">
              {String(r.product)} × {String(r.qty)} · order {String(r.order_id).slice(0, 8)} · {String(r.verified_at)}
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No H1 rows yet" />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/app/App.tsx"),
    `import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { OpsPage } from "@/pages/OpsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { CompliancePage } from "@/pages/CompliancePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="ops" element={<OpsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="compliance" element={<CompliancePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`,
  );
}

function pharmacistApp(appRoot, brand) {
  write(
    path.join(appRoot, "src/services/pharmacy.service.ts"),
    `import { http } from "@/services/api/http-client";
import type { OrderSummary } from "@/types/api";
export const pharmacyService = {
  listOrders: () => http.get<{ items: OrderSummary[] }>("/orders"),
  getOrder: (id: string) => http.get(\`/orders/\${id}\`),
  verify: (id: string, note?: string) => http.post(\`/orders/\${id}/pharmacist/verify\`, { note }),
  reject: (id: string, reason: string) => http.post(\`/orders/\${id}/pharmacist/reject\`, { reason }),
  advance: (id: string) => http.post(\`/orders/\${id}/advance\`),
  h1Register: () => http.get<{ items: Array<Record<string, unknown>> }>("/admin/compliance/h1-register"),
};
`,
  );
  write(
    path.join(appRoot, "src/components/Shell.tsx"),
    `import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api/token-storage";
import { cn } from "@/utils/cn";
const links = [
  { to: "/", label: "Verification queue", end: true },
  { to: "/packing", label: "Packing" },
  { to: "/h1", label: "H1 register" },
];
export function Shell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-secondary p-5 text-white">
        <p className="font-display text-xl font-bold">${brand.title}</p>
        <p className="mt-1 text-xs text-amber-200/90">Dispense · verify · pack</p>
        <p className="mt-4 text-sm text-white/80">{user?.full_name || user?.phone}</p>
        <nav className="mt-8 space-y-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) =>
              cn("block rounded-[var(--radius)] px-3 py-2.5 text-sm", isActive ? "bg-primary text-white" : "text-white/75 hover:bg-white/10")
            }>{l.label}</NavLink>
          ))}
        </nav>
        <button className="mt-8 text-sm text-white/70" onClick={async () => {
          const r = tokenStorage.getRefresh();
          if (r) try { await authService.logout(r); } catch { /* */ }
          logout(); navigate("/login");
        }}>Sign out</button>
      </aside>
      <main className="mx-auto w-full max-w-4xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/LoginPage.tsx"),
    `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

const OK = new Set(["pharmacist", "admin_pharmacy"]);

export function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Licensed dispense</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-heading">${brand.title}</h1>
      <p className="mt-2 text-body">${brand.tagline}</p>
      <div className="mt-8 space-y-4">
        {step === "phone" ? (
          <>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Pharmacist mobile" />
            <Button className="w-full" loading={loading} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.requestOtp(phone);
                setDevCode(data.dev_code); setStep("otp"); toast.success("OTP sent");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
              finally { setLoading(false); }
            }}>Send OTP</Button>
          </>
        ) : (
          <>
            <OtpInput value={otp} onChange={setOtp} />
            {devCode ? <p className="text-xs">Dev OTP: {devCode}</p> : null}
            <Button className="w-full" loading={loading} disabled={otp.length < 6} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.verifyOtp({ phone, code: otp });
                setSession(data);
                const me = await authService.me();
                if (!OK.has(me.data.role)) { logout(); toast.error("Pharmacist access only"); return; }
                setUser(me.data); navigate("/");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Invalid OTP"); }
              finally { setLoading(false); }
            }}>Open console</Button>
          </>
        )}
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/QueuePage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/pharmacy.service";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function QueuePage() {
  const q = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const pending = q.data?.items.filter((o) => o.status === "rx_verification_pending") ?? [];
  return (
    <div>
      <PageHeader title="Verification queue" description="Cannot be skipped. Every verify/reject is audited." />
      {q.isLoading ? <Skeleton className="h-40" /> : pending.length ? (
        <div className="space-y-3">
          {pending.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">₹{o.total}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={async () => {
                  try {
                    await pharmacyService.verify(o.id, "Verified against Rx");
                    toast.success("Verified"); void q.refetch();
                  } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
                }}>Verify</Button>
                <Button variant="danger" onClick={async () => {
                  try {
                    await pharmacyService.reject(o.id, "Rx incomplete");
                    toast.success("Rejected"); void q.refetch();
                  } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
                }}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="Queue clear" description="No orders awaiting pharmacist verification." />}
      <h2 className="mt-10 text-lg font-semibold text-heading">Recent orders</h2>
      <div className="mt-3 space-y-2">
        {(q.data?.items || []).slice(0, 10).map((o) => (
          <Card key={o.id} className="flex justify-between !py-3 text-sm">
            <span>{o.tracking_code}</span>
            <Badge tone={o.status === "rx_verification_pending" ? "warning" : "neutral"}>{o.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/PackingPage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/pharmacy.service";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function PackingPage() {
  const q = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const packable = q.data?.items.filter((o) => ["verified", "packed", "dispatched"].includes(o.status)) ?? [];
  return (
    <div>
      <PageHeader title="Packing bench" description="Advance verified orders toward dispatch." />
      {q.isLoading ? <Skeleton className="h-40" /> : packable.length ? (
        <div className="space-y-3">
          {packable.map((o) => (
            <Card key={o.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">{o.status}</p>
              </div>
              <Button variant="outline" onClick={async () => {
                try {
                  await pharmacyService.advance(o.id);
                  toast.success("Advanced"); void q.refetch();
                } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
              }}>Advance</Button>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="Nothing to pack" />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/H1Page.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import { pharmacyService } from "@/services/pharmacy.service";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function H1Page() {
  const q = useQuery({ queryKey: ["h1"], queryFn: async () => (await pharmacyService.h1Register()).data });
  return (
    <div>
      <PageHeader title="Schedule H1 register" />
      {q.isLoading ? <Skeleton className="h-40" /> : q.data?.items?.length ? (
        <div className="space-y-2">
          {q.data.items.map((r, i) => (
            <Card key={i} className="text-sm">{String(r.product)} × {String(r.qty)} · {String(r.verified_at)}</Card>
          ))}
        </div>
      ) : <EmptyState title="No H1 dispenses logged" />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/app/App.tsx"),
    `import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { QueuePage } from "@/pages/QueuePage";
import { PackingPage } from "@/pages/PackingPage";
import { H1Page } from "@/pages/H1Page";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<QueuePage />} />
            <Route path="packing" element={<PackingPage />} />
            <Route path="h1" element={<H1Page />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`,
  );
}

function deliveryApp(appRoot, brand) {
  write(
    path.join(appRoot, "src/services/delivery.service.ts"),
    `import { http } from "@/services/api/http-client";
import type { OrderSummary } from "@/types/api";
export const deliveryService = {
  listOrders: () => http.get<{ items: OrderSummary[] }>("/orders"),
  advance: (id: string) => http.post(\`/orders/\${id}/advance\`),
  track: (id: string) => http.get(\`/orders/\${id}/tracking\`),
};
`,
  );
  write(
    path.join(appRoot, "src/components/Shell.tsx"),
    `import { Outlet, useNavigate } from "react-router-dom";
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
          <p className="text-lg font-bold tracking-tight">${brand.title}</p>
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
`,
  );
  write(
    path.join(appRoot, "src/pages/LoginPage.tsx"),
    `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

export function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-3xl font-bold text-heading">${brand.title}</h1>
      <p className="mt-2 text-body">${brand.tagline}</p>
      <div className="mt-8 space-y-4">
        {step === "phone" ? (
          <>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Agent mobile" />
            <Button className="w-full" loading={loading} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.requestOtp(phone);
                setDevCode(data.dev_code); setStep("otp");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
              finally { setLoading(false); }
            }}>Send OTP</Button>
          </>
        ) : (
          <>
            <OtpInput value={otp} onChange={setOtp} />
            {devCode ? <p className="text-xs">Dev OTP: {devCode}</p> : null}
            <Button className="w-full" loading={loading} disabled={otp.length < 6} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.verifyOtp({ phone, code: otp });
                setSession(data);
                const me = await authService.me();
                if (me.data.role !== "delivery") { logout(); toast.error("Delivery agent only"); return; }
                setUser(me.data); navigate("/");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Invalid OTP"); }
              finally { setLoading(false); }
            }}>Start shift</Button>
          </>
        )}
      </div>
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/pages/RunsPage.tsx"),
    `import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deliveryService } from "@/services/delivery.service";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function RunsPage() {
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await deliveryService.listOrders()).data,
    refetchInterval: 15_000,
  });
  const runs = q.data?.items.filter((o) =>
    ["packed", "dispatched", "out_for_delivery"].includes(o.status),
  ) ?? [];

  return (
    <div>
      <PageHeader title="Assigned runs" description="Advance status at each handoff. OTP PoD comes in a later phase." />
      {q.isLoading ? <Skeleton className="h-40" /> : runs.length ? (
        <div className="space-y-3">
          {runs.map((o) => (
            <Card key={o.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-heading">{o.tracking_code}</p>
                  <p className="text-sm text-body">₹{o.total}</p>
                </div>
                <Badge tone="warning">{o.status.replaceAll("_", " ")}</Badge>
              </div>
              <Button className="w-full" onClick={async () => {
                try {
                  const { data } = await deliveryService.advance(o.id);
                  toast.success(\`Now \${(data as { status: string }).status}\`);
                  void q.refetch();
                } catch (e) { toast.error(e instanceof ApiError ? e.message : "Cannot advance"); }
              }}>
                Mark next status
              </Button>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No active deliveries" description="Packed / dispatched orders show up here." />}
    </div>
  );
}
`,
  );
  write(
    path.join(appRoot, "src/app/App.tsx"),
    `import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { RunsPage } from "@/pages/RunsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<RunsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`,
  );
}

for (const [key, brand] of Object.entries(BRANDS)) {
  const appRoot = path.join(appsDir, key);
  fs.rmSync(appRoot, { recursive: true, force: true });
  tooling(appRoot, brand);
  sharedApiFiles(appRoot, brand.name);
  guards(appRoot, brand.roles);
  brandMd(appRoot, key, brand);
  if (key === "doctor") doctorApp(appRoot, brand);
  if (key === "admin") adminApp(appRoot, brand);
  if (key === "pharmacist") pharmacistApp(appRoot, brand);
  if (key === "delivery") deliveryApp(appRoot, brand);
  console.log("scaffolded", key, "→", appRoot);
}

write(
  path.join(appsDir, "README.md"),
  `# GWAK ops portals

Separate frontends from the **patient consumer** app (\`platform/\`). Each has its own brand (see \`BRAND.md\` inside each app).

| App | Port | Auth | Roles |
|-----|------|------|-------|
| [doctor](./doctor) | 5174 | OTP | doctor |
| [admin](./admin) | 5175 | Email/password | admin* |
| [pharmacist](./pharmacist) | 5176 | OTP | pharmacist, admin_pharmacy |
| [delivery](./delivery) | 5177 | OTP | delivery |

All talk to the same \`gwak_api\` on port 8000.

Patient app remains at \`platform/\` (port 5173) with consumer brand guidelines.
`,
);

console.log("done");
