import { Link } from "@tanstack/react-router";
import { DateChip, Empty } from "@/components/kit";
import type { Meeting } from "@/lib/types";

/** The Meetings tab: this project's scheduled meetings, oldest first. */
export function MeetingsTab({ meetings }: { meetings: Meeting[] }) {
  return (
    <div className="space-y-2.5">
      {meetings.length === 0 ? <Empty text="No meetings for this project" /> : null}
      {meetings.map((meeting) => (
        <div key={meeting.id} className="flex items-start gap-3 rounded-xl border border-line bg-panel p-3 shadow-sm">
          <DateChip date={meeting.date} />
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium">{meeting.title}</div>
            <div className="text-[11px] text-ink-soft">
              {meeting.time} · {meeting.attendeeIds.length} attending
            </div>
            {meeting.notes ? <p className="mt-1.5 text-[12.5px] text-ink-soft">{meeting.notes}</p> : null}
          </div>
        </div>
      ))}
      <Link to="/meetings" className="inline-block text-xs font-medium text-accent hover:underline">
        Schedule a meeting →
      </Link>
    </div>
  );
}
