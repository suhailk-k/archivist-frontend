import assert from "node:assert/strict";
import test from "node:test";
import {
  SORT_STEP,
  appendSortOrder,
  applyTaskPatch,
  buildTask,
  deriveProjectKey,
  donePatch,
  filtersFromSearch,
  matchesFilters,
  midpoint,
  moveTasks,
  normalizeProjects,
  normalizeTasks,
  planMove,
  searchFromFilters,
  statusPatch,
  syncAssignees,
  taskKey,
} from "./board.ts";
import type { Project, Task } from "./types.ts";

const NOW = "2026-09-28T10:00:00.000Z";

const task = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "t",
  orgId: "o",
  projectId: "p",
  title: overrides.id ?? "t",
  phase: "",
  status: "todo",
  labels: [],
  sortOrder: 0,
  done: false,
  priority: "normal",
  dueDate: "",
  assigneeId: null,
  assigneeIds: [],
  plannedFor: "",
  completedAt: "",
  createdAt: "2026-09-01T09:00:00.000Z",
  ...overrides,
});

const project = (overrides: Partial<Project>): Project => ({
  id: overrides.id ?? "p",
  orgId: "o",
  name: "Elance",
  description: "",
  status: "planning",
  ownerId: null,
  memberIds: [],
  startDate: "",
  dueDate: "",
  links: [],
  key: "",
  labels: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

/** Simulates a record from the server that predates the board fields. */
const legacy = (overrides: Partial<Task>): Task => {
  const { status: _s, labels: _l, sortOrder: _o, assigneeIds: _a, number: _n, ...rest } = task(overrides);
  return { ...rest, ...overrides } as Task;
};

test("midpoint sits between neighbours and extends past either end", () => {
  assert.equal(midpoint(1024, 2048), 1536);
  assert.equal(midpoint(undefined, 1024), 0);
  assert.equal(midpoint(1024, undefined), 1024 + SORT_STEP);
  assert.equal(midpoint(undefined, undefined), SORT_STEP);
});

test("planMove places a card between its new neighbours without touching others", () => {
  const column = [task({ id: "a", sortOrder: 1024 }), task({ id: "b", sortOrder: 2048 })];
  const plan = planMove(column, "x", { beforeId: "a", afterId: "b" });
  assert.deepEqual(plan, [{ id: "x", sortOrder: 1536 }]);
});

test("planMove rebalances the column when the gap is too small", () => {
  const column = [task({ id: "a", sortOrder: 1 }), task({ id: "b", sortOrder: 1 + 1e-7 }), task({ id: "c", sortOrder: 5 })];
  const plan = planMove(column, "x", { beforeId: "a", afterId: "b" });
  assert.deepEqual(plan, [
    { id: "a", sortOrder: SORT_STEP },
    { id: "x", sortOrder: SORT_STEP * 2 },
    { id: "b", sortOrder: SORT_STEP * 3 },
    { id: "c", sortOrder: SORT_STEP * 4 },
  ]);
});

test("planMove ignores the moved card's own old slot in the column", () => {
  const column = [task({ id: "x", sortOrder: 10 }), task({ id: "a", sortOrder: 20 })];
  assert.deepEqual(planMove(column, "x", { beforeId: "a" }), [{ id: "x", sortOrder: 20 + SORT_STEP }]);
});

test("appendSortOrder goes after the last card in the column", () => {
  assert.equal(appendSortOrder([task({ sortOrder: 3000 }), task({ sortOrder: 5 })]), 3000 + SORT_STEP);
  assert.equal(appendSortOrder([]), SORT_STEP);
});

test("statusPatch derives done and completedAt", () => {
  assert.deepEqual(statusPatch(task({}), "done", NOW), { status: "done", done: true, completedAt: NOW });
  assert.deepEqual(statusPatch(task({ status: "done", done: true, completedAt: NOW }), "in_review", NOW), {
    status: "in_review",
    done: false,
    completedAt: "",
  });
  const moved = statusPatch(task({ status: "done", done: true, completedAt: "earlier" }), "done", NOW);
  assert.equal(moved.completedAt, "earlier");
});

test("donePatch moves the status to match a checkbox toggle", () => {
  assert.equal(donePatch(task({ status: "in_progress" }), true, NOW).status, "done");
  assert.equal(donePatch(task({ status: "done", done: true }), false, NOW).status, "todo");
});

test("syncAssignees keeps assigneeId equal to the first assignee either way", () => {
  assert.deepEqual(syncAssignees({ assigneeIds: ["b", "c"] }), { assigneeIds: ["b", "c"], assigneeId: "b" });
  assert.deepEqual(syncAssignees({ assigneeIds: [] }), { assigneeIds: [], assigneeId: null });
  assert.deepEqual(syncAssignees({ assigneeId: "z" }), { assigneeId: "z", assigneeIds: ["z"] });
  assert.deepEqual(syncAssignees({ title: "x" }), { title: "x" });
});

test("normalizeTasks fills legacy fields in memory and numbers around existing ones", () => {
  const tasks = normalizeTasks([
    legacy({ id: "late", done: true, assigneeId: "m1", createdAt: "2026-03-01T00:00:00.000Z" }),
    legacy({ id: "early", createdAt: "2026-01-01T00:00:00.000Z" }),
    task({ id: "numbered", number: 1, createdAt: "2026-02-01T00:00:00.000Z" }),
  ]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  assert.equal(byId.get("late")?.status, "done");
  assert.equal(byId.get("early")?.status, "todo");
  assert.deepEqual(byId.get("late")?.assigneeIds, ["m1"]);
  assert.deepEqual(byId.get("early")?.labels, []);
  assert.equal(byId.get("early")?.number, 2);
  assert.equal(byId.get("late")?.number, 3);
  assert.equal(byId.get("numbered")?.number, 1);
  assert.equal(byId.get("early")?.sortOrder, 0);
  assert.equal(byId.get("late")?.sortOrder, 2 * SORT_STEP);
});

test("normalizeTasks returns records that already have every field unchanged", () => {
  const complete = task({ id: "a", number: 1 });
  assert.equal(normalizeTasks([complete])[0], complete);
});

test("taskKey joins the project key and number", () => {
  assert.equal(taskKey("ELC", 23), "ELC-23");
  assert.equal(taskKey("ELC", undefined), "ELC-…");
});

test("deriveProjectKey uses initials or the first letters and avoids taken keys", () => {
  assert.equal(deriveProjectKey("Elance Learning Center", []), "ELC");
  assert.equal(deriveProjectKey("archivist", []), "ARC");
  assert.equal(deriveProjectKey("archivist", ["ARC"]), "ARCH");
  assert.equal(deriveProjectKey("42 é", []), "PRJ");
  assert.match(deriveProjectKey("Ab", ["AB", "ABA"]), /^[A-Z]{2,5}$/);
  assert.notEqual(deriveProjectKey("Ab", ["AB"]), "AB");
});

test("normalizeProjects derives unique keys per org in createdAt order", () => {
  const projects = normalizeProjects([
    project({ id: "second", name: "Archive two", createdAt: "2026-02-01T00:00:00.000Z" }),
    project({ id: "first", name: "Archive one", createdAt: "2026-01-01T00:00:00.000Z" }),
    project({ id: "kept", name: "Whatever", key: "ARCO" }),
  ]);
  const byId = new Map(projects.map((p) => [p.id, p]));
  assert.equal(byId.get("first")?.key, "AO");
  assert.equal(byId.get("second")?.key, "AT");
  assert.equal(byId.get("kept")?.key, "ARCO");
  assert.deepEqual(byId.get("first")?.labels, []);
});

test("matchesFilters combines assignee, label, priority and text", () => {
  const t = task({ id: "t1", title: "Design empty states", assigneeIds: ["m1"], labels: ["l1"], priority: "high" });
  assert.equal(matchesFilters(t, {}, { key: "ELC", memberId: null }), true);
  assert.equal(matchesFilters(t, { assignees: ["me"] }, { key: "ELC", memberId: "m1" }), true);
  assert.equal(matchesFilters(t, { assignees: ["me"] }, { key: "ELC", memberId: null }), false);
  assert.equal(matchesFilters(t, { assignees: ["m2"] }, { key: "ELC", memberId: null }), false);
  assert.equal(matchesFilters(t, { assignees: ["m2", "m1"] }, { key: "ELC", memberId: null }), true);
  assert.equal(matchesFilters(t, { label: "l1", priority: "high" }, { key: "ELC", memberId: null }), true);
  assert.equal(matchesFilters(t, { priority: "low" }, { key: "ELC", memberId: null }), false);
  assert.equal(matchesFilters(t, { q: "EMPTY" }, { key: "ELC", memberId: null }), true);
  assert.equal(matchesFilters({ ...t, number: 7 }, { q: "elc-7" }, { key: "ELC", memberId: null }), true);
  assert.equal(matchesFilters(t, { q: "nope" }, { key: "ELC", memberId: null }), false);
});

test("filtersFromSearch keeps only well-formed values", () => {
  assert.deepEqual(filtersFromSearch({ assignee: "me", priority: "bogus", q: "  hi ", label: 3 }), { assignees: ["me"], q: "hi" });
  assert.deepEqual(filtersFromSearch({ assignee: ["m1", "", 4, "m2"] }), { assignees: ["m1", "m2"] });
  assert.deepEqual(filtersFromSearch({ assignee: [] }), {});
});

test("buildTask appends to its column and syncs status, done and assignees", () => {
  const existing = [task({ id: "a", status: "in_progress", sortOrder: 4096 }), task({ id: "b", status: "todo", sortOrder: 9999 })];
  const built = buildTask(
    { orgId: "o", projectId: "p", title: "New", phase: "", done: false, priority: "normal", dueDate: "", assigneeId: null, status: "in_progress", assigneeIds: ["m1", "m2"] },
    existing,
    "n",
    NOW,
  );
  assert.equal(built.sortOrder, 4096 + SORT_STEP);
  assert.equal(built.assigneeId, "m1");
  assert.equal(built.done, false);
  assert.equal("number" in built, false);
  const legacyInput = buildTask(
    { orgId: "o", projectId: null, title: "Old", phase: "", done: true, priority: "normal", dueDate: "", assigneeId: "m3" },
    existing,
    "m",
    NOW,
  );
  assert.equal(legacyInput.status, "done");
  assert.equal(legacyInput.completedAt, NOW);
  assert.deepEqual(legacyInput.assigneeIds, ["m3"]);
});

test("applyTaskPatch derives status from done and done from status", () => {
  const open = task({ status: "in_review" });
  assert.equal(applyTaskPatch(open, { done: true }, NOW).status, "done");
  const reopened = applyTaskPatch(task({ status: "done", done: true, completedAt: NOW }), { status: "backlog" }, NOW);
  assert.equal(reopened.done, false);
  assert.equal(reopened.completedAt, "");
  assert.equal(applyTaskPatch(open, { assigneeIds: ["z"] }, NOW).assigneeId, "z");
});

test("moveTasks changes status and order and returns only changed tasks", () => {
  const tasks = [
    task({ id: "x", status: "todo", sortOrder: 1 }),
    task({ id: "a", status: "done", done: true, sortOrder: 100 }),
    task({ id: "b", status: "done", done: true, sortOrder: 200 }),
  ];
  const changed = moveTasks(tasks, "x", { status: "done", beforeId: "a", afterId: "b" }, NOW);
  assert.equal(changed.length, 1);
  assert.equal(changed[0]?.status, "done");
  assert.equal(changed[0]?.done, true);
  assert.equal(changed[0]?.sortOrder, 150);
  assert.deepEqual(moveTasks(tasks, "a", { status: "done", afterId: "b" }, NOW), []);
});

test("matchesFilters keeps only tasks in the chosen projects", () => {
  const t = task({ projectId: "p1" });
  assert.equal(matchesFilters(t, { projects: ["p2", "p1"] }, { key: "ELC", memberId: null }), true);
  assert.equal(matchesFilters(t, { projects: ["p2"] }, { key: "ELC", memberId: null }), false);
  assert.equal(matchesFilters(task({ projectId: null }), { projects: ["p1"] }, { key: "", memberId: null }), false);
});

test("filters round-trip through URL search params", () => {
  const filters = { assignees: ["me", "m2"], projects: ["p1"], label: "l1", priority: "high" as const, q: "hi" };
  const search = searchFromFilters(filters);
  assert.deepEqual(search, { assignee: ["me", "m2"], project: ["p1"], label: "l1", priority: "high", q: "hi" });
  assert.deepEqual(filtersFromSearch(search as unknown as Record<string, unknown>), filters);
  assert.deepEqual(searchFromFilters({}), {});
});

test("applyTaskPatch moving projects drops the old number and labels", () => {
  const moved = applyTaskPatch(task({ projectId: "p1", number: 4, labels: ["l1"] }), { projectId: "p2" }, NOW);
  assert.equal(moved.projectId, "p2");
  assert.equal("number" in moved, false);
  assert.deepEqual(moved.labels, []);
  const child = applyTaskPatch(task({ projectId: "p1", parentId: "story" }), { projectId: "p2" }, NOW);
  assert.equal(child.parentId, null);
  const same = applyTaskPatch(task({ projectId: "p1", number: 4, labels: ["l1"] }), { projectId: "p1", title: "x" }, NOW);
  assert.equal(same.number, 4);
  assert.deepEqual(same.labels, ["l1"]);
});
