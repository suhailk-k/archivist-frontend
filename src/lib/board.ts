import type { ID, LabelColor, NewTask, Priority, Project, Task, TaskStatus } from "./types";

/** Board columns, left to right. */
export const TASK_STATUSES: readonly TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];
/** Highest first, as shown in pickers. */
export const PRIORITIES: readonly Priority[] = ["urgent", "high", "normal", "low", "none"];
export const LABEL_COLORS: readonly LabelColor[] = ["accent", "verd", "amber", "rose", "plum", "teal", "ink", "ink-soft"];

/** Gap between neighbouring cards when a column is (re)numbered. */
export const SORT_STEP = 1024;
/** Below this gap a midpoint loses precision, so the column is renumbered instead. */
const MIN_GAP = 1e-6;
const PROJECT_KEY = /^[A-Z]{2,5}$/;
const FALLBACK_KEY = "PRJ";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const isTaskStatus = (value: unknown): value is TaskStatus => TASK_STATUSES.includes(value as TaskStatus);
export const isPriority = (value: unknown): value is Priority => PRIORITIES.includes(value as Priority);

export const bySortOrder = (a: Task, b: Task): number => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);

/** A sort order between two neighbours; either may be missing at the ends of a column. */
export function midpoint(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return SORT_STEP;
  if (before === undefined) return (after as number) - SORT_STEP;
  if (after === undefined) return before + SORT_STEP;
  return (before + after) / 2;
}

export function appendSortOrder(column: readonly Task[]): number {
  if (column.length === 0) return SORT_STEP;
  return Math.max(...column.map((task) => task.sortOrder)) + SORT_STEP;
}

export interface MoveTarget {
  /** The card that ends up directly above the moved one. */
  beforeId?: ID | undefined;
  /** The card that ends up directly below the moved one. */
  afterId?: ID | undefined;
}

export interface SortUpdate {
  id: ID;
  sortOrder: number;
}

/**
 * Where a card lands in `column` (its destination, which may or may not contain it already).
 * Usually one update for the moved card; when the gap is too small, the whole column is renumbered.
 */
export function planMove(column: readonly Task[], movingId: ID, target: MoveTarget): SortUpdate[] {
  const others = column.filter((task) => task.id !== movingId).sort(bySortOrder);
  const beforeIndex = target.beforeId ? others.findIndex((task) => task.id === target.beforeId) : -1;
  const afterIndex = target.afterId ? others.findIndex((task) => task.id === target.afterId) : -1;
  const index = beforeIndex >= 0 ? beforeIndex + 1 : afterIndex >= 0 ? afterIndex : others.length;
  const before = others[index - 1]?.sortOrder;
  const after = others[index]?.sortOrder;

  if (before === undefined || after === undefined || after - before >= MIN_GAP) {
    return [{ id: movingId, sortOrder: midpoint(before, after) }];
  }
  const ordered = [...others.slice(0, index).map((t) => t.id), movingId, ...others.slice(index).map((t) => t.id)];
  const previous = new Map(others.map((task) => [task.id, task.sortOrder]));
  return ordered
    .map((id, position) => ({ id, sortOrder: (position + 1) * SORT_STEP }))
    .filter((update) => update.id === movingId || previous.get(update.id) !== update.sortOrder);
}

export type StatusFields = Pick<Task, "status" | "done" | "completedAt">;

/** `done` and `completedAt` always follow the status. */
export function statusPatch(task: Task, status: TaskStatus, now: string): StatusFields {
  const done = status === "done";
  const completedAt = done ? (task.done && task.completedAt ? task.completedAt : now) : "";
  return { status, done, completedAt };
}

/** A checkbox toggle elsewhere in the app (planner, lists) moves the card to match. */
export function donePatch(task: Task, done: boolean, now: string): StatusFields {
  if (done) return statusPatch(task, "done", now);
  return statusPatch(task, task.status === "done" ? "todo" : task.status, now);
}

/** Keeps the single `assigneeId` (used by the planner) equal to the first of `assigneeIds`. */
export function syncAssignees(patch: Partial<Task>): Partial<Task> {
  if (patch.assigneeIds !== undefined) return { ...patch, assigneeId: patch.assigneeIds[0] ?? null };
  if (patch.assigneeId !== undefined) return { ...patch, assigneeIds: patch.assigneeId ? [patch.assigneeId] : [] };
  return patch;
}

const byCreatedAt = <T extends { createdAt: string }>(a: T, b: T): number => a.createdAt.localeCompare(b.createdAt);

/**
 * Smallest numbers not already used in each project, handed out in createdAt order. The server
 * numbers new tasks above max(highest number, task count), so these never collide with its numbers.
 */
