import type { SessionUser } from "./auth";

export interface UserAccess {
  organisationIds: string[];
  projectIds: string[];
}

export interface AdminUser extends SessionUser {
  access: UserAccess;
}

export interface ProjectRef {
  id: string;
  orgId: string;
}

export type UserFilter = "all" | "active" | "disabled" | "no-access" | "unlinked";

export const EMPTY_ACCESS: UserAccess = { organisationIds: [], projectIds: [] };

const without = (list: string[], id: string) => list.filter((value) => value !== id);
const including = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

/** Revoking an organisation also revokes its projects — the backend rejects orphaned project grants. */
export function toggleOrganisation(access: UserAccess, organisationId: string, projects: ProjectRef[]): UserAccess {
  if (!access.organisationIds.includes(organisationId)) {
    return { ...access, organisationIds: [...access.organisationIds, organisationId] };
  }
  const inOrg = new Set(projects.filter((project) => project.orgId === organisationId).map((project) => project.id));
  return {
    organisationIds: without(access.organisationIds, organisationId),
    projectIds: access.projectIds.filter((projectId) => !inOrg.has(projectId)),
  };
}

/** Granting a project implies its organisation, so the grant is always valid. */
export function toggleProject(access: UserAccess, project: ProjectRef): UserAccess {
  if (access.projectIds.includes(project.id)) return { ...access, projectIds: without(access.projectIds, project.id) };
  return { organisationIds: including(access.organisationIds, project.orgId), projectIds: [...access.projectIds, project.id] };
}

/** "All" / "None" for one organisation's projects. "All" grants the organisation too. */
export function setOrganisationProjects(access: UserAccess, organisationId: string, projects: ProjectRef[], granted: boolean): UserAccess {
  const inOrg = projects.filter((project) => project.orgId === organisationId).map((project) => project.id);
  const others = access.projectIds.filter((projectId) => !inOrg.includes(projectId));
  if (!granted) return { ...access, projectIds: others };
  return { organisationIds: including(access.organisationIds, organisationId), projectIds: [...others, ...inOrg] };
}

export function sameAccess(a: UserAccess, b: UserAccess): boolean {
  const same = (x: string[], y: string[]) => x.length === y.length && x.every((value) => y.includes(value));
  return same(a.organisationIds, b.organisationIds) && same(a.projectIds, b.projectIds);
}

export function hasNoAccess(user: AdminUser): boolean {
  return user.role !== "superadmin" && user.access.organisationIds.length === 0;
}

export function describeAccess(user: AdminUser): string {
  if (user.role === "superadmin") return "Full access";
  const { organisationIds, projectIds } = user.access;
  if (organisationIds.length === 0) return "No access";
  const orgs = `${organisationIds.length} org${organisationIds.length === 1 ? "" : "s"}`;
  return `${orgs} · ${projectIds.length} project${projectIds.length === 1 ? "" : "s"}`;
}

export function filterUsers(users: AdminUser[], query: string, filter: UserFilter): AdminUser[] {
  const needle = query.trim().toLowerCase();
  return users.filter((user) => {
    if (needle && !`${user.displayName} ${user.username}`.toLowerCase().includes(needle)) return false;
    if (filter === "active") return !user.disabled;
    if (filter === "disabled") return user.disabled;
    if (filter === "no-access") return hasNoAccess(user);
    if (filter === "unlinked") return user.role !== "superadmin" && !user.memberId;
    return true;
  });
}
