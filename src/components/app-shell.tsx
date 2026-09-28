import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  FolderKanban,
  History,
  KeyRound,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  Video,
} from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CommandSearch } from "@/components/command-search";
import { useAuth } from "@/lib/auth";
import { buildDailyPlan, todayKey } from "@/lib/daily-plan";
import { useOrgData, useStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/today", label: "My Work", icon: Sun },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/planning", label: "Planning", icon: CalendarDays },
  { to: "/todos", label: "Tasks", icon: CheckSquare },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/decisions", label: "Decisions", icon: ShieldCheck },
  { to: "/credentials", label: "Credentials", icon: KeyRound },
  { to: "/members", label: "Members", icon: Users },
  { to: "/history", label: "History", icon: History },
] as const;

function orgInitials(name: string | undefined) {
  if (!name) return "—";
  const [first, second] = name.trim().split(/\s+/).filter(Boolean);
  if (first && second) return (first.charAt(0) + second.charAt(0)).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function sectionLabel(pathname: string) {
  if (/^\/projects\/[^/]+$/.test(pathname)) return "Project";
  if (pathname.startsWith("/organisations")) return "Organisations";
  if (pathname.startsWith("/admin")) return "Access control";
  const match = NAV.find((item) => (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)));
  return match?.label ?? "Dashboard";
}

const HeaderActionsContext = createContext<((node: ReactNode) => void) | null>(null);

/** Renders `node` into the top header bar, next to search/notifications. Cleared on unmount. */
export function useHeaderActions(node: ReactNode) {
  const setActions = useContext(HeaderActionsContext);
  useEffect(() => {
    setActions?.(node);
    return () => setActions?.(null);
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { db, orgId, setOrgId, org, syncError, refresh } = useStore();
  const { user, logout } = useAuth();
  const data = useOrgData();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const myOpenToday = user?.memberId
    ? buildDailyPlan(data.tasks, { memberId: user.memberId, day: todayKey(), today: todayKey() }).planned.length
    : 0;

  const counts: Record<string, string | number | undefined> = {
    "/today": myOpenToday || undefined,
    "/projects": data.projects.length,
    "/todos": data.tasks.filter((task) => !task.done).length,
    "/members": data.members.length,
    "/decisions": data.decisions.filter((decision) => decision.status === "open").length || undefined,
    "/credentials": data.credentials.length || undefined,
  };

  return (
    <HeaderActionsContext.Provider value={setHeaderActions}>
      <div className="min-h-screen bg-paper text-ink antialiased">
        <div className="flex min-h-screen">
          <aside className="hidden w-[252px] shrink-0 flex-col bg-[#111827] text-white md:flex">
            <div className="border-b border-white/10 px-5 py-5">
              <Link to="/" className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold italic shadow-lg shadow-indigo-900/30">
                  A
                </div>
                <div>
                  <div className="text-[16px] font-semibold tracking-tight">Archivist</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-slate-400">Personal OS</div>
                </div>
              </Link>
            </div>

            <div className="px-4 pt-5">
              <button
                type="button"
                onClick={() => setSwitcherOpen((open) => !open)}
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-[12px] hover:bg-white/10"
              >
                <span className="grid size-6 place-items-center rounded-md bg-emerald-400/20 text-[10px] font-semibold text-emerald-300">
                  {orgInitials(org?.name)}
                </span>
                <span className="truncate font-medium">{org?.name ?? "No organisation"}</span>
                <ChevronDown className="ml-auto text-slate-400" size={15} />
              </button>
              {switcherOpen ? (
                <div className="mt-2 space-y-1 rounded-xl bg-white/[0.06] p-2">
                  {db.organisations
                    .filter((organisation) => organisation.id !== orgId)
                    .map((organisation) => (
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
                  <Link
                    to="/organisations"
                    onClick={() => setSwitcherOpen(false)}
                    className="block rounded-lg px-2 py-1.5 text-xs text-indigo-300 hover:bg-white/10"
                  >
                    Manage organisations →
                  </Link>
                </div>
              ) : null}
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <div className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</div>
              <div className="space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
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
                })}
              </div>
              <div className="px-2 pb-2 pt-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account</div>
              <div className="space-y-1">
                <Link
                  to="/organisations"
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                    pathname.startsWith("/organisations") ? "bg-[#5146e5] text-white shadow-lg shadow-indigo-950/25" : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Users size={17} strokeWidth={1.8} />
                  Organisations
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px]", pathname.startsWith("/organisations") ? "bg-white/15" : "bg-white/10 text-slate-300")}>
                    {db.organisations.length}
                  </span>
                </Link>
                {user?.role === "superadmin" ? (
                  <Link
                    to="/admin"
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                      pathname.startsWith("/admin") ? "bg-[#5146e5] text-white shadow-lg shadow-indigo-950/25" : "text-slate-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Settings2 size={17} strokeWidth={1.8} />
                    Access control
                  </Link>
                ) : null}
              </div>
            </nav>

            {syncError ? (
              <button
                type="button"
                onClick={() => void refresh().catch(() => toast.error("Archivist backend is still unreachable"))}
                className="mx-4 mb-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-left text-xs text-rose-200"
              >
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
                      void logout()
                        .catch(() => toast.error("Could not sign out"))
                        .finally(() => setSigningOut(false));
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
              <button type="button" className="rounded-lg p-2 text-slate-500 md:hidden" aria-label="Open navigation">
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <div className="truncate text-[21px] font-bold tracking-tight text-slate-900">Archivist</div>
                <div className="text-[10px] tracking-[0.16em] text-slate-400">
                  {org?.name ?? "No organisation"} <span className="px-1">•</span> {sectionLabel(pathname)}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <CommandSearch />
                {headerActions}
              </div>
            </header>
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </HeaderActionsContext.Provider>
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
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/90 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] backdrop-blur-xl">
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
      className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-[12.5px] font-medium text-paper transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(79,70,229,0.35)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
      className="inline-flex h-9 items-center rounded-lg border border-line bg-panel px-3.5 text-[12px] font-medium transition-all hover:border-accent/40 hover:bg-panel/70 focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-45"
    >
      {children}
    </button>
  );
}
