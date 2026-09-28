import { Timeline, relativeTime } from "@/components/kit";
import type { Activity } from "@/lib/types";

/** The History tab: the project's full activity log. */
export function HistoryTab({ history }: { history: Activity[] }) {
  return <Timeline items={history.map((activity) => ({ id: activity.id, text: activity.text, meta: relativeTime(activity.at), tone: activity.tone }))} />;
}
