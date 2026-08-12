# GWAK Strategy Brief

## Product
**GWAK** — India-first digital hospital platform where a patient completes an entire care episode online: consult → e-prescription → pharmacist-verified medicine delivery → diagnostics → longitudinal records.

## Locked decisions

| Decision | Choice |
|---|---|
| Business model | Hybrid hospital + partner network |
| Dispensing | Hybrid licence (C): own Form 20/21 for core SKUs; partners for long-tail |
| Brand | New consumer brand GWAK with named clinical partners |
| Geography | Pune → Maharashtra tier-1/2 |
| Stage | 12-week MVP, then v1/v2 |
| Languages | English + Hindi (Marathi stubbed) |
| Success metric | **90-day chronic refill retention (subscription active rate)** |

## Wedge
Chronic-care continuity for families: diabetes, hypertension, thyroid, asthma, cardiac follow-up — with **family caregivers** as first-class actors. Consultation is a loss leader; **refill subscriptions and adherence** are the business.

## Positioning
- Do **not** compete with Apollo 24/7, Tata 1mg, PharmEasy on discounting.
- Do **not** compete with Practo on open discovery alone.
- Win on **episode continuity**, verified credentials, mandatory pharmacist verification, and refill adherence.

## Promise
> Finish the care episode at home — with a doctor you can verify, a pharmacist who must approve, and medicines that refill themselves.

## Three biggest risks
1. Unit economics collapse if one-off consult CAC is not converted to refill subscriptions.
2. ABHA patient-index retrofit fails ABDM M2 if deferred.
3. Compliance theater (skippable Rx verify / drug-tier / consent) destroys trust and regulatory standing.

## Architecture stance
Modular monolith (FastAPI) with per-module PostgreSQL schemas; split to microservices only when team/scale demands. React/TypeScript web platform; no hardcoded clinical data in the UI.

## Explicitly deferred
AI diagnosis/autonomous prescribing · wearables · IPD · multi-hospital network UI · NHCX/M4 · full Marathi polish · unverified doctor marketplace.

## Legal / clinical-safety flags
Telemedicine consent · List O/A/B/prohibited drug enforcement · Schedule H1 register · non-skippable pharmacist verification · DPDP notices/rights/grievance · Drugs & Magic Remedies advertising limits · ABDM certification. **Lawyer + clinical lead sign-off required before launch.**
