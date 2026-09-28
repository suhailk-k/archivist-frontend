# Spec: Kanban task board (Plane-style)

Status: ready to implement · Decided: 2026-09-28 · Branch: create `feat/kanban-board` from `main` in BOTH repos.

Visual target: a Plane.so board. Columns with a status icon, name and count, plus `…` and `+` in the
header. White cards with rounded corners, a subtle border and an 8–10px gap:

```
[type icon] ELC-23                         ← muted mono key
Design empty state illustrations           ← 14px title, 1–2 lines
[avatars] [● Label] [📅 22 Dec] [▂▄▆ prio] ← chip row, 11–12px, bordered pills
```

The column ends with `+ New work item`. The column background is a slightly darker paper; cards are panel white.

## Decisions (already made — do not re-ask)

- Board lives in **both** places:
  1. Project page: a new **"Board"** tab, the first tab, in `src/components/project/constants.ts` `TABS`, with its own component file.
  2. Global **Tasks** page (`src/routes/todos.tsx`): a Board/List view toggle, persisted in `?view=board|list` (default board). It shows the tasks of the current org across projects.
- Drag and drop uses **`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`**, with pointer, touch and keyboard sensors.
- Existing tasks migrate automatically, with no mass rewrite on load.
- The work must go through the existing store (versioned saves, conflict toasts, polling). Do not bypass it.
- Labels live on the project. Members can **apply** existing labels; only superadmins create or edit labels (projects are superadmin-only on the backend: `SUPERADMIN_ONLY` in `archivist-backend/src/http/data.ts`). For members, disable "create label" and show a hint.

## Data model changes

### Task (frontend `src/lib/types.ts`, backend zod `archivist-backend/src/http/schemas.ts`)

Add these fields. All are optional on the wire so old records still validate.

| Field | Type | Notes |
|---|---|---|
| `status` | `"backlog" \| "todo" \| "in_progress" \| "in_review" \| "done" \| "cancelled"` | source of truth for columns |
| `number` | int ≥ 1 | per-project sequence; shown as `${project.key}-${number}`; **assigned by the server** |
| `labels` | `string[]` (label ids) | max 20 |
| `assigneeIds` | `ID[]` | replaces the single `assigneeId`; keep `assigneeId = assigneeIds[0] ?? null` in sync for the planner and old code |
| `sortOrder` | number | fractional order within a column (midpoint insert; rebalance a column when the gap is < 1e-6) |
| `priority` | `"none" \| "low" \| "normal" \| "high" \| "urgent"` | keep `normal` (= "Medium" in the UI) for compatibility |

`done` stays and is derived: `done = status === "done"`, with `completedAt` handled as today. The planner
(`src/lib/daily-plan.ts`, `src/lib/planner-report.ts`) reads `done`/`assigneeId`, so keep them in sync on
every write, and their tests must keep passing.

### Project

- `key`: 2–5 uppercase letters (e.g. `ELC`). Default is derived from the name (initials, or the first 3 letters), deduplicated within the org.
- `labels`: `Array<{ id, name, color }>`, using 8 preset colours drawn from the design tokens.

### Legacy normalisation (client, in `applyRemote` in `src/lib/store.tsx`)

The same pattern is already used there for `plannedFor` and doc fields. On load:
- a missing `status` becomes `done ? "done" : "todo"`
- a missing `assigneeIds` becomes `assigneeId ? [assigneeId] : []`
- missing `labels` becomes `[]`
- a missing `sortOrder` becomes index × 1024 in createdAt order
- a missing `number` is assigned in memory only, by createdAt within the project

These values are persisted lazily, only when that task is next saved: saving on load would bump every record's version. A project `key` is derived in memory when missing and persisted on the next superadmin project save.

### Server-side task numbering (no collisions)

In `archivist-backend/src/http/data.ts` `applyMutation`: for `tasks` with a `projectId` and no existing
row, set `number` = max(`number` of tasks in that project) + 1 inside the transaction, ignoring any
client-sent `number`. Echo the assigned number in the response: add an optional `number` to
`AppliedMutation`, and read it in `transmit` in `store.tsx` the same way `versions` is updated.

## UI (new files under `src/components/board/`)

- `status-meta.ts`: status order, labels, lucide icons and token colours. Icons: backlog = dashed circle, todo = empty circle, in_progress = half-filled circle, in_review = clock or eye, done = check circle, cancelled = x circle.
- `board-view.tsx`: `DndContext` (pointer, touch and keyboard sensors, closest-corners), columns, and a `DragOverlay` with a lift shadow. Props: `tasks`, `projectsById`, `members`, `onMove`, `onOpen`, `onCreate`.
- `board-column.tsx`: header with status icon, name, count, a `…` menu (collapse / hide if empty) and `+`. Uses `SortableContext` with a vertical list strategy. The footer is `+ New work item`, an inline input where Enter creates and Esc cancels.
- `task-card.tsx`: the card layout above.
  - Priority is shown as 3 signal bars: none = grey outline, low = 1 bar, medium = 2, high = 3 in orange, urgent = a red bordered square with `!`.
  - Label chips show a coloured dot and the name; with more than 2 labels, one chip reads "N labels" with a tooltip.
  - Avatars show initials, overlap by -6px, and collapse to "+N" after 3.
  - The due chip turns red when overdue and not done.
  - The card is a `<button>` whose accessible name is `${key} ${title}`.
