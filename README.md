# Pipeline & Outreach Command Center

Personal pipeline workspace: accounts, stubbed research/tiering, and outreach logging — **no external APIs**, **local/stub data only**. See **`prd.md`** for the full product requirements.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Data persists in **localStorage** under the key `pocc:v1`.

```bash
npm run build    # production bundle in dist/
npm run preview  # serve dist locally
```

## Features (MVP)

- **Accounts** table with tier (auto rules or manual override), fixed owner label, next step, last contact, status
- **Outreach queue** with tier filters, stale (>14 days since last contact), and due/overdue
- **Account detail**: edit fields, **stub research brief** (template + fake latency), **touch log** (no sending — copy only)
- **Export / import** full state as JSON; **reset to seed** (synthetic demo companies)

## Where the stubs live

| Real-world capability | Stub in this repo |
| --- | --- |
| CRM / enrichment APIs | `src/data/seedAccounts.ts` + your edits in the UI; persisted locally |
| Account research / news | `src/lib/researchStub.ts` (`generateResearchBrief`) |
| Tiering / scoring | `src/lib/tiering.ts` (`suggestedTier`) |
| Email / LinkedIn send | Not implemented — log messages only; use **Copy latest message** |

## PRD

- Local copy: [`prd.md`](./prd.md)
- Notion (canonical): https://www.notion.so/35dda74ef04580e8867fcd25b8b57f42

## Constraints (v1)

- Simple scope; minimal dependencies (Vite + React + TypeScript)
- No third-party API integrations for core flows
- Stub/fixture data for anything that would normally require network calls
- Safe for a **public** repository: no secrets, no real prospect PII — use synthetic fixtures only
