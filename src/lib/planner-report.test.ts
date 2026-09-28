import assert from "node:assert/strict";
import test from "node:test";
import { buildPlannerReport, reportPeriod, validateReportRange, type PlannerReportInput } from "./planner-report.ts";
import type { Member, Task } from "./types.ts";

const task = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "t",
  orgId: "o",
  projectId: null,
  title: overrides.id ?? "t",
  phase: "Admin",
  status: "todo",
  labels: [],
  sortOrder: 0,
  done: false,
  priority: "normal",
  dueDate: "",
  assigneeId: "ana",
  assigneeIds: ["ana"],
  plannedFor: "",
  completedAt: "",
  createdAt: "2026-09-01T09:00:00.000Z",
  ...overrides,
});

const ana: Member = { id: "ana", orgId: "o", name: "Ana Diaz", role: "Designer", email: "ana@example.com" };
const ben: Member = { id: "ben", orgId: "o", name: "Ben Ode", role: "Developer", email: "ben@example.com" };

const input = (tasks: Task[], overrides: Partial<PlannerReportInput> = {}): PlannerReportInput => ({
  orgName: "Acme",
  scope: "individual",
  members: [ana],
  period: reportPeriod("week", "2026-09-23"),
  today: "2026-09-23",
  tasks,
  projects: [{ id: "p1", orgId: "o", name: "Website", description: "", status: "in_progress", ownerId: null, memberIds: [], startDate: "", dueDate: "", links: [], key: "WEB", labels: [], createdAt: "" }],
  generatedAt: new Date(2026, 8, 23, 17, 5),
  ...overrides,
});

test("individual report has title, period and summary counts for the member", () => {
  const html = buildPlannerReport(
    input([
      task({ id: "a", plannedFor: "2026-09-21", done: true, completedAt: new Date(2026, 8, 21, 10).toISOString() }),
      task({ id: "b", plannedFor: "2026-09-24", priority: "high" }),
      task({ id: "other", plannedFor: "2026-09-24", assigneeId: "ben" }),
    ]),
  );

  assert.match(html, /<h1>Ana Diaz — Weekly report<\/h1>/);
  assert.match(html, /21 Sept? 2026 – 27 Sept? 2026/);
  assert.match(html, /<td>Planned<\/td><td>2<\/td>/);
  assert.match(html, /<td>Completed<\/td><td>1<\/td>/);
  assert.match(html, /<td>Completion rate<\/td><td>50%<\/td>/);
  assert.doesNotMatch(html, /other/);
});

test("escapes task text so the document cannot be injected into", () => {
  const html = buildPlannerReport(input([task({ id: "x", title: "<script>alert(1)</script> & co", plannedFor: "2026-09-23" })]));

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; co/);
});

test("lists only days that have work, plus overdue and project breakdown sections", () => {
  const html = buildPlannerReport(
    input([
      task({ id: "wed", title: "Wednesday work", plannedFor: "2026-09-23", projectId: "p1" }),
      task({ id: "late", title: "Late work", plannedFor: "2026-09-10" }),
    ]),
  );

  assert.match(html, /Wednesday, 23 September 2026/);
  assert.doesNotMatch(html, /Monday, 21 September 2026/);
  assert.match(html, /Overdue<\/h2>[\s\S]*Late work/);
  assert.match(html, /By project<\/h2>[\s\S]*<td>Website<\/td><td>0<\/td><td>1<\/td>/);
});

test("daily, monthly and custom periods get their own titles and ranges", () => {
  assert.match(buildPlannerReport(input([], { period: reportPeriod("month", "2026-09-23") })), /Monthly report[\s\S]*September 2026/);
  assert.match(buildPlannerReport(input([], { period: reportPeriod("day", "2026-09-23") })), /Daily report[\s\S]*Wednesday, 23 September 2026/);

  const custom = buildPlannerReport(
    input([task({ id: "in", plannedFor: "2026-09-02" }), task({ id: "out", plannedFor: "2026-09-20" })], {
      period: { kind: "custom", start: "2026-09-01", end: "2026-09-15" },
    }),
  );
  assert.match(custom, /Ana Diaz — Custom report/);
  assert.match(custom, /1 Sept? 2026 – 15 Sept? 2026/);
  assert.match(custom, /<td>Planned<\/td><td>1<\/td>/);
});

test("team report has an overview row per member and a section for each", () => {
  const html = buildPlannerReport(
    input(
      [
        task({ id: "a1", title: "Ana task", plannedFor: "2026-09-23", done: true, completedAt: new Date(2026, 8, 23, 9).toISOString() }),
        task({ id: "b1", title: "Ben task", plannedFor: "2026-09-23", assigneeId: "ben" }),
      ],
      { scope: "team", members: [ana, ben] },
    ),
  );

  assert.match(html, /<h1>Acme team — Weekly report<\/h1>/);
  assert.match(html, /<td>Planned<\/td><td>2<\/td>/);
  assert.match(html, /<td>Ana Diaz<\/td><td>Designer<\/td><td>1<\/td><td>1<\/td><td>0<\/td><td>100%<\/td>/);
  assert.match(html, /<td>Ben Ode<\/td><td>Developer<\/td><td>1<\/td><td>0<\/td><td>1<\/td><td>0%<\/td>/);
  assert.match(html, /<h2>Ana Diaz<\/h2>[\s\S]*Ana task[\s\S]*<h2>Ben Ode<\/h2>[\s\S]*Ben task/);
});

test("validates custom ranges", () => {
  assert.equal(validateReportRange("2026-09-01", "2026-09-30"), null);
  assert.match(validateReportRange("", "2026-09-30") ?? "", /start and end/);
  assert.match(validateReportRange("2026-09-30", "2026-09-01") ?? "", /on or before/);
  assert.match(validateReportRange("2025-01-01", "2026-09-30") ?? "", /366/);
});
