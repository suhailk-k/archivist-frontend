import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PageHeader, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, SelectInput, TextArea, TextInput } from "@/components/forms";
import { Empty, Panel, Pill, Progress, formatDate } from "@/components/kit";
import { projectProgress, useOrgData, useStore } from "@/lib/store";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type ProjectStatus } from "@/lib/types";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Archivist" },
      { name: "description", content: "Every project in the current organisation, with owner, progress and status." },
      { property: "og:title", content: "Projects — Archivist" },
      { property: "og:description", content: "Every project in the current organisation, with owner, progress and status." },
    ],
  }),
  component: ProjectsIndex,
});

const STATUSES: ProjectStatus[] = ["planning", "in_progress", "review", "blocked", "done"];

function ProjectsIndex() {
  const { org, orgId, addProject } = useStore();
  const { projects, members, tasks } = useOrgData();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning" as ProjectStatus,
    ownerId: "",
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
  });

  const visible = projects.filter((p) => filter === "all" || p.status === filter);

  const create = () => {
    if (!form.name.trim()) {
      toast.error("Give the project a name");
      return;
    }
    addProject({
      orgId,
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      ownerId: form.ownerId || null,
      memberIds: form.ownerId ? [form.ownerId] : [],
      startDate: form.startDate,
      dueDate: form.dueDate,
    });
    toast.success("Project created");
    setOpen(false);
    setForm({ name: "", description: "", status: "planning", ownerId: "", startDate: new Date().toISOString().slice(0, 10), dueDate: "" });
  };

  return (
    <>
      <PageHeader
        title="Projects"
        crumb={`${org?.name ?? ""} · ${projects.length} total`}
        action={<PrimaryButton onClick={() => setOpen(true)}>+ New project</PrimaryButton>}
      />

      <div className="px-6 py-7 md:px-8">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors ${
                filter === s ? "bg-ink text-paper" : "border border-line bg-panel/70 text-ink-soft hover:bg-ink/5"
              }`}
            >
              {s === "all" ? "All" : PROJECT_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? <Empty text="No projects here yet" /> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => {
            const owner = members.find((m) => m.id === p.ownerId);
            return (
              <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }}>
                <Panel className="h-full p-4 transition-colors hover:bg-panel">
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-medium">{p.name}</h3>
                    <Pill tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
                    {p.description || "No description."}
                  </p>
                  <div className="mt-3">
                    <Progress value={projectProgress(tasks, p.id)} tone={PROJECT_STATUS_TONE[p.status]} />
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-ink-soft">
                    <span>{owner?.name ?? "Unassigned"}</span>
                    <span>{p.dueDate ? `due ${formatDate(p.dueDate)}` : "no due date"}</span>
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      </div>

      <Modal open={open} title="New project" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Brand Refresh 2025" />
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
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={create}>Create project</PrimaryButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
