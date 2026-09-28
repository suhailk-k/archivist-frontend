import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { ConfirmModal } from "@/components/forms";
import { AccessPanel, describeError, MemberLinkPanel, PasswordPanel } from "@/components/admin/account-panels";
import { InvitePanel } from "@/components/admin/invite-panel";
import { UserList } from "@/components/admin/user-list";
import { hasNoAccess, type AdminUser } from "@/lib/access-rules";
import { listUsers, setUserDisabled } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user } = useAuth();
  const { db } = useStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDirty, setAccessDirty] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setUsers(await listUsers());
    } catch (reason: unknown) {
      toast.error(describeError(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Switching accounts with unsaved access edits asks first instead of silently dropping them. */
  const select = (id: string) => {
    if (id === selectedId) return;
    if (accessDirty) {
      setPendingSelection(id);
      return;
    }
    setSelectedId(id);
  };

  const toggleDisabled = async (target: AdminUser) => {
    try {
      await setUserDisabled(target.id, !target.disabled);
      toast.success(target.disabled ? `${target.displayName} can sign in again` : `${target.displayName} is disabled and signed out`);
      await reload();
    } catch (reason: unknown) {
      toast.error(describeError(reason));
    }
  };

  if (user?.role !== "superadmin") {
    return (
      <>
        <PageHeader title="Access control" crumb="Admin" />
        <div className="p-6 text-[13px] text-ink-soft md:p-8">Superadmin access required.</div>
      </>
    );
  }

  const selected = users.find((candidate) => candidate.id === selectedId) ?? null;
  const withoutAccess = users.filter((entry) => !entry.disabled && hasNoAccess(entry)).length;

  return (
    <>
      <PageHeader title="Access control" crumb="Admin · accounts and permissions" />
      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="space-y-4">
          {withoutAccess > 0 ? (
            <p className="rounded-xl border border-amber/30 bg-amber/10 p-3 text-[12px] text-ink">
              {withoutAccess} active account{withoutAccess === 1 ? " has" : "s have"} no access yet and will see an empty app.
            </p>
          ) : null}
          <UserList
            users={users}
            members={db.members}
            loading={loading}
            selectedId={selectedId}
            currentUserId={user.id}
            onSelect={select}
            onToggleDisabled={(target) => void toggleDisabled(target)}
          />
          <InvitePanel
            organisations={db.organisations}
            projects={db.projects}
            members={db.members}
            onCreated={async (userId) => {
              await reload();
              setSelectedId(userId);
            }}
          />
        </section>

        <section className="space-y-4">
          {selected ? (
            <>
              <AccessPanel
                key={`access-${selected.id}-${selected.access.organisationIds.join(",")}-${selected.access.projectIds.join(",")}`}
                target={selected}
                organisations={db.organisations}
                projects={db.projects}
                onSaved={reload}
                onDirtyChange={setAccessDirty}
              />
              {selected.role !== "superadmin" ? (
                <MemberLinkPanel key={`member-${selected.id}-${selected.memberId ?? ""}`} target={selected} members={db.members} onSaved={reload} />
              ) : null}
              <PasswordPanel key={`password-${selected.id}`} target={selected} />
            </>
          ) : (
            <p className="rounded-xl border border-line bg-panel/50 p-4 text-[13px] text-ink-soft">
              Select an account to manage its access, member profile and password.
            </p>
          )}
        </section>
      </div>

      <ConfirmModal
        open={pendingSelection !== null}
        title="Discard unsaved access changes?"
        description="You changed this account's access but didn't save. Switching accounts will throw those changes away."
        confirmLabel="Discard changes"
        onClose={() => setPendingSelection(null)}
        onConfirm={() => {
          setAccessDirty(false);
          if (pendingSelection) setSelectedId(pendingSelection);
          setPendingSelection(null);
        }}
      />
    </>
  );
}
