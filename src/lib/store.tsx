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
import { toast } from "sonner";
import { ApiRequestError, apiGet, apiPost } from "./api-client";
import { useAuth } from "./auth";
import { applyTaskPatch, buildTask, deriveProjectKey, moveTasks, normalizeProjects, normalizeTasks, type MoveRequest } from "./board";
import { normalizeProjectLinks } from "./project-links";
import { collectVersions, credentialEdit, stampVersion, versionKey, type Command, type RecordEntity, type StoredRecord } from "./sync";
import type {
  Activity,
  Credential,
  Database,
  Decision,
  Doc,
  ID,
  Meeting,
  Member,
  Milestone,
  NewProject,
  NewTask,
  Organisation,
  Project,
  Task,
} from "./types";

export const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const ACTIVITY_LIMIT = 250;
/** Background refresh cadence while the tab is visible and nothing is waiting to save. */
const POLL_INTERVAL_MS = 30_000;



interface AppliedRecord {
  entity: RecordEntity;
  id: ID;
  /** Null after a delete. */
  version: number | null;
  /** Tasks only: the per-project number the server assigned or kept. */
  number?: number;
}

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
  credentials: [],
  files: [],
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

  addProject: (input: NewProject) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  removeProject: (id: ID) => void;

  addTask: (input: NewTask) => void;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  /** Drops a card into a column; `beforeId`/`afterId` are its new neighbours above/below. */
  moveTask: (id: ID, request: MoveRequest) => void;
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

  addCredential: (input: Omit<Credential, "id" | "createdAt" | "updatedAt">) => void;
  updateCredential: (id: ID, patch: Partial<Credential>) => void;
  removeCredential: (id: ID) => void;
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

  /** Latest server version per record; sent with each upsert so the server can detect conflicts. */
  const versions = useRef(new Map<string, number>());
  /** Saves go out one batch at a time, so each batch is stamped with versions from the last reply. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pendingSaves = useRef(0);
  /** True after a save failed and the user hasn't retried or discarded — background refresh must not overwrite it. */
  const hasUnsavedChanges = useRef(false);
  /** Bumped on every local change; a refresh that started before a change must not apply its stale result. */
  const changeSeq = useRef(0);
  const sendRef = useRef<(commands: Command[]) => void>(() => undefined);
  /** Batches that failed to save, in order; Retry resends all of them. */
  const failedBatches = useRef<Command[][]>([]);

  const applyRemote = useCallback((remote: Database) => {
    versions.current = collectVersions(remote);
    const normalized: Database = {
      ...remote,
      // Older projects lack a key and labels; they're derived here and saved with the next project edit.
      projects: normalizeProjects(remote.projects.map((project) => ({ ...project, links: normalizeProjectLinks(project.links) }))),
      // Older task records predate daily planning and the board; see normalizeTasks for why nothing is saved here.
      tasks: normalizeTasks(remote.tasks.map((task) => ({ ...task, plannedFor: task.plannedFor ?? "", completedAt: task.completedAt ?? "" }))),
      // Older doc records predate file uploads and won't have these fields.
      docs: remote.docs.map((doc) => ({
        ...doc,
        fileId: doc.fileId ?? null,
        fileName: doc.fileName ?? "",
        fileSize: doc.fileSize ?? 0,
        fileMime: doc.fileMime ?? "",
      })),
    };
    current.current = normalized;
    setDb(normalized);
    setOrgIdState((previous) =>
      remote.organisations.some((o) => o.id === previous) ? previous : remote.organisations[0]?.id ?? "",
    );
    setSyncError(null);
  }, []);

  const load = useCallback(async () => {
    applyRemote(await apiGet<Database>("/api/data"));
    hasUnsavedChanges.current = false;
    failedBatches.current = [];
  }, [applyRemote]);

  /** Background refresh: skipped, or its result dropped, whenever it could clobber local edits. */
  const refreshIfIdle = useCallback(async () => {
    if (pendingSaves.current > 0 || hasUnsavedChanges.current) return;
    const startedAt = changeSeq.current;
    const remote = await apiGet<Database>("/api/data");
    if (startedAt !== changeSeq.current || pendingSaves.current > 0 || hasUnsavedChanges.current) return;
    applyRemote(remote);
  }, [applyRemote]);

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

  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshIfIdle().catch(() => undefined);
    };
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [user, refreshIfIdle]);

  /** New tasks get their number from the server; show it without treating it as a local edit. */
  const applyTaskNumbers = useCallback((records: AppliedRecord[]) => {
    const numbers = new Map(records.flatMap((entry) => (entry.entity === "tasks" && entry.number !== undefined ? [[entry.id, entry.number] as const] : [])));
    if (numbers.size === 0) return;
    const tasks = current.current.tasks.map((task) => {
      const number = numbers.get(task.id);
      return number === undefined || number === task.number ? task : { ...task, number };
    });
    if (tasks.every((task, index) => task === current.current.tasks[index])) return;
    current.current = { ...current.current, tasks };
    setDb(current.current);
  }, []);

  const transmit = useCallback(
    async (commands: Command[]) => {
      const result = await apiPost<{ records: AppliedRecord[] }>("/api/data/commands", { commands: commands.map((command) => stampVersion(command, versions.current)) });
      for (const entry of result.records) {
        const key = versionKey(entry.entity, entry.id);
        if (entry.version === null) versions.current.delete(key);
        else versions.current.set(key, entry.version);
      }
      applyTaskNumbers(result.records);
    },
    [applyTaskNumbers],
  );

  const handleSaveError = useCallback(
    (error: unknown, commands: Command[]) => {
      if (error instanceof ApiRequestError && error.status === 401) return; // AuthProvider signs the user out
      const message = error instanceof Error ? error.message : "Could not save changes.";
      if (error instanceof ApiRequestError && error.code === "CONFLICT") {
        // Someone else saved first. Their version wins; show it rather than silently overwriting it.
        toast.error("Someone else changed this at the same time", { description: `${message} Your view now shows the latest version.` });
        void load().catch(() => undefined);
        return;
      }
      // Keep the user's edits on screen and let them decide, instead of reloading them away.
      hasUnsavedChanges.current = true;
      failedBatches.current = [...failedBatches.current, commands];
      setSyncError(message);
      toast.error("Couldn't save your changes", {
        id: "save-error",
        description: message,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Retry",
          onClick: () => {
            const batches = failedBatches.current;
            failedBatches.current = [];
            for (const batch of batches) sendRef.current(batch);
          },
        },
        cancel: { label: "Discard", onClick: () => void load().catch(() => undefined) },
      });
    },
    [load],
  );

  const send = useCallback(
    (commands: Command[]) => {
      if (commands.length === 0) return;
      pendingSaves.current += 1;
      queue.current = queue.current
        .then(() => transmit(commands))
        .then(() => {
          hasUnsavedChanges.current = false;
          setSyncError(null);
        })
        .catch((error: unknown) => handleSaveError(error, commands))
        .finally(() => {
          pendingSaves.current -= 1;
        });
    },
    [transmit, handleSaveError],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const apply = useCallback(
    (produce: (prev: Database) => Change) => {
      const change = produce(current.current);
      changeSeq.current += 1;
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

    /** Upserts changed tasks, logging when `subject` was completed or reopened. */
    const saveTasks = (prev: Database, subject: Task, changed: Task[]): Change => {
      if (changed.length === 0) return { db: prev, commands: [] };
      const byId = new Map(changed.map((task) => [task.id, task]));
      const tasks = prev.tasks.map((task) => byId.get(task.id) ?? task);
      const commands = changed.map((task) => upsert("tasks", task as unknown as StoredRecord));
      const after = byId.get(subject.id);
      if (!after || after.done === subject.done) return { db: { ...prev, tasks }, commands };
      const activity = logged(prev, {
        orgId: subject.orgId,
        projectId: subject.projectId,
        text: `${after.done ? "Completed" : "Reopened"}: ${subject.title}`,
        tone: after.done ? "verd" : "amber",
      });
      return { db: { ...prev, tasks, activity: activity.activity }, commands: [...commands, activity.command] };
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
        const taken = current.current.projects.filter((p) => p.orgId === input.orgId).map((p) => p.key);
        const created: Project = { ...input, key: input.key ?? deriveProjectKey(input.name, taken), labels: input.labels ?? [], id: uid(), createdAt: nowIso() };
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
          const created = buildTask(input, prev.tasks, uid(), nowIso());
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
          if (!before) return { db: prev, commands: [] };
          return saveTasks(prev, before, [applyTaskPatch(before, patch, nowIso())]);
        }),
      moveTask: (id, request) =>
        apply((prev) => {
          const before = prev.tasks.find((t) => t.id === id);
          if (!before) return { db: prev, commands: [] };
          return saveTasks(prev, before, moveTasks(prev.tasks, id, request, nowIso()));
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
        apply((prev) => {
          const removed = prev.docs.find((d) => d.id === id);
          const commands: Command[] = [drop("docs", id)];
          if (removed?.fileId) commands.push(drop("files", removed.fileId));
          return { db: { ...prev, docs: prev.docs.filter((d) => d.id !== id) }, commands };
        }),

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

      addCredential: (input) =>
        apply((prev) => {
          const created: Credential = { ...input, id: uid(), createdAt: nowIso(), updatedAt: nowIso() };
          // The typed secret goes to the server once; local state only remembers that one exists.
          const local: Credential = { ...created, secret: "", hasSecret: created.secret !== "" };
          const activity = logged(prev, {
            orgId: input.orgId,
            projectId: input.projectId,
            text: `Credential added: ${created.name}`,
            tone: "accent",
          });
          return {
            db: { ...prev, credentials: [...prev.credentials, local], activity: activity.activity },
            commands: [upsert("credentials", created as unknown as StoredRecord), activity.command],
          };
        }),
      updateCredential: (id, patch) =>
        apply((prev) => {
          const previous = prev.credentials.find((c) => c.id === id);
          if (!previous) return { db: prev, commands: [] };
          // A blank secret means "keep the stored one": it is omitted so the server leaves it untouched.
          const { local: updated, record } = credentialEdit(previous, patch, nowIso());
          const next = prev.credentials.map((c) => (c.id === id ? updated : c));
          const activity = logged(prev, { orgId: updated.orgId, projectId: updated.projectId, text: `Credential updated: ${updated.name}`, tone: "line" });
          return {
            db: { ...prev, credentials: next, activity: activity.activity },
            commands: [upsert("credentials", record), activity.command],
          };
        }),
      removeCredential: (id) =>
        apply((prev) => {
          const removed = prev.credentials.find((c) => c.id === id);
          const commands: Command[] = [drop("credentials", id)];
          if (!removed) return { db: { ...prev, credentials: prev.credentials.filter((c) => c.id !== id) }, commands };
          const activity = logged(prev, { orgId: removed.orgId, projectId: removed.projectId, text: `Credential removed: ${removed.name}`, tone: "rose" });
          return {
            db: { ...prev, credentials: prev.credentials.filter((c) => c.id !== id), activity: activity.activity },
            commands: [...commands, activity.command],
          };
        }),
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
      credentials: db.credentials.filter((c) => c.orgId === orgId),
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
