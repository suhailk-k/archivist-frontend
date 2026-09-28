import {
  CalendarDays,
  Check,
  ChevronRight,
  ExternalLink,
  Flag,
  FolderOpen,
  Github,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  type LucideIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { GhostButton } from "@/components/app-shell";
import { Empty, Timeline, formatDate, relativeTime } from "@/components/kit";
import type { Tab } from "@/components/project/constants";
import type { Activity, Member, Milestone, Project, Task } from "@/lib/types";

function ProjectCard({ title, icon: Icon, action, children }: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-panel shadow-sm">
      <div className="flex items-center gap-2 border-b border-line/60 px-4 py-3.5">
        <Icon size={16} className="text-ink-soft/70" />
        <span className="text-[13.5px] font-semibold text-ink">{title}</span>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div className="space-y-2 p-4">{children}</div>
    </div>
  );
}

/** The default project tab: open tasks, milestones, quick links, recent activity and a call-to-action banner. */
export function OverviewTab({
  links,
  openTasks,
  milestones,
  members,
  recentActivity,
  onTabChange,
  onEditLinks,
}: {
  links: Project["links"];
  openTasks: Task[];
  milestones: Milestone[];
  members: Member[];
  recentActivity: Activity[];
  onTabChange: (tab: Tab) => void;
  onEditLinks: () => void;
}) {
  return (
    <>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_640px]">
        <div className="space-y-4">
          <ProjectCard
            title="Open Tasks"
            icon={ListChecks}
            action={
              <button type="button" onClick={() => onTabChange("Planning")} className="flex items-center text-xs font-medium text-accent hover:underline">
                View all <ChevronRight size={14} />
              </button>
            }
          >
            {openTasks.length === 0
              ? <Empty text="Nothing open" />
              : openTasks.slice(0, 6).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-line/60 px-3 py-3">
                    <span className="grid size-5 place-items-center rounded border border-line" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{task.title}</span>
                    <span className="rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">{task.phase || "To Do"}</span>
                    <span className="hidden text-[11px] text-ink-soft sm:block">
                      {members.find((m) => m.id === task.assigneeId)?.name ?? "Unassigned"}
                    </span>
                    <span className="hidden text-[11px] text-ink-soft sm:block">{task.dueDate || "No due date"}</span>
                  </div>
                ))}
          </ProjectCard>
          <ProjectCard
            title="Milestones"
            icon={Flag}
            action={
              <button type="button" onClick={() => onTabChange("Planning")} className="flex items-center text-xs font-medium text-accent hover:underline">
                <Plus size={14} className="mr-1" />
                Add milestone
              </button>
            }
          >
            {milestones.length === 0
              ? <Empty text="No milestones set yet" />
              : milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-3 rounded-xl border border-line/60 px-3 py-3">
                    <span
                      className={`grid size-6 place-items-center rounded-full ${
                        milestone.done ? "bg-verd/15 text-verd" : "bg-line/40 text-ink-soft"
                      }`}
                    >
                      {milestone.done ? <Check size={14} /> : <Flag size={13} />}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-ink">{milestone.title}</span>
                    <span className="text-[11px] text-ink-soft">{formatDate(milestone.date)}</span>
                  </div>
                ))}
          </ProjectCard>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <ProjectCard title="Quick Links" icon={FolderOpen} action={<GhostButton onClick={onEditLinks}>Edit</GhostButton>}>
              {links.length === 0
                ? <Empty text="No links added" />
                : links.map((link) => {
                    const Icon = link.url.includes("github.com") ? Github : LayoutDashboard;
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 py-2 text-[12.5px] text-ink hover:text-accent"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-line/30 text-ink-soft">
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{link.label}</span>
                        <ExternalLink size={14} className="text-ink-soft/60" />
                      </a>
                    );
                  })}
            </ProjectCard>
          </div>

          <div className="space-y-4">
            <ProjectCard
              title="Recent Activity"
              icon={Sparkles}
              action={
                <button type="button" onClick={() => onTabChange("History")} className="flex items-center text-xs font-medium text-accent hover:underline">
                  View all <ChevronRight size={14} />
                </button>
              }
            >
              {recentActivity.length === 0 ? (
                <Empty text="Nothing recorded yet" />
              ) : (
                <Timeline items={recentActivity.map((activity) => ({ id: activity.id, text: activity.text, meta: relativeTime(activity.at), tone: activity.tone }))} />
              )}
            </ProjectCard>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-accent/15 bg-gradient-to-r from-accent-soft/60 to-violet-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-amber/15 text-amber">
            <Lightbulb size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-ink">Ready to make progress?</div>
            <div className="text-xs text-ink-soft">Add more tasks, set milestones and keep your team aligned.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTabChange("Planning")}
            className="inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-paper shadow-sm hover:opacity-90"
          >
            <Plus size={15} className="mr-1.5" />
            Create Task
          </button>
          <button
            type="button"
            onClick={() => onTabChange("Planning")}
            className="inline-flex items-center rounded-xl border border-line bg-panel px-4 py-2.5 text-xs font-semibold text-ink hover:bg-panel/70"
          >
            <CalendarDays size={15} className="mr-1.5" />
            Plan Timeline
          </button>
        </div>
      </div>
    </>
  );
}
