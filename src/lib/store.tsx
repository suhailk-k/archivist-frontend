import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedDatabase } from "./seed";
import type {
  Activity,
  Database,
  Decision,
  Doc,
  ID,
  Meeting,
  Member,
  Milestone,
  Organisation,
  Project,
  Task,
} from "./types";

const STORAGE_KEY = "archivist.db.v1";
const ORG_KEY = "archivist.org.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();

interface StoreValue {
  db: Database;
  hydrated: boolean;
  orgId: ID;
  setOrgId: (id: ID) => void;
  org: Organisation | undefined;

  addOrganisation: (input: Pick<Organisation, "name" | "description">) => Organisation;
  updateOrganisation: (id: ID, patch: Partial<Organisation>) => void;
  removeOrganisation: (id: ID) => void;

  addMember: (input: Omit<Member, "id">) => void;
  updateMember: (id: ID, patch: Partial<Member>) => void;
  removeMember: (id: ID) => void;

  addProject: (input: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  removeProject: (id: ID) => void;

  addTask: (input: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  removeTask: (id: ID) => void;

  addMilestone: (input: Omit<Milestone, "id">) => void;
  updateMilestone: (id: ID, patch: Partial<Milestone>) => void;
  removeMilestone: (id: ID) => void;

  addDoc: (input: Omit<Doc, "id" | "updatedAt">) => void;
  updateDoc: (id: ID, patch: Partial<Doc>) => void;
  removeDoc: (id: ID) => void;

  addMeeting: (input: Omit<Meeting, "id">) => void;
  updateMeeting: (id: ID, patch: Partial<Meeting>) => void;
  removeMeeting: (id: ID) => void;

  addDecision: (input: Omit<Decision, "id">) => void;
  updateDecision: (id: ID, patch: Partial<Decision>) => void;
  removeDecision: (id: ID) => void;

  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => seedDatabase());
  const [orgId, setOrgIdState] = useState<ID>("org-elance");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDb(JSON.parse(raw) as Database);
      const savedOrg = localStorage.getItem(ORG_KEY);
      if (savedOrg) setOrgIdState(savedOrg);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* quota */
    }
  }, [db, hydrated]);

  const setOrgId = useCallback((id: ID) => {
    setOrgIdState(id);
    try {
      localStorage.setItem(ORG_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const log = useCallback(
    (prev: Database, entry: Omit<Activity, "id" | "at">): Activity[] =>
      [{ ...entry, id: uid(), at: nowIso() }, ...prev.activity].slice(0, 250),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const org = db.organisations.find((o) => o.id === orgId);

    const mutate = (fn: (prev: Database) => Database) => setDb((prev) => fn(prev));

    return {
      db,
      hydrated,
      orgId,
      setOrgId,
      org,

      addOrganisation: (input) => {
        const created: Organisation = { ...input, id: uid(), createdAt: nowIso() };
        mutate((prev) => ({
          ...prev,
          organisations: [...prev.organisations, created],
          activity: log(prev, { orgId: created.id, projectId: null, text: `Organisation "${created.name}" created`, tone: "accent" }),
        }));
        return created;
      },
      updateOrganisation: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          organisations: prev.organisations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
          activity: log(prev, { orgId: id, projectId: null, text: `Organisation details updated`, tone: "line" }),
        })),
      removeOrganisation: (id) =>
        mutate((prev) => ({
          ...prev,
          organisations: prev.organisations.filter((o) => o.id !== id),
          projects: prev.projects.filter((p) => p.orgId !== id),
          members: prev.members.filter((m) => m.orgId !== id),
          tasks: prev.tasks.filter((t) => t.orgId !== id),
          docs: prev.docs.filter((d) => d.orgId !== id),
          meetings: prev.meetings.filter((m) => m.orgId !== id),
          decisions: prev.decisions.filter((d) => d.orgId !== id),
          activity: prev.activity.filter((a) => a.orgId !== id),
        })),

      addMember: (input) =>
        mutate((prev) => ({
          ...prev,
          members: [...prev.members, { ...input, id: uid() }],
          activity: log(prev, { orgId: input.orgId, projectId: null, text: `${input.name} added as ${input.role}`, tone: "verd" }),
        })),
      updateMember: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          members: prev.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          activity: log(prev, { orgId: orgId, projectId: null, text: `Member profile updated`, tone: "line" }),
        })),
      removeMember: (id) =>
        mutate((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.id !== id),
          projects: prev.projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((x) => x !== id) })),
        })),

      addProject: (input) => {
        const created: Project = { ...input, id: uid(), createdAt: nowIso() };
        mutate((prev) => ({
          ...prev,
          projects: [...prev.projects, created],
          activity: log(prev, { orgId: created.orgId, projectId: created.id, text: `Project "${created.name}" created`, tone: "accent" }),
        }));
        return created;
      },
      updateProject: (id, patch) =>
        mutate((prev) => {
          const before = prev.projects.find((p) => p.id === id);
          const changed = patch.status && before && patch.status !== before.status;
          return {
            ...prev,
            projects: prev.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            activity: log(prev, {
              orgId: before?.orgId ?? orgId,
              projectId: id,
              text: changed
                ? `"${before?.name}" moved to ${patch.status?.replace("_", " ")}`
                : `"${before?.name}" updated`,
              tone: changed ? "amber" : "line",
            }),
          };
        }),
      removeProject: (id) =>
        mutate((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== id),
          tasks: prev.tasks.filter((t) => t.projectId !== id),
          milestones: prev.milestones.filter((m) => m.projectId !== id),
          docs: prev.docs.filter((d) => d.projectId !== id),
          meetings: prev.meetings.filter((m) => m.projectId !== id),
          decisions: prev.decisions.filter((d) => d.projectId !== id),
        })),

      addTask: (input) =>
        mutate((prev) => ({
          ...prev,
          tasks: [...prev.tasks, { ...input, id: uid(), createdAt: nowIso() }],
          activity: log(prev, { orgId: input.orgId, projectId: input.projectId, text: `Task added: ${input.title}`, tone: "line" }),
        })),
      updateTask: (id, patch) =>
        mutate((prev) => {
          const before = prev.tasks.find((t) => t.id === id);
          const toggled = patch.done !== undefined && before && patch.done !== before.done;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
            activity: toggled
              ? log(prev, {
                  orgId: before!.orgId,
                  projectId: before!.projectId,
                  text: `${patch.done ? "Completed" : "Reopened"}: ${before!.title}`,
                  tone: patch.done ? "verd" : "amber",
                })
              : prev.activity,
          };
        }),
      removeTask: (id) => mutate((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) })),

      addMilestone: (input) =>
        mutate((prev) => ({
          ...prev,
          milestones: [...prev.milestones, { ...input, id: uid() }],
          activity: log(prev, { orgId, projectId: input.projectId, text: `Milestone set: ${input.title}`, tone: "accent" }),
        })),
      updateMilestone: (id, patch) =>
        mutate((prev) => ({ ...prev, milestones: prev.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMilestone: (id) =>
        mutate((prev) => ({ ...prev, milestones: prev.milestones.filter((m) => m.id !== id) })),

      addDoc: (input) =>
        mutate((prev) => ({
          ...prev,
          docs: [...prev.docs, { ...input, id: uid(), updatedAt: nowIso() }],
          activity: log(prev, { orgId: input.orgId, projectId: input.projectId, text: `Document added: ${input.title}`, tone: "accent" }),
        })),
      updateDoc: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          docs: prev.docs.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: nowIso() } : d)),
          activity: log(prev, { orgId, projectId: null, text: `Document updated`, tone: "line" }),
        })),
      removeDoc: (id) => mutate((prev) => ({ ...prev, docs: prev.docs.filter((d) => d.id !== id) })),

      addMeeting: (input) =>
        mutate((prev) => ({
          ...prev,
          meetings: [...prev.meetings, { ...input, id: uid() }],
          activity: log(prev, { orgId: input.orgId, projectId: input.projectId, text: `Meeting scheduled: ${input.title}`, tone: "accent" }),
        })),
      updateMeeting: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          meetings: prev.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          activity: log(prev, { orgId, projectId: null, text: `Meeting notes updated`, tone: "line" }),
        })),
      removeMeeting: (id) => mutate((prev) => ({ ...prev, meetings: prev.meetings.filter((m) => m.id !== id) })),

      addDecision: (input) =>
        mutate((prev) => ({
          ...prev,
          decisions: [...prev.decisions, { ...input, id: uid() }],
          activity: log(prev, { orgId: input.orgId, projectId: input.projectId, text: `Decision logged: ${input.title}`, tone: "amber" }),
        })),
      updateDecision: (id, patch) =>
        mutate((prev) => {
          const before = prev.decisions.find((d) => d.id === id);
          return {
            ...prev,
            decisions: prev.decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
            activity: patch.status
              ? log(prev, {
                  orgId: before?.orgId ?? orgId,
                  projectId: before?.projectId ?? null,
                  text: `Decision ${patch.status}: ${before?.title}`,
                  tone: patch.status === "approved" ? "verd" : patch.status === "rejected" ? "rose" : "amber",
                })
              : prev.activity,
          };
        }),
      removeDecision: (id) => mutate((prev) => ({ ...prev, decisions: prev.decisions.filter((d) => d.id !== id) })),

      resetAll: () => {
        setDb(seedDatabase());
        setOrgId("org-elance");
      },
    };
  }, [db, hydrated, orgId, setOrgId, log]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useOrgData() {
  const s = useStore();
  const { db, orgId } = s;
  return useMemo(
    () => ({
      projects: db.projects.filter((p) => p.orgId === orgId),
      members: db.members.filter((m) => m.orgId === orgId),
      tasks: db.tasks.filter((t) => t.orgId === orgId),
      docs: db.docs.filter((d) => d.orgId === orgId),
      meetings: db.meetings.filter((m) => m.orgId === orgId),
      decisions: db.decisions.filter((d) => d.orgId === orgId),
      activity: db.activity.filter((a) => a.orgId === orgId),
    }),
    [db, orgId],
  );
}

export function projectProgress(tasks: Task[], projectId: string) {
  const list = tasks.filter((t) => t.projectId === projectId);
  if (list.length === 0) return 0;
  return Math.round((list.filter((t) => t.done).length / list.length) * 100);
}
