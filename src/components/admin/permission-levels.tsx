import { cn } from "@/lib/utils";
import {
  CREDENTIAL_LEVELS,
  CREDENTIAL_LEVEL_LABEL,
  DOCUMENT_LEVELS,
  DOCUMENT_LEVEL_LABEL,
  FULL_PERMISSIONS,
  type Permissions,
} from "@/lib/permissions";

export interface PermissionLevelsProps {
  /** Absent means full access (accounts that were never restricted). */
  value: Permissions | undefined;
  onChange: (next: Permissions) => void;
  disabled?: boolean;
}

/** Documents and Credentials levels, applied inside whatever organisations/projects are granted below. */
export function PermissionLevels({ value, onChange, disabled = false }: PermissionLevelsProps) {
  const current = value ?? FULL_PERMISSIONS;
  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-lg border border-line/60 p-3">
      <legend className="px-1 text-[13px] font-medium">Permissions</legend>
      <LevelPicker
        label="Documents"
        hint="'View' opens shared documents. 'Edit' can also create documents and change their own or shared-for-edit ones."
        levels={DOCUMENT_LEVELS}
        labels={DOCUMENT_LEVEL_LABEL}
        value={current.documents}
        onChange={(documents) => onChange({ ...current, documents })}
      />
      <LevelPicker
        label="Credentials"
        hint="'View list' shows names and logins only; 'View + reveal' can also read secrets (each reveal is logged). 'Edit' can also create credentials and change their own or shared-for-edit ones."
        levels={CREDENTIAL_LEVELS}
        labels={CREDENTIAL_LEVEL_LABEL}
        value={current.credentials}
        onChange={(credentials) => onChange({ ...current, credentials })}
      />
    </fieldset>
  );
}

interface LevelPickerProps<Level extends string> {
  label: string;
  hint: string;
  levels: readonly Level[];
  labels: Record<Level, string>;
  value: Level;
  onChange: (next: Level) => void;
}

function LevelPicker<Level extends string>({ label, hint, levels, labels, value, onChange }: LevelPickerProps<Level>) {
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[12.5px] font-medium">{label}</span>
        <span className="text-[11px] text-ink-soft">{hint}</span>
      </div>
      <div role="radiogroup" aria-label={`${label} access`} className="inline-flex flex-wrap rounded-md border border-line p-0.5">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            onClick={() => onChange(level)}
            className={cn(
              "rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-45",
              value === level ? (level === "none" ? "bg-rose/10 text-rose" : "bg-accent-soft text-accent") : "text-ink-soft hover:bg-ink/[0.05] hover:text-ink",
            )}
          >
            {labels[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
