import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton } from "@/components/app-shell";
import { Empty, Panel, PanelHead } from "@/components/kit";
import { buildDailyPlan, periodDays, shiftDateKey, type DateKey, type DayBucket } from "@/lib/daily-plan";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  draftFromTitle,
  firstName,
  memberBuckets,
  PeriodStats,
  percent,
  planNewTask,
  ProgressBar,
  projectNameOf,
  shortDay,
  TaskCheckbox,
  TaskList,
  TaskRow,
  type PlannerContext,
} from "./parts";

const BACKLOG_PREVIEW_LIMIT = 12;

export function WeekView({ ctx }: { ctx: PlannerContext }) {
  const { member, tasks, projects, today, updateTask } = ctx;
  const days = periodDays("week", ctx.anchor);
  const weekStart = days[0] ?? ctx.anchor;
  const weekEnd = days.at(-1) ?? ctx.anchor;
  const buckets = memberBuckets(ctx, days);
  const includesToday = days.includes(today);
  const carriedOver = includesToday
    ? buildDailyPlan(tasks, { memberId: member.id, day: today, today }).carriedOver
    : [];
  const backlog = buildDailyPlan(tasks, { memberId: member.id, day: weekEnd, today }).backlog;
  const projectName = projectNameOf(projects);

  const moveCarriedOver = () => {
    carriedOver.forEach((task) => updateTask(task.id, { plannedFor: today }));
    toast.success(`${carriedOver.length} moved to today`);
  };

  return (
    <>
      <PeriodStats ctx={ctx} days={days} buckets={buckets} />

      {carriedOver.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-[12.5px]">
          <span>
            {carriedOver.length} unfinished task{carriedOver.length === 1 ? "" : "s"} from before today.
          </span>
          <span className="ml-auto">
            <GhostButton onClick={moveCarriedOver}>Move all to today</GhostButton>
          </span>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => (
          <DayColumn key={day} ctx={ctx} day={day} bucket={buckets[day] ?? { open: [], done: [] }} />
        ))}
      </div>

      <Panel className="mt-3">
        <PanelHead
          title="Schedule the backlog"
          meta={`${firstName(member)}'s unscheduled work · week of ${shortDay(weekStart)}`}
        />
        <TaskList>
          {backlog.length === 0 ? <Empty text="Nothing waiting to be scheduled" /> : null}
          {backlog.slice(0, BACKLOG_PREVIEW_LIMIT).map((task) => (
            <TaskRow key={task.id} task={task} project={projectName(task)} today={today} onToggle={updateTask} showSchedule>
              <DayPicker days={days} onPick={(day) => updateTask(task.id, { plannedFor: day })} />
            </TaskRow>
          ))}
        </TaskList>
      </Panel>
    </>
  );
}

function DayColumn({ ctx, day, bucket }: { ctx: PlannerContext; day: DateKey; bucket: DayBucket }) {
  const total = bucket.open.length + bucket.done.length;
  const isToday = day === ctx.today;
  const isPast = day < ctx.today;
  return (
    <section
      className={cn(
        "flex min-h-56 flex-col rounded-xl border bg-panel/80",
        isToday ? "border-accent ring-1 ring-accent/30" : "border-line/60",
      )}
    >
      <button
        type="button"
        onClick={() => ctx.open("day", day)}
        className="border-b border-line/40 px-3 py-2 text-left hover:bg-accent/5"
        title="Open this day"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("text-[12.5px] font-semibold", isToday && "text-accent", isPast && !isToday && "text-ink-soft")}>
            {shortDay(day)}
          </span>
          <span className="font-mono text-[11px] text-ink-soft">
            {bucket.done.length}/{total}
          </span>
        </div>
        <span className="mt-1.5 flex">
          <ProgressBar value={percent(bucket.done.length, total)} />
        </span>
      </button>

      <div className="flex-1 space-y-0.5 p-1.5">
        {bucket.open.map((task) => (
          <MiniTask key={task.id} task={task} ctx={ctx} day={day} />
        ))}
        {bucket.done.map((task) => (
          <MiniTask key={task.id} task={task} ctx={ctx} day={day} />
        ))}
      </div>

      <InlineAdd onAdd={(title) => planNewTask(ctx, draftFromTitle(title), day)} />
    </section>
  );
}

function MiniTask({ task, ctx, day }: { task: Task; ctx: PlannerContext; day: DateKey }) {
  const move = (steps: number) => ctx.updateTask(task.id, { plannedFor: shiftDateKey(day, steps) });
  const moveButton = "grid size-5 place-items-center rounded text-ink-soft hover:bg-accent/10 hover:text-accent";
  return (
    <div className="group flex items-start gap-1.5 rounded-md px-1.5 py-1 hover:bg-ink/[0.035]">
      <span className="pt-0.5">
        <TaskCheckbox task={task} onToggle={ctx.updateTask} />
      </span>
      <span
        className={cn(
          "line-clamp-2 min-w-0 flex-1 text-[12px] leading-snug",
          task.done && "text-ink-soft line-through",
          task.priority === "high" && !task.done && "font-medium text-rose",
        )}
      >
        {task.title}
      </span>
      {task.done ? null : (
        <span className="flex shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button type="button" aria-label={`Move ${task.title} a day earlier`} className={moveButton} onClick={() => move(-1)}>
            <ChevronLeft size={12} />
          </button>
          <button type="button" aria-label={`Move ${task.title} a day later`} className={moveButton} onClick={() => move(1)}>
            <ChevronRight size={12} />
          </button>
        </span>
      )}
    </div>
  );
}

function InlineAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || !title.trim()) return;
        onAdd(title.trim());
        setTitle("");
      }}
      placeholder="+ Add task"
      aria-label="Add a task to this day"
      className="m-1.5 mt-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[12px] outline-none placeholder:text-ink-soft/70 hover:border-line focus:border-accent/50 focus:bg-panel"
    />
  );
}

function DayPicker({ days, onPick }: { days: DateKey[]; onPick: (day: DateKey) => void }) {
  return (
    <select
      aria-label="Plan on day"
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="rounded-md border border-line bg-panel px-1.5 py-1 font-mono text-[11px] text-ink-soft"
    >
      <option value="">Plan on…</option>
      {days.map((day) => (
        <option key={day} value={day}>
          {shortDay(day)}
        </option>
      ))}
    </select>
  );
}
