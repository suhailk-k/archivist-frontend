import type { ID, Priority, Task } from "./types";

/** A calendar day in the viewer's local time zone, formatted YYYY-MM-DD. */
export type DateKey = string;

export interface DailyPlan {
  /** Open work scheduled for (or due on) the day. */
  planned: Task[];
  /** Open work from earlier days that never got finished. Only populated when viewing today. */
  carriedOver: Task[];
  /** Work finished on the day. */
  done: Task[];
  /** Open work with no day yet, or scheduled after the day — candidates to pull in. */
  backlog: Task[];
}

export interface DailyPlanQuery {
  memberId: ID;
  day: DateKey;
  today: DateKey;
}

export interface MemberDaySummary {
  memberId: ID;
  total: number;
  done: number;
}

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3, none: 4 };
const NO_DATE = "9999-12-31";

const pad = (value: number) => String(value).padStart(2, "0");

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function shiftDateKey(key: DateKey, days: number): DateKey {
  const date = parseKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** The day a task is meant to be worked on: its planned day, else its deadline. */
export function scheduledDay(task: Task): DateKey {
  return task.plannedFor || task.dueDate;
}

function completedDay(task: Task): DateKey {
  if (task.completedAt) return toDateKey(new Date(task.completedAt));
  return scheduledDay(task);
}

const byPriorityThenDate = (a: Task, b: Task) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  (scheduledDay(a) || NO_DATE).localeCompare(scheduledDay(b) || NO_DATE) ||
  a.createdAt.localeCompare(b.createdAt);

const byLatestCompletion = (a: Task, b: Task) => (b.completedAt || "").localeCompare(a.completedAt || "");

const byOldestDay = (a: Task, b: Task) =>
  scheduledDay(a).localeCompare(scheduledDay(b)) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

export function buildDailyPlan(tasks: readonly Task[], { memberId, day, today }: DailyPlanQuery): DailyPlan {
  const mine = tasks.filter((task) => task.assigneeId === memberId);
  const open = mine.filter((task) => !task.done);
  const isViewingToday = day === today;

  return {
    planned: open.filter((task) => scheduledDay(task) === day).sort(byPriorityThenDate),
    carriedOver: isViewingToday
      ? open.filter((task) => scheduledDay(task) !== "" && scheduledDay(task) < day).sort(byOldestDay)
      : [],
    done: mine.filter((task) => task.done && completedDay(task) === day).sort(byLatestCompletion),
    backlog: open.filter((task) => scheduledDay(task) === "" || scheduledDay(task) > day).sort(byPriorityThenDate),
  };
}

export type PlannerView = "day" | "week" | "month";

export interface DayBucket {
  open: Task[];
  done: Task[];
}

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;

function parseKey(key: DateKey): Date {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DateKey): DateKey {
  const date = parseKey(key);
  const daysSinceMonday = (date.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  return shiftDateKey(key, -daysSinceMonday);
}

function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

function daysInMonth(key: DateKey): number {
  const date = parseKey(key);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function range(start: DateKey, count: number): DateKey[] {
  return Array.from({ length: count }, (_, offset) => shiftDateKey(start, offset));
}

/** Every day from `start` to `end` inclusive; empty when `start` is after `end`. */
export function dateRange(start: DateKey, end: DateKey): DateKey[] {
  if (start > end) return [];
  const count = Math.round((parseKey(end).getTime() - parseKey(start).getTime()) / MS_PER_DAY) + 1;
  return range(start, count);
}

/** Every calendar day in the period containing `key`. */
export function periodDays(view: PlannerView, key: DateKey): DateKey[] {
  if (view === "day") return [key];
  if (view === "week") return range(startOfWeek(key), DAYS_PER_WEEK);
  return range(startOfMonth(key), daysInMonth(key));
}

/** The month padded out to whole Monday-first weeks, for a calendar grid. */
export function monthGrid(key: DateKey): DateKey[] {
  const first = startOfMonth(key);
  const last = shiftDateKey(first, daysInMonth(key) - 1);
  const gridStart = startOfWeek(first);
  return dateRange(gridStart, shiftDateKey(startOfWeek(last), DAYS_PER_WEEK - 1));
}

/** Moves the anchor by whole periods. Months land on the 1st so short months never skip. */
export function shiftPeriod(view: PlannerView, key: DateKey, steps: number): DateKey {
  if (view === "day") return shiftDateKey(key, steps);
  if (view === "week") return shiftDateKey(key, steps * DAYS_PER_WEEK);
  const date = parseKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + steps, 1));
}

/** A member's open work keyed by scheduled day and finished work keyed by completion day. */
export function tasksByDay(tasks: readonly Task[], memberId: ID, days: readonly DateKey[]): Record<DateKey, DayBucket> {
  const buckets: Record<DateKey, DayBucket> = Object.fromEntries(days.map((day) => [day, { open: [], done: [] }]));
  const mine = tasks.filter((task) => task.assigneeId === memberId);
  const open = mine.filter((task) => !task.done).sort(byPriorityThenDate);
  const done = mine.filter((task) => task.done).sort(byLatestCompletion);
  open.forEach((task) => buckets[scheduledDay(task)]?.open.push(task));
  done.forEach((task) => buckets[completedDay(task)]?.done.push(task));
  return buckets;
}

export function summarizeTeamRange(
  tasks: readonly Task[],
  memberIds: readonly ID[],
  days: readonly DateKey[],
): MemberDaySummary[] {
  return memberIds.map((memberId) => {
    const buckets = Object.values(tasksByDay(tasks, memberId, days));
    const open = buckets.reduce((sum, bucket) => sum + bucket.open.length, 0);
    const done = buckets.reduce((sum, bucket) => sum + bucket.done.length, 0);
    return { memberId, total: open + done, done };
  });
}
