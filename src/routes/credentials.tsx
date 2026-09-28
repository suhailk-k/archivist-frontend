import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PageHeader, PrimaryButton } from "@/components/app-shell";
import {
  CredentialCategoryDatalist,
  CredentialFormFields,
  CredentialRow,
  EMPTY_CREDENTIAL_FORM,
  credentialFormFromRecord,
  type CredentialFormState,
} from "@/components/credentials-panel";
import { Field, Modal, SelectInput } from "@/components/forms";
import { Empty } from "@/components/kit";
import { useOrgData, useStore } from "@/lib/store";
import type { Credential, ID } from "@/lib/types";

export const Route = createFileRoute("/credentials")({
  head: () => ({
    meta: [
      { title: "Credentials — Archivist" },
      { name: "description", content: "Every login, API key and account for this organisation and its projects, in one place." },
      { property: "og:title", content: "Credentials — Archivist" },
      { property: "og:description", content: "Every login, API key and account for this organisation and its projects, in one place." },
    ],
  }),
  component: CredentialsPage,
});

const ORG_SCOPE = "org";

function CredentialsPage() {
  const { db, org, orgId, addCredential, updateCredential, removeCredential } = useStore();
  const { credentials, projects } = useOrgData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [scope, setScope] = useState<string>(ORG_SCOPE);
  const [form, setForm] = useState<CredentialFormState>(EMPTY_CREDENTIAL_FORM);

  const openCreate = () => {
    setEditingId(null);
    setScope(ORG_SCOPE);
    setForm(EMPTY_CREDENTIAL_FORM);
    setOpen(true);
  };

  const openEdit = (credential: Credential) => {
    setEditingId(credential.id);
    setScope(credential.projectId ?? ORG_SCOPE);
    setForm(credentialFormFromRecord(credential));
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Give the credential a name");
      return;
    }
    const projectId = scope === ORG_SCOPE ? null : scope;
    if (editingId) {
      updateCredential(editingId, { ...form, projectId });
      toast.success("Credential updated");
    } else {
      addCredential({ orgId, projectId, ...form });
      toast.success("Credential added");
    }
    setOpen(false);
  };

  const orgCredentials = credentials.filter((c) => c.projectId === null);
  const projectGroups = projects
    .map((project) => ({ project, items: credentials.filter((c) => c.projectId === project.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        title="Credentials"
        crumb={`${org?.name ?? ""} · ${credentials.length} total`}
        action={<PrimaryButton onClick={openCreate}>+ Add credential</PrimaryButton>}
      />

      <div className="space-y-5 px-6 py-7 md:px-8">
        <section>
          <div className="mb-2 text-[13px] font-medium text-ink">Organisation-wide</div>
          {orgCredentials.length === 0 ? <Empty text="No organisation-wide credentials yet" /> : null}
          <div className="space-y-2">
            {orgCredentials.map((credential) => (
              <CredentialRow
                key={credential.id}
                credential={credential}
                onEdit={() => openEdit(credential)}
                onDelete={() => {
                  removeCredential(credential.id);
                  toast.success("Credential removed");
                }}
              />
            ))}
          </div>
        </section>

        {projectGroups.map(({ project, items }) => (
          <section key={project.id}>
            <div className="mb-2 text-[13px] font-medium text-ink">{project.name}</div>
            <div className="space-y-2">
              {items.map((credential) => (
                <CredentialRow
                  key={credential.id}
                  credential={credential}
                  onEdit={() => openEdit(credential)}
                  onDelete={() => {
                    removeCredential(credential.id);
                    toast.success("Credential removed");
                  }}
                />
              ))}
            </div>
          </section>
        ))}

        {credentials.length === 0 ? <Empty text="No credentials saved for this organisation yet" /> : null}
      </div>

      <Modal open={open} title={editingId ? "Edit credential" : "Add credential"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Scope">
            <SelectInput value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value={ORG_SCOPE}>Organisation-wide</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <CredentialFormFields
            form={form}
            onChange={setForm}
            hasStoredSecret={Boolean(editingId && db.credentials.find((c) => c.id === editingId)?.hasSecret)}
          />
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editingId ? "Save changes" : "Add credential"}</PrimaryButton>
          </div>
        </div>
      </Modal>
      <CredentialCategoryDatalist />
    </>
  );
}
