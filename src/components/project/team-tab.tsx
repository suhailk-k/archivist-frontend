import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, TextInput } from "@/components/forms";
import { Empty } from "@/components/kit";
import { useStore } from "@/lib/store";
import type { Member, Project } from "@/lib/types";

/** The Team tab: assigned members, plus modals to add existing or brand-new organisation members. */
export function TeamTab({
  project,
  members,
  assignedMembers,
}: {
  project: Project;
  members: Member[];
  assignedMembers: Member[];
}) {
  const { updateProject, addMember } = useStore();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ name: "", role: "", email: "" });

  const removeMember = (memberId: string) => {
    const removed = members.find((m) => m.id === memberId);
    updateProject(project.id, { memberIds: project.memberIds.filter((id) => id !== memberId) });
    if (removed) toast.success(`${removed.name} removed from project`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold text-ink">Team</div>
          <div className="text-[11px] text-ink-soft">
            {assignedMembers.length} assigned · {members.length} in organisation
          </div>
        </div>
        <GhostButton
          onClick={() => {
            setSelectedMemberIds([]);
            setAddMemberOpen(true);
          }}
        >
          + Add member
        </GhostButton>
      </div>
      {assignedMembers.map((member) => (
        <div key={member.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5">
          <div className="grid size-8 place-items-center rounded-full bg-accent-soft text-[11px] text-accent">{member.name.slice(0, 1)}</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">{member.name}</div>
            <div className="text-[11px] text-ink-soft">{member.role}</div>
          </div>
          <div className="ml-auto">
            <GhostButton onClick={() => removeMember(member.id)}>Remove</GhostButton>
          </div>
        </div>
      ))}
      {assignedMembers.length === 0 ? <Empty text="No project team members yet" /> : null}

      <Modal
        open={addMemberOpen}
        title="Add members to project"
        onClose={() => {
          setSelectedMemberIds([]);
          setAddMemberOpen(false);
        }}
      >
        <div className="space-y-3">
          <Field label={`Organisation members · ${selectedMemberIds.length} selected`}>
            <div
              className="max-h-64 space-y-2 overflow-y-auto pr-1"
              role="listbox"
              aria-label="Organisation members available for this project"
              aria-multiselectable="true"
            >
              {members
                .filter((member) => !project.memberIds.includes(member.id))
                .map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() =>
                        setSelectedMemberIds((current) =>
                          isSelected ? current.filter((id) => id !== member.id) : [...current, member.id],
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent/70 ${
                        isSelected
                          ? "border-accent bg-accent/10 ring-1 ring-accent/50"
                          : "border-line bg-paper/40 hover:border-accent/60 hover:bg-panel/70"
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                          isSelected ? "bg-accent text-paper" : "bg-accent-soft text-accent"
                        }`}
                      >
                        {isSelected ? "✓" : member.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">{member.name}</span>
                        <span className="block truncate font-mono text-[11px] text-ink-soft">{member.role || "No role set"}</span>
                      </span>
                    </button>
                  );
                })}
              {members.every((member) => project.memberIds.includes(member.id)) ? (
                <p role="status" className="font-mono text-[11px] text-ink-soft">
                  All organisation members are already on this project.
                </p>
              ) : null}
            </div>
          </Field>
          <button
            type="button"
            aria-label="Add a new organisation member"
            className="font-mono text-[11px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            onClick={() => {
              setSelectedMemberIds([]);
              setAddMemberOpen(false);
              setNewMemberForm({ name: "", role: "", email: "" });
              setNewMemberOpen(true);
            }}
          >
            New person not listed? Add organisation member →
          </button>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <GhostButton
              onClick={() => {
                setSelectedMemberIds([]);
                setAddMemberOpen(false);
              }}
            >
              Cancel
            </GhostButton>
            <PrimaryButton
              disabled={selectedMemberIds.length === 0}
              onClick={() => {
                const selectedIds = selectedMemberIds.filter((id) => !project.memberIds.includes(id));
                if (selectedIds.length === 0) {
                  toast.error("Choose at least one member");
                  return;
                }
                const selectedMembers = members.filter((member) => selectedIds.includes(member.id));
                if (selectedMembers.length === 0) {
                  toast.error("No valid organisation members selected");
                  return;
                }
                updateProject(project.id, {
                  memberIds: [...project.memberIds, ...selectedMembers.map((member) => member.id)],
                });
                toast.success(`${selectedMembers.length} member${selectedMembers.length === 1 ? "" : "s"} added to project`);
                setSelectedMemberIds([]);
                setAddMemberOpen(false);
              }}
            >
              {selectedMemberIds.length > 0 ? `Add ${selectedMemberIds.length} to project` : "Add to project"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <Modal open={newMemberOpen} title="Add new organisation member" onClose={() => setNewMemberOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput
              autoFocus
              value={newMemberForm.name}
              onChange={(event) => setNewMemberForm({ ...newMemberForm, name: event.target.value })}
              placeholder="Full name"
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={newMemberForm.role}
              onChange={(event) => setNewMemberForm({ ...newMemberForm, role: event.target.value })}
              placeholder="Design lead"
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={newMemberForm.email}
              onChange={(event) => setNewMemberForm({ ...newMemberForm, email: event.target.value })}
              placeholder="name@example.com"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setNewMemberOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => {
                const name = newMemberForm.name.trim();
                if (!name) {
                  toast.error("A name is required");
                  return;
                }
                const created = addMember({
                  orgId: project.orgId,
                  name,
                  role: newMemberForm.role.trim(),
                  email: newMemberForm.email.trim(),
                });
                updateProject(project.id, {
                  memberIds: [...project.memberIds, created.id],
                });
                toast.success(`${created.name} added to project`);
                setNewMemberForm({ name: "", role: "", email: "" });
                setNewMemberOpen(false);
              }}
            >
              Add member
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
