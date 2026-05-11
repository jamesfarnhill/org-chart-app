# PRD: Pipeline & Outreach Command Center (Onboarding Week)

**Canonical source (Notion):** https://www.notion.so/35dda74ef04580e8867fcd25b8b57f42

---

> **v1 engineering charter (per author):** keep the implementation **simple**, **do not integrate external APIs**, **stub any data** that would normally require network/API access, and ship as a **public** project (public repo + clear licensing; optional public demo deploy with **no secrets**).

# Product Review: Pipeline & Outreach Command Center

- **Author:** [Your name]
- **Team:** [Your team]
- **Date:** 2026-05-11
- **Status:** Draft

## Opportunity

> Personal pipeline work is easy to lose track of: accounts blur together, follow-ups slip, and messaging becomes inconsistent. A lightweight command center can make generation activity **legible and actionable** without standing up a full GTM stack.

For an onboarding-week scope, the opportunity is to prove a **tight workflow** (see accounts → tier them → plan outreach → log touches) with **minimal moving parts**, while leaving hooks for future “real” integrations behind stable domain interfaces.

## Customer Pains

> Grounded in the problem statement you provided; specifics can be validated later with real usage.

- **Fragmented state:** Research notes, tiers, and outreach history live across spreadsheets, docs, and memory — causing rework and missed follow-ups.
- **Unclear next action:** Hard to answer “who should I contact next, with what message, and why now?” without a single prioritized queue.
- **Weak accountability:** Without timestamps and message history, it is difficult to audit what was said and when.

## Proposed Solution(s)

> **Recommended v1:** a **simple web app** (or desktop-lite web UI) with **local persistence** (for example **localStorage** and/or **download/upload JSON**). All “dynamic” behaviors that would normally call external services are implemented as **deterministic stubs** behind a small set of modules (for example `accountsRepository`, `researchService`, `outreachPlanner`).

**What “dynamic account research and tiering” means in v1 (stubbed):**

- **Research:** user-triggered “generate research brief” produces **template-based text** plus optional **editable fields**; no web scraping, no enrichment APIs.
- **Tiering:** **rules you define in code/config** (for example employee count bands, industry tags) operating on **stub account records**; user can override tier manually.

**Outreach management in v1:**

- Accounts have **status**, **next step date**, **last contacted at**, and **message log** entries (all local).
- A **queue view** sorts by next action and tier; clicking an account opens detail with history and composer (saved locally; **no email/SMS send** — copy-to-clipboard is enough for v1).

**Trade-offs:** not “live” CRM truth; acceptable for onboarding-week proof and a public reference implementation.

## v1 Technical Constraints (Non-negotiables)

| Constraint | Implementation expectation |
| --- | --- |
| Simplicity | One primary user, **few screens**, minimal dependencies. |
| No external APIs | **No** third-party HTTP clients/SDKs for core flows (CRM, mail, enrichment, LLM hosts, etc.). If something looks like an API call, it is a **stub** returning fixtures. |
| Stubbed data | Seed data from **checked-in JSON** or generated fixtures; adapters return `Promise` with **timeouts simulated** optionally for UX realism. |
| Public project | **Public GitHub** (or equivalent), **LICENSE**, **no secrets**; README states stub boundaries explicitly. |

## MVP Requirements

- [ ] **Accounts list** with tier, owner (fixed to you in v1), next action date, last contacted
- [ ] **Account detail** with editable fields, research “brief” panel (stub-generated), tier override
- [ ] **Outreach queue** with sort/filter (tier, due date, “stale”)
- [ ] **Touch logging:** record channel (email/LinkedIn/other), message text, timestamp (manual entry; no sending)
- [ ] **Export/import** JSON backup
- [ ] **README:** how stubs map to hypothetical real services (future)

## Success Metrics

- You can run a **weekly pipeline review** in under 15 minutes using only the app (no side spreadsheet required for v1).
- **100% offline-capable** after install/build (no API keys).
- A new reader can understand scope in **5 minutes** via README + this PRD.

## Mocks / Visuals / Prototype (required)

> Leadership should be able to see the proposal; for onboarding week, ship a lightweight visual artifact early.

- [ ] **Wireframes** (Figma link) **or** 3 screenshots of the core screens (list / detail / queue)
- [ ] Optional: `/docs/wireframes/` with simple HTML or exported PNGs

## Key Questions for Leadership

1. **Data residency:** Is local-only persistence acceptable indefinitely, or is sync a near-term requirement?
2. **“Research” output:** Should stub briefs be purely templated text, or user-authored only (no generation UI)?
3. **Public scope:** Confirm **PII policy** — public repo must not include real prospect data; use synthetic fixtures only.

## Out of Scope (v1)

- Real CRM/email/LinkedIn integrations, deliverability, compliance automation
- Multi-user collaboration, permissions, audit trails beyond local logs
- ML/LLM calls for copy or research
