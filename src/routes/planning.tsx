import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Empty, Panel, PanelHead, Pill, Progress, formatDate } from "@/components/kit";
import { projectProgress, useOrgData, useStore } from "@/lib/store";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/lib/types";

export const Route = createFileRoute("/planning")({
  head: () => ({
    meta: [
      { title: "Planning — Archivist" },
      { name: "description", content: "Plan every project by phase and milestone, and see what lands when." },
      { property: "og:title", content: "Planning — Archivist" },
      { property: "og:description", content: "Plan every project by phase and milestone, and see what lands when." },
    ],
  }),
  component: Planning,
});

function Planning() {
  const { org, db } = useStore();
  const { projects, tasks } = useOrgData();

  const milestones = db.milestones
    .filter((m) => projects.some((p) => p.id === m.projectId))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader title="Planning" crumb={`${org?.name ?? ""} · Phases and milestones`} />

      <div className="grid gap-3 px-6 py-7 md:px-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {projects.length === 0 ? <Empty text="No projects to plan yet" /> : null}
          {projects.map((p) => {
            const list = tasks.filter((t) => t.projectId === p.id);
            const phases = Array.from(new Set(list.map((t) => t.phase || "Unsorted")));
            return (
              <Panel key={p.id}>
                <PanelHead
                  title={p.name}
                  meta={`${list.filter((t) => t.done).length}/${list.length} tasks`}
                  action={
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="font-mono text-[10.5px] text-accent hover:underline"
                    >
                      Open plan →
                    </Link>
                  }
                />
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Pill tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
                    <Progress value={projectProgress(tasks, p.id)} tone={PROJECT_STATUS_TONE[p.status]} />
                    <span className="font-mono text-[10px] text-ink-soft">
                      {p.startDate ? formatDate(p.startDate) : "—"} → {p.dueDate ? formatDate(p.dueDate) : "—"}
                    </span>
                  </div>

                  {phases.length === 0 ? (
                    <div className="mt-3">
                      <Empty text="No phases planned" />
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {phases.map((ph) => {
                        const inPhase = list.filter((t) => (t.phase || "Unsorted") === ph);
                        const done = inPhase.filter((t) => t.done).length;
                        return (
                          <div key={ph} className="rounded-xl border border-line bg-paper/40 p-3">
                            <div className="label-mono">{ph}</div>
                            <div className="mt-2 space-y-1">
                              {inPhase.slice(0, 4).map((t) => (
                                <div key={t.id} className="flex items-center gap-2 text-[12.5px]">
                                  <span className={`size-1.5 rounded-full ${t.done ? "bg-verd" : "bg-line"}`} />
                                  <span className={`truncate ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 font-mono text-[9.5px] text-ink-soft">
                              {done}/{inPhase.length} complete
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel className="h-fit p-4">
          <div className="label-mono mb-3">Milestone schedule</div>
          {milestones.length === 0 ? <Empty text="No milestones set" /> : null}
          <div className="relative pl-4">
            {milestones.length > 0 ? <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-line" /> : null}
            <div className="space-y-4">
              {milestones.map((m) => {
                const project = projects.find((p) => p.id === m.projectId);
                return (
                  <div key={m.id} className="relative">
                    <span
                      className={`absolute -left-[13px] top-1 size-2.5 rounded-full ring-4 ring-paper ${
                        m.done ? "bg-verd" : "bg-accent"
                      }`}
                    />
                    <div className={`text-[12.5px] leading-snug ${m.done ? "text-ink-soft line-through" : ""}`}>{m.title}</div>
                    <div className="mt-0.5 font-mono text-[9.5px] text-ink-soft">
                      {formatDate(m.date)} · {project?.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
