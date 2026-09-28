import type { Credential, Database, ID } from "./types";

/** Server-assigned record version, echoed back on every upsert for conflict detection. */
export const VERSION_FIELD = "_version";

export type RecordEntity = keyof Database;
export type StoredRecord = { id: ID } & Record<string, unknown>;

export type Command =
  | { entity: RecordEntity; operation: "upsert"; record: StoredRecord }
  | { entity: RecordEntity; operation: "delete"; id: ID };

export const versionKey = (entity: RecordEntity, id: ID): string => `${entity}:${id}`;

/**
 * Replaces whatever `_version` a record carried when it was edited with the newest version known
 * at send time. Records never seen by the server carry none, so the server treats them as new.
 */
export function stampVersion(command: Command, versions: ReadonlyMap<string, number>): Command {
  if (command.operation !== "upsert") return command;
  const { [VERSION_FIELD]: _stale, ...record } = command.record;
  const version = versions.get(versionKey(command.entity, command.record.id));
  const stamped = version === undefined ? record : { ...record, [VERSION_FIELD]: version };
  return { ...command, record: stamped as StoredRecord };
}

/** Collects `_version` from every record in a freshly loaded database. */
export function collectVersions(database: Database): Map<string, number> {
  const versions = new Map<string, number>();
  for (const entity of Object.keys(database) as RecordEntity[]) {
    for (const record of database[entity] as unknown as StoredRecord[]) {
      const version = record[VERSION_FIELD];
      if (typeof version === "number") versions.set(versionKey(entity, record.id), version);
    }
  }
  return versions;
}

/**
 * Splits a credential edit into what stays in memory (never the secret) and what goes to the
 * server (the secret only when one was typed — blank means "keep the stored one").
 */
export function credentialEdit(
  previous: Credential,
  patch: Partial<Credential>,
  now: string,
): { local: Credential; record: StoredRecord } {
  const { secret: typedSecret, ...rest } = patch;
  const secretChanged = typeof typedSecret === "string" && typedSecret !== "";
  const local: Credential = { ...previous, ...rest, secret: "", hasSecret: secretChanged || Boolean(previous.hasSecret), updatedAt: now };
  const { secret: _blank, hasSecret: _derived, ...sent } = local;
  const record = (secretChanged ? { ...sent, secret: typedSecret } : sent) as unknown as StoredRecord;
  return { local, record };
}
