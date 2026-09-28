import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { DocUploadField, type UploadedFileInfo } from "@/components/doc-upload-field";
import { Field, Modal, SelectInput, TextArea, TextInput } from "@/components/forms";
import { useStore } from "@/lib/store";
import type { Doc, ID, Member, Project } from "@/lib/types";

const HTTP_LINK = /^https?:\/\/\S+$/i;
const KIND_SUGGESTIONS = ["Spec", "Env", "Design", "Contract", "Runbook", "Report", "Meeting notes"];
const KIND_LIST_ID = "doc-kind-suggestions";

interface DocFormValues {
  title: string;
  kind: string;
  link: string;
  projectId: string;
  ownerId: string;
  notes: string;
}

type DocFields = Omit<Doc, "id" | "orgId" | "updatedAt" | "projectId">;

interface DocFormProps {
  heading: string;
  submitLabel: string;
  orgId: ID;
  initial: DocFormValues;
  initialFile: UploadedFileInfo | null;
  members: Member[];
  projects?: Project[] | undefined;
  onClose: () => void;
  onSubmit: (fields: DocFields, projectId: ID | null) => void;
}

function fileInfoOf(doc: Doc): UploadedFileInfo | null {
  if (!doc.fileId) return null;
  return { fileId: doc.fileId, fileName: doc.fileName, fileSize: doc.fileSize, fileMime: doc.fileMime };
}

/** Shared title/kind/owner/link/file/notes form used for both creating and editing a document. */
function DocForm({ heading, submitLabel, orgId, initial, initialFile, members, projects, onClose, onSubmit }: DocFormProps) {
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState<UploadedFileInfo | null>(initialFile);

  const submit = () => {
    const title = form.title.trim();
    const link = form.link.trim();
    if (!title) {
      toast.error("Give the document a title");
      return;
    }
    if (link && !HTTP_LINK.test(link)) {
      toast.error("Link must start with http:// or https://");
      return;
    }
    onSubmit(
      {
        title,
        kind: form.kind.trim(),
        link,
        notes: form.notes.trim(),
        ownerId: form.ownerId || null,
        fileId: file?.fileId ?? null,
        fileName: file?.fileName ?? "",
        fileSize: file?.fileSize ?? 0,
        fileMime: file?.fileMime ?? "",
      },
      form.projectId || null,
    );
    onClose();
  };

  return (
    <Modal open title={heading} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title">
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Backend environment setup" autoFocus />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <TextInput list={KIND_LIST_ID} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="Spec, Env…" />
            <datalist id={KIND_LIST_ID}>
              {KIND_SUGGESTIONS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </Field>
          <Field label="Owner">
            <SelectInput value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">No owner</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        {projects ? (
          <Field label="Project">
            <SelectInput value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="Link">
          <TextInput value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
        </Field>
        <Field label="File">
          <DocUploadField orgId={orgId} projectId={form.projectId || null} value={file} onChange={setFile} />
        </Field>
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Context, setup steps, where things live…"
            rows={4}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{submitLabel}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

interface EditDocModalProps {
  /** The document being edited; null keeps the modal closed. */
  doc: Doc | null;
  onClose: () => void;
  members: Member[];
  /** Omit to hide the project picker (e.g. inside a project's own Documents tab). */
  projects?: Project[] | undefined;
}

export function EditDocModal({ doc, onClose, members, projects }: EditDocModalProps) {
  const { updateDoc } = useStore();
  if (!doc) return null;
  return (
    // Keyed so reopening on another document re-seeds the form.
    <DocForm
      key={doc.id}
      heading="Edit document"
      submitLabel="Save changes"
      orgId={doc.orgId}
      initial={{
        title: doc.title,
        kind: doc.kind,
        link: doc.link,
        projectId: doc.projectId ?? "",
        ownerId: doc.ownerId ?? "",
        notes: doc.notes,
      }}
      initialFile={fileInfoOf(doc)}
      members={members}
      projects={projects}
      onClose={onClose}
      onSubmit={(fields, projectId) => {
        updateDoc(doc.id, { ...fields, ...(projects ? { projectId } : {}) });
        toast.success("Document updated");
      }}
    />
  );
}

interface CreateDocModalProps {
  open: boolean;
  orgId: ID;
  /** Pre-selected project; when `projects` is omitted the document is pinned to it. */
  projectId: ID | null;
  onClose: () => void;
  members: Member[];
  projects?: Project[] | undefined;
}

export function CreateDocModal({ open, orgId, projectId, onClose, members, projects }: CreateDocModalProps) {
  const { addDoc } = useStore();
  if (!open) return null;
  return (
    <DocForm
      heading="New document"
      submitLabel="Add document"
      orgId={orgId}
      initial={{ title: "", kind: "Spec", link: "", projectId: projectId ?? "", ownerId: "", notes: "" }}
      initialFile={null}
      members={members}
      projects={projects}
      onClose={onClose}
      onSubmit={(fields, pickedProjectId) => {
        addDoc({ ...fields, orgId, projectId: projects ? pickedProjectId : projectId });
        toast.success("Document added");
      }}
    />
  );
}
