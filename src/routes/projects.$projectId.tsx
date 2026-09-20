import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PageHeader, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, SelectInput, TextArea, TextInput } from "@/components/forms";
import { DateChip, Empty, Panel, Pill, Progress, Timeline, formatDate, relativeTime } from "@/components/kit";
import { projectProgress, useStore } from "@/lib/store";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type Priority, type ProjectStatus } from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project — Archivist" },
      { name: "description", content: "Project overview, plan, documents, meetings, decisions, team and full history." },
      { property: "og:title", content: "Project — Archivist" },
      { property: "og:description", content: "Project overview, plan, documents, meetings, decisions, team and full history." },
    ],
  }),
  component: ProjectDetail,
});

const TABS = ["Overview", "Planning", "Documents", "Meetings", "Decisions", "Team", "History"] as const;
type Tab = (typeof TABS)[number];

const STATUSES: ProjectStatus[] = ["planning", "in_progress", "review", "blocked", "done"];

function ProjectDetail() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const store = useStore();
  const { db } = store;
  const [tab, setTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);

  const project = db.projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <>
        <PageHeader title="Project not found" crumb="Projects" />
        <div className="px-8 py-7">
          <Empty text="This project no longer exists" />
          <div className="mt-3">
            <Link to="/projects" className="font-mono text-[11px] text-accent hover:underline">
              ← Back to projects
            </Link>
          </div>
        </div>
      </>
    );
  }

  const members = db.members.filter((m) => m.orgId === project.orgId);
  const tasks = db.tasks.filter((t) => t.projectId === project.id);
  const milestones = db.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.date.localeCompare(b.date));
  const docs = db.docs.filter((d) => d.projectId === project.id);
  const meetings = db.meetings.filter((m) => m.projectId === project.id).sort((a, b) => a.date.localeCompare(b.date));
  const decisions = db.decisions.filter((d) => d.projectId === project.id);
  const history = db.activity.filter((a) => a.projectId === project.id);
  const owner = members.find((m) => m.id === project.ownerId);
  const progress = projectProgress(db.tasks, project.id);

  return (
    <>
      <PageHeader
        title={project.name}
        crumb={`${db.organisations.find((o) => o.id === project.orgId)?.name ?? ""} · Project`}
        action={
          <>
            <GhostButton onClick={() => setEditOpen(true)}>Edit</GhostButton>
            <PrimaryButton
              onClick={() => {
                store.removeProject(project.id);
                toast.success("Project deleted");
              }}
            >
              Delete
            </PrimaryButton>
          </>
        }
      />

      <div className="px-6 py-7 md:px-8">
        <Panel className="overflow-hidden">
          <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Pill>
                <span className="font-mono text-[10px] text-ink-soft">
                  {project.startDate ? formatDate(project.startDate) : "—"} → {project.dueDate ? formatDate(project.dueDate) : "—"}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
                {project.description || "No description yet."}
              </p>
              <div className="mt-4">
                <Progress value={progress} tone={PROJECT_STATUS_TONE[project.status]} />
              </div>
            </div>
            <div className="flex gap-6 md:flex-col md:gap-3">
              <div>
                <div className="label-mono">Owner</div>
                <div className="mt-1 text-[13px] font-medium">{owner?.name ?? "Unassigned"}</div>
              </div>
              <div>
                <div className="label-mono">Team</div>
                <div className="mt-1 text-[13px] font-medium">{project.memberIds.length} people</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-t border-line/60 px-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-3 py-2 text-[12.5px] transition-colors ${
                  tab === t ? "font-medium text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t}
                {tab === t ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
              </button>
            ))}
          </div>

          <div className="border-t border-line/60 p-4">
            {tab === "Overview" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-line bg-paper/40 p-4">
                  <div className="label-mono mb-3">Open tasks</div>
                  {tasks.filter((t) => !t.done).length === 0 ? <Empty text="Nothing open" /> : null}
                  <div className="space-y-2">
                    {tasks
                      .filter((t) => !t.done)
                      .slice(0, 6)
                      .map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-[13px]">
                          <span className="size-1.5 rounded-full bg-accent" />
                          <span className="truncate">{t.title}</span>
                          <span className="ml-auto font-mono text-[10px] text-ink-soft">{t.dueDate}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-paper/40 p-4">
                  <div className="label-mono mb-3">Milestones</div>
                  {milestones.length === 0 ? <Empty text="No milestones set" /> : null}
                  <div className="space-y-2">
                    {milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-[13px]">
                        <span className={`size-1.5 rounded-full ${m.done ? "bg-verd" : "bg-line"}`} />
                        <span className="truncate">{m.title}</span>
                        <span className="ml-auto font-mono text-[10px] text-ink-soft">{formatDate(m.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "Planning" ? <PlanningTab projectId={project.id} /> : null}

            {tab === "Documents" ? (
              <DocsTab projectId={project.id} orgId={project.orgId} />
            ) : null}

            {tab === "Meetings" ? (
              <div className="space-y-2.5">
                {meetings.length === 0 ? <Empty text="No meetings for this project" /> : null}
                {meetings.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-3">
                    <DateChip date={m.date} />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium">{m.title}</div>
                      <div className="font-mono text-[10px] text-ink-soft">
                        {m.time} · {m.attendeeIds.length} attending
                      </div>
                      {m.notes ? <p className="mt-1.5 text-[12.5px] text-ink-soft">{m.notes}</p> : null}
                    </div>
                  </div>
                ))}
                <Link to="/meetings" className="inline-block font-mono text-[10.5px] text-accent hover:underline">
                  Schedule a meeting →
                </Link>
              </div>
            ) : null}

            {tab === "Decisions" ? (
              <div className="space-y-2.5">
                {decisions.length === 0 ? <Empty text="No decisions recorded" /> : null}
                {decisions.map((d) => (
                  <div key={d.id} className="rounded-xl border border-line bg-paper/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium">{d.title}</span>
                      <span className="ml-auto">
                        <Pill tone={d.status === "approved" ? "verd" : d.status === "rejected" ? "rose" : "amber"}>
                          {d.status}
                        </Pill>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink-soft">{d.rationale || "No rationale recorded."}</p>
                    <div className="mt-1.5 font-mono text-[9.5px] text-ink-soft">
                      {members.find((m) => m.id === d.decidedById)?.name ?? "—"} · {d.date}
                    </div>
                  </div>
                ))}
                <Link to="/decisions" className="inline-block font-mono text-[10.5px] text-accent hover:underline">
                  Log a decision →
                </Link>
              </div>
            ) : null}

            {tab === "Team" ? (
              <div className="space-y-2">
                {members.map((m) => {
                  const on = project.memberIds.includes(m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-paper/40 px-3 py-2.5">
                      <div className="grid size-8 place-items-center rounded-full bg-accent-soft font-mono text-[11px] text-accent">
                        {m.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{m.name}</div>
                        <div className="font-mono text-[10px] text-ink-soft">{m.role}</div>
                      </div>
                      <div className="ml-auto">
                        <GhostButton
                          onClick={() =>
                            store.updateProject(project.id, {
                              memberIds: on
                                ? project.memberIds.filter((x) => x !== m.id)
                                : [...project.memberIds, m.id],
                            })
                          }
                        >
                          {on ? "Remove" : "Add to project"}
                        </GhostButton>
                      </div>
                    </div>
                  );
                })}
                {members.length === 0 ? <Empty text="No people in this organisation yet" /> : null}
              </div>
            ) : null}

            {tab === "History" ? (
              <Timeline
                items={history.map((a) => ({ id: a.id, text: a.text, meta: relativeTime(a.at), tone: a.tone }))}
              />
            ) : null}
          </div>
        </Panel>
      </div>

      <EditProjectModal open={editOpen} onClose={() => setEditOpen(false)} projectId={project.id} />
    </>
  );
}

function EditProjectModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const { db, updateProject } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const members = db.members.filter((m) => m.orgId === project.orgId);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    ownerId: project.ownerId ?? "",
    startDate: project.startDate,
    dueDate: project.dueDate,
  });

  if (!open) return null;

  return (
    <Modal open={open} title="Edit project" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Owner">
            <SelectInput value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            onClick={() => {
              updateProject(projectId, { ...form, ownerId: form.ownerId || null });
              toast.success("Project updated");
              onClose();
            }}
          >
            Save changes
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function PlanningTab({ projectId }: { projectId: string }) {
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

  const phases = Array.from(new Set(tasks.map((t) => t.phase || "Unsorted")));

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-paper/40 p-4">
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
          <div key={ph} className="rounded-xl border border-line bg-paper/40 p-4">
            <div className="label-mono mb-2">{ph}</div>
            <div className="space-y-1">
              {tasks
                .filter((t) => (t.phase || "Unsorted") === ph)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-ink/[0.03]">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => updateTask(t.id, { done: e.target.checked })}
                      className="size-4 accent-[oklch(0.535_0.193_266)]"
                    />
                    <span className={`truncate text-[13px] ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</span>
                    {t.priority === "high" ? <Pill tone="rose">high</Pill> : null}
                    <span className="ml-auto font-mono text-[10px] text-ink-soft">{t.dueDate || "—"}</span>
                    <button onClick={() => removeTask(t.id)} className="font-mono text-[10px] text-ink-soft hover:text-rose">
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-paper/40 p-4">
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
              <span className="ml-auto font-mono text-[9.5px] text-ink-soft">{formatDate(m.date)}</span>
              <button onClick={() => removeMilestone(m.id)} className="font-mono text-[10px] text-ink-soft hover:text-rose">
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

function DocsTab({ projectId, orgId }: { projectId: string; orgId: string }) {
  const { db, addDoc, removeDoc } = useStore();
  const docs = db.docs.filter((d) => d.projectId === projectId);
  const members = db.members.filter((m) => m.orgId === orgId);
  const [form, setForm] = useState({ title: "", kind: "Spec", link: "", ownerId: "", notes: "" });

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line bg-paper/40">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft/70">
          <span>Document</span>
          <span className="w-24">Owner</span>
          <span className="w-20 text-right">Updated</span>
        </div>
        {docs.length === 0 ? (
          <div className="p-3">
            <Empty text="No documents yet" />
          </div>
        ) : null}
        {docs.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-line/60 px-3 py-2.5 first:border-t-0 hover:bg-ink/[0.03]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[11px] text-accent">▤</span>
              <span className="truncate text-[13px] font-medium">{d.title}</span>
              <span className="font-mono text-[9.5px] text-ink-soft">{d.kind}</span>
              {d.link ? (
                <a href={d.link} target="_blank" rel="noreferrer" className="font-mono text-[9.5px] text-accent hover:underline">
                  open
                </a>
              ) : null}
            </div>
            <div className="w-24 font-mono text-[10.5px] text-ink-soft">
              {members.find((m) => m.id === d.ownerId)?.name ?? "—"}
            </div>
            <div className="flex w-20 items-center justify-end gap-2 font-mono text-[10.5px] text-ink-soft">
              {relativeTime(d.updatedAt)}
              <button onClick={() => removeDoc(d.id)} className="hover:text-rose">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-paper/40 p-4">
        <div className="label-mono mb-3">Add a document</div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
          <TextInput value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="Kind" />
          <TextInput value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Link (optional)" />
          <SelectInput value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
            <option value="">Owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="mt-2">
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
        </div>
        <div className="mt-2">
          <PrimaryButton
            onClick={() => {
              if (!form.title.trim()) {
                toast.error("Give the document a title");
                return;
              }
              addDoc({ orgId, projectId, ...form, title: form.title.trim(), ownerId: form.ownerId || null });
              setForm({ title: "", kind: "Spec", link: "", ownerId: "", notes: "" });
              toast.success("Document added");
            }}
          >
            Add document
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
