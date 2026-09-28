import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { ConfirmModal, SelectInput, TextInput } from "@/components/forms";
import { Empty, Pill, formatDate } from "@/components/kit";
import { useStore } from "@/lib/store";
import type { Priority } from "@/lib/types";

/** The Planning tab: task board grouped by phase, plus a milestones panel. */
export function PlanningTab({ projectId }: { projectId: string }) {
  const { db, addTask, updateTask, removeTask, addMilestone, updateMilestone, removeMilestone } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const tasks = db.tasks.filter((t) => t.projectId === projectId);
  const milestones = db.milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.date.localeCompare(b.date));
  const members = db.members.filter((m) => m.orgId === project.orgId);

  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("Build");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [assigneeId, setAssigneeId] = useState("");
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDelete = tasks.find((t) => t.id === pendingDeleteId);

  const phases = Array.from(new Set(tasks.map((t) => t.phase || "Unsorted")));

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <ConfirmModal
        open={pendingDelete !== undefined}
        title="Delete this task?"
        description={`"${pendingDelete?.title ?? ""}" will be permanently deleted. This can't be undone.`}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeTask(pendingDelete.id);
          toast.success("Task deleted");
        }}
      />
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-panel p-4 shadow-sm">
          <div className="label-mono mb-3">Add a task</div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
            <PrimaryButton
              onClick={() => {
                if (!title.trim()) return;
                addTask({
                  orgId: project.orgId,
                  projectId,
                  title: title.trim(),
                  phase: phase.trim() || "Unsorted",
                  done: false,
                  priority,
                  dueDate,
                  assigneeId: assigneeId || null,
                });
                setTitle("");
                toast.success("Task added");
              }}
            >
              Add task
            </PrimaryButton>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <TextInput value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Phase" />
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <SelectInput value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </SelectInput>
            <SelectInput value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        {phases.length === 0 ? <Empty text="No tasks planned yet" /> : null}

        {phases.map((ph) => (
          <div key={ph} className="rounded-xl border border-line bg-panel p-4 shadow-sm">
            <div className="label-mono mb-2">{ph}</div>
            <div className="space-y-1">
              {tasks
                .filter((t) => (t.phase || "Unsorted") === ph)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-panel/70">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => updateTask(t.id, { done: e.target.checked })}
                      className="size-4 accent-[oklch(0.535_0.193_266)]"
                    />
                    <span className={`truncate text-[13px] ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</span>
                    {t.priority === "high" ? <Pill tone="rose">high</Pill> : null}
                    <select
                      aria-label={`Assignee for ${t.title}`}
                      value={t.assigneeId ?? ""}
                      onChange={(e) => updateTask(t.id, { assigneeId: e.target.value || null })}
                      className="ml-auto max-w-32 truncate bg-transparent text-[11px] text-ink-soft outline-none hover:text-ink"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-ink-soft/70">{t.dueDate || "—"}</span>
                    <button onClick={() => setPendingDeleteId(t.id)} aria-label={`Delete ${t.title}`} className="text-[11px] text-ink-soft/70 hover:text-rose">
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-panel p-4 shadow-sm">
        <div className="label-mono mb-3">Milestones</div>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.done}
                onChange={(e) => updateMilestone(m.id, { done: e.target.checked })}
                className="size-4 accent-[oklch(0.608_0.113_160)]"
              />
              <span className={`truncate text-[12.5px] ${m.done ? "text-ink-soft line-through" : ""}`}>{m.title}</span>
              <span className="ml-auto text-[11px] text-ink-soft/70">{formatDate(m.date)}</span>
              <button onClick={() => removeMilestone(m.id)} className="text-[11px] text-ink-soft/70 hover:text-rose">
                ✕
              </button>
            </div>
          ))}
          {milestones.length === 0 ? <Empty text="No milestones" /> : null}
        </div>
        <div className="mt-3 space-y-2">
          <TextInput value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="Milestone name" />
          <TextInput type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} />
          <GhostButton
            onClick={() => {
              if (!msTitle.trim() || !msDate) {
                toast.error("Milestone needs a name and a date");
                return;
              }
              addMilestone({ projectId, title: msTitle.trim(), date: msDate, done: false });
              setMsTitle("");
              setMsDate("");
            }}
          >
            Add milestone
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
