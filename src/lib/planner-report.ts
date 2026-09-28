import {
  buildDailyPlan,
  dateRange,
  periodDays,
  scheduledDay,
  tasksByDay,
  toDateKey,
  type DateKey,
  type DayBucket,
  type PlannerView,
} from "./daily-plan";
import type { Member, Priority, Project, Task } from "./types";

export type ReportKind = PlannerView | "custom";
export type ReportScope = "individual" | "team";

export interface ReportPeriod {
  kind: ReportKind;
  start: DateKey;
  end: DateKey;
}

export interface PlannerReportInput {
  orgName: string;
  scope: ReportScope;
  /** The one member for an individual report; everyone for a team report. */
  members: readonly Member[];
  period: ReportPeriod;
  today: DateKey;
  tasks: readonly Task[];
  projects: readonly Project[];
  generatedAt: Date;
}

const LOCALE = "en-GB";
const BACKLOG_LIMIT = 20;
const MAX_RANGE_DAYS = 366;
const NO_PROJECT = "No project";

const REPORT_TITLE: Record<ReportKind, string> = {
  day: "Daily report",
  week: "Weekly report",
  month: "Monthly report",
  custom: "Custom report",
};

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", normal: "Normal", low: "Low" };

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

function toDate(key: DateKey): Date {
  return new Date(`${key}T00:00:00`);
}

function part(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(LOCALE, options);
}

/** "Wednesday, 23 September 2026" — composed by hand so ICU punctuation differences don't leak in. */
function longDay(key: DateKey): string {
  const date = toDate(key);
  return `${part(date, { weekday: "long" })}, ${date.getDate()} ${part(date, { month: "long" })} ${date.getFullYear()}`;
}

function mediumDay(key: DateKey): string {
  const date = toDate(key);
  return `${date.getDate()} ${part(date, { month: "short" })} ${date.getFullYear()}`;
}

function periodLabel(period: ReportPeriod): string {
  if (period.kind === "day") return longDay(period.start);
  if (period.kind === "month") {
    const date = toDate(period.start);
    return `${part(date, { month: "long" })} ${date.getFullYear()}`;
  }
  return `${mediumDay(period.start)} – ${mediumDay(period.end)}`;
}

