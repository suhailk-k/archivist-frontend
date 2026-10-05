import assert from "node:assert/strict";
import test from "node:test";
import {
  describeAccess,
  EMPTY_ACCESS,
  filterUsers,
  sameAccess,
  setOrganisationProjects,
  toggleOrganisation,
  toggleProject,
  type AdminUser,
} from "./access-rules";

const projects = [
  { id: "p1", orgId: "o1" },
  { id: "p2", orgId: "o1" },
  { id: "p3", orgId: "o2" },
];

const user = (overrides: Partial<AdminUser>): AdminUser => ({
  id: "u",
  username: "user",
  displayName: "User",
  role: "member",
  memberId: null,
  disabled: false,
  createdAt: "",
  updatedAt: "",
  access: EMPTY_ACCESS,
  ...overrides,
});

test("revoking an organisation revokes only its projects", () => {
  const access = { organisationIds: ["o1", "o2"], projectIds: ["p1", "p3"] };
  assert.deepEqual(toggleOrganisation(access, "o1", projects), { organisationIds: ["o2"], projectIds: ["p3"] });
});

test("granting a project grants its organisation", () => {
  assert.deepEqual(toggleProject(EMPTY_ACCESS, projects[2]!), { organisationIds: ["o2"], projectIds: ["p3"] });
});

test("select all / none toggles one organisation's projects", () => {
  const all = setOrganisationProjects({ organisationIds: [], projectIds: ["p3"] }, "o1", projects, true);
  assert.deepEqual(all, { organisationIds: ["o1"], projectIds: ["p3", "p1", "p2"] });
  const none = setOrganisationProjects(all, "o1", projects, false);
  assert.deepEqual(none, { organisationIds: ["o1"], projectIds: ["p3"] });
});

test("grant toggles keep the user's permission levels", () => {
  const permissions = { documents: "view", credentials: "none" } as const;
  const access = { organisationIds: ["o1"], projectIds: ["p1"], permissions };
  assert.equal(toggleOrganisation(access, "o1", projects).permissions, permissions);
  assert.equal(toggleProject(access, projects[2]!).permissions, permissions);
});

test("sameAccess compares permission levels too", () => {
  const grants = { organisationIds: ["a"], projectIds: [] };
  assert.ok(sameAccess(grants, { ...grants, permissions: { documents: "edit", credentials: "edit" } }));
  assert.ok(!sameAccess(grants, { ...grants, permissions: { documents: "edit", credentials: "view" } }));
});

test("sameAccess ignores order", () => {
  assert.ok(sameAccess({ organisationIds: ["a", "b"], projectIds: [] }, { organisationIds: ["b", "a"], projectIds: [] }));
  assert.ok(!sameAccess({ organisationIds: ["a"], projectIds: [] }, { organisationIds: ["a"], projectIds: ["x"] }));
});

test("describeAccess summarises grants", () => {
  assert.equal(describeAccess(user({ role: "superadmin" })), "Full access");
  assert.equal(describeAccess(user({})), "No access");
  assert.equal(describeAccess(user({ access: { organisationIds: ["o1"], projectIds: ["p1", "p2"] } })), "1 org · 2 projects");
});

test("filterUsers matches search text and status filters", () => {
  const users = [
    user({ id: "a", displayName: "Asha", username: "asha", memberId: "m1", access: { organisationIds: ["o1"], projectIds: [] } }),
    user({ id: "b", displayName: "Ben", username: "ben", disabled: true }),
    user({ id: "c", displayName: "Owner", username: "owner", role: "superadmin" }),
  ];
  assert.deepEqual(filterUsers(users, "as", "all").map((u) => u.id), ["a"]);
  assert.deepEqual(filterUsers(users, "", "disabled").map((u) => u.id), ["b"]);
  assert.deepEqual(filterUsers(users, "", "no-access").map((u) => u.id), ["b"]);
  assert.deepEqual(filterUsers(users, "", "unlinked").map((u) => u.id), ["b"]);
});
