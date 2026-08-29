repo: ranrabo/rabo
branch: main

## Last sync

date: 2026-08-28T22:14:00Z

### Updated in this project

- New visual direction for the whole board: planner-paper palette (washi/sumi/ai/shu/kiiro), M PLUS 1 + Zen Kaku Gothic New, replacing the paper/aqua/coral tokens in `globals.css`.
- Week grid restructured as a person-major piano roll on desktop and a day-major stack at 375px — no horizontal scroll at either size.
- Added the density ribbon: 15-minute room-headcount chart, hero-sized for today and repeated per day column.
- Person page and admin log/correct screens redesigned against the same tokens.

## Screen map

| Project screen | Built from |
| --- | --- |
| Public board — desktop (1a) | `src/app/page.tsx`, `src/components/week-grid.tsx`, `src/components/now-in-lab.tsx`, `src/components/header.tsx` |
| Public board — 375 (1b) | `src/components/week-grid.tsx` (mobile branch), `src/lib/data.ts` |
| Person page (1c) | `src/app/people/`, `src/db/schema.ts` (`person`) |
| Admin — log & correct (1d) | `src/app/admin/`, `src/db/schema.ts` (`lab_session`) |
| Tokens (comment block in `Rabo Board.dc.html` logic) | `src/app/globals.css` |
