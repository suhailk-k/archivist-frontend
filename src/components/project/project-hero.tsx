import { CalendarDays, ChevronDown, UserRound, UsersRound } from "lucide-react";
import { Pill, formatDate } from "@/components/kit";
import { TABS, type Tab } from "@/components/project/constants";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type Member, type Project } from "@/lib/types";

const AVATAR_COLORS = ["bg-accent", "bg-verd", "bg-amber", "bg-rose", "bg-sky-500"];

/** The hero card at the top of a project page: status, title, owner/team/timeline, and the tab strip. */
export function ProjectHero({
  project,
  progress,
  owner,
  assignedMembers,
  tab,
  onTabChange,
}: {
  project: Project;
  progress: number;
  owner: Member | undefined;
  assignedMembers: Member[];
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <div className="relative grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_280px] md:p-7">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status].toUpperCase()}</Pill>
            <span className="flex items-center gap-1 text-[11px] text-ink-soft">
              Updated {formatDate(project.createdAt.slice(0, 10))}
              <ChevronDown size={13} className="text-ink-soft/70" />
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">{project.description || "No description yet."}</p>
          <div className="mt-6 flex max-w-xl items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/60">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
            <span className="text-xs font-semibold text-ink">{progress}%</span>
          </div>
        </div>
        <div className="relative -mx-6 -mb-6 space-y-4 border-t border-line bg-gradient-to-br from-accent-soft/60 via-sky-50/60 to-violet-100/60 px-6 py-6 text-sm text-ink md:-my-7 md:ml-0 md:-mr-7 md:border-l md:border-t-0 md:py-7 md:pl-6 md:pr-7">
          <div className="flex items-start gap-3">
            <UserRound size={18} className="mt-0.5 text-ink-soft" />
            <div>
              <div className="text-[11px] text-ink-soft">Owner</div>
              <div className="font-medium">{owner?.name ?? "Unassigned"}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <UsersRound size={18} className="mt-0.5 text-ink-soft" />
            <div>
              <div className="text-[11px] text-ink-soft">Team</div>
              {assignedMembers.length === 0 ? (
                <div className="font-medium">0 people</div>
              ) : (
                <div className="mt-1 flex items-center -space-x-2">
                  {assignedMembers.slice(0, 3).map((member, index) => (
                    <div
                      key={member.id}
                      title={member.name}
                      className={`grid size-7 place-items-center rounded-full border-2 border-panel text-[11px] font-semibold text-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                    >
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                  {assignedMembers.length > 3 ? (
                    <div className="grid size-7 place-items-center rounded-full border-2 border-panel bg-line text-[11px] font-semibold text-ink-soft">
                      +{assignedMembers.length - 3}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays size={18} className="mt-0.5 text-ink-soft" />
            <div>
              <div className="text-[11px] text-ink-soft">Timeline</div>
              <div className="font-medium">
                {project.startDate ? formatDate(project.startDate) : "—"} – {project.dueDate ? formatDate(project.dueDate) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex gap-1 overflow-x-auto border-t border-line px-4 pt-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`relative shrink-0 px-3 py-3 text-[12px] font-medium transition-colors ${
              tab === t ? "text-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t}
            {tab === t ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
