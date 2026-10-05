import { bySortOrder } from "./board";
import type { ID, Task } from "./types";

/** A board swimlane: the children of one parent, or (parent null) everything without one. */
export interface Lane {
  parent: Task | null;
  tasks: Task[];
}

/** The task's parent when it still exists in the same project; a dangling or cross-project link counts as none. */
export function parentOf(task: Task, byId: ReadonlyMap<ID, Task>): Task | undefined {
  if (!task.parentId || !task.projectId || task.parentId === task.id) return undefined;
  const parent = byId.get(task.parentId);
  return parent && parent.projectId === task.projectId ? parent : undefined;
}

export const childrenOf = (parentId: ID, tasks: readonly Task[]): Task[] =>
  tasks.filter((task) => task.parentId === parentId && task.id !== parentId).sort(bySortOrder);

/** One level only: a task with children can't get a parent, and only top-level tasks can be parents. */
export function parentCandidates(task: Task, tasks: readonly Task[]): Task[] {
  if (!task.projectId || tasks.some((other) => other.parentId === task.id && other.id !== task.id)) return [];
  return tasks
    .filter((other) => other.projectId === task.projectId && other.id !== task.id && !other.parentId)
    .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Swimlanes for `visible` tasks, parents looked up in `all` (a lane survives its parent being
 * filtered out). Lanes follow the parents' board order; the catch-all lane comes last and is
 * dropped when empty unless it is the only lane.
 */
export function groupIntoLanes(visible: readonly Task[], all: readonly Task[]): Lane[] {
  const byId = new Map(all.map((task) => [task.id, task]));
  const byParent = new Map<ID, Task[]>();
  const loose: Task[] = [];
  for (const task of visible) {
    const parent = parentOf(task, byId);
    if (parent) byParent.set(parent.id, [...(byParent.get(parent.id) ?? []), task]);
    else loose.push(task);
  }
  const lanes: Lane[] = [...byParent.keys()]
    .flatMap((id) => {
      const parent = byId.get(id);
      return parent ? [parent] : [];
    })
    .sort(bySortOrder)
    .map((parent) => ({ parent, tasks: [...(byParent.get(parent.id) ?? [])].sort(bySortOrder) }));
  const rest = loose.filter((task) => !byParent.has(task.id)).sort(bySortOrder);
  return rest.length > 0 || lanes.length === 0 ? [...lanes, { parent: null, tasks: rest }] : lanes;
}
