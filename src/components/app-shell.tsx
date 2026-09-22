import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
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
  const { db, orgId, setOrgId, org, syncError, refresh } = useStore();
  const { user, logout } = useAuth();
  const data = useOrgData();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const counts: Record<string, string | number | undefined> = {
    "/projects": data.projects.length,
    "/todos": data.tasks.filter((t) => !t.done).length,
    "/members": data.members.length,
    "/decisions": data.decisions.filter((d) => d.status === "open").length || undefined,
  };

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return <ProjectWorkspaceShell>{children}</ProjectWorkspaceShell>;
  }

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

          {syncError ? (
            <button
              type="button"
              onClick={() => {
                void refresh().catch(() => toast.error("Archivist backend is still unreachable"));
              }}
              className="mx-4 mt-2 flex items-center gap-2 rounded-lg border border-rose/40 bg-rose/10 px-2.5 py-2 text-left transition-colors hover:border-rose/70 focus-visible:ring-2 focus-visible:ring-rose/60"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-rose" />
              <span className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-rose">Backend offline</span>
                <span className="block truncate text-[11px] text-ink-soft">Tap to retry</span>
              </span>
            </button>
          ) : null}

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
            {user?.role === "superadmin" ? (
              <Link
                to="/admin"
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all focus-visible:ring-2 focus-visible:ring-accent/70",
                  pathname.startsWith("/admin")
                    ? "bg-accent/15 font-medium text-accent ring-1 ring-accent/30 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r-full before:bg-accent"
                    : "text-ink-soft hover:bg-ink/8",
                )}
              >
                <span className={cn("size-1.5 rounded-full", pathname.startsWith("/admin") ? "bg-accent" : "bg-line")} />
                Access control
              </Link>
            ) : null}
          </nav>

          {user ? (
            <div className="border-t border-line/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-[11px] text-accent ring-1 ring-accent/25">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium">{user.displayName}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft">
                    {user.role === "superadmin" ? "Superadmin" : "Member"}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => {
                    setSigningOut(true);
                    void logout()
                      .catch(() => toast.error("Could not sign out"))
                      .finally(() => setSigningOut(false));
                  }}
                  className="ml-auto rounded-lg border border-line/60 px-2 py-1 font-mono text-[10px] text-ink-soft transition-colors hover:border-rose/60 hover:text-rose focus-visible:ring-2 focus-visible:ring-accent/70 disabled:opacity-50"
                >
                  {signingOut ? "…" : "Sign out"}
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

const NAV_ICONS = {
  "/": LayoutDashboard,
  "/projects": FolderKanban,
  "/planning": CalendarDays,
  "/todos": CheckSquare,
  "/documents": FileText,
  "/meetings": Video,
  "/decisions": ShieldCheck,
  "/members": Users,
  "/history": History,
} as const;

function ProjectWorkspaceShell({ children }: { children: ReactNode }) {
  const { db, orgId, setOrgId, org, syncError, refresh } = useStore();
  const { user, logout } = useAuth();
  const data = useOrgData();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const counts: Record<string, string | number | undefined> = {
    "/projects": data.projects.length,
    "/todos": data.tasks.filter((task) => !task.done).length,
    "/members": data.members.length,
    "/decisions": data.decisions.filter((decision) => decision.status === "open").length || undefined,
  };

  const renderNav = (items: readonly typeof NAV[number][]) =>
    items.map((item) => {
      const Icon = NAV_ICONS[item.to];
      const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
      return (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
            active ? "bg-[#5146e5] text-white shadow-lg shadow-indigo-950/25" : "text-slate-300 hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon size={17} strokeWidth={1.8} />
          <span>{item.label}</span>
          {counts[item.to] !== undefined ? (
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white/15" : "bg-white/10 text-slate-300")}>
              {counts[item.to]}
            </span>
          ) : null}
        </Link>
      );
    });

  return (
    <div className="project-workspace min-h-screen bg-paper text-ink antialiased">
      <div className="flex min-h-screen">
        <aside className="hidden w-[252px] shrink-0 flex-col bg-[#111827] text-white md:flex">
          <div className="border-b border-white/10 px-5 py-5">
            <Link to="/" className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold shadow-lg shadow-indigo-900/30">E</div>
              <div>
                <div className="text-[16px] font-semibold tracking-tight">Elance Connect</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-slate-400">Elance Learning</div>
              </div>
            </Link>
          </div>

          <div className="px-4 pt-5">
            <button
              type="button"
              onClick={() => setSwitcherOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-[12px] hover:bg-white/10"
            >
              <span className="grid size-6 place-items-center rounded-md bg-emerald-400/20 text-[10px] font-semibold text-emerald-300">E&L</span>
              <span className="truncate font-medium">{org?.name ?? "Elance Learning"}</span>
              <ChevronDown className="ml-auto text-slate-400" size={15} />
            </button>
            {switcherOpen ? (
              <div className="mt-2 space-y-1 rounded-xl bg-white/[0.06] p-2">
                {db.organisations.filter((organisation) => organisation.id !== orgId).map((organisation) => (
                  <button
                    key={organisation.id}
                    type="button"
                    onClick={() => {
                      setOrgId(organisation.id);
                      setSwitcherOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <span className="size-1.5 rounded-full bg-slate-500" />
                    {organisation.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</div>
            <div className="space-y-1">{renderNav(NAV.slice(0, 9))}</div>
            <div className="px-2 pb-2 pt-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account</div>
            <div className="space-y-1">
              <Link to="/organisations" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-slate-300 hover:bg-white/10 hover:text-white">
                <Users size={17} strokeWidth={1.8} />
                Organisations
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{db.organisations.length}</span>
              </Link>
              {user?.role === "superadmin" ? (
                <Link to="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-slate-300 hover:bg-white/10 hover:text-white">
                  <Settings2 size={17} strokeWidth={1.8} />
                  Access control
                </Link>
              ) : null}
            </div>
          </nav>

          {syncError ? (
            <button type="button" onClick={() => void refresh().catch(() => toast.error("Archivist backend is still unreachable"))} className="mx-4 mb-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-left text-xs text-rose-200">
              Backend offline · retry
            </button>
          ) : null}
          {user ? (
            <div className="border-t border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-indigo-500 font-semibold">{user.displayName.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium">{user.displayName}</div>
                  <div className="text-[10px] text-slate-400">{user.role === "superadmin" ? "Super Admin" : "Member"}</div>
                </div>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => {
                    setSigningOut(true);
                    void logout().catch(() => toast.error("Could not sign out")).finally(() => setSigningOut(false));
                  }}
                  className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                  aria-label="Sign out"
                >
                  <Menu size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-[68px] items-center gap-4 border-b border-slate-200 bg-white px-5 md:px-8">
            <button type="button" className="rounded-lg p-2 text-slate-500 md:hidden" aria-label="Open navigation"><Menu size={19} /></button>
            <div className="min-w-0">
              <div className="truncate text-[21px] font-bold tracking-tight text-slate-900">Elance Connect</div>
              <div className="text-[10px] tracking-[0.16em] text-slate-400">{org?.name ?? "Elance Learning"} <span className="px-1">•</span> Project</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden h-10 w-[260px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 lg:flex"><Search size={16} /><span>Search projects, tasks, docs...</span><kbd className="ml-auto rounded-md bg-white px-1.5 py-1 text-[10px] text-slate-500">⌘K</kbd></div>
              <button type="button" className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Notifications"><Bell size={17} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500" /></button>
            </div>
          </header>
          <main className="min-w-0">{children}</main>
        </div>
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
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-[12.5px] font-medium text-paper transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.6)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center rounded-lg border border-line/60 bg-panel/40 px-3.5 text-[12px] font-medium transition-all hover:border-line/80 hover:bg-panel/70 focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-45"
    >
      {children}
    </button>
  );
}
