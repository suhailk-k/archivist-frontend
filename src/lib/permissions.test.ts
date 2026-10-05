import assert from "node:assert/strict";
import test from "node:test";
import { describePermissions, effectivePermissions, permissionChecks, samePermissions } from "./permissions.ts";

test("effectivePermissions: superadmins and older sessions get full access", () => {
  assert.deepEqual(effectivePermissions(null), { documents: "none", credentials: "none" });
  assert.deepEqual(effectivePermissions({ role: "superadmin", permissions: { documents: "none", credentials: "none" } }), { documents: "edit", credentials: "edit" });
  assert.deepEqual(effectivePermissions({ role: "member" }), { documents: "edit", credentials: "edit" });
  assert.deepEqual(effectivePermissions({ role: "member", permissions: { documents: "view", credentials: "reveal" } }), { documents: "view", credentials: "reveal" });
});

test("permissionChecks maps each level to what the UI may do", () => {
  assert.deepEqual(permissionChecks({ documents: "view", credentials: "view" }), {
    canSeeDocuments: true,
    canEditDocuments: false,
    canSeeCredentials: true,
    canRevealSecrets: false,
    canEditCredentials: false,
  });
  assert.deepEqual(permissionChecks({ documents: "none", credentials: "reveal" }), {
    canSeeDocuments: false,
    canEditDocuments: false,
    canSeeCredentials: true,
    canRevealSecrets: true,
    canEditCredentials: false,
  });
  assert.equal(permissionChecks({ documents: "edit", credentials: "edit" }).canRevealSecrets, true);
});

test("describePermissions is empty for full access and lists restrictions otherwise", () => {
  assert.equal(describePermissions({ documents: "edit", credentials: "edit" }), "");
  assert.equal(describePermissions({ documents: "view", credentials: "none" }), "Docs: view · Credentials: none");
  assert.equal(describePermissions({ documents: "edit", credentials: "reveal" }), "Credentials: view + reveal");
});

test("samePermissions treats a missing value as full access", () => {
  assert.ok(samePermissions(undefined, { documents: "edit", credentials: "edit" }));
  assert.ok(!samePermissions(undefined, { documents: "view", credentials: "edit" }));
});
