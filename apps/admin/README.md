# GWAK Ops (Admin Console)

Operations, catalog, compliance

## Stack

React 19 + Vite + Tailwind + TanStack Query + Zustand. Shares `gwak_api` backend with the patient app.

## Run

```powershell
# API (from monorepo root)
$env:PYTHONPATH="product"
python -m gwak_api.main

# This app
cd apps/admin
npm install
npm run dev
```

- App: http://localhost:5175
- Auth: **Email + password**
- Allowed roles: admin, admin_pharmacy, admin_content, admin_support

## Brand

See [BRAND.md](./BRAND.md).

## GitHub

This folder is published as its own GitHub repository (`gwak-admin`) while remaining developable inside the GWAK monorepo under `apps/admin`.
