import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, FolderKanban, ListFilter, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PRIORITIES, type BoardFilters } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { ID, Member, Project, ProjectLabel } from "@/lib/types";
import { menuContent, menuItem, menuLabel } from "./menu-styles";
import { LABEL_DOT, PRIORITY_LABEL } from "./status-meta";
import { Avatar, PriorityIcon } from "./task-card";

const SEARCH_DEBOUNCE_MS = 250;
const MAX_AVATAR_FILTERS = 5;

export interface BoardFiltersBarProps {
  filters: BoardFilters;
  onChange: (next: BoardFilters) => void;
  members: readonly Member[];
  labels: readonly ProjectLabel[];
  /** Offered as a Project filter on the org-wide board; omit on a project's own board. */
  projects?: readonly Project[] | undefined;
  /** The signed-in user's member record; "Me" is offered only when there is one. */
  memberId: ID | null;
}

type ListKey = "assignees" | "projects";

/** Sets or clears one key without leaving `undefined` or empty lists in the URL state. */
function withValue<K extends keyof BoardFilters>(filters: BoardFilters, key: K, value: BoardFilters[K] | ""): BoardFilters {
  const { [key]: _previous, ...rest } = filters;
  const isEmpty = !value || (Array.isArray(value) && value.length === 0);
  return isEmpty ? rest : { ...rest, [key]: value };
}

const toggleIn = (list: readonly string[] | undefined, id: string): string[] =>
  list?.includes(id) ? list.filter((item) => item !== id) : [...(list ?? []), id];

const toolbarButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.04]";
const activeButton = "border-accent/40 bg-accent-soft text-accent hover:bg-accent-soft";

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="grid h-4 min-w-4 place-items-center rounded bg-accent px-1 text-[11px] leading-none text-paper">{count}</span>;
}

function CheckIndicator() {
  return (
    <DropdownMenu.ItemIndicator className="ml-auto text-accent">
      <Check size={14} />
    </DropdownMenu.ItemIndicator>
  );
}

/** Multi-select menus stay open while ticking several items. */
const keepOpen = (event: Event) => event.preventDefault();