- `task-detail-sheet.tsx`: a right-side sheet built on `@radix-ui/react-dialog` (follow `src/components/forms.tsx`). It edits title, status, priority, assignees (multi), labels (multi), due date, phase and notes, and has delete with a confirm. It is deep-linked with `?task=<id>`.
- `board-filters.tsx`: assignee (including "Me" via `user.memberId`), label, priority and text search, all stored in URL search params.
- Pure logic goes in `src/lib/board.ts` with tests in `src/lib/board.test.ts` (node:test, same style as `src/lib/sync.test.ts`). It covers the midpoint and rebalance, status ↔ done/completedAt derivation, legacy normalisation, key formatting, project key derivation with dedupe, and filter matching.

### Store API (`src/lib/store.tsx`)

- `moveTask(id, { status, beforeId?, afterId? })` sets the midpoint `sortOrder` and the status, derives `done`/`completedAt`, and saves through the existing `apply` path.
- `addTask` accepts `status`, `labels`, `assigneeIds`, and appends to the end of the column.
- `updateTask` keeps `assigneeId`/`done` in sync.

### Design rules (match the app)

- Tokens only, from `src/styles.css`: `paper`, `panel`, `ink`, `ink-soft`, `line`, `accent`, `verd`, `amber`, `rose`. No raw slate, indigo or hex.
- Minimum text size 11px. Titles 14px, chips 11–12px, keys in `font-mono`.
- Columns are about 320px wide inside one `overflow-x-auto` container. Each column body scrolls on its own, and its header is sticky.
- Mobile: horizontal snap scrolling, long press to drag, and the right `touch-action`.
- Skeletons while `!hydrated` (`ListSkeleton` in `src/components/kit.tsx`), and an empty-column state. Respect `prefers-reduced-motion`.
- Wire the board into the project page's tabs (`src/components/project/constants.ts`, `src/routes/projects.$projectId.tsx`, which is already split into `src/components/project/*`) and into `src/routes/todos.tsx`.

## Backend (`archivist-backend`)

- `src/http/schemas.ts`:
  - tasks: `status` enum, `priority` enum (the 5 values), `labels` = `idList.max(20)`, `assigneeIds` = `idList.max(50)`, `sortOrder` a finite number, `number` an int ≥ 1. All optional, and keep `.passthrough()`.
  - projects: `key` matching `/^[A-Z]{2,5}$/`, and `labels` as an array (max 50) of `{ id, name (≤ 40), color }`.
- Tests: add `tests/tasks.test.ts` using `withFixture` from `tests/helpers.ts`.
  - Two creates in one batch get distinct sequential numbers.
  - A client-sent `number` is ignored.
  - Invalid enums are rejected with a 400.
- `npm run typecheck && npm test`: 53 tests currently pass.

## Acceptance

- [ ] Board tab on the project page, board/list toggle on Tasks; the view, filters and open task are in the URL.
- [ ] Cards match the reference: key, title, avatars, label chip(s), due chip, priority bars.
- [ ] Dragging across columns changes status, and reordering persists after a reload. Works with the keyboard (space lifts, arrows move, space drops) and on touch.
- [ ] The same card moved in two tabs shows the existing conflict toast and reloads to the truth.
- [ ] Legacy tasks land in the right columns, with no mass writes on load.
- [ ] Planner / My Work unchanged: the `daily-plan` and `planner-report` tests pass.
- [ ] Frontend: `npx tsc --noEmit`, `npm test`, `npx eslint .` (0 errors), `npx vite build` all pass. Backend: typecheck and tests pass.

## Deploy notes (learned 2026-09-28)

- Cloudflare builds `main` with **Yarn**. After `npm install @dnd-kit/...`, run `corepack yarn install --mode=update-lockfile` and commit both `package-lock.json` and `yarn.lock`. Keep `"packageManager": "yarn@4.5.3"`: without it Cloudflare uses Yarn 4.5.0 and the immutable install fails (YN0028).
- `VITE_API_URL` is a Cloudflare **build** variable, currently `https://suhails-macbook-pro-2.tail6f445f.ts.net` (Tailscale Funnel).
- Pushing to `main` deploys to production and is blocked by the auto-mode classifier. Ask the user to run `git push origin <branch>:main`.
- Local dev: backend `ARCHIVIST_SECURE_COOKIES=false ARCHIVIST_ALLOWED_ORIGINS=http://127.0.0.1:8080 npm run dev`; open `http://127.0.0.1:8080`, not localhost.

## Conventions

Write tests first (node:test). Keep files under 400 lines and use immutable updates. Commit on the feature branch with `feat:` / `fix:` messages and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push to `main` yourself.
