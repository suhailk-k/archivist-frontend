import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  Video,
  X,
} from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AccountDialog } from "@/components/account-dialog";
import { CommandSearch } from "@/components/command-search";
import { useAuth } from "@/lib/auth";
import { buildDailyPlan, todayKey } from "@/lib/daily-plan";
import { useOrgData, useStore } from "@/lib/store";
import { usePermissions } from "@/lib/use-permissions";

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

/** Shared sidebar contents rendered by both the desktop rail and the mobile drawer. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { db, orgId, setOrgId, org, syncError, refresh } = useStore();
  const { user, logout } = useAuth();
  const data = useOrgData();
  const { canSeeDocuments, canSeeCredentials } = usePermissions();
  const hiddenRoutes = new Set<string>([...(canSeeDocuments ? [] : ["/documents"]), ...(canSeeCredentials ? [] : ["/credentials"])]);
  const [signingOut, setSigningOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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
    <>
      <div className="border-b border-line px-5 py-5">
        <Link to="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="grid size-10 place-items-center rounded-xl bg-accent text-xl font-semibold text-white">
            A
          </div>
          <div>
            <div className="text-[16px] font-semibold tracking-tight">Archivist</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.04em] text-ink-soft">Personal OS</div>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-5">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-left text-[13px] hover:bg-ink/[0.04] data-[state=open]:bg-ink/[0.06]"
            >
              <span className="grid size-6 place-items-center rounded-md bg-verd-soft text-[11px] font-semibold text-verd-ink">
                {orgInitials(org?.name)}
              </span>
              <span className="truncate font-medium">{org?.name ?? "No organisation"}</span>
              <ChevronDown className="ml-auto text-ink-soft" size={15} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="z-50 w-[220px] rounded-md border border-line bg-panel p-1.5 text-ink shadow-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              {db.organisations
                .filter((organisation) => organisation.id !== orgId)
                .map((organisation) => (
                  <DropdownMenu.Item
                    key={organisation.id}
                    onSelect={() => setOrgId(organisation.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink outline-none hover:bg-ink/[0.05] data-[highlighted]:bg-ink/[0.05]"
                  >
                    <span className="size-1.5 rounded-full bg-ink-soft" />
                    {organisation.name}
                  </DropdownMenu.Item>
                ))}
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
              <DropdownMenu.Item asChild>
                <Link
                  to="/organisations"
                  onClick={onNavigate}
                  className="block cursor-pointer rounded-lg px-2 py-1.5 text-xs text-accent outline-none hover:bg-ink/[0.05] data-[highlighted]:bg-ink/[0.05]"
                >
                  Manage organisations →
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-soft">Workspace</div>
        <div className="space-y-1">
          {NAV.filter((item) => !hiddenRoutes.has(item.to)).map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors",
                  active ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
                )}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
                {counts[item.to] !== undefined ? (
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px]", active ? "bg-accent/10" : "bg-ink/[0.06] text-ink-soft")}>
                    {counts[item.to]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        <div className="px-2 pb-2 pt-7 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-soft">Account</div>
        <div className="space-y-1">
          <Link
            to="/organisations"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors",
              pathname.startsWith("/organisations") ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
            )}
          >
            <Users size={17} strokeWidth={1.8} />
            Organisations
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px]", pathname.startsWith("/organisations") ? "bg-accent/10" : "bg-ink/[0.06] text-ink-soft")}>
              {db.organisations.length}
            </span>
          </Link>
          {user?.role === "superadmin" ? (
            <Link
              to="/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors",
                pathname.startsWith("/admin") ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
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
          className="mx-4 mb-3 rounded-md border border-rose/30 bg-rose/10 px-3 py-2 text-left text-xs text-rose"
        >
          Backend offline · retry
        </button>
      ) : null}
      {user ? (
        <div className="border-t border-line px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-accent font-semibold text-white">{user.displayName.slice(0, 1).toUpperCase()}</div>
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="min-w-0 rounded-md text-left hover:text-accent"
              aria-label="Account settings"
            >
              <div className="truncate text-[12px] font-medium">{user.displayName}</div>
              <div className="text-[11px] text-ink-soft">{user.role === "superadmin" ? "Super Admin" : "Member"} · Account</div>
            </button>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void logout()
                  .catch(() => toast.error("Could not sign out"))
                  .finally(() => setSigningOut(false));
              }}
              className="ml-auto rounded-lg p-1.5 text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
          <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
        </div>
      ) : null}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { org } = useStore();
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <HeaderActionsContext.Provider value={setHeaderActions}>
      <div className="min-h-screen bg-paper text-ink antialiased">
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col self-start border-r border-line bg-sidebar-chrome text-ink md:flex">
            <SidebarContent />
          </aside>

          <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 md:hidden" />
              <Dialog.Content
                className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-sidebar-chrome text-ink md:hidden"
                aria-describedby={undefined}
              >
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                </Dialog.Close>
                <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <div className="min-w-0 flex-1">
            <header className="flex h-[68px] items-center gap-4 border-b border-line bg-panel px-5 md:px-8">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-lg p-2 text-ink-soft md:hidden"
                aria-label="Open navigation"
                aria-haspopup="dialog"
                aria-expanded={mobileNavOpen}
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <div className="truncate text-[21px] font-bold tracking-tight text-ink">{sectionLabel(pathname)}</div>
                <div className="text-[11px] tracking-[0.16em] text-ink-soft">{org?.name ?? "No organisation"}</div>
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
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/90 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-6 py-3.5 md:px-8">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[22px] font-medium tracking-tight">{title}</h1>
          <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">{crumb}</div>
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
      className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-45"
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
      className="inline-flex h-9 items-center rounded-md border border-line bg-panel px-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-45"
    >
      {children}
    </button>
  );
}
