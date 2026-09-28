import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Ellipsis, Plus } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { ID, TaskStatus } from "@/lib/types";
import { STATUS_META, columnDropId } from "./status-meta";
import { SortableTaskCard, type TaskCardProps } from "./task-card";


export type ColumnCard = Omit<TaskCardProps, "onOpen" | "today" | "membersById">;

export interface BoardColumnProps {
  status: TaskStatus;
  cards: ColumnCard[];
  membersById: TaskCardProps["membersById"];
  today: string;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onHide: () => void;
  onOpen: (id: ID) => void;
  onCreate?: ((status: TaskStatus, title: string) => void) | undefined;
}

export function BoardColumn({ status, cards, membersById, today, isCollapsed, onToggleCollapsed, onHide, onOpen, onCreate }: BoardColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status), data: { type: "column", status } });
  const [isComposing, setIsComposing] = useState(false);

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={`Expand ${meta.label} (${cards.length})`}
        className="flex w-11 shrink-0 snap-start flex-col items-center gap-2 rounded-xl bg-ink/[0.035] py-3 text-ink-soft hover:bg-ink/[0.06]"
      >
        <span className="text-[12px]">{cards.length}</span>
        <span className="text-[12px] font-medium text-ink [writing-mode:vertical-rl]">{meta.label}</span>
      </button>
    );
  }

  return (
    <section
      aria-label={`${meta.label}, ${cards.length} work items`}
      className="group/column flex max-h-full w-[min(288px,85vw)] shrink-0 snap-start flex-col rounded-xl bg-ink/[0.035]"
    >
      <header className="sticky top-0 z-10 flex h-11 items-center gap-2 rounded-t-xl px-3">
        <h3 className="text-[12.5px] font-semibold text-ink-soft">{meta.label}</h3>
        <span className="text-[12.5px] text-ink-soft">{cards.length}</span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/column:opacity-100 max-md:opacity-100">
          <ColumnMenu label={meta.label} onCollapse={onToggleCollapsed} onHide={onHide} />
          {onCreate ? (
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              aria-label={`New work item in ${meta.label}`}
              className="grid size-7 place-items-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <Plus size={15} />
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn("min-h-24 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-1.5 pb-1.5 transition-colors", isOver && "bg-accent/[0.05]")}
      >
        <SortableContext items={cards.map((card) => card.task.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableTaskCard key={card.task.id} {...card} membersById={membersById} today={today} onOpen={onOpen} />
          ))}
        </SortableContext>
        {cards.length === 0 && !isComposing ? (
          <div className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[12px] text-ink-soft">No work items</div>
        ) : null}
      </div>

      {onCreate ? (
        <div className="px-1.5 pb-1.5">
          {isComposing ? (
            <NewItemInput
              onSubmit={(title) => onCreate(status, title)}
              onClose={() => setIsComposing(false)}
              label={`New work item in ${meta.label}`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
            >
              <Plus size={15} /> Create
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** Enter creates (and stays open for the next one); Esc or leaving an empty input closes. */
function NewItemInput({ onSubmit, onClose, label }: { onSubmit: (title: string) => void; onClose: () => void; label: string }) {
  const [title, setTitle] = useState("");
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Enter" || !title.trim()) return;
    onSubmit(title.trim());
    setTitle("");
  };
  return (
    <input
      autoFocus
      aria-label={label}
      value={title}
      placeholder="Title — Enter to add, Esc to cancel"
      onChange={(event) => setTitle(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => !title.trim() && onClose()}
      className="w-full rounded-lg border border-accent/50 bg-panel px-3 py-2.5 text-[13px] text-ink outline-none ring-2 ring-accent/15 placeholder:text-ink-soft/70"
    />
  );
}

function ColumnMenu({ label, onCollapse, onHide }: { label: string; onCollapse: () => void; onHide: () => void }) {
  const [open, setOpen] = useState(false);
  const item = "flex w-full px-3 py-2 text-left text-[12.5px] text-ink hover:bg-ink/5";
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
        className="grid size-7 place-items-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink"
      >
        <Ellipsis size={15} />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-lg">
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
