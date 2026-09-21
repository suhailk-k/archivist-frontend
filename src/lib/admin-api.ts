import { apiGet, apiPost } from "./api-client";
import type { SessionUser } from "./auth";

export interface UserAccess {
  organisationIds: string[];
  projectIds: string[];
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  password: string;
}

export const listUsers = () => apiGet<SessionUser[]>("/api/admin/users");

export const createUser = (input: CreateUserInput) => apiPost<SessionUser>("/api/admin/users", input);

export const changeUserPassword = (userId: string, password: string) =>
  apiPost<null>("/api/admin/password", { userId, password });

export const setUserDisabled = (userId: string, disabled: boolean) =>
  apiPost<{ userId: string; disabled: boolean }>("/api/admin/disabled", { userId, disabled });

export const readUserAccess = (userId: string) =>
  apiGet<UserAccess>(`/api/admin/access?userId=${encodeURIComponent(userId)}`);

export const replaceUserAccess = (userId: string, access: UserAccess) =>
  apiPost<UserAccess>("/api/admin/access", { userId, ...access });
