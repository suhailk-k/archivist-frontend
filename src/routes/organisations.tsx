import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PageHeader, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, TextArea, TextInput } from "@/components/forms";
import { Empty, Panel, PanelHead, formatDate } from "@/components/kit";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/organisations")({
  head: () => ({
    meta: [
      { title: "Organisations — Archivist" },
      { name: "description", content: "Create and manage the companies you run, each with its own projects and people." },
      { property: "og:title", content: "Organisations — Archivist" },
      { property: "og:description", content: "Create and manage the companies you run, each with its own projects and people." },
    ],
  }),
  component: Organisations,
});

function Organisations() {
  const { db, orgId, setOrgId, addOrganisation, updateOrganisation, removeOrganisation } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const startCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  const startEdit = (id: string) => {
    const o = db.organisations.find((x) => x.id === id);
    if (!o) return;
    setEditing(id);
    setName(o.name);
    setDescription(o.description);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Give the organisation a name");
      return;
    }
    if (editing) {
      updateOrganisation(editing, { name: name.trim(), description: description.trim() });
      toast.success("Organisation updated");
    } else {
      const created = addOrganisation({ name: name.trim(), description: description.trim() });
      setOrgId(created.id);
      toast.success("Organisation created");
    }
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Organisations"
        crumb="All companies"
        action={<PrimaryButton onClick={startCreate}>+ New organisation</PrimaryButton>}
      />

      <div className="px-6 py-7 md:px-8">
        <div className="grid gap-3 md:grid-cols-2">
          {db.organisations.map((o) => {
            const projects = db.projects.filter((p) => p.orgId === o.id);
            const members = db.members.filter((m) => m.orgId === o.id);
            const isCurrent = o.id === orgId;
            return (
              <Panel key={o.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-ink font-display text-[15px] italic text-paper">
                    {o.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-[18px] font-medium">{o.name}</h3>
                      {isCurrent ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9.5px] text-accent ring-1 ring-accent/10">
                          current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{o.description || "No description yet."}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      <span>{projects.length} projects</span>
                      <span>{members.length} people</span>
                      <span>since {formatDate(o.createdAt.slice(0, 10))}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!isCurrent ? <GhostButton onClick={() => setOrgId(o.id)}>Switch to this</GhostButton> : null}
                  <GhostButton onClick={() => startEdit(o.id)}>Edit</GhostButton>
                  <GhostButton
                    onClick={() => {
                      if (db.organisations.length === 1) {
                        toast.error("Keep at least one organisation");
                        return;
                      }
                      removeOrganisation(o.id);
                      if (isCurrent) setOrgId(db.organisations.find((x) => x.id !== o.id)!.id);
                      toast.success("Organisation removed");
                    }}
                  >
                    Delete
                  </GhostButton>
                </div>
              </Panel>
            );
          })}
        </div>

        {db.organisations.length === 0 ? (
          <div className="mt-3">
            <Empty text="No organisations yet" />
          </div>
        ) : null}

        <Panel className="mt-3">
          <PanelHead index="a" title="What is Elance?" />
          <p className="px-4 pb-5 text-[13px] leading-relaxed text-ink-soft">
            Elance was one of the first large freelance marketplaces, launched in 1999. Businesses posted jobs, freelancers
            bid on them, and the platform handled contracts, milestones and payments. In 2013 it merged with oDesk and the
            combined company was renamed Upwork in 2015, so the original Elance brand no longer operates. Here it is simply
            used as the name of one of your organisations — rename it any time with the Edit button above.
          </p>
        </Panel>
      </div>

      <Modal open={open} title={editing ? "Edit organisation" : "New organisation"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Elance" />
          </Field>
          <Field label="Description">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this company does" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing ? "Save changes" : "Create"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
