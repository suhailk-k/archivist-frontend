import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-mono">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const base =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-accent focus:ring-2 focus:ring-accent/15";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(base, "min-h-20 resize-y", props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(base, "appearance-none", props.className)} />;
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <div className="flex items-center gap-3 pb-4">
          <h3 className="font-display text-[18px] font-medium">{title}</h3>
          <button onClick={onClose} className="ml-auto font-mono text-[11px] text-ink-soft hover:text-ink">
            esc ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
