import type { Database, ID } from "./types";

export interface CascadeCounts {
  tasks: number;
  docs: number;
  meetings: number;
  decisions: number;
  credentials: number;
  files: number;
  milestones: number;
}

/** Counts every record that would be deleted along with a project. */
export function countProjectCascade(db: Database, projectId: ID): CascadeCounts {
  return {
    tasks: db.tasks.filter((t) => t.projectId === projectId).length,
    docs: db.docs.filter((d) => d.projectId === projectId).length,
    meetings: db.meetings.filter((m) => m.projectId === projectId).length,
    decisions: db.decisions.filter((d) => d.projectId === projectId).length,
    credentials: db.credentials.filter((c) => c.projectId === projectId).length,
    files: db.files.filter((f) => f.projectId === projectId).length,
    milestones: db.milestones.filter((m) => m.projectId === projectId).length,
  };
}

/** Counts every record that would be deleted along with an organisation, including all of its projects. */
export function countOrgCascade(db: Database, orgId: ID): CascadeCounts {
  const projectIds = new Set(db.projects.filter((p) => p.orgId === orgId).map((p) => p.id));
  return {
    tasks: db.tasks.filter((t) => t.orgId === orgId).length,
    docs: db.docs.filter((d) => d.orgId === orgId).length,
    meetings: db.meetings.filter((m) => m.orgId === orgId).length,
    decisions: db.decisions.filter((d) => d.orgId === orgId).length,
    credentials: db.credentials.filter((c) => c.orgId === orgId).length,
    files: db.files.filter((f) => f.orgId === orgId).length,
    milestones: db.milestones.filter((m) => projectIds.has(m.projectId)).length,
  };
}

const LABELS: Record<keyof CascadeCounts, string> = {
  tasks: "task",
  docs: "document",
  meetings: "meeting",
  decisions: "decision",
  credentials: "credential",
  files: "file",
  milestones: "milestone",
};

/** Renders cascade counts as a human sentence fragment, e.g. "12 tasks, 3 documents". */
export function describeCascade(counts: CascadeCounts): string {
  const parts = (Object.keys(LABELS) as (keyof CascadeCounts)[])
    .filter((key) => counts[key] > 0)
    .map((key) => `${counts[key]} ${LABELS[key]}${counts[key] === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(", ") : "nothing else";
}
