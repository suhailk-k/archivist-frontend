import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ConfirmModal, SelectInput, TextArea, TextInput } from "@/components/forms";
import { PRIORITIES, TASK_STATUSES, isPriority, isTaskStatus, taskKey } from "@/lib/board";
import type { ID, LabelColor, Member, Project, Task } from "@/lib/types";
import { PRIORITY_LABEL, STATUS_META } from "./status-meta";
import { AssigneePicker, LabelPicker } from "./task-pickers";

export interface TaskDetailSheetProps {
  /** The open task; the sheet is closed while this is undefined. */
  task: Task | undefined;
  project: Project | undefined;
  members: readonly Member[];
  canManageLabels: boolean;
  onClose: () => void;
  onUpdate: (id: ID, patch: Partial<Task>) => void;
  onDelete: (id: ID) => void;
  onCreateLabel: (projectId: ID, name: string, color: LabelColor) => ID;
}

/** Right-hand sheet for editing one work item; deep-linked with `?task=<id>`. */
export function TaskDetailSheet(props: TaskDetailSheetProps) {
  const { task, onClose } = props;
  return (
    <Dialog.Root open={task !== undefined} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-panel shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
          {task ? <SheetBody key={task.id} {...props} task={task} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-start">
      <div className="label-mono pt-2">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SheetBody({ task, project, members, canManageLabels, onClose, onUpdate, onDelete, onCreateLabel }: TaskDetailSheetProps & { task: Task }) {
  // Text fields save on blur, so typing doesn't send (and re-version) a record per keystroke.
  const [title, setTitle] = useState(task.title);
  const [phase, setPhase] = useState(task.phase);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (patch: Partial<Task>) => onUpdate(task.id, patch);
  const key = project ? taskKey(project.key, task.number) : null;

  const commitTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) setTitle(task.title);
    else if (trimmed !== task.title) update({ title: trimmed });
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="font-mono text-[12px] text-ink-soft">{key ?? "No project"}</span>
        {project ? <span className="truncate text-[12px] text-ink-soft">· {project.name}</span> : null}
        <Dialog.Close asChild>
          <button type="button" aria-label="Close" className="ml-auto grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink">
            <X size={16} />
          </button>
        </Dialog.Close>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <Dialog.Title className="sr-only">{task.title}</Dialog.Title>
        <Dialog.Description className="sr-only">Edit the work item's details. Changes save automatically.</Dialog.Description>
        <textarea
          value={title}
          rows={2}
          aria-label="Title"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.currentTarget.blur();
          }}
          className="w-full resize-none rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-display text-[20px] font-medium leading-snug text-ink outline-none hover:border-line focus:border-accent"
        />

        <Row label="Status">
          <SelectInput aria-label="Status" value={task.status} onChange={(event) => isTaskStatus(event.target.value) && update({ status: event.target.value })}>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </SelectInput>
        </Row>
        <Row label="Priority">
          <SelectInput aria-label="Priority" value={task.priority} onChange={(event) => isPriority(event.target.value) && update({ priority: event.target.value })}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </SelectInput>
        </Row>
        <Row label="Assignees">
          <AssigneePicker members={members} value={task.assigneeIds} onChange={(assigneeIds) => update({ assigneeIds })} />
        </Row>
        <Row label="Labels">
          {project ? (
            <LabelPicker
              labels={project.labels}
              value={task.labels}
              onChange={(labels) => update({ labels })}
              canCreate={canManageLabels}
              onCreate={(name, color) => onCreateLabel(project.id, name, color)}
            />
          ) : (
            <p className="pt-2 text-[12px] text-ink-soft">Labels belong to a project; this item has none.</p>
          )}
        </Row>
        <Row label="Due date">
          <TextInput aria-label="Due date" type="date" value={task.dueDate} onChange={(event) => update({ dueDate: event.target.value })} />
        </Row>
        <Row label="Phase">
          <TextInput aria-label="Phase" value={phase} onChange={(event) => setPhase(event.target.value)} onBlur={() => phase.trim() !== task.phase && update({ phase: phase.trim() })} />
        </Row>
        <Row label="Notes">
          <TextArea
            aria-label="Notes"
            value={notes}
            rows={6}
            placeholder="Details, links, acceptance criteria…"
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => notes !== (task.notes ?? "") && update({ notes })}
          />
        </Row>
      </div>

      <div className="flex items-center border-t border-line px-5 py-3">
        <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-rose hover:bg-rose/10">
          <Trash2 size={14} /> Delete
        </button>
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
