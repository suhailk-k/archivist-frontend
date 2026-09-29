import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, SquareCheck } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { ID, Member, Priority, ProjectLabel, Task } from "@/lib/types";
import { LABEL_BORDER, PRIORITY_LABEL, avatarTone, initials, shortDate } from "./status-meta";

const MAX_AVATARS = 2;
const MAX_LABEL_CHIPS = 3;
const labelChip = "inline-flex h-[22px] max-w-full items-center rounded-[4px] border bg-panel px-1.5 text-[12px] leading-none text-ink";

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
  const labels = task.labels.flatMap((id) => projectLabels.filter((label) => label.id === id));
  const assignees = task.assigneeIds.flatMap((id) => {
    const member = membersById.get(id);
    return member ? [member] : [];
  });
  const isClosed = task.status === "done" || task.status === "cancelled";
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
        "block w-full touch-manipulation select-none rounded-lg border border-line bg-panel px-3 pb-2.5 pt-3 text-left outline-none transition-colors hover:bg-[color-mix(in_oklab,var(--panel)_94%,var(--ink))] focus-visible:ring-2 focus-visible:ring-accent/50",
        isOverlay && "cursor-grabbing shadow-xl shadow-ink/15 ring-1 ring-accent/25",
        className,
      )}
    >
      <div className={cn("line-clamp-3 text-[14px] leading-[1.4] text-ink", task.status === "cancelled" && "text-ink-soft line-through")}>
        {task.title}
      </div>

      {labels.length > 0 || task.dueDate ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <LabelChips labels={labels} />
          {task.dueDate ? <DueChip date={task.dueDate} isOverdue={!isClosed && task.dueDate < today} /> : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-1.5">
        <SquareCheck size={16} className="shrink-0 text-accent" aria-hidden="true" />
        {taskKey ? (
          <span className={cn("font-mono text-[12px] font-medium text-ink-soft", task.status === "done" && "line-through")}>{taskKey}</span>
        ) : (
          <span className="text-[12px] text-ink-soft">No project</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <PriorityIcon priority={task.priority} />
          <Avatars members={assignees} />
        </span>
      </div>
    </button>
  );
}

const AVATAR_SIZE = { sm: "size-5 text-[11px]", md: "size-6 text-[11px]", lg: "size-8 text-[12px]" } as const;

export function Avatar({ member, size = "md", className }: { member: Member; size?: keyof typeof AVATAR_SIZE; className?: string }) {
  return (
    <span
      title={member.name}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold leading-none text-paper ring-2 ring-panel",
        avatarTone(member.id),
        AVATAR_SIZE[size],
        className,
      )}
    >
      {initials(member.name)}
    </span>
  );
}

function Avatars({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return <span className="size-6 rounded-full border border-dashed border-ink-soft/50" title="Unassigned" aria-label="Unassigned" />;
  }
  const shown = members.slice(0, MAX_AVATARS);
  const extra = members.length - shown.length;
  return (
    <span className="flex items-center" title={members.map((m) => m.name).join(", ")}>
      {shown.map((member, index) => (
        <span key={member.id} className={cn(index > 0 && "-ml-1.5")}>
          <Avatar member={member} />
        </span>
      ))}
      {extra > 0 ? (
        <span className="-ml-1.5 grid size-6 place-items-center rounded-full bg-line text-[11px] font-medium leading-none text-ink ring-2 ring-panel">+{extra}</span>
      ) : null}
    </span>
  );
}

function LabelChips({ labels }: { labels: ProjectLabel[] }) {
  if (labels.length === 0) return null;
  const shown = labels.slice(0, MAX_LABEL_CHIPS);
  const extra = labels.length - shown.length;
  return (
    <>
      {shown.map((label) => (
        <span key={label.id} className={cn(labelChip, LABEL_BORDER[label.color])}>
          <span className="truncate">{label.name}</span>
        </span>
      ))}
      {extra > 0 ? (
        <span className={cn(labelChip, "border-line text-ink-soft")} title={labels.slice(MAX_LABEL_CHIPS).map((l) => l.name).join(", ")}>
          +{extra}
        </span>
      ) : null}
    </>
  );
}

function DueChip({ date, isOverdue }: { date: string; isOverdue: boolean }) {
  return (
    <span
      className={cn(labelChip, "gap-1 border-line text-ink-soft", isOverdue && "border-rose/50 bg-rose/[0.06] text-rose")}
      title={isOverdue ? "Overdue" : "Due date"}
    >
      <Calendar size={12} aria-hidden="true" />
      {shortDate(date)}
    </span>
  );
}

const FILLED_BARS: Record<Exclude<Priority, "urgent">, number> = { none: 0, low: 1, normal: 2, high: 3 };
const BAR_HEIGHTS = ["h-1", "h-[7px]", "h-2.5"];

/** Signal bars for none…high; urgent is a red "!" square. */
export function PriorityIcon({ priority }: { priority: Priority }) {
  const label = `Priority: ${PRIORITY_LABEL[priority]}`;
  if (priority === "urgent") {
    return (
      <span title={label} aria-label={label} className="grid size-4 place-items-center rounded-[3px] bg-rose text-[11px] font-bold leading-none text-paper">
        !
      </span>
    );
  }
  const filled = FILLED_BARS[priority];
  const fill = priority === "high" ? "bg-amber" : "bg-ink-soft";
  return (
    <span title={label} aria-label={label} className="flex h-2.5 items-end gap-[2px] px-0.5">
      {BAR_HEIGHTS.map((height, index) => (
        <span key={height} className={cn("w-[3px] rounded-[1px]", height, index < filled ? fill : "bg-line")} />
      ))}
    </span>
  );
}
