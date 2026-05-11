# Pipeline & Outreach Command Center

Personal pipeline workspace: accounts, stubbed research/tiering, and outreach logging — **no external APIs**, **local/stub data only**. See **`prd.md`** for the full product requirements.

## PRD

- Local copy: [`prd.md`](./prd.md)
- Notion (canonical): https://www.notion.so/35dda74ef04580e8867fcd25b8b57f42

## Constraints (v1)

- Simple scope; minimal dependencies
- No third-party API integrations for core flows
- Stub/fixture data (e.g. JSON seeds) for anything that would normally require network calls
- Safe for a **public** repository: no secrets, no real prospect PII — use synthetic fixtures only
