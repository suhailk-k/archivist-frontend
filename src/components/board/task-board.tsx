import { Rows3 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { matchesFilters, type BoardFilters } from "@/lib/board";
import { groupIntoLanes } from "@/lib/hierarchy";
import { uid, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ID, LabelColor, Member, Project, ProjectLabel, Task, TaskStatus } from "@/lib/types";
import { BoardFiltersBar } from "./board-filters";
import { BoardLanes } from "./board-lanes";
import { BoardView } from "./board-view";
import { COLUMN_WIDTH } from "./status-meta";
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
  /** Where "+ Create" puts new cards (the org board uses the project filter when exactly one is picked). */
  createIn: { orgId: ID; projectId: ID | null };
  /** Show the Project filter (the org-wide Tasks board). */
  hasProjectFilter?: boolean;
}

/** Filters + board + detail sheet, wired to the store. Used by the project Board tab and the Tasks page. */
export function TaskBoard({ tasks, projects, members, filters, onFiltersChange, openTaskId, onOpenTask, createIn, hasProjectFilter = false }: TaskBoardProps) {
  const { hydrated, addTask, moveTask, updateTask, removeTask, updateProject } = useStore();
  const { user } = useAuth();
  const memberId = user?.memberId ?? null;
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const [isGrouped, setIsGrouped] = useState(true);

  const visible = useMemo(
    () =>
      tasks.filter((task) => {
        const key = task.projectId ? projectsById.get(task.projectId)?.key ?? "" : "";
        return matchesFilters(task, filters, { key, memberId });
      }),
    [tasks, filters, projectsById, memberId],
  );
  const lanes = useMemo(() => groupIntoLanes(visible, tasks), [visible, tasks]);
  const hasLanes = lanes.some((lane) => lane.parent !== null);

  const labels = useMemo<ProjectLabel[]>(() => {
    const projectIds = new Set(tasks.flatMap((task) => (task.projectId ? [task.projectId] : [])));
    if (createIn.projectId) projectIds.add(createIn.projectId);
    return [...projectIds].flatMap((id) => projectsById.get(id)?.labels ?? []);
  }, [tasks, createIn.projectId, projectsById]);

  const onlyFilteredProject = filters.projects?.length === 1 ? filters.projects[0] ?? null : null;
  const createProjectId = createIn.projectId ?? onlyFilteredProject;
  /** A child always lands in its parent's project, whatever the board's create target is. */
  const createItem = useCallback(
    (parent: Task | null, status: TaskStatus, title: string) => {
      const projectId = parent ? parent.projectId : createProjectId;
      addTask({
        orgId: createIn.orgId,
        projectId,
        title,
        phase: parent?.phase || (projectId ? "Unsorted" : "Admin"),
        done: false,
        priority: "normal",
        dueDate: "",
        assigneeId: null,
        status,
        ...(parent ? { parentId: parent.id } : {}),
      });
    },
    [addTask, createIn.orgId, createProjectId],
  );
  const create = useCallback((status: TaskStatus, title: string) => createItem(null, status, title), [createItem]);

  const createLabel = (projectId: ID, name: string, color: LabelColor): ID => {
    const project = projectsById.get(projectId);
    const id = uid();
    if (!project) return id;
    updateProject(projectId, { labels: [...project.labels, { id, name, color }] });
    toast.success(`Label "${name}" created`);
    return id;
  };

  const openTask = openTaskId ? tasks.find((task) => task.id === openTaskId) : undefined;
  const isShowingLanes = isGrouped && hasLanes;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <BoardFiltersBar filters={filters} onChange={onFiltersChange} members={members} labels={labels} projects={hasProjectFilter ? projects : undefined} memberId={memberId} />
        </div>
        <button
          type="button"
          aria-pressed={isGrouped}
          onClick={() => setIsGrouped((value) => !value)}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[14px] font-medium transition-colors",
            isGrouped ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
          )}
        >
          <Rows3 size={15} aria-hidden="true" />
          Group: {isGrouped ? "Parent" : "None"}
        </button>
      </div>
      {!hydrated ? (
        <div className="flex gap-2 overflow-hidden" aria-busy="true" aria-label="Loading board">
          {Array.from({ length: SKELETON_COLUMNS }, (_, index) => (
            <div key={index} className={cn("shrink-0 rounded-md bg-sunken p-2", COLUMN_WIDTH)}>
              <ListSkeleton rows={3} />
            </div>
          ))}
        </div>
      ) : isShowingLanes ? (
        <BoardLanes lanes={lanes} allTasks={tasks} projectsById={projectsById} members={members} onMove={moveTask} onOpen={onOpenTask} onCreate={createItem} />
      ) : (
        <BoardView tasks={visible} projectsById={projectsById} members={members} onMove={moveTask} onOpen={onOpenTask} onCreate={create} />
      )}
      <TaskDetailDialog
        task={openTask}
        tasks={tasks}
        project={openTask?.projectId ? projectsById.get(openTask.projectId) : undefined}
        projects={projects}
        members={members}
        canManageLabels={user?.role === "superadmin"}
        onClose={() => onOpenTask(undefined)}
        onOpenTask={onOpenTask}
        onUpdate={updateTask}
        onCreateChild={(parent, title) => createItem(parent, "todo", title)}
        onDelete={(id) => {
          removeTask(id);
          toast.success("Work item deleted");
        }}
        onCreateLabel={createLabel}
      />
    </div>
  );
}
