import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/app-shell";
import { ConfirmModal, SelectInput, TextInput } from "@/components/forms";
import { Empty, ListSkeleton, Panel, PanelHead, Pill, Stat } from "@/components/kit";
import { useOrgData, useStore } from "@/lib/store";
import type { Priority, Task } from "@/lib/types";

export const Route = createFileRoute("/todos")({
  head: () => ({
    meta: [
      { title: "To-do — Archivist" },
      { name: "description", content: "One list of everything open across all your projects and admin work." },
      { property: "og:title", content: "To-do — Archivist" },
      { property: "og:description", content: "One list of everything open across all your projects and admin work." },
    ],
  }),
  component: Todos,
});

function Todos() {
  const { org, orgId, addTask, updateTask, removeTask, hydrated } = useStore();
  const { tasks, projects, members } = useOrgData();
  const [view, setView] = useState<"open" | "done" | "all">("open");
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const emptyForm = { title: "", projectId: "", assigneeId: "", dueDate: "", priority: "normal" as Priority };
  const [form, setForm] = useState(emptyForm);

  const visible = tasks
    .filter((t) => (view === "all" ? true : view === "open" ? !t.done : t.done))
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter((t) => !t.done && t.dueDate && t.dueDate < todayStr);

  const add = () => {
    if (!form.title.trim()) {
      toast.error("Write the to-do first");
      return;
    }
    addTask({
      orgId,
      projectId: form.projectId || null,
      title: form.title.trim(),
      phase: form.projectId ? "Unsorted" : "Admin",
      done: false,
      priority: form.priority,
      dueDate: form.dueDate,
      assigneeId: form.assigneeId || null,
    });
    setForm(emptyForm);
    toast.success("Added to your list");
  };

  return (
    <>
      <PageHeader title="To-do" crumb={`${org?.name ?? ""} · Everything open`} />
      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete this to-do?"
        description={`"${pendingDelete?.title ?? ""}" will be permanently deleted. This can't be undone.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeTask(pendingDelete.id);
          toast.success("To-do deleted");
        }}
      />

      <div className="px-6 py-7 md:px-8">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Open" value={tasks.filter((t) => !t.done).length} />
          <Stat label="Overdue" value={overdue.length} note="past due" tone="rose" />
          <Stat label="Completed" value={tasks.filter((t) => t.done).length} tone="verd" />
        </div>

        <Panel className="mt-3">
          <PanelHead index="a" title="Add a to-do" />
          <div className="grid gap-2 px-4 pb-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="What needs doing?"
            />
            <SelectInput value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
            <SelectInput value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
            <TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </SelectInput>
            <PrimaryButton onClick={add}>Add</PrimaryButton>
          </div>
        </Panel>

        <div className="mt-3 flex gap-1.5">
          {(["open", "done", "all"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                view === v ? "bg-ink text-paper" : "border border-line bg-panel/70 text-ink-soft hover:bg-ink/5"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <Panel className="mt-3 p-2">
          {!hydrated ? (
            <div className="p-2">
              <ListSkeleton />
            </div>
          ) : null}
          {hydrated && visible.length === 0 ? (
            <div className="p-2">
              <Empty text="Nothing here" />
            </div>
          ) : null}
          {hydrated && visible.map((t) => {
            const project = projects.find((p) => p.id === t.projectId);
            const isOverdue = !t.done && t.dueDate && t.dueDate < todayStr;
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 hover:bg-ink/[0.035]">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => updateTask(t.id, { done: e.target.checked })}
                  className="size-4 accent-[oklch(0.535_0.193_266)]"
                />
                <span className={`truncate text-[13.5px] ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</span>
                {t.priority === "high" ? <Pill tone="rose">high</Pill> : null}
                <span className="ml-auto hidden font-mono text-[11px] text-ink-soft sm:block">
                  {project?.name ?? "No project"}
                </span>
                <select
                  aria-label={`Assignee for ${t.title}`}
                  value={t.assigneeId ?? ""}
                  onChange={(e) => updateTask(t.id, { assigneeId: e.target.value || null })}
                  className="max-w-32 truncate bg-transparent font-mono text-[11px] text-ink-soft outline-none hover:text-ink"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <span className={`w-24 text-right font-mono text-[11px] ${isOverdue ? "text-rose" : "text-ink-soft"}`}>
                  {t.dueDate || "—"}
                </span>
                <button onClick={() => setPendingDelete(t)} aria-label={`Delete ${t.title}`} className="font-mono text-[11px] text-ink-soft hover:text-rose">
                  ✕
                </button>
              </div>
            );
          })}
        </Panel>
      </div>
    </>
  );
}
