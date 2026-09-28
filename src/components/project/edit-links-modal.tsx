import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GhostButton, PrimaryButton } from "@/components/app-shell";
import { Modal } from "@/components/forms";
import { ProjectLinksEditor } from "@/components/project-links-editor";
import { EMPTY_PROJECT_LINK, validateProjectLinks, type ProjectLinkDraft } from "@/lib/project-links";
import { useStore } from "@/lib/store";

export function EditLinksModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const { db, updateProject } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const [links, setLinks] = useState<ProjectLinkDraft[]>([]);

  useEffect(() => {
    if (open) setLinks(project.links.length > 0 ? project.links.map((link) => ({ ...link })) : [{ ...EMPTY_PROJECT_LINK }]);
  }, [open, project.links]);

  if (!open) return null;

  return (
    <Modal open={open} title="Project links" onClose={onClose}>
      <div className="space-y-3">
        <ProjectLinksEditor links={links} onChange={setLinks} />
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            onClick={() => {
              const linkResult = validateProjectLinks(links);
              if (linkResult.error) {
                toast.error(linkResult.error);
                return;
              }
              updateProject(projectId, { links: linkResult.links });
              toast.success("Links updated");
              onClose();
            }}
          >
            Save links
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