function percentOf(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function table(headings: string[] | null, rows: string[][]): string {
  const head = headings ? `<thead><tr>${headings.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>` : "";
  const body = rows.map((cells) => `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

function heading(level: number, text: string): string {
  return `<h${level}>${escapeHtml(text)}</h${level}>`;
}

/** A headed block; `content` of "" renders the empty-state line instead. */
function section(level: number, title: string, content: string, emptyText: string): string {
  return `${heading(level, title)}${content === "" ? `<p class="empty">${escapeHtml(emptyText)}</p>` : content}`;
}

export function reportPeriod(kind: PlannerView, anchor: DateKey): ReportPeriod {
  const days = periodDays(kind, anchor);
  return { kind, start: days[0] ?? anchor, end: days.at(-1) ?? anchor };
}

/** Returns a user-facing problem with a custom range, or null when it is usable. */
export function validateReportRange(start: DateKey, end: DateKey): string | null {
  if (!start || !end) return "Pick a start and end date";
  if (start > end) return "Start date must be on or before the end date";
  if (dateRange(start, end).length > MAX_RANGE_DAYS) return `A report can cover at most ${MAX_RANGE_DAYS} days`;
  return null;
}

interface MemberWork {
  member: Member;
  buckets: Record<DateKey, DayBucket>;
  periodTasks: Task[];
  completed: Task[];
  overdue: Task[];
  unscheduled: Task[];
}

function memberWork(input: PlannerReportInput, member: Member, days: DateKey[]): MemberWork {
  const buckets = tasksByDay(input.tasks, member.id, days);
  const periodTasks = days.flatMap((day) => [...(buckets[day]?.open ?? []), ...(buckets[day]?.done ?? [])]);
  return {
    member,
    buckets,
    periodTasks,
    completed: periodTasks.filter((task) => task.done),
    overdue: buildDailyPlan(input.tasks, { memberId: member.id, day: input.today, today: input.today }).carriedOver,
    unscheduled: input.tasks.filter((t) => t.assigneeId === member.id && !t.done && scheduledDay(t) === ""),
  };
}

const sum = (work: MemberWork[], count: (w: MemberWork) => number) => work.reduce((total, w) => total + count(w), 0);

function summaryTable(work: MemberWork[]): string {
  const planned = sum(work, (w) => w.periodTasks.length);
  const completed = sum(work, (w) => w.completed.length);
  const highOpen = sum(work, (w) => w.periodTasks.filter((t) => !t.done && t.priority === "high").length);
  return table(null, [
    ["Planned", String(planned)],
    ["Completed", String(completed)],
    ["Still open", String(planned - completed)],
    ["Completion rate", `${percentOf(completed, planned)}%`],
    ["Overdue (as of today)", String(sum(work, (w) => w.overdue.length))],
    ["High priority open", String(highOpen)],
  ]);
}

function teamOverview(work: MemberWork[]): string {
  return table(
    ["Member", "Role", "Planned", "Done", "Open", "Rate", "Overdue"],
    work.map((w) => [
      w.member.name,
      w.member.role || "Member",
      String(w.periodTasks.length),
      String(w.completed.length),
      String(w.periodTasks.length - w.completed.length),
      `${percentOf(w.completed.length, w.periodTasks.length)}%`,
      String(w.overdue.length),
    ]),
  );
}

function projectBreakdown(periodTasks: Task[], projectName: (task: Task) => string): string {
  const byProject = new Map<string, { done: number; total: number }>();
  periodTasks.forEach((task) => {
    const name = projectName(task);
    const current = byProject.get(name) ?? { done: 0, total: 0 };
    byProject.set(name, { done: current.done + (task.done ? 1 : 0), total: current.total + 1 });
  });
  const rows = [...byProject.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, stats]) => [name, String(stats.done), String(stats.total), `${percentOf(stats.done, stats.total)}%`]);
  return rows.length === 0 ? "" : table(["Project", "Done", "Total", "Rate"], rows);
}

/** Completed list, day-by-day tables and overdue list for one member, headed at `level`. */
function memberSections(work: MemberWork, days: DateKey[], level: number, projectName: (task: Task) => string): string {
  const completed = work.completed.length
    ? `<ul>${work.completed
        .map((t) => `<li>${escapeHtml(t.title)} <span class="muted">— ${escapeHtml(projectName(t))}</span></li>`)
        .join("")}</ul>`
    : "";
  const byDay = days
    .map((day) => ({ day, list: [...(work.buckets[day]?.open ?? []), ...(work.buckets[day]?.done ?? [])] }))
    .filter(({ list }) => list.length > 0)
    .map(({ day, list }) => {
      const rows = list.map((t) => [t.title, projectName(t), PRIORITY_LABEL[t.priority], t.done ? "Done" : "Open"]);
      return `${heading(level + 1, longDay(day))}${table(["Task", "Project", "Priority", "Status"], rows)}`;
    })
    .join("");
  const overdue = work.overdue.length
    ? table(
        ["Task", "Project", "Was scheduled", "Priority"],
        work.overdue.map((t) => [t.title, projectName(t), mediumDay(scheduledDay(t)), PRIORITY_LABEL[t.priority]]),
      )
    : "";
  return [
    section(level, "Completed", completed, "Nothing completed in this period."),
    section(level, days.length === 1 ? "Plan" : "Day by day", byDay, "No work planned in this period."),
    section(level, "Overdue", overdue, "Nothing overdue."),
  ].join("\n");
}

function backlogTable(work: MemberWork, projectName: (task: Task) => string): string {
  if (work.unscheduled.length === 0) return "";
  return table(
    ["Task", "Project", "Priority"],
    work.unscheduled.slice(0, BACKLOG_LIMIT).map((t) => [t.title, projectName(t), PRIORITY_LABEL[t.priority]]),
  );
}

export function buildPlannerReport(input: PlannerReportInput): string {
  const { period, projects, members } = input;
  const days = dateRange(period.start, period.end);
  const work = members.map((member) => memberWork(input, member, days));
  const projectName = (task: Task) => projects.find((p) => p.id === task.projectId)?.name ?? NO_PROJECT;
  const byProject = projectBreakdown(work.flatMap((w) => w.periodTasks), projectName);
  const isTeam = input.scope === "team";
  const subject = isTeam ? `${input.orgName} team` : (members[0]?.name ?? "Member");
  const title = `${subject} — ${REPORT_TITLE[period.kind]}`;
  const context = isTeam ? `${members.length} members` : `${input.orgName} · ${members[0]?.role || "Member"}`;
  const generatedTime = input.generatedAt.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
  const generated = `${mediumDay(toDateKey(input.generatedAt))} ${generatedTime}`;

  const parts = [
    heading(1, title),
    `<p class="meta"><strong>${escapeHtml(periodLabel(period))}</strong> · ${escapeHtml(context)}<br>Generated ${escapeHtml(generated)}</p>`,
    `${heading(2, "Summary")}${summaryTable(work)}`,
  ];

  if (isTeam) {
    parts.push(`${heading(2, "Team overview")}${teamOverview(work)}`);
    parts.push(section(2, "By project", byProject, "No project work."));
    work.forEach((w) =>
      parts.push(`<div class="member">${heading(2, w.member.name)}${memberSections(w, days, 3, projectName)}</div>`),
    );
  } else {
    work.forEach((w) =>
      parts.push(
        memberSections(w, days, 2, projectName),
        section(2, "By project", byProject, "No project work."),
        section(2, "Not yet scheduled", backlogTable(w, projectName), "Backlog is clear."),
      ),
    );
  }

  return wrapDocument(title, parts.join("\n"));
}

/** A standalone, print-ready HTML document. */
function wrapDocument(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #111827; max-width: 820px; margin: 32px auto; padding: 0 24px; line-height: 1.45; }
  h1 { font-size: 24pt; margin: 0 0 4px; }
  h2 { font-size: 14pt; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #4f46e5; color: #312e81; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; }
  h4 { font-size: 10.5pt; margin: 12px 0 4px; color: #374151; }
  .meta { color: #4b5563; font-size: 10pt; margin: 0 0 8px; }
  .muted { color: #6b7280; }
  .empty { color: #6b7280; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 4px 0 8px; }
  th, td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eef2ff; }
  ul { margin: 4px 0; padding-left: 20px; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 8px 0; text-align: right; }
  .toolbar button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #4f46e5; background: #4f46e5; color: #fff; cursor: pointer; }
  @media print { .toolbar { display: none; } body { margin: 0; } .member { break-before: page; } }
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
${body}
</body>
</html>`;
}