function legacyNumbers(tasks: readonly Task[]): Map<ID, number> {
  const raw = tasks as readonly Partial<Task>[];
  const used = new Map<ID, Set<number>>();
  for (const task of raw) {
    if (!task.projectId || task.number === undefined) continue;
    used.set(task.projectId, (used.get(task.projectId) ?? new Set()).add(task.number));
  }
  const assigned = new Map<ID, number>();
  for (const task of [...tasks].sort(byCreatedAt)) {
    if (!task.projectId || (task as Partial<Task>).number !== undefined) continue;
    const taken = used.get(task.projectId) ?? new Set<number>();
    let next = 1;
    while (taken.has(next)) next += 1;
    used.set(task.projectId, taken.add(next));
    assigned.set(task.id, next);
  }
  return assigned;
}

/**
 * Fills fields that older task records lack, in memory only: they are persisted when the task is
 * next saved, so loading never rewrites (and re-versions) every record.
 */
export function normalizeTasks(tasks: readonly Task[]): Task[] {
  const legacyOrder = new Map([...tasks].sort(byCreatedAt).map((task, index) => [task.id, index * SORT_STEP]));
  const numbers = legacyNumbers(tasks);
  return tasks.map((task) => {
    const partial = task as Partial<Task>;
    const number = numbers.get(task.id);
    const isComplete =
      partial.status !== undefined &&
      partial.assigneeIds !== undefined &&
      partial.labels !== undefined &&
      partial.sortOrder !== undefined &&
      number === undefined;
    if (isComplete) return task;
    const filled: Task = {
      ...task,
      status: partial.status ?? (task.done ? "done" : "todo"),
      assigneeIds: partial.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []),
      labels: partial.labels ?? [],
      sortOrder: partial.sortOrder ?? legacyOrder.get(task.id) ?? 0,
    };
    return number === undefined ? filled : { ...filled, number };
  });
}

export const taskKey = (projectKey: string, number: number | undefined): string => `${projectKey}-${number ?? "…"}`;

const lettersOf = (text: string): string =>
  text
    .normalize("NFD")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

function keyCandidates(name: string): string[] {
  const words = name.split(/\s+/).map(lettersOf).filter(Boolean);
  const letters = words.join("");
  if (letters.length < 2) return [FALLBACK_KEY];
  const initials = words.map((word) => word[0]).join("");
  const base = initials.length >= 2 ? initials.slice(0, 5) : letters.slice(0, 3);
  const longer = Array.from({ length: 5 - base.length }, (_, extra) => letters.slice(0, base.length + extra + 1));
  return [base, ...longer];
}

/** A 2–5 letter key from the project name that isn't in `taken`. */
export function deriveProjectKey(name: string, taken: readonly string[]): string {
  const used = new Set(taken);
  const candidates = keyCandidates(name).filter((key) => PROJECT_KEY.test(key));
  const free = candidates.find((key) => !used.has(key));
  if (free) return free;
  const stem = (candidates[0] ?? FALLBACK_KEY).slice(0, 4);
  const suffixed = [...LETTERS].map((letter) => stem + letter).find((key) => !used.has(key));
  if (suffixed) return suffixed;
  const pairs = [...LETTERS].flatMap((a) => [...LETTERS].map((b) => stem.slice(0, 3) + a + b));
  return pairs.find((key) => !used.has(key)) ?? FALLBACK_KEY;
}

/** Derives missing project keys (unique per org, oldest project first) and fills `labels`. */
export function normalizeProjects(projects: readonly Project[]): Project[] {
  const validKey = (project: Project) => {
    const key = (project as Partial<Project>).key;
    return key && PROJECT_KEY.test(key) ? key : undefined;
  };
  const takenByOrg = new Map<ID, string[]>();
  for (const project of projects) {
    const key = validKey(project);
    if (key) takenByOrg.set(project.orgId, [...(takenByOrg.get(project.orgId) ?? []), key]);
  }
  const derived = new Map<ID, string>();
  for (const project of [...projects].sort(byCreatedAt)) {
    if (validKey(project)) continue;
    const taken = takenByOrg.get(project.orgId) ?? [];
    const next = deriveProjectKey(project.name, taken);
    takenByOrg.set(project.orgId, [...taken, next]);
    derived.set(project.id, next);
  }
  return projects.map((project) => {
    const key = derived.get(project.id);
    const labels = (project as Partial<Project>).labels;
    if (key === undefined && labels !== undefined) return project;
    return { ...project, key: key ?? project.key, labels: labels ?? [] };
  });
}

export interface BoardFilters {
  /** Member ids, or "me" for the signed-in user's member record; a task matches if it has any of them. */
  assignees?: string[];
  /** Only tasks in these projects (the org-wide Tasks board). */
  projects?: ID[];
  label?: ID;
  priority?: Priority;
  q?: string;
}

export interface FilterContext {
  /** Project key of the task, for matching "ELC-12" in the search box. */
  key: string;
  memberId: ID | null;
}

