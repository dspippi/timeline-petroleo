# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build (runs TypeScript + lint checks)
npm run lint     # ESLint check
npm run admin    # Open admin panel at localhost:3000/admin + start dev server
```

No test suite exists. Validate changes with `npm run build` before pushing.

## Architecture

**Next.js 14 App Router** — TypeScript, Tailwind CSS, no database.

### Data layer

All data lives in two JSON files:
- `data/events.json` — array of oil events (sorted by `start_date`)
- `data/categories.json` — array of `{ id, label, color }` category objects

**Server reads/writes** go through:
- `lib/adminEvents.ts` — CRUD for events (exports `listEvents`, `addEvent`, `updateEvent`, `deleteEvent`)
- `lib/categories.ts` — `listCategories()` and `saveCategories()`

`lib/parseEvents.ts` is just a re-export of `listEvents` used by the public homepage.

**Important**: Writes to JSON only work locally. On Vercel the filesystem is read-only — the admin panel shows a warning and changes are lost. The workflow is: edit locally → git commit → git push.

### Server / Client boundary

`app/page.tsx` (server) calls `parseEvents()`, serializes `Date` objects to ISO strings (`SerializedOilEvent`), and passes them to `TimelineClientWrapper` as props. The client re-hydrates them with `parseISO()` from date-fns.

`app/layout.tsx` (server) calls `listCategories()` and injects the result into `CategoriesProvider` as `initialCategories`.

### Category system

`EventType` is an **open string** (not a union type) — the valid types are whatever is in `data/categories.json`.

- **Client components**: use `useCategories()` → `getColor(type)`, `getLabel(type)`
- **Server components**: use `listCategories()` from `lib/categories.ts`

### Contexts

| Context | Purpose |
|---|---|
| `CategoriesContext` | Dynamic category list, `getColor()`, `getLabel()` |
| `SettingsContext` | User preferences (show labels, etc.) |
| `TimelineSyncContext` | Shared `pxPerDay` zoom level across components |

### Timeline rendering

`TimelineClientWrapper` owns all state: zoom (`pxPerDay`), filters, selected event, scroll sync between chart and timeline rows.

The coordinate system is `TimelineScale` (`lib/timelineScale.ts`): converts between `Date ↔ pixel` using `pxPerDay`. Range: `MIN_PX_PER_DAY = 0.04` to `MAX_PX_PER_DAY = 25`.

Events are laid out in lanes (`EventMarker`) to avoid vertical overlap. The `OilPriceChart` (Recharts) and the timeline rows scroll in sync via DOM `scrollLeft` — no React state is involved in the scroll sync to avoid re-renders.

### Admin panel

Routes under `app/admin/` — protected by an HMAC cookie (`admin_token`).

Required env vars:
- `ADMIN_PASSWORD` — login password
- `ADMIN_SECRET` — HMAC signing secret (defaults to `"dev-secret"` locally)

Admin pages: **Eventos** (`/admin`) · **Novo evento** (`/admin/events/new`) · **Editar** (`/admin/events/[id]`) · **Categorias** (`/admin/categories`) · **Editor de Texto/Raw** (`/admin/raw`)

### Date handling

**Always parse `"YYYY-MM-DD"` strings with `parseLocalDate()`** (defined in `lib/adminEvents.ts`) or `parseISO()` from date-fns — never `new Date("YYYY-MM-DD")`. The bare constructor treats the string as UTC midnight, which shifts the day back by one in timezones behind UTC (e.g. Brazil UTC-3).

```typescript
// ✅ correct
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ❌ wrong — UTC timezone shift
new Date("2023-05-15");
```
