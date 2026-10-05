import { Plus, SquareCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ID, Member, Task } from "@/lib/types";
import { STATUS_LOZENGE, STATUS_META } from "./status-meta";
import { Avatar, PriorityIcon } from "./task-card";

const PERCENT = 100;

export interface TaskChildrenProps {
  items: readonly Task[];
  membersById: ReadonlyMap<ID, Member>;
  keyOf: (task: Task) => string | null;
  onOpen: (id: ID) => void;
  onCreate: (title: string) => void;
}

/** Jira's "Child work items" block: progress bar, one row per child, inline create. */
export function TaskChildren({ items, membersById, keyOf, onOpen, onCreate }: TaskChildrenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const doneCount = items.filter((child) => child.status === "done").length;
  const percent = items.length === 0 ? 0 : Math.round((doneCount / items.length) * PERCENT);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  };

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[16px] font-semibold text-ink">Child work items</h3>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          aria-label="Add child work item"
          className="ml-auto grid size-8 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
        >
          <Plus size={16} />
        </button>
      </div>

      {items.length > 0 ? (
        <>
          <div className="mb-2 flex items-center gap-3">
            <div
              role="progressbar"
              aria-label="Children done"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={PERCENT}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.08]"
            >
              <div className="h-full rounded-full bg-verd" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-[12px] text-ink-soft">{percent}% done</span>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
            {items.map((child) => (
              <ChildRow key={child.id} task={child} taskKey={keyOf(child)} membersById={membersById} onOpen={onOpen} />
            ))}
          </ul>
        </>
      ) : null}

      {isAdding ? (
        <input
          autoFocus
          aria-label="New child work item"
          value={title}
          placeholder="What needs to be done? Enter to add, Esc to close"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") {
              event.stopPropagation();
              setIsAdding(false);
            }
          }}
          onBlur={() => !title.trim() && setIsAdding(false)}
          className="mt-2 h-9 w-full rounded-md border-2 border-accent bg-panel px-3 text-[14px] text-ink outline-none placeholder:text-ink-soft"
        />
      ) : items.length === 0 ? (
        <button type="button" onClick={() => setIsAdding(true)} className="-mx-2 rounded-md px-2 py-1.5 text-[14px] text-ink-soft hover:bg-ink/[0.04]">
          Add child work item
        </button>
      ) : null}
    </section>
  );
}

interface ChildRowProps {
  task: Task;
  taskKey: string | null;
  membersById: ReadonlyMap<ID, Member>;
  onOpen: (id: ID) => void;
}

function ChildRow({ task, taskKey, membersById, onOpen }: ChildRowProps) {
  const assignee = task.assigneeIds[0] ? membersById.get(task.assigneeIds[0]) : undefined;
  return (
    <li>
      <button type="button" onClick={() => onOpen(task.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] hover:bg-sunken">
        <SquareCheck size={16} className="shrink-0 text-accent" aria-hidden="true" />
        {taskKey ? <span className={cn("shrink-0 text-[12px] font-medium text-ink-soft", task.status === "done" && "line-through")}>{taskKey}</span> : null}
        <span className="min-w-0 flex-1 truncate text-ink">{task.title}</span>
        <PriorityIcon priority={task.priority} />
        {assignee ? (
          <Avatar member={assignee} size="sm" />
        ) : (
          <span className="size-5 shrink-0 rounded-full border border-dashed border-ink-soft/50" title="Unassigned" aria-label="Unassigned" />
        )}
        <span className={cn("shrink-0 rounded-[3px] px-1 text-[11px] font-bold uppercase leading-4", STATUS_LOZENGE[task.status])}>{STATUS_META[task.status].label}</span>
      </button>
    </li>
  );
}
