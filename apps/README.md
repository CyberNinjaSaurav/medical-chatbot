# GWAK ops portals

Separate frontends from the **patient consumer** app (`platform/`). Each has its own brand (see `BRAND.md` inside each app).

| App | Port | Auth | Roles |
|-----|------|------|-------|
| [doctor](./doctor) | 5174 | OTP | doctor |
| [admin](./admin) | 5175 | Email/password | admin* |
| [pharmacist](./pharmacist) | 5176 | OTP | pharmacist, admin_pharmacy |
| [delivery](./delivery) | 5177 | OTP | delivery |

All talk to the same `gwak_api` on port 8000.

Patient app remains at `platform/` (port 5173) with consumer brand guidelines.
