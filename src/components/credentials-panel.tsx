import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { ConfirmModal, Field, Modal, TextArea, TextInput } from "@/components/forms";
import { Empty, SecretValue } from "@/components/kit";
import { useStore } from "@/lib/store";
import { CREDENTIAL_CATEGORY_SUGGESTIONS, type Credential, type ID } from "@/lib/types";

export const CREDENTIAL_CATEGORY_SUGGESTIONS_ID = "credential-category-suggestions";

export interface CredentialFormState {
  name: string;
  category: string;
  username: string;
  secret: string;
  url: string;
  usedFor: string;
  notes: string;
}

export const EMPTY_CREDENTIAL_FORM: CredentialFormState = {
  name: "",
  category: "",
  username: "",
  secret: "",
  url: "",
  usedFor: "",
  notes: "",
};

export function credentialFormFromRecord(credential: Credential): CredentialFormState {
  return {
    name: credential.name,
    category: credential.category,
    username: credential.username,
    secret: credential.secret,
    url: credential.url,
    usedFor: credential.usedFor,
    notes: credential.notes,
  };
}

export function CredentialCategoryDatalist() {
  return (
    <datalist id={CREDENTIAL_CATEGORY_SUGGESTIONS_ID}>
      {CREDENTIAL_CATEGORY_SUGGESTIONS.map((suggestion) => (
        <option key={suggestion} value={suggestion} />
      ))}
    </datalist>
  );
}

/** The shared field set (name/category/username/secret/url/usedFor/notes) for the add/edit modal. */
export function CredentialFormFields({
  form,
  onChange,
}: {
  form: CredentialFormState;
  onChange: (form: CredentialFormState) => void;
}) {
  return (
    <>
      <Field label="Name">
        <TextInput value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="App Store Connect" autoFocus />
      </Field>
      <Field label="Category">
        <TextInput
          value={form.category}
          onChange={(e) => onChange({ ...form, category: e.target.value })}
          placeholder="e.g. Firebase"
          list={CREDENTIAL_CATEGORY_SUGGESTIONS_ID}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Username / account">
          <TextInput value={form.username} onChange={(e) => onChange({ ...form, username: e.target.value })} placeholder="name@company.com" />
        </Field>
        <Field label="Password / secret">
          <TextInput
            type="password"
            value={form.secret}
            onChange={(e) => onChange({ ...form, secret: e.target.value })}
            autoComplete="new-password"
          />
        </Field>
      </div>
      <Field label="Login URL">
        <TextInput value={form.url} onChange={(e) => onChange({ ...form, url: e.target.value })} placeholder="https://..." />
      </Field>
      <Field label="Used for">
        <TextInput value={form.usedFor} onChange={(e) => onChange({ ...form, usedFor: e.target.value })} placeholder="Publishing the iOS app" />
      </Field>
      <Field label="Notes">
        <TextArea value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
      </Field>
    </>
  );
}

/** A single credential's display card, with edit/delete actions. */
export function CredentialRow({
  credential,
  scopeLabel,
  onEdit,
  onDelete,
}: {
  credential: Credential;
  scopeLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-panel/40 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-medium">{credential.name}</span>
            {credential.category ? (
              <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">{credential.category}</span>
            ) : null}
            {scopeLabel ? <span className="rounded-md bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">{scopeLabel}</span> : null}
          </div>
          {credential.usedFor ? <p className="mt-1 text-[12px] text-ink-soft">Used for: {credential.usedFor}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label={`Edit ${credential.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-rose/10 hover:text-rose"
            aria-label={`Delete ${credential.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="mt-2 grid gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <span className="text-ink-soft">Login</span>
          <span>{credential.username || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-ink-soft">Secret</span>
          <SecretValue value={credential.secret} />
        </div>
        {credential.url ? (
          <a
            href={credential.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-1 truncate text-accent hover:underline sm:col-span-2"
          >
            <span className="truncate">{credential.url}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        ) : null}
      </div>
      {credential.notes ? <p className="mt-2 text-[12px] text-ink-soft">{credential.notes}</p> : null}
      <ConfirmModal
        open={confirmOpen}
        title={`Delete "${credential.name}"?`}
        description="This permanently removes this credential, including its stored secret. This can't be undone."
        confirmLabel="Delete credential"
        onClose={() => setConfirmOpen(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}

/**
 * Manages credentials scoped to either an organisation (projectId: null) or a single
 * project. Used by the project workspace's "Credentials" tab and the organisation
 * detail page's credentials section. For the org-wide hub that lists every credential
 * across all scopes, see the /credentials route.
 */
export function CredentialsPanel({ orgId, projectId }: { orgId: ID; projectId: ID | null }) {
  const { db, addCredential, updateCredential, removeCredential } = useStore();
  const credentials = db.credentials.filter((c) => c.orgId === orgId && c.projectId === projectId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [form, setForm] = useState<CredentialFormState>(EMPTY_CREDENTIAL_FORM);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_CREDENTIAL_FORM);
    setOpen(true);
  };

  const openEdit = (credential: Credential) => {
    setEditingId(credential.id);
    setForm(credentialFormFromRecord(credential));
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Give the credential a name");
      return;
    }
    if (editingId) {
      updateCredential(editingId, form);
      toast.success("Credential updated");
    } else {
      addCredential({ orgId, projectId, ...form });
      toast.success("Credential added");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] text-ink-soft">
          {credentials.length} credential{credentials.length === 1 ? "" : "s"}
        </div>
        <GhostButton onClick={openCreate}>
          <Plus size={14} className="mr-1 inline" />
          Add credential
        </GhostButton>
      </div>

      {credentials.length === 0 ? <Empty text="No credentials saved yet" /> : null}

      <div className="space-y-2">
        {credentials.map((credential) => (
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

      <Modal open={open} title={editingId ? "Edit credential" : "Add credential"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <CredentialFormFields form={form} onChange={setForm} />
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editingId ? "Save changes" : "Add credential"}</PrimaryButton>
          </div>
        </div>
      </Modal>
      <CredentialCategoryDatalist />
    </div>
  );
}
