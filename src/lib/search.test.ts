import assert from "node:assert/strict";
import test from "node:test";
import { MAX_RESULTS_PER_KIND, searchAll, type SearchSource } from "./search.ts";
import type { Project, Task } from "./types.ts";

const project = (id: string, name: string, description = ""): Project => ({ id, name, description }) as Project;
const task = (id: string, title: string, projectId: string | null = null): Task => ({ id, title, projectId, phase: "Build" }) as Task;

const source = (overrides: Partial<SearchSource> = {}): SearchSource => ({
  projects: [],
  tasks: [],
  docs: [],
  meetings: [],
  decisions: [],
  credentials: [],
  members: [],
  ...overrides,
});

test("returns nothing for blank query", () => {
  assert.deepEqual(searchAll(source({ projects: [project("p1", "Legacy ERP")] }), "   "), []);
});

test("matches titles case-insensitively and labels tasks with their project", () => {
  const results = searchAll(source({ projects: [project("p1", "Legacy ERP")], tasks: [task("t1", "Migrate erp data", "p1")] }), "ERP");
  assert.deepEqual(
    results.map((r) => [r.kind, r.id, r.subtitle]),
    [
      ["project", "p1", "Project"],
      ["task", "t1", "Legacy ERP"],
    ],
  );
});

test("ranks prefix matches above substring and description matches", () => {
  const results = searchAll(
    source({ projects: [project("a", "Old site", "portal for erp"), project("b", "Web portal"), project("c", "Portal v2")] }),
    "portal",
  );
  assert.deepEqual(results.map((r) => r.id), ["c", "b", "a"]);
});

test("caps results per kind", () => {
  const tasks = Array.from({ length: 9 }, (_, i) => task(`t${i}`, `Fix bug ${i}`));
  assert.equal(searchAll(source({ tasks }), "bug").length, MAX_RESULTS_PER_KIND);
});
