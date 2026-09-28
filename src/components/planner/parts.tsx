import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/app-shell";
import { SelectInput, TextInput } from "@/components/forms";
import { Pill, Stat } from "@/components/kit";
import {
  buildDailyPlan,
  shiftDateKey,
  tasksByDay,
  type DateKey,
  type DayBucket,
  type MemberDaySummary,
  type PlannerView,
} from "@/lib/daily-plan";
import type { ID, Member, NewTask, Priority, Project, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Everything a planner view needs about who and when it is planning for. */
export interface PlannerContext {
  orgId: ID;
  member: Member;
  tasks: Task[];
  projects: Project[];
  anchor: DateKey;
  today: DateKey;
  addTask: (input: NewTask) => void;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  /** Jump the planner to another view anchored on `day`. */
  open: (view: PlannerView, day: DateKey) => void;
}

export type TaskDraft = Pick<Task, "title" | "projectId" | "phase" | "priority">;

export function dayLabel(day: DateKey, today: DateKey) {
  if (day === today) return "Today";
  if (day === shiftDateKey(today, 1)) return "Tomorrow";
  if (day === shiftDateKey(today, -1)) return "Yesterday";
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

export function shortDay(day: DateKey) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export function percent(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function firstName(member: Member) {
  return member.name.split(" ")[0] ?? member.name;
}

/** Adds a task for the planner's member on `day`. */
export function planNewTask(ctx: PlannerContext, draft: TaskDraft, day: DateKey) {
  ctx.addTask({ ...draft, orgId: ctx.orgId, done: false, dueDate: "", assigneeId: ctx.member.id, plannedFor: day });
}

export function draftFromTitle(title: string): TaskDraft {
  return { title, projectId: null, phase: "Admin", priority: "normal" };
}

export function projectNameOf(projects: Project[]) {
  return (task: Task) => projects.find((p) => p.id === task.projectId)?.name;
}

export function TeamStrip({
  members,
  summary,
  selectedId,
  onSelect,
}: {
  members: Member[];
  summary: MemberDaySummary[];
  selectedId: ID;
  onSelect: (id: ID) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Team member">
      {members.map((m) => {
        const stats = summary.find((s) => s.memberId === m.id) ?? { total: 0, done: 0 };
        const isSelected = m.id === selectedId;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex min-w-40 shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
              isSelected ? "border-accent bg-accent/10" : "border-line bg-panel/70 hover:border-accent/40",
            )}
          >
            <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
              {m.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">{m.name}</span>
              <span className="mt-1 flex items-center gap-1.5">
                <ProgressBar value={percent(stats.done, stats.total)} />
                <span className="font-mono text-[9.5px] text-ink-soft">
                  {stats.done}/{stats.total}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <span className="block h-1 flex-1 overflow-hidden rounded-full bg-line/50">
      <span className="block h-full rounded-full bg-verd transition-all" style={{ width: `${value}%` }} />
    </span>
  );
}

export function QuickAdd({
  projects,
  placeholder,
  onAdd,
}: {
  projects: Project[];
  placeholder: string;
  onAdd: (draft: TaskDraft) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");

  const submit = () => {
    if (!title.trim()) {
      toast.error("Write the task first");
      return;
    }
    onAdd({ title: title.trim(), projectId: projectId || null, phase: projectId ? "Unsorted" : "Admin", priority });
    setTitle("");
    setPriority("normal");
  };

  return (
    <div className="grid gap-2 p-3 md:grid-cols-[1fr_auto_auto_auto]">
      <TextInput
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
      />
      <SelectInput value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectInput>
      <SelectInput value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
      </SelectInput>
      <PrimaryButton onClick={submit}>Add</PrimaryButton>
    </div>
  );
}

export function TaskList({ children }: { children: ReactNode }) {
  return <div className="space-y-0.5 p-2">{children}</div>;
}

export function RowAction({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-md px-1.5 py-1 font-mono text-[10px] text-ink-soft hover:bg-accent/10 hover:text-accent"
    >
      {children}
    </button>
  );
}

export function TaskCheckbox({ task, onToggle }: { task: Task; onToggle: PlannerContext["updateTask"] }) {
  return (
    <input
      type="checkbox"
      aria-label={`Mark ${task.title} ${task.done ? "open" : "done"}`}
      checked={task.done}
      onChange={(e) => onToggle(task.id, { done: e.target.checked })}
      className="size-4 shrink-0 accent-[oklch(0.535_0.193_266)]"
    />
  );
}

interface TaskRowProps {
  task: Task;
  project: string | undefined;
  today: DateKey;
  onToggle: PlannerContext["updateTask"];
  /** Show the planned day — useful where it differs from the day being viewed. */
  showSchedule?: boolean;
  children?: ReactNode;
}

export function TaskRow({ task, project, today, onToggle, showSchedule = false, children }: TaskRowProps) {
  const isOverdue = !task.done && task.dueDate !== "" && task.dueDate < today;
  const plannedLabel = showSchedule && task.plannedFor ? `planned ${task.plannedFor}` : "";
  const hasMeta = Boolean(project || task.dueDate || plannedLabel);
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-ink/[0.035]">
      <TaskCheckbox task={task} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[13px]", task.done && "text-ink-soft line-through")}>{task.title}</div>
        {hasMeta ? (
          <div className="mt-0.5 flex gap-2 font-mono text-[9.5px] text-ink-soft">
            {project ? <span className="truncate">{project}</span> : null}
            {task.dueDate ? <span className={cn(isOverdue && "text-rose")}>due {task.dueDate}</span> : null}
            {plannedLabel ? <span>{plannedLabel}</span> : null}
          </div>
        ) : null}
      </div>
      {task.priority === "high" ? <Pill tone="rose">high</Pill> : null}
      {children ? <div className="flex shrink-0 items-center gap-0.5">{children}</div> : null}
    </div>
  );
}

/** Open/done totals for the member across `days`, plus work overdue as of today. */
export function PeriodStats({ ctx, days, buckets }: { ctx: PlannerContext; days: DateKey[]; buckets: Record<DateKey, DayBucket> }) {
  const open = days.reduce((sum, day) => sum + (buckets[day]?.open.length ?? 0), 0);
  const done = days.reduce((sum, day) => sum + (buckets[day]?.done.length ?? 0), 0);
  const overdue = buildDailyPlan(ctx.tasks, { memberId: ctx.member.id, day: ctx.today, today: ctx.today }).carriedOver.length;
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Planned" value={open + done} note={`${open} open`} />
      <Stat label="Done" value={done} tone="verd" note={`${percent(done, open + done)}%`} />
      <Stat label="Overdue" value={overdue} tone="rose" note="as of today" />
      <Stat label="Busiest day" value={busiestDayLabel(days, buckets)} />
    </div>
  );
}

function busiestDayLabel(days: DateKey[], buckets: Record<DateKey, DayBucket>) {
  const load = (day: DateKey) => (buckets[day]?.open.length ?? 0) + (buckets[day]?.done.length ?? 0);
  const busiest = days.reduce<DateKey | null>((best, day) => (load(day) > (best ? load(best) : 0) ? day : best), null);
  return busiest ? shortDay(busiest) : "—";
}

export function memberBuckets(ctx: PlannerContext, days: DateKey[]) {
  return tasksByDay(ctx.tasks, ctx.member.id, days);
}
