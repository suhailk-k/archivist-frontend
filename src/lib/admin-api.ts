import { apiGet, apiPost } from "./api-client";
import type { AdminUser, UserAccess } from "./access-rules";
import type { SessionUser } from "./auth";

export type { AdminUser, UserAccess } from "./access-rules";

export interface CreateUserInput {
  username: string;
  displayName: string;
  password: string;
}

export const listUsers = () => apiGet<AdminUser[]>("/api/admin/users");

export const createUser = (input: CreateUserInput) => apiPost<SessionUser>("/api/admin/users", input);

export const changeUserPassword = (userId: string, password: string) =>
  apiPost<null>("/api/admin/password", { userId, password });

export const setUserDisabled = (userId: string, disabled: boolean) =>
  apiPost<{ userId: string; disabled: boolean }>("/api/admin/disabled", { userId, disabled });

export const readUserAccess = (userId: string) =>
  apiGet<UserAccess>(`/api/admin/access?userId=${encodeURIComponent(userId)}`);

export const replaceUserAccess = (userId: string, access: UserAccess) =>
  apiPost<UserAccess>("/api/admin/access", { userId, ...access });

/** Links a login account to a member profile (what "My Work" uses). Pass null to unlink. */
export const setUserMemberLink = (userId: string, memberId: string | null) =>
  apiPost<SessionUser>("/api/admin/member-link", { userId, memberId });
