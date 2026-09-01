# GWAK Ride (Delivery Agent)

Assigned orders · pack to delivered

## Stack

React 19 + Vite + Tailwind + TanStack Query + Zustand. Shares `gwak_api` backend with the patient app.

## Run

```powershell
# API (from monorepo root)
$env:PYTHONPATH="product"
python -m gwak_api.main

# This app
cd apps/delivery
npm install
npm run dev
```

- App: http://localhost:5177
- Auth: **Phone OTP**
- Allowed roles: delivery

## Brand

See [BRAND.md](./BRAND.md).

## GitHub

This folder is published as its own GitHub repository (`gwak-delivery`) while remaining developable inside the GWAK monorepo under `apps/delivery`.
