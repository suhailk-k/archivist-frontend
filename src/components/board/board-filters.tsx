import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PRIORITIES, type BoardFilters } from "@/lib/board";
import type { ID, Member, ProjectLabel } from "@/lib/types";
import { PRIORITY_LABEL } from "./status-meta";

const SEARCH_DEBOUNCE_MS = 250;
const control =
  "h-8 rounded-lg border border-line bg-panel px-2.5 text-[12px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

export interface BoardFiltersBarProps {
  filters: BoardFilters;
  onChange: (next: BoardFilters) => void;
  members: readonly Member[];
  labels: readonly ProjectLabel[];
  /** The signed-in user's member record; "Me" is offered only when there is one. */
  memberId: ID | null;
}

/** Sets or clears one key without leaving `undefined` values in the URL state. */
function withValue<K extends keyof BoardFilters>(filters: BoardFilters, key: K, value: BoardFilters[K] | ""): BoardFilters {
  const { [key]: _previous, ...rest } = filters;
  return value ? { ...rest, [key]: value } : rest;
}

export function BoardFiltersBar({ filters, onChange, members, labels, memberId }: BoardFiltersBarProps) {
  const [query, setQuery] = useState(filters.q ?? "");

  useEffect(() => setQuery(filters.q ?? ""), [filters.q]);

  useEffect(() => {
    if (query.trim() === (filters.q ?? "")) return;
    const timer = window.setTimeout(() => onChange(withValue(filters, "q", query.trim())), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, filters, onChange]);

  const isFiltered = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="sr-only">Search work items</span>
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or key" className={`${control} w-52 pl-8`} />
      </label>
      <select aria-label="Filter by assignee" value={filters.assignee ?? ""} onChange={(event) => onChange(withValue(filters, "assignee", event.target.value))} className={control}>
        <option value="">Any assignee</option>
        {memberId ? <option value="me">Me</option> : null}
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by label"
        value={filters.label ?? ""}
        onChange={(event) => onChange(withValue(filters, "label", event.target.value))}
        disabled={labels.length === 0}
        className={control}
      >
        <option value="">Any label</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by priority"
        value={filters.priority ?? ""}
        onChange={(event) => onChange(withValue(filters, "priority", PRIORITIES.find((p) => p === event.target.value) ?? ""))}
        className={control}
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABEL[priority]}
          </option>
        ))}
      </select>
      {isFiltered ? (
        <button type="button" onClick={() => onChange({})} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-ink-soft hover:bg-ink/5 hover:text-ink">
          <X size={13} /> Clear
        </button>
      ) : null}
    </div>
  );
}
