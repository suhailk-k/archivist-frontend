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
