# GWAK Patient Consumer App

Patient-facing product for **GWAK**: book care episodes, manage e-prescriptions, and shop a licensed pharmacy storefront—backed by the shared FastAPI API.

Doctor, admin, pharmacist, and delivery consoles are **out of scope** for this repo (future separate apps). Their APIs remain on `gwak_api` for those portals.

## What this app covers

- **Marketing** — landing, specialties, doctors, how-it-works, policies
- **Care episode** — OTP login → book consult → waiting room → prescriptions → labs → records
- **Pharmacy ecommerce** — store home, category/search, product detail, cart, checkout, order tracking, refill subscriptions
- **Auth** — phone OTP only; non-patient roles are rejected after `/auth/me`

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + TanStack Query + Zustand (`platform/`)
- **API:** FastAPI modular monolith (`product/gwak_api/`)
- **DB:** Neon Postgres via `POSTGRES_URL`

## Run locally

```powershell
# API
pip install -r requirements.txt
$env:PYTHONPATH="product"
python -m gwak_api.main

# Web
cd platform
npm install
npm run dev
```

- Web: http://localhost:5173  
- API docs: http://localhost:8000/api/docs  
- Health: http://localhost:8000/health  

## Patient routes (IA)

| Area | Paths |
|------|--------|
| Public | `/`, `/doctors`, `/pharmacy`, `/pharmacy/p/:id`, `/how-it-works`, `/policies/*` |
| Auth | `/auth/login`, `/auth/signup` (OTP) |
| Care | `/app`, `/app/consult/*`, `/app/appointments`, `/app/prescriptions`, `/app/labs`, `/app/records` |
| Commerce | `/pharmacy/cart`, `/pharmacy/checkout`, `/app/orders`, `/app/orders/:id`, `/app/subscriptions` |

## Pharmacy rules (UI)

- OTC: add to cart freely
- `rx_required`: checkout blocked without `prescription_id`
- Form 20/21 + helpline on pharmacy chrome (from `/landing`)
- Patient UI never calls pharmacist verify/reject

## Licence display

Form 20/21 numbers and helpline come from `/landing` trust payload (and `/health`). Replace env defaults before production.

## Strategy

See [docs/strategy.md](docs/strategy.md).
