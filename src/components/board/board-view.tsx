import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { bySortOrder, taskKey, type MoveRequest } from "@/lib/board";
import type { ID, Member, Project, Task, TaskStatus } from "@/lib/types";
import { BoardColumn, type ColumnCard } from "./board-column";
import { STATUS_META, STATUS_ORDER, columnDropId } from "./status-meta";
import { TaskCard } from "./task-card";

type Columns = Record<TaskStatus, ID[]>;

/** Touch drags start with a long press so a swipe still scrolls the board. */
const LONG_PRESS_MS = 250;
const TOUCH_TOLERANCE_PX = 8;
const MOUSE_DRAG_DISTANCE_PX = 5;
/** A click that lands right after a drop belongs to the drag, not to "open this card". */
const CLICK_AFTER_DROP_MS = 250;

/** Mouse and pen only; touch goes through TouchSensor's long press instead. */
class FinePointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: ReactPointerEvent) => nativeEvent.pointerType !== "touch" && nativeEvent.isPrimary && nativeEvent.button === 0,
    },
  ];
}

export interface BoardViewProps {
  tasks: readonly Task[];
  projectsById: ReadonlyMap<ID, Project>;
  members: readonly Member[];
  onMove: (id: ID, request: MoveRequest) => void;
  onOpen: (id: ID) => void;
  onCreate?: ((status: TaskStatus, title: string) => void) | undefined;
}

function groupByStatus(tasks: readonly Task[]): Columns {
  const columns = Object.fromEntries(STATUS_ORDER.map((status) => [status, [] as ID[]])) as Columns;
  for (const task of [...tasks].sort(bySortOrder)) columns[task.status].push(task.id);
  return columns;
}

const findColumn = (columns: Columns, id: ID): TaskStatus | undefined => STATUS_ORDER.find((status) => columns[status].includes(id));

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function BoardView({ tasks, projectsById, members, onMove, onOpen, onCreate }: BoardViewProps) {
  const sensors = useSensors(
    useSensor(FinePointerSensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, { activationConstraint: { delay: LONG_PRESS_MS, tolerance: TOUCH_TOLERANCE_PX } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );
  const reducedMotion = usePrefersReducedMotion();
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const grouped = useMemo(() => groupByStatus(tasks), [tasks]);
  /** While dragging, the preview layout (card moved across columns); null otherwise. */
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<TaskStatus>>(new Set());
  const [hiddenWhenEmpty, setHiddenWhenEmpty] = useState<ReadonlySet<TaskStatus>>(new Set());
  const lastDropAt = useRef(0);
  const columns = dragColumns ?? grouped;
  const today = new Date().toISOString().slice(0, 10);

  const cardFor = (task: Task): ColumnCard => {
    const project = task.projectId ? projectsById.get(task.projectId) : undefined;
    return { task, taskKey: project ? taskKey(project.key, task.number) : null, projectLabels: project?.labels ?? [] };
  };
  const describe = (id: ID | number | string): string => {
    const task = tasksById.get(String(id));
    if (!task) return "work item";
    return cardFor(task).taskKey ?? task.title;
  };
  const statusOf = (id: ID | number | string | undefined): TaskStatus | undefined => {
    if (id === undefined) return undefined;
    const key = String(id);
    return STATUS_ORDER.find((status) => columnDropId(status) === key) ?? findColumn(columns, key);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${describe(active.id)} is in ${STATUS_META[statusOf(over.id) ?? "todo"].label}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${describe(active.id)} in ${STATUS_META[statusOf(over.id) ?? "todo"].label}.` : `Dropped ${describe(active.id)}.`),
    onDragCancel: ({ active }) => `Cancelled moving ${describe(active.id)}.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragColumns(grouped);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragColumns) return;
    const id = String(active.id);
    const from = findColumn(dragColumns, id);
    const to = statusOf(over.id);
    if (!from || !to || from === to) return;
    const target = dragColumns[to];
    const overIndex = target.indexOf(String(over.id));
    const insertAt = overIndex >= 0 ? overIndex : target.length;
    setDragColumns({
      ...dragColumns,
      [from]: dragColumns[from].filter((cardId) => cardId !== id),
      [to]: [...target.slice(0, insertAt), id, ...target.slice(insertAt)],
    });
  };

  const finishDrag = () => {
    setActiveId(null);
    setDragColumns(null);
    lastDropAt.current = Date.now();
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const layout = dragColumns;
    finishDrag();
    if (!over || !layout) return;
    const id = String(active.id);
    const status = findColumn(layout, id);
    if (!status) return;
    const list = layout[status];
    const overIndex = list.indexOf(String(over.id));
    const ordered = overIndex >= 0 ? arrayMove(list, list.indexOf(id), overIndex) : list;
    const index = ordered.indexOf(id);
    onMove(id, { status, beforeId: ordered[index - 1], afterId: ordered[index + 1] });
  };

  const open = (id: ID) => {
    if (Date.now() - lastDropAt.current < CLICK_AFTER_DROP_MS) return;
    onOpen(id);
  };

  const toggle = (set: ReadonlySet<TaskStatus>, status: TaskStatus) => {
    const next = new Set(set);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    return next;
  };

  const visibleStatuses = STATUS_ORDER.filter((status) => !(hiddenWhenEmpty.has(status) && columns[status].length === 0));
  const hiddenCount = STATUS_ORDER.length - visibleStatuses.length;
  const activeTask = activeId ? tasksById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finishDrag}
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:snap-none">
        {visibleStatuses.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            cards={columns[status].flatMap((id) => {
              const task = tasksById.get(id);
              return task ? [cardFor(task)] : [];
            })}
            membersById={membersById}
            today={today}
            isCollapsed={collapsed.has(status)}
            onToggleCollapsed={() => setCollapsed((set) => toggle(set, status))}
            onHide={() => setHiddenWhenEmpty((set) => toggle(set, status))}
            onOpen={open}
            onCreate={onCreate}
          />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setHiddenWhenEmpty(new Set())}
            className="h-fit shrink-0 rounded-lg border border-dashed border-line px-3 py-2 text-[12px] text-ink-soft hover:text-ink"
          >
            Show {hiddenCount} hidden {hiddenCount === 1 ? "column" : "columns"}
          </button>
        ) : null}
      </div>
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {activeTask ? <TaskCard {...cardFor(activeTask)} membersById={membersById} today={today} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
