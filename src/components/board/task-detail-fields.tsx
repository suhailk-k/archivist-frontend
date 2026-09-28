import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LABEL_COLORS, PRIORITIES, TASK_STATUSES, isPriority, isTaskStatus } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { ID, LabelColor, Member, Project, ProjectLabel, Task, TaskStatus } from "@/lib/types";
import { menuContent, menuItem, menuLabel } from "./menu-styles";
import { LABEL_BORDER, LABEL_COLOR_NAME, LABEL_DOT, PRIORITY_LABEL, STATUS_META, STATUS_PILL } from "./status-meta";
import { Avatar, PriorityIcon } from "./task-card";

const LABEL_NAME_MAX = 40;
const MAX_TASK_LABELS = 20;

const toggleId = (list: readonly ID[], id: ID): ID[] => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
/** Multi-select menus stay open while ticking several items. */
const keepOpen = (event: Event) => event.preventDefault();

/** A Jira-style value cell: looks like text, highlights on hover, opens an editor on click. */
const valueCell =
  "flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[14px] text-ink outline-none transition-colors hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-accent/40 data-[state=open]:bg-ink/[0.05]";
const staticCell = "flex min-h-8 w-full items-center px-2 py-1 text-[14px]";
const placeholder = "text-ink-soft";

function CheckIndicator() {
  return (
    <DropdownMenu.ItemIndicator className="ml-auto text-accent">
      <Check size={14} />
    </DropdownMenu.ItemIndicator>
  );
}

