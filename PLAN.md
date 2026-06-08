# Andco Public Clean-Room Implementation Plan

## Source Inputs

- Public YC profile: `https://www.ycombinator.com/companies/andco`
- Public website: `http://www.useandco.com`
- Tracker issue: `https://github.com/PalmerMichaels/yc-2026-public-master/issues/14`

## Clean-Room Rules

- Build an original public implementation from public descriptions and observable product behavior only.
- Do not copy proprietary source, private data, logos, trademarks, visual design, assets, or marketing copy.
- Use only synthetic demo cases, fictional insurers/providers, and deterministic mock integrations.
- Do not bypass access controls or connect to real legal, medical, insurance, fax, SMS, email, or case-management systems.
- Display clear demo/legal disclaimers in the app and documentation.

## Product Scope

Implement a TypeScript web app that demonstrates an end-to-end personal injury pre-litigation workup workspace:

- Onboarding for a plaintiff firm workspace and mock work channels.
- Synthetic case intake with validation and seeded demo matters.
- Dashboard for open cases, completion, blocked work, overdue work, and estimated saved time.
- Claimant/case profile with incident, injury, insurer, and liability facts.
- Timeline management across internal, web, email, fax, SMS, voice, mail, and portal channels.
- Evidence management for reports, medical records, billing, photos, insurance, correspondence, and other artifacts.
- Document checklist with request/review status tracking.
- Workup task/status management for reports, insurance, providers, records, treatment, and demand prep.
- Deterministic AI-style case summary and demand outline helper with no external model/API.
- Audit/history feed for material user actions.
- Tests for validation, progress, deterministic draft generation, and dashboard summaries.

## Architecture

- `src/models.ts`: shared domain types.
- `src/workup.ts`: pure domain functions for validation, case creation, status updates, dashboard metrics, next actions, and deterministic draft generation.
- `src/main.ts`: browser UI state, rendering, local persistence, and event handlers.
- `src/styles.css`: responsive original visual system.
- `src/workup.test.ts`: Vitest coverage for core workflow logic.

## Delivery Steps

1. Create a Vite + TypeScript app with no proprietary assets.
2. Seed realistic but fictional PI workup data.
3. Add interactive workflows for intake, timeline, evidence, checklist, tasks, draft helper, and audit history.
4. Add README run steps and clean-room notes.
5. Run `npm run validate`.
6. Commit and push to `main`.

## Known Gaps

- No backend, authentication, or role permissions beyond visible owner/status fields.
- All integrations are mocked; the app does not send fax/email/SMS/voice/mail/web requests.
- Draft helper is deterministic and rule-based; it is not legal advice and does not use an AI model.
- Browser persistence uses localStorage for demo convenience only.
