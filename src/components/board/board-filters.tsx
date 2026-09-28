import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ListFilter, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PRIORITIES, type BoardFilters } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { ID, Member, ProjectLabel } from "@/lib/types";
import { menuContent, menuItem, menuLabel } from "./menu-styles";
import { LABEL_DOT, PRIORITY_LABEL, initials } from "./status-meta";
import { PriorityIcon } from "./task-card";

const SEARCH_DEBOUNCE_MS = 250;
const MAX_AVATAR_FILTERS = 6;

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

const toolbarButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.04]";

export function BoardFiltersBar({ filters, onChange, members, labels, memberId }: BoardFiltersBarProps) {
  const [query, setQuery] = useState(filters.q ?? "");

  useEffect(() => setQuery(filters.q ?? ""), [filters.q]);

  useEffect(() => {
    if (query.trim() === (filters.q ?? "")) return;
    const timer = window.setTimeout(() => onChange(withValue(filters, "q", query.trim())), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, filters, onChange]);

  const menuFilterCount = (filters.label ? 1 : 0) + (filters.priority ? 1 : 0);
  const isFiltered = Object.keys(filters).length > 0;
  /** Picking the active value again clears it, like Jira's filter chips. */
  const toggle = <K extends "assignee" | "label" | "priority">(key: K, value: NonNullable<BoardFilters[K]>) =>
    onChange(withValue(filters, key, filters[key] === value ? "" : value));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="sr-only">Search board</span>
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search board"
          className="h-8 w-48 rounded-md border border-line bg-panel pl-8 pr-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      </label>

      <AssigneeFilter members={members} memberId={memberId} selected={filters.assignee} onToggle={(value) => toggle("assignee", value)} />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className={cn(toolbarButton, menuFilterCount > 0 && "border-accent/40 bg-accent-soft text-accent")}>
          <ListFilter size={15} /> Filter
          {menuFilterCount > 0 ? <span className="grid h-4 min-w-4 place-items-center rounded bg-accent px-1 text-[11px] leading-none text-paper">{menuFilterCount}</span> : null}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menuContent}>
            <DropdownMenu.Label className={menuLabel}>Priority</DropdownMenu.Label>
            {PRIORITIES.map((priority) => (
              <DropdownMenu.CheckboxItem key={priority} checked={filters.priority === priority} onCheckedChange={() => toggle("priority", priority)} className={menuItem}>
                <span className="grid w-4 place-items-center">
                  <PriorityIcon priority={priority} />
                </span>
                {PRIORITY_LABEL[priority]}
                <DropdownMenu.ItemIndicator className="ml-auto text-accent">
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.CheckboxItem>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Label className={menuLabel}>Label</DropdownMenu.Label>
            {labels.length === 0 ? <div className="px-2 py-1.5 text-[12px] text-ink-soft">No labels yet</div> : null}
            {labels.map((label) => (
              <DropdownMenu.CheckboxItem key={label.id} checked={filters.label === label.id} onCheckedChange={() => toggle("label", label.id)} className={menuItem}>
                <span className={cn("size-2.5 rounded-full", LABEL_DOT[label.color])} />
                {label.name}
                <DropdownMenu.ItemIndicator className="ml-auto text-accent">
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {isFiltered ? (
        <button type="button" onClick={() => onChange({})} className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

interface AssigneeFilterProps {
  members: readonly Member[];
  memberId: ID | null;
  selected: string | undefined;
  onToggle: (value: string) => void;
}

/** Jira-style avatar row: click a face to show only their work, click again to clear. */
function AssigneeFilter({ members, memberId, selected, onToggle }: AssigneeFilterProps) {
  const shown = members.slice(0, MAX_AVATAR_FILTERS);
  const extra = members.length - shown.length;
  const ring = (isOn: boolean) =>
    cn("relative rounded-full ring-2 transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10", isOn ? "z-10 ring-accent" : "ring-panel");
  return (
    <div role="group" aria-label="Filter by assignee" className="flex items-center pl-1">
      {memberId ? (
        <button type="button" aria-pressed={selected === "me"} aria-label="Only my work" title="Only my work" onClick={() => onToggle("me")} className={ring(selected === "me")}>
          <span className="grid size-7 place-items-center rounded-full bg-line text-ink-soft">
            <UserRound size={15} />
          </span>
        </button>
      ) : null}
      {shown.map((member, index) => (
        <button
          key={member.id}
          type="button"
          aria-pressed={selected === member.id}
          aria-label={`Only ${member.name}'s work`}
          title={member.name}
          onClick={() => onToggle(member.id)}
          className={cn(ring(selected === member.id), (memberId || index > 0) && "-ml-1")}
        >
          <span className="grid size-7 place-items-center rounded-full bg-accent text-[11px] font-semibold leading-none text-paper">{initials(member.name)}</span>
        </button>
      ))}
      {extra > 0 ? <span className="-ml-1 grid size-7 place-items-center rounded-full bg-line text-[11px] font-medium text-ink ring-2 ring-panel">+{extra}</span> : null}
    </div>
  );
}
