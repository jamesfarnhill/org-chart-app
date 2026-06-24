# Org Chart Tool

A large white canvas for building account org charts. Move boxes freely, zoom and pan across
a big workspace, and keep Google Sheets in sync automatically in the background.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Data persists locally under
`org-chart-sheets:v2` so the app remains usable between syncs.

```bash
npm run build    # production bundle in dist/
npm run preview  # serve dist locally
```

## Google Sheets Setup

Create a Google Sheet with these columns in row 1:

```text
id, name, title, jobTitle, reportsTo, reportsToId, x, y, updatedAt
```

The app only requires reps to care about `name`, `title`, `jobTitle`, and `reportsTo`.
The `id` and `reportsToId` columns make writeback reliable when names change or duplicate
names exist.

For live sync, create a Google OAuth web client in Google Cloud Console, enable the Google
Sheets API, and add your local/dev origin to the client. Copy `.env.example` to `.env` and
fill in:

- `VITE_GOOGLE_SHEET_URL` or `VITE_GOOGLE_SHEET_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_SHEET_NAME` (optional)

When those values are set, the tool syncs automatically:

- Sheet edits appear in the canvas on a poll interval.
- Canvas edits write back to the sheet after a short debounce.

## Features

- Large white canvas with free 2D box movement.
- Zoom and pan across big org charts.
- Inline editing on each box for name, title, and job title.
- Drag a box onto another box to set reporting hierarchy.
- Automatic two-way Google Sheets sync via environment config.
- Local persistence between browser sessions.

## PRD

- Local copy: [`prd.md`](./prd.md)
- Notion (canonical): https://www.notion.so/35dda74ef04580e8867fcd25b8b57f42

## Notes

- Keep real prospect data out of public demos and commits.
- No API secrets are checked in. The browser OAuth client ID is entered by the user at runtime.
- The app is designed for individual reps managing their own account org charts, not shared team editing.
