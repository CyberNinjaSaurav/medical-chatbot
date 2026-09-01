# How GWAK multi-repo development works

You cloned empty GitHub repos. Each one is an independent project.

## Mapping

| GitHub repo | Source in medical-chatbot (historical) | You open this folder in Cursor |
|-------------|----------------------------------------|--------------------------------|
| `gwak-api` | `product/gwak_api/` | `...\GitHub\gwak-api` |
| `gwak-doctor` | `apps/doctor/` | `...\GitHub\gwak-doctor` |
| `gwak-admin` | `apps/admin/` | `...\GitHub\gwak-admin` |
| `gwak-pharmacist` | `apps/pharmacist/` | `...\GitHub\gwak-pharmacist` |
| `gwak-delivery` | `apps/delivery/` | `...\GitHub\gwak-delivery` |
| Patient UI | still in `medical-chatbot/platform/` until you create `gwak-patient` | `medical-chatbot` or a future `gwak-patient` clone |

## Daily workflow

1. Start API from **gwak-api** (or medical-chatbot if you prefer).
2. Open **only** the app you are changing (e.g. File → Open Folder → `gwak-doctor`).
3. Ask Cursor Agent to edit that repo.
4. Commit and push **inside that repo**.

Do **not** expect changes in `medical-chatbot/apps/*` to auto-update `gwak-doctor` — they are separate git remotes after seeding.

## Sync rule

- Prefer editing the dedicated repo (`gwak-*`).
- Keep `medical-chatbot` as the old monorepo reference or patient-only later.
