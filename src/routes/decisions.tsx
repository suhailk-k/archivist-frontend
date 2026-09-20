import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/app-shell";
import { SelectInput, TextArea, TextInput } from "@/components/forms";
import { Empty, Panel, PanelHead, Pill, formatDate } from "@/components/kit";
import type { DecisionStatus } from "@/lib/types";
import { useOrgData, useStore } from "@/lib/store";

export const Route = createFileRoute("/decisions")({
  head: () => ({
    meta: [
      { title: "Decisions — Archivist" },
      { name: "description", content: "A record of every decision made, why it was made and who made it." },
      { property: "og:title", content: "Decisions — Archivist" },
      { property: "og:description", content: "A record of every decision made, why it was made and who made it." },
    ],
  }),
  component: Decisions,
});

const STATUS: { value: DecisionStatus; label: string; tone: "amber" | "verd" | "rose" }[] = [
  { value: "open", label: "Open", tone: "amber" },
  { value: "approved", label: "Approved", tone: "verd" },
  { value: "rejected", label: "Rejected", tone: "rose" },
];

const today = () => new Date().toISOString().slice(0, 10);

function Decisions() {
  const { org, orgId, addDecision, updateDecision, removeDecision } = useStore();
  const { decisions, projects, members } = useOrgData();
  const [filter, setFilter] = useState<DecisionStatus | "all">("all");
  const [form, setForm] = useState({ title: "", rationale: "", projectId: "", decidedById: "" });

  const visible = decisions
    .filter((d) => filter === "all" || d.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader title="Decisions" crumb={`${org?.name ?? ""} · ${decisions.filter((d) => d.status === "open").length} open`} />

      <div className="px-6 py-7 md:px-8">
        <Panel>
          <PanelHead index="a" title="Record a decision" />
          <div className="grid gap-2 px-4 md:grid-cols-3">
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Decision" />
            <SelectInput value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
            <SelectInput value={form.decidedById} onChange={(e) => setForm({ ...form, decidedById: e.target.value })}>
              <option value="">Decided by</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="px-4 pt-2">
            <TextArea
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              placeholder="Why this call was made, and what was ruled out"
            />
          </div>
          <div className="px-4 py-3">
            <PrimaryButton
              onClick={() => {
                if (!form.title.trim()) {
                  toast.error("Describe the decision");
                  return;
                }
                addDecision({
                  orgId,
                  projectId: form.projectId || null,
                  title: form.title.trim(),
                  status: "open",
                  rationale: form.rationale,
                  decidedById: form.decidedById || null,
                  date: today(),
                });
                setForm({ title: "", rationale: "", projectId: "", decidedById: "" });
                toast.success("Decision recorded");
              }}
            >
              Record
            </PrimaryButton>
          </div>
        </Panel>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(["all", ...STATUS.map((s) => s.value)] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v as DecisionStatus | "all")}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                filter === v ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/30"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <Panel className="mt-3">
          {visible.length === 0 ? (
            <div className="p-4">
              <Empty text="No decisions recorded" />
            </div>
          ) : null}
          {visible.map((d) => (
            <div key={d.id} className="border-b border-line/50 px-4 py-3 last:border-b-0">
              <div className="flex items-center gap-2">
                <input
                  value={d.title}
                  onChange={(e) => updateDecision(d.id, { title: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none focus:text-accent"
                />
                <Pill tone={STATUS.find((s) => s.value === d.status)?.tone ?? "amber"}>
                  {STATUS.find((s) => s.value === d.status)?.label ?? d.status}
                </Pill>
                <button onClick={() => removeDecision(d.id)} className="font-mono text-[10.5px] text-ink-soft hover:text-rose">
                  ✕
                </button>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {formatDate(d.date)} · {projects.find((p) => p.id === d.projectId)?.name ?? "No project"} ·{" "}
                {members.find((m) => m.id === d.decidedById)?.name ?? "Unassigned"}
              </div>
              <TextArea
                value={d.rationale}
                onChange={(e) => updateDecision(d.id, { rationale: e.target.value })}
                placeholder="Rationale"
              />
              <div className="mt-2 flex gap-1.5">
                {STATUS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateDecision(d.id, { status: s.value })}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] transition-colors ${
                      d.status === s.value ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/30"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
