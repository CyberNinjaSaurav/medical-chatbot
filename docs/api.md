# GWAK API quickstart

Base URL: `http://localhost:8000/api/v1`

## Auth
- `POST /auth/otp/request` `{ "phone": "+91..." }`
- `POST /auth/otp/verify` `{ "phone", "code", "full_name?" }` → JWT pair
- `POST /auth/refresh` `{ "refresh_token" }`
- `POST /auth/abha/link` `{ "abha_id": "14 digits" }` (M1)
- `POST /auth/bootstrap-admin` (dev) → `admin@gwak.health` / `ChangeMeAdmin1!`

## Clinical
- `GET /doctors`, `GET /doctors/{id}`, `GET /slots?doctor_id=`
- `POST /appointments` → consent → pay → consult token
- `POST /prescriptions` enforces drug tiers (`DRUG_TIER_VIOLATION`)

## Commerce
- `GET /products`, `POST /orders`, `POST /orders/{id}/pay`
- `POST /orders/{id}/pharmacist/verify|reject` (mandatory for Rx)
- `POST /subscriptions`

## Records / labs / admin
- `GET /records/timeline`, consents revoke
- `GET /labs/tests`, `POST /labs/bookings`
- `GET /admin/dashboard`, `GET /admin/audit`, H1 register
- `POST /admin/ops/doctors|products|labs|pharmacist` (admin onboarding)

OpenAPI UI: `/api/docs`

Run from repo root:

```powershell
$env:PYTHONPATH="product"
python -m gwak_api.main
```

