import { ExternalLink, FileText, Link2, Pencil, Plus, Search, StickyNote, Trash2, type LucideIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/app-shell";
import { DocDownloadButton } from "@/components/doc-download-button";
import { formatBytes } from "@/components/doc-upload-field";
import { CreateDocModal, EditDocModal } from "@/components/edit-doc-modal";
import { ConfirmModal } from "@/components/forms";
import { relativeTime } from "@/components/kit";
import { fileUrl } from "@/lib/api-client";
import { isHttpUrl } from "@/lib/project-links";
import { useStore } from "@/lib/store";
import type { Doc, ID, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_KINDS = "__all__";
const UNKINDED = "Other";
/** Notes longer than this (or spanning >2 lines) get a "Show more" toggle. */
const NOTES_PREVIEW_CHARS = 180;

interface ProjectDocsProps {
  projectId: ID;
  orgId: ID;
}

function docIcon(doc: Doc): LucideIcon {
  if (doc.fileId) return FileText;
  if (doc.link) return Link2;
  return StickyNote;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function matchesQuery(doc: Doc, needle: string): boolean {
  if (!needle) return true;
  return `${doc.title} ${doc.kind} ${doc.notes} ${doc.fileName}`.toLowerCase().includes(needle);
}

function countKinds(docs: Doc[]): [string, number][] {
  const counts = docs.reduce<Record<string, number>>((acc, d) => {
    const key = d.kind || UNKINDED;
    return { ...acc, [key]: (acc[key] ?? 0) + 1 };
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** A project's Documents tab: searchable, kind-filtered cards showing notes, attachments and links. */
export function ProjectDocs({ projectId, orgId }: ProjectDocsProps) {
  const { db, removeDoc } = useStore();
  const members = db.members.filter((m) => m.orgId === orgId);
  const docs = useMemo(
    () => db.docs.filter((d) => d.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [db.docs, projectId],
  );
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(ALL_KINDS);
  const [isCreating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [deletingId, setDeletingId] = useState<ID | null>(null);

  const editing = docs.find((d) => d.id === editingId) ?? null;
  const deleting = docs.find((d) => d.id === deletingId);
  const kindCounts = useMemo(() => countKinds(docs), [docs]);
  const needle = query.trim().toLowerCase();
  const visible = docs.filter((d) => (kind === ALL_KINDS || (d.kind || UNKINDED) === kind) && matchesQuery(d, needle));
  const fileCount = docs.filter((d) => d.fileId).length;

  return (
    <div className="space-y-3">
      <CreateDocModal open={isCreating} orgId={orgId} projectId={projectId} members={members} onClose={() => setCreating(false)} />
      <EditDocModal doc={editing} members={members} onClose={() => setEditingId(null)} />
      <ConfirmModal
        open={deleting !== undefined}
        title="Delete this document?"
        description={`"${deleting?.title ?? ""}" and any attached file will be permanently deleted. This can't be undone.`}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (!deleting) return;
          removeDoc(deleting.id);
          toast.success("Document deleted");
        }}
      />

      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink">Documents</h2>
            <p className="text-[11px] text-ink-soft">
              {plural(docs.length, "document")} · {plural(fileCount, "file")}
            </p>
          </div>
          <label className="relative ml-auto flex min-w-[12rem] flex-1 items-center sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 text-ink-soft/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, notes, file…"
              aria-label="Search documents"
              className="w-full rounded-lg border border-line bg-panel py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <PrimaryButton onClick={() => setCreating(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} /> New document
            </span>
          </PrimaryButton>
        </div>
        {kindCounts.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Filter by kind">
            <KindChip label="All" count={docs.length} isActive={kind === ALL_KINDS} onClick={() => setKind(ALL_KINDS)} />
            {kindCounts.map(([k, count]) => (
              <KindChip key={k} label={k} count={count} isActive={kind === k} onClick={() => setKind(k)} />
            ))}
          </div>
        ) : null}
      </div>

      {docs.length === 0 ? (
        <EmptyDocs onCreate={() => setCreating(true)} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel px-4 py-8 text-center text-[12.5px] text-ink-soft">
          No documents match your filters.
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((d) => (
            <DocCard
              key={d.id}
              doc={d}
              owner={members.find((m) => m.id === d.ownerId)}
              onEdit={() => setEditingId(d.id)}
              onDelete={() => setDeletingId(d.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function KindChip({ label, count, isActive, onClick }: { label: string; count: number; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors",
        isActive ? "bg-accent text-white ring-accent" : "bg-panel text-ink-soft ring-line hover:ring-accent/40",
      )}
    >
      {label}
      <span className={cn("font-mono text-[11px]", isActive ? "text-white/80" : "text-ink-soft/70")}>{count}</span>
    </button>
  );
}

function EmptyDocs({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel px-6 py-10 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-accent/10 text-accent">
        <FileText size={18} />
      </div>
      <h3 className="mt-3 text-[14px] font-semibold text-ink">No documents yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-ink-soft">
        Keep specs, environment setup, contracts and handover notes next to the work.
      </p>
      <button type="button" onClick={onCreate} className="mt-4 text-[12.5px] font-medium text-accent hover:underline">
        + Add the first document
      </button>
    </div>
  );
}

interface DocCardProps {
  doc: Doc;
  owner: Member | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

function DocCard({ doc, owner, onEdit, onDelete }: DocCardProps) {
  const Icon = docIcon(doc);
  return (
    <li className="group rounded-xl border border-line bg-panel p-3.5 transition-colors hover:border-accent/30">
      <div className="flex gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{doc.title}</h3>
            {doc.kind ? <span className="rounded-md bg-line/20 px-1.5 py-0.5 font-mono text-[11px] text-ink-soft">{doc.kind}</span> : null}
          </div>

          {doc.notes ? <DocNotes notes={doc.notes} /> : <p className="mt-1 text-[12px] italic text-ink-soft/70">No notes</p>}

          {doc.fileId || doc.link ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AttachmentChip doc={doc} />
              {doc.link && isHttpUrl(doc.link) ? (
                <a
                  href={doc.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-accent/40 hover:text-accent"
                >
                  <ExternalLink size={12} />
                  <span className="truncate">{hostOf(doc.link)}</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
          <div className="flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <IconAction label={`Edit ${doc.title}`} onClick={onEdit} className="hover:text-accent">
              <Pencil size={13} />
            </IconAction>
            <IconAction label={`Delete ${doc.title}`} onClick={onDelete} className="hover:text-rose">
              <Trash2 size={13} />
            </IconAction>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            {owner ? (
              <>
                <span className="grid size-5 place-items-center rounded-full bg-line/20 text-[11px] font-semibold text-ink-soft" aria-hidden>
                  {initials(owner.name)}
                </span>
                <span className="hidden sm:inline">{owner.name}</span>
                <span className="text-ink-soft/50">·</span>
              </>
            ) : null}
            <time dateTime={doc.updatedAt} title={new Date(doc.updatedAt).toLocaleString()}>
              {relativeTime(doc.updatedAt)}
            </time>
          </div>
        </div>
      </div>
    </li>
  );
}

function DocNotes({ notes }: { notes: string }) {
  const [isExpanded, setExpanded] = useState(false);
  const isLong = notes.length > NOTES_PREVIEW_CHARS || notes.split("\n").length > 2;
  return (
    <div className="mt-1.5">
      <p className={cn("whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft", isLong && !isExpanded && "line-clamp-2")}>{notes}</p>
      {isLong ? (
        <button type="button" onClick={() => setExpanded(!isExpanded)} className="mt-0.5 text-[11px] font-medium text-accent hover:underline">
          {isExpanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function AttachmentChip({ doc }: { doc: Doc }) {
  if (!doc.fileId) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-line py-0.5 pl-2 pr-0.5 text-[11px] text-ink-soft">
      <FileText size={12} className="shrink-0 text-ink-soft/70" />
      <a href={fileUrl(doc.fileId)} target="_blank" rel="noreferrer" className="truncate hover:text-accent hover:underline" title="Open preview">
        {doc.fileName || "file"}
      </a>
      {doc.fileSize > 0 ? <span className="shrink-0 text-ink-soft/70">· {formatBytes(doc.fileSize)}</span> : null}
      <DocDownloadButton doc={doc} />
    </span>
  );
}

function IconAction({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("grid size-7 place-items-center rounded-md text-ink-soft/70 hover:bg-line/20", className)}
    >
      {children}
    </button>
  );
}
