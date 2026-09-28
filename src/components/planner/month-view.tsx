import { Panel, PanelHead } from "@/components/kit";
import { monthGrid, periodDays, type DateKey, type DayBucket } from "@/lib/daily-plan";
import { cn } from "@/lib/utils";
import { memberBuckets, PeriodStats, percent, ProgressBar, shortDay, type PlannerContext } from "./parts";

const WEEKDAY_HEADINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TITLES_PER_CELL = 3;
const DAYS_PER_WEEK = 7;

export function MonthView({ ctx }: { ctx: PlannerContext }) {
  const monthDays = periodDays("month", ctx.anchor);
  const grid = monthGrid(ctx.anchor);
  const buckets = memberBuckets(ctx, grid);
  const monthPrefix = ctx.anchor.slice(0, 7);
  const weeks = Array.from({ length: grid.length / DAYS_PER_WEEK }, (_, i) =>
    grid.slice(i * DAYS_PER_WEEK, (i + 1) * DAYS_PER_WEEK),
  );

  return (
    <>
      <PeriodStats ctx={ctx} days={monthDays} buckets={buckets} />

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line/40">
            {WEEKDAY_HEADINGS.map((heading) => (
              <div key={heading} className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {heading}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day) => (
              <DayCell
                key={day}
                day={day}
                bucket={buckets[day] ?? { open: [], done: [] }}
                isInMonth={day.startsWith(monthPrefix)}
                isToday={day === ctx.today}
                onOpen={() => ctx.open("day", day)}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Weekly breakdown" />
          <div className="space-y-1 p-2">
            {weeks.map((week) => (
              <WeekSummaryRow
                key={week[0]}
                week={week}
                buckets={buckets}
                monthPrefix={monthPrefix}
                onOpen={() => ctx.open("week", week[0] ?? ctx.anchor)}
              />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function DayCell({
  day,
  bucket,
  isInMonth,
  isToday,
  onOpen,
}: {
  day: DateKey;
  bucket: DayBucket;
  isInMonth: boolean;
  isToday: boolean;
  onOpen: () => void;
}) {
  const tasks = [...bucket.open, ...bucket.done];
  const hidden = tasks.length - TITLES_PER_CELL;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${shortDay(day)}: ${bucket.done.length} of ${tasks.length} done`}
      className={cn(
        "flex min-h-16 flex-col gap-1 border-b border-r border-line/30 p-1.5 text-left transition-colors hover:bg-accent/5 sm:min-h-28",
        !isInMonth && "bg-ink/[0.02] text-ink-soft/60",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-[11.5px]",
            isToday && "bg-accent font-semibold text-paper",
          )}
        >
          {Number(day.slice(8))}
        </span>
        {tasks.length > 0 ? (
          <span
            className={cn(
              "rounded px-1 font-mono text-[9px]",
              bucket.open.length === 0 ? "bg-verd/15 text-verd" : "bg-accent/10 text-accent",
            )}
          >
            {bucket.done.length}/{tasks.length}
          </span>
        ) : null}
      </div>
      <div className="hidden space-y-0.5 sm:block">
        {tasks.slice(0, TITLES_PER_CELL).map((task) => (
          <div
            key={task.id}
            className={cn(
              "truncate rounded px-1 text-[10.5px] leading-4",
              task.done ? "text-ink-soft line-through" : "bg-accent/10 text-ink",
              task.priority === "high" && !task.done && "bg-rose/15",
            )}
          >
            {task.title}
          </div>
        ))}
        {hidden > 0 ? <div className="px-1 font-mono text-[9.5px] text-ink-soft">+{hidden} more</div> : null}
      </div>
    </button>
  );
}

function WeekSummaryRow({
  week,
  buckets,
  monthPrefix,
  onOpen,
}: {
  week: DateKey[];
  buckets: Record<DateKey, DayBucket>;
  monthPrefix: string;
  onOpen: () => void;
}) {
  const inMonth = week.filter((day) => day.startsWith(monthPrefix));
  const done = inMonth.reduce((sum, day) => sum + (buckets[day]?.done.length ?? 0), 0);
  const total = inMonth.reduce((sum, day) => sum + (buckets[day]?.open.length ?? 0), 0) + done;
  const first = inMonth[0] ?? week[0] ?? "";
  const last = inMonth.at(-1) ?? first;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent/5"
      title="Open this week"
    >
      <span className="w-28 shrink-0 text-[12px] font-medium">
        {shortDay(first)} – {shortDay(last)}
      </span>
      <ProgressBar value={percent(done, total)} />
      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-ink-soft">
        {done}/{total}
      </span>
    </button>
  );
}
