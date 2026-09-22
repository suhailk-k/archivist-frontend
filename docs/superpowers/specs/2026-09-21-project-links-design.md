# Project Links Design

## Goal

Allow every project to store unlimited labeled external links, such as GitHub, frontend, backend, docs, and Figma URLs.

## Scope

Each project gains a `links` array. Each link has a stable local identifier, a required label, and an HTTP(S) URL. Users can add, edit, remove, and open links from project creation and project detail views.

## Data Model

```ts
interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

interface Project {
  // existing fields
  links: ProjectLink[];
}
```

Existing projects with no `links` field normalize to an empty array during load, preserving backward compatibility.

## Validation

- Trim labels and URLs before saving.
- Labels must be non-empty.
- URLs must parse with `URL` and use `http:` or `https:` protocols.
- Empty draft rows are ignored when saving a project.
- Invalid non-empty rows block save and show a user-facing error.

## User Interface

Project create and edit forms expose repeatable link rows with label and URL inputs, add-link and remove-link controls. Project overview shows a Links panel. Each saved link renders as an external anchor with `target="_blank"` and `rel="noreferrer"`. Project cards show compact link availability without disrupting existing status and progress information.

## Persistence

The frontend uses the existing project upsert command. The backend already stores project payloads as JSON and accepts generic project records, so no new endpoint or database migration is required. Backend tests verify links survive import, read, and mutation operations.

## Testing

Unit tests cover URL validation and normalization. Store tests cover create/update persistence and legacy project normalization. Backend tests cover JSON payload round trips. UI tests cover adding/removing rows and safe external link attributes where the current test harness supports component rendering.
