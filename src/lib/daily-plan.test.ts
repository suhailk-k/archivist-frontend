import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyPlan,
  dateRange,
  monthGrid,
  periodDays,
  shiftDateKey,
  shiftPeriod,
  startOfWeek,
  summarizeTeamRange,
  tasksByDay,
  toDateKey,
} from "./daily-plan.ts";
import type { Task } from "./types.ts";

const task = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "t",
  orgId: "o",
  projectId: null,
  title: overrides.id ?? "t",
  phase: "Admin",
  done: false,
  priority: "normal",
  dueDate: "",
  assigneeId: "ana",
  plannedFor: "",
  completedAt: "",
  createdAt: "2026-09-01T09:00:00.000Z",
  ...overrides,
});

const ids = (list: Task[]) => list.map((t) => t.id);

test("formats and shifts local date keys", () => {
  assert.equal(toDateKey(new Date(2026, 8, 3)), "2026-09-03");
  assert.equal(shiftDateKey("2026-09-30", 1), "2026-10-01");
  assert.equal(shiftDateKey("2026-03-01", -1), "2026-02-28");
});

test("plans tasks scheduled for the day or due that day, high priority first", () => {
  const tasks = [
    task({ id: "planned", plannedFor: "2026-09-23" }),
    task({ id: "due", dueDate: "2026-09-23", priority: "high" }),
    task({ id: "rescheduled", plannedFor: "2026-09-25", dueDate: "2026-09-23" }),
    task({ id: "other-person", plannedFor: "2026-09-23", assigneeId: "ben" }),
  ];

  const plan = buildDailyPlan(tasks, { memberId: "ana", day: "2026-09-23", today: "2026-09-23" });

  assert.deepEqual(ids(plan.planned), ["due", "planned"]);
  assert.deepEqual(ids(plan.backlog), ["rescheduled"]);
});

test("carries over unfinished work from earlier days only when viewing today", () => {
  const tasks = [
    task({ id: "yesterday", plannedFor: "2026-09-22" }),
    task({ id: "overdue", dueDate: "2026-09-20" }),
    task({ id: "finished", plannedFor: "2026-09-22", done: true, completedAt: "2026-09-22T10:00:00.000Z" }),
  ];

  const today = buildDailyPlan(tasks, { memberId: "ana", day: "2026-09-23", today: "2026-09-23" });
  const tomorrow = buildDailyPlan(tasks, { memberId: "ana", day: "2026-09-24", today: "2026-09-23" });

  assert.deepEqual(ids(today.carriedOver), ["overdue", "yesterday"]);
  assert.deepEqual(ids(tomorrow.carriedOver), []);
  assert.deepEqual(ids(tomorrow.backlog), []);
});

test("lists work completed on the day, falling back to the planned day for legacy records", () => {
  const completedAt = new Date(2026, 8, 23, 15, 30).toISOString();
  const tasks = [
    task({ id: "closed-today", done: true, completedAt }),
    task({ id: "legacy", done: true, plannedFor: "2026-09-23" }),
    task({ id: "closed-before", done: true, completedAt: new Date(2026, 8, 20, 9).toISOString() }),
  ];

  const plan = buildDailyPlan(tasks, { memberId: "ana", day: "2026-09-23", today: "2026-09-23" });

  assert.deepEqual(ids(plan.done), ["closed-today", "legacy"]);
});

test("backlog holds unscheduled open work for the person", () => {
  const tasks = [
    task({ id: "someday" }),
    task({ id: "urgent-someday", priority: "high" }),
    task({ id: "unassigned", assigneeId: null }),
  ];

  const plan = buildDailyPlan(tasks, { memberId: "ana", day: "2026-09-23", today: "2026-09-23" });

  assert.deepEqual(ids(plan.backlog), ["urgent-someday", "someday"]);
});

test("summarizes planned and finished counts per member", () => {
  const tasks = [
    task({ id: "a1", plannedFor: "2026-09-23" }),
    task({ id: "a2", plannedFor: "2026-09-23", done: true, completedAt: new Date(2026, 8, 23, 12).toISOString() }),
    task({ id: "b1", plannedFor: "2026-09-23", assigneeId: "ben" }),
  ];

  const summary = summarizeTeamRange(tasks, ["ana", "ben", "cy"], ["2026-09-23"]);

  assert.deepEqual(summary, [
    { memberId: "ana", total: 2, done: 1 },
    { memberId: "ben", total: 1, done: 0 },
    { memberId: "cy", total: 0, done: 0 },
  ]);
});

test("weeks start on Monday and span seven days", () => {
  assert.equal(startOfWeek("2026-09-23"), "2026-09-21");
  assert.equal(startOfWeek("2026-09-27"), "2026-09-21");
  assert.equal(startOfWeek("2026-09-21"), "2026-09-21");
  assert.deepEqual(periodDays("week", "2026-09-23"), [
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
  ]);
});

test("month period covers every day of the month; grid pads to whole weeks", () => {
  const days = periodDays("month", "2026-09-23");
  assert.equal(days.length, 30);
  assert.equal(days[0], "2026-09-01");
  assert.equal(days.at(-1), "2026-09-30");

  const grid = monthGrid("2026-09-23");
  assert.equal(grid.length % 7, 0);
  assert.equal(grid[0], "2026-08-31");
  assert.equal(grid.at(-1), "2026-10-04");
});

test("shifts the anchor by one period", () => {
  assert.equal(shiftPeriod("day", "2026-09-23", 1), "2026-09-24");
  assert.equal(shiftPeriod("week", "2026-09-23", -1), "2026-09-16");
  assert.equal(shiftPeriod("month", "2026-01-31", 1), "2026-02-01");
  assert.equal(shiftPeriod("month", "2026-01-15", -1), "2025-12-01");
});

test("groups a member's open work by scheduled day and finished work by completion day", () => {
  const tasks = [
    task({ id: "mon", plannedFor: "2026-09-21" }),
    task({ id: "tue-due", dueDate: "2026-09-22" }),
    task({ id: "tue-done", done: true, completedAt: new Date(2026, 8, 22, 11).toISOString() }),
    task({ id: "outside", plannedFor: "2026-10-01" }),
    task({ id: "ben", plannedFor: "2026-09-21", assigneeId: "ben" }),
  ];

  const byDay = tasksByDay(tasks, "ana", ["2026-09-21", "2026-09-22"]);

  assert.deepEqual(ids(byDay["2026-09-21"]!.open), ["mon"]);
  assert.deepEqual(ids(byDay["2026-09-22"]!.open), ["tue-due"]);
  assert.deepEqual(ids(byDay["2026-09-22"]!.done), ["tue-done"]);
  assert.equal(byDay["2026-10-01"], undefined);
});

test("summarizes a member's range totals across several days", () => {
  const tasks = [
    task({ id: "a-mon", plannedFor: "2026-09-21" }),
    task({ id: "a-wed", plannedFor: "2026-09-23", done: true, completedAt: new Date(2026, 8, 23, 9).toISOString() }),
    task({ id: "a-next-week", plannedFor: "2026-09-28" }),
  ];

  assert.deepEqual(summarizeTeamRange(tasks, ["ana"], periodDays("week", "2026-09-23")), [
    { memberId: "ana", total: 2, done: 1 },
  ]);
});

test("date range is inclusive and empty when reversed", () => {
  assert.deepEqual(dateRange("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  assert.deepEqual(dateRange("2026-09-23", "2026-09-23"), ["2026-09-23"]);
  assert.deepEqual(dateRange("2026-09-24", "2026-09-23"), []);
});
