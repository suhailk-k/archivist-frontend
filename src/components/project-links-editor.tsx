import { GhostButton } from "@/components/app-shell";
import { TextInput } from "@/components/forms";
import { EMPTY_PROJECT_LINK, type ProjectLinkDraft } from "@/lib/project-links";

interface ProjectLinksEditorProps {
  links: ProjectLinkDraft[];
  onChange: (links: ProjectLinkDraft[]) => void;
}

export function ProjectLinksEditor({ links, onChange }: ProjectLinksEditorProps) {
  const updateLink = (index: number, patch: Partial<ProjectLinkDraft>) => {
    onChange(links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link)));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono">Project links</span>
        <GhostButton
          type="button"
          onClick={() => onChange([...links, { ...EMPTY_PROJECT_LINK }])}
        >
          + Add link
        </GhostButton>
      </div>
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={link.id ?? `new-link-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <TextInput
              aria-label={`Link ${index + 1} label`}
              value={link.label}
              onChange={(event) => updateLink(index, { label: event.target.value })}
              placeholder="GitHub"
            />
            <TextInput
              aria-label={`Link ${index + 1} URL`}
              type="url"
              value={link.url}
              onChange={(event) => updateLink(index, { url: event.target.value })}
              placeholder="https://github.com/..."
            />
            <button
              type="button"
              aria-label={`Remove link ${index + 1}`}
              onClick={() => onChange(links.filter((_, linkIndex) => linkIndex !== index))}
              className="px-2 font-mono text-[11px] text-ink-soft hover:text-rose"
            >
              ✕
            </button>
          </div>
        ))}
        {links.length === 0 ? <p className="text-[12px] text-ink-soft">No links added.</p> : null}
      </div>
    </div>
  );
}
