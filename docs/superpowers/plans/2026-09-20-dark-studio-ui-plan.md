# Dark Studio UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (inline execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Archivist from a light paper interface into a cohesive dark studio workspace without changing route behavior or data flows.

**Architecture:** Keep existing React/TanStack route structure and shared component boundaries. Put visual tokens, global accessibility behavior, and responsive primitives in `src/styles.css`; update shared shell and kit components to consume those tokens; make only targeted route-level layout corrections where inherited styles cannot solve the problem. Validate through TypeScript build, ESLint, and browser smoke checks.

**Tech Stack:** React 19, TypeScript, TanStack Router/Start, Tailwind CSS v4, `lucide-react` where existing icons are needed, Vite.

## Global Constraints

- Preserve all existing routes, store behavior, links, actions, and data rendering.
- Use dark studio direction: deep navy-black canvas, layered charcoal panels, luminous indigo/violet accents.
- Keep Fraunces display, Inter body, and JetBrains Mono metadata typography.
- Maintain semantic buttons and links, keyboard focus visibility, readable contrast, and reduced-motion support.
- Follow immutable updates; do not mutate store data or introduce global mutable state.
- Do not add UI dependencies; use existing Tailwind and component utilities.
- Keep modified files focused and avoid unrelated refactors.

## File Map

- Modify `src/styles.css`: dark color tokens, surface utilities, focus treatment, selection, reduced-motion rules, and responsive global polish.
- Modify `src/components/app-shell.tsx`: sidebar shell, organization switcher, navigation states, page header, and shared action buttons.
- Modify `src/components/kit.tsx`: panels, stats, pills, progress, timelines, empty states, and date chips.
- Modify `src/routes/__root.tsx`: not-found and error states so they use the shared dark visual language.
- Modify route files only when visual QA identifies layout overflow or low-contrast classes that cannot inherit the shared tokens; keep changes limited to class names and responsive spacing.
- Validate with existing `package.json` scripts; no test runner currently exists, so do not add one solely for cosmetic changes.

---

### Task 1: Establish dark studio design tokens and global behavior

**Files:**
- Modify: `src/styles.css:69-157`

**Interfaces:**
- Produces CSS custom properties consumed by Tailwind utilities already used throughout `src/`.
- Produces global `:focus-visible` and reduced-motion behavior consumed by all routes and shared components.

- [ ] **Step 1: Replace light root tokens with dark studio values**

Update `:root` while preserving existing variable names. Use these values so existing utilities continue working:

```css
--paper: oklch(0.135 0.025 264);
--panel: oklch(0.185 0.028 264);
--ink: oklch(0.94 0.018 258);
--ink-soft: oklch(0.67 0.035 258);
--line: oklch(0.29 0.035 264);
--accent: oklch(0.72 0.19 278);
--accent-soft: oklch(0.24 0.065 278);
--verd: oklch(0.74 0.15 163);
--amber: oklch(0.79 0.15 78);
--rose: oklch(0.72 0.17 20);
```

Keep semantic aliases (`--background`, `--foreground`, `--card`, `--primary`, etc.) mapped to those variables. Set `--primary-foreground` to a dark value that remains readable on the luminous primary button.

- [ ] **Step 2: Add dark ambient canvas and focus styles**

Extend `@layer base` with a dark body background, selection color, and visible keyboard focus:

```css
body {
  min-width: 320px;
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

::selection {
  background: color-mix(in oklab, var(--color-accent) 35%, transparent);
  color: var(--color-ink);
}
```

- [ ] **Step 3: Add global motion fallback**

Add a media query after the `rise` utility that disables entrance and transition animation for users who request reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run static validation**

Run: `npm run lint`
Expected: PASS, or only pre-existing warnings unrelated to changed CSS.

Run: `npm run build`
Expected: PASS with production bundle generated.

- [ ] **Step 5: Record checkpoint**

This project currently has no `.git` directory. Keep changes in working tree; do not initialize or commit repository without user request.

---

### Task 2: Rework shared shell, navigation, and actions

**Files:**
- Modify: `src/components/app-shell.tsx:31-205`

**Interfaces:**
- Consumes dark tokens and focus rules from Task 1.
- Preserves `AppShell`, `PageHeader`, `PrimaryButton`, and `GhostButton` public props and callback behavior.

- [ ] **Step 1: Improve shell surfaces and ambient background**

Update outer shell and sidebar classes to use dark panel opacity, stronger border contrast, and subtle indigo/violet ambient treatment. Keep organization switching and all links unchanged. Ensure sidebar remains sticky and desktop-only at `md`.

Use class patterns equivalent to:

```tsx
<div className="min-h-screen bg-paper text-ink antialiased selection:bg-accent/30">
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-40 left-1/4 size-[520px] rounded-full bg-accent/15 blur-[140px]" />
    <div className="absolute top-24 -right-24 size-[420px] rounded-full bg-verd/8 blur-[140px]" />
    <div className="absolute bottom-0 left-10 size-[360px] rounded-full bg-amber/6 blur-[140px]" />
  </div>
  <aside className="... border-r border-line/80 bg-panel/85 shadow-[12px_0_40px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
```

