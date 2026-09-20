import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { TextInput } from "@/components/forms";
import { Empty, Panel, PanelHead, Timeline, relativeTime } from "@/components/kit";
import { useOrgData, useStore } from "@/lib/store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Archivist" },
      { name: "description", content: "A full running record of everything created, changed and closed." },
      { property: "og:title", content: "History — Archivist" },
      { property: "og:description", content: "A full running record of everything created, changed and closed." },
    ],
  }),
  component: History,
});

function History() {
  const { org } = useStore();
  const { activity, projects } = useOrgData();
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string>("all");

  const visible = activity
    .filter((a) => (projectId === "all" ? true : a.projectId === projectId))
    .filter((a) => a.text.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageHeader title="History" crumb={`${org?.name ?? ""} · ${activity.length} entries`} />

      <div className="px-6 py-7 md:px-8">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the record…" />

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setProjectId("all")}
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
              projectId === "all" ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/30"
            }`}
          >
            Everything
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setProjectId(p.id)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                projectId === p.id ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/30"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <Panel className="mt-3">
          <PanelHead index="a" title="The record" meta={`${visible.length} shown`} />
          <div className="px-4 pb-4">
            {visible.length === 0 ? (
              <Empty text="Nothing recorded yet" />
            ) : (
              <Timeline
                items={visible.map((a) => ({
                  id: a.id,
                  text: a.text,
                  meta: relativeTime(a.at),
                  tone: a.tone,
                }))}
              />
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
