import { useAuth } from "./auth";
import { effectivePermissions, permissionChecks, type PermissionChecks } from "./permissions";

/** What the signed-in user may do with documents and credentials (the backend enforces the same rules). */
export function usePermissions(): PermissionChecks {
  const { user } = useAuth();
  return permissionChecks(effectivePermissions(user));
}