- [ ] **Step 2: Improve brand mark and organization switcher contrast**

Keep existing text and interactions. Give brand mark an accent-tinted dark surface, add subtle ring, and make switcher hover/focus states visible on dark surfaces. Do not alter `switcherOpen`, `setOrgId`, or filtering logic.

- [ ] **Step 3: Strengthen navigation active and hover states**

Keep pathname matching and count rendering unchanged. Update active links to use accent-tinted background, left edge indicator, brighter text, and subtle ring. Update inactive links to use readable muted text and dark hover surface. Add `focus-visible` utility classes where useful without replacing global focus behavior.

- [ ] **Step 4: Polish `PageHeader` and action buttons**

Keep props exactly unchanged. Give headers a dark translucent surface and shadow separation. Update buttons with minimum 36px visual height, clear border contrast, hover elevation, pressed state, and `focus-visible:ring-2 focus-visible:ring-accent/70`. Preserve submit types and click callbacks.

- [ ] **Step 5: Run validation**

Run: `npm run lint && npm run build`
Expected: PASS.

---

### Task 3: Rework shared data-display kit

**Files:**
- Modify: `src/components/kit.tsx:22-147`

**Interfaces:**
- Preserve exported component names and prop types: `Panel`, `PanelHead`, `Pill`, `Stat`, `Progress`, `Timeline`, `Empty`, `DateChip`, `relativeTime`, and `formatDate`.
- Preserve all output data and callback-free behavior; only classes and safe display styling change.

- [ ] **Step 1: Make panels read as layered dark surfaces**

Update `Panel` and `PanelHead` classes with higher-contrast borders, charcoal surfaces, subtle shadow, and consistent heading spacing. Keep `panel rise` utility compatibility or replace it with equivalent shared classes.

- [ ] **Step 2: Improve status pills and stats**

Keep tone maps and status semantics. Increase pill contrast against dark panels, use subtle inset/ring treatment, and make stat values brighter with readable muted notes. Keep `Tone` union unchanged.

- [ ] **Step 3: Improve progress, timeline, empty, and date components**

Keep progress clamping logic exactly unchanged. Update track colors so progress remains visible on dark surfaces. Change timeline marker ring from paper-only contrast to panel-aware contrast. Make empty states intentional with dark inset surfaces and readable dashed borders. Preserve date parsing and locale behavior while improving date-chip contrast.

- [ ] **Step 4: Run validation**

Run: `npm run lint && npm run build`
Expected: PASS.

---

### Task 4: Align root error states and route-level responsive details

**Files:**
- Modify: `src/routes/__root.tsx:18-75`
- Modify only if visual QA requires it: route files under `src/routes/*.tsx`

**Interfaces:**
- Preserve error reporting, `router.invalidate()`, `reset()`, route links, and all route data behavior.

- [ ] **Step 1: Update not-found and error surfaces**

Replace generic light-theme utilities in `NotFoundComponent` and `ErrorComponent` with `bg-paper`, `text-ink`, `text-ink-soft`, `bg-ink`, `text-paper`, and `border-line` equivalents. Keep existing copy and actions. Add `font-display` to large 404 value and use same focus treatment as shared buttons.

- [ ] **Step 2: Inspect representative route layouts**

Start app with `npm run dev -- --host 127.0.0.1`. Inspect `/`, `/projects`, `/projects/<first-project-id>`, `/planning`, `/todos`, `/documents`, `/meetings`, `/decisions`, `/members`, `/history`, and `/organisations` at desktop and mobile widths.

Check specifically for light surfaces remaining against dark canvas, insufficient contrast, horizontal overflow below 640px, action collisions, table-like grids losing primary column, and sticky header/sidebar layering over content.

- [ ] **Step 3: Apply only targeted class fixes**

If route fails one check, change only class names or responsive grid utilities. Do not alter filtering, sorting, store calls, form handlers, route params, or displayed copy. Prefer `min-w-0`, `overflow-x-auto`, `grid-cols-1`, `sm:grid-cols-*`, and `text-ink-soft`/`bg-panel` token classes already present in codebase.

- [ ] **Step 4: Run final static checks**

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Browser smoke checklist**

Confirm dashboard dark canvas and readable stats; sidebar active state and counts; organization switcher changes organization and closes; project and primary actions remain clickable; error and 404 screens preserve recovery actions; mobile view has no horizontal overflow; keyboard navigation shows accent focus rings; reduced-motion preference suppresses entrance motion.

## Self-review

- Spec coverage: token system and ambient glow are Task 1; shell and navigation are Task 2; shared data components are Task 3; error screens, responsive checks, and validation are Task 4.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps; route fixes constrained to visual class changes discovered during QA.
- Type consistency: exported component names and props remain unchanged; no new cross-file APIs introduced.
- Scope: four tasks cover one visual subsystem without route or data refactoring.
