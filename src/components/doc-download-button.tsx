import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/api-client";
import type { Doc } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Saves a document's uploaded file to the device. Renders nothing for link-only docs. */
export function DocDownloadButton({ doc, className }: { doc: Pick<Doc, "fileId" | "fileName" | "title">; className?: string }) {
  const [isDownloading, setDownloading] = useState(false);
  if (!doc.fileId) return null;
  const fileId = doc.fileId;

  const download = async () => {
    setDownloading(true);
    try {
      await downloadFile(fileId, doc.fileName || doc.title);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the file.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={isDownloading}
      aria-label={`Download ${doc.fileName || doc.title}`}
      title="Download"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-accent hover:bg-accent/10 disabled:opacity-50",
        className,
      )}
    >
      {isDownloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
      download
    </button>
  );
}
