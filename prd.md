# PRD: Strategic Account Power Map

## Overview

A local-first tool for go-to-market professionals working **large strategic accounts**. It is
not an HR org chart — it is a **political map of the buying committee**. Reporting lines are one
lens; influence, disposition, and our coverage are equally first-class. The tool exists to drive
action: surface who decides, who blocks us, and where we are blind.

## Target user

An individual strategic AE / account manager / SE running one or more high-value accounts. They
need to map committees fast, keep them current after every touch, present them at deal reviews,
and hand them off cleanly. No shared editing or CRM integration is required for v1.

## Core jobs-to-be-done

1. Map the buying committee and each person's buying role (Economic Buyer, Champion, Decision
   Maker, Coach, Influencer, Technical Buyer, End User, Procurement, Blocker).
2. Read the political landscape: real influence (not title) and disposition toward us.
3. Find and close coverage gaps (power blindspots, single-threaded risk).
4. Plan relationship-building: assign Cursor owners, track strength, multi-thread.
5. Validate strategy: trace the path from Champion to Economic Buyer.
6. Present and hand off without tribal knowledge walking out the door.

## Data model

- **Person**: name, jobTitle, department, seniority, `reportsToId` (solid line), `buyingRoles[]`,
  `sentiment`, `influence (1–5)`, `relationshipOwnerId`, `relationshipStrength (0–3)`,
  `lastContactAt`, `nextStep`, `priorities`, `notes`, `tags`, `contact`, manual `x/y` + `pinned`.
- **Relationship** (beyond hierarchy): typed, directional edges — `dotted_line`, `influences`,
  `allies_with`, `tension_with`, with strength and note.
- **AccountMap**: account name, opportunity, MEDDPICC context, people, relationships, our team.
- Multiple accounts; data persists locally (versioned, with migration from the legacy v2 chart).

## Views

1. **Org map** — auto-tidy tree, cards color-coded by disposition, role badges, influence pips,
   Cursor-owner initials, power-blindspot flag; relationship-edge overlay; Champion→EB path highlight.
2. **Power map** — influence × disposition quadrant (Mobilise / Convert / Leverage / Monitor).
3. **Coverage** — deal-risk score + prioritized findings (power blindspots, powerful detractors,
   no EB/champion, unowned power, single-threaded risk).

## Interactions

- One-click inline setters for disposition, influence, roles, Cursor owner, strength.
- Automatic tidy layout: parents centred over reports, even spacing, no overlaps; reflows on any
  change. Drag a card onto another to re-parent; "Reports to" picker and card ＋ buttons also work.
- Filter (legend + quick filters + search box, dims non-matches), ⌘K command palette to jump.
- Undo/redo (text edits coalesce into one step), JSON export/import, print-to-PDF.

## Implemented (v1)

All of the above. Architecture: reducer store with undo/redo + debounced persistence, derived
layout (never mutates the model), modular views and a per-contact inspector.

## Roadmap (next)

- MEDDPICC + opportunity (value, stage, close date) editing UI.
- Cross-account coverage roll-up and "what changed since last week".
- Coalitions as first-class named clusters; what-if / single-point-of-failure stress test.
- Optional, non-destructive Google Sheets / CRM sync (a second tab for relationship edges).

## Out of scope (v1)

Shared workspaces, real-time multi-user, account permissions, automatic enrichment.

## Success criteria

- A rep can build a useful committee power map in under five minutes.
- In ~3 seconds, a viewer can see who's a champion, who's a blocker, and who has power.
- The coverage view produces an honest, actionable punch-list on real data.
- No secrets or real prospect data in the repo.
