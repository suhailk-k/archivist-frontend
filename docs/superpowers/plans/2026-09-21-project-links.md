# Project Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unlimited labeled HTTP(S) links to projects and expose them through create, edit, card, and detail views.

**Architecture:** Extend the shared frontend `Project` model with `ProjectLink[]`; keep persistence on the existing project upsert command. Normalize legacy records at the frontend boundary and validate link input in a focused utility. Backend continues storing project payloads as JSON, with tests proving links round-trip without a schema migration or new endpoint.

**Tech Stack:** React 19, TypeScript, TanStack Router, existing local store and command sync, Node test runner, better-sqlite3.

## Global Constraints

- Use immutable updates; never mutate project or link arrays in place.
- Accept only `http:` and `https:` URLs.
- Ignore completely empty draft rows; reject partially filled or malformed rows.
- External links use `target="_blank"` and `rel="noreferrer"`.
- Preserve compatibility with existing projects lacking `links`.
- Do not add dependencies or API routes.
- Run frontend build/lint and backend tests/build before completion.

### Task 1: Add link model and validation utility

**Files:**
- Modify: `/Users/suhail/Desktop/archivist-src/src/lib/types.ts:22-33`
- Create: `/Users/suhail/Desktop/archivist-src/src/lib/project-links.ts`
- Create: `/Users/suhail/Desktop/archivist-src/src/lib/project-links.test.ts`

**Interfaces:**
- Produces `ProjectLink { id: ID; label: string; url: string }`.
- Produces `normalizeProjectLinks(value: unknown): ProjectLink[]`.
- Produces `validateProjectLinks(drafts: ProjectLinkDraft[]): { links: ProjectLink[]; error: string | null }`.

- [ ] **Step 1: Write failing tests** for valid HTTP(S), rejected protocols/malformed URLs, empty-row filtering, partial-row rejection, and missing legacy value normalization.
- [ ] **Step 2: Run targeted test** with `node --import tsx --test src/lib/project-links.test.ts`; verify failure because utility is absent.
- [ ] **Step 3: Add `ProjectLink`, `ProjectLinkDraft`, URL validator, normalizer, and immutable sanitizer.** Generate IDs only for drafts without IDs; preserve existing IDs on edit.
- [ ] **Step 4: Add `links: ProjectLink[]` to `Project` and run targeted tests.**

### Task 2: Normalize incoming database records and store project links

**Files:**
- Modify: `/Users/suhail/Desktop/archivist-src/src/lib/store.tsx:115-190, 300-334`
- Modify: `/Users/suhail/Desktop/archivist-src/src/lib/types.ts:99-109`

**Interfaces:**
- `StoreProvider` loads remote projects through `normalizeProjectLinks`.
- `addProject` accepts `Omit<Project, "id" | "createdAt">` with links.
- `updateProject` persists immutable link replacements through existing `upsert` commands.

- [ ] **Step 1: Add a test fixture or pure normalization assertion** proving a project without links becomes `links: []` and a project with links remains unchanged.
- [ ] **Step 2: Run targeted test and verify failure.**
- [ ] **Step 3: Normalize remote project records immediately after `apiGet` and before `setDb`; ensure empty database/sample records also satisfy the model.**
- [ ] **Step 4: Run frontend typecheck/build to verify store changes.**

### Task 3: Add reusable link editor UI

**Files:**
- Create: `/Users/suhail/Desktop/archivist-src/src/components/project-links-editor.tsx`
- Modify: `/Users/suhail/Desktop/archivist-src/src/routes/projects.index.tsx`
- Modify: `/Users/suhail/Desktop/archivist-src/src/routes/projects.$projectId.tsx`

**Interfaces:**
- `ProjectLinksEditor({ links, onChange }: { links: ProjectLinkDraft[]; onChange: (links: ProjectLinkDraft[]) => void })`.
- Renders label/url rows, add-link control, remove controls, and accessible labels.

- [ ] **Step 1: Implement editor with immutable row updates.** Start create form with one empty row; allow unlimited additions; retain stable IDs for edit rows.
- [ ] **Step 2: Add link drafts to new-project form and validate with `validateProjectLinks` before `addProject`.** Show `toast.error` on invalid input; pass sanitized links to store; reset form after successful create.
- [ ] **Step 3: Add links to edit-project modal, initialize from `project.links`, validate before `updateProject`, and reinitialize when modal opens for another project.**
- [ ] **Step 4: Run lint/build and fix type errors.**

### Task 4: Display project links

**Files:**
- Modify: `/Users/suhail/Desktop/archivist-src/src/routes/projects.index.tsx:85-108`
- Modify: `/Users/suhail/Desktop/archivist-src/src/routes/projects.$projectId.tsx:80-157`

**Interfaces:**
- Cards show a compact link count only when links exist.
- Overview shows a Links panel with label and hostname/URL.

- [ ] **Step 1: Add safe anchors for each project link** with `href`, `target="_blank"`, and `rel="noreferrer"`.
- [ ] **Step 2: Add empty state text `No links added` in the detail panel.**
- [ ] **Step 3: Verify keyboard focus, truncation, and mobile wrapping using existing Tailwind patterns.**
- [ ] **Step 4: Run frontend lint/build.**

### Task 5: Verify backend JSON round-trip

**Files:**
- Modify: `/Users/suhail/Desktop/archivist-src-backend/tests/authorization.test.ts` or create `/Users/suhail/Desktop/archivist-src-backend/tests/project-links.test.ts`
- Inspect only: `/Users/suhail/Desktop/archivist-src-backend/src/http/data.ts`, `/Users/suhail/Desktop/archivist-src-backend/src/http/server.ts`

**Interfaces:**
- Existing `/api/data/import`, `/api/data`, and `/api/data/mutate` preserve arbitrary project `links` payloads.

- [ ] **Step 1: Write failing backend test** importing a project with two links, reading it back, mutating it, and asserting labels/URLs survive.
- [ ] **Step 2: Run `npm test -- --test-name-pattern='project links'` and verify failure if current record guard rejects the fixture.**
- [ ] **Step 3: Make the smallest backend adjustment only if test exposes a real restriction; keep generic payload handling and existing authorization intact.**
- [ ] **Step 4: Run all backend tests and `npm run build`.**

### Task 6: Final verification and documentation

**Files:**
- Modify: `/Users/suhail/Desktop/archivist-src/README.md` only if project-link behavior needs documenting.
- No backend schema migration expected.

- [ ] **Step 1: Run frontend `npm run lint` and `npm run build`.**
- [ ] **Step 2: Run backend `npm test` and `npm run build`.**
- [ ] **Step 3: Inspect diff for mutation, unsafe anchors, missing legacy normalization, and unrelated changes.**
- [ ] **Step 4: Manually verify create, edit, remove, and open-link flows on Organisation > Projects.**
