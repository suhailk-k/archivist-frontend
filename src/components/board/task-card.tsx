import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { ID, Member, Priority, ProjectLabel, Task } from "@/lib/types";
import { LABEL_DOT, PRIORITY_LABEL, STATUS_META, initials, shortDate } from "./status-meta";

const MAX_AVATARS = 3;
const MAX_LABEL_CHIPS = 2;
const chip = "inline-flex h-6 items-center gap-1 rounded-md border border-line bg-panel px-1.5 text-[11px] leading-none text-ink-soft";

export interface TaskCardProps {
  task: Task;
  /** e.g. "ELC-23"; null for tasks outside a project. */
  taskKey: string | null;
  /** The labels defined on the task's project. */
  projectLabels: readonly ProjectLabel[];
  membersById: ReadonlyMap<ID, Member>;
  today: string;
  onOpen?: (id: ID) => void;
}

export function SortableTaskCard(props: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: { type: "task" },
  });
  return (
    <TaskCard
      {...props}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
      dragProps={{ ...attributes, ...listeners }}
    />
  );
}

interface TaskCardViewProps extends TaskCardProps {
  ref?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  className?: string | undefined;
  dragProps?: Record<string, unknown>;
  isOverlay?: boolean;
}

/** Space is reserved for picking the card up with the keyboard, so it must not also click it. */
const suppressSpaceClick = (event: KeyboardEvent) => {
  if (event.key === " ") event.preventDefault();
};

export function TaskCard({ task, taskKey, projectLabels, membersById, today, onOpen, ref, style, className, dragProps, isOverlay }: TaskCardViewProps) {
  const status = STATUS_META[task.status];
  const StatusIcon = status.icon;
  const labels = task.labels.flatMap((id) => projectLabels.filter((label) => label.id === id));
  const assignees = task.assigneeIds.flatMap((id) => {
    const member = membersById.get(id);
    return member ? [member] : [];
  });
  return (
    <button
      type="button"
      ref={ref}
      style={style}
      {...dragProps}
      aria-label={taskKey ? `${taskKey} ${task.title}` : task.title}
      onClick={() => onOpen?.(task.id)}
      onKeyUp={suppressSpaceClick}
      className={cn(
        "block w-full touch-manipulation select-none rounded-[10px] border border-line bg-panel p-3 text-left shadow-sm shadow-ink/5 outline-none transition-[border-color,box-shadow] hover:border-ink-soft/40 focus-visible:ring-2 focus-visible:ring-accent/40",
        isOverlay && "cursor-grabbing shadow-xl shadow-ink/15 ring-1 ring-accent/20",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-soft">
        <StatusIcon size={13} className={status.tone} aria-hidden="true" />
        {taskKey ? <span>{taskKey}</span> : null}
      </div>
      <div className={cn("mt-1.5 line-clamp-2 text-[14px] leading-snug text-ink", task.status === "cancelled" && "text-ink-soft line-through")}>
        {task.title}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Avatars members={assignees} />
        <LabelChips labels={labels} />
        {task.dueDate ? <DueChip date={task.dueDate} isOverdue={!task.done && task.dueDate < today} /> : null}
        <PriorityChip priority={task.priority} />
      </div>
    </button>
  );
}

function Avatars({ members }: { members: Member[] }) {
  if (members.length === 0) return null;
  const shown = members.slice(0, MAX_AVATARS);
  const extra = members.length - shown.length;
  return (
    <span className="flex items-center pr-0.5" title={members.map((m) => m.name).join(", ")}>
      {shown.map((member, index) => (
        <span
          key={member.id}
          className={cn(
            "grid size-[22px] place-items-center rounded-full bg-accent-soft text-[11px] font-medium leading-none text-accent ring-2 ring-panel",
            index > 0 && "-ml-1.5",
          )}
        >
          {initials(member.name)}
        </span>
      ))}
      {extra > 0 ? (
        <span className="-ml-1.5 grid size-[22px] place-items-center rounded-full bg-line text-[11px] leading-none text-ink ring-2 ring-panel">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

function LabelChips({ labels }: { labels: ProjectLabel[] }) {
  if (labels.length === 0) return null;
  if (labels.length > MAX_LABEL_CHIPS) {
    return (
      <span className={chip} title={labels.map((label) => label.name).join(", ")}>
        <span className="flex -space-x-0.5">
          {labels.slice(0, 3).map((label) => (
            <span key={label.id} className={cn("size-2 rounded-full ring-1 ring-panel", LABEL_DOT[label.color])} />
          ))}
        </span>
        {labels.length} labels
      </span>
    );
  }
  return labels.map((label) => (
    <span key={label.id} className={chip}>
      <span className={cn("size-2 rounded-full", LABEL_DOT[label.color])} />
      <span className="max-w-24 truncate">{label.name}</span>
    </span>
  ));
}

function DueChip({ date, isOverdue }: { date: string; isOverdue: boolean }) {
  return (
    <span className={cn(chip, isOverdue && "border-rose/40 text-rose")} title={isOverdue ? "Overdue" : "Due date"}>
      <Calendar size={12} aria-hidden="true" />
      {shortDate(date)}
    </span>
  );
}

const FILLED_BARS: Record<Exclude<Priority, "urgent">, number> = { none: 0, low: 1, normal: 2, high: 3 };
const BAR_HEIGHTS = ["h-1", "h-[7px]", "h-2.5"];

export function PriorityChip({ priority }: { priority: Priority }) {
  const label = `Priority: ${PRIORITY_LABEL[priority]}`;
  if (priority === "urgent") {
    return (
      <span className={cn(chip, "px-1")} title={label} aria-label={label}>
        <span className="grid size-4 place-items-center rounded-[4px] border border-rose bg-rose/10 text-[11px] font-bold leading-none text-rose">!</span>
      </span>
    );
  }
  const filled = FILLED_BARS[priority];
  const fill = priority === "high" ? "bg-amber" : "bg-ink-soft";
  return (
    <span className={cn(chip, "px-1.5")} title={label} aria-label={label}>
      <span className="flex h-2.5 items-end gap-[2px]">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={height}
            className={cn("w-[3px] rounded-[1px]", height, index < filled ? fill : priority === "none" ? "border border-line" : "bg-line")}
          />
        ))}
      </span>
    </span>
  );
}
