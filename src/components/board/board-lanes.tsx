import { ChevronDown, SquareCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { taskKey, type MoveRequest } from "@/lib/board";
import { childrenOf, type Lane } from "@/lib/hierarchy";
import { cn } from "@/lib/utils";
import type { ID, Member, Project, Task, TaskStatus } from "@/lib/types";
import { ColumnHeading } from "./board-column";
import { BoardView } from "./board-view";
import { COLUMN_GAP, COLUMN_WIDTH, STATUS_LOZENGE, STATUS_META, STATUS_ORDER } from "./status-meta";
import { Avatar } from "./task-card";

/** Collapse key of the catch-all lane (real lanes use their parent's id). */
const LOOSE_LANE = "loose";

export interface BoardLanesProps {
  lanes: readonly Lane[];
  /** Every task in scope, for the "(n subtasks)" counts. */
  allTasks: readonly Task[];
  projectsById: ReadonlyMap<ID, Project>;
  members: readonly Member[];
  onMove: (id: ID, request: MoveRequest) => void;
  onOpen: (id: ID) => void;
  /** Creates a card in a lane; the new item becomes a child of the lane's parent. */
  onCreate?: ((parent: Task | null, status: TaskStatus, title: string) => void) | undefined;
}

/**
 * Jira's "Group: Story" board: one sticky header row of columns, then a collapsible lane per
 * parent. Each lane is its own drag context, so cards move between columns but never between lanes.
 */
export function BoardLanes({ lanes, allTasks, projectsById, members, onMove, onOpen, onCreate }: BoardLanesProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const counts = useMemo(() => {
    const totals = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<TaskStatus, number>;
    for (const task of lanes.flatMap((lane) => lane.tasks)) totals[task.status] += 1;
    return totals;
  }, [lanes]);

  const toggle = (key: string) =>
    setCollapsed((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="h-[calc(100dvh-15rem)] min-h-[26rem] overflow-auto overscroll-contain pb-2">
      <div className="w-max min-w-full">
        <div className={cn("sticky top-0 z-20 flex bg-paper pb-1", COLUMN_GAP)}>
          {STATUS_ORDER.map((status) => (
            <div key={status} className={cn("flex h-10 shrink-0 items-center rounded-md bg-sunken px-3", COLUMN_WIDTH)}>
              <ColumnHeading status={status} count={counts[status]} />
            </div>
          ))}
        </div>
        {lanes.map((lane) => {
          const key = lane.parent?.id ?? LOOSE_LANE;
          const isCollapsed = collapsed.has(key);
          return (
            <section key={key} aria-label={lane.parent ? `${lane.parent.title} lane` : "Everything else"} className="pt-2">
              <LaneHeader
                lane={lane}
                allTasks={allTasks}
                projectsById={projectsById}
                membersById={membersById}
                isCollapsed={isCollapsed}
                onToggle={() => toggle(key)}
                onOpen={onOpen}
              />
              {isCollapsed ? null : (
                <BoardView
                  variant="lane"
                  tasks={lane.tasks}
                  projectsById={projectsById}
                  members={members}
                  onMove={onMove}
                  onOpen={onOpen}
                  onCreate={onCreate ? (status, title) => onCreate(lane.parent, status, title) : undefined}
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface LaneHeaderProps {
  lane: Lane;
  allTasks: readonly Task[];
  projectsById: ReadonlyMap<ID, Project>;
  membersById: ReadonlyMap<ID, Member>;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpen: (id: ID) => void;
}

function LaneHeader({ lane, allTasks, projectsById, membersById, isCollapsed, onToggle, onOpen }: LaneHeaderProps) {
  const { parent } = lane;
  const project = parent?.projectId ? projectsById.get(parent.projectId) : undefined;
  const key = parent && project ? taskKey(project.key, parent.number) : null;
  const assignee = parent?.assigneeIds[0] ? membersById.get(parent.assigneeIds[0]) : undefined;
  const count = parent ? childrenOf(parent.id, allTasks).length : lane.tasks.length;
  const noun = parent ? (count === 1 ? "subtask" : "subtasks") : count === 1 ? "work item" : "work items";

  return (
    // Sticky left so the lane title stays readable while the columns scroll sideways.
    <div className="sticky left-0 flex w-fit max-w-[min(100vw-3rem,60rem)] items-center gap-2 py-1.5 text-[14px]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${parent ? parent.title : "everything else"}`}
        className="grid size-6 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
      >
        <ChevronDown size={16} className={cn("transition-transform", isCollapsed && "-rotate-90")} />
      </button>
      {parent ? (
        <>
          <SquareCheck size={16} className="shrink-0 text-accent" aria-hidden="true" />
          <button type="button" onClick={() => onOpen(parent.id)} className="flex min-w-0 items-center gap-2 rounded-sm text-left hover:underline">
            {key ? <span className={cn("shrink-0 text-[12px] font-medium text-ink-soft", parent.status === "done" && "line-through")}>{key}</span> : null}
            <span className="truncate font-medium text-ink">{parent.title}</span>
          </button>
          <span className="shrink-0 text-[12px] text-ink-soft">
            ({count} {noun})
          </span>
          <span className={cn("shrink-0 rounded-[3px] px-1 text-[11px] font-bold uppercase leading-4", STATUS_LOZENGE[parent.status])}>
            {STATUS_META[parent.status].label}
          </span>
          {assignee ? <Avatar member={assignee} size="sm" /> : null}
        </>
      ) : (
        <>
          <span className="font-medium text-ink">Everything else</span>
          <span className="text-[12px] text-ink-soft">
            ({count} {noun})
          </span>
        </>
      )}
    </div>
  );
}
