import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, SelectInput, TextArea, TextInput } from "@/components/forms";
import { useStore } from "@/lib/store";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/types";

const STATUSES: ProjectStatus[] = ["planning", "in_progress", "review", "blocked", "done"];

export function EditProjectModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const { db, updateProject } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const members = db.members.filter((m) => m.orgId === project.orgId);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    status: ProjectStatus;
    ownerId: string;
    startDate: string;
    dueDate: string;
  }>({
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
