import { Circle, CircleCheck, CircleDashed, CircleX, Contrast, Eye, type LucideIcon } from "lucide-react";
import type { LabelColor, Priority, TaskStatus } from "@/lib/types";

export { TASK_STATUSES as STATUS_ORDER } from "@/lib/board";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Text colour class for the icon. */
  tone: string;
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  backlog: { label: "Backlog", icon: CircleDashed, tone: "text-ink-soft" },
  todo: { label: "Todo", icon: Circle, tone: "text-ink-soft" },
  in_progress: { label: "In progress", icon: Contrast, tone: "text-amber" },
  in_review: { label: "In review", icon: Eye, tone: "text-accent" },
  done: { label: "Done", icon: CircleCheck, tone: "text-verd" },
  cancelled: { label: "Cancelled", icon: CircleX, tone: "text-rose" },
};

/** "normal" predates the board and reads as "Medium". */
export const PRIORITY_LABEL: Record<Priority, string> = {
  none: "No priority",
  low: "Low",
  normal: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Background classes for label dots; the two extra presets mix existing tokens. */
export const LABEL_DOT: Record<LabelColor, string> = {
  accent: "bg-accent",
  verd: "bg-verd",
  amber: "bg-amber",
  rose: "bg-rose",
  plum: "bg-[color-mix(in_oklab,var(--accent)_55%,var(--rose))]",
  teal: "bg-[color-mix(in_oklab,var(--verd)_60%,var(--accent))]",
  ink: "bg-ink",
  "ink-soft": "bg-ink-soft",
};

export const LABEL_COLOR_NAME: Record<LabelColor, string> = {
  accent: "Indigo",
  verd: "Green",
  amber: "Amber",
  rose: "Red",
  plum: "Plum",
  teal: "Teal",
  ink: "Graphite",
  "ink-soft": "Slate",
};

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const shortDate = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** Droppable id of a column, distinct from task ids so an empty column can take a drop. */
export const columnDropId = (status: TaskStatus): string => `column:${status}`;

/** Outlined label chips (Jira style): coloured border with a faint tint; the text stays ink. */
export const LABEL_BORDER: Record<LabelColor, string> = {
  accent: "border-accent/80 bg-accent/[0.06]",
  verd: "border-verd/85 bg-verd/[0.07]",
  amber: "border-amber/85 bg-amber/[0.08]",
  rose: "border-rose/80 bg-rose/[0.06]",
  plum: "border-[color-mix(in_oklab,var(--accent)_55%,var(--rose))] bg-[color-mix(in_oklab,var(--accent)_55%,var(--rose))]/[0.07]",
  teal: "border-[color-mix(in_oklab,var(--verd)_60%,var(--accent))] bg-[color-mix(in_oklab,var(--verd)_60%,var(--accent))]/[0.07]",
  ink: "border-ink/60 bg-ink/[0.04]",
  "ink-soft": "border-ink-soft/70 bg-ink-soft/[0.06]",
};

/** Filled status pill used on the detail dialog's status button. */
export const STATUS_PILL: Record<TaskStatus, string> = {
  backlog: "bg-ink/[0.06] text-ink hover:bg-ink/10",
  todo: "bg-ink/[0.06] text-ink hover:bg-ink/10",
  in_progress: "bg-accent-soft text-accent hover:bg-accent/15",
  in_review: "bg-accent-soft text-accent hover:bg-accent/15",
  done: "bg-verd/15 text-verd hover:bg-verd/20",
  cancelled: "bg-rose/10 text-rose hover:bg-rose/15",
};
