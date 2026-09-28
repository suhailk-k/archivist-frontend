export type ID = string;

export type ProjectStatus = "planning" | "in_progress" | "review" | "blocked" | "done";
export type DecisionStatus = "open" | "approved" | "rejected";
export type Priority = "low" | "normal" | "high";

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
  createdAt: string;
}

export interface Task {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  title: string;
  phase: string;
  done: boolean;
  priority: Priority;
  dueDate: string;
  assigneeId: ID | null;
  /** Day the assignee plans to work on it (YYYY-MM-DD), separate from the dueDate deadline; "" = unscheduled. */
  plannedFor: string;
  /** ISO timestamp set when the task is checked off; "" while open. */
  completedAt: string;
  createdAt: string;
}

/** Fields the store fills in itself when a task is created. */
export type NewTask = Omit<Task, "id" | "createdAt" | "plannedFor" | "completedAt"> & Partial<Pick<Task, "plannedFor">>;

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
