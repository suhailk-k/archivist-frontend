import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Modal, SelectInput } from "@/components/forms";
import { listUsers, readRecordShares, replaceRecordShares, type AdminUser } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { setShareLevel, shareBlocker, shareCandidates, type Share, type ShareableEntity, type ShareLevel } from "@/lib/record-access";
import type { ID } from "@/lib/types";

export interface ShareTarget {
  id: ID;
  orgId: ID;
  projectId: ID | null;
  createdById?: ID | null | undefined;
  label: string;
}

interface ShareAccessButtonProps {
  entity: ShareableEntity;
  target: ShareTarget;
  className?: string;
}

/** Superadmin-only: opens the share dialog for one document or credential. Renders nothing for members. */
export function ShareAccessButton({ entity, target, className }: ShareAccessButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (user?.role !== "superadmin") return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Share ${target.label}`}
        title="Who can access this"
        className={className ?? "rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-ink/5 hover:text-accent"}
      >
        <Users size={14} />
      </button>
      {open ? <ShareAccessModal entity={entity} target={target} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; users: AdminUser[] };

function ShareAccessModal({ entity, target, onClose }: ShareAccessButtonProps & { onClose: () => void }) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [shares, setShares] = useState<Share[]>([]);
  const [isSaving, setSaving] = useState(false);
  const module = entity === "docs" ? "documents" : "credentials";

  useEffect(() => {
    let isCurrent = true;
    Promise.all([listUsers(), readRecordShares(entity, target.id)])
      .then(([users, stored]) => {
        if (!isCurrent) return;
        setShares(stored);
        setLoad({ status: "ready", users });
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoad({ status: "error", message: error instanceof Error ? error.message : "Could not load access." });
      });
    return () => {
      isCurrent = false;
    };
  }, [entity, target.id]);

  const save = async () => {
    setSaving(true);
    try {
      await replaceRecordShares(entity, target.id, shares);
      toast.success("Access updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={`Share "${target.label}"`} onClose={onClose}>
      {load.status === "loading" ? <p className="text-[12.5px] text-ink-soft">Loading people…</p> : null}
      {load.status === "error" ? <p className="text-[12.5px] text-rose">{load.message}</p> : null}
      {load.status === "ready" ? (
        <div className="space-y-3">
          <CreatorNote users={load.users} createdById={target.createdById} />
          <ShareList
            candidates={shareCandidates(load.users, target.createdById)}
            shares={shares}
            blockerFor={(candidate) => shareBlocker(candidate, target, module)}
            onChange={(userId, level) => setShares((current) => setShareLevel(current, userId, level))}
          />
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save access"}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function CreatorNote({ users, createdById }: { users: AdminUser[]; createdById: ID | null | undefined }) {
  const creator = createdById ? users.find((entry) => entry.id === createdById) : undefined;
  // undefined: created in this session and not reloaded yet, so it is the viewer's own record.
  const note =
    createdById === undefined
      ? "Created by you. The creator and superadmins always have full access."
      : creator
        ? `Created by ${creator.displayName}. The creator and superadmins always have full access.`
        : createdById === null
          ? "Created before access control. Only superadmins can see it until you share it."
          : "Created by a deleted account. Only superadmins can see it until you share it.";
  return <p className="text-[12px] text-ink-soft">{note}</p>;
}

interface ShareListProps {
  candidates: AdminUser[];
  shares: Share[];
  blockerFor: (candidate: AdminUser) => string | null;
  onChange: (userId: ID, level: ShareLevel | "none") => void;
}

function ShareList({ candidates, shares, blockerFor, onChange }: ShareListProps) {
  if (candidates.length === 0) return <p className="text-[12.5px] text-ink-soft">No other members to share with.</p>;
  return (
    <ul className="max-h-80 divide-y divide-line/60 overflow-y-auto rounded-xl border border-line">
      {candidates.map((candidate) => {
        const level = shares.find((share) => share.userId === candidate.id)?.level ?? "none";
        const blocker = level === "none" ? null : blockerFor(candidate);
        return (
          <li key={candidate.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{candidate.displayName}</div>
              <div className="truncate font-mono text-[11px] text-ink-soft">
                {candidate.username}
                {blocker ? <span className="ml-2 text-amber">· {blocker}</span> : null}
              </div>
            </div>
            <SelectInput
              aria-label={`Access for ${candidate.displayName}`}
              value={level}
              onChange={(e) => onChange(candidate.id, e.target.value as ShareLevel | "none")}
              className="w-32"
            >
              <option value="none">No access</option>
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </SelectInput>
          </li>
        );
      })}
    </ul>
  );
}
