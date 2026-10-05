import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { UserAccess } from "@/lib/access-rules";
import { setUserShareLevel, type ShareableEntity, type ShareLevel, type UserShare } from "@/lib/record-access";
import type { Credential, Doc, ID } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface RecordAccessEditorProps {
  userId: ID;
  access: UserAccess;
  onChange: (shares: UserShare[]) => void;
  docs: Doc[];
  credentials: Credential[];
  organisations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; orgId: string }>;
  disabled?: boolean;
}

interface RecordRow {
  entity: ShareableEntity;
  id: ID;
  label: string;
  scopeLabel: string;
  isInScope: boolean;
  isCreator: boolean;
  level: ShareLevel | "none";
}

const TABS: Array<{ entity: ShareableEntity; label: string }> = [
  { entity: "docs", label: "Documents" },
  { entity: "credentials", label: "Credentials" },
];

/**
 * Which documents and credentials this user can open besides their own. Only records inside the
 * user's granted organisations/projects are listed; a share outside them would have no effect, so
 * existing ones are flagged for removal instead.
 */
export function RecordAccessEditor({ userId, access, onChange, docs, credentials, organisations, projects, disabled = false }: RecordAccessEditorProps) {
  const [tab, setTab] = useState<ShareableEntity>("docs");
  const [query, setQuery] = useState("");
  const [isSharedOnly, setSharedOnly] = useState(false);
  const shares = useMemo(() => access.shares ?? [], [access.shares]);

  const rows = useMemo(
    () => buildRows({ userId, access, shares, docs, credentials, organisations, projects }),
    [userId, access, shares, docs, credentials, organisations, projects],
  );
  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      row.entity === tab &&
      (!isSharedOnly || row.level !== "none") &&
      (!needle || row.label.toLowerCase().includes(needle) || row.scopeLabel.toLowerCase().includes(needle)),
  );
  const isModuleOff = access.permissions?.[tab === "docs" ? "documents" : "credentials"] === "none";

  return (
    <fieldset disabled={disabled} className="space-y-2 rounded-lg border border-line/60 p-3">
      <legend className="px-1 text-[13px] font-medium">Record access</legend>
      <p className="text-[11px] text-ink-soft">
        Members always see the records they created. Share anything else here: "View" can open it, "Edit" can also change or delete it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Record type" className="inline-flex rounded-md border border-line p-0.5">
          {TABS.map(({ entity, label }) => {
            const sharedCount = rows.filter((row) => row.entity === entity && row.level !== "none").length;
            return (
              <button
                key={entity}
                type="button"
                role="tab"
                aria-selected={tab === entity}
                onClick={() => setTab(entity)}
                className={cn(
                  "rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                  tab === entity ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-ink/[0.05] hover:text-ink",
                )}
              >
                {label}
                {sharedCount > 0 ? <span className="ml-1.5 font-mono text-[11px]">{sharedCount}</span> : null}
              </button>
            );
          })}
        </div>
        <label className="relative flex min-w-[10rem] flex-1 items-center">
          <Search size={13} className="pointer-events-none absolute left-2 text-ink-soft/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search records"
            className="w-full rounded-md border border-line bg-panel py-1 pl-7 pr-2 text-[12px] outline-none focus:border-accent"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
          <input type="checkbox" checked={isSharedOnly} onChange={(e) => setSharedOnly(e.target.checked)} />
          Shared only
        </label>
      </div>
      {isModuleOff ? (
        <p className="rounded-md bg-amber/10 px-2 py-1 text-[11px] text-amber">
          {tab === "docs" ? "Documents" : "Credentials"} are set to "No access" above, so these shares have no effect until that changes.
        </p>
      ) : null}
      <RecordList
        rows={visible}
        hasGrants={access.organisationIds.length > 0}
        onChange={(row, level) => onChange(setUserShareLevel(shares, row.entity, row.id, level))}
      />
    </fieldset>
  );
}

interface RecordListProps {
  rows: RecordRow[];
  hasGrants: boolean;
  onChange: (row: RecordRow, level: ShareLevel | "none") => void;
}

function RecordList({ rows, hasGrants, onChange }: RecordListProps) {
  if (rows.length === 0) {
    return (
      <p className="px-1 py-2 text-[12px] text-ink-soft">
        {hasGrants ? "Nothing to show." : "Grant an organisation or project below to share its records."}
      </p>
    );
  }
  return (
    <ul className="max-h-72 divide-y divide-line/50 overflow-y-auto rounded-md border border-line/60">
      {rows.map((row) => (
        <li key={`${row.entity}:${row.id}`} className="flex items-center gap-2 px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px]">{row.label}</div>
            <div className="truncate font-mono text-[11px] text-ink-soft">
              {row.scopeLabel}
              {!row.isInScope ? <span className="ml-1.5 text-amber">· outside granted access, has no effect</span> : null}
            </div>
          </div>
          {row.isCreator ? (
            <span className="rounded-md bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft">Creator</span>
          ) : (
            <select
              aria-label={`Access to ${row.label}`}
              value={row.level}
              onChange={(e) => onChange(row, e.target.value as ShareLevel | "none")}
              className={cn(
                "rounded-md border border-line bg-panel px-1.5 py-1 text-[12px] outline-none focus:border-accent",
                row.level !== "none" && "border-accent/40 text-accent",
              )}
            >
              <option value="none">No access</option>
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
          )}
        </li>
      ))}
    </ul>
  );
}

interface BuildRowsInput {
  userId: ID;
  access: UserAccess;
  shares: UserShare[];
  docs: Doc[];
  credentials: Credential[];
  organisations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; orgId: string }>;
}

function buildRows({ userId, access, shares, docs, credentials, organisations, projects }: BuildRowsInput): RecordRow[] {
  const orgName = new Map(organisations.map((org) => [org.id, org.name]));
  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const levelOf = (entity: ShareableEntity, id: ID) => shares.find((share) => share.entity === entity && share.recordId === id)?.level ?? "none";
  const toRow = (entity: ShareableEntity, record: Doc | Credential, label: string): RecordRow => {
    const isInScope = record.projectId ? access.projectIds.includes(record.projectId) : access.organisationIds.includes(record.orgId);
    const org = orgName.get(record.orgId) ?? "Unknown organisation";
    return {
      entity,
      id: record.id,
      label: label || "Untitled",
      scopeLabel: record.projectId ? `${org} · ${projectName.get(record.projectId) ?? "Unknown project"}` : `${org} · organisation-wide`,
      isInScope,
      isCreator: record.createdById === userId,
      level: levelOf(entity, record.id),
    };
  };
  const all = [...docs.map((doc) => toRow("docs", doc, doc.title)), ...credentials.map((credential) => toRow("credentials", credential, credential.name))];
  return all
    .filter((row) => row.isInScope || row.level !== "none")
    .sort((a, b) => a.scopeLabel.localeCompare(b.scopeLabel) || a.label.localeCompare(b.label));
}
