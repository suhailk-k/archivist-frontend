import type { AdminUser } from "./access-rules";
import type { ID } from "./types";

/**
 * Per-record access for documents and credentials (mirrors the backend's record-access rules).
 * The creator and superadmins can edit; anyone else needs a share from a superadmin.
 */
export type ShareLevel = "view" | "edit";

export interface Share {
  userId: ID;
  level: ShareLevel;
}

export type ShareableEntity = "docs" | "credentials";

/** One record shared with a given user (the per-user view of the same shares). */
export interface UserShare {
  entity: ShareableEntity;
  recordId: ID;
  level: ShareLevel;
}

/** Server-derived fields on documents and credentials. */
export interface RecordAccessFields {
  /** User id of whoever created the record; null for records that predate creators (superadmin-only). */
  createdById?: ID | null;
  /** The signed-in user's access to this record. Absent on a record created in this session. */
  _access?: ShareLevel;
}

/** Editing needs the module level (documents/credentials "edit") and edit access to this record. */
export function canEditRecord(record: RecordAccessFields, canEditModule: boolean): boolean {
  return canEditModule && (record._access ?? "edit") === "edit";
}

/**
 * Only the creator or a superadmin may move a record to another organisation or project (the backend
 * refuses it for shared editors). A record created in this session has no creator yet and is the user's own.
 */
export function canMoveRecord(record: RecordAccessFields, user: { id: ID; role: string } | null): boolean {
  if (!user) return false;
  return user.role === "superadmin" || record.createdById === undefined || record.createdById === user.id;
}

/** People a superadmin can share with: active members other than the creator, by name. */
export function shareCandidates(users: AdminUser[], creatorId: ID | null | undefined): AdminUser[] {
  return users
    .filter((entry) => entry.role !== "superadmin" && !entry.disabled && entry.id !== creatorId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Shares never bypass org/project grants or module levels. Returns why a share would have no
 * effect for this user, or null when it would.
 */
export function shareBlocker(
  user: AdminUser,
  record: { orgId: ID; projectId: ID | null },
  module: "documents" | "credentials",
): string | null {
  if (record.projectId && !user.access.projectIds.includes(record.projectId)) return "No access to this project yet";
  if (!record.projectId && !user.access.organisationIds.includes(record.orgId)) return "No access to this organisation yet";
  if (user.access.permissions?.[module] === "none") {
    return module === "documents" ? "Documents are turned off for this user" : "Credentials are turned off for this user";
  }
  return null;
}

/** Returns a new share list with one person's level set; "none" removes them. */
export function setShareLevel(shares: Share[], userId: ID, level: ShareLevel | "none"): Share[] {
  if (level === "none") return shares.filter((share) => share.userId !== userId);
  if (!shares.some((share) => share.userId === userId)) return [...shares, { userId, level }];
  return shares.map((share) => (share.userId === userId ? { userId, level } : share));
}

/** Returns a new per-user share list with one record's level set; "none" removes it. */
export function setUserShareLevel(shares: UserShare[], entity: ShareableEntity, recordId: ID, level: ShareLevel | "none"): UserShare[] {
  const matches = (share: UserShare) => share.entity === entity && share.recordId === recordId;
  if (level === "none") return shares.filter((share) => !matches(share));
  if (!shares.some(matches)) return [...shares, { entity, recordId, level }];
  return shares.map((share) => (matches(share) ? { entity, recordId, level } : share));
}
