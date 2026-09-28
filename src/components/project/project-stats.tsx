import { ChevronRight, CircleCheck, Clock3, ListChecks, type LucideIcon, UsersRound } from "lucide-react";
import type { Tab } from "@/components/project/constants";

type StatTone = "accent" | "amber" | "verd" | "violet";

const TONE_CLASSES: Record<StatTone, string> = {
  accent: "bg-accent-soft text-accent",
  amber: "bg-amber/15 text-amber",
  verd: "bg-verd/15 text-verd",
  violet: "bg-violet-50 text-violet-600",
};

function ProjectStat({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: StatTone;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 text-left shadow-sm transition-colors hover:border-accent/30"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-ink-soft">{label}</div>
        <div className="text-2xl font-bold text-ink">{value}</div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-ink-soft/50" />
    </button>
  );
}

/** The row of open-tasks / in-progress / completed / team stat cards shown above the project tabs. */
export function ProjectStatsGrid({
  openTasks,
  inProgress,
  completed,
  team,
  onTabChange,
}: {
  openTasks: number;
  inProgress: number;
  completed: number;
  team: number;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <ProjectStat icon={ListChecks} label="Open Tasks" value={openTasks} tone="accent" onClick={() => onTabChange("Planning")} />
      <ProjectStat icon={Clock3} label="In Progress" value={inProgress} tone="amber" onClick={() => onTabChange("Planning")} />
      <ProjectStat icon={CircleCheck} label="Completed" value={completed} tone="verd" onClick={() => onTabChange("Planning")} />
      <ProjectStat icon={UsersRound} label="Team Members" value={team} tone="violet" onClick={() => onTabChange("Team")} />
    </div>
  );
}
