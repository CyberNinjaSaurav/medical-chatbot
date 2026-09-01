# GWAK Digital Hospital (monorepo)

India-first care episode platform. **Shared API** in `product/gwak_api/`. Frontends are split by audience with **distinct brand guidelines**.

| Surface | Path | Port | Brand |
|---------|------|------|-------|
| **Patient consumer** | [`platform/`](platform/) | 5173 | Mint / lavender / peach · Plus Jakarta |
| **Doctor** | [`apps/doctor/`](apps/doctor/) | 5174 | Navy / teal · Source Serif + IBM Plex |
| **Admin** | [`apps/admin/`](apps/admin/) | 5175 | Zinc / indigo · DM Sans |
| **Pharmacist** | [`apps/pharmacist/`](apps/pharmacist/) | 5176 | Forest / cream · Literata + Figtree |
| **Delivery** | [`apps/delivery/`](apps/delivery/) | 5177 | Charcoal / amber · Space Grotesk |

See each app’s `BRAND.md` and [`apps/README.md`](apps/README.md).

## Run locally

```powershell
# API (shared)
pip install -r requirements.txt
$env:PYTHONPATH="product"
python -m gwak_api.main

# Patient
cd platform; npm install; npm run dev

# Doctor / Admin / Pharmacist / Delivery
cd apps/doctor   # or admin | pharmacist | delivery
npm install
npm run dev
```

- API docs: http://localhost:8000/api/docs  
- Health: http://localhost:8000/health  

## Auth by app

| App | Login |
|-----|--------|
| Patient | Phone OTP → role must be `patient` |
| Doctor | Phone OTP → role must be `doctor` |
| Admin | Email + password (`POST /auth/bootstrap-admin`) |
| Pharmacist | Phone OTP → `pharmacist` / `admin_pharmacy` |
| Delivery | Phone OTP → `delivery` (create via Admin → Onboarding) |

## Publish ops apps as GitHub repos

Requires [GitHub CLI](https://cli.github.com/):

```powershell
winget install --id GitHub.cli
gh auth login
.\scripts\publish-ops-repos.ps1
```

Creates `CyberNinjaSaurav/gwak-doctor`, `gwak-admin`, `gwak-pharmacist`, `gwak-delivery` and pushes each `apps/*` folder.

## Strategy

See [docs/strategy.md](docs/strategy.md).
