# GWAK Digital Hospital

India-first digital hospital platform: consult → e-prescription → pharmacist-verified delivery → labs → ABHA-ready records.

## Strategy

See [docs/strategy.md](docs/strategy.md).

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + TanStack Query + Zustand (`platform/`)
- **API:** FastAPI modular monolith (`product/gwak_api/`)

## Run locally

```powershell
# API
pip install -r requirements.txt
$env:PYTHONPATH="product"
python -m gwak_api.main

# optional admin bootstrap
# POST http://localhost:8000/api/v1/auth/bootstrap-admin

# Web
cd platform
npm install
npm run dev
```

- Web: http://localhost:5173  
- API docs: http://localhost:8000/api/docs  
- Health: http://localhost:8000/health  

## Architecture

Modular monolith with logical modules (auth, clinical, commerce/pharmacy, records, notifications, labs, admin), in-process event bus (Kafka seam), JWT + refresh, RBAC, ABHA M1 link, mandatory pharmacist verification, drug-tier enforcement on prescriptions.

## Licence display

Form 20/21 numbers and helpline are returned from `/health` and landing trust bar. Replace env defaults before production.
