import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { matchesFilters, type BoardFilters } from "@/lib/board";
import { uid, useStore } from "@/lib/store";
import type { ID, LabelColor, Member, Project, ProjectLabel, Task, TaskStatus } from "@/lib/types";
import { BoardFiltersBar } from "./board-filters";
import { BoardView } from "./board-view";
import { TaskDetailDialog } from "./task-detail-dialog";

const SKELETON_COLUMNS = 4;

export interface TaskBoardProps {
  /** Every task in scope (one project's, or the whole org's); filters are applied here. */
  tasks: readonly Task[];
  /** The org's projects, for task keys and labels. */
  projects: readonly Project[];
  members: readonly Member[];
  filters: BoardFilters;
  onFiltersChange: (next: BoardFilters) => void;
  openTaskId: ID | undefined;
  onOpenTask: (id: ID | undefined) => void;
  /** Where "+ New work item" puts new cards. */
  createIn: { orgId: ID; projectId: ID | null };
}

/** Filters + board + detail sheet, wired to the store. Used by the project Board tab and the Tasks page. */
export function TaskBoard({ tasks, projects, members, filters, onFiltersChange, openTaskId, onOpenTask, createIn }: TaskBoardProps) {
  const { hydrated, addTask, moveTask, updateTask, removeTask, updateProject } = useStore();
  const { user } = useAuth();
  const memberId = user?.memberId ?? null;
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const visible = useMemo(
    () =>
      tasks.filter((task) => {
        const key = task.projectId ? projectsById.get(task.projectId)?.key ?? "" : "";
        return matchesFilters(task, filters, { key, memberId });
      }),
    [tasks, filters, projectsById, memberId],
  );

  const labels = useMemo<ProjectLabel[]>(() => {
    const projectIds = new Set(tasks.flatMap((task) => (task.projectId ? [task.projectId] : [])));
    if (createIn.projectId) projectIds.add(createIn.projectId);
    return [...projectIds].flatMap((id) => projectsById.get(id)?.labels ?? []);
  }, [tasks, createIn.projectId, projectsById]);

  const create = useCallback(
    (status: TaskStatus, title: string) =>
      addTask({
        orgId: createIn.orgId,
        projectId: createIn.projectId,
        title,
        phase: createIn.projectId ? "Unsorted" : "Admin",
        done: false,
        priority: "normal",
        dueDate: "",
        assigneeId: null,
        status,
      }),
    [addTask, createIn.orgId, createIn.projectId],
  );

  const createLabel = (projectId: ID, name: string, color: LabelColor): ID => {
    const project = projectsById.get(projectId);
    const id = uid();
    if (!project) return id;
    updateProject(projectId, { labels: [...project.labels, { id, name, color }] });
    toast.success(`Label "${name}" created`);
    return id;
  };

  const openTask = openTaskId ? tasks.find((task) => task.id === openTaskId) : undefined;

  return (
    <div className="space-y-3">
      <BoardFiltersBar filters={filters} onChange={onFiltersChange} members={members} labels={labels} memberId={memberId} />
      {hydrated ? (
        <BoardView tasks={visible} projectsById={projectsById} members={members} onMove={moveTask} onOpen={onOpenTask} onCreate={create} />
      ) : (
        <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading board">
          {Array.from({ length: SKELETON_COLUMNS }, (_, index) => (
            <div key={index} className="w-[min(320px,85vw)] shrink-0 rounded-xl bg-ink/[0.035] p-2">
              <ListSkeleton rows={3} />
            </div>
          ))}
        </div>
      )}
      <TaskDetailDialog
        task={openTask}
        project={openTask?.projectId ? projectsById.get(openTask.projectId) : undefined}
        members={members}
        canManageLabels={user?.role === "superadmin"}
        onClose={() => onOpenTask(undefined)}
        onUpdate={updateTask}
        onDelete={(id) => {
          removeTask(id);
          toast.success("Work item deleted");
        }}
        onCreateLabel={createLabel}
      />
    </div>
  );
}
