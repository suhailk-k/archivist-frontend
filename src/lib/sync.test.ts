import assert from "node:assert/strict";
import test from "node:test";
import { collectVersions, credentialEdit, stampVersion, versionKey, type Command } from "./sync";
import type { Credential, Database } from "./types";

const credential: Credential = {
  id: "c1",
  orgId: "o1",
  projectId: null,
  name: "AWS",
  category: "",
  username: "root",
  secret: "",
  hasSecret: true,
  url: "",
  usedFor: "",
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("stampVersion replaces a stale version with the newest known one", () => {
  const command: Command = { entity: "tasks", operation: "upsert", record: { id: "t1", title: "x", _version: 1 } };
  const stamped = stampVersion(command, new Map([[versionKey("tasks", "t1"), 3]]));
  assert.equal(stamped.operation === "upsert" && stamped.record["_version"], 3);
});

test("stampVersion strips the version from records the server has never seen", () => {
  const command: Command = { entity: "tasks", operation: "upsert", record: { id: "new", _version: 9 } };
  const stamped = stampVersion(command, new Map());
  assert.ok(stamped.operation === "upsert" && !("_version" in stamped.record));
});

test("stampVersion leaves deletes untouched", () => {
  const command: Command = { entity: "tasks", operation: "delete", id: "t1" };
  assert.equal(stampVersion(command, new Map()), command);
});

test("collectVersions indexes every versioned record by entity and id", () => {
  const database = { tasks: [{ id: "t1", _version: 2 }], docs: [{ id: "d1" }] } as unknown as Database;
  const versions = collectVersions(database);
  assert.equal(versions.get("tasks:t1"), 2);
  assert.equal(versions.has("docs:d1"), false);
});

test("credentialEdit omits a blank secret so the stored one is kept", () => {
  const { local, record } = credentialEdit(credential, { name: "AWS prod", secret: "" }, "2026-02-01T00:00:00.000Z");
  assert.equal("secret" in record, false);
  assert.equal(record["name"], "AWS prod");
  assert.equal(local.hasSecret, true);
  assert.equal(local.secret, "");
});

test("credentialEdit sends a typed secret but never keeps it in memory", () => {
  const { local, record } = credentialEdit({ ...credential, hasSecret: false }, { secret: "s3cret" }, "2026-02-01T00:00:00.000Z");
  assert.equal(record["secret"], "s3cret");
  assert.equal(local.secret, "");
  assert.equal(local.hasSecret, true);
  assert.equal("hasSecret" in record, false);
});
