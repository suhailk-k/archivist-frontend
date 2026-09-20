import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "accent" | "verd" | "amber" | "rose" | "line";

const toneDot: Record<Tone, string> = {
  accent: "bg-accent",
  verd: "bg-verd",
  amber: "bg-amber",
  rose: "bg-rose",
  line: "bg-line",
};

const tonePill: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent ring-accent/10",
  verd: "bg-verd/10 text-verd ring-verd/15",
  amber: "bg-amber/10 text-amber ring-amber/15",
  rose: "bg-rose/10 text-rose ring-rose/15",
  line: "bg-ink/5 text-ink-soft ring-ink/5",
};

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("panel rise", className)}>{children}</section>;
}

export function PanelHead({
  index,
  title,
  meta,
  action,
}: {
  index?: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-3">
      {index ? <div className="label-mono tracking-[0.18em]">({index})</div> : null}
      <h2 className="font-display text-[16px] font-medium">{title}</h2>
      {meta ? <span className="font-mono text-[10.5px] text-ink-soft">{meta}</span> : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

export function Pill({ tone = "line", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] ring-1",
        tonePill[tone],
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone])} />
      {children}
    </span>
  );
}

export function Stat({ label, value, note, tone = "line" }: { label: string; value: ReactNode; note?: string; tone?: Tone }) {
  const noteColor =
    tone === "verd" ? "text-verd" : tone === "amber" ? "text-amber" : tone === "rose" ? "text-rose" : "text-ink-soft";
  return (
    <div className="panel rise p-4">
      <div className="label-mono">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-display text-[30px] font-medium leading-none">{value}</span>
        {note ? <span className={cn("mb-0.5 font-mono text-[11px]", noteColor)}>{note}</span> : null}
      </div>
    </div>
  );
}

export function Progress({ value, tone = "accent" }: { value: number; tone?: Tone }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
        <div className={cn("h-full rounded-full", toneDot[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="font-mono text-[10px] text-ink-soft">{value}%</span>
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { id: string; text: ReactNode; meta: string; tone: Tone }[];
}) {
  if (items.length === 0) return <Empty text="Nothing recorded yet." />;
  return (
    <div className="relative pl-4">
      <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-line" />
      <div className="space-y-4">
        {items.map((i) => (
          <div key={i.id} className="relative">
            <span className={cn("absolute -left-[13px] top-1 size-2.5 rounded-full ring-4 ring-paper", toneDot[i.tone])} />
            <div className="text-[12.5px] leading-snug">{i.text}</div>
            <div className="mt-0.5 font-mono text-[9.5px] text-ink-soft">{i.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{text}</p>
    </div>
  );
}

export function DateChip({ date, tone = "accent" }: { date: string; tone?: Tone }) {
  const d = new Date(date + "T00:00:00");
  const valid = !Number.isNaN(d.getTime());
  const ring =
    tone === "verd" ? "bg-verd/10 text-verd ring-verd/15" : tone === "amber" ? "bg-amber/10 text-amber ring-amber/15" : "bg-accent-soft text-accent ring-accent/10";
  return (
    <div className={cn("grid size-11 shrink-0 place-items-center rounded-lg leading-none ring-1", ring)}>
      <div className="font-mono text-[13px] font-medium">{valid ? d.getDate() : "–"}</div>
      <div className="font-mono text-[7px] uppercase tracking-wide">
        {valid ? d.toLocaleDateString(undefined, { weekday: "short" }) : ""}
      </div>
    </div>
  );
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function formatDate(date: string) {
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
