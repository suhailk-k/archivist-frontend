import { setOrganisationProjects, toggleOrganisation, toggleProject, type UserAccess } from "@/lib/access-rules";

export interface AccessEditorProps {
  access: UserAccess;
  onChange: (access: UserAccess) => void;
  organisations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; orgId: string }>;
  disabled?: boolean;
}

/**
 * Organisation → project grant picker. An organisation grant shows org-level records; each
 * project must be granted separately. Granting a project grants its organisation automatically.
 */
export function AccessEditor({ access, onChange, organisations, projects, disabled = false }: AccessEditorProps) {
  if (organisations.length === 0) return <p className="text-[13px] text-ink-soft">No organisations exist yet.</p>;

  return (
    <div className="space-y-2">
      {organisations.map((organisation) => {
        const orgProjects = projects.filter((project) => project.orgId === organisation.id);
        const granted = access.organisationIds.includes(organisation.id);
        const grantedCount = orgProjects.filter((project) => access.projectIds.includes(project.id)).length;
        return (
          <fieldset key={organisation.id} disabled={disabled} className="rounded-lg border border-line/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-medium">
                <input type="checkbox" checked={granted} onChange={() => onChange(toggleOrganisation(access, organisation.id, projects))} />
                <span className="truncate">{organisation.name}</span>
              </label>
              <span className="font-mono text-[11px] text-ink-soft">
                {grantedCount}/{orgProjects.length} projects
              </span>
              {orgProjects.length > 0 ? (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-0.5 text-[11px] text-accent hover:bg-accent/10 disabled:opacity-40"
                    disabled={grantedCount === orgProjects.length && granted}
                    onClick={() => onChange(setOrganisationProjects(access, organisation.id, projects, true))}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-soft hover:bg-ink/5 disabled:opacity-40"
                    disabled={grantedCount === 0}
                    onClick={() => onChange(setOrganisationProjects(access, organisation.id, projects, false))}
                  >
                    None
                  </button>
                </span>
              ) : null}
            </div>
            {orgProjects.length > 0 ? (
              <div className="mt-2 grid gap-1 pl-6 sm:grid-cols-2">
                {orgProjects.map((project) => (
                  <label key={project.id} className="flex min-w-0 items-center gap-2 text-[12px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={access.projectIds.includes(project.id)}
                      onChange={() => onChange(toggleProject(access, project))}
                    />
                    <span className="truncate">{project.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-1 pl-6 text-[11px] text-ink-soft">No projects in this organisation.</p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
