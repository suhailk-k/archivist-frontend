import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiPost } from "./api-client";
import { useAuth } from "./auth";
import { normalizeProjectLinks } from "./project-links";
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

export const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const ACTIVITY_LIMIT = 250;

type RecordEntity = keyof Database;
type StoredRecord = { id: ID } & Record<string, unknown>;

type Command =
  | { entity: RecordEntity; operation: "upsert"; record: StoredRecord }
  | { entity: RecordEntity; operation: "delete"; id: ID };

interface Change {
  db: Database;
  commands: Command[];
}

const EMPTY_DATABASE: Database = {
  organisations: [],
  members: [],
  projects: [],
  tasks: [],
  milestones: [],
  docs: [],
  meetings: [],
  decisions: [],
  activity: [],
};

const emptyDatabase = (): Database => structuredClone(EMPTY_DATABASE);

const upsert = (entity: RecordEntity, record: StoredRecord): Command => ({ entity, operation: "upsert", record });
const drop = (entity: RecordEntity, id: ID): Command => ({ entity, operation: "delete", id });

interface StoreValue {
  db: Database;
  hydrated: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
  orgId: ID;
  setOrgId: (id: ID) => void;
  org: Organisation | undefined;
  addOrganisation: (input: Pick<Organisation, "name" | "description">) => Organisation;
  updateOrganisation: (id: ID, patch: Partial<Organisation>) => void;
  removeOrganisation: (id: ID) => void;

  addMember: (input: Omit<Member, "id">) => Member;
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
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [db, setDb] = useState<Database>(() => emptyDatabase());
  const [orgId, setOrgIdState] = useState<ID>("");
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const current = useRef<Database>(db);

  useEffect(() => {
    current.current = db;
  }, [db]);

  const load = useCallback(async () => {
    const remote = await apiGet<Database>("/api/data");
    const normalized: Database = {
      ...remote,
      projects: remote.projects.map((project) => ({ ...project, links: normalizeProjectLinks(project.links) })),
    };
    current.current = normalized;
    setDb(normalized);
    setOrgIdState((previous) =>
      remote.organisations.some((o) => o.id === previous) ? previous : remote.organisations[0]?.id ?? "",
    );
    setSyncError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await load();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Archivist backend is unavailable.");
      throw error;
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      current.current = emptyDatabase();
      setDb(current.current);
      setOrgIdState("");
      setHydrated(false);
      setSyncError(null);
      return () => {
        cancelled = true;
      };
    }

    setHydrated(false);
    load()
      .catch((error: unknown) => {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "Archivist backend is unavailable.");
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, load]);

  const send = useCallback(
    (commands: Command[]) => {
      if (commands.length === 0) return;
      void apiPost("/api/data/commands", { commands })
        .then(() => setSyncError(null))
        .catch(async (error: unknown) => {
          setSyncError(error instanceof Error ? error.message : "Could not save changes.");
          await load().catch(() => undefined);
        });
    },
    [load],
  );

  const apply = useCallback(
    (produce: (prev: Database) => Change) => {
      const change = produce(current.current);
      current.current = change.db;
      setDb(change.db);
      send(change.commands);
    },
    [send],
  );

  const setOrgId = useCallback((id: ID) => setOrgIdState(id), []);

