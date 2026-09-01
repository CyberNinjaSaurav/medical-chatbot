# GWAK Clinical (Doctor Portal)

Clinical workspace for verified physicians

## Stack

React 19 + Vite + Tailwind + TanStack Query + Zustand. Shares `gwak_api` backend with the patient app.

## Run

```powershell
# API (from monorepo root)
$env:PYTHONPATH="product"
python -m gwak_api.main

# This app
cd apps/doctor
npm install
npm run dev
```

- App: http://localhost:5174
- Auth: **Phone OTP**
- Allowed roles: doctor

## Brand

See [BRAND.md](./BRAND.md).

## GitHub

This folder is published as its own GitHub repository (`gwak-doctor`) while remaining developable inside the GWAK monorepo under `apps/doctor`.
