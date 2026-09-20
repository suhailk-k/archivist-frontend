import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PageHeader, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, TextInput } from "@/components/forms";
import { Empty, Panel, PanelHead } from "@/components/kit";
import { useOrgData, useStore } from "@/lib/store";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Members — Archivist" },
      { name: "description", content: "The people in this organisation and the projects they are involved in." },
      { property: "og:title", content: "Members — Archivist" },
      { property: "og:description", content: "The people in this organisation and the projects they are involved in." },
    ],
  }),
  component: Members,
});

function Members() {
  const { org, orgId, addMember, updateMember, removeMember } = useStore();
  const { members, projects } = useOrgData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: "", email: "" });

  const save = () => {
    if (!form.name.trim()) {
      toast.error("A name is required");
      return;
    }
    if (editing) {
      updateMember(editing, { ...form, name: form.name.trim() });
      toast.success("Member updated");
    } else {
      addMember({ orgId, ...form, name: form.name.trim() });
      toast.success("Member added");
    }
    setOpen(false);
    setForm({ name: "", role: "", email: "" });
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Members"
        crumb={`${org?.name ?? ""} · ${members.length} people`}
        action={
          <PrimaryButton
            onClick={() => {
              setEditing(null);
              setForm({ name: "", role: "", email: "" });
              setOpen(true);
            }}
          >
            + Add member
          </PrimaryButton>
        }
      />

      <div className="px-6 py-7 md:px-8">
        {members.length === 0 ? <Empty text="No people added yet" /> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => {
            const involved = projects.filter((p) => p.memberIds.includes(m.id) || p.ownerId === m.id);
            return (
              <Panel key={m.id}>
                <PanelHead title={m.name} meta={m.role} />
                <div className="px-4 pb-4">
                  <div className="font-mono text-[10.5px] text-ink-soft">{m.email || "no email"}</div>
                  <div className="label-mono mt-3">Involved in</div>
                  <div className="mt-1.5 space-y-1">
                    {involved.length === 0 ? (
                      <div className="font-mono text-[10.5px] text-ink-soft">No projects yet</div>
                    ) : null}
                    {involved.map((p) => (
                      <Link
                        key={p.id}
                        to="/projects/$projectId"
                        params={{ projectId: p.id }}
                        className="flex items-center gap-2 text-[12.5px] hover:text-accent"
                      >
                        <span className="size-1.5 rounded-full bg-accent" />
                        <span className="truncate">{p.name}</span>
                        {p.ownerId === m.id ? <span className="font-mono text-[9.5px] text-ink-soft">owner</span> : null}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <GhostButton
                      onClick={() => {
                        setEditing(m.id);
                        setForm({ name: m.name, role: m.role, email: m.email });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </GhostButton>
                    <GhostButton
                      onClick={() => {
                        removeMember(m.id);
                        toast.success("Member removed");
                      }}
                    >
                      Remove
                    </GhostButton>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>

      <Modal open={open} title={editing ? "Edit member" : "Add member"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Role">
            <TextInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Design lead" />
          </Field>
          <Field label="Email">
            <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing ? "Save changes" : "Add member"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
