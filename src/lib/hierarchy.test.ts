import assert from "node:assert/strict";
import test from "node:test";
import { childrenOf, groupIntoLanes, parentCandidates, parentOf } from "./hierarchy.ts";
import type { Task } from "./types.ts";

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

const ids = (tasks: readonly Task[]) => tasks.map((item) => item.id);

test("parentOf returns the parent only when it exists in the same project", () => {
  const story = task({ id: "story" });
  const byId = new Map([story].map((item) => [item.id, item]));
  assert.equal(parentOf(task({ id: "a", parentId: "story" }), byId), story);
  assert.equal(parentOf(task({ id: "b", parentId: "gone" }), byId), undefined);
  assert.equal(parentOf(task({ id: "c", parentId: "story", projectId: "other" }), byId), undefined);
  assert.equal(parentOf(task({ id: "d", parentId: "story", projectId: null }), byId), undefined);
  assert.equal(parentOf(task({ id: "story", parentId: "story" }), byId), undefined);
  assert.equal(parentOf(task({ id: "e" }), byId), undefined);
});

test("childrenOf lists a task's children in board order", () => {
  const tasks = [task({ id: "s" }), task({ id: "b", parentId: "s", sortOrder: 2 }), task({ id: "a", parentId: "s", sortOrder: 1 }), task({ id: "x" })];
  assert.deepEqual(ids(childrenOf("s", tasks)), ["a", "b"]);
  assert.deepEqual(childrenOf("x", tasks), []);
});

test("parentCandidates offers top-level tasks of the same project, never itself", () => {
  const tasks = [
    task({ id: "me" }),
    task({ id: "top", number: 2 }),
    task({ id: "first", number: 1 }),
    task({ id: "child", parentId: "top" }),
    task({ id: "elsewhere", projectId: "q" }),
  ];
  assert.deepEqual(ids(parentCandidates(tasks[0] as Task, tasks)), ["first", "top"]);
});

test("parentCandidates is empty for a task that has children or no project", () => {
  const tasks = [task({ id: "parent" }), task({ id: "kid", parentId: "parent" }), task({ id: "other" })];
  assert.deepEqual(parentCandidates(tasks[0] as Task, tasks), []);
  assert.deepEqual(parentCandidates(task({ id: "loose", projectId: null }), [...tasks, task({ id: "free", projectId: null })]), []);
});

test("groupIntoLanes makes one lane per parent and a last lane for everything else", () => {
  const all = [
    task({ id: "s2", sortOrder: 2 }),
    task({ id: "s1", sortOrder: 1 }),
    task({ id: "a", parentId: "s1" }),
    task({ id: "b", parentId: "s2" }),
    task({ id: "c", parentId: "s2" }),
    task({ id: "loose" }),
    task({ id: "orphan", parentId: "deleted" }),
  ];
  const lanes = groupIntoLanes(all, all);
  assert.deepEqual(
    lanes.map((lane) => [lane.parent?.id ?? null, ids(lane.tasks)]),
    [
      ["s1", ["a"]],
      ["s2", ["b", "c"]],
      [null, ["loose", "orphan"]],
    ],
  );
});

test("groupIntoLanes keeps a lane whose parent is filtered out, and drops lanes with no visible children", () => {
  const all = [task({ id: "s" }), task({ id: "a", parentId: "s" }), task({ id: "empty" }), task({ id: "hidden", parentId: "empty" })];
  const visible = all.filter((item) => item.id === "a" || item.id === "empty");
  const lanes = groupIntoLanes(visible, all);
  assert.deepEqual(
    lanes.map((lane) => [lane.parent?.id ?? null, ids(lane.tasks)]),
    [
      ["s", ["a"]],
      [null, ["empty"]],
    ],
  );
});

test("groupIntoLanes omits an empty everything-else lane unless there are no other lanes", () => {
  const all = [task({ id: "s" }), task({ id: "a", parentId: "s" })];
  assert.deepEqual(
    groupIntoLanes(all, all).map((lane) => lane.parent?.id ?? null),
    ["s"],
  );
  assert.deepEqual(
    groupIntoLanes([], all).map((lane) => [lane.parent, lane.tasks]),
    [[null, []]],
  );
});
