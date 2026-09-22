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
  createdAt: string;
}

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
  activity: Activity[];
}

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
