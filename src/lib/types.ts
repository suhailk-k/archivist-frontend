export type ID = string;

export type ProjectStatus = "planning" | "in_progress" | "review" | "blocked" | "done";
export type DecisionStatus = "open" | "approved" | "rejected";
/** "normal" is shown as "Medium" on the board; kept for compatibility with older records. */
export type Priority = "none" | "low" | "normal" | "high" | "urgent";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";

export interface Organisation {
  id: ID;
  name: string;
  description: string;
  createdAt: string;
}

export interface Member {
  id: ID;
  orgId: ID;
  name: string;
  role: string;
  email: string;
}

export interface ProjectLink {
  id: ID;
  label: string;
  url: string;
}

export interface Project {
  id: ID;
  orgId: ID;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: ID | null;
  memberIds: ID[];
  startDate: string;
  dueDate: string;
  links: ProjectLink[];
  /** 2–5 uppercase letters used in task keys (e.g. ELC-23); derived in memory for older projects. */
  key: string;
  labels: ProjectLabel[];
  createdAt: string;
}

export interface ProjectLabel {
  id: ID;
  name: string;
  color: LabelColor;
}

/** Preset label colours; each maps to a design token (or a mix of two) in board/status-meta.ts. */
export type LabelColor = "accent" | "verd" | "amber" | "rose" | "ink" | "ink-soft" | "plum" | "teal";

export interface Task {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  title: string;
  phase: string;
  /** Board column; `done` is derived from it (status === "done"). */
  status: TaskStatus;
  /** Per-project sequence assigned by the server; absent until the first save round-trips. */
  number?: number;
  /** Ids of the project's labels. */
  labels: ID[];
  /** Fractional order within a status column. */
  sortOrder: number;
  done: boolean;
  priority: Priority;
  dueDate: string;
  /** Kept equal to assigneeIds[0] for the planner and older code. */
  assigneeId: ID | null;
  assigneeIds: ID[];
  /** Day the assignee plans to work on it (YYYY-MM-DD), separate from the dueDate deadline; "" = unscheduled. */
  plannedFor: string;
  /** Parent work item in the same project (one level, Jira-style); absent or null for top-level items. */
  parentId?: ID | null;
  /** Free-form details edited in the board's task sheet; older records have none. */
  notes?: string;
  /** ISO timestamp set when the task is checked off; "" while open. */
  completedAt: string;
  createdAt: string;
}

/** Fields the store fills in itself when a task is created. */
export type NewTask = Omit<
  Task,
  "id" | "createdAt" | "plannedFor" | "completedAt" | "status" | "number" | "labels" | "assigneeIds" | "sortOrder"
> &
  Partial<Pick<Task, "plannedFor" | "status" | "labels" | "assigneeIds">>;

/** Fields the store fills in itself when a project is created. */
export type NewProject = Omit<Project, "id" | "createdAt" | "key" | "labels"> & Partial<Pick<Project, "key" | "labels">>;

export interface Milestone {
  id: ID;
  projectId: ID;
  title: string;
  date: string;
  done: boolean;
}

export interface Doc {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  title: string;
  kind: string;
  link: string;
  /** Set when a file was uploaded for this document (see /api/files); null for a link-only doc. */
  fileId: ID | null;
  fileName: string;
  fileSize: number;
  fileMime: string;
  ownerId: ID | null;
  notes: string;
  updatedAt: string;
}

export interface Meeting {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  title: string;
  date: string;
  time: string;
  attendeeIds: ID[];
  notes: string;
}

export interface Decision {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  title: string;
  status: DecisionStatus;
  rationale: string;
  decidedById: ID | null;
  date: string;
}

export interface Credential {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  name: string;
  category: string;
  username: string;
  /** Always "" once loaded — secrets are fetched one at a time via revealCredentialSecret. */
  secret: string;
  /** Server-derived: whether a secret is stored for this credential. */
  hasSecret?: boolean;
  url: string;
  usedFor: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Metadata for an uploaded file (see /api/files); the bytes live on the backend, not here. */
export interface UploadedFile {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: ID;
  createdAt: string;
}

export interface Activity {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  text: string;
  tone: "accent" | "verd" | "amber" | "rose" | "line";
  at: string;
}

export interface Database {
  organisations: Organisation[];
  members: Member[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  docs: Doc[];
  meetings: Meeting[];
  decisions: Decision[];
  files: UploadedFile[];
  credentials: Credential[];
  activity: Activity[];
}

export const CREDENTIAL_CATEGORY_SUGGESTIONS = [
  "App Store Connect",
  "Google Play Console",
  "Firebase",
  "AWS",
  "GitHub",
  "Domain / DNS",
  "Email",
] as const;

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, "accent" | "verd" | "amber" | "rose" | "line"> = {
  planning: "line",
  in_progress: "accent",
  review: "amber",
  blocked: "rose",
  done: "verd",
};
