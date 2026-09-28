import { useNavigate } from "@tanstack/react-router";
import { CheckSquare, FileText, FolderKanban, KeyRound, Search, ShieldCheck, Users, Video, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { searchAll, type SearchKind, type SearchResult } from "@/lib/search";
import { useOrgData } from "@/lib/store";
import { cn } from "@/lib/utils";

const KIND_META: Record<SearchKind, { label: string; icon: LucideIcon; to: string }> = {
  project: { label: "Projects", icon: FolderKanban, to: "/projects" },
  task: { label: "Tasks", icon: CheckSquare, to: "/todos" },
  doc: { label: "Documents", icon: FileText, to: "/documents" },
  meeting: { label: "Meetings", icon: Video, to: "/meetings" },
  decision: { label: "Decisions", icon: ShieldCheck, to: "/decisions" },
  credential: { label: "Credentials", icon: KeyRound, to: "/credentials" },
  member: { label: "Members", icon: Users, to: "/members" },
};

/** Header search trigger plus ⌘K / Ctrl+K palette over the current organisation's data. */
export function CommandSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-10 w-[260px] items-center gap-2 rounded-xl border border-line bg-paper px-3 text-xs text-ink-soft/70 hover:border-line hover:bg-panel lg:flex"
      >
        <Search size={16} />
        <span>Search projects, tasks, docs...</span>
        <kbd className="ml-auto rounded-md bg-panel px-1.5 py-1 text-[11px] text-ink-soft">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="grid size-10 place-items-center rounded-xl border border-line bg-panel text-ink-soft hover:bg-paper lg:hidden"
      >
        <Search size={17} />
      </button>
      {open ? <SearchDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const data = useOrgData();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => searchAll(data, query), [data, query]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => setActive(0), [query]);

  const select = (result: SearchResult) => {
    onClose();
    if (result.kind === "project") {
      void navigate({ to: "/projects/$projectId", params: { projectId: result.id } });
      return;
    }
    void navigate({ to: KIND_META[result.kind].to });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") onClose();
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = results[active];
      if (picked) select(picked);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Search"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="text-ink-soft/70" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, tasks, docs, meetings..."
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/70"
          />
          <kbd className="rounded-md bg-line/20 px-1.5 py-1 text-[11px] text-ink-soft">Esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="px-3 py-8 text-center text-xs text-ink-soft/70">Type to search across this organisation</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-ink-soft/70">No results for “{query.trim()}”</div>
          ) : (
            results.map((result, index) => {
              const meta = KIND_META[result.kind];
              const Icon = meta.icon;
              const showHeading = index === 0 || results[index - 1]?.kind !== result.kind;
              return (
                <div key={`${result.kind}-${result.id}`}>
                  {showHeading ? (
                    <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">{meta.label}</div>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => select(result)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                      index === active ? "bg-accent-soft text-accent" : "text-ink",
                    )}
                  >
                    <Icon size={15} className="shrink-0 text-ink-soft/70" />
                    <span className="truncate text-[13px] font-medium">{result.title}</span>
                    <span className="ml-auto shrink-0 truncate text-[11px] text-ink-soft/70">{result.subtitle}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
