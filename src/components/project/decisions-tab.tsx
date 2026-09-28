import { Link } from "@tanstack/react-router";
import { Empty, Pill } from "@/components/kit";
import type { Decision, Member } from "@/lib/types";

/** The Decisions tab: this project's logged decisions with status and rationale. */
export function DecisionsTab({ decisions, members }: { decisions: Decision[]; members: Member[] }) {
  return (
    <div className="space-y-2.5">
      {decisions.length === 0 ? <Empty text="No decisions recorded" /> : null}
      {decisions.map((decision) => (
        <div key={decision.id} className="rounded-xl border border-line bg-panel p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium">{decision.title}</span>
            <span className="ml-auto">
              <Pill tone={decision.status === "approved" ? "verd" : decision.status === "rejected" ? "rose" : "amber"}>{decision.status}</Pill>
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink-soft">{decision.rationale || "No rationale recorded."}</p>
          <div className="mt-1.5 text-[11px] text-ink-soft/70">
            {members.find((m) => m.id === decision.decidedById)?.name ?? "—"} · {decision.date}
          </div>
        </div>
      ))}
      <Link to="/decisions" className="inline-block text-xs font-medium text-accent hover:underline">
        Log a decision →
      </Link>
    </div>
  );
}
