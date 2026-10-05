import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check, Ellipsis, Plus } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { ID, TaskStatus } from "@/lib/types";
import { COLUMN_WIDTH, STATUS_META, columnDropId } from "./status-meta";
import { SortableTaskCard, type TaskCardProps } from "./task-card";


export type ColumnCard = Omit<TaskCardProps, "onOpen" | "today" | "membersById">;

/** "full" is a standalone column with its own header; "lane" is the body of one column inside a swimlane. */
export type ColumnVariant = "full" | "lane";

export interface BoardColumnProps {
  status: TaskStatus;
  cards: ColumnCard[];
  membersById: TaskCardProps["membersById"];
  today: string;
  variant?: ColumnVariant;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onHide: () => void;
  onOpen: (id: ID) => void;
  onCreate?: ((status: TaskStatus, title: string) => void) | undefined;
}

/** Jira column title: small uppercase label, count badge, and a tick on the done column. */
export function ColumnHeading({ status, count }: { status: TaskStatus; count: number }) {
  return (
    <h3 className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium uppercase leading-4 text-ink-soft">
      <span className="truncate">{STATUS_META[status].label}</span>
      {count > 0 ? <span className="rounded-[3px] bg-ink/[0.06] px-1 text-[12px] leading-4">{count}</span> : null}
      {status === "done" ? <Check size={14} className="shrink-0 text-verd" aria-hidden="true" /> : null}
    </h3>
  );
}

export function BoardColumn({ status, cards, membersById, today, variant = "full", isCollapsed, onToggleCollapsed, onHide, onOpen, onCreate }: BoardColumnProps) {
  const meta = STATUS_META[status];
  const isLane = variant === "lane";
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status), data: { type: "column", status } });
  const [isComposing, setIsComposing] = useState(false);

  if (isCollapsed && !isLane) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={`Expand ${meta.label} (${cards.length})`}
        className="flex w-11 shrink-0 snap-start flex-col items-center gap-2 rounded-md bg-sunken py-3 text-ink-soft hover:bg-ink/[0.06]"
      >
        <span className="text-[12px]">{cards.length}</span>
        <span className="text-[12px] font-medium uppercase text-ink-soft [writing-mode:vertical-rl]">{meta.label}</span>
      </button>
    );
  }

  return (
    <section
      aria-label={`${meta.label}, ${cards.length} work items`}
      className={cn("group/column flex shrink-0 snap-start flex-col rounded-md bg-sunken", COLUMN_WIDTH, !isLane && "max-h-full")}
    >
      {isLane ? null : (
        <header className="sticky top-0 z-10 flex h-10 items-center gap-2 rounded-t-md px-3">
          <ColumnHeading status={status} count={cards.length} />
          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/column:opacity-100 max-md:opacity-100">
            <ColumnMenu label={meta.label} onCollapse={onToggleCollapsed} onHide={onHide} />
          </div>
        </header>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-1 px-1 pb-1 transition-colors",
          isLane ? "min-h-16 pt-1" : "min-h-24 overflow-y-auto overscroll-contain",
          isOver && "bg-accent/[0.06]",
        )}
      >
        <SortableContext items={cards.map((card) => card.task.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableTaskCard key={card.task.id} {...card} membersById={membersById} today={today} onOpen={onOpen} />
          ))}
        </SortableContext>
        {onCreate ? (
          isComposing ? (
            <NewItemInput
              onSubmit={(title) => onCreate(status, title)}
              onClose={() => setIsComposing(false)}
              label={`New work item in ${meta.label}`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              aria-label={`Create work item in ${meta.label}`}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[14px] font-medium text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
                // Jira shows "+ Create" on hover only, except in an empty column.
                cards.length > 0 && "opacity-0 focus-visible:opacity-100 group-hover/column:opacity-100 max-md:opacity-100",
              )}
            >
              <Plus size={16} /> Create
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}

/** Enter creates (and stays open for the next one); Esc or leaving an empty input closes. */
function NewItemInput({ onSubmit, onClose, label }: { onSubmit: (title: string) => void; onClose: () => void; label: string }) {
  const [title, setTitle] = useState("");
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim());
    setTitle("");
  };
  return (
    <textarea
      autoFocus
      rows={3}
      aria-label={label}
      value={title}
      placeholder="What needs to be done?"
      onChange={(event) => setTitle(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => !title.trim() && onClose()}
      className="block w-full resize-none rounded-lg border-2 border-accent bg-panel px-3 py-2 text-[14px] text-ink shadow-raised outline-none placeholder:text-ink-soft"
    />
  );
}

function ColumnMenu({ label, onCollapse, onHide }: { label: string; onCollapse: () => void; onHide: () => void }) {
  const [open, setOpen] = useState(false);
  const item = "flex w-full px-3 py-2 text-left text-[14px] text-ink hover:bg-ink/5";
  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`${label} column options`}
        aria-expanded={open}
        className="grid size-7 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
      >
        <Ellipsis size={15} />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border border-line bg-panel py-1 shadow-overlay">
            <button type="button" className={item} onClick={choose(onCollapse)}>
              Collapse column
            </button>
            <button type="button" className={item} onClick={choose(onHide)}>
              Hide while empty
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
