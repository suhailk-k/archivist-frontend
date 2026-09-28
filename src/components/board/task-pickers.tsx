import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { LABEL_COLORS } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { ID, LabelColor, Member, ProjectLabel } from "@/lib/types";
import { LABEL_COLOR_NAME, LABEL_DOT, initials } from "./status-meta";

const LABEL_NAME_MAX = 40;
const MAX_TASK_LABELS = 20;

const toggleId = (list: readonly ID[], id: ID): ID[] => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

const option = (isOn: boolean) =>
  cn(
    "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[12px] transition-colors",
    isOn ? "border-accent/50 bg-accent-soft text-accent" : "border-line bg-panel text-ink-soft hover:text-ink",
  );

export function AssigneePicker({ members, value, onChange }: { members: readonly Member[]; value: readonly ID[]; onChange: (next: ID[]) => void }) {
  if (members.length === 0) return <p className="text-[12px] text-ink-soft">No members in this organisation yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map((member) => {
        const isOn = value.includes(member.id);
        return (
          <button key={member.id} type="button" aria-pressed={isOn} onClick={() => onChange(toggleId(value, member.id))} className={option(isOn)}>
            <span className="grid size-[18px] place-items-center rounded-full bg-accent-soft text-[11px] leading-none text-accent">{initials(member.name)}</span>
            {member.name}
            {isOn ? <Check size={12} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export interface LabelPickerProps {
  labels: readonly ProjectLabel[];
  value: readonly ID[];
  onChange: (next: ID[]) => void;
  /** Only superadmins may define labels (projects are superadmin-only on the server). */
  canCreate: boolean;
  onCreate: (name: string, color: LabelColor) => ID;
}

export function LabelPicker({ labels, value, onChange, canCreate, onCreate }: LabelPickerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(LABEL_COLORS[0] ?? "accent");
  const isFull = value.length >= MAX_TASK_LABELS;
  const create = () => {
    const trimmed = name.trim().slice(0, LABEL_NAME_MAX);
    if (!trimmed) return;
    const existing = labels.find((label) => label.name.toLowerCase() === trimmed.toLowerCase());
    const id = existing?.id ?? onCreate(trimmed, color);
    if (!value.includes(id) && !isFull) onChange([...value, id]);
    setName("");
  };
  return (
    <div className="space-y-2">
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const isOn = value.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                aria-pressed={isOn}
                disabled={!isOn && isFull}
                onClick={() => onChange(toggleId(value, label.id))}
                className={cn(option(isOn), "disabled:opacity-45")}
              >
                <span className={cn("size-2 rounded-full", LABEL_DOT[label.color])} />
                {label.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] text-ink-soft">This project has no labels yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={name}
          maxLength={LABEL_NAME_MAX}
          disabled={!canCreate}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            create();
          }}
          placeholder="New label"
          aria-label="New label name"
          className="h-7 w-36 rounded-lg border border-line bg-panel px-2 text-[12px] outline-none focus:border-accent disabled:opacity-45"
        />
        <select
          value={color}
          disabled={!canCreate}
          onChange={(event) => setColor(LABEL_COLORS.find((c) => c === event.target.value) ?? color)}
          aria-label="New label colour"
          className="h-7 rounded-lg border border-line bg-panel px-1.5 text-[12px] outline-none disabled:opacity-45"
        >
          {LABEL_COLORS.map((preset) => (
            <option key={preset} value={preset}>
              {LABEL_COLOR_NAME[preset]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={create}
          disabled={!canCreate || !name.trim()}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-line px-2 text-[12px] text-ink hover:border-accent/40 disabled:opacity-45"
        >
          <Plus size={12} /> Create
        </button>
      </div>
      {!canCreate ? <p className="text-[11px] text-ink-soft">Only a superadmin can create labels. You can apply existing ones.</p> : null}
    </div>
  );
}