export function matchesFilters(task: Task, filters: BoardFilters, context: FilterContext): boolean {
  if (filters.assignees && filters.assignees.length > 0) {
    const wanted = filters.assignees.map((id) => (id === "me" ? context.memberId : id));
    if (!wanted.some((id) => id !== null && task.assigneeIds.includes(id))) return false;
  }
  if (filters.projects && filters.projects.length > 0 && !(task.projectId && filters.projects.includes(task.projectId))) return false;
  if (filters.label && !task.labels.includes(filters.label)) return false;
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.q) {
    const query = filters.q.toLowerCase();
    const haystack = `${taskKey(context.key, task.number)} ${task.title}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

const nonEmpty = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/** One value arrives as a string, several as an array. */
function listParam(value: unknown): string[] {
  const values: unknown[] = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => nonEmpty(item) ?? []);
}

/** Filters as stored in the URL: singular keys (`?assignee=…&project=…`). */
export interface BoardSearch {
  assignee?: string[];
  project?: ID[];
  label?: ID;
  priority?: Priority;
  q?: string;
}

/** Reads filters from URL search params, dropping anything malformed. */
export function filtersFromSearch(search: Record<string, unknown>): BoardFilters {
  const assignees = listParam(search["assignee"]);
  const projects = listParam(search["project"]);
  const label = nonEmpty(search["label"]);
  const priority = isPriority(search["priority"]) ? search["priority"] : undefined;
  const q = nonEmpty(search["q"]);
  return {
    ...(assignees.length > 0 ? { assignees } : {}),
    ...(projects.length > 0 ? { projects } : {}),
    ...(label ? { label } : {}),
    ...(priority ? { priority } : {}),
    ...(q ? { q } : {}),
  };
}

export function searchFromFilters(filters: BoardFilters): BoardSearch {
  return {
    ...(filters.assignees?.length ? { assignee: filters.assignees } : {}),
    ...(filters.projects?.length ? { project: filters.projects } : {}),
    ...(filters.label ? { label: filters.label } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.q ? { q: filters.q } : {}),
  };
}

/** A task as created by the store: appended to the end of its column, derived fields in sync. */
export function buildTask(input: NewTask, existing: readonly Task[], id: ID, now: string): Task {
  const status = input.status ?? (input.done ? "done" : "todo");
  const assigneeIds = input.assigneeIds ?? (input.assigneeId ? [input.assigneeId] : []);
  const column = existing.filter((task) => task.orgId === input.orgId && task.status === status);
  return {
    plannedFor: "",
    ...input,
    status,
    done: status === "done",
    completedAt: status === "done" ? now : "",
    assigneeIds,
    assigneeId: assigneeIds[0] ?? null,
    labels: input.labels ?? [],
    sortOrder: appendSortOrder(column),
    id,
    createdAt: now,
  };
}

/** Applies an edit, keeping status ↔ done/completedAt and assigneeIds ↔ assigneeId in step; a project move resets project-owned fields. */
export function applyTaskPatch(task: Task, patch: Partial<Task>, now: string): Task {
  const synced = syncAssignees(patch);
  const statusFields =
    synced.status !== undefined
      ? statusPatch(task, synced.status, now)
      : synced.done !== undefined && synced.done !== task.done
        ? donePatch(task, synced.done, now)
        : {};
  const next: Task = { ...task, ...synced, ...statusFields };
  if (synced.projectId === undefined || synced.projectId === task.projectId) return next;
  // Numbers, labels and the parent belong to a project: the server numbers the task in its new project.
  const { number: _oldNumber, ...moved } = next;
  return { ...moved, labels: [], parentId: null };
}

export interface MoveRequest extends MoveTarget {
  status: TaskStatus;
}

/** The tasks a drag changes: the moved card (status + order) and, after a rebalance, its column. */
export function moveTasks(tasks: readonly Task[], id: ID, request: MoveRequest, now: string): Task[] {
  const moving = tasks.find((task) => task.id === id);
  if (!moving) return [];
  const column = tasks.filter((task) => task.orgId === moving.orgId && task.status === request.status).sort(bySortOrder);
  if (moving.status === request.status && isSamePlace(column, id, request)) return [];
  const updates = new Map(planMove(column, id, request).map((update) => [update.id, update.sortOrder]));
  return tasks.flatMap((task) => {
    const sortOrder = updates.get(task.id);
    if (sortOrder === undefined) return [];
    if (task.id === id) return [{ ...task, ...statusPatch(task, request.status, now), sortOrder }];
    return [{ ...task, sortOrder }];
  });
}

function isSamePlace(column: readonly Task[], id: ID, target: MoveTarget): boolean {
  const index = column.findIndex((task) => task.id === id);
  const above = column[index - 1]?.id;
  const below = column[index + 1]?.id;
  if (target.beforeId !== undefined) return above === target.beforeId;
  if (target.afterId !== undefined) return below === target.afterId;
  return index === column.length - 1;
}
