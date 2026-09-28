import { TaskBoard } from "@/components/board/task-board";
import type { BoardFilters } from "@/lib/board";
import type { ID, Member, Project, Task } from "@/lib/types";

export interface BoardTabProps {
  project: Project;
  /** The org's projects (the board only shows this project's tasks). */
  projects: readonly Project[];
  tasks: readonly Task[];
  members: readonly Member[];
  filters: BoardFilters;
  onFiltersChange: (next: BoardFilters) => void;
  openTaskId: ID | undefined;
  onOpenTask: (id: ID | undefined) => void;
}

/** The project's work items as a Plane-style board. */
export function BoardTab({ project, projects, tasks, members, filters, onFiltersChange, openTaskId, onOpenTask }: BoardTabProps) {
  return (
    <div className="mt-4">
      <TaskBoard
        tasks={tasks}
        projects={projects}
        members={members}
        filters={filters}
        onFiltersChange={onFiltersChange}
        openTaskId={openTaskId}
        onOpenTask={onOpenTask}
        createIn={{ orgId: project.orgId, projectId: project.id }}
      />
    </div>
  );
}
