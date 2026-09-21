import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GhostButton, PageHeader, PrimaryButton } from "@/components/app-shell";
import { Field, TextInput } from "@/components/forms";
import { ApiRequestError } from "@/lib/api-client";
import {
  changeUserPassword,
  createUser,
  listUsers,
  readUserAccess,
  replaceUserAccess,
  setUserDisabled,
  type UserAccess,
} from "@/lib/admin-api";
import { useAuth, type SessionUser } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const EMPTY_ACCESS: UserAccess = { organisationIds: [], projectIds: [] };

const describe = (reason: unknown): string =>
  reason instanceof ApiRequestError ? reason.message : "Archivist backend is unreachable.";

const toggle = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((value) => value !== id) : [...list, id];

function AdminPage() {
  const { user } = useAuth();
  const { db } = useStore();
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setUsers(await listUsers());
    } catch (reason: unknown) {
      toast.error(describe(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (user?.role !== "superadmin") {
    return (
      <>
        <PageHeader title="Access control" crumb="Admin" />
        <div className="p-6 text-[13px] text-ink-soft md:p-8">Superadmin access required.</div>
      </>
    );
  }

  const selected = users.find((candidate) => candidate.id === selectedId) ?? null;

  return (
    <>
      <PageHeader title="Access control" crumb="Admin · accounts and permissions" />
      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="space-y-4">
          <UserList
            users={users}
            loading={loading}
            selectedId={selectedId}
            currentUserId={user.id}
            onSelect={setSelectedId}
            onToggleDisabled={async (target) => {
              try {
                await setUserDisabled(target.id, !target.disabled);
                toast.success(target.disabled ? "Account enabled" : "Account disabled");
                await reload();
              } catch (reason: unknown) {
                toast.error(describe(reason));
              }
            }}
          />
          <CreateUserPanel onCreated={reload} />
        </section>

        <section className="space-y-4">
          {selected ? (
            <>
              <PasswordPanel key={`password-${selected.id}`} target={selected} />
              <AccessPanel
                key={`access-${selected.id}`}
                target={selected}
                organisations={db.organisations}
                projects={db.projects}
              />
            </>
          ) : (
            <p className="rounded-xl border border-line bg-panel/50 p-4 text-[13px] text-ink-soft">
              Select an account to manage its password and organisation access.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

interface UserListProps {
  users: SessionUser[];
  loading: boolean;
  selectedId: string;
  currentUserId: string;
  onSelect: (id: string) => void;
  onToggleDisabled: (user: SessionUser) => Promise<void>;
}

function UserList({ users, loading, selectedId, currentUserId, onSelect, onToggleDisabled }: UserListProps) {
  if (loading) return <p className="text-[13px] text-ink-soft">Loading accounts…</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/50">
      <div className="border-b border-line/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
        Accounts · {users.length}
      </div>
      <ul>
        {users.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(entry.id)}
              className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent/70 ${
                entry.id === selectedId ? "bg-accent/15 text-accent" : "hover:bg-ink/5"
              }`}
            >
              <span className="block truncate text-[13px] font-medium">{entry.displayName}</span>
              <span className="block font-mono text-[10px] text-ink-soft">
                {entry.username} · {entry.role}
                {entry.disabled ? " · disabled" : ""}
              </span>
            </button>
            {entry.id === currentUserId ? (
              <span className="font-mono text-[10px] text-ink-soft">you</span>
            ) : (
              <GhostButton onClick={() => void onToggleDisabled(entry)}>
                {entry.disabled ? "Enable" : "Disable"}
              </GhostButton>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateUserPanel({ onCreated }: { onCreated: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await createUser({ username, displayName, password });
      setUsername("");
      setDisplayName("");
      setPassword("");
      toast.success("Account created");
      await onCreated();
    } catch (reason: unknown) {
      toast.error(describe(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-panel/50 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">New account</div>
      <Field label="User ID">
        <TextInput value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" required />
      </Field>
      <Field label="Display name">
        <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
      </Field>
      <Field label="Temporary password">
        <TextInput
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </PrimaryButton>
    </form>
  );
}

function PasswordPanel({ target }: { target: SessionUser }) {
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
      toast.error(describe(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-panel/50 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
        Password · {target.username}
      </div>
      <Field label="New password">
        <TextInput
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? "Saving…" : "Set password"}
      </PrimaryButton>
    </form>
  );
}

interface AccessPanelProps {
  target: SessionUser;
  organisations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; orgId: string }>;
}

function AccessPanel({ target, organisations, projects }: AccessPanelProps) {
  const [access, setAccess] = useState<UserAccess>(EMPTY_ACCESS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readUserAccess(target.id)
      .then((value) => {
        if (!cancelled) setAccess(value);
      })
      .catch((reason: unknown) => toast.error(describe(reason)));
    return () => {
      cancelled = true;
    };
  }, [target.id]);

  async function save() {
    setBusy(true);
    try {
      setAccess(await replaceUserAccess(target.id, access));
      toast.success("Access updated");
    } catch (reason: unknown) {
      toast.error(describe(reason));
    } finally {
      setBusy(false);
    }
  }

  function toggleOrganisation(organisationId: string) {
    setAccess((previous) => {
      const organisationIds = toggle(previous.organisationIds, organisationId);
      // Revoking an organisation revokes its projects: the backend rejects orphaned project grants.
      const allowed = new Set(organisationIds);
      return {
        organisationIds,
        projectIds: previous.projectIds.filter((projectId) => {
          const project = projects.find((candidate) => candidate.id === projectId);
          return project ? allowed.has(project.orgId) : false;
        }),
      };
    });
  }

  if (target.role === "superadmin") {
    return (
      <p className="rounded-xl border border-line bg-panel/50 p-4 text-[13px] text-ink-soft">
        Superadmin accounts always reach every organisation and project.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-panel/50 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">Access · {target.username}</div>
      {organisations.length === 0 ? <p className="text-[13px] text-ink-soft">No organisations exist yet.</p> : null}
      {organisations.map((organisation) => {
        const granted = access.organisationIds.includes(organisation.id);
        return (
          <div key={organisation.id} className="rounded-lg border border-line/60 p-3">
            <label className="flex items-center gap-2 text-[13px] font-medium">
              <input type="checkbox" checked={granted} onChange={() => toggleOrganisation(organisation.id)} />
              {organisation.name}
            </label>
            {granted ? (
              <div className="mt-2 space-y-1 pl-6">
                {projects
                  .filter((project) => project.orgId === organisation.id)
                  .map((project) => (
                    <label key={project.id} className="flex items-center gap-2 text-[12px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={access.projectIds.includes(project.id)}
                        onChange={() =>
                          setAccess((previous) => ({
                            ...previous,
                            projectIds: toggle(previous.projectIds, project.id),
                          }))
                        }
                      />
                      {project.name}
                    </label>
                  ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <PrimaryButton onClick={() => void save()} disabled={busy}>
        {busy ? "Saving…" : "Save access"}
      </PrimaryButton>
    </div>
  );
}
