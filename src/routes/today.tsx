import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { GhostButton, PageHeader } from "@/components/app-shell";
import { Empty, ListSkeleton } from "@/components/kit";
import { DayView } from "@/components/planner/day-view";
import { MonthView } from "@/components/planner/month-view";
import { ReportDialog } from "@/components/planner/report-dialog";
import { dayLabel, shortDay, TeamStrip, type PlannerContext } from "@/components/planner/parts";
import { WeekView } from "@/components/planner/week-view";
import { useAuth } from "@/lib/auth";
import { periodDays, shiftPeriod, summarizeTeamRange, todayKey, type DateKey, type PlannerView } from "@/lib/daily-plan";
import { useOrgData, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VIEWS: PlannerView[] = ["day", "week", "month"];
const VIEW_LABEL: Record<PlannerView, string> = { day: "Day", week: "Week", month: "Month" };
const PAGE_TITLE: Record<PlannerView, string> = { day: "My Day", week: "My Week", month: "My Month" };

interface PlannerSearch {
  view?: PlannerView | undefined;
  day?: DateKey | undefined;
  member?: string | undefined;
}

export const Route = createFileRoute("/today")({
  validateSearch: (search: Record<string, unknown>): PlannerSearch => {
    const view = search["view"];
    const day = search["day"];
    const member = search["member"];
    return {
      view: VIEWS.find((v) => v === view && v !== "day"),
      day: typeof day === "string" && DATE_KEY_PATTERN.test(day) ? day : undefined,
      member: typeof member === "string" && member ? member : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "My Work — Archivist" },
      { name: "description", content: "Plan, track and report each person's work by day, week and month." },
      { property: "og:title", content: "My Work — Archivist" },
      { property: "og:description", content: "Plan, track and report each person's work by day, week and month." },
    ],
  }),
  component: Planner,
});

function periodTitle(view: PlannerView, anchor: DateKey, today: DateKey) {
  const days = periodDays(view, anchor);
  if (view === "day") return dayLabel(anchor, today);
  if (view === "week") return days.includes(today) ? "This week" : `Week of ${shortDay(days[0] ?? anchor)}`;
  return new Date(`${anchor}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function Planner() {
  const { org, orgId, addTask, updateTask, hydrated } = useStore();
  const { user } = useAuth();
  const { tasks, projects, members } = useOrgData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/today" });

  const today = todayKey();
  const view = search.view ?? "day";
  const anchor = search.day ?? today;
  const defaultMemberId = members.some((m) => m.id === user?.memberId) ? user?.memberId : members[0]?.id;
  const memberId = members.some((m) => m.id === search.member) ? search.member : defaultMemberId;
  const member = members.find((m) => m.id === memberId);

  const setSearch = (next: PlannerSearch) => void navigate({ search: (prev) => ({ ...prev, ...next }) });
  const open = (nextView: PlannerView, day: DateKey) =>
    setSearch({ view: nextView === "day" ? undefined : nextView, day: day === today ? undefined : day });

  const [isReportOpen, setReportOpen] = useState(false);

  const header = (
    <PageHeader
      title={PAGE_TITLE[view]}
      crumb={`${org?.name ?? ""} · ${periodTitle(view, anchor, today)}`}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ViewToggle view={view} onChange={(next) => open(next, anchor)} />
          <PeriodNavigator
            view={view}
            anchor={anchor}
            today={today}
            onChange={(day) => setSearch({ day: day === today ? undefined : day })}
          />
          {member ? <ReportButton onClick={() => setReportOpen(true)} /> : null}
        </div>
      }
    />
  );

  if (!member) {
    return (
      <>
        {header}
        <div className="px-6 py-7 md:px-8">
          {!hydrated ? <ListSkeleton /> : <Empty text="Add members to this organisation to plan their work" />}
        </div>
      </>
    );
  }

  const ctx: PlannerContext = { orgId, member, tasks, projects, anchor, today, addTask, updateTask, open };
  const team = summarizeTeamRange(tasks, members.map((m) => m.id), periodDays(view, anchor));

  return (
    <>
      {header}
      <ReportDialog
        open={isReportOpen}
        onClose={() => setReportOpen(false)}
        orgName={org?.name ?? ""}
        members={members}
        tasks={tasks}
        projects={projects}
        today={today}
        initialView={view}
        initialAnchor={anchor}
        initialMemberId={member.id}
      />
      <div className="px-6 py-7 md:px-8">
        <TeamStrip members={members} summary={team} selectedId={member.id} onSelect={(id) => setSearch({ member: id })} />
        {view === "day" ? <DayView ctx={ctx} /> : null}
        {view === "week" ? <WeekView ctx={ctx} /> : null}
        {view === "month" ? <MonthView ctx={ctx} /> : null}
      </div>
    </>
  );
}

function ViewToggle({ view, onChange }: { view: PlannerView; onChange: (view: PlannerView) => void }) {
  return (
    <div className="flex rounded-lg border border-line bg-panel p-0.5" role="tablist" aria-label="Planner view">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={v === view}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
            v === view ? "bg-accent text-paper" : "text-ink-soft hover:text-ink",
          )}
        >
          {VIEW_LABEL[v]}
        </button>
      ))}
    </div>
  );
}

function PeriodNavigator({
  view,
  anchor,
  today,
  onChange,
}: {
  view: PlannerView;
  anchor: DateKey;
  today: DateKey;
  onChange: (day: DateKey) => void;
}) {
  const arrow = "grid size-9 place-items-center rounded-lg border border-line bg-panel hover:border-accent/40";
  const unit = VIEW_LABEL[view].toLowerCase();
  const isCurrent = periodDays(view, anchor).includes(today);
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`Previous ${unit}`} className={arrow} onClick={() => onChange(shiftPeriod(view, anchor, -1))}>
        <ChevronLeft size={15} />
      </button>
      <GhostButton onClick={() => onChange(today)} disabled={isCurrent && anchor === today}>
        Today
      </GhostButton>
      <button type="button" aria-label={`Next ${unit}`} className={arrow} onClick={() => onChange(shiftPeriod(view, anchor, 1))}>
        <ChevronRight size={15} />
      </button>
      <input
        type="date"
        aria-label="Pick a date"
        value={anchor}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="hidden h-9 rounded-lg border border-line bg-panel px-2 text-[12px] lg:block"
      />
    </div>
  );
}

function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Generate a daily, weekly, monthly or custom report"
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[12px] font-medium hover:border-accent/40"
    >
      <FileText size={14} /> <span className="hidden sm:inline">Report</span>
    </button>
  );
}
