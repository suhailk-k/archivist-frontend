import type { ID, ProjectLink } from "./types";

export interface ProjectLinkDraft {
  id?: ID;
  label: string;
  url: string;
}

export const EMPTY_PROJECT_LINK: ProjectLinkDraft = { label: "", url: "" };

export interface ProjectLinksValidation {
  links: ProjectLink[];
  error: string | null;
}

const createLinkId = (): ID => `link-${Math.random().toString(36).slice(2, 10)}`;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeProjectLinks(value: unknown): ProjectLink[] {
  if (!Array.isArray(value)) return [];

  return value.reduce<ProjectLink[]>((links, item, index) => {
    if (!item || typeof item !== "object") return links;
    const candidate = item as Record<string, unknown>;
    const labelValue = candidate["label"];
    const urlValue = candidate["url"];
    const idValue = candidate["id"];
    const label = typeof labelValue === "string" ? labelValue.trim() : "";
    const url = typeof urlValue === "string" ? urlValue.trim() : "";
    if (!label || !isHttpUrl(url)) return links;
    links.push({
      id: typeof idValue === "string" && idValue ? idValue : `link-${index}`,
      label,
      url,
    });
    return links;
  }, []);
}

export function validateProjectLinks(drafts: ProjectLinkDraft[]): ProjectLinksValidation {
  const links: ProjectLink[] = [];

  for (const draft of drafts) {
    const label = draft.label.trim();
    const url = draft.url.trim();
    if (!label && !url) continue;
    if (!label) return { links: [], error: "Every project link needs a label." };
    if (!url) return { links: [], error: `Add a URL for “${label}”.` };
    if (!isHttpUrl(url)) return { links: [], error: `“${url}” must be a valid http:// or https:// URL.` };
    links.push({ id: draft.id || createLinkId(), label, url });
  }

  return { links, error: null };
}
