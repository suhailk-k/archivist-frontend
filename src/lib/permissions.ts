/**
 * Per-user levels for documents and credentials; mirrors archivist-backend/src/auth/permissions.ts,
 * which is what actually enforces them. The UI only uses these to hide actions that would be refused.
 */
export const DOCUMENT_LEVELS = ["none", "view", "edit"] as const;
export const CREDENTIAL_LEVELS = ["none", "view", "reveal", "edit"] as const;

export type DocumentLevel = (typeof DOCUMENT_LEVELS)[number];
export type CredentialLevel = (typeof CREDENTIAL_LEVELS)[number];

export interface Permissions {
  documents: DocumentLevel;
  credentials: CredentialLevel;
}

export interface PermissionChecks {
  canSeeDocuments: boolean;
  canEditDocuments: boolean;
  canSeeCredentials: boolean;
  canRevealSecrets: boolean;
  canEditCredentials: boolean;
}

export const FULL_PERMISSIONS: Readonly<Permissions> = Object.freeze({ documents: "edit", credentials: "edit" });
const NO_PERMISSIONS: Readonly<Permissions> = Object.freeze({ documents: "none", credentials: "none" });

export const DOCUMENT_LEVEL_LABEL: Record<DocumentLevel, string> = { none: "No access", view: "View", edit: "Edit" };
export const CREDENTIAL_LEVEL_LABEL: Record<CredentialLevel, string> = {
  none: "No access",
  view: "View list",
  reveal: "View + reveal",
  edit: "Edit",
};

const SHORT_LEVEL: Record<CredentialLevel, string> = { none: "none", view: "view", reveal: "view + reveal", edit: "edit" };

interface PermissionHolder {
  role: string;
  permissions?: Permissions | undefined;
}

/** Signed out: nothing. Superadmin: everything. A session from before permissions existed: full. */
export function effectivePermissions(user: PermissionHolder | null): Permissions {
  if (!user) return { ...NO_PERMISSIONS };
  if (user.role === "superadmin") return { ...FULL_PERMISSIONS };
  return { ...(user.permissions ?? FULL_PERMISSIONS) };
}

export function permissionChecks(permissions: Permissions): PermissionChecks {
  return {
    canSeeDocuments: permissions.documents !== "none",
    canEditDocuments: permissions.documents === "edit",
    canSeeCredentials: permissions.credentials !== "none",
    canRevealSecrets: permissions.credentials === "reveal" || permissions.credentials === "edit",
    canEditCredentials: permissions.credentials === "edit",
  };
}

/** Short summary for the user list; empty when nothing is restricted. */
export function describePermissions(permissions: Permissions): string {
  const parts = [
    permissions.documents === "edit" ? "" : `Docs: ${SHORT_LEVEL[permissions.documents]}`,
    permissions.credentials === "edit" ? "" : `Credentials: ${SHORT_LEVEL[permissions.credentials]}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function samePermissions(a: Permissions | undefined, b: Permissions | undefined): boolean {
  const left = a ?? FULL_PERMISSIONS;
  const right = b ?? FULL_PERMISSIONS;
  return left.documents === right.documents && left.credentials === right.credentials;
}
