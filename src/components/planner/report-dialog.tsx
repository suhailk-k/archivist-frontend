import { useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Field, Modal, SelectInput, TextInput } from "@/components/forms";
import type { DateKey, PlannerView } from "@/lib/daily-plan";
import {
  buildPlannerReport,
  reportPeriod,
  validateReportRange,
  type ReportKind,
  type ReportPeriod,
  type ReportScope,
} from "@/lib/planner-report";
import type { ID, Member, Project, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS: { value: ReportKind; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "custom", label: "Custom range" },
];

const BLOB_RELEASE_MS = 60_000;

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  orgName: string;
  members: Member[];
  tasks: Task[];
  projects: Project[];
  today: DateKey;
  /** Pre-fills the dialog from what the planner is showing. */
  initialView: PlannerView;
  initialAnchor: DateKey;
  initialMemberId: ID;
}

export function ReportDialog(props: ReportDialogProps) {
  if (!props.open) return null;
  // Mounting fresh each time re-seeds the form from the planner's current view.
  return <ReportForm {...props} />;
}

function ReportForm({
  onClose,
  orgName,
  members,
  tasks,
  projects,
  today,
  initialView,
  initialAnchor,
  initialMemberId,
}: ReportDialogProps) {
  const [kind, setKind] = useState<ReportKind>(initialView);
  const [anchor, setAnchor] = useState(initialAnchor);
  const [month, setMonth] = useState(initialAnchor.slice(0, 7));
  const [start, setStart] = useState(reportPeriod("month", initialAnchor).start);
  const [end, setEnd] = useState(initialAnchor);
  const [scope, setScope] = useState<ReportScope>("individual");
  const [memberId, setMemberId] = useState(initialMemberId);

  const period: ReportPeriod =
    kind === "custom" ? { kind, start, end } : reportPeriod(kind, kind === "month" ? `${month}-01` : anchor);
  const rangeError = kind === "custom" ? validateReportRange(start, end) : null;
  const selected = scope === "team" ? members : members.filter((m) => m.id === memberId);

  const generate = () => {
    if (rangeError) {
      toast.error(rangeError);
      return;
    }
    if (selected.length === 0) {
      toast.error("Pick a member for the report");
      return;
    }
    const html = buildPlannerReport({ orgName, scope, members: selected, period, today, tasks, projects, generatedAt: new Date() });
    if (openReport(html)) onClose();
  };

  return (
    <Modal open title="Generate report" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Report type">
          <Segmented options={KINDS} value={kind} onChange={setKind} />
        </Field>

        {kind === "day" || kind === "week" ? (
          <Field label={kind === "day" ? "Day" : "Any day in the week"}>
            <TextInput type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} />
          </Field>
        ) : null}

        {kind === "month" ? (
          <Field label="Month">
            <TextInput type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </Field>
        ) : null}

        {kind === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start date">
              <TextInput type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="End date">
              <TextInput type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
            </Field>
            {rangeError ? <p className="text-[12px] text-rose sm:col-span-2">{rangeError}</p> : null}
          </div>
        ) : null}

        <Field label="Who">
          <Segmented
            options={[
              { value: "individual", label: "Individual" },
              { value: "team", label: `Whole team (${members.length})` },
            ]}
            value={scope}
            onChange={setScope}
          />
        </Field>

        {scope === "individual" ? (
          <Field label="Member">
            <SelectInput value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={generate} disabled={rangeError !== null}>
            Open report
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-paper/60 p-1" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
            option.value === value ? "bg-accent text-paper" : "text-ink-soft hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Opens the report in a new tab; returns false when the browser blocked the pop-up. */
function openReport(html: string): boolean {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const tab = window.open(url, "_blank");
  // Give the new tab time to load the blob before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), BLOB_RELEASE_MS);
  if (!tab) {
    toast.error("Pop-up blocked — allow pop-ups for Archivist to open the report");
    return false;
  }
  tab.opener = null;
  return true;
}