export function BoardFiltersBar({ filters, onChange, members, labels, projects, memberId }: BoardFiltersBarProps) {
  const [query, setQuery] = useState(filters.q ?? "");

  useEffect(() => setQuery(filters.q ?? ""), [filters.q]);

  useEffect(() => {
    if (query.trim() === (filters.q ?? "")) return;
    const timer = window.setTimeout(() => onChange(withValue(filters, "q", query.trim())), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, filters, onChange]);

  const menuFilterCount = (filters.label ? 1 : 0) + (filters.priority ? 1 : 0);
  const isFiltered = Object.keys(filters).length > 0;
  const toggleList = (key: ListKey, id: string) => onChange(withValue(filters, key, toggleIn(filters[key], id)));
  /** Picking the active value again clears it. */
  const toggleSingle = <K extends "label" | "priority">(key: K, value: NonNullable<BoardFilters[K]>) =>
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

      <AssigneeFilter members={members} memberId={memberId} selected={filters.assignees ?? []} onToggle={(id) => toggleList("assignees", id)} />

      {projects && projects.length > 0 ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className={cn(toolbarButton, filters.projects?.length && activeButton)}>
            <FolderKanban size={15} /> Project
            <CountBadge count={filters.projects?.length ?? 0} />
            <ChevronDown size={14} className="text-ink-soft" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuContent}>
              {projects.map((project) => (
                <DropdownMenu.CheckboxItem
                  key={project.id}
                  checked={filters.projects?.includes(project.id) ?? false}
                  onSelect={keepOpen}
                  onCheckedChange={() => toggleList("projects", project.id)}
                  className={menuItem}
                >
                  <span className="w-10 font-mono text-[11.5px] text-ink-soft">{project.key}</span>
                  <span className="truncate">{project.name}</span>
                  <CheckIndicator />
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className={cn(toolbarButton, menuFilterCount > 0 && activeButton)}>
          <ListFilter size={15} /> Filter
          <CountBadge count={menuFilterCount} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menuContent}>
            <DropdownMenu.Label className={menuLabel}>Priority</DropdownMenu.Label>
            {PRIORITIES.map((priority) => (
              <DropdownMenu.CheckboxItem key={priority} checked={filters.priority === priority} onCheckedChange={() => toggleSingle("priority", priority)} className={menuItem}>
                <span className="grid w-4 place-items-center">
                  <PriorityIcon priority={priority} />
                </span>
                {PRIORITY_LABEL[priority]}
                <CheckIndicator />
              </DropdownMenu.CheckboxItem>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Label className={menuLabel}>Label</DropdownMenu.Label>
            {labels.length === 0 ? <div className="px-2 py-1.5 text-[12px] text-ink-soft">No labels yet</div> : null}
            {labels.map((label) => (
              <DropdownMenu.CheckboxItem key={label.id} checked={filters.label === label.id} onCheckedChange={() => toggleSingle("label", label.id)} className={menuItem}>
                <span className={cn("size-2.5 rounded-full", LABEL_DOT[label.color])} />
                {label.name}
                <CheckIndicator />
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
  selected: readonly string[];
  onToggle: (id: string) => void;
}

/**
 * Jira-style avatar row: each face toggles "their work" (several can be on at once). Selected faces
 * get an accent ring; the rest of the team sits behind a "+N" checkbox menu.
 */
function AssigneeFilter({ members, memberId, selected, onToggle }: AssigneeFilterProps) {
  const shown = members.slice(0, MAX_AVATAR_FILTERS);
  const hidden = members.slice(MAX_AVATAR_FILTERS);
  const hiddenSelected = hidden.filter((member) => selected.includes(member.id)).length;
  // A white gap, then the selection ring, so overlapping faces stay readable.
  const face = (isOn: boolean) =>
    cn(
      "relative rounded-full outline-none transition-transform hover:z-20 hover:-translate-y-0.5 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-accent",
      isOn && "z-10 ring-2 ring-accent ring-offset-2 ring-offset-panel",
    );
  return (
    <div role="group" aria-label="Filter by assignee" className="flex items-center pl-1">
      {memberId ? (
        <button type="button" aria-pressed={selected.includes("me")} aria-label="Only my work" title="Only my work" onClick={() => onToggle("me")} className={face(selected.includes("me"))}>
          <span className="grid size-8 place-items-center rounded-full bg-line text-ink-soft ring-2 ring-panel">
            <UserRound size={16} />
          </span>
        </button>
      ) : null}
      {shown.map((member, index) => (
        <button
          key={member.id}
          type="button"
          aria-pressed={selected.includes(member.id)}
          aria-label={`Only ${member.name}'s work`}
          title={member.name}
          onClick={() => onToggle(member.id)}
          className={cn(face(selected.includes(member.id)), (memberId || index > 0) && "-ml-1")}
        >
          <Avatar member={member} size="lg" />
        </button>
      ))}
      {hidden.length > 0 ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={`${hidden.length} more people`}
            className={cn(
              face(hiddenSelected > 0),
              "-ml-1 grid size-8 place-items-center bg-line text-[12px] font-semibold text-ink ring-2 ring-panel data-[state=open]:ring-accent",
            )}
          >
            +{hidden.length}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={8} className={cn(menuContent, "min-w-60 py-1.5")}>
              {hidden.map((member) => {
                const isOn = selected.includes(member.id);
                return (
                  <DropdownMenu.CheckboxItem
                    key={member.id}
                    checked={isOn}
                    onSelect={keepOpen}
                    onCheckedChange={() => onToggle(member.id)}
                    className={cn(menuItem, "gap-3 py-2 text-[14px]")}
                  >
                    <span
                      aria-hidden="true"
                      className={cn("grid size-4 shrink-0 place-items-center rounded-[4px] border border-ink-soft/50 bg-panel", isOn && "border-accent bg-accent text-paper")}
                    >
                      {isOn ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <Avatar member={member} size="lg" className="ring-0" />
                    <span className="truncate">{member.name}</span>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}
    </div>
  );
}
