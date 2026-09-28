import { Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

/** The "Manage" dropdown in the project page header: edit or delete the project. */
export function ProjectActionsMenu({
  trigger,
  onEdit,
  onDelete,
  align = "right",
}: {
  trigger: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block" onClick={() => setOpen((value) => !value)}>
      {trigger}
      {open ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink hover:bg-panel/70"
            >
              <Pencil size={14} /> Edit project
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-rose hover:bg-rose/10"
            >
              <Trash2 size={14} /> Delete project
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
