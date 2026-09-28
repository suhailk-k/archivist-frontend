import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Field, SelectInput, TextInput } from "@/components/forms";
import { AccessEditor } from "@/components/admin/access-editor";
import { describeError, PanelCard } from "@/components/admin/account-panels";
import { EMPTY_ACCESS, type UserAccess } from "@/lib/access-rules";
import { createUser, replaceUserAccess, setUserMemberLink } from "@/lib/admin-api";

interface InvitePanelProps {
  organisations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; orgId: string }>;
  members: Array<{ id: string; name: string }>;
  /** Called with the new account's id once it exists, even if a later step failed. */
  onCreated: (userId: string) => Promise<void>;
}

/**
 * One form for onboarding: account → member profile → access. Without the last two a new
 * member logs in to an empty app, so they're part of the same step instead of separate screens.
 */
export function InvitePanel({ organisations, projects, members, onCreated }: InvitePanelProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [memberId, setMemberId] = useState("");
  const [access, setAccess] = useState<UserAccess>(EMPTY_ACCESS);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setUsername("");
    setDisplayName("");
    setPassword("");
    setMemberId("");
    setAccess(EMPTY_ACCESS);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    let createdId: string | null = null;
    try {
      createdId = (await createUser({ username, displayName, password })).id;
      if (memberId) await setUserMemberLink(createdId, memberId);
      if (access.organisationIds.length > 0) await replaceUserAccess(createdId, access);
      toast.success(access.organisationIds.length > 0 ? `${displayName} can now sign in` : `${displayName} created — grant access before they sign in`);
      reset();
      setOpen(false);
    } catch (reason: unknown) {
      // The account may exist even though linking or granting failed; say so rather than hiding it.
      toast.error(createdId ? `Account created, but setup didn't finish: ${describeError(reason)}` : describeError(reason));
    } finally {
      setBusy(false);
      if (createdId) await onCreated(createdId);
    }
  }

  if (!open) {
    return <PrimaryButton onClick={() => setOpen(true)}>Invite member</PrimaryButton>;
  }

  return (
    <form onSubmit={submit}>
      <PanelCard title="Invite member">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="User ID">
            <TextInput value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" required autoFocus />
          </Field>
          <Field label="Display name">
            <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </Field>
        </div>
        <Field label="Temporary password">
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
        </Field>
        <p className="text-[11px] text-ink-soft">
          12+ characters with uppercase, lowercase, number and special character. Ask them to change it from Account after signing in.
        </p>
        <Field label="Member profile (optional)">
          <SelectInput value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">Not linked</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="space-y-1.5">
          <span className="label-mono">Access</span>
          <AccessEditor access={access} onChange={setAccess} organisations={organisations} projects={projects} disabled={busy} />
        </div>
        <div className="flex justify-end gap-2">
          <GhostButton
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={busy}
          >
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create and grant access"}
          </PrimaryButton>
        </div>
      </PanelCard>
    </form>
  );
}