  const value = useMemo<StoreValue>(() => {
    const org = db.organisations.find((o) => o.id === orgId);

    const logged = (prev: Database, entry: Omit<Activity, "id" | "at">) => {
      const record: Activity = { ...entry, id: uid(), at: nowIso() };
      return {
        activity: [record, ...prev.activity].slice(0, ACTIVITY_LIMIT),
        command: upsert("activity", record as unknown as StoredRecord),
      };
    };

    const patchRecord = <T extends { id: ID }>(list: T[], id: ID, patch: Partial<T>) => {
      const next = list.map((item) => (item.id === id ? { ...item, ...patch } : item));
      const updated = next.find((item) => item.id === id);
      return { next, updated };
    };

    const cascadeDelete = (prev: Database, keep: (entity: RecordEntity, record: { id: ID }) => boolean) => {
      const db_: Database = emptyDatabase();
      const commands: Command[] = [];
      for (const entity of Object.keys(EMPTY_DATABASE) as RecordEntity[]) {
        for (const record of prev[entity] as Array<{ id: ID }>) {
          if (keep(entity, record)) {
            (db_[entity] as Array<{ id: ID }>).push(record);
          } else {
            commands.push(drop(entity, record.id));
          }
        }
      }
      return { db: db_, commands };
    };

    return {
      db,
      hydrated,
      syncError,
      refresh,
      orgId,
      setOrgId,
      org,

      addOrganisation: (input) => {
        const created: Organisation = { ...input, id: uid(), createdAt: nowIso() };
        apply((prev) => {
          const activity = logged(prev, {
            orgId: created.id,
            projectId: null,
            text: `Organisation "${created.name}" created`,
            tone: "accent",
          });
          return {
            db: { ...prev, organisations: [...prev.organisations, created], activity: activity.activity },
            commands: [upsert("organisations", created as unknown as StoredRecord), activity.command],
          };
        });
        return created;
      },
      updateOrganisation: (id, patch) =>
        apply((prev) => {
          const { next, updated } = patchRecord(prev.organisations, id, patch);
          if (!updated) return { db: prev, commands: [] };
          const activity = logged(prev, { orgId: id, projectId: null, text: "Organisation details updated", tone: "line" });
          return {
            db: { ...prev, organisations: next, activity: activity.activity },
            commands: [upsert("organisations", updated as unknown as StoredRecord), activity.command],
          };
        }),
      removeOrganisation: (id) =>
        apply((prev) =>
          cascadeDelete(prev, (_entity, record) => (record as { orgId?: ID }).orgId !== id && record.id !== id),
        ),

      addMember: (input) => {
        const created: Member = { ...input, id: uid() };
        apply((prev) => {
          const activity = logged(prev, {
            orgId: input.orgId,
            projectId: null,
            text: `${input.name} added as ${input.role}`,
            tone: "verd",
          });
          return {
            db: { ...prev, members: [...prev.members, created], activity: activity.activity },
            commands: [upsert("members", created as unknown as StoredRecord), activity.command],
          };
        });
        return created;
      },
      updateMember: (id, patch) =>
        apply((prev) => {
          const { next, updated } = patchRecord(prev.members, id, patch);
          if (!updated) return { db: prev, commands: [] };
          const activity = logged(prev, { orgId: updated.orgId, projectId: null, text: "Member profile updated", tone: "line" });
          return {
            db: { ...prev, members: next, activity: activity.activity },
            commands: [upsert("members", updated as unknown as StoredRecord), activity.command],
          };
        }),
      removeMember: (id) =>
        apply((prev) => {
          const projects = prev.projects.map((project) =>
            project.memberIds.includes(id)
              ? { ...project, memberIds: project.memberIds.filter((memberId) => memberId !== id) }
              : project,
          );
          const commands: Command[] = [drop("members", id)];
          for (const project of projects) {
            const before = prev.projects.find((p) => p.id === project.id);
            if (before !== project) commands.push(upsert("projects", project as unknown as StoredRecord));
          }
          return { db: { ...prev, members: prev.members.filter((m) => m.id !== id), projects }, commands };
        }),

      addProject: (input) => {
        const created: Project = { ...input, id: uid(), createdAt: nowIso() };
        apply((prev) => {
          const activity = logged(prev, {
            orgId: created.orgId,
            projectId: created.id,
            text: `Project "${created.name}" created`,
            tone: "accent",
          });
          return {
            db: { ...prev, projects: [...prev.projects, created], activity: activity.activity },
            commands: [upsert("projects", created as unknown as StoredRecord), activity.command],
          };
        });
        return created;
      },
      updateProject: (id, patch) =>
        apply((prev) => {
          const before = prev.projects.find((p) => p.id === id);
          const { next, updated } = patchRecord(prev.projects, id, patch);
          if (!before || !updated) return { db: prev, commands: [] };
          const statusChanged = Boolean(patch.status && patch.status !== before.status);
          const activity = logged(prev, {
            orgId: before.orgId,
            projectId: id,
            text: statusChanged
              ? `"${before.name}" moved to ${patch.status?.replace("_", " ")}`
              : `"${before.name}" updated`,
            tone: statusChanged ? "amber" : "line",
          });
          return {
            db: { ...prev, projects: next, activity: activity.activity },
            commands: [upsert("projects", updated as unknown as StoredRecord), activity.command],
          };
        }),
      removeProject: (id) =>
        apply((prev) =>
          cascadeDelete(prev, (_entity, record) => (record as { projectId?: ID }).projectId !== id && record.id !== id),
        ),

      addTask: (input) =>
        apply((prev) => {
          const created: Task = { ...input, id: uid(), createdAt: nowIso() };
          const activity = logged(prev, {
            orgId: input.orgId,
            projectId: input.projectId,
            text: `Task added: ${created.title}`,
            tone: "line",
          });
          return {
            db: { ...prev, tasks: [...prev.tasks, created], activity: activity.activity },
            commands: [upsert("tasks", created as unknown as StoredRecord), activity.command],
          };
        }),
      updateTask: (id, patch) =>
        apply((prev) => {
          const before = prev.tasks.find((t) => t.id === id);
          const { next, updated } = patchRecord(prev.tasks, id, patch);
          if (!before || !updated) return { db: prev, commands: [] };
          const commands: Command[] = [upsert("tasks", updated as unknown as StoredRecord)];
          if (patch.done !== undefined && patch.done !== before.done) {
            const activity = logged(prev, {
              orgId: before.orgId,
              projectId: before.projectId,
              text: `${patch.done ? "Completed" : "Reopened"}: ${before.title}`,
              tone: patch.done ? "verd" : "amber",
            });
            commands.push(activity.command);
            return { db: { ...prev, tasks: next, activity: activity.activity }, commands };
          }
          return { db: { ...prev, tasks: next }, commands };
        }),
      removeTask: (id) =>
        apply((prev) => ({ db: { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }, commands: [drop("tasks", id)] })),

      addMilestone: (input) =>
        apply((prev) => {
          const created: Milestone = { ...input, id: uid() };
          const activity = logged(prev, {
            orgId,
            projectId: created.projectId,
            text: `Milestone set: ${created.title}`,
            tone: "accent",
          });
          return {
            db: { ...prev, milestones: [...prev.milestones, created], activity: activity.activity },
            commands: [upsert("milestones", created as unknown as StoredRecord), activity.command],
          };
        }),
      updateMilestone: (id, patch) =>
        apply((prev) => {
          const { next, updated } = patchRecord(prev.milestones, id, patch);
          if (!updated) return { db: prev, commands: [] };
          return {
            db: { ...prev, milestones: next },
            commands: [upsert("milestones", updated as unknown as StoredRecord)],
          };
        }),
      removeMilestone: (id) =>
        apply((prev) => ({
          db: { ...prev, milestones: prev.milestones.filter((m) => m.id !== id) },
          commands: [drop("milestones", id)],
        })),

      addDoc: (input) =>
        apply((prev) => {
          const created: Doc = { ...input, id: uid(), updatedAt: nowIso() };
          const activity = logged(prev, {
            orgId: input.orgId,
            projectId: input.projectId,
            text: `Document added: ${created.title}`,
            tone: "accent",
          });
          return {
            db: { ...prev, docs: [...prev.docs, created], activity: activity.activity },
            commands: [upsert("docs", created as unknown as StoredRecord), activity.command],
          };
        }),
      updateDoc: (id, patch) =>
        apply((prev) => {
          const { next, updated } = patchRecord(prev.docs, id, { ...patch, updatedAt: nowIso() });
          if (!updated) return { db: prev, commands: [] };
          const activity = logged(prev, { orgId: updated.orgId, projectId: updated.projectId, text: "Document updated", tone: "line" });
          return {
            db: { ...prev, docs: next, activity: activity.activity },
            commands: [upsert("docs", updated as unknown as StoredRecord), activity.command],
          };
        }),
      removeDoc: (id) =>
        apply((prev) => ({ db: { ...prev, docs: prev.docs.filter((d) => d.id !== id) }, commands: [drop("docs", id)] })),

      addMeeting: (input) =>
        apply((prev) => {
          const created: Meeting = { ...input, id: uid() };
          const activity = logged(prev, {
            orgId: input.orgId,
            projectId: input.projectId,
            text: `Meeting scheduled: ${created.title}`,
            tone: "accent",
          });
          return {
            db: { ...prev, meetings: [...prev.meetings, created], activity: activity.activity },
            commands: [upsert("meetings", created as unknown as StoredRecord), activity.command],
          };
        }),
      updateMeeting: (id, patch) =>
        apply((prev) => {
          const { next, updated } = patchRecord(prev.meetings, id, patch);
          if (!updated) return { db: prev, commands: [] };
          const activity = logged(prev, {
            orgId: updated.orgId,
            projectId: updated.projectId,
            text: "Meeting notes updated",
            tone: "line",
          });
          return {
            db: { ...prev, meetings: next, activity: activity.activity },
            commands: [upsert("meetings", updated as unknown as StoredRecord), activity.command],
          };
        }),
      removeMeeting: (id) =>
        apply((prev) => ({
          db: { ...prev, meetings: prev.meetings.filter((m) => m.id !== id) },
          commands: [drop("meetings", id)],
        })),

      addDecision: (input) =>
        apply((prev) => {
          const created: Decision = { ...input, id: uid() };
          const activity = logged(prev, {
            orgId: input.orgId,
            projectId: input.projectId,
            text: `Decision logged: ${created.title}`,
            tone: "amber",
          });
          return {
            db: { ...prev, decisions: [...prev.decisions, created], activity: activity.activity },
            commands: [upsert("decisions", created as unknown as StoredRecord), activity.command],
          };
        }),
      updateDecision: (id, patch) =>
        apply((prev) => {
          const before = prev.decisions.find((d) => d.id === id);
          const { next, updated } = patchRecord(prev.decisions, id, patch);
          if (!before || !updated) return { db: prev, commands: [] };
          const commands: Command[] = [upsert("decisions", updated as unknown as StoredRecord)];
          if (patch.status) {
            const activity = logged(prev, {
              orgId: before.orgId,
              projectId: before.projectId,
              text: `Decision ${patch.status}: ${before.title}`,
              tone: patch.status === "approved" ? "verd" : patch.status === "rejected" ? "rose" : "amber",
            });
            commands.push(activity.command);
            return { db: { ...prev, decisions: next, activity: activity.activity }, commands };
          }
          return { db: { ...prev, decisions: next }, commands };
        }),
      removeDecision: (id) =>
        apply((prev) => ({
          db: { ...prev, decisions: prev.decisions.filter((d) => d.id !== id) },
          commands: [drop("decisions", id)],
        })),
    };
  }, [db, hydrated, syncError, refresh, orgId, setOrgId, apply]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useOrgData() {
  const { db, orgId } = useStore();
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
