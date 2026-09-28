# Project Workspace UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every `/projects/:projectId` page to match the supplied light project workspace reference while preserving behavior and leaving unrelated routes unchanged.

**Architecture:** Keep current project data derivation and event handlers in `src/routes/projects.$projectId.tsx`; replace only its project-page presentation with reference-style sections. Add a project-route-only shell branch in `src/components/app-shell.tsx`, using current dark shell for every non-project route. Use existing Tailwind CSS and Lucide icons already installed; add no dependencies or data/API changes.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS v4, lucide-react, existing store and UI primitives.

## Global Constraints

- Change only project detail presentation and project-route shell.
- Preserve existing project tabs, modals, toasts, CRUD handlers, links, team controls, and route behavior.
- Keep dashboard and unrelated routes visually and behaviorally unchanged.
- Do not add dependencies, API calls, data fields, or hardcoded production secrets.
- Use immutable React state updates and existing project data.
- Verify with `npm test`, `npm run build`, and `npm run lint`.

### Task 1: Add project-route shell variant

**Files:**
- Modify: `src/components/app-shell.tsx:20-205`
- Test: manual route smoke check; no existing shell unit test

**Interfaces:**
- Consumes: `useRouterState`, existing `NAV`, `db`, `org`, `user`, `children`.
- Produces: project detail routes render light workspace chrome; all other routes render current shell unchanged.

- [ ] **Step 1: Add route predicate without changing default shell**

Use pathname matching for exactly `/projects/<non-empty-id>` and avoid matching `/projects` list. Keep current shell JSX as fallback. Extract project chrome into a local render branch or focused component in same file; do not alter store or navigation contracts.

```tsx
const isProjectWorkspace = /^\/projects\/[^/]+$/.test(pathname);

return isProjectWorkspace ? (
  <ProjectWorkspaceShell>{children}</ProjectWorkspaceShell>
) : (
  <CurrentShell>{children}</CurrentShell>
);
```

Use an actual local component/function compatible with existing JSX; do not leave placeholder component names in code.

- [ ] **Step 2: Build project shell visual structure**

For project routes, render a light page background, dark navy sidebar, workspace switcher, grouped navigation, user footer, and top header. Reuse existing `NAV`, counts, org switcher, sign-out logic, and links. Add only visual affordances needed by screenshot (search field/button, notification button, edit/manage slots) without changing project route behavior. Existing project header actions remain owned by `projects.$projectId.tsx`.

- [ ] **Step 3: Run typecheck/build**

Run: `npm run build`
Expected: PASS with no TypeScript or bundler errors.

- [ ] **Step 4: Commit shell change**

```bash
git add src/components/app-shell.tsx
git commit -m "feat: add project workspace shell"
```

### Task 2: Restyle project detail page

**Files:**
- Modify: `src/routes/projects.$projectId.tsx:69-279`
- Modify: `src/components/kit.tsx:22-92,117-123` only if shared primitives need project-safe light variants
- Test: manual project route interaction smoke check

**Interfaces:**
- Consumes: existing `project`, `members`, `tasks`, `milestones`, `meetings`, `decisions`, `history`, `owner`, `progress`, `tab`, and existing callbacks.
- Produces: reference-style project hero, tabs, overview cards, and activity layout while preserving all existing tab content and handlers.

- [ ] **Step 1: Preserve current data and handlers**

Before changing JSX, retain all state declarations, derived collections, modal components, and event handlers. Do not rename project fields or alter store calls. Keep non-Overview tab bodies functional.

- [ ] **Step 2: Replace project page header and hero markup**

Render project context in a light top bar and a rounded hero card with status pill, formatted update/date metadata, title, description, progress bar, owner, team, timeline, and decorative pale-blue accent area. Keep `Edit` and `Delete` actions wired to existing `setEditOpen` and `setDeleteOpen` handlers.

```tsx
<PageHeader
  title={project.name}
  crumb={`${organisationName} · Project`}
  action={
    <>
      <GhostButton onClick={() => setEditOpen(true)}>Edit</GhostButton>
      <PrimaryButton onClick={() => setDeleteOpen(true)}>Delete</PrimaryButton>
    </>
  }
/>
```

Adapt styling around this existing contract rather than removing actions.

- [ ] **Step 3: Restyle tabs and Overview content**

Keep `TABS` and `setTab`. Use screenshot-like active underline and light card surfaces. For Overview, organize content into summary cards and a responsive two-column grid:

- Open Tasks: existing open task list, empty state, and links.
- Milestones: existing milestone list and empty state.
- Quick Links: existing `project.links`, preserving external anchors.
- Recent Activity: existing history/activity data with current timeline semantics.
- Bottom progress prompt: visual-only panel; no new action unless existing route supports it.

Use real project values, never screenshot-only hardcoded counts.

- [ ] **Step 4: Keep non-Overview tabs inside new visual frame**

Render existing Planning, Documents, Meetings, Decisions, Team, and History branches unchanged in behavior, with only wrapper classes needed for light surfaces and spacing. Preserve add/remove member, schedule, decision, document, and history links.

- [ ] **Step 5: Run tests and lint**

Run: `npm test`
Expected: PASS all existing tests.

Run: `npm run lint`
Expected: PASS with no new lint errors.

- [ ] **Step 6: Run production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit project page change**

```bash
git add src/routes/projects.$projectId.tsx src/components/kit.tsx
git commit -m "feat: restyle project detail workspace"
```

### Task 3: Verify route isolation and responsive behavior

**Files:**
- Modify: none unless verification finds a defect
- Test: project detail route, dashboard route, project list route, narrow viewport

**Interfaces:**
- Consumes: committed shell and project page changes.
- Produces: verified visual isolation and behavior report.

- [ ] **Step 1: Start development server**

Run: `npm run dev -- --host 127.0.0.1`
Expected: Vite reports local URL without startup error.

- [ ] **Step 2: Inspect a project detail page at desktop width**

Open an existing `/projects/<id>` route. Confirm light reference shell, hero, tabs, summary cards, quick links, activity, and bottom prompt appear. Confirm no horizontal overflow.

- [ ] **Step 3: Inspect mobile/narrow width**

Resize viewport below Tailwind `md` breakpoint. Confirm sidebar collapses or remains usable according to existing responsive behavior, content stacks, controls remain reachable, and no text is clipped.

- [ ] **Step 4: Verify interactions**

Click Overview tabs, project links, Edit, Delete, Team controls, and existing navigation. Confirm current modal/toast/navigation behavior remains intact.

- [ ] **Step 5: Verify route isolation**

Open `/`, `/projects`, and one unrelated route. Confirm current dark Archivist shell and existing layouts remain unchanged.

- [ ] **Step 6: Review final diff**

Run: `git diff HEAD~2..HEAD --stat && git status --short`
Expected: only intended project shell/page files plus approved design/plan docs are changed; working tree clean after commits.
