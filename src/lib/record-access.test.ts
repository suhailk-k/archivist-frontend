import assert from "node:assert/strict";
import test from "node:test";
import type { AdminUser } from "./access-rules.ts";
import { canEditRecord, canMoveRecord, setShareLevel, setUserShareLevel, shareBlocker, shareCandidates } from "./record-access.ts";

function user(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: "u1",
    username: "u1",
    displayName: "User One",
    role: "member",
    memberId: null,
    disabled: false,
    createdAt: "",
    updatedAt: "",
    access: { organisationIds: ["org-1"], projectIds: ["project-1"] },
    ...overrides,
  } as AdminUser;
}

test("canEditRecord needs both the module level and edit access to the record", () => {
  assert.equal(canEditRecord({ _access: "edit" }, true), true);
  assert.equal(canEditRecord({ _access: "view" }, true), false);
  assert.equal(canEditRecord({ _access: "edit" }, false), false);
});

test("canEditRecord treats a record created in this session (no _access yet) as the user's own", () => {
  assert.equal(canEditRecord({}, true), true);
});

test("shareCandidates leaves out superadmins, the creator and disabled accounts", () => {
  const users = [
    user({ id: "admin", role: "superadmin" }),
    user({ id: "creator" }),
    user({ id: "off", disabled: true }),
    user({ id: "u2", displayName: "Bea" }),
    user({ id: "u3", displayName: "Al" }),
  ];
  assert.deepEqual(
    shareCandidates(users, "creator").map((entry) => entry.id),
    ["u3", "u2"],
  );
});

test("shareBlocker explains why a share would not take effect", () => {
  const record = { orgId: "org-1", projectId: "project-1" };
  assert.equal(shareBlocker(user({}), record, "documents"), null);
  assert.match(shareBlocker(user({ access: { organisationIds: ["org-1"], projectIds: [] } }), record, "documents") ?? "", /project/);
  assert.match(shareBlocker(user({ access: { organisationIds: [], projectIds: [] } }), { orgId: "org-1", projectId: null }, "documents") ?? "", /organisation/);
  const noCredentials = user({ access: { organisationIds: ["org-1"], projectIds: ["project-1"], permissions: { documents: "edit", credentials: "none" } } });
  assert.match(shareBlocker(noCredentials, record, "credentials") ?? "", /credentials/i);
});

test("setShareLevel adds, changes and removes without mutating the input", () => {
  const start = [{ userId: "u1", level: "view" as const }];
  const added = setShareLevel(start, "u2", "edit");
  assert.deepEqual(added, [
    { userId: "u1", level: "view" },
    { userId: "u2", level: "edit" },
  ]);
  assert.deepEqual(setShareLevel(added, "u1", "edit")[0], { userId: "u1", level: "edit" });
  assert.deepEqual(setShareLevel(added, "u1", "none"), [{ userId: "u2", level: "edit" }]);
  assert.deepEqual(start, [{ userId: "u1", level: "view" }]);
});

test("setUserShareLevel keys shares by entity and record", () => {
  const start = [{ entity: "docs" as const, recordId: "d1", level: "view" as const }];
  const added = setUserShareLevel(start, "credentials", "d1", "edit");
  assert.equal(added.length, 2);
  assert.deepEqual(setUserShareLevel(added, "docs", "d1", "edit")[0], { entity: "docs", recordId: "d1", level: "edit" });
  assert.deepEqual(setUserShareLevel(added, "docs", "d1", "none"), [{ entity: "credentials", recordId: "d1", level: "edit" }]);
  assert.equal(start.length, 1);
});

test("canMoveRecord: creators, superadmins and records created this session", () => {
  assert.equal(canMoveRecord({ createdById: "u1" }, { id: "u1", role: "member" }), true);
  assert.equal(canMoveRecord({ createdById: "u2" }, { id: "u1", role: "member" }), false);
  assert.equal(canMoveRecord({ createdById: null }, { id: "u1", role: "superadmin" }), true);
  assert.equal(canMoveRecord({}, { id: "u1", role: "member" }), true);
  assert.equal(canMoveRecord({ createdById: "u1" }, null), false);
});
