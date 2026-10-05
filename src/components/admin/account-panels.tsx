import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Field, SelectInput, TextInput } from "@/components/forms";
import { AccessEditor } from "@/components/admin/access-editor";
import { RecordAccessEditor } from "@/components/admin/record-access-editor";
import type { Credential, Doc } from "@/lib/types";
import { sameAccess, type AdminUser, type UserAccess } from "@/lib/access-rules";
import { changeUserPassword, replaceUserAccess, setUserMemberLink } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api-client";

export const describeError = (reason: unknown): string =>
  reason instanceof ApiRequestError ? reason.message : "Archivist backend is unreachable.";

export function PanelCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-panel/50 p-4">
      <div className="flex items-center gap-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">{title}</div>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </div>
  );
}

interface AccessPanelProps {
  target: AdminUser;
  organisations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; orgId: string }>;
  docs: Doc[];
  credentials: Credential[];
  onSaved: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

/** Edits one member's grants with an explicit unsaved state, so nothing is lost or saved by accident. */
export function AccessPanel({ target, organisations, projects, docs, credentials, onSaved, onDirtyChange }: AccessPanelProps) {
  const [draft, setDraft] = useState<UserAccess>(target.access);
  const [busy, setBusy] = useState(false);
  const dirty = !sameAccess(draft, target.access);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  if (target.role === "superadmin") {
    return (
      <PanelCard title="Access">
        <p className="text-[13px] text-ink-soft">Superadmin accounts always reach every organisation and project.</p>
      </PanelCard>
    );
  }

  async function save() {
    setBusy(true);
    try {
      await replaceUserAccess(target.id, draft);
      toast.success(`Access updated for ${target.displayName}`);
      await onSaved();
    } catch (reason: unknown) {
      toast.error(describeError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelCard
      title={`Access · ${target.username}`}
      action={dirty ? <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-[11px] font-medium text-amber">Unsaved changes</span> : null}
    >
      <p className="text-[12px] text-ink-soft">
        An organisation grant shows its org-wide records. Projects must be granted individually — ticking a project grants its organisation too.
      </p>
      <AccessEditor access={draft} onChange={setDraft} organisations={organisations} projects={projects} disabled={busy} />
      <RecordAccessEditor
        userId={target.id}
        access={draft}
        onChange={(shares) => setDraft((current) => ({ ...current, shares }))}
        docs={docs}
        credentials={credentials}
        organisations={organisations}
        projects={projects}
        disabled={busy}
      />
      <div className="flex justify-end gap-2">
        <GhostButton onClick={() => setDraft(target.access)} disabled={!dirty || busy}>
          Reset
        </GhostButton>
        <PrimaryButton onClick={() => void save()} disabled={!dirty || busy}>
          {busy ? "Saving…" : "Save access"}
        </PrimaryButton>
      </div>
    </PanelCard>
  );
}

interface MemberLinkPanelProps {
  target: AdminUser;
  members: Array<{ id: string; name: string }>;
  onSaved: () => Promise<void>;
}

/** Which member profile this login is — drives "My Work" and assignee matching. */
export function MemberLinkPanel({ target, members, onSaved }: MemberLinkPanelProps) {
  const [memberId, setMemberId] = useState(target.memberId ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await setUserMemberLink(target.id, memberId || null);
      toast.success(memberId ? "Member profile linked" : "Member profile unlinked");
      await onSaved();
    } catch (reason: unknown) {
      toast.error(describeError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelCard title={`Member profile · ${target.username}`}>
      <Field label="This account is">
        <SelectInput value={memberId} onChange={(event) => setMemberId(event.target.value)}>
          <option value="">Not linked</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <p className="text-[11px] text-ink-soft">Linking decides whose tasks show under "My Work" for this login.</p>
      <PrimaryButton onClick={() => void save()} disabled={busy || memberId === (target.memberId ?? "")}>
        {busy ? "Saving…" : "Save link"}
      </PrimaryButton>
    </PanelCard>
  );
}

export function PasswordPanel({ target }: { target: AdminUser }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await changeUserPassword(target.id, password);
      setPassword("");
      toast.success(`Password changed. ${target.username} was signed out everywhere.`);
    } catch (reason: unknown) {
      toast.error(describeError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PanelCard title={`Reset password · ${target.username}`}>
        <Field label="New password">
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
        </Field>
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Saving…" : "Set password"}
        </PrimaryButton>
      </PanelCard>
    </form>
  );
}
