import type { Credential, Decision, Doc, Meeting, Member, Project, Task } from "./types.ts";

export type SearchKind = "project" | "task" | "doc" | "meeting" | "decision" | "credential" | "member";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  projectId: string | null;
}

export interface SearchSource {
  projects: Project[];
  tasks: Task[];
  docs: Doc[];
  meetings: Meeting[];
  decisions: Decision[];
  credentials: Credential[];
  members: Member[];
}

export const MAX_RESULTS_PER_KIND = 5;

const KIND_ORDER: SearchKind[] = ["project", "task", "doc", "meeting", "decision", "credential", "member"];

interface Candidate extends SearchResult {
  extra: string;
}

/** 0 = title starts with query, 1 = title contains it, 2 = only secondary text matches, null = no match. */
function matchRank(query: string, title: string, extra: string): number | null {
  const t = title.toLowerCase();
  if (t.startsWith(query)) return 0;
  if (t.includes(query)) return 1;
  if (extra.toLowerCase().includes(query)) return 2;
  return null;
}

function toCandidates(source: SearchSource, projectName: (id: string | null) => string): Candidate[] {
  return [
    ...source.projects.map((p) => ({ kind: "project" as const, id: p.id, title: p.name, subtitle: "Project", projectId: p.id, extra: p.description ?? "" })),
    ...source.tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, subtitle: projectName(t.projectId) || "Task", projectId: t.projectId, extra: t.phase ?? "" })),
    ...source.docs.map((d) => ({ kind: "doc" as const, id: d.id, title: d.title, subtitle: projectName(d.projectId) || "Document", projectId: d.projectId, extra: "" })),
    ...source.meetings.map((m) => ({ kind: "meeting" as const, id: m.id, title: m.title, subtitle: projectName(m.projectId) || "Meeting", projectId: m.projectId, extra: "" })),
    ...source.decisions.map((d) => ({ kind: "decision" as const, id: d.id, title: d.title, subtitle: projectName(d.projectId) || "Decision", projectId: d.projectId, extra: "" })),
    ...source.credentials.map((c) => ({ kind: "credential" as const, id: c.id, title: c.name, subtitle: projectName(c.projectId) || "Credential", projectId: c.projectId, extra: c.username ?? "" })),
    ...source.members.map((m) => ({ kind: "member" as const, id: m.id, title: m.name, subtitle: "Member", projectId: null, extra: "" })),
  ];
}

/** Case-insensitive search across org entities, best matches first, capped per kind. */
export function searchAll(source: SearchSource, rawQuery: string): SearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const names = new Map(source.projects.map((p) => [p.id, p.name]));
  const projectName = (id: string | null) => (id ? names.get(id) ?? "" : "");

  const ranked = toCandidates(source, projectName).flatMap((c) => {
    const rank = matchRank(query, c.title, c.extra);
    return rank === null ? [] : [{ c, rank }];
  });

  return KIND_ORDER.flatMap((kind) =>
    ranked
      .filter((r) => r.c.kind === kind)
      .sort((a, b) => a.rank - b.rank || a.c.title.localeCompare(b.c.title))
      .slice(0, MAX_RESULTS_PER_KIND)
      .map(({ c }) => ({ kind: c.kind, id: c.id, title: c.title, subtitle: c.subtitle, projectId: c.projectId })),
  );
}
