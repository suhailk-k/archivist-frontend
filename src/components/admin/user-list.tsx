import { useState } from "react";
import { GhostButton } from "@/components/app-shell";
import { TextInput } from "@/components/forms";
import { describeAccess, filterUsers, hasNoAccess, type AdminUser, type UserFilter } from "@/lib/access-rules";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ value: UserFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "no-access", label: "No access" },
  { value: "unlinked", label: "No profile" },
];

export interface UserListProps {
  users: AdminUser[];
  members: Array<{ id: string; name: string }>;
  loading: boolean;
  selectedId: string;
  currentUserId: string;
  onSelect: (id: string) => void;
  onToggleDisabled: (user: AdminUser) => void;
}

function Badge({ tone, children }: { tone: "accent" | "rose" | "amber" | "line"; children: string }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    rose: "bg-rose/10 text-rose",
    amber: "bg-amber/15 text-amber",
    line: "bg-ink/5 text-ink-soft",
  } as const;
  return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function UserList({ users, members, loading, selectedId, currentUserId, onSelect, onToggleDisabled }: UserListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const visible = filterUsers(users, query, filter);
  const memberName = (id: string | null) => members.find((member) => member.id === id)?.name;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/50">
      <div className="space-y-2 border-b border-line/60 px-3 py-3">
        <div className="flex items-center justify-between px-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
          <span>Accounts</span>
          <span>
            {visible.length}/{users.length}
          </span>
        </div>
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or user ID" aria-label="Search accounts" />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter accounts">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                filter === option.value ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-soft hover:bg-ink/5",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="px-4 py-3 text-[13px] text-ink-soft">Loading accounts…</p> : null}
      {!loading && visible.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-soft">No accounts match.</p> : null}

      <ul>
        {visible.map((entry) => {
          const linked = memberName(entry.memberId);
          return (
            <li key={entry.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-current={entry.id === selectedId}
                className={cn(
                  "min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent/70",
                  entry.id === selectedId ? "bg-accent/10" : "hover:bg-ink/5",
                  entry.disabled && "opacity-60",
                )}
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium">{entry.displayName}</span>
                  {entry.role === "superadmin" ? <Badge tone="accent">Superadmin</Badge> : null}
                  {entry.disabled ? <Badge tone="rose">Disabled</Badge> : null}
                  {hasNoAccess(entry) && !entry.disabled ? <Badge tone="amber">No access</Badge> : null}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-soft">
                  {entry.username} · {describeAccess(entry)}
                  {entry.role !== "superadmin" ? ` · ${linked ? `profile: ${linked}` : "no profile"}` : ""}
                </span>
              </button>
              {entry.id === currentUserId ? (
                <span className="font-mono text-[11px] text-ink-soft">you</span>
              ) : (
                <GhostButton onClick={() => onToggleDisabled(entry)}>{entry.disabled ? "Enable" : "Disable"}</GhostButton>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
