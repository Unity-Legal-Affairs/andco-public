# Public PI Case Workup Demo

A clean-room TypeScript web app that demonstrates an end-to-end personal injury case workup workspace using only public product descriptions and synthetic data.

## Clean-Room Notice

This repository is an original public demo. It does not copy proprietary source, private data, branding, logos, visual design, marketing copy, or assets from any company. All cases, insurers, providers, claimants, timelines, and documents are synthetic. Integrations are deterministic mocks only.

This app is not legal advice, does not create an attorney-client relationship, and must not be used with real client, medical, insurance, or legal data.

## Features

- Plaintiff firm onboarding with mock channel selection.
- Synthetic case intake with validation.
- Dashboard for caseload, completion, blocked work, overdue items, and mock hours saved.
- Claimant profile, incident facts, liability summary, insurer, and injury overview.
- Timeline activity management across web, email, fax, SMS, voice, mail, portal, and internal channels.
- Evidence tracking for reports, medical records, billing, photos, insurance, correspondence, and other materials.
- Document checklist with missing/requested/received/reviewed statuses.
- Workup tasks with queue/active/blocked/review/done statuses.
- Deterministic AI-style case summary and demand outline helper.
- Audit/history feed for user actions.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Validate

```bash
npm run validate
```

This runs unit tests and a production build.

## Scripts

- `npm run dev`: start the Vite dev server.
- `npm run build`: type-check and build the app.
- `npm run preview`: preview the production build.
- `npm run test`: run Vitest tests.
- `npm run validate`: run tests and build.
