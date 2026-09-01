# How GWAK multi-repo development works

You cloned empty GitHub repos. Each one is an independent project.

## GitHub Desktop: “Nothing to push” is normal

If Desktop says **No local changes** / **Nothing to push**, that usually means the code is **already on GitHub** — not that the repo is empty.

| What you want | What to do in GitHub Desktop |
|---------------|------------------------------|
| See files | Open the repo → **History** or browse on github.com |
| Push new work | Edit files → Desktop shows changes → **Commit** → **Push origin** |
| Switch repo | Top-left dropdown → pick `gwak-doctor`, `gwak-admin`, etc. |

### Add every repo once

**File → Add local repository** for each folder:

- `...\GitHub\gwak-api`
- `...\GitHub\gwak-doctor`
- `...\GitHub\gwak-admin`
- `...\GitHub\gwak-pharmacist`
- `...\GitHub\gwak-delivery`
- `...\GitHub\medical-chatbot`

Then open https://github.com/CyberNinjaSaurav/gwak-doctor (etc.) in the browser — you should see `src/`, `package.json`, `README.md`.

### Daily edit → push loop

1. Open the correct repo folder in Cursor **and** select it in GitHub Desktop  
2. Make changes in Cursor  
3. Desktop lists changed files → Commit → Push  

Do not expect a Push button when there are zero uncommitted changes.

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
