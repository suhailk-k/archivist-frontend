# Project Workspace UI Design

## Goal

Match reference screenshot styling on every project detail page at `/projects/:projectId`, while leaving project behavior and all other routes unchanged.

## Scope

Only project detail presentation changes:

- Light workspace shell for project pages.
- Project header with organisation/project context, search affordance, notification affordance, edit action, and manage affordance.
- Project hero with status, dates, description, owner, team, timeline, progress, and decorative illustration treatment.
- Project tabs styled like reference.
- Overview cards for open tasks, milestones, quick links, recent activity, and bottom progress prompt.
- Existing project data, tab selection, editing, deletion, team management, links, and navigation remain functional.

Dashboard, project list, authentication, backend behavior, and unrelated routes remain unchanged.

## Architecture

`src/components/app-shell.tsx` will branch presentation based on the current `/projects/:projectId` pathname. Existing shell remains default for every other route. `src/routes/projects.$projectId.tsx` will retain current data derivation and event handlers, but render its overview through reference-style layout classes and semantic card sections. Existing shared primitives may receive styling-only adjustments only when required by project detail rendering.

No new dependencies, data fields, API calls, or route behavior.

## Visual Direction

- White to very-light blue page background.
- Dark navy sidebar with branded workspace switcher and icon-like navigation markers.
- Indigo primary actions and active states.
- Rounded white cards with subtle borders and shadows.
- Compact sans-serif UI type with strong navy headings.
- Four summary cards, two-column content region, and full-width bottom call-to-action.
- Responsive collapse using existing Tailwind breakpoints.

## Interaction and Error Handling

All existing controls keep their current handlers and labels unless visual copy is required by the reference. Decorative controls that have no existing behavior remain non-destructive affordances. Missing project behavior remains current `Project not found` rendering. Existing toast and modal behavior remains untouched.

## Verification

- Run existing unit tests.
- Run TypeScript/build checks.
- Inspect project detail route at desktop and narrow viewport.
- Confirm non-project dashboard route retains current dark Archivist shell.
- Confirm edit, delete, tab, link, and team controls still render and respond.
