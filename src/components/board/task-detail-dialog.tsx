import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Ellipsis, Link2, SquareCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/forms";
import { taskKey } from "@/lib/board";
import type { ID, LabelColor, Member, Project, Task } from "@/lib/types";
import { menuContent, menuItem } from "./menu-styles";
import { DetailsPanel, StatusButton } from "./task-detail-fields";

export interface TaskDetailDialogProps {
  /** The open task; the dialog is closed while this is undefined. */
  task: Task | undefined;
  project: Project | undefined;
  /** The org's projects, for moving the task. */
  projects: readonly Project[];
  members: readonly Member[];
  canManageLabels: boolean;
  onClose: () => void;
  onUpdate: (id: ID, patch: Partial<Task>) => void;
  onDelete: (id: ID) => void;
  onCreateLabel: (projectId: ID, name: string, color: LabelColor) => ID;
}

const iconButton =
  "grid size-9 place-items-center rounded-md text-ink-soft outline-none transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 data-[state=open]:bg-ink/[0.06]";

const createdLabel = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `Created ${day} at ${time}`;
};

/** Jira-style work item view: content on the left, status and details on the right. Deep-linked with `?task=<id>`. */
export function TaskDetailDialog(props: TaskDetailDialogProps) {
  const { task, onClose } = props;
  return (
    <Dialog.Root open={task !== undefined} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 top-3 z-50 flex flex-col overflow-hidden rounded-t-2xl bg-panel shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] md:inset-x-6 md:bottom-6 md:top-6 md:mx-auto md:max-w-[1180px] md:rounded-xl"
        >
          {task ? <DialogBody key={task.id} {...props} task={task} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogBody({ task, project, projects, members, canManageLabels, onClose, onUpdate, onDelete, onCreateLabel }: TaskDetailDialogProps & { task: Task }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const update = (patch: Partial<Task>) => onUpdate(task.id, patch);
  const key = project ? taskKey(project.key, task.number) : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <>
      <header className="flex items-center gap-2 px-5 pb-2 pt-4 md:px-8">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13.5px] text-ink-soft">
          {project ? <span className="truncate">{project.name}</span> : <span>No project</span>}
          <span aria-hidden="true">/</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-ink">
            <SquareCheck size={16} className="text-accent" aria-hidden="true" />
            {key ?? "Work item"}
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => void copyLink()} aria-label="Copy link" title="Copy link" className={iconButton}>
            <Link2 size={17} />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger aria-label="More actions" className={iconButton}>
              <Ellipsis size={17} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={4} className={menuContent}>
                <DropdownMenu.Item onSelect={() => setConfirmDelete(true)} className={`${menuItem} text-rose data-[highlighted]:bg-rose/10`}>
                  <Trash2 size={14} /> Delete work item
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <Dialog.Close aria-label="Close" className={iconButton}>
            <X size={18} />
          </Dialog.Close>
        </div>
      </header>

      <div className="grid flex-1 content-start gap-x-10 gap-y-6 overflow-y-auto px-5 pb-8 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] md:px-8">
        <div className="min-w-0 space-y-7">
          <TitleField task={task} onUpdate={update} />
          <DescriptionField task={task} onUpdate={update} />
        </div>

        <aside className="min-w-0 space-y-3 md:pt-1">
          <StatusButton status={task.status} onChange={(status) => update({ status })} />
          <section className="rounded-lg border border-line">
            <button
              type="button"
              aria-expanded={isDetailsOpen}
              onClick={() => setIsDetailsOpen((open) => !open)}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-[16px] font-semibold text-ink"
            >
              <ChevronDown size={16} className={`text-ink-soft transition-transform ${isDetailsOpen ? "" : "-rotate-90"}`} />
              Details
            </button>
            {isDetailsOpen ? (
              <div className="border-t border-line">
                <DetailsPanel
                  task={task}
                  members={members}
                  projects={projects}
                  labels={project?.labels ?? null}
                  canCreateLabels={canManageLabels}
                  onUpdate={update}
                  onCreateLabel={(name, color) => (project ? onCreateLabel(project.id, name, color) : "")}
                />
              </div>
            ) : null}
          </section>
          <p className="px-1 text-[12.5px] text-ink-soft">{createdLabel(task.createdAt)}</p>
        </aside>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this work item?"
        description={`"${task.title}" will be permanently deleted. This can't be undone.`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete(task.id);
          onClose();
        }}
      />
    </>
  );
}

type FieldProps = { task: Task; onUpdate: (patch: Partial<Task>) => void };

/** Saves on blur or Enter, so typing doesn't send (and re-version) a record per keystroke. */
function TitleField({ task, onUpdate }: FieldProps) {
  const [title, setTitle] = useState(task.title);
  const commit = () => {
    const trimmed = title.trim();
    if (!trimmed) setTitle(task.title);
    else if (trimmed !== task.title) onUpdate({ title: trimmed });
  };
  return (
    <Dialog.Title asChild>
      <textarea
        value={title}
        rows={Math.min(4, Math.max(1, Math.ceil(title.length / 48)))}
        aria-label="Title"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          event.currentTarget.blur();
        }}
        className="-mx-2 block w-[calc(100%+1rem)] resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink outline-none transition-colors hover:bg-ink/[0.04] focus:border-accent focus:bg-panel"
      />
    </Dialog.Title>
  );
}

function DescriptionField({ task, onUpdate }: FieldProps) {
  const saved = task.notes ?? "";
  const [draft, setDraft] = useState(saved);
  const [isEditing, setIsEditing] = useState(false);
  const save = () => {
    if (draft !== saved) onUpdate({ notes: draft });
    setIsEditing(false);
  };
  const cancel = () => {
    setDraft(saved);
    setIsEditing(false);
  };
  return (
    <section>
      <h3 className="mb-2 text-[16px] font-semibold text-ink">Description</h3>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            rows={8}
            aria-label="Description"
            placeholder="Add details, links, acceptance criteria…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                cancel();
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
            }}
            className="w-full resize-y rounded-md border border-accent bg-panel px-3 py-2 text-[14px] leading-relaxed text-ink outline-none ring-2 ring-accent/15 placeholder:text-ink-soft"
          />
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={save} className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-paper hover:opacity-90">
              Save
            </button>
            <button type="button" onClick={cancel} className="h-8 rounded-md px-3 text-[13px] font-medium text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
              Cancel
            </button>
            <span className="ml-auto text-[12px] text-ink-soft">⌘ Enter to save · Esc to cancel</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="-mx-2 block w-[calc(100%+1rem)] whitespace-pre-wrap rounded-md px-2 py-1.5 text-left text-[14px] leading-relaxed text-ink transition-colors hover:bg-ink/[0.04]"
        >
          {saved ? saved : <span className="text-ink-soft">Add a description…</span>}
        </button>
      )}
    </section>
  );
}
