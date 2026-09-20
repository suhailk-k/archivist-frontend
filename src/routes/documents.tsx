import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/app-shell";
import { SelectInput, TextArea, TextInput } from "@/components/forms";
import { Empty, Panel, PanelHead, relativeTime } from "@/components/kit";
import { useOrgData, useStore } from "@/lib/store";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Archivist" },
      { name: "description", content: "Every specification, runbook and reference kept against your projects." },
      { property: "og:title", content: "Documents — Archivist" },
      { property: "og:description", content: "Every specification, runbook and reference kept against your projects." },
    ],
  }),
  component: Documents,
});

function Documents() {
  const { org, orgId, addDoc, updateDoc, removeDoc } = useStore();
  const { docs, projects, members } = useOrgData();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", kind: "Spec", link: "", projectId: "", ownerId: "", notes: "" });

  const visible = docs
    .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.kind.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader title="Documents" crumb={`${org?.name ?? ""} · ${docs.length} records`} />

      <div className="px-6 py-7 md:px-8">
        <Panel>
          <PanelHead index="a" title="Add a document" />
          <div className="grid gap-2 px-4 md:grid-cols-3">
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
            <TextInput value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="Kind (Spec, Contract…)" />
            <TextInput value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Link (optional)" />
            <SelectInput value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
            <SelectInput value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">Owner</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
            <div />
          </div>
          <div className="px-4 pt-2">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
          </div>
          <div className="px-4 py-3">
            <PrimaryButton
              onClick={() => {
                if (!form.title.trim()) {
                  toast.error("Give the document a title");
                  return;
                }
                addDoc({
                  orgId,
                  projectId: form.projectId || null,
                  title: form.title.trim(),
                  kind: form.kind,
                  link: form.link,
                  ownerId: form.ownerId || null,
                  notes: form.notes,
                });
                setForm({ title: "", kind: "Spec", link: "", projectId: "", ownerId: "", notes: "" });
                toast.success("Document added");
              }}
            >
              Add document
            </PrimaryButton>
          </div>
        </Panel>

        <div className="mt-3">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…" />
        </div>

        <Panel className="mt-3 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft/70">
            <span>Document</span>
            <span className="w-32">Project</span>
            <span className="w-24">Owner</span>
            <span className="w-24 text-right">Updated</span>
          </div>
          {visible.length === 0 ? (
            <div className="p-4">
              <Empty text="No documents found" />
            </div>
          ) : null}
          {visible.map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-line/50 px-4 py-2.5 last:border-b-0 hover:bg-ink/[0.03]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-accent">▤</span>
                  <input
                    value={d.title}
                    onChange={(e) => updateDoc(d.id, { title: e.target.value })}
                    className="min-w-0 flex-1 truncate bg-transparent text-[13px] font-medium outline-none focus:text-accent"
                  />
                  <span className="font-mono text-[9.5px] text-ink-soft">{d.kind}</span>
                  {d.link ? (
                    <a href={d.link} target="_blank" rel="noreferrer" className="font-mono text-[9.5px] text-accent hover:underline">
                      open
                    </a>
                  ) : null}
                </div>
                {d.notes ? <p className="mt-0.5 truncate text-[12px] text-ink-soft">{d.notes}</p> : null}
              </div>
              <div className="w-32 truncate font-mono text-[10.5px] text-ink-soft">
                {projects.find((p) => p.id === d.projectId)?.name ?? "—"}
              </div>
              <div className="w-24 truncate font-mono text-[10.5px] text-ink-soft">
                {members.find((m) => m.id === d.ownerId)?.name ?? "—"}
              </div>
              <div className="flex w-24 items-center justify-end gap-2 font-mono text-[10.5px] text-ink-soft">
                {relativeTime(d.updatedAt)}
                <button onClick={() => removeDoc(d.id)} className="hover:text-rose">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
