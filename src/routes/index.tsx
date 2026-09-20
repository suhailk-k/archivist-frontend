import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PrimaryButton } from "@/components/app-shell";
import { DateChip, Empty, Panel, PanelHead, Pill, Progress, Stat, Timeline, relativeTime } from "@/components/kit";
import { projectProgress, useOrgData, useStore } from "@/lib/store";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Archivist" },
      { name: "description", content: "Overview of your active projects, meetings, decisions and activity." },
      { property: "og:title", content: "Dashboard — Archivist" },
      { property: "og:description", content: "Overview of your active projects, meetings, decisions and activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { org } = useStore();
  const { projects, tasks, meetings, decisions, docs, activity, members } = useOrgData();

  const active = projects.filter((p) => p.status !== "done");
  const openDecisions = decisions.filter((d) => d.status === "open");
  const upcoming = [...meetings].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const openTasks = tasks.filter((t) => !t.done);

  return (
    <>
      <PageHeader
        title="Dashboard"
        crumb={`${org?.name ?? "No organisation"} · Overview`}
        action={
          <Link to="/projects">
            <PrimaryButton>+ New project</PrimaryButton>
          </Link>
        }
      />

      <div className="px-6 py-7 md:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Active projects" value={active.length} note={`${projects.length} total`} />
          <Stat label="Open decisions" value={openDecisions.length} note="awaiting" tone="amber" />
          <Stat label="Open to-dos" value={openTasks.length} note={`${tasks.length - openTasks.length} done`} tone="verd" />
          <Stat label="Documents" value={docs.length} note={`${members.length} people`} />
        </div>

        <div className="mt-3 grid grid-cols-12 gap-3">
          <Panel className="col-span-12 overflow-hidden lg:col-span-6">
            <PanelHead
              index="a"
              title="Active projects"
              action={
                <Link to="/projects" className="font-mono text-[10.5px] text-accent hover:underline">
                  View all
                </Link>
              }
            />
            <div className="px-2 pb-2">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-2 pb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft/70">
                <span>Project</span>
                <span className="w-24">Owner</span>
                <span className="w-24 text-right">Status</span>
              </div>
              {active.length === 0 ? (
                <div className="p-2">
                  <Empty text="No active projects yet" />
                </div>
              ) : null}
              {active.slice(0, 5).map((p) => {
                const owner = members.find((m) => m.id === p.ownerId);
                return (
                  <Link
                    key={p.id}
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-ink/[0.035]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium">{p.name}</div>
                      <div className="mt-1">
                        <Progress value={projectProgress(tasks, p.id)} tone={PROJECT_STATUS_TONE[p.status]} />
                      </div>
                    </div>
                    <div className="w-24 font-mono text-[10px] text-ink-soft">{owner?.name ?? "—"}</div>
                    <div className="w-24 text-right">
                      <Pill tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <div className="col-span-12 space-y-3 lg:col-span-3">
            <Panel className="p-4">
              <div className="flex items-center gap-2 pb-3">
                <div className="label-mono tracking-[0.18em]">(b)</div>
                <h2 className="font-display text-[16px] font-medium">Upcoming</h2>
              </div>
              {upcoming.length === 0 ? <Empty text="No meetings scheduled" /> : null}
              <div className="space-y-2.5">
                {upcoming.map((m) => (
                  <Link key={m.id} to="/meetings" className="flex items-center gap-3">
                    <DateChip date={m.date} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{m.title}</div>
                      <div className="font-mono text-[10px] text-ink-soft">
                        {m.time} · {m.attendeeIds.length} people
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center gap-2 pb-3">
                <div className="label-mono tracking-[0.18em]">(c)</div>
                <h2 className="font-display text-[16px] font-medium">Recent decisions</h2>
              </div>
              {decisions.length === 0 ? <Empty text="No decisions logged" /> : null}
              <div className="space-y-3">
                {decisions.slice(0, 4).map((d) => (
                  <div key={d.id} className="flex gap-2.5">
                    <span
                      className={`mt-1 size-1.5 shrink-0 rounded-full ${
                        d.status === "approved" ? "bg-verd" : d.status === "rejected" ? "bg-rose" : "bg-amber"
                      }`}
                    />
                    <div>
                      <div className="text-[12.5px] leading-snug">{d.title}</div>
                      <div className="mt-0.5 font-mono text-[9.5px] text-ink-soft">
                        {d.status} · {d.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel className="col-span-12 p-4 lg:col-span-3">
            <div className="flex items-center gap-2 pb-3">
              <div className="label-mono tracking-[0.18em]">(d)</div>
              <h2 className="font-display text-[16px] font-medium">Activity</h2>
            </div>
            <Timeline
              items={activity.slice(0, 8).map((a) => ({
                id: a.id,
                text: a.text,
                meta: relativeTime(a.at),
                tone: a.tone,
              }))}
            />
          </Panel>
        </div>

        <Panel className="mt-3 overflow-hidden">
          <PanelHead
            index="e"
            title="In focus"
            meta={active[0]?.name ?? "Nothing in focus"}
            action={
              active[0] ? (
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: active[0].id }}
                  className="rounded-lg border border-line bg-panel/70 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-ink/5"
                >
                  Open project →
                </Link>
              ) : null
            }
          />
          <div className="grid grid-cols-12 gap-3 p-4">
            <div className="col-span-12 overflow-hidden rounded-xl border border-line bg-paper/40 lg:col-span-7">
              <div className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft/70">
                <span>Next up</span>
                <span className="w-20 text-right">Due</span>
              </div>
              {openTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-t border-line/60 px-3 py-2.5 first:border-t-0"
                >
                  <div className="truncate text-[13px] font-medium">{t.title}</div>
                  <div className="w-20 text-right font-mono text-[10.5px] text-ink-soft">{t.dueDate}</div>
                </div>
              ))}
              {openTasks.length === 0 ? (
                <div className="p-3">
                  <Empty text="Everything is done" />
                </div>
              ) : null}
            </div>

            <div className="col-span-12 rounded-xl border border-line bg-paper/40 p-4 lg:col-span-5">
              <div className="label-mono mb-3">History</div>
              <Timeline
                items={activity.slice(0, 4).map((a) => ({
                  id: a.id,
                  text: a.text,
                  meta: relativeTime(a.at),
                  tone: a.tone,
                }))}
              />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