export function StatusButton({ status, onChange }: { status: TaskStatus; onChange: (next: TaskStatus) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Status: ${STATUS_META[status].label}`}
        className={cn("inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40", STATUS_PILL[status])}
      >
        {STATUS_META[status].label}
        <ChevronDown size={15} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={menuContent}>
          <DropdownMenu.RadioGroup value={status} onValueChange={(value) => isTaskStatus(value) && onChange(value)}>
            {TASK_STATUSES.map((option) => {
              const Icon = STATUS_META[option].icon;
              return (
                <DropdownMenu.RadioItem key={option} value={option} className={menuItem}>
                  <Icon size={15} className={STATUS_META[option].tone} aria-hidden="true" />
                  {STATUS_META[option].label}
                  <CheckIndicator />
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] items-start gap-3 py-1.5">
      <div className="pt-[7px] text-[14px] font-medium text-ink-soft">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export interface DetailsPanelProps {
  task: Task;
  members: readonly Member[];
  /** Projects the task can move to (the org's). */
  projects: readonly Project[];
  /** The project's labels; null for tasks outside a project. */
  labels: readonly ProjectLabel[] | null;
  canCreateLabels: boolean;
  onUpdate: (patch: Partial<Task>) => void;
  onCreateLabel: (name: string, color: LabelColor) => ID;
}

export function DetailsPanel({ task, members, projects, labels, canCreateLabels, onUpdate, onCreateLabel }: DetailsPanelProps) {
  return (
    <div className="px-4 pb-4 pt-2">
      <Row label="Assignee">
        <AssigneeField task={task} members={members} onUpdate={onUpdate} />
      </Row>
      <Row label="Labels">
        {labels ? (
          <LabelsField task={task} labels={labels} canCreate={canCreateLabels} onUpdate={onUpdate} onCreate={onCreateLabel} />
        ) : (
          <div className={cn(staticCell, placeholder)}>Only project work items have labels</div>
        )}
      </Row>
      <Row label="Priority">
        <PriorityField task={task} onUpdate={onUpdate} />
      </Row>
      <Row label="Due date">
        <input
          type="date"
          aria-label="Due date"
          value={task.dueDate}
          onChange={(event) => onUpdate({ dueDate: event.target.value })}
          className={cn(valueCell, "cursor-pointer bg-transparent", !task.dueDate && placeholder)}
        />
      </Row>
      <Row label="Phase">
        <PhaseField key={task.phase} task={task} onUpdate={onUpdate} />
      </Row>
      <Row label="Project">
        <ProjectField task={task} projects={projects} onUpdate={onUpdate} />
      </Row>
    </div>
  );
}

type FieldProps = Pick<DetailsPanelProps, "task" | "onUpdate">;

function AssigneeField({ task, members, onUpdate }: FieldProps & { members: readonly Member[] }) {
  const assignees = members.filter((member) => task.assigneeIds.includes(member.id));
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Assignees" className={cn(valueCell, "flex-wrap gap-x-3 gap-y-1")}>
        {assignees.length === 0 ? <span className={placeholder}>Unassigned</span> : null}
        {assignees.map((member) => (
          <span key={member.id} className="inline-flex items-center gap-2">
            <Avatar member={member} />
            {member.name}
          </span>
        ))}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className={menuContent}>
          {members.length === 0 ? <div className="px-2 py-1.5 text-[12px] text-ink-soft">No members yet</div> : null}
          {members.map((member) => (
            <DropdownMenu.CheckboxItem
              key={member.id}
              checked={task.assigneeIds.includes(member.id)}
              onSelect={keepOpen}
              onCheckedChange={() => onUpdate({ assigneeIds: toggleId(task.assigneeIds, member.id) })}
              className={menuItem}
            >
              <Avatar member={member} size="sm" />
              {member.name}
              <CheckIndicator />
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function PriorityField({ task, onUpdate }: FieldProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={`Priority: ${PRIORITY_LABEL[task.priority]}`} className={valueCell}>
        <span className="grid w-4 place-items-center">
          <PriorityIcon priority={task.priority} />
        </span>
        {PRIORITY_LABEL[task.priority]}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className={menuContent}>
          <DropdownMenu.RadioGroup value={task.priority} onValueChange={(value) => isPriority(value) && onUpdate({ priority: value })}>
            {PRIORITIES.map((priority) => (
              <DropdownMenu.RadioItem key={priority} value={priority} className={menuItem}>
                <span className="grid w-4 place-items-center">
                  <PriorityIcon priority={priority} />
                </span>
                {PRIORITY_LABEL[priority]}
                <CheckIndicator />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const NO_PROJECT = "none";

/** Moving a task renumbers it in the new project and clears its labels (they belong to the old one). */
function ProjectField({ task, projects, onUpdate }: FieldProps & { projects: readonly Project[] }) {
  const current = projects.find((project) => project.id === task.projectId);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={`Project: ${current?.name ?? "None"}`} className={valueCell}>
        {current ? (
          <>
            <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[11.5px] text-ink-soft">{current.key}</span>
            <span className="truncate">{current.name}</span>
          </>
        ) : (
          <span className={placeholder}>No project</span>
        )}
        <ChevronDown size={14} className="ml-auto shrink-0 text-ink-soft" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className={menuContent}>
          <DropdownMenu.Label className={menuLabel}>Move to project</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={task.projectId ?? NO_PROJECT}
            onValueChange={(value) => {
              const projectId = value === NO_PROJECT ? null : value;
              if (projectId !== task.projectId) onUpdate({ projectId });
            }}
          >
            {projects.map((project) => (
              <DropdownMenu.RadioItem key={project.id} value={project.id} className={menuItem}>
                <span className="w-10 font-mono text-[11.5px] text-ink-soft">{project.key}</span>
                <span className="truncate">{project.name}</span>
                <CheckIndicator />
              </DropdownMenu.RadioItem>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.RadioItem value={NO_PROJECT} className={menuItem}>
              <span className="w-10" />
              No project
              <CheckIndicator />
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
          {task.labels.length > 0 ? <p className="px-2 pb-1 pt-1.5 text-[11.5px] text-ink-soft">Moving clears this item's labels.</p> : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function PhaseField({ task, onUpdate }: FieldProps) {
  const [phase, setPhase] = useState(task.phase);
  return (
    <input
      aria-label="Phase"
      value={phase}
      placeholder="Add phase"
      onChange={(event) => setPhase(event.target.value)}
      onBlur={() => phase.trim() !== task.phase && onUpdate({ phase: phase.trim() })}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      className={cn(valueCell, "bg-transparent placeholder:text-ink-soft focus:bg-panel focus:ring-2 focus:ring-accent/30")}
    />
  );
}

interface LabelsFieldProps extends FieldProps {
  labels: readonly ProjectLabel[];
  canCreate: boolean;
  onCreate: (name: string, color: LabelColor) => ID;
}

function LabelsField({ task, labels, canCreate, onUpdate, onCreate }: LabelsFieldProps) {
  const [isCreating, setIsCreating] = useState(false);
  /** Set when "Create label" closes the menu, so focus goes to the new form instead of back to the trigger. */
  const isOpeningForm = useRef(false);
  const applied = labels.filter((label) => task.labels.includes(label.id));
  const isFull = task.labels.length >= MAX_TASK_LABELS;
  const create = (name: string, color: LabelColor) => {
    const match = labels.find((label) => label.name.toLowerCase() === name.toLowerCase());
    const id = match?.id ?? onCreate(name, color);
    if (!task.labels.includes(id) && !isFull) onUpdate({ labels: [...task.labels, id] });
    setIsCreating(false);
  };
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger aria-label="Labels" className={cn(valueCell, "flex-wrap gap-1")}>
          {applied.length === 0 ? <span className={placeholder}>Add labels</span> : null}
          {applied.map((label) => (
            <span key={label.id} className={cn("inline-flex h-[22px] items-center rounded-[4px] border bg-panel px-1.5 text-[12px] leading-none", LABEL_BORDER[label.color])}>
              {label.name}
            </span>
          ))}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className={menuContent}
            onCloseAutoFocus={(event) => {
              if (!isOpeningForm.current) return;
              isOpeningForm.current = false;
              event.preventDefault();
            }}
          >
            {labels.length === 0 ? <div className="px-2 py-1.5 text-[12px] text-ink-soft">This project has no labels yet</div> : null}
            {labels.map((label) => {
              const isOn = task.labels.includes(label.id);
              return (
                <DropdownMenu.CheckboxItem
                  key={label.id}
                  checked={isOn}
                  disabled={!isOn && isFull}
                  onSelect={keepOpen}
                  onCheckedChange={() => onUpdate({ labels: toggleId(task.labels, label.id) })}
                  className={menuItem}
                >
                  <span className={cn("size-2.5 rounded-full", LABEL_DOT[label.color])} />
                  {label.name}
                  <CheckIndicator />
                </DropdownMenu.CheckboxItem>
              );
            })}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item disabled={!canCreate} onSelect={() => {
                isOpeningForm.current = true;
                setIsCreating(true);
              }} className={menuItem}>
              <Plus size={14} /> Create label
            </DropdownMenu.Item>
            {!canCreate ? (
              <DropdownMenu.Label className={cn(menuLabel, "font-normal normal-case tracking-normal")}>Only a superadmin can create labels</DropdownMenu.Label>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {isCreating ? <NewLabelForm onSubmit={create} onCancel={() => setIsCreating(false)} /> : null}
    </>
  );
}

function NewLabelForm({ onSubmit, onCancel }: { onSubmit: (name: string, color: LabelColor) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(LABEL_COLORS[0] ?? "accent");
  const inputRef = useRef<HTMLInputElement>(null);
  // The form mounts while the labels menu is still closing; focus once it has gone.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const submit = () => {
    const trimmed = name.trim().slice(0, LABEL_NAME_MAX);
    if (trimmed) onSubmit(trimmed, color);
  };
  return (
    <div className="mt-1.5 space-y-2 rounded-lg border border-line bg-panel p-2">
      <input
        ref={inputRef}
        value={name}
        maxLength={LABEL_NAME_MAX}
        placeholder="Label name"
        aria-label="New label name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
        }}
        className="h-8 w-full rounded-md border border-line bg-panel px-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
      <div role="radiogroup" aria-label="Label colour" className="flex flex-wrap gap-1.5">
        {LABEL_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={color === preset}
            aria-label={LABEL_COLOR_NAME[preset]}
            title={LABEL_COLOR_NAME[preset]}
            onClick={() => setColor(preset)}
            className={cn("size-5 rounded-full ring-offset-2 ring-offset-panel", LABEL_DOT[preset], color === preset && "ring-2 ring-accent")}
          />
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={onCancel} className="h-7 rounded-md px-2.5 text-[12.5px] text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={!name.trim()} className="h-7 rounded-md bg-accent px-2.5 text-[12.5px] font-medium text-paper hover:opacity-90 disabled:opacity-45">
          Create
        </button>
      </div>
    </div>
  );
}
