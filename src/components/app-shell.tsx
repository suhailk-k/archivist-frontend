import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useOrgData, useStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/planning", label: "Planning" },
  { to: "/todos", label: "To-do" },
  { to: "/documents", label: "Documents" },
  { to: "/meetings", label: "Meetings" },
  { to: "/decisions", label: "Decisions" },
  { to: "/members", label: "Members" },
  { to: "/history", label: "History" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { db, orgId, setOrgId, org } = useStore();
  const data = useOrgData();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const counts: Record<string, string | number | undefined> = {
    "/projects": data.projects.length,
    "/todos": data.tasks.filter((t) => !t.done).length,
    "/members": data.members.length,
    "/decisions": data.decisions.filter((d) => d.status === "open").length || undefined,
  };

  return (
    <div className="min-h-screen bg-paper text-ink antialiased selection:bg-accent/30">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 size-[520px] rounded-full bg-accent/15 blur-[140px]" />
        <div className="absolute top-24 -right-24 size-[420px] rounded-full bg-verd/8 blur-[140px]" />
        <div className="absolute bottom-0 left-10 size-[360px] rounded-full bg-amber/6 blur-[140px]" />
      </div>

      <div className="mx-auto flex max-w-[1520px]">
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line/80 bg-panel/85 shadow-[12px_0_40px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl md:flex">
          <div className="px-5 pt-5 pb-4">
            <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-accent/70">
              <div className="grid size-8 place-items-center rounded-lg bg-accent/20 font-display text-[15px] italic text-accent ring-1 ring-accent/30">A</div>
              <div className="leading-none">
                <div className="font-display text-[17px] font-medium tracking-tight">Archivist</div>
                <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-soft">Personal OS</div>
              </div>
            </Link>
          </div>

          <div className="px-4">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="relative w-full rounded-xl border border-line/60 bg-panel/60 p-1.5 text-left transition-all hover:border-accent/50 hover:bg-panel/80 focus-visible:ring-2 focus-visible:ring-accent/70 backdrop-blur-md"
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft">
                Org
              </span>
              <div className="flex items-center gap-2 py-1.5 pl-9 pr-2">
                <span className="size-2 rounded-full bg-verd" />
                <span className="truncate text-[13px] font-medium">{org?.name ?? "No organisation"}</span>
                <span className="ml-auto font-mono text-[10px] text-ink-soft">▾</span>
              </div>
            </button>

            {switcherOpen ? (
              <div className="mt-2 space-y-1">
                {db.organisations
                  .filter((o) => o.id !== orgId)
                  .map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setOrgId(o.id);
                        setSwitcherOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-[12px] text-ink-soft hover:bg-ink/5"
                    >
                      <span className="size-1.5 rounded-full bg-line" />
                      <span className="truncate">{o.name}</span>
                      <span className="ml-auto font-mono text-[10px]">
                        {db.projects.filter((p) => p.orgId === o.id).length}
                      </span>
                    </button>
                  ))}
                <Link
                  to="/organisations"
                  onClick={() => setSwitcherOpen(false)}
                  className="block px-1 pt-1 font-mono text-[10px] text-accent hover:underline"
                >
                  Manage organisations →
                </Link>
              </div>
            ) : null}
          </div>

          <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
            <div className="px-2 pb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">Workspace</div>
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all focus-visible:ring-2 focus-visible:ring-accent/70",
                    active
                      ? "bg-accent/15 font-medium text-accent ring-1 ring-accent/30 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r-full before:bg-accent"
                      : "text-ink-soft hover:bg-ink/8",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", active ? "bg-accent" : "bg-line")} />
                  {item.label}
                  {counts[item.to] !== undefined ? (
                    <span className="ml-auto font-mono text-[10px]">{counts[item.to]}</span>
                  ) : null}
                </Link>
              );
            })}
            <div className="px-2 pt-4 pb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">Account</div>
            <Link
              to="/organisations"
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all focus-visible:ring-2 focus-visible:ring-accent/70",
                pathname.startsWith("/organisations")
                  ? "bg-accent/15 font-medium text-accent ring-1 ring-accent/30 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r-full before:bg-accent"
                  : "text-ink-soft hover:bg-ink/8",
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", pathname.startsWith("/organisations") ? "bg-accent" : "bg-line")}
              />
              Organisations
              <span className="ml-auto font-mono text-[10px]">{db.organisations.length}</span>
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  crumb,
  action,
}: {
  title: string;
  crumb: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/85 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="flex items-center gap-4 px-6 py-3.5 md:px-8">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[22px] font-medium tracking-tight">{title}</h1>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">{crumb}</div>
        </div>
        {action ? <div className="ml-auto flex items-center gap-2.5">{action}</div> : null}
      </div>
    </header>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-[12.5px] font-medium text-paper transition-all hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-accent/70"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-lg border border-line/60 bg-panel/40 px-3.5 text-[12px] font-medium transition-all hover:border-line/80 hover:bg-panel/70 focus-visible:ring-2 focus-visible:ring-accent/70"
    >
      {children}
    </button>
  );
}
