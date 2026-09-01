# GWAK Dispense (Pharmacist Console)

Mandatory Rx verification — audited, never skipped

## Stack

React 19 + Vite + Tailwind + TanStack Query + Zustand. Shares `gwak_api` backend with the patient app.

## Run

```powershell
# API (from monorepo root)
$env:PYTHONPATH="product"
python -m gwak_api.main

# This app
cd apps/pharmacist
npm install
npm run dev
```

- App: http://localhost:5176
- Auth: **Phone OTP**
- Allowed roles: pharmacist, admin_pharmacy

## Brand

See [BRAND.md](./BRAND.md).

## GitHub

This folder is published as its own GitHub repository (`gwak-pharmacist`) while remaining developable inside the GWAK monorepo under `apps/pharmacist`.
